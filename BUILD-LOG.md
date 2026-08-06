# BUILD-LOG.md — noc 04.08.2026

Dziennik autonomicznej sesji Claude Code: fazy 0–7 wg `CLAUDE.md`.
Jeden wpis na fazę, każdy z **werdyktem**. Problemy → `BLOCKERS.md`.

---

## Faza 0 — Scaffold + shell UI — ✅ ZIELONA

**Co powstało.** Vite + React 19 + Zustand + Tailwind + R3F, struktura
`src/{engine,stores,components,3d,pages,lib}` + `sql/` + `test/`.
Paleta Cabinet Core w `tailwind.config.js` (struktura z PC, kolory z JC:
shell `#1a1a1a`/`#252526`/`#2d2d30`, bordery `#3e3e42`, złoto `#AA8E68`
hover `#C8A678` dark `#8F7654`, kanwas `#fafaf8`, font systemowy).
Layout zamrożony wg SPEC 7: topbar (CABINET CORE złotem, edytowalna nazwa
projektu, BOM, Account, złoty Export) / lewy **pływający** panel Library
przeciągalny za uchwyt (Wardrobe, Base unit, Kitchen — soon wyszarzone,
Room setup, Snap 0.5/1/32 mm) / biały kanwas / prawy panel parametrów
(zamykalny). Badge **Mock data mode** żółty, gdy brak kluczy Supabase.

**Wersje.** Przypięte DOKŁADNIE do PC: React 19.1.1, react-dom 19.1.1,
@react-three/fiber 9.4.0, @react-three/drei 10.7.6, three 0.180.0,
zustand 5.0.0, vite 7.1.3, tailwindcss 3.4.14, @supabase/supabase-js 2.45.4,
jspdf 2.5.2. Jeden wyjątek — `@vitejs/plugin-react` musi zostać zakresem
(peer conflict z vite 7): **BLOCKERS #5**.

**Werdykt.** `npm install` czysty, `npm run build` przechodzi.

---

## Faza 1 — Silnik + testy (brama jakości) — ✅ ZIELONA (1 × todo, udokumentowane)

**Co powstało.**
- `src/engine/profile.js` — WSZYSTKIE stałe Skylonu jako edytowalne defaulty,
  wzorzec 1:1 z PC: komentarz *"different workshops = different NUMBERS, never
  different formulas"*, pojedynczy punkt odczytu `getCabinetProfile()`,
  migracja schematu `migrateCabinetProfile()`. Zero gołych liczb we wzorach —
  łącznie z systemem puzzli, progiem drzwi, standardem prowadnic i CSV.
- `src/engine/types.js` — konfigi typów z diffów LISP (BUD / WARDROBE).
- `src/engine/puzzle.js` — geometria puzzli Skylon **1:1** z `SKYLON_COMMON.lsp`
  (drawBUL / drawBUR / drawTOP_ROT90 / drawBACK): outline z zębami, dogbones,
  sockety, wkręty, nazwy warstw.
- `src/engine/cabinet.js` — `computeCabinet(params, profile)` →
  `{ derived, panels[], drills[], drillSummary, totals, csvLines[], warnings[], assemblies }`.
  Zero importów Reacta. Pełny typ BUD + pełny typ WARDROBE (szuflady, drawer
  panel, fillery, wieniec, rail, prowadnice).
- `src/engine/format.js` — `rtos()` odtwarzający zaokrąglanie AutoLISP-a,
  żeby CSV był identyczny co do znaku.
- `test/engine.test.js` — czyta OBA pliki fixtures, dla każdego case porównuje
  `derived`, panele (wymiary, qty, banding, area), **kompletny multiset formatek**
  (nic nie ginie i nic nie dochodzi), wiercenia (i rekordy `drills[]`, nie tylko
  podsumowanie), totals i `csv_labels` **dokładnie co do znaku**. Do tego testy
  reguł: próg drzwi, liczba zawiasów tall/low, snap głębokości szuflady, ścieżki
  ostrzeżeń, geometria puzzli, migracja profilu.

**Zasada precyzji w testach.** Fixtures podają wartości zaokrąglone i **nie
zawsze do tylu samo miejsc** (BUD-A `board_area_m2` = 2.19 → 2 miejsca,
W-A = 6.757 → 3). Test zaokrągla wynik silnika do tylu miejsc, ile podaje
fixture, i wymaga trafienia **dokładnego** — ostrzej niż widełki ±0.001.

**Fixtures.** Nietknięte. Żadna wartość oczekiwana nie została zmieniona,
zaokrąglona ani wyłączona.

**Werdykt.** `npm test` → **69 testów, 68 pass, 0 fail, 1 todo**.
Jedyne `todo` to `W-B › totals.panels_true_incl_railpart` — fixture jest
wewnętrznie sprzeczna (W-A liczy panele wg formuły LISP, W-B dolicza jeszcze
fronty drzwi). Test **działa i raportuje** różnicę 29 vs 27, nie jest wyciszony.
Pełna analiza + rekomendacja: **BLOCKERS #1**. Reszta W-B (wszystkie wymiary,
11.044 m² płyty, 2.985 m² frontów, 8.95 mb obrzeża, wiercenia) przechodzi
dokładnie, więc sam zestaw formatek jest potwierdzony.

Przy okazji wyszła rozbieżność progu drzwi 704 vs 705 mm — **BLOCKERS #2**.

---

## Faza 2 — Pokój + 3D — ✅ ZIELONA

**Co powstało.** `src/3d/`: `Scene.jsx` (Canvas, kamera, miękkie światło,
OrbitControls, `CaptureRig` do zrzutu dla PDF), `Room.jsx` (ściana główna
H×W biała + podłoga; kotwica projektu, czwarta ściana świadomie nierysowana),
`UnitView.jsx` (render **z wyjścia silnika** — każdy `panels[].box` to jeden
box w scenie, więc widok nie przelicza ani jednego wymiaru), `DimLabel.jsx`,
`constants.js` (jedyne miejsce z przelicznikiem mm → metry).

**Etykiety wymiarów billboardowane.** Zrobione sprite'em z teksturą canvas,
nie overlayem DOM ani `drei/Text`: sprite jest billboardem z definicji, nie
pobiera fontu z sieci i — inaczej niż overlay HTML — **widać go na zrzucie
WebGL**, którego używa eksport PDF. To bezpośrednia lekcja z lustrzanych
napisów w konfiguratorze PSW (SPEC 7).

**Przeciąganie.** Szafa dosunięta do ściany (tył w płaszczyźnie z = 0),
pozycja X przeciągalna wzdłuż ściany: promień myszy przecinany z pionową
płaszczyzną równoległą do ściany, wynik snapowany krokiem z Library
(0.5/1/32 mm) i przycinany do szerokości ściany. Listenery na `window`, żeby
szybki ruch myszy nie gubił przeciągania; OrbitControls wyłączane na czas drag.

**Poprawki po podglądzie w przeglądarce.** Domyślny tone mapping R3F (ACES)
zamieniał białą ścianę w szarą — ustawione `NoToneMapping` + mocniejsze
światło ambient. Pierwsza jednostka ląduje na środku ściany (wcześniej przy
lewej krawędzi, pod panelem Library).

**Werdykt.** Zweryfikowane realnym uruchomieniem w Chromium (Playwright):
scena renderuje się bez błędów w konsoli, szafa stoi przy ścianie, etykiety
czytelne, `npm run build` przechodzi.

---

## Faza 3 — Edycja wnętrza — ✅ ZIELONA

