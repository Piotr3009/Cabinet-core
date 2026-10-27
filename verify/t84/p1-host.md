# T84 P1 (c) . THE HOST: what RightPanel assumes about where it stands, and the smallest change that lets a host hold it

Main 9f5020f. Read from the source, then measured on the built app (the census build, browser-only width
overrides; nothing in src touched): the overflow table (section D) and the header table (section E).

## A. What the panel is today

| Branch | File:line | Root element | Header | Close (x) |
| - | - | - | - | - |
| CNC view | RightPanel.jsx:255-264 | ``<aside className={`absolute right-0 top-0 bottom-0 w-[310px] cc-panel rounded-none border-y-0 border-r-0 ${LAYER_CLASS.panel} flex flex-col`}>`` (257) | `<PanelHeader title="CNC sheet" onClose={closeRightPanel} />` (258), then `<CncTree />` (260) | `closeRightPanel` |
| Nothing selected | RightPanel.jsx:266-273 | the same aside (268) | `<PanelHeader title="Parameters" onClose={closeRightPanel} />` (269), one line of text | `closeRightPanel` |
| Several cabinets | RightPanel.jsx:280-282 then MultiUnitPanel.jsx:131-434 | MultiUnitPanel's own aside, the same classes (MultiUnitPanel.jsx:132) | its own head: `<h2 data-multi-count>` "N cabinets" + x (133-138) | `onClose` = `closeRightPanel` (RightPanel.jsx:281) |
| One cabinet | RightPanel.jsx:284-1787 | the same aside (285) | `<PanelHeader title={type.label} onClose={closeRightPanel}>` + `<UnitNameField>` as its child (286-295) | `closeRightPanel` |

`PanelHeader` (RightPanel.jsx:2093-2102): `<div className="flex items-center gap-2 px-3 py-2 border-b border-shell-600">`,
the title `<span className="text-xs uppercase tracking-wide text-ink-200 shrink-0">`, the children (the name
field), a `flex-1` spacer, and `<button className="cc-btn-ghost" onClick={onClose} title="Close panel">x</button>`
(2099). The x calls `closeRightPanel` (uiStore.js:235, `rightPanelOpen: false`), and ConfiguratorPage.jsx:666
(`{rightPanelOpen && !bomOpen && <RightPanel />}`) then unmounts the panel. The panel is mounted inside the canvas
container (`flex-1 relative overflow-hidden`, ConfiguratorPage.jsx:623), over the scene, whose canvas fills the
container (`absolute inset-0`, 628-630): on main the right 310 px of the picture are behind the panel.

Inside the ONE-CABINET branch, besides the rows, live three windows that exist only while that branch is mounted:
`<NotchModal />` (1781), `<EdgeNotchModal />` (1783), `<MirrorBackModal />` (1785) (defined at 2489, 2581, 2677;
each renders a `Modal`, `fixed inset-0 z-40`). Their openers are in the scene: a lit corner
(3d/notchPick.js:24 `openModal('notch')`), a lit edge (3d/notchPick.js:58 `openModal('edge-notch')`), a mirror
cabinet's back (3d/mirrorCabinetRoom.js:46, 314 `openModal('mirror-back')`).

## B. Every place that assumes the panel lays itself over the canvas's right edge at 310 px, or drives its being open

