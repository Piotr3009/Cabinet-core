# DoorModal inventory for Studio (Cabinet Core PRO, main 9a441f13, 27.10.2026)

Dla Astry: pelny spis tego, co dzis jest w oknie drzwi, z kodu src/components/DoorModal.jsx (996 linii),
src/components/ElementProperties.jsx (wiersze dla drzwi) i src/engine/elements.js (FIELDS.door).
Kazda kontrolka ma swoj setter w store; Studio zmienia uklad i wyglad, nie settery.
English labels are the app's own; keep them unless Piotr renames one.

## 0. Identity and conduct (what the window IS)

| Item | Today | Source |
| - | - | - |
| Modal kind | one kind `element` for EVERY piece (door, drawer front, shelf, partition, end panel, infill, plinth, free panel...). The door is the case with more in it, not a different window. | DoorModal.jsx 29-66 |
| Open paths | double-click the leaf in 3D; double-click a hinge (same window, scrolled to Hinges, that row ringed, `args.section = 'hinges'`, `args.hingeIndex`); from the right panel; Split field re-points the window at the new TOP segment | 97-108, 297-304 |
| Title | `B07 · Door · left` (unit number, "Door", hinge hand) ; other pieces `B07 · Shelf` | 153-155 |
| Width | 340 px (`w-[340px]`) | 178 |
| DOOR EXCEPTION (T37, owner 17.08.2026) | `dock = 'left'` (stands at the left screen edge, same place every time), `sticky` (a click in the scene reaches the scene, the window does not close), `escapeCloses = false` (only the x closes it). Owner's words: "niech sie ustawi po lewej stronie ekranu calkowicie, i niech sie nie wylacza za kazdym razem jak klikne, dopiero krzyzykiem" | 158-177 |
| Every other piece | beside the clicked object, draggable, Escape closes (rule 15, permanent) | 171-174 |
| Follows the clicked leaf | with the door window open, clicking ANOTHER leaf swaps the subject (title, hinges, split) and keeps the window where it stands; clicking a shelf does nothing to it | 110-141 |
| Footer note | "The same fields are in the right-hand panel, which is already showing this piece." | 270-272 |
| Test hooks | `data-door-modal`, `data-door-modal-sections="B,A"`, `data-door-section`, `data-hinge-*`, `data-split-*`, `data-handle-*`, `data-door-mirror`, `data-remove-door`, `data-front-dimensions`, `data-piece-weight`. Keep them: 40+ tests read them. | whole file |

## 1. Sections, in today's order (top to bottom)

### 1.1 SPLIT DOOR (door only, first thing in the window, full width; owner: "widoczne bardzo")
| Control | Type | Value | Action | Notes |
| - | - | - | - | - |
| Top segment | NumberField, mm, min 0 | `panel.meta.splitTopMm` or `splitTopFor(unit, bay)` or 0 | `setSplitTop(unit.id, mm)` for a leaf across the face; `setBaySplitTop(unit.id, bay, mm)` for a leaf in a bay | 0 = one door. Typing 600 re-cuts the leaf into `DOOR-1-T` and `DOOR-1-B`; the window re-points itself at the TOP segment. A number leaving a segment under 100 mm is refused by the kit and said in a toast. |
| Caption | text | "Every leaf across this face." or "Bay N only, the other bays keep their own answer." + the fix-shelf sentence | none | |

### 1.2 SPLIT SEGMENT TABS (only when the leaf is split)
| Control | Type | Action |
| - | - | - |
| `Top · 600` / `Bottom · 1200` | two buttons, the open one marked gold, `aria-pressed` | `openModal('element', { panelId: segment })` at the same anchor (the sibling opens where this one stands) |

