// Codec capability tables and ffmpeg argument construction.
//
// This file is the single source of truth: the settings form is rendered from
// these tables, and the same tables build the argv. Every limit here was
// verified against a real ffmpeg rather than taken from documentation, because
// the encoders disagree about how they fail:
//
//   - libmp3lame rejects an unsupported sample rate outright, but silently
//     clamps an out-of-range bitrate (-b:a 8k at 48 kHz produced 32 kbps).
//   - libopus rejects both: over 256 kbps *per channel* is an error, not a
//     clamp, so a mono file cannot take the 510 kbps a stereo one accepts.
//   - The native aac encoder never errors either, but it rewrites both ends:
//     8 kbps at 44.1 kHz stereo comes back as ~20, and 320 as ~222. See
//     AAC_WINDOW.
//   - PCM, ALAC and FLAC take any sample rate at all — 37.8 kHz encodes fine —
//     so substituting a listed rate for an unusual source rate would resample
//     for nothing. Those codecs carry `anyRate` and their list is a menu.
//
// So the form never offers an invalid combination in the first place, and
// resolve() re-checks whatever survives from stored settings.

export const KEEP = 'keep';
// 32-bit float is a bit depth like any other in the form, but it is not a
// number, so it travels as its own token rather than as 32.
export const FLOAT = 'float';

// Three bitrate tables, not two: LAME picks the MPEG version from the sample
// rate, and MPEG-2.5 is not merely MPEG-2 extended downwards — it stops at
// 64 kbps. Asking for more at 8/11.025/12 kHz silently produced a 64 kbps file.
const MP3_MPEG1 = [32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];   // 32/44.1/48 kHz
const MP3_MPEG2 = [8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];       // 16/22.05/24 kHz
const MP3_MPEG25 = [8, 16, 24, 32, 40, 48, 56, 64];                                  // 8/11.025/12 kHz

const AAC_BITRATES = [8, 16, 24, 32, 48, 64, 80, 96, 112, 128, 160, 192, 224, 256, 288, 320];

// What the native aac encoder will actually give you, as the lowest and highest
// entry of AAC_BITRATES it delivers — per sample rate, for mono and for stereo.
// It never refuses: ask for 8 kbps at 44.1 kHz stereo and it quietly makes ~20,
// ask for 320 and it quietly makes ~222. Both limits move with the sample rate
// *and* the channel count, which is why this is a table and not a range.
//
// Measured against this build on 30 s of pink noise *and* on real recordings,
// and a value is offered only if both came back within 6 % of it. Both were
// needed: the ceiling depends on the material, in both directions. At 48 kHz
// mono, noise reached 219 kbps while real audio stopped near 200, so 224 had to
// go; at 48 kHz stereo real audio reached 256 cleanly. FFmpeg 9.0.1's own aac
// encoder tops out in the same place, so a newer core would not change this —
// Apple's AudioToolbox encoder does reach 320 at 44.1 kHz, which is how we know
// the limit is FFmpeg's encoder and not AAC.
//
// Only a shortfall disqualifies a value. In mono at the low sample rates, real
// audio comes back 7-16 % *over* the target (32 kbps at 8 kHz gives ~37); more
// than you asked for is not a broken promise, so those rows stand.
const AAC_WINDOW = {
  //          mono        stereo
  7350:  [[8, 32],    [8, 32]],
  8000:  [[8, 32],    [8, 32]],
  11025: [[8, 48],    [16, 48]],
  12000: [[8, 48],    [16, 48]],
  16000: [[8, 64],    [16, 80]],
  22050: [[16, 96],   [16, 112]],
  24000: [[16, 96],   [16, 112]],
  32000: [[16, 128],  [16, 160]],
  44100: [[16, 192],  [24, 224]],
  48000: [[16, 192],  [24, 256]],
  // 64 kHz mono is the one row that is not simply clamped at the top: above
  // 224 the encoder *overshoots* instead (256 came back as 294), so the usable
  // range ends earlier there than the raw ceiling of 360 kbps suggests.
  64000: [[24, 224],  [24, 320]],
  88200: [[24, 320],  [32, 320]],
  96000: [[32, 320],  [32, 320]],
};
const OPUS_BITRATES = [6, 8, 12, 16, 24, 32, 48, 64, 80, 96, 128, 160, 192, 256, 320, 384, 448, 512];

