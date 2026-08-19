# CLAUDE.md — TURN 42 · THE WALL PDF SPEAKS, THE OLD RAIL PATH DIES, AND OVERLAY RUNNERS GO GLB

Dictated by the owner, 19.08.2026, late, after the fourth broken rail:
*"mamy w dupie stare rzeczy — to nie jest online, to jest w fazie
budowania. Nie patrzymy na przeszłość w ogóle."* That sentence is this
turn's law. **The app is pre-launch. There are no users to protect. No
compatibility layers, no legacy branches, no "kept for old projects".**
Where an old project's stored rail is read, it is read by ONE simple rule
and nothing else.

## Why this turn exists (the trace, so you do not re-discover it)

The rail has had four turns (T37-F2, T40-F6, T41-F2, and tonight's
finding) and still adds a shelf when asked not to, and cannot be edited.
Tonight's chat traced it to the end:

- The store is honest: `addHangerRail` honours `withShelf:false` and
  writes an item with `mount: RAIL_MOUNT.ALONE` (T41-F2 did that).
- **The engine has no ALONE branch.** `cabinet.js` has (A) the pre-T37
  path — `else if (hasRail)` at ~2001–2032, computing `railY` +
  `railPartY` via `resolveShelfMountedRail`, and then at ~3054 building a
  **`RAIL-PART` panel — a shelf** — whenever `railPartY != null`; and (B)
  the T37 assembly path (`railRides`). An ALONE item falls through to
  (A), which builds it the shelf the owner refused.
- Editing is dead for ALONE because the tube↔shelf pairing goes through
  the item's `shelf_id`; ALONE has none, so `rail.panelId` is null and
  `Hardware.jsx:1196` disables both the double-click and the aura.
- T41's probe asserted the ITEM list (no shelf item — true) instead of
  the PANEL list (RAIL-PART present — the lie). It proved the field, not
  the thing. Do not repeat that.

Separately: **overlay drawers render hand-coded runners.**
`engine/runners.js` — the GLB channel (runnerLadder → Hardware →
runnerModel, the Blum models) — contains no overlay path at all, so the
overlay stack draws parametric L-profiles instead of the GLB every other
drawer gets.

And separately again: **the wall PDF does not come out** — F0 below
carries its own trace, because the fault has a different shape: it is
not a wrong answer, it is an answer that hides.

## Iron rules (binding)

1. **Zero-stop overnight run.** Skip-and-note, sacrifice from the lowest
   priority upward, PR before morning regardless.
2. **Engine contract: BYTE-IDENTITY** — and it HOLDS this turn despite
   the engine surgery, because none of the six configs carries a rail
   (t41-classify's own header records it; verify it again in t42's).
   `scripts/t42-classify.mjs`, empty bucket list, UNNAMED=0. If any of
   the six moves a byte, the surgery cut something it should not have —
   stop that cut and note it. F0 lives entirely DOWNSTREAM of
   `computeCabinet()` — the modal, the page handler and the drawings
   modules — and must not move a byte of it either.
3. **Sanctity — with THIS TURN'S NAMED LICENCE TO DELETE.** The owner's
   explicit instruction, twice, 19.08: *"usuń całkowicie ten kod"* /
   *"nie patrzymy na przeszłość."* The licence covers, BY NAME:
   - `cabinet.js`: the pre-T37 rail positioning branch
     (`else if (hasRail)` body, ~2001–2032): `railSupportTops` call for
     it, `resolveShelfMountedRail` call, `railPartY` /
     `railPartCentreY` assignments, the `RAIL_TOO_HIGH` clamp inside it.
   - `cabinet.js` ~3054–3062: the `RAIL-PART` panel block.
   - Every read of `railPartY` / `railPartCentreY` downstream, and the
     variables themselves.
   - `engine/elements.js`: the `case 'RAIL-PART'` mapping.
   - `RightPanel.jsx:655` — the block T41 commented out: now DELETE it.
   - The hand-coded overlay runner drawing (F2 below), once found.
   - `resolveShelfMountedRail` and `RL.partitionAbove` /
     `RL.topClearance` profile keys — **only if** nothing else calls
     them after the cut; if the assembly path uses any, that one stays.
   - `DrawingModal.jsx:87` — the silent `catch { return [] }` in the
     wallSet memo: REPLACED (not deleted) by a reporting catch (F0).
   - `ConfiguratorPage.jsx:398` and `DrawingModal.jsx:141–142` — the
     `err.message || 'Nothing to draw yet.'` fallbacks on the wall
     paths: REPLACED so an error is never relabelled as emptiness (F0).
   Anything beyond this list follows the normal rule: not deleted.
   Every deletion is listed in the PR body with file and name.
