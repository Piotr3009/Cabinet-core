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
| 2 · room A drawn and saved (5000 x 3500) | 0,0 5000,0 5000,3500 0,3500 | (none) | (none) | 0 | wall | 1 | 3 | 0 | 0 | 0 |
| 3 · the room window again, before the new room | 0,0 5000,0 5000,3500 0,3500 | (none) | (none) | 0 | wall | 1 | 3 | 0 | 0 | 1 |
| 4 · room B drawn and saved (3600 x 2800) | 0,0 3600,0 3600,2800 0,2800 | (none) | (none) | 0 | wall | 1 | 3 | 0 | 0 | 0 |
## After the fix

The same real-mouse run, after T74 F4. Each drawn room is a NEW room: the old room's window and slope do not
survive it (rows 2 and 4), the cabinet stands, and the room window no longer hides under the drawing with the old
outline in its draft (it is replaced by the drawing, as PRO's is; EDIT THE ROOM opens it fresh on the room that now
stands, row 3). Frames `f04-probe-*.png` are this run's.
