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
    — **TURA-6 / END PANEL v2 DONE**: głębokość = korpus + doorGap + grubość frontu, czyli LICO
    z drzwiami (test porównuje z boxem drzwi, nie z arytmetyką) · materiał FRONTÓW, nie korpusu
    (BOM liczy go do arkusza frontów) · górna krawędź interaktywna: klik podświetla, grab ciągnie,
    dwuklik wysyła do sufitu. Wysokość nad szafką jest PER PANEL — „apply to all" jej nie niesie.
18. [LOW] Widok konturowy/przezroczysty (render & print): same kontury, tryb prezentacyjny.
    — **TURA-4 / DONE**: View ▸ Contour view; materiał gaśnie do 6 %, kontury zostają, BOM bez zmian.

## KOLEJKA (po turze 4)
19b. [NOWE, MEDIUM] Widok konturowy: druk/eksport konturów do pliku (dziś tryb ekranowy).
     Wynikło z #18 — Piotr może chcieć PDF-a z samych konturów, nie zrzutu ekranu.
19. [MEDIUM] Dekory producentów — Egger UK / FINSA UK / Kronospan UK: import decor pack
    per warsztat; paczka Skylona w przygotowaniu (86 dekorów zebrane 06.08, składanie po
    komplecie ZIP-ów). Storage: Supabase bucket `decors` (decyzja 06.08), w repo tylko JSON
    + miniaturki. Licencja Egger przeczytana: swatche z atrybucją 'EGGER + kod' OK;
    tekstury 3D → pisemna zgoda PRZED sprzedażą CC / publicznym demo (mail-draft u Claude).
    — **TURA-8 / DONE (skany w 3D)**: decyzja Piotra 07.08 — koniec proceduralnego drewna na
    dekorach. 69 woodgrainów niesie pole `tex` (Supabase Storage), dekór drewnopodobny nosi
    obraz producenta: sRGB, anisotropy 8, **skala fizyczna** (`appearance.decor.scanHeightMm`
    = 2800 mm wzdłuż słoja — jeden skan to tyle prawdziwej płyty, a nie długość powtórzenia),
    **kierunek słojów wzdłuż formatki** (`grainRun` + `decorMapping` w `engine/decors.js`:
    słój biegnie wzdłuż DŁUŻSZEGO wymiaru części, bo tak tnie się płytę). Tonowanie hex OFF
    tam, gdzie jest skan — obraz w całości i bez edycji. Dekór bez skanu i maszyna bez sieci
    spadają na proceduralne słoje, więc mock-mode DZIAŁA. Atrybucja i nota bez zmian.
    — **ZOSTAJE**: sama pisemna zgoda EGGER na publiczne demo i sprzedaż — **BLOCKERS #44**.
20. [MEDIUM] Infille/plinth w kształcie L (przykręcane do boku) — na razie proste (decyzja Piotra).
    — **TURA-6 / DONE (infille)**: pionowy filler to L — ramię B zamyka szczelinę w PŁASZCZYŹNIE
    DRZWI (ta sama co end panel i czoło top infilla), ramię A przykręcone do boku korpusu, 60 mm
    w głąb. Do podłogi, góra interaktywna jak w end panelu. Szczelina węższa niż 24 mm zostaje
    prostym paskiem i mówi o tym w `meta.shape` — 18 mm ramienia nie wejdzie w 12 mm szczeliny.
    Top infill: **JEDEN element na cały ciąg**, przekrój L (czoło 40 + półka 80, mitra 45°),
    cztery zakończenia (ściana / pionowy L-infill / end panel do sufitu / otwarty koniec z mitrą
    i skrętem za narożnik). `engine/runs.js` + `test/run-infill.test.js`.
    PLINTH w L — **nie ruszany w turze 6**, zostaje w tym punkcie na później.
    — **TURA-8 / DONE (mitra WIDOCZNA)**: tura 6 dała flagę `mitre_45` i poprawną listę cięcia;
    3D dalej rysowało oba paski jako prostopadłościany na styk. `engine/mitre.js` tnie bryły
    płaszczyznami 45°, więc L jest widoczną mitrą, a otwarty koniec ciągu obraca narożnik jak
    rama obrazu — dwa pudełka w narożniku nachodziły na siebie kwadratem naroża i z-fightowały
    przez siebie. BOM i DXF bez zmian (osobny test), bo element jest cięty do DŁUGIEGO PUNKTU,
    a mitra to ustawienie piły. Cokół w L dalej zostaje — patrz #40.
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

