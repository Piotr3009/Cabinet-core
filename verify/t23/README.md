# verify/t23 — turn 23

**The Back button the owner asked for three times, and it becomes a stack.**

Baseline `main` including both chat hotfixes. Tests in **1679**, out **1792, all
green**. Build clean. CNC fingerprints of the golden defaults: **ZERO
difference**. The turn did not shrink — **F1 through F11 all landed**.

---

## The walk

`node scripts/e2e-turn23.mjs` — a real Chromium, driven over CDP.

```
24 ok · 0 failed · 1 blocked
```

The one blocked step is **R2**: this session's egress proxy answers
`403 CONNECT` to the storage host, so the live bucket cannot be asked. That is
recorded with the proxy's own answer in `bucket-live.md` and it is the third
turn running — which is precisely why **R8** exists this turn.

| rule | how this walk honours it |
| --- | --- |
| **R1** | every click, double-click, wheel, hover and keystroke is `Input.dispatchMouseEvent` / `dispatchKeyEvent` / `insertText`. The guard at the top of the walk reads its own source and refuses to run if a synthetic DOM event appears — **it fired once during authoring, on a helper that set the tool fields by assigning `.value`**, and the fields are typed into now. |
| **R2** | `scripts/bucket-live.mjs` before any picture of hardware. Blocked here; recorded. |
| **R4** | every hardware claim reads `window.__cc.hardware` — the registry the SCENE publishes — never a URL this script built for itself. |
| **R5** | the console is captured for the whole walk (`console.txt`). |
| **R6** | **any uncaught error or React error-boundary report FAILS the step it appeared in.** See below — it caught a real bug on the first run. |
| **R7** | no `data-*` on R3F objects. Enforced by a test that sweeps `src/3d`, `src/components` and `src/pages`, not by this walk. |
| **R8** | GLB-dependent steps run against the silent showroom, served on its own origin and reached through `localStorage['cc.hardwareBase']`. |

### R6 earned its keep on the first run

The very first execution of this walk came back with

```
FAIL  R5 + R6 — the console is clean — ReferenceError: fit is not defined
```

F7's extraction of the zoom/pan grammar into `lib/sheetView.js` had left one
dangling `fit` reference in the CNC sheet's toolbar. It threw on every render of
that toolbar. **Nothing else in the walk would have noticed** — the sheet still
drew, the parts were still there, and every assertion about the sheet passed.
That is the exact shape of the ruler bug R6 was written for, caught the first
time the rule was applied.

The walk also found a real usability gap: a ⌀3 hole drawn `fill: none` in the
part detail is a HAIRLINE, and hovering or clicking it was a matter of luck. The
detail now carries the sheet's own `hoverGracePx` rule.

---

## The screenshots

| file | what it shows |
| --- | --- |
| `1a-part-detail-with-back.png` | **F1** — the detail, with ← Back beside its title, pushed OVER the editor |
| `1b-back-to-the-same-cabinet.png` | …and the same cabinet view it came from |
| `2a-door-closed-hinge-in-its-bore.png` | **F2** — the door shut |
| `2b-door-open-the-body-rides-the-leaf.png` | …and open |
| `2c-hinge-close-up-door-open.png` | **the phase, close up**: the body travels with the leaf, the plate stays — and there is no black drum |
| `4a-finish-nickel.png` / `-close-up.png` | **F4** — the models in nickel |
| `4b-finish-onyx.png` / `-close-up.png` | …and in onyx, same hinge, same drilling |
| `5a-partition-probe-sheet.png` | **F5 + F6** — the partition probe on the sheet |
| `7a-detail-zoomed.png` | **F7** — the detail, zoomed by a real wheel |
| `8a-detail-hover-dimensions.png` / `8c-…-close-up.png` | **F8.1** — thin blue dimension arrows on hover |
| `8b-scene-hover-bay-widths.png` | **F8.2** — the clear bays either side of a hovered partition |
| `9a-edited-by-hand-badge.png` | **F9** — "✎ edited by hand · 2 changes" |
| `9b-back-to-computed.png` | …and the part stock again |

---

## The documents

| file | what it settles |
| --- | --- |
| `cnc-export-identity.md` | **F5 + F6.** Both classes named, both LISP lines quoted, ZERO on the golden defaults |
| `hinge-meshes.md` | **F3.** The mesh tables, the tool, and the drum's verdict — *the drum is not in the file; it is ours* |
| `bucket-live.md` / `.txt` / `.json` | **R2.** The refusal, verbatim, and the one command that closes it elsewhere |
| `walk.json` | every step, with the console attached |
| `console.txt` | the whole session's console |
| `measurements.json` | what the walk MEASURED rather than photographed |

## The CNC evidence

| file | what it is |
| --- | --- |
| `fingerprints-turn22-baseline.txt` | the baseline — **byte-identical to `verify/t22/fingerprints-turn22.txt`**, which is itself the proof that F1–F4 moved no CNC at all |
| `fingerprints-turn23.txt` | this branch |
| `fingerprints-diff.txt` | 36 cases moved, **every one of them a partition case**; ZERO non-partition |
| `probe-turn22-baseline.txt` / `probe-turn23.txt` / `probe-diff.txt` | the entity-by-entity probe. Two entity classes move across the whole sweep: `poly/BISCUIT_4MM` (to zero) and `circle/SCREWS_3MM` (count). No third |

`scripts/cnc-delta-probe.mjs` gained three **partition** scenarios this turn. It
had none — so it could not have seen either of this turn's classes — and the
baseline was re-run with the same probe file so both runs ask the same
questions.

---

## Reproducing it

```
npm test                                   # 1792, all green
npm run build
npx vite preview --port 4173 &
node scripts/e2e-turn23.mjs                # starts its own fixture server on 4174

node scripts/make-fixture-hardware.mjs     # rebuild the silent showroom
node scripts/glb-meshes.mjs --md <file|url>…   # the F3 mesh table, on any GLB
node scripts/cnc-fingerprint.mjs
node scripts/cnc-delta-probe.mjs
node scripts/bucket-live.mjs               # R2, from a machine that can reach the host
```
