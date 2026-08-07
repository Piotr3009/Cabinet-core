# CLAUDE.md — Cabinet Core — TURA 7

## Kontekst
Tury 1–6 zmergowane. Baseline: uruchom `npm test` na starcie — wynik z main po merge T6
to PODŁOGA, nigdy mniej. Tura 7 = **Drawings v1 (karta produkcyjna per szafka)** +
**New Project flow** + **X-ray z okuciami 3D** + dwa punkty silnikowe (#28, #32).
Rejestr: `BACKLOG.md` (tej tury dotyczą: **39, 41, 42, 28, 32**). Właściciel: Piotr —
nie-programista. Konwencje rysunkowe: `reference/lisp/` + sonda z T6 + zrzuty w BUILD-LOG.

## TRYB: PEŁNA AUTONOMIA — ZERO PYTAŃ (jak T4–T6)
Fazy po kolei, commit+push per faza, BUILD-LOG.md (sekcja TURA 7), problemy/decyzje →
BLOCKERS.md. Nowa gałąź `claude/...`, PR do main. "Czysto albo wcale".

## F0 — DŁUGI Z T6 (jeśli są)
Przeczytaj BLOCKERS: jeśli tura 6 zostawiła fazy `NOT STARTED` — wykonaj je NAJPIERW
(wg CLAUDE tury 6 zapisanego w gicie: `git show <merge-T6>^:CLAUDE.md` gdy trzeba),
dopiero potem fazy poniżej.

## ŻELAZNE ZASADY (bez zmian)
Fixtures nietykalne · engine czysty JS · zero gołych liczb (profile.js) · JS nie TS ·
**zero nowych zależności** (PDF: istniejący jspdf; SVG własny) · mock-mode bez .env ·
kod i copy UI po angielsku · nie dotykasz innych repo · sql tylko jako pliki.

## FAZY

### F1 — DRAWINGS v1: karta produkcyjna per szafka [CRITICAL]
Rozwinięcie sondy z T6 (ten sam styl: warstwy/kolory z `createViewLayers`, przekątne
drzwi z `drawDoor`, ramka+tabelka, `formatMm`). Dla jednostki — **strona A4/A3 (auto)**:
- **Trzy widoki na stronie**: Front (kompletny) · Front carcass-only (bez frontów —
  widoczne półki/partition/prowadnice liniami pełnymi) · Top view (jak LISP top:
  korpus, plecy, fronty z luzem 3, zawiasy po stronie hinge).
- **Wymiarowanie detaliczne** (strzałki architektoniczne z T5): gabaryty W×H×D,
  pozycje półek (od dna), wysokości szuflad per szuflada, rzędy prowadnic, cokół/nogi,
  front gaps. Zasada: liczby, które warsztat mierzy taśmą — nie każda śruba.
- Etykieta jednostki (zielony numer), nazwa typu, materiały (carcass/front z dekorami
  EGGER pełną nazwą), skala, ramka + tabelka (Project · Unit · Scale · Date · Cabinet Core).
- **Wyjścia**: Output ▸ Drawings ▸ "Unit card (PDF)" i "Unit card (SVG)".
  **Booklet projektu**: "All units (PDF)" = strona per jednostka + okładka (lista
  jednostek, projekt, klient) — okładka [MEDIUM: jeśli czas].
- Test: SVG karty parsowalny (3 widoki obecne, liczba przekątnych = liczba drzwi,
  wymiary z formatMm); PDF wielostronicowy powstaje.
- DECYZJA ZAPISANA: per-szafka najpierw (dziedzictwo LISP, wartość warsztatowa);
  elewacje ścian per-projekt → następna tura.

### F2 — NEW PROJECT FLOW (BACKLOG #41) [HIGH]
Start screen: **usuń wymiary z kart projektów** (zostaje nazwa/numer/data). Flow:
1. **Project info**: Project number (auto-propozycja kolejnego, edytowalny) · Name
   (opcjonalna) · Client (opcjonalny, pole tekstowe) + przycisk "Select from
   JoineryCore" **disabled "soon"**.
2. **Typ projektu** — 8 kafelków: Kitchen · Wardrobe · Media wall · Sideboard ·
   Vanity · Utility room · Hallway · Other. Typ ustawia: domyślną kategorię Library,
   defaulty wysokości projektu, podpowiedź zakresu (Vanity → One wall).
3. **Zakres**: "Whole room" / "One wall" + linia copy: "One wall is enough for a
   vanity or a single run — you can add more walls later." Wybór NIE jest pułapką:
   ściany dokładalne później (istniejący pokój v2).
4. Whole room → **Room setup** (istniejący modal) TERAZ; One wall → pomiń.
5. **Design Settings na start**: nagłówek z wyborem **"For this project"** vs
   **"Use saved settings"** (lista zapisanych SETÓW USTAWIEŃ — nowy byt: zapis/odczyt
   kompletu ustawień projektu pod nazwą; CRUD minimalny). Dalej sekcje:
   - **Joinery type**: pozycje z profilu; dziś jedna — "Dog bones (Skylon puzzle)"
     z podglądem po kliknięciu (mini-rysunek tabów z geometrii puzzle) — architektura
     pod przyszłe systemy już jest w profilu.
   - **Carcass materials 1–3** (kafelki; klik → picker kolorów/dekorów EGGER) i **Fronts**.
   - **Sprzężenie z JC (lokalnie)**: pozycje materiałów mające `jc_uuid`/źródło JC →
     kafelki auto-wypełnione + **badge "JC"**; brak przypisań → stan
     "Not assigned materials" + przycisk "Assign from Materials stock" (istniejący store).
6. **"Start designing"** → kanwas. Wszystko edytowalne później z menu — flow ma być
   przeklikiwalny w 10 sekund na defaultach.
Persist ustawień per projekt + mock. Testy store'ów (saved settings sets, dziedziczenie
typu, auto-numer projektu).

