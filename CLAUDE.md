# CLAUDE.md — TURN 58b · THE PANE BECOMES GLASS FOR REAL, THE LIGHT MOVES BACK, THE NUMBERS LEAVE THE SCREEN

Run autonomously. Zero questions, zero stops. Skip-and-note; sacrifice F5,
then F4 — NEVER F1/F2/F3. PR before morning. Branch `t58b`.

**SAFETY FIRST: this file's first heading says TURN 58b. BASE: `origin/main`
WITH t58 MERGED (the shoe insert, `hingedSidesOf`, `covers.js` exist). If
they do not, stop and say so in the PR description.**

## WHY THIS TURN IS WRITTEN THE WAY IT IS

Two nights in a row the pane was declared glass and photographed opaque.
The owner, live: *"szyba w ogóle nie jest przezroczysta… nic nie widać"*,
and on the light: *"światło jest na krawędzi półki i oświetla fronty
szuflad, a powinno być z tyłu na półce"*. So this spec does not ask you to
SEE; it names the lines and the physics. Follow them literally.

## STANDING LAW (unchanged, enforced)

- **BYTE-IDENTITY.** Goldens byte-identical. `t58b-classify.mjs`,
  `UNNAMED=0`. Engine deltas this turn: ONLY the pane shelf's light record
  (F2) and the per-leaf J run override (F3) — named.
- **LISP.** No geometry law changes → LISP untouched; census 14/14 at 0/0.
- **Sanctity — licensed this turn, and nothing else:** (1) the
  `transmission`/`thickness` physical-glass path of the pane mesh in
  `src/3d/UnitView.jsx` (~548–575); (2) the jpull numeric fields in
  `SettingsPanel.jsx` and `WizardSettings.jsx` (the whole block — physical
  deletion); (3) the T53 "led ring" length record of the glass
  (`born.shelf_glass.led_mm` and its BOM line) — REPLACED by F2's single
  strip, not kept beside it.
- **Petros iron rule (30.08): engine numbers do not enter the UI without
  the owner's order.** F3 adds exactly ONE slider, nothing else.
- One path per job; visible UI entry proven by screenshot; full suite
  never `--silent`; no new npm dependencies.

---

## F1 [CRITICAL] · THE PANE IS ALPHA GLASS — NOT PHYSICAL TRANSMISSION

### The cause (one)

`src/3d/UnitView.jsx` ~565: `<meshPhysicalMaterial color="#eef3f4"
transparent opacity={0.42} roughness={0.06} transmission={0.85}
thickness={0.004} />`. Transmission renders what is BEHIND the pane into
an offscreen buffer; the unlit drawer box behind a closed watch drawer is
dark, so the pane resolves to a dark slab — the exact frames of t57 and
t58. The owner does not want physics; he wants to see the insert.

### The law — the exact material

Replace the pane's material with plain alpha-blended glass:

    <meshStandardMaterial
      color="#5a4636"        // smoky brown — owner: "smoky brąz, a nie szara"
      transparent
      opacity={0.28}
      roughness={0.12}
      metalness={0}
      depthWrite={false}
      side={THREE.FrontSide}
    />

and on the mesh: `renderOrder={20}` (draws AFTER the opaque interior),
`key="pane-alpha"` (three caches compiled programs; a new material
identity is the way to ask for a new program — the file's own Turn-11
note at ~623). NO `transmission`, NO `thickness`. Contour and X-ray keep
their own conduct; the pane never paints solid in either.

### Definition of done — the frame that cannot lie

`verify/t58b/f1-pane-through.png`: watch drawer CLOSED under the pane,
camera 45° from above, room lights on — the insert's pockets and dividers
CLEARLY visible THROUGH the pane. Not a pulled-out drawer beside it.
Second frame `f1-pane-contour.png` in contour mode. Test where the harness
allows: material flags on the pane mesh (`transparent`, `opacity` in
0.2–0.35, `depthWrite === false`, no `transmission` property > 0).

## F2 [CRITICAL] · THE PANE'S LIGHT COMES FROM THE BACK OF THE SHELF

