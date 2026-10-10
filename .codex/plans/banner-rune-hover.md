# Golden rune hover

Use the existing Lettra MSDF glyphs to illuminate names in pale gold and render a soft amber distance-field halo behind their letters. Preserve banner/text draw ordering so foreground paper continues to occlude names beneath it.

1. Add per-name glow uniforms and shared glyph geometry for the halo; keep resource ownership in the scene disposer.
2. Resolve the hovered actor against the map each frame, fading glow in and out and clearing it while dragging or leaving exploration.
3. Validate types, lint, production compilation, and the visible hover in Chrome.

Implemented warm gold lettering, an amber MSDF halo, a gentle brightness pulse, and smooth hover transitions. Typecheck, lint, and production compilation pass; the map loads and name illumination is visible in Chrome.

## Contrast and deployment correction

Keep hovered glyph cores dark brown for legibility on pale parchment; put the golden illumination only in the softer outer halo. Include the living-banner adapter, vendored helper and type declarations, metadata, artwork, motion mask, and voice assets in Git before pushing the deployment fix. Validate the production build and tracked runtime asset completeness.

## Beth Ellen and fire-orange revision

Bake Beth Ellen locally with its Google Fonts OFL license and load its metrics and MSDF atlas through the existing scene registry. Apply it only to person name tags, retaining proportional banner fitting. On hover, transition the complete glyph fill to vivid fire orange, with a brighter soft orange distance-field halo; remove the dark-core styling.
