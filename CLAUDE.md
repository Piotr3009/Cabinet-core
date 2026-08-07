# CLAUDE.md — Cabinet Core — TURA 8

## Kontekst
Tury 1–7 zmergowane. Baseline: `npm test` na main po merge T7 — wynik to PODŁOGA.
Tura 8 = **światło i render v2** (recepta ze Spraying) + **7 bugów z testów Piotra** +
odsunięcie 10 mm + półki v2 + zachowania drzwi/wiszących + **mitra 45° widoczna w 3D** +
menu kontekstowe v2 + **widoczność złączy (dog bones)**. Właściciel: Piotr — nie-programista.

## TRYB: PEŁNA AUTONOMIA — ZERO PYTAŃ (jak T4–T7)
Fazy po kolei, commit+push per faza, BUILD-LOG (sekcja TURA 8), problemy → BLOCKERS.
Nowa gałąź `claude/...`, PR do main. "Czysto albo wcale".

## F0 — DŁUGI Z T7
BLOCKERS z `NOT STARTED (tura 7)` → wykonaj NAJPIERW.

## ŻELAZNE ZASADY (bez zmian)
Fixtures nietykalne · engine czysty JS · zero gołych liczb (profile.js) · JS nie TS ·
zero nowych zależności · mock bez .env · kod/copy EN · nie dotykasz innych repo
(wartości ze Spraying-Calc podane NIŻEJ — nie klonuj tamtego repo).

## FAZY

### F1 — RENDER v2 + OŚWIETLENIE [CRITICAL]
Diagnoza Piotra: "wszystko przezroczyste, brak cienia, brak głębi, białe zlewa się".
- **Rig studyjny (przeniesiony ze Spraying-Calc):** key DirectionalLight 1.0 **z cieniem
  obejmującym całe szafki** (shadow camera dopasowana do sceny), fill 0.5, rim 0.3,
  ambient 0.2; ACESFilmic, exposure 1.0. Działa w widoku roboczym I w renderze.
- **BUG: render "przezroczysty"** — znajdź przyczynę (podejrzenia: materiały z transparent
  po X-ray z T7 / opacity dziedziczone / brak depthWrite) i napraw: w Solid i Render
  wszystko w pełni kryjące.
- **Hybryda materiałów per rola:**
  * powierzchnie SPRAYOWANE (finish_exposed z kolorem RAL/F&B/hex): **envMap OFF,
    metalness 0, normalScale ~0.1** (delikatna faktura natrysku), roughness z sheen —
    kolor lakieru ma być wierny (filozofia Spraying: żadne środowisko nie przebarwia)
  * melamina/dekory (korpusy, drewnopodobne): environment ZOSTAJE (odbicia dodają życia)
- **Suwak "Sheen" w Design Settings:** skok **co 5%**, zakres 0–25
  (0=matt…25=mirror); mapowanie `roughness = 1 − sheen/25` (wzór ze Spraying).
- Separacja białe-na-białym: światło+cienie+istniejące kontury mają rozdzielać
  korpusy bez zmiany kolorów. Test wzrokowy w e2e: screenshot sceny 3 białych szafek.
- **PRAWDZIWE TEKSTURY EGGER (decyzja Piotra 07.08 — koniec proceduralnego drewna
  na dekorach):** dla category=woodgrain ładuj URL z pola `tex` w JSON (Supabase Storage; pełny adres w danych)
  (69 URL-i w `public/decors/egger/egger-decors.json` — NIE generuj; nowy układ: `public/decors/egger/` z thumbs/, stare płaskie pliki usunięte): sRGB, anisotropy 8, **kierunek słojów wzdłuż
  formatki** wg flagi grain/rotated z danych CNC (dziś słoje leżą POZIOMO na bokach —
  błąd), skala fizyczna: wysokość skanu ≈ 2800 mm wzdłuż słoja (kalibruj wizualnie,
  stała w profilu). Tekstura obecna → tonowanie hex OFF. Fallback (brak pliku/mock):
  dotychczasowa proceduralna. Uni bez zmian (hex). Atrybucja "EGGER {code} {name}"
  i notka reproduction — bez zmian, wszędzie.

