# BLOCKERS.md

Open questions, missing inputs, and problems hit during the night build.
Format per entry: **what blocked / what I assumed or skipped / what Piotr should decide.**

---

## #1 — `golden-wardrobe.json` W-B: `panels_true_incl_railpart` = 29 nie da się pogodzić z W-A = 24

**Co blokuje.** Obie liczby są "golden", ale liczą co innego. LISP
(`KIT_WARDROBE_FULL.lsp`, linie 1050–1052) liczy panele tak:

```lisp
(setq totalPanels (+ 5 numShelves))
(if (= hasDrawers "Y")
  (setq totalPanels (+ totalPanels 1 numDrPanels (* numDrPanels 2) (* numDrawers 5) numDrawers)))
```

czyli: 5 korpusowych + półki + wieniec + DP + fillery + 5 części skrzynki na szufladę
+ fronty szuflad. **Drzwi liczone są osobno** (`numFronts`), **RAIL-PART wcale**
(fixture sama to odnotowuje w `lisp_summary_quirks`).

- **W-A**: 5 + 2 + (1 + 1 + 2 + 10 + 2) = **23** = `panels_lisp` ✅ (fixture: 23)
  → z RAIL-PART = **24** ✅ (fixture: 24). Zgadza się co do sztuki.
- **W-B**: 5 + 2 + (1 + 2 + 4 + 10 + 2) = **26** → z RAIL-PART = **27**.
  Fixture podaje **29**, czyli 27 + 2 **fronty drzwi**. Ta sama nazwa pola,
  inna konwencja niż w W-A.

Nie istnieje jedna formuła dająca jednocześnie 24 dla W-A i 29 dla W-B —
różnica między przypadkami to +1 DP, +2 fillery, +1 front drzwi = 4 sztuki,
a fixture pokazuje skok o 5.

**Co zrobiłem.** Fixture NIE ruszona. Silnik liczy zgodnie z LISP i wystawia
trzy jawne liczby, żeby każda konwencja była dostępna bez zgadywania:

| pole | W-A | W-B | znaczenie |
|---|---|---|---|
| `totals.panels_lisp` | 23 | 26 | dokładnie formuła LISP |
| `totals.panels_true_incl_railpart` | 24 | 27 | + RAIL-PART (prawda produkcyjna) |
| `totals.pieces_total` | 25 | 29 | wszystkie formatki, łącznie z drzwiami |

Test `W-B › totals.panels_true_incl_railpart` **jest uruchamiany i raportowany
jako `todo`** z komunikatem `expected 29, engine gives 27` — nie jest pominięty
ani wyciszony (`npm test` → `# todo 1`). Wszystkie pozostałe wartości W-B
(wymiary, m², mb, wiercenia) przechodzą **dokładnie**, w tym `board_area_m2`
11.044 i `front_area_m2` 2.985 — co potwierdza, że sam zestaw formatek jest OK
i problem dotyczy wyłącznie zliczania.

**Decyzja dla Piotra.** Potwierdź, którą liczbę traktujemy jako "panels" w BOM:
1. `panels_true_incl_railpart` (24 / 27) — konsekwentnie jak W-A, drzwi osobno; **rekomendacja**, albo
2. `pieces_total` (25 / 29) — wszystko razem, jak sugeruje W-B.

Po decyzji poprawiamy JEDNĄ liczbę w fixture (to literówka, nie matematyka)
i test robi się zielony.

---

## #2 — Próg 2 drzwi: dokumentacja mówi 704 mm, LISP daje 705 mm

**Co blokuje.** SPEC 3, CLAUDE.md i obie fixtures piszą "1 door if (width − 4) ≤ 700,
else 2 doors (threshold: width 704)". Sam warunek w LISP:

```lisp
(if (<= (- szerSzafki 4.0) 700.0) (setq numDoors 1) (setq numDoors 2))
```

Dla **W = 704**: 704 − 4 = 700, a 700 ≤ 700 → **1 drzwi**. Pierwsza szerokość
z dwoma drzwiami to **705**. Zapis "próg 704" jest przesunięty o 1 mm.

**Co zrobiłem.** Silnik odtwarza LISP (źródło matematyki, ŻELAZNA ZASADA 1
mówi o wartościach z LISP-ów). Test `door count follows the LISP comparison`
sprawdza jawnie 700/703/704 → 1 oraz 705/900 → 2. Żadna fixture nie testuje
przypadku 704, więc nic nie jest czerwone. Próg siedzi w profilu jako
`doors.widthDeduction: 4` + `doors.singleDoorMaxWidth: 700` — zmiana na
zachowanie "704 = 2 drzwi" to podmiana jednej liczby na 699.

