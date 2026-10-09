# Continuous wand tracking across folds

The per-panel inset clamps introduce a dead strip at shared seams. Use complete panel extents for the closest surface target, then damp that target before tip/handle solving. Retain shaft clearance and camera-ray lift. Add a focused geometric regression test for a shared seam and rotated panels; run typecheck, lint and the targeted test.

## Result

Removed the internal panel inset and added exponential target tracking at 16/s before tip solving. Typecheck, lint, whitespace checks and all ten state/geometry tests passed. Shared-edge regression includes the current 1.18 sheet scale; a rotated-panel case verifies finite bounded coordinates.