// WAV stores 8-bit samples unsigned and everything wider signed little-endian;
// AIFF is the mirror image — signed 8-bit, big-endian. That is the whole
// difference between the two containers, so they share one depth list.
const PCM_DEPTHS = [8, 16, 24, 32, FLOAT];
const PCM_LE = { 8: 'pcm_u8', 16: 'pcm_s16le', 24: 'pcm_s24le', 32: 'pcm_s32le', [FLOAT]: 'pcm_f32le' };
const PCM_BE = { 8: 'pcm_s8', 16: 'pcm_s16be', 24: 'pcm_s24be', 32: 'pcm_s32be', [FLOAT]: 'pcm_f32be' };

// The rates worth offering for the codecs that accept anything.
const LOSSLESS_RATES = [8000, 11025, 16000, 22050, 24000, 32000, 44100, 48000, 88200, 96000, 176400, 192000];

const bool = (v) => (v ? '1' : '0');

// ---------------------------------------------------------------------------
// Codec table
// ---------------------------------------------------------------------------

export const CODECS = {
  mp3: {
    id: 'mp3',
    label: 'MP3',
    ext: 'mp3',
    mime: 'audio/mpeg',
    encoder: 'libmp3lame',
    sampleRates: [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000],
    rateModes: ['cbr', 'abr', 'vbr'],
    defaultBitrate: 192,
    // LAME's -q:a scale. V0 is the best quality, V9 the smallest.
    vbrRange: { min: 0, max: 9, default: 2, step: 1 },
    bitDepths: null,
    joint: true,
    bitrates(sampleRate) {
      if (sampleRate >= 32000) return MP3_MPEG1;
      return sampleRate >= 16000 ? MP3_MPEG2 : MP3_MPEG25;
    },
    args(o, r) {
      const a = ['-c:a', 'libmp3lame'];
      if (o.rateMode === 'vbr') a.push('-q:a', String(o.quality));
      else if (o.rateMode === 'abr') a.push('-abr', '1', '-b:a', `${o.bitrate}k`);
      else a.push('-b:a', `${o.bitrate}k`);
      // Only when asked. LAME's own default is joint stereo, and "Keep original"
      // used to pass -joint_stereo 0 here — quietly forcing plain L/R on every
      // default conversion, which costs quality at ordinary bitrates. AAC and
      // FLAC already left the choice to the encoder on "Keep"; now MP3 does too.
      if (r.channels === 2 && r.jointExplicit) a.push('-joint_stereo', bool(r.joint));
      a.push('-reservoir', bool(o.mp3Reservoir));
      return a;
    },
  },

  aac: {
    id: 'aac',
    label: 'AAC-LC',
    ext: 'm4a',
    mime: 'audio/mp4',
    encoder: 'aac',
    sampleRates: [7350, 8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000, 64000, 88200, 96000],
    // The native encoder's -q:a does not actually engage VBR — it still emits
    // the default constant bitrate — so constant is the only honest option.
    rateModes: ['cbr'],
    defaultBitrate: 192,
    vbrRange: null,
    bitDepths: null,
    joint: true,
    note: 'aacNote',
    bitrates(sampleRate, channels) {
      const window = AAC_WINDOW[sampleRate];
      if (!window) return AAC_BITRATES;
      // Anything wider than stereo gets the stereo window. The ceiling does
      // keep rising with channel count — 6 channels at 48 kHz reached 555 kbps
      // — but not by a factor this table could honestly extrapolate, and
      // offering too little is the safe direction: the form never shows a value
      // the encoder would rewrite behind the user's back.
      const [min, max] = window[channels === 1 ? 0 : 1];
      return AAC_BITRATES.filter((b) => b >= min && b <= max);
    },
    args(o, r) {
      const a = ['-c:a', 'aac', '-b:a', `${o.bitrate}k`];
      // Left alone when the channel mode is "keep", so the encoder's own
      // per-block M/S decision stands.
      if (r.channels === 2 && r.jointExplicit) a.push('-aac_ms', bool(r.joint));
      a.push('-aac_coder', o.aacCoder);
      // Without this the moov atom lands at the end of the file, and the
      // <audio> element cannot start playing until the whole blob is read.
      a.push('-movflags', '+faststart');
      return a;
    },
  },

  opus: {
    id: 'opus',
    label: 'Opus',
    ext: 'opus',
    mime: 'audio/ogg',
    encoder: 'libopus',
    // Opus always codes and decodes at 48 kHz. Passing -ar 16000 does not make
    // a 16 kHz file — ffmpeg resamples, libopus notes the original rate in the
    // Ogg header, and the stream still reports 48 kHz to every player. Offering
    // the lower rates would promise something the format cannot deliver, so the
    // field is fixed and the form disables it.
    sampleRates: [48000],
    rateModes: ['vbr_opus', 'cvbr', 'cbr'],
    defaultBitrate: 128,
    vbrRange: null,
    bitDepths: null,
    // libopus decides mid/side per frame on its own and exposes no switch.
    joint: false,
    jointNote: 'naJointOpus',
    // Hard ceiling of 256 kbps per channel: at 257k mono libopus refuses to
    // open, so this has to track the resolved channel count, not just the rate.
    bitrates(sampleRate, channels) {
      const max = 256 * (channels || 2);
      return OPUS_BITRATES.filter((b) => b <= max);
    },
    args(o) {
      const a = ['-c:a', 'libopus', '-b:a', `${o.bitrate}k`];
      a.push('-vbr', o.rateMode === 'cbr' ? 'off' : o.rateMode === 'cvbr' ? 'constrained' : 'on');
      a.push('-application', o.opusApplication);
      a.push('-compression_level', String(o.opusCompression));
      return a;
    },
  },

  flac: {
    id: 'flac',
    label: 'FLAC',
    ext: 'flac',
    mime: 'audio/flac',
    encoder: 'flac',
    sampleRates: LOSSLESS_RATES,
    anyRate: true,
    rateModes: null, // lossless — compression level instead of a bitrate
    defaultBitrate: null,
    vbrRange: null,
    // -sample_fmt s32 yields a 24-bit FLAC (bits_per_raw_sample=24), not 32.
    bitDepths: [16, 24],
    joint: true,
    bitrateNote: 'naBitrateFlac',
    bitrates() {
      return [];
    },
    args(o, r) {
      const a = ['-c:a', 'flac', '-compression_level', String(o.flacCompression)];
      if (r.bitDepth) a.push('-sample_fmt', r.bitDepth === 24 ? 's32' : 's16');
      if (r.channels === 2 && r.jointExplicit) a.push('-ch_mode', r.joint ? 'mid_side' : 'indep');
      return a;
    },
  },

  alac: {
    id: 'alac',
    label: 'ALAC',
    ext: 'm4a',
    mime: 'audio/mp4',
    encoder: 'alac',
    sampleRates: LOSSLESS_RATES,
    anyRate: true,
    rateModes: null, // lossless
    defaultBitrate: null,
    vbrRange: null,
    // The encoder takes s16p and s32p and nothing else — plain s16 is rejected
    // outright, planar is not optional here. s32p yields a 24-bit ALAC
    // (bits_per_raw_sample=24), exactly as s32 yields a 24-bit FLAC.
    bitDepths: [16, 24],
    // ALAC codes the stereo pair with its own per-frame decision.
    joint: false,
    jointNote: 'naJointAlac',
    bitrateNote: 'naBitrateAlac',
    note: 'alacNote',
    // min/max_prediction_order are the only knobs the encoder exposes, and
    // measuring them settled it: across 1–30 the output moved under 2 %, and
    // not even monotonically — a higher order produced slightly *larger* files.
    // A dial that does nothing is worse than no dial, so there is none.
    bitrates() {
      return [];
    },
    args(o, r) {
      const a = ['-c:a', 'alac', '-sample_fmt', r.bitDepth === 24 ? 's32p' : 's16p'];
      // Same reason as AAC: without this the moov atom lands at the end and the
      // <audio> element cannot start until the whole blob is read.
      a.push('-movflags', '+faststart');
      return a;
    },
  },

  wav: {
    id: 'wav',
    label: 'WAV',
    ext: 'wav',
    mime: 'audio/wav',
    encoder: 'pcm',
    sampleRates: LOSSLESS_RATES,
    anyRate: true,
    rateModes: null, // uncompressed — the bitrate is arithmetic, not a setting
    defaultBitrate: null,
    vbrRange: null,
    bitDepths: PCM_DEPTHS,
    // Every channel is stored in full, side by side; there is nothing to join.
    joint: false,
    jointNote: 'naJointPcm',
    bitrateNote: 'naBitratePcm',
    note: 'wavNote',
    bitrates() {
      return [];
    },
    args(o, r) {
      // The encoder *is* the bit depth: pcm_s24le needs no -sample_fmt, and
      // ffmpeg picks the matching internal format itself.
      return ['-c:a', PCM_LE[r.bitDepth]];
    },
  },

  aiff: {
    id: 'aiff',
    label: 'AIFF',
    ext: 'aiff',
    mime: 'audio/aiff',
    encoder: 'pcm',
    sampleRates: LOSSLESS_RATES,
    anyRate: true,
    rateModes: null,
    defaultBitrate: null,
    vbrRange: null,
    bitDepths: PCM_DEPTHS,
    joint: false,
    jointNote: 'naJointPcm',
    bitrateNote: 'naBitratePcm',
    note: 'aiffNote',
    bitrates() {
      return [];
    },
    args(o, r) {
      // 32-bit float makes this an AIFF-C rather than a plain AIFF; ffmpeg
      // writes the right one on its own.
      return ['-c:a', PCM_BE[r.bitDepth]];
    },
  },
};

