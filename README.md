# The Marauder’s Map

An original Hogwarts-inspired parchment scene built with Next.js 16, Three.js WebGPURenderer, TSL, Lettra, XYZ, and Susano. Five accordion panels unfold themselves; individual drawings, words, and footprints bloom through an organic ink field.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000. Choose a spell on the folded cover, read its response, then click a paper edge to unfold. Drag to pan, scroll or pinch to zoom (1–2×), tap the key near the North Tower to discover a passage, and tap **Mischief managed** to erase and close it. Choose a spell and pull an edge to reopen. Tab reveals equivalent keyboard controls; Enter activates them.

The scene is silent. The complete animation plays regardless of system motion preferences. Rendering pauses in hidden tabs.

## Inspection and verification

- `?debug=true`: lazy-loaded XYZ/Tweakpane controls for manual fold/reveal, absorption noise, lighting, and replay.
- `?renderer=webgl`: exercise Three.js’s WebGL2 backend with the same scene.
- `.map-host[data-fps]`: approximate submitted-frame rate over the last two seconds; not a GPU timing benchmark.

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

The eight tests protect cinematic transitions, rapid command guards, replay, cover transitions, and exact ink-reveal endpoints. Assets and GPU resources belong to the scene; disposal also covers a setup aborted during loading or shader compilation. Asset errors present a static SVG map and a retry action.

## Artwork and SDF preparation

The supplied `magic_map_pack` sources and layout metadata live in `public/map/artwork/`. Architecture, cover, ornaments, footprints and banner masks use 31 single-channel SDF textures in `public/map/sdf/`. Text continues to use Lettra MSDF. Banner color is sampled separately from its silhouette and outline fields.

The bake rasterizes every original SVG path together, preserving overlapping shapes and even-odd holes, then computes signed Euclidean distance from coverage. Fields use distance range 8, 16 pixels of padding, and up to 4096 pixels per dimension. The manifest preserves viewBoxes and padded UV rectangles. TSL reconstructs coverage with derivative-based antialiasing before the shared center-out ink reveal. Final readability remains bounded by the map composition texture resolution.

To regenerate the committed fields and static fallback:

```sh
python3 -m venv .context/sdf-venv
.context/sdf-venv/bin/pip install -r scripts/sdf-requirements.txt
npm run bake:art
npm run test:sdf
```

`SDF_PYTHON` can select another Python interpreter for baking. The two SDF tests protect holes, signs, subpixel coverage and saturation. All 31 generated field thresholds were also compared against source raster coverage with identical inside/outside results. Atlas cropper preparation remains with the user; no cropper export is required by this integration. Legacy sprite assets remain available but are no longer loaded by the scene.

## Fonts

Tangerine script and Cinzel headings are self-hosted with their SIL Open Font Licenses in `public/map/fonts/`. Their committed PNG/JSON MSDF atlases were baked at size 64 and distance range 8 with Lettra’s bundled CLI. To rebake, install Python `fonttools`, then run `npm run bake:fonts`. The baker reports kerning counts; the atlases preserve each face’s font metrics.

## Rendering architecture

`lib/map/data.ts` contains artwork placement, reveal timing, hotspots, and character routes. `ink.ts` supplies the shared TSL absorption field and Lettra effect. `experience.ts` owns the paper rig, offscreen composition, input, and render loop. Static map ink is cached at 4096 × 2048 desktop / 2048 × 1024 mobile, while 80 pooled prints and four character labels remain live. Explicit render-target Y normalization keeps the map upright on WebGPU and WebGL2.

Implementation plan: [.codex/plans/marauders-map.md](.codex/plans/marauders-map.md).

### Deliberate opening
The folded cover offers two spells. **Reveal your secrets** shows a shortened film mockery; **I solemnly swear that I am up to no good** shows the welcome. Either remains on the closed paper until a left or right edge is clicked. Keyboard equivalents are available with Tab. Closing resets this choice. Outer flaps fold first, then inner pairs take separate turns beneath the cover, with distinct stack depths.

### Verification record
Checked in Chrome on an Apple M4 Pro MacBook Pro (24 GB RAM): desktop WebGPU, 390 × 844 viewport with WebGL2, both spell responses, left/right edge opening, close/reopen, intermediate hinge poses, resizing, and reduced-motion passage discovery. The earlier desktop WebGPU run submitted approximately 144 frames/sec at a 2048 × 978 viewport. This is not a physical mobile-device benchmark. Typechecking, linting, eight focused state tests and two SDF tests, and the production build pass.

Typography follows the cover concept: uppercase Cinzel titles on the folded cover and Tangerine Bold for every inscription on the unfolded map and supporting text. Tangerine’s local file comes from the [Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/tangerine), with its OFL license retained.

Character names sit on original curled parchment banners and follow the same ink reveal/erase as their lettering. On closing, the current cover inscription remains throughout folding, then erases before the initial spell choices bloom back in.

### Supplied artwork verification
The supplied pack was integrated on the local `main` checkout after a fast-forward merge of the previous scene. The plan is [.codex/plans/artwork-sdf.md](.codex/plans/artwork-sdf.md). Browser checks in desktop WebGPU and a 390 × 844 WebGL2 viewport cover the new cover, corridor routes, layered banners, discoverable passage and close/reopen; the renderer uses the same SDF decoding on WebGPU and WebGL2.

Submitted-frame sampling for the supplied pack: approximately 144 fps desktop WebGPU and 28.8 fps WebGL2 at the emulated mobile viewport on the same Mac. This is not GPU timing or a physical-device benchmark; mobile overview details require zoom.

### Paper relief and banner fitting
Registered web height and OpenGL full normal textures from the supplied relief pack are loaded as non-color data. Five 64 × 128 panel grids sample continuous sheet coordinates; front, back and perimeter receive matching vertex displacement. The 0.14-unit height range follows the supplied scale for a 7-unit-tall sheet. Relief fades to zero before the panels stack. The image-loader workflow deliberately uses the supplied 8-bit web height, not the 16-bit precision master.

Character banners now measure actual Tangerine glyph layout rather than assigning width by character count. Height preserves the existing safe baseline area; width uses the fitted name plus 0.42 world units of allowance, and the safe-text rectangle still bounds lettering. Hermione’s width falls from 2.6 to approximately 1.22 units.
