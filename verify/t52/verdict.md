# TURN 52 — the verdict

*The run shares out from either end, the cup hides, and the watch drawer.*

Branch `claude/turn-52-execution-aks5az`, from `34f5fc1`.
Five features, five commits, in CLAUDE.md's own order: **F1 → F2 → F3 → F4 → F5**.
Nothing fell.

---

## The iron rules, answered

| rule | answer |
| --- | --- |
| **1 · zero-stop** | All five shipped. F5 — the one CLAUDE.md marked as the first sacrifice — is complete: LISP, engine, profile, CNC, BOM, Check, 3D, UI and 23 tests. |
| **2 · byte-identity** | `t52-classify`: **six IDENTICAL, UNNAMED 0.** Two findings written up below rather than waved through. |
| **3 · LISP is law, FIRST** | F3's counts are born in `SKYLON_COMMON.lsp` (`SKY:tabCount` / `SKY:tabCentres` / `SKY:middleTabFloor`); F5's geometry in the NEW `KIT_WATCH_DRAWER.lsp`. Paren **14/14 at 0/0** — see the note below on why it is fourteen. |
| **4 · sanctity** | Nothing deleted. Two test assertions that TYPED "thirteen kits" now derive the count; three that listed a drawer's property fields gained one entry. Every change is annotated with why. |
| **5 · the walk** | Suite in full at every commit, never `--silent`: **4606 pass / 0 fail**. One commit per feature. **Zero new dependencies.** English copy. Eight screenshots, every one looked at. |

### On "paren 13/13"

CLAUDE.md says 13/13 because thirteen files is what was on the shelf when it was
written. F5 adds a fourteenth — `KIT_WATCH_DRAWER.lsp` — which is precisely what
iron rule 3 asks for: geometry cut on the machine is born in the LISP before any
JS. **14/14 at 0/0** is tonight's number. The count is now DERIVED from the
folder in both audit scripts and in the suite, so a fifteenth kit is a file and
not an edit.

---

## F1 — the run shares out from EITHER end, and takes every cabinet

> *"chodziło o to żeby były zawsze equal, i to działa — ale od lewej, a nie od
> prawej strony, czyli od jednej strony."*
> *"jak robię po prawej, to proponuje tylko 1 lub 2 szafki i nadal nie może
> przesunąć reszty."*

**(a) The run broke at a millimetre.** `buildRuns` starts a new run when the gap
exceeds `autoParts.topInfill.runGap` — ONE. Six cabinets with a 2 mm shadow in
them were TWO runs, so the share-out divided the one the hand had touched.

The share-out gets its **own scope**: `engine/runs.js buildWallRuns` — the same
LEVEL key `buildRuns` uses (`wall|mount|top`) and no gap rule at all. Every
cabinet on this wall at this level, wall to wall. **`runGap` is not changed** and
nothing else inherits this: the top infill, the cornice, the masking panel and
the plinth are still boards that genuinely cannot bridge a hole.

**(b) It only laid out from the left.** The plan now names the end it is
**anchored** on, and the anchor is the end the leftover is NOT at. The store's
growing order turns over with it, so every cabinet still moves into space that
is already free.

**The arithmetic, asserted literally** (`test/turn52-f1-…`):

```
(wall clear − infill − infill − fixed-width cabinets) ÷ movable count = each
```

At CLAUDE.md's own worked example — a 4000 wall, 40 on the left, a 260 gap on the
right, six cabinets — that is `(4000 − 40 − 40) ÷ 6 = 653`, where T51 offered
660 (one filler, not two).

**Measured in the live app**, six cabinets parked against the RIGHT wall with a
2 mm shadow between 04 and 05:

| | left edge | widths | right edge | notices |
| --- | --- | --- | --- | --- |
| before | 308 (bare wall) | 600 ×5, 650 | 3960 | — |
| after | **40** (the scribe) | **653 ×5, 655** | **3960** | **none** |

The bar read `308 mm left over · Share it out equally · 653 mm each`, the run
resolved as ONE run of six, anchored `right`, and every cabinet moved.
— `f1-the-run-before-parked-right.png`, `f1-the-run-shared-out-from-the-right.png`

Cabinet-on-cabinet overlap is untouched and stays absolutely forbidden
(*"nachodzenie na siebie to sztywna zasada"*): only the run's own auto-parts
stand down for the lay-out, exactly as T51 left them.

---

## F2 — the cup does not show through the face

> *"nie działa — nadal widać zawiasy."*

CLAUDE.md puts this in the SCENE and names what to check: **the sign and the
datum**. Both were checked, by measurement, in the running app.

**What was actually wrong.** Nothing in this app said, in ONE place, which WAY
the cup runs through a door's thickness. The only sentence about it was a comment
in `3d/Hardware.jsx` describing a procedural cylinder at half the cup's depth
inside "the door's 25 mm" — **stand-ins the chat fix of 14.08.2026 removed.** The
comment outlived the code by twelve days.

