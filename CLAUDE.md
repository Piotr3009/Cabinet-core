# CLAUDE.md, TURN 86B · THE SECOND SHIFT OF 30.10: DIMENSIONS ON THE BAR, THE INK IN SETTINGS, THE LEFT CORNER IS THE MIRROR OF THE RIGHT

Run autonomously. Zero questions, zero stops: every decision below is the
owner's own (30.10.2026, 21:45 to 22:05, over his two screenshots in
`verify/t86b/owner-view-menu.png` and `verify/t86b/owner-two-corners.png`;
his words are quoted where they decide), so nothing here is asked again.
Where a point is marked PROPOSED it is the turn's best reading and is used
as written: the owner confirms or changes it after the merge, never during
the run. If a point cannot be done, skip it WHOLE, write why in the PR, and
go on to the next. Full suite, never `--silent`. Frames under
`verify/t86b/`. Branch `claude/t86b-view-and-corner`, cut from THIS branch
(`chat/t86b-spec`, which is main d1efb21 plus this file and the owner's
evidence), one commit per F, PR against main at the end; the owner merges.
Nothing lands in Petros from this session.

## THIS IS A PARALLEL SHIFT: T85 RUNS TONIGHT ON THE SAME MAIN
`claude/t85-recess-follows` is being written at the same time by another
session. Its INT is the ONLY writer tonight of `src/engine/cabinet.js`,
`src/stores/projectStore.js`, `src/engine/profile.js`, `src/engine/
extension.js`, `reference/lisp/KIT_RECESS.lsp`, `src/lib/recessColumn.js`,
and it also edits the hardware finish sites (`lib/hardwareCatalogue.js`,
`3d/hardwareFinish.js`, the setup wizard's hardware step) and `3d/
UnitView.jsx` for the door swing. THIS turn therefore:
- does NOT edit `cabinet.js`, `projectStore.js`, `extension.js`, any LISP
  file, `recessColumn.js`, the hardware finish sites, or the door swing
  lines of `UnitView.jsx`. Not one line. If F3 finds that the fix of the
  corner belongs in one of those files, the fix is NOT applied: the
  finding and the patch are written to `verify/t86b/corner-fix.diff` with
  the diagnosis in `verify/t86b/corner-diagnosis.md`, and the PR says so.
  That patch is applied by T86 tomorrow, after T85 is merged.
- edits `src/engine/profile.js` in EXACTLY ONE LINE (F1, the toggle list)
  and nothing else in that file, so the two PRs merge by hunk.
- adds its OWN classifier manifest `scripts/t78-classify.d/f51-t86b-f*.mjs`
  and its OWN rows in the freeze test's EXEMPT map; it does not reorder or
  reformat either file.
- merges after T85 in the morning: the owner merges T85 first, the morning
  audit rebases this branch on the new main and resolves the two expected
  touch points (the EXEMPT map, the manifest list) before this PR is merged.

## THE COST OF THE NIGHT (the law of T83 and T85, kept)
This is a SMALL shift. TWO agents and one integrator, never four. NO review
wave: a slice is reviewed ONCE by INT when its patch lands; the morning
audit is the owner's. Targeted tests while writing; the full suite ONCE
when PART A lands and ONCE at the end. Every agent reads this file and its
PART, never the whole repo. A report is twenty lines, the six stations of
DONE. Agents and parallel mode ON.

## THE AGENTS (2 slices and one integrator)
| Agent | Slice | OWNS (writes) | Hands patches to |
| - | - | - | - |
| INT | the one line of `profile.js` (F1); the freeze test's EXEMPT rows and re-hashes; `scripts/t78-classify.d/f51-t86b-f*.mjs`; NEW_FILES; the full suite once after PART A and once at the end; classifier strict, copy check; the PR | `src/engine/profile.js` (one line), `test/turn59-f1-the-switch.test.js`, the manifest | nobody |
| U1 | PART A: F1 (the test side of the bar), F2 (the View menu loses Dimension colour, Settings gains it) | `src/components/studio/SceneViewMenu.jsx`, `src/components/WizardSettings.jsx`, `src/stores/uiStore.js` (the remembered colour, F2.3), `test/turn84-f06-scene.test.js` (rewritten to the new law), `test/turn86b-f01-f02-view.test.js` | INT (profile.js one line, EXEMPT rows) |
| G1 | PART B: F3 the mirror law pinned as a test, then the owner's broken corner found and, where this turn may touch, fixed; F4 the walk | `test/turn86b-f03-corner-mirror.test.js`, `verify/t86b/corner-diagnosis.md`, `verify/t86b/corner-fix.diff` (if the fix is in a forbidden file), `src/3d/**` EXCEPT the door-swing lines of `UnitView.jsx` and `hardwareFinish.js`, `src/lib/**` new files only, `scripts/t86b-walk.mjs`, `verify/t86b/walk.txt`, `verify/t86b/f0*-*.png` | INT (EXEMPT rows if a frozen 3D file is edited) |

## THE ORDER
The owner, 30.10.2026, in his words where they decide:
- 21:54, over `owner-view-menu.png` (the View popup open, Dimensions
  circled, an arrow drawn from it to the scene toggles bar, Dimension
  colour struck through): *"menu, patrz SS: dimension powinien pojsc do
  glownego paska, ustawienie koloru wymiarowania powinno byc w settings nie
  tutaj"*.
- 21:56, over `owner-two-corners.png` (two Corner L wardrobes in one room,
  the right corner closed and whole, the left corner open with its boards
  standing wrong): *"zobacz lewa szafa, bul i bur sie nie odwrocily"*.
- 22:03, on the tall board standing in front of the left unit: *"bok, tutaj
  nie ma drzwi"* (a SIDE stands where no board should, not an open door).
- 22:03: *"tak prosze sprawdz, zrob testy i dodaj do tury jak mozna i
  puszczamy ture b"*.

## WHAT THE CHAT ALREADY PROVED (22:10 to 22:40, read before PART B)
Three probes, kept under `verify/t86b/probe-mirror-*.mjs` (run them from
the repo root with `node verify/t86b/<file>`): a bare `computeCabinet()`
of CORNER_L_WARDROBE and CORNER_L_BASE in both hands, square and not, with
doors, shelves and drawers; the same through the store (`addUnit`,
`paramsForEngine`) in a 4000 x 3000 room, the first L landing in the left
corner and the second in the right; an L born left and MOVED to the right
corner against one born there; both hands resized after birth. In every
case LEFT = MIRROR(RIGHT) board for board (part, x mirrored in W, y, z, w,
h, d) and the moved unit equals the fresh one. So the ENGINE'S geometry is
not where the owner's picture comes from. What the chat did NOT run: the
scene (the meshes `3d/` builds from the boxes and the L outlines), the
owner's own project state (he was asked for his `.ccproject`; if it is
present as `verify/t86b/owner.ccproject`, it is the first thing G1 loads),
and roads other than add, move and resize (the Section's edits on an L,
"Add left of L", a unit on the side walls, undo, a project loaded from
file). F3 starts there.

## LAWS
Every law of T75 to T85 holds in full: the fossil six untouchable
(`scripts/t64-classify.mjs --dump` vs `verify/t70/goldens-base.json`
IDENTICAL); a bare `computeCabinet()` byte for byte its LISP; material
never enters material; one law one path; numbers in the profile, none
typed; 1:1 = COPY (`scripts/t78-copy.mjs --check` CLEAN); the Skylon
header on every new file; no em or en dash in anything written; test the
way the client clicks; a new function has a visible entry in the same
package; a green test beside old broken code is a lie (the T84 F6 test is
REWRITTEN to the new law, never kept green beside a second road). Three
laws are this turn's own:
1. **A SCENE SWITCH LIVES ON THE BAR.** What changes how the picture is
   LOOKED AT and is flipped many times an hour (X-ray, Hide fronts,
   Outlines, Open all, and from tonight Dimensions) stands on the scene
   toggles bar. The View popup keeps what is set once and left (the
   lighting, the brightness, the contour view, Measure, Props, Front
   dimensions). The owner: *"dimension powinien pojsc do glownego paska"*.
2. **AN INK IS A SETTING.** The colour the dimensions are drawn in is not
   a way of looking, it is a preference: it lives in Settings (the one
   settings surface, `WizardSettings.jsx`, T36 F1's law that there is ONE
   settings screen), not in a scene menu. The owner: *"ustawienie koloru
   wymiarowania powinno byc w settings nie tutaj"*.
3. **THE LEFT CORNER IS THE MIRROR OF THE RIGHT.** For every Corner L kit,
   in every state the app can put it in (born, moved, resized, edited in
   the Section, loaded from file, undone), the left-hand unit is the
   right-hand unit mirrored in x, board for board, mark for mark, and the
   SCENE shows exactly the engine's boxes: nothing in the picture may
   stand where the engine put no board. The owner: *"bul i bur sie nie
   odwrocily"*; the test of F3 is this law written as arithmetic, and it
   stays in the suite whatever F3 finds.

## FROZEN
1. The six base goldens IDENTICAL; every T75 to T85 golden IDENTICAL. This
   turn changes NO cut: a re-pinned golden in this PR is a defect.
2. The engine files T85 owns (the list above): not one line. `profile.js`:
   the one line of F1.
3. The View popup's other eight entries keep their guards, labels,
   sentences and store actions exactly (T84 F6; FROZEN 3 of T80:
   Brightness, Realistic lighting and Turn on the light stay three
   controls with three states). The scene toggles bar's existing four keep
   their order and their hooks (`data-studio="toggle-*"`).
4. PRO freeze: every PRO file edited (`WizardSettings.jsx`, `SceneViewMenu.
   jsx`, `uiStore.js` if hashed, any 3D file) is licensed in EXEMPT with the
   owner's words from this file and re-frozen in the same commit. Retail
   copies are NOT edited: `t78-copy --check` CLEAN. `TopBar.jsx` (the
   legacy shell's View menu, which also offers Dimension colour) is NOT
   touched tonight: PROPOSED, the legacy menu is out of the Studio and
   dies with it; the PR names it as the one remaining second road.
5. The suite is green at the start (the count on this branch at the start
   of the run, written in the PR) and at the end, plus this turn's tests.

## PART A · THE BAR AND THE SETTINGS (F1, F2; U1 and INT)

### F1 · Dimensions on the scene toggles bar
1. `SceneToggles.jsx` already carries a `dimensions` toggle in
   `SCENE_TOGGLE_IDS` (T84 F6 built eight, the bar shows the profile's
   four). INT adds `'dimensions'` to `profile.ui.studio.sceneToggles` as
   the FIRST entry: `['dimensions', 'xray', 'hideFronts', 'outlines',
   'openAll']` (PROPOSED order: the owner's arrow points at the bar's left
   end; the four keep their order after it). That is the one line of
   `profile.js`. No other file changes for F1 beyond the tests.
2. The toggle's guard, label and hook are the ones it has (`viewMode !==
   '3d'` disabled, `toggle-dimensions`, "Dimensions"); the View popup's
   `dimensions` entry is REMOVED from `VIEW_ITEMS` (law 1: one road), the
   store action `toggleDimensions` untouched.
3. `Front dimensions` STAYS in the View popup (PROPOSED: the owner circled
   Dimensions alone; one word from him and it moves the same way by one
   id in the list).
4. `test/turn84-f06-scene.test.js` line 265 (the four) and the VIEW_ITEMS
   regex at line 312 (the nine) are REWRITTEN to the new law (five on the
   bar, seven in the popup), with this file's owner's words beside them.
   The T84 census (`scripts/t84-census.mjs`) is re-run if it counts the
   popup's entries; its JSON under `verify/t84/` is NOT rewritten (T84's
   record stands), the new count goes to `verify/t86b/census.json`.

### F2 · Dimension colour leaves the View popup for Settings
1. `SceneViewMenu.jsx`: `dimensionColour` leaves `VIEW_ITEMS` and its
   submenu block is deleted (kasacja, not a gate: the entry, the
   `colours` map, `colourDisabled`). `VIEW_ITEMS` becomes seven:
   `'frontDimensions', 'props', 'measure', 'contourView', 'brightness',
   'realisticLighting', 'light'`, in that order.
2. `WizardSettings.jsx`: ONE row "Dimension colour" with the two inks the
   profile names (`profile.dimensions.colours`: Navy, Red, labelled as
   TopBar labels them), as a pair of radio chips in the house scale (13 px,
   the setup workspace's own controls, 27.10's ruling), standing in the
   `settings.dimensions` node under the base dimensions (PROPOSED place:
   it is the only settings node about dimensions; if the node has a
   drawings or view group, the row goes there instead and the PR says
   which). It reads `useUiStore.dimensionColour` and writes
   `setDimensionColour`, the same action the popup called: the scene
   changes as the chip is pressed, nothing else in Settings changes, and
   `Start` / `Save` of the wizard do not touch it (it is not a project
   field).
3. `uiStore.js`: the chosen ink is REMEMBERED per browser the way
   Brightness is (`BRIGHTNESS_KEY`'s pattern: read at boot, written on
   set, the profile's default when nothing is stored or the stored key is
   not one of the profile's inks). Key `cc.dimensionColour` (PROPOSED).
   A setting that forgot itself on reload would not be a setting.
4. `test/turn86b-f01-f02-view.test.js`: the profile's five on the bar in
   order; `SCENE_TOGGLE_IDS` unchanged; `VIEW_ITEMS` exactly the seven and
   the popup renders them and nothing else; no `dimensionColour` string
   left in `SceneViewMenu.jsx`; the Settings row present in
   `WizardSettings.jsx` under its node, reading and writing the store's
   action; the store remembers the ink across a fresh `useUiStore` boot
   with the key set and falls back to the profile's default on a bad key;
   every guard and sentence of the seven byte-identical to T84's (read
   from the file, compared to the strings T84 F6's test quoted).

## PART B · THE LEFT CORNER (F3, F4; G1)

### F3 · The mirror law pinned, then the owner's corner found
1. `test/turn86b-f03-corner-mirror.test.js`, FIRST, before any search: the
   three probes of the chat written as tests (the bare engine, the store,
   the move), for CORNER_L_BASE, CORNER_L_WALL and CORNER_L_WARDROBE, each
   hand, square and 1200 x 1000, with doors, with 3 shelves, with 2
   drawers: LEFT = MIRROR(RIGHT) board for board (part with BUL/BUR
   swapped, x mirrored in W, y, z, w, h, d) and mark for mark (the Cabineo
   and dowel positions on TOP-L and BOTTOM-L mirrored the same way: read
   them from the panels' cuts, not only the boxes). Green on this branch
   at the start (the chat proved it); it stays in the suite as law 3.
2. THE SEARCH, in this order, each step a line in
   `verify/t86b/corner-diagnosis.md` with the numbers read:
   (a) If `verify/t86b/owner.ccproject` exists: load it the way `lib/
       projectFile.js` loads a file (Open from file, 28.10), compute both
       Corner L units through `paramsForEngine`, run the mirror comparison
       on THEM, print every param that differs between the two beyond
       `corner_side`, `unit_num`, position and run data. If the engine
       output of the owner's left unit is NOT the mirror of his right one,
       the differing params ARE the bug: name the road that wrote them.
   (b) The scene: build the app (`vite build`, preview 4173), the harness
       `scripts/t74-harness.mjs` as T84 and T85 walk it; the owner's room
       (4000 x 3000, PROPOSED, his picture shows a wider room; the law is
       the same), two CORNER_L_WARDROBE added from the library (the first
       lands left, the second right), doors on. Read, from the scene's own
       objects (`scene.traverse`, every mesh under each unit's group), the
       world-space bounding box of every mesh, and compare them to the
       engine's boxes placed by the unit's position and wall: a mesh that
       stands where the engine put no board, or a board with no mesh, is
       the finding. Do it for both units. Frame both corners from the
       owner's camera (`verify/t86b/f03-corners-before.png`).
   (c) The roads the chat did not run, each ending with the mirror test on
       the live units: the Section's edits on the left L (a shelf added,
       moved, Center between), "Add left of L" (T78 F1), the two units
       placed on the side walls (wall 1 start, wall 3 end), undo after a
       move, save to file and open from file, a project saved by the old
       road (`persistProject`) and reloaded through `migrateProject`.
   (d) The TOP marks: the owner's left unit shows joint marks on the TOP's
       upper face that the right unit does not. The TOP is drawn from
       below as the BOTTOM's mirror (17.10, `topFrame.js mirrorTopRecords`);
       for the LEFT hand the L outline and the mirror may compose into the
       wrong face. Read `panels.find(id === 'TOP-L').cuts` for both hands
       and the face each cut is on; a cut on the upper face of a TOP is a
       finding on its own.
3. THE FIX. Where the cause is in a file this turn may touch (`3d/**`
   except the two forbidden spots, `lib/projectFile.js`, a new `lib/`
   file, `components/studio/**`): fix it at the source, one law one path,
   no second road, with the owner's words beside it, and the test of F3
   grows the case that caught it (red before, green after; show both runs
   in the PR). Where the cause is in a file T85 owns: NO edit; the patch
   to `verify/t86b/corner-fix.diff`, the test case that would catch it
   written and marked `skip` with the diff's name in its message (one
   line, so T86 turns it on), the PR says so in DECISIONS TAKEN. Where
   nothing is found by (a) to (d): say so in words, with every number
   read, and stop PART B there; the law's test and the diagnosis are the
   deliverable, not a guess.

### F4 · The walk (G1)
`scripts/t86b-walk.mjs` on the built app, real mouse through the harness:
the bar shows five toggles in order and `Dimensions` flips the dimension
chains in the scene (a frame each way, `f04-bar-off.png`, `f04-bar-on.
png`); the View popup lists seven and no Dimension colour; Settings opened
from the rail, the Dimension colour row found under its node, Red pressed,
the chains' ink read from the scene's material colour (`f04-ink-red.png`),
reload, the ink still Red (the remembered key), then Navy restored; the
two corners of F3 after the fix (or as they stand, if the fix waits for
T86), framed from the owner's camera (`f04-corners-after.png`). Every line
PASS or FAIL with the number expected and the number read; never patched
in the walk.

## NOT THIS TURN
- `TopBar.jsx` (the legacy View menu) and its Dimension colour: FROZEN 4.
- `Front dimensions` moving to the bar: one id, waits for the owner's word.
- Any cut, any LISP, any engine law: T85's night. A corner fix that needs
  `cabinet.js` is written as a diff for T86, not applied.
- Section for the recess column, the shelves over the column, Studio
  stage 2, the bathroom family, the Joinery Core link: parked as the
  HANDOVER of 30.10 lists them.

## LINEAGE (one line a test reads from this file)
T79's horizontal notch stays as built and its owner's words stay here
because `test/turn79-f05-edge-notch.test.js` reads them from CLAUDE.md:
*"cut the corner działa idealnie, ale możesz zrobić mi też poziome cut?
wszystkich 4 rogów?"* (18.10.2026). T84 (PR #83), the chat fixes of 28.10
to 30.10 (PR #84 to #86) and the T85 spec (PR #87, main d1efb21) are the
base of this turn; their numbers hold untouched.

## TESTS AND PROOF
Full suite once after PART A and at the end; the classifier strict with
`f51-t86b-f*.mjs` naming every lib delta (there must be NO engine delta:
the classifier's engine list is empty for this turn and the PR says so);
the six base goldens IDENTICAL; `t75-goldens --check`, `t78-goldens
--check`, every later golden check as T85's list names them; `t78-copy
--check` CLEAN; `t86b-walk.mjs`; NEW_FILES; the Skylon header; no em or en
dash; every F the six stations of DONE in twenty lines.

## PR BODY
Files and lines per F; the one line of `profile.js` quoted; the seven of
the popup and the five of the bar; the Settings row's node; the diagnosis
of F3 in full (every number read, every road run, the finding or the
honest "not found"); the diff for T86 if there is one; the EXEMPT entries;
the test count before and after; the walk result; DECISIONS TAKEN; SKIPPED
AND WHY; RED AT THE END; THE NUMBERS below.

## THE NUMBERS (in the profile; none typed in the UI)
| Number | Where | Value | Status |
| - | - | - | - |
| the scene toggles bar | `profile.ui.studio.sceneToggles` | `['dimensions', 'xray', 'hideFronts', 'outlines', 'openAll']` | CONFIRMED (Dimensions on the bar, the owner 21:54); the ORDER is PROPOSED |
| the View popup | `SceneViewMenu.jsx VIEW_ITEMS` | seven: frontDimensions, props, measure, contourView, brightness, realisticLighting, light | CONFIRMED (Dimension colour out, the owner 21:54); Front dimensions staying is PROPOSED |
| the ink's home | `WizardSettings.jsx`, node `settings.dimensions` | one row, Navy / Red | CONFIRMED (Settings, the owner 21:54); the node is PROPOSED |
| the remembered ink | `uiStore.js`, localStorage `cc.dimensionColour` | the profile's default when unset | PROPOSED |
| the mirror law | `test/turn86b-f03-corner-mirror.test.js` | LEFT = MIRROR(RIGHT), every Corner L kit, every road | CONFIRMED, the owner 21:56 |
