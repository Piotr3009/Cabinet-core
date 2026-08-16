# CLAUDE.md — TURN 34: THE BOARD BEHIND EVERY FRONT, THE SHOE BOX, AND THE DAY'S VERDICTS

Date issued: 16.08.2026 (night run). Previous turn: T33 (PR #33 merged, F1–F11,
2909/2909, bare-engine sha256 byte-identical across the 6 configs).

VERIFY FIRST — this turn builds on T33 being on main:
`src/engine/frontClearance.js` must export `healingPlan`, and
`src/engine/runners.js` must export `runnerLadder`. If either is missing,
STOP and report.

VERIFY SECOND — F4's law arrives as a file: `reference/lisp/KIT_WARDROBE_FULL.lsp`
must contain the marker `;; ─── SHOE BOX (T34)`. If it does not, STOP and
report — the LISP section is pushed together with this spec and F4 must not be
guessed at.

The owner spent 16.08 walking T33 feature by feature. Every verdict below is
his, dated, verbatim where it matters. This turn is the verdicts turned into
law: the wizard's missing board assignment (his words: "karygodne"), the LEDs
he cannot see, the runner nominal that lands one rung short of his own −10
rule, and a shoe accessory redesigned from a pinned shelf into a boxed insert —
geometry closed line by line in chat, all of it pinned here.

## Iron rules for this turn

1. **/engineering-discipline governs every feature.** The CONSUMER SWEEP is
   mandatory: when you change what a function answers, walk every reader.
   T33-F5 exists because a self-healing law skipped four paths; do not write
   the fifth.
