# verify/t24 — turn 24

**The hinge learns to bend, and the pencil learns to draw.**

Baseline `main` after the turn-23 merge (`12dbd9b`), including the
chat-delivered hinge-pose fix, the ruler fix and the STEP-derived hinge model.
Tests in **1792**, out **1901, all green**. Build clean. The turn did not
shrink — **F1 through F12 all landed**.

CNC: one GLOBAL named delta (F4's −0.5 axis shift), three probe-only named
deltas (F6/F7's fix shelf, F8's partition orientation), one TEXT-only delta
(F9's shelf tag), and **zero** everywhere else. All of it named, counted and
classified in `cnc-export-identity.md`.

---

## The walk

`node scripts/e2e-turn24.mjs` — a real Chromium, driven over CDP.

```
60 ok · 0 failed · 1 blocked
```

The one blocked step is **R2**: this session's egress proxy answers
`403 CONNECT` to the storage host, so the live bucket cannot be asked. That is
recorded with the proxy's own answer in `bucket-live.md`, and it is the fourth
turn running — which is precisely why **R8** exists.

| rule | how this walk honours it |
| --- | --- |
| **R1** | every click, move, wheel, drag and keystroke is `Input.dispatchMouseEvent` / `dispatchKeyEvent` / `insertText`. The guard at the top of the walk reads its own source and refuses to run if a synthetic DOM event appears. |
| **R2** | `scripts/bucket-live.mjs` before any picture of hardware. Blocked here; recorded. |
| **R4** | every hardware claim — urls, counts, **members, node names and the fold pivot** — reads `window.__cc.hardware`, the registry the SCENE publishes, never a fact this script built for itself. |
| **R5** | the console is captured for the whole walk (`console.txt`). |
| **R6** | any uncaught error or React error-boundary report FAILS the step it appeared in. |
| **R7** | no `data-*` on R3F objects — swept by `test/turn23-f2-f4-hardware.test.js` and `test/turn24-f8-f12.test.js`, not by this walk. |
| **R8** | GLB-dependent steps run against the silent showroom on its own origin, reached through `localStorage['cc.hardwareBase']` — and its nodes carry **the real export's own `bau…` names**, so F1.3's split-by-name is exercised rather than its fallback. |

### What the walk found that the suite could not

Two real bugs, both in F2's drawing board, both invisible to 1901 unit tests
because both are about what the POINTER finds:

**1. The annotation layer was stealing the click.** A witness line is a hairline
that runs from a feature's own centre out to the edge it is measuring from — so
it lies exactly across the thing it describes, and it is painted after it.
Hovering a pocket drew the arrows; the click that followed landed on an arrow
and selected nothing. Which feature it happened to depended on where a line fell
to the pixel, which is the worst kind of bug, because it looks like luck. Fixed
by the rule the machinings already kept one layer up: **the drawn ink carries
the look, the grace shapes carry the pointer.**

**2. The drill popover ran away from the hand reaching for it.** The popover is
a sibling of the drawing, so moving the cursor ONTO it is moving the cursor OFF
the sheet. The box was anchored to the LIVE pointer, so that leave-event sent it
to the default corner — out from under a hand already travelling towards Stamp.
The click went through to the drawing behind it and, with the drill armed,
**quietly re-pointed the very hole the popover was still asking about**: a
joiner would have answered a question about one hole and got another. Fixed
twice over — the anchor is the last place the hand was and does not move, and a
question on screen is answered before the sheet takes another point.

The walk now asserts both directly (`F2.6 — reaching for Stamp does not move
Stamp`, `F2.6 — the hole that is stamped is the hole the popover was holding`),
and the diagnosis is in `measurements.json`: the popover's own `data-drill-at`
read before a button was pressed, beside the rect of the Stamp button before and
after the hand arrives.

---

## The evidence

### The rig (F1)

| file | what it shows |
| --- | --- |
| `rig-members.md` | the `bau…` table, re-verified — and honest about which column a 403 leaves unverified |
| `1a-rig-closed.png` | closed: both members together on the leaf |
| `1b-rig-45.png` | mid-swing, taken while the door is still travelling — a picture of the JOINT, not of two end states |
| `1c-rig-90.png` | open: member A gone with the door, member B folded at the axis, the plate untouched |
| `1d-rig-90-close-up.png` | the same at 4× on the hinge's own bounding box |

Measured, not eyeballed: 6 of 6 cups travelled, **0 of 6 arms** moved, 6 of 6
folded by −1.7279 rad (= 99°, this leaf's own opening angle), 0 of 6 plates
moved a micron.

### The pencil (F2)

| file | what it shows |
| --- | --- |
| `2a-editor-osnap-and-live-dimensions.png` | the toolbar, the snap panel, the marker under the cursor and the blue H/V live dimensions |
| `2b-editor-osnap-close-up.png` | the osnap marker at 3× — a real cursor over a real feature |
| `2c-editor-the-number-in-flight.png` | the mock's `37`, floating at the cursor |
| `2d-editor-drill-popover.png` | ⌀ and depth, asked once |
| `2e-editor-drawn-by-hand.png` | the badge, and everything drawn on this print |
| `2f-editor-back-to-computed.png` | …and the part restored, byte for byte (6520 → 6520) |

The line and the dowel row reach the FILE, and it is proved by parsing the
export rather than grepping it: open polylines 0 → 1, circles 34 → 58. A count
that netted a deleted closed poly against a drawn open one would report "no
change" for two changes.

### The rest

| file | what it shows |
| --- | --- |
| `5a-partition-doors-with-their-hinges.png` | F5 — the bay door on a partition, wearing its hardware at last. Mounted instances == `hinge_centers` for every leaf, including the one hung on `VPART-1` |
| `7a-detail-zoomed.png`, `7a-fix-shelf-and-partition-sheet.png` | F7/F8 — the fix shelf's joint and the partition drawn along the grain |
| `10a`, `10b`, `10c` | F10 — the hover arrows, and the same arrows still there after a ~3 mm twitch (and gone after 40 mm) |
| `11a-partition-chain.png` | F11 — every partition showing the clear distance from its LEFT neighbour |
| `12a` / `12b` | F12 — the sprayed door **with** the hardware probe present in the scene and **without** it. The owner's eye test: the lacquer must look identical in both |
| `12d…`, `12e…` | F12 — nickel and onyx, reflecting, same model |

F12's numbers, off the scene: **30 of 30 metals** carry the probe, **0 of 12
plastics** do (a release lever is moulded POM), **0 of 48** board and front
materials carry one, and the scene never wears the hardware probe.

### The CNC

`cnc-export-identity.md` — the four named deltas, the classifier's summary, and
the count of everything that did not move. Raw:
`fingerprints-turn23-baseline.txt`, `fingerprints-turn24.txt`,
`fingerprints-diff.txt`, `probe-turn23-baseline.txt`, `probe-turn24.txt`,
`probe-diff.txt`, `axis-classifier.txt`.

### The rest of the paperwork

* `walk.json` — every step, its result and its measured detail
* `measurements.json` — the numbers the assertions were made from
* `console.txt` — the console for the whole walk, and it says so when empty
* `bucket-live.md` / `.txt` / `.json` — R2, and what a 403 does and does not cost
