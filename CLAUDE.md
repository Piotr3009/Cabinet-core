# CLAUDE.md — TURN 61 · PBI: THE TOOL RETURNS TO THE CLIENT'S ROOM

Run autonomously. Zero questions, zero stops. Skip-and-note. PR before morning.
Sacrifice from the BOTTOM of the F-list upward (F6 first, F1 never).
Full suite, never `--silent`. Screenshots committed under `verify/t61/`.

**Every new UI entry ships WITH its click path proven** — a screenshot pair
"where I click → what opens" per entry. The owner's iron rule: *"Nowa funkcja =
widoczne wejście w UI, w tym samym pakiecie."* A feature without a visible
entry is a feature NOT DONE; the audit rejects it before the owner does.

Pattern-first law on every feature: *"Najpierw szukaj działającego wzoru w
repo, potem klawiatura."* Read the PRO wiring before writing the retail
surface, and NAME the source pattern in the PR body. If nothing like it
exists, say so in as many words.

---

## WHAT IS FROZEN TONIGHT

The owner, verbatim: *"pamietaj pro jest nie doruszenia"*.

1. **PRO app files — zero bytes moved**: `index.html`, `src/App.jsx`,
   `src/main.jsx`, `src/components/**`, `src/pages/**`. The freeze test in the
   suite guards this. It stays green. Do not edit it, do not weaken it.
2. **`src/engine/**` cut geometry**: six golden fixtures byte-identical,
   `computeCabinet()` bare output matches LISP, `UNNAMED=0`, classifier
   reports zero engine deltas. The ONE engine file this spec licenses is
   `engine/room.js` (plus the scope-normalisation sites you find by READING —
   name every one in the PR body). Nothing in the cut path.
3. **`reference/lisp/**` untouched.** Parens stay 14/14 at 0/0.
4. **The retail RAIL is NOT rebuilt tonight.** The 8-row RAIL (FURNITURE
   tiles, CARCASS/FRONTS split, the Egger tile modal, the DECOR/PAINTED fork)
   waits for the owner's mockup and green point. Do not start it, do not
   scaffold it, do not rename `CATEGORIES`.
5. **Iron boundary**: `src/retail/**` imports only from `src/retail/**`,
   `src/engine/**`, `src/3d/**`, `src/stores/**`. PRO components are never
   imported — retail surfaces are written in retail language.
6. **Shaker stays as the engine has it** (25 mm board, 6 mm recess). The
   owner: *"1 zostawj"*. No front-thickness work tonight.

---

## F1 · THE EIGHT OVERLAYS RETURN

The owner: *"takwlacz praktycznei wszystko"* · *"1 all 8, 2 - jal dzis"*.

T59 killed all tool chrome in retail with one boot-time switch
(`setProChrome(false)`). T60 gave three overlays back through named channels
(`dimensions`, `outlines`, `measure`). Tonight the remaining EIGHT come back
**the same way** — a named channel each, set `true` in
`src/retail/main-retail.jsx` immediately after the three that are already
there. That is the working pattern; do not invent a second one.

| # | Component | Channel | What it is |
|---|-----------|---------|------------|
| 1 | `src/3d/DrillRings.jsx` | `drill` | shelf-pin holes and every CNC hole — the owner's own 7.5 / 5.5 / dark rings |
| 2 | `src/3d/AddPlus.jsx` | `plus` | the `+` markers beside and on units |
| 3 | `src/3d/PartMachining.jsx` | `machining` | machining drawn on a single opened part |
| 4 | `src/3d/LedIcons.jsx` | `led-icons` | LED mounting icons |
| 5 | `src/3d/HoverDimensions.jsx` | `hover-dims` | dimensions under the cursor |
| 6 | `src/3d/EdgeHandle.jsx` | `edge` | drag handles on a unit's edges |
| 7 | `src/3d/UnitView.jsx` — the hover-shelf ghost guard | `hover` | the shelf ghost under the cursor |
| 8 | `src/3d/ShareOutBar.jsx` | `share` | the share-out bar |

**Mechanics — additive, PRO's behaviour unchanged:**

- In each component, swap its guard from `proChromeOn()` to
  `chromeOn('<channel>')`. `chrome.js` already falls through to the master
  switch for any channel nobody set — PRO sets none, so PRO keeps exactly what
  it has, and that fall-through IS the no-change proof. These files are
  `src/3d/**`, not PRO's frozen list, so the edit is legal; PRO's rendered
  output must not move and the freeze test plus the suite must say so.
- Channels are **boot-time constants**. Set them ONCE, before first render.
  Never flip one at runtime: the guards sit before their components' hooks and
  a mid-life flip changes a hook count. `chrome.js` says this in its own
  words — respect it.
