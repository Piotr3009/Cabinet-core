# F12 — cornice 100: the diagnosis, then the fix

**Turn 25 · CLAUDE.md F12 · "Diagnose first: option 100 shipped in turn 22 but
the owner only gets 70. Find whether the profile geometry, the panel option or
the resolver is at fault; state the finding here before fixing."**

---

## The finding

**None of the three.** The profile geometry carries the 100, the panel option
offers it and stores it, and the resolver resolves it — all correctly, and all
three were checked before anything was changed:

| Suspect | Verdict | Evidence |
| --- | --- | --- |
| profile geometry | **innocent** | `autoParts.cornice.heights` is `[70, 100]`; `projection` is `{70: 48, 100: 65}`. `corniceSection(100)` returns a 15-point polygon 100 mm tall and 65 deep. |
| the panel option | **innocent** | the right panel renders one button per entry of `heights`, so it offers `None · 70 · 100`, and its handler calls `setCornice(unit.id, 100)`. |
| the resolver | **innocent** | `corniceOption(100)` → 100. `corniceSegments` → one segment at height 100. `segmentCornice` → an element with `height: 100`, `projection: 65`, `rise: 60`. `corniceSolids` → a swept solid spanning y 2150 → 2250, z 578 → 643. |

The fault is one function further on, in a place the feature has no reason to
look: **`sameRun()` in `stores/projectStore.js` never compares a cornice's
height.**

### What actually happens

`refreshAutoParts` recomputes every run element on every change and then writes
the units back — but only where something moved. Reference equality matters
there: it runs on every frame of a drag, and writing a fresh object each time
would re-render every unit in the scene for a run nobody touched. So it asks
`sameRun(old, new)` field by field.

That field list was written for the **top infill, the plinth and the masking
board**. None of them has a height: each is "one board, this long, ending like
this", and the list is `offset · length · faceH · depth · shelfDepth · ends ·
returns · mitres`. Turn 22 added the cornice to the *callers* and did not extend
the *comparison*.

A cornice is the first run element whose **identity includes a height**. So:

```
switch a unit from 70 to 100
  → runCorniceParams builds a genuinely new element   { height: 100, projection: 65, … }
  → sameRun(old70, new100)                            → TRUE
      same offset, same length, same faceH,
      same ends, same returns, same mitres
  → refreshAutoParts returns the unit UNCHANGED
  → run_cornice still says 70
  → the 3-D draws 70, the BOM orders 70
```

The joiner clicks 100 and gets 70. Every time, on every cabinet, since turn 22.

Reproduced before the fix (`sameRun(70, 100) = true`) and after
(`sameRun(70, 100) = false`), against elements built by the real resolver.

### The fix

Two lines in `sameRun`, and the comment beside them says why the list was short:

```js
if ((Number(a.height) || 0) !== (Number(b.height) || 0)) return false;
if ((Number(a.projection) || 0) !== (Number(b.projection) || 0)) return false;
```

Every other field is compared because a moulding that differs in it is a
different length of timber. Height and projection are exactly that. The other
three run elements carry neither, so `undefined === undefined` and nothing about
them changes.

---

## F12.2 — the 100 is RICHER, not bigger

Turn 22 gave both heights the **same section fractions**, so a 100 was a 70
photocopied at 143 %. That is not what a bigger moulding is.

The owner asks for "a larger bottom bead, a deeper cove, a pronounced top land,
projection 65". Projection 65 was already right. The other three are three
different proportions rather than one scale factor, and the section now carries
a per-height override:

| | 70 | 100 | |
| --- | --- | --- | --- |
| `beadHeight` | 0.16 | **0.20** | a larger bottom bead |
| `beadProjection` | 0.30 | **0.26** | standing proud *less* far, which is what leaves the cove a deeper sweep — it travels **48 mm** of projection where the scaled shape travelled 45 |
| `landHeight` | 0.14 | **0.20** | a pronounced top land |

Read back off `corniceSection`:

```
70   bead  14.4 × 11.2      cove to 48 × 60.2     land 70 − 60.2 =  9.8
100  bead  16.9 × 20.0      cove to 65 × 80.0     land 100 − 80  = 20.0
```

The bead is nearly twice as tall, the cove sweeps 48 mm forward instead of 33,
and the land is a fifth of the moulding instead of a tenth.

### The BLOCKER, stated

F12.2: *"the owner has a reference drawing he sent long ago; if it is not in the
repo, ship the parametric richer profile and note that the drawing supersedes it
in a later turn without touching the plumbing."*

**It is not in the repo.** `reference/` holds the eleven AutoLISP kits, the
colour packs (`reference/colors`), the hardware catalogues
(`reference/hardware`) and the production-core sources — and no cornice section
anywhere, under any spelling searched for.

So this is the parametric richer profile, and **the drawing supersedes it
without touching the plumbing**: the section is already read through ONE
function, and the run logic, the BOM and the 3-D all ask that function. Replacing
these three fractions with traced coordinates changes nothing else in the app.

---

## F12.3 — the cornice joins the right-click menu

*"Top cornice joins the unit's right-click menu (none / 70 / 100). Top infill is
already there."*

Three entries rather than one toggle, because a cornice is a **choice of
moulding** and not an on/off — and the heights are read off the profile, so a
workshop that stocks a third gets a third entry with no component work. They sit
in the **run-pieces** group beside the top infill, which is the piece the
moulding is screwed to.

---

## CNC

**Zero.** A cornice is bought moulding, not a cut piece: the BOM orders linear
metres and the exporter never hears about it. The fingerprint report is
unchanged across the whole of F12.