### 1.3 HINGES (door only; the section a hinge double-click scrolls to)
| Control | Type | Value | Action | Notes |
| - | - | - | - | - |
| This door | read-only line | `110° · CLIP top · nickel · 71B3550 , from the front (18 mm) and what is behind this door` or `assigned by hand...` ; or "No hinge catalogue has been read..." | none | engine `resolveDoorHinge` (the BOM's own answer) |
| Assign other hinge | select | `Follow the rule (110°)` + every catalogue family from `hingeChoices()` (whatever the finish) | `assignDoorHinge(unit.id, panel.id, family or null)` + toast | THIS DOOR only; the other leaf keeps its own; the BOM buys both; drilling does not change |
| Hinges · N (· top leaf) | label + conditional `Reset` button | rows from `hingeRowsOf(unit.id, panel.id)` | `resetHinges(unit.id, splitLeaf ? panel.id : null)` | Reset shows only when the cabinet (or the split leaf) has its own rows |
| Row (TOP FIRST) | number, `↑` (+5), `↓` (-5), NumberField mm, `−` | mm above the carcass floor | `setHingePos(unit.id, index, mm, leaf?)`, `removeHinge(unit.id, index, leaf?)`; every result goes through `sayHingeResult` (toast with the clamp's words) | stride `profile.editor.hingeNudgeMm = 5`; a row cannot pass the hinge above or below it; the ringed row = the hinge double-clicked |
| + Add a hinge | full-width button | | `addHinge(unit.id, leaf?)` | "in the biggest gap in the run" |
| Caption | text | "The ROWS are the cabinet's, both leaves, drilled as a set. Editing them turns the project standard off for this cabinet; Reset hands it back." | | |

### 1.4 SECTION A: the piece (ElementProperties, compact, `omit=['hinges']`), FIELDS.door = hinge-side, door-extend, front-board, material
| Field | Type | Value | Action | Guard |
| - | - | - | - | - |
| Hinge side | select Left / Right | `unit.params.hinge` (or forced) | `updateUnitParams(unit.id, { hinge })` | on a sloped (cut) door the side is FORCED and the select says why (`hingeForced`) |
| Door extend | checkbox + NumberField mm | `doorExtendMm(unit.params, profile)` or `profile.wallUnit.doorExtend` | `updateUnitParams(unit.id, { door_extend })` | only when `type.doorExtend` (handleless grab edge below the carcass, wall units) |
| Front board | select of thicknesses (`N mm`) | `unit.params.front_t` | `updateUnitParams(unit.id, { front_t })` | the project's front board ladder |
| Material | select `Project default` + the project's palette (boards and fronts), with a swatch | `panel.meta.material_key` | `setElementMaterial` (an item) or `setElementOverride(unit.id, panel.id, patch)` | THIS piece only |

### 1.5 HANDLE (fronts with a handle class; owner's law in engine/handles.js decides WHERE, the person edits the OFFSET)
| Control | Type | Value | Action | Notes |
| - | - | - | - | - |
| `own` badge | small gold chip | `panel.meta.handle.deviation` | none | this front does not follow the project |
| Add bar / Add knob / Add J-pull handleless | buttons (only when no handle yet) | HANDLE_TYPES: bar ("A round bar on two posts"), knob ("One screw, one hole"), jpull ("Machined into the front's own edge") | `setProjectHandle({type, centres})` when Apply to all, else `setFrontHandle(unit.id, panel.id, {...})` | |
| Type chips | Bar / Knob / J-pull, current gold | | same as add | |
| Remove | button | | `setProjectHandle(null); setFrontHandle(unit.id, panel.id, null)` | |
| Centres (bar only) | chips 96 / 128 / 160 / 192 / 224 + NumberField 16..1200 | `profile.handles.barCentres`, default 128 | `add({ centres })` | |
| Position line | read-only | `35 × 60 from the bottom-left · rule words · problem` (`handleFitProblem` when the handle is driven off its own front) | none | the conflict is printed whether anyone presses or not |
| Move | chips x-10 / x+10 / y-10 / y+10 | | `moveHandleClass(class, offset)` when Apply to all (toast counts the fronts moved, "Ctrl+Z puts them back"); else `setFrontHandle` on this front (toast: differs from the others) | x is measured from THIS door's own handle edge, so a pair mirrors |
| Apply to all <class>s in the project | checkbox, default ON | local state | | the T30 nag (window.confirm) is gone: moves apply directly, one undo step |

### 1.6 MIRROR (door only)
| Control | Type | Action | Notes |
| - | - | - | - |
| None / Inside / Outside | three chips, current gold | `setDoorMirror(unit.id, panel.id, face)` + toast | bonded, never drilled; BOM orders the glass at the front minus 20 mm a side (profile number, owner to confirm) |

### 1.7 SHOW FRONT DIMENSIONS (any front)
| Control | Type | Action | Notes |
| - | - | - | - |
| Show front dimensions | checkbox | `toggleFrontDimensions()` (uiStore) | PROJECT-WIDE (the same toggle as View menu); the label says so |

### 1.8 REMOVE DOOR (door only, red text, bottom of section A)
| Control | Action | Notes |
| - | - | - |
| Remove door | `removeFront(unit.id, panel.id)` then close | no confirmation, Undo covers it; the hinge holes leave with the door |

### 1.9 DELETE (every piece EXCEPT a door, which has Remove door)
| Control | Action | Notes |
| - | - | - |
| `Delete <label>, no undo` or "Cannot be deleted. <reason>" | `deleteSelectedElement({ unitId, elementRef })` (the same action the Delete key runs) | `deletePlan` says whether and why; a drawer stack decrements one per press and the window stays on the next drawer |

### 1.10 WEIGHT (every piece, footer)
| Line | Source |
| - | - |
| `Weight 4.21 kg, 597 × 715 at 9.8 kg/m2, from the assigned board.` or `...from the workshop's MFC table, nearest thickness, no board assigned yet.` | `panelWeight` (the AVENTOS lift is chosen on this number) |

## 2. What the window does NOT do (so Studio does not invent it)
- It does not set the cabinet's door COUNT or leaf layout (that is the cabinet: `addDoors`, `setDoors`, `leafCountRefusal`, right panel section "doors").
- It does not move the door (`ACTIONS.door.move = false`: "A door hangs on its hinges, the hinge side is a door property").
- It does not pick decoration (shaker / beading): that is the fronts of the project (design) and the right panel's front rows.
- Appliance fronts are not doors: no hinges, no mirror, no remove (`panel.meta.appliance`).

## 3. Toasts the window raises (today's words, keep the meaning)
- Split: `DOOR-1: split at 600 mm, a fix shelf goes on the line, full depth.` / `DOOR-1: one door` / `...that number leaves a segment under 100 mm, so it was refused`.
- Hinge assign: `DOOR-1: CLIP top 155° assigned, this door only.` / `DOOR-1: back on the rule.`
- Hinge move/add/remove: the clamp's own sentence through `sayHingeResult` (ok / warn).
- Handle: `Handle moved on 14 fronts (2 with a handle of their own did not move), Ctrl+Z puts them back.` / `Handle moved on this front only...`
- Mirror: `DOOR-1: mirror on the inside face, ordered to the front, bonded, nothing drilled.` / `DOOR-1: mirror off.`

## 4. Numbers in profile.js the window reads
`editor.hingeNudgeMm` 5; `handles.barCentres` [96, 128, 160, 192, 224]; `handles.defaultCentres` 128; `wallUnit.doorExtend`; the hinge catalogue (reference/hardware); mirror margin 20 a side (owner to confirm since 15.08.2026).

## 5. Open decision for Piotr (Astra asked)
The door exception (dock left, sticky, Escape off) was the owner's own order on 17.08.2026 after the window "wlacza i wylacza sie jak pojebane". Studio variant "beside the part" must keep: the window survives clicks in the scene (sticky), it follows the clicked leaf, and it never stands over the door it is about. Whether Escape may close it again is Piotr's call.
