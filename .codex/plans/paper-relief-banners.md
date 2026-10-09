# Paper relief and fitted banners

Integrate the supplied registered 8-bit web height map and OpenGL full normal map as non-color textures. Use continuous sheet UVs on subdivided front/back/perimeter meshes and attenuate relief during folding to preserve closed-stack spacing. Keep precision-master loading outside the runtime image workflow.

Replace character-count widths with measured Tangerine layout widths and compact horizontal padding. Preserve banner height, safe text bounds and paired stacking. Validate through typecheck, lint, build and visual opening/closing checks; preserve unrelated pnpm files.

## Result

Implemented registered GPU vertex displacement on front, back and perimeter, plus matching full normal shading. Height uses the supplied web image; reference metadata is retained. Hermione’s banner now measures approximately 1.22 units instead of 2.6. Typecheck, lint, production build and whitespace checks passed. Chrome verified WebGPU opening and clean folded state, and WebGL2 shader initialization without errors. No new tests were added for these visual adjustments. Unrelated ecosystem-plan and pnpm changes are preserved separately.
