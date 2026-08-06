# CABINET CORE — BACKLOG
Żywy dokument. Numeracja stała (nie zmieniamy po fakcie). Priorytety: [CRITICAL]/[HIGH]/[MEDIUM]/[LOW].
Status: OPEN → TURA-N (przypisane) → DONE.

## BUGI
1. [CRITICAL] Kolejność szuflad odwrócona: góra listy w panelu = dół w 3D. Ma być 1:1 (góra=góra).
   — **TURA-4 / DONE**: `engine/panel items.js` (`drawerRows`/`shelfRows`) — jedna zapisana
   konwencja, panel nie sortuje. Numer silnika (D1 = dolna) zostaje na wierszu, bo to numer
   z listy cięcia. Test: `test/item-order.test.js`.
2. [CRITICAL] Pole wysokości szuflady nie przyjmuje wpisywania. Przyczyna (zdiagnozowana):
   kontrolowany input normalizuje/clampuje per klawisz (RightPanel ~281). Fix: lokalny bufor,
   commit na Enter/blur, clamp dopiero przy zatwierdzeniu. Dotyczy też innych pól liczbowych.
   — **TURA-4 / DONE**: `lib/numberField.js` + `components/NumberField.jsx`, użyte we WSZYSTKICH
   polach liczbowych (zero `type="number"` w `src/`). Test: `test/number-field.test.js`.
3. [DO WERYFIKACJI] Szeroka szafa + drawers internal: silnik i dane 3D na main POPRAWNE
   (inset 71 mm/str., DP 48, front wyśrodkowany — zweryfikowane liczbowo). Piotr: twardy refresh
   produkcji po deployu tury 3 i retest; jeśli nadal źle → zrzut Z APLIKACJI + konfiguracja → CRITICAL.
   — **TURA-4 / DONE (render zgodny z danymi)**: szafa 1200 + 2 szuflady w Chromium — skrzynki
   wcięte symetrycznie, DP przy bokach, front wyśrodkowany. Liczby przypięte testem
   (`test/render-geometry.test.js`: inset 18+30+18+5 = **71 mm/str.**), więc pytanie nie wróci
   do zrzutu ekranu. Jeśli u Piotra nadal wygląda inaczej — to jest stary bundle w cache.

