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

## #17 — GitHub Actions nie przydziela runnera; CI tury 3 nie wystartowało

**Co to.** Workflow `.github/workflows/ci.yml` jest `active` i wpięty
w `push → main` oraz `pull_request → main`. Mimo to:

- PR tury 3 (#3, utworzony 19:47, plus push na gałąź o 19:50) **nie doczekał
  się żadnego przebiegu CI** — jedyny check na PR to „Vercel Preview Comments".
- Ostatni bieg CI w ogóle, `run_number 3`, wywołany Twoim własnym pushem na
  main (`e79ddc5`, 17:43), **stał w kolejce 15 minut i został anulowany** bez
  wykonania choćby kroku `checkout` (`conclusion: cancelled`, zero failed jobs).

To jest sygnatura **wyczerpanego limitu minut / wyłączonego billingu Actions**
na koncie, a nie błędu w repo: plik workflow się nie zmienił od tury 2, kiedy
przebiegi 1 i 2 poszły zielone w ~40 sekund.

**Czego NIE zrobiłem.** Nie dotknąłem `ci.yml` — działający plik, którego
zepsucie „na próbę" tylko zamazałoby prawdziwą przyczynę. Nie udawałem też
w BUILD-LOG, że CI jest zielone.

**Co jest zweryfikowane zamiast tego.** `npm ci && npm test && npm run build`
lokalnie na Node 22: **357 pass / 0 fail**, build czysty. Plus przebieg
end-to-end w Chromium: 10/10, zero błędów w konsoli.

**Decyzja dla Piotra.** Sprawdź **Settings → Billing → Actions** (limit minut
darmowego planu) oraz **Settings → Actions → General** (czy Actions nie zostały
ograniczone). Po odblokowaniu wystarczy „Re-run all jobs" na PR — nic w kodzie
nie wymaga zmiany.

# TURA 4

## #18 — Fazy 3 i 4 w jednym commicie (decyzja, nie problem)

**Co.** CLAUDE.md mówi „commit+push per faza". Fazy 3 (górne menu) i 4 (Library
w kategoriach) zostały zmergowane w jeden commit.

