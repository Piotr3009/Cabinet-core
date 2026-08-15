# CLAUDE.md — TURN 33: LIGHT, THE WARDROBE'S INSIDES, AND THE DAY'S FAULTS

Date issued: 15.08.2026 (night run). Previous turn: T32 (merged, 947b4de) plus
an evening CHAT BATCH that rebuilt wizard steps 4–5. VERIFY THE BATCH FIRST:
`src/components/WizardSettings.jsx` must contain the string
`data-carcass-container` and `src/engine/design.js` must contain `cncCorner`.
If either is missing, STOP and report — the chat batch is not on main and this
turn builds on it.

The owner's direction, in his words: interior accessories and LIGHTING are the
night's meat; L-shape, props and the JoineryCore sync are explicitly "na
później". He also walked today's build and dictated a list of faults — they
are features here, not footnotes, because each one is something he hit within
minutes of testing.

## Iron rules for this turn

1. **/engineering-discipline governs every feature.** Step 4's CONSUMER SWEEP
   is mandatory — this project's scar tissue: a snap fix died one call
   downstream, a door rule lived in the engine while the store pinned it dead,
   and a drawer side stood on end for fourteen turns because nobody measured
   the scene. When you change what a function answers, walk every reader.
2. **Engine purity.** Bare `computeCabinet()` = the AutoLISP; golden fixtures
   untouchable. Owner-standard behaviour goes through the OVERRIDE CHANNEL
   (profile/company/project → `paramsForEngine()`).
3. **No hole without truth.** A drilled hole exists only where a LISP line or
   a published pattern says so. LIGHTING DRILLS NOTHING in this turn — LED
   strips, drivers, sensors and spots are BOM lines and 3D geometry only.
   Anything the register does not know prints as a YELLOW named spec — never
   an invented article number.
4. **Guards speak; they never silently fix** — except rules that are the
   owner's own written law (F5's clearance matrix, F6's behind-door setback),
   which apply themselves and say so in a grey note.
5. **All modals/panels draggable and opened BESIDE the clicked object**, never
   covering it — the standing UI law. The new Lighting panel obeys it.
6. **Proof screenshots** in `verify/t33/`, each containing its NAMED subject;
   an empty frame fails the phase. Browser proofs on REAL pointer input.
7. **LIVE-SCENE PROOF for store/UI work**: drive the real store
   (`window.__cc.project`), compare engine numbers against scene bounds per
   unit (`ccUnitId` on ancestors). A green unit test is not proof of the
   screen.
8. All UI copy in English. Commit PER FEATURE, F1 → F11; a run that dies
   early must leave a mergeable head.
9. **No SQL in this turn.** The hardware register (cc_hardware_register,
   sql/005) already exists; unknown LED/mirror articles degrade to yellow
   named specs, exactly as designed. Do not add migrations.
10. **Full test suite** (`rm -rf node_modules && npm install && npm test`,
    never `--silent`), vite build, and the CNC classifier vs main with
    **0 named deltas expected** — every feature here is UI/store/BOM/3D or an
    override-channel value; the bare engine must not move.

## Features

### F1 [CRITICAL] — LIGHTING: the owner's spec, verbatim

The owner has now dictated the whole system (15.08, evening). Build exactly
this; his eye-test is the acceptance.

**Where it lives.** A **`Lighting`** button in the top menu, placed **BEFORE
`Output`**. It opens the Lighting panel (draggable, beside — rule 5). The
panel's flow, top to bottom:

1. **ON / OFF** for the project (`design.lighting.enabled`, default off).
2. When ON: the **placement tools** (below) and the **choices**:
   * **Colour temperature**: 3000 K · 4000 K · 6000 K (extendable list —
     "etc" is his word; ship the three, profile-listed). Default 4000 K,
     one profile line marked `owner to confirm 15.08`.
   * **Switching**: for a WARDROBE project — `At the door` / `Sensor`; for a
     KITCHEN project — `Touchless` (the owner: "kuchnia bezdotykowy").
     Stored per project (`design.lighting.switch`), the sensible one
     pre-selected by project type.
3. **Information + visual instruction** — his explicit ask: "pod tym menu
   będzie też sporo informacji i może nawet jakaś wizualna instrukcja".
   Each placement kind gets a small instructional SVG mockup in the panel
   (the CornerArt grammar from the wizard): shelf-underside diagram with the
   depth arrow, the side 4 mm line, bottom-at-plinth, top-wash.

**Placement kinds** (each an item in `design.lighting.items[]`, shape
`{ id, unitId, kind, ref, depth_mm?, length_mm (derived), … }`):

