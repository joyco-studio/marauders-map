# Status message queue

Preserve every arrival in a FIFO queue, including bursts delivered during one render. Keep status inscriptions separate from the selected maker's details.

1. Replace the single arrival and replacement timer with a collection of pending arrivals, consumed only after they are handed to the map's status queue.
2. Add a queue that waits for handwriting to finish, holds the fully written message for at least three seconds, and waits for its exit to finish before starting the next message.
3. Queue source-status messages through the same path and keep the accessible announcement synchronized with the displayed message.
4. Verify burst order, minimum hold time, duplicate handling, and exit sequencing with focused timing tests; run typechecking and linting.

## Verification

Typechecking, ESLint, whitespace checks, and three focused queue tests pass. The tests cover simultaneous arrivals, a minimum three-second hold after writing, waiting for exit completion, independent hold times for subsequent messages, and duplicate pending messages. Queue timing pauses outside exploration and while the renderer is paused, so closed or hidden map time does not consume the reading interval.
