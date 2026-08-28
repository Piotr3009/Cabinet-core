# TURN 53 — the verdict

*The big night: the gate, the empty DXF, the slope's infills, the watch drawer
v2 and the drawn room. Ten features, ten commits (eleven — F10's mockup came
first, as F10 asked), and this walk. Nothing was skipped.*

---

# DECISIONS TAKEN FOR THE OWNER — veto in one line

*He slept through the run. Where his word was needed and not given the decision
was TAKEN, and every one of them is here, with the line that undoes it.*

| # | Feature | The decision | Veto |
|---|---------|--------------|------|
| 1 | F8b | The pane sits **flush with the shelf top**; the rebate is exactly one glass thickness deep. A proud pane on a wardrobe shelf catches every sleeve. | "pane proud" |
| 2 | F8d | With **no shelf directly above**, the glass option is **greyed with the reason on it** ("needs a shelf directly above"), never silently hidden. | "hide it instead" |
| 3 | F8e | The **four layouts are mine** — Classic, Cufflinks, Ties, Belts — drawn strictly inside his three categories (zegarki, krawaty, paski). All four keep one pocket row at the front; only the rear field varies. | "redraw N" (any one of the four, by name) |
| 4 | F8g | A **T52 v1 insert migrates**: its in-frame glass becomes the shelf-glass option where a shelf stands above, and is **dropped and named** by Check where none does. | "keep the old pane" |
| 5 | F9 | **`cupFloorKeepMm: 3`** — a cup bore leaves three millimetres of face, not one. Where three cannot be kept the bore shortens and the leaf is named. | "back to 1" |
| 6 | F10 | A **Close button** beside the catch: it completes the minimal ortho path home — one wall where the pen is aligned, an L of two where it is not. | "catch only" |
| 7 | F10 | **"2× większy" is measured on the DRAWING**, the thing he asked to be bigger: the one-wall canvas is 560 × 300, this one is 800 × 430 — twice the area — and the window grows 820 → 1160 px. A literal 1640 px window does not fit the laptop it was drawn on. | "make the window 2× too" |
| 8 | F10 | **Clicking a wall saves the outline first.** The elevation editor edits `project.room`; a wall that is not in the project has no elevation to open. A guard refusal says so and opens nothing. | "ask before saving" |
| 9 | F2 | The DXF's two **dangling references** (`CONTINUOUS` on every layer row, the implicit `STANDARD` text style) are **left standing** and written up rather than fixed. The production writer at the shop has the identical construct and imports; BLOCKERS #8 records what an unverified dialect change costs on the morning of a cut. | "define them" |

---

# THE IRON RULES, ANSWERED

