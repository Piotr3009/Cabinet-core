# Tura dzienna 15.10.2026 (chat-fix): plecy na Cabineo, komin do 100 mm, wyspa = prostokąt, plusiki na hover, L corner bi-fold, zawiasy 155

Paczka: `cabinetcore-dzien-1510-1015.zip` (70 plików: 57 zmienionych + 5 nowych + 8 w `verify/chatfix-1510-dzien/`, z tym raportem). Zawiera WSZYSTKO, co różni się od Twojego pusha `2af58db` (noc jest w nim, więc tej paczki nie trzeba łączyć z nocną).

Testy: pełny zestaw 6687/6687 zielone (6684 nocne + 3 nowe pliki testów: 14 testów, w tym 5 zmienionych z 110 na 155). Klasyfikator T78 (`node scripts/t78-classify.mjs`): GREEN, każda zmiana nazwana (nowy fragment `f26-owner-1510b.mjs`), 6 goldenów przepiętych z powodem (cabineo8, cabineo12 i 4 goldeny L), LISP zbalansowany. Build Vite OK. Walk w prawdziwym Chromium (headless, `node scripts/chatfix-1510-dzien-walk.mjs` na buildzie): 10/10 wierszy OK, klatki w `verify/chatfix-1510-dzien/`.

Twoje odpowiedzi z rana, wszystkie zrobione: 1 głębokość wiercenia zostaje X = 8/12 (problem VCarve), 2 plecy też na Cabineo, 3 luz 10 mm, 4 brama Cabineo otwarta, 10 prawa wpisane (LICENSE + nagłówek Skylon Development Ltd w każdym nowym pliku kodu), 11 Petros zapisany (jeden wpis: noc + dzień + decyzje + pytania), 12 push widziałem (`origin/main = 2af58db`).

## 1. Plecy na Cabineo (Twoje "plecy tez na cabineo")

LISP najpierw: `SKYLON_JOINTS_CABINEO.lsp` dostał sekcję D.2b (`cabineo-back-table`, `cabineo-back-joint`, `cabineo-back-pockets`, `cabineo-back-holes`), nagłówek, A.1 (`confirmed T`) i H.0 z nowymi liczbami. Silnik `engine/cabineo.js` jest lustrem.

Cztery złącza pleców na BUD 600x770x558:
- BUL i BUR do pleców: kieszenie Cabineo od WEWNĘTRZNEJ strony boku, kanał wzdłuż x przy tylnym końcu (4 złączki na bok, przy 50 / 273.3 / 496.7 / 720), otwory fi 5 w plecach na osi złączki (x = 12.5 i 587.5),
- TOP i BOTTOM do pleców: kieszenie od strony zewnętrznej jak reszta wieńca (3 złączki, przy 50 / 282 / 514), otwory fi 5 w plecach (y = 68 / 300 / 532).

Razem na szafce: 26 kieszeni (było 12), 78 otworów fi 15, 26 oblamówek, 26 otworów fi 5, z czego 14 w PLECACH. Plecy są prostokątem z 14 otworami fi 5 i NICZYM więcej: rzędy wkrętów fi 3 znikają (przy biszkoptach zostają, bo tam plecy nadal są na wkręty). Żadna płyta nie jest obrabiana z dwóch stron (bok: kieszenie pleców od środka razem z otworami fi 5 wieńca, zawiasami i kołkami). W wiszącej strefa zawieszki skraca kanał pleców w boku (na WUD 720: złączki przy 50 / 233.7 / 417.4 / 601.2).

Brama Cabineo: otwarta (`joints.cabineo.confirmed: true` w profilu, `(cons "confirmed" T)` w LISP). Goldeny `golden-cabineo8-bud.json` i `golden-cabineo12-bud.json` przepięte drugi raz (f26, REPINNED z powodem). Manifest operacji i DXF: plik BACK ma 14 okręgów fi 5.

## 2. Komin: do 100 mm w środku wcięcie, poniżej cała szafka płytsza, za kominem wraca

Twoje słowa: *"jak mam komin, przejeżdżam szafkę super się załamuje, ale w pewnym momencie przy bardzo wąskim wcięciu zatrzymuje się, a ja bym chciał żeby się wtedy szafka całkowicie skracała, nie zostawiała w środku szafki mniej niż 100 mm... jak przejadę na drugą stronę komina to niech ponad 100 mm zaczyna się pojawiać"*.

