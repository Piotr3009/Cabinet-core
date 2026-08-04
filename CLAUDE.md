# CLAUDE.md — Cabinet Core

## O projekcie

Cabinet Core to parametryczny konfigurator szafek i zabudów dla warsztatów stolarskich.
Aplikacja webowa, rodzina "Core" (JoineryCore = ERP, Production Core = planer okien).
Użytkownik NIE rysuje — konfiguruje; formatki, wiercenia CNC i materiały liczą się same.

**Właściciel:** Piotr — NIE jest programistą. Ty (Claude) piszesz cały kod. Piotr testuje i recenzuje.

**Pełna specyfikacja produktu:** `SPEC.md` (przeczytaj w całości przed startem).
**Matematyka (źródło prawdy):** `reference/lisp/*.lsp` — 11 plików AutoLISP sprawdzonych w produkcji Skylon Joinery.
**Wzorce architektury:** `reference/production-core/*` — pliki z siostrzanego projektu (Vite+React+Zustand+R3F).

---

## TRYB PRACY: AUTONOMIA NOCNA

Piotr zlecił wykonanie WSZYSTKICH faz 0–7 w jednej sesji (decyzja 04.08: Full MVP).
**NIE czekaj na potwierdzenie** między fazami — pracuj ciągle, faza po fazie.
Po każdej fazie: commit z opisem, push, wpis w `BUILD-LOG.md` (werdykt fazy), następna faza.
Problem blokujący (niejasna logika, brak danych)? → wpis w `BLOCKERS.md` i kontynuuj z tym, co możesz.

---

## ŻELAZNE ZASADY (nienegocjowalne)

1. **GOLDEN FIXTURES SĄ NIETYKALNE.** `fixtures/golden-bud.json` i `fixtures/golden-wardrobe.json`
   zawierają wartości wzorcowe policzone z LISP-ów. Testy MUSZĄ je czytać i przechodzić.
   Jeśli silnik daje inny wynik — zły jest SILNIK. Nie wolno modyfikować wartości oczekiwanych,
   "zaokrąglać" fixtures ani wykluczać przypadków. Utknąłeś → `BLOCKERS.md`, test zostaje czerwony.
2. **`src/engine/` = czysty JavaScript, ZERO importów Reacta.** Silnik: params → panels[] + drills[]
   + banding + totals + csvLines. Wzorzec: `reference/production-core/bom.js` (separacja).
3. **Zero gołych liczb we wzorach.** Wszystkie stałe (luzy, offsety, progi, pozycje wierceń,
   system puzzli) żyją w `src/engine/profile.js` jako edytowalne defaulty. Wzorzec 1:1:
   `reference/production-core/profile.js` — łącznie z komentarzem "different workshops =
   different NUMBERS, never different formulas", pojedynczym punktem odczytu i migracją schematu.
4. **JavaScript, NIE TypeScript.** Spójność rodziny.
5. **Wersje zależności PRZYPIĘTE** do tych z `reference/production-core/package.json`
   (React 19.1.1, @react-three/fiber 9.4.0, three 0.180.0, zustand 5, vite 7.1.3, tailwind 3.4.14,
   @supabase/supabase-js 2.x, jspdf). Nie dodawaj innych bibliotek bez wpisu w BLOCKERS.md.
6. **Mock-mode obowiązkowy.** Brak kluczy Supabase w `.env` → aplikacja DZIAŁA na danych
   przykładowych, z żółtym badge "Mock data mode". Wzorzec: Production Core. Nigdy crash.
7. **Baza nad localStorage.** localStorage tylko jako cache/fallback mock-mode.
8. **SQL nie jest wykonywany automatycznie.** Schemat + polityki RLS przygotuj w `sql/001_init.sql`
   z nagłówkiem "-- SQL PRZED push — uruchamia Piotr ręcznie w Supabase SQL Editor".
   RLS na KAŻDEJ tabeli, polityki per `auth.uid()`.
9. **Kod i copy UI po ANGIELSKU.** Commity po angielsku. BUILD-LOG/BLOCKERS mogą być po polsku.
10. **Nie dotykasz innych repo** (JoineryCore, Prime-Sash-Windows, Sash-Planner-Web). Wszystko,
    czego potrzebujesz, jest w `reference/`.
11. **System puzzli Skylon modelujesz 1:1** (decyzja Piotra 04.08) — geometria z
    `reference/lisp/SKYLON_COMMON.lsp` (drawBUL/drawBUR), parametry w profilu (sekcja niżej).
12. **DXF NIE wchodzi w tę noc** (to Faza D projektu). Silnik ma trzymać pełne dane
    (outline puzzli, otwory, warstwy), ale generator DXF nie powstaje teraz.

---

## STAŁE Z LISP (do profile.js — wszystkie jako edytowalne defaulty)

