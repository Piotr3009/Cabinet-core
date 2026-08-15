# Turn 32 — the acceptance walk

50 checks · 0 failed · 23 screenshots · 0 empty frames · console clean.
Suite at the head: 2822 tests, 0 failed. Build clean.

    npm run build
    npx vite preview --port 4173 &
    node scripts/e2e-turn32.mjs [--only f1,f2,…]

Every interactive claim is REAL pointer input (CDP events — the script's own
guard refuses synthetic DOM events), and every store/UI feature is measured
LIVE: the real store is driven through `window.__cc.project`, and the engine's
numbers are compared against scene mesh bounds PER UNIT (`ccUnitId` on the
ancestors — panel ids collide between units).

## What the pictures hold

- **1a–1f · F1** — the rebuilt step 4: one screen, the type as a label, the
  ceiling question with the owner's scribe warning, three front types with
  the 8-style gallery per slot, ONE material picker (EGGER ∪ stock, Generic
  in its own labelled group), Start held until every slot is assigned — and
  the wardrobe standing 600 × 2400 × 568 in the room, measured off its own
  meshes (the depth seed followed the project type from `projectDepth()`).
- **2a–2c · F2** — hardware as its own step, fully pre-filled; the automat
  resolving an article and refusing honestly with a named spec; the hanging
  rail RENDERED in the wizard-chosen onyx (`#2f2f33` read off the mesh).
- **3a–3c · F3** — the grey note the self-correction speaks with; the healed
  front measured 595.5 mm in the scene (597 − 1.5 at its end panel); the
  front-dimension figures standing apart.
- **4a–4c · F4** — the recessed-partition guard with its number and its one
  button; two drawers and a rail living in their own columns (front 567 =
  bay 573 − 10 + 4, measured in the scene; runner rows counted on the
  partition); internal drawers revealed behind the open doors.
- **5a–5b · F5** — the Order tab: materials per decor with the
  "~N sheets of 2800×2070" division, fronts apart, and the yellow named-spec
  lines — 14 on screen, 14 from the app's own functions, equal.
- **6a · F6** — the register's overrule: a seeded clip row buying by article
  (art. CL-100) beside the yellow specs; mock mode measured first (0 rows,
  null answers, badge up, app alive).
- **7a · F7** — ready-made boxes as purchase lines: 10 box rows left the
  saw's list, 10 box meshes still standing in 3D.
- **8a–8b · F8** — the wardrobe library's kitchen shelf filtered (20 kits
  behind "Show all"), and one real click bringing them back.
- **9a–9b · F9** — the owner's drawing on the hovered handle (50 · 35 · 160,
  three rows in the chain, zero sprites left on the aura), and the global
  "Front dimensions" toggle photographed in the open View menu.

`walk.json` carries every check with its measured detail; `measurements.json`
the raw numbers; `console.txt` the whole console (clean).