## DOPISANE PO TURZE 4 (sesje czatu 05-06.08)
28. [MEDIUM] Puzzle przy płytkich korpusach: poniżej ~260 mm głębokości dwa sockety
    kolidują (95 od końców, ±25.5) — przełącznik w profilu: 1 socket na środku;
    LISP tego przypadku nie znał. Fix w czacie + kontrolny DXF do VCarve.
    — **TURA-7 / DONE**: `profile.puzzle.singleSocketBelow = 264.5`, WYLICZONE z geometrii
    i wyliczenie zapisane obok liczby: 190 (dwa środki po 95 od końców) + 56.5 (rozmiar
    jednego socketu — liczą się OTWORY, ±(24.5 + 3.75) jest szersze niż ±25.5 pockietu)
    + 18 (mostek, jedna grubość płyty). Zmiana siedzi w jednym miejscu —
    `socketCentres()` — więc sockety boku, taby blatu, dogbones, wiercenia, DXF i podgląd
    CNC idą za nią same. Plecy liczą swoje sockety tą samą funkcją po szerokości
    wewnętrznej, więc wąska szafka też dostaje 1 socket i 1 tab, a nie tab bez gniazda.
    Test przelicza próg na każdym uruchomieniu (`test/single-socket.test.js`).
    **Kontrolny DXF do VCarve — nadal do zrobienia przez Piotra** (BLOCKERS tury 7).
29. [HIGH] Wysokości na poziomie PROJEKTU (Design Settings): Base height / Wall unit
    height / Tall height / Mount height / Toe kick height jako defaulty; jednostka
    dziedziczy, per sztukę tylko wyjątki.