### F3 — X-RAY + OKUCIA 3D (BACKLOG #42) [HIGH]
- Toolbar: tryb **X-ray** — korpusy półprzezroczyste (fronty mocniej), wnętrze czytelne;
  kontury zostają.
- **Okucia proceduralnie** (zero plików, wymiary katalogowe w profile.js):
  zawias = puszka ⌀35 + ramię (pozycje z hinge_centers), prowadnice = para profili L
  o długości z hardware[] na rzędach runners, nóżki = walec+stopka (4/5 wg reguły),
  rail = rura ⌀ z profilu. Widoczne TYLKO w X-ray (normalny widok zostaje czysty;
  nóżki jak dotąd zawsze).
- Wydajność: InstancedMesh dla powtarzalnych (zawiasy, nóżki); scena 10 szafek
  bez odczuwalnego spadku FPS.
- Test: liczby instancji okuć == hardware[] dla fixtures (BUD-A, W-B, BUDR).

### F4 — PUZZLE: pojedynczy socket przy płytkich (BACKLOG #28) [MEDIUM]
Silnik: gdy szerokość boku (głębokość−G) < próg, dwa sockety (95 od końców, ±25.5)
kolidują. Wyprowadź próg Z GEOMETRII profilu (span socketów + minimalny mostek —
udokumentuj wyliczenie w komentarzu), stała `puzzle.singleSocketBelow` w profile.js;
poniżej progu: **JEDEN socket na środku szerokości** (+ odpowiadający tab po drugiej
stronie złącza, wiercenia спójne). Testy engine-derived z adnotacją "LISP tego
przypadku nie znał" (precedens: wysokości szuflad). DXF/CNC-view łapią zmianę
automatycznie z danych.

### F5 — INSETS jednostki (BACKLOG #32) [MEDIUM]
Panel jednostki / menu kontekstowe: **Inset left / right / back (mm)** — świadome
odsunięcie od sąsiada/ściany (rura, krzywa ściana). Clampy kolizji respektują insety
(slot pomniejszony), strzałki odległości pokazują realny dystans, back-inset odsuwa
od ściany (unit "wisi" w głębi — pozycja Z). Testy funkcji clampujących z insetami.

### F6 — Zamknięcie
E2E w Chromium (nowy flow od start screen → typ → one wall → settings z saved set →
jednostka → X-ray → karta PDF), screenshoty do BUILD-LOG; `npm test` + build;
BACKLOG statusy (39/41/42/28/32 + DONE-y); BLOCKERS bez pytań.

## DEFINICJA SUKCESU
1. Testy: podłoga z main + nowe (drawings-svg, saved-sets, auto-numer, instancje okuć,
   single-socket, insety-clamp) — 0 fail; build OK.
2. Karta produkcyjna: 3 widoki, wymiary detaliczne, ramka+tabelka; PDF per jednostka
   i booklet działają; styl = sonda T6/LISP.
3. Flow: od start screen do kanwasu w ≤10 s na defaultach; typy/zakres/saved sets
   działają; materiały z JC-badge lub "Not assigned".
4. X-ray: okucia we właściwych pozycjach (zgodne z hardware[]), płynnie przy 10 szafkach.
5. Puzzle: płytki korpus dostaje 1 socket na środku; próg wyliczony i udokumentowany.
6. Insety respektowane przez kolizje i strzałki.
7. BUILD-LOG TURA 7 + BACKLOG statusy.