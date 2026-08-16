# Turn 34 — the acceptance walk

31 checks · 0 failed · 10 screenshots · 0 empty frames · console clean.
Suite at the head: 3017 tests, 0 failed. Build clean.

    npm run build
    npx vite preview --port 4173 &
    node scripts/e2e-turn34.mjs [--only f1,f2,…]

Every interactive claim is REAL pointer input (CDP events — the script's own
guard refuses synthetic DOM events), and every store/UI feature is measured
LIVE: the real store is driven through `window.__cc.project`, and the engine's
numbers are compared against scene mesh bounds PER UNIT (`ccUnitId` on the
ancestors — panel ids collide between units).

Two staging notes this walk itself taught, and both cost a take:

* **Every phase gets its own floor.** T33 pinned units to the far wall to make
  room for the lens; that crowds the next phase and puts a cabinet between the
  camera and the subject. Each phase here calls `freshFloor()` and leaves its
  cabinets where the placement puts them.
* **The camera stands where a photographer could.** `frameUnits` offsets along
  the WORLD axes by a multiple of the subject's radius, which for a cabinet
  against a wall puts the lens THROUGH that wall — the frame comes back showing
  plaster and passes a mesh-presence check while showing nothing. `frameFacing`
  reads the unit's own front normal off its group's world quaternion and stands
  the camera along it, at a real distance in metres, optionally aimed at ONE
  named panel — because an 80 mm shoe box on the floor of an 1800 mm wardrobe
  is not what a lens aimed at the wardrobe's centre is looking at.

## What the pictures hold

- **4a · F4** — the FIX shoe box standing in an open bay: its 120 mm front
  across the opening, the box behind it, the sloped bottom's edge above.
  Measured beside it: box 864 = the whole clear opening, walls 80, one
  divider, `rear = min(80, 439 · tan 10°) = 77.41` at exactly 10°, all SEVEN
  boards drawn in the scene, the bottom's grain running ACROSS (`grain: 'w'`),
  and six ⌀3 through-pilots on `SCREWS_3MM` — three a side, from OUTSIDE.
- **4b · F4** — the DRAWER variant behind its two open leaves. The width law
  photographed and measured: opening 964 → box 878, which is 26 of runner and
  30 per hinged side, read from the ONE `dpSideLaw` object. The runner face at
  frontT + 3 = 28, first fixing +37, the rear at the sheet's own column for
  NL450 (352), ⌀5 on `SHOE_RUNNER_5MM` — and the BOM line a YELLOW NAMED SPEC:
  "Side-mount shoe runner · NL 450 · 13 mm per side · article unknown".
  Not the word MOVENTO anywhere on it.
- **f2-led-off / f2-led-on · F2** — the same camera twice. The working view
  now glows at 3.4 (T33's brightest was 2.21) and "Turn on the light" takes it
  to 10.88 with the room down to the profile's 0.15 — an unmistakable strip
  where the owner could see nothing.
- **2a · F2** — the same strip set 60 mm off the front edge: measured in the
  scene at z −948 → −1008, exactly 60, with its length unchanged at 960. The
  LENGTH LAW is untouched and lighting still drills nothing.
- **5a · F5** — two cabinets touching, front dimensions ON: ONE leaf-to-leaf
  figure at the meeting line, 3.00, with the pair of 1.5s stood down.
- **5b · F5** — the same run standing 100 apart, opened as a saved job would
  arrive: the owner's own triplet, `[1.5, 100, 1.5]`, every figure true.
- **9a · F9** — the twin toggle OFF: the whole front-dimension layer gone,
  merged figure included (0 rows drawn). One layer, one switch.
- **8a · F8** — a stack of three drawer fronts before any press.
- **8b · F8** — three presses later: the bay is empty, the selection cleared,
  and the right-hand panel counts the wardrobe down to its 5 carcass pieces.
  The counts between them are `3 → 2 → 1 → 0`, one drawer per press, with the
  selection falling to the next drawer down each time so the pointer never
  moved. And the key is INERT while a field owns the keyboard — a shelf
  selected, the caret in an input, Delete pressed, the shelf still standing.

## The measures, off the running app

`measurements.json` carries all of them. The ones worth reading twice:

| feature | measured |
| --- | --- |
| F1 | a spray front with a colour and NO board → `missing: [Carcass 1, Front 1]`; Generic clears it |
| F3 | `490 mm · orders NL 500 · MOVENTO 760H · T` — the box + 10, the label naming both |
| F4 | rear 77.41 / 10° · box 864 = opening · 878 = 964 − 26 − 60 · NL450 → column 352 |
| F6 | the front beside the dishwasher at clearance **0**, correction **0**, on a trim of **−1.5** — a NEGATIVE trim is an extension |
| F7 | a NEW job frames at **60**; a job saved before 16.08 opens PINNED at **70** |
| F8 | `3 → 2 → 1 → 0`, selection following down, key inert in a field |
| F9 | OFF → 0 dimension rows drawn |

## The classifier

`node scripts/t34-classify.mjs --dump` on main and on the branch, then the two
compared. **UNNAMED 0.** The named deltas are F3's runner-pair line on the
three drawer-bearing configs, and F7's shaker frame — which rule 2's own list
does not include, and which is reported as a spec contradiction in the PR body
rather than swallowed.
