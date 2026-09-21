// ReCoding — app shell: source file, settings form, conversion queue, results.

import { msg, initLang, onLangChange } from './i18n.js';
import * as engine from './engine.js';
import {
  CODECS, CODEC_ORDER, DEFAULT_OPTIONS, KEEP, FLOAT,
  buildArgs, resolve, describe, depthLabel, outputName, khz,
} from './codecs.js';

const $ = (id) => document.getElementById(id);
const SETTINGS_KEY = 'recoding-settings';

// A file much larger than this is unlikely to survive: wasm32 tops out near
// 2 GB, and decoding plus encoding both want room.
const LARGE_FILE_BYTES = 400 * 1024 * 1024;

const settings = { ...DEFAULT_OPTIONS };

// ---------------------------------------------------------------------------
// Settings storage (localStorage, no cookies)
// ---------------------------------------------------------------------------

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const stored = JSON.parse(raw);
    for (const k of Object.keys(DEFAULT_OPTIONS)) {
      if (stored[k] !== undefined) settings[k] = stored[k];
    }
    if (!CODECS[settings.codec]) settings.codec = DEFAULT_OPTIONS.codec;
  } catch {
    // Corrupt or unavailable storage — defaults are already in place.
  }
}

function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatBytes(n) {
  if (!Number.isFinite(n)) return '–';
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return '–';
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

// Long names cannot wrap in the status line and would push the percentage out
// of sight, so shorten the middle but keep the extension — that is the part
// that distinguishes one export from another.
function shortName(name, max = 40) {
  if (name.length <= max) return name;
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 && name.length - dot <= 6 ? name.slice(dot) : '';
  const stem = ext ? name.slice(0, dot) : name;
  const keep = Math.max(4, max - ext.length - 1);
  return `${stem.slice(0, Math.ceil(keep * 0.6))}…${stem.slice(stem.length - Math.floor(keep * 0.4))}${ext}`;
}

// ---------------------------------------------------------------------------
// Status line
// ---------------------------------------------------------------------------

function setStatus(text, fraction) {
  if (engine.DEBUG) {
    console.log(`[recoding] ${performance.now().toFixed(0)}ms setStatus "${text}" fraction=${fraction} `
      + `inlineWidth=${$('progress-fill').style.width} computed=${getComputedStyle($('progress-fill')).width}`);
  }
  const box = $('status');
  box.hidden = false;
  box.classList.remove('error');
  $('status-text').textContent = text;
  const bar = $('progress-bar');
  bar.hidden = false;
  const fill = $('progress-fill');
  if (fraction == null) {
    bar.classList.add('indeterminate');
    fill.style.width = '';
  } else {
    bar.classList.remove('indeterminate');
    const pct = Math.round(fraction * 100);
    // .progress-fill animates its width, which is right on the way up and wrong
    // on the way down: a fresh run starting at 0 while the bar still sits at the
    // last run's 100 % would sweep visibly backwards before it began. A decrease
    // is therefore applied with the transition switched off.
    const previous = parseFloat(fill.style.width);
    if (Number.isFinite(previous) && pct < previous) {
      fill.style.transition = 'none';
      fill.style.width = `${pct}%`;
      void fill.offsetWidth;           // land it before the transition comes back
      fill.style.transition = '';
    } else {
      fill.style.width = `${pct}%`;
    }
  }
  syncDock();
}

function setError(text) {
  const box = $('status');
  box.hidden = false;
  box.classList.add('error');
  $('status-text').textContent = text;
  $('progress-bar').hidden = true;
  syncDock();
}

/**
 * Winds the progress bar back to zero without animating it. Used wherever a run
 * ends or begins: the bar is only ever allowed to grow on screen, never to be
 * caught displaying a finished run's 100 %.
 */
function resetProgress() {
  const fill = $('progress-fill');
  fill.style.transition = 'none';
  fill.style.width = '0%';
  void fill.offsetWidth;             // land it before the transition comes back
  fill.style.transition = '';
}

function clearStatus() {
  if (engine.DEBUG) console.log(`[recoding] ${performance.now().toFixed(0)}ms clearStatus`);
  $('status').hidden = true;
  $('status').classList.remove('error');
  // Both the bar and the words are stale the moment a run ends. Leaving either
  // behind means the next run can be seen wearing them.
  resetProgress();
  $('status-text').textContent = '';
  syncDock();
}

// ---------------------------------------------------------------------------
// Dock — conversion progress and playback, pinned to the bottom of the viewport
// ---------------------------------------------------------------------------
//
// Both belong here for the same reason: they outlive the part of the page that
// started them. A conversion is kicked off from the settings card but may run
// for minutes while the user reads on, and results are compared by ear while
// scrolling through the list.

let currentAudio = null;
let scrubbing = false;
let dockShape = '';

/** Shows or hides the dock, and keeps the page from ending up underneath it. */
function syncDock() {
  const statusOn = !$('status').hidden;
  const playerOn = !$('player-bar').hidden;
  // Measuring forces layout, so only do it when the dock actually changes shape
  // — not on every progress tick or every timeupdate.
  const shape = `${statusOn}|${playerOn}`;
  if (shape === dockShape) return;
  dockShape = shape;

  const dock = $('dock');
  const show = statusOn || playerOn;
  dock.classList.toggle('on', show);
  // visibility:hidden keeps the box measurable, unlike display:none, so the
  // height is available whether the dock is up or not.
  document.body.style.paddingBottom = show ? `${dock.offsetHeight + 16}px` : '';
}

const PLAYER_EVENTS = ['timeupdate', 'durationchange', 'loadedmetadata', 'play', 'pause', 'ended'];

/** Points the dock at one <audio> element, or at nothing. */
function setCurrentAudio(el) {
  if (currentAudio === el) return;
  if (currentAudio) {
    for (const type of PLAYER_EVENTS) currentAudio.removeEventListener(type, renderPlayer);
  }
  currentAudio = el;
  if (currentAudio) {
    for (const type of PLAYER_EVENTS) currentAudio.addEventListener(type, renderPlayer);
  }
  renderPlayer();
}

function renderPlayer() {
  const bar = $('player-bar');
  if (!currentAudio) {
    bar.hidden = true;
    syncDock();
    return;
  }
  bar.hidden = false;

  $('player-name').textContent = currentAudio.dataset.label || '';

  const duration = Number.isFinite(currentAudio.duration) ? currentAudio.duration : 0;
  const at = currentAudio.currentTime || 0;
  $('player-time').textContent = formatDuration(at);
  $('player-duration').textContent = duration ? formatDuration(duration) : '–';
  // While a drag is in progress the slider is the source of truth, not the
  // element, or every timeupdate would yank the thumb back.
  if (!scrubbing) {
    $('player-seek').value = duration ? String(Math.round((at / duration) * 1000)) : '0';
  }
  paintSeek();

  const toggle = $('player-toggle');
  const label = msg(currentAudio.paused ? 'playerPlay' : 'playerPause');
  toggle.textContent = currentAudio.paused ? '\u25B6' : '\u275A\u275A';
  toggle.setAttribute('aria-label', label);
  toggle.title = label;

  syncDock();
}

/** The label the dock shows for a player — set where the element is created. */
function labelAudio(el, text) {
  el.dataset.label = text;
  if (el === currentAudio) renderPlayer();
}

/** Colours the played part of the seek bar up to the thumb. */
function paintSeek() {
  const seek = $('player-seek');
  seek.style.setProperty('--played', String(Number(seek.value) / 10));
}

$('player-toggle').addEventListener('click', () => {
  if (!currentAudio) return;
  if (currentAudio.paused) currentAudio.play().catch(() => {});
  else currentAudio.pause();
});

$('player-close').addEventListener('click', () => {
  currentAudio?.pause();
  setCurrentAudio(null);
});

$('player-seek').addEventListener('input', () => {
  scrubbing = true;
  paintSeek();
  if (currentAudio && Number.isFinite(currentAudio.duration)) {
    currentAudio.currentTime = (Number($('player-seek').value) / 1000) * currentAudio.duration;
  }
});
$('player-seek').addEventListener('change', () => { scrubbing = false; });

// The dock's height is measured, so a reflow has to invalidate that reading.
window.addEventListener('resize', () => { dockShape = ''; syncDock(); });

// ---------------------------------------------------------------------------
// Source
// ---------------------------------------------------------------------------

let source = null;   // { file, name, size, info }
let sourceUrl = null;
let mountedFile = null;

async function useFile(file) {
  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  sourceUrl = URL.createObjectURL(file);

  source = { file, name: file.name, size: file.size, info: null };
  mountedFile = null;

  $('source-card').hidden = false;
  $('source-name').textContent = file.name;
  $('source-audio').src = sourceUrl;
  labelAudio($('source-audio'), file.name);
  $('source-warn').hidden = file.size < LARGE_FILE_BYTES;
  renderFacts();
  // Settings need the probed source before they can resolve "Keep".
  $('settings-card').hidden = false;
  $('btn-convert').disabled = true;
  renderSettings();

  try {
    if (!engine.isLoaded()) setStatus(msg('engineLoading'), null);
    await engine.load();
    setStatus(msg('probing'), null);
    await ensureMounted(file);
    source.info = await engine.probe();
    renderFacts();
    renderSettings();
    $('btn-convert').disabled = false;
    clearStatus();
  } catch (e) {
    $('btn-convert').disabled = true;
    setError(e?.name === 'EngineError' ? `${msg('probeError')} ${e.message}` : msg('engineFailed'));
    console.error(e);
  }
}

async function ensureMounted(file) {
  // sourcePath() going null means the engine threw its worker away after a
  // crash, so the file this thinks is mounted no longer is.
  if (mountedFile === file && engine.sourcePath()) return;
  await engine.setSource(file);
  mountedFile = file;
}

function renderFacts() {
  const box = $('source-facts');
  box.textContent = '';
  const info = source?.info;
  const rows = [
    [msg('srcFormat'), info?.codecName ? info.codecName.toUpperCase() : '…'],
    [msg('srcSampleRate'), info?.sampleRate ? khz(info.sampleRate) : '…'],
    [msg('srcChannels'), info?.channels ? channelLabel(info.channels) : '…'],
    [msg('srcBitDepth'), info?.bitDepth ? `${info.bitDepth} bit` : '–'],
    [msg('srcBitrate'), info?.bitrate ? `${Math.round(info.bitrate / 1000)} kbps` : '–'],
    [msg('srcDuration'), info?.duration ? formatDuration(info.duration) : '…'],
    [msg('srcSize'), formatBytes(source?.size)],
  ];
  for (const [label, value] of rows) {
    const row = document.createElement('div');
    row.className = 'fact';
    const l = document.createElement('span');
    l.className = 'fact-label';
    l.textContent = label;
    const v = document.createElement('span');
    v.className = 'fact-value';
    v.textContent = value;
    row.append(l, v);
    box.append(row);
  }
}

function channelLabel(n) {
  if (n === 1) return msg('chMono');
  if (n === 2) return msg('chStereo');
  return String(n);
}

// ---------------------------------------------------------------------------
// Settings form
// ---------------------------------------------------------------------------

/** One labelled field. `disabledReason` both disables it and explains itself. */
function field(labelText, control, { disabledReason = null, info = null } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'field' + (disabledReason ? ' off' : '');

  const label = document.createElement('label');
  label.textContent = labelText;
  if (info) {
    const icon = document.createElement('span');
    icon.className = 'info';
    icon.title = info;
    icon.setAttribute('aria-label', info);
    icon.setAttribute('role', 'img');
    icon.tabIndex = 0;
    label.append(icon);
  }

  if (disabledReason) {
    control.disabled = true;
    control.title = disabledReason;
    label.title = disabledReason;
  }
  const id = `f-${Math.random().toString(36).slice(2, 8)}`;
  control.id = id;
  label.htmlFor = id;

  wrap.append(label, control);
  return wrap;
}

function select(options, value, onChange) {
  const el = document.createElement('select');
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = String(opt.value);
    o.textContent = opt.label;
    if (opt.disabled) o.disabled = true;
    el.append(o);
  }
  el.value = String(value);
  // A stored choice the current codec cannot offer falls back to the first
  // option, and the change is written back so the form and state agree.
  if (el.selectedIndex < 0) {
    el.selectedIndex = 0;
    onChange(el.value);
  }
  el.addEventListener('change', () => onChange(el.value));
  return el;
}