### Wspólne (SKYLON_COMMON + KIT_BUD_FULL)
- Grubości: płyta 18 (opcja 22); front 18 MDF / 19 melamina / 25 shaker; typy frontu S/H/F
- Luz drzwi (doorGap): 3; front pojedynczy = (W−3)×(H−3); podwójny = ((W−6)/2)×(H−3)
- Próg 2 drzwi: (W−4) > 700 → 2 drzwi (czyli od W=704)
- Boki: (D−G)×H; TOP/BOTTOM: (W−2G)×(D−G); BACK: W×H; PÓŁKA: (W−2G−4)×(D−G−20)
- Zawiasy w bokach: środki wg typu (niżej); każdy środek → 2 otwory 5 mm na środek±16, x=37 od PRZODU, warstwa HINGES_5MM
- Puszki we froncie: 35 mm (r17.5) na x=21.5 od krawędzi zawiasowej, warstwa FRONT_HINGES_35MM;
  2 wkręty 3 mm na holeX = cupX∓9.5 (ku środkowi drzwi), cupY±23, warstwa FRONT_HINGES_3MM
- Środki zawiasów: BASE (BUD): [100, H−300, H−100]; TALL/WARDROBE: H<1600 → 5 szt.
  [100, +i·(H−200)/4, H−100]; H≥1600 → 6 szt. [100, +i·(H−200)/5, H−100];
  LOW: <800 → 2; 800–1199 → 3; ≥1200 → 4 (wzory w SKYLON_COMMON calcHinge*)
- Puszki BUD: [100, Hf−297, Hf−97]; puszki WARDROBE: = lista środków zawiasów (bez przeliczeń)
- Otwory półkowe: rzędy y = G + i·(H−2G)/(n+1); klaster 3 otworów 7.5 mm na rowY−50/rowY/rowY+50;
  kolumny x=70 i x=Wpanelu−70; warstwa SHELVES_7_5MM
- Puzzle (boki): tylna krawędź — 3 gniazda o środkach y = 95, H/2, H−95 (otwarcie ±19 przy
  krawędzi, poszerzenie do ±25 na głębokości 10.5, pełna głębokość G; dogbone: prostokąt ±30×G,
  warstwa PUZZLE_DOG_BONES); krawędzie góra/dół — sockety na x=95 i x=W−95 (±25.5, 2 otwory
  7.5 mm na ±24.5, warstwa PUZZLE_HOLES_7_5MM); wkręty 3 mm na x=50/mid/W−50 (SCREWS_3MM)
- CSV etykiet: nagłówek `UNIT,PANEL,SZER,WYS,EDGE,EDG_L,SQM`; kody bandingu `<`, `>`, `^v`, `<>^v`;
  EDG_L w metrach (2 dec), SQM w m² (3 dec)

### Szafa (KIT_WARDROBE_FULL)
- legHeight 100; min H 1800; defaulty 600×2150×578, rail offset 1400
- Szuflady wewnętrzne: bok H 164; front H 200 (PIERWSZY od dołu 197 = 200−3); gap 3;
  głębokość skrzynki snapuje do {390,440,490,540,590,640,690} wg
  szufMaxDl = D−G−50−frontT−20 (poniżej 390 → szuflady odrzucone z ostrzeżeniem)
- Drawer panele: 2 drzwi → L+R; 1 drzwi → po stronie zawiasów; inset 30;
  drawerReduction = ilośćDP·(30+G); DP wymiar: (D−G−50)×(partitionY−G); fillery 30×wysDP, 2/DP
- Skrzynka: szer = wewn.−10−reduction; frontW = szer+4; boxFront = W−4G−10−reduction;
  boxFrontH = 164−15−G−1; dno = (boxFront+13)×szufDl
- Partition (wieniec) od spodu: G + (n·200+(n−1)·3) + 5; walidacja: strefa ≤ H−2G−200
- Prowadnice: rzędy 38+i·203 od dołu DP (od dołu boku: +G); otwory 3 mm x {37,69,293},
  warstwa RUNNERS_3MM; RAIL-PART = panel wewn.W×wewn.D
- Znane quirki LISP (odtwarzaj PRAWDĘ, nie quirk — szczegóły w fixtures →
  `lisp_summary_quirks`): RAIL-PART poza sumami LISP; DF1 w sumie jako 200; edging tylko boki+topy+półki

---

## FAZY

**Faza 0 — Scaffold + shell UI.**
Vite+React 19+Zustand+Tailwind+R3F (wersje przypięte). Struktura: `src/engine/`, `src/stores/`,
`src/components/`, `src/3d/`, `src/pages/`, `sql/`. Tailwind: paleta z `reference/production-core/tailwind.config.js`
jako baza struktury, ale KOLORY Cabinet Core: shell #1a1a1a/#252526/#2d2d30/#3e3e42 (borders),
akcent GOLD #AA8E68 (hover #C8A678, dark #8F7654), kanwas #fafaf8. Font systemowy.
Layout zamrożony (SPEC sekcja 7): topbar (logo CABINET CORE złotem, nazwa projektu, przycisk
Export złoty); lewy PŁYWAJĄCY panel Library (przeciągalny za uchwyt, pozycje: Wardrobe aktywna,
Kitchen — soon wyszarzona, Room setup, Snap: 1 mm ▾ z opcjami 0.5/1/32); prawy panel parametrów
(zamykalny); kanwas biały. Mock-mode badge.

