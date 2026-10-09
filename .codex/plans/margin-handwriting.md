# Margin handwriting and cover introduction

Restore the introductory copy above the folded parchment so it cannot collide with the castle illustration. Keep maker and arrival inscriptions in their existing blank paper margins.

1. Remove the introduction from the cover texture and restore its viewport overlay above the map.
2. Animate margin lettering line by line with a moving left-to-right writing front. Animate removal with a left-to-right erasure before replacement text begins.
3. Preserve in-progress animation across repeated activity updates and only enable inscription actions once their lettering is revealed.
4. Check types, lint, and inspect the animation lifecycle and layout boundaries.

## Verification

Typechecking, ESLint, and whitespace checks pass. Focused code inspection confirms that repeated clock updates preserve writing progress, replacement text waits for exit, partially written rows retain their reveal amount during dismissal, and links become clickable only after their line finishes writing. Visual browser verification remains unavailable in this session.
