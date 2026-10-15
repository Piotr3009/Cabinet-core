# Tura wieczorna 15.10.2026 (chat-fix): wyspa w oknie planu, STEP kryje RETURN, wnęka jak komin (przedłużenie karkasu), wnęka z pasem i widok od czoła

Paczka: `cabinetcore-wieczor-1510-2146.zip` (45 plików: 23 zmienione + 14 nowych w kodzie i testach + 8 w `verify/chatfix-1510-wieczor/` z tym raportem, plus 4 mockupy w `verify/chatfix-1510-dzien/`). Zawiera WSZYSTKO, co różni się od Twojego pusha `1a6e03b` (ta paczka zakłada, że dzienna jest już w repo, bo jest w `origin/main`).

Testy: pełny zestaw 6712/6712 zielone (6687 dzienne + 25 nowych: 21 w `test/recess-extension-1510.test.js`, 2 w `island-plan-1410`, 1 w `recess-1510`, plus 1 zmieniony przez nową warstwę w `dxf.test.js`; 5 starych testów poprawionych z Twoimi słowami jako licencją, żaden nie wyciszony). Klasyfikator T78 (`node scripts/t78-classify.mjs`): GREEN, dwa nowe fragmenty `f27-owner-1510c.mjs` (wyspa, STEP) i `f28-owner-1510d.mjs` (wnęka, brama `extension`, dwa nowe goldeny), golden `golden-notch.json` przepięty z powodem, LISP zbalansowany (nowy `KIT_RECESS.lsp`). Build Vite OK. Walk w prawdziwym Chromium (`node scripts/chatfix-1510-wieczor-walk.mjs` na buildzie): 15/15 wierszy OK, klatki w `verify/chatfix-1510-wieczor/`.

Twoje odpowiedzi z wieczora, wszystkie wpisane: 1 tak (STEP kryje koniec RETURN), 2 tak (front trzyma linię, szafka rośnie w głąb wnęki), 3 głębszy karkas (szafka w całości we wnęce), 4 dowolny pas (dół i góra wnęki), 5 półki głębsze, i BTW: komin i wnęka widoczne w widoku ściany od czoła.

## 1. Okno planu wyspy: liczby do skasowania, głębokość szafki, obrót, kolor frontu

Twoje słowa: *"liczby przy ustawianiu island nie mogę wykasować istniejących i nie mogę zmienić, edycja szafki daj szerokość na planie ale też głębokość, inny kolor krawędzi żeby było wiadomo gdzie jest front, daj możliwość przekręcania szafkami"*.

Dlaczego nie dało się kasować: pole pisało do store przy każdym znaku, więc po skasowaniu "1800" zostawało puste, store dostawał 0, odrzucał i wpisywał stare z powrotem. Teraz (`3d/IslandPlan.jsx`, pole `MmField`): piszesz co chcesz, liczba idzie do planu dopiero na Enter albo po kliknięciu obok (blur); Escape cofa; wartość poniżej minimum (50 dla wyspy, 100 dla szafki) wraca do starej. Dotyczy długości i głębokości wyspy oraz W i D każdej szafki na planie.

