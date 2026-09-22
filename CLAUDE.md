# CLAUDE.md, TURN 72 · FOURTEEN THINGS THE OWNER CLICKED ON AND DID NOT GET

Run autonomously. Zero questions, zero stops: every decision below is the
owner's own (22.09.2026), so nothing here is asked again. Skip-and-note.
Full suite, never `--silent`. Frames under `verify/t72/`. Branch
`claude/t72-fourteen`, one commit per F, PR at the end; the owner merges.
Nothing lands in Petros from this session.

## THE ORDER, IN THE OWNER'S WORDS
*"kilka zmian, do których nie muszę mieć mnóstwa dyskusji"*: fourteen points
from one afternoon in the RETAIL configurator (Prime Bespoke Interiors, the
wardrobe), with the mock-ups approved on 22.09.2026 and the answers that
settled every open question. Where a point says PRO too, it is PRO too.

## LAWS
**Diagnose before you cut.** Four points (F1, F4, F6, F7) begin with a
committed PROBE: the fact found, in one table, before any fix. **Nothing
typed onto a screen that the engine does not publish.** **Left adds, right
edits** (Petros: the right panel is the selected element's functions, adding
belongs to the left column). **1:1 = COPY**: a PRO surface edited tonight is
re-copied to its retail copy the same night by the copy machine
(`scripts/t69-copy.mjs` pattern, extended to the files named here), never by
hand. **Numbers do not enter the UI without the owner's order**: every field
below is his order, and no other field appears. **No em or en dash** in
anything written. **Room refuses first**: nothing is clipped silently.

## FROZEN
1. Goldens x6 byte-identical; `computeCabinet` is not touched. The one
   engine change (F14, the wall gap per unit) is PLACEMENT, read by
   `engine/runs.js` and the room, never by the cut path; `scripts/t72-classify.mjs`
   proves it the way T71's does.
2. LISP untouched. The unit card, the booklet and the T71 drawing set
   untouched (`engine/drawings/**` read-only).
3. PRO freeze (`test/turn59-f1-the-switch.test.js`): every PRO file edited
   tonight is licensed in `EXEMPT` with the owner's words from this file and
   re-frozen at its new hash, in the same commit as the edit. Expected:
   `ElementProperties.jsx` (F2, F3, F12), `DoorModal.jsx` (F6, if the probe
   convicts it), `JpullRunModal.jsx` (F4), the 3D layer is not frozen.
4. Retail copies diverge from PRO ONLY where a point says "retail only", and
   every such divergence is written out in the PR by file and line.

## F1 · THE END PANEL'S MENU OPENS, AND SAYS TWO THINGS (points 1 and the panel half of 12)
Owner: *"jak kliknę 2 razy na panel boczny po prawej nie pokazuje mi się menu
panelu"*, then on the mock-up: *"panel: up to ceiling; drugi równo z carcasem
od dołu; a default do ziemi; reszta ok."*
- PROBE first: in the retail room, 2klik on an END-PANEL. Which element the
  scene hands to `dockFor` (`src/retail/design/detail/docked.jsx`), what
  `menu` and `panel` it carries, and why nothing opens. Commit the table.
- Then the panel's docked menu shows, in retail, exactly:
  TOP: `Carcass` | `Ceiling`; BOTTOM: `Carcass` | `Floor` (default `Floor`);
  COLOUR: `As the fronts` | `Other`; `Remove panel`. No number fields in
  retail. The two chips write the same store paths the numeric
  `above-unit-ep` / `below-unit-ep` fields and `endPanelToCeiling` write
  today (read them first; do not add a second law). PRO keeps its numeric
  fields.

## F2 · THE SHELF'S MENU: HOW IT IS HELD, AND THE SETBACK (point 2)
Owner: *"jest menu po 2kliku, ale nie ma opcji back 20 mm, czyli regulacji
głębokości, ani nie ma wyboru fix / adjustable, nie choose, tylko te 2 opcje."*
Answer 22.09: setback as two chips plus a field.
- `shelf-type` becomes two chips `Fix` | `Adjustable` (the `<select>` with
  pull-out and shoe leaves this menu; pull-out is disabled anyway and the
  shoe shelf has its own drawer). Store path unchanged: `setShelfType`.
