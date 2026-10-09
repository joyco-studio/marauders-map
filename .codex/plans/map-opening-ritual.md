# Map opening ritual

The folded parchment is the initial interactive surface. Keep the oath in the bottom HUD, appearing when the parchment is hovered, and remove the Snape response entirely.

1. Commit and push the existing interaction and margin changes before starting the new flow. Completed in commit `3a9a053` on `origin/main`.
2. Replace the mockery/welcome choice with a single welcome ritual. A click on the folded map plays a short wand enchantment before the welcoming inscription appears.
3. Reveal the oath in the bottom HUD only while the initial map is hovered, with an equivalent keyboard control.
4. A subsequent pointer down anywhere on the welcomed parchment opens the map and plays a quick wand swipe. Block reopening during the enchantment itself.
5. Update relevant state and trigger tests, run typechecking and linting, then commit and push the completed flow.

## Verification

Typechecking, ESLint, whitespace checks, and 11 focused state/trigger tests pass. Tests cover blocking commands during the 0.9-second enchantment, waiting for a separate opening press, revealing the normal map, and resetting the ritual after closing. The opening swipe lasts 0.45 seconds. Visual browser verification remains unavailable in this session.
