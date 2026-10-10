# CLAUDE.md, TURN 76 · THE DECORATIVE FRONTS LAND: GPT'S BRANCH JOINS MAIN

Run autonomously. Zero questions, zero stops: every decision below is the
owner's own (9 and 10.10.2026), so nothing here is asked again. If a point
cannot be done, skip it, write why in the PR, and go on to the next. Full
suite, never `--silent`. Frames under `verify/t76/`. Branch
`claude/t76-decorative-fronts`, one commit per F, PR at the end; the owner
merges. Nothing lands in Petros from this session.

## THE ORDER
1. The owner, 9.10.2026: *"gpt robi fronty, reszta my."* GPT's work is done
   and sits in this repo as ONE patch file, `patches/gpt-decorative-fronts.patch`
   (66 files, base `f60d18f1`, GPT's own suite 6007 green on that base). This
   turn lands it on main AFTER T75 and makes it obey the house laws it missed.
2. The owner, 10.10.2026, on GPT's slim shaker: *"a po co mi slim shaker jak
   mamy ustawianie shakera po wyborze shaker, bez sensu, reszta chyba ok."*
   SS goes (F3). Everything else in the patch stays.
3. The owner's own front measurements, from his DXF drawings (pattern session
   of 31.08.2026, T56), are the recipe defaults where they exist (F4).
4. BASE: `origin/main` with T75 merged. If T75 is not on main when this runs,
   branch from `origin/claude/t75-the-big-turn` instead and say so in the PR
   title; the owner merges both in order.

## LAWS
T75's LAWS hold in full and are not repeated: done means the whole road
(UI, construction, BOM, drawing, save and reload, export with readiness),
LISP IS LAW, diagnose before you cut, test the way the client clicks, one law
one path, 1:1 = COPY, numbers in the profile and never typed into the UI
without the owner's order, material never enters material, room refuses
first, left adds right edits, no em or en dash in anything written, kasacja
is physical deletion. Two laws are THIS turn's own:
**GPT's code is a patch, not a paste.** It is applied with `git apply --3way`
and every conflict is resolved by the table in F1, never by taking one side
whole, never by copying a file from `changed-files/` over main. Main's T75
lines and GPT's lines both survive unless F1 says otherwise.
**One state, one column.** T75's `readiness` (`engine/readiness.js`) is the
single production state of a line. GPT's `manufacturing` keeps only what
readiness cannot carry (F5).

