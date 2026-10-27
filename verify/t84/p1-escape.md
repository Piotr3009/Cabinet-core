# T84 P1 (b) . THE ESCAPE MAP of main (9f5020f)

Read from the source (every `keydown` listener and every `onKeyDown` that reads Escape in src, PRO first) and
then MEASURED on the built app with real keys (CDP `Input.dispatchKeyEvent`, the private build of the census, a
BUD at wall A x 1200): the probe's twenty cases are table C. Line numbers are main's.

## A. Every listener that reads Escape (PRO)

Phase: W-cap = `window` capture, D-cap = `document` capture, R = React handler on the element (React 19 listens at
the root container, so it runs after the capture listeners and before every `window` bubble listener), W = `window`
bubble. "Stops" = what it does to the event when it acts.

| # | File:line | Phase | Listens while | One Escape does | Reads target / defaultPrevented | Stops |
| - | - | - | - | - | - | - |
| 1 | pages/ConfiguratorPage.jsx:201-297 (Escape 219-223, add 293) | W | always (re-added after every change of its deps 295-297: selection, units, ...) | `selectedElement` ? `clearElement()` : `selectedUnitId` ? `clearSelection()` | target INPUT / TEXTAREA / SELECT returns first (206); BUTTON is not excluded; defaultPrevented not read | nothing |
| 2 | components/Modal.jsx:184-196 | W, one per open window | a window is open | `(onEscape \|\| onBack \|\| close)()` | no target check (a key in a field inside the window closes it); defaultPrevented read ONLY when `onEscape` is given; ignored when `escapeCloses` is false and there is no `onBack` / `onEscape`; ignored by a `workspace` window that is covered | nothing |
| 3 | components/DoorModal.jsx:158-177 (the T37 exception) | via 2 | the window is about a door leaf (`isDoor`) | nothing: `dock={isDoor ? 'left' : null}` (175), `sticky={isDoor}` (176), `escapeCloses={!isDoor}` (177); the window stays, follows the clicked leaf (127-140) and closes only by its x | - | - |
| 4 | components/MenuBar.jsx:19-29 | W | a dropdown is open | `setOpen(null)` (the whole dropdown, submenu included) | no | nothing |
| 5 | components/ContextMenu.jsx:252-262 | W | the right-click menu is open | `closeContextMenu()` | no | nothing |
| 6 | components/LibraryPanel.jsx:100-106 | W | the Library is open (`libraryCategory`) | `closeLibrary()` | no | nothing |
| 7 | components/LibraryPanel.jsx:446-457 (Flyout) | W-cap | a group flyout is open | `onClose()` of the flyout | no | `stopPropagation` |
| 8 | components/LibraryPanel.jsx:553-556 | R | renaming a saved set | `setEditing(null)` | - | nothing |
| 9 | components/Messages.jsx:131-136 (HistoryBar) | W | the Changes list is open | `closeHistory()` | no | nothing |
| 10 | components/ElementProperties.jsx:70-81 | W-cap | Center between is armed on this unit | `cancelCentreBetween()` | no | `stopPropagation` |
| 11 | components/CabinetEditorModal.jsx:262-299 | W-cap | a piece is selected inside the cabinet editor | Center between armed here: `cancelCentreBetween()`; else `setSelectedId(null)` (back to the cabinet level) | no | `stopPropagation`, `preventDefault` |
| 12 | components/PartDetailModal.jsx:511-598 | W-cap | the part window is open | first of: its menu, the typed number, the dimension entry, the measures, an open menu, an armed tool, the selection, each cleared alone; nothing armed: falls through | a key in an INPUT / SELECT other than Escape, Tab, Enter returns | `stopImmediatePropagation` when it acts |
| 13 | components/PartDetailModal.jsx:1785-1787 | R | the typed-value box | `onTypedCancel()` | - | `preventDefault`, `stopPropagation` |
| 14 | components/RoomModal.jsx:540-566 | W | a box side (or an island) is picked | `setTyped('')`, `setPicked(null)` | target INPUT / TEXTAREA / SELECT returns | `preventDefault` only |
| 15 | components/RoomModal.jsx:1009-1012 | R | an island's size field | `setIslandEdit(null)` | - | `preventDefault` only |
| 16 | components/DrawRoomModal.jsx:197-221 | R | the length field | a typed number: cleared, the drawing stays; nothing typed: falls to the window (2; its `onBack`, 242, goes back a wall) | - | `preventDefault`, `stopPropagation` when it acts |
| 17 | components/MaterialPicker.jsx:65-82 | D-cap | the picker popover is open | `setOpen(false)` | no | `stopPropagation` |
| 18 | components/WarehouseModal.jsx:400-403 | R | renaming a stock row | `setRenaming(null)` | - | nothing |
| 19 | components/NumberField.jsx:68-73 | R | a number field has the caret | `preventDefault`; `setEditing(false)`; `setText(shown)`; `blur()`: the blur runs `onBlur={commit}` (68) from the same render, so the TYPED text is committed (table C, cases 1, 10, 11) | - | `preventDefault` only |
| 20 | components/RightPanel.jsx:2142-2146 (UnitNameField) | R | the cabinet's name field | `setDraft(null)`; `blur()`: `onBlur={commit}` (2142) commits the TYPED name (case 2) | - | nothing |
| 21 | components/TopBar.jsx:363-371 | R | the project-name field | `setEditing(false)`; the name was written on every key (`onChange` 368), so it stays as typed (case 17); `onBlur` 369 the same | - | nothing |
| 22 | 3d/Ruler.jsx:154-161 (added 170) | W | Measure is on | points taken: `clear()`; none: `setRuler(false)` ("Escape clears, then closes", CanvasToolbar.jsx:275) | no | nothing |
| 23 | 3d/IslandPlan.jsx:84-87 | R | an island-plan field | revert the draft, `blur()` | - | nothing |
| 24 | 3d/IslandPlan.jsx:173-178 | W | the island plan is open | `closePlan()` | no | nothing |
| 25 | 3d/SpacingChain.jsx:458-462 | R | a spacing figure being typed | `setEditing(null)`, `setDraft('')` | - | `preventDefault` only |
| 26 | components/NewProjectFlow.jsx:249 | via 2 (`onEscape`) | the new-project flow (start screen, not the editor) | a step back, or cancel | defaultPrevented read (2) | - |

