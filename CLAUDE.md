# CLAUDE.md — TURN 45 · THE WIZARD LEARNS MANNERS: T44'S ELEVEN EYE-TEST VERDICTS

The owner walked T44 screen by screen, 23.08.2026, screenshots marked in
red. Eleven verdicts. His two loudest: the picker — *"okno w oknie,
roll w dół, wkurw na maxa"* — and the validation that took him hostage:
*"musiałem wszystko od nowa przechodzić — to jest chore."* And the law
we broke ourselves: UI copy is ENGLISH; T44 shipped "Ustawienia /
Produkcja / Podsumowanie / Zapisać te ustawienia…". He laughed at us.
Rightly.

## Iron rules (binding)

1. **Zero-stop overnight.** PR before morning. Sacrifice, first to
   fall: F9-CNC (the groove cutting), then F1b (top view), then F8
   (copy sweep may ship partial with a named list). **F2, F3, F4, F5,
   F6, F7 never fall.**
2. **BYTE-IDENTITY.** Engine untouched EXCEPT F9-CNC, which is additive
   and gated on LED lines existing — none of the six configs carries
   one, so `t45-classify`: six IDENTICAL, UNNAMED=0. If a config moves,
   F9-CNC cut wrong — stop it, note it.
3. **LISP is law** (F9-CNC only): the LED groove is born in
   `reference/lisp/` first, application follows. Paren balance 0/0 by
   script. No other kit is touched.
4. **Sanctity — named removals, nothing else dies:** the
   Factory/Retail header toggle; Number+Client fields from tab 5.1;
   the DUPLICATE CNC-corner block in Carcases (one stays); the
   duplicate front-type tail in Fronts (the per-front gallery stays);
   wizard step "6. Hardware" (its fields already live in tab 5.4); the
   sheet-size picker inside Produkcja (chosen earlier, per material);
   the "Save as set & start" button. Each listed in the PR body.
5. **Modals: draggable, open beside.** Visited tabs are ALWAYS
   clickable; state NEVER resets. UI copy: English, everywhere.
6. **No new deps. Suite never --silent. One commit per feature. Probe
   walks the wizard, screenshots under `verify/t45/`.**

---

## F1 [CRITICAL] — the wall elevation gets dimensions, and a plan view

- **F1a** Live dimension chains exactly as his red pen: top = wall
  width + the slope's run segment; right edge = slope drop + the wall
  stub under it; left = full height; bottom = width. They follow every
  drag live.
- **F1b** A `Front / Top` switch in the wall modal. Top = the wall seen
  from above: wall line, depth zone, and two NEW draggable elements —
  `Recess` and `Chimney` (rectangles with width + depth, double-click
  for numbers). Stored on the same wall model. Engine ignores them this
  turn — they are geometry for the eye and for future unit clamping.

Proofs: `f1a-elevation-dimensions.png`, `f1b-top-view.png`.

## F2 [CRITICAL] — settings 5.1 cleaned, and the toggle dies

- Number + Client: REMOVED from 5.1 (step 1 owns them). Type stays,
  read-only.
- The Factory/Retail toggle: REMOVED. One codebase, TWO entries: the
  workshop app hardwires `factory`; a separate route `/client` (the
  future retail site mounts it) hardwires `retail`. The audience tree
  from T44 stays as the single filter.

Proof: `f2-no-toggle-no-duplicates.png`.

## F3 [CRITICAL] — the decor picker becomes a modal, as mocked

Approved mockup, 23.08:
- The tab shows ONE slot: `Choose decor…`. Click → a SEPARATE modal
  (backdrop, own single scrolling grid — **no scroll-in-scroll, no
  window-over-window, ever**): search on top, a FAMILY filter bar
  (Oak, Walnut, Ash… — Egger's own taxonomy, supplier-agnostic for the
  future), large tiles. Click a tile = chosen + modal closes.
- The tab then shows exactly ONE tile (swatch + code + name + ST) with
  `Change`. The SAME single tile is what the Summary shows.
- Spraying: picked from the list, but once picked it renders as the
  SAME large tile (colour swatch + name) — one chosen-decor format
  across laminate / veneer / spraying.

Tests: DOM — after choice the tab contains one tile and zero grid;
the modal contains the only scrollable region. Proofs:
`f3-picker-modal.png`, `f3-chosen-tile.png`.

## F4 [HIGH] — the duplicates die, and step 6 becomes the real summary