LISP: `KIT_NOTCH.lsp` ma `notch.minInterior 100` w tabeli profilu, `notch-obstacle-limits` liczy `max(minEdge, minInterior)` i nowy akapit PAST THE NOTCH. Silnik i store (`projectStore.js obstacleModeFor / settleObstacles`, derywowane w `refreshAutoParts`, nigdy nie zapisywane jako wycięcie):

| sytuacja | tryb | co się dzieje |
|---|---|---|
| nakładka + 10 mm luzu mieści się w najszerszym wcięciu i głębokość komina mieści się w najgłębszym (zostaje >= 100 w środku) | `notch` | wcięcie jak dotąd (BL / BR) |
| wcięcie zostawiłoby < 100 mm w środku, ale komin jest płytszy niż `głębokość - 100 - G` | `shallow` | CAŁA szafka płytsza: `depth = głębokość - wysięg komina`, `standoff_mm = wysięg` (stoi przed kominem na całej szerokości, front w linii sąsiadów), `depth_full` pamięta oryginał; odjedziesz, wraca pełna głębokość |
| komin głębszy niż to | `stop` | twardy stop jak w T14 |
| szafka wisząca | `standoff` | wisi na licu komina z pełną głębokością (zawieszki na kominie), jedzie swobodnie; przed płytką skrzynką (< wysięg dopuszczalny) wisząca też robi wcięcie, a przy wąskim wcięciu idzie w `shallow` |

Zmierzone w store (BUD 600 przy kominie 350 głębokim, luz 10): x 1000 BR 110x350, 1300 BR 410x350 (ostatnie wcięcie zostawiające 100 w środku), 1400 `shallow` depth 208 standoff 350, 1500 shallow, 1700 BL 410, 2100 clear. WUD 400 przy kominie 350: `standoff` 350 i wolny ruch. WUD przy skrzynce 120: wcięcie, potem shallow 280, potem BL. BUDTALL i WARDROBE jak BUD (`KIT_BUDTALL` dopisany jako rodzic wcięcia w LISP i w `notch.js`; Cargo nie, bo ma mechanizm). Check nie zgłasza UNIT_OVERLAP w żadnym z trybów. `wallGapOf` dodaje `standoff_mm` (jak odejmuje `recess_mm` od nocy), więc scena, clamp, blat i plan czytają jedną funkcję.

## 3. Wyspa: prostokąt na podłodze JEST wyspą, szafki stoją w środku

Twoje słowa: *"wstawia mi szafki na zewnątrz wyspy zamiast w środku, to jest za trudne, powinno być mega łatwe"*.

Plan z 14.10 trzymał RDZEŃ T75 (szafki stały na zewnątrz rdzenia, więc wyspa 1800x900 rosła do 1800x2036 po dwóch rzędach). Teraz (`engine/islandPlan.js`, `3d/IslandPlan.jsx`, `projectStore.insertIslandPlan`):
- prostokąt, który rysujesz, to ZEWNĘTRZNY obrys wyspy (fronty szafek),
- szafki na każdej ścianie zabierają PAS od tej krawędzi do środka (luz 10 + głębokość szafki, 568 na BUD),
- to, co zostaje w środku, to rdzeń T75 (`planCore`): wstawiany do pokoju tak jak zawsze, tylko liczby są z prostokąta (plan 1800x1100 z dwoma BUD na A i 450 na E2 daje rdzeń 1232x532; otwarcie planu na istniejącej wyspie liczy w drugą stronę i pokazuje z powrotem narysowany prostokąt),
- za mały prostokąt jest ODMAWIANY słowami ("The island is 900 mm deep; the cabinets on faces A and B need at least 1186 mm. Make it deeper, or take a face off."), obrys robi się czerwony, Insert nie wstawia nic; najmniejszy rdzeń to 50 mm (`CORE_MIN_MM`, propozycja),
- "+ Add cabinet" bierze tyle szerokości, ile ściana ma wolne (do 600), a przy < 150 wolnego mówi "Face A has 32 mm free: take a cabinet off it, or make the island bigger.",
- odległości (1000 / 900 progi) mierzone od krawędzi prostokąta, z szafkami czy bez.

Róg wyspy jest NICZYJ (jak w T75): szafka na końcu (E1 / E2) stoi obok pasa A, róg zostaje pod blatem na panel. Patrz pytanie 2.

## 4. Plusiki tylko pod ręką

Twoje słowa: *"wszędzie w przestrzeni są plusiki denerwujące, pokaż plusiki dopiero jak najedziesz na szafkę, albo jak najedziesz na miejsce w którym ma być szafka na wyspie"*.