- PROBE inside F2: a wardrobe shelf added as a COUNT has no `itemId`, and
  `elementFields` then drops every field but material (`engine/elements.js`,
  turn 21). If that is why the type is missing on the owner's screen, the
  fix is that a count shelf becomes an item at the moment it is edited
  (the store already turns a count into items for dragging: read
  `setShelfPos`), never a second field list.
- SET BACK FROM THE FRONT: chips `20 mm` | `Flush` plus a number field, in
  retail and PRO. `setback` leaves `WORKSHOP_FIELDS` in `docked.jsx` for the
  shelf and the partition only; the rest of that list stays hidden.

## F3 · THE SPACING IS ON THE WARDROBE, AND IT IS CLICKABLE (point 3), RETAIL AND PRO
Owner: *"jak kliknę 2 razy na półkę to wymiary pomiędzy półkami niech
zostaną i będą klikalne i wtedy będzie można ustawić wysokość pomiędzy
półkami"*, then *"to samo przenieś, dodaj do PRO; plus szerokości; dodaj na
dole tego modalu CENTER ALL."*
- After 2klik on a shelf the vertical chain between the shelves of its bay
  (floor, each shelf, the top) stays on the scene while the shelf is
  selected; every figure is a chip; click opens an inline number field on
  the chip; Enter writes the spacing by moving THE SELECTED SHELF (its
  neighbours stand still), through `setShelfPos` with the same clamp the
  drag obeys; the room and the neighbours refuse first. Escape cancels.
- The same for WIDTHS: 2klik on a partition keeps the bay widths either side
  (`HoverDimensions.jsx` already derives them from `bayGapsAround`) as chips;
  a click types the width and moves the selected partition.
- CENTER ALL at the bottom of the shelf menu: the shelves of that bay are
  spread evenly between floor and top (equal clear gaps, the engine's own
  clamp). One store action, `centreShelves(unitId, bayRef)`, used by PRO and
  retail; the docked editor's button is the only entry.
- Mock-up: board 1 of the canvas "Makiety menu i wymiarów" (22.09).

## F4 · THE J-PULL IS SEEN, AND ITS LENGTH IS TYPED (point 4)
Owner: *"jak nacisnę J nie pokazuje mi w ogóle tego na wizualizacji, wiem że
jest ale nie widać, zrób test; przesuwanie powiększenia J-hand nie może być
przesuwakiem, musimy wpisywać liczby, nie będziemy próbowali trafić na ten
sam numer co sąsiednie drzwi."* Answer 22.09: numbers, and the T57 rule
("pasek albo pokrętło") is set aside for this ONE field on his word.
- PROBE first, as a TEST: a retail wardrobe with the J-pull chosen; does the
  scene emit the J channel geometry (`3d/jpullProfile.js` through
  `UnitView.jsx`), and is it visible from the room camera? Commit the test
  and the verdict, then fix what it convicts.
- `JpullRunModal` (retail copy and PRO): the run length is a number field
  with the engine's min and max shown beside it; no slider. Two doors typed
  the same number get the same run.

## F5 · THE END PANEL LEAVES THE MOMENT A NEIGHBOUR ARRIVES (point 5)
Owner: *"jak dodajesz szafę obok powinien zniknąć panel i znika, ale dopiero
jak przesuniesz szafę od boku i przysuniesz do; funkcja jest napisana 'jak
dosuniesz' a nie 'jak się pojawia'. Mała zmiana, ale musi być."*
- `autoEndPanelStrays` / `autoEndPanelJunctions` run today after a move
  (`projectStore.js`, the settle after drag). They run after ADD as well:
  `addUnit` and every path that places a unit beside another calls the same
  sweep once. One law, one more caller. Test: add beside, the panel is gone
  before any drag.

