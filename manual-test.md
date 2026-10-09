# Situbondo Messenger — comprehensive manual test plan

Prepared and coverage-audited: 2026-10-02. Scope: the game in `game/`, not the surrounding portfolio site.

This is a research-backed test catalog. The user subsequently authorized manual
execution, scoped fixes and manual retesting on 2026-10-02. New results are
recorded in section 24; unexecuted catalog rows do not inherit those results.
Historical planning-only restrictions describe the earlier documentation pass,
not the newly authorized execution. Preserve unrelated work and user profiles.

Execution guide: use the shared cases in sections 4–15 as reusable procedures;
use **section 19's area packs** to decide where to apply them, and **section 20's
journeys** to test the complete player experience. Section 21 defines area
signoff. Geometry, mechanics and gameplay each need their own verdict.
The audit additions in sections 22–23 specify implementation-sensitive tests,
measurement rules, and a source-backed critical inventory. This is still not a
claim of exhaustive coverage: unlocated variants remain visibly unresolved.

## 1. Objectives and test rules

1. Prove that a player can start, navigate, deliver all seven letters, finish,
   fail, and restart without debug assistance.
2. Prioritize Alun-Alun: all entrances, paths, park props, adjoining frontages,
   pedestrian crossings, and the southeast junction. Then cover the rest of
   the 1 km playable map and the three remote delivery destinations.
3. Distinguish visual geometry, player collision, camera collision, delivery
   radius, surface height, traffic collision, and real-world accuracy. A pass
   in one does not prove any of the others.
4. Reproduce a suspected issue at least twice. Record a clear expected result,
   actual state, input sequence, build identifier, and evidence before fixing.
5. After a future fix: relevant automated regressions, production build,
   restart the existing game service on port 8101, verify the served asset,
   repeat the exact reproduction, and test neighboring negative controls.
   Do not start a competing 4174 server. Restart 8101 after gameplay changes
   during the authorized execution pass, not after documentation-only edits.
6. Do not delete user storage, export files, or local edits. Use disposable
   browser profiles for destructive, corruption, logout, failure-injection,
   and map-editor tests. Never put actual credentials in evidence or this file.
7. Teleport can establish a safe pose **outside** an obstacle for a local test.
   Then use real keyboard/pointer movement. Teleporting inside a solid object
   does not establish a normal-play collision or camera bug. Do not force
   delivery counts, timers, collision flags, or completion for acceptance tests.
8. An automation timeout is an inconclusive harness result until position,
   actual elapsed simulation time, focus, and held input are inspected.
   Release all held keys/pointers in `finally` even when a test fails.

### Priority, verdict, and evidence vocabulary

- P0: release blocker — cannot load/start, crash, unusable core route, damaging
  persistence/security behavior.
- P1: core correctness — stuck movement, pass-through/phantom collision,
  unreachable handoff, bad timer/result state, broken input recovery.
- P2: substantial visual, camera, usability, accessibility, or fidelity defect.
- P3: lower-impact polish or exploratory coverage.
- Verdict: NOT RUN / PASS / FAIL / BLOCKED / INCONCLUSIVE / NEEDS DECISION / N/A.
- `[C]`: source-backed current behavior; use as the implementation oracle.
- `[R]`: desired quality requirement; not a claim it is implemented.
- `[D]`: product decision needed; record observed behavior without inventing
  a requirement or implementing a speculative fix.

All catalog rows start **NOT RUN for the next execution build**. Historical
passes never silently become current passes. Each parameterized row expands
into a separate result for every listed object, direction, or environment.

## 2. Research basis and source map

Repository sources inspected for this plan:

| Area | Primary source / supporting reference |
|---|---|
| Startup, assembly and tool installation | `game/src/main.js`, `game/src/app/game.js` |
| Round lifecycle, countdown and delivery | `game/src/app/game-runtime.js`, `game/src/state/game-state.js` |
| Constants and route anchors | `game/src/config/runtime.js`, `game/src/data/stops.js` |
| Input and movement | `game/src/input/controls.js`, `game/src/player/movement.js`, `game/src/player/rider.js` |
| Collision, surfaces and mapped buildings | `game/src/navigation/navigation.js`, `game/src/world/activate-geospatial-world.js`, `game/src/world/geospatial-world.js`, `game/src/world/surface*.js` |
| Camera and rendering | `game/src/camera/controller.js`, `game/src/rendering/renderer.js`, `game/src/rendering/overview-lod.js` |
| HUD / responsive UI | `game/index.html`, `game/src/ui/interface.js`, `game/src/ui/style.css`, `game/src/ui/map-stats.js` |
| Park, frontages and traffic | `game/src/features/landmarks/alun-alun/*.js` |
| Other landmarks and handoffs | `game/src/features/landmarks/{mosque,pendopo,gazebo-situbondo,minor-stop-models,populate-stops}.js` |
| Dev access, settings and editor | `game/src/devtools/{dev-session,dev-settings,map-editor,debug-api}.js` |
| Prior findings and evidence | `game/MANUAL-QA-2026-10-01.md`, `game/qa-evidence/` |
| Automated coverage | `game/scripts/validate-*.mjs`, `game/package.json` |
| Hosting/build assumptions | `game/vite.config.js`, `game/README.md`, `game/src/README.md` |

This research uses current local code and prior QA records. No new Street View
survey or internet verification was performed for this document. Existing
panorama IDs in the README/QA history are leads, not proof of current imagery.

### Source-backed baseline to recheck before execution

| Property | Current baseline |
|---|---|
| Existing test service | `http://127.0.0.1:8101/`, production `game/dist`; last recorded build `index-9-pxWU2W.js`, not verified live during this planning pass |
| Separate Vite default | Port 8104, strict port; do not confuse its source build with the 8101 service |
| Start/reset | Rider `(theta=12, phi=12)`, 0/7 deliveries, 900 seconds, first target Alun-Alun |
| Coordinate convention | theta=east, phi=south; park-local x=north, z=east; 1 unit=5 m |
| Heading | east=0, north=PI/2, west=PI, south=-PI/2; controls are camera-relative |
| Normal motion | Walk .82 units/s; run 1.64; authenticated dev fast-run 6.4 |
| Navigation | Rider collision radius .06; maximum step height .055; maximum movement substep .025 |
| Delivery | Distance <=1.2 units (6 m), current target only, automatic on proximity; +5 seconds capped at 900 |
| Bonus HUD | Streak ×5 seconds, which is not necessarily actual net countdown recovery when capped |
| Timeout precedence | Countdown is processed before delivery; time <=0 fails before that frame's handoff |
| Low-time HUD | Low at displayed time <=45 and >20; critical at <=20; display uses ceiling |
| Simulation delta | Capped at .08 seconds/frame; do not assume wall-clock countdown when throttled/backgrounded |
| Graphics | WebGL/Three.js, toon/outline, pixel ratio capped at 1.5 |
| Dev session | Client-side session with 14-day expiry; editor installed after authentication callback |
| Editor scale | Clamped .1–8; export explicitly warns that permanent collision/navigation updates require source changes |

## 3. Execution order and environment matrix

### Gates

1. **G0 — identify build and clean baseline:** BOOT, clean profile, normal mode,
   assets/map loaded, no saved editor patch, no held keys.
2. **G1 — playable smoke:** start → first handoff → restart path → basic
   movement/run/stop/focus recovery. Stop broader acceptance if this fails.
3. **G2 — Alun-Alun local matrix:** NAV, PARK, FRONT, CAMERA and TRAFFIC, beginning
   with known regressions and user-reported frontage/junction areas.
4. **G3 — uninterrupted normal seven-stop route:** no teleports, no edited
   counters, no dev fast-run. Record route choices, elapsed time and stuck spots.
5. **G4 — mobile, lifecycle, timer boundaries and retry:** real hardware plus
   desktop/browser combinations, followed by resilience and accessibility.
6. **G5 — isolated dev/editor/persistence suite:** disposable profile only.
7. **G6 — soak, performance and geography review:** sustained play and dated
   reference comparisons, followed by a fresh normal-mode regression smoke.

### Test environments (record exact versions at execution)

| ID | Configuration | Main purpose |
|---|---|---|
| E1 | Desktop Chromium, 1280×720 and 1920×1080, keyboard/mouse | Reference functional run |
| E2 | Chromium 960×600 | Comparable local QA evidence |
| E3 | Firefox desktop | Keyboard, pointer capture, WebGL, storage compatibility |
| E4 | Safari macOS | WebGL, focus, storage, clipboard and resize differences |
| E5 | Physical Android Chrome, portrait/landscape | Real multitouch, browser chrome, thermal load |
| E6 | Physical iPhone Safari, portrait/landscape | Safe areas, interruption, pointer cancel, memory |
| E7 | Emulated 390×844, 844×390, 320×568 | Layout and synthetic pointer coverage only; not a physical-device pass |
| E8 | DPR 1/1.5/2/3, browser zoom 80/100/200% | Canvas sharpness, HUD clipping, hit targets |
| E9 | Reduced-motion on/off before load and during play | Animation and interaction parity |
| E10 | Low-end integrated GPU, battery saver, sustained load | Real frame-time/thermal behavior |
| E11 | Disposable private/blocked-storage profile | Storage and crypto/clipboard failure behavior |
| E12 | Slow/offline/failed-asset network in isolated browser | Cold-load and recovery failures |

Run every P0/P1 normal-play case on E1; movement, deliveries and lifecycle on
E3–E6; full mobile touch suite on E5/E6. Run viewport rows on E7/E8. E9–E12
target specific cases. Use pairwise combinations for the remaining matrix,
plus high-risk triples: touch+rotation+run, near-wall+low-FPS+run,
delivery+near-zero-time+focus return, editor+storage failure+reload.

## 4. Boot, deployment and basic runtime

| ID | Pri | Setup and action | Expected result / evidence |
|---|---|---|---|
| BOOT-01 | P0 | Fresh profile; open 8101 root, wait for title and map. | [R] Playable title, no fatal exception; capture build hash, console, failed requests. |
| BOOT-02 | P0 | Start with mouse, then fresh load with keyboard Enter/Space on start button. | [C] One round begins, message hides, 900 countdown starts, correct spawn/target. |
| BOOT-03 | P1 | Double-click/tap start; rapid repeated Enter. | [R] No multiple animation loops, duplicate overlays, timer acceleration or duplicate delivery. |
| BOOT-04 | P1 | Idle title 60 s, move pointer, press movement keys, resize. | [C/R] No route progress/countdown before start; scene remains usable after starting. |
| BOOT-05 | P1 | Reload during play, completion and failure. | [C] New page initializes normal round/title rather than pretending route progress was saved; dev-session behavior tested separately. |
| BOOT-06 | P1 | Hard reload and ordinary reload after a future release. | [R] HTML and JS/CSS belong to same release; no stale/new asset mixture; record actual served asset, not only local dist. |
| BOOT-07 | P1 | Load under intended nested deployment path and root with query/hash. | [R] Relative map/assets resolve; route/query do not cause missing data. Test only actual supported hosting paths. |
| BOOT-08 | P1 | Block map JSON, return 404/500, malformed JSON, or network abort in disposable session. | [R] Understandable failure/recovery; no indefinite blank usable-looking screen. Loader currently throws; do not assume an error UI exists. |
| BOOT-09 | P1 | Slow map load, then leave/reload; repeat with cold cache. | [R] No stale load alters a new page, no silent permanent half-scene; recovery by successful reload. |
| BOOT-10 | P1 | Block JS/CSS/texture individually, then restore network. | [R] Failure is diagnosable; no false ready state, and reload recovers. Record each asset separately. |
| BOOT-11 | P1 | Disable WebGL / simulate context loss then restoration in isolated browser. | [R/D] No misleading functional screen; document supported recovery or missing fallback. |
| BOOT-12 | P2 | Compare displayed map counts/scale with loaded data and debug stats. | [C] Counts describe actual dataset; zero counts during failure must not masquerade as valid loaded coverage. |

## 5. Round lifecycle, deliveries, timer and route

For DEL-01..06 execute separately for all seven targets in order: Alun-Alun →
Gazebo → Al-Abror → Pendopo → Pasar Mimbaan → Terminal → Stadion Gelora.
Use the **runtime handoff**, not merely building center: custom delivery
coordinates can be applied during landmark construction. Inspect current
target/probe/source when establishing test poses.

| ID | Pri | Setup and action | Expected result / evidence |
|---|---|---|---|
| DEL-01 | P0 | Walk to each target on a legal, continuous approach from outside its collision envelope. | [C/R] Handoff reachable without entering solid geometry or crossing map boundary; increment exactly once. |
| DEL-02 | P1 | Approach radius slowly from N/E/S/W where physically accessible; sample just outside/inside 1.2. | [C] Outside does not deliver; inside does. Inaccessible directions may be N/A, but at least one legal approach must pass. |
| DEL-03 | P1 | Sprint past/along edge of handoff radius, including low-FPS run. | [R] Valid sampled proximity not missed; no delivery from far away. Record path and actual radius crossing. |
| DEL-04 | P1 | Remain at delivered target 10 s; leave and return repeatedly. | [C] No duplicate letter, bonus or toast for previous target. |
| DEL-05 | P1 | Visit a later destination before its turn; return when active. | [C] No out-of-order progress; activates/delivers only when current. |
| DEL-06 | P2 | Compare marker, target arrow, name, distance, toast and progress after handoff. | [C] All refer to correct old/new target; one marker active, no stale progress step. |
| DEL-07 | P0 | Complete whole route in normal mode without teleport, editor, speed hacks or state edits. | [R] 7/7 and Route Complete achievable within budget on a sensible route; log each leg and exact obstacles/detours. |
| DEL-08 | P1 | Compare short route to safe pedestrian route; repeat running vs walking. | [D] Measure feasibility and fairness; walking-only completion is not presumed a committed requirement. |
| DEL-09 | P1 | Trigger seventh delivery while movement/run held. | [C/R] Complete once; movement state reset, target hidden, no target-index crash or extra reward. |
| DEL-10 | P1 | Activate Walk Again; immediately walk and revisit first target. | [C] All round/rider/HUD state resets; target 1 can award again. |
| DEL-11 | P1 | Finish→restart→finish and fail→retry→finish in same tab. | [R] No retained callbacks, old toast, bonus, camera compression or accidental auto-delivery. |
| DEL-12 | P2 | At blocked approach, compare rounded “6 m” display and actual radius. | [C/R] Rounding never treated as proof of reachability; actionable route exists even if display rounds outside point to 6 m. |
| DEL-13 | P2 | Approach within radius but separated by a solid wall. | [C/D] Current trigger is proximity-only, not line-of-sight. Decide whether through-wall delivery is acceptable; do not silently add an entrance requirement. |
| TIME-01 | P1 | Record countdown over 60 foreground seconds on responsive hardware. | [C] Monotonic simulation countdown, no negative display; report wall-clock drift separately. |
| TIME-02 | P1 | Earn handoff when time below 895, near 900, and near low-time thresholds. | [C] +5 capped at 900; HUD streak increments once; cap does not overflow. |
| TIME-03 | P2 | Observe display across 46→45, 21→20 and 1→0. | [C] Correct low/critical classes and ceiling behavior; readable zero/failure state. |
| TIME-04 | P0 | Let a genuine round expire without progress, then with partial progress. | [C] Dusk Arrived once; correct delivered count, time=0, no further delivery/movement. |
| TIME-05 | P1 | Retry after timeout while keys/pointer previously held. | [C/R] Fresh 900/0/7 state, no stuck controls or stale target. |
| TIME-06 | P1 | Reach handoff in last positive frame, at timeout frame, and after failure. | [C] Positive-time delivery can award; expiration wins when time <=0 before delivery processing; never both success and failure. |
| TIME-07 | P1 | Background tab 5/60 s, lock/unlock device, suspend/resume machine. | [C/D] Inputs reset; measure capped-delta timer behavior. Decide whether wall-clock or active-play time is intended before classifying drift. |
| TIME-08 | P1 | Low-FPS/CPU throttle over measured interval, plus delivery near deadline. | [C/D] Finite consistent state; record simulation-vs-wall-time difference caused by .08 cap, not an assumed real-time contract. |
| TIME-09 | P2 | Idle on result screen 60 s and resize. | [C] Final score/time do not continue changing; no active marker or recurring rewards. |

## 6. Keyboard, mouse, touch and lifecycle corner cases

| ID | Pri | Setup and action | Expected result / evidence |
|---|---|---|---|
| INPUT-01 | P1 | Each WASD and arrow key alone on clear ground at four headings. | [C] Camera-relative directional movement is consistent; key labels match behavior. |
| INPUT-02 | P1 | W+D, W+A, S+D, S+A versus straight motion over equal simulation time. | [R] No unintended diagonal speed boost; smooth heading transition. |
| INPUT-03 | P1 | W+S, A+D, all four; release one at a time; mix WASD/arrows. | [R] Deterministic cancellation/resumption, no NaN heading or stuck input. |
| INPUT-04 | P1 | Hold movement+left/right Shift; release Shift while still walking, reverse order. | [C] Run only while requested; returns to walk without sticking. |
| INPUT-05 | P1 | Space/Stop while moving, while running, while idle; release brake with direction still held. | [C/R] Brake dominates as designed; no creeping through obstacle, predictable resumption. |
| INPUT-06 | P1 | Rapid reversals, circles and 180° turns beside wall/corner. | [R] No teleport, camera spin loop or angle-wrap discontinuity. |
| INPUT-07 | P1 | Key repeat, long 30 s hold, missed keyup through genuine tab/window blur. | [C] Blur clears keyboard/run/brake/analog; return idle until fresh input. |
| INPUT-08 | P1 | Hold W+Shift/Space; alt-tab, address bar focus, browser menu, OS dialog. | [R] All control components clear/recover; verify actual focus events, not two focus-emulated pages. |
| INPUT-09 | P1 | Hide/show tab, page lifecycle/back-forward navigation and device lock during drag. | [R] No stranded pointer capture or resumed runaway character. |
| INPUT-10 | P2 | Hold arrows/Space while playing, then in focused UI input/button/select. | [C] Gameplay keys prevent unwanted scroll; form/button input remains usable and does not move character. |
| INPUT-11 | P2 | Mouse left-drag canvas; right/middle-click, context menu and release outside canvas. | [C/R] Only intended pointer starts analog; context menu policy consistent; release clears control. |
| INPUT-12 | P2 | Focus start button after click; press movement; tab focus among controls. | [R] No unexplained trapped focus preventing play; document whether intentional focus suppression requires canvas click. |
| INPUT-13 | P1 | Hold W+Up together; release each separately. Repeat with both Shift keys. | [C/R] Remaining held binding still works; releasing one must not cancel the other. |
| INPUT-14 | P1 | Hold movement before starting; then focus a text field while moving and release there. | [C] Start clears inherited controls; keyup in editable target still removes held key. |
| INPUT-15 | P2 | Esc, browser shortcuts and modifier combinations during play. | [D/R] No browser trap or stuck controls. Esc pause is not an established feature. |
| INPUT-16 | P2 | From settled walk/run on clear level ground, release direction versus hold Space/Stop; repeat near a curb, gate and handoff. | [C/R] Both decelerate, not stop instantly; brake damping 20 versus release 14.5 should give shorter stopping time/distance under equivalent input/timestep conditions. Measure residual travel using section 22; no collision penetration. |
| INPUT-17 | P2 | QWERTY, AZERTY/Dvorak where available, then switch layout during same session; verify arrows separately. | [C/D] Bindings use physical `event.code` KeyW/A/S/D, not character labels. Record instructional mismatch; layout-aware rebinding is not presumed implemented. |
| TOUCH-01 | P1 | Start drag in center and each screen corner; short/long drag; cross joystick dead zone. | [C/R] Correct direction/magnitude, capped input, stable origin and visual joystick. |
| TOUCH-02 | P1 | Drag outside canvas/viewport and release; pointercancel/lost capture. | [C] Analog resets, visual disappears/recenters, no continued motion. |
| TOUCH-03 | P1 | Physical two-finger joystick+Run; release Run first, then joystick first. | [R] Independent hold controls, expected walk/run states; releasing unrelated pointer must not cancel remaining joystick. |
| TOUCH-04 | P1 | Physical joystick+Stop; joystick+Run+Stop; release each ordering. | [R] Brake priority, pointer ownership and resumption correct; no sticky speed. |
| TOUCH-05 | P1 | Second finger taps canvas while first steers; exchange fingers rapidly. | [R] No origin hijack, teleport, unrelated release clearing active drag or permanent capture. |
| TOUCH-06 | P1 | Rotate device during joystick/run/brake; browser chrome expands/collapses. | [R] Control reset or consistent remap, never stuck; resized controls remain reachable. |
| TOUCH-07 | P2 | Swipe from OS gesture edges, notification shade, long press and pinch. | [R] App recovers after browser/OS interruption; do not require overriding protected OS gestures. |
| TOUCH-08 | P2 | Drag HUD, target, toast, buttons and editor areas. | [R] UI interaction does not accidentally steer; intended canvas area still works. |
| TOUCH-09 | P1 | Use keyboard and analog together; execute the section 22 combination table and release in both orders. | [C] Vectors add, each axis clamps to [-1,1], then radial magnitude/deadzone scaling applies; there is no priority winner. Pointer release preserves held keyboard; lifecycle reset clears both. |
| TOUCH-10 | P2 | Physical mobile: repeated 50 drag/release cycles including interruptions. | [R] No accumulation of active pointers, missing control or visual drift. |
| TOUCH-11 | P2 | Touch-capable laptop switches touch→mouse→keyboard mid-round. | [R] All modalities work without reload or stale visibility/hit regions. |
| TOUCH-12 | P1 | Drag 7.4/7.5/7.6 px, then 74/75/76 px from origin in several directions. | [C] .1 normalized deadzone and 75 px input clamp behave consistently; visually clamped joystick origin near screen edge must not change logical origin. |
| TOUCH-13 | P1 | Two fingers press same Run or Stop button; release one while other remains; repeat cancellation/lost capture and reversed release order. | [C/R] Each button tracks pointer IDs: one ending preserves the other hold; last ending clears unless an independent keyboard activation remains. Lifecycle reset clears all sources. Physical multi-touch verification still required. |
| TOUCH-14 | P2 | Release analog while Run finger remains held, then start new analog gesture. | [C/D] Current analog reset clears Run; record whether re-press requirement is acceptable rather than claiming uninterrupted running is already supported. |
| TOUCH-15 | P2 | Hold 0/10/25/50/75/100% radial analog input at cardinal and diagonal directions, walking and running. | [C/R] Intermediate speeds follow deadzone-remapped magnitude raised to 1.18 after settling; monotonic progression and usable fine approach to gates. Same radial magnitude, not same per-axis magnitude, for diagonal comparison. |
| TOUCH-16 | P2 | Fine-input sweep immediately above .1 at measured 30/60/144 Hz, on clear level ground; record target speed, rider.speed, coordinate displacement, actualSpeed and animation separately. | [C/R/D] Translation has an additional per-frame cutoff, so nonzero target speed is not proof of movement. Characterize threshold and telemetry precision using M2; assess perceptible control/animation discrepancies separately from tiny numerical effects. |
| TOUCH-17 | P2 | After a turn with rider/camera headings differing, sequence radial input .0999→.1→.1001→.0999, hold each, oscillate, then release; repeat different input directions. | [C/R/D] Exactly .1 can select active input with zero movement vector. Record pivoting, desired heading, camera recenter and residual coast; no unexplained sustained oscillation. Intended threshold-heading behavior needs an explicit decision. |

## 7. Navigation, surface and map-boundary matrix

For every solid object tested, separate: (a) center-face collision, (b) corner
approach, (c) tangential slide, (d) clear adjacent passage, (e) reverse escape.
Repeat walking/running and at low frame rate. Apply to both custom and retained
OSM structures, not just hand-built landmarks.

