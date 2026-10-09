# Parchment trigger hover feedback

## Summary

Add subtle visual feedback to the existing actionable triggers so users can see which inscription, paper edge, or key can be activated. Scope “trigger” to both folded-cover spell choices, the unfolding paper edges, the secret-passage key, and the close inscription. Character-banner selection from the ecosystem activity plan is a later integration, not a prerequisite for this change.

This is a standalone implementation plan only. Preserve the cinematic transitions, wand behavior, pan/zoom, click actions, artwork, reserved phrases, and mockery response. Support both current copy and the Makers’ Map replacements without matching targets by displayed text.

## Visual behavior

Use parchment-attached sepia ink accents, not HTML tooltips, neon outlines, particle effects, or scaling text. Fade feedback in over 160 ms and out over 220 ms using the existing render clock. Feedback settles to a steady accent; there is no continuous pulse or audio.

| Target | Feedback |
| --- | --- |
| “Reveal your secrets” | A thin, slightly uneven ink underline beneath the inscription |
| “I solemnly swear that I am up to no good” | The same underline beneath the complete two-line choice |
| Left or right unfolding edge after a spell choice | A narrow ink accent tracing only the hovered outer exposed edge; do not unfold or bend paper on hover |
| Secret-passage key | A small broken ink ring around the key, leaving its artwork unobscured |
| Close inscription | The same ink underline used for the spell choices |

Use ink color `#593724` at a maximum opacity of 0.65. Size accents from the existing measured text bounds or hotspot bounds, with approximately four map pixels of separation from lettering. Keep the edge and key accents within the current hit region. Decorative meshes must not participate in hit testing or intercept clicks.

## Input and rendering changes

1. Consolidate trigger eligibility into a shared resolver returning a stable target ID: `mockery`, `welcome`, `open-left`, `open-right`, `passage`, or `close`. Use this resolver for cursor feedback, hover, and pointer-up activation. Map both opening-edge IDs to the existing `open` command. Preserve existing trigger boundaries and the greater-than-six-pixel drag guard. After discovery, the passage is no longer actionable and receives neither pointer cursor nor hover feedback.
2. Track the latest mouse or pen pointer position and the active target in scene-owned state. Resolve against current paper geometry and camera whenever the pointer moves or the camera/layout/phase changes, so zoom, resize, and a stationary pointer cannot leave a stale highlight. Reuse panel hit coordinates within a pointer event rather than raycasting separately for the wand, cursor, and hover. Never update React state on pointer movement or animation frames.
3. Feedback is eligible only while folded with the relevant choice/edge available, or exploring with the relevant passage/close action available. Preserve the mockery-open blank map: no passage accent there. Clear hover immediately on pointer-down, drag/pinch, pointer cancellation, pointer exit, window blur, hidden tab, phase transitions, or disposal. After release, recompute hover for a mouse/pen pointer still inside the canvas. Touch must never leave persistent hover; its existing tap and wand-cast feedback remains sufficient.
4. Preallocate the underline, edge, and ring geometry/materials during scene setup. Use scene-owned opacity uniforms and the existing ink reveal conventions; no assets, meshes, textures, or materials are created during hover. Register resources with the existing XYZ Disposer and shader warmup. Transform accents through the same cover/map coordinate space as their target so they remain attached during zoom, pan, and folds.
5. Render accents in a small dynamic overlay composition after cached static artwork. Exclude them from static snapshot capture and keep the cover base composition independently cached; hover may redraw its accent layer but must not dirty or rebuild the full architectural or cover cache each frame. Respect reveal/erase opacity and phase visibility so hidden content cannot become visible through an accent. Account for existing paper relief and the current render-target Y normalization on WebGPU and WebGL2.
6. Add an internal `MapControls.setFocusedTrigger(target | null)` method for the existing accessible buttons. Their focus/blur handlers select the same decorative feedback; the existing keyboard focus styling remains visible. Pointer hover takes precedence while actually over an eligible trigger, otherwise show the eligible focused target. “Unfold the map” highlights both available edges because the keyboard action has no side. Zoom/reset controls do not acquire a fabricated parchment target. Clear a focused target when its button disappears or becomes disabled. No new hover announcements or changes to reserved copy are needed.

## Verification and acceptance

Use focused inspection, typechecking, linting, and a production build for this visual interaction change. Do not add automated tests solely for underline geometry or fade constants. If trigger eligibility is extracted into a shared pure resolver, add only focused regression tests for the actionable boundary: spells before a greeting, edges after a greeting, no triggers during transitions, no passage after discovery or on the mockery map, and preserved close behavior.

Manually verify desktop WebGPU and mobile-sized WebGL2: each spell, each unfolding edge, key before/after discovery, close inscription, keyboard focus, and touch taps. Inspect hover-to-click, moving directly between choices, drag/pinch starting over a trigger, pointer leaving, resize/zoom beneath a stationary pointer, close/reopen, both greetings, hidden-tab return, and debug manual poses. Confirm feedback does not change target boundaries, obscure text, leave cached ink behind, or cause shader compilation during first hover.

Acceptance means every eligible existing trigger has restrained visible feedback, inactive triggers do not appear clickable, the accents stay aligned with the parchment, keyboard users receive equivalent feedback, and the existing exploration and opening/closing interactions still work. Implementation changes must remain separate from unrelated ecosystem-plan, package-manager, and artwork work.

## Guidance

The JOYCO Logs and Toolbox indexes were already reviewed in this session. Use the existing [XYZ disposal and warmup](https://hub.joyco.studio/toolbox/xyz) approach rather than adding an animation or interaction library. The current experience already owns raycasting, clocks, ink materials, cached composition, and accessible controls; extend those boundaries.

## Implementation status

Implemented the shared stable-ID resolver, scene-owned pointer/focus state, preallocated ink accents, dynamic map accents excluded from snapshots, and an independently cached cover base with a dirty dynamic overlay. Accessible trigger controls share the same feedback; discovery disables the passage control and removes its pointer eligibility.

Validation completed: focused TypeScript and ESLint checks, three trigger boundary regression tests, and a production build. Desktop preview checks covered both spell underlines, keyboard highlighting of both unfolding edges, opening, passage feedback and discovery. A 390 × 844 WebGL2 preview confirmed the underline and mockery greeting/opening. Screenshot evidence is saved in `.context/trigger-focus.png`.

Remaining manual coverage: actual touch/pen devices, full drag/pinch and stationary-pointer resize/zoom matrix, hidden-tab return, close/reopen, and debug manual poses. No claim of complete device-matrix verification is made.
