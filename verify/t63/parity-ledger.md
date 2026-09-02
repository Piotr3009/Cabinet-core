# T63 F6 · THE PARITY LEDGER — WHAT PRO HAS, IN LINES OF CODE

The owner: *"sprawdź jakie jeszcze funkcje pominąłeś i je dodaj, a później
będziemy ustawiać jak je rozmieścić."*

Written by `scripts/t63-parity-ledger.mjs` FROM THE CODE: every file under
`src/components/`, its line count tonight, whether a file of the same name
stands under `src/retail/design/**` as a COPY (`scripts/t63-copies.mjs`, plus
T62's four), and one verdict. The WORKSHOP verdicts and every purpose line
are read from `verify/t60/parity-map.md`, where each was argued file by file;
a file that map does not know is OWED until somebody argues otherwise.

This ledger replaces the T60 map as the map: that one counted surfaces, this
one counts code.

## THE HEADLINE COUNTS

| | files | PRO lines |
|---|---|---|
| `src/components/**`, in total | **62** | **27406** |
| COPIED into retail (T62 + T63) | **25** | **8907** |
| WORKSHOP — never for a client | **26** | **10917** |
| OWED — a client surface still missing | **11** | **7582** |

Of the client-facing code (COPIED + OWED = 16489 lines), **54 %** is across tonight.

## 1 · OWED — biggest gap first

A client surface with no copy in retail. The biggest is at the top, so the
owner reads the largest gap first.

| PRO file | lines | what it does (T60 map) |
|---|---|---|
| `WizardSettings.jsx` | 2646 | The whole project's settings in five tabs — identity and saved sets, dimensions and ceiling fit, 1–3 carcass types with their sources, 1–3 front types with… |
| `RightPanel.jsx` | 1546 | The joiner's whole cabinet in one folding column: carcass size/position/rotation/finish, Add items, the section's drawers-shelves-partitions-rails with per-row fields,… |
| `CabinetEditorModal.jsx` | 956 | One cabinet alone in its own canvas: open all its fronts, EXPLODE the parts apart along their normals, pick a part up and turn it over, and click any part to edit its… |
| `DrawRoomModal.jsx` | 467 | Draws the room as a CAD ortho path — a direction, a typed millimetre, Enter, repeat — with undo, a catch back to the origin, Close, fault reporting, and clicking a… |
| `TopBar.jsx` | 430 | The whole app's command surface; its VIEW submenu is the one part that is a client's — the ten toggles PBI's view bar is a copy of — everything else is the project, the… |
| `WizardSummary.jsx` | 426 | The whole project in miniatures — chosen decor tiles, the dimensions it will be cut at, hardware, and (workshop only) production and LED — each section with a Change…… |
| `CanvasToolbar.jsx` | 354 | Everything that acts on the DRAWING rather than the project: undo/redo, show/hide dimensions, front dimensions, outlines, X-ray, props, hide fronts, measure, open/close… |
| `ContextMenu.jsx` | 334 | Everything the whole cabinet can be told to do at once: rename, rotate, remove, end panels, plinth on/off, top infill, cornice, bottom mask, side infill, redistribute… |
| `RenderModal.jsx` | 212 | Four choices and a button: camera preset, resolution, shadows, and whole scene vs the selected unit — then a PNG captured off the fixed rig and saved under a name the… |
| `Messages.jsx` | 143 | Draws PRO's message queue as red (click-to-dismiss, may carry an action button), yellow (cleared by a pointer-down anywhere else) and grey (centre, on a clock,… |
| `SheenSlider.jsx` | 68 | One project-wide gloss percentage (5–100 % in fives) for SPRAYED and VENEERED surfaces only — a laminate keeps the finish it came with. |

## 2 · COPIED

| PRO file | PRO lines | retail copy | copy lines | why |
|---|---|---|---|---|
| `ElementProperties.jsx` | 1141 | `design/detail/ElementProperties.jsx` | 1141 | F3 · reached by DoorModal (section A, the piece's own fields) |
| `WallElevationModal.jsx` | 1096 | `design/room/WallElevationModal.jsx` | 1096 | T62 F3 · the wall, seen from the front |
| `DoorModal.jsx` | 996 | `design/detail/DoorModal.jsx` | 996 | F3 · every piece's window — the door and its hinges |
| `AddItems.jsx` | 938 | `design/detail/AddItems.jsx` | 938 | F3 · reached by AddItemsModal — THE law for what may be added where |
| `LightingPanel.jsx` | 861 | `design/lighting/LightingPanel.jsx` | 861 | F2 · the lighting panel — brightness, temperature, the five mountings, the depth, the room rig, per-strip… |
| `RoomModal.jsx` | 721 | `design/room/RoomModal.jsx` | 756 | T62 F2 · the room |
| `Modal.jsx` | 468 | `design/room/Modal.jsx` | 468 | T62 · the shell every window wears |
| `DecorPickerModal.jsx` | 393 | `design/material/DecorPickerModal.jsx` | 393 | F4 · the tiled EGGER modal — search, family bar, one click chooses and closes |
| `WatchLayoutModal.jsx` | 246 | `design/detail/WatchLayoutModal.jsx` | 246 | F3 · the watch drawer's four layouts, glass and finish |
| `WizardHardware.jsx` | 225 | `design/material/WizardHardware.jsx` | 225 | F4 · hinge finish, internal metal, soft-close, push-to-open |
| `UnitFinishModal.jsx` | 163 | `design/material/UnitFinishModal.jsx` | 163 | F4 · ONE cabinet's colour — writes the UNIT, never the project |
| `MaterialChoicePanel.jsx` | 160 | `design/material/MaterialChoicePanel.jsx` | 160 | F4 · the slot that reads the source→picker law |
| `FrontGapModal.jsx` | 153 | `design/detail/FrontGapModal.jsx` | 153 | F3 · the front-gap repair, two options each with its number |
| `RailModal.jsx` | 148 | `design/detail/RailModal.jsx` | 148 | F3 · the alone rod's own window |
| `DecorPicker.jsx` | 143 | `design/material/DecorPicker.jsx` | 143 | F4 · the in-step decor grid |
| `UnitSizeModal.jsx` | 141 | `design/detail/UnitSizeModal.jsx` | 141 | F3 · width and height, typed |
| `JpullRunModal.jsx` | 124 | `design/detail/JpullRunModal.jsx` | 124 | F3 · the J-pull's one slider |
| `AddItemsModal.jsx` | 119 | `design/detail/AddItemsModal.jsx` | 119 | F3 · the golden + window — the cabinet and what goes inside |
| `ChosenDecorTile.jsx` | 118 | `design/material/ChosenDecorTile.jsx` | 118 | F4 · reached by MaterialChoicePanel — the one chosen tile |
| `FrontStyleGallery.jsx` | 109 | `design/material/FrontStyleGallery.jsx` | 109 | F4 · the door-style gallery |
| `VeneerPicker.jsx` | 109 | `design/material/VeneerPicker.jsx` | 109 | F4 · the timber list |
| `FrontGapWarnings.jsx` | 100 | `design/detail/FrontGapWarnings.jsx` | 100 | F3 · PRO's only door into FrontGapModal — the rows over the canvas |
| `ColourPicker.jsx` | 97 | `design/material/ColourPicker.jsx` | 97 | F4 · RAL / F&B / a typed hex |
| `NumberField.jsx` | 77 | `design/room/NumberField.jsx` | 77 | T62 · the typed millimetre |
| `UnitWarnings.jsx` | 61 | `design/detail/UnitWarnings.jsx` | 61 | F3 · reached by ElementProperties |

## 3 · WORKSHOP — never for a client, with the reason

| PRO file | lines | why the client never sees it (T60 map) |
|---|---|---|
| `PartDetailModal.jsx` | 2090 | Double-click a single panel and get it alone on a drawing board: dimensioned part drawing, the 3-D piece, joinery layers, and a full 2-D CNC editor — seventeen tools,… |
| `SettingsPanel.jsx` | 1867 | One component behind two doors (the top bar and wizard step 5): the project's default heights and dimensions, carcass and front types with their… |
| `CncView.jsx` | 942 | The workshop's visual check before the machine: every selected part laid out flat from the engine's own CNC geometry, coloured by layer, with labels, notes, rollovers… |
| `BomPanel.jsx` | 657 | What the job COSTS, computed live from the current state — every part with the finish it is cut from, material demand per decor, ironmongery with article numbers, the… |
| `NewProjectFlow.jsx` | 553 | Job intake in six steps — number/name/client, project type, scope (one wall by default), the ROOM or WALL ELEVATION editor, project settings, and a summary — creating… |
| `LibraryPanel.jsx` | 510 | A draggable panel showing one library CATEGORY at a time — every unit type with its profile defaults — that inserts a cabinet beside the selection or into the '+' gap… |
| `CncTree.jsx` | 509 | Three tick levels — unit, part group, part — deciding which parts are drawn on the CNC sheet, with quick-selects, the per-part assignment warning, and the three DXF… |
| `WarehouseModal.jsx` | 493 | The workshop's material stock — departments with counts down the left, a photo/code row each, a draggable card per material, CSV in and out, price provenance and… |
| `AssignMaterialsModal.jsx` | 480 | Seven registry part-groups down the left, the parts of the chosen group on the right — name, the stock item it is cut from, its yield, a per-family override, an… |
| `DrawingModal.jsx` | 476 | Previews and exports the paper: a unit card, a front elevation, the whole wall set (fronts sheet, carcass sheet, Section A-A) and the project booklet — the preview IS… |
| `MultiUnitPanel.jsx` | 435 | Bulk editor over several selected cabinets: shared width/height/depth and thickness fields that show "mixed" and write only when typed, plus add-shelves-to-all,… |
| `CompanyDefaultsModal.jsx` | 276 | The workshop's own standing preferences — hinge system, hinge finish, mounting plate, runner variant, kitchen and wardrobe carcass board — read, edited and saved to the… |
| `StartScreen.jsx` | 227 | New project / Recent / All projects — the AutoCAD arrangement that opens a PRO job from this computer or the database, or launches the five-step NewProjectFlow. |
| `MaterialPicker.jsx` | 206 | A searchable, portalled dropdown of the workshop's stock materials — scoped to the part's own material type or 'all' — that flips up when there is more room above and… |
| `MenuBar.jsx` | 174 | PRO's chrome: a data-driven classic menu bar — dividers, submenus, tick columns, 'soon' tags, disabled entries with hints, and range entries rendered as in-menu sliders… |
| `DesignSettingsModal.jsx` | 157 | A frame only: it opens the ONE project-setup surface (WizardSettings) from the top bar and adds `Update and save`, which commits the whole project from wherever the… |
| `CheckPanel.jsx` | 141 | Not toasts but a worklist: every finding the eleven rules produce over the whole job, each row a door that flies the camera to the subject, opens the door in front of… |
| `AuthModal.jsx` | 122 | Sign in or register against Supabase, then save the current project to the cloud and open one from the account's list; with no keys it explains mock mode instead of… |
| `HandEditsModal.jsx` | 114 | When a recompute resizes a board that carries hand-drawn set-outs, it names the stale parts and asks: drop the edits (the part goes back to stock) or put the size back… |
| `SaveSettingsSetModal.jsx` | 113 | Asked once at the end of the settings screen: name this settings set and keep it as the workshop's standard — written to the local shelf first and always, then offered… |
| `SaveTemplateModal.jsx` | 101 | Names a configured unit and files it in the template library — keeping HOW it is built, not where it stands or its unit number — warning when the name replaces an… |
| `ShelfHingeClash.jsx` | 93 | Warns when a shelf row and a hinge cup land at the same height, naming the gap, and offers two openers — Remove sleeves (the shelf's modal) / Move the hinge (the door… |
| `JoineryPreview.jsx` | 82 | Draws the Skylon puzzle joint — tab, dog-bone relief, socket and its two holes — derived live from profile.puzzle, with the four numbers listed beside it. |
| `SaveAsModal.jsx` | 51 | One field: a new name for a COPY of the open project, leaving the original where it is and switching to the copy. |
| `Section.jsx` | 34 | PRO's fold: a clickable header with a badge and a body that is simply not rendered when shut, in a gold frame that brightens on the open one — the whole of the right… |
| `MockModeBadge.jsx` | 14 | A one-line amber badge in PRO's top bar saying the app is running on sample data because no Supabase keys are configured. |

## HOW TO READ A ROW

- **COPIED** — a file of the same name stands under `src/retail/design/**`, made by
  `scripts/t63-copy.mjs` (or T62's hand) with imports repointed and classes
  reskinned; `test/turn63-the-copies.test.js` holds each to every label, hook,
  gesture and imported name of the original. A copy's line count is the
  original's: the method adds nothing and drops nothing.
- **WORKSHOP** — the T60 map argued, file by file, that a home client never
  makes this decision (the cut list, the machine output, the stock, the
  workshop's own account and defaults, the bars that hold PRO's menus).
- **OWED** — everything else. Some of it is a container (`RightPanel`,
  `SettingsPanel`, `WizardSettings`) whose DECISIONS retail already takes
  through the copies and the adapter; the line count is still the honest
  measure of what has not been copied, and that is what this ledger counts.

