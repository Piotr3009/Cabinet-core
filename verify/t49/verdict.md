# TURN 49 — THE WIZARD STOPS ASKING TWICE · the verdict

Ten features ordered, **ten delivered**. F6 — the one the night was allowed to
sacrifice — did not fall.

Run on this branch, in this order: fresh `npm ci` → suite → build →
`t49-classify` → `--survivors` → the acceptance walk on real pointer input, and
a second walk of the two merged dialogs against a **T48 build** for the BEFORE
frames.

| | |
|---|---|
| Suite | **4345 pass, 0 fail** (`npm test`, never `--silent`) |
| Build | clean |
| Goldens | **six IDENTICAL, UNNAMED = 0** |
| Survivors' audit | **NOTHING LOST — 10/10** controls answer to their own hook |
| Acceptance walk | **43/43 checks, 16 shots**, every one LOOKED AT |
| New dependencies | none · SQL | none · LISP files touched | none |

---

## THE SURVIVORS' AUDIT — iron rule 3, machine-checked

`node scripts/t49-classify.mjs --survivors` reads the surface and looks for each
control **by its own DOM hook**. The sheet size is the first row because the
owner named it as the danger himself: *"jest funkcja wyboru materials size,
jumbo etc — tez trzeba bedzie przeniesc do pierwszego wyboru materialow,
INACZEJ ZNIKNIE NAM TA FUNKCJA."*

| was | control | where it lives NOW |
|---|---|---|
| carcases · sheets | **Sheet size (jumbo etc.)** | the material dialog, under the stock board |
| carcases · sheets | Stock board select, per type | the material dialog — where it ALSO always was (this was the repeat) |
| carcases · sheets | Board thickness gate (recompute / keep) | with it, unchanged |
| carcases · sheets | the `carcases.sheets` node | same id, same tab, same audience |
| fronts · sheets | **Sheet size (jumbo etc.)**, fronts family | the colour dialog, under the stock board |
| fronts · sheets | Stock board select, per type | the colour dialog — likewise the repeat |
| fronts · sheets | Front thickness gate (recompute / keep) | with it, and it still re-cuts every door |
| fronts · sheets | the `fronts.sheets` node | same id, same tab, same audience |
| fronts · how many | Spraying / Veneer / Laminate | the colour dialog's FULL-WIDTH strip (T44 F4's) |
| wizard · room step | Rectangle / L-shape / + Box | Settings ▸ Room setup — the menu door only |

The sheet-size row is the **same `SheetSizeRow`** the Settings menu draws —
imported from `SettingsPanel.jsx`, one implementation, never a copy — writing
the same `profile.cnc.sheetCarcass` / `sheetFronts`, with every option the
profile carries. `after-carc-2-merged-dialog.png` shows Jumbo 2070 × 2800,
Standard, 10 ft and `Other…` with its two typed numbers, in the first dialog.

---

## BEFORE and AFTER — the two merged dialogs

| | BEFORE (T48 build, `b68220a`) | AFTER |
|---|---|---|
| carcasses | `before-carc-2-material-dialog.png` — board, no sheet<br>`before-carc-3-sheets-stop.png` — the board AGAIN, and the sheet | `after-carc-2-merged-dialog.png` — one screen, board **and** sheet |
| fronts | `before-front-2-colour-dialog.png` — colour and board, no sheet<br>`before-front-3-sheets-stop.png` — the board AGAIN, and the sheet | `after-front-2-merged-dialog.png` — strip, colour, board **and** sheet |

Look at the BEFORE frames for F3 as well: they carry **two Backs and two Nexts,
an inch apart**, which is the screenshot the owner had in his hand. The AFTER
frames carry one row.

The dot strip counts it too: four dots before, three after — *"jeden mniej
bedzie."*

---

## The ten, one line each

1. **F1 · the scope arrives as One Wall.** `DEFAULT_SCOPE` in
   `lib/wizardSteps.js`, and the project TYPE no longer writes the scope — the
   flag that let it (`scopeTouched`) is gone. Proved on a KITCHEN, which
   suggests a room: `f1-scope-one-wall.png` shows One wall lit anyway, with the
   suggestion left as a sentence. The scope is written the moment the project is
   created, so a job abandoned at step 2 is still a One Wall job.
2. **F2 · the room's canned boxes are gone** — from the WIZARD door.
   Rectangle / L-shape / + Box are untouched behind Settings ▸ Room setup
   (iron rule 4), and the sentence explaining + Box goes with the button.
   The wall EDITOR was not begun: a test asserts it.
