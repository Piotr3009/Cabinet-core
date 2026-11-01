# CLAUDE.md, TURN CC2a · LINK MATERIALS: ONE CATALOGUE IN CABINET CORE, ONE LINK PER COMPANY TO JOINERY CORE'S STOCK

Run autonomously. Zero questions, zero stops: every decision below is the
owner's own (01.11.2026, 11:50 to 13:33, in chat, after a team brainstorm of
eight agents and four mockups; his words are quoted where they decide), so
nothing here is asked again. Where a number or a name is marked PROPOSED it is
the turn's best reading and is used as written; the owner confirms or changes
it after the merge, never during the run. If a point cannot be done, skip it
WHOLE, write why in the PR, and go on to the next. Full suite, never
`--silent`. Frames under `verify/t-cc2a/`. Branch `claude/t-cc2a-link-materials`,
cut from `origin/main` (the merge of PR #96, c3542b9), with THIS file and
`test/fixtures/owner-projects/` taken from `origin/chat/t-cc2a-spec`; one commit
per F; PR against main at the end; the owner merges. Nothing lands in Petros
from this session. Commit author: `Claude <noreply@anthropic.com>` (an author
Vercel does not know blocks the preview). The owner's name for this turn is
"T-CC2a". It stands on T-CC1b (PR #96), merged.

Its Joinery Core half is T-JC3a in the Joinery Core repository (brief on
`chat/t-jc3a-spec` there): ONE table `cc_material_links` and TWO functions.
This turn never calls a live Joinery Core: the fake of `scripts/t-cc1a-fake-jc.mjs`
grows exactly the contract written under WHAT JOINERY CORE GIVES, and the
owner's walk after both merges is the live proof. Release order, written in the
PR: the SQL of T-JC3a in JC's Supabase, the JC merge, then this merge. This
turn works (degraded, in words) when the JC half is not there yet.

THE OWNER'S FRAME (01.11, 12:14): *"tu chodzi o polaczenie 2 programow CC i JC,
do wszystkich plyt na przyklad MDF 18 mamy przypisany material z JC MAT 018
MDF 18 i jak program go wybierze to bedzie na liscie BOM z przypisanym
materialem ... ale jesli CC wybierze MDF 25 a nie mamy przypisanego materialu
z JC to bedzie napisane MDF 25 materials not assigned, proste, chodzi o robienie
listy materialow na dany projekt oraz listy kosztow"*. 12:50: *"kod nie moze
wybierac poprzez nazwe bo nazwe mozemy zmienic i koniec, CC powinien miec swoja
(nie widoczna) numeracje materialow, a nazwa tylko sie wyswietla"*.

THIS TURN REVERSES T-CC1b's LAW 6 ("a material in Cabinet Core IS a row of the
tenant's stock_items"). From tonight a material in Cabinet Core is an entry of
CC's OWN CATALOGUE with a hidden id that never changes; a company LINKS each
entry once to one row of its own Joinery Core stock; the BOM of every project
reads the links. THE ENGINE'S GEOMETRY IS NOT TOUCHED: `src/engine/cabinet.js`,
every kit, every `cnc/*`, `machining.js`, `lifts.js`, `liftSystems.js` have no
delta; every golden is IDENTICAL by definition and the checks run anyway.

## THE COST OF THE NIGHT
THREE writing agents, one integrator, two checkers, all in parallel from the
first minute. One writer per file: a file is in exactly one OWNS cell below,
and every other agent that needs a line in it hands a patch to its owner.
NO review wave: a slice is reviewed ONCE by Marek when its patch lands; the
morning audit is the chat's (Kamil and Wiktor). Targeted tests while writing;
the full suite ONCE per PART when it lands and ONCE at the end, always in the
background (Ola). Every agent reads this file and its PART, never the whole
repo. A report is twenty lines, the six stations of DONE. Agents and parallel
mode ON.

## THE TEAM (the owner's standing team, Petros shelf "programming-team"; the cards in one line)
- **Marek** integrator: the only writer of shared files, the fake, the walk,
  the freeze manifest, the PR. Never merges.
- **Bruno** engine: catalogue, resolver, BOM arithmetic. LISP IS LAW; numbers
  in the profile, never typed in code or UI; finds the working pattern in the
  repo before writing.
- **Julia** interface: the Link materials window, the BOM view, Project
  settings. Lists always visible plus a search box with a clear cross; images
  enlarge on click; copy in English; "employee", never "worker".
- **Ewa** UX check (writes nothing but her report): walks Julia's screens from
  the walk's frames as a joiner who sees them the first time; counts clicks;
  checks the words. Julia builds, Ewa checks.
- **Ola** tests and CI (writes nothing but her report): runs the targeted
  tests, the suite per PART and at the end, the golden checks, the classifier;
  reports numbers, never fixes.
Shared rules of the team: truth with evidence (file and line, command and
result); "I do not know" when not known; every agent gives at least one
objection to its own slice in its report (rule 13 of the team); no em or en
dash in anything written; the Skylon header on every new file.

## THE AGENTS
| Agent | Slice | OWNS (writes) | Hands patches to |
| - | - | - | - |
| Marek (INT) | PART D (links client, store, clean start, migration) and integration; applies patches in F order; EXEMPT rows, re-hashes, NEW_FILES; `scripts/t78-classify.d/f56-t-cc2a-f*.mjs`; the walk; the PR | `src/lib/jcLinks.js` (NEW), `src/stores/materialLinkStore.js` (NEW), `src/stores/materialAssignmentStore.js`, `src/stores/projectStore.js`, `src/pages/ConfiguratorPage.jsx`, `src/components/studio/RailMenus.jsx`, `scripts/t-cc1a-fake-jc.mjs` (grows, loses nothing), `scripts/t-cc2a-walk.mjs` (NEW), `test/turn59-f1-the-switch.test.js`, `test/turn-cc2a-f12-*.test.js` to `test/turn-cc2a-f14-*.test.js`, `verify/t-cc2a/walk.txt`, `verify/t-cc2a/*.png` | nobody |
| Bruno (A1) | PART A (catalogue, resolver, one source) and PART B (lines, arithmetic, paint) | `src/engine/catalogue.js` (NEW), `src/engine/catalogueData.js` (NEW, generated, append only), `scripts/t-cc2a-catalogue.mjs` (NEW), `test/fixtures/catalogue-ids.v1.json` (NEW, the ledger), `src/engine/bom.js`, `src/engine/materials.js`, `src/engine/thickness.js` (the board lookup at :104 only), `src/engine/spray.js`, `src/engine/companyDefaults.js`, `src/engine/profile.js` (THE NUMBERS rows only), `test/turn-cc2a-f01-*.test.js` to `test/turn-cc2a-f07-*.test.js` | Marek (projectStore, store wiring) |
| Julia (A2) | PART C (the Link materials window, suggestions, the BOM view, Project settings, the new item) | `src/components/LinkMaterialsModal.jsx` (NEW), `src/lib/linkSuggest.js` (NEW, pure), `src/components/MaterialPicker.jsx`, `src/components/BomPanel.jsx`, `src/components/SettingsPanel.jsx`, `src/components/AssignMaterialsModal.jsx` (the read-only banner only), `src/components/NewProjectFlow.jsx` (the preselected defaults only), `test/turn-cc2a-f08-*.test.js` to `test/turn-cc2a-f11-*.test.js` | Marek (RailMenus entry, ConfiguratorPage mount, projectStore `bespoke`) |
| Ewa | the UX check of PART C from the walk's frames | `verify/t-cc2a/ewa.txt` | Julia (findings), the PR (her table) |
| Ola | targeted runs, suite per PART and at the end, goldens, classifier, the proof pass | `verify/t-cc2a/ola.txt` | the PR (the numbers) |

## THE ORDER (the owner's words that frame this turn, 01.11.2026)
- 11:50: *"musimy ustawic kolory jako default, to nie wyglada dobrze"*; 12:02:
  *"przypisane prawdziwe materialy, z Egger boardow listy ... srodek carcasu to
  walnut a fronty to red wine z RAL kolorem, poprostu wybrane default a ludzie
  se beda zmieniac sami ... jak dadza next next next to zeby im biale nie
  wyskoczylo"*; 12:34: *"domyslny h3325 tabaco gladstone oak"*.
- 12:09: *"zebysmy przypisali pewne materialy na stale nie do projektu, tylko na
  stale i wtedy cokolwiek sobie wygeneruje projekt to ma albo juz przypisane
  materialy albo jest napisane materials not assigned"*.
- 12:34: *"musimy miec liste materialow wszystkich materialow jakie CC uzywa i
  wtedy dopiero przypisujemy wszystko a lista BOM do danego projektu sie bierze
  z tej bazy danych"*; *"jak kiedys dodamy [Lamello] to zakodujemy lamelo do
  bazy materialow i przypiszemy z JC"*; *"kazdy material musi miec identyfikator
  ... nie moze byc po nazwie"*; *"jedne produkt osobna linia, proste"*; layout:
  *"w data base assign material powinnismy miec departamenty podzielone na gorze
  plyty, ironmongery etc etc, nie scrolowane ... polaczenie A i C plus B"*.
- 12:50: *"kazdy tenant powinien sobie zlinkowac na maxa materialy na poczatku
  a pozniej dodawac sukcesywnie ... najwazniejsze zeby te linki sie nigdy
  klientowi nie rozlaczyly z jego DB ... bedziemy dodawac nowe materialy tez,
  jak na przyklad kronospan w przyszlosci"*; *"w liscie materialow bedziemy
  musieli dodac jeszcze add materialy bespoke (od klienta na przyklad inne
  ironmongery)"*; paints: *"na farby jeden link z nazwa bespoke kolor (kolor w
  nazwie), linkowanie kolorow nie ma sensu ... rozpuszczalnik 5 procent ilosc
  farby ... ilosc farby na sqm malowania oraz dodac primer czy basecoat ... i
  nie zapomnij dodac yieldy jak w production core"*; boards: *"decory wszystkie
  ale podziel na rozne formy, narazie mamy eggery ale dojda veneery i dojda
  przeciez fenixy i kronospany"*.
- 13:28: sheets: *"cc zrobi nam 10 sqm a format plyty to 2.4 x 1.2 ... 2.88 sqm
  ... dajmy 10 procent na offcuts bo zawsze zaokraglamy do gory, nawet jesli
  wyjdzie 2.1 plyty musimy zamowic 3"*; *"jesli klient bedzie chcial mniej to
  zmieni sobie w yeld ustawieniu"*; JC deletes a stock row: *"u nas sie robi
  unassign, tenant musi podpiac inny material, to wszystko ... nie blokujemy, CC
  nie ingeruje w decyzje tenanta w JC"*; price: *"srednia"* (JC's weighted
  average, as today); paint per colour: *"2 razy zeby bylo widomo ile jednej i
  drugiej farby"*; paints, stains, lacquers: *"farba bespoke kolor i tyle ...
  bejca (bespoke kolor) nie piszemy jaka, i lakiery tylko piszemy lakier i tyle,
  reszte wybiera i zamawia lakiernik"*; words: *"link bedzie lepiej brzmial"*;
  backs, plinths, drawer bottoms: *"domyslne, ale mamy mozliwosc zmienic na
  inne ... wyskoczy mu wybierz material z listy"*; suggestions: *"tylko
  podpowiedz od akceptacji tenanta"*; bespoke: *"nie trafia do katalogu ale
  dodaje do listy zakupow pod bespoke, bespoke nigdy nie idzie do stocku"*; no
  "Add to JC stock" button: *"tylko informacja dodaj w JC do stocku zeby mozna
  bylo przypisac"*; two turns: *"zgadzam sie z Ola i Kamilem"* (the old window's
  deletion and the export wait for T-CC2b).
