# CLAUDE.md — TURN 22: the cornice returns, and the data grows a spine

Turn 21 shrank by protocol and the cornice was the piece it dropped —
it leads this turn unchanged. Behind it, the long-parked data module
finally lands: the hardware manifests and the company's own defaults
move into Supabase with row-level security, mock mode keeps working on
a desert island, and the app grows a small health line so the owner
never needs DevTools to know whether his Blum models arrived.

Read the whole file first. Full autonomy, zero questions. Clean or not
at all; the turn shrinks from the BOTTOM (F3, then F2's
company-defaults half — F1 and F4 never shrink).

Baseline: main after the turn-21 merge. Tests at baseline: 1618. CNC
fingerprints: `verify/t21/fingerprints-turn21.txt`.

## 0. IRON RULES

Everything standing from turns 1–21 applies, including R1 (real CDP
input), R2 (live bucket), R3 (verbatim manifests as fixtures), R4 (URLs
proven by asking the APP), R5 (the walk reads the console). Plus the
data-module law that has waited since turn 15:

* **SQL PRZED push**: every table this turn needs ships as a numbered
  SQL file under `sql/` with RLS enabled and policies written out. The
  BUILD-LOG lists them under the exact words "SQL PRZED push" so the
  owner runs them before deploying.
* **Database over localStorage, degradation over blocking**: no table,
  no session, no network — the app behaves exactly as today (profile
  numbers, bucket manifests, mock mode). A DB row, when present, WINS.

## F1 — The cornice: 70 and 100 on an infill of 40 [HIGH]

Verbatim the turn-21 F13 specification — construction as the owner
corrected it: doors finish FLUSH with the TOP of the carcass top panel;
the 40 mm infill stands ABOVE the top panel in the door plane; the
cornice mounts on the infill, bottom edge flush with the door plane at
door-top level.

1. Per-unit option `cornice: none | 70 | 100` (wardrobes/tall). The
   infill 40 is the existing top-infill part placed per the corrected
   relation; the cornice is a swept profile on it.
2. Profile shape: parametric bead-and-cove approximation (small bottom
   bead, concave sweep, flat top land), heights exactly 70/100,
   forward projection from the profile — **48** for 70, **65** for 100,
   the owner's numbers to veto; a supplier DXF may replace the shape
   1:1 later without touching the plumbing.
3. Continuity: one run across horizontally adjacent cornice-bearing
   units. An end at a wall, side panel or side infill STOPS flush
   against it; an OPEN end mitres 45° and returns along the unit's
   side to the back wall. Corners mitre at 45°.
4. BOM: linear metres (front + returns + mitre allowance per corner, a
   profile number). The cornice is bought moulding, NOT a CNC part;
   the infill stays the CNC part it already is ⇒ **fingerprint delta
   ZERO, fixtures ZERO.**
5. Ceiling honesty: unit height + infill + cornice rise joins the
   unit's derived heights, so a 2400 wardrobe under a 2400 ceiling
   WARNS instead of clipping.
6. Walk: two adjacent wardrobes with cornice 70, one open end —
   screenshot of the run, the stop, and the 45° return; the option
   flipped through none/70/100 with a real click each (R1).

## F2 — The data module: hardware and company defaults in Supabase
##      [HIGH]

Parked since turn 15; the manifests earned it a body this month.

### F2a — `cc_hardware`: the manifests get a table

1. Table `cc_hardware` (SQL file, RLS): one row per catalogue —
   `family` (runners/hinges/lifts), `system`, `manifest` (jsonb — the
   SAME shape the bucket files carry today, R3's fixtures are the
   contract), `bucket_path`, `updated_at`, owner scoping per the
   project's existing auth model.
2. Resolution order, one function, both families: DB row → bucket
   manifest → mock. The parser is the tolerant turn-20 one; a DB row
   simply replaces the fetched JSON. NOTHING about model URL
   composition changes (R4 protects it).
3. Seeding: a small script (`scripts/seed-hardware.mjs`) that reads
   the LIVE bucket manifests and upserts them as rows — run BY THE
   OWNER after the SQL, never automatically.
4. Tests: resolution order with a fake row, with no row, with no
   network. The live-bucket walk stays exactly as turn 21 left it.

### F2b — `cc_company_defaults`: set once, prefill every project

The owner's design, from the conversation that shaped it: the missing
storey between the code and the project.

1. Table `cc_company_defaults` (SQL, RLS): one row per owner —
   `hinge_system`, `hinge_finish` (nickel/onyx), `plate`,
   `runner_variant` (T/S), and per-family board defaults, as a jsonb
   the profile schema validates. ONLY preferences a rule cannot
   infer — never anything a rule computes (hinge ANGLE stays derived
   from front thickness; writing it here is forbidden and the
   validator rejects it).
2. A "Company defaults" screen under the Database menu: read, edit,
   save the row. Graceful without a session: the screen says defaults
   need an account, the app runs on profile numbers as ever.