`Scene.jsx`: plus na końcu ciągu rysuje się tylko, gdy wskaźnik jest nad KTÓRĄKOLWIEK szafką tego ciągu (`runMemberIds`), i znika 0.7 s po zjechaniu (czas na przejechanie z szafki na plus; plus sam też liczy się jako "pod ręką"). Pusta ściana wyspy ma niewidzialną bryłę w miejscu, gdzie stanęłaby szafka (`PlusZone`, `ccPlusZone`, przezroczysta, nie łapie kliknięć); plus tej ściany pokazuje się, gdy ręka jest w tej bryle. Pierwsza rzecz na promieniu wygrywa (szafka za inną szafką nie zabiera plusa; bryły wyspy są "powietrzem"). Plus WEWNĄTRZ zaznaczonej szafki bez zmian (był tylko na zaznaczonej). Retail: te same plusy, ten sam hover.

W walku: 0 plusów bez ręki, 2 (lewy i prawy koniec ciągu) nad szafką, 0 po 1.5 s; wyspa: 4 bryły, 0 plusów, 1 plus nad ścianą A.

## 5. L corner: bi-fold domyślnie, jedna klamka, klamka na licu, skrzydło B skraca się z frontem

Twoje słowa: *"klamki i orientacja drzwi na L shape w ogóle nie ma sensu, sprawdź dokładnie; po powiększeniu grubości drzwi drzwiczki muszą się skrócić; moja propozycja to otwieranie drzwiczek razem, czyli drzwiczki połączone ze sobą zawiasami"*.

Co znalazłem, sprawdzając dokładnie (LISP: `KIT_CORNER_L.lsp` sekcja 8 przepisana):
1. KLAMKA w 3D (`3d/Hardware.jsx FrontHandle`) czytała każdy front jako zwrócony do +z. Skrzydło B narożnika L stoi wzdłuż z i patrzy w x, więc klamka lądowała za KOŃCEM skrzydła, w powietrzu obok ramienia, a słupki klamki leżały wzdłuż ramienia. Teraz `FrontHandle` czyta kierunek lica skrzydła (`meta.swingZ` / `meta.faceX`) i stawia klamkę, trzpień, słupki i wałek na tym licu, które skrzydło pokazuje do pokoju. Wiercenie klamki było dobre (we własnej ramce skrzydła); zmieniła się tylko scena. Walk: klamka na licu B, x 586..648, z 854..883 na skrzydle 589..898.
2. BI-FOLD jest DOMYŚLNY dla nowego L (`corner_doors: 'bifold'` w `defaultParamsFor`; panel pokazuje "Bi-fold (B hangs on A)", "Pair" zapisuje null). Skrzydło B wisi na wolnej krawędzi A na zawiasie Blum CLIP top 60 st. (T78 F8, p. 116 katalogu), para otwiera się jednym ruchem: B rozkłada się o 60 st. względem A (kąt między skrzydłami rośnie z 90 do 150), A idzie na swoim zawiasie, przy 155 cały pakiet leży przed sąsiednim ciągiem. JEDNA KLAMKA, na wolnym końcu B: skrzydło A (noszone) nie dostaje klamki ani otworów (`meta.handleless`). Zawias skrzydła A nie jest już wymuszany na rodzinę "wide": A bierze własny zawias (155 na froncie do 24 mm; 110 na shakerze 25 mm, bo 155 i 170 Bluma kończą się na 24 i 21; linia CORNER_L_BIFOLD mówi to słowami).
3. PARA dwóch skrzydeł na karkasie (wybór "Pair"): koniec skrzydła B stał DOKŁADNIE na licu A (luz 0, choć `clearance.corner` to 3; A stoi 3 od karkasu i ta szczelina zjadała luz). Teraz B kończy 3 mm przed licem A, trim = szczelina + front + luz. Grubszy front skraca B o tyle samo: 18 do 25 to 7 mm, 25 do 40 to 15 mm, A się nie zmienia (jest kryte). W bi-fold B stoi 3 mm (jedna szczelina) od lica A przy każdej grubości.
4. Macierz luzów (`frontClearance.js`) chce tego, co silnik tnie: `cornerOverlap` = szczelina + front + luz (31 na 25 mm), nowy `cornerBifold` = front + 2 szczeliny (31). Check niczego nie "poprawia" na świeżym L (przed zmianą skrzydło B bi-fold miało -31 korekty, bo macierz nie znała bi-fold).
5. `corners.js lArmKinds(profile, tryb)` i `lLeafTrimMm` znają bi-fold; prawo "wisząca L idzie za dolną L" czyta tryb drzwi tej wiszącej.