30. [HIGH] "Save as template": skonfigurowana jednostka → zapis do Library "Saved sets".
31. [MEDIUM] End panel: wybór boku L / P / oba (rozszerzenie #17).
32. [LOW] Insets jednostki od sąsiada/ściany (rura, krzywa ściana) — menu kontekstowe.
    — **TURA-7 / DONE**: `Inset left / right / back` (mm) w sekcji Construction panelu
    jednostki, otwierane też z menu kontekstowego. `footprintPads()` dokłada inset obok
    end panelu, więc stawianie, przesuwanie, poszerzanie, narożnik i strażnik pokoju
    respektują go, nic o nim nie wiedząc. Back inset odsuwa jednostkę od ściany w JEDNYM
    miejscu (`unitFootprint()` zaczyna prostokąt na v = inset), stąd idzie clamp głębokości,
    narożnik, kanwa 3D i linia strzałek. Strzałki mierzą korpus-do-korpusu, czyli REALNY
    dystans, a nie zmniejszony slot. Limit: `profile.editor.maxInset`.
33. [CRITICAL] Precyzja 0.5 mm end-to-end: wyświetlanie/pola/snap/etykiety pokazują
    połówki (196.5), zero Math.round na mm w UI; silnik już liczy dokładnie.
34. [HIGH] Strzałki wymiarowe architektoniczne: cienkie linie (czerwień/granat),
    groty kreskowe/otwarte jak na rzutach, koniec z wypełnionymi balonami;
    BUG: groty odwrócone — naprawić.
35. [HIGH] BUG preset CNC "Carcass only": ma znaczyć "wszystko NIE-sprayowane"
    (korpusy, półki, skrzynki, plecy) i wykluczać widoczne/wykańczane: fronty,
    drzwi, infille, plinth, end panele, spodnią widoczną wiszących.
36. [MEDIUM] Menu: przycisk "Spraying" — placeholder ("coming soon"); logika
    (finish per element, lista, m², cena) — projektujemy osobno w czacie [PARKING].

## WIZUALIZACJA — PRIORYTET PRODUKTOWY (dopisane 07.08 po analizie VividWorks/Supra)
37. [HIGH] **TURA WYGLĄD — render na najwyższym poziomie.** Powód biznesowy: nasz klient
    (warsztat) pokaże ten obraz SWOJEMU klientowi jako wizualizację sprzedażową — obraz
    musi sprzedawać, nie tylko informować. Poziom odniesienia: VividWorks/Supra Cabinets.
    Zakres techniczny (wszystko na obecnym Three.js/R3F, zero nowych zależności):
    - HDRI environment + tonemapping (ACES) zamiast płaskich świateł
    - fazy krawędzi 0.5–1 mm (na shaderze/materiale, NIE na siatce — wydajność)
    - cienie kontaktowe + miękkie cienie (mebel nie lewituje)
    - pełne PBR per materiał: różna chropowatość lakier/melamina/drewno, clearcoat,
      mapy normalnych dla struktury (rozwinięcie sheen z T4)
    - AO, delikatny bloom, kamera ~35 mm z kompozycją (nie płaski widok frontalny)
    - tryb "Presentation render" + eksport obrazu w wysokiej rozdzielczości do oferty/PDF
    UWAGA: widok CNC i contour view zostają surowe — to narzędzia warsztatowe, nie prezentacja.
    Realizacja: osobna tura poświęcona wyłącznie temu (nie punkt w innej turze).
    — **TURA-6 / RENDER CORE DONE**: Output ▸ Render — ujęcie (bieżące / Front / 3-4 L / 3-4 P /
    Top), 1080p albo 4K (3840 px dłuższy bok), cienie normal/high, podgląd, Save PNG
    `{project}-{unit|scene}-{data}.png`. Realizm: RoomEnvironment przez PMREM (w paczce three,
    zero pobierania), ACESFilmic + ekspozycja, cienie kontaktowe pod jednostkami, **fazy krawędzi
    0.8 mm na normalnych w shaderze** (nie na siatce — #37 tego wprost zakazuje), PBR per rodzina
    (melamina ≠ lakier, decyduje `finish_exposed`), delikatne AO w narożach, kamera 35 mm.
    **ZOSTAJE na później:** bloom, mapy normalnych struktury drewna, eksport renderu do PDF oferty.
    Koszt: sonda środowiskowa to jedyna niedarmowa rzecz — patrz View ▸ Realistic lighting i
    liczby w BUILD-LOG (tura 6).
38. [PARKING] Tryb sprzedażowy / Visual CPQ (wzór: VividWorks, Supra Cabinets): publiczny
    konfigurator na stronie warsztatu, uproszczone UI dla klienta końcowego, cena na żywo,
    wycena/lead. Po MVP warsztatowym. UWAGA: publiczne demo wyzwala warunek zgody EGGER (#19).

39. [HIGH] **Rysunki techniczne — pełny komplet.** Tura 6 zrobiła SONDĘ STYLU: jeden widok
    (front elevation) narysowany jak LISP Piotra, z ramką, tabelką, skalą 1:5/1:10/1:20 i
    eksportem SVG + PDF (A4/A3, papier obraca się sam, gdy tak wychodzi większa skala).
    — **TURA-6 / SONDA DONE**: `src/engine/drawings/` (czyste, testowane w node),
    warstwy widokowe LISP 1:1 z indeksami ACI, przekątne otwierania z `drawDoorSwingLines`,
    linia przerywana na wszystkim za frontem, wymiary architektoniczne z T5 przez `formatMm`.
    — **TURA-7 / DONE (karta produkcyjna)**: trzy widoki na jednym arkuszu — FRONT,
    CARCASS (no fronts), TOP — wymiarowane tak, jak mierzy warsztat: gabaryty, cokół
    osobno, pozycje półek OD DNA (nie łańcuchem), wysokość każdej szuflady, rzędy
    prowadnic, głębokość z frontem. Plan to rzut XZ tych samych `box` co lista cięcia,
    w konwencji LISP-a (front szafki na dole arkusza), więc luz 3 mm pod frontem to luz
    z profilu, nie liczba wymyślona przez rysunek. Zawias w rzucie w wymiarach
    katalogowych (`profile.hardware`). Karta sama wybiera papier (A4/A3) i układ (rzut
    pod elewacją / trzy w rzędzie) — ten, w którym szafka wychodzi WIĘKSZA.
    Output ▸ Drawings: `Unit card (PDF)`, `Unit card (SVG)`, `All units (PDF)` (okładka
    + strona na jednostkę) i `Preview…`. Wpis, który mówi „(PDF)", zapisuje PDF.
    — **ZOSTAJE**: elewacje ścian per-projekt (cały ciąg na jednym arkuszu) — decyzja
    zapisana w tury 7 CLAUDE.md: per-szafka najpierw, bo to dziedzictwo LISP-a i wartość
    warsztatowa; elewacje w następnej turze.

40. [MEDIUM] **Plinth w kształcie L** — wyłuskane z #20, którego infillowa połowa jest już
    zrobiona. Cokół to dziś prosty pasek cofnięty o 50 mm; w L byłby sztywniejszy i lepiej
    trzymał linię przy nierównej podłodze. Nie było w zakresie tury 6.

## DOPISANE 07.08 (sesja flow + WoodExpert + storage)
41. [HIGH] New Project flow: start bez wymiarów; kroki: dane projektu (auto-numer,
    klient opcjonalny + "Select from JoineryCore" soon), 8 typów (Kitchen/Wardrobe/
    Media wall/Sideboard/Vanity/Utility/Hallway/Other), zakres Whole room / One wall
    (zmienialny później), Room setup gdy pokój, Design Settings ("For this project" /
    Use saved settings — zapisywalne SETY ustawień), Joinery type z podglądem (Dog
    bones), materiały carcass 1–3 + fronty, auto-fill z JC + badge "JC" albo
    "Not assigned" + assign ze stocku. Łączenie JC: API + token (tenant z tokena,
    nigdy z listy) — SPEC sekcja 8. — **TURA-7 / DONE (część lokalna)**:
    `components/NewProjectFlow.jsx` — pięć kroków, wszystkie z gotową odpowiedzią, przeklik
    na defaultach ~10 s. Numer projektu proponowany w formacie warsztatu ("K-118" → "K-119",
    "2026/09" → "2026/10", "0009" → "0010" z zerami), nieparsowalny numer nie wywraca serii.
    SETY USTAWIEŃ to nowy zapisywany byt (`lib/settingsSets.js` + store): CAŁY obiekt design
    pod nazwą, bo set z materiałami bez wysokości aplikowałby się po cichu w połowie.
    Typ projektu ustawia kategorię Library, podpowiedź zakresu i wysokości startowe
    (kuchnia niczego nie nadpisuje — profil JEST kuchnią; szafa i vanity mają nadpisania
    w `profile.projectTypes`). Krok „pokój" to ISTNIEJĄCY `RoomModal` (nowe propsy
    onClose/onApplied), nie drugi edytor. Joinery type z podglądem WYPROWADZONYM
    z `profile.puzzle`. Badge „JC" jest funkcją danych materiału (`jc_uuid` / `source`),
    nie flagą — prawdziwy stock zapali je sam.
    — **ZOSTAJE**: samo połączenie z JoineryCore (API + token, SPEC 8). „Select from
    JoineryCore" jest disabled „soon", zgodnie z zakresem tury.
42. [HIGH] X-ray mode + okucia 3D proceduralnie (zawiasy/prowadnice/nóżki/rail
    z hardware[] i wymiarów katalogowych w profilu; InstancedMesh; tylko w X-ray).
    Wzór: WoodExpert. Bez plików 3D producentów (dane katalogowe tak, mesh nie).
    — **TURA-7 / DONE**: tryb X-ray w toolbarze i w View. Płyta schodzi do 20 %
    (`profile.appearance.xray`), fronty zostają na 42 % — front to twarz szafki — kontury
    zostają i przy tej przezroczystości TO ONE są szafką. Okucia proceduralnie:
    `profile.hardware` (katalog, osobno od `appearance.hardware`, które jest kolorami)
    + `engine/hardware3d.js`, które czyta pozycje z tego samego wiercenia co pliki CNC.
    KONTRAKT TO LICZBA: `test/hardware-3d.test.js` pyta o to samo dwa razy — obraz i
    `result.hardware` — dla każdej złotej szafki. Zawiasy i prowadnice TYLKO w X-ray;
    nóżki jak dotąd zawsze, ale jako talerz + trzpień + stopka. InstancedMesh: pięć
    wywołań na jednostkę niezależnie od liczby okuć. Zmierzone w Chromium, 10 szafek
    z drzwiami, przebiegi przeplatane: **2,87 fps normalnie / 2,83 fps w X-ray** — tryb
    nie kosztuje nic mierzalnego (liczba bezwzględna to SwiftShader, BLOCKERS #31).
    — **TURA-8 / DODANE**: w X-rayu są teraz także ZŁĄCZA (F8) — pełne profile tabów, sockety
    i dogbony, czytane z `panel.cnc` przez `engine/joinery.js`. W Solid zostają dyskretne linie
    podziału tabów. Kontrakt: liczba rysowanych tabów == dane cnc, na wszystkich fixtures.
43. [LOW] Podgląd pojedynczego elementu/formatki w 3D — później.
44. [PARKING] Upload własnych modeli 3D tenanta (GLB, Supabase Storage bucket
    `models`, RLS per tenant, limit rozmiaru) — gdy pierwszy warsztat poprosi.
45. [PARKING] Malowane panele dolne pod wiszące (osobny element; spodnia WUD surowa —
    konstrukcja Skylon), wiąże się z finish-per-lico w #36.
## DOPISANE W TURZE 7 (08.08)
46. [MEDIUM] **Elewacje ścian per-projekt.** Karta produkcyjna jest per szafka (tura 7,
    decyzja zapisana w CLAUDE.md tury 7: dziedzictwo LISP-a i wartość warsztatowa).
    Zostaje drugi rysunek: CAŁY CIĄG na jednym arkuszu — elewacja ściany z numerami
    jednostek, wymiarami między nimi i linią blatu. Maszyneria jest gotowa
    (`engine/drawings/`: primitives, sheet, layers, SVG/PDF, booklet), brakuje układu.
47. [MEDIUM] **Trzy taby na niskim korpusie.** Tura 7 rozwiązała sockety przy PŁYTKIM
    korpusie (#28). Ta sama rodzina po drugiej osi: `tabCentres()` daje trzy taby
    (95, H/2, H−95) po tylnej krawędzi boku, a przy wysokości poniżej ~310 mm środkowy
    zaczyna wchodzić w skrajne (dogbone ±30). LOW_CABINET ma `minHeight: 300`, więc
    przypadek jest osiągalny. Nie było w zakresie tury 7 — CLAUDE.md F4 mówi wyłącznie
    o socketach — i jest wypisane, żeby nie zginęło razem z zamkniętym #28.
    — **TURA-8 / DONE (F0)**: `profile.puzzle.middleTabBelow = 346`, wyprowadzone
    z geometrii tak samo jak `singleSocketBelow`, tylko z mostkiem liczonym DWA razy
    (środkowy tab ma dwie szczeliny do utrzymania, socket ma jedną). Poniżej progu
    `tabCentres()` daje dwa taby. Przy okazji naprawiony `NaN`: `backPanelGeometry()`
    destrukturyzowało trzeci środek, którego przy dwóch tabach nie ma — rzędy śrub
    liczą się teraz z reguły („po jednej między każdą parą sąsiednich tabów").
    `test/low-tabs.test.js` przelicza próg na każdym przebiegu.
48. [LOW] **Numer projektu bez unikalności.** Auto-propozycja liczy od najwyższego numeru
    NA TEJ PÓŁCE (localStorage). Dwa stanowiska bez wspólnej bazy zaproponują ten sam
    numer, a pole jest edytowalne, więc nic tego nie pilnuje. Gdy `cc_projects` zacznie
    być używane, numer chce unikalnego indeksu i propozycji z bazy, nie z półki.
49. [LOW] **Sety ustawień tylko lokalnie.** `cc.settingsSets.v1` w localStorage, bez
    tabeli i bez pliku SQL — mock-mode ma DZIAŁAĆ, więc działa. Gdy sety mają jeździć
    między stanowiskami: tabela + RLS + migracja, wzorem `cc_templates` (#26/sql).

## DOPISANE W TURZE 8 (07.08)
50. [MEDIUM] **Pełne UI blokady półki (`updown_locked`).** Tura 8 daje logikę, wiercenie
    (jak FIX) i MINIMALNY toggle w wierszu półki (🔓/🔒), zgodnie z CLAUDE.md („pełne UI
    później"). Co zostaje: powód blokady widoczny w panelu (piekarnik? przelot kabli?),
    blokada per sekcja, i pokazanie jej w 3D czymś więcej niż brakiem kursora `ns-resize`.
51. [MEDIUM] **Boczny infill w kształcie L nie dostał mitry.** Świadome: tura 6 opisuje
    ramię A jako PRZYKRĘCONE do boku korpusu, a przykręcony styk to nie mitra — więc
    `engine/mitre.js` odmawia mu cięcia i test tego pilnuje. Jeśli warsztat mitruje także
    pionowy filler, to jest jedna linijka w `infillMitre()` plus flaga w silniku.
52. [LOW] **Render bez blooma i bez map struktury drewna.** Zostało z #37 po turze 6 i tura 8
    tego nie ruszała: orange peel na natrysku jest proceduralny (shader), a nie mapą. Struktura
    porów na dekorze przyszłaby razem z mapami normalnych producenta, których w paczce nie ma.
53. [LOW] **„Show all dimensions" to etykiety, nie linie wymiarowe.** Tura 8 daje liczby przy
    elementach (F7), czytane z wyjścia silnika. Strzałki i linie pomocnicze w stylu T5 są
    osobną robotą: `3d/DistanceArrows.jsx` rysuje je MIĘDZY jednostkami, nie WEWNĄTRZ jednej.
54. [LOW] **Migracja `shelf_schema` dotyka tylko projektów wczytanych przez aplikację.**
    `variant: 'fixed'` znaczy od tury 8 PRZYKRĘCONA, a wcześniej znaczyło tyle co „półka".
    `migrateUnitShelves()` naprawia to na wejściu (cache i `loadProject`) i stempluje. Projekt,
    który trafi do silnika z pominięciem store'u (import, skrypt), tej migracji nie zobaczy.

## DOPISANE W TURZE 9 (08.08)
55. [MEDIUM] **Mitra ciągu ma się ZATRZYMYWAĆ na end panelu / infillu terminalnym,
    a nie owijać.** Zgłoszone przez właściciela i przez niego zaparkowane na
    późniejszą turę — nie było w zakresie tury 9. Dziś `engine/runs.js runEnd()`
    zna cztery warunki końcowe (`wall` / `infill` / `end-panel` / `open`) i tylko
    `open` robi zawrót z mitrą (`runTopInfill().returns`), więc SZKIELET decyzji
    już jest; brakuje reguły, że terminalny element ZAMYKA ciąg jako ściana,
    a górny element kończy się na jego licu zamiast obracać za niego róg. Dotyka
    `runEnd()`, `runTopInfill()` i `engine/mitre.js infillMitre()` — nie dotyka
    ani formatek, ani fixtures.
56. [NOTA do #42 — X-RAY] **Przeprojektowanie X-raya zaplanowane na TURĘ 10,
    czeka na zrzut referencyjny właściciela.** Pozycja #42 jest zamknięta jako
    DONE (tura 7: przezroczystość płyty, okucia; tura 8: złącza) i nie jest
    otwierana ponownie — to, co przychodzi w T10, to zmiana WYGLĄDU, nie zakresu:
    Piotr ma dosłać ekran referencyjny i dopiero on rozstrzyga, co znaczy „dobry
    X-ray". Do czasu zrzutu nie ma czego kodować i świadomie nie zgadujemy.
    Liczby, które taka zmiana ruszy, są już wszystkie w jednym miejscu
    (`profile.appearance.xray`, `profile.appearance.joinery`), więc jest to
    zmiana wartości plus praca nad materiałem, nie przebudowa.

## DOPISANE W TURZE 10 (08.08)
57. [HIGH] **Paczka T11 — 24 punkty UX/edycji plus krok 5 „nowego projektu" —
    jest ustalona z właścicielem po stronie czatu i wchodzi w NASTĘPNEJ turze.**
    Zapisane tu, żeby nie zginęło między turami: zakres jest domówiony ustnie,
    nie w tym repo, więc pierwszą czynnością T11 jest przepisanie tych 24 punktów
    do CLAUDE.md jako fazy — nie zaczynamy ich zgadywać z pamięci. Tura 10 nie
    dotknęła żadnego z nich świadomie: jej zakresem był JEDEN podsystem
    (światło, cień, pokój) i nic poza nim.
58. [MEDIUM] **`ContactShadows` z drei jest używane w konfiguracji, którą trzeba
    respektować, i to nie jest oczywiste z jego API.** Przebieg rozmycia
    renderuje quad, który zostaje w środku układu świata (nigdy nie jest dodany
    do grupy), tą samą kamerą ortograficzną, która JEST dzieckiem grupy — więc
    komponent działa poprawnie tylko wtedy, gdy jego grupa stoi w (0, ≤0, 0).
    Tura 10 obeszła to, kotwicząc plamę w środku świata i opuszczając POKÓJ
    o 0,5 mm (`appearance.room.floorOffsetMm`), co kosztuje płótno większe od
    mebla. Docelowo warto rozważyć własny, ~60-linijkowy cień kontaktowy
    (render target + materiał głębi + separowalne rozmycie napisane u nas), bo
    wtedy płótno wraca do rozmiaru mebla, gęstość tekseli przestaje zależeć od
    tego, gdzie w pokoju stoi ciąg, i znika 0,5 mm długu geometrycznego. Nie
    jest to pilne — obecna wersja jest zmierzona i działa (`verify/t10`).
59. [LOW] **`scripts/e2e-turn8.mjs` jest nieaktualny wobec tury 9.** Sprawdza
    suwak sheenu w skali 0–25 (tura 9 przeskalowała go na 5–100 %) i klika „◀",
    którego już nie ma. To dług w SKRYPCIE, nie w aplikacji — te same ścieżki
    przechodzą w `scripts/e2e-turn10.mjs`. Albo go zaktualizować przy okazji,
    albo świadomie zostawić jako zapis stanu z tury 8.

## TURA 11 — CO ZROBIONE, CO DOPISANE (08.08)

### Zamknięte w tej turze
- **#57 — paczka T11.** Dwadzieścia cztery punkty właściciela plus krok 5
  „nowego projektu" spisane do CLAUDE.md jako fazy F1–F11 i wykonane w całości.
  Nic z paczki nie zostało odłożone.
- **#50 (BLOCKERS, tura 9) — pionowy partition.** Silnik go nie miał; ma.
  Pozycja `{ kind: 'partition', x_mm }`, panel `VPART-n`, dodawany z „Add
  items", przesuwany i edytowany jak półka, tylko na drugiej osi.
- **#15 / #20 — boczny filler.** Domyślnie 40 mm, przypinany, rozciągliwy.
  Insety L/P (dawne #32 w połowie) usunięte jako koncept.

### Dopisane w turze 11
60. [MEDIUM] **Przebudowa kategorii Biblioteki — KUCHNIA na najwyższym
    poziomie, podkategorie DO OMÓWIENIA Z WŁAŚCICIELEM.** Dziś Biblioteka jest
    pogrupowana po WYSOKOŚCI szafki (base / wall / tall), co jest podziałem
    inżynierskim, a nie tym, jak stolarz myśli o zleceniu — a od tury 11
    istnieje już drugi podział, po RODZINIE typu (`profile.itemsByContext`,
    `kitchen` / `wardrobe`), i te dwa nie są tym samym. Właściwa struktura
    (co jest kategorią, co podkategorią, gdzie kończy się kuchnia a zaczyna
    garderoba) jest DECYZJĄ WŁAŚCICIELA i nie ma jej sensu zgadywać.
    **Wyraźnie NIE wchodziło do tury 11** — CLAUDE.md F11.2 mówi to wprost.
61. [MEDIUM] **Grubość własna dla czterech elementów złącza.** Bok, wieniec,
    dno i plecy biorą dziś PŁYTĘ KORPUSU i panel mówi dlaczego (czop jest
    szeroki na jedną grubość, gniazdo leży na jej osi). Warsztat, który
    naprawdę chce 22 mm boków w 18 mm korpusie, potrzebuje złącza liczonego per
    para paneli — to zmiana w `engine/puzzle.js`, nie w panelu. Pełny opis:
    BLOCKERS #58.
62. [ZAMKNIĘTE 09.08 — tura 13] **Wiercenie do pionowej przegrody.** Właściciel
    podał wzorzec biskwitowy: wkręt ⌀3 / 10 / znacznik 70 / 10 / wkręt ⌀3, od
    50 mm od krawędzi, dwa zestawy do 700 mm i trzy powyżej, bez wkrętów tam,
    gdzie lico jest widoczne. SPEC 6.1, `engine/biscuits.js`, BLOCKERS #59.
63. [LOW] **`window.__cc` w produkcyjnym bundlu.** Trzy store'y wystawione na
    `window` dla skryptu akceptacyjnego (`scripts/e2e-turn11.mjs`), żeby bieg
    MIERZYŁ, a nie tylko fotografował. Nie ma za tym nic, do czego devtools i
    tak by nie sięgnęły — ale gdy przyjdzie prawdziwe logowanie i dane klientów,
    warto to schować za flagą builda.

## TURA 12 — CO ZROBIONE, CO DOPISANE (09.08)

**Zrobione w turze 12** (szczegóły w BUILD-LOG): jedna powierzchnia ustawień
i jedno źródło koloru frontu (F1) · powłoka modalna, reguła 15 (F2) ·
biblioteka jako dane, w kolejności właściciela, + warianty szuflad 2× i 4×
(F3) · okno edycji szafki z explode i obrotem kawałka (F4) · model stref,
przegroda na stałej półce ze sprzężoną głębokością, Centre i delete (F5) ·
zawiasy widoczne w Solid i czopy dog-bone (F6) · szafka wisząca zatrzymuje
się na słupku (F7) · jeden cokół na ciąg (F8) · cofnij/ponów (F9) · plecy
lodówki bez obrotu o 90° (F10) · przejście w przeglądarce 29/29 (F11).

**BLOCKERS #59 zostaje OTWARTE.** Pionowa przegroda dalej nie ma własnego
wiercenia. Tura 12 dała jej model stref, sprzężenie z półką, Centre i
kasowanie — czyli wszystko poza tym, czym jest przykręcona. Czeka na wzorzec
od Piotra.

**Pozycje „wzorzec najpierw" (ta sama reguła co #59):**

61. [BLOCKED] **Szuflada nad drzwiami (1×).** Wpis w bibliotece jest,
    wyszarzony. Potrzebne: gdzie siedzi przegroda pod szufladą, na jakiej
    wysokości kończy się front, i od czego mierzone są zawiasy w skróconych
    drzwiach. BLOCKERS #61.
62. [BLOCKED] **Obudowa zmywarki (DW).** Wpis jest, wyszarzony. Potrzebne:
    luzy wnęki, mocowanie frontu dekoracyjnego do drzwi urządzenia i jego
    odjęcia, czy niesie cokół. BLOCKERS #62.
63. [BLOCKED] **Narożnik i szafka L.** Wpisy są, wyszarzone. Potrzebny rysunek
    jednego narożnika: rzut z wymiarami, boki, złącze na skosie, otwieranie
    drzwi. BLOCKERS #63.
64. [DECYZJA] **Kitowe 4:3:2 dryfuje o 1 mm na części wysokości.** Zamrożone
    świadomie pod regułą 7. Do decyzji: zostaje jako granica systemu (wpis w
    SPEC) czy dostaje `exact: true` w osobnej turze z nowymi fixture'ami.
    BLOCKERS #64.

**Dopisane z tury 12 (nie blokujące):**

65. [MED] **Rework kategorii poza Kuchnią.** CLAUDE.md F3.7 mówił „nie
    dotykać", więc Szafy / Zapisane zestawy / Media walls zostały jak były.
    Kuchnia jest teraz jedną listą-danymi (`engine/library.js`) i ten sam
    kształt czeka na resztę, gdy Piotr powie, jak mają wyglądać.
66. [LOW] **`scripts/e2e-turn11.mjs` nie zna zmian tury 12.** Nie jest
    zepsuty — chodzi po turze 11 — ale zakłada stare id kategorii
    (`base`/`wall`/`tall`). Kolejna tura albo go zaktualizuje, albo uzna
    `e2e-turn12.mjs` za następcę.
67. [LOW] **Okno edycji szafki nie ma X-ray ani trybu konturowego.** Świadomie:
    F4 prosiła o podgląd z explode i obrotem kawałka. Oba tryby są w widoku
    pokoju i oba przechodzą przez ten sam `MovingPanel`, więc gdyby były
    potrzebne, to dwa propy.

## TURA 13 — CO ZROBIONE, CO ZAMKNIĘTE (09.08)

**Zrobione w turze 13** (szczegóły w BUILD-LOG): znikające lica wieńców i słoje,
które obróciły się o 90° (F1) · okno edycji na cały ekran, z panoramowaniem i
„Edit element" (F2) · hierarchia koloru projekt → szafka → element (F3) · panel
boczny szafki wiszącej kończy się z korpusem (F4) · Ctrl+klik, akcje zbiorcze i
jedno cofnięcie na całą operację (F5) · „Add doors" na złotym plusie (F6) ·
zawiasy widoczne w Solid domyślnie (F7) · **wzorzec biskwitowy mocowania
przegrody (F8)** · dokumentacja (F9) · przejście w przeglądarce 24/24 (F10).

**BLOCKERS #59 ZAMKNIĘTE.** Właściciel podał wzorzec 09.08; jest w SPEC 6.1,
w `engine/biscuits.js`, w `fixtures/golden-partition-biscuits.json` i w eksporcie.
Pozycja 62 poniżej (wiercenie przegrody) jest tym samym i schodzi z listy.

**BLOCKERS #64 ZAMKNIĘTE.** Właściciel potwierdził 09.08: kitowe 4:3:2 zostaje
takie, jakie tnie kit. To granica systemu, zapisana w SPEC 6, nie dług.

**Nadal „wzorzec najpierw"** — #61 (szuflada nad drzwiami), #62 (DW), #63
(narożnik / L). Czekają dokładnie tak, jak #59 czekało do 09.08: silnik nie
zgaduje wzorca warsztatu, a kiedy wzorzec przychodzi, kosztuje jedną turę.

**Dopisane z tury 13 (nie blokujące):**

68. [MED] **Rozszerzenie panelu/drzwi PONIŻEJ szafki wiszącej.** Panel boczny
    WUD kończy się teraz z korpusem (F4, werdykt właściciela). Jedyny przyszły
    wyjątek to rozszerzenie w dół — slot danych jest zostawiony otwarty
    (`endPanel.height: 'extended'` już działa i opuszcza panel), brakuje tylko
    UI i decyzji, co dokładnie schodzi w dół: sam panel, czy panel i drzwi.
    Powiązane z parkowanym #45.
69. [LOW] **Znacznik biskwitu na przegrodzie jest TRASOWANIEM, nie gniazdem.**
    Stół 3-osiowy nie sięga kanta, więc druga połowa złącza dostaje linię na
    płaszczyźnie, odsuniętą o `biscuits.markFromEnd` (20 mm). Jeśli warsztat
    woli inne odsunięcie albo wolałby, żeby to była kieszeń — to jedna liczba
    w profilu i jedna decyzja właściciela.
70. [LOW] **Trzy zestawy biskwitowe nie występują na przegrodzie w praktyce.**
    Reguła „>700 mm → trzy" jest zaimplementowana i przetestowana, ale linia
    złącza przegrody biegnie po jej GŁĘBOKOŚCI, a ta rzadko przekracza 700.
    Wzorzec jest ogólny i czeka na pierwsze złącze, które jest szersze.
71. [LOW] **`scripts/e2e-turn12.mjs` nie zna zmian tury 13.** To samo, co
    pozycja 66 mówi o skrypcie tury 11: nie jest zepsuty, po prostu chodzi po
    swojej turze. `e2e-turn13.mjs` jest następcą.
72. [LOW] **`window.__cc.views` w produkcyjnym bundlu.** Rozszerzenie pozycji
    63: scena i kamera obu widoków 3D są wystawione dla skryptu akceptacyjnego
    (`src/3d/viewHandle.js`), bo F1 jest twierdzeniem o GEOMETRII, a F2.2 o
    KAMERZE — żadnego z nich nie da się przeczytać z DOM-u. Ta sama uwaga co
    przy store'ach: gdy przyjdzie prawdziwe logowanie, schować za flagą builda.
