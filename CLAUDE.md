# CLAUDE.md — TURN 63 · PBI: EVERYTHING PRO HAS, COPIED

Run autonomously. Zero questions, zero stops. Skip-and-note. PR before morning.
Full suite, never `--silent`. Frames committed under `verify/t63/`.

## THE LAW OF THIS TURN

The owner, 01.09.2026, verbatim:

> *"miało być identycznie jak w PRO, tylko inna kolorystyka i trochę mniej,
> a pozmieniałeś sporo. Sprawdź jakie jeszcze funkcje pominąłeś i je dodaj,
> a później będziemy ustawiać jak je rozmieścić."*

And the law it rests on, from 01.09:

> *"jak piszę 1 do 1 to KOPIUJ. ale kopiuj — nie kasuj, nie zmieniaj PRO,
> tylko zrób identycznie w retail."*

T62 proved the method works: `WallElevationModal` went across at 1096 lines to
1096 lines and the owner's verdict was *"super, widzę"*. T60 did the opposite —
it re-wrote PRO's surfaces "in retail language" — and this is what it produced:

| Surface | PRO | retail | factor |
|---|---|---|---|
| `LightingPanel` → `LightingMenu` | 861 | 61 | **14×** |
| `DoorModal` → `DoorMenu` | 996 | 113 | **9×** |
| `WatchLayoutModal` → `WatchMenu` | 246 | 85 | 3× |
| `RailModal` → `RailMenu` | 148 | 70 | 2× |

That is the *"1 do 20"* the owner is angry about, measured. **Tonight it is
paid back by copying, exactly as T62 copied the room.**

**PLACEMENT IS NOT THIS TURN'S PROBLEM.** The owner said arrangement comes
later. Get every surface INTO retail and reachable; do not spend the night
deciding where things sit. A copied surface that opens from a plain button is a
success tonight. A beautiful layout with a missing surface is a failure.

---

## THE COPY METHOD (unchanged from T62, which passed audit)

For each surface named below:

1. **Copy the PRO file verbatim** into its retail path.
2. **Repoint imports only**: `engine`, `lib`, `stores`, `3d` resolve as they
   are (all four are shared core since T62). Any import that lands in
   `src/components/**` is **copied too, recursively**, into
   `src/retail/design/`, until nothing outside the boundary is reached. Some
   are already across (`Modal.jsx`, `NumberField.jsx`) — reuse those copies,
   do not make a second one.
3. **Change the SKIN only**: class names and CSS to PBI tokens (Ivory & Onyx,
   Cormorant for titles, Inter for controls, gold in hairlines only).
   Structure, control order, labels, gestures, defaults, refusals: **unchanged,
   to the word**.
4. **Do not drop a control** because a client "would not need it". That
   judgement is what produced 61 lines where PRO has 861. If something truly
   must not ship to a client, it is HIDDEN behind
   `RETAIL_SHOW_WORKSHOP_TOOLS` in `src/retail/config.js` — present in the
   copy, switched off — and named in the PR body. Never deleted from the copy.
5. **Every copy gets an entry.** A copied surface nobody can open is not done.

The copy-fidelity test (T62, `test/turn62-f2-f3-the-copy.test.js`) is the
pattern: extend it, do not replace it.

---

## WHAT IS FROZEN

1. **PRO — zero bytes**: `index.html`, `src/App.jsx`, `src/main.jsx`,
   `src/components/**`, `src/pages/**`. The freeze test stays green, unedited.
   Never refactor a PRO file into a shared part — that moves PRO's bytes.
2. **`src/engine/**` and `src/lib/**` — read-only tonight.** No engine file is
   licensed. If a copy seems to need one changed, that is a skip-and-note.
   Goldens ×6 byte-identical; `UNNAMED=0`.
3. **`reference/lisp/**` untouched.** Parens 14/14 at 0/0.
4. **The RAIL is not rebuilt.** Still waiting on the owner's mockup. Not
   started, not scaffolded, `CATEGORIES` not renamed. New surfaces hang off the
   DETAIL panel and off buttons in the panels that already exist.
5. **`src/3d/**` — one file licensed, F1 only**, and by the channel pattern
   that T61 proved leaves PRO untouched.

---

## F1 · HINGES, ALWAYS

The owner: *"nadal nie widać zawiasów"* → *"1 — zawiasy zawsze"*.

There is no bug. `src/3d/Hardware.jsx` states its own law: **hinges and runners
are X-RAY ONLY**, because a working view of a cabinet is not a hardware
drawing. PRO has always behaved this way. The client, however, is buying the
hardware and wants to see it.

- Do **not** change the rule for PRO. Use the T61 channel pattern: the X-ray
  condition in `Hardware.jsx` becomes `xray || chromeOn('hardware-always')`.
  PRO sets no channel, so `chromeOn` falls through to the master switch, which
  is on for PRO but reads `false` for that named channel in retail's boot — no,
  read the actual fall-through in `src/3d/chrome.js` before writing this and
  make the wiring such that **PRO's rendered output is bit-for-bit what it is
  today**, and retail shows hinges and runners in every view. Prove PRO's
  half with a test that renders PRO's flags and asserts the hardware stays
  X-ray-only.
