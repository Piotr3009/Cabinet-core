# CLAUDE.md — TURN 35: THE RAIL'S OWN DATUM, SPLIT DOORS, AND A DAY OF VERDICTS

Date issued: 16.08.2026, late evening. Previous turn: T34 (PR #34 merged) plus
a long day of owner-driven chat-fixes on main (shoe box v2, LED halo v2,
plinth law, batten, check #12, build stamp).

VERIFY FIRST — this turn builds on today's chat-fixes being on main:
`src/engine/shoeBox.js` must contain `angleMaxDeg: n(s.angleMaxDeg, 7)` and
`src/engine/checks.js` must list rule 12 (`Shoe box × hinge collision`). If
either is missing, STOP and report — the owner has one un-pushed ZIP and the
run must not race it.

VERIFY SECOND — `reference/lisp/KIT_SHOE_BOX.lsp` exists with the marker
`;;; KIT_SHOE_BOX.lsp` and `SHOE_ANGLE_MAX   7.0`. Missing → STOP and report.

Everything below was dictated by the owner in one evening session, 16.08,
feature by feature, most of it verbatim. Where a decision was offered to him
three times and not taken, the default is marked `[OWNER — by silence]` and
travels in the PR body's Q-list.

## Iron rules for this turn

1. **/engineering-discipline governs every feature.** The CONSUMER SWEEP is
   mandatory — T33-F5 exists because a law skipped four paths.
2. **Engine purity, with NAMED exceptions.** Bare `computeCabinet()` = the
   AutoLISP. This turn's engine-law changes each land with tests in the same
   commit and name their delta. Extend the classifier (sibling
   `scripts/t35-classify.mjs`) with the new buckets; the contract vs main:
   * `DOOR_TOP_FULL` — F12: a door with NOTHING above it grows to full
     height (the 3 mm top gap goes). Expected on every doored config.
   * `GRAIN_AXIS` — F6: drawer boxes, drawer fronts and plinths carry the
     new grain axis. Expected on drawer- and plinth-bearing configs.
   * Anything else at all = UNNAMED = exit 1 = the run failed its own
     contract.
3. **LISP is law.** F13 (split doors) changes wardrobe geometry: the LISP
   section moves FIRST — `KIT_WARDROBE_FULL.lsp` gains a clearly marked
   `;; --- SPLIT DOORS (T35)` section in the SAME commit as (or before) the
   engine change. Any LISP edit ships with a paren-balance check in the test
   suite (strip strings and comments, count parens, assert balance 0 and
   min 0 — the chat's own script, now a test). Outside that section: **not
   one character** of any kit changes.
4. **Delete nothing without the spec saying so.** The owner, verbatim:
   *"nigdy nie kasuj bez mojej zgody jakichkolwiek funkcji — to jest
   świętość."* The ONLY deletions this turn: F5's plate stand-in (his order)
   and F10's two checkboxes (replaced by his approved mockup). Export by
   material stays byte-for-byte.
5. **Golden fixtures untouchable.** `depthSteps` untouchable. All modals
   draggable, opened beside their object.
6. **Proofs** in `verify/t35/`, named subjects, real pointer input,
   live-scene proof for store/UI work. Commit per feature, mergeable head,
   skip-and-note, PR open before morning. Full suite never `--silent`;
   clean-room install; vite build; zero new dependencies.

## Features

### F1 [HIGH] — THE RAIL'S OWN DATUM: measured from the nearest thing below

The owner's biggest complaint of the evening: *"nie mogę ustawić wysokości
raila — sam się wstawia, i jak edytuję dwuklikiem, to nie ma opcji ustawienia
wysokości."* And the LAW, his words: *"drążek ustawiamy zawsze od najbliższej
czegoś od dołu — albo od szuflad, albo od półek. Jeśli napiszę 900, to niech
będzie od półki, chyba że nic nie ma — to wtedy od dna."* Confirmed in
follow-up: the datum is the TOP SURFACE of the support (shelf top / drawer
stack top / bay floor), measured to the ROD'S AXIS, and the base is LIVE —
move the shelf below and the rail rides with it, keeping its number.

**Build:**
* Hanger modal (double-click) gains the field **"Height above support"**
  (mm, step 1). The engine resolves the support: the highest of {drawer
  stack top, fixed/adjustable shelf top} BELOW the rail's axis in its bay;
  none → the bay floor. Axis = support + value.
* The base is live: the rail is stored as a support-relative number, not an
  absolute Y — resolution happens at compute time, so a moved shelf carries
  the rail (the owner's explicit yes).
* Existing projects: on load, a rail with no relative value gets one
  DERIVED from its current absolute position (same scene, byte-identical
  render — the F7-handles precedent).
* Collision upward: axis + hanger clearance past the next shelf/top → RED
  fault (check #13, `Rail × obstacle above`), never an auto-fix.

**Tests:** support resolution (drawers vs shelf vs floor, the highest wins);
the 900-above-shelf example; the live ride; legacy derivation
byte-identical; the red fault fires and clears.

### F2 [HIGH] — MULTI-SELECT: Ctrl+click, and the group moves as one

The owner, morning and evening: *"zaznaczam z CTRL+ i przesuwam wszystkie
ledy"* … *"i to samo z shelves — mogę na przykład przesunąć do góry, i
przesuwać wszystkie lub zagłębiać."*

**Build:**
* Ctrl+click adds/removes an element from a SELECTION SET (uiStore); plain
  click keeps today's single-select exactly. The scene highlights every
  member.
* Group operations apply the SAME edit to every member that understands it:
  * shelves: position (up/down) and depth edits apply to all selected;
  * LED strips: inset and depth controls write to every selected strip
    (the "All strips" master stays — this is the targeted version).
* Delete (T34-F8) on a multi-selection removes ALL selected in one press
  `[OWNER — by silence]`, through the F5 heal sweep.
* Mixed selections: an edit applies to members that have the field; others
  are left alone and the panel says how many took it.

**Tests:** set add/remove; a group nudge on 3 shelves; group inset on
strips; single-select untouched; heal rows after a group delete.

### F3 [MEDIUM] — SHOE FIX: the front becomes a switch

Owner (yesterday): the FIX box carries a 120 front from the carcass family —
*"widać ciętą płytę, trzeba przykryć."* Owner (today): *"jeśli to jest fix,
to może bez frontu?"*, settled at close of session: *"punkt 3 — tak, z
przełącznikiem."*

**Build:** the shoe-box modal gains **"Front: on / off"** per box, default
**ON** (his standing cover-the-edges ruling). Engine: front off drops the SHOEBOX-FR panel
from panels/BOM/3D; everything else identical. `KIT_SHOE_BOX.lsp` gains a
one-line note beside the FRONT law (optional on FIX, default present).
Tests: both states, board count, BOM.

### F4 [HIGH] — WEBGL CONTEXT LOST: diagnose, then guard

The owner's console today: a wall of `WebGL: INVALID_OPERATION: loseContext:
context already lost`, a frozen viewport, and *"renderowanie zabiera sporo
pamięci, bo się zacina."*

**Build:** find WHY the app loses/multiplies GL contexts (suspects: the
canvas remounting on screen flips, `forceContextLoss` called on an
already-lost context during cleanup, more than one Canvas alive). Then: ONE
canvas instance for the app's life; cleanup calls `forceContextLoss` at most
once and only on a live context; a `webglcontextlost` listener that prevents
default and restores; one console line naming a restore. PROOF: a walk step
that flips screens/projects 10x and asserts one canvas and zero loseContext
errors in the console log. Name the actual cause in the PR body.

### F5 [HIGH] — HINGES: the plate joins the 14.08 order, moves 5 mm into
### the side, and the modal lists them like the wall does

Three owner findings, one block:
* *"na zawiasach znowu nadpisuje mi się stary wygląd sprzed GLB — usuńmy ten
  kod."* The 14.08 chat-fix removed the hinge BODY stand-ins by his order
  (the quote is in the code); the PLATE kept its primitive behind the same
  `visible={!drawnModel}` gate that already misfired on his machine once.
  REMOVE the plate stand-in: a plate is the downloaded GLB or nothing. The
  invisible double-click pick target stays (it is clickability, not looks).
* *"plate hinge'a na bokach jest odsunięte — wkręty muszą wchodzić do boku;
  wciśnij do ściany o długość 5 mm wkrętów."* The plate GLB's resting X
  moves 5 mm INTO the side panel (toward the board), profile-listed
  (`hardware.hinge.plateBiteMm: 5`), so the screws sit in timber.
* *"kolejność hinges na modalu jest odwrotnie jak w rzeczywistości — górne
  zawiasy na górze listy."* The modal's hinge rows sort by Y DESCENDING
  (top hinge first). Arrows/picker behaviour untouched.

**Tests:** no plate primitive in the source (the 14.08 assertion pattern);
the bite offset read from the profile and applied; the modal order pinned.

### F6 [HIGH] — CNC GRAIN: drawer boxes, drawer fronts and the plinth stand
### along the grain

The owner, verbatim: *"szuflady są ustawione w poziomie, a powinny być w
pionie, wzdłuż słojów; fronty szuflad też wzdłuż; plinth też."*

**Build:** the grain axis of these ROLES is LAW: drawer-box parts, drawer
FRONTS, and PLINTH boards carry grain ALONG the piece, and the CNC layout
places them accordingly — nesting may not rotate them off-grain. Where a
panel already carries a grain field, set it; where the layout decides
rotation, the grain field forbids the 90-degree flip. This is the T33
lesson ("shelf grain — the eye catches what green tests miss") made into
asserts: **tests pin the grain axis PER ROLE** and a layout test proves no
off-grain rotation for these roles. Named classifier bucket `GRAIN_AXIS`
(iron rule 2).

### F7 [HIGH] — SETTINGS IN A PROJECT: the current shape, not a stale one

The owner: *"settings mamy ustawiony poprawnie, ale jak edytuję ustawienia
już w projekcie, to włącza mi się stary setup."* Today's LED lesson says
where to look first: a persisted snapshot (localStorage profile / panel
state) outvoting the code's current shape. Diagnose for real, then fix so
the in-project Settings renders THE SAME, CURRENT panel the wizard renders,
with the project's own values in it — a stale stored SHAPE never wins over
the code's shape (values are the project's; the FORM is the app's — the
same law as `appearance.lighting`). Name the actual cause in the PR body.

### F8 [MEDIUM] — HARDWARE SETTINGS: the hinge-screw pilot, ⌀3 or ⌀5

The owner: *"nie mamy ustawienia w ogóle 5 mm czy 3 mm screws zawiasy
wiercenie — niektórzy używają tak, inni inaczej"*; placement: *"to
ustawienie musi być w hardware ustawieniach"*; default: *"5, jak jest
teraz"*.

**Build:** Settings → Hardware gains **Hinge plate pilot: ⌀3 / ⌀5** (default
5). The CNC hinge-plate pilots take the chosen diameter, the layer name
carries it (the DXF grammar the house already uses — NO text styles).
Profile key + per-project override; tests pin both diameters' output.

### F9 [MEDIUM] — EXPORT BY ELEMENT TYPE, PROJECT-WIDE

The owner: *"wybór all carcases, infill, shelves etc powinien też być dla
wszystkich szafek, nie tylko pojedynczych — mogę na przykład tylko
eksportować shelves. Ale export poprzez materiał zostaw jak jest."*

**Build:** the by-type export filter gains a PROJECT scope: the same type
list applied across every unit at once (e.g. every shelf in the project in
one export). Per-unit stays; **by-material export untouched, byte-for-byte**
(iron rule 4). Tests: a project-wide shelf export picks every unit's shelves
and nothing else.

### F10 [MEDIUM] — LIGHTING ON/OFF: two big buttons, one state

The owner crossed out both checkboxes on a screenshot and approved the
mockup: *"te 2 funkcje usuń i na to miejsce dodaj duże zielony i czerwony
przycisk ON i OFF — internal lights."*

**Build:** the Lighting panel's "Lighting in this project" checkbox and the
"Turn on the light" checkbox are REPLACED by one pair of large buttons —
**ON** (green when active) / **OFF** (red when active) — one state:
ON = lighting enabled AND shining (the room dims, the LEDs shine, halo,
lamps); OFF = the LEDs are dark. Under the hood the two flags merge into
one; `loadProject` maps legacy projects (enabled AND demo → ON; anything
else → OFF), named in a migration comment. Everything below the buttons
(temperatures, switching, place-a-light, placed list) stays exactly.

**Tests:** the state mapping, the legacy migration, the 3D reads one flag.

### F11 [LOW] — DRAWER FRONT DIMENSIONS hide behind a closed door

The owner: *"jeśli są szuflady w szafie, to nie pokazuj wymiarów frontów
szuflad, dopóki nie otworzysz szafy — w innym przypadku to nie ma sensu."*

**Build:** in a unit WITH doors, drawer-front dimension rows render only
while the unit's doors are OPEN (the existing open/close state). Door
dimensions unchanged; doorless units unchanged. Test: closed → absent,
open → present, no doors → always.

### F12 [HIGH] — THE DOOR'S TOP EDGE joins the clearance matrix

The owner: *"jak nie ma infilla, to wysokość drzwi szafowych jest bez 3 mm
przerwy; a jak dołożysz infill lub cornice, to wtedy skracamy o 3 mm."* Both
directions — remove the cornice and the door grows back.

**Build:** the front-clearance grammar (T32/T33-F5) gains the TOP edge:
neighbour above (infill/cornice) → demand 3.0; nothing above → demand 0
(full height, flush with the carcass top). Self-healing on EVERY path that
adds/removes the neighbour or reloads the project — the F5 sweep matrix
gains the top-edge column. Hinge drilling rides its own edge as always.
Named classifier bucket `DOOR_TOP_FULL` (doored configs grow 3 at the top —
iron rule 2). LISP: confirm the kits' door-height law and record the
match-or-divergence in the PR body; if a kit says "3 always", that kit's
section gets the owner's 16.08 amendment FIRST (rule 3).

**Tests:** all four transitions (add/remove infill, add/remove cornice),
reload, the sweep rows, drilling unchanged relative to the hinge edge.

### F13 [HIGH] — SPLIT DOORS: two segments, a full-depth shelf between —
### LISP FIRST

The owner: *"podział drzwi na dolne i górne — wystarczą 2 segmenty;
wpisywanie GÓRNEJ części; i zawsze musi być przedzielone półką FIX, która
NIE MA cofnięcia 20 mm (automatycznie)."* Confirmed: the divider shelf is
FULL DEPTH, flush with the front, so both segments have something to close
against.

**Build (the LISP section `SPLIT DOORS (T35)` in `KIT_WARDROBE_FULL.lsp`
first, same commit):**
* A doored wardrobe bay gains "Split door: top segment height ___ mm"
  (0 = no split). With a split: bottom segment = opening − top − 3; ONE fix
  shelf auto-appears at the split line at FULL depth (no 20 mm setback —
  its own law, distinct from ordinary fix shelves), G thick.
* Each segment carries its OWN hinge set (count per segment from the Blum
  table by segment height/weight — the existing `hingesRequired`), its own
  handle law; mirrors allowed per segment.
* Gaps: 3 mm between segments (the matrix), side clearances as today, the
  top edge per F12.
* BOM/CNC: two fronts + the divider shelf; drilling per segment from its
  own hinge edge.
* Modal: segments listed top-first (F5's order law).

**Tests:** the heights arithmetic (top + 3 + bottom = opening), the divider
shelf's full-depth law, per-segment hinge counts, the LISP paren balance,
the segment order in the modal source.

### F14 [HIGH] — THE TOP BOX: a small wardrobe that rides the main one

The owner's reason, verbatim: *"czasami wysokie szafy nie wejdą do domu —
nie da się wnieść — więc musimy podzielić, i wtedy wybór wardrobe musi być
main wardrobe i nadstawka nad szafę, mała szafka."*

**Build:** the wardrobe library offers **Main wardrobe** and **Top box**.
A Top box is a wardrobe-family unit that STACKS on a main one: same depth,
snapped flush over it (x aligned, y = the main's height), carried if the
main moves. Its own carcass/doors/BOM/CNC as a normal unit (it IS a small
wardrobe); dimensions show the pair's heights separately. Placement:
dropping a Top box near a main snaps it on top; a red fault when it hangs
with no main under it. No changes to existing single wardrobes.

**Tests:** the snap-on placement, ride-with-main, the orphan fault, BOM as
its own unit.

### F15 [MEDIUM] — SHEET SIZES: a list per family, and check #7 speaks per
### family

The owner: *"musimy wpisywać wymiary w setup produkcyjne płyt — jak mamy bok
2600 a maksymalna płyta 2400, to niech nie pozwoli"*, and the list: *"z
listy wybór — Jumbo 2070 × 2800, Standard 1220 × 2440, 10 foot 1020 × 3050,
i Other, i tu wpisujemy sami. To musi być w carcases I fronty."* (His "207"
read as 2070 — the Egger XL format — flagged, accepted by silence.)

**Build:** Settings → production: TWO sheet-size selectors — one for
CARCASSES, one for FRONTS — options `Jumbo 2070 × 2800`,
`Standard 1220 × 2440`, `10 ft 1020 × 3050`, `Other…` (two number fields).
Check #7 measures every panel against ITS OWN family's sheet, and the red
message names the way out: *"side 2600 > sheet 2400 — split the wardrobe or
add a Top box."* No auto-splitting — the decision is the owner's; the
program only refuses loudly.

**Tests:** the per-family gate (a 2600 side vs a 2400 carcass sheet fires
even when the fronts sheet is Jumbo), Other round-trips, the message text.

### F16 [LOW] — FAVICON

The 404 goes: a simple original mark (the app's own square/monogram —
nothing licensed), `favicon.ico` + the link tag. Last, after everything.

## What this turn does NOT touch

Export by material (byte-for-byte). `depthSteps`. Golden fixtures. The
existing check rules' behaviour. Parked: L-shape, props GLB, JoineryCore
sync, AGD GLB (owner's files), sliding doors, nesting, hood, sheen
per-slot, internal metal default (Gold→Silver awaits his word), hinge arm
15 mm inboard (VERIFY in the repo whether T34 landed it; if truly
un-landed, note it in the PR body — do NOT build it tonight unasked).
EGGER e-mail stays BLOCKER #44.

## Order of work

F13's LISP section first (rule 3), then F1, F12, F13, F7, F5, F6, F2, F4,
F14, F15, F10, F8, F9, F3, F11, F16. Commit per feature. The morning audit
holds this file against the diff line by line, and the classifier holds
rule 2's named-deltas contract.