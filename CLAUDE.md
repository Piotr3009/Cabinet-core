# CLAUDE.md — Cabinet Core — TURA 2

## Kontekst

**Tura 1 (fazy 0–7) jest ZAKOŃCZONA i zmergowana do main.** Aplikacja działa (Vercel, mock-mode),
silnik przechodzi 77/77 testów na golden fixtures. Ten plik opisuje TURĘ 2 — nie powtarzaj
niczego z tury 1, buduj na tym, co jest.

**Właściciel:** Piotr — nie jest programistą. Ty piszesz cały kod.
**Specyfikacja produktu:** `SPEC.md`. **Matematyka:** `reference/lisp/`. **Wzorce:** `reference/production-core/`.
**Stan wyjściowy:** main, 77 testów zielonych — to jest PODŁOGA. Nigdy mniej.

## TRYB PRACY: AUTONOMIA NOCNA

Wykonaj zadania 1–7 w kolejności priorytetów, bez czekania na potwierdzenia.
Commit + push po każdym zadaniu. Werdykty dopisuj do `BUILD-LOG.md` (sekcja "TURA 2").
Problemy → `BLOCKERS.md` (dopisuj, nie kasuj starych). Pracuj na nowej gałęzi `claude/...`, PR do main.

## ŻELAZNE ZASADY (bez zmian + doprecyzowania)

1. **GOLDEN FIXTURES NIETYKALNE.** `fixtures/*.json` bez zmian. Zadanie 4 uogólnia silnik —
   z defaultami wynik MUSI być bit-w-bit ten sam, wszystkie 77 testów zielone bez dotykania ich.
2. **`src/engine/` = czysty JS, zero Reacta.** Widok CNC i DXF czytają dane silnika
   (`panel.cnc.outline/pockets/holes`, `drills[]`) — silnik już je emituje, nie zmieniaj formatu.
3. **Zero gołych liczb** — nowe stałe (min. odstępy kolizji, delta front→bok szuflady) do `profile.js`.
4. JavaScript, nie TypeScript. Kod i copy UI po angielsku.
5. Wersje przypięte. **Jedyna dozwolona nowa zależność: `jszip@3.10.1`** (ZIP z DXF).
   Cokolwiek innego → BLOCKERS.md, nie instaluj.
6. Mock-mode dalej działa bez `.env`. Baza nad localStorage.
7. Nie dotykasz innych repo.

## ZADANIA

### 1. [CRITICAL] Widok CNC w aplikacji

Przełącznik widoku **3D | CNC** (TopBar lub róg kanwasu). Widok CNC dla ZAZNACZONEJ jednostki:

- Wszystkie formatki rozłożone płasko (auto-layout rzędami, odstępy), jak sekcja CNC w LISP.
- Każda formatka: **outline z silnika** (taby puzzli — zamknięta polilinia), **pockets**
  (dogbones i sockety jako prostokąty), **holes** (okręgi), etykieta `id` + wymiary.
- **Kolor per warstwa + legenda warstw** (stały mapping kolorów w jednym miejscu):
  outline/CARCASE, PUZZLE_SOCKET, PUZZLE_DOG_BONES, PUZZLE_HOLES_7_5MM, SCREWS_3MM,
  HINGES_5MM, SHELVES_7_5MM, RUNNERS_3MM, FRONT_HINGES_35MM, FRONT_HINGES_3MM.
- SVG (skalowalny), zoom + pan. Tylko podgląd — zero edycji.
- To jest warsztatowa kontrola wzrokowa przed maszyną (rola, którą pełnił AutoCAD) — czytelność > uroda.

### 2. [CRITICAL] Generator DXF + ZIP

- `src/engine/cnc/dxf.js` — czysty JS; wzorzec składni: `reference/production-core/dxfWriter.js`.
- **Jeden plik DXF na formatkę**, mm, origin lewy-dolny róg formatki. Encje:
  LWPOLYLINE zamknięta = outline; LWPOLYLINE zamknięte = pockets (dogbones, sockety);
  CIRCLE = holes; TEXT z `unitNum` + `panel.id` na warstwie UNIT_NUMBER.
- **Nazwy warstw DOKŁADNIE jak w silniku/LISP** — VCarve u Piotra rozpoznaje je po nazwach.
- Przycisk w widoku CNC: "Download DXF (ZIP)" → jszip → `{unitNum}-dxf.zip`, w środku
  `{unitNum}-{PANEL_ID}.dxf` per formatka.
- **Test `test/dxf.test.js`:** wygeneruj DXF dla W-A (fixtures), sparsuj własny output
  (parsowanie tekstowe wystarczy): (a) struktura sekcji DXF poprawna, (b) liczba CIRCLE
  per warstwa per formatka == liczba wpisów w `drills`/`holes` silnika, (c) liczba polilinii
  pockets == liczba pockets, (d) outline zamknięty. Zielony test = regresji pilnuje komputer.
