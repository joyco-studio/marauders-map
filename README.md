# The Marauder’s Map

An original Hogwarts-inspired parchment scene built with Next.js 16, Three.js WebGPURenderer, TSL, Lettra, XYZ, and Susano. Five accordion panels unfold themselves; individual drawings, words, and footprints bloom through an organic ink field.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000. Choose a spell on the folded cover, read its response, then click a paper edge to unfold. Drag to pan, scroll or pinch to zoom (1–2×), tap the key near the North Tower to discover a passage, and tap **Mischief managed** to erase and close it. Choose a spell and pull an edge to reopen. Tab reveals equivalent keyboard controls; Enter activates them.

The scene is silent. System reduced-motion settings skip cinematic animation and roaming characters. Rendering pauses in hidden tabs. Reduced motion uses demand-driven GPU rendering.

## Inspection and verification

- `?debug=true`: lazy-loaded XYZ/Tweakpane controls for manual fold/reveal, absorption noise, lighting, and replay.
- `?renderer=webgl`: exercise Three.js’s WebGL2 backend with the same scene.
- `?motion=reduced`: exercise the reduced-motion experience without changing OS settings.
- `.map-host[data-fps]`: approximate submitted-frame rate over the last two seconds; not a GPU timing benchmark.

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

The nine tests protect cinematic transitions, rapid command guards, replay, reduced motion, and exact ink-reveal endpoints. Assets and GPU resources belong to the scene; disposal also covers a setup aborted during loading or shader compilation. Asset errors present a static SVG map and a retry action.

## Artwork and Atlas handoff

All architectural drawings, parchment texture, footprints, and ornaments are original local assets in `public/map/`. The prepared sprite sheet is `public/map/sprites/atlas.png`, with editable source `source.svg`. Atlas cropper preparation belongs to the user.

Use [JOYCO Atlas](https://atlas.joyco.studio) to crop/pack the four sprite regions, then replace the PNG and `atlas.json`. Keep these keys:

```json
{
  "size": [512, 128],
  "sprites": {
    "left": { "bounds": [0, 0, 128, 128], "center": [64, 64] },
    "right": { "bounds": [128, 0, 128, 128], "center": [64, 64] },
    "compass": { "bounds": [256, 0, 128, 128], "center": [64, 64] },
    "key": { "bounds": [384, 0, 128, 128], "center": [64, 64] }
  }
}
```

`size` is the packed image’s pixel dimensions. `bounds` is `[x, y, width, height]` from its top-left corner. `center` is the reveal origin in pixels within the crop. Preserve generous transparent padding for feathered ink edges. Atlas’s exported configuration may need converting to this small runtime manifest; the renderer does not depend on its authoring format.

Regenerate original artwork with `python3 scripts/prepare-map.py` (requires Pillow). Rasterize the generated sprite source with `node scripts/rasterize-atlas.mjs`. These commands overwrite local generated assets, so keep a user-supplied Atlas export separately.

## Fonts

Tangerine script and Cinzel headings are self-hosted with their SIL Open Font Licenses in `public/map/fonts/`. Their committed PNG/JSON MSDF atlases were baked at size 64 and distance range 8 with Lettra’s bundled CLI. To rebake, install Python `fonttools`, then run `npm run bake:fonts`. The baker reports kerning counts; the atlases preserve each face’s font metrics.

## Rendering architecture

`lib/map/data.ts` contains artwork placement, reveal timing, hotspots, and character routes. `ink.ts` supplies the shared TSL absorption field and Lettra effect. `experience.ts` owns the paper rig, offscreen composition, input, and render loop. Static map ink is cached at 4096 × 2048 desktop / 2048 × 1024 mobile, while 80 pooled prints and four character labels remain live. Explicit render-target Y normalization keeps the map upright on WebGPU and WebGL2.

Implementation plan: [.codex/plans/marauders-map.md](.codex/plans/marauders-map.md).

### Deliberate opening
The folded cover offers two spells. **Reveal your secrets** shows a shortened film mockery; **I solemnly swear that I am up to no good** shows the welcome. Either remains on the closed paper until a left or right edge is clicked. Keyboard equivalents are available with Tab. Closing resets this choice. Outer flaps fold first, then inner pairs take separate turns beneath the cover, with distinct stack depths.

### Verification record
Checked in Chrome on an Apple M4 Pro MacBook Pro (24 GB RAM): desktop WebGPU, 390 × 844 viewport with WebGL2, both spell responses, left/right edge opening, close/reopen, intermediate hinge poses, resizing, and reduced-motion passage discovery. The earlier desktop WebGPU run submitted approximately 144 frames/sec at a 2048 × 978 viewport. This is not a physical mobile-device benchmark. Typechecking, linting, seven focused tests, and the production build pass.

Typography follows the cover concept: uppercase Cinzel titles on the folded cover and Tangerine Bold for every inscription on the unfolded map and supporting text. Tangerine’s local file comes from the [Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/tangerine), with its OFL license retained.

Character names sit on original curled parchment banners and follow the same ink reveal/erase as their lettering. On closing, the current cover inscription remains throughout folding, then erases before the initial spell choices bloom back in. Reduced motion replaces the inscription immediately.
