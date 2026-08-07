# BUILD-LOG.md

Co powstało w każdej turze, dlaczego tak, i co to zmienia w aplikacji.
Jedna sekcja per tura; najnowsza na górze.

---

# TURA 5 — precyzja, rysunek techniczny, wysokości projektu, komplety, dekory

**Gałąź:** `claude/claude-md-phase-5-k5xgrp` · **Tryb:** pełna autonomia, zero pytań
**Wynik:** `npm test` **471/471** (410 z tur 1–4 + 61 nowych), `npm run build` czysty,
przebieg end-to-end w Chromium bez jednego błędu w konsoli.

Pozycje BACKLOG zamknięte: **33, 34, 35, 29, 30, 31, 36** oraz **19 → picker v1 DONE**.
Nic poza nimi nie było ruszane.

---

## F1 — Precyzja 0.5 mm end-to-end (#33) [CRITICAL]

**Problem był w ekranie, nie w silniku.** Silnik liczył dokładnie od tury 1. Ale
każde miejsce, które pokazywało milimetr, robiło własne `Math.round` — 42 wywołania
w 14 plikach. Formatka 196.5 mm czytała się „197", rząd półek z formuły LISP
(704.666…) czytał się „705", a pole liczbowe **nie przyjmowało połówki w ogóle**:
`commitNumber` zaokrąglał do całych na commit.

**Co jest teraz.** Jedna funkcja, `formatMm()` w `src/engine/format.js`:

