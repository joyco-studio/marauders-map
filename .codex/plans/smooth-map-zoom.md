# Smooth map zoom and closing

Use soft easing without bounce for wheel, pinch, and button zoom. Return a zoomed or panned camera to the centered full map over 0.6 seconds before erasing ink and folding.

## Implementation

1. Separate displayed and target views. Animate with frame-rate-independent damping (`1 - exp(-14 * dt)`) in the existing render loop, retaining 1×–2× limits and input sensitivity.
2. Ease recentering at 1× and for Reset view. Keep dragging immediate and calculate movement from displayed zoom.
3. Add a `returning` phase and an optional close-transition return flag. Capture the displayed camera and interpolate to its default view with smoothstep over 0.6 seconds.
4. Keep the map open, ink and people visible, and desk position unchanged during return. Disable exploration, release pointers, and ignore repeated close requests. Play the closure voice once at the request.
5. Finish at the exact default camera before the existing erase/fold sequence. Skip return when already centered at 1×. Reset displayed and target views on reopening and replay.
6. Announce “The map is returning to its full view” through the existing accessible status. Preserve control signatures and avoid new animation dependencies.

## Verification

Add focused regression tests for return-before-erase ordering, closing at the default view, and repeated close requests. Run focused tests, typechecking, and linting. Check zoom inputs, direction changes, Reset view, and closing during zoom in a browser where available.

## Results

Implemented target-based zoom damping and the explicit 0.6-second return phase. Camera state is reset exactly before erasing and on replay/reopening. Phase deadlines compare absolute timestamps to avoid floating-point subtraction delaying a boundary.

All 15 focused state/trigger tests pass, including returning-phase trigger exclusion, immediate default-view closing, uninterrupted closing, and elapsed-time preservation. Typechecking, ESLint, and whitespace checks pass. Chrome checks cover wheel and keyboard zoom, rapid direction changes, drag panning, Reset view, and closing during zoom; the returning frame retains ink and people and finishes folded. Reopening restores the full view, and closing that default view enters erasing immediately. Screenshot: `.context/smooth-map-return.png`. Two-finger pinch cannot be driven by the connected browser controls; its shared zoom path was inspected but was not manually exercised.
