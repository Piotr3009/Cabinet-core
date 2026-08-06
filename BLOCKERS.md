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

---

# TURA 2

## #8 — Dialekt DXF: R12 (POLYLINE) zamiast literalnego LWPOLYLINE

**Co blokuje.** CLAUDE.md zadanie 2 mówi dwie rzeczy, które nie mogą być
jednocześnie prawdziwe co do litery:

1. „**LWPOLYLINE** zamknięta = outline; LWPOLYLINE zamknięte = pockets",
2. „czysty JS; **wzorzec składni: `reference/production-core/dxfWriter.js`**".

Ten plik jest napisany w **DXF R12 (AC1009)**, a jego nagłówek zapisuje dlaczego:
*„An earlier AC1015 attempt died in VCarve's strict parser on the BLOCKS section
(Piotr 02.08.2026), hence this downgrade."* R12 **nie ma encji LWPOLYLINE** —
zamknięta polilinia zapisuje się tam jako `POLYLINE` + `VERTEX`… + `SEQEND`
z flagą `70 = 1`.

**Co zrobiłem.** Wybrałem R12, czyli wzorzec, na który CLAUDE.md wskazuje
palcem i który **działa dziś w produkcji u Piotra** (jamby z Production Core).
Vectric w swojej dokumentacji sam rekomenduje R12 do importu DXF. Semantycznie
nic nie tracimy: te same punkty, ta sama flaga „zamknięta", ta sama warstwa,
co w LWPOLYLINE, którą entmake'uje AutoLISP — tylko zapisane w dialekcie, o
którym wiadomo, że się wczytuje.

Rozważałem napisanie AC1015 z prawdziwym LWPOLYLINE. Odrzuciłem: poprawny
AC1015 wymaga uchwytów, znaczników podklas, tablicy BLOCK_RECORD, sekcji BLOCKS
i OBJECTS — czyli dokładnie tej maszynerii, na której poprzednia próba padła,
a **nie mam tu VCarve, żeby zweryfikować wynik**. Wypuszczenie niesprawdzonego
pliku w noc, po której rano jest akceptacja przy maszynie, byłoby gorsze niż
brak pliku.

**Decyzja dla Piotra.** Otwórz `W01-*.dxf` w VCarve.
- Jeśli wchodzą — zamykamy temat, R12 zostaje.
- Jeśli VCarve marudzi akurat na POLYLINE — powiedz, a dopiszę generator
  AC1015/LWPOLYLINE jako drugi dialekt (przełącznik w widoku CNC). To robota na
  pół dnia, nie przebudowa: `writeDxf()` jest już odseparowany od budowania
  encji, więc zmienia się wyłącznie serializator.

## #9 — Okucia: jedno przypisanie na ROLĘ, a nie na długość

**Co to.** `runner_pairs` to jedna rola BOM, ale projekt może potrzebować
prowadnic 440 **i** 490 (dwie szafy o różnej głębokości). BOM **liczy je
osobno** i pokazuje jako dwie pozycje do kupienia — ilości są poprawne — ale
przypisanie produktu jest jedno na rolę, więc obie długości wskazują na ten
sam wpis z listy materiałów.

**Co zrobiłem.** Ilości i specyfikacje są rozdzielone i widoczne, więc zamówienie
da się złożyć poprawnie już teraz. `materialAssignmentStore` ma już mechanizm
wariantów (`rola@wariant`), którego tu świadomie nie użyłem, żeby nie mnożyć
kontrolek bez potrzeby.

**Decyzja dla Piotra.** Czy w realnym zamówieniu prowadnice różnych długości to
różne produkty (różne kody u dostawcy)? Jeśli tak — włączam warianty per
długość, jedna zmiana w `BomPanel`, silnik i store są gotowe.

## #10 — Origin DXF: róg nominalnego prostokąta, taby wychodzą na minus

**Co to.** CLAUDE.md mówi „origin lewy-dolny róg formatki". Formatka z puzzlem
nie jest prostokątem: tab na BUR sięga do `x = −G`, a wybieg socketu wychodzi
6 mm poza krawędź. Origin jest więc w rogu **nominalnego prostokąta** (dokładnie
ten układ, w którym silnik już liczy — CLAUDE.md zasada 2 mówi nie zmieniać
formatu), a część geometrii ma współrzędne ujemne, bo fizycznie tam jest.
`$EXTMIN/$EXTMAX` w nagłówku podają prawdziwy zasięg, więc CAM widzi to od razu.

**Decyzja dla Piotra.** Jeśli wolisz, żeby cała formatka siedziała w dodatniej
ćwiartce (zero maszyny = róg materiału), to jedna flaga — przesunięcie o bbox.
Powiedz po otwarciu w VCarve, co jest wygodniejsze przy zerowaniu.

## #11 — Obrys TOP/BOTTOM przechodzi dolną krawędź dwa razy (tak jest w LISP-ie)

