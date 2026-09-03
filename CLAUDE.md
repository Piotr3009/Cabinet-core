# CLAUDE.md — TURN 64 · PBI: STEP BY STEP, POSH, AND THE SMALL THINGS THAT BROKE

Run autonomously. Zero questions, zero stops. Skip-and-note. PR before morning.
Full suite, never `--silent`. Frames committed under `verify/t64/`.

## THE OWNER'S BRIEF (03.09.2026, verbatim where it matters)

> *"chcę mieć jak najbardziej przyjazny 3D konfigurator mebli. Default od
> frontu. Przyciski duże i kwadratowe, a cała strona wygląda posh. Ludzie nie
> lubią myśleć — musi być step by step, UI friendly and intuitive. Postaw się w
> sytuacji leniwego klienta — ale tak, żeby było wszystko do wyboru."*

And the standing law: **1:1 = COPY**. Nothing PRO has is re-invented in
retail. Where this turn needs a PRO behaviour, it copies the file (T62/T63
method) and reskins.

**The rule of the lazy client**, which every F below obeys: every step has a
sensible answer already chosen. NEXT always works. Six clicks give a finished
wardrobe. A picky client finds "more options" in every step; a lazy one never
sees them.

---

## WHAT IS FROZEN

1. **PRO — zero bytes**: `index.html`, `src/App.jsx`, `src/main.jsx`,
   `src/components/**`, `src/pages/**`. Freeze test green, unedited.
2. **`src/engine/**`, `src/lib/**` — read-only.** Goldens ×6 byte-identical,
   `UNNAMED=0`. If a fix seems to need an engine change, skip-and-note it with
   the exact line — do not make it.
3. **`reference/lisp/**` untouched.** Parens 14/14 at 0/0.
4. **`src/3d/**` — two files licensed, by the channel/flag pattern only**
   (`LedIcons.jsx` for F1.3, and whichever file owns PRO's Delete-key handler
   if it lives in `src/3d` — read to find it). PRO's rendering and keys stay
   bit-for-bit what they are; a test proves each.
5. **The 21 copies from T63 and the 5 from T62 stay copies.** The
   copy-fidelity tests stay green. Reskinning under F3 is allowed on their
   `pbi-re-*` sheet, never on their markup.
6. **No price law tonight.** "Price on request" stays. Say so in the PR body
   as a known gap, not a skip.

---

## F0 · THE SOURCES, READ BEFORE ANYTHING ELSE

Two codebases are the law tonight, and the second is NOT in this repo:

1. **PRO**, in this repo — every F below names the PRO file it copies from.
2. **Prime Sash Windows** — the owner's other product, whose estimate flow
   this turn mirrors. Clone it READ-ONLY before starting F4/F5:
   `git clone --depth 1 https://github.com/Piotr3009/Sash-Planner-Web /tmp/psw`
   and read, in this order:
   - `/tmp/psw/src/pages/EstimatesPage.jsx` — the list: Number · Title ·
     Client · Windows · Created · Status · Actions (Configure / Edit / Archive).
   - `/tmp/psw/src/pages/EstimateConfiguratorPage.jsx` (556 lines) — one
     item at a time: title "{estimate number} — Add window" or "Edit {name}";
     the form on the left, the SAME 3D viewer production uses on the right;
     "Windows in estimate" list underneath with Location · Type · Price · Edit
     · ×; `removeItem(estimateId, itemId)` on the ×.
   - `/tmp/psw/src/components/layout/MainLayout.jsx` and `AppSidebar.jsx` —
     how a page and its navigation are composed.
   Take the STRUCTURE from these (what is on the page, in what order, what
   each button does). Take the SKIN from PBI. Nothing from PSW is imported —
   it is a different app; it is read, not linked. Name in the PR body which
   PSW file each part of F5 was modelled on.

---

## F1 · THE SMALL THINGS THAT BROKE

Each item: reproduce first in the Playwright rig, fix in retail, prove with a
frame pair. Where PRO already does it right, COPY PRO's handler; do not write
a new one.

