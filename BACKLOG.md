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
45. ✅ **ZAMKNIĘTE (tura 14, F5).** Malowane panele dolne pod wiszące — jeden
    ciągły panel pod BIEGIEM: długość = suma szafek, głębokość = głębokość
    szafki + 10 mm (zakrywa odsadzenie od ściany). Rodzina części `MASK`,
    materiał FRONTOWY (założenie właściciela, zgłoszone w BUILD-LOG), nowe
    fixtures `golden-wall-mask.json`, własny modal, dokowanie przedłuża płytę,
    bok maskujący albo przerwa kończy segment. Slot `endPanel.height:
    'extended'`, który tura 13 zostawiła pod tę pozycję, jest nietknięty.
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
55. ✅ **ZAMKNIĘTE (tura 14, F3).** Mitra ciągu ZATRZYMUJE się na elemencie
    terminalnym. Reguła jest JEDNA i pyta POMIESZCZENIE, nie jednostkę końcową
    biegu: `ceilingVerticals()` zbiera piony sięgające sufitu (boki maskujące i
    listwy przyścienne, czyjekolwiek), a `runEnd()` dobija do BLISKIEGO lica
    najbliższego z nich. To pokrywa oba przypadki właściciela — bieg szafek
    wiszących kończący na boku wysokiej szafki i górny wypełniacz wysokiej
    szafki kończący NA listwie — bo w obu przeszkoda należy do kogoś innego.
    Element kończący się na własnym wieńcu nie jest przeszkodą, więc zachowanie
    tury 8 (bieg opływa własny bok o wysokości korpusu) jest nietknięte.
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

## TURA 14 — CO ZAMKNIĘTE, CO ZAPARKOWANE (09.08)

**Zamknięte:** #45 (panel maskujący, F5) · #55 (mitra kończy na przeszkodzie, F3).

73. [PARKING] **PRZERYSOWANIE zawiasów.** Tura 14 F6.4 skasowała przełącznik
    „Hinges in Solid" z menu kontekstowego — werdykt właściciela: wybór jest
    bezsensowny. Zawiasy zostają widoczne dokładnie tak, jak zostawiła je tura
    13 (flaga `showHinges`, domyślna wartość z profilu, pozycja w View — bez
    zmian). To, jak zawias WYGLĄDA, jest osobnym tematem i CLAUDE.md parkuje go
    wprost: „REDRAWING the hinges is a parked, separate topic — do not touch
    their look."
74. [PARKING] **Wycięcia (cutouts).** Wymienione w CLAUDE.md tury 14 jako
    zaparkowane obok przerysowania zawiasów; nie było w zakresie żadnej fazy.
75. [MEDIUM] **Kolor per ELEMENT nie przemalowuje jeszcze 3D.** F4.1 dało
    modalowi elementu paletę projektu z próbkami (`elementMaterialChoices` niesie
    `hex`), a zapis nadal idzie kanałem `material_id`/`material_label`, który
    czyta BOM. Żeby jeden bok maskujący był INNEGO koloru na obrazku, potrzebny
    jest kanał wykończenia w nadpisaniu elementu i odczyt w `3d/materials.js
    surfaceFor` — świadomie poza zakresem F4, bo CLAUDE.md pyta o to, SKĄD
    bierze się wybór, a nie o drugą warstwę malowania.
76. [LOW] **Głębokość szafki nie jest ograniczana przez BOX w planie.** F10.3
    wpina boxy w zacisk przesuwania po ścianie i w wyszukiwanie miejsca —
    dokładnie tam, gdzie „szafka staje przy kominie". `maxDepthOnWall()` nadal
    pyta tylko o ŚCIANY, więc bardzo głęboka szafka wjedzie w komin stojący
    przed nią. To ta sama arytmetyka (`rayToSegment` po bokach boxa) i osobna
    decyzja o zakresie.
77. [LOW] **`scripts/e2e-turn13.mjs` nie zna zmian tury 14.** To samo, co
    pozycje 66 i 71 mówią o skryptach tur 11 i 12: nie jest zepsuty, chodzi po
    swojej turze. `e2e-turn14.mjs` jest następcą.

## TURA 15 — CO ZAMKNIĘTE, CO DOPISANE (09.08)

**Zamknięte:** **#51** (boczny infill w kształcie L dostał mitrę — F6; dokładnie
tak, jak wpis przewidywał: warsztat mitruje pionowy filler, więc to rozszerzenie
`infillMitre()` plus flaga w silniku, a ramię A dalej jest przykręcone).

78. [PARKING — DECYZJA WŁAŚCICIELA] **Symulacja NESTINGU na arkuszu CNC.**
    CLAUDE.md tury 15 F9.4 mówi to dwa razy i wprost: „NO nesting. The nesting
    simulation is deliberately deferred by the owner — do not sketch it, do not
    scaffold it." Oba widoki tury 15 (po materiale, po szafce) są KUBEŁKAMI w
    kolejności części z silnika i niczym więcej; `engine/cnc/layout.js` nadal
    układa rzędami tak, jak robi to AutoLISP. Nic nie zostało przygotowane pod
    nesting, bo przygotowanie też jest szkicem.
79. [MEDIUM] **Osiemnaście nowych wpisów katalogu czeka na wzorzec.** F5.2 dała
    listę właściciela w całości: Corner, L-shape, DW, Oven, Bin storage, Wine
    rack, Small fridge, Twin space (base) · Basket tall, Pantry,
    Pantry-on-worktop, Space tower, Oven tall, American fridge (tall) · Glass
    unit, L-shape wall (wall) · Free-standing panels, Cornice/pelmet (extras).
    Wszystkie są OBECNE i wyłączone z uczciwym powodem — to reguła
    wzorzec-najpierw, nie zaległość. Każdy z nich to osobny kit i osobna
    rozmowa; kolejność, w której powstaną, jest decyzją właściciela.
