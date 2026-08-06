# CLAUDE.md — Cabinet Core — TURA 5

## Kontekst
Tury 1–4 zmergowane. Baseline: **410/410 testów** — podłoga, nigdy mniej.
Tura 5 = profesjonalny szlif (precyzja 0.5, strzałki, preset CNC) + warsztatowe funkcje
(wysokości per projekt, szablony) + **picker dekorów EGGER**. Rejestr: `BACKLOG.md`
(pozycje z tej tury: **29, 30, 31, 33, 34, 35, 36 + dekory z #19**). Pozostałych NIE ruszaj.
Dane dekorów: `public/decors/` (egger-decors.json + thumbs/ — 85 dekorów, dostarczone,
NIE generuj własnych). Właściciel: Piotr — nie-programista.

## TRYB: PEŁNA AUTONOMIA — ZERO PYTAŃ (jak T4)
Fazy po kolei, commit+push per faza, BUILD-LOG.md (sekcja TURA 5), problemy/decyzje →
BLOCKERS.md. Nowa gałąź `claude/...`, PR do main. Żadnych pytań do użytkownika, żadnych
ofert pilnowania PR. "Czysto albo wcale": brak czasu → fazy NIEROZPOCZĘTE do BLOCKERS.

## ŻELAZNE ZASADY (bez zmian)
Fixtures nietykalne · engine czysty JS · zero gołych liczb (profile.js) · JS nie TS ·
**zero nowych zależności** · mock-mode bez .env · kod i copy UI po angielsku ·
nie dotykasz innych repo · sql tylko jako pliki "SQL PRZED push".

## LICENCJA EGGER — TWARDE (wpisz też komentarz w kodzie pickera)
- Obrazy dekorów WOLNO pokazywać tylko W CAŁOŚCI (thumb = cały skan pomniejszony — OK),
  ZAWSZE z podpisem **"EGGER" + kod + nazwa** przy obrazie.
- **ZAKAZ używania obrazów EGGER jako tekstur 3D** (do czasu pisemnej zgody — BACKLOG #19).
  W 3D: uni_colour → kolor z pola `hex`; woodgrain → nasza proceduralna tekstura drewna
  TONOWANA `hex` + etykieta dekoru. Oryginalne pliki EGGER nigdy na geometrii.

## FAZY

### F1 — Precyzja 0.5 mm end-to-end (BACKLOG #33) [CRITICAL]
- Silnik liczy dokładnie — NIE dotykaj. Problem jest w UI: żadne miejsce pokazujące mm
  nie może zaokrąglać do całych. Zasada wyświetlania: całe → "197", połówki → "196.5",
  inne ułamki → 1 miejsce (np. "704.7" dla rzędów półek z LISP).
- `NumberField`: przyjmuje i commit-uje połówki (196.5); `formatNumber` bez gubienia .5.
- Etykiety wymiarów 3D, strzałki odległości, BOM, panel — wszystkie przez JEDNĄ funkcję
  formatującą `formatMm()` w lib (test na nią). Grep-sprzątanie: zero `Math.round` na mm w UI.
- Snap 0.5: przeciąganie po połówkach działa realnie (test funkcji snapu).

### F2 — Strzałki + preset CNC (BACKLOG #34, #35) [HIGH]
- **#34**: wymiary/odległości w stylu rysunku technicznego: linie cienkie (1px look),
  kolor granatowy #1B2A4A (opcja czerwień #8C182B w View), groty OTWARTE lub ukośne
  ticki architektoniczne — koniec z wypełnionymi trójkątami; **napraw odwrócone groty**
  (dziś celują w złą stronę). Extension lines + wartość na środku, `formatMm()`.
- **#35**: preset "Carcass only" → przemianuj na **"Non-sprayed"** i popraw logikę:
  ZAWIERA korpusy, półki, plecy, partition/rail-part, DP, fillery, skrzynki szuflad
  (SL/SR/BF/BB/DNO); WYKLUCZA: fronty i drzwi (F/DF), infille, plinth, end panele,
  top infill. Silnik: dodaj flagę `panel.finish_exposed` (true = widoczny/wykańczany)
  wyliczaną z roli — preset filtruje po fladze, nie po liście ID. Test flagi per typ.
  Presety: All · Non-sprayed · Sprayed only · Fronts & doors only.

### F3 — Wysokości per PROJEKT (BACKLOG #29) [HIGH]
Design Settings, sekcja "Project heights": Base height (720), Wall unit height (720),
Tall height (2150), Wall mount height, Toe kick height (=legHeight 100) — defaulty
projektu, wartości startowe z profilu. Nowa jednostka DZIEDZICZY wg swojej kategorii;
w panelu jednostki wysokość edytowalna per sztuka = świadomy wyjątek (oznacz "custom",
przycisk reset do projektu). Zmiana wysokości projektowej aktualizuje jednostki
NIE-custom (z clampem kolizji). Persist + mock. Testy dziedziczenia/override.

### F4 — Save as template (BACKLOG #30) [HIGH]
Prawy klik na jednostce → "Save as template": nazwa → zapis pełnych params (bez pozycji)
do Library ▸ **Saved sets**. Klik szablonu = wstawienie nowej jednostki z tymi params
(przez normalną ścieżkę add — kolizje/sloty działają). CRUD: rename/delete w kategorii.
Persist (cc_ tabela lub kolumna — sql/003 jako plik, NIE wykonuj) + mock. Test store.

### F5 — Picker dekorów EGGER (BACKLOG #19 v1) [HIGH]
- Wczytaj `public/decors/egger-decors.json` (85 szt: category uni_colour/woodgrain,
  hex, thumb, name). Design Settings → wybór materiału frontów/korpusu dostaje
  zakładkę "EGGER decors": grid thumbów z podpisem "EGGER {code} {name}" (obowiązkowo,
  patrz LICENCJA), filtr Uni/Woodgrain + szukajka po kodzie.
- Wybór dekoru → materiał roli: 3D wg LICENCJI (hex / proceduralna tonowana hex);
  BOM i lista materiałów pokazują pełną nazwę "EGGER H1180 ST37 Natural Halifax Oak".
- Ładowanie: lista natychmiast (JSON), thumby lazy (`loading="lazy"`), uni bez plików.
- Notka w UI stopki pickera: "All decors are reproductions — colour matching only on
  the original sample (EGGER)."

### F6 — Drobiazgi (BACKLOG #31, #36) [MEDIUM]
- **#31**: "Add end panel" → wybór boku: Left / Right / Both (dotychczasowa logika ×2).
- **#36**: górne menu → pozycja **"Spraying"** (disabled/coming soon, jak Database).

### F7 — Zamknięcie
E2E w Chromium (start → projekt → wysokości projektowe → jednostka → dekor EGGER →
template save/insert → CNC preset Non-sprayed → eksporty), screenshoty do BUILD-LOG;
`npm test` + build; BACKLOG.md statusy (29,30,31,33,34,35,36,19→"picker v1 DONE");
BLOCKERS bez pytań.

## DEFINICJA SUKCESU
1. 410 starych + nowe (formatMm, snap 0.5, finish_exposed, dziedziczenie wysokości,
   templates, NumberField połówki) — 0 fail.
2. "196.5" da się wpisać, zobaczyć na etykiecie i w BOM; nigdzie mm nie zaokrągla do całych.
3. Strzałki architektoniczne, groty we właściwą stronę, granat/czerwień w View.
4. Preset Non-sprayed = dokładnie zbiór nie-wykańczanych; flaga finish_exposed testowana.
5. Wysokości projektowe dziedziczą; custom oznaczony; reset działa.
6. Template: zapis → wstawienie 1:1 przez normalne kolizje.
7. Picker EGGER: 85 dekorów, atrybucja przy każdym, zero obrazów EGGER na geometrii 3D.
8. BUILD-LOG TURA 5 + BACKLOG statusy + BLOCKERS.
