# T72 · F1 — the end panel's menu: the probe

> *"jak kliknę 2 razy na panel boczny po prawej nie pokazuje mi się menu panelu"*

A retail room, one wardrobe 1800 × 2200 × 600, one end panel added the way
EXTRAS adds it (`adapter.addEndPanelByHand(unitId, 'R')`), then a 2klik on the
board. Every link of the chain, as it actually answers:

| link | what was asked | what it answered |
| --- | --- | --- |
| 1 · the scene | `panel cut by the engine` | `END-R` |
| 1 · the scene | `elementKind(panel)` | `end-panel` |
| 1 · the scene | `isSelectableElement` | `true` |
| 1 · the scene | `opensOwnModal (2klik opens its own)` | `true` |
| 2 · the store | `ui.selectedElement.unitId === the wardrobe` | `true` |
| 2 · the store | `ui.selectedElement.elementRef` | `END-R` |
| 3 · the adapter | `MENU_FOR_KIND['end-panel']` | `null` |
| 3 · the adapter | `resolveSelection(...)` | `null` |
| 3 · the adapter | `resolveSelection().menu` | `null` |
| 3 · the adapter | `resolveSelection().panel` | `null` |
| 4 · the room | `DesignRoom setTarget` | `null` |
| 4 · the room | `DesignRoom clearElement() called` | `true` |
| 5 · the dock | `resolveTarget(target)` | `null` |
| 5 · the dock | `dockFor(selection)` | `null` |

**The add:** `addEndPanelByHand → ok=true`

## The fact

CONVICTED · `MENU_FOR_KIND` has no `end-panel` key, so `resolveSelection` answers null, `DesignRoom` CLEARS the element, and `dockFor` is never called at all. The board is pickable and the engine cuts it; the TABLE is the fault.

The line, as the file writes it —
`src/retail/design/adapter.js`, `MENU_FOR_KIND`:

```
//   `plinth`, `end-panel`, `infill`, `masking-panel`, `holder` and `spurs` are
//   NOT KEYS HERE, so `resolveSelection` answers null and `DesignRoom` clears
//   the selection.
```

T66 F3 put the end panel out of the table with the CARCASS, on turn 13's
verdict that *"clicking a cabinet must select the CABINET"*. An end panel is
not carcass: `engine/elements.js` files it under `ATTACHED_KINDS`, beside the
door — *"things you HANG ON the carcass afterwards, one at a time, and each of
them is a decision with its own properties"* — and `opensOwnModal` has said
`true` for it since turn 14. One key is the whole of it.

