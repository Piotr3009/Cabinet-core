# CLAUDE.md — TURN 48 · THE FLOOR IS LAW, THE INFILL IS A BOARD, AND THE LED FINALLY REACHES THE SHEET

The owner, 25.08.2026. His rulings, verbatim law:

* **The floor.** *"zaden element nie moze spasc ponizej podlogi — fizycznie
  to sie wyklucza."*
* **The top infill.** *"zamiast L shape … pomyslem zeby na wizualizacji
  tylko zrobic jedna deske jak plinth i tyle. … infill pionowy nie ruszamy.
  natomiast na CNC robisz tak: dlugosc infila poziomego nad szafa = rysujesz
  2 deski = dlugosc infila x 60 mm, plus 20 mm dluzsze na odciecie, z jednej
  strony."* On the widths: *"zostaw jedna 60 a druga nominal 80 bez zmian."*
  On the corner: *"jak zakreca i mamy infill z boku to sie robi mitre, ale
  to rzadko."* And: *"nie rob adnotacji — stolarze wiedza."*
* **The plinth.** Default ON — standing carcasses only, never a hung WUD.
* **The LED groove.** Longer than the profile by **10 mm at EACH end**
  (+20 overall) — *"zaokraglenie bita, nikt nie chce uzywac dlutka na
  rogach."* And it must reach the CNC sheet at last.
* **The LED button.** *"mamy przycisk dodania LED, to i ten sam przycisk
  usuwa LED — proste."*
* **The dimensions.** Constant size on screen: *"zeby zawsze wymiary byly
  takie same niezaleznie jak bardzo sie odsuniemy od mebla."*

Nine features. One sacrifice allowed, named at the bottom. F1 and F2 are
engine work and go first, so the whole night stands on green goldens.

## Iron rules (binding)

1. **Zero-stop overnight.** PR before morning regardless. Sacrifice, first
   and only: **F9** (the CNC label clipping). **F1–F8 never fall.**
2. **BYTE-IDENTITY.** `t48-classify` (copy `t47-classify.mjs`, runnable
   from inside `scripts/` with its relative imports intact): six IDENTICAL,
   UNNAMED=0. The six goldens carry no infill run, no LED and no slope, so
   nothing here may move them. **F1 is the one that could:** if the floor
   clamp shifts a golden, that golden HAS a part below its own floor today —
   that is a FINDING, not a licence. STOP that feature, write the finding
   into the PR, and ship the clamp gated so the goldens stay byte-identical
   until the owner rules.
3. **LISP IS LAW — FIRST, where a LISP owns the ground.** F4's law is born
   in `reference/lisp/KIT_LED_GROOVE.lsp` before any JS. **No other LISP
   file is touched** — the infill has never had a drawing law of its own
   and two plain rectangles need none; say so in the PR. Paren balance
   13/13 at 0/0 by script.
4. **Sanctity, with ONE named licence.** The top infill's L-shaped
   geometry — the face+arm single part and `chamferedRectGeometry`'s
   corner mitre on INFILL-T — **dies**, by the owner's ruling quoted
   above. Every test that guarded the L updates to the new law with an
   OVERRULED note and the quote (the house pattern from 25.08's dog-bone
   fix). Nothing else is deleted or reshaped.
5. **Suite in full at every commit, never `--silent`. One commit per
   feature. Zero new dependencies. No SQL. Modals draggable and beside.
   English copy. Every screenshot LOOKED AT — and `verify/t48/` includes a
   frame WITH the infills in view: 25.08's lesson, a turn that never
   photographed the part that was wrong.**

---

## F1 [CRITICAL] — the floor is law

One law in the engine, not two patches: **no element's box may reach below
the carcass floor.** The shoe shelf and the drawer land inside the bottom
today (owner's finding); the law catches them and every element anyone
adds later, in ONE place — the same station that places an element in its
zone (`centredShelfPos`'s neighbourhood), clamped so the element's LOWEST
point sits at or above the carcass's own floor (the bottom panel's top
face).

* The clamp states itself: when it moves an element, the element's record
  says so (`meta.floorClamped: true`) so a later turn can see which ones
  the law caught.
* Prove it: a shoe shelf and a drawer asked for at y = 0 land ON the
  floor, not in it; an element already legal does not move by a
  hundredth; the six goldens are byte-identical (rule 2's stop applies).

## F2 [HIGH] — the top infill is a BOARD, and the sheet cuts TWO

The owner's whole ruling, executed on every layer at once — the PARTS are
the truth, the scene shows the ASSEMBLY:

**The engine emits TWO plain rectangles** where INFILL-T lives today:

```
INFILL-T-A : (runLen + 20) × 60                       — the face board
INFILL-T-B : (runLen + 20) × (80 + oversize as today) — the shelf board
```

* `60` is the face's own arithmetic as it stands (nominal 40 + the wall
  oversize 20) — keep it AS ARITHMETIC, never a bare 60, so a project
  with another infill width still computes itself. The shelf keeps
  nominal 80 and its existing width oversize, unchanged.
* **+20 on the LENGTH, ONE end** — the site-cut allowance, on the end
  where the run meets its neighbour (the turning corner or the wall);
  state which end in the part's own record
  (`meta.lengthOversize: { mm: 20, end }`). **NO new annotation text** —
  *"stolarze wiedza"* — the existing oversize record is enough.
* **The corner L is GONE from the geometry**: no face+arm single part, no
  45° corner mitre inside a piece. `mitre_45` survives ONLY where two
  RUNS meet — the turning corner the owner named as rare, and the
  segment-to-segment joins a bent ceiling makes (their angles exactly as
  T47 left them).
* **CNC / DXF / BOM speak in the two boards** — two outlines, two labels,
  two rows. The cut list prices two pieces.

**The scene shows ONE board, like the plinth**: the face board, its face
in the plane of the fronts, full run length. Under a slope it leans with
the tilt mechanism shipped 25.08 — one plain board, one lean, which is
the whole point of this ruling. The shelf board exists in the data and on
the sheet, not as a second body in the room.

**The side infills are untouched.** Not one line.

Update the L's guards (`test/turn47-f4`, `turn15-infill-mitre`,
`run-infill`, `autoparts` where they touch INFILL-T) to the new law, each
with the OVERRULED note and the owner's quote.

