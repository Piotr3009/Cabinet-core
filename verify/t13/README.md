# verify/t13 — what turn 13 was seen doing

Produced by `node scripts/e2e-turn13.mjs` against a production build in a real
Chromium (`npm run build && npx vite preview --port 4173`). **24/24 checks
passed**; `measurements.json` carries every number the walk read, not just the
verdicts.

The walk MEASURES rather than photographing, and turn 13 takes that one layer
deeper. Turn 11 put the STORES behind `window.__cc` so a walk could read what
the scene paints from; this turn adds `__cc.views` (`src/3d/viewHandle.js`), so
it can read the geometry the RENDERER is holding and the camera an orbit has
left behind. Two of this turn's phases need exactly that:

* **F1** is a claim about winding. The node test is the guard; the browser check
  walks every machined solid in the live scene and asserts that not one
  top-facing triangle points inward — cache, matrices and all.
* **F2.2** is a claim about a camera. A pan leaves no trace whatsoever in the
  DOM; the only honest reading is the controls' own target, before and after a
  real right-button drag.

It also stopped guessing where to click. Every cabinet carries `ccUnitId` on its
group, so a click is PROJECTED onto a named cabinet through the room's own
camera instead of aimed at a fraction of the canvas. That is what turned three
"the raycast missed, falling back to the store" notes into real gestures — and
it is how the walk found two bugs that no node test could have (see below).

| shot | what it shows |
|---|---|
| `1a-down-into-a-wall-unit-run` | **F1 — the owner's own view: looking down into a run of wall units, every top face whole and solid** |
| `2a-editor-maximised-panned-edit-element` | F2.1/2.2/2.3 — the editor near-fullscreen, the cabinet panned off centre, a side panel in **Edit element** |
| `3a-cabinet-selects-whole-unit-shelf-still-clickable` | F2.4 — a click on the carcass selects the WHOLE cabinet |
| `4a-unit-colour-only-the-project-palette` | F3.2 — Carcass 1, Front 1, Front 2 and nothing else, with "More colours…" pointing back to Settings |
| `4b-one-cabinet-recoloured-neighbours-untouched` | F3.1 — the middle cabinet in Front 2; its neighbours and the project unchanged |
| `5a-wud-end-panel-ends-with-the-cabinet` | F4 — the wall unit's end panel stops at the carcass bottom |
| `6a-context-menu-over-three-units` | F5.3 — the menu over a selection, every bulk entry labelled "(3)" |
| `6b-one-plinth-across-three-units` | F5.3 — three cabinets plinthed, ONE continuous toe kick |
| `7a-plus-modal-add-doors` | F6 — the golden plus's menu, with "Add doors" on it |
| `7b-doors-added-from-the-plus` | F6 — the door hung from that click |
| `8a-fresh-project-hinges-in-solid` | F7 — a FRESH project, no toggle touched, hinges drawn in Solid |
| `9a-xray-partition-biscuit-sets` | F8 — X-ray over a partitioned cabinet, the sets on the joint line |
| `9c-biscuit-set-close-up` | **F8 — the set itself: the 70 mm mark with a ⌀3 screw at each end, twice down the joint** |
| `9b-cnc-sheet-biscuit-4mm-layer` | F8 — the CNC sheet: `BISCUIT_4MM` in the legend, the marks drawn on TOP, BOTTOM and VPART |

## What the browser found that the tests could not

Two real bugs, both invisible to a node test because both are about how a
POINTER event travels through the 3D scene:

1. **Ctrl+click could not build a selection.** The room's walls are
   double-sided and the camera stands outside the front one, so *every* click in
   this application passes through a wall before it reaches anything. The
   background handler therefore ran on clicks that were never about the
   background, and cleared the selection a moment before the cabinet set it. On
   an ordinary click that is invisible — the cabinet writes last and wins — but
   with Ctrl held it is the whole feature. Fixed in `3d/Room.jsx`: a room
   surface is the background only when no furniture is anywhere in the ray's
   list.

2. **Right-clicking a cabinet collapsed the selection.** A pointer-down fires
   for every button, so the right press ran the unit's own handler and selected
   it before the context menu was ever built — leaving the joiner with the
   entries for one cabinet after ticking three. Fixed in `3d/UnitView.jsx`: the
   left button only; the right belongs to the menu and the orbit, the middle to
   the pan.

A third, found the same way: react-three-fiber builds its event object by
spreading the DOM one, and a pointer event carries `ctrlKey` on its *prototype*
— so the modifier never arrived. The handler reads the native event.

## The CNC report

`cnc-export-identity.md` is the rule-7 report: the fingerprint diff between the
turn-12 baseline and this branch. 1148 lines both sides, nothing added, nothing
removed, 95 fingerprints changed — and every one of them a partition case, which
is the delta CLAUDE.md sanctions by name. `fingerprints-turn12-baseline.txt` and
`fingerprints-turn13.txt` are the raw outputs it was made from.
