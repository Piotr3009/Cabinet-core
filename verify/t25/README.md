# verify/t25 — the proofs of turn 25

**Baseline: the turn-24 merge, `b6fc5c3`. Suite at that commit: 1 901 tests,
1 901 pass. Suite at the end of this turn: 2 038 tests, 2 038 pass.**

---

## The reports

| file | what it says |
| --- | --- |
| **`edge-guard.md`** | F1 — the post-mortem, the tolerance (0.01 mm), the winding convention, the panels checked, and **the two real faults the guard found in our own exporter on its first run** |
| **`cornice-100.md`** | F12 — the diagnosis *before* the fix: the profile geometry, the panel option and the resolver are all innocent, and the fault is a change-detection list that never learned a cornice has a height |
| **`cnc-export-identity.md`** | every delta in the export, named, with the entity-level evidence behind each |

## The walk

`walk.json` — **22 ok · 0 failed · 1 blocked.** Run against a real Chromium
through CDP (`scripts/e2e-turn25.mjs`), on the production build served by
`vite preview`.

* **R1** every click, wheel, drag and keystroke is `Input.dispatchMouseEvent` /
  `dispatchKeyEvent`. The ban on synthetic DOM events is enforced by a guard at
  the top of the walk that reads its own source and refuses to run.
* **R2** `bucket-live.json` — the live bucket, asked first and before any
  picture of hardware. **BLOCKED**: this session's egress policy answers 403 for
  the storage host, and the proxy's own answer is recorded verbatim.
* **R4** every hardware claim reads `window.__cc.hardware` — the registry the
  SCENE publishes — never a URL this script built for itself. This turn's own
  hardware reports there too: `2 rows, bar, gold, parent front`.
* **R5 + R6** `console.txt` — the whole walk's console. **The app printed
  nothing.** Any uncaught error or React error-boundary report would have failed
  the step it appeared in.
* **R8** every GLB-dependent step runs against the silent showroom
  (`test/fixtures/hardware-local/`, served on :4174, pointed at with the
  documented `cc.hardwareBase` knob). The mounted hinge is the model, over the
  app's own URL.
* **R9** proven **in the app**, not only in the suite: the door is removed
  through the store, the drilling is read again — `HINGES_5MM`,
  `FRONT_HINGES_35MM`, `FRONT_HINGES_3MM`, `HANDLES_5MM` and
  `SHAKER_PANEL_POCKET` are all gone, leaving only the carcass's own classes —
  and then added back, and the whole drilling compares **byte for byte** to what
  it was.

`measurements.json` carries every number the walk read off the app.

### What the walk found

A defect the suite could not see. `Scene.jsx` memoised its results on `units`
alone, and `allResults()` computes through `paramsForEngine(unit, design)` — so
a DESIGN-level change is a change to the geometry. "Add a handle" recomputed
nothing and the scene went on drawing doors with no handle on them until
something else happened to touch a cabinet. Fixed by adding the design to the
dependency; it is replaced whole on every write, so reference equality is right
and a drag never touches it.

## The screenshots

| | |
| --- | --- |
| `3a-shaker-at-a-grazing-angle.png` | **F3.3.** A rebate 6 mm deep is invisible from in front; what makes it read is the shadow its top wall throws when the light is nearly along the face. Camera placed on the scene's own camera, tool chrome off, clipped to the door at 2×. The frame, the recessed panel and the shadow along the top rail and the stile are all there. |
| `4a-gold-bar-on-a-base-door.png` | **F4.3.** The procedural gold bar, on its posts, at the reference point the owner's law puts it at — 50 from the top, on the shaker stile. |
| `6a-sleeves-in-an-adjustable-shelf-beside-a-fix-one.png` | **F6.2.** Four sleeves in the adjustable shelf's ⌀7.5, and nothing at all on the fix shelf beside it. That difference *is* the feature. |
| `2a-the-shallow-cabinet-single-joint.png` | **F2.3.** A 200 mm cabinet's sheet: one socket per run instead of two, one pair of ⌀7.5 instead of two. |
| `7a-the-four-group-export-tree.png` | **F7.** The tree and its five quick-select buttons. |
| `13a-front-dimensions-on.png` / `13b-…-off.png` | **F13.** On, and the clean scene it goes back to. |
| `15a-every-door-open.png` | **F15.** One press on the toolbar. |

## The CNC evidence

| file | |
| --- | --- |
| `fingerprints-turn24-baseline.txt` | 3 155 rows, taken on `b6fc5c3` — and identical to the file turn 24 published |
| `fingerprints-turn25.txt` | 4 072 rows |
| `fingerprints-diff.txt` | the whole diff |
| `fingerprints-diff-f1.txt` | F1's own diff, kept separately because it is the turn's most important one |
| `probe-turn24-baseline.txt` · `probe-turn25.txt` · `probe-diff.txt` | the ENTITY-level probe, with this turn's new **order-blind `SHAPE` section**: 277 GEOM lines move and **zero SHAPE lines move on any carcass board**, which is what proves F1's fix was a re-order and nothing more |

## What is NOT here, and why

**`bucket-live`** is BLOCKED, not skipped. The sandbox's egress proxy refuses
the storage host with a 403 and `bucket-live.json` carries its answer. Every
hardware picture in this folder is therefore taken on the silent showroom (R8),
whose GLBs are synthetic, at the real measured dimensions, with the real
export's own node names, and contain no Blum bytes.
