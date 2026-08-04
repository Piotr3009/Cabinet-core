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