- D (głębokość) przy każdej szafce na liście: domyślnie głębokość kitu (558), wpisana liczba idzie do `cab.depth` i na plan (prostokąt rysuje się głębszy, rdzeń się liczy z nią).
- Obrót: przycisk ↻ przy szafce przenosi ją na następną ścianę wyspy zgodnie z ruchem wskazówek (A, E2, B, E1, A); `engine/islandPlan.js turnCabinet`, `NEXT_FACE_CLOCKWISE`.
- Front: na planie krawędź frontu każdej szafki jest grubą złotą linią (#E0B35A); podpowiedź pod polami mówi to samo.

Walk: wpisane 2100 w długość (A1), 400 w głębokość szafki (A2), obrót A do E2 (A3), dwie złote linie (A4). Klatka `a-island-plan-fields.png`.

## 2. Wycięcie narożnika: STEP kryje koniec RETURN (Twoje "1 tak" do mockupu)

Twoje słowa: *"jak otworzysz szafkę to teraz przy wycięciu narożników edge od bocznej płyty jest widoczny od frontu, a nie lepiej by było mieć widoczność z boku a od przodu całą płytę?"* Mockup `verify/chatfix-1510-dzien/mockup-naroznik-krawedz.png`, Twoja odpowiedź "1 tak".

LISP najpierw: `KIT_NOTCH.lsp` sekcja 2 (RETURN i STEP), D1 (DECIDED by the owner 15.10.2026), `notch-box-places`, `notch-step` (nw + g), `notch-return` (nd minus g przy tylnym narożniku), wkręty (`notch-step-screws` ma kolumnę w czoło RETURN, `notch-return-screws` już nie ma kolumny w STEP, `notch-lid-screws` rząd nad RETURN od y = g), blok NUMBERS. Silnik `engine/notch.js` jest lustrem.

Na BUD 600 z wycięciem BL 200x200: STEP 218 x 770 (było 200), RETURN 182 x 770 (było 200), reszta bez zmian (wycięcie w wieńcu, dnie i półce 200x200, dog bone, wiercenia). Od frontu z otwartymi drzwiami widać całą płytę STEP; jedyna krawędź w boksie to krawędź STEP widziana z boku, w środku szafki. Golden `golden-notch.json` przepięty (tylko te dwie płyty, z powodem w `f27`). Przy przednim narożniku bez zmian (RETURN nd, bez STEP). Walk B1: STEP box 218 szeroki, RETURN box 182 głęboki. Klatka `b-notch-step.png`.

## 3. Wnęka jak komin: front trzyma linię, karkas rośnie w głąb (Twoje "2 tak, 3 głębszy karkas, 4 dowolny, 5 głębsze")

Nocne prawo (szafka cofała się do wnęki i robiła schodek w linii frontów) jest ZASTĄPIONE. Mockup `verify/chatfix-1510-dzien/mockup-wneka-jak-komin.png`.

LISP najpierw: NOWY plik `reference/lisp/KIT_RECESS.lsp` (prawo w sekcjach 1 do 4, decyzje D1 do D14, procedury B do E, blok NUMBERS z dwoma złotymi przypadkami, komenda RECESS_FULL). Silnik: NOWY `src/engine/extension.js`, lustro procedura po procedurze; `engine/cabinet.js` pyta o werdykt rodzica, tnie przed wierceniem i poprawia po nim (w miejscu wycięcia); test `recess-extension-1510.test.js` trzyma silnik przy liczbach LISP-a płyta po płycie.

Dwie połowy prawa (store, `projectStore.js`):

| sytuacja | co się dzieje |
|---|---|
| szafka W CAŁOŚCI we wnęce (span z panelami końcowymi w zasięgu wnęki i karkas w pasie wnęki) | GŁĘBSZY KARKAS: `depth = depth_full + głębokość wnęki`, `recess_mm` = głębokość, szafka stoi przy tylnej ścianie wnęki z tym samym luzem co przy ścianie, FRONT DOKŁADNIE TAM GDZIE BYŁ (BUD 558 w 300: karkas 858, boki 840, wieniec 840, półki 820) |
| szafka CZĘŚCIOWO we wnęce (szerokością albo wysokością, pas) | karkas zostaje na linii ściany i dostaje PRZEDŁUŻENIE za plecami nad pasem, w którym stoi: `params.extension {x0, x1, z0, z1, d}` wyliczane w `paramsForEngine` (jak wycięcie przy kominie), nigdy nie zapisywane; luz 10 od ościeży, nadproża i progu wnęki (ten sam co przy kominie); pas węższy albo niższy w środku niż 100 (to samo 100 co przy kominie) = bez przedłużenia, szafka stoi jak stała |
| szafka wyjeżdża z wnęki | liczby wracają (`depth` z `depth_full`, `recess_mm` znika) |

Co rośnie i co dochodzi (sekcja 2 LISP-a), dla przedłużenia x0..x1 na z0..z1, o `d` głębiej:

- bok, do którego sięga pas (x0 = 0: BUL, x1 = szerokość: BUR): garb na tylnej krawędzi nad pasem; przy pełnej wysokości po prostu głębszy bok (BUR 690 x 770 w przypadku A), gniazda wieńca na dłuższej krawędzi przeplanowane, zęby pleców na prostych odcinkach nad i pod garbem (żadnych w garbie, bo tam spotyka EXT-BACK), dog bone w wklęsłych narożnikach;
- TOP (gdy pas sięga góry) i BOTTOM (gdy sięga podłogi): garb na tylnej krawędzi między wewnętrznymi licami przedłużenia, dog bone, zęby pleców na prostych odcinkach (odcinek krótszy niż 96 bez zęba, na wkręty);
- PLECY tracą OKNO: w środku = kieszeń na wylot na nowej warstwie `RECESS_WINDOW` (ACI 52, frez zaokrągla narożniki, bez dog bone); dotyka jednej krawędzi = wygryzienie z dwoma dog bone; dwóch sąsiednich = narożnik (prawo wycięcia); dwóch przeciwległych = plecy na DWA kawałki (BACK i BACK-2); trzech = plecy krótsze. Każdy kawałek trzyma gniazda rodzica na krawędziach, które ma, przeplanowane; wkręty pleców w czoła RETURN i w przednie krawędzie FLOOR i LID są WIERCONE (G/2 od krawędzi okna, rozstaw drawBACK);
- dochodzą płyty na wkręty (jak boks wycięcia, outline only, fixing manual, wkręty podane w `meta.extension.screws`): RETURN-L / RETURN-R (ed minus g) x wysokość pasa, gdy pas nie sięga boku; FLOOR i LID (szerokość pasa) x (ed minus g), gdy pas nie sięga podłogi / góry; EXT-BACK (szerokość pasa) x (wysokość pasa) zawsze. Plecy kryją czoła RETURN i przednie krawędzie FLOOR / LID, FLOOR i LID kryją końce RETURN i garbów, EXT-BACK kryje wszystko od tyłu: od frontu przez okno widać tylko ciętą krawędź pleców i całe płaszczyzny (Twoja zasada z wycięcia, D6);
- PÓŁKI w pasie rosną tak jak wieniec (Twoje "głębsze"), 2 mm od RETURN jak od boku; półka nad lub pod pasem zostaje;
- tylna kolumna kołków półek rośniętego boku przesuwa się o `d` nad pasem (jak przy wycięciu, D12).

Liczby przypadku A (BUD 600x558x770, wnęka od x 300 w prawo, 150 głęboka, podłoga do sufitu, luz 10): BUR 690 x 770, TOP i BOTTOM 564 x 690 z garbem 254 x 150 (dog bone przy (310, 540)), BACK 328 x 770, SHELF-1 560 x 670, RETURN-L 132 x 770, EXT-BACK 290 x 770; gniazda BUR 95 / 595, zęby wieńca w plecy 113 / 233, wkręty pleców w czoło RETURN x 319 przy 50 / 385 / 720. Przypadek B (pas w środku: x 110..490, z 210..590): plecy całe z oknem 344 x 344 i 12 wkrętami dookoła, RETURN-L, RETURN-R 132 x 344, FLOOR i LID 380 x 132, EXT-BACK 380 x 380, półka 560 x 670 z garbem 340 i dwoma dog bone. Oba są goldenami (`golden-recess.json`, `golden-recess-band.json`).

Odmowy w słowach (ostrzeżenie `EXTENSION_REFUSED`, rodzic jest tym, co się tnie): kit nie będący rodzicem wycięcia (szuflady, zlew, lodówka, L, słupy), szafka z wycięciem (komin wygrywa, D13), szafka wisząca, której wycięcie na zawieszkę wpadłoby w okno i nie ma gdzie się przesunąć (zwykle zawieszka przesuwa się obok okna, jak przy wycięciu). Odmowy geometryczne z `paramsForEngine` są ciche (szafka po prostu stoi jak stała).

3D: BUL/BUR z garbem przez `cnc.notch` (plus drugi narożnik `also` przy pasie w środku wysokości), TOP / BOTTOM / półka przez `meta.planOutline` (droga wieńca L), plecy z oknem przez kieszeń na wylot, plecy z wygryzieniem przez nowe `cnc.bite` (`panelSolid.js`). Pokój (`Room.jsx`): otwór w ścianie, tył i ościeża wnęki obejmują pas, nadproże i próg tam, gdzie pas kończy się przed sufitem lub podłogą. Strażnik DXF (`cnc/edgeGuard.js isInterior`) pyta wielokąt, nie tylko obrys prostokąta, bo dog bone zębów pleców na odcinku obok garba stoją w powietrzu wewnątrz obrysu i nie są wycinkami.

Walk: C1 BUD w całości we wnęce depth 858, front 568 jak przed wejściem; C2 scena: plecy w głębi wnęki, drzwi w linii frontów; C3 ta sama szafka w połowie: depth 558, przedłużenie RETURN-R i EXT-BACK, bez ostrzeżeń; C4 scena: EXT-BACK przy tylnej ścianie wnęki, BUL urośnięty; C5 słup w pasie 0..1000: LID na 890 (1000 minus 100 bazy minus 10 luzu); C6 LID w scenie na wysokości około 1000. Klatki `c1-recess-deeper.png`, `c2-recess-extension.png`, `c3-recess-band-tall.png`. Check pokazuje tylko żółte "Not fully machined, the joiner's to finish: RECESS-RETURN, RECESS-BACK" (jak przy boksie wycięcia).

## 4. Wnęka z pasem (dół i góra) i widok ściany od czoła (Twoje "4 dowolny" i BTW)

- Rekord wnęki (`lib/wallElements.js migratePlanElement`) ma `bottom_mm` i `top_mm` (null = podłoga, null = sufit, czyli każda wnęka narysowana do dziś). `recessBand(el, wysokość ściany)` daje pas; komin jest zawsze od podłogi do sufitu.
- Okno elementu wnęki (dwuklik w widoku z góry albo od czoła) ma pola Bottom i Top (mm od podłogi; 0 i wysokość ściany = podłoga i sufit). Zdanie pod polami mówi nowe prawo (głębsza w całości, przedłużenie w części).
- Widok od czoła (`WallElevationModal.jsx`, PRO i kopia retail): komin rysowany na całej wysokości, wnęka jako jej pas (kreskowana), podpis z pasem; przeciąganie w bok zmienia x, dwuklik otwiera okno; lista "On this wall" w widoku od czoła pokazuje też wnęki i kominy. PRO: licencja w `turn59-f1` EXEMPT z Twoimi słowami, nowy hash; testy `turn62` (kopia 1 do 1) i `turn69-f9` poprawione z Twoimi słowami (plik był "nie zmieniaj" od T67, dziś poprosiłeś o zmianę).

Walk D1: od czoła narysowane dwie wnęki (2500 i 1000 wysokości) i komin; D2 dwuklik pasa: Bottom 0, Top 1000; D3 wpisane 300 i 1200: zapisane; D4 rysunek ma 900 wysokości. Klatki `d1-elevation-front.png`, `d2-elevation-recess-band.png`.

## 5. Co jeszcze zmienione w kodzie (żeby nic nie było ciche)

- `engine/notch.js`: pięć pomocników wyeksportowanych dla przedłużenia (`outlineWithTabs`, `tabBones`, `dogboneHole`, `polygonArea`, `shiftGeom`), `cutNotchCorner` z drugim narożnikiem (`also`); każda odpowiedź wycięcia bez zmian (golden wycięcia różni się tylko STEP/RETURN z punktu 2).
- `engine/cnc/layers.js`, `engine/machining.js`, `verify/t26/sheet-vs-scene.md`, `test/dxf.test.js`: warstwa `RECESS_WINDOW` (ACI 52, kieszeń, cięta na wylot).
- `3d/IslandPlan.jsx`: linia frontu jako `path` (test R7 zabrania `data-*` na `line` w `src/3d`).
- `settleObstacles` zostawia szafkę we wnęce w spokoju (nigdy nie jest jednocześnie przy kominie).

## 6. Czego NIE zrobiłem (uczciwie)

- Otwory zawieszek w boku szafki wiszącej, która rośnie do wnęki, zostają tam, gdzie wywiercił je rodzic (od frontu bez zmian); wspornik jest przy nowym narożniku pleców, więc nie przy boku. Do decyzji, jeśli wiszące we wnękach są realne.
- Zasada 100 mm dla przedłużenia i luz 10 są moje (D4, D5 w LISP, "proposed"): jedna linia do veta.
- Szuflady (BUDR), zlew, lodówka, L i słupy z mechanizmem nie dostają przedłużenia (odmowa w słowach), ale w całości we wnęce robią się głębsze (prawo store jest dla każdego kitu).
- Z poprzednich tur nadal: wycięcie od góry / okienne (box w połowie wysokości), podgląd CncView bez odbicia wycięcia, RightPanel bez trybu auto wycięcia, bryły zawiasów na drzwiach L, bojler i stałe elementy w planowaniu pokoju (TODO w Petrosie), stare walki (t75-walk, t78-f01-probe) liczą plusy bez hover.
- Petros: tej tury nie zapisałem (pytanie 1).

## Pytania

1. Czy zapisać tę turę do Petrosa (jeden wpis: wyspa, STEP kryje RETURN, wnęka jak komin z pasem, widok od czoła, decyzje D1 do D14 z KIT_RECESS.lsp, lista "nie zrobione")?
2. Przedłużenie: minimum 100 mm w środku (szerokość i wysokość pasa) i luz 10 mm od ościeży i nadproża, jak przy kominie. Zostawić te dwie liczby?
3. Szafka wisząca rosnąca do wnęki: wspornik przesuwa się obok okna w plecach, ale otwory w boku zostają od frontu. Czy wiszące we wnękach w ogóle się zdarzają, czy to zostawić?
4. Szuflady i inne kity bez przedłużenia dostają ostrzeżenie w Check ("an extension grows from a base unit..."). Zostawić ostrzeżenie, czy ma być cicho (szafka po prostu stoi na linii ściany)?
