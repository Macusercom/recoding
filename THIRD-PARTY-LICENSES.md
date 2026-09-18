# Third-party licenses

ReCoding itself is licensed under the **GNU General Public License, version 3 or later**
(see [LICENSE](LICENSE)). It is distributed together with the third-party components below.

The user-facing version of this page is [docs/licenses.html](docs/licenses.html), linked from
every page of the site.

---

## ffmpeg.wasm — JavaScript wrapper

| | |
|---|---|
| Packages | `@ffmpeg/ffmpeg` 0.12.15, `@ffmpeg/util` 0.12.2 |
| Copyright | © 2019 Jerome Wu |
| License | MIT |
| Source | https://github.com/ffmpegwasm/ffmpeg.wasm |
| Shipped at | `docs/vendor/ffmpeg/`, `docs/vendor/util/` |
| License text | `docs/vendor/ffmpeg/LICENSE`, `docs/vendor/util/LICENSE` |

---

## ffmpeg-core.wasm — FFmpeg

| | |
|---|---|
| Package | `@ffmpeg/core` 0.12.10 |
| Contains | FFmpeg **n5.1.4** compiled to WebAssembly via Emscripten |
| License | **GPL-2.0-or-later** |
| Shipped at | `docs/vendor/core/ffmpeg-core.js`, `docs/vendor/core/ffmpeg-core.wasm` |
| License text | `docs/vendor/core/COPYING.GPLv2`, `docs/vendor/core/FFMPEG-LICENSE.md` |

FFmpeg is LGPL-2.1-or-later by default, but this core is built with `--enable-gpl` together with
libx264 and libx265, which makes **GPL-2.0-or-later** the governing license for the binary. Because
ReCoding redistributes that binary, ReCoding is conveyed under the GPL as well.

### Corresponding source

The complete corresponding source for the shipped binary, and the scripts used to build it:

- **FFmpeg n5.1.4** — https://github.com/FFmpeg/FFmpeg/tree/n5.1.4
- **Emscripten build configuration** — https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v0.12.15
  (`Dockerfile`, `build/ffmpeg.sh`, `build/ffmpeg-wasm.sh`)

The build enables: `libx264`, `libx265`, `libvpx`, `libmp3lame`, `libtheora`, `libvorbis`,
`libopus`, `zlib`, `libwebp`, `libfreetype`, `libfribidi`, `libass`, `libzimg` — each under its
own license as documented by its upstream project.

---

## Encoders ReCoding actually uses

| Format | Encoder | License |
|---|---|---|
| MP3 | `libmp3lame` | LGPL-2.0-or-later |
| AAC-LC | FFmpeg native `aac` | LGPL-2.1-or-later |
| Opus | `libopus` | BSD-3-Clause |
| FLAC | FFmpeg native `flac` | LGPL-2.1-or-later |
| ALAC | FFmpeg native `alac` | LGPL-2.1-or-later |
| WAV | FFmpeg native `pcm_u8`, `pcm_s16le`, `pcm_s24le`, `pcm_s32le`, `pcm_f32le` | LGPL-2.1-or-later |
| AIFF | FFmpeg native `pcm_s8`, `pcm_s16be`, `pcm_s24be`, `pcm_s32be`, `pcm_f32be` | LGPL-2.1-or-later |

### Why there is no HE-AAC

HE-AAC and HE-AAC v2 require the `libfdk_aac` encoder. FFmpeg can only be built against it with
`--enable-nonfree`, and the resulting binary **may not be redistributed** — so it cannot ship in a
web app. FFmpeg's native AAC encoder is LC-only. AAC in ReCoding is therefore AAC-LC.

---

## Patents

Audio coding formats may be covered by patents in some jurisdictions. None of the licenses above
grant a patent licence.