| ID | Pri | Setup and action | Expected result / evidence |
|---|---|---|---|
| NAV-01 | P1 | Approach axis-aligned and rotated walls from four sides. | [R] Stop before mesh penetration; collider follows visible orientation and footprint. |
| NAV-02 | P1 | Approach inside/outside corners diagonally, hold run, reverse out. | [R] No corner tunneling, sticky jitter, irreversible trapping or invisible corner padding. |
| NAV-03 | P1 | Traverse each gate/door/open alley in both directions. | [R] Openings remain usable; nearby rail/wall does not create a full-width invisible blocker. |
| NAV-04 | P1 | Thin rails, posts and narrow barriers at perpendicular/oblique sprint. | [R] Solid visible parts block consistently even with substeps and dropped frames. |
| NAV-05 | P1 | Sweep empty former object locations and custom/OSM replacement overlap zones. | [R] No phantom old collider or duplicate hidden mapped building. |
| NAV-06 | P1 | Walk parallel within rider-radius distance of long rotated fence. | [R] Stable sliding with no alternating sticky steps or forced roadway excursion. |
| NAV-07 | P1 | Crossing floor seams: asphalt↔sidewalk↔ceramic↔driveway↔lawn. | [C/R] Heights/ownership consistent, no sinking, levitation, z-fighting or false collision. |
| NAV-08 | P1 | Steps just below/at/above .055 at frontal and diagonal approaches. | [C] Legal steps traversable, over-height not bypassable diagonally; use geometry with known heights. |
| NAV-09 | P1 | Test both ascent and descent at each intended raised-floor access and exposed edge, then return by intended route. | [C] Absolute height changes >.055 block in either direction. [R/D] Declare stairs/ramp/closed-edge intent per inventory item; if an intended exit is blocked, report design/navigation mismatch rather than approving it merely because code is consistent. |
| NAV-10 | P1 | Narrow gaps just below/at/above .12 clear width, including rotated passages. | [C/R] Collision radius respected, no squeeze through too-small gap; numerical tolerance recorded. |
| NAV-11 | P1 | Hand-built and mapped collision meet at a corner/entrance. | [R] No collision seam hole or overlapping exclusion that seals legal passage. |
| NAV-12 | P1 | Bridge deck and approaches, water edges and drainage seams. | [R/D] Walkable deck continuous; water traversal policy must be decided, not assumed. |
| NAV-13 | P1 | Approach 1 km perimeter in eight compass sectors, walk/run/diagonal. | [C/R] Remain inside playable radius; boundary notice appears; no invisible early clamp far inside. |
| NAV-14 | P1 | Run tangentially around boundary; reverse away; combine nearby building collision. | [R] Smooth retreat, no trapping, spin, repeated displacement or stuck notice. |
| NAV-15 | P1 | Stadion handoff near map edge; walk legal approach and escape back toward town. | [R] Marker and delivery reachable inside radius, no perimeter-blocked objective. |
| NAV-16 | P2 | Observe map edge in camera while boundary pushing. | [R] No revealing broken terrain/black gaps; restricted area messaging honest. |
| NAV-17 | P1 | Low FPS and resumed tab while pressed against thin collider. | [C/R] Substepping prevents pass-through; no large jump from accumulated wall time. |
| NAV-18 | P2 | Normal movement after debug setup close to (not inside) collider. | [R] Same behavior as continuous approach; record invalid setup as such, not a gameplay failure. |
| NAV-19 | P1 | Raised surface polygon outer edge, holes and overlapping floor owners. | [C/R] Correct highest valid floor; no invisible deck over fountain/planter holes or thin unsupported strip at polygon joins. |
| NAV-20 | P1 | Locate mapped building corners straddling east/north multiples of 40 m, including negative coordinates; approach from both cells and diagonally. | [R] Identical solid/open behavior on either side of spatial-index boundary; no cell-seam pass-through or phantom block. Log actual grid cell, footprint and coordinates; do not confuse world units with metres. |
| NAV-21 | P1 | At a two-/three-wall mapped pocket near a grid boundary, press obliquely, slide along tangent, stop, then reverse out at walk/run. | [R] Collision correction never pushes rider into another building or permanently traps them; check final gaps to all nearby footprints, not just the solver's initial candidates or collisionActive flag. |
| NAV-22 | P1 | Locate narrow raised strips or surface holes/trenches with height change >.055; test widths below/at/above .025, multiple starting offsets and frontal/oblique walking/running. | [R/D] Check whether previous/next samples skip the intervening surface despite equal endpoint heights; intended blocked surfaces must not become crossable solely because of starting offset or speed. Use actual feature widths and effective substep distance; controlled fixtures require separate authorized isolated setup and are not evidence of a production defect. |

## 8. Alun-Alun park — object-by-object local coverage

Run PARK-01 in a complete clockwise circuit and again counterclockwise without
teleporting. Test all entrances from road-facing and park-facing directions.
The table's setup coordinates are **leads from prior QA**, not guarantees that
the current safe approach pose has no intervening geometry.

| ID | Pri | Location and action | Expected result / critical corner case |
|---|---|---|---|
| PARK-01 | P0 | Every park entrance, ceramic ring and connecting interior paths; full perimeter loop. | [R] Continuous usable path; no forced clip/teleport, blocked curb return or unexpected dead end. |
| PARK-02 | P1 | Garuda center near (.95,-12.7); four sides + old west blocker near theta -.35. | [R] Visible base solid; old empty path clear; no oversized invisible footprint. |
| PARK-03 | P1 | Barrier fixed pedestal (-2.62,-13.25); cardinal approaches; adjacent theta -3.05 passage. | [R] Base/hinge solid; adjacent opening not permanently blocked by arm-sized box. |
| PARK-04 | P1 | Moving barrier arm: approach when down, rising, up and falling; stand beneath sweep. | [D] Define intended physical behavior first. No hidden always-closed collider; never eject/trap player unpredictably. Record visual/physics mismatch. |
| PARK-05 | P1 | Message-board posts theta 9.60/10.50, phi about -13.045; both directions. | [R] Each post solid, middle theta 10.05 and outside paths clear; elevated sign does not block headroom incorrectly. |
| PARK-06 | P1 | West benches (-15.46,-6.35), (-13.28,4.15), (-11.97,10.45). | [R] Seat/back footprint solid from both faces and ends; tight rotated bounds; bypass both ends. |
| PARK-07 | P1 | Three south promenade benches; each face, back and ends. | [R] Existing collisions remain aligned and not duplicated; no regression from west-bench fix. |
| PARK-08 | P1 | Fountain near (theta 4.7, phi 4.8); all sides and connecting paths. | [R] Basin blocks normal entry; no approach that pushes rider/camera inside; don't count an inside-teleport as reproduction. |
| PARK-09 | P1 | Small gazebos and prayer shelter, columns, raised floors and nearby service block. | [D/R] Establish intended enterability; visible entry/stairs agree with collision, no broad invisible box over a promised interior. |
| PARK-10 | P1 | Main public Gazebo stairs, platform, columns, inner seating and back edge. | [R] Intended approaches/handoff usable; columns and platform edges consistent; camera does not hide exit. |
| PARK-11 | P2 | Lamp poles, bollards, signage, sculptures and planters along full ring. | [R/D] Grounded and road-clear; solid-object policy consistent; distinguish purely decorative noncollision explicitly. |
| PARK-12 | P1 | All lowered curb transitions and tactile paving turns, both directions. | [R] No discontinuity, tiny vertical snag or missing crossing connection. |
| PARK-13 | P2 | Tree wells and seating setbacks on west/south promenade. | [R] Clear walking width; no bench/tree/curb collision overlap sealing walkway. |
| PARK-14 | P1 | Southeast monument/island, true three-way junction: all branches and perimeter. | [R] Solid base aligned, safe passage around; geographic centering separately verified with dated reference. |
| PARK-15 | P2 | North entrance signs/barrier/board together from ground-level approach. | [R] No floating props, overlapping text, occluded route cue or impossible scale; camera checked at normal player height. |
| PARK-16 | P1 | Diagonal shortcuts between park props and lawn/path corners. | [R] No collision tunneling or unintended hole bypass; normal escape remains possible. |
| PARK-17 | P1 | Park-to-south crossing through dropped curb and median pedestrian gap, both ways. | [R] Entire connected path fits rider radius; neighboring raised median stays solid. |
| PARK-18 | P2 | Four southeast sidewalk returns and asphalt/custom-road-mask seams. | [R] No duplicated raised wedge, missing road triangle or invisible step sealing an intended crossing. |

## 9. Building frontages, nearby landmarks and geographic fidelity

Apply FRONT-01..08 to each row of the location inventory. Mark unseen/inaccessible
rear areas UNKNOWN rather than claiming survey fidelity. Closed/private real
buildings need not be enterable; playable access is a separate design choice.

| ID | Pri | Action | Expected result |
|---|---|---|---|
| FRONT-01 | P1 | Walk entire frontage along public sidewalk in both directions. | [R] Fence/building at property side of sidewalk, not in road or pedestrian tread; no forced detour into traffic. |
| FRONT-02 | P1 | Test gates/driveways with neighboring fence segments, corners and grade changes. | [R] Visible openings remain open; fences preserved and correctly set back rather than deleted to hide a collision bug. |
| FRONT-03 | P1 | Approach walls/columns/porches from available faces. | [R] Physical boundaries match visible footprint and intended accessible floor. |
| FRONT-04 | P2 | Ground-level orbit and elevated diagnostic view of replaced OSM footprint. | [R] No generic duplicate, floating underside, buried steps, intersecting roof or repeated building. |
| FRONT-05 | P2 | Sight along road axis at both ends of frontage. | [R] Correct frontage order, setbacks, orientation and width relative to neighboring buildings. |
| FRONT-06 | P2 | Compare with multiple dated Google 360 viewpoints: center and both obliques. | [R] Match supported position, massing, roof, permanent façade, gates/signs; record panorama ID, heading, pitch, date and uncertainty. |
| FRONT-07 | P2 | Compare top-down footprint to map/satellite evidence and street-facing reference. | [R] Building depth and detached structures agree; satellite alone not used to invent façade detail. |
| FRONT-08 | P2 | Repeat at player height with delivery marker/UI visible. | [R] Art remains readable in actual play; screenshot from special camera is not sole acceptance evidence. |

| Zone | Inventory and specific risks |
|---|---|
| North of park | Kantor Pos/Teras Pos, BICAU, Planet Ban, blue office, beige row, ARUM and other northern shops: fence-to-sidewalk contact, open gates, raised garden props, wall/name-panel support, no phantom blockers. |
| West of park | Al-Abror main frontage, rotated prayer hall, canopy, aqua-roof annex, minaret, name wall/gate/mesh fence, southern residences and corner fencing: hall/frontage yaw split, pedestrian continuity, no road overhang. |
| South of park | Pendopo roadside sign/entrances, candi-bentar gates, deep main pavilion, carved posts, connected rear complex, detached offices/motorcycle shelter and the western bend residence fence. Keep fence but move out of public tread if a future survey confirms overlap. |
| East/northeast | SD Islam Al-Abror, SDN 6 Dawuhan, BRI, library/Pramuka, Warung Pojok, Bakti Motor and commercial frontage: separate footprints, no library/Pramuka overlap, open driveway connections. |
| Immediate wider ring | Lapas/Rutan compound, Suzuki–VIAR corner and billboard, southeast junction frontage: true irregular footprint/yaw and no fictional showroom or oversized billboard collision. |
| Remote route | Pasar Mimbaan, Terminal, Stadion Gelora: corrected accessible handoffs, retained mapped building solidity, map-edge reachability and artwork mismatch tracked separately. |

Fidelity corner cases: compare imagery dates before resolving disagreement;
distinguish temporary banners/ceremonial cloth/parked vehicles from permanent
architecture; beware panorama stitching distortion and trees hiding walls;
do not move roads to compensate for building misplacement; document unavailable
panoramas and uncertain façades. Do not commit downloaded Google imagery to
the repository or treat old references as proof of today's appearance.

## 10. Traffic and moving ambient objects

| ID | Pri | Setup and action | Expected result / evidence |
|---|---|---|---|
| TRAF-01 | P1 | Watch north junction through >=6 full signal cycles, both main/cross approaches. | [C/R] Correct phase order, no opposing conflict, no vehicle crossing red/amber stop bar unexpectedly. |
| TRAF-02 | P1 | Follow closely spaced same-lane vehicles, including wrap from end to start. | [R] No overlap, rear-end jump, queue compression or teleport visible at playable location. |
| TRAF-03 | P1 | Inspect turning vehicles, pickups, buses and cargo at inside/outside corners. | [R] Full body clears curbs, poles, median and buildings, not merely vehicle origin. |
| TRAF-04 | P1 | Main green→amber→all-red→cross green; queue near stop line. | [R] No sudden acceleration through red or permanently stuck vehicle after next green. |
| TRAF-05 | P1 | Pedestrians at zebra and unmarked sidewalk sections across cycles. | [R] Routed walkers stay on intended path; no unintended vehicle swept-volume overlap outside designed crossing. |
| TRAF-06 | P1 | Player steps into vehicle/pedestrian path, beside body, then leaves. | [D] Establish whether player/vehicle contact is physical or decorative; no invented health/death mechanic. Always reject trapping/NaN state. |
| TRAF-07 | P1 | Low FPS, focus return and long elapsed time across a phase boundary. | [R] No large position jump into queue/obstacle, contradictory signal or persistent phase desynchronization. |
| TRAF-08 | P2 | Check parked motorcycles/cars and animated props at property edges. | [R] No road/sidewalk obstruction contrary to model intent; consistent shadow/ground contact. |
| TRAF-09 | P2 | Reduced motion on/off, idle title, failure and completion. | [C/D] Record what keeps animating; gameplay and traffic safety unaffected by motion preference. |
| TRAF-10 | P2 | Reload same junction, then long 20-minute observation. | [R] No slowly accumulating phase error, disappearing fleet, animation leak or floating transforms. |

## 11. Camera, player animation and rendering

| ID | Pri | Action | Expected result / evidence |
|---|---|---|---|
| CAM-01 | P1 | Follow straight, reverse and circle in open area at walk/run. | [R] Stable camera-relative steering, smooth recenter, no unexplained spin. |
| CAM-02 | P1 | Back toward wall/fence, stand beside corners and narrow gate, then leave. | [R] Camera avoids opaque geometry, restores distance after escape and never stays compressed. |
| CAM-03 | P1 | Enter/leave public roofed area through intended opening. | [R] Roof/columns do not obscure rider/exit indefinitely; avoid false positives from inside-teleport. |
| CAM-04 | P2 | Thin mesh fence, transparent annex glass, trees and sign backs between camera/rider. | [R/D] Sensible occluder policy, no violent pumping between foreground layers. |
| CAM-05 | P1 | Collision+turn+run at bench, pedestal and building corner. | [R] No camera jitter feedback changing steering into wall; rider remains understandable. |
| CAM-06 | P2 | Resize/orient during close-wall compression and immediately after reset. | [R] Aspect/target/up correct, no stretched canvas or permanently clipped framing. |
| CAM-07 | P2 | Compare cardinal extremes and map boundary. | [R] Correct horizon/up on curved world; no inverted heading or terrain clipping. |
| CAM-08 | P2 | Resize during active round, finish/fail, then inspect stopped overview and restart. | [R] Far-plane/fog/detail state restored correctly; no map disappearing because play-mode resize left a short far plane. |
| CAM-09 | P1 | Oblique roof eave, inside corner, close wall and narrow gate: slowly turn both ways while player-to-camera center ray is clear; repeat portrait, wide and 699/700/701 px widths. | [R] Inspect all four viewport edges/corners, not only rider visibility: no sliced wall/roof revealing exterior/void or one-frame clipping during camera interpolation. |
| ANIM-01 | P2 | Idle→walk→run→brake→idle, including diagonal turns. | [R] Animation follows actual motion; no skating or persistent running after release. |
| ANIM-02 | P2 | Hold direction against solid wall 10 s, then slide and escape. | [R] Blocked/idle blend reflects actual speed; dust not endlessly emitted for stationary motion. |
| ANIM-03 | P2 | Deliver while walking/running, then immediately turn/stop/retry. | [R] Celebration blends and clears, no pose left stuck in next round. |
| REND-01 | P2 | Orbit roofs, coplanar aprons, fences, text and windows at shallow angles. | [R] No z-fighting, missing faces, flashing outlines or incorrect transparency sorting. |
| REND-02 | P2 | Inspect ground contact, shadows and occlusion of each major landmark. | [R] No floating stairs, garden rocks, poles or shadows detached from object. |
| REND-03 | P2 | Small/mobile and high-DPR viewports; zoom in browser. | [C/R] DPR cap respected, text remains readable; no canvas resolution mismatch. |
| REND-04 | P2 | Near/far transition, overview/detail modes where reachable, fog boundary. | [R] No missing landmark, collidable invisible object, duplicate proxy or abrupt broken material. |
| REND-05 | P2 | Toggle OS reduced-motion live and reload both ways. | [R] Less nonessential motion without breaking interaction or leaving stalled required animation. |
| REND-06 | P2 | Repeated start/retry and tab resume under GPU load. | [R] No accumulating materials/textures/geometry, blank frame or broken outline pass. |
| REND-07 | P2 | Move live title/play/result session between different-DPR displays and change browser zoom without reload; also reload as control. | [C/D] Pixel ratio currently set at renderer creation. Record current devicePixelRatio, canvas CSS size and drawing-buffer size; assess dynamic-density adaptation separately from startup cap. No broken input coordinates/aspect; stale sharpness not mislabeled as a navigation bug. |

## 12. HUD, accessibility and responsive layout

| ID | Pri | Action | Expected result / evidence |
|---|---|---|---|
| UI-01 | P1 | Observe letters/time/bonus/next target across all lifecycle states. | [C] Correct synchronized values, no NaN/undefined/stale target after seventh handoff. |
| UI-02 | P2 | Cross distance thresholds around 60/300/1200 m and delivery radius. | [C] Rounded display and proximity words follow implementation; near styling/arrow do not flicker excessively. |
| UI-03 | P2 | Approach overlapping named places, retreat, re-enter and deliver nearby. | [R] Nearby-place card selects coherently, hides correctly, not confused with active delivery. |
| UI-04 | P2 | Trigger toast+boundary notice+nearby card+low-time HUD together. | [R] No occluded controls or unreadable stacking, stale text or inaccessible close/retry button. |
| UI-05 | P1 | Start/results/dev login/editor at every E7/E8 size and orientation. | [R] Primary actions visible/reachable, no horizontal scroll blocking play or clipped mandatory field. |
| UI-06 | P2 | Device notch/safe areas, browser toolbar and keyboard appearing. | [R] Controls remain in reachable visual viewport; no hidden Run/Stop or login submit. |
| UI-07 | P2 | Keyboard-only tab/shift-tab/Enter/Space through available UI. | [R] Visible focus, meaningful order, no focus trap; controls do not accidentally move rider while focused. |
| UI-08 | P2 | Screen reader: title, progress, target, toasts, nearby place, errors and result. | [R] Names/roles coherent, progress announced appropriately, no every-frame announcement flood. Canvas navigation limitations documented. |
| UI-09 | P2 | Inspect button hit regions and labels at smallest screen/200% zoom. | [R] Usable touch targets, no overlap, label and actual hold behavior match. |
| UI-10 | P2 | Contrast/color-vision review of time warnings, route progress and signals. | [R] Essential status not communicated only by color; text distinguishable from scene. |
| UI-11 | P2 | Reduced motion plus zoom plus keyboard navigation. | [R] Accessible settings compose without hidden targets or flashing feedback. |
| UI-12 | P3 | Long landmark names, missing optional semantic name/type, narrow panels. | [R] Text truncates/wraps safely; no raw undefined or layout explosion. Use fixture data only in isolated test environment. |
| UI-13 | P2 | Localization consistency in title, failure, completion, dev login and instructions. | [D] Record mixed Indonesian/English and request language policy; don't call intentional language mixing a functional failure. |
| UI-14 | P2 | Width 479/480/481, 699/700/701, 759/760/761; height 519/520/521. | [C/R] No breakpoint gaps: compact CSS, camera mobile cutoff and touch-hint cutoff differ and all must remain coherent. |
| UI-15 | P2 | Nearby-place distance just below/at/above 80 m; equal-distance places; cross rapidly back/forth. | [C/R] Card threshold/tie behavior stable, no stale name or repeated live-region chatter. |
| UI-16 | P2 | Keyboard activation of visible Run/Stop buttons without pointer events. | [R/D] Test separately from Shift/Space gameplay bindings; pointer-only handlers may leave focusable buttons inoperable. Record accessibility gap honestly. |

## 13. Dev session, settings and local editor (isolated profile)

These are client-side convenience tools, not an established server-authentication
security boundary. Audit exposure carefully without publishing secrets. Do not
use their ability to change state to claim a normal-play test passed.

| ID | Pri | Setup and action | Expected result / risk |
|---|---|---|---|
| DEV-01 | P1 | Fresh normal URL with no dev query/session, then runSpeed=fast alone. | [C] No authenticated editor/settings; normal run speed unaffected by query alone. |
| DEV-02 | P1 | `?dev`, `?dev=1`, and false/0/off variants; vary case. | [C] Request parsing follows supported values; no unintended auto-authentication. |
| DEV-03 | P1 | Empty/whitespace/wrong secret; valid credential through password form. | [C] Wrong fails without starting; valid starts once, masks secret, installs tools once. |
| DEV-04 | P1 | Check gameState.devMode/DEV badge while login pending; attempt editor and gameplay. | [C/D] Current login marks devMode before authentication; verify privileged tooling still absent and decide intended badge semantics. |
| DEV-05 | P1 | Valid query credential through key/devKey, then inspect current URL/history/evidence. | [C/R] Accepted secret scrubbed from current URL; no plaintext in local session/evidence. Initial request/history leakage risk assessed separately. |
| DEV-06 | P1 | Invalid query credential and both aliases present. | [C/R] No bypass; document which alias wins and whether rejected secret remains in URL. Never capture actual secret. |
| DEV-07 | P1 | Reload valid session with dev requested vs ordinary URL. | [C] Dev auto-start only when requested and session valid; ordinary URL remains normal. |
| DEV-08 | P1 | Expired session, wrong version/hash, malformed JSON, missing expiry, null and wrong-type fields in disposable storage. | [R] Invalid sessions rejected safely; specifically test absent/nonfinite expiry rather than assuming schema validation. |
| DEV-09 | P1 | Logout then request dev again; second tab with existing dev session. | [C/D] Stored session cleared for next authentication; decide whether already-open tab must revoke immediately. |
| DEV-10 | P1 | Storage denied/quota full; crypto.subtle unavailable/insecure nonlocalhost origin. | [C/R] No silent bypass/crash; valid page-load login behavior and session persistence limitations reported accurately. |
| DEV-11 | P1 | Rapid duplicate login submits, wrong→right, navigate during async validation. | [R] One start/tool set, deterministic errors, no duplicate forms/listeners. |
| DEV-12 | P2 | Normal/fast setting, query override, reload, invalid values and stored malformed settings. | [C] Query recognized value wins over saved setting; unknown values safe; normal .82 walk unchanged, fast run only in dev. |
| DEV-13 | P1 | Switch fast→normal while running toward wall/perimeter. | [C/R] Speed immediately limited; no tunnel or persisted fast state in normal play. |
| DEV-14 | P2 | Inspect debug APIs available in normal mode. | [D] Document public telemetry/teleport exposure and intended trust model; don't represent client-only secret as protection against code inspection. |
| DEV-15 | P1 | Execute isolated credential-configuration matrix M8: default/configured hash, plaintext with inherited hash, plaintext with matching/different hash. Test form/query login followed by reload. | [C/R/D] Record acceptance and persisted-session validity separately for each credential/configuration. Supported login methods must behave according to the approved credential policy; fallback acceptance and inconsistent reload are not covered by expired-session tests. Never alter deployed credentials or expose secret values. |
| EDIT-01 | P1 | Open/collapse editor after auth; select every listed stop/local object. | [C/R] Correct object highlighted once, no missing/duplicate entry or incorrect bounds. |
| EDIT-02 | P1 | Edit north/east/yaw/scale/visible separately; compare intended object and neighbors, including subsequent frames under EDIT-16/17. | [R] Only intended properties change; editor state and live geometry agree; reset compared with exact pre-editor scene transform, not merely rounded form values. Source rounding and animation interactions are risks to verify, not proven preservation. |
| EDIT-03 | P1 | Negative/zero/huge/blank/nonfinite values; scale below .1/above 8. | [C/R] Scale clamp and finite fallback work; no NaN transforms. Huge finite positions and step limits require explicit review. |
| EDIT-04 | P2 | N/E/S/W buttons with default .25, fractional, zero, negative and oversized step. | [C/R] Axis signs correct, input validation consistent with displayed constraints; no silent unintended movement. |
| EDIT-05 | P1 | Drag/type/press arrows/Space in editor and textarea while rider was moving. | [R] No unintended steering, stuck key or movement behind interaction; pause policy documented, not presumed. |
| EDIT-06 | P1 | Save local→reload; unsaved change→reload; reset selected→reload with/without save. | [C] Saved patch persistence distinguishable from unsaved reset; no misleading confirmation. |
| EDIT-07 | P1 | Reset all in disposable profile, then reload; compare pre-editor geometry snapshot using M6. | [C/R] Stored patch cleared and unrelated settings/session preserved; actual geometry returns to intended original within approved tolerance. Rounded editor originals alone do not prove exact restoration. |
| EDIT-08 | P1 | Export→import round trip in clean disposable profile, then inspect actual geometry after animation frames. | [C/R] IDs/serialized transforms/visibility preserved within documented rounding; no cumulative scale multiplication. Independently verify live bounds/transform agree with imported state using EDIT-16. |
| EDIT-09 | P1 | Import malformed JSON, empty object, wrong edits type, unknown/duplicate IDs, partial entries. | [R] No crash/partial hidden corruption; unknown entries safe; report actual atomicity and unsupported schema. |
| EDIT-10 | P1 | Import wrong version, huge patch, null/nested values and hostile-looking label text. | [R] Safe parsing/rendering, no script execution, bounded responsiveness; identify missing schema checks. |
| EDIT-11 | P2 | Export with clipboard granted/denied/unavailable; select/copy fallback text. | [R] Export accessible and status truthful; optional clipboard absence must not falsely promise a copy. |
| EDIT-12 | P1 | Save/import under storage denial or full quota, then reload. | [R] No false assurance of persisted edits; usable export fallback. Source swallows storage exceptions, so inspect messaging explicitly. |
| EDIT-13 | P1 | Move/rotate/scale/hide a collidable landmark, then probe old/new footprint in isolated dev test. | [C/D] Editor is visual authoring, not promised navigation rebuilder. Record stale collision/handoff as documented limitation; never use edited scene for release navigation acceptance. |
| EDIT-14 | P2 | Reload patch from older build with removed/renamed objects; open two editing tabs. | [R/D] Unknown IDs safe; document last-writer behavior and conflict policy; no silent cross-profile data loss. |
| EDIT-15 | P2 | If an actually selectable object has an active overview proxy, move/scale/hide it, finish/fail→overview→restart, save and reload. | [R] Visual proxy/source agree in placement and visibility, no duplicate old silhouette. Verify path is reachable first; if proxies are disabled or no selected object qualifies, record N/A with source evidence, not an invented failure. |
| EDIT-16 | P1 | Set scale to 1.5 for a stop-group entry and a local-object control; compare field/state and actual scale/world bounds immediately, after two frames, after one second, save/reload and retry. | [R] Accepted visual edit survives normal animation unless an explicit mode restriction is communicated. Ambient stop-scale reset is a source-indicated conflict, not a confirmed runtime result. Use M6 to separate serialized persistence from live-scene correctness. |
| EDIT-17 | P2 | Capture exact initial transform before editor normalization; toggle only visibility twice, then edit only east; reset selected/all and repeat export/import. | [R/D] Untouched position/yaw/scale stay unchanged within approved tolerance; compare actual matrices/bounds, not displayed rounded fields. Report original-entry rounding separately from subsequent form round-tripping using M6. |