80. [MEDIUM] **Listwa dekoracyjna / pelmet ma gotową logikę RUNU i nie ma
    wzorca.** Wpis `cornice-pelmet` w grupie Extras: „one click adds it along a
    run (run-logic like the plinth)". Run-logic naprawdę jest gotowa —
    `runPlinthParams` / `runMaskParams` robią dokładnie to — brakuje PROFILU
    przekroju listwy i jej wzorca cięcia. To najbliższy wpis do zamknięcia z
    całej osiemnastki.
81. [MEDIUM] **Panele wolnostojące potrzebują właściciela w modelu.** Dziś panel
    maskujący należy do SZAFKI (`params.end_panels`), więc panel, który nie
    dotyka żadnej szafki, nie ma gdzie zamieszkać. To zmiana w modelu projektu
    (element pokoju, nie jednostki), a nie nowy kit — i dlatego jest wpisem, a
    nie fazą.
82. [LOW] **Fornirów są cztery i są pożyczone.** F3.2 zasiewa kolekcję
    (`engine/veneers.js`) czterema wpisami odwołującymi się do dekorów EGGER-a,
    bo własnych skanów właściciela jeszcze nie ma. STRUKTURA jest gotowa:
    `setVeneerCatalogue` przyjmuje listę, wpis z własnym `tex` przestaje
    kredytować EGGER-a, a projekt zachowuje swój wybór, bo zapisał id fornira, a
    nie dekoru. Dosypanie skanów to wpis danych.
83. [LOW] **Zakres wybarwień WOOD nadal bez kolorów.** Źródło `wood` istnieje,
    nie ma pickera (`picker: null`) i mówi o tym wprost — bez zmian od tury 11,
    bo CLAUDE.md nadal parkuje sam zakres.
84. [LOW] **Mitra narożnika wymaga wypełniacza nie węższego niż szczelina jest
    wysoka.** F6 tnie 45° o nogach `faceH`, więc listwa 30 mm pod szczeliną 250
    mm zostaje na styk. To prawda warsztatowa, nie ograniczenie implementacji —
    ale gdyby właściciel chciał tam mitry pod innym kątem (mason's mitre), to
    inne cięcie i osobna decyzja.
85. [LOW] **`scripts/e2e-turn14.mjs` nie zna zmian tury 15.** To samo, co
    pozycje 66, 71 i 77: nie jest zepsuty, chodzi po swojej turze.
    `e2e-turn15.mjs` jest następcą.

## TURA 16 — CO ZAMKNIĘTE, CO DOPISANE (09.08)

**Zamknięte:** **#75** (kolor per ELEMENT nie przemalowywał 3D — F1.4 rozwiązuje
to u korzenia: `engine/materials.js panelFinish` jest czystą funkcją
`(panel, unit, design, profile)`, a widok pokoju, okno edytora i okno detalu
tylko ją konsumują; nadpisanie jedzie kanałem `material_key`, czyli KLUCZEM
palety, a nie samą nazwą).

**Model materiału wylądował.** Płyta jest przypisana raz i czytana wszędzie:
typ korpusu i typ frontu mają `material_id`, cztery części runu mają przełącznik
„Same as fronts" (domyślnie ON), a jedna funkcja — `resolvePanelMaterial` —
odpowiada BOM-owi, arkuszowi CNC, obrazkowi i bramce check-outu. Drugiej tablicy
wyszukiwania nie ma.

**Werdykty właściciela z testu oka tury 15.** Światło edytora (F7) podniesione i
ZMIERZONE (+17 % średniej, +20 % na najciemniejszej dwudziestce, przy wyższym
kontraście). Połysk wiszących (F8) zdiagnozowany pomiarem — materiały
identyczne, objaw się nie reprodukuje, kandydaci na poprawkę idą w złą stronę —
więc rig został nietknięty, a to, co pomiar naprawdę pokazał, jest w BLOCKERS
jako osobny temat.

86. [MEDIUM] **Połysk widać dopiero na kolorze, i to słabo.** Zmierzone w F8:
    biały front przy domyślnym połysku (sheen 60) ma rozrzut specularny 0,3–1,0
    na 255, bo dyfuzja siedzi już przy suficie zakresu — refleks nie ma gdzie
    być jaśniejszy. Na froncie RAL 3005 rozrzut to 7,6–8,2, czyli widać, ale nie
    jest to „drzwi na wysoki połysk". To jest osobny temat od F8 (który dotyczył
    RÓŻNICY między wiszącymi a stojącymi) i osobna decyzja: ekspozycja / tone
    mapping / węższe źródło światła / clearcoat na lakierze. Ławka jest gotowa —
    `node scripts/t16-gloss-lab.mjs` mierzy dowolną parę szafek.