| wartość | na ekranie |
|---|---|
| 197 | `197` |
| 196.5 | `196.5` |
| 704.6666 | `704.7` |
| 196.96 | `197` |
| null / '' / NaN | *(nic — nie „0")* |

Przechodzą przez nią **wszystkie**: etykiety 3D, strzałki odległości, BOM, podpisy
na arkuszu CNC, PDF, panel parametrów i każdy komunikat cytujący wymiar.
Po grep-sprzątaniu poza `src/engine/` nie został ani jeden `Math.round` na
milimetrze — te, które zostały, dotyczą pikseli (`Scene.jsx`), stopni
(`contextActions.js`) i skali tekstury (`materials.js`), i mają to napisane w kodzie.

**Pole liczbowe.** `NumberField` commituje na siatce **0.5 mm** (`profile.editor.mmStep`
— żadnej gołej liczby) i pokazuje połówki z powrotem. „196.5" da się wpisać i zostaje
196.5; „249.6" ląduje na 249.5, czyli na najbliższej połówce, którą piła utrzyma.
Pole współczynnika yield w BOM (`integer={false}`) zachowuje pełne miejsca po przecinku.

**Snap.** `snap(v, 0.5)` naprawdę ląduje na połówce — i **dokładnie** na niej: test
przechodzi 400 wartości i sprawdza, że żadna nie niesie 196.50000000000003. Każda
zapisana pozycja (przeciągnięcie jednostki, przeciągnięcie półki, wysokość top
infilla) jest kwantowana do tej siatki niezależnie od tego, co ją wyprodukowało —
więc pole nigdy nie dostanie do pokazania czternastu miejsc po przecinku.

**Testy:** `test/format-mm.test.js` (11).
**Dowód:** `docs/turn5/06-half-millimetre.png` — wpisane 596.5, etykieta 3D „596.5",
badge sekcji „596.5 × 2200"; `docs/turn5/07-cnc-non-sprayed.png` — arkusz CNC:
`BUL 560.5×2200`, `SHELF-1 556.5×540`.

---

## F2 — Strzałki wymiarowe (#34) + preset CNC (#35) [HIGH]

### #34 — koniec z balonami, i groty w dobrą stronę

**Bug, który był zgłoszony:** groty celowały w złą stronę. **Dlaczego:** stożek
w three.js ma czubek pół długości od swojego środka. Stary kod stawiał środek
pół długości **w głąb szczeliny** i tam też go kierował, więc czubek kończył całą
długość grotu **za** licem, które miał dotykać, a podstawa siadała na licu. Każda
strzałka celowała od tego, co mierzy.

**Co jest teraz.** Rysunek warsztatowy zamiast balonów:
linia cienka (`lineWeight` 3 mm pokojowych — „1 px look"), **linie odnoszące**
wychodzące z mierzonych lic, **ukośny tick architektoniczny 45°** na każdym końcu
(alternatywnie grot OTWARTY, dwie kreski bez wypełnienia — `dimensions.head`),
wartość na środku przez `formatMm()`. Końce są ustawiane **czubkiem** w mierzonym
punkcie, więc nie ma już czego odwrócić. Wąska szczelina nadal odwraca groty na
zewnątrz — teraz to znaczy to, co powinno.

**Kolor:** granat `#1B2A4A` domyślnie, czerwień `#8C182B` jako opcja w **View ▸
Dimension colour**. Złoto zniknęło z wymiarów — to kolor mebla, a wymiar ma się
czytać jako adnotacja. Wszystkie liczby siedzą w `profile.dimensions`.

**Dowód:** `docs/turn5/12-dimensions-close.png` (zbliżenie 2×), `08` (granat), `09` (czerwień).

### #35 — „Carcass only" było kłamstwem

Preset filtrował **grupę** „carcass", więc na jednym arkuszu z korpusem lądowały
cokół i formatki wypełniające (**idą do lakierni**), a półki i skrzynki szuflad
**wypadały z arkusza w ogóle**.

**Co jest teraz.** Silnik stempluje każdą formatkę flagą **`panel.finish_exposed`**,
wyliczaną **z roli**, nigdy z listy ID:

- `finish_exposed: true` → fronty i drzwi, infille (boczne i górny), cokół, panele końcowe
- `finish_exposed: false` → boki, wieniec, dno, plecy, holdery, spurs, półki, partition,
  rail-part, DP, fillery, wszystkie części skrzynek (SL/SR/BF/BB/DNO)

Presety: **All · Non-sprayed · Sprayed only · Fronts & doors only**, filtrowane po
fladze. Nowy typ kabinetu dostaje właściwą odpowiedź za darmo, a preset nie zwietrzeje,
gdy kit urośnie o formatkę, o której nikt nie pomyślał. Non-sprayed i Sprayed only są
**rozłączne i wyczerpujące** — razem dają całą jednostkę (test tego pilnuje).

**Testy:** `test/finish-exposed.test.js` (6) — flaga per typ dla wszystkich 8 kitów,
plus `test/dxf-sheet.test.js` przepisany na nowe presety.
**Dowód:** `docs/turn5/07-cnc-non-sprayed.png` — SHELF-1 **jest** w zaznaczeniu.

---

## F3 — Wysokości na poziomie PROJEKTU (#29) [HIGH]

Warsztat buduje **całą kuchnię** do jednego zestawu wysokości. Do tury 4 każda
jednostka przychodziła z wysokością swojego kitu AutoLISP, a dopasowanie ciągu
oznaczało przepisywanie tej samej liczby do każdej szafki.

**Design Settings ▸ Project heights:** Base 720 · Wall unit 720 · Tall 2150 ·
Wall mount 1500 · Toe kick 100. Wartości startowe z `profile.projectHeights`
(zero gołych liczb), potem należą do projektu i jadą z nim w `design.heights`.

**Dziedziczenie po kategorii.** Każdy typ deklaruje `heightGroup` w `engine/types.js`:
`base` (BUD, BUDR, SINK), `wall` (WUD), `tall` (BUDTALL, FRIDGE, WARDROBE) — i
**LOW_CABINET: `null`**. Niska szafka dziedzicząca 720 mm to szafka dolna pod inną
nazwą; bycie niską jest całym jej sensem, więc zostaje przy swojej. To jedyne
odstępstwo od „wg kategorii" i jest świadome.

**Wyjątek per sztuka.** Wysokość wpisana w panelu ustawia `height_custom: true` —
pole dostaje znacznik **„custom"** i przycisk **Reset**. Zmiana wysokości projektowej
przenosi **tylko** jednostki nie-custom, z **clampem sufitu** (`clampUnitHeight`),
i mówi ile ich poszło oraz co je zatrzymało. **Przycięcie sufitem nie robi jednostki
„custom"** — inaczej szafka raz przycięta niskim stropem przestałaby na zawsze
słuchać projektu.

**Toe kick sięga silnika** jako `leg_height` per jednostka, więc nogi, opadnięcie
do podłogi i cokół idą za jedną liczbą. Gołe `computeCabinet(params)` bez tego
parametru zachowuje się identycznie jak wcześniej — to jest obietnica golden fixtures
i test mówi to wprost.

**Testy:** `test/project-heights.test.js` (15).
**Dowód:** `docs/turn5/02-project-heights.png`, `08` (panel: „Follows the project
tall height (2200 mm)" + Reset, wysokość 2200 zamiast kitowych 2150).

---

## F4 — Save as template (#30) [HIGH]

Prawy klik na skonfigurowanej jednostce → **Save as template** → nazwa →
**Library ▸ Saved sets**. Kategoria przestała być miejscem trzymanym otwarte.

**Komplet to JAK jednostka jest ZBUDOWANA i nic więcej.** Nie zapisuje się:
pozycja, numer jednostki, formatki skrobankowe (te są konsekwencją szczeliny,
w którą jednostka wjechała — przeniesienie szczeliny jednego projektu do drugiego
to formatka przy ścianie, której tam nie ma).

**Wstawienie to zwykła ścieżka `addUnit`** z parametrami kompletu w miejsce
fabrycznych — ten sam wolny slot, ten sam clamp, te same fillery. Komplet, który
się nie mieści, jest **odmawiany z liczbą**, dokładnie jak typ z biblioteki.
ID elementów wnętrza są regenerowane; bez tego dwie jednostki z jednego kompletu
dzieliłyby ID półki i przeciągnięcie jednej ruszałoby drugą.

**Nazwa jest identyfikatorem.** Zapis pod istniejącą nazwą **podmienia** komplet,
a nie robi bliźniaka: biblioteka „Standard", „Standard (2)", „Standard (3)" to
biblioteka, której nikt nie używa. CRUD (rename / delete) jest tam, gdzie lista.

**Persist:** lokalna półka (`cc.templates.v1`) zawsze — to jest to, co czyni
mock-mode działającą aplikacją. **`sql/003_tura5.sql` jako PLIK, NIE uruchomiony**
(tabela `cc_templates` + RLS + unikalny indeks po `lower(name)`).

**Testy:** `test/templates.test.js` (11).
**Dowód:** `docs/turn5/13-save-as-template.png`, `14-saved-sets.png`,
`15-template-inserted.png` — W01 na x=1700, W02 na x=2300, bez nachodzenia.

---

## F5 — Picker dekorów EGGER (#19, v1) [HIGH]

85 dekorów z paczki Piotra (`public/decors/`), zakładka **EGGER decors**
w Design Settings ▸ Finish: siatka miniatur, filtry **Uni / Woodgrain**, szukajka
po kodzie i nazwie, wybór osobno dla korpusu i frontów.

### Licencja jest KODEM, nie komentarzem

| Wymóg | Jak jest egzekwowany |
|---|---|
| obraz tylko W CAŁOŚCI | miniatura = cały skan pomniejszony, `object-cover` bez kadrowania |
| atrybucja PRZY obrazie | podpis „EGGER {kod} {nazwa}" siedzi **w tym samym `<button>`** co `<img>` — nie istnieje stan, w którym jedno jest bez drugiego |
| ZAKAZ tekstur 3D | `finishFromDecor()` **nigdy** nie zwraca pliku EGGER-a jako tekstury |
| reprodukcja | stopka pickera, dosłownie |

**W 3D:** `uni_colour` → płaski `hex`; `woodgrain` → **nasza** proceduralna tekstura
(`public/textures/grain-neutral.png`, nowa, z `scripts/gen-textures.mjs` — szarość
od bieli w dół) **przemnożona przez `hex` dekoru**. Rysunek słojów jest nasz, od
EGGER-a jest wyłącznie kolor. Baza musi być neutralna: tonowanie `light-oak.png`
nałożyłoby dąb dwa razy i każdy dekor wychodziłby dębowy.

`test/decors.test.js` **przechodzi wszystkie 85** i wywala się, jeśli jakakolwiek
formatka dostałaby obraz EGGER-a na geometrię. Mały swatch w wierszu ustawień
pokazuje **sam kolor** — 28 px kadru to ani „w całości", ani „z atrybucją".

**BOM i PDF** nazywają dekor pełną nazwą: „EGGER H1180 ST37 Natural Halifax Oak".
Katalog ładuje się **raz, na starcie aplikacji** — zapisany projekt wykończony
w dekorze otwiera się w tym dekorze, a nie w złamanej bieli. Miniatury są `loading="lazy"`,
a uni colour nie ma pliku w ogóle: otwarcie pickera to **jeden request, nie 85**.

**Testy:** `test/decors.test.js` (15).
**Dowód:** `docs/turn5/03-egger-picker.png`, `04-decor-chosen.png`,
`10-bom-finish.png`, `11-decor-in-3d.png` (szafa w tonowanym dębie).

---

## F6 — Drobiazgi (#31, #36) [MEDIUM]

- **#31** — „Add end panel" oferuje **Left / Right / Both**, w menu kontekstowym
  i w sekcji Construction. „Both" to istniejąca akcja **dwa razy**, nie druga
  ścieżka: jednostka dociśnięta do ściany dostaje panel, który się mieści,
  i **słyszy, dlaczego** drugi się nie zmieścił. Ciche pół-sukcesu to jednostka
  z jednym panelem, którego nikt nie chciał pominąć.
- **#36** — **Spraying** zajmuje miejsce w górnym menu, disabled, tak jak Database
  i Clients. Co za nim stanie (finish per element, lista, m², cena) jest wciąż
  projektowane z Piotrem; przycisk otwierający pół-odpowiedź byłby gorszy niż taki,
  który mówi „jeszcze nie".

---

## F7 — Zamknięcie: co znalazła przeglądarka

**I to jest najważniejsza rzecz w tej turze.** Po sprzątnięciu `Math.round`
jeden plik — `src/3d/Room.jsx` — dostał wywołania `formatMm()` i **nie dostał
importu**. `npm test` był zielony (żaden test nie montuje komponentu Reacta),
`npm run build` **też był zielony** (bundler traktuje nieznany wolny identyfikator
jako zmienną globalną i dowiaduje się dopiero w runtime). Etykiety ścian zabrały
ze sobą całą kanwę 3D. Pierwszym, co to zauważyło, była przeglądarka.

**Naprawione + zabezpieczone:** `test/imports.test.js` przechodzi wszystkie pliki
w `src/` i sprawdza, że każda nazwa eksportowana przez **nasz własny** moduł, użyta
jako goły identyfikator, jest w tym pliku zaimportowana albo zadeklarowana. Zero
zależności (to dlatego jest testem, a nie ESLintem). Sprawdzone, że łapie
dokładnie ten bug — po usunięciu importu test czerwienieje z nazwą pliku.

**Przy okazji, z tego samego przebiegu:** panel Library reklamował wysokość kitu
(2150), a wstawiał wysokość projektu (2200). Lista, która kłamie o swojej
zawartości — poprawione.

**Przebieg E2E w Chromium** (headless, silnik CDP na wbudowanym `WebSocket` node 22,
**zero nowych zależności**): start → projekt → wysokości projektowe → jednostka →
dekor EGGER (korpus + fronty) → 0.5 mm → półka → drzwi → preset CNC Non-sprayed →
kolory strzałek → BOM → template save → template insert → eksporty.

| sprawdzone | wynik |
|---|---|
| dziedziczenie wysokości | badge `600 × 2200` (kit: 2150) ✅ |
| 0.5 mm | pole `596.5`, etykieta `596.5`, CNC `560.5×2200` ✅ |
| picker | 85 kafelków, wszystkie `loading="lazy"`, `alt="EGGER …"` ✅ |
| stopka licencji | dosłownie ✅ |
| presety CNC | `All · Non-sprayed · Sprayed only · Fronts & doors only` ✅ |
| BOM nazywa dekor | `EGGER H1180 ST37 Natural Halifax Oak` ✅ |
| CSV listy cięcia | nagłówek LISP, `W01,BUL,560,2200,<,2.20,1.232` ✅ |
| template save → insert | W01 x=1700, W02 x=2300, **bez nachodzenia** ✅ |
| błędy w konsoli | **zero** ✅ |

Zrzuty: `docs/turn5/01`…`15`.

---

## Liczby tury

| | |
|---|---|
| testy | **471/471** (410 baseline + 61 nowych, 0 fail) |
| nowe pliki testowe | `format-mm`, `finish-exposed`, `project-heights`, `templates`, `decors`, `imports` |
| build | czysty |
| nowe zależności | **zero** |
| SQL uruchomiony | **żaden** (`sql/003_tura5.sql` leży jako plik) |
| fixtures | nietknięte |

**Testy z tur 1–4, które musiały się zmienić** (bo tura 5 zmienia to, co
opisywały — nie dlatego, że przeszkadzały):

- `dimensions.test.js` — `distanceLabel(1234.4)` to teraz `1234.4 mm`, a nie `1234 mm`. O to była #33.
- `dxf-sheet.test.js` — presety `carcass` / `no-drawers` przestały istnieć (#35).
- `construction.test.js` — nowa szafka dolna przychodzi na 720 mm projektu, nie na 770 mm kitu (#29).
- `interaction.test.js` — menu kontekstowe ma dwie nowe pozycje (#30, #31).
- `library-categories.test.js` — „Saved sets" to już nie placeholder (#30).