| # | File:line | What it assumes | Under Studio (the panel embedded in InspectorHost's column) |
| - | - | - | - |
| 1 | RightPanel.jsx:257, 268, 285; MultiUnitPanel.jsx:132 | the panel places itself: `absolute right-0 top-0 bottom-0 w-[310px]`, at `LAYER_CLASS.panel` (z-20, lib/modalLayer.js: "the docked side panels, the canvas toolbar, the canvas overlays") | replaced in the embedded layout only (section C): the host gives the width (400, 360 below 1500, profile.ui.studio.inspector) and the height |
| 2 | ConfiguratorPage.jsx:666 | mounted in the canvas container only while `rightPanelOpen && !bomOpen`: the BOM REPLACES the panel | under Studio the page does not mount it there (INT's contract): InspectorHost does, beside the scene, and the BOM no longer hides it |
| 3 | ConfiguratorPage.jsx:623-630 | the canvas spans the full container width, the panel over it | the scene slot ends where the inspector column begins; R3F follows its container, no code assumes the 310 |
| 4 | CncView.jsx:151-171, 403 | in a job with decorated fronts it measures its sibling `<aside>`s flush with its right edge (`Math.abs(rect.right - frame.right) < 2`) and insets the sheet by their width (`style={{ right: rightInset }}`) | the embedded panel is not a sibling in the scene slot, so the inset is 0 (right: it stands beside, not over); the BOM and Check asides in the scene slot are still measured |
| 5 | uiStore.js:233-236, 364, 764, 875 | `rightPanelOpen` and its three actions; `setViewMode('cnc')` forces it true (364), `selectUnit` sets it to "something is selected" (764), `selectElement` to true (875) | Studio's inspector reads `inspector` ('quick' / 'full' / 'none'), not `rightPanelOpen`: these writes are harmless, and they mean nothing to the inspector unless the store ties them (section F) |
| 6 | RightPanel.jsx:258, 269, 281, 286 + 2099; MultiUnitPanel.jsx:137 | the header's x closes the panel through `closeRightPanel` | dead under Studio unless the host gives it a meaning (section F); it must STAY: it is one of the 649 counted controls (the "outside the sections" three: name field, x, Delete unit) |
| 7 | RightPanel.jsx:243-248 (`addDoors`) | "SPEC 4.10: doors are the last step": after "Add doors - finish unit" it calls `closeRightPanel()` and `clearSelection()` | kept; under Studio it ends with nothing selected, and the mode is `inspectorAfterSelect`'s answer (`clearSelection` applies it after the close: by INT's contract 'quick', the empty state) |
| 8 | ContextMenu.jsx:157-164 (`renameUnit`) | "Rename" selects the cabinet, `openRightPanel()`, and on the next frame focuses `[data-unit-name="<id>"]`: the panel with its name field must be mounted by then | in 'quick' the name field is not in the DOM: Rename does nothing visible unless `openRightPanel` brings the inspector to 'full' (section F). ContextMenu.jsx is FROZEN 6 |
| 9 | ContextMenu.jsx:186 (`openPanelSection`) | end panels, top infill, cornice, bottom mask, plinth: `openRightPanel(); setPanelSection('construction', true)` ("the options for what was just added are in the panel") | the same: needs 'full' |
| 10 | 3d/Scene.jsx:2277-2279 (the inner +) | `openModal('add-items')`, `openRightPanel()`, `setPanelSection('add', true)` | the same: needs 'full' (FROZEN 3: 3d untouched) |
| 11 | the designer's cards (F3): Doors, Drawers, Bays rows | "TARGET ACTION `openRightPanel(); setPanelSection('doors' / 'contents', true)`" | the same: needs 'full' |
| 12 | RightPanel.jsx:1781, 1783, 1785 | the cut-corner, cut-edge and mirror-on-the-back windows are mounted INSIDE the one-cabinet branch | in 'quick', 'none', several cabinets, CNC and nothing selected they are not mounted: a click on a lit corner, a lit edge or a mirror cabinet's back sets `modal` and nothing is drawn (on main the same happens while the BOM is open or after the x). The corner and edge picks start from NotchRow (Construction, 'full' only) and end when it unmounts (2357-2358), so they are safe; the MIRROR BACK is asked from the scene in any mode, so it is not (section C, last row) |
| 13 | RightPanel.jsx:285 + lib/modalLayer.js | the aside is a stacking context (absolute + z-20), so the three windows inside it paint at z-20 among the page, not at the modal layer z-40 | in the embedded layout the aside must not be a stacking context or a containing block for fixed children: no `z-*` with a position, no `transform`, `filter`, `perspective`, `contain: paint / layout`, `will-change: transform`, `backdrop-filter` on the aside or any ancestor up to the shell, or the three windows are trapped in the column |
| 14 | LibraryPanel.jsx:172, 80-81, 92-94 | the Library is `absolute` at `libraryPos` INSIDE the canvas container (container coordinates, not the viewport), clamped with viewport numbers: x <= innerWidth - 260, 56 <= y <= innerHeight - 120 (56 = the 48 px top bar + 8) | "Add opens the EXISTING LibraryPanel beside the button, 8 px off its right edge": the button's rect is in viewport coordinates, the panel's position in the scene slot's: `setLibraryPos({ x: addRect.right + 8 - sceneRect.left, y: addRect.top - sceneRect.top })`, and the 56 floor still applies (it may push the panel down to 56 px below the scene slot's top) |
| 15 | lib/menuPlacement.js:187 (`placeAnchoredModal`), Modal.jsx:229-282 | windows open up and to the right of their object, clamped to the VIEWPORT, with no idea of the panel: a window beside a cabinet near the right lands over the panel on main | the same over the inspector column; nothing to change (rule 15 is "beside the object", and the panel is not the object) |
| 16 | BomPanel.jsx:152; CheckPanel.jsx:65-67 | both overlay the canvas's right edge (`absolute right-0`, 720 / 560 px and 380 px), exactly where the panel stands; the BOM replaces it (row 2), the Check covers it | they stay in the scene slot; the inspector column beside them stays visible |
| 17 | RightPanel.jsx:2460 | "five buttons on a 310 px panel: they wrap" (the joints row) | they wrap less at 360 / 400; measured: no horizontal scroll (section D) |
| 18 | CanvasToolbar.jsx:99 | centred over the full canvas (`left-1/2 -translate-x-1/2`), at z-20 beside the panel | not rendered under Studio (F6) |
| 19 | TopBar.jsx:418-438 (Bright), 186-197 (View > Brightness) | nothing about the panel: the slider sits in the header's right group, outside the canvas | stays in the top bar (F2), same state, same setter; listed because CLAUDE.md asked, and nothing was found |
| 20 | Messages.jsx:228, FrontGapWarnings.jsx:62, InframeWarnings.jsx:36 | the bottom-LEFT column of the canvas (`absolute left-3 bottom-3`) | nothing about the panel; the Changes bar moves to the status bar (F2) |
| 21 | the walks and the census | find the panel by `aside`, `[data-section]`, `[data-unit-name]` (scripts/t84-census.mjs, t83-walk.mjs `selectedIs`) | the embedded root stays an `<aside>`, the hooks stay |

