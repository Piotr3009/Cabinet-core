# T84 · THE INTEGRATION CONTRACT (INT, 27.10.2026)

Every slice reads CLAUDE.md (its PART), P1's four tables (verify/t84/p1-*.md) and this file. INT is the only writer
of the central files; a slice writes ONLY the files it owns and hands INT a patch for anything else. Nothing here
overrides CLAUDE.md: where they seem to disagree, CLAUDE.md wins and the slice says so in its report.

## 0. The rules of the night, for every slice
- Write only your own files (section 2). Never run git commit, add, checkout, stash, reset or push: INT commits.
- A change to a file you do not own is a PATCH: copy the file to /tmp/claude-0/t84/work/<SLICE>/, edit the copy,
  then from the repo root `diff -u src/<path> /tmp/claude-0/t84/work/<SLICE>/<name> > /tmp/claude-0/t84/patches/<SLICE>-<name>.diff`
  (INT applies it with `patch -p0 < <file>` against the file named on the `---` line). Never edit the repo's copy.
- Every NEW file opens with the Skylon header, byte for byte the first 8 lines of scripts/t83-walk.mjs (the
  `/* ... */` block; for .css the same block). Then a comment naming CLAUDE.md T84 and the F.
- No em dash and no en dash in anything you write (code, comments, strings, tests, reports): use ':' or ',' or '-'.
  No curly quotes. The app's own glyphs stay where a label reads so (`…` in "New project…" or "Drawings…", `·` in
  "Changes · 3", `›` in "2 doors · L / R ›"): read an existing label from the source, never retype it.
- No new dependency. React 19, zustand, Tailwind 3, three, drei only.
- Syntax-check every .jsx you write: `npx esbuild <file> --loader:.jsx=jsx --format=esm --log-level=warning > /dev/null`.
  Builds go to a private outDir only: `npx vite build --outDir /tmp/claude-0/t84/dist-<SLICE> --emptyOutDir`.
- Targeted tests only: `node --test test/turn84-fNN-*.test.js` (never --silent). Tests read SOURCE and import pure
  modules; a test never imports a .jsx file (node cannot load JSX).
- Every number of THE NUMBERS table is read from `profile.ui.studio` (section 3), never typed in a component.
- A report is twenty lines in verify/t84/agents/<SLICE>.md, the house format of verify/t83/agents/P1.md (title line,
  what was done with file:line, "## The six stations" 1 Real interface, 2 Carcass and collisions, 3 Cut list and BOM,
  4 Drawing set, 5 Save and reload, 6 Export, then DECISIONS TAKEN, SKIPPED, PATCHES FOR INT).

## 1. The face
- `src/components/studio/lib/studioFace.js` (S1): `isStudioFace(audience, profile)` =
  `audience === 'factory' && profile?.ui?.studio?.enabled === true`. Used by App.jsx, DoorModal.jsx, and any
  Studio component that must know.
- App.jsx (INT): `<ConfiguratorPage studio={isStudioFace(audience, profile)} />`. The retail entry never mounts it.
- pages/ConfiguratorPage.jsx (INT) composes the shell (section 5). Under Studio the page's own Escape branch is OFF
  (the shell owns Escape, F7); CanvasToolbar is not rendered (F6); RightPanel is not mounted over the scene (F4: it
  lives in InspectorHost); `<Messages history={false}>` (F2: the Changes bar lives on the status bar).

