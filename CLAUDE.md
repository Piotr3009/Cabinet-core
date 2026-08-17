# CLAUDE.md — TURN 37: THE EYE-TEST'S CORRECTIONS, AND THE RAIL DONE RIGHT

Date issued: 17.08.2026, evening. Previous turn: T36 (merged whole, 10/10).
The owner walked every feature the same day; this turn is his verdicts —
six corrections, one redesign, two frame-of-reference bugs he smelled and
the audit confirmed, and five dead functions he has licensed for removal.

VERIFY FIRST — T36 on main: `src/components/WizardSettings.jsx` contains
`data-settings-section="sheet"`, `src/engine/splitDoors.js` exists, and
`src/engine/profile.js` contains `plateBiteMm`. Any missing → STOP, report.

## Iron rules for this turn

1. **/engineering-discipline. CONSUMER SWEEP mandatory.**
2. **Engine purity — this turn's contract is BYTE-IDENTITY.** Sibling
   `scripts/t37-classify.mjs`: NO named buckets are expected. Every change
   here is UI-side, 3D-side, layout-side, project-level law, or touches
   parts absent from the six configs (rails, split, top box, shoe). Any
   delta at all = UNNAMED = exit 1.
3. **LISP is law.** The shoe batten/front change (F6) amends
   `KIT_SHOE_BOX.lsp` FIRST (its own file, its own section — no other kit
   moves a character); paren-balance test stands guard.
4. **SANCTITY, verbatim:** *"nigdy nie kasuj bez mojej zgody jakichkolwiek
   funkcji — to jest świętość."* The owner licensed EXACTLY FIVE removals
   today (17.08, after the dead-code audit he ordered): the unused exports
   `getDecorScale` (decors.js), `neighbourOn` (frontClearance.js),
   `holeWorldY`, `facadePilotRow`, `boxPilotRow` (drawerPilots.js) — each
   verified un-called by code, tests and scripts. Remove those five and
   NOTHING else; each removal named in the F9 commit message. Everything
   else in the tree — including `SettingsPanel.jsx` — stays.
5. **Fixtures, `depthSteps`: untouchable.** Modals draggable, beside their
   object — except where F4c states the doors modal's own new docking law.
6. **PROOFS ARE NOT OPTIONAL.** Every feature with a visible surface ships
   a `verify/t37/` screenshot with its named subject from real pointer
   input, or it is not done. Commit per feature, mergeable head,
   skip-and-note, PR before morning, suite never `--silent`, clean-room,
   vite build, zero new dependencies, parallel subagents where independent.

## Features

### F1 [HIGH] — MULTI-SELECT v2: across cabinets, and the handle that
### moves UP AND DOWN

The owner on T36-F2: *"chodziło mi o półki z 2–3 szaf obok siebie, a nie
tylko z jednej"* and *"przesuwanie półek up-and-down jest strasznie trudne —
zazwyczaj catch jest na ustawianie głębokości, co jest najmniej przydatne.
Nie mogę sobie złapać 6 półek z 3 szaf i przesunąć ich razem."*

**Build:**
* The Ctrl+click selection set spans UNITS: members carry `{unitId,
  elementRef}`, the scene highlights across cabinets, and a group edit
  writes to every member THROUGH ITS OWN UNIT's store path. Six shelves in
  three wardrobes move as one.
* The DRAG PRIORITY flips: the default grab on a shelf moves it UP/DOWN
  (position). Depth stays reachable but secondary (its own smaller handle
  or a modifier — state which in the PR body). Same for group drags.
* Group position moves preserve each member's own clamps (a shelf stops at
  its own neighbours; the group move reports how many hit a stop).

**Tests:** cross-unit set membership and write paths; the drag priority
pinned at source; clamp-per-member. PROOF: six shelves in three cabinets
moved in one drag.

### F2 [HIGH] — THE RAIL, DONE RIGHT: a fix shelf with a rail under it

The owner buried the T35 design in one breath: *"masakra, jakieś dziwne
wpisywanie... dlaczego drążek nie może być z półką powyżej, i ta półka być
traktowana jak półka, tylko że fix? Zrób półkę nad drążkiem — półka, a
drążek dołącz do półki i tyle."*

