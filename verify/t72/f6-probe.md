# T72 · F6 — the door window: the probe

> *"2klik na drzwiach nie pokazuje w ogóle hinges"* · *"gdzie jest left/right wybór
> oraz podzielenie drzwi, top section?"*

A retail room, one wardrobe 1800 × 2200 × 600 with its doors on, then a 2klik on
the left leaf. Both halves of "shows" asked of all three blocks — does the copy
MOUNT it, and does the room's sheet take it off the screen:

| where | what was asked | what it answered |
| --- | --- | --- |
| the door | `panel.id` | `W01-FL` |
| the door | `panel.part` | `FRONT` |
| the door | `panel.role` | `front` |
| the door | `panel.meta (keys)` | `frontType, hinge, shaker` |
| the door | `panel.meta.appliance` | `null` |
| the door | `panel.meta.split` | `null` |
| the route | `resolveSelection().menu` | `door` |
| the route | `dockFor() → modal` | `element` |
| the route | `dockFor() → args.panelId` | `W01-FL` |
| the gate | `the copy's own line` | `const isDoor = panel?.part === 'FRONT' && panel?.role === 'front' && !panel?.meta?.appliance;` |
| the gate | `isDoor, evaluated on this panel` | `true` |
| 1 · SPLIT DOOR | `mounted by the copy` | `{isDoor ? <SplitDoorField unit={unit} panel={panel} anchor={args?.anchor \|\| null} /> : null}` |
| 1 · SPLIT DOOR | `hidden by the room sheet` | `—` |
| 1 · SPLIT DOOR | `ON SCREEN` | `true` |
| 2 · THE HINGES | `mounted by the copy` | `<HingeSection` |
| 2 · THE HINGES | `hidden by the room sheet` | `src/retail/styles/room.css:778 — .pbi-room[data-workshop-tools="no"] .pbi-dock [data-hinge-modal] > div:has(> [data-hinge-assign]),, src/retail/styles/room.css:779 — .pbi-room[data-workshop-tools="no"] .pbi-dock [data-hinge-modal-rows] {` |
| 2 · THE HINGES | `ON SCREEN` | `false` |
| 3 · HINGE SIDE | `mounted by the copy` | `<ElementProperties unit={unit} panel={panel} item={item} compact omit={['hinges']} />` |
| 3 · HINGE SIDE | `the window omits` | `hinges` |
| 3 · HINGE SIDE | `elementFields after the omit` | `hinge-side, front-board, material` |
| 3 · HINGE SIDE | `carries `hinge-side`` | `true` |
| 3 · HINGE SIDE | `its markup` | `<label class="block"><span class="cc-label">Hinge side</span><select class="cc-input">…` |
| 3 · HINGE SIDE | `hidden by the room sheet` | `src/retail/styles/room.css:694 — .pbi-room[data-workshop-tools="no"] .pbi-dock label:has(> select.pbi-re-input),` |
| 3 · HINGE SIDE | `ON SCREEN` | `false` |

## The fact

```
THE GATE IS SOUND · `isDoor` is TRUE for this leaf, and the copy mounts all
three blocks behind it. The fault is not a gate and not a route — every one of
the three is MOUNTED. Two of them are then taken off the screen by the ROOM'S
OWN STYLESHEET:

  · THE HINGES — src/retail/styles/room.css:778
      .pbi-room[data-workshop-tools="no"] .pbi-dock [data-hinge-modal] > div:has(> [data-hinge-assign]),
  · THE HINGES — src/retail/styles/room.css:779
      .pbi-room[data-workshop-tools="no"] .pbi-dock [data-hinge-modal-rows] {
  · HINGE SIDE — src/retail/styles/room.css:694
      .pbi-room[data-workshop-tools="no"] .pbi-dock label:has(> select.pbi-re-input),

THE HINGES were hidden on purpose (T68 F6, *"wybór hinges to nie jest dobry
pomysł, nie tutaj — zostaw w PRO"*), and the owner has OVERTURNED that tonight in
as many words: *"mamy fajny w PRO to menu z zawiasami i ze strzałkami up and
down, skopiuj z PRO."*  22.09 outranks 11.09.

HINGE SIDE was never meant to be hidden at all. The rule that takes it is
`label:has(> select.pbi-re-input)`, written for *"the board-thickness pickers"* —
and `ElementProperties`' `Field` wraps EVERY control in a `<label>`, so that
selector reaches every `<select>` in the dock: `hinge-side`, `shelf-type`,
`partition-slot` and `end-panel-height` with it. ONE selector, written wider than
its own comment. That is the gate F6 names.
```