## 14. Performance, stability, resilience and data safety

| ID | Pri | Setup and action | Expected result / measurement |
|---|---|---|---|
| PERF-01 | P1 | Cold/warm load on desktop and physical mobile. | [R] Record first usable frame, asset bytes and stalls; set product budgets from real baseline, not invented FPS promises. |
| PERF-02 | P1 | Record 60 s frame timings in dense north junction, mosque, Pendopo, remote streets. | [R] Median/p95/p99 frame time, long stalls, GPU/device details; automation wall time is not FPS. |
| PERF-03 | P1 | 30-minute continuous play/route retries and direction changes. | [R] No crash, degrading controls, monotonic heap/GPU growth or duplicated animation loop. |
| PERF-04 | P2 | Compare idle title/result, foreground play and hidden tab. | [C/R] Render loop not needlessly continuous in stopped states; resource use and resumed correctness measured. |
| PERF-05 | P1 | 20 start/retry cycles plus dev editor open/close in isolated session. | [R] Listener/mesh/material counts settle; no ever-faster timer or growing highlights. |
| PERF-06 | P1 | Physical phone sustained play on battery/battery saver and after heating. | [R] Record thermal degradation and memory reload; no unsafe claim from desktop touch emulation. |
| PERF-07 | P2 | Resize/zoom/orientation rapidly 20 times, including map-edge and roofed poses. | [R] Canvas allocations settle; no blank render, loss of controls or growing memory. |
| PERF-08 | P1 | Network disappears after successful load; return, reload offline, reconnect. | [R/D] Loaded game behavior documented; offline reload support not presumed; online reload recovers. |
| PERF-09 | P1 | Browser back/forward restore, tab discard/reload and renderer crash recovery. | [R] No impossible stale route or controls; clear restart behavior when state cannot be retained. |
| PERF-10 | P1 | Compare actual 30/60/90/120/144 Hz where supported, plus uneven frame pacing: straight movement, partial analog, 90°/180° turn, coasting/brake and radius crossing. | [R/D] Compare equal simulation duration and starting state; record displacement/heading/stopping differences using section 22. Do not infer independence from delta-based code or equate display refresh selection with measured frame cadence. |
| DATA-01 | P1 | Review network requests in normal/dev modes. | [R] No credential leakage to unrelated requests or remote writes; flag URL-secret transport risk without exposing value. |
| DATA-02 | P1 | Inspect storage keys created by game in disposable profile. | [C/R] Only expected session/settings/map edits; reset/logout scope correct; no secret text in exports. |
| DATA-03 | P2 | Invalid/empty map fixture in isolated browser interception, never production data edits. | [R] Missing required geometry/coordinates yields diagnosable failure, not NaN world or fabricated map counts. |
| DATA-04 | P2 | OSM attribution, map coverage and Google-reference documentation. | [R] Attribution retained; screenshots/reference imagery not inadvertently shipped as game assets. |

## 15. High-risk interaction and corner-case checklist

These combinations supplement, not replace, the individual rows. Record the
component IDs in the result so a failure is traceable.

| ID | Pri | Combined scenario | Required invariant |
|---|---|---|---|
| MIX-01 | P1 | Sprint diagonally into narrow rotated gate at low FPS, then reverse. | No tunnel or permanent trapping; exit works. |
| MIX-02 | P1 | Hold joystick+Run, rotate, receive OS interruption, return and release fingers. | No stuck pointer/run state. |
| MIX-03 | P1 | Delivery just before timeout with toast and low-time warning active. | One final outcome, correct bonus/cap and target progression. |
| MIX-04 | P1 | Complete/retry while keydown or pointer capture is active. | Fresh state, one loop, no inherited movement. |
| MIX-05 | P1 | Boundary push beside solid building while camera compressed. | Retreat possible, no out-of-radius displacement. |
| MIX-06 | P1 | Hidden-tab resume during red→green and pedestrian crossing. | No fleet overlap/phase jump; inputs clear. |
| MIX-07 | P2 | Nearby-place + delivery + boundary messages at 320×568/200% zoom. | Required controls and result action reachable. |
| MIX-08 | P1 | Dev fast→normal switch plus collision and held brake. | Finite speed, normal cap, no false handoff. |
| MIX-09 | P1 | Editor import with storage failure, reload and ordinary nondev URL. | No corrupted saved state or unannounced altered normal map. |
| MIX-10 | P2 | Reduced motion changes while entering roofed area and resizing. | Stable camera/controls, no stuck animation or invisible rider. |
| MIX-11 | P1 | Long run across several surface owners and custom/OSM collision seams. | No gradual height drift, falls or phantom transitions. |
| MIX-12 | P1 | Repeated enter/leave old delivery radius while next target lies nearby. | Exactly one award per active target, never repeated previous reward. |

## 16. Prior regression coverage — retain but do not overclaim

Historical QA records report these local fixes and sampled retests. Re-run on
the target release; they are not exhaustive current acceptance certificates.

| Historical item | Reuse these cases | Limits of prior evidence |
|---|---|---|
| Market/Terminal/Stadium handoffs moved outside solid blockers | DEL-01..07, NAV-15 | Local walks after setup; not a whole uninterrupted route |
| Input focus/reset | INPUT-07..09, TOUCH-02..06 | Earlier focus-emulated reproduction corrected; require genuine blur now |
| Garuda visible base/old phantom location | PARK-02 | Local cardinal tests, not whole park loop |
| Postal garden rocks/name-wall grounding | FRONT-04/08, REND-02 | Sampled oblique view and postal gate |
| Teras Pos fence collision | FRONT-01..03, NAV-04/06 | Specific fence, not every fence in town |
| Fixed barrier pedestal | PARK-03 | Animated arm behavior explicitly not covered |
| Message-board posts | PARK-05 | Posts and central/adjacent passages; not every sign |
| West benches | PARK-06/07 | Both faces and south-end bypass manually sampled; full local cardinal geometry checked automatically |
| Southeast monument and frontage geometry | PARK-14, FRONT-05..08 | Geometric validators do not prove current real-world alignment |

### Existing automated checks to pair with future manual execution

Do not run mutation/refresh commands as part of this documentation request.
When execution is authorized, inspect scripts before use and retain outputs.

| Command (repository root) | Intended coverage / limitation |
|---|---|
| `npm --prefix game run build` | Build viability, writes dist; not gameplay proof |
| `npm --prefix game run map:validate` | Map data, road/surface checks; invokes traffic post-hook |
| `npm --prefix game run traffic:validate` | Analytical geometry and vehicle phase/queue simulation; not player/mobile behavior |
| `npm --prefix game run buildings:validate` | Landmark geometry checks; no independent Street View oracle |
| `npm --prefix game run buildings:clearance` | Building/road/sidewalk clearance samples |
| `npm --prefix game run buildings:fence-contact` | Northern fence contact assertions |
| `npm --prefix game run monument:validate` | Southeast monument/junction geometry |
| `node game/scripts/validate-market-delivery.mjs` | Corrected remote handoff geometry; actual route still manual |
| `node game/scripts/validate-input-focus.mjs` | Input lifecycle regression; genuine OS/tab focus still manual |
| `node game/scripts/validate-park-monument.mjs` | Garuda actual-constructor/collider relationship |
| `node game/scripts/validate-postal-garden.mjs` | Postal decoration grounding |
| `node game/scripts/validate-teras-fence.mjs` | Teras fence geometry and neighboring passage |
| `node game/scripts/validate-park-barrier.mjs` | Fixed pedestal only |
| `node game/scripts/validate-park-message-board.mjs` | Post bounds/registration and open passages |
| `node game/scripts/validate-west-benches.mjs` | Oriented footprints, registration, end bypass and south nonduplication |
| `git diff --check` | Whitespace only, not semantic correctness |

## 17. How to execute and record a case

### Minimum result record

```text
Run ID / date / tester:
Case ID + expanded variant (object, approach, device):
Build asset/hash; service URL; normal/dev mode:
Browser/OS/GPU; physical vs emulated; viewport/DPR/zoom:
Storage/profile state; reduced motion; network conditions:
Preconditions (route count/current target, starting pose and heading):
Steps (actual keys/pointers, press/release order and duration):
Expected result and oracle [C/R/D]:
Actual result (positions, state, elapsed simulation time, visible behavior):
Verdict; severity if failed; reproduction count:
Console/network errors; screenshot/video/state evidence paths:
Related issue/fix/build; exact retest and neighboring regression:
Limitations / blocked dependency / product decision needed:
```

Useful read-only telemetry: `window.__tinyMessengerState` and
`window.__tinyMessengerNavigationProbe(theta, phi)`. `__tinyMessengerTeleport`
is a setup mutation, not read-only telemetry; label its use. Compare position
traces and obstacle gaps in addition to `collisionActive`: tangential movement
while that flag is true is not necessarily penetration. Zero speed alone may
come from focus/input loss or a surface step, not the nearby visible object.

Capture before/after with the same build context, viewport, pose and camera
where possible. If collision changes the final pose, say so. Use short clips
for input races, traffic phases and camera jitter. Redact secrets, personal
browser data and unrelated tabs. Keep screenshot paths scoped and do not
remove pre-existing user evidence files.

### Fix verification protocol for a later authorized implementation pass

1. Reproduce and isolate: gameplay bug vs invalid setup vs harness timeout vs
   known editor limitation vs unresolved requirement.
2. Make smallest scoped change, preserving unrelated work; add a regression
   tied to actual geometry/behavior rather than duplicating a magic number.
3. Run relevant validators/build; restart existing 8101 service as requested;
   confirm active/HTTP 200 and actual new asset served, then reload browser.
4. Repeat exact failing case twice, opposite direction/state, and a nearby
   case that must remain unaffected. Run high-risk matrix variants.
5. Update result/issue status with evidence. A code review or validator pass
   alone is not a manually verified fix.

## 18. Decisions and remaining coverage limits

Resolve before using these as strict acceptance criteria:

- Physical player collision with vehicles/pedestrians and the animated arm.
- Which small gazebos/interiors/water areas are intended navigable.
- Wall-clock vs foreground simulation countdown during background/low FPS.
- Target browser/device support and numerical performance budgets.
- Offline/error-screen/context-loss recovery requirements.
- Full accessibility expectations for a visual 3D game and language policy.
- Client-side dev tools' trust model, pending-login badge semantics, session
  revocation across tabs and local editor collision limitations.
- Whether walking-only route completion and desktop/mobile parity in route
  difficulty are required, beyond a valid normal-mode playable route.
- Through-wall proximity delivery, multi-pointer hold semantics and the
  intentional analog-release reset of Run/Stop.

No audio, jumping, inventory, multiplayer, cloud save, leaderboard, minimap,
localization switch or Esc pause feature was established in this source review.
Do not report these as broken existing features. If proposed later, give them
new requirements and cases. Desktop synthetic touch and debug-assisted local
walks are never substitutes for physical multitouch and uninterrupted play.

Release acceptance: no unresolved P0/P1 on supported targets; uninterrupted
seven-stop normal run, genuine timeout/retry, real-mobile input and complete
Alun-Alun loop recorded; every changed system manually retested; blocking
limitations and P2 deferrals explicitly accepted. Geographic fidelity needs
independent dated references, not just successful runtime tests.

No finite list can prove the absence of all bugs. This catalog covers the
discovered systems, their meaningful boundaries and interactions; extend it
with each new feature, failure, device-specific behavior or clarified decision.

## 19. Area execution packs — geometry, mechanics and gameplay

Added 2026-10-02. These packs make the catalog executable by location; they
do not duplicate the complete global suite for every building. Run common
startup/input/lifecycle baselines once per supported environment, then repeat
the relevant stress cases in each area. A new collider type, surface transition,
camera setting or traffic interaction justifies a separate local variant.

### Three separate questions for every pack

| Layer | What the tester establishes | What is NOT sufficient |
|---|---|---|
| Geometry (G) | Footprint, orientation, connected floor, scale, ground contact, clear opening, visual/collider agreement and reference accuracy where evidenced | A screenshot that looks plausible, or a geometry validator using the same incorrect assumptions as the model |
| Mechanics (M) | Movement, collision, camera, input, surface height, triggers and animation actually behave correctly in that geometry | A single stopped position, or teleporting into a space whose entrance cannot be reached |
| Gameplay (P) | A player can understand the intended route, perform the objective, recover from a mistake and leave without external instructions | A developer who knows the coordinates reaching the trigger, or a technically correct collider around an unreadable entrance |

One layer can pass while another fails. A wall may look correct and block
correctly while the target marker misleadingly directs the player into it.
Conversely, easy navigation does not establish real-world architectural fidelity.

### Inventory and execution conventions

- Before running a pack, register its actual entrances, objects and route
  checkpoints using stable names plus current coordinates/screenshot references.
  Boundaries below are landmark-based; do not invent precise coordinates from
  old screenshots. Record any ambiguous overlap between neighboring packs.
- Declare the area's **player promise**: public through-route, delivery
  destination, optional explorable space, decorative scenery or closed property.
  A visible door alone does not promise an enterable interior. Compare this
  declared intent with what first-time players reasonably perceive.
- Each listed object gets a child result, e.g.
  `AREA-C-M/west-bench-2/east-approach/E1`, not one blanket PASS for all benches.
- For genuinely inaccessible faces, record N/A with the physical reason;
  test reachable diagonals/ends instead. Do not teleport into private/solid
  space merely to manufacture four cardinal approach results.
- Each G/M/P row below is a test family. Expand referenced procedures for the
  area's actual risks; record PASS/FAIL/BLOCKED/etc. separately per variant.
- Use an independent visible mesh, map/reference or requirement to check
  colliders. Merely comparing two values derived from the same source is weak
  evidence of correctness.
- First perform discovery without debug overlays or coaching; afterward use
  probes to diagnose. Record wrong turns, repeated wall approaches, camera
  loss, stop-and-search time, successful recovery and real travel time.
- At least one tester unfamiliar with the route should perform gameplay
  discovery where feasible. If only the developer tests, label the familiarity
  bias; do not claim first-time-player usability.
- Do not invent a numeric “fun” score or mandatory discovery-time threshold.
  Record observations and propose an acceptance threshold for approval. A
  technical failure is reproducible; confusing play needs its own evidence.

### Pack A — spawn and first-delivery onboarding

Boundary: normal spawn to first Alun-Alun handoff, including the actual chosen
entrance. Run first; other packs must not conceal an onboarding blocker.
References: BOOT-01..05, INPUT-01..06, DEL-01/06/07, UI-01/07.

| ID | Pri | Layer and test | Expected result / evidence |
|---|---|---|---|
| AREA-A-G | P1 | Inspect spawn clearance, visible entrance, nearby floor and target sightline at normal camera height. | [R] Spawn outside solids; continuous visible ground and at least one legitimate access path; no geometry hides the only entrance. |
| AREA-A-M | P1 | From fresh Start walk, turn, run, brake and cross entry surface to first handoff; repeat after Retry/Walk Again. | [C/R] Controls, camera, handoff and reset work without setup assistance; no inherited collision/input state. |
| AREA-A-P | P1 | Uncoached player starts and attempts first delivery, then identifies next objective. | [R] Instructions and cues support finding access and recognizing delivery/next target; record hesitation and wrong wall approaches, not only success. |
| AREA-A-R | P1 | Walk spawn→entrance→handoff→exit toward Gazebo, without teleport. | [R] Complete local journey and recover from one ordinary wrong turn; do not force a particular route if another legitimate path works. |

### Pack B — northern entrances, traffic junction and shop frontages

Boundary: north park entrance connections, relevant junction approaches,
crossing and opposite properties. Inventory Kantor Pos/Teras Pos, BICAU,
Planet Ban, blue office, beige row, ARUM, gates, driveways and fence endpoints.
References: FRONT-01..08, PARK-03..05, TRAF-01..07, NAV-06/07/11, CAM-02/04.

| ID | Pri | Layer and test | Expected result / evidence |
|---|---|---|---|
| AREA-B-G | P1 | Trace road edge→curb→pedestrian tread→property fence for every frontage; inspect entry board/pedestal and crossing alignment. | [R] No property object occupies public tread/carriageway; no floating frontage pieces; actual crossing connects its two ends. Geographic accuracy receives a separate reference verdict. |
| AREA-B-M | P1 | Test each fence endpoint/gate, pedestal, both board posts and middle gap; observe complete signal cycles during crossing. | [R] Solids block, openings remain clear, camera recovers, traffic swept bodies/queues behave consistently. Moving-arm/contact policy remains [D] until resolved. |
| AREA-B-P | P1 | Approach from park and opposite frontage without coaching; identify a crossing and gate; choose an alternate route if apparently closed. | [R/D] Crossing/gate cues legible; no unavoidable unsafe-looking detour due to phantom geometry. Decorative traffic must not be presented as a proven physical hazard mechanic. |
| AREA-B-R | P1 | Park entrance→designated crossing→north frontage→postal gate and back→crossing→park. | [R] Walk both directions continuously; separately record each inaccessible/private property rather than demanding entry to all shops. |

### Pack C — park interior and west/south promenade

Boundary: ceramic ring, connecting interior paths, Garuda, fountain, benches,
small gazebos, trees, lamp posts, planters and open paths. References:
PARK-01/02/06..13/16/17, NAV-02/08..11/19, CAM-01..05, ANIM-01..03.

| ID | Pri | Layer and test | Expected result / evidence |
|---|---|---|---|
| AREA-C-G | P1 | Inventory every path junction and prop; inspect mesh/footprint, surface holes, raised bases, overhead clearance and adjacent walking width. | [R] Connected floors match visible paths; no invisible deck over a basin or oversized collider consuming a passage. |
| AREA-C-M | P1 | Expand face/corner/slide/escape tests for every bench/base/post and fountain; test each intended gazebo approach and surface transition. | [R] No tunneling, sticky corner, one-way trap or camera lock; do not mark unspecified gazebo interiors as required access. |
| AREA-C-P | P2 | Ask player to circle the park, reach two visible landmarks and retrace an accidental dead end. | [R] Landmarks aid orientation; obstacles and traversable paths are understandable; record repetitive snagging even if eventual escape is possible. |
| AREA-C-R | P1 | Full clockwise and counterclockwise promenade loops plus paths across interior, starting/ending at a recognizable entrance. | [R] No teleport or forced carriageway excursion; child results cover both loop directions and each connecting path. |

### Pack D — Al-Abror, west frontage and southern residential compound

Boundary: public west sidewalk, mosque frontage/gate/canopy/annex, intended
courtyard access, rotated hall edges and neighboring southern residences.
References: FRONT-01..08, NAV-01..11, CAM-02..05, DEL-01..06/13.

| ID | Pri | Layer and test | Expected result / evidence |
|---|---|---|---|
| AREA-D-G | P1 | Inspect road-aligned frontage versus rotated hall, annex joints, minaret base, name wall, gates and retained mapped footprints. | [R] No duplicate OSM geometry, detached/attached mismatch, blocked sidewalk or imaginary rectangular courtyard collider; survey uncertainty explicit. |
| AREA-D-M | P1 | Enter/exit intended access, pass canopy columns, test wall corners and gate ends, then make active mosque handoff. | [R] Correct floor/collision/camera agreement and reachable handoff from public route; no requirement to penetrate prayer-hall wall. |
| AREA-D-P | P1 | Arrive from Gazebo with mosque active; follow visible cues, attempt an obvious wrong side, then find proper approach. | [R] Handoff and entrance understandable without coordinates; wrong approach recoverable; record proximity-through-wall behavior separately. |
| AREA-D-R | P1 | Park west path→mosque handoff→public west sidewalk→southbound exit toward Pendopo. | [R] Arrival and departure both work; handoff success alone cannot certify access through the frontage. |

### Pack E — public Gazebo and southern crossing

Boundary: public Gazebo approach, broad stairs/platform/columns, surrounding
park paths and crossing connection toward Pendopo. References: PARK-10/12/17,
NAV-07..10, DEL-01..06, CAM-03/05, FRONT-08.

| ID | Pri | Layer and test | Expected result / evidence |
|---|---|---|---|
| AREA-E-G | P1 | Inspect stairs, floor heights, columns, overhead roof, platform edges and curb/crossing joins. | [R] Visible entry corresponds to continuous intended floor; columns/roof not substituted by an opaque full pavilion collider. |
| AREA-E-M | P1 | Approach stairs obliquely/straight, pass columns, deliver, walk back out; test platform edge retreat. | [R] Legal step traversal and stable camera; no accidental trapping from absolute height-change checks. |
| AREA-E-P | P1 | Approach with Gazebo active and distinguish it from small park gazebos and Pendopo's pavilion. | [R] Target name/marker leads to correct landmark; delivery feedback and next objective prevent identity confusion. |
| AREA-E-R | P1 | Alun-Alun handoff→Gazebo handoff→exit toward Al-Abror; separately test the south crossing to Pendopo. | [R] Delivery-order leg and geographic shortcut tested separately, neither assumed from a local teleport. |

