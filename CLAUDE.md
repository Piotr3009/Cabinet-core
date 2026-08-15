# CLAUDE.md — TURN 32: WARDROBES

Date issued: 15.08.2026. Previous turn: T31 (merged). A chat batch landed on
main the same day; VERIFY IT FIRST: `src/engine/joinery.js` must contain the
string `CHAT FIX 15.08.2026: THE SIDE LIES DOWN` and
`src/engine/thickness.js` `drawerBoxGate` must return `{ blocked: false }`.
If either is missing, STOP and report — the chat batch is not merged and this
turn builds on it.

The owner's direction for this turn, in his own words: kitchens pause;
wardrobes are the next real project, "including BOM, because that is where we
learn what BOM needs — and the kitchen inherits the fixes."

## Iron rules for this turn

1. **/engineering-discipline governs every feature.** The skill at
   `.claude/skills` level is adopted project-wide as of today. In particular:
   Step 4's CONSUMER SWEEP is mandatory — today's lesson twice over: a snap
   fix died at `runnerModelFits` one call downstream, and a door-count rule
   lived in the engine while the store pinned it dead. When you change what a
   function answers, walk every reader of that answer to the end of the chain
   before you commit.
2. **Engine purity.** Bare `computeCabinet()` = the AutoLISP; golden fixtures
   untouchable. Owner-standard behaviour goes through the OVERRIDE CHANNEL
   (profile/company/project → `paramsForEngine()`).
3. **No hole without truth.** A drilled hole exists only where a LISP line or
   a published pattern says so. Hardware articles come from the registry
   (F6) or arrive as a named SPEC with no number — never invented.