2. **Engine purity, with this turn's NAMED exceptions.** Bare
   `computeCabinet()` = the AutoLISP. F3, F4 and F6 change the engine — each
   lands with its tests in the same commit, and each names its expected delta.
   The sha256 fingerprint of the 6 standard configs vs main:
   * configs WITHOUT drawers and WITHOUT appliances: **byte-identical**;
   * configs WITH drawers: the ONLY permitted delta is the runner-pair
     hardware line (F3's NL law) — `classify.mjs` must name it and nothing
     else;
   * no standard config contains the shoe box or an appliance, so F4 and F6
     contribute **zero** deltas to the fingerprint set.
   Anything unnamed = the run fails its own audit.
3. **LISP is law.** F4's geometry, screw row and runner drill map are written
   in `KIT_WARDROBE_FULL.lsp` (section `SHOE BOX (T34)`, delivered with this
   spec). The engine MATCHES that section; it does not interpret it. Where
   this file and the LISP disagree, the LISP wins and the disagreement is
   reported in the PR body.
4. **No hole without truth.** Every new drill this turn (shoe-box side pilots,
   side-runner pattern) exists because the LISP section or the owner's
   published sheet (16.08) says so. Lighting still drills NOTHING.
5. **Golden fixtures untouchable.** `P.wardrobe.drawers.depthSteps` —
   `[250, 270, 300, 320, 350, 380, 390, 440, 490, 540, 590, 640, 690]` — is
   the saw's ladder and DOES NOT MOVE (T33-F9 pinned it; it stays pinned).
6. **All modals/panels draggable and opened BESIDE the clicked object** —
   the standing UI law. The shoe-box modal obeys it.
7. **Proof screenshots** in `verify/t34/`, each containing its NAMED subject;
   an empty frame fails the phase. Browser proofs on REAL pointer input.
   LIVE-SCENE PROOF for store/UI work: drive `window.__cc.project`, compare
   engine numbers against scene bounds per unit.
8. All UI copy in English. Commit PER FEATURE, F1 → F9; a run that dies early
   must leave a mergeable head. Never halt on a question — skip-and-note; the
   PR must be open before morning.
9. **No new dependencies. No SQL migrations.** Unknown articles (side runners,
   inserts, LEDs) print as YELLOW named specs — never an invented number.
10. **Full test suite** (`rm -rf node_modules && npm install && npm test`,
    never `--silent`), vite build, and the classifier vs main with rule 2's
    named-deltas contract.

## Features

### F1 [CRITICAL] — WIZARD: the board behind EVERY look, and a gate that holds

The owner, 16.08, on finding the fronts container without a board assignment:
*"w ustawieniach frontów nie ma przypisania materiałów, jest w carcasach ale
nie ma we frontach — to jest karygodne, niewybaczalne, podstawowe przypisanie
materiałów to podstawa tego programu."* And the scope, his words:
*"przywracamy przypisanie materiałów bez różnicy jaki to wybór — czy laminat
czy mdf czy spray etc — to jest podstawa wszystkiego"* … *"bez przypisania
materiałów nie powinno puścić dalej — to jest mega ważne."*

The hole (diagnosed in chat, confirmed in code): `WizardSettings.jsx
slotPicker()` renders the `Stock board` select ONLY on the decor-grid path.
The `colour` path (Spraying — the DEFAULT front source) returns a bare
`ColourPicker`; the carcass `veneer` path returns a bare `VeneerPicker`.
Turn 16 F1.1's whole point — "a front had a colour and NO stock, so 'what
board are these doors cut from' had no answer" — reintroduced on those paths
by the 15.08 chat rebuild.

**Build:**

* `slotPicker()` renders the SAME `Stock board` select for EVERY slot,
  regardless of picker kind (`colour`, `veneer`, decor) and regardless of
  `kind` (front AND carcass). One select, one grammar (Generic optgroup +
  Stock optgroup), wired to the existing `pickFrontBoard` / `pickCarcassBoard`.
  Keep `data-material-picker-for` / add `data-stock-board={kind}:{t.id}` on
  the select so tests can find it on every path.
* **The hard gate.** `materialsAssigned(design, profile)` (wizard logic) must
  count a slot as assigned ONLY when `material_id` is set — a colour or a
  finish alone is NOT an assignment, on any source. `carcassMissing` /
  `frontsMissing` list the offenders; the Save buttons stay disabled while the
  list is non-empty. Generic placeholders count as assigned (the soft-start
  law stands) — the thickness gate (`gateOrApply`) rides exactly as it does
  today.
* SettingsPanel (in-app) already has the per-type dropdown since T16 — leave
  it; this feature is the WIZARD's parity with it.

**Tests** (`test/turn34-f1-wizard-stock-gate.test.js`):
* source-level: `WizardSettings.jsx` renders a stock select on the colour
  path and the veneer path (string assertions on the shared select, the same
  grammar turn33-f7 used on DoorModal);
* logic-level: a spray front with colour but no `material_id` →
  `frontsMissing` non-empty; assigning Generic clears it; same for carcass
  veneer/spray; a decor front with finish but no board is STILL missing.

### F2 [HIGH] — LED: seen, and placed off the edge

Owner verdicts, 16.08: F1 lighting *"działa super ale nie ma możliwości
ustawienia jak daleko od edge, i są zbyt słabe — nic nie widać, za słabo
świecą"*; F2 demo *"turn on the light działa ale ledy za słabo świecą"*.

**Build two things:**

* **(a) Emission that reads on screen.** Three.js r180, physical light units
  (quadratic falloff): raise the strip/spot emissive + light intensity until
  ON is unmistakable in the default viewport exposure (ACES Filmic stays).
  Numbers live in the profile (`profile.appearance.lighting.*`), not
  literals. PROOF: `verify/t34/f2-led-off.png` / `f2-led-on.png` from the
  render lab, same camera, and `classify.mjs` (or pixel-delta) showing a
  material difference; plus the demo button flipping the pair live.
* **(b) Edge offset.** Per-strip parameter `inset_mm` — distance of the strip
  from the shelf FRONT edge — in the Lighting panel (number field beside the
  existing depth control), stored on the item
  (`design.lighting.items[].inset_mm`). Engine/3D: strip position shifts by
  `inset_mm` along depth; length law unchanged; **drilling stays ZERO**
  (T33 rule 3 survives verbatim). Default = T33's current placement, so
  every saved project renders byte-identically until the owner touches the
  field.

**Tests:** default inset reproduces T33 geometry (assert strip origin
unchanged with the field absent/0); a set inset moves the strip and ONLY the
strip; BOM lines unchanged by default; profile carries the emission numbers.

### F3 [HIGH] — RUNNERS: the nominal is the BOX + 10, on a 250–700 ladder

The owner's law, 16.08, closing the F9 review: *"powinien być skrzynka
+10 mm"* — the MOVENTO nominal that the BOM orders pairs with the box as
`NL = box + 10` (his standing workshop rule: nominal 450 ↔ box 440, 500 ↔
490). And the ladder bounds, same day: *"od 250"* … *"dopisujemy do 700"*.

**Build:**

* `profile.hardware.runner.movento.nominalLadder =
  [250, 300, 350, 400, 450, 500, 550, 600, 650, 700]` — one line, the T33-F9
  grammar (snap on a rung; a rung with no article in the register prints
  YELLOW, never a shorter substitute; below the whole ladder says so).
* The ASK changes: everywhere `runnerPairSpec` is fed for a drawer box
  (`cabinet.js` `runnerLength` — full-width stack, columns, BUDR), the asked
  value becomes **box depth + 10**. Box 490 → asks 500 → rung 500.
  Box 440 → 450. Box 640 → 650. Box 690 → 700. `asked_nl` carries the
  +10 value; the BOM label keeps naming snapped-beside-cut exactly as F9
  built it.
* `depthSteps` untouched (iron rule 5).

**Tests:** rewrite `turn33-f9-movento-ladder.test.js`'s ladder + rung
expectations to the new law and DATE the rewrite in the header (the T33
"nl=450, asked_nl=490" row becomes "nl=500, asked_nl=500 (box 490 + 10)" —
the owner's 16.08 correction, quoted). Add the full −10 pairing sweep:
every depthStep ≥ 240 maps to exactly `step+10` on the ladder. Fingerprint:
drawer-bearing configs' ONLY delta is the runner hardware line (rule 2).

### F4 [HIGH] — THE SHOE BOX: one construction, two mounting laws — LISP FIRST

The owner retired the pinned 15° shelf in one sentence, 16.08: *"jeżeli nie
jest szuflada to powinien być fix, nie z pinami — tu jest błąd"*. What
replaces it he designed line by line in chat; every number below is his,
same day. **The LISP section `SHOE BOX (T34)` in `KIT_WARDROBE_FULL.lsp`
(delivered with this spec) is the record — read it before writing a line of
engine.**

**The box** (shared by both variants — his plan: *"jak zrobimy szufladę to tę
samą skrzyneczkę wykorzystamy, tylko dodamy prowadnice po bokach i zwęzimy —
całość pozostanie bez zmian, będzie prościej"*):

* Walls: 2 sides + back + box front, ALL **80 mm** high
  (*"boki i front czyli skrzyneczka będzie 80 mm"*; *"plecki ważne, czyli
  skrzyneczka z 3 stron"* + front). All box parts cut from the PROJECT
  CARCASS BOARD (thickness G). The box is rectangular and level — only the
  bottom inside is sloped (owner confirmed exactly this reading).
* Sloped bottom, seated in **grooves** (his "tak" to the wcięcie): groove
  **6 mm deep in all four walls**, width = bottom thickness **+ 0.2 mm**
  play. Sides: a straight groove at the derived angle. Back: horizontal at
  the rear-edge height. Front: horizontal at the box floor.
* **Angle law** (variant he delegated — *"co łatwiej obliczać? dla mnie bez
  różnicy"* — so the single-formula law):
  `rearEdge = min(80, depth × tan 10°)`; the front edge always lands at the
  box floor behind the box front. Deep box ⇒ rear edge pinned at 80 and the
  angle comes out < 10° (600 → ≈7.6°); shallow box ⇒ exactly 10°. One board,
  one formula, no second flat panel.
* **Grain across** the bottom — *"pamiętaj, żeby dno były słoje w poprzek"* —
  grain runs along the WIDTH. Pin it the way the T33 eye-tests pin grain.
* **Divider: 0 or 1** (*"jedna lub 0 przegródek — 2 nie mają sensu"*),
  running **ACROSS the width** — *"od lewej do prawej, jak będą 2 rzędy
  butów, a nie od tyłu do przodu"* — height **50 mm**, standing on the slope
  at mid-depth (LISP pins the seat).
* **A front on BOTH variants**, height **120 mm** (his 16.08 change:
  *"jak będzie fix to też będzie front, ale nie ze spray tylko z materiału
  carcasowego — jak złożymy skrzyneczkę, widać ciętą płytę, więc trzeba
  przykryć"*). Material law:
  * FIX → front from the **carcass** family (project carcass decor), full
    opening width;
  * DRAWER → front from the **fronts** family (spray/laminate/veneer like
    every other front), and it rides the front-clearance matrix like every
    other front.
  Both mounted from inside — nothing visible on the face.

**FIX variant:**
* Box width = the bay's clear opening. Mounted by **3 screws per side, in a
  row, driven from OUTSIDE the carcass side** — *"środek: nie widać nic"*.
  CNC: a row of **3 × ⌀3 mm** through-pilots in each carcass side, positions
  per the LISP section.
* **Position**: modal field "Height from bay floor" in mm, step 1,
  **default 0** (on the floor) — or **directly above the drawer stack** when
  the bay has drawers (*"pozycja jak proponujesz"*). The pilots are drilled
  where the field says — position is a pre-export decision, not hardware
  adjustment.

**DRAWER variant:**
* Same box, width = opening **− 2 × 13** (*"runners 13 mm szerokości"*), on
  SIDE-MOUNTED runners — a NEW hardware family (NOT MOVENTO;
  `profile.hardware.runner.sideShoe`), articles unknown ⇒ YELLOW named spec
  until the owner fills the register.
* **Runner drilling** in the carcass sides, from the owner's sheet (16.08,
  Hafele-type pattern): first fixing **37 mm from the runner front face**,
  then the rear fixing at the system column per NL —
  `{150: 77.2, 200: 128, 250: 128, 300: 224, 350: 224, 400: 320, 450: 352,
  500: 416, 550: 448, 600: 480, 650: 544, 700: 544}` — the LISP section
  holds the record; the engine mirrors it (`drillMap`, profile-listed).
* **Runner front setback** from the carcass front edge = **front thickness
  + 3 mm** (*"pamiętaj żeby cofnąć na front + 3 mm"*).
* Behind hinged doors: **+ 30 mm infill per hinged side**, read from the ONE
  `dpSideLaw` object (T33-F6's law — one law, another reader, still zero
  divergence). Test it edge-length like turn33-f6 does.

**Old projects:** saved elements built as the T33 pinned 15° shelf keep
rendering exactly as saved — no silent migration. NEW shoe accessories create
the box. One grey note in the modal when an old-style shelf is selected.

**Everything above lands with:** engine geometry matched to the LISP, DXF
layers per convention (NO text styles — the 02.08 VCarve crash law), the
T25 duplicate-edge check run on every new panel, BOM lines (box parts by
board, runner pair yellow, insert law from F11 untouched), 3D with the
draggable beside-the-object modal, and `verify/t34/` proofs: fix in an open
bay, drawer behind doors showing the 30, grain direction visible.

**Tests** (`turn34-f4-shoe-box.test.js` + a CNC-side file): every number
pinned — 80/120/50/13/6/0.2, `min(80, d·tan10°)`, 37 + the drillMap table,
front+3, 3×⌀3 row, W−26, dpSideLaw read shared, grain axis, groove in all
four walls, both front-material laws, position default with/without drawers.

### F5 [MEDIUM] — GAP DIMENSIONS: one "3" at a touch, the truth apart

The owner, 16.08: *"czasami pokazuje 2 wymiary 1.5 i 1.5, a mi zależało żeby
zawsze pokazywało jeden — przy dojechaniu do szafki żeby się sumowały i
pokazywało 3"*. And the apart case, his ruling: *"oczywiście, że 1.5, 100 i
1.5 — bo tak jest w rzeczywistości; dopiero jak dojeżdżają do siebie, to 3."*

**Build:** a SCENE-level dimension for neighbouring fronts (the
`frontGapClash.js` pairing — same wall, unturned, height bands overlap, same
plane, nothing between):
* carcasses TOUCHING (the `carcassGaps` tolerance) → suppress the two
  per-unit edge dims at the meeting line and draw ONE leaf-to-leaf dimension
  (healthy = 3.00);
* carcasses APART → three dims: own 1.5 · carcass distance · own 1.5.
* `UnitView`'s inside-one-cabinet dims (turn 25) stay untouched everywhere
  else; only the meeting-line pair merges. The red <3 clash overlay keeps its
  job.

**Tests:** pairing + suppression only at touch; apart yields the triplet;
numbers come from `frontClearances`, not re-derived.

### F6 [MEDIUM] — THE APPLIANCE EXCEPTION: a trim may extend, there and only there

The owner, 16.08: *"raczej tylko przy appliance'ach — silnik powinien
pilnować, żeby zawsze było 3"*. (His future one-knob gap setting is noted for
LATER — *"nie teraz"* — this feature must keep `doors.gap` the single source
so that knob stays one line away.)

**Build — an engine-law change, tests first:**
* `healingPlan` (frontClearance.js): the floor becomes kind-dependent — for
  `edge.kind === NEIGHBOUR.APPLIANCE` the correction may go NEGATIVE
  (extension), capped at closing the stock clearance to 0 (never wider).
  Every other kind keeps the T32 "a trim only narrows" law verbatim; amend
  that doc-comment to name the one exception with the owner's quote.
* `cabinet.js` `front_edge_trim` channel accepts the negative value on that
  edge; the trim still applies BEFORE the drilling pass, so a hole 21.5 from
  the hinge edge stays 21.5 when the hinge edge extends — assert it.
* Result the client sees: front at 0 beside an appliance inset 3 ⇒ the sum is
  3, held by the engine on every heal path (the F5 sweep matrix gains the
  appliance column).

**Tests:** the extension plans only at APPLIANCE; caps at stock; other kinds
still floor at 0; drilling rides the edge; the 6-config fingerprint is
untouched (no appliance in the set) plus one appliance config asserting the
sum-3.

### F7 [LOW] — SHAKER FRAME: the default becomes 60, old projects keep 70

The owner, 16.08: *"zmienimy default z 70 na 60, ale nie teraz"* — "nie
teraz" was the chat; the turn is now. `profile.front.types.S` default frame
70 → 60 for NEW projects. **Old projects do not move**: on `loadProject`, a
project with Shaker anywhere and no explicit `fronts.shakerFrame` gets it
pinned to 70 (the F7-handles precedent: a changed default never redraws a
saved job). Range 10–200 unchanged.

**Tests:** new project default 60; loaded legacy Shaker project pins 70;
explicit values untouched.

### F8 [HIGH] — DELETE: the key, the modal button, one drawer per press

The owner, 16.08: *"szuflady i wszystkie inne elementy: po naciśnięciu i
podświetleniu — usunięcie przez naciśnięcie Delete; w modalu pokaż też
Delete. Jak mamy 3 szuflady, niech usuwają się po jednej, tak jak
naciskasz."*

**Build:**
* `Delete` (and `Backspace` on mac keyboards) removes the currently selected/
  highlighted ELEMENT — drawers, shelves, dividers, accessories, lighting
  items: everything selectable that has a modal. Guard: the key is inert
  while focus sits in an input/textarea/contenteditable or a modal number
  field.
* The element modal gains a `Delete` button (same action, same guards),
  placed per the modal's own grammar.
* **Drawer stacks decrement one per press**: after a removal the selection
  moves to the NEXT drawer in the stack (downwards), so three presses clear
  a stack of three. [OWNER — accepted by silence: selection falls downward.]
* Every removal path runs the F5 heal sweep — add the delete rows to the
  turn33-f5 matrix (element removal under bay doors, drawer removal beside a
  panel): no healable correction left standing after a delete.
* No undo system exists; deletion is immediate — the modal button says what
  it does.

**Tests:** key path with a real KeyboardEvent through the store; input-focus
guard; stack order (3 → 2 → 1 → empty, selection follows); modal-button
parity; heal-after-delete matrix rows; nothing deletes when nothing is
selected.

### F9 [LOW] — TOP MENU: "Front dimensions", the twin toggle

The owner, 16.08: *"górne menu: obok 3D dimensions dodaj taki sam przycisk —
Front dimensions (show front dimensions)."*

**Build:** a toggle button next to the existing 3D-dimensions control, same
look, same persistence grammar, controlling the FRONT-dimension layer
(`frontDimensionRows` in UnitView **and** F5's new meeting-line dimension —
one layer, one switch). Default = current visibility, so nothing changes
until clicked.

**Tests:** toggle state plumbs to both consumers; off hides the merged "3"
too; persists like its sibling.

## What this turn does NOT touch

`depthSteps` (rule 5). Golden fixtures. L-shape + corner reach. Props GLB.
JoineryCore sync/re-export. AGD GLB (waiting on the owner's files). Sliding
doors, nesting, hood, Kitchen top-level library, sheen per-slot. Hinge arm
15 mm inboard (frozen spec, parked by the owner's silence today). Internal
metal default (Gold→Silver awaits his verdict). The EGGER e-mail stays
BLOCKER #44 — nothing here is a public demo.

## Order of work

F4's LISP section is already in the repo (verify-second, above) — read it
first. Then F1 (the owner called it the program's foundation), F3 and F6
(engine laws, tests first), F4 (the big build), F2, F8, F5, F9, F7. Commit
per feature; the morning audit will hold this file against the diff line by
line.