### Pack F — Pendopo compound and west-bend residence fence

Boundary: roadside entrances/sign, compound route to deep pavilion, detached
offices/shelter, intended rear-access paths, and western bend public sidewalk.
References: FRONT-01..08, NAV-01..11, CAM-02..05, DEL-01..06/13.

| ID | Pri | Layer and test | Expected result / evidence |
|---|---|---|---|
| AREA-F-G | P1 | Inspect entrance setback, deep pavilion placement, roof/column alignment, rear complex and detached footprints; trace west-bend fence against tread. | [R] No old wing/pavilion phantom footprint, duplicate building, floating column or road intrusion; fence preserved, not removed to manufacture a pass. |
| AREA-F-M | P1 | Walk intended gate→pavilion→exit; test posts, steps, veranda and side passages; sweep old displaced footprint. | [R] Gate/floor/camera connections work; solid private structures remain solid; unresolved interior-access design recorded rather than guessed. |
| AREA-F-P | P1 | Arrive with Pendopo active; distinguish roadside delivery location from visible pavilion destination; find return to public road. | [R/D] Delivery and exploration cues not contradictory; do not require entering the deep pavilion if handoff is intentionally roadside. |
| AREA-F-R | P1 | West public approach→west bend→Pendopo gate/handoff→east public exit toward Market; optional compound exploration as separate route. | [R] Main delivery route never depends on an unapproved private-interior shortcut; both entry and departure verified. |

### Pack G — east schools, civic/commercial frontage and immediate ring

Boundary: eastern public paths, SD Islam Al-Abror, SDN 6, library/Pramuka,
BRI, Warung Pojok, Bakti Motor and connections to Lapas/Rutan, Suzuki–VIAR
and other named ring properties. Run a separate child itinerary for each
disconnected frontage; this grouping is not proof they form one direct path.
References: FRONT-01..08, NAV-01..11, CAM-02/04, UI-03/12/15.

| ID | Pri | Layer and test | Expected result / evidence |
|---|---|---|---|
| AREA-G-G | P1 | Compare each replacement footprint, frontage order and gate with retained OSM geometry; inspect library/Pramuka separation and irregular Suzuki corner. | [R] No merged unrelated properties, generic overlap or sign/roof consuming public clearance; each property receives its own result. |
| AREA-G-M | P1 | Traverse each public frontage, driveway join and fence endpoint both ways; test representative concave/rotated replacement corners. | [R] Continuous public tread; gate policies respected; no mapped/custom seam hole or invisible barrier. |
| AREA-G-P | P2 | Navigate around ring using visible landmarks and nearby-place cards without a delivery marker at every building. | [R] Decorative landmarks not misleadingly presented as mandatory objectives; cards and geometry support orientation rather than false destinations. |
| AREA-G-R | P1 | East entrance→east frontage itinerary→southeast approach; separate public-access circuits for remote ring properties. | [R] Every itinerary names start/end/checkpoints and actually walked connectors; no blanket PASS based on one shop. |

### Pack H — southeast tugu and three-way junction

Boundary: monument/island, all junction branches, four sidewalk returns,
adjacent frontage and connecting south/east pedestrian approaches.
References: PARK-14/18, NAV-06/07/11, FRONT-05..08, TRAF-03, CAM-02/07.

| ID | Pri | Layer and test | Expected result / evidence |
|---|---|---|---|
| AREA-H-G | P1 | Inspect island/monument relationship, each road branch, curb return and frontage apron from street level and plan view. | [R] No hole/duplicate wedge, blocked branch or displaced collider. “Centered” must be checked against surveyed island/junction geometry, not screen composition. |
| AREA-H-M | P1 | Approach base from available sides, circle accessible perimeter, traverse each pedestrian return both ways; observe long vehicle clearance. | [R] Solid base, usable connected footways, no seam snag or vehicle body intersecting island/monument. |
| AREA-H-P | P1 | Uncoached player approaches from south and east, chooses a route around junction, takes wrong branch then recovers. | [R] Branch choice and safe-looking path readable; landmark aids orientation without directing player into an inaccessible island. |
| AREA-H-R | P1 | South path→junction pedestrian connection→east path and reverse; test remaining intended branch connection separately. | [R] All intended branch-to-branch pedestrian connections recorded, not just four base collision samples. |

### Pack I — Market and Terminal destination neighborhoods

Two subpacks: Market and Terminal. Each includes approach street, handoff,
neighboring collision envelope and departure path. Do not combine their
results. References: DEL-01..06/12/13, NAV-01/05/11/15, CAM-02, UI-02.

| ID | Pri | Layer and test | Expected result / evidence |
|---|---|---|---|
| AREA-I-G | P1 | For each destination compare marker/handoff with visible building and retained OSM collision; inspect approach and open space around corrected point. | [R] Handoff outside solid obstacle and associated with correct destination; artwork mismatch distinguished from mechanical reachability. |
| AREA-I-M | P1 | Active handoff from each legal approach; linger/re-enter; turn and depart toward next target. | [C/R] Exactly one reward; building remains solid; correction does not globally remove collision to make delivery work. |
| AREA-I-P | P1 | Arrive from previous stop using normal cues, locate handoff and understand next leg. | [R] Player need not search an unmarked offset position or repeatedly run into façade; departure cue points toward achievable route. |
| AREA-I-R | P1 | Pendopo→Market→Terminal, continuous normal play. | [R] Both long connectors and both destination neighborhoods work; record detours and time budget rather than only endpoint success. |

### Pack J — Stadium and outer map boundary

Boundary: Stadium approach/handoff plus nearby outer-radius paths; boundary
behavior additionally sampled in eight sectors under NAV-13/14.
References: NAV-13..17, DEL-01/07/09/10, CAM-07, TIME-06.

| ID | Pri | Layer and test | Expected result / evidence |
|---|---|---|---|
| AREA-J-G | P1 | Inspect stadium geometry, accessible handoff and clipped terrain/roads near perimeter. | [R] Objective and legal approach inside playable area; no visible route promising access through abruptly missing ground. |
| AREA-J-M | P1 | Deliver seventh letter by legal approach; test boundary contact/recovery separately before final delivery. | [C/R] Boundary does not block objective; result state stops input/rewards and offers clean restart. |
| AREA-J-P | P1 | Player completes Terminal→Stadium without coordinates or dev speed. | [R] Long leg remains understandable and feasible; log remaining time, disorientation and unnecessary detours. |
| AREA-J-R | P1 | Terminal→Stadium→completion→Walk Again. In separate nonfinal-target exploration, walk from stadium vicinity back inward. | [R] Completion and boundary retreat both exercised without attempting movement on intentionally stopped result screen. |

### Pack K — ordinary districts, alleys, bridges and connecting roads

Boundary: non-landmark map outside above packs. Use **risk-stratified samples**:
near/mid/far radius, cardinal sectors, rotated/concave buildings, narrow alleys,
bridges/waterways and mixed custom/OSM boundaries. Full route corridors are
mandatory, while every generic building need not receive identical testing.
References: NAV-01..19, CAM-02/07, PERF-02/03, FRONT-01/03/04.

| ID | Pri | Layer and test | Expected result / evidence |
|---|---|---|---|
| AREA-K-G | P2 | Inspect each sampled topology and all required route connectors: floor/bridge continuity, footprint/road relationship, batched near/far visibility. | [R] Samples represent distinct risks; no holes, visual-only walkable bridge, road-blocking building or invisible retained collider. |
| AREA-K-M | P1 | Walk/run selected alleys/bridge approaches and concave corners; reverse out, including low-FPS sample. | [R] No solver trap, tunneling, seam fall or unexplained height discontinuity. |
| AREA-K-P | P2 | Make a deliberate wrong turn on long delivery leg, then recover using game cues only. | [R] Recovery is practical without debug map/teleport; record dead-end length, orientation loss and timer cost. |
| AREA-K-R | P1 | Walk each actual inter-destination corridor continuously, then selected alternative route segments. | [R] Endpoint tests cannot hide disconnected corridors; sampling limitations and unsampled neighborhoods explicitly listed. |

## 20. Cross-area journeys and gameplay evaluation

These tests use normal mode, clean map state and real movement. No teleport,
counter editing, dev speed, or externally supplied coordinates during the run.
Diagnostic inspection can follow a failure; preserve the original record.

| ID | Pri | Journey / procedure | Acceptance or observation |
|---|---|---|---|
| JOURNEY-01 | P0 | Fresh start→all seven deliveries→Route Complete→Walk Again. | [C/R] Correct order/rewards, no softlock, normal time budget feasible, full reset; record every area's entry/exit and all route legs. |
| JOURNEY-02 | P1 | Clockwise then counterclockwise public loop linking north, west, south and east park edges. | [R] Actual connectors and crossings work both directions, not only interior perimeter; local gate PASS cannot substitute. |
| JOURNEY-03 | P1 | Guided-to-unguided comparison: unfamiliar player completes first three deliveries; experienced player repeats independently. | [R] Separate discoverability from technical feasibility; log coaching if needed and don't mark unassisted pass. |
| JOURNEY-04 | P1 | Full normal route with deliberate recoverable wrong turns at one frontage and one distant connector. | [R/D] No irrecoverable trap; measure recovery cost and remaining time. Acceptable error tolerance is a tuning decision, not automatically a guaranteed win. |
| JOURNEY-05 | P1 | Physical mobile route, then desktop route, same intended checkpoints. | [R] Both technically achievable; compare camera loss, accidental inputs, path precision and time—not identical timings. |
| JOURNEY-06 | P1 | While traveling, lose real focus, return, stop, resume and finish the current leg. | [R] Safe input recovery does not leave player trapped or camera unusable; record timer policy separately. |
| JOURNEY-07 | P1 | Reach partial progress naturally, allow timeout, Retry and complete first two stops. | [C/R] Failure feedback explains result; clean restart restores playable objective flow. |
| JOURNEY-08 | P2 | Sustained exploration of park and compounds using only intended access, then return to active objective. | [R/D] No trap or unreadable return route; measure exploration cost. Do not assume timer pauses or exploration-only mode exists. |
| JOURNEY-09 | P1 | After a local geometry/mechanics fix, cross its area boundary into each neighboring affected corridor. | [R] Fix does not move problem to next gate/curb/camera transition; test old footprint and adjacent clear paths. |
| JOURNEY-10 | P2 | Observe a first-time player's choice of crossings, stairs, gates and apparent shortcuts. Ask for reasoning after—not during—the attempt. | [R/D] Capture visual affordance mismatches and expectation failures; distinguish desired future mechanics from defects in existing ones. |

### Gameplay observations to record per area and journey

- **Objective clarity:** what did the player think they needed to do; did the
  marker, name and visible destination agree?
- **Route readability:** where did they search, turn back, hit a wall, miss a
  gate or choose a nontraversable surface that looked traversable?
- **Control feel:** overshoot, repeated snagging, camera-induced steering
  mistakes and precision required at normal walking/running speeds.
- **Feedback:** whether delivery, blocking, boundary restriction, timeout and
  restart were understood without reading debug state.
- **Recovery:** whether an ordinary mistake could be corrected with existing
  controls, without teleport/reload or insider route knowledge.
- **Pacing:** travel time, time spent searching versus moving, repeated empty
  stretches, timer pressure and remaining budget at each delivery.
- **Fairness/consistency:** visually similar passages and props should behave
  consistently or clearly signal a difference. Do not equate stricter
  collision, more obstacles, or exact real-world detail with better gameplay.

Record a usability concern separately from its suspected implementation cause.
A clear game cue can intentionally differ from real-world access, but that
tradeoff needs an explicit decision—not a covert road/building edit during QA.

## 21. Area signoff and coverage accounting

Use one row per pack/subpack and build. For Pack B/G/I, expand named properties
or destinations as children. List actual test variants; never count one generic
“all fences passed” statement as object coverage.

| Pack/subpack | Build | Geometry | Mechanics | Gameplay | Continuous route | Device variants | Open defects/decisions | Evidence / uncovered inventory |
|---|---|---|---|---|---|---|---|---|
| A — spawn/onboarding | unselected | NOT RUN | NOT RUN | NOT RUN | NOT RUN | E1, E5/E6 pending | — | INV-A01, C01 |
| B — north entrances/frontages | unselected | NOT RUN | NOT RUN | NOT RUN | NOT RUN | E1, E5/E6 pending | arm/contact policy | INV-B01..B10 |
| C — interior/promenade | unselected | NOT RUN | NOT RUN | NOT RUN | NOT RUN | E1, E5/E6 pending | small-gazebo access | INV-C01..C13 |
| D — mosque/west frontage | unselected | NOT RUN | NOT RUN | NOT RUN | NOT RUN | E1, E5/E6 pending | interior-access policy | INV-D01..D03 |
| E — public Gazebo | unselected | NOT RUN | NOT RUN | NOT RUN | NOT RUN | E1, E5/E6 pending | platform-edge intent | INV-E01 |
| F — Pendopo/south frontage | unselected | NOT RUN | NOT RUN | NOT RUN | NOT RUN | E1, E5/E6 pending | compound access | INV-F01..F04 |
| G — east/immediate ring | unselected | NOT RUN | NOT RUN | NOT RUN | NOT RUN | E1, E5/E6 pending | split property children | INV-G01..G10 |
| I-Market | unselected | NOT RUN | NOT RUN | NOT RUN | NOT RUN | E1, E5/E6 pending | — | INV-I01 |
| I-Terminal | unselected | NOT RUN | NOT RUN | NOT RUN | NOT RUN | E1, E5/E6 pending | — | INV-I02 |
| H — southeast junction | unselected | NOT RUN | NOT RUN | NOT RUN | NOT RUN | E1, E5/E6 pending | dated survey comparison | INV-H01..H03 |
| J — Stadium/perimeter | unselected | NOT RUN | NOT RUN | NOT RUN | NOT RUN | E1, E5/E6 pending | boundary samples not located | INV-J01, K04 |
| K — connecting districts | unselected | NOT RUN | NOT RUN | NOT RUN | NOT RUN | E1, E5/E6 pending | sample selection incomplete | INV-K01..K04 |

An area is ready for signoff only when:

1. Its boundary, object/entrance inventory, intended-access policy and actual
   checkpoint routes are recorded; excluded private interiors are explicit.
2. G, M and P results exist independently. Missing reference imagery means
   geographic fidelity is UNKNOWN/NEEDS DECISION, not an inferred PASS.
3. All required local P0/P1 variants pass on the candidate build, plus at least
   one continuous arrival→interaction/handoff→departure route and reverse
   access where intended. Every failed case has a verified fix or explicit
   accepted disposition; unresolved blockers prevent signoff.
4. Shared-system stress variants relevant to the area have run, including
   physical touch precision/camera where required. Unavailable devices remain
   BLOCKED or explicitly deferred, not “covered by emulation.”
5. Adjacent-area connectors and negative controls pass; no fix simply shifts
   a fence/blocker onto a different sidewalk, route or delivery point.
6. P2 deferrals, subjective gameplay concerns, sampling limits and product
   decisions are visible to the reviewer. A technical PASS cannot erase a
   discoverability failure or unverified geometry claim.

Track **executed variants / required variants**, with separate counts for
PASS, FAIL, BLOCKED, INCONCLUSIVE and NOT RUN. Keep N/A with a reason and do not
include it as a pass. Report G/M/P and continuous-route coverage separately;
neither raw ID count nor “percentage of map visited” measures test completeness.
Sampling generic districts is acceptable when the chosen risks and remaining
uncertainty are stated. All seven objective paths and Alun-Alun's named critical
entrances require explicit coverage, not random sampling.

## 22. Audit measurement protocols and exact expected behavior

These procedures sharpen existing cases; they are not claims that measurements
have been collected. Sources: `player/movement.js` (input mixing, nonlinear
response, damping and substeps), `world/geospatial-world.js` (40 m index),
`navigation/navigation.js` (absolute step-height restriction),
`camera/controller.js` (desired/current camera rays and resize), and
`rendering/renderer.js` (initial pixel ratio).

### M1 — combined keyboard/analog input (TOUCH-09)

Express vectors in movement coordinates: +X=right, +Y=forward. The raw pointer
Y sign is inverted by movement code. Camera-relative direction remains the
reference; measure from a settled camera/heading before comparing.

| Keyboard vector | Analog movement vector | Combined vector before radial response | Required observation |
|---|---|---|---|
| (0,1) | (0,1) | (0,1) after axis clamp | Forward saturates, not double speed |
| (0,-1) | (0,1) | (0,0) | Opposing full inputs cancel |
| (0,-1) | (0,.5) | (0,-.5) | Partial backward magnitude, not keyboard-priority full backward |
| (1,0) | (0,.5) | (1,.5) | Diagonal direction; radial magnitude caps at 1 |
| (1,0) | (-.5,0) | (.5,0) | Partial right motion |
| (0,1), still held | analog pointer released | (0,1) | Keyboard persists; pointer release must not clear keyboard |
| any held key | analog still held after key release | remaining analog only | Analog remains active |
| any combination | genuine blur/hidden/start-reset | (0,0) after lifecycle reset | Both cleared; fresh input required |

For every row, record raw input values, resulting direction, settled speed,
release order and collision-free starting pose. Button-run/brake interactions
remain separate TOUCH-03/04/13/14 cases; do not conflate pointer release's Run
reset with cancellation of independently held keyboard keys.

### M2 — analog response, coasting and braking

For TOUCH-15 let `m` be radial magnitude after axis clamp and radial cap.
Current source-backed steady-state target-speed factor is:

```text
m < .1: inactive
m >= .1: f = ((m - .1) / .9)^1.18
walk target speed = .82 * f
normal run target speed = 1.64 * f
authenticated fast-run target speed = 6.4 * f
```

At exactly `.1`, factor is zero even though the input-active branch may be
selected. Do not incorrectly require movement at that exact threshold. Compare
cardinal and diagonal inputs with equal radial magnitude. Run partial-strength
tests long enough to observe acceleration settling; compare against target,
not an assumed immediate jump to steady speed.

Keep these measurements distinct (TOUCH-16/17):

| Quantity | Meaning and limitation |
|---|---|
| Formula target speed | Desired steady-state speed from input magnitude; not measured travel |
| `rider.speed` | Damped simulation speed; can be nonzero even when translation is skipped or blocked |
| Coordinate displacement | Direct change in theta/phi over known simulation time; inspect in world units/metres, avoiding a second angle-based calculation that repeats telemetry precision loss |
| `rider.actualSpeed` | Derived from angle between successive normalized surface positions; extremely small angular changes may lose precision |
| Animation / heading / camera | Visible response, which must be compared against actual displacement, not approved merely because the input-active flag is true |

The movement loop skips translation when `abs(rider.speed * delta) <= .000001`.
Consequently, just-above-deadzone target speeds may not produce translation at
all tested cadences. For a settled clear-ground diagnostic, the predicted
cutoff satisfies `targetSpeed * delta = .000001`; sample on either side using
the **measured** delta and speed, not only nominal monitor refresh. Acceleration,
collision and floating-point error can affect observations. Record them rather
than treating this analytical cutoff as a measured result.

Use a fine sweep around .1 and the calculated cutoff, alongside the existing
coarse 10/25/50/75/100% tests. Physical-pointer tests and precisely controlled
input diagnostics are separate evidence: do not claim hand-controlled input
can reliably hit four-decimal magnitudes. If precise input requires a future
instrumented harness, label the result controlled—not manual gameplay proof.

At exactly .1, the zero vector with `active=true` can still affect desired
heading and camera follow logic. Test after a turn, when rider and camera
headings are not aligned; record `inputActive`, desired/actual heading,
recenter state, displacement and animation through TOUCH-17's threshold
sequence. This distinguishes harmless zero-speed input from an unwanted pivot
or camera oscillation. No new heading policy is assumed by this document.
Run fine-input trials from rest and after motion: below-deadzone residual
coasting is not automatically input leakage. Accumulate coordinate travel over
a defined simulation duration; do not require every tiny-motion telemetry
channel to report a nonzero value on every frame.

For INPUT-16, use the same clear starting pose and settled initial speed for
release-only and brake trials. Record initial speed, input-release/brake frame,
simulation elapsed time, travelled distance and time to the measurement cutoff.
Use `speed <= .001 world units/s` as an **operational measurement cutoff**, not
a new gameplay requirement, and retain the raw trace. Repeat at least three
times per condition; use medians and ranges to reveal noise. Brake should
decelerate faster than release under equivalent frame conditions. Test normal
walking and running before dev-fast, which is a separate diagnostic variant.

Near gates/curbs/handoffs, additionally record whether ordinary stopping causes
unavoidable overshoot or makes a legal route impractical. Do not interpret
intentional damping as a sticky-input bug; do not excuse collision penetration
because the character was coasting.

### M3 — frame-rate comparison (PERF-10)

1. Record actual frame intervals, hardware, refresh configuration, simulation
   duration and wall time. A 144 Hz monitor does not prove 144 rendered FPS.
2. Start from the same unobstructed position, heading, camera and settled speed.
   Compare straight travel over 5 simulation seconds, partial-analog travel,
   90°/180° turns, release/brake, then thin-obstacle and handoff crossings.
3. Repeat three times at each supported cadence. Include an uneven cadence
   diagnostic; any future instrumented timestep driver must be clearly marked
   as a controlled simulation test, not a physical-device manual result.
4. Record distance, final heading, stop time/distance, collisions and reward
   count. Report absolute differences plus percentage difference against the
   60 Hz baseline when the denominator is nonzero.
5. Zero tolerance for an otherwise identical legal route becoming impassable,
   a solid being crossed, duplicated reward, NaN state or unrecoverable trap.
   Numerical motion-equivalence tolerances need baseline measurements and
   product approval; until assigned, report measurements with NEEDS DECISION
   rather than claiming arbitrary percentage differences pass or fail.

### M4 — geometry/collision and camera acceptance

- **Step access:** label each tested edge stair/ramp/intended step, deliberately
  closed drop, or unknown. Test below/at/above .055 in both ascent and descent
  using actual measured surface heights. For unknown intent, report the
  observed source behavior separately from the access-design decision.
- **Grid boundary:** index size is 40 metres = 8 world units. East metres are
  `theta*5`; north metres are `-phi*5`. Enumerate actual mapped footprints near
  selected positive and negative cell boundaries. Never synthesize a building
  merely to satisfy an execution checklist without labelling it a fixture.
- **Chained correction:** inspect final signed gaps against all relevant nearby
  solid footprints, including the neighboring cell, not only initially queried
  candidates. Record maximum penetration and persistent oscillation. Set a
  numerical tolerance from the actual geometry/projection precision before
  signoff; camera screenshots alone do not resolve subpixel penetration.
- **Camera edges:** inspect the full frame and a short video while turning
  slowly; center-ray `obstructed=false` is diagnostic information, not proof
  that the near-plane corners avoid geometry. Record pose, viewport/FOV and
  which screen edge clips. A normal visible opening is not a rendering hole.
- **Live DPR:** record `devicePixelRatio`, `canvas.getBoundingClientRect()`,
  canvas width/height and current renderer pixel ratio when available. The
  startup cap is 1.5; dynamic reapplication is a separate policy decision.
  Compare live transition with fresh reload on the destination display.

### M5 — evidence validity and pass criteria

Every quantitative result needs units, sampling method and cutoff/tolerance.
Every subjective gameplay result needs the task given to the player, familiarity,
observations and assistance provided. If no approved usability/performance
budget exists, record a baseline and issue a decision request; do not convert
an unknown threshold into PASS. No synthetic-input or controlled-delta result
substitutes for a real-device control-feel test.

### M6 — editor state versus actual geometry (EDIT-16/17)

Sources: `devtools/map-editor.js` entry construction, `applyEntryState`,
`syncFieldsFromState` and `stateFromFields`; `animation/ambient.js` stop loop.
The editor applies a scale multiplier while the stop animation loop sets
`stop.group.scale` back to `stop.baseScale`. This is a **source-indicated
conflict** requiring execution evidence, not a newly confirmed browser bug.

