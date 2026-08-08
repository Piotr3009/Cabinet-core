# CLAUDE.md — Cabinet Core, TURN 10: RENDER REALISM

One subsystem, done properly: light, shadow, and the room they live in.
Nothing else. Read the whole file first. Full autonomy, zero questions.
If a phase cannot land CLEAN, revert it completely and write BLOCKERS —
"clean or not at all".

## WHY THIS TURN EXISTS (read carefully — it is the brief)

Turns 8–9 plus a day of hotfixes left the working view in a state the owner
described as "realism gone". Specifically, TODAY on main:
- The floor shadow under cabinets is missing or barely there. Root cause was
  FOUND and is documented below (drei ContactShadows `scale` default).
- Sprayed fronts read as flat matt. The glint machinery exists (env 0.25,
  point lights) but the owner cannot SEE a travelling highlight.
- The back wall and the floor melt into one white blur — the room has no
  depth, nothing anchors the furniture.
- The owner wants STUDIO SPOTS: lights in the upper front corners aimed
  ~45° DOWN across the furniture (he calls them "jupiters"), possibly a
  second one lower. Today's point lights shine level and forward — wrong
  geometry for the look he is asking for.

The deliverable of this turn is not code that compiles. It is a WORKING VIEW
that, in screenshots taken by YOU in a real browser, shows: a soft shadow
seating every cabinet on the floor, a highlight that travels across a
lacquered door as the camera orbits, and a room whose wall and floor read as
two different surfaces. The screenshots ship in the PR.

## 0. IRON RULES (turns 1–9, plus this week's scars)

1. Engine purity: nothing in `src/engine/` imports React or three.
2. `profile.js` is the only home of numbers. Different workshops = different
   NUMBERS, never different formulas. Every light value, tone, opacity and
   angle this turn produces lives there.
3. Golden fixtures inviolable: `git diff --stat fixtures/` empty at the end.
4. No new dependencies. `package.json` deps byte-identical.
5. Mock mode sacred: everything works with no `.env`.
6. 0.5 mm precision; `formatMm()`; no `Math.round` on mm in UI.
7. CNC view untouchable.
8. Code and comments in English.
9. npm discipline: any install is FULL (`rm -rf node_modules && npm install`,
   never `--silent`). Reinstall before believing any test-count drop.
10. GitHub Actions is red by design (billing) — ignore; the gate below rules.
11. Open a PR at the end. Do NOT merge it.
12. **NEW — physical light units.** three r0.180 uses physical falloff:
    point/spot intensity is candela-like and fades with distance SQUARED
    (decay 2). A point light at 2 m needs intensity in the TEENS to matter;
    0.9 is invisible and ~45 blows the scene out (both measured this week).
    Directional/ambient/hemisphere are unaffected.
13. **NEW — read the library's defaults in its SOURCE before using a prop.**
    This week drei's `<ContactShadows>` silently multiplied our width/height
    by its DEFAULT `scale = 10`, turning a 1.8 m bake into an 18 m one; the
    legs were two texels and the blur dissolved them. On every GPU. Before
    wiring any drei/three helper, open it in `node_modules` and read the
    defaults. Write what you found in a comment.
14. **NEW — band-limit any high-frequency procedural detail.** The `fwidth`
    fades in `src/3d/bevel.js` (peel + edge roll) exist because per-fragment
    sines and sub-pixel normal rolls alias into moiré/staircases. Do not add
    surface detail without the same treatment.
15. **NEW — never `a?.x === b?.x` as an existence guard.** `undefined ===
    undefined` is true; it crashed production once already.
16. One rig: the working view and the render pass share the same lights,
    tone mapping and exposure (turn 8 decision — keep it).
17. Spray colour is sacred: a RAL front must stay its RAL. The environment
    probe on sprayed pieces stays LOW (currently 0.25 of a neutral synthetic
    RoomEnvironment) and the acceptance loop below includes a hue check.