4. **LISP is law — and it changes this turn.** Check
   `KIT_WARDROBE_FULL.lsp` (section `B2. RAIL BLOCK` and anywhere else
   `rail` appears): if the OLD path's shelf (`RAIL-PART` as a cut board)
   exists in the kit, remove it there FIRST or simultaneously; the side
   flange drilling (the rail block itself) STAYS — an ALONE rod still
   mounts to the sides. Paren balance 0/0, counted by script. If the kit
   never cut RAIL-PART, say so in the PR and touch nothing there.
5. **No new dependencies. Suite never --silent. One commit per feature.**
6. **PROVE THE THING, NOT THE FIELD** — the T41 lesson, now permanent.
   Every rail test in this turn asserts the ENGINE'S PANEL LIST or the
   drawn scene, never the item list alone. F0's version of the same law:
   assert the EXPORTED BYTES and the words ON SCREEN, never the array's
   length alone. Probes ship under `verify/t42/`.
7. Proofs: screenshot per visible feature, real pointer input, named
   subjects. After the PR is open, END THE SESSION — no check-ins.

---

## F0 [CRITICAL] — the wall PDF: the gag comes off, the fault gets found, the fault gets fixed

Owner, 19/20.08, on the current build: *"pdf w ogóle nie zadziałał —
coś się znowu zablokowało."* An F5 and a brand-new project changed
nothing. This is the only feature in the app whose output is PAPER the
workshop hands to a client, and it is dark.

### What tonight's dry probes already ruled OUT (do not re-walk these)

- The export chain is healthy end to end on a seeded set: `jspdf 2.5.2`
  installed, `exportWallDrawingsPdf` present
  (`lib/drawingExport.js:200`), the modal's imports complete,
  `layoutSheet` and `sheetToSvg` render the sheets.
- The frozen-profile hypothesis is DEAD: `migrateCabinetProfile`
  key-merges `drawings.wallDrawing` back into any stored profile
  (`engine/profile.js:4754–4781`); a probe on a profile stripped of the
  block came back whole, `scaleLabel` reading "No Scale". Do not spend
  the night here.

### What remains — the mutes in the chain

There are TWO ways to ask for this PDF, and each hides differently:

- **The modal** (`DrawingModal.jsx`): the `wallSet` memo (:75–91) ends
  in `catch { return [] }` (:87). A crash anywhere under
  `wallDrawingSheets()` — which includes `allResults()`, so ONE unit
  whose `computeCabinet` throws kills the whole set — produces the SAME
  empty array as "no cabinet stands against a wall": the same disabled
  buttons (:193, :203) and the same footer sentence (:286). An outage
  that pretends to be emptiness is the worst kind of outage, and it is
  how four green probes and a grey button coexist.
- **The Output menu** (`ConfiguratorPage.jsx:377–400`): this path DOES
  catch and notify — but with `err.message || 'Nothing to draw yet.'`,
  so an error whose message is empty is RELABELLED as emptiness, and
  `guard()` can return false silently before any of it runs.

### Work