- `src/retail/main-retail.jsx` sets the channel `true`, beside the eleven
  already there.
- Runners come with hinges — same law, same channel, one decision.

**Proof**: `verify/t63/f1-*.png` — a wardrobe in SOLID with hinges visible in
retail; the same scene in PRO with hinges absent.

## F2 · LIGHTING, COPIED — AND THE LIGHTS BUTTON STOPS SWITCHING THE LIGHT OFF

The owner: *"oświetlenie jest inne jak w PRO a powinno być identyczne"* ·
*"nie ma suwaka do bright"* · *"przyciski LED powinny być wszędzie gdzie mogą
być, ale pojawiają się tylko jak nacisnę lights"* · *"jak naciskam lights to
nie powinno się wyłączać światło tylko powinno się pojawić menu oświetlenia
(jak w PRO)"*.

Source: `src/components/LightingPanel.jsx` (861 lines).
Target: `src/retail/design/lighting/LightingPanel.jsx` — a COPY.

- Copy by the method above, recursively. It carries what PRO has and the retail
  menu lost: **brightness**, colour temperature, the five mounting kinds, the
  depth control, the room rig, per-strip on/off — read the file and carry
  **all** of it, not the four things this spec happened to name.
- **The LIGHTS button in the VIEW BAR opens this panel.** It does not toggle
  the light. Read what PRO's equivalent control does and do that. If a separate
  on/off exists in PRO, it exists in the copy too, in PRO's place for it.
- **LED entry points are shown wherever a strip may go, always** — not only
  after LIGHTS is pressed. `src/3d/LedIcons.jsx` is already on its own channel
  since T61; find why the icons are conditioned on the lighting mode and make
  the condition PRO's condition. If PRO shows them always, retail shows them
  always.

**Proof**: `verify/t63/f2-*.png` — the panel open beside its button; the
brightness control; LED entries visible with the panel CLOSED; a lit wardrobe.

## F3 · THE ELEMENT EDITORS, COPIED

Every one of these is a PRO surface the client needs and retail has a sketch
of. Copy each; the retail sketch it replaces is deleted (licensed below).

| PRO source | lines | retail target |
|---|---|---|
| `DoorModal.jsx` | 996 | `design/detail/DoorModal.jsx` |
| `WatchLayoutModal.jsx` | 246 | `design/detail/WatchLayoutModal.jsx` |
| `RailModal.jsx` | 148 | `design/detail/RailModal.jsx` |
| `UnitSizeModal.jsx` | 141 | `design/detail/UnitSizeModal.jsx` |
| `AddItemsModal.jsx` | 119 | `design/detail/AddItemsModal.jsx` |
| `FrontGapModal.jsx` | 153 | `design/detail/FrontGapModal.jsx` |
| `JpullRunModal.jsx` | 124 | `design/detail/JpullRunModal.jsx` |

- `AddItemsModal` is the answer to the owner's *"jakieś dziwne dodawanie wielu
  przegródek"*: retail grew its own way of adding a partition and it does not
  behave like PRO's. Copy PRO's, and the strangeness goes with the sketch.
- If a copied modal reaches `AddItems.jsx` (the row engine itself), copy that
  too — it is the single law for what may be added where, and T61 proved
  retail must not hold a second one.
- Entries: each opens from the element's Duty menu in `7 DETAIL`, from the row
  PRO opens it from. Placement is provisional; the owner will arrange later.

**Proof**: `verify/t63/f3-*.png` — one frame per copied modal, open, with its
click path.

## F4 · THE MATERIAL PICKERS, COPIED — INCLUDING THE EGGER TILES

The owner: *"nadal kafelki Egger nie widzę w uzgodnionej wersji"*.

| PRO source | lines | retail target |
|---|---|---|
| `DecorPickerModal.jsx` | 393 | `design/material/DecorPickerModal.jsx` |
| `DecorPicker.jsx` | — | `design/material/DecorPicker.jsx` |
| `ColourPicker.jsx` | 97 | `design/material/ColourPicker.jsx` |
| `VeneerPicker.jsx` | — | `design/material/VeneerPicker.jsx` |
| `MaterialChoicePanel.jsx` | 160 | `design/material/MaterialChoicePanel.jsx` |
| `FrontStyleGallery.jsx` | 109 | `design/material/FrontStyleGallery.jsx` |
| `WizardHardware.jsx` | 225 | `design/material/WizardHardware.jsx` |
| `UnitFinishModal.jsx` | 163 | `design/material/UnitFinishModal.jsx` |

- `DecorPickerModal` is the tiled Egger modal with search and family bar; a tile
  click chooses and closes. It replaces retail's five curated swatches.
- The **source→picker law already exists in the profile**: every carcass and
  front source names the picker it opens (`decor` / `colour` / `veneer` /
  none), and the thickness rides with the source (Egger 18, veneer 19, spray
  18). `MaterialChoicePanel` is the surface that reads that law. Copy it and
  retail stops inventing material rules.