**Co powstało.** Klik w szafę → zaznaczenie + **złoty outline** wokół korpusu.
Prawy panel: parametry korpusu (W/H/D, grubość płyty/frontu, typ frontu S/H/F,
strona zawiasu — blokowana przy 2 drzwiach) + przycisk **„+ Add items"** →
modal: **Drawers** (ilość, mount overlay aktywny / inset wyszarzony „soon" —
BLOCKERS #6), **Shelves**, **Hanger rail** (wysokość), **Pull-down rail**
(„soon"). Szuflady wstawiane od dołu stosem wg reguł silnika; wieniec
(partition) nad stosem jest wystawiany automatycznie i pokazany na liście jako
pozycja zablokowana — to realizacja twardej reguły SPEC 4.7.

**Półki.** [+] dodaje i rozkłada równomiernie, [×] usuwa, pozycję można wpisać
liczbą albo **przeciągnąć pionowo w 3D**: kursor `ns-resize`, półka podświetla
się złotem, a obok pojawiają się **żywe wymiary** — odległość do sąsiada niżej
(albo do wieńca/dna), do sąsiada wyżej (albo do wieńca górnego) oraz pozycja
bezwzględna. Snap `round(raw/step)*step` krokiem z Library (0.5 / 1 / 32 mm),
kolizje: minimalny prześwit od sąsiadów, zakaz wejścia w strefę szuflad, zakaz
wyjścia poza dno/wieniec. Cała logika ograniczeń siedzi w store
(`shelfLimits` / `shelfDragBounds` / `validateUnit`), nie w komponencie 3D.
Typ półki fixed / pull-out do wyboru (pull-out trafia do BOM jako pozycja z
prowadnicami).

**Model danych.** `sections[].items[]` dokładnie wg SPEC 5: `{ kind, pos_mm,
variant, mount }`. Silnik przyjmuje ALBO liczniki (fixtures), ALBO pozycyjne
itemy (edytor) — dlatego fixtures dalej przechodzą bez zmian, a przeciągnięta
półka realnie przesuwa swój rząd otworów (`shelfHoles.followPositions`).

**Znaleziony i naprawiony błąd.** Przeciąganie półki w ogóle nie działało:
handler `onPointerDown` wisiał na `<group>` całej szafy ORAZ na meshu półki,
a R3F wysyła oba przy tej samej odległości trafienia — ten, który wykonał się
pierwszy, `stopPropagation()` kasował drugi. Handlery przeniesione na
poszczególne meshe (półka → drag pionowy, reszta → przesuw jednostki).
Wykryte dopiero realnym testem w przeglądarce, nie z czytania kodu.

**Werdykt.** Zweryfikowane w Chromium: dodanie 2 szuflad + półki, przeciągnięcie
półki 1288 → 808 mm ze snapem i żywym wymiarem 364 mm do wieńca; zero błędów
w konsoli. `npm test` i `npm run build` bez zmian — zielone.

---

## Faza 4 — Drzwi + BOM na wywołanie — ✅ ZIELONA

**Drzwi jako ostatni krok.** Nowa jednostka startuje BEZ frontów
(`params.doors: false`). Przycisk „Add doors — finish unit" liczy ilość progiem
z profilu, ustawia zawias L/R (przy 2 drzwiach pole jest blokowane) i **zamyka
prawy panel** oraz czyści zaznaczenie — dokładnie jak SPEC 4.10. Da się je też
zdjąć („Remove doors").

**BOM.** `src/engine/bom.js` agreguje wyjście silnika po wszystkich jednostkach:
wiersze formatek, sumy per **rola** (side/top/bottom/back/shelf/front/drawer_box)
i sumy globalne. Liczony **NA ŻYWO** przy każdym renderze; panel decyduje tylko
KIEDY go pokazać (SPEC 4.11 — dzięki temu sekwencja „materiały → potem drzwi"
nie da już BOM-u bez frontów).

Panel BOM: zakładka **Parts** (formatki per jednostka: wymiary, ilość, kod
obrzeża, m²) i **Materials** (przypisanie materiału per rola z własnej listy +
współczynnik **yield** = zapas na odpad; obok od razu wychodzi m² do zamówienia
i koszt). Store wzorowany na `materialAssignmentStore.js` z PC: kanoniczny
schemat 2 (base + overrides per wariant) i płaski widok pochodny.
**„Connect JoineryCore"** jest zaślepką z komunikatem — integracja to
późniejsza faza (SPEC 8).

**Eksporty (wpięte tutaj, bo to przyciski BOM-u).** Cutting list CSV
**dokładnie w formacie LISP** — nagłówek `UNIT,PANEL,SZER,WYS,EDGE,EDG_L,SQM`
i wiersze prosto z `result.csvLines`. PDF (jsPDF): zrzut 3D z `CaptureRig`
+ tabela formatek z paginacją + sekcja materiałów z yieldem i kosztem.
Nazwy plików wg konwencji rodziny: `cabinetcore-{opis}-{DDMM}-{HHMM}.{ext}`.

**Poprawka wydajności.** Pierwszy PDF ważył 4.9 MB — surowy PNG z canvasu w
pełnej rozdzielczości. Zrzut jest teraz skalowany do 1600 px i zapisywany jako
JPEG: **39 KB**, bez widocznej różnicy.

**Werdykt.** Przejechane w Chromium end-to-end: szafa → 2 szuflady → półka →
wieszak → drzwi → BOM → przypisanie materiałów → CSV + PDF. Wyeksportowany CSV
zgadza się **wiersz w wiersz** z golden fixture W-A (BUL 560×2150 `<` 2.15
1.204, …, W01-F 597×2147 `<>^v` 5.49 1.282). PDF: 2 strony, zrzut 3D + tabela.
Zero błędów w konsoli.

---

## Faza 5 — Persystencja + eksporty — ✅ ZIELONA

**`sql/001_init.sql`** — z wymaganym nagłówkiem „SQL PRZED push — uruchamia
Piotr ręcznie w Supabase SQL Editor". Skrypt jest **idempotentny**.
Tabele: `cc_projects` i `cc_units` dokładnie wg SPEC 5, plus `cc_materials`
(własna lista materiałów, z kolumną `jc_uuid` — import po stronie JC
identyfikuje pozycje po UUID stock_items, nie po kodzie MAT) i `cc_profiles`
(profil warsztatu). Te dwie dołożone świadomie: bez nich „własna lista
materiałów" i profil żyłyby wyłącznie w localStorage, co łamie zasadę
„baza nad localStorage". **RLS włączone na KAŻDEJ tabeli**, polityki
SELECT/INSERT/UPDATE/DELETE per `auth.uid()`. Dla `cc_units` własność jest
dziedziczona z projektu rodzica przez `exists (...)`, z `WITH CHECK` również
na UPDATE — inaczej dałoby się przepiąć swoją jednostkę do cudzego projektu.
Na końcu pliku gotowy ręczny test izolacji tenantów.

**Klient + auth.** `src/lib/cloudSync.js` — lista/odczyt/zapis/kasowanie
projektów i minimalne auth (login / rejestracja / wylogowanie). **Każda
funkcja degraduje się łagodnie**: brak kluczy albo nieuruchomiony SQL → wynik
mockowy i praca leci dalej na cache w localStorage. Nic stąd nie rzuca
wyjątkiem do UI. Zapis jednostek jest „wymień wszystkie" zamiast diffowania —
projekt jest mały, a diff po stronie klienta to najprostszy sposób, żeby po
cichu zgubić jednostkę.

**Modal Account.** W mock-mode nie udaje logowania — tłumaczy stan i pokazuje
dokładnie, co zrobić (`.env.example` → `.env`, potem `sql/001_init.sql`).
Po podłączeniu kluczy: logowanie/rejestracja, zapis bieżącego projektu i lista
projektów z chmury do otwarcia.

**Eksporty** wpięte fazę wcześniej (są przyciskami BOM-u) — CSV w formacie LISP
i PDF z jsPDF; szczegóły w werdykcie Fazy 4.

**Werdykt.** Zweryfikowane w przeglądarce: aplikacja startuje bez `.env`,
badge „Mock data mode" widoczny, modal Account tłumaczy tryb, zero błędów
w konsoli, `npm test` i `npm run build` zielone. Ścieżki z realną bazą nie były
uruchamiane — nie ma kluczy (i SQL-a świadomie nie wykonujemy).

---

## Faza 6 — Drugi typ + multi-unit smoke — ✅ ZIELONA

**Co powstało.** Typ **BUD** (kuchenna baza) był już w silniku od Fazy 1 i jest
w Library od Fazy 0; tutaj doszło potwierdzenie, że architektura wielu jednostek
faktycznie działa. Nowa jednostka dostawia się do prawej krawędzi ostatniej
(pierwsza ląduje na środku ściany), a przy przeciąganiu działa **magnes
jednostka-do-jednostki**: w zasięgu przyciągania krawędź ląduje **dokładnie**
na krawędzi sąsiada.

**Poprawka po teście.** Zasięg magnesu był ustawiony na jeden krok snapa
(1 mm) — przy myszy praktycznie nie do trafienia (1 mm ≈ 0.3 px). Wyniesiony do
profilu jako `editor.unitMagnet: 40` mm i zweryfikowany: przeciągnięcie w
pobliże sąsiada daje x = 2300 przy szafie 1700 + 600, czyli styk co do
milimetra.

**Werdykt.** W jednym pokoju stoją szafa W01 (2150, szuflady + półka + drzwi)
i baza 02 (770, półka + drzwi), obie przy ścianie, obie z własnym numerem i
etykietami. BOM pokazuje obie jednostki osobnymi sekcjami, sumy się zgadzają.
Zero błędów w konsoli. To smoke-test architektury, nie pełna kuchnia — zgodnie
z zakresem fazy.

---

## Faza 7 — Wykończenie — ✅ ZIELONA

**Przejście end-to-end w mock-mode** (skrypt Playwright, czysty localStorage,
Chromium — 13 kroków, wszystkie PASS):

| # | Krok | Wynik |
|---|---|---|
| 1 | start bez `.env`, badge „Mock data mode" | PASS |
| 2 | Room setup 2600 × 3600 | PASS |
| 3 | szafa przy ścianie | PASS (x = 1500, środek ściany) |
| 4 | 2 szuflady + półka + wieszak | PASS |
| 5 | przeciągnięcie półki pionowo | PASS (1288 → 832 mm) |
| 6 | snap **32 mm** honorowany przez drag | PASS (832 % 32 = 0) |
| 7 | drzwi jako ostatni krok, prawy panel się zamyka | PASS |
| 8 | drzwi zapisane na jednostce | PASS (`{count: 1, hinge: "L"}`) |
| 9 | druga jednostka dostawiona na styk | PASS (1500 + 600 = 2100) |
| 10 | BOM pokazuje obie jednostki | PASS |
| 11 | materiały + yield → koszt | PASS |
| 12 | eksport CSV + PDF | PASS |
| 13 | projekt przeżywa reload (cache) | PASS (2 jednostki) |

Zero błędów w konsoli na każdym kroku. Wyeksportowany CSV zawiera obie
jednostki, a wiersze bazy `02` zgadzają się **co do znaku** z golden fixture
BUD-A (`02,BUL,540,770,<,0.77,0.416` …).

**Zgrzyty naprawione w tej fazie.**
- Cache do localStorage zapisywał się przy KAŻDEJ zmianie stanu — czyli w
  trakcie przeciągania półki ~60 razy na sekundę. Zdławiony do jednego zapisu
  na 250 ms.
- `Scene` i `BomPanel` liczyły wynik silnika z funkcji store'a, która ma stabilną
  referencję — czyli subskrypcja, która realnie wymusza przeliczenie (`units`),
  wyglądała na martwy kod i mogła zostać „posprzątana" przy pierwszym refaktorze.
  Zależność jest teraz jawna (`useMemo([units])`) i opisana komentarzem.
- CSV kończy się teraz terminatorem linii, tak jak plik z `write-line` w LISP.

**Testy.** Doszedł `test/bom.test.js` (8 dodatkowych asercji): sumy per rola
schodzą się z sumami projektu i z fixture, role należą do siedmiu ról BOM,
CSV wieloczęściowy trzyma format LISP, yield liczy się poprawnie, identyczne
formatki scalają się w jeden wiersz, nazwy plików trzymają konwencję rodziny.
Razem: **77 testów, 76 pass, 0 fail, 1 todo**.

**README.md** — jak uruchomić (`npm i`, `npm run dev`, `.env` opcjonalny),
opis flow, mapa repo, obie żelazne zasady (silnik bez Reacta, fixtures tylko do
odczytu) i szczery zakres tego, czego świadomie NIE ma.

---

# DEFINICJA SUKCESU NOCY — status

1. **`npm test` zielony** — ✅ 76 pass / 0 fail. Jedno `todo` to sprzeczność
   wewnątrz fixture (BLOCKERS #1), raportowana głośno, nie wyciszona.
2. **`npm run dev` działa bez `.env`** — ✅ zweryfikowane w Chromium.
3. **Flow end-to-end** pokój → szafa → szuflady + półki (drag ze snapem) →
   drzwi → BOM z materiałami → eksport CSV + PDF — ✅ przejechany, 13/13 PASS.
4. **BUILD-LOG z werdyktem każdej fazy, problemy w BLOCKERS** — ✅ 8 faz, 7 wpisów
   w BLOCKERS.md, nic nie zamiecione pod dywan.

**Do decyzji Piotra rano:** BLOCKERS #1 (która liczba to „panels" w BOM) i #2
(czy szafka 704 mm dostaje 1 czy 2 drzwi). Obie to jedna liczba do zmiany, nie
przebudowa.

---

# TURA 2 — noc 04.08.2026

Zadania 1–7 wg `CLAUDE.md` (tura 2). Punkt wyjścia: main, **77 testów zielonych**
— to była podłoga i ani razu nie spadła poniżej. Stan końcowy: **158 testów, 0 fail**.
Jeden wpis na zadanie, każdy z werdyktem. Problemy → `BLOCKERS.md` (#8–#12).

---

## Zadanie 6 — CI — ✅ ZIELONE

`.github/workflows/ci.yml`: `npm ci && npm test && npm run build` na Node 22,
przy każdym push i PR do main. Grupa `concurrency` — nowy push anuluje bieg,
który jeszcze trwa. Uprawnienia tylko do odczytu. `npm ci`, nie `npm install`,
bo lockfile JEST zasadą przypiętych wersji i `ci` krzyczy, gdy się rozjedzie.

**Werdykt.** Zrobione. Zielone na PR tej tury (patrz opis PR).

## Zadanie 7 — kosmetyka — ✅ ZIELONE

Zapis „2 drzwi od W = 704" był przesunięty o 1 mm wszędzie poza fixtures.
Warunek LISP to `(<= (- szer 4.0) 700.0)`, więc 704 to WCIĄŻ jedne drzwi,
a przełącznik jest na 705 (BLOCKERS #2). Poprawione w `cabinet.js`,
`profile.js` i `SPEC.md`. **Zachowanie silnika bez zmian — mylił się tylko opis.**

**Werdykt.** Zrobione.

## Zadanie 2 — generator DXF + ZIP — ✅ ZIELONE

`src/engine/cnc/layers.js` — jedno miejsce, które wie, jak nazywa się warstwa
CNC. NAZWY to twardy kontrakt z maszyną (VCarve mapuje narzędzia po nazwie
warstwy) i pochodzą wprost z `SKYLON_COMMON.lsp → createCNCLayers`; nie są
„porządkowane". `aci` to kolor AutoCAD-a z LISP-a i idzie do DXF bez zmian,
`screen` to osobny, celowo ROZRÓŻNIALNY kolor podglądu — LISP daje ACI 5
jednocześnie `HINGES_5MM` i `RUNNERS_3MM`, co w AutoCAD-zie jest OK (przełączasz
warstwy), a w podglądzie tylko-do-odczytu jest bezużyteczne.

`src/engine/cnc/dxf.js` — czysty JS, zero zależności. Jeden plik DXF na
formatkę, mm, origin w lewym-dolnym rogu nominalnego prostokąta formatki
(czyli dokładnie ten układ, w którym silnik już liczy — nietknięty).
Zamknięta polilinia = outline, zamknięta polilinia na każdy pocket (dogbones
i sockety), CIRCLE na każdy otwór, TEXT `{unitNum}-{panelId}` na warstwie
UNIT_NUMBER. **Okręgi czytane WYŁĄCZNIE z `drills[]`**, bo `computeCabinet`
już wsypuje tam `panel.cnc.holes` — czytanie obu zdublowałoby każdy otwór
puzzla. `$EXTMIN/$EXTMAX` w nagłówku podają prawdziwy zasięg, razem z tabami
i wybiegami socketów.

Dialekt R12 (AC1009) — **udokumentowane odstępstwo**, patrz BLOCKERS #8.

`src/lib/cncExport.js` — jszip 3.10.1 (jedyna dozwolona nowa zależność) pakuje
do `{unitNum}-dxf.zip`. Siedzi w `lib/`, nie w `engine/`, żeby silnik został
bez zależności i w pełni testowalny w node.

`test/dxf.test.js` — 13 testów, które generują W-A z golden fixture i **parsują
własny output z powrotem**: struktura sekcji i CRLF, każda warstwa zadeklarowana
z kolorem ACI z LISP-a, liczba CIRCLE per warstwa per formatka równa liście
`drills` (i każdy okrąg w dobrym środku i o dobrym promieniu), jedna zamknięta
polilinia na pocket zgodna z prostokątem silnika róg w róg, outline zamknięty
i niosący punkty silnika bez zmian, etykiety, nazewnictwo plików, pokrycie
wszystkich formatek. Nic nie jest porównywane z ręcznie napisanym stringiem —
**referencją jest silnik**, więc rozjazd geometrii wywala się tutaj, a nie przy
wrzecionie.

**Werdykt.** Zielone. W-A → 25 plików DXF; `W01-BUL.dxf` ma 8 polilinii,
37 okręgów, 1 etykietę i 9 warstw. Akceptacja rano: Piotr otwiera w VCarve.

## Zadanie 1 — widok CNC — ✅ ZIELONE

Przełącznik **3D | CNC** w TopBarze. Widok rysuje wszystkie formatki
ZAZNACZONEJ jednostki rozłożone płasko, z geometrii silnika. Tylko podgląd:
nic tu nie zapisuje do projektu i nic nie przelicza wymiaru od nowa.

`src/engine/cnc/layout.js` — układ jako funkcje czyste, więc testowany w node,
a nie mrużeniem oczu w przeglądarce. `panelBounds()` mierzy PRAWDZIWY zasięg
formatki: tab puzzla wychodzi o grubość płyty poza krawędź, a wybieg socketu
o 6 mm — układanie po samych w × h nakładałoby sąsiadów. `layoutPanels()`
układa w kolejności listy rozkroju z LISP-owym `odstep` 50 mm, zawijając rząd
zamiast uciekać w prawo w nieskończoność. Współrzędne wychodzą y-W-DÓŁ (układ
SVG), więc żadnej transformacji lustrzanej i żadnej etykiety pisanej wspak.

`src/components/CncView.jsx` — SVG (skalowalne), zoom kółkiem zakotwiczony na
kursorze, przeciąganie = pan, Fit. Kolor per warstwa + legenda, która przy
okazji włącza/wyłącza warstwy. Kreski `non-scaling`, żeby otwór 3 mm był
widoczny przy całym arkuszu w kadrze; otwory mają minimalny promień ekranowy
z tego samego powodu. **Etykieta formatki jest ograniczona szerokością swojej
formatki** — dwie formatki obok siebie nie mogą sobie nadpisać podpisów;
30-milimetrowy filler dostaje malutki podpis przy pełnym kadrze i czytelny
w chwili, gdy do niego dojedziesz zoomem.

Scena 3D **zostaje zamontowana** pod widokiem CNC: to ona trzyma kontekst
WebGL, który czyta eksport PDF, a reinicjalizacja przy każdym przełączeniu
gubiłaby go i kosztowała widoczną zwiechę.

`test/cnc-layout.test.js` — 8 testów: bounds obejmują taby i wybiegi, każda
formatka położona dokładnie raz w kolejności rozkroju, żadne dwie się nie
nakładają, rzędy się zawijają i nic nie ucieka poza arkusz, formatka szersza
niż limit rzędu i tak zostaje położona (brak nieskończonego zawijania),
mapowanie y-w-górę → y-w-dół dokładne róg w róg, każdy pocket i każdy otwór
ląduje wewnątrz swojej formatki.

**Werdykt.** Zielone, zweryfikowane w Chromium — szafa + 3 szuflady + 2 półki
+ wieszak + drzwi rysuje 31 formatek / 158 otworów, zoom, pan, Fit i legenda
działają, „Download DXF (ZIP)" daje `W01-dxf.zip`. Zero błędów w konsoli.

## Zadanie 3 — kolizje: twarda blokada — ✅ ZIELONE

Zasada: **ruch zatrzymuje się na granicy.** Nie ostrzeżenie, nie cofnięcie po
fakcie i nigdy nakładka, którą lista rozkroju musi potem tłumaczyć.

`src/engine/collision.js` — funkcje czyste na zwykłych liczbach, więc ścieżka
drag, ścieżka klawiatury, wpisana ręcznie liczba i każda przyszła ścieżka
liczą TO SAMO. Nie ma drugiej kopii reguły, która mogłaby się rozjechać.
Nowe stałe w `profile.editor`: `minShelfEdgeGap` (półka ↔ wieniec / dno /
partition, default 40 = dotychczasowe zachowanie) i `minUnitGap` (jednostki
stoją krawędź w krawędź; > 0 wymusza szczelinę pod skrobak).

Jednostki: `clampUnitX()` clampuje do wolnej szczeliny, w której jednostka stoi
**TERAZ**, a nie do najbliższej legalnej pozycji gdziekolwiek na ścianie.
Jednostka porusza się w sposób ciągły, więc może ją zatrzymać tylko to, co
napotka pierwsze; dopuszczenie całej ściany pozwoliłoby szybkiemu dragowi
przeteleportować jednostkę za sąsiada do następnej dziury. Magnes to ta sama
bariera osiągnięta wcześniej — w zasięgu `unitMagnet` jednostka dostawia się
na styk, czyli do najbliższej legalnej pozycji, więc **z definicji nigdy nie
tworzy nakładki**.

Store: KAŻDY zapis idzie przez clamp. `setShelfPos()` jest jedyną drogą zapisu
pozycji półki (drag i pole liczbowe w prawym panelu wołają to samo — pole było
wcześniej furtką prosto obok reguł); `reclampShelves()` przelicza po zmianie
parametru korpusu; `addUnit()` kładzie nową jednostkę przez `firstFreeUnitX()`;
poszerzenie jednostki uruchamia ten sam clamp co drag. Czego clamp naprawić NIE
MOŻE — jednostka wyższa niż pokój albo szersza niż ściana — raportuje
`validateUnit()` jako błąd, bo tam trzeba zmienić liczbę, nie pozycję.

**Znaleziony przy okazji prawdziwy błąd.** To, po której stronie leży
przeszkoda, jest rozstrzygane na SUROWYCH obrysach, a szczelina doliczana
dopiero do bariery. Czytanie strony z obrysu powiększonego o szczelinę sprawia,
że para stojąca na styk wygląda na „już nachodzącą" w chwili, gdy ktoś ustawi
`minUnitGap > 0` — i clamp przestaje pilnować dokładnie tego sąsiada, dla
którego istnieje. Wyszło przy dochodzeniu, czemu przypadek „brak miejsca w
szczelinie" jest nieosiągalny. Ma własny test regresji.

`test/collision.test.js` — 34 testy na przypadkach, których klikaniem się
powtarzalnie nie odtworzy: zerowy luz, elementy dokładnie stykające się, drag
wyprzedzający kursor i próbujący przejechać daleko za sąsiada, szczelina bez
miejsca, niemożliwe pasmo, clearance z profilu. Testy CZYTAJĄ profil, zamiast
przepisywać jego liczby.

**Werdykt.** Zielone, zweryfikowane realnym prowadzeniem przeglądarki (jeden
ciągły pointer-down, żeby chwyt nie zgubił się w trakcie):

| co | wynik |
|---|---|
| jednostka rzucona mocno w LEWO | staje na 2300 = prawa krawędź sąsiada |
| jednostka rzucona mocno w PRAWO | staje na 3400 = koniec ściany (4000 − 600) |
| 6 szybkich rzutów tam i z powrotem | nakładki brak w żadnej próbce |
| półka przeciągnięta na wieniec | staje na 2092 = 2150 − 18 − 40 |
| półka przeciągnięta na szuflady | staje na 1060 = jeden luz nad półką niżej |
| półka wpisana jako 100 przy szufladach | 484 = na wierzchu partition |
| półka wpisana na sąsiadkę | 524 = dokładnie jeden minimalny luz |
| wysokość 2150 → 1800 | półka, która przestała się mieścić, przeclampowana |
| wysokość 2900 w pokoju 2500 | „Unit is 400 mm taller than the room." |

## Zadanie 4 — wysokość szuflad per szuflada — ✅ ZIELONE

LISP zna tylko front 200 mm. Każdy wzór, który miał tę liczbę wbetonowaną, jest
teraz napisany po LIŚCIE wysokości, a 200 wszędzie to po prostu przypadek
szczególny:

```
totalH   = Σ hᵢ + (n−1)·gap            (było n·200 + (n−1)·3)
prowadnica i = firstRowFromBottom + Σ_{j<i}(hⱼ + gap)
bok skrzynki = hᵢ − frontToSideDelta   (nowa stała profilu, 36 = 200−164)
przód/tył skrzynki = bok − 15 − G − 1  (bez zmian, wciąż liczone z boku)
front 1  = h₁ − firstFrontAdjust, reszta własna wysokość
partition, walidacja strefy, szerokości: bez zmian
```

Całą generalizacją są **przesunięcia skumulowane**: każde „i × (frontHeight +
gap)" staje się „suma szuflad pode mną plus ich luzy".

`frontToSideDelta` zastępuje sztywne `sideHeight: 164`. Przy zmiennych frontach
niezmiennikiem jest RÓŻNICA, nie wysokość boku — warsztat o innej relacji
front/skrzynka zmienia jedną liczbę i cały stos idzie za nią.
`minFrontHeight`/`maxFrontHeight` (100/600) to limity warsztatowe; wartość poza
nimi jest clampowana z ostrzeżeniem `DRAWER_HEIGHT_CLAMPED`, zamiast po cichu
wyprodukować ujemną formatkę. Brak wysokości, zero albo śmieć → default
z profilu, więc **stos, w którym nikt nic nie ustawił, JEST stosem golden**.

UI: AddItemsModal pyta o ilość + wysokość; prawy panel edytuje każdą szufladę
od dołu i pokazuje obok wynikową wysokość boku skrzynki, plus na żywo wysokość
stosu i pozycję partition. Podniesienie ilości zachowuje wysokości już
ustawione, a usunięcie szuflady przenumerowuje resztę, żeby „szuflada i" dalej
znaczyła „i-ta od podłogi" dla silnika, rzędów prowadnic i listy rozkroju.

`test/drawer-heights.test.js` — 13 testów, w nagłówku oznaczonych jako testy
SPÓJNOŚCI SILNIKA (engine-derived), **nie golden**: dla stosu 250/150 nie ma
liczby z LISP-a, do której można by je przyłożyć. Sprawdzają, że strefa sumuje
się do partition, fronty kafelkują od dołu z dokładnie jednym luzem i nigdy się
nie nakładają, każda część skrzynki idzie za SWOIM frontem, rzędy prowadnic
lądują wewnątrz szuflady, którą niosą, a CSV i geometria CNC idą za tym
wszystkim. Jedyny przypadek, który LISP zna — wszystkie szuflady domyślne —
jest sprawdzony wobec fixture, łącznie z tym, że jawne wypisanie wysokości
niczego nie zmienia (panels, drills, CSV i derived deep-equal).

**Werdykt.** Zielone. Wszystkie 77 oryginalnych testów bez jednej zmiany —
**defaulty odtwarzają fixtures co do bitu.** Zweryfikowane w Chromium:
3 × 180 → stos 546, partition 569; po edycji na 300/180/120 → stos 606,
partition 629, a BOM od razu pokazuje boki 264/144/84 i przody skrzynek
230/110/50; arkusz CNC przerysowuje te same części; 9999 clampuje się do 600,
a 5 do 100; usunięcie dolnej szuflady przenumerowuje pozostałe.

## Zadanie 5 — biblioteka okuć przez ASSIGN — ✅ ZIELONE

Silnik wystawia `result.hardware[]` — **ILOŚCI z geometrii, nigdy produkty**.
Który zawias, która prowadnica i ile kosztują to przypisanie, które warsztat
robi wobec własnej listy materiałów.

| rola | ilość | spec |
|---|---|---|
| `hinges` | zawiasy-na-drzwi × drzwi, wprost z reguły zawiasów | szt./drzwi |
| `runner_pairs` | jedna PARA na szufladę | zesnapowana długość prowadnicy |
| `legs` | z profilu, tylko dla typu, który je ma | wysokość |
| `rail` | 1 szt., tylko gdy założony | szerokość wewnętrzna |
| `shelf_pins` | `shelfHoles.pinsPerShelf` (4) na półkę | średnica |

Jednostka bez drzwi nie emituje żadnych zawiasów — drzwi są ostatnim krokiem
i nie zamawia się okuć do decyzji, której jeszcze nikt nie podjął.

BOM scala okucia między jednostkami po roli **I specyfikacji**, więc prowadnice
440 i 490 w jednym projekcie zostają dwiema pozycjami do kupienia zamiast zlać
się w jedną błędną. `hardwareDemand()` wycenia od sztuki, **bez współczynnika
yield** — nie zamawia się 15 % zapasu zawiasów na odpad. Rola bez przypisania
i tak raportuje ilość, po prostu nie ma ceny.

Store: `HARDWARE_ROLES` obok `BOM_ROLES`, dzielące istniejący
`materialAssignmentStore`. `MOCK_MATERIALS` dostaje 7 pozycji kategorii
`hardware` — kategorii, którą `cc_materials` już definiuje — więc prawdziwa
lista z bazy wchodzi bez zmian. **Mapowanie na Stock JC: nie teraz, `jc_uuid`
czeka nieużyte, zgodnie z poleceniem.**

BomPanel: zakładka Materials to teraz „Boards & fronts" i „Hardware". Lista
materiałów w dropdownie jest filtrowana kategorią — podawanie całej listy do
każdej roli to sposób, w jaki zawias ląduje przypisany do pleców. Stopka
rozbija koszt materiałów, koszt okuć i sumę. PDF dostaje tę samą sekcję.

**Cutting-list CSV celowo nietknięty**: format LISP, same formatki. Test
sprawdza, że każdy wiersz CSV nazywa realną formatkę (test na podciąg byłby
tu błędny — *formatka* RAIL-PART całkiem legalnie zawiera słowo „rail").

**Werdykt.** Zielone, zweryfikowane w Chromium: szafa z 2 szufladami, 2 półkami,
wieszakiem i drzwiami plus szafka dolna raportuje 6 zawiasów, 2 pary prowadnic
440, 8 nóg, 1 × 564 wieszak i 8 podpórek; przypisanie produktów wycenia to na
22.80 / 13.80 / 3.80 / 4.20 / 0.72 = 45.32, przypisanie przeżywa reload,
wyeksportowany CSV to dalej 7 kolumn samych formatek, PDF wychodzi bez błędu.

---

# DEFINICJA SUKCESU TURY 2 — status

1. **`npm test` zielony** — ✅ **158 pass / 0 fail** (77 dotychczasowych +
   13 dxf-parse + 8 cnc-layout + 34 clamp + 13 drawer-heights + 13 hardware).
   Podłoga 77 nie spadła ani razu.
2. **Widok CNC renderuje szafę z warstwami i legendą** — ✅ zweryfikowane
   w przeglądarce (Chromium, zrzuty w opisie PR).
3. **ZIP z DXF się pobiera; test parsujący własne pliki zielony** — ✅
   `W01-dxf.zip`, 23–25 plików zależnie od wyposażenia.
4. **Kolizje: nie da się nałożyć elementów dragiem** — ✅ zweryfikowane realnym
   prowadzeniem przeglądarki, tabela wyników wyżej.
5. **Wysokości szuflad edytowalne; defaulty odtwarzają fixtures co do bitu** — ✅
6. **Sekcja Hardware w BOM z przypisaniami działa** — ✅
7. **CI obecne i zielone na PR** — ✅
8. **BUILD-LOG sekcja TURA 2 + problemy w BLOCKERS** — ✅ ten wpis + BLOCKERS #8–#12.

**Przebieg end-to-end (Chromium, na koniec, po wszystkich zmianach): 13/13 PASS,
zero błędów w konsoli.** Pokój → szafa → 3 szuflady o różnych wysokościach →
2 półki → wieszak → drzwi → druga jednostka bez nakładki → widok CNC →
ZIP z DXF → BOM z okuciami → CSV → PDF → reload → wszystko na miejscu.

**Do decyzji Piotra rano:** BLOCKERS #8 (dialekt DXF — R12 zamiast literalnego
LWPOLYLINE, z uzasadnieniem), #9 (jedno przypisanie na rolę okuć vs per
długość), #10 (origin DXF), #11 (obrys TOP/BOTTOM przechodzi dolną krawędź
dwa razy — tak jest w LISP-ie, odtworzone wiernie), #12 (`shelfHoles.spanMode`
przy zmiennych szufladach). Plus wciąż otwarte #1–#6 z tury 1.

---

# TURA 3 — 06.08.2026 (autonomia, jedna sesja)

Baza wejściowa: **158/158**, CI zielone. Baza wyjściowa: **357/357**, CI zielone.
199 nowych testów, podłoga 158 nie spadła ani razu w żadnej fazie.

Rozkład: `types` 104, `collision` 34, `room` 21, `drawer-heights` 13,
`collision-resize` 20, `dxf` 13, `hardware` 13, `dimensions` 12, `dxf-sheet` 10,
`autoparts` 10, `design` 9, `bom` 8, `cnc-layout` 8, `interaction` 7,
`render-geometry` 6, `engine` 69.

## Faza 1 — pełna rodzina typów — ✅ ZIELONA

Sześć nowych typów z LISP-a: **BUDR**, **WUD**, **BUDTALL**, **LOW_CABINET**,
**SINK**, **FRIDGE**. Zgodnie z zasadą #1: **najpierw fixture wyprowadzony
z LISP-a linia po linii, potem silnik pod fixture.** Sześć nowych plików
`fixtures/golden-*.json`, każdy z `status: PENDING_PIOTR_VERIFICATION`
i sekcją `verify_with_piotr`.

**Nie skopiowałem logiki — skonfigurowałem typ.** `src/engine/types.js` opisuje
każdy kit różnicami wobec wspólnego rdzenia: `carcass.top` ('panel' | 'holders'),
`carcass.back` ('full' | 'inset' | 'rails'), `drawerStyle` ('wardrobe' | 'budr'),
`hingeRule`, `mount`, `legs`, `hangers`, `doorExtend`. Osiem typów, jeden
`computeCabinet()`. Gdyby to były osiem kopii korpusu, zmiana grubości płyty
byłaby ośmioma zmianami.

**Znalezione przy wyprowadzaniu fixtures (i poprawione W FIXTURE, nie w silniku):**

- **BUDR liczy 20 formatek BEZ frontów**, inaczej niż kit szafy, który fronty
  wlicza. Pierwsza wersja fixture miała `totals.fronts: 0` — to był mój błąd
  odczytu, nie zamiar LISP-a. Poprawione na 3 + notatka `lisp_panel_count`.
  W silniku odpowiada za to flaga `countsDrawerFrontsInPanels`.
- **SINK: dno ma czopy tylko na DWÓCH krawędziach**, mimo że komentarz nagłówkowy
  `drawSINK_BOTTOM` mówi co innego — komentarz jest nieaktualny względem kodu
  pod nim. Fixture opisuje kod, nie komentarz, plus `lisp_summary_quirks`
  o sprzeczności w oklejaniu holderów (→ BLOCKERS #13).

**Nogi.** `src/engine/legs.js`: 4 w rogach, piąta w geometrycznym środku
(środek szerokości I głębokości) powyżej 1000 mm. Wychodzi do `hardware[]`
jako ilość. Progi i szerokość nogi — w profilu, zero gołych liczb.

**Warning zamiast cichego zera.** `drawers` jako tablica, obiekt, `true` albo
NaN to teraz wpis w `warnings[]` (`DRAWERS_INVALID`), a nie zero szuflad
w milczeniu. Pusty string, `null`, `false` i `0` dalej znaczą „brak szuflad",
bo to legalne dane, a nie pomyłka (audyt tury 2, [LOW] — domknięty).

**Werdykt.** 104 testy `types.test.js`: każdy typ ma swój fixture, inwariant
`panels_true_incl_railpart + fronts === pieces_total` trzyma się dla wszystkich
ośmiu, nogi 4/5 sprawdzone na progu, warningi sprawdzone na siedmiu kształtach
złych danych.

## Faza 2 — 3D odzwierciedla silnik — ✅ ZIELONA

**BUG szerokiej szafy — znaleziony i naprawiony.** Silnik liczy odsunięcie
szuflad po OBU stronach (panele DP-L i DP-R, redukcja 96 mm przy 1200), 3D
rysowało dno szuflady dosunięte do lewej. Nie „render nie widział panelu" —
render brał `box.x` skrzynki zamiast wyśrodkować dno w jej świetle. Poprawione
w `cabinet.js` (to silnik podawał złe `box`), więc CNC i BOM też były zgodne,
tylko obrazek kłamał. Test `render-geometry.test.js` pilnuje, że każde dno
szuflady jest wyśrodkowane w swojej skrzynce.

**Nogi w 3D:** rysowane z `assemblies.legs.positions` — cztery, piąta powyżej
progu. Widok nie liczy nic sam, dostaje pozycje.

**WUD wisi.** `assemblies.mount === 'wall'` → baza kabiny to `mountHeight`,
nie wysokość nogi. Parametr `mount_height` w panelu prawym, plus kreska
zawieszki, żeby szafka nie czytała się jak lewitująca przez pomyłkę.

**Werdykt.** Zweryfikowane w Chromium: wszystkie 8 typów w jednym pokoju
(`phase2-all-types.png`), szeroka szafa z obustronnym odsunięciem
(`phase2-wide-*.png`).

## Faza 3 — pokój v2 — ✅ ZIELONA

**Pokój to lista ścian, nie „szerokość × głębokość".** `src/engine/room.js`:
narożniki → ściany, każda z `along`, `inward`, `angle`, `width`, `index`.
Prostokąt to 4 narożniki, L to 6. Orientacja jest normalizowana, więc normalna
do wnętrza zawsze wskazuje do środka — bez tego połowa ścian miałaby meble
po zewnętrznej stronie.

**4 ściany z auto-ukrywaniem.** `Room.jsx` liczy per klatkę
`(wall.inward · (camera − wallMid)) > 0` — ściana tyłem do kamery znika. Widok
znad pokoju sam z siebie staje się rzutem z góry, bez trybu „2D".

**L-shape + edytor rzutu.** `RoomModal` przerobiony: rysunek SVG rzutu z góry,
presety (prostokąt / L w czterech orientacjach), edycja długości każdej ściany,
wysokość.

**Import DXF — parser własny, zero zależności** (zasada #4). `dxfImport.js`
czyta pary grup, bierze wyłącznie sekcję ENTITIES, obsługuje LINE i LWPOLYLINE,
usuwa punkty współliniowe, łączy luźne linie w łańcuch. Wybiera zamkniętą
polilinię, a jak jej nie ma — największą otwartą, a jak i tego nie ma — łańcuch
z odcinków. Przelicznik mm / cm / m w UI, bo DXF nie niesie jednostki.

**Okna i drzwi** jako otwory w ścianie (`clampOpening` trzyma je w obrysie),
v1 wizualny — bez logiki kolizji z meblami, zgodnie z CLAUDE.md.

**Guard zmniejszania.** `roomChangeGuard()` blokuje zmianę, która wypchnęłaby
jednostki, komunikatem dokładnie takim, jak w zadaniu:
*„Cannot shrink the room below placed units — move or remove units first."*

**Werdykt.** 21 testów `room.test.js`. W Chromium: pokój L
(`phase3-L-room.png`), widok z góry z auto-ukrywaniem (`phase3-topdown.png`),
guard odmawia i mówi dlaczego (`phase3-guard.png`).

## Faza 4 — kolizje domknięte — ✅ ZIELONA

Nowe ścieżki, wszystkie przez te same czyste funkcje:

- **resize jednostki** — `clampUnitWidth`, `clampUnitDepth`. Poszerzanie to ruch
  jak każdy inny, tyle że rusza się druga krawędź.
- **narożnik** — `unitFootprint` + `spanInWallFrame`: jednostka z sąsiedniej
  ściany jest mierzona W UKŁADZIE TEJ ściany, więc problem 2D wraca do tego
  samego 1D clampa. Zero drugiego kompletu reguł do rozjechania.
- **głębokość vs pokój** — `maxDepthOnWall` strzela promieniem z obu końców
  jednostki i bierze pierwszą trafioną ścianę. Dokładne dla prostokąta i dla L.
- **obrót** — footprint obrócony wokół punktu styku ze ścianą, ten sam punkt,
  wokół którego obraca się bryła w 3D.

**Błąd, który złapały testy — mój, nie kodu.** Pierwsza wersja
`collision-resize.test.js` zakładała, że w narożniku L maksymalna głębokość to
600. Prawdziwa geometria daje 0 albo 800 zależnie od odcinka. Testy poprawione
do rzeczywistości, nie odwrotnie.

**Ścieżka, którą przegapiłem i którą złapał dopiero przebieg end-to-end na
koniec tury: DODANIE jednostki.** Przy pełnej ścianie `firstFreeUnitX()`
świadomie zwracał daleki koniec ściany i zostawiał `unitIssues()` z raportem
o nakładce — zachowanie z tury 1, opisane w komentarzu. Tyle że to jest
nakładka, którą **program tworzy sam**, więc kryterium „nie da się nałożyć
ŻADNĄ drogą" tego nie przepuszcza. Doszła `freeSlotOnWall()`: wolny slot albo
`null`. Nowa jednostka szuka miejsca na ścianie 1, potem obchodzi pokój, a gdy
nigdzie się nie mieści — **jest odmawiana** komunikatem, zamiast wylądować na
sąsiedzie. To samo dla przenoszenia jednostki na inną ścianę (`setUnitWall`
odmawia zamiast wepchnąć). `firstFreeUnitX()` zostaje nietknięty tam, gdzie
jego zachowanie jest zamierzone.

**Werdykt.** 20 testów `collision-resize.test.js` (13 + 7 na wolny slot,
w tym „wybrany slot nigdy nie nachodzi na to, co już stoi" dla ośmiu
szerokości) + 34 dotychczasowe `collision.test.js`.

## Faza 5 — interakcje — ✅ ZIELONA

- **Klik-i-trzymaj = przesuwanie, kamera stoi.** Każda bryła jednostki zatrzymuje
  event i wyłącza orbit na czas przeciągania; orbit rusza tylko ze ściany/tła.
- **Zoom do elementu.** `FocusRig` leci kamerą i celem orbita do klikniętego
  panelu, nie do środka sceny. Kierunek patrzenia zostaje, zmienia się dystans.
- **Obrót**: `+90°` per klik, pole na własny kąt, `Back to wall` / `Side to wall`.
- **Menu kontekstowe** (prawy klik): `Center shelves`, `Rotate 90°`, `Delete`.
  Akcje w `src/lib/contextActions.js` jako czysty JS — nowa pozycja menu to
  wpis w tablicy, a testy node mogą je zaimportować (nie da się z `.jsx`).
- **Animacja frontów**: szuflada wysuwa się, drzwi obracają się na zawiasie
  wg `meta.hinge`. Stan wyłącznie wizualny — `openFronts` żyje w uiStore i nie
  dotyka silnika, BOM-u ani CNC.

**Dwa realne błędy znalezione przez PATRZENIE na ekran, nie przez testy:**

1. **Znak obrotu.** 3D obracało jednostkę w drugą stronę niż footprint kolizji —
   obrócona szafka wchodziła ZA ścianę i znikała ze sceny, podczas gdy clamp
   uważał, że stoi w pokoju. Naprawione (`rotationRad = −kąt`) z komentarzem,
   bo to nie jest kosmetyka i następny czytelnik musi wiedzieć dlaczego.
2. **Fronty znikały.** Animacja ustawiała `position.z` ABSOLUTNIE, więc każdy
   front lądował na `z = 0`, czyli wewnątrz korpusu — szafka renderowała się
   jako otwarte pudło. Diagnoza: wstrzyknięty czerwony front + histogram pikseli
   z canvasu. Naprawione na OFFSET od pozycji z silnika.

**Werdykt.** 7 testów `interaction.test.js`, reszta zweryfikowana w Chromium
(`phase5-*.png`).

## Faza 6 — Design Settings — ✅ ZIELONA

`src/engine/design.js` + `DesignSettingsModal`:

- **Materiały carcass**: 1–3 typy, każdy z materiałem z listy.
- **Fronty**: typ standardowy (Shaker / Flat), miejsce na uchwyty zostawione.
- **Biblioteka drzwi użytkownika v1**: nazwa + typ frontu + materiał/kolor,
  CRUD w modalu, przypisywalne per jednostka.
- **Kolory**: RAL / F&B / własny HEX, dane 1:1 z `reference/colors/psw-colors.json`
  (grupy, nazwy, hexy). **Repo PSW nietknięte** — czytany tylko plik referencyjny.
- **Infill przy ścianie**: szerokość w mm, używana przez fazę 7.

Rozstrzyganie: `resolveUnitDesign(unit, design)` — override jednostki, potem
styl drzwi, potem domyślne projektu. Kolor widać na frontach w 3D.

**Błąd, który zabił aplikację i został naprawiony:** selektor
`useProjectStore((s) => migrateDesign(s.project.design))` tworzył NOWY obiekt
przy każdym wywołaniu → „Maximum update depth exceeded", biała strona.
Selektor wybiera teraz zapisaną wartość, migracja jest memoizowana.

**Werdykt.** 9 testów `design.test.js`, kolor sprawdzony na pikselach
(`phase6-blue-front.png`).

## Faza 7 — automaty konstrukcyjne — ✅ ZIELONA

`src/engine/autoparts.js`. Wszystkie trzy wychodzą jako PRAWDZIWE formatki
do BOM-u i CNC, nie jako rysunek:

- **Auto plinth** pod jednostkami stojącymi: wysokość = wysokość nogi z profilu
  (więc podniesienie nóg podnosi cokół), cofnięcie z profilu.
- **Auto side infill**: wypełnia lukę przy ścianie. Szerokość z Design Settings
  to MAKSIMUM skrobaka — szersza luka jest raportowana, a nie po cichu zamieniana
  na „formatkę" 200 mm szerokości, bo to już jest szafka.
- **Auto top infill 40 mm** przy wstawieniu; **grab = ciągnięcie w górę do
  sufitu, dwuklik = sam dojeżdża**. Formatka przelicza się z wysokością.

**Decyzja, którą podjąłem świadomie: automaty są OPT-IN w silniku.** Włączenie
cokołu domyślnie w `computeCabinet()` wysypało 77 testów — czyli WSZYSTKIE
golden fixtures naraz, bo cokół to formatka, której LISP nie zna. Gołe
`computeCabinet(params)` odtwarza kit z LISP-a i nic więcej; store dokłada
`plinth: true` przy wstawianiu jednostki do pokoju. Fixtures zostają kontraktem,
którym są, a Piotr dostaje cokół tam, gdzie faktycznie stoi mebel.

**Werdykt.** 10 testów `autoparts.test.js`, sprawdzone w BOM (`phase7-bom.png`)
i na dojeżdżaniu do sufitu (`phase7-ceiling2.png`).

## Faza 8 — toolbar + eksport grupowy CNC — ✅ ZIELONA

**Toolbar na kanwie**, bo tam jest rysunek: Show/Hide dimensions, przycisk
**BOM przeniesiony z górnej belki**, przełącznik 3D | CNC. Górna belka zostaje
przy tym, co dotyczy PROJEKTU: nazwa, konto, eksport.

**Strzałki odległości, live.** `src/engine/dimensions.js` mierzy każdą lukę na
ścianie: narożnik → pierwsza jednostka, jednostka → jednostka, ostatnia →
narożnik. Mierzone na TYM SAMYM footprincie, którego używa clamp kolizji, więc
jednostka obrócona bokiem jest mierzona po odcinku ściany, który naprawdę
zajmuje, a obrazek nie może kłócić się z regułą. Jednostki dolne i wiszące
mierzone osobno — szafka wisząca nad dolną to nie jest luka, którą ktokolwiek
wymierza. Wartości wynikają z pozycji jednostek, nie ze stanu przeciągania,
więc strzałka idzie za meblem klatka po klatce sama z siebie.

**Eksport grupowy.** Formatki w czterech grupach (Carcass / Shelves / Drawers /
Fronts & doors), każda z checkboxem, plus cztery presety: **All · Carcass only ·
All without drawers · Fronts & doors only**. Przynależność do grupy decyduje
się na `role` i `part` z silnika, NIGDY na podciągu z nazwy — formatka
`RAIL-PART` jest półką, a `D1-SL` częścią szuflady, i żadne dopasowanie napisu
nie trafi obu naraz.

**Podgląd renderuje ZAZNACZONE, a „Download DXF (one file)" puszcza ten sam
moduł layoutu po tej samej tablicy** — plik JEST obrazkiem, a nie jego drugim
policzeniem. Nazwa `{unitNum}-cnc-{preset|custom}.dxf`. **ZIP per formatka
zostaje** jako druga opcja — droga awaryjna przy uszkodzonej pojedynczej formatce.

Zaznaczenie jest WYPROWADZANE, nie synchronizowane: formatka nietknięta jest
w zestawie, odznaczona zostaje poza, a formatka, która pojawiła się po zmianie
parametru, wchodzi zaznaczona. Zero efektu ubocznego, więc nie ma klatki,
w której obrazek i checkboxy mówią co innego.

**Werdykt.** 12 testów `dimensions.test.js` + 10 `dxf-sheet.test.js` (w tym
„wyeksportowany layout JEST layoutem podglądu, formatka po formatce" i
„zawiera każdą zaznaczoną i nic poza"). W Chromium: presety na BUDR dają
25 / 7 / 10 / 3 formatek, jeden DXF na presecie fronts ma 3 POLYLINE, 6 CIRCLE,
3 TEXT; ZIP dalej działa. Przy okazji znaleziony i naprawiony realny błąd
layoutu: panel prawy zasłaniał panel eksportu (`z-20` + odsunięcie o szerokość
otwartego panelu).

---

# DEFINICJA SUKCESU TURY 3 — status

1. **`npm test` bez fail** — ✅ **357 pass / 0 fail** (158 starych + 199 nowych).
2. **6 nowych typów w Library, render + BOM + CNC + DXF dla każdego** — ✅
3. **Szeroka szafa: obustronne odsunięcie szuflad; nogi 4/5** — ✅
4. **Pokój: 4 ściany z auto-ukrywaniem, widok z góry, L-shape, import DXF,
   okno + drzwi, guard zmniejszania** — ✅
5. **Nie da się nałożyć jednostek żadną drogą** — ✅ drag, resize szerokości,
   resize głębokości, zmiana ściany, zmiana pokoju, obrót **i dodanie nowej
   jednostki** — wszystko przez te same czyste funkcje. Ostatnia z tych ścieżek
   została znaleziona dopiero w końcowym przebiegu end-to-end i domknięta
   (`freeSlotOnWall`, opis w fazie 4).
6. **Interakcje: move bez kamery, zoom do elementu, obrót, menu, animacje** — ✅
7. **Design Settings: materiały, fronty, biblioteka drzwi, kolory, infill** — ✅
8. **Automaty: plinth, side infill, top infill 40 z drag/dwuklikiem, w BOM** — ✅
9. **Toolbar + eksport grupowy: presety, jeden DXF == podgląd, ZIP zostaje** — ✅
10. **BUILD-LOG sekcja TURA 3 + BLOCKERS** — ✅ ten wpis + BLOCKERS #13–#16.

**Przebieg end-to-end (Chromium, na samym końcu, po wszystkich zmianach):
10/10 PASS, zero błędów w konsoli.** Siedem typów wstawionych z Library →
zero nakładek po auto-rozmieszczeniu (fridge sam poszedł na ścianę 2, bo
ściana 1 była pełna) → BOM otwiera się z toolbara na kanwie → każda jednostka
ma arkusz CNC (7 / 25 / 6 / 7 / 7 / 8 / 11 formatek) → guard odmawia skrócenia
ściany I obniżenia sufitu poniżej najwyższego mebla → L-kształt, który nikogo
nie wypycha, wchodzi i pokój ma sześć narożników → reload zachowuje wszystko →
wymiary domyślnie włączone.

**Zero nowych zależności** (zasada #4): parser DXF pomieszczenia napisany
ręcznie, kolory czytane z pliku referencyjnego, `jszip` bez zmian.
**Zero wykonanego SQL-a** (zasada #6): `sql/002_tura3.sql` czeka z nagłówkiem
„SQL PRZED push".

**Do decyzji Piotra:** BLOCKERS #13 (oklejanie holderów SINK — sprzeczność
w LISP-ie), #14 (cokół per jednostka vs per ciąg), #15 (`verify_with_piotr`
z sześciu nowych fixtures — TO JEST NAJPILNIEJSZE), #16 (import DXF: skala
i wybór obrysu). Plus wciąż otwarte #1–#6 z tury 1 i #8–#12 z tury 2.
