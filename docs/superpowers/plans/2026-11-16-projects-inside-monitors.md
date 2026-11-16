# Projects Inside Monitors Implementation Plan

**Goal:** All four projects open inside their actual computer screens, exactly
like ASCII, as explicitly requested and confirmed by the user.
**Architecture:** Reuse the ASCII camera transition, a shared physical monitor
definition and HTML surface. Draw GPU experiments into a clipped region of that
surface using the same WebGL2 context; no sidebar or fullscreen substitute.
**Tech Stack:** Existing native JavaScript, WebGL2, HTML/CSS and Web Audio.
**Spec:** User correction: “kamera ma isc do monitora komputera i tam ma sie
dziac cały projekt”, confirmed “tak jak w acii”. Supersedes the previous
side-by-side experiment/panel layout.

**Status:** Implemented and verified locally; `docs/four-rooms.md`.

## Constraints / review focus
- Preserve furnished rooms, original GLB, ASCII and server +Z contact.
- Verify actual camera matrices and projected monitor corners, not only data-view.
- Keep every control and effect inside the physical display, including on phones.
- Clip GPU content when scrolling; restore viewport/scissor after each draw.
- Escape reverses entry; chair clears screen; focus and audio lifecycle remain.

## Tasks
- [x] Define shared monitor geometry/framing in `rooms.js`; test exact center,
      direction, proportions and screen fit in `tests/lab-monitor.test.mjs`.
- [x] Update renderer camera targets and lab chair/monitor visibility; remove
      world-space active effects, add scissored `drawMonitor(frame)` after bloom.
- [x] Replace sidebar CSS/HTML with in-monitor application, preview and controls.
      `lab-ui.js` supplies preview rectangle and clipping bounds on resize/scroll.
- [x] Adapt `tests/four-rooms.cjs` to assert +X camera, screen alignment, internal
      controls, actual effect pixels, clipped scroll and audio lifecycle.
- [x] Run all Node and serial browser regressions; inspect three screen sizes.
      Update renderer content hash, references, documentation and screenshots.

Self-review: gallery, particles, materials and sound retain all existing controls.
Only presentation/navigation changes; local audio and privacy constraints remain.
Execution stays in this session; no deployment or commit.
