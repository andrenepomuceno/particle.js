# Recording videos

`npm run record` renders a scenario offline into a video, frame by frame, with no UI on it. Unlike the
in-app recorder (<kbd>*</kbd>, which captures whatever the screen shows in real time), each frame is a
fixed amount of simulation time: frame *k* is the state after `--warmup-steps + k × --steps-per-frame`
steps, whatever the frame takes to compute. The same command on the same GPU gives the same frames.

```
npm run record -- --scenario galaxy --seconds 10 --fps 60 --steps-per-frame 1 --size 1080x1920 --seed 7
```

writes `reports/videos/galaxy.webm` (VP9), `reports/videos/galaxy.json` (metadata) and, when the
timeline has captions, `reports/videos/galaxy.vtt`.

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `--scenario id` | (required) | a bundled scenario id |
| `--seconds s`, `--fps n` | 10, 60 | video length and rate: `round(s × fps)` frames |
| `--steps-per-frame n` | 1 | simulation steps between frames (0 freezes the simulation; the camera still moves) |
| `--warmup-steps n` | 0 | steps run before frame 0 (e.g. to start just before a timeline event) |
| `--size WxH` | 1080x1920 | canvas pixels, even; 1080x1920 / 2160x3840 for 9:16, 1920x1080 / 3840x2160 for 16:9 |
| `--seed s` | random | the scenario's layout seed, within [0, 4294967295]; record it to repeat a run. Without it, the seed drawn is written to the metadata (and used by `--verify`) |
| `--particles n` | the scenario's | particle total, as in the app's Particles field |
| `--capacity n` | the app's | GPU texture capacity (for totals above it) |
| `--display json` | `{}` | display options: a JSON file or an inline object (below) |
| `--lang en\|pt-BR` | en | language of the timeline captions (the `.vtt` and the metadata) |
| `--out file.webm` | `reports/videos/<id>.webm` | output, ending in `.webm`; the metadata, subtitles and frames take its name. The video is written to `<out>.partial.webm` and renamed when complete, so a failed run leaves an earlier video in place |
| `--png` | off | also write every frame as a lossless PNG in `<out>-frames/` (frames of an earlier run there are removed first) |
| `--no-video` | off | PNG frames only (needs `--png`; no ffmpeg needed) |
| `--crf n`, `--speed n` | 24, 2 | VP9 quality (lower is better) and libvpx `-cpu-used` (0–8, higher is faster) |
| `--supersample s` | 1 | renders each frame at s× the size (1–4) and averages it down, for clean edges on discs, spheres and arrows; the picture is otherwise the same (point sizes follow the drawing buffer). The canvas limit below applies to the s× size |
| `--verify k,…` | none | replays those frames' steps in a fresh page and checks the particles are identical; the script fails otherwise |

`ffmpeg` with `libvpx-vp9` must be on the `PATH` for video output; it, `git` (for the commit in the metadata)
and the options are checked before the browser starts. The WebM is 4:2:0, so single-pixel
coloured particles lose some chroma; use `--png` for lossless frames.

## Display options

Every key is optional; unset ones keep the scenario's view, except the axes, which stay off unless asked.
Unknown keys and invalid values fail with their path.

```json
{
  "particleStyle": "flat",
  "colorMode": "speed",
  "particleRadius": 2,
  "sizeByMass": true,
  "glow": 0.5,
  "fog": 0,
  "background": { "center": "#0d1424", "edge": "#000000" },
  "axes": false,
  "boundary": true,
  "field": { "enabled": true, "columns": 64, "logScale": true, "lockScale": false, "probe": { "charge": -1 } },
  "trail": { "particle": 0 },
  "follow": { "particle": 0 },
  "camera": { "position": [0, 0, 1500], "target": [0, 0, 0] }
}
```

| Key | Values |
| --- | --- |
| `particleStyle`, `colorMode`, `particleRadius`, `sizeByMass`, `glow`, `fog` | as in the Controls dialog |
| `background` | `#rrggbb`, or `{ "center", "edge" }` (both `#rrggbb`) for a radial gradient from the middle of the view to its corners |
| `axes`, `boundary` | show the axes, the boundary |
| `field` | the force field: `enabled`, grid `columns`, `logScale`, `lockScale` (keep the first frame's colour scale) and the test particle `probe` (as in [scenarios.md](scenarios.md); the fields given replace the scenario's, the others stay) |
| `trail`, `follow` | inspect that particle and draw its trail (a point per step, as in the app), or follow it with the camera; both must name the same particle |
| `camera` | the initial camera; a timeline camera move at t = 0 starts from it |

