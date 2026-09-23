# CLAUDE.md, TURN 73 · WHAT THE OWNER TESTED ON T72 AND SENT BACK

Run autonomously. Zero questions, zero stops: every decision below is the
owner's own (23.09.2026), so nothing here is asked again. If a point cannot be
done, skip it, write why in the PR, and go on. Full suite, never `--silent`.
Frames under `verify/t73/`. Branch `claude/t73-retests`, one commit per F, PR
at the end; the owner merges. Nothing lands in Petros from this session.

## STATUS 23.09.2026, DELIVERED FROM THE CHAT SESSION AS A ZIP
Done, tested (suite 5805 of 5805, goldens x6 identical):
- F1 GAP UNDER CEILING field (retail end panel menu).
- F2 a bare outer side asks ADD END PANEL? YES / NO (`detail/AddPanelAsk.jsx`).
- F3 the spacing chip field: 96 x 36, 16 px, gold edge, opens with the
  figure selected; Enter confirms, Escape cancels.
- F5 EXTRAS ADD ANOTHER WARDROBE takes the plus's road (`besideOnFirstWall`).
- F6 the felt colour is stamped on WATCH-BASE and worn by the scene, matte.
- F8 end panel depth and cornice return reach the wall through `wallGapOf`.
- F9 the WATCH INSERT switch is hidden in retail (PRO keeps it).
Waiting on the owner:
- F3 second half: what the shelf menu HEIGHT field should measure.
- F4 J-pull: needs a browser probe, asked before starting.
- F7 divider and FIX shelves: the owner is asked what exactly does not stop.
- F9 dashes written by T72 (186 lines in src): not swept, a separate job.

## THE ORDER
The owner tested T72 point by point on 23.09.2026 in the RETAIL configurator.
6, 7, 8, 13 work. What follows is what did not, in his words.

## LAWS
**Diagnose before you cut.** F4 and F6 begin with a committed PROBE: the fact
found, in one table, before any fix. **Test the way the client clicks.** Every
walk in `scripts/t73-walk.mjs` uses a REAL mouse (`page.mouse.click` /
`page.mouse.dblclick` at the piece's projected screen point through
`window.__cc.views`), and adds pieces through the REAL buttons. Never
`selectElement` or a store call standing in for a click: T72's walk did that
and hid F2 and F5 below. **One law, one path**: a fix joins the existing path,
never a second one. **1:1 = COPY** for PRO surfaces (`scripts/t72-copy.mjs`
pattern). **Numbers do not enter the UI without the owner's order**: every
field below is his order, no other appears. **No em or en dash** in anything
written, code comments, commit titles and PR included. **Room refuses first.**

