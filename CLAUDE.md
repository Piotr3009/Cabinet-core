# CLAUDE.md — TURN 58 · THE SLOPE'S LAST LIES, THE SHOE'S RETURN, THE SHELVES LEARN THEIR BAY

Run autonomously. Zero questions, zero stops. Skip-and-note; sacrifice
F8, then F7, then F6, then F5 — NEVER F1/F2/F3. PR before morning.
Branch `t58`.

**BASE: `origin/main` WITH t57 MERGED (paren census 14/14 arrives from
t57's KIT_FRONT_JPULL). If t57 is not merged, stop and say so in the PR
description. Do not run in parallel with any other turn.**

## STANDING LAW (unchanged, enforced)

- **LISP IS LAW.** Geometry changes are written in `reference/lisp/`
  FIRST; the engine follows. Census stays **14/14 at 0/0** — this turn
  adds LINES, not files.
- **BYTE-IDENTITY.** Goldens (flat, no wall, no shoe, no props)
  byte-identical. `t58-classify.mjs`, `UNNAMED=0`. NAMED deltas only on:
  (a) slope-dressed fixtures (F1 removes phantom drills); (b) shoe-drawer
  fixtures (F2 births the insert); (c) wall-proximity infill fixtures
  (F5 moves the top infill). A bare `computeCabinet()` never centres a
  shelf, so F3 moves no engine byte — assert it.
- **Sanctity — licensed this turn, and nothing else:**
  1. the static two-door `['BUL','BUR']` hinged-side table and every raw
     `cfg.hinge` side-pick it feeds (F1) — replaced by the one resolver,
     old tor physically deleted;
  2. the `if (!lightingOpen) return null` gate in `src/3d/LedIcons.jsx`
     (F7) — the owner's order overrides T54-F5's narrower conduct, and
     the T54 comment is re-headed to say so;
  3. nothing else is deleted or changed without licence.
- **One path per job.** Report the counts: "which board carries this
  leaf's plates" = 1; shoe-insert law = 1; shelf-opening finder = 1;
  top-infill-to-wall law = 1.
- New feature = visible UI entry, same package, screenshot-proven.
- Full suite, never `--silent`. No new npm dependencies (GLTF loading
  exists — reuse it). Owner quotes are law; code and UI copy in English.

---

## F1 [CRITICAL] · BUGFIX — THE PHANTOM HINGE COLUMN ON BUL/BUR

Diagnosed 30.08, numeric proof. Owner's symptom: *"jak mamy skos i się
przełącza z lewej na prawą stronę drzwi, ale na BUL i BUR się już nie
przełącza."*

### The cause (one)

The carcass hinged-side resolution is BLIND to the forced flip:
`src/engine/cabinet.js` ~1760–1763 hard-codes two doors →
`['BUL','BUR']` and one door → `cfg.hinge === 'R' ? 'BUR' : 'BUL'` (raw
param), and the store's bay path (`src/stores/projectStore.js` ~557)
reads the raw leaf hinge the same way. Under a slope the leaves are
FORCED (T46/T55, `meta.hingeForced`) and the flipped leaf hangs on the
DOOR PARTITION (T55-F3) — but the old table still bores the abandoned
side.

### Reproduction — write the RED test from this first

    WARDROBE, W1000 H2200 D600, door_count 2,
    slope_cut { pts:[{x:0,y:1300},{x:1000,y:2200}], infill:40 }

Measured on main: leaves `01-FL:R(F) 01-FR:R(F)`; hinge drills:
**BUL = 6 (phantom), BUR = 12**. Correct: BUL = 0 — no door hangs there;
FL's column lives on the partition (T55-F3 drills it — assert it is NOT
doubled). Flat twin: BUL 12 / BUR 12, byte-identical.

### The law

ONE resolver — "which board carries THIS leaf's plates" — reading the
leaf's `meta.hinge` (forced or free) and the partition's presence, in
the engine, consumed by: the drilling pass, the hardware 3-D (hinge
meshes on the carcass), and the store's bay logic. The static table and
every raw side-pick die (licensed). Slope RIGHT is the same resolver
with zero extra branches — the test proves L and R are mirrors.

DoD: `test/turn58-f1-the-phantom-column.test.js` red-first (L, R,
one-door both hands, flat twins byte-identical); frame
`verify/t58/f1-bul-bur.png` — X-ray, slope on, no rings on the
abandoned side.

## F2 [CRITICAL] · THE SHOE DRAWER GETS ITS INSERT BACK

History, honestly: T54-F7 killed the old shoe world on the owner's own
order; the re-spec covered the box and never mentioned the insert, so
the ramp and dividers went to the grave with it. The conditions now
exist — verbatim law:

1. **The ramp (skos) returns INSIDE the drawer.** Its angle is the
   LIVING law — `P.wardrobeAccessories.shoeShelf.tiltDeg`, the shoe
   SHELF variant that survived T54 (name this source in the report; no
   second angle anywhere).
