# CLAUDE.md — Cabinet Core, TURN 9

Read this whole file before touching anything. Execute all phases in order,
full autonomy, zero questions. If a phase cannot be landed CLEAN, revert that
phase completely and record why in BLOCKERS.md — "clean or not at all".

---

## 0. IRON RULES (unchanged from turns 1–8)

1. **Engine purity.** Nothing in `src/engine/` imports React or three. Pure JS,
   pure math. `grep -rn "from 'react'\|from 'three'" src/engine/` must stay empty.
2. **profile.js is the only home of numbers.** Different workshops = different
   NUMBERS, never different formulas. Any new constant (light intensity, shadow
   bias, gap threshold, sheen mapping) goes into `src/engine/profile.js` with a
   comment saying what it is in workshop language.
3. **Golden fixtures are inviolable.** `git diff --stat fixtures/` must be empty
   at the end of the turn. LISP files in `reference/lisp/` are the mathematical
   source of truth. Deviations from LISP exist only as PROJECT decisions in
   `paramsForEngine()` — bare `computeCabinet()` always cuts like the kit.
4. **No new dependencies.** `package.json` dependencies must be byte-identical
   at the end of the turn. `@react-three/drei` 10.7.6 is ALREADY a dependency —
   use it, do not bump it.
5. **Mock mode is sacred.** Everything must work with no `.env`, no Supabase.
   Graceful degradation, localStorage fallback, as today.
6. **0.5 mm precision end-to-end.** `formatMm()` everywhere a millimetre is
   shown. Never `Math.round` on mm in UI code.
7. **CNC view is untouchable.** Do not modify `CncView.jsx` or anything the CNC
   export path reads, beyond what a phase explicitly requires (none do).
8. **Code and comments in English.**
9. **npm discipline.** Any install is FULL: `rm -rf node_modules && npm install`
   — never `--silent`. If test totals suddenly drop or jspdf crashes suites,
   reinstall BEFORE concluding anything. This container has eaten jspdf four
   times.
10. **GitHub Actions is red by design** (billing disabled). Ignore CI status.
    The final gate below replaces it.
11. Open a PR at the end. Do NOT merge it.

Baseline on main: **727/727 tests, clean build.**

---

## F0 — Baseline + #35 patch (vanity 600)

1. `rm -rf node_modules && npm install` (full). `npm test` → expect 727/727.
   `npm run build` → clean. If not, STOP, reinstall once more, then record in
   BLOCKERS and continue only if green.
2. Check `src/engine/profile.js` (~line 310): if the **vanity base default
   height is not 600**, apply decision #35:
   - vanity base = **600** in `profile.js`
   - update the two assertions in `test/new-project.test.js` (~lines 88, 102)
     that encode the old value.
   If main already has 600, skip — this patch may have been pushed separately.
3. Re-run tests. All green before F1.

---

## F1 — [CRITICAL] Render fix: kill the stripes, keep the floor shadows

**Problem (diagnosed, not guessed):** diagonal stripe artefacts on fronts in
BOTH the working view and 4K renders = **shadow acne**. Root causes:
(a) the key light's shadow frustum spans the WHOLE furniture fit (`±reach`)
while the working map is only 1024 px → ~5 mm per shadow texel on a 4–5 m run;
(b) **no `normalBias` at all** — the modern fix for acne on flat surfaces;
(c) the render preset raised mapSize to 4096 but LOWERED bias to −0.00018, so
acne survives even at 4K;
(d) ambient 0.2 vs key 1.0 makes shadowed bands high-contrast and visible, and
lacquer clearcoat doubles them.

Reference for the target look: Prime-Sash-Windows floods the scene with fill
(colour reads bright and clean from every angle), keeps exactly ONE
shadow-casting light, and grounds the object with a soft ContactShadows blob.
We adopt that philosophy while keeping our three-role rig.

**Changes — all numbers in `profile.js`, wiring in `src/3d/Scene.jsx`:**

1. `appearance.studio` (working + render, one rig as in T8):
   - `ambient: 0.2` → **`0.45`**
   - ADD **`hemisphere: { sky: '#fdf6e8', ground: '#c8c0b0', intensity: 0.5 }`**
     and render a `<hemisphereLight>` in `Lights` (no shadow).
   - `fill: 0.5` → **`0.55`**
   - `key: 1.0` and `rim: 0.3` unchanged. Key remains the ONLY shadow caster.