- *"2 — jak dziś"*: visibility control is PRO's, unchanged. Where PRO gates an
  overlay behind a store flag, retail is gated by the same flag through the
  same VIEW BAR buttons (T60's law: retail VIEW BAR = PRO 1:1). Where PRO has
  no toggle, retail is always on. **No new buttons are invented tonight.**
- `AddPlus` routing: read what PRO's `onClick({ near, side })` opens and which
  targets a plus offers. In retail the plus adds through the store's own
  `addUnit` / rider path — mirror PRO's targets, invent none. No PRO component
  import: the handler lives in `src/retail/**` and calls store and engine only.
- `EdgeHandle` commits through the store's own resize path, so the same
  refusals (room refuses first, T50) surface in retail as in PRO.
- `ShareOutBar`: channel `true` per "all 8". Its only trigger
  (`uiStore.shareOutOffer`) sits behind PRO surfaces retail does not render
  and behind `RETAIL_SHOW_WORKSHOP_TOOLS=false`, so it will not appear until a
  retail entry exists. **Say this plainly in the PR body** — do not invent an
  entry, do not gate the channel off.

**Proof**: `verify/t61/f1-*.png` — drill rings inside an open wardrobe; a `+`
beside the wardrobe; hover dimensions; an edge handle mid-drag.

## F2 · TWO WALLS

The owner: *"zrob 2 sciany, Elki bedziemy dokaldac"* · confirmed *"2 tak
wystarczy"*. **No corner carcass tonight** — L-shape stays parked. Cabinets
stand independently, one run per wall.

- `engine/room.js`: add scope `'two'` beside `'wall'` in `wallsInScope` /
  `wallIndicesInScope`, following the existing `'wall'` law: walls 0 and 1
  (adjacent, sharing corner 1) are real, and the two FREE ends get the same
  `wallStub(room, profile)` returns that one-wall mode uses. Find every site
  that normalises or branches on scope by READING — `design.js` migrate, the
  room draw, placement offers — and extend each. List them all in the PR body.
  Scope is not in the cut path; the classifier must prove the goldens did not
  move.
- Retail YOUR SPACE gains **WALLS** chips `1 | 2`, writing scope
  `'wall'` / `'two'` through the adapter. With `2`, a second field appears:
  **WALL 2 WIDTH**, driving the other side of the rectangle through the same
  `setSpace` law — read how wall 0's width writes corners and mirror it.
- LAYOUT gains a **WALL** chip row `1 | 2` on the selected wardrobe (the
  store's own `setUnitWall`; a refused move shows the store's sentence). When
  wall 2 is empty, LAYOUT offers **ADD WARDROBE ON WALL 2** — `addUnit` through
  the adapter with the defaults `startDesign` already uses.
- The adapter's single-wardrobe readers (`theWardrobe` and friends) learn
  plurality the minimal way: selected unit first, wall-0 wardrobe as fallback.
  Read every caller before touching it.
- STAGE HINT extends T60's naming law: "WALL 2 WARDROBE — LEFT DOOR".
- Corner behaviour = whatever PRO's `'room'` scope already does at a corner.
  Mirror it. Do not write a second corner law.

**Proof**: `verify/t61/f2-*.png` — chips at 1 and at 2; two wardrobes, one per
wall; the second wall's width field.

## F3 · ADD TOP BOX

The owner asked where top boxes get added; his answer: *"4 add top"* — a
button on the selected wardrobe.

- The engine already holds the whole relationship: `engine/topBox.js`,
  `WARDROBE_TOP`, `params.rides_on`, `settleRiders`, several riders per host
  since T53, orphan check #14, room-height refusal since T50.
  **Nothing new in the engine.**
- Retail entry: **ADD TOP BOX** in the wardrobe's own Duty menu
  (`WardrobeMenu`), and the same action offered from LAYOUT beside
  "THIS WARDROBE ›". It calls the store's own add path for a rider on this
  host — read how PRO inserts a `WARDROBE_TOP` from the library and call the
  same store mutation from the adapter. Defaults come from
  `profile.wardrobe.topBox.defaults`; depth is the host's own and the engine
  already enforces that.
- Where the room refuses (over the ceiling), the button greys with the store's
  sentence verbatim. No silent clamp.
- A placed box is selectable on the STAGE like any unit and opens the wardrobe
  Duty menu (same family), with width, height and REMOVE. STAGE HINT names it
  "TOP BOX".

**Proof**: `verify/t61/f3-*.png` — the button; a box riding the wardrobe; the
greyed button with its reason under a low ceiling.

## F4 · INTERIOR — THE FULL ROW SET

The owner: *"dowozimy dla klientow musi bcy wszystko"*.

- Retail's `INTERIOR_ROWS` (six today) grows to mirror **PRO's AddItems row set
  for this unit's family, 1:1** — read `src/components/AddItems.jsx` and
  `profile.itemsByContext` and take THEIR law: same rows, same order, same
  availability predicates, same grey reasons **verbatim from the store and
  engine**. For a wardrobe that adds at least overlay drawers, vertical
  partition, trouser pull-out and tie rack, and keeps every row already there.
- The standing T60 law holds: **no dead control.** Every row either works or is
  greyed with the engine's own reason. A row whose mechanism PRO itself holds
  open is greyed in retail with PRO's own sentence — mirror the state, never
  invent availability.
- Every addable row needs its Duty menu (an element with no menu is not
  clickable — T60 law). New menus are written in retail language reading the
  same store fields PRO's editors read: overlay drawers, partition, trouser,
  tie rack. Read the PRO editor first and carry over its refusals. Keep each
  menu as small as PRO's own controls for that element — **no invented
  fields** (*"Liczby silnika nie wchodzą do UI bez rozkazu Piotra"*).
- The plus markers (F1) and these rows must answer "what may be added here"
  through the SAME engine predicates. One law. Zero parallel tracks.

**Proof**: `verify/t61/f4-*.png` — the full row list; one new menu open; one
greyed row with its reason.

## F5 · FIELDS, NOT SLIDERS

The owner: *"nie widze sensu [suwaków] bo i tak nie trafisz, trzeba bedzie
wpisac; kratki do wpisywania rogi pieknie zaokraglone a nie kanciaki, ze zlota
obwodka a nie jakis dziwny pomarancz"*.

- In retail YOUR SPACE and LAYOUT every numeric slider becomes a typed
  **field**: wall width, wall 2 width, ceiling height, slope left and right,
  wardrobe width, depth. Millimetres, integers.
- Style: PBI tokens only — softly rounded corners, hairline border, **gold
  focus and selection ring**. Never orange. One shared field component in
  `src/retail/design/controls.jsx`.
- Bounds law: the field carries the engine's own min/max — the same
  `A.designBounds()` and `A.unitBounds()` the sliders read today. An
  out-of-range commit is REFUSED with the engine's sentence under the field.
  **No silent clamp** (room-refuses-first, T50).
- Licensed removal, consent given by the order itself: the `Slider` usages
  these fields replace in `SpacePanel` and `LayoutPanel` are deleted. If
  `Slider` ends with zero callers, delete the component too and say so in the
  balance. Tombstone comments max 2 lines.

**Proof**: `verify/t61/f5-*.png` — a focused field with its gold ring; a
refused out-of-range entry showing its sentence.

## F6 · WINDOWS AND DOORS — DRAWN ONLY

The owner: *"skosy, okna, drzwi trzeba bedzie dodac"* · decision: *"3 —
narazie sie rysuja"*. They draw. Nothing fits around them tonight.

- Retail YOUR SPACE gains a **WINDOWS & DOORS** block: ADD WINDOW / ADD DOOR,
  then per opening — wall (1 or 2), position from left, width, height, sill
  (window only), as typed fields under F5's law, and REMOVE. It writes
  `room.openings` through the store's own room patch. Read `openingsOnWall`
  and PRO's `WallElevationModal` for the record shape and its clamps: the
  shape is the law, the PRO component is NOT imported.
- The shared 3D room already draws what `room.openings` holds — verify by
  reading `src/3d/Room.jsx`. If the retail mount hides them, un-hide by F1's
  channel mechanics.
- **No fit logic tonight.** A wardrobe may stand across a window and nothing
  complains. That is the owner's explicit "na razie", and it is named as a
  known gap in the PR body, not silently left.
- Defaults for a fresh opening come from the engine's `OPENING_DEFAULTS`. No
  new numbers in the profile.

**Proof**: `verify/t61/f6-*.png` — the block; a window and a door standing in
the wall behind a wardrobe.

---

## TESTS AND PROOF

1. Full suite green, never `--silent`. The PRO freeze test green.
2. Goldens ×6 byte-identical; `computeCabinet()` versus LISP exact;
   `UNNAMED=0`; `verify/t61/t61-classify.mjs` (copy t60's pattern) shows zero
   engine deltas beyond the named `room.js` scope sites.
3. Parens 14/14 at 0/0.
4. Playwright walk: every F's screenshots as listed above, committed.
5. New unit tests where a law was added: scope `'two'` walls and stubs;
   channel fall-through (an unset channel equals the master switch); a field
   refusal rendering the store's sentence; INTERIOR row parity against PRO —
   a test that READS both lists and diffs them, so drift becomes impossible.

## LICENSED REMOVALS

- The `Slider` usages in retail `SpacePanel` and `LayoutPanel`, replaced by
  fields (F5). The `Slider` component itself only if its caller count reaches
  zero.
- Nothing else. Any other deletion the night thinks it needs: skip-and-note.

## BALANCE

Report per feature: files touched, lines added and removed, and for F1 the
one-line diff shape per overlay component (guard swap only). State how many
tracks answer "what may be added here" after F4. The answer must be one.

## SKIP-AND-NOTE ORDER

F6 → F5 → F4 → F3 → F2 → F1. F1 is not skipped: it is the owner's direct
order for tonight.