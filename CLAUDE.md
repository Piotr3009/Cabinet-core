# CLAUDE.md — TURN 67 · THE ROOM IN ONE WINDOW, AND THE FIRST NAMED CUTS INTO PRO

Run autonomously. Zero questions, zero stops. Skip-and-note. PR before morning.
Full suite, never `--silent`. Frames under `verify/t67/`.
**The session never halts**: "stop" means "stop that one feature", never "stop
the night".

## THE EVENT OF THIS TURN — PRO IS CUT OPEN, NARROWLY, BY NAME

The owner, asked whether PRO may change: *"tak, zdecydowanie potwierdzam."*
This is the FIRST edit to `src/components/**` since the T59 freeze. The law:

- ONLY the files named in F1 and F9 may change in PRO, ONLY as described.
- The freeze test is AMENDED, not weakened: it exempts the named files by
  path, carries the owner's quote as the reason, and after the night's edit
  it re-freezes them at their NEW hashes. Every other PRO file stays guarded
  at byte level. The PR body lists old hash → new hash per exempted file.
- Anything beyond the named files: skip-and-note, never touch.

Other standing laws: **1:1 = COPY** (a PRO change is mirrored into its retail
copy the same night, so fidelity tests stay green by both sides matching);
**the lazy client**; **one editor on the right**; goldens ×6 byte-identical.

## LICENSED FILES

- PRO: `src/components/RoomModal.jsx` (F1) · the "Watch drawer" label sites —
  find them by grep, name each in the PR (F9).
- Engine/lib: `src/engine/room.js`, `src/lib/wallElements.js`,
  `src/lib/slopeLine.js` (F2 corner law only) · `src/engine/profile.js`
  (F5 default decor, F11 LED cap — keys and defaults only).
- `src/3d/` only if F11's brightness lives there — one file, named.
- Retail: as needed. Nothing else anywhere.

---

## F1 · ROOM SETUP — PLAN ON TOP, ELEVATION BELOW, ONE WINDOW

Owner's mockup got the green light. One modal, both apps:

- **Top: PLAN (top view).** The room drawn from above, every wall a CLICKABLE
  segment; the active wall highlighted and labelled ("Wall 1 · 4000"). Beside
  it: RECTANGLE · DRAW ROOM… · IMPORT DXF PLAN… and the WALL HEIGHT field.
  Windows and doors show as marks on their walls.
- **Below: the ELEVATION editor — the existing `WallElevationModal`,
  UNCHANGED** (owner: *"który jest super, nie zmieniaj"*), docked into the
  same window, showing whichever wall the plan click chose. Front/Top toggle,
  PUT ON THE WALL, ON THIS WALL — all as they are.
- Click a wall in the plan → the elevation below swaps to it, in place.
- **L-SHAPE and + BOX preset buttons are REMOVED** from the modal (owner:
  furniture lives on 1–3 walls). The engine's `L_SHAPE` unit type and box
  records are untouched — only the two buttons go.
- **DRAW ROOM must work.** Hypothesis to verify first: retail's copy carries
  the button but `DrawRoomModal` never entered the recursive copy (lazy
  import). If so, copy it by the method; if not, write down the real cause,
  then fix. In PRO, verify it still opens from the new layout.
- PRO gets this shape in `RoomModal.jsx` (the named exemption); retail's copy
  is re-copied from the edited PRO file the same night — method as T62:
  verbatim, repoint, reskin. It should look LIKE TODAY in skin — the owner:
  *"podobnie do dzisiaj, ale z layoutem uzgodnionym w mockupie"*.
- Entries unchanged: WHERE → EDIT THE ROOM (retail), PRO's existing routes.

**Proof**: `verify/t67/f1-*.png` — the window in PRO and in retail; wall 2
clicked and the elevation swapped; DRAW ROOM open; no L-SHAPE, no BOX.

## F2 · THE CORNER LAW — ONE CEILING, SO HEIGHTS AGREE

Owner asked: a slope on the front wall — does the side wall show low at the
shared corner? Today: no; each wall's slope is private. He ordered yes.

- New law in the engine/lib (named files above): **at a shared corner, both
  walls have the same height** — `wallHeightAt(wall, at-the-corner)` of one
  equals the other's at that same corner. A slope running INTO a corner pulls
  the neighbour's height at that corner down; the neighbour renders a level
  drop or its own implied slope from its full height to the corner height,
  whichever the geometry states — derive it, don't invent: the ceiling is one
  plane where the slope says it is.