The law is `engine/doors.js cupBodyPlanes` now, published per hinge and consumed
by the view:

* the DATUM is the door's INNER face; +z runs towards the room;
* the CUP runs from `innerZ` INTO the board and stops on **the bore's own
  floor** — `innerZ + bore.depth`, never the profile's nominal;
* the BOSS runs the other way, into the carcass, entirely at `z < innerZ`.

**And the one gap the measurement does expose.** The model was seated on the
profile's NOMINAL cup depth whatever the leaf's bore turned out to be, because
`cliptop.fileDatum.z` is derived from `hardware.hinge.cupDepth`. On a leaf whose
bore had to be SHORTENED — a thin front, a shaker whose ⌀35 cup overhangs a
narrow frame, which is T51's own case — the drawn cup went deeper than the hole.
`seatZ` ends that: the body comes back out by exactly the shortfall.

**Measured in the live scene**, in the leaf's own frame (millimetres):

| leaf | door | cup (member A) | arm (member B) | crosses the face |
| --- | --- | --- | --- | --- |
| 25 mm shaker | −12.5 … +12.5 | −21.7 … **−1.5** | −100.8 … −26.6 | **no** |
| 18 mm shaker | −9.0 … +9.0 | −18.2 … **+2.0** | −97.3 … −23.1 | **no** |

Both cups stop exactly `bore.depth` in from the inner face; both bosses lie
wholly on the carcass side. — `f2-shaker-25mm-face.png`,
`f2-shaker-25mm-stile.png`, `f2-shaker-18mm-face.png`, `f2-shaker-18mm-stile.png`

### FINDING 1 — the fault CLAUDE.md predicts does not reproduce

CLAUDE.md's F2 diagnosis names a procedural cylinder that no longer exists.
Measured in the ROOM view and in the CABINET EDITOR, on a 25 mm shaker at both
the default 60 mm frame and a 30 mm one, **nothing of the hinge crosses the
door's outer face**, and nothing reads through it in the photographs. The table
above is the proof, not an opinion.

So what shipped is the LAW (stated once, measurable, asserted), the stale comment
removed, and the one real seating fault beneath it closed. If the owner is
still seeing hinges after this, the next thing to ask him is **which view** —
X-ray shows them by design, and so does `View ▸ Hinges` with a door open.

### FINDING 2 — one millimetre of floor is still legal

`hardware.hinge.cupFloorKeepMm` is **1**. An 18 mm shaker whose cup overhangs the
frame has 12 mm at the cup and is bored 11, leaving ONE millimetre of floor —
which `SKYLON_COMMON.lsp`'s own note calls unacceptable in as many words (*"one
millimetre reads through a sprayed face"*). That is the BORE, and CLAUDE.md rules
the bore out of scope tonight, so the number is untouched and the finding is
written down instead. **It is a candidate for the owner's next word.**

---

## F3 — LISP first: the dog-bone counts follow the cabinet's height

> *"jak niska szafka poniżej 600 mm to już zrób 2 dog bonesy, a jak poniżej 300
> to jeden dog bones — na plecach i BUL i BUR."*

Born in `reference/lisp/SKYLON_COMMON.lsp` as `SKY:tabCount`, `SKY:tabCentres`
and `SKY:middleTabFloor`; `engine/puzzle.js tabCentres` is the same three-way
`cond`, in the same order.

**346 → 600, and 346 does not disappear.** Turn 8 derived it (190 + 120 + 36) as
the length under which three dog bones COLLIDE. That is still true, so it stops
being the SWITCH and becomes the **floor** the switch may never go below. The
profile says so beside the number and keeps the derivation;
`test/low-tabs.test.js` now holds the profile's number ABOVE it and still proves
the collision it describes.

**300 is AT OR BELOW, and that is the whole of it.** `lowCabinet.minHeight` is
EXACTLY 300, so a rule written `< 300` could never fire on the one cabinet it
exists for — the feature would have shipped dead. Said in the LISP, in the
profile and in the tests.

`t52-classify --tabs`:

```
config      height   tabs  centres
WARDROBE    2150     3     95 · 1075 · 2055
BUD         770      3     95 · 385 · 675
WUD         720      3     95 · 360 · 625
BUDR        770      3     95 · 385 · 675
BUDR4       770      3     95 · 385 · 675
PANTRY      2100     3     95 · 1050 · 2005

the switches: three below 600, one at or under 300
the probe:    700 → 3   500 → 2   280 → 1
```

CLAUDE.md's own morning-audit probe, and it passes. *"Na plecach i BUL i BUR"* is
ONE change, not three: the back's side sockets are cut at the very centres the
sides' tenons are, and the screw rows follow ("between the tabs", so a single tab
gives two rows and no NaN).

**What moved:** the cut of a LOW_CABINET between 300 and 600 — the cabinet he is
asking about. **What did not:** everything at 600 or over, hole for hole. The six
goldens are 720–2150 tall.

---

## F4 — the leftover, once more, and the bar tells the truth

