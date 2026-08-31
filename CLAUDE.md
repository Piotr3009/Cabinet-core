# CLAUDE.md — TURN 59 · PRIME BESPOKE INTERIORS, R1: THE SWITCH, THE SHELL, THE DESIGN ROOM

Run autonomously. Zero questions, zero stops. Skip-and-note; sacrifice F7,
then F6, then F5 — NEVER F1/F2/F3/F4. PR before morning. Branch `t59`.

**SAFETY FIRST: this file's first heading says TURN 59. BASE: `origin/main`
WITH t58b MERGED (the alpha pane exists: `PANE_ALPHA_GLASS` in
`src/3d/UnitView.jsx`). If it does not, stop and say so in the PR.**

## WHAT THIS TURN IS — AND WHAT IT IS NOT

Cabinet Core becomes TWO applications in ONE repository, sharing ONE
engine and ONE 3-D viewer:

- **CABINET CORE PRO** — the application that exists today, for joiners.
  Owner, verbatim: *"ten istniejący tryb to jest tryb PRO i musi być
  zachowany jak teraz."* NOT ONE VISIBLE BYTE OF PRO CHANGES THIS TURN.
- **PRIME BESPOKE INTERIORS (PBI)** — the client-facing site and its
  online estimate, born this turn as R1: the launcher switch, the site
  shell in the Ivory & Onyx design system, and the design room where a
  client designs a wardrobe in 3-D and asks for a quote.

Owner's brief for the design room: *"to nie okna, więc musi być miejsce
na design."* A window is configured from a sheet of attributes; a
wardrobe is DESIGNED in a room. The 3-D stage is the centre of the page,
the client's space (wall, ceiling, slope) is the first step, a collection
restyles the whole design in one click, and a full-screen view lets the
client look at what they made. The menu is the PSW law, verbatim from
the owner: *"jak w PSW, lewa i prawa strona menu — rozwijana będzie za
długa i się będzie mieszać."* Two menu columns side by side on the left
(categories, then the options of the active category), the stage, and a
detail column on the right. NOTHING folds open in place; no accordions.

NOT in R1: accounts, basket, Stripe, prices (no price law exists — F5),
the retail database, public deployment. R1 builds; nothing goes public —
the Egger licensing gate stands before any publication.

## STANDING LAW (unchanged, enforced)

- **PRO IS FROZEN.** `git diff origin/main..HEAD --stat` on `index.html`,
  `src/App.jsx`, `src/main.jsx`, `src/components/**`, `src/pages/**` must
  be EMPTY. The PRO bundle's module graph must not contain a single file
  from `src/retail/`. Both are assertions in the suite (F1).
- **BYTE-IDENTITY.** Engine untouched → goldens byte-identical,
  `t59-classify.mjs` = ZERO deltas, `UNNAMED=0`, `NAMED=0`. LISP
  untouched, census 14/14.
- **THE IRON BOUNDARY (Petros, 30.08):** `src/retail/**` imports NOTHING
  from `src/components`, `src/pages`, `src/App.jsx`; nothing outside
  `src/retail/` imports from it. The SHARED CORE both apps may import is
  exactly: `src/engine/**`, `src/3d/**`, `src/stores/**`. A test walks
  the import graph and fails on the first violation (F1).
- **PETROS DESIGN SYSTEM IS LAW.** Every colour on the PBI side is one of
  the twelve named tokens, used where the system says; 72 / 23 / max 5
  gold; zero border-radius; no gradients; no #FFFFFF as a large
  background; no brown/camel/pastel; gold only in 1-px lines, button
  borders, small marks, active menu. A colour not in the token file is a
  violation.
- **Petros iron rule (30.08): engine numbers do not enter a UI without
  the owner's order.** PBI exposes CHOICES (chips, sliders bounded by
  the profile's own limits), never raw engine parameters, never a price
  the owner has not decreed.
- **Sanctity.** No deletions this turn. Additive only. The shared core
  may gain OPTIONS (listed at the end); it may not change behaviour for
  PRO under any default.
