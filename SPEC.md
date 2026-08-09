# CABINET CORE — SPECYFIKACJA
Wersja 1.0 — 04.08.2026 | Status: **do zatwierdzenia przez Piotra** | Uzupełnia: PLAN ZAŁOŻYCIELSKI 03.08

Dokument zbiera WSZYSTKIE decyzje z sesji 03–04.08. Rzeczy oznaczone **[DECYZJA]** są zamknięte.
Rzeczy oznaczone **[OTWARTE]** nie blokują startu. Zmiany względem planu założycielskiego oznaczone **[ZMIANA]**.

---

## 1. CZYM JEST CABINET CORE

Parametryczny konfigurator szafek i zabudów dla warsztatów stolarskich. Aplikacja webowa,
rodzina "Core" (JoineryCore = ERP, Production Core = planer produkcji okien, **Cabinet Core** = konfigurator mebli).

**[ZMIANA] Nazwa: Cabinet Core** (było: Designer Core). Powody: "cabinet" to słowo-kategoria
rynku US (cabinet shops, cabinet software), pasuje do wzorca rodziny (domena + Core),
"Designer" nie niesie żadnego sygnału branżowego.

**Czym NIE jest:**
- NIE jest wolnym CAD-em — nie konkurujemy ze SketchUpem. Użytkownik konfiguruje, nie rysuje.
- NIE jest narzędziem do wizualizacji wnętrz — zero fancy, białe ściany, biały kanwas. To projekt mebla.
- NIE jest rozszerzeniem JC — osobny produkt, osobne repo, osobna baza, osobny deploy.

**[DECYZJA] Samodzielność:** CC działa **w pełni bez konta JC** (projektowanie, BOM, PDF, DXF).
Połączenie z JC to opcjonalny krok odblokowujący Stock/ceny/push do projektu.
Konsekwencja strategiczna: możliwy freemium jako lejek na ERP oraz tryb demo jak konfigurator PSW.

---

## 2. DECYZJE ARCHITEKTONICZNE (ZAMKNIĘTE)

| Obszar | Decyzja | Uzasadnienie |
|---|---|---|
| Repo | `Piotr3009/Cabinet-Core`, prywatne, nowe | JC niczym nie ryzykuje |
| Język | JavaScript (bez TypeScript) | Spójność z PC — `profile.js`, `optimizer.js`, `dxfWriter.js` przenoszą się 1:1 |
| Stack | Vite + React 19 + Zustand + Tailwind + React Three Fiber | Sprawdzony w PC; wersje przypiąć jak w PC (tam działają razem) |
| Testy | `node:test`, od commita #1 | Pierwsze repo w rodzinie z testami; golden fixtures z LISP |
| Hosting | Vercel, statyczny frontend, **bez własnego backendu** | Model PC, nie model JC |
| Baza | **Osobny projekt Supabase** "cabinet-core"; tabele `cc_*`; własny auth; RLS wszędzie | Patrz 2.1 |
| Integracja JC | Przez API JC (istniejące + nowe endpointy), token JC w każdym żądaniu | Patrz sekcja 8 |
| Łączenie baz | **ZAKAZ** bezpośrednich połączeń DB↔DB (postgres_fdw itp.) | FDW = jeden stały user bazy → ginie kontekst tenanta, RLS JC przestaje chronić; ominięcie logiki rezerwacji w kodzie JC = zepsute dane |
| Domena | Start: `cabinet.joinerycore.com`; **kupić cabinet-core.com** (rezerwacja brandu) | cabinetcore.com i designercore.com zajęte (sprawdzone w RDAP 03.08) |
| Nazewnictwo | ZIP-y: `cabinetcore-{opis}-{DDMM}-{HHMM}.zip` | — |
| Języki | Kod + copy UI po angielsku; dokumenty projektowe po polsku; rozmowa po polsku | — |

### 2.1 [ZMIANA] Dlaczego osobna baza (rewizja z sesji 04.08)

Pierwotna rekomendacja Claude (wspólny projekt Supabase z JC) **wycofana** po argumentach Piotra:

1. **Izolacja awarii:** błąd w CC (zapętlone zapytanie, brak indeksu) na wspólnej bazie
   degraduje produkcyjne JC. Osobny projekt = awaria CC nigdy nie dotyka JC.
2. **Użytkownik bez JC:** wspólna baza wymuszałaby konta obcych ludzi w produkcyjnej bazie JC
   i zabijała freemium. Sprzeczne z decyzją założycielską "osobny produkt".