1. Use a disposable profile with no saved patch. Select one stop-group entry
   and one local editable object as separate variants; do not infer the local
   object's result from the stop-group result.
2. Capture exact source/live position, quaternion or yaw, scale, world matrix
   and stable mesh bounds **before normalization**. The editor's `original`
   record already rounds values, so it is not an independent exact baseline.
   If this baseline is not exposed, use an explicitly authorized isolated
   diagnostic harness; record missing observability as BLOCKED instead of
   substituting the rounded form as truth.
3. Set scale 1.5 using the UI. Observe the input value, stored editor state,
   actual transform and bounds at application, after two rendered frames and
   after one second. Exclude naturally animated cloth/marker bounds or compare
   a stable mesh/animation phase. A correct saved JSON value is not enough.
4. Save/reload, then retry after an ordinary terminal state. Repeat the same
   observations. Keep unsaved-state behavior separate from saved persistence.
   Never force completion counters to claim a normal lifecycle pass.
5. From clean state, toggle only visibility twice. Verify untouched position,
   orientation and scale. Repeat changing only east, then Reset item, Reset all
   and reload; also repeat the EDIT-08 export/import round trip. For spherical
   stops compare geographic state and object transform; north/east fields are
   not directly equivalent to scene XYZ. Distinguish initial three-decimal normalization, displayed yaw
   rounding and scale rounding from later input-induced drift.
6. Record numerical differences and visible effects against the independent
   baseline. Product must choose exact preservation or an explicit transform
   tolerance; absent that decision, report the discrepancy and NEEDS DECISION.
   An edit immediately overwritten by another subsystem must not be passed
   just because the input box still displays the requested value.

These checks concern live visual editing. The documented lack of navigation
rebuilding does not excuse lost visual changes or unrelated transform changes.

### M7 — narrow surface crossing between samples (NAV-22)

Sources: `player/movement.js` substeps and
`navigation/navigation.js:surfaceTransitionIsBlocked`. Height comparison uses
the previous and next positions. A strip/hole entered and exited between those
positions needs its own test; thin solid-wall collision tests exercise a
different mechanism and cannot substitute.

- Find real raised strips or holes with measured intervening height change
  exceeding .055 and record their intended access policy. If the production
  map has no suitable feature, mark the production variant N/A with evidence;
  any synthetic fixture is separately authorized and separately reported.
- Record feature width along the actual travel direction, not merely an
  axis-aligned bounding-box width. Include widths below/at/above .025 where
  available and record effective `stepDistance` for each trial; .025 is a
  maximum, not a constant step length.
- Repeat from multiple initial offsets that cause a sample to land before,
  inside and beyond the feature; repeat frontal/oblique and walk/run at
  measured cadences in both directions. Include below/at/above-step-height
  controls and widths around actual substep length as well as the .025 maximum.
  No safe-spawn/feature coordinates are invented here.
- For a trench/hole verify the effective navigation height really decreases;
  highest-floor composition can mask a lower surface. Isolate surface-height
  behavior from a coincident solid collider; a wall stopping the character
  does not prove the height-transition check detected the narrow feature.
- Capture previous/next positions, sampled heights, crossed interval, actual
  path and collision outcome. Equal endpoint heights do not prove the entire
  intervening path was legal.
- Separate algorithmic consistency from player intent: traversing a deliberately
  decorative groove is not necessarily a gameplay bug. An intended barrier,
  hazard boundary or required floor transition behaving differently solely
  with sampling alignment is a substantive finding requiring investigation.

### M8 — credential configuration and reload matrix (DEV-15)

This matrix is for a **future authorized isolated-build test**, not permission
to edit production environment variables, rotate real credentials, rebuild
the deployed service or expose secrets. Use throwaway test credentials and
disposable storage; identify credentials only by labels A/B in evidence.
Session fingerprints can also enable authentication in this client-side design:
do not publish raw fingerprints/session payloads, secret-bearing URLs or HARs.
Record only sanitized acceptance, version and expiry outcomes.
No build, authentication attempt or credential change was performed while
writing this plan.

Source facts: `validateSecret` accepts a configured plaintext match or the
active hash match. `getExpectedSecretFingerprint` instead prefers the plaintext
fingerprint for persisted-session validation whenever plaintext is configured.
Test initial acceptance and later session validity independently.

| Configuration variant | Candidate credentials | Required observation |
|---|---|---|
| Default hash only | Approved default credential if available; unrelated wrong credential | Baseline login→reload; no credential guessing if valid input unavailable |
| Explicit configured hash only | Throwaway credential A matching configured hash; wrong B | A login and session reload consistency; B rejection |
| Plaintext A, hash setting omitted | A; approved default-hash credential only if available | Whether inherited hash remains accepted, and whether every accepted path survives reload according to policy |
| Plaintext A plus matching hash(A) | A and wrong B | Consistent form/query acceptance and persisted-session validation |
| Plaintext A plus different hash(B) | A, B and unrelated wrong credential | Distinguish which login paths accept A/B from which stored sessions validate; no assumption both are intentionally supported |
| Malformed/empty configured hash, no plaintext | Throwaway wrong credential and empty input | Safe rejection/error, no unintended fallback or crash; supported invalid-configuration handling is a policy decision |

For each available credential/configuration pair:

1. Start clean; attempt form login. Record accepted/rejected/error and tool
   installation. For accepted login, reload with dev requested and observe
   auto-start/session validity.
2. Repeat separately with supported query aliases, ensuring secret redaction
   and URL-cleanup checks. Use credential-free evidence labels.
3. Repeat ordinary nondev URL and logout→dev request. These must not be
   conflated with rejection caused by an expired/malformed session.
4. On a separate storage-blocked variant, distinguish intentional page-only
   login from broken reload persistence. Do not require persistence where
   storage is unavailable. Cross-reference DEV-10 for WebCrypto-unavailable
   variants; plaintext validation and hash validation may take different paths.
5. Define intended precedence/fallback policy before signoff. Report a
   credential that initially succeeds but cannot restore its session as a
   consistency finding, and unexpected fallback acceptance as a policy risk.
   Neither automatically establishes a server-side authentication vulnerability
   in this client-side tool.

## 23. Critical inventory and connector register

This register replaces the empty area placeholder with concrete **initial
targets**. It is not a completed survey of every mesh, fence segment or entrance.
All execution verdicts are NOT RUN. Positions below identify object/stop
anchors, **not safe teleport poses**. `(theta,phi)` means east/south in world
units; source-local north/east values must be converted before use.

Locator status:

- **S** — anchor/name directly locatable in source; in-game approach still to verify.
- **H** — historical QA location; reread current model/scene before execution.
- **U** — exact child inventory/checkpoints not yet enumerated; cannot sign off.

For each compound row, enumerate every actual gate, fence segment/end and
intended access path as child IDs before execution. Example:
`INV-D01/gate-01/inward/E1` and `INV-D01/gate-01/outward/E1`.
No grouped inventory row can receive PASS until its required children are
enumerated and accounted for. Register unexpected objects found during walking.

| Inventory ID | Area / target | Locator and status | Required test mapping / boundary intent |
|---|---|---|---|
| INV-A01 | Normal spawn | S: (12,12), `state/game-state.js` / resetGame | AREA-A; free spawn→public entry |
| INV-B01 | Fixed entrance pedestal | S: (-2.62,-13.25), park constructor | PARK-03, NAV-04, CAM-09; fixed solid |
| INV-B02 | Animated entrance arm | S: child of INV-B01 | PARK-04; physical interaction NEEDS DECISION |
| INV-B03 | West board post | S: theta 9.60, nominal phi -13.045 | PARK-05; exact polygon bounds, not nominal cylinder center, determine contact |
| INV-B04 | East board post / central opening | S: theta 10.50, nominal phi -13.045; middle theta 10.05 | PARK-05; solid post, elevated-board gap open |
| INV-B05 | Kantor Pos gate/perimeter/garden | S name, U individual openings/segments; `west-roadside.js` | FRONT-01..04, NAV-07; gate access versus lawn-step blocking |
| INV-B06 | Teras Pos fence | S named sidewalk-aligned fence, H local QA approach | FRONT-01..03, NAV-04/06; every rail join/end plus parallel sidewalk |
| INV-B07 | BICAU gate/perimeter | S named placement/model, U gate children | FRONT-01..03; do not mistake height transition for fence solidity |
| INV-B08 | Planet Ban / blue office frontage | S named north-frontage context, U separate properties/driveways | AREA-B; enumerate both properties independently |
| INV-B09 | Beige row / ARUM frontage | S named north-frontage context, U separate properties/driveways | AREA-B; enumerate each opening and public tread seam |
| INV-B10 | Northern traffic/crossing interfaces | S traffic route definitions; U physical approach checkpoints | TRAF-01..07, AREA-B-R; expand four vehicle routes and pedestrian intersections |
| INV-C01 | Alun-Alun delivery stop | S anchor (0,0), `data/stops.js`; resolve runtime handoff | DEL-01..06, AREA-A-R |
| INV-C02 | Garuda plinth / old footprint | S (.95,-12.7); H old theta -.35 | PARK-02; solid current base, empty old path |
| INV-C03 | Fountain | S nominal (4.7,4.8), park model/navigation; verify mesh alignment | PARK-08; basin boundary and public circumference |
| INV-C04 | West bench 1 | S (-15.46,-6.35), `traffic.js` | PARK-06; both faces, ends, both bypasses |
| INV-C05 | West bench 2 | S (-13.28,4.15), `traffic.js` | PARK-06; both faces, ends, both bypasses |
| INV-C06 | West bench 3 | S (-11.97,10.45), `traffic.js` | PARK-06; both faces, ends, both bypasses |
| INV-C07 | South bench 1 | S (-4,15.6195266034), converted from north/east definition | PARK-07; rotated footprint and surrounding tree clearance |
| INV-C08 | South bench 2 | S (8.2,13.1432820234), converted from north/east definition | PARK-07; rotated footprint and surrounding tree clearance |
| INV-C09 | South bench 3 | S (13,12.1690218608), converted from north/east definition | PARK-07; rotated footprint and surrounding tree clearance |
| INV-C10 | Small park gazebos / prayer shelter | S constructors, U each entrance and access policy | PARK-09; split each gazebo, surface and column into children |
| INV-C10a | Northwest small gazebo | S (-6.2,-11.4), park constructor | PARK-09, CAM-09; broad blocker versus visible opening, intended interior U |
| INV-C10b | Northeast small gazebo | S (7.1,-5.2), park constructor | PARK-09, CAM-09; independent entrance/perimeter variants |
| INV-C10c | Southwest small gazebo | S (-5.6,8.4), park constructor | PARK-09, CAM-09; independent entrance/perimeter variants |
| INV-C10d | Southeast small gazebo | S (7.6,9.1), park constructor | PARK-09, CAM-09; independent entrance/perimeter variants |
| INV-C10e | Frontage shelter | S (.4,-7.65), park constructor | PARK-09, CAM-09; enumerate visible openings/roof and establish access policy |
| INV-C11 | Ceramic ring / interior junctions | S polygon definitions, U all walk checkpoints/holes | PARK-01/12, NAV-19; whole loops and cross-connections |
| INV-C12 | Lamps, bollards, planters, signs, tree wells | S model families, U individual risk inventory | PARK-11/13; all path pinch points mandatory, remaining decorations sampled with rationale |
| INV-C12a | East elephant sculpture | S (8.2,-11.8), park constructor | PARK-11, NAV-01/02; base/corner and adjacent path |
| INV-C12b | West elephant sculpture | S (-7.75,-10.8), park constructor | PARK-11, NAV-01/02; separate instance, nearby gazebo route |
| INV-C12c | Northwest irregular boulder | S (-8.1,-11), park constructor | PARK-11, NAV-01/02; irregular mesh against rectangular collision |
| INV-C12d | Flowerbeds 1–6 | S separate centers (-9,-13.55), (-6.7,-13.55), (6.2,-13.55), (8.7,-13.55), (11.4,-7.9), (11.3,8.8) | Six child results under PARK-11; grounded footprint and adjacent path; solidity policy U |
| INV-C13 | South dropped curb / median pedestrian gap | S south crossing definitions, U endpoint poses | PARK-17; connected public crossing and neighboring solid median |
| INV-D01 | Al-Abror frontage/canopy/gate | S stop (-23.71,4.13), `mosque.js`; U gate/column children | AREA-D, DEL; stop anchor not handoff/entrance proof |
| INV-D02 | Rotated hall / annex / minaret | S named mosque geometry, U perimeter approach poses | AREA-D-G/M, CAM-09; private-interior policy explicit |
| INV-D03 | Southern mosque residences/compound | S `al-abror-south.js`, U individual gates/footprints | FRONT, NAV-11/20/21; retained OSM versus custom edges |
| INV-E01 | Public Gazebo | S stop (3.08,14.1), `gazebo-situbondo.js` | AREA-E; stairs, floor, columns and actual handoff |
| INV-F01 | Pendopo roadside entrance/sign | S stop (4.1,20.8), `pendopo.js`; U individual entrance pairs | AREA-F; active handoff versus compound-access distinction |
| INV-F02 | Deep pavilion / rear complex | S Pendopo-local geometry, U transformed path checkpoints | AREA-F-G/M; no old placement blocker, intended floor access |
| INV-F03 | Detached offices / motorcycle shelter | S `pendopo.js` plus replacement config, U each edge/access | FRONT-04, NAV-11; no duplicate retained building |
| INV-F04 | West-bend residence fence / side lane | S south-frontage geometry, U exact segment inventory | AREA-F-R, FRONT-01/02; preserve fence outside public tread |
| INV-G01 | SD Islam Al-Abror | S `east-schools.js`, U gate/public boundary | AREA-G; school interior policy separate |
| INV-G02 | SDN 6 Dawuhan | S `east-schools.js`, U gate/public boundary | AREA-G; school interior policy separate |
| INV-G03 | Library | S `civic.js`, U approach checkpoints | AREA-G; footprint separate from Pramuka |
| INV-G04 | Pramuka | S `pramuka.js`, U approach checkpoints | AREA-G; no library overlap |
| INV-G05 | BRI | S civic model, U public access children | AREA-G; frontage/gate/sidewalk |
| INV-G06 | Warung Pojok | S civic model, U public access children | AREA-G; storefront opening and roadway clearance |
| INV-G07 | Bakti Motor / eastern row | S frontage context, U workshop/row child properties | AREA-G; split independent properties and driveway joins |
| INV-G08 | Lapas/Rutan | S `lapas.js`, U public perimeter checkpoints | AREA-G; closed compound not assumed enterable |
| INV-G09 | Suzuki–VIAR corner | S `suzuki-corner.js`, U irregular corner approach | AREA-G; footprint/yaw/billboard overhead versus ground collision |
| INV-G10 | Lesehan/Pegadaian block | S `lesehan.js`, U individual public edges | AREA-G; named child frontage and adjacent sidewalk |
| INV-H01 | Southeast monument / island | S `southeast-monument.js` and junction definitions | AREA-H-G/M; mesh/island/base clearance |
| INV-H02 | Three-way branches / sidewalk returns | S junction geometry, U each branch endpoint | AREA-H-R, PARK-18; enumerate all intended branch-pair connectors |
| INV-H03 | Southeast adjoining frontage apron | S junction frontage definitions, U approach poses | NAV-07/11, FRONT-01; asphalt/apron/sidewalk ownership seams |
| INV-I01 | Pasar Mimbaan | S stop anchor (124.47,-21.44), actual handoff resolved from navigation | AREA-I Market subpack; corrected handoff outside solid |
| INV-I02 | Terminal | S stop anchor (151.72,-3.12), actual handoff resolved from navigation | AREA-I Terminal subpack; retained mapped building stays solid |
| INV-J01 | Stadion Gelora | S stop anchor (-181.26,-82.2), actual handoff resolved from navigation | AREA-J; actual radius-safe approach and departure |
| INV-K01 | Grid-boundary collision sample set | U: actual positive/negative 40 m cell boundaries with nearby polygons | NAV-20/21; include two-/three-wall pockets, no fabricated coordinates |
| INV-K02 | Bridge/water/concave-alley samples | U: actual reachable map features to select | NAV-12/19, AREA-K; no blanket bridge/interior access assumption |
| INV-K03 | Inter-destination corridors | U exact route checkpoints; anchors in connector table below | AREA-K-R, JOURNEY-01; every required leg explicit |
| INV-K04 | Outer boundary sectors | S radius policy, U safe eight-sector approaches | NAV-13/14, AREA-J; exclude nearer building blockage as false boundary result |

Additional handoff leads from `scripts/validate-market-delivery.mjs`: Market
`(126.486,-21.44)`, Terminal `(159,-2.2)`, Stadium approximately
`(-180.908022454,-84.422298766)`. These are source-regression expectations,
not newly observed runtime positions. Reconcile them against the actual
candidate build before setup. Mosque, Pendopo and Gazebo navigation contain
local handoff offsets that must be transformed by their respective yaw/scale;
do not copy local offsets as world coordinates.

### Connector register — critical edges, not just destination nodes

Unless an execution result is recorded below, connectors are NOT RUN.
A→B is an intended test itinerary, not a claim that a straight
line between anchors is walkable. Before a run, select the actual public path,
record named/coordinate checkpoints and note gates/crossings/height seams.
For delivery legs, maintain the correct active target through real progress.
Reverse exploration can use a separate round; do not demand movement after
the game intentionally stops at completion.

| Connector ID | Endpoints / purpose | Required cases | Checkpoint status |
|---|---|---|---|
| LINK-01 | Spawn→Alun-Alun handoff | AREA-A-R, DEL-01, JOURNEY-01 | One normal keyboard/no-teleport route PASS, Batch8; fountain east detour recorded; not all route/gait variants |
| LINK-02 | Alun-Alun→Gazebo | AREA-E-R, DEL-01/06 | One continuous leg PASS, Batch9, north-side proximity handoff; stair access tested separately; not full journey |
| LINK-03 | Gazebo→Al-Abror | AREA-D-R, DEL-01/06 | Gate and crossing checkpoints U |
| LINK-04 | Al-Abror→Pendopo | AREA-D-R/F-R | West sidewalk/bend/gate checkpoints U |
| LINK-05 | Pendopo→Market | AREA-F-R/I-R/K-R | Long public corridor and seams U |
| LINK-06 | Market→Terminal | AREA-I-R/K-R | Long public corridor and seams U |
| LINK-07 | Terminal→Stadium | AREA-J-R/K-R, JOURNEY-01 | Long crossing-town path and boundary-safe arrival U |
| LINK-08 | North park→crossing→postal frontage→park | AREA-B-R, TRAF | Both directions, every curb/entry checkpoint U |
| LINK-09 | West park→mosque public frontage→west park | AREA-D-M/R | Both directions, entry/exit checkpoints U |
| LINK-10 | South park/Gazebo→crossing→Pendopo frontage | AREA-E-R/F-R, PARK-17 | Both directions; median/curb gap checkpoints U |
| LINK-11 | South path→southeast junction→east path | AREA-H-R/G-R | Both directions plus other intended branch connection U |
| LINK-12 | North→west→south→east→north public loop | JOURNEY-02 | Clockwise/counterclockwise; all connectors U |
| LINK-13 | Interior ring→each intended interior landmark→ring | AREA-C-R | Separate child edge per landmark/opening U |
| LINK-14 | Distant neighborhoods→inward recovery / chosen alternate leg | AREA-K-P/R, JOURNEY-04 | Deliberate wrong-turn and legal retreat checkpoints U |

### Open coverage work, not hidden completeness claims

1. Resolve every critical U locator by source/scene inspection before that
   pack can be signed off; assign stable child IDs for all relevant openings
   and endpoints. A parent name is not a completed geometry inventory.
2. Snapshot actual runtime handoff coordinates on the candidate build and
   record public approach routes; building-center anchors are insufficient.
3. Locate grid-boundary, concave pocket and bridge samples; document any N/A
   using actual map evidence. Do not choose only easy open-space samples.
4. Confirm intended-access/dynamic-contact decisions, numeric measurement
   tolerances and supported physical devices. Until resolved, corresponding
   acceptance remains NEEDS DECISION/BLOCKED rather than PASS.
5. After enumeration, count required child variants and report coverage by
   risk/layer/area. Do not present the catalog's total ID count as a coverage
   percentage, an execution result or proof of exhaustive testing.

## 24. Execution ledger — 2026-10-02 continuation

User authorized testing, immediate scoped fixes and manual retesting. Starting
served build: `index-9-pxWU2W.js`, service active on 8101. Preserve all pre-existing
dirty/untracked work. Playwright uses a new disposable Chromium context,
1280×720, empty localStorage; no existing user profile cleared. This is desktop
coverage only, not a physical-device result.

### Batch 1 — startup gates (in progress)

- [x] Identify service/build and inspect current source/plan.
- [x] BOOT-01 initial fresh-profile smoke: title visible, 900 seconds, 0/7,
  rider (12,12), not started, map counts displayed, no stored keys.
- [x] BOOT-01 reload with explicit console/page-error/network collection:
  previous execution collected no errors or failed requests.
- [x] BOOT-02 mouse, Enter and Space start variants on initial build:
  independently observed started=true and scene focus. A timed-out combined
  harness call was inconclusive; individual reruns supplied the evidence.
- [ ] BOOT-03 rapid start activation.
- [x] BOOT-04 title idle/input/resize on fixed candidate: >90 seconds
  between observations, W/Up and pointer input, resized1280×720→1024×768;
  time900, deliveries0, rider(12,12), then successful mouse start.
- [x] BOOT-05 active-round reload resets to title, 900 seconds, zero deliveries.
- [ ] BOOT-05 completion/failure reload variants await real terminal outcomes.
- [ ] BOOT-08 map failure variants, repeat reproduction before any fix.
- [ ] For each confirmed defect: record evidence → scoped fix → regression →
  build → restart 8101 → exact manual retest → unaffected-control retest.

All other test variants remain NOT RUN unless an explicit per-build result is
added. Physical-device cases and unresolved product-policy cases require their
own evidence/decision; they cannot be passed by desktop automation.

### Batch 1 continuation — startup failure fix

- [x] FIRST TEST BOOT-08 / QA-BOOT-001: intercepted map request with HTTP404;
  Start enabled, coverage counts shown, click does nothing, debug state absent.
- [x] REPRODUCTION: reloaded with same interception and clicked Start again;
  same unusable title. Confirmed twice before changing code.
- [x] FIX: initially disabled loading button; caught dynamic game import;
  existing title shows Indonesian error and a fresh reload-only button.
  Loading/failure hides map proof; failure hides movement controls. Ready state
  does not override dev-session title visibility or force hidden Start visible.
- [x] BUILD + RESTART: production build succeeded (61 modules); restarted
  existing `pendopo-game.service` on port8101, no competing server started.
  Candidate assets: `index-y2t2oYUa.js`, `game-2x4q_y4D.js`,
  `style-Cz0ssVmg.css`.
- [x] RETEST BOOT-08: individually injected404,500,abort,malformed JSON,
  JSON null and JSON {}. All show boot=failed, visible enabled Muat ulang,
  readable error, hidden successful-looking map counts.
- [x] RECOVERY: removed interception and clicked Muat ulang from final {}
  failure. Observed boot=ready, map proof visible, title state, time900,
  deliveries0, rider(12,12), no uncaught page error. Per-failure recovery for
  the other five variants remains unexecuted (same shared reload path).
- [ ] Invalid numeric/map schema fields, pending-load abandonment, authenticated
  dev autostart, and unavailable WebGL remain separate unexecuted variants.

This fixes the reproduced dead Start failure; it does not establish complete
map-schema validation or recovery from errors occurring after boot finishes.

### Further fixed-candidate checks

- [x] BOOT-02 regression: mouse double-click, Enter and Space start all
  reached playing state with scene focus and countdown; Space observed899.9147.
- [x] BOOT-03 desktop rapid activation observations: double-click followed
  by time sample899.9621→899.8021; five Enter presses produced started=true,
  time899.3478, zero deliveries, exactly one message element, scene focus.
  No visible duplicate round. Full animation-loop instrumentation and physical
  double-tap remain NOT RUN; do not mark the entire parent case complete.
