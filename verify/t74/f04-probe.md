# T74 F4 · the probe: a new room on top of the old one

The owner, 23.09.2026: *"Przy tworzeniu nowego pokoju po starym jeden nachodzi na drugi zamiast resetu."*

Run by `node scripts/t74-f4-probe.mjs` against `npx vite preview --port 4173` (retail, `retail.html#/design`).
Every step is a real click or key: EDIT THE ROOM, the elevation's ADD WINDOW and SLOPE RIGHT, DRAW ROOM, a click
on the drawing and the length typed into the field that opens there, CLOSE, SAVE ROOM. The store and the scene
are only read. `sceneWalls` counts the wall groups the scene draws (`userData.ccWall`), `roomWindowPlanWalls` the
walls the room window's own plan draws (`data-plan-wall`).

| when | corners | openings | slopes | boxes | scope | units | sceneWalls | sceneWallPlan | sceneRoomBox | roomWindowPlanWalls |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 · the default room, one wardrobe | 0,0 4000,0 4000,3000 0,3000 | (none) | (none) | 0 | wall | 1 | 3 | 0 | 0 | 0 |
| 1 · the old room: a window and a slope on wall 1 | 0,0 4000,0 4000,3000 0,3000 | window@w0:1400 | slope@w0:R | 0 | wall | 1 | 3 | 0 | 0 | 1 |
| 2 · room A drawn and saved (5000 x 3500) | 0,0 5000,0 5000,3500 0,3500 | window@w0:1400 | slope@w0:R | 0 | wall | 1 | 3 | 0 | 0 | 1 |
| 3 · the room window again, before the new room | 0,0 5000,0 5000,3500 0,3500 | window@w0:1400 | slope@w0:R | 0 | wall | 1 | 3 | 0 | 0 | 1 |
| 4 · room B drawn and saved (3600 x 2800) | 0,0 3600,0 3600,2800 0,2800 | window@w0:1400 | slope@w0:R | 0 | wall | 1 | 3 | 0 | 0 | 1 |
| 5 · APPLY pressed in the room window left under the drawing | 0,0 3600,0 3600,2800 0,2800 | window@w0:1400 | slope@w0:R | 0 | wall | 1 | 3 | 0 | 0 | 0 |
## The verdict, before any fix

| what | store | scene / screen |
|---|---|---|
| corners (walls) | REPLACED by each drawn room: 4000 x 3000, then 5000 x 3500, then 3600 x 2800 | the walls follow the new corners |
| openings | the OLD room's window (`window@w0:1400`) is KEPT through both new rooms | drawn on the new room's wall 1, a window nobody put there |
| slopes (`project.wallSlopes`) | the OLD room's slope (`slope@w0:R`) is KEPT through both new rooms | the new wall 1 is cut by the old slope |
| boxes | none were made (no button makes one since T67 F1); `setRoom` merges, so a saved room's boxes would be kept the same way | |
| the room window under the drawing (retail) | its own draft still holds the OLD room | its plan and its wall row say `Wall 1 · 4000` over a 5000 and then a 3600 room: two rooms on one screen (frame `f04-probe-5-after-B.png`) |
| cabinets | untouched | untouched |

Convicted, two sites:

1. `projectStore.setRoom` is a MERGE (`{ ...room, ...patch }`) and `project.wallSlopes` lives beside the room, so a
   drawn room's save (`setRoom({ corners })`, both DrawRoomModal files) replaces the outline and keeps everything that
   stood on the old walls. Nothing anywhere clears the old room.
2. Retail keeps the room window mounted under the drawing (`DesignRoom`'s own `roomEditor` state), and the window's
   `draft` is a snapshot taken when it opened, so after a new room is saved it goes on showing the old one.

PRO's save is the same call (`src/components/DrawRoomModal.jsx save`, `setRoom({ corners: cornersOfPath(path) })`),
so site 1 is PRO's too; PRO's room window is replaced by the drawing (`openNav`), so site 2 is retail's alone.