### 2.2 Bezpieczeństwo tenantów (dlaczego API "się nie pogubi")

Mechanizm: brak stałego połączenia — **token JC jedzie w każdym żądaniu od nowa**.
Middleware JC weryfikuje kryptograficznie podpis tokena → user_id → tenant_id z `user_profiles`.
Tenant **nigdy nie przychodzi od klienta**. Token wygasły → 401 (odmowa), nigdy cudze dane.
System psuje się w stronę "zamknięte".

Realne ryzyko = ludzki błąd w endpoincie (zapomniany filtr przy kliencie service-role).
Twarde zasady dla nowych endpointów — sekcja 8.

---

## 3. MAPA REUSE — CO BIERZEMY Z ISTNIEJĄCYCH REPO

**[DOPRECYZOWANIE — "silnik" znaczy tu trzy różne rzeczy]:**
- **Matematyka szafek**: ani z PSW, ani z PC (`calculations.js` PC liczy okna — bezużyteczne
  dla szafek). Źródłem matematyki są **LISP-y**.
- **Architektura silnika + moduły pomocnicze**: z **PC** (wzorzec profile.js, czysty engine/,
  optimizer, dxfWriter, przypisania materiałów).
- **3D**: rusztowanie z **PC** (`src/3d`). Z **PSW bezpośrednio nie bierzemy kodu** —
  podejście 3D konfiguratora PSW żyje już w PC w nowszej wersji i stamtąd je bierzemy.
  PSW pozostaje wzorcem koncepcyjnym dla trybu demo/marketing (konfigurator bez konta).

### Z Production Core (Sash-Planner-Web) — wzorce i kod
| Co | Skąd | Do czego w CC |
|---|---|---|
| Wzorzec profilu ("different workshops = different NUMBERS, never different formulas") | `src/engine/profile.js` | Profil szafkowy: wszystkie liczby Skylonu jako edytowalne defaulty |
| Przypisania materiałów: rola + yield + kategoria + overrides per wariant (schema 2) | `src/stores/materialAssignmentStore.js` | Role: side/top/bottom/back/shelf/front/drawer_box; yield = odpad |
| Optymalizator 1D (BFD + knapsack na zrzyny, kerf, endTrim) | `src/engine/optimizer.js` | Baza pod nesting 2D płyt (etap późniejszy) |
| DXF writer | `src/engine/cnc/dxfWriter.js` | Generator formatek + otworów na warstwach |
| Mock-mode fallback (app działa bez kluczy Supabase) | pattern z PC | Żelazna zasada wdrożeń od pierwszego commita |
| Rusztowanie 3D: scena, kamera, capture rig | `src/3d/`, `Window3DCaptureRig` | Podgląd 3D + zrzuty do PDF |
| Layout, MaterialPicker, komponenty UI | `src/components/` | Szkielet UI |

### Z JoineryCore — punkty integracji
| Co | Skąd | Do czego |
|---|---|---|
| Auth middleware (token → tenant, singletony) | `api/middleware/auth.js` | Nowe endpointy `/api/dc/*` = `router.use(requireAuth)`, zero zmian w auth |
| Logika importu BOM z rezerwacjami (upsert, delta `reserved_quantity`, `stock_transactions` OUT/IN, świeży odczyt stocku) | `js/materials-functions.js` → `processSashPlannerCSV()` (linia 2542) | Przenosimy na serwer jako `POST /api/dc/materials` |
| Endpointy Stock (12 szt., w tym GET/POST items) | `api/routes/stock.js` | Stock na żywo + Add to Stock — istnieją, dochodzi tylko CORS |

**Kluczowy szczegół:** import identyfikuje pozycje po **UUID stock_items** (`jc_uuid`),
nie po kodzie MAT ani nazwie. CC trzyma UUID-y JC przy materiałach.

### Z LISP-ów (11 plików w knowledge, 7 166 linii) — matematyka
- Wzory formatek zweryfikowane w kodzie 1:1 z planem założycielskim (BUD_FULL czytany w całości).
- Wiercenia zawiasów: środki 100 / wys−300 / wys−100 od dołu boku; pary otworów = środek ±16 mm
  (84/116, 284/316). Puszki we froncie: 100, wysFront−297, wysFront−97 od dołu.
