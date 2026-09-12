# CLAUDE.md — TURN 68 · PBI: ONE WRITE PATH, EQUAL DOORS, AND EXTRAS REBUILT

Run autonomously. Zero questions, zero stops. Skip-and-note. PR before morning.
Full suite, never `--silent`. Frames under `verify/t68/`.
**The session never halts**: "stop" means "stop that one feature", never the
night.

## LAWS

**1:1 = COPY** (copies stay copies; hiding via `RETAIL_SHOW_WORKSHOP_TOOLS`,
never deletion from a copy). **The lazy client.** **Left adds, right edits.**
**Diagnose before you cut**: F1, F3 and F4 begin with a probe whose output is
committed; the fix follows what the probe SAYS, not what this spec guesses.

## WHAT IS FROZEN

1. **PRO — zero bytes beyond T67's three exemptions, and NO new exemptions
   tonight.** The freeze test with its `EXEMPT` map stays exactly as T67 left
   it; a fourth entry is a failing test by design.
2. **Goldens ×6 byte-identical**; `UNNAMED=0`; parens 14/14 at 0/0;
   `t68-classify.mjs` naming every delta.
3. **Engine licence: `src/engine/profile.js` ONLY** (F5's plinth bounds and
   the kitchen key). `doors.js`, `cabinet.js`, `room.js`: read-only — if a fix
   seems to need them, skip-and-note with the line.
4. Copy-fidelity, rig-parity, boundary tests stay green.

---

## F1 · ONE WRITE PATH FOR WHAT THE WARDROBE WEARS