## 2. Files and owners (NEW files unless marked)
| Slice | F | Files it writes |
| - | - | - |
| P1 | P | scripts/t84-census.mjs, verify/t84/census-main.json, verify/t84/p1-*.md |
| D1 | F1 | src/components/studio/studio.css, src/components/studio/StudioIcons.jsx, src/components/studio/lib/studioSkin.js, test/turn84-f01-skin.test.js, verify/t84/f01-skin-*.png (wave 2) |
| S1 | F2 | src/components/studio/StudioShell.jsx, StudioRail.jsx, SelectionBreadcrumb.jsx, StatusBar.jsx, lib/studioFace.js, test/turn84-f02-shell.test.js; PATCHES: TopBar.jsx, Messages.jsx |
| S2 | F3 | src/components/studio/QuickSelectionCard.jsx, src/components/studio/cards/*.jsx, src/components/studio/lib/studioCards.js, test/turn84-f03-cards.test.js |
| S3 | F4 | src/components/studio/InspectorHost.jsx, test/turn84-f04-inspector.test.js; PATCHES: RightPanel.jsx, MultiUnitPanel.jsx |
| S4 | F5 | src/components/studio/UnitIssueMarker.jsx, IssueStrip.jsx (exports IssueStrip and IssueCounters), RefusedField.jsx, src/components/studio/lib/studioIssues.js, test/turn84-f05-issues.test.js; PATCHES: CheckPanel.jsx, 3d/UnitView.jsx (the one mount point) |
| S5 | F6 | src/components/studio/SceneToggles.jsx, SceneViewMenu.jsx, CameraBar.jsx, src/components/studio/lib/cameraPresets.js, test/turn84-f06-scene.test.js; PATCH: CanvasToolbar.jsx (export the door entries hook only) |
| S6 | F7 | src/components/studio/RailMenus.jsx, src/components/studio/lib/studioEscape.js, test/turn84-f07-parity.test.js, test/turn84-f07-escape.test.js; PATCH: DoorModal.jsx (the door window's conduct) |
| S7 | F1-F8 | scripts/t78-classify.d/f45-t84-f01.mjs ... f45-t84-f08.mjs; PROPOSALS (text, for INT): the EXEMPT rows and the FROZEN additions of test/turn59-f1-the-switch.test.js, the NEW_FILES block of test/turn77-f5-no-copyright-line.test.js |
| F1 | F8 | scripts/t84-walk.mjs, verify/t84/walk.txt, verify/t84/f08-*.png (wave 2) |
| INT | all | src/App.jsx, src/pages/ConfiguratorPage.jsx, src/components/TopBar.jsx, CanvasToolbar.jsx, RightPanel.jsx, MultiUnitPanel.jsx, Messages.jsx, CheckPanel.jsx, DoorModal.jsx, src/3d/UnitView.jsx (patches applied), src/stores/uiStore.js, src/engine/profile.js (ui.studio only), the freeze test, NEW_FILES |

WHY `src/components/studio/lib/` and not `src/lib/`: CLAUDE.md FROZEN 1 and TESTS AND PROOF ask the classifier
(scripts/t78-classify.mjs) to show ZERO engine/lib deltas for this turn; every file under src/lib is in its table.
The four pure modules CLAUDE.md calls `lib/studioCards.js`, `lib/studioIssues.js`, `lib/studioEscape.js`,
`lib/cameraPresets.js` therefore live in `src/components/studio/lib/` (INT's DECISION, verify/t84/DECISIONS.md).
A module in `lib/` is PURE: no React, no JSX, no store import, no DOM at import time; it may import src/engine/*
and pure src/lib/* modules. Tests import these.

## 3. profile.ui.studio (INT writes it in src/engine/profile.js; nobody types these numbers anywhere else)
```js
studio: {
  enabled: true,
  scale: { textPx: 13, fieldPx: 30, buttonPx: 32, radiusPx: 4 },
  bars: { topPx: 48, contextPx: 34, statusPx: 30 },
  rail: { widePx: 112, narrowPx: 56, labelsFromPx: 1440 },
  inspector: { quickPx: 344, quickNarrowPx: 316, quickNarrowBelowPx: 1440,
               fullPx: 400, fullNarrowPx: 360, fullNarrowBelowPx: 1500 },
  minScreen: { widthPx: 1280, heightPx: 800 },
  sceneToggles: ['xray', 'hideFronts', 'outlines', 'openAll'],
  doorWindow: 'dock-left',           // DECISIONS 9: 'beside' SKIPPED (DoorModal.jsx is a retail copy)
  issues: { warn: '#d9a441', danger: '#c9524b', textPx: 13 },
  marker: { sizePx: 16 },
  frameMargin: 0.1,
  libraryGapPx: 8,
  cardRowsMax: 6,
}
```
The shell's colours (shell-900/800/700/600, ink-50/100/200/400, gold, gold-hover, gold-dark, status warn/danger/ok)
are Tailwind's theme (tailwind.config.js), already the designer's hexes: studio.css reads them with Tailwind's
`theme('colors.shell.900')`, never a hex typed again. The numbers reach CSS as custom properties the shell sets at
mount from the profile (D1's `studioCssVars`): --studio-text, --studio-field, --studio-button, --studio-radius,
--studio-top, --studio-context, --studio-status, --studio-rail, --studio-inspector, --studio-warn, --studio-danger,
--studio-issue-text, --studio-marker, --studio-library-gap.

D1's pure module `src/components/studio/lib/studioSkin.js` (everyone imports these two, nobody re-derives them):
```js
studioWidths(profile, viewportWidth)
  // -> { railPx, railLabels, quickPx, fullPx }: rail 112 with labels at >= labelsFromPx else 56 without;
  //    quick 344, 316 below quickNarrowBelowPx; full 400, 360 below fullNarrowBelowPx
studioCssVars(profile, { viewportWidth, inspector })
  // -> { '--studio-text': '13px', ..., '--studio-rail': '112px', '--studio-inspector': '344px' | '400px' | '0px' }
```

### The class vocabulary (D1 styles these in studio.css; every slice uses them; the names are the designer's
Stage-1 class names with a `studio-` prefix, so her CSS is the reference for each)
Root and bars: `studio-pro` (the root; carries `data-inspector="quick|full|none"`), `studio-topbar`,
`studio-wordmark`, `studio-pro-label`, `studio-project-name`, `studio-legacy-menu` (wraps the legacy MenuBar:
compacts its buttons so the eight menus fit at 1280), `studio-context`, `studio-breadcrumb`,
`studio-selection-scope`, `studio-statusbar`. Workspace: `studio-workspace`, `studio-rail` (+ `is-narrow`),
`studio-rail-text`, `studio-rail-separator`, `studio-rail-bottom`, `studio-rail-caption`, `studio-rail-badge`
(+ `is-red`), `studio-scene`, `studio-scene-tools` (top right), `studio-scene-toggles` (top edge),
`studio-scene-links` (the foot: the camera bar), `studio-inspector`. Card: `studio-inspector-head`,
`studio-object-title`, `studio-object-id`, `studio-object-thumb`, `studio-scope-row`, `studio-scope-pill`,
`studio-inspector-body`, `studio-card-section-title`, `studio-field-row`, `studio-value-wrap`, `studio-unit`,
`studio-value-action`, `studio-readonly-value`, `studio-inheritance`, `studio-inline-note`, `studio-card-actions`,
`studio-inspector-bottom`, `studio-full-head`, `studio-empty-state`. Popups: `studio-popup`, `studio-popup-head`,
`studio-menu-item`, `studio-library-item`. Issues: `studio-issue-strip` (+ `is-red` | `is-yellow`),
`studio-counter` (+ `is-red` | `is-yellow`), `studio-marker` (+ `is-red` | `is-yellow`), `studio-refused`,
`studio-refused-reason`. Scene: `studio-toggle` (`aria-pressed`). Icons: `studio-icon`, `studio-icon-btn`.
Inside a Studio-owned surface the house classes keep their meaning and take the Studio scale: `cc-btn`,
`cc-btn-gold`, `cc-btn-ghost`, `cc-input`, `cc-label`, `cc-frame` (studio.css scales them under `.studio-skin`, a
class every Studio-owned surface root carries: top bar, context strip, rail, card, inspector frame, status bar,
popups, scene toggles, view menu, camera bar). The embedded RightPanel, the part windows, the Library, the BOM
and the Check are NOT inside a `.studio-skin` (DECISIONS 8).

### The icons (D1)
`src/components/studio/StudioIcons.jsx`: `export default function StudioIcons()` renders the hidden sprite once
(StudioShell mounts it); `export function Icon({ name, className })` renders
`<svg class="studio-icon ..."><use href="#studio-i-<name>"/></svg>`. Names: the Stage-1 eighteen (cube, select,
plus, room, material, down, right, close, pin, open, sliders, drawing, undo, link, warning, panel, check, save)
plus redo, camera, eye, frame, plan, iso, output.

## 4. uiStore (INT writes; slices call these names and nothing else new)
Existing actions keep their names and behaviour. NEW, each landing at its F:
```js
// F4 · P1's host table (p1-host.md F): the legacy roads that open or close the panel reach the Studio inspector
//   openRightPanel()  -> { rightPanelOpen: true,  inspector: 'full' }  (Rename, openPanelSection, the inner +,
//                        the card's Doors / Drawers / Bays rows: every road that opens the panel to show a row)
//   closeRightPanel() -> { rightPanelOpen: false, inspector: 'none' }  (the panel's own x; addDoors' last step)
//   selectUnit / selectElement keep writing rightPanelOpen directly (they never call openRightPanel).
// F3 / F4 · the Studio inspector (the legacy face never reads these)
inspector: 'quick',                  // 'quick' | 'full' | 'none'
inspectorPinned: false,
setInspector(mode),
showQuickSettings(),                 // { inspector: 'quick', inspectorPinned: false }  ("back to quick settings")
showFullSettings(),                  // { inspector: 'full' }
hideInspector(),                     // { inspector: 'none' }
showInspector(),                     // from 'none': inspectorPinned ? 'full' : 'quick'
toggleInspectorPin(),                // { inspectorPinned: !pinned, inspector: 'full' }
// exported pure helper, same module: inspectorAfterSelect({ inspector, inspectorPinned }, changed) ->
//   pinned: unchanged; unpinned and the primary unit changed: 'quick' (the designer's prototype: even from 'none').
//   selectUnit, selectElement and clearSelection apply it. Pin NEVER stores a unit id.
// F4 · commit-before-switch
selectionGuard: null,                // () => ({ ok: true } | { ok: false, reason })
setSelectionGuard(fn), clearSelectionGuard(fn),
//   selectUnit / selectElement / clearSelection call get().selectionGuard?.() FIRST when the primary unit would
//   change (or go to none); { ok: false } => they change NOTHING and return false.
// F5 · the Check's filter
checkFilter: 'all',                  // 'all' | 'red' | 'yellow'
setCheckFilter(level),
openCheckFiltered(level),            // { checkOpen: true, bomOpen: false, checkFilter: level }
//   toggleCheck / setCheckOpen(false) closing the panel put checkFilter back to 'all'.
// F5 · a request to frame units (IssueStrip's Show asks; the camera bar's Frame selection, F6, answers it)
frameRequest: null,                  // { unitIds: string[], at: number } | null
requestFrame(unitIds),               // sets { unitIds, at: Date.now() }
clearFrameRequest(),
```
THE REFUSED FIELD'S DOM (S4 writes it, S3's guard reads it): RefusedField's wrapper carries `data-studio="refused"`;
the moment a commit is refused it sets `data-refused="1"` and `data-refusal="<the engine's exact sentence>"` on that
wrapper SYNCHRONOUSLY (through a ref, besides its React state), and removes both when a value is applied or Escape
restores the applied one. InspectorHost's selection guard: (1) blurs a focused input/select/textarea inside the host
(the field's own blur commits through its own closure, to the ORIGINAL unit); (2) then, if the host holds a
`[data-studio="refused"][data-refused="1"]`, returns `{ ok: false, reason }` (the switch is blocked, the refusal
stays visible); else `{ ok: true }`.

THE 3D SLOT (S4 writes the patch, INT applies it, F5): `src/3d/UnitView.jsx` gains `export function
setUnitAdornment(Component | null)` (a module registry read through useSyncExternalStore) and renders
`<Adornment unit={unit} position={[mm(W / 2), mm(H) + 0.1, mm(D / 2)]} />` inside the unit's group beside the
name chip (the DimLabel of `${unit.params.unit_num} · ... deep`), whether or not the labels are shown. Nothing in
3d/ imports a PRO file; ConfiguratorPage registers `UnitIssueMarker` while the Studio face is mounted.
Existing names the Studio uses (verify each in the source before relying on it): setLibraryCategory, closeLibrary,
openLibraryToInsert, clearLibraryInsert, setLibraryPos, libraryPos, libraryCategory, libraryInsert, openModal,
closeModal, toggleCheck, checkOpen, setViewMode, viewMode, setBomOpen, bomOpen, selectUnit, selectElement,
clearSelection, clearElement, selectedUnitId, selectedUnitIds, selectedElement, openRightPanel, closeRightPanel,
rightPanelOpen, setPanelSection, panelOpen, togglePanelSection, toggleXray, toggleHideFronts, toggleOutlines,
toggleAllFronts, toggleDimensions, toggleFrontDimensions, setDimensionColour, toggleProps, toggleRuler,
toggleContourView, setBrightness, toggleRealisticLighting, focusOn, notify, history, historyOpen, toggleHistory.

## 5. The composition (INT writes ConfiguratorPage; the shell takes SLOTS so each F's commit stands alone)
```jsx
<StudioShell                                  // S1: layout grid + CSS vars from the profile + the 3d adornment slot
  topBar={<TopBar variant="studio" ...the same handlers as today />}                       // F2
  inspector={<InspectorHost renderStrip={(unitId) => <IssueStrip unitId={unitId} />}       // F4 (+F5 props)
                            Field={RefusedField} />}
  sceneEdge={<><SceneToggles /><SceneViewMenu /><CameraBar onDrawings={(e) => openModal('drawing', { kind: 'walls', anchor: anchorOfEvent(e) })} /></>}   // F6
  statusExtras={<IssueCounters />}                                                          // F5
  renderRailMenu={(kind, { anchor, onClose }) => <RailMenu kind={kind} anchor={anchor} onClose={onClose} />}  // F7 ('add' | 'materials')
>
  {/* the EXISTING scene layer, unchanged: Scene, CncView, FirstUnitPlus, Messages history={false}, LibraryPanel,
      BomPanel, CheckPanel, every modal, HandEditsModal, ContextMenu */}
