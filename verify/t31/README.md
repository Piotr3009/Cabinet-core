# Turn 31 — the acceptance walk

Run end to end on a real Chromium against the production build, 15.08.2026.

```
npm run build
npx vite preview --port 4173 &
node scripts/e2e-turn31.mjs            # or --only f1,f4
```

**52 checks · 0 failed · 21 screenshots · 0 empty frames · console clean.**

The numbers behind every line are `measurements.json`; the run itself is
`walk.json`; every console line the browser produced is `console.txt`.

---

## The rules this walk is written under

**Rule 3 — a proof contains its named subject, and an empty frame fails the
phase.** That is enforced rather than promised. `shot()` does not just capture:
it asks the page whether the named subject is on the screen — a rendered
selector, a mounted mesh, some words — and records the answer beside the
picture. A phase whose subject was not there fails, and the picture is still
written so the failure can be looked at. All 21 came back `true`.

**Rule 3 again — browser proofs on REAL pointer input.** Every click, drag,
double-click and hover below goes through `Input.dispatchMouseEvent` /
`dispatchKeyEvent`, and text is typed with `Input.insertText`. Synthetic DOM
events are BANNED, and the ban is a guard rather than a promise: the script
reads itself on the way in and refuses to run if anybody adds one.

**Framed off the meshes, never off a typed camera.** Every picture is framed
from the mounted geometry of the thing it names. Where a phase needed to point
at something small — a handle, a dimension figure on the floor — the camera is
re-aimed at THAT PIECE's own world position, because a frame taken on a
cabinet's bounds can put its handle under the toolbar, and a pointer that lands
on DOM chrome never reaches the scene at all. (It did, twice. That is why the
two phases say so in their own comments.)

---

## F1 — the modal shell, made mandatory

Three different windows, each opened by a different real gesture, each measured
for the two halves of the owner's permanent rule and each dragged by its header.

