# Flexible Cables and Movable Rooms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkboxes. If those execution skills are unavailable, use this harness's native
> workflow with the same test gates; do not install new dependencies.

**Goal:** Five automatically routed flexible cables with solid-object collisions,
unlimited extension and long-press room placement, preserving the monitor apps.
**Architecture:** Separate immutable room definitions from session layout.
An authoritative CPU world steps constrained ropes and collision geometry once
before rendering. A tube mesh and event-driven network consume the same arc lengths.
**Tech Stack:** Existing native JavaScript, WebGL2, Node and Playwright.
**Spec:** `docs/superpowers/specs/2026-11-16-flexible-cables-design.md` (approved).

## Global Constraints
- Fixed A at the room's own rack shelf and B behind its own monitor; never swap ports.
- Unlimited extension/retraction; no manual per-room intermediate cable routes.
- Cable radius approximately 0.085; invisible support plane y=-0.60.
- Solid collisions with room structure, furniture and rack, including full segments.
- No cable–cable collision or furniture rigid-body simulation.
- Long press 350 ms; short click opens; XZ placement; no room/rack overlap.
- Same five room appearances, accents, monitor apps and contact configuration.
- Signal propagation 5 cable-length units/s; green send; own-color reply 1 s after receipt.
- One WebGL2 context and RAF loop, rendering capped at 30 FPS.
- No persistence, dependencies, commits, push, deployment or GLB-byte changes.

## Review Focus
- Endpoints outside a wall can still hide a segment crossing its interior (Tasks 1–2).
- Fast room movement, thin furniture and remeshing must not tunnel or detach (Tasks 1–2).
- Pointer capture, second touch, Escape and synthetic clicks must not open an app after drag (Task 4).
- Length changes during flight must not reset clocks, duplicate receipts or change propagation speed (Task 3).
- Bloom, reduced motion, hidden tabs and context loss must not double-step or leave loops running (Task 5).

---

### Task 1: Solid collision geometry and swept segment queries
**Files:** create `collisions.js`, `tests/collisions.test.mjs`;
modify `room-world.js` and `scene-geometry.js`.
**Interfaces:**
- `meshBuilder().box(...)` also records local box colliders; rendering data stays unchanged.
- `rackColliders(doc,binary)` returns only the original rack's boxes, not legacy room/cable.
- `createCollisionWorld(roomMeshes,rackBoxes)` provides
  `update(layout,poses,serverPose,chairPoses)`, `query(min,max)` and
  `segmentHit(a,b,radius,exemption)`; results include collider ID and contact normal.
- `exemption` identifies one port collider and its short collar only, not an owner-wide bypass.

- [x] Write failing tests: inflated segment crossing a thin wall with both ends outside;
      grazing a corner, floor, tabletop, desk leg, monitor and rack; passage through
      open room interior and rack gaps; exemption cannot ignore another rack surface.
- [x] Run `node --test tests/collisions.test.mjs`; confirm the missing-module/API failure.
- [x] Record room boxes without regenerating GLB; decode rack box groups from original
      indexed geometry, bounded by `rackIndexCount`. Exclude ornamental micro-boxes
      only when a supporting surface covers them.
- [x] Implement spatial broad phase and continuous capsule/expanded-box queries.
      Transform colliders using the same room, rack and chair poses as rendering;
      retain previous transforms to query swept obstacle movement.
- [x] Run the new suite plus existing workstation/ASCII-room geometry tests.
      Require correct contacts, finite normals and segment penetration <=0.002.

### Task 2: Stateful extensible rope and collision-safe tube geometry
**Files:** create `cable-physics.js`, `cable-mesh.js`,
`tests/cable-physics.test.mjs`, `tests/cable-mesh.test.mjs`;
modify `cables.js`, `rooms.js`, `room-world.js` and cable-related existing unit tests.
**Interfaces:**
- `cableEndpoints(room,center,pose,serverPose)` returns `{a,b,tangentA,tangentB,ports}`.
- `createRope(endpoints,collisionWorld)` returns persistent simulation state.
- `stepRope(rope,dt,endpoints,collisionWorld,{reduced})` updates it; exposes
  `points`, `distances`, `length`, `moving` and `bounds`.
- `buildCableTube(rope,previousMesh)` returns reusable mesh arrays compatible with
  the renderer, including arc length for the surface streak and separate end plugs.