- **No new npm dependencies.** Fonts load by `<link>` in `retail.html`
  only. Visible UI entries proven by screenshot; full suite never
  `--silent`.

---

## F1 [CRITICAL] · THE SWITCH — TWO DOORS, ONE HOUSE

Owner: *"chcę mieć przełącznik… PRO jest identyczne jak teraz, z retail
nowa instrukcja."*

1. Vite becomes multi-page: `index.html` (PRO, untouched), `retail.html`
   (PBI, new), `start.html` (the switch, new). `vite.config.js` gains the
   three `rollupOptions.input` entries — the ONLY change outside
   `src/retail/` besides the listed shared-core options.
2. `start.html` → `src/retail/launch/` (imports nothing from PRO): a
   full-screen page in the design system — Porcelain ground, the PBI
   wordmark, two flat tiles side by side: **CABINET CORE PRO** (Onyx
   tile, Porcelain text → `/`) and **PRIME BESPOKE INTERIORS** (Signature
   Ivory tile, Onyx text, Champagne line → `/retail.html`). A switch, not
   a marketing page.
3. `/` keeps opening PRO exactly as today. Vite dev `server.open` may
   point at `/start.html`. `vercel.json` rewrites `/retail` →
   `/retail.html` and `/start` → `/start.html` only if `vercel.json`
   exists and the change is additive; otherwise skip and note. Deploy
   split is a later turn.