## FROZEN
1. Goldens: the six (`scripts/t64-classify.mjs dump()` against
   `verify/t70/goldens-base.json`) plus T75's nine, byte-identical.
   `scripts/t76-classify.mjs` (T75's pattern) names every engine delta of this
   turn and proves no golden can reach it. GPT's
   `fixtures/golden-decorative-fronts.json` becomes the tenth golden file of
   this repo, re-pinned after F3 and F4 (six records, SS gone, the owner's
   numbers in), and joins the classifier.
2. Existing LISP untouched: a decorative recipe is front machining on top of
   a slab the kits already cut, not a new carcass geometry, so no LISP is
   asked for; the PR says so in one line. `engine/drawings/**` only through
   GPT's own patch hunks. Lighting files untouched.
3. PRO freeze (`test/turn59-f1-the-switch.test.js`): every PRO file edited is
   licensed in `EXEMPT` with the owner's words from this file (or GPT's
   licence line, which quotes the owner's own authorisation of 9.10.2026) and
   re-frozen at its new hash in the same commit.
4. The suite is green at the start (record the count) and at the end.
5. T75's FRONTS BOUNDARY is lifted for this turn and this turn only: the
   patch edits `design.js FRONT_STYLE_OPTIONS` and `frontStyleArt.js` as GPT
   wrote them. `doors.js`, `hinges.js`, `hingeLadder.js`, `handles.js`,
   `splitDoors.js`, `shaker.js`, `frontDimensions.js`, `frontGapClash.js` are
   NOT in the patch and stay untouched tonight.

## F1 · THE PATCH LANDS, CONFLICTS RESOLVED BY THIS TABLE
- `git apply --3way patches/gpt-decorative-fronts.patch` on the base. The
  probe (committed first, `verify/t76/f01-probe.md`): the list of files the
  patch touches, the list that conflicted, and for each conflict the two
  sides, before any resolution. Expected from the dry run of 10.10.2026: six
  files conflict, all shallow.
- Resolutions, each one BOTH sides unless stated:

| File | Conflict | Resolution |
| - | - | - |
| `src/engine/cabinet.js` ~9189 | T75 F4 L-doors block vs GPT decoration pass | Both, in this order: the L block FIRST (it pushes the L's two leaves), GPT's `front_decoration` pass AFTER it, so the L's doors are decorated like every other front. |
| `src/stores/projectStore.js` ~776 | fossil strip list vs `front_decoration: storedDecoration` | Both fields in the one destructuring: `run_upstand`, `run_pelmet` AND `front_decoration`. |
| `src/lib/cncExport.js` ~144 | T75 F22 READINESS.txt vs GPT `front-operations.json` | Both files ride the ZIP. |
| `src/components/RightPanel.jsx` ~20 | T75 imports vs `FrontDecorationControls` import | Both imports. |
| `src/engine/bom.js` ~111 | `readiness` vs `manufacturing` on the row | Both on the row this commit; F5 then folds the state (see F5). |
| `src/engine/bom.js` ~149 | merge key | One key carrying BOTH `readiness` and `manufacturing.identity`: two fronts with different recipes never merge into one line, and an outline never merges into a cut part. |
| `src/engine/bom.js` ~442 | `FRONT_SHEET_PARTS` | The union: `pelmet` AND `front_moulding`. |
| `test/turn59-f1-the-switch.test.js` | two EXEMPT blocks | Both blocks; a file in both gets ONE entry whose text is T75's line + GPT's line; hashes recomputed at the end of the turn (F8). |

- After the apply: `npm ci`, the suite, record what is red. Anything red
  that is a T75 test colliding with GPT's rename of a label or a count is
  amended with the reason in the test; anything red in GPT's own tests
  against T75's main is fixed in GPT's code, never by loosening the T75 test.
- Rename GPT's `test/turn75-the-j-band.test.js` to
  `test/turn76-the-j-band.test.js` (T75's tests own the `turn75-` prefix).
- Delete `patches/gpt-decorative-fronts.patch` in this turn's LAST commit:
  the patch is packaging, not code (the T71 precedent).

## F2 · THE PROBE OF WHAT GPT BUILT, IN ONE TABLE
Before F3, a committed table (`verify/t76/f02-probe.md`): every style id and
its recipe keys as the patch has them; where `params.front_decoration` is
written (project, front-material slot, saved style, unit) and read; the
opt-in rule (an old project with a style name alone gets NO machining and an
activation button); the CNC handoff (back DXF unchanged, FRONT DXF per part,
`front-operations.json`); where the AM strips become cut parts. The table is
the baseline the rest of the turn is measured against.

## F3 · KASACJA: SLIM SHAKER GOES
Owner: *"a po co mi slim shaker jak mamy ustawianie shakera po wyborze
shaker, bez sensu."* A slim shaker is `profile.front.types.S` with
`frameWidth` 25 and `recessDepth` 2, both numbers the shaker already owns
(`frameMin` 10, `frameMax` 200, T33 F8's wizard field).
- Delete `SS` from `FRONT_STYLE_OPTIONS` (`engine/design.js`), from
  `RECIPES` / its profile block (F4), from `FRONT_STYLE_ART`
  (`engine/frontStyleArt.js`), from the retail thumbnails, from GPT's goldens
  (the SS record), tests and walks. No alias: SS never shipped, no saved
  project carries it. Tombstone two lines in `design.js`.
- The shaker's own `recessDepth` stays 6 and is NOT made a per-front field
  tonight (a number does not enter the UI without the owner's order); the
  frame width field the wizard already has is the "slim".

## F4 · THE RECIPES MOVE INTO THE PROFILE, THE OWNER'S NUMBERS FIRST
GPT put the recipe defaults in code (`RECIPES` in
`src/engine/frontDecoration.js`). The house law: numbers live in
`engine/profile.js`.
- New block `profile.front.decoration` with one entry per decorative style,
  read by `defaultFrontDecoration(style, profile)` and
  `normaliseFrontDecoration(config, style, profile)`; `RECIPES` in code is
  deleted. Every caller that today reaches `DEFAULT_CABINET_PROFILE` for this
  takes the active workshop profile instead (the same `getCabinetProfile()`
  road every other number travels). The design's saved `decoration` object
  stays as GPT shaped it: a project that overrode a number keeps its number.
- The OWNER'S numbers (his DXF drawings, 31.08.2026) are the defaults where
  they exist; GPT's stand where the owner gave none and are marked `// T76
  proposed, owner to confirm`:

| Style | Default recipe | Source |
| - | - | - |
| G (Grooved) | vertical grooves every 80 centre to centre, V profile 4 wide x 3 deep, margin 60 to the first groove | owner, 31.08.2026 |
| GF (Grooved with frame) | frame 60 (the shaker's own frame law), recess 6, grooves inside the recess: every 80, V 4 x 3, inner margin 10 | owner (60, 80, 4 x 3); GPT (recess 6, margin 10), proposed |
| A (Arched) | board 30, frame 60, recess 18, SEMICIRCULAR arch (rise = half the inner width; a leaf narrower than the rise allows is refused in words, never squashed to an ellipse) | owner, 31.08.2026 |
| AH (Arched handleless) | A's recipe; the J-pull is chosen separately under Opening, from the underside (owner: *"J-pull from underside"*) | owner |
| FL (Fluted) | 12 ballnose, 3 deep, every 20, margin 50 | GPT, proposed |
| AM (Applied moulding) | inset 60, strip 20 wide x 8 proud, 45 degree mitres, strips are cut parts of their own 8 mm stock | GPT, proposed |

- The V groove is a V: GPT's groove operation carries a cutter KIND; G and GF
  take `kind: 'v'` with the 4 x 3 section (a 90 degree V bit is implied by
  4 wide at 3 deep is NOT assumed: the JSON records width and depth and CAM
  picks the bit). FL keeps its ballnose. The DXF layer name and the
  `front-operations.json` entry say which.
- The 30 mm board for A/AH: the front thickness is the material's
  (`profile.front.thickness`, 25 today); a recess of 18 in a 25 board leaves
  7, which passes GPT's 3 mm skin rule but is not the owner's board. So the A
  and AH recipes carry `boardMm: 30`, and the Check says, in words, when the
  assigned front material is thinner than the recipe's board (the recipe is
  not silently shrunk and the material is not silently swapped). The owner
  decides per job.
- Re-pin `fixtures/golden-decorative-fronts.json` with the six styles on the
  new numbers; `scripts/t76-classify.mjs` proves the six + nine old goldens
  did not move (no old project carries `front_decoration`).

## F5 · ONE STATE: READINESS ABSORBS MANUFACTURING
- `engine/readiness.js readinessOf` learns the decorated front: a front whose
  recipe validated is `'cut'`; a front whose recipe is BLOCKED by GPT's
  validator (the pattern is not exported) is `'cut'` for the slab and the
  Check names the blocked recipe (the state of the LINE is the slab's; the
  decoration's refusal is a Check, as GPT built it); an AM strip is a `'cut'`
  part of its own and the host front carries a `'manual'` NOTE for the
  gluing of its strips (the T75 worktop-joint grammar).
- `manufacturing` on the BOM row keeps ONLY `identity` (for the merge key)
  and `construction` (the label: routed slab, applied strips); its `status`
  is deleted, the BOM panel shows the T75 State column and the construction
  label, not a second status. GPT's `front-decoration-purchase.test.js` and
  `front-decoration-ui.test.js` are amended to read readiness.
- The CNC export's T75 readiness banner counts GPT's FRONT files like any
  other line; `front-operations.json` carries each operation's readiness.

## F6 · PRO AND RETAIL, THROUGH THE COPY SCRIPT
- GPT edited `scripts/t63-copy.mjs` and `t63-copies.mjs` to add
  `FrontDecorationControls.jsx` and the retail `PartDetailModal.jsx` to the
  manifest. Keep that, then run `scripts/t76-copy.mjs` (T75's pattern): every
  PRO surface this turn edits is re-copied, and the script proves the only
  retail files that moved are the copies of the files named. Retail
  divergences (the design-system skin) are listed in the PR by file and line,
  as every turn since T63.
- Retail FRONTS step: the style tiles show G, GF, A, AH, FL, AM thumbnails
  from `frontStyleArt.js`; a client picks a style and gets the owner's recipe
  with NO numeric fields (lazy client law; the recipe controls are PRO's);
  the 3D shows the recess, grooves, flutes or strips on the leaf.

## F7 · THE WALK, REAL MOUSE, PRO AND RETAIL
`scripts/t76-walk.mjs` (T75's harness), frames `verify/t76/fNN-*.png`,
output `verify/t76/walk.txt`:
- PRO: a wardrobe and a base unit; Fronts set to G, then GF, A, AH, FL, AM in
  turn by the real select; for each: the leaf's solid shows the pattern; the
  recipe controls show the profile's numbers; one number changed by typing
  regenerates the pattern; the cut list names the leaf with its construction
  and state; AM adds four strip lines per leaf; CNC export ZIP holds the back
  DXF, a FRONT DXF per decorated leaf, `front-operations.json` and
  READINESS.txt; the T71 drawing set draws the pattern on the elevation.
- PRO, the L of T75: a `CORNER_L_BASE` with G fronts: both leaves decorated,
  door B still "opens first".
- PRO, old project: the Herbal Hill fixture opened, no decoration appears, no
  cut list line moves (byte-compare the cut list before and after).
- PRO, refusal: a 300 mm wide A leaf (rise impossible) is refused in words;
  a recipe with a 25 mm groove pitch on a 100 mm leaf is refused, never
  clamped.
- Retail: FRONTS step, each tile once, the leaf changes, no numeric field is
  on the page, MY ESTIMATE lists the style name.
- Save, reload, the same result: a decorated project round-trips.

## F8 · FREEZE AND PROOF
- Every PRO file edited: one EXEMPT entry, re-frozen at its final hash.
- `scripts/t76-classify.mjs`: every engine delta named, six + nine + the
  decoration golden file proven.
- Parens: 17 of 17 (no LISP touched).
- Delete the patch file (F1, last commit).

## NOT THIS TURN (named so nobody builds it)
- Sliding, bifold, lift, pocket and tambour doors; applied moulding as a
  bought ornate profile or a five-piece timber door (GPT's AM is a
  rectangular strip, by its own doc, and stays that).
- A per-front recess depth for the shaker; any new typed number in the UI.
- Bent or curved fronts (list 13).
- Lighting, in any form.
- G-code or toolpaths: CAM's job, by GPT's doc and the owner's VCarve.

## TESTS AND PROOF
Full suite, GPT's eight new test files kept and amended per F3 to F5, the
T75 suite green, `test/turn76-*.test.js` for the conflict resolutions (F1:
the L's leaves ARE decorated; both ZIP files present; both sheet parts
counted), for the profile move (F4: `RECIPES` no longer exists in code, the
owner's numbers read from the profile), and for one state (F5). The walk
above with frames.

## PR BODY
The two probe tables verbatim; the conflict table with what was done per
file; the files and lines per F; the EXEMPT entries; the retail divergences;
the goldens (six, nine, the decoration file re-pinned); the count of tests;
the walk result; what was skipped and why; THE NUMBERS PROPOSED.

## THE NUMBERS PROPOSED (owner to confirm, all in profile.js, none typed in the UI)
| Number | Value | Source |
| - | - | - |
| G grooves | every 80, V 4 x 3, margin 60 | owner 31.08.2026 |
| GF | frame 60, recess 6, grooves every 80 V 4 x 3, inner margin 10 | owner 60 / 80 / 4 x 3; GPT recess 6, margin 10 |
| A, AH | board 30, frame 60, recess 18, semicircle | owner 31.08.2026 |
| FL | 12 ballnose, 3 deep, every 20, margin 50 | GPT |
| AM | inset 60, strip 20 x 8, mitre 45 | GPT |
| Skin under opposing cuts | 3 | GPT |
