# CLAUDE.md, TURN 74 · THE OWNER'S LIST OF 23.09 AND TWO T73 RETESTS

Run autonomously. Zero questions, zero stops: every decision below is the
owner's own (23.09.2026), so nothing here is asked again. If a point cannot be
done, skip it, write why in the PR, and go on to the next. Full suite, never
`--silent`. Frames under `verify/t74/`. Branch `claude/t74-the-list`, one
commit per F, PR at the end; the owner merges. Nothing lands in Petros from
this session.

## THE ORDER
1. T73 was retested by the owner on 23.09.2026 at 16:56: everything works
   except two small things, F1 and F2 below.
2. The owner's voice conversation of 23.09.2026, saved in Petros as "Lista do
   następnej tury (T71), rozmowa głosowa" (the T71 in that title is a slip:
   T71 is the drawing set, done; the list is THIS turn). Every point applies
   to PRO and to RETAIL both, unless it says otherwise.

## LAWS
**Diagnose before you cut.** Every BUG below (F4, F8, F10, F12, F13) begins
with a committed PROBE: the fact found, in one table, before any fix.
**Test the way the client clicks.** `scripts/t74-walk.mjs` uses a REAL mouse
(`page.mouse.click` / `page.mouse.dblclick` / drags at the piece's projected
screen point through `window.__cc.views`) and adds pieces through the REAL
buttons. Never `selectElement` or a store call standing in for a click: T72's
walk did that and hid two faults the owner then found by hand.
**One law, one path**: a fix joins the existing path, never a second one.
**1:1 = COPY**: a PRO surface edited is re-copied to its retail copy by the
copy script (`scripts/t72-copy.mjs` pattern), never by hand.
**Numbers do not enter the UI without the owner's order**: every field below
is his order, and no other field appears. **No em or en dash** in anything
written: code comments, commit titles and the PR included. **Room refuses
first**: nothing is clipped silently. **Left adds, right edits.**

