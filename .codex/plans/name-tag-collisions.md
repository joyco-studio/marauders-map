# Fade overlapping name tags

Preserve the current stacking order. When tags cover each other's central parchment bodies, fade the
tag behind to 30% opacity. Hovering a faded tag brings it forward at full opacity
and fades its directly overlapping neighbors. Positions and walking paths stay
unchanged.

## Implementation

1. Add a pure collision and pointer-targeting helper. Require 20% overlap of the
   smaller central parchment body, using an inset UV rectangle measured from the
   artwork to exclude transparent margins and decorative curls. Use current visibility and original stacking priority;
   only directly intersecting tags affect each other.
2. Update all banner positions before resolving collisions each frame. Fade
   parchment, name, and halo together, independently of entrance/exit progress,
   with frame-rate-independent easing reaching 95% in 150 ms. Reduced motion
   applies opacity immediately.
3. Hover promotes the banner, name, and halo together below controls and
   inscriptions. Choose the nearest name center among eligible banners under the
   pointer; ties prefer current hover then original stacking order. Use the same
   resolver for clicks and preserve control priority and touch selection.
4. Retain a pressed tag's emphasis during pointer-down, hold, and click until the
   pointer leaves its banner, even if another name center becomes closer. Clear
   emphasis on pointer cancellation, blur, closure, or loss of eligibility;
   touch release ends touch emphasis. Hidden tags cannot collide.

## Validation

Run focused helper tests covering the coverage threshold, overlapping pairs and
chains, hover priority, eligibility, stable targeting, and reduced-motion/easing
behavior. Run typechecking and linting. Visually check moving tags, hover swaps,
clicks, zoom/pan, and entrance/exit in WebGPU and WebGL where available.

## Status

The initial implementation is complete; follow-up fixes retain emphasis through
clicks and replace proximity detection with central paper-body coverage.
The confirmed defaults remain stacking-order priority and 30% opacity.
Follow-up validation passed all 12 focused tests, typechecking, linting, and
diff whitespace checks. Chrome/WebGPU checks confirmed the tighter threshold,
long-press/repeated-click retention within a covered tag, and release on pointer
exit. Evidence: `.context/name-tags-retained-click.jpg`.

Initial validation passed: all 10 focused helper tests, `npm run typecheck`,
`npm run lint`, and `git diff --check`. Chrome visual checks confirmed WebGPU and
WebGL2 rendering, moving tags, selecting faded tags, switching priority between
overlapping Don McCurdy and Anderson tags, zoom/pan, opening and closing. Neither
renderer reported console errors. Reduced-motion behavior is covered by the
helper tests; touch eligibility and event handling were checked in code.

Screenshots are saved under `.context/name-tags-webgpu.jpg`,
`.context/name-tags-webgl-before.jpg`, and `.context/name-tags-webgl-hover.jpg`.

Screenshot refinement: the name-only rule missed the supplied Akella/Anderson
overlap and the rear banner behind sunag. Collision now uses the central paper
body (UV bounds 0.12, 0.34 to 0.87, 0.66) with a 20% overlap threshold. Added
regression fixtures based on both supplied screenshots; fabroos and Anderson
remain opaque while Akella fades, and the rear tag fades behind sunag.

Screenshot refinement validation passed: all 14 focused tests, typechecking,
linting, and diff whitespace checks. The new examples are geometric regression
fixtures estimated from the supplied images, not a live replay of those scenes.

Size refinement: reduce Bruno Simon and Don McCurdy's tags to 75% of their
previous dimensions. Scale parchment and lettering together; hover and collision
bounds continue to derive from the resulting banner dimensions. This cosmetic
adjustment uses focused inspection, typechecking, and linting rather than new tests.
