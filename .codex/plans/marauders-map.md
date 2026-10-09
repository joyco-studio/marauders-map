# Immersive Marauder’s Map

## Summary
Replace the starter with aged parchment that unfolds on command, reveals a Hogwarts-inspired map through spreading ink, and supports exploration before folding closed. Use Three.js, TSL, Lettra, existing XYZ, and Susano. Prepare the original footprint and ornament atlas using JOYCO Atlas. Follow the film-inspired reference at https://harrypotter.fandom.com/wiki/Marauder%27s_Map.

## Experience
1. Begin folded with an ornate cover. Load and warm resources, then wait for a spell choice. “Reveal your secrets” shows the mockery excerpt; “I solemnly swear that I am up to no good” shows the welcome. Keep either message visible indefinitely until a paper edge is clicked, then unfold over four seconds with an overhead camera approach.
2. Reveal architecture, labels, and characters over three seconds. Every figure, text block, and footprint expands organically from its own center.
3. Include the Great Hall, library, courtyard, staircases, classrooms, and one secret passage. Harry, Hermione, Ron, and Filch walk predefined routes with alternating, fading footprints.
4. Support drag/pan, wheel/pinch zoom up to 2×, and click/tap passage discovery. Actions belong on the parchment and have keyboard-accessible equivalents.
5. “Mischief managed” erases ink over one second and reverses the folds over three seconds. Reopening resets routes, discoveries, and reveals.

## Implementation
Use an asynchronously initialized WebGPURenderer with WebGL2 fallback and TSL node materials. Build five connected accordion panels with hierarchical hinges, alternating folds, staggered timing, thickness offsets, subdivided curl, worn creases, front/back textures, edges, warm lighting, and self-shadowing.

Compose original artwork, Lettra text, and pooled footprints into a transparent offscreen map texture. Apply continuous sheet coordinates across panels so ink remains attached during folding. Desktop resolution is 4096 × 2048; mobile is 2048 × 1024. Cache static artwork and bound zoom to protect readability.

Bake Tangerine and Cinzel MSDF fonts with Lettra’s CLI, distance range 8, preserving licenses. Share a TSL radial absorption field across drawings and text, with seeded noise, feathered fronts, a dark wet rim, slight bleeding, and exact hidden/revealed endpoints. Store sprite bounds and reveal centers in the atlas manifest.

Load images and metrics through Susano, explicitly track required failures, and construct GPU resources once in a scene-owned registry (postprocessed results are not cached by Susano). Use XYZ Disposer for ordered cleanup, edge for phase callbacks, and Warmup for the composition and paper scenes. Prewarm footprint resources. Lazy-load XYZ/Tweakpane tuning on ?debug=true for folds, reveal, noise, lighting, and reset.

Represent loading, opening, revealing, exploring, erasing, closing, folded, and error as explicit phases. One clock drives animation; phase gates exploration and duplicate commands. Internal types cover panels, elements, reveal schedules, routes, and hotspots. No backend/public API.

## Resilience and validation
All motion preferences receive the same complete folding, camera, ink, and roaming animations. Provide textual description, keyboard actions, required-asset retry, and static fallback on renderer failure. Pause hidden tabs, cap pixel ratio, pool footprints, and dispose render targets and shared atlases.

Run typechecking, linting, production build, and browser inspection on desktop/mobile and both renderer backends. Inspect seams, ink attachment, radial reveals, passage discovery, repeated close/reopen, resize, motion-preference independence, and teardown. Focused tests protect phase transitions and reveal endpoints. Target 60 fps desktop/30 fps mobile and document the measured device.

## Defaults
Silent, one original map. No multiple floors, voice activation, or fluid simulation. Retain branch name. Libraries: https://hub.joyco.studio/toolbox/xyz, https://hub.joyco.studio/toolbox/susano, https://hub.joyco.studio/toolbox/atlas. Design palette: charcoal #151714, parchment #ddc89c, sepia #593724, faded ink #987650, edge brown #9c713d. Typography: uppercase Cinzel titles, Tangerine script. Composition: centered map with quiet backdrop, all visible actions on paper.

## Implementation notes
The user owns the Atlas cropper step. The runtime ships a local original sprite atlas plus pixel-space manifest so their export can replace it. The authoring UI’s upload permission was unavailable; no browser extension settings were changed.

The composition textures explicitly normalize render-target Y orientation on both WebGPU and WebGL2. XYZ warmup runs with each scene’s actual destination bound. Curved faces are joined only by perimeter strips to avoid thickness geometry intersecting the paper. Static map drawings are cached; characters and footprints stay live. Verification routes: `?renderer=webgl` and `?debug=true`. The former `?motion=reduced` flag has no effect.

Fold correction: outer leaves fold above inner leaves first; each inner pair then folds under the center cover in its own turn. Four distinct stack depths and exact half-turn hinges prevent closed panels sharing a plane. Blank-space clicks never open the map. Both spell choices and the edge opening have keyboard equivalents.

The backdrop sits below the entire hinge sweep, preventing folding leaves from passing through the shadow receiver. Both renderer backends require the same explicit render-target Y normalization in the current Three.js version.

Verified deliberate opening on desktop WebGPU and mobile-sized WebGL2; both spells remain folded until edge activation, and close/reopen restores the choice. Inspected intermediate fold poses with development controls. Reduced-motion opening and passage discovery remain functional. Seven tests, typechecking, linting, and production build pass.

## Typography revision
Use uppercase Cinzel for titles and Tangerine Bold for all remaining text, following the attached cover concept. Self-host the Google Fonts files and licenses, bake Tangerine into a local MSDF atlas, enlarge script to compensate for its lower x-height, and apply the pair to the cover, open map, loader, controls, and static fallback. Validate with typechecking, linting, a production build, and browser inspection; no new behavior tests are needed for this typography change.

## Character and cover refinement
Add original curled parchment banners behind the moving names, sized to two-line Tangerine labels and sharing their reveal/erase schedule. Keep banners out of static snapshots and attach them through sheet composition. Reserve uppercase Cinzel for the closed cover; every open-map inscription uses Tangerine, including the static fallback. Preserve the welcome or mockery while folding closed, then erase it and bloom the initial choices through a timed cover transition. Verify transition endpoints with a focused test and inspect the scene in the browser.

The banner composition and all-Tangerine open map were inspected in Chrome. The close/reopen cycle completes and the cover blend has focused erase/reveal endpoint tests. Typechecking, linting, nine tests, and the production build pass.

## Motion policy revision
The user explicitly requests the same complete experience for every motion preference. Remove system/query reduced-motion branches, instantaneous phase and cover transitions, disabled roaming and wand animation, and the CSS override. Keep the normal cinematic timings and hidden-tab pause. Update existing transition tests and documentation, then verify typechecking, linting, production build, and the formerly reduced query in the browser. This supersedes earlier reduced-motion requirements and verification notes.

Verified that `?motion=reduced` starts folded and proceeds through the ordinary opening phase. Typechecking, linting, eight tests, and the production build pass.
