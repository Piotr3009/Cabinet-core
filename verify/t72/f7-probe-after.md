# T72 · F7 — lights mode: the probe, AFTER the fix

`f7-probe.md` is the same walk before a line was changed. ONE gate was added,
in the one handler that table convicted, and the two exits the owner named were
given the code that owns them.

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
| 3 · …and Detail's effect runs | `modal=lighting` | lights mode ON · selected W01-FL |

The lines, quoted from the files that hold them:

- `src/retail/design/adapter.js:3385` — `export const openEditor = (name, args = null) => U().openModal(name, args);`
- `src/retail/design/lighting/LightingPanel.jsx:280` — `sticky`
- `src/retail/design/lighting/LightingPanel.jsx:275` — `onClose={closeModal}`
- `src/retail/design/Detail.jsx:160` — `if (name) { if (ui.modal !== name) ui.openModal(name, args); return; }`

## The fact

```
NOT CONVICTED — lights mode survived every one of the three.

The dock STANDS OFF while the lighting panel is open, which is the one gate the
first table convicted:
  · src/retail/design/Detail.jsx:158 — if (lightsMode) return;

And every exit the owner named is in place:
  · the menu's own button — src/retail/design/DesignRoom.jsx:482 — onLights={(e) => (A.lightsModeOn()
  · 2klik on another element — the SCENE opens that element's window itself
    (`Scene.jsx onEditElement` → `openModal`), which replaces `lighting`
  · 2klik on the wall — src/retail/design/Stage.jsx:119 — onBackgroundDouble={() => { if (A.lightsModeOn()) A.closeEditor(); }}

A single click inside the mode still SELECTS, and it must: `LightingPanel`'s whole
flow is "click the shelf you want the LED under", and it reads the same
`selectedElement` the stage writes. What it no longer does is open that piece's
editor over the panel.
```

