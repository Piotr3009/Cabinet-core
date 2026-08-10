# CLAUDE.md — Cabinet Core, TURN 19

The HARDWARE-CATALOGUE turn. The owner brought the whole Blum world as GLB
and the knowledge now lives IN THE REPO under `reference/hardware/` — four
JSON files with articles, thickness rules, power-factor ranges and board
weights. This turn: hinges become project hardware with per-door
exceptions (W36), every modal stops covering the thing it edits (W37), a
missed turn-17 verdict is honoured (double-click on a CNC part), and the
lift-selection ENGINE lands with tests — so the lift CABINET KITS in turn
20 only consume it.

Read the whole file first. Full autonomy, zero questions. Clean or not at
all; the turn shrinks from the BOTTOM.

Baseline: main after the turn-18 merge. Tests at baseline: 1406.

## 0. IRON RULES

All standing rules apply (turns 1–18): engine purity; profile.js the only
home of numbers; existing fixtures inviolable; no new deps; mock mode with
graceful degradation; 0.5 mm + formatMm; English; full npm reinstalls;
Actions red; PR no merge; THE MODAL RULE (extended by F3 below); browser
walk standard; never invent a workshop number — BLOCKERS instead.

CNC EXPORT: **ZERO deltas this turn.** The default hinge IS today's
drilling — same cup, same screws, same plate holes, same layers
(`FRONT_HINGES_35MM`, `FRONT_HINGES_3MM`, `HINGES_5MM`). Variant, finish
and the catalogue change WHAT IS BOUGHT and WHAT IS DRAWN, never what is
drilled. Fingerprint before/after; any diff beyond the turn-18 baseline is
a REGRESSION. (The ⌀3 screw-on plate would change drilling — which is
exactly why it ships DISABLED, F2.5.)

## F0 — Baseline + the knowledge files

1. Full install → tests green (record; expect 1406) → build.
2. `reference/hardware/` must contain `movento.json`,
   `cliptop-hinges.json`, `aventos.json`, `aventos-hf-drilling.json` (the
   owner pushes them with this file). Missing → STOP, BLOCKERS.
3. These four files are the CATALOGUE OF RECORD — the same standing the
   LISP files have for geometry. The bucket holds only the GLB bytes.
   A small loader in `src/lib/` reads them; the ENGINE never fetches.

## F1 — The hinge catalogue, two levels (W36)

The owner's model, his words: "jeden główny wybór przypisany… a jak jedna
szafka będzie miała inne hinges, to po podwójnym kliknięciu na hinge
otworzy się modal… przesuń up/down plus assign if other hinge."

1. **Project level** — the Hinges section of Step 5 / Settings (it exists:
   turn 17 put "Standard hinges 2/3" there) gains:
   - **System**: CLIP top BLUMOTION (the only one in the catalogue today).
   - **Finish**: nickel / onyx — drives which GLB is drawn and which
     ARTICLE the BOM lists, from `cliptop-hinges.json`. Nothing else.
   - **Mounting plate**: knock-in ⌀5 (default) / screw-on ⌀3 — see F2.5.
2. **The ANGLE is not a choice — the FRONT decides**, rule straight from
   `cliptop-hinges.json → rules`:
   - front thickness ≤ 25 → **110°** (71B3550 / 71B3590),
   - 25 < thickness ≤ 32 → **95°** (71B9550 / 71B9590),
   - a WARDROBE door whose section holds an inner drawer → **155°**
     (71B7550 / 71B7590), because the drawer must clear the open door.
   The engine resolves the angle per door; the BOM lists the right
   article per door, split by finish and angle.
3. **Per-door exception** — double-click a hinge in 3D opens the hinge
   modal (F3 positions it): move up/down (the turn-17 editing, now with a
   convenient entrance) AND **"Assign other hinge"** — a dropdown of the
   catalogue's hinge entries. An assignment overrides the rule for that
   door only and the BOM follows. Same hierarchy as colour and runners.
4. **Thickness re-resolve gate.** Changing a front's material to a
   thickness that flips the angle re-resolves ONLY doors without a manual
   assignment, and says so in a toast. A manual assignment is never
   silently overridden.
5. **The ⌀3 plate ships DISABLED.** Its drilling pattern is a workshop
   number nobody has supplied — the LISP knows only ⌀5. The option is
   visible, disabled, tooltip "drilling pattern pending", and a BLOCKERS
   entry says exactly what card/`.mpr` is needed (Blum 173L). An enabled
   option that silently drills the OLD pattern would make the export lie.
6. **GLB on the drilled points.** Hinge + plate models from
   `hardware/hinges/blum/cliptop/` (bucket), mounted at the engine's own
   hinge centres (the LISP columns) — the runner pipeline exactly: load
   once, clone per position, costume on the screws, grey stand-in when
   the bucket is unreachable, visible when fronts are hidden or doors
   open. The catalogue's per-family pair of articles: draw the first,
   list both in BLOCKERS as "meaning unconfirmed" (the owner will read an
   invoice).