## TURA 4 — WYGLĄD + SZKIELET + UX PANELU — ✅ WYKONANA (06.08.2026)
4. [HIGH] Materiały neutralne: default korpus złamana biel (#F2F0EC), opcje jasny szary;
   dekory: ciemny orzech + 1 jasne drewno (tekstury lokalne). Złoto-brąz znika z mebli.
   — **TURA-4 / DONE**: `profile.appearance.finishes` (broken white / light grey / dark walnut /
   light oak), dekor per materiał, fronty domyślnie = korpus. Tekstury generowane lokalnie
   (`scripts/gen-textures.mjs` → `public/textures/`), zero pobierania z sieci.
5. [HIGH] Kontury elementów: czarne, cienkie; przełącznik konturów OFF/ON. Cel: detaliczny look jak PSW.
   — **TURA-4 / DONE**: `#1A1A1A`, `lineWidth 1`; toggle „Outlines" w toolbarze i w menu View, ON default.
6. [MEDIUM] Sheen materiałów ~20% (delikatny połysk jak okna PSW).
   — **TURA-4 / DONE**: `meshPhysicalMaterial`, `clearcoat 0.2` nad matową płytą (`roughness 0.55`).
7. [HIGH] Ekran startowy (styl AutoCAD): Recent projects / New Project / Open.
   — **TURA-4 / DONE**: `components/StartScreen.jsx` + `lib/projectLibrary.js` (lokalna półka,
   Recent = ostatnio OTWARTE, 5 pozycji, scalane z bazą gdy jest skonfigurowana). Do kanwasu
   wchodzi się tylko przez projekt.
8. [HIGH] Górne menu klasyczne: File (New/Open/Save/…) · View · Library · Settings ·
   Database (soon) · Clients (soon). Styl przycisków = obecne Account/Export (złoty akcent).
   — **TURA-4 / DONE**: `components/MenuBar.jsx` (menu = dane), Account/Export zostają po prawej,
   Room setup / Design settings / Snap przeniesione z panelu Library do menu Settings.
9. [HIGH] Library z menu: kategorie rozwijane (Szafy / Zapisane komplety / Dolne / Górne /
   Media walls / …) → jeden modal per kategoria; modal grab&move + przycisk X (dziś brak).
   Pływający charakter zostaje (menu tylko otwiera/chowa).
   — **TURA-4 / DONE**: `UNIT_CATEGORIES` (Base / Wall / Tall / Saved sets „soon" / Media walls
   „soon"), jeden pływający panel per kategoria z X i Escape. Test pilnuje, że każdy typ jest
   w dokładnie jednej kategorii.
10. [HIGH] Prawy panel — Add items: lista typów; sekcje ustawień ZWIJANE (accordion), bez osobnych modali.
    — **TURA-4 / DONE**: `components/Section.jsx`; `AddItemsModal.jsx` usunięty.
11. [HIGH] Wysokości szuflad: checkbox "Equal heights" (✓ jedna wartość dla wszystkich;
    bez ✓ pola per szuflada).
    — **TURA-4 / DONE**: ✓ domyślnie; ponowne zaznaczenie bierze wysokość dolnej szuflady.
12. [MEDIUM] Auto-porządek przy dodawaniu: półki od góry, szuflady na dole, hangers pomiędzy.
    — **TURA-4 / DONE**: reguły w `engine/items.js`, brak miejsca → odmowa z liczbą.
13. [MEDIUM] Dodanie szuflad wewnętrznych → drzwi jednostki otwierają się (pokazać wnętrze).
    — **TURA-4 / DONE**: `openFrontsFor` na istniejącej animacji frontów.
14. [MEDIUM] Add hangers: wybór z listy materiałów (hardware); link do stocku JC — później (zaślepka).
    — **TURA-4 / DONE**: wybór z kategorii `hardware`, „Connect JoineryCore" jako disabled hint,
    wybrany produkt w linii `rail` w BOM.
15. [HIGH] Infill boczny — zmiana zachowania: jednostka NIE dojeżdża do ściany; stop w odległości
    infilla (mm z ustawień) + infill pojawia się automatycznie przy dojechaniu.
    — **TURA-4 / DONE**: `clampUnitX({ wallMargin })` + magnes = lądowanie na stopie; ten sam stop
    przy wstawianiu i przy zmianie szerokości. Odjazd usuwa formatkę.
16. [HIGH] Plinth i top infill: NIE automatyczne przy wstawieniu (odwrócenie tury 3) —
    dodawane ręcznie, dopiero wtedy widoczne (i w BOM).
    — **TURA-4 / DONE**: `autoPartsFor` już ich nie wymyśla, tylko przenosi; uchwyt top infilla
    renderuje się tylko, gdy formatka istnieje. Drag + dwuklik bez zmian.
17. [MEDIUM] Prawy klik → "Add end panel" (panel maskujący bok): wybór do podłogi / do wysokości
    szafki; grubość default = grubość frontów; checkbox "wszystkie panele tak samo" (✓) —
    kolejne dodania dziedziczą. Formatka w BOM/CNC.
    — **TURA-4 / DONE**: `END-L`/`END-R`, rola `end_panel` w BOM, opcje w sekcji panelu (nie modal),
    panel jest częścią footprintu, a panel który się nie mieści jest odmawiany z liczbą.
18. [LOW] Widok konturowy/przezroczysty (render & print): same kontury, tryb prezentacyjny.
    — **TURA-4 / DONE**: View ▸ Contour view; materiał gaśnie do 6 %, kontury zostają, BOM bez zmian.

## KOLEJKA (po turze 4)
19b. [NOWE, MEDIUM] Widok konturowy: druk/eksport konturów do pliku (dziś tryb ekranowy).
     Wynikło z #18 — Piotr może chcieć PDF-a z samych konturów, nie zrzutu ekranu.
19. [MEDIUM] Egger/producenci: import katalogów dekorów (infrastruktura z pkt 4 gotowa).
    BLOKADA: licencja na grafiki w aplikacji komercyjnej — sprawdza Claude (czat).
20. [MEDIUM] Infille/plinth w kształcie L (przykręcane do boku) — na razie proste (decyzja Piotra).
21. [MEDIUM] VCarve — drobiazgi do zmiany (listę poda Piotr).
22. [MEDIUM] Rzuty z góry / dokumentacja do druku; Print w menu File.
23. [MEDIUM] Rysunek techniczny pomieszczenia DXF/SVG (z tury 3 — odłożone).
24. [LOW] Database / Clients: docelowo dane z JoineryCore (miejsce w menu już w turze 4).
25. [LOW] Import DXF rzutu — test na realnym pliku od architekta (Piotr podeśle).
26. [LOW] sql/002 — odpalić w Supabase przy przejściu na realny zapis.
27. [LOW] GitHub Actions — billing/minuty, potem Re-run (nie blokuje: audyt lokalny działa).

## PARKING (świadomie później)
JC integracja (Stock live, push BOM — endpointy tylko w czacie) · uchwyty · nesting 2D ·
PWA/offline/ikona · tryb demo · fronty inset (czekają liczby od Piotra) · model biznesowy ·
BUDR: potwierdzenie warsztatowe 0.70 / holdery SINK bez oklejki / cokół per ciąg (pyt. 4 z audytu t3).