**Faza 1 — Silnik + TESTY (brama jakości).**
`src/engine/profile.js` (WSZYSTKIE stałe wyżej, wzór PC), `src/engine/cabinet.js`:
`computeCabinet(params, profile)` → `{ panels[], drills[], totals, csvLines[] }`.
`node:test` w `test/engine.test.js`: wczytaj OBA pliki fixtures, dla każdego case porównaj
panele (wymiary, qty, banding, area ±0.001), wiercenia, totals, csv_labels (BUD-A dokładnie
co do znaku). `npm test` musi być ZIELONY zanim ruszysz dalej. Typ BUD w pełni + typ WARDROBE
(cała logika szuflad/rail/DP z sekcji stałych).

**Faza 2 — Pokój + 3D.**
Ściana główna (H pokoju × W ściany, biała) na białym kanwasie. R3F: scena, OrbitControls,
miękkie światło (wzorce z PC `src/3d` — rig, nie geometria okien). Render szafy Z WYJŚCIA
SILNIKA (boki/wieniec/półki/fronty jako boxy wg panels[] + pozycji). Etykiety wymiarów
BILLBOARDOWANE (zawsze frontem do kamery — SPEC 7). Szafa dosunięta do ściany, pozycja X
przeciągalna wzdłuż ściany ze snapem.

**Faza 3 — Edycja wnętrza.**
Klik w sekcję szafy → podświetlenie złotym outline. Panel prawy: parametry (W/H/D, board/front,
typ frontu) + przycisk "+ Add items" → modal: Drawers (ilość, mount overlay teraz / inset
zaślepka "soon"), Shelves, Hanger rail, Pull-down rail ("soon"). Szuflady wstawiane od dołu
stosem wg reguł silnika. Półki: [+]/[×], DRAG pionowy z live-wymiarem od sąsiadów, snap wg
ustawienia (1/0.5/32 mm), kolizje (sąsiedzi, top/bottom, strefa szuflad). REGUŁA: nad stosem
szuflad obowiązkowa półka (walidacja z komunikatem). Typ półki fixed/pull-out (pull-out →
pozycja prowadnic w BOM). Model danych: `sections[].items[]` z pozycjami (SPEC 5).

**Faza 4 — Drzwi + BOM on-demand.**
Drzwi jako ostatni krok (ilość wg progu 704, zawias L/R dla 1); po dodaniu panel prawy się
zamyka. Przycisk "BOM" otwiera panel: lista formatek z silnika (liczona NA ŻYWO zawsze,
POKAZYWANA na klik — SPEC 4.11), sumy m²/mb, przypisanie materiałów per ROLA (side/top/bottom/
back/shelf/front/drawer_box) z własnej listy materiałów (store wzorowany na
`reference/production-core/materialAssignmentStore.js` z yield); "Connect JoineryCore" jako
przycisk-zaślepka (integracja = późniejsza faza).

**Faza 5 — Persystencja + eksporty.**
Supabase client + auth (login/register minimalny) + zapis/odczyt `cc_projects`/`cc_units`
Z PEŁNYM mock-fallbackiem. `sql/001_init.sql` (tabele wg SPEC 5 + RLS, NIE wykonuj).
Eksport: cutting list CSV (dokładnie format LISP), prosty PDF (jspdf: zrzut 3D przez capture
jak `Window3DCaptureRig` w PC + tabela formatek).

**Faza 6 — Drugi typ + multi-unit smoke.**
Typ BUD (kuchenna baza) w silniku już jest (Faza 1) — dodaj go do Library i zrenderuj obok
szafy przy ścianie (2 jednostki, snap między sobą). To smoke-test architektury multi-unit,
nie pełna kuchnia.

**Faza 7 — Wykończenie.**
Przejdź flow end-to-end w mock-mode; napraw zgrzyty; `BUILD-LOG.md` komplet werdyktów;
README.md (jak uruchomić: `npm i`, `.env` z `.env.example` opcjonalnie, `npm run dev`).

---

## DEFINICJA SUKCESU NOCY

1. `npm test` zielony (wszystkie przypadki z obu fixtures).
2. `npm run dev` działa bez `.env` (mock-mode).
3. Flow: pokój → szafa → szuflady+półki (drag ze snapem) → drzwi → BOM z materiałami →
   eksport CSV+PDF — przechodzi end-to-end.
4. `BUILD-LOG.md` z werdyktem każdej fazy; problemy w `BLOCKERS.md`, nie zamiecione.