87. [MEDIUM] **Sekcja materiału na arkuszu nie ma jeszcze pola przypisania.**
    F2 grupuje po przypisanym materiale, a przypisanie zmienia się w kroku 5 /
    Ustawieniach. Kliknięcie nagłówka sekcji („to jedzie na inną płytę") byłoby
    naturalne i jest świadomie poza zakresem tury: F2 pyta, PO CZYM arkusz
    grupuje, a nie skąd się to zmienia.
88. [LOW] **`fileSafeName` czyści nazwę tylko dla ZIP-a.** Nazwy plików DXF są
    czyszczone od tury 3 własną regułą w `engine/cnc/dxf.js` (`[^A-Za-z0-9._-]`
    → `_`), a ZIP od tury 16 przez `engine/naming.js` (→ `-`). Dwie konwencje
    dla tej samej nazwy w tej samej paczce; zjednoczenie ich ZMIENI nazwy
    plików, więc jest osobną, nazwaną deltą na osobną turę — reguła 0.
89. [LOW] **Podpisy części znikają przy pełnym oddaleniu.** F3 wybiera ukrycie
    zamiast nachodzenia i taki jest werdykt CLAUDE.md („truncates/hides rather
    than overlapping"), ale to znaczy, że przy całej kuchni na ekranie kody
    części nie są rysowane wcale. Progiem jest `cnc.annotation.minLabelPx` —
    jedna liczba w profilu — więc warsztat, który woli nieczytelne kreski od
    braku napisu, zmienia ją bez otwierania komponentu.
90. [LOW] **`scripts/e2e-turn15.mjs` nie zna zmian tury 16.** To samo, co
    pozycje 66, 71, 77 i 85: nie jest zepsuty, chodzi po swojej turze.
    `e2e-turn16.mjs` jest następcą.
91. [MEDIUM] **VPART nie jest objęty regułą „słój w górę rysunku".** T17 F3
    obraca poziome deski, które stolarz nazywa półką (`SHELF`, `PARTITION`,
    `RAIL-PART`, `FIXED`). Pionowa przegroda ma `role: 'shelf'`, ale stoi na
    sztorc i LISP rysuje ją „na boku" (x wzdłuż wysokości), więc na arkuszu leży
    w poprzek własnego słoja tak samo, jak leżała półka. Nie jest w zakresie
    F3 („wszystkie półki") i obrócenie jej jest nazwaną deltą eksportu.
92. [MEDIUM] **Wycięcie w plincie nie działa na plincie RUNU.** Panel D/W tnie
    wycięcie tam, gdzie sam tnie plint. Gdy długi plint należy do sąsiada,
    wycięcia nie ma — kawałek nie wie, gdzie w jego długości stoi urządzenie.
    Pozycję zna `engine/runs.js`. BLOCKERS #69.
93. [LOW] **Eksport per materiał nie ma jeszcze własnego ZIP-a.** F2.1 daje
    jeden plik na płytę. ZIP per panel (tura 15) nadal dotyczy CAŁEJ szafki, co
    jest jego zadaniem — ale „daj mi po jednym pliku na formatkę, tylko z tej
    płyty" jest oczywistym następnym pytaniem warsztatu.
94. [LOW] **Miarka mierzy dwa punkty i nie zapamiętuje pomiaru.** F11 prosi
    dokładnie o to („click one point, click another, read the distance") i
    trzeci klik zaczyna nowy pomiar, jak taśma. Łańcuch pomiarów, zapis na
    rysunku i wymiar do PDF-a to osobny temat.
95. [LOW] **`scripts/e2e-turn16.mjs` nie zna zmian tury 17.** To samo, co
    pozycje 66, 71, 77, 85 i 90: nie jest zepsuty, chodzi po swojej turze.
    `e2e-turn17.mjs` jest następcą.

## TURA 18 — SZUFLADA — ✅ WYKONANA (10.08.2026)

Numery **W** to własna lista właściciela z tej partii uwag; zapisane tu, żeby
dało się je odszukać po jego numerze, a nie tylko po fazie.

96. [HIGH] **W32 — etykiety CNC wychodzą poza elementy.** `F01 TOP 564x540 F01
    BOTTOM 564x…` przechodzące przez części i wchodzące w sąsiadów.
    — **TURA-18 / DONE (F1)**: jedna funkcja układu (`engine/cnc/annotation.js`
    `labelBlock`) dla arkusza I pliku, blok do trzech wyśrodkowanych linii,
    ucinanie `~`, połowa rozmiaru w eksporcie (`cnc.exportLabelScale`), szerszy
    krok pisma (`MONO_ADVANCE` 0.62 → 0.85) i ciaśniejsze wypełnienie
    (`labelFillRatio` 0.94 → 0.85). Delta 1 tury.
97. [CRITICAL] **W33 — wysokość szuflady w szafce kuchennej wraca do liczby
    zestawu.**
    — **TURA-18 / DONE (F2)**: `projectStore.setDrawerHeight` rozgałęział się po
    kształcie referencji zamiast po ZESTAWIE, więc kuchenna szuflada (która ma
    wiersz elementu od postawienia) szła ścieżką szafy i zapisywała `height_mm`
    tam, gdzie silnik budr nie patrzy. Przy okazji: `newUnit` budował wiersze z
    4:3:2 zamiast z wariantu zestawu, a `setBudrDrawerHeight` startował od
    odpowiedzi silnika i zamrażał cały stos. Prawy panel dostał to samo pole i
    „Reset to the kit", co edytor.
98. [MEDIUM] **W22 — zobaczyć wnętrze zabudowy bez zdejmowania frontów.**
    — **TURA-18 / DONE (F4)**: „Hide fronts" obok X-ray i Outlines. Soczewka:
    BOM, CNC, lista rozkroju i parametry nietknięte. Stan w `uiStore`, celowo
    niezapamiętywany między sesjami — szafka bez frontów wygląda dokładnie jak
    szafka, której fronty USUNIĘTO, i to jest jedyna rzecz, z którą nie wolno
    jej pomylić.
99. [HIGH] **W34/W35 — poprawki szafki pod piekarnik z recenzji właściciela.**
    — **TURA-18 / DONE (F5)**: gniazda w bokach tylko tam, gdzie są plecy; blat
    na dwóch listwach zamiast płyty TOP, z przednią LEŻĄCĄ PŁASKO; front biorący
    szczelinę pod licem urządzenia (169 przy 770); skrzynka zmieszczona w otworze
    pod półką. Bez otworu wentylacyjnego — decyzja, nie przeoczenie (BLOCKERS
    #79). Delta 3 tury.
100. [HIGH] **Prowadnice MOVENTO na ekranie.**
    — **TURA-18 / DONE (F6)**: `GLTFLoader` z paczki three (zero nowych
    zależności), jedno dekodowanie na plik, klon na wiersz, pozycje z LISP-a,
    NL z głębokości, wariant T/S jako SPRZĘT (projekt → szafka → szuflada),
    parametryczny drążek synchronizacji z progami katalogowymi Bluma, i łagodna
    degradacja do rysowanego profilu, kiedy bucket jest nieosiągalny.
    Manifest z bucketa JEST katalogiem do czasu `cc_hardware` (BLOCKERS #78).

### Nowe pozycje, otwarte

101. [MEDIUM] **Wariant prowadnicy nie ma jeszcze poziomu SZAFKI w interfejsie.**
    Hierarchia jest pełna w silniku i w store (`params.runner_variant` między
    projektem a szufladą — `engine/runners.js` `resolveRunnerVariant` czyta ją i
    test ją przypina), ale kontrolki „ta szafka" nie ma nigdzie: ustawia się
    projekt albo pojedynczą szufladę. Dokładnie ten sam kształt, co pole koloru
    szafki z tury 13, więc to jedna kontrolka, nie nowa warstwa.
102. [MEDIUM] **Drążek synchronizacji nie ma numeru katalogowego.** Próg,
    rodzaj i długość są policzone i trafiają do BOM-u; sam drążek i jego adaptery
    nie mają artykułu, bo manifest ich nie niesie. BLOCKERS #78.
103. [LOW] **Modele prowadnic nie były jeszcze widziane z prawdziwego bucketa.**
    Ta sesja pracuje w trybie mock. Loader, walidacja długości i przesunięcie
    środka (`modelOrigin`) są wdrożone i przetestowane na sztucznym manifeście;
    pierwszy montaż na żywym buckecie poprawia trzy liczby profilu i nic więcej.
    BLOCKERS #77.
104. [LOW] **Redukcja pod prowadnicę zakłada 18 mm dno.** Rowek ma `G + 1`
    wysokości, gdzie `G` to płyta KORPUSU, a nie własna grubość boku skrzynki
    (`boxSideThickness`). Przy domyślnych obie są 18, więc dziś to jest ta sama
    liczba — kit BUDR liczy tak od tury 3 i szafa liczy teraz tak samo, żeby oba
    tnąć identycznie. Warsztat na innym dnie niż korpus zobaczy to pierwszy.
105. [LOW] **`scripts/e2e-turn17.mjs` nie zna zmian tury 18.** To samo, co
    pozycje 66, 71, 77, 85, 90 i 95. `e2e-turn18.mjs` jest następcą.
106. [LOW] **Edytor szafki nie rysuje okuć.** „Hide fronts" i prowadnice żyją w
    widoku POKOJU (`3d/UnitView.jsx`); okno edytora ma własną scenę
    (`ExplodedCabinet`) i nie dostaje ani jednego, ani drugiego. Nie jest to
    regresja — nigdy ich tam nie było — ale okno edytora jest miejscem, w którym
    ogląda się jedną szafkę z bliska, więc to jest naturalne następne pytanie.

## TURA 19 — KATALOG OKUĆ — ✅ WYKONANA (10.08.2026)

107. [HIGH] **Zawiasy stają się okuciem projektu, z wyjątkami per drzwi (W36).**
    — **TURA-19 / DONE (F1)**: `reference/hardware/` ma status KATALOGU
    WZORCOWEGO, czytanego przez `lib/hardwareCatalogue.js` i wpychanego do
    silnika (`engine/hinges.js`) — silnik nigdy nie sięga do sieci. KĄT nie jest
    wyborem: ≤ 25 mm → 110°, ≤ 32 → 95°, drzwi szafy z szufladą za nimi → 155°,
    reguła CZYTANA z `cliptop-hinges.json`, nie przepisana. Wybór to system,
    wykończenie (nikiel / onyks) i płytka. Podwójne kliknięcie zawiasu w 3D
    otwiera modal: przesuwanie góra/dół przez setter y tury 17 i „Assign other
    hinge" dla TYCH drzwi. BOM dzieli się po kącie i wykończeniu, LICZBA się nie
    rusza. **Zero delt CNC.**
108. [HIGH] **Modale przestają zasłaniać obiekt, który edytują (W37).**
    — **TURA-19 / DONE (F3)**: `placeAnchoredModal` — w górę i w prawo od
    obiektu o `ui.modal.anchorOffset` plus własna wysokość, przyklejone do
    widoku, zmieniające rękę zamiast wracać na obiekt. JEDNA POWŁOKA, wszystkie
    modale dziedziczą.
109. [HIGH] **Podwójne kliknięcie części na arkuszu CNC prowadzi do drzewa.**
    — **TURA-19 / DONE (F4)**: zgubiony werdykt tury 17. Gałąź się otwiera,
    wiersz przewija i podświetla, nagłówek grupy zapala. Czysta nawigacja —
    `treePathOfPanel` jest funkcją czystą, więc test napędza to tak samo jak
    wskaźnik.
110. [HIGH] **Silnik doboru podnośnika, bez kitu.**
    — **TURA-19 / DONE (F5)**: waga płyty (`kg_m2` na rekordzie magazynowym,
    podkład `profile.board.kgM2`), waga frontu, power factor z zakresami
    CZYTANYMI z `aventos.json`, nakładka → mniejsza jednostka, limity HK, i
    przypisanie klienta, które jest zawsze montowane i ostrzegane ze
    wskazaniem — „silnik proponuje, klient assign, ale guidance i sprzeciw".
    22 testy. Bez kitu i bez UI poza wagą w stopce detalu elementu.

### Nowe pozycje, otwarte

111. [MEDIUM] **`movento.json` nie jest jeszcze źródłem dla potoku prowadnic.**
    Tura 18 zbudowała wszystko wokół `manifest.json` z bucketa; katalog wzorcowy
    zapisuje tę samą drabinkę inaczej — system raz u góry i **bez informacji o
    stronie**, więc `runnerPairSpec` dałby ten sam artykuł na L i na R i uznał
    parę za kompletną. Adaptacja jest już napisana i przetestowana
    (`toRunnerManifest`), nikt jej nie woła. Tura 20 przyjmuje to świadomie albo
    zostawia — ale nie po cichu.
112. [MEDIUM] **Kity podnośników HK / HF.** Matematyka stoi i ma testy (poz.
    110); brakuje POZYCJI jednostki na boku szafki i wzorów wiercenia HF
    (BLOCKERS #81 — `.mpr` 20K albo PDF montażu; `aventos-hf-drilling.json` ma
    strukturę pięciu wzorów z pustymi `holes`). **Sesja wzorcowa z właścicielem
    NAJPIERW**, dopiero potem kit.
113. [MEDIUM] **Wykończenie zawiasu nie ma poziomu SZAFKI.** Dokładnie ta sama
    luka, co poz. 101 dla prowadnic: hierarchia w silniku ma projekt i DRZWI, a
    kontrolki „ta szafka" nie ma. Wyjątek ustawia się dziś per skrzydło, co dla
    szafy o sześciu drzwiach jest sześcioma kliknięciami.
114. [MEDIUM] **`kg_m2` jest tylko na liście mockowej.** Kolumna jest niesiona
    dokładnie jak grubość i czytana przez `boardKgM2`, ale prawdziwa lista
    materiałów (`cc_materials` / JoineryCore) jeszcze jej nie ma. Płyta bez
    liczby spada na tabelę profilu i MÓWI o tym w stopce — degradacja, nie
    zgadywanie.
115. [LOW] **Zawias jest wybierany bez UCHWYTU w wadze.** `aventos.json` mówi
    wprost: `pf = cabinet_height_mm * front_weight_kg (incl. handles)`. Uchwyt,
    którego klient jeszcze nie wybrał, nie jest wagą, którą ta aplikacja może
    dodać — więc pf jest liczony z samego frontu i jest to lekko za mały. Kiedy
    uchwyty dostaną własny katalog, to jeden składnik do sumy.
116. [LOW] **Modele CLIP top nie były widziane z prawdziwego bucketa.** To samo,
    co poz. 103 dla prowadnic: `modelOrigin` / `plateOrigin` to uczciwe zera,
    pierwszy montaż poprawia sześć liczb profilu i nic więcej. BLOCKERS #83.
117. [LOW] **Edytor szafki nadal nie rysuje okuć.** Poz. 106 bez zmian — modele
    zawiasów żyją w widoku POKOJU, okno edytora ma własną scenę. Zawias na
    wywierconych punktach jest dokładnie tym, co chce się obejrzeć z bliska,
    więc pytanie robi się głośniejsze.
118. [LOW] **`scripts/e2e-turn18.mjs` nie zna zmian tury 19.** To samo, co poz.
    66, 71, 77, 85, 90, 95 i 105. `e2e-turn19.mjs` jest następcą.
119. [MEDIUM] **Wkręty ⌀3 w PLECACH wychodzą poza formatkę na kitach o krótkich
    plecach.** Znalezione przy okazji tury 27 (F1), sprawdzone i potwierdzone
    jako **stan sprzed tej tury** — probe daje ten sam wynik na `8c0ece5`, więc
    nic tu nie zepsuł ten obieg. `partitionBackScrewRun` (tura 23, F6) liczy
    swój bieg w układzie SZAFKI i wypisuje go na `BACK`, a `BACK` na SINK
    (cofnięte plecy), OVEN_BASE (plecy tylko za szufladą) i FRIDGE (plecy jako
    listwy) jest znacznie mniejszy albo w innym miejscu. Wynik: dziesięć
    otworów, które na arkuszu leżą poza obrysem — najgorszy na FRIDGE, y = −1736.
    Formatka jest poprawna; punkt nie jest przeliczony do jej własnej ramy.
    Dokładnie ta sama choroba, którą F1 wyleczył dla półki, na drugim boarcie.
    Do tury 28 razem z resztą zebranych rzeczy.

120. [HIGH] **Eksport 3-D dla 5 osi — wieniec dachowy i skosy boków są FAZAMI
    przez grubość.** Tura 47 dała skosowi prawdziwą linię (łamana, nie prosta
    od końca do końca szafy), wieniec położyła NA bokach — `L = W / cos β`,
    blank `L_MAX = L + G · tg β`, lico cięte pionowo — a boki przedłużyła do
    czubka skosu z cięciem pod skosem. Wszystkie trzy rzeczy są FAZĄ PRZEZ
    GRUBOŚĆ, a płaski DXF R12 (dialekt, który VCarve u właściciela czyta) nie
    ma jak jej zapisać: plik dostaje BLANK — prostokąt `L_MAX × głębokość` dla
    wieńca, prostokąt do czubka dla boku — plus adnotację ze stopniami
    (`BEVEL 47.7 DEG BOTH ENDS - 5-AXIS`, `CUT 47.7 DEG`) na tej samej warstwie
    tekstu, na której siedzi etykieta części. Właściciel przyjął to jako
    tymczasowe, własnymi słowami: *„narazie zrob 2D ale zapisz do cabinet core
    ze to bedzie zalegle bo napewno musimy do tego wrocic, ale tez pokaz kat
    ile stopni bedzie latwiej rysowac w przyszlosci."* Zalega więc: **(a)**
    reprezentacja 3-D, którą pięcioosiowa przeczyta — bryła albo ścieżka z
    wektorem narzędzia, nie płaski obrys; **(b)** WIERCENIE POD KĄTEM z tego
    samego powodu — otwór w bocie ciętym pod skosem nie jest prostopadły do
    lica; **(c)** decyzja, czy blank zostaje na arkuszu w takim rozmiarze, czy
    pięcioosiowa dostaje własny format. Kąt jest już policzony i jest NA
    elemencie (`meta.slopeCut.angles`, `meta.bevel.deg`,
    `meta.verticalFootprint`), więc nie ma czego wyliczać od nowa — jest co
    zapisać. Właściciel: *„napewno musimy do tego wrocic."*

121. [MEDIUM] **Relief na WYPUŚCIE zamiast dog bone'a w gnieździe.** Przy
    półkach stałych promień freza zostawia w narożniku gniazda materiał, którego
    prosty wypust nie obejdzie — dziś rozwiązuje to DOG BONE: dwa kółka w
    gnieździe, poszerzające narożnik do średnicy freza. Problem jest taki, że
    gniazdo bywa na LICU, które widać, a dog bone jest wtedy dziurą w widocznej
    płaszczyźnie. Właściwe miejsce na ten sam relief to WYPUST: dwa narożniki
    ścięte ~3 × 3 dla freza ⌀6, po stronie, której i tak nie widać. Wypust
    siada wtedy CAŁĄ długością — a płytszy dog bone zostawia szczelinę i
    stawia połączenie na kleju zamiast na drewnie. To jest GEOMETRIA, więc
    zaczyna się od `reference/lisp/panel_joints.lsp` i dopiero potem idzie do
    `engine/puzzle.js`; trzeba przy tym rozstrzygnąć, co z połączeniami, które
    już mają dog bone'y (korpus, plecy) — zostają, czy przechodzą razem.
    Rozmawiane 24.08.2026 przy okazji wieńca dachowego (który dog bone'ów mieć
    NIE MOŻE — decyzja właściciela, tura 47 F3). Nie rozstrzygnięte, nie
    zaczęte.

## TURA 48 — PODŁOGA, DESKA I ETYKIETA — ✅ WYKONANA (25.08.2026)

Dziewięć funkcji, dziewięć dowiezionych. **F9 była wyznaczona jako jedyna
ofiara i nie padła.** STOP z F1 też nie zadziałał — klamra podłogi nie ruszyła
żadnego z sześciu wzorców, więc idzie bez bramki, a nie za flagą.

Bramki: `npm test` **4278 pass / 0 fail** · `npm run build` przechodzi ·
`t48-classify` względem T47 (`f586f8c`) **sześć IDENTICAL, UNNAMED 0** ·
`--infill` CLEAN · `--census` CLEAN · `--cut` 6/6 ·
`t48-paren-balance --against f586f8c` **13/13 po 0/0, ruszył się TYLKO
`KIT_LED_GROOVE.lsp`** · `e2e-turn48` **28/28**, prawdziwy pointer, 9 zdjęć.

* **F1 — podłoga jest prawem.** *„zaden element nie moze spasc ponizej podlogi
  — fizycznie to sie wyklucza."* ZMIERZONY BŁĄD, dwa objawy i jedna przyczyna:
  `addShoeBox`, `setShoeBox` i półka na buty klamrowały `pos_mm` przez
  `Math.max(0, …)`, a zero to SPÓD dna, nie podłoga skrzyni. JEDNO prawo
  (`engine/items.js floorClampedPos`, obok `centredShelfPos`), JEDNA stacja
  (`projectStore onTheFloor`, z `addItem` i `updateItem`), więc wstawienie,
  przeciągnięcie, wpisana liczba i wczytany projekt to ta sama reguła.
  Klamrowany jest NAJNIŻSZY PUNKT elementu, nie jego baza. Element, który
  prawo złapało, mówi o tym sam (`meta.floorClamped`); element już legalny
  wraca TYM SAMYM obiektem. Test: `test/turn48-f1-the-floor-is-law.test.js`.
* **F2 — górny infill to DESKA, a arkusz tnie DWIE.** Silnik daje dwa zwykłe
  prostokąty: `(bieg + 20) × (40 + 20)` i `(bieg + 20) × (80 + 20)` — szerokości
  jako ARYTMETYKA, nigdy gołe 60. +20 na DŁUGOŚCI, z JEDNEJ nazwanej strony
  (`meta.lengthOversize`), **bez adnotacji** (*„stolarze wiedza"*). Narożne L
  znika z geometrii: `chamferedRectGeometry` już nie dotyka INFILL-T, `mitre.L`
  i flaga `'long'` umierają, a `mitre_45` zostaje tylko tam, gdzie spotykają
  się dwa BIEGI. Scena rysuje JEDNĄ deskę, jak plinth (`meta.scene:
  'sheet-only'` na drugiej). **Infille pionowe — ani jednej linii.**
  Testy strażnicze L zaktualizowane z notą OVERRULED i cytatem.
* **F3 — plinth domyślnie ON.** W `newUnit` (ścieżka tworzenia w store), NIE w
  `defaultParamsFor()` — wzorce czytają te defaulty i plinth tam to cała
  dodatkowa CZĘŚĆ w każdym z sześciu. Które typy — pyta `takesPlinth`, własna
  bramka silnika, nigdy lista.
* **F4 — LISP pierwszy.** `ledGrooveEndExtra` rodzi się w
  `KIT_LED_GROOVE.lsp` (sekcja A2) z cytatem i POWODEM: frez jest okrągły,
  kieszeń docięta w punkt kończy się dwoma promieniami, a profil jest
  prostokątny — *„nikt nie chce uzywac dlutka na rogach."* JS czyta tę liczbę
  z prawa: test parsuje kit z dysku.
* **F5 — rowek dociera na arkusz** (zaległość nazwana w T45, spłacona).
  `projectStore.unitCncResult` — JEDNA odpowiedź, o którą pyta podgląd CNC,
  drzewko, sekcje materiałowe i DXF arkusza. `LED_GROOVE` dostał kolor ekranu,
  więc legenda nazywa to, co arkusz rysuje. `grooved()` tnie RAZ.
* **F6 — jeden przycisk.** *„mamy przycisk dodania LED, to i ten sam przycisk
  usuwa LED — proste."* Ten sam przycisk, na wszystkich sześciu narzędziach,
  przez `removeLightingItem`, który istnieje od T33.
* **F7 — `top_under` ma swój rysunek**, a światło świeci w dół. Wariant nie
  miał gałęzi w `LightArt` i spadał na rysunek SPOTÓW, więc wywołanie prosiło
  o `kind="top"` — obrazek pokazywał pasek NA wieńcu świecący DO GÓRY.
  Emisja 3-D **była już poprawna** (wpadała w `else` i świeciła w dół) — to
  jest weryfikacja, o którą F7 prosi, i nic w niej nie trzeba było naprawiać.
  Prawo jest teraz zapisane, a nie domyślne: `EMITS_UP` / `EMITS_DOWN`.
* **F8 — wymiary trzymają rozmiar na ekranie.** *„zeby zawsze wymiary byly
  takie same niezaleznie jak bardzo sie odsuniemy od mebla."* `useScreenScale`
  w `3d/DimLabel.jsx` i nigdzie indziej; obie projekcje (perspektywa i orto);
  głębokość WIDOKOWA, nie odległość do kamery; obie macierze odświeżane w
  klatce. Łańcuchy wymiarowe IMPORTUJĄ prawo zamiast je kopiować, a
  catchment podwójnego kliknięcia idzie za nim. Żaden ustawiony przez
  właściciela stosunek się nie ruszył. Zmierzone: **25 etykiet, 8,93 m i
  3,13 m, najgorsza różnica 0,00 px.**
* **F9 — etykieta CNC nigdy nie utnie liczby.** `TOP~` to skrót, `260.9x5~` to
  ROZMIAR z uciętą cyfrą. Drabina T16 dostaje nowy środkowy szczebel: łam na
  więcej linii → **wyjdź POZA obrys** z odnośnikiem → schowaj. Tylko podgląd;
  plik zostaje przy drabinie T16, bo DXF nie ma gdzie położyć odnośnika,
  którego maszyna też by nie wycięła. Prawdziwy przypadek: PANTRY tnie dwa
  paski FILLER 30 × 611 i oba czytały `30x6~`.

### DOPISANE W TURZE 48

122. [ZAMKNIĘTE W TURZE 50 — F11] **Narożnik infilla jest teraz cięty według dwóch różnych reguł.**
    T48-F2 zabrał górnemu infillowi jego połowę narożnika z T15 (zwykła deska
    nie może mieć długiego rogu), a infill PIONOWY zachował swój trójkąt, bo
    *„infill pionowy nie ruszamy"* zostało wzięte dosłownie. Na rzadkim biegu,
    który zakręca przy filerze do sufitu, pionowy jest ścięty pod 45° na
    maszynie, a górna deska jest docinana na miejscu z tych 20 mm. Właściciel
    sam nazwał ten narożnik rzadkim (*„ale to rzadko"*), więc to nie jest błąd
    — to niedomknięta decyzja. Jeśli filer ma zostać ścięty na kwadrat razem z
    deską, to jedna gałąź w bloku infilla bocznego w `engine/cabinet.js` i
    jeden test. Do rozstrzygnięcia przez właściciela.
    → ROZSTRZYGNIĘTE. CLAUDE.md T50-F11: *„Make the pair agree: where the top
    is a plain board, the side that meets it is cut square too."*  Filer
    wychodzi z maszyny prostokątny, `meta.corner` zostaje jako ZAPIS (dokładnie
    tak jak na górnej desce), `mitre_45` i `mitre.deg` znikają — nie ma już
    złącza, które by je opisywały — a sam narożnik docina się na miejscu z tych
    samych 20 mm, z którymi obie deski wyjeżdżają dłuższe. `sideTopMitreDeg`
    zostaje w `engine/cabinet.js`, poprawne i nieużywane, na dzień w którym
    górna deska wróci do długiego rogu.
123. [LOW] **Etykieta, która wyszła poza obrys, może wejść na sąsiada.**
    Konsekwencja F9 na ciasno ułożonym arkuszu: odnośnik kładzie słowa nad
    paskiem obok (`verify/t48/walk-8-label-outside.png` to pokazuje). To jest
    świadomy wybór z tej reguły — etykietę w złym miejscu oko rozstrzyga w
    sekundę, a rozmiaru z brakującą cyfrą nie rozstrzyga wcale. Gdyby to miało
    przeszkadzać, właściwym rozwiązaniem jest ROZSUNIĘCIE układu
    (`cnc.layoutGap`) dla części, których etykieta nie mieści się w obrysie,
    a nie powrót do ucinania.

### DOPISANE W TURZE 49

124. [LOW] **Modal ściany ma DWA przyciski Back.** Powłoka rysuje `← Back` obok
    tytułu (T23 F1.2 — okno zagnieżdżone), a stopka okna elewacji ma swój
    własny `Back` (T44 F1). Oba wołają tę samą funkcję i idą w to samo miejsce,
    więc to NIE jest pomyłka ze zrzutu właściciela (tam dwa Backi szły w dwa
    różne miejsca) — ale to nadal dwa przyciski z tym samym słowem. Usunięcie
    jednego z nich jest KASOWANIEM, a tura 49 ma tylko dwie nazwane licencje
    (scalenie carcasów i scalenie frontów), więc zostawione właścicielowi do
    rozstrzygnięcia. Widać to na `verify/t49/f8-flat-one-slope.png`. Jeśli ma
    zniknąć stopkowy — to jedna linia w `components/WallElevationModal.jsx`.
125. [LOW] **Na kroku 5 w stopce kreatora zostaje samotny `Cancel`.** F3 mówi
    *„dokładnie jeden rząd nawigacji"* i tak jest: `Back`/`Next` rysuje tylko
    sekwencja. `Cancel` nie jest nawigacją — porzuca całą robotę, nie ma
    bliźniaka w rzędzie sekwencji i żadna ręka szukająca „Back" nie trafi w
    słowo „Cancel". Zostawiony świadomie, bo skasowanie go byłoby usunięciem
    jedynej jawnej drogi wyjścia z kreatora (zostałby tylko × i Escape). Do
    rozstrzygnięcia przez właściciela — widać na każdej klatce kroku 5.
126. [MEDIUM] **Front „Veneer" jest zapisywany jako DEKOR, nie jako fornir.**
    T20 F12.3 zdecydowało, że fornir na FRONCIE wybiera się z katalogu 85
    dekorów (pożycza skan EGGER-a, bo własnego zdjęcia jeszcze nie ma), więc
    forniowane drzwi mają `finish_id: 'decor:H1180_37'` — identycznie jak
    laminat w tym samym dekorze. T49-F9 obchodzi to czytając `source` typu
    frontu (`lib/veneerSheen.js`), i to działa — ale to OBEJŚCIE, nie model.
    Wszystko, co pyta wyłącznie o `finish.kind` (BOM, etykiety, rysunki), nadal
    widzi tam laminat. Właściwe rozwiązanie: fornir na froncie dostaje własny
    `kind: 'veneer'` z pożyczonym obrazkiem — to zmiana w `src/engine/**`, więc
    nie w tej turze (żelazna zasada 2). Do zaplanowania.

### DOPISANE W TURZE 50

127. [LOW] **Wymiary jednej szafki nie mają już żadnych drzwi.** T50-F10 na
    polecenie właściciela (*„w prawym przycisku myszy menu nie powinno być Add
    doors oraz Show dimensions — dimension już mamy na górze"*) usunęło wpis
    `Show all dimensions` z menu kontekstowego. Sam MECHANIZM nie został
    skasowany (żelazna zasada 4): `uiStore.unitDimensions`,
    `toggleUnitDimensions` i `clearUnitDimensions` są nietknięte, a
    `3d/Scene.jsx` nadal z nich rysuje — ale menu było ich JEDYNYMI drzwiami,
    więc dziś nikt nie może włączyć łańcucha wymiarów dla POJEDYNCZEJ szafki.
    To, co zostało, to przełącznik na górnej belce, który rysuje ten sam
    łańcuch (`engine/dimensions.js dimensionCarriers`) nad KAŻDĄ szafką — i to
    jest dokładnie odpowiedź właściciela. Zostawione tak celowo. Jeśli
    kiedykolwiek ma wrócić per-szafka, to jeden wpis z `group: 'dimensions'` i
    grupa wraca sama (test T14-F6.3 to sprawdza).
128. [LOW] **Skrócone drzwi pod skosem w szafie dostają drabinę `tall`, która
    nie skaluje się w dół.** T50-F7 przelicza zawiasy po skróceniu leafa *„by
    the same rule that spaces them on a full door"* — czyli `hingeRows` z
    regułą TYPU. Dla WARDROBE to `tall`, a `tall` przy 700 mm nadal daje PIĘĆ
    zawiasów w rozstawie 124 mm. To jest ten sam kształt błędu, który T38-F1b
    naprawił dla top boxa jednym słowem (`hingeRule: 'low'` — *„nobody hangs a
    500 mm door on five hinges"*). Nie zmieniamy tego tutaj, bo CLAUDE.md F7
    mówi wprost „ta sama reguła", a zmiana reguły to decyzja właściciela.
    Propozycja: leaf ucięty poniżej `hinges.rules.low.threeHingeMaxHeight`
    liczy się drabiną `low`, tak jak każde inne drzwi tej wysokości w tej
    aplikacji. Do rozstrzygnięcia przez właściciela.
129. [LOW] **`+ Box` wrócił do kreatora razem z F12.** T49-F2 ukrył cały rząd
    (Rectangle / L-shape / + Box) w kreatorze; T50-F12 kazał zrównać oba
    wejścia i wysłać wersję kreatora — czyli usunąć gotowe kształty. `+ Box`
    nigdy nie był gotowym kształtem (to komin, słup, obudowana rura), więc
    rysuje się teraz w OBU drzwiach. Jeśli właściciel chciał, żeby w kreatorze
    nie było też pudełek, to jest jedna linia w `components/RoomModal.jsx`.
130. [LOW] **Słupy showroomu zostały ściemnione z DWÓCH stron naraz.** T50-F14
    wykonuje polecenie właściciela z 25.08 (*„za jasno świecą, ściemnij o
    połowę"*): `appearance.studio.pillars.intensity` 22 → 11, plus nowy
    `appearance.studio.baseGain: 0.75` na całym rigu. Niezależnie od tego, tej
    samej nocy właściciel wypchnął na `main` własną poprawkę: zamiast
    LUSTRZANEJ PARY jest teraz JEDEN słup (`count: 1`, `side: 'right'`,
    `spread: 1.7`, `widthMm: 420`) — co samo w sobie zabiera połowę światła.
    Po scaleniu trzy redukcje się mnożą: jedna lampa zamiast dwóch, przy 11
    zamiast 22, razy 0.75. To jest znacznie ciemniej niż F14 zakładało, gdy
    pisało „o ćwierć". Zostawione na 11, bo CLAUDE.md F14 podaje tę liczbę
    wprost — ale jeśli pokój ma wyglądać za ciemno, podnosi się WŁAŚNIE
    `pillars.intensity`, samodzielnie, i po to `baseGain` jest trzymany poza
    lampami. Do rozstrzygnięcia przez właściciela, na oko.
