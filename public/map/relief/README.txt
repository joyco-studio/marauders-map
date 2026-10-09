UNFOLDED MAGIC MAP — NORMAL + DISPLACEMENT

Matched material maps for the 2400 x 1200 unfolded map composition.
Every data texture is 4096 x 2048, with a complete 2:1 UV rectangle.

FILES

main_unfolded_displacement_16bit.png
  Precision height master: unsigned 16-bit grayscale PNG.
  Broad accordion creases, gentle paper waviness and slight edge lift.

main_unfolded_displacement_web_8bit.png
  The same height field quantized to 8-bit for simple image-loader workflows.

main_unfolded_normal_opengl.png
  Full tangent-space normal: OpenGL / +Y. Includes the fold slopes and fine
  paper fibers. Use this with the standard Three.js displacement material,
  or alone on a flat plane when only the lighting should show the creases.

main_unfolded_normal_directx.png
  Full normal in the alternate -Y convention. It differs only by an inverted
  green channel. Use the convention expected by your target engine.

main_unfolded_normal_detail_opengl.png
  Fine paper relief only. Use this only when your geometry or custom shader
  already computes shading normals for the displaced broad folds.

main_unfolded_relief_preview.jpg
  Labeled review sheet with the existing map artwork applied to the surface.
  The review sheet has illumination; the data textures contain no baked light.

relief_metadata.json
  Exact registration, amplitude, orientation, frequency split and provenance.

validation.json
  Dimensions, bit depth, normal-vector checks and exact 16-bit PNG round trip.

SURFACE DESIGN AND REGISTRATION

The 2:1 unfolded sheet and 2:5 cover are consistent with five equal accordion
panels. The four nominal vertical fold positions are U=0.2, 0.4, 0.6 and 0.8
(x=480, 960, 1440 and 1920 on the 2400-unit map). Ridge and valley folds alternate.
They are shallow residual creases in an open sheet. Folding/unfolding animation
would be a separate geometry operation.

The top edge of each image matches the top edge of the existing unfolded map.
Map each entire texture once over the complete sheet, with no cropping or
additional transparent border. Use clamp-to-edge, not repeat. The numerical
maps are fully opaque because the paper occupies the complete rectangle.

The ink architecture and ornaments stay in their separate visual layer. They
have not been converted to height or embossed into the paper.

HEIGHT AND NORMAL SCALE

White raises the surface; black lowers it; 0.5 is the reference plane.

  z = (heightSample - 0.5) * displacementScale

The normal was baked for a 2-unit-wide by 1-unit-high sheet with:

  displacementScale = 0.02
  displacementBias  = -0.01
  normalScale       = (1, 1)

For a sheet of height S in your geometry units, begin with:

  displacementScale = 0.02 * S
  displacementBias  = -0.5 * displacementScale

This defines the full possible height range, not the actual relief amplitude:
the authored image occupies only the middle part of 0..1. Exact extrema are in
relief_metadata.json. If you halve the physical relief, normalScale (0.5, 0.5)
is a useful matching starting point on the same 2:1 surface.

Displacement stores the broad geometry. The full normal derives from the same
broad height field plus a separate fine-fiber component. Those fine fibers stay
in shading detail to avoid forcing them into a coarse vertex grid.

THREE.JS STARTING POINT

For a new 2:1 PlaneGeometry, the following values are a starting configuration:

  const [height, normal] = await Promise.all([
    loader.loadAsync('main_unfolded_displacement_web_8bit.png'),
    loader.loadAsync('main_unfolded_normal_opengl.png'),
  ]);

  for (const texture of [height, normal]) {
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  }

  const geometry = new THREE.PlaneGeometry(2, 1, 256, 128);
  const material = new THREE.MeshStandardMaterial({
    color: 0xd6c19b,
    roughness: 0.95,
    metalness: 0,
    displacementMap: height,
    displacementScale: 0.02,
    displacementBias: -0.01,
    normalMap: normal,
    normalScale: new THREE.Vector2(1, 1),
  });

Use your paper color and map artwork with this material. The values above
illustrate the supplied relief amplitude, not a tested integration into your
application. Keep normal and height UV transformations aligned with the artwork.
The 256 x 128 subdivisions are a starting point for the broad creases; adjust
mesh density to your viewing distance and performance budget.

Standard MeshStandardMaterial displacement does not recompute the shading
normals of the displaced vertices, so the full matching normal is appropriate.
Use detail-only after an explicit geometry/normal reconstruction workflow.

NORMALS AND COLOR HANDLING

OpenGL normal: +X right, +Y up, +Z out of the front surface. The saved PNG rows
run downward; this was accounted for when calculating the green component.
DirectX is the green-inverted alternative, not a different surface.

Both maps contain numerical data. Keep color space as NoColorSpace / Non-Color.
Do not apply sRGB decoding, color grading, or a gamma correction to either map.
PNG data assets have no alpha, gamma, sRGB or ICC profile chunks.

16-BIT WEB LOADING

Keep the 16-bit height as the precision master for workflows that preserve it.
A normal TextureLoader image path does not by itself establish a 16-bit GPU
texture. Preserving the master's precision requires an appropriate decoder
and data-texture upload. The supplied 8-bit version is for straightforward
image-loader use; the normal map retains smooth shading for the broad folds.

PROVENANCE

The paper grain source was created with the built-in image generation tool.
Its 1774 x 887 pixels were band-pass filtered and normalized before adding
subtle native-resolution grain. The broad folds and normal vectors were
calculated numerically. The delivered texture size is 4096 x 2048; the grain
source itself is not native 4K. No color staining or ink was used as height.

Source prompt, condensed:
  Full-bleed 2:1 grayscale handmade-paper microrelief around middle gray;
  fine cellulose fibers and tiny pores; no stains, lettering, illustration,
  borders, large folds, perspective, lighting, shadows or transparency.

TECHNICAL REFERENCES

https://threejs.org/docs/pages/MeshStandardMaterial.html
  Displacement map, scale/bias, matching normals, non-color data.
https://threejs.org/docs/pages/TextureLoader.html
  ImageLoader-based texture loading.
https://threejs.org/docs/pages/Texture.html
  Default UnsignedByteType, color-space and wrapping behavior.
https://threejs.org/docs/pages/DataTexture.html
  Explicit data-buffer texture input.
https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#material-normaltexture
  Tangent-space normal convention.