- Reguła ilości drzwi: 1 gdy (szer−4) ≤ 700, inaczej 2 → **2 drzwi od szerokości 705 mm (704 = jeszcze 1 drzwi)**.
- Banding per formatka z kierunkami (`<`, `>`, `^v`) i mb; CSV labels `UNIT,PANEL,SZER,WYS,EDGE,EDG_L,SQM`.
- Warstwy CNC + dogbones: logika w `SKYLON_COMMON.lsp` — przenosimy w etapie DXF.

**[USTALENIE ARCHITEKTONICZNE — z diffa, nie z opinii]** BUD vs WUD: 417 vs 417 linii,
~86% identycznego kodu (różnice: nogi, zawieszki, doorExtend). Wniosek:
**NIE portujemy 11 plików — piszemy JEDEN silnik parametryczny + małe konfigi typów**
(BUD = {legs:true}, WUD = {legs:false, hangers:true}, ...). Tabelę różnic między KIT-ami
wyciągamy diffami, mechanicznie.

**[UWAGA]** W knowledge brakuje `KIT_DOOR_SINGLE.lsp` (jest DOUBLE). Jeśli istnieje — dograć.

---

## 4. FLOW UŻYTKOWNIKA (MVP) — wg koncepcji Piotra 04.08

1. **Start:** pusty biały kanwas; po lewej menu (przesuwalne modalne okno — grab & move).
   Otoczka ciemna (klimat zbliżony do JC), plan/kanwas biały. Zero designerskich bajerów.
2. **Ustaw pokój:** zawsze istnieje **ściana główna** (kotwica). Użytkownik podaje wysokość
   pokoju i szerokość ściany. **Maksymalnie 3 ściany** — świadomie NIE rysujemy czwartej
   (nie robimy wizualizacji pomieszczenia; czwarta ściana to problem kamery). Ściany białe.
   MVP: wystarczy sama ściana główna; boczne dojdą tanio. Tła/podłogi — później.
3. **Wstaw mebel przy ścianie:** modal z kategoriami. **Start: SZAFY (wardrobe).**
   Kuchnie (rodzina BUD/SINK/FRIDGE...) — kolejne etapy.
4. **Layouty:** pusty + kilka gotowych propozycji (ile drzwi, wysokość itd.).
5. **Layout pusty:** klik w sekcję (carcass) → sekcja się podświetla → **Add items** (modal):
   szuflady / półki / wieszak (rail) / wieszak pull-down / (lista rozszerzalna).
6. **Szuflady:** pyta o ilość, wysokość, **zintegrowane (inset) czy nawierzchniowe (overlay)**
   → wstawia automatycznie od dołu, stos.
7. **[REGUŁA WALIDACJI]** Nad stosem szuflad **obowiązkowo półka**.
8. **Półki:** [+] dodaje (rozstaw równomierny), [×] usuwa; **grab & move pionowo z live-wymiarem**;
   ograniczenia kolizji (sąsiednie półki, top/bottom, strefa szuflad).
   **Snap:** kwantyzacja `round(raw/step)*step`; krok domyślny **1 mm**, opcje **0.5 mm** i **system 32 mm**.
9. **Typ półki:** stała / wyciągana (wyciągana = prowadnice w BOM).
10. **Drzwi:** dodawane **na końcu**; po dodaniu panel prawy się zamyka.
11. **BOM — [ZMIANA vs opis]:** BOM jest liczony **NA ŻYWO z aktualnego stanu przez cały czas**.
    "Potwierdź" otwiera panel przypisania materiałów, a eksport to migawka stanu w momencie
    eksportu. Powód: w sekwencji "materiały → potem drzwi" eksport przed dodaniem drzwi
    dawałby BOM bez frontów. Live-BOM to naprawia bez zmiany flow użytkownika.
12. **Materiały:** przypisanie per rola — ze **Stocku JC** (gdy połączony; na żywo, z cenami)
    lub **własna lista** (jak w PC). Brak w Stocku → "Add to Stock" tworzy pozycję (z ceną).
13. **Eksporty:** PDF projektu, lista materiałów, ceny (gdy JC), **DXF: wszystkie formatki CNC
    wg LISP** — otwory, dogbones, warstwy nazwane jak w SKYLON_COMMON. Test akceptacyjny:
    otwarcie w VCarve u Piotra.
14. **Push do JC** (gdy połączony): BOM → Materials List projektu, z pełną logiką rezerwacji.

