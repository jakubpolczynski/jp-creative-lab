# ASCII Consistency Implementation Plan

**Goal:** Make ASCII and its cable use the same geometry and lighting as the other rooms.
**Architecture:** Keep four lab UI entries, but render five bodies through the shared
procedural renderer. Draw only the rack prefix of the original GLB in the full world.
Use shared monitor coordinates for the existing ASCII application.
**Tech Stack:** Native JavaScript, WebGL2, Node, existing Playwright runners.
**Spec:** `docs/superpowers/specs/2026-11-16-ascii-consistency-design.md`.

## Constraints and review focus
- Preserve original GLB bytes, rack/contact, four room centers and accents.
- No doubled old room or old cable in either color or bloom.
- ASCII HTML must project onto its actual monitor at all three viewport sizes.
- Keep chair movement, logo hiding, keyboard/focus and reduced-motion behavior.
- Cable must remain attached under room/server motion, without crossing a wall.
- No extra browser context, dependencies, commit, push or deployment.

## Task 1 — shared ASCII body and cable
Files: `rooms.js`, `room-world.js`, `cables.js`, `scene-geometry.js`,
`tests/ascii-room.test.mjs`.
- [x] Add failing tests: ASCII body equals lab body outside lettering/accent;
      shelf and monitor endpoints, orthogonal wall-safe route, endpoint weights;
      rack-only index selection excludes the legacy room/cable.
- [x] Add `ASCII_ROOM`, `WORLD_ROOMS`, shared sign, short lowest-shelf route,
      variable-length attachment thresholds and rack-prefix index helper.
- [x] Run `node --test tests/*.test.mjs`; confirm pass.

## Task 2 — rendering, camera and regressions
Files: renderer, `lab-renderer.js`, `monitor.js`, browser fixtures/runners.
- [x] Render ASCII through the shared room shader using its existing motion state.
      Keep the four experiment UI entries separate. Stop drawing legacy geometry.
- [x] Center ASCII camera/hitbox/HTML on the shared monitor, retain logo hiding
      and chair motion in both passes, and use physical cable length in network.
- [x] Update geometry-bound pixel fixtures and extend cable checks to ASCII;
      add actual ASCII screen projection checks in all viewport sizes.
- [x] Run serial browser runners; inspect overview and ASCII screenshots.

## Task 3 — finalize
- [x] Rename renderer from verified content hash, update live docs/references,
      copy evidence, verify original GLB hash and `git diff --check`.

Execution: native in this session, following the user's instruction to proceed.

Results: 29 Node tests, 8 Python tests, 11 browser scenarios / 195 assertions
(36 five-cable pixel checks), 14 interaction result groups. ASCII screen
projection verified at 1440×1000, 390×844 and 844×390.
