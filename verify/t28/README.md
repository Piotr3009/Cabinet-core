# verify/t28 — the proofs of turn 28

**Baseline: `8b6ece6`, main after the 12.08 chat fix. Suite at that commit:
2 184 tests, 2 184 pass. Suite at the end of this turn: 2 276 tests, 2 276 pass,
from `rm -rf node_modules && npm install`.**

A BIG turn, and the owner's own list, in his order. Eleven phases; none of them
shrank.

| | | |
| --- | --- | --- |
| **F1** | the dishwasher is a FRONT, a RAIL and a PLINTH | CRITICAL |
| **F2** | cups and handles take the sheet's own mirror | CRITICAL |
| **F3** | a shelf's dimension stands in its own bay | HIGH |
| **F4** | the bevel shader stops flattening the world | HIGH |
| **F5** | one colour source for the shelf-support family | HIGH |
| **F6** | a collar only where a sleeve goes | HIGH |
| **F7** | shelf grain in 3-D follows the sheet | MEDIUM |
| **F8** | the dimension language, four corrections | MEDIUM |
| **F9** | back inset on the quick menu; end panels reach the wall | MEDIUM |
| **F10** | a second brightness slider on the top bar | LOW |
| **F11** | the layer list leaves the editor toolbar | LOW |

---

## The reports

| file | what it says |
| --- | --- |
| **`cnc-export-identity.md`** | every delta in the export, named, with the entity-level evidence behind each — TWO deltas, and the list of phases that move zero CNC entities. |

## The fingerprints

| file | |
| --- | --- |
| `fingerprints-turn27-baseline.txt` → `fingerprints-turn28.txt` | 4 794 → 4 719 rows. **149 changed, 21 added, 96 removed.** Every added and removed row is `DW_PANEL`; of the changed rows, 93 are `DW_PANEL` and 56 are the fourteen `+handles-*` scenarios. |
| `probe-turn27-baseline.txt` → `probe-turn28.txt` | 8 020 → 7 848 rows, GEOM / SHAPE / TEXT / CENSUS. **Not one line of the diff is on any type but `DW_PANEL`.** |
| `handle-move-turn27-baseline.txt` → `handle-move-turn28.txt` | F2b's own delta, hole by hole: 69 rows either side, **18 changed, every one of them `HANDLES_5MM`, not one cup moved.** |
| `fingerprints-diff.txt`, `probe-diff.txt`, `handle-move-diff.txt` | the diffs themselves, committed so the classification can be re-checked without a checkout |

**Two named deltas and no third thing.** F1 is confined to `DW_PANEL` and its
FRONT is byte-identical (`01-F.dxf` = `567e4aea` on the baseline, on this branch
and at the turn-26 merge); its RAIL is `2255e6e5`, which is the file `bd7cec4`
wrote — *"match it"*, matched to the byte. F2b moves a handle's x to the
opposite stile on every DXF that carries one, and nothing else on those files
moves. `cnc-export-identity.md` is the argument, and it says in as many words
that the four boards which left the D/W were wrong to have been there.

## The walk

`walk.json` — **38 ok · 0 failed · 1 blocked.** Run against a real Chromium
through CDP (`scripts/e2e-turn28.mjs`), on the production build served by
`vite preview`.

* **R1** every pointer move and keystroke is `Input.dispatchMouseEvent` /
  `dispatchKeyEvent`. The ban on synthetic DOM events is enforced by a guard at
  the top of the walk that reads its own source and refuses to run.
* **R2** `bucket-live.json` — the live bucket, asked first and before any
  picture of hardware. **BLOCKED**: this session's egress policy answers 403 for
  the storage host, and the proxy's own answer is recorded verbatim. Same
  blocker as turns 22–27; nothing in this turn depends on it.
* **R4** nothing below is inferred from a pixel. F1 reads the D/W's own record
  and then asks the SCENE which pieces it mounted for that unit. F2 measures
  every cup off `doorHingeInstances` — the function `3d/Hardware.jsx` mounts
  every hinge in the room from — and counts what the scene really hung on each
  swinging leaf. F3 asks `shelfColumns`, the resolution the view feeds the one
  dimension component from. F4 reads the blend band the shader is COMPILED with
  and the rebate walls' own normals in the running WebGL. F5 and F6 read the
  MOUNTED materials, by name (`ccMember`, `ccDrillRing`). F7 asks `decors`. F8
  asks `dimensionCarriers` and `frontSizes`. F9 reads the end panel's cut size
  and its drawn depth. F10 reads the store after a real click on the slider.
  F11 reads the editor toolbar's DOM.
