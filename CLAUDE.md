# CLAUDE.md — TURN 54 · the slope, DESIGNED TO THE MILLIMETRE this time

Nightly run. Full autonomy, zero questions, zero stops. Skip-and-note, never
halt; PR open before morning regardless. Sacrifice from **F6 downward**;
**F1 and F2 do not fall.** Branch from `main`. One commit per feature,
F1 → F6, plus the acceptance walk.

**Why this spec reads like a drawing office put it out:** the slope family is
on its SEVENTH pass (T46, T47×2, T48, T50×2, T53×2 + a chat-fix) and the
owner's audit still measured the roof, the strip and the shelf STACKED ON THE
CEILING. Green suites merged every one of those passes. So tonight the spec
carries the geometry: every law below is stated in numbers with the assertion
beside it, and where the owner approved a mockup its content is restated here
in millimetres. **You execute; you do not interpret.** Where these numbers and
any older comment in the code disagree, THESE NUMBERS WIN and the comment is
corrected to match.

Out of tonight, into T55 (already agreed with the owner): the Draw-room v2
product surgery and the shoe-drawer rebuild. Do not touch either.

---

## THE IRON RULES

**1 · ZERO-STOP.** As above.

**2 · BYTE-IDENTITY.** `scripts/t54-classify.mjs` (re-head T53's; derive the
kit count — the shelf is still **14**, the shoe kit dies in T55 not tonight).
Six goldens **IDENTICAL, UNNAMED = 0**, three-line proof (base dump with
`t53-classify.mjs`, head with t54, compare). Expected buckets: **none** — F1,
F2, F3 cut only under `slope_cut` (no golden carries one); F4 changes a
watch-insert derivation and the click wiring (no golden carries an insert);
F5 and F6 are UI visibility/timers. A `--probe` per feature, exit codes.
A golden that moves = FINDING, never a bucket.

**3 · LISP IS LAW, FIRST.** F1's trio law and F3's leaf-under-slope law are
cut on machines, so they are written in `reference/lisp/` BEFORE the JS: F1
in SKYLON_COMMON's slope section (amending the T47 words it corrects — leave
the history, add the correction with tonight's date and the owner's ruling);
F3 in the kit that owns the door leaf. F4's `WATCH_INSIDE 60 → 40` lands in
KIT_WATCH_DRAWER.lsp with the trade note amended. Paren: **14 kits, every one
0/0**, count derived.

**4 · SANCTITY.** ONE narrow licence tonight: **the peak-side patch piece of
F2** — whatever emission puts a board in the peak band that is not one of the
five named pieces — dies, and its grave is named in the verdict. Nothing else
is deleted. `chatfix-2508-slope-tilt.test.js` is AMENDED (it currently holds
the fault green) and names its amendment; amended ≠ deleted.

**5 · THE WALK.** Full suite every commit, never `--silent`, grep not tail.
Build clean. English UI copy. Zero new dependencies. Screenshots in
`verify/t54/`, every one LOOKED AT. Modals draggable, beside the object. ✕ on
every search/filter field. The house overlap law (Petros, 27.08): *"nie
pozwalamy na nachodzenie się materiałów na siebie, chyba że ja sobie tego
zażyczę"* — F1 exists because the engine itself breaks it today.

---

## THE COORDINATE LANGUAGE USED BELOW (one frame, no exceptions)