4. Tests (`test/turn59-f1-the-switch.test.js`): the three entries
   build; the PRO frozen-files assertion; the import-boundary walker
   (parse every `import` / `export … from` under `src/`, resolve, assert
   the rule); the PRO module graph (static walk from `src/main.jsx`, or
   Vite's manifest) contains no `src/retail/` file. **This test lands
   BEFORE any retail file is written.**
5. Frame `verify/t59/f1-switch.png`.

## F2 [CRITICAL] · THE SHELL — IVORY & ONYX, TO THE HEX

### Tokens — `src/retail/styles/tokens.css`, verbatim from Petros

    --pbi-porcelain:#FAF8F3;  --pbi-warm-white:#F2EEE7;
    --pbi-ivory:#D9D1C6;      --pbi-soft-ivory:#E7E1D8;
    --pbi-stone-line:#C7BCAF; --pbi-onyx:#090A09;
    --pbi-carbon:#171817;     --pbi-graphite:#292A28;
    --pbi-soft-graphite:#5C5B57;
    --pbi-gold:#B8A588;       --pbi-deep-gold:#806A44;
    --pbi-gold-highlight:#D2C19F;
    --pbi-header-h:82px; --pbi-hero-min-h:720px; --pbi-side-margin:72px;
    --pbi-section-gap:112px; --pbi-button-h:50px; --pbi-gold-line:48px;
    --pbi-radius:0;

### Typography — the owner's system has no type spec yet; this is the
### standing proposal, tokenised so a two-line change swaps it if he
### strikes it in the morning

    --pbi-font-display: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
    --pbi-font-ui:      'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;

- Display (wordmark, headings, totals): weight 500, UPPERCASE,
  letter-spacing 0.14em; hero H1 ≈ 56px desktop, line-height 1.05; the
  48×1 px gold line beneath headings.
- UI (nav, labels, buttons, chips): Inter 300/400, UPPERCASE,
  letter-spacing 0.18em, 11–12px.
- Choices and descriptions (the current choice under a category, option
  descriptions, reasons): display serif italic, 14–15px, Soft Graphite.
- One `<link>` to Google Fonts in `retail.html` (Cormorant Garamond
  400/500/italic, Inter 300/400). No npm.

### Buttons and chips — verbatim law

- Primary button: bg Onyx, text Porcelain, border Onyx, hover bg
  Graphite, focus outline 2px Champagne, height 50px, radius 0.
- Secondary button: transparent, text Onyx, border 1px Deep Gold, hover
  bg Champagne + text Onyx.
- Chip (a flat rectangle): idle border Stone Line on Porcelain; hover
  border Deep Gold; selected border 1px Deep Gold; disabled text Soft
  Graphite + dashed Stone Line border + the reason in serif italic under
  the chip (mobile has no hover; the reason is always visible).

### Header and footer

- Header 82px, Warm White, bottom hairline Stone Line. Left nav:
  COLLECTIONS · MATERIALS · DESIGN PROCESS; centred wordmark PRIME
  BESPOKE INTERIORS; right nav: ABOUT · JOURNAL · CONTACT; hover Deep
  Gold; the active item carries a Champagne 1-px underline. Far right,
  one primary button: **DESIGN YOURS** → the design room. Inside the
  design room the header shrinks to 60px (same content).
- Footer: Onyx, text Warm White, lines Gold Highlight, the wordmark,
  "Bespoke fitted furniture · Made in London", the nav repeated, the
  legal line. No social icons this turn.

### Landing — the owner's mockup C, section by section, Petros colours

1. HERO — min 720px; left 38% Signature Ivory: H1 "MADE / TO / EXACTING
   / STANDARDS" (four lines), gold line, subtitle "BESPOKE FITTED
   FURNITURE / MADE IN LONDON" (UI font, Soft Graphite), secondary
   button DISCOVER MORE, bottom-left caption "IVORY & ONYX". Right 62%:
   the hero image slot — a Porcelain-on-Soft-Ivory placeholder frame
   captioned "Hero photograph — owner to supply"; NO stock image, NO
   generated image.
2. COLLECTIONS — Porcelain; four flat cards (Ivory & Onyx · Mayfair
   Green · Black Label · Royal Burgundy): name in display serif, one
   line of copy, the image slot a flat block of that collection's
   signature tone (CONTENT tones inside cards, not UI chrome). Click →
   the design room with that collection preselected (F4).
3. THE CONFIGURATOR SECTION — Soft Ivory; "DESIGN YOUR WARDROBE", two
   lines of copy, primary button DESIGN YOURS.
4. CRAFTSMANSHIP — Onyx; text Warm White, hairlines Gold Highlight;
   three short columns (Made in London · Cut on our CNC · Fitted by our
   joiners). Plain copy, no superlatives.
5. FINAL CTA — Signature Ivory: "Made to measure. Made to last." and
   the primary button.
6. FOOTER as above.

72px side margins, 112px section gaps. Frames: `verify/t59/f2-landing-top.png`,
`f2-landing-full.png` (full-page capture), `f2-footer.png`.

## F3 [CRITICAL] · THE DESIGN ROOM — FOUR COLUMNS, THE PSW LAW

`retail.html#/design` (hash routing inside the retail app; no router
dependency). Layout, desktop ≥ 1280px, under the 60px header:

    ┌───────────┬─────────────┬──────────────────────┬────────────┐
    │ CATEGORIES│  OPTIONS    │   VIEW BAR (top)     │   DETAIL   │
    │   220     │   320       │   3-D STAGE (flex)   │    300     │
    │ Ivory     │ Soft Ivory  │   Porcelain          │ Warm White │
    └───────────┴─────────────┴──────────────────────┴────────────┘

1. **CATEGORIES (column 1, Signature Ivory).** Heading "CONFIGURE"
   (display serif + gold line). Six rows, each: the label in UI font and
   under it the CURRENT CHOICE in serif italic — the PSW `cat-hint`
   law: YOUR SPACE · LAYOUT · FRONTS · INTERIOR · DETAILS · ESTIMATE.
   Active row: Soft Ivory background, a 2-px Champagne bar on its left
   edge, label Deep Gold (the `cat-btn.active` law in Ivory). Bottom of
   the column: TOTAL (UI label) and the words **"Price on request"** in
   display serif (F5), then "EXCL. VAT · MADE IN LONDON"; a RESET DESIGN
   link in Deep Gold with a confirm.
2. **OPTIONS (column 2, Soft Ivory).** The active category's options,
   ALWAYS visible as a column — never an accordion, never folding inside
   column 1. Heading = the category name (display serif + gold line).
   Contents per category are F4.
3. **STAGE (Porcelain).** The SHARED viewer from `src/3d/` — the same
   room, walls, floor and units PRO renders — mounted by the retail app
   WITHOUT PRO's chrome. Across its top, a 40px VIEW BAR (Warm White,
   hairline below), UI font, hairline separators:
   `FRONT · INSIDE · ROOM | OPEN DOORS · LIGHTS | RESET VIEW · ⛶`.
   FRONT/INSIDE/ROOM are camera presets (front elevation; inside = doors
   open + camera in; room = the room corner). OPEN DOORS toggles the
   existing `openFronts` law; pull-outs obey the T58 covering law.
   LIGHTS toggles the LED strips' glow. Under the stage, one line:
   "DRAG TO ORBIT · SCROLL TO ZOOM · CLICK AN ELEMENT FOR DETAIL".
   Clicking a unit element (door, drawer stack, rail, shelf group)
   SELECTS it and opens its detail in column 4 (F4b).
