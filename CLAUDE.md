# CLAUDE.md — Cabinet Core — TURA 6

## Kontekst
Tury 1–5 zmergowane. Baseline: **471/471 testów** — podłoga, nigdy mniej.
Tura 6 = menu Output + **Render (realizm)** + end panel v2 + **infille L-shape** +
poprawka zaznaczenia + **sonda Drawings** (1 widok, kalibracja stylu pod turę 7).
Rejestr: `BACKLOG.md`. Właściciel: Piotr — nie-programista. Matematyka/konwencje: `reference/lisp/`.

## TRYB: PEŁNA AUTONOMIA — ZERO PYTAŃ (jak T4/T5)
Fazy po kolei, commit+push per faza, BUILD-LOG.md (sekcja TURA 6), problemy → BLOCKERS.md.
Nowa gałąź `claude/...`, PR do main. "Czysto albo wcale". Żadnych ofert pilnowania PR.

## ŻELAZNE ZASADY (bez zmian)
Fixtures nietykalne · engine czysty JS · zero gołych liczb (profile.js) · JS nie TS ·
**zero nowych zależności** (HDRI: użyj `RoomEnvironment` z three/examples — jest w paczce three;
żadnych plików .hdr z sieci) · mock-mode bez .env · kod i copy UI po angielsku ·
nie dotykasz innych repo.

## NAPRAWA NA START (jednorazowa)
`BUILD-LOG.md` stracił historię tur 1–4 (incydent gita). Odtwórz:
`git show dc075b5:BUILD-LOG.md` → scal sekcje TUR 1–4 z obecnymi T5, dopisuj T6 na końcu.

## FAZY

### F1 — Menu "Output ▾" [HIGH]
Górne menu, jedna pozycja Output; w niej trzy grupy:
1) **Render** (aktywny — F2), 2) **Drawings ▸**: "Front elevation (preview)" aktywna (F7),
Top view / Front (carcass only) — disabled "soon", 3) **CNC / DXF · Cutting list CSV ·
BOM PDF** — PRZEPNIJ istniejące eksporty tutaj (stare miejsca usuń/przekieruj; zero nowej logiki).

### F2 — RENDER: realizm na żądanie [CRITICAL — danie główne]
- Klik Render → panel ustawień: ujęcie (aktualna kamera + presety Front / 3-4 Left /
  3-4 Right / Top), rozdzielczość (1080p podgląd / **4K** 3840px dłuższy bok), jakość
  cieni (normal/high). Przycisk "Render" → obraz liczy się offscreen → podgląd →
  **"Save PNG"** (nazwa `{project}-{unit|scene}-{data}.png`).
- Realizm (to jest sedno — "mebel ma wyglądać jak prawdziwy"):
  * environment: `RoomEnvironment` + PMREM, tonemapping **ACESFilmic**, poprawna ekspozycja
  * **cienie kontaktowe** pod jednostkami (soft, ContactShadows-like) + miękkie cienie kierunkowe
  * **fazy krawędzi 0.5–1 mm wizualnie** — na materiale/normalach (NIE gęsta siatka)
  * PBR per materiał: melamina (roughness ~0.5-0.6, clearcoat 0) vs lakier/spray
    (roughness ~0.25-0.35 + clearcoat lekki) — MAJĄ być rozróżnialne okiem; dekory:
    hex/tinted procedural jak dotąd (licencja EGGER bez zmian)
  * subtelne AO; kamera perspektywa ~35 mm w presetach
- Widok ROBOCZY: tylko tani lifting (environment + cienie kontaktowe + fazy) — wydajność
  bez zmian odczuwalnych; ciężkie rzeczy (4K, high shadows, AO mocniejsze) TYLKO w renderze.
- Test: funkcje konfiguracji renderu (rozdzielczości, presety kamer) jednostkowo;
  e2e: wygeneruj PNG 1080p w Chromium i sprawdź, że plik powstaje i ma wymiary.

### F3 — End panel v2 [HIGH]
- Materiał = **materiał FRONTÓW** (spray), `finish_exposed: true` (wchodzi w preset Sprayed).
- **Głębokość = głębokość korpusu + 3 + grubość frontu** (lico z drzwiami; 3 = doorGap
  standoff — potwierdzone w LISP: top view `drawDoor` przy `y0 − doorGap − gruboscDrzwi`).
- Górna krawędź interaktywna: klik na krawędź → podświetlenie krawędzi → **dwuklik =
  wyciąga do sufitu**; grab = przeciąganie ręczne (clamp: góra szafki…sufit). Wysokość
  panelu w BOM/CNC przelicza się. Dodawanie: ręcznie (prawy klik) — bez zmian.

