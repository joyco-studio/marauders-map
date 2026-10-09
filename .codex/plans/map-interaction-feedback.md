# Map interaction feedback

Preserve the parchment experience while making interactions available across the screen.

1. Remove browser focus outlines and move the greeting and closing spells into visible controls at the bottom of the viewport.
2. Open the folded parchment on pointer down anywhere on its surface after a greeting has been chosen.
3. Render maker activity as an inscription in the map texture, showing only the name and latest event with its link; retain a keyboard-accessible counterpart.
4. Track the pointer across the viewport, hide the native cursor while the interactive scene is ready, and let the wand aim beyond the paper without losing its screen position.
5. Separate the secret passage heading and subtitle with enough space for their actual script lettering.
6. Verify with typechecking, linting, and focused interaction tests for the changed opening rules.

## Verification

Typechecking, ESLint, whitespace inspection, and the three focused trigger tests pass. Browser visual verification could not run because the integrated browser is unavailable in this session. The source annotation was reduced to the latest event following the additional feedback; its technical feed metadata was removed from the interface.

## Foreground wand

Render the wand on a transparent foreground canvas above all text, while retaining the original scene rendering for its lighting and shadows. The foreground canvas ignores pointer events so the bottom spell buttons remain clickable.

## Margin lettering

Both maker details and arrival announcements use transparent script lettering in the blank right margin below the compass. Reserve separate upper and lower areas so they can coexist without covering architecture or each other. Remove all background fills, frames, and HTML activity notices; only spell triggers remain visible HUD elements. Keep source descriptions brief and measure wrapped lettering before drawing it into each margin.
