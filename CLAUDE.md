# CLAUDE.md — Cabinet Core — TURA 4

## Kontekst
Tury 1–3 zmergowane. Baseline: **357/357 testów** — podłoga, nigdy mniej. Tura 4 = wygląd
(neutralne materiały, cienkie kontury), szkielet aplikacji (ekran startowy, górne menu)
i UX prawego panelu + 2 bugi. Pełny rejestr: `BACKLOG.md` (pozycje 1–18 = ta tura;
19+ NIE RUSZAJ). Właściciel: Piotr — nie-programista. Wzorce: `reference/`.

## TRYB: PEŁNA AUTONOMIA — ZERO PYTAŃ
- Wykonuj fazy po kolei, bez czekania. Commit+push per faza, werdykty → BUILD-LOG.md
  (sekcja TURA 4), problemy → BLOCKERS.md. Nowa gałąź `claude/...`, PR do main.
- **Nie zadawaj użytkownikowi ŻADNYCH pytań.** Wątpliwość → wybierz rozsądnie, odnotuj
  w BLOCKERS, jedź dalej. **Nie proponuj subskrypcji PR ani "pilnowania"** — kończysz
  raportem i tyle. Zasada "czysto albo wcale": brak czasu → fazy NIEROZPOCZĘTE do BLOCKERS.

## ŻELAZNE ZASADY (bez zmian)
Fixtures nietykalne · engine czysty JS bez Reacta · zero gołych liczb (wszystko profile.js)
· JS nie TS · **zero nowych zależności** (tekstury drewna: wygeneruj proceduralnie do plików
PNG w /public/textures — canvas/skrypt node, słoje + szum; NIE pobieraj z internetu) ·
mock-mode działa bez .env · kod i copy UI po angielsku · nie dotykasz innych repo.

## FAZY

### F1 — BUGI [CRITICAL] (BACKLOG 1–3)
- **#1 Kolejność szuflad**: góra listy w panelu = góra w 3D (dziś odwrotnie). Wyrównaj
  konwencję w JEDNYM miejscu (store/engine order), nie łataj w widoku. Test.
- **#2 Pola liczbowe**: kontrolowane inputy normalizują per klawisz (RightPanel ~281) —
  nie da się wpisać wartości. Fix wzorcem: lokalny bufor tekstowy, commit+clamp na
  Enter/blur, Escape=przywróć. Zastosuj do WSZYSTKICH pól liczbowych (szuflady, wymiary,
  mount height, pokój). Test logiki bufora.
- **#3 Weryfikacja wizualna**: szafa 1200 + 2 szuflady internal w Chromium — screenshot;
  skrzynki mają być wcięte ~71 mm/str., DP przy bokach (dane silnika są poprawne —
  sprawdzono). Rozjazd render↔dane → napraw render; zgodne → odnotuj DONE w BLOCKERS #3.

### F2 — Wygląd 3D (BACKLOG 4–6)
- Default korpus: złamana biel #F2F0EC; opcja jasny szary #E8E8E6. Fronty default = korpus.
  Dekory: dark walnut + light oak (tekstury proceduralne → /public/textures, ładowane
  przez loader z Design Settings; dekor wybieralny per materiał).
- Kontury: cienkie CZARNE (#1A1A1A, ~1px look — edges geometry/thin lines zamiast obecnych
  grubych brązowych); **toggle "Outlines" w toolbarze** (ON default).
- Sheen ~20%: roughness/clearcoat delikatnie (wzór: szkło/ramy w PSW look) — subtelnie,
  nie plastik. Kanwas/ściany bez zmian.

### F3 — Ekran startowy + górne menu (BACKLOG 7–8)
- Start screen (styl AutoCAD): logo, **New Project**, **Open** (lista z Supabase/mock),
  **Recent** (ostatnie 5, klik otwiera). Wejście do kanwasu dopiero z projektu.
- Górny pasek menu (lewa strona): **File** (New / Open / Save / Save as / Export ▸ [istniejące
  eksporty] ) · **View** (Outlines, Dimensions, 3D|CNC, Contour view — patrz F6) · **Library** ▸
  kategorie · **Settings** (Design Settings) · **Database** (disabled, "soon") · **Clients**
  (disabled, "soon"). Styl przycisków = obecne Account/Export (złoty akcent, te same kształty).
  Stary rozrzut przycisków sprzątnij — jedna spójna belka; Account/Export zostają po prawej.