| Rule | Asked | Answered |
|------|-------|----------|
| **1 · ZERO-STOP** | Skip-and-note, never halt; PR open before morning | **Nothing was skipped.** All ten features shipped whole. F10, the named first sacrifice, landed complete — mockup, engine, window, tests and the scope fence measured. |
| **2 · BYTE-IDENTITY** | Six goldens IDENTICAL, UNNAMED = 0, proven the three-line way; a `--probe` per feature | **6 IDENTICAL, UNNAMED 0** (`audit/classify.txt`), base dumped with `t52-classify.mjs`, head with `t53-classify.mjs`, compared. **Ten probes, ten CLEAN** (`audit/probes.txt`) — f1…f10, each showing both that no golden can reach the feature AND that the feature's gate bites when asked. No bucket was named, because none was needed. |
| **3 · LISP IS LAW, FIRST** | F3, F4, F6 in SKYLON_COMMON; F8 in KIT_WATCH_DRAWER; every kit 0/0, count derived | **14 kits, every one 0/0** (`audit/paren.txt`), the count read off the folder. `SKY:vertInfillTopY`, `SKY:vertInfillDeg`, `SKY:infillSegsUnder`, `SKY:cutPtsBetween` (F3); the T47 side sections re-read and found correct (F4); `SKY:stripsAtCabinetEdges`, `SKY:stripOversize` with his worked example in the kit (F6); `SKY:watchShelfOpening`, `SKY:watchShelfLedRing`, `SKY:watchRearField` and a third layer `WATCH_GLASS_OPENING` (F8); `SKY:cupFloorKeep` (F9). Each written before its JS. |
| **4 · SANCTITY** | Zero deletions without a named licence; exactly ONE tonight, scoped to F8 | **One licence, one spend.** `drawWatchGlassRebate` and `drawWatchLed` are gone from KIT_WATCH_DRAWER.lsp, and `rebate()`/`ledPath()` from `engine/watchDrawer.js`, each with the account beside its grave and T52's own test file naming the amendment. No second deletion was needed and none was taken. |
| **5 · THE WALK** | Full suite at every commit, clean build, English copy, zero new dependencies, screenshots looked at, draggable modals beside the object, ✕ on every field | **Suite 4727 / 4727, 0 fail.** Build clean. **Zero dependencies added** — every picture in this folder was drawn by HTML and CDP. English throughout; the F10 test asserts no Polish survives in the window's own copy. Both new windows go through the shell with an anchor. The ✕ is on the share-out bar (F1b) and on the drawing's wall-length field (F10). **Every screenshot in this folder was opened and looked at**, which is how the mockup's double render and the walk's own mis-aimed cursor were caught. |
| **THE HOUSE OVERLAP LAW** | No two boards overlap unless he asked | **Three breaches closed** (F4's wedge, F5's boxes inside each other, F7's face over the front below) and **one prevented in the new code**: F10's Close refused to lay the closing wall down an existing one — a fault the app would otherwise have absorbed in silence. |

---

# THE FEATURES

## F1 · the share-out gate, and the ✕ — `1ab2f13`

> *"jak dołożę nową szafę lub cupboard, i zostaje mniej niż 400 to muszę
> przesunąć żeby się pojawiła ta informacja … czyli działa w 99 procentach."*

**Diagnosed to the millimetre, on the live store.** `plan.gap` is the SUM of
both ends' carcass-to-boundary gaps, and the gate refused at `gap >= 400`. Fill
a 4000 wall from the left with six 600s: **360** mm of bare wall on the right —
what he sees — plus the left end's **40** mm bodyGap, which is the scribe's own
reserve and not free space. **400 ≥ 400, silence.** Nudge one cabinet a
millimetre toward the gap: 399, and the bar appears. That is the missing 1 %.

**Shipped:** the gate reads the leftover **less what is reserved** —
`gap − reserved.total`, the same `reserved` the plan lays the run out with.
400 − 80 = **320 < 400**, so the bar stands **on the add**; after a share-out,
80 − 80 = **0**, so it does not stand again — which also closes the T52
verdict's own note about the bar returning forever over two scribe fillers.
One cause, two bugs, one line of arithmetic. The BAR still prints the visible
leftover (360), because that is the number he reads off the wall.

**The ✕** dismisses the offer for THIS gap: the plan's signature (wall, mount,
rounded startAt/endAt/gap) goes to the UI store, `settleLayout` will not
re-offer while it matches, and any real geometry change clears it.

**Measured:** 12 tests. Browser: the bar standing on the add at 360/653, the ✕
under the cursor, and the bar gone after it — and still gone after a settle.

## F2 · the DXF export — `5b20184`, amended by this walk

> *"DXF eksport PUSTY — bez tego CNC nie dostaje nic."* — five days standing.

**The diagnosis, and it is not what the report said.** The export does not
produce nothing. On a seeded job — a run of BUD/BUDR with drawers, a wardrobe
under a slope carrying a watch drawer, a second wardrobe with doors and a shoe
box behind them — the three export paths write **81 files, 495,743 bytes, 1,692
geometry entities and 328 drillings** that match the engine's own hole list to
0.05 mm. Not one file is zero bytes; every part file's extents cover its own
`cnc` geometry; every layer used is declared; every file parses as R12 pairs.
The same holds in a real Chromium down to the file on disk. **Where it broke:
nowhere in the writer** — `engine/cnc/dxf.js` is the same serialiser, group code
for group code, as the production writer cutting jambs at his shop today.
**Since when: never.**

**What opening the files DID find — a part the machine never got.** A shoe box
with a hinged side each way cuts TWO battens, and both were called
`SHOE1-BATTEN`. A panel id IS the file name and the per-unit export is a ZIP:
two entries with one name is ONE entry. They are `-L` and `-R` now; the BOM part
code is untouched.

