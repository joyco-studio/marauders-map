# The Makers’ Map: ecosystem activity and creative-tech copy

## Summary and boundaries

Turn real public activity from a curated group of Three.js ecosystem people and active JOYCO team members into journeys through the existing castle. GitHub events send characters to workshops and meeting places; Akella’s YouTube uploads send him to a classroom. Selecting a character reveals the actual event, publication time, and original link.

Present the experiment as **The Makers’ Map**, an enchanted gathering place for the creative web, with the reserved original phrases preserved below.

Use only data sources with no API usage fee: GitHub’s public REST API and YouTube’s public Atom feed. Do not provision paid services, a database, cron infrastructure, realtime hosting, or a YouTube API project. Existing app hosting and bandwidth are separate from source API costs. This document authorizes planning only; implementation happens later.

V1 excludes multiplayer, X, Bluesky, AI classification, notifications, embedded video playback, live-stream detection, and a time-travel UI. Keep the existing parchment artwork, fold/reveal/erase experience, wand, secret passage, rendering backends, and motion policy.

## Copy and creative-tech atmosphere

Keep the aged parchment, castle drawings, ink, footprints, wand, and cinematic interactions. Reframe the text around creative developers, discoveries, and experiments. The tone is curious, mischievous, and handmade; technical names belong mainly to destinations. This section supersedes the earlier plan’s preservation of architectural labels, but does not require new buildings or artwork geometry.

### Reserved copy: preserve verbatim

The following existing copy is explicitly reserved by the user. Do not replace it, paraphrase it, or alter its corresponding accessible announcement. Existing line breaks may remain as they are.

- “Awakening the map”
- “The castle never sleeps”
- “Gathering ink & secrets”
- “Reveal your secrets”
- “I solemnly swear that I am up to no good”
- The entire existing mockery response, including the Marauders’ names and Professor Snape reference: “Moony, Wormtail, Padfoot & Prongs send their compliments to Professor Snape ...and request he keep his abnormally large nose out of other people's business.” Preserve the current source strings and blank-map behavior rather than rewriting the response from this transcription.

The reserved spells and mockery are intentional surviving references within the new identity. Their existing actions and transition timing stay the same.

### Approved replacement copy

| Surface / current text | Exact replacement |
| --- | --- |
| Experiment title / The Marauder’s Map | The Makers’ Map |
| Hogwarts School of Witchcraft & Wizardry | A living atlas of the creative web. |
| New supporting introduction | Follow the footprints of those building it. |
| Welcome inscription after the solemn swear choice | For those who turn strange ideas into pixels. |
| Messrs. Moony, Wormtail & Padfoot & Prongs attribution outside the reserved mockery / existing Marauders map credit | For those who turn strange ideas into pixels. |
| Purveyors of Aids to Magical Mischief-Makers | Real public activity, imagined as journeys. |
| Mischief managed / close action | Enough experimenting. For now. |
| The parchment remembers. | Every experiment leaves a trace. |
| Tap the key to find a secret | Every good experiment has a rabbit hole. |
| Dissendium / discovered passage inscription | One more thing to try… |
| A passage to Honeydukes | A passage to The Rabbit Hole |

Avoid duplicating the welcome and map credit in the same view. Split the new title and welcome across readable lines that fit the current folded cover. Keep Cinzel headings on the cover and Tangerine on the unfolded map. Preserve “Pull an edge to unfold” and other clear navigation instructions.

Rename destinations consistently in visible map labels, activity routes/cards, accessible descriptions, and static fallback text: Great Hall → **The Commons**; Library → **The Source Library**; Courtyard → **The Playground**; Moving Staircases → **The Render Pipeline**; Classrooms → **The Shader Atelier**; North Tower → **The Observatory**; Honeydukes passage destination → **The Rabbit Hole**. Preserve stable internal waypoint/hotspot IDs and the existing discovery interaction. The Rabbit Hole remains a hidden passage in v1; adding a playable experiment behind it is deferred.

Use truthful event-driven arrival inscriptions: a video becomes “{name} published a new lesson.”, a pull request “{name} opened a proposal.” (use “reopened” for a reopened PR), code “{name} left fresh code in the library.”, a conversation “{name} joined the conversation.”, and a release “A new release reached the Commons.” Show exact normalized event titles and provider details in the card underneath; the playful inscription must not imply additional activity. Use “Real public activity, imagined as journeys.” as the shared explanatory line.