3. **F3 · one Back at a time.** Two halves. The SHELL now knows which window is
   on top and a covered window draws no footer — implemented once, so the wall
   dialog's Back/Save stops standing under the element window's Remove/Done
   with no line of its own in that file (`f8-two-slopes-flat-steps-aside.png`).
   And step 5's footer stands down: the sequence's own row is the one row, its
   Back reaching the STEP through the flow's own `backStep`. **Back's
   arithmetic is not touched** — a test walks it through both scopes.
4. **F4 · the carcass asks once.** The second stop is gone; the sheet moved up.
   The dialog after it — dog bones and the CNC corner — is untouched
   (`f4-carc-3-cnc-corner-untouched.png`): *"to tak musi byc, to zostaw."*
5. **F5 · the fronts ask for TYPES first.** *"How many types and colours?"*, in
   his words and larger. Number and type only; no colour picker, no laminate
   list (`f5-fronts-types-first.png`).
6. **F6 · the fronts' 2 and 3 become one.** Same treatment, same four survivors.
   **It did not fall.**
7. **F7 · editing is not a chain.** Through the EDIT door all six tabs are live
   (`f7-edit-door-every-tab-live.png`), 5.1 → 5.4 in one move
   (`f7-jumped-5-1-to-5-4.png`), and back and forth in any order. `Update and
   save` commits from wherever you stand — the SAME `persistProject` File ▸ Save
   calls — and refuses a setup that was never finished, saying why beside the
   button. A NEW project keeps its chain
   (`f7-new-project-keeps-its-chain.png`), which is the contrast that makes the
   feature a feature.
8. **F8 · the wall dialog takes FLAT.** `flat + run = wall width`, typed either
   way (`f8-flat-one-slope.png`, `f8-flat-typed-run-follows.png`). At the second
   slope the Flat field steps aside and one short line says why
   (`f8-two-slopes-flat-steps-aside.png` — a fall at each end). Nothing is
   stored but the run; `ceilingAt`, the cut line and the engine are untouched.
9. **F9 · the sheen moves veneer, and leaves laminate alone.** Proved on all
   three finishes, and on the half a finish cannot answer: a VENEERED FRONT is
   stored as the decor it borrows its picture from (T20 F12.3), so the piece's
   own material SLOT is asked. Spray 0.95 → 0.00, veneer 0.95 → 0.00, laminate
   0.58 → 0.58.
10. **F10 · BACKLOG 34 is off the list**, and nothing is renumbered: 33, 35 and
    36 stand where they were, and the seven comments in `src/` that cite `#34`
    still cite it.

---

## THE NUMBERED EYE-TEST LIST — what the owner should look at

1. **`after-carc-2-merged-dialog.png` beside `before-carc-2/3`.** One screen
   where there were two. Is the sheet size where you want it — under the board,
   or above it?
2. **`after-front-2-merged-dialog.png` beside `before-front-2/3`.** Same
   question for the fronts, with the category strip at the top.
3. **`f5-fronts-types-first.png`.** The heading is bigger than it was. Big
   enough? And is the type card (shape + name) the right amount to show before
   the colours?
4. **The lone `Cancel` under the sequence's row** (visible on every step-5
   frame). It is the only button left in the wizard's own footer on step 5 — not
   a Back, not a Next, and nothing in the sequence competes with it. Say if you
   would rather it went too and the × closed the wizard.
5. **`f8-flat-one-slope.png`.** *Flat — 2700 mm from the far corner*, and *Run —
   900*. Is "from the far corner" the phrase a joiner reads correctly, or should
   it name the corner (left / right)?
6. **`f8-two-slopes-flat-steps-aside.png`.** The one short line, in amber. Long
   enough to be read, short enough not to be skipped?
7. **`f7-edit-door-every-tab-live.png`.** `Done` and `Update and save` side by
   side. Done closes without writing to the shelf; Update and save writes and
   closes. Are the two words far enough apart?
8. **`f1-scope-one-wall.png`.** A KITCHEN opening on One wall, with *"A kitchen
   usually starts as a whole room"* under it. Keep the sentence, or is it noise
   now the answer is always One wall?
9. **`f2-room-step-no-canned-boxes.png`.** The wizard's room step with no
   shape buttons at all. Right for tonight — T50 gives it the wall editor.
10. **The WALL dialog's two Backs** (`f8-flat-one-slope.png`): a `← Back` beside
    the title and a `Back` in the footer, both going to the same place. Not the
    confusion you photographed — they agree — and removing one is a deletion
    outside this turn's two named licences, so it is left for you to rule.
    BACKLOG 124.