Unit frame: x along the unit from its left edge, y up from the carcass floor,
z out of the front face. `ceil(x)` = the ceiling polyline of `slope_cut.pts`
at x (already what `infReachAt` samples). `β` = the segment's own rake angle,
`infill` = `slope_cut.infill` (the owner's 40 unless a project says else).
`G` = board thickness (18). "Vertical" means along y. "Along the slope" means
along the rake direction. Every assertion tolerance is **0.01 mm** unless a
tighter one is stated.

---

## F1 [CRITICAL] · the TRIO — roof, strip, shelf — each on ITS OWN line

**The measured fault (owner's audit, 28.08, spadek w prawo, β = 26.5651°,
infill 40, W = 600, ceiling 2000 → 1700):** TOP, INFILL-T-FACE and
INFILL-T-SHELF all carry `tilt_pivot = (600, 1700)` — the CEILING at the low
end — and after rotation ALL THREE lay their top edge ON the ceiling:
TOP-top→ceiling = 0.00 (should be −40 band down), TOP∩FACE = 18 mm of overlap
the full length, SHELF congruent with TOP, and FACE-bottom stops **4.72 mm
short** of the cut line (40 along the slope ≠ 40 vertical). Three boards, one
line, a stack. That is the owner's *"infill powyżej skosu odwrotnie
ustawiony"*.

**The root:** one reach (`infReachAt` = ceiling) feeds every pivot. The chat-
fix of 25.08 wrote "the pivot is the line the piece hangs from" and then hung
all three pieces from the same line.

### THE LAW (approved mockup, restated in numbers)

Two reach functions, not one:

- `ceilReach(x)  = ceil(x)`                       — the ceiling.
- `cutReach(x)   = ceil(x) − infill / cos β(x)`   — the carcass CUT line:
  the owner's 40 is the FACE board's CUT HEIGHT, mounted along the slope, so
  the vertical reserve it consumes is `infill / cos β` on a raked stretch and
  exactly `infill` on a flat one (cos β = 1 — today's flat behaviour is the
  degenerate case and MUST byte-match it).

**DECISION TAKEN for the owner (veto: "40 w pionie"):** the 40 stays the CUT
size of the strip; the vertical gap grows to 40/cos β under a rake. The
alternative (40 vertical) would print a different cut height per segment
(40·cos β) on every sheet, which is the offcut-and-mistake machine.

Per piece, per SEGMENT of a bent ceiling (each segment has its own β, its own
ends `x_lo` = the end where `ceilReach` is LOWER, `x_hi` the other):

1. **INFILL-T-FACE** — rectangle, cut height `infill` (+20 scribe oversize on
   the ceiling edge as today), length `span/cos β`. `tilt_axis 'z'`,
   `tilt_deg` signed CCW: fall-to-the-right ⇒ negative (unchanged).
   **`tilt_pivot = (x_lo, ceilReach(x_lo))`** — the CEILING at the low end
   (this piece alone keeps today's pivot).
   ASSERT after hand-rotation (the `spin()` of chatfix-2508):
   `|FACEtop(x) − ceilReach(x)| ≤ 0.01` at x_lo, mid, x_hi; and
   `|FACEbottom(x) − cutReach(x)| ≤ 0.01` at the same three stations.
2. **TOP (the roof)** — rectangle h = G, same tilt sign law.
   **`tilt_pivot = (x_lo, cutReach(x_lo))`** — the CUT line, not the ceiling.
   ASSERT: `|TOPtop(x) − cutReach(x)| ≤ 0.01` at three stations ⇒ with F1.1
   this gives `FACEbottom − TOPtop = 0` for free — assert it anyway, by name.
3. **INFILL-T-SHELF** — lies ON the roof: rectangle h = G, pivot
   **`(x_lo, cutReach(x_lo) − G/cos β)`** so its TOP face is the roof's
   UNDERSIDE… no: the shelf lies on the roof's UPPER face per T47's own
   words (*"wieniec jest na górze… shelf board"*), which tonight's trio makes
   impossible without re-entering the FACE band. RESOLUTION, taken for the
   owner (veto: "shelf pod wieńcem"): **the SHELF sits UNDER the roof**, its
   top face on the roof's underside: pivot `(x_lo, cutReach(x_lo) − G/cos β)`,
   ASSERT `|SHELFtop − TOPbottom| ≤ 0.01` three stations, and SHELF is
   scribed/edged exactly as today.
4. **Disjointness, the Petros law, measured:** for every pair of the trio the
   rotated rectangles intersect with **area 0** (shared edges allowed). Write
   the check as geometry (rotate all corners, polygon intersection), not as
   eyeballing y-bands.
5. **The sides:** `sideUnder`/`roofBoards` consume the roof's REAL line, so
   feed them `cutReach` where they took the old reach; BUL/BUR blanks re-
   assert: blank top = peak of (cutReach − footprint) over the side's own two
   faces, angle stated, nothing pokes above `cutReach` anywhere.
   ASSERT on the T47 fixtures re-run tonight.
6. **Both rakes.** Every assertion above runs twice: left-high and
   right-high. The measured table from the owner's audit (0.00 / −40.00 /
   ∩18 / +4.72) is committed in the test header as the BEFORE, so the next
   reader knows what this looked like when it was wrong.
7. **The RUN path is the same trio.** `runTopInfill`'s segments
   (cabinet.js ~5096 emit) get the identical per-segment law — pivots at each
   segment's OWN x_lo on ITS OWN two lines; the knee joins (`joinL/R`,
   half-angle) unchanged; the F6-T53 cabinet-edge splitting unchanged.
   PROBE: a two-knee polyline over three cabinets — every segment passes the
   three-station assertions; print the worst residual in `audit/f1.txt`.
8. **Parity, three surfaces:** the WALL ELEVATION drawing and the DXF outline
   of each trio piece read the same meta and land on the same lines — assert
   elevation y's and DXF extents against the rotated corners (tolerance
   0.05 as the DXF audit uses).