Apply the identity to cover/title, non-reserved welcome, loading text, map labels, activity card copy, document metadata, manifest names, static fallback descriptions, accessibility text, and README. Metadata description: “An enchanted atlas of the creative web. Follow real GitHub activity and YouTube discoveries as footprints through a living castle.” Preserve historical plan documents, repository/branch names, asset filenames, and internal identifiers. In accessible announcements, preserve the reserved phrases while replacing surrounding non-reserved references to Hogwarts and fictional roaming characters with the creative-tech destinations and actual cast. Do not change fonts, favicon artwork, rendering, or the motion policy for this copy pass.

## Proposed cast

Use these seven people as the always-visible ecosystem cast, plus the activity-gated JOYCO roster below. The following room assignments are playful interpretations, not assertions about their location or online presence.

| Person | Public sources | Castle role / home destination |
| --- | --- | --- |
| mrdoob | [GitHub](https://github.com/mrdoob) | Castle architect; The Commons |
| sunag | [GitHub](https://github.com/sunag) | Shader specialist; The Shader Atelier |
| Don McCurdy | [GitHub](https://github.com/donmccurdy) | Asset and geometry keeper; The Source Library |
| drcmda | [GitHub](https://github.com/drcmda) | React workshop visitor; The Render Pipeline |
| Yuri Artiukh / Akella | [GitHub](https://github.com/akella), [YouTube @akella_](https://www.youtube.com/@akella_) | Teacher; The Shader Atelier |
| Bruno Simon | [GitHub](https://github.com/brunosimon) | Experiment maker; The Playground |
| Lewy Blue | [GitHub](https://github.com/looeee) | Guide and author; The Source Library |

### JOYCO team additions

Add these seven JOYCO team members to the configured roster. Public GitHub activity was checked on October 9, 2026; six had supported activity inside the existing 14-day window. Santiago Rivas and Joaquín Morolla’s account identities were confirmed by the user. These observations establish candidates, not permanent eligibility: apply the activity gate on every successful refresh.

| Person | GitHub | Recent public activity observed | Home destination |
| --- | --- | --- | --- |
| Alejo Pequeño | [alejopequeno](https://github.com/alejopequeno) | October 9: pull request in `joyco-studio/lab` | The Playground |
| Fabrizio Signoretta | [fabroos](https://github.com/fabroos) | September 29–30: pushes in `joyco-studio/hub` | The Commons |
| Joyboy | [JOYBOY-0](https://github.com/JOYBOY-0) | October 7: pushes in `joyco-studio/lettra` | The Shader Atelier |
| Joaquín R. Montes | [justkahdri](https://github.com/justkahdri) | October 5–6: pushes in `joyco-studio/trazo` | The Render Pipeline |
| Matías Perez | [matiasperz](https://github.com/matiasperz) | October 7–8: pushes in `joyco-studio/gltf` | The Source Library |
| Santiago Rivas | [dmowl-ops](https://github.com/dmowl-ops) | September 28: pushes in `dmowl-ops/NYCPT` | The Playground |
| Joaquín Morolla | [jocodesing-arch](https://github.com/jocodesing-arch) | No qualifying public activity in the inspected feed; keep hidden until eligible | The Commons |

Only show a JOYCO character and roster entry when at least one normalized supported public GitHub event falls within the last 14 days. Fetch each configured person's public activity across repositories, as for the ecosystem cast. Retain the last known eligibility during a temporary upstream failure until its qualifying event ages out; then hide the character. If an event expires during a journey, finish that journey, erase the banner and footprints, and disable selection. Re-entry after fresh activity reveals the actor and stages its newest unseen event normally. Dismiss an open card if its actor becomes ineligible.

Do not discover members at runtime or require organization-read permissions. Membership was checked while preparing this plan, but runtime uses only the explicit handles and public event feeds. Exclude automation accounts such as `scrap-bot` and `github-actions[bot]`. Huilén Vilches ([huilendev](https://github.com/huilendev)) had no qualifying activity in the inspected public feed and is not an initial addition. Public inactivity does not imply inactivity in private repositories; never fetch private activity or infer it.

Keep this roster in a typed, local configuration with stable person ID, display name, GitHub handle, optional YouTube channel ID, home waypoint, and `group` (`ecosystem` or `joyco`) to select the visibility rule. Use short on-map names where needed; full names belong in the detail card. Do not automatically discover or rank people by follower counts. Fetch their public activity across repositories, rather than restricting it to one project; always show the repository so its context is clear.

Akella’s verified channel ID is `UCDo7RTzizoOdPjY8A-xDR7g`. Its feed is `https://www.youtube.com/feeds/videos.xml?channel_id=UCDo7RTzizoOdPjY8A-xDR7g`; the feed title is Yuri Artiukh. The initial cast proposal can be edited before implementation, but these fourteen configured people are the implementation defaults, with seven always visible and seven JOYCO actors gated by recent activity.

## Data fetching and interfaces

1. Add a server-only collection layer and a read-only `GET /api/activity` endpoint. Fetch the fourteen configured `GET https://api.github.com/users/{handle}/events/public` feeds, at most 100 events each, and Akella’s Atom feed. Only configured sources may be fetched; the endpoint accepts no arbitrary handles or URLs. Use native fetch for HTTP and a maintained XML parser with external entity processing disabled for Atom. No scraping, browser automation, or YouTube API key is needed.
2. Require a server-only `GITHUB_TOKEN` personal access token for authenticated GitHub requests. The user will provide the token; do not create or request one on their behalf. Store it in local `.env.local` for development and the hosting environment for deployment, never in tracked files. Verify presence before fetching GitHub activity. If missing or invalid, report those GitHub sources as unavailable and keep the map and YouTube feed functional; do not silently fall back to unauthenticated requests. A fine-grained token restricted to public read-only access is sufficient for the public Events endpoints; do not request private repository access or organization membership permissions. Without a token the primary limit is generally 60 requests/hour per originating IP; with a token it is generally 5,000 requests/hour and shares the token owner’s API budget. Authenticated API reads have no usage fee, and secondary limits still apply. Never send it to the browser, include it in logs, or require visitors to sign in. Cache upstream results for 30 minutes with Next’s supported server fetch cache; deduplicate concurrent refresh work in a process. Fourteen GitHub feeds refreshed twice an hour use about 28 requests/hour for one shared cache, below the unauthenticated 60/hour limit. This is not a global guarantee across separately deployed caches or other traffic sharing the IP. Honor upstream rate-limit and retry headers and stop retrying until permitted; do not repeatedly refetch when exhausted.
3. Normalize supported items to `ActivityEvent`: stable `id`, `personId`, `source` (`github` or `youtube`), `kind` (`code`, `pull-request`, `conversation`, `release`, `video`), UTC `occurredAt`, plain-text `title`, original HTTPS `url`, and optional `repository`. Identify GitHub events by their event ID and YouTube uploads by video ID. Use Atom `published`, not `updated`, for upload activity so metadata edits never create new journeys. Ignore malformed entries, unsupported events, and invalid timestamps; preserve good entries from the same source.
4. Map GitHub `PushEvent` to code; opened/reopened `PullRequestEvent` to pull-request; newly created `IssueCommentEvent`, `PullRequestReviewCommentEvent`, `PullRequestReviewEvent`, and opened `IssuesEvent` to conversation; published `ReleaseEvent` to release. Ignore stars, forks, deletes, other PR actions, and unsupported payloads. Push events may lack usable commit detail: use an honest repository-level title and repository link rather than inventing a commit message. Derive other links from available payload URLs, with repository links as fallbacks.
5. Return `{ fetchedAt, events, sources }`. `sources` reports each configured person/provider’s status (`ok`, `stale`, `unavailable`, or `rate-limited`) and last successful fetch time where available. Return successful sources even when another fails. Retain last good results when available; on a cold failure, return an empty source with its status. No persistent historical store is required. Treat expected upstream failures as typed outcomes, following the JOYCO Result guidance; do not turn API failure into scene failure.
6. Keep at most 14 days of available activity and 10 events per person, sorted newest first for cards. These feeds provide a bounded recent window, not a complete archive. The browser fetches once after scene readiness and every 30 minutes while visible, refreshing on return only when due. Cancel requests and timers on unmount; do not block asset loading or the opening animation on network data.

## Castle behavior and rendering

1. Replace the four fictional roaming actors with fourteen preallocated community actors (seven ecosystem and seven JOYCO) in the normal revealed map. Reuse existing Lettra banners, footprint sprites, TSL ink, static composition cache, XYZ disposal, and warmup. Keep the mockery opening’s blank map behavior. Allocate a fixed pool of 20 prints per actor (280 prints total); keep ineligible JOYCO slots hidden and non-interactive; create no meshes or materials during a network refresh or animation frame.
2. Define a shared corridor waypoint graph from the current `lib/map/data.ts` route coordinates. Map code to The Source Library, pull requests to The Commons, conversations to The Playground, releases to The Commons, and videos to The Shader Atelier. The detail card identifies the fictional destination as a workshop, meeting, announcement, or lesson using the renamed architectural labels specified below. Route along graph edges using a deterministic shortest path; a person starts at their configured home waypoint, and loops or retraces the destination corridor briefly if already there.
3. For the first successful fetch in a mounted experience, select each person’s newest event within the 14-day window and stage one journey per active person, staggered by two seconds in roster order. More recent events trigger stronger ink on the banner; events older than a day use lighter ink. Ecosystem people without events remain at their home waypoint with subdued banners and “No recent activity available” in their card. Never manufacture events or claim someone is online.
4. Each journey walks at the existing map’s normal scale and speed, leaves alternating fading prints, pauses six seconds at its destination, then returns home. A subtle parchment announcement displays the event title on arrival. Keep one journey active per person and up to three unseen events queued per person, in publication order; if more arrive, keep the newest three. Track IDs seen during this mounted session so polling cannot repeatedly animate the same event. On later fetches, enqueue only newly observed IDs. Reloading may replay recent activity intentionally.
5. Advance activity only while the revealed map is exploring and the tab is visible. Closing clears transient footprints and pauses journeys; reopening resumes them after the ink reveal without teleporting or enqueueing the same events again. Network updates received while folded can update cards and queue future movement. Preserve manual debug controls and avoid updating actor simulation while manual mode owns it.
6. Extend the scene’s existing control/status boundary with `setActivity(snapshot)` and an actor-selection callback. Scene setup can receive the latest snapshot after readiness; it must not own HTTP fetching. Selecting a name banner opens a React-rendered parchment detail card showing full name, provider, event type, title, repository where applicable, absolute publication time plus relative age, and “View on GitHub/YouTube.” Show up to five recent items for that person and a quiet explanation that movement represents recent public activity. Render source text as text, never HTML. Validate links to the expected GitHub/YouTube hosts and open them safely.
7. Distinguish taps from drag/pan using the existing movement threshold. Keep passage and close hotspots usable when banners overlap. Provide a keyboard-accessible roster alongside the existing accessible controls, an accessible card heading, Escape-to-close, and focus restoration to its trigger. Dismiss the card when the map closes. Use Tangerine for map inscriptions and existing visual styling for the card; preserve usable text sizing and mobile tap targets.
8. When sources fail, keep the parchment fully functional and show last available activity with its fetch time and a subtle stale notice. If nothing is available, the seven ecosystem characters remain visible at home without activity-driven roaming; JOYCO eligibility follows the gate above, and cold failures do not reveal their actors. Do not silently substitute simulated activity. A small manual refresh action uses the same cached endpoint and cannot force upstream requests past the cache interval.

## Implementation order and acceptance

Implement the roster, adapters, normalized contract, and cached route first; then the deterministic corridor routing and actor journey state; then scene integration and the accessible detail card; then the approved copy and destination renames across visible, fallback, metadata, and accessible surfaces. Finish by documenting the required user-supplied token, supported sources, quota limitations, and lack of realtime guarantees in the README. Avoid deploying or provisioning services as part of implementation.

Focused automated tests are justified for network normalization and queued movement, since malformed external payloads, deduplication, and interrupted animation can cause regressions. Use the existing `tsx --test` runner with fixtures; automated tests must not call live APIs. Cover GitHub event mapping and payload fallbacks, Atom namespaces and metadata edits, duplicate IDs, 14-day filtering, partial-source failures/rate limiting, missing or invalid GitHub credentials without unauthenticated fallback, repeated polls, bounded queues, pause/resume across close/reopen, and JOYCO eligibility at the 14-day boundary, stale-source expiry, disappearance during a journey, and re-entry without duplicate events. Do not add tests for cosmetic banner details.

Run typechecking, linting, the focused tests plus existing state tests, and a production build. Manually inspect desktop WebGPU and mobile-sized WebGL2: all seven ecosystem names plus eligible JOYCO names, inactive JOYCO slots hidden, corridor-constrained footprints, data arriving after reveal, banner selection without breaking pan/passage controls, keyboard card access, repeated close/reopen, hidden-tab resume, empty/error sources, and teardown. Inspect the folded title/welcome and long close label for overflow on desktop and mobile. Check every reserved string and the complete mockery against the original source, and confirm renamed rooms match the activity destinations, fallback, metadata, and accessible descriptions. Copy changes require focused inspection rather than new automated tests. Confirm static caching still excludes dynamic actor meshes and that no polling timers or GPU resources survive disposal.

Acceptance means Akella’s latest public upload can produce a classroom journey and a working watch link; a supported GitHub event produces the matching journey and source card; duplicate refreshes do not replay it; unavailable providers never prevent map exploration; eligible JOYCO members appear and inactive members disappear according to the 14-day gate; no paid integration is introduced; the Makers’ Map identity and renamed destinations appear consistently while all reserved phrases and mockery remain verbatim; and GitHub requests use the required user-supplied server-only token without exposing it to visitors.

## Sources and implementation guidance

- [GitHub public Events API](https://docs.github.com/en/rest/activity/events): the feed may lag 30 seconds to six hours; this is recent activity, not live presence.
- [GitHub rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api): public unauthenticated reads generally allow 60 requests/hour; authenticated requests generally allow 5,000/hour, with additional secondary limits.
- [YouTube channel feed and push notification documentation](https://developers.google.com/youtube/v3/guides/push_notifications): channel uploads and metadata updates appear as Atom entries. V1 polls the feed; webhook subscription is deferred.
- [JOYCO XYZ](https://hub.joyco.studio/toolbox/xyz): retain scene-owned resource disposal and shader warmup for the larger actor pool.
- [JOYCO Return, Don’t Throw](https://hub.joyco.studio/logs/17-return-dont-throw): represent expected upstream failures as typed outcomes and keep partial results usable.

Both JOYCO Logs and Toolbox indexes were reviewed while preparing this plan. No application code or configuration was changed.

## Implementation progress

Implementation was authorized on October 9, 2026. Work proceeds in the specified order: collection and normalization, journey simulation, scene and accessible cards, copy and documentation, then focused tests and build verification. The existing rendering and motion policy remain in place.

### Authorized scope changes

During implementation, the user requested random roaming when no GitHub token is provided and a maximum number of people rendered at once. The user subsequently configured `GITHUB_TOKEN` and asked to focus on implementation without further browser work. Missing-token responses now explicitly select fictional wandering for ecosystem actors; real YouTube events can still stage journeys. Invalid credentials do not select this fallback. Cards and notices distinguish fictional wandering from actual provider events. JOYCO visibility remains gated by public activity.

The simultaneous canvas limit is configured locally in `MAX_RENDERED_PEOPLE` (eight, confirmed by the user). All fourteen actor resource pools remain preallocated. Ongoing real journeys retain their slots; queued activity rotates into free slots, so the cap cannot silently discard a configured person's unseen events. Eligible profiles remain keyboard-accessible. Browser verification was stopped at the user's request; all temporary collection fixtures were removed.

### Verification record

The implementation includes the normalized GitHub/Atom adapters, server-only collection route, typed source failures and rate-limit guards, fourteen pooled actors, corridor journeys and bounded queues, eight-person render cap, explicit missing-token roaming, eligibility expiry, keyboard roster and source cards, approved identity copy, updated fallback and font atlases, and README configuration guidance.

Thirty-seven offline activity and existing cinematic state tests pass. Typechecking, linting, the production build, and `git diff --check` pass. The reserved source strings and complete mockery were compared against the original source and match verbatim. Static composition excludes every pooled banner, label and footprint, and hidden/expired prints are excluded from rendering. Request aborts, polling timers, visibility listeners and arrival timers are disposed on unmount.

Partial desktop WebGPU inspection covered the folded title, opening, empty sources, keyboard roster and unavailable-source card before browser work was stopped at the user's request. Full mobile WebGL2 and final browser inspection are deferred. No deployment or service provisioning was performed. The temporary local collection fixture was restored to the real server-only collector. The configured token is never copied to tracked files or client code.

### Follow-up: actor presentation

The user requested fixes for repeated entrances, age-faded makers, and teleporting banners. Actor appearance now has a complete entrance/exit lifecycle independent of map phase and roster selection. All makers use full ink strength; freshness remains visible in source cards. Exits reserve one of the eight slots until complete, banner offsets stay stable throughout an appearance, and unexpected relocations happen only after a full exit. See `actor-transitions.md` for the implementation and verification record.
