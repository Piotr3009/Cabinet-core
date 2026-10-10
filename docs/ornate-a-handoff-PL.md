# Cabinet Core: Ornate A, paczka dla Claude

## Zakres

Osobna rodzina czterech klasycznych frontów, na podstawie planszy Piotra z 10.10.2026. Kod obejmuje wybór w PRO i retail, zapis receptury i odbicia, geometrię reliefu, rysunki, opis w BOM oraz eksport referencji CAD/CAM. Istniejące Shaker, Arched, Grooved i pozostałe fronty zachowują własne receptury.

Baza tej paczki: `2766045116637e0b0cc37894d4333290abe0e894`, repo `Piotr3009/Cabinet-core`. Jest to przekazanie kodu do połączenia przez Claude. Ta sesja nie publikuje zmian ani nie wykonuje push.

## Warianty i interpretacja planszy

| ID zapisu | Nazwa w programie | Geometria |
| --- | --- | --- |
| `ORNATE_A_1` | Ornate A - Classic | Duży łuk w lewym górnym i prawym dolnym narożniku, dwa ornamenty |
| `ORNATE_A_2` | Ornate A - Symmetric | Półokrągłe zakończenia góra/dół, cztery ornamenty narożne |
| `ORNATE_A_3` | Ornate A - Soft | Łagodniejsza wersja dwóch narożników, dwa ornamenty |
| `ORNATE_A_4` | Ornate A - Plain | Profil wariantu 1, bez ornamentu |

Odbicie `mirror` zmienia kompozycję frontu. Jest niezależne od koniecznego odbicia współrzędnych przy przejściu z tylnej na przednią stronę obróbki. Nazwa stylu bez zapisanej receptury niczego nie frezuje; wybór w galerii jest jawnym włączeniem receptury.

Plansza nie jest zwymiarowanym modelem CAD ani skanem ornamentu. Kwiat z płatkami i dwiema gałązkami liści jest odtworzeniem proceduralnym. Profil jest interpretacją czterech płynnych pasów przechodzących przez wskazane poziomy, bez udawania rozpoznania konkretnego frezu profilowego. Do wiernej kopii fizycznego wzoru potrzebny będzie jego pomiar lub model źródłowy.

## Wymiary i dane profilu

Wartości znajdują się w `src/engine/ornateFrontProfile.js`, importowanym przez `profile.js` do `profile.front.decoration`. Zapisana receptura przechowuje własne liczby, łącznie z niezależnymi tablicami szerokości i głębokości. Ustawienia produkcyjne nie zostały dodane jako kolejne pola liczbowe klienta. Użytkownik wybiera wariant oraz odbicie, a profil warsztatu zawiera parametry.

| Parametr | Wartość startowa | Pochodzenie |
| --- | --- | --- |
| Przykładowy front | 600 x 800 mm | Propozycja na planszy |
| Przykładowa grubość | 18 mm | Propozycja na planszy |
| Zewnętrzna ramka | 60 mm | Propozycja na planszy |
| Wewnętrzny pas | 60 mm | Propozycja na planszy; osobny od zewnętrznej ramki |
| Wewnętrzny promień 1 i 4 | 150 mm | Propozycja na planszy |
| Szerokości czterech pasów | 12 / 8 / 6 / 4 mm | Propozycja na planszy |
| Głębokości bezwzględne | 3 / 6 / 9 / 12 mm | Propozycja na planszy, od pierwotnego lica |
| Zagłębienie tła ornamentu | 3 mm | Interpretacja kodu |
| Wysokość ornamentu ponad tłem | 2,5 mm | Propozycja kodu; całość pozostaje pod pierwotnym licem |
| Małe narożniki 1 i 4 | R3 | Propozycja kodu |
| Promienie wariantu 3 | R110 i R18 | Propozycja kodu; plansza nie podaje ich wartości |
| Promień wariantu 2 | połowa szerokości wewnętrznej | Półokrąg, dla przykładu R180; odrębna interpretacja wariantu symetrycznego |
| Minimalna pozostała grubość | 3 mm | Istniejąca reguła profilu Cabinet Core |

Ramki nie są oddzielnymi doklejonymi płytami. Przykład 18 mm z zagłębieniem 12 mm pozostawia 6 mm materiału w środku. W programie zachowuje się grubość faktycznie przypisanego materiału; nie jest automatycznie zmieniana na 18 mm.

## Jedna geometria

`buildOrnateFront` tworzy jeden rekord dekoracji. `operations[0].surface` zawiera wierzchołki i trójkąty całego zagłębionego lica, łącznie z ornamentem. Renderer 3D i eksport STL czytają tę samą powierzchnię. Rysunki i DXF korzystają z dołączonych konturów `operations[0].contours`.

Główne pliki:

| Plik | Odpowiedzialność |
| --- | --- |
| `src/engine/ornateFrontProfile.js` | Proponowane parametry czterech wariantów |
| `src/engine/ornateFront.js` | Normalizacja, walidacja i powierzchnia reliefu |
| `src/engine/frontDecoration.js` | Włączenie do istniejącego silnika i kontrola otworów od tyłu |
| `src/3d/frontDecorationSolid.js` | Zamknięta bryła frontu, rzeczywiste otwory, cieniowanie |
| `src/engine/drawings/frontDecorationDrawing.js` | Elewacje oraz szczegóły części |
| `src/engine/cnc/ornateExport.js` | DXF, STL i opis referencji |
| `src/lib/cncExport.js` | Dołączenie referencji do istniejących eksportów ZIP |
| `src/engine/ornateFrontArt.js` | Miniatury galerii, wyłącznie proporcje graficzne |

