# CLAUDE.md — TURN 20: the box finds its runner, the bucket finds its files

Twelve findings from the owner's eye test of turns 17–19, three of them
diagnosed to root cause in the lab before this file was written. The drawer
BOX takes its vertical truth from the runner it rides on; the hardware
bucket is read AS IT IS rather than as three documents imagined it; the
CNC sheet's double-click actually fires; labels shrink to half; the ruler
learns AutoCAD's snaps; the modal finally clears the object by the number
the owner asked for, not the number a spec invented.

Read the whole file first. Full autonomy, zero questions. Clean or not at
all; the turn shrinks from the BOTTOM (F12 first, then F11, then F8).

Baseline: main after the turn-19 merge (`5782d10`). Tests at baseline:
1469. CNC fingerprints at baseline: `verify/t19/fingerprints-turn19.txt`
— independently re-derived and confirmed byte-identical to turn 18.

## 0. IRON RULES

All standing rules apply (turns 1–19): engine purity (no react/three
imports under `src/engine/`); `profile.js` the only home of numbers;
"different numbers, never different patterns"; graceful degradation —
a dead bucket, a missing table, mock mode: the app draws and exports,
never blocks; golden fixtures move ONLY where this file names the move;
CNC fingerprint deltas ONLY where this file names them; zero new
dependencies; every phase proven in `verify/t20/` with committed
screenshots.

NEW RULES, from this turn's post-mortem of turn 19 — permanent:

R1. **A pointer gesture is proven with a REAL pointer.** Turn 19's CNC
    double-click walk went green on `element.dispatchEvent(...)` while
    the feature was dead to a real mouse: the sheet's pan captures the
    pointer and the browser composes `dblclick` on the container, so a
    synthetic event aimed at the child proves nothing. Every walk step
    that claims a click, double-click, drag or hover MUST use CDP input
    (`page.mouse.*` / `Input.dispatchMouseEvent`). `dispatchEvent` is
    banned from walks for pointer gestures. Store-level asserts remain
    welcome AS WELL — after the real gesture.

R2. **A bucket claim is proven against the LIVE bucket.** Turn 19 wrote
    a storage path three documents agreed on and the bucket disagreed
    with. The public storage host is not a secret and is already in the
    repo — `public/decors/egger/egger-decors.json` carries absolute
    `tex` URLs; derive the host from the first one. The walk MUST fetch
    the real manifests and HEAD at least one real model file per family
    (assert HTTP 200 and size > 10 KB) before any screenshot of hardware
    is taken. No env var is needed: the bucket is public.

R3. **The real manifest IS a test fixture.** The schema the parser
    expects and the file the owner uploaded diverged silently in turn
    18. Copy the LIVE `manifest.json` of each family, verbatim, into
    `test/fixtures/bucket/` and run the parser over those copies in unit
    tests. When the owner re-uploads, the copies are refreshed by hand —
    a divergence then fails a test instead of greying the scene.

## F1 — The drawer box takes its height from the runner [CRITICAL]

Owner, eye test of turn 18 (translated): "the holes are right, the
runners are right, the fronts are right — only the BOX sits wrong
against them, about 30 mm too high."

The law, one formula for EVERY drawer including the bottom one:

  * bottom face of the drawer BOTTOM panel = runner bottom + **28.5 mm**
  * lower edge of the drawer SIDE          = runner bottom + **13.5 mm**
    (28.5 − 15: the bottom stands in its groove 15 mm above the side's
    lower edge — turn 18's `runnerPocketWidth`, unchanged)

The runner rows themselves are the LISP's and are CORRECT — turn 18
verified them and the owner confirmed them. So did the fronts. The fix
is the box's vertical position ONLY:

1. Locate where the box parts (sides, back, bottom) get their Y in the
   cabinet's coordinate space (`engine/cabinet.js` drawer builders, BUDR
   family and wardrobe drawers alike) and derive it from the runner
   row: `boxSideBottomY = runnerBottomY + 13.5`, bottom panel from the
   groove as it already is relative to the side.
2. **Touch nothing else.** Side HEIGHTS stay exactly as turn 18 cut
   them. Front sizes and positions stay. Runner rows stay. The groove
   (15→34) and the runner pocket (0→15, 2 mm) stay, both measured from
   the side's own lower edge as before.
