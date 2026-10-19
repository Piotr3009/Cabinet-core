# Chat fix 19.10.2026, paczka 1 (ZIP 1): Delete w oknie edycji, kwadraty CUT EDGE, zegar komunikatów

Baza: main f93a047 (T79, PR #78). Słowa Piotra z 19.10 (09:16 eye-test, 09:59 odpowiedzi):
"zeby cos wykasowac trzeba isc do menu i nacisnac delete item, a nie ma zaznaczenia itemu i nacisniecie delete";
komunikaty: "tak pls, mowimy o komunikatach po lewej" (4 s, czerwone 8 s, historia zostaje, tło 70 procent);
CUT EDGE: "tak, bez mockupu, identycznie jak pionowe"; tryb: "całość w chacie"; 10:15: "koduj, nic już nie pytaj".

## Diagnoza (headless Chromium, prawdziwy klik i klawisz, build main)

W widoku 3D pokoju klik w półkę zaznacza ją w uiStore i Delete ją kasuje. W oknie edycji szafy klik otwiera
menu SHELF, ale zaznaczenie siedzi w lokalnym stanie okna (selectedId), uiStore.selectedElement jest null
i listener okna (CabinetEditorModal.jsx) odpowiadał tylko na Escape: Delete nic nie robił. Dwa tory kasowania
w kodzie: przycisk "Remove this piece" woła removeElement, klawisz w 3D woła deleteSelectedElement.

## Co weszło

1. Delete w oknie edycji (src/components/CabinetEditorModal.jsx): klawisz Delete i Backspace przy zaznaczonym
   elemencie idzie przez deleteSelectedElement, ten sam tor co klawisz w 3D (guard lib/deleteKey.js: milczy
   w polu). Zaznaczenie spada tam, gdzie mówi plan (stos szuflad po jednej); odmowa zdaniem (żółty komunikat).
   Przycisk "Remove this piece" bez zmian (nadal removeElement). Tory kasowania: nadal dwa (przycisk, klawisz);
   Piotr nie zdecydował o jednym torze, więc nie ruszałem przycisku.
2. CUT EDGE (src/3d/NotchEdges.jsx, src/3d/notchPick.js, src/3d/UnitView.jsx): kwadrat 70 mm (jak narożniki)
   siedzi NA każdej z 4 poziomych krawędzi boku, na środku szerokości; cienka listwa wzdłuż krawędzi zostaje
   (jak kolumna przy narożniku). Uniesione uchwyty z liniami opadającymi skasowane. Deska karkasu, która stoi
   przed kwadratem, przepuszcza do niego kliknięcie (edgeHandleBehind w UnitView, wzór pickBehind z T79 F12),
   więc kwadrat tylno-dolny (BB) za plecami też się klika. Bilans: usunięte 17 linii, dodane 20 (3 linie
   przepustu w UnitView).
3. Komunikaty (src/engine/messages.js, src/engine/profile.js, src/stores/uiStore.js, src/components/Messages.jsx):
   każdy poziom znika na własnym zegarze: profile.ui.messages.hideMs { grey 4000, yellow 4000, red 8000 }
   (zastępuje greyMs 3000, skasowane). Klik w czerwony i klik obok żółtego nadal zabierają je wcześniej.
   Wiersz w historii Changes zostaje. Karta szara na tle bg-shell-800/70 (było /95); czerwone i żółte miały
   już tło /20 i /15, nie ruszane. Jedno przyjęcie bez pytania: "przezroczyste 70 procent" = 70 procent krycia.

## Dowody

- Testy: nowy test/chatfix-1910-delete-edges-messages.test.js (7); przepisane do nowego prawa:
  turn31-f2 (zegar każdego poziomu), turn79-f01 (zegar), turn79-f05 (punkt kwadratu na środku krawędzi).
  Pełna suita: 7006/7006 (było 6999 + 7 nowych), 11 min 23 s.
- Klasyfikator t78 strict: GREEN (fragment scripts/t78-classify.d/f35-owner-1910.mjs: messages.js i profile.js
  bez bramek, nic nie tnie; szóstka IDENTICAL vs verify/t70/goldens-base.json). t78-copy --check: CLEAN.
- PRO freeze (test/turn59-f1-the-switch.test.js): Messages.jsx i CabinetEditorModal.jsx licencjonowane w EXEMPT
  słowami Piotra, przepięte na nowe hashe. NotchEdges.jsx jest w src/3d, poza zamrożeniem.
- Walk w Chromium (scripts/chatfix-1910-walk.mjs): 15/15 GREEN, klatki w tym folderze:
  01 półka zaznaczona w oknie, 02 po Delete, 03 odmowa na boku, 04 cztery kwadraty w pokoju,
  05 okno krawędzi po kliknięciu każdego z czterech (TF, BF, TB pierwsze trafienie; BB przez deskę),
  06 komunikaty, 07 lista Changes po zegarze.
- Build Vite OK. Nagłówek Skylon w każdym nowym pliku. Zero myślników w nowym tekście.

## Nie ruszane

Oświetlenie, pull-down, skamieliny LISP, ciastka, regex {7}, retail (NotchEdges nie ma kopii retail;
Messages montuje tylko PRO).