**Build:**
* ADDING A RAIL adds an ASSEMBLY: one FIX shelf + the rail hung under it.
  The shelf is an ordinary fix shelf in every way — dragged by hand,
  snapping to neighbours' heights, listed and dimensioned like any shelf.
  The rail is its attachment: it rides the shelf, always.
* The drop (shelf underside → rod axis) is the bracket's own hardware drop,
  profile-listed (`hardware.hanger.dropMm` — derive the default from the
  bracket geometry the 3D already draws, so nothing visibly moves)
  `[OWNER — by silence]`.
* The T35 "Height above support" field and its support-resolution law are
  RETIRED FROM THE UI for new rails (the modal shows the shelf's own
  position instead) — the engine law may remain as dead weight for legacy
  only; nothing is deleted beyond rule 4's five.
* LEGACY: existing saved rails keep rendering exactly as saved (grey note
  in their modal: "old-style rail — re-add to get the shelf-mounted one").
  No silent migration, no surprise shelf in an old BOM.
* Double-click the rod → opens the SHELF's modal (the thing you actually
  edit); the T36 clickability stays.

**Tests:** the assembly's add path (one shelf + one rail, linked); the
ride; the drop from profile; legacy untouched byte-for-byte. PROOF: a rail
dragged BY ITS SHELF to a new height in the scene.

### F3 [MEDIUM] — HINGE PLATE: five more millimetres of bite

The owner: *"zawiasy — dociśnij o następne 5 mm."*
`hardware.hinge.plateBiteMm: 5 → 10`. One profile number, the T36 test
updated and dated. PROOF: a close-up of the seated plate.

### F4 [HIGH] — SPLIT DOORS: the divider is a BOUNDARY, the field is
### VISIBLE, and the doors modal stops fighting the hand

Three owner rulings on T36-F6:
* **(a)** *"dodajemy półkę i powinna być traktowana jak koniec szafy —
  jeśli daję centruj półki, to ponad tą poprzeczką powinny się centrować
  według tej poprzeczki, i to samo z dolną — taka sama rola."* The split
  shelf becomes a CENTRING BOUNDARY: shelf-spacing/centring above it uses
  it as the floor; below it, as the ceiling — exactly the role the bottom
  and the top play. One law, wherever centring is computed.
* **(b)** *"dodanie splitu powinno być w modalu doors też, i to widoczne
  bardzo — nie mała jakaś malutka pierdółka."* The Doors modal gains the
  split field PROMINENTLY (its own labelled row, full width, not a
  footnote); the bay-side field stays.
* **(c)** THE DOORS MODAL'S CONDUCT, his words: *"włącza i wyłącza się jak
  pojebane — niech się ustawi po lewej stronie ekranu całkowicie, i niech
  się nie wyłącza za każdym razem jak kliknę — dopiero krzyżykiem; a niech
  się przeskakuje tylko nazwa drzwi, które są kliknięte."* LAW: the doors
  modal DOCKS hard left of the screen; scene clicks do NOT close it; only
  its X closes it; clicking another door/leaf SWAPS the modal's subject
  (the title shows which leaf) without closing. This is the doors modal's
  own docking law and overrides the beside-the-object default for THIS
  modal only.

**Tests:** the boundary law above/below; the field present in both
surfaces; the modal's close/swap behaviour pinned. PROOF: the docked modal
surviving scene clicks and swapping its title between two leaves.

### F5 [HIGH] — TOP BOX: five corrections

The owner on T36-F7 (*"nadstawka działa super, ale…"*):
* **(a)** WIDTH AUTO: a Top box placed on a main takes the MAIN'S WIDTH
  (editable after, but born matched).
* **(b)** HEIGHT DIMENSIONS: the pair shows BOTH heights — the main's and
  the box's — *"nie widać wymiarów wysokości w ogóle"*.
* **(c)** NO OVERLAP, EVER: *"nakładają się jedna na drugą, a to jest
  niedopuszczalne w naszym programie"* — the box CLAMPS to the main's top
  (never intersects it or neighbours); an impossible drop goes red, the
  house grammar.