2. `render.shadow` presets:
   - `normal: { mapSize: 2048, radius: 4, bias: -0.0002, normalBias: 0.02 }`
   - `high:   { mapSize: 4096, radius: 7, bias: -0.0001, normalBias: 0.01 }`
   Wire `shadow-normalBias={shadow.normalBias}` on the key light in `Scene.jsx`.
   Canvas stays `shadows="soft"`.
3. **Contact shadow under the furniture** (drei `ContactShadows`, already a dep):
   - One instance at floor level, sized/positioned from the same furniture fit
     the key light uses (`ShadowFit`), with `frames={1}` and a React `key` that
     changes when units/layout change — so it renders once per layout change,
     not per frame (working view must stay cheap).
   - Numbers in `profile.js` → `appearance.contactShadow` already exists as a
     merge slot; give it real values: `{ opacity: 0.5, blur: 2.5, farMm: 400 }`
     (convert mm→m at the Scene boundary as elsewhere).
   - Visible in Solid and Render. NOT in CNC / Contour / X-ray.
4. **Spray stays envMap-free.** RAL is sacred. The T8 hybrid rule (spray = no
   environment, melamine/decor = environment) is unchanged. Verify by reading
   `src/3d/materials.js` after your edits.
5. Sanity: orbit the default demo scene mentally — the deliverable here is
   values + wiring; the eye test is Piotr's. Your gate: tests green, build
   clean, no per-frame ContactShadows re-render (check the `frames` prop).

---

## F2 — [HIGH] Adding units: "+" buttons replace the arrows

Piotr's verdict: the current arrow-based add/side-picking UI is confusing.
**Approved for removal** — this is an explicit owner decision, log it in
BUILD-LOG.

**New behaviour:**

1. At the LEFT and RIGHT free end of every run (and between a run end and a
   wall) show a **"+" affordance** anchored in 3D at floor/mid height of the
   end face. Reuse the existing screen-anchored overlay pattern already used by
   labels/context menu — do not invent a new overlay system.
2. The plus is visible only while the free gap on that side is
   **≥ `profile.ui.addPlusMinGapMm`** — ADD this constant to `profile.js`,
   value **100**. Gap = distance to the wall or to the next unit/run on that
   side. Below 100 mm the plus disappears.
3. Click on a plus → open the **Library modal in insert mode**, carrying
   `{ near: <unitId at that end>, side: 'left' | 'right' }`. On type pick →
   call the existing `projectStore.addUnit(typeId, { near, side })`
   (projectStore.js ~line 901) so the unit lands on the clicked side. The T8
   left-insert mechanics already exist — REUSE them; this phase changes the
   trigger UI, not the insertion logic.
4. Remove the arrow UI (find it — likely `UnitView.jsx` / `CanvasToolbar.jsx` /
   toolbar dimension-arrow adjacents; remove only the ADD arrows, never the
   dimension arrows from T3).
5. Tests: unit-test the gap math (pure function, engine or store level):
   plus visible/hidden across the 100 mm threshold, both sides, wall and
   unit-neighbour cases, 0.5 mm precision respected.

---

## F3 — [HIGH] Shelf spacing after "centre/equalise" — LISP formula, verbatim

Piotr's verdict: after centering, gaps are NOT equal. The invented math goes
out; the kit math comes in.

**Source of truth:** `reference/lisp/KIT_WARDROBE_FULL.lsp` lines 133–142:

```
spacing = (shelfZoneTop − shelfZoneBottom) / (numShelves + 1)
shelfY_i = shelfZoneBottom + spacing · i        for i = 1..numShelves
```

N shelves divide the zone into **N+1 equal gaps**. Also read the drilling/side
sections of `KIT_WARDROBE_FULL.lsp` and `KIT_BUD_FULL.lsp` to confirm how
shelf thickness relates to `shelfY` (line position vs board face) and mirror
that exactly.

1. Locate the current centre/equalise action (hits for equal/distribute in
   `projectStore.js`, `RightPanel.jsx`, `ContextMenu.jsx`) and replace its
   position math with the LISP rule at that layer. Engine stays pure; if the
   helper belongs in the engine as a pure function, put it there.
2. The shelf zone bounds must be the same ones the engine/LISP use (above
   drawers / partition where applicable) — not ad-hoc UI bounds.
3. Tests (`node:test`): assert exact positions for 1, 2 and 3 shelves in a
   known zone, including a case with drawers below (zone offset), values
   derived by hand from the LISP formula. `fixtures/` diff must remain 0.

---

## F4 — [HIGH] Per-element editing (shelves first-class)

Today nothing inside a unit is individually editable. Piotr wants:

1. **Element selection.** Click a shelf (and partitions where they render) →
   that ELEMENT is selected and highlighted (same emissive/selection treatment
   units get), selection state = `{ unitId, elementRef }` in `uiStore`.
   Clicking elsewhere / ESC clears as today.
