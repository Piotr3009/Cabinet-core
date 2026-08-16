# Turn 33 — the acceptance walk

38 checks · 0 failed · 18 screenshots · 0 empty frames · console clean.
Suite at the head: 2909 tests, 0 failed. Build clean.

    npm run build
    npx vite preview --port 4173 &
    node scripts/e2e-turn33.mjs [--only f1,f2,…]

Every interactive claim is REAL pointer input (CDP events — the script's own
guard refuses synthetic DOM events), and every store/UI feature is measured
LIVE: the real store is driven through `window.__cc.project`, and the engine's
numbers are compared against scene mesh bounds PER UNIT (`ccUnitId` on the
ancestors — panel ids collide between units).

Two staging notes the walk itself taught: the F5 pair and the F6 wardrobes
are PINNED to the far wall by explicit `moveUnitToWall` calls — left to the
placement hunt, a crowded floor sits a UNIT beside the healed edge and the
matrix rightly has nothing to say (1.5 stands against a unit neighbour), which
is a different scene than the one the picture must prove. And 6a is a DETAIL
photograph aimed at the drawer stack's own measured box: the room is 3 m deep
and the lens is 38°, so a full-height stand-back from a far-wall wardrobe
does not exist inside the walls — the walk measures the geometry and stands
where a photographer could.

## What the pictures hold

- **1a–1f · F1** — the Lighting panel open BESIDE its own top-bar button
  (before Output, rule 5), the owner's three temperatures and the wardrobe's
  own switching (door / sensor); a real pointer click on the shelf in the
  scene and "Add LED under this shelf" appearing for it; the strip standing
  under that shelf at the shelf's own 960 mm run; the depth slider sliding
  it 450 mm toward the back (z −948 → −1398, measured); side line, plinth
  wash and top wash all standing at once; two spot discs under the kitchen
  wall unit (the profile's count); and the BOM's Lighting block — strip
  metres, driver, switch, spots — every line a yellow NAMED SPEC, because
  the register knows no lighting articles yet. LIGHTING DRILLS NOTHING.
- **2a–2b · F2** — the same camera twice: room lit, then "Turn on the
  light" — environment 0.5 → 0.075 (the profile's 0.15 dim) while the LED
  emissive rises 0.85 → 2.21 (the 2.6 boost); toggling back restores 0.5
  EXACTLY, because the demo is derived at render and nothing is stored.
- **3a–3b · F3** — the shoe shelf CUT with its stop rail, leaning the
  profile's 15° together; the belt/tie glass drawer's three panes drawn and
  its insert ORDERED (627 × 404 mm · fits nominal 600); the trouser
  pull-out a purchase line at the column's own 673 mm opening — and NOT ONE
  hole on any of it. Then the pull-down suggestion: a rail hung at a
  measured 2118 mm above floor and the grey hint speaking the owner's 2000
  threshold, never a block.
- **4a · F4** — the INSIDE mirror standing on the open leaf, and the BOM
  ordering the glass at the front minus the profile's 20 a side
  (Mirror 457 × 2107 for the 497 × 2147 door).
- **5a · F5** — the healing sweep's own voice: an end panel lands beside
  the pair and the grey note "front 07 07-F −1.5 mm at an end panel" stands
  in the frame; the healed front then MEASURED in the scene at the engine's
  own trimmed 595.5 mm, and `frontClearances` holding zero unhealed
  corrections across the whole floor.
- **6a · F6** — the missing 30, photographed: the column's drawer stack
  behind the leaf swung on its two 155° hinges, the DP and its two fillers
  standing beside it — and above the picture, the MEASURE: the column box
  stands off the hinged carcass side EXACTLY as the no-divider box
  (−71 vs −71 mm) and its front at the same setback (515 vs 515 mm).
- **7a–7b · F7** — the door modal opened by pointer double-click with ONE
  hinge block, at the TOP; then the pair's handles after three ×10 nudges
  on one leaf: mirrored 498.5 / 498.5 about the pair centre — ±0.0 mm,
  measured off the handle meshes, never 60/40 again.
- **8a–8b · F8** — the Shaker slot card carrying "Frame width (all shaker
  fronts)" and writing the PROJECT-WIDE `design.fronts.shakerFrame` (90
  stored); a Flat slot hiding the field.
- **10a · F10** — the settings panel WITHOUT the shelf-pin control (the
  sanctioned removal), while the app project drills its pins at the owner's
  50 (x 50 on `SHELVES_7_5MM`, measured off the live CNC set). F9 and F11
  are BOM lines read live in the same session: the 440 mm box ordering its
  ladder rung — "orders NL 400 · MOVENTO 760H" — and the insert line
  naming the catalogue nominal that drops in.

`walk.json` carries every check with its measured detail; `measurements.json`
the raw numbers; `console.txt` the whole console (clean).