- 13:33: *"przy przypisywaniu any sheets powinnismy dodac pole w CC ktore
  wymusi wpisanie szerokosci i wysokosci materialow, tylko sheets, zeby mozna
  bylo przeliczyc, z textu czytanie nie profesjonalne"*; the Pipeline total
  with "incomplete" when a line is not linked: *"zgoda"*.

## WHAT JOINERY CORE GIVES (read, do not assume more)
- Everything T-CC1a and T-CC1b list (the session, `/api/auth/me`, the reads,
  the seven `cc_*` functions, `stock_items`, `stock_categories`,
  `company_settings`) holds unchanged.
- ONE NEW READ through `/api/db/query`, owner, admin, manager, the tenant's
  rows only: `cc_material_links` (`tenant_id`, `cc_material_id` text,
  `stock_item_id` uuid, `yield` numeric, `sheet_width_mm` int null,
  `sheet_length_mm` int null, `coverage_m2_per_l` numeric null, `updated_by`,
  `updated_at`), primary key (`tenant_id`, `cc_material_id`). CC selects every
  column but `tenant_id`.
- TWO NEW FUNCTIONS through `/api/rpc` (JC injects `p_tenant_id` and
  `p_user_id`; CC never sends them):
  - `cc_save_material_links({ p_links })`: `p_links` a JSON array of 1 to 500
    objects `{ cc_material_id, stock_item_id, yield?, sheet_width_mm?,
    sheet_length_mm?, coverage_m2_per_l? }`; upserts each; answers `{ saved: n }`.
    Refusals in words: 42501 (a `stock_item_id` not of this company, or the user
    not of this company); 22023 (a bad argument: an id not matching
    `^[a-z0-9][a-z0-9._-]{0,119}$`, `yield` outside 1.0 to 3.0, a sheet size
    outside 100 to 6000 mm, a coverage outside 0.1 to 100, or an id starting
    `sheet.` without BOTH sheet sizes).
  - `cc_clear_material_link({ p_cc_material_id })`: deletes that link; answers
    `{ cleared: true|false }`.
