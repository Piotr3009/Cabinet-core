# CLAUDE.md — Cabinet Core, TURN 18

The DRAWER turn. The owner put the last missing numbers on the table — the
two side pockets, read off his own workshop DXF — and brought the whole
MOVENTO 760H ladder as GLB. So: drawers become TRUE (sides carry the
machining the machine already needed), runners become VISIBLE (models from
the bucket, positions from the LISP), and the CNC labels stop spilling
over their parts. Plus the oven-base corrections from his review.

Read the whole file first. Full autonomy, zero questions. Clean or not at
all; the turn shrinks from the BOTTOM — F1–F3 are the turn's heart.

Baseline: main after the turn-17 merge PLUS the chat package
`cabinetcore-kity-dw-oven-1008-*` (D/W front is 594 WIDE and base-height
tall, no legs, plinth notched via the new `type.plinth` flag; oven base on
`heightGroup: 'base'` at 770; drawer stack measured from the FACE, not the
opening). Tests at baseline: 1372.

## 0. IRON RULES

All standing rules apply (turns 1–17): engine purity; profile.js the only
home of numbers; existing fixtures inviolable (ADDING is fine); no new
deps; mock mode with graceful degradation; 0.5 mm + formatMm; English;
full npm reinstalls; Actions red; PR no merge; physical light units;
library defaults read in source; band-limit; no `a?.x === b?.x`; one rig;
spray colour sacred; THE MODAL RULE; browser walk standard; NO nesting;
never invent a workshop number — BLOCKERS instead.

CNC EXPORT: this turn has **THREE named deltas**, and nothing outside
them. Fingerprint before/after, publish in
`verify/t18/cnc-export-identity.md`, in these words:

1. **In-part labels wrap, centre and shrink** — TEXT entities only (F1).
2. **Drawer SIDES gain their true machining** — the 2 mm runner reduction
   and the 7 mm bottom groove, at the owner's measured positions (F3).
3. **The oven base is corrected** — side sockets only where the back is,
   a flat-rail top instead of a full TOP, and the drawer front takes its
   gap below the appliance face (F5).

Anything else moving in the fingerprints is a REGRESSION, not a delta.

## F0 — Baseline

1. Full install → tests green (record; expect 1372) → build.
2. Verify the chat package is on main: `test/turn17-appliance-kits-fix.
   test.js` exists and passes; `P.dwPanel.frontWidth === 594`;
   `getUnitType('OVEN_BASE').heightGroup === 'base'`; `getUnitType(
   'DW_PANEL').plinth === true` with `legs === false`. Missing → STOP,
   BLOCKERS, do not re-implement blind.

## F1 — CNC labels: wrapped, centred, never outside (W32)

The owner's export screenshot: `F01 TOP 564x540 F01 BOTTOM 564x…` running
over the parts and into the neighbours.

1. **Wrap.** The in-part label breaks onto up to three centred lines
   (`F-01` / `BUR` / `597x568` is a natural break), centred in the part
   both ways. A line that still does not fit truncates with `~` — the
   turn-16 middle step — and the label NEVER crosses its outline. One
   layout function in `annotation.js`, used by the sheet AND the file, so
   they cannot disagree.
2. **Half the size in the EXPORT.** The exported DXF writes the label at
   50% of the sheet's height for the same part (its own profile number,
   e.g. `cnc.exportLabelScale: 0.5`). The sheet on screen keeps its size.
3. **A wider advance.** `MONO_ADVANCE` 0.62 → 0.85, and the fill ratio
   0.94 → 0.85: the DXF carries no font, the reader's CAD picks its own,
   and the owner's font is wider than ours — labels must fit in the WORST
   reasonable font, not the best. (Owner chose this over embedding a text
   STYLE, because a styled DXF is what killed VCarve's parser on
   02.08.2026 — the header comment in dxf.js says so. Do NOT add styles.)
4. Named delta 1: TEXT entities only. The probe from the turn-17 audit
   (entity-by-entity, pairs) is the check: zero non-TEXT changes.

## F2 — Drawer heights actually SAVE in kitchen units (W33)

The owner edits a kitchen drawer's height and it snaps back to the kit's
number. Diagnosed in chat to ONE root:

