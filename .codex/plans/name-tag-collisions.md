# Fade overlapping name tags

Preserve the current stacking order. When tags overlap or nearly touch, fade the
tag behind to 30% opacity. Hovering a faded tag brings it forward at full opacity
and fades its directly overlapping neighbors. Positions and walking paths stay
unchanged.

## Implementation

1. Add a pure collision and pointer-targeting helper. Use banner rectangles in
   map-scene units with a 0.06-unit proximity margin, current visibility, and
   original stacking priority. Only directly intersecting tags affect each other.
2. Update all banner positions before resolving collisions each frame. Fade
   parchment, name, and halo together, independently of entrance/exit progress,
   with frame-rate-independent easing reaching 95% in 150 ms. Reduced motion
   applies opacity immediately.
3. Hover promotes the banner, name, and halo together below controls and
   inscriptions. Choose the nearest name center among eligible banners under the
   pointer; ties prefer current hover then original stacking order. Use the same
   resolver for clicks and preserve control priority and touch selection.
4. Clear hover during dragging, cancellation, blur, and closure; restore original
   stacking and collision opacity when hover ends. Hidden tags cannot collide.

## Validation

Run focused helper tests covering separation, proximity, overlapping pairs and
chains, hover priority, eligibility, stable targeting, and reduced-motion/easing
behavior. Run typechecking and linting. Visually check moving tags, hover swaps,
clicks, zoom/pan, and entrance/exit in WebGPU and WebGL where available.

## Status

Implementation complete. The confirmed defaults are stacking-order priority and
30% opacity for the entire tag. Pointer-down preserves the hover tie preference
for pointer-up selection, even though active dragging clears visible hover.

Validation passed: all 10 focused helper tests, `npm run typecheck`,
`npm run lint`, and `git diff --check`. Chrome visual checks confirmed WebGPU and
WebGL2 rendering, moving tags, selecting faded tags, switching priority between
overlapping Don McCurdy and Anderson tags, zoom/pan, opening and closing. Neither
renderer reported console errors. Reduced-motion behavior is covered by the
helper tests; touch eligibility and event handling were checked in code.

Screenshots are saved under `.context/name-tags-webgpu.jpg`,
`.context/name-tags-webgl-before.jpg`, and `.context/name-tags-webgl-hover.jpg`.