2. **Grab & pull in depth.** With a shelf selected, dragging it moves it along
   the unit's depth axis: pointer capture on the shelf mesh, clamped between
   the rear construction plane (the −20 default setback family) and the front
   face (flush pull-out already exists from T8). Snap/format via the 0.5 mm
   rules. This sets a per-element `depthSetbackMm` override.
3. **Per-element properties** in `RightPanel.jsx` when an element is selected:
   - `depthSetbackMm` (number field, same clamps as the drag)
   - `thicknessMm` override (this shelf only)
   - `material` override (this shelf only — choices limited to the project's
     materials 1–3 + front material, same source Design Settings uses)
4. **Data model:** overrides live on the unit's config in the DESIGN layer
   (the `paramsForEngine()` pattern — same place the plinth/−20 decisions
   live). The engine consumes them as inputs; no formula changes. Bare
   `computeCabinet()` without overrides must cut exactly as before.
5. **Downstream truth:** BOM/cutting list reflect the override — a 25 mm shelf
   is a 25 mm part with its own material label; drawings and CNC grouping pick
   it up through the existing part pipeline (do not fork the pipeline).
6. **Persistence:** overrides round-trip through project save/load in mock
   mode (localStorage) exactly like other unit config.
7. Tests: override → BOM part thickness/material assertions; drag clamp math
   as a pure function; save/load round-trip of overrides. Fixtures diff 0.

Scope guard: shelves (adjustable + fixed) and vertical partitions. Do NOT
build per-element editing for carcass sides/tops/backs in this turn.

---

## F5 — [MEDIUM] Sheen scale: 5–100 % in steps of 5

The T8 scale (0–25) is wrong. Piotr specifies lacquer the industry way:
**5 % (dead matt) … 100 % (full gloss), step 5.**

1. `SheenSlider.jsx`: range 5–100, step 5.
2. Mapping in `profile.js` (numbers, not formulas scattered in components):
   `roughness = 1 − sheen/100`. Update every consumer
   (`src/3d/materials.js`, `src/engine/design.js`, Design Settings, New
   Project flow).
3. **Migration:** any stored sheen value ≤ 25 is old-scale → multiply by 4 and
   clamp to [5, 100] on project load and on settings-set load. One-way, silent,
   noted in BUILD-LOG. Defaults in profile.js move to the new scale (old
   default × 4).
4. Tests: mapping at 5/50/100; migration of a legacy value (e.g. 20 → 80).

---

## F6 — [MEDIUM] Sprayed colours for fronts

Fronts today offer laminates/decors only. Add spray:

1. In the front-finish picker, add a **"Sprayed"** source alongside EGGER —
   reusing the EXISTING `ColourPicker.jsx` (RAL / F&B / hex, data already in
   `reference/colors/psw-colors.json`, wired since T3). No new picker.
2. A sprayed front renders with the **lacquer** material params
   (`appearance.materials.lacquer`) tinted by the chosen hex, **no envMap**
   (spray rule, F1.4). Sheen slider applies as per F5.
3. Labels downstream: BOM / drawings / part labels show the finish as e.g.
   `RAL 3005 spray` / `F&B Railings spray` using the exact naming pattern the
   Design Settings materials already produce — one convention, not two.
4. Works fully in mock mode. Tests: front-finish selection propagates to the
   parts' material label in BOM output.

---

## F7 — Docs + FINAL GATE

1. **BUILD-LOG.md**: Turn 9 entry — what landed per phase, the arrow-UI
   removal decision, the sheen migration rule, any deviations.
2. **BACKLOG.md** (numbering is append-only):
   - ADD: "Mitre run should stop at an end panel / terminal infill instead of
     wrapping" (owner parked it for a future turn).
   - NOTE on the X-ray item: redesign scheduled for T10, pending owner's
     reference screenshot.
3. **BLOCKERS.md**: anything reverted or discovered.
4. Final gate, in order, all mandatory:
   - `rm -rf node_modules && npm install` (full)
   - `npm test` → **all green**, total ≥ 727 plus this turn's new tests
   - `npm run build` → clean
   - `git diff --stat fixtures/` → empty
   - `git diff package.json` → dependencies untouched
   - `grep -rn "from 'react'\|from 'three'" src/engine/` → empty
   - Commit(s) with clear messages, push branch, **open PR, do not merge**.

If any gate fails and cannot be fixed cleanly: revert the offending phase
entirely (git, not comments), keep the rest, document in BLOCKERS. Clean or
not at all.