3. The bottom drawer follows the SAME formula — its runner sits on the
   cabinet floor, the box rides it like any other, and the front being
   longer to cover the carcass floor is already the fronts' law and is
   not re-derived here.
4. The 13.5 and the 28.5 live in `profile.js` under the drawer block,
   named (`boxAboveRunner` or similar), with the derivation in the
   comment. Different numbers, never different patterns.

CNC: the pockets, grooves and drillings are all measured from the
part's OWN edges and none of those move ⇒ **expected CNC fingerprint
delta: ZERO.** Golden fixtures: the box parts' Y positions in engine
output WILL move by ~-20 mm on drawer cabinets — regenerate ONLY those
fields, list every changed fixture with the old→new Y in
`verify/t20/fixture-delta.md`, and justify each line with this formula.
Any fixture field beyond drawer-box Y that moves = the turn is wrong.

Tests: a node:test per kit family (BUDR, BUDR2, BUDR4, wardrobe with
drawers) asserting both numbers against the runner row for every drawer
index, including the bottom one.

## F2 — The hardware bucket, read as it actually is [CRITICAL]

Diagnosed live against the public bucket before this file was written.
Three defects stack; all three die this turn:

1. **Runner path doubled.** `profile.hardware.runner.movento.path` says
   `hardware/runners/blum/movento/` and the URL builder prepends the
   bucket, producing `/hardware/hardware/…` → HTTP 400. Verified: the
   manifest answers 200 at `hardware/runners/blum/movento/manifest.json`
   (path INSIDE the bucket: `runners/blum/movento/`). Fix the profile
   value to the bucket-relative truth: `runners/blum/movento/`.
2. **Hinge path points at a folder that does not exist.** Turn 19 wrote
   `hardware/hinges/blum/cliptop/` (doubled bucket AND a `cliptop`
   level the owner never created). Live truth: manifest and 19 GLBs
   answer 200 at `hardware/hinges/blum/` (in-bucket: `hinges/blum/`).
   Fix the profile value to `hinges/blum/`. Leave a one-line comment:
   if the owner later moves the pack into `cliptop/`, this line follows.
3. **The manifests disagree with the parser.** The live movento
   manifest's items carry `file` values like
   `hardware/blum/movento/760H2500S_44182964.glb` (a path that exists
   nowhere) and NO per-item `system`; the parser drops every such row.
   The live cliptop manifest has the same disease. The manifests are
   the owner's uploads and are NOT re-uploaded this turn — the PARSER
   becomes tolerant instead, for runners and hinges alike:
     * the model URL is ALWAYS `manifest's own folder + basename(file)`
       — the files live beside their manifest, verified live (84.8 KB
       and 69.7 KB answers, no zero-byte files);
     * a row without `system` inherits the manifest's header `system`;
     * the ENGINE match keys on nl / variant / side / (hinge: angle,
       article family) within the loaded catalogue — the profile's
       `system` string selects WHICH catalogue is loaded, it is not a
       per-row filter that can silently empty the list;
     * a row still missing nl or variant is dropped, as before.
4. R3 applies: copy both live manifests verbatim into
   `test/fixtures/bucket/` and unit-test the parser on the copies —
   assert 40 parsed runner rows and 19 parsed hinge rows, with real
   basenames and resolvable URLs.
5. R2 applies: the walk derives the storage host from the decor JSON,
   fetches both manifests live (200), HEADs one GLB per family (200,
   >10 KB), then asserts the in-app registries report loaded models and
   the scene mounts a real mesh where the stand-in used to be. The grey
   stand-in remains the offline path and is separately proven by
   pointing the loader at an unreachable host (mock).

Display only — **CNC fingerprint delta: ZERO.** Fixtures: ZERO.

## F3 — The whole drawer slides, not just its face [HIGH]

Owner: today the front glides out and the box stays in the carcass.

1. The open gesture (double-click the drawer front, `openFronts` 0..1)
   translates front + sides + back + bottom + the runner's MOVING
   profile together along Z. Travel = the drawer's own NL (Movento is
   full-extension; NL is already chosen by `runnerNominalLength`).
2. The runner's fixed profile (cabinet-side) stays put; only the moving
   member and the box ride out. If the GLB is a single body, slide the
   whole model with the box — a note in the code says why, and splitting
   the model is the owner's future call, not this turn's guess.
3. Closed state, gaps, and everything CNC: untouched. The animation is
   the same spring/lerp the front already uses — one value drives all
   the parts of one drawer.