**And what this walk found in F2's own proof.** The audit reported *"slope notes
in the files: 0"*. True, and hollow twice over: the seed's rake fell to 1900
over 900 mm at the end of a 6000 wall and never crossed 2150, so **not one panel
in the job carried an angle at all**; and the reader looked for `°` in files
that are ASCII and say `DEG`. CLAUDE.md asks for *"the slope note text where
F3/F4 give a piece an angle"* — a seed with no angle cannot answer that. The
rake now crosses inside the last wardrobe's own span, the reader knows what an
R12 degree looks like, and there are **21 slope notes** in the files:
`CUT 28.8 DEG` on the sides, `BEVEL 28.8 DEG BOTH ENDS · 5-AXIS` on the roof
board. The test that accepted the honest zero now asserts the note, the angle
and the geometry under it, and names its own amendment.

**Two findings written up, not changed** — the dangling `CONTINUOUS` and
`STANDARD` references (decision 9 above).

**Measured:** 9 tests. `audit/dxf.txt`, the 81-file sample set in `dxf/`, and
ten of them drawn from their own bytes in `f2-dxf-in-a-viewer.png` — 172 shapes,
the CUT and BEVEL notes legible on the glass.

## F3 · the slope's infills — `eb028e3`

> *"top infill po skosie w ogóle nie działa … jakoś dziwnie się rysuje gdzieś
> poza ścianami."* · *"pionowy infill na CNC się tnie pod skosem, ale na
> wizualizacji pokazuje prosto."*