## FROZEN
1. Goldens x6 byte-identical (`scripts/t64-classify.mjs dump()` against
   `verify/t70/goldens-base.json`). Slopes, shoe drawers, wall units in a
   wardrobe run and corners are not in the six; `scripts/t74-classify.mjs`
   (T72's pattern) names every engine delta and proves no golden can reach it.
2. LISP untouched. `engine/drawings/**` read-only unless a point below needs
   the drawing to show what the engine now cuts (then licensed in the
   classifier).
3. PRO freeze (`test/turn59-f1-the-switch.test.js`): every PRO file edited is
   licensed in `EXEMPT` with the owner's words from this file and re-frozen at
   its new hash in the same commit.
4. The suite is green at the start (5805 of 5805) and green at the end.

## F1 · THE SIDE ASKS: ANY WARDROBE, A SMALL MODAL AT THE CLICK (T73 F2 retest)
Owner, 23.09.2026: *"po naciśnięciu na bok szafy jak nie ma panelu powinno się
pokazać to pytanie, a nie pierwsza czy druga szafa, po prostu po naciśnięciu
boku szafy, a jak nic nie naciśniesz i klikniesz na coś innego to znika mały
modal jak wymiary lub j pull hands."*
- Today (T73 F2): `adapter.sideAskFor` asks only when the side has no end
  panel AND no flush neighbour covers it, and the question is DOCKED on the
  right (`src/retail/design/detail/AddPanelAsk.jsx`, dock chips `add-panel`).
- Change 1: ANY wardrobe side (`BUL` / `BUR`) of ANY wardrobe in the room with
  NO end panel on it asks. The flush-neighbour exclusion goes. Top boxes stay
  out.
- Change 2: the question is a SMALL ANCHORED MODAL at the click point, the
  same kind of window the dimension label opens (`detail/UnitSizeModal.jsx`,
  `is('unit-size')` in `src/retail/design/Editors.jsx`) and the J-pull run
  window: title `ADD END PANEL?`, buttons `YES` | `NO`. A click anywhere else
  closes it and adds nothing. The right-hand panel does not open for this
  click.
- YES is `addEndPanelByHand` (the EXTRAS road: the client's own panel, the
  automat never takes it back off), then the panel's own docked menu opens
  (T72 F1). When the store refuses (no room, e.g. between two flush
  wardrobes), its own sentence shows inside the modal.
- Amend the T73 F2 tests and the T60 / T66 amendments that name the dock.
  Walk: a real click on a bare side of wardrobe 1 and of wardrobe 2, the modal
  stands near the pointer; a click elsewhere, it is gone.

## F2 · FELT: WINE RED, NOT A LOUD RED (T73 F6 retest)
Owner: *"red raczej zrób kolor wine red, nie krzykliwa czerwień."*
- `engine/watchDrawer.js WATCH_FELT_COLOURS`: the entry keeps its id `red`
  (saved jobs open unchanged), its label becomes `Wine red`, its hex a wine
  (start at `#722F37`; the frame of the open tray in the room light must read
  as wine, not as red: darken if it does not). The BOM line reads "Wine red
  felt base". Both `WatchLayoutModal` copies read the list, so the chip
  follows. Amend the T72 F9 and T73 F6 tests that name the label.

## F3 · SETUP ROOM: THE WALL LENGTH FIELD OPENS FOCUSED, ITS NUMBER SELECTED (list 1)
Owner: *"Po kliknięciu długości ściany pole na karteczce od razu ma focus i całą
wartość zaznaczoną (np. 3437, piszę 3500 bez myszki). Enter potwierdza to, co
narysowane myszką; Escape anuluje."*
- `src/components/DrawRoomModal.jsx` and its retail copy
  (`src/retail/design/room/DrawRoomModal.jsx`, by the copy script): the wall
  length field on the label opens with the focus and the whole number
  selected. Typing replaces it; Enter commits the typed number, or with
  nothing typed confirms the length drawn with the mouse; Escape cancels.
- The same pattern as T73 F3 (`src/3d/SpacingChain.jsx`: a ref, `focus()` then
  `select()`), not a second one.

## F4 · SETUP ROOM: A NEW ROOM REPLACES THE OLD ONE (list 2, bug)
Owner: *"Przy tworzeniu nowego pokoju po starym jeden nachodzi na drugi
zamiast resetu."*
- PROBE first, real mouse: draw a room, then start a new room and draw it.
  Record what the store holds (corners, walls, openings, boxes, slopes) and
  what the scene draws, before and after. Commit the table.
- Fix: starting a new room clears the old room's geometry (walls, openings,
  boxes, slopes) before the new one is drawn, in PRO and in retail. Cabinets
  are NOT deleted by this fix; if one stands outside the new room, the checks
  that exist today say so.

## F5 · SETUP ROOM "3 WALLS" IS A U: FRONT, RIGHT AND LEFT (list 12)
Owner: *"SETUP ROOM THREE WALLS daje ścianę przednią, prawą i ścianę za kamerą;
ma być przednia, prawa i LEWA (kształt U). Logika trybu zostaje."*
- The preset is `{ id: 'three', label: '3 walls' }` in
  `src/components/RoomModal.jsx`; the geometry is the `'three'` block in
  `engine/room.js` (around line 300). The third wall is the LEFT one, and the
  open side of the U faces the camera. Everything else about the mode stays.
  Retail copy by the copy script.

## F6 · THE SECOND SHOE DRAWER: SET BY ITS MOUNTING HEIGHT (list 5)
Owner: *"DRUGA SZUFLADA NA BUTY (niskie i wysokie buty). Regulacja = WYSOKOŚĆ
MONTAŻU, nie wysokość szuflady. Pierwsza szuflada ZAWSZE na dnie (ustalone,
bez zmian). Druga przesuwana góra/dół, program pokazuje odległość między
szufladami."*
- PROBE how one shoe drawer is built today (item `variant: 'shoe'`,
  `engine/cabinet.js` around 2139, 4108 and 7747 `shoe_drawer`) before a
  second one is allowed.
