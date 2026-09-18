// ffmpeg.wasm lifecycle: one worker, one mounted source, many conversions.
//
// The single-threaded core is deliberate. core-mt needs SharedArrayBuffer,
// which needs COOP/COEP response headers, which GitHub Pages cannot set — so
// the multi-threaded build simply cannot run here. The ST core links
// ALLOW_MEMORY_GROWTH and needs no special headers.

import { FFmpeg } from './vendor/ffmpeg/index.js';
import { fetchFile } from './vendor/util/index.js';

// Resolved against this module, never against the site root: a project Pages
// site is served from /<repo>/, so an absolute "/vendor/..." would 404.
const CORE_URL = new URL('vendor/core/ffmpeg-core.js', import.meta.url).href;
const WASM_URL = new URL('vendor/core/ffmpeg-core.wasm', import.meta.url).href;

const MOUNT_POINT = '/src';
const WORK_DIR = '/work';

let ffmpeg = null;
let loading = null;

// The log is a ring buffer rather than a growing array: ffmpeg is chatty, and
// a long conversion would otherwise retain megabytes of strings. Only the tail
// matters, because that is where the error is.
const LOG_LIMIT = 200;
let logLines = [];

// exec() and ffprobe() share one worker, so progress events have to be routed
// to whichever job is running rather than broadcast.
let activeProgress = null;

export class EngineError extends Error {
  constructor(message, log) {
    super(message);
    this.name = 'EngineError';
    this.log = log;
  }
}

/** Loads the core. Safe to call repeatedly; concurrent callers share one load. */
export function load(onStatus) {
  if (ffmpeg) return Promise.resolve(ffmpeg);
  if (loading) return loading;

  loading = (async () => {
    const instance = new FFmpeg();

    instance.on('log', ({ message }) => {
      logLines.push(message);
      if (logLines.length > LOG_LIMIT) logLines.shift();
    });
    instance.on('progress', ({ progress }) => {
      if (activeProgress && Number.isFinite(progress)) {
        // ffmpeg overshoots slightly at the tail; clamping keeps the bar sane.
        activeProgress(Math.max(0, Math.min(1, progress)));
      }
    });

    onStatus?.();
    // Plain same-origin URLs rather than blob URLs, so the browser
    // stream-compiles the 32 MB wasm instead of buffering it in JS first.
    // (@ffmpeg/util's downloadWithProgress also mis-detects completion when the
    // server gzips the response, and cannot recover because the body is spent.)
    await instance.load({ coreURL: CORE_URL, wasmURL: WASM_URL });

    await instance.createDir(WORK_DIR).catch(() => {});
    ffmpeg = instance;
    return instance;
  })();

  loading.catch(() => {
    loading = null;
  });
  return loading;
}

export function isLoaded() {
  return ffmpeg !== null;
}

/**
 * Drops the worker and everything mounted in it. The next call to load() builds
 * a fresh core — the wasm binary is already in the browser's cache, so this
 * costs instantiation time, not another 32 MB download.
 */
async function discard() {
  const dead = ffmpeg;
  ffmpeg = null;
  loading = null;
  mounted = null;
  try { dead?.terminate(); } catch { /* already gone */ }
}

// ---------------------------------------------------------------------------
// Source
// ---------------------------------------------------------------------------

let mounted = null; // { path, cleanup }

/**
 * Makes `file` readable by ffmpeg and returns its path.
 *
 * WORKERFS maps the File in place, so ffmpeg reads from it lazily and the bytes
 * never have to fit in the wasm heap a second time. A 400 MB input otherwise
 * costs 400 MB of MEMFS before encoding even starts. Not every browser can
 * mount, so a copy into MEMFS remains as the fallback.
 */