Goldeny `golden-corner-l-base / wall / wardrobe / mask` przepięte (REPINNED w f26): zmienia się tylko szerokość skrzydła B (309.5 zamiast 312.5 na L 900; 167.5 zamiast 170.5 na wiszącej 600; 399.5 zamiast 402.5 w szafie) i linie CSV; okucia i wiercenia bez zmian.

## 6. Zawiasy 155 standardowo

Twoje słowa: *"standardowo zawiasy 155 degree proszę zmień to na 155 otwieranie, teraz otwierają się na 90 i wygląda źle"*.

Katalog rekordu `reference/hardware/cliptop-hinges.json` (i lustro w `blum-hinges.json`): drabinka grubości frontu to teraz 155 do 24 mm, 110 przy 25, 95 do 32. Blum daje CLIP top BLUMOTION 155 (71B7550 nikiel / 71B7590 onyks, zero protrusion) na drzwi do 24 mm (katalog p. 84/85, dealerzy: max door thickness 24, max overlay 19), dlatego Twój shaker 25 mm zostaje na 110. Fronty EGGER / lakier / fornir (18, 19) dostają 155. Notatka z powodem jest w JSON (`hinge_by_front_thickness_note`).

Obraz 3D: KAŻDE skrzydło niesie kąt swojego zawiasu (`meta.openAngleDeg`: 155 / 110 / 95; wcześniej tylko rodzina wide) i tak daleko otwiera się po 2kliku. Przy ścianie po stronie zawiasu nadal staje na 90 (prawo z T8, drzwi nie wchodzą w tynk). Walk: drzwi 18 mm 2kliknięte: niesie 155, obróciło się o 155 (`e-door-155.png`; okno drzwi mówi "155° · 71B7550 · nickel"). Front szuflady / klapa zmywarki zostaje na 45.

Check #33 (szerokie otwarcie w sąsiada) mówi tylko o skrzydle, któremu WYBRAŁEŚ rodzinę wide; 155 przechodzące nad zamkniętym frontem sąsiada to dokładnie to, po co jest zawias zero protrusion, nie błąd na każdych drzwiach.

WAŻNE, bez tego byś nie zobaczył zmiany: aplikacja czyta manifest zawiasów z bucketa (`hardware/hinges/blum/manifest.json`) albo z wiersza `cc_hardware` PRZED plikiem z repo, a Twój manifest z T19 niesie starą drabinkę 110/95. Teraz (`lib/hardwareSource.js`) manifest daje MODELE i artykuły, a drabinka kątów jest zawsze z katalogu rekordu w repo. Bucketa nie ruszałem (pytanie 3).

## 7. Prawa (Twoje "zasada: wpisujesz prawa")

`LICENSE` w korzeniu repo (treść wzoru z Petrosa 22.09.2026 słowo w słowo) i nagłówek `Copyright (c) 2026 Skylon Development Ltd...` na początku każdego NOWEGO pliku kodu (lista w `test/turn77-f5-no-copyright-line.test.js NEW_FILES`, test pilnuje). Stare pliki nie są przepisywane (zamrożona powierzchnia PRO pilnuje ich bajt w bajt); przelecenie 400 plików to Twoja decyzja, jak chcesz.

## 8. Czego NIE zrobiłem (uczciwie)

1. Okno w rogu (wycięcie z przesunięciem w pionie, skrzynka w połowie wysokości) i wycięcie od góry (belka nad wiszącą): nadal nie. KIT_NOTCH.lsp mówi, że to następny krok. To tura, nie poprawka.
2. Podgląd CNC na ekranie (`CncView.jsx`, zamrożony) rysuje płyty OUTSIDE FACE UP nieodbite; DXF jest odbity dobrze. Stan z T78.
3. RightPanel (zamrożony) nie mówi, że wycięcie jest automatyczne ani w jakim trybie stoi szafka (notch / shallow / standoff); widać w 3D, w `derived.notch.auto` i w `params.standoff_mm`. RightPanel pokazuje też FRONT BOARD 25 mm z parametru, choć gruba jest slot front1 (18 w Twoich projektach); to stan sprzed, zamrożony plik.
4. Korpusy zawiasów (modele 3D CLIP top) nie rysują się na drzwiach narożnika L (ani przed dziś): `hardware3d.js` szuka boku BUL/BUR jako nośnika, a L ma SIDE-A / SIDE-B. Wiercenie i BOM są dobre, brak tylko obrazka. Do zrobienia, jak powiesz.
5. Petros: wpis z 15.10 (noc + dzień) zapisany, bo powiedziałeś "zapisz". Bucketa, bazy `cc_hardware` ani niczego poza repo i Petrosem nie ruszałem.
6. Boiler i stałe elementy w planowaniu pokoju (Twoja uwaga "tak dla Twojej wiadomości"): zapisane w Petrosie jako DO ZROBIENIA (przeszkoda na ścianie jak komin, z trybami z punktu 2), nie kodowane.

