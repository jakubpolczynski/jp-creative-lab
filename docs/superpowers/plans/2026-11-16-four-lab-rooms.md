# Four Lab Rooms Implementation Plan

> **For agentic workers:** Execute task-by-task in the current session (native).
> User authorized immediate implementation without another approval exchange.

**Goal:** Four working, cable-connected rooms in the existing voxel world.
**Architecture:** Keep the original GLB and renderer. Add procedural meshes and
experiments through a second small draw adapter sharing the existing WebGL2
context, depth buffer, camera and animation loop. HTML controls remain accessible.
**Tech Stack:** Native ES modules, WebGL2/GLSL ES 3, Web Audio, Node, Playwright.
**Spec:** `docs/superpowers/specs/2026-11-16-four-lab-rooms-design.md`

**Status:** Implemented and verified locally. Evidence: `docs/four-rooms.md`.

## Global Constraints
- No framework, runtime dependencies, external assets, deployment, push or emails.
- Preserve original GLB bytes, ASCII, configured contact and +Z server camera.
- Up to 2000/750 particles, 16000 new static triangles, one context and 30 FPS.
- Explicit audio Start; stop on exit, hidden document and WebGL context loss.
- Reduced motion, keyboard, touch, inert panels and restored focus.

## Visual direction
Keep the pale world background and violet voxel architecture. Cyjan `#60dfe8`,
pink `#f189e0`, amber `#ffbc67`, green `#81e9ac` identify cables and rooms.
Controls use the existing monospace language, square hardware buttons, and
readable sentence-case Polish. The memorable element is the actual 3D experiment,
not marketing chrome. Desktop: experiment left, instrument panel right.
Phone: experiment above, scrollable instruments below. Avoid four generic cards.

## Review Focus
- Interrupted camera entry: Escape reverses and never starts hidden audio.
- Narrow/short screens: accessible controls scroll without horizontal overflow.
- Audio Start/Stop races: no duplicate scheduler or delayed restart after exit.
- Context loss and page hiding: audio is silenced and no background loop remains.
- Old pixel tests: use actual shared world bounds, not stale GLB-only framing.

### Task 1 — World and navigation
Files: `rooms.js`, `room-world.js`, `lab-ui.js`, `lab.css`, current renderer,
`index.html`, `tests/rooms.test.mjs`.
Interfaces: `ROOMS` definitions (id, title, color, center, cable);
`worldBounds(bounds)`, `roomFrame(room,width,height)`;
`buildRoom(room)` returns position/normal/color batches uploaded as Float32Array.
- [x] Test unique IDs, separated geometry, finite vertices, cable endpoints,
      triangle budget and portrait/landscape camera framing.
- [x] Implement four distinct furnished voxel islands, physical cables, projected
      hit hulls, navigation and reversible camera targets.
- [x] Use `node tests/rooms.test.mjs`; verify original Node tests.

### Task 2 — Gallery
Files: `projects.js`, gallery section in `lab-ui.js`.
Interface: `PROJECTS` contains only the real JP Creative Lab case study.
- [x] Test actual title/repository, safe link and one genuine project.
- [x] Implement selection, physical display target and project details.
- [x] Browser: activate screen, inspect details, open/close using keyboard.

### Task 3 — Particles and materials
Files: `lab-particles.js`, `lab-renderer.js`, controls in `lab-ui.js`;
`tests/particles.test.mjs`.
Interfaces: `particlePosition(index,count,mode,time,strength)`;
`createLabRenderer(gl,compile)` exposes `draw(frame)` and `dispose()`.
- [x] Test deterministic finite Orbit/JP/Wave coordinates and distinct modes.
- [x] Implement depth-tested points, mode interpolation and cursor repulsion.
- [x] Implement actual deformed sculpture with derivative normals, procedural
      chrome reflections, Fresnel hologram and barycentric wireframe in GLSL.
- [x] Browser: assert pixel changes per mode, sliders/reset, no GL errors,
      static reduced-motion views and one context.

### Task 4 — Sound
Files: `lab-audio.js`, sequencer section in `lab-ui.js`,
`tests/audio.test.mjs`.
Interface: `createSequencer({AudioContext,setInterval,clearInterval})` exposes
start/stop/dispose, state, patterns, currentStep and bounded settings.
- [x] Test look-ahead scheduling with controlled clock, BPM 60–160,
      volume 0–0.3, mute, duplicate starts and stop/resume races.
- [x] Implement local kick/noise hat synthesis, 8 steps, gain envelopes,
      explicit Start and shared-loop visualization using audio time.
- [x] Browser: actual Web Audio nodes only after Start, changing pattern/tempo,
      stop on exit, hide and context loss; no automatic resume.

### Task 5 — Verification and resource versioning
Files: `tests/four-rooms.cjs`, browser fixtures, `docs/four-rooms.md`,
`index.html`, renderer content hash, `Agent.md`.
- [x] Run all Node tests and Python cable tests without regenerating GLB.
- [x] Adapt world framing in old animation fixture, retain all old assertions.
- [x] Run serial Playwright regressions plus four-room tests at 1440×1000,
      390×844, 844×390; inspect screenshots.
- [x] Check provider calls blocked, context loss, repeated entries and no JS errors.
- [x] Rename renderer by SHA-1 content, update references; `git diff --check`.
- [x] Record exact results and limitations, no unrequested commit or deployment.

Self-review: all four experiments have separate deliverables. Shared renderer
does not change original masks. Pixel fixtures retain old behavioral checks.
All five review-focus conditions belong to Task 5 browser acceptance tests.