const numRange = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

function update(key, value) {
  settings[key] = value;
  saveSettings();
  renderSettings();
}

// select() reports a stored choice the current codec cannot offer — MP3's VBR
// mode when switching to AAC, a 32-bit float depth when switching to FLAC — by
// calling update() the moment it falls back, which lands back in here while the
// pass that created that select is still appending fields. That pass would then
// append a second, complete set of fields to the same grid. So: let the running
// pass finish, and repeat it afterwards with the corrected settings. One repeat
// is always enough in practice, because a fallback lands on an option the codec
// does offer; the counter is only there so a future codec table cannot spin.
let rendering = false;
let renderPending = false;

function renderSettings() {
  if (rendering) {
    renderPending = true;
    return;
  }
  rendering = true;
  try {
    let passes = 0;
    do {
      renderPending = false;
      renderFields();
    } while (renderPending && ++passes < 5);
  } finally {
    rendering = false;
  }
}

function renderFields() {
  const grid = $('settings-grid');
  grid.textContent = '';
  // Expert knobs live behind a disclosure: they change how the encoder works,
  // not what the file is, and they were crowding the six settings that matter.
  const advanced = $('advanced-grid');
  advanced.textContent = '';
  const codec = CODECS[settings.codec];
  const info = source?.info;

  // --- format ---
  grid.append(field(
    msg('fieldFormat'),
    select(
      CODEC_ORDER.map((id) => ({ value: id, label: CODECS[id].label })),
      settings.codec,
      (v) => update('codec', v),
    ),
  ));

  // --- bitrate mode ---
  const rateModeLabels = {
    cbr: msg('rateCbr'), abr: msg('rateAbr'), vbr: msg('rateVbr'),
    vbr_opus: msg('rateVbrOpus'), cvbr: msg('rateConstrained'),
  };
  if (!codec.rateModes) {
    grid.append(field(msg('fieldRateMode'), select([{ value: '', label: '—' }], '', () => {}), {
      disabledReason: msg(codec.bitrateNote),
    }));
  } else {
    grid.append(field(
      msg('fieldRateMode'),
      select(
        codec.rateModes.map((m) => ({ value: m, label: rateModeLabels[m] })),
        settings.rateMode,
        (v) => update('rateMode', v),
      ),
      codec.rateModes.length === 1
        ? { disabledReason: msg('naRateMode', [codec.label]) }
        : {},
    ));
  }

  // --- bitrate, or the VBR quality that replaces it ---
  if (!codec.rateModes) {
    grid.append(field(msg('fieldBitrate'), select([{ value: '', label: '—' }], '', () => {}), {
      disabledReason: msg(codec.bitrateNote),
    }));
  } else if (settings.rateMode === 'vbr' && codec.vbrRange) {
    const { min, max } = codec.vbrRange;
    grid.append(field(
      msg('fieldQuality'),
      select(
        numRange(min, max).map((q) => ({
          value: q,
          label: q === min ? msg('qualityBest', [q]) : q === max ? msg('qualitySmallest', [q]) : `V${q}`,
        })),
        settings.quality,
        (v) => update('quality', Number(v)),
      ),
    ));
  } else {
    // The legal bitrates depend on both the resolved sample rate and the
    // resolved channel count, so resolve first and offer only what will work.
    const r = resolve(settings, info);
    const list = codec.bitrates(r.sampleRate, r.channels);
    grid.append(field(
      msg('fieldBitrate'),
      select(
        list.map((b) => ({ value: b, label: `${b} kbps` })),
        list.includes(settings.bitrate) ? settings.bitrate : r.bitrate,
        (v) => update('bitrate', Number(v)),
      ),
      { info: msg('infoBitrate') },
    ));
  }

  // --- sample rate ---
  if (codec.sampleRates.length === 1) {
    const only = codec.sampleRates[0];
    grid.append(field(
      msg('fieldSampleRate'),
      select([{ value: only, label: khz(only) }], only, () => {}),
      { disabledReason: msg('naSampleRate', [codec.label, khz(only)]) },
    ));
  } else {
    grid.append(field(
      msg('fieldSampleRate'),
      select(
        [{ value: KEEP, label: msg('keep') }, ...codec.sampleRates.map((r) => ({ value: r, label: khz(r) }))],
        settings.sampleRate,
        (v) => update('sampleRate', v === KEEP ? KEEP : Number(v)),
      ),
    ));
  }

  // --- bit depth ---
  if (codec.bitDepths) {
    grid.append(field(
      msg('fieldBitDepth'),
      select(
        [{ value: KEEP, label: msg('keep') }, ...codec.bitDepths.map((d) => ({ value: d, label: depthLabel(d, msg) }))],
        settings.bitDepth,
        (v) => update('bitDepth', v === KEEP || v === FLOAT ? v : Number(v)),
      ),
    ));
  } else {
    grid.append(field(msg('fieldBitDepth'), select([{ value: '', label: '—' }], '', () => {}), {
      disabledReason: msg('naBitDepth', [codec.label]),
    }));
  }

  // --- channels ---
  const channelControl = select(
    [
      { value: KEEP, label: msg('keep') },
      { value: 'mono', label: msg('chMono') },
      { value: 'stereo', label: msg('chStereo') },
      { value: 'joint', label: msg('chJoint'), disabled: !codec.joint },
    ],
    codec.joint || settings.channels !== 'joint' ? settings.channels : KEEP,
    (v) => update('channels', v),
  );
  grid.append(field(msg('fieldChannels'), channelControl,
    codec.joint ? {} : { info: msg(codec.jointNote) }));

  // --- codec extras ---
  if (codec.id === 'mp3') {
    advanced.append(field(
      msg('fieldMp3Reservoir'),
      select(
        [{ value: 'on', label: msg('on') }, { value: 'off', label: msg('off') }],
        settings.mp3Reservoir ? 'on' : 'off',
        (v) => update('mp3Reservoir', v === 'on'),
      ),
      { info: msg('infoReservoir') },
    ));
  } else if (codec.id === 'aac') {
    advanced.append(field(
      msg('fieldAacCoder'),
      select(
        [{ value: 'twoloop', label: msg('coderTwoloop') }, { value: 'fast', label: msg('coderFast') }],
        settings.aacCoder,
        (v) => update('aacCoder', v),
      ),
    ));
  } else if (codec.id === 'opus') {
    grid.append(field(
      msg('fieldOpusApplication'),
      select(
        [
          { value: 'audio', label: msg('appAudio') },
          { value: 'voip', label: msg('appVoip') },
          { value: 'lowdelay', label: msg('appLowdelay') },
        ],
        settings.opusApplication,
        (v) => update('opusApplication', v),
      ),
    ));
    advanced.append(field(
      msg('fieldOpusCompression'),
      select(
        numRange(0, 10).map((n) => ({ value: n, label: String(n) })),
        settings.opusCompression,
        (v) => update('opusCompression', Number(v)),
      ),
      { info: msg('infoEffort') },
    ));
  } else if (codec.id === 'flac') {
    grid.append(field(
      msg('fieldFlacCompression'),
      select(
        numRange(0, 12).map((n) => ({ value: n, label: String(n) })),
        settings.flacCompression,
        (v) => update('flacCompression', Number(v)),
      ),
      { info: msg('infoCompression') },
    ));
  }

  // WAV, AIFF and ALAC expose nothing at this level, so the disclosure itself
  // disappears rather than opening onto an empty grid.
  $('advanced').hidden = advanced.children.length === 0;

  const note = $('codec-note');
  note.hidden = !codec.note;
  if (codec.note) note.textContent = msg(codec.note);
}

