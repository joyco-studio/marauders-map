# The Makers’ Map

An enchanted atlas of the creative web built with Next.js 16, Three.js WebGPURenderer, TSL, Lettra, XYZ, and Susano. Five accordion panels unfold themselves; individual drawings, words, and footprints bloom through an organic ink field.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000. Choose a spell on the folded cover, read its response, then click a paper edge to unfold. Drag to pan, scroll or pinch to zoom (1–2×), tap the key near the The Observatory to discover a passage, and tap **Enough experimenting. For now.** to erase and close it. Choose a spell and pull an edge to reopen. Tab reveals equivalent keyboard controls; Enter activates them.

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

The focused tests protect public-feed normalization, cache and credential failures, deterministic journeys, eligibility, and cinematic transitions, rapid command guards, replay, cover transitions, and exact ink-reveal endpoints. Assets and GPU resources belong to the scene; disposal also covers a setup aborted during loading or shader compilation. Asset errors present a static SVG map and a retry action.

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

Tangerine script and Cinzel headings are self-hosted with their SIL Open Font Licenses in `public/map/fonts/`. Their committed PNG/JSON MSDF atlases were baked at size 64 and distance range 8 with Lettra’s bundled CLI and `scripts/map-charset.txt`, including the cast’s accented names and approved punctuation. To rebake, install Python `fonttools`, then run `npm run bake:fonts`. The baker reports kerning counts; the atlases preserve each face’s font metrics.

## Rendering architecture

`lib/map/data.ts` contains artwork placement, reveal timing and hotspots. `lib/activity/roster.ts` holds the explicit cast, and `journeys.ts` owns corridor routing and queued movement. `ink.ts` supplies the shared TSL absorption field and Lettra effect. `experience.ts` owns the paper rig, offscreen composition, input, and render loop. Static map ink is cached at 4096 × 2048 desktop / 2048 × 1024 mobile, while 280 pooled prints and fourteen preallocated community banners remain live. Ineligible JOYCO actors stay hidden. Explicit render-target Y normalization keeps the map upright on WebGPU and WebGL2.

Implementation plan: [.codex/plans/marauders-map.md](.codex/plans/marauders-map.md).

### Deliberate opening
Hovering the folded parchment reveals **I solemnly swear that I am up to no good** in the bottom HUD. Clicking anywhere on the paper casts a short wand enchantment, then reveals the welcome. A separate pointer down anywhere on the welcomed paper plays a quick wand swipe and unfolds the map. Keyboard equivalents are available with Tab. Closing resets the ritual. Outer flaps fold first, then inner pairs take separate turns beneath the cover, with distinct stack depths.

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

## Public ecosystem activity

The Makers’ Map follows recent public work from seven ecosystem makers and seven explicitly configured JOYCO team members. GitHub code visits The Source Library, opened/reopened proposals and releases visit The Commons, conversations visit The Playground, and Akella’s published YouTube lessons visit The Shader Atelier. These destinations are imaginative interpretations: “Real public activity, imagined as journeys.” Selecting a banner or using the keyboard roster shows the actual event, repository, absolute publication time, relative age and original provider link. Escape closes the card and restores focus.

GitHub collection **requires a user-supplied, server-only `GITHUB_TOKEN`**. Add the token to an untracked `.env.local` for development, then restart the dev server. Configure the same variable in the hosting environment when deploying. Do not prefix it with `NEXT_PUBLIC_`, commit it, or give it private repository or organization membership permissions. A fine-grained personal access token with public read-only access is sufficient. Token creation and deployment are outside this implementation.

Without valid credentials, GitHub sources report unavailable; the map and independent YouTube feed remain functional. If no token is configured, ecosystem makers roam randomly along the corridors, as an explicitly fictional fallback. Real YouTube uploads still stage activity journeys. Cards and notices explain that random roaming is unrelated to public activity or online presence. Invalid configured credentials retain the activity mode and do not silently switch to wandering. There is no unauthenticated fallback and visitors never sign in. The read-only `/api/activity` route accepts no handles or arbitrary URLs. It fetches only the configured fourteen public GitHub Events feeds (at most 100 entries each) and Akella’s public Atom feed, using channel `UCDo7RTzizoOdPjY8A-xDR7g`. No paid data source, database, cron, realtime hosting, YouTube API project, scraping, or embedded video player is required. Existing app hosting and bandwidth costs are separate.

Supported GitHub events are pushes, opened/reopened pull requests, created issue/review comments and reviews, opened issues, and published releases. Push payloads without commit detail use a truthful repository-level description and link. Stars, forks, deletes and other unsupported actions are ignored. YouTube uses video IDs and Atom `published`, never `updated`, so metadata edits do not create journeys. Malformed items are discarded independently; source text renders as text and links are restricted to HTTPS GitHub/YouTube hosts.

Successful upstream responses use Next’s server fetch cache for 30 minutes. A process-local cache deduplicates refreshes, retains last good results and honors rate-limit and retry headers; this is not persistent history or a global shared cache across deployments. Manual refresh uses the same endpoint and cannot bypass that interval. Fourteen feeds refreshed twice an hour cost approximately 28 GitHub requests per shared cache; authenticated reads generally have a 5,000 requests/hour primary allowance, shared with other token use. Secondary limits still apply. No API usage fee is introduced. [GitHub rate-limit documentation](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).

Only the last 14 days and at most ten items per person are retained, with five shown in a card. The browser fetches after scene readiness, refreshes every 30 minutes while visible, and refreshes on tab return only when due. GitHub’s public Events feed may lag 30 seconds to six hours, so this is recent public activity, with no realtime or online-presence guarantee. Feeds are a bounded window, not a complete archive. [GitHub Events documentation](https://docs.github.com/en/rest/activity/events).

Eligible actors roam continuously through room interiors whenever their activity queue is empty, including with a configured token. Each person has a distinct objective inside every room. Newly fetched activity waits for the current roaming loop to return home, keeping movement continuous. Idle roaming is fictional and never produces activity notices or source events. Tags follow the actor position directly above the animated, fading footprint trail. No permanent footsteps are displayed while standing still. The simultaneous canvas limit defaults to **eight people**, configured by `MAX_RENDERED_PEOPLE` in `lib/activity/roster.ts`. Ongoing real journeys retain their slots; waiting events rotate into free slots without being discarded or advancing offscreen. All eligible profiles remain available through the keyboard roster. All fourteen actors and their 280 prints remain pooled; the cap controls rendering and movement, not GPU allocation. JOYCO actors appear only with qualifying public GitHub activity inside the 14-day window. Last known eligibility survives a temporary failure until that event expires. An expired actor finishes its current journey, then hides; selection and roster eligibility end immediately. Public inactivity says nothing about private work. Runtime never discovers members, fetches private activity or ranks people.

Each person stages their newest initial event, staggered in roster order. Later unseen IDs queue in publication order, keeping the newest three. Movement follows deterministic corridor paths, pauses six seconds at arrival and returns home. Closing clears prints and pauses journeys; reopening resumes them after reveal. Hidden tabs and manual debug mode pause simulation. Reloading intentionally permits recent journeys to replay. The hidden passage leads to The Rabbit Hole; a playable experiment there remains deferred.

The map uses a single welcome ritual; the Snape response and blank-map branch have been removed. No network failure blocks parchment exploration. Scene-owned resource disposal and shader warmup are retained using [JOYCO XYZ](https://hub.joyco.studio/toolbox/xyz); expected provider failures use typed outcomes following [Return, Don’t Throw](https://hub.joyco.studio/logs/17-return-dont-throw).