- No foreign key from a link to `stock_items` (JC's tables are not altered):
  a stock row the company deletes in JC leaves its link pointing at nothing,
  and CC says so (F5). CC never writes `stock_items`, never reserves stock,
  never touches a project's material list in this turn.
- When the table or the functions are not there yet (the SQL not run): the read
  answers 403 or 400 and the call answers 403 or 400. CC treats both as "Material
  links are not set up in Joinery Core yet." (fail-open, F4).

## LAWS
Every law of T75 to T-CC1b holds in full except T-CC1b's law 6, reversed above:
LISP IS LAW (no engine geometry delta); the fossil six untouchable; material
never enters material; one law one path; numbers in the profile, none typed;
1:1 = COPY (`scripts/t78-copy.mjs --check` CLEAN); the Skylon header on every
new file; no em or en dash in anything written; test the way the client
clicks; a new function has a visible entry in the same package; a green test
beside old broken code is a lie; "usun" and "kasacja" are physical deletions,
never gates; the door is Joinery Core's; a change is memory, a save is one
request. Nine laws are this turn's own:
1. **ONE CATALOGUE, IDS NEVER CHANGE.** Every material Cabinet Core can put on
   a list is ONE entry of `src/engine/catalogueData.js`, with a hidden id
   written ONCE as a literal, never computed at run time, never shown to the
   user, never reused, never deleted (a material CC stops offering gets
   `retired: true` and stays). The ledger `test/fixtures/catalogue-ids.v1.json`
   holds every id this turn issues; the test fails when an id of the ledger is
   missing, changed in meaning, or reused. Names are for display only and may
   change; no code path selects by name.
2. **A BOARD IS WHAT THE DESIGN SAYS.** A board's catalogue entry follows from
   the design alone: the slot's source (EGGER decor, sprayed MDF, raw MDF,
   generic), its decor and its thickness. The cut list, the purchase list, the
   3D finish and the BOM read the SAME resolver; there is ONE source of a board.
   The stored `material_id` of the slots (a JC uuid or an old CC id) is read only
   to migrate (F13) and is never written again.
3. **A LINK IS THE COMPANY'S.** A link joins one catalogue id to one row of the
   company's stock, for every project of that company, on every computer. A
   project never holds a link. A link made from a project's BOM says "Saved for
   all projects".
4. **ONE PRODUCT, ONE LINE.** Every catalogue entry a project uses is its own
   purchase line with its own price; two hinge kinds are two lines; two front
   colours are two paint lines.
5. **THE STOCK DECIDES ITS OWN ROWS.** A stock row deleted in Joinery Core turns
   its link into "Not linked (removed from your Joinery Core stock)"; CC blocks
   nothing in JC and never repairs a link by guessing.
6. **A SHEET IS COUNTED, NOT GUESSED.** Sheets = ceiling of (m² × yield) divided
   by the sheet's area, per catalogue entry, over the whole project; the sheet's
   width and length are typed by the company when it links the sheet (both
   required); no size is ever read out of a text.
7. **NOT LINKED IS SAID, NEVER PRICED AT ZERO.** A line without a link shows
   "Not linked" in red, in the window, the BOM, the BOM PDF and the CSV; a total
   with any such line is shown with the words "Incomplete total, <n> lines not
   linked" and never as a complete price.
8. **SUGGEST, NEVER DECIDE.** CC may suggest a stock row for an entry; nothing
   is linked until the company accepts it.
9. **BESPOKE STAYS IN ITS PROJECT.** A bespoke material is typed in one
   project, goes to that project's purchase list as bespoke, and never enters
   the catalogue or the stock.

## FROZEN
1. Every golden IDENTICAL (no engine geometry delta; the checks run and the PR
   pastes them). The four owner projects of `test/fixtures/owner-projects/`:
   their cut list dimensions, counts and thicknesses IDENTICAL before and after
   (F3 proves it).
2. T-CC1a's and T-CC1b's code, tests and the fake's contract: as they left them
   except the lines this file names; the fake GROWS and loses nothing.
3. The old "Assign materials..." window stays reachable and readable this turn
   (F14); its deletion is T-CC2b's. The "Stock..." window: unchanged.
4. The saved data of every project: nothing deleted, nothing overwritten with
   empty; the assignment blob is kept as saved (T-CC2b decides it).
5. PRO freeze: every PRO file edited is licensed in EXEMPT with the owner's
   words from this file and re-frozen in the same commit; new files enter the
   manifest at their first hash; the count assertion of
   `test/turn59-f1-the-switch.test.js` is amended by Marek. Retail copies NOT
   edited: `t78-copy --check` CLEAN.
