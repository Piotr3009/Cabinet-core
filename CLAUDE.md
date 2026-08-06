# CLAUDE.md — Cabinet Core — TURA 3

## Kontekst

Tura 1 (MVP, fazy 0–7) i tura 2 (widok CNC, DXF+ZIP, kolizje, wysokości szuflad, hardware,
CI) są ZAKOŃCZONE i zmergowane. Baseline: **158/158 testów zielonych, CI aktywne** — to podłoga,
nigdy mniej. Ten plik opisuje TURĘ 3: rozbudowę do pełnej rodziny szafek z LISP + pokój v2
+ interakcje + ustawienia projektowania + eksport grupowy CNC.

**Właściciel:** Piotr — nie jest programistą. **Matematyka:** `reference/lisp/`.
**Kolory:** `reference/colors/psw-colors.json` (wyekstrahowane 1:1 z PSW — NIE dotykasz repo PSW).
**Wzorce:** `reference/production-core/`. **Spec:** `SPEC.md` (uwaga: fazy tej tury NADPISUJĄ
decyzję "max 3 ściany" z SPEC 4.2 — nowa decyzja Piotra: 4 ściany z auto-ukrywaniem).

## TRYB PRACY: AUTONOMIA (1–2 SESJE)

Fazy w twardej kolejności, bez pytań. Commit+push per faza, werdykt do `BUILD-LOG.md`
(sekcja TURA 3), problemy do `BLOCKERS.md`. Nowa gałąź `claude/...`, PR do main.

**ZASADA "CZYSTO ALBO WCALE":** jeśli sesja się kończy, NIE zostawiaj zadań w połowie —
niedotknięte fazy wpisz do BLOCKERS jako `NOT STARTED (tura 3, faza N)`. Druga sesja rusza
z tego samego pliku: przeczytaj BUILD-LOG + BLOCKERS i kontynuuj od pierwszej nierozpoczętej fazy.

## ŻELAZNE ZASADY

1. **FIXTURES NIETYKALNE** — dotychczasowe bez zmian. NOWE typy: NAJPIERW wyprowadź fixture
   z LISP-a linia-po-linii (jak `fixtures/golden-bud.json` — ten sam format, meta
   `status: PENDING_PIOTR_VERIFICATION`, sekcja `verify_with_piotr` z kluczowymi liczbami),
   ZAPISZ fixture, DOPIERO POTEM koduj silnik pod ten fixture. Silnik się nie zgadza →
   naprawiasz silnik. Fixture wyprowadzony ≠ fixture dopasowany do silnika.
2. `src/engine/` czysty JS, zero Reacta. Zero gołych liczb — wszystko do `profile.js`.
3. JavaScript, nie TS. Kod i copy UI po angielsku.
4. **Zero nowych zależności** (jszip już jest). Import DXF pomieszczenia: parsuj tekst
   sam (LINE/LWPOLYLINE z sekcji ENTITIES wystarczy). Czegoś się nie da → BLOCKERS, nie npm install.
5. Mock-mode działa bez `.env`. Baza nad localStorage. Nie dotykasz innych repo.
6. Model danych jednostek/pokoju może wymagać rozszerzeń — dopisz migrację do
   `sql/002_tura3.sql` (nagłówek "SQL PRZED push"), NIE wykonuj.

## FAZY

### FAZA 1 — Silnik: pełna rodzina typów [CRITICAL]