4. Walk (R1): real double-click on a drawer front, screenshot open and
   closed, and a store assert that every box panel of that drawer moved
   by the same Z while the carcass and the fixed profile did not.

## F4 — CNC labels at half size [HIGH]

Owner: wrapping and placement are right since turn 18; the size is
still double what he wants, on the glass and in the file.

1. `profile.cnc.labelHeight`: 40 → **20**.
2. `exportLabelScale` stays 0.5 ⇒ exported DXF label text height
   20 → **10**. `labelMinHeight: 6` and `labelFitRatio: 0.12` stay —
   small parts already size by the ratio and are NOT to shrink twice.
3. **This is the turn's ONLY intended CNC fingerprint delta**, and it
   is confined to TEXT entities: height 20 → 10 (and the wrap layout's
   dependent line positions). `verify/t20/cnc-export-identity.md` names
   it, and the fingerprint diff must show text-height lines and NOTHING
   else. A single moved drill = stop.

## F5 — The modal clears the object by 140 px, level with the click [HIGH]

Owner, verbatim intent: 140 px to the side (right; left when the right
has no room), and the TOP of the panel level with the click — the way
it was before turn 19 lifted the whole panel above the pointer.

1. `profile.ui.modal.anchorOffset`: `{ x: 140, y: 0 }`.
2. `placeAnchoredModal` semantics change: `y` is the offset of the
   panel's TOP from the click (0 = level, negative = up). The turn-19
   law "bottom sits |y| above the object" is DELETED, not kept as a
   mode. Horizontal law stays: right at `click + x`; refuse a clamped
   slide-back; try left at `click − x − width`; else the four-side
   turn-12 fallback.
3. Turn 19's tests pin the old vertical law — rewrite those assertions
   to the new one (top level with the click, clamped to the viewport,
   never over the click point, 140 px of clear glass beside it). The
   corner walk (low-left, low-right, top-right, top-left, centre)
   stays and passes under the new numbers.
4. Every modal inherits through the shell — no per-modal copies. The
   hinge modal, element modal, colour pickers: one arithmetic.
5. Walk (R1): real double-clicks on a door at the five corners,
   screenshots; the door stays visible beside the panel in all five.

## F6 — The ruler learns the object's own points [HIGH]

Owner: the tape grabs wherever the ray lands. It must catch the points
a joiner means — corner, end, middle, the meeting of two parts — show
that it caught one, and only then measure. AutoCAD's osnap, which is
the owner's home ground.

1. Snap targets, generated from the panels' world-space boxes:
   **END** — the 8 corners of every visible panel;
   **MID** — the 12 edge midpoints of every visible panel;
   **INT** — contact points where two panels' boxes touch or overlap
   within 0.5 mm (the shared-edge midpoint and its two ends).
   Pure arithmetic in a lib module (`lib/rulerSnaps.js` or engine-free
   equivalent), unit-tested on a two-panel fixture.
2. Magnet: nearest target within `profile.editor.ruler.snapPx`
   (default **12** px, a UI number, in the profile) of the cursor's
   ray, in SCREEN space. While caught, a marker renders at the point —
   AutoCAD's own vocabulary so the owner reads it without a legend:
   square = END, triangle = MID, cross = INT. Palette colours, ccHelper
   flag so the ruler cannot measure its own marks.
3. A click WITHOUT a caught point places nothing — the tape measures
   points, not air. Escape cancels; the readout, formatMm and the
   0.5 mm grid stay as turn 17 shipped them.
4. Walk (R1): hover near a cabinet corner — marker appears; click,
   hover a second corner, click; the readout equals the engine's own
   distance for those two points to 0.5 mm. Screenshot with both marks
   and the dimension.

## F7 — The CNC sheet answers the pointer [HIGH]

Owner: hover any hole, pocket or groove on the sheet and be told what
it is — like AutoCAD's rollover. Leave, and it goes.

1. Hovering a drill, pocket, groove or mark in `CncView` raises a
   tooltip: kind + layer name; ⌀ for drills, W×H for pockets/grooves;
   depth; corner radius where the tool leaves one; and the distances
   from the feature's centre (drills) or nearest edges (pockets) to the
   PART'S own X and Y edges. All numbers `formatMm`.
2. The data derivation is a pure function over the part's `cnc` block
   (unit-tested); the tooltip is presentation only. Nothing here edits,
   ticks or exports — the sheet after a thousand hovers is byte-for-byte
   the sheet before.
