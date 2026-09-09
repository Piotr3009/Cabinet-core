# CLAUDE.md — TURN 66 · PBI: ONE EDITOR ON THE RIGHT, A LIST ON THE LEFT, AND THE WINE-RED DEFAULT

Run autonomously. Zero questions, zero stops. Skip-and-note. PR before morning.
Full suite, never `--silent`. Frames under `verify/t66/`.
**The session never halts**: "stop" in this file always means "stop that one
feature and go on to the next", never "stop the night".

## THE LAWS THAT GOVERN THE TURN

**1:1 = COPY** where PRO has the thing (T62/T63 method). **The lazy client**:
every step has its answer chosen, NEXT always works. **The right panel is the
selected element** — and after tonight, exactly ONE editor lives there.

The owner's sentence that names tonight's biggest change, from the screenshot
where a floating window and the docked panel showed the same drawer at once —
the floating window itself admitting *"The same fields are in the right-hand
panel, which is already showing this piece"*:

> *"w zasadzie po prawej powinien być tylko menu edycji."*

## WHAT IS FROZEN

1. **PRO — zero bytes**: `index.html`, `src/App.jsx`, `src/main.jsx`,
   `src/components/**`, `src/pages/**`. Freeze test green, unedited.
2. **`reference/lisp/**` untouched tonight.** Parens 14/14 at 0/0.
3. **The six goldens stay byte-identical.** Engine files licensed below are
   licensed ONLY for profile defaults and selection vocabulary — nothing in
   the cut path. `verify/t66/t66-classify.mjs` proves it.
4. **Copies stay copies** (T62/T63/T65 fidelity tests stay green). Reskinning
   happens on the generated `pbi-re-*` sheet, never on copied markup. Hiding
   happens behind `RETAIL_SHOW_WORKSHOP_TOOLS`, never by deletion.
5. **The rail mechanics stay** — variant B. Tonight changes the rail's
   CONTENT (a seventh tile, F2) and the option panels; not the layout.

## LICENSED ENGINE FILES

- `src/engine/profile.js` — F1 (studio baseGain), F5 (default finishes), F9
  (shaker frame width exposure: read-only, the bounds already exist).
  New keys or default values only; nothing a golden reads.
- Nothing else under `src/engine/`. If a feature seems to need more, skip it
  and name the line.

---

## F1 · THE LIGHT COMES DOWN 20% — IN THE RIG, NOT THE SLIDER

Owner: *"ściemnij trochę o 20 procent światło"*, and the decision: **the base
comes down, the slider stays at 100%**.

- `profile.appearance.studio.baseGain` is the owner's own dial (25.08:
  *"teraz 100 to niech będzie jakby teraz było 75"*). Take it down 20%:
  0.75 → **0.60**. One number, named in the PR body.
- The BRIGHT slider keeps its scale and its 100% default — 100% simply means
  the new, darker base. PRO reads the same profile: this dims PRO's studio
  too, which is correct — the owner judged the light against both apps and the
  rig is one law since T65 F2. Say so plainly in the PR body.
- The T65 rig-parity test (retail rig == PRO rig, number by number) must stay
  green — the change is in the shared profile, so parity holds by itself.

**Proof**: `verify/t66/f1-*.png` — the same scene before/after at 100%.

## F2 · SIZE — THE THIRD TILE

Owner: *"chcę wstawić wszystkie 3 size na początku, a dopiero później
carcass board etc."* Decision taken with him: a separate step, INSIDE keeps
its name.

- The rail becomes SEVEN tiles: **WHAT · WHERE · SIZE · INSIDE · FRONTS ·
  EXTRAS · REVIEW**. `CATEGORIES` changes content; the rail mechanics do not.
- SIZE holds three typed fields for the selected (or only) wardrobe: WIDTH,
  HEIGHT, DEPTH — the same store setters the right-hand editor uses, the same
  refusals ("room refuses first" surfaces under the field). Defaults stand, so
  NEXT works untouched.
- With no wardrobe yet, SIZE says so and offers ADD A WARDROBE — the same
  empty-state law T65 F1 gave INSIDE.
- INSIDE loses any size fields it carried and opens on the carcass material,
  as T64 set it.

**Proof**: `verify/t66/f2-*.png` — the seven tiles; SIZE with the three
fields; a refused width showing its sentence; the empty state.

## F3 · ONE EDITOR ON THE RIGHT — THE FLOATING WINDOWS AND THE THIN MENUS GO

The owner's screenshot: the floating `ElementProperties` window (1) and the
thin Duty menu (2) both open on the same drawer. His verdict: menu 2's spot is
where menu 1 belongs; everything floating dies.

- **The docked right panel hosts the copied PRO editors** — `ElementProperties`
  for parts, `DoorModal`'s content for a door, `WatchLayoutModal`'s for a watch
  drawer, and so on: whichever copied editor T63 already routes to for that
  element, docked into `Detail.jsx`'s slot instead of floating.