**Two sources of truth** — the disease the grain rule already killed once. The
CNC path carried the slope; the 3D solid ignored it. LISP first, then the
engine, then the 3D, which measures nothing of its own: **every piece the
machine cuts on the slope is drawn cut in the room.** The vertical infill takes
its cut line from the same `cutLine` the outline came from (sampled over the
piece's BODY, not its blank, because the blank carries the scribe allowance);
the run top infill becomes segments behind the ceiling polyline, broken at every
knee; the vertical runs to `slopeHeightAt` at their own x; the slope infill
takes the outline the CNC file takes.

**Measured:** 11 tests holding engine outline ⇄ CNC geometry equal per piece.
Browser: a three-wardrobe run under a right-hand rake, cut on the slope, nothing
outside the wall.

## F4 · BUL/BUR on the slope — `a46d0d6`

> *"zamiast BUL obciąć pod kątem pasującym do wieńca, to się nachodzą materiały
> na siebie."* · *"nie cięcie wieńca — on już jest dobrze cięty."*

**Diagnosed — and it is NOT a mirrored sign.** The engine's numbers were right
the whole time, on both rakes: each side's top at each of its two faces is the
roof board's own underside there, and the HIGH one is always on the peak side.
What was wrong is **one condition in `3d/panelSolid.js`**: the wedge is taken
off by `bevelTopEdge`, and it was gated on `panel.cnc.slopeCut` — which **a side
never has**. A side's CNC outline is deliberately a square blank (a three-axis
machine cannot cut a bevel, so the angle rides the part's record). So the gate
was dead, the bevel was never applied, and the blank stood proud of the roof
line exactly as his screenshot showed. The roof board was never touched.

**Measured:** 9 tests, per side, on both rakes. Browser: the corner close-up,
the bevel meeting the board with no wedge.

## F5 · top boxes side by side — `3bf6dc9`

> *"top box łamią zasadę — nakłada się jeden na drugi … jak dodaję plusik po
> lewej, to on się nie pojawia po lewej, tylko jeden w drugim."*

**Diagnosed: 1 main = 1 rider at the main's own x.** Three clauses, three
symptoms — `settleRiders` wrote `x = host.x_mm` HARD (the whole of *"jeden w
drugim"*); `riddenBy` was a Map host → ONE rider, so a second silently shadowed
the first; and the add-plus on a box fell through to the last main in the
project. The model turned over: a rider keeps **its own x** (stored as an offset
so a settle cannot confiscate it), clamped inside the host's span; a host
carries a **list**; rider–rider overlap is forbidden; the add-plus places
beside the clicked box and **refuses in words** when there is no room.

**Measured:** 12 tests, plus T36's and T37's own files amended and naming it.
Browser: two boxes side by side on one 1200 main, surviving a settle; the third
refused with the sentence.

## F6 · plinths and infills, vertical and split — `7108b74`

> *"płyta ma 2400 a plinth wychodzi 3200 … 3 × 650 = 1950, reszta drugi pasek.
> łączenie zawsze równo z szafką, a nie na środku szafki."*

LISP first, then `engine/strips.js`, which matches the kit rather than
interpreting it. **Vertical: half of it was already true** — PLINTH has been on
`CUT_STANDING_PARTS` since T40, but INFILL was not, so a long filler came off
the saw lying down and banded across its own grain. INFILL is the seventh role
on that list tonight. **Split at a cabinet edge:** whole cabinet widths while
the sum fits the assigned board's real height (never a hardcoded 2400), and the
oversize check now flags only a single cabinet wider than the board.

**Measured:** 11 tests, his worked example number for number, plus a randomised
run of widths with no joint mid-cabinet. Browser: the cut sheet with
`PLINTH-1 1950×100` and `PLINTH-2 1300×100`, both standing, the joint on the
cabinet line.

## F7 · the shoe front joins the drawer-front law — `f2475d5`

> *"nie licuje się z frontem, nie licuje się z innymi szufladami, nie wiem
> dlaczego front zachodzi na szufladę na dole."*

**A parallel world, measured on his own scene** before anything moved: the
drawer fronts stood on z = 493, the shoe face on **z = 540** — 47 mm proud of
the plane it is meant to be flush with; the box floor was written 36 mm
**inside** the drawer zone, straight through the partition board; and the face
overlapped the drawer front below by **31 mm** with no gap at all. Three
divergences, three corrections: the face takes the plane the drawer-front panels
emit (read from them, not restated), one `−G` goes, and the face keeps the same
front gap as every other front. **The face is vertical**; the shelf's 15° tilt
is interior design and stays. The T37 width rule and `frontH = 120` are
untouched — they are his own standing law.

**Measured:** 10 tests; the box, slope floor, battens and runners byte-identical
to before. Browser: the stack with the shoe face above it, three faces on one
plane with one gap between each.

## F8 · the watch drawer v2 — `94af592`

His re-specification, walked and taken word for word. **Position 3, under
Drawers**, on top of the stack, **fixed height** — 140 mm, and every term of it
is a profile number, checked against the engine: at 140 the insert is cut, at
139 it is refused. **The glass moved upstairs**: a through opening 50 mm in from
every shelf edge, the pane flush with the shelf top, the LED ringing it from
**below**, ~15 mm outside, firing down onto the watches (T52's law relocated,
not repealed). **Four layouts** in a new draggable window beside the drawer,
each card a top view of *this* tray. **Finish**: Spray / Oak / Walnut, default
the project decor, driving the BOM. **Migration** of a v1 insert, and where
there is no shelf the pane is dropped and **named**.

**The one sanctity licence of the night** was spent here, and only here.

**Measured:** 19 tests. Browser: the menu entry third in the list, the four
cards, the glass ticked and the opening cut — `pane 768 × 428 in SHELF-1`.

## F9 · one millimetre of floor stops being legal — `78d52fc`

T52's finding 2, standing since its morning audit. **`cupFloorKeepMm: 3`**, in
the LISP first with the reason and the consequence written out. Where three
cannot be kept the bore SHORTENS (the existing clamp, unchanged) and
`cupTooThin` names the leaf — refuse and report, never a 1 mm floor.

CLAUDE.md called this the likeliest of the ten to surprise a golden and asked
for a probe. `--probe f9` prints every golden leaf's thickness at the cup, its
bore and the **headroom before the clamp would bite**: 25 mm at the cup, 11 mm
spare, **0 shortened**, across all six. And the clamp is shown to bite: a 16 mm
shaker with a 6 mm rebate bores to the material less the keep and says it is
short. **7 tests**, plus T51's and T52's own cup files amended and naming it.

## F10 · the drawn room — `ef6caaf` (the mockup) and `293197d`

> *"robimy jak w CAD … na końcu ostatnią linię łapiesz i łączysz — zawsze
> łączysz, taki catch, żeby pokój był zawsze połączony (jak w życiu ściany)."*

The **mockup came first**, as F10 ordered, and the implementation answers to it.
`engine/drawRoom.js` is the drawing and nothing else — four directions, a
segment, an undo, the catch, the close, the faults, the corner list — with no
React, no store and no three.js anywhere near it, which is the only reason a CAD
flow can be argued in a node test. `DrawRoomModal.jsx` is the hand.

**His own assertion, answered:** 4000 → 3000 → 4000 → catch gives corners
**byte-equal** to `rectCorners(4000, 3000)`.

**The scope fence, measured rather than promised.** `t53-f10-downstream.mjs`
walks eleven stages twice — the drawn rectangle and a drawn six-wall L: draw,
close, save, `roomWalls`, an elevation per wall, placement on the first wall, a
run of three, placement on the LAST wall, collision refused, share-out, checks,
DXF. **All eleven ok on both.** Skip-and-note was ready and was not needed:
there is no numbered finding to file.

**Two bugs this feature found in itself, both fixed and both asserted:**

1. **The close could lay a wall on a wall.** A U — out, down, part-way back —
   has two ortho ways home, and the obvious one puts the closing wall straight
   down the first. The doubled corner does not TURN, so the corner list absorbed
   it and a 3000 mm room came out **1200 mm wide with nothing anywhere saying
   so**. `closePath` builds both turns and asks each; `pathFaults` gained the
   reading that catches a doubled-back wall, checked on the ring **before** any
   tidying, because the corner list is exactly where that fault disappears.
2. **The frame followed the hand.** The canvas framed itself on the path AND the
   cursor, so it re-scaled on every pointer move: the pen slid under the cursor
   and the direction the pen read was not the one the hand pointed at. The first
   browser walk drew "right" three times and got "away".

**Measured:** 21 tests. Browser: the door in Room setup beside T51's four tools,
the ghost mid-flow with the number typed, the catch lit at the origin, the
six-wall room closed, and its wall 3 open in the standard elevation.

---

# FINDINGS

*Written up rather than waved through, and not fixed tonight.*

1. **The DXF names two things it never defines.** Every layer row cites the
   linetype `CONTINUOUS` and every TEXT an implicit `STANDARD` style; neither is
   in the file's TABLES. A strict reader may refuse them. **Not changed**: the
   production writer at his shop emits the identical construct and imports
   cleanly today, and BLOCKERS #8 records what an unverified dialect change
   costs on the morning of a cut. It wants a bench test on the machine, not a
   guess at midnight.
2. **The "empty DXF" report is not reproducible and its real cause is
   unknown.** Five days of handover say PUSTY; 81 files and 495,743 bytes say
   otherwise, in node and in a browser, down to the file on disk. The missing
   shoe batten is a real bug and is fixed, but it cannot be what he saw. The
   next step is HIS file — which project, which export button, and what landed
   in the folder — because everything this repo can reach has now been opened.
3. **The wardrobe wizard warns `SHAKER_FRAME_TOO_WIDE` on a plain 900 wardrobe**
   with default fronts (seen throughout tonight's walks, unrelated to any of the
   ten). It is a default-profile question, not a bug in tonight's work, and it
   is left standing rather than quietly retuned.

---

# THE NUMBERS

| | |
|---|---|
| Suite | **4727 tests, 4727 pass, 0 fail** — run at every commit, never `--silent` |
| New tests tonight | **121** across ten files (F1 12 · F2 9 · F3 11 · F4 9 · F5 12 · F6 11 · F7 10 · F8 19 · F9 7 · F10 21) |
| Older tests amended | **9**, each naming its own amendment in the file (T12, T36, T37, T41, T46, T51×2, T52×2) |
| Build | clean |
| Dependencies added | **0** |
| Byte-identity | **6 IDENTICAL, UNNAMED 0** |
| Probes | **10 of 10 CLEAN** (f1…f10) |
| Paren balance | **14 kits, every one 0/0**, count derived from the folder |
| DXF audit | 81 files · 495,743 bytes · 1,692 entities · 328 drillings matched · 21 slope notes · CLEAN |
| F10 downstream | 11 stages × 2 rooms (4 walls and 6) — **all ok** |
| Screenshots | **21**, every one opened and looked at |
| Functions deleted | **4**, all under the single F8 licence, each accounted for |
