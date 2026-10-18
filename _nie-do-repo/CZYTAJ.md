# T79: co zrobić z tą paczką (Piotr, 18.10.2026)

Paczka: cabinetcore-t79-spec-1810-1534.zip
Zawartość do repo (struktura repo-root):
- CLAUDE.md (spec T79, ZASTĘPUJE CLAUDE.md z T78; zaczyna się od nagłówka tury)
- verify/t79/mockup-02-full-width-shelf-above-divider.png
- verify/t79/mockup-03-drawer-columns.png
- verify/t79/mockup-13-cabineo-drawer-box.png
Folder _nie-do-repo/ skasuj przed git add.

## Kroki
1. Rozpakuj do folderu repo Cabinet-core (nadpisze CLAUDE.md).
2. Skasuj folder _nie-do-repo.
3. git add -A
4. git commit -m "T79 spec: the owner's list of 18.10"
5. git push
6. Uruchom sesję Claude Code z repo (nie z Projektu), agenci i tryb równoległy ON.
   Prompt startowy: "Read CLAUDE.md and run TURN 79 exactly as written. Autonomous, zero questions, skip and name in the PR, PR before morning."
7. Rano: podaj mi numer PR, robię audyt (klon, suita, klasyfikator, parens, walk), potem merge i Twój eye-test.

## Co jest w turze (18 punktów, kolejność = wartość)
PART A ekran: F1 komunikaty po lewej + historia; F2 półka pełna szerokość nad dividerem; F12 centruj pomiędzy.
PART B: F3 kolumny szuflad 1/2 (divider i półka fix same) + naprawa dividera przez stos.
PART C notch: F4 cięcie od góry (ujemna wysokość); F5 cięcie poziome, 4 krawędzie boku; F6 otwory 3 mm na plecach przy notch/recess; F7 sprawdzenie warstwy corner (bez kodu, jeśli trzyma); F8 notch i recess razem; F9 end panel wycinany pod recess i notch; F10 recess ustępuje odsunięciu od ściany.
PART D: F11 rail bez propozycji with/without shelf + magnes 50 mm pod półką; F13 cofnięcia 10 mm (półki, dividery; szuflady nietknięte).
PART E: F14 Cabineo 12 na skrzynce szuflady (od góry, 1 do 100, 2 powyżej, 25/25).
PART F: F15 kolory LABEL na encjach DXF; F16 przycisk Restore sleeve rows; F17 NL 420 przez projekt; F18 dwa wpisy menu 21/44.
Poza turą: pull down (14, 16, 17 z listy), drzwi dwuskrzydłowe (T80), divider L/R, tuleje +18, półki a/b/c/d.

## Trzy decyzje, które podjąłem za Ciebie w specu (napisałeś "automatycznie"); jedno słowo i zmienię przed pushem
1. F6: na 17.10 powiedziałeś "nie będziemy tam wkręcać wkrętów" (rzędy 3 mm przy wyciętej krawędzi pleców i przy oknie recesu zdjęte). Dziś powiedziałeś, że mają być. Spec bierze DZISIEJSZE słowo: rzędy wracają wzdłuż każdej krawędzi pleców, która spotyka deskę (także RETURN i deski recesu). Goldeny notch/recess przepinane z cytatem.
2. F11: usuwam przełącznik "With a shelf / Rail alone" i propozycję; nowe raile zawsze "alone". Gałąź silnika dla raila na półce ZOSTAJE (stare projekty); jej kasacja to osobna Twoja decyzja.
3. F13: liczba 10 mm wchodzi przez projekt (paramsForEngine), silnik i skamieliny bez zmian, goldeny identyczne; migracja: półka/divider z front_mm dokładnie 20 dostaje 10, inne ręczne wartości zostają.

## Pull down (zaparkowane, do rozmowy)
Przyczyna: chat-fix 14.10 (commit 1b4af5b): SimplifyModifier na każdym GLB przy wczytaniu; CONERO 196 190 trójkątów = 41 s zamrożenia na serwerze (dłużej na laptopie), a odchudzona siatka to ruina pokazywana dalej niż 1,8 m. Plik CONERO w buckecie nietknięty od 30.08. Naprawa: wariant B (kasacja 3 plików w chacie + offline LOD jako osobna tura).
