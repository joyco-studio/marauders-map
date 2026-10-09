# Complete actor entrances and exits

The user reported repeated entrances on opening, faded people, and abrupt position changes. Preserve the rebased map geometry and controls, and keep the eight-person limit.

1. Give pooled actors a presentation lifecycle independent of map phases and activity scheduling. Finish every entrance and exit before changing direction, reserve slots during exits, and relocate only while fully hidden.
2. Reveal actors once during the parchment reveal, keep full ink opacity regardless of event age, and retain a banner offset throughout each appearance instead of recomputing it every frame.
3. Verify lifecycle interruptions, unexpected position jumps, and the render cap with offline tests. Run all existing tests, typechecking, linting, and a production build, then push the rebased branch with the authorized force-with-lease.

Browser verification remains deferred at the user's request.

## Completed implementation

The map no longer resets actor reveal progress when exploration starts. Every appearance uses a 0.7-second entrance and exit; interrupted entrances finish before exiting, and exit requests cannot reverse until fully hidden. Exiting actors retain their render slots, keeping the visible pool at eight or fewer. Each appearance retains its banner offset, and unexpected movement beyond corridor walking speed exits at the old position before entering at the current position. Activity age no longer reduces ink opacity. Closing fades existing footsteps along with their actor rather than immediately removing them.

The branch was rebased onto `origin/main` with geometry, desk, corner-fold, interaction feedback, and expanded map tests preserved. Offline lifecycle regression tests, existing tests, typechecking, linting, and a production build pass. Browser verification remains deferred.