1. **The gags come off, permanently.** In the modal: `catch (e)` —
   `console.error` the full error AND surface it: the footer (:286)
   shows *"Wall drawings failed: {message}"* in the error style while
   the buttons stay disabled. The two states must be distinguishable on
   screen forever after: builder CRASHED (message shown) vs genuinely
   EMPTY (the existing honest sentence). On BOTH paths, kill the
   `|| 'Nothing to draw yet.'` relabelling: if `err.message` is empty,
   show the error's name — never the emptiness sentence. If `guard()`
   refuses, it must say so, not return in silence.
2. **Reproduce both states in Playwright**, seeded project:
   a. cabinets standing on a wall at rotation 0 → set non-empty, button
      enabled, click → a REAL file lands. Assert the bytes start `%PDF`
      and the page count equals the sheet count; open it on page 1
      (Wall … /1) for the shot.
   b. all units turned away (or none) → buttons disabled and the footer
      says the honest sentence, NOT an error.
3. **Find the fault the owner hits.** With the gags off, drive his path
   — a project with cabinets at a wall → Output → Wall drawings (PDF),
   and the same through the modal — and read the console. If a crash
   reproduces: fix the ROOT CAUSE and name it in the commit body. If no
   crash reproduces and the set is genuinely empty on a healthy-looking
   project: make the footer name WHY per wall — `wallGroups` already
   returns `skipped` with the reason in hand (turned away / no result)
   — so the screen stops lying by silence. If neither reproduces, say
   so plainly in the PR and ship the instrumentation anyway: it is the
   tool tomorrow's diagnosis needs, and the turn still counts.
4. **Blast radius**: `DrawingModal.jsx`, `ConfiguratorPage.jsx` (the
   walls branch only), plus whichever file the root cause names
   (`engine/drawings/wallSheets.js`, `wallElevation.js`,
   `lib/drawingExport.js`). `computeCabinet` is NOT in this feature's
   radius — if the trail leads there, stop, note it, leave it for the
   morning.

### Tests (the thing, not the field)

- A builder that THROWS must surface: assert the message reaches the
  screen — not merely that the array is empty.
- The exported bytes start `%PDF` and the page count equals the sheet
  count (a jsPDF output probe, not a filename check).
- The genuinely-empty state still refuses politely, with the honest
  sentence and no error styling.

Proofs: `f0a-wall-pdf-downloaded-and-opened.png` (the file open on
Wall … /1), `f0b-crash-speaks-or-empty-is-honest.png` (whichever state
the reproduction found), `verify/t42/f0-wall-pdf-probe.mjs` + its
printed output.

---

## F1 [CRITICAL] — the rail, finished: ALONE is a first-class branch, the old path is gone

**The model, after this turn — exactly two kinds, no third:**

- **ALONE** (`mount: RAIL_MOUNT.ALONE`): a rod mounted to the carcass
  sides. Position from the item's own `pos_mm` + datum, exactly the
  grammar a shelf uses. **No RAIL-PART. No shelf. No bracket board.**
  The side flange drilling from the kit's rail block applies — the rod
  has to hang on something, and it hangs on the sides.
- **ASSEMBLY** (T37, `mount: SHELF`): the FIX shelf with the rod beneath
  it. Untouched.

**The legacy rule — one sentence, zero layers:** a stored rail item with
no `mount` (or any value that is not `SHELF`) **is read as ALONE.** No
migration table, no compatibility branch, no warning. Old projects are
pre-launch tests; the owner said so.

**Engine work:**
- Give ALONE its own branch: `railY` from the item's `pos_mm`/datum
  (snap + clamp inside the carcass as a shelf would), rod length =
  internal width (per column when zoned, as today), NO `railPartY`, NO
  RAIL-PART panel, and the rail's fingerprint carries `mount` so
  downstream readers can tell.