### The cause (one)

There is no drawn "ring": the T53 record `born.shelf_glass.led_mm` only
feeds the BOM. What lights the scene are ordinary shelf strips, whose law
(`src/engine/ledStrips.js` ~265–290) measures the strip's depth FROM THE
FRONT EDGE (default 30 mm) — so any strip under the pane shelf sits at the
front and washes the drawer fronts below. The owner wants the opposite.

### The law

1. The glass BIRTHS its own strip — ONE record, `kind: 'shelf'`, born in
   the engine next to the aperture (the T53 block in `cabinet.js` ~7318):
   under the shelf, along the aperture's BACK edge — `z = shelf.box.z +
   inset`, x spanning the aperture width, the usual thickness law. This
   strip REPLACES `led_mm` (licensed): its length is the BOM's single
   source; `lightingBomLines` counts it like any strip.
2. `LedStrips.jsx` draws it as it draws every strip — no special case,
   the record is ordinary.
3. Nothing is auto-added at the FRONT of the pane shelf. A user's own
   front strip on that shelf stays the user's business — the slider law
   is not touched.

### Definition of done

`verify/t58b/f2-pane-closed-glow.png`: drawer CLOSED, room lights LOW,
warm glow through the smoky pane from the BACK, drawer fronts below NOT
washed. Test: pane shelf → exactly one born strip at the rear (z within
inset of the shelf's back), aperture-wide; BOM shows one line, `led_mm`
gone; a plain shelf without glass births no strip (byte-identical).

## F3 [HIGH] · THE NUMBERS LEAVE THE SCREEN — ONE SLIDER REMAINS

Owner: *"jakieś dziwne ustawienia, po co mi to? ja nie chcę tego… jak
już to pasek albo pokrętło… jedynie wysokość — jeden pasek, przedłuż
wycięcie J na pionowych i tyle, nic więcej."* And on the two entry
points: *"będzie w 2 miejscach do włączenia — do zmiany."*

1. **Delete** (licensed) the jpull numeric block — `runMm`,
   `fromBottomMm`, `rampR`, the five profile constants — from
   `SettingsPanel.jsx` and `WizardSettings.jsx`. The constants stay in
   the profile/engine, unexposed. The handle-system CHOICE itself stays
   exactly where handle systems are chosen today.
2. **One slider.** Click on the J strip of a TALL front → a small
   DRAGGABLE modal beside the object (the house modal law) holding ONE
   control: `J run length`, a slider from 300 to the leaf's own maximum,
   step 10, live preview on drag. Nothing else in that modal.
3. The value is a per-LEAF override (`jpull_run_mm` on the front's
   params); the engine reads it, else the profile default 500. Start
   height and ramp radius are NOT exposed — engine constants.
4. Click-path proof: `verify/t58b/f3-slider.png` (modal open beside the
   door, strip visibly longer than default).

## F4 [HIGH] · THE CLASSIFIER DEBT — t58 AND t58b, NAMED

t58 shipped without `t58-classify.mjs`. Pay it now: `scripts/t58b-classify.mjs`
carries the byte-identity contract for BOTH turns — goldens hashed and
asserted; named deltas for t58 (slope fixtures: phantom drills gone; shoe
fixtures: the insert; wall-infill fixtures: the top infill's span) and
for t58b (pane shelf strip; per-leaf J override); per-feature `--probe`
in the t55/t57 school; `UNNAMED=0`.

## F5 [MEDIUM] · PROPS v1 — ONLY IF THE BUCKET IS FULL

Unchanged from T58 F8, verbatim law. If `props/` or its manifest is
missing: build the machinery, ship the toggle greyed with its reason,
skip the walk, note it. Nothing throws.

---

## ORDER, PROOF, REPORT

**F1 → F2 → F3 → F4 → F5.** F1 and F2 each their own commit, frame
committed BEFORE moving on.

Morning report, numbered: per feature done/skipped; the pane's final
material props verbatim; the born strip's z and length on the fixture;
licensed deletions confirmed; `+X/−Y`; test totals; classifier verdict.