* **(d)** SIDE ORIENTATION: the box's sides (BUL/BUR) stand VERTICAL —
  today's horizontal orientation is wrong: *"orientacja boków jest pozioma,
  a powinna być pionowa."* Match the main wardrobe's own side law, grain
  included.
* **(e)** THE DOOR BELOW SHORTENS: adding a Top box is an "above
  neighbour" — the main's door takes the 3 mm top gap (the T35-F12 matrix;
  the top box joins infill/cornice as a recognised neighbour), and grows
  back when the box is removed. Self-healing on every path.

**Tests:** born-matched width; both dims; the clamp and the red; the side
orientation/grain; F12's matrix with a top-box neighbour, both directions.
PROOF: the pair with both height dims and the shortened door.

### F6 [MEDIUM] — SHOE DRAWER: the batten steps back, the front covers it
### — LISP FIRST

The owner, seeing the drawer variant live: *"cofnij o około 30 mm do tyłu
(skróć) ten klocek i rozszerz front szuflady, tak żeby zostało po prawej i
po lewej od BUR i BUL około 10 mm — będzie wyglądać lepiej, a i tak się
otworzy."*

**Build (`KIT_SHOE_BOX.lsp` first — batten length and front width are its
constants):**
* Batten length = box depth **− 30** (set back from the front edge).
* The drawer FRONT widens: its width = bay opening **− 2 × 10** (10 mm to
  each carcass side), covering the batten-and-runner zone. The hinge-arc
  check (#12 family) stays vigilant — the owner has ruled it opens; the
  check still reports if a configuration disagrees.
* Box, runners, drilling: unchanged.

**Tests:** both numbers pinned in kit and engine; BOM widths; the check
still armed. PROOF: the drawer closed (10 mm reveals) and open.

### F7 [HIGH] — GRAIN, THE TWO READERS: the sheet learns the field, the 3D
### learns the frame

The owner's screenshot (drawer parts lying flat) and his nose (*"CNC jest
ok, ale wizualizacja nie jest — sprawdź, co ci nadpisuje"*). The audit
found two distinct faults:
* **(a) THE SHEET:** `cnc/layout.js sheetTurn()` rotates only the old
  SHELF-board set and NEVER READS `cnc.grain`. Generalise the law: a part
  with a STATED grain is laid with its grain running up the sheet; the old
  set folds into the same rule (no behaviour change for parts it already
  turned). The drawer sides, backs, bottoms, fronts and the plinth stand
  up the page.
* **(b) THE 3D:** `decors.js grainRun()` reads the stated `cnc.grain` in
  the PANEL frame, but the field is written in the CNC DRAWN frame — on a
  shelf (drawn 530 × 560, grain "h" = its 560 WIDTH) the 3D resolves 530 =
  DEPTH and paints the figure front-to-back. `grainRun` must TRANSLATE the
  stated axis from the drawn frame (`cnc.drawn_w/drawn_h`) into the panel
  frame before use.
* **Cross-frame tests are the point:** for the same panels (shelf, drawer
  side, drawer front, plinth) one test asserts the SHEET lay and another
  the 3D figure axis, from the same stated field — so the two readers can
  never drift apart silently again.

Byte-identity contract note: (a) changes sheet PLACEMENT only and (b) is a
3D reader — `computeCabinet()` output must not move (rule 2).

### F8 [LOW] — (reserved) — nothing; kept so the walk's numbering matches
### the owner's list. Skip with a note.

### F9 [LOW] — THE FIVE LICENSED REMOVALS

Per iron rule 4, remove exactly: `getDecorScale`, `neighbourOn`,
`holeWorldY`, `facadePilotRow`, `boxPilotRow`. Nothing that imports them
exists; the suite proves it before and after. One commit, five names in
its message.

## What this turn does NOT touch

Everything not named. Export by material. `SettingsPanel.jsx`.
`depthSteps`, golden fixtures. The parked list unchanged. EGGER = BLOCKER
#44.

## Order of work

F2 (the rail — the owner's loudest verdict), F1, F5, F4, F7, F6 (LISP
first), F3, F9. Commit per feature; the morning audit reads this file
against the diff, the classifier holds byte-identity, and rule 6 holds
every visible feature to a photograph.