- Akceptacja końcowa (rano, ręcznie): Piotr otwiera pliki w VCarve.

### 3. [CRITICAL] Kolizje — twarda blokada

Zasada: **ruch zatrzymuje się na granicy** (clamp). Nie ostrzeżenie, nie cofnięcie po fakcie,
nie przenikanie. Dotyczy:

- półka ↔ półka, półka ↔ strefa szuflad/partition, półka ↔ top/bottom (min. prześwity z profilu),
- jednostka ↔ jednostka na ścianie (magnet dosuwa krawędź do krawędzi, nigdy nakładka),
- jednostka ↔ granice ściany (nie wyjeżdża poza szerokość; wysokość > pokój → komunikat walidacji).

Implementacja: logika clampowania jako **czyste funkcje** (store utils lub engine),
wywoływane w setterach store'a (jedno źródło — drag, klawiatura i przyszłe ścieżki
przechodzą przez to samo). **Testy node:test na funkcjach clampujących** (przypadki brzegowe:
zerowy luz, elementy stykające się, próba przeciągnięcia poza zakres).

### 4. [HIGH] Wysokość szuflad per szuflada

- Model: szuflady jako lista z `height_mm` (default 200). UI: AddItemsModal pyta ilość +
  wysokość; potem edycja per szuflada w RightPanel. BOM/CNC/3D przeliczają się na żywo.
- Silnik — uogólnienie wzorów (obecne 200 to szczególny przypadek):
  - `totalH = Σ h_i + (n−1)·gap`; partition = `G + totalH + 5`; walidacja strefy bez zmian reguły,
  - prowadnica szuflady i: `y_i = 38 + Σ_{j<i}(h_j + gap)` (od dołu DP; +G od dołu boku),
  - bok skrzynki i: `h_i − frontToSideDelta` (nowa stała profilu = 36, bo 200−164),
  - boxFrontH liczone jak dotąd z boku; pierwszy front od dołu: `h_1 − drFirstAdj`.
- **Z defaultami (wszystko 200) wynik identyczny → 77 testów zielonych bez zmian.**
- **Nowe testy:** przypadek np. [250, 150]: spójność wewnętrzna (suma stref, pozycje prowadnic,
  wysokości frontów, partition). Oznacz w komentarzu, że to testy spójności silnika
  (engine-derived), nie golden z LISP — LISP zna tylko 200.

### 5. [HIGH] Biblioteka okuć (hardware) przez ASSIGN

- Silnik: nowa sekcja wyjścia `hardware[]` liczona Z GEOMETRII (ilości, nie produkty):
  `hinges` (szt. = zawiasy/drzwi × drzwi), `runner_pairs` (par = szuflady; z długością = szufDl),
  `legs` (szt. z profilu, default 4), `rail` (1 szt., długość = szer. wewnętrzna, gdy jest),
  `shelf_pins` (4/półkę). Każda pozycja: `role`, `qty`, `spec` (np. długość).
- Store: rozszerz wzorzec `materialAssignmentStore` — role hardware przypisywane do pozycji
  z własnej listy materiałów (kategoria `hardware` już istnieje w `cc_materials`).
- BOM panel: sekcja **Hardware** (rola, ilość, przypisana pozycja, cena gdy ustawiona).
  PDF też. **Cutting-list CSV zostaje bez zmian** (format LISP, tylko formatki).
- Mapowanie na Stock JC: NIE teraz (pole `jc_uuid` czeka, zostaw nieużyte).

### 6. [HIGH] CI

`.github/workflows/ci.yml`: na push i PR do main — `npm ci && npm test && npm run build`,
Node 22. Ma być zielony na PR tej tury.

### 7. [LOW] Kosmetyka

Komentarz `src/engine/cabinet.js` (~48): "→ 2 from W = 704" popraw na
"→ 2 from W = 705 (704 → 1 door)". Inne drobiazgi z BUILD-LOG, jeśli zostały.

## DEFINICJA SUKCESU TURY 2

1. `npm test` zielony: wszystkie dotychczasowe 77 + nowe (dxf-parse, clamp, drawer-heights) — 0 fail.
2. Widok CNC renderuje szafę W-A z warstwami i legendą — zweryfikowane w przeglądarce.
3. ZIP z DXF pobiera się; test parsujący własne pliki zielony.
4. Kolizje: nie da się nałożyć elementów dragiem — zweryfikowane realnym prowadzeniem przeglądarki.
5. Wysokości szuflad edytowalne; defaulty odtwarzają fixtures co do bitu.
6. Sekcja Hardware w BOM z przypisaniami działa.
7. CI obecne i zielone na PR.
8. `BUILD-LOG.md` sekcja TURA 2 z werdyktami; problemy w `BLOCKERS.md`.
