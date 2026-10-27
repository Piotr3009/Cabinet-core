# T84 P1 (a) . THE CENSUS of main, re-taken by scripts/t84-census.mjs

Main 9f5020f (= 9a441f13, the code THE CENSUS counted at 22:23, plus CLAUDE.md), counted 27.10.2026 at 23:23 on a
private build: `npx vite build --outDir /tmp/claude-0/t84-p1-dist --emptyOutDir`, served by `npx vite preview
--outDir /tmp/claude-0/t84-p1-dist --port 4184 --strictPort --host 127.0.0.1`, then `node scripts/t84-census.mjs
--port 4184` (62 s, viewport 1440 x 900, build stamp `#1126 . 2026-10-27 23:05 UTC . 9f5020fb`, entry `factory`,
mock data mode). The same run self-contained: `node scripts/t84-census.mjs --build --serve` (dist/, port 4173), or
`--build --serve --out-dir <dir> --port <n>`. Output: `verify/t84/census-main.json` (plain ASCII; any other
character is escaped as \uXXXX, so "New project\u2026" is the source's own label).

RESULT: every count equals THE CENSUS of 22:23, and the owner's own probe output of 22:23
(`verify/t84/census-main-panels.txt`) is reproduced LINE FOR LINE, its `asides:` line included. No count moved on
main since 22:23 (9f5020f adds CLAUDE.md and nothing else). The branch's two flags were run on main as well, into
scratch files, not into verify/: `--legacy` and `--studio` are no-ops there (138 rows EQUAL, exit 0); a tampered
baseline turns RED by name and exits 1 (a leaf path gone, a call moved, a modal kind gone, the context file's hash).

## The census beside CLAUDE.md

| Where | CLAUDE.md 22:23 | main, from source | main, drawn | Equal | How it is counted |
| - | - | - | - | - | - |
| Top menu leaves | 48 | 48 | 48 | yes | File 5, View 13, Library 4, Settings 5, Database 5, Spraying 1, Lighting 1, Output 14; drawn = the same 48 paths, each menu opened by a real click, each submenu by a real hover (rule 1) |
| Scene toolbar | 14 | 14 | 14 | yes | the `<button`s of `CanvasToolbar`, 3D / CNC expanded from their array (rule 3) |
| Header | 7 | 7 | 7 | yes | rule 4; the project-name button and its edit field are one control |
| Right-click on a unit | 22 | 22 rows | - | yes | 25 ids from 20 `actions.push(` sites, read off `menuActions` itself (rule 5): the cornice ladder is ONE row (3 ids), "End panel - both sides" (`end-panel-B`) is in no row |
| Library types | 51 + sets | 51 | - | yes | Kitchen 36 + Wardrobes 15 type slots; 46 distinct types (5 in both); plus Saved sets and Sets |
| Windows (modal kinds) | 26 | 26 | - | yes | rule 6; every one of the 26 has a PRO opener |
| Right panel, visible controls, 13 default units | 649 | - | 649 | yes | the 13 lines below, line for line with 22:23 |
| Panel sources, control tags | 173 | 173 | - | yes | rule 7, comments INCLUDED (171 with comments stripped) |

## The counting rules (the script's own header says the same)

1. A top-menu LEAF is an entry that acts: a dropdown item with no items of its own, a submenu's child, a slider
   item (View > Brightness), and a top-level entry with `run` and no `items` (Spraying, Lighting). A submenu parent
   (View > Dimension colour, Settings > Snap, Output > Drawings) and a divider are not. The dynamic leaves are
   expanded from their data in node: `profile.dimensions.colours` (navy, red), `UNIT_CATEGORIES` (4),
   `profile.editor.snapSteps` (0.5, 1, 32), `DRAWING_KINDS` (6).
2. A leaf's HANDLER is read off its `run`: TopBar's `menus` array literal is cut out of TopBar.jsx (line 128) and
   evaluated with a stand-in for every name it reads, so each `run` is the source's own function; HANDLER is the
   name passed or the first call of the arrow as written, CALL is the call it makes when run. For Output and
   Database the handler is the builder's own prop (`lib/outputMenu.js`, `lib/topMenu.js`), BOUND what TopBar hands
   that prop, PAGE what ConfiguratorPage hands TopBar.
3. A TOOLBAR control is a `<button` inside `function CanvasToolbar`; guard = its `disabled` as written. Drawn = the
   buttons of the bar holding `[data-undo="1"]` and `[data-open-all-doors="1"]`.
4. A HEADER control is TopBar's own outside the MenuBar, read in every `return (` of `function TopBar` and
   deduplicated by handler (F2's `variant="studio"` cannot double it). Drawn = the header's controls outside
   `nav[aria-label="Main menu"]`, plus the MockModeBadge.
5. The CONTEXT actions are `menuActions` run in node over all 46 UNIT_TYPES, with no part, a FRONT and a
   DRAWER-FRONT under the pointer, with and without a drawer number. The 22 rows of THE CENSUS are checked id by id.
6. A WINDOW KIND is a distinct literal in `openModal('x'` or `pushModal('x'` anywhere in src (new lines allowed
   after the parenthesis).
7. PANEL SOURCE TAGS: every `<NumberField`, `<select`, `<button`, `<input`, `<textarea` followed by a word boundary
   in the raw file text, comments included: 108 / 49 / 16 = 173. Two of ElementProperties.jsx's seven `<select` are
   inside `//` comments (lines 345 and 771), so with comments stripped the files hold 108 / 47 / 16 = 171.
8. A PANEL count, the owner's rule of 22:23: an empty project (`newProject`), the type's default unit added by the
   store's own action `addUnit(type, { wall: 0, x: 1200 })`, `selectUnit(id)`, `openRightPanel()`,
   `setViewMode('3d')`, `setPanelSection(id, true)` for carcass, add, contents, construction, doors, vanity, mirror;
   counted when two reads 400 ms apart agree. The panel is the `<aside>` holding `[data-unit-name="<id>"]`;
   VISIBLE = its `button, input, select, textarea` with `offsetParent !== null`, minus any under
   `[data-studio-host]` (zero on main); per tag in the order first met in the DOM; `labels=` is the `.cc-label`
   elements (the `<label>` tags are kept apart: 3 on most types, 6 on BUDR, 5 on VANITY2); a section is every
   `section[data-section]` with its `data-open` and its own visible controls, its head's button included.

## What differs from the census, and why

Nothing differs. Six readings are written down so nobody argues with them later:

| Reading | Main | Why |
| - | - | - |
| Right-click "22" | 22 rows = 25 ids | THE CENSUS counts the cornice ladder (cornice-0 / -70 / -100, `profile.autoParts.cornice.heights`) as one row and does not name `end-panel-B` ("End panel - both sides"); the file's sha256 is the gate (FROZEN 6), not the 22 |
| Library "51" | 51 type slots, 46 distinct types | HAWA_POCKET, VANITY2, VANITY3, VANITY4 and MIRROR_CABINET stand in Kitchen AND Wardrobes (the Bathroom group is in both, T82 F9) |
| "173" | raw text, comments included | 2 of the 49 in ElementProperties.jsx are `<select` written inside comments; the rule that gives 173 counts them |
| `labels=` | `.cc-label` | not `<label>`: the owner's probe counted the house label class |
| CORNER_L_BASE at x 10 | not x 1200 | `addUnit` stands an L only in a room corner (projectStore.js, "T75 F4 . AN L STANDS IN A ROOM CORNER ONLY"); the 52 of 22:23 is the same placement |
| Pocket door, Attach | `data-open` null, above Carcass | they are plain `<section data-section>` blocks (RightPanel.jsx 1863, 1938), not `Section` components; they are always open |

On every one of the thirteen types the panel's controls are its sections' plus exactly three outside them: the
name field (`UnitNameField`), the header's x ("Close panel", `closeRightPanel`) and "Delete unit". Sections are
never nested. The `vanity` and `mirror` section ids are opened on every type and exist only on VANITY2 and
MIRROR_CABINET.

## For F7 (how INT re-takes it on the branch)

`node scripts/t84-census.mjs --legacy --port <p>` (profile.ui.studio.enabled false, written to
verify/t84/census-legacy.json) and `node scripts/t84-census.mjs --studio --port <p>` (enabled true, then
`ui.showFullSettings()` after every selectUnit; verify/t84/census-studio.json). Both compare with
census-main.json: a PANEL row (13 totals, their sections, 649) must be EQUAL; any other count must be the same or
larger; the context file's and ContextMenu.jsx's sha256 must be equal; a menu path, a toolbar or header handler, a
context id, a window kind or a library type that main had and the branch has not is RED by name, and so is a leaf
whose call moved. Under `--studio` the drawn toolbar and header are printed, not gated (CanvasToolbar is not
rendered under Studio, F6; the top bar is re-homed, F2): their homes are F7's parity table. What the branch must
keep for the census to find the panel: the embedded RightPanel's root stays an `<aside>`, the name field keeps
`data-unit-name`, the sections keep `data-section` / `data-open`, and every control a HOST adds inside the aside
(Pin, Back to quick settings) carries `data-studio-host`. Do not drop the header's x in the embedded layout: it is
one of the 649 (rebind it, p1-host.md).

<!-- GENERATED PART: rows read from verify/t84/census-main.json -->
### The thirteen panels in the owner's line format (verify/t84/census-main-panels.txt, 22:23)

```
BUD              sel=true visible=53 {"input:text":6,"button":40,"select":6,"input:checkbox":1} labels=11 sections=Carcass:1:18|Add items:1:17|Section 1:1:1|Construction:1:12|Doors:1:2
BUDR             sel=true visible=39 {"input:text":9,"button":20,"select":6,"input:checkbox":4} labels=11 sections=Carcass:1:16|Section 1:1:7|Construction:1:12|Doors:1:1
WUD              sel=true visible=58 {"input:text":7,"button":44,"select":6,"input:checkbox":1} labels=12 sections=Carcass:1:19|Add items:1:17|Section 1:1:1|Construction:1:16|Doors:1:2
WARDROBE         sel=true visible=53 {"input:text":6,"button":40,"select":6,"input:checkbox":1} labels=11 sections=Carcass:1:18|Add items:1:13|Section 1:1:1|Construction:1:16|Doors:1:2
VANITY2          sel=true visible=50 {"input:text":9,"button":32,"select":6,"input:checkbox":3} labels=11 sections=Carcass:1:15|Vanity:1:9|Section 1:1:8|Construction:1:14|Doors:1:1
MIRROR_CABINET   sel=true visible=62 {"input:text":14,"button":41,"select":6,"input:checkbox":1} labels=13 sections=Carcass:1:16|Mirror cabinet:1:29|Section 1:1:1|Construction:1:12|Doors:1:1
CORNER_L_BASE    sel=true visible=52 {"input:text":6,"button":39,"select":6,"input:checkbox":1} labels=11 sections=Carcass:1:16|Add items:1:17|Section 1:1:1|Construction:1:13|Doors:1:2
HAWA_POCKET      sel=true visible=45 {"input:text":6,"button":32,"select":6,"input:checkbox":1} labels=12 sections=Pocket door:null:9|Carcass:1:16|Section 1:1:1|Construction:1:15|Doors:1:1
BLIND_BASE       sel=true visible=53 {"input:text":6,"button":40,"select":6,"input:checkbox":1} labels=11 sections=Carcass:1:18|Add items:1:17|Section 1:1:1|Construction:1:12|Doors:1:2
PANTRY           sel=true visible=57 {"input:text":6,"button":44,"select":6,"input:checkbox":1} labels=11 sections=Carcass:1:18|Add items:1:17|Section 1:1:1|Construction:1:16|Doors:1:2
BUD_INT          sel=true visible=53 {"input:text":6,"button":40,"select":6,"input:checkbox":1} labels=11 sections=Carcass:1:18|Add items:1:17|Section 1:1:1|Construction:1:12|Doors:1:2
WUD_HOOD         sel=true visible=39 {"input:text":7,"button":25,"select":6,"input:checkbox":1} labels=12 sections=Carcass:1:17|Section 1:1:1|Construction:1:16|Doors:1:2
FREE_PANEL       sel=true visible=35 {"input:text":8,"button":19,"select":7,"input:checkbox":1} labels=14 sections=Attach:null:2|Carcass:1:16|Section 1:1:1|Construction:1:12|Doors:1:1
  asides: [{"cls":"absolute right-0 top-0 bottom-0 w-[310px] cc-panel rounded-n","labels":11,"ctrls":53}]
```

| Type | unit | wall, x | panel px | visible | per tag | labels (.cc-label) | label tags | sections (title, data-open, controls) | outside the sections |
| - | - | - | - | - | - | - | - | - | - |
| BUD | 01 | 0, 1200 | 310 | 53 | input:text 6, button 40, select 6, input:checkbox 1 | 11 | 3 | Carcass 1 18; Add items 1 17; Section 1 1 1; Construction 1 12; Doors 1 2 | 3: name field, Close panel, Delete unit |
| BUDR | DR01 | 0, 1200 | 310 | 39 | input:text 9, button 20, select 6, input:checkbox 4 | 11 | 6 | Carcass 1 16; Section 1 1 7; Construction 1 12; Doors 1 1 | 3: name field, Close panel, Delete unit |
| WUD | WU01 | 0, 1200 | 310 | 58 | input:text 7, button 44, select 6, input:checkbox 1 | 12 | 3 | Carcass 1 19; Add items 1 17; Section 1 1 1; Construction 1 16; Doors 1 2 | 3: name field, Close panel, Delete unit |
| WARDROBE | W01 | 0, 1200 | 310 | 53 | input:text 6, button 40, select 6, input:checkbox 1 | 11 | 3 | Carcass 1 18; Add items 1 13; Section 1 1 1; Construction 1 16; Doors 1 2 | 3: name field, Close panel, Delete unit |
| VANITY2 | VU01 | 0, 1200 | 310 | 50 | input:text 9, button 32, select 6, input:checkbox 3 | 11 | 5 | Carcass 1 15; Vanity 1 9; Section 1 1 8; Construction 1 14; Doors 1 1 | 3: name field, Close panel, Delete unit |
| MIRROR_CABINET | MC01 | 0, 1200 | 310 | 62 | input:text 14, button 41, select 6, input:checkbox 1 | 13 | 3 | Carcass 1 16; Mirror cabinet 1 29; Section 1 1 1; Construction 1 12; Doors 1 1 | 3: name field, Close panel, Delete unit |
| CORNER_L_BASE | CL01 | 0, 10 | 310 | 52 | input:text 6, button 39, select 6, input:checkbox 1 | 11 | 3 | Carcass 1 16; Add items 1 17; Section 1 1 1; Construction 1 13; Doors 1 2 | 3: name field, Close panel, Delete unit |
| HAWA_POCKET | HP01 | 0, 1200 | 310 | 45 | input:text 6, button 32, select 6, input:checkbox 1 | 12 | 3 | Pocket door null 9; Carcass 1 16; Section 1 1 1; Construction 1 15; Doors 1 1 | 3: name field, Close panel, Delete unit |
| BLIND_BASE | BB01 | 0, 1200 | 310 | 53 | input:text 6, button 40, select 6, input:checkbox 1 | 11 | 3 | Carcass 1 18; Add items 1 17; Section 1 1 1; Construction 1 12; Doors 1 2 | 3: name field, Close panel, Delete unit |
| PANTRY | PY01 | 0, 1200 | 310 | 57 | input:text 6, button 44, select 6, input:checkbox 1 | 11 | 3 | Carcass 1 18; Add items 1 17; Section 1 1 1; Construction 1 16; Doors 1 2 | 3: name field, Close panel, Delete unit |
| BUD_INT | BI01 | 0, 1200 | 310 | 53 | input:text 6, button 40, select 6, input:checkbox 1 | 11 | 3 | Carcass 1 18; Add items 1 17; Section 1 1 1; Construction 1 12; Doors 1 2 | 3: name field, Close panel, Delete unit |
| WUD_HOOD | HD01 | 0, 1200 | 310 | 39 | input:text 7, button 25, select 6, input:checkbox 1 | 12 | 3 | Carcass 1 17; Section 1 1 1; Construction 1 16; Doors 1 2 | 3: name field, Close panel, Delete unit |
| FREE_PANEL | FP01 | 0, 1200 | 310 | 35 | input:text 8, button 19, select 7, input:checkbox 1 | 14 | 3 | Attach null 2; Carcass 1 16; Section 1 1 1; Construction 1 12; Doors 1 1 | 3: name field, Close panel, Delete unit |
| all | | | | 649 | | | | | |

### The 48 top-menu leaves (source: src/components/TopBar.jsx line 128, `orderMenus` order File / View / Library / Settings / Database / Spraying / Lighting / Output; drawn: 48, the same paths)

| # | Path | Kind | Handler (as written) | Call (as made) | Bound by TopBar | Page (ConfiguratorPage) | Guard (disabled when) | At the census state |
| - | - | - | - | - | - | - | - | - |
| 1 | File > New project... | item | `leaveProject` | `leaveProject` | - | - | - | enabled |
| 2 | File > Open... | item | `leaveProject` | `leaveProject` | - | - | - | enabled |
| 3 | File > Save | item | `save` | `save` | - | - | - | enabled |
| 4 | File > Save as... | item | `openModal('save-as')` | `openModal('save-as')` | - | - | - | enabled |
| 5 | File > Close project | item | `leaveProject` | `leaveProject` | - | - | - | enabled |
| 6 | View > Outlines | item | `toggleOutlines` | `toggleOutlines` | - | - | `contourView` | enabled |
| 7 | View > Dimensions | item | `toggleDimensions` | `toggleDimensions` | - | - | `viewMode !== '3d' \|\| contourView` | enabled |
| 8 | View > Show front dimensions | item | `toggleFrontDimensions` | `toggleFrontDimensions` | - | - | `viewMode !== '3d' \|\| contourView` | enabled |
| 9 | View > Dimension colour > Navy | item | `setDimensionColour(key)` | `setDimensionColour('navy')` | - | - | `parent: viewMode !== '3d' \|\| contourView` | enabled |
| 10 | View > Dimension colour > Red | item | `setDimensionColour(key)` | `setDimensionColour('red')` | - | - | `parent: viewMode !== '3d' \|\| contourView` | enabled |
| 11 | View > 3D | item | `setViewMode('3d')` | `setViewMode('3d')` | - | - | - | enabled |
| 12 | View > CNC sheet | item | `setViewMode('cnc')` | `setViewMode('cnc')` | - | - | - | enabled |
| 13 | View > Brightness | slider | `setBrightness` | `setBrightness` | - | - | `viewMode !== '3d'` | enabled |
| 14 | View > Realistic lighting | item | `toggleRealisticLighting` | `toggleRealisticLighting` | - | - | `viewMode !== '3d'` | enabled |
| 15 | View > Turn on the light | item | `setLighting({ on: !lightOn })` | `setLighting({ on: true })` | - | - | `viewMode !== '3d'` | enabled |
| 16 | View > X-ray | item | `toggleXray` | `toggleXray` | - | - | `viewMode !== '3d' \|\| contourView` | enabled |
| 17 | View > Hide fronts | item | `toggleHideFronts` | `toggleHideFronts` | - | - | `viewMode !== '3d'` | enabled |
| 18 | View > Contour view | item | `toggleContourView` | `toggleContourView` | - | - | `viewMode !== '3d'` | enabled |
| 19 | Library > Kitchen | item | `setLibraryCategory(c.id)` | `setLibraryCategory('kitchen')` | - | - | `c.soon` | enabled |
| 20 | Library > Wardrobes | item | `setLibraryCategory(c.id)` | `setLibraryCategory('wardrobe')` | - | - | `c.soon` | enabled |
| 21 | Library > Saved sets | item | `setLibraryCategory(c.id)` | `setLibraryCategory('sets')` | - | - | `c.soon` | enabled |
| 22 | Library > Sets | item | `setLibraryCategory(c.id)` | `setLibraryCategory('media')` | - | - | `c.soon` | enabled |
| 23 | Settings > Settings... | item | `openModal('design')` | `openModal('design')` | - | - | - | enabled |
| 24 | Settings > Room setup... | item | `openModal('room')` | `openModal('room')` | - | - | - | enabled |
| 25 | Settings > Snap > 0.5 mm | item | `setSnapStep(step)` | `setSnapStep(0.5)` | - | - | - | enabled |
| 26 | Settings > Snap > 1 mm | item | `setSnapStep(step)` | `setSnapStep(1)` | - | - | - | enabled |
| 27 | Settings > Snap > 32 mm system | item | `setSnapStep(step)` | `setSnapStep(32)` | - | - | - | enabled |
| 28 | Database > Materials... | item | `onMaterials` | `onMaterials` | `openModal('warehouse')` | - | `!onMaterials` | enabled |
| 29 | Database > Assign materials... | item | `onAssignMaterials` | `onAssignMaterials` | `openModal('assign-materials')` | - | `!onAssignMaterials` | enabled |
| 30 | Database > Company defaults... | item | `onCompanyDefaults` | `onCompanyDefaults` | `openModal('company-defaults')` | - | `!onCompanyDefaults` | enabled |
| 31 | Database > Clients... | item | `onClients` | `onClients` | - | - | `!onClients` | disabled, soon |
| 32 | Database > Projects... | item | `onProjects` | `onProjects` | - | - | `!onProjects` | disabled, soon |
| 33 | Spraying | button | `openModal('spraying')` | `openModal('spraying')` | - | - | - | enabled |
| 34 | Lighting | button | `openModal('lighting')` | `openModal('lighting')` | - | - | - | enabled |
| 35 | Output > Render... | item | `onRender` | `onRender` | `onRender` | `openModal('render')` | - | enabled |
| 36 | Output > Drawings > Preview... | item | `onDrawing(d.id)` | `onDrawing('preview')` | `onDrawing('preview')` | `onDrawing` | `Boolean(d.soon)` | enabled |
| 37 | Output > Drawings > Unit card (PDF) | item | `onDrawing(d.id)` | `onDrawing('unit-card')` | `onDrawing('unit-card')` | `onDrawing` | `Boolean(d.soon)` | enabled |
| 38 | Output > Drawings > Unit card (SVG) | item | `onDrawing(d.id)` | `onDrawing('unit-card-svg')` | `onDrawing('unit-card-svg')` | `onDrawing` | `Boolean(d.soon)` | enabled |
| 39 | Output > Drawings > All units (PDF) | item | `onDrawing(d.id)` | `onDrawing('booklet')` | `onDrawing('booklet')` | `onDrawing` | `Boolean(d.soon)` | enabled |
| 40 | Output > Drawings > Drawing set (PDF) | item | `onDrawing(d.id)` | `onDrawing('walls')` | `onDrawing('walls')` | `onDrawing` | `Boolean(d.soon)` | enabled |
| 41 | Output > Drawings > Drawing set (DXF) | item | `onDrawing(d.id)` | `onDrawing('walls-dxf')` | `onDrawing('walls-dxf')` | `onDrawing` | `Boolean(d.soon)` | enabled |
| 42 | Output > CNC / DXF | item | `onExportDxf` | `onExportDxf` | `onExportDxfZip` | `onExportDxfZip` | - | enabled |
| 43 | Output > Cutting list CSV | item | `onExportCsv` | `onExportCsv` | `onExportCsv` | `onExportCsv` | - | enabled |
| 44 | Output > BOM PDF | item | `onExportPdf` | `onExportPdf` | `onExportPdf` | `onExportPdf` | - | enabled |
| 45 | Output > Part labels . 21 per sheet (Avery L7160) | item | `onExportLabels({ sheet: 'L7160' })` | `onExportLabels({ sheet: 'L7160' })` | `onExportLabels({ sheet: 'L7160' })` | `onExportLabels` | - | enabled |
| 46 | Output > Part labels . 44 per sheet | item | `onExportLabels({ sheet: 'generic44' })` | `onExportLabels({ sheet: 'generic44' })` | `onExportLabels({ sheet: 'generic44' })` | `onExportLabels` | - | enabled |
| 47 | Output > Bill of materials... | item | `onOpenBom` | `onOpenBom` | `setBomOpen(true)` | - | - | enabled |
| 48 | Output > Spraying... | item | `onOpenSpraying` | `onOpenSpraying` | `openModal('spraying')` | - | - | enabled |

### The 14 scene-toolbar controls (src/components/CanvasToolbar.jsx; drawn: 14)

| # | Census name | Line | Handler (onClick) | Guard (disabled) as written | Pressed (aria-pressed) | Drawn as |
| - | - | - | - | - | - | - |
| 1 | Undo | 101 | `undo` | `undoDepth === 0` | - | "(undo arrow)" |
| 2 | Redo | 112 | `redo` | `redoDepth === 0` | - | "(redo arrow)" (disabled) |
| 3 | Show dimensions | 126 | `toggleDimensions` | `viewMode !== '3d'` | `showDimensions` | "Show dimensions" |
| 4 | Front dimensions | 148 | `toggleFrontDimensions` | `viewMode !== '3d'` | `showFrontDimensions` | "Front dimensions" |
| 5 | Outlines | 170 | `toggleOutlines` | `viewMode !== '3d' \|\| contourView` | `showOutlines \|\| contourView` | "Outlines" |
| 6 | X-ray | 190 | `toggleXray` | `viewMode !== '3d' \|\| contourView` | `xray` | "X-ray" |
| 7 | Props | 217 | `toggleProps` | `viewMode !== '3d' \|\| contourView \|\| !propsReady` | `props && propsReady` | "Props" (disabled) |
| 8 | Hide fronts | 242 | `toggleHideFronts` | `viewMode !== '3d'` | `hideFronts` | "Hide fronts" |
| 9 | Measure | 264 | `toggleRuler` | `viewMode !== '3d'` | `rulerOn` | "Measure" |
| 10 | Open all / Close all | 288 | `toggleAllFronts(doorEntries)` | `viewMode !== '3d' \|\| !doorEntries.length` | `everyDoorOpen` | "Open all" (disabled) |
| 11 | BOM | 307 | `setBomOpen(!bomOpen)` | none | `bomOpen` | "BOM" |
| 12 | Check . N | 324 | `toggleCheck` | none | `checkOpen` | "Check" |
| 13 | 3D | 342 | `setViewMode('3d')` | none | `viewMode === '3d'` | "3D" |
| 14 | CNC | 342 | `setViewMode('cnc')` | none | `viewMode === 'cnc'` | "CNC" |

### The 7 header controls (src/components/TopBar.jsx, outside the MenuBar; drawn: 7, MockModeBadge in the header)

| # | Census name | Line | Tag | Handler | Guard |
| - | - | - | - | - | - |
| 1 | CABINET CORE | 346 | button | `leaveProject` | - |
| 2 | project name (rename) | 373 | button | `setEditing(true)`; edit field line 364: `setProjectName(e.target.value)`, Enter / Escape / blur `setEditing(false)` | - |
| 3 | Save | 382 | button | `save` | `saveState === 'saving'` |
| 4 | MOCK DATA MODE | 394 | MockModeBadge | components/MockModeBadge.jsx, shown when isMockMode | - |
| 5 | Bright | 424 | input range | `setBrightness(Number(e.target.value))` | `viewMode !== '3d'` |
| 6 | Account | 440 | button | `onAuth` | - |
| 7 | Export (= BOM) | 441 | button | `setBomOpen(!bomOpen)` | - |

ConfiguratorPage hands TopBar: `onExportCsv` = `onExportCsv`, `onExportPdf` = `onExportPdf`, `onExportLabels` = `onExportLabels`, `onExportDxfZip` = `onExportDxfZip`, `onRender` = `openModal('render')`, `onDrawing` = `onDrawing`, `onAuth` = `openModal('auth')`.

### The right-click actions (src/lib/contextActions.js, sha256 0f3056749f43f33a652129aa3ece6d022f4e2ea342b039c19893daf155bb1fab; 20 `actions.push(` sites, 25 ids; ContextMenu.jsx sha256 9ecd6083c1808257a9c4f53ec9ff654304cfae671c1b923e9910ab5a55ca524c)

| THE CENSUS row | ids | present |
| - | - | - |
| Edit cabinet... | edit-cabinet | yes |
| Edit drawer... | edit-drawer | yes |
| Rename | rename | yes |
| End panel L | end-panel-L | yes |
| End panel R | end-panel-R | yes |
| Top infill | top-infill | yes |
| Top cornice (the height ladder) | cornice-0, cornice-70, cornice-100 | yes |
| Side infill | side-infill | yes |
| Pin infill L | pin-infill-L | yes |
| Pin infill R | pin-infill-R | yes |
| Bottom mask | bottom-mask | yes |
| Plinth | plinth | yes |
| Upstand | upstand | yes |
| Drawer fronts | drawer-fronts | yes |
| Unit colour | unit-colour | yes |
| Save as template | save-template | yes |
| Center shelves | center-shelves | yes |
| Rotate 90 deg | rotate-90 | yes |
| Back to wall | back-to-wall | yes |
| Side to wall | side-to-wall | yes |
| Close all fronts | close-fronts | yes |
| Delete | delete | yes |

Not named by a census row: end-panel-B.

| id | label (one cabinet) | group | offered |
| - | - | - | - |
| edit-cabinet | Edit cabinet... | edit | 45 of 46 types |
| rename | Rename "01"... | edit | every type |
| end-panel-L | End panel - left | end-panels | 45 of 46 types |
| end-panel-R | End panel - right | end-panels | 45 of 46 types |
| end-panel-B | End panel - both sides | end-panels | 45 of 46 types |
| top-infill | Top infill | run-pieces | 17 of 46 types |
| cornice-0 | Top cornice: none | run-pieces | 18 of 46 types |
| cornice-70 | Top cornice 70 mm | run-pieces | 18 of 46 types |
| cornice-100 | Top cornice 100 mm | run-pieces | 18 of 46 types |
| side-infill | Scribe fillers at the wall | rest | 45 of 46 types |
| pin-infill-L | Pin infill left | rest | 45 of 46 types |
| pin-infill-R | Pin infill right | rest | 45 of 46 types |
| plinth | Plinth | run-pieces | 33 of 46 types |
| drawer-fronts | Drawer fronts | rest | 18 of 46 types |
| unit-colour | Colour... | rest | every type |
| save-template | Save as template | rest | every type |
| center-shelves | Center shelves | rest | 19 of 46 types |
| rotate-90 | Rotate 90 deg | rest | 45 of 46 types |
| back-to-wall | Back to wall | rest | 45 of 46 types |
| side-to-wall | Side to wall | rest | 45 of 46 types |
| delete | Delete | rest | every type |
| edit-drawer | Edit drawer 1... | edit | a drawer under the pointer |
| close-fronts | Close all fronts | rest | a front under the pointer |
| bottom-mask | Bottom masking panel | run-pieces | 11 of 46 types |
| upstand | Upstand | run-pieces | 25 of 46 types |

### The 26 window kinds (a distinct literal in openModal('x' or pushModal('x' anywhere in src; 26 of them opened from a PRO file)

| Kind | Opened at (PRO first; retail copies counted apart) |
| - | - |
| add-items | src/3d/Scene.jsx:1548 openModal; src/3d/Scene.jsx:2272 openModal; src/3d/Scene.jsx:2277 openModal (+ 1 in src/retail) |
| assign-materials | src/components/BomPanel.jsx:291 openModal; src/components/TopBar.jsx:304 openModal |
| auth | src/pages/ConfiguratorPage.jsx:621 openModal |
| cabinet | src/3d/Scene.jsx:2191 openModal; src/components/ContextMenu.jsx:148 openModal; src/components/ContextMenu.jsx:150 openModal (+ 2 in src/retail) |
| company-defaults | src/components/TopBar.jsx:302 openModal |
| design | src/components/TopBar.jsx:271 openModal; src/components/UnitFinishModal.jsx:120 openModal (+ 2 in src/retail) |
| draw-room | src/components/RoomModal.jsx:739 openModal (+ 2 in src/retail) |
| drawing | src/pages/ConfiguratorPage.jsx:503 openModal |
| edge-notch | src/3d/notchPick.js:58 openModal |
| element | src/3d/Scene.jsx:2172 openModal; src/3d/Scene.jsx:2246 openModal; src/components/AddItems.jsx:167 openModal; src/components/DoorModal.jsx:138 openModal; src/components/DoorModal.jsx:216 openModal; src/components/DoorModal.jsx:332 openModal (+ 7 in src/retail) |
| front-gap | src/components/FrontGapWarnings.jsx:91 openModal (+ 1 in src/retail) |
| jpull-run | src/3d/Scene.jsx:2221 openModal (+ 1 in src/retail) |
| lighting | src/components/TopBar.jsx:324 openModal (+ 1 in src/retail) |
| mirror-back | src/3d/mirrorCabinetRoom.js:46 openModal; src/3d/mirrorCabinetRoom.js:314 openModal |
| notch | src/3d/notchPick.js:24 openModal |
| part-detail | src/3d/Scene.jsx:2074 openModal; src/components/CabinetEditorModal.jsx:427 pushModal; src/lib/editorStack.js:9 openModal |
| rail | src/3d/Scene.jsx:2180 openModal |
| render | src/pages/ConfiguratorPage.jsx:619 openModal |
| room | src/components/DesignSettingsModal.jsx:155 openModal; src/components/TopBar.jsx:272 openModal |
| save-as | src/components/TopBar.jsx:136 openModal |
| save-template | src/components/ContextMenu.jsx:146 openModal (+ 1 in src/retail) |
| spraying | src/components/TopBar.jsx:315 openModal; src/components/TopBar.jsx:338 openModal |
| unit-finish | src/components/ContextMenu.jsx:173 openModal; src/components/MultiUnitPanel.jsx:422 openModal; src/components/RightPanel.jsx:495 openModal (+ 1 in src/retail) |
| unit-size | src/3d/Scene.jsx:2264 openModal (+ 1 in src/retail) |
| warehouse | src/components/TopBar.jsx:300 openModal |
| watch-layout | src/3d/Scene.jsx:2203 openModal; src/components/AddItems.jsx:499 openModal (+ 1 in src/retail) |

### The library

| Category id | Label | Types | Saved | Sets | Type ids |
| - | - | - | - | - | - |
| kitchen | Kitchen | 36 | - | - | BUD BUDR2 BUDR BUDR4 BUDR2_HOB BUDR_HOB BUD_INT SINK CORNER_L_BASE BLIND_BASE DW_PANEL OVEN_BASE BIN WINE TWIN LOW_CABINET BUDTALL HAWA_POCKET FRIDGE CARGO PANTRY APPLIANCE_TALL APPLIANCE_TALL2 FRIDGE_US WUD WUD_GLASS WUD_HOOD WUD_HOOD_CANOPY WUD_HOOD_SHORT BLIND_WALL CORNER_L_WALL VANITY2 VANITY3 VANITY4 MIRROR_CABINET FREE_PANEL |
| wardrobe | Wardrobes | 15 | - | - | WARDROBE WARDROBE_TOP WARDROBE_WALL BLIND_WARDROBE CORNER_L_WARDROBE WARDROBE_CHEST2 WARDROBE_CHEST3 WARDROBE_CHEST4 WARDROBE_DESK WARDROBE_LOW HAWA_POCKET VANITY2 VANITY3 VANITY4 MIRROR_CABINET |
| sets | Saved sets | 0 | yes | - | (the template store, at run time) |
| media | Sets | 0 | - | yes | (engine/sets.js SHIPPED_SETS, the five, and the saved sets of the template store, at run time) |

Type slots 51 (36 + 15); distinct types 46 of 46 UNIT_TYPES; in two categories: HAWA_POCKET, VANITY2, VANITY3, VANITY4, MIRROR_CABINET. Registry leaves (engine/library.js, flattened): Kitchen 45, Wardrobes 15; shipped sets 5: Media wall, Sideboard, Vanity, Utility, Hallway.

### The panel sources' control tags

| File | NumberField | select | button | input | textarea | total (raw, the census rule) | total, comments stripped | lines with a tag inside a comment |
| - | - | - | - | - | - | - | - | - |
| src/components/RightPanel.jsx | 21 | 15 | 66 | 6 | 0 | 108 | 108 | - |
| src/components/ElementProperties.jsx | 20 | 7 | 21 | 1 | 0 | 49 | 47 | 345, 771 |
| src/components/MultiUnitPanel.jsx | 3 | 1 | 11 | 1 | 0 | 16 | 16 | - |
| all | | | | | | 173 | 171 | |