export const CODEC_ORDER = ['mp3', 'aac', 'opus', 'flac', 'alac', 'wav', 'aiff'];

export const DEFAULT_OPTIONS = {
  codec: 'mp3',
  rateMode: 'cbr',
  bitrate: 192,
  quality: 2,
  sampleRate: KEEP,
  bitDepth: KEEP,
  channels: KEEP,
  mp3Reservoir: true,
  aacCoder: 'twoloop',
  opusApplication: 'audio',
  opusCompression: 10,
  flacCompression: 8,
};

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

const nearest = (want, list) =>
  list.reduce((best, v) => (Math.abs(v - want) < Math.abs(best - want) ? v : best), list[0]);

/**
 * What "Keep original" means for bit depth: the narrowest offered integer depth
 * that still holds the source without truncating it, or the widest on offer if
 * none does. Float is never chosen implicitly — nothing arrives as float that
 * did not ask for it.
 */
function keepDepth(srcBits, offered) {
  const ints = offered.filter((d) => typeof d === 'number');
  if (!srcBits) return ints.includes(16) ? 16 : ints[0];
  return ints.find((d) => d >= srcBits) ?? ints[ints.length - 1];
}

/**
 * Turns the form's options plus the probed source into concrete values, and
 * reports every place the codec forced a different choice so the UI can say so
 * instead of quietly producing something the user did not ask for.
 */