## F6 · THE DOOR WINDOW SHOWS WHAT IT HOLDS: HINGES, HINGE SIDE, THE SPLIT (points 6 and the owner's three questions)
Owner: *"2klik na drzwiach nie pokazuje w ogóle hinges"*, *"mamy fajny w PRO
to menu z zawiasami i ze strzałkami up and down, skopiuj z PRO"*, *"gdzie jest
left/right wybór oraz podzielenie drzwi, top section?"*
- FACT: retail's `DoorModal.jsx` copy already mounts PRO's `HingeSection`
  (up and down at the hinge's 5 mm stride), the `Hinge side` field and
  `SplitDoorField`, all behind `isDoor` (`panel.part === 'FRONT' &&
  panel.role === 'front' && !panel.meta?.appliance`).
- PROBE first: 2klik on a wardrobe door in retail; what `panel.part`,
  `panel.role` and `meta` the door carries, and which of the three blocks
  render. Commit the table. Then fix the one gate (or the one route) so all
  three show, in retail as in PRO. No second hinge menu is written.
- Mock-up: board 5 shows where the hinges sit (at the end); the real block
  is PRO's, copied, not the drawing.

## F7 · LIGHTS MODE STAYS ON (point 7)
Owner: *"po naciśnięciu LED wyłącza mi się funkcja lights i zaznacza mi
drzwi, a nie powinno; nie powinno wyłączyć aż do momentu, że albo wyłączę
sam w menu, albo zrobię 2klik na innym elemencie lub na ścianie."*
- PROBE first: which handler ends lights mode on the LED press (`ViewBar`
  `onLights`, `LightingPanel`, the stage's click). Commit it.
- Then: lights mode ends only by its own button, or by 2klik on another
  element or on the wall. A single click inside the mode never selects a
  door.

## F8 · CORNICE: ALL OR NONE ALONG A RUN (point 8)
Owner: *"każda dodatkowa szafa albo też ma cornice, albo żadna nie ma, bo jak
dodajesz szafę to człowiek jest confused."*
- A wardrobe added beside a run takes the run's cornice answer (on or off)
  at the moment it is added; the run never mixes. `engine/cornice.js` already
  says a cornice run continues across adjacent bearers (`types.js` turn 22);
  the add path reads the neighbour and writes the same `elements.cornice`.
  Removing a cornice from one wardrobe removes it from the run, with the
  notice saying so.

## F9 · THE DRAWER MENU, AND THE ACCESSORIES DRAWER (points 9, 10, 11)
Owner, on his screenshot: *"top drawers insert nie powinien tak wyglądać:
powinien być ADD ACCESSORIES DRAWER i powinno wziąć nas do menu i podświetlić
Add accessories drawer, i po 2kliku powinno się otworzyć menu, które już
jest, ale w nim powinien być przycisk GLASS ON TOP (zmniejsz moc światła o
połowę, powinno tylko tam świecić), powinien mieć wysokość szuflady
zaproponowaną, ten co jest default; FRONTS OR BARE BOXES usuń; WHAT THE
BOXES CARRY też usuń; usuń Veneer, dodaj materiałowe dno zamiast Veneer:
ciemnozielone, czerwone, brązowe, czarne, tylko te 4 kolory filcu."*
- `ReHomed.jsx` DRAWERS menu: HOW MANY stays; TOP DRAWER INSERT, GLASS TOP,
  FRONTS OR BARE BOXES and WHAT THE BOXES CARRY leave this menu (retail
  only; PRO's docked editor keeps its rows); one button ADD ACCESSORIES
  DRAWER takes the client to the INSIDE step and lights the "Accessories
  drawer" row (the row is highlighted until the next click elsewhere); the
  press adds through the adapter's existing call, never a new path.
- The accessories drawer's own menu (`WatchLayoutModal` copy): LAYOUT as
  today; GLASS ON TOP `Off` | `On` (writes `setWatchShelfGlass`); with the
  glass on, that drawer's light runs at half the LED spec's power and lights
  that drawer alone (read how `ledSpec` / the lighting layer light the glass
  shelf today; one number halved, no new lamp); DRAWER HEIGHT: a number
  field plus one chip "Proposed NNN" carrying the drawer's current height,
  which is the default until typed over; FINISH: `Project` | `Sprayed` |
  `Felt base`, and with Felt base four colour chips: dark green, red, brown,
  black. `WATCH_FINISHES` gains `felt` with those four colours in the engine
  (the BOM names the felt); `Veneer` never existed there and does not appear.
- Mock-ups: boards 3 and 4.

## F10 · MATERIAL ON A PIECE, IN RETAIL, ONLY WHEN THERE IS A CHOICE (owner's question, answer 22.09: tak)
- The `material` row of the docked editor shows in retail only when the
  project carries more than one material of that piece's role (carcass or
  front, from the design's type lists). One material: no row. PRO unchanged.

## F11 · THE TOP BOX QUESTION, ANSWERED (owner 22.09: *"chodziło mi o podzielenie drzwi"*)
- No top box work. The split door lives in EXTRAS as SPLIT DOOR (TOP
  SEGMENT) and in the door window (`SplitDoorField`); F6's probe covers why
  the window did not show it.

## F12 · THE DIVIDER: SETBACK LIKE THE SHELF, THE BORED FACE STAYS IN PRO (point 12)
Owner: *"w 2klik menu przegrody nie ma możliwości regulacji cofnięcia lub
wyrównania głębokości (jak w półkach)"*, *"która strona ma być drillowana nie
ma znaczenia dla klientów, zachowaj dla PRO."*
- Partition menu in retail: POSITION (as today), SET BACK FROM THE FRONT
  (F2's chips plus field), no `partition-drill-face`. PRO keeps the face.

## F13 · THE BAY WIDTH LABELS: THIN AND BLACK (point 13)
Owner: *"te napisy zostaw jak są; chodziło mi o napisy pomiędzy vertical
przegrodami, są teraz białe i gruba czcionka; to tylko zmień."*
- Only the hover bay-width labels (`HoverDimensions.jsx`, the
  `hoverDimensions.label` block: plate `#1c1c1a`, ink `#e8e4dc`) change: no
  plate, black ink, the light weight kept. Every other dimension label on the
  scene stays exactly as it is. Profile numbers only; the migration keeps a
  saved profile's other keys.

## F14 · FROM THE WALL, PER WARDROBE (point 14, answer 22.09: per unit, project default)
Owner, on the SIZE step: *"tutaj jeszcze brakuje odsunięcia od ściany."*
- SIZE gets a fourth field FROM THE WALL, in mm, default the project's
  `room.wallBackClearance` (10). It is the unit's own `params.wall_gap`; when
  absent, the profile number, so every saved job opens unchanged.
- The engine reads it where it reads the profile number today:
  `engine/runs.js` (`atWall`, the stop at the wall), `endPanelAuto.js`, the
  scene's placement, the T71 plans and sections (`setPlan`, `setSection`,
  `setElevation` read `profile.room.wallBackClearance`; they read the unit's
  gap instead, through one helper `wallGapOf(unit, profile)` in `runs.js`).
  Two units of different depth with the same gap have their backs on one
  line and their fronts not; the client who wants flush fronts types a bigger
  gap on the shallower one.

## TESTS AND PROOF
Full suite; goldens x6; parens 14/14; the T59 freeze with tonight's licences;
the T71 set still green on the Herbal Hill fixture. New `test/turn72-*.test.js`
per F: the probe tables as assertions (F1, F4, F6, F7), the two chips write
the old paths (F1, F2), the count shelf becomes an item on edit (F2), the
spacing chip moves only the selected shelf and CENTER ALL spreads evenly
(F3), the J run is a number within the engine's bounds (F4), the panel leaves
on add (F5), all three door blocks render for a wardrobe door (F6), the run
takes the neighbour's cornice (F8), the drawer menu's four sections are gone
and the button lands on the INSIDE row (F9), felt has four colours and the
glass halves the light (F9), the material row obeys the count (F10), the
divider has no bored-face row in retail (F12), the bay label has no plate
(F13), `wall_gap` reaches runs, panels, plans and sections (F14). Frames
`verify/t72/fNN-*.png` per F, before and after where a probe convicted.

## PR BODY
The probe tables verbatim; per F files and lines; the EXEMPT entries added;
the retail divergences by file and line; "how many paths add a drawer (one),
how many write a shelf position (one)"; the six goldens; the count of
tests.
