# CLAUDE.md — TURN 60 · PBI R2: THE ROOM GETS ITS HANDS — VIEW BAR, ELEMENT MENUS, PARITY

Run autonomously. Zero questions, zero stops. Skip-and-note; sacrifice F6,
then F5 — NEVER F1/F2/F3/F4. PR before morning. Branch `t60`.

**SAFETY FIRST: this file's first heading says TURN 60. BASE: `origin/main`
WITH t59 MERGED (`src/retail/` exists, the four-column design room runs). If
it does not, stop and say so in the PR.**

## THE OWNER'S BRIEF, VERBATIM

After the first live look at the design room (31.08), numbering the screen
by the agreed names — TOP BAR (1) · RAIL (2) · OPTIONS (3) · VIEW BAR (4) ·
STAGE (5) · STAGE HINT (6) · DETAIL (7):

- *"nr 2 może być spokojnie 15% węższe"* → the RAIL narrows.
- *"nr 3 zostaw jak jest"* → OPTIONS untouched this turn.
- *"nr 4 musi być identyczne jak mamy w PRO, identyczne ma mieć funkcje"* →
  the VIEW BAR gets PRO's view tools, one for one.
- *"6 bez zmian, ale dodaj nazwę itemu"* → the STAGE HINT also names the
  selected item.
- *"numer 7 to już musi być detalistyczne menu — jak naciśniemy na drzwi to
  się pojawi drzwi, jak na szafę to na szafę, jak na półkę to półkę.
  Wszystkie modale które mamy w PRO muszą się tutaj pojawiać. Nie możemy
  zostawić nikogo żeby sobie wybrał coś co nie działa. Nie może być
  możliwości nieprzesunięcia się półki czy coś innego — to głupie."*
- *"wszystkie funkcje muszą się pojawić w retail te co w PRO, tylko inaczej
  poustawiane i inaczej poukładane — bardziej wizualnie."*
- And on size: *"ludzie mają małe komputery, laptopy, iPady — będzie do dupy
  widać jak wszystko będzie 25% większe."*

## ONE DOUBT, RAISED ONCE, BEFORE THE WORK (and then executed)

"Identical to PRO" is taken as: every VIEW tool, one for one. Three PRO bar
entries are NOT view tools but the workshop and the owner's costs — **BOM,
Check, CNC/Export** — and a client must not read them. They are therefore
absent from the retail bar, behind a single flag
(`RETAIL_SHOW_WORKSHOP_TOOLS = false` in `src/retail/config.js`) so one word
from the owner turns them on. Everything else in the bar is PRO's, exactly.

## STANDING LAW (unchanged, enforced)

- **PRO IS FROZEN.** The t59 assertion stands: `git diff` on `index.html`,
  `src/App.jsx`, `src/main.jsx`, `src/components/**`, `src/pages/**` is
  EMPTY, and PRO's module graph contains no `src/retail/` file.
- **THE IRON BOUNDARY.** `src/retail/**` imports only from `src/retail/**`,
  `src/engine/**`, `src/3d/**`, `src/stores/**`. **A PRO component is NEVER
  imported into retail — it is RE-IMPLEMENTED in retail's own language**
  (this is the price of two faces on one brain, and it is paid deliberately:
  PRO's modals are 1000-line workshop instruments; the client needs the same
  DECISIONS in a fraction of the surface).
- **THE LAW IS THE ENGINE'S, NOT RETAIL'S.** Every option's bounds,
  defaults and refusals come from the profile and the engine
  (`src/engine/**`) through `src/retail/design/adapter.js`. Retail never
  types a limit, never invents a reason, never hard-codes a millimetre.
- **BYTE-IDENTITY.** Engine untouched → goldens byte-identical,
  `t60-classify.mjs` = ZERO deltas, `UNNAMED=0`, `NAMED=0`. LISP untouched,
  census 14/14.
- **NO DEAD CONTROL.** Owner's rule, and it governs this whole turn: a
  control that cannot act must not be shown as if it could. Either it acts,
  or it is disabled WITH the engine's own one-line reason. The string "No
  options for this element yet" is DELETED (licensed) — an element with no
  menu is simply not selectable.
- **PETROS DESIGN SYSTEM IS LAW.** Twelve tokens, 72/23/5, radius 0, gold in
  hairlines only. **Engine numbers do not enter the UI without the owner's
  order** — the element menus expose CHOICES, and where a millimetre must be
  set, ONE slider, labelled in words.
- **Sanctity — licensed deletions this turn:** (1) the "No options for this
  element yet" placeholder and its branch; (2) nothing else.