6. The suite is green at the start (the count on main, written in the PR) and
   at the end, plus this turn's tests, minus the tests this turn REWRITES by
   name (each named in the PR with what it now asserts).

## PART A · THE CATALOGUE (F1 to F3; Bruno)

### F1 · One catalogue, ids that never change (law 1)
1. `src/engine/catalogue.js` (NEW, pure, Skylon header) exports
   `DEPARTMENTS` (in this order, the window's tabs: `sheets` "Sheets",
   `hinges` "Hinges", `runners` "Runners", `ironmongery` "Ironmongery",
   `internal` "Internal fittings", `paint` "Paint", `consumables`
   "Consumables"), `SHEET_BRANDS` (`egger` "Egger", `mdf` "MDF", `generic`
   "Generic", then `veneer` "Veneer", `fenix` "Fenix", `kronospan`
   "Kronospan" with `soon: true` and no entries), `catalogue()` (the entries
   of `catalogueData.js`, frozen), `entryById(id)`, `entriesOf(department,
   brand?)`.
2. An entry: `{ id, department, brand?, kind: 'sheet'|'edging'|'hardware'|
   'paint'|'other', name, decorId?, core?, thickness?, unit, role?, retired? }`.
   `name` is what the user reads: a sheet carries the decor code in its name
   (*"nazwa musi byc numer decoru w nazwie"*), e.g. "Egger H3325 ST28 Tobacco
   Gladstone Oak, 18 mm" built from `public/decors/egger/egger-decors.json`
   (`name` there already holds code, texture and name).
3. `scripts/t-cc2a-catalogue.mjs` (NEW) writes `catalogueData.js` ONCE and
   APPENDS later: it never edits or removes a line it wrote before. Tonight it
   issues (PROPOSED id shapes; Bruno fixes them once, the ledger keeps them):
   - Sheets, Egger: every decor of `egger-decors.json` (85 today) × every
     thickness of the union of `profile.projectSettings.boardThicknessOptions`,
     `profile.board.thicknessOptions` and `profile.front.thicknessOptions`
     (18, 19, 22, 25 today); id `sheet.egger.<decor id lower case>.<mm>`.
   - Sheets, MDF (sprayed and raw fronts, sprayed carcasses): the same
     thicknesses; id `sheet.mdf.<mm>`.
   - Sheets, Generic: the three placeholders of T-CC1b (18, 22, 25); id
     `sheet.generic.<mm>`.
   - Edging: one per Egger decor (the tape follows the decor; its width is the
     product's); id `edge.egger.<decor id lower case>`.
   - Hardware (Hinges, Runners, Ironmongery, Internal fittings): every product
     the engine can put on a BOM today, read from the engine's own catalogues
     (`src/engine/hinges.js` families by system, finish and angle; runners by
     system and nominal length; legs; Cabineo; AVENTOS; HAWA; LED strip, driver,
     switch; the wardrobe kits; the corner kits; hangers; handles by type and
     finish; worktop bolts; plinth clips; shelf pins; screws by diameter), ONE
     entry per product, never per quantity (a line label with a length or a
     count in it is a quantity, not a product). Bruno lists every hardware role
     of `ASSIGN_GROUPS` (`materialAssignmentStore.js:78`) and the roles the
     engine emits for the fixtures and the owner projects, and every one maps
     to an entry or is named in the PR as not mapped, with why.
   - Paint: `paint.bespoke` "Paint, bespoke colour", `paint.primer` "Primer or
     basecoat", `paint.solvent` "Solvent", `stain.bespoke` "Stain, bespoke
     colour", `lacquer` "Lacquer".
4. `test/fixtures/catalogue-ids.v1.json` (NEW, the ledger): every id issued
   tonight with its meaning (`department`, `brand`, `decorId`, `thickness`,
   `role` where present).
5. `test/turn-cc2a-f01-catalogue.test.js`: ids unique; every ledger id present
   with the same meaning; no id matches the shape of a uuid; a sheet name holds
   its decor code; the script run twice writes the same file (idempotent);
   renaming an entry's `name` in a copy of the data changes no id and no BOM
   line key (law 1); retired entries stay.

### F2 · The resolver (law 2)
1. `catalogue.js`: `catalogueIdOfBoard(choice, profile)` where `choice` is any
   stored board choice of a design (a carcass type, a front type, a door style,
   a run material, an element override, a box slot, the two new board slots of
   F11) reduced to `{ source, finishId|decorId, colour?, thickness }`:
   `egger` or `laminate` with a decor → `sheet.egger.<decor>.<t>`; `sprayed`,
   `spray` or `raw` → `sheet.mdf.<t>`; a generic choice → `sheet.generic.<t>`;
   `veneer`, `wood` → null with the reason "Not in the catalogue yet" (law 7
   words apply). The thickness is the one the engine cuts the slot at (the
   rules of `thickness.js` without the JC row, F3).
2. `catalogueIdOfLine(line)` for a hardware, edging or paint line of the BOM:
   from the line's ROLE and its structured fields (system, family, finish,
   angle, nominal length, type), never from `spec_label`. Where the engine
   gives a role nothing structured, ONE bridge table in `catalogue.js` maps
   that role and its label pattern to an id, each row with a comment naming
   the emitter (file and line); a label the bridge does not know is a red
   test, never a silent fallback.
3. `test/turn-cc2a-f02-resolver.test.js`: the cover test: every board choice
   and every hardware, edging and paint line of every job in `test/fixtures`
   and of the four owner projects resolves to a catalogue id or to a named
   "not in the catalogue yet" reason; none falls through; two hinge kinds give
   two ids; a changed `spec_label` text with the same structured fields gives
   the same id.

### F3 · One source of a board (law 2)
1. `src/engine/materials.js` (Bruno): the board resolver behind the cut list
   (`resolvePanelMaterial` and its record, :251 to :300) returns the catalogue
   id beside today's fields and groups by `cat:<id>` instead of
   `mat:<material_id>`; the finish, the label and the 3D surface are unchanged.
2. `src/engine/bom.js` (Bruno): the purchase list's boards (`mergeUnitMaterials`,
   `consume`, :1016 to :1060) read the SAME resolver: a board line is the
   catalogue id the cut list printed for that part, never `assignmentFor(...)`
   of the per-part blob. The per-part blob is no longer read by the purchase
   list (its window stays readable, F14).