### F2 — BUGI Z TESTÓW PIOTRA [CRITICAL]
1. **[NAJWAŻNIEJSZY] Dodawanie szafki PO LEWEJ niemożliwe** — nowa jednostka zawsze
   ląduje po prawej istniejących i nie da się jej przeciągnąć w lewo. Fix obu ścieżek:
   dodawanie = najbliższy WOLNY slot po dowolnej stronie (lub wskazany), przeciąganie =
   clamp wyłącznie o realne przeszkody (wolna lewa strona → wolna droga). Testy slotów.
2. **Przełącznik drzwi L/P nie działa w UI** — param `hinge` istnieje w silniku;
   przełącznik w panelu ma realnie zmieniać stronę: 3D (kierunek otwierania), wiercenia,
   drawings. Test.
3. **End panel i INFILLE nie barwią się materiałem frontów** — silnik daje
   `material_role: front` (zweryfikowane); render trasuje źle. Uwaga ze screenshota
   Piotra: end panel przy dekorze EGGER (uni) ZABARWIŁ się — zbadaj więc pełną macierz
   (kolor "This app" vs dekor EGGER × end panel vs infille) i napraw wspólną ścieżkę.
4. **EdgeHandle:** spoczynkowo **NIEWIDOCZNY** (render tylko przy hover krawędzi /
   active drag); pozycja NAD licem (+0.6 mm), obrys −1 mm/str. — koniec z-fightingu
   ("galareta") i szarej mgiełki na górach paneli.