**Decyzja dla Piotra.** Czy szafka 704 mm w produkcji dostaje 1 czy 2 drzwi?
Jeśli 2 — poprawiam profil (i tekst w SPEC). Jeśli 1 — poprawiamy tylko zdanie
w SPEC/CLAUDE.md.

---

## #3 — Rzędy otworów półkowych w szafie: fixture vs LISP (rozstrzygnięte na rzecz fixture)

**Co to.** Dla W-A fixture podaje `shelf_row_y: [722.7, 1427.3]`, czyli rozstaw
liczony po **pełnej wysokości**: `G + i·(H−2G)/(n+1)`. Realny LISP przy
szufladach woła `drawWardrobeShelfHolesBUL` z **shelfZone** (nad wieszakiem),
co dałoby ~1978.7 / 2055.3.

**Co zrobiłem.** Fixture sama to nazywa i nakazuje: `shelf_holes_quirk`:
*"replicate as-is v1"*. Fixture jest golden → silnik liczy po pełnej wysokości.
Zachowanie jest przełączalne profilem: `shelfHoles.spanMode: 'fullHeight' | 'zone'`.
Dodatkowo `shelfHoles.followPositions: true` sprawia, że gdy użytkownik
przeciągnie półkę w edytorze, otwory idą **za nią** (fixtures nie podają
pozycji, więc pozostają zielone). To nie jest blocker — to udokumentowana
decyzja, zapisana tu, żeby nie zginęła.

---

## #4 — `verify_with_piotr` z golden-wardrobe.json (przeniesione, nadal otwarte)

Fixture flaguje trzy rzeczy jako do potwierdzenia z produkcją. Silnik odtwarza
je zgodnie z LISP i fixture:

1. **Prowadnice na BUR** (strona bez drawer panelu) w y = {56, 259}, x = {37, 69, 293}
   + `boxSetback` (50 + grubość frontu 25 = 75) → realne x = {112, 144, 368}.
   Fixture podaje w `runner_hole_x` sam **wzorzec** {37, 69, 293}; silnik trzyma
   wzorzec w profilu (`wardrobe.runners.holeXPattern`), a w `drills[]` zapisuje
   współrzędne z offsetem. Do sprawdzenia przy maszynie.
2. **RAIL-PART 564 × 560** — identyczny z PARTITION. Odtworzone 1:1.
3. **Pierwszy front szuflady 197 zamiast 200** — odtworzone (`drawers.firstFrontAdjust: 3`).

---

## #5 — Wersje zależności: `@vitejs/plugin-react` nie da się przypiąć do 4.3.3

**Co blokuje.** `@vitejs/plugin-react@4.3.3` deklaruje peer `vite@^4 || ^5`.
Przy przypiętym `vite@7.1.3` (jak w Production Core) `npm install` wywala
ERESOLVE. W PC oba są zapisane z karetką, więc npm sam podnosi plugin do 4.x
zgodnego z vite 7 — dlatego tam działa.

**Co zrobiłem.** Wszystkie biblioteki z listy CLAUDE.md przypięte DOKŁADNIE
(React 19.1.1, @react-three/fiber 9.4.0, three 0.180.0, zustand 5.0.0,
vite 7.1.3, tailwind 3.4.14, @supabase/supabase-js 2.45.4, jspdf 2.5.2,
@react-three/drei 10.7.6). Jedyny wyjątek: `@vitejs/plugin-react` zostaje
`^4.3.3` (instaluje się 4.7.0). Powód i lista pominiętych bibliotek PC
(react-router-dom, xlsx, pdf-lib, jspdf-autotable — niepotrzebne) są zapisane
w `package.json` w polu `comment:versions`.

**Decyzja dla Piotra.** Brak — informacyjnie. Jeśli chcesz twardy pin, trzeba
zejść z vite do 5.x, co rozjeżdża wersje z PC.

---

## #6 — Fronty inset (zintegrowane) — brak liczb (SPEC 11.4)

LISP zna tylko overlay (`szer − 3`). Modal "Add items → Drawers" ma przełącznik
mount **overlay / inset**, ale **inset jest wyszarzony ("soon")** — bez odjęć od
Piotra nie da się policzyć formatek. Overlay działa w pełni.

---

## #7 — DXF świadomie poza nocą 1 (CLAUDE.md #12)

Silnik **trzyma** pełną geometrię CNC: outline puzzli (punkt po punkcie, z
drawBUL/drawBUR/drawTOP_ROT90), dogbones, sockety, wszystkie otwory z nazwami
warstw — `panels[].cnc.{outline,pockets}` oraz `drills[]` (pole `layer`).
Generatora `.dxf` nie ma i nie miało go być; wejdzie w Fazie D bez zmian w silniku.