**F1.1 Delete key.** Owner: *"usuwanie elementów Delete przyciskiem w ogóle
teraz nie działa"*. Diagnosis from code: in retail only the room modals listen
for keys; the Stage has no keydown handler at all. PRO has one — find it
(`grep -rn "'Delete'" src/components src/3d src/App.jsx`), copy its logic into
`src/retail/design/Stage.jsx` (or a `keys.js` beside it), calling the same
store removal PRO calls. Same rule: Delete removes the SELECTED element, never
the wardrobe itself unless the wardrobe is what is selected, and the engine's
refusals (a rider host, the last unit) surface as the store's sentence.

**F1.2 The plus adds to the wrong wardrobe.** Owner: *"jak naciskam plusika
żeby dodać, to dodaje wszystko do pierwszej szafy, nie do szafy którą właśnie
nacisnąłem"*. Diagnosis: `adapter.addBeside` targets `unitOf(point.unitId)`
correctly, but the INTERIOR rows read `theWardrobe()` — wall-0 fallback when
nothing is selected — and the plus does not select before adding. Fix: every
plus and every interior add first SELECTS the unit it was clicked on, then adds
to the selected unit. `theWardrobe()` returns the selection first; the wall-0
fallback stays only for a bare, unselected scene. One law, tested: click plus
on wardrobe B → item lands in B.

**F1.3 The LED icons' law.** Owner, exactly: *"ikony LED powinny się pojawiać
dookoła wszystkich elementów gdzie mogą być dodane — ale dopiero po włączeniu
menu lights — i też powinny zniknąć jak włączę światło ON — ON jest tylko do
wizualizacji."* So, three states, one flag in `uiStore`:
- lighting panel CLOSED → no icons;
- lighting panel OPEN, light OFF → an icon on EVERY element that can take a
  strip (the engine's own predicate — read `LedIcons.jsx`/`LedStrips.jsx` for
  where "can take a strip" is decided and use that, not a retail list);
- light ON → icons hidden; ON is visualisation only.
`src/3d/LedIcons.jsx` reads that flag through the existing channel gate; PRO
sets no such flag and keeps its behaviour — prove with a PRO-flags test.

**F1.4 Shelves go in centred.** Owner: *"shelves powinny się wstawiać
wycentrowane"*. Read where PRO places a new shelf (`AddItems.jsx` copy →
store's add-shelf path). If PRO places at the pointer or at a fixed offset,
retail passes the bay's vertical midpoint (from the engine's own bay bounds)
as the placement. No new geometry: the shelf law is the engine's; only the
requested position changes.

**F1.5 J-pull does not render.** Owner: *"wiem że jest, ale nie widać"*.
Diagnosis (hypothesis, verify first): `UnitView.jsx` draws the J profile only
when the part carries `meta.jpull.run`, which the engine stamps only when the
project's OPENING is `j-pull`. Retail's FRONTS step writes the STYLE but may
not write the OPENING. Probe it: set style in retail, dump `design.fronts`,
compare with PRO after the same choice in `WizardSettings`. Fix at the write
site so retail writes exactly what PRO writes. If the cause is elsewhere,
write down what it was.

**F1.6 Default view from the front.** Owner: *"chcę żeby się default ustawiał
od frontu"*. On entering DESIGN and after RESET VIEW, the camera is
`cameraPresets` FRONT, framed to the design's bounds. Read `cameraPresets.js`;
use its preset, not a new one.

**F1.7 Doors and bays leave the main menu.** Owner: *"po co klient — nie wie
ile drzwi potrzebuje; w Cabinet Core mamy dokładnie napisane w kodzie jak
drzwi się ustawiają. Taki wybór tylko zdezorientuje klienta. 3 drzwi czy 4 —
dopiero jako coś co trzeba edytować, a nie na głównym menu."* Remove the
DOORS and BAYS chip rows from LAYOUT. The engine's door rule decides. Both
rows move into the wardrobe's EDIT (the copied `UnitSizeModal` / the
wardrobe's detail), under a heading "Advanced", with one line: "We set the
doors for this width. Change only if you know why."