- No new npm dependencies. Full suite never `--silent`. Every claim about a
  screen ends in a frame under `verify/t60/`.

---

## F1 [CRITICAL] · THE SCALE LAW — ONE NUMBER, EVERY DIMENSION

The owner is right that nothing adapts today: t59 wrote pixels
(220 / 320 / 300 columns, 11–15px type). He is also right that a flat −25%
is wrong — it would be cramped on his monitor and still too wide on a
laptop. So: **one scale, derived from the viewport, and every dimension
derived from it.**

1. `src/retail/styles/scale.css` defines

       --pbi-scale: clamp(0.78, calc(0.78 + (100vw - 1280px) * 0.00017), 1);

   i.e. 1.0 at 2560px (the owner's monitor — the reference width, named in
   a comment), ≈0.86 at 1728, 0.78 at 1280 and below. The design room reads
   `--pbi-scale`, the marketing pages keep their own rhythm.
2. EVERY dimension in the design room is `calc(<base> * var(--pbi-scale))`:
   column widths, type sizes, chip and button heights, paddings, gaps, the
   gold line. No bare pixel survives in the design-room CSS — a test greps
   for `px` outside the token and scale files and fails on a raw dimension
   (allowing 1px borders and 0).
3. **The RAIL narrows 15%** at the same time: its base becomes 187px
   (220 × 0.85), and it scales like everything else.
4. Type floor: no rendered text below 11px at scale 0.78 — pick bases so
   the smallest (STAGE HINT, chip labels) land at 11–12px there.

Frames: `verify/t60/f1-scale-2560.png`, `f1-scale-1728.png`,
`f1-scale-1280.png` — each shot in its OWN browser window at that width
(the t59 walk's lesson 5: device-metrics emulation does not move
`window.innerWidth`).

## F2 [CRITICAL] · THE VIEW BAR (4) — PRO'S TOOLS, ONE FOR ONE

Read PRO's bar in `src/components/` and reproduce its VIEW tools in
retail's own component, with PRO's labels, PRO's order, PRO's toggle
semantics and PRO's tooltips (the copy is already written — reuse the
wording, not the component):

    Show/Hide dimensions · Front dimensions · Outlines · X-ray ·
    Hide fronts · Measure · Open all / Close all · Lights ·
    Reset view · ⛶ full screen

- Each entry acts on the SHARED store exactly as PRO's does — if the flag
  lives in `uiStore`, retail flips the same flag; if PRO's version needs a
  shared-core option that does not exist, add it additively with PRO's
  behaviour as the default and LIST it in the report.
- Absent behind the flag (the doubt above): BOM · Check · CNC/Export.
- Styling is PBI, not PRO: UI font, uppercase, tracking, hairline
  separators, active entry in Deep Gold with a Champagne underline.
- `Measure` gets its full behaviour (two clicks, a distance) — if that is
  larger than the night allows, it is the ONE entry that may ship disabled
  with the reason "coming shortly", and it must be named in the report.

Tests: every bar entry maps to the same store flag PRO uses (a table test);
the three workshop tools are absent while the flag is false. Frames:
`verify/t60/f2-viewbar.png`, `f2-viewbar-xray.png`,
`f2-viewbar-fullscreen.png`.

## F3 [CRITICAL] · THE DETAIL COLUMN (7) — A MENU FOR EVERY ELEMENT

The heart of the turn. Clicking a thing in the STAGE opens ITS menu in
column 7 — and every control in it WORKS.

### The selection law

Retail reads the shared selection the engine and stores already keep. For
each selected kind, retail owns a small component in
`src/retail/design/detail/`. The router is a table
(`kind → component`), so an unmapped kind cannot render an empty panel —
it is not selectable in the first place (the picker skips it, the cursor
does not change, nothing highlights).

### The menus this turn — each one re-implemented, not imported

Read the PRO modal named beside each for its LAW (bounds, refusals,
wording), then write the client's version: chips for choices, at most one
slider where a millimetre is genuinely the owner's decision, the engine's
own reason under any disabled control.

