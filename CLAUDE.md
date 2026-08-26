# CLAUDE.md — TURN 51 · WHAT T50 GOT WRONG, THE HINGE, THE LIGHT PANEL, AND THE WAREHOUSE

The owner, 26.08.2026, after walking T50. His rulings, verbatim law:

* **The wall editor goes.** *"drawing room w ogóle nie ma sensu — cofnij
  całkowicie to i zostaw dodawanie wnęki i boxa jak wcześniej, ale żeby
  działało. ten sposób rysowania nie ma sensu."*
* **The share-out never fired.** *"nie działa ustawianie automatyczne, nie ma
  zapytania, nie pokazuje się a jest poniżej 400."* And on why cabinets would
  not grow: *"szafki się nigdy nie powiększają w lewą stronę … nie są w stanie
  przesunąć innej szafki."* His ruling: *"nachodzenie na siebie to sztywna
  zasada, jest niedopuszczalne, więc wymuszenie przesunięcia."*
* **The end panel must follow the hand.** *"jak dojedziesz to już nie wymusza
  panela, a powinno: dojeżdżam — panel się pojawia, nie dojeżdżam — panel
  znika. proste."*
* **The hinge cup shows through.** *"puszka trochę odstaje od lica … drzwi mają
  18 minus 6 daje 12, a puszka jest na głębokość 11, więc nie powinno być
  widoczne. może puszka jest oka, ale otwór jest za głęboki?"* He was right.
* **Side walls.** *"default bocznych ścian zrób na 2000 mm, nie jak teraz
  1500."*
* **The light panel.** *"robimy w Light coś na wzór pokoju, czyli lewa ściana,
  sufit i prawa ściana, i wtedy włącz/wyłącz światło poszczególną lampę."*
* **The warehouse.** As mocked up and agreed 25.08 — same model and same CSV
  columns as Production Core, separate table, own categories.

Eight features. The first four are corrections to last night's work and go
first: a wrong feature in a user's hands costs more than a missing one.

## Three decisions taken FOR the owner — veto any

He left for the day; these cannot wait and are written here to be struck out
in one line.

1. **Light settings live WITH THE PROJECT**, not globally — a room with one
   window and a showroom want different rigs, and a saved job should reopen
   looking as it did.
2. **A lamp has ON/OFF and a strength, and does not slide along its wall.**
   Position stays the rig's arithmetic. Sliding is a second feature and can
   come when the panel has proved itself.
3. **The warehouse exports TWO ways** — the whole catalogue, and the materials
   used by the open project. Both were asked for at once (*"nazwa projektu"* on
   a global catalogue), and they are two different documents: a catalogue and
   a shopping list.

## Iron rules (binding)

1. **Zero-stop overnight.** PR before morning regardless. Sacrifices, in this
   order: **F8** first, then the light panel's PRESETS (F6's switches never
   fall), then the warehouse's CSV IMPORT (its list and its editing never
   fall). **F1–F5 never fall.**
2. **BYTE-IDENTITY.** `t51-classify`: six IDENTICAL, UNNAMED = 0. F2, F3 and
   F5 touch the engine. F5 changes a BORE — if a golden moves, that golden has
   a shaker front and the bore genuinely changed depth, which is a FINDING to
   write up, not a licence.
3. **LISP IS LAW — FIRST, for F5.** The cup bore is a drilling; its depth rule
   is born in `reference/lisp/` before any JS. No other LISP file moves. Paren
   13/13 at 0/0.
4. **Sanctity, with ONE named licence:** `src/engine/wallDraw.js` and the
   drawing UI in `RoomModal.jsx` are REMOVED — the owner's ruling above. What
   T49/T50 kept beside them (Rectangle, L-shape, + Box, Import DXF plan) stays
   and must WORK, which is F1's real job.