3. Placement: beside the cursor, clamped to the viewport, never covering
   the feature it describes — `clampMenuPosition` already knows how.
   Styling from the profile like every other sheet lettering.
4. Hit targets must survive zoom: the hover zone is the drawn symbol or
   the feature's real extent, whichever is larger on screen (a 5 mm hole
   at far zoom is a few px — give it `annotation.minSymbolPx` grace).
5. Walk (R1): real mouse-move onto a ⌀35 cup drill and onto a runner
   pocket; screenshot each tooltip; assert the numbers against the
   engine's own cnc block for that part.

## F8 — The material shows its wounds: real cuts in 3D [HIGH]

Owner: today only the dog bones are truly cut; every drilling and
pocket must read as REMOVED material, the cut faces a medium-dark grey.

1. Every feature the CNC block knows — drills (through and blind),
   pockets, grooves — renders as a real recess in the panel's solid in
   BOTH the main scene and the cabinet editor, the way the dog bones
   already do. Blind features show their floor at true depth; through
   drills show through.
2. Cut-face colour: `profile.appearance.cutFace`, default `#4a4a4a`
   (medium-dark grey, the owner's words), one number, both scenes read
   it. Decor and sprayed surfaces are NEVER painted onto a cut face —
   a cut is raw board.
3. Performance is part of the feature: repeated cylinders (hinge cups,
   system holes, screw points) go through instancing; feature meshes
   attach per-panel and dispose with it; a distance gate MAY fade
   features when the camera is far, but selected units and the editor
   always show them all. If a gate is used, its threshold is a profile
   number and `verify/t20/perf.md` records before/after frame times on
   the 10-cabinet walk scene.
4. CNC and fixtures: ZERO — this is the same data drawn honestly.
5. Walk: editor open on a BUDR — screenshot showing cup drills, runner
   pockets and the bottom groove as recesses; main scene screenshot of
   the same unit. (SwiftShader is blind in the editor canvas — the
   editor proof may be the main scene at editor framing, plus a scene-
   graph assert that the editor mounts the same recess geometry.)

## F9 — The sheet's double-click actually fires [HIGH]

Root cause, proven in the lab with real CDP input against turn 19's
build: `CncView`'s container calls `setPointerCapture` on EVERY left
press (the pan). A captured pointer makes the browser compose `click`
and `dblclick` on the CONTAINER, so the part's turn-19 handler never
receives them. Real double-click → `cncFocusPart` stays null; a
synthetic `dispatchEvent` on the `<g>` → works. That is how the turn-19
walk went green over a dead feature — see R1.

1. Capture on MOVEMENT, not on press: pointer-down remembers the point;
   the first `pointermove` beyond a small threshold (4 px, profile
   number) starts the pan AND takes the capture; pointer-up before the
   threshold releases cleanly having captured nothing.
2. Result: click/double-click reach the parts; pan feels identical.
   The turn-19 tree behaviour (expand, scroll, light) is already
   written and untouched — it simply starts receiving its event.
3. Walk (R1): REAL double-click on a part mid-sheet → the tree row
   lights and scrolls (screenshot); then a real drag on empty sheet →
   the sheet pans (before/after screenshots); then a real double-click
   AFTER a pan to prove capture released.

## F10 — The lost contexts [HIGH]

Owner's console: `THREE.WebGLRenderer: Context Lost.` ten times over.
The browser is killing WebGL contexts, which means we are leaking them.

1. Diagnose first, in-repo: a dev-only counter on `window.__cc.diag`
   (created contexts, lost events) wired via `webglcontextlost`
   listeners on every `<Canvas>` the app mounts (main scene, cabinet
   editor, render modal, any preview). The walk opens and closes the
   cabinet editor 12 times and the render modal 4 times, then asserts
   lost events = 0 and live contexts ≤ 2.
2. The likely culprit is a canvas that mounts per open without its
   predecessor being disposed — fix at the lifecycle: unmount must
   dispose the renderer and release the context (r3f does this when
   the Canvas truly unmounts; a keep-mounted-but-hidden editor must
   instead REUSE its one canvas). Whichever shape the code has, the
   rule it must end at: ONE context per surface, reused across opens.
3. If the true cause turns out different (e.g. the render modal's
   offscreen work), fix THAT and write the cause in the code comment
   and `verify/t20/context-lost.md`. The assert in (1) is the gate
   either way.

## F11 — The drawer gets its own editor [MEDIUM]

Owner: click a drawer and edit THE DRAWER the way a cabinet is edited —
its own window, the drawer selected, rotate it, EXPLODE it, look at
every part.

1. Open gesture: double-click a drawer BOX panel (side, back or
   bottom) → the drawer editor. The FRONT keeps its slide gesture —
   opening a drawer by its face is older than the editor and stays.
   Context menu on any drawer part gains "Edit drawer" as the
   discoverable route.
2. The window is the cabinet editor's shell (maximised workspace,
   restore, drag, Escape) scoped to ONE drawer: its sides, back,
   bottom, front and its runners, nothing else of the cabinet.