**Co to.** `drawTOP_ROT90` w `SKYLON_COMMON.lsp` buduje jedną polilinię, która
najpierw jedzie dolną krawędzią gładko `(x0,y0) → (x0+szer,y0)`, obchodzi resztę
formatki, wraca do `(x0,y0)` **i dopiero potem rysuje taby dolnej krawędzi**,
zamykając się z powrotem do `(x0,y0)`. Dolna krawędź jest więc w ścieżce dwa
razy. Silnik odtwarza to 1:1 (tura 1), a generator DXF przenosi wiernie.

**Czego NIE zrobiłem.** Nie „poprawiłem" tego. To geometria, którą Piotr tnie od
lat, a CLAUDE.md zasada 2 mówi wprost: nie zmieniać formatu geometrii silnika.

**Decyzja dla Piotra.** Sprawdź w VCarve, czy ścieżka TOP/BOTTOM liczy się
poprawnie. Jeśli VCarve robi z tego dziwną kompensację narzędzia — to jest
błąd do naprawienia W LISP-ie i w silniku naraz, świadomą decyzją, nie po cichu.

## #12 — `shelfHoles.spanMode: 'fullHeight'` przy zmiennych szufladach

**Co to.** BLOCKERS #3 (tura 1) opisuje quirk: rozstaw rzędów otworów półkowych
liczy się po PEŁNEJ wysokości korpusu, ignorując strefę szuflad — tak każe
`shelf_holes_quirk` w golden fixture. Po zadaniu 4 strefa szuflad może mieć
dowolną wysokość, więc quirk może wypchnąć rzędy jeszcze bardziej w strefę
szuflad niż przy sztywnych 200 mm.

**Co zrobiłem.** Nic — fixture jest golden, a `shelfHoles.followPositions: true`
sprawia, że gdy użytkownik faktycznie ustawi półki (a w edytorze zawsze ustawia,
bo clamp z zadania 3 nadaje im pozycje), otwory idą **za półkami** i quirk nie
ma zastosowania. Dotyczy więc tylko ścieżki „gołe liczby bez pozycji", czyli
fixtures i presetów.

**Decyzja dla Piotra.** Żadna nie jest pilna. Zapisane, żeby nie zginęło:
przełączenie `spanMode` na `'zone'` to jedna wartość w profilu, ale **zmieni
golden fixtures**, więc wymaga Twojej świadomej zgody.

---

# TURA 3

## #13 — SINK: oklejanie holderów — CSV mówi „bez", podsumowanie mówi „2 × szerokość wewnętrzna"

**Co to.** `KIT_SINK_FULL.lsp` przeczy sam sobie co do dwóch holderów (listew
pod zlewozmywak). `totalEdging` (L515–520) dolicza im `2 × szerRAIL` obrzeża,
natomiast własna lista formatek tego samego kitu (L599–602) wypisuje oba wiersze
HOLDER z `EDGE=''` i `EDG_L=0`. Dla wariantu SINK-A rozjazd to **1.128 m**
obrzeża.

