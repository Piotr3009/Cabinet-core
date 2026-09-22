# T72 · F6 — the door window: the probe, AFTER the fix

`f6-probe.md` is the same walk before a line was changed. One selector was
narrowed and one rule was halved; nothing else moved.

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
| 2 · THE HINGES | `the HEIGHT ROWS hidden by the room sheet` | `—` |
| 2 · THE HINGES | `the HEIGHT ROWS on screen` | `true` |
| 2 · THE HINGES | `ASSIGN OTHER HINGE hidden by the room sheet` | `src/retail/styles/room.css:815` |
| 2 · THE HINGES | `ASSIGN OTHER HINGE on screen (PRO only)` | `false` |
| 3 · HINGE SIDE | `mounted by the copy` | `<ElementProperties unit={unit} panel={panel} item={item} compact omit={['hinges']} />` |
| 3 · HINGE SIDE | `the window omits` | `hinges` |
| 3 · HINGE SIDE | `elementFields after the omit` | `hinge-side, front-board, material` |
| 3 · HINGE SIDE | `carries `hinge-side`` | `true` |
| 3 · HINGE SIDE | `its markup` | `<label class="block"><span class="cc-label">Hinge side</span><select class="cc-input">…` |
| 3 · HINGE SIDE | `hidden by the room sheet` | `—` |
| 3 · HINGE SIDE | `ON SCREEN` | `true` |

## The fact

```
ALL THREE ARE ON THE SCREEN · `isDoor` is TRUE for this leaf, the copy mounts
all three blocks behind it, and no `data-workshop-tools="no"` rule takes any of
them. SPLIT DOOR (TOP SEGMENT) was never hidden; the HINGE HEIGHT ROWS came
back on the owner's own word of 22.09; and HINGE SIDE is let through by a rule
that now names the board pickers it was written for.

ASSIGN OTHER HINGE — the catalogue dropdown that picks WHICH hinge the workshop
buys — stays PRO's, which is what *"wybór hinges to nie jest dobry pomysł, nie
tutaj — zostaw w PRO"* was ever about. Nothing in tonight's sentence asks for it.
```

