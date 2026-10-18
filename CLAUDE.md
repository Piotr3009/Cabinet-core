# CLAUDE.md, TURN 79 · THE OWNER'S LIST OF 18.10: MESSAGES, BAYS, DRAWER COLUMNS, THE NOTCH GROWS, RECESS LOGIC, CABINEO ON THE BOX

Run autonomously. Zero questions, zero stops: every decision below is the
owner's own (18.10.2026, a list dictated at 14:06, reviewed point by point
at 14:17, 14:45 and 14:51; his words are quoted where they decide), so
nothing here is asked again. If a point cannot be done, skip it WHOLE,
write why in the PR, and go on to the next. Full suite, never `--silent`.
Frames under `verify/t79/`. Branch `claude/t79-the-list-of-18-10`, one
commit per F, PR at the end; the owner merges. Nothing lands in Petros from
this session. The owner, 14:55: *"zipa do tury dla agentów włącznie z
poleceniem żeby robić automatycznie wszystko żebym nie musiał się martwić."*

The owner, asked how to run it, 14:51: *"ja bym zrobił wszystko z agentami w
Codzie."* So: agents and parallel mode ON. The central files have ONE
writer and every other agent hands that writer a patch: `engine/cabinet.js`,
`engine/profile.js`, `engine/notch.js`, `engine/extension.js`,
`engine/cabineo.js`, `engine/zones.js`, `stores/projectStore.js`,
`stores/uiStore.js`, `3d/UnitView.jsx`. Agents that do not touch those
files run in parallel from the first minute: the LISP drafts and parens,
the UI files (PRO, then retail through the copy script), the CNC and label
files, the goldens and fragments, the tests and the walk. Never two agents
in one file.

The ORDER of the parts is the order of value: PART A first, PART F last. A
part left undone is left undone whole and named in the PR.

## THE ORDER
The owner's list of 18.10, his priorities, his words where they decide:
- Messages: *"wszystkie informacje po zmianach które pokazujesz na ekranie
  proszę zrób po lewej, niech one tam znikają, można na dole po lewej zrobić
  jakby listę rozwijaną i tam historia zmian; powód: teraz wszystkie
  informacje pokazują się na środku i zasłaniają nam widok pracy."* (F1)
- A full-width shelf above a divider: *"jak dodamy fix półkę i divider pod
  spodem to nie mam możliwości dodania całkowitej półki powyżej bo kod
  dzieli mi całą szafę na bay 1 i 2, a nie mam czegoś takiego że jest bay
  nie dzielony powyżej."* Mockup approved 14:45: *"1 - tak."* (F2)
- Drawer columns: *"wstawianie szuflad w szafie działa super z diverterem
  ale muszę wstawić diverter z półką fix, a nie powinno być tak że diverter
  powinien się wstawiać sam jak wybieramy ile kolumn szuflad wstawiamy 1
  czy 2? ... wtedy półka ponad szufladami i tak jest fix."* 14:17: *"jak
  ustawiamy sobie teraz 3 szuflady internal to niech pyta czy chcesz 1 czy 2
  kolumny, coś jak baye."* Mockup approved 14:45: *"2 - tak."* (F3)
- The notch grows: *"cut the corner działa idealnie, ale możesz zrobić mi
  też poziome cut? wszystkich 4 rogów?"* and *"cut corner ucina nam tylko od
  dołu a co jeśli będziemy chcieli od góry, nie powinno być funkcji -500 na
  przykład i wtedy ucina od góry? i mała informacja o tym."* (F4, F5)
- Screw holes on the back: *"jak mamy cut the corners lub recess to nie
  rysujesz mi dziurek na śrubki 3 mm, to trzeba będzie dodać"*; 14:17:
  *"ale tylko na plecach."* (F6)
- The corner mark: *"sprawdź czy mi zmieniłeś ten corner layer do wycinania?
  ale chyba tak zrobiony już jest."* (F7, a check, no code unless it fails)
- Notch and recess together: *"dlaczego cut the corner likwiduje nam wcięcie
  do recess?"* (F8)
- The end panel: *"nie wycina mi panelu bocznego do recess a powinno."* (F9)
- Recess logic: *"jak odsunie od ściany na grubość większą niż recess to
  powinien zlikwidować recess w szafie, lub zmniejszać go odsuwaniem od
  recesu, logika."* (F10)
- The rail: *"zlikwiduj propozycję install rail with or without shelf, bez
  sensu, usuń to; a jak będziemy instalować rail to przy przesuwaniu
  zaproponuj 50 mm poniżej półki, jak jakąś wyczuje, coś jak mamy teraz
  propozycję levelowania półek jedna obok drugiej."* (F11)
- Centre between: *"centrowanie półek pomiędzy elementami, czyli mamy
  standard center i center pomiędzy elementami (nowa funkcja): naciskasz
  wycentruj pomiędzy, wybierasz dolny i górny element i wtedy wszystkie
  półki pomiędzy tymi elementami się centrują."* (F12)
- Setbacks: *"wszystkie cofnięcia zmień z 20 na 10 mm, 20 to stanowczo za
  dużo"*; 14:17: *"tylko półki i dividery, szuflady zostaw nie ruszaj."*
  (F13)
- Cabineo on the drawer box: *"jak mamy wybrane jakąkolwiek funkcję
  łączenia czy dog bones czy inne zawsze projektuj cabineo na szuflady, na
  przednich i tylnych ściankach dodawaj cabineo jeden do 100 mm, 2 powyżej
  100 mm, minimum odległość to 25 od góry i dołu"*; 14:45: *"cabineo musi
  być na frontowej i tylnej ściance, czyli nawiercanie w bokach będzie
  liczone od góry boxa bo [dół] jest inny"*; 14:51: positions from the top:
  *"tak"*; Cabineo 12: *"tak"*; tall boxes: *"przy wysokich nie rozsuwaj"*;
  the bottom: *"tak, bo jest wsuwane więc nie ma po co dodawać cabineo."*
  Mockup approved. (F14)
- Four small ones from the HANDOVER of 18.10, accepted 14:55 (*"ok daj"*):
  label colours on the entity for VCarve, the Restore sleeve rows button,
  the NL 420 runner, the 21 / 44 sheet choice. (F15 to F18)