- [x] Add failing tests for exact A/B on all five shelves/monitors, rotated/sliding
      chair avoidance, material extension beyond the old scene and retraction without
      accumulating loops, finite settling, radius clearance and ground support.
- [x] Add the adversarial segment cases from Task 1 to the actual solver:
      sparse samples across a wall, corner contact, an unrelated moving room,
      fast endpoint movement, insertion/removal of samples and port exit clearance.
- [x] Run both new suites and confirm failure before implementation.
- [x] Replace hand-authored route definitions with endpoint definitions.
      Automatically seed a valid obstacle-aware path; preserve its state thereafter.
      Use position-based constraints, fixed 1/120 s substeps, gravity, bending and
      damping; cap accumulated time at 0.1 s after pauses.
- [x] Adapt local sampling and material length without a world-distance clamp.
      Include segment constraints and swept obstacle queries in every solve;
      re-pin end collars after constraints and validate clearance before delivery.
- [x] Build an approximately 0.085-radius rounded tube with continuous surface
      distance. Any smoothing must pass the same clearance query; do not cut corners.
      Keep end plugs, remove intermediate rigid joints and reuse mesh storage.
- [x] Run all Node tests. Replace axis-aligned-route assertions with endpoint,
      clearance, arc-length and continuous-mesh assertions; keep appearance,
      camera, palette and workstation coverage. Record separate static-body and
      adaptive-cable triangle counts rather than claiming the former fixed total.

### Task 3: Causal signals on changing cable lengths
**Files:** modify `signals.js`, `tests/signals.test.mjs`,
`tests/signal-network.test.mjs`; add `tests/dynamic-signals.test.mjs`.
**Interfaces:**
- `createSignalNetwork(paths)` consumes `{id,color,length}[]`.
- `.advance(seconds,lengths,reduced)` returns the established
  `{links,server}` render data, with per-link distances and receipt flashes.
- `.reset(seconds=0)` resets intentionally for initialization/test replay only;
  dragging, remeshing and ordinary cable-length changes must never call it.

- [x] Write failing tests: 5 units of progress per second on unequal routes;
      extend/shorten midway through outbound and reply; single causal receipt;
      reply after 1 s; no reset of another link; latest server color on overlap.
- [x] Cover time=0, repeated same timestamp, pause/resume, reduced motion and
      cycle turnover. Decide exact-arrival ownership using a stable link-ID tie break.
- [x] Run `node --test tests/dynamic-signals.test.mjs`; confirm failure.
- [x] Track emission/receipt events and distance travelled from the sending
      endpoint, instead of recomputing phase from the current longest cable.
      Schedule the next shared exchange after all replies plus the existing rest.
- [x] Run signal suites and all Node tests. Browser fixtures that previously
      sought backwards must replay a fresh deterministic state or use increasing
      times; do not add production-only global test controls.

### Task 4: Shared session layout and hold-to-drag interaction
**Files:** create `room-layout.js`, `room-drag.js`,
`tests/room-layout.test.mjs`, `tests/room-drag.test.mjs`;
modify `lab-ui.js`, renderer, `lab.css` and accessibility copy in `index.html`.
**Interfaces:**
- `createRoomLayout(WORLD_ROOMS)` owns current centers independently of constants.
- `.room(id)` supplies the current room descriptor to body/camera/hitbox callers.
- `.move(id,center)` accepts only non-overlapping placements; `.restore(id,center)`
  restores a cancelled gesture. Expose current bounds, not a fixed map limit.
- `createRoomDrag({layout,projectToGround,changed,finished,announce})` supplies
  `bind(button,id)`, `update(now)`, `cancel()` and `active`.
- The drag controller consumes activation/click events only after a successful
  hold or keyboard-move mode; quick clicks remain with existing app handlers.

- [x] Write failing tests for the 350 ms hold with 8 CSS px pre-hold tolerance,
      quick click, captured movement outside hull, pointerup, pointercancel,
      Escape restore, unrelated pointer rejection and synthetic-click suppression.
- [x] Add layout tests: translate every room, reject room/rack overlap,
      unlimited finite XZ coordinates, no mutation of initial definitions,
      monitor/collider/B centers all translating by the same delta.
- [x] Run new suites and confirm failure.
- [x] Bind one controller to ASCII and all four lab hitboxes; make it the owner
      of long-press pointer capture rather than competing with existing ASCII code.
      Freeze view/projection during drag, intersect pointer with XZ plane and
      preserve grab offset. Reframe from current bounds only after placement.