Nie powstaje nowy korpus ani nowy kit LISP. Zgodnie z rozdzieleniem receptur w T76 jest to obróbka powierzchni istniejącej płyty. Istniejące pliki LISP i ich referencyjne wyniki pozostają bez zmian. Nowego reliefu nie przedstawiamy jako sprawdzonej receptury produkcyjnej LISP.

## CNC: pliki i warstwy

W ZIP programu folder `ornate-reference/` zawiera dla każdego wybranego frontu:

- `*-ORNATE-PROPOSED-FRONT.dxf`: DXF R12, widok od lica.
- `*-ORNATE-PROPOSED-RELIEF-1.stl`: otwarta powierzchnia docelowa do obróbki 3D, w mm. To nie jest zamknięta bryła całej części i nie zawiera wierceń od tyłu.
- `*-ORNATE-PROPOSED-operations.json`: parametry, wymiary, głębokości, znaczenie warstw, układ współrzędnych i powiązanie plików.

| Warstwa domyślna | Znaczenie |
| --- | --- |
| `FRONT_REFERENCE_NO_CUT` | Zewnętrzny obrys odniesienia i ustawienia części |
| `FRONT_REF_PROFILE_D3` | Kontur proponowanego profilu na poziomie 3 mm |
| `FRONT_REF_PROFILE_D6` | Kontur na poziomie 6 mm |
| `FRONT_REF_PROFILE_D9` | Kontur na poziomie 9 mm |
| `FRONT_REF_PROFILE_D12` | Kontur na poziomie 12 mm |
| `FRONT_REF_ORNAMENT` | Rzut płatków, liści i ich grzbietów; wysokość określa powierzchnia STL |

Głębokości 3/6/9/12 są liczone od pierwotnego lica. Nie należy ich sumować. Kontury poziomów opisują powierzchnię profilowaną, więc nie są czterema gotowymi poleceniami płaskiego pocket. Ornament ma zmienną głębokość; JSON zapisuje dla jego konturów `null`, a dokładne wysokości pochodzą z STL. Dobór frezów, przejazdów zgrubnych, wykańczania, posuwów i postprocesora pozostaje w CAM.

Układ: lico do góry, zero XY w lewym dolnym narożniku, zero Z na pierwotnej powierzchni. Kod przeprowadza już transformację `frontX = width - backX`, `frontY = backY`, `frontZ = -depth`. Nie odbijać STL ani DXF ponownie. Import DXF R12 i STL jawnie w milimetrach, z kontrolą wymiaru części.

Istniejące warstwy i geometria BACK pozostają bez zmian. Podgląd FRONT w CNC pokazuje te same warstwy referencyjne i opis zmiennej głębokości ornamentu. Proponowany relief jest wstrzymany jako obróbka produkcyjna, a referencje są dostępne także przy wstrzymanym froncie. `Export anyway` nie zmienia propozycji w zatwierdzony relief. Stan samej płyty nadal pochodzi z istniejącej reguły `readiness`; opis BOM wyraźnie dopisuje proponowany relief.

## Ograniczenia kontrolowane przez kod

- Obsługiwane są pełne prostokątne fronty. Skosy i nieregularne obrysy wymagają osobnej receptury.
- Zbyt mały front jest odrzucany z przyczyną. Promienie nie są potajemnie ściskane.
- Kontrolowane są liczby skończone, kompletność czterech poziomów, rosnące głębokości, wariant, wartości logiczne i pozostały materiał.
- Kolizja z nieprzelotowym otworem od tyłu jest sprawdzana zachowawczo względem najgłębszego zagłębienia całego pola reliefu. Odrzucony przypadek może wymagać dokładnej lokalnej analizy CAM.
- Geometria nie zatwierdza narzędzi, materiału, zamocowania ani technologii na konkretnej maszynie.

## Połączenie przez Claude

Na czystej gałęzi bazującej na wskazanym SHA:

```bash
git switch -c claude/ornate-a 2766045116637e0b0cc37894d4333290abe0e894
git apply --check /sciezka/ornate-a.patch
git apply /sciezka/ornate-a.patch
npm ci
npm test
npm run build
node scripts/ornate-classify.mjs
node scripts/ornate-export-examples.mjs
```

Jeśli main jest już dalej, użyć `git apply --3way`, przejrzeć każdy konflikt i zachować obie niezależne zmiany. `changed-files/` w paczce zawiera pełną treść plików do przeglądu, nie służy do nadpisania nowszego main w całości.

Kopia `FrontDecorationControls` w retail jest wytworzona skryptem `t63-copy.mjs`; zawiera tę samą logikę oraz mechanicznie podmienione importy i klasy. Zmiany `FrontDecorationControls` i `CncView` w PRO mają cytat autoryzacji Piotra i nowe hashe w istniejącym teście zamrożenia. Dostosowane starsze asercje obejmują powiększenie katalogu o cztery style oraz nazwę paczki eksportu zawierającego wyłącznie referencje wstrzymanych frontów. Nie osłabiają geometrii dotychczasowych wzorów.

Test przeglądarkowy: `CHROME_PATH=/sciezka/do/chromium CC_WALK_SERVER=1 node scripts/ornate-walk.mjs`. Szczegóły uruchomienia znajdują się w komentarzu skryptu. `scripts/ornate-preview.html` to lokalny podgląd kontrolny geometrii przez Vite. Wyniki weryfikacji tej paczki są zapisane w `verification/` paczki.
