# Light — F7 (the element editor) and F8 (wall units versus base units)

Both phases are the owner's eye-test verdicts, and CLAUDE.md forbids answering
either of them by eye:

> F7 … This is a browser-loop phase: measure pixel luminance on a detail region
> before/after, screenshot both to `verify/t16/`. **Do not eyeball it in code.**
>
> F8 … DIAGNOSE FIRST in the browser loop, fix what is found …
> **Publish the measurement (numbers, not impressions)** in `verify/t16/`
> whichever way it lands.

Everything below is read off real pixels. A WebGL canvas cannot be asked for its
pixels after the frame is composited, so the pictures are DevTools screenshots
and the pixels are decoded from the PNG (`scripts/png.mjs`, node's own `zlib`,
no new dependency). Luminance is Rec. 709, 0–255.

---

## F7 — "serio nic nie widać"

### What was wrong

The element detail window and the exploded cabinet editor each carried **three
lights as literals in their own JSX** — an ambient at 0.75/0.8 and two
directionals. That is a rule-3 violation (numbers live in profile.js) and, more
to the point, a rig with no knob on it: the owner could not turn it up, and the
two windows showing the same part could drift apart.

### What was done

One rig, in the profile — `appearance.editorRig` — consumed by both windows
through `src/3d/EditorRig.jsx`, with the arithmetic in `engine/render.js
editorRigLamps` (pure, so a node test can hold it). It is deliberately NOT the
studio rig: the studio lights a ROOM for a picture of furniture; this lights ONE
PART held up on a bench, where what has to read is the machining.

| | before (the JSX literals) | after (`appearance.editorRig`) |
|---|---|---|
| ambient | 0.75 | 0.95 |
| hemisphere | — | sky `#fff6ec` / ground `#c8c2b4`, 0.85 |
| key | 1.6 | 2.0 |
| fill | 0.5 | 0.65 |
| side (new) | — | 0.9, from the left and low |
| under (new) | — | 0.55, from below |
| back (new) | — | 0.7, from behind |
| **total output** | **2.85** | **6.60** |

The three new lamps are the half that matters. A dog bone, a ⌀5 hinge hole and
an edge break are read off the shading INSIDE a 6 mm feature, and a socket wall
facing away from the key is black however bright the key is.

### The measurement

The same cabinet, EXPLODED (the machining is inside the box until the box comes
apart), in the maximised editor window; the same 579 × 481 detail region in both
frames. Measured over the FURNITURE only — pixels under luma 244 — because the
window's ground is a flat `#fafaf8` and a mean taken over it reports the paper
rather than the parts.

| | mean | median | p05 (the darkest twentieth) | p95 | contrast | share under 40 |
|---|---|---|---|---|---|---|
| before | 166.0 | 185.0 | 50.0 | 207.9 | 157.9 | 0.040 |
| after | **193.8** | **217.3** | **59.9** | **230.1** | **170.2** | 0.040 |
| | **+17 %** | +17 % | **+20 %** | +11 % | +8 % | unchanged |

Pictures: `10a-editor-light-before.png`, `10b-editor-light-after.png`.

The number that answers the complaint is **p05 +20 %**: the darkest twentieth of
the parts — the insides of the sockets and the shaded faces — came up by a fifth
while the CONTRAST went up rather than down. The rig was raised without flattening
the modelling, which is the whole difficulty with "make it brighter".

---

## F8 — wall units do not shine like the base units

CLAUDE.md gives two branches, and the diagnosis picks one:

> - read the actual door materials of a wall vs base unit from the scene … same
>   roughness/env/colour? If not — material path bug; fix at the root.
> - if materials are IDENTICAL, it is geometry … Then the fix is the rig … as
>   DATA in profile, re-measured.

### The diagnosis: the materials are identical

Read out of the LIVE scene through the app's own handle (`window.__cc.views.room`,
turn 13's `3d/viewHandle.js`). Every panel mesh carries its engine panel id since
this turn, so the reading names the door it measured.

