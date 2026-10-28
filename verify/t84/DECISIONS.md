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
9. **The door window keeps T37's conduct tonight; 'beside' is SKIPPED WHOLE.** CLAUDE.md LAWS 4 makes the door
   window's conduct the profile's ('beside', PROPOSED, or 'dock-left'), and the conduct lives in
   `src/components/DoorModal.jsx` (`dock`, `sticky`, `escapeCloses`, lines 158 to 177). That file is a RETAIL COPY:
   `scripts/t63-copies.mjs` T63_COPIES names it (`src/retail/design/detail/DoorModal.jsx`, "F3 · every piece's
   window"), so an edit of it leaves the copy stale and `scripts/t78-copy.mjs --check` NOT CLEAN, and re-making the
   copy edits `src/retail/**`: both forbidden by FROZEN 4 (*"The retail copies ... are NOT edited:
   scripts/t78-copy.mjs --check stays CLEAN"*; CLAUDE.md's own list of the copied PRO files omits DoorModal, the
   machine's manifest does not). So the window stays docked left, sticky, Escape-proof, following the clicked leaf,
   in both faces; `profile.ui.studio.doorWindow` reads 'dock-left' (what the app does) with the reason beside it, and
   the Studio's Escape owner treats the door window as not closable, as today. Under Studio the docked window stands
   over the rail while it is open (it is 340 px from the screen's left edge); the rail is back the moment it closes.
   Named in the PR under SKIPPED AND WHY.
10. **The Studio's stylesheet is frozen like its components.** `src/components/studio/studio.css` is PRO's surface
    as much as the JSX it skins, so it is hashed in the freeze manifest and licensed in EXEMPT like every new studio
    file; the freeze test's 'nothing was ADDED' listing names the `.css` files of `src/components/studio/` beside the
    code (one line, that test only; the walker and the module graph still read code files). The owner's setup CSS of
    26.10 (`setup-workspace.css`) is not drawn into the manifest: it is his, edited by him on main (27.10), and
    FROZEN 5 keeps it untouched by this turn, not frozen against him.
11. **CNC brings a hidden inspector back.** On main `setViewMode('cnc')` sets `rightPanelOpen: true`: the CNC
    panel (its tree and its two downloads) shows the moment CNC is chosen. Under Studio the same road brings the
    inspector back from 'none' (to 'full' when pinned, else 'quick'), so no CNC control waits behind the
    breadcrumb's button; the pin is never touched (CLAUDE.md LAW 1, ZERO KASOWANIA: *"Studio adds a second road to a
    function; it never closes the first"*; S3's note, INT's line in `uiStore.js`).
12. **The slices' own decisions stand in their reports.** Each agent wrote what it decided, why and from which words
    in `verify/t84/agents/<slice>.md` under DECISIONS TAKEN (D1 the skin, S1 the shell, S2 the cards, S3 the host,
    S4 the errors, S5 the scene's edge, S6 the rail's menus and Escape, S7 the licences). The PR body carries them
    one line each. The ones that change what the owner sees: the top bar's narrow values at every width (D1: no
    media query can read the profile); the strip reads `#<check> · <message>` (S4: CLAUDE.md's "#48 · the bowl
    enters a board" is Check #48); the status bar's words are Stage-1's ("Shared selection", "No selection", S1);
    Back to quick settings is the word "Quick" in the panel's header (S3); the free panel's thickness ladder and tilt
    chips stay in its part window (S2, the 136 px value column); Add's popup lists the four library categories with
    the legacy Library menu's own hints (S6).
13. **The skin's last px land at F8.** D1's frames of F1 (wave 2, `verify/t84/f01-skin.md`) measured the Studio
    against the designer's Stage-1 at 1280, 1440 and 1920: 45 checks pass, every box equal or its difference named,
    none unexplained. Three of the named differences were the skin's own and D1 proposed their fix (D4: PRO 2 px off
    the words, the rule 18 high; D8: her 10 px side padding on the top bar's and the scene edge's house buttons; D9:
    the gold button at her weight 600); measured on D1's own build, the Studio's tests green. INT applied it at F8,
    with studio.css re-frozen and its F8 reason in EXEMPT (CLAUDE.md F1: *"compared with the HTML at the three
    sizes; the report names every deviation in px"*). The walk ran on F7's build, before those few px.
14. **Frame selection keeps the render's box tonight; the walk's fix waits for the owner.** The walk measured that
    Frame selection fits `3d/renderCapture.js` `furnitureBounds`, the box the key light and the render already fit,
    which leaves the hardware out: a base unit's feet fall just past the frame (ndc 1.037 at all three sizes) and the
    camera bar covers the scene's lowest 62 px. Its patch (`verify/t84/proposals/F1-CameraBar.jsx.diff`, with the f06
    test's line) counts the instanced hardware in a second, local bounds function. Not applied: a second road to "the
    furniture's box" beside the render's is against the law the turn keeps (*"one law one path"*), and the render's
    own box is in `3d/`, which this turn may not edit (FROZEN 3). The owner chooses: the local box, or the render's
    box widened in a later turn. Named in the PR.
