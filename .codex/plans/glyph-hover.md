# Staggered glyph hover

Make interactive lettering visibly float while preserving the existing handwriting entrances and exits.

1. Split HUD spell lettering into individual glyphs grouped by words so wrapping remains natural. Float each glyph with a staggered phase while the map is hovered or the close spell is hovered/focused.
2. Apply the same per-glyph motion to the map inscription's hovered action lettering, leaving passive status text still.
3. Keep reduced-motion behavior and run typechecking, linting, and focused code inspection.

## Verification

Typechecking, ESLint, and whitespace checks pass. Inspection confirms word-level wrapping remains intact, hover targets stay fixed while glyphs float, passive status text remains still, and reduced-motion preferences disable floating. Visual browser verification remains unavailable.