- `UnitFinishModal` closes a real bug the parity map has carried since T60:
  retail writes the PROJECT palette, so with two wardrobes a colour set on one
  sets both. `setUnitFinish` / `resetUnitFinish` exist in the store, unused.
  The copy uses them.
- **Egger gate**: the decors are read from the real bucket. Never fabricate a
  row. The mail to Egger UK is still owed before public launch — state in the
  PR body that this ships behind the existing gate.

**Proof**: `verify/t63/f4-*.png` — the Egger modal with tiles and search; a
tile chosen and the modal closed; two wardrobes in different colours.

## F5 · THE VIEW BAR

The owner: *"górne menu nr 4 powinno być mniejsze litery, ładniejsza czcionka,
bardziej wyraźne i może w jakichś kafelkach"* · *"front dimensions wywal, po co
mi to"* · *"measure wyrzuć też"* · *"reset view widok wyśrodkowany, powinien
być od środka"*.

- **Remove from retail's VIEW BAR**: `FRONT DIMENSIONS` and `MEASURE`. Removed
  from the retail bar only — PRO keeps both, untouched.
- **Restyle**: smaller type, Inter, higher contrast, each tool a tile with a
  hairline and a hover state. One row height. PBI tokens. This is the one place
  tonight where the skin is allowed to lead, because the owner asked for it by
  name.
- **RESET VIEW centres the model.** Read `src/3d/cameraPresets.js` and make
  reset frame the design's bounding box centre at a distance that fits it —
  the same maths PRO's reset uses if PRO already centres; if PRO does not,
  write it in the retail view-tool only and say so.

**Proof**: `verify/t63/f5-*.png` — the bar before and after in the same
viewport; a reset from an off-centre orbit landing centred.

## F6 · THE PARITY LEDGER

The owner: *"sprawdź jakie jeszcze funkcje pominąłeś"*. Tonight's copies are
this spec's best reading, not a proof of completeness. Produce the proof.

- Write `verify/t63/parity-ledger.md` **from the code**, not from memory: walk
  `src/components/**`, and for every file state — its line count, whether a
  retail copy exists (and at what line count), and one of three verdicts:
  **COPIED**, **WORKSHOP** (never for a client — with the reason), or
  **OWED** (a client surface still missing — with what it does).
- Sort the OWED list so the owner reads the biggest gap first.
- This ledger replaces `verify/t60/parity-map.md` as the map, because that map
  counted "surfaces" and this one counts code.

**Proof**: the ledger committed, and its OWED section quoted in the PR body.

---

## TESTS AND PROOF

1. Full suite green, never `--silent`. PRO freeze test green and unedited.
2. Goldens ×6 byte-identical; `computeCabinet()` vs LISP exact; `UNNAMED=0`;
   `verify/t63/t63-classify.mjs` proving **zero** files changed under
   `src/engine` and `src/lib`.
3. Parens 14/14 at 0/0.
4. The boundary test green: `src/components/**` still forbidden to retail.
5. **Copy-fidelity, extended**: for every file copied tonight, read the PRO
   source and the retail copy off disk and assert the copy carries every
   control label, every hook and every gesture the original has. A label the
   original has and the copy does not is a FAILING test that names the label.
   Extend `test/turn62-f2-f3-the-copy.test.js`'s pattern; verify the test
   itself by planting a rename and watching it fire.
6. A test that PRO's hardware stays X-ray-only after F1.
7. A test that retail holds exactly ONE law for what may be added where.
8. Playwright walk: every F's frames, committed.

## LICENSED REMOVALS

- The retail sketches superseded by copies: `LightingMenu.jsx`,
  `DoorMenu.jsx`, `RailMenu.jsx`, `WatchMenu.jsx`, and any other
  `design/detail/*Menu.jsx` whose PRO original is copied tonight. Delete them —
  a sketch left beside its copy is the second track this project keeps
  killing. Where a sketch holds retail-only wiring, move that wiring into the
  copy's entry, do not keep the sketch alive for it.
- `FRONT DIMENSIONS` and `MEASURE` from the retail VIEW BAR (F5).
- Retail's five curated Egger swatches, superseded by the copied modal (F4).
- Nothing else. Tombstones two lines maximum. **Deletions must exceed
  additions in the retail sketch directories**, or explain every line.

## BALANCE

Per copied file: PRO path, retail path, PRO line count, retail line count, and
the changes made (which must read "imports repointed, classes reskinned"). Then
answer in one line each:

- How many laws decide what may be added where? (Must be one.)
- How many surfaces write a unit's finish? (Must be one.)
- Which PRO controls were hidden behind `RETAIL_SHOW_WORKSHOP_TOOLS`, and why?
- What is still OWED, from the ledger?

## SKIP-AND-NOTE ORDER

F6 → F5 → F3 → F4 → F2 → F1.
F2 is the owner's loudest complaint and F1 his direct order; neither is skipped.
If the night can finish only one big thing, it finishes F2.