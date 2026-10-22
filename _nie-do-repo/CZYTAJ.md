# T81 DRAWINGS: co zrobić z tą paczką (Piotr, 22.10.2026, 23:25)

Paczka: cabinetcore-t81-spec-2210-2205.zip. Baza: main 3719d3b (merge PR #79, T80).
Zawartość do repo (struktura repo-root):
- CLAUDE.md (spec T81, ZASTĘPUJE CLAUDE.md z T80; T80 zostaje w historii git)
- verify/t81/dxf-analiza.png (osiem wycinków z Twojego DXF), dxf-warstwy.md (184 warstwy), pdf-audit.png (audyt PDF z 22.10),
  dxf-wallB-fronts.png, dxf-wallA-no-fronts.png, dxf-door-detail.png, dxf-section-drawers.png, dxf-island-plan.png (wzorce dla agentów)
Folder _nie-do-repo/ skasuj przed git add (CZYTAJ i patch są tylko dla Ciebie). Twój DXF (57 MB) NIE idzie do repo.

## Kroki
1. Rozpakuj do folderu repo Cabinet-core (nadpisze CLAUDE.md).
2. Skasuj folder _nie-do-repo.
3. git add -A
4. git commit -m "T81 spec: the drawings are the model"
5. git push
6. Sesja Claude Code z repo (nie z Projektu), environment Default (chmura), gałąź main, Auto, Opus 5.5 High, agenci i tryb równoległy ON.
   Prompt startowy: ten sam co do T80, z "TURN 81" zamiast "TURN 80" i z "claude/t81-drawings" jako gałęzią (pełny tekst niżej).
7. Rano: podaj mi numer PR, robię audyt (klon, suita, klasyfikator, goldeny, walk, klatki arkuszy vs 3D), potem merge i Twój eye-test PDF.

## Co jest w turze (10 F, kolejność = wartość)
PART A: F1 PROJEKTOR: jeden rzut tego, co rysuje pokój (te same deski, te same okucia, te same elementy ciągu), widoczność jak malarz: od tyłu do przodu z białym wypełnieniem, więc nic nie prześwituje przez front. Tryby: fronty / bez frontów / x-ray. Stare składacze arkuszy zestawu skasowane (kasacja).
PART B: F2 KOLEJNOŚĆ ARKUSZY: 01 3D, fronty (każda ściana), bez frontów (każda ściana), X-ray (każda ściana), plan dolne, plan górne, przekroje, wizualizacja, cut list. Numery szafek na każdym arkuszu.
PART C: F3 fronty (zawiasy jako czarne paski 6 x 70 w pozycjach z drabinki silnika, gałki fi 30 z projektu, AGD niebieskie z modelem, rama in-frame, blat, cokół, gzyms); F4 bez frontów (rama zostaje, płytki zawiasów, skrzynki, prowadnice, nogi); F5 X-ray (fronty i karkas szare, wnętrze pełne, jak X-ray w 3D); F6 plan i przekroje z tego samego projektora (cokół pod cięciem jako linia ukryta).
PART D: F7 SYLWETKI Z GLB: skrypt czyta modele okuć z bucketa, rzutuje na trzy płaszczyzny, obrysowuje; przekroje i widoki bez frontów rysują prowadnice, nogi, zawiasy, gałki jak modele.
PART E: F8 JEDEN KOLOR = JEDNA WARSTWA: nasze zostają, dochodzą HINGE_MARK, WORKTOP, XRAY_FRONT, XRAY_CARCASE, MASK, FRAME_BOARD; SVG i PDF w grupach warstw.
PART F: F9 karta szafki rysuje tylko swoją szafkę (plinth i rama przycięte do szerokości), nazwa koloru raz.
PART G: F10 walk: każdy arkusz zrzucony i sprawdzony liczbowo względem silnika.
Poza turą: eksport DXF zestawu, cut list i CNC (zostają), rysunek ramy per ściana, plan blatu ze zlewem i płytą, listwa ozdobna 4 linie, cokolwiek w silniku cięć.

## Decyzje, które podjąłem za Ciebie w specu (PROPOSED; jedno słowo i zmienię przed pushem)
1. Okładka (cover) znika jako osobna strona: indeks i rewizje idą do kolumny strony 01 (3D), bo kazałeś "najpierw 3D".
2. Szarości X-ray: fronty #9A9A9A, karkas #C9C9C9 (z liczb appearance.xray 0.42 / 0.2).
3. Rama in-frame na arkuszach w osobnym kolorze FRAME_BOARD (ciemniejszy fiolet), żeby legenda odróżniała ramę od frontów w niej.
4. Cokół na planie dolnym: linia ukryta (kreskowana), nie pełna.
5. Sylwetki okuć: rzut trójkątów GLB, raster 0.5 mm, obrys; rodzina bez modelu dostaje dzisiejszy symbol i jest nazwana w PR.
6. Karta szafki: części ciągu przycięte do szerokości szafki + 50 mm.
7. Warstwy w PDF jako grupy opcjonalne (OCG), jeśli biblioteka jsPDF pozwoli; jeśli nie, grupy w SVG i wpis w PR.

## Prompt do Code (wklej w całości)
Read CLAUDE.md in full before anything else and run TURN 81 exactly as written there. This is an overnight, unattended run. Nobody will answer you.
RULES OF THIS RUN
1. You have standing permission for everything in this repository: every command, install, file edit, commit, push and the PR. Never ask for permission, never ask to proceed. ZERO QUESTIONS: never ask the user anything, never wait, never end a message with a question. If you feel the need to ask, decide instead: take the reading that follows the owner's words in CLAUDE.md most closely, write it in verify/t81/DECISIONS.md (what, why, which words) and keep going; every decision also goes into the PR body under "DECISIONS TAKEN".
2. ZERO STOPS. A failing test, a red classifier, a missing GLB, a flaky walk, an unclear line: diagnose, fix, or skip the point WHOLE, name it in the PR under "SKIPPED AND WHY", and continue with the next F. The run ends only when the PR is opened.
3. The owner's decisions in CLAUDE.md are final: the sheet order, the projector as the one source, hinges from the engine's ladder as black bars, knobs 30 from the project, unit numbers on every sheet, our inks kept and the missing ones added one layer per colour, hardware from the GLB, no DXF export, the cut list and CNC untouched, the engine's cuts untouched. Numbers marked PROPOSED are yours to ship as written; any new number goes into profile.js under drawings with a source line and is listed in the PR as PROPOSED.
4. Order: PART A first (the probe, then the projector), then F2 to F10 in order. Agents and parallel mode ON; one writer per central file exactly as CLAUDE.md lists; never two agents in one file. If an agent fails or hangs, redo its work yourself and continue.
5. Branch claude/t81-drawings from main. One commit per F, message "T81 F<n>: <name>". Push after every F.
6. Gates before the PR, all green: full suite (node --test "test/**/*.test.js", never --silent), scripts/t78-classify.mjs strict with f41-t81-f*.mjs fragments and REPINNED empty, scripts/t78-copy.mjs --check CLEAN, the six base goldens IDENTICAL (scripts/t64-classify.mjs --dump vs verify/t70/goldens-base.json), scripts/t78-goldens.mjs --check, NEW_FILES updated, every new file with the Skylon header, no em or en dash anywhere, scripts/t81-walk.mjs with real mouse and the frames under verify/t81/. The engine's cuts must be untouched: prove it with the goldens and the DXF fingerprints and say so in the PR.
7. If a gate stays red after a real attempt to fix it, do not stop: record the exact failure in the PR under "RED AT THE END" and open the PR anyway.
8. Open the PR before morning with the body CLAUDE.md asks for. Attribution lines at the end of commits and the PR as the environment requires.
9. Nothing goes to Petros or any external system. No git history rewriting, no force push, no deleting files that are not yours to delete, nothing touched under FROZEN in CLAUDE.md.
Start now with PART A.