- A second shoe drawer may be added to the same bay. The first stays on the
  bottom, unchanged. The second moves up and down by its MOUNTING HEIGHT (drag
  and the T73 F3 clickable dimension, one clamp for both); its own height is
  not a control. The scene shows the distance between the two drawers as a
  dimension while the second is selected.

## F7 · ADD WALL UNIT, FOR WARDROBES (list 7)
Owner: *"ADD WALL UNIT (typ wallUnit): szafki wiszące w szafach (np. szafa L i P
plus ciąg szafek nad łóżkiem; floating biurko). Osobny typ, NIE przełącznik
przy szafie. Identyczny typ jak górka kuchenna, kopiować 1:1 z kuchni: bez nóg,
zawieszka, wycięcia w plecach, panel maskujący pod spodem. Domyślnie: góra
równo z szafą, głębokość = głębokość szafy. Zmiana przez klik w wymiar
(szer/wys/głęb), głębokość wyrównana do tyłu albo do frontu. Bok szafy przy
wall unit ZOSTAJE (to nie szafa do szafy, reguła znikającego panelu nie
działa)."*
- A new type in `engine/types.js`, copied 1:1 from the kitchen wall unit `WUD`
  (line 253): no legs, the hanging rail, the back cut-outs, the bottom masking
  panel. Its own family so a wardrobe run can hold it; not a switch on the
  wardrobe.
- Added where adding lives: retail EXTRAS, a button `ADD WALL UNIT` beside
  `ADD ANOTHER WARDROBE`, and the PRO library's wardrobe category. Placed
  beside the selected wardrobe on its wall; its top level with that
  wardrobe's top; its depth that wardrobe's depth.
- Width, height and depth change by clicking their dimension (the T73 F3
  field). Depth has one more choice: aligned to the BACK or to the FRONT.
- The wardrobe's side next to a wall unit KEEPS its panel: the vanishing panel
  law (T72 F5, T73 F5) is wardrobe to wardrobe only. Test both ways.

## F8 · BUG: THE SLOPED SHOE DRAWER BOTTOM STAYS BEHIND (list 6)
Owner: *"skośne dno szuflady na buty zostaje w szafie przy otwieraniu, nie
wysuwa się z szufladą."*
- PROBE: which mesh is the sloped bottom, and why it is not in the moving
  group of its drawer (`engine/drawerMotion.js`, `engine/covers.js`, the
  moving panels in `src/3d/UnitView.jsx`). Fix: it travels with its drawer,
  open and shut.

## F9 · THE DIVIDER UNDER A SLOPE IS CUT TO IT (list 8, bug)
Owner: *"divider przy skosie nie skraca się i nie ma cięcia pod kątem. Ma
pokazywać najdłuższą krawędź plus kąt cięcia."*
- PROBE: a wardrobe under a slope with a divider; record the divider's box,
  outline and cut list line against the side's (T47) and the end panel's (T50
  F5), which ARE cut to the slope.
- Fix: the divider (the `VPART` branch in `engine/cabinet.js`, around 3700)
  takes the same slope treatment: shortened to the slope and cut at its
  angle. The cut list shows its LONGEST edge and the cut angle, the way the
  side's line does.

## F10 · HINGES ON A SLOPE: 150 MM FROM THE APEX (list 9)
Owner: *"ZAWIASY NA SKOSIE: minimum 150 mm od wierzchołka trójkąta skosu
(inaczej nie da się wkręcić śrubokrętem). Przeliczanie zawiasów na skosach
inaczej."*
- A door cut by a slope (T46): no hinge closer than 150 mm to the apex of the
  slope's triangle on the hinge edge. The 150 is the owner's number and lives
  in the profile beside the hinge numbers, not in code. Hinge positions on a
  sloped door are recomputed against it; a door too short on its hinge edge
  for its hinges is refused in words (Check), never squashed.