9. **`chatfix-2508-slope-tilt.test.js`** is amended to the new law (TOP on
   `cutReach`, not ceiling) with the amendment named in-file.

Screens: the owner's exact scene rebuilt (wardrobe, right fall, 40) —
before is impossible now, so shoot AFTER from the same camera as his SS plus
a close-up of the trio edge-on with the three boards visibly parallel and
disjoint; and the two-knee run.

---

## F2 [HIGH] · the PEAK — BUR cut ON THE SLOPE like BUL, and the patch piece dies

Owner, with his screenshot: *"lewy czyli dolny skos działa super, górny znowu
jakieś małe kawałki — po prostu przedłuż wieniec i wywal jakiś mały kawałek z
BUR. tylko na BUR, nie na BUL."* Corrected on the mockup: *"wieniec zielony
ok i do wieńca dochodzi BUR i tyle, i ucięty pod skosem dokładnie tak samo
jak BUL."* The approved mockup, in words: the roof runs on the rake to the
**outer face** of the peak-side side; that side's top edge is **bevelled at β
meeting the roof's underside** — the identical treatment the fall side
already gets; **no third piece exists at the peak.**

1. **Census first, then the kill.** Reproduce the peak (both rakes, peak at
   left and at right): list EVERY panel whose rotated geometry enters the
   band `[cutReach − 120, ceilReach]` over the peak-side G of width. The
   allowed census is exactly: the peak side (BUL or BUR), TOP, INFILL-T-FACE,
   INFILL-T-SHELF, and a run's side filler where one exists. **Anything else
   is the owner's "mały kawałek": find its emission, delete it under
   tonight's one licence, name the grave.** If the census comes back clean in
   the seed, the kawałek is scene-side or run-side — hunt the same band in
   the RUN emit and in `panelSolid`'s outputs before declaring victory; the
   verdict states where it lived.
2. **Roof to the outer face:** on a raked stretch that ENDS at a side, the
   roof board's length runs to that side's OUTER face (today's inner-face
   stop is the wedge the owner keeps seeing). ASSERT: roof end x = side outer
   x, both rakes, both ends; flat stretches unchanged.
3. **The side's bevel meets the roof:** re-assert T53-F4 coplanarity —
   side-top bevel face ⇄ roof underside along the shared stretch, ≤0.01,
   both sides, both rakes — now against `cutReach` geometry.