3. New-project flow PREFILLS from the row; project settings stay the
   place deviations live; per-element overrides (turn 19) stay
   untouched and never overwritten. Cascade: profile → company row →
   project → element, later wins, exactly one implementation.
4. Tests: cascade resolution at all four levels; a project created
   with a row present vs absent; validator rejecting rule-owned keys.
5. CNC: the cascade feeds the SAME engine inputs that exist today ⇒
   golden defaults (no row) **fingerprint delta ZERO**; a probe
   scenario with a company row shows only differences the equivalent
   manual project settings would show — assert exactly that
   equivalence.

## F3 — Hardware health, without DevTools [MEDIUM]

The owner has diagnosed two turns from his console. Give him the line
in the app instead.

1. In the Database menu, a small "Hardware" status row: per family —
   models loaded / expected (e.g. "Movento 40/40 · CLIP top 19/19"),
   source (db / bucket / mock), and a red count of failed fetches with
   the first failing URL, copyable. Read from the existing registries;
   no new fetching.
2. The walk asserts the numbers against the registries (R4) and
   screenshots the row; R5's console capture must be clean in the
   same session.

## F4 — The D/W stands as tall as its missing legs [HIGH]

The owner, from the eye test: the dishwasher panel rightly has no legs
— the machine lives behind the front — but its HEIGHT must behave
exactly as if the run's legs were under it. Enter 50, get 50. And the
100 mm leg minimum is a bug: a default, never a floor.

1. Diagnosis, already located: `engine/cabinet.js`,
   `legHeightForPlinth = cfg.legHeight || (type.plinth && !type.legs
   ? P.baseUnit.legHeight : 0)` — a leg-less plinth type falls back to
   the PROFILE constant (100) instead of the leg height the project /
   run actually uses. The D/W therefore ignores the entered value.
2. Fix: a plinth-bearing, leg-less type (D/W today; any future one)
   derives its implied leg height from the SAME source its run uses —
   the project's leg-height parameter that legged neighbours resolve —
   profile only as the last fallback when nothing is set. Enter 50 on
   the run: the D/W's plinth line, front bottom and total height all
   sit as on 50-mm legs. One derivation, no D/W-special constant.
3. The minimum: find where 100 is ENFORCED (input `min`, a clamp, or a
   params sanitiser) and demote it to a DEFAULT only. The field
   accepts 50 — and any value ≥ 0 that the geometry survives; the
   engine's own sanity (plinth ≥ 0, front not through the floor) is
   the only guard. Profile keeps `legHeight: 100` as the seed.
4. The owner also reported "cannot move it" without saying which axis.
   Cover both readings: (a) with 1–3 done, the height moves by the
   field; (b) the walk DRAGS the D/W unit along the run with real
   input (R1) — if the unit does not translate like its neighbours,
   fix the drag in this phase and name the cause in the BUILD-LOG.
5. CNC: the D/W front is 594 wide and heights follow the same laws as
   today's at leg 100 ⇒ golden defaults **fingerprint delta ZERO**; a
   probe scenario at leg 50 shows only the height-derived differences
   its legged twin shows — assert that equivalence. Fixtures ZERO.
6. Tests: legHeightForPlinth resolution (run value, project value,
   profile fallback); the 50-mm equivalence probe; the unclamped field
   round-trip. Walk: set legs 50 on a run with BUD + D/W, screenshot
   the shared plinth line.

## OUT OF SCOPE — named so nothing drifts in

* LIFT kits HK/HF: gate unchanged (HK position data + HK GLB pack
  outstanding).
* Pull-out shelf UNLOCK: waits for the tray side height (BLOCKERS);
  the plumbing from turn 21 stays disabled.
* Element editing in the cabinet editor: still unscoped. Parked.
* The ⌀3 screw-on plate: card 173L still pending.
* Re-enabling 3-D carving: only on the owner's word.

## PROOF — `verify/t22/`

* `walk.json` — R1 input, R5 console attached, R4 URLs from the app.
* `sql/` files listed in BUILD-LOG under "SQL PRZED push".
* Screenshots: cornice run/stop/return; company-defaults screen; a new
  project prefilled from the row; the hardware health row; the BUD +
  D/W run sharing one plinth line at legs 50.
* `fingerprints-turn21-baseline.txt`, `fingerprints-turn22.txt`,
  `fingerprints-diff.txt` — ZERO on golden defaults; the company-row
  probe equals its manual-settings twin.
* `cnc-export-identity.md`, `bucket-live.md` (R4 style).

## TESTS

Baseline 1618 all green. New: cornice run/stop/return geometry as pure
math; ceiling-warning derivation; cc_hardware resolution order;
company-defaults cascade and validator; prefill equivalence probe;
F4's legHeightForPlinth resolution, the 50-mm equivalence probe and
the unclamped field.
Nothing existing is touched. 100% green or shrink from the bottom.