**F1.8 One wall.** Owner: *"zostawmy jedną ścianę"*. The `WALLS 1|2` chips
and `WALL 2 WIDTH` from T61 are deleted from YOUR SPACE. Scope `'two'` stays
in the engine (read-only tonight) but retail never writes it; `+ ADD ANOTHER
WARDROBE` becomes the estimate's business (F5). The L-shaped wardrobe, when it
exists, will be a furniture TYPE, not a room setting — note it in the PR as
the intended path, do not build it.

**Proof**: `verify/t64/f1-*.png` — one before/after pair per item.

## F2 · THE STEPS, IN THE OWNER'S ORDER

Owner: *"najważniejsze: wybieranie Egger boardów nie ma w ogóle ustawienia
środek / carcases — a powinno być najpierw INTERIORS (najpierw materiał, a
później reszta) — i następnie FRONTY."*

The rail has six steps, in this order, each with its default already chosen:

| # | Step | Default chosen | "More options" |
|---|---|---|---|
| 1 | WHAT | Wardrobe | the other `PROJECT_TYPES` tiles; unbuildable ones greyed with the engine's reason |
| 2 | WHERE | wall width + ceiling height (two fields), the wardrobe fills the wall | EDIT THE ROOM (the T62 modals: slope, windows, boxes) |
| 3 | INSIDE | **carcass material first**: Egger board via the copied `MaterialChoicePanel` + `DecorPickerModal` (source → picker law from the profile), then the interior rows | the full copied `AddItems`; per-element editors |
| 4 | FRONTS | style (shaker) + Egger colour; opening as PRO writes it | `FrontStyleGallery`, spray/veneer sources, `FrontGapModal`, `JpullRunModal` |
| 5 | EXTRAS | lighting off, no handles, no top box | `LightingPanel`, `WizardHardware`, ADD TOP BOX |
| 6 | REVIEW | front view, the design's summary, "Price on request" | DONE → ADD TO MY ESTIMATE (F5) |

Rules:
- Step 3 opens on the material, and the material row is the copied
  `MaterialChoicePanel` for CARCASS sources exactly as PRO shows it; the
  interior rows sit below it. "Inside colour" offers: same as fronts / white /
  choose — the third opens the same Egger modal.
- NEXT and BACK on every step; a step can also be clicked directly on the
  rail (the rail shows which steps are done).
- Nothing in any step is a slider. Fields per T62's row law; chips for choices.
- `CATEGORIES` in `Categories.jsx` becomes these six. This is the one place the
  RAIL is allowed to change tonight, and only its content, not its mechanics.

**Proof**: `verify/t64/f2-*.png` — each step at its default; step 3 with the
carcass material row above the interior rows.

## F3 · POSH

Owner: *"przyciski i napisy w przyciskach bardziej posh — są jakieś duże te
napisy; przyciski kwadratowe."*

- One `Button` in `src/retail/design/controls.jsx`, used everywhere in
  `src/retail/**` (replace ad-hoc `<button>` styling; a count in the balance).
  Square — zero radius, per the PBI system. Hairline border in onyx at 40%,
  gold hairline on hover/active, ivory fill. Type: Inter, **12px, tracked
  +0.08em, small caps or uppercase — half the size it is now**. Height 44px
  for primary actions (tap-safe), 36px for secondary. The primary action of a
  screen is the ONLY filled (onyx) button; every other is outlined.
- Rail tiles (F4): 64px square, icon 20px + one word 11px under it. Active
  tile: gold hairline underline, not a filled block.
- The copied PRO surfaces (T62/T63) inherit this through their generated
  `pbi-re-*` sheet — regenerate the sheet from the map, do not touch the
  copies' markup.
- Gold stays at 5%: hairlines and the active mark only. Never fills.