## FROZEN
1. Goldens x6 byte-identical; `computeCabinet` cut path untouched. F8 changes
   placement and the end panel/cornice depth only; a classifier
   (`scripts/t73-classify.mjs`, T72's pattern) proves the goldens are not moved.
2. LISP untouched. `engine/drawings/**` read-only except where F8 must pass the
   longer panel through (then licensed in the classifier).
3. PRO freeze (`test/turn59-f1-the-switch.test.js`): every PRO file edited is
   licensed in `EXEMPT` with the owner's words from this file and re-frozen in
   the same commit.

## F1 · END PANEL: A GAP UNDER THE CEILING, IN MM (T72 point 1)
Owner: *"nie ma możliwości ustawienia na przykład 15 mm, a nie do sufitu;
dodaj przy to ceiling następne pole z wpisaniem milimetrów."*
- In the retail end panel menu, beside TOP `Carcass` | `Ceiling`, one number
  field `GAP UNDER CEILING` in mm, shown only when `Ceiling` is chosen,
  default 0. 15 means the panel stops 15 mm below the ceiling.
- It writes the same store path `Ceiling` writes today (`endPanelToCeiling`
  resolves to `setEndPanelTop` with the room's headroom): the value written is
  headroom minus the gap. No second law. Refused by the room like the chip.

## F2 · END PANEL: CLICK THE OUTSIDE SIDE, "ADD PANEL? YES / NO" (new, owner 23.09)
Owner: *"jak klikniesz na bok szafy z zewnątrz, żeby się pokazywało add panel
(Yes / No), to będzie bardzo intuicyjne."*
- 2klik on a wardrobe's OUTER side (`BUL` / `BUR`) that has NO end panel and
  NO neighbour touching it: the docked panel shows `ADD END PANEL?` with
  `Yes` | `No`. Yes calls the existing `addEndPanelByHand(unitId, side)`; the
  panel's own menu (T72 F1) opens right after. No closes.
- A side that already has a panel, or has a neighbour flush against it: the
  question never shows (the panel is what gets clicked, or there is nothing
  to add).

## F3 · THE SPACING CHIP: A REAL FIELD, AND SPACING MEANS SPACING (T72 points 2 and 3)
Owner: *"2klik na wymiar otwiera malutkie pole, którego nie widać i nie mam
jak wpisać; powinien tam być numer default i zaznaczone, że jak chcemy to się
wpisuje albo zatwierdza; jak wpisuję w danym polu, to powinno liczyć pomiędzy
danymi półkami lub pomiędzy górą a dołem, a nie jak teraz od dołu szafy."*
- `src/3d/SpacingChain.jsx`: the inline field opened on a chip is readable at
  the room camera: at least 96 px wide, 36 px high, 16 px text, white field,
  onyx ink, gold border (Ivory and Onyx tokens). It opens WITH the chip's
  current number in it, all of it selected, focused: typing replaces it,
  Enter confirms, Escape cancels.
- The number typed is THE CLEAR GAP OF THAT CHIP: between the two shelves the
  chip stands between, or between a shelf and the bottom / the top of the bay.
  Never a height from the carcass bottom. Enter moves the selected shelf so
  that gap becomes the number (the other side's gap takes the difference);
  clamps and refusals as today.
- Same for the WIDTH chips on a partition (T72 F3): the number is the clear
  width of that bay.
- Test: three shelves, chip between shelf 1 and 2 reads N, type N+50, shelf 2
  moves up 50, shelf 1 does not move, the chip now reads N+50.

## F4 · THE J-PULL IS SEEN, ALWAYS, AND HAS A SHADOW (T72 point 4)
Owner: *"na 3D nie widać J-pulla w ogóle; czasami się pojawia, ale nie wiem co
powoduje, że czasami widać, czasami nie; pasowałoby, żeby miał cień, bo teraz
nie ma i nic nie widać."*
- PROBE first, with a real mouse: retail wardrobe, J-pull chosen on FRONTS.
  Record per frame: is the J mesh in the scene (`3d/jpullProfile.js` through
  `UnitView.jsx`), its `visible`, its material and colour against the door
  colour, its z against the door face (z-fighting or buried inside the door),
  its bounds, and whether it survives: a door open/close, a camera orbit, a
  colour change, a width change, a page reload. Find the condition that makes
  it vanish. Commit the table, then fix what it convicts.
- The J mesh casts and receives shadow (`castShadow`, `receiveShadow`) and
  reads as a separate piece from the door in the room light.
- Frames: the same wardrobe from the room camera, before and after, doors
  closed.

## F5 · THE PANEL LEAVES ON EVERY ADD, NOT ONLY THE PLUS (T72 point 5)
Owner: *"jak dodasz przyciskiem plusikiem to działa, ale jak z menu EXTRAS /
another wardrobe, to nie działa, pokazuje panel."*
- Fact found 23.09: the plus calls `adapter.addBesidePlus`, EXTRAS
  `ADD ANOTHER WARDROBE` (`Options.jsx`, `extras-add-wardrobe`) calls
  `A.addFirstWardrobe()`. T72 F5 put the sweep on one of them.
- Put the sweep (`autoEndPanelStrays` / `autoEndPanelJunctions`, the same
  call) where EVERY add lands: the store's one add path that both reach, so a
  third button can never miss it. Test through BOTH real buttons.

## F6 · THE FELT IS SEEN ON THE DRAWER BOTTOM (T72 points 9 and 10)
Owner: *"nie dodaje koloru felt, czyli spodu szuflady; spód szuflady, only
dodaj kolory."*
- Fact found 23.09: the felt colour is stored and reaches the BOM
  (`engine/watchDrawer.js`, `engine/cabinet.js`), but nothing in `src/3d/`
  draws it.
- PROBE: which mesh is the accessories drawer's bottom (tray base) in the
  scene. Then: with finish `Felt base`, that bottom is drawn in the chosen
  felt colour (dark green, red, brown, black; the four colours
  `watchDrawer.js` names), matte (roughness high, no sheen). Other finishes
  unchanged. Only the bottom, nothing else changes colour.
- Frames: the drawer open, each of the four colours.

## F7 · THE DIVIDER STOPS AT FIX SHELVES, AS IN PRO (T72 point 12)
Owner: *"działa, ale się nie zatrzymuje na fix półkach jak w PRO."*
- Dragging a partition (`startPartitionDrag`, `UnitView.jsx`) and typing its
  position or width (T72 F3 chips) stop where PRO stops them: at a FIX
  shelf's end. Read how PRO clamps it and use that SAME clamp in retail; if
  retail already calls it, find why it does not bite (probe line in the PR).
- Test with a real mouse: a FIX shelf in the bay, drag the partition across,
  it stops at the shelf.

## F8 · FROM THE WALL: THE END PANELS AND THE CORNICE REACH THE WALL (T72 point 14)
Owner: *"działa, ale panele i cornice się nie przedłużają, a to źle."*
- A wardrobe stood off its wall by `wall_gap` (T72 F14): its end panels and
  its cornice returns get deeper by exactly that gap, so they reach the wall
  and close the gap at the sides and on top. Gap 10 (the default) keeps today's
  panels byte for byte, so the goldens do not move.
- Read `wallGapOf(unit, profile)` (`engine/runs.js`); the end panel depth and
  the cornice return depth take it where they take the unit's depth today.
  The BOM, the cut list and the T71 plans show the longer panel.
- Test: gap 100 on a 600 deep wardrobe: end panel depth grows by 90 against
  gap 10, cornice return grows the same, the back edges touch the wall line.

## F9 · T72 LEFTOVERS
- Remove the leftover `WATCH INSERT` row under the retail drawer menu (the
  audit of 22.09 found it; the four sections T72 removed stay removed).
- Remove every em and en dash T72 wrote in new files and comments.

## TESTS AND PROOF
Full suite; goldens x6; the T59 freeze with tonight's licences; the T71 set
green on the Herbal Hill fixture. New `test/turn73-*.test.js` per F.
`scripts/t73-walk.mjs` with REAL mouse clicks for F1 to F8, frames
`verify/t73/fNN-*.png`, output `verify/t73/walk.txt`.

## PR BODY
The probe tables (F4, F6) verbatim; per F the files and lines; EXEMPT entries
added; the goldens; the count of tests; the walk result.
