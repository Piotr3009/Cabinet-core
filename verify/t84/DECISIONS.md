# T84 · DECISIONS TAKEN (INT, the night of 27.10.2026)

Each line: what was decided, why, and which words of CLAUDE.md (or the owner's, quoted there) it follows. Every
decision is also in the PR body under DECISIONS TAKEN.

1. **The branch.** `claude/t84-studio-stage1` from main 9f5020f (CLAUDE.md: *"Branch `claude/t84-studio-stage1`"*;
   the run's rule 6). The session was opened on another branch name; the owner's file names this one.
2. **The suite at the start is not green, and the run says so.** On main 9f5020f, a full clone: 7719 tests, 7704
   pass, 15 fail. All 15 are older tests that read source the setup workspace of 26.10 changed (commit 4f3e33c
   "123": Modal.jsx, RoomModal.jsx, WallElevationModal.jsx, SetupArt.jsx and their retail copies), in nine files:
   turn23-f1-nav-stack (1), turn31-f1-modal-shell (2), turn36-f1-one-settings-modal (1),
   turn37-f4-split-boundary (4), turn59-f2-the-shell (1), turn64-f2-f5-steps-posh-layout-estimate (1),
   turn65-f8-the-menu-and-the-cornice (1), turn67-f1-f2-the-room-in-one-window (3),
   turn74-f1-the-side-asks-any-wardrobe (1). At a5c4a82 (T83 merged) the same nine files pass 127 of 127. They
   are NOT touched: FROZEN 5 (*"The setup workspace of 26.10 ... untouched"*) and the copy rule (Modal, RoomModal,
   WallElevationModal, SetupArt are retail copies) forbid the code, and amending fifteen older tests is not this
   turn's. A 16th failure on the container's shallow clone (turn78-classify, the T78 commit table) is the clone's,
   not the code's: `git fetch --unshallow` and it passes.
3. **The pure modules live in `src/components/studio/lib/`.** CLAUDE.md names `lib/studioCards.js`,
   `lib/studioIssues.js`, `lib/studioEscape.js`, `lib/cameraPresets.js`, and in the same breath (FROZEN 1, PART E,
   TESTS AND PROOF) asks the classifier to show *"zero engine and lib deltas"* and the f45-t84 fragments to name
   *"NO engine or lib file"*. Every file under `src/lib` is in that table, so the four modules stand beside the
   components they serve. The engine/lib table of `scripts/t78-classify.mjs` therefore keeps its count of main.
4. **`profile.ui.studio`, the code wins.** The block is the numbers of THE NUMBERS table and nothing else; the
   migration takes the code's block whole (nothing in Settings edits it, the TURN 40 law the dowel numbers follow),
   so the owner changing a number in `profile.js` reaches every browser, including one that saved a profile. The
   walk and the census flip `enabled` in the running store (`window.__cc.profile.setState`), never by a button
   (*"nie, juz jest przy wyborze"*: no switch in the UI).
5. **ConfiguratorPage.jsx is the page that composes the shell.** App.jsx decides the face (factory entry and
   `ui.studio.enabled`) and hands the page the flag; the page, which already holds every handler the top bar and
   the menus call, renders `StudioShell` around the existing scene. Licensed in EXEMPT with the owner's words.
6. **The shell takes slots.** Inspector, scene edge, status extras, the rail's popups and the scene marker are
   handed to `StudioShell` by the page, so each F's commit stands on its own and nothing in `3d/` imports a PRO
   file: the marker reaches the scene through one registration slot in `3d/UnitView.jsx`.
7. **The Output popup is the legacy Output, whole.** The Studio top bar mounts the legacy `MenuBar` with
   `orderMenus(menus)` whole (ZERO KASOWANIA), and its Output dropdown IS `buildOutputMenu` with the existing
   handlers, the 14 leaves, the same enablement. A second copy of the same 14 leaves beside it would be two roads
   that can drift; CLAUDE.md's census lists the Studio's NEW items and an Output popup is not among them.
8. **The skin reaches the shell's own surfaces.** The top bar, the context strip, the rail, the quick card, the
   inspector's frame, the status bar and the Studio's popups take the 13 / 30 / 32 / 4 scale. The embedded
   RightPanel, the part windows, the Library, the BOM and the Check keep their own styles tonight (NOT THIS TURN:
   *"The part windows in the Studio skin"*, *"Groups, tabs or search in the full panel"*; LAW 2: no row restyled
   into something else). The legacy menu bar's buttons are compacted in the Studio scope so all eight menus fit at
   1280 px.