## Lista plików (70)

Nowe: `LICENSE`, `scripts/t78-classify.d/f26-owner-1510b.mjs`, `scripts/chatfix-1510-dzien-walk.mjs`, `test/pluses-on-hover-1510.test.js`, `test/l-corner-and-hinges-1510.test.js`, `verify/chatfix-1510-dzien/` (ten raport, `walk.rows.md`, 6 klatek).

LISP: `reference/lisp/SKYLON_JOINTS_CABINEO.lsp`, `KIT_NOTCH.lsp`, `KIT_CORNER_L.lsp`.
Katalogi: `reference/hardware/cliptop-hinges.json`, `blum-hinges.json`.
Goldeny: `fixtures/golden-cabineo8-bud.json`, `golden-cabineo12-bud.json`, `golden-corner-l-base.json`, `golden-corner-l-wall.json`, `golden-corner-l-wardrobe.json`, `golden-corner-l-mask.json`.
Silnik: `src/engine/cabineo.js`, `cabinet.js`, `screwedBack.js`, `profile.js`, `notch.js`, `collision.js`, `runs.js`, `islandPlan.js`, `checks.js`, `doors.js`, `corners.js`, `frontClearance.js`, `types.js`; `src/lib/hardwareSource.js`; `src/stores/projectStore.js`, `resultCache.js` (nagłówek).
Scena: `src/3d/Scene.jsx`, `AddPlus.jsx`, `Hardware.jsx`, `IslandPlan.jsx`, `frameDemand.jsx`, `hardwareLod.js`, `perfMeter.js` (ostatnie trzy: nagłówek).
Klasyfikator: `scripts/t78-classify.d/f06.mjs`, `f20-cabineo.mjs`, `f23-owner-1210.mjs`, `f24-owner-1410.mjs`, `f25-owner-1510.mjs` (nagłówki, liczby).
Testy zmienione: `island-plan-1410`, `notch-obstacle-1510`, `recess-1510`, `turn19-hinges`, `turn31-f7-hover-aura`, `turn32-f2-hardware-step`, `turn32-f9-handle-cad`, `turn75-f4-the-true-l-carcass`, `turn75-f7-the-corner-notch`, `turn76-f1-the-conflicts-both-sides`, `turn77-f4-one-board-rule`, `turn77-f5-no-copyright-line`, `turn78-f08-the-bifold`, `turn78-f13-blum-hinges`, `turn78-f13-wide-hinges`, `turn78-f19-joint-choice`, `turn78-f20-cabineo-lisp`, `turn78-f20-cabineo`.

## Pytania

1. 155 na froncie 25 mm (shaker): Blum pisze max 24 mm. Zostawiłem shaker 25 na 110 (katalog). Chcesz 155 też przy 25 mm (trial application, Twoja odpowiedzialność)? Wtedy zmieniam jedną liczbę w `cliptop-hinges.json`.
2. Róg wyspy: szafka na końcu wyspy (E1 / E2) stoi OBOK pasa A i B, róg zostaje pusty pod blatem (panel). Czy ma być tak, czy szafka końcowa ma iść na pełną głębokość wyspy, a rząd A kończyć się przed nią?
3. Manifest zawiasów w buckecie ma starą drabinkę 110/95. Aplikacja już go nie słucha w sprawie kątów (bierze z repo), ale dla porządku mogę przygotować nowy `manifest.json` do wgrania do bucketa (te same modele, nowa drabinka). Chcesz?
4. Bi-fold jako domyślny dla KAŻDEGO nowego L (dolny, wiszący, szafa)? Tak zrobiłem po Twojej propozycji; para zostaje wyborem w panelu.
5. Korpusy zawiasów 3D na drzwiach L (punkt 8.4): robić w następnej turze?
