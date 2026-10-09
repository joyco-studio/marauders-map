LIVING PARCHMENT BANNER — THREE.JS HANDOFF

This helper is a sprite-style 2D/2.5D treatment for small map labels. The paper
texture supplies the folds and open, thin paper tails; a subdivided plane gives
the free tips a small amount of motion. It does not simulate paper thickness,
unfold hidden surfaces, or change which part of a drawn curl overlaps another.

ASSETS / COORDINATES
- Artwork: transparent PNG, straight alpha, sRGB color. Use TextureLoader.
- Motion: opaque RGB PNG with numerical weights. R=left tail, G=right tail,
  B=0. Black is fixed, full channel intensity permits full motion. Each field
  fades into its paper attachment and extends into transparent space around the
  tail. Do not multiply these weights by the coverage alpha.
- Metadata: canvas_px = [pixelWidth, pixelHeight]; safe_text_box =
  [uMin, vMin, uMax, vMax] using bottom-left UV coordinates.
- All assets use the same full UV rectangle, including transparent margins.
  The helper's width option is in scene units for that full rectangle, not in
  image pixels. Its physical height is width * pixelHeight / pixelWidth.

MINIMAL USAGE (serve the delivered files together under /banners/)

import * as THREE from 'three';
import { createLivingBanner, loadMotionPixels } from './animate_banner.mjs';

const [artworkTexture, motionPixels, metadata] = await Promise.all([
  new THREE.TextureLoader().loadAsync('/banners/living_banner_color.png'),
  loadMotionPixels('/banners/motion_weights.png'),
  fetch('/banners/metadata.json').then(r => r.json()),
]);
const banner = createLivingBanner(THREE, {
  artworkTexture, motionPixels, metadata,
  width: 0.5,          // Scene units. Includes transparent canvas margins.
  phase: 1.7,          // Give each instance a different phase.
  segmentsX: 48,       // Vertical count is derived from the canvas aspect.
  alphaToCoverage: false, // Set true only when the render target has MSAA.
});
scene.add(banner.mesh);

// Call from the app's existing render loop with elapsed time in seconds.
banner.update(elapsedSeconds, reducedMotion ? 0 : 1);

BEHAVIOR / TUNING
- The center stays fixed; the name can be a separate static text object.
  The protected text rectangle includes a one-cell guard so a neighboring
  animated triangle cannot move the area under a letter.
- A deterministic 3D value-noise field controls each tail, with two slow
  octaves and a different phase per side. Quintic interpolation keeps its
  motion smooth in space and time. Every frame starts from stored rest
  positions, so there is no drift and no dependency on frame rate.
- Default flutter is 0.008 of physical width. Its sideways components are much
  smaller: 0.0012 width in X and 0.0028 width in Y. Motion lifts the tail toward
  local +Z, with a small positive base lift. Rotate/position the mesh as needed.
- speed=1 samples time at 0.15 cells/second in the main noise octave, with
  a smaller, slightly faster second octave. For many distant labels, reduce
  segmentsX to 32, update at 30 Hz, or pause off-screen instances.
- The default material preserves the illustration's colors using an unlit
  MeshBasicMaterial. Set lit=true for MeshStandardMaterial; the helper then
  recomputes normals after deforming vertices. Generated fold shading remains
  part of the illustration and is not a physically relightable material set.
- Artwork is SRGBColorSpace. A GPU implementation of the motion image must use
  NoColorSpace. This CPU helper reads numerical mask bytes once at setup and
  does not upload the motion image to the GPU.
- The default cutout uses transparent=false, alphaTest=0.5, depthWrite=true.
  alphaToCoverage can smooth its edge when MSAA is actually enabled. Keep the
  banner slightly above the map to avoid coplanar z-fighting. Do not put the
  moving banner and the whole map in the same deforming geometry.
- UVs never change. Ink baked into the banner PNG travels with its paper. Keep
  real text in the protected center. If ink is a separate material, it must
  share the same deformed geometry or the exact same deformation.
- Share the texture and decoded motion image between labels. Each label needs
  its own geometry/controller. dispose() frees its geometry/material; dispose
  shared artworkTexture separately only after the last label is removed.

LIMITS
The helper has been syntax-checked. Numerical checks cover UV orientation,
bilinear sampling, deterministic bounded noise, and continuity at noise-cell
boundaries. A geometry API fixture also checks pinned text vertices, unchanged
UVs, conservative bounds, reproducible positions without drift, and a static
result at zero strength, using the final metadata and a representative opaque
RGB mask. Three.js was not installed in the authoring runtime;
these geometry checks do not replace a real engine or renderer integration.
The helper has not been integrated or render-tested in the project's app.
Large edge-on bends, a curl opening/closing, or independent front/back paper
surfaces need a mesh with fold topology, not a single illustrated plane.

OFFICIAL API REFERENCES
https://threejs.org/docs/pages/PlaneGeometry.html
https://threejs.org/docs/pages/BufferAttribute.html
https://threejs.org/docs/pages/BufferGeometry.html
https://threejs.org/docs/pages/Material.html
https://threejs.org/manual/pages/color-management.html