**Później (poza MVP):** kolory, dekory Egger, LED (zwykła pozycja BOM), okucia/uchwyty,
biblioteka całych kuchni, order reminder w Office JC.

---

## 5. MODEL DANYCH (SZKIC — tabele `cc_*`, RLS na wszystkich)

```
cc_projects (
  id uuid pk, owner uuid → auth.users, name text,
  room jsonb,                    -- { height, walls:[{width}...max 3] }
  jc_tenant_id uuid null,        -- po "Connect JoineryCore"
  jc_project_id uuid null,       -- cel eksportu w JC
  created_at timestamptz
)

cc_units (
  id uuid pk, project_id → cc_projects, type text,   -- WARDROBE | BUD | WUD | ...
  position jsonb,                -- { wall, x_mm }
  params jsonb
)

params (szkic):
{
  width, height, depth, board_t, front_t, front_type,       -- S | H | F
  sections: [                     -- carcassy szafy (uogólnienie "listy półek" z planu)
    { width_mm, items: [
        { kind: 'drawer',   pos_mm, height_mm, mount: 'inset'|'overlay' },
        { kind: 'shelf',    pos_mm, variant: 'fixed'|'pullout' },
        { kind: 'hanger',   pos_mm },
        { kind: 'pulldown', pos_mm }
    ]}
  ],
  doors: { count, hinge: 'L'|'R', ... },
  materials: { role: { source: 'jc'|'own', id } }           -- jc → UUID stock_items!
}
```

Zasady: baza zawsze nad localStorage; mock-mode gdy brak kluczy (graceful degradation);
Stock i projekty JC **nie są kopiowane** — czytane przez API na żywo.

---

## 6. SILNIK OBLICZENIOWY

- Czysty moduł `engine/` — **zero importów Reacta** (wzorzec zweryfikowany w PC).
- `profile.js` szafkowy: WSZYSTKIE liczby Skylonu jako edytowalne defaulty per warsztat —
  luzy (3 mm, doorGap), odjęcia półki (−4 / −20), środki wierceń (100/300/wys−100) i offset
  pary (±16), próg drzwi (2 drzwi od 705), pozycje puszek, grubości (18/22, 18/19/25).
  Formuły czytają WYŁĄCZNIE z profilu — zero gołych liczb we wzorach.
- Konfigi typów (z diffów LISP): legs, hangers, doorExtend, dogbones (SINK), szuflady (BUDR 4:3:2)...
- Wyjścia: `panels[]` (nazwa, szer, wys, banding z kierunkami), `drills[]`, `totals`
  (panele, m², mb) — **wymiary każdej formatki osobno zachowane** (gotowość pod nesting).
- **Golden fixtures:** wartości wzorcowe policzone z LISP-ów TUTAJ (czat), zweryfikowane
  przez Piotra vs produkcja, zapisane jako JSON. Start: **BUD_FULL** (najprostszy — smoke test
  rdzenia, 5 formatek + fronty) oraz **WARDROBE_FULL** (cel produktowy MVP).
- **[ŻELAZNA ZASADA]** Claude Code **nie może modyfikować fixtures ani testów-wzorców** —
  testy zielone albo wpis w BLOCKERS.md. Nigdy "poprawianie" wartości oczekiwanej.
- **[DECYZJA 04.08] System puzzli Skylon modelowany 1:1 od startu** (taby na 95/H·½/H−95,
  sockety, dogbones, wkręty — geometria z SKYLON_COMMON drawBUL/drawBUR, parametry w profilu).
  To system montażu Skylon wpisany w geometrię formatek; inne systemy złączy — później jako
  opcje profilu.
