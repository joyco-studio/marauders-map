# Random banner variations

Import the six supplied banner designs with their registered silhouette, outline, and color layers. Keep the existing three sizes available and avoid repeating a variant among simultaneously visible makers.

1. Copy source SVG and color layers into the map artwork and bake their signed distance fields with matching viewBoxes.
2. Define the banner dimensions and safe text areas in a shared catalog used by asset loading and rendering.
3. Assign shuffled unused variants when makers enter, keep assignments through their exits, and release them only once hidden. Fit names inside each variant's safe area.
4. Verify allocation uniqueness and reuse with focused tests, check the generated asset manifest, and run typechecking and linting.

## Verification

The six imported designs have complete color, outline, and silhouette assets with registered viewBoxes; twelve new SDF textures were baked. Typechecking, ESLint, whitespace checks, and three focused allocation tests pass. Tests cover distinct concurrent assignments, stable variants during exits, replacement actors, and exhausting the shuffled bag before recycling. Visual browser verification remains unavailable in this session.