- [x] BOOT-09 partial: held map request pending, observed loading/disabled
  Start/hidden map proof/no debug state; Enter did not start. Removed routes
  and reloaded: ready, not started, time900. Never-resolving fetch timeout
  policy and stale-response-after-navigation variant remain untested.
- [x] Dev bootstrap regression: unauthenticated `?dev=1` retained secret-key
  login and hidden ordinary Start, started=false. No credential entered.
- [x] BOOT-07 root query+hash variant loads and starts. Nested deployment
  remains NOT RUN, not inferred from localhost root.
- [x] BOOT-12 count subset: UI3243 buildings/102 animated equals runtime
  dataset3243/102. Scale/radius/area comparisons remain unexecuted.
- [x] Map validator and its traffic post-hook PASS; `git diff --check` PASS;
  HTTP8101 HTML references candidate index/CSS hashes above.

### Batch 2 — keyboard binding overlap (partial, same candidate)

- [x] INPUT-13 W+Up → release W: inputActive remains true. Release Up:
  inputActive=false. Performed through real Playwright keydown/up at spawn.
- [x] INPUT-13 both Shift keys with W: run animation, speed1.61568.
  Release left Shift: run remains, speed1.63908. Release right Shift while W
  remains: walk animation, speed0.82824. Release W: inputActive=false,
  deceleration speed0.00795. No collision in sampled movement.
- [x] INPUT-13 reverse release orders completed in Batch3 below.
- [ ] INPUT-04 reverse run/movement release order and isolated Shift variants.

Telemetry caution discovered during testing: `controls.run` and
`controls.brake` expose touch-button state, NOT combined keyboard state.
An initial idle Shift probe using controls.run=false was inconclusive, not a
game failure. Reran with W and observed actual rider speed/animation above.
Use motion evidence for keyboard run/brake acceptance. At this runner's low
FPS, 2.829 wall seconds consumed only0.160 simulation seconds in one sample;
the documented .08/frame cap applies. This is not proof of wall-clock timer
correctness or a duplicate-loop failure. Responsive-hardware TIME-01 and
performance coverage remain open. All keys and request interception released.

### Batch 3 — 2026-10-03 input continuation and UI-16 repair

Initial candidate `index-y2t2oYUa.js`. Previous disposable browser context was
no longer present; opened a new QA page at `?qa=oct03`, normal mode, no saved
progress edited. All movement below used real keys/mouse, no teleports.

- [x] INPUT-13 reverse forward binding release: W+Up, release Up first →
  inputActive=true, speed0.78914; release W → inactive/decelerating.
- [x] INPUT-13 reverse Shift release: W+both Shift → run1.54998; release
  right Shift → run1.63347; release W before remaining Shift → inactive,
  speed0.05042; final release → idle0.000487. Left-Shift release while W
  remains was covered in Batch2. No sampled collision.
- [x] INPUT-03 subset: W+S, A+D, all four each yielded inputActive=false;
  staggered release resumed remaining direction with finite heading/speed.
  Mixed WASD/arrows and all release permutations remain NOT RUN.
- [x] INPUT-05 running/Space subset: run1.30461 → Space held/inactive0.05976
  → Space released/run1.20163; direction released before brake release →
  idle0.000047, no unwanted resumption. Near-obstacle variants still open.
- [x] FIRST TEST UI-16 / QA-INPUT-001: focused Stop with Enter and Space
  left controls.brake=false. Independent moving repro: focused Stop+Enter,
  W held, inputActive=true and speed0.81169. Button activation did nothing.
- [x] FIRST TEST visible Run: active canvas mouse drag makes button visible;
  focused Run+Enter left controls.run=false despite active movement. Initial
  hidden-Run focus attempt was inconclusive and is NOT accepted evidence.
- [x] FIX1: shared hold-button binding supports Enter/Space/NumpadEnter,
  release outside original focus, blur cleanup, and independent pointer/key
  ownership. Secondary mouse buttons ignored. Added Node regressions.
- [x] BUILD/RESTART1: 61-module production build, existing8101 service
  restarted. Intermediate assets `index-zJKfm6At.js`, `game-DDIsWR1I.js`.
- [x] RETEST1 Stop Enter/Space: brake=true/input=false, speeds0.00671/0.00626;
  key release brake=false/input=true and movement resumed0.7056.
- [x] RETEST1 visible Run Enter/Space: run=true and run animation on hold;
  run=false on release.
- [x] CORNER RETEST FAILED: with keyboard Stop Enter still held, releasing
  analog mouse pointer changed brake=true→false. Cleanup conflated keyboard
  button activation with touch holds; reproduced via actual drag/key release.
- [x] FIX2: analog release preserves independent keyboard-button activation;
  lifecycle reset still clears all sources. Added analog-release and
  multi-pointer ownership Node regressions.
- [x] BUILD/RESTART2: 61-module build, restarted8101. Final assets
  `index-C_6D1w1_.js`, `game-DuqFcWXO.js`, `style-Cz0ssVmg.css`.
- [x] RETEST2 exact corner: brake true before AND after analog release;
  Enter keyup clears it. Holding Space then focusing scene clears brake.
- [x] RETEST2 Run Enter/Space hold/release passed again on final candidate.
- [x] POINTER REGRESSION: Stop mouse press=true/release=false.
- [x] Node `validate-input-focus.mjs` passes including lifecycle reset,
  key overlap, pointer/key overlap, multiple pointer ownership, unrelated
  release, and secondary-button rejection. These synthetic checks do not
  count as physical multitouch acceptance.

Final-candidate moving Stop retest is recorded below. Still required: visible
Run pointer regression, actual tab/window blur variants, and remaining cases.
No claim of full UI-16 assistive-technology or physical-device signoff.

### Batch 3 continued — final input observations and graphics recovery

- [x] Final-input-candidate moving Stop/Space retest: brake=true/input=false,
  speed0.15933 while decelerating; release restored input/speed0.41118.
  Releasing W over focused Stop removed it; new W press on that button did
  not move rider (INPUT-10/14 focused-button subset, not editable-field coverage).
- [x] INPUT-11 mouse subset: right/middle drags did not activate analog;
  left drag did. Right press/release during left hold preserved analog;
  final left release cleared it. Outside-window release remains NOT RUN.
- [x] Visual inspection of `/tmp/qa-oct03-input-fixed.png`: normal game,
  rider/scene/HUD visible after input repair. Screenshot helper timed out once;
  direct screenshot with longer capture timeout succeeded. Not a game defect.
- [x] BOOT-11 unavailable-WebGL injection in separate disposable context:
  startup catch showed generic error/reload and hid map proof. This is not
  physical GPU coverage; generic message does not diagnose GPU specifically.

#### QA-GRAPHICS-001 — invisible game still consumes deadline

- [x] FIRST TEST: actual WEBGL_lose_context extension during play. Context
  lost event occurred, boot still ready, normal message hidden; deadline
 860.037→858.937 during1.1 wall seconds without usable graphics.
- [x] REPRODUCTION: second loss, gl.isContextLost=true, no notice;
  deadline854.9417→853.7251 over1.2s. Restored context after each probe.
- [x] FIX: context loss cancels pending frame, suspends simulation/render
  scheduling, clears controls, makes game subtree inert, and focuses an
  external recovery notice. Restore discards unavailable clock time, clears
  controls again, restores focus and requests redraw through existing RAF
  guard. Reload fallback explicitly warns that it starts a new route.
- [x] BUILD/RESTART: final candidate `index-Jd78eC1S.js`,
  `game-uoogMje7.js`, `style-DzxqnPtH.css`; production build61 modules,
  existing8101 service restarted. Input Node regression and diff check pass.
- [x] EXACT RETEST while W+Shift moving: deadline899.6748 unchanged over
 1.5s loss; coordinates(12.2164188,11.8354775) unchanged. Notice focused,
  app inert. Restore time899.6701 after first fresh frame, inputActive=false,
  app usable, focus scene. Rider subsequently settles to speed<1e-20.
  Rider motion telemetry retains its last frame during loss; it is not new
  simulation or evidence of still-held input.
- [x] VISUAL RESTORATION: inspected `/tmp/qa-oct03-restored.png`; rider,
  buildings, road/park, HUD and controls rendered after context restoration.
- [x] SECOND RETEST plus resize1280×720→1000×700: deadline895.8301 unchanged
  during loss; restored successfully at new viewport.
- [x] RELOAD FALLBACK while context lost: clicked recovery button → fresh
  title, time900, deliveries0, notice hidden, app not inert.
- [x] TITLE LOSS/RESTORE: returns to title without autostart, time900.
- [ ] Completion/failure-screen context restoration and physical GPU/device
  recovery remain unexecuted; these observations do not sign off all BOOT-11.

### Batch 4 — local handoffs, NOT an uninterrupted route

Candidate `index-Jd78eC1S.js`. Normal mode, real delivery state machine;
no counters, deadline, target index or completion flags edited. Each segment
used an explicitly local teleport to an outside-radius setup, then real W
movement. Probed surface/custom obstacle clearance first; no claim that this
proves the connecting road route or the entire mapped collision inventory.
Source-derived handoffs were transformed with production yaw/scale, not
assumed at building centers. All observations below are one approach only.

| Target | Outside setup (theta,phi), heading | Observed award pose (theta,phi) | Outcome |
|---|---|---|---|
| Alun-Alun | (-1.3,0),0 | (-1.146382,0) | 0→1, next Gazebo |
| Gazebo | (3.08,16.1),π/2 | (3.08,15.231791) | 1→2, next Al-Abror; stair4/plinth |
| Al-Abror | (-19.211076,4.416666),π/2 | (-19.211076,4.072282) | 2→3, next Pendopo |
| Pendopo | (2.268017,18.172087),0 | (2.612402,18.172087) | 3→4, next Market; apron |
| Market | (127.986,-21.44),π | (127.641616,-21.44) | 4→5, next Terminal |
| Terminal | (160.5,-2.2),π | (160.155616,-2.2) | 5→6, next Stadium |
| Stadium | (-179.408022,-84.422299),π, W+Shift | (-179.740720,-84.422299) | 6→7, Route Complete |

- [x] DEL-01 local handoff subset: all seven incremented once without sampled
  collision. Full legal continuous routes from spawn/between stops remain open.
- [x] DEL-02/12 Alun-Alun west subset: at1.3 units, rounded HUD6m but no
  delivery; W crossed inside1.2 and awarded. This confirms rounded distance
  is not the trigger. Other sides/exact threshold samples remain NOT RUN.
- [x] DEL-06 text/progress subset: observed correct old-target toast and new
  target name for each of the first six deliveries; first progress1/7 and
  final7/7 match state. Marker geometry/arrow-angle variants still open.
- [x] DEL-04 partial Alun-Alun idle: 11 wall seconds at previous handoff left
  count1, toast hidden, progress1/7. Only1.52 simulation seconds elapsed in
  that interval; do NOT count this as10 simulation seconds or return-loop test.
- [x] DEL-09 seventh award with W+Shift held: complete=true, started=false,
  count7, Route Complete, no target-index crash. Input keys released afterward.
  Rider motion telemetry retains last frame (run pose/speed); this alone does
  not mean movement continues after completion.
- [x] Stadium setup safety: rejected north candidate(-180.908022,-85.922299)
  at radius200.275695 (>200). Used east candidate radius198.278499. Southern
  candidate also rejected due negative solid-footprint gap. No out-of-bounds
  teleport used as successful approach evidence.
- [x] Inspected local approach screenshots for Market/Terminal/Stadium:
  `/tmp/qa-market-approach.png`, `/tmp/qa-terminal-approach.png`,
  `/tmp/qa-stadium-approach.png`. Approaches delivered with real movement.
- [ ] Visual concern to investigate under marker/camera coverage: Market's
  large marker backplate and Terminal's yellow ring occupy substantial screen
  area at these close approaches. No collision failure observed; not yet a
  confirmed sizing-policy defect or visual acceptance pass.
- [x] BOOT-11 completion-screen loss/restore plus resize: result preserved,
  time836.56/count7/coordinates unchanged; HUD says All Delivered and result
  remains visible. Failure-screen and physical-device variants still open.
- [ ] DEL-07/JOURNEY-01 still NOT RUN. Local test completion is explicitly
  ineligible for uninterrupted-route acceptance or deadline fairness claims.
- [x] TIME-09 completion-screen idle/resize subset: observations132.902 wall
  seconds apart retained time836.56, count7 and identical rider coordinates;
  included viewport resize and context loss/restoration. No repeat reward.
  Failure-screen variant still NOT RUN.
- [x] DEL-10 Walk Again: button resets to active first target, count0,
  complete=false, spawn(12,12), idle/no input, no stale toast; time899.9071
  after initial active frames. Repeated local first-target approach awards
  count1 and advances to Gazebo. Full spawn→first-target route still open.
- [x] Final build map validation, traffic post-hook, input regression and
  `git diff --check` passed. No imagery or QA screenshot added to repository.

### Next unexecuted work / limitations

Continue visible Run pointer regression and real focus-loss variants, then
delivery approach directions/return loops/out-of-order visits, full connecting
routes, natural timeout and failure/retry, per-area geometry/mechanics packs,
camera/marker sizing concern, and remaining device/platform cases. Do not
derive a coverage percentage from parent IDs: most contain unexecuted child
variants. Physical-device/assistive-technology tests need the actual hardware
or tool, not desktop pointer emulation. No terminal timer/counter edits may
be used to claim natural timeout or uninterrupted normal-mode completion.

### Batch 5 — 2026-10-04 continuation

Inspected dirty worktree and ledger before testing; preserved prior work.
Starting served assets `index-Jd78eC1S.js` / `game-uoogMje7.js`.
New disposable QA page because the previous browser page was gone.

#### Input follow-ups — do not overstate the harness

- [ ] INPUT-07/08 genuine tab-focus loss: INCONCLUSIVE. Opened another page
  and brought it forward while W+Shift held; game still reported visible and
  document.hasFocus=true. Explicit key release cleared input. This environment
  did not generate the lifecycle event required by the case; no blur PASS.
- [x] Visible Run pointer activation subset: Chromium touch emulation,
  first finger dragged analog, second contacted visible Run. Observed
  controls.run=true, inputActive=true, run animation. All contacts cleared
  afterwards and emulation disabled.
- [ ] Independent second-finger release: INCONCLUSIVE. CDP touchEnd with a
  remaining-contact list ended analog as well; no valid isolated-release
  evidence collected. Do not infer a game bug or physical multitouch PASS.
- [ ] Marker review: source shows ring world radii depend on building scale,
  while actual delivery threshold stays1.2. Meaning of decorative ring vs
  exact delivery boundary needs explicit acceptance; no sizing change made.
  Large backplate attribution was NOT established (helper has no backplate
  mesh). Existing visual concern remains open for proper scene identification.

#### QA-BOOT-002 — zero map precision hangs startup

- [x] FIRST TEST: fetched normal map, intercepted its request with only
  coordinatePrecision=0. Page became unresponsive; even reading #app timed
  out after30s. Closed only that disposable QA page; removed interception.
- [x] SOURCE CORROBORATION: loader returned unvalidated JSON; decoding divides
  by precision, and navigation/road grids increment cell indices over bounds.
  Infinite bounds can fail to advance with cellX+=1. Not classified solely
  from a tool timeout: corrupt divisor plus unbounded loop is explicit source
  evidence. A second intentionally hanging browser reproduction was avoided.
- [x] FIX1: preflight positive finite coordinatePrecision, anglePrecision and
  radiusMeters before constructing geometry/navigation; reject nonobject map.
  Added `game/scripts/validate-map-metadata.mjs` regression.
- [x] BUILD/RESTART1: build61 modules, restarted existing8101 service.
  `index-CidhBh4h.js` / `game-w1s4uKn2.js`.
- [x] RETEST1: coordinatePrecision0,-1,null,"10", anglePrecision0 and
  radiusMeters0 each returned responsive error/reload UI, boot=failed,
  successful-looking map proof hidden. Restored data + reload returned
  title900/0, started=false, then Start worked; no uncaught recovery error.
- [x] REVIEW FOUND BYPASS: tiny positive precision is finite but decoding
  can overflow or produce nonadvancing huge grid indices. Initial guard alone
  was insufficient for that variant.
- [x] FIX2: enforce existing supported coordinatePrecision=10 contract from
  exporter and map validator (decimetre data), not a new map-scale policy.
  Add Number.MIN_VALUE,1e-308,1e-20,1,100 regression inputs.
- [x] BUILD/RESTART2: build61 modules, restarted8101. Current assets
  `index-BBhbfjOY.js`, `game-DVzT7EyD.js`, `style-DzxqnPtH.css`.
- [x] RETEST2 browser: precision0,5e-324,1e-308,1e-20,1 each produced
  responsive boot=failed/Muat ulang. Removed route interception, clicked
  reload; normal game started and subsequent real deliveries worked.
- [x] Unit checks cover invalid metadata values including nonfinite numbers,
  absent fields and nonobject roots; actual production map passes.
- [ ] Full schema safety is NOT claimed: corrupted coordinate arrays, huge
  polygons, other schema fields and resource limits still require independent
  tests/guards. These metadata changes specifically close the divisor hang.

#### Delivery approach follow-up

Local setup teleports only, outside radius on previously probed clear center
paths; real W movement afterward, no timer/counter/progress edits.

- [x] DEL-02 Alun-Alun EAST: setup(1.3,0),headingπ, outside count0 and HUD6m;
  inside(1.146382,0) count1,next Gazebo,no sampled collision (FIX1 build).
- [x] DEL-02 Alun-Alun NORTH: setup(0,-1.3),heading−π/2, outside count0;
  inside(0,-1.146382) count1,no sampled collision (current build).
- [x] DEL-02 Alun-Alun SOUTH: setup(0,1.3),headingπ/2, outside count0;
  inside(0,1.146382) count1,no sampled collision (current build).
  WEST was recorded in Batch4. Exact epsilon-boundary tests and all other
  targets' remaining directions are still NOT RUN.
- [ ] DEL-04 return loop attempted but INCOMPLETE: W traverse toward opposite
  outside checkpoint timed out at30 wall seconds; actual rider only reached
  theta−0.39529 (inside zone), count1, collision=false. Key released and rider
  settled. This is insufficient simulation progress, not demonstrated blockage
  or a successful leave/reenter loop. No second leg executed.
- [x] Final checks: production build, map-metadata regression, input-focus
  regression, map validation with traffic post-hook, and diff whitespace
  check all pass. Service8101 active; final asset hashes recorded above.

Next batch should resume DEL-04 with short outside/reentry checkpoints and
simulation-aware waits, then out-of-order target visits and route connectors.
Do not repeat already covered startup variants merely to increase test count.
Genuine blur, independent touch release and physical-device cases remain
inconclusive/blocked until the required event/device can actually be observed.

### Batch 6 — delivery return-loop continuation (2026-10-04)

Candidate `index-BBhbfjOY.js` / `game-DVzT7EyD.js`. Checked source/worktree
and served hashes before testing; fresh QA page `?qa=oct04-delivery`.

- [x] Setup: normal Start, local teleport(-1.3,0,heading0) outside first
  handoff, real W crossing awards first letter. No target/count/timer edits.
- [x] DEL-04 first leave/reentry: real S movement exited to(-1.429376,0.048368),
  count1/time896.16. Initial W return attempt curved away and timed out;
  did not misclassify that as collision. Source confirms camera-relative
  heading is recalculated continuously, so a long S hold is not a world-axis
  reverse. At(-1.578124,-0.949043), used adaptive keyboard directions from
  observed camera heading/position to return to(-0.925558,-0.573279),
  radius<1.1, count still1/time888.64. No teleport within loop.
- [x] DEL-04 second leave/reentry: real keyboard movement outside to
  (-1.234321,-0.635563),radius>1.35,count1/time885.76; return to
  (-0.884365,-0.575163),radius<1.1,count1/time883.44. Toast remained hidden
  throughout sampled second loop, time decreased instead of gaining bonus.
- [x] Both loops preserve target Gazebo and bonus+5s; no duplicate first
  delivery. These are Alun-Alun variants only, not all seven DEL-04 variants.
- [x] Separate linger: time882.0→871.36 (>10 simulation seconds), unchanged
  count1,pose(-0.778830,-0.466254),target Gazebo,bonus+5s,toast hidden.
- [x] DEL-05 Al-Abror out of order: with Gazebo active/count1, local outside
  setup(-19.211075629,4.416665955,headingπ/2), real W to phi3.941798;
  no award, count1/bonus+5s. Legitimate local Gazebo approach then awards2.
  Revisit mosque from same outside setup with W: phi4.072282 awards3,
  next Pendopo,bonus+15s,correct toast. Local sequence, NOT full route.

#### QA-PARK-FOUNTAIN-001 — phantom corners and circular-contact sideways snap

- [x] FIRST TEST: clear setup(6.1,3.4,heading−3π/4), real W+Shift stopped
  at(5.942426381,3.557573563),radius1.757056,actualSpeed0/collision=true.
  Round basin radius1.24 plus rider0.06 should stop at1.30. Old square
  collider left about2.29m of phantom diagonal clearance. Inspected
  `/tmp/qa-fountain-corner-before.png`.
- [x] FIX1: shared fountain placement/radius definition for actual basin
  and circle navigation; removed legacy2.4×2.4 box. Geometry regression added.
- [x] BUILD/RESTART1: 8101 served index-CzPdphbS.js/game-C3FUCCqf.js.
- [x] RETEST1 FAILED: diagonal approach jumped from(5.658528167,3.841471832)
  to(6.000000006,4.799999998). Circle boundary radius correct, direction wrong.
- [x] ROOT CAUSE2: sphere-space direction tolerance treated valid small
  projections on radius50000 world as zero, falling back east.
- [x] FIX2: movement solver uses world-unit surface offsets and1e-12
  squared tolerance; exact-center fallback uses previous side before east.
- [x] BUILD/RESTART2: production61 modules, existing8101 service restarted;
  browser loaded index-Djj_gU_p.js/game-Cb3epXk-.js, service active.
- [x] MANUAL RETEST2 diagonal: same clear setup, W+Shift samples progress
  (6.055369,3.444631)→(5.907770,3.592230)→(5.732443,3.767557)
  →(5.619238816,3.880761182). Radius1.30,actualSpeed0, no sideways snap.
  Inspected `/tmp/qa-fountain-corner-fixed.png`: rider meets visible basin.
- [x] ESCAPE: real S from contact reaches(5.698692,3.698879),collision=false.
- [x] CARDINAL: setup(4.7,3.3,heading−π/2), real W stops at(4.7,3.5),
  actualSpeed0/collision=true, matching1.30 expanded radius.
- [x] FORMER CORNER BYPASS: setup(5.5,3.4,heading0), real W reaches
  (6.827404,3.4),collision=false; no phantom square corner.
- [x] REGRESSION: actual model/navigation fountain check;64 real-controller
  circle scenarios (two circle sizes/centers,8 directions,walk/run,.016/.08
  frame deltas), no penetration/jump/launch/rest drift. In-memory old-code
  comparison fails with0.995222 jump vs0.01312 permitted movement.
- [x] Input-focus and map-metadata regressions, map validation including
  traffic post-hook, and git diff --check pass.
- [ ] Other circular objects' browser approaches, full orbit/sliding, and
  exact-center fallback manual variant remain untested. Automated generic
  circle coverage is not a substitute for actual scene-object signoff.

#### PARK-05 — message-board opening and posts, additional browser variants

Same FIX2 build. All setups clear of obstacles; real keyboard movement after
setup. No game timer/counter edits. Released keys after each test.

- [x] Middle southbound: setup(10.05,-13.45,heading−π/2), W through
  (10.05,-12.844125) to(10.05,-12.294408),collision=false.
- [x] Middle northbound: independent setup(10.05,-12.35,headingπ/2),
  W+Shift through opening to(10.05,-14.755302),collision=false.
- [x] West post southbound: setup(9.6,-13.25), W stops atphi−13.133000001,
  actualSpeed0/collision=true, consistent with post boundary plus rider.
- [x] East post southbound run: setup(10.5,-13.25), W+Shift stops at same
  phi−13.133000001,actualSpeed0/collision=true; no tunneling in this run.