| picture | what it shows |
| --- | --- |
| `1a-the-cabinet-editor-opened-beside-the-cabinet-it-is-about.png` | right-click → Edit cabinet. The workspace opens maximised (turn 13's one sanctioned exception) and RESTORES to an ordinary shell window — beside the cabinet, not on it |
| `1b-the-same-window-dragged-by-its-header.png` | 286 px by the header, on a real pointer drag |
| `1c-the-door-window-beside-the-door-it-was-opened-from.png` | double-click a leaf; anchored to the leaf, clear of the click at (440, 539) |
| `1d-the-door-window-dragged-by-its-header.png` | 238 px |
| `1e-the-unit-finish-window-beside-the-menu-entry-that-opened-it.png` | a MENU ENTRY is an object too — the window stands clear of the whole menu |
| `1f-the-third-window-dragged-three-of-three.png` | 306 px |

…and the shell's own guard had nothing to report all phase: not one window
opened without knowing what it was about.

## F2 — one dirty gate + three message levels

| picture | what it shows |
| --- | --- |
| `2a-one-of-each-level-red-yellow-and-grey-on-screen-at-once.png` | all three at once — the old slot held one. The red is drawn first, the grey stands in the centre, the two that wait stand at the bottom |
| `2b-the-yellow-is-gone-the-red-has-not-moved.png` | a real pointer-down on the canvas: the yellow goes, the red does not |
| `2c-leaving-with-unsaved-work-the-red-that-follows-you-out.png` | the CABINET CORE badge pressed with unsaved work — "Save the project — unsaved changes", still there on the start screen |

The dirty gate is read off the store rather than off a flag: saved → clean, a
width typed → dirty, a shelf added from a completely different neighbourhood of
the 4 000-line store → dirty. No action writes the flag by hand any more.

## F3 — the guards, wired

| picture | what it shows |
| --- | --- |
| `3a-the-blocked-hinge-move-a-yellow-with-the-number-in-it.png` | the ↓ button pressed until the app REFUSES: "hinge rows at 100 and 155 mm are 55 mm apart — under the 60 mm minimum" |
| `3b-the-export-gate-a-red-naming-the-held-parts-and-export-anyway.png` | after a real export wrote 4 of 6 parts: a red naming both held parts, with "Export anyway" beside it |

The owner's own bug — `hinge_rows [100, 100, 470]` — fails Check #10 with both
codes, and a clean job exports all six parts with nothing said.

## F4 — the front-gap rulebook

| picture | what it shows |
| --- | --- |
| `4a-the-gap-a-client-sees-measured-front-to-neighbour-and-red.png` | 1.5 mm to an END PANEL, red — while the front-to-front joint beside it stays silent at 3.00. Turn 30's measure could not see the first one at all |
| `4b-the-modal-two-options-each-with-its-number.png` | "Narrow the front by 1.5 mm" / "Insert an infill", and the BOM warning BEFORE the button |
| `4c-narrowed-on-one-edge-only-and-the-red-is-gone.png` | after a real click: 597 → 595.5 with `x` unmoved (rule 8), the cups still 21.5 from the edge at identical heights (rule 9), and no red left |

## F6 — Check v1

| picture | what it shows |
| --- | --- |
| `6a-the-check-panel-a-list-of-findings-reds-first.png` | the Check button beside BOM carrying its count, and nine findings — reds first, each naming its cabinet, its part and its millimetres |
| `6b-a-finding-clicked-the-editor-open-on-its-subject.png` | a finding clicked: the right editor open on the piece it named |
| `6c-the-same-list-run-automatically-before-export.png` | Output ▸ Cutting list pressed for real — the same list, unasked |

## F7 — the hover aura

| picture | what it shows |
| --- | --- |
| `7a-the-catchment-a-pointer-beside-the-handle-and-its-number.png` | the pointer aimed BESIDE the rail — inside the catchment, off the 12 mm rod — and "35 from left" standing over the handle in orange |

…and it lingers: one label the instant the cursor leaves, none after the
profile's 300 ms.

## F8 — the dimension figure is a control

| picture | what it shows |
| --- | --- |
| `8a-the-width-figure-double-clicked-and-its-mini-modal.png` | the 600 on the floor double-clicked; the window beside it with BOTH fields and the width in focus |
| `8b-the-cabinet-at-its-new-width-committed-on-enter.png` | 750 typed and committed on Enter, through the existing setter, window closed |

## F9 — the hood wall unit

| picture | what it shows |
| --- | --- |
| `9a-a-hood-unit-beside-a-wall-unit-open-underneath-shorter-door.png` | a hood beside an ordinary wall unit: no bottom board, a 367 mm door standing above a 350 mm aperture where the wall unit's is 717 |

RULE 2 held: every drilling layer on the hood is one the parent wall unit
already cuts. The extractor is a BOM line to the aperture (564 × 350 × 382) and
a GLB slot the scene declares, waiting for a file.

---

## The features with no picture, and why

**F5 (export names), F10 (CORNER → L_SHAPE), F11 (the 155° fixture), F12 (the
sweep)** are proven in node rather than in a browser, and deliberately: a
FILENAME, a saved project opening under a renamed type, the node names inside a
GLB and the absence of a dead export are all facts a photograph cannot settle.
They are `test/turn31-f5-export-names.test.js`,
`test/turn31-f10-l-shape-rename.test.js`, `test/turn31-f11-honest-fixture.test.js`
and `test/turn31-f12-sweep.test.js`, and they read the real bytes:
`71B7550_15001.glb`'s own JSON chunk, a hand-written save carrying the old type
id, and an export audit regenerated on every run.

## What the walk did NOT prove

The LIVE BUCKET was not asked this session. The 155° node names in F11 are the
owner's own, handed over in CLAUDE.md off the live bucket; nothing in this run
measured them, and `reference/hardware/cliptop-hinge-count.json` says the same
thing about the Blum hinge-count table it carries — transcribed from the
published chart, not measured here, and worth reading back against the current
catalogue before a heavy job.