export async function setSource(file) {
  const instance = await load();
  await clearSource();

  try {
    await instance.createDir(MOUNT_POINT).catch(() => {});
    await instance.mount('WORKERFS', { files: [file] }, MOUNT_POINT);
    mounted = {
      path: `${MOUNT_POINT}/${file.name}`,
      cleanup: () => instance.unmount(MOUNT_POINT).catch(() => {}),
    };
  } catch {
    const path = `${WORK_DIR}/input`;
    await instance.writeFile(path, await fetchFile(file));
    mounted = {
      path,
      cleanup: () => instance.deleteFile(path).catch(() => {}),
    };
  }
  return mounted.path;
}

export async function clearSource() {
  if (!mounted) return;
  const { cleanup } = mounted;
  mounted = null;
  await cleanup();
}

export function sourcePath() {
  return mounted?.path ?? null;
}

// ---------------------------------------------------------------------------
// Probe
// ---------------------------------------------------------------------------

/**
 * Reads the real stream parameters out of the file rather than trusting its
 * extension. ffprobe writes to stdout, which a worker cannot capture, so this
 * build's `-o` flag redirects it to a file we read back.
 */
export async function probe() {
  const instance = await load();
  if (!mounted) throw new EngineError('No source mounted');

  const out = `${WORK_DIR}/probe.json`;
  logLines = [];
  await instance.ffprobe([
    '-v', 'error',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    '-select_streams', 'a:0',
    mounted.path,
    '-o', out,
  ]);

  let parsed;
  try {
    const data = await instance.readFile(out, 'utf8');
    parsed = JSON.parse(data);
    await instance.deleteFile(out).catch(() => {});
  } catch {
    throw new EngineError('Could not read the audio stream', logLines.join('\n'));
  }

  const stream = parsed.streams?.[0];
  if (!stream) throw new EngineError('No audio stream found', logLines.join('\n'));

  return {
    codecName: stream.codec_name || null,
    sampleRate: Number(stream.sample_rate) || null,
    channels: Number(stream.channels) || null,
    // bits_per_raw_sample is the honest depth; bits_per_sample is 0 for most
    // lossy codecs, where depth is meaningless anyway.
    bitDepth: Number(stream.bits_per_raw_sample) || Number(stream.bits_per_sample) || null,
    bitrate: Number(stream.bit_rate) || Number(parsed.format?.bit_rate) || null,
    duration: Number(parsed.format?.duration) || null,
  };
}

// ---------------------------------------------------------------------------
// Convert
// ---------------------------------------------------------------------------

/**
 * Runs one conversion and returns the encoded bytes.
 * The output is deleted from MEMFS immediately: the Blob owns the data from
 * here on, and leaving copies in the wasm heap is what makes a long session
 * run out of memory.
 */
export async function convert(args, outputPath, onProgress) {
  const instance = await load();
  logLines = [];
  activeProgress = onProgress || null;

  let code;
  try {
    code = await instance.exec(args);
  } catch (e) {
    // A trap inside the wasm — most likely out of memory on a long file —
    // leaves the heap in a state nothing can recover. Throw the worker away so
    // the next conversion starts from a clean core instead of inheriting the
    // damage and failing for reasons that have nothing to do with its settings.
    await discard();
    throw new EngineError(String(e?.message || e), logLines.join('\n'));
  } finally {
    activeProgress = null;
  }

  const log = logLines.join('\n');
  if (code !== 0) {
    throw new EngineError(lastError(logLines) || `ffmpeg exited with code ${code}`, log);
  }

  let data;
  try {
    data = await instance.readFile(outputPath);
  } catch {
    throw new EngineError(lastError(logLines) || 'ffmpeg produced no output', log);
  }
  await instance.deleteFile(outputPath).catch(() => {});

  // readFile hands back a view into the heap; copy it out before the next run
  // grows or reuses that memory.
  return { data: new Uint8Array(data), log };
}

export function workDir() {
  return WORK_DIR;
}

/** The most specific ffmpeg complaint in the tail of the log, for the UI. */
function lastError(lines) {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (/not supported|Invalid|Error|error|Unable|failed/.test(line)) {
      return line.replace(/^\[[^\]]+\]\s*/, '').trim();
    }
  }
  return null;
}