- [x] West post northbound: clear setup(9.6,-12.85,headingπ/2), W stops at
  phi−12.959772872,actualSpeed0/collision=true.
- [x] East post northbound run: clear setup(10.5,-12.85,headingπ/2), W+Shift
  stops atphi−12.959772872,actualSpeed0/collision=true.
- [x] Final browser console read: zero errors/warnings; all held keys released.
- [ ] Adjacent outside passages and diagonal sliding/escape variants remain
  open; PARK-05 as a whole is not signed off.

### Batch 7 — board edge paths, second circle, input corners (2026-10-05)

Inspected current dirty worktree and ledger before execution. Fresh normal
Start at `?qa=oct05-board`, served `index-Djj_gU_p.js` (unchanged Batch6
candidate). No game code changes in this batch, so no build/restart required.
Coordinates below are local test setups through the existing teleport helper,
followed by real Playwright keyboard input; no progress/timer edits. These
are not continuous route results. Sampling is sparse on this slow browser;
absence of tunneling between samples is not an exhaustive trajectory proof.

#### PARK-05 continuation — outside lanes and diagonal post escape

- [x] West outside southbound: setup(9.35,-13.45,heading−π/2), W+Shift
  reaches(9.35,-12.487438),collision=false.
- [x] East outside northbound: setup(10.75,-12.65,headingπ/2), W+Shift
  reaches(10.75,-14.924102),collision=false.
- [x] West outside northbound: setup(9.35,-12.65,headingπ/2), W+Shift
  reaches(9.35,-14.399311),collision=false.
- [x] East outside southbound: setup(10.75,-13.45,heading−π/2), W+Shift
  reaches(10.75,-12.618212),collision=false.
- [x] West diagonal walk: setup(9.35,-13.3,heading−π/4). Sampled real W
  contact at(9.532551,-13.117585), then(9.567786,-13.132798), then
  (9.668607,-13.116515); continued to(9.961331,-12.823791),collision=false.
  Post deflects player; forward continuation escapes, not permanently stuck.
- [x] East mirrored run: setup(10.75,-13.3,heading−3π/4), W+Shift reaches
  (10.391946,-13.077037),collision=false with recent blockedBlend0.114.
  Additional real W reaches(10.235314,-12.920405),collision=false.
- [ ] Reverse diagonal approaches, every gait/direction combination and
  per-frame displacement bounds at these box corners remain untested.
  Basic middle/outside passage and both posts' cardinal coverage now exists;
  do not interpret this as full park geometry or route signoff.

#### AREA-F-M / shared circular collision — Pendopo west tree

Source-transformed tree center(7.949808852,20.053605464), world radius0.1892;
expanded by rider0.06 gives0.2492. Actual navigation probes of both setups
showed tree as nearest obstacle with positive gaps0.297194/0.300609;
no raised surface at setups. This is another real scene circle, not a fixture.

- [x] South approach: setup(7.949808852,20.6,headingπ/2), W+Shift stops
  at(7.949808852,20.302805464),actualSpeed0/collision=true. Matches expected
  radial stop; nearest obstacle remains tree, measured gap−0.000000632
  (floating-point tolerance), not a wall or raised-lawn block.
- [x] Real escape without teleport: S reaches(8.023434,20.486601),
  collision=false; no sticky contact.
- [x] West approach: setup(7.4,20.053605464,heading0), W stops at
  (7.700608832,20.053605266),actualSpeed0/collision=true. Correct side;
  no eastward snap. Expected theta7.700608852.
- [x] Near miss south of tree: setup(7.45,20.4,heading0), W+Shift reaches
  (10.117702,20.399999994),collision=false. Crosses tree longitude outside
  expanded radius, without phantom blocking.
- [ ] Other sides, diagonal contacts, full orbit and visible mesh-versus-
  collider padding review remain open. No all-tree/all-circle signoff.

#### INPUT-07 lifecycle attempt — INCONCLUSIVE, not a game defect

- [x] Started W+Shift on clear park setup(0,-3,heading0), observed run1.6355.
  Added read-only trusted blur/visibility event recorder. Opened separate
  about:blank tab, brought it forward, then returned and closed only that tab.
- [ ] Runtime emitted NO blur/visibility events; document.hasFocus stayed
  true. Movement remained active, but no actual lifecycle transition occurred.
  This does not establish failed cleanup. Genuine focus-loss case stays open;
  no synthetic event substituted. Released W/Shift afterwards.

#### INPUT-03 / INPUT-05 — mixed bindings and braking subsets

- [x] W+ArrowDown opposing combination on clear setup(0,-3) settles inactive,
  actualSpeed0,finite heading. Small0.045956 displacement occurred while
  separate key events arrived; not a simultaneous-input zero-displacement test.
- [x] Release ArrowDown while W held: walking resumes,inputActive=true,
  speed0.815689. Press Space while W remains: inactive,actualSpeed0,
  speed0.00000226. Release direction then brake: keys cleared.
- [x] Near-obstacle brake: approach fountain from(4.7,3.3,heading−π/2)
  with W+Shift, stop at(4.7,3.5), then Space. Hold through time842.7138→
  841.2738: exact pose unchanged,actualSpeed0,inactive,idle.
- [x] Release Space while W+Shift remains: inputActive=true,blocked state,
  actualSpeed0 and unchanged pose. Resumed intent does not penetrate basin.
  Released all three keys after observation.
- [ ] Other mixed opposing pairs/release permutations and flat-wall/box-
  corner braking variants remain open.
- [x] Console: zero errors; FOUR WebGL driver ReadPixels GPU-stall warnings.
  Do not report warning-free or use this runner for responsive-hardware FPS
  signoff. All held inputs released; no network interception left active.

### Batch 8 — target-bearing fix and continuous first leg (2026-10-05)

Inspected current files and execution ledger; preserved unrelated dirty work.
Initial candidate index-Djj_gU_p.js/game-Cb3epXk-.js. Normal fresh Start,
no developer mode. Primary browser testing; separate read-only source review
identified the heading helper while the first-route attempt was in progress.

#### QA-NAV-ARROW-001 — HUD arrow follows rider instead of destination

- [x] FIRST TEST: fresh spawn(12,12) faced0.65rad, although target(0,0) lies
  northwest at about2.35619449rad. Real keyboard route attempt reached
  (9.406737662,9.610597307), without teleport. At rest camera−2.629723791,
  independent planar target bearing+1.307986290rad, actual HUD arrow
  −0.033503732rad. Arrow nearly forward despite target about75° right.
- [x] SOURCE: headingTowardStop compared squared unit-sphere tangent length
  against0.0001. Metric world radius50000 makes actual nearby destination
  vectors smaller than that cutoff; fallback returned rider.heading. Both
  initial facing and HUD consumed this helper.
- [x] FIX: compute tangent using world-unit surfaceOffsetFromNormal and
  squared1e-12 coincident tolerance. Retain heading only for coincident target.
  No target positions, input mapping, delivery radius or progress logic changed.
- [x] REGRESSION: new scripts/validate-target-heading.mjs exercises89 real
  production-helper cases: cardinal/diagonal/near, multiple origins, spawn,
  explicit delivery offsets (including zero), and coincident fallback.
  All pass; legacy calculation reproduced in memory fails77 directional cases.
- [x] BUILD/RESTART: build61 modules, restarted existing8101 service.
  Browser loaded index-DrdXrikh.js; game-BtwQVbEd.js; CSS unchanged.
- [x] MANUAL RETEST fresh Start: heading/camera2.356194504592308 at(12,12),
  arrow0rad correctly faces first target.
- [x] MANUAL RETEST turn away: real D, release and allow camera to settle.
  At(12.103897110,11.889109505), camera0.617411992; independently expected
  arrow−1.747734351rad, actual−1.747730336rad. Matches within0.000005rad.
  Earlier in-motion sample differed0.1rad while camera was recentering;
  only settled observation signs off the numeric alignment check.
- [ ] Moving-camera arrow timing/lag acceptance and all seven target bearings
  remain separate variants; do not infer them from stationary alignment.

#### LINK-01 / DEL-01 — normal spawn to first handoff, continuous no teleport

Fresh reload/Start after fix. Real keyboard W/Shift and camera-relative WASD
steering only. Waypoint scripts choose actual keys from observed camera/pose;
no teleport, rider mutations, speed hacks, timer edits or progress edits.
Paused/released keys between inspection calls. This proves connected local
playability, not a timed human usability benchmark or full seven-stop journey.

- [x] Spawn(12,12)→(11.311132,11.311133)→(10.351163,10.351163).
- [x] Resized1280×720→800×600 to reduce software-renderer work; no game
  state changes. Continued(8.738970,8.738970)→(7.202946,7.118926)
  past southeast park obstacle; no trap.
- [x] Direct line reached(5.961834,5.877814), then basin contact at
  (5.754796,5.559872),collision=true. Inspected screenshot
  `/tmp/qa-batch8-route-fountain.png`: player meets visible fountain edge.
  This is expected solid geometry, not a route-blocking bug.
- [x] Real keyboard east detour: (6.214209,5.247866)→(6.366855,4.772383)
  →(6.301512,4.258950)→(6.163943,2.955774),no sampled collision.
- [x] Northwest toward handoff: (5.454023,2.743142)→(4.086063,1.833887)
  →(3.761670,1.525447)→(2.174945,0.782312)→(1.898515,0.628343).
- [x] Crossing to(1.063660,0.163336) awards exactly1, targetIndex1/Gazebo,
  bonus+5s, delivered Alun-Alun toast, timer866.8337. No sampled collision
  on final approach. This completes LINK-01's one tested route, not DEL-07.
- [x] DEL-06 handoff subset: HUD1/7, correct Alun-Alun toast, next Gazebo,
  distance70m and arrow switches direction (−2.222672661rad sampled).
  Exact moving-camera bearing to new target and all markers not yet signed off.
- [ ] LINK-02 onward, walking-only feasibility, reverse route, and complete
  uninterrupted seven-delivery journey remain untested. Current round is
  preserved at first delivery for continuation rather than reset unnecessarily.
- [x] Regression verification: target heading89 cases, circular movement64,
  input-focus, map-metadata, map validator plus traffic post-hook pass.
  These automated checks are not additional manual-browser coverage.

### Batch 9 — Alun-Alun to Gazebo and pavilion access (2026-10-05)

Inspected current files/ledger. Prior browser session was absent: only
about:blank remained. Do not claim continuation of Batch8's round. New page
`?qa=oct05-link02`, viewport800×600, normal Start, served index-DrdXrikh.js
(unchanged Batch8 build). No game code changes or restart needed this batch.

- [x] Explicit prerequisite setup: teleport(-1.3,0,heading0) outside first
  handoff, then real W to(-0.562977,0) legitimately awards1/Gazebo active.
  No timer/count/target edits. This setup does NOT count as spawn-route coverage.
- [x] From this point through stair descent, NO additional teleports or state
  mutations. Camera-relative real keyboard W/A/S/D and Shift selected from
  observed pose/heading, released between inspections. Sparse samples below
  establish a connected route, not per-frame collision-proof or human timing.

#### LINK-02 / AREA-E-R / DEL-01 — continuous first-to-second handoff

- [x] Read-only candidate probes on central path: (-.5,2),(-.5,5),(-.5,8),
  (1,10),(3.08,12) clear. Probes were not substituted for movement.
- [x] Real route checkpoints: (-0.545959,2.307348)→(-0.009190,3.978455)
  →(0.487458,5.524654)→(0.943988,6.945955)→(1.601123,8.991795)
  →(2.137892,10.662901)→(2.714783,12.458917), no sampled collision.
  Gazebo remains active, count1 until actual handoff.
- [x] North approach reaches(2.868385,12.937122), awards count2, next
  Al-Abror, bonus+10s, Gazebo Situbondo toast, time870.28. Inspected
  `/tmp/qa-link02-north-block.png`: correct pavilion and feedback visible.
- [x] The award is proximity-based outside platform, consistent with current
  contract. Do not claim entering the floor from the north, or change delivery
  to require stairs without an explicit design decision.
- [ ] LINK-03 to mosque, entire seven-stop route, alternate walking-only leg,
  reverse leg and subjective wayfinding without coordinate assistance remain
  untested. This batch does not satisfy DEL-07/JOURNEY-01.

#### PARK-10 / AREA-E-G/M — north block, recovery, stair ascent/descent

Source oracles: handoff(3.08,14.1), yaw−.46π, plinth height.10, floor.22
before baseLift, six stairs in.22/6 increments, max walkable step.055.
Stairs face south; north arrival is not the intended stair entry.

- [x] North-edge push: real W from award point remains at
  (2.868390,12.937138),actualSpeed0/collision=true. No climb through raised
  edge. Screenshot shows contact at the visible pavilion base.
- [x] Recover without teleport: steer away west through(2.399707,12.792212)
  →(1.272210,12.568417)→(0.797701,12.336547)→(-0.580908,12.658773).
  Initial attempted turn remained blocked briefly; continued steering escaped.
- [x] West-end passage: (-0.685979,13.173855)→(-0.842287,13.940052)
  →(-0.973393,14.582716)→(-0.571119,15.019990)→(-0.648908,16.393450).
  No sampled collision/trap. This tests one line, not every nearby tree/base.
- [x] South apron to stairs: (0.653728,16.359406)→(1.540378,16.306409)
  →(2.043537,16.145928)→(3.061355,16.233272), no sampled collision.
- [x] Ascend at walk speed: sampled positions/lifts
  (2.918200,15.493322)/.0692277 →(2.933187,15.307747)/.1425610
  →(2.979474,15.163215)/.1792277 →(3.042352,14.966877)/.2158944
  →(3.031512,14.403782)/.2158944. No sampled collision; actual probe
  identifies Gazebo pavilion floor, not merely delivery success.
- [x] Inspected `/tmp/qa-gazebo-floor-batch9.png`: player stands on tiled
  interior, columns/roof visible. This is one camera view, not all camera tests.
- [x] Descend via stairs: floor(3.122783,14.946526)/.2158944 →
  (3.159453,15.130113)/.1792277 →(3.178905,15.259736)/.1425610 →
  (3.307923,15.421133)/.1058944 →(3.267695,15.541393)/.0692277 →
  (3.232398,15.717238)/.0367500 →(3.335600,16.226801)/.0367500.
  No sampled collision; final probe identifies Jalan Kartini local-road asphalt.
- [x] DEL-04 Gazebo subset: after first award, left radius via west end,
  reentered on stair/floor approach, then left again; count remained2 and
  target Al-Abror. One return loop only; no duplicate award.
- [ ] Ten-simulation-second stationary linger, repeat loops, running stair
  traversal, both oblique approaches, each column collision, railing intent,
  edge-drop behavior and camera exit visibility variants remain open.
- [x] End: count2,next Al-Abror,time826.12, near(3.335600,16.226801), all
  input keys released. Preserve round if browser session survives; otherwise
  clearly document prerequisite setup rather than claiming route continuity.
- [x] Browser console: zero errors, four ReadPixels GPU-stall warnings.
  git diff --check passes; service8101 active. No new confirmed bug, therefore
  no fix/retest chain or additional game-code changes invented for this batch.

### Batch 10 — run stairs, resize lifecycle, HUD breakpoint repair (2026-10-05)

Previous browser tab absent again (about:blank); no continuity with Batch9
claimed. Fresh800×600 page `?qa=oct05-batch10`, initial index-DrdXrikh.js.
Normal Start click timed out in the tool, but readback showed started=true;
did not click again or misclassify timeout as startup failure. Local outside
setups(-1.3,0) and(3.08,16.1), followed by real keyboard movement, acquired
first and second deliveries. No progress/timer edits. LINK-03 remains NOT RUN:
run-stair and responsive corner tests took priority after fresh-session setup.

#### PARK-10 / AREA-E-M — running stair variant

- [x] South setup(3.08,16.1,headingπ/2), real Shift+W reaches
  (3.08,15.528206),lift.069227708, then(3.08,14.963155),lift.215894375,
  count2. Run ascent reaches actual floor without sampled collision.
- [ ] Initial descent attempt not signed off: S+Shift reaches
  (3.220192,15.283551),lift.142561042, but subsequent W while camera was
  recentering moved to(2.919957,15.229748). Not a straight descent proof.
- [x] Guided run descent: real directional keys with Shift through
  (2.799254,15.138468)/.179227708 →(2.665650,15.307335)/.142561042 →
  (2.730394,15.415735)/.105894375 →(2.792246,15.702743)/.036750000.
  No sampled collision; reaches apron elevation. Not all oblique/speed cases.

#### UI-09/14 and resize-during-drag subset

- [x] Inspected320×568 gameplay screenshot `/tmp/qa-batch10-320.png`.
  HUD/target/Stop fit; document320×568, no horizontal overflow.
- [x] Real mouse drag from(6,540) to(60,480): analog active, pad bounds
  x8..150,y418..560; visible Run x161..219,y460..518; Stop x260..308,y100..148.
  All in viewport. This is mouse-pointer coverage, NOT physical touch signoff.
- [x] Resize active drag portrait→568×320; controls clear, but first read
  followed pointerup, so that observation alone cannot attribute reset to resize.
- [x] Isolated retest: at568×320, drag(20,290)→(70,245), analog(.6667,-.6),
  pointerActive=true. Resize to320×568; read BEFORE pointerup: analog(0,0),
  pointerActive=false,run=false,brake=false. Then release pointer.
- [ ] Genuine blur/visibility still INCONCLUSIVE: disabling CDP focus
  emulation then bringing a separate blank tab forward produced no trusted
  blur/visibility events; original remained focused/visible. Restored original,
  closed only test tab, detached CDP. No synthetic event used as signoff.

#### QA-UI-481-001 — target panel covers letter-count HUD

- [x] FIRST TEST UI-14: widths479/480 use compact layout without overlap;
  at481×520 target bounds[18,294], HUD[233,463], same vertical band,
  overlap61px. Gameplay screenshot `/tmp/qa-hud-overlap-481-before.png`
  visibly hides the letter count. Wider tested699/700/701/759/760/761 clear.
- [x] SOURCE: default target width276 plus HUD230, margins36 and desired
  gap12 require554px, but compact override ends at480px.
- [x] FIX: default target width now min(276px, viewport minus both safe-area
  margins,230px HUD and12px gap). Existing≤480 compact overrides unchanged.
  Existing typography/colors/controls retained; frontend-design skill guided
  preserving the established design and checking actual breakpoint boundaries.
- [x] BUILD/RESTART:61 modules; restarted existing8101 service. Browser
  verified index-Dpbd9ysP.js and style-mJCtP5qM.css; game-CpmaoDib.js.
- [x] RETEST481: actual target[18,221],HUD[233,463],gap12; screenshot
  `/tmp/qa-hud-overlap-481-after.png` inspected, letter/time/bonus readable.
  Start click again exceeded tool timeout, readback confirmed active; no replay.
- [x] Boundary retests, returned browser measurements: widths320,479,480,
  481,500,553,554,555,699,700,701,759,760,761 at height520 all clear.
  Gap at320≈8.016;481/500/553/554=12;555=13. Full276px target restored554+.
  document.scrollWidth equals viewport width at every returned observation.
- [x] Height519/520/521 at481px and landscape568×320 also clear; Stop
  in bounds. Inspected `/tmp/qa-hud-landscape-after.png`.
- [x] Large initial retest sweep exceeded60s tool limit; NOT counted from
  timeout. Reran smaller groups and used their returned observations above.
- [x] Review/regressions: input-focus,89 target-heading scenarios,map-metadata,
  map validation and traffic post-hook pass. No additional source edits by reviewer.
- [ ] Entire UI-14 is NOT complete: title/result/dev screens, zoom/text scaling,
  physical safe-area insets, long target variants and detailed camera-cutoff
  behavior remain open.230px reservation follows current HUD sizing and must
  be revisited if that sizing changes.
- [ ] LINK-03 remains pending. Build reload reset round; current test page
  is normal active0/7, not the earlier2/7 route state.

### Batch 11 — mixed keyboard/analog input (2026-10-05, interrupted/resumed)

Initial page `?qa=oct05-batch11`, normal mode,800×600. The server interruption
destroyed the browser tab; resume found only about:blank. Results below were
returned before interruption, not inferred from the lost session. No game
code edits. Clear-ground local setup(0,-3,heading0) used for input isolation.

- [x] INPUT-14 pre-start subset: held W before clicking Start; after Start
  and another4 wall seconds, exact spawn(12,12),speed0,inputActive=false.
  Released W; fresh W at clear setup moves,speed.803989,inputActive=true.
  Editable-field release variant remains untested.
- [x] TOUCH-09 same-direction saturation: actual canvas drag origin(200,300)
  to(200,225), analog(0,-1), W held; speed.819398,actualSpeed.819352,
  no collision. Full input does not double normal walk speed.82.
- [x] Pointer-release-first: mouseup while W remains held zeros analog,
  pointerActive=false, inputActive=true,speed.820000,actualSpeed.820040.
- [x] Full opposing cancellation: full forward drag + S; inputActive=false,
  actualSpeed0,speed decayed to.000571,idle. No stuck forward input.
- [x] Partial opposing input: move same pointer to(200,262.5),keep S;
  analog(0,-.5),inputActive=true,speed.313292,actualSpeed.313345.
  Expected settled speed.314947729; observed acceleration approaches it.
  desiredHeading−controlHeading=−π, correct backward direction. Not a
  straight world-line assertion: camera-relative backward movement curves.
- [ ] Interruption occurred with S/pointer held. Resume had no game tab;
  sent key/pointer releases defensively. This is not lifecycle cleanup proof.
- [x] Resumed after second server interruption: read ledger before acting,
  fresh800×600 normal Start at `?qa=batch11-resume`, verified served
  index-Dpbd9ysP.js. Preserved all existing source changes.
- [x] Key-release-first: half-forward drag(0,-.5)+W, speed.797805 while
  accelerating; release W, keep pointer held → pointerActive=true,
  inputActive=true, speed.315736 toward expected.314947729. Mouseup afterwards.
- [x] Orthogonal addition: half-forward drag+D, desiredHeading−controlHeading
  =−1.107148718rad, correct `(1,.5)` direction; speed.797805 while accelerating
  toward.82, not a settled maximum-speed assertion. No sampled collision.
- [x] Half-left drag+D: analog(-.5,0), desired−control=−π/2, speed.313292
  toward expected.314947729, correct partial-right input. No sampled collision.
- [x] Half-forward drag+S+Shift: backward heading delta−π, speed.622886
  toward expected.629895458. No sampled collision. `controls.run=false`
  represents touch-button state, not keyboard Shift; not classified as failure.
- [x] TOUCH-12 forward deadzone samples from resting heading1rad:
 7.4px → magnitude.098666585,inputActive=false,speed0,no movement;
 7.5px → magnitude.1,inputActive=true,speed0,no movement;
 7.6px → magnitude.101333415,inputActive=true,speed.000323518,
  displacement≈.00006234,actualSpeed0,idle animation. Consistent with existing
  fine-input numerical caveat; not a30/60/144Hz usability signoff.
- [x] Forward clamp:74px→analogY−.986666667;75px→−1;76px→−1.
- [x] Edge logical-origin check: canvas drag(790,590)→(790,515),analog(0,-1).
  Visual pad clamped to x644..792/y444..592 and Run x575..633/y489..547;
  input still measures75px from actual pointer origin, not clamped visual center.
- [ ] Remaining TOUCH-09/12/15/16/17 variants: all directions, equal-radius
  diagonal speeds, settled-speed samples across frame rates, both pointer/key
  release orders for every combination, physical-touch ownership and threshold
  oscillation while camera/rider headings differ. Parent cases not fully signed off.

#### QA-UI-TITLE-320-001 — title clipped on narrow startup screen

- [x] FIRST TEST UI-05:320×568, actual h1 box x36..284,width248, but text
  Range x36..359.5625,width323.5625 at50px font. Inspected
  `/tmp/qa-title-320-batch11.png`: both title lines cut off at right viewport.
  Start was in bounds(y458.23..506.23); clipping was not a blocked-start claim.
- [x] SOURCE: small-width override fixed title to50px; short-height override
  separately fixed46px. Both could exceed narrow padded content width.
