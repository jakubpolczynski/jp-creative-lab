# ASCII-style Cables Implementation Plan

**Goal:** Four physical cables matching the ASCII cable, with colored surface
streaks, real rack-shelf plugs and monitor-back connections.
**Architecture:** Reproduce dimensions/colors/tracks/joints from `build_model.py`
without executing it. Add arc-length and endpoint-attachment attributes to the
procedural meshes. Use the existing signal clock and bloom/depth pipeline.
**Tech Stack:** Existing native JavaScript/WebGL2, Node and serial Playwright.
**Spec:** User request to repair colorful streaks, connect at the rack shelves
and use the same cable model as ASCII.

**Status:** Implemented; 27 Node tests, 8 Python tests, 176 browser assertions,
and all four in-monitor projects pass. Screenshots in `docs/four-rooms-evidence`.

## Constraints and review focus
- Original GLB and ASCII cable remain byte-identical.
- Ports on +X unit shelves, never the JP +Z contact panel.
- Continuous axis-aligned routes around walls and desk ends; no floor dummy ports.
- Signal colors follow the room accent outbound and blue return, with reduced
  motion and endpoint animation preserved.
- Bloom must respect depth; no separate white moving cubes.

## Tasks
- [x] Add rack routes, arc-length/attachment helpers and failing geometry tests.
- [x] Build 0.17 cable casing, 0.085 tracks, 0.205 joints and physical plugs;
      omit only buried/back-facing underside faces to preserve triangle budget.
- [x] Replace cube pulses with interpolated-distance GLSL streaks and bloom.
- [x] Pixel-test all four colors and endpoint receipt with controlled time;
      run existing Node and browser regressions without dropping assertions.
- [x] Inspect screenshots, update docs/evidence and renderer content hash.

Execution: current session; no commit, push, deployment or email.