* **SHELF** — the owner's interaction, exactly: the user CLICKS A SHELF in
  the scene (the hover/pick machinery exists) → "Add LED under this shelf" →
  the strip appears under that shelf → a **depth slider** ("przesuwasz jak
  głęboko ma być led") positions it front-to-back. Length = the shelf's
  clear width.
* **SIDE** — a **4 mm line, top to bottom** of the carcass side, on the
  interior face. The instructional mockup shows it.
* **BOTTOM** — under the cabinet, at the plinth line ("pod szafą koło
  plinth").
* **TOP** — above the cabinet, washing upward ("nad szafą w górę") — the
  wardrobe-to-ceiling wash.
* **SPOT** — small spotlights in KITCHEN WALL UNITS ("małe spotlighty w
  szafkach wiszących"): per-unit count, evenly spaced under the wall unit.

**3D.** Strips are thin emissive geometry (tinted by the chosen temperature);
spots are small emissive discs. No real-time light sources in normal view —
emissive only; F2 is where they shine. Do not tank the frame rate.

**BOM.** A `Lighting` block: strip METRES per run (per temperature), driver /
PSU line, switch or sensor line, spot count. Articles: the register knows
none of these today → every line is a YELLOW named spec ("LED strip 4000 K ·
2.4 m", "driver", "touchless switch") — rule 3. Nothing blocks.

**Proofs**: one screenshot per kind with the strip visibly placed and named;
the shelf flow proven with a REAL click on a shelf and the slider moved;
BOM screenshot with the yellow lighting block.

### F2 [CRITICAL] — "Turn on the light": the client demo

Pairs with F1. A toggle (`Turn on the light`) in the Lighting panel AND in
the View menu: the scene environment dims (drop exposure / env intensity to a
profile-listed demo level) and every placed LED's emissive comes UP. Toggling
back restores exactly the previous scene state. Proof: the same camera, one
screenshot pair off/on, visibly different, strips glowing.

### F3 [HIGH] — The wardrobe's interior accessories

Each item classified by the standing doctrine (what we CUT vs what we BUY):

| Item | Nature | Cut / bought |
|---|---|---|
| **Shoe shelf** | GEOMETRY — tilted shelf, default 15° (profile line, owner-tunable), with a front stop rail (listwa) | Shelf + rail are CUT. No new hole pattern: it rests on the STANDARD pin rows, the front pair set lower — the workshop's own way. |
| **Shoe drawer** | drawer variant (low box) | box CUT; insert = BOM named spec |
| **Belt/tie drawer** | low drawer + divider insert | box CUT; insert = BOM named spec |
| **— glass-top variant** | display drawer: frame + glass | frame CUT; glass = BOM line `Glass W×H` |
| **Trouser pull-out** | BOUGHT mechanism | BOM named spec + GLB slot; ZERO holes without a published pattern |
| **Tie rack** | BOUGHT mechanism | BOM named spec + GLB slot |
| **Pull-down rail** | BOUGHT mechanism | BOM named spec + GLB slot. RULE: when a column's hanging rail sits **> 2000 mm from the floor**, the UI SUGGESTS the pull-down (a grey hint, never a block). |

They live in the WARDROBE library (T32's project-type filter already scopes
it), placeable per COLUMN through the existing AddItems/zones flow. GLB slots
follow the cargo/hood grammar: geometry box + BOM + a slot that loads the
model the day the owner supplies the file — a labelled placeholder until
then. Proofs: each item placed in a column, screenshot named; BOM lines
visible; the >2000 hint proven live.

### F4 [HIGH] — Mirrors on doors

Per-door property: `none / inside / outside` (DoorModal). Visual: a mirror
plane on the chosen face — high env reflection, thin inset margin. BOM: one
line per mirrored door, `Mirror W×H`, sized front minus a margin of 20 mm a
side (ONE profile line, marked `owner to confirm 15.08`). NO holes — mirrors
are bonded, not drilled; say so in a comment. Proof: three screenshots
(inside, outside, BOM line), inside-mirror proven with the door OPEN.

### F5 [HIGH] — Clearance self-healing: the sweep it missed

Owner, today: "nadal pokazuje 1.5 mm między szafami" where a neighbour
demands 3.0. T32-F3 made the matrix self-apply, but not on every path. Do the
CONSUMER SWEEP properly: enumerate EVERY path that creates or re-shapes a
unit or its neighbourhood — addUnit, kit builders (D/W, oven, sink…),
duplicate, drag-reorder, resize, neighbour add/remove, wall edit — and prove
the matrix runs on each. Add a test matrix: unit type × neighbour type ×
path. The grey self-correction note must appear each time. Fixtures
untouched: the matrix is app-layer law, not bare-engine law.

### F6 [HIGH] — Drawers in a column BEHIND DOORS: the missing 30

Owner, today: put drawers between a vertical divider and the doors and "nie
wstawiają automatycznie 30 mm infila i nie odsuwa szuflady — patrz szafy bez
dividera". The no-divider wardrobe already carries the behind-door law (the
setback/infill that keeps boxes clear of the door's swing). Find THAT rule at
its source and make the COLUMN path read the SAME source — one law, two
readers, zero divergence. A column with doors in front behaves exactly like
the doored wardrobe always has. Live-scene proof: same wardrobe, drawers in
a doored column, measured box front vs door plane = the same clearance the
no-divider case gets.

### F7 [HIGH] — DoorModal: one hinge block, and handles measured from the EDGE

Two owner findings, one modal:

1. **The duplicate hinge block.** The modal shows hinge controls in TWO
   places. The owner: "ten górny usuń" — DELETE the upper block; the LOWER
   one (the arrow mover + the hinge picker) is the one that works — MOVE IT
   UP to where the deleted one sat. One block, at the top.
2. **Handle offset is edge-relative and MIRRORED.** Today "move left" shifts
   BOTH handles of a door pair left — 60/40 instead of 50/50. The owner's
   law: the offset is measured **from the door's own handle edge** and
   mirrors for a left/right pair — "30" means 30 from the LEFT edge on the
   left door and 30 from the RIGHT edge on the right door. This reaches the
   HANDLE DRILLING — consumer-sweep it to the drawing, the 3D and the CNC
   export. The blue CAD dims (T32-F9) label the edge distance accordingly.
   Migration: stored offsets are reinterpreted as edge-offsets (dated
   comment); golden fixtures must not move — if any fixture encodes the old
   absolute behaviour, STOP and report rather than touch it.

### F8 [HIGH] — The shaker frame width returns to the wizard

The chat rebuild lost the field. `design.fronts.shakerFrame` (T25: equal on
all four sides, 10–200, profile default 70) is alive in the engine — the UI
control vanished. Put it in the FRONT SLOT CARD of the wizard, visible ONLY
when that slot's style is Shaker: label `Frame width (all shaker fronts)` —
it writes the PROJECT-WIDE field, and the label says so. Placement is
Claude's proposal accepted by silence — marked `[OWNER — placement to
confirm]` in a comment. Proof: wizard screenshot with a Shaker slot showing
the field; a non-Shaker slot NOT showing it; the value reaching the scene.

### F9 [HIGH] — The MOVENTO ladder: the owner's list, at last

The owner's list (15.08): lengths **every 50 mm up to 600**. Lower bound: his
message read "od 00" — shipped as **300** (300 · 350 · 400 · 450 · 500 · 550
· 600), ONE profile line marked `owner to confirm 15.08 — lower bound read
as 300`. Wire it: the runner-length SNAP (snap-to-nominal-below, from the
15.08 chat zip) snaps to THIS ladder; the BOM orders the snapped length; a
length outside the ladder prints yellow. This closes the long-parked
"wyrównanie drabinki długości prowadnic — czeka na listę MOVENTO". Consumer
sweep: `runnerModelFits` and every other reader of the old catalogue list.

### F10 [MEDIUM] — Shelf pins: default 50, the control goes

Owner: "piny do półek default 50 mm bez ustawiania — kiedyś było ustawiane,
teraz już nie trzeba." The override channel exists (T30-F5,
`shelves.pinSetback`): set the PROFILE's answer to **50** with a dated
comment naming the owner; REMOVE the UI control (SettingsPanel field); the
design field stays for saved projects. The BARE ENGINE stays at 70 — that is
what the LISP drills and what every golden fixture holds. Honest note in the
profile comment: app DXF now drills 50 while the workshop's own LISP macros
drill 70 — the owner's declared standard; the day the LISP moves to 50 the
bare engine follows it.

### F11 [LOW] — Ready-made drawer INSERTS, catalogued (stretch)

T32 shipped the ready-made BOX mode; the INSERTS (cutlery, tie dividers…)
are still free-text specs. If time remains: a small profile-listed insert
catalogue (label + nominal widths) feeding the BOM line. If time does not
remain, skip cleanly — nothing depends on it.

## Open questions travelling WITH the push (answer in the PR description)

* Q1 — MOVENTO lower bound: shipped 300 (his "od 00" read as 300) — correct?
* Q2 — Shaker field placement: in the Shaker slot's card, project-wide label
  — as shipped?
* Q3 — A fresh vertical partition still BORN with the 20 mm setback (T32
  observation): should a wardrobe partition be born FULL DEPTH? (One line.)
* Q4 — LED articles: all lighting BOM lines ship as yellow named specs;
  register rows to be added when the owner names products.

## Parked — do NOT start

L-shape joints + corner handle-reach (owner: "zostaw na teraz") · clothes/
shoe PROPS GLB · JoineryCore full sync, `71B3550_43192717` re-export,
per-family hinge fold axes (owner: "6, 7 i 8 zostaw na później") · appliance
GLBs (slots ready — WAITING ON THE OWNER'S FILES) · sliding doors · nesting ·
hood rework · sheen per-slot vs global (open [OWNER] from the wizard
rebuild) · sprayed-carcass one-colour-per-project (open [OWNER]) · library
"Kitchen as top level" re-grouping (discussion pending) · EGGER licence
e-mail = BLOCKER #44 (before any public demo or sale).

## Owner-tunable defaults written in this turn

LED default temperature 4000 K (F1, marked) · demo dim level (F2) · shoe
shelf tilt 15° (F3) · mirror margin 20 mm/side (F4, marked) · pull-down
suggestion threshold 2000 mm (F3) · MOVENTO ladder 300–600/50 (F9, lower
bound marked) · shelf-pin profile answer 50 (F10, dated, with the LISP-70
divergence note) — every one of them ONE profile line with a comment naming
15.08.2026 and the owner as the source.