- Carcases: ONE CNC-corner block (the repeated joinery table goes).
- Fronts: ONE front-type choice (the tail repeat goes).
- Wizard step `6. Hardware` REMOVED → replaced by **`6. Summary`**:
  the whole project in miniatures — chosen decor tiles, base
  dimensions, hardware — `Change` per section, and ONE button:
  `Start designing`. (`Save as set & start` is gone; the standard was
  already offered at the settings finale.)

Proof: `f4-step6-summary.png`.

## F5 [HIGH] — push-to-open obeys the handles

Any handles chosen (J-pull / bar / knobs / any hands) → push-to-open
is forced OFF and LOCKED, with a one-line reason under it. Handleless →
available as before. The BOM follows the lock.

Test: toggling handles flips the lock both ways. Proof:
`f5-push-to-open-locked.png`.

## F6 [HIGH] — Produkcja speaks the material's name out loud

- The assigned material name per block: FULL-SIZE text (it is the
  information, not a footnote) — "Carcass 1 — MFC Halifax Oak 18 mm"
  as the block's title line.
- The sheet-size picker: REMOVED here (rule 4) — it lives at the
  material step. Measured-thickness fields and infill: untouched,
  the owner likes them.

Proof: `f6-produkcja-named.png`.

## F7 [CRITICAL] — validation stops taking hostages

- A cross-tab conflict (wardrobe taller than the room) = a red note AT
  THE FIELD naming the culprit + a one-click jump to it (Wall/Room).
- Fixing it returns the user STRAIGHT to where they were (Summary
  included). Every earlier choice survives — nothing resets, nothing
  re-asks.
- Next validates ONLY the current tab. Visited tabs stay clickable
  through any error state.

Test: seed the conflict, fix the room, assert every prior field value
intact and Summary reachable in one click. Proof:
`f7-conflict-jump-and-return.png`.

## F8 [MEDIUM] — numbering and the English sweep

- Sub-tabs numbered `5.1 … 5.6` in the strip.
- Every Polish string shipped by T44 goes English, BY NAME:
  `Ustawienia → Settings`, `Produkcja → Production`,
  `Podsumowanie → Summary`, `Ile kolorów frontów? → How many front
  colours?`, the save-set finale → `Save these as your standard?` —
  and a grep for Polish diacritics in `src/components/` returns only
  comments.

Proof: `f8-english-everywhere.png`.

## F9 [HIGH] — lighting grows up

- **F9a** The Lighting menu is ALWAYS alive. ON/OFF is a PREVIEW
  (room dim) only — at OFF you still place, see and edit LED lines on
  carcasses.
- **F9b** Settings gains sub-tab `5.6 Lighting` (Summary shifts to
  5.7... no — the wizard summary is step 6; the SETTINGS strip becomes
  `5.1–5.6` with Lighting as 5.6 and the settings summary folded into
  wizard step 6 per F4): choice `LED flexi 4 mm` (a 4 mm groove) vs
  `Channel` + channel width field (the router's slot width).
- **F9c** Optional `W/m` field → the driver calculator: total W = W/m ×
  metres of ALL placed lines (metres shown beside it). Drivers are
  12 V; pick the set whose summed rating ≥ total, smallest unit 60 W.
  Result lands in the BOM as `N × driver X W`.
- **F9-CNC [falls first]** The groove under every placed line: born in
  `reference/lisp/` (rule 3), then the app's CNC export cuts it —
  width = 4 mm or the channel width, on the panel the line sits on.
  Gated on lines existing; six configs untouched.

Proofs: `f9-lighting-off-still-edits.png`, `f9-driver-calc.png`,
`f9-cnc-groove.dxf` + screenshot.

---

## Execution order

F2 → F3 → F4 → F5 → F6 → F7 → F8 → F1 → F9. Sacrifice: F9-CNC, then
F1b, then F8-partial. **F2, F3, F4, F5, F6, F7 never fall.**

## What this turn does NOT touch

`computeCabinet()` beyond F9-CNC's gated additive read. The drawings
system. The rail. Runners. `cc_settings_sets` schema. Golden fixtures.
The six configs' bytes.

## Morning audit will run

Fresh clone → suite → build → t45-classify (six IDENTICAL) → removal
audit against rule 4's list, nothing outside → the Polish-diacritics
grep → LISP diff limited to the LED groove + paren 0/0 → the wizard
probe re-run, screenshots LOOKED AT → verdict → the owner's numbered
eye-test list.