export function resolve(opts, source) {
  const codec = CODECS[opts.codec];
  const notes = [];

  // ---- channels ----
  const srcChannels = source?.channels || 2;
  let channels = srcChannels;
  let joint = false;
  let jointExplicit = false;
  if (opts.channels === 'mono') channels = 1;
  else if (opts.channels === 'stereo' || opts.channels === 'joint') {
    channels = 2;
    jointExplicit = true;
    joint = opts.channels === 'joint';
  }
  if (jointExplicit && srcChannels === 1 && opts.channels === 'joint') {
    notes.push({ key: 'noteJointMonoSource' });
  }
  if (opts.channels === 'joint' && !codec.joint) {
    joint = false;
    jointExplicit = false;
    notes.push({ key: 'noteNoJoint', subs: [codec.label] });
  }

  // ---- sample rate ----
  let sampleRate = opts.sampleRate === KEEP ? source?.sampleRate || 48000 : Number(opts.sampleRate);
  // For an `anyRate` codec the list is a menu, not a limit: a 37.8 kHz source
  // encodes to WAV, ALAC or FLAC unchanged, and resampling it to the nearest
  // listed rate would be a silent loss dressed up as a substitution.
  if (!codec.anyRate && !codec.sampleRates.includes(sampleRate)) {
    const fallback = nearest(sampleRate, codec.sampleRates);
    // A codec with exactly one legal rate never offered a choice to override,
    // so reporting a substitution there would just be noise.
    if (codec.sampleRates.length > 1) {
      notes.push({ key: 'noteSampleRate', subs: [khz(sampleRate), khz(fallback), codec.label] });
    }
    sampleRate = fallback;
  }
  // "Keep" on a matching rate means passing no -ar at all.
  const explicitRate = opts.sampleRate !== KEEP || sampleRate !== source?.sampleRate;

  // ---- bit depth ----
  let bitDepth = null;
  if (codec.bitDepths) {
    // A depth carried over from another codec — 32-bit float, then FLAC — is
    // simply not in this list, and falls back to what "Keep" would have picked.
    const want = opts.bitDepth === FLOAT ? FLOAT : Number(opts.bitDepth);
    bitDepth = codec.bitDepths.includes(want) ? want : keepDepth(source?.bitDepth, codec.bitDepths);
  }

  // ---- bitrate ----
  let bitrate = null;
  let rateMode = opts.rateMode;
  if (codec.rateModes) {
    if (!codec.rateModes.includes(rateMode)) rateMode = codec.rateModes[0];
    if (rateMode !== 'vbr') {
      const allowed = codec.bitrates(sampleRate, channels);
      bitrate = Number(opts.bitrate);
      if (!allowed.includes(bitrate)) {
        const fallback = nearest(bitrate, allowed);
        notes.push({ key: 'noteBitrate', subs: [String(bitrate), String(fallback)] });
        bitrate = fallback;
      }
    }
  }

  return { codec, channels, joint, jointExplicit, sampleRate, explicitRate, bitDepth, bitrate, rateMode, notes };
}