## Time

The recorder stops the app's frame loop and drives everything from the frames:

- Timeline events fire on simulation time, at the step where they fall, as in the app.
- Timeline camera moves (`"camera": { "position", "target", "duration" }`, see [scenarios.md](scenarios.md))
  ease over `duration` seconds of **video**, not of wall clock: a 5 s move spans `5 × fps` frames.
- The field is recomputed on every frame; its colour reference refreshes on the app's interval, in
  video time.
- The speed and clock palettes are sampled on the first frame and then every video second, as the
  app samples them every wall-clock second.
- Captions are a page overlay, not canvas pixels: they go to the `.vtt` subtitle track (one cue per
  caption, at the frames where the timeline changes it) and to the metadata.

## Metadata

`<out>.json` holds what is needed to reproduce and check the video: scenario id, name and the
SHA-256 of its JSON; package version, git commit and whether the tree had uncommitted changes; seed,
particle count, capacity and every simulation setting (dt, integrator, metric, …); steps per frame,
warm-up, fps, size, display options and caption language (`lang`); the simulation time of every frame (`frameTimes`) and the
SHA-256 of every frame's PNG (`frameHashes`), and `hash`, a digest of them all that two runs of the
same command share; timeline changes by frame (`eventsFired`, caption); diagnostics of the first and
last frame (kinetic, potential and total energy, momentum Σ m·u, angular momentum Σ m·r × u about the
origin, temperature, mean and maximum speed; `potentialLeavesOut` names force-mode forces the potential
cannot include); `--verify` results; timing; and any notice or console problem.

`series` holds, per frame and aligned with `frameTimes`, the `kinetic`, `potential` and `total` energy
and the `momentum` P and `angularMomentum` L (about the origin) of the dynamic particles, to plot the
conserved quantities beside the picture. L about another point Q is L − Q × P (in 2D:
L_z − (Q_x·P_y − Q_y·P_x)). The *Noether* scenarios are made for this: recorded with `--seed 7` for
40 s at 60 fps, 4 steps per frame (t = 0 to 2399), on an RTX 5060 Ti: the free cluster keeps E, P and
L within 1e-4 of their start (float32 GPU arithmetic); with a sun at the origin P swings from (2.3, −1.8)
to (−58, −7) and on, while L about the sun stays within 3e-5 of 654.06 and E within 1e-3; with two suns
L goes from 654 to −3859; with the growing gravity E falls from −208 to −3370 while P and L stay within
1e-4.

## Cost and limits

Measured on an RTX 5060 Ti through WSL2 (galaxy, 3001 particles, `--speed 2`):

| Size | ms per frame, total | 10 s at 60 fps | Peak memory added |
| --- | --- | --- | --- |
| 1080x1920 | ~60 | ~40 s | ~2.5 GB |
| 2160x3840 | ~140 | ~1.5 min | ~2.5 GB |
| 4320x7680 | ~460 | ~4.6 min | ~7 GB |

A run also spends a few seconds starting the dev server, Chromium and ffmpeg.

The looks cost mostly PNG encoding, which grows as fewer pixels are black (hadrons, 1920x1080, ms per
frame in total): plain ~30; `fog` ~32; `--supersample 2` ~50; `glow: 0.5` ~50; a gradient `background`
~60 (every pixel non-black); glow, gradient and `--supersample 2` together ~90. The gradient has 8-bit
steps, which a dark one shows as faint rings (VP9 keeps them).

Simulating and rendering a frame takes ~2 ms here, and the per-frame `series` (a readback and the
potential pass) adds little (galaxy measured ~45 ms per frame in total with it, at 1080x1920); the rest is PNG encoding in the page (~24 ms at
1080x1920, ~85 ms at 2160x3840) and VP9 encoding, which overlaps the capture through a queue of up to
256 MB of frames. `--speed 0` is ~3× slower to encode for ~20 % fewer bytes at the same PSNR.
4320x7680 is the largest canvas Chromium gives on this machine; past it the browser shrinks the
drawing buffer, and the recorder fails instead of recording a smaller video. Scenarios with heavy
forces or the field add their own cost (dipole-antenna with field arrows and a 2048-step history:
~90 ms per frame at 1080x1920).
