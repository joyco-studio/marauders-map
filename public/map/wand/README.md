# Enchanted wooden wand

`wand.glb` was authored in Blender for this scene using `scripts/create-wand.py`. It contains a tapered shaft, a flared pommel, and four raised interlacing handle carvings. The mesh has longitudinal UVs, with its handle at the origin and its tip at local +Y after glTF export. It is exported without materials; `lib/map/wand.ts` owns the material and animation.

The supplied texture pack was newly authored from a generated concept image. Normal, roughness, and surface occlusion are artistic estimates aligned to the same grain, not measured data or a model-specific bake. The handle carvings are geometry. Base color loads as sRGB; the OpenGL normal and packed ORM load as linear data. ORM uses red for occlusion and green for roughness; metallic is fixed to zero for wood. Height is intentionally not layered over the normal map.

The wand rests beside the parchment, lifts toward pointer interaction, and casts during unfolding, ink reveal, and erasure. Its viewport-relative anchor and scale preserve its visibility through pan, zoom, and narrow layouts. Reduced motion keeps the wand at rest and disables its tip glow.

Casting endpoints are clamped inside the current panel geometry. The tip is lifted along the camera ray to keep it over the bounded ink point in screen space. The handle position is solved from this endpoint after rotation smoothing so the shaft cannot overshoot a nearby target.