**Dlaczego.** Menu `Library ▸ kategorie` z fazy 4 jest wpisem w belce z fazy 3,
a panel Library traci przy tym Room setup / Design settings / Snap (przechodzą do
menu Settings). Rozbicie na dwa commity wymagałoby wstawienia w fazie 3 kodu
(„Library ▸ Units…" otwierające pełną listę), który faza 4 natychmiast usuwa —
czyli commita z kodem, który nigdy nie miał działać.

**Skutek.** Żaden: BUILD-LOG ma oddzielne werdykty dla obu faz, BACKLOG 7–9 mają
status DONE osobno, a historia nie zawiera martwego kroku. Decyzja nie wymaga
niczego od Piotra.

## #19 — Ostrzeżenie „szczelina szersza niż infill" usunięte (świadoma zmiana zachowania)

**Co było.** Tura 3: `sideInfill` zgłaszała każdą szczelinę do ściany szerszą niż
ustawienie („200 mm gap on the left is wider than the 20 mm infill setting").
Miało to sens, kiedy jednostka mogła stać płasko przy ścianie i każda szczelina
była pomyłką.

**Co jest teraz.** Po BACKLOG #15 jednostka **zatrzymuje się** 20 mm od ściany,
więc NORMALNY stan to „stoję gdzieś w pokoju, do ściany mam 1743 mm". To nie jest
błąd i to ostrzeżenie leciałoby przy każdym meblu, który nie stoi przy ścianie —
czyli przy większości.

**Co zostało.** Ostrzeżenie o **limicie warsztatu**: gdy ustawienie infilla jest
większe niż `autoParts.sideInfill.maxWidth` (120 mm), jednostka staje tak daleko,
że żadna skrobanka nie dosięga, i to jest powiedziane wprost — bo to ustawienie
do zmiany, a nie stan mebla.

**Decyzji Piotra nie wymaga.** Jeśli jednak brakuje sygnału „tu jest dziura, do
której nie wstawiono szafki", to jest osobna funkcja (audyt ciągu), nie ostrzeżenie
przy każdym ruchu — do wpisania do BACKLOG na życzenie.

## #20 — Numeracja szuflad w panelu: D3 / D2 / D1 od góry (decyzja, nie kompromis)

**Problem.** BACKLOG #1 mówi „góra listy = góra w 3D". Silnik numeruje szuflady
**od dołu** (D1 = przy podłodze) i tego nie da się odwrócić: tak są nazwane
formatki (`D1-SL`, `D1-DNO`), rzędy prowadnic i wiercenia, i tak mówią fixtures.

**Możliwości były dwie:**
- lista od góry z numerami silnika → czyta się **D3 / D2 / D1**;
- lista od góry przenumerowana → górny wiersz to „D1", ale w BOM „D1" to dolna
  szuflada.

**Wybrane: pierwsze.** Druga opcja rozjeżdża panel z listą cięcia, a to kończy
się wyciętym złym frontem. Kolejność jest 1:1 z 3D (o to był bug), a numer na
wierszu jest tym numerem, który zobaczy warsztat.

**Jeśli Piotr woli, żeby wiersze były „1, 2, 3 od góry"**, to jest zmiana o jedną
linię w `drawerRows` — ale wtedy trzeba świadomie zdecydować, że etykieta w panelu
NIE jest numerem z listy cięcia, i najlepiej pokazywać oba.

## #21 — CI tury 4 (wciąż BLOCKERS #17: billing Actions)

Nie dotykałem `ci.yml`. Stan z tury 3 nie zmienił się sam z siebie, więc jeśli
Actions nadal nie przydziela runnera, ten PR też nie dostanie zielonego checka
z GitHuba. Zamiast tego, lokalnie na Node 22: **`npm test` 410/410, `npm run build`
czysty, przebieg end-to-end w Chromium 26/26, zero błędów w konsoli**. To jest to
samo, co robi CI, plus przebieg w przeglądarce, którego CI nie robi.

**Do sprawdzenia przez Piotra (bez wpływu na turę):** Settings → Billing → Actions.

---

# TURA 5

Nic z poniższych nie blokowało tury — wszystkie fazy F1–F7 są zrobione. To są
**decyzje podjęte samodzielnie** (bo tryb był „zero pytań") i **jedna rzecz
świadomie nierobiona**. Piotr może każdą z nich odwrócić; każda jest zmianą
w jednym miejscu.

## #22 — „Spodnia widoczna szafek wiszących" NIE jest w presecie Non-sprayed

**Co mówi BACKLOG #35.** Preset ma wykluczać „fronty, drzwi, infille, plinth,
end panele, **spodnią widoczną wiszących**".

**Co mówi CLAUDE.md tury 5 (F2).** Lista wykluczeń: „fronty i drzwi (F/DF),
infille, plinth, end panele, top infill". Spodniej wiszących tam nie ma.

**Co zrobiłem.** Poszedłem za CLAUDE.md, bo to jest specyfikacja tej tury.

**Dlaczego to nie jest przeoczenie, tylko inny model danych.** Flaga
`finish_exposed` siedzi **na formatce**. Dno szafki wiszącej to JEDNA formatka
o dwóch licach: górne jest wnętrzem szafki, dolne widzi cała kuchnia. „Widoczna
spodnia" to więc nie `finish_exposed` na formatce, tylko **finish per LICO** —
a to jest dokładnie ten model, który #36 (Spraying) ma dopiero dostać.
Wpisanie dziś dna WUD do „sprayed" wyrzuciłoby całą formatkę z arkusza
nie-lakierowanego, choć wycina się ją razem z korpusem — czyli zamieniłoby jeden
zły preset na inny zły preset.

**Decyzja Piotra.** Jeśli warsztat chce dziś dno WUD na arkuszu „sprayed", to
jedna linia w `engine/cabinet.js` (`isFinishExposed` + rola/typ). Jeśli chce tego
**dobrze**, to czeka na finish-per-lico razem z #36 — i wtedy to samo rozwiąże
front lakierowany dwustronnie i plecy widoczne w otwartej zabudowie.

## #23 — `formatMm()` siedzi w `src/engine/format.js`, nie w `src/lib/`

**Co mówi CLAUDE.md (F1).** „…jedną funkcją formatującą `formatMm()` **w lib**".

**Co zrobiłem.** Wsadziłem ją do `src/engine/format.js` — modułu, który JEST
biblioteką formatowania tego projektu (`roundTo`, `rtos`, `snap`, `areaM2`).

**Dlaczego.** `engine/dimensions.js` (`distanceLabel`) musi jej używać, a silnik
nie importuje z `src/lib/` — to reguła z tury 1 i trzyma silnik czystym JS-em bez
zależności. Gdyby `formatMm` mieszkała w `src/lib/`, silnik dostałby albo import
w złą stronę, albo **drugą kopię reguły** — czyli dokładnie to, przed czym broni
cała faza F1 („JEDNA funkcja").

**Bez decyzji Piotra**, chyba że zależy mu na literalnej ścieżce; wtedy
`src/lib/format.js` re-eksportujący tę samą funkcję to jedna linia — ale zostanie
jeden punkt prawdy, nie dwa.

## #24 — Base height 720 zmienia domyślną szafkę dolną (było 770)

**Co się stało.** `profile.baseUnit.defaults.height` = **770** (z KIT_BUD_FULL).
CLAUDE.md tury 5 mówi „Base height (**720**)". Nowa szafka dolna przychodzi teraz
na 720, a nie na 770.

**Dlaczego tak.** F3 mówi wprost, że to są **defaulty PROJEKTU**, i podaje liczby.
Wysokość kitu (770) została nietknięta w profilu — to nadal ustawienie fabryczne,
z którego liczą golden fixtures. Zmieniło się to, na czym **ląduje jednostka
w projekcie**.

**Co Piotr powinien sprawdzić.** Czy 720 to wysokość korpusu, jakiej chce warsztat
(720 korpus + 100 nogi + blat), bo 770 + 100 = 870 to zupełnie inna kuchnia. Jeśli
770 było celowe — Design Settings ▸ Project heights ▸ Base height, jedno pole, i
cały projekt idzie za nim.

## #25 — Niska szafka (LOW_CABINET) NIE dziedziczy wysokości projektu

CLAUDE.md: „Nowa jednostka DZIEDZICZY wg swojej kategorii". LOW_CABINET siedzi
w kategorii `base`, więc literalnie powinna przyjść na 720 mm.

**Nie zrobiłem tego**, bo niska szafka na 720 mm to szafka dolna pod inną nazwą —
cała jej tożsamość to bycie niższą (domyślnie 600). Ma `heightGroup: null` i
zostaje przy swojej wysokości; panel nie pokazuje przy niej ani „custom", ani Reset.

**Jedna linia w `engine/types.js`**, gdyby Piotr wolał literalną wersję.

## #26 — Bug, którego nie znalazłyby ani testy, ani build

**Co się stało.** Po sprzątnięciu `Math.round` z UI plik `src/3d/Room.jsx` dostał
wywołania `formatMm()` i **nie dostał importu**. `npm test` był zielony (żaden test
nie montuje komponentu Reacta). `npm run build` **też był zielony** — bundler
traktuje nieznany wolny identyfikator jako zmienną globalną i dowiaduje się
dopiero w runtime. Etykiety ścian zabrały ze sobą całą kanwę 3D.

**Znalazła to przeglądarka**, w pierwszym przebiegu E2E fazy F7.

**Co dołożyłem.** `test/imports.test.js`: dla każdego pliku w `src/` sprawdza, że
każda nazwa eksportowana przez NASZ moduł, użyta jako goły identyfikator, jest
zaimportowana albo zadeklarowana. Zero zależności — dlatego jest testem, a nie
ESLintem. Sprawdziłem, że łapie dokładnie ten przypadek (usunięcie importu →
czerwony test z nazwą pliku).

**Do rozważenia przez Piotra (nie w tej turze).** To jest ~40 linii regexpów i
robi robotę linterowi. Jeśli kiedyś reguła „zero zależności" zostanie poluzowana
dla `devDependencies`, ESLint z `no-undef` robi to lepiej i przy okazji łapie
resztę tej klasy błędów.

## #27 — E2E jest w scratchpadzie, nie w repo

Przebieg w Chromium (start → … → eksporty, 15 zrzutów w `docs/turn5/`) był
napisany na wbudowanym `WebSocket` node 22 + CDP, żeby **nie dokładać Playwrighta**
(reguła „zero nowych zależności"). Sterownik został poza repo, bo to narzędzie
przebiegu, a nie kod aplikacji.

**Decyzja Piotra.** Jeśli ten przebieg ma być powtarzalny w CI, to albo wchodzi
Playwright do `devDependencies` (złamanie reguły, ale w miejscu, które nie jedzie
do przeglądarki klienta), albo sterownik CDP ląduje w `scripts/e2e.mjs` i staje
się kodem, który trzeba utrzymywać. Nie wybierałem za Piotra.

## #28 — CI (wciąż BLOCKERS #17 / #21: billing Actions)

`ci.yml` nietknięty. Jeśli Actions nadal nie przydziela runnera, ten PR też nie
dostanie zielonego checka z GitHuba. Lokalnie, Node 22: **`npm test` 471/471,
`npm run build` czysty, przebieg end-to-end w Chromium bez błędu w konsoli.**

## #29 — `sql/003_tura5.sql` NIE został uruchomiony

Tabela `cc_templates` (+ RLS + unikalny indeks po `lower(name)`) leży jako plik,
zgodnie z CLAUDE.md. Do czasu uruchomienia zapisane komplety siedzą w
`localStorage` (`cc.templates.v1`) i **działają w pełni** — mock-mode jest
działającą aplikacją, nie demem. To samo dotyczy `sql/002_tura3.sql` (BACKLOG #26).

---

# TURA 6

## #30 — E2E jest w repo teraz (odpowiedź na #27, wybrana wersja B)

BLOCKERS #27 zostawiał Piotrowi wybór: Playwright do `devDependencies` (złamanie
reguły „zero nowych zależności") albo sterownik CDP jako kod w repo. Tura 6
wybrała **drugie** — `scripts/cdp.mjs` + `scripts/e2e-turn6.mjs`, node 22,
wbudowany `WebSocket`, zero zależności.

**Dlaczego nie zostawiłem tego znów w scratchpadzie.** Tura 5 pokazała, że
przeglądarka znajduje rzeczy, których nie znajdzie ani `npm test`, ani `npm run
build`. Tura 6 to potwierdziła dwa razy: kontur w renderze (drei rysuje grubą
linię jako `LineSegments2`, czyli **Mesh**, więc test „to nie jest linia" go
przepuścił) i ściana zasłaniająca kadr (auto-chowanie ścian liczy się co klatkę
dla kamery EDYTORA, a render patrzy własną). Narzędzie, które łapie takie rzeczy,
nie powinno ginąć razem z sesją.

**To nadal nie jest w CI** — CI nie ma runnera (#28). Uruchamia się ręcznie:
`npm run build && npm run preview -- --port 4173`, potem `node scripts/e2e-turn6.mjs`.

## #31 — Sonda środowiskowa kosztuje, i ma przełącznik

CLAUDE.md wymaga w widoku roboczym „taniego liftingu (environment + cienie
kontaktowe + fazy)" **bez odczuwalnego spadku wydajności**. Zmierzone w Chromium
na rasteryzatorze programowym (SwiftShader — kontener nie ma GPU), 8 szafek z
drzwiami, przebiegi przeplatane A/B:

| konfiguracja | fps |
|---|---|
| tura 5 (stan wyjściowy) | **5,6** |
| tura 6, wszystko włączone | **3,4** |
| tura 6, View ▸ Realistic lighting **wyłączone** | **5,9** |

Cała różnica to sonda IBL: próbkowana dla każdego oświetlonego piksela każdej
formatki. Fazy krawędzi, cienie kontaktowe i miękkie cienie są **darmowe** —
z wyłączoną sondą scena jest szybsza niż w turze 5, bo ściany i podłoga
przeszły na `meshLambertMaterial` i wypadły ze ścieżki IBL (`scene.environment`
dociera wyłącznie do `MeshStandardMaterial`).

**Co zrobiłem i czego nie rozstrzygam.** Sonda jest ON domyślnie, bo to jest
większość tego, po co jest tura 6, a na prawdziwym GPU jej koszt to błąd
zaokrąglenia. Przełącznik jest w View, żeby słabsza maszyna miała wyjście.
Render **zawsze** zapala oświetlenie z powrotem, niezależnie od przełącznika.
Czy default ma zostać ON — to obserwacja dla Piotra na jego sprzęcie, nie pytanie
blokujące.

## #32 — Zmiany, które przesuwają liczby w BOM (świadome)

Dwie rzeczy z tury 6 zmieniają istniejące wyniki, obie na wprost z CLAUDE.md:

1. **End panel i infille liczą się do arkusza FRONTÓW**, nie do płyty korpusowej
   (`material_role: 'front'`). Do tury 5 ciąg z dwoma end panelami zamawiał płytę
   korpusową, której nikt nie miał zużyć, i zamawiał za mało materiału frontowego.
   **Plinth zostaje na płycie** — jest lakierowany, ale to lakierowany MDF ze
   stosu płytowego, i CLAUDE.md nie kazał go ruszać.
2. **Top infill to jedna formatka na ciąg**, nie po jednej na szafkę. Ciąg
   3 × 600 mm miał do tej pory trzy wiersze po 600; ma jeden 1800. Suma metrów
   bieżących jest podobna, ale **liczba pozycji na liście cięcia spada** — i to
   jest cel, nie efekt uboczny.

Oklejanie mitrowanych pasków: krawędź wchodząca w mitrę jest klejona, więc nie
dostaje obrzeża. Słownik kodów z LISP-a nie zna „jednej krawędzi wzdłuż", więc
kod mówi `^v`, a długość mówi jedną długość. Do przemyślenia, jeśli kiedyś
słownik będzie poszerzany — nie zmieniałem formatu CSV.

## #33 — Plinth w kształcie L nie został zrobiony

BACKLOG #20 mówi „infille/plinth w kształcie L". CLAUDE.md F4 opisuje wyłącznie
infille — pionowy L i top infill — i nie wspomina o cokole ani słowem. Zrobiłem
to, co jest w CLAUDE.md, a plinth wydzieliłem do **BACKLOG #40**, żeby nie
zniknął razem z zamkniętym #20. Nie jest to pytanie: to zapisane pominięcie.

## #34 — `sql/` wciąż nieuruchomione

Bez zmian względem #29 i BACKLOG #26. Tura 6 nie dodała żadnego pliku SQL i nie
uruchomiła żadnego z istniejących. Render, rysunki i infille są w całości
lokalne — nic z tej tury nie potrzebuje bazy.

---

# TURA 7

## #35 — Dwie wysokości startowe, które są MOJE, nie z LISP-a

CLAUDE.md F2 każe typowi projektu ustawiać „defaulty wysokości projektu". Kuchnia
nie nadpisuje niczego i to jest bezpieczne: wysokości w `profile.projectHeights`
**są** kuchnią, a nadpisanie ich w drugim miejscu byłoby dwoma źródłami jednej liczby.

Dwie liczby są jednak nowe i nie ma ich w żadnym kicie:

| typ | co ustawia | dlaczego tak |
|---|---|---|
| Wardrobe | `tall: 2400` | zabudowana szafa idzie wyżej niż 2150 wolnostojącej |
| Vanity | `base: 700` | 770 korpusu + 100 nóżek + blat to umywalka na 890 |

Obie siedzą w `profile.projectTypes` — jedno miejsce, jeden plik. Obie są PUNKTEM
STARTU: Design Settings ▸ Project heights nadpisuje je w sekundę i wtedy cały projekt
idzie za tym.

**Co Piotr powinien sprawdzić:** czy warsztat buduje szafy na 2400 i umywalki na 700
korpusu. Jeśli nie — dwie liczby w `profile.projectTypes`, i nic więcej.

## #36 — Kontrolny DXF do VCarve dla pojedynczego socketu — NIE zrobiony

BACKLOG #28 kończy się słowami „Fix w czacie + **kontrolny DXF do VCarve**". Fix jest
zrobiony i przypięty testami, które PRZELICZAJĄ próg (264,5 mm) z geometrii socketu;
DXF wychodzi z tych samych danych co zawsze, bo zmiana siedzi w `socketCentres()`
i nic poniżej nie zostało pouczone osobno.

Czego NIE mogę zrobić: otworzyć tego pliku w VCarve i zobaczyć, że ścieżka narzędzia
jest taka, jakiej warsztat oczekuje. To jest sprawdzenie na maszynie, nie w node.

**Jak to zrobić:** postaw szafkę o głębokości poniżej 264,5 + 18 mm (np. **250 mm**),
Output ▸ CNC / DXF, otwórz `BUL`/`TOP` w VCarve. Spodziewane: jeden pocket na środku
krawędzi zamiast dwóch, dwa otwory ⌀7,5 zamiast czterech, jeden tab na blacie w tym
samym miejscu.

## #37 — Trzy taby na NISKIM korpusie: ta sama rodzina, nie zrobione

Tura 7 rozwiązała sockety przy PŁYTKIM korpusie. Po drugiej osi jest bliźniak:
`tabCentres()` daje trzy taby po tylnej krawędzi boku (95, H/2, H−95), a przy wysokości
poniżej ~310 mm środkowy zaczyna wchodzić w skrajne — dogbone to ±30 wokół każdego
środka, więc skrajny sięga 125, a środkowy zaczyna się na H/2 − 30.

`LOW_CABINET` ma `minHeight: 300`, więc przypadek jest osiągalny z UI.

**Nie zrobiłem tego**, bo CLAUDE.md F4 mówi wyłącznie o socketach i wyłącznie o
szerokości boku. To jest zapisane pominięcie, nie przeoczenie — wypisane też jako
**BACKLOG #47**, żeby nie zginęło razem z zamkniętym #28.

## #38 — Numer projektu nie jest unikalny, i nic tego nie pilnuje

Auto-propozycja liczy od najwyższego numeru **na tej półce** (localStorage). Dwa
stanowiska bez wspólnej bazy zaproponują ten sam numer; pole jest edytowalne, więc
Piotr może wpisać co chce, i nic nie sprawdza, czy taki numer już istnieje.

To jest w porządku dopóki `cc_projects` nie jest używane. Kiedy będzie: numer chce
unikalnego indeksu i propozycji z BAZY, nie z półki (**BACKLOG #48**).

## #39 — Sety ustawień żyją tylko na tym komputerze

`cc.settingsSets.v1` w localStorage, bez tabeli i **bez pliku SQL**. Mock-mode ma
DZIAŁAĆ, a nie ostrzegać (CLAUDE.md reguła 7), więc sety działają w pełni — po prostu
nie jeżdżą między stanowiskami.

Kiedy mają jeździć: tabela + RLS + migracja, dokładnie wzorem `cc_templates`
(`sql/003_tura5.sql`, wciąż nieuruchomiony — patrz #29/#34). Tura 7 **nie dodała
żadnego pliku SQL i nie uruchomiła żadnego istniejącego**.

## #40 — „Select from JoineryCore" jest disabled, i tak miało być

CLAUDE.md F2 mówi wprost: przycisk klienta z JoineryCore **disabled „soon"**. Zrobiona
jest LOKALNA połowa sprzężenia i ona jest prawdziwa: badge „JC" to funkcja danych
materiału (`jc_uuid` albo `source: 'jc'`), nie flaga, którą ktoś ustawia — wczytanie
prawdziwego stocku przez `setMaterials` zapali badge na każdym kafelku i nic innego się
nie zmieni.

Czego nie ma: samego połączenia (API + token, tenant z tokena, SPEC sekcja 8).
To zostaje w **BACKLOG #41** jako część niezrobiona.

## #41 — Wydajność: liczby są z rasteryzatora programowego, i to widać

Kontener nie ma GPU (SwiftShader) — to samo, co BLOCKERS #31 zapisał w turze 6.
Pomiar tury 7, 10 szafek dolnych z drzwiami, przebiegi przeplatane po 5 s:

| tryb | fps (średnia z 3) |
|---|---|
| normalny | **2,87** |
| X-ray | **2,83** |

To, co ten pomiar udowadnia, to że **X-ray nie kosztuje nic mierzalnego** — o to prosi
CLAUDE.md F3. Liczba bezwzględna nie mówi nic o maszynie Piotra.

Warto zapisać, jak omal nie skłamała: pierwsze przebiegi dawały 0,7 fps i wyglądały
jak regres wobec tury 6. Kontener niósł **czterdzieści osieroconych procesów Chromium**
z wcześniejszych, przerwanych przebiegów. Po ich zabiciu liczby są stabilne i
powtarzalne. Pomiar wydajności na współdzielonej maszynie mierzy maszynę, dopóki się
tego nie sprawdzi.

## #42 — Elewacje ścian per-projekt: świadomie NIE w tej turze

CLAUDE.md F1 kończy się zapisaną decyzją: „per-szafka najpierw (dziedzictwo LISP,
wartość warsztatowa); elewacje ścian per-projekt → następna tura". Tak jest.

Maszyneria jest gotowa i to nie jest obietnica: `engine/drawings/` niesie prymitywy,
arkusz z ramką i tabelką, warstwy, renderery SVG i PDF, wybór skali i papieru oraz
booklet wielostronicowy. Elewacja ściany to nowy UKŁAD nad tym wszystkim, nie nowy
styl. **BACKLOG #46**.

## #43 — SQL wciąż nieuruchomione

Bez zmian względem #29, #34. Tura 7 nie dodała żadnego pliku SQL i nie uruchomiła
żadnego z istniejących (`sql/002_tura3.sql`, `sql/003_tura5.sql`). Karta produkcyjna,
flow, X-ray, sockety i insety są w całości lokalne — nic z tej tury nie potrzebuje bazy.

---

# TURA 8

## #44 — Skany EGGER w 3D: decyzja jest Piotra, zgody pisemnej nadal nie ma

Tura 5 czytała *EGGER General Terms for Image Use* jako zakaz używania skanów płyt
jako tekstur 3D bez pisemnej zgody i zbudowała wokół tego cały mechanizm: własne
proceduralne słoje tonowane średnim kolorem dekoru, plus test, który tej linii
pilnował. CLAUDE.md tury 8 tę decyzję **cofa** — „decyzja Piotra 07.08, koniec
proceduralnego drewna na dekorach" — i tak jest zrobione: 69 skanów z Supabase
Storage, dekor woodgrain nosi obraz producenta.

**To jest decyzja Piotra i została wykonana bez dyskusji.** To jego relacja
z dostawcą, jego warsztat i jego ryzyko. Co można było zrobić kodem, zostało zrobione:

- obraz pokazywany **w całości i bez edycji** — `tint: false` wszędzie, gdzie jest
  prawdziwy skan, więc nic go nie przebarwia ani nie kadruje;
- atrybucja „EGGER {code} {name}" **bezwarunkowa** — nie ma ścieżki, która rysuje
  dekor bez niej;
- nota o reprodukcji jedzie z nią;
- skan spoza `https://` jest odrzucany, zanim trafi do loadera tekstur.

**Czego kod nie załatwi:** samej zgody. `meta.tex_note` w pliku dekorów mówi to
wprost — „Public demo/sale of CC still requires written EGGER consent". Dopóki jej
nie ma, wersja publiczna (demo dla klientów spoza warsztatu, sprzedaż aplikacji)
stoi na tej samej pozycji co przed turą 8. Do wewnętrznej pracy warsztatu Piotra
zmiana jest zrobiona i działa.

**Co Piotr powinien zrobić:** napisać do EGGER-a o zgodę na użycie skanów dekorów
jako tekstur 3D w oprogramowaniu, z atrybucją. Jeśli odpowiedź będzie odmowna,
powrót jest jedną linijką — `finishFromDecor()` ma fallback proceduralny na miejscu
i pokryty testem, bo jest używany dla dekorów bez skanu i dla maszyn bez sieci.

## #45 — Mitra jest na PASKACH, nie na wszystkim, co ma otwarty koniec

CLAUDE.md F6 mówi o infillach i tak jest zrobione: pasek dostaje ścięcie 45° tam, gdzie
jego przekrój 40+~80 spotyka się w widocznym narożniku, i to jest ta „rama obrazu",
o którą prosi Piotr.

Czego mitra NIE dotyka, świadomie:

- **infilla BOCZNEGO** — `infillMitre()` odmawia cięcia wszystkiemu, co nie jest
  `side: 'top'`, i to jest decyzja, nie przeoczenie: tura 6 opisuje ramię A bocznego
  L jako PRZYKRĘCONE do boku korpusu, a przykręcony styk to nie mitra. Test tego
  pilnuje, żeby nikt nie „naprawił" tego przypadkiem. Jeśli warsztat mitruje także
  pionowy filler — jedna linijka i flaga w silniku. **BACKLOG #51**;
- **end paneli** — czoło end panela to płyta oklejona obrzeżem, nie mitra, i tak jest
  w warsztacie;
- **BOM i DXF** — bez najmniejszej zmiany. Flagi `mitre_45` były w danych od tury 3,
  formatka jest tym samym prostokątem, a ścięcie to operacja piły, nie inny arkusz.
  Test tego pilnuje: geometria 3D ma fazy, a `panel.w/h` po mitrze są co do milimetra
  te same, co przed nią.

## #46 — Wydajność tury 8: nadal SwiftShader, i jedna liczba, której NIE wolno porównać

Kontener nie ma GPU — trzecia tura z rzędu, po #31 (tura 6) i #41 (tura 7). Pomiar
tury 8: **10 korpusów dolnych, bez drzwi**, kolor natryskowy (bez skanów), rig
z cieniem i linie złącza włączone, po 5 s na przebieg, po 3 przebiegi:

| tryb | fps (średnia z 3) | przebiegi |
|---|---|---|
| Solid | **4,40** | 4,40 · 4,60 · 4,19 |
| X-ray | **4,37** | 4,36 · 4,30 · 4,46 |

Co ta liczba mówi: **X-ray dalej nie kosztuje nic mierzalnego** (różnica mniejsza niż
rozrzut między przebiegami tego samego trybu), a rig z cieniem z F1 plus cztery
`LineSegments` na jednostkę z F8 nie położyły klatki.

Czego ta liczba NIE mówi i czego **nie wolno** z niej wyciągnąć:

- to **nie jest** poprawa wobec 2,87 z tury 7. Tamten przebieg miał na szafkach DRZWI,
  ten nie ma. Dwa różne meble, dwie różne liczby, zero wniosku;
- **koszt skanów nie jest zmierzony** — domyślny projekt idzie w kolorze natryskowym,
  więc przez ten pomiar nie przeszła ani jedna tekstura EGGER-a. 69 obrazów sRGB
  z anisotropy 8 to jedyna rzecz z tej tury, która może realnie ważyć na maszynie
  Piotra, i o niej ten pomiar milczy;
- liczba bezwzględna z rasteryzatora programowego nie mówi nic o żadnej prawdziwej
  maszynie.

**Do zrobienia u Piotra, na jego sprzęcie:** projekt kuchni z dekorem woodgrain na
korpusach i drzwiami, i sprawdzenie, czy scena chodzi. To jest jedyny pomiar, który
w tej sprawie cokolwiek znaczy.

## #47 — Czego render dalej nie ma

Zrobione w F1 jest to, o co prosi CLAUDE.md, i nic ponad to. Brakuje trzech rzeczy,
które przy tej okazji były na wyciągnięcie ręki i **nie zostały** wzięte, bo żadna
nie jest w tej turze:

- **bloom / rozkwit świateł** — wymaga potoku post-processingu (EffectComposer), którego
  ta aplikacja nie ma. To nie jest zależność (three go niesie), ale to jest drugi
  przebieg renderowania i drugie miejsce, w którym obraz może być zły. **BACKLOG #52**;
- **mapy normalnych dla dekorów drewnopodobnych** — skan EGGER-a daje KOLOR słoja,
  nie jego relief. Płyta melaminowa jest prawie płaska, więc brak jest uczciwy, ale
  synchro-pory (dekory strukturalne) będą przez to wyglądały gładko. Też #52;
- **„Show all dimensions" rysuje ETYKIETY, nie linie wymiarowe ze strzałkami** —
  z F7 przełącznik działa i pokazuje komplet wymiarów szafki, ale w stylu etykiet,
  nie w stylu strzałek z tury 5. **BACKLOG #53**.

## #48 — Migracja półek sięga tylko tam, gdzie sięga aplikacja

F4 zmieniło kształt danych półki: doszły `variant`, `updown_locked` i `front_mm`,
a `shelf_schema: 2` odróżnia projekt po migracji od projektu sprzed niej.
`migrateUnitShelves()` jest bezwarunkowe i idempotentne — każdy projekt, który
przechodzi przez `projectStore`, wychodzi z niego w nowym kształcie, i dotyczy to
zarówno cache w przeglądarce, jak i pliku wczytanego z dysku.

Czego migracja NIE dotknie: **wierszy leżących w Supabase**. Nic ich nie przepisuje
w miejscu — dostaną nowy kształt dopiero, kiedy ktoś otworzy taki projekt w aplikacji
i go zapisze. Dla warsztatu Piotra to jest bez znaczenia (projekty i tak są otwierane),
ale gdyby kiedyś coś czytało te wiersze POZA aplikacją, przeczyta stary kształt.
Migracja w SQL to jedna instrukcja `UPDATE` i nie jest napisana. **BACKLOG #54**.

## #49 — SQL wciąż nieuruchomione

Bez zmian względem #29, #34, #43. Tura 8 nie dodała żadnego pliku SQL i nie uruchomiła
żadnego z istniejących (`sql/002_tura3.sql`, `sql/003_tura5.sql`). Światło, materiały,
sloty, półki, mitra, menu i złącza są w całości lokalne — nic z tej tury nie potrzebuje
bazy. Skany dekorów są czytane z **publicznych URL-i** Supabase Storage podanych
w danych; nie ma tu zapytania, klucza ani sesji.

## #50 — W tym silniku nie ma PIONOWEGO partitionu (zakres F4)

CLAUDE.md tury 9, F4, kończy się strażnikiem zakresu: „półki (regulowane + stałe)
i pionowe partitiony". Pionowego partitionu w tym silniku **nie ma**.

Co jest: `PARTITION` i `RAIL-PART` — POZIOME płyty o roli `shelf`, budowane przez
silnik ze stosu szuflad (albo z railu) pod nimi; oraz `DP`, pionowy panel niosący
prowadnice, który nie jest elementem użytkownika, tylko częścią mechanizmu szuflad
i wynika z ich liczby i osadzenia.

Co z tego wykonano: półki obu wariantów w pełni (cofnięcie, grubość, materiał,
przeciąganie w głąb). Partitiony są **zaznaczalne i podświetlane** — F4.1 prosi
o to wprost („and partitions where they render") — i dostają jedno realne
nadpisanie, cofnięcie od lica (`partition_front_mm`, istnieje od tury 8, bo
partition pod blatem czasem musi wyjść na lico). Grubości ani materiału NIE
dostają, i to nie jest przeoczenie: szerokość, wysokość i pozycja partitionu
wynikają ze stosu pod nim, więc nie ma pozycji (`items[]`), na której taka
wartość mogłaby zamieszkać — a dopisanie jej na jednostce byłoby drugim miejscem,
z którego bierze się płyta partitionu, obok `board_t`.

Gdyby warsztat rzeczywiście chciał pionowej przegrody jako ELEMENTU (dzielić
szafkę na dwie kolumny), to jest nowy typ pozycji w `items[]` plus formatka
w `computeCabinet()` — czyli robota na własną fazę, nie dopisek do tej.

## #51 — Zaznaczona półka nie chodzi w pionie MYSZĄ

F4.2 mówi wprost: „With a shelf selected, dragging it moves it along the unit's
depth axis". Wykonane dosłownie, i cena jest taka, że dopóki półka JEST
zaznaczona, ten sam chwyt nie ruszy jej w górę ani w dół.

Złagodzone tak, jak się dało bez łamania reguły: pierwsze dotknięcie
niezaznaczonej półki dalej ciągnie ją w PIONIE (i przy okazji ją zaznacza), więc
oba gesty są dostępne i żaden nie potrzebuje klawisza modyfikującego; Escape
oddaje pionowy przeciąg; wysokość jest polem liczbowym w sekcji elementu przez
cały czas i idzie przez tę samą klamrę co przeciąganie.

Gdyby to okazało się mylące przy biurku, alternatywa jest jedna i tania: oś
decydowana KIERUNKIEM ruchu w pierwszych kilku pikselach przeciągnięcia, zamiast
stanem zaznaczenia. Nie zrobione, bo CLAUDE.md mówi co innego, a zgadywanie osi
z ruchu myszy bywa gorsze niż reguła, której można się nauczyć.

## #52 — Cień kontaktowy piecze się przy KAŻDEJ zmianie układu, także w trakcie przeciągania

`frames={1}` plus React-owy `key` liczony z dopasowania do mebli robi dokładnie
to, o co prosi CLAUDE.md F1.3: raz na zmianę układu, nie raz na klatkę. Orbitowanie
— czyli to, co się w tym widoku robi najczęściej — kosztuje zero.

Czego to nie omija: **przeciągania szafki**. Układ zmienia się wtedy przy każdym
zdarzeniu wskaźnika, więc plama przepieka się z tą częstotliwością, a przepieczenie
to nowy render target 512² plus przebieg głębi i cztery przebiegi rozmycia. To jest
mniej więcej koszt `frames={Infinity}` przez czas trwania przeciągania — i to
jest ŚWIADOMY wybór, bo alternatywa (kwantyzacja klucza do grubszej siatki) to
cień, który skacze za szafką skokami zamiast za nią jechać.

Gdyby to bolało na słabym GPU: najtańsze wyjście to wygaszać plamę na czas
przeciągania i przepiec ją raz na `pointerup`. Nie zrobione, bo znikający cień
w trakcie ruchu to dokładnie ten artefakt, którego F1 miało się pozbyć.

## #53 — SQL wciąż nieuruchomione

Bez zmian względem #29, #34, #43, #49. Tura 9 nie dodała żadnego pliku SQL i nie
uruchomiła żadnego z istniejących (`sql/002_tura3.sql`, `sql/003_tura5.sql`).

Wszystko, co ta tura dołożyła do DANYCH, jest lokalne i jedzie w tych samych
JSON-ach co reszta projektu: nadpisania elementu (`thickness_mm`, `material_id`,
`material_label`, `front_mm`) siedzą na pozycji w `params.sections[].items[]`,
a przeskalowany sheen w `design.sheen` ze stemplem `schema: 2`. Round-trip przez
localStorage jest przetestowany (`test/element-editing.test.js`).

Co z tego wynika dla bazy — to samo, co w #48: wiersze leżące w Supabase dostaną
nowy kształt dopiero wtedy, gdy ktoś otworzy taki projekt w aplikacji i go zapisze.
Dla sheenu jest to szczególnie warte zapisania, bo migracja jest JEDNOKIERUNKOWA:
projekt zapisany przez aplikację tury 9 ma `schema: 2` i już nigdy nie zostanie
przemnożony, ale projekt czytany z bazy przez coś INNEGO niż ta aplikacja
przeczyta 60 i nie będzie wiedział, czy to stara skala, czy nowa. Migracja w SQL
to jedna instrukcja `UPDATE` po `schema` i nie jest napisana.

---

## #54 — Cień kontaktowy był NIEWIDOCZNY od tury 9, i nie miało to nic wspólnego z GPU

**Co blokowało.** Właściciel zgłosił, że cienia pod szafkami nie ma albo
prawie nie ma. Tura 9 zdiagnozowała jedną przyczynę (`scale` z domyślną 10
w drei — wypiek 1,8 m rozciągnięty na 18 m) i właściciel wgrał na main
`scale={1}` jako hotfix. To była prawdziwa przyczyna, ale nie jedyna, i po
niej cień nadal nie istniał.

**Co znalazłem (F2.2, zmierzone).** `<ContactShadows>` piecze cień do render
targetu, a potem rozmywa go, renderując quad `blurPlane` tą samą kamerą
ortograficzną. `blurPlane` nigdy nie trafia do grupy komponentu — jego macierz
świata to identyczność. Kamera jest dzieckiem grupy. Tura 9 dała grupie
`position={[cx, 1 mm, cz]}`, więc:

- w x/z rozmycie czytało i pisało obszar przesunięty o (cx, cz);
- w y — kamera patrzy DO GÓRY, a `near` w drei to domyślnie 0, więc quad
  wylądował milimetr ZA płaszczyzną bliską, został obcięty, a przebieg rozmycia
  nadpisał dobry wypiek pustym targetem.

Sonda `gl.readRenderTargetPixels` wstawiona LOKALNIE (nigdy nie commitowana)
między dwa wywołania drei: **max alpha 255 przed rozmyciem, 0 po nim.** Po
naprawie 255 → **185**. `verify/t10/bake-probe.json`.

**Dlaczego to jest w BLOCKERS, skoro naprawione.** Bo to jest ostrzeżenie na
przyszłość, a nie zamknięta sprawa: **każde** przesunięcie grupy
`<ContactShadows>` z powrotem pod mebel skasuje cień ponownie, cicho i na każdej
maszynie. Warunek („grupa stoi w (0, ≤0, 0)") nie wynika z API drei i nie
zgłasza się żadnym błędem. Jest opisany w `3d/Scene.jsx FloorShadow` w całości
i zapisany w BACKLOG #58 jako kandydat na własną implementację.

**Co Piotr decyduje.** Nic — chyba że BACKLOG #58 (własny cień kontaktowy,
~60 linii) ma wejść wcześniej niż „kiedyś". Wtedy znikają dwa kompromisy:
płótno większe od mebla i 0,5 mm, o które opuszczony jest pokój.

## #55 — Sonda z F2.2 wymagała ŁATKI na `node_modules` i nie da się jej wysłać

**Co blokuje.** CLAUDE.md F2.2 prosi wprost o sprawdzenie, czy wypiek cienia
w ogóle coś zapisuje w TYM środowisku, przez `gl.readRenderTargetPixels` po
wypieku. Nie ma na to żadnego haka publicznego: render target żyje wewnątrz
`useMemo` komponentu drei i nie wychodzi na zewnątrz ani propsem, ani refem.

**Co zrobiłem.** Jedna linia dopisana lokalnie do
`node_modules/@react-three/drei/core/ContactShadows.js`
(`window.__ccProbe?.(gl, renderTarget, scene)` po `gl.setRenderTarget(null)`,
i drugi hak przed rozmyciem), zbudowane, zmierzone, **łatka cofnięta**,
zbudowane ponownie. Zrzuty w `verify/t10/` pochodzą z BUILDU CZYSTEGO,
nie z załatanego — dlatego bieg finalny wypisuje przy kryterium E
„no drei probe in this build" zamiast udawać, że coś zmierzył.

**Konsekwencja, o której trzeba wiedzieć.** Trzy liczby kryterium E (liczba
wypieków, alfa wypieku, liczba świateł rzucających cień) da się odtworzyć tylko
powtarzając łatkę. `scripts/e2e-turn10.mjs` niesie po swojej stronie cały hak
(`PROBE`) i jest bezczynny bez niej, więc powtórka to jedna linia w drei plus
`npm run build`. Instrukcja jest w komentarzu przy `PROBE` w skrypcie.

**Czego to NIE oznacza.** Środowisko nie jest ślepe na cień — po naprawie
sonda mierzy 185/255 alfy, a zwykły zrzut ekranu pokazuje plamę, którą widać
gołym okiem. Sytuacja „środowisko ślepe na tę funkcję", o której mówi
CLAUDE.md F2.2, **nie wystąpiła**, więc wizualnego podpisu nie oddaję —
oddaję go tylko w części „czy to ładne", co i tak zawsze należy do właściciela.

## #56 — `frames={1}` w drei nie znaczy „jeden wypiek na zawsze"

**Co blokuje.** Licznik klatek w `<ContactShadows>` to zwykłe `let count = 0`
w CIELE komponentu, nie `useRef`. Resetuje się przy każdym re-renderze Reacta,
więc `frames={1}` znaczy „jeden wypiek na re-render". Komentarz w
`3d/Scene.jsx` mówił „piecze raz i przestaje na zawsze" i to było za mocne.

**Co zmierzone.** Pełny bieg akceptacyjny (trzy szafki, drzwi, kolor, dwie
zmiany sheenu, sześć orbit): **24 wypieki**. Sama orbita, dwa przeciągnięcia
i pięć sekund bezczynności: **0 wypieków** — i to jest liczba, o którą chodzi
w kryterium E, bo orbitowanie jest tym, co joiner robi cały dzień. Kryterium
E w skrypcie mierzy teraz DELTĘ przez orbitę, a nie sumę biegu.

**Co Piotr decyduje.** Nic dziś. Jeśli kiedyś okaże się, że przeciąganie szafki
myszą klatkuje (BLOCKERS #52 z tury 9 mówi o tym samym z innej strony),
odpowiedzią jest zdławienie re-renderów `FloorShadow`, a nie zmiana `frames`.

## #58 — Grubość PER ELEMENT dla czterech paneli złącza (zakres F3.1)

CLAUDE.md tury 11, F3.1, wymienia „thickness override" wśród pól, które ma
dostać każdy element. Cztery z nich go NIE dostają: **bok lewy, bok prawy,
wieniec i dno** — oraz **plecy**, które w te cztery wchodzą gniazdami.

**Dlaczego to nie jest przeoczenie.** Korpus trzyma złącze puzzlowe, a jego
geometria jest liczona z JEDNEJ grubości płyty `G` (`engine/puzzle.js`):
czop ma szerokość `G`, jego ulga dog-bone jest wymiarowana od `G`, oś gniazda
leży na `G/2 + centrelineExtra`, a przelot gniazda poza krawędź to
`socketOvershoot`. Bok 22 mm w korpusie 18 mm nie jest grubszym bokiem — jest
złączem, które się nie składa: czop wieńca jest cięty na 18, a gniazdo w boku
wypada na osi 11,5 zamiast 9,5. To nie jest błąd, który widać na ekranie;
to jest paczka formatek, która nie wchodzi w siebie na stole montażowym.

**Co zamiast tego jest.** Panel tych elementów pokazuje pole grubości i wiąże
je z PŁYTĄ KORPUSU (`board_t`) — bo to jest prawdziwa grubość tego kawałka —
i pisze pod nim, dlaczego jest jedna dla wszystkich czterech. MATERIAŁ jest
nadpisywalny dla każdego z nich bez wyjątku, bo materiał nie zmienia ani
jednego wymiaru.

**Co by trzeba zrobić.** Policzyć złącze per PARA paneli zamiast per korpus:
`tabPoints*` i `horizontalSocket`/`verticalSocket` musiałyby brać grubość
partnera, a nie `G`. To jest robota na własną fazę, z własnymi fixture'ami
(dziś każdy golden fixture jest cięty z jednej płyty), i nie ma dziś zamówienia
warsztatu, które by jej wymagało.

**Co Piotr decyduje.** Czy taki przypadek w ogóle występuje — czy zdarza się
korpus z bokami z innej płyty niż wieniec. Jeśli nie, to nie jest dług, tylko
granica systemu i można ją zapisać w SPEC.

## #59 — Pionowa przegroda nie ma jeszcze własnego wiercenia (zakres F3.4)

`VPART-n` (tura 11, F3.4) jest cięty na pełną wysokość wnętrza, na głębokość
partitionu, jednej grubości; wchodzi do BOM-u, na arkusz CNC i do DXF-a jak
każdy inny kawałek. Nie ma **żadnych otworów**: ani kołków w bokach, ani
konfirmatów przez wieniec i dno, ani rowka.

Nie zgadywałem ich. Cała reszta wiercenia w tej aplikacji jest przepisana
linia po linii z AutoLISP-a, a AutoLISP nie zna pionowej przegrody — więc
wymyślenie jej mocowania byłoby pierwszą liczbą w tym silniku wziętą z
sufitu. Przegroda jest przykręcana albo na kołki, i to jest pytanie do
warsztatu, nie do programu.

**Co Piotr decyduje.** Czym mocuje pionową przegrodę i gdzie: konfirmaty przez
wieniec i dno (ile, w jakich odległościach), czy kołki w bokach i rowek.
Po tej odpowiedzi geometria to kilkanaście linii obok `drawWardrobeShelfHoles*`.

## #60 — Kamera „look at THIS" była martwa od tury 5 (naprawione w T11)

Zapisane nie dlatego, że coś zostaje otwarte, tylko dlatego, że pułapka jest
ogólna i wróci.

`<OrbitControls target={[0, roomH * 0.45, 0]}>` wyglądało niewinnie. To jest
PROP, a React zapisuje prop przy KAŻDYM renderze — a `Scene` renderuje się
przy każdym zaznaczeniu, każdej klatce przeciągania i każdej zmianie półki.
Cel orbity był więc przepisywany na środek pokoju kilkadziesiąt razy na sekundę,
a `FocusRig` (tura 5) lerpował go w stronę klikniętego kawałka — i przegrywał.
Dwuklik „przyleć tutaj" robił od tury 5 lekkie przybliżenie i nic więcej, i
nikt tego nie zgłosił, bo COŚ się działo.

Naprawa: cel jest ustawiany imperatywnie i tylko wtedy, gdy zmienia się POKÓJ
(`HomeTarget` w `3d/Scene.jsx`), i komponent jest zamontowany **PO**
`<OrbitControls>` — efekty lecą w kolejności drzewa, więc rodzeństwo
postawione wyżej szukałoby refa, którego React jeszcze nie podpiął, i po cichu
nie zrobiłoby nic.

**Reguła na przyszłość:** każdy stan trzymany W BIBLIOTECE (cel orbity, pozycja
kamery, uchwyt kontrolki), którego aplikacja także dotyka imperatywnie, nie
może być podawany propem. Prop znaczy „to jest prawda przy każdym renderze".

## #61 — Szuflada nad drzwiami (1×) czeka na drzwi o częściowej wysokości (zakres F3.2)

CLAUDE.md tury 12, F3.2, wymienia **1× (drawerline: jedna szuflada nad
drzwiami)** jako pierwszy wariant grupy „Drawer unit". Wpis jest w bibliotece,
jest wyszarzony i pisze dlaczego. Kitu za nim nie ma.

**Dlaczego to nie jest przeoczenie.** Reszta wariantów — 2×, 3×, 4× — to
WYŁĄCZNIE proporcja podziału frontów, a każda liczba KIT_BUDR_FULL jest już
pisana per front, więc powstały bez jednej nowej formuły. 1× nie jest
proporcją: to szafka, która ma JEDNOCZEŚNIE front szuflady i DRZWI, a drzwi o
częściowej wysokości nie definiuje żaden kit w `reference/lisp`. Konkretnie:

- `hinges.rules.base` liczy środki zawiasów jako `[100, H−300, H−100]` z
  wysokości KORPUSU, a puszki na froncie z `cups.baseOffsets` mierzonych na
  tym froncie. Drzwi kończące się 380 mm pod wieńcem trzeba by odwzorować na
  jedno i drugie — czyli wymyślić mapowanie, którego LISP nie zna.
- Szuflada na GÓRZE korpusu BUD potrzebuje czegoś, do czego przykręcić
  prowadnicę: BUDR ma pod każdym frontem swoje rzędy liczone od dna, a BUD nie
  ma w tym miejscu żadnej płyty.

To nie jest błąd widoczny na ekranie; to paczka formatek z zawiasami wierconymi
w miejscu, którego nikt nie policzył.

**Co Piotr decyduje.** Gdzie w takiej szafce siedzi przegroda pod szufladą
(albo czy prowadnica idzie prosto w boki), na jakiej wysokości kończy się front
szuflady, i od czego mierzone są zawiasy w skróconych drzwiach. Po tej
odpowiedzi wariant to wpis w `profile.baseDrawerUnit.variants` plus kilkanaście
linii — reszta grupy już działa.

## #62 — Obudowa zmywarki (DW) nie ma wzorca „front + szczelina" (zakres F3.5)

CLAUDE.md F3.5 mówi wprost: „front + gap per the appliance pattern the
kits/SPEC define; if no pattern exists, entry DISABLED-«soon» + BLOCKERS,
pattern-first rule". Wzorca nie ma i wpis jest wyłączony.

**Co sprawdzono.** `reference/lisp` ma jeden kit sprzętowy — KIT_FRIDGE — i to
jest OBUDOWA: korpus dookoła urządzenia, z listwami tylnymi, płytą stałą na
`fridgeH` i panelem na wsporniki. Zmywarka jest czymś innym: to zwykle
otwarta wnęka bez dna i bez pleców, z frontem dekoracyjnym przykręconym do
drzwi urządzenia, i z własnymi luzami po bokach i u góry. SPEC nie opisuje
żadnego z tych wymiarów, a `grep` po `dishwash|DW|appliance` daje w całym repo
tylko warstwę `APPLIANCES` w KIT_FRIDGE (rysunek poglądowy w DXF-ie).

**Co Piotr decyduje.** Wymiary wnęki (luz boczny, górny, czy jest dno i
plecy), sposób mocowania frontu dekoracyjnego do drzwi zmywarki i jego
odjęcia, oraz czy obudowa niesie cokół jak reszta ciągu. To jest dokładnie ta
sama reguła „wzorzec najpierw", pod którą stoi #59.

## #63 — Narożnik i szafka L nie mają kitu (zakres F3.6)

CLAUDE.md F3.6 stawia sprawę sam: „entries PRESENT but DISABLED-«soon»: no
kit/LISP defines them yet; the owner writes the pattern with the assistant
first (same rule as partition drilling #59)". Oba wpisy są w bibliotece,
wyszarzone, z powodem w wierszu.

Nie ma tu nic do policzenia z istniejącej matematyki. Narożnik to korpus,
którego rzut nie jest prostokątem — zmienia się obrys formatek, złącze na
skosie, drzwi (jedne czy dwoje, na jakim kącie), i to, jak liczy się jego
miejsce w ciągu i w kolizjach. Szafka L to to samo pytanie na dwóch ścianach.
Każda z tych rzeczy dotyka `engine/collision.js`, `engine/runs.js` i
`engine/puzzle.js` naraz.

**Co Piotr decyduje.** Rysunek jednego narożnika: rzut z wymiarami, gdzie
stoją boki, jak biegnie złącze na skosie, jak otwierają się drzwi. Reszta
pójdzie z tego wzorca tak samo, jak warianty szuflad poszły z BUDR-a.

## #64 — Kitowy podział 4:3:2 dryfuje o 1 mm na części wysokości — ZAMROŻONE (reguła 7)

Zapisane nie jako dług do naprawienia, tylko jako **rzecz świadomie
niezmieniona**, żeby następna tura nie „poprawiła" jej przez pomyłkę.

`budrFrontHeights` liczy każdy front osobno: `lispRound(available · r / total)`.
Kit deklaruje przy tym własny niezmiennik — stos wypełnia korpus dokładnie
(`golden-budr.json`: „stack top = H − 3"), czyli `suma(frontów) = available`.
Przy 4:3:2 to zwykle wychodzi, ale nie zawsze: dla H = 602 sumą jest 594 przy
`available` 593, więc stos stoi 1 mm ponad korpusem.

**Dlaczego to zostaje.** Reguła 7 jest absolutna: eksport CNC jest bajt w bajt
dla wszystkiego, co istnieje dziś. Milimetr poprawy, o który nikt nie prosił,
na wysokości, którą ktoś mógł już wyciąć, to nadal zmiana tego, co robi
maszyna. Wariant `x3` niesie więc `exact: false` i tnie dokładnie to, co
zawsze; test w `turn12-library.test.js` przechodzi 400 wysokości, żeby
udowodnić, że nie drgnął.

Warianty dodane w turze 12 (`x2`, `x4`) niosą `exact: true` — górny front
bierze resztę, bo są NOWE i nie ma czego zamrażać, a cztery równe fronty na
nieparzystej wysokości stałyby 2 mm ponad korpusem.

**Co Piotr decyduje.** Czy kitowe 4:3:2 ma zostać takie, jakie jest (wtedy to
nie dług, tylko granica i można ją zapisać w SPEC), czy ma dostać `exact: true`
w osobnej turze — z nowymi fixture'ami i wpisem o świadomej zmianie eksportu.
