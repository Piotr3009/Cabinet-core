# CLAUDE.md — TURN 40 · ONE GRAIN TRUTH, THE SPLIT-DOOR CHAIN, OVERLAY DRAWERS, AND THE WALL DRAWINGS

Dictated by the owner, 18.08.2026, after T39 landed. Read F2 first even if
you execute it second — its principle ("one source, no exceptions") is the
reason three previous turns kept re-touching the same code.

## Iron rules (binding)

1. **Zero-stop overnight run.** Never halt, never ask. Skip-and-note,
   sacrifice whole features from the LOWEST priority upward. PR opens
   before morning regardless.
2. **Engine contract: BYTE-IDENTITY.** `scripts/t40-classify.mjs`
   (sibling of t39's), no named buckets, UNNAMED=0. Every feature here is
   downstream of `computeCabinet()`, in the drawing layer, in the check
   layer, or in UI. **If a feature appears to need an engine change,
   it does not — it needs a better read. Skip it and note it rather than
   move a byte.** The one exception the owner has NOT granted is the
   engine; he has said plainly he does not want it touched.
3. **Sanctity.** Zero licensed removals. Delete no function. If F2's
   consolidation seems to require deleting a reader, do NOT delete it —
   make it delegate to the single source and note it for the owner.
4. **LISP untouched.** `reference/lisp/**` does not change this turn.
5. **No new dependencies.**
6. **Proofs:** `verify/t40/` screenshot per visible feature, real pointer
   input, named subject asserted. No screenshot = not done.
7. Tests first for every pure function. Fixtures untouched. Suite never
   `--silent`. One commit per feature, F-number in the message.
8. **CNC fingerprints WILL move in F2.** That is the point of F2 and is
   expected. Engine hashes must NOT move. Keep the two apart in your head
   and say which is which in the PR body.
9. After the PR is open, END THE SESSION. Do not schedule check-ins.

---

## F1 [CRITICAL] — the split-door hinge chain

Owner, verbatim: *"jak wstawiam split doors, to zawiasy chyba nie mają
żadnej logiki… w modalu doors nie można ich przesuwać, nie widzą półek,
nie są podzielone na top i bottom"* and *"te zawiasy widzą clash ale nie
w tym miejscu w którym się pokazują, tylko jakby w starym miejscu przed
podzieleniem na top i bottom. Cały ten łańcuch trzeba prześledzić i
dokładnie zbadać co jest nie tak."*

This is an INVESTIGATION first and a fix second. Do not patch the symptom.
Trace the whole chain and write what you found in the commit body:

1. Where split doors are produced (`splitDoors.js`, T37-F6; the
   `SPLIT DOORS (T35)` section in `KIT_WARDROBE_FULL`).
2. Where the hinge list for a door is computed, and whether the split
   produces TWO door records with their own hinge lists or one record the
   rest of the app still reads as undivided.
3. Which reader the Doors modal uses when it offers hinge positions —
   and why it offers none that can be moved for a split door.
4. Which reader the collision check uses — the T37 stale-hinge fault was
   an in-memory cache that a reload cleared; establish whether THIS is
   the same class of fault (test it: does a reload move the reported
   collision to the right place?) or a genuinely different reader looking
   at pre-split geometry.

Then fix the CAUSE, once:
- Split doors get hinges as **two independent sets, top leaf and bottom
  leaf**, each run through the standard hinge law for ITS OWN leaf
  height — exactly as T39-F1b did for the top box door.
- Those hinges are **movable in the Doors modal**, like any other door's.
- The collision check reads the SAME post-split positions the scene
  draws, so a reported clash is always where the hinge actually is.
- Hinges see shelves: the shelf × hinge rule applies to split-door leaves
  as it does to whole doors.

Tests: a split wardrobe door at a given height produces the leaf-correct
hinge counts; moving a top-leaf hinge does not move a bottom-leaf hinge;
the check's reported y equals the drawn y for both leaves.

Proof: `f1-split-door-hinges-two-sets-movable.png`.

---

## F2 [HIGH] — ONE GRAIN TRUTH: the cut decides, and 3D shows what was cut

Owner, verbatim and decisive, 18.08.2026:

> *"Jeżeli cięte jest w pionie, słój w pionie, to i tak samo powinien być
> pokazany element na wizualizacji. Jak tniemy, tak słoje się pokazują.
> Czyli jak tniemy w pionie a układamy w szafie w poziomie, to i słoje w
> poziomie. Proste. Nie będzie wyjątków, będzie logicznie i składnie i
> prościej."*

### Why this feature exists

Today there are TWO independent statements about grain and they can
disagree:

- `src/engine/grain.js` (`GRAIN_AXIS_BY_PART`, T36-F5) states an axis per
  ROLE — read by `engine/decors.js grainRun()` for the 3D texture.
- `src/engine/cnc/layout.js sheetTurn()` decides how the part is laid on
  the sheet. T36-F5's own comment records the split deliberately: *"The
  DRAWN FRAME is deliberately not touched… nothing turns them today."*
  T37-F7 then taught `sheetTurn` to read the stated field, where `'h'`
  maps to 0° — no turn.

So a part can be STATED to run one way and CUT another way, and the 3D
shows the statement while the workshop gets the cut. T35-F6, T36-F5 and
T37-F7 all touched this same seam. Three turns, one unfixed cause: two
sources of truth.

### The law, from now on

**THE CUT IS THE ONLY SOURCE.** How a part is laid on the sheet decides
which way its grain runs. The 3D renders the grain of the part AS CUT,
carried through the part's mounting orientation in the cabinet. A part
cut standing and mounted lying shows its grain lying. There is no second
table, no per-role visual override, no exception list.

### What to build

1. **One function** — the single source: given a part, return how it is
   laid on the sheet (the turn) and therefore which way its grain runs.
   `sheetTurn()` is the natural home; it may keep its name.
2. **`grainRun()` in `decors.js` reads THAT** — the cut result carried
   into the panel's mounting frame — instead of applying its own rule.
   Do NOT delete `grainRun` or `GRAIN_AXIS_BY_PART` (iron rule 3): make
   the reader delegate, and if the role table becomes input to the single
   source rather than a second answer, say so in the commit.
3. **These roles are cut STANDING, grain top-to-bottom on the sheet**
   (the owner's list, 18.08): drawer box back **BB**, drawer box front
   **BF**, drawer sides **SL** and **SR**, drawer fronts, **PLINTH**, and
   the left/right **END PANEL**. His reason, recorded because it is the
   test of whether the answer is right: *"jak będzie się oklejać, to nie
   chcesz oklejać w poprzek słoja, tylko wzdłuż."*
4. **Cross-frame tests are mandatory** — the T37-F7 lesson. For each role
   above: assert the sheet turn, and assert the 3D grain direction
   DERIVES from it rather than from a separate table. A test that only
   checks one side of the seam is the bug this feature removes.

### The boundary

`computeCabinet()` output does NOT change. The statements it writes stay
byte-identical; what changes is who reads them and whether the sheet
honours them. CNC layout fingerprints WILL move — name them in the PR.

Proofs: `f2a-drawer-parts-and-plinth-stand-on-sheet.png`,
`f2b-3d-grain-matches-the-cut.png`.

---

## F3 [HIGH] — drawers: the 30 mm strip, and OVERLAY drawers in a wardrobe

### F3a — the strip only exists when a door does

Owner: *"jak nie ma drzwi w ogóle, to nie powinno robić 30 mm odstępu
infill na zawiasy — dopiero po wstawieniu drzwi (ważne)."*

INTERNAL drawers (behind doors) reserve a 30 mm strip for the hinge. That
reservation must be conditional on a door actually existing on that side.
No door → no strip → fronts run the full carcass width. Add a door → the
strip returns and the fronts narrow. This is a design-layer decision, so
it belongs in `paramsForEngine()`/the design layer, NOT in the engine.

Test: same cabinet, doors off → front width grows by the strip; doors on →
back to today's number.

### F3b — OVERLAY drawers in a wardrobe (new)

Owner: *"nadal nie mamy szuflad nawierzchniowych — w sensie żeby były na
wierzchu, czyli bez infilla, fronty na szafie, drzwi powyżej szuflad."*
Confirmed by him, point by point:

- **Same logic as BUDR**, but inside a wardrobe. Runner drilling and
  geometry follow the BUDR law — read it, do not re-derive it.
- **The stack always sits at the bottom** of the wardrobe.
- **A FIXED SHELF sits above the stack**, separating it from the section
  above.
- **The doors above are shortened** — they start above the stack and run
  to the top; their hinges follow the standard law for that shortened
  height.
- **3 mm gap** — the owner said explicitly not to forget it.
- **Overlay drawers NEVER have the 30 mm infill**, unconditionally. This
  is not the same rule as F3a: internal drawers have a conditional strip,
  overlay drawers have none, ever.
- **Heights default to EQUAL**, not the 3/2/1 progression a kitchen bank
  uses — with the per-drawer height slider working as it does elsewhere.

Where it lives: the wardrobe's ADD ITEMS offer, beside the existing
internal drawers, clearly distinguished (internal vs overlay).

Tests: stack at the bottom; fixed shelf above it; door height = carcass
minus stack minus gap; equal default heights; no 30 mm strip under any
combination of doors on/off; runner rows match BUDR at the same drawer
height.

Proofs: `f3a-no-door-no-strip.png`, `f3b-overlay-drawers-in-wardrobe.png`.

---

## F4 [HIGH] — Checks: one message, no twins, and take me there

Three faults, from the owner's screenshots of 18.08.

**F4a — the same fault, said twice, differently.** The Check panel shows
`#1 SHELF × HINGE COLLISION` with one button (*Move the hinge*); the
cabinet modal shows the same fault with two (*Remove sleeves at this
shelf*, *Move the hinge*). Owner: *"raczej powinny się pokazywać i tu i
tu"* — the same fault, the same wording, the SAME buttons, in both
places. One definition, two renderers.

**F4b — the duplicate.** `#3 TALL CABINET WITH NO FIXED SHELF` appears
TWICE, identically, for one cabinet. Find why the rule emits twice (a
per-shelf loop where a per-cabinet answer belongs, most likely) and make
it emit once. Test with the exact configuration in the screenshot: a 2460
tall wardrobe with one non-fixed shelf → exactly one instance.

**F4c — clicking a fault must TAKE ME THERE.** Owner: *"super, teraz tak
robi, ale nie bierze nas dokładnie do tego miejsca… jeśli to ta półka,
powinno nas wziąć do tej półki, jakby najechać kamerą na nią, lub na
zawias który jest problemem. Jeśli drzwi zamknięte, to otwiera program
drzwi i nas tam zabiera."*

- Every fault carries the ID of the OBJECT it is about (that shelf, that
  hinge), not just the cabinet.
- Clicking flies the camera to that object: smooth travel (not a jump),
  object centred and highlighted.
- **If the object is behind closed doors, the app opens the doors first**,
  then travels. Doors it opened for this reason may stay open — do not
  fight the user by closing them again.
- If a fault genuinely has no single object, fall back to today's
  behaviour rather than inventing a target.

Proofs: `f4a-same-fault-same-buttons-both-places.png`,
`f4b-tall-cabinet-fault-appears-once.png`,
`f4c-camera-at-the-hinge-doors-opened.png`.

---

## F5 [CRITICAL] — WALL DRAWINGS: the whole run, not one cabinet

Owner: *"nie mamy drawingu całościowego — pokazuje nam tylko pojedyncze
szafki, a ja bym chciał drawing całości profesjonalny jak z AutoCada."*
He supplied his own AutoCAD set (Anderson Kitchen rev B) as the standard.
This is **PDF in Output — not CNC.**

### What his own drawings do (read this as the spec's真 source)

- **A sheet is a WALL.** His set: `Wall A /1`, `Wall A /2`, `Wall B /1`,
  `Wall B /2`, plus `Horizontal section`. Confirmed by him: **/1 is WITH
  FRONTS, /2 is the CARCASS view without fronts** — the same split the
  Unit Card already makes per cabinet, applied to a whole wall.
- **TWO dimension chains per axis, not one.** Top:每 cabinet's own width
  with the gaps between them (597.0 · 37 · 501.0 · 501.0 · 37 · 513.0 …).
  Bottom: the grouped totals (599.5 · 37 · 1011.0 · 36.0 · 1571.0 · 40.0).
  Right: every front's own height (140.3 · 100.3 · 40.0 · 221.0 · 22.0 …)
  AND the grouped bands (1550.0 · 770.0 · 100.0 · 30.0). Left: the
  overall height.
- **Colour convention:** fronts in magenta, hinge side shown by the grey
  diagonal X across each door, handles in green, existing building fabric
  (architrave, walls) in red.
- **Scale reads "No Scale"** — he does not print to a scale, he trusts the
  dimensions. Do not invent a scale label.
- **Cabinet numbers** appear in the plan view, in green.
- **Title block:** Client Name, Client Address, Project, Drawing name,
  Date, Job No, Scale, Rev.

### What to build

The project already knows walls: every unit carries
`position: { wall, x_mm, rotation_deg }` and `projectStore` already groups
neighbours by wall. Use it. Do not invent a second notion of a run.

Reuse, do not rewrite: `drawings/views.js` (`buildCarcassElevation`,
`buildTopView`, `planBox`), `drawings/frontElevation.js`,
`drawings/sheet.js` (`layoutSheet`, `pageFormat`, title block),
`drawings/primitives.js`, `drawings/svg.js`. A wall drawing is those
per-unit views composed side by side at their `x_mm` positions, with
chains drawn across the composition.

- **Per wall, two sheets**: `/1` elevation with fronts, `/2` carcass
  without fronts.
- **One horizontal section** per project: the plan, all walls, cabinet
  numbers.
- **Both dimension chains** on each axis, as above. This is the single
  most important detail of the whole feature — one chain is not his
  drawing.
- **Output as PDF**, in the Output menu beside the existing Unit Card.
- **DXF 2D as a SEPARATE output**, same geometry, with text (dimensions,
  labels, title block). It carries a clear label: **"AutoCAD only — do
  NOT open in VCarve"**, because DXF text styles crash VCarve's parser
  (02.08.2026). The CNC export path is untouched by this feature and
  still ships no text of any kind.

Tests: a two-cabinet wall composes both cabinets at their x positions;
the detailed chain sums to the grouped chain; a wall with no cabinets
produces no sheet rather than an empty one; the DXF writer emits text
only on this path.

Proofs: `f5a-wall-elevation-with-fronts.png`,
`f5b-wall-carcass-no-fronts.png`, `f5c-horizontal-section.png`,
`f5d-dxf-drawings-labelled-autocad-only.png`.

---

## F6 [MEDIUM] — the rail: with a shelf, or on its own

Owner: *"następnie dodawanie drążka raz i z półką proszę — wybór w drążek
modal, to ważne."*

T37-F2 made adding a rail ALWAYS an assembly (a FIX shelf with the rail
beneath it). The owner now wants the choice: **rail alone**, or **rail
with shelf**, chosen in the rail modal. Default stays the assembly (that
was his own verdict in T37 and nothing here overturns it); the modal adds
the alternative. Legacy rails are untouched, as T37 left them.

Proof: `f6-rail-modal-alone-or-with-shelf.png`.

---

## F7 [LOW] — plateBiteMm: the frozen value

`profile.js` carries `plateBiteMm: 10` (T37-F3, was 5). The owner reports
seeing no change — the localStorage freeze pattern this project has hit
repeatedly (LED kelvins, the design migration). Add an explicit
"code wins" migration for this key, idempotent (`null !== 0` — the T-round
lesson), so an existing profile picks up 10 without the user rebuilding
anything. Verify with a stored profile carrying 5.

Proof: `f7-existing-project-picks-up-plate-bite-10.png`.

---

## Execution order

F1 → F2 → F7 → F5 → F3 → F4 → F6.

F1 and F2 first: both are correctness at the machine, and F2's single
source is what stops this seam coming back a fourth turn. F7 is ten lines
and rides along. F5 gets the bulk of the night because the owner called
the drawings the most important thing on the list. A short night therefore
cuts F6 first, then F4, then F3 — each skip named in the PR body.

## What this turn does NOT touch

`computeCabinet()` output. `reference/lisp/**`. `SettingsPanel.jsx`.
Golden fixtures. `depthSteps`. The CNC export path's no-text rule. The
materials/BOM system from T39. Parked and not to be started: Cabineo and
other joinery systems, the drilling-pattern library (the owner has not
supplied the hole figures), pull-down rail, L-shape, nesting, kitchens
and kitchen patterns, the shaker 20-vs-60 question, and the internal
metal Gold→Silver default — the owner said "nie teraz" to the last two on
18.08.

## Morning audit will run

Fresh clone → branch → clean-room install → full suite (never --silent) →
vite build → t40-classify borrowed onto main → BYTE-IDENTITY, UNNAMED=0
→ sanctity diff-audit (zero removals) → `reference/lisp/` untouched →
CNC-fingerprint moves present and NAMED (F2) while engine hashes are
IDENTICAL → verify/t40 complete → verdict → the owner's numbered eye-test
list.