> *"One number, computed once, displayed and applied."*

**And they did disagree, for one reason, and it is a missing argument.**
`3d/ShareOutBar.jsx` worked the run, the gap and the plan out for itself and
called `shareOutPlan(run, { wallWidth, others }, profile)` — **with no
`wallMargin`.** So the end of the run with no filler standing on it YET reserved
nothing, and the bar offered 660 each where the store was about to build 653.
Forty millimetres, read off a strip and missing at the wall.

One number now means ONE DERIVATION: `projectStore.shareOutSubject` resolves the
walls, the wall margin, the run and the plan together, **and the wall margin is
inside it so no caller can forget it again.** Three callers take it —
`settleLayout` raises the offer, `shareOutView` is what the bar reads,
`shareOutRun` applies it. `3d/ShareOutBar.jsx` no longer imports
`engine/shareOut.js` at all.

Proven by measurement in the app (the F1 table above): the strip said **653** and
every cabinet was built to **653**. Plus a fixed-point test — the leftover is
measured from the CARCASS (T51's F4), so a run finishing on both walls still
reads its two scribes as 80 mm of leftover and the bar may stand again; what it
says the second time is the same number, and pressing it moves no width and no
cabinet.

---

## F5 — the watch drawer

> *"szuflada z przegródkami na zegarki, krawaty etc … szkło i podświetlenie …
> rama z Eggera ale podświetlone zegarki … oczywiście szuflada nasza
> standardowa, tylko przegródki z 9 mm zrób, i szuflada płytka w środku, myślę
> że około 60 mm."*

**"Szuflada nasza standardowa" is the whole design.** An INSERT, not a drawer
type. The box is untouched — and the test proves it by comparing a drawer WITH
the insert against the same drawer without, board for board and drill for drill.

Born in the LISP: `reference/lisp/KIT_WATCH_DRAWER.lsp`, a new file that touches
no other kit.

| number | value | where it comes from |
| --- | --- | --- |
| divider / frame / base stock | **9 mm** | his |
| inside depth | **60 mm** | his — the trade standard is ~50; 60 carries a chronograph and a lining, and BOTH are written in the profile |
| pocket | **~110 deep × 95 wide** | the count FOLLOWS the width |
| pocket floor | **60 mm clear** | a watch case runs 30–48 |

**The count is never a fixed five.** Five across is what these numbers give an
insert of about 500 mm inside width — `5 × 95 + 4 × 9 = 511`, a 600 mm drawer.
A 900 mm drawer gets **eight** by the same rule.

**ONE row at the front**, long sections behind — *"the back row cannot be reached
once the drawer is in"* — and the rail that makes it one row is a cut part with
housings on both faces.

**The three decisions**, each asserted where it lands:

1. **The glass LIFTS OUT** — a rebate in the top of all four rails, 4 mm down and
   5 mm in, leaving a 4 mm lip of rail proud of the pane all round. No bead, no
   stop, no screw.
2. **The LED lights the WATCHES** — the groove is in the INNER face of the FRONT
   rail, under the glass; in the scene the strip carries an area light turned
   back and DOWN into the tray.
3. **Its own BOM line** — a FLAG on a drawer item, orthogonal to `variant`, so a
   customer can have it in one drawer of six.

**CNC:** the divider slots (housings, 3 of 9 mm — never through), the frame, the
glass rebate and the LED groove. The groove is `KIT_LED_GROOVE`'s own — 4 mm,
centred, and T48's **+10 mm past the profile at each end**. Not one number of
that law is restated.

**Too shallow is reported, never squashed.** The engine refuses (nothing cut,
nothing ordered) and **Check #23** names the drawer and the shortfall.

`t52-classify --watch`:

```
config      drawer items  asking   parts  published
WARDROBE    0             0        0      no
…all six the same…
asked for one: 7 pockets at 92.3 mm, 3 sections, 14 pieces cut
```

— `f5-the-watch-drawer-lit.png` (the wardrobe, the drawer out, the tray in it),
`f5-the-pockets-and-the-light.png` (fronts off — the pocket row at the front,
four long sections behind, the pane and the strip).

---

## What this turn did NOT touch

The six goldens' bytes. **The DXF export's emptiness** — still its own CRITICAL,
still not this turn. The lighting rig (*"lights działają super"*). The warehouse.
`runGap` itself. `hardware.hinge.cupFloorKeepMm` (finding 2 above).

---

## The numbers

```
suite            4606 pass / 0 fail          (never --silent)
build            clean
t52-classify     IDENTICAL 6, UNNAMED 0
  --tabs         CLEAN   700 → 3, 500 → 2, 280 → 1
  --watch        CLEAN   six configs, zero parts; asked, 14 pieces
  --plan         CLEAN   no golden has a run to share
t52-paren        14 kits, every one 0/0; only SKYLON_COMMON.lsp and the new
                 KIT_WATCH_DRAWER.lsp moved
screenshots      8, every one looked at
dependencies     zero added
```