4. **DETAIL (column 4, Warm White) — two duties.** By default: the
   ESTIMATE — heading, the list of designs in this estimate (a client
   may design several wardrobes — the PSW multi-window law), each row:
   number · name · size · fronts · "Price on request"; "+ ADD ANOTHER
   WARDROBE" in Deep Gold; and at the bottom the primary REQUEST A QUOTE
   and secondary SAVE ESTIMATE (F5). When an element is selected (a
   click in the stage, or a row in column 2 that carries "›"), the
   column becomes that element's DETAIL (F4b) with "‹ BACK TO ESTIMATE"
   at the top; DONE returns to the estimate.
5. **FULL-SCREEN VIEW.** Owner: *"przycisk widok na całą stronę 3D — i
   po kliknięciu nadal wraca do konfiguratora."* The ⛶ button hides
   columns 1, 2 and 4; the stage fills the page under the header; the
   VIEW BAR stays, plus "‹ BACK TO DESIGN" at its left. It is a
   LOOKING mode: clicks on elements do nothing. Return by ⛶, by Esc, or
   by BACK TO DESIGN — and the return restores EXACTLY the prior state:
   same active category, same options, same selection, same camera.
   Nothing resets. In this mode the bar also carries **SAVE IMAGE** (F5).
6. **What the client never sees.** No BOM, CNC, DXF, drilling, Check
   panel, X-ray, Outlines toggle, article numbers, part prices, PRO
   menus, "MOCK DATA MODE", build stamp. The viewer's PRO overlays
   (dimension chips, hinge rings, LED icons, `+` add markers, the top
   bar) are OFF in the retail mount. If the shared viewer cannot hide
   them by props today, ADD the option to the shared core — additive,
   default = today's PRO behaviour. LIST every such option in the report.
7. **State.** The retail app runs the SHARED `projectStore` and
   `uiStore` (they are the brain, not the face) in a **memory-only
   mode**: none of PRO's localStorage keys, none of PRO's Supabase,
   ever. If the store persists unconditionally today, add a documented
   `persistence: 'none'` mode to the shared core (additive; PRO keeps
   its default). A test asserts the retail bundle never calls PRO's
   Supabase client and writes no PRO localStorage key.
8. Below 1280px the four columns become: categories as a top strip,
   options as a bottom sheet, detail as a slide-over; the stage full
   width. Below 768px: a Porcelain page "Design on a larger screen — we
   will email you a link" with the estimate link. Real mobile design is
   a later turn.

Frames: `verify/t59/f3-design-room.png` (all four columns),
`f3-design-room-fullscreen.png`, `f3-design-room-inside.png` (INSIDE
preset, doors open), `f3-design-room-detail.png` (an element selected,
column 4 in detail duty).

## F4 [CRITICAL] · COLUMN 2 — THE OPTIONS OF EACH CATEGORY

Every control maps to the engine's existing params through ONE adapter
(`src/retail/design/adapter.js`): retail choice → the store's own update
functions. The adapter is the only place retail speaks engine. Bounds
come from the profile's own limits (`src/engine/profile.js`), never
typed into retail. Refusals come from the engine's own reasons, never
from strings typed into retail.