2. **Dividers: ALWAYS 2** — *"po prostu daj 2 zawsze"* — three even
   lanes; divider grain HORIZONTAL (Petros sheet-goods law, as the
   watch insert).
3. **Top of the drawer stack ONLY** — *"tylko na wierzchu innych
   szuflad."*
4. **NOTHING above it** — *"nie może mieć półki nad sobą, bo buty będą
   chodzić."*
5. **Watch XOR shoe per cabinet** — *"jeśli będzie szuflada z zegarkami,
   to już nie możemy w tej szafie zrobić butów."* Adding the second kind
   names the first and REFUSES IN WORDS — store guard AND engine
   warning if params arrive broken.

LISP FIRST: the insert's law goes into the shoe-drawer section of
`reference/lisp/KIT_WARDROBE_FULL.lsp` (lines, not a file). Engine
births 1 ramp + 2 dividers on the measured drawer interior; BOM carries
the boards; the ramp's tilt prints on the sheet the way a slope prints
`CUT β°`; 3-D renders with the standing grain law.

DoD: `test/turn58-f2-the-shoe-insert.test.js` (parts born, tilt ==
shoeShelf.tiltDeg, grain 'h', top-only enforced, shelf-above refused,
watch⇄shoe both directions refused with the other named, flat goldens
untouched); frames `verify/t58/f2-shoe-open.png`, `f2-shoe-refused.png`.

## F3 [HIGH] · BUGFIX — THE SHELVES LEARN THEIR BAY, THE PINNED SHELF, AND THE CENTRED ADD

Owner, three sentences, three laws — with the culprits named from
today's dig:

1. **A fixed shelf CARRYING A DIVIDER is PINNED** — *"ona już jest
   ustawiona na stałe."* The link exists (`mount: 'shelf'` + the shelf's
   id, `projectStore` ~5022). Centring never moves it — and it CUTS the
   ladder exactly as a split crossbar does (T37-F4a's own words about
   the divider: shelves below centre up to it, shelves above from it —
   the same `bandSegments` law, one more boundary kind, not a second
   segmenter).
2. **Centring is PER BAY, never across.** *"Centrujemy tylko prawy lub
   lewy bay… nie robimy na przemian ze wszystkich bayów."* Culprit:
   `redistributeShelves` segments only vertically by crossbars — `zone`
   does not appear in the function at all. The law: invoked from a
   shelf's/bay's context → THAT bay; invoked on the whole unit → every
   bay gets its OWN ladder, never one ladder through a partition.
3. **A newly added shelf lands CENTRED** in the biggest opening of ITS
   bay, respecting pinned shelves. Culprit: `centredShelfPos`
   (`engine/items.js:151`) receives the WHOLE unit's positions and band
   — bay-blind and pinned-blind, so "the biggest opening" reaches
   through the partition.

ONE opening-finder for both callers (the add and the centre button),
zone-aware and pinned-aware — path count 1. Engine functions stay pure
(new inputs, no store reads); a bare `computeCabinet()` is untouched —
goldens prove it.

DoD: red-first tests — bay with a divider: added shelf lands in THAT
bay's opening; centre on a two-bay unit yields two independent ladders;
a pinned fixed-shelf-with-divider never moves and splits its bay's
ladder; no-bay flat unit behaves byte-for-byte as today. Frame
`verify/t58/f3-centre-per-bay.png`.

## F4 [HIGH] · PULL-DOWN CANNOT LIVE UNDER A SLOPE

Owner: *"jak się zaczyna skos, to ma zniknąć — nie tylko jak się pojawi
diverter, ale też jak jest sam. Szafa ze skosem nie może mieć
pull-down, bo to jest zawsze na wysokości."* The kit's own numbers
agree: it parks HIGH (rod axis ~657 in file metres, arm ~607) and its
swing sweeps the top front.

1. Slope becomes ACTIVE → every `pulldown_rail` kit on the unit is
   REMOVED in the same store transition T55-F3 clears the interior —
   same family, same notify style, the message names the pull-down.
   Always on active slope, knee or straight.
2. On a sloped unit the Add-items entry is GREYED with a one-line
   reason — through the EXISTING library `enabled/reason` channel
   (`engine/library.js`; name it, no second gate).
3. Slope removed → entry re-enables; the kit does NOT resurrect itself.

DoD: test (kit gone + entry disabled with reason; re-enable without
resurrection; flat twin untouched); frame
`verify/t58/f4-pulldown-greyed.png`.

## F5 [HIGH] · THE TOP INFILL RUNS TO THE WALL, OVER THE SIDE INFILL

Owner: *"jak dojeżdżamy szafą do ściany i się pojawia infill boczny, to
niech górny się przedłuży do ściany — jak było wcześniej."*