| | wall unit door `WU02-F` | base unit door `01-F` |
|---|---|---|
| colour | `#f2f0ec` | `#f2f0ec` |
| roughness | 0.4 | 0.4 |
| metalness | 0 | 0 |
| envMapIntensity | 0.25 | 0.25 |
| clearcoat | 0.35 | 0.35 |
| clearcoatRoughness | 0.12 | 0.12 |

**No material-path bug.** "Coś z farbą jest nie tak" is not the case: a wall
unit's door and a base unit's door come out of `surfaceFor` byte for byte the
same, which is what one would hope given that they go through the same
`material_role === 'front'` path.

### The measurement: the symptom does not reproduce on this baseline

A controlled pair — one base unit and one wall unit **on the same wall at the
same x**, both with doors — measured on the doors themselves. Where each door is
on screen is computed from the live camera (`Box3` → `project`), so these are
readings of the two doors and not of two bands of a photograph.

Shipped rig (the four points: a pair at 1650, a pair at 500):

| door | mean | top 2 % | contrast |
|---|---|---|---|
| wall `WU02-F` | **244.1** | 244.1 | 0.3 |
| base `01-F` | 241.4 | 242.1 | 1.0 |

The wall door is **2.7 brighter**, not darker. On a coloured job — the same pair
with the fronts sprayed RAL 3005 — the gap is far wider in the same direction:

| door | mean | top 2 % | contrast |
|---|---|---|---|
| wall | **115.2** | 120.4 | 7.6 |
| base | 92.4 | 98.0 | 8.2 |

**+22.8 in favour of the wall unit.** (`gloss-lab.json`, rows "shipped
4-point".) That is the low pair at 500 doing its job from turn 16's chat batch:
it was added because BASE doors were falling into the floor's shadow, and it
lifted them — but the eye pair at 1650 sits almost exactly on a wall door's
centre line (mount 1500 + 720/2 = 1860), so the hanging doors were never the
ones in shadow.

### The candidate fix was measured, and it is the wrong way round

`scripts/t16-gloss-lab.mjs` sweeps four candidate rigs against the same pair —
including the two CLAUDE.md names, the eye pair moved and a dedicated pair.

| rig | wall mean | base mean | wall − base |
|---|---|---|---|
| shipped 4-point | 115.2 | 92.4 | +22.8 |
| eye pair raised to 1860 | 114.7 | 91.1 | +23.6 |
| a wall pair at 1860, intensity 6 | 125.3 | 98.1 | +27.2 |
| a wall pair at 1860, intensity 9 | 130.0 | 100.9 | +29.1 |
| a wall pair at 1860, intensity 12 | 134.3 | 103.6 | +30.7 |

(RAL 3005 fronts; the broken-white rows are in `gloss-lab.json` and say the same
thing three units apart.)

Every candidate makes the wall units brighter STILL, and widens the gap the
report says is the wrong way round already. **So the rig is not changed.** F8
says "fix what is found", and what is found is that the fix the report implies
would push the picture further from what the owner is asking for.

### What is left, and how to close it

The one thing the numbers DO show is that neither door reads as GLOSS at the
default sheen: on broken white the specular spread is 0.3–1.0 of 255, because a
near-white door at this exposure is already at the top of the range and a
highlight has nowhere brighter to be. On a coloured door it is 7.6–8.2 — visible,
but not what a workshop means by a gloss door.

That is a real, measurable thing to work on and it is NOT what F8 describes, so
it is recorded in BLOCKERS rather than fixed under a heading that does not cover
it. The bench is left ready: `node scripts/t16-gloss-lab.mjs` measures any pair
of cabinets in any project in one command, so the owner's OWN scene — his
colour, his camera, his mounting height — can be measured instead of described,
which is the one input this diagnosis is missing.