1. **WARDROBE (the unit)** — from `UnitSizeModal`, `UnitFinishModal`,
   `CabinetEditorModal`: width · height · depth (sliders bounded by the
   profile) · doors (chips) · bays (chips) · plinth (chips) · carcass decor
   and front decor (swatches, from `DecorPickerModal`'s catalogue) ·
   RENAME (the design's name — feeds F4).
2. **DOOR** — from `DoorModal`: hinge side (chips; when the slope forces
   it, the serif line "opens from the slope" and the chips disabled with
   that reason) · front style (slab / shaker / j-pull chips) · handle
   (chips from the handle systems the engine offers; j-pull disables the
   others by the T57 law) · J run length (the ONE slider, from
   `JpullRunModal`) · open / close this door.
3. **SHELF** — the owner's own example, and it must move: height (slider
   within its bay's opening — the engine's own limits) · CENTRE THIS BAY
   (button → the T58 per-bay law) · REMOVE. A shelf that cannot move
   (pinned by a divider, T58) says so in one line and shows no slider.
4. **DRAWERS (the stack)** — from `CabinetEditorModal`'s drawer work: how
   many (chips) · top-drawer insert (chips none / watches / belts / shoes,
   with the watch⇄shoe and top-of-stack refusals in the engine's words) ·
   glass top (chips, disabled with "needs a watch insert") · front heights
   (one slider for the stack's split, if the engine exposes it; otherwise
   omit — never a fake control).
5. **HANGING RAIL** — from `RailModal`: single / double (chips) · height
   (slider within the engine's range) · REMOVE.
6. **WATCH DRAWER** — from `WatchLayoutModal`: layout (the four chips
   Classic / Cufflinks / Ties / Belts with their line drawings) · glass ·
   finish (Project / Sprayed, the T58 pair) · REMOVE.
7. **SHOE DRAWER** — ramp and two dividers are fixed law (T58): the menu
   shows what it is in words, plus REMOVE. No invented options.
8. **PULL-DOWN RAIL** — position (slider) · REMOVE; under a slope it is
   not addable at all and the INTERIOR list already says why (T58).
9. **LIGHTING** — from `LightingPanel`: strips on/off per shelf when one is
   selected, pane light when a glass pane exists. No engine numbers.

Every menu ends with DONE (back to the ESTIMATE duty). Every REMOVE goes
through the store's own remove, and the STAGE updates live.

### The rule that governs all nine

**No dead control.** Before rendering any control, retail asks the adapter
whether it can act; if not, the control renders disabled with the engine's
reason beneath it. The deleted placeholder (licensed) must not come back in
another wording.

Tests (`test/turn60-f3-the-element-menus.test.js`): for each of the nine
kinds — the router resolves it; every control's adapter call produces the
expected engine params; every disabled control carries a reason string that
came from the engine; a shelf pinned by a divider offers no height slider;
an unmapped kind is not selectable. Frames: `verify/t60/f3-door.png`,
`f3-shelf.png`, `f3-drawers.png`, `f3-wardrobe.png`, `f3-watch.png`.

## F4 [HIGH] · THE STAGE HINT (6) — AND THE ITEM'S NAME

Unchanged copy, plus the selected item's name, in the same line, after a
hairline separator: `DRAG TO ORBIT · SCROLL TO ZOOM · CLICK AN ELEMENT FOR
DETAIL │ BEDROOM WARDROBE — LEFT DOOR`. The name comes from the design's
own name (the client may rename the wardrobe in F3.1) plus the element's
plain-English kind. Nothing selected → the design's name alone. Frame
`verify/t60/f4-hint.png`.

## F5 [MEDIUM] · THE PARITY MAP — WHAT PRO STILL HAS THAT PBI DOES NOT

The owner wants every PRO function present in retail, differently arranged.
That is more than one night: PRO carries 26 modals and a 1141-line element
panel. So this turn ALSO produces the map that makes the remaining turns
cheap: `verify/t60/parity-map.md` — a table of every PRO modal and panel,
with: its purpose in one line, whether a client needs it (yes / no —
workshop / later), where it landed in PBI (or "not yet"), and the engine
functions it drives. This file is the spec source for T61+. No guessing:
every row read from the code.

## F6 [MEDIUM] · THE ESTIMATE DUTY KEEPS UP

Column 7's default duty (the estimate list) gains what F3 made possible:
each design row shows its NAME (renamable), its headline choices, and
selecting a row makes that design the one on the STAGE. Everything else
(quote form, save, load, add another) stays as t59 built it.

---

## ORDER, PROOF, REPORT

**F1 → F2 → F3 → F4 → F5 → F6.** F3 is the turn; if the night runs short,
its nine menus are delivered in the order listed (wardrobe, door and shelf
are the owner's named examples and must all land).

Proof: full suite green; `t60-classify.mjs` zero deltas; PRO frozen-files
assertion empty; boundary walker green; the no-raw-px grep green; every
frame listed above, each width in its own browser.

Morning report, numbered: per feature done/skipped; the nine menus with
which PRO modal each was read from; shared-core options added (name,
default, why); the licensed deletion confirmed; the parity map's headline
counts (how many PRO surfaces the client needs, how many landed);
`+X/−Y`; test totals; classifier verdict.