Keydown listeners that do NOT act on Escape, listed so nobody looks for them: UnitSizeModal.jsx:92-97 (Enter
closes the size window), Modal.jsx:210-227 (Tab keeps focus in a workspace window), 3d/frameDemand.jsx:114 (any
key wakes the render loop), ConfiguratorPage.jsx:318-319 (any key resets the dimensions' sleep clock, capture).
The BOM panel (BomPanel.jsx) and the Check panel (CheckPanel.jsx) have no key at all: Escape does not close them
today, and nothing in F7 gives them one (nothing invented).

Picks with NO key of their own: the cut-corner and cut-edge picks (`notchPick`, `edgeNotchPick`) end by their own
button, by the notch window's close (RightPanel.jsx 2508, 2600: `closeModal` + `stopNotchPick` /
`stopEdgeNotchPick`) or when NotchRow unmounts (RightPanel.jsx 2357-2358: the cabinet deselected, the
Construction section folded), so Escape ends them only through listener 1's `clearSelection`. Center between also
ends on a click elsewhere (3d/UnitView.jsx:3139) and in the store (projectStore.js:12292).

The retail copies (src/retail/**, never mounted by the PRO entry, not edited): room/Modal.jsx:191-196,
room/RoomModal.jsx:549, 563, 1011, room/DrawRoomModal.jsx:215, room/NumberField.jsx:72,
detail/ElementProperties.jsx:75, detail/PartDetailModal.jsx:515, 526, 1787, detail/ContextEdits.jsx:254,
keys.js:94, controls.jsx:231, ui/ComingSoon.jsx:95.

## B. The order one Escape travels today

1. `window` capture listeners, in the order they were added: 10 (Center between), 11 (cabinet editor piece), 12
   (part window), 7 (library flyout). Any of them that acts stops the event: nothing below runs.
2. `document` capture: 17 (material picker), which stops it.
3. The target's React handler (bubbling to the root): 8, 13, 15, 16, 18, 19, 20, 21, 23, 25. Only 13 and 16 stop
   it; every other one lets it go on to step 4.
4. `window` bubble listeners, in the order they were added, ALL of them: 4 (menu), 5 (right-click menu), 6
   (library), 9 (Changes), 14 (room pick), 22 (ruler), 24 (island plan), 2 (each open window), 1 (the page).
   None stops the event and none reads another's work, so every active one acts on the same press. Their order is
   not fixed: listener 1 is removed and added again after every selection or units change, so it moves to the end;
   a window's listener is added again whenever its `close` changes (an inline `onClose` is a new function every
   render).

So today the one rule that holds is listener 1's own: part first, then cabinet, one level per press (case 9). Every
surface ABOVE the selection answers the key AND lets listener 1 clear the selection under it.

## C. Measured: what one Escape does today (real keys, the built app)

| Case | Before the key | After ONE Escape | Things done |
| - | - | - | - |
| 1 | Width (NumberField, right panel) typed 920, not entered | width 920 APPLIED, caret gone, cabinet still selected | 1 (but the wrong one: the edit is committed, not abandoned) |
| 2 | cabinet name field typed "XX" | name "XX" APPLIED | 1 (the wrong one) |
| 3 | File menu open, cabinet selected | menu shut AND cabinet deselected | 2 |
| 4 | Room setup window open (from the menu), cabinet selected | window shut AND cabinet deselected | 2 |
| 5 | Library open, cabinet selected | Library shut AND cabinet deselected | 2 |
| 6 | Measure on (no point), cabinet selected | Measure off AND cabinet deselected | 2 |
| 7 | door window open on leaf 01-FL (docked left), the leaf selected | window stays; leaf deselected; cabinet still selected | 1 |
| 7b | the same, a second Escape | window STILL stands; cabinet deselected (the window outlives every selection) | 1 |
| 9 | a shelf selected, nothing open | shelf deselected, cabinet kept; the next Escape: cabinet deselected | 1 per press |
| 10 | shelf window (element, Escape-closable), its position field typed 300 | position APPLIED (376 became 318) AND the window shut | 2 |
| 11 | size window (unit-size), Width typed 700 | width 700 APPLIED AND the window shut | 2 |
| 12 | Center between armed on the shelf | picking ended; shelf and cabinet kept | 1 |
| 13 | right-click menu open, cabinet selected | menu shut AND cabinet deselected | 2 |
| 14 | Changes list open, cabinet selected | list shut AND cabinet deselected | 2 |
| 15 | Library with a group flyout open, cabinet selected | flyout shut only | 1 |
| 15b | the same, a second Escape | Library shut AND cabinet deselected | 2 |
| 17 | project name typed "Renamed" | edit ended, the name stays "Renamed" | 1 |

(Case 16, a cut-corner pick, did not apply to a BUD: NotchRow is offered only where `notchApplies(type)`; the
source reading above stands for the types that have it.)

## D. ONE ESCAPE, TWO THINGS today (file:line of each half)

| # | Situation | First thing | Second thing | Proof |
| - | - | - | - | - |
| 1 | a top menu open | MenuBar.jsx:22 shuts it | ConfiguratorPage.jsx:219-222 clears the part or the cabinet (the target is the menu's BUTTON, not excluded at 206) | case 3 |
| 2 | any Escape-closable window open, the caret not in a field | Modal.jsx:192 closes it (or goes back one level, `onBack`) | ConfiguratorPage.jsx:219-222 clears the selection under it | case 4 |
| 3 | the Library open | LibraryPanel.jsx:103 | ConfiguratorPage.jsx:219-222 | cases 5, 15b |
| 4 | the right-click menu open | ContextMenu.jsx:254 | ConfiguratorPage.jsx:219-222 | case 13 |
| 5 | the Changes list open | Messages.jsx:133 | ConfiguratorPage.jsx:219-222 | case 14 |
| 6 | Measure on | Ruler.jsx:155-161 | ConfiguratorPage.jsx:219-222 | case 6 |
| 7 | the island plan open | IslandPlan.jsx:175 | ConfiguratorPage.jsx:219-222 | source |
| 8 | the part window open, nothing armed in it | Modal.jsx:192 `onBack` (PartDetailModal.jsx:660) | ConfiguratorPage.jsx:219-222 (12 lets the key through) | source |
| 9 | a number field inside an Escape-closable window (size, shelf, any piece but a door) | NumberField.jsx:72 commits the typed value | Modal.jsx:192 closes the window (no `onEscape`, so `defaultPrevented` is not read) | cases 10, 11 |
| 10 | a number field in the right panel while a sticky window stands (Lighting) | NumberField.jsx:72 commits | Modal.jsx:192 closes the Lighting window | source |
| 11 | renaming a saved set in the Library | LibraryPanel.jsx:555 ends the rename | LibraryPanel.jsx:103 shuts the Library | source |
| 12 | an island-plan field | IslandPlan.jsx:86 reverts the field | IslandPlan.jsx:175 shuts the plan | source |
| 13 | renaming a stock row | WarehouseModal.jsx:402 | Modal.jsx:192 shuts the warehouse | source |
| 14 | an island field, or a picked box side, in Room setup | RoomModal.jsx:1011 / 563 | Modal.jsx:192 shuts Room setup (`preventDefault` is not read) | source |
| 15 | a spacing figure being typed, a window open | SpacingChain.jsx:461 | Modal.jsx:192 shuts the window | source |
| 16 | the corners or edges lit for a cut | ConfiguratorPage.jsx:221 clears the cabinet | the pick ends with NotchRow's unmount (RightPanel.jsx:2357-2358) | source |

Two faults that are not "two things" but stand in the way of F5 and F7, both measured: NumberField's Escape
COMMITS the typed value (NumberField.jsx:72 blurs, `onBlur={commit}` at 68 reads the typed text), and
UnitNameField's Escape commits the typed name (RightPanel.jsx:2145, `onBlur={commit}` at 2142). lib/numberField.js:11
says "Escape restores the stored value and abandons the edit": the component does not do what its law says.
NumberField.jsx is FROZEN 4 ("not edited: the refused field (F5) is a wrapper round it"), so the wrapper must keep
the law itself (section F).

## E. THE ORDER F7 MUST KEEP (CLAUDE.md PART P (b) and PART E; the designer's "Escape and shortcuts")

One key event, one action, the first level that is active owns it; a level that acted ends the event for every
level under it. Never unpin.

| Level | What owns Escape there | The state the shell reads to know it is active | Who acts |
| - | - | - | - |
| 1 | A focused edit or a local operation: a field with the caret (NumberField, RefusedField, the cabinet name, the project name, a rename, a typed number), Center between, the cabinet editor's piece, the part window's armed tools, a picked room side | `e.target` is INPUT / TEXTAREA / SELECT or contenteditable; `centreBetween`; A 10, 11, 12 (capture) and A 13, 16 (at the field) stop the event themselves | the field or the tool's own handler (A 8, 10-21, 23, 25) |
| 2 | The topmost submenu or popup: a menu-bar dropdown, the right-click menu, a library flyout, the material picker, the Changes list, the Studio popups (rail Add / Materials, View menu) | `nav[aria-label="Main menu"] [role="menu"]` in the DOM (MenuBar keeps `open` in its own state); `contextMenu`; `[data-library-flyout]`; `historyOpen`; the Studio popup's own state | A 4, 5, 7, 9, 17; the Studio popup closes itself |
| 3 | A closable window: the topmost Modal whose Escape is on (`escapeCloses` true, or `onBack` / `onEscape`), the Library panel, the island plan | `modal` (and the window registry, lib/modalStack.js) except a door's `element` window (escapeCloses false); `libraryCategory`; `islandPlan` | A 2, 6, 24. The door window is SKIPPED: it never closes on Escape, in 'beside' and in 'dock-left' alike (CLAUDE.md LAWS 4) |
| 4 | A scene operation: Measure (points taken: clear them; none: Measure off, two presses as today), the corner / edge pick lit | `rulerOn`, `rulerPoints.length`; `notchPick`, `edgeNotchPick` | 22; the pick: `stopNotchPick` / `stopEdgeNotchPick` (today it has no key) |
| 5 | The part selection | `selectedElement` | `clearElement()` |
| 6 | The cabinet selection | `selectedUnitId` | `clearSelection()`; Pin stays pinned (`inspectorPinned` is never written by Escape) |

How the shell gets there without editing a frozen file (INT's contract: under Studio the page's Escape branch, A 1,
is OFF and `lib/studioEscape.js` owns levels 4 to 6): it decides in the `window` CAPTURE phase, from the state as it
stands at the press, before any owner has acted, and it does NOTHING when a level 1 to 3 is active, because that
level's own listener acts on the same press (A 2, 4, 5, 6, 9, 24 are bubble listeners that neither stop nor read
each other). Deciding in the bubble phase would not hold: zustand's `set` is synchronous, so a shell running after
ContextMenu.jsx:254 or LibraryPanel.jsx:103 would already read `contextMenu` / `libraryCategory` as null and clear
the selection as well. A capture listener of its own still runs when A 7, 10 or 11 stopped the event (they stop
propagation, not the other listeners on `window`), so it reads `centreBetween`, `[data-library-flyout]` and `modal`
like everything else; A 12 uses `stopImmediatePropagation`, which can keep it from running, and then the part
window is open (level 3) and the shell would do nothing anyway. That alone removes D 1 to 8 and 16 under Studio.
D 9 to 15 are between two legacy owners (a field inside a window, Modal.jsx, RoomModal.jsx, WarehouseModal.jsx,
IslandPlan.jsx, SpacingChain.jsx, LibraryPanel.jsx): Modal.jsx and RoomModal.jsx are retail copies (FROZEN 4), so
they stay as they are tonight and are named in the PR; the shell must not add a third action to them.

## F. Notes for the slices

- S4 (RefusedField, F5): "Escape restores the last applied one" cannot come from NumberField (case 1: its Escape
  commits). The wrapper must take Escape before NumberField does (React `onKeyDownCapture` on the wrapper): mark
  the press, restore the last applied value and the field's text, and IGNORE the `onCommit` that NumberField's own
  blur then sends; stop the event there so no window listener sees it. A refused value never reaches
  `updateUnitParams`, so it never enters the history.
- S6 (studioEscape, F7): one listener on `window` in the CAPTURE phase that decides from the state at the press
  as in E (levels 1 to 3 active: do nothing; else level 4, then 5, then 6, one per press); it stops nothing it did
  not act on; never call `toggleInspectorPin`; do not touch `escapeCloses`, `onBack`, `onEscape` of any window.
  The door window's conduct comes from `profile.ui.studio.doorWindow` ('beside' or 'dock-left') and in both the
  window keeps `escapeCloses: false` and `sticky` (DoorModal.jsx 175-177).
- S1 (top bar, F2): the project-name field ends its edit on Enter, Escape and blur and keeps the typed name
  (TopBar.jsx 368-370): that is level 1, before anything global (the designer: "Escape ends text edit before
  global selection handling").
- S3 (inspector, F4): the pending valid edit committed to its ORIGINAL unit before a switch is the field's own
  blur (A 19 commits on blur); an invalid one (RefusedField) blocks the switch, and Escape cancels it (level 1).