1. **YOUR SPACE.** Wall width (slider 600–4000 mm, step 10) · ceiling
   height (slider 2000–3000) · SLOPED CEILING (chip off/on; on → two
   sliders "height at the left wall / at the right wall", drawn as the
   room's rake — the existing `slope_cut` law then does everything:
   forced hinges, the door partition, pull-down refusal, LED trimming).
   Copy under the options: "Measure wall to wall and floor to ceiling.
   We will survey before we build."
2. **LAYOUT.** Wardrobe width (slider bounded by the wall) · depth
   (chips 450 / 600 / 650) · doors (chips 1 · 2 · 3 · 4 — a count the
   engine's door-width law refuses is disabled with its reason) · bays
   (chips single / divided).
3. **FRONTS.** Front style chips with small Onyx-hairline SVG
   thumbnails drawn by you: SLAB · SHAKER · J-PULL — the three the engine
   has today; GROOVED and ARCHED disabled "coming soon" (their laws exist
   in the owner's DXF, their turns are queued). Shaker frame: chips
   narrow / standard mapped to the profile's own frame sizes.
   **COLLECTION**: four flat swatches (Ivory & Onyx · Mayfair Green ·
   Black Label · Royal Burgundy) — a PRESET applying front decor +
   carcass decor + handle default from a table in
   `src/retail/design/collections.js` that references EGGER decor ids
   already in the app's decor list (no new textures). Then COLOUR: the
   collection's own handful of decors as swatch chips.
4. **INTERIOR.** A list of rows, each a flat card: name in serif, and
   at the right its state — a count, or ADD, or the engine's reason
   greyed (e.g. "not under a sloped ceiling" for the pull-down, the
   watch-vs-shoe refusal): Hanging rail · Shelves · Drawers · Shoe
   drawer · Watch drawer · Pull-down rail. ADD adds the kit through the
   store's own add function (centred shelves by the T58 law, drawers as
   a stack); rows that exist carry "›" and open their DETAIL in column
   4 (F4b). No free placement this turn.
5. **DETAILS.** Handles: chips from the handle systems the engine
   offers (bar · knob · J-pull · none) — J-pull disables the others by
   the T57 law; Lighting: chips off / on (shelf-strip law, default
   depth); Plinth: chips 100 / 150. Nothing else.
6. **ESTIMATE.** A summary card of every choice in words, the "Price on
   request" line, the name field for this design ("Bedroom wardrobe"),
   and the two buttons (F5) repeated here.

Tests (`test/turn59-f4-the-options.test.js`): every control's adapter
call yields the expected engine params; a preset applies its decors; the
slope chip yields a `slope_cut` the engine accepts; disabled reasons are
the engine's. Frames: `verify/t59/f4-space.png`, `f4-fronts.png`
(collection swatches), `f4-interior.png`.

## F4b [CRITICAL] · COLUMN 4 — THE DETAIL OF A SELECTED ELEMENT

Selection comes from the shared store's own selection (the mechanism
PRO uses for its element panel), read by retail's own detail component —
never PRO's component. Each detail is short, chips and one slider at
most, and ends with DONE. Only these, this turn:

- **DRAWERS** — HOW MANY (chips 2 / 3 / 4) · TOP DRAWER INSERT (chips
  none / watches / belts / shoes; the watch⇄shoe refusal and the
  top-of-stack law speak in the engine's words) · GLASS TOP (chips off /
  on; disabled with "needs a watch insert" when there is none) · FRONT
  HEIGHT (slider within the engine's limits, label "standard" at the
  default).
- **SHELVES** — HOW MANY (stepper 1–6) · CENTRE (a secondary button →
  the T58 per-bay centring).