### F4 — INFILLE L-SHAPE [CRITICAL]
Zastępuje proste paski z T4 (BACKLOG #20 → realizacja):
- **Materiał: FRONTY (spray)**, `finish_exposed: true` — wszystkie infille.
- **Pionowy L-infill**: przekrój L — ramię A przykręcone do boku korpusu, ramię B
  **zlicowane z licem drzwi** (ta sama płaszczyzna co end panel). Domyślnie do podłogi;
  góra interaktywna jak w F3 (dwuklik→sufit / grab).
- **Top infill**: **JEDEN ciągły element na cały ciąg** (nie kawałki per szafka).
  Przekrój: pasek 40 (czoło) + pasek ~80 (półka pozioma), krawędzie cięte **45°**,
  klejone w L. Szerokość czoła edytowalna (default 40, jak dotąd), dwuklik→sufit zostaje.
- **Zakończenia top infilla (silnik + render):**
  * dochodzi do ŚCIANY → kończy się na ścianie
  * dochodzi do PIONOWEGO L-infilla → kończy się na nim
  * przy końcu stoi END PANEL wyciągnięty DO SUFITU → kończy się na panelu
  * **koniec OTWARTY** (brak ściany/panela-do-sufitu) → **mitra 45° w planie i skręt
    za narożnik**: element kontynuuje wzdłuż BOKU skrajnej szafki do ściany tylnej
    (geometria jak rama obrazu — narożnik z dwóch pasków 45°)
- BOM/CNC: infille jako formatki — paski z flagą `mitre_45` na właściwych krawędziach;
  długości z geometrii ciągu. Testy: 4 przypadki zakończeń + przekroje + BOM.

### F5 — Zaznaczenie: profesjonalne [MEDIUM]
Podświetlenie wybranej szafki/sekcji: kolor **granatowy** (#1B2A4A — spójny ze strzałkami),
linia **cienka, PRZERYWANA, odsunięta ~8–12 mm od krawędzi** bryły (bounding outline,
nie obrys geometrii) — ma wyglądać jak selekcja w CAD, nie jak część mebla.
Złoty obrys znika. Hover może zostać subtelniejszy tym samym stylem.

### F6 — Zamknięcie
E2E w Chromium (Output → Render 1080p PNG → Drawings sonda → infille w ciągu z otwartym
końcem → eksporty z nowego menu), screenshoty do BUILD-LOG; `npm test` (471 + nowe, 0 fail)
+ build; BACKLOG statusy (#20→DONE, #37→"render core DONE", #39→"sonda DONE", #17-endpanel v2).

### F7 — DRAWINGS: SONDA STYLU (jedna szafka, jeden widok) [HIGH]
Cel jawny: **kalibracja wyglądu pod turę 7** — jakość kreski > liczba widoków.
Ma wyglądać jak rysunki Piotra z AutoCAD/LISP (referencja: front view z LISP —
`reference/lisp/` drawFRONT/drawDoor + createViewLayers):
- Output → Drawings → **"Front elevation (preview)"** dla ZAZNACZONEJ jednostki.
- Zawartość rzutu frontowego: obrys korpusu i frontów z podziałami; **przekątne kierunku
  otwierania na drzwiach — dokładnie jak LISP `drawDoor`** (zbieg przy stronie zawiasów);
  szuflady jako fronty z liniami; elementy ZA frontami (półki, partition) **linią
  przerywaną**; nóżki; **zielony numer jednostki** na środku; wymiar całkowity pod spodem
  + wysokość z boku — strzałki architektoniczne z T5, wartości `formatMm`.
- Kolorystyka linii: wg warstw widokowych LISP (createViewLayers — odwzoruj kolory
  warstw: obrysy magenta itd.); tło białe.
- **Ramka rysunku + tabelka** (Project / Unit / Scale / Date / "CABINET CORE") — to ona
  robi "jak z AutoCADa". Skala auto (1:10/1:20) do formatu.
- Wyjście: podgląd + **eksport SVG i PDF (A4/A3)**.
- Test: SVG sondy parsowalny, zawiera przekątne drzwi i wymiary; PDF powstaje.

## DEFINICJA SUKCESU
1. 471 starych + nowe (render config, infille 4 zakończenia, przekroje L, end panel v2,
   sonda SVG) — 0 fail; build OK.
2. Render: PNG 4K z realizmem (environment/cienie/fazy/PBR) — melamina ≠ lakier okiem.
3. Widok roboczy szybki jak dotąd; lifting widoczny, ale bez spadku płynności.
4. Infille L: ciąg z każdym z 4 zakończeń poprawny w 3D i BOM (mitry 45° oznaczone).
5. End panel licuje z drzwiami (korpus+3+front_t); dwuklik→sufit działa (panel i infille).
6. Zaznaczenie granatowe przerywane odsunięte; złoto zniknęło.
7. Sonda Drawings wygląda jak LISP-owy front view z ramką; SVG+PDF się eksportują.
8. Menu Output kompletne; stare rozproszone przyciski eksportów przepięte.
9. BUILD-LOG: historia T1–4 odtworzona + sekcja T6; BACKLOG statusy; BLOCKERS bez pytań.