Baseline expected on main: 797/797 tests, clean build. Today's history you
inherit: peel disabled + band-limited (moiré fix), spray env 0.25, 4 point
lights (values 16/16/8/8), bevel edge-roll band-limit. All of it is on main.

## F0 — Baseline + the fix that is already diagnosed

1. Full install, `npm test` → 797/797, `npm run build` → clean.
2. `src/3d/Scene.jsx`, the `<ContactShadows>` inside `FloorShadow`: if it
   does NOT already carry `scale={1}`, add it, with this comment:
   drei multiplies width/height by its `scale` prop, DEFAULT 10 — turn 9
   missed it, so a 1.8 m run baked onto an 18 m canvas and the blur
   dissolved the legs. This line is the difference between a shadow and
   nothing, on every GPU.
   (The owner may have pushed this already as a hotfix — check first.)
3. Re-run tests. Green before F1.

## F1 — Lighting rig v3: the spots the owner asked for

All in `profile.js appearance.studio`, wired in `src/3d/Scene.jsx Lights`.

1. KEEP: key (1.0, the only *directional* shadow caster), fill 0.55,
   rim 0.3, hemisphere, ambient — values may be re-balanced in F4.
2. ADD `studio.spots`: an array of SpotLight specs. Start with TWO:
   upper FRONT corners of the room/rig, aimed DOWN-ACROSS at the furniture
   centre at roughly 45° — the studio-jupiter geometry the owner described.
   Spec per spot: position as fractions of the rig distance (same convention
   as key/fill/rim/points), `intensity` (PHYSICAL — expect tens, tune in
   F4), `angle` (~0.5–0.7 rad), `penumbra` (~0.6–0.9, soft edge),
   `colour`, `castShadow` (see 4). Targets: the furniture fit centre —
   reuse the `target` object pattern the key light already uses.
3. The owner floated "maybe a second one lower". Make the ARRAY the design:
   he tunes count and numbers in profile without code. Ship with 2 enabled;
   if the F4 loop clearly wants a third (lower), add it there and say so in
   BUILD-LOG.
4. Shadow budget: AT MOST two shadow casters in total. Options: (a) key
   keeps the shadow, spots don't; (b) ONE spot takes over as the caster and
   key drops `castShadow`. Decide by LOOKING in F4 — a spot shadow from
   above-front often seats furniture better than a side key. Whichever
   loses the shadow keeps lighting. mapSize/bias/normalBias come from the
   existing `render.shadow` presets — reuse, do not fork.
5. The 4 existing point lights: fold their job into the spots. Keep at most
   the two viewer-side points at low power IF the F4 orbit test shows the
   travelling glint needs them; otherwise empty the array (data change,
   structure stays).
6. renderCapture: spots get `userData ccLight: 'spot'`; add `spot: 1` to
   `render.lightScale` (the loop there ignores unknown roles, but the knob
   should exist like the others).

## F2 — The floor shadow, verified end to end

1. After F0's `scale={1}`, tune the blob in profile (`appearance.
   contactShadow`): the room is brighter than in turn 9, so opacity likely
   wants 0.5 → ~0.6–0.7 and `farMm` ~250–400 so the dark hugs the legs.
   Numbers decided by F4 screenshots, not taste-in-the-dark.
2. VERIFY THE BAKE IS REAL in your environment before trusting your eyes:
   drei bakes into a WebGLRenderTarget with a scene-wide depth override, and
   at least one software-GL stack renders that bake as pure zeros while
   drawing everything else fine. Probe once: patch (locally, never commit)
   a `gl.readRenderTargetPixels` after the bake and log max alpha of the
   centre region. Non-zero → your screenshots are trustworthy for shadows.
   Zero → your environment is blind for THIS feature: say so in BLOCKERS,
   do not fake the screenshot, and validate the blob analytically (bake
   dimensions logged = fit dimensions) + leave the visual sign-off to the
   owner explicitly.
3. The key/spot shadow (F1.4) and the blob must read as ONE grounding, not
   two competing smudges — judge in F4.

## F3 — A room you can read

The white-blur problem. All numbers in profile:
1. Give the FLOOR its own tone, a step warmer/darker than the walls (new
   `appearance.room` values consumed by `src/3d/Room.jsx`; if Room already
   has colour slots, use them — do not hardcode).
2. Re-balance flat light: today's ambient 0.45 flattens everything. Shift
   energy from ambient toward hemisphere + the new spots so walls get a
   GRADIENT (spot pools high, falloff low) instead of uniform white.
   Ambient likely lands ~0.28–0.35 — F4 decides.
3. The scene background (`#fafaf8`) vs wall vs floor: three distinguishable
   values. Subtle — this is a workshop tool, not a showroom render.

