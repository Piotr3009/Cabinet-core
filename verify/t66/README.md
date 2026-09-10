# verify/t66 — ONE EDITOR ON THE RIGHT, A LIST ON THE LEFT, AND THE WINE-RED DEFAULT

Every claim turn 66 makes about a PAGE ends in a frame here. `npm test` and
`npm run build` can both be green while the thing on screen is wrong, because
neither of them opens a browser.

```
npm run build && npx vite preview --port 4173
node scripts/t66-walk.mjs                 # every section
node scripts/t66-walk.mjs f3 lazy         # some of them
node scripts/t66-f11-measure.mjs          # the label measurement F11 asks for
node verify/t66/t66-classify.mjs          # the engine delta, and the six goldens
```

## What is here

| file | what it proves |
|---|---|
| `walk.txt` | the acceptance walk's own ledger, as it ran |
| `f11-measure.txt` | every label in the two copied panels, at 1280 and 1440 |
| `goldens-base.json` | the six fixtures as they stood on `origin/main` |
| `t66-classify.mjs` | forwards to `scripts/t66-classify.mjs` — the path CLAUDE.md names |
| `f1-*.png` | the same scene at the slider's 100 %, before and after the base came down |
| `f2-*.png` | the seven tiles, SIZE's three fields, a refused width, the empty state |
| `f3-*.png` | a drawer docked, a door swapped in place, a carcass click closing the panel, and no workshop fields |
| `f4-*.png` | STYLE as a list with shaker's frame field; the same list on SLAB; OPENING as a column |
| `f5-*.png` | a fresh design wine-on-walnut, and the REVIEW step naming both |
| `f6-*.png` | the renamed row, and the foot of the panel without the second control |
| `f7-*.png` | SPLIT DOOR in EXTRAS, a split leaf on the stage, and the greyed state with its reason |
| `f8-*.png` | WHERE with EDIT THE ROOM in plain sight |
| `f9-*.png` | the first mount, dressed — chains and outlines, both buttons lit |
| `f10-*.png` | the controls at radius 8, and a copied editor wearing the same shape |
| `f11-*.png` | INSIDE and FRONTS at 1280 and 1440 |
| `lazy-0*.png` | the lazy client's run, end to end, at the new defaults |

## The one line F3 does not do, and why

CLAUDE.md F3 asks for a click on the CORNICE to dock the cornice section of the
copied ContextMenu. It cannot be done tonight without an unlicensed change:
`engine/cabinet.js` calls the cornice *"the one piece in this engine that
produces NO PANEL"* — it is bought moulding, it reaches the BOM as hardware,
and `src/3d/Cornice.jsx` draws it with no pointer handler at all. Making it
selectable means a click handler in `src/3d/`, which is shared with PRO.

The cornice's EDITOR is not lost: T65 F8's chip row stands in EXTRAS with the
engine's own heights (40 / 70 / 100), its own refusal and NONE as the way out,
and the copied ContextMenu is still mounted for the right-click road.
`test/turn66-f3-one-editor-on-the-right.test.js` asserts both halves.
