# First geometry corner fold

Curl the outer top-right corner around a diagonal crease using a small cylindrical bend. Retain the original UVs so ink and parchment follow the flap, and rebuild normals and perimeter geometry. Fade the bend out as the accordion closes to preserve stack clearance. Validate typecheck, lint and browser appearance; preserve unrelated workspace changes.

## Result

The top-right corner uses a rounded diagonal bend followed by a turned-back flap. Original UVs are retained for both faces and the perimeter. A vertex offset attribute flattens the corner while closing. Typecheck and lint pass; the production build passed and Chrome verified the final flap and clean closing cycle. This first visual experiment remains local alongside existing unrelated work.