/**
 * Full ffmpeg argv for one conversion.
 *
 * -vn -map 0:a:0 is not optional: an MP3 with embedded cover art exposes it as
 * a video stream, which the default stream selection picks up and most audio
 * muxers then refuse.
 */
export function buildArgs(opts, source, inputPath, outputPath) {
  const r = resolve(opts, source);
  const merged = { ...opts, bitrate: r.bitrate, rateMode: r.rateMode };

  const args = ['-i', inputPath, '-vn', '-map', '0:a:0', '-map_metadata', '0'];
  if (r.explicitRate) args.push('-ar', String(r.sampleRate));
  if (r.channels !== source?.channels) args.push('-ac', String(r.channels));
  args.push(...r.codec.args(merged, r));
  args.push(outputPath);
  return { args, resolved: r };
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

/** "24-bit" or "32-bit float", for a form option and for a result chip alike. */
export function depthLabel(depth, msg) {
  return depth === FLOAT ? msg('chipBitDepthFloat') : msg('chipBitDepth', [String(depth)]);
}

const depthTag = (depth) => (depth === FLOAT ? '32bitfloat' : `${depth}bit`);

export function khz(hz) {
  if (!hz) return '–';
  const v = hz / 1000;
  return `${Number.isInteger(v) ? v : v.toFixed(3).replace(/0+$/, '')} kHz`;
}

/** Short settings chips for a finished result, e.g. MP3 · 192 kbps CBR · 44.1 kHz · Joint stereo. */
export function describe(opts, resolved, msg) {
  const { codec } = resolved;
  const chips = [codec.label];

  if (codec.id === 'flac') {
    chips.push(msg('chipCompression', [String(opts.flacCompression)]));
    chips.push(depthLabel(resolved.bitDepth, msg));
  } else if (!codec.rateModes) {
    // Lossless or uncompressed: depth is the only size dial there is.
    chips.push(depthLabel(resolved.bitDepth, msg));
  } else if (resolved.rateMode === 'vbr') {
    chips.push(`VBR V${opts.quality}`);
  } else {
    const mode = { cbr: 'CBR', abr: 'ABR', cvbr: msg('rateConstrained'), vbr_opus: 'VBR' }[resolved.rateMode];
    chips.push(`${resolved.bitrate} kbps ${mode}`);
  }

  chips.push(khz(resolved.sampleRate));
  chips.push(
    resolved.channels === 1
      ? msg('chMono')
      : resolved.jointExplicit && resolved.joint
        ? msg('chJoint')
        : msg('chStereo')
  );
  return chips;
}

/** Output file name: stem, the settings that distinguish it, then the extension. */
export function outputName(sourceName, opts, resolved) {
  const dot = sourceName.lastIndexOf('.');
  const stem = dot > 0 ? sourceName.slice(0, dot) : sourceName;
  const { codec } = resolved;
  const parts = [codec.id];
  if (codec.id === 'flac') parts.push(depthTag(resolved.bitDepth), `c${opts.flacCompression}`);
  else if (!codec.rateModes) parts.push(depthTag(resolved.bitDepth));
  else if (resolved.rateMode === 'vbr') parts.push(`v${opts.quality}`);
  else parts.push(`${resolved.bitrate}k`);
  parts.push(`${Math.round(resolved.sampleRate / 100) / 10}k`);
  if (resolved.channels === 1) parts.push('mono');
  return `${stem}_${parts.join('_')}.${codec.ext}`;
}
