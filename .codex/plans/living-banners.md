# Living parchment banners

Replace the six previous runtime banner variants with the supplied original artwork. Keep its full transparent canvas aligned with the numerical motion mask and preserve the protected text rectangle.

1. Load the shared artwork through the existing asset registry in sRGB. Read the motion mask once as numerical bytes.
2. Adapt the supplied subdivided geometry helper to the existing TSL ink reveal and scene ownership. Size each banner to its name without stretching the illustration, and offset its protected text area to the label anchor.
3. Animate only visible tails from the single experience clock, keeping names pinned and each banner/text pair in the established overlap order. Release instance geometry and shared textures on teardown.
4. Validate TypeScript, lint, and the production build. Check the rendered map and subtle movement in the browser where available.

Implemented asset loading, proportional sizing, pinned text alignment, and tail updates. The supplied helper is vendored with a typed adapter and a planar sway extension.

Validation completed: TypeScript, lint, and production build passed. A numerical check verified the pinned text area, unchanged UVs, deterministic replay without drift, and moving tail vertices. Chrome preview reached the fully open map successfully; screenshot saved in `.context/living-banners.png`.

## Visible ribbon motion

The original helper mostly displaced depth, which the offscreen orthographic composition flattened. Add independent, smooth planar sway (5.5% of full banner width at maximum weight), blended with coherent noise. Keep the protected name area and UVs fixed, derive every frame from rest positions, and expand culling bounds to include planar motion.

Validation: typecheck, lint, and production build pass. The focused geometry check measured 0.118 scene units of planar tail travel across two seconds while all 168 protected text vertices and UVs stayed unchanged; replay remains deterministic.
