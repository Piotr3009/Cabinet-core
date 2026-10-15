# Tura nocna 15.10.2026 (chat-fix): Cabineo 3 warstwy, bez dog bones, narożnik w wiszących, komin i box jak skos, wnęka

Paczka: `cabinetcore-noc-1510-0155.zip` (35 plików, z tym raportem). Zawiera TEŻ paczkę planu wyspy z 00:16 (`cabinetcore-wyspa-plan-1510-0016.zip`), bo nie wiem, czy ją wgrałeś. Wgranie tej jednej wystarczy.

Testy: pełny zestaw 6684/6684 zielone (6669 + 15 nowych). Klasyfikator T78 (`node scripts/t78-classify.mjs`): GREEN, każda zmiana nazwana, 3 goldeny przepięte z powodem, LISP zbalansowany. Build Vite OK. Smoke w przeglądarce (headless, build /pro): zero błędów konsoli, komin wycina narożnik, wnęka wciąga szafkę, Cabineo daje 3 warstwy.

## 1. Cabineo: 3 warstwy, nic więcej

Twoje słowa: *"musi byc 3 layery 1 to cabineo 15 mm, drugi to cabineo oblamowka, czyli zebranie 0.5 mm laminatu, 3 to przeciwlegle nawiercenie"*.

Domyślne ustawienie Cabineo jest teraz Twoje (LISP najpierw: `SKYLON_JOINTS_CABINEO.lsp` nagłówek, A.1, D.7, D.8, H.0; silnik `engine/cabineo.js`; profil `joints.cabineo`):

| warstwa | co | liczby (BUD 600x770x558, Cabineo 12) |
|---|---|---|
| `CABINEO_POCKET_15MM` | kieszeń jako 3 otwory fi 15 (opcja 1 z karty), od strony ZEWNĘTRZNEJ wieńca i dna | środki 3.6 / 14.8 / 26 od końca, głębokość 11.5 |
| `CABINEO_RECESS` | oblamówka: zebranie laminatu pod kołnierz, 16.7 szerokie (karta), zakończone półkolem wokół trzeciego otworu | 0.5 głęboko (Twoje; karta drukuje 0.8), długość 34.35 |
| `CABINEO_HOLE_5MM` | przeciwległe nawiercenie fi 5 w boku od środka, na osi wkrętu | oś 5.5 pod licem (5 + 0.5 oblamówki), głębokość X = 12 (Cabineo 8: 8) |

Głębokość otworu fi 5: karta Lamello jej nie drukuje. Przyjąłem X, czyli wysięg wkrętu (8 / 12), bo karta techniczna dealera (cnc-tool.com, Lamello Cabineo technical) drukuje "drill hole dia 5 x 12" dla Cabineo 12 i "dia 5 x 8" dla Cabineo 8. Jak sobie przypomnisz inną liczbę, wpisuje się ją w `joints.cabineo.holeDepthMm` i zastępuje X.

Opcje frezowane (cutter 10 / 12) i kapsel (flushCap 2.1) zostają do wyboru w profilu, ale nie są już domyślne. Zapisany profil z T78 (flushCap + cutter12 bez `skimMm`) jest przy wczytaniu migrowany na Twoje ustawienie.

Strona obróbki jest spójna ("to musi mieć swój sens"): wieniec, dno i półka stała mają kieszenie i oblamówkę od zewnątrz (plik DXF odbity, etykieta OUTSIDE FACE UP), boki mają tylko otwory fi 5 od środka razem z zawiasami i kołkami, plecy mają tylko przelotowe wkręty fi 3. Żadna płyta nie jest obrabiana z dwóch stron.

## 2. Bez dog bones przy Cabineo, biszkoptach i kołkach

Dog bone to ulga puzzla. Jedyny puzzel, jaki jeszcze zostawał na szafce Cabineo albo biszkoptowej, to połączenie PLECÓW: 3 czopy z tyłu każdego boku, 2 czopy z tyłu wieńca i dna, każdy z dog bone, i gniazda w plecach z 20 otworami fi 7.5. To połączenie idzie w całości (`engine/screwedBack.js`, w LISP: nagłówek i sekcja F obu plików JOINTS). Plecy trzymają się na tym, co zawsze je trzymało: własne rzędy wkrętów fi 3 z drawBACK (14 sztuk na BUD 600: po 4 na linii każdego boku, po 3 na linii wieńca i dna). Boki, wieniec, dno i plecy są prostokątami. Na szafce Cabineo nie ma ani jednej warstwy PUZZLE. Kołki (T78 F19) mają swoje rzędy w plecach od zawsze i nigdy nie rysowały dog bone, więc ich nie ruszałem.

Rozmiary płyt bez zmian, więc BOM bez zmian. Goldeny `golden-cabineo8-bud.json`, `golden-cabineo12-bud.json`, `golden-biscuit-bud.json` przepięte i nazwane (fragment `f25-owner-1510.mjs`, REPINNED).

## 3. Narożnik w szafkach wiszących

`KIT_WUD` jest trzecim rodzicem narożnika (KIT_NOTCH.lsp sekcja 1, `notchKitRefusal`). Przycisk CUT CORNER pojawia się na wiszącej sam (RightPanel pyta `notchApplies`). Zawieszki idą z wycięciem:
- wycięcie w plecach pod zawieszkę, jeśli wchodzi w wycięcie, przesuwa się o szerokość wycięcia do środka (na skróconych plecach stoi w ich nowym rogu),
- dwa otwory zawieszki w wyciętym boku (21 i 53 od tylnej krawędzi) przesuwają się do przodu razem ze skróconym bokiem, nigdy nie są gubione.