5. **Suite in full at every commit, never `--silent`. One commit per feature.
   Zero new dependencies. Modals draggable and beside. English copy. Every
   screenshot LOOKED AT. `verify/t51/` shows: a box added and VISIBLE in the
   room, a share-out fired by a DRAG, a panel appearing and vanishing as a
   cabinet is moved in and out, and the light panel.**

---

## F1 [CRITICAL] — the wall editor is reverted, and boxes work

Remove `engine/wallDraw.js`, its test, and the drawing UI added to
`RoomModal.jsx` by T50-F1. `engine/room.js`'s additions go with it unless
something else has come to depend on them — check, do not assume. No later
commit touched `RoomModal.jsx` or `room.js`, so the revert is isolated.

**Then the half that matters**: Rectangle, L-shape, + Box and Import DXF plan
must WORK. The owner has reported twice that a box added in Room settings does
not appear in the room. The chain (`insertBox → draft → apply → setRoom →
room.boxes → roomBoxes → Room.jsx`) is complete and unconditional on
inspection, so something breaks it in practice — find it by USING it, not by
reading it: add a box in the wizard, add one in Settings ▸ Room setup, with
scope One wall and with scope Room, and watch which of the four fails.

Also: Settings ▸ Room setup and the wizard's room step must show the SAME
screen (T50-F12, which fell).

## F2 [CRITICAL] — the share-out fires whenever the layout changes

**Diagnosed already — this is the fix, not a search.** T50 hung the offer on
`addUnit` alone. The owner reaches a sub-400 gap by DRAGGING or by RESIZING,
and nothing asked.

One store action, `settleLayout(focusId)`, called at the end of `addUnit`,
`moveUnit`, `removeUnit`, and `updateUnitParams` (the last only when a width,
depth or height actually moved — a colour change must not pay for it). It
does two things: grows the auto end panels (F3) and re-derives the share-out
offer for the focused unit.

**It needs a recursion guard.** `growAutoEndPanels` widens cabinets through
`updateUnitParams`, which now settles the layout — an unfloored loop, and the
suite finds it as a blown stack. A module-scope `settling` flag, outermost
call does the work, inner ones return at once.

**And the cabinets must MOVE.** The owner: *"nachodzenie na siebie to sztywna
zasada … wymuszenie przesunięcia."* `shareOutRun` already lays the run out
with a cursor and writes right-to-left, which is correct — but the FILLERS
are obstacles (`panelObstaclesFor` labels them `filler`) and they are only
recomputed at the very end, so every move is clamped against infills sized for
the OLD widths. Take the run's own auto-parts out of the obstacle set for the
duration of the lay-out, and restore them after. A cabinet may still not
overlap another CABINET — that rule is absolute.

## F3 [HIGH] — the end panel appears and vanishes with the hand

Same fix, same `settleLayout`: *"dojeżdżam — panel się pojawia, nie dojeżdżam —
panel znika."* An automatic panel (`meta.autoAdded`) whose junction no longer
exists is REMOVED, not left behind. A panel the owner deleted by hand stays
deleted while that junction lasts; move the cabinet away and back and it is a
new junction, so it may return.

## F4 [HIGH] — the leftover is measured from the CARCASS

`runEndGap` measures from `paddedSpan`, which includes the fillers — so the
engine reads zero where the owner sees a gap, and the offer never appears. The
gap is measured from the CABINET BODY to the wall, ignoring the scribe filler
that stands in it: at a 40 filler and a 300 shadow, the bar says 340, and the
filler returns to its 40 once the run is shared out.

## F5 [HIGH] — LISP first: the cup bore respects the shaker's rebate

The owner's own diagnosis, and it is right. `doorHingeDatum` takes the door's
FULL thickness from `box.d` and says so in a comment — *"a shaker's
`meta.shaker.depth` is deliberately not consulted"*. For an 18 mm shaker with
a 6 mm rebate that leaves 12 mm of material where the cup sits, but the bore
is computed as `min(11, 18 − 1) = 11`, so 1 mm of floor remains instead of
seven and the cup reads through the face. At 16 mm it would bore straight
through — `cupFloorKeepMm` exists to prevent exactly that and is measuring the
wrong thickness.

