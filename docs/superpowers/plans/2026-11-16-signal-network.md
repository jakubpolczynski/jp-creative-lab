# Signal Network and Room Spacing Implementation Plan

**Goal:** Server sends green beams; five rooms reply in unique colors. All beams
move at one world-space speed; receivers glow only when a beam reaches them.
Also separate the islands further as requested during execution.
**Architecture:** One deterministic network clock computed from actual cable
lengths, shared by the original GLB shader and procedural room shaders.
**Tech Stack:** Existing JavaScript/WebGL2 and Node/Playwright tests.
**Spec:** User corrections: identical beam speed regardless of distance,
received-color glow, distinct room colors, and more separation.

## Constraints / review focus
- Preserve the GLB bytes, furnished rooms, monitor applications and rack plugs.
- Longer routes take longer; camera transitions cannot override beam speed.
- Latest arriving beam owns server glow when receptions overlap; no color mixing.
- Green belongs to server transmission, not a room. Gallery red, sound violet;
  retain ASCII cyan, particles pink, materials amber.
- Route all cables outside the enlarged world and keep depth/bloom occlusion.

## Tasks
- [x] Add velocity, timing, network-reception and color-uniqueness unit tests.
- [x] Implement shared timing and arrival selection in `signals.js`; update
      `cables.js`, room palette/centers and global cable corridor.
- [x] Feed network state to both renderers; green outbound, room-color return,
      green room receipt and matching received-color server glow.
- [x] Adapt pixel tests to physical travel times; retain all old behavior checks
      except the explicitly replaced fixed 10-second/blue-return assumptions.
- [x] Run unit, geometry and serial browser tests; inspect spacing/screenshots;
      update content hash, documentation and evidence.

Execution: current session; no commit, push or deployment.

Verified: 28 Node tests, 8 Python tests, 11 browser scenarios / 188 assertions
(including 29 cable pixel checks), and 14 four-room result groups. Evidence:
`docs/four-rooms-evidence/`; report: `docs/four-rooms.md`.