1. **The fork is wrong.** `projectStore.setDrawerHeight` routes by
   `typeof ref === 'number'`. Kitchen drawer units get ITEM rows at
   placement (projectStore ~line 88), so `drawerRef` returns an item id,
   the call takes the WARDROBE route, writes `height_mm` on the item —
   and the budr engine only ever reads `params.drawer_heights`. The value
   lands where nothing looks.
   **Fix at the root:** route by the KIT — `getUnitType(unit.type)
   .drawerStyle === 'budr'` → `setBudrDrawerHeight` with the drawer's
   INDEX, whatever the ref's type is. The wardrobe route stays for
   wardrobe items. Regression test: a BUDR2 unit WITH item rows (as
   placement makes it) takes [500] and the engine returns 500/264.
2. **Un-brick the right-hand panel.** RightPanel's `ratioDrawers` branch
   renders the height as a dimmed span with a pre-turn-17 comment ("an
   input that would do nothing"). It does something now: make it the same
   NumberField the editor has (engine clamp: floor 38 =
   `runnerScrewFromBase + clearanceBelowRunner`, ceiling from the face),
   plus the Reset-to-kit button. Delete the stale comment.
3. The kit's 4:3:2 drift stays FROZEN (#64). `resetDrawerHeights` returns
   to it exactly.

## F3 — The drawer SIDES tell the truth (the owner's own numbers)

From his workshop DXF, read together in chat and confirmed:

1. **Bottom groove** (`DRAWER_BOTTOM_POCKET`): in each side's INNER face,
   **7 mm deep**, the groove's lower edge **15 mm above the side's bottom
   edge**, tall enough for the 18 mm bottom (same board as everything),
   running the FULL length of the side.
2. **Runner reduction** (`DRAWER_RUNNER_POCKET`): the side's INNER face
   milled **2 mm deep** over the band **from the bottom edge up to the
   groove (0 → 15 mm)**, full length — an 18 board becomes 16 where the
   runner lives, "blum tego wymaga".
3. **The arithmetic that must close, pinned by test:** bottom width =
   boxFrontLen + 13 (`bottomOversize`), so the bottom enters each side
   6.5 mm — inside a 7 mm groove with half a millimetre of air. The
   profile's numbers were right all along; now the groove they imply is
   CUT. Box length NL − 10, side = front − 36, `firstFrontAdjust` — all
   LISP, all untouched.
4. Front and back of the box STAND ON the bottom (owner's words); the
   element view and the detail modal draw both pockets (turn 17 F4 gave
   the plumbing; this phase gives it the right geometry).
5. Named delta 2: the sides' DXF gains these two pocket outlines at these
   positions. Every other panel byte-identical.

## F4 — Hide the fronts, don't remove them (W22)

A VIEW toggle beside X-ray/Outlines: **Hide fronts** — doors AND drawer
fronts vanish from the 3D view together. Nothing changes in the BOM, the
CNC, the cut list or the params; it is a lens, not an edit. Remove doors
(turn 15) stays exactly as it is — that one is a project decision and
this one is a look inside. State in uiStore, not on units.

## F5 — Oven base, corrected to the owner's review (W34/W35)

1. **Side sockets only where the back is.** Today the oven's BUL carries
   the same 7 sockets a full-back BUD does; above the drawer-back there
   is NOTHING to catch. Keep exactly the sockets whose dog bones land in
   the low back (and the bottom's), drop the rest. Same for BUR.
2. **A rail top, not a TOP panel** — the SINK's two-holder pattern, with
   ONE change: the FRONT rail lies FLAT (100 mm wide, board thick),
   not on edge. The flat rail takes its own 3 mm screw pattern — laid
   out for a horizontal board, NOT the sink's vertical-rail numbers.
   New numbers in profile under `ovenUnit`; the sink's own stay
   untouched and its fixtures prove it.
3. **No ventilation cut.** Decided with the owner: the open back and the
   now-open top ARE the airflow; a 50×300 slot in the shelf would vent
   into a closed drawer. If a specific oven's manual demands one, that is
   a manufacturer's number for a later turn.
4. **The drawer front takes its gap below the appliance.** The oven FACE
   behaves like a front in the run, and two fronts never touch: front =
   `H − gap − ovenHeight − gap` (169 at 770, "szczelina 3 mm jak
   wszystkie nasze drzwi"). The box still fits the OPENING under the
   shelf, unchanged. Test both.
5. Named delta 3 covers 1, 2 and 4 together — the oven kit's files only.

## F6 — Runners on screen: the MOVENTO pipeline

The owner uploaded the full 760H ladder to Supabase Storage: bucket
`hardware` (public), path `hardware/runners/blum/movento/` — 40 GLB
(pairs L/R, NL 250–450, variants S / T / SU) + `manifest.json`
(system, nl, variant, article per file). Units are true millimetres;
validated at conversion (an NL450 file measures 450.5 long).

1. **Loader.** `GLTFLoader` from the three package (NO new dependency —
   the RoomEnvironment precedent). Load once per file, clone per row —
   the decor-texture pattern. Async, never blocking the scene.
2. **The LISP owns the positions.** Runner rows come from the engine's
   `runnerY` list; the model is a COSTUME on the screws — it aligns to
   the drilled pattern, never the other way round. The model's own origin
   is unknown until first mount: measure it once, store the offset as a
   profile number, say so in the comment.
3. **NL from depth**, as the engine already does (largest that fits; box
   = NL − 10). Pin with a test; no new rule.
4. **Variant is HARDWARE, not geometry.** Project default **T (TIP-ON
   BLUMOTION)** — the owner's "90% of what we make" — with S as the
   option. Set at project level in the Runners section of Step 5 /
   Settings (System: Movento; Variant: T/S with a short tooltip — "press
   the front to open; BLUMOTION adds the soft close"); per-drawer
   override in the element editor, the colour hierarchy exactly. SU files
   stay in the manifest, unused. Gaps, pockets, drilling: IDENTICAL for
   both variants — Blum's own installation page says the pattern does not
   change with the motion technology, and the owner keeps his 3 mm front
   gap (Blum's template says 3.5; his call, noted here so nobody
   "corrects" it).
5. **The synchronisation rod is parametric** — a profile between the two
   units, length from the box width less the fixed ends. Catalogue
   thresholds, cited in the comment (blum.com TIP-ON BLUMOTION for
   MOVENTO): unit alone below 314 mm opening width; narrow rod 281–305;
   rod with adapters 314–1385.
6. **Graceful degradation, iron rule:** file missing, bucket down, fetch
   failing → a plain grey box of the runner's true size in the same
   place. Never a hole, never a blocked scene. Mock mode renders the box.
7. Visible when fronts are hidden (F4) or doors open — with the rest of
   the hardware. BOM: the pair's article numbers from the manifest, per
   drawer, per variant.
8. NOT this turn: the `cc_hardware` table (waits for the data module);
   the manifest read from the bucket IS the catalogue for now.
   profile.js keeps Movento's numbers as the offline truth.

## F7 — Browser walk + docs + GATE

Walk (screenshots to `verify/t18/`, committed): a small part whose label
wraps to three centred lines inside its outline, near and far; an export
listing where every TEXT is half-size and nothing else changed; a kitchen
BUDR2 with a drawer height typed in the RIGHT panel and STAYING (before/
after); a drawer side in the element view showing BOTH pockets with the
15/7/2 numbers readable in the detail modal; Hide fronts on and off over
the same run; the oven base showing the flat front rail, the socketed-
only-low sides and the 169 front at 770; a drawer with its MOVENTO pair
mounted on the LISP rows, T variant, rod present on a wide drawer and
absent on a narrow one; the same scene with the bucket unreachable —
grey boxes, nothing broken; the Runners section in Settings with the
tooltip open.

Docs: BUILD-LOG per phase; BACKLOG updated (W-numbers from this batch
noted); BLOCKERS: add the **Blum licence gate** — like EGGER #44, written
consent / terms check before any public demo or sale that shows their
models; and anything a kit needed that the owner has not given. GATE:
full reinstall → all green (1372 + new) → clean build → existing fixtures
diff 0 → deps untouched → engine purity → CNC identity with the THREE
named deltas and nothing else → `verify/t18/` populated → PR.