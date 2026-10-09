# Enchanted wand beside the map

The wand should feel like a physical companion to the parchment. Follow the supplied dark wooden reference: a flared pommel, entwined carved vines, and a long tapered shaft. Keep the map's existing palette, typography, and controls. Wood brown, parchment gold, and the dark tabletop remain the visual language; a restrained warm light at the tip responds only to casting.

1. Author a separate Blender scene and export a UV-mapped wand mesh. Keep the existing Blender project intact. Use the supplied base color as sRGB and the OpenGL normal and packed ORM as linear textures.
2. Add the wand to the existing Three.js scene before shader warmup. Anchor its resting pose beside the map, including narrow screens and zoomed views. Lift and aim toward map interactions and hold a casting pose through unfolding, revealing, and erasing. Return smoothly to rest. Respect reduced motion and dispose all resources.
3. Check types and lint, then inspect the resting and active poses in the browser. Existing map behavior should remain usable with pointer, touch, and accessible controls.

Validation will use focused inspection, typechecking, linting, and browser interaction, rather than adding tests for the visual geometry.

## Completion and validation

The Blender-authored geometry and supplied maps are integrated. The wand uses a viewport-relative resting anchor that draws closer to the folded parchment, and camera-dependent scale to maintain its apparent size through unfolding and zoom. Pointer hover, touch, and map commands activate the casting pose; reduced motion leaves it at rest. Typechecking and linting pass. Browser checks covered desktop and 390px-wide layouts, unfolding and pointing, and the WebGL reduced-motion fallback. Screenshots are saved under `.context/`. No new tests were added for the visual mesh.

## Wand overshoot correction

Pointing now solves the handle position from the tip endpoint after orientation smoothing. The endpoint is clamped to the current panel transforms with an inset margin. The tip lifts toward the camera along the same viewing ray, keeping its screen projection over the bounded ink point. This prevents a fixed-length wand from overshooting nearby targets in either folded or unfolded layouts. The resting-to-casting transition remains intact.

Validation: typecheck and lint pass; 36 focused numerical boundary checks in `.context/check-wand-bounds.ts` cover both layouts, corners, out-of-bounds targets, and camera distances. Browser inspection confirms edge targeting on folded and unfolded parchment. No permanent test files were added.

## Physical clearance and raised casting pose

The previous endpoint correction did not check the entire wand's depth. The full model bounding box is now transformed with the current orientation and scale every frame. If its lowest point would approach the highest paper panel, the complete wand moves toward the camera along its tip's viewing ray. All panels participate in the clearance calculation, including folded leaves; only the central cover receives folded-map targeting.

Per the user's height adjustment, the casting tip is lifted 2.2 scene units toward the camera, the intended handle lift is 3.8 units, and the full wand retains at least 0.9 units above the paper. Numerical checks now verify physical clearance throughout lifting, turning, and returning to rest, in addition to projected endpoint bounds. Typechecking and linting pass.
