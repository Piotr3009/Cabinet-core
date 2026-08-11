# BUILD-LOG.md

Co powstało w każdej turze, dlaczego tak, i co to zmienia w aplikacji.
Jedna sekcja per tura, **chronologicznie — najstarsza na górze**, nowa dopisywana
na końcu. Problemy i decyzje bez odpowiedzi → `BLOCKERS.md`, rejestr zadań → `BACKLOG.md`.

> **Historia tur 1–4 odtworzona (tura 6).** Sekcje poniżej zniknęły z pliku przy
> incydencie gita między turą 4 a 5; wróciły z commita `dc075b5`. Treść jest dosłowna;
> zmienił się wyłącznie poziom nagłówków „DEFINICJA SUKCESU" (H1 → H2), żeby w pliku
> był jeden H1 na turę. Kolejność jest od tej pory chronologiczna, żeby dopisanie
> tury nie wymagało już przestawiania pliku.

---

# TURA 1 — noc 04.08.2026 (fazy 0–7)

Dziennik autonomicznej sesji Claude Code: fazy 0–7 wg ówczesnego `CLAUDE.md`.
Jeden wpis na fazę, każdy z **werdyktem**.

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

## DEFINICJA SUKCESU NOCY — status

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

## DEFINICJA SUKCESU TURY 2 — status

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

Baza wejściowa: **158/158**. Baza wyjściowa: **357/357** lokalnie
(`npm test` + `npm run build`, Node 22). 199 nowych testów, podłoga 158 nie
spadła ani razu w żadnej fazie.

**CI nie wystartowało — i to nie jest wina kodu.** Workflow `ci.yml` jest
`active` i wpięty w `pull_request → main`, ale GitHub Actions nie utworzył
żadnego przebiegu ani dla tego PR-a, ani wcześniej: ostatni bieg CI (Twój
własny push na main, `e79ddc5`, 17:43) stał w kolejce 15 minut i został
**anulowany bez przydzielenia runnera**. To sygnatura wyczerpanych minut /
limitu Actions na koncie, nie błędu w repo. Opisane w BLOCKERS #17 — do
sprawdzenia w ustawieniach billingu. Werdykty niżej opierają się na przebiegu
lokalnym i na realnym prowadzeniu przeglądarki, nie na zielonym znaczku.

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

## DEFINICJA SUKCESU TURY 3 — status

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
i wybór obrysu), #17 (Actions nie przydziela runnera — do sprawdzenia billing). Plus wciąż otwarte #1–#6 z tury 1 i #8–#12 z tury 2.

---

# TURA 4 — 06.08.2026 (autonomia, jedna sesja)

Baseline na wejściu: **357/357** (`npm ci` był konieczny — `node_modules` nie było
w kontenerze, bez tego 2 suity padały na brakujących `jspdf`/`zustand`; to nie był
regres w kodzie). Wszystkie liczby poniżej to `node --test`, nie „powinno działać".

## Faza 1 — bugi #1 #2 #3 — ✅ ZIELONA

**#1 Kolejność szuflad.** Sedno nie było w widoku, a w tym, że **żadna** z dwóch
istniejących kolejności nie była nigdzie zapisana. Silnik numeruje od dołu (D1 =
szuflada przy podłodze — tak liczy lista cięcia, rzędy prowadnic i wiercenia, i tak
mówią fixtures, więc to nie może się ruszyć). Człowiek czyta listę od góry i tak
samo pokazuje 3D. Nowy moduł `src/engine/items.js` jest tym jednym miejscem:

- `drawersInEngineOrder` / `shelvesInEngineOrder` — od dołu, dla silnika,
- `drawerRows` / `shelfRows` — od góry, dla panelu, **z zachowanym numerem
  silnika** na każdym wierszu.

Panel nie sortuje niczego — pyta. Stos trzech szuflad czyta się w panelu D3 / D2 /
D1 od góry, a D1 nadal jest dolną szufladą na liście cięcia, na arkuszu CNC i przy
pile. Alternatywa (przenumerować D1 na górę) była odrzucona świadomie: rozjechałaby
panel z `D1-SL`/`D1-DNO` w BOM i warsztat wyciąłby zły front.

Test `test/item-order.test.js` nie sprawdza „czy tablica jest odwrócona", tylko samą
tezę 1:1: wiersz *i* listy musi być elementem o *i*-tej największej wysokości
w wyjściu `computeCabinet` — dla szuflad zmiennej wysokości, dla BUDR-a (4:3:2,
gdzie najwyższy front jest na dole) i dla półek.

**#2 Pola liczbowe.** Przyczyna była dokładnie ta zdiagnozowana: kontrolowany
`<input type="number">` normalizował i clampował **w każdym `onChange`**, więc
wpisanie „250" w pole z minimum 100 szło 2 → 100 → „1002" → clamp. Wzorzec:
`src/lib/numberField.js` (czysta logika: parsuj, zaokrąglij, clampuj — **raz**,
przy zatwierdzeniu) + `src/components/NumberField.jsx` (bufor tekstowy, commit na
Enter/blur, Escape przywraca). Pole jest `type="text"` + `inputMode="decimal"`
celowo — `type="number"` dokłada drugą opinię przeglądarki o tym, co wolno wpisać,
i to była druga połowa buga.

Wymienione **wszystkie** pola liczbowe w aplikacji: prawy panel (W/H/D, obrót,
mount height, fridge height, wysokości szuflad, pozycje półek, hanger), pokój
(wysokość, długości ścian, okna/drzwi: x, szerokość, wysokość, parapet), Design
Settings (infill), BOM (yield — jedyne pole nie-całkowite, `integer={false}`),
Add items. Zero `type="number"` w `src/` po zmianie.

Test `test/number-field.test.js` odtwarza dokładnie tę sekwencję klawiszy, która
nie przechodziła, i pilnuje reguły „w trakcie pisania nie dzieje się nic".

**#3 Weryfikacja wizualna — ROZSTRZYGNIĘTE, dane i render zgodne.** Szafa 1200
z 2 szufladami internal w Chromium (`npm run dev`, zrzuty w opisie PR):

- panel: `D2` nad `D1`, edycja pierwszego wiersza zmienia **górną** szufladę
  (potwierdzone odczytem cache: `index:2 → 300`, `index:1 → 250`),
- 3D po wysunięciu obu frontów: skrzynki wcięte symetrycznie, panele DP stoją
  **przy bokach**, front wyśrodkowany na korpusie, zero „przekrzywienia".

Liczby są teraz przypięte testem (`test/render-geometry.test.js`, nowy przypadek):
2 drzwi → 2 panele DP → redukcja 96 → szerokość skrzynki 1058 i wcięcie
**18 + 30 + 18 + 5 = 71 mm na stronę**, `DP-L` 30 mm od lewego boku, `DP-R` 30 mm
od prawego, każda formatka spinająca skrzynkę wyśrodkowana. Pytanie „czy render
zgadza się z danymi" nie wróci już do zrzutu ekranu.

**Wynik fazy: 372 testy, 372 pass, 0 fail** (357 baseline + 15 nowych), build czysty,
zero błędów w konsoli przeglądarki.

## Faza 2 — wygląd 3D: neutralne materiały, cienkie czarne kontury, sheen — ✅ ZIELONA

**Materiały.** Domyślnie **złamana biel #F2F0EC**, opcja **jasny szary #E8E8E6**,
dekory **dark walnut** i **light oak**. Fronty domyślnie = korpus (to jest reguła
„jeden materiał w całości", zapisana w `resolveFinishes`, nie w widoku). Kolejność
rozstrzygania — od najbardziej szczegółowego: dekor typu materiału korpusu →
projekt → profil; dla frontów: styl drzwi → projekt → **korpus**. Kolor frontu
z Design Settings to FARBA i zakrywa dekor, dokładnie jak w warsztacie.

Dekor wybiera się **per materiał** (Carcass 1/2/3 i per styl drzwi), nie per szafka —
tak myśli warsztat („korpus 2 to ten orzechowy"). Nowy blok `profile.appearance`
trzyma wszystkie liczby: lista finiszy, kolor i grubość kontury, sheen, contour view,
odcienie ról, kolory okuć. Zero gołych liczb w `src/3d/`.

**Tekstury.** `scripts/gen-textures.mjs` generuje `public/textures/{dark-walnut,
light-oak}.png` — 512×512, kafelkowalne, deterministyczne (ten sam seed = te same
bajty). Zero nowych zależności: własny enkoder PNG na `node:zlib` (~40 linii,
IHDR/IDAT/IEND + CRC32) i seedowany szum wartościowy z owijaniem siatki. Nic nie jest
pobierane z internetu — grafika dekoru z sieci to czyjaś licencja w komercyjnej
aplikacji (to jest właśnie BACKLOG #19).

**Kontury.** Cienkie czarne `#1A1A1A`, `lineWidth 1`, `threshold 12` — zamiast
grubych brązowych. **Toggle „Outlines" w toolbarze, ON domyślnie**; w contour view
przycisk jest wyłączony i mówi dlaczego (kontury SĄ tam całym rysunkiem).

**Sheen ~20 %.** `meshPhysicalMaterial` z `clearcoat 0.2` nad matową płytą
(`roughness 0.55`) — delikatny nalot lakieru, nie plastik.

**Trzy pułapki kolejności ładowania tekstur** (znalezione w Chromium, wszystkie
opisane w kodzie, bo każda wygląda identycznie: biała płyta):
1. `useMemo` z **setterem** `useState` w tablicy zależności (setter nigdy się nie
   zmienia) — klon tekstury na zawsze trzymał placeholder loadera;
2. klon `Texture` startuje z `version = 0`, a three wysyła na GPU tylko teksturę
   `version > 0` — bez `needsUpdate` na klonie obraz siedział w pamięci, a płyta
   była biała;
3. materiał skompilowany BEZ mapy nie dorabia sobie mapy, kiedy dekor się doczyta —
   trzeba przebudować shader, czyli przemontować materiał (`key`). Bez tego dekor
   wybrany przy już narysowanej scenie pokazywał się dopiero po reloadzie.

Klony są cache'owane po (url, repeat), więc cały pokój orzecha to kilka uploadów,
nie jeden na formatkę.

**Werdykt.** Zweryfikowane w Chromium: trzy typy w jednym pokoju są neutralnie białe
z cienkim czarnym konturem; toggle Outlines gasi kontury i wraca; Design Settings →
korpus dark walnut + fronty light oak zmienia scenę **od razu**, bez reloadu; PNG
dekoru serwowany przez aplikację (145 kB). **381 testów, 0 fail** (9 nowych
w `test/appearance.test.js`: lista finiszy, cztery poziomy rozstrzygania, „fronty
dziedziczą korpus", fallback nieistniejącego id, round-trip zapisu, migracja profilu
sprzed dekorów). Build czysty, tekstury trafiają do `dist/`.

## Fazy 3 + 4 — ekran startowy, górne menu, Library w kategoriach — ✅ ZIELONE

**Uwaga o commicie.** Te dwie fazy to jedna zmiana konstrukcyjna: menu Library ▸
kategorie (faza 4) JEST elementem górnej belki (faza 3), a panel Library przestaje
być stałym meblem z Room setup / Design settings / Snap w środku, bo te przenoszą
się do menu Settings. Rozbicie na dwa commity znaczyłoby wstawienie kodu, który
drugi commit natychmiast usuwa. Zrobione jednym commitem, opisane tu i w BLOCKERS #18.

**Ekran startowy (styl AutoCAD).** Nazwa u góry po lewej, co MOŻESZ zrobić w kolumnie
po lewej (New project z nazwą i wymiarem pokoju, Open: All projects / Recent),
a praca — Recent projects / All projects — wypełnia stronę. Do kanwasu wchodzi się
**tylko przez projekt**, więc rysunek zawsze do czegoś należy.

Projekty muszą gdzieś BYĆ, a mock-mode nie ma bazy — więc `src/lib/projectLibrary.js`
to lokalna półka (localStorage) i ona karmi listę Recent. Supabase pozostaje prawdziwym
domem, gdy jest skonfigurowany: `mergeProjectLists` zszywa obie listy po id (wiersz
z chmury wygrywa — to ten, który przeżyje tę przeglądarkę) i każdy wiersz mówi, skąd
jest (`local` / `cloud`). Nowy projekt dostaje pokój **od razu z formularza**, żeby
pierwsza szafka wpadła w przestrzeń, na którą jest wyceniana, a nie w domyślne 4 × 3.

**Recent = ostatnio OTWARTE**, nie ostatnio zapisane — dwa różne znaczniki
(`opened_at` / `updated_at`), bo inaczej „ostatnie" to lista tego, co się zapisało
w tle. Limit 5. Uszkodzona półka (nie-JSON, obcięty JSON, `projects: "nope"`) czyta
się jako pusta i **nadal da się zapisywać** — crash przy starcie jest nieodwracalny
dla użytkownika, pusta lista nie.

**Górne menu.** Jedna belka, jeden styl (te same przyciski co Account/Export):
**File** (New / Open / Save / Save as… / Export ▸ CSV · PDF · Unit DXF ZIP · BOM /
Close project) · **View** (Outlines, Dimensions, 3D | CNC sheet, Contour view) ·
**Library ▸ kategorie** · **Settings** (Design settings…, Room setup…, Snap ▸) ·
**Database** i **Clients** — obecne, wyłączone, z tagiem „soon". Menu jest DANYMI
(`{ label, items: [...] }`), więc „Print" w przyszłości to jeden wpis, a nie nowy
komponent; obsługa klawiatury, hover po otwartej belce, podmenu i zamykanie już są.
Save/Save as żyją w `src/lib/persist.js`: półka zawsze, baza gdy skonfigurowana,
a odmowa bazy nie unieważnia zapisu — mówi, gdzie plik jednak jest.

**Library w kategoriach.** Menu ▸ **Base units** (BUD, BUDR, SINK, LOW) ·
**Wall units** (WUD) · **Tall units** (BUDTALL, FRIDGE, WARDROBE) · **Saved sets**
(soon) · **Media walls** (soon). Klik kategorii → JEDEN pływający panel (grab&move
zostaje) **przefiltrowany do tej kategorii**, z **przyciskiem X** i Escape. Bez
kategorii w środku jednej listy.

**Bug znaleziony przy tym w Chromium:** X w nagłówku panelu nic nie robił. Nagłówek
jest uchwytem do przeciągania i wołał `setPointerCapture`, co przekierowywało zdarzenie
`click` na nagłówek — przycisk nigdy nie dostawał kliknięcia. Naciśnięcie na KONTROLKĘ
w nagłówku nie jest chwytem (`if (e.target.closest('button')) return`). Dokładnie ten
sam mechanizm sprawiał, że panel z tury 3 był niezamykalny.

**Werdykt (Chromium, 20/20 PASS).** Aplikacja otwiera się na ekranie startowym
(zero `<canvas>` przed projektem) → New project 4200 × 3200 wchodzi do edytora
z tym pokojem → wszystkie sześć menu na miejscu, Database/Clients wyłączone →
Library ▸ Base units pokazuje **dokładnie** cztery typy (bez Wardrobe) → X zamyka,
Escape zamyka → dwie jednostki wstawione z kategorii → File ▸ Save → File ▸ Close
project wraca na start → projekt jest w Recent z „2 units" i po kliknięciu otwiera
się z jednostkami. **392 testy, 0 fail** (11 nowych: 8 × półka projektów, 3 ×
kategorie — w tym „każdy typ w dokładnie jednej kategorii", które łapie zapomniany
nowy kit).

## Faza 5 — prawy panel UX — ✅ ZIELONA

**Wszystko zwija się w sekcje** (`Section.jsx`): Carcass · Add items · Section 1 ·
Doors. Zamknięta sekcja **nie jest renderowana** — żadnych ukrytych inputów
trzymających focus, żadnego mierzenia wysokości, żadnej animacji do zepsucia. Stan
rozwinięcia siedzi w uiStore, więc pamięta się między jednostkami. Jedno się NIE
zwija: błędy i ostrzeżenia. Ostrzeżenie za zamkniętą sekcją to ostrzeżenie, którego
nikt nie czyta.

**Add items = lista typów, ustawienia inline.** Drawers · Shelves · Hanger rail ·
Pull-down rail (disabled „soon"). Klik typu rozwija JEGO ustawienia w tym samym
panelu. `AddItemsModal.jsx` **usunięty** — zero osobnych modali, jak w CLAUDE.md.
Czego kit nie obsługuje, jest pokazane wyszarzone z powodem („already fitted",
„this kit IS its three drawers"), a nie ukryte.

**Equal heights ✓ domyślnie** (BACKLOG #11): jedno pole na cały stos. Odznaczenie →
pole per szuflada, listowane **od góry** (D3 / D2 / D1). Ponowne zaznaczenie MUSI coś
znaczyć — bierze wysokość **dolnej** szuflady (tej, od której zaczyna oko) i rozciąga
na stos. `setAllDrawerHeights` to jedno wywołanie, jeden clamp i jedno przeliczenie
półek, a nie pętla po `setDrawerHeight`.

**Auto-porządek** (BACKLOG #12), reguły w `engine/items.js`, wykonanie w store:
- **półki od góry** — pierwsza na górze pasma, każda następna o `itemStackPitch`
  niżej, nigdy bliżej niż `minShelfGap`, a gdy pełny skok już nie wchodzi — w
  najciaśniejsze legalne miejsce. Brak miejsca → **odmowa z liczbą** („room for 2
  of 5"), nie ciche wrzucenie na tę samą pozycję.
- **szuflady od dołu** — silnik i tak stackuje od podłogi; półki nad nimi
  przeliczają się przez istniejący clamp.
- **hanger pomiędzy** — tak wysoko, jak pozwoli najniższa półka i jego własny
  partycjoner, nad przegrodą szuflad.

**Szuflady internal → drzwi się otwierają** (BACKLOG #13): po dodaniu szuflad panel
czyta z wyniku silnika id formatek `FRONT` i woła `openFrontsFor` — istniejący
mechanizm animacji frontów, zero nowego kodu w 3D. Widać to na zrzucie
`f5-doors-open.png`: drzwi odchylone, w środku stos szuflad, drążek i dwie półki.

**Hanger z listy materiałów** (BACKLOG #14): select z kategorii `hardware`
(istniejący store materiałów) + pozycja **„— Connect JoineryCore for live stock
(soon) —"** jako disabled hint. Wybrany produkt jedzie **z itemem** (`material_id`,
`material_label`) → `paramsForEngine` → linia `rail` w `hardware[]` z nazwą pozycji:
`564 mm · Oval hanging rail 30 × 15`. Ilość nadal pochodzi z geometrii, więc brak
wybranego produktu daje linię z samą długością — zamówienie czeka na decyzję,
policzenie nie.

**Werdykt (Chromium, 20/20 PASS).** Sekcje zwijają się i pamiętają stan → lista typów
z „soon" na pull-down → 3 × 220 mm dodane inline (zero modali w DOM) → Equal heights
zaznaczone domyślnie, jedno pole ustawia cały stos na 180 → odznaczenie daje D3/D2/D1
od góry → dwie półki wchodzą na 2092 i 1742 (od góry, bez kolizji) → drążek z listy
hardware trafia do BOM jako „Oval hanging rail 30 × 15" → dodanie szuflad przy
założonych drzwiach otwiera drzwi. **399 testów, 0 fail** (7 nowych w
`test/panel-items.test.js` — reguły są w store, więc testują się w node: auto-porządek
z odmową, equal heights z clampem, „ponowne zaznaczenie bierze dolną szufladę",
drążek między szufladami a półkami, produkt w BOM).

## Faza 6 — infill/plinth, end panel, widok konturowy — ✅ ZIELONA

Trzy rzeczy, które turą 3 były jednym workiem „automaty", a nie są tym samym
rodzajem rzeczy. Podział jest w `engine/autoparts.js`, w komentarzu na górze pliku:

**#15 Side infill — AUTOMATYCZNY, bo opisuje fakt.** Jednostka **nie dojeżdża
do ściany**: `clampUnitX` dostał `wallMargin` = szerokość infilla z Design
Settings, a magnes zamienia stop w **lądowanie** — w promieniu `unitMagnet` unit
siada dokładnie na stopie, więc szczelina to DOKŁADNIE 20 mm, a nie 19,4. Dlatego
formatka, która ją zamyka, jest dokładnie tą formatką. Dojazd → infill jest;
odjazd → nie ma. Ten sam stop obowiązuje przy **wstawianiu** i przy **zmianie
szerokości** (rośnięcie to ruch dalszej krawędzi), więc nie da się wejść w ścianę
żadną drogą.

Zniknęło ostrzeżenie z tury 3 („szczelina szersza niż ustawienie"): przy stopie
jednostka NORMALNIE stoi z dala od ściany, więc ten komunikat leciałby bez przerwy.
Co zostało: ostrzeżenie o **limicie warsztatu** — ustawienie 250 mm nie jest
skrobanką (profil kończy na 120), unit staje 250 mm od ściany i żadna formatka
tam nie dosięga. To jest ustawienie do zmiany, więc się o tym mówi.

**#16 Plinth i top infill — RĘCZNE, bo są decyzją.** `autoPartsFor` już ich nie
wymyśla — tylko przenosi (i przycina top infill do sufitu, gdy sufit spadnie).
Nowa jednostka nie ma ani cokołu, ani infilla: **zero wierszy w liście cięcia,
których nikt nie zamówił**. Dodawanie z sekcji Construction w panelu i z menu
kontekstowego. Uchwyt do przeciągania top infilla renderuje się tylko, gdy
formatka ISTNIEJE — uchwyt do czegoś, czego nie dodano, to uchwyt do niczego.
Drag do sufitu i dwuklik zostają bez zmian.

**#17 End panel.** Formatka po ZEWNĘTRZNEJ stronie boku: `END-L`/`END-R`, rola
`end_panel` (własna pozycja w BOM_ROLES — zwykle z materiału frontowego, nie
z płyty korpusowej), głębokość = głębokość jednostki, wysokość **to floor**
(mija nogi, u wiszącej schodzi od wysokości zawieszenia) albo **unit height**,
grubość domyślnie = grubość frontów. Idzie do BOM, CSV, arkusza CNC i DXF-a tą
samą drogą co każda inna formatka.

**Kolizje są respektowane w obie strony:**
- panel jest **częścią footprintu** (`endPanelPads` + `unitSpan`), więc sąsiada
  nie da się wsunąć w miejsce, które panel zajmuje — clamp go zatrzymuje na
  panelu, nie na korpusie;
- panel, który **się nie mieści**, jest **odmawiany z liczbą i winowajcą**
  („only 0 mm free before 02"). Dodanie go i tak byłoby nakładką, którą aplikacja
  zrobiła sama — dokładnie to, co domknęła faza 4 tury 3. Przy ścianie wolne jest
  tyle, ile infill (20 mm), więc 25 mm panel tam nie wejdzie: tę szczelinę już
  zamyka skrobanka.

**„Apply to all end panels" ✓** zapisuje ustawienia do PROJEKTU
(`design.endPanel`), więc kolejny panel gdziekolwiek dziedziczy wysokość
i grubość; edycja istniejącego przy zaznaczonym checkboxie też aktualizuje
domyślne — to jest jedyny sposób, w jaki „wszystkie tak samo" coś znaczy.
Opcje siedzą **w sekcji panelu**, nie w modalu — menu kontekstowe dodaje panel
i **otwiera tę sekcję**.

**#18 Contour view** (View ▸ Contour view): materiał gaśnie do 6 % krycia
(`depthWrite` off), kontury zostają — do renderu i druku ekranem. Wymiary są
schowane, bo przeszkadzałyby w jedynej rzeczy, po którą się ten tryb włącza.
Przełącznik „Outlines" jest w tym trybie **wyłączony i mówi dlaczego** (kontury
SĄ tam rysunkiem). Zero wpływu na BOM — to sposób PATRZENIA na ten sam projekt.

**Werdykt (Chromium, 17/17 PASS).** Nowa jednostka bez cokołu i bez infilla →
oba dodane z panelu (badge „PLINTH · TOP") → prawy klik daje „Add end panel",
panel wchodzi z domyślnymi projektu i otwiera się sekcja z opcjami → zmiana na
unit height → drugi unit: „+ Left" **odmówione** („only 0 mm free"), „+ Right"
dziedziczy `unit/25` → END-R, END-L, PLINTH i INFILL-T są w liście cięcia →
przeciągnięcie w ścianę zatrzymuje się na 20 mm i tworzy skrobankę, odjazd ją
usuwa → contour view rysuje same kontury. **410 testów, 0 fail** (11 nowych
w `test/construction.test.js`; 3 zaktualizowane w `autoparts`/`interaction`, bo
zachowanie zmieniło się celowo).

## Faza 7 — zamknięcie — ✅ ZIELONA

**`npm test`: 410 pass / 0 fail.** 357 z tury 3 (podłoga, nietknięta) + 53 nowe:

| plik | co pilnuje |
|---|---|
| `test/item-order.test.js` (8) | dwie kolejności elementów; wiersz *i* listy = *i*-ty od góry w wyjściu silnika; auto-porządek |
| `test/number-field.test.js` (6) | bufor pola: ta sekwencja klawiszy, która nie przechodziła; clamp raz, przy commicie |
| `test/appearance.test.js` (9) | lista finiszy; cztery poziomy rozstrzygania; „fronty dziedziczą korpus"; migracja profilu sprzed dekorów |
| `test/project-library.test.js` (8) | półka projektów; Recent = ostatnio OTWARTE; uszkodzona półka; scalanie z bazą |
| `test/library-categories.test.js` (3) | każdy typ w dokładnie jednej kategorii (łapie zapomniany nowy kit) |
| `test/panel-items.test.js` (7) | auto-porządek z odmową; equal heights; drążek między szufladami a półkami; produkt w BOM |
| `test/construction.test.js` (11) | stop przy ścianie + magnes; ręczny cokół/top infill; end panel w BOM/CNC/footprincie; odmowa gdy się nie mieści |
| `test/render-geometry.test.js` (+1) | szafa 1200: wcięcie 71 mm/str., DP przy bokach, front wyśrodkowany |

Trzy istniejące testy **zmienione świadomie**, bo zachowanie się zmieniło:
`autoparts` × 2 (ostrzeżenie o szerokiej szczelinie → cisza przy stopie; automaty →
przenoszone) i `interaction` × 1 (menu kontekstowe ma teraz pozycje konstrukcyjne).
Nic nie zostało usunięte ani wyciszone.

**`npm run build`: czysty.** Tekstury trafiają do `dist/textures/`.

**Przebieg end-to-end w Chromium — 26/26 PASS, zero błędów w konsoli.**
Cała ścieżka z CLAUDE.md, w jednym przejściu na koniec, po wszystkich zmianach:

1. start screen (zero `<canvas>` przed projektem) → 2. New project 3600 × 3000
z własnym pokojem → 3. trzy jednostki z trzech kategorii Library → 4. szuflady,
półki i drążek (z listy hardware) dodane **inline**, zero modali → 5. cokół,
top infill i end panel — każde **bo ktoś o nie poprosił** → 6. przeciągnięcie
w ścianę: stop 20 mm i skrobanka pojawia się sama → 7. BOM zawiera PLINTH,
INFILL-T, INFILL-L, END-R, PARTITION, SHELF-1 oraz rolę „End panels" i linię
„Oval hanging rail" → 8. **trzy eksporty pobrane**: `cabinetcore-cutlist-*.csv`,
`cabinetcore-project-*.pdf`, `DR01-dxf.zip` → 9. arkusz CNC rysuje →
10. contour view → 11. orzech + dąb → 12. Save → Close → projekt w Recent
z „3 units" → otwarty z powrotem **z end panelem i top infillem**.

Zrzuty: `f7-01-three-units`, `f7-02-items`, `f7-03-construction`,
`f7-04-at-the-wall`, `f7-05-bom`, `f7-06-cnc`, `f7-07-contour`, `f7-08-decors`,
`f7-09-reopened` (+ zrzuty per faza: `f1-*`, `f2-*`, `f3-*`, `f5-*`, `f6-*`) —
w opisie PR.

**Trzy bugi znalezione przez ten przebieg, nie przez testy** (i to jest argument
za trzymaniem przebiegu w przeglądarce):
1. **X panelu Library nic nie robił** — nagłówek jest uchwytem do przeciągania
   i `setPointerCapture` przekierowywał `click` na nagłówek. To ten sam mechanizm,
   który sprawiał, że panel z tury 3 był niezamykalny.
2. **Dekor pokazywał się dopiero po reloadzie** — trzy pułapki kolejności
   ładowania tekstur (opisane w fazie 2).
3. **Podmenu File ▸ Export zamykało się od kliknięcia** — hover je otwierał,
   a klik przełączał, czyli zamykał to, na co użytkownik właśnie celuje. Klik
   w rodzica podmenu **otwiera**, nigdy nie przełącza.

**BACKLOG.md**: pozycje **1–18 → TURA-4 / DONE**, każda z jednolinijkową notą, co
konkretnie to zamknęło. Pozycja 19+ nietknięta; dopisana jedna nowa (19b: eksport
konturów do pliku, wynikła z #18). **README** zaktualizowany: ekran startowy, menu,
kategorie Library, panel z sekcjami, equal heights, automatyczne vs ręczne,
contour view, `scripts/gen-textures.mjs`, liczba testów.

**Zero nowych zależności** (zasada #4): `package.json` nietknięty. Tekstury drewna
generowane własnym enkoderem PNG na `node:zlib`; sterownik przebiegu end-to-end
(playwright-core) żyje **poza repo**, w katalogu roboczym sesji — projekt go nie
widzi i nie potrzebuje.
**Zero wykonanego SQL-a** (zasada #6). **Fixtures nietknięte** (zasada #1) —
tylko czytane.

---

## DEFINICJA SUKCESU TURY 4 — status

1. **357 starych + nowe testy — 0 fail** — ✅ **410/410**. Nowe testy dokładnie
   tam, gdzie CLAUDE.md kazał: kolejność szuflad, bufor pól, clamp infilla, end panel.
2. **Bugi #1 #2 naprawione; #3 rozstrzygnięte screenshotem** — ✅ #1 przez jedną
   zapisaną konwencję (nie przez łatkę w widoku), #2 przez wzorzec użyty we
   wszystkich polach, #3 zrzutem **i** przypiętymi liczbami, żeby nie wróciło.
3. **Meble neutralne + orzech/dąb, kontury czarne cienkie z toggle, sheen subtelny** — ✅
4. **Start screen + górne menu działają; Library w kategoriach z X** — ✅
5. **Panel: accordion, equal heights, auto-porządek, drzwi otwierają się po szufladach,
   hanger z materiałów** — ✅
6. **Infill auto przy ścianie; plinth/top manual; end panel w BOM; contour view** — ✅
7. **BUILD-LOG TURA 4 + BACKLOG statusy + BLOCKERS bez pytań do użytkownika** — ✅
   BLOCKERS #18–#21 to decyzje i obserwacje, nie pytania: żadna nie czeka na
   odpowiedź, żeby tura była skończona.

**Fazy NIEROZPOCZĘTE: brak.** Wszystkie siedem wykonanych, każda z commitem
i pushem, każda z werdyktem powyżej.

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

---

# TURA 6 — Output, render, infille w L, end panel v2, zaznaczenie, sonda rysunków

**Gałąź:** `claude/faza-6-claude-md-nfxmji` · **Tryb:** pełna autonomia, zero pytań
**Wynik:** `npm test` **536/536** (471 z tur 1–5 + 65 nowych, 0 fail), `npm run build` czysty,
przebieg end-to-end w Chromium **23/23** bez jednego błędu w konsoli.

Pozycje BACKLOG zamknięte lub przesunięte: **#20 (infille) DONE**, **#37 render core DONE**,
**#39 sonda rysunków DONE**, **#17 end panel v2**. Nowe: **#39**, **#40** (plinth w L).

---

## Naprawa na start — cztery tury, które ten plik zgubił

`BUILD-LOG.md` niósł tury 1–4 do incydentu gita między turą 4 a 5. Wróciły z commita
`dc075b5`, dosłownie; jedyna zmiana to poziom nagłówków „DEFINICJA SUKCESU", żeby w pliku
był jeden H1 na turę. Kolejność jest od teraz chronologiczna — dopisanie tury to
dopisanie, nie przestawianie pliku.

---

## F1 — Output ▾ [HIGH]

Wszystko, co **wychodzi z aplikacji**, w jednym menu, w kolejności, w jakiej warsztat
się z tym spotyka: obraz dla klienta → rysunek na robotę → pliki dla maszyn.

Trzy eksporty pod spodem to te same trzy funkcje, które wołało `File ▸ Export`.
Przeniesione, nie przepisane — i stare miejsce **zniknęło**, zamiast zostać cichą drugą
drogą do tego samego pliku. `File` znów jest o projekcie.

Menu jest czystym builderem (`lib/outputMenu.js`), nie JSX-em, bo rzecz warta sprawdzenia
przy PRZENOSINACH to „czy nic nie zostało po staremu" — a to potrafi sprawdzić test w node.
`test/output-menu.test.js` czyta `TopBar.jsx` i pilnuje, że nazwy eksportów padają
dokładnie raz.

---

## F2 — RENDER [CRITICAL, danie główne]

Powód biznesowy z BACKLOG #37, dosłownie: nasz klient to warsztat, a warsztat pokazuje ten
obraz **swojemu** klientowi. Obraz ma sprzedawać, nie tylko informować.

Co składa się na realizm, w kolejności wagi:

**Każda krawędź jest przełamana.** Cięta płyta ma 0,5–1 mm fazy z piły i okleiniarki;
światło się na niej łapie i rysuje cienką jasną linię wzdłuż każdej krawędzi w pokoju.
Jej brak to większość tego, co czyta się jako „render z komputera". BACKLOG #37 wprost
zakazuje robienia tego geometrią — siatka gęsta na tyle, żeby unieść 0,8 mm na każdej
formatce kuchni, kosztowałaby całą płynność. Więc **na normalnych, w shaderze**, liczone
z własnych połówkowych wymiarów pudełka; `customProgramCacheKey` sprawia, że pokój z 400
formatkami kompiluje ten shader **raz**.

**Melamina to nie lakier.** Tura 4 dawała wszystkiemu jeden sheen 20 %. Płyta melaminowana
to matowa folia z szerokim, miękkim refleksem; front lakierowany dwuskładnikowo to kolor
pod cienkim filmem lakieru, z refleksem wąskim, w którym widać okno. To, do której rodziny
należy formatka, mówi **silnikowa flaga `finish_exposed`** — te elementy, które jadą do
lakierni (BACKLOG #35) — a nie lista identyfikatorów w widoku.

**Mebel stoi na podłodze.** Jeden miękki quad pod jednostką, w jej własnej grupie, więc
kręci się i jeździ razem z szafką i nie kosztuje nic na klatkę. Mapa cieni ląduje **obok**
szafki, nigdy pod nią — dlatego szafka bez tego lewituje.

**Pokój do odbicia.** `RoomEnvironment` przez PMREM przy 64 px: w paczce `three`, bez
pobierania, bez pliku `.hdr` — CLAUDE.md zakazuje jednego i drugiego.

**Kadrowanie po ROGACH, nie po kuli.** Kula to łatwa odpowiedź i zła: ciąg szafek ma
1,8 × 0,9 × 0,6 m, więc jego kula jest dwa razy wyższa niż mebel i szafki lądują w środkowej
jednej trzeciej pustej podłogi. Rogi kadrują to, co naprawdę jest. Stabilność przy obrocie
— powód, dla którego kula kusi — zostaje tam, gdzie ma znaczenie: „3/4 lewo" i „3/4 prawo"
to lustra, a pudełko jest symetryczne, więc oba wychodzą z tej samej odległości.

### Wydajność widoku roboczego — zmierzona, nie obiecana

SwiftShader (kontener bez GPU), 8 szafek z drzwiami, przebiegi A/B przeplatane:

| konfiguracja | fps |
|---|---|
| tura 5 | **5,6** |
| tura 6, wszystko włączone | **3,4** |
| tura 6, View ▸ Realistic lighting **OFF** | **5,9** |

Cała różnica to sonda IBL. Fazy, cienie kontaktowe i miękkie cienie są **darmowe** — z
wyłączoną sondą scena jest **szybsza niż tura 5**, bo ściany i podłoga przeszły na
`meshLambertMaterial` i wypadły ze ścieżki IBL (`scene.environment` dociera wyłącznie do
`MeshStandardMaterial`, a ściany to matowa biała farba i wyglądają identycznie).
Przełącznik jest w View; **render zawsze zapala oświetlenie z powrotem**.

### Co znalazła przeglądarka (a nie znalazłyby testy)

- **Pierwszy render 4K przyszedł z siatką narysowaną po meblu.** Kontur drei rysuje jako
  grubą linię, czyli `LineSegments2`, czyli **Mesh** — sprawdzenie „to nie jest linia"
  przepuściło go w całości.
- **Render kadrowany na szafce przy ścianie wrócił jako szary prostokąt na cały ekran** —
  tył tej ściany. Auto-chowanie ścian liczy się co klatkę dla kamery EDYTORA, a render
  patrzy kamerą własną. Test jest teraz jedną funkcją, którą render woła dla swojej kamery.
- **Ściany wyszły szare, kiedy render przyciszył ambient.** Mebel jest oświetlony światłami
  **i** sondą, ściana samymi światłami — więc kontrast w kadrze bierze się z **podniesienia
  klucza**, nie z przygaszenia ambientu. To jedna linia w profilu i test, który tego pilnuje.

---

## F3 — End panel v2 [HIGH]

Trzy zmiany, wszystkie takie, jakie powiedziałby stolarz.

**Jest tak głęboki, jak drzwi wystają.** Tura 4 dawała mu głębokość korpusu, czyli zostawiała
go za licem drzwi o odsadzenie plus grubość frontu — próg wzdłuż boku wykończonego ciągu,
dokładnie to, czemu ten element ma zapobiegać. Liczba to korpus + 3 + grubość frontu, i jest
przepisana, nie wymyślona: LISP rysuje drzwi w rzucie z góry na `y0 − doorGap − gruboscDrzwi`
(`KIT_BUD_FULL` L128). Test porównuje z **boxem drzwi**, nie z arytmetyką, więc te dwie rzeczy
nie mogą się rozjechać.

**Jest z materiału FRONTÓW.** Panel stojący w pokoju obok drzwi jest lakierowany z drzwiami,
z ich arkusza. Do tej pory ciąg z dwoma end panelami zamawiał płytę korpusową, której nikt
nie miał zużyć.

**Górna krawędź jest sterowaniem.** Klik podświetla, grab ciągnie, dwuklik wysyła do sufitu —
ten sam gest, który top infill ma od tury 3, bo to ta sama czynność. Wysokość jest per panel;
„apply to all" jej nie niesie, bo linia dobrana na oko pod jednym sufitem nie jest domyślną
wartością projektu.

---

## F4 — Infille w L [CRITICAL]

BACKLOG #20 wisi od tury 4 z dopiskiem „na razie proste (decyzja Piotra)". To jest realizacja.

**Pionowy filler to L.** Ramię B zamyka szczelinę w płaszczyźnie drzwi — tej samej, w której
kończą end panel i czoło top infilla, więc trzy elementy wykańczające ciąg stoją na jednej
linii zamiast na trzech. Ramię A jest przykręcone do boku korpusu i idzie 60 mm w głąb.
Do **podłogi**, bo filler kończący się na dnie korpusu zostawia szczelinę obok cokołu.
Szczelina węższa niż 24 mm zostaje prostym paskiem i mówi o tym: 18 mm ramienia nie wejdzie
w 12 mm szczeliny, a udawanie inaczej to formatka, której nie da się zrobić.

**Top infill to JEDEN element na cały ciąg.** Kuchnia 3,6 m zamknięta sześcioma 600-mi
odpadkami ma pięć styków na najbardziej widocznej linii w pokoju, wszystkie na wysokości
oczu i żaden tam, gdzie jest styk szafek. Jedna długość nie ma ani jednego. W przekroju:
czoło 40 + półka 80, mitra 45°, sklejone w L.

Tej geometrii nie może wyliczyć `computeCabinet`, który widzi zawsze jedną szafkę — więc
liczy ją **`engine/runs.js`** z pokoju i zapisuje na pierwszej jednostce ciągu jako parametr.
`computeCabinet` buduje ją potem jak każdą inną formatkę, czyli trafia do BOM, na arkusz CNC
i do DXF **istniejącymi drogami**. Nie ma drugiej listy cięcia „na te długie".

Ciąg pęka na: innej ścianie, innym poziomie, obróconej jednostce, **innej wysokości blatu**
(jedna deska nie leży na dwóch poziomach) i na luce.

**Cztery zakończenia** — to nie warianty jednego, to cztery różne roboty stolarskie:

| koniec | co robi |
|---|---|
| **ściana** | kończy się na niej |
| **pionowy L-infill** | przechodzi nad fillerem i wychodzi na ścianę — linia, którą prowadzi oko, jest nieprzerwana do narożnika pokoju |
| **end panel do sufitu** | wchodzi w jego LICO wewnętrzne; przejście po jego wierzchu dałoby styk tam, gdzie patrzy oko |
| **otwarty** | mitra 45° w planie i **skręt za narożnik**: element idzie dalej wzdłuż boku skrajnej szafki do ściany tylnej. Rama obrazu. |

Przebieg w przeglądarce pokazuje to na żywo: ciąg 3 × 600 daje **jedną** formatkę 1800 mm
z powrotami po obu otwartych końcach, a end panel wyciągnięty do sufitu **kasuje** powrót
po swojej stronie.

Oba infille są z materiału frontów, razem z end panelem, z tego samego powodu.

---

## F5 — Zaznaczenie [MEDIUM]

Tura 4 zaznaczała szafkę przemalowując jej **własne** krawędzie na złoto aplikacji. Dwie
rzeczy były z tym nie tak i to jest ta sama rzecz dwa razy: złoto to kolor MEBLA (klamka,
rama z brązu), więc zaznaczona szafka czytała się jako szafka z czegoś innego; a rysowanie
własnego obrysu robiło z zaznaczenia cechę obiektu zamiast znaku na nim.

Zamiast tego to, co rysuje każdy CAD: cienka **przerywana** ramka w granacie biura
projektowego — tym samym atramentem, którym ta aplikacja mierzy, bo pomiar i zaznaczenie to
oba przypadki narzędzia mówiącego zamiast roboty — odsunięta 10 mm od bryły, po bounding
boxie, nie po geometrii. Przerywana, bo żaden mebel nie ma przerywanej krawędzi. Bez testu
głębokości i rysowana na końcu, bo zaznaczenie, którego trzeba szukać obracając scenę, nie
jest zaznaczeniem.

Ramka obejmuje **bryłę** z boxów silnika: drzwi wystają przed korpus, a end panel stoi obok
niego, więc znak narysowany na korpusie przecinałby oba.

Hover to ten sam znak przy jednej trzeciej krycia, opóźniony o klatkę — R3F wysyła
`pointerout` na opuszczanej formatce **przed** `pointerover` na wchodzonej, więc bez tego
przesunięcie kursora przez szafkę migocze raz na formatkę.

`outlineFor()` nie przyjmuje już flagi `selected` w ogóle, a test podaje jej stary argument,
żeby udowodnić, że nie ma dokąd nim trafić.

---

## F7 — Sonda rysunków [HIGH]

**Sonda stylu**, i CLAUDE.md mówi to wprost: jakość kreski przed liczbą widoków, żeby tura 7
miała skalibrowany wygląd, na którym zbuduje resztę kompletu.

Co sprawia, że czyta się to jak rysunek Piotra, a nie jak kilka prostokątów:

- **Warstwy widokowe LISP-a, razem z indeksami** (`createViewLayers`). Magentowe drzwi,
  zielone półki, szare linie otwierania. Dwie są przetłumaczone, nie przepisane, i powód jest
  zapisany: indeks ACI to kolor na **czarnym** ekranie, a ACI 3 na białym papierze to jasne nic.
- **Przekątne z `drawDoorSwingLines`** — dwie linie ze środka strony ZAWIASÓW do dalekich
  narożników, więc zbieg siedzi na zawiasach. Front szuflady nie dostaje żadnych, bo szuflada
  się nie otwiera na zawiasach.
- **Ramka shakera na LISP-owych 50 mm** i J-groove na jego 30.
- **Wszystko za frontem linią przerywaną**, a KTÓRE to elementy — decyduje geometria, nie
  lista nazw: formatka należy do skorupy korpusu, kiedy dochodzi do jednego z czterech boków.
  Lista byłaby krótsza i byłaby zła — panel szufladowy i jego wypełniacze mają rolę `side`
  dokładnie tak jak boki korpusu, i pierwsza wersja narysowała je jako czarne belki w poprzek
  szafy.
- **Ramka rysunku i tabelka.** „To ona robi jak z AutoCADa" — i robi.
- **Skala standardowa**: 1:5, 1:10, 1:20 — nigdy 1:13,7, bo z 1:13,7 nikt nie zmierzy.
  Największa, która się mieści, wygrywa, a tabelka mówi która.
- **Papier obraca się sam**, kiedy tak wychodzi większy rysunek. Szafa na leżącym A3 wychodzi
  1:20 z połową arkusza pustą; na stojącym — 1:10 i wypełnia go. Biuro projektowe obraca
  papier bez pytania.
- **Wymiary architektoniczne z T5**, wartości przez `formatMm`, więc 596,5 dociera na papier
  jako 596,5.

Geometria to **własne boxy silnika** rzutowane na XY — rzut z przodu JEST rzutem xy. LISP
wyprowadza każdy prostokąt drugi raz w kodzie rysującym; tutaj rysunek nie może się nie
zgadzać z listą cięcia co do położenia półki, a test przechodzi po każdej formatce, żeby
to udowodnić.

Całość jest czysta (`src/engine/drawings/`), więc SVG jest parsowany i sprawdzany w node;
jsPDF zostaje w `src/lib/`, gdzie silnik go nie widzi.

---

## F6 — Zamknięcie

### Przebieg E2E w Chromium — 23/23

Sterownik jest teraz **w repo** (`scripts/cdp.mjs`, `scripts/e2e-turn6.mjs`) — to odpowiedź
na BLOCKERS #27, wersja „kod w repo" zamiast „Playwright w devDependencies". Node 22,
wbudowany `WebSocket` + CDP, **zero nowych zależności**.

| sprawdzone | wynik |
|---|---|
| kanwa 3D żyje | ✅ |
| trzy szafki z drzwiami, półką i top infillem | `01 · 13 szt · 02 · 7 · 03 · 7` ✅ |
| fronty na dekor EGGER-owy | `dark_walnut` ✅ |
| Output ▸ Render otwiera ustawienia | ✅ |
| render to prawdziwy PNG | **1266 kB** ✅ |
| 1080p = 1920 na dłuższym boku, w proporcji widoku | `1920 × 1142` ✅ |
| nazwa pliku | `untitled-project-scene-2026-08-07.png` ✅ |
| 4K = 3840 na dłuższym boku | `3840 × 2286` ✅ |
| kanwa oddana w swoim rozmiarze | `1600 × 952` ✅ |
| rzut frontowy się rysuje | 8681 znaków SVG, **1:10** ✅ |
| przekątne otwierania z LISP-a | 2 linie ✅ |
| co za drzwiami — linia przerywana | ✅ |
| warstwy widokowe LISP na rysunku | `CARCASE SHELVES DOORS DOOR_SWING LEG_BLOCK UNIT_NUMBER DIMENSIONS` ✅ |
| ramka + tabelka + skala | ✅ |
| eksport rysunku SVG i PDF | ✅ |
| **ciąg niesie JEDEN top infill** | `INFILL-T-FACE 1800` (nie 3 × 600) ✅ |
| L ma półkę, otwarty koniec skręca za narożnik | `INFILL-TL-*` + `INFILL-TR-*`, po 586 mm ✅ |
| end panel do sufitu = podłoga-sufit jedną formatką | `586 × 2500` ✅ |
| …i ciąg kończy na nim, bez skrętu | ✅ |
| trzy eksporty z Output | `csv`, `pdf`, `zip` ✅ |
| błędy w konsoli | **zero** ✅ |

Zrzuty: `docs/turn6/01`…`07`, plus surowe wyjścia — `render-1080p-image.png`,
`render-4k-image.png`, `drawing-front-elevation.svg/.png`.

### Liczby tury

| | |
|---|---|
| testy | **536/536** (471 baseline + 65 nowych, 0 fail) |
| nowe pliki testowe | `output-menu`, `render`, `end-panel`, `run-infill`, `drawings` |
| build | czysty |
| nowe zależności | **zero** |
| SQL uruchomiony | **żaden** |
| fixtures | nietknięte |

**Testy z tur 1–5, które musiały się zmienić** — bo tura 6 zmienia to, co opisywały,
nie dlatego, że przeszkadzały:

- `construction.test.js` — filler idzie do podłogi (`h = wysokość + nóżki`), a szeroka
  szczelina daje L: czoło + ramię. End panel jest głębszy o `doorGap + front_t`.
- `autoparts.test.js` — `INFILL-T` to teraz `INFILL-T-FACE` + `INFILL-T-SHELF`,
  `INFILL-L` to `INFILL-L-FACE` (+ `-ARM`, gdy szczelina to unosi).
- `finish-exposed.test.js` — te same identyfikatory, po rozdzieleniu na paski L.
- `appearance.test.js` — zaznaczenie jest granatowe i przerywane; złota nie ma na żadnym meblu.
- `imports.test.js` — strzępi teraz literały szablonowe (zostawiając `${…}`), bo faza krawędzi
  niesie GLSL w backtickach, a GLSL ma wbudowany `clamp`, tak samo jak `engine/format.js`.
  Sprawdzone, że nadal łapie bug z tury 5: po usunięciu importu z `Room.jsx` test czerwienieje.

---

# TURA 7 — karta produkcyjna, New Project flow, X-ray z okuciami, płytki puzzle, insety

**Gałąź:** `claude/claude-md-phase-7-7br1q7` · **Tryb:** pełna autonomia, zero pytań
**Wynik:** `npm test` **616/616** (536 podłogi z tury 6 + 80 nowych, 0 fail),
`npm run build` czysty, przebieg end-to-end w Chromium **16/16** bez błędu w konsoli.

Pozycje BACKLOG zamknięte: **#39 (rysunki — karta) DONE**, **#41 (New Project flow) DONE
w części lokalnej**, **#42 (X-ray + okucia) DONE**, **#28 (płytki puzzle) DONE**,
**#32 (insety) DONE**. Nowe: **#46**–**#49**.

---

## F1 — DRAWINGS v1: karta produkcyjna per szafka [CRITICAL]

Tura 6 narysowała JEDEN widok jako sondę stylu — właśnie po to, żeby ta tura mogła
złożyć komplet, nie ustalając od nowa, jak wygląda rysunek. Komplet to trzy widoki
na jednym arkuszu: **FRONT**, **CARCASS (no fronts)**, **TOP**.

**Geometria zostaje silnika.** Plan to rzut XZ tych samych `box`, z których pisana jest
lista cięcia, w konwencji AutoLISP-a: `y = głębokość − z − d`, czyli front szafki na
DOLE arkusza, dokładnie tam, gdzie `KIT_BUD_FULL` rysuje drzwi na `(- y0 doorGap
gruboscDrzwi)`. Skutek jest taki, że luz 3 mm między korpusem a frontem widoczny na
rzucie to `profile.doors.gap`, a nie liczba, którą wymyślił rysunek. Test to przypina.

**Co mierzy karta.** CLAUDE.md mówi „liczby, które warsztat mierzy taśmą — nie każda
śruba", i to jest cała lista:

| widok | co niesie |
|---|---|
| FRONT | gabaryt W, wysokość z nóżkami, cokół i korpus OSOBNO, wysokość każdej szuflady |
| CARCASS | pozycje półek **od dna**, partition, rzędy prowadnic, wysokość korpusu |
| TOP | głębokość, szerokość, głębokość **z frontem** (to ona decyduje, gdzie ciąg kończy przy ścianie) |

Półki są mierzone **od dna, każda na swoim biegu**, a nie łańcuchem — łańcuch zbiera
błąd każdego stopnia nad sobą, a wiertarz mierzy od spodu. Szuflady odwrotnie:
łańcuchem, bo wysokość frontu to liczba, którą warsztat DODAJE.

**Numer szuflady jest na szufladzie, nie w wymiarze.** „D1 197" to sześć znaków tam,
gdzie linia wymiarowa ma 197 mm — i te dwie rzeczy są w tej samej proporcji przy KAŻDEJ
skali, więc etykieta nigdy się nie mieści. W środku własnego frontu mieści się zawsze.
Ta sama rodzina problemu, ogólnie: liczba za duża na swoją linię wymiarową jest pisana
OBOK niej, nie w poprzek jej strzałek.

**Zawias w rzucie.** AutoLISP niesie obrys prawdziwego zawiasu Bluma — siedemdziesiąt
linii i trzydzieści łuków, dwa razy, raz odbite. To, co ten blok MÓWI, to: puszka
wywiercona we froncie, korpus stojący za nią, ramię sięgające do płytki na boku. Karta
rysuje to, w wymiarach katalogowych z `profile.hardware.hinge`, jedną funkcją zamiast
dwóch odbitych kopii — strona to znak, nie drugi rysunek.

**Papier i układ wybiera karta.** Nie A4 na sztywno: budowane są dwa układy (rzut pod
elewacją — poprawny rzut trzeciego kąta — oraz trzy widoki w rzędzie) na dwóch
arkuszach, i wygrywa ten, w którym szafka wychodzi **większa**. Remis układów bierze
rzut (bo darmowy jest poprawny), remis arkuszy bierze A4 (bo warsztat woli mniejszy).
Szafka dolna wychodzi **A3 pionowo, 1:10** tam, gdzie pierwsza wersja dawała 1:20.

Jedna liczba kupiła cały ten stopień skali: wysokość tekstu karty to **60 mm rysunkowych**
zamiast 90. Trzy widoki i sześć biegów wymiarów dzielą jeden arkusz, a każdy milimetr
wysokości tekstu kosztuje około dwóch milimetrów odstępu biegów po czterech stronach
KAŻDEGO widoku. 60 to 3 mm na papierze przy 1:20 — czyli tyle, ile biuro projektowe
i tak stawia.

**Wyjścia.** Output ▸ Drawings: `Unit card (PDF)`, `Unit card (SVG)`,
`All units (PDF)` (okładka + strona na jednostkę) i `Preview…`. Wpis, który mówi
„(PDF)", **zapisuje PDF** — podgląd ma własny wpis i tylko on otwiera okno. Turę 6
zamknęły dwa miejsca trzymane otwarte („Top view", „Front (carcass only)"); tura 7 ich
nie zamienia na dwa nowe wpisy, bo trzy widoki to JEDNA karta, a trzy osobne eksporty
tej samej szafki to trzy rzeczy do trzymania w zgodzie.

**Dwie przeprowadzki, obie z powodu.** Prymitywy rysunkowe poszły do
`drawings/primitives.js` pod nazwy, których nic w aplikacji nie nosi (`entLine`,
`entRect`, `entText`, `entCircle`): eksportowanie `text` i `line` z modułu silnika robi
z tych słów pułapki dla `test/imports.test.js` w CAŁEJ aplikacji — i checker miał rację,
nazwa tak ogólna nie ma czego szukać w eksportach. Drugie: `solid` na encji nadpisuje
kreskowanie warstwy, i to jest to, co pozwala półce zostać zieloną i PRZESTAĆ być linią
przerywaną, kiedy drzwi są zdjęte.

---

## F2 — NEW PROJECT FLOW (#41) [HIGH]

Pięć kroków, i cały ich sens jest taki, że wszystkie pięć jest już odpowiedzianych:
numer zaproponowany, nazwa i klient opcjonalne, typ to kuchnia, zakres idzie za typem,
ustawienia to albo te projektu, albo zapisany set. Przeklik na defaultach: ~10 sekund.

**Numer projektu liczy w formacie WARSZTATU, nie narzuca swojego.** Ostatni ciąg cyfr
w najwyższym numerze na półce, plus jeden, z zerami i wszystkim dookoła: „K-118" →
„K-119", „2026/09" → „2026/10", „0009" → „0010". Numer, którego nie da się sparsować,
jest pomijany, nie poprawiany — i nie wywraca serii.

**SETY USTAWIEŃ to nowy zapisywany byt** (`lib/settingsSets.js` + `settingsSetsStore`).
Warsztat nie wybiera materiałów, złącza i wysokości od nowa na każdą robotę — ma dwa
albo trzy sposoby, w jakie buduje. Set to **CAŁY** obiekt `design` pod nazwą, celowo,
nie podzbiór: set z materiałami bez wysokości aplikowałby się po cichu w połowie, a
pierwsze miejsce, gdzie ktoś by to zauważył, to lista cięcia. Nałożenie setu przynosi
sposób budowania i zostawia robocie jej tożsamość: „Standard kitchen" na vanity daje
materiały i złącze, nie zamienia roboty w kuchnię.

**Typ projektu decyduje o trzech rzeczach i wszystkie są punktem startu**: kategoria
Library, podpowiedź zakresu, wysokości. **Kuchnia nie nadpisuje niczego** — wysokości
profilu SĄ kuchnią, a nadpisanie ich tutaj to dwa źródła jednej liczby. Nadpisania mają
szafa (tall 2400) i vanity (base 700), obie w `profile.projectTypes` i obie wypisane
w BLOCKERS do potwierdzenia przez Piotra.

**Krok „pokój" to ISTNIEJĄCY edytor pokoju.** `RoomModal` dostał `onClose`/`onApplied`
i jest pokazywany w miejscu — CLAUDE.md mówi „istniejący modal", a to jest jedyny
sposób, żeby te dwa nie zaczęły się rozjeżdżać.

**Joinery type z podglądem WYPROWADZONYM.** Jeden tab, jego dogbone i gniazdo, w które
wchodzi — narysowane z `profile.puzzle`, tych samych liczb, z których cięte są pliki
CNC. Rysunek odręczny to obrazek złącza, które ktoś zapamiętał; ten zmienia się razem
z profilem, i tylko tak podgląd zostaje prawdziwy.

**Połowa JoineryCore, która jest lokalna.** Badge „JC" jest **funkcją danych**
materiału (`jc_uuid` albo `source: 'jc'`), nie flagą, którą ktoś ustawia — wczytanie
prawdziwego stocku zapali badge na każdym kafelku bez zmiany czegokolwiek innego. Slot
bez materiału zamienia sekcję w „Not assigned materials" z przyciskiem, który to
naprawia. Samo połączenie (API + token) zostaje na później, zgodnie z zakresem.

**Ekran startowy**: wymiary pokoju zniknęły (pokój ustawia się w edytorze pokoju, a nie
mimochodem), a wiersz projektu czyta się tak, jak warsztat mówi o robocie:
**numer · nazwa · data**.

---

## F3 — X-RAY + OKUCIA 3D (#42) [HIGH]

Płyta schodzi do 20 %, kontury zostają — przy tej przezroczystości TO ONE są szafką —
a fronty zostają na 42 %, bo front to twarz szafki i wygaszony tak jak boki zostawia
jednostkę bez twarzy.

Okucia proceduralnie, co do milimetra. Zero plików, nic ściąganego: **rozmiary** to
`profile.hardware` (nowy blok — KATALOG, w odróżnieniu od `appearance.hardware`, które
jest kolorami), **pozycje** to `engine/hardware3d.js`, który czyta je z tego samego
wiercenia, z którego powstają pliki CNC. Zawias jest narysowany tam, gdzie maszyna
wywierci pod niego; prowadnica tam, gdzie siedzi skrzynka, która na niej jedzie; rail
w średnicy z profilu zamiast dosłownego `15`, które nosił widok.

**Kontraktem jest LICZBA.** `hardwareInstances()` musi dać dokładnie to, co
`result.hardware` każe zamówić, i `test/hardware-3d.test.js` pyta o to dwa razy — raz
obrazu, raz listy zakupów — dla każdej złotej szafki. Rysunek z dwoma zawiasami na
drzwiach, pod które lista kupuje trzy, jest gorszy niż brak rysunku, bo ktoś w niego
uwierzy.

Co się kiedy pokazuje: **zawiasy i prowadnice TYLKO w X-ray**, żeby widok roboczy został
czysty. Nóżki jak dotąd zawsze — i są teraz talerzem, trzpieniem i stopką zamiast
prostopadłościanu.

### Wydajność — zmierzone, nie obiecane

InstancedMesh na wszystkim powtarzalnym: pięć wywołań rysowania na jednostkę niezależnie
od liczby okuć. Chromium na rasteryzatorze programowym kontenera (SwiftShader — brak
GPU, patrz BLOCKERS #31), 10 szafek dolnych z drzwiami, przebiegi PRZEPLATANE po 5 s:

| tryb | fps (średnia z 3) |
|---|---|
| normalny | **2,87** |
| X-ray | **2,83** |

Tryb nie kosztuje nic mierzalnego. Liczba bezwzględna to rasteryzator; pierwsze pomiary
tej tury dawały 0,7 fps, dopóki nie okazało się, że kontener niesie czterdzieści
osieroconych procesów Chromium z wcześniejszych przebiegów — po ich zabiciu liczby są
powtarzalne i stabilne.

---

## F4 — PUZZLE: pojedynczy socket przy płytkich (#28) [MEDIUM]

Każdy kit w `reference/lisp/` ma 558 albo 578 mm głębokości, więc dwa sockety po 95 od
końców boku mają między sobą 350 mm i nikt nie musiał o tym myśleć. Przy szafce 250 mm
głębokiej ta sama reguła przepuszcza dwa pockety — a przed nimi ich otwory ⌀7,5
w ±24,5 — przez siebie nawzajem. To nie jest słabsze złącze, to dziura przez środek
formatki.

Poniżej `profile.puzzle.singleSocketBelow` jest **JEDEN socket na środku**. Próg jest
wyprowadzony, a wyliczenie stoi obok liczby:

```
  190    dwa środki socketów, tabCentresFromEnd od każdego końca
+ 56.5   rozmiar jednego socketu w poprzek biegu — liczą się OTWORY, nie pocket:
         ±(24.5 + 3.75) jest szersze niż ±25.5, a próg liczony z samego pocketu
         zostawiłby zachodzące na siebie wiercenia przy ledwo rozjeżdżających się
         pocketach
+ 18     minimalny mostek: jedna grubość płyty materiału
= 264.5
```

Wszystko poniżej idzie z samej `socketCentres()`: sockety boku, taby blatu po drugiej
stronie złącza, dogbones, dwa otwory na socket, a przez nie DXF i podgląd CNC. Sockety
poprzeczne pleców liczą się teraz tą samą funkcją po szerokości wewnętrznej, zamiast być
wypisane drugi raz — i to jest to, co daje WĄSKIEJ szafce jeden socket tam i jeden tab
na blacie, zamiast taba bez gniazda.

**LISP TEGO PRZYPADKU NIE ZNAŁ**, i testy tak mówią. To ta sama podstawa, na której
stoją zmienne wysokości szuflad (tura 2, zadanie 4): tam, gdzie kity milczą, silnik
decyduje, próg bierze się z geometrii, a test **przelicza go** — warsztat, który
poszerzy socket i zapomni ruszyć stałą, dostaje czerwony test zamiast kolizji.

Żadna złota fixture się nie ruszyła: najpłytszy kit w repo daje bok 382 mm szeroki.

---

## F5 — INSETS jednostki (#32) [MEDIUM]

`Inset left / right / back` w milimetrach, w sekcji Construction panelu jednostki
i otwierane z menu kontekstowego. Stolarz prosi o taki odstęp, kiedy w drodze stoi coś,
co nie jest meblem: rura w narożniku, krzywa ściana, wspornik grzejnika. Sens jest
w tym, że to **nie jest błąd do posprzątania** — więc clamp kolizji traktuje inset tak
jak sąsiada: slot kurczy się dokładnie o inset, ruch tam staje i tam zostaje, choćby
kursor jechał dalej.

Robi to jedna funkcja. `footprintPads()` dokłada inset obok end panelu i wszystko, co
już pytało „gdzie ta jednostka się mieści" — stawianie, przesuwanie, poszerzanie,
narożnik, strażnik pokoju — respektuje insety, nie wiedząc, czym są. Dodają się celowo:
panel jest przykręcony do korpusu, a odstęp jest na zewnątrz panelu.

Back inset odsuwa jednostkę od ściany w **jednym** miejscu: `unitFootprint()` zaczyna
prostokąt na `v = backInset` zamiast na 0. Stąd clamp głębokości traci tyle miejsca
i mówi, co je zabrało; jednostka za narożnikiem jest mierzona na odcinku ściany, na
którym naprawdę stoi; kanwa 3D przesuwa grupę wzdłuż wektora `inward` ściany.

**Strzałki mierzą korpus-do-korpusu** i tak zostaje: dwie jednostki dosunięte tak
blisko, jak pozwala 40 mm insetu, pokazują 40 — realny dystans, nie zmniejszony slot,
w którym pracuje clamp. To dwa różne pytania i tura 7 zostawia je dwoma pytaniami.

### Co znalazła przeglądarka

Test w node przechodził, przebieg E2E nie: inset był zapisany, **szczelina się nie
otwierała**. Przyczyna jest w tym, jak `freeBesideUnit` decydowała, po której stronie
jest przeszkoda. Dwie szafki dosunięte na 2300, prawa dostaje 40 mm insetu z lewej —
jej wypełniony span zaczyna się teraz na 2260, czyli WEWNĄTRZ sąsiada, więc szukanie
„które przeszkody kończą się przed początkiem mojego spanu" nie znajduje żadnej,
spada na ścianę i melduje 2260 mm wolnego obok jednostki, która w czymś stoi.

Poprawka to jedna linia i jest w niej cała zasada: **którą stroną jest przeszkoda,
decyduje KORPUS; jak daleko jest — wypełniony span.** Do tego `setUnitInsets` musi
szczelinę ZROBIĆ, bo clamp pozycji celowo odmawia rozwiązywania istniejących nakładek
(nie teleportuje jednostki) — więc jednostka wychodzi z tego, w czym stoi, o dokładnie
tyle, o ile w tym stoi, zwykłym ruchem, i mówi, co ją zatrzymało. Regresja przypięta
w `test/insets.test.js`.

---

## F6 — Zamknięcie

### Przebieg E2E w Chromium — 16/16

`scripts/e2e-turn7.mjs`, na tym samym sterowniku CDP co tura 6 (`scripts/cdp.mjs`),
node 22, **zero nowych zależności**.

| sprawdzone | wynik |
|---|---|
| flow otwiera się z zaproponowanym numerem projektu | `0001` ✅ |
| osiem typów projektu | 8 ✅ |
| vanity podpowiada ONE WALL (przykład z CLAUDE.md) | ✅ |
| podgląd złącza rysuje samo złącze | ✅ |
| ustawienia zapisane jako nazwany set i podane z powrotem | `Contract spec` ✅ |
| kanwa 3D żyje | ✅ |
| …i otwiera się na kategorii Library, o którą prosił typ | `BASE UNITS` ✅ |
| jednostka przychodzi na wysokości VANITY, nie kuchni | **700 mm** ✅ |
| 40 mm insetu otwiera 40 mm szczeliny, którą clamp trzyma | `inset 40, gap 40` ✅ |
| X-ray rysuje się bez wywracania kanwy | ✅ |
| karta na ekranie z trzema widokami | `FRONT / CARCASS (no fronts) / TOP` ✅ |
| przekątne otwierania na karcie | 2 ✅ |
| zawias na rzucie | 3 elementy ✅ |
| karta jest wymiarowana | 54 encje DIMENSIONS ✅ |
| karta jako SVG i PDF, booklet jako jeden dokument | 3 pliki ✅ |
| błędy w konsoli | **zero** ✅ |

Zrzuty: `docs/turn7/01`…`10`.

### Liczby tury

| | |
|---|---|
| testy | **616/616** (536 podłogi + 80 nowych, 0 fail) |
| nowe pliki testowe | `unit-card`, `new-project`, `hardware-3d`, `single-socket`, `insets` |
| build | czysty |
| nowe zależności | **zero** |
| SQL uruchomiony | **żaden** |
| fixtures | nietknięte |

**Testy z wcześniejszych tur, które musiały się zmienić** — bo tura 7 zmienia to, co
opisywały, nie dlatego, że przeszkadzały:

- `output-menu.test.js` — Drawings nie trzyma już dwóch miejsc „soon"; cały podmenu
  jest żywy, a test pilnuje, że jedyny wpis kończący się na „…" to podgląd (wpis, który
  mówi „(PDF)", ma zapisać PDF).
- `interaction.test.js` — menu kontekstowe niesie `insets`, który OTWIERA sekcję
  zamiast wozić trzy pola milimetrowe w prawym kliknięciu.

**Jedna linia zgodności, żeby test mógł policzyć strony.** `jspdf` jest CJS-em: interop
Vite oddaje konstruktor jako default, interop node'a oddaje obiekt modułu i `new` na nim
rzuca. `lib/drawingExport.js` bierze `jsPDFDefault?.jsPDF || jsPDFDefault` — i dzięki
temu „booklet naprawdę ma n stron, każda w rozmiarze, który wybrała karta" sprawdza test
w node, a nie tylko przeglądarka. Sam eksport rozdzielony na `bookletDoc()` (buduje) i
`exportBookletPdf()` (zapisuje), bo `doc.save()` sięga po system plików albo po
przeglądarkę, a żadne z nich nie należy do testu, którego pytaniem jest liczba stron.

---

# TURA 8 — ŚWIATŁO, RENDER v2 I SIEDEM BŁĘDÓW Z TESTÓW PIOTRA

Podłoga wyjściowa: `npm test` na main po merge T7 — **601/602**, z jedyną czerwoną
suitą `test/decors.test.js`. To jest oczekiwane i zapisane w CLAUDE.md: main niesie
już CELOWO nowy układ dekorów (`public/decors/egger/`), a ten test pilnuje starej
płaskiej ścieżki z T5. F1 przepina loader i ten test na nowy układ.

## F0 — DŁUG Z TURY 7: trzeci tab na niskim korpusie

BLOCKERS #37 kończy się słowami „**Nie zrobiłem tego**". To jedyna pozycja z listy
niedokończonych tury 7, która jest KODEM — reszta to albo maszyna (kontrolny DXF
w VCarve, #36), albo baza (SQL, unikalność numeru, sety — #38/#39/#43), albo rzecz
świadomie odłożona (#40/#42). Więc to jest to, co tura 8 robi najpierw.

**Problem.** `tabCentres()` daje trzy taby po tylnej krawędzi boku: 95, H/2, H−95.
Tab to ±25, ale **dogbone wokół niego to ±30** i to on sięga dalej. Przy niskim
korpusie środkowy dogbone wchodzi w skrajny. `LOW_CABINET.minHeight` to 300 mm,
więc przypadek jest osiągalny z UI — przy 300 mm skrajny relief kończy się na 125,
a środkowy zaczyna na 120. Nakładają się.

**Rozwiązanie — to samo, co tura 7 zrobiła socketom, po drugiej osi.** Poniżej progu
środkowy tab nie jest cięty i panel ma dwa. Próg jest WYPROWADZONY z geometrii:

```
  190    dwa skrajne środki, tabCentresFromEnd (95) od każdego końca
+ 120    footprint skrajnego i środkowego tabu, po obu stronach:
         2 × 2 × max(tabHalfWidth 25, dogboneHalfHeight 30)
+  36    mostek — jedna grubość płyty po KAŻDEJ stronie środkowego tabu;
         tu są dwie szczeliny do utrzymania, nie jedna
= 346    profile.puzzle.middleTabBelow
```

Różnica wobec `singleSocketBelow` (264,5) jest właśnie w tym ostatnim wierszu i jest
prawdziwa: socket ma jedną szczelinę do utrzymania, środkowy tab ma dwie.

**Konsekwencja, której nie widać z progu.** `backPanelGeometry()` liczyło rzędy śrub
przez `const [t1y, t2y, t3y] = sideCentres` — z dwoma tabami `t3y` jest `undefined`
i cały rząd wychodzi jako `NaN`. Rzędy liczą się teraz z reguły, a nie z liczby:
„jedna śruba od każdego końca, i po jednej MIĘDZY każdą parą sąsiednich tabów".
Przy trzech tabach to są cztery rzędy LISP-a, przy dwóch — trzy, we właściwych
miejscach.

Nic poniżej nie zostało pouczone osobno: taby boku, ich dogbony, sockety pleców
i rzędy śrub biorą się z tej jednej funkcji, więc DXF i podgląd CNC idą za nią same.

`test/low-tabs.test.js` — 8 testów, próg **przeliczany na każdym przebiegu** (jak
w `single-socket.test.js`), plus dowód, że poniżej progu stare taby naprawdę by się
zderzyły, plus regresja „normalny korpus ma dalej trzy taby i cztery rzędy śrub".

## F1 — RENDER v2 + OŚWIETLENIE

Diagnoza Piotra brzmiała: „wszystko przezroczyste, brak cienia, brak głębi, białe zlewa
się". Cztery zdania, cztery różne przyczyny — i żadna z nich nie była kwestią gustu.

### 1. „Wszystko przezroczyste" — sześć procent, za które płacił cały bufor głębi

`UnitView` trzymał KAŻDY front na `opacity 0.94` w zwykłym widoku. Sześć procent
prześwitu widać ledwo; koszt jest nieporównanie większy: materiał z `transparent: true`
**wychodzi z kolejki nieprzezroczystej**, więc każde drzwi w pokoju były sortowane
tyłem-do-przodu względem wszystkich innych i rysowane bez porządku głębi, na którym
opiera się reszta sceny. Stąd „przezroczyste" jako wrażenie ogólne, a nie tylko na
frontach.

Solid jest teraz **kryjący, kropka**. `transparent` i `depthWrite` liczą się z jednej
wartości (`translucent = faded < 1`), a półprzezroczystość należy do dwóch trybów,
które po to istnieją: X-ray i Contour.

### 2. „Brak cienia, brak głębi" — key słabszy niż fill

Tura 7: **ambient 1.25, key 0.85**. Światło kluczowe słabsze od płaskiego, które ma
pokonać, oświetla wszystko i nie kształtuje niczego. Do tego cień: kamera cienia była
dopasowana do POKOJU z zapasem — na kuchni 4 m to bryła 8 m, a mapa 1024 na 8 metrach
to 8 mm na teksel, czyli więcej niż szczelina między dwiema szafkami. Cień między nimi
po prostu nie miał rozdzielczości, żeby zaistnieć.

Rig studyjny ze Spraying-Calc, w `profile.appearance.studio`:

| | |
|---|---|
| ambient | 0.2 |
| key (z cieniem) | 1.0 |
| fill | 0.5 |
| rim | 0.3 |
| ACESFilmic, exposure | 1.0 |

…i kamera cienia dopasowana do **MEBLI**, nie do pokoju (`shadowPadding` 600 mm luzu,
liczone z `furnitureBounds` po klatce, w której jednostki się narysowały). Każdy teksel
mapy ląduje na czymś, co rzuca cień.

**Ten sam rig w widoku roboczym i w renderze.** To jest osobna decyzja i ważniejsza niż
same liczby: tura 7 oświetlała edytor inaczej niż zdjęcie i przestawiała światła
w przebiegu przechwytującym, więc stolarz nie mógł ocenić z ekranu, co dostanie klient.
`profile.render.lightScale` to teraz same jedynki (blok zostaje — warsztat, który chce
mocniejszego zdjęcia, ma gałkę), a `render.exposure` równa się `studio.exposure`.

### 3. Ściany, których rig studyjny nie umie oświetlić

Rig na trzy światła jest zbudowany dla obiektu na tle bez szwu. Skierowany na POKÓJ
daje szare ściany, bo ścianę oświetla głównie światło, które już się od czegoś odbiło —
a światło kierunkowe nie ma odbić. Tura 7 odpowiadała na to ambientem 1.25, czyli
spłaszczała meble, żeby rozjaśnić ściany.

`studio.roomBounce` (0,42) to ta sama odpowiedź wycelowana tam, gdzie należy: **podłoga
i ściany niosą ten ułamek własnego koloru jako emisję**. Meble widzą rig i nic więcej.
Ściana za białą szafką jest biała, a modelunek na drzwiach nietknięty.

### 4. Hybryda materiałów — filozofia Spraying, w trzech liczbach

| | powierzchnia natryskiwana | melamina / dekor |
|---|---|---|
| environment (`envMapIntensity`) | **0** | 1 |
| metalness | 0 | 0 |
| roughness | **z suwaka Sheen** | z rodziny (`materials.melamine`) |
| faktura | orange peel na normalnych, `normalScale` 0,1 | brak |

Zero na envMapie nie jest oszczędnością, tylko regułą: **lakier w kolorze JEST tym
kolorem**. Biały front, który podbiera odbicie stojącego obok orzechowego korpusu, nie
jest już biały, a klient przykładający wzornik RAL do ekranu porównuje go z czymś innym,
niż myśli. Melamina i dekory zatrzymują sondę — folia naprawdę odbija pokój i to jest
większość tego, co odróżnia płytę od kolorowego papieru.

Orange peel siedzi w tym samym shaderze co złamana krawędź z tury 6 (`3d/bevel.js`,
uniform `ccSpray`): trzy sinusy, część styczna, komórka ~2 mm (`spray.peelMm`).
Geometria tak gęsta kosztowałaby klatkę za coś, czego i tak nie widać z bliska
inaczej niż jako połysk.

### 5. Suwak Sheen — skala Piotra, nie suwak roughness

`profile.appearance.sheenScale`: **0–25, skok 5**, domyślnie 15. Wzór ze Spraying:

```
roughness = 1 − sheen / 25
```

To jest skala, na której Piotr wycenia ludziom robotę, więc to jest skala, o którą pyta
aplikacja. Suwak „roughness 0–1" to ta sama informacja w języku, którym w warsztacie
nikt nie mówi. Wzór jest jedną linijką w `engine/design.js`, więc panel ustawień
i obraz nie mogą się różnić co do tego, jak wygląda 15. Nazwy kroków są: Matt · Dead
flat · Eggshell · Satin · Semi-gloss · Mirror.

Sheen dotyczy WYŁĄCZNIE tego, co idzie do kabiny: fronty, panele boczne, infille,
cokół. Melamina to folia i swój połysk przyniosła z płytą. Dekor na froncie też NIE jest
natryskiem — `test/sheen.test.js` pilnuje i tego.

### 6. Prawdziwe tekstury EGGER (decyzja Piotra 07.08)

Tura 5 czytała warunki EGGER-a jako zakaz używania skanów w 3D bez pisemnej zgody
i puszczała **własne proceduralne słoje tonowane średnim kolorem dekoru**. Piotr tę
decyzję cofnął: skany są w Supabase Storage, 69 dekorów woodgrain niesie pole `tex`,
i dekor drewnopodobny ma teraz obraz producenta. To jego relacja z dostawcą i jego
ryzyko — zapisane, nie dyskutowane. Pisemna zgoda na publiczne demo i sprzedaż zostaje
jako **BLOCKERS #44**.

Co się NIE zmieniło: obraz jest pokazywany **w całości i bez edycji** (`tint: false` —
tonowanie hex jest wyłączone wszędzie tam, gdzie jest prawdziwy skan), atrybucja
„EGGER {code} {name}" jest bezwarunkowa, nota o reprodukcji jedzie z nią. Dekor bez
skanu — i maszyna bez sieci — spada na proceduralne słoje, więc **mock-mode DZIAŁA**
(reguła 7), a nie pokazuje 400 białych paneli.

**Kierunek słojów — błąd, który było widać na każdej szafce.** Piotr: „dziś słoje leżą
POZIOMO na bokach". Przyczyna jest w UV sześcianu: three daje ścianie ±X `u` wzdłuż Z
i `v` wzdłuż Y, a **bok korpusu JEST ścianą ±X**. Tura 7 skalowała teksturę przez `x`
i `y` pudełka, więc figura kładła się na boku.

`engine/decors.js` niesie teraz dwie czyste funkcje, obie testowane w node:

- `grainRun(panel)` — słój biegnie wzdłuż DŁUŻSZEGO wymiaru formatki, bo tak tnie się
  płytę. `cnc.rotated` nie wchodzi w grę i to jest świadome: `rotated` mówi, że DXF
  rysuje część obróconą dla zagnieżdżenia, a `w`/`h` części są już częścią, nie rysunkiem.
- `decorMapping(box, grainMm)` — która ściana pudełka jest tą dużą, i czy obraz trzeba
  obrócić o ćwierć obrotu, żeby słój poszedł wzdłuż `u`.

Skala fizyczna: `appearance.decor.scanHeightMm = 2800` — **jeden skan to tyle
milimetrów prawdziwej płyty wzdłuż słoja**, a nie długość powtórzenia. Dzięki temu
drzwi 720 mm pokazują ten kawałek płyty, z którego byłyby wycięte, zamiast kafla, który
czyta się jak tapeta. Szerokość liczona z proporcji zdekodowanego obrazu, `anisotropy 8`
(bok szafki ogląda się pod kątem częściej niż na wprost, i to właśnie tam niefiltrowany
słój zamienia się w migotanie).

### 7. Zaznaczenie — granat, który na ekranie jest czarny

Przy okazji F2.5, bo to ta sama rodzina: `#1B2A4A` przy szerokości 1 px na ciemnej
kanwie czyta się jak czarny i Piotr nie odróżniał szafki zaznaczonej od niezaznaczonej.
Znacznik to teraz czytelny średni błękit `#2B6CB0`, i **cieńszy** (0,75) — znak, który
widać, nie musi być ciężki. STRZAŁKI zostają w granacie: rysunek drukuje się na białym
papierze, gdzie granat jest granatem.

### Liczby fazy

| | |
|---|---|
| testy | **634/634** (nowe: `sheen.test.js` 10, przepisany `decors.test.js` 24) |
| build | czysty |
| nowe zależności | zero |

**Testy, które musiały się zmienić — bo tura 8 zmienia to, co opisywały:**

- `decors.test.js` — „żaden finish nie niesie obrazu EGGER-a" było linią tury 5.
  Asercja się **przeniosła**, a nie zniknęła: testowane jest to, o co licencja dalej
  prosi OPROGRAMOWANIE — obraz w całości i bez edycji (`tint: false`), atrybucja
  bezwarunkowa, fallback dla maszyny bez sieci. Plus nowy strażnik: `tex`, które nie
  jest adresem `https`, jest odrzucane, zanim trafi do loadera tekstur.
- `render.test.js` — „render bierze kontrast z key light, nie z ciemnego ambientu"
  opisywało DWA rigi. Jest jeden, więc test mówi to: `lightScale` to same jedynki,
  a `render.exposure` równa się `studio.exposure`. Drugi test pilnuje samego rigu
  (key > 3 × ambient — dokładnie ta proporcja, którą tura 7 miała odwróconą).
- `appearance.test.js` — kolor zaznaczenia, patrz wyżej.

## F2 — SIEDEM BŁĘDÓW Z TESTÓW PIOTRA

### 1. [NAJWAŻNIEJSZY] Dodawanie szafki PO LEWEJ

Zgłoszenie ma dwa zdania: nowa jednostka zawsze ląduje po prawej, i nie da się jej
przeciągnąć w lewo.

**Drugie zdanie NIE jest błędem i nie wolno go „naprawić".** Szafka dobita do sąsiada
nie ma dokąd iść w lewo, a clamp, który przepuściłby ją przez sąsiada, byłby błędem
znacznie gorszym od zgłaszanego — dokładnie tym, który tura 3 faza 4 zamknęła. Test
`slots-and-hinge.test.js` trzyma tę linię celowo, bo kuszący fix ją łamie.

Błędem jest zdanie pierwsze. `freeSlotOnWall()` znało **jeden kierunek**, więc lewy
koniec ciągu był nieosiągalny ŻADNĄ drogą: ani przez dodawanie (zawsze w prawo), ani
przez przeciąganie (zablokowane, i słusznie).

Co jest teraz:

- `freeSlots(spans, …)` — czyste wyliczenie WSZYSTKICH wolnych odcinków ściany, jako
  zakresów pozycji lewej krawędzi, w których jednostka się mieści;
- `freeSlotOnWall({ …, near, side })` — kiedy wołający wskaże jednostkę, przy której
  pracuje, odpowiedzią jest **najbliższy WOLNY slot po dowolnej jej stronie**. Kandydaci
  to dwa końce każdego wolnego odcinka i nic pomiędzy: nowa szafka staje OBOK czegoś,
  nigdy nie dryfuje na środku luki. Remis idzie w prawo, więc „dodaj, dodaj, dodaj"
  dalej buduje rząd tak, jak budował od tury 1;
- `side: 'L' | 'R'` zawęża to do jednej strony, a brak miejsca po wskazanej stronie
  **odmawia z powodem** („no room to the left of 01") zamiast po cichu użyć drugiej
  albo ściany za plecami;
- panel Library pokazuje wybór strony (`◀ · auto · ▶`) tylko wtedy, gdy jest przy czym
  stanąć — na pustej ścianie pytanie nie ma sensu, a odpowiedzią jest „na środku".

Wołający to `LibraryPanel`, a jednostką, przy której się pracuje, jest **zaznaczona**.
Ponieważ panel zaznacza świeżo dodaną, ciąg rośnie w kierunku, w którym się go buduje.
Sprawdzone w Chromium: trzy szafki → `[1700, 2300, 2900]`, po `◀` i czwartym dodaniu →
`[1700, 2300, 2900, 1100]`.

### 2. Przełącznik drzwi L/P nie działa

Strona zawiasu żyje w DWÓCH miejscach, a silnik czyta to drugie. `params.hinge` należy
do jednostki; `params.doors` staje się OBIEKTEM w chwili montażu drzwi (`setDoors`),
a `normalizeParams` pozwala `doors.hinge` nadpisać `hinge`. Więc od momentu, w którym
drzwi istniały, przełącznik w panelu pisał do pola, którego nic nie czyta, i Piotr
patrzył na kontrolkę, która nie robi nic.

Jedno źródło prawdy, trzymane w store (a nie przez nauczenie silnika, żeby wolał drugie
pole — to obiekt drzwi jest podawany silnikowi, więc to obiekt drzwi ma być poprawny).
Synchronizacja idzie w OBIE strony: montaż drzwi z zawiasem zapisuje go też na
jednostce, więc przełącznik pokazuje to, co szafka naprawdę ma.

Test sprawdza wszystkie trzy skutki przełączenia: bok wiercony na zawiasy
(`hinged_sides`), `meta.hinge` na froncie (o to obraca się drzwi w 3D i tak rysuje je
karta) oraz puszka ⌀35, która przenosi się na drugą krawędź drzwi.

### 3. End panel i infille nie barwiły się materiałem frontów

Silnik mówi `material_role: 'front'` dla end panelu i infilla od tury 6 — widok pytał
o `role === 'front'`, co jest prawdą dla drzwi i fałszem dla `end_panel` i `infill`.
Naprawione w F1 razem z resztą materiałów (`surfaceFor({ materialRole })`).

Uwaga ze screenshota Piotra — „end panel przy dekorze EGGER (uni) ZABARWIŁ się" — jest
wyjaśniona tą samą przyczyną, nie drugą: przy dekorze na korpusie i niczym na frontach
fronty **dziedziczą korpus** (`design.js`), więc obie odpowiedzi były tym samym kolorem
i błąd był niewidoczny. Widać go dopiero, gdy fronty mają własny kolor. Cała macierz
(kolor „This app" × dekor EGGER × end panel × infill) jest przejechana w
`test/sheen.test.js`.

### 4. EdgeHandle — niewidoczny w spoczynku

Tura 6 rysowała go przy 22 % krycia ZAWSZE, dokładnie NA górnym licu elementu i tej
samej szerokości. Wyszły z tego dwie rzeczy i Piotr zgłosił obie: **szara mgiełka** po
górach wszystkich paneli i infilli w pokoju (stały pasek nie jest uchwytem — czyta się
jako część mebla, czyli jako jedyna rzecz, którą uchwyt nigdy być nie może) oraz
**z-fighting**, czyli „galareta": dwie współpłaszczyznowe powierzchnie to rzut monetą
na piksel na klatkę.

Teraz: w spoczynku **nie rysuje się nic**. Siatka dalej TAM JEST — musi, bo inaczej nie
byłoby czego najechać — ale jest `visible={false}`, a nie `opacity 0`: niewidoczna
siatka nie jest rysowana, sortowana ani mieszana, i **dalej łapie raycast**, więc hover
działa, a klatka nie kosztuje nic. Kiedy się rysuje, stoi **0,6 mm NAD licem**
i jest wcięta **1 mm na stronę** (`HANDLE_LIFT_MM` / `HANDLE_INSET_MM`), więc obie
powierzchnie nigdy nie są współpłaszczyznowe, a obrys uchwytu nie dotyka krawędzi
elementu pod nim.

### 5. Zaznaczenie — patrz F1 ust. 7

`#2B6CB0`, grubość 0,75. Strzałki zostają w granacie.

### 6. „Dziwny klocek" przy top infillu

Uchwyt top infilla był **prostopadłościanem 240 × 24 × 60 mm** w kolorze `bracket`,
wiszącym 12 mm nad infillem, przy 35 % krycia. To jest ten „obcy prostopadłościan" ze
screenshota: kawałek niczego, w kolorze, którego nie ma żadna szafka, wiszący w powietrzu
obok elementu, do którego należy.

Jest tą samą KRAWĘDZIĄ, której end panele i pionowe infille używają od tury 6 —
niewidoczną w spoczynku, zapaloną pod kursorem, leżącą na własnym górnym licu paska
czołowego. Jeden gest, nauczony raz, dla wszystkich trzech rzeczy, które kończą ciąg
pod sufitem.

*(Drugi podejrzany z CLAUDE.md — narożny corner-return — jest prawdziwym nakładaniem
się pudełek i należy do F6: paski wracające za róg zachodzą na główne o kwadrat naroża.
To nie klocek-widmo, tylko brakująca mitra, i F6 ją wycina.)*

### 7. Gate: top infill niedostępny dla base units

Na bazie leży **BLAT**, a szczelina nad blatem to miejsce, gdzie stoją wiszące. Domykanie
jej paskiem 18 mm to nie jest robota, którą ktokolwiek by wyciął — a element trafiał do
BOM-u i na arkusz CNC tak, jakby ktoś tego chciał.

`supports.topInfill` per kit (`engine/types.js`) i `takesTopInfill()`
(`engine/autoparts.js`). Bramka stoi w **trzech** miejscach, bo są trzy drogi do środka:
`setTopInfill` (przeciąganie i pole), `menuActions` (menu kontekstowe nie pokazuje wpisu
w ogóle) i `autoPartsFor` — ta ostatnia dlatego, że projekt zapisany przed turą 8,
szablon albo import mogą już nieść parametr. Panel prawy mówi, dlaczego go nie ma.

Dozwolony: WUD, BUDTALL, WARDROBE, FRIDGE. Niedozwolony: BUD, BUDR, SINK, LOW_CABINET.
**Side infill bez zmian** — baza przy ścianie ma szczelinę na scribe dokładnie tak samo
jak tall.

### Liczby fazy

| | |
|---|---|
| testy | **661/661** (nowe: `slots-and-hinge.test.js` 16) |
| build | czysty |

**Testy, które musiały się zmienić:** `run-infill`, `construction` i `autoparts` stawiały
top infill na jednostkach BAZOWYCH. Element jest identyczny niezależnie od tego, jaki kit
pod nim stoi — zmieniło się tylko to, które kity mogą go mieć — więc te suity stoją teraz
na `BUDTALL`. Przy okazji dwie z nich przestały wpisywać wysokość na sztywno i czytają
prześwit z pokoju: nad tall unitem jest go mniej niż nad bazą, a pytaniem testu jest
mechanizm, nie liczba.

## F3 — ODSUNIĘCIE OD ŚCIANY TYLNEJ: 10 mm, WSZYSTKIE

Powód Piotra jest krótki i konstrukcyjny: **ściany nie są proste, a wiszące szafki
wiszą na wieszakach, które i tak je odsuwają**. Więc to nie jest luz, o który ktoś
prosi per szafka — to fakt o tym, jak ten warsztat buduje, i siedzi w profilu obok
wszystkich innych takich faktów: `profile.room.wallBackClearance = 10`.

`params.inset_back_mm` z tury 7 zostaje czym był — DECYZJĄ o jednej szafce, za którą
biegnie rura — i te dwie liczby **się dodają**. Szafka odsunięta 40 na rurę stoi 40 od
tego miejsca, w którym stałaby normalnie, czyli 50 od ściany. Jedna funkcja,
`backStandoff(unit, profile)`, i wszystko czyta ją zamiast składać sobie sumę.

**To, co robi z tego fazę, a nie stałą, to wszystko, co musiało za nią pójść:**

| co | jak |
|---|---|
| pozycja w 3D | `UnitView` bierze `backStandoff`, nie sam inset |
| strzałki odległości | `Scene` mierzy od realnej pozycji, ta sama funkcja |
| clamp głębokości | pokój 3000 → szafka może mieć 2990, i mówi, co ją zatrzymało |
| plan / footprint kolizji | `toObstacleUnit` przez `footprintPads(…, profile)` |
| **end panel** | głębszy o 10 i zaczyna się na ŚCIANIE (`box.z = −10`) |
| **mitrowany return** | biegnie do ściany, nie do tyłu korpusu (`frontFaceDepthOf`) |
| **top view** | rysuje linię ŚCIANY i szczelinę do niej |
| **karta produkcyjna** | wymiarowuje tę szczelinę liczbą |
| boczny clamp przy Infill OFF | 10 mm zamiast zera |

**Dwie rzeczy warte wyjaśnienia, bo wyglądają na niekonsekwencje i nie są.**

*End panel przechodzi przez luz przyścienny, ale NIE przez inset.* Luz to puste
powietrze za każdą szafką i panel maskujący ma je przekryć — inaczej szczelina biegnie
na wysokości oka przez całą głębokość ciągu, czyli dokładnie to, czego panel maskujący
ma nie mieć. Inset 40 trzyma rurę; wpuszczenie w niego panelu to wpuszczenie go w to,
od czego szafkę odsunięto. `test/wall-clearance.test.js` pilnuje obu stron.

*Koniec ciągu przy ścianie bocznej to dalej „wall", nie „open".* Skoro przy Infill OFF
jednostka parkuje 10 mm od ściany bocznej, `runEnd()` mogłoby uznać, że nie dobiła i że
trzeba obrócić narożnik. Nie: 10 mm to szczelina na scribe, element z góry przechodzi
nad nią na ścianę, a return puszczony w 10-milimetrową szparę byłby wyrobem, którego
nikt nie zamawiał. Tolerancja „to jest ściana" obejmuje więc luz przyścienny.

**Infill OFF ≠ Infill 10.** Boczny stop to 10 mm, ale filler się NIE pojawia:
`sideInfill()` produkuje pasek tylko wtedy, gdy szczelina mieści się w ustawieniu
projektu, a przy ustawieniu 0 nie mieści się nic. Szczelina zostaje szczeliną na
przyfugowanie, a w cut liście nie przybywa nic.

`test/wall-clearance.test.js` — 13 testów, od samej liczby (i tego, że profil sprzed
tury 8 dostaje default zamiast wywrotki) po rysunek.

**Testy, które musiały się zmienić:** `end-panel` i `construction` (głębokość panelu),
`run-infill` (długość returnu, i „END 1" — jednostka parkuje teraz na stopie 10 mm,
więc test czyta pozycję piecea względem ŚCIANY, a nie względem korpusu),
`slots-and-hinge` (lewy kraniec ściany to 10, nie 0).

## F4 — PÓŁKI v2

### 1. Cofnięcie 20 mm — i ograniczenie, które trzeba było ominąć uczciwie

Półka regulowana stoi 20 mm od lica od czasów LISP-a; **półka FIX i partition** były
cięte na pełną głębokość. Piotr chce ich wszystkich na jednej linii — i ma rację: partition
w licu obok cofniętej półki czyta się jak pomyłka, a to on jest tym elementem, obok
którego przechodzi ramię zawiasu.

Problem: **złote fixtures TO SĄ kity AutoLISP-a**, a reguła 1 z `fixtures/README.md` jest
absolutna — „Engine output must match. If it doesn't — the ENGINE is wrong". `PARTITION`
i `RAIL-PART` mają w `golden-wardrobe` i `golden-low-cabinet` wpisane `h: 560`, czyli
pełne `internalDepth`. Skrócenie ich w silniku bezwarunkowo = czerwone fixtures.

Rozwiązanie jest tym samym wzorcem, którym idą cokół, top infill i end panele od tury 4:
**cofnięcie to DECYZJA PROJEKTU, a nie zachowanie kitu.** Silnik czyta
`params.interior_setback_mm`, a podaje go `paramsForEngine()` — adapter store'u, przez
który przechodzi każdy odczyt każdej jednostki w projekcie. Gołe `computeCabinet()`
(fixture, test kitu, import) dostaje 0 i dalej tnie dokładnie to, co tnie LISP. Obie
strony tej umowy mają test.

Per element: `front_mm` na półce, `partition_front_mm` na jednostce. `0` = **wysunięte do
lica** — bo półka pod blatem albo za drzwiami szklanymi czasem musi. Przyciski w panelu
(`⇥`) przełączają jedno w drugie.

**Wieńce TOP/BOTTOM nietknięte.** Niosą puzzle; skrócenie ich to skrócenie korpusu.

### 2. FIX = ŚRUBY, nie piny

Półka FIX dostaje **trzy śruby ⌀3 przez każdy bok, w OSI półki** (środek grubości, śruba
w czoło płyty), na pozycjach `[50, sideW/2, sideW−50]`, warstwa `SCREWS_3MM` — czyli
dokładnie ten sam złącze i ta sama warstwa, których partition używa od zawsze. I **żadnych
pinów**: kolumna otworów ⌀7,5 dla półki, która nie może się ruszyć, to otwory wywiercone
po nic.

`drillSummary` mówi teraz obie rzeczy osobno: `shelf_row_y` to dalej GDZIE są półki (tym
wymiaruje rysunek), a `shelf_pin_row_y` / `shelf_screw_row_y` mówią, jak każda jest
trzymana. DXF i podgląd CNC biorą to z `drills[]`, więc nie trzeba ich było uczyć niczego.

### 3. `updown_locked`

Półka regulowana, której nie wolno przeciągać: taka, na której stoi piekarnik, taka, do
której przybity jest przelot kabli. Wiercenie identyczne jak FIX, bo **trzymanie półki
w miejscu to jedno i to samo, niezależnie od powodu** — stąd jedna funkcja
`isShelfLocked()`, a nie dwie.

Odmowa ruchu siedzi w `setShelfPos`, czyli w JEDYNYM setterze, przez który przechodzi
i przeciąganie, i wpisana liczba. Zwraca `{ blocked: true, locked: true }` — ten sam
kształt, który clamp zwraca dla półki bez miejsca, więc odczyt w 3D nie potrzebował
nowego przypadku. W 3D kursor nad zablokowaną półką nie obiecuje `ns-resize`, a złapanie
jej przeciąga CAŁĄ SZAFKĘ, co jest tym, co fizycznie robisz, łapiąc przykręconą półkę.

Minimalny toggle w panelu (🔓/🔒), zgodnie z CLAUDE.md („pełne UI później").

### 4. Hover na półce → odstępy

Pytanie brzmi „czy są równo?", a na to nie da się odpowiedzieć jedną szczeliną. Najechanie
na DOWOLNĄ półkę wymiaruje więc **wszystkie prześwity w kolumnie** — od podłogi (albo od
partitionu nad szufladami) do pierwszej półki, między półkami, i od ostatniej do spodu
wieńca. Mierzone **między licami**, nie między osiami, bo stolarz pyta o światło, w które
coś ma wejść. Szczeliny odstające od największej idą na złoto, więc stos rozjechany o 3 mm
mówi to sam.

### 5. Nazewnictwo, i migracja, której nie dało się uniknąć

`variant: 'fixed'` znaczyło przedtem tyle co „półka" — to była wartość, którą `addShelves`
wpisywał wszystkiemu. Teraz znaczy PRZYKRĘCONA, więc każda półka zapisana przed turą 8
zamieniłaby się po cichu w przykręconą: trzy otwory ⌀3 na bok zamiast kolumny pinów,
w szafce, którą ktoś mógł już wyciąć.

Więc jest migracja ze stemplem, dokładnie jak `PROFILE_SCHEMA` i `DESIGN_SCHEMA`:
`migrateUnitShelves()` czyta `'fixed'` jako `'adjustable'` w jednostce, która nie ma
`shelf_schema: 2`, i stempluje. Jednostka już zmigrowana zachowuje swoje FIX-y.
Wartości: `adjustable` (default, piny) · `fixed` (przykręcona) · `pullout` (bez zmian).

### Liczby fazy

| | |
|---|---|
| testy | **690/690** (nowe: `shelves-v2.test.js` 15) |
| fixtures | nietknięte, i pilnowane osobnym testem |
| build | czysty |

## F5 — ZACHOWANIA

Żadne z tych dwóch nie dotyka cut listy. Oba są różnicą między narzędziem, które
rysuje kuchnię, a takim, które zachowuje się jak kuchnia.

### 1. Drzwi przy ścianie bocznej — max 90°

Geometria jest tu zaskakująca i warto ją zapisać, bo odpowiedź wygląda na zaokrągloną,
a nie jest. Drzwi zawieszone po lewej, otwierając się, prowadzą swoją wolną krawędź po
łuku:

```
x(θ) = hingeX + szerokość · cos θ
```

Przy θ = 90° to jest sama oś zawiasu — drzwi stoją prostopadle do frontu i **nie zajmują
żadnej szerokości**. Dopiero POWYŻEJ 90° cosinus robi się ujemny i wolna krawędź wraca
NAD zawias, w stronę ściany, aż przy 180° drzwi leżą płasko na boku szafki.

Czyli: **ściany nie uderza się w drodze na zewnątrz, tylko w drodze za prostą**. I dlatego
90° z CLAUDE.md jest odpowiedzią dokładną, a nie ostrożną: to ostatni kąt, przy którym
drzwi o dowolnej szerokości, przy szczelinie dowolnej wielkości, jeszcze się od ściany
ODDALAJĄ.

`engine/doors.js doorOpenAngle()` liczy też kąt zetknięcia dokładnie i bierze
`min(pełny, max(90°, …))` — więc warsztat, który wpisze `openAngleAtWall: 120`, dalej nie
dostanie drzwi w tynku, a szczelina szersza niż same drzwi (900 mm) w ogóle nie jest
ścianą i drzwi idą na pełny kąt. Test sprawdza to „długą drogą": dla każdej szczeliny
liczy `x(θ)` przy zwróconym kącie i pilnuje, że wolna krawędź nie przeszła za ścianę.

Luz 10 mm z F3 jest w tym rachunku, bo `wallGapsFor()` mierzy od miejsca, w którym
jednostka NAPRAWDĘ stoi. **Sąsiad to nie ściana** — CLAUDE.md pyta o ściany, a dwoje drzwi
otwierających się w siebie to inne pytanie z inną odpowiedzią.

### 2. Wiszące obok Tall

Wstawiona wisząca szafka wiesza się tak, żeby jej góra była na linii góry najbliższego
TALL unita na tej ścianie. Ciąg, w którym wiszące kończą się 80 mm poniżej stojącej obok
słupy, czyta się jak dwie kuchnie.

Jest to **punkt startu i mówi to wprost**: `mount_height` zostaje zwykłym edytowalnym
polem. Brak talla na tej ścianie → wysokość projektu, jak dotąd. Tall na INNEJ ścianie
nie decyduje o niczym.

### Przy okazji: cokół, który nie docierał do góry

Znalezione przez F5 i naprawione, bo bez tego wyrównanie było o 20 mm za nisko.
`unitTop()` czytał wysokość nóżek Z PROFILU i ignorował tę, którą tura 5 wpycha na każdą
jednostkę jako wysokość projektu (`params.leg_height`, BACKLOG #29). `cabinet.js` czyta ją
od tury 5; `runs.js` nie czytał.

Na projekcie z cokołem 120 mm o te same 20 mm mylili się WSZYSCY konsumenci tej funkcji:
które jednostki są jednym ciągiem (`buildRuns` grupuje po górze), ile zostało miejsca nad
jednostką na top infill (`autoPartsFor`), i — od tury 8 — gdzie wisi szafka obok talla.
Teraz jest jedna funkcja `unitBase(unit, profile)`: **najpierw własny cokół jednostki,
potem profilowy**, dokładnie jak `legHeightOf` w silniku.

`test/behaviours.test.js` — 12 testów.

## F6 — MITRA 45° WIDOCZNA W 3D

Silnik mówi `mitre_45` od tury 6 i cut lista jest poprawna; 3D rysowało oba paski jako
prostopadłościany na styk, czoło do płyty. Werdykt Piotra: „nie ma opcji, będzie źle
wyglądać".

I to nie jest tylko kwestia złącza. Czwarty warunek końca ciągu każe elementowi
**OBRÓCIĆ NARÓŻNIK** i pobiec do ściany — a dwa pudełka spotykające się w narożniku nie
obracają narożnika, tylko **nachodzą na siebie kwadratem naroża** i z-fightują przez
siebie. To jest drugi podejrzany z F2.6 („kawałek narożny corner-return w złej pozycji")
— nie klocek-widmo, tylko brakująca mitra.

### `engine/mitre.js` — czysta geometria, sprawdzalna w node

Płaszczyzna 45° przez pudełko to arytmetyka, a arytmetyka należy tam, gdzie da się ją
sprawdzić w teście, a nie okiem na ekranie. Moduł nie zna three.js:

- `boxPolyhedron(box)` — 8 wierzchołków i 6 ścian, w milimetrach jednostki;
- `chamferPlane(box, osA, znakA, osB, znakB, rozmiar)` — płaszczyzna fazy na krawędzi
  dwóch ścian. **Równe nogi to jest ta mitra**: 45° to jedyne cięcie, którego oba boki
  są równe, i to sprawdza test;
- `clipPolyhedron(solid, plane)` — Sutherland–Hodgman po każdej ścianie **plus CZAPKA**.
  Bez czapki bryła jest otwarta, a otwarta bryła renderuje się jako dziura przez szafkę,
  czyli gorzej niż styk, który to zastępuje;
- `solidTriangles` — trójkąty z PŁASKĄ normalną na ścianę. Płaską celowo: mitra to ostra
  krawędź między dwiema powierzchniami i wygładzenie jej to unieważnienie całej roboty.
  Złamanie krawędzi robi shader z tury 6, per fragment, poniżej milimetra.

**Pułapka, która kosztowała sesję i jest zapisana w kodzie:** czapkę budowałem, zapamiętując
dwa przecięcia na ścianę. Kiedy płaszczyzna przechodzi DOKŁADNIE przez wierzchołek pudełka,
przecięcie jest jedno i czapka nigdy się nie domyka. A to nie jest przypadek brzegowy: faza
o rozmiarze równym grubości płyty przechodzi przez narożnik KAŻDEGO paska, który tnie.
Czapka szuka teraz **pary sąsiednich wierzchołków wyjściowych leżących NA płaszczyźnie** —
łącznie na ścianie, której płaszczyzna tylko dotyka, nic z niej nie zabierając.

### Co się dzieje z paskami

**Półka „rośnie do przodu"** — a właściwie PRZESUWA się. Silnik stawia półkę ZA czołem, żeby
pudełka stykały się bez nachodzenia (tura 6). Mitra jest odwrotna: dwa elementy cięte do
DŁUGIEGO PUNKTU nachodzą na siebie dokładnie tym kwadratem, który zajmuje złącze, i dwa
cięcia 45° dzielą go między siebie. Rysowana półka biegnie więc do płaszczyzny lica czoła
i tam jest przycięta — **ta sama długość cięcia (80), ta sama zewnętrzna obwiednia,
złącze zamiast styku**. Przekrój wychodzi 40 × 80, a nie 40 × 98, i to jest to, o co prosi
CLAUDE.md („przekrój 40+~80 spotyka się w widocznej mitrze").

**Return to to samo złącze, obrócone.** Na otwartym końcu mitrują się PARAMI: czoła między
sobą (kwadrat = grubość) i półki między sobą (kwadrat = głębokość półki). Stąd „narożnik
otwartego końca jak rama obrazu".

### Czego to NIE dotyka

BOM i DXF bez zmian — pilnuje tego osobny test. Element jest CIĘTY jako prostokąt do
długiego punktu, a mitra jest ustawieniem piły, co `meta.mitre_45` mówi warsztatowi od
tury 6. To jest to, jak element WYGLĄDA.

Pionowy filler (arm + face) NIE dostaje mitry i to jest świadome: tura 6 opisuje ramię A
jako **przykręcone** do boku korpusu, a przykręcony styk to nie mitra.

`test/mitre.test.js` — 9 testów, w tym „bryła jest ZAMKNIĘTA" (każda krawędź użyta
dokładnie dwa razy — jedyny test, który łapie brakującą czapkę, zanim zobaczy ją oko).

## F7 — MENU KONTEKSTOWE v2

Dwie zmiany, i druga jest tą, o którą Piotr poprosił dosłownie: „**koniec biegania do
menu**".

### Kolejność

Taka, po co stolarz sięga, w kolejności, w jakiej po to sięga:

1. **Show all dimensions** — komplet wymiarów TEJ szafki na scenie, jako toggle
2. **End panel — left / right / both sides**, każdy jako przełącznik
3. **Top infill** (tylko tam, gdzie w ogóle jest, F2.7) i **Scribe fillers at the wall**
4. **Plinth**
5. Insets… · Save as template
6. dopiero potem to, co przesuwa albo niszczy: Center shelves · Rotate 90° · Back to wall ·
   Side to wall · Close all fronts · **Delete**

### Przełączniki, a nie jednorazówki

Menu tury 4 umiało end panel tylko DODAĆ. Zdejmowało się go, otwierając prawy panel
i szukając wiersza. Wpis, którego da się użyć raz, jest **wpisem błędnym w połowie
przypadków, w których się go czyta** — i to jest cała treść zgłoszenia.

Każdy z tych wpisów niesie teraz `checked` i przerzuca stan. Menu pokazuje go tam, gdzie
oko już jest: `✓` złoty przy włączonym, `·` szary przy wyłączonym. Żaden wpis nie jest już
`disabled`, i test tego pilnuje osobno („dead entry").

„Both sides" zdejmuje OBA — bo to jest ten sam akt dwa razy, dokładnie tak samo, jak
dodanie obu nim jest.

### Trzy rzeczy warte wyjaśnienia

**Wymiary są PER JEDNOSTKA, nie globalnie.** `showDimensions` (toolbar) to pytanie
projektowe: podpis W/H/D każdej szafki i odległości między nimi. To jest inne pytanie, o
jedną szafkę: „jakie są WSZYSTKIE liczby na TEJ". Odpowiedź jest za obszerna, żeby zostawić
ją włączoną na całą kuchnię — nad jedną szafką jest tym, czego się szuka. Etykiety liczone
z wyjścia SILNIKA (`assemblies.shelves`, `assemblies.drawerFronts`, panele), nigdy
wyprowadzane drugi raz: pokazane jest to, co wycięte. `ccHelper`, więc nie trafia do
renderu.

**Side infill nie jest „dodawany".** Jest WYPROWADZANY z tego, gdzie jednostka stoi
(BACKLOG #15), więc przełącznik nie brzmi „dodaj filler", tylko „czy ta szafka w ogóle go
bierze". Stolarz, który zamiast tego przyfuguje DRZWI, wyłącza go tu i element przestaje
być cięty. Jednostka dalej staje tam, gdzie staje: **gdzie jest ściana, to nie jest opinia
per szafka.**

**Top infill nie pojawia się na bazie.** Ta sama bramka co w F2.7, w tym samym miejscu co
reszta: `type.supports.topInfill`.

`test/interaction.test.js` — kolejność wpisów przypięta co do jednego, plus nowy test
„every toggle flips the way it is currently set — both ways", który przejeżdża każdy
przełącznik w obu stanach.

## F8 — WIDOCZNOŚĆ ZŁĄCZY (DOG BONES)

Złącze **jest tożsamością systemu**. WoodExpert pokazuje konfirmaty; korpus Skylona trzyma
się na puzzlu z odciążeniem dog-bone, a klient patrzący na render nie ma jak się o tym
dowiedzieć — korpus to sześć pudełek stykających się na niewidocznych liniach.

Dwie odpowiedzi, bo są dwa pytania:

| tryb | co widać | skąd |
|---|---|---|
| **Solid** | LINIE PODZIAŁU, które tab zostawia na styku bok↔wieniec — po dwie na socket, na obu barkach | pockets warstwy socketu |
| **X-ray** | pełny PROFIL taba (outline), sockety i dogbony, dyskretny kolor per rodzaj | outline + pockets |

W Solid to jest dyskretne celowo: nie chodzi o to, żeby wytłumaczyć złącze, tylko o to,
żeby szafka przestała się czytać jako sześć pudełek stykających się z niczym.

### Dane biorą się z pliku dla maszyny, nie z drugiego rysunku

`engine/joinery.js` czyta `panel.cnc` — obrys, który jedzie frez, kieszenie, które
zatapia. **Nic tu nie wyprowadza taba drugi raz i nic nie zostało dodane do silnika.**
Nazwy warstw idą przez `geometryKey` systemu złącza (`profile.joinery.types[]`), a nie
z `profile.puzzle` na sztywno — i to jest cała treść „przyszłe systemy (Cabineo) dostaną
wizualizację automatycznie". Test wykonuje tę pośredniość: podpina wymyślony system
`cabineo` z własnym blokiem warstw i sprawdza, że rysowanie za nim idzie, bez żadnego
`if` w module.

### Odwzorowanie ramki CNC na szafkę, i to, co je udowadnia

Ramka CNC jest 2D, z (0,0) w lewym dolnym rogu nominalnego prostokąta. Na które osie
szafki idą te dwie, jest własnością CZĘŚCI i jest wypisane, a nie zgadywane z pudełka —
bo **dwie z sześciu są odwrócone**: LISP rysuje BUL od krawędzi PRZEDNIEJ, więc jego CNC-x
biegnie w stronę tyłu, przeciwnie do z; BUR jest lustrem i biegnie z z.

Dowodem, że jest dobrze, nie jest geometria, tylko **WIERCENIE**: otwór zawiasu jest cięty
na `xFromFrontEdge` po obu stronach, a oba odwzorowania kładą go 37 mm od PRZODU — czyli
tam, gdzie jest zawias. Gdyby były mapowane tak samo, jeden wylądowałby 37 mm od tyłu,
gdzie nie ma nic. To jest test, nie komentarz.

### Rysowanie

`3d/JointLines.jsx`: **jedno `LineSegments` na RODZAJ**, nie na panel. Korpus ma sześć
paneli, a projekt czterdzieści korpusów — 240 wywołań rysowania na kilkaset milimetrów
linii to klatka wydana na włoski. Tak są cztery na jednostkę, każdy w swoim kolorze
z profilu. Linie stoją 0,4 mm od płyty (`appearance.joinery.lift`), tą samą sztuczką
i z tego samego powodu co uchwyt krawędzi z F2.4.

Kolor obrysu to prawie-czerń, nie błękit — po pierwszym zrzucie z Chromium, na którym
profil taba czytał się jak **znacznik zaznaczenia** (też błękit, F2.5). Socket bursztyn,
dogbone ciemna czerwień: sąsiadujące kieszenie dwóch różnych rodzajów nie mogą być jednym
kształtem.

**Złącze NIE jest oznaczone `ccHelper`** i to jest decyzja: złącze to MEBEL i należy do
renderu dokładnie tak, jak należy krawędź. Cały sens pokazywania go polega na tym, że
widzi je klient.

`test/joinery.test.js` — 11 testów, w tym ten, o który prosi CLAUDE.md: **liczba
rysowanych tabów == dane cnc**, przejechana po WSZYSTKICH złotych fixtures i po każdym
panelu każdej z nich.

---

## F9 — ZAMKNIĘCIE TURY

### Przejście przez aplikację w prawdziwej przeglądarce

`scripts/e2e-turn8.mjs` — jeden spacer przez Chromium (CDP, zero zależności, ten sam
`scripts/cdp.mjs` co w turach 6 i 7), robiący dokładnie to, o co prosi CLAUDE.md F9,
w tej kolejności. **14/14.**

| # | co sprawdzone | wynik | faza |
|---|---|---|---|
| 1 | Design settings niesie suwak Sheen 0–25, skok 5 | `{min:0, max:25, step:5, value:15}` | F1 |
| 2 | płótno otwiera się z żywym kontekstem 3D | ok | F1 |
| 3 | trzy białe szafki, zbite w ciąg | `x = 1700, 2300, 2900` | F1 |
| 4 | …i każda z nich stoi 10 mm od ściany | odstęp jest PROFILU, nie insetem wpisanym na jednostce | F3 |
| 5 | **szafkę da się dodać PO LEWEJ** | `[1100, 1700, 2300, 2900]`, nowa na 1100 | **F2.1** |
| 6 | przełącznik zawiasu przestawia zawias w OBU miejscach, które czyta silnik | `L → {hinge:'R', doors:'R'}` | F2.2 |
| 7 | półkę da się zrobić FIX i jest PRZYKRĘCONA, nie na pinach | `{count:1, variants:['fixed']}` | F4 |
| 8 | Tall bierze top infill, a jego otwarte końce skręcają za róg | `{top:40, ends:{left:'open', right:'open'}}` | F6 |
| 9 | **base unitowi top infill nie jest oferowany** | gate trzyma | F2.7 |
| 10 | jednostka przy ścianie dostaje filler zamykający szczelinę | `{left:20, right:0}` | F3 |
| 11 | X-ray nie kładzie płótna | ok | F8 |
| 12 | render wraca jako obraz | 1920×1142, 324 kB PNG | F1 |
| 13 | …i ma w sobie prawdziwą rozpiętość tonalną: cień i głębię | `min 52 · max 250 · rozpiętość 198`, 404 px ciemnych | **F1** |
| 14 | nic nie napisało błędu do konsoli | ok | — |

Sprawdzenie 13 jest tym, po co ta faza w ogóle istnieje. Diagnoza Piotra brzmiała
„brak cienia, brak głębi" — a „są światła w scenie" da się udowodnić testem
jednostkowym i nadal mieć płaski obraz. Więc dowodem nie jest obecność świateł, tylko
HISTOGRAM gotowego PNG-a: 404 piksele poniżej progu ciemności (jest cień), 198 stopni
rozpiętości między najciemniejszym a najjaśniejszym (jest modelunek). Test, który da
się przejść bez naprawienia problemu, nie jest testem.

### Zrzuty

| plik | co pokazuje |
|---|---|
| `docs/turn8/01-sheen.png` | suwak Sheen w kreatorze projektu, 0–25 co 5 |
| `docs/turn8/02-three-white-cabinets.png` | trzy BIAŁE szafki, rozdzielone samym światłem i cieniem |
| `docs/turn8/03-added-on-the-left.png` | czwarta szafka **po lewej** ciągu |
| `docs/turn8/04-fix-shelf.png` | półka FIX w panelu |
| `docs/turn8/05-mitre.png` | mitra 45° na otwartym końcu top infilla |
| `docs/turn8/06-xray-dogbones.png` | X-ray: taby, sockety i dogbony na bokach |
| `docs/turn8/07-render.png` | render 1920 px z cieniem klucza na całych szafkach |
| `docs/turn8/08-final.png` | scena po całym przejściu |

### Liczby tury

| | |
|---|---|
| testy | **727 / 727**, 0 fail (podłoga z main + 8 nowych suit) |
| nowe suity | `low-tabs` (8), `sheen` (10), `slots-and-hinge` (16), `wall-clearance` (13), `shelves-v2` (18), `behaviours` (12), `mitre` (9), `joinery` (11) |
| E2E | **14 / 14** w Chromium |
| build | czysty (`vite build`, 13,4 s) |
| diff tury | 52 pliki, +5850 / −401 |
| nowe moduły silnika | `engine/doors.js`, `engine/mitre.js`, `engine/joinery.js` |
| nowe zależności | **0** — `package.json` bit w bit ten sam co przed turą |
| fixtures | **0 zmian** — `git diff fixtures/` pusty |
| SQL | nic nie dopisane, nic nie uruchomione (BLOCKERS #49) |

### Co ta tura zmieniła w danych, i jak to nie zabiło fixtures

Dwie rzeczy z CLAUDE.md były na kursie kolizyjnym z `fixtures/README.md` punkt 1
(„jeśli silnik nie zgadza się z fixture, to SILNIK jest zły"):

- **F4 — cofnięcie półek i partitionów o 20 mm.** LISP tego nie robi, a fixtures są
  śladem po LISP-ie. Rozwiązane tak, jak od tury 2 rozwiązany jest cokół, top infill
  i end panel: cofnięcie jest **decyzją PROJEKTU**, którą `paramsForEngine()` podaje
  do silnika, a nie stałą wpisaną w `computeCabinet()`. Gołe `computeCabinet()` tnie
  co do milimetra to, co tnie LISP; szafka postawiona w aplikacji dostaje 20 mm.
  Obie połówki są przybite testem, więc żadnej nie da się cicho zgubić.
- **F3 — 10 mm od ściany.** To nie jest zmiana FORMATKI, tylko POZYCJI: żadna płyta
  nie zmienia wymiaru, zmienia się `box.z` i to, od czego liczą się strzałki, głębokość
  end panela i zasięg top infilla. Fixtures opisują formatki i milczą o pokoju.

### Stan długu

`BLOCKERS.md` dostaje pięć wpisów tury 8 (**#45–#49**) obok #44 z F1: mitra tylko na
paskach i dlaczego boczny L jej nie dostaje, pomiar wydajności z ostrzeżeniem, czego
z niego **nie wolno** wyczytać, trzy rzeczy, których render dalej nie ma, zasięg
migracji półek i niezmiennie nieuruchomione SQL. `BACKLOG.md` dostaje pięć pozycji
(**#50–#54**) i cztery zamknięcia (#19 skany w 3D, #20 mitra, #42 złącza w X-ray,
#47 trzy taby na niskim korpusie).

Nie ma żadnego pytania do Piotra. Jedyna rzecz w tej turze, która wymaga JEGO ruchu,
a nie kodu, to zgoda EGGER-a na skany (BLOCKERS #44) — decyzja o ich włączeniu jest
jego i została wykonana bez dyskusji, a co dało się zabezpieczyć kodem (atrybucja
bezwarunkowa, obraz nietonowany i nieskadrowany, odrzucenie adresu spoza `https://`),
zostało zabezpieczone.

### Definicja sukcesu z CLAUDE.md, punkt po punkcie

| # | wymaganie | stan |
|---|---|---|
| 1 | podłoga testów + nowe, 0 fail; build OK | ✅ 727/727, build czysty |
| 2 | cień klucza na całych szafkach, zero przezroczystości, widoczna głębia | ✅ F1, dowód: histogram renderu |
| 3 | spray wierny kolorystycznie (bez envMap), melamina z envem; sheen co 5% | ✅ F1 |
| 4 | siedem bugów F2 zamkniętych, z №1 na czele | ✅ F2 |
| 5 | każda jednostka 10 mm od ściany; Infill OFF → boki 10 | ✅ F3 |
| 6 | półki/partitiony −20 + wysuwalne; FIX = śruby 3 mm w osi; hover pokazuje odstępy | ✅ F4 |
| 7 | drzwi przy ścianie ≤ 90°; wiszące równają do Tall | ✅ F5 |
| 8 | mitra 45° widoczna w 3D; klocek-widmo zbadany i usunięty | ✅ F6 + F2.6 |
| 9 | menu: dimensions / panele / infille ON-OFF od ręki | ✅ F7 |
| 10 | dog bones w Solid (linie) i X-ray (pełne zarysy) | ✅ F8 |

---

# TURA 9 — 08.08.2026 (fazy F0–F7)

Sześć zgłoszeń Piotra, jedno na fazę, plus brama. Wszystkie z werdyktem
CLAUDE.md „czysto albo wcale": nic nie zostało cofnięte, `fixtures/` bez zmiany,
`package.json` bit w bit ten sam.

**Podłoga:** 727/727 na `main`. **Po turze:** 797/797, build czysty.

---

## F0 — Baseline + łatka #35 (wanity 600) — ✅ ZIELONA, NIC DO ZROBIENIA

`rm -rf node_modules && npm install`, `npm test` → 727/727, `npm run build` →
czysty. Decyzja #35 **już była na `main`** (`profile.projectTypes.vanity.heights.base
= 600`, commit „poprawka"), a `test/new-project.test.js` nigdy nie miał tej liczby
wpisanej na sztywno — pyta o `P.projectTypes.vanity.heights.base` i sprawdza
RELACJĘ („umywalka jest niżej niż blat"). Nie było czego łatać i nie było czego
poprawiać w asercjach: test napisany przez wartość z profilu przeżył zmianę tej
wartości, co jest dokładnie po to.

---

## F1 — [CRITICAL] Paski na frontach — ✅ ZIELONA

**Diagnoza z CLAUDE.md potwierdzona w kodzie.** Ukośne paski w widoku roboczym
i w renderze 4K to **shadow acne**, i tura 8 miała trzy z czterech klasycznych
przyczyn naraz:

| przyczyna | co było | co jest |
|---|---|---|
| rozdzielczość mapy | 1024 na frustum dopasowany do CAŁYCH mebli → ~5 mm/teksel na 4-metrowym ciągu | `normal.mapSize` **2048**, `high` 4096 |
| brak `normalBias` | **nie było go w ogóle** | `normal` 0.02, `high` 0.01 |
| preset renderu | mapa W GÓRĘ (4096), bias W DÓŁ (−0.00018) — najdroższy obraz w aplikacji był najsłabiej zabezpieczony | bias skaluje się RAZEM z mapą: −0.0002 → −0.0001 |
| kontrast pasków | ambient 0.2 przeciw key 1.0 — każdy pasek acne wysokokontrastowy, clearcoat lakieru go podwaja | ambient **0.45**, fill **0.55**, nowe światło hemisferyczne 0.5 |

**Filozofia Prime-Sash-Windows, przyjęta świadomie:** zalać scenę światłem
wypełniającym, żeby kolor czytał się czysto z każdej strony, zostawić **dokładnie
jedno** światło rzucające cień i posadzić mebel miękką plamą kontaktową. Key
zostaje 1.0 i zostaje jedynym rzucającym — modelowanie kupione w turze 8 nie
wraca do kasy; podnosi się tylko światło pod nim, żeby to, co key zostawia w
cieniu, było nadal KOLOREM, a nie dziurą.

**Hemisfera zamiast samego ambientu.** Ambient to jedna liczba z każdej strony,
czyli jedyna rzecz, którą światło w pokoju nigdy nie jest. `studio.hemisphere`
(niebo `#fdf6e8`, podłoga `#c8c0b0`, 0.5) kosztuje tyle co ambient — brak mapy
cienia, brak drugiego przebiegu — i to on pozwala podnieść wypełnienie bez
zamiany sceny we mgłę.

**Cień kontaktowy przebudowany na CIĄG.** Tura 6 malowała jeden kwadrat na
jednostkę; to, co czyta się jako „szafki lewitują", to lewitujący CIĄG, a plama
per-szafka zostawia jasny szew na każdym styku. Teraz jest jeden drei
`<ContactShadows>` dopasowany do tych samych granic mebli, do których dopasowany
jest frustum światła klucza (`ShadowFit`), z `frames={1}` i React-owym `key`
liczonym z tego dopasowania — piecze się RAZ na zmianę układu, a orbitowanie
(czyli to, co joiner robi cały dzień) kosztuje zero. `3d/ContactShadow.jsx`
usunięty; `appearance.contactShadow` ma trzy nowe liczby: `opacity 0.5`,
`blur 2.5`, `farMm 400`.

**Pułapka, której CLAUDE.md nie mógł przewidzieć, znaleziona przy wdrożeniu.**
drei piecze plamę renderując CAŁĄ scenę materiałem głębi (`scene.overrideMaterial`)
kamerą ortograficzną stojącą NA podłodze i patrzącą W GÓRĘ. To znaczy, że do
plamy trafiłyby: podłoga (`DoubleSide`, dokładnie na płaszczyźnie bliskiej — na
czarno przez cały kadr), ściany (0…400 mm nad podłogą), etykiety wymiarowe
(sprite w zasięgu 400 mm od podłogi to przy szafce 770 dokładnie etykieta
wysokości) i strzałki dystansu (120 mm nad bazą). Rozwiązane natywnym hakiem
three 0.180: `material.allowOverride = false` na pokoju i na całym chromie
(`Room`, `DimLabel`, `EdgeHandle`, `SelectionOutline`, `DistanceArrows`,
`AddPlus`). Semantycznie to jest dokładnie to zdanie, które chcemy powiedzieć:
**pokój jest tym, NA co cień pada, a narzędzie nie rzuca cienia w ogóle.**

**F1.4 — spray dalej bez envMap.** Sprawdzone po edycjach przez odczytanie
`src/3d/materials.js`: `sprayed = finishExposed && !isDecor`, a `envMapIntensity`
= 0 dla natrysku i 1 dla płyty. Reguła hybrydowa tury 8 nietknięta; test F6
pyta o nią jeszcze raz, bo F6 dokłada NOWĄ drogę dojścia do natrysku.

**Brama fazy:** `frames={1}` sprawdzone w źródle drei (licznik `count < frames`),
więc widok roboczy nie płaci za plamę per klatkę.

---

## F2 — [HIGH] „+" zamiast strzałek — ✅ ZIELONA

**Werdykt właściciela wykonany: strzałki usunięte.** Był to trójstanowy przełącznik
◀ / auto / ▶ w panelu Library (tura 8, F2.1), i powód, dla którego był mylący, jest
wart zapisania: **kazał opisać MIEJSCE słowami, w panelu, zanim się powiedziało, o
którą szafkę chodzi.**

Pytanie jest teraz zadane odwrotnie. Każdy wolny koniec każdego ciągu nosi „+"
stojący w szczelinie, którą wypełni; kliknięcie mówi całe zdanie naraz — TEN
koniec TEGO ciągu — zanim biblioteka się w ogóle otworzy.

- **Matematyka szczeliny jest czysta i osobno testowana:** `engine/runs.js`
  `runEndGap()` i `addPlusPoints()`. Szczelina to ODLEGŁOŚĆ WOLNA od zewnętrznej
  krawędzi ciągu do następnej rzeczy: sąsiada na tym samym poziomie albo ściany.
  Mierzona przez `paddedSpan`, więc **end panel liczy się jako część szafki** —
  szczelina mierzona do korpusu oferowałaby 18 mm, w których już coś stoi.
- **Próg:** `profile.ui.addPlusMinGapMm = 100` (nowy blok `ui` w profilu).
  Uzasadnienie w liczbach warsztatu: `autoParts.sideInfill.maxWidth` to 120, więc
  wszystko węższe jest robotą fillera, nie szafki. Poniżej progu plus znika —
  bo oferowanie miejsca, które umieszczanie odrzuci sekundę później, to
  oferta-kłamstwo. Test pyta o próg z DWÓCH stron, w krokach 0,5 mm.
- **Poziomy się nie blokują:** szafka wisząca nie zamyka szczeliny obok stojącej.
- **Mechanika wstawiania NIETKNIĘTA.** `+` woła `projectStore.addUnit(typeId,
  { near, side })` — to jest kod tury 8, `freeSlotOnWall` przyjmuje `'left'`/`'right'`
  od tury 8. Ta faza zmieniła WYZWALACZ, nie mechanikę, i test przeprowadza
  kliknięcie do końca: plus po lewej naprawdę stawia szafkę po lewej.
- **Overlay reużyty, nie wymyślony:** `3d/AddPlus.jsx` to sprite z teksturą
  z canvasu — ten sam wzorzec billboardu co `DimLabel` od tury 1. Nosi `ccHelper`,
  więc nie wchodzi do renderu i nie rzuca cienia kontaktowego.
- Panel Library mówi teraz ZDANIE („Adding to the left of 03"), a nie zadaje
  pytania; otwarty z MENU zachowuje się dokładnie jak przed turą 8: obok
  zaznaczenia, po tej stronie, gdzie jest miejsce.

Wymiarowe strzałki z tury 3 (`3d/DistanceArrows.jsx`) **nietknięte** — poza
jednym `allowOverride={false}` z F1, który nic nie rysuje.

---

## F3 — [HIGH] Odstępy półek — formuła LISP-a, dosłownie — ✅ ZIELONA

Piotr: po wyśrodkowaniu odstępy NIE są równe. Miał rację, a przyczyna jest
arytmetyczna: tura 8 rozkładała półki po **PASIE PRZECIĄGANIA**, a nie po
**STREFIE PÓŁEK**.

Pas to strefa zwężona o `editor.minShelfEdgeGap` (40 mm) z każdej strony — to
odpowiedź na pytanie „jak blisko końca WOLNO przeciągnąć półkę", a nie na pytanie
„gdzie ma stanąć równo rozłożona półka". Rozkładanie po nim robi skrajne otwory
o dokładnie te 40 mm inne od środkowych. Nikt tego nie wymyślił — nikt tego nie
sprawdził.

Weszła arytmetyka AutoLISP-a, `KIT_WARDROBE_FULL.lsp` `drawWardrobeShelvesFront`
(linie 133–142):

```
spacing  = (shelfZoneTop − shelfZoneBottom) / (numShelves + 1)
shelfY_i = shelfZoneBottom + spacing · i        dla i = 1..numShelves
```

**Granice strefy to granice LISP-a** (te same linie 687–692): GÓRNA POWIERZCHNIA
tego, co zamyka przestrzeń pod spodem — partition szuflad, partitioner railu albo
płyta dolna — do SPODU wieńca górnego. To dokładnie `floor`/`ceiling`, które
`engine/collision.js shelfBand()` liczy od tury 3; zmiana to podmiana `min`/`max`
na `floor`/`ceiling` i nic więcej.

**`shelfY` to SPÓD półki, nie jej oś** — CLAUDE.md kazał to potwierdzić w sekcji
wiercenia i LISP mówi to dwa razy: rysuje płytę od `shelfY` do `shelfY + G`
(linia 143) i wierci klaster kołków na `shelfY − 50 / shelfY / shelfY + 50`
(linie 411–416), czyli w rzędzie, na którym półka SIEDZI. `pos_mm` znaczy tu to
samo od tury 1, więc obie konwencje już się zgadzały i nic nie trzeba było
przesuwać.

Funkcja jest czysta i mieszka w silniku: `engine/items.js evenShelfPositions()`.

**Drugi błąd, znaleziony przy okazji i naprawiony.** Tura 8 rozdawała pozycje
w kolejności TABLICY. Półki dodają się od góry w dół (`nextShelfPos`), więc
tablica jest MALEJĄCA — najwyższa półka dostawała najniższe miejsce i stos
wracał odwrócony. Widać to dopiero, gdy jedna z nich była wcześniej przeciągnięta,
i dlatego przeszło niezauważone. Teraz pozycje idą w kolejności SILNIKA
(od dołu), czyli w tej, którą S1..Sn znaczy wszędzie indziej.

Testy liczą wartości RĘCZNIE z formuły (1, 2, 3 półki; strefa z szufladami pod
spodem), plus własność: N półek robi N+1 RÓWNYCH kroków. `fixtures/` bez zmian.

---

## F4 — [HIGH] Edycja per-element — ✅ ZIELONA (zakres uściślony, patrz niżej)

Do tury 9 najmniejszą rzeczą, którą dało się w tej aplikacji edytować, była cała
szafka. Półka była wierszem listy z wysokością — a odpowiedzią na „ta niesie
mikrofalówkę, zrób ją 25 w dębie" była druga szafka.

**Zaznaczenie elementu.** `uiStore.selectedElement = { unitId, elementRef }`,
gdzie ref to **własny identyfikator panelu z silnika** (`SHELF-2`) — ten sam,
który rysuje widok 3D, drukuje BOM i układa arkusz CNC. Zero drugiej tożsamości
do utrzymania. Zaznaczalne jest to, co ma rolę `shelf` (SHELF, PARTITION,
RAIL-PART) — pytanie o ROLĘ, nie lista nazw części. Podświetlenie to **ten sam
znak, który dostaje szafka** (`SelectionOutline`, niebieska kreskowana ramka),
narysowany wokół pudełka elementu z danych silnika. Escape cofa O JEDEN POZIOM:
pierwszy raz gubi półkę, drugi szafkę; kliknięcie w tło dalej czyści oba naraz.

**Chwyć i pociągnij w głąb.** Płaszczyzna POZIOMA na wysokości półki, trafienie
mierzone wzdłuż własnej osi `inward` jednostki — więc szafka na ścianie 3 pokoju
w kształcie L nie potrzebuje żadnego wyjątku. Zapisywane jest COFNIĘCIE od lica,
czyli liczba, którą silnik już przyjmuje (`front_mm`, tura 8) i którą joiner mówi
na głos. Klamra: `engine/collision.js elementDepthBounds()` — 0 to lico,
a tył zatrzymuje się `editor.minElementDepth` (nowa liczba, **100 mm**) przed
końcem, bo półka przeciągnięta do samej płaszczyzny konstrukcyjnej to 4-milimetrowy
pasek z wpisem w liście cięcia i dwiema oklejonymi krawędziami. Sink traci swoje
50 mm cofniętego pleców ZANIM ktokolwiek cokolwiek pociągnie.

**Która oś:** półka nietknięta chodzi w GÓRĘ I W DÓŁ, jak zawsze — i to dotknięcie
ją ZAZNACZA. Kiedy jest już zaznaczona, ten sam chwyt ciągnie ją w GŁĄB. Dzięki
temu żaden z dwóch gestów nie potrzebuje klawisza modyfikującego; wysokość zostaje
polem liczbowym w panelu przez cały czas, a Escape oddaje pionowy przeciąg.

**Właściwości per element** w `RightPanel` (sekcja pojawia się NAD korpusem, bo
kiedy jest, to jest to, na co joiner patrzy): wysokość, cofnięcie (z pokazaną
głębokością CIĘCIA), grubość, materiał. Każde pole ma powrót do „bez nadpisania",
bo „płyta korpusu" to inne zdanie niż „18" — i tylko jedno z nich idzie za
projektem, gdy projekt się zmieni. Lista materiałów to `elementMaterialChoices()`:
**własne płyty projektu 1–3 plus fronty**, czyli to samo źródło, z którego korzysta
Design Settings.

**Model danych — reguła `paramsForEngine()`, bez wyjątku.** Nadpisania siedzą na
POZYCJI (`params.sections[0].items[]`), czyli w konfiguracji jednostki, i jadą do
silnika tą samą drogą co cokół, top infill i end panele. **Silnik dostał trzy
WEJŚCIA i zero nowych wzorów.** Gołe `computeCabinet()` bez nadpisań tnie co do
milimetra to, co tnie kit — jest to przybite osobnym testem obok fixtures.

Jedna decyzja nazewnicza warta zapisania: **cofnięcie NIE dostało drugiego pola.**
CLAUDE.md nazywa je `depthSetbackMm`; w danych jest to `front_mm`, które od tury 8
znaczy dokładnie to samo. Dwa pola na jedną liczbę to dwa miejsca, w których ta
liczba może być inna. Etykieta w UI mówi „Set back", akcja store'u nazywa się
`setElementDepth`, a pole jest jedno.

**Prawda w dół rzeki.** Grubość jedzie jako `panel.thickness` i jako `box.h`
(półka rośnie W GÓRĘ od rzędu kołków, bo `pos_mm` to spód — półka rosnąca w dół
spadałaby z kołków, które ją trzymają). **Śruby półki PRZYKRĘCONEJ przeniosły
się na jej WŁASNĄ oś**: 25-milimetrowa półka wiercona w osi płyty korpusu jest
wiercona 3,5 mm obok, a na 25-milimetrowej krawędzi to różnica między śrubą
w środku a śrubą, która ją rozłupuje. Materiał jedzie do BOM-u jako
`material_label` — i **wszedł do klucza scalania wierszy**, bo dwie identyczne
półki z dwóch różnych płyt to dwie linie, albo połowa z nich zostanie wycięta
w złym arkuszu. Grupowanie CNC i rysunki biorą element **istniejącym potokiem**:
ta sama grupa (`shelves`), ten sam outline, te same pola — inne tylko liczby.

**Zakres — uczciwie.** CLAUDE.md pisze „półki (regulowane + stałe) i PIONOWE
partitiony". W tym silniku **nie ma pionowego partitionu**: `PARTITION`
i `RAIL-PART` to poziome płyty budowane przez silnik ze stosu szuflad pod nimi,
a jedyna pionowa płyta wewnętrzna to `DP` (panel prowadnic), który nie jest
elementem użytkownika. Wykonane więc: półki obu wariantów w pełni; partitiony
zaznaczalne, podświetlane i z JEDNYM realnym nadpisaniem — cofnięciem
(`partition_front_mm`, tura 8) — bo szerokość, wysokość i pozycja partitionu
wynikają ze stosu i nie mają gdzie trzymać własnej wartości. Zapisane
w **BLOCKERS #50**.

---

## F5 — [MEDIUM] Sheen 5–100 % co 5 — ✅ ZIELONA

Skala 0–25 wyszła. Lakier zamawia się jako PROCENT połysku i tak go czyta
lakiernik, dostawca farby i klient — a na skali tury 8 było zero, a lakieru bez
połysku nie ma. `profile.appearance.sheenScale = { min: 5, max: 100, step: 5,
default: 60 }`. Wzór `roughness = 1 − sheen/100` wychodzi z formuły, która już
tam była (`1 − v/max`), więc zmieniła się LICZBA w profilu, a nie wzór
w komponencie — 60 % to roughness 0.4, czyli dokładnie domyślny satyn tury 8
(15 × 4).

**Migracja jest jednokierunkowa i wykonuje się RAZ**, i to „raz" jest tu istotne:
`migrateDesign()` biegnie przy KAŻDYM odczycie każdego designu w aplikacji, więc
reguła bez wersji mnożyłaby tę samą wartość przez cztery co render, aż zatrzymałaby
się na 100. Stąd `DESIGN_SCHEMA 1 → 2`: wartość ≤ 25 na designie sprzed schematu 2
jest mnożona przez 4 i przycinana do [5, 100]; design ze stemplem nie jest dotykany
nigdy więcej. 20 znaczy przeciwne końce puszki na obu skalach i **tylko stempel
potrafi je rozróżnić**. Stare 0 idzie na 5 (×4 to 0, klamra podnosi).

Przy okazji uszczelnione `setDesign()`: łata jest teraz nakładana na design
JUŻ zmigrowany, żeby świeżo wpisane 25 nie trafiło pod regułę i nie zapisało się
jako 100. W praktyce `loadProject`/`newProject` migrują na wejściu, ale tryb
awarii jest tu niewidoczny i niszczący, więc nie zostawiono go na słowo honoru.

Etykiety przeliczone na pasma lakiernika (Dead matt / Matt / Eggshell / Satin /
Semi-gloss / Gloss), suwak pokazuje ćwiartki zamiast dwudziestu liczb.

---

## F6 — [MEDIUM] Kolory natryskowe na fronty — ✅ ZIELONA

Tura 8 miała to zbudowane w połowie: `design.colour.front` docierał do widoku 3D
(drzwi wychodziły granatowe) i **do niczego więcej** — lista cięcia, PDF i karta
produkcyjna dalej nazywały płytę pod farbą. Na projekcie z dekorem na korpusie
karta pisała „EGGER H1180 … / Hague", czyli dekor, z którego drzwi nie są zrobione,
obok koloru, z którego są.

Naprawa to jedno zdanie: **NATRYSK JEST WYKOŃCZENIEM.** `resolveFinishes()`
zwraca go w slocie `front`, PRZED jakąkolwiek płytą — bo farba kryje dekor
dokładnie tak, jak kryje go w warsztacie — a wszystko w dół rzeki i tak czyta tę
jedną funkcję. Nazewnictwo w jednym miejscu (`sprayFinishLabel`): `RAL 3005 Wine
Red spray`, `F&B Railings 31 spray`, `#1f3a5f spray`. Jedna konwencja, cztery
konsumenci (BomPanel, PDF, karta jednostki, etykiety części).

W UI **„Sprayed" jest trzecim ŹRÓDŁEM** obok „This app" i „EGGER decors", i
mieszka w nim **istniejący `ColourPicker`** (RAL / F&B / hex,
`reference/colors/psw-colors.json`, wpięty od tury 3) — żadnego nowego pickera,
bo drugi picker to drugie miejsce, w którym numer RAL może być zły. Kontrolka
przeniosła się tam z dna ekranu, gdzie nazywała się „Front colour" i gdzie
człowiek szuka OSTATNIO odpowiedzi na „z czego są drzwi". Suwak sheenu został na
miejscu — działa na każdy natryskiwany element w robocie, także cokół i end
panele, niezależnie od tego, czy ktoś wybrał kolor frontów.

Renderowanie się nie zmieniło i nie musiało: `surfaceFor()` już dawało lakier
zabarwiony hexem i `envMapIntensity: 0`. Test pyta o to jeszcze raz, bo dochodzi
NOWA droga dojścia do natrysku.

BOM dostał kolumnę **Material** (grubość · materiał) — to widoczna połowa F6.3
i F4.5 naraz.

---

## F7 — Dokumentacja + BRAMA

| brama | wynik |
|---|---|
| `rm -rf node_modules && npm install` (pełny) | ✅ |
| `npm test` | ✅ **797/797**, podłoga 727 + 70 nowych |
| `npm run build` | ✅ czysty |
| `git diff --stat fixtures/` | ✅ pusty |
| `git diff package.json` | ✅ pusty — zero nowych zależności |
| `grep -rn "from 'react'\|from 'three'" src/engine/` | ✅ pusty |

**Nowe pliki testowe (70 testów):** `test/add-plus.test.js` (17),
`test/element-editing.test.js` (22), `test/shelf-spacing.test.js` (13),
`test/spray-fronts.test.js` (11), plus 7 dopisanych do `test/render.test.js`
i przepisana `test/sheen.test.js`.

**Nowy kod aplikacji:** `src/3d/AddPlus.jsx`. **Usunięty:**
`src/3d/ContactShadow.jsx` (zastąpiony jedną plamą na ciąg).

**Zmiany w istniejących testach — wszystkie jako konsekwencja zmiany, nie
naginanie bramy:**
- `test/render.test.js` „studio rig" — asercja `key > 3 × ambient` była PROXY
  dla reguły, a nie regułą. Tura 9 świadomie podnosi światło płaskie (filozofia
  PSW), a acne, które ta asercja przytrzymywała, jest naprawione tam, gdzie się
  acne naprawia — w `normalBias`. Zapisana jest teraz REGUŁA: key bije światło
  płaskie i jest jedynym rzucającym cień. Doszły asercje o `normalBias`
  i o tym, że render jest MNIEJ podatny na acne niż widok roboczy, nie bardziej.
- `test/render.test.js` „high shadows" — `>` na `>=`, bo `normal` poszło z 1024
  na 2048.
- `test/sheen.test.js` — cała skala się zmieniła; plik przepisany na 5–100 %
  plus sześć nowych testów migracji.
- `test/design.test.js` — `schema` 1 → `DESIGN_SCHEMA` (napisane przez stałą,
  więc następny bump go nie ruszy).

**Nowe liczby w `profile.js`** (rule 2 — wszystkie z komentarzem w języku warsztatu):
`appearance.studio.hemisphere`, `render.shadow.*.normalBias`,
`appearance.contactShadow` (przebudowane), `appearance.sheenScale` (przeskalowane),
`ui.addPlusMinGapMm`, `editor.minElementDepth`.

**BACKLOG:** dopisane **#55** (mitra ma się zatrzymywać na end panelu / infillu
terminalnym — zaparkowane przez właściciela) i **#56** (nota do #42: X-ray do
przeprojektowania w T10, czeka na zrzut referencyjny Piotra).
**BLOCKERS:** **#50–#53**.

Nic nie zostało cofnięte. Nie ma pytań do Piotra — jedyna rzecz, która czeka na
JEGO ruch, a nie na kod, to zrzut referencyjny do X-raya (BACKLOG #56) i oko na
oświetlenie z F1, o które CLAUDE.md prosi wprost („eye test jest Piotra").

---

# TURA 10 — REALIZM RENDERU: ŚWIATŁO, CIEŃ I POKÓJ (08.08.2026, fazy F0–F6)

Jeden podsystem, zrobiony do końca. Werdykt właściciela po turach 8–9 i dniu
hotfixów brzmiał „realizm poszedł": cienia pod szafkami nie widać, natryskowe
fronty czytają się jak płaski mat, a ściana i podłoga zlewają się w jedną białą
plamę. Tura 10 nie kończy się na „kompiluje się" — kończy się na zrzutach
z prawdziwej przeglądarki w `verify/t10/`, i to one są dowodem.

**Wynik bramy:** 803/803 testów (797 + 6 nowych), build czysty, `fixtures/`
i `package.json` nietknięte, `src/engine/` bez importu react/three, 7 zrzutów
w `verify/t10/` + dwa pliki pomiarów.

## Dwa błędy, które trzeba było ZNALEŹĆ, a nie tylko dostroić

Obie regresje z F2 miały tę samą przyczynę źródłową co pułapka `scale = 10`
z tury 9, i obie potwierdzają regułę 13 (**przeczytaj domyślne wartości
biblioteki w JEJ ŹRÓDLE**):

**1. Rozmycie zjadało wypieczony cień — na KAŻDEJ maszynie, nie tylko tutaj.**
drei piecze cień do render targetu, a potem rozmywa go dwoma przebiegami,
renderując pełnowymiarowy quad (`blurPlane`) TĄ SAMĄ kamerą ortograficzną.
`blurPlane` powstaje przez `new THREE.Mesh(planeGeometry)` i **nigdy nie jest
dodawany do grupy** — jego macierz świata to identyczność, więc leży w środku
układu świata. Kamera jest dzieckiem grupy, więc jedzie tam, gdzie grupa.
Tura 9 dała grupie `position={[cx, 1 mm, cz]}`:

- przesunięcie x/z → przebieg rozmycia czyta i zapisuje obszar przesunięty
  dokładnie o (cx, cz) względem wypieczonego cienia;
- przesunięcie y → gorzej. Kamera jest obrócona tak, że patrzy DO GÓRY
  (`rotation-x` π/2), a `near` w drei domyślnie wynosi 0 — więc podniesienie
  grupy o milimetr stawia quad milimetr ZA płaszczyzną bliską. Jest obcinany,
  nic się nie rysuje, a przebieg rozmycia nadpisuje zupełnie dobry wypiek
  pustym targetem.

**Zmierzone, nie wydedukowane.** Sonda w `readRenderTargetPixels` wstawiona
lokalnie między dwa wywołania drei (nigdy nie commitowana, `node_modules` nie
jest naszym diffem — CLAUDE.md F2.2): **max alpha 255 przed rozmyciem, 0 po
nim.** Po naprawie: 255 przed, **185 po**. Zapis w `verify/t10/bake-probe.json`.

Naprawa: plama jest zakotwiczona tam, gdzie drei jej potrzebuje — w środku
układu świata, na poziomie podłogi — a odsuwa się POKÓJ
(`appearance.room.floorOffsetMm`, 0,5 mm). Ceną za stałą kotwicę jest płótno
sięgające od środka pokoju do mebla, więc oba grzechy tury 9 są teraz niesione
jawnie: `texelMm` trzyma rozmiar teksela (a więc rozdzielczość rośnie z pokojem),
a `blurMm` trzyma rozmycie W MILIMETRACH, bo drei liczy je jako ułamek płótna —
ta sama liczba to dwa razy większa miękkość na dwa razy mniejszym płótnie,
i dokładnie tak rozpuścił się cień tury 9.

**2. `allowOverride = false` nie znaczy „pomiń mnie".** three (WebGLRenderer,
linia 1987) czyta to jako „renderuj MOIM materiałem" — obiekt nadal trafia do
przebiegu głębi, tylko ze swoim własnym, nieprzezroczystym materiałem. Podłoga
zostawiona w polu widzenia kamery cienia zapiekłaby się jako jeden lity
prostokąt. Dlatego pokój musi być FIZYCZNIE pod kamerą, a nie tylko oznaczony.

**3. Emisja to część powierzchni, której ŻADEN cień nie przyciemni.** Tura 9
niosła 0,42 ściany i podłogi jako emisję (`studio.roomBounce`) — czyli 42 %
kadru, na które nie działa ani światło, ani mapa cienia. To jest arytmetyka
stojąca za „jedną białą plamą" i za „cienia prawie nie widać". Rozbite na
`appearance.room.bounce` per powierzchnia: ściana 0,42 → 0,18, podłoga → 0,10.

## Co gdzie wylądowało

**F0** — `scale={1}` był już na main (hotfix właściciela). Baseline 797/797.

**F1 — jupitery.** `appearance.studio.spots`: TABLICA specyfikacji SpotLight,
wpięta w `Lights` w `src/3d/Scene.jsx`. Pozycje jako ułamki dystansu rigu (ta
sama konwencja co key/fill/rim), cel = środek dopasowania, więc kąt pod
horyzontem to `atan(y / hypot(x, z))` = **44,1°** przy `(±0,50, 0,62, 0,40)` —
„~45° w dół", o które prosił właściciel. Intensywności FIZYCZNE (three r0.180,
decay 2): **38 i 32 kandeli**, para nierówna celowo, bo rig z dwóch identycznych
lamp w lustrzanych pozycjach nie ma strony kluczowej. Stożek `angle` 0,62 rad,
`penumbra` 0,68 / 0,73.

- **Budżet cienia (F1.4): decyzja podjęta OKIEM — cień zostaje przy KEY.**
  Spot zawieszony w górnym przednim narożniku rzuca cień w dół i DO TYŁU, pod
  korpus i w ścianę, gdzie szafka i tak go zasłania: kupuje przebieg głębi
  i nie pokazuje prawie nic. Key wchodzi z przedniej ćwiartki i kładzie cień
  W POPRZEK otwartej podłogi obok ciągu — jedyne miejsce, gdzie go widać.
  Obie wersje przemierzone; `shadowCasters: 2` i `keyCastsShadow: true` są
  danymi, a `Lights` LICZY rzucających, żeby warsztat nie mógł ręcznie dać
  widokowi roboczemu pięciu przebiegów głębi.
- **Trzeci, niższy spot (F1.3):** wypróbowany, odrzucony — bił się z parą
  o tę samą ścianę. To, o co naprawdę prosił obraz, to więcej penumbry na
  parze. Tablica została tablicą, więc dopisanie go to cztery linijki
  w `profile.js` i zero w komponencie.
- **F1.5 — punktowe „glinty" WYGASZONE.** Test orbity (to, o co prosi
  CLAUDE.md) uruchomiony w trzech wariantach: z czterema punktami, z dwoma
  od strony widza i bez żadnego. Plama na drzwiach przy sheenie 90 ląduje
  w tych samych trzech miejscach orbity i z tą samą siłą: **(0,77, 0,19) ×1,11
  · (0,88, 0,21) ×1,19 · (0,88, 0,30) ×1,12** z pustą tablicą, wobec
  ×1,11 / ×1,20 / ×1,13 z pełną. Wędrujący połysk nigdy nie był ich zasługą —
  robi go hotspot spotów plus sonda otoczenia 0,25. Tablica zostaje w pliku
  jako zakomentowany przykład, struktura nietknięta.
- **F1.6** — spoty niosą `userData ccLight: 'spot'`, a `render.lightScale` ma
  `spot: 1`. Dołożone też **głębokie scalanie `lightScale`** w migracji:
  profil zapisany przed tą turą ma pięć ról i płaski spread SKASOWAŁBY szóstą.

**F2 — cień podłogowy, sprawdzony od końca do końca.** Poza naprawą powyżej:
`opacity` 0,50 → **0,62**, `farMm` 400 → **300** (400 sięgało powyżej cokołu
i rozmazywało ciemność w kałużę szerszą od mebla), `blur` 2,5 → **`blurMm` 22**,
`texelMm` 4, `maxResolution` 1024. Na pokoju 4 × 3 m płótno wychodzi
1,80 × 4,18 m przy 1024², czyli **4,1 mm na teksel** — gęstość, którą tura 9
chciała mieć. Cień key'a i plama czytają się jako JEDNO ugruntowanie: key kładzie
kształt w bok, plama siedzi pod cokołem.

**F3 — pokój, który da się przeczytać.** `appearance.room`: ściana `#f7f5f1`,
podłoga `#e6e0d5` (cieplejsza i wyraźnie ciemniejsza), tło `#fafaf8` — trzy
rozróżnialne wartości, tło najjaśniejsze, bo widać je NAD ścianami i nie może
czytać się jako powierzchnia. Podłoga czytana przez `src/3d/Room.jsx` przez
`tone()`, bez żadnego hexa w komponencie. Światło płaskie przesunięte:
ambient 0,45 → **0,20**, hemisfera 0,50 → **0,45** — proporcja światła
kierunkowego do bezkierunkowego idzie z 0,45 : 0,50 na 0,20 : 0,45.

**F4 — PĘTLA.** `scripts/e2e-turn10.mjs` (zero zależności, przez `scripts/cdp.mjs`)
buduje scenę standardową PRZEZ APLIKACJĘ: nowy projekt → Kuchnia → cały pokój →
prostokąt → trzy szafki dolne z drzwiami → Ustawienia ▸ Design ▸ Natryskowe →
RAL 3005 Wine Red → sheen. Potem fotografuje i MIERZY. Strojenie idzie przez
`--override`, który wstrzykuje profil do `localStorage` (własna trwałość
`cabinetProfileStore`), więc iteracja to przeładowanie strony, a nie build;
**bieg finalny jest zawsze bez override**, więc zrzuty są z liczb, które lecą.

Iteracji strojących: **11** (5 sweepów po 5 wariantów plus 6 pełnych biegów).
Trzy z nich naprawiały nie scenę, tylko POMIAR, i to jest osobna lekcja tej tury:

1. „podłoga obok ciągu w tych samych wierszach" mierzyła 0,074 różnicy przy
   WSZYSTKICH cieniach wyłączonych — bo skos złączenia ściany z podłogą
   przecina te wiersze i połowa „obok" była ŚCIANĄ (czyli mierzyliśmy farbę
   z F3, nie światło). Złączenie jest teraz wykrywane per kolumna
   i interpolowane pod ciągiem;
2. odniesienie „otwarta podłoga" to 80. percentyl wszystkich pikseli podłogi,
   bo cień key'a leży dokładnie tam, gdzie leżało stare odniesienie;
3. „pod ciągiem" to LINIA COKOŁU — pierwszy piksel podłogi pod każdą kolumną
   mebla — a nie prostokąt wierszy: ciąg widać pod kątem, więc podłoga przy
   jego lewym końcu jest metry dalej niż przy prawym. Prostokąt raportował
   0,006 dla plamy, która w najlepszym wierszu miała 0,065.

Nasycenie HSL wyleciało jako miara „czy biel jest biała" — dla każdego odcienia
bieli wychodzi 1,0. Zastąpione CHROMĄ (max − min kanału).

**Kryteria akceptacji, bieg finalny (build czysty, bez łatki drei):**

Liczby poniżej są dokładnie tym, co leży w `verify/t10/measurements.json`
z biegu, z którego pochodzą zrzuty (**15/15**):

| | mierzone | próg | wynik |
|---|---|---|---|
| A siedzenie | otwarta podłoga 0,894 vs linia cokołu 0,843 | Δ > 0,012 | **Δ 0,052** (najciemniejsza dziesiątka 0,254 niżej, 150 kolumn / 2400 px) |
| B połysk, sheen 90 | (0,77 0,19) ×1,12 · (0,96 0,25) ×1,30 · (0,04 0,21) ×1,14 | trzy różne miejsca, ×>1,06 | **rozstaw 0,92 szerokości ciągu** |
| B sheen 60 | szczyt/mediana | > 1,03 | **1,22** |
| C złączenie | 98 % ze 100 kolumn, ściana i podłoga 0,203 od siebie | ≥ 90 %, > 0,02 | **✅** |
| C gradient ściany | mediana −0,023 od góry ściany do złączenia | \|·\| > 0,012 | **✅** (było 0,004) |
| C drugi kąt | 96 % z 98 kolumn, gradient −0,025 | jw. | **✅** |
| D barwa | odcień 352,9° vs RAL 352,1° | < 12° | **0,8°**, rgb 132,47,57 |
| D przepał | 0,11 % frontu | < 0,5 % | **✅** |
| D biel korpusu | chroma 0,015 (płyta sama ma 0,024) | < 0,06 | **✅** |
| E orbita | 24 → 24 wypieki przez dwie orbity i 5 s bezczynności | 0 | **✅** (bieg z sondą) |
| E rzucający cień | 1 (DirectionalLight) | ≤ 2 | **✅** |
| E wypiek ≠ 0 | max alpha 180/255 w środku targetu 1024² | > 4 | **✅** |
| — still | 1920×1142, rozpiętość tonalna 191 | > 90 | **✅** — ten sam rig (reguła 16) |

**Uczciwie o rozrzucie:** orbita jest sterowana syntetycznymi zdarzeniami myszy
przez `OrbitControls` z tłumieniem, więc kamera nie ląduje co do piksela w tym
samym miejscu w każdym biegu. Kryterium A waha się między biegami od Δ 0,05 do
Δ 0,12 — zależnie od tego, ile podłogi przy cokole widać pod danym kątem. Próg
0,012 jest przekroczony czterokrotnie w najgorszym zmierzonym biegu, a wszystkie
pozostałe kryteria są stabilne co do trzeciego miejsca po przecinku.

`verify/t10/`: `A-seating-3-4.png`, `B1/B2/B3-glint-sheen90.png`,
`B4-sheen60-gradient.png`, `C-room-depth.png`, `D-render-still.png`,
`measurements.json` (wszystkie liczby biegu finalnego), `bake-probe.json`
(dowód z F2.2).

**Uwaga o `frames={1}`.** Licznik drei to zwykłe `let count = 0` w CIELE
komponentu, nie ref — więc „jedna klatka" znaczy „jedna na każdy re-render",
nie „jedna na zawsze". Cały bieg kosztuje 24 wypieki (zmiany układu
i re-rendery `FloorShadow`); **orbita kosztuje zero**, i to jest liczba, o którą
chodzi w kryterium E. Zmierzone osobno.

**F5 — testy.** 803/803. Zmieniony jeden istniejący (`test/render.test.js`,
„contact shadow is a run") — bo `blur` przestało istnieć, a razem z nim
przestało istnieć pojęcie miękkości bez jednostki; komentarz w teście niesie
POWÓD. Sześć nowych, wszystkie o KSZTAŁCIE, nie o guście: spoty jako lista
z geometrią ~45°, budżet cienia jako dane, zmiana LICZBY lamp przez
`migrateCabinetProfile` (jeden spot zostaje jednym, trzeci przechodzi, profil
sprzed tury bierze rig w całości, wpis bez `intensity` jest odrzucany),
`points` jako lista mimo że tura wysyła ją pustą, `lightScale.spot` plus
migracja starego profilu, trzy tony pokoju jako PORZĄDEK (tło > ściana > podłoga,
podłoga cieplejsza) i emisje.

**Nowe liczby w `profile.js`:** `studio.spots`, `studio.spotReach`,
`studio.shadowCasters`, `studio.keyCastsShadow`, `appearance.room.*`
(`wall`/`floor`/`background`/`bounce`/`floorOffsetMm`),
`contactShadow.blurMm`/`texelMm`/`maxResolution`, `render.lightScale.spot`.

**Nowe pliki:** `scripts/e2e-turn10.mjs`, `verify/t10/*`.
**Nic nie zostało cofnięte.** Do decyzji właściciela zostaje jedno: OKO na
finalny obraz — liczby mówią, że wszystkie pięć kryteriów jest spełnione, ale
„ładnie" jest jego.

---

# TURA 11 — PACZKA CODZIENNEGO UŻYTKU (08.08.2026)

Dwadzieścia cztery werdykty właściciela z żywego użycia plus krok 5 „nowego
projektu". Baza: `main` po scaleniu T10 — **803 testy**, czysty build.
Koniec tury: **907 testów**, czysty build, `git diff --stat fixtures/` pusty,
`package.json` bajt w bajt, `src/engine/` bez importu Reacta i three,
eksport CNC **bajtowo identyczny** z bazą (dowód: `verify/t11/cnc-export-identity.md`).

## F0 — baza

Pełna instalacja, 803/803, czysty build. Zapisane; wszystko poniżej rośnie od
tej liczby.

## F1 — zaznaczanie i interakcja

**F1.1 — kliknięcie TŁA.** `onPointerMissed` na kanwie odpala się tylko wtedy,
gdy promień nie trafia W NIC — a podłoga i ściana są czymś. Dlatego kliknięcie
podłogi zostawiało zaznaczoną szafkę z jej kreskowanym boxem. Pokój mówi to
teraz sam: `Room.jsx` dostał `onBackground`, obie ścieżki (pudło kanwy i własne
powierzchnie pokoju) wołają jedną funkcję `dropSelection` w `Scene.jsx`. Tylko
lewy przycisk — prawy otwiera menu, a orbitowanie nie może odznaczać.

**F1.2 — dokładnie jedno zaznaczenie.** Kreskowany box szafki znika, gdy
zaznaczony jest jej ELEMENT (`selected && !selectedElement` w `UnitView.jsx`).
Razem z nim znika podświetlenie hovera: najeżdżanie na korpus szafki, w której
się właśnie pracuje, nie jest propozycją jej zaznaczenia.

**F1.3 — X-ray jako TRYB.** Dwie przyczyny, na dwóch końcach aplikacji.
(1) Stan nie był utrwalany — cokolwiek przeładowało kartę, wracało na `false`.
Leży teraz na tej samej półce co krok snapu (`localStorage`, `uiStore` →
`loadFlag`/`saveFlag`). (2) OBRAZ wracał do nieprzezroczystego mimo flagi: turn
7 przełączał `transparent` na materiale, dla którego three ma już skompilowany
program. Klucz materiału niesie teraz przezroczystość
(`key={decor-…}-${translucent ? 'through' : 'solid'}`) — nowy materiał to nowy
program. To jest ta połowa „resetu", której nie widać w store.

**F1.4 — menu kontekstowe.** Umieszczanie przeniesione do czystego
`lib/menuPlacement.js`: **najpierw odbicie** (menu, które nie mieści się pod
kursorem, otwiera się NAD nim), **potem przycięcie**. Turn 5 robił dwa
`Math.min` przeciwko ZGADYWANEJ wysokości (`actions.length * 30 + 40`) — bez
dolnego ograniczenia, więc na niskim ekranie wynik wychodził ujemny i menu
gubiło GÓRĘ zamiast dołu. Komponent mierzy się teraz naprawdę
(`useLayoutEffect` + `getBoundingClientRect`) i jest ukryty przez jedną klatkę,
żeby nie mrugnąć poza ekranem. Nagłówek jest uchwytem — menu się przeciąga.
9 testów, w tym przemiatanie całego ekranu 1366×640 czterema wysokościami menu.

**F1.5 — wymiary na CZERWONO.** `appearance.dimensions = { colour: 'red',
alt: 'navy' }` — KLUCZE do `dimensions.colours`, gdzie mieszkają heksy. Jeden
dom dla wyboru, drugi dla koloru; `dimensions.defaultColour` zniknęło.
`uiStore` czyta domyślny z profilu, a nie z własnej stałej. Podpisy W/H/D na
szafkach też są tą samą farbą — wymiar ma jeden kolor, gdziekolwiek jest.
Złoto zostaje ZAZNACZONEJ szafce: to nie jest wybór koloru, to odpowiedź na
„którą trzymam".

## F2 — odstępy półek: dokończone

**Diagnoza.** Strefa była dobra (przeliczona ponownie z
`KIT_WARDROBE_FULL.lsp` L684-692 i `KIT_LOW_CABINET_FULL.lsp` L253-259). Wzór
był JEDNOSTRONNY. AutoLISP rozstawia DOLNE LICA równo, a półka to 18 mm płyty —
więc każde światło NAD półką traci tę płytę, a jedyne, które nie ma pod sobą
półki, nie traci. Stąd 226,5 / 227 / **244,5**: różnica to dokładnie `G`.

**Poprawka.** `evenShelfPositions` przyjmuje `boardT`:
`gap = (top − bottom − n·G) / (n+1)`, `shelfY_i = bottom + i·gap + (i−1)·G`.
**Domyślnie 0**, i to nie jest lenistwo: bez `boardT` to jest AutoLISP co do
przecinka, czyli to, co dalej liczy własny fallback silnika (`assemblies.shelves`,
a przez niego wiercenie kołków i każdy golden fixture). Grubość podaje WARSTWA
PROJEKTU — przycisk „Even", store — a nie kit.

**F2.3 — dodana półka jest CENTROWANA.** `centredShelfPos` połowi największe
istniejące światło (mierzone między LICAMI, więc centrowana jest DESKA, nie jej
dolne lico). Turn 4 wypełniał od góry: pierwsza półka lądowała 40 mm pod
wieńcem i każdy komplet trzeba było poprawiać „Even". Stara reguła
(`nextShelfPos`) ZOSTAJE — „upchnij od góry" to inne pytanie z inną odpowiedzią.

**Testy.** 1/2/3 półki × trzy konfiguracje (goła szafka, szafka z szufladami,
szafka z cokołem) — WSZYSTKIE światła równe do 0,5 mm, mierzone z pudełek
paneli silnika, nie z pozycji w store. Plus test regresji, który pokazuje, że
stary wzór zostawia dolne światło dokładnie o jedną płytę większe.

## F3 — edycja per element

**F3.1 — cała szafka.** `engine/elements.js` mówi, CO jest elementem
(`isSelectableElement`), JAK się nazywa (`elementLabel`) i CO można o nim
powiedzieć (`elementFields`) — jedna reguła dla widoku 3D, panelu i testu.
Mechanizm szuflady (`DP`, `FILLER`, boki pudła) elementem NIE jest: wynika ze
stosu, a sposobem na jego zmianę jest zmiana stosu.

**Nadpisanie MATERIAŁU dla każdego elementu**, kluczowane ID panelu silnika
(`params.element_overrides` → `paramsForEngine` → jedno przejście po panelach
w `computeCabinet`). Materiał nie zmienia ŻADNEJ geometrii i dlatego można go
powiedzieć o czymkolwiek. **Grubość — nie dla czterech elementów złącza**;
powód i decyzja w BLOCKERS #58.

**F3.2 — panel boczny i infill osobno.** Wysokość, grubość, wysokość ponad
szafką i materiał zniknęły z sekcji „Construction" — edytuje się je na WŁASNYM
zaznaczeniu elementu. W panelu szafki zostaje FAKT, że kawałek istnieje.

**F3.3 — dwuklik.** Otwiera kartę `ElementModal` PRZY elemencie (to samo
`clampMenuPosition`, więc też nigdy poza ekranem) i ta karta i prawy panel
renderują JEDEN komponent `ElementProperties` — nie mogą się rozjechać.
Dwuklik nadal PRZYLATUJE kamerą do elementu (funkcja z tury 5).

**F3.4 — PIONOWY partition.** BLOCKERS #50 z tury 9 mówił poprawnie, że tego
w silniku NIE MA. Teraz jest: pozycja `{ kind: 'partition', x_mm }`, panel
`VPART-n` o roli `shelf` (więc zaznacza się, grupuje i idzie na arkusz z
półkami), `x_mm` to LEWE LICO — ta sama konwencja co `pos_mm` półki, jedna
reguła na obie osie. Bez czopów: pudło trzyma złącze puzzlowe, a przegroda w
środku jest przykręcana. Wiercenie do niej — BLOCKERS #59.

**F3.5 — zawiasy w SOLID.** Te same instancje co X-ray
(`engine/hardware3d.js`), w spokojniejszym tonie
(`appearance.hardware.hinge`). Prowadnice zostają za X-rayem — siedzą w
zamkniętym pudle szuflady. Przełącznik w grupie przełączników menu
kontekstowego, obok „Show all dimensions".

## F4 — stawianie i karmienie szafek

**F4.1 — za róg.** `engine/room.js wallAtPoint` (czysta arytmetyka: przed którą
ścianą stoi punkt i jak daleko wzdłuż niej) plus `moveUnitToWall` w store, który
jest RE-PARENTOWANIEM: ściana się zmienia, a potem ten sam zacisk co przy
suwaniu decyduje, gdzie na niej szafka może stanąć. Ściana bez miejsca ODMAWIA
i szafka wraca dokładnie tam, gdzie była. W `UnitView` przeciąganie rzutuje
kursor na PODŁOGĘ (jedna płaszczyzna dla całego pokoju) i pyta `wallAtPoint`.

**F4.2 — jeden wielki „+".** Zamiast linijki szarego tekstu na dole kanwy.
Otwiera Bibliotekę na kategorii, od której zaczyna się projekt tego typu.
Znika, gdy pojawia się pierwsza szafka; wraca, gdy scena jest pusta.

**F4.3 — wewnętrzny „+".** Tylko na AKTYWNEJ szafce, w INNYM kolorze
(`appearance.addPlus.inner` — złoto; plusy na końcach ciągu dostały
`appearance.addPlus.run`). Klik: szafka zostaje zaznaczona, prawy panel otwiera
sekcję „Add items".

**F4.4 — `itemsByContext`.** Dane w `profile.js` per RODZINA typu
(`kitchen`/`wardrobe`/`default`), plus „Show all" pod listą. FILTR, nie blokada.

## F5 — infill, cokół i prawdy o meblach

**F5.1 — insety L/P usunięte, PRZYPINANIE w ich miejsce.** Boczny filler już
pojawiał się i znikał sam; przypięty nie znika, gdy szafka odjedzie od ściany,
i ROZCIĄGA się do tego, czym gap się stanie — także ponad 100 mm, bo o to
CLAUDE.md prosi wprost. To strategia GÓRNEGO infillu, położona na bok, i używa
tych samych ścieżek (`INFILL-L/R-FACE` + ramię L, reguły mitry). Inset TYLNY
zostaje: to inna rzecz — szafka odsunięta od ściany po rurę.

**F5.2 — domyślny infill 40 mm.** Liczba w `profile.autoParts.sideInfill.defaultWidth`;
`DEFAULT_DESIGN` bierze ją stamtąd (reguła 2).

**F5.3 — infill wyłączony = wolno dopchnąć do ściany.** `wallMarginOf` dostał
JEDNOSTKĘ: z wyłączonymi fillerami stop to samo `wallClearance` (10 mm, bo
ściana nie jest płaska), a nie 40 mm zostawiane na kawałek, którego nikt nie
tnie.

**F5.4 — cokół z PRZODU, w materiale frontów.** Był na `z: setback`, czyli
50 mm od ŚCIANY — cokół przy tynku. Jest na `z: D − setback − t`. I doszedł do
`FRONT_MATERIAL_ROLES`: stoi w pokoju pod drzwiami i jest wykańczany razem
z nimi, ze sprayem włącznie — więc BOM liczy go z arkusza frontów, a widok 3D
maluje go bez ani jednego wyjątku.

**F5.5 — SINK stał tyłem.** Trzy miejsca, wszystkie na osi z: plecy siedziały
50 mm za DRZWIAMI zamiast 50 mm od TYŁU (`G + backSetback`, co potwierdza
arytmetyka półki: traci `backSetback + G`, więc jej tylna krawędź i lico pleców
to jedna płaszczyzna); dwa holdery były zamienione miejscami (`HOLDER-F` przy
ścianie); a półka była kotwiczona z TYŁU, więc na zlewie wisiała 88 mm przed
licem. Półka jest teraz stawiana LICEM PRZEDNIM — na każdym innym kicie to
dokładnie ta sama liczba (`D − 20 − (D − G − 20) = G`). **Żaden wymiar CIĘCIA
się nie zmienił**, więc `fixtures/golden-sink.json` jest nietknięty; test
pilnuje tego przy każdym biegu.

## F6 — dog bones jako rzeczywistość

`engine/socketFace.js` (czysty): kieszenie warstwy `PUZZLE_SOCKET` klipowane do
prostokąta panelu → NACIĘCIA w krawędzi; obrys obchodzony przeciwnie do
wskazówek z zaokrągleniem dwóch wewnętrznych naroży promieniem NARZĘDZIA
(`profile.cnc.toolDiameter`, 8 mm). Frez o okrągłym przekroju nie sięga
w kwadratowy narożnik — i ta zaokrąglona resztka to cała różnica między
„odjęto prostokąt" a „to było frezowane".

`3d/panelSolid.js` wytłacza ten obrys i wstawia go na miejsce pudełka. Koszt:
geometria budowana RAZ na KONFIGURACJĘ panelu i cache'owana (LRU, 240 wpisów) —
kuchnia z czternastu identycznych szafek buduje dwie bryły boku, a przeciąganie
szafki nie przelicza niczego, bo w kluczu nie ma pozycji. Zdjęcia: `6a` (solid)
i `6b` (X-ray, widać kieszeń, dwa otwory ⌀7,5 i ulgę dog-bone).

## F7 — kolejność menu

`File · View · Library · Settings · Database · Spraying · Output` —
`lib/topMenu.js` jest DANYMI (`MENU_ORDER` + `orderMenus`), więc zdanie
właściciela o miejscu „Settings" to jedna linia. Output na KOŃCU: to, co
wychodzi z aplikacji. Database dostał rozwijane menu (Materials / Clients /
Projects) i wchłonął dawne top-levelowe „Clients". To PRZESTAWIENIE, nie cięcie
— test liczy, że nic nie wypadło.

## F8 — CNC do użytku

Arkusz pokazuje CAŁY projekt: blok na szafkę, jeden pod drugim, z numerem nad
każdym. Drzewko checkboxów (jednostka → grupa → część) mieszka w PRAWYM PANELU;
wejście w CNC nie zamyka Biblioteki ani panelu — OTWIERA prawy, bo tam jest
teraz narzędzie.

**Eksport nietknięty, i to jest zmierzone.** `verify/t11/cnc-export-identity.md`:
odciski FNV-1a każdego pliku DXF dla ośmiu kitów, wzięte na bazie T10
(commit `ccb1de1`) i na tej gałęzi — `diff` pusty. `test/cnc-export-identity.test.js`
zamraża te odciski, spis warstw i nazwy plików, i sprawdza, że stan widoku
(ukryte szafki) nie dociera do eksportu ani jednym bajtem.

## F9 — nowy projekt: przycisk w kroku 1 i KROK 5

**Krok 1.** „Import from Joinery Core" NAD numerem projektu, wyłączony z plakietką
„soon". Mylące „Select from JoineryCore" przy polu klienta zniknęło: czytało
się jak wybieranie klienta, a to, co ma robić, to zaimportować JOB — klienta
i numer razem.

**Krok 5 — „Project settings"** (`ProjectSettingsStep.jsx`, dane i reguły
w `engine/projectSettings.js`): pięć domyślnych wymiarów (baza, GŁĘBOKOŚĆ
wszystkich, tall, wall, cokół); materiały w TRZECH sekcjach — korpusy (1–3,
EGGER/SPRAYED, kolor NAJPIERW, przypisanie MaterialStock pod nim), fronty
(max 2, RAL/F&B/fornir/laminat/drewno z „colours soon"), osprzęt (nogi+bazy+klipsy
→ cokół, zawiasy, prowadnice, uchwyty, obrzeże — wszystko automatyczne, użytkownik
wybiera tylko WARIANT); grubość automatycznie ze ŹRÓDŁA (EGGER 18, fornir 19,
laminat 18) plus selektor 18/22/25/Other; sheen i dog bones bez zmian.
„Start designing" pyta RAZ: zapisać jako zestaw?

Wszystko to jest WARSTWĄ PROJEKTU i wchodzi do silnika jako WEJŚCIA
(`projectHeightParams` → `depth`, `board_t`, `front_t`). Goły `computeCabinet()`
bez żadnego z tych ustawień tnie dokładnie to, co tnie AutoLISP — jest na to
osobny test.

## F10 — weryfikacja w przeglądarce (faza standardowa)

`scripts/e2e-turn11.mjs`, prawdziwy Chromium, **32/32**. Skrypt MIERZY, nie tylko
fotografuje: odstępy półek czyta z pudełek paneli silnika, szerokość
przypiętego fillera z wyciętego kawałka, pozycję cokołu z jego `box.z`.
15 zdjęć w `verify/t11/` plus `measurements.json`.

**Znaleziona przy okazji i naprawiona: kamera „look at THIS" (tura 5) nie
działała.** `<OrbitControls target={[0, roomH*0.45, 0]}>` to PROP, a React
zapisuje prop przy KAŻDYM renderze — a ta scena renderuje się przy każdym
zaznaczeniu, przeciągnięciu i półce. Cel orbity był więc bez przerwy
przepisywany na środek pokoju i przelot kamery nie miał prawa dolecieć. Jest
teraz imperatywny i tylko wtedy, gdy zmienia się POKÓJ (`HomeTarget`),
zamontowany PO kontrolkach — efekty lecą w kolejności drzewa, a rodzeństwo
postawione wyżej szukałoby refa, którego jeszcze nie ma.

## Nowe pliki

`src/engine/elements.js`, `src/engine/socketFace.js`,
`src/engine/projectSettings.js`, `src/3d/panelSolid.js`,
`src/lib/menuPlacement.js`, `src/lib/topMenu.js`,
`src/components/ElementProperties.jsx`, `src/components/ElementModal.jsx`,
`src/components/CncTree.jsx`, `src/components/ProjectSettingsStep.jsx`,
`scripts/e2e-turn11.mjs`, `test/*` (5 nowych plików), `verify/t11/*`.

## Nowe liczby w `profile.js`

`autoParts.sideInfill.defaultWidth`, `cnc.toolDiameter`,
`appearance.dimensions.{colour,alt}`, `appearance.addPlus.{run,inner}`,
`appearance.hardware.hinge`, `itemsByContext.*`, `projectSettings.*`.
Usunięte: `dimensions.defaultColour` (przeniesione do `appearance.dimensions`).

**Nic nie zostało cofnięte.**

---

# TURA 12 — 09.08.2026 (fazy F0–F12)

Werdykty właściciela z sesji testowej na zmergowanej turze 11. Jedna sekcja
per faza, każda z **werdyktem**. Baza: `9db0093` (main po merge'u tury 11 +
hotfix cross-wall drag), **907 testów**. Na końcu tury: **1062 testy**.

---

## F0 — Baseline — ✅ ZIELONA

Pełny reinstall (`rm -rf node_modules && npm install`), **907/907**, czysty
build, `git diff --stat fixtures/` = 0. Usunięcie cross-wall drag jest na
mainie i zostaje: `UnitView.jsx:445` nosi diagnozę z czatu dosłownie —
przeciąganie NIGDY nie zmienia ściany, świadomą drogą jest dropdown Wall.

---

## F1 — JEDNA powierzchnia ustawień — ✅ ZIELONA

**Diagnoza, dokładna.** Krok 5 tury 11 ustawiał kolor frontu przez
`design.fronts.types[0].colour`. **Tego pola nie czyta w tej aplikacji nic** —
ani `resolveUnitDesign`, ani `sprayFinish`, ani BOM, ani karta jednostki, ani
materiały 3D. Wszystkie czytają `design.colour.front`, czyli to, co pisał stary
modal. Dwa pola na jeden fakt, jedno podłączone do niczego.

**Naprawa u źródła, nie przy objawie.** Kolor frontu typu 1 JEST kolorem frontu
projektu. `engine/design.js withFrontColour()` to jedyny setter obu połówek,
`migrateDesign` dopisuje brakującą połówkę projektom z cache'u (w obie strony —
zależnie od tego, którą połówkę zapisała tura 11), a obie ścieżki w store
(`setFrontType` z kolorem, `setDesign` łatające `colour.front`) idą przez niego.

**Room setup wrócił.** Projekt „wall units" pomija krok pokoju, a z kroku 5 nie
było do niego powrotu. Jest przyciskiem na powierzchni ustawień, więc pokój jest
osiągalny z obu drzwi.

**JEDEN komponent.** `components/SettingsPanel.jsx` — suma obu, bez strat:
wymiary/korpusy/fronty/okucia/grubość z kroku 5 + dane projektu, picker dekorów
EGGER, infill przyścienny, style drzwi i podgląd złącza ze starego modalu. Czyta
design ze STORE, nie z propa — dzięki temu „jedna ścieżka danych" jest
strukturalna: punkt wejścia nie może podać innego designu, bo nie może podać
żadnego. `ProjectSettingsStep.jsx` skasowany.

**+9 testów.** Ten sam kolor ustawiony każdą kontrolką, widziany przez resolver,
z którego maluje scena.

---

## F2 — Powłoka modalna (reguła 15) — ✅ ZIELONA

Reguła, którą właściciel oznaczył jako WIECZNĄ: każdy modal jest przeciągalny za
nagłówek i otwiera się OBOK obiektu, nigdy go nie zasłaniając. Zaimplementowana
RAZ i przepuszczone przez nią wszystko.

- `lib/menuPlacement.js` dostaje `placeBesideAnchor` i `clampToViewport`. Clamp
  z tury 11 był zalążkiem — trzyma pływający byt na ekranie. To jest druga
  połowa: najpierw decyduje, po KTÓREJ STRONIE obiektu rzecz stanie (prawo,
  lewo, dół, góra), i mówi, gdy żadna strona nie ma miejsca.
- `components/Modal.jsx` JEST powłoką. API z tury 3 (`title`, `onClose`,
  `children`, `footer`, `width`) nietknięte, więc każdy istniejący modal dostał
  zachowanie za darmo; `anchor` to jedyny nowy prop.
- `lib/modalAnchor.js` — trzy linijki adaptera DOM. Punkt to prostokąt o zerowym
  rozmiarze, więc nie ma przypadku szczególnego.
- `ElementModal` traci własny kod pozycjonowania (tura 11 pisała go ręcznie
  WŁAŚNIE dlatego, że Modal był wycentrowanym dialogiem) i zyskuje przeciąganie.

**+13 testów.** Sprawdzana własność: modal i obiekt nie dzielą piksela, gdy
którakolwiek strona ma miejsce — przechodząc obiektem przez cały viewport.

---

## F3 — Biblioteka, przebudowana — ✅ ZIELONA (3 pozycje świadomie wyłączone)

Rodzina kuchenna była trzema menu, więc zbudowanie ciągu znaczyło otwarcie
trzech. Jest JEDNA lista, w kolejności Piotra, jako DANE
(`engine/library.js`); panel po niej chodzi i nie decyduje o niczym.

**Warianty szuflad to WYŁĄCZNIE proporcja.** Każda liczba KIT_BUDR_FULL jest
już pisana per FRONT — wysokość boku pudła, rzędy prowadnic, szerokość frontu,
pozycje wkrętów — więc dwa i cztery fronty przechodzą przez tę samą arytmetykę
co trzy. `BUDR2` i `BUDR4` to ten sam kit; proporcje siedzą w
`profile.baseDrawerUnit.variants`. **Nie napisano ani jednej nowej formuły złącza.**

**Nowe golden fixtures** policzone z formuł LISP-a zapisanych w
`golden-budr.json`, NIE z silnika. Generator musiał najpierw odtworzyć co do
pola BUDR-A i BUDR-B, zanim wolno mu było cokolwiek wypisać; silnik zgadza się
z nowymi plikami niezależnie. Stare fixtures bajt w bajt.

**Cztery fronty na nieparzystej wysokości** zaokrąglają każdy W GÓRĘ o pół, co
zostawiłoby stos 2 mm ponad korpusem — więc nowe warianty niosą `exact: true`
i górny front bierze resztę, co jest własną regułą kitu (stack top = H − 3).
Kitowe 4:3:2 niesie `exact: false` i jest zamrożone dokładnie takie, jakie
jest, z dryfem włącznie, bo reguła 7 jest absolutna. Test przechodzi 400
wysokości, żeby to udowodnić.

**Werdykt na wyłączone.** 1× (szuflada nad drzwiami) potrzebuje drzwi o
częściowej wysokości — żaden kit takich nie definiuje. DW potrzebuje wzorca
„front + szczelina" — nie ma go ani w `reference/lisp`, ani w SPEC. Narożnik i
L-kształt nie mają kitu w ogóle. Wszystkie cztery są OBECNE, wyszarzone i piszą
w wierszu dlaczego. BLOCKERS #61–#64.

**+13 testów.**

---

## F4 — Okno edycji szafki („bomba") — ✅ ZIELONA

Prawy klik → „Edit cabinet…" → modal na powłoce F2, obok szafki, z własnym
małym płótnem 3D i TĄ szafką. Płótno montuje się tylko na czas okna.

**Podgląd nad istniejącymi danymi.** Rysuje panele, które silnik już policzył,
przez TEN SAM `MovingPanel` co widok pokoju — wyeksportowany z `UnitView`,
a nie napisany drugi raz, więc ukos, wyfrezowane gniazdo dog-bone, dekor i
faza wyglądają tak samo jak wszędzie. Nie wyprowadza niczego na nowo.

**Explode to `engine/explode.js`** — czyste, testowane, bez Reacta. Normalna
płyty to jej NAJCIEŃSZA oś, i dlatego bok jedzie w bok, półka się podnosi,
a plecy wychodzą prosto do tyłu: szafka rozkłada się tak, jak się składała.
Dystans to ułamek jej własnego rozmiaru (`profile.editor.explode`), więc
szuflada 300 mm i szafa 2,4 m dają ten sam obrazek. Kawałki jadące w tę samą
stronę są rozwachlowane, inaczej trzy półki podniosłyby się jako jeden stos.

**Obrót kawałka:** w stanie rozłożonym zaznaczony kawałek bierze przeciągnięcie
jako własny obrót — tak się ogląda tył boku i jego wiercenie. Złożenie odbija
wszystko z powrotem.

Zaznaczenie kawałka pokazuje `ElementProperties` — TEN SAM komponent, którego
używa prawy panel i modal z dwukliku. Reużyty, nie sklonowany.

**+9 testów**, w tym przejście po wszystkich kitach: każdy kawałek opuszcza
obrys złożonej szafki po dokładnie jednej osi.

---

## F5 — Logika wnętrza: strefy, przegroda, złoty plus — ✅ ZIELONA

**MODEL STREF** (`engine/zones.js`, czysty, testowany) — fundament, o który
prosił właściciel. Wnętrze korpusu było listą kawałków, a prześwity między nimi
wyprowadzano na nowo, inaczej, w trzech miejscach; przegroda robiła z tego
cztery, z pytaniem, na które żadne nie odpowiadało — po KTÓREJ stronie.

**Przegroda, dokładnie jak podyktował właściciel.** Kończy się na półce tylko
gdy ta jest STAŁA — półka nastawna leży na czterech kołkach i jest do wyjęcia,
więc przegroda na niej przewróci się przy pierwszym przestawieniu; przechodzi
obok, a `partitionCollisions()` nazywa to, co mija. Jej głębokość IDZIE ZA
półką, która ją niesie: cofnij półkę o 100 i przegroda cofa się z nią,
automatycznie, bo to jeden węzeł, a przegroda sięgająca dalej niż jej podpora
stoi na powietrzu.

**CENTRE i DELETE**, obu brakowało. Centre to półkowe „Even" na drugiej osi —
N przegród dzieli szerokość na N+1 równych wnęk. Panel dostał w ogóle listę
przegród (nie było jej), więc jest × w wierszu, a Delete na zaznaczeniu usuwa
kawałek albo szafkę, poziom po poziomie jak Escape.

**KTÓRA STRONA.** Przy obecnej przegrodzie dodanie półki pyta o wnękę; wnęka
podświetla się na płótnie, półka ląduje wyśrodkowana w niej i jest DO NIEJ
docięta. Pionowy clamp też jest świadomy stref — dwie półki po dwóch stronach
przegrody nie są nad sobą i nie mają się spychać o 40 mm.

**Złoty „+"** otwiera okno obok szafki zamiast wysyłać wzrok na drugą stronę
ekranu. `AddItems` wyprowadzony z `RightPanel` do własnego komponentu, więc
okno i panel renderują jedną listę na jednym store — panel dalej lustrzy.

**+21 testów.** Pułapka warta zapisania: `Number(null)` to 0, więc „bez wnęki"
czytało się jako „wnęka 0" i docinało każdą półkę do pierwszej wnęki, dopóki
nie stanął strażnik (rodzina reguły 13).

---

## F6 — Okucia, które widać — ✅ ZIELONA

**Dlaczego zawiasów nie było widać.** Były rysowane, w dobrym miejscu, w każdej
klatce — i każda ich część siedziała w litej płycie. Puszka jest wiercona W
drzwi, więc walec z tury 7 mieści się w ich 25 mm: widoczny w X-ray, gdzie
płyta jest półprzezroczysta, i nigdzie indziej. Ramię i płytka są w korpusie,
za zamkniętymi drzwiami.

Brakowało dwóch rzeczy. **KORPUSU PUSZKI** —
`profile.hardware.hinge.bossHeight` nosi liczbę od tury 7 z komentarzem „the
cup body standing proud of the door's back face", i nic tego nigdy nie
narysowało; to jest ta część, którą stolarz widzi, otwierając szafkę. I
**RUCHU** — puszka z korpusem są przykręcone do DRZWI, a rysowały się w
statycznej grupie, więc otwarcie drzwi zostawiało je w powietrzu tam, gdzie
drzwi były. Są teraz dziećmi wahliwej grupy drzwi, a ramię i płytka zostają na
korpusie: otwierasz i obie połowy się rozjeżdżają, czyli dokładnie to, co robi
zawias.

**Czopy dog-bone.** Gniazdo to KIESZEŃ (`cnc.pockets`, PUZZLE_SOCKET) i tura 11
wycinała je z bryły. CZOP jest częścią OBRYSU — `cnc.outline` wychodzi poza
prostokąt nominalny, obchodzi czop i jego dwie ulgi, i wraca — a tego nie
czytało nic. Więc panel z gniazdami wyglądał na obrobiony, a panel z czopami był
prostokątem; WIENIEC, który ma czopy i zero gniazd, był pomijany całkowicie.

`socketFace.tabOutlines()` czyta je wprost z `cnc.outline`: czop to ciąg punktów
obrysu leżący poza prostokątem, domknięty po krawędzi, z której wyszedł. Nic nie
wymyśla — wychodzi profil LISP-a, z ramionami i ulgami, co do pół milimetra.

**+9 testów**, w tym jeden, który stwierdza DIAGNOZĘ, a nie naprawę.

---

## F7 — Szafka wisząca WIDZI słupki — ✅ ZIELONA

Jedna linia, i przez osiem tur była poprawna: przeszkodami jednostki było
wszystko na tym samym POZIOMIE MONTAŻU. Słupek stoi na podłodze, więc leżał w
szufladce z szafkami dolnymi — a sięga przez całe pasmo, w którym wiszą górne.
Nigdy się nie spotkały.

„Poziom montażu" zawsze był protezą. Prawdziwe pytanie brzmi, czy dwa meble
zajmują te same WYSOKOŚCI (`unitBand` / `bandsOverlap`, czyste, testowane) —
i daje starą odpowiedź wszędzie tam, gdzie stara reguła była dobra. Dotknięcie
to nie nachodzenie: górna powieszona równo z blatem słupka to kuchnia zlicowana,
a nie kolizja, i tolerancja jest liczbą z profilu.

Świadomie NIE jest to reguła o „słupkach". Szafa, obudowa lodówki, niska szafka,
w którą ktoś wpisał 2000, i kit z tury 15 — wszystko obsługują te same trzy
linie, bo pytanie jest o mebel, a nie o etykietę. Jest na to test.

Zestaw sąsiadów dla AUTO-CZĘŚCI zostaje na poziomie montażu i komentarz mówi
dlaczego: cokół, filler i infill są o dzieleniu CIĄGU, a to inne pytanie.

**+11 testów.**

---

## F8 — Cokół per CIĄG — ✅ ZIELONA (świadoma zmiana eksportu)

Wzorzec top-infill z tury 8, reużyty a nie napisany od nowa: ten sam podział
owner/member, ten sam „jeden element na ciąg", ten sam powód, dla którego member
musi nieść notatkę zamiast niczego (member bez notatki wpada w ścieżkę
jednostkową i tnie drugi, krótszy cokół wewnątrz długiego).

Dwie granice, których top-infill nie ma, obie fizyczne: **PANEL BOCZNY** schodzi
do podłogi i stoi w płaszczyźnie cokołu, więc cokół go dobija; **jednostka BEZ
cokołu** to dziura, a płyta ją mostkująca to płyta nad przejściem.

Mierzone po KORPUSACH, nie po rozszerzonym spanie — co przy okazji zostawia
cokół pojedynczej szafki dokładnie tej szerokości, którą miał zawsze.

**RAPORT TOŻSAMOŚCI CNC** (`scripts/cnc-fingerprint.mjs`, uruchamialny na
dowolnym checkoutcie). Baseline `9db0093` vs gałąź:

| | ile |
|---|---|
| odciski, które SIĘ ZMIENIŁY | **35 — każdy to przypadek plinth-run** |
| dopisane | 309, z tego **274** to nowe warianty BUDR2/BUDR4 |
| usunięte | 42 — plik cokołu membera, o to właśnie chodzi |

Trzy filtry wracają puste i to jest właściwy dowód: żadnego zmienionego odcisku,
który nie byłby cokołem w ciągu; żadnej dopiski, która nie byłaby cokołem albo
nowym wariantem; żadnego usunięcia poza cokołem. `verify/t12/cnc-export-identity.md`
niesie to razem z oboma surowymi wynikami.

**+15 testów.**

---

## F9 — Cofnij / Ponów — ✅ ZIELONA

Ctrl+Z, Ctrl+Y i Ctrl+Shift+Z (warsztat ma oba rodzaje maszyn) plus dwa
przyciski na początku paska płótna.

**Obserwuje, zamiast być wołane.** Oczywisty kształt to `commit()` na górze
każdej mutującej akcji; store projektu ma ich około sześćdziesięciu, a dzień,
w którym ktoś dopisze sześćdziesiątą pierwszą bez tego, jest dniem, w którym
cofanie zaczyna po cichu pomijać rodzaj edycji — czyli najgorsza awaria tej
funkcji, bo dalej wygląda na działającą. Więc `historyStore` subskrybuje:
zustand podaje stan i stan poprzedni, a store projektu nigdy nie mutuje w
miejscu, więc poprzednie `{project, units}` JEST gotową migawką.

**Jedno przeciągnięcie to jedno cofnięcie.** Seria zapisów jest sklejana na
zegarze końcowym: pierwsza zmiana serii pamięta stan sprzed niej, reszta tylko
restartuje zegar, migawka idzie na stos, gdy ręka stanie.

Głębokość i okno sklejania to liczby z profilu. Nowa edycja kończy ścieżkę
ponawiania. Zaznaczenie jedzie z migawką, więc cofnięcie skasowania oddaje
szafkę ZAZNACZONĄ — a zaznaczenie, którego już nie ma, jest porzucane, nie
udawane. Otwarcie projektu czyści stos. Nie utrwala niczego i jest na to test,
który czyta moduł i sprawdza, że nie nazywa żadnego API pamięci.

**+15 testów**, w większości do → cofnij → ponów → deep-equal na CAŁYM projekcie.

---

## F10 — Plecy, które obróciły się o 90° — ✅ ZIELONA

**Diagnoza najpierw.** To warstwa wizualna, jak podejrzewał triage w czacie, ale
nie usłojenie — to MAPOWANIE CNC→szafka, a różnicą między kitami jest jedna
flaga, o której nikt wcześniej nie musiał myśleć.

Większość paneli rysuje się na stojąco. Niektóre są zagnieżdżane OBRÓCONE, żeby
oszczędzić arkusz: wieniec i dno od zawsze, i `panelPlacement` od zawsze o tym
mówi — ich CNC-owy x biegnie wzdłuż GŁĘBOKOŚCI szafki. KIT_FRIDGE zagnieżdża
tak samo swoje górne plecy (`cnc.rotated`, `drawn_w` = wysokość panelu 296,
`drawn_h` = szerokość 600), a przypadek BACK w `panelPlacement` tego nie robił:
mapował CNC-owy x na x szafki bezwarunkowo. Obrys wychodził w ramce 296 × 600
i był kładziony tak, jakby był 600 × 296.

Zaczęło to być widać w turze 11, bo wtedy panel z gniazdami przestał być
pudełkiem i stał się wyciągnięciem własnego obrysu. Prostokąt wygląda tak samo
w obie strony. Więc geometria SILNIKA rzeczywiście była nietknięta — kawałek to
600 × 296 na liście po obu stronach błędu, i jest na to test.

**KTÓRY z dwóch obrotów** nie jest zgadywaniem. Odczytany z WIERCENIA, czyli
kontrolą, którą nazywa własny komentarz `panelPlacement`: gniazda końcowe muszą
trafić na czopy boków, a trafiają tylko przy CNC-owym x biegnącym W DÓŁ od góry
kawałka. Gniazdo wypada na y 1979,5–2030,5 przy czopie 1980–2030 — własny
półmilimetrowy luz złącza z każdej strony. Skrętność bez zmian, więc płaszczyzna
jest obrócona, a nie odbita.

**STRAŻNIK jest własnością, nie listą:** dla każdego obrobionego panelu każdego
kitu prostokąt CNC musi zgadzać się z rozpiętościami osi, na które kładzie go
placement. Było fałszywe dla dokładnie jednego panelu w aplikacji i prawdziwe
dla każdego innego — a kit dodany w turze 15 jest nim objęty w dniu wejścia.
Pilnuje też F6.2, przez które wieniec i dno po raz pierwszy wychodzą z obrysu.

**+6 testów.** Eksport nietknięty — raport odcisków bez zmian.

---

## F11 — Weryfikacja w przeglądarce (faza standardowa) — ✅ ZIELONA, 29/29

`scripts/e2e-turn12.mjs` przechodzi listę F11 punkt po punkcie i MIERZY zamiast
ufać: kolor czytany ze store'a, z którego maluje scena, pozycja modalu z DOM-u,
długość cokołu z panelu silnika.

Do sterownika doszły trzy prawdziwe gesty: prawy klik (menu kontekstowe to droga
do edytora szafki), klawisz z modyfikatorami (`rawKeyDown` — skrót nie niesie
tekstu, a Chromium odrzuca `keyDown` bez niego) i kółko. Plus `clip` na zrzucie,
żeby płótno 300 px dało się opublikować w czytelnym rozmiarze — kadruje i skaluje
CDP, więc nie doszła żadna zależność.

**18 zrzutów w `verify/t12/`** z `measurements.json` obok. Ten do obejrzenia to
`9c-dogbone-tabs-exploded.png`: czopy dog-bone sterczą z krawędzi płyt razem z
ulgami — połowa złącza, której przed tą turą nie było widać. I
`9b-dogbone-tab-close-up.png`: sześć korpusów zawiasów zjeżdża po boku korpusu
dokładnie tam, gdzie jest wiercenie.

---

## F12 — Dokumentacja + BRAMKA — ✅ ZIELONA

SPEC dostaje linię domykającą #58 (sekcja 6): grubość płyty jest PER KORPUS,
granica postawiona przez same kity, potwierdzona przez właściciela 08.08.
BACKLOG: #59 zostaje otwarte i czeka na wzorzec wiercenia przegrody; narożnik,
L-kształt, DW i drzwiowa szuflada dopisane jako pozycje „wzorzec najpierw".
BLOCKERS #61–#64 na wszystko, co wyłączone albo świadomie zamrożone.

---

## Nowe pliki

`src/engine/library.js` · `src/engine/zones.js` · `src/engine/explode.js` ·
`src/stores/historyStore.js` · `src/components/SettingsPanel.jsx` ·
`src/components/AddItems.jsx` · `src/components/AddItemsModal.jsx` ·
`src/components/CabinetEditorModal.jsx` · `src/lib/modalAnchor.js` ·
`scripts/cnc-fingerprint.mjs` · `scripts/e2e-turn12.mjs` ·
`fixtures/golden-budr2.json` · `fixtures/golden-budr4.json` ·
osiem plików testów `test/turn12-*.test.js`

Skasowane: `src/components/ProjectSettingsStep.jsx` (duplikat z F1).

## Nowe liczby w `profile.js`

`ui.modal.gapPx` / `marginPx` (reguła 15) ·
`baseDrawerUnit.variants[]` (proporcje 1×/2×/3×/4× + `exact`) ·
`editor.explode.distanceFactor` / `spreadFactor` / `seconds` (F4) ·
`editor.levelOverlapMm` (F7) · `editor.history.depth` / `coalesceMs` (F9)

---

# TURA 13 — 09.08.2026 (fazy F0–F11)

Siedem werdyktów właściciela z testów tury 12, wzorzec mocowania przegrody
(#59) i jedno domknięcie SPEC (#64). Baza: `9b69e2c` (main po merge'u tury 12),
**1062 testy**. Na końcu tury: **1159 testów**.

---

## F0 — Baseline — ✅ ZIELONA

`npm install`, **1062/1062**, czysty build, fixtures bez zmian.

---

## F1 — Znikające lica wieńców — ✅ ZIELONA

**Diagnoza pierwsza, jak CLAUDE.md prosiło — i to JEDNA linia.**

`panelPlacement` (engine/joinery.js) daje każdej formatce trójkę ortonormalną,
i do tury 12 nikogo nie obchodziło, w którą stronę jest skręcona: formatka bez
czopów była zwykłym prostopadłościanem, a prostopadłościan nie ma nawinięcia,
które można pomylić. F6.2 tury 12 zrobiła z każdej machinowanej formatki
WYTŁOCZENIE jej własnego obrysu — a wytłoczenie ma trójkąty.

Cztery z pięciu układów są prawoskrętne względem kierunku wytłoczenia
(u × v = −n, więc baza `(u, v, into)` ma wyznacznik +1) — komentarz przy
przypadku BACK mówi to wprost od tury 12. **TOP jest tym jednym, który nie
jest**: u = +Z, v = +X, więc u × v = +Y = +n, a `(u, v, into)` ma wyznacznik
**−1**.

Ujemny wyznacznik to ODBICIE. Odbicie zamienia trójkąty przeciwne do ruchu
wskazówek na zgodne, więc **każdy trójkąt każdego wieńca górnego w aplikacji
był nawinięty na odwrót**. Dwa objawy, jedna przyczyna: lica z zewnątrz
wycinane przez back-face culling („brakujące" powierzchnie z góry) i
`computeVertexNormals` czytające odwrócone nawinięcie, więc płyta była
oświetlana od środka, a przebieg cieni rysował jej drugą stronę we własną mapę
— to jest ten migot.

**Naprawa.** Budowniczy odwraca nawinięcie, kiedy wyznacznik tego wymaga —
z WYZNACZNIKA, nie z listy nazw części, żeby szósty układ dodany w turze 15 był
pokryty w dniu, w którym powstanie. Sam układ jest nietknięty: obrócenie go
przesunęłoby wiercenie.

**Trzeci objaw, ta sama przyczyna.** Właściciel zgłosił osobno, że słoje na
wieńcach biegną front-tył zamiast lewo-prawo. `ExtrudeGeometry` pisze UV w
płaszczyźnie KSZTAŁTU, więc od tury 12 tekstura szła za układem CNC — a wieniec
jest nestowany obrócony (oś x CNC wzdłuż GŁĘBOKOŚCI szafki), i to jest prawda
maszynowa, która zostaje. UV są teraz wyprowadzane z miejsca formatki
w SZAFCE — osie prostopadłościanu, znormalizowane do 0..1, jak oczekują
mnożniki w `3d/materials.js` — więc obrót nestowania nie sięga już rysunku
słojów. Regułę zapisuje `applyBoxUVs`.

**Straż.** `test/turn13-panel-faces.test.js`: nawinięcie na zewnątrz dla każdej
machinowanej formatki każdego kitu; sama ASYMETRIA przypięta, żeby nowy odbity
układ był czerwonym testem, a nie cichą regresją; oś słojów per klasa części,
w obu orientacjach nestowania. Plus zdjęcie z przeglądarki: `verify/t13/1a`,
patrząc w dół w ciąg szafek wiszących.

---

## F2 — Okno edycji, dorosłe — ✅ ZIELONA

Cztery werdykty z używania edytora tury 12.

**MAKSYMALIZACJA (F2.1)** — jedyny sankcjonowany wyjątek od reguły 15, i jest
wypisany we WSPÓLNEJ powłoce, nie obchodzony w wywołującym: `Modal` przyjmuje
`maximised`, prostokąt liczy `maximiseInViewport` obok dwóch pozostałych
rozmieszczeń, a margines jest liczbą z profilu. Nagłówek dalej przeciąga po
przywróceniu, Escape dalej zamyka, a ❐ odstawia okno z powrotem obok szafki.

**PANOROWANIE (F2.2)** — tura 12 miała `enablePan={false}`, więc szafka była
przybita do środka kadru. Konwencja jest widoku pokoju, dosłownie: główne
`OrbitControls` biorą domyślne ustawienia three.js, więc prawy albo środkowy
przycisk panoruje w obu miejscach i nie ma czego się uczyć.

**EDIT ELEMENT (F2.3)** — kliknięty kawałek otwiera blok, który mówi, czym
jest, obok szafki, kiedy jest na to szerokość. Ten sam `ElementProperties`, te
same nadpisania, ten sam store.

**POKÓJ ZNOWU ZAZNACZA SZAFKĘ (F2.4)** — tura 11 zrobiła klikalnym każdy
kawałek i właściciel powiedział, gdzie to idzie źle. Pokój zadaje węższe
pytanie, `isMainViewElement`: tylko DODANE elementy wnętrza — półki, przegrody,
relingi. Boki, wieńce, plecy i fronty edytuje się w oknie. **Ani jednej ścieżki
elementu nie usunięto**: `isSelectableElement` dalej odpowiada za każdy kawałek,
bo to nią jest napędzane okno edycji.

---

## F3 — Hierarchia koloru: projekt → szafka → element — ✅ ZIELONA

**Diagnoza.** Właściciel ustawił kolory projektu w kroku 5, edytował JEDNĄ
szafkę i zmienił się cały projekt. Bo po stronie FRONTU nie było poziomu
szafki: korpus miał `carcass_type_id` (rozwiązywany od tury 11), a front nie
miał wskaźnika na typy frontów projektu — więc jedyna kontrolka, jaką panel
szafki mógł zaoferować, była PROJEKTOWA („Design settings…"). Stolarz sięgający
po „kolor tej szafki" dostawał kolor projektu i nic mu tego nie mówiło.

**Naprawa.** `front_type_id` jest tym brakującym wskaźnikiem, rozwiązywanym nad
projektem i pod nadpisaniem elementu. `projectPalette` jest listą, jaką wolno
pokazać: Carcass 1..3 i Front 1..2, dokładnie to, co zdefiniował krok 5 — czysta
funkcja, więc lista w oknie i lista w teście są tą samą listą. Okno pisze
SZAFKI; nie sięga do `design` w ogóle. „Reset to project" czyści oba wskaźniki.

Oba pola są WSKAŹNIKAMI W PALETĘ, nigdy kolorami własnymi — i to trzyma
hierarchię uczciwą: paleta rośnie w Ustawieniach, szafka wybiera z niej, a
nadpisanie elementu (tura 9/11) siedzi nad obydwoma. Zmień Front 2 w
Ustawieniach i każda szafka nosząca Front 2 pójdzie za nim.

---

## F4 — Panel boczny szafki wiszącej — ✅ ZIELONA

Panel WUD biegł do PODŁOGI: płyta maskująca wisząca w powietrzu przez całą
gołą ścianę pod szafką kończącą się na 2100 — wyceniona i pocięta na tę
wysokość. Werdykt: kończy się równo z dołem korpusu.

Kształt naprawy: domyślna wartość **per KLASA jednostki** w profilu plus jedna
funkcja (`endPanelDrop`), a nie warunek w miejscu budowania panelu — „do
podłogi" jest dobrą odpowiedzią dla czegoś, co na podłodze stoi, i bez sensu
dla czegoś przykręconego do ściany. Zapisane `'floor'` na szafce wiszącej jest
NADPISYWANE, nie migrowane: nigdy nie było decyzją, którą ktoś podjął o wiszącym
korpusie.

Slot, który CLAUDE.md kazało zostawić otwarty, jest NAZWĄ, nie flagą:
`'extended'` już opuszcza panel, więc parkowane BACKLOG #45 wchodzi bez zmiany
kształtu danych. Fixtures diff 0 (żaden kit nie emituje panelu bocznego);
wysokość w BOM kurczy się dokładnie o wysokość zawieszenia — to jest naprawa,
i jest asercją.

---

## F5 — Wielozaznaczenie i akcje zbiorcze — ✅ ZIELONA

Ctrl+klik buduje ZBIÓR (i z niego usuwa — to połowa, o której się zapomina).
Prawy panel nad wielozaznaczeniem staje się wspólnymi akcjami, a pole, co do
którego szafki się nie zgadzają, pokazuje „mixed" i **nie trzyma żadnej
wartości**: niebezpieczeństwo edytora zbiorczego to nie to, co pisze, tylko co
pisze PRZY OKAZJI. Menu kontekstowe działa na całe zaznaczenie dla pięciu
wpisów, które CLAUDE.md wymienia, i każdy z nich MÓWI to w etykiecie — menu, w
którym część wpisów po cichu robi trzy rzeczy, a część jedną, to menu, które
trzeba przetestować na własnym projekcie.

Każda akcja zbiorcza jest akcją JEDNOSTKOWĄ wywołaną raz na szafkę, więc każdy
klamr dalej należy do własnego korpusu: ciąg, w którym trzecia szafka nie może
urosnąć obok sąsiada, mówi to o trzeciej szafce.

**F5.4 — jedno cofnięcie, ZADEKLAROWANE, nie wywnioskowane.** Obserwator
historii skleja serie na opadającym zegarze, co scala akcję zbiorczą tylko
wtedy, gdy zegar W OGÓLE jest — a test ustawia okno na zero właśnie po to, żeby
go nie było. `stores/historyBatch.js` to flaga w module, którego nie posiada
żaden z dwóch store'ów (bo już tworzą łańcuch), a obserwator odkłada dokładnie
jedną migawkę, gdy zamyka się najbardziej zewnętrzna partia. Partia, która
rzuci wyjątkiem, i tak się zamyka.

---

## F6 — Złoty plus uczy się drzwi — ✅ ZIELONA

Jeden przycisk w oknie plusa. Arytmetyka przeniosła się do store'a (`addDoors`),
bo ta sama czynność jest teraz oferowana z trzech miejsc, a trzy kopie jednej
linijki „ile drzwi bierze ta szerokość" to sposób, w jaki dwie z nich zaczynają
się różnić co do zawiasu. Bez złocenia — F6 prosiła, żeby nie złocić.

---

## F7 — Zawiasy widoczne w Solid domyślnie — ✅ ZIELONA (z diagnozą)

Werdykt: „dalej praktycznie tylko w X-ray". Diagnoza PRZED zmianą czegokolwiek:
**renderowanie NIE jest przywiązane do gałęzi X-ray.** `Hardware` bierze
`hinges` i `xray` jako dwa osobne propy od tury 11 i rysuje te same
proceduralne korpusy pod jednym i drugim. Nie ma gałęzi do usunięcia.

Prawdziwe były dwie inne rzeczy, i obie są naprawione albo zapisane:

1. **Flaga jest PAMIĘTANA.** Przeglądarka, w której raz ją wyłączono podczas
   testów tury 11, trzymała ją wyłączoną przez każde kolejne przeładowanie i
   żadna zmiana domyślnej wartości nie mogła tam dotrzeć. Klucz w localStorage
   jest teraz wersjonowany, a domyślna wartość przeniosła się do profilu, gdzie
   reguła 2 każe jej być.
2. **Przy ZAMKNIĘTYCH drzwiach nie ma czego zobaczyć**, i to nie jest błąd:
   puszka jest wywiercona W drzwiach, a ramię i płytka są w korpusie za nimi.
   Po to tura 12 dodała BOSS i to widać w chwili, gdy drzwi się otworzą.
   Rysowanie ironmongerii zamkniętej szafki znaczyłoby rysowanie przez litą
   płytę — czyli X-ray.

Dowód: `verify/t13/8a`, ze ŚWIEŻEGO projektu, bez dotykania przełącznika.

---

## F8 — Mocowanie przegrody: WZORZEC BISKWITOWY (#59) — ✅ ZIELONA

BLOCKERS #59 było otwarte od tury 11, kiedy przegroda wylądowała bez żadnego
wiercenia, a silnik napisał to wprost: „jej WIERCENIE to późniejsze pytanie i
jest zapisane jako takie". To jest odpowiedź właściciela i od tej tury
referencja dla złącza doczołowego w aplikacji.

    wkręt ⌀3 → 10 mm przerwy → znacznik biskwitu 70 mm → 10 mm przerwy → wkręt ⌀3

od 50 mm od krawędzi — nigdy mniej — dwa zestawy do 700 mm, trzy powyżej.
Czytane jako elementy i CZYSTE przerwy, więc zestaw ma 96 mm ze środkami
wkrętów na +1,5 i +94,5 i znacznikiem na +13..+83. Każda liczba jest wartością
profilu, więc warsztat czytający łańcuch inaczej zmienia profil, nie kod.

**ZESTAW BEZ WKRĘTÓW.** Wkręt na wylot istnieje wyłącznie tam, gdzie lico
przyjmujące jest ZAKRYTE — wieniec pod blatem, dno w cokole. Płaszczyzny półki
stałej to jest to, na co się patrzy przy otwartych drzwiach, więc mocowanie z
tury 12 dostaje sam znacznik, w tych samych pozycjach. Lista w profilu, nie
warunek.

**GDZIE.** Złącze ma dwie połowy, a stół płaski sięga płaszczyzn: element
przyjmujący bierze cały zestaw, przegroda sam znacznik odsunięty od swojego
końca — trasowanie przeniesione, i po to jest ZNACZNIK i dedykowany program
in-and-out. Obie połowy trasowane od CZĘŚCI WSPÓLNEJ obu płyt, nie od głębokości
przegrody: przegroda bywa głębsza niż półka, na której stoi.

Znaczniki idą na nową warstwę `BISCUIT_4MM`, wypisaną dosłownie jak w CLAUDE.md
— kontrakt maszynowy jak każda inna nazwa w tabeli — jako polilinia OTWARTA, bo
in-and-out to nie kieszeń. Wkręty dołączają do `SCREWS_3MM`.

Fixture: `golden-partition-biscuits.json`, policzony ręcznie z reguły, zanim
zapytano silnik. Tożsamość: 1148 linii po obu stronach, 0 dodanych, 0 usuniętych,
95 zmienionych — i każda z nich to przypadek z przegrodą, na jednym z czterech
plików, których dotyka złącze.

---

## F9 — Dokumentacja — ✅ ZIELONA

SPEC: domknięcie #64 (kitowe 4:3:2 zostaje takie, jakie tnie kit — granica, nie
dług) i nowa sekcja 6.1 z całym wzorcem biskwitowym plus notatka, że pliki
referencyjne w stylu KIT-ów zostają modelem dla #61/#62/#63. BLOCKERS: #59 i #64
zamknięte z opisem, co się dało przewidzieć, a co nie; #65 i #66 dopisane na to,
co znalazła przeglądarka. BACKLOG: sekcja tury 13 i pięć nowych pozycji.

---

## F10 — Przejście w przeglądarce — ✅ ZIELONA (24/24)

Wszystkie dziewięć zdjęć, plus close-up zestawu biskwitowego. Bieg MIERZY, i ta
tura schodzi o warstwę niżej: `__cc.views` wystawia scenę i kamerę, bo F1 jest
twierdzeniem o GEOMETRII, a F2.2 o KAMERZE — żadnego z nich nie da się
przeczytać z DOM-u. Kliknięcia są RZUTOWANE na nazwaną szafkę przez kamerę
pokoju, a nie celowane w ułamek kanwy.

I to jest to, co znalazło trzy błędy, do których test w node nie ma dostępu:
ściany pokoju przechwytujące każde kliknięcie (BLOCKERS #65), prawy przycisk
zwijający zaznaczenie (#66) i modyfikator `ctrlKey`, który nie przechodził
przez warstwę zdarzeń react-three-fiber. Wszystkie trzy naprawione.

---

## F11 — BRAMKA — ✅ ZIELONA

Pełny reinstall, **1159/1159**, czysty build, fixtures istniejące bez zmian
(`git diff --stat fixtures/` dotyka tylko NOWEGO pliku), zależności nietknięte,
grep czystości silnika pusty, tożsamość CNC opublikowana z jedną udokumentowaną
deltą, `verify/t13/` zapełnione.

---

## Nowe pliki

`src/engine/biscuits.js` · `src/lib/selection.js` · `src/stores/historyBatch.js` ·
`src/components/UnitFinishModal.jsx` · `src/components/MultiUnitPanel.jsx` ·
`src/3d/viewHandle.js` · `scripts/e2e-turn13.mjs` ·
`fixtures/golden-partition-biscuits.json` ·
sześć plików testów `test/turn13-*.test.js` · `verify/t13/`

## Nowe liczby w `profile.js`

`ui.modal.maximiseMarginPx` (F2.1) ·
`autoParts.endPanel.defaultHeightByMount` (F4) ·
`appearance.hardware.showInSolid` (F7) ·
`appearance.joinery.biscuit` / `screw` (F8) ·
cały blok `biscuits` — `markLength` / `markTool` / `gap` / `screwDiameter` /
`edgeMin` / `wideThreshold` / `markFromEnd` / `layer` / `screwLayer` /
`concealedReceivers` (F8)

---

# TURA 14 — 09.08.2026 (fazy F0–F11)

Osiemnaście werdyktów właściciela z długiej sesji na żywo w turze 13. Baza:
`2ebc40a` (main po merge'u tury 13), **1159 testów**. Tura kurczy się OD DOŁU,
więc szybkie naprawy codziennego bólu są na górze, a dwie duże budowy na końcu.

---

## F0 — Baseline — ✅ ZIELONA

Pełny `rm -rf node_modules && npm install`, **1159/1159**, czysty build,
`git diff fixtures/` pusty.

---

## F1 — Szybkie błędy i regresje — ✅ ZIELONA

### F1.1 — klik w ścianę znowu odznacza (i klik PRZEZ ścianę nadal zaznacza)

**Diagnoza zmierzona w przeglądarce, nie wydedukowana.** Sonda strzelała
promieniem aparatu aplikacji w trzy punkty i wypisywała, co promień mija.
Klik w podłogę przed szafką bazową:

```
Mesh  d=4104  (przednia ściana — NIEWIDOCZNA, ale w promieniu)
Mesh  d=5197  podłoga
LineSegments d=6514 …6825  ← obrysy SZAFKI, metr ZA podłogą
```

Reguła tury 13 brzmiała „czy w promieniu jest jakikolwiek mebel" — a promień
nie kończy się na klikniętej powierzchni. Odpowiedź: tak, jest, o metr dalej.
Więc klik w podłogę nie czyścił zaznaczenia. Wahadło z tury 11 (ściana ZJADAŁA
kliki w szafki) odbiło się w drugą stronę.

Pytanie, które trzyma OBA niezmienniki naraz, to nie „czy byłem najbliżej"
i nie „czy byłem sam", tylko **„czy przede mną jest mebel"** — nic za
powierzchnią, na którą patrzę, nie mogło być celem. Odległości, nie
przynależność. Reguła jest czysta i mieszka w `lib/selection.js`
(`roomClickIsBackground`), a nie w komponencie three.

Druga połowa pary to ten sam fakt fizyczny z drugiej strony: **ściany, której
NIE WIDAĆ, nie da się kliknąć**. Raycaster three'a ignoruje `visible` —
przeczytane w `node_modules/three` (`Raycaster.intersectObject` woła
`object.raycast()` zaraz po teście warstwy i innej bramki nie ma) — więc
automatycznie chowana ściana przednia, czyli ta, za którą aparat stoi ZAWSZE,
odpowiadała na każde zdarzenie wskaźnika w aplikacji sprzed mebli. To był
powód, dla którego „klik w szafkę przez ścianę" w ogóle był trudnym
przypadkiem. Mesh ściany dostał własny `raycast`, który milczy, kiedy grupa
jest niewidoczna.

Trzeci składnik przyszedł z F1.4: grupa jednostki miała `onPointerOver` /
`onPointerOut` dla podświetlenia najazdem, a obiekt z handlerem to obiekt,
który R3F raycastuje **rekurencyjnie** — stąd obrysy w liście przecięć.
Skasowanie najazdu skasowało i to.

Zmierzone po naprawie, w przeglądarce: klik w ścianę → `[]`, klik w szafkę →
`[A]`, Ctrl+klik w drugą → `[A, B]`, klik w ścianę → `[]`.

### F1.2 — górny wypełniacz DA SIĘ zdjąć

Kafel jest JEDNYM elementem na cały BIEG, a jego wysokość to najwyższe żądanie
któregokolwiek członka biegu (`runTopInfill`). Tura 6 czyściła flagę na tej
jednej szafce, po czym `refreshAutoParts` odbudowywał bieg z pozostałych trzech
i wkładał element z powrotem. Przy biegu jednoelementowym wyglądało to na
działające; przy biegu szafek wiszących — a tam właściciel to spotkał — odklik
nie robił nic.

Element należy do biegu, więc DECYZJA należy do biegu: `runMemberIds` (silnik,
czysta funkcja) zwraca listę, `removeTopInfill` zeruje wszystkim naraz. Do tego
`hasTopInfill(unit)` — członek biegu nie nosi własnej wysokości, więc przełącznik
czytający `top_infill_mm` pokazywał „niezamontowany" pod elementem, na który
joiner patrzył, i DODAWAŁ drugie żądanie zamiast zdjąć element. Menu kontekstowe
i prawy panel czytają teraz stan BIEGU.

### F1.3 — niebieska linia pomocnicza znika

`activeEdge` nigdy nie było czyszczone. Uchwyt krawędzi świeci, kiedy jest
TRZYMANY; po puszczeniu (`pointerup`, `pointercancel`) i po dwukliku „do
sufitu" gaśnie. Pas ma długość całego biegu i leży na wierzchu elementu, więc
zostawał niebieską belką na skończonej robocie.

### F1.4 — podświetlenie najazdem WYŁĄCZONE

Skasowane: stan `hovered`, debounce, odroczone czyszczenie, `onPointerOver` /
`onPointerOut` na grupie jednostki, drugi (cichszy) rysunek ramki zaznaczenia
oraz liczba `appearance.selection.hoverOpacity` w profilu — nieobecność jest
ustawieniem. Podświetla KLIK. Kursory nad półką i uchwyty krawędzi zostają:
kursor nie jest podświetleniem, a uchwyt jest jedynym sposobem chwycenia
krawędzi (tura 6) — zapisane jako świadome odczytanie „delete the hover
treatment".

### F1.5a — wpisana długość ściany trzyma KĄTY PROSTE

Tura 3 przesuwała KORONNY narożnik ściany wzdłuż jej kierunku. Dla prostokąta
to ścinanie: prostokąt robi się rombem, a dwie ściany 3000 wychodzą 3041,4 —
liczba ze zrzutu właściciela.

Reguła jest w silniku i jest tym samym PRYMITYWEM, którego używa przeciąganie
ściany (F10): `moveWall` przesuwa całą ścianę wzdłuż jej normalnej, a sąsiedzi
zachowują SWOJE kierunki i są docinani tam, gdzie się teraz spotykają. Żaden
kierunek ściany nigdy nie jest zapisywany, więc każdy kąt w pomieszczeniu jest
zachowany — nie „zachowany dla prostokąta", tylko zachowany. `setWallLength`
to `moveWall` następnej ściany o tyle, żeby przecięcie wypadło na żądanej
odległości. Ruch, który wywróciłby wielokąt na drugą stronę, jest ODRZUCANY,
a nie stosowany.

### F1.5b — zakres „Jedna ściana" pokazuje JEDNĄ ŚCIANĘ

Zakres projektu mówił „jedna ściana" od tury 7 i decydował o jednej rzeczy:
czy kreator pokaże krok Room setup. Scena nie wiedziała nic — wanity rysowała
się w czterech ścianach pokoju 4 × 3 m, czyli nie w tej robocie, którą joiner
wycenia.

`wallsInScope(room, scope)` (silnik, testy) zwraca ścianę 1 plus dwa
**odsadzenia 1000 mm do przodu** — po jednym przy każdym narożniku ściany
głównej, obcięte z sąsiednich ścian, więc niosą PRAWDZIWY indeks ściany i nic
w dole rzeki nie musi się uczyć o odsadzeniach. `room.wall_stub_mm` (domyślnie
1000; 0 = brak) jest polem pomieszczenia, bo to geometria pomieszczenia.
Wielokąt danych się NIE zmienia — podłoga nadal jest z niego cięta, a projekt
da się przełączyć z powrotem na „całe pomieszczenie" nic nie tracąc. **Podłoga
zostaje** w zakresie ściennym: właściciel mówi o ŚCIANACH („never the whole
room"), a mebel musi na czymś stać i cień kontaktowy musi mieć co malować.

**Werdykt.** 1159 → **1174** testy. Para F1.1 zmierzona w prawdziwym Chromium.

---

## F2 — [KRYTYCZNE] Plecy LODÓWKI siadają NA psich kościach — ✅ ZIELONA

**Trzy zdania właściciela, wszystkie trzy zamienione na arytmetykę.** Obudowa
lodówki nie ma pełnych pleców: zamykają ją trzy elementy — RAIL1 na dole, RAIL2
w poprzek strefy lodówki i BACK nad panelem stałym (`KIT_FRIDGE.lsp` L6,
L110-119). Boki rysuje ZWYKŁE `drawBUL`/`drawBUR` (L293, L310), więc niosą
zwykłe trzy czopy tylne z podfrezowaniami psiej kości na 95 / H/2 / H−95
(`SKYLON_COMMON.lsp` L699, L737-739).

Trzy elementy, trzy czopy, a każdy z elementów ma DOKŁADNIE JEDNO gniazdo na
każdej krótkiej krawędzi, 95 mm od końca (L340-346 RAIL1, L366-372 RAIL2,
L381-387 BACK). To nie jest kwestia gustu: każdy element stoi tam, gdzie jego
własne gniazdo spotyka czop, dla którego zostało wycięte.

Tura 3 czytała pozycje z WIDOKU CZOŁOWEGO LISP-a, a widok czołowy jest
schematem i nie zgadza się z własnym CNC tego samego pliku (rysuje back-top od
`fixedPanelY+G` do `H−G`, choć wycinana formatka ma `spursH+G` wysokości, czyli
biegnie `fixedPanelY → H`).

| element | było | jest | czop |
|---|---|---|---|
| RAIL1 | y = 18 (na dnie) | **y = 0** (w licu dna) | 95 |
| RAIL2 | y = 811 (środek strefy lodówki) | **y = 955** | 1050 |
| BACK  | rząd gniazd 95 od DOŁU (1899) | **95 od GÓRY (2005)** | 2005 |

### …i przy okazji: tura 12 obróciła nie ten obiekt

Tura 12 dopasowała gniazda BACK-a przez puszczenie CNC-owego x W DÓŁ od góry
formatki. To domyka JEDEN z czterech złączy na tej formatce i rozwala trzy
pozostałe — sygnatura ODBICIA, nie obrotu. Policzone w milimetrach szafki na
domyślnej obudowie (H 2100, panel stały 1804):

```
gniazda           x 95      → y 2005  ✓ górny czop boków
wkręty do stałego x G/2     → y 2091  ✗ są na GÓRZE, a wkręcają się w 1804
wkręty do wieńca  x h−S     → y 1813  ✗ są przy stałym, a są WIEŃCA
gniazda wieńca (prawa kraw.) → y 1804 ✗ prawa krawędź TO sufit (L389-397)
```

Werdykt właściciela — „bones at the bottom, must be at the top" — to drugie
odczytanie i domyka wszystkie cztery: rząd gniazd przenosi się na arkuszu, a
układ wraca do własnego układu LISP-a (x w GÓRĘ od krawędzi wkręcanej w panel
stały). Skrętność bez zmian (u × v = −n na obu gałęziach), więc formatka jest
OBRÓCONA, a nie odbita; etykiety „BUL/BUR" LISP-a zamieniają się miejscami, a
tną identycznie, bo oba gniazda są 95 od tego samego początku x.

### Fixtures i tożsamość CNC

`fixtures/golden-fridge.json` **nie koduje** żadnej z tych pozycji — nosi
rozmiary, wiercenia, CSV i sumy, a pod `verify_with_piotr` ma wprost wpis
*„RAIL2 centred at fridgeH/2 (200mm strip) — confirm position"* i *„sides keep
FULL puzzle tenons on the back edge although there is no full back panel to
receive them — confirm this is intended"*. Ta tura jest tym potwierdzeniem, w
drugą stronę. Reguła SINK nie ma zastosowania, `git diff fixtures/` pusty.

Delta CNC (zmierzona `scripts/cnc-fingerprint.mjs` vs `2ebc40a`): **wyłącznie
`FRIDGE 01-BACK.dxf`** i arkusze, które ją zawierają. Każdy inny typ jednostki
bajt w bajt. To druga świadoma delta tury obok nowego panelu maskującego (F5) —
CLAUDE.md nazywa F2 poprawką krytyczną, więc delta jest nazwana przez ten plik,
choć nawias w bramce F11 wymieniał tylko panel maskujący.

**Werdykt.** 1174 → **1183** testy; dziewięć nowych zamyka ZŁĄCZE, a nie
powtarza stałej.

---

## F3 — Górny wypełniacz KOŃCZY na przeszkodzie (#55 + jeden nowy przypadek) — ✅ ZIELONA

Właściciel zaparkował #55 w turze 8; teraz jest żywe, a z używania aplikacji
doszedł drugi przypadek. Oba to JEDNO zdanie: *między tym biegiem a ścianą stoi
coś, co idzie na całą wysokość?*

Tura 8 umiała zapytać o to tylko JEDNOSTKI KOŃCOWEJ BIEGU — i dlatego żaden z
dwóch przypadków nie działał, bo w obu przeszkoda należy do kogoś innego:

1. bieg szafek WISZĄCYCH zatrzymuje się na boku wysokiej szafki dociągniętym do
   sufitu. Wysoka szafka nigdy nie będzie w tym biegu: `buildRuns` kluczuje po
   poziomie montażu, więc nawet gdy tura 8 zrównuje im wieńce co do milimetra
   (i tak jest — test to sprawdza), to są dwa biegi na jednej ścianie;
2. górny wypełniacz wysokiej szafki kończy NA bocznym wypełniaczu zamiast go
   przecinać.

`ceilingVerticals(units, {roomHeight}, profile)` to odpowiedź POMIESZCZENIA:
pionowe elementy sięgające sufitu — boki i wypełniacze boczne, obojętnie czyje —
jako przedziały wzdłuż ściany. Element, który kończy się na własnym wieńcu, NIE
jest na tej liście, i to zachowuje zachowanie tury 8 bez zmian: bieg opływa
własny bok o wysokości korpusu (test END 3 tury 6 przechodzi nietknięty).

Reguła w `runEnd` to teraz: 1) ściana → 2) **najbliższy pion do sufitu między
mną a ścianą** → 3) listwa przyścienna niższa od sufitu (przechodzę PO niej do
ściany, tura 6) → 4) otwarte, obracam narożnik. Element dobija do BLISKIEGO lica
przeszkody: to jest lico, które widzi oko, więc przejście po jego wierzchu
dałoby spoinę na wysokości wzroku, a przejście obok postawiłoby listwę przed
tym, co kończy bieg.

Jedna reguła, oba przypadki, w logice biegu, którą górny wypełniacz już miał —
bez równoległej implementacji, jak prosi CLAUDE.md.

**Werdykt.** 1183 → **1190** testów.

---

## F4 — Modale elementów: drzwi, boki, wypełniacze — ✅ ZIELONA

**Model właściciela**, i to rozróżnienie, które stolarz robi bez myślenia: bok,
wieniec, plecy to KORPUS — budujesz raz i oglądasz w oknie edycji. Drzwi, bok
maskujący, listwa przyścienna, panel maskujący pod biegiem wiszącym to rzeczy
DOWIESZANE, po jednej, każda z własnymi właściwościami. W te celuje się wprost.

**Gest.** Werdykt tury 13 — „klik w szafkę zaznacza SZAFKĘ" — jest nietknięty i
celowo. Poszerza się DWUKLIK, który od tury 11 (F3.3) znaczy „otwórz ten
element". `isMainViewElement` (co łapie pojedynczy klik) bez zmian;
`isAttachedElement` + `opensOwnModal` to nowe pytanie, które zadaje dwuklik. Oba
werdykty właściciela trzymają się naraz i stolarz nie uczy się nowego gestu.

**F4.2 — „Door extend" wraca do domu.** To właściwość DRZWI: o ile front schodzi
poniżej korpusu, żeby zrobić bezuchwytową krawędź chwytną. Siedziała w bloku
KORPUSU prawego panelu przez trzy tury — czyli tam, gdzie nikt nie szuka
ustawienia drzwi, i stąd zgłoszenie właściciela, że „zniknęła". Silnik
nietknięty: `door_extend` to ten sam parametr od tury 3, zmienia się wyłącznie
miejsce kontrolki. `elementFields(panel, type)` bierze teraz typ jednostki, więc
szafka bez tej cechy nie dostaje kontrolki wyszarzonej, tylko jej nie ma.

**F4.3 — dane sprawdzone.** Biblioteka ma jeden wpis wiszący (`wall` → `WUD`) i
rozwiązuje się do typu z `doorExtend: true`; test trzyma to per WPIS biblioteki
i dodatkowo per KAŻDY typ o `mount: 'wall'`, więc kit dodany w turze 15 nie
prześlizgnie się bez flagi. Nic w danych nie było zgubione — zgubiona była
kontrolka, w sensie „nie tam, gdzie się jej szuka".

**F4.1 — paleta z kolorami.** Lista materiałów elementu BYŁA już paletą projektu
(sloty korpusu + fronty, świadomie nie katalog dekorów) i brakowało jej połowy,
którą stolarz rozpoznaje: koloru. `elementMaterialChoices` niesie teraz `hex`
(dodatkowo, bez zmiany `material_id`/`material_label`, które czyta BOM), a modal
pokazuje próbkę obok listy. Tytuł okna mówi, o KTÓRY element chodzi.

**Werdykt.** 1190 → **1198** testów.

---

## F5 — Dolny panel maskujący pod szafkami wiszącymi (#45) — ✅ ZIELONA

**Co to jest.** Jedna ciągła płyta pod BIEGIEM szafek wiszących: długość = suma
szafek biegu, głębokość = głębokość szafki + 10 mm — tych dziesięć, o które
KAŻDA szafka w tej aplikacji stoi od ściany (`room.wallBackClearance`), więc
płyta ZAKRYWA szczelinę, zamiast kończyć się na jej krawędzi. To jest cały powód
istnienia tego elementu.

To PLINTA z drugiego końca kuchni i CLAUDE.md mówi to wprost („run-based like
the plinth… reuse the run logic"). Więc to dosłownie te same trzy funkcje
(`maskSegments` / `segmentMask` / `runMaskParams`) z dwiema różnicami, które
stolarz by nazwał: jest dla szafek WISZĄCYCH, a liczba, która nie jest jej
długością, to GŁĘBOKOŚĆ, a nie wysokość. Reszta identyczna: decyzja per szafka,
sąsiadujące decyzje scalone w jedną długość, bok maskujący albo przerwa kończy
segment. Dokowanie szafki PRZEDŁUŻA płytę (test MASK-C).

**Materiał: FRONT** (F5.2), tą samą rurą, którą plinta dostała w turze 11 —
stoi w pokoju pod drzwiami, w płaszczyźnie, którą oko czyta jako front biegu, i
jest wykańczana z nimi. **ZGŁOSZONE WŁAŚCICIELOWI: to jest założenie i jedna
linia w `FRONT_MATERIAL_ROLES` do zmiany**, dokładnie jak prosi CLAUDE.md.

**Nowa rodzina części.** `part: 'MASK'`, `role: 'mask'`, wchodzi do BOM, na
arkusz CNC i do DXF tymi samymi trasami co każda inna formatka — nie ma drugiej
listy cięcia. Nowe fixtures: `fixtures/golden-wall-mask.json` (sześć przypadków
A–F). Nie ma LISP-a dla tej części, więc źródłem prawdy jest specyfikacja
właściciela, zacytowana w pliku i rozłożona na liczby przypadek po przypadku —
ta sama podstawa, na której od tury 2 stoją zmienne wysokości szuflad.
`verify_with_piotr` wymienia pięć rzeczy do potwierdzenia.

**Tożsamość CNC.** `scripts/cnc-fingerprint.mjs` dostał dwa nowe presety
(`+bottom-mask`, `+bottom-mask-run-owner`), więc delta pokazuje się jako
**314 DODANYCH linii** na nazwanych plikach, a nie chowa się za skryptem, który
buduje tylko goły korpus. Zmienionych linii w całym raporcie: tylko FRIDGE BACK
z F2.

**Gniazdo, które ta część miała zarezerwowane.** `autoParts.endPanel
.defaultHeightByMount` ma czwartą wartość `'extended'` opisaną w turze 13 jako
„door/panel EXTENSION below a wall unit, parked as BACKLOG #45" — jest na
miejscu i nietknięta; ta faza dokłada `autoParts.mask` obok niej, a nie zamiast.

**Modal (F5.4).** `masking-panel` jest rodzajem DOWIESZANYM (F4), więc dwuklik
otwiera jego własne okno; reguły zakończeń z F3 stosują się tam, gdzie płyta
spotyka bok, bo segmentowanie czyta te same `endPanelSpread`.

**Werdykt.** 1198 → **1209** testów.

---

## F6 — Menu kontekstowe, przeprojektowane — ✅ ZIELONA

Cztery werdykty, a czwarty jest tym, który warto zapisać: **kolejność i sekcje
są DANYMI**. Dodanie wpisu to wybór grupy; komponent rysuje złotą kreskę między
jedną grupą a drugą i nie ma zdania, co gdzie idzie.

1. **„Edit cabinet…" PIERWSZE i w ramce** — obwiedzione złotem, bo to wpis, po
   który stolarz sięga, kiedy szafka już stoi: idzie zobaczyć, co zrobił.
2. **„Show all dimensions" OSTATNIE.** Tura 8 dała mu pierwsze miejsce z
   argumentem „pokaż mi liczby tej szafki". Życie z tym mówi co innego: to
   sposób PATRZENIA, a nie coś, co się szafce robi.
3. **Sekcje:** `[edit] | [górny wypełniacz + plinta + panel maskujący] | [wszystkie
   boki maskujące] | [reszta] | [wymiary]`, rozdzielone **delikatną kreską w
   złocie aplikacji** (`border-gold/30`, włos przy jednej trzeciej krycia). Wpis
   bez własnej grupy trafia do „reszty", więc wpis dopisany w turze 15 ląduje
   gdzieś sensownie w dniu, w którym powstaje. Kolejność SEKCJI to lista
   `MENU_GROUPS`, a nie kolejność `push`ów — wpis „reszty" nie wskoczy nad boki
   przez przypadek.
4. **Przełącznik zawiasów USUNIĘTY.** Werdykt właściciela: wybór jest
   bezsensowny. Zawiasy zostają widoczne dokładnie tak, jak zostawiła je tura 13
   — flaga `showHinges` i jej domyślna wartość z profilu są nietknięte, View
   nadal ją ma — znika WPIS, który zadawał pytanie z jedną sensowną odpowiedzią.
   PRZERYSOWANIE zawiasów to zaparkowany, osobny temat (BACKLOG).

Test „nothing that was reachable stopped being reachable" trzyma pełną listę
tury 13 minus ten jeden wpis: przeprojektowanie przesuwa, nigdy nie gubi.

**Werdykt.** 1209 → **1217** testów.

---

## F7 — Modal SZCZEGÓŁU elementu — ✅ ZIELONA

Dwuklik w część w rozstrzelonej szafce otwiera okno: **element w ręce po lewej,
element tak, jak wytnie go maszyna, po prawej**. To odpowiedź na pytanie, które
stolarz zadaje, trzymając formatkę — „a ta dziura to na co?" — a dotąd jedynym
miejscem, gdzie można je było zadać, był arkusz CNC, który pokazuje czterdzieści
części naraz i o żadnej nie umie powiedzieć, czym jest.

**LEWA (F7.1).** Ten sam `MovingPanel` co pokój, z tą samą machinowaną
geometrią — gniazdo jest tu gniazdem, bo to to samo wytłoczenie, które rysuje
scena — na własnym środku, z zoomem, panoramą i obrotem (`OrbitControls`
`enablePan`). To nie jest drugi renderer.

**PRAWA (F7.2/F7.4).** Obrys, każda ścieżka na nim, **LEGENDA WARSTW** z nazwami
i kolorami z `cnc/layers.js` i wymiary gabarytowe z delikatnymi liniami
odnoszącymi. Wymiary to `dimensionEntities` tury 7 — zaimportowane, nietknięte —
bo CLAUDE.md zabrania forkować drugi silnik rysunkowy, a wymiar narysowany dwa
razy to wymiar narysowany na dwa sposoby. Nowy jest `engine/drawings/
partDetail.js`: czysty moduł, który daje ROZMIAR, OBRYS, listę MACHINOWAŃ i
legendę. Nie używa `sheet.js` i mówi dlaczego: okno szczegółu to nie kartka —
nie ma ramki, tabliczki ani podziałki, a jest interaktywne.

**F7.3 — wymiary są interaktywne.** Każde machinowanie ma stabilne `id`, swoją
warstwę i NOTATKĘ, którą stolarz by powiedział na głos („Screws ⌀3 · ⌀3 at 50,
9.5"). Najazd podświetla ścieżkę w rysunku (grubsza kreska, reszta przygasza
się do 35 %) i wypisuje notatkę w stopce; najazd na wiersz LEGENDY podświetla
pierwszą ścieżkę tej warstwy. Wymiary gabarytowe **nigdy nie gasną** — to dwie
liczby, którymi zamawia się formatkę.

**Werdykt.** 1217 → **1226** testów.

---

## F8 — Okno edycji ożywa — ✅ ZIELONA

### F8.1 — drzwi OTWIERAJĄ się w edytorze

Animacja otwarcia frontu istnieje od tury 8; edytor podawał `front={null}`
`open={0}`, więc nie było jak o nią poprosić — stolarz mógł obejrzeć szafkę z
każdej strony poza tą jedną, która ma znaczenie: od środka. `frontKind` wyjeżdża
z `3d/UnitView.jsx` jako eksport (edytor pyta POKÓJ, zamiast trzymać drugą listę
tego, co jest frontem), a okno dostaje kontrolkę **„Open doors" / „Close doors"**
w stopce oraz klik w drzwi otwierający JE jedne. Klik nadal zaznacza i
właściwości nadal się pokazują — drzwi to jedyna część, przy której „kliknij"
ma oczywiste znaczenie fizyczne, więc te dwie rzeczy się nie biją.

### F8.2 — każda część ma AKCJE, z auto-częściami włącznie

`elementActions(panel)` (czysta, w `engine/elements.js`) odpowiada na DWA
pytania — wolno usunąć? wolno przesunąć? — i **zawsze podaje POWÓD, kiedy nie**.
To wzorzec #58: kontrolka, której po prostu nie ma, niczego nie uczy, a wyszarzona
bez powodu uczy jeszcze mniej.

Fizyka, po jednym zdaniu:

* **płyta korpusu** trzyma pudło — czopy są wycięte pod nią, a gniazda pod czopy;
* **element POCHODNY** idzie za czymś innym: przegroda nad szufladami to
  wieko stosu, uchwyty zlewozmywaka to jest to, co ten kit ma zamiast wieńca;
* **element, którego POZYCJA jest jego definicją**, nie przesuwa się: listwa
  przyścienna JEST szczeliną, którą zamyka; bok maskujący jest przykręcony do
  boku, który maskuje. Zdjąć — tak. Przesunąć — nie;
* **auto-część** to ciekawy przypadek i ten, który właściciel nazwał: panel
  spurów lodówki jest tam, gdzie akurat wypada gniazdko, a warsztat, który ma je
  gdzie indziej, chce go 100 mm w bok — albo wcale.

**Mechanizm: NADPISANIE WARSTWY PROJEKTU**, nie fork silnika. Ten sam kanał
`element_overrides`, którym jeździ materiał, dostaje `removed: true` i
`move: {x,y,z}`, stosowane na SAMYM KOŃCU `computeCabinet` — po tym, jak kit
powiedział swoje. Usunięta formatka po prostu nie ma jej w `panels`, więc BOM,
CSV, arkusz i DXF idą za tym i nikomu nic nie trzeba mówić; `derived
.removed_parts` mówi wprost, czego brakuje, żeby nikt nie szukał jej na stole.
Przesunięcie jest ABSOLUTNE (0 wraca na miejsce), a rozmiar cięcia i `cnc` się
nie ruszają — przesunięta formatka to ta sama formatka.

**Werdykt.** 1226 → **1234** testy. Fixtures bez zmian (goły `computeCabinet`
bez nadpisań tnie dokładnie to, co ciął).

---

## F9 — Światła frontowe na WYSOKOŚCI OCZU (wariant A) — ✅ ZIELONA

**Odkrycie właściciela jest geometryczne, a nie gustowe.** Połysk czyta się
tylko pod stromymi kątami, bo każde mocne światło w rigu jest wysoko. Odblask
lustrzany to LUSTRO źródła: źródło na trzech metrach i patrzący na 1,65 mogą się
spotkać na pionowych drzwiach tylko wtedy, gdy patrzący patrzy w GÓRĘ — a tak
się na kuchnię nie patrzy. Tura 10 miała rację, że wędrujący błysk niosą
jupitery; zmierzyła to na orbicie przebiegającej głównie NAD meblem.

**`yMm` — i to jest cała faza.** Każda inna pozycja w tym bloku to ułamek
odległości rigu, co jest poprawne dla rigu studyjnego: skaluje się z obiektem.
Oko się nie skaluje — stolarz w wanity 2 m i stolarz w kuchni 6 m ma oczy na
1650. Więc `yMm` to BEZWZGLĘDNA wysokość nad podłogą w milimetrach i przesłania
`y`, gdzie jest podane; x i z zostają ułamkami, więc para rozsuwa się z robotą,
nie podnosząc się z nią. `p.y` nadal działa tam, gdzie `yMm` nie ma — przykład w
profilu i każdy rig, który warsztat już sobie napisał, chodzą dalej.

Para: x ≈ ±0,35, z ≈ 0,7, **yMm 1650**, intensywność **12** (FIZYCZNA, decay 2),
ciepła biel, **bez cieni** (budżet rzucających nietknięty — `shadowCasters` 2,
klucz + jupitery), `ccLight: 'point'`, więc rola `render.lightScale.point`,
którą render przeważa, istnieje i jest neutralna.

**Zmierzone w przeglądarce** — pełne liczby w `verify/t14/f9-eye-level-glint.md`.
Na wysokości oczu para dokłada światła na frontach na KAŻDYM azymucie (Δśredniej
+2…+18), a na dwóch pojawia się **nowa najjaśniejsza plama** (Δmax +59) — błysk,
którego bez pary nie było. Z góry (kamera 3,2 m) efekt jest niespójny, a na
trzech azymutach fronty w ogóle nie wchodzą w kadr. To jest skarga właściciela
powiedziana od drugiej strony.

Trzeci pomiar był trzecim podejściem i to też warto zapisać: dwa pierwsze
czytały PAS kadru, a biały pokój saturuje się na 253 niezależnie od świateł, więc
nie pokazywały nic. Dopiero filtr „tylko piksele malowanego frontu" mierzy
powierzchnię, o którą chodzi w tej fazie.

**Werdykt.** 1234 → **1240** testów.

---

## F10 — Room setup, nowy paradygmat (duża budowa) — ✅ ZIELONA

**Werdykt właściciela: ciągnięcie za narożniki jest nie do użycia** — i opisuje
ARYTMETYKĘ, nie mysz. Narożnik to punkt WSPÓLNY dwóch ścian, więc ciągnięcie go
zmienia KIERUNEK obu: wszystkie kąty w pomieszczeniu ruszają się naraz, a kąt
prosty da się trafić tylko przypadkiem.

To, co stolarz przesuwa, to ŚCIANA — i to jest **jeden prymityw**. `moveWall`
odsuwa ścianę wzdłuż jej własnej normalnej i DOCINA dwóch sąsiadów tam, gdzie
się teraz spotykają, zachowując ich kierunki co do joty. Z tego wychodzi
wszystko:

* **F10.1 przeciąganie całej ściany** — chwyt gdziekolwiek na ścianie, ruch
  wzdłuż normalnej, sąsiedzi się rozciągają. **Uchwyty narożników ZNIKNĘŁY.**
* **F10.2 wpisana odległość (AutoCAD)** — z zaznaczoną ścianą wpisujesz liczbę i
  Enter: ściana idzie DOKŁADNIE tyle milimetrów. Kierunek to kierunek
  przeciągania, a bez przeciągania — NA ZEWNĄTRZ (pokój rośnie); minus mówi
  drugą rzecz i wpisuje się jak każdy inny znak. Przeciąganie pamięta
  pomieszczenie z chwili, gdy ręka poszła w dół, więc wpisana liczba jest
  BEZWZGLĘDNA, a nie doliczana do tego, co ręka już przesunęła.
* **F1.5a wpisana DŁUGOŚĆ to ten sam prymityw** rozwiązany dla punktu
  przecięcia — test trzyma to dosłownie: `setWallLength(r,0,4500)` daje bajt w
  bajt to samo, co `moveWall(r,1,500)`. Gdyby to były dwie reguły, mogłyby się
  różnić; nie mogą.
* **F10.4 L-kształt zostaje** i podlega tej samej edycji: test przesuwa każdą z
  sześciu ścian i sprawdza, że wszystkie sześć kątów jest nietkniętych.
* Ruch, który wywróciłby wielokąt na drugą stronę, jest ODRZUCANY (znak pola
  ze znakiem), a nie stosowany.

**F10.3 — WSTAW BOX** (komin, słup, obudowana rura). Czysty model w silniku:
`migrateBox` / `boxCorners` / `moveBoxSide` / `moveBox`, prostokąt zorientowany
w osiach planu — bo to, co właściciel chce z nim robić, to „przeciągnij CAŁY
bok" i „wpisz odległość", a jedno i drugie to jedna liczba na jednej osi.
Boki edytuje się DOKŁADNIE tak jak ściany (na zewnątrz = dodatnio, przeciągnięty
przez przeciwległy bok = odmowa).

Box **renderuje się w 3D** od podłogi do sufitu w tonie ściany (czyta się jako
BUDYNEK, nie jako mebel; bez handlerów wskaźnika, więc klik przechodzi na
podłogę za nim — czyli znaczy to, co znaczy klik w ścianę) i **uczestniczy w
kolizji jak ściany**: `boxSpansOnWall` mierzy go dokładnie tak, jak mierzy się
jednostkę stojącą na innej ścianie — rzut na układ tej ściany, liczy się tylko
tam, gdzie wchodzi w pas głębokości przesuwanej szafki. Widzą go OBIE ścieżki:
zacisk przeciągania (`wallObstacles`) i WYSZUKIWANIE MIEJSCA (`freeSlotOnWall`),
więc szafki nie da się ani wsunąć w komin, ani w nim POSTAWIĆ.

**Werdykt.** 1240 → **1252** testy.

---

## F11 — Przejście w przeglądarce + dokumentacja + BRAMKA — ✅ ZIELONA (14/14)

`scripts/e2e-turn14.mjs` — trzynaście punktów, które nazywa CLAUDE.md, MIERZONE,
nie fotografowane. Trzy kroki przeszły dopiero po tym, jak najpierw pomyliło się
samo PRZEJŚCIE, i każdy jest wart linijki:

* **para F1.1 jest JEDNYM krokiem** — klik w szafkę przez ścianę zaznacza,
  Ctrl rozszerza zbiór, klik w ścianę czyści — więc wahadło nie odbije się już
  bez czerwonego przebiegu;
* **WUD i FRIDGE przychodzą BEZ drzwi** (tura 13 F5.3 wiesza je świadomie), więc
  i modal drzwi, i „Open doors" potrzebowały najpierw `addDoors`;
* **React wyprowadza `onPointerEnter` z `pointerover`**, więc syntetyczne
  `pointerenter` — które nie bąbelkuje — jest gestem, którego aplikacja nigdy nie
  słyszy. Najazd na legendę jest teraz prawdziwym ruchem myszy i SCREWS_3MM
  zapala jedną ścieżkę, przygasza dwadzieścia i wypisuje
  „Screws ⌀3 · ⌀3 at 50, 2140.5".

**Jedna poprawka produktowa wyszła z pisania przejścia.** Wpisana odległość
liczy się od pomieszczenia z chwili, gdy ŚCIANA ZOSTAŁA WYBRANA, a nie od
bieżącego szkicu — więc „pociągnij o 20, wpisz 202, Enter" przesuwa dokładnie o
202, a nie o 242. Dokładnie o to prosi krok przejścia w CLAUDE.md i przejście to
teraz mierzy: **202**.

## Dokumentacja

`BACKLOG`: **#45 i #55 ZAMKNIĘTE** (z opisem, co je zamknęło), zaparkowane
**#73** przerysowanie zawiasów, **#74** wycięcia, **#75** kolor per element
faktycznie przemalowujący 3D, **#76** box a ograniczanie GŁĘBOKOŚCI, **#77**
skrypt tury 13 jako poprzednik. `BLOCKERS`: nic nie zostało cofnięte, więc nic
nie dopisano.

## BRAMKA — ✅ ZIELONA

| brama | wynik |
|---|---|
| pełny reinstall (`rm -rf node_modules && npm install`) | czysty |
| testy | **1252 / 1252** (baza tury: 1159) |
| build | czysty |
| istniejące fixtures | `git diff fixtures/` **pusty**; `golden-wall-mask.json` to DODANIE |
| zależności | nietknięte (`git diff package.json package-lock.json` pusty) |
| czystość silnika | grep po React / zustand / three / stores w `src/engine/` — pusty |
| tożsamość CNC | opublikowana w `verify/t14/cnc-export-identity.md` + oba pliki odcisków |
| `verify/t14/` | 13 zrzutów, `measurements.json`, pomiar świateł F9, raport CNC |
| PR | otwarty, **nie scalony** |

**Delty CNC — dwie, obie nazwane.** 21 linii ZMIENIONYCH i wszystkie to plecy
lodówki z F2 (`FRIDGE … 01-BACK.dxf` × 7 presetów plus arkusze, które je
zawierają) — jeden rząd gniazd na jednej formatce jednego kitu. 335 linii
DODANYCH i wszystkie to dwa nowe presety panelu maskującego z F5. Każdy inny typ
jednostki jest bajt w bajt taki sam na każdym presecie.

Bramka F11 w CLAUDE.md wymieniała w nawiasie tylko panel maskujący; F2 jest w
tym samym pliku nazwana poprawką KRYTYCZNĄ, a zmiana rzędu gniazd jest jej
nieuniknioną konsekwencją — więc druga delta jest nazwana wprost tutaj i w
raporcie, a nie po cichu wchłonięta.

## Nowe pliki

`src/engine/drawings/partDetail.js` · `src/components/PartDetailModal.jsx` ·
`fixtures/golden-wall-mask.json` · `scripts/e2e-turn14.mjs` ·
osiem plików testów `test/turn14-*.test.js` · `verify/t14/`

## Nowe liczby w `profile.js`

`autoParts.mask.enabled` / `thickness` / `depthExtra` (F5) ·
`appearance.studio.points[].yMm` + para na wysokości oczu (F9).
USUNIĘTE: `appearance.selection.hoverOpacity` (F1.4 — nieobecność jest ustawieniem).

---

# TURA 15 — POLEROWANIE I STRUKTURA (09.08.2026)

Baza: `main` po scaleniu tury 14 **plus** paczka z czatu (czerwony Save/fold w
`SettingsPanel`, Generic boards, źródła spray/veneer/laminate/wood, 7 kształtów
frontów, `ResizeObserver` w Modalu). Testy na starcie: **1252**.

## F0 — Baza — ✅ ZIELONA

Pełny reinstall (`rm -rf node_modules && npm install`, 247 pakietów) → **1252 /
1252** testów → czysty build. Paczka z czatu potwierdzona na `main`:
`SettingsPanel.jsx` ma czerwony Save i zwijanie, `materialAssignmentStore.js` ma
trzy Generic boards, `design.js` ma siedmioelementowe `FRONT_STYLE_OPTIONS`.
Nic nie było odtwarzane na ślepo, `BLOCKERS` bez wpisu.

## F1 — Małe werdykty UI — ✅ ZIELONA

**F1.1 — Save robi się ZIELONY.** Czerwony przycisk, który po naciśnięciu
zostaje czerwony, nic nie odpowiada. Naciśnięty — jest ZIELONY z ptaszkiem, a
sekcja się zwija; naciśnięty ponownie otwiera sekcję i wraca do czerwieni, bo
znów jest co zapisać. ZWINIĘTE i ZAPISANE to tu ten sam fakt (przycisk zwija
sekcję), więc niesie je jedna flaga, a nie dwie, które mogą się nie zgadzać.
Kolory z palety aplikacji — `.cc-btn-save` / `.cc-btn-saved` w `index.css` na
`status-danger` / `status-ok` — a nie hex rozsypany po JSX.

**F1.2 — GRUBOŚĆ w zwiniętym podsumowaniu.** Czerwona ramka właściciela z
napisem „THICK": linia, która nazywa płytę, ale nie mówi, na jakiej grubości
projekt jest NARYSOWANY, ukrywa jedyną liczbę, od której mierzy się każde
cięcie. To grubość PROJEKTU, nie płyty — te dwie są tym samym, dopóki ktoś nie
zostawi 18 i nie przypisze płyty 22, a to dokładnie moment, w którym linia musi
powiedzieć, która wygrała.

**F1.3 — ZŁOTE RAMY na sekcjach.** CARCASSES, FRONTS i blok Door style siedzą
w delikatnej złotej ramie. „Delikatna" to ten sam włos, którym menu kontekstowe
tury 14 rysuje przegródki (`border-gold/30`), i to JEDNA klasa (`.cc-frame`), a
nie obramowanie wypisane w pięciu miejscach — bo to ostatnie jest sposobem, w
jaki następna sekcja dostaje trochę inne złoto.

**F1.4 — prawy panel: ZWINIĘTY domyślnie i oprawiony.** Trzy z pięciu sekcji
otwierały się same, co na kolumnie 310 px znaczyło panel od razu za długi, żeby
go przeczytać. Wszystko startuje zamknięte, każda sekcja w tej samej złotej
ramie, a ta OTWARTA świeci jaśniej (`.cc-frame-active`) — bo to nad nią się
pracuje. Pamiętane na SESJĘ: `uiStore` z założenia nigdy nie jest utrwalany.

**F1.5 — biblioteka SCROLLUJE.** Zrzut właściciela: długa lista uciekająca za
dolną krawędź ekranu, bez sposobu na dojście do ostatniego wpisu. `.cc-scroll` +
`max-h-[60vh]`: limit jest ułamkiem OKNA, nie stałą liczbą pikseli, bo panel
jest przeciągalny i stała wysokość byłaby zła w chwili upuszczenia go przy
krawędzi.

## F2 — Kontury WEWNĄTRZ szafki — ✅ ZIELONA

Właściciel: „zewnętrzny kontur jest ostry, wewnętrzne krawędzie znikają". Znikają
i to nie jest problem koloru. Linia krawędzi WEWNĄTRZ szafki leży dokładnie NA
licu sąsiedniej formatki — przednia kant półki jest w płaszczyźnie boku, w który
się wpasowuje — więc linia i lico są na tej samej głębokości, a wygrywa to, co
rasteryzuje się później. Na zewnątrz nie ma za linią nic, dlatego sylwetka
zawsze była ostra; to jest ślad.

Podręcznikowa poprawka: `polygonOffset` na materiale WYPEŁNIENIA. Każde lico
formatki cofa się o włos **w buforze głębokości**, więc linia przed nim wygrywa
wszędzie. Nic się nie przesuwa w scenie — tylko to, w co wierzy test głębokości
— więc żaden wymiar, żadne cięcie i żaden fixture nie są tknięte. Liczby są w
`profile.appearance.outline.polygonOffset` (`factor: 1`, `units: 1`, klasyczna
para startowa; większe zaczynają prześwitywać na sylwetce, a tego nie wolno
kupić), czyta je `3d/materials.js panelFillOffset()`, a `migrateCabinetProfile`
dosypuje je profilowi zapisanemu przed tą turą.

## F3 — Źródła pokazują WŁAŚCIWY picker — ✅ ZIELONA

Werdykt właściciela oznaczony „mega ważne": front LAMINAT oferował paletę RAL, a
front FORNIR też. Żaden z nich nie jest farbą.

**Który picker, to własność ŹRÓDŁA.** `profile.projectSettings.*Sources` dostaje
pole `picker` (`decor` / `veneer` / `colour` / `null`), czyta je
`pickerForSource()`, a komponent nie decyduje o niczym. Piąte źródło dopisane
jutro nazwie swój picker tam, nie tutaj.

**F3.1 — laminat trzyma DEKOR.** Front z laminatu przechowuje `finish_id`
dekoru, renderuje się jako dekor i BOM nazywa go dekorem. Domknięty jest przy
tym prawdziwy błąd: zostawiony kolor natrysku WYGRYWAŁ w `resolveFinishes`, więc
front zamówiony w H1180 renderował się i drukował jako wine red. Front, który ma
OKLEINĘ, nie ma na poziomie projektu koloru natrysku — kolor nie znika ze
stanu (wróć na Spray i wciąż tam jest), po prostu nie maluje płyty pokrytej
czymś innym.

**F3.2 — fornir ma WŁASNĄ, rozszerzalną kolekcję.** `engine/veneers.js`, zasiane
minimalnie (decyzja właściciela (a)): cztery najbardziej drewniane z 85 dekorów.
Wpis to `{ id, label, species, decorId }`, gdzie `decorId` jest ODWOŁANIEM, a nie
wklejonym obrazkiem — kiedy przyjdzie własny skan właściciela, wpis dostaje swój
`tex`, odwołanie znika, a każdy projekt, który kiedykolwiek wybrał „Natural oak",
zachowuje swój wybór, bo id, które zapisał, nigdy nie było id dekoru EGGER-a.
Dodanie fornira to WPIS DANYCH (`setVeneerCatalogue`), nigdy zmiana kodu — test
to robi. Grubość NIE jest w tym pliku: 19 wynika ze ŹRÓDŁA, jak 18 z EGGER-a.
Licencja EGGER-a podróżuje z pożyczonym obrazkiem: etykieta fornira niesie
atrybucję, dopóki obrazek jest ich.

**F3.3 — korpusy dostają źródło Veneer**, trzeci przycisk obok `EGGER decor |
Sprayed`, wpięty w tę samą kolekcję, 19 mm przypięte tak, jak płyty przypinają
grubość. Bramka partii F obowiązuje: zmiana ŹRÓDŁA korpusu przechodzi teraz
przez tę samą twardą bramkę co przypisanie płyty (`gateOrApply`) — przedtem
jedyna kontrolka, która MOŻE po cichu przekroić kuchnię, była tą, która nie
pytała. Spray bez zmian.

## F4 — Style frontów: GALERIA zbudowana na skalę — ✅ ZIELONA

„Będzie WIELE stylów kuchennych/frontów — nigdy goła lista rozwijana." Lista
rozwijana siedmiu skrótów to lista, którą trzeba już znać; galeria rysunków to
lista, którą da się przeczytać.

Kafel na kształt, z małym RYSUNKIEM SVG frontu i nazwą; klik = wybór. Na skalę od
pierwszego dnia (F4.2): siatka + scroll, pole filtra po nazwie, a style i rysunki
to DANE — `engine/design.js FRONT_STYLE_OPTIONS` na id, `engine/frontStyleArt.js`
na obrysy. Trzydziesty styl kosztuje dwa wpisy danych i zero pracy w komponencie;
test tego pilnuje, a styl bez rysunku dostaje płytę, nie pustą płytkę. Rysunki są
zasiewem „małych instrukcji" właściciela: jedna ramka, trzy prymitywy, jeden
renderer. „+ New style" stoi obok galerii.

## F5 — Biblioteka: wysuwki i katalog właściciela — ✅ ZIELONA

**F5.1 — podlisty WYSUWAJĄ się w BOK.** Zrzut właściciela: otwarcie grupy
szuflad zepchnęło resztę biblioteki za dolną krawędź ekranu. Rozwijanie w dół
wewnątrz pływającego panelu właśnie to robi — panel to 248 px okna, którego nie
jest właścicielem. Wysuwka nie. Otwiera się OBOK wiersza, który ją posiada, a
KTÓRA to strona nie jest decydowane tutaj: `placeBesideAnchor` próbuje prawo,
lewo, dół, górę i bierze pierwszą, która się mieści — więc biblioteka
przeciągnięta do prawej krawędzi wysuwa się w LEWO, a komponent nie wie, że to
zrobił. To ta sama wspólna logika rozmieszczenia, którą reguła 15 nałożyła na
każdy modal.

**F5.2 — katalog przebudowany do listy właściciela.** Cztery grupy — Base units,
Tall units, Wall units i nowa grupa Extras — i wszystko DANYMI w
`engine/library.js`. Wszystko, co działało, nadal jest wpięte w swój kit (Base,
Sink, Drawer 2×/3×/4×, Tall, Fridge, Wall, Low cabinet); osiemnaście nowych
nazw jest OBECNYCH i wyłączonych, każda z uczciwym jednozdaniowym powodem —
wzorzec-najpierw, ta sama formuła, którą DW i Corner noszą od tury 12. Wiersz
grupy mówi „6/15", zanim się ją otworzy: długa lista w większości zaparkowana
musi być co do tego szczera, zanim ktoś w nią kliknie.

## F6 — Narożnik infilla to MITRA (#51 aktywowane) — ✅ ZIELONA

Właściciel: „boczny infill nadal spotyka górny KWADRATOWO". Tam, gdzie pionowy
wypełniacz idzie ponad szafki, a poziomy nad nimi zatrzymuje się o niego, obie
części są nogami RAMY stojącej w JEDNEJ płaszczyźnie — tej samej co drzwi i
panele maskujące. Narożnik ramy się mitruje. To ta sama matematyka, którą
narożniki górnego infilla mają od tury 8 („mitra w geometrii NA PASKACH"),
rozciągnięta na człon pionowy, nie sforkowana: `infillMitre()` przyjmuje teraz
`meta.side === 'left' | 'right'` i tnie jedną płaszczyzną `chamferPlane`.

**Rozmiar mitry to `faceH`** — cięcie 45° ma dwie równe nogi, jedna biegnie w
dół wewnętrznej krawędzi wypełniacza, druga wzdłuż dolnej krawędzi paska.
Dlatego mitra POTRZEBUJE MIEJSCA: biegnie `faceH` w POPRZEK wypełniacza, więc
wypełniacz węższy niż pasek jest wysoki nie ma czego dać i zostaje na styk. To
prawdziwe ograniczenie warsztatowe, nie skrót — 30 mm listwa przyścienna pod
250 mm szczeliną nie dostaje mitry, tylko bardzo płaski kąt. Trzeci warunek:
obie muszą kończyć się RÓWNO, bo wypełniacz wystający 200 mm ponad 40 mm pasek
to litera T, a nie narożnik.

**Delta CNC tury.** OBRYS bocznego infilla zyskuje swój narożnik 45°, a jego
ROZMIAR się nie zmienia — zewnętrzna krawędź biegnie na pełną wysokość, cofnięta
jest tylko wewnętrzna, i to właśnie JEST mitra. Górny pasek biegnie do swojego
DŁUGIEGO PUNKTU nad narożnikiem. Oba cięcia leżą na JEDNEJ płaszczyźnie —
`test/turn15-infill-mitre.test.js` sprawdza to wierzchołek po wierzchołku, bo
inaczej to nie złącze, tylko dwie części kończące się blisko siebie. Ramię A
nadal jest PRZYKRĘCONE i nadal odmawia cięcia, dokładnie jak mówi #51.

## F7 — Panel do sufitu jest ŚCIANĄ dla szafek wiszących — ✅ ZIELONA

Błąd właściciela z prawdziwej roboty: wyciągnij panel boczny szafki dolnej lub
słupka do sufitu, a wiszące przejeżdżają przez niego — i łańcuchy wymiarowe też
go nie widzą.

To błąd F7 z tury 12 o poziom niżej. Tamten brzmiał „szafka wisząca ignoruje
SŁUPEK" i poprawką było przestać pytać o poziom montażu, a zacząć o WYSOKOŚCI.
To jest to samo pytanie zadane o coś, co nie jest szafką: pasmo szafki dolnej
kończy się na 900 i słusznie wisząca może być nad nią — ale panel przykręcony do
jej boku został wyciągnięty na 2400, a 2400 leży w środku pasma, w którym wiszą.

Więc panel wchodzi do zbioru przeszkód SAM, na SWOIM odcinku ściany i nigdzie
indziej. Nie szafka, do której należy: 18 mm panelu blokuje 18 mm, a blokowanie
618 zatrzymałoby wiszącą, która ma czyste 600 do zawieszenia. Czyste funkcje
silnika: `unitVerticals()` i `verticalsInBand()` w `engine/runs.js` (z których
`ceilingVerticals` tury 14 jest teraz filtrem), obie czytane przez `projectStore`
przy każdym klampowaniu i przez `3d/Scene.jsx` przy wymiarach — jedna odpowiedź,
więc obraz i reguła nie mogą się nie zgadzać.

**PRZYPIĘTE 10 mm.** Właściciel prosił o potwierdzenie: test węzłowy stwierdza,
że każda jednostka stoi 10 mm od ściany (`room.wallBackClearance`, a to nie jest
decyzja per szafka — decyzją jest `inset_back_mm`, i dodają się), oraz że panel
maskujący jest automatycznie 10 mm głębszy od swojej szafki i dlatego ZACZYNA
się przy ścianie. Zwyczaj tury 7 stał się testem.

## F8 — Multi-select: Remove doors — ✅ ZIELONA

Obok „Add doors" — dosłownie obok, w jednym rzędzie, bo to jedna decyzja z
dwiema odpowiedziami. `removeDoors` jest lustrem `addDoors` i oddaje tę samą
kształtem odpowiedź; `removeDoorsBulk` idzie przez `runBatch`, więc całość to
JEDNO cofnięcie — reguła F5 tury 13, a nie druga jej implementacja. Przycisk
mówi, ile ich zdejmie, i gaśnie, kiedy nie ma czego zdejmować.

## F9 — CNC: dwa widoki i przełącznik — ✅ ZIELONA

Eksport i dzisiejsze grupowanie są bajt w bajt nietknięte; to są WIDOKI.
`engine/cnc/views.js` nie jest importowany przez `dxf.js`, `layout.js` ani
`lib/cncExport.js` — czyta go ekran.

**Po MATERIALE**: arkusz dzieli się lewo→prawo na sekcję na przypisany materiał
(`MDF-18 · MDF 18 mm`, `W980 SM · MFC White…`), tożsamość po MATERIALE, nigdy po
kolorze — dwoje drzwi z tej samej płyty to jedna sekcja niezależnie od tego, na
co je natryśnięto, bo to jedna płyta na stole maszyny. Nagłówki nazywają
materiał tak, jak nazywa go BOM. Ta sama płyta cięta w dwóch grubościach to dwie
sekcje, bo to dwie płyty. Rola bez przypisania jest co do tego szczera zamiast
wymyślać nazwę.

**Po SZAFCE**: kwadrat na szafkę ze WSZYSTKIMI jej częściami — i osobna grupa na
części RUNU (infille, plinty, panele maskujące), „infille i plinthy osobno".

Widoczny PRZEŁĄCZNIK w pasku CNC; reguła tury 11 stoi — Biblioteka i prawy panel
zostają otwarte, drzewko checkboxów działa w obu widokach, bo oba dają tę samą
strukturę i renderuje je jeden kod. ŻADNEGO NESTINGU: symulacja jest świadomie
odroczona przez właściciela i nie została ani naszkicowana, ani przygotowana.

## F10 — Przejście w przeglądarce + dokumentacja + BRAMKA — ✅ ZIELONA (22/22)

`scripts/e2e-turn15.mjs` w prawdziwym Chromium: **22 sprawdzenia, wszystkie
zielone**, 15 zrzutów i `measurements.json` w `verify/t15/`. Mierzy, nie ufa —
kolor przycisku czytany z `getComputedStyle`, kolor złota ramy sprawdzany jako
`rgba(170,142,104,…)`, prostokąt wysuwki porównywany z prostokątem wiersza,
`polygonOffset` czytany z żywych materiałów sceny, obrys mitry czytany z
silnika, a nie z pikseli.

### Co pokazuje przejście

| # | zrzut | co dowodzi |
|---|---|---|
| 1 | `1a-save-green-and-thickness.png` | Save zielony z ptaszkiem, zwinięta linia z `· 18 mm` |
| 2 | `2a-gold-frames-on-settings.png` | złote ramy na CARCASSES, FRONTS i Door style |
| 3 | `3a-right-panel-framed-and-closed.png` | prawy panel oprawiony i zwinięty, aktywna sekcja świeci |
| 4 | `4a-outlines-inside-a-carcass.png` | wewnętrzne kontury WIDOCZNE w otwartej szafce |
| 5 | `5a-laminate-shows-decor-picker.png` | front laminat → picker dekorów |
| 6 | `6a-veneer-front-and-list.png`, `6b-carcass-veneer-source.png` | fornir wybrany z listy fornirów; korpus ze źródłem Veneer |
| 7 | `7a-style-gallery.png`, `7b-style-gallery-filtered.png` | galeria z kaflami SVG i pole filtra, które ją zawęża |
| 8 | `8a-library-flyout-to-the-side.png` | podlista wysunięta w BOK |
| 9 | `9a-catalogue-groups-and-soon.png` | cztery grupy i wpisy „soon" z powodami |
| 10 | `10a-infill-corner-mitre-solid.png`, `10b-infill-corner-mitre-drawing.png` | narożnik 45° w Solid i w rysunku części |
| 11 | `11a-wall-unit-stops-at-panel.png` | wisząca zatrzymana na panelu do sufitu |
| 12 | `12a-remove-doors-before.png`, `12b-remove-doors-after.png` | trzy szafki bez drzwi jednym kliknięciem |
| 13 | `13a-cnc-by-material.png`, `13b-cnc-by-cabinet.png` | oba widoki CNC i przełącznik |

## Dokumentacja

`BUILD-LOG` — ten wpis, faza po fazie. `BACKLOG` — **#51 zamknięte**; nesting
dopisany jako **odroczony decyzją właściciela** (#78); osiemnaście nowych
wzorców katalogu w kolejce (#79–#81), fornir, wood i warunek mitry jako wpisy
(#82–#84). `BLOCKERS` — nic nie zostało cofnięte, więc nic nie dopisano.
`verify/t15/cnc-export-identity.md` — raport tożsamości CNC z obiema stronami
odcisków i pełnym diffem.

## BRAMKA — ✅ ZIELONA

| brama | wynik |
|---|---|
| pełny reinstall (`rm -rf node_modules && npm install`) | czysty |
| testy | **1281 / 1281** (baza tury: 1252) |
| build | czysty |
| istniejące fixtures | `git diff fixtures/` **pusty** — 12 plików, żadnego dodania |
| zależności | nietknięte (`git diff package.json package-lock.json` pusty) |
| czystość silnika | grep po React / zustand / three / stores w `src/engine/` — tylko komentarz |
| tożsamość CNC | 1850 odcisków identycznych; JEDNA nazwana delta (mitra), opublikowana |
| `verify/t15/` | 15 zrzutów, `measurements.json`, raport CNC, oba pliki odcisków + diff |
| przejście w przeglądarce | **22 / 22** |
| PR | otwarty, **nie scalony** |

**Delta CNC — jedna, nazwana.** 80 zmienionych linii i wszystkie na przypadkach
`+infill-mitre`: `01-INFILL-L-FACE.dxf` (obrys bocznego infilla — delta nazwana
w CLAUDE.md), `01-INFILL-T-FACE.dxf` (pasek, w który się wcina) i dwa arkusze,
które je zawierają. Przypadki `+infills` i `+infill-mitre-narrow` są po obu
stronach identyczne, co jest drugą połową dowodu: wypełniacz bez paska nad nim i
wypełniacz za wąski na 45° są cięte dokładnie tak, jak cięła je tura 14.

## Nowe pliki

`src/engine/veneers.js` · `src/engine/frontStyleArt.js` ·
`src/engine/cnc/views.js` · `src/components/VeneerPicker.jsx` ·
`src/components/FrontStyleGallery.jsx` · `scripts/e2e-turn15.mjs` ·
`test/turn15-infill-mitre.test.js` · `test/turn15-panel-is-a-wall.test.js` ·
`test/turn15-sources-and-views.test.js` · `verify/t15/`

## Nowe liczby w `profile.js`

`appearance.outline.polygonOffset.factor` / `.units` (F2 — jedyne nowe LICZBY
tury) · `projectSettings.carcassSources[veneer]` z `thickness: 19` (F3.3) ·
pole `picker` na każdym źródle korpusu i frontu (F3 — to DANE, nie liczba, ale
mieszka tam, gdzie źródła).

---

# TURA 16 — MATERIAŁ (09.08.2026)

Tura MATERIAŁU. Jeden temat przeciągnięty przez całą aplikację: płyta jest
przypisana RAZ i czytana WSZĘDZIE — w kroku 5, w modalu elementu, w widoku 3D,
w BOM-ie i na arkuszach CNC. Do tego werdykty właściciela z testu oka tury 15.

## F0 — Baza — ✅ ZIELONA

Pełny reinstall, **1289 testów zielonych** (dokładnie tyle, ile zapowiada
CLAUDE.md), czysty build. Batch z czatu potwierdzony na main:
`test/sprayed-carcass-sheen.test.js` istnieje, `profile.appearance.studio.points`
ma CZTERY wpisy (dwa na `yMm 1650`, dwa na `yMm 500`), a `resolveFinishes`
zaczyna łańcuch korpusu linią natryskowego korpusu. Nic nie było odtwarzane
w ciemno.

## F1 — TOŻSAMOŚĆ MATERIAŁU — ✅ ZIELONA

Właściciel dosłownie: „przypisane materiały jeśli są takie same to łączymy,
jeśli inne to oddzielamy — dlatego przypisanie materiałów jest takie ważne".

Przed turą prawdziwe przypisanie płyty miały wyłącznie TYPY KORPUSU. Fronty nie
miały żadnego, infille/plinty/panele boczne/panele maskujące nie miały żadnego,
a lista w modalu elementu była zwinięta i myląca. To była jedna dziura i została
zaszyta jednym modułem: **`src/engine/materials.js`**.

**F1.1 — front dostaje płytę per TYP.** Ten sam dropdown MaterialStock, który
typ korpusu ma od tury 11, ten sam store, ten sam fallback Generic i ta sama
twarda bramka T15-B: zmiana efektywnej grubości przy istniejących szafkach PYTA
(Recompute / Keep), a check-out odmawia placeholderów
(`placeholderAssignments`). `projectFrontThickness` czyta teraz przypisaną płytę
przed źródłem — płyta 22 mm jest 22 mm, niezależnie od tego, który przycisk
źródła się świeci. „Recompute" naprawdę przelicza: każda szafka na podłodze
dostaje nowy `front_t` w jednej paczce i jednym cofnięciu.

**F1.2 — „Same as fronts" dla części runu.** Cztery przełączniki jednego
kształtu (`design.runMaterials`), DOMYŚLNIE WŁĄCZONE — co jest dokładnie tym, co
aplikacja robiła do tej pory, więc migracja nie przesuwa ani jednej części.
Odhaczenie pokazuje własny dropdown; ponowne zahaczenie **nie wyrzuca** wybranej
płyty. Jeden komponent, jeden kształt w store, lista grup w silniku
(`RUN_MATERIAL_GROUPS`), więc piąta część runu to wpis danych.

**F1.3 — lista elementów rozróżnia typy.** `elementMaterialChoices` zwraca JEDEN
wiersz na TYP FRONTU („Front 1 · EGGER H1180", „Front 2 · RAL 3005 Wine Red
spray"), zbudowany na `projectPalette`, więc picker jednostki i picker elementu
mają te same klucze. **Picker dopasowuje po KLUCZU, nigdy po etykiecie** — dwa
fronty na tej samej płycie mają jedną nazwę i muszą zostać dwoma wyborami.
Klucz jedzie kanałem nadpisania (`material_key`) przez silnik na `panel.meta`.

**F1.4 — nadpisanie elementu dociera do OBRAZKA (BACKLOG #75 zamknięte).**
Rozwiązanie u korzenia: `panelFinish(panel, unit, design, profile)` — czysta
funkcja w silniku, testowana w node — a `3d/UnitView.jsx`, okno edytora i okno
detalu tylko ją konsumują. Półka przełączona na Front 2 zmienia kolor na ekranie
(zmierzone w przejściu). Przy okazji wypadł błąd z tury 12: okno edytora
podawało do `THREE.Color` OBIEKT koloru zamiast hexa, więc natryskowy front był
w nim biały.

**F1.5 — jedno źródło w dół.** `engine/bom.js` czyta `resolvePanelMaterial`
zamiast własnej rozwiązywalni; tożsamością wiersza cięcia jest KLUCZ materiału,
więc dwa fronty na różnych płytach to dwie grupy, dwa fronty na tej samej — jedna,
a nadpisanie PRZENOSI część między grupami. Testy w
`test/turn16-material.test.js` trzymają obie połowy zdania właściciela.

## F2 — CNC PO MATERIALE — ✅ ZIELONA

**Przełącznik sprayed / non-sprayed znika z widoku CNC** (`VIEW_PRESETS`), a
zostaje w `EXPORT_PRESETS`, bo to od nich bierze nazwę plik DXF i reguła 0 pilnuje
tego co do bajtu. Sekcje arkusza są teraz **po PRZYPISANYM MATERIALE**:
tożsamość to `material_id`, nagłówek to nazwa płyty tak, jak nazywa ją BOM,
grubość wypadła z klucza (pozycja magazynowa ma jedną grubość, więc dzielenie po
niej mogło tylko oddzielić płytę od samej siebie). Część z zahaczonym „Same as
fronts" ląduje w sekcji frontu 1 — bo ptaszek jest PRZYPISANIEM, nie stanem
widoku. Widok po SZAFCE z tury 15 bez zmian, przełącznik między widokami zostaje.

## F3 — Czytelność CNC: symbole skalują się z rysunkiem — ✅ ZIELONA

Zrzut właściciela: przy oddaleniu nazwy szafek, kody części i symbole wierceń
zostają wielkości EKRANU, nachodzą na siebie i wychodzą poza części. Przyczyną
była jedna linia arytmetyki powtórzona w pięciu miejscach — `LABEL_PX * mmPerPx`
— czyli rozmiar w milimetrach arkusza dobrany tak, żeby wyszedł stały w
pikselach. Napis jest teraz częścią RYSUNKU: `profile.cnc.annotation` w
milimetrach arkusza (22 / 45 / 70), podpis części rysowany WEWNĄTRZ jej obrysu,
a arytmetyka w `engine/cnc/annotation.js` (czysta, testowalna). Co się nie
mieści — skraca się, a poniżej progu czytelności (`minLabelPx`) po prostu nie
jest rysowane. Otwory mają swoją prawdziwą średnicę zamiast ekranowego minimum,
więc trzydzieści sześć wierceń przestaje zlewać się w szarą plamę większą od
części pod nimi.

## F4 — Drzwi i wysokości — ✅ ZIELONA

**F4.1** — przy przełączniku „Door extend" stoi LICZBA: domyślnie 38 z profilu,
edytowalna, na siatce 0,5 mm. Silnik przyjmuje liczbę od tury 3, więc to
kontrolka doganiająca silnik; `doorExtendMm` / `doorHeightOf` w `engine/doors.js`
to jedno czytanie tego pola dla panelu, multi-selekcji i testu.

**F4.2** — funkcji nie było na multi-selekcji w ogóle. Jest, obok Add / Remove
doors: pole 38, „Apply (n)" i „Off", jedna paczka i jedno cofnięcie
(`setDoorExtendBulk`), a kity bez tej cechy są POLICZONE i zgłoszone, nie po
cichu pominięte.

**F4.3** — wysokość DRZWI i wysokość PANELU MASKUJĄCEGO to dwa niezależne pola
(decyzja właściciela B). Panel dostał własne `below_mm` (lustro `top_mm`),
przycięte przez pokój — pod podłogę nie schodzi — a `endPanelDrop` czyta je i
NIGDY nie zagląda do `door_extend`. Reguły maski z tury 14 (L = suma runu,
głębokość = szafka + 10) nietknięte, co trzyma osobny test.

## F5 — Save jest STANEM, nie błyskiem — ✅ ZIELONA

Zielony ptaszek z tury 15 pokazywał się na moment, bo SAVED było tym samym
booleanem co FOLDED — w komponencie. Rozdzielone: FOLDED zostaje preferencją
widoku, a SAVED to MIGAWKA danych sekcji (`settingsSectionSnapshot`) trzymana w
`uiStore`, więc przeżywa zamknięcie i ponowne otwarcie Ustawień. Kolor jest
czystą funkcją `(saved, current)` — zielony, dopóki na ekranie jest to, co
zapisano; czerwony w chwili, gdy cokolwiek się zmieni. Sekcja czerwienieje od
SWOICH zmian, nie od sąsiada.

## F6 — NAZWA szafki należy do właściciela — ✅ ZIELONA

Domyślna zostaje automatyczna (01, 02, WU05…) i staje się edytowalna w miejscu,
w którym jest pokazana — w nagłówku panelu. Trzymana tam, gdzie automatyczna
(`params.unit_num`), więc „wszystko w dół drukuje nową nazwę" jest prawdą bez
mówienia o tym czemukolwiek: etykieta na kanwie, podpis bloku CNC, kody części,
BOM, rysunki, check-out. Wyczyszczenie pola przywraca automatyczną. Duplikaty są
DOZWOLONE i oflagowane (`engine/naming.js`, miękkie ostrzeżenie), a nazwa jedzie
do nazwy pliku przez `fileSafeName` — „01" przechodzi bez zmiany.

## F7 — ŚWIATŁO w edytorze elementu — ✅ ZIELONA

„Serio nic nie widać". Oba okna (edytor rozstrzelony i detal części) miały TRZY
ŚWIATŁA JAKO LITERAŁY we własnym JSX — czyli rig bez pokrętła. Jest jeden rig w
profilu (`appearance.editorRig`), konsumowany przez `3d/EditorRig.jsx`, z
arytmetyką w `engine/render.js`. Stare trzy podniesione o ćwierć plus TRZY nowe
lampy z kątów, w których stary rig nie miał nic: z boku, OD DOŁU i od tyłu — bo
ściana gniazda odwrócona od klucza jest czarna niezależnie od tego, jak mocny
jest klucz. **Zmierzone, nie oceniane okiem**: ten sam region detalu w
rozstrzelonej szafce, luminancja liczona po MEBLU (piksele poniżej 244, bo tło
okna to płaskie `#fafaf8`): **średnia 166,0 → 193,8 (+17 %)**, **p05 50,0 →
59,9 (+20 %)** przy KONTRAŚCIE 157,9 → 170,2. Rig podniesiony bez spłaszczenia
modelunku. Pełny raport: `verify/t16/light.md`.

## F8 — Wiszące szafki a połysk — ✅ ZIELONA (DIAGNOZA; rig NIE zmieniony)

CLAUDE.md każe najpierw ZDIAGNOZOWAĆ w przeglądarce i naprawić to, co się
znajdzie. Znalazło się co innego, niż zakładał zgłoszony objaw.

1. **Materiały są IDENTYCZNE.** Odczytane z ŻYWEJ sceny przez uchwyt tury 13
   (`window.__cc.views.room`; każdy mesh panelu niesie od tej tury swój id z
   silnika): drzwi wiszącej i drzwi stojącej mają ten sam kolor `#f2f0ec`, tę
   samą chropowatość 0,4, ten sam probe 0,25 i ten sam clearcoat 0,35. Ścieżka
   materiału nie jest zepsuta — „coś z farbą" nie zachodzi.
2. **Objaw się NIE REPRODUKUJE.** Kontrolowana para (szafka stojąca i wisząca na
   tej samej ścianie, w tym samym x, obie z drzwiami), mierzona NA DRZWIACH,
   których położenie policzono z żywej kamery: wisząca **244,1** vs stojąca
   **241,4** na bieli, a na froncie RAL 3005 **115,2 vs 92,4** — wisząca jest
   JAŚNIEJSZA o 22,8, nie ciemniejsza.
3. **Kandydat na poprawkę idzie w złą stronę.** `scripts/t16-gloss-lab.mjs`
   przemiata cztery rigi, w tym oba, które CLAUDE.md wymienia z nazwy (para oczu
   przesunięta, dedykowana para na 1860). Każdy podnosi wiszące JESZCZE bardziej
   i poszerza różnicę, która i tak jest odwrotna do zgłoszenia. Więc rig zostaje
   nietknięty — to jest odpowiedź wynikająca z pomiaru, a nie z ostrożności.

To, co pomiar naprawdę pokazuje (biały front przy domyślnym połysku nie ma gdzie
mieć refleksu, bo dyfuzja siedzi przy suficie zakresu), jest zapisane w
BLOCKERS jako osobny, mierzalny temat — pod własnym nagłówkiem, a nie pod tym.
Ławka zostaje gotowa: jedno polecenie mierzy dowolną parę szafek w dowolnym
projekcie, więc SCENA WŁAŚCICIELA może być zmierzona, zamiast opisana.

## F9 — Infill do sufitu — ✅ ZIELONA

Boczny wypełniacz dostał parę, którą panel ma od tury 15: liczbę „Above unit" i
▲, które puszcza go do sufitu. Mechanika jest tą samą mechaniką — store miał
`sideInfillToCeiling` od tury 6 i brakowało wyłącznie gestu w panelu — więc to
użycie, nie kopia. Reguły panelu przypięte w turze 15 zostają zielone.

## F10 — Przejście w przeglądarce + dokumentacja + BRAMKA — ✅ ZIELONA (25/25)

`scripts/e2e-turn16.mjs` w prawdziwym Chromium: **25 sprawdzeń, wszystkie
zielone**, 20 zrzutów i `measurements.json` w `verify/t16/`. Mierzy, nie ufa —
a tam, gdzie chodzi o ŚWIATŁO, piksele są dekodowane ze zrzutu
(`scripts/png.mjs`, `zlib` node'a, zero nowych zależności) i luminancja jest
liczbą w pliku.

### Co pokazuje przejście

| # | zrzut | co dowodzi |
|---|---|---|
| 1 | `1a-step5-front-boards-and-switches.png` | płyta na KAŻDYM typie frontu i cztery „Same as fronts" |
| 2 | `1b-plinths-on-their-own-board.png` | odhaczony plinth ma własny dropdown i trzyma płytę |
| 3 | `2a-element-modal-front-types.png` | „Front 1 · …" i „Front 2 · …" jako osobne wiersze |
| 4 | `3a/3b-shelf-before/after-override.png` | półka przemalowana ŻYWCEM przez nadpisanie |
| 5 | `4a-cnc-by-material.png` | cztery sekcje nazwane płytami, zero przełącznika sprayed |
| 6 | `5a/5b-cnc-near/far-zoom.png` | kody części WEWNĄTRZ części, przy obu przybliżeniach |
| 7 | `6a-door-extend-single.png`, `6b-door-extend-multi.png` | liczba 38 na jednych drzwiach i na multi-selekcji |
| 8 | `7a-wall-unit-two-heights.png` | wysokość drzwi i panelu ruszane niezależnie |
| 9 | `8a/8b/8c-save-*.png` | zielony po zapisie i po ponownym otwarciu, czerwony po zmianie |
| 10 | `9a-renamed-in-the-cnc-tree.png`, `9b-renamed-in-the-bom.png` | „Island" w drzewku CNC i w BOM-ie |
| 11 | `10a/10b-editor-light-*.png` | światło edytora przed i po, z liczbami |
| 12 | `11a-wall-vs-base-gloss.png` + `gloss-*.png` | pomiar połysku wisząca vs stojąca, cztery rigi |
| 13 | `12a-infill-to-the-ceiling.png` | wypełniacz puszczony do sufitu |

## Dokumentacja

`BUILD-LOG` — ten wpis, faza po fazie. `BACKLOG` — **#75 zamknięte** (kolor per
element maluje 3D), model materiału dopisany jako zamknięty, nowe wpisy z tury.
`BLOCKERS` — wpis o połysku (co zmierzono i czego pomiar nie potwierdził) oraz o
tym, czego pomiar nie mógł objąć. `verify/t16/cnc-export-identity.md` — raport
tożsamości CNC z nazwaną deltą; `verify/t16/light.md` — obie mierzone fazy z
tabelami liczb.

## BRAMKA — ✅ ZIELONA

| brama | wynik |
|---|---|
| pełny reinstall (`rm -rf node_modules && npm install`) | czysty |
| testy | **1327 / 1327** (baza tury: 1289, nowych 38) |
| build | czysty |
| istniejące fixtures | `git diff fixtures/` **pusty** — 12 plików, żadnego dodania |
| zależności | nietknięte (`git diff package.json package-lock.json` pusty) |
| czystość silnika | `src/engine/` importuje wyłącznie `src/engine/` |
| tożsamość CNC | **2050 odcisków, 0 różnic**; delta nazwana i opublikowana |
| `verify/t16/` | 20 zrzutów + 10 z ławki połysku, `measurements.json`, `gloss-lab.json`, dwa raporty |
| przejście w przeglądarce | **25 / 25** |
| PR | otwarty, **nie scalony** |

**Delta CNC — jedna, nazwana: GRUPOWANIE ARKUSZA PRZECHODZI ZE
SPRAYED/NON-SPRAYED NA PRZYPISANY MATERIAŁ.** Eksportowane bajty nie ruszyły się
w ogóle (2050 odcisków identycznych), bo grupowanie, które się zmieniło, jest
WIDOKIEM — granica postawiona w turze 15 i utrzymana. Pełne wyjaśnienie z
tabelką „przed / po" w `verify/t16/cnc-export-identity.md`.

## Nowe pliki

`src/engine/materials.js` · `src/engine/naming.js` ·
`src/engine/cnc/annotation.js` · `src/3d/EditorRig.jsx` ·
`scripts/e2e-turn16.mjs` · `scripts/png.mjs` · `scripts/t16-gloss-lab.mjs` ·
`test/turn16-material.test.js` · `test/turn16-phases.test.js` · `verify/t16/`

## Nowe liczby w `profile.js`

`cnc.annotation.partLabelMm` / `.blockLabelMm` / `.sectionLabelMm` /
`.partLabelInset` / `.minLabelPx` / `.minSymbolPx` (F3) ·
`appearance.editorRig.ambient` / `.hemisphere` / `.lamps[5]` (F7 — pięć lamp
jako DANE, z których trzy są nowe). Nic w `studio.points` nie ruszone: F8
kończy się pomiarem, który mówi, żeby ich nie ruszać.

# TURA 17 — PARYTET (09.08.2026)

Tura PARYTETU. Jedno zdanie z CLAUDE.md przeciągnięte przez cały eksport: to, co
właściciel widzi na elemencie, ma być tym, co maszyna wycina — a to, co wychodzi
do maszyny, ma nieść numer szafki i nic więcej. Do tego zawiasy, wysokości
szuflad i dwa nowe kity zbudowane WYŁĄCZNIE z liczb właściciela.

## F0 — Baza — ✅ ZIELONA

Pełny reinstall (`rm -rf node_modules && npm install`), **1327 testów
zielonych** — dokładnie tyle, ile zapowiada CLAUDE.md — czysty build. Obie
paczki z czatu potwierdzone na main, nie odtwarzane w ciemno: `Environment` jest
EKSPORTOWANE z `src/3d/Scene.jsx` (linia 133) i importowane przez
`CabinetEditorModal.jsx` (linia 11), a cztery `appearance.studio.points` czytają
10, 10, 3, 3 — dwa na `yMm 1650` i dwa na `yMm 500`.

## F1 — KAŻDY ELEMENT MÓWI, DO KTÓREJ SZAFKI NALEŻY — ✅ ZIELONA

Właściciel: „numer szafki musi być na każdym elemencie, inaczej się pogubimy
który jest do którego".

**Jeden formater, `src/engine/cnc/partLabel.js`**, wołany i przez arkusz, i przez
zapis DXF — CLAUDE.md F1.1 prosi o dokładnie to („so the two cannot word it
differently"). `F-01 BUR 597x568`: numer szafki tak, jak ją nazywa właściciel
(od tury 16 F6), kod części, wymiar cięcia.

Trzy decyzje, wszystkie zapisane przy liczbie:

* **`x`, nie `×`.** Ten napis trafia do pliku R12 — dialektu, który VCarve na
  maszynie Piotra parsuje — a R12 jest starszy niż jakakolwiek umowa o tym, co
  znaczy bajt powyżej 127. Arkusz przejmuje pisownię EKSPORTU, a nie odwrotnie:
  etykieta czytana z DESKI i etykieta czytana z EKRANU muszą być tą samą
  etykietą.
* **Numer szafki nie jest drukowany dwa razy.** Silnik i tak wkleja go w id
  frontu (`01-F`), więc stara etykieta wychodziła jako `01-01-F`. `partCode()`
  obcina prefiks — dokładnie tak, jak `dxfFileName` robi to od tury 3.
* **Etykieta MIEŚCI SIĘ w obrysie** (F1.3). Wysokość była ograniczana udziałem
  KRÓTSZEGO boku i nigdy nie patrzyła na szerokość — nieszkodliwe, dopóki napis
  miał sześć znaków. Teraz kurczy się także do szerokości, a na desce zbyt
  wąskiej przy progu czytelności (30 mm filler) SKRACA SIĘ (`01 FIL~`) zamiast
  wystawać poza obie krawędzie. Ogonek to ASCII `~` z tego samego powodu co `x`.

**Rozmiar na ekranie** (F1.3): podpis w elemencie ma teraz skalę żółtego
nagłówka — `cnc.annotation.partLabelMm` równa się `sectionLabelMm`, a równość
trzyma test. Arkusz ma jedną skalę typograficzną, nie dwie.

## F2 — EKSPORT WEDŁUG MATERIAŁU I NIC POZA ETYKIETAMI — ✅ ZIELONA

**F2.1 — wybierz płytę, wyślij całość.** Panel CNC dostaje wybór płyty i jeden
przycisk: jeden materiał, jeden plik, przez wszystkie odhaczone szafki, ułożony
tym samym `layoutPanels`, którym rysuje podgląd (`materialExportSection` w
`engine/cnc/views.js`, `materialSheetDxf` w `dxf.js`). „All" jest tym eksportem,
który aplikacja miała, i zostaje domyślne.

**F2.2 — w pliku są etykiety i żadnych innych liter.** Uczciwy raport: nic nie
trzeba było usuwać, bo nic innego nigdy nie było zapisywane. To, co ta tura
robi, to zamienia przypadek w REGUŁĘ — i robi to w momencie, w którym najłatwiej
byłoby ją złamać, bo nowy eksport per materiał MÓGŁBY nieść żółte nagłówki
sekcji i nazwy szafek z podglądu. Nie niesie ich i nie ma ścieżki, którą mógłby.
Test `DELTA 2` sprawdza OBIE ścieżki eksportu.

**F2.3** — ZIP per panel bez zmian (tura 15), do przecięcia jednej uszkodzonej
formatki.

## F3 — PÓŁKI LEŻĄ TAK, JAK MÓWI WIDOK 3D — ✅ ZIELONA

Właściciel: „odwróć wszystkie półki o 90 stopni w CNC — w 3D orientacja jest
dobra, ale nie współgra z CNC".

Spisane, niezgodność wygląda tak: KAŻDA deska w tej aplikacji jest kładziona
SŁOJEM W GÓRĘ RYSUNKU — bok 560 × 2150, plecy 600 × 2150, drzwi 597 × 2147, a
TOP jest rysowany OBRÓCONY właśnie po to (`drawTOP_ROT90`). Jedna rodzina nie:
półka jest rysowana `szerokość × głębokość`, więc na arkuszu półka i wieniec tej
samej szafki leżą pod kątem 90° do siebie, a w 3D są równoległymi deskami o
równoległym rysunku.

**Obraca się UŁOŻENIE, nie część.** Własne słowo CLAUDE.md i właściwe: ramka CNC
półki nie rusza się o milimetr, więc `fixtures/golden-partition-biscuits.json` —
który przypina znaczniki lameli półki w tej ramce — jest nietknięty, plik per
panel jest nietknięty i mapowanie `engine/joinery.js` jest nietknięte. Rusza się
`engine/cnc/layout.js`: `sheetTurn()` mówi, co kłaść obrócone, `turnPoint()`
obraca, a zapis DXF stosuje tę samą transformację co podgląd. **Obrót 0 jest
dokładną tożsamością.**

Zasięg jest zasięgiem CLAUDE.md (poziome deski: `SHELF`, `PARTITION`,
`RAIL-PART`, `FIXED`), a wewnątrz niego pytanie zadaje się RYSUNKOWI, nie
nazwie: deska już ułożona słojem w górę zostaje tam, gdzie jest. To ma znaczenie
na panelu `FIXED` lodówki i piekarnika, który kit rysuje `głębokość × szerokość`
jak TOP — obrócenie go „po nazwie" położyłoby go w poprzek własnego słoja, czyli
dokładnie tak, jak wygląda skarga, którą ta delta zamyka.

## F4 — ELEMENT POKAZUJE TO, CO WYTNIE MASZYNA — ✅ ZIELONA

Właściciel o szufladach: „jak je edytuję to nie mają żadnych wcięć, nie widzę
dziurek". O plecach lodówki: „na CNC są dog bones a na elemencie nie ma".

**Obie skargi miały jedną przyczynę i był nią jeden `switch`.**
`panelPlacement` odpowiada na pytanie „gdzie w szafce leży ramka CNC tej
części", a dla boku szuflady, frontu szuflady, drzwi i listew pleców lodówki
odpowiadał `null`. Część bez ramki nie ma gdzie położyć własnego wiercenia —
więc wiercenie nie było rysowane. Dane cięcia nigdy nie były wątpliwe: maszyna
wycina te rowki i te otwory od tury 3.

* **F4.1** — `machiningLines()` w `engine/joinery.js` czyta `panel.cnc` i
  `result.drills` (te same dwa rekordy, z których pisany jest DXF), a
  `3d/PartMachining.jsx` kładzie je na elemencie w kolorach warstw podglądu CNC.
  Nie ma drugiego rysowania dog bone'a i być nie może: gdzie się rozejdą,
  prawdą jest eksport.
* **F4.2** — szuflada jest ELEMENTEM: `elementKind` zwraca `drawer` dla pudła,
  każda deska nazywa się z osobna („Drawer 2 — side (left)"), ma swój modal
  detalu. Panel nośny runnerów (`DP`) i fillery zostają mechanizmem — nikt ich
  nie wybiera, idą za stosem.
* **F4.3** — oba rowki niosą GŁĘBOKOŚĆ: `DRAWER_RUNNER_POCKET` 2 mm (runner ma
  siedzieć równo), `DRAWER_BOTTOM_POCKET` 7 mm (stoi w nim deska). Liczby
  w `profile.js`, nazwy warstw takie, jakie repo już ma (tura 3) — bez nowej
  nazwy warstwy. Ani jeden bajt eksportu się nie ruszył: prostokąt jest tym
  samym prostokątem, doszła adnotacja.
* **F4.4** — rysowanie samego okucia runnera POZA turą (decyzja B właściciela).

## F5 — WSTECZ, JEDEN POZIOM — ✅ ZIELONA

Okno edytora ma DWA POZIOMY i teraz to mówi: szafka i jeden jej element.
`‹ Cabinet` wraca do szafki i odznacza część; **nie składa rozstrzelenia i nie
zamyka okna** (odpowiedź 1 właściciela) — stolarz, który rozebrał korpus, żeby
obejrzeć trzy elementy po kolei, nie chce go z powrotem złożonego między dwoma
z nich. Escape robi to samo NA TYM POZIOMIE; z niczym zaznaczonym klawisz należy
do powłoki i nadal zamyka okno.

## F6 — TRZY MAŁE WERDYKTY — ✅ ZIELONA

**F6.1 — górny infill idzie DO SUFITU.** Boczne fillery mają parę „liczba + ▲"
od tury 16; jedyna gałąź, która zwracała `null`, była tą, która najbardziej jej
chce. Te same wywołania store'a (`setTopInfill`, `fillToCeiling`), którymi od
tury 6 działa przeciąganie krawędzi i dwuklik. Nic nie rozwidlone.

**F6.2 — zmiana nazwy jest ZNAJDOWALNA.** Kontrolka z tury 16 NIE jest
przebudowana (CLAUDE.md zabrania) — dostaje etykietę „Name", żeby czytała się
jak pole, a nie jak dekoracja, i wpis **„Rename…"** w menu pod prawym
przyciskiem, który zaznacza szafkę, otwiera panel i stawia kursor w tym jednym
polu. Jedna nazwa, jedno pole, dwoje drzwi do niego.

**F6.3 — etykieta nazwy na kanwie.** „Paskudna chmurka" to był DYMEK KOMIKSOWY:
biały zaokrąglony prostokąt z obrysem 2 px. Rysunek mebla nie ma po co go nosić.
Teraz: płaska tabliczka, kąty proste, bez obrysu, w tonach aplikacji
(`COLORS.labelPlate` / `.labelInk`) i w jej własnej typografii etykiet — małe,
wersaliki, ze światłem międzyliterowym, dokładnie jak każdy `cc-label` w
panelach. Podpisy WYMIAROWE zostają w dymku: leżą na białym tle i obrys mają
zasłużony.

## F7 — ZAWIASY: STANDARD PROJEKTU I RĘKA — ✅ ZIELONA

**F7.1 — „Standard hinges: 2 / 3", domyślnie 3.** Trzy to to, co kity wiercą od
tury 1, więc projekt, który tego nie tknie, jest cięty jak wczoraj. Na 2 odpada
DOKŁADNIE JEDEN ŚRODKOWY zawias, a skrajne nie ruszają się nigdy — nie jest to
ani liczba, ani nowe rozstawienie (`hingeRows` / `middleHingeIndex`). Który
środkowy: ten najbliżej środka drzwi, bo to ten zawias stolarz zdejmuje; przy
parzystej liczbie środkowych wygrywa NIŻSZY — arbitralnie, ale zapisane, więc
odpowiedź jest zawsze ta sama.

**F7.2 — zawiasy edytowalne ręcznie:** dodaj, usuń, przesuń — idiom półki, w
kontrolce półki, na elemencie DRZWI. Jawna lista WYŁĄCZA regułę dla tej szafki
(reguła kłócąca się z tym, co powiedziano na warsztacie, byłaby aplikacją
przegłosowującą stolarza); „Reset" oddaje ją z powrotem. Lista jest SZAFKI, bo
jej drzwi wierci się jako komplet, a korpus nosi jedną kolumnę zawiasów na
zawiasowanym boku — różnice między skrzydłami idą do BLOCKERS.

**F7.3 — wszystko za tym idzie.** I to jest miejsce, w którym trzy tabele
przesunięć puszek zamieniły się w jedno zdanie: **puszka jest na wysokości
swojego zawiasa** i zawsze była. `centre + doorExtend` daje co do milimetra to
samo, co `baseOffsets`, `sinkOffsets` i `hingeCentres` dawały osobno — cały
zestaw testów przechodzi bez zmiany, żaden odcisk się nie ruszył — a to jest to,
co sprawia, że zawias zdjęty zabiera swoją puszkę, a zawias przesunięty ręką
przesuwa ją ze sobą. Wiercenie w eksporcie, bryły w 3D i licznik BOM liczą tę
samą listę.

## F8 — WYSOKOŚCI SZUFLAD, GDY FRONTY ZEJDĄ — ✅ ZIELONA

**F8.1 — fronty schodzą** (`drawer_fronts: false`), dokładnie tym idiomem, co
„Remove doors" z tury 15, z menu pod prawym przyciskiem. Pudła, runnery i korpus
zostają co do milimetra tym, czym były.

**F8.2 — każda szuflada ma edytowalną WYSOKOŚĆ** (nie pozycję — właściciel był
w tym dosłowny), na froncie i — gdy fronty zeszły — na pudle. Szuflada
ustawiona ręką bierze swoją wysokość; te, których nikt nie tknął, biorą to, co
zostało, w proporcji kitu, więc stos nadal wypełnia lico.

**F8.3 — klamra jest właściciela:** nie krócej niż **28 + 10 mm** liczone od osi
wkrętów. Jest FUNKCJĄ SILNIKA z własnym testem, a nie liczbą wpisaną w
kontrolkę: wysokość, która przychodzi z szablonu, importu albo starego projektu,
musi być odrzucona w tym samym miejscu, co wpisana z klawiatury.

**F8.4 — dryf 4:3:2 kitu ZAMROŻONY** (#64, zamknięte przez właściciela): przy
niczym nietkniętym `budrHeightsWithOwn` zwraca `budrFrontHeights` bez zmian. Ta
faza edytuje SZTUKĘ i nie dotyka domyślnych kitu.

## F9 — KIT: PANEL D/W — ✅ ZIELONA (z wpisami w BLOCKERS)

Wyłącznie liczby właściciela.

* **Front i nic więcej** — bez boków, bez dna, bez pleców i **bez puszek
  zawiasów**: „no hinges, flat, no door furniture" jest wierceniem, którego nie
  ma, a nie tylko brakiem okucia w BOM.
* **594 mm i to jest WARTOŚĆ, nie domyślna.** Jakiejkolwiek wysokości byłby
  korpus, front wychodzi 594 — bo powyżej 600 drzwi urządzenia się nie otworzą,
  a aplikacja nie ma być tym, co na to pozwoliło. Test mówi to na pięciu
  wysokościach.
* **Plint wycięty w tym miejscu, 20 mm od góry** — jako OBRYS, nie kieszeń, bo
  tym to jest (deska jest cięta do kształtu) i dzięki temu nie potrzebuje nowej
  nazwy warstwy na maszynie.
* **Jeden wieniec, zawsze 600 mm szerokości**, głębokość jak reszta runu.
* W bibliotece nazywa się **„D/W panel"** — ten sam kit odpowiada za pralkę i za
  lodówkę.

Wszystko inne — mocowania, luzy, jak spotyka się z sąsiadami, wycięcie w plincie
NALEŻĄCYM DO RUNU — jest w BLOCKERS i **nie ma go w kicie**.

## F10 — KIT: SZAFKA POD PIEKARNIK — ✅ ZIELONA (z wpisami w BLOCKERS)

* Piekarnik ma 595, więc **półka, na której stoi, siedzi 598 mm OD GÓRY
  szafki** — od góry, nie od osi i nie od podłogi. Napisane w komentarzu przy
  liczbie, bo to jest ta liczba, którą ktoś później „poprawi", mierząc od
  plinta.
* **Szuflada pod spodem**, rysowana tak, jak rysuje się szuflady, z rowkami,
  które daje jej F4. Stos ma proporcję `[1]` w profilu, więc nie pojawia się
  jako wariant szafki szufladowej.
* **Bez pleców poza tymi za szufladą.** Te plecy mocują się standardowo —
  **4 dog bones: po jednym w każdy bok, dwa w dno szafki** — czyli wzorem
  RAIL1 lodówki z tury 14. Test porównuje je z lodówką zamiast wyprowadzać
  drugi raz.

## F11 — MIARKA — ✅ ZIELONA

Klik, klik, odczyt w milimetrach. Rzutuje promień na SCENĘ w fazie
przechwytywania na elemencie `canvas`, więc: mierzy to, co tam naprawdę stoi
(róg szafki, blat, ścianę), a klik w trybie miarki nie może niczego zaznaczyć,
przeciągnąć ani otworzyć — **mierzy i nigdy nie edytuje**. Overlay'e (`ccHelper`)
są odfiltrowane, więc miarka nie zmierzy do własnego znacznika. Odczyt idzie
przez `formatMm` i przez siatkę warsztatu (0.5 mm). Escape czyści pomiar, drugi
Escape zamyka narzędzie.

## F12 — PRZEJŚCIE, DOKUMENTY, BRAMKA

`scripts/e2e-turn17.mjs` — 25 sprawdzeń, wszystkie MIERZONE (liczba czytana ze
silnika albo prostokąt czytany z DOM), 24 zrzuty w `verify/t17/`.

## BRAMKA — ✅ ZIELONA

| brama | wynik |
|---|---|
| pełny reinstall (`rm -rf node_modules && npm install`) | czysty |
| testy | **1362 / 1362** (baza tury: 1327, nowych 35) |
| build | czysty |
| istniejące fixtures | `git diff fixtures/` **pusty** — 12 plików, żadnego dodania |
| zależności | nietknięte (`git diff package.json package-lock.json` pusty) |
| czystość silnika | `src/engine/` importuje wyłącznie `src/engine/` |
| tożsamość CNC | **CZTERY nazwane delty i nic poza nimi** — 0 zmian geometrii per panel, 0 zmian spisu encji |
| `verify/t17/` | 24 zrzuty, `measurements.json`, `walk.json`, raport tożsamości, odciski przed/po, dowód encja po encji |
| przejście w przeglądarce | **25 / 25** |
| PR | otwarty, **nie scalony** |

**Delty CNC — cztery, nazwane, opublikowane w
`verify/t17/cnc-export-identity.md`:** (1) etykieta w elemencie niesie numer
szafki; (2) w pliku są etykiety i żadnych innych liter — teraz jako reguła
przypięta testem na obu ścieżkach eksportu; (3) półki kładzione obrócone o 90°;
(4) dog bone'y, które eksport już wycina, stają się widoczne na elemencie — i
spis encji tego NIE ZAUWAŻA, co jest dowodem, że ruszył się WIDOK.

## Nowe pliki

`src/engine/cnc/partLabel.js` · `src/engine/ruler.js` ·
`src/3d/PartMachining.jsx` · `src/3d/Ruler.jsx` · `scripts/e2e-turn17.mjs` ·
`test/turn17-phases.test.js` · `verify/t17/`

## Nowe liczby w `profile.js`

`hinges.standard` / `.standardOptions` (F7.1) ·
`baseDrawerUnit.runnerPocketDepth` / `.bottomPocketDepth` (F4.3) ·
`baseDrawerUnit.runnerScrewFromBase` / `.clearanceBelowRunner` (F8.3) ·
`dwPanel.*` (F9) · `ovenUnit.*` (F10). Zmienione: `cnc.annotation.partLabelMm`
22 → 70 (F1.3 — jedna skala typograficzna na arkuszu).

---

# TURA 18 — 10.08.2026 — TURA SZUFLADY

Właściciel położył na stole ostatnie brakujące liczby — dwie kieszenie w boku
szuflady, odczytane z jego własnego warsztatowego DXF-a — i przyniósł całą
drabinę MOVENTO 760H jako GLB. Więc: szuflady stają się PRAWDZIWE (boki niosą
obróbkę, której maszyna i tak potrzebowała), prowadnice stają się WIDOCZNE
(modele z bucketa, pozycje z LISP-a), a etykiety CNC przestają wychodzić poza
swoje elementy. Plus poprawki szafki pod piekarnik z jego recenzji.

Baza: `d220ee5` — main po scaleniu tury 17 plus pakiet z czatu. Testy na
starcie: **1372**.

## F0 — BAZA — ✅ ZIELONA

Pełny reinstall, 1372 testy zielone, czysty build. Pakiet z czatu potwierdzony
na main: `test/turn17-appliance-kits-fix.test.js` istnieje i przechodzi,
`P.dwPanel.frontWidth === 594`, `getUnitType('OVEN_BASE').heightGroup === 'base'`,
`getUnitType('DW_PANEL').plinth === true` przy `legs === false`.

## F1 — ETYKIETY CNC: ZAWIJANE, WYŚRODKOWANE, NIGDY NA ZEWNĄTRZ — ✅ ZIELONA

Zrzut właściciela: `F01 TOP 564x540 F01 BOTTOM 564x…` przechodzące przez
elementy i wchodzące w sąsiadów. Dwie rzeczy naraz i obie są tu naprawione.

* **Etykieta była JEDNĄ LINIĄ**, więc mały element mógł ją zmieścić tylko
  kurcząc ją do zera albo wywieszając poza własne krawędzie.
* **ARKUSZ i PLIK liczyły dopasowanie każde po swojemu** — jeden z
  `annotation.partLabelMm` i pudełka o połowie wysokości, drugi z
  `cnc.labelHeight` i współczynnika — więc obrazek na szkle i litery na płycie
  mogły się nie zgadzać. I nie zgadzały się.

**Jedna funkcja układu** (`engine/cnc/annotation.js` `labelBlock`), używana przez
`components/CncView.jsx` I przez `engine/cnc/dxf.js`, z tym samym prostokątem
elementu jako pudełkiem. Blok łamie się na własnych granicach słów (`F-01` /
`BUR` / `597x568`), jest wyśrodkowany w elemencie w OBU osiach, a linia, która
i tak się nie mieści, jest ucinana ASCII-owym `~` — środkowym krokiem tury 16
między „narysuj" a „ukryj". Etykieta NIGDY nie przecina swojego obrysu, i jest
to przypięte testem na każdym elemencie każdego zestawu.

**Połowa rozmiaru w EKSPORCIE** (`cnc.exportLabelScale: 0.5`): plik pisze to, co
układa arkusz, na połowie jego wysokości — nigdy poniżej `labelMinHeight` i
nigdy powyżej `labelHeight` LISP-a. Arkusz na ekranie zachowuje swój rozmiar.

**Szerszy krok pisma i ciaśniejsze wypełnienie**: `MONO_ADVANCE` 0.62 → 0.85,
`labelFillRatio` 0.94 → 0.85. DXF nie niesie fontu, czytnik CAD wybiera własny,
a font właściciela jest szerszy od naszego — etykieta ma się mieścić w
NAJGORSZYM rozsądnym kroju, nie w najlepszym. Żadnego STYLE w pliku i nigdy nie
będzie: komentarz nagłówkowy `dxf.js` mówi dlaczego (stylowany DXF zabił parser
VCarve 02.08.2026).

Przy okazji: arkusz obraca teraz etykietę razem z elementem położonym OBRÓCONYM.
Plik robi to od tury 17, ekran nie robił — dokładnie ten rodzaj niezgody, o
którą chodzi w F1.1.

## F2 — WYSOKOŚCI SZUFLAD NAPRAWDĘ SIĘ ZAPISUJĄ — ✅ ZIELONA

Właściciel edytuje wysokość szuflady w szafce kuchennej i wartość wraca do
liczby zestawu. **Jeden korzeń, i to jedna linia.**

`setDrawerHeight` rozgałęział się po `typeof ref === 'number'` — „brak id znaczy
BUDR". Ale kuchenna szafka szufladowa dostaje WIERSZE ELEMENTÓW w chwili
postawienia (`newUnit`: szafka szufladowa JEST swoimi szufladami), więc jej
szuflady MAJĄ id, wywołanie szło ścieżką szafy i zapisywało `height_mm` na
elemencie. Silnik budr czyta wyłącznie `params.drawer_heights`. Liczba lądowała
tam, gdzie nikt nie patrzy.

**Naprawa w korzeniu:** rozgałęzienie pyta o ZESTAW (`drawerStyle === 'budr'`),
a nie o kształt, który akurat miał w ręku wołający. Id jest rozwiązywane do
INDEKSU szuflady z własnych wierszy szafki. Ścieżka szafy zostaje dla zestawu,
którego szuflady naprawdę są elementami.

Dwie rzeczy wyszły przy okazji i obie są w tym samym korzeniu:

* `newUnit` budował wiersze z `baseDrawerUnit.ratio` (4:3:2) niezależnie od
  wariantu zestawu — BUDR2 dostawał trzy wiersze zamiast dwóch, a BUDR4 cztery
  szuflady bez czwartego wiersza. Teraz z `drawerSplitFor`, tej samej funkcji,
  którą buduje stos silnik.
* `setBudrDrawerHeight` startował od odpowiedzi SILNIKA (`[...heights]`), więc
  ustawienie jednej szuflady zamrażało wszystkie na dzisiejszych liczbach i
  żadna nie zostawała wolna, żeby wziąć resztę. Startuje od WŁASNEJ listy
  szafki — i dlatego „wpisz 500 w BUDR2 o wysokości 770, a druga staje się 264"
  jest teraz prawdą.

**Odblokowany prawy panel.** Gałąź `ratioDrawers` rysowała wysokość jako
przygaszony span z komentarzem sprzed tury 17 („input, który nic by nie robił").
Teraz robi: to ten sam `NumberField`, który ma edytor, przy tym samym zacisku
silnika (podłoga 38 = `runnerScrewFromBase + clearanceBelowRunner`), plus
przycisk „Reset to the kit". Nieaktualny komentarz usunięty.

Dryf 4:3:2 zestawu pozostaje ZAMROŻONY (#64) — `resetDrawerHeights` wraca do
niego co do milimetra, i jest to przypięte testem.

## F3 — BOKI SZUFLADY MÓWIĄ PRAWDĘ — ✅ ZIELONA

Z warsztatowego DXF-a właściciela, przeczytane razem na czacie:

* **rowek dna** (`DRAWER_BOTTOM_POCKET`) — w wewnętrznym licu każdego boku,
  **7 mm głęboko**, dolna krawędź **15 mm nad dolną krawędzią boku**, `G + 1`
  wysoki, żeby weszło 18 mm dno, na całej długości boku;
* **redukcja pod prowadnicę** (`DRAWER_RUNNER_POCKET`) — wewnętrzne lico
  frezowane **2 mm** w paśmie **od dolnej krawędzi do rowka (0 → 15)**, na całej
  długości. Osiemnastka staje się szesnastką tam, gdzie siedzi prowadnica:
  *„blum tego wymaga."*

Zestaw BUDR tnie obie od tury 3, dokładnie w tych miejscach. Wewnętrzne
szuflady SZAFY nie miały żadnej — wychodziły jako gołe prostokąty — więc stolarz
dostawał bok bez miejsca na dno i 18 mm płyty tam, gdzie prowadnica potrzebuje
16. To jest delta 2.

**Arytmetyka się domyka, i to jest sprawdzian, że to są TE liczby, a nie liczby
prawdopodobne:** `bottomW = boxFrontLen + 13` (`bottomOversize`), a `boxFrontLen`
to prześwit między wewnętrznymi licami boków — więc dno wchodzi **6.5 mm** w
**7 mm** rowek i zostaje pół milimetra powietrza. Liczby w profilu były dobre od
początku; teraz rowek, który z nich wynika, jest WYCINANY.

Liczby są `profile.baseDrawerUnit`, CZYTANE stamtąd, nie skopiowane do
`wardrobe.drawers`: zmierzono je na *boku szuflady*, nie na boku szuflady szafki
dolnej, więc jest jeden ich komplet i oba zestawy tną według niego.

**Przód i tył skrzynki STOJĄ NA DNIE** (słowa właściciela), a dno stoi w rowku —
więc jego spód jest `runnerPocketWidth` nad dolną krawędzią boku, a przód i tył
zaczynają się płytę wyżej. Arytmetyka zawsze się z tym zgadzała (`bok − 15 − G −
1` to dokładnie to, co zostaje nad rowkiem, mniej milimetr powietrza u góry); to
OBRAZEK stawiał wszystkie trzy deski na jednej linii.

## F4 — UKRYJ FRONTY, NIE USUWAJ ICH — ✅ ZIELONA

Przełącznik WIDOKU obok X-ray i Outlines: **Hide fronts** — drzwi I fronty
szuflad znikają z widoku 3D razem. Nic nie zmienia się w BOM, CNC, liście
rozkroju ani w parametrach; to soczewka, nie edycja. „Remove doors" (tura 15)
zostaje dokładnie taki, jaki był — tamto jest decyzją projektową i mieszka w
menu kontekstowym, gdzie mieszka decyzja.

Stan w `uiStore`, nie na szafkach. Celowo NIE zapamiętywany między sesjami,
inaczej niż X-ray obok: X-ray jest nie do pomylenia (płyta robi się
prześwitująca), a szafka bez frontów wygląda dokładnie jak szafka, której
fronty USUNIĘTO — i to jest jedyna rzecz, z którą nie wolno jej pomylić.

## F5 — SZAFKA POD PIEKARNIK, POPRAWIONA — ✅ ZIELONA

* **Gniazda w bokach tylko tam, gdzie są plecy.** BUL niósł te same siedem
  kieszeni co BUD z pełnymi plecami, a nad plecami szuflady nie ma czego
  łapać. `sidePanelGeometry` przyjmuje teraz `backTabsBelow`: czop jest cięty
  tylko wtedy, gdy cała jego KOŚĆ mieści się w plecach — ten sam fakt, który
  decyduje o środkowym czopie w niskiej szafce. Zostaje jeden czop (najniższy,
  95 mm od podłogi szafki, ten, na który plecy naprawdę mają gniazdo) i dwa
  gniazda dna. Gniazda górne i górny rząd wkrętów odchodzą razem z płytą TOP,
  dokładnie tak jak u zlewozmywaka.
* **Blat na listwach, nie płyta TOP.** Wzór dwóch uchwytów ZLEWU, z jedną
  zmianą, którą właściciel nazwał: przednia listwa LEŻY PŁASKO (100 mm szeroka,
  grubość płyty), więc od frontu widać kant 18 mm, a wylot pary piekarnika ma za
  sobą cały otwór. Płaska listwa ma własny wzór wkrętów 3 mm — rozłożony dla
  deski POZIOMEJ, nie liczbami pionowej listwy zlewu. Nowe liczby w profilu pod
  `ovenUnit.topRails`; liczby zlewu nietknięte i `fixtures/golden-sink.json` to
  potwierdza.
* **Bez otworu wentylacyjnego.** Ustalone z właścicielem: otwarte plecy i
  otwarty teraz blat SĄ wentylacją; szczelina 50 × 300 w półce wentylowałaby do
  zamkniętej szuflady. Gdyby instrukcja konkretnego piekarnika jej wymagała, to
  jest liczba producenta i późniejsza tura — **BLOCKERS #79**.
* **Front szuflady bierze swoją szczelinę pod urządzeniem.** LICO piekarnika
  zachowuje się jak front w zabudowie, a dwa fronty nigdy się nie stykają:
  `front = H − gap − ovenHeight − gap` = **169** przy 770 (tura 17 dawała 172 i
  front dotykał piekarnika). *„szczelina 3 mm jak wszystkie nasze drzwi."*
* …a SKRZYNKA nadal mieści się w OTWORZE pod półką — i przy 770 nie mieściła
  się. Bok skrzynki to `sideRatio` jego FRONTU, co jest słuszne w zabudowie
  szafek szufladowych, gdzie front i otwór to ten sam kawałek szafki; w
  piekarniku nie jest. Więc front decyduje o skrzynce wszędzie tam, gdzie
  decydował, a pod półką urządzenia OSTATNIE SŁOWO MA OTWÓR: bok 120 → 98,
  skrzynka od 56 do 154, dokładnie pod spodem półki.

## F6 — PROWADNICE NA EKRANIE: POTOK MOVENTO — ✅ ZIELONA

* **Loader.** `GLTFLoader` z paczki three — ZERO nowych zależności, precedens
  `RoomEnvironment` i `mergeGeometries`. Wzorzec tekstury dekoru
  (`3d/materials.js`) z siatką w miejscu obrazka: jedno dekodowanie na plik,
  klon na wiersz, zbiór nasłuchujących, żeby klon wzięty przed przybyciem pliku
  dało się wziąć jeszcze raz. Asynchronicznie, nigdy nie blokując sceny.
* **Pozycje należą do LISP-a.** Wiersze prowadnic to `runner_rows_carcass_y` z
  `drillSummary` — rząd, który maszyna naprawdę wierci — a model jest KOSTIUMEM
  NA WKRĘTACH: dojeżdża do wywierconego wzoru, nigdy odwrotnie. Własny środek
  modelu jest nieznany do pierwszego montażu, więc korekta ma JEDNO miejsce:
  `hardware.runner.movento.modelOrigin` (dziś zera, kadr wyśrodkowany przez
  loader) — **BLOCKERS #77** prosi o pomiar.
* **NL z głębokości**, dokładnie tak, jak silnik już to robi (największa, która
  wchodzi). Przypięte testem, żadnej nowej reguły.
* **Wariant to SPRZĘT, nie geometria.** Domyślny projektowy **T (TIP-ON
  BLUMOTION)** — „90% tego, co robimy" — z S jako opcją. Ustawiany na poziomie
  projektu w sekcji Runners kroku 5 / Ustawień (System: Movento; Variant: T/S z
  krótkim dymkiem), nadpisywany per szuflada w edytorze elementu, hierarchią
  kolorów co do joty: projekt → szafka → szuflada. Pliki SU zostają w
  manifeście, nieużywane. Szczeliny, kieszenie i wiercenie: IDENTYCZNE dla obu
  wariantów — strona instalacyjna Bluma mówi, że wzór nie zmienia się z
  technologią ruchu — i jest to przypięte testem, który porównuje CAŁE wyjście
  geometryczne obu.
* **Drążek synchronizacji jest parametryczny** — profil między dwiema jednostkami,
  długość z szerokości skrzynki mniej stałe końcówki. Progi katalogowe, cytowane
  w komentarzu (blum.com, TIP-ON BLUMOTION dla MOVENTO): sama jednostka poniżej
  314 mm szerokości otworu; wąski drążek 281–305; drążek z adapterami 314–1385.
* **Łagodna degradacja, żelazna zasada:** brak pliku, bucket nieosiągalny,
  nieudany fetch → ten sam profil w tym samym miejscu, rysowany z liczb
  warsztatu. Nigdy dziura, nigdy zablokowana scena. Tryb mock rysuje profil, a
  BOM zamawia po specyfikacji i MÓWI, że numeru katalogowego nie zna, zamiast go
  wymyślić.
* Widoczne, kiedy fronty są ukryte (F4) albo drzwi otwarte — z resztą okuć.
  BOM: numery katalogowe pary z manifestu, per szuflada, per wariant.
* NIE w tej turze: tabela `cc_hardware` (czeka na moduł danych). Manifest
  czytany z bucketa JEST katalogiem; `profile.js` trzyma liczby Movento jako
  prawdę offline.

## F7 — PRZEJŚCIE, DOKUMENTY, BRAMKA

`scripts/e2e-turn18.mjs` — 28 sprawdzeń, wszystkie MIERZONE, 15 zrzutów w
`verify/t18/`.

## BRAMKA — ✅ ZIELONA

| brama | wynik |
|---|---|
| pełny reinstall (`rm -rf node_modules && npm install`) | czysty |
| testy | **1405 / 1405** (baza tury: 1372, nowych 33) |
| build | czysty |
| istniejące fixtures | `git diff fixtures/` **pusty** — 12 plików, żadnego dodania |
| zależności | nietknięte (`git diff package.json package-lock.json` pusty) |
| czystość silnika | `src/engine/` importuje wyłącznie `src/engine/` |
| tożsamość CNC | **TRZY nazwane delty i nic poza nimi** — 18 zmienionych plików geometrii, wszystkie w piekarniku i w szufladzie szafy |
| `verify/t18/` | 15 zrzutów, `measurements.json`, `walk.json`, raport tożsamości, odciski przed/po, dowód encja po encji |
| przejście w przeglądarce | **28 / 28** |
| PR | otwarty, **nie scalony** |

**Delty CNC — trzy, nazwane, opublikowane w
`verify/t18/cnc-export-identity.md`:** (1) etykiety w elemencie zawijają się,
środkują i kurczą — TYLKO encje TEXT; (2) boki szuflad dostają swoją prawdziwą
obróbkę — redukcję 2 mm i rowek 7 mm w zmierzonych przez właściciela miejscach;
(3) szafka pod piekarnik poprawiona — gniazda w bokach tylko tam, gdzie są
plecy, blat na listwach zamiast płyty TOP, i front biorący szczelinę pod licem
urządzenia.

Dowód encja po encji jest od tej tury **skryptem** (`scripts/cnc-delta-probe.mjs`),
a nie sondą uruchamianą ręcznie — i buduje każdy zestaw DWA RAZY, raz z
szufladami, bo szafa domyślnie ich nie ma i delta 2 przeszłaby obok sondy
niezauważona.

## Nowe pliki

`src/engine/runners.js` · `src/lib/runnerCatalogue.js` ·
`src/3d/runnerModels.js` · `scripts/cnc-delta-probe.mjs` ·
`scripts/e2e-turn18.mjs` · `test/turn18-phases.test.js` · `verify/t18/`

## Nowe liczby w `profile.js`

`cnc.labelMaxLines` / `.labelLineGap` / `.labelFillRatio` / `.exportLabelScale`
(F1) · `ovenUnit.topRails.*` (F5.2) · `hardware.runner.movento.*` (F6).
Zmienione: `MONO_ADVANCE` 0.62 → 0.85 (F1.3, w `annotation.js`, gdzie mieszka od
tury 16). Usunięte: `cnc.annotation.partLabelInset` — blok wyśrodkowany w obu
osiach nie ma krawędzi, od której miałby odstawać.

---

# TURA 19 — KATALOG OKUĆ (10.08.2026, fazy F0–F6)

Tura, w której **wiedza o okuciach weszła do repozytorium**. Właściciel przyniósł
cały świat Bluma jako GLB, a razem z modelami przyszły cztery pliki JSON pod
`reference/hardware/`: artykuły, reguła kąta zawiasu, zakresy power-factor podnośników
i wagi płyt. Od tej tury mają one **status katalogu wzorcowego** — dokładnie taki,
jaki pliki LISP mają dla geometrii.

Baza: `0448fc2` (main po scaleniu tury 18). Testy na wejściu: **1406**.

## F0 — Baza i pliki wiedzy — ✅ ZIELONA

Pełny reinstall → 1406 testów zielonych → czysty build. Cztery pliki są na
miejscu (`movento.json`, `cliptop-hinges.json`, `aventos.json`,
`aventos-hf-drilling.json`), więc STOP nie był potrzebny.

`src/lib/hardwareCatalogue.js` to najmniejszy loader w tej aplikacji, bo **nie ma
czego pobierać**: pliki jadą razem z aplikacją, więc są IMPORTOWANE
(`with { type: 'json' }` — tak jak `lib/pswColors.js` czyta `psw-colors.json` od
tury 2), a cała robota to przekazanie ich rejestrom silnika. **Silnik nigdy nie
sięga do sieci** — dostaje katalog albo nie dostaje, i działa tak czy inaczej.

MOVENTO celowo NIE jest przepięty na nowy plik. Tura 18 zbudowała cały potok
wokół `manifest.json` z bucketa, a `movento.json` to ta sama drabinka zapisana
inaczej (system raz u góry zamiast per wiersz; nie mówi, który z dwóch artykułów
pary jest lewy). Przepięcie zmieniłoby to, co BOM mówi o szufladzie, bez czyjejś
prośby — a żelazną zasadą tej tury jest, że w dole rzeki nic się nie rusza. Plik
jest eksportowany, żeby tura 20 przyjęła go świadomie (BACKLOG 111).

## F1 — Katalog zawiasów, dwa poziomy (W36) — ✅ ZIELONA

Model właściciela, jego słowami: *„jeden główny wybór przypisany… a jak jedna
szafka będzie miała inne hinges, to po podwójnym kliknięciu na hinge otworzy się
modal… przesuń up/down plus assign if other hinge."* Ta sama hierarchia, co kolor
(tura 13) i wariant prowadnicy (tura 18): **wygrywa to, co powiedziano najbliżej
elementu**.

**KĄT NIE JEST WYBOREM — decyduje FRONT.** Reguła jest CZYTANA z
`cliptop-hinges.json → rules`, nie przepisana do `profile.js`, bo reguła zapisana
dwa razy to reguła, która sama ze sobą się pokłóci:

* front ≤ 25 mm → **110°** (71B3550 / 71B3590),
* 25 < front ≤ 32 → **95°** (71B9550 / 71B9590),
* drzwi SZAFY, za którymi jest szuflada → **155°** (71B7550 / 71B7590), bo
  szuflada musi wyjechać obok otwartych drzwi. Ten przypadek sprawdzany jest
  PIERWSZY — 155° na 18 mm froncie to nie pomyłka drabinki grubości, tylko
  odpowiedź na inne pytanie.

Co człowiek wybiera: **SYSTEM** (dziś jeden — CLIP top BLUMOTION), **WYKOŃCZENIE**
(nikiel / onyks — decyduje o rysowanym GLB i o ARTYKULE w BOM-ie, o niczym
więcej) i **PROWADNICĘ MONTAŻOWĄ**.

**Płytka ⌀3 jest WIDOCZNA i WYŁĄCZONA.** Jej wzór wiercenia to liczba warsztatowa,
której nikt nie podał — LISP zna wyłącznie ⌀5. Dymek mówi „drilling pattern
pending", `resolveHingePlate` nie odda jej nawet projektowi, który ją w sobie
niesie, a BLOCKERS #80 mówi dokładnie, jakiej karty potrzeba. Włączona opcja,
która po cichu wierciłaby STARY wzór, kłamałaby o tym, co jest na maszynie.

**BOM dzieli się per drzwi, po kącie i po wykończeniu.** LICZBA się nie rusza —
to nadal `centres.length × doorCount`, ta sama, na którą wiercenie, bryły w 3D i
`totals.hinges` zgadzają się od tury 3. Drzwi, które wychodzą na ten sam zawias,
są JEDNĄ linią (zwykła szafka ma dalej jedną linię, którą miała od tury 3); dwie
skrzydła zamontowane różnie to DWIE linie, bo to dwie rzeczy do kupienia.
`hardwareCounts` sumuje rolę zamiast brać pierwszy wiersz.

**Bramka re-resolve (F1.4).** Zmiana płyty frontowej, która przewraca kąt,
re-resolve'uje TYLKO drzwi bez przypisania i mówi o tym w toaście. Samo
re-resolve nie potrzebuje kodu — kąt jest WYPROWADZANY z grubości przy każdym
liczeniu szafki — brakowało POWIEDZENIA tego, i to jest `hingeReResolve`, funkcja
czysta, żeby zdanie na ekranie i test reguły były tą samą funkcją.

**GLB na wywierconych punktach.** Dokładnie potok prowadnic: jedno dekodowanie na
plik, klon na pozycję, kostium na wkrętach, szara podstawka gdy bucket
nieosiągalny. Maszyneria z tury 18 została WYCIĄGNIĘTA do `3d/glbSource.js` i oba
loadery na niej stoją — `runnerModels.js` zachowuje każdą nazwę i każdy kontrakt.
Z pary artykułów rodziny rysowany jest pierwszy, oba jadą w BOM-ie, a co znaczy
drugi — BLOCKERS #82.

## F3 — Modale przestają zasłaniać swój obiekt (W37) — ✅ ZIELONA

Właściciel: *„klikam na drzwi, a modal mi się otwiera na drzwiach i chuj widzę."*

Reguła tury 12 była słuszna i NIEDOOKREŚLONA. „Obok" potrzebuje ODLEGŁOŚCI i
KIERUNKU, a podwójne kliknięcie w obiekt daje powłoce prostokąt o zerowym
rozmiarze — „obok" niego to milimetr dalej, czyli na drzwiach.

`lib/menuPlacement.js` → `placeAnchoredModal`: **w GÓRĘ i w PRAWO** od obiektu, o
`ui.modal.anchorOffset` (24 / −24, liczba profilu) **plus własna wysokość okna**,
tak że lewy dolny róg panelu siada nad i obok wskaźnika. Przyklejone do widoku; przy
prawej krawędzi **zmienia rękę** zamiast zjeżdżać z powrotem na obiekt. Gwarancja,
na której to stoi, jest pozioma: panel jest oddzielony od obiektu W POPRZEK ekranu,
więc pionowy clamp może go zsunąć gdziekolwiek i i tak nie wróci na obiekt. Gdy
żadna ręka nie ma miejsca — spadek do czterostronnego szukania z tury 12.

JEDNA POWŁOKA: edytor szafki, detal elementu, modal zawiasu i każdy próbnik koloru
dziedziczą to w `components/Modal.jsx` i nigdzie indziej. `prefer` zostaje w API,
żeby żaden wywołujący się nie wywrócił.

## F4 — Zgubiony werdykt tury 17 — ✅ ZIELONA

*„Kliknięcie 2 razy na dany element zabiera nas do listy po prawej, otwiera i
podświetla który to element."* — właściciel poprosił o to w turze 17, a
instrukcja to zgubiła (moja transkrypcja, nie jego pominięcie).

Podwójne kliknięcie części na arkuszu CNC: gałąź szafki się OTWIERA, wiersz jest
PRZEWIJANY do widoku i PODŚWIETLONY, a nagłówek grupy się zapala. Czysta
nawigacja: nic nie jest tykane, nic edytowane, nic obracane — ręcznego obrotu ze
starej listy celowo NIE MA, bo reguła półek z tury 17 zrobiła obrót automatycznym
i żaden werdykt od tamtej pory nie prosił o kontrolkę. `treePathOfPanel` w
`engine/cnc/groups.js` jest czystą funkcją, którą drzewo jest sterowane, więc
da się to napędzić z testu tak samo jak wskaźnikiem.

## F5 — SILNIK DOBORU PODNOŚNIKA (bez kitu) — ✅ ZIELONA

Tura 20 zbuduje kity HK / HF po sesji wzorcowej z właścicielem. Ta tura kładzie
matematykę, żeby kity tylko ją konsumowały.

* **Waga płyty.** `kg_m2` niesione na rekordzie magazynowym dokładnie tak, jak
  niesiona jest grubość; przypisana płyta wygrywa, `profile.board.kgM2` jest
  podkładem (MFC 18/22/25 = 12 / 14,5 / 16,5; MDF lakierowany = 14 / 17 / 19).
  Grubość spoza tabeli bierze najbliższą płytę i MÓWI o tym; remis idzie do
  GRUBSZEJ, bo podnośnik dobrany na za małą wagę to awaria, która zrzuca drzwi
  komuś na głowę.
* **Power factor** = wysokość szafki × waga frontu, zakresy CZYTANE z
  `aventos.json`. Nakładki rozstrzygane na MNIEJSZĄ jednostkę — i jest to
  kolejność listy, nie porównanie zapisane drugi raz.
* **Klient przypisuje, silnik się sprzeciwia.** Zasada właściciela: *„silnik
  proponuje, klient assign, ale guidance i sprzeciw."* Przypisanie jest ZAWSZE
  montowane, nigdy odrzucane — i ostrzegane, ze wskazaniem jednostki, która by
  weszła („Front too heavy for 2300 — 2500 fits.").
* Limity HK (205–600 wysokości, ≤ 1800 szerokości, ≥ 261 głębokości wewnętrznej)
  sprawdzane niezależnie od wagi.
* **Bez kitu i bez UI** poza wagą w stopce detalu elementu. To był warunek.

## F6 — PRZEJŚCIE, DOKUMENTY, BRAMKA

`scripts/e2e-turn19.mjs` — 35 sprawdzeń, wszystkie MIERZONE, 12 zrzutów w
`verify/t19/`, plus `lift-warnings.md` (migawka tekstu ostrzeżeń, zdjęta z
działającej aplikacji — F6 prosi o nią, bo tura 20 postawi te zdania na ekranie
i muszą to być ZDANIA, a nie kody).

## BRAMKA — ✅ ZIELONA

| brama | wynik |
|---|---|
| pełny reinstall (`rm -rf node_modules && npm install`) | czysty |
| testy | **1469 / 1469** (baza tury: 1406, nowych 63) |
| build | czysty |
| istniejące fixtures | `git diff fixtures/` **pusty** — 12 plików, żadnego dodania |
| zależności | nietknięte (`git diff package.json package-lock.json` pusty) |
| czystość silnika | `src/engine/` importuje wyłącznie `src/engine/` |
| tożsamość CNC | **ZERO DELT** — oba diffy puste, odciski i sonda encja po encji |
| `verify/t19/` | 12 zrzutów, `measurements.json`, `walk.json`, raport tożsamości, odciski i sonda przed/po, migawka ostrzeżeń podnośnika |
| przejście w przeglądarce | **35 / 35** |
| PR | otwarty, **nie scalony** |

**Delty CNC: ZERO, i jest to strukturalne, nie obiecane.** Wiercenie liczy się z
`profile.hinges` — średnica kubka, wkręty ⌀3, para ⌀5 w rozstawie 32 i trzy nazwy
warstw z LISP-a. Tura 19 **nie dotyka `profile.hinges` w ogóle**; wszystko, co
dodaje, siedzi w `profile.hardware.hinge.cliptop`, który czytają trzy rzeczy:
powierzchnia ustawień, wiersze sprzętowe BOM-u i loader modeli 3D. Żadna z nich
nie leży na drodze do otworu. `test/turn19-hinges.test.js` mówi to asercją: cztery
szafki różniące się każdą sprzętową odpowiedzią tej tury dają bajt w bajt te same
wiercenia, panele, geometrię cięcia i sumy.

## Nowe pliki

`src/engine/hinges.js` · `src/engine/lifts.js` · `src/lib/hardwareCatalogue.js` ·
`src/components/HingeModal.jsx` · `src/3d/glbSource.js` · `src/3d/hingeModels.js` ·
`scripts/e2e-turn19.mjs` · `test/turn19-hinges.test.js` ·
`test/turn19-lifts.test.js` · `test/turn19-phases.test.js` · `verify/t19/`

## Nowe liczby w `profile.js`

`board.kgM2.*` + `defaultKgM2Kind` / `sprayedKgM2Kind` (F5.1) ·
`hardware.hinge.cliptop.*` — system, wykończenia, płytki, bucket, ścieżka,
`modelOrigin` / `plateOrigin`, `maxModelLengthMm` (F1) ·
`ui.modal.anchorOffset` (F3). Wszystkie scalane klucz po kluczu, więc profil
zapisany przed tą turą wraca z nimi. **Nic nie zmienione i nic nie usunięte.**

---

# TURA 20 — SKRZYNKA ZNAJDUJE PROWADNICĘ, BUCKET ZNAJDUJE PLIKI (11.08.2026, fazy F1–F12)

Dwanaście uwag z oględzin właściciela po turach 17–19, trzy z nich
zdiagnozowane do przyczyny w laboratorium, zanim CLAUDE.md powstał. Wszystkie
dwanaście zamknięte.

Baza: `a631e8d` (main po scaleniu tury 19). Testy na wejściu: **1469**, na
wyjściu: **1555**. Odciski CNC na wejściu: `verify/t19/fingerprints-turn19.txt`.

## Dwie nowe żelazne zasady, od tej tury na stałe

**R1 — GEST DOWODZI SIĘ PRAWDZIWYM WSKAŹNIKIEM.** Podwójne kliknięcie na arkuszu
CNC w turze 19 przeszło na `element.dispatchEvent(...)`, podczas gdy funkcja była
martwa dla prawdziwej myszy. `scripts/e2e-turn20.mjs` nie używa `dispatchEvent`
do ŻADNEGO gestu: każdy klik, dwuklik, przeciągnięcie i najechanie to wejście
CDP. Asercje na store'ach zostają — ale PO prawdziwym geście, nigdy zamiast.

**R2 — TWIERDZENIE O BUCKECIE DOWODZI SIĘ NA ŻYWYM BUCKECIE.** Host wyprowadzany
z paczki dekorów, oba manifesty i po jednym modelu na rodzinę. W TEJ SESJI host
jest zablokowany przez politykę wyjścia (403 na CONNECT) i **nie udajemy, że
było inaczej**: `scripts/bucket-live.mjs` robi całe sprawdzenie jedną komendą,
`verify/t20/bucket-live.md` niesie odmowę wraz z dowodem.

**R3 — PRAWDZIWY MANIFEST JEST FIXTUREM.** Oba pliki właściciela leżą teraz w
`test/fixtures/bucket/` i parsery jadą po nich w testach: 40 wierszy prowadnic,
19 zawiasów. Rozjazd schematu zapala test zamiast szarzyć scenę.

## F1 — Skrzynka bierze wysokość z prowadnicy

Jedno prawo dla KAŻDEJ szuflady, także dolnej, mierzone od wiersza, który silnik
naprawdę wierci: dolna krawędź boku = wiersz + **13,5**, spód dna = wiersz +
**28,5** (13,5 + 15 mm wpustu, więc druga liczba jest wyprowadzona, nie
przepisana). Przedtem dwa kity mówiły co innego o tej samej prowadnicy Bluma:
skrzynka BUDR siedziała DOKŁADNIE na wierszu, a szafy 9 mm POD nim.
`wardrobe.drawers.boxDropFromRunner` jest usunięte, nie zostawione z nieprawdą.

**Odciski CNC: bajt w bajt bazowe.** Każdy wpust, kieszeń i otwór liczy się od
własnych krawędzi części — żaden z nich nie jedzie za skrzynką. Golden fixtures:
**nic nie regenerowane**, bo żaden z nich nie zapisuje pozycji Y
(`verify/t20/fixture-delta.md` pokazuje to komendą).

Jedno następstwo, nazwane zamiast wchłonięte: w szafce pod AGD bok skrzynki jest
przycięty zaciskiem z tury 18 mierzonym OD WIERSZA, więc skrzynka wystaje teraz
13,5 mm ponad półkę. Płyty **nie skrócono** (F1.2 zachowuje wysokości boków,
a tura ma prawo do jednej delty CNC) — silnik OSTRZEGA
(`APPLIANCE_DRAWER_BOX_OVER_SHELF`), a decyzja o przecięciu należy do
właściciela. BLOCKERS #85.

## F2 — Bucket czytany takim, jaki jest

Trzy usterki, wszystkie z jednego powodu: trzy dokumenty zgadzały się ze sobą, a
bucket z żadnym z nich. Ścieżka prowadnic niosła NAZWĘ BUCKETA drugi raz
(`…/public/hardware/hardware/…` → 400); ścieżka zawiasów niosła ją i jeszcze
poziom `cliptop/`, którego właściciel nigdy nie założył; a manifesty nazywają
każdy `file` ścieżką, która nie istnieje nigdzie, i nie mają `system` w wierszu —
więc parser wyrzucał wszystkie czterdzieści wierszy w ciszy.

Parser jest teraz tolerancyjny dla obu rodzin: URL to **folder manifestu +
basename** (jedna reguła, jeden dom — `engine/hardwareUrl.js`), wiersz bez
`system` dziedziczy nagłówek, a `system` przestał być filtrem per wiersz, który
mógł opróżnić listę — wybiera KTÓRY katalog jest wczytany, a dopasowanie w nim
idzie po nl / wariancie / stronie. Obie ścieżki wracają z domyślnych przy
migracji: gdzie leży paczka właściciela, to wiedza aplikacji, nie preferencja
warsztatu.

**Czwarta usterka, znaleziona z czytania paczki i CELOWO nienaprawiona:**
drabinka NL Bluma w buckecie (250…450) i drabinka, z której aplikacja wybiera
długość nominalną (390…690 — długości SKRZYNKI z LISP-a), **nie mają części
wspólnej**. To zmienia numer artykułu w BOM-ie, więc jest pytaniem do
właściciela: BLOCKERS #84 i test, który zapali się w dniu naprawy.

## F3 — Jedzie cała szuflada, nie sam front

`engine/drawerMotion.js`: co jedzie razem (klucz `meta.drawer`, ten sam, na
którym silnik trzyma wiersze prowadnic i linie BOM-u) i jak daleko — **własna
długość nominalna szuflady**, bo MOVENTO jest pełnego wysuwu. `depth × 0,75`
było zgadywanką tury 3, sprzed dnia, w którym aplikacja wiedziała, na czym
szuflada jeździ. Prowadnica jedzie razem ze skrzynką: obie w tej aplikacji są
JEDNYM ciałem, a rozdzielenie profilu stałego od wózka wymaga podzielenia modelu
przez właściciela.

## F4 — Etykieta CNC o połowę mniejsza — JEDYNA delta CNC tury

`cnc.labelHeight` 40 → **20**. Dowód jest bytami, nie obietnicą
(`scripts/cnc-delta-probe.mjs`, 278 plików): **0** zmian geometrii, **0** w
spisie bytów, **0** warstw, **0** napisów, **0** pozycji, **397** wysokości
tekstu — i żadna nowa wyższa niż 20. Wysokości już poniżej limitu (19,07, 16,64,
9,5, podłoga 6) **nie ruszyły się co do cyfry**: mała część już skaluje się
proporcją i nie ma kurczyć się dwa razy.

Jedna uczciwa uwaga: eksport zszedł 35 → 20, a nie 20 → 10 jak przewiduje F4.2,
bo rozmiar na SZKLE bierze się z `annotation.partLabelMm` (70), a `labelHeight`
jest tylko limitem pliku. Przycięcie szkła też — zmierzone — przełamuje wspólną
etykietę na nowo (212 części z dwóch linii na jedną, spis bytów rusza się w 192
miejscach), czyli zmienia to, co plik MÓWI. To delta dla tury, która ją nazwie.

## F5 — Modal 140 px z boku, w poziomie kliknięcia

`anchorOffset` → `{ x: 140, y: 0 }`, a `y` to teraz przesunięcie GÓRY panelu od
kliknięcia. Prawo tury 19 („dół siedzi |y| nad obiektem") jest **skasowane**, nie
zostawione jako tryb. Prawo poziome bez zmian, i to ono trzyma gwarancję. Testy
tury 19 przepisane, ze spacerem po pięciu narożnikach.

## F6 — Linijka uczy się punktów obiektu

`lib/rulerSnaps.js` — czysta arytmetyka na bryłach: **END** (8 narożników),
**MID** (12 środków krawędzi), **INT** (styk dwóch płyt w granicach 0,5 mm — środek
wspólnej krawędzi i jej dwa końce). Punkt pokrywający się jest oferowany RAZ, a
wyższy priorytet wygrywa piksel: END > MID > INT, jak w AutoCAD-zie. Magnes
liczy się w PIKSELACH (`snapPx` 12), bo apertura mierzona w milimetrach jest
bezużyteczna z daleka i nadwrażliwa z bliska. Kliknięcie BEZ złapanego punktu
**nie stawia nic** — to właśnie czyni znacznik całą informacją zwrotną.

## F7 — Arkusz CNC odpowiada wskaźnikowi

Rollover nad wierceniem, kieszenią, wpustem i przejściem freza: rodzaj + warstwa,
⌀ albo W×H, głębokość, promień naroża i odległości do WŁASNYCH krawędzi części.
Wyprowadzenie to czysty moduł silnika po tych samych rekordach, z których pisze
się DXF; identyfikatory zgadzają się z oknem detalu. Cel najechania rośnie do
`hoverGracePx` tam, gdzie symbol jest mniejszy — otwór ⌀5 przy oddaleniu ma dwa
piksele.

## F8 — Materiał pokazuje rany

Każde wiercenie, kieszeń i wpust to teraz DZIURA we własnym wielokącie płyty —
prawdziwa nieobecność, taka sama, jaką kość psa ma od tury 11 — a ściany i dna
tych cięć to DRUGI bufor, żeby `appearance.cutFace` (#4a4a4a) było jedyną rzeczą
na nich. Cięcie ślepe pokazuje dno na prawdziwej głębokości, przelotowe
przechodzi na wylot, a kieszeń bez podanej głębokości **nie jest cięta** zamiast
być ciętą na zgadywankę.

Przy okazji wyszła pomyłka tury 17: rama CNC boku szuflady leżała na ZEWNĘTRZNEJ
ścianie. Pod kreskami tego nie widać; wycięte naprawdę widać od razu — MOVENTO
siedzi od środka pod dnem, a dno stoi we wpustach MIĘDZY bokami. Obie ramy idą na
ścianę wewnętrzną.

Koszt: jeden scalony bufor na konfigurację płyty, dzielony przez każdą identyczną
płytę w projekcie — cała szafka trzyszufladowa to kilka tysięcy trójkątów, nie
siatka na otwór. Bramka odległości niepotrzebna, więc `perf.md` nie ma.

## F9 — Dwuklik na arkuszu naprawdę działa

Przechwycenie wskaźnika **na RUCHU, nie na naciśnięciu**. Przechwycony wskaźnik
każe przeglądarce składać `click` i `dblclick` na PRZECHWYTUJĄCYM elemencie, więc
uchwyt części z tury 19 nigdy ich nie dostawał. Pierwszy ruch poza
`panThresholdPx` (4) zaczyna przesuwanie i bierze przechwycenie; puszczenie
przed progiem oddaje wszystko, nic nie przechwyciwszy.

## F10 — Zgubione konteksty

`WebGLRenderer.dispose()` **nie oddaje kontekstu**. Przeglądarka trzyma około
szesnastu żywych i zabija najstarszy, żeby zrobić miejsce — dziesięć linii
właściciela to nie aplikacja gubiąca konteksty, tylko aplikacja je zbierająca.
`3d/contextGuard.jsx` oddaje kontekst świadomie i liczy na `window.__cc.diag`,
z ODDANIEM liczonym osobno od STRATY.

Spacer złapał dwie rzeczy, których testy jednostkowe złapać nie mogły: strażnik
w środku `<Canvas>` w ogóle się nie rejestrował przy szybkim otwieraniu (osobny
korzeń Reacta nie zdążył wypłukać efektów), a samo oddanie drukowało tę samą
linię `Context Lost`, którą naprawia. Strażnik wisi teraz na ELEMENCIE canvasa w
drzewie właściciela, a nasłuch w fazie przechwytywania plus WeakSet celowo
zgaszonych canvasów trzyma rozbiórkę poza konsolą. 12 × edytor + 4 × render:
**lost 0, jeden żywy kontekst, zero linii w konsoli**.

## F11 — Szuflada dostaje własny edytor

To JEST okno edytora szafki, zawężone: ta sama powłoka, ten sam wybuch, ten sam
blok właściwości. `drawer` w argumentach modalu zmienia, które płyty są w środku
— i dokłada prowadnice, na które pokój nie patrzy, bo w kuchni jest ich ściana, a
w tym oknie są tym, na co się patrzy. WYBUCH nie potrzebował niczego:
`engine/explode.js` wysyła płytę wzdłuż jej najcieńszej osi na zewnątrz, co na
szufladzie daje dokładnie listę z F11.3. Dwie drogi wejścia: dwuklik na płycie
SKRZYNKI (front zachowuje swój wysuw) i „Edytuj szufladę N…" w menu
kontekstowym, oferowane tylko tam, gdzie kliknięcie naprawdę padło na szufladę.

## F12 — Trzy małe werdykty

Kontur bierze WŁASNE odchylenie głębokości, przeciwne do wypełnienia: płaszczyzna
cofa się, linia wychodzi do przodu, prześwit się podwaja. **Zapis mówi, że
zapisał** — zielony z ptaszkiem na `ui.saveConfirmMs`, i zapis, który wrócił z
czymkolwiek innym niż `ok`, zielony NIE jest. **Fornir dołącza do laminatu** na
siatce 85 dekorów; forniru w KORPUSIE nikt nie pytał, więc jego picker stoi, a
projekt już oforniowany zachowuje swój wybór.

## Dowody

`verify/t20/` — `walk.json` (40/40, R1 w nagłówku), `measurements.json`, 18
zrzutów, `fingerprints-*`, `probe-*`, `cnc-export-identity.md`,
`fixture-delta.md`, `bucket-live.md`, `context-lost.md` i `README.md`, który
mówi, co dowodzi co.

## Nowe pliki

`src/engine/hardwareUrl.js` · `src/engine/drawerMotion.js` ·
`src/engine/recesses.js` · `src/engine/cnc/rollover.js` · `src/lib/rulerSnaps.js` ·
`src/3d/contextGuard.jsx` · `scripts/bucket-live.mjs` · `scripts/e2e-turn20.mjs` ·
`test/fixtures/bucket/` · `test/turn20-*.test.js` (7 plików) · `verify/t20/`

## Nowe liczby w `profile.js`

`baseDrawerUnit.boxAboveRunner` / `bottomAboveRunner` (F1) ·
`hardware.runner.movento.path` i `hardware.hinge.cliptop.path` — poprawione (F2) ·
`cnc.labelHeight` 40 → 20 (F4) · `ui.modal.anchorOffset` → `{140, 0}` (F5) ·
`editor.ruler.snapPx` / `contactMm` / `markerPx` (F6) ·
`cnc.annotation.panThresholdPx` (F9) i `hoverGracePx` (F7) ·
`appearance.outline.polygonOffset.outlineFactor` / `outlineUnits` (F12.1) ·
`appearance.cutFace` (F8) · `ui.saveConfirmMs` (F12.2) ·
`projectSettings.frontSources` — fornir na picker dekorów (F12.3).
**Usunięte:** `wardrobe.drawers.boxDropFromRunner` — kłamało po F1.

---

# TURA 21 — the holes are the judge

Właściciel wstawił szufladę do rozstrzelonego edytora i odczytał prawdę z
**dwóch otworów pilotowych, które się nie spotkały**. To rozwinęło się do
jednej złej kotwicy w silniku, a przy okazji do drugiej takiej samej w widoku
3-D. Reszta tury to wyroki, które wydał na to, co widział.

## F1 — skrzynka bierze prawdę ze SPODU prowadnicy [KRYTYCZNE]

`runnerRows` w `engine/cabinet.js` to **wiersz wkrętów** —
`firstRowFromBottom` (38 mm), przesunięcie wiercenia MOVENTO. Turn 20 użył go
jako kotwicy skrzynki, więc **każda skrzynka w aplikacji wisiała 38 mm za
wysoko**, a piloty fasady mijały piloty przodu skrzynki dokładnie o tyle.

* `runnerBottomY` jest teraz osobną nazwaną wielkością —
  `(i === 0 ? G : frontY[i])`, dokładnie jak KIT_BUDR_FULL L712-714. `runnerRows`
  zostaje wierszem wkrętów i karmi wiercenie korpusu. **Dwie nazwy, dwa
  znaczenia, żadnego użycia jednej za drugą.**
* Skrzynka wisi na spodzie, w OBU kitach. Wysokości boków, rozmiary i pozycje
  frontów, rowki i kieszenie — nietknięte.
* **Model prowadnicy stał na wkrętach.** GLB i szara zastępcza — obie kładzione
  spodem na `y` instancji, a `y` to był wiersz wkrętów. Instancja niesie teraz
  `y` (spód prowadnicy) i `rowY` (wiercony wiersz), więc wkręty +38 trafiają
  w otwory modelu. `verify/t21/hole-alignment.md` zapisuje to znalezisko.
* **BRAMKA:** `test/turn21-f1-hole-alignment.test.js`. Per rodzina kitów, per
  szuflada: Y pilota fasady kontra Y pilota przodu skrzynki, `|Δ| = 0`. Bramka
  i raport pytają `engine/drawerPilots.js`; **żadne z nich nie nosi kopii
  prawa**, co jest R4 zadane we własnym kluczu.
* Ostrzeżenie tury 20 o skrzynce nad półką AGD **zniknęło**: na prowadnicy ta
  sama deska kończy się 24,5 mm pod półką. BLOCKERS #85 zamknięty przez F1.

## F2 + F6 — adres wraca do URL-a, a edytory montują to samo [KRYTYCZNE]

Konsola właściciela, cała diagnoza w jednej linii:
`/hinges/blum/71B3550_42542984.glb → 404`. Bez hosta, bez bucketu — aplikacja
zapytała **własną domenę**.

* **Ścieżka bez hosta nie jest URL-em.** `hardwareModelSrc()` zwraca `null`,
  widok rysuje zastępczą, **żadne żądanie nie wychodzi**. `hingeModelSrc` i
  `runnerModelSrc` to po jednej linii nad nim, więc trzecia kopia jest
  niemożliwa. Zawiodły tylko zawiasy, bo ich katalog jedzie w repozytorium i
  zawsze ma plik, o który można poprosić.
* **Host WRACA**, wyprowadzony z własnego rejestru dekorów aplikacji, nie wpisany
  — dla builda bez `VITE_SUPABASE_URL`. `scripts/bucket-live.mjs` woła teraz tę
  samą funkcję silnika (R4). Manifest prowadnic przestał być odmawiany dlatego,
  że nie ma BAZY: to publiczny plik w publicznym buckecie.
* Host potrafi wylądować po zamontowaniu płótna, więc jest hookiem, nie
  jednorazowym `useMemo`.
* **R4:** `3d/hardwareRegistry.js` publikuje w `window.__cc.hardware` każdy URL,
  który scena naprawdę podała loaderowi, per powierzchnia, z `model: true|false`.
  Spacer czyta TO i pobiera TO.
* **F6:** prowadnice szuflady w edytorze stały POZA grupą centrującą i w surowych
  współrzędnych silnika, i **stały w miejscu, kiedy deski się rozlatywały**.
  Są w scenie i jadą z częścią, przy której są przykręcone. Edytor szafki nie
  montował zawiasów w ogóle — rozwiązuje je przez `resolveDoorHinge`, ten sam
  rejestr, z którego zamawia BOM.

## F3 / F4 / F5 — trzy wyroki

* **F3** `profile.appearance.cuts.enabled`, domyślnie **false**. „Arkusz CNC jest
  dokumentem; rzeźbienie w 3-D nie jest warte swoich problemów." Jedna bramka,
  jeden plik. To, co było PRZED turą 20 — psie kości i kieszenie konstrukcyjne —
  **nie jest za flagą**: to obrys deski. Wiercenia zostają w rekordzie i na
  arkuszu; na emeryturę idzie tylko ich rzeźbienie.
* **F4** 240. **Jedna liczba się rusza.** Jedyny test, który przypinał literał
  140, czyta profil.
* **F5** `forceContextLoss()` na już utraconym kontekście to `INVALID_OPERATION`
  i jedna linia w konsoli na wywołanie — dziesięć u właściciela. Uchwyt wie
  teraz, czy jego kontekst przepadł, i strzela tylko do żywego; `dispose()`
  leci tak czy owak, bo to dwa różne akty.

## F7–F10 — wnętrze szafy dorasta

* **F7** trzy rodzaje, w słowach właściciela: fix / adjustable / pull-out, a TYP
  jest pierwszym wierszem własnego modalu półki. **Jedna prawda, dwie nazwy:**
  typ to `variant`, który półka nosi od tury 8. LISP **niesie** prawo półki
  regulowanej (SKYLON_COMMON drawBUL L755-768: dwie kolumny 70 mm od krawędzi,
  trzy kołki co ±50, **⌀7,5** — nie ⌀5; LISP jest prawem i użyto go dosłownie),
  więc `adjustable` jedzie WŁĄCZONE i nie wymyśla niczego. `pull-out` jedzie
  widoczne i wyłączone (BLOCKERS #86).
* **F8** cofnięcie przegrody jest **własne dla kawałka**. 20 zasiewa, nic nie
  narzuca, a 0 jest nośne: to ono robi drzwi z F12 możliwymi.
* **F9** **ROZPIĘTOŚĆ decyduje, nigdy kolejność.** `partitionSpan` dostawał
  KAŻDĄ półkę w szafce, więc najniższa stała półka gdziekolwiek ucinała każdą
  przegrodę wszędzie. Każda przegroda dostaje teraz tylko te półki, których bieg
  **przecina jej płaszczyznę**.
* **F10** panel mówił 860, a chip 842 o tej samej półce, a odczyt przeciągania
  miał jeszcze trzeci punkt odniesienia. `engine/shelfHeights.js` to JEDNO
  wyprowadzenie. **ZAPIS SIĘ NIE RUSZA.**

## F11 — magnes wysokości

Propozycja, nie siła. Żyje na PRZECIĄGNIĘCIU, nie w setterze — kto wpisze 848
obok sąsiada na 850, dostaje 848. Wysokości porównywane w przestrzeni POKOJU.
Kreskowana prowadnica rysuje się przez OBIE szafki, każda na własnej wysokości.
Złapanie, które zacisk potem odrzucił, nie jest raportowane.

## F12 — drzwi na przegrodzie

Przypadek właściciela: przegrody na 600 i 800, trzy wnęki, dwoje porządnych
drzwi i jedne małe w środku. Warunki są FIZYCZNE i czytane z kawałka.
Szerokości to jego prawo, dosłownie, jako czysta geometria w `engine/doors.js`.
Płytka to ISTNIEJĄCE prawo ⌀5 na nowym panelu — te same wiersze, ta sama para
±16, ten sam `HINGES_5MM`, te same 37 mm od PRZODU, w ramce VPART-a.

## F13 — NIE ZBUDOWANY

Tura kurczy się od dołu i zatrzymała się tutaj. Nic z gzymsu nie jest w połowie
zbudowane. **BLOCKERS #88** niesie liczby właściciela, żeby następna tura ich
nie wyprowadzała jeszcze raz.

## Dowody

`verify/t21/` — `hole-alignment.md` (tabela bramki, każda Δ = 0), `walk.json`
(35/38, 0 porażek, 3 zablokowane przez politykę wyjścia sesji), `console.txt`,
`context-guard.md`, `bucket-live.md`, `cnc-export-identity.md`,
`fingerprints-defaults-diff.txt` na **ZERO linii** i `README.md`.

## Nowe pliki

`src/engine/drawerPilots.js` · `src/engine/shelfHeights.js` ·
`src/engine/shelfTypes.js` · `src/engine/shelfMagnet.js` ·
`src/lib/storageBase.js` · `src/3d/hardwareRegistry.js` ·
`scripts/hole-alignment.mjs` · `scripts/e2e-turn21.mjs` ·
`test/turn21-*.test.js` (5 plików) · `verify/t21/`

## Nowe liczby w `profile.js`

`wardrobe.drawers.frontScrewFromBottom` / `firstFrontScrewFromBottom` (F1.4) ·
`appearance.cuts.enabled` = false (F3) · `ui.modal.anchorOffset` → `{240, 0}`
(F4) · `editor.shelfMagnetMm` = 10 (F11).
**Nowe klucze `drillSummary`:** `runner_bottoms_carcass_y`,
`runner_bottoms_dp_y` (F1.1).

## CNC

Złote domyślne: **ZERO**. Jedyne nowe encje tury: `HINGES_5MM` na `VPART`, i
tylko tam, gdzie drzwi naprawdę wiszą na przegrodzie. Jeden scenariusz sondy
(`+partition-on-shelf`) rusza się na sześciu typach, które **nie tną półki
w ogóle** — ich przegroda zatrzymywała się na desce, której nie ma na liście
rozkroju. Istniejące nazwane encje, tylko postawione dobrze (F9.3).

---

# TURA 22 — gzyms wraca, a dane dostają kręgosłup

**Baza:** `main` po scaleniu tury 21. Testy na wejściu 1618, na wyjściu
**1679, wszystkie zielone.** Odciski CNC złotych domyślnych: **ZERO różnicy**.
Tura NIE kurczyła się — F1, F2a, F2b, F3 i F4 weszły w całości.

## SQL PRZED push

**`sql/004_tura22.sql`** — uruchamia Piotr RĘCZNIE w Supabase SQL Editor,
**zanim** zdeployuje build tej tury. Plik jest idempotentny, wymaga
`sql/001_init.sql`, i nie jest wykonywany ani przez aplikację, ani przez
Claude. Zawiera:

* `cc_hardware` — manifesty osprzętu: `family` (runners / hinges / lifts),
  `system`, `manifest` (jsonb w kształcie plików z bucketu), `bucket_path`,
  `updated_at`, właściciel przez `auth.uid()`. Unikat na
  `(owner, family, lower(system))`, żeby zasiew drugi raz PODMIENIAŁ wiersz.
* `cc_company_defaults` — jeden wiersz na właściciela (`owner` jest kluczem
  głównym): `hinge_system`, `hinge_finish`, `plate`, `runner_variant` i płyty
  per rodzina. Plus `check` **odmawiający kluczy, które należą do REGUŁY** —
  `hinge_angle` i spółka — bo aplikacja nie jest jedyną drogą do tabeli.
* **RLS włączony na obu**, polityki wypisane per czasownik, per `auth.uid()`.

Po SQL, ręcznie i tylko przez właściciela:

```
node scripts/seed-hardware.mjs                      # sucha próba: nic nie pisze
SUPABASE_URL=… SUPABASE_SERVICE_KEY=… CC_OWNER=<uuid> \
  node scripts/seed-hardware.mjs                    # upsert z ŻYWEGO bucketu
```

## F1 — gzyms: 70 i 100 na wypełnieniu 40

Faza, którą tura 21 upuściła protokołem. BLOCKERS #88 niósł liczby
właściciela, więc to jest budowa, a nie wyprowadzanie ich drugi raz.

**Konstrukcja, tak jak właściciel poprawił.** Drzwi kończą się RÓWNO z górą
wieńca; wypełnienie 40 stoi NAD wieńcem, w płaszczyźnie drzwi; gzyms siada na
wypełnieniu, dolną krawędzią równo z płaszczyzną drzwi na poziomie góry drzwi.
Środkowe zdanie **już było prawdą** — górne wypełnienie stoi na `box.y = H`
w płaszczyźnie drzwi od tury 6 — więc ta faza dokłada kawałek NA nim i nie
rusza niczego pod spodem. To jest cały powód, dla którego „delta odcisku ZERO,
fikstury ZERO" jest faktem, a nie intencją.

**Kształt.** `engine/cornice.js corniceSection` — parametryczny bead-and-cove:
mały wypukły wałek na dole, wklęsła wyoblina, płaska opaska na górze. Wysięg
**48 dla 70, 65 dla 100** — liczby właściciela, w `profile.js`, do weta jedną
linią. DXF od dostawcy podmieni **tę jedną funkcję** 1:1; wszystko dalej —
bieg, gierunki, powroty, metry, 3D — konsumuje listę punktów i nie ma zdania,
skąd one są.

**Ciągłość.** To jest zdanie górnego wypełnienia, więc to jest KOD górnego
wypełnienia: `runEnd` odpowiada na wszystkie cztery zakończenia. Inaczej pyta
się o JEDNO: które pionowe elementy stoją na drodze. Wypełnienie boczne
wyciągnięte pod sufit zatrzymuje gzyms na 2320; takie, które kończy się
z korpusem, jest metr pod nim i gzyms po prostu nad nim przechodzi.
`verticalsReaching` jest tym uogólnieniem, a `ceilingVerticals` jest jego
przypadkiem dla sufitu — jedna reguła przeszkód, nie dwie.

**Segmenty łamią się na DWÓCH rzeczach:** jednostce bez gzymsu (dziura w
biegu) i jednostce z INNĄ wysokością — 70 i 100 to dwie różne listwy i żadna
pojedyncza długość nie jest obiema.

**BOM: metry bieżące** — front + powroty + naddatek na narożnik z profilu —
jako wiersz OKUCIA. Gzyms jest materiałem kupowanym, nie częścią CNC.

**Uczciwość sufitu:** stos to jednostka + wypełnienie + wysokość gzymsu ponad
nim, i sklep **OSTRZEGA**, a nie ścina. Ścięcie przecięłoby szafkę, o którą
nikt nie prosił.

## F2a — `cc_hardware`: manifesty dostają tabelę

`lib/hardwareSource.js` to JEDNA funkcja dla każdej rodziny:
**wiersz w bazie → manifest z bucketu → mock**. Wiersz po prostu PODMIENIA
pobrany JSON — ten sam tolerancyjny parser z tury 20, ten sam rejestr.

Trzy rodzaje „nie ma" — brak tabeli, brak sesji, brak sieci — spadają o piętro
niżej i **żaden nie rzuca ani nie czeka**.

**O składaniu URL-i do modeli nie zmienia się NIC** (R4). Ten moduł podaje
katalogi rejestrom i nigdy nie składa URL-a; to zostaje w
`engine/hardwareUrl.js`, dokładnie tam, gdzie zostawiła to tura 21. Test trzyma
go za słowo.

## F2b — `cc_company_defaults`: ustaw raz, wypełniaj każdy projekt

Piętro, którego brakowało między kodem a projektem. **Kaskada:
profil → wiersz firmy → projekt → element, później wygrywa, JEDNA
implementacja** (`engine/companyDefaults.js cascade`). Cztery resolvery —
system, wykończenie i płytka zawiasu oraz wariant prowadnicy — chodzą po niej
zamiast trzymać po własnej drabinie `||`. To jest cały powód, dla którego nowe
piętro dociera wszędzie naraz, a nie w trzech miejscach, które ktoś pamiętał.

**Wolno tylko preferencje.** KĄT ZAWIASU wynika z grubości frontu i walidator
odmawia go **po nazwie, z powodem** — a `check` w SQL mówi to samo drugi raz.

Ekran pod Database ▸ Company defaults czyta, edytuje i zapisuje wiersz. Bez
sesji mówi, że domyślne wymagają konta, a aplikacja jedzie na liczbach
z profilu, jak zawsze. Nowy projekt WYPEŁNIA SIĘ z wiersza; odchylenia
mieszkają dalej w ustawieniach projektu, a nadpisania per element (tura 19) są
nietknięte.

## F3 — kondycja osprzętu, bez DevTools

Właściciel diagnozował dwie tury z konsoli. Teraz ma linię w aplikacji: per
rodzina — modele wczytane / spodziewane, ŹRÓDŁO katalogu (`db` / `bucket` /
`mock`) i czerwona liczba nieudanych pobrań z pierwszym URL-em do skopiowania.

**Nie pobiera niczego.** Czyta trzy rejestry, które już są — katalogi silnika,
pamięć dekodowania GLB (`glbStats`) i odpowiedź resolvera — i test pilnuje
tego na źródle pliku. Model, którego nikt jeszcze nie potrzebował, nie jest ani
wczytany, ani nieudany: projekt bez szuflad nie może zaświecić wiersza na
czerwono.

## F4 — D/W stoi tak wysoko, jak jego brakujące nogi

Diagnoza właściciela była trafna i miała **dwie połowy**:

1. `legHeightForPlinth` spadał na STAŁĄ Z PROFILU dla typu z cokołem bez nóg —
   100, cokolwiek projekt ustawił. Kuchnia na 50 rysowała cokół D/W na 100
   i wieszała front 50 mm za nisko, a pole, w które wpisywał, nie robiło nic.
2. `runs.js unitBase` zwracał 0 dla tego samego typu, więc `unitTop` D/W był
   100 pod sąsiadami i `buildRuns` wsadzał go **do własnego biegu** — jedna
   długość cokołu przez BUD + D/W nie była w ogóle możliwa.

Obie są jednym zdaniem — *typ z cokołem stoi tak wysoko jak nogi, na których
stoją jego sąsiedzi, ma je czy nie* — i jest ono napisane **w jednym miejscu**:
`engine/runs.js impliedLegHeight` / `standsOnLegHeight`. Czytają je
`cabinet.js`, `projectStore.floorYOf` i `projectHeightParams`. **Żadnej stałej
specjalnej dla D/W nigdzie.**

**Minimum 100 zdegradowane do domyślnej.** `projectHeights.toeKickMin: 0`
uwalnia sam cokół; wysokości KORPUSÓW zachowują `min` bez zmian, bo szafka
wysoka na 40 to literówka. `projectHeights.toeKick: 100` zostaje ziarnem,
od którego startuje nowy projekt.

**„Nie mogę tego ruszyć" — obie interpretacje.** Wysokość rusza się polem (1–3
wyżej). Przeciąganie: spacer CIĄGNIE D/W prawdziwym wskaźnikiem wzdłuż biegu
i **nie było czego naprawiać** — D/W przesuwa się jak sąsiedzi (3300 → 4088,
sąsiad 2700 → 3357, w tym samym geście). Przyczyną tego, co widział, była
WYSOKOŚĆ: jego D/W stał 100 mm niżej niż bieg i wyglądał, jakby nie należał do
niego.

## Dowody

`verify/t22/` — `walk.json` (**30/32, 0 porażek**, 2 zablokowane przez politykę
wyjścia sesji), `console.txt`, siedem zrzutów, `fingerprints-diff.txt` na
**ZERO linii**, `probes.txt` (trzy sondy równoważności), `cnc-export-identity.md`,
`bucket-live.md/.txt/.json`, `README.md`.

## Nowe pliki

`src/engine/cornice.js` · `src/engine/companyDefaults.js` ·
`src/lib/hardwareSource.js` · `src/lib/hardwareHealth.js` ·
`src/stores/companyDefaultsStore.js` · `src/components/CompanyDefaultsModal.jsx` ·
`src/3d/Cornice.jsx` · `sql/004_tura22.sql` · `scripts/seed-hardware.mjs` ·
`scripts/t22-probes.mjs` · `scripts/e2e-turn22.mjs` ·
`test/turn22-f1-cornice.test.js` · `test/turn22-f2-data-module.test.js` ·
`test/turn22-f3-hardware-health.test.js` · `test/turn22-f4-dw-legs.test.js` ·
`verify/t22/`

## Nowe liczby w `profile.js`

`autoParts.cornice` — `heights: [70, 100]`, `projection: {70: 48, 100: 65}`,
`infillHeight: 40`, `section` (bead-and-cove jako ułamki), `mitreAllowance: 100`,
`minReturn: 60` · `projectHeights.toeKickMin: 0` (F4.3).
**Nowa flaga typu:** `supports.cornice` na WARDROBE, BUDTALL i FRIDGE.

## CNC

Złote domyślne: **ZERO**, 2766 odcisków co do jednego. Sonda encja-po-encji
(`scripts/cnc-delta-probe.mjs`) też diffuje się do pustki — ani geometria, ani
spis encji, ani liternictwo. Gzyms nie tworzy części; D/W przy nodze 100 (czyli
domyślnej) tnie to, co ciął; kaskada bez wiersza to ta sama drabina, co była.