- **HANGING RAIL** — SINGLE / DOUBLE (chips) · HEIGHT (chips low /
  standard / high → the engine's own positions).
- **DOOR** — HINGE SIDE (chips left / right, or the serif line "opens
  from the slope" when forced) · HANDLE (per the chosen system: chips
  where the engine offers a choice).
- **LIGHTING** — SHELF STRIPS (chips off / on) · PANE LIGHT (chips off /
  on, only when a glass pane exists).

Anything else selected shows its name and "no options for this element
yet". Frames: `verify/t59/f4b-drawers.png`, `f4b-door.png`.

## F5 [HIGH] · THE ESTIMATE WITHOUT A PRICE — HONESTLY — AND THE IMAGE

There is no retail price law yet (markup and rounding are the owner's
decision; the engine's BOM cost is NOT a retail price). So:

1. Every price slot reads **"Price on request"** in display serif —
   never "£0", never "£ —", never a number.
2. **REQUEST A QUOTE** opens a flat form (name · email · phone ·
   postcode · message) in the design system. On submit, R1 has no
   backend: build the estimate document (every design's choices in
   words + the engine params snapshot as JSON) and (a) download
   `pbi-estimate-<date>.json`, and (b) open a `mailto:` to the address
   in `src/retail/config.js` (placeholder
   `quotes@primebespokeinteriors.co.uk` — owner to confirm) with the
   summary in the body. The UI says "We will reply within one working
   day." Database and email delivery are R2.
3. **SAVE ESTIMATE** downloads the same JSON; **LOAD** (a small link
   under it) restores it — memory-only. **ADD ANOTHER WARDROBE** starts a
   fresh design in the same estimate; the summary lists all; the stage
   shows the selected one.
4. **SAVE IMAGE** (in the full-screen bar): a PNG of the stage through
   the app's FIXED lighting rig (the Petros render law: one rig
   regardless of panel switches — reuse `src/3d/renderCapture.js`), no
   overlays, props honoured if on, filename `pbi-<design-name>.png`.

Tests: the document contains every choice and the params snapshot;
mailto body under 2000 characters (truncate with "…full estimate
attached"); load restores byte-equal params; the capture path excludes
every overlay. Frames: `verify/t59/f5-quote-form.png`,
`f5-summary-two-designs.png`, plus the saved image itself
`verify/t59/f5-saved-image.png`.

## F6 [MEDIUM] · THE OTHER PAGES — THIN BUT REAL

Hash routes: `#/` landing · `#/design` · `#/collections` (four
collections, each with swatch, copy, DESIGN IN THIS COLLECTION →
`#/design?collection=…`) · `#/contact` (the same flat form, without the
estimate) · `#/materials`, `#/design-process`, `#/about`, `#/journal` —
each a Porcelain page with the display heading, the gold line, two
paragraphs of placeholder copy marked "— owner to write". No route 404s.
Frames: `verify/t59/f6-collections.png`, `f6-contact.png`.

## F7 [LOW] · THE MID-WIDTH BEHAVIOUR

The 1280px → 768px layout described in F3.8, and the under-768 page.
Frame `verify/t59/f7-tablet.png`. First to be sacrificed.

---

## THE SHARED-CORE OPTIONS THIS TURN MAY ADD (ADDITIVE, PRO-DEFAULT)

Only these, only if needed, every one listed in the report with its
default: a viewer `chrome` prop (or uiStore flags) hiding PRO overlays;
a store `persistence` mode; a camera-preset API if none exists; a
capture entry point if `renderCapture` cannot be called from outside
PRO. Nothing else in `src/engine`, `src/3d`, `src/stores` changes, and
PRO's behaviour under every default is byte-identical (goldens + full
suite + the frozen-files assertion).

## ORDER, PROOF, REPORT

**F1 → F2 → F3 → F4 → F4b → F5 → F6 → F7.**

Proof: full suite green (PRO's 4900+ untouched, plus this turn's);
`t59-classify.mjs` zero deltas; paren 14/14; the frozen-files diff
empty; the boundary walker green; every frame listed above.

Morning report, numbered: per feature done/skipped; the shared-core
options added (name, default, why); the frozen-files assertion output;
the boundary walker output; `+X/−Y` (all additive — say where the lines
went); test totals; classifier verdict; the owner's placeholder list
(hero photograph, quote email, page copy, typography sign-off).