Owner's three symptoms, one suspected disease: the fresh carcass is not H3325
(*"powinien być oak H3325 … dodaj do kodu jako default, na zawsze"*), shaker
renders "sometimes", J-pull renders "sometimes" (*"czasami się pojawia … co
jest?"*). His URL carried `?collection=royal-burgundy`.

- **PROBE FIRST, commit its output**: after each of the three entry points —
  the FRONTS step, a `?collection=` URL, a per-unit change — dump
  `design.fronts` (style, source, colour, opening), the unit's `door_style`,
  and whether the cut parts carry `meta.jpull` / the shaker recess. Three
  entries × the order permutations. The table goes in
  `verify/t68/f1-probe.md`.
- **Fix at the write sites the probe convicts**, to ONE law: the FRONTS step
  is the single writer of the project's front style+opening+colour; a
  collection PRESETS the same fields through the same setter (and does NOT
  touch the carcass decor unless the collection names one); a per-unit change
  uses the store's own per-unit override. No path writes style without
  opening — T64's J-pull lesson, now enforced by a test that walks all three
  doors and asserts identical stamped geometry.
- **H3325 ST28 Gladstone Oak is the carcass default, forever**: asserted by a
  test that a fresh design — with AND without a collection URL — carries it
  unless the collection explicitly names a carcass decor. If H3325 is missing
  from the decor list the slot reads, that is the bug: fix the list's source,
  never hard-code a swatch.

**Proof**: the probe table; `f1-*.png` — fresh design showing H3325; shaker
and J-pull each rendering after every entry order.

## F2 · UNDO / REDO — MEGA WAŻNE

- PRO's view bar carries ↺ ↻ already; retail's `viewTools.js` marked them
  `later` in T60. Tonight they land: the same store history PRO uses, the two
  tiles in the retail VIEW BAR, keyboard Ctrl+Z / Ctrl+Shift+Z (and Cmd on
  mac), greyed with reason when the stack is empty.
- Read PRO's wiring first; retail calls the same store, no second history.

**Proof**: `f2-*.png` — an add undone and redone; the greyed state.

## F3 · TWO DOORS MEANS TWO EQUAL DOORS

Owner: split may stay, but *"jak wracamy do dwóch, to żeby wróciło do 2
równych standardowych otwieranych na boki"* — and the doors-count chip has
the same disease: *"po naciśnięciu 2 muszą wrócić do standardowych pół na
pół, a nie jak teraz 1/4 i 3/4"*.

- **Probe**: set split/top-segment, then choose 2 doors (and: 4 then 2);
  dump the leaf widths and the unit's split params. Commit it.
- **Fix at the store write site**: choosing a door count RESETS every split /
  segment / custom-width residue for that face — the engine then cuts its
  standard equal pair by its own law. No engine edit: the residue lives in
  params the store wrote; the store clears what it wrote. If the probe shows
  the 1/4–3/4 comes from the engine itself, STOP that fix and skip-and-note
  with the line.
- Split door in EXTRAS still works; setting top segment 0 = the same reset.

**Proof**: `f3-*.png` — 1/4–3/4 before; equal pair after pressing 2; the
probe file.

## F4 · THE DIVIDER MOVES AGAIN

Owner: *"divider nie mogę przesunąć."* Suspect: `PartitionMenu` died in T66
and its HOW FAR FROM THE LEFT control never re-homed.

- **Probe**: click a divider — what docks? Grep where the old control wrote.
- **Fix**: the docked editor for a divider carries the position field (the
  store's own setter, refusals shown), and dragging the divider on the stage
  moves it through the same setter (EdgeHandle's pattern — read it first).
  One law, two doors.

**Proof**: `f4-*.png` — the docked field; a drag mid-motion; a refused
position showing its sentence.

## F5 · EXTRAS REBUILT — THREE GROUPS, AND THE PLINTH LAW

Owner approved the layout. EXTRAS becomes three headed groups:

**DOORS & FRONTS** — ADD DOORS · door count (fixed by F3) · SPLIT DOOR (top
segment).
**THE CARCASS WEARS** — PLINTH · CORNICE 40/70/100 · TOP INFILL · END PANELS
**L / R / BOTH** · SCRIBE FILLERS AT THE WALL · **SERVICE CUT-OUT (greyed)**.
**ADDITIONS** — ADD TOP BOX · ADD ANOTHER WARDROBE.

- **PLINTH is a typed field, 50–150 mm for wardrobes.** NONE is deleted —
  the owner: *"none nie działa"* and the plinth is always there; only its
  height is the question. Bounds live in `profile.js` as the plinth law,
  with the kitchen's own key beside it (**80–150**) for the day the kitchen
  ships — written now, read by nobody yet, one comment saying so. Out-of-range
  refusal under the field, engine's sentence.
- **LIGHTS leaves EXTRAS** — its home is the view-bar button and the docked
  panel. One entry.
- END PANELS L/R/BOTH and SCRIBE FILLERS come from the right-click menu into
  this group, calling the same store paths (one law, the menu's copies of
  these rows die — see F9).
- **SERVICE CUT-OUT** — the owner's new function (a cut-out for pipes or a
  box): a greyed row, "Coming soon", per the no-dead-controls law (greyed
  WITH reason is the lawful form of "martwa narazie"). No geometry tonight.

**Proof**: `f5-*.png` — the three groups; plinth at 50 and 150 and a refused
40; the greyed cut-out; EXTRAS without LIGHTS.

## F6 · HINGE ASSIGNMENT LEAVES THE RETAIL DOCK

Owner: *"wybór hinges to nie jest dobry pomysł, nie tutaj — zostaw w PRO."*

- In the retail dock, the door editor's ASSIGN OTHER HINGE select and the
  hinge-height row list go behind `RETAIL_SHOW_WORKSHOP_TOOLS=false` —
  hidden, not cut; PRO untouched; fidelity green. The client keeps handle
  choice and the door's plain facts.

**Proof**: `f6-*.png` — the retail door editor without the hinge block; PRO
with it.

## F7 · LIGHTS ON, NUMBERS OFF

Owner: *"jak włączasz światła, to niech znikają wymiary; wyłączysz lights, to
wracają."*

- Turning the light ON hides the dimension overlays (chains, hover, labels);
  OFF restores the flags exactly as they were (remember, don't reset). The
  view-bar dimension buttons reflect it and stay honest.

**Proof**: `f7-*.png` — lit scene with no numbers; unlit with them back.

## F8 · FRONTS — ONE ROAD

Owner: *"z menu front usuń COLLECTION proszę, i MORE OPTIONS — po co mi dwa
razy ta sama opcja."*

- The COLLECTION block and the MORE OPTIONS style-gallery duplicate leave the
  FRONTS step. The STYLE list at the top (T66 F4) is the one road; the
  collections live where they entered (landing/URL presets, F1's law). Any
  control that existed ONLY there re-homes and is named; duplicates die.

**Proof**: `f8-*.png` — FRONTS short and single-voiced, before/after.

## F9 · THE RIGHT-CLICK MENU SLIMS TO PLACEMENT

Approved: six actions stay — **Rotate 90° · Back to wall · Side to wall ·
Rename · Save as template · Delete**. Everything else in that menu dies or
is already homed: infill/cornice/panels/scribe → EXTRAS (F5), colour →
FRONTS/INSIDE, edit → the dock, drawer fronts/center shelves → the dock.
Each removed row named in the PR with its new home.

**Proof**: `f9-*.png` — the menu at six rows.

---

## TESTS AND PROOF

1. Full suite, never `--silent`; freeze test unchanged and green; goldens ×6
   IDENTICAL; parens 14/14; classifier clean.
2. New: the three-door style law (all orders, identical geometry); H3325 on a
   fresh design with and without a collection; undo/redo round-trip; door
   count 2 → equal leaves after any split; divider position via field and
   drag = one setter; plinth bounds and the kitchen key unread; LIGHTS
   hiding/restoring dimension flags; FRONTS single road (no COLLECTION
   block); the right-click menu's six rows; hinge block absent in retail
   dock, present in PRO.
3. Walk + frames per F, plus the lazy run, `verify/t68/lazy-*`.

## LICENSED REMOVALS

- PLINTH "NONE" and its writer.
- LIGHTS from EXTRAS (moves, not dies).
- The COLLECTION block and MORE OPTIONS gallery from FRONTS.
- The right-click rows beyond the six, each named with its home.
- Nothing else. Tombstones two lines max.

## BALANCE

Per F files/lines; the probe verdicts (F1, F3, F4) quoted; how many write
paths set the front style (one), move a divider (one), set a plinth (one);
where the kitchen plinth key sits unread.

## SKIP-AND-NOTE ORDER

F9 → F6 → F8 → F7 → F5 → F4 → F2 → F3 → F1.
F1 is the turn's reason and is not skipped; F2 is "mega ważne" and is not
skipped.