3. `src/engine/thickness.js` (Bruno; :104 only): the slot's thickness no
   longer comes from a JC stock row (`materials.find(type.material_id)`); it
   comes from the slot's source and the project thickness exactly as the rest of
   the function already does. The four owner projects resolve every slot to the
   same thickness as before (the test proves it; a project whose thickness
   would change is a RED test and the PR names it, never a silent change).
4. `test/turn-cc2a-f03-one-source.test.js`: for the four owner projects and
   every fixture job: the cut list's part dimensions, counts and thicknesses
   before and after are IDENTICAL; the cut list and the purchase list name the
   same catalogue id for every board part; `src/engine/bom.js` has no
   `assignmentFor` on the board road (grep).

## PART B · THE LINES AND THE ARITHMETIC (F4 to F7; Marek F4, Bruno F5 to F7)

### F4 · The links client (law 3; Marek)
1. `src/lib/jcLinks.js` (NEW, pure through `withDb`, Skylon header):
   `loadLinks({ db }) -> { links: Map<cc_material_id, link>, error }` (the
   select of WHAT JOINERY CORE GIVES, through `withDb` like `jcStock.js:43`);
   `saveLinks(links[], { db })` (one `cc_save_material_links` call per 500);
   `clearLink(ccMaterialId, { db })`; every answer in words: `JC_OFFLINE` when JC
   does not answer, "Material links are not set up in Joinery Core yet." when
   the table or function answers 403 or 400 with no row, the function's own
   refusal words otherwise. Never throws.
2. `src/stores/materialLinkStore.js` (NEW): holds `links`, `stock` (the F9 read
   of T-CC1b, `loadJcStock`), `status` ('ok' | 'offline' | 'not-set-up'),
   `load()`, `link(entries)`, `unlink(id)`; loaded once per session with the
   stock, re-read on the window's Retry. The links are the company's: the store
   never writes them into a project.
3. `scripts/t-cc1a-fake-jc.mjs` (Marek): grows the table with two seed links
   (MDF 18 to the fake's MDF 18 row with sizes 2440 × 1220, a hinge to the
   fake's hinge row), the read with its columns, the two functions with EVERY
   refusal of WHAT JOINERY CORE GIVES (same codes, same rules), and a switch
   `CC_FAKE_NO_LINKS=1` that answers 403 for the read and both functions (the
   SQL not run).
4. `test/turn-cc2a-f04-links.test.js`: the select names its columns; 501 links
   are two calls; a sheet without sizes is refused by the fake with 22023 and
   the words reach the store; `CC_FAKE_NO_LINKS` gives "not set up" and no
   throw; a stock row of another company is refused 42501.

### F5 · One product, one line (laws 4, 5, 7)
1. `bom.js` (Bruno): the purchase rows are keyed `cat:<catalogue id>` (paint
   adds `|<colour name>`, F7); each row resolves its link → its stock row →
   `name`, `item_number`, `image_url`, `unit`, `cost_per_unit` (the weighted
   average JC keeps; the quoted price of T75 F21 still wins when the job has one).
   A row with no link is "Not linked"; a row whose link points at a stock row the
   company no longer has is "Not linked (removed from your Joinery Core stock)";
   a row whose entry is not in the catalogue yet says "Not in the catalogue yet".
   None of the three has a price; all three count in the incomplete total.
2. Hardware: `hardwareDemand` (:674) and the purchase list are ONE road keyed
   by catalogue id; `syncHardwarePart`'s first-key rule
   (`materialAssignmentStore.js:376`) is no longer read by the purchase list.
   The quantities of every line equal the engine's quantities (sum before ==
   sum after per role).
3. The total: `lineCost` of linked rows only; `total` with `incomplete: n`;
   every place that prints a total (the BOM window, the BOM PDF of
   `exporters.js`, the cutting list CSV's WARNING row) prints "Incomplete total,
   <n> lines not linked" beside it when n > 0 (this REWRITES T-CC1b F11's
   "Not assigned materials" and "not a price" by name: law 7, the owner 13:33).