4. **Guards speak; they never silently fix.** The one sanctioned exception is
   F3's auto-clearance, which is the OWNER'S OWN RULE for gaps ("po co
   klientowi dupę zawracać") — and even it says what it did in a grey note.
5. **Proof screenshots** in `verify/t32/`, each containing its named subject;
   an empty frame fails the phase. Browser proofs on REAL pointer input where
   a feature is interactive.
6. **LIVE-SCENE PROOF for store/UI work.** For every feature that touches the
   store or a component, the acceptance walk must MEASURE the running app the
   way the audit now does: drive the real store (`window.__cc.project`), then
   compare engine numbers against scene bounds per unit (`ccUnitId` on the
   ancestors — panel ids collide between units). A green unit test on the
   engine is not proof of the screen; the drawer side stood on end for
   FOURTEEN TURNS because nobody measured the scene.
7. All UI copy in English. Commit PER FEATURE, in order F1 → F9; a run that
   dies early must leave a mergeable head.
8. **F6 is the only SQL in this turn** and the package must be labelled
   "SQL PRZED push" in the PR description, with the migration file path named.

## Features

### F1 [CRITICAL] — The wizard, step 4 rebuilt: one screen, no scrolling

The owner walked the current step 4 on a screenshot and dictated the shape.
`NewProjectFlow.jsx` (steps exist: info · type · scope · room · settings) —
the SETTINGS step becomes:

1. **Top row**: Number · Client · Type — type is a LABEL here (chosen in step
   2), never a second dropdown.
2. **Saved settings sets**: a LOAD list at the top ("Skylon standard",
   "Herbal standard"…), not only "Keep as…". Loading a set fills THIS step
   and step 5 (F2) completely. A set is every setting on both screens.
3. **Dimensions, per project type.** For a Wardrobe project: `Default height
   of wardrobe` + `Plinth height` (default 100) + a LIVE line
   `total item = wardrobe + legs = X mm`. Guards:
   * total > room height → error, cannot continue;
   * room − total < 40 mm → a QUESTION: "To the ceiling, with no infill?"
     with the warning the owner dictated: "an infill can be scribed to the
     ceiling's real shape — ceilings are rarely straight."
   * **Depth seed follows the PROJECT TYPE**: `projectDepth()`
     (engine/projectSettings.js:148) answers `profile.baseUnit` (558) for
     every project today — a Wardrobe project must seed from
     `profile.wardrobe.defaults.depth` (568). One function, read by the
     wizard row and by `addUnit`; fix it at the source, not in the wizard.
4. **FRONTS BEFORE MATERIALS** — the owner's explicit order: shape first,
   colour second. "How many front types in this project? [1] [2] [3]"
   (kitchens get the same three), then per slot the EXISTING 8-style gallery
   (Shaker · Flat · Handleless J-type · Grooved · Grooved with frame ·
   Arched · Arched handleless · Glass — it exists with its parameters;
   wire it in, do not rebuild it).
5. **Materials**: the mock swatches (broken white, light grey…) are DELETED.
   One picker = EGGER tiles ∪ stock materials. `Generic` stays, with the
   yellow warning it already has. **No assignment → Start designing stays
   disabled** — choosing generic IS an assignment; choosing nothing is not.
6. **Sheen** after colours. Ironmongery is NOT here — it is step 5 (F2).

### F2 [CRITICAL] — Hardware as its own step 5

The owner: settings screens that scroll get half-read and mis-filled; the
client-facing choices and the workshop choices are two different heads.
New wizard step after settings, small and always fully pre-filled from the
saved set / defaults:

* **Metal colour**: chrome / onyx / gold — writes the existing family choice
  (`design.hardware.shelfSleeve` cascade; the rail already follows it).
* **Soft-close**: yes / no. Default **[OWNER — unanswered; ship YES and mark
  the profile line `soft-close default — owner to confirm 15.08`]**.
* **Plinth**: read-only summary line — plinth height from step 4, and the
  automatic materials line: clips + clip connectors counted **from FRONT
  legs only** (the engine counts legs; front legs = the row at z ≈ front).
  Unassigned plinth material shows the default with the word "(default)".
* Nothing else. Under ten seconds for a returning user.

**The hardware AUTOMAT behind it** (engine, not wizard): the rule table that
already picks hinge angles (`hingeAngleFor`: thick front → 95°, internal
drawer → 155°, standard → 110°) extends to pick the ARTICLE: angle + metal +
soft-close → one row from the registry (F6). Corner units and thick fronts
are ROWS IN THE TABLE, not special code. Per-door exceptions stay where they
are (DoorModal, "Assign other hinge" — already shipped).

### F3 [CRITICAL] — Front gaps become SELF-HEALING

Owner's verdict on T31's modal: "why bother the client — gaps should fix
themselves." The T31 matrix (frontClearance.js — the numbers stay law)
changes MODE:

* The matrix is APPLIED, not offered: on unit creation, on a neighbour
  appearing/disappearing, on resize — the front's width corrects itself on
  the correct edge (asymmetry law and the 21.5 cups ride exactly as T31
  built them).
* Every self-correction announces itself as a GREY note ("front 02-F −1.5 mm
  at the end panel"), never a question.
* The RED modal survives ONLY where auto has no move: front at its minimum,
  appliance pinned on both sides. That is Check's job (#2/#11 stay).
* **Known faults to fix while in here** (owner's testing, 15.08): the matrix
  is not applied for all unit types — he still sees 1.5/1.5 where a panel
  neighbour demands 3.0; and DIMENSION LABELS OVERLAP when two gap figures
  sit close — collision-offset the labels.

### F4 [CRITICAL] — ZONES: the wardrobe's columns

The single biggest piece. A vertical partition (rename its label to
"Vertical partition (divider)") divides the interior into COLUMNS, and each
column lives independently:

* per column: shelves / hanging rail / drawers / empty;
* drawer widths and fronts are computed FROM THE COLUMN'S WALLS (side panel
  and/or partition), not from the cabinet — boxes, runners, fronts, drilling
  all follow the column;
* the drawer zone the engine builds today (bottom, full width, DP + fillers
  per the LISP) remains the DEFAULT when no partition exists — golden
  fixtures must not move;
* **drawers in/out per drawer**: the mechanism exists (T30 F20 built
  `front: none` + setback for PANTRY internal drawers) — wire it to the
  wardrobe: AddItems asks overlay/internal (today it HARDCODES 'overlay' at
  AddItems.jsx:72 and store:138 — the owner set "internal" and nothing
  listened), the engine honours per-item `mount`, and internal drawers hide
  behind the doors, revealed when a front opens (the BACKLOG #13 hook
  exists).
* **The recessed-partition law** (owner, 15.08): drawers in a column require
  that column's walls FULL DEPTH at the runner band. `partition_front_mm`
  exists (store:3945) — adding drawers to a column whose partition is
  recessed refuses with the number and one button: **[Reset the setback]**
  (opens the partition editor, F7-pattern). A guard that SPEAKS.

### F5 [CRITICAL] — BOM the workshop can invoice from

The owner's words: wardrobes go first "including BOM — that is where we
learn what BOM needs." Two blocks, one export:

* **Materials summary**, per decor: m² net → +waste % → ~sheets (a DIVISION
  with the label "~N sheets of 2800×2070", never a cutting plan — nesting is
  explicitly parked) → edging metres per decor and thickness. FRONTS listed
  SEPARATELY from carcasses (often another decor, often another supplier).
  Waste % and sheet size are profile numbers **[OWNER — unanswered; ship 15%
  and 2800×2070, both marked `owner to confirm`]**.
* **Ironmongery, counted with articles**: hinges (pcs + plates) via the F2
  automat; runner PAIRS with their nominal length (snap already answers the
  length — order the snapped article); hanging rail by the metre + supports;
  legs; plinth clips + connectors from FRONT legs; shelf supports;
  confirmats/screws from the drilling counts. Anything the registry (F6)
  does not know prints as a YELLOW named spec line — never invented, never
  silently dropped.
* Ready-made drawer boxes (F7) appear as PURCHASE LINES, and their box
  parts do NOT appear as cut parts.
* Export: CSV named `{ProjectName}-bom-{DDMM-HHMM}.csv` (T31 F5's pattern).
* BOM warns at the top when Check holds a RED on any counted unit.

### F6 [HIGH] — The hardware REGISTRY (the only SQL) — "SQL PRZED push"

The owner's ruling: CabinetCore keeps a registry of EXISTENCE, never of
stock. Stock lives in JoineryCore; we export to it later (parked).

* Table `cc_hardware_register`: `category (hinge|runner|leg|clip|rail|…)` ·
  `family` · `finish` · `variant (soft|std)` · `angle` · `article` ·
  `source (own|joinerycore)` · `label`. RLS on, like every other table.
* Registered = the automat resolves an article. Unregistered = the yellow
  BOM line (F5). NOTHING BLOCKS on the registry — it informs.
* Seed: the MOVENTO manifest's 40 articles and the Blum hinge articles the
  hinge catalogue already carries, imported once by a script.
* Graceful degradation is the iron rule: mock mode / no table → every lookup
  answers null → yellow lines, app fully alive.

### F7 [HIGH] — Ready-made drawer boxes

The wizard's materials block (F1.5) asks once per project:
`Drawer boxes: (•) Same board as carcass  ( ) Ready-made system`.
Same-board is the default and is ALREADY the engine's behaviour since
today's chat fix (box inherits the confirmed carcass thickness; a hand-set
box number still wins). Ready-made: box sides/bottom/back leave the cut
list, a purchase line appears in BOM (F5), fronts stay ours. The engine
keeps computing the box GEOMETRY (the drawer still exists in 3D and the
front still needs its drilling) — only the CUTTING and the BOM change.

### F8 [MEDIUM] — Library filtered by project type

Cargo units, bins, pull-outs are KITCHEN items; a Wardrobe project's library
shows wardrobe things. The category data exists (`UNIT_CATEGORIES`); add the
project-type filter with "Show all" as the one-click way past it (the same
grammar the item filter learned in T11 F4.4). No hard blocks.

### F9 [MEDIUM] — Handle preview, the owner's drawing

His screenshot is the spec: on hover/selection the handle shows CAD-style
dimension lines with arrowheads — offset from the top edge (e.g. 50), offset
from the side edge (e.g. 30), and the HOLE SPACING (e.g. 160) between the
two drill centres — in the drawing-office blue, replacing the single orange
number T31 F7 shipped. The aura (catchment) stays; only the label changes.
Add a GLOBAL toggle "Front dimensions" in the View menu (today it lives only
inside the door modal).

## Open questions travelling WITH the push (answer in the PR description)

* Q1 — soft-close default yes? (F2 ships YES, marked.)
* Q2 — waste % (F5 ships 15) and sheet size (ships 2800×2070)?
* Q3 — fronts from another supplier: should the BOM split materials by
  SUPPLIER as well as decor, or is decor enough for now?

## Parked — do NOT start

Nesting/cutting optimisation (the owner: "m² is enough, nesting is a deep
well") · hood unit rework (owner: "masakra, wrócimy") · sliding doors ·
L-shape joints and corner handle-reach · appliance GLBs (files arrive from
the owner) · mirrors on doors, interior accessories (shoe shelves, tie
drawers), lighting/LED, "turn on the light" demo, clothes props — ALL of it
is T33 · MOVENTO ladder alignment (waits on the owner's real length list —
the snap already covers the gap) · per-family hinge fold axes ·
`71B3550_43192717` re-export · EGGER licence e-mail = BLOCKER #44.

## Owner-tunable defaults written in this turn

soft-close default (F2, marked) · waste % 15 and sheet 2800×2070 (F5,
marked) · wardrobe project depth seed 568 (F1) · ceiling-gap question
threshold 40 mm (F1) · every one of them ONE profile line with a comment
naming 15.08.2026 and the owner as the source.