- Execute the licence: delete the old branch and the RAIL-PART block
  (iron rule 3's list).
- After the cut, `grep -rn "RAIL-PART" src/` must return ONLY history
  comments, and a suite-level test asserts **no combination of rail
  inputs ever emits a panel named RAIL-PART.**

**Scene and editing work:**
- The rails handed to `<Rail>` carry a `panelId` for BOTH kinds: the
  RAIL-PART id is gone, so give ALONE the rail ITEM's own id and route
  `onEdit` for that id to the **rail modal** (the hanger editor), not
  the shelf modal. Double-click on the tube: works for both kinds.
- **Drag**: dragging the ALONE rod writes the item's `pos_mm` (the same
  store path a shelf drag uses), and the engine's next answer moves the
  rod. The assembly keeps T37's behaviour (drag the shelf, the rod
  follows).
- The ADD ITEMS control from T40-F6 (with shelf / alone) stays exactly
  as it is — it was always honest; the engine was not.

**Tests (the thing, not the field):**
- `computeCabinet` with an ALONE rail item → panel list contains NO
  RAIL-PART, and the rod's y equals the item's `pos_mm` resolution.
- With `mount: SHELF` → the shelf panel exists, the rod hangs `drop`
  below it, as T37 wrote.
- A stored item with `mount: undefined` → identical output to ALONE.
- Drag probe: set `pos_mm` 100 mm higher → the drawn rod's y moves
  100 mm (scene-level probe, printed to `verify/t42/f1-rail-probe.txt`).
- The six configs: byte-identical (classifier).

Proofs: `f1a-rail-alone-no-shelf-in-panels.png` (the 3-D and the panel
list side by side), `f1b-rail-alone-dragged-and-edited.png`.

---

## F2 [HIGH] — overlay drawer runners join the GLB channel

Owner: *"w nowych szufladach zamiast się podstawić ładne GLB, to znowu
się pojawiają te gówna kodowane."*

- Find where the overlay stack draws its runners today. The trail:
  `engine/runners.js` has no overlay path, so the drawing is NOT coming
  through `runnerLadder` — someone draws L-profiles by hand. Name the
  place in the commit body.
- Route the overlay stack through the SAME channel as every BUDR drawer:
  `runnerLadder` → `Hardware` → `runnerModel` (GLB), including
  `runnerVariants` resolution and the X-ray behaviour every other runner
  obeys.
- **Delete the hand-coded overlay runner drawing** (licensed, iron rule
  3) once the GLB channel carries it.
- If the engine must EMIT runner rows for the overlay stack for the
  channel to work (runners.js knowing the stack), that is a read of
  `overlayPlan` it already receives — extend the reader, not the
  engine's answer, and keep the six configs byte-identical (none has an
  overlay stack; t41's classifier header says so).

Test: an overlay drawer at depth D resolves the SAME runner entry and
the same GLB source as a BUDR drawer at depth D; the parametric path is
unreachable (no code path draws hand-made runners for overlay).

Proof: `f2-overlay-runners-are-glb.png` (fronts off, GLB runners
visible under the overlay boxes).

---

## Execution order

F0 → F1 → F2. If the night is short, F2 falls first, then F1.
**F0 never falls** — it is the only thing that blocks the workshop's
paper output today.

## What this turn does NOT touch

The six configs' bytes. `SettingsPanel.jsx`. Golden fixtures. The
materials/BOM system. The drawings system beyond F0's named files. The
CNC editor. Everything parked stays parked. The AddItems chat-fix from
19.08 (the always-expanded list) may or may not be on main when you
start — do not undo it either way.

## Morning audit will run

Fresh clone → branch → clean-room install → full suite → build →
t42-classify borrowed onto main → BYTE-IDENTITY, UNNAMED=0 → deletion
audit: every removal matched against iron rule 3's list, anything
outside it fails the turn → `reference/lisp/` diff limited to the rail
block change (or untouched, with the PR saying why) → paren balance 0/0
→ **the F0 PDF probe re-run by the auditor** (a real file, `%PDF`
header, page count = sheet count) → **the F1 rail probe re-run by the
auditor** → verify/t42 complete → verdict → the owner's numbered
eye-test list.