- [x] FIX: narrow title font min(50px,11vw), short-height min(46px,11vw).
  Preserved title typeface/shadow, colors and line break. Frontend-design skill
  guided existing-style preservation and portrait/landscape verification.
- [x] BUILD/RESTART:61 modules; existing8101 service restarted. Browser
  verifies index-DGfHFUG9.js/style-CtScVd0T.css; game-jpzxQiT6.js.
- [x] MANUAL RETEST320×568: text x46.14..273.84, font35.2px, within content
  x36..284; Start y446.09..494.09. Inspected `/tmp/qa-title-320-fixed.png`,
  full title and main action readable.
- [x] Additional title/action bounds PASS:320×480,568×320,480×520,481×521,
  800×600. Reserved5px for title shadow in right-edge check. At568×320,
  title top5.27/bottom92.98, Start bottom307.75; inspected landscape screenshot
  `/tmp/qa-title-landscape-fixed.png`, no clipped title/action.
- [x] UI-07/INPUT-12 subset: at568×320, actual Tab focuses Start with solid
  outline; Enter starts round, focus moves to canvas#scene, rider idle. No
  pointer activation used for this start.
- [ ] Result/dev-login/editor screens, enlarged fonts/zoom, physical safe areas
  and broader accessibility remain untested. Do not mark whole UI-05 complete.
- [x] Ledger correction only: TOUCH-13 now reflects existing pointer-ID Sets
  introduced in earlier input fix. This is not new multitouch manual coverage.
- [x] Final checks: input-focus,89 target-heading cases,map-metadata,map and
  chained traffic validations pass; git diff --check passes; service8101 active.
  Final post-reload console read: zero errors/warnings. Earlier initial page
  emitted four ReadPixels warnings; do not erase that earlier observation.

### Batch 12 — resumed connected mosque approach (2026-10-05, in progress)

- [x] Inspected dirty worktree and existing ledger before acting. Browser had
  only about:blank; this is a new round, not continuation of Batch11. Started
  normally at `?qa=batch12`; verified served index-DGfHFUG9.js. No game changes.
- [x] Prerequisites only: teleport(-1.3,0,0), real W to(-.825132,0)
  awards first delivery. Teleport(2.8,12.4,-pi/2) OUTSIDE Gazebo handoff;
  real W reaches(2.8,12.927587), blocked by north raised edge, still1/7.
  Real A sidestep reaches(2.862844,12.932943), legitimately awards2/7,
  targetIndex2/Al-Abror. No timer, count, target or completion mutations.
- [x] LINK-03 started at that second handoff, with NO subsequent teleport.
  Real camera-relative keys and Shift: (2.064316,12.353238)
  →(1.810640,11.291775)→(2.298117,10.380201)
  →(1.958515,10.240149)→(1.641114,10.466471).
  No collision at these snapshots; not a per-frame clearance proof.
- [x] One multi-step Playwright call timed out. Released W/A/S/D/Shift and
  inspected actual state before proceeding. Subsequent holds use finally
  releases. Timeout is a harness issue, not evidence of a game defect.
- [ ] LINK-03 completion remains NOT RUN; no mosque award or gate traversal
  has occurred in this batch. Software WebGL is extremely slow (many calls
  take40–55 wall seconds for sub-unit movement). Do not infer human timing.
- [ ] Source-review candidates only: mosque gate leaf visibly occupies the
  navigation opening; gate posts and canopy posts may not match collision.
  Reproduce visually twice before classifying/fixing. Prayer hall is an
  intentional solid blocker. Gate center world(-18.669953,2.817740),
  exterior(-18.228834,2.728779), interior(-19.160085,2.916584).

#### QA-MOSQUE-GATE-001 — visibly closed pedestrian gate was traversable

- [x] FIRST TEST: local setup at gate exterior(-18.228834,2.728779),
  heading pi+.199; W18 wall seconds crosses gate plane to
  (-18.758511,2.835599), collision=false. Before/crossing screenshots
  `/tmp/qa-batch12-mosque-gate-before.png` and
  `/tmp/qa-batch12-mosque-gate-crossing.png` inspected: rider passes through
  the closed green grille. Repeated same setup/input and reproduced exact
  endpoint. These are local geometry tests, NOT connected delivery evidence.
- [x] Accuracy correction to Batch12 scope: LINK-03's last connected point
  was(1.202197,11.685417), still2/7. The subsequent gate-exterior teleport
  itself entered mosque delivery range and awarded3/7; that award is NOT a
  valid connector or delivery test. LINK-03 remains incomplete.
- [x] FIX: retained gold frame/green grille as an inward-open90-degree leaf,
  hinge local(.06,5.2). Added collider matching opened leaf and both .27wide
  posts. Existing walkable forecourt remains accessible; hall remains solid.
  This represents intended gameplay access, not new Google360 evidence that
  the real gate was open on its photograph date. No road/sidewalk changes.
- [x] Regression added to actual model-constructor test: named leaf transform,
  batched geometry span, leaf/post collision dimensions, production rider
  radius clearance at centerx.29. Seven model constructors pass.
- [x] BUILD/RESTART:61 modules; restarted existing pendopo-game.service8101,
  browser loaded index-f3yzHG4c.js (game-DTzW4p7F.js). Fresh normal Start,
  local gate tests with0/7; no progress manipulation.
- [x] MANUAL RETEST walking: same exterior and heading, W18 wall seconds
  reaches(-19.208516,2.926351), collision=false, forecourt lift.075713775.
  Repeated to(-18.960505,2.876334), no collision. Inspected screenshot
  `/tmp/qa-batch12-mosque-gate-fixed-repeat.png`: open grille alongside
  passage, rider visible inside. Unequal endpoints reflect software-renderer
  frame counts; wall duration is not equal simulation duration.
- [x] Connected walking return from that second interior position using S
  reaches(-18.517878,2.904254), across gate plane, collision=false.
  Camera-relative backward steering curves; not a straight-line assertion.
- [x] Run-entry subset: same exterior setup, W+Shift12 wall seconds passes
  opening and reaches(-19.371795,3.228757). Final collision is intentional
  prayer hall (probe gap approximately0), not gate. No run-exit signoff.
- [x] RIGHT POST negative control: localx.62 exterior setup
  (-18.294071,2.405292), W15s stops at(-18.568546,2.460645), actualSpeed0,
  collision=true, post gap≈−.0000011. Adjacent fence gap+.04.
- [x] OPEN LEAF negative control: safe interior start(-18.926799,2.859337),
  initial leaf gap+.157496; heading .199-pi/2, W12s stops sideways at
  (-18.895639,3.013723), actualSpeed0, collision=true, leaf gap≈−.0000091.
  Nearest post remains+.043686. Brief S retreat moves but contacts neighboring
  geometry; no broad escape/no-trap claim from that short sample.
- [x] LEFT POST/name-wall negative control: exterior at localx−.02,
  W+Shift10s stops(-18.442022,3.088024), actualSpeed0, collision=true,
  post/name-wall gaps approximately0. No run-through.
- [ ] Camera investigation remains open: first fixed walk's deeper forecourt
  screenshot `/tmp/qa-batch12-mosque-gate-fixed.png` hides rider behind nearby
  architecture; shallower repeat shows rider. Need exact-pose repeated
  screenshots to distinguish hall occlusion, near-plane clipping and camera
  obstruction. Source confirms nested leaf IS in recursive camera raycasts;
  do not remove colliders or claim camera case passed.
- [ ] Still untested: all oblique post/leaf approaches, other gate headings,
  run exit, canopy-post collisions, stairs,699/700/701 camera variants and
  physical/mobile input. Parent AREA-D and camera cases remain incomplete.
- [x] Final automated checks: landmark geometry incl. new gate assertions,
  64 circular movement scenarios, input-focus, map and chained traffic
  validators pass. git diff --check clean;8101 service active. Post-reload
  browser console zero errors/warnings; original batch page had4 warnings.

### Batch 13 — mosque side-door penetration (2026-10-05)

#### QA-MOSQUE-DOOR-001 — rider disappears inside protruding closed door

- [x] Inspected current source/ledger and preserved dirty worktree. Browser
  had only about:blank. Fresh normal Start at `?qa=batch13`,699×520,
  index-f3yzHG4c.js; local setup at gate exterior(-18.228834,2.728779),
  heading pi+.199. No progress/count/timer changes.
- [x] FIRST TEST: real W16s then W6s, releases between, reaches
  (-19.179245,2.920448). Screenshot `/tmp/qa-b13-camera699-before.png`
  shows rider body embedded in teal side door; camera unobstructed/compression1.
- [x] REPRODUCTION: same exterior setup, W26s to(-19.340498,3.087744),
  collision finally at prayer hall. `/tmp/qa-b13-camera699-repeat.png`
  shows rider entirely occluded by the door. Local setups are not route proof.
- [x] ROOT CAUSE: hall collider ends around hall-localz3.98–3.99, but
  side frames occupyz4.105..4.155 and door panesz4.15..4.19. Production
  geometry checks confirm the uncovered panes. This explains Batch12's
  apparent camera issue; camera raycasting itself was not proven faulty.
- [x] FIX: eight footprint-matched boxes for four side-door frames/panes,
  transformed by the same hall yaw−.4174. Reused door-x list for visual and
  collision placement. No full-width phantom barrier, visual redesign, road,
  camera or gameplay-state changes.
- [x] Constructor regression: exact transformed boxes, real pane ray hits,
  rider-radius front-face samples, no over-expansion, formerly embedded
  position blocked, gate approach remains clear. In-memory removal of the
  eight new boxes fails the assertions (not a pre-edit disk-test claim).
- [x] BUILD/RESTART:61 modules, restarted existing8101 service. Browser
  verifies index-Dw_1cGVd.js; built game-DKs4IEfZ.js. Normal fresh Start.
- [x] MANUAL RETEST:699×520, same exterior setup and W26s now stops at
  (-19.119060,3.059327), actualSpeed0. Door/leaf contact, hall remains
  +.210021 away. Screenshot `/tmp/qa-b13-door-fixed699.png` shows rider
  visibly in front of door rather than inside it.
- [x] Same reached pose, real resize700×520 then701×520: inspected
  `/tmp/qa-b13-door-fixed700.png` and `/tmp/qa-b13-door-fixed701.png`;
  rider remains visible. This covers only this pose/heading at breakpoint,
  not all camera corner-clearance or movement variants.
- [x] NO-TRAP / gate-exit subset, no teleport after contact: S8s retreats
  to(-18.833018,2.976940) and contacts gate post; A4s sidesteps to
  (-18.786504,2.896794), collision=false; W+D+Shift7s exits onto public
  sidewalk(-18.402847,2.831983), collision=false. Actual key steering is
  camera-relative and curved, not a straight-line exit assertion.
- [x] RUN RETEST701×520: same safe exterior setup, W+Shift18s reaches
  (-19.119013,3.059311), actualSpeed0, door/leaf contact, hall gap+.210063.
  No sampled run-through. Input released in finally.
- [x] REPEAT WALK699×520: same safe exterior and W26s only reached
  (-18.957629,2.875754) due fewer rendered frames. Continued W15s, reaches
  (-19.119060,3.059327), actualSpeed0, door contact; confirms same blocking
  location. Do not claim equal wall duration produces equal simulated motion.
- [x] Adjacent hall-localx1.42 door: read-only probe confirms safe start
  (-19.058040,3.707904), door gap+.199998. Local setup there, real W12s
  at heading pi+.199−.4174 stops(-19.253289,3.664570), actualSpeed0,
  pane gap≈−.0000042, hall gap+.210117, frame gap+.034994.
- [x] Rejected invalid setup candidates: hall-localz4.45 atx−2.05 and−1.42
  overlaps guard booth (probe gaps−.396911/−.052051); x2.05 overlaps open
  gate leaf (−.072465). Did NOT teleport to those points or count them as
  manual coverage. All four doors have constructor coverage, only the two
  eastern doors have manual contact coverage in this batch.
- [x] Final automated checks pass: seven model constructors including real
  pane-ray/collision assertions,64 circular movement scenarios,input-focus,
  map and chained traffic validations. git diff --check clean;8101 active.
  Post-reload console0 errors/warnings; first page had4 GPU warnings.
- [ ] Remaining side doors need valid approaches; central-door/façade
  protrusions, canopy posts, stairs, all-angle camera clearance, and full
  connected delivery journeys remain untested. Do not sign off AREA-D.

### Batch 14 — canopy shafts and missing landmark camera collision (2026-10-05)

Fresh browser (only about:blank survived), normal Start,800×600,
`?qa=batch14`, index-Dw_1cGVd.js. Inspected source and preserved existing
dirty work. Local test setup teleports only to probed clear points; all contact
and gap tests use real keyboard movement. No delivery/count/timer edits.

#### QA-MOSQUE-POST-001 — walk-through canopy shafts

- [x] FIRST TEST: safe hall-local(1.04,4.7), world(-18.896312,4.133044),
  heading2.923192654. W12s reaches hall(1.04,4.094125), collision=false,
  crossing the visible shaft centered atz4.46.
- [x] REPRODUCTION: same setup, W10s reaches hall(1.04,4.281201),
  collision=false. Screenshots `/tmp/qa-b14-post-before.png` and
  `/tmp/qa-b14-post-through.png` also expose a separate camera problem
  below; they are not clean visual signoff of the shaft traversal.
- [x] FIX: collect each shaft's actual clipped position in visual constructor
  and register rotated .045×.045 box;13 posts. No collider across the canopy
  span and no oversized cap-footprint collider at ground level.
- [x] Constructor regression:13 actual transformed/clipped centers, visible
  shaft ray hits, four-sided rider-radius contact, center overlap, outside
  clearance and neighboring gaps. In-memory missing-post negative control
  fails. This is automated coverage, not manual traversal of all13 posts.
- [x] BUILD/RESTART:61 modules, existing8101 service restarted; browser
  verifies index-C8h-vQ2o.js/game-DwfMzd8q.js.
- [x] WALK RETEST: same setup W12s stops(-19.050071,4.098919),
  actualSpeed0, collision=true; expected front-contact position matches.
  Post gap≈−.0000069; nearest door remains+.321157 away.
- [x] RUN RETEST: same setup W+Shift10s stops at same post boundary,
  actualSpeed0, collision=true. No sampled run-through.
- [x] GAP negative control: safe hall(.78,4.7), W12s passes shaft row to
  hall(.78,4.355616), collision=false. This is one tested gap, not all gaps.
- [x] Additional walking repeat W10s reaches same boundary. All keys
  released in finally. Renderer timing varies; compare contact, not wall time.

#### QA-CAMERA-REGISTRATION-001 — retained landmarks absent from camera collision

- [x] FIRST/REPEAT: at safe canopy approach and reached post contact,800×600,
  name wall fills view and hides rider. Inspected
  `/tmp/qa-b14-post-before.png` and `/tmp/qa-b14-post-fixed-camera.png`.
  Camera reports unobstructed/compression1 despite wall between rider/camera.
- [x] ROOT CAUSE: geospatial activation calls resetNavigation(), which clears
  cameraCollisionMeshes. It restores Lesehan but not retained stop groups.
  Production-geometry ray at actual planet coordinates hits charcoal wall
  atdistance.572318 withinsegment.923526; not a floating-point miss.
- [x] FIX: register each retained stop.group after reset and before the alun
  early return in activate-geospatial-world.js. No camera tuning or disabling
  walls. Scope restores intended registration for all retained stop models.
- [x] New validate-camera-registration.mjs exercises production activation
  body with stubbed map/DOM imports and real Three groups: seven stops,
  optional Lesehan, reset ordering, retired objects, second activation and
  duplicate prevention. Removing registration in memory fails as expected.
- [x] BUILD/RESTART again:61 modules,8101 restarted; browser verifies
  index-B8ToskKy.js/game-CQmxMxZP.js.
- [x] MANUAL RETEST: same safe start then W12s to post contact. Camera now
  obstructed=true, compression.551785; inspected
  `/tmp/qa-b14-camera-fixed.png`: rider and shaft visible, no wall-filled view.
  Repeated W10s from same setup reaches same boundary/compression.
- [x] At reached contact resize699×520:compression.557135; inspected
  `/tmp/qa-b14-camera-fixed699.png`, rider visible. Desktop and this narrow
  pose only; not all near-plane corners, angles or NPC interactions.
- [x] Gate regression: safe exterior(-18.228834,2.728779), headingpi+.199,
  W20s passes opening to(-19.095886,2.955359), stops inside forecourt;
  inspected `/tmp/qa-b14-gate-regression.png`, rider visible. No complete
  route/delivery claim; round stays0/7.
- [x] Open-park negative control: safe local setup(0,−3,0), W6s to
  (.418799,−3), collision=false, camera unobstructed/compression1;
  `/tmp/qa-b14-park-camera.png` shows normal rider/environment view. This
  uses a separate setup, NOT continuous camera recovery from mosque to park.
- [x] Final checks pass: camera-registration, landmark geometry,64 circle
  movement cases,input-focus,map plus traffic validators,git diff --check.
  Service8101 active; final browser console0 errors/warnings. First page
  emitted4 GPU warnings; do not overwrite that observation.
- [ ] Remaining: other post faces/gaps and clipped northern post manual
  traversal; broader retained-landmark camera regressions; continuous camera
  recovery; central façade; full connected delivery journeys.
- [ ] STAIR ORACLE MISMATCH (source-only, not a movement failure): declared
  mosque stair centers atlocal(.28,4.08/3.88/3.7) sit inside the deliberately
  solid rotated hall, with no matching explicit stair meshes found. Resolve
  intended geometry before signing off stair ascent or removing hall collision.

### Batch 15 — central closed entrance (2026-10-05)

#### QA-MOSQUE-CENTRAL-001 — central door penetration / camera inside rider

- [x] Inspected source and dirty worktree; fresh browser normal Start800×600,
  `?qa=batch15`, index-B8ToskKy.js. Safe local approach hall(.26,4.7),
  world(-19.065313,4.894515), heading2.923192654. Probe confirms outside
  obstacles, and gap between canopy posts; no progress/timer edits.
- [x] FIRST TEST: W13s reaches hall(.26,4.201061), beyond closed entrance
  glazing atz4.313. Camera compression.108281 and screenshot
  `/tmp/qa-b15-central-before.png` shows camera inside rider/body geometry.
- [x] REPRODUCTION: same safe setup W15s reaches hall(.26,4.201975),
  same compression.108281; main hall finally blocks after door penetration.
- [x] Interrupted before fix. On resume inspected files: no central fix yet,
  ledger ended at Batch14; browser reset to about:blank. Prior tests above
  retained as evidence, not claimed as live browser continuity.
- [x] FIX: collision boxes collected with visual central backing, five glass
  leaves and six stiles, transformed with hall yaw. No wide façade barrier,
  no camera tuning, and no geometry redesign.
- [x] BUILD/RESTART:61 modules,index-raRzxMtw.js/game-ArQrFQJZ.js;
  restarted existing8101 service. Browser verifies index-raRzxMtw.js.
- [x] WALK RETEST: same safe exterior, W15s reaches hall(.259798,4.373),
  actualSpeed0, collision=true. Stops before pane frontz4.313 with rider
  radius.06. Camera unobstructed/compression1; inspected
  `/tmp/qa-b15-central-fixed.png`: rider visible in front of glass.
- [x] RUN RETEST: same setup W+Shift12s stops at hall(.259812,4.373),
  actualSpeed0, collision=true; no sampled penetration. Canopy gap remained
  traversable during both approaches. Keys released in finally.
- [x] REVERSE/no-trap subset: from run contact, no teleport, S7s reaches
  hall(.302159,4.623990), collision=false, camera compression1. This is
  local backward escape, not a connected mosque-to-park recovery journey.
- [ ] OPPOSITE APPROACH INCONCLUSIVE for door: safe hall(−.26,4.7), W14s
  stops near hallz4.440098, then settles at world(-19.440827,5.343827).
  Probe shows forecourt inner edge localz−.684059 vs halfDepth.684019;
  nearest central-door obstacle gap+.057318. Stopped before door contact;
  do not count this as a door pass. Investigate surface/layout transition
  with the existing stair mismatch rather than removing hall collision.
- [x] Regression covers twelve central collision boxes, real rendered faces,
  rotated placement/contact, embedded positions, canopy approach clearance,
  and missing-collider negative control. Prior model assertions preserved.
- [x] Final checks pass: landmark geometry,camera registration,64 circular
  movement cases,input-focus,map and traffic validators,git diff --check.
  Service8101 active. Browser console0 errors,4 ReadPixels GPU warnings.
- [ ] Remaining: other central approach angles, floor/layout mismatch,
  continuous camera recovery, broader area cases and full delivery journeys.
  No claim that all untested cases or AREA-D are complete.

### Batch 16 — missing mosque slab surface (2026-10-05)

#### QA-MOSQUE-FLOOR-001 — invisible forecourt-edge barrier

- [x] Inspected files/ledger; browser only about:blank. Fresh normal Start
 800×600 at `?qa=batch16`, index-raRzxMtw.js. No progress/timer edits.
- [x] REPRODUCTION of Batch15 open case: safe hall(-.26,4.7) setup,
 world(-19.177980,5.402163), heading2.923192654, W14s stops near
 (-19.431708,5.345851), actualSpeed0/collision=true. All nearest solid
 obstacle gaps remain positive, minimum+.066022. Inspected
 `/tmp/qa-b16-floor-before.png`: visibly paved approach ahead.
- [x] Read-only seam probes: hallz4.44 has lift.075713775, z4.42 has
 only mapped-ground lift.0008 despite the rendered stone slab. Existing
 symmetric maximum-step rule correctly rejects that erroneous height jump.
- [x] ROOT CAUSE: existing slab centered(0,-.14),7.5×8.7, top.12 has
 no navigation surface. Forecourt top.08 ends atlocalz3.945. Actual
 transition is only.04, not a drop to ground. Three separate stair/landing
 navigation surfaces have no corresponding stair geometry and are inside hall.
- [x] FIX: register exact existing site slab height/footprint; remove three
 phantom stair surfaces. Hall collision, global step threshold, visible
 geometry, property boundary and public sidewalk remain unchanged.
- [x] BUILD/RESTART:61 modules; existing8101 service restarted. Browser
 verifies index-C4ORrK4z.js/game-DMJADxZ8.js.
- [x] WALK RETEST: same setup W14s crosses former seam and reaches
 (-19.497150,5.331029), now correctly blocked by central glass (gap≈0),
 slab lift.115713775. Inspected `/tmp/qa-b16-floor-fixed.png`, rider
 visible and standing on slab before door.
- [x] REVERSE/no-trap: no teleport after contact. S8s to
 (-19.196456,5.387558), crosses old forecourt inner edge on slab; W5s
 after camera turn reaches(-19.069674,5.489851), forecourt-only
 lift.075713775, collision=false. Real bidirectional transition, curved
 steering; not a certified straight-line or complete mosque exit route.
- [x] RUN RETEST: same safe setup W+Shift10s reaches
 (-19.497152,5.331039), glass contact, actualSpeed0, slab lift.115713775.
 No former-edge blockage or sampled door penetration.
- [x] Gate regression: safe exterior(-18.228834,2.728779), headingpi+.199,
 W18s crosses opening to(-19.118950,3.059289), forecourt lift.075713775,
 blocked at existing side-door/leaf, not public tread. Inspected
 `/tmp/qa-b16-gate-regression.png`: rider visible. No delivery-route claim.
- [x] New constructor regression: real rendered slab ray hits at corners/seam,
 footprint edges, no phantom-stair labels; real spherical navigation tests
 both forecourt/slab transition directions and unchanged gate-exterior height.
 Removing slab reproduces original blockage in negative control.
- [x] Checks pass: landmark geometry,camera registration,64 circular movement
 cases,input-focus,map and chained traffic validators,git diff --check.
 Service8101 active; final browser console0 errors/warnings. Initial page
 emitted4 GPU warnings. These are not extra manual coverage.
- [x] Batch15 opposite door-approach obstruction resolved for tested route;
 historical inconclusive entry retained as first-test evidence. Stale three
 stair labels are removed, not marked as successful physical stair traversal.
- [ ] Other slab edges/angles, remaining area geometry, continuous camera
 recovery and full delivery journeys remain open. Do not sign off AREA-D.