## F3 [HIGH] — the plinth defaults ON, standing units only

New STANDING carcasses (BUD, BUDR, SINK, LOW, BUDTALL, FRIDGE, WARDROBE)
arrive with the plinth ON. A hung WUD never grows one. **The switch lives
where a new unit is BORN (the store's create path), not in the engine's
defaults** — the goldens read those defaults and must not move by a byte.
An existing project opens exactly as it was saved.

## F4 [HIGH] — LISP first: the groove outgrows the profile by 10 each end

`KIT_LED_GROOVE.lsp` learns the law: **the slot runs the profile's length
plus 10 mm at EACH end** (+20 overall) — the cutter's radius is why, and
the owner said it in one line: nobody chisels a corner. The constant
lives in the LISP header the way `centrelineExtra` does, named, with the
ruling quoted. `src/lib/ledGroove.js` follows it, and
`test/turn45-f9-cnc-the-groove.test.js` holds the two to each other as it
always has.

## F5 [HIGH] — the groove reaches the sheet (T45's named debt, paid)

The groove `lib/ledGroove.js` computes finally lands on the panel it is
cut into: a pocket on the panel's CNC record, on the layer
`ledMakeLayers` declares, through to the DXF and the CNC preview. Gated
on the strip existing — a project without LED moves nothing. Prove the
rectangle against the LISP's own, F4's +10s included.

## F6 [HIGH] — one button: the LED toggles

The control that adds a strip removes it when one is there — same button,
its label honest both ways (`Add LED` / `Remove LED`). No second control,
no hunting in a panel. The store's `removeLightingItem` already exists;
this wires the button, not a new mechanism.

## F7 [HIGH] — `top_under` gets its own picture, and its light points down

`LightArt` has no branch for `top_under` — the variant falls through to a
neighbour's drawing and shows a strip washing UP over the cabinet
(owner's screenshot). Draw its own: the strip UNDER the top board, inside
the carcass, washing DOWN. **And verify the 3-D emission for the same
variant** — if the light itself points up, fix it here, named in the PR.

## F8 [HIGH] — dimensions hold their size on screen

`DimLabel` is a sprite at a fixed SCENE size, so distance scales it —
tiny far away, huge up close (owner's finding). Scale it against camera
distance so the label holds a constant PIXEL size. ONE file — every
consumer (ruler, hover, chains, room, unit view) inherits the fix, which
is why `DimLabel` exists. Mind the capture path (`renderCapture`) and any
orthographic camera: constant means constant everywhere. Prove it the
only honest way: two screenshots of one scene, far and close, the label
the same height to the pixel — both in `verify/t48/`.

## F9 [MEDIUM] — the CNC label never clips into a lie

A narrow board's label truncates: `TOP-1` shows as `TOP~`, `260.9x540` as
`260.9x5~` — and 5 is a number a joiner will read (owner's audit finding,
25.08). A label that does not fit its part breaks the line or steps
outside the outline with a leader — **it never cuts a digit**. Preview
only; the DXF text is already whole.

## Execution order

`F1` → `F2` → `F3` → `F4` → `F5` → `F6` → `F7` → `F8` → `F9`. Engine
first (F1, F2) on green goldens; the LISP law (F4) before its application
(F5); the eyes' features last.

## What this turn does NOT touch

The six goldens' bytes. The side infills. The wizard (T49 owns it). The
slope kits and the sides' LISP gate (named debt for the next slope turn).
The drawings system. The runners, the rail, the `cc_*` schema — **no SQL
this turn**. `KIT_LED_GROOVE.lsp` is the only LISP file that moves.

## Morning audit will run

Fresh clone → install → suite (never `--silent`) → build → `t48-classify`
(six IDENTICAL, UNNAMED=0 — with F1's stop honoured if it fired) → paren
13/13, only `KIT_LED_GROOVE.lsp` moved → the floor probe (elements asked
below the floor land ON it) → the infill probe (TWO rectangles on the
sheet, arithmetic not bare numbers, +20 on one stated end; ONE board in
the scene, leaning under a slope) → the groove probe (LISP rectangle =
sheet rectangle, F4's +10s included) → the two dimension screenshots
measured against each other → every screenshot LOOKED AT, infills in
frame → verdict → the numbered eye-test list.