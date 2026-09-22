# T72 · F7 — lights mode: the probe

> *"po naciśnięciu LED wyłącza mi się funkcja lights i zaznacza mi drzwi, a nie
> powinno"*

A retail room, one wardrobe with its doors on. The three handlers CLAUDE.md names,
run in order against the real ui store:

| step | the store after it | lights mode |
| --- | --- | --- |
| start — nothing open, nothing selected | `modal=null` | lights mode OFF |
| 1 · ViewBar LED pressed — A.openEditor('lighting') | `modal=lighting` | lights mode ON |
| 2 · LightingPanel ON pressed — setLighting({ on: true }) | `modal=lighting` | lights mode ON |
| 2 · LightingPanel OFF pressed — setLighting({ on: false }) | `modal=lighting` | lights mode ON |
| 3 · ONE click on a door — ui.selectElement(unit, leaf) | `modal=lighting` | lights mode ON · selected W01-FL |
| 3 · …and Detail's effect runs | `modal=element` | lights mode OFF · selected W01-FL |

The lines, quoted from the files that hold them:

- `src/retail/design/DesignRoom.jsx:471` — `onLights={(e) => A.openEditor('lighting', { anchor: A.anchorOf(e) })}`
- `src/retail/design/adapter.js:3267` — `export const openEditor = (name, args = null) => U().openModal(name, args);`
- `src/retail/design/lighting/LightingPanel.jsx:280` — `sticky`
- `src/retail/design/lighting/LightingPanel.jsx:275` — `onClose={closeModal}`
- `src/retail/design/Detail.jsx:119` — `if (name) { if (ui.modal !== name) ui.openModal(name, args); return; }`

## The fact

```
CONVICTED · THE STAGE'S CLICK, through the DOCK's own effect — and neither of the
other two candidates touches the mode.

  · `ViewBar` onLights only OPENS it (`adapter.openEditor` → `openModal`).
  · `LightingPanel` is `sticky` and closes only by its own ×; ON and OFF write
    `design.lighting.on` and leave the modal exactly where it is.
  · A SINGLE click on a leaf writes `selectedElement`; `DesignRoom` resolves it to
    the `door` menu; and `Detail.jsx`'s effect then calls
      if (name) { if (ui.modal !== name) ui.openModal(name, args); return; }
    which opens 'element' ON TOP OF 'lighting'. `openModal` REPLACES — the nav has
    `pushModal` for a nested surface and this is not it — so the lighting panel is
    gone and the client is looking at the door he only meant to point at.

ONE HANDLER, and it is not the LED button: the dock opens an editor on a SINGLE
click, where the owner's law for opening an editor is a 2klik.
```