**Proof**: `verify/t64/f3-*.png` — a panel before/after; the rail; a primary
and a secondary button side by side.

## F4 · LAYOUT B — THE RAIL, THE OPTIONS, THE PANEL THAT SLIDES

Owner chose variant B from the two mockups: *"zróbmy wariant B"*.

The layout, with the owner's container numbers, at 1440px:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 1 TOP BAR   COLLECTIONS  MATERIALS      PRIME BESPOKE INTERIORS           │
│                              Price on request · MY ESTIMATE (2)  DESIGN │
├────┬──────────────────┬──────────────────────────────────────────────────┤
│ 2  │ 3 OPTIONS        │ 4 VIEW BAR  FRONT INSIDE ROOM · OUTLINES X-RAY … │
│ ▣  │ (of the active   ├──────────────────────────────────────────────────┤
│WHAT│  step, one       │                                                  │
│ ▢  │  column, wide    │              5 STAGE                             │
│WHER│  enough for PRO  │              (front view by default)             │
│ ▢  │  panels on one   │                                     ┌──────────┐ │
│INSI│  line)           │                                     │ 7 DETAIL │ │
│ ▢  │                  │                                     │ slides   │ │
│FRON│  [ BACK ] [NEXT] │                                     │ in/out   │ │
│ ▢  │                  │                                     │ 360px    │ │
│EXTR│                  │                                     └──────────┘ │
│ ▢  │                  ├──────────────────────────────────────────────────┤
│REVI│                  │ 6 STAGE HINT   BEDROOM WARDROBE — LEFT DOOR      │
└────┴──────────────────┴──────────────────────────────────────────────────┘
 72px      ~340px                       the rest