4. **CNC cuts the LONGER version, both sides** (*"na CNC zawsze tnij dłuższą
   wersję, BUR i BUL"*): blank = the tall corner (pick = max), angle label on
   the piece — already law; assert it survives F1/F2 by reading the sheet.
5. Zero patch pieces: the census of (1) becomes a permanent test.

Screens: the T52-style corner close-up at the PEAK, left-rake and right-rake.

---

## F3 [HIGH] · the DOOR LEAF is cut on the slope its own shaker already knows

Owner's screenshot: a shaker door under the rake — *"shaker się robi pod
skosem ale całe drzwi już nie."* `doors.js` contains the word "slope" ZERO
times; the leaf is a full rectangle standing into the triangle while its own
shaker detail rakes. One consumer got the line, the other never heard of it.

1. **One source:** find where the shaker detail obtains its rake (it renders
   raked today — locate that path first and REUSE its line; do not invent a
   second). The leaf's law: `leafCeil(x) = ceilReach(x) − topGap`, where
   `topGap` is the same clearance a front keeps to what is above it today
   (read it from the fronts' law, do not restate a number). Leaf outline =
   today's rectangle ∩ half-plane below `leafCeil` ⇒ the top edge is a single
   β-cut; the shaker frame/panel inset follows the cut edge at the flat law's
   inset, parallel.
2. **Per leaf:** double doors — each leaf clipped by the line over ITS OWN
   span; a leaf wholly under a flat stretch stays a rectangle, byte-identical
   to today (probe).
3. **Hinges from the REAL leaf:** the hinge-count/positions law reads the cut
   leaf's hinge-edge height; every cup stays ≥ its edge distances on the CUT
   outline. ASSERT: no cup centre outside the outline; count law unchanged
   for uncut leaves.
4. **CNC/elevation parity:** leaf DXF outline = the cut polygon, angle noted
   like the sides (`CUT β DEG`); elevation draws the same polygon.
5. ASSERT: no leaf vertex above `leafCeil` (≤0.01), both rakes, single and
   double; the shaker inner line parallel to the cut edge at the flat inset.

Screens: the owner's door scene rebuilt — leaf cut, shaker parallel inside
it; a double-door pair across a knee.

---

## F4 [HIGH] · the watch drawer: the DOOR to it exists, and 120 is the number

T53 shipped the modal and forgot the handle: **no click in the whole app
opens `watch-layout`** (the audit missed it because the screenshots showed
the modal, not the road). And the owner has re-sized: *"120 proszę."*

1. **Entry A — the scene:** clicking ANY piece of a watch drawer (its front,
   any WATCH-RAIL-*, WATCH-DIV-*, the pane) opens
   `openModal('watch-layout', { unitId, itemId, anchor })` **beside the
   click** (house modal law). The pieces already carry the drawer index in
   meta — use it, do not guess by y.
2. **Entry B — the interior menu:** the "Watch drawer" row on a unit that HAS
   one gains its chevron opening the same modal for that item.
3. **120:** `insideDepthMm 60 → 40` (owner, 28.08 — LISP first, with the
   note: a 44–48 chronograph will no longer lie flat; his veto line is
   written beside it). Derivation prints itself:
   `40 + 9 + 2 + 15 + 18 + 36 = 120`; `watchDrawerFixedHeight` needs NO code
   change if it truly derives — the test proves 120 fits and **119 refuses**,
   and the T53 tests' 140s are amended by name. Pocket floor 60 (clear width)
   is untouched — that is across, not down.
4. Saved projects: height is derived, so old inserts re-derive to 120 on
   load; assert a T53-saved fixture loads and cuts at 120 with no stored
   140 anywhere.
5. Probe: goldens carry no insert; the click wiring is UI and cannot reach a
   golden.

Screens: the modal OPEN BESIDE a clicked drawer in the scene; the menu
chevron; the 120 drawer in the wardrobe.

---

## F5 [MEDIUM] · the LED icons show when the LIGHTING panel is open — and the room light lives under them

Owner: *"po otwarciu modalu Lighting ikony LED mają być widoczne — nie
dodajesz nic do szaf. teraz jak nie naciśniesz szafy to nie widać ikon left
LED / right LED i ludzie nie wiedzą, że takie funkcje istnieją. żadnego
nowego modalu."* And: *"ustawienie światła pokoju, czyli sceny, poniżej LED."*

1. The existing per-cabinet left/right LED icons drop their selected-only
   gate: **visible on EVERY unit while the existing Lighting panel is open**;
   panel closed ⇒ exactly today's behaviour. No new components on the units,
   no new modal — a visibility condition and nothing else.
2. Icon legibility at distance: clamp the icon's screen size to a minimum
   (the existing sprite/scale mechanism if one exists; otherwise a
   distance-clamped scale) — DECISION for the owner, veto "bez clampa".
3. **Scene light, per project:** a section UNDER the LED controls in the SAME
   panel — one slider (0.4×–1.5×, default = today's 1.0 over baseGain 0.75)
   stored in the project design. **The IRON rule of 24.08 stands and is
   asserted: exports and PDFs ignore the panel — the fixed rig only.** A test
   holds the export lighting parameters byte-equal across slider positions.

Screens: panel open with a six-unit run — twelve icons visible, none
selected; the slider; two exports at slider extremes diffed equal.

---

## F6 [MEDIUM] · dimensions go to sleep after 30 seconds

Owner: *"wyłączenie dimension po 30 sekundach lub po minucie"* — first number
wins: **30 000 ms**, a profile/UI constant, veto "60".

1. While dimensions are shown, any interaction (pointer down/move over the
   canvas, key, camera move) resets a timer; at 30 s idle the app flips the
   existing Hide-dimensions toggle ON — the same code path the button uses,
   so Undo/state stay coherent. Manual toggling is untouched; the timer never
   turns dimensions ON.
2. No timer while they are already hidden; no persistence across sessions.
3. Test with fake timers: shows → idle 30 s → hidden; interaction at 29 s
   defers; manual hide cancels.

---

## OUT OF SCOPE TONIGHT
T55's surgeries: Draw-room v2 (the only-path rebuild, the removals, the 2×
window, wall editing, the pointer fix) and the shoe rebuild + KIT_SHOE
deletion. The lighting RIG (the export rig is asserted, not touched).
`runGap`. The warehouse. Kesseböhmer. L-shape cabinets.

## THE MORNING
`verify/t54/`: screenshots per feature (named), `audit/` (classify, paren,
f1–f6 probe outputs with the worst residuals printed), `EYE-TEST.md` (the
owner's walk, numbered — start it with the trio close-up), `report.json`,
`verdict.md` opening with **DECISIONS TAKEN FOR THE OWNER — veto in one
line** (the 40-is-cut-size ruling · shelf-under-roof · icon clamp · 30 s ·
anything the night adds), then the iron rules answered, then per feature: his
words, the law, the numbers measured, findings written not waved. Suite,
build, classify 6/0, paren 14×0/0, probes — as numbers. PR open, whatever
fell.