3. **Explode**: a control in the editor toolbar slides the parts apart
   along their assembly axes (front +Z, sides ±X, bottom −Y, back −Z;
   runners with their sides) — an animated spread and back, the "bomb"
   the owner described for cabinets, born here first. Orbit works
   throughout; a part click selects it and the right panel shows its
   detail (existing part detail, reused).
4. Editing scope THIS turn: what already exists routed to this view —
   drawer height (turn 18's field), runner variant, per-part material
   override. No new editable properties are invented here; the window
   and the explode are the feature.
5. Walk: open from a box side (real double-click), screenshot; explode
   on, screenshot; select the bottom, right panel shows it.

## F12 — Three small verdicts from the pre-18 list [MEDIUM]

1. **Interior outlines visible.** Panel outlines on interior faces
   vanish into the face they lie on — polygon-offset the outline
   material (or equivalent depth bias) so every panel edge reads in
   both scenes. No geometry changes.
2. **Save confirms.** A successful save turns the Save control green
   with a check for ~2 s, then returns to rest. A failed save does NOT
   go green — it keeps today's error surface. Both states in the walk.
3. **Veneer and Laminate fronts pick EGGER decors.** In the Fronts
   finish flow, Veneer and Laminate open the SAME decor picker
   (catalogue grid, attribution string, reproduction note) as melamine
   — not a colour palette. Spray keeps its palette. The assignment
   plumbing (turn 16) already carries a decor id; this is the picker
   routed to two more finishes. CNC grouping keys don't change.

## OUT OF SCOPE — named so nothing drifts in

* LIFT kits (HK/HF): pattern-first gate is CLOSED — the HK unit's side
  position needs the owner's `.mpr` ("Cabinet profile", 20 K) or the
  fitting PDF, and the HK GLB pack never reached the bucket (the HF
  pack was uploaded twice). BLOCKERS carries both. Turn 21+.
* Element editing inside the CABINET editor: scope not yet given by
  the owner. Parked.
* Company defaults / data module (Supabase, `cc_hardware`,
  `cc_company_defaults`): turn 21, its own turn, SQL-gated.
* Settings redesign: the owner is thinking; leave Settings alone
  beyond what F2 forces.
* ⌀3 screw-on plate stays disabled (card 173L still pending).

## PROOF — what `verify/t20/` must contain

* `walk.json` — every pointer step via CDP real input (R1), stated in
  the file.
* Screenshots per phase as listed above.
* `fingerprints-turn19-baseline.txt`, `fingerprints-turn20.txt`,
  `fingerprints-diff.txt` — the diff shows ONLY F4's text-height lines.
* `cnc-export-identity.md` — names the one delta, confirms zero
  everywhere else.
* `fixture-delta.md` — every regenerated fixture field (F1 drawer-box Y
  only), old → new, with the formula.
* `bucket-live.md` — the derived host, both manifest URLs with status
  200 and byte sizes, one GLB HEAD per family (R2).
* `context-lost.md` — the counter numbers for the 12× editor cycle.
* `perf.md` — only if F8 uses a distance gate.

## TESTS

Baseline 1469 all green, plus new suites: F1 box-vs-runner per kit
family; F2 parser on the verbatim bucket fixtures (R3); F5 the new
placement law incl. the five-corner walk as arithmetic; F6 snap-target
generation and nearest-magnet pick; F7 tooltip data derivation; F4 the
two label numbers. Turn-19's modal tests REWRITTEN per F5.3 — count may
therefore change by edits, not deletions; nothing else existing is
touched. Run the full suite; the turn ships at 100% green or shrinks
from the bottom until it does.