```

- The rail's six tiles are the six steps of F2, in order, icon over one word.
  The active tile carries a gold hairline underline; done tiles a small tick.
- Icons: inline SVG in `src/retail/design/detail/drawings.jsx`'s existing
  style — **no new npm dependency** (the house rule).
- Column 3's width is measured, not guessed: the longest single label in the
  copied `MaterialChoicePanel` and `FrontStyleGallery` must fit on one line.

- **2 RAIL** becomes a narrow vertical strip of six square tiles (F3), icon +
  one word. Width ≈ 72px. It no longer holds text rows.
- **3 OPTIONS** keeps its own column, wider than today (the space the rail
  gives back plus the space DETAIL gives back). Wide enough that the copied
  PRO panels do not wrap word-by-word — measure `MaterialChoicePanel` and
  `FrontStyleGallery` and set the column so their longest label fits on one
  line.
- **5 STAGE** takes the rest.
- **7 DETAIL** is no longer a column. It is a panel that slides in from the
  right over the stage when an element is clicked, and slides out on DONE or
  on clicking empty stage. It carries the same content it carries today (the
  element menus, the copied editors). Width ≈ 360px. Draggable is not
  required for the slide panel; modals opened from it keep the house rule
  (draggable, beside the click).
- **7e ESTIMATE leaves this screen entirely** (F5). The TOTAL/RESET block at
  the bottom of the old rail moves to the top bar's right end as one line:
  "Price on request · MY ESTIMATE (2)".
- Scale law from T60 (one number from window width) still applies to all of
  it.

**Proof**: `verify/t64/f4-*.png` — the layout at rest; the panel slid in; the
same at 1280px width.

## F5 · MY ESTIMATE — ITS OWN PAGE, AS IN PRIME SASH WINDOWS

Owner: *"wycena inna strona, na której masz 2–3 szafy i wtedy otwierasz szafę
i edytujesz — zobacz na PRIME SASH WINDOWS."* Then: *"cena się konfiguruje
sama … i później jak już zakończymy, przycisk DONE i ADD TO ESTIMATE."*

The PSW model: one estimate = a list of items; one item at a time in the
configurator (add / edit mode); the list is where you go between items.

- Route `/retail/estimate` (retail router only — PRO untouched). The page
  lists the estimate's items: thumbnail (captured off the fixed rig, front
  view), name, room, W×H×D, fronts style + colour, "Price on request". Per
  item: EDIT (loads it into DESIGN in edit mode, title "Edit — Bedroom
  wardrobe"), DUPLICATE, ×. Below the list: ADD ANOTHER WARDROBE (opens DESIGN
  in add mode at step 1), REQUEST A QUOTE (the existing JSON + mailto, now for
  the whole list), SAVE / LOAD (the existing project list, renamed to what it
  is: "Saved estimates").
- An item IS a saved design — use the existing SAVE/LOAD store as the item
  store; do not write a second persistence. The estimate is the list of
  designs; "current" is the one open in DESIGN.
- DESIGN shows ONE design on the stage. Step 6 REVIEW ends with DONE → ADD TO
  MY ESTIMATE, which saves the design as an item and navigates to the page.
  In edit mode the button reads SAVE CHANGES.
- Top bar: "MY ESTIMATE (n)" is the link to the page from anywhere.
- The Egger gate note stays in the PR body: quote requests carry decor names;
  public launch still waits on the Egger UK mail.

**Proof**: `verify/t64/f5-*.png` — the page with two items; EDIT landing in
DESIGN with the right title; ADD TO MY ESTIMATE returning to the page with
three.

---

## TESTS AND PROOF

0. F0 done: `/tmp/psw` cloned and the three files read before F5 — the PR body
   names them.

1. Full suite green, never `--silent`. PRO freeze test green and unedited.
2. Goldens ×6 byte-identical; `computeCabinet()` vs LISP exact; `UNNAMED=0`;
   `verify/t64/t64-classify.mjs` proving zero files changed under
   `src/engine` and `src/lib`.
3. Parens 14/14 at 0/0.
4. Boundary test green; copy-fidelity tests (T62, T63) green — the copies did
   not drift under the reskin.
5. New tests: Delete removes the selected element (and refuses per the store);
   plus-on-B lands in B; the three LED states; a new shelf lands at the bay's
   midpoint; `design.fronts.opening` after retail's choice equals PRO's after
   the same choice; first camera is FRONT; DOORS/BAYS absent from LAYOUT and
   present under Advanced; `CATEGORIES` is the six steps in order; an item
   round-trips DESIGN → estimate → EDIT → DESIGN unchanged.
6. Playwright walk: every F's frames, committed, plus one full lazy-client run
   — six NEXT clicks from a fresh start to ADD TO MY ESTIMATE, as a numbered
   frame sequence `verify/t64/lazy-01.png … lazy-07.png`.

## LICENSED REMOVALS

- DOORS and BAYS chip rows from LAYOUT (they move, not die — F1.7).
- `WALLS 1|2` chips and `WALL 2 WIDTH` from YOUR SPACE (F1.8).
- The 7e ESTIMATE panel and the rail's TOTAL/RESET block (they move to the
  page and the top bar — F4/F5).
- Ad-hoc button styling replaced by the one `Button` (F3).
- Nothing else. Tombstones two lines maximum. Deletions in the touched retail
  files must be explained line by line in the balance if additions exceed
  them.

## BALANCE

Per F: files touched, lines added and removed. Then one line each:
- How many keyboard handlers does the retail stage have? (One.)
- How many places decide which wardrobe an add goes to? (One: the selection.)
- How many persistence paths hold estimate items? (One: the existing store.)
- Which PRO behaviour was copied for each fix, by file and line.
- What is still owed: the price law; L-shape as a type; ContextMenu and
  CabinetEditorModal copies; mirrors; GROOVED/ARCHED.

## SKIP-AND-NOTE ORDER

F5 → F4 → F3 → F2 → F1. F1 is eight small certainties and is finished first;
F2 is the owner's "najważniejsze" and is not skipped. If the night runs short,
the estimate page (F5) is the first to wait — the old 7e panel stays until it
lands, and the PR body says so.