</StudioShell>
```
- StudioShell (S1) renders: row 1 `topBar`; row 2 `<SelectionBreadcrumb />`; row 3 the workspace grid
  `<StudioRail renderMenu={renderRailMenu} />` | the scene slot `<div data-studio="scene" className="relative
  overflow-hidden ...">{children}{sceneEdge}</div>` | `inspector` (absent = no column); row 4
  `<StatusBar extras={statusExtras} />`; the icon sprite `<StudioIcons />` once. It sets the CSS vars from
  `studioCssVars`, re-reads the viewport width on resize, and imports NOTHING from a later F (every later part comes
  in through a slot prop).
- StudioRail (S1): Select (closeLibrary), Add, Room (openModal('room', { anchor })), Materials, separator, Check
  (toggleCheck, badge = findingsToAct(useCheckFindings()).length, red when a red finding is in it); foot: Design
  (setViewMode('3d')), CNC (setViewMode('cnc')). Add and Materials toggle a popup rendered by
  `renderMenu(kind, { anchor: DOMRect of the button, onClose })`; with no renderMenu (before F7) Add opens the
  library at the project's category (`getProjectType(migrateDesign(design).projectType).category`, as
  FirstUnitPlus does) and Materials is disabled with a title saying so.
- InspectorHost (S3): reads `inspector`, `inspectorPinned`, the selection and viewMode. CNC view: RightPanel
  embedded (its CNC branch). Several cabinets: RightPanel embedded (its MultiUnitPanel branch). None: unpinned ->
  the host's own empty state "Select a cabinet or part"; pinned -> RightPanel embedded (its empty branch). One
  cabinet: 'quick' -> `<QuickSelectionCard unitId strip={renderStrip?.(unitId)} Field={Field} />`; 'full' ->
  `{renderStrip?.(unitId)}<RightPanel layout="embedded" headerActions={<PinButton/><BackToQuick/>} />`; 'none' -> no
  column (the breadcrumb's button calls showInspector). Widths from studioSkin (344/316 quick, 400/360 full).
- QuickSelectionCard (S2): `({ unitId, strip = null, Field = null })`. `Field` is the component a dimension row
  renders (F5 passes RefusedField; without it the card renders NumberField and surfaces a refusal by `notify`).

## 6. The Studio components' DOM hooks (the walk and the census find things by these; keep them)
Every Studio control carries `data-studio="<name>"`: topbar, topbar-undo, topbar-redo, topbar-save,
topbar-brightness, topbar-account, topbar-bom, breadcrumb, breadcrumb-show-inspector, rail, rail-select, rail-add,
rail-room, rail-materials, rail-check, rail-design, rail-cnc, scene, statusbar, inspector (plus `data-mode`),
card (plus `data-card-type`), card-row (plus `data-row="<key>"`), card-open-cabinet, card-full-settings, pin,
back-to-quick, issue-strip, issue-show, counter-red, counter-yellow, marker (plus `data-unit`), refused,
toggle-xray, toggle-hide-fronts, toggle-outlines, toggle-open-all, view-menu, camera-bar, camera-plan, camera-iso,
camera-a, camera-b, camera-c, camera-d, camera-frame, scene-3d, drawings, popup (plus `data-kind`), popup-item.
Controls a HOST adds inside RightPanel's own aside (Pin, Back to quick settings) ALSO carry `data-studio-host` so
the census counts them apart from the panel's own controls.

## 7. Commits (INT)
P1 "T84 P1: the probes"; then "T84 F1: the skin", "T84 F2: the shell", "T84 F3: the quick cards", "T84 F4: the
inspector host", "T84 F5: the errors you can see", "T84 F6: the scene's edge", "T84 F7: the rail's menus, Escape and
the parity gate", "T84 F8: the walk". Each commit re-freezes the PRO files it edits or creates (EXEMPT + FROZEN),
extends NEW_FILES and carries its f45-t84 fragment.