7. Tooltip on the variant/system controls, one line each, the modal rule.

## F2 — (folded into F1 — numbering kept so BUILD-LOG phases match)

## F3 — Modals stop covering their object (W37)

Owner: "klikam na drzwi, a modal mi się otwiera na drzwiach i chuj widzę."

The turn-12 shell opened "beside the click", which for a double-click ON
an object means ON the object. Tighten the SHELL RULE in one place
(`ModalShell` / `openModal` anchor maths):

1. A modal opens **offset up-and-right from the click point** — far
   enough that the pointer and the clicked object's neighbourhood stay
   visible (a profile number, e.g. `modal.anchorOffset: {x: 24, y: -24}`
   plus the modal's own height).
2. **Clamped to the viewport** — near the top or right edge it flips or
   slides so it never leaves the screen and never returns to cover the
   click point.
3. Draggable stays. EVERY modal inherits — cabinet editor, element
   detail, hinge modal, colour pickers; one shell, no per-modal copies.
4. Walk it: double-click a door low-left, low-right, top-right — the
   door stays visible in all three shots.

## F4 — Turn-17's lost verdict: double-click a part on the CNC sheet

The owner asked for it in the turn-17 list and the instruction dropped
it (my transcription, not his omission): "kliknięcie 2 razy na dany
element zabiera nas do listy po prawej, otwiera i podświetla który to
element."

Double-click a part on the CNC sheet → the right-hand tree scrolls to,
expands and highlights that part's row. Nothing is edited; it is pure
navigation. (Manual rotation from the same old list stays OUT — the
turn-17 shelf rule made rotation automatic and no verdict since has
asked for a hand control.)

## F5 — The LIFT-SELECTION ENGINE (no cabinet kit yet)

Turn 20 will build the HK / HF wall-cabinet kits after a pattern session
with the owner. THIS turn lays the maths so the kits only consume it:

1. **Board weight.** Materials gain `kg_m2` — the owner's own numbers,
   profile fallback `board.kgM2`: MFC {18: 12, 22: 14.5, 25: 16.5},
   MDF lacquered {18: 14, 22: 17, 25: 19}. The material store carries the
   column (as thickness is carried); assigned board wins, profile
   fallback otherwise. Derived: a front's weight in kg (area × kg_m2),
   shown in the element detail footer.
2. **Power factor.** Pure engine function, `aventos.json` numbers:
   `pf = cabinet_height_mm × front_weight_kg`; pick the unit whose range
   holds it (2300: 420–1610, 2500: 930–2800, 2700: 1730–5200, 2900:
   3200–9000 — ranges READ from the json, not retyped). Overlaps resolve
   to the SMALLER unit. Outside every range, and against the HK limits
   (height 205–600, width ≤ 1800, inner depth ≥ 261): a WARNING with
   guidance — the owner's rule, "silnik proponuje, klient assign, ale
   guidance i sprzeciw".
3. **Client assignment.** The function takes an optional assigned unit
   and answers {unit, proposed, warnings[]} — assignment outside the pf
   range warns ("front too heavy for 2300 — 2500 fits"), never blocks.
4. node:test the lot: each range's edges, the overlap rule, the limits,
   the assignment warnings, MFC vs MDF weights. NO kit, NO UI beyond the
   weight line in the detail footer — the kits are turn 20, after the
   owner's pattern session (open questions already live in BLOCKERS:
   HK unit position on the side needs the 20K `.mpr` or the assembly
   PDF; the HF drilling five-pattern json is in reference/).

## F6 — Browser walk + docs + GATE

Walk (screenshots to `verify/t19/`, committed): Settings-Hinges with
system, finish and the disabled ⌀3 plate (tooltip open); a run where one
thick front resolves to 95° and the BOM splits articles by angle and
finish; a wardrobe with an inner drawer resolving 155°; the hinge modal
opened by double-click, offset up-right, the door fully visible — three
corners; "Assign other hinge" overriding one door and the BOM following;
hinge GLB on the drilled points with fronts hidden, and the grey
stand-in with the bucket down; double-click on a CNC part highlighting
its tree row; a front's weight in the detail footer, MFC vs MDF; the
lift engine's warning text surfaced in a test snapshot (no kit UI).

Docs: BUILD-LOG per phase; BACKLOG (lift kits → turn 20, pattern session
first); BLOCKERS: ⌀3 plate pattern (Blum 173L card), HK unit `.mpr` /
assembly PDF, per-family second article meaning. GATE: full reinstall →
all green (1406 + new) → clean build → fixtures diff 0 → deps untouched
→ engine purity → CNC identity **zero deltas** → `verify/t19/` populated
→ PR.