- **The thin Duty menus die**: `DrawersMenu`, `OverlayMenu`, `ShelfMenu`,
  `PartitionMenu`, `PulldownMenu`, `ShoeMenu`, `TieRackMenu`, `TrouserMenu`,
  `KitMenu`, `WardrobeMenu`, `RailModal`-as-menu — every
  `design/detail/*Menu.jsx` whose job the docked editor now does. Licensed
  removal. Counters and adding live in INSIDE on the left; editing lives on
  the right. Where a thin menu carried a control the copied editor lacks
  (e.g. OverlayMenu's HOW MANY chips), that control moves into INSIDE's row —
  never lost, named in the PR body.
- **F10's law holds**: click an element → its editor docks in; click another →
  it swaps in place; click the carcass (side, top, bottom, back, plinth,
  end-panel, infill, masking-panel) or empty stage → the panel slides out.
  `MENU_FOR_KIND` sends those carcass kinds to **null** (clear selection), not
  to a wardrobe menu. The wardrobe's own settings live in SIZE (F2), INSIDE,
  and EXTRAS — the left.
- The cornice keeps an editor: it has choices (40/70/100, remove). Clicking
  it docks the cornice section of the copied ContextMenu.
- **Workshop fields inside the copied editors are hidden, not cut**: weight
  from the MFC table, Move X/Y nudges, board-thickness pickers, "apply to all
  horizontals" — behind `RETAIL_SHOW_WORKSHOP_TOOLS=false`, each named in the
  PR body. The copy-fidelity tests keep reading the markup, so they stay
  green.
- Modals that are genuinely modal (the Egger picker, the room editors) stay
  modals — draggable, beside the click, per the house rule. "Floating dies"
  applies to element EDITING.

**Proof**: `verify/t66/f3-*.png` — a drawer clicked, the rich editor docked
right, NO floating window; a door swap; a carcass click closing the panel;
the workshop fields absent; grep proof in the PR that no `*Menu.jsx` remains.

## F4 · FRONTS — A LIST, NOT A MOSAIC

Owner, on the screenshot: *"style front to mega burdel"*. And: *"to powinno
być lista, a nie obok siebie … lista jak internals … dopiero pod spodem
wszystkie informacje, a nie pod każdym przyciskiem"*.

- STYLE becomes a **vertical list of rows** like INSIDE's: one row per style —
  SLAB · SHAKER · GROOVED · ARCHED — each row a small drawing (smaller than
  today's tiles, one size, drawn from `drawings.jsx`'s own style) + the name.
  Selected row carries the gold hairline. Coming-soon rows are greyed rows.
- **The explanatory sentences collect BELOW the list** — one quiet block:
  the selected style's line and the coming-soon note if a greyed row exists.
  No sentence under each tile.
- **SHAKER selected → a FRAME WIDTH field appears directly under the list**
  (typed, per the field law), reading the engine's own bounds around
  `frameWidth: 60`. Only when shaker is the style.
- **OPENING becomes an aligned list** of the four choices — PUSH-TO-OPEN ·
  HANDLES · KNOBS · J-PULL HANDLELESS — one column, equal widths, no stagger.
- COLOUR (the source slot + picker) stays as T64 built it, below.

**Proof**: `verify/t66/f4-*.png` — the list with shaker selected and its
frame-width field; grooved greyed as a row; the OPENING column; before/after
of the whole step.

## F5 · THE SHOWROOM DEFAULT — WINE ON WALNUT

Owner: *"default powinno być RAL color wine fronty i walnut Egger carcases …
RAL red wine 3005"*.

- New-design defaults: **fronts = sprayed, RAL 3005 (wine red)**; **carcass
  AND inside colour = a walnut Egger decor** — chosen from the REAL bucket's
  walnut family (85 decors, `decors/egger/*`), never invented. Name the chosen
  decor code in the PR body.
- The lazy client's six clicks now end on a wine-on-walnut wardrobe; every
  step still changes it.
- The estimate line, the REVIEW summary and the saved item all carry the new
  defaults exactly as they carry today's.
- RAL 3005 must exist in the spray palette the copied ColourPicker reads; if
  the palette lacks it, add it to the palette's own data source (retail side),
  not to the picker.

**Proof**: `verify/t66/f5-*.png` — a fresh design at the defaults, front view;
the REVIEW step naming them.

## F6 · BAYS — ONE ROW, ONE NAME

Owner: *"zamień nazwę przycisku z vertical partition (divider) na Vertical
partitions (bays), a ten na dole usuń"*.

- The INSIDE row is renamed **"Vertical partitions (bays)"** and keeps the
  typed count (max 3) from T65 F7.
- The extra BAYS control at the bottom of the panel is **deleted**. One entry.
- The T65 note-line law (bays may differ in height, the shelf is fixed) stays,
  appearing only above 1.

**Proof**: `verify/t66/f6-*.png` — the renamed row; the bottom of the panel
without the second control.

## F7 · SPLIT DOOR — INTO EXTRAS

Owner: *"split door top segment też powinien być w extras"*.

- The split-leaf capability exists since T36 (`DoorModal`, a split leaf's two
  segments, top first). EXTRAS gains a **SPLIT DOOR (TOP SEGMENT)** action
  beside ADD DOORS and ADD TOP BOX, calling the same store path the copied
  DoorModal uses — one law, two doors to it, exactly like ADD DOORS in T65 F9.
- It acts on the selected door, or greys with the engine's reason when none
  is selected or the leaf cannot split.

**Proof**: `verify/t66/f7-*.png` — the action in EXTRAS; a split leaf on the
stage; the greyed state with its reason.

## F8 · WHERE — THE ROOM IS NOT HIDDEN

Owner: *"edit the room powinien być zawsze na wierzchu, a nie ukryte pod more
options"*.

- **EDIT THE ROOM** sits directly in WHERE, always visible, under the two
  fields. MORE OPTIONS keeps whatever else it held; if it held only the room,
  it disappears.

**Proof**: `verify/t66/f8-*.png` — WHERE with the button in plain sight.

## F9 · THE VIEW OPENS DRESSED

Owner: *"dimensions on i outlines on default"*.

- A fresh design mounts with SHOW DIMENSIONS **on** and OUTLINES **on** — the
  same store flags the VIEW BAR toggles; the buttons show the on state.
  RESET VIEW does not touch them.

**Proof**: `verify/t66/f9-*.png` — first mount with chains and outlines
visible, both buttons lit.

## F10 · EVERY BUTTON WEARS THE NEW SHAPE

Owner chose variant 2 and confirmed: *"wszystkie przyciski będą zmienione,
prawda?"* — yes, all of them.

- `controls.jsx` `Button`: **radius 8px**, cream fill, hairline border, the
  ACTIVE state a **gold border** slightly heavier (the screenshot's look) —
  replacing T64's radius 0. Primary stays the one filled onyx button per
  screen, now also radius 8.
- Chips, rail tiles, view-bar tiles, step NEXT/BACK, modal buttons, the
  copied editors (via the regenerated `pbi-re-*` sheet) — every control in
  `src/retail/**` takes the shape. A grep in the PR body proves no
  `border-radius: 0` remains on a retail control.

**Proof**: `verify/t66/f10-*.png` — a panel of buttons in every state; one
copied editor showing the shape.

## F11 · COLUMN 2 — THE SECOND TEN PER CENT

Owner asked for 20% originally; T65 took 10 on his *"na początek"*. Tonight
the second ten: base 379 → **337** (421 × 0.8).

- Same mechanism, one number in `scale.css`, the scale law untouched.
- **Measured BEFORE, not after** (the T65 script): every label in the copied
  MaterialChoicePanel and FrontStyleGallery at 1280 and 1440. A clip or a
  word-by-word break is a number. If a label breaks, fix the copy's `pbi-re-*`
  widths; if it cannot be fixed there, stop at the widest clean width between
  337 and 379 and name it.

**Proof**: `verify/t66/f11-*.png` — INSIDE and FRONTS at 1280 and 1440; the
measure script's output committed.

---

## TESTS AND PROOF

1. Full suite green, never `--silent`. PRO freeze test green, unedited.
2. Goldens ×6 byte-identical; `UNNAMED=0`; `t66-classify.mjs` naming every
   delta and proving none reaches a fixture; parens 14/14 at 0/0.
3. Copy-fidelity green after the reskin and the workshop-field hiding.
4. Rig-parity (T65) green after F1.
5. New tests: the seventh tile and SIZE's fields calling the store's own
   setters; the docked editor swapping without closing; carcass kinds clearing
   selection; no `*Menu.jsx` file remaining under `design/detail/` (a test
   that LISTS the directory); the shaker field appearing only for shaker; the
   defaults of a fresh design equal to F5's; BAYS single entry; split-door
   action calling the DoorModal path; WHERE showing the room button;
   dimensions and outlines on at mount; Button radius 8 everywhere (read the
   sheet).
6. Playwright walk: every F's frames plus the lazy run at the new defaults,
   `verify/t66/lazy-01…08.png`.

## LICENSED REMOVALS

- The floating element window in retail (F3) and every thin
  `design/detail/*Menu.jsx` the docked editors supersede — with their
  controls re-homed and named.
- The duplicate BAYS control (F6).
- T64's radius-0 button styling (F10).
- Nothing else. Tombstones two lines maximum. Deletions should exceed
  additions in `design/detail/`; explain any file where they do not.

## BALANCE

Per F: files touched, lines added/removed. Then one line each:
- How many surfaces edit a selected element? (One — the docked panel.)
- How many entries add bays? (One.)
- Which workshop fields are hidden, per editor.
- The chosen walnut decor code and where RAL 3005 lives.
- Which controls moved from a dead thin menu into INSIDE, per menu.

## SKIP-AND-NOTE ORDER

F11 → F7 → F9 → F8 → F6 → F4 → F2 → F5 → F10 → F1 → F3.
F3 is the turn's reason for existing and is not skipped; F1 and F10 are the
owner's plainest orders. If F3 runs long, sacrifice from the top of that list
and say so.