## C. THE SMALLEST LICENSED CHANGE (INT, one patch, the two files in EXEMPT; no row moved, no row hidden)

RightPanel.jsx (main's lines):

| Line | Today | Becomes |
| - | - | - |
| 55 | `export default function RightPanel() {` | `export default function RightPanel({ layout = 'overlay', headerActions = null } = {}) {` |
| new, before 55 | - | ``const PANEL_ASIDE = { overlay: `absolute right-0 top-0 bottom-0 w-[310px] cc-panel rounded-none border-y-0 border-r-0 ${LAYER_CLASS.panel} flex flex-col`, embedded: 'relative h-full w-full min-w-0 cc-panel rounded-none border-0 flex flex-col' };`` (both literal, so Tailwind's scanner sees them; the embedded one has no position offsets, no width and no z layer, so it is not a stacking context, row B 13) |
| 257, 268, 285 | ``<aside className={`absolute right-0 ... flex flex-col`}>`` | `<aside className={PANEL_ASIDE[layout] \|\| PANEL_ASIDE.overlay} data-panel-layout={layout}>` |
| 258 | `<PanelHeader title="CNC sheet" onClose={closeRightPanel} />` | `<PanelHeader title="CNC sheet" onClose={closeRightPanel} actions={headerActions} layout={layout} />` |
| 269 | `<PanelHeader title="Parameters" onClose={closeRightPanel} />` | the same two props added |
| 281 | `return <MultiUnitPanel ids={selectedUnitIds} onClose={closeRightPanel} />;` | `return <MultiUnitPanel ids={selectedUnitIds} onClose={closeRightPanel} layout={layout} headerActions={headerActions} />;` |
| 286 | `<PanelHeader title={type.label} onClose={closeRightPanel}>` | `<PanelHeader title={type.label} onClose={closeRightPanel} actions={headerActions} layout={layout}>` (UnitNameField stays its child, 294) |
| 302-304 | `{element && ( <ElementSection ... /> )}` | `{element && layout !== 'embedded' && ( <ElementSection ... /> )}`: the duplicate inline ElementSection, suppressed in the embedded layout ONLY |
| 2093 | `function PanelHeader({ title, onClose, children = null }) {` | `function PanelHeader({ title, onClose, children = null, actions = null, layout = 'overlay' }) {` |
| 2096 | the title span `... text-ink-200 shrink-0` | in the embedded layout `... text-ink-200 min-w-0 truncate` with `title={title}` (section E: with the actions in the row a `shrink-0` title pushes the name field over them) |
| 2098-2099 | `<span className="flex-1" />` then the x | `<span className="flex-1" />{actions}` then the x (the actions INSIDE the existing header, beside the name field; no second header) |
| 2489, 2581, 2677 | `function NotchModal()`, `function EdgeNotchModal()`, `function MirrorBackModal()` | `export function ...` (one word each, nothing else): the host mounts them while it does not mount the one-cabinet branch (row B 12) |

MultiUnitPanel.jsx (not a retail copy; licensed the same way):

| Line | Today | Becomes |
| - | - | - |
| 33 | `export default function MultiUnitPanel({ ids, onClose }) {` | `export default function MultiUnitPanel({ ids, onClose, layout = 'overlay', headerActions = null }) {` |
| 132 | the same overlay aside | the same two literals chosen by `layout` (it cannot import RightPanel's constant: RightPanel imports it; and a shared helper in src/lib would be a lib delta, FROZEN 1) |
| 136-137 | `</h2>` then the x | `</h2>{headerActions}` then the x |

The host's own part (InspectorHost, S3): it renders `<RightPanel layout="embedded" headerActions={<span
data-studio-host>{Pin}{Back to quick settings}</span>} />` in a column whose width it sets; every control it puts in
`headerActions` sits under `[data-studio-host]`, so the census counts them apart and the 649 stay 649. It never
puts a title bar above the aside (LAW 2), never hides a row, never queries the DOM to hide children. With the
patch above every branch honours both props: CNC (258), empty (269), several cabinets (281, MultiUnitPanel 132,
136), one cabinet (285, 286).

## D. Measured: the panel at the PROPOSED widths (13 default units, every section open, viewport 1280 x 800)

The scrolling body (`.overflow-y-auto`) client / scroll width; "past the edge" = a visible element whose right edge
is beyond the aside's.

| Type | 310 (today) | 316 | 360 | 400 |
| - | - | - | - | - |
| BUD, WUD, WARDROBE, MIRROR_CABINET, CORNER_L_BASE, BLIND_BASE, PANTRY, WUD_HOOD | no scroll | no scroll | no scroll | no scroll |
| BUDR, VANITY2, HAWA_POCKET, BUD_INT | no scroll; the header's name field past the edge | the same | no scroll, nothing past | no scroll, nothing past |
| FREE_PANEL | no scroll; the name field past the edge | no scroll | no scroll | no scroll |

So the full panel at 400 and at 360 (the designer's two widths) holds all thirteen without a horizontal scroll;
the designer measured three of them at 316 / 360 and found the same. The 310 / 316 clip of the name field is
today's, on the long type names (it is the header, not the scrolling body).

## E. Measured: the header with two 28 px actions added before the x (a DOM-only test)

How far the name field's input (fixed `w-28`, 112 px) runs into the first action; positive = overlap. The title
span is `shrink-0` (2096), so the name field's `min-w-0` wrapper shrinks and its input spills over what follows.

| Type (title px) | 316 | 360 | 400 |
| - | - | - | - |
| HAWA_POCKET (187) | 130 | 99 | 59 |
| BUDR (178) | 130 | 90 | 50 |
| VANITY2, BUD_INT (159) | 115 | 71 | 31 |
| FREE_PANEL (144) | 100 | 56 | 16 |
| WUD_HOOD (109) | 65 | 21 | none |
| MIRROR_CABINET (106) | 62 | 19 | none |
| BLIND_BASE (92) | 49 | 6 | none |
| WARDROBE, WUD, BUD, CORNER_L_BASE, PANTRY (49 to 70) | 7 to 27 | none | none |

Hence the 2096 line of section C: in the embedded layout the TITLE gives way (`min-w-0 truncate`, the full label
in its `title`), not the name field and not the x. The alternative, `flex-wrap` on the header row, keeps one header
on two lines; either keeps LAW 2. S3 measures it again on the branch at 1280, 1440 and 1920.

## F. The x, and what a host must do about it

Today the x (PanelHeader 2099; MultiUnitPanel 137) calls `closeRightPanel`, which writes `rightPanelOpen: false`;
the page then stops mounting the panel. Under Studio nothing mounts the panel by `rightPanelOpen`, so the x would
do nothing. It must not be removed or hidden (it is one of the 649, and the legacy face's way out). The smallest
answer is two lines in uiStore (INT's file), invisible to the legacy face, which never reads `inspector`:

- `closeRightPanel: () => set({ rightPanelOpen: false, inspector: 'none' })`: the x hides the inspector; the
  breadcrumb's panel-show button brings it back (CLAUDE.md F2), and so does the next selection of another cabinet
  (`inspectorAfterSelect`). `addDoors` (B 7) closes and then clears the selection, so it ends in the empty state,
  as on main it ends with the panel gone and nothing selected.
- `openRightPanel: () => set({ rightPanelOpen: true, inspector: 'full' })`: every legacy road that opens the panel
  to show something in it (B 8 Rename, B 9 openPanelSection, B 10 the inner +, B 11 the card's Doors / Drawers /
  Bays rows) shows it in Studio too, without touching ContextMenu.jsx (FROZEN 6) or 3d/ (FROZEN 3). `selectUnit`
  and `selectElement` do not call it (they write `rightPanelOpen` directly), so `inspectorAfterSelect` keeps its
  rule.

The other way, an `onClose` prop that the host binds, is a third prop on every branch and leaves B 8 to B 11 dead
in 'quick'; the two store lines cover both.

## G. What else would be duplicated in the embedded layout

| What | Where | Duplicated by | Done |
| - | - | - | - |
| The selected piece's editor | RightPanel.jsx:302-304 `ElementSection` (ElementProperties inline, "Selected piece") | the part's own window, `openModal('element')` (DoorModal.jsx, ElementProperties again), which the designer keeps independent | suppressed in the embedded layout only (C, 302-304). For a FREE_PANEL this inline block is where its Length / Width / Thickness / Facing / Tilt live on main (ElementProperties.jsx:1121-1232, the free-panel field kinds): in Studio they stay reachable in the part window and on the free panel's card (F3) |
| A second header | the InspectorHost | PanelHeader | not done: Pin and Back go in `headerActions` (LAW 2) |
| The cabinet's warnings | UnitWarnings (RightPanel.jsx:508, `validateUnit`) and ShelfHingeClash (330) | F5's IssueStrip over the panel (the Check's `runChecks` findings) | NOT suppressed: two sources, sometimes one sentence; LAW 2 forbids hiding a row |
| The type and the number | PanelHeader's title and UnitNameField | the breadcrumb (display only) and the quick card's head (quick mode only) | no control is doubled; the name field stays the one place a name is typed (ContextMenu's Rename comes to it) |