5. **Zaznaczenie:** linia CIEŃSZA + kolor jasnoniebieski czytelny (np. #2B6CB0) —
   granat #1B2A4A czyta się na ekranie jak czarny. Stała w profile.appearance.
6. **"Dziwny klocek" przy top infillu** (screenshot Piotra: obcy prostopadłościan przy
   górnym infillu) — znajdź przyczynę (podejrzani: kawałek narożny corner-return w złej
   pozycji albo artefakt handle), napraw, test regresji na geometrii ciągu.
7. **Gate: top infill NIEDOSTĘPNY dla base units** (góra bazy = blat, nie sufit) —
   dozwolony dla wall/tall/wardrobe; side infill bez zmian. Walidacja + test.

### F3 — ODSUNIĘCIE OD ŚCIANY TYLNEJ: 10 mm WSZYSTKIE [HIGH]
Powód (Piotr): ściany nierówne + wieszaki szafek. Stała `room.wallBackClearance = 10`
w profilu; KAŻDA jednostka (base/wall/tall) pozycjonowana 10 od ściany tylnej.
Konsekwencje do domknięcia: strzałki odległości, top view w drawings pokazuje szczelinę,
głębokość end paneli i zasięg top infilla liczone od realnej pozycji, kalkulacja
otwierania drzwi przy ścianie bocznej uwzględnia luz. **Przy Infill OFF boczny clamp
= 10 mm** (zamiast szerokości infilla). Testy clampów i pozycji.

### F4 — PÓŁKI v2 [HIGH]
- **Cofnięcie 20 mm domyślnie**: półki regulowane (już tak mają z LISP), półki FIX
  i **partitiony** — wszystkie −20 od lica; per element możliwość wysunięcia do lica
  (stretch przedniej krawędzi / pole w panelu). **Wieńce TOP/BOTTOM zostają pełne**
  (konstrukcja + puzzle — nie ruszać).
- **Półka FIX → wiercenia SCREWS_3MM w OSI półki** (środek grubości, śruba w czoło) —
  zamiast pinów 7.5; obie strony. Warstwy jak LISP. DXF/CNC-view łapią z danych. Testy.
- **Flaga per półka `updown_locked`** (logika + wiercenia jak FIX); minimalny toggle
  w panelu (pełne UI później).
- **Hover na półce → wymiary odstępów** między sąsiednimi półkami (kontrola equal) —
  etykiety stylem strzałek z T5, formatMm.

### F5 — ZACHOWANIA [MEDIUM]
- **Drzwi przy ścianie bocznej: otwieranie max 90°**, animacja nigdy nie penetruje
  ściany (uwzględnij 10 mm z F3). Bez ściany — pełny kąt jak dotąd.
- **Wiszące obok Tall:** przy wstawianiu default = górna krawędź wyrównana z górą
  Tall unita; potem swobodne ręczne przesuwanie (mount height edytowalny).

### F6 — MITRA 45° WIDOCZNA W 3D [HIGH]
Dziś paski infilli renderują się jako prostopadłościany na styk ("czoło do płyty") —
Piotr: "nie ma opcji, będzie źle wyglądać". Zrób geometrię ze ŚCIĘTYMI krawędziami 45°
(ExtrudeGeometry z profilu L / custom BufferGeometry): przekrój 40+~80 spotyka się
w widocznej mitrze, narożnik otwartego końca jak rama obrazu. Dotyczy 3D (Solid/X-ray
/Render); BOM/DXF bez zmian (flagi mitre_45 już są). Test geometrii (wierzchołki fazy).

### F7 — MENU KONTEKSTOWE v2 [HIGH]
Prawy klik na jednostce — nowa kolejność:
1. **"Show all dimensions" — toggle ON/OFF** (komplet wymiarów tej szafki na scenie),
2. **End panel L/P: ON/OFF** (dodaj I usuń z tego samego miejsca — koniec biegania do menu),
3. **Infille per jednostka: ON/OFF** (side/top zgodnie z gate z F2.7),
4. dotychczasowe akcje (Rotate, Center shelves, Delete…).
Stan toggli widoczny (checkmark). Test store'a akcji.

### F8 — WIDOCZNOŚĆ ZŁĄCZY (DOG BONES) [HIGH]
Złącze = tożsamość systemu (wzór: WoodExpert pokazuje konfirmaty — my pokazujemy puzzle):
- **Solid:** subtelne LINIE PODZIAŁU tabów na stykach bok↔wieniec (z `panel.cnc.outline`) —
  dyskretne, ale jednoznaczne "to Skylon puzzle".
- **X-ray:** pełne zarysy tabów, socketów i **dogbonów** na półprzezroczystych bokach
  (dane z cnc outline/pockets, kolory dyskretne per typ elementu).
- Rysowanie bierze dane z modułu złącza — przyszłe systemy (Cabineo) dostaną
  wizualizację automatycznie. Zero zmian w silniku. Test: liczba rysowanych tabów ==
  dane cnc dla fixtures.

### F9 — Zamknięcie
E2E (scena 3 białych szafek → render PNG z cieniem → dodaj szafkę PO LEWEJ → hinge L/P →
półka FIX → hover-wymiary → infill stretch przy 10 mm → mitra w kadrze → X-ray z dogbonami),
screenshoty do BUILD-LOG; `npm test` + build; BACKLOG statusy; BLOCKERS bez pytań.

## DEFINICJA SUKCESU
1. Podłoga testów z main + nowe (sloty L/P, hinge, clamp 10, półki FIX/wiercenia,
   updown_locked, mitra-geometria, złącza==cnc, toggles menu) — 0 fail; build OK.
2. Render: cień kluczowy na całych szafkach, zero niechcianej przezroczystości,
   głębokość widoczna; białe szafki rozdzielone światłem.
3. Spray = kolor wierny (bez envMap), melamina z envem; sheen co 5% działa.
4. Wszystkie 7 bugów F2 zamknięte (z №1 na czele).
5. Każda jednostka 10 mm od ściany tylnej; Infill OFF → boki 10.
6. Półki/partitiony −20 + wysuwalne; FIX = śruby 3 w osi; hover pokazuje odstępy.
7. Drzwi przy ścianie ≤90°; wiszące równają do Tall.
8. Mitra 45° widoczna w 3D; klocek-widmo zbadany i usunięty.
9. Menu kontekstowe: dimensions/panele/infille ON-OFF od ręki.
10. Dog bones widoczne w Solid (linie) i X-ray (pełne zarysy).