Wycięcie w wiszącej idzie od spodu szafki, jak w stojącej (dno wycięte, góra zamknięta LID).

## 4. Komin i box wycinają narożnik same, jak skos

Twoje słowa: *"komin nie ma mozliwosci automatycznego wycinania w szafce naroznika jak przesuwamy - patrz skos, w szafach to samo"*.

Szafka, której kit bierze narożnik (BUD, WARDROBE, WUD), WJEŻDŻA przesuwana w zasięg komina lub boxa, a wycięcie jest WYLICZANE z nakładki w `paramsForEngine` (jak `slope_cut`, nigdy nie zapisywane): róg BL albo BR, szerokość = nakładka + 10 mm luzu, głębokość = wysunięcie komina za linię pleców + 10 mm luzu, pełna wysokość. Odjedziesz, wycięcie znika. Prawo dojazdu jak przy skosie: stop stoi tam, gdzie najszersze dopuszczalne wycięcie (szerokość - 2G - 2 (dogbone + G), na BUD 600 to 468), nigdy za dalszą krawędź komina (wtedy szafka stałaby przed kominem, a to nie róg). Komin głębszy niż najgłębsze wycięcie (D - G - 96; wisząca 400 nie weźmie komina 350) zostaje twardym stopem jak w T14. Szafka z własnym, ręcznym wycięciem też ma twardy stop. Check nie zgłasza UNIT_OVERLAP za nakładkę, dla której jest wycięcie. Luz 10 mm: `profile.notch.obstacleClearanceMm`, propozycja.

W `derived.notch` wycięcie automatyczne ma `auto: true` i `for: "a chimney on this wall"`. Jeśli komin trafi w prowadnice albo zawias, silnik odmawia słowami (Check #28), nic nie jest ucinane po cichu.

## 5. Wnęka wciąga szafkę

Twoje słowa: *"wneka zrobiona nie pozwala szafkom jakby wpasc w wneke"*.

Szafka, której cały zasięg (z panelami końcowymi) mieści się w zasięgu wnęki na jej ścianie, dostaje `params.recess_mm` = głębokość wnęki (liczone w jednym punkcie, `settleRecesses` w `refreshAutoParts`, przy każdym ruchu, dodaniu i zmianie wnęki) i `wallGapOf` odejmuje to od szczeliny: szafka stoi przy tylnej ścianie wnęki z tą samą szczeliną, co przy ścianie. Scena, clamp, blat, plan i przekrój czytają tę jedną funkcję, więc idą za nią. Szafka stojąca w połowie na krawędzi wnęki zostaje na linii ściany (nie da się wsunąć), szafka wyjeżdżająca z wnęki traci liczbę. Nikt tego nie wpisuje ręcznie.

## 6. Czego NIE zrobiłem (uczciwie)

1. Wycięcie z przesunięciem w pionie (box w poziomie na środku wysokości, "okno" w rogu) i wycięcie od góry (belka nad wiszącą). KIT_NOTCH.lsp i `notch.js` zakładają, że wycięcie rośnie od podłogi; okno potrzebuje nowej geometrii (dodatkowa płyta FLOOR pod boxem, bok z oknem zamiast L, wieniec/dno nietknięte). Nazwane w LISP jako następny krok. To jest kolejna tura, nie nocna poprawka.
2. Podgląd CNC na ekranie (`CncView.jsx`, plik zamrożony) rysuje płyty "OUTSIDE FACE UP" nieodbite, od środka; plik DXF jest odbity poprawnie. Stan z T78. Da się dorobić, ale wymaga przepięcia zamrożonego pliku.
3. RightPanel nie mówi, że wycięcie jest automatyczne (pokazuje CUT CORNER jak na szafce bez wycięcia). Widać je w 3D i w `derived.notch.auto`. Też zamrożony plik.
4. Nic nie zapisywałem do Petrosa (zasada: tylko po Twoim "tak").

## Lista plików (34)

Noc: `src/engine/screwedBack.js` (nowy), `cabineo.js`, `biscuitJoints.js`, `cabinet.js`, `notch.js`, `collision.js`, `runs.js`, `profile.js`, `stores/projectStore.js`; LISP: `SKYLON_JOINTS_CABINEO.lsp`, `SKYLON_JOINTS_BISCUIT.lsp`, `KIT_NOTCH.lsp`; goldeny: 3 przepięte; testy: `notch-obstacle-1510`, `recess-1510` (nowe), `turn78-f20-cabineo*`, `turn78-f20-biscuit`, `turn75-f7-the-corner-notch` (dopasowane do nowego prawa, nic nie wyciszone); klasyfikator: `f25-owner-1510.mjs` (nowy), `f20-cabineo.mjs`, `f20-biscuit.mjs`. Plan wyspy z 00:16: `islandPlan.js`, `IslandPlan.jsx`, `Scene.jsx`, `frameDemand.jsx`, oba `RoomModal.jsx`, `uiStore.js`, `turn59-f1`, `island-plan-1410.test.js`, `f24-owner-1410.mjs`.

## Pytania

1. Głębokość otworu fi 5 pod wkręt Cabineo: zostaje X (8 / 12 mm) czy podasz inną?
2. Luz wycięcia pod komin i box 10 mm na szerokość i głębokość: dobrze, czy inny?
3. Plecy przy Cabineo i biszkoptach na własnych wkrętach fi 3 z drawBACK: tak ma być, czy wolisz plecy też na Cabineo (wtedy wieniec i dno dostają otwory fi 5 od środka, czyli obróbkę z dwóch stron)?
4. Wycięcie-okno (box w poziomie) i wycięcie od góry: robić w następnej turze?