- **[DECYZJA 08.08, zamyka BLOCKERS #58] Grubość płyty jest PER KORPUS** — jedno `G` na kit,
  grubość frontu osobno. To nie jest dług, tylko granica systemu, i granica postawiona przez
  same kity: złącze puzzlowe liczy czop, ulgę dog-bone i oś gniazda z JEDNEJ grubości
  (`engine/puzzle.js`), więc bok 22 mm w korpusie 18 mm nie jest grubszym bokiem — jest
  złączem, które się nie składa na stole montażowym. MATERIAŁ pozostaje nadpisywalny per
  element bez wyjątku, bo materiał nie zmienia ani jednego wymiaru. Potwierdzone przez
  właściciela 08.08.
- **[DECYZJA 09.08, zamyka BLOCKERS #64] Kitowy podział 4:3:2 zostaje dokładnie taki, jaki
  tnie kit** (`exact: false`). `budrFrontHeights` liczy każdy front osobno przez
  `lispRound(available · r / total)`, więc przy 4:3:2 suma frontów potrafi wyjść 1 mm ponad
  `available` (dla H = 602: 594 przy 593). To **zapisana granica, nie dług**: reguła 7 jest
  absolutna i milimetr poprawy na wysokości, którą ktoś mógł już wyciąć, to nadal zmiana tego,
  co robi maszyna. Warianty dodane w turze 12 (`x2`, `x4`) niosą `exact: true`, bo są NOWE i
  nie ma czego zamrażać. Test w `turn12-library.test.js` przechodzi 400 wysokości, żeby
  udowodnić, że nic nie drgnęło. Potwierdzone przez właściciela 09.08.

### 6.1 Mocowanie przegrody — WZORZEC BISKWITOWY (09.08, zamyka BACKLOG #59)

Wzorzec warsztatowy właściciela, podyktowany 09.08 i od tej tury **referencyjny dla
złącza doczołowego** w całej aplikacji. Domykał BLOCKERS #59, otwarte od tury 11, kiedy
przegroda pionowa wylądowała bez żadnego wiercenia.

**ZESTAW (jeden komplet biskwitowy), wzdłuż linii złącza:**

    wkręt ⌀3 → 10 mm przerwy → znacznik biskwitu 70 mm → 10 mm przerwy → wkręt ⌀3

Czytane jako **elementy i CZYSTE przerwy**: 3 + 10 + 70 + 10 + 3 = **96 mm** na zestaw,
środki wkrętów na +1,5 i +94,5, znacznik od +13 do +83. Zestaw **zaczyna się nie bliżej
niż 50 mm od krawędzi elementu — nigdy mniej**.

**ILE ZESTAWÓW:** szerokość ≤ 700 mm → **DWA** (po jednym przy każdym końcu, z zachowaniem
50 mm). Szerzej → **JEDEN więcej na środku**, razem trzy. To wszystko — żadnego rozstawu,
żadnej gęstości na metr.

**ZESTAW BEZ WKRĘTÓW:** wkręt na wylot istnieje **wyłącznie tam, gdzie licowa strona jest
ZAKRYTA**. Wieniec górny idzie pod blat, dolny w cokół — oba wierci się. Płaszczyzny półki
STAŁEJ widać przy otwartych drzwiach, więc przegroda kończąca się na półce dostaje sam
znacznik 70 mm — **w tych samych pozycjach**, żeby trasowanie było jedno.

**GDZIE:** złącze doczołowe ma dwie połowy, a stół 3-osiowy sięga tylko płaszczyzn.
Element PRZYJMUJĄCY (wieniec albo półka stała) dostaje cały zestaw na swojej płaszczyźnie —
wkręty przechodzą przez niego w kant przegrody, znacznik leży między nimi. PRZEGRODA
dostaje sam znacznik, odsunięty od swojego końca (`markFromEnd`): to trasowanie przeniesione
na drugą połowę złącza, i dlatego jest ZNACZNIKIEM, ciętym dedykowanym programem
„in-and-out". Wkrętów się tam nie powtarza — wkręt idzie przez tamtą płytę w ten kant.

Linia złącza to **część wspólna** obu płyt w głębokości, nie głębokość samej przegrody:
przegroda bywa głębsza niż półka, na której stoi, a mocowanie za końcem płyty przyjmującej
to wkręt w powietrze.

**WARSTWY:** wkręty dołączają do istniejącej rodziny **`SCREWS_3MM`** (konwencje tury 8 —
ta sama warstwa, te same średnice). Znaczniki 70 mm idą na NOWĄ warstwę **`BISCUIT_4MM`**,
4 mm, pod dedykowany program VCarve właściciela. Nazwa dosłownie jak wyżej i jest
kontraktem maszynowym jak każda inna nazwa w `engine/cnc/layers.js`.

Liczby: `profile.biscuits`. Arytmetyka: `engine/biscuits.js` (czyste funkcje).
Fixture: `fixtures/golden-partition-biscuits.json` — policzony ręcznie z reguły, nie z
silnika. Delta eksportu udokumentowana w `verify/t13/cnc-export-identity.md`.

> **Wzorzec najpierw.** Pliki referencyjne w stylu KIT-ów pozostają modelem dla przyszłych
> wzorców: #61 (podział drzwi), #62 (DW) i #63 (narożnik / kształt L) czekają na wejście
> właściciela dokładnie tak, jak #59 czekało do 09.08. Silnik nie zgaduje wzorca warsztatu.

---

## 7. UI — **[ZAMROŻONE 04.08, mockup zatwierdzony przez Piotra]**

- **Strefy:** topbar / lewy PŁYWAJĄCY panel Library (przeciągalny, grab & move) / biały kanwas 3D /
  prawy panel parametrów (zamykalny po zakończeniu, np. po drzwiach).
- **Kolory — DNA rodziny (hexy z kodu JC):** otoczka #1a1a1a / #252526 / #2d2d30, bordery #3e3e42;
  **akcent: złoto JC #AA8E68** (hover #C8A678, dark #8F7654) — przyciski w stylu JC;
  kanwas #fafaf8. Font systemowy jak JC. (PC ma własny teal — CC świadomie bliżej JC, decyzja Piotra.)
- **BOM na wywołanie:** przycisk "BOM" otwiera listę; silnik liczy NA ŻYWO zawsze, pokazujemy
  na klik. Eksport = migawka zawsze aktualnego stanu.
- **Etykiety wymiarów w 3D billboardowane** (zawsze frontem do kamery) — lekcja z lustrzanych
  napisów w konfiguratorze PSW.
- Snap w Library: 1 mm domyślnie, opcje 0.5 mm i 32 mm.
- Podgląd: **3D od startu** (React Three Fiber; rusztowanie z PC). Rysunki 2D — później,
  jako widok dodatkowy, jeśli potrzebne.
- Zero designerskich bajerów — narzędzie warsztatowe: mebel w fokusie, białe ściany.

---

## 8. INTEGRACJA Z JC (OPCJONALNA)

**"Connect JoineryCore":** logowanie danymi JC wewnątrz CC → CC trzyma token JC → woła API JC.
Każde żądanie niesie token; tenant wyliczany serwerowo z tokena, zawsze od zera.

**Istniejące (dochodzi tylko CORS origin CC):**
- `GET /api/stock/items` — Stock na żywo (kody, nazwy, jednostki, ceny)
- `POST /api/stock/items` — Add to Stock

**Nowe po stronie JC:**
- `POST /api/dc/materials` — push BOM do Materials List projektu; logika = serwerowa wersja
  `processSashPlannerCSV`: upsert po stock_item_id, delta rezerwacji, `stock_transactions`,
  update `reserved_quantity`, świeży odczyt stocku per pozycja
- `GET /api/dc/projects` — lista projektów tenanta (wybór celu eksportu)
- Order reminder dla Office — późniejszy etap, poza MVP

**[TWARDE ZASADY BEZPIECZEŃSTWA — obowiązują każdy nowy endpoint]:**
1. Każde zapytanie filtruje po `req.user.tenant_id` **z tokena** — nigdy z body/URL/query.
2. **Test izolacji obowiązkowy:** tenant A pyta o dane tenanta B → pusto/404.
   To będą pierwsze testowane endpointy w JC.
3. Kod po stronie JC powstaje **wyłącznie w czacie**, plik po pliku, Piotr pushuje świadomie.
4. CC **nigdy** nie pisze bezpośrednio do tabel JC.

(Kontekst z audytu: `stock.js` ma 21 zapytań i 23 filtry tenant_id — wzorzec jest konsekwentny;
zasady powyżej utrzymują tę dyscyplinę i dodają test.)

---

## 9. ROADMAP I PODZIAŁ PRACY

**Workflow potwierdzony praktyką:** PC zostało zbudowane przez Claude Code w trybie
"autonomia nocna" (fazy 0–5 w jednej sesji, BLOCKERS.md na problemy) — i jest najlepiej
zbudowanym repo rodziny. Powtarzamy ten model z jednym wzmocnieniem: golden fixtures
powstają PRZED sesją CC, żeby matematyki nie dało się cicho zepsuć.

**FAZA A — CZAT (bez kodu aplikacji):**
1. SPEC.md (ten dokument) — zatwierdzenie przez Piotra
2. Golden fixtures z LISP (BUD_FULL + WARDROBE_FULL) — JSON z wartościami wzorcowymi
3. CLAUDE.md dla Cabinet Core (wzór: PC; + zasada nietykalności fixtures)
4. Mockup UI (layout: menu / kanwas 3D / panel parametrów)

**FAZA B — CLAUDE CODE (autonomia nocna) — [DECYZJA 04.08: zakres = FULL MVP w noc 1]:**
5. Scaffold (Vite+React+Zustand+R3F, wersje z PC), mock-mode
6. `engine/` + `node:test` na fixtures — **zielone albo BLOCKERS.md**
7. Profil szafkowy, UI konfiguratora, pokój (ściana główna), 3D, półki drag/snap, szuflady,
   drzwi, BOM on-demand, materiały własne, persystencja Supabase (mock-fallback), eksport CSV+PDF.
   DXF świadomie POZA nocą 1 (zostaje w Fazie D). Pełny rozkład faz 0–7: CLAUDE.md w repo.

**FAZA C — CZAT:**
8. Audyt dostawy (skill code-repo-auditor)
9. Poprawki i iteracje UX (feel przeciągania, snapy) — krótkie pętle plik-po-pliku
10. Endpointy po stronie JC (sekcja 8) + CORS

**FAZA D — powtórka B+C:** DXF/VCarve (dogbones, warstwy), kolejne typy, boczne ściany, tła.

**Później:** nesting 2D arkuszy, rodzina kuchenna (BUD/BUDR/SINK/FRIDGE/TALL/LOW),
kolory/Egger/LED/okucia, order reminder, model sprzedaży.

**Definicja MVP:** jedna szafa przy ścianie → skonfigurowane wnętrze → BOM z materiałami →
PDF + DXF + (opcjonalnie) push do JC.

---

## 10. ZASADY WYKONANIA

- Tylko literalne **"koduj"** autoryzuje pisanie kodu; UI/layout zatwierdzony PRZED kodem;
  lista plików przed każdą zmianą; zero zmian/usuwania funkcji bez zgody.
- Kompletne pliki przez present_files; Piotr pushuje sam; ZIP `cabinetcore-{opis}-{DDMM}-{HHMM}.zip`.
- Żelazna zasada wdrożeń: kod zależny od SQL degraduje gracefully; paczki "SQL PRZED push"
  oznaczane wprost. Baza nad localStorage. RLS na wszystkich tabelach.
- Testy `node:test` od commita #1; fixtures nietykalne dla CC.
- Cache-busting `?v=N`; raport inżynierski 14 sekcji po dostawach kodu.
- Kod i copy po angielsku; rozmowa i dokumenty projektowe po polsku.

---

## 11. [OTWARTE] — nie blokują Fazy A

1. **Model biznesowy** (rekomendacja: freemium jako lejek na JC) — decyzja przed publicznym startem.
2. **Prowadnice szuflad — [ROZWIĄZANE 04.08 odkryciem w LISP]:** KIT_WARDROBE hardcoduje
   standardowe długości prowadnic {390–690 co 50} ze snapowaniem głębokości skrzynki + pozycje
   otworów (38+i·203, x 37/69/293). MVP = ten standard; parametryzacja typów (Blum itd.) później.
   Kuchenna BUDR (ratio 4:3:2) — osobny typ, poza MVP.
3. **Wymiary arkuszy płyt** (2800×2070 itd.) — ustawienie per tenant czy z pozycji Stock;
   potrzebne dopiero na etapie nestingu.
4. **Fronty inset (zintegrowane)** — LISP ma tylko overlay (szer−3); liczby odjęć dla inset
   do podania przez Piotra.
5. **Tryb demo bez konta** (jak konfigurator PSW) — rekomendacja: tak, po MVP.
6. **`KIT_DOOR_SINGLE.lsp`** — dograć do knowledge, jeśli istnieje.

---

## 12. TODO — PIOTR

1. [CRITICAL] Załóż repo `Piotr3009/Cabinet-Core` (prywatne, puste)
2. [HIGH] W repo PC: zmień nazwę pliku `CLAUDE .md` → `CLAUDE.md` (spacja blokuje auto-wczytywanie przez Claude Code)
3. [MEDIUM] Kup domenę cabinet-core.com (wolna — sprawdzone 03.08)
4. [MEDIUM] Załóż nowy projekt Supabase "cabinet-core" (potrzebny przed Fazą B, nie przed fixtures)
5. [LOW] Przemyśl model biznesowy (pkt 11.1)
6. [LOW] (Opcjonalnie) Zrzut ekranu konfiguratora PSW jako referencja wizualna do knowledge