### F4 — Library z kategoriami (BACKLOG 9)
Menu Library ▸ rozwijane kategorie: **Base units** (BUD, BUDR, SINK, LOW) · **Wall units**
(WUD) · **Tall units** (BUDTALL, FRIDGE, WARDROBE) · **Saved sets** (pusta lista + "soon") ·
**Media walls** ("soon"). Klik kategorii → JEDEN modal (obecny, przefiltrowany do kategorii);
modal: grab&move zostaje + **przycisk X** (zamknij). Bez kategorii w środku jednej listy.

### F5 — Prawy panel UX (BACKLOG 10–14)
- **Add items = lista typów** (Drawers / Shelves / Hanger rail / Pull-down"soon"); klik typu →
  **zwijana sekcja** ustawień (accordion) inline — ŻADNYCH osobnych modali. Dużo sekcji =
  wszystko zwijalne.
- **Equal heights**: checkbox ✓ default (jedno pole dla wszystkich szuflad); odznaczony →
  pole per szuflada (kolejność jak w 3D — po F1#1).
- **Auto-porządek przy dodawaniu**: półki układają się od góry, szuflady od dołu, hanger
  pomiędzy (nowe itemy nie kolidują z istniejącymi — użyj istniejących clampów).
- **Szuflady internal dodane → drzwi jednostki animowanie się otwierają** (pokaż wnętrze;
  istniejący mechanizm animacji frontów).
- **Add hanger rail → wybór z listy materiałów** kategorii hardware (istniejący store
  materiałów); pozycja "Connect JoineryCore" jako disabled hint. Wybrany hanger → hardware[]
  w BOM z nazwą pozycji.

### F6 — Infille/plinth zachowanie + end panel + widok konturowy (BACKLOG 15–18)
- **Side infill**: jednostka NIE dojeżdża do ściany — clamp stop w odległości infillWidth
  (Design Settings); przy dojechaniu do stopu infill **pojawia się automatycznie**
  (formatka w BOM); odjazd → znika. Test clampa.
- **Plinth + top infill: manual** — usuwasz auto-tworzenie z tury 3; dodawanie z prawego
  panelu / menu kontekstowego ("Add plinth", "Add top infill"); dopiero po dodaniu są
  widoczne i w BOM. Top infill: default 40, drag do sufitu i dwuklik zostają.
- **Right-click → "Add end panel"**: opcje w sekcji (nie modal): height = **to floor / unit
  height**; thickness default = front_t z Design Settings; checkbox **"Apply to all end
  panels"** ✓ → kolejne dodania dziedziczą ustawienia. Panel = formatka (BOM/CNC/DXF),
  po zewnętrznej stronie boku, kolizje respektowane.
- **Contour view** (View ▸ Contour): tryb prezentacyjny — materiały wygaszone/przezroczyste,
  same czyste kontury (do renderu i druku ekranem). Przełącznik, bez wpływu na BOM.

### F7 — Zamknięcie
E2E w Chromium (start screen → new project → jednostka → items → end panel → infill przy
ścianie → BOM → eksporty), screenshoty do BUILD-LOG; `npm test` + build; BACKLOG.md:
pozycjom 1–18 ustaw status TURA-4/DONE (albo NIEROZPOCZĘTE w BLOCKERS); README aktualizacja.

## DEFINICJA SUKCESU
1. 357 starych + nowe testy (kolejność szuflad, bufor pól, clamp infilla, end panel) — 0 fail.
2. Bugi #1 #2 naprawione; #3 rozstrzygnięte screenshotem.
3. Meble neutralne + orzech/dąb, kontury czarne cienkie z toggle, sheen subtelny.
4. Start screen + górne menu działają; Library w kategoriach z X.
5. Panel: accordion, equal heights, auto-porządek, drzwi otwierają się po szufladach, hanger z materiałów.
6. Infill auto przy ścianie; plinth/top manual; end panel w BOM; contour view.
7. BUILD-LOG TURA 4 + BACKLOG statusy + BLOCKERS bez pytań do użytkownika.