- The elevation editor shows the implied profile on the neighbour read-only
  (it is a consequence, not an element on that wall); the 3D room draws it.
- Scope guard: the corner law lives OUTSIDE the cut path. Goldens must not
  move; the classifier proves the deltas cannot reach a fixture.
- Tests: slope R run 900 on wall 1 of a 4000×2500 room → wall 2's height at
  the shared corner equals wall 1's end height (1800 in T65's fixture);
  no slope → both corners full height; two slopes meeting in one corner →
  the lower wins (one ceiling cannot be two heights).

**Proof**: `verify/t67/f2-*.png` — the 3D room with the neighbour visibly low
at the corner; the neighbour's elevation showing the implied profile.

## F3 · WHAT — A CLEAN LIST AND ONE QUIET NOTE

Owner: *"te napisy pod przyciskami daj jedne pod spodem, chcę mieć ładną
czystą listę … reszta nieczynna: przycisk, jak najedziesz, napis coming soon
i send email to make order, email do skopiowania."*

- The per-tile "Made to order — ask us for a quote" lines are DELETED. One
  note stands under the list (the existing closing paragraph absorbs it).
- Inactive tiles: hover/focus shows a small tooltip-card — "Coming soon —
  email us to order: **Cabinetcore@gmail.com**" with a copy affordance
  (click copies the address, shows "Copied"). Keyboard-reachable, one
  implementation for all inactive tiles.

**Proof**: `verify/t67/f3-*.png` — the clean list; the tooltip open; the
copied state.

## F4 · THE SOURCE BUTTON SAYS "DECOR"

Owner: *"nie wpisuj Egger w przycisku głównego menu … nie laminat, bo będzie
że cheap."* Decision: **DECOR**.

- Retail panels (INSIDE carcass row, FRONTS colour row): the source chip that
  read EGGER/Laminate reads **DECOR**. The Egger name stays INSIDE the picker
  window, on the boards themselves, where it is information. PRO's own panels
  are untouched (the workshop may say Egger).
- The label change happens in retail's own chrome (chips/slot), never inside
  a copied file's markup.

**Proof**: `verify/t67/f4-*.png` — both rows showing DECOR; the picker open
with Egger visible on tiles.

## F5 · THE DEFAULT DECOR IS H3325 GLADSTONE OAK

Owner: *"default Egger to H3325 Gladstone Oak."*

- Fresh-design default carcass (and inside) decor: **H3325 ST28 Tobacco
  Gladstone Oak** — the real bucket row (it exists; T63's frames showed it).
  Fronts stay RAL 3005 sprayed. Profile default keys only; REVIEW, estimate
  and saved items carry it as they carry today's.

**Proof**: `verify/t67/f5-*.png` — a fresh design, front view; REVIEW naming
H3325.

## F6 · INSIDE COLOUR — THE DUPLICATE DIES

Owner, circling it on the screenshot: *"to już niepotrzebne … to jest
zdublowanie funkcji."*

- The INSIDE COLOUR row (SAME AS FRONTS · WHITE · CHOOSE…) is DELETED from
  INSIDE. The carcass DECOR slot above it is the one law for what the inside
  wears. Any store state only that row wrote is retired with it — read the
  writers first; if the engine consumes an inside-colour field, the carcass
  picker now writes it, one path, named in the PR.

**Proof**: `verify/t67/f6-*.png` — INSIDE without the row; the carcass picker
changing the visible interior in 3D.

## F7 · THE LEFT COLUMN STAYS FOLDED — EDITING LIVES ON THE RIGHT

Owner, on the screenshot of INSIDE grown long: *"jak dodajesz szuflady, to
się nie powinny pokazywać pod spodem, tu menu po lewej ma być puste — powinno
się pokazywać po prawej … te funkcje niech przejdą na prawą stronę."*

- After adding drawers (or anything), the INSIDE row shows ONLY the row and
  its count ("Drawers · 3"). No HOW MANY chips, no TOP DRAWER INSERT, no
  GLASS TOP, no FRONT HEIGHTS expanding beneath it in the column.
- Those controls live in the docked right editor for the clicked element —
  where PRO's copied editors already put them. Where T66 re-homed a thin
  menu's control INTO the column (OverlayMenu's HOW MANY), it moves onward to
  the right: clicking the row header selects the stack and docks its editor.
  Count chips may stay in the column ONLY if the owner's screenshot shows
  them today at the top level — it does not; they go right.