* **R5 + R6** `console.txt` — every message the app printed across the whole
  walk. **One line, and it is not the app's:** three.js reporting that this
  headless Chromium has no `WEBGL_lose_context` extension. **Zero uncaught
  exceptions, zero React error-boundary reports** — either would have failed the
  step it appeared in.
* **R8** the silent showroom (`test/fixtures/hardware-local/`), pointed at
  through the documented `localStorage['cc.hardwareBase']` knob.
* **R9** F1 asserts the SCENE draws three pieces for a D/W and no fourth.
* **R10** F2 photographs the leaf's own sheet beside the mounted cups.
* **R11** every dimension in the scene is still found by traversing for
  `ccDimensionChain` — one component, fed a different anchor.
* **R12** F11 finishes what turn 26 F12 started and moves nothing else on the
  toolbar; the walk asserts the four tools and the snap panel are where they
  were.

## The pictures

**The walk's own**, in its order:

| | |
| --- | --- |
| `1a-a-dishwasher-beside-a-base-unit.png` | one toe kick, one worktop line, two cabinets — and one of them has no carcass |
| `1b-no-carcass-behind-the-front-just-the-rail.png` | fronts off: the D/W is a rail and a toe kick |
| `2a` / `2b-the-…-leaf-from-behind-cups-beside-the-arms.png` | both hands, open, from behind — the owner's own photograph re-taken |
| `2c-the-leafs-own-sheet-cups-one-stile-handle-the-other.png` | and the sheet the workshop reads |
| `3a` / `3b-the-ladder-in-the-…-bay.png` | the same cabinet, the shelf moved across the divider, the ladder following it |
| `4a` / `4b` / `4c-the-shaker-rebate-outlines-off-angle-*.png` | three grazing angles, outlines OFF |
| `5a` / `5b-the-shelf-support-family-in-*.png` | gold and silver, sleeve, pin and collar together |
| `6a-collars-on-the-shelf-rows-plain-discs-everywhere-else.png` | |
| `8a-a-run-of-three-identical-units-dimensions-once.png` | |
| `8b-the-front-labels-off-each-others-centre-lines.png` | |
| `9a-the-run-off-the-wall-and-the-end-panel-still-on-it.png` | |
| `10a-the-brightness-slider-on-the-top-bar.png` | |
| `11a-the-editor-toolbar-without-a-layer-list.png` | |

**The before/after pairs** — `before/` and `after/`, four pictures apiece, one
scene, one camera, two builds of the app (`scripts/t28-before-after.mjs` run
against the baseline's `vite preview` and this branch's):

| | before | after |
| --- | --- | --- |
| `f2-sheet.png` | the two handle dots beside the three ⌀35 cups, on one stile | the handle on the opposite stile |
| `f4-rebate.png` | *"mega płasko"* — a flat burgundy rectangle | the 6 mm rebate reads, at the same angle, in the same light |
| `f8-chain.png` | three identical cabinets, three identical chains, `H 770` on each | one chain, on the outermost |
| `f8-fronts.png` | the width and height labels crossing on the centre lines, under the + | 447 a quarter up, 767 clear to the right |

## The measurements

`measurements.json` — every number the walk read, in the order it read them:
the D/W's three pieces and the rail's own geometry; both leaves' cups and
handles on the sheet and in the room; each bay's bearers and ladder flank; the
shader's blend band and the leaf's wall vertices; the family's three metals in
gold and in silver; the ring counts per kind and the drills per layer; the
shelf's grain axis; the run's carriers and the two label placements; the end
panel before and after the inset; the brightness before and after the click;
and the editor toolbar's contents.

## What this turn did NOT settle

**BLOCKERS #95** — F7 puts the shelf's grain front-to-back in the picture and
F7's own second sentence forbids touching the CNC, so the NESTER still lays a
shelf down by its drawn size. The two can differ on that one part; the question
of whether `sheetTurn` should follow the declaration is asked, with both answers
written out, rather than guessed at.

**BLOCKERS #94 is CLOSED** — the owner answered it, and answered it wider than
it was asked.