The bore takes the thickness AT THE CUP: full where the cup lands on the
shaker's frame, less the rebate where it lands in the panel field. State the
rule in LISP first. Report in Check when a front is too thin to take a cup at
all, rather than silently boring a shallower one.

## F6 [HIGH] — the light panel, built like a room

In Lighting: **ceiling, left wall, right wall, facing** — each with an ON/OFF
and a strength. That is the model the owner asked for, and it is the room he
is standing in.

* The existing rig maps onto it: the overhead bands are CEILING, the showroom
  pillars are the WALLS. Nothing is invented; the panel drives what is there.
* **Presets** as a starting point — `Showroom`, `Bright`, `Moody`,
  `Neutral` (flat, for judging a colour). A preset sets the four; the owner
  then tunes. *(First to fall after F8.)*
* **THE EXPORT IGNORES THE PANEL.** `renderCapture` and every PDF render with
  ONE fixed rig, whatever the switches say. A client compares a render against
  an Egger sample, and two renders of the same decor must not differ because
  somebody flipped a lamp. Say this in the panel, in one line.
* Settings save with the project (decision 1).

## F7 [HIGH] — the materials warehouse

As mocked up and agreed on 25.08. Database ▸ Materials opens the warehouse,
not the design modal.

* **Model, exactly Production Core's**: `item_number` (auto), `name`,
  `category`, `subcategory`, `size`, `thickness`, `color`, `unit`,
  `cost_per_unit`, `image_url`, `jc_uuid`, `notes`.
* **Own table**, not shared with PC. Own categories: sheets, timber, hinges,
  runners, other hardware, bead, drawer pins, paints, consumables. A material
  with no category lands in **Others**.
* **Subcategories flat** — a text field, one level, renameable in bulk. No
  tree.
* **List with departments down the left and counts**, a photo per row, code
  under the name, and a draggable card on click with the picture enlarged.
* **Price** comes from an import or is typed; the record says WHICH, so a
  re-import cannot silently overwrite a hand-typed figure without saying so.
* **`jc_uuid` from day one.** On import from JoineryCore, match on it:
  **overwrite the existing row, never add a second.** Say in the UI that
  automatic linking to JC requires importing the JC list first.
* **CSV**: the same columns as PC so the two files interchange. Two exports
  (decision 3), named:
  `Cabinet Core - {project} - {YYYY-MM-DD HH-mm} - materials.csv`
* **RLS on the table.** Degrades gracefully with no network: the warehouse
  opens, says it is offline, and does not lose a typed row.

## F8 [LOW] — side walls default to 2000

*"default bocznych ścian zrób na 2000 mm."* One number, in the profile, read
by everything that starts a room. **First to fall.**

## Execution order

`F1` → `F2` → `F3` → `F4` → `F5` → `F6` → `F7` → `F8`. The corrections first,
then the bore, then the two new things. F2 and F3 share one mechanism and are
one commit if that reads better.

## What this turn does NOT touch

The six goldens' bytes. The DXF export's emptiness — still its own CRITICAL,
still not this turn. The dog-bone thresholds (no number from the owner). The
slope geometry. Every LISP file but the one F5 needs.

## Morning audit will run

Fresh clone → install → suite (never `--silent`) → build → `t51-classify` →
paren 13/13 → the box probe (added in all four ways, VISIBLE in the room) →
the share-out probe (fired by a drag, by a resize, and cabinets that MOVED
rather than refused) → the panel probe (appears on approach, vanishes on
retreat, stays gone when deleted) → the bore probe (an 18 mm shaker leaves
real floor under the cup; a too-thin front is reported, not bored) → the light
panel walked, and a capture proved IDENTICAL with the switches flipped → the
warehouse: a row typed, a CSV round-tripped, a JC import matched on `jc_uuid`
overwriting rather than duplicating → every screenshot LOOKED AT → verdict →
the numbered eye-test list.