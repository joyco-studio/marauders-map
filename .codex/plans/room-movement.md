# Keep makers and footsteps together inside rooms

The follow-up fixes must preserve the eight-person render cap and full entrance/exit lifecycle. Work stays on the current continuation branch; the earlier PR has merged.

1. Remove independent banner offsets. Anchor each tag directly above its actor position, using that same position for footsteps, entrances, and exits.
2. Give every configured person a distinct interior objective in each room. Extend corridor routes through each doorway to that objective, and retrace the route on return without snapping to the home doorway.
3. Resume continuous fictional roaming whenever an eligible person's activity queue is empty, including with a configured token. Finish the current loop before beginning newly fetched activity so updates cannot teleport a person.
4. Add focused movement regressions for room bounds, unique objectives, continuity, idle loops, and activity arriving during roaming. Run tests, typechecking, linting, and the production build. Browser verification remains deferred as requested.

## Completed implementation and verification

Independent banner offsets have been removed. Tags follow the presented actor position directly above its animated footprint trail. All twenty prints per person form the fading trail; no permanent or stationary pair is displayed. All 280 pooled meshes remain excluded from static snapshots.

Each configured person reserves a unique interior grid position in every room, inset from its walls. The circular Observatory uses an additional inset. Routes walk out of the home interior through its doorway, follow the corridor graph, and enter the destination before reaching the reserved objective. Return paths retrace the outbound points, so there is no doorway-to-interior snap.

Eligible people roam continuously when their activity queue is empty in both activity and missing-token modes. Fresh activity waits for the current loop to return home; idle movement emits no provider event or arrival announcement. Source cards and README now describe this behavior.

All 54 offline tests pass, including room bounds and objective separation, doorway entry and interior pauses, ongoing ecosystem and JOYCO roaming, updates during roaming, movement continuity under the render cap, and the existing full appearance lifecycle. Typechecking, linting, production build, and diff whitespace checks pass. Browser verification remains deferred at the user's request. No PR or deployment was opened for this continuation.

## User clarification

The user confirmed the corrected tag alignment but rejected permanently anchored footsteps. The stationary pair has been removed and all twenty pooled prints restored to the existing alternating, appearing and fading trail. Room objectives, continuous idle roaming, and full actor entrance/exit animations remain intact. This focused rendering correction is verified with typechecking, linting, and code inspection; no additional tests are justified.
