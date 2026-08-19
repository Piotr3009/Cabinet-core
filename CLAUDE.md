# CLAUDE.md — TURN 41 · THE SHEET STANDS UP, THE RAIL GETS ONE CHAIN, AND THE DRAWINGS LEARN TO DRAW

Dictated by the owner, 19.08.2026, from his eye-test of T40 on build
`ccdc401`. Three of these are faults in work that shipped last night and
passed a green audit — read F1 and F3 carefully, because both are cases
where the plumbing was rebuilt correctly around a wrong value or a second
path that still wins.

## Iron rules (binding)

1. **Zero-stop overnight run.** Never halt, never ask. Skip-and-note,
   sacrifice whole features from the LOWEST priority upward. PR opens
   before morning regardless.
2. **Engine contract: BYTE-IDENTITY.** `scripts/t41-classify.mjs`
   (sibling of t40's), no named buckets, UNNAMED=0. Every feature here is
   downstream of `computeCabinet()` — sheet layout, drawings, checks, UI,
   design layer. **If something looks like it needs an engine change, it
   does not. Skip and note rather than move a byte.**
3. **Sanctity, with one narrow licence this turn.** No function is
   DELETED. F3 licenses **commenting OUT** the superseded rail path — the
   owner's own words, 19.08: *"nie kasuj, tylko zakomentuj, żeby nie
   działał, a później się będziemy zastanawiać nad usunięciem."* Every
   commented block keeps a header: what it was, when it was disabled,
   which turn, and what replaced it. Nothing is removed from any file.
4. **LISP untouched.** `reference/lisp/**` does not change this turn.
5. **No new dependencies.**
6. **PROVE THE THING, NOT THE FIELD.** This is the turn's discipline and
   it comes from last night's miss. A test that asserts a stored value
   equals what was stored proves nothing. Assert the OBSERVABLE FACT: the
   part's laid dimensions on the sheet, the front's width in millimetres,
   the rail's y after a drag. Where a probe can print the answer, ship the
   probe under `verify/t41/`.
7. **Proofs:** `verify/t41/` screenshot per visible feature, real pointer
   input, named subject asserted. No screenshot = not done.
8. Tests first. Fixtures untouched. Suite never `--silent`. One commit
   per feature, F-number in the message.
9. After the PR is open, END THE SESSION. Do not schedule check-ins.

---

## F1 [CRITICAL] — the sheet must actually STAND these parts up

### What the owner sees, on build `ccdc401`

His CNC sheet, photographed 19.08: `W03 D1-BF 672×230`, `D1-BB 672×230`,
`D1-SL 440×264`, `D1-SR 440×264`, `DF1 712×297`, `PLINTH 2550×100` — all
drawn wider than tall. Lying down. He asks: *"czy to zamierzone, czy się
nie dowierzyło?"* It deployed. It is wrong.

### The measured fact

A probe on `sheetTurn`/`sheetLay` at `ccdc401`:

```
PLINTH            2550x100   turn=0   sheet 2550x100   LYING
DRAWER-FRONT       712x297   turn=0   sheet  712x297   LYING
DRAWER-SIDE        440x264   turn=0   sheet  440x264   LYING
DRAWER-BOX-FRONT   672x230   turn=0   sheet  672x230   LYING
END-PANEL         560x2460   turn=0   sheet 560x2460   standing (by its own proportion, not by rule)
```

### The cause, traced

`CUT_GRAIN_AXIS_BY_PART` names `'h'` for these parts. `sheetTurn` puts the
NAMED axis up the page. For every one of them `'h'` is the SHORTER
dimension, so the part is laid down — the opposite of the instruction.

The `'h'` is inherited from T36-F5, which read the owner's *"szuflady w
pionie, wzdłuż słojów; fronty szuflad też; plinth też"* as **"the grain
runs up the piece AS IT STANDS IN THE CABINET"** — for a drawer side,
its 264 mm height. The owner was talking about **THE SHEET**. His 18.08
restatement removes the doubt: *"plinth zawsze w pionie, zawsze na CNC, od
góry do dołu"*, and the reason: *"jak będzie się oklejać, to nie chcesz
oklejać w poprzek słoja, tylko wzdłuż"* — banding runs the long edge, so
the grain runs the LENGTH.

T40-F2 rebuilt the plumbing correctly — one source instead of two — and
inherited the wrong value through it. **The single source is right; the
number in it is wrong.**

### What to do

- Correct the cut axis for the owner's named parts so each is **laid
  STANDING on the sheet, its length running up the page**: drawer box
  back **BB**, drawer box front **BF**, drawer sides **SL** / **SR**,
  drawer fronts, **PLINTH**, **END PANEL**.
- `DRAWER-BOTTOM` is NOT in his list and does NOT change. Its across-the-
  width answer is the shoe-box rule he gave on 16.08. Leave it.
- Do not add a second rule beside the table — T40-F2's single source
  stands. This is a value correction inside it.
- **The test is the probe, not the field.** For each named part, assert
  the dimensions AS LAID ON THE SHEET (`sheetLay().upMm` / `acrossMm`),
  and assert `upMm > acrossMm` for every one of them at realistic sizes.
  Ship `verify/t41/f1-sheet-lay-probe.txt` printing the table above with
  the new answers.
- Re-check the 3-D reader after the change: the grain must still be what
  the cut says, which is T40-F2's law and must not regress.

CNC fingerprints WILL move here. Engine hashes must NOT. Name both in the
PR body.

Proof: `f1-drawer-parts-and-plinth-stand-on-the-sheet.png`.

---

## F2 [CRITICAL] — the rail: trace the chain, disable the old one, leave ONE

Owner, 19.08: *"drążek nadal nie działa — nie można go przesuwać, nie
można go edytować, i pojawia się sam z półką, nigdy sam. Myślę, że masz 2
kody i stary, który jest do dupy, wymusza włączanie się. Sprawdź dokładnie
i usuń stary kod z drążkiem, bo nie można z nim nic zrobić — i to nie
pierwszy raz."*

T40-F6 shipped "rail alone, or rail with shelf" and the choice does not
take. The owner's diagnosis — two paths, the old one winning — is the
same shape as T40-F1's split-door fault, where the engine was right and a
stale reader won. Treat it as an INVESTIGATION first.

### The investigation, written into the commit body

1. Every path that ADDS a rail. `railAssembly.js`, the rail modal, the
   ADD ITEMS offer, any legacy path from T35 or earlier.
2. Which one runs when the user adds a rail today, and why the other one
   still fires.
3. Where the `alone / with shelf` choice from T40-F6 is written, and who
   reads it — and where it is dropped.
4. Why the rail cannot be DRAGGED: which store holds its y, whether the
   drag writes a field nothing reads (the T40-F1 pattern exactly).
5. Why it cannot be EDITED: does the double-click reach a modal, and does
   that modal write back to the path that actually builds the rail?

### Then, at the cause

- **ONE path builds a rail.** The superseded path is **COMMENTED OUT, not
  deleted** (iron rule 3), with a header block naming what it was, the
  date, T41, and what replaced it.
- The choice is honoured: **alone** produces a rail with no shelf;
  **with shelf** produces the T37 assembly. Default stays *with shelf*.
- The rail is **draggable** and its position persists.
- Double-click opens the rail modal and edits take effect.
- **Legacy rails in existing projects keep working** — that is why the old
  code is disabled rather than removed. If disabling it would break a
  legacy project, say so in the PR and disable only the part that can be
  disabled safely.

### The test that stops turn five

Assert the OBSERVABLE: add a rail with *alone* → the unit's panel list
contains a rail and NO shelf from that assembly. Add with *with shelf* →
both. Drag the rail 100 mm → its y in the built result moved 100 mm. Then
a test asserting exactly ONE code path answers "build me a rail".

Proofs: `f2a-rail-alone-no-shelf.png`, `f2b-rail-dragged-and-edited.png`.

---

## F3 [HIGH] — drawers: one place to choose, and a choice that works

Owner, 19.08: *"w modalu szafy drawers pierwsze mają nadal wybór internal
czy overlay, a pod spodem następna opcja overlay — to się miesza. Albo usuń
2 opcje i zostaw wybór w drawers… ale ten wybór teraz nie działa, więc
upewnij się, że będzie działał."*

**Order matters — do these in this sequence:**

1. **FIRST: find why the internal/overlay switch does not take.** Same
   discipline as F2: trace from the modal control to the geometry that is
   built, and name where the choice is lost. Write it in the commit body.
2. **THEN fix it**, so the two modes genuinely differ.
3. **ONLY THEN tidy the menu**: ADD ITEMS carries **one** entry,
   `Drawers`; the internal/overlay choice lives inside the drawers modal.
   The second `Overlay` entry is **removed from the offer** — the FEATURE
   stays, only its duplicate menu entry goes. (This is a menu entry, not
   a function: iron rule 3 is not engaged. If removing it requires
   deleting a function, comment it out instead and say so.)
4. Default in the modal: **internal** — the pre-T40 behaviour, so no
   existing project is surprised.

The owner's reason for the tidy is worth recording because it will apply
again: *"i tak już się zwija, a będzie więcej."* Every future feature adds
its option INSIDE its own modal, not as another line in ADD ITEMS.

### The test that would have caught this last night

The same wardrobe built twice, internal vs overlay, asserting the
OBSERVABLE DIFFERENCE: overlay fronts are wider (no 30 mm hinge strip)
and sit in a different plane. A test that only checks the stored mode
string is exactly the test that passed while the feature did not work.

Proofs: `f3a-one-drawers-entry-in-add-items.png`,
`f3b-internal-vs-overlay-different-fronts.png`.

---

## F4 [HIGH] — Checks: take me to the PROBLEM, and show me which one

T40-F4c shipped camera travel and it goes to the wrong place. Four
faults, from the owner, 19.08:

**F4a — it takes me to the cabinet, not to the fault.** *"zabiera mnie do
szafy, na dół, a nie dokładnie do problemu, czyli do danego zawiasu."*
The camera must land on the OBJECT the fault names — that hinge, that
shelf — not on the unit that contains it. Where a fault names two objects
(a shelf AND a hinge, 55 mm apart), frame BOTH.

**F4b — the red one takes me to EDIT.** *"czerwone zabiera mnie do edycji
zamiast do problemu."* A fault and a warning behave the SAME on click:
both travel to the object. Editing is a separate, deliberate action —
never the click's default.

**F4c — mark it in the scene.** *"jakoś zaznaczyć, nie wiem, czerwonym
kółkiem czy coś."* Arriving is not enough if the user cannot see what he
arrived at. Outline/highlight the offending object in the fault's own
colour — red for a fault, amber for a warning, matching the panel. The
mark clears when the fault clears or another is selected.

**F4d — "Remove sleeves at this shelf" does nothing.** *"jeśli naciśniesz
'tak', to i tak nie usuwa"*, and when it does work it must remove **ONE
ROW — the colliding row — not every sleeve in the cabinet.** Find why the
action does not reach the design, fix it, and scope it to the single row
the fault is about.

Proofs: `f4a-camera-on-the-hinge-not-the-cabinet.png`,
`f4b-fault-and-warning-behave-alike.png`,
`f4c-offending-object-outlined.png`,
`f4d-one-sleeve-row-removed.png`.

---

## F5 [HIGH] — the drawings: line weight, dimension placement, and the
title block

The full drawing plan is a separate document and is NOT all in scope
tonight. These are the items the owner named on 19.08, and only these.

**F5a — LINE WEIGHT IS A PAPER PROPERTY, NOT AN OBJECT PROPERTY.** Owner:
*"jak zbliżam rysunek, to zaczyna wyglądać bardzo gruba linia."* That is
the signature of a width expressed in drawing units: it scales with the
zoom. Line width must be set in POINTS ON THE SHEET, so it prints and
zooms as a constant. Three weights, from one table, applied everywhere:

- heavy ≈ 0.50 pt — outer outline, cut edges in section
- medium ≈ 0.35 pt — visible internal edges
- thin ≈ 0.18 pt — hidden lines, dimensions, extension lines, hatching

Verify by zooming the produced PDF: at 100 % and at 400 % the line must
measure the same on screen relative to the page.

**F5b — dimensions belong to the view that owns them.** Detailed internal
dimensions — shelf spacings, internal heights, everything about what is
inside — appear on the **CARCASS** view only. Front dimensions — front
widths, front heights, gaps — appear on the **FRONTS** view only. Neither
view carries the other's chains. Overall size stays on both.

**F5c — the shaker profile is drawn at its real size.** If the shaker rail
is 20 mm, draw 20 mm. No nominal, no symbol.

**F5d — glass.** A glazed front draws as transparent with the standard
glass mark: **three diagonal strokes, descending from longer to shorter,
in light blue.**

**F5e — the title block, flat, like his.** A flat table, his layout, with
fields for **company name, project number, date**, plus the drawing name
and revision that already exist. Room for the company name is required —
this is the sheet a client receives.

**F5f — sheets number themselves.** Automatic drawing numbers so a reader
knows what each sheet is: the owner's own scheme is `001`, `002`, `003`
with a name (`Wall A - /1`, `Wall A - /2`, `Horizontal section - 1`).
Numbers follow the sheet order and renumber when sheets are added.

**F5g — the mark.** At the end of the set, placed well: **"Created by
Cabinet Core"** with an originality mark. Make it look deliberate and
quiet, not like a watermark. The exact form of the mark is open — do the
tasteful thing and the owner will veto if it is wrong.

Proofs: `f5a-line-weight-constant-at-400-percent.png`,
`f5b-dimensions-split-between-views.png`, `f5c-shaker-20mm-drawn.png`,
`f5d-glass-mark.png`, `f5e-title-block-flat.png`,
`f5f-sheets-numbered.png`, `f5g-created-by-cabinet-core.png`.

---

## Execution order

F1 → F2 → F3 → F4 → F5.

F1 first: it is the machine, the boards, and a value that has been wrong
since T36 — the longest-standing fault on the list. F2 and F3 next
because both are features the owner was told had shipped and had not. F4
next. F5 last and internally in its own order (F5a first — line weight
touches every view, so it lands before anything else is drawn).

A short night therefore cuts F5 from the bottom of its own list, then F4.
Never cut F1.

## What this turn does NOT touch

`computeCabinet()` output. `reference/lisp/**`. `SettingsPanel.jsx`.
Golden fixtures. The CNC export path's no-text rule. The T39
materials/BOM system. The vertical SECTION view, drawer boxes in the
carcass elevation, legs drawn as legs, and the plan-view side panels — all
four are in the drawing plan and wait for the owner's answers on where the
section cuts and what sheet size he prints. Parked as before: Cabineo, the
drilling-pattern library, pull-down rail, L-shape, nesting, kitchens,
shaker 20-vs-60, internal metal Gold→Silver.

## Morning audit will run

Fresh clone → branch → clean-room install → full suite (never --silent) →
vite build → t41-classify borrowed onto main → BYTE-IDENTITY, UNNAMED=0
→ sanctity diff-audit: **zero deletions; commented-out blocks present and
headed** → `reference/lisp/` untouched → **F1's probe re-run in the
audit, not trusted from the PR** → verify/t41 complete → verdict → the
owner's numbered eye-test list.