Nowe typy z LISP (kolejność wg wartości): **BUDR** (baza 3 szuflady, ratio 4:3:2 —
KIT_BUDR_FULL.lsp), **WUD** (wisząca: bez nóg, zawieszki, doorExtend — KIT_WUD_FULL.lsp),
**BUDTALL**, **LOW_CABINET**, **SINK**, **FRIDGE**. Dla każdego: diff LISP-a względem
BUD/WARDROBE (rdzeń wspólny ~86% — NIE kopiuj logiki, konfiguruj typ), stałe do profilu,
fixture per typ (zasada #1), testy. Wzorzec konfigów typów już istnieje w silniku.

Dodatkowo w silniku:
- **Nogi:** reguła z LISP + Piotra: 4 w rogach; szerokość > 1000 mm → +1 noga w geometrycznym
  środku (środek szerokości i głębokości) = 5. Do profilu + `hardware[]` (qty) + wiercenia jeśli LISP je ma.
- **Warning na zły format szuflad**: `drawers` nie-liczba/nie-obsługiwany kształt →
  `warnings[]` wpis, nie cicha zerowa ilość (audyt tury 2, [LOW]).

### FAZA 2 — 3D: zgodność renderu z silnikiem [CRITICAL]

- **BUG: szeroka szafa (2 drzwi)** — silnik liczy odsunięcie szuflad po OBU stronach
  (drawer panele L+R, redukcja 96 przy 1200), ale 3D tego nie pokazuje. Render MA
  odzwierciedlać silnik 1:1 (pozycje/szerokości skrzynek, DP przy obu bokach).
- **Nogi w 3D:** 4 (nie 2), piąta środkowa gdy >1000 mm; wysokość z profilu (100).
- Render nowych typów z Fazy 1 (WUD wisi na ścianie na wysokości montażowej — parametr).

### FAZA 3 — Pokój v2 [CRITICAL]

- **4 ściany** zamiast 3; ściany tyłem do kamery **auto-znikają** (culling po kierunku
  kamery) → naturalny widok z góry przy kamerze znad pokoju.
- **Kształt L** — pokój jako lista ścian (prostokąt = szczególny przypadek); modal
  pomieszczenia: edycja rzutu z góry (rysowanie/edycja ścian), wymiary.
- **Import DXF rzutu**: upload → parser (LINE/LWPOLYLINE) → propozycja ścian na podglądzie →
  użytkownik potwierdza/koryguje → pokój utworzony.
- **Okna i drzwi w ścianach**: "Insert window" / "Insert door" — automatyczne wstawienie
  z edycją pozycji/wymiarów; wizualne otwory w ścianie (v1: wizualizacja, bez logiki kolizji z meblami).
- **Guard zmniejszania pokoju**: jeśli nowy wymiar/kształt spowodowałby kolizję lub
  wypchnięcie jednostek → BLOKADA zmiany + komunikat (EN):
  "Cannot shrink the room below placed units — move or remove units first."

### FAZA 4 — Kolizje: absolutne domknięcie [CRITICAL]

Zakaz nakładania jednostek KAŻDĄ drogą: drag, zmiana szerokości/głębokości jednostki
(clamp/blokada z komunikatem), zmiana pokoju (Faza 3), przyszłe ścieżki — wszystko przez
te same czyste funkcje clampujące. Testy na nowe ścieżki (resize jednostki obok sąsiada,
resize przy ścianie, L-shape narożnik).

### FAZA 5 — Interakcje [HIGH]

- **Klik-i-trzymaj na elemencie = przesuwanie** (jednostka wzdłuż ściany / półka pionowo)
  bez ruchu kamery; orbit kamery TYLKO gdy start na ścianie/tle.
- **Zoom do elementu**: dwuklik/klik fokusuje kamerę BLISKO klikniętego elementu (nie środek sceny).
- **Obrót**: przycisk w panelu itemu — każde kliknięcie +90°; pole na własny kąt;
  przyciski "Back to wall" / "Side to wall".
- **Prawy klik na item → menu kontekstowe**: min. "Center shelves" (równe rozstawy),
  "Rotate 90°", "Delete"; architektura pod kolejne akcje.
- **Animacja otwierania/zamykania**: klik na front szuflady = wysuwa/chowa (animowane),
  klik na drzwi = otwiera/zamyka na zawiasach (kierunek wg hinge). Stan wizualny,
  nie wpływa na BOM/CNC.

### FAZA 6 — Modal "Design Settings" (poziom projektu) [HIGH]

- **Materiały carcass**: liczba typów (1–3) + przypisanie materiału per typ (z listy materiałów).
- **Fronty**: typ standardowy (Shaker / Flat; uchwyty — later, zostaw miejsce).
- **Biblioteka drzwi użytkownika v1**: zapisywane style = nazwa + typ frontu + materiał/kolor;
  przypisywalne do jednostek; CRUD w modalu.
- **Kolory frontów**: wybór RAL / F&B / własny HEX. Dane z `reference/colors/psw-colors.json`
  (grupy, nazwy, hexy — użyj 1:1; UI wzorowane na dropdownach z grupami). Wybrany kolor
  widoczny w 3D na frontach.
- **Infill przy ścianie**: ustawienie szerokości w mm (używane w Fazie 7).
- Ustawienia trzymane per projekt (store + persystencja + mock).

### FAZA 7 — Automaty konstrukcyjne [HIGH]

- **Auto plinth (cokół)**: generowany pod jednostkami stojącymi (wysokość = legHeight z profilu,
  cofnięcie z profilu); panel w BOM/CNC jako formatka.
- **Auto side infill**: gdy jednostka stoi przy ścianie z luzem — wypełnienie o szerokości
  z Design Settings; formatka w BOM.
- **Auto top infill**: przy wstawianiu jednostki od razu top infill **40 mm** (default
  w profilu); **grab = przeciąganie w górę aż do sufitu; dwuklik = sam dojeżdża do sufitu**;
  formatka w BOM przelicza się z wysokością.

### FAZA 8 — Toolbar wizualizatora + eksport grupowy CNC [HIGH]

- **Toolbar na górze kanwasu**: Show/Hide dimensions; strzałki odległości **między
  jednostkami** i **od jednostki do ściany** (linie z grotami + wartość mm, live przy
  przeciąganiu); przycisk **BOM przeniesiony tutaj**; przełącznik 3D | CNC zostaje.
- **Eksport grupowy CNC**: w widoku CNC lista formatek z checkboxami, grupy:
  Carcass / Shelves / Drawers / Fronts & Doors; presety: **All · Carcass only ·
  All without drawers · Fronts & doors only**; podgląd renderuje ZAZNACZONE.
- **"Download DXF (one file)"**: JEDEN plik DXF z zaznaczonymi formatkami rozłożonymi
  DOKŁADNIE jak w podglądzie (ten sam moduł layoutu — czyste funkcje już są);
  nazwa `{unitNum}-cnc-{preset|custom}.dxf`. Test: parsowanie własnego outputu
  (encje per warstwa == suma z silnika dla zaznaczonych).
- **ZIP per-formatka ZOSTAJE** jako druga opcja ("Download ZIP (per panel)") — droga
  awaryjna Piotra przy uszkodzonej pojedynczej formatce.

## POZA ZAKRESEM (nie ruszaj)

Rysunek techniczny pomieszczenia DXF/SVG (TODO na później), uchwyty, integracja JC,
eksport all-projektowy, nesting, PWA, auto-propozycje pozycji przy grab.

## DEFINICJA SUKCESU TURY 3

1. `npm test`: 158 starych + nowe (typy×fixtures, kolizje-resize, dxf-grupowy, clamp pokoju) — 0 fail.
2. 6 nowych typów w Library, konfigurowalne, render + BOM + CNC + DXF działają dla każdego.
3. Szeroka szafa: 3D pokazuje obustronne odsunięcie szuflad; nogi 4/5 poprawnie.
4. Pokój: 4 ściany z auto-ukrywaniem, widok z góry, L-shape, import DXF, okno+drzwi, guard zmniejszania.
5. Nie da się nałożyć jednostek ŻADNĄ drogą (drag, resize, pokój).
6. Interakcje: move-bez-kamery, zoom-do-elementu, obrót 90°/kąt/align, menu kontekstowe, animacje frontów.
7. Design Settings: materiały, fronty, biblioteka drzwi, kolory RAL/F&B/hex widoczne w 3D, infill mm.
8. Automaty: plinth, side infill, top infill 40 z drag/dwuklikiem — wszystkie w BOM.
9. Toolbar: wymiary on/off, strzałki odległości live, BOM na górze; eksport grupowy:
   presety + jeden DXF == podgląd, ZIP per panel zostaje.
10. BUILD-LOG sekcja TURA 3 + BLOCKERS (w tym NOT STARTED, jeśli sesja się skończy).