Side infill appears (wall proximity) → the TOP infill EXTENDS to the
wall face, capping the corner; the SIDE infill keeps its height and
stops UNDER it — one plane at the joint, ZERO overlap (the Petros
no-overlap iron rule; the junction conduct is `src/engine/mitre.js`'s
turn-6/8 strip law — take it, name it). *"Jak było wcześniej"* is a
regression claim: search the history (T53 "infills follow the slope"
and the turn-6/8 infill turns are the suspects), NAME the commit that
shortened the top infill at the wall, and state in the report whether
this RESTORES an old law or writes it for the first time — either
answer is fine, a guess is not. Under an ACTIVE slope nothing here
applies — T55-F1's four corners govern, untouched.

DoD: red-first test (top infill's span reaches the wall face; side
infill meets its underside in one plane; the standing collision check
stays silent; away-from-wall twin byte-identical); frame
`verify/t58/f5-infill-corner.png`.

## F6 [MEDIUM] · A CLOSING DOOR CLOSES WHAT IT COVERS

Owner: *"jak zamykasz szafy drzwi, to szuflady muszą się zamykać
automatycznie."* The picture respects physics — a real leaf would hit
them.

1. Closing a leaf (its own click, or Open-all switching off) → every
   PULL-OUT behind that leaf glides shut: internal drawers, pull-out
   shelves, watch/belt/shoe drawers — the `openFronts`/`openKits`
   families, one law. The lowered PULL-DOWN parks too (lowered, it
   collides with the leaf).
2. Which pull-outs a leaf covers is answered by GEOMETRY (the leaf's
   span over the kit's bay/zone), once, in one place.
3. Opening a leaf opens NOTHING. The easing is the standing
   `delta·8` — no teleports.
4. Store/3-D only; zero engine bytes.

DoD: test on the ui law (close leaf → covered kits' open state drops;
uncovered kits untouched; open leaf → nothing); rig frames before/after
`verify/t58/f6-door-closes-drawers-*.png`.

## F7 [MEDIUM] · LIGHTING — THE ICONS STOP HIDING, THE ROOM MOVES DOWN

History, named: the current conduct IS T54-F5 as specified —
`LedIcons.jsx` ~113 `if (!lightingOpen) return null`. Not a fossil; a
narrower spec than tonight's order.

1. LED placement icons ALWAYS visible in the EDITOR viewport (licensed
   gate deletion; re-head the T54 comment with the owner's order). NEVER
   in renders, captures or PDFs — assert the capture path excludes
   them.
2. In the Lighting modal, the ROOM section (four lamps + room light)
   moves to the BOTTOM; strip controls stand above. Order changes; not
   one control added, removed or renamed.
3. WHILE IN THE 3-D: the watch pane's proof is still owed. Re-shoot
   `verify/t58/f7-pane-through.png` with the drawer OPEN and the insert
   lit, the insert CLEARLY VISIBLE through the glass; if the current
   opacity 0.42 hides it, lower toward t57's specified 0.22–0.32.

DoD: icons present with the panel closed (`f7-icons-always.png`),
absent in a capture (frame or assertion — report says which); modal
frame `f7-room-at-bottom.png`; the pane frame above.

## F8 [MEDIUM] · PROPS v1 — THE DRAWERS GET DRESSED

Owner approved the pack (watches ×4, belt rolls ×5, folded ties ×6 —
metres, real sizes, light meshes) and the switch: *"ok props on/off —
zegarki wiedzą i reszta też wie."*

1. ASSETS live in the Supabase bucket `props/` with a `manifest.json`
   in the Movento school. The repo carries NO model binaries (CONERO
   precedent). **If the bucket or manifest is missing at run time: build
   the whole machinery anyway, ship the toggle GREYED with a one-line
   reason, skip the dressing walk and note it — nothing throws.**
2. PLACEMENT is automatic and MEASURED: load → `updateMatrixWorld` →
   Box3 → LAY the piece into its slot — watches LYING into the watch
   insert's pockets (the model stands ~80 mm, the interior is 60 —
   orient by measurement, never by guess), belt rolls flat into lanes,
   ties into sections. Fewer slots → fill what exists; more → repeat
   variants. No prop intersects a board.
3. THE SWITCH: a `Props` toggle in the VIEW-BAR family (beside
   Outlines / X-ray) — a PICTURE switch, global. Renders HONOUR it;
   BOM, CNC, DXF and the invoice are BLIND to props — state where that
   blindness is structural.

DoD: toggle frames `verify/t58/f8-props-on/off.png` (or greyed-with-
reason frame when assets absent); a BOM/DXF assertion that props add
zero rows/paths; the walk (assets permitting) lays one watch, one belt,
one tie by measurement and prints the landed boxes.

---

## ORDER, PROOF, REPORT

**F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8.** Bugfixes red-test-first,
each its own commit.

Proof: full suite green; `t58-classify.mjs` named-deltas only (slope,
shoe, wall-infill fixtures) with per-feature probes; paren 14/14;
screenshots listed above.

Morning report, numbered: per feature done/skipped; the four law path
counts (each must be 1); licensed deletions confirmed executed; the F5
history verdict (restored vs new, commit named); `+X/−Y`; test totals;
classifier verdict; anything skipped and why.