- [x] Add subtle grabbed/blocked cursor state and one short accessible hint.
      M enters keyboard placement, arrows move 0.25 units (Shift: 1 unit),
      Enter places, Escape cancels; normal Enter/Space still opens the monitor.
- [x] Cancel on lost capture, app entry, hidden document, pagehide and context loss.
      Set touch-action only on scene room hitboxes, not monitor controls/nav.
- [x] Run all Node suites before browser integration.

### Task 5: One authoritative world step, browser evidence and final review
**Files:** create `cable-world.js`, `tests/flexible-cables.cjs`;
modify renderer, `lab-renderer.js`, `tests/cables.html`,
`tests/animation.html`, `tests/four-rooms.cjs`, docs and renderer references.
**Interfaces:**
- `createCableWorld({roomMeshes,rackBoxes,layout})` owns five ropes and colliders.
- `.advance(seconds,poses,serverPose,chairPoses,reduced)` steps once and returns
  `{cables,bounds,moving,network}`; rendering consumes that immutable frame.
- `.dispose()` releases resources through the existing lifecycle path.
- Lab renderer updates dynamic tube buffers once per frame; color and bloom draw
  the same geometry with identity cable transforms (already world-space).

- [x] Integrate the frame before signal uniforms and both passes; update current
      room centers in overview, labels, hitboxes and monitor camera. Keep standalone
      GLB lighting fixtures independent of the full-world simulation.
- [x] Add real pointer/touch and keyboard browser tests for all five rooms:
      drag without app entry; place/cancel; camera/HTML still match the moved monitor;
      endpoints remain connected and a foreign room displaces a cable.
- [x] Add controlled physics/pixel cases for solid occlusion, round tubes,
      changing-length signal arrivals, velocity and latest-color glow.
      Assert one physics update despite two render passes, one WebGL2 context,
      restored viewport/scissor and bounded work after a hidden-tab interval.
- [x] Test 1440×1000, 390×844, 844×390 and reduced motion; verify reduced motion
      still solves collisions but does not keep decorative settling/impulses running.
- [x] Run `node --test tests/*.test.mjs` and `python tests/test_cable.py`.
- [x] With the local server running and the established `NODE_PATH`, run serially:
      `node tests/flexible-cables.cjs`, `node tests/browser-regression.cjs`,
      `node tests/four-rooms.cjs`. Require zero assertion/console failures,
      zero real provider requests; inspect screenshots, not just DOM flags.
- [x] Rename renderer using its actual SHA-1; update `index.html`, README and Agent
      references; rerun browser coverage against the renamed asset.
- [x] Copy successful screenshots and raw results into repository evidence.
      Check GLB SHA-256 remains
      `8b4b82ab815b34eb73dff520e89edc535eff9745642c20cdfb87effd081f3f18`
      and run `git diff --check`.
- [x] Obtain a fresh whole-change review using the selected execution method.
      Resolve important findings, rerun affected tests and mark completed checkboxes.
      Report measured limits honestly, without claiming infinite precision/performance.

## Self-review
All approved requirements map to Tasks 1–5, including segment—not merely point—
collision, moving foreign obstacles, endpoint-specific exceptions, session-only
positions, unchanged apps and two-pass lifecycle behavior.

## Execution record
User selected native implementation in this session and approved the scope.
Tasks 1–4 are implemented and covered by the 36-test Node suite. Independent
review findings were addressed, including direction-sensitive temporal contacts,
full-radius mid-segment CCD response, narrow socket surfaces, dynamic camera
depth, causal shortening events, sliding/bending and gesture click suppression.
The focused follow-up review reported no remaining blocker.
Final browser runs passed on `viewer.606ceb00e1e1.js`: four drag viewport groups,
11 regression scenarios / 195 assertions, 14 application result groups. Final
Node run: 36 PASS; Python: 8 PASS. Evidence copied; renderer SHA-1 and unchanged
GLB SHA-256 verified; `git diff --check` passed. No commit, push or deployment.
The combined browser command exceeded its host deadline after the regression
runner had passed; the four-room runner was then run separately and passed.
Reduced-motion click-only return was additionally fixed and verified with
zero stuck pixel channels, without relaxing that assertion.