**Co zrobiłem.** Fixture idzie za **listą formatek**, nie za podsumowaniem —
bo to lista trafia na oklejarkę, a podsumowanie jest liczbą na ekranie.
Zapisane w `golden-sink.json` jako `lisp_summary_quirks`, ta sama klasa
niezgodności co `lisp_summary_quirks` w `golden-wardrobe.json` (BLOCKERS #1).

**Czego NIE zrobiłem.** Nie „uzgodniłem" tego po cichu w żadną stronę.

**Decyzja dla Piotra.** Holdery przy zlewie okleja się czy nie? Jeśli tak —
zmiana jest w fixture I w silniku naraz, świadomie. Jeśli nie — quirk zostaje
opisany i zamykamy temat.

## #14 — Cokół: per jednostka czy per ciąg?

**Co to.** Faza 7 generuje cokół **per jednostka**: szafka 600 dostaje formatkę
cokołu 600. Ciąg czterech szafek 600 daje więc cztery formatki po 600, a nie
jedną 2400.

**Dlaczego tak.** Jednostka jest w tym programie jednostką rozliczeniową —
ma swój `unit_num`, swój ZIP, swój arkusz CNC. Cokół sklejony przez cały ciąg
nie należałby do żadnej jednostki i nie miałby gdzie trafić w eksporcie
per jednostka. Poza tym jednostki wolno przesuwać, a scalony cokół musiałby się
przy każdym ruchu przeliczać między meblami.

**Decyzja dla Piotra.** W warsztacie cokół tniesz na długość ciągu czy na
jednostkę? Jeśli na ciąg — to jest nowy byt („run"), którego model danych na
razie nie ma, i chcę to zrobić jako świadomą zmianę, a nie doklejkę.

## #15 — `verify_with_piotr` z SZEŚCIU nowych fixtures — NAJPILNIEJSZE

**Co to.** Zasada #1 wymaga fixture wyprowadzonego z LISP-a przed kodem —
zrobione, sześć plików, każdy z `status: PENDING_PIOTR_VERIFICATION`. Ale
„wyprowadzony z LISP-a" znaczy „zgodny z kodem", a nie „zgodny z tym, co
naprawdę wyjeżdża z maszyny". Poniżej pytania, które fixtures zadają wprost.
**Dopóki nie odpowiesz, silnik liczy sześć typów wg LISP-a, ale nikt tego nie
potwierdził na realnym meblu.**

**BUDR** (`golden-budr.json`)
- bok skrzynki = `round(0.70 × front)` → 237 / 178 / 118 przy 770 — zgadza się
  z prowadnicami, które kupujesz?
- rzędy prowadnic po OBU bokach na `y {56, 379, 636}` (dolny podniesiony o G)
- otwory na wkręty frontu na `y 96.5` (+G przy pierwszej szufladzie)
- fronty nakładają całą wysokość — dolny startuje od 0, bez `firstFrontAdjust`
  znanego z szafy

**WUD** (`golden-wud.json`)
- zawieszki: wzór otworów 21 / 53 od tylnej krawędzi, 53 od góry
- wycięcia w plecach 30 × 58 w górnych narożnikach
- `door_extend +38` przesuwa DOLNĄ puszkę na 138, górne liczone od góry frontu
- 2 zawieszki na jednostkę

**BUDTALL** (`golden-budtall.json`)
- **rozbieżność świadoma**: przy wysokości poniżej 1100 LISP po cichu bierze
  2100. Silnik zamiast tego podnosi do minimum 1100 i wystawia warning
  `MIN_HEIGHT`. Ciche 2100 uznałem za pułapkę, ale to Twoja decyzja.

**LOW_CABINET** (`golden-low-cabinet.json`)
- ten kit LICZY RAIL PARTITION w PANELS (szafa nie liczy) — fixture idzie za
  LISP-em; która konwencja BOM ma obowiązywać w całym projekcie?
- kit nie ma własnej listy formatek CSV — silnik emituje standardową konwencję

**SINK** (`golden-sink.json`)
- wzór wkrętów holderów: 2 na stronę na holder, G/2 od krawędzi, 30 / 70 od góry
- wkręty pleców 37 mm od krawędzi, `y {100, H/2, H−100}`
- tylna kolumna otworów półkowych na `sideW − 120`
- CSV podaje HOLDER jako 100 × szerokość wewnętrzna (obrócone) — piła chce tak?
- oklejanie holderów → #13

**FRIDGE** (`golden-fridge.json`)
- RAIL2 wyśrodkowany na `fridgeH/2` (pas 200 mm)
- BACK-TOP nachodzi na panel stały o G
- luzy SPURS: −8 na szerokość, −G na wysokość, 100 mm od frontu na klockach 25×25
- **boki mają PEŁNE czopy puzzla na tylnej krawędzi, mimo że nie ma pełnych
  pleców, które by je przyjęły** (LISP rysuje standardowe `drawBUL`/`drawBUR`) —
  to jest zamierzone czy przeoczenie w LISP-ie?

**Jak odpowiedzieć.** Wystarczy „tak / nie / poprawna wartość" przy każdym
punkcie. Po potwierdzeniu zmieniam `status` na `VERIFIED` i sekcja znika
z fixture.

## #16 — Import DXF pomieszczenia: skala i wybór obrysu

**Co to.** DXF nie niesie jednostki w sposób, na którym da się polegać
(`$INSUNITS` bywa 0 albo nieobecne). Import ma więc przełącznik mm / cm / m
w UI i domyślnie zakłada milimetry.

Drugi wybór: który obrys jest pokojem. Parser bierze **zamkniętą polilinię**,
a gdy jej nie ma — **największą otwartą**, a gdy i tego nie ma — łańcuch
połączonych odcinków LINE. Rzut z meblami, wymiarowaniem i tekstem da się w ten
sposób obsłużyć tylko dlatego, że reszta encji jest ignorowana (czytana jest
wyłącznie sekcja ENTITIES, wyłącznie LINE i LWPOLYLINE).

**Czego NIE zrobiłem.** Nie ma wyboru warstwy („weź obrys z warstwy WALLS"),
nie ma łuków (ARC) ani bloków (INSERT). Ściana po łuku nie zaimportuje się
w ogóle — pokój jest listą odcinków prostych i to jest założenie modelu, nie
niedoróbka parsera.

**Decyzja dla Piotra.** Przyślij jeden realny DXF rzutu od architekta. Jeśli
obrys siedzi na osobnej warstwie, dołożenie filtra warstwy to jedna pętla.
Jeśli w rzutach bywają ściany po łuku — to jest zmiana modelu pokoju i musi
być świadoma.