- The column's job is add/remove and counts at a glance. One sentence law:
  **left adds, right edits.**

**Proof**: `verify/t67/f7-*.png` — INSIDE with drawers added and the column
short; the same stack's controls docked right.

## F8 · THE RIGHT LIST IS NAMES, NOT SENTENCES

Owner: *"po prawej się pokazuje każda szuflada jako fitted — nie powinna,
tylko nazwa."*

- The docked editor's drawer list shows each drawer by NAME (Drawer 1,
  Drawer 2, Accessories drawer). The per-drawer "fitted — its height is set
  by what goes in it" sentences leave the list; the explanation appears only
  when THAT drawer is clicked, in its own detail, once.
- Mechanism: the dock's display layer (the same layer that hides workshop
  fields), never the copied markup.

**Proof**: `verify/t67/f8-*.png` — the list as names; one drawer open with
its sentence.

## F9 · "ACCESSORIES DRAWER" — IN PRO TOO

Owner: *"watches szuflad jest bez sensu … tam będzie watches, belts, ties,
cufflinks, biżuteria."* Decision: **Accessories drawer**, and *"zmień w PRO
też tę nazwę."*

- Grep PRO for the user-facing "Watch drawer" label (AddItems row,
  WatchLayoutModal title, ElementProperties, hints) — CHANGE THE LABEL at
  each site, nothing else on the line. Each file joins the freeze exemption
  list with old→new hash. Engine identifiers (`watch_drawer`, WATCH_LAYOUTS)
  are NOT renamed — labels only, the cut path knows nothing.
- Retail copies are re-copied/re-synced so both sides say "Accessories
  drawer" and the fidelity tests stay green by agreement, not by a map.
- The insert names (WATCHES · BELTS · SHOES…) stay — they name contents.

**Proof**: `verify/t67/f9-*.png` — PRO and retail both showing the new name;
the grep in the PR body proving no user-facing "Watch drawer" remains.

## F10 · THE ACCESSORIES LED COMES DOWN TO 25%

Owner: *"kolor podświetlenia szuflady accessories: zmniejsz jasność do 25
procent … nie więcej niż 25 procent od teraz."*

- Find where the accessories (watch) drawer's aimed LED sets its intensity
  (the drawer's own light, not the room rig). Set it to **25% of its current
  value**, and cap it there — a named profile key with a comment carrying the
  owner's sentence, so no later turn "improves" it back.
- The room rig (T66's 0.60 baseGain) is untouched.

**Proof**: `verify/t67/f10-*.png` — the open accessories drawer before/after.

---

## TESTS AND PROOF

1. Full suite green, never `--silent`. The AMENDED freeze test green: named
   exemptions re-frozen at new hashes, everything else byte-guarded.
2. Goldens ×6 byte-identical; `UNNAMED=0`; parens 14/14 at 0/0;
   `t67-classify.mjs` naming every engine/lib delta and proving none reaches
   a fixture.
3. Copy-fidelity green — by both sides matching after the PRO edits.
4. New tests: the corner heights (three cases in F2); the plan click swapping
   the elevation; DRAW ROOM opening; the inactive-tile tooltip and copy; the
   default decor; INSIDE COLOUR absent and one write path for interior
   finish; the folded column; the names-only list; no user-facing "Watch
   drawer"; the LED at 25% with its cap.
5. Playwright walk: every F's frames plus the lazy run, `verify/t67/lazy-*`.

## LICENSED REMOVALS

- L-SHAPE and + BOX buttons from the room modal (both apps).
- The per-tile "Made to order" lines in WHAT.
- The INSIDE COLOUR row and its orphaned writers.
- The inline drawer controls in INSIDE's column (they move right, F7).
- The per-drawer "fitted" sentences from the list view (they move into the
  drawer's own detail, F8).
- Nothing else. Tombstones two lines maximum.

## BALANCE

Per F: files touched, lines added/removed. Then: the exempted PRO files with
old→new hashes; every "Watch drawer" site changed; where the corner law
lives and why it cannot reach a fixture; the one write path for interior
finish; where the LED cap sits.

## SKIP-AND-NOTE ORDER

F10 → F8 → F4 → F5 → F3 → F6 → F7 → F9 → F2 → F1.
F1 and F2 are the turn's reason for existing and are not skipped. F9 touches
PRO: if its grep turns up a site that cannot change label-only, skip THAT
site, name it, and change the rest.