## F4 — THE LOOP (the phase that makes this turn different)

Turn 8 had a browser-walk phase; turn 9 skipped it and shipped an invisible
shadow. This phase is MANDATORY and it is where most of this turn's time
goes.

1. Build, serve `dist`, open in a real browser (headless is fine).
2. Build the STANDARD SCENE through the app itself: rectangle room, one run
   of three base units on wall 1, doors fitted, fronts = Sprayed RAL 3005
   (Wine red), carcass default, sheen 60. (The New-Project flow and the
   Sprayed picker exist — drive them.)
3. Capture and ITERATE profile numbers until ALL acceptance criteria hold:
   - **A. Seating:** in a 3/4 shot, every unit sits in a soft shadow; the
     floor between the legs is visibly darker than the open floor.
   - **B. Travelling glint:** at sheen 90, three working-view captures along
     an orbit show a highlight PATCH in three different places on the same
     door. At sheen 60 a softer sheen gradient remains visible.
   - **C. Room depth:** wall/floor junction readable across the frame; the
     wall shows a gentle vertical gradient (spot pools), not uniform white.
   - **D. Colour fidelity:** sample a mid-lit pixel of the sprayed front:
     hue within a sensible tolerance of the chosen RAL hex; no pink blowout
     anywhere (that is the overexposure signature measured this week at
     point intensity 45). White carcass stays white.
   - **E. Cost:** no per-frame ContactShadows bake (frames=1 + key), ≤2
     shadow casters, no new render targets in the working loop.
4. Save the FINAL screenshots (A, the three B frames, C) as PNGs under
   `verify/t10/` and COMMIT them — the PR must show the result, not claim
   it. Also record every tuned number and the reasoning in BUILD-LOG.
5. If the browser environment cannot exercise something (see F2.2), the
   honest sentence in BLOCKERS beats a screenshot that lies.

## F5 — Tests

1. Full suite stays green (≥797). Update any test that pins values this
   turn changes — with a comment carrying the WHY, as done for env 0.25.
2. Add node tests for the new profile shape: `studio.spots` entries merge
   through `migrateCabinetProfile`, `lightScale.spot` present, room tones
   present. Values themselves are taste — test structure, not taste.

## F6 — Docs + FINAL GATE

1. BUILD-LOG: turn 10 entry — final rig values, shadow-caster decision
   (F1.4) and why, blob numbers, room tones, loop iterations count, and the
   verify/t10 screenshot list.
2. BACKLOG: note that the T11 batch (24 UX/editing points + New-Project
   step 5) is specified chat-side with the owner and lands next turn.
3. BLOCKERS: anything reverted, plus the F2.2 environment note if it fired.
4. Gate, in order, all mandatory:
   - full reinstall → `npm test` all green (≥797 + new)
   - `npm run build` clean
   - `git diff --stat fixtures/` empty
   - `git diff package.json` deps untouched
   - `grep -rn "from 'react'\|from 'three'" src/engine/` empty
   - `verify/t10/` contains the acceptance screenshots
   - push branch, open PR, do NOT merge.