## F11 · BUG IN THE CORNER: PULLING AWAY UNDOES WHAT PUSHING IN DID (list 10)
Owner: *"dosunięcie szafy do ściany narożnej zmienia orientację drzwi i dokłada
panel (perfekcyjnie), ale po odsunięciu nic nie wraca: drzwi nie wracają na
oryginalną stronę, panel/divider nie znika. Brak odwrócenia operacji."*
- PROBE, real mouse drag: push a wardrobe into a corner; record the hinge
  sides, what was added and by which law; pull it away; record again.
- Fix: the corner rule is reversible. Leaving the corner restores the hinge
  sides it changed and removes what it added. Only what the AUTOMAT did is
  undone: anything the client chose by hand stays.

## F12 · THE J-PULL IS SEEN, ALWAYS, AND HAS A SHADOW (T73 F4, carried over)
Owner: *"na 3D nie widać J-pulla w ogóle; czasami się pojawia, ale nie wiem co
powoduje, że czasami widać, czasami nie; pasowałoby, żeby miał cień, bo teraz
nie ma i nic nie widać."*
- Known (`verify/t72/f4-probe.md`): the J is a groove machined into the door
  solid (40 mm across, 500 mm up, 10 mm deep), the door's own material, not a
  separate mesh.
- PROBE, real mouse, frames from the room camera: doors shut, open and shut
  again, orbit, a colour change, a width change, a page reload. Find the
  condition under which the groove vanishes. Commit the table, fix what it
  convicts.
- The groove must read at the room camera: its faces take the scene's
  shadows, and where the room light cannot show a 10 mm step, the slot's
  inner face is shaded darker by a profile number
  (`appearance.jpull.grooveShade`). Frames before and after.

## F13 · THE FREE PANEL, "INSERT PANEL" (list 3), LAST IN THE ORDER
Owner: *"SWOBODNY PANEL (wstaw panel). Użytkownik wstawia panel, ustawia
pion/poziom/każdą orientację, długość, grubość. Przyciąganie (snap) jako
PROPOZYCJA, nie na siłę, zawsze do odrzucenia. Przesuwanie przez kliknięcie w
wymiar. Z paneli można złożyć własną figurę (np. box). Dwuklik = wejście w
edycję jak w PRO (wycięcie łuku itp.)."*
- A free-standing panel element in the room, PRO and retail: orientation
  (vertical, horizontal, or any angle), its two face sizes and its thickness.
  Snap is a PROPOSAL (the magnet line shows, and the drop can refuse it with
  one gesture), never forced. Moved by clicking its dimension (T73 F3 field).
  Several free panels make a shape of the client's own (a box). 2klik opens
  PRO's own piece editing (the arc cut and the rest), copied, not rewritten.
- It is cut like any board (cut list, BOM, CNC). This is the largest point;
  if time runs short, it is the one left for the next turn, and the PR says
  so.

## NOT THIS TURN (named so nobody builds it)
- List 4, the corner cut-out in the carcass: *"Szczegóły do dogadania
  później."*
- List 11, the L-shaped corner wardrobe: *"do porządnego zaprojektowania."*
- List 13, rounded corners and bent fronts; the www patterns: backlog.
- Rejected by the owner: the plinth drawer.
- Waiting on the owner's answer (asked 23.09): what the shelf menu HEIGHT
  field should measure, and what "does not stop at FIX shelves" means for a
  divider (T73 retest, point 12). Neither is touched.

## TESTS AND PROOF
Full suite; goldens x6; the T59 freeze with tonight's licences; the T71 set
green on the Herbal Hill fixture. New `test/turn74-*.test.js` per F, the probe
tables as assertions. `scripts/t74-walk.mjs` with REAL mouse clicks and drags
for F1, F3, F4, F5, F6, F7, F8, F11, F12, F13; frames `verify/t74/fNN-*.png`;
output `verify/t74/walk.txt`.

## PR BODY
The probe tables verbatim; per F the files and lines; the EXEMPT entries
added; the retail divergences by file and line; the six goldens; the count of
tests; the walk result; what was skipped and why.