4. `test/turn-cc2a-f05-lines.test.js`: two hinge kinds on two products are two
   lines with two prices (the T-CC1b audit's hinge case); a deleted stock row
   gives the "removed" words and no price; the incomplete words in the window,
   the PDF and the CSV; the quoted price still wins.

### F6 · Sheets are counted (law 6)
1. `bom.js` (Bruno): a sheet row: `m2` (the parts' area as today) → `sheets =
   ceil(m2 × yield / (sheet_width_mm × sheet_length_mm / 1e6))`, `yield` the
   link's (`profile.materials.sheetYield` 1.10 when the link has none), the
   sizes the link's; no sizes → no sheet count and the words "Sheet size
   missing, add it in Link materials". The family sheet sizes of
   `checks.js:444` stay for the CNC checks and are no longer read by the
   purchase list. The 15 % of `bomInvoice` (`profile.js:5500`) and the
   purchase list's 0 % are replaced by the one number (*"dajmy 10 procent"*).
2. The cost of a sheet row by the stock row's `unit` (PROPOSED word lists,
   case and plural folded): sheet, board, pc, pcs, each, ea → `sheets ×
   price`; m2, m², sqm, sq m → `m2 × yield × price`; any other unit → no price
   and the words "Check the unit of this item in Joinery Core" (it counts as
   incomplete). Today's `qty × costPerUnit` on m² (`bom.js:1159`, about three
   times too much on a per-sheet price) is gone.
3. Edging rows in metres, hardware in their unit, as today.
4. `test/turn-cc2a-f06-sheets.test.js`: the owner's example: 10 m² of a
   2440 × 1220 sheet at 1.10 is 4 sheets (11 / 2.977 = 3.69, up to 4); 2.1
   sheets of need is 3; a per-sheet price costs sheets × price; a per-m² price
   costs m² × 1.10 × price; an unknown unit has no price and the words; a link
   with yield 1.05 uses 1.05.

### F7 · Paint by colour, primer, solvent (laws 4 and 7)
1. `spray.js` (Bruno): the litres of each COLOUR the project sprays (front
   types, door styles, a cabinet's own colour) are one line each, keyed
   `cat:paint.bespoke|<colour name>`, all linked through the ONE link of
   `paint.bespoke` (*"linkowanie kolorow nie ma sensu"*); the line's name is
   "Paint, bespoke colour: <RAL name>". The litres: today's formula (:584 to
   :611, m² × coats / coverage × (1 + waste)), the coverage the link's
   `coverage_m2_per_l` or today's profile default.
2. `paint.primer`: one line for the whole project, the same m² × the profile's
   `spray.primerCoats` (PROPOSED 1) / coverage. `paint.solvent`: one line,
   5 % of the litres of all bespoke colour lines (`profile.spray.solventPct` 5,
   CONFIRMED *"rozpuszczalnik 5 procent ilosc farby"*). Stain and lacquer: lines
   only when the engine emits them (no live source tonight); the catalogue holds
   them.
3. `test/turn-cc2a-f07-paint.test.js`: a job with two front colours gives two
   paint lines with their own litres, one primer line, one solvent line at 5 %
   of the two; the one `paint.bespoke` link prices both colours.

## PART C · LINK MATERIALS (F8 to F11; Julia, Ewa checks)

### F8 · The Link materials window (laws 3, 7)
1. `src/components/LinkMaterialsModal.jsx` (NEW): the maximised window of
   `SprayingPanel.jsx:96` (the one exception of rule 15 that Modal.jsx names
   for a work window: near full screen, restore button, drags, scrolls), the
   font floor `cc-modal-wide` of T-CC1b F12. Top left a "Back to project"
   button (closes, the team's standing UX rule: the way back is top left); the
   shell's ✕ top right. The title "Link materials", under it "Every material
   Cabinet Core uses, linked once to your Joinery Core stock. Saved for <company
   name>." and on the right "<n> of <m> linked" with a bar.
2. The DEPARTMENTS as tabs along the top, each with its count "<linked> /
   <total>" (green when all, amber otherwise); never a scrolled list of every
   group (*"nie scrolowane"*). Under Sheets a second row: the SHEET_BRANDS, the
   `soon` ones grey with "Coming soon" and not clickable; under it chips of the
   decor families of `src/lib/decorFamilies.js` (no select).
3. LEFT, the table of the tab: the CC material (for a sheet: the decor's
   thumbnail at 40 px, the WHOLE image, with `decorLabel()` beside it (the
   word EGGER plus the decor code and name, the licence of `decors.js:16` to
   `:26`; there is no unattributed path); the name; the thickness), the
   linked JC material (photo, `item_number`, name; the photo enlarges on click,
   the MaterialCard pattern of `WarehouseModal.jsx:105`), the unit price and
   unit, the status ("Linked" green, "Not linked" red, "Not linked (removed
   from your Joinery Core stock)" red). NO id is shown anywhere (*"nie
   widoczna numeracja"*). Above it: a search box with a clear ✕ (narrows by
   name and decor code) and three chips: "All <n>", "Not linked <n>", "Used in
   this project <n>". A row selected is outlined gold.
4. RIGHT, the company's stock (one component, `MaterialPicker.jsx`, as the
   Stock window uses it): a search box with a clear ✕, the tenant's categories
   as chips from `categoryTree` (JC rule 6.5, never typed), the list visible at
   once with photo, `item_number`, name, unit and price, a "Link" button per
   row. Under the list: "Not in the list? Add it to your Joinery Core stock
   first, then link it here." and a link "Open Stock" to `/stock.html` in a new
   tab (no "Add to JC stock" button: the owner 13:28).
5. Linking a SHEET opens, beside the row, a small form that cannot be saved
   empty: "Sheet width (mm)", "Sheet length (mm)" (both required, 100 to 6000)
   and "Offcut allowance (%)" prefilled 10 (the yield; *"zmieni sobie w yeld
   ustawieniu"*), then "Save link". Linking PAINT shows an optional "Coverage
   (m² per litre)". Other kinds link on one click. A linked row offers "Change
   link" and "Unlink". Every save goes to Joinery Core at once (one call); an
   error is said in its words on the row.
6. States in words: offline (JC_OFFLINE and Retry), not set up ("Material links
   are not set up in Joinery Core yet." and the table read only), empty stock
   (T-CC1b's STOCK_EMPTY and "Open Stock").
7. Entries: the rail's Materials menu gets "Link materials..." FIRST (Marek,
   `RailMenus.jsx:192`); "Assign materials..." stays below it (F14); the BOM's
   "Link" (F10) and Project settings' "Link" (F11) open the window at their
   entry.
8. `test/turn-cc2a-f08-window.test.js`: seven tabs in order with counts; the
   Sheets brands with three soon; no id text in the rendered window (a regex for
   the ledger's id shapes finds nothing); a sheet cannot be linked without both
   sizes; Unlink clears; the not-set-up words; the search narrows by decor code
   and clears with ✕; photos open the enlarged view.

### F9 · Suggestions, accepted by the company (law 8)
1. `src/lib/linkSuggest.js` (NEW, pure): for a sheet entry, a stock row whose
   name or `item_number` holds the decor code (e.g. "H3325", any separator) AND
   whose `thickness` equals the entry's; for MDF, the word MDF and the
   thickness; for hardware, an exact article number of the entry found in the
   row's name or number (where the entry has one). PROPOSED rules; at most one
   suggestion per entry; nothing else.
2. The window shows "Suggested: <item>" in the row with "Accept"; a tab with
   suggestions shows "Accept all suggestions" which lists them with a tick each
   and, when sheets are among them, asks once for the sheet size that applies
   to the ticked sheets (they may be unticked). Nothing is saved until Accept.
3. The old project's per-part assignments (the T-CC1b blob, JC uuids) are
   offered as suggestions too, where a part's entry and the uuid's stock row
   agree (F13), never linked by themselves.
4. `test/turn-cc2a-f09-suggest.test.js`: the code and thickness rule; no
   suggestion on a thickness mismatch; Accept all saves only the ticked;
   nothing is saved before Accept.

### F10 · The BOM: materials and costs (laws 3, 7, 9)
1. `BomPanel.jsx` (Julia): every line shows the catalogue entry's name, the
   quantity and unit, the JC material (photo, number, name) and the line cost,
   or the red words of F5; a not-linked line has a "Link" button that opens
   the window at that entry (the T-CC1b "Assign..." button sent a `partId` the
   hardware lines do not have, `BomPanel.jsx:299` to `:306`; this one sends the
   catalogue id). After a link made here, a toast: "Saved for all projects".
2. The Materials tab's selects (`:527` boards, `:594` hardware) are DELETED
   (Deletion licence); the tab is the same list read only, with "Link".
3. A block at the bottom: "Bespoke, this project only": rows of name, quantity,
   unit (chips: pcs, m, m², sheets, litres, set), unit price, "Supplied by
   client" (price 0, nothing to buy), "Add bespoke item", Remove. Stored in
   the project as `project.bespoke` (Marek: projectStore, the save, the crash
   buffer, the keepalive and every export, the T-CC1b lesson: a new field is
   checked on every road and every limit). Bespoke rows go to the purchase list
   and the Purchase CSV marked "Bespoke"; they never enter the catalogue.
4. The header: "<n> of <m> lines linked" and the total with law 7's words.
   No export to Joinery Core in this turn (T-CC2b, Production only); the
   Purchase CSV stays as it is.
5. `test/turn-cc2a-f10-bom.test.js`: the selects are gone (grep); Link opens
   the window at the clicked hinge's entry; the toast; a bespoke row survives
   save, reload, crash buffer and the CSV; the incomplete total.

### F11 · Project settings and the new item (laws 2, 3)
1. `SettingsPanel.jsx` (Julia): the three "MaterialStock" selects (`:494`,
   `:715`, `:827`) are DELETED (Deletion licence). Each board slot keeps its
   choice of WHAT (decor, colour, source, thickness, with the Recompute or Keep
   gate of `:183` to `:211` unchanged) and shows under it the slot's entry and
   its link: "JC: <name>" or red "Not linked" with "Link".
2. Two new board slots, "Back panels" and "Drawer bottoms" (and the existing
   run materials: plinth, infill, end panel, mask), each "As today" by default
   (the part takes the slot the engine uses today) or another sheet chosen from
   a visible list with search of the catalogue's sheets OF THE SAME THICKNESS
   as the engine cuts that part at (a different thickness is not offered:
   geometry is not this turn). The choice is stored in the design as a board
   choice of F2 (`design.boards.back`, `design.boards.drawerBottom`) and the
   cut list and the purchase list follow it (one source). The company default
   for both (`companyDefaults.js`, Bruno): "As today" until the company changes
   it in Settings, Company defaults.
3. `NewProjectFlow.jsx` (Julia) and `companyDefaults.js` (Bruno): a NEW item,
   when the company has no default of its own, starts with Carcass 1 EGGER
   H3325 ST28 Tobacco Gladstone Oak (`profile.projectSettings.defaultCarcassDecorId`)
   and Front 1 sprayed RAL 3005 Wine red on MDF 18 (the retail defaults, the
   owner *"jak dadza next next next zeby im biale nie wyskoczylo"*), preselected
   in the wizard and changeable there. Existing items are not touched.
4. `test/turn-cc2a-f11-settings.test.js`: the selects are gone; the slot shows
   its link; a back panel moved to another sheet of the same thickness moves in
   the cut list and the purchase list together; another thickness is not
   offered; a new item starts on H3325 and RAL 3005; an old item keeps its own.

## PART D · CLEAN START, OLD PROJECTS, THE OLD WINDOW (F12 to F14; Marek)

### F12 · A new item inherits nothing
1. `materialAssignmentStore.js` (Marek): `readLocal` (:259 to :273) no longer
   falls back to the legacy global blob `cc.assignments.v2` for a project with
   no blob of its own (Deletion licence); `newProject` (`projectStore.js:2687`)
   starts with an empty blob and never the previous project's (the owner's
   decision 4 of 01.11: *"nowy projekt przestaje dziedziczyc materialy z
   poprzedniego"*).
2. `test/turn-cc2a-f12-clean.test.js`: open item A with assignments, create item
   B: B's blob is empty and B's save carries no material of A.

### F13 · Old projects open, nothing lost (FROZEN 4)
1. `projectStore.js` (Marek) and `catalogue.js` (Bruno): an old project's
   stored board `material_id`s are read once at load to fill the board choice
   where the design lacks it: the old CC ids (`mat_mdf18`, `mat_mfc18_oak`,
   `mat_mfc19_front`, `mat_mdf25_shaker`, `generic-18`, `generic-22`,
   `generic-25`, and every other `mat_*` and `generic-*` id grep finds in
   `src/` history and the fixtures) map through ONE table in `catalogue.js` to
   the source and thickness they meant; a JC uuid is never mapped by name: it
   becomes a suggestion (F9.3). The stored field stays as saved.
2. `test/fixtures/owner-projects/` (four files from the owner, 28 to 31.10, committed on the spec branch:
   "0003 Black Kitchen", "0002 Test qwardrobe" twice, "0004 Project 0004"):
   each opens, saves, opens again with the same units, the same design, the
   same blob and the same cut list (F3.4); the board entries they resolve to are
   listed in the PR; idempotent on a second load.
3. `test/turn-cc2a-f13-old.test.js`: the above, plus a schema 2 blob and a
   T-CC1b schema 3 blob open without loss.

### F14 · The old window, read only for one turn
1. `AssignMaterialsModal.jsx` (Julia; the banner only): a banner on top
   "Replaced by Link materials. This window is read only until the next
   update." with a button "Open Link materials"; every assign, clear,
   automatics and family control disabled; the lists still visible. Deleted in
   T-CC2b.
2. `test/turn-cc2a-f14-old-window.test.js`: the banner; no control changes the
   blob; the door "Assign materials..." still found (T-CC1b's SAME DOORS test
   passes unchanged).

## NOT THIS TURN
- The export of the materials list into the Joinery Core project (Production
  only, a warning and a clean replace on a second export, JC does the stock):
  T-CC2b. The deletion of the old window and of the per-part blob: T-CC2b.
- Veneer, Fenix, Kronospan entries (*"bedziemy dodawac po troche"*); bespoke
  boards in the catalogue; the cut list nested on sheets; the CNC cross check
  of sheet counts (*"pozniej to zrobimy"*).
- The UX block of the morning (the right panel that hides, Back to Joinery Core
  on the left, the Drawings window enlarged with its list on the left): a later
  turn (*"zrob jako pozniejsza ture, najpierw materialy"*).
- The profile and the company defaults in JC's `cc_company_profile`: T-CC1c.
- Any engine geometry; any new kit; the 3D; retail (`src/retail/**`).

## IF THE NIGHT RUNS SHORT (the order things fall, whole)
F9's "Accept all suggestions" falls first (single Accept stays), then F9.3
(old assignments as suggestions), then F8.2's family chips, then F11.2 (the two
new board slots; backs and drawer bottoms stay "As today"). F1 to F7, F8 (but
the chips), F10, F11.1, F11.3, F12, F13 and F14 never fall.

## DELETION LICENCE (BY NAME, nothing else)
In `BomPanel.jsx`: the Materials tab's board select (`:527`) and hardware select
(`:594`) with their handlers. In `SettingsPanel.jsx`: the three MaterialStock
selects (`:494`, `:715`, `:827`) with their handlers. In
`materialAssignmentStore.js`: the legacy fallback of `readLocal` for a
`projectId` without a blob (the `if (projectId) { ... localStorage.getItem(KEY)
... }` branch). In `bom.js`: the board road's `assignmentFor` read in the
purchase list and the `qty × costPerUnit` of an m² row. In `profile.js`: the
second offcut number of `bomInvoice` (:5500 to :5505) in favour of
`materials.sheetYield`. Nothing else.

## LINEAGE (lines tests read from this file)
T79's horizontal notch stays as built and its owner's words stay here because
`test/turn79-f05-edge-notch.test.js` reads them from CLAUDE.md: *"cut the corner
działa idealnie, ale możesz zrobić mi też poziome cut? wszystkich 4 rogów?"*
(18.10.2026). T-CC1b's deletion licence stands as merged and
`test/turn-cc1b-f05-output.test.js` reads it from here: the Database menu's five
entries (two of them, Clients... and Projects..., die for good) and the six Output entries named in F5.1 of T-CC1b's file stay deleted. T-CC1b (PR #96)
and main at its merge (c3542b9) are the base of this turn; their numbers hold
untouched but those this file names.

## TESTS AND PROOF
Full suite once per PART and at the end (never `--silent`, Ola, in the
background); the classifier strict with `f56-t-cc2a-f*.mjs` naming every lib
delta and the LICENSED engine files with the owner's words (`catalogue.js`,
`catalogueData.js`, `bom.js`, `materials.js`, `thickness.js` :104, `spray.js`,
`companyDefaults.js`, `profile.js` numbers) and NO geometry delta; every golden
IDENTICAL (`scripts/t64-classify.mjs --dump` vs `verify/t70/goldens-base.json`,
`t75-goldens --check`, `t78-goldens --check` and every later check T-CC1b
names); `t78-copy --check` CLEAN; `vite build` green with `base: '/cabinet/'`;
`scripts/t-cc2a-walk.mjs` against the fake (link a sheet with sizes, link a
hinge, unlink, accept a suggestion, a BOM with one line not linked, a bespoke
row, the not-set-up switch, a new item on H3325 and RAL 3005) with frames
under `verify/t-cc2a/`; Ewa's check of those frames in `verify/t-cc2a/ewa.txt`
(the task, the clicks, PASS or FAIL per rule, her objections); NEW_FILES; the
Skylon header; no em or en dash; grep of `src/` for `MaterialStock` selects in
SettingsPanel and the BOM selects: 0; grep "worker" in added lines: 0; every F
the six stations of DONE in twenty lines.

## PR BODY
First line: "Stands on main at the merge of PR #96 (c3542b9); meets T-JC3a of
the Joinery Core repository (the table cc_material_links and two functions);
no live JC was called. RELEASE ORDER: run sql/2026-11-01-cabinet-core-material-links.sql
in JC's Supabase, merge T-JC3a, then merge this." Then files and lines per F;
the catalogue's counts per department and brand; the hardware roles mapped and
any not mapped with why; the old CC ids table of F13; the four owner projects'
resolved entries and their IDENTICAL cut lists; the EXEMPT rows and the
manifest count before and after; the tests rewritten by name; the test count
before and after; the walk; Ewa's table; Ola's numbers; DECISIONS TAKEN; the
PROPOSED points for the owner (the id shapes, the unit word lists, the
suggestion rules, primer coats 1, the hardware bridge rows); SKIPPED AND WHY;
RED AT THE END; THE NUMBERS below.

## THE NUMBERS (in the profile; none typed in the UI)
| Number | Where | Value | Status |
| - | - | - | - |
| the sheet offcut allowance | `profile.materials.sheetYield` (a link may hold its own) | 1.10 | CONFIRMED (*"dajmy 10 procent na offcuts"*) |
| the sheet count | `bom.js` | ceiling, always up | CONFIRMED (*"nawet jesli wyjdzie 2.1 plyty musimy zamowic 3"*) |
| the solvent | `profile.spray.solventPct` | 5 | CONFIRMED (*"rozpuszczalnik 5 procent ilosc farby"*) |
| the primer coats | `profile.spray.primerCoats` | 1 | PROPOSED |
| the paint coverage without a link value | today's spray default | as today | T78 proposed, unchanged |
| a sheet size typed at linking | the link | 100 to 6000 mm, both required | CONFIRMED (*"pole ... ktore wymusi wpisanie"*), bounds PROPOSED |
| a yield typed at linking | the link | 1.00 to 3.00 | PROPOSED |
| links per save call | `jcLinks.js` | 500 | as JC's function |
| the Egger thicknesses in the catalogue | `catalogueData.js` | 18, 19, 22, 25 | from the profile's options |
| the default carcass of a new item | `profile.projectSettings.defaultCarcassDecorId` | H3325_28 | CONFIRMED (*"domyslny h3325 tabaco gladstone oak"*) |
| the default front of a new item | the wizard | sprayed RAL 3005 on MDF 18 | CONFIRMED (12:02) |
| the price of a stock row | JC `cost_per_unit` | weighted average | CONFIRMED (*"srednia"*) |