// ---------------------------------------------------------------------------
// Conversion queue
// ---------------------------------------------------------------------------

const pending = [];
let converting = false;
let nextId = 1;

function enqueueConversion() {
  if (!source?.info) return;
  // Announced before the job joins the queue, so "N more queued" counts the
  // other jobs waiting rather than including this one.
  const starting = !converting;
  if (starting) showConverting(0);

  pending.push({
    source,
    opts: { ...settings },
  });
  updateQueueNote();
  // drain() only reaches its first status update after an await, and the
  // settings card may be well off screen by then. Put the dock up on the click.
  if (starting) drain();
}

/**
 * Conversion progress, with the queue depth alongside it. Without that, a second
 * queued job looks exactly like the first one starting over.
 */
function showConverting(fraction) {
  if (fraction === 0) resetProgress();
  const pct = String(Math.round(fraction * 100));
  const waiting = pending.length;
  setStatus(
    waiting ? `${msg('converting', [pct])} · ${msg('convertQueued', [waiting])}` : msg('converting', [pct]),
    fraction,
  );
}

function updateQueueNote() {
  const waiting = pending.length;
  $('settings-note').textContent = waiting ? msg('convertQueued', [waiting]) : '';
}

async function drain() {
  converting = true;

  while (pending.length) {
    const job = pending.shift();
    updateQueueNote();
    const { source: src, opts } = job;
    const codec = CODECS[opts.codec];
    const outPath = `${engine.workDir()}/out_${nextId}.${codec.ext}`;

    try {
      await ensureMounted(src.file);
      const { args, resolved } = buildArgs(opts, src.info, engine.sourcePath(), outPath);

      showConverting(0);
      const { data } = await engine.convert(args, outPath, (frac) => showConverting(frac));

      addResult({ job, resolved, args, data });
      clearStatus();
    } catch (e) {
      setError(msg('convertError', [e?.message || String(e)]));
      console.error(e);
      // One failed combination should not abandon the rest of the queue.
      await new Promise((r) => setTimeout(r, 2500));
    }
  }

  converting = false;
  updateQueueNote();
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

let results = [];

function addResult({ job, resolved, args, data }) {
  const { source: src, opts } = job;
  const codec = resolved.codec;
  const blob = new Blob([data], { type: codec.mime });
  results.unshift({
    id: nextId++,
    name: outputName(src.name, opts, resolved),
    sourceName: src.name,
    sourceSize: src.size,
    size: blob.size,
    blob,
    url: URL.createObjectURL(blob),
    codec,
    opts,
    resolved,
    // "ffmpeg" plus the argv as run. exec() prepends -nostdin -y itself, which
    // is shown so the printed line matches what actually ran.
    command: ['ffmpeg', '-nostdin', '-y', ...args].map(quoteArg).join(' '),
  });
  renderResults();
}

const quoteArg = (a) => (/[\s"']/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);

function canPlay(codec) {
  const probe = {
    mp3: 'audio/mpeg',
    aac: 'audio/mp4; codecs="mp4a.40.2"',
    opus: 'audio/ogg; codecs=opus',
    flac: 'audio/flac',
    alac: 'audio/mp4; codecs=alac',
    wav: 'audio/wav',
    aiff: 'audio/aiff',
  }[codec.id];
  return document.createElement('audio').canPlayType(probe) !== '';
}

// One <audio> element per result, kept across renders. renderResults() rebuilds
// the whole list whenever anything changes, and a freshly built element would
// restart playback from zero every time another conversion lands. The same node
// re-appended within one task keeps playing — the spec only pauses an element
// that is still detached once the browser reaches a stable state.
const players = new Map();

function playerFor(r) {
  let audio = players.get(r.id);
  if (audio) return audio;

  audio = document.createElement('audio');
  audio.controls = true;
  audio.preload = 'metadata';
  audio.src = r.url;
  audio.dataset.label = r.name;
  // canPlayType answers for the container and the codec, not for this exact
  // stream: a browser that claims audio/wav may still refuse a 32-bit float
  // one. The promise is a download link, never a dead player, so a decode
  // failure demotes the result to the same fallback.
  audio.addEventListener('error', () => {
    r.playable = false;
    players.delete(r.id);
    if (audio === currentAudio) setCurrentAudio(null);
    renderResults();
  }, { once: true });

  players.set(r.id, audio);
  return audio;
}

// Comparing two encodes means listening to one, then the other — never both at
// once, and the source player counts too. `play` does not bubble, so this has
// to listen during the capture phase.
document.addEventListener('play', (e) => {
  for (const el of document.querySelectorAll('audio')) {
    if (el !== e.target && !el.paused) el.pause();
  }
  setCurrentAudio(e.target);
}, true);

function renderResults() {
  const list = $('results-list');
  list.textContent = '';
  $('results-card').hidden = results.length === 0;

  for (const r of results) {
    const box = document.createElement('div');
    box.className = 'result';

    // --- head ---
    const head = document.createElement('div');
    head.className = 'result-head';
    const names = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'result-name';
    name.textContent = r.name;
    const from = document.createElement('div');
    from.className = 'result-source';
    from.textContent = msg('fromSource', [r.sourceName]);
    names.append(name, from);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'result-remove';
    remove.textContent = '✕';
    remove.title = msg('removeResult');
    remove.setAttribute('aria-label', `${msg('removeResult')}: ${r.name}`);
    remove.addEventListener('click', () => removeResult(r.id));

    head.append(names, remove);
    box.append(head);

    // --- settings chips ---
    const chips = document.createElement('div');
    chips.className = 'chips';
    for (const text of describe(r.opts, r.resolved, msg)) {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = text;
      chips.append(chip);
    }
    const size = document.createElement('span');
    size.className = 'chip size';
    const pct = Math.round((r.size / r.sourceSize) * 100);
    size.textContent = `${formatBytes(r.size)} · ${msg('sizeDelta', [pct])}`;
    chips.append(size);
    box.append(chips);

    // --- anything the codec overrode ---
    if (r.resolved.notes.length) {
      const notes = document.createElement('div');
      notes.className = 'result-notes';
      for (const n of r.resolved.notes) {
        const p = document.createElement('p');
        p.className = 'result-note';
        p.textContent = msg(n.key, n.subs);
        notes.append(p);
      }
      box.append(notes);
    }

    // --- playback ---
    if (r.playable !== false && canPlay(r.codec)) {
      box.append(playerFor(r));
    } else {
      const p = document.createElement('p');
      p.className = 'no-playback';
      p.textContent = msg('noPlayback', [r.codec.label]);
      box.append(p);
    }

    // --- actions ---
    const actions = document.createElement('div');
    actions.className = 'result-actions';
    const dl = document.createElement('a');
    dl.className = 'download';
    dl.href = r.url;
    dl.download = r.name;
    dl.textContent = `↓ ${msg('download')}`;
    actions.append(dl);
    box.append(actions);

    // --- the exact command ---
    const cmd = document.createElement('details');
    cmd.className = 'cmd';
    const summary = document.createElement('summary');
    summary.textContent = msg('showCommand');
    const pre = document.createElement('pre');
    pre.textContent = r.command;
    cmd.append(summary, pre);
    box.append(cmd);

    list.append(box);
  }
}

function removeResult(id) {
  const hit = results.find((r) => r.id === id);
  if (hit) URL.revokeObjectURL(hit.url);
  if (players.get(id) === currentAudio) {
    currentAudio.pause();
    setCurrentAudio(null);
  }
  players.delete(id);
  results = results.filter((r) => r.id !== id);
  renderResults();
}

$('btn-clear-results').addEventListener('click', () => {
  for (const r of results) URL.revokeObjectURL(r.url);
  if (currentAudio && currentAudio !== $('source-audio')) {
    currentAudio.pause();
    setCurrentAudio(null);
  }
  players.clear();
  results = [];
  // Anything still queued is abandoned too; the job running right now has no
  // cancellation point, so it finishes and lands in the emptied list.
  pending.length = 0;
  updateQueueNote();
  renderResults();
});

$('btn-convert').addEventListener('click', enqueueConversion);

// ---------------------------------------------------------------------------
// File input & drag and drop
// ---------------------------------------------------------------------------

const filePicker = document.createElement('input');
filePicker.type = 'file';
filePicker.accept = 'audio/*,video/*';
filePicker.hidden = true;
document.body.appendChild(filePicker);
filePicker.addEventListener('change', () => {
  if (filePicker.files?.[0]) useFile(filePicker.files[0]);
  filePicker.value = '';
});

const dropZone = $('drop-zone');
dropZone.addEventListener('click', () => filePicker.click());
dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); filePicker.click(); }
});
$('btn-choose-other').addEventListener('click', () => filePicker.click());

// Drop anywhere on the page, not just on the zone. The depth counter keeps the
// overlay stable while the pointer crosses child elements.
const overlay = $('drop-overlay');
let dragDepth = 0;
const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');

window.addEventListener('dragenter', (e) => {
  if (!hasFiles(e)) return;
  dragDepth++;
  overlay.hidden = false;
});
window.addEventListener('dragover', (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});
window.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) overlay.hidden = true;
});
window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  overlay.hidden = true;
  dropZone.classList.remove('dragover');
  if (e.dataTransfer?.files?.length) useFile(e.dataTransfer.files[0]);
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

loadSettings();
initLang();
// The form, the source facts and the result chips all hold translated text.
onLangChange(() => {
  if (source) { renderFacts(); renderSettings(); }
  renderResults();
  updateQueueNote();
  renderPlayer();
});
