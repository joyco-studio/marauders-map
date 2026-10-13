# Fix classroom routes and reveal a passage visitor

Shared navigation polylines will drive both actor movement and a debug overlay. Classroom objectives will use clear floor space and reach the main doorway through the two internal doors instead of crossing the central partition.

1. Export corridor geometry, room access paths, and the secret passage centerline. Use these paths for activity, returns, and idle roaming.
2. Add a disabled-by-default “Show available paths” debug toggle, rendering lines and node markers outside static snapshots. Show passage geometry only after discovery.
3. Reveal one fully hidden roster member at the passage midpoint. Animate entrance before walking through the passage to a random room; continue roaming from that room as a temporary base.
4. Preserve real activity queues and eligibility separately from discovery visibility. Give the visitor one reserved extra presentation slot, with no fabricated activity announcements. Reset restores normal behavior.
5. Verify geometry, continuity, discovery/reset, queues, and presentation limits with focused regression tests, typechecking, linting, and browser inspection. Save visual evidence under `.context/`.

The visitor is an existing maker, remains until reset, and does not make the passage a shortcut for ordinary movement.

## Completed implementation

Navigation now lives in `lib/activity/navigation.ts`, including corridor links, classroom access branches, safe objectives, and the passage centerline. The debug overlay draws this geometry in teal, with revealed passage access in orange, and is excluded from static snapshots. Overlay GPU resources are created only with `?debug=true`.

Discovery selects a fully hidden maker from the existing actor pool, reserves an extra presentation slot, waits for the entrance animation, and walks from the passage midpoint through the library's east doorway. The destination becomes a temporary roaming base. Activity eligibility remains independent, and real activity waits for the passage walk. Only interrupted outbound activity is requeued; completed arrivals are not replayed. The visitor remains selectable through canvas hit-testing and accessible roster controls. Reset clears discovery visibility and the temporary base.

## Verification results

- All 34 focused navigation, journey, and presentation tests pass. Geometry checks sample all classroom access segments against solid partitions and furniture; continuity, passage midpoint/exit, queued activity, eligibility, reset, and the extra presentation slot are covered.
- Typechecking, linting, production build, and diff whitespace checks pass.
- A full-suite run found six existing collector failures caused by fixed counts for an older roster. The collector, its tests, roster, normalizer, and activity types are unchanged. These unrelated failures were not modified.
- Chrome verification confirmed doorway routing, passage reveal and visitor movement, persistent selection of an inactive visitor, immediate overlay toggling after caching, zoom alignment, and Replay cleanup. No new browser errors were observed.
- Visual evidence: `.context/navigation-passage.jpg` and `.context/passage-visitor-spawn.jpg`.