Parked by the owner, NOT this turn: the pull-down rail (14:51: *"zostaw na
razie, będziemy gadać później o tym"*), its hinge twin and the offline LOD;
the two-leaf small door (the handover's T79 item, now T80); divider L/R in
3D; the divider sleeves +18; the second-bay shelves a/b/c/d.

## LAWS
T75's LAWS, T76's two, T77's one and T78's two hold in full: done means the
whole road (UI, construction and collisions, BOM, drawing, save and reload,
export with readiness); LISP IS LAW and "lisp najpierw" for every new cut
geometry, and a T75+ kit is amended only under a licence that quotes the
owner; the six fossil kits are untouchable, so a project-level decision
reaches the engine ONLY through `paramsForEngine()` and a bare
`computeCabinet()` matches its LISP byte for byte; diagnose before you cut
(every BUG starts with a committed PROBE table); test the way the client
clicks (real mouse); one law one path; 1:1 = COPY through
`scripts/t78-copy.mjs`; numbers in the profile, never typed into the UI
without the owner's order; material never enters material; a carcass side
never stays visible; room refuses first and never silently; left adds,
right edits; a new function ships with its visible entry; kasacja is
physical deletion, tombstones at most two lines, deletions over additions;
no em or en dash in anything written, this file included; every new source
file begins with the Skylon Development Ltd copyright header (the one every
file carries since 15.10.2026). Two laws are this turn's own:
**A vertical divider stands ON the board that crowns a drawer stack and
never passes through the boxes** (the owner, 8.9.2026, reaffirmed by the F3
mockup: the divider ends under the FIX shelf over the stacks).
**The drawer box is on Cabineo whenever the unit has a joint system at all**
(puzzle, dowels, biscuits or Cabineo): the carcass keeps its own system, the
box always takes Cabineo 12.

## FROZEN
1. Goldens: the six, T75's, T76's decoration file, T77's ornate records,
   T78's seventeen, byte-identical, proven by `scripts/t78-classify.mjs`
   (strict, no flag) with this turn's fragments `scripts/t78-classify.d/
   f34-t79-f*.mjs`, one per F that touches `src/engine` or `src/lib`. A
   golden an F moves KNOWINGLY is named in that fragment's REPINNED with the
   owner's words (F6 is the only one that may). New cut geometries get
   goldens of their own (named per F).
2. Fossil LISP untouched (the six kits and SKYLON_COMMON). T75+ LISP files
   amended only under a `LISP: { file: why }` licence in the F's fragment,
   with the owner's quote; parens test grows with every file touched.
3. PRO freeze (`test/turn59-f1-the-switch.test.js`): every PRO file edited
   is licensed in `EXEMPT` with the owner's words from this file and
   re-frozen at its final hash in the same commit.
4. Lighting untouched. `engine/ledStrips.js`, `engine/lighting.js`,
   `engine/lightRig.js`, the light panels: not one line.
5. Biscuit numbers untouched; the dowel numbers untouched; the carcass
   Cabineo table (D.2, D.2b) untouched: the box gets its OWN table.
6. Drawers untouched by F13: `drawers.setback 50`, `fillerFrontOffset 40`,
   the drawer cap board's depth, the runner drilling, byte for byte.
7. The pull-down rail, `3d/hardwareLod.js`, `3d/glbSource.js`,
   `3d/frameDemand.jsx`, `3d/coneroModels.js`: not one line (parked).
8. The suite is green at the start (record the count: 6772 on 18.10, one
   known regex case may show red on a long-sha clone; it is not yours) and
   at the end.

## PART A · THE SCREEN (F1, F2, F12)

### F1 · MESSAGES GO TO THE LEFT, AND KEEP A HISTORY
- Owner: *"po lewej, niech one tam znikają; na dole po lewej lista
  rozwijana i tam historia zmian."*
- Today (`components/Messages.jsx:119-127`): grey messages (`info`, `ok`,
  which is nearly every `notify`) stand at `top-1/2 left-1/2`, over the
  room; red and yellow at `bottom-6 left-1/2`. No history: a message leaves
  the array on expiry or dismiss (`stores/uiStore.js:1031-1074`,
  `engine/messages.js` LEVELS 38-65).
- Fix, placement: ONE bottom-left column for every level, in
  `ConfiguratorPage.jsx` (mounted at 729 today) and `App.jsx:143`: from the
  bottom up, the history bar, then the messages (red above yellow above
  grey, newest nearest the bar), then `FrontGapWarnings` (today
  `left-3 bottom-3`, `FrontGapWarnings.jsx:62`), so nothing of the three
  covers another. Width `max-w-[26rem]`, `LAYER_CLASS.message` as today.
  `engine/messages.js` LEVELS: `place: 'left'` for all three; the centre
  and bottom-centre blocks of `Messages.jsx` are deleted (kasacja), not
  hidden. Timing unchanged: grey leaves after `profile.ui.messages.greyMs`
  (3000), yellow on click-away, red on click.
- Fix, history: `uiStore.history` keeps the last `profile.ui.messages
  .historyMax` (50, new number) messages as `{id, message, level, at}`,
  pushed when a message is first shown (a folded `N × msg` is one row,
  updated in place). The history bar: a one-line `cc-panel` at the very
  bottom-left, `Changes · 12 ▴`, click toggles a `cc-scroll` list (newest
  first, time `HH:MM`, the level's colour dot, the text) with a `Clear`
  button; collapsed by default; not persisted. Keyboard: Escape collapses.
- Retail: untouched (it mounts no `Messages`; it reads the last word
  inline, `retail/design/adapter.js:2339-2349`).
- EXEMPT: `Messages.jsx`, `ConfiguratorPage.jsx`, `App.jsx` with the
  owner's words above. Test `test/turn79-f01-messages-left.test.js`: the
  three levels place left; a 51st entry drops the oldest; the centre block
  is gone from the source. Walk: add a shelf, frame the message at the
  bottom-left; open the history, frame it.

### F2 · A FULL-WIDTH SHELF ABOVE THE DIVIDER (the third button)
- Owner: *"nie mam czegoś takiego że jest bay nie dzielony powyżej."*
  Mockup `verify/t79/mockup-02-full-width-shelf-above-divider.png` (shipped
  with this spec), approved.
- Today: the divider already ends under the lowest FIX shelf above its
  floor (`engine/zones.js partitionSpan 201-242`, `cabinet.js:4896-4905`,
  `meta.terminatesOn` at 4976); the engine already knows a full-width shelf
  (`item.zone == null`, `cabinet.js:4583`). Only the picker is missing:
  `components/AddItems.jsx:764-808` offers `Bay 1 · N` and `Bay 2 · N` and
  nothing else once a partition exists.
- Fix, UI: a third button `Above divider · <light>` after the bays, shown
  only when the divider's span ends below the top (span.to + G < ceiling);
  hovering it highlights the opening above the carrying FIX shelf on the
  canvas the way the bays are highlighted (`onZoneHover` with a sentinel
  `'above'` that `UnitView` draws as the full-width band from span.to + G to
  the top underside); the count field and Add work as for a bay.
- Fix, store: `addShelves(unitId, count, zone)` accepts `zone: 'above'`:
  the shelves are `zone: null` (full width) and are CENTRED in the opening
  above the divider top by `evenShelfPositions({zoneBottom: span.to + G,
  zoneTop: ceiling, count, boardT})`, never below span.to. A full-width
  shelf asked for below the divider top is refused in words
  (`notify(..., 'warn')`: "A full-width shelf cannot cross the divider;
  pick a bay or raise it above the divider."), never clipped.
- Engine: not one line. Goldens: identical by construction.
- Retail: `retail/design/detail/AddItems.jsx` through the copy script.
- EXEMPT: `AddItems.jsx` (PRO). Test `test/turn79-f02-above-divider.test.js`:
  a 1200 wardrobe, FIX shelf at 1000, divider below: `addShelves(..., 2,
  'above')` gives two `zone: null` shelves between 1018 and the top, equal
  gaps; asked at 500 it refuses with the sentence above. Walk: the three
  buttons framed; the shelf added; `verify/t79/f02-above.png`.

### F12 · CENTRE BETWEEN TWO ELEMENTS
- Owner: *"naciskasz wycentruj pomiędzy, wybierasz dolny i górny element i
  wtedy wszystkie półki pomiędzy tymi elementami się centrują."*
- Today: `Center all` (`components/ElementProperties.jsx:1243-1253`,
  `centreShelves(unitId, bayRef)` at `projectStore.js:8781`,
  `redistributeShelvesInBay` 8789 with `evenShelfPositions`) spreads every
  adjustable shelf of a bay between its floor and its ceiling; pinned (FIX,
  carrying) shelves are boundaries.
- Fix: a second button `Center between` beside `Center all`, same width,
  shown with it. Click 1 arms a two-pick mode in `uiStore`
  (`centreBetween: {unitId, lower: null, upper: null}`); the panel says
  `Pick the lower element`, then `Pick the upper element`; a pick is a
  click on a shelf (any), the drawer cap PARTITION, the rail partitioner,
  the BOTTOM or the TOP of the same unit (the existing `selectElement`,
  `uiStore.js:819`, with the mode reading the two picks in order); Escape
  or a click elsewhere cancels. On the second pick the store runs
  `centreShelvesBetween(unitId, lowerRef, upperRef)`: the adjustable
  shelves of the SAME bay whose `pos_mm` lies between the lower's top face
  and the upper's underside are spread by `evenShelfPositions` between
  those two faces; FIX shelves inside the span are refused in words ("A
  fixed shelf stands between your picks; centring stops at it."), two picks
  in different bays are refused in words, fewer than one shelf between is
  refused in words. `mmStep` snap and `reclampShelves` as `Center all`.
- Retail: `retail/design/detail/ElementProperties.jsx` through the copy
  script; the two-pick mode lives in the shared `uiStore`.
- EXEMPT: `ElementProperties.jsx`, `UnitView.jsx` (the pick highlight).
  Test `test/turn79-f12-centre-between.test.js`: three shelves between a
  FIX shelf at 600 and the top: picks (FIX, TOP) give equal gaps; picks in
  two bays refuse. Walk: the two picks framed, `verify/t79/f12-between.png`.

## PART B · DRAWER COLUMNS (F3)

### F3 · INTERNAL DRAWERS: 1 OR 2 COLUMNS, THE DIVIDER AND THE CAP COME BY THEMSELVES
- Owner: *"niech pyta czy chcesz 1 czy 2 kolumny, coś jak baye."* Mockup
  `verify/t79/mockup-03-drawer-columns.png`, approved: divider mid-width, a stack in
  each column, ONE FIX board over both stacks, the divider from the base to
  that board's underside.
- PROBE, committed first, `verify/t79/f03-probe.md` (the chat probe of
  18.10 re-run): WARDROBE 1200, partition at x_mm 591, 2 drawers with
  `zone: null`: the engine builds the full-width stack (PARTITION x18..1182
  at y426, boxes x71..1129 THROUGH the divider) and VPART-1 from y18 to the
  top, through the boxes and through the PARTITION board, with no warning
  (`cabinet.js:795-796` zone-null drawers never become column drawers;
  `partitionFloor` at 4884 knows only the overlay stack; `partitionSpan`
  cannot end on the PARTITION board because it is not a shelf item). That
  is the owner's *"program nie bierze pod uwagę że to jest diverted."*
- Fix, engine (the law above): a vertical partition standing in a unit
  with a full-width internal stack has its floor at `partitionY + G` (the
  top face of the stack's PARTITION board), never at G: `partitionFloor`
  reads `drawerZone.top + G` when a zone-null stack exists; the span then
  runs from there to the lowest FIX shelf above or the top. The PARTITION
  board stays full width. Material never enters material.
- Fix, engine, two columns: when every zone of the unit carries a stack
  (every bay has column drawers), the cap over them is ONE full-width FIX
  board `PARTITION` (x G, w internalWidth) at `max(partY)` of the columns
  (today `Z{k+1}-PART` per zone, `cabinet.js:5474-5484`, one board per bay
  and nothing over an empty bay: keep that for a lone column); the divider
  between the columns runs from the base to that board's underside
  (`terminatesOn: 'PARTITION'`), its biscuit set and screws by the 1710d
  law (biscuits only on the FIX board). Stacks of unequal height: ONE cap
  at the taller stack, the shorter stack's headroom stays open (the
  owner's mockup shows one board, never two). Column rails unchanged.
- Fix, store: `addDrawers(unitId, count, mount, heightMm, zone, variant,
  {columns})`: with `columns: 2` on a unit with no partition, add one
  partition at `W / 2` (left face at `(W - G) / 2`, `addPartition` 8306),
  then the stack in zone 0 and the same stack in zone 1, in ONE history
  batch (one undo). `columns: 1` is today. A unit that already has a
  partition keeps today's "Which bay" picker (the columns choice is not
  shown). The divider added this way is an ordinary partition afterwards
  (draggable, deletable; deleting it leaves two column stacks, which the
  engine already handles).
- Fix, UI: `components/AddItems.jsx` drawers block, internal mount only:
  `COLUMNS` with `1` and `2` beside `HOW MANY`, shown when the unit has no
  partition yet; the hint under it: "2 columns: a divider mid-width, a
  stack in each column, one fixed shelf over both." Retail through the copy
  script.
- LISP: none (no new cut geometry; the cap and the partition are existing
  parts).
- Goldens: the six and T75/T78 identical by construction (no fixture has a
  partition with drawers, and the two-column cap only exists where every
  bay carries a stack); the classifier fragment `f34-t79-f03.mjs` names the
  gate `columns` (opens when a unit has a partition AND drawers) and proves
  no golden opens it. New golden `golden-drawer-columns.json`: WARDROBE
  1200, `columns: 2`, 3 drawers each.
- EXEMPT: `AddItems.jsx`. Tests `test/turn79-f03-drawer-columns.test.js`:
  the probe table as assertions (the divider floor is the cap's top face;
  the cap is one board x18..1182; VPART from the cap to the top); the store
  adds partition + two stacks in one batch; a unit with a partition shows no
  columns choice. Walk, real mouse: 3 internal drawers, columns 2, frames
  `verify/t79/f03-columns.png`, `f03-cnc.png`.

## PART C · THE NOTCH GROWS (F4, F5, F6, F7, F8, F9, F10)

The notch is `engine/notch.js`, the mirror of `reference/lisp/KIT_NOTCH.lsp`
(T75 F7; `params.notch = {corner, w, d, h}`, `h 0` = full height, read at
`notchOf` 820-834; cut boards at `notchCarcass` 1100-1356; PRO window
`components/RightPanel.jsx NotchWindow 1955-2025`; retail
`retail/design/Options.jsx:346-380`, `adapter.js:4681-4736`). The recess is
`engine/extension.js`, the mirror of `KIT_RECESS.lsp` (15.10; the band from
`lib/wallElements.js`, derived by `recessExtensionFor`
`projectStore.js:978-1011`, injected at 1034 and 1041; wholly inside:
`settleRecesses` 3242-3263, `params.recess_mm`). Both are T75+ files: LISP
first, amended under licence with the owner's words, parens tested.

### F4 · THE NOTCH FROM THE TOP (a negative height)
- Owner: *"nie powinno być funkcji -500 na przykład i wtedy ucina od góry? i
  mała informacja o tym."*
- Today: bottom only, by construction: `notchSideFc` (393-396) and
  `notchBackFc` (458) return `x0y0` / `x1y0`; `notchHh` (95) measures up
  from the underside; the LID needs room under the TOP (refusal 758-760).
- LISP first, `KIT_NOTCH.lsp`: D21 THE TOP-ANCHORED NOTCH: `h < 0` means
  the cut starts at the TOP and runs down `|h|`; the side's corner is
  `x0y1` / `x1y1`; the TOP is cut instead of the BOTTOM; the box boards are
  the same three (RETURN, STEP, and the closing board is a FLOOR under the
  cut instead of a LID over it); the BACK, at a back corner, loses its top
  part of the notched edge; `h 0` stays full height; `|h|` must leave
  `minInteriorMm` under the cut as it must leave it above today. NUMBERS
  block for BUD 600, notch BL w 200 d 200 h -300, board by board.
- Engine mirror: `notchOf` accepts negative h (`anchor: 'top'`);
  `notchSideFc` / `notchBackFc` / `notchHh` / the LID-or-FLOOR board follow
  D21; shelves crossed by a top notch are cut as those crossed by a bottom
  one; `notchDrills` re-origins a full-height side as today and a top notch
  as the mirror of the bottom case. 3D (`panelSolid.js cutNotchCorner`)
  takes the corner from `cnc.notch.fc`; nothing else there.
- UI, the small information: `NotchWindow` HEIGHT field accepts a negative
  number; the help line reads "WIDTH along the back, DEPTH into the
  carcass, HEIGHT from the floor; 0 runs top to bottom; a negative HEIGHT
  cuts from the top (e.g. -500)." Retail `NotchAsk.jsx` the same line,
  through the copy script where it is a copy, by hand where it is not (name
  it in the PR).
- Golden `golden-notch-top.json` (BUD 600, BL 200/200/-300). The six and
  `golden-notch.json` identical: the gate `notchTop` opens only on h < 0.
- Tests `test/turn79-f04-notch-top.test.js`: the LISP NUMBERS block held
  board by board; the refusal below `minInteriorMm`; the help text present
  in PRO and retail. Walk: a BUD with -300, frames 3D and CNC.

### F5 · THE HORIZONTAL NOTCH: ALL FOUR EDGES OF THE SIDE
- Owner: *"możesz zrobić mi też poziome cut? wszystkich 4 rogów?"* The four
  corners of the SIDE elevation: top-back, bottom-back, top-front,
  bottom-front: a rebate running the full width of the carcass along that
  edge (a skirting board at the bottom-back, a coving at the top-back, a
  bulkhead at the top-front, a plinth return at the bottom-front).
- LISP first, `KIT_NOTCH.lsp` D22 THE EDGE NOTCH: `params.edgeNotch =
  {edge: 'TB' | 'BB' | 'TF' | 'BF', d, h}` (d into the depth, h into the
  height), full width; BUL and BUR get the L corner `d × h` at that edge
  (the same corner-mark law of 1710h, one open L vector per inner corner,
  `engine/marks.js`); at a back edge the BACK is shorter by h (BB: from the
  bottom, TB: from the top) and the BOTTOM (BB) or the TOP (TB) is narrower
  by d at the back; at a front edge the BOTTOM / TOP is narrower by d at
  the front and the fronts are untouched (the owner said nothing of doors;
  the plinth at BF keeps its own law); no closing boards (the rebate is
  open to the wall or the floor); `minInteriorMm` applies to what is left.
  NUMBERS block for BUD 600 BB d 20 h 120 and TB d 50 h 100.
- Engine mirror `engine/notch.js` section for D22 (`edgeNotchOf`,
  `edgeNotchCarcass`, `edgeNotchDrills`: the dia 3 rows and the puzzle on a
  shortened edge follow the shortened edge, as the corner notch does);
  a corner notch and an edge notch on the same side may coexist when their
  rectangles do not overlap, otherwise refused in words.
- UI: in `NotchRow` a second button `CUT EDGE` opening `EdgeNotchWindow`
  (EDGE with the four, DEPTH, HEIGHT, the help line "A rebate along the
  whole edge: skirting at the bottom-back, coving at the top-back."); the
  3D picker highlights the four horizontal edges of the selected unit the
  way `NotchCorners.jsx` highlights the four vertical corners. Retail the
  same through the copy script or by hand (name it).
- Goldens `golden-edge-notch-bb.json`, `golden-edge-notch-tb.json`. The six
  identical: the gate `edgeNotch` opens only on `params.edgeNotch`.
- Tests `test/turn79-f05-edge-notch.test.js`: NUMBERS held; the corner mark
  is one open L per inner corner; coexistence and refusal. Walk: BB and TB
  framed in 3D and CNC.

### F6 · THE DIA 3 ROWS ON THE BACK ARE NOT LOST TO A NOTCH OR A RECESS
- Owner: *"nie rysujesz mi dziurek na śrubki 3 mm, to trzeba będzie
  dodać; ale tylko na plecach."*
- PROBE (the chat probe of 18.10, commit it as `verify/t79/f06-probe.md`):
  with notch BL full the BACK has 10 holes instead of 14 (the column on the
  notched edge dropped by `notchBackJoints` D10, `notch.js:507-518`); with
  the recess the rows around the window / beside the band are dropped by
  `recessBackJoints` D17 (`extension.js:371-379`). BUL / BUR keep 6 / 6.
  Those removals were the owner's 17.10 word ("nie będziemy tam wkręcać
  wkrętów") and are REVERSED today by his later word: the rows are wanted.
- LISP first: `KIT_NOTCH.lsp` D10 and `KIT_RECESS.lsp` D17 amended under
  licence with today's quote: the dia 3 rows on the BACK follow EVERY edge
  of the BACK that meets a board: the carcass sides, top and bottom as
  today, and now the notch's RETURN board along the notched edge (above the
  notch for a part-height notch, the whole new edge for a full one) and the
  recess boards (RETURN-L / RETURN-R / FLOOR / LID / EXT-BACK) along the
  window's edges and the band's edges; the row's pitch and end offsets as
  the kit's own; a run shorter than two pitches gets two holes, shorter
  than one hole's offsets gets none and says so in the summary. BUL / BUR
  rows unchanged (6 / 6).
- Engine mirror in `notchBackJoints` and `recessBackJoints`; the holes
  reach `drills` as the others do (`cabinet.js:8718-8720`); the 3D
  `DrillRings` shows them.
- Goldens: `golden-notch.json`, `golden-recess.json`,
  `golden-recess-band.json`, `t75-wardrobe-corner.json` MOVE knowingly:
  REPINNED in `f34-t79-f06.mjs` with the quote; the six identical (no
  fossil has a notch).
- Tests: `chatfix-1710-corners-screws-shelves.test.js:239` and `:257` are
  REWRITTEN to the new law (a green test beside the old rule is a lie), and
  `test/turn79-f06-back-rows.test.js` holds the counts (BL full: 14 again,
  with the column into the RETURN; window case: rows on all four window
  edges). Walk: the BACK in CNC view with a notch, frame.

### F7 · THE CORNER MARK: A CHECK, NOT A CHANGE
- Owner: *"sprawdź czy mi zmieniłeś ten corner layer do wycinania? ale
  chyba tak zrobiony już jest."*
- The 1710h law is on main (`engine/marks.js`, one open 3-point L per
  inner corner, layer `CORNER_4MM`, aci 53, `cnc/layers.js:112`). Verify
  in the walk: export the BUD-with-notch DXF, count on `CORNER_4MM` exactly
  one open polyline of three vertices per inner corner, no closed shape;
  frame the CNC view. If it holds, the PR says "F7 verified, no change". If
  it does not, fix it to the 1710h law and say what was wrong.

### F8 · A NOTCH AND A RECESS ON THE SAME CARCASS
- Owner: *"dlaczego cut the corner likwiduje nam wcięcie do recess?"*
- PROBE (committed, `verify/t79/f08-probe.md`): `cabinet.js:1790-1793`
  refuses the extension whenever a notch exists (`extensionVerdict` →
  `recessRefusal(..., Boolean(params.notch))`, `extension.js:496`: "a
  carcass notched round an obstacle cannot grow into a recess as well; the
  notch stands", the law of `KIT_RECESS.lsp` D13), and `cabinet.js:8666`
  gates `extensionCarcass` on `!notchCut`. The refusal is SILENT: `checks.js
  :665` maps `NOTCH_REFUSED` (28) and nothing maps `EXTENSION_REFUSED`;
  `recessExtensionFor` never looks at the notch. That is the owner's
  "likwiduje".
- LISP first, `KIT_RECESS.lsp` D13 amended under licence: a notch and a
  recess coexist when their footprints on the BACK do not overlap (the
  notch's `w` along the back at its corner against the band `x0..x1`, and
  for a part-height notch its height band against `z0..z1`); then both are
  cut, each by its own routine, in the order notch then extension, and the
  BACK pieces of the extension are cut from the notched BACK (the notch
  shortens the piece at that edge). When they overlap, the extension is
  refused in words and the refusal is VISIBLE: Check gets
  `EXTENSION_REFUSED` as #32 with the sentence "The recess cannot be cut:
  the corner cut stands where the recess band is; move one of them."
- Engine mirror: `extensionVerdict` takes the notch's footprint, not
  `Boolean(notch)`; `cabinet.js:8666` runs `extensionCarcass` after
  `notchCarcass` on the already-notched boards; `checks.js` #32; `cabinet
  .js:1790` keeps the parent-with-notch behaviour for the refused case.
- Goldens: `golden-notch-and-recess.json` (BUD 600, notch BL 200/200/0,
  band 310..600, no overlap); the existing notch and recess goldens
  identical except where F6 moved them.
- Tests `test/turn79-f08-notch-and-recess.test.js`: coexistence board by
  board; overlap refuses with #32 visible; `recess-extension-1510.test.js
  :249, :412-418` rewritten to the new D13. Walk: 3D of both, frame.

### F9 · THE END PANEL FOLLOWS ITS SIDE INTO THE RECESS AND INTO THE NOTCH
- Owner: *"nie wycina mi panelu bocznego do recess a powinno."*
- PROBE (`verify/t79/f09-probe.md`): the END PANEL is always a plain
  rectangle (`cabinet.js:7051 rectGeometry(endPanelDepth, epH)`; depth at
  6970 `wallGap + insetBack + D + gap + frontT`); `extensionCarcass` and
  `notchCarcass` touch BUL / BUR / TOP / BOTTOM / BACK / SHELF (/ PLINTH)
  only; `recessExtensionFor` clips the band to 0..W and ignores the pads.
  Wholly inside a recess the END panel comes out about 140 short of the
  carcass depth because `wallGap` goes negative with `recess_mm` (the chat
  probe: END-R z 0 d 596 against D 708).
- Fix, one law one path: the end panel is cut by the SAME outline as the
  side it covers. Partly in the band: the END panel on a side that grows
  (BUL grows when `x0 <= 0`, BUR when `x1 >= W`, `extension.js:685`) takes
  the side's grown outline (`sideCorners` → `cnc.notch` + `also`, 628-634)
  with the pad's own x added to the band's test (the band is tested
  against `-padL..W+padR`, not `0..W`); notched: the END panel on the
  notched side takes the side's `cnc.notch` (and the F5 edge notch). Wholly
  inside: `endPanelDepth` uses `depth_full + recess_mm` the way the carcass
  does, so the END panel reaches the recess back with the sides. Its BOM
  area and cut-list line follow the outline.
- Goldens: `golden-recess-end-panel.json` (BUD 600 + END-R, band to the
  right edge), `golden-notch-end-panel.json` (BL notch + END-L). The six
  identical (no end panel in them).
- Tests `test/turn79-f09-end-panel.test.js`: the END outline equals the
  side's outline in each case; wholly-in depth equals the carcass depth.
  Walk: 3D framed from the recess side.

### F10 · THE RECESS GIVES WAY TO THE STAND-OFF
- Owner: *"jak odsunie od ściany na grubość większą niż recess to powinien
  zlikwidować recess w szafie, lub zmniejszać go odsuwaniem od recesu."*
- Today: `recessExtensionFor` reads `e.depth` (`projectStore.js:1003`) and
  `settleRecesses` reads it at 3249; neither looks at the unit's stand-off.
  The stand-off is `backStandoff(unit, profile) = wallGapOf + inset_back_mm`
  (`collision.js:304-306`, `runs.js:57-78`, `wall_gap` else
  `room.wallBackClearance` 10, then `- recess_mm + standoff_mm`).
- Fix, store, one place: `effectiveRecessDepth(unit, element) =
  element.depth - (nominal stand-off of the unit with recess_mm taken as 0)`;
  `<= 0` means no recess for this unit (no `recess_mm`, no extension, the
  unit stands off the wall in front of the recess as any unit does);
  `> 0` means the recess is that much and both `settleRecesses` and
  `recessExtensionFor` use it. Moving the unit off the wall (wall_gap,
  retail `Options.jsx:325-342`, store clamp 6718-6733) re-settles in the
  same action, so the carcass shrinks or regains its recess as the number
  crosses the depth; `nominalOf` (828-832) unchanged.
- Engine: not one line (it receives numbers). Goldens identical.
- Tests `test/turn79-f10-recess-standoff.test.js`: depth 300, stand-off
  100 gives 200; stand-off 300 gives none; stand-off 350 gives none and no
  extension record. Walk: slide the wall_gap in retail, three frames.

## PART D · THE RAIL AND THE SETBACKS (F11, F13)

### F11 · THE RAIL IS ALONE, AND IT SNAPS 50 MM UNDER A SHELF
- Owner: *"zlikwiduj propozycję install rail with or without shelf, bez
  sensu, usuń to; przy przesuwaniu zaproponuj 50 mm poniżej półki."*
- Kasacja, physical: in `components/AddItems.jsx` the `railWithShelf` state
  (98), the two buttons `With a shelf` / `Rail alone` (868-893) and the
  `data-rail-assembly-hint` text; `addHangerRail` (`projectStore.js:~7734`)
  takes `withShelf` no more and adds the rail ALONE; in the retail adapter
  the `RAIL_MOUNTS` labels (3604-3607) and `setRailMount` (6058, its only
  caller `adapter.js:3615`) go. Deletions over additions; the PR shows the
  balance. The engine's shelf-mounted branch (`engine/railAssembly.js`
  RAIL_MOUNT, the partitioner) STAYS this turn for the projects that have
  one; its kasacja is a separate owner decision (NOT THIS TURN). A saved
  project with a shelf-mounted rail loads and renders as before.
- The magnet: the shelf magnet already exists (`engine/shelfMagnet.js`
  `magnetCandidates` 57, `applyMagnet` 113; `projectStore.js
  shelfMagnetCandidates` 10254, `moveShelf` 10308 with
  `editor.shelfMagnetMm` 10; the guide `UnitView.jsx:2357-2363, 3350-3356`).
  `moveRail` (8624) gets the same: candidates are, for every shelf of the
  rail's bay (adjustable or FIX) and the drawer cap PARTITION, the rail
  axis height `shelf underside - profile.hardware.hanger.belowShelfMm` (50,
  new number) measured the way `moveRail` measures the rail; within
  `shelfMagnetMm` the rail is caught and the DashedGuide with the mm label
  shows; Alt refuses, as free panels do (6150-6190).
- Retail: `retail/design/detail/AddItems.jsx` through the copy script;
  `RailModal.jsx` notes (`LEGACY_RAIL_NOTE`, `RAIL_ALONE_NOTE`) untouched.
- EXEMPT: `AddItems.jsx`, `UnitView.jsx`. Tests: `test/turn79-f11-rail
  .test.js` (the toggle is gone from the source; `addHangerRail` adds
  alone; `moveRail` within 10 of underside-50 lands on underside-50 and
  reports `magnet`); the T42 F1 rail tests stay green (ALONE is a branch
  they already hold). Walk: drag the rail toward a shelf, frame the guide.

### F13 · SETBACKS: SHELVES AND DIVIDERS 10 MM, DRAWERS UNTOUCHED
- Owner: *"wszystkie cofnięcia zmień z 20 na 10 mm; tylko półki i dividery,
  szuflady zostaw nie ruszaj."*
- Today: a SHELF stands back `profile.carcass.shelfDepthClearance` 20
  (`profile.js:242`, `setbackOf(item.front_mm, C.shelfDepthClearance)` at
  seven sites of `cabinet.js`); a vertical PARTITION stands back
  `interior_setback_mm` injected by the store as 20 (`projectStore.js
  :1071-1073`, the seed `partition_front_mm` 20 at 7524; the engine's own
  default is 0, `cabinet.js:2182`, so a bare kit matches its LISP). The
  SAME `partitionDepth` (2183-2184) also sets the drawer cap PARTITION
  board (4790-4794, 5475-5482) and the runner drilling (9394, 9403, 9571).
- Fix, by the fossil law (the engine's bare numbers do not move; the goldens
  stay byte-identical): `profile.carcass.shelfSetbackMm: 10` and
  `profile.carcass.dividerSetbackMm: 10` (new keys); `paramsForEngine`
  injects `shelf_front_mm: 10` and `interior_setback_mm: 10`; the engine
  reads a shelf's setback as `setbackOf(item.front_mm, params.shelf_front_mm
  ?? C.shelfDepthClearance)` (bare: 20, as the LISP), and the vertical
  divider's as `setbackOf(item.front_mm ?? params.partition_front_mm,
  interiorSetback)` as today; the drawer cap board and the runner drilling
  read their OWN `drawer_cap_setback_mm`, injected as 20 from
  `profile.wardrobe.drawers.capSetbackMm: 20` (new key, the old number), so
  every drawer board, runner hole and golden is byte for byte what it was.
  New shelves and dividers are seeded with no `front_mm` (they follow the
  profile); migration on load: a shelf or divider item whose `front_mm` is
  exactly 20 (the old seed) becomes 10 (`profile.js` migration block, as
  5816 does for the sheet), any other hand value stays and is named in the
  PR count. The fossil kits and SKYLON_COMMON untouched.
- Tests that pin 20 as the ENGINE default stay true and stay
  (`turn65-f5:100-101`, `shelves-v2`, `turn78-f20-biscuit:171`); the tests
  that pin the STORE seed move to 10 (`turn21-f7-f10-interior:120`,
  `turn32-f4-zones:48`, `element-editing:175`, `turn72-f2-the-shelf-menu
  :156,162`, `chatfix-1710-drawers-and-sleeves:87,91`), each with the quote.
  `test/turn79-f13-setbacks.test.js`: a store-built wardrobe: shelf depth
  D-G-10, divider depth D-G-10, drawer cap D-G-20, runner holes unchanged
  against the 18.10 numbers; the migration 20 → 10 on a saved project.
- Goldens: identical by construction (bare calls carry no params).
  Fragment `f34-t79-f13.mjs` names the gate `setback10` (opens on
  `shelf_front_mm` or `interior_setback_mm` present) and proves no golden
  opens it.

## PART E · CABINEO ON THE BOX (F14)

### F14 · THE DRAWER BOX IS ON CABINEO 12
- Owner: the quotes in THE ORDER; mockup `verify/t79/mockup-13-cabineo-drawer-box.png`
  approved with the correction "positions from the top of the box".
- Today: the box has NO joint between the sides and the front / back walls
  (`cabinet.js` 5082-5158 wardrobe, 5346-5400 column, 5662-5755 BUDR: the
  sides carry only the runner pocket and the bottom groove; the BUDR box
  front has two façade pilot holes at (50, 50) / (50, boxLen-50)). The
  walls sit BETWEEN the sides (x = boxLeftX + GB, w = boxFrontLen) and
  stand ON the bottom: `boxWallY = bottomY + GB`, so a wall is shorter than
  the side by `15 + GB + 1` (2585; BUDR 2815; column 5308): the owner's
  "dół jest inny". The box material is `thicknesses.box` (18, from
  `boxSideThickness`, `thickness.js:98`).
- LISP first, `SKYLON_JOINTS_CABINEO.lsp` D.2c THE DRAWER BOX, after D.2b
  (~717), mirroring `back-table` / `back-pockets` / `back-holes`: four
  joints per box, SL-BF, SR-BF, SL-BB, SR-BB; the POCKET in the wall
  (BOX-FRONT, BOX-BACK) at each end, on the wall's OUTSIDE face (hidden
  behind the drawer front, hidden at the back; the carcass is cut from
  outside too); the dia 5 hole in the SIDE's inside face; always Cabineo 12
  on the box (the owner: *"tak"*; the sheet: counterpart >= 13, connector
  board >= 12, both met by 18); the set-out measured FROM THE TOP EDGE of
  the box: wall height `hw` <= 100 gives ONE connector per joint at
  `hw / 2` from the wall's top; `hw` > 100 gives TWO, at 25 from the wall's
  top and at 25 above the wall's bottom edge (never spread for tall walls:
  *"przy wysokich nie rozsuwaj"*); the side's holes at the same heights
  measured from the SIDE's top edge (the walls' and the sides' tops are
  flush: `boxWallY + hw = boxY + sideH`, assert it in NUMBERS); 25 is a
  minimum and a position both, the sheet's `edgeMin` 20 is met. The
  bottom: nothing (*"wsuwane"*). The BUDR's two façade pilot holes stay
  where they are; a pocket meeting a pilot hole is refused in words (the
  carcass `cabineoRefusal` grammar). NUMBERS block: BUDR default (side 237,
  wall 203: two per joint at 25 and 178 from the top) and a wardrobe box
  with wall 90 (one at 45).
- Engine mirror, `engine/cabineo.js` section Z2 (own table
  `cabineoBoxJointTable`, `cabineoBoxVerdict`, `cabineoBoxPocketsOnto`,
  `cabineoBoxDrills`, `cabineoBoxHardwareLines`), called from the three box
  builders through ONE helper (one law one path), gated on the unit having
  ANY joint system named (`jointSystemOf !== null`, `dowels.js:331`; the
  default `'puzzle'` counts as named: the owner: *"jakąkolwiek funkcję
  łączenia czy dog bones czy inne"*): the pocket records as the carcass
  ones (`cabineo_pocket` dia 15 three lobes, `cabineo_recess` skim, face
  'outside', `meta.machinedFace 'outside'` on BOX-FRONT and BOX-BACK with
  the OUTSIDE FACE UP label the DXF already honours), the hole records
  `cabineo_hole` dia 5 depth 12 on DRAWER-SIDE; BOM lines `cabineo_connector`
  counted per box (4 or 8) with the existing spec shape; `cabineoSummary`
  gains `box: {joints, pockets, holes}`. The carcass table D.2 / D.2b
  untouched. The gate `CABINEO_GATE` stays as it is for the carcass; the box
  shares its `confirmed` flag.
- 3D: the pockets and holes drawn by the existing recess / DrillRings paths
  (`recesses.js panelRecesses`, `DrillRings.jsx`) once the records exist;
  no new drawing code.
- UI: nothing to choose (the law is automatic); the part detail shows the
  pockets as it shows carcass ones.
- Goldens, the fossil law: `jointSystemOf` falls back to `'puzzle'` on a
  bare call, so a gate on "any system" would reach BUDR and BUDR4 of the
  six. The gate is therefore `params.joints_system != null`: named on the
  unit or injected by the store from the company default, which every
  project unit carries since T78 F19. A bare `computeCabinet()` names none
  and cuts no box Cabineo, the six stay byte-identical, and every project
  unit gets the box Cabineo (the owner's "jakąkolwiek funkcję łączenia"
  is met for every unit a person builds). The fragment `f34-t79-f14.mjs`
  names the gate `boxCabineo` and proves no golden opens it; new goldens
  `golden-cabineo12-budr-box.json` (BUDR with `joints_system: 'puzzle'`)
  and `golden-cabineo12-wardrobe-box.json` (WARDROBE 1200, 3 internal
  drawers, `joints_system: 'cabineo12'`).
- Tests `test/turn79-f14-box-cabineo.test.js`: the LISP NUMBERS held; one
  vs two per joint at 100; from-the-top measure; the bottom carries none;
  the BUDR pilot holes untouched; BOM counts; `turn78-f20-cabineo-lisp
  .test.js` extended to section D.2c and its H block. Walk: a BUDR CNC
  view with the box pockets, the part detail of BOX-BACK, frames.

## PART F · THE SMALL ONES FROM THE HANDOVER (F15 to F18)

### F15 · LABEL COLOURS ON THE ENTITY, FOR VCARVE
- Handover: *"kolory warstw LABEL_* w VCarve (wariant b, jeśli VCarve
  ignoruje kolory)."* The owner has not said whether VCarve honours the
  layer colour, so both are written: today the `LABEL_<unit>` layer row
  already carries the unit's ACI (`cnc/dxf.js:627-629`, `layers.js
  :188-196`, `put(62, color)` at 86); now EVERY entity on a LABEL layer
  (the TEXT, the `#number`, the EDGE arrow polylines) carries group 62 =
  the same ACI on the entity itself. Without a labels plan the file stays
  byte for byte what it was (the `cnc-export-identity` fingerprints hold).
- Test `test/turn79-f15-label-colour.test.js`: every LABEL entity has 62;
  the no-plan file unchanged.

### F16 · RESTORE SLEEVE ROWS, THE BUTTON
- Handover: *"przycisk Restore sleeve rows"*. The store has it
  (`restoreSleeveRows`, `projectStore.js:2632-2642`, tested at
  `chatfix-1710-drawers-and-sleeves:152`); no UI calls it.
- Fix: in `components/ElementProperties.jsx` `case 'shelf-type'`
  (336-366) a button `Restore sleeve rows` shown only when
  `item.sleeves_dropped?.length`, `cc-btn w-full`; retail through the copy
  script. EXEMPT. Test: the button appears with a dropped row and calls the
  action; absent otherwise. Walk: drop a row by the clash finding, restore
  it, frame.

### F17 · THE NL 420 RUNNER, THROUGH THE PROJECT ONLY
- Handover: *"prowadnica NL 420"*. The ladder is `hardware.runner.movento
  .nominalLadder` (`profile.js:4518`, no 420; `depthSteps` 1409 each NL
  minus 10; `runners.js:186-215`; the bucket manifest already holds four
  NL 420 files, `test/fixtures/bucket/runners-blum-movento-manifest.json
  :211-229`). Adding 420 to the ENGINE ladder would move a fossil kit's box
  depth (410-439 usable: 390 → 410) against its LISP, so it does not.
- Fix, the fossil law: `profile.hardware.runner.movento.extraNominal:
  [420]` (new) injected by `paramsForEngine` as `runner_ladder_extra`;
  `runnerLadder(profile, params)` merges it, sorted; `depthSteps` derives
  410 from it the same way (the 1710 law test `nl - 10` holds on the merged
  list); a bare call has no extra and the six stay identical; the gate
  `ladder420` in `f34-t79-f17.mjs`. The tests that pin the literal ladder
  (`turn33-f9-movento-ladder:44-49`, `turn20-f2-bucket:170-174`,
  `engine.test.js:447`) stay true for the bare ladder; a new case in
  `test/turn79-f17-nl420.test.js` proves a project box with 425 usable
  takes 410 under a 420 runner and the GLB resolves from the manifest.
  If this cannot be done in `runners.js` + `profile.js` + `projectStore.js`
  cleanly, skip whole and name it.

### F18 · 21 OR 44 PER SHEET, TWO MENU ENTRIES
- Handover: *"przełącznik 21/44 naklejek w oknie eksportu"*. There is no
  export window: `Output > Part labels (PDF)` (`lib/outputMenu.js:121-125`)
  exports at once through `onExportLabels` (`ConfiguratorPage.jsx
  :431-441`) with `profile.labels.sheet` (L7160); `profile.labels.sheets`
  already holds `L7160` and `generic44`.
- Fix: two entries in the Output menu, `Part labels · 21 per sheet (Avery
  L7160)` and `Part labels · 44 per sheet`, both calling `onExportLabels
  ({sheet})`, which passes `labels.sheet = profile.labels.sheets[sheet]` to
  `exportLabelsPdf`; the default stays L7160; the stale hint "44 per page"
  (123) corrected. EXEMPT `ConfiguratorPage.jsx`. Test: both entries, both
  grids (3x7 and 4x11) in the produced PDF page count. Walk: the menu
  framed.

## NOT THIS TURN (named so nobody builds it)
- The pull-down rail, the hinge LOD, any offline LOD (parked by the owner
  18.10 14:51).
- The kasacja of the shelf-mounted rail branch in the engine (the owner
  decides it separately; this turn removes the proposal and the toggle).
- The two-leaf small door (T80), divider L/R in 3D, the divider sleeves
  +18, the second-bay shelves a/b/c/d (decisions pending).
- Cabineo on the drawer BOTTOM, or Cabineo 8 on the box.
- A horizontal notch on anything but the carcass (no doors, no worktop).
- Lighting, in any form.

## TESTS AND PROOF
Full suite; the goldens above; `scripts/t78-classify.mjs` strict with the
`f34-t79-f*.mjs` fragments (REPINNED only in F6, with the quote);
`scripts/t78-copy.mjs --check` (retail only through the copy script);
`scripts/t79-walk.mjs`, REAL mouse, PRO and retail where retail is named,
frames `verify/t79/fNN-*.png`, output `verify/t79/walk.txt`; parens for
every LISP file touched (`KIT_NOTCH.lsp`, `KIT_RECESS.lsp`,
`SKYLON_JOINTS_CABINEO.lsp`); `test/turn79-fNN-*.test.js` per F with the
probe tables as assertions; every F reports the six stations of DONE; the
PR says how many paths do the same thing after F11 and F13 (the answer must
be one).

## PR BODY
The probe tables verbatim (F3, F6, F8, F9); files and lines per F; the
LISP amendments with their licences and parens; the EXEMPT entries; the
retail divergences (what the copy script could not carry and was done by
hand); the goldens (old proven, new listed, F6's re-pinned with the
reason); the test count before and after; the walk result; the kasacja
balance of F11 (deleted / added); what was skipped and why; THE NUMBERS
PROPOSED.

## THE NUMBERS PROPOSED (owner to confirm; all in profile.js; none typed in the UI)
| Number | Value | Source |
| - | - | - |
| Shelf setback (project) | 10 | owner 18.10 (decided) |
| Divider setback (project) | 10 | owner 18.10 (decided) |
| Drawer cap setback | 20, unchanged | owner: "szuflady zostaw" |
| Rail under a shelf | 50 | owner 18.10 (decided) |
| Rail magnet reach | 10, the shelf magnet's | T79 proposed |
| Message history | 50 rows | T79 proposed |
| Grey message time | 3000 ms, unchanged | profile |
| Drawer columns divider | mid-width, draggable after | owner's mockup |
| Box Cabineo | 12; 1 per joint to 100, 2 above, at 25 from top and 25 above the wall's bottom, from the top | owner 18.10 (decided) |
| Notch from the top | negative HEIGHT | owner 18.10 (decided) |
| Edge notch | d and h, full width, four edges | owner 18.10; sizes T79 proposed |
| NL 420 | project ladder only | handover; T79 proposed road |
| Labels | L7160 default, generic44 by menu | owner 17.10 |
