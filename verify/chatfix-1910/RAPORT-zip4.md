# Chat fix 19.10.2026, paczka 4 (popołudnie): deski przy cięciu poziomym, zapas 20 mm na docięcie, nic poza elementem, Changes zamyka się samo

Baza: ZIP 1 + 2 + 3 na main f93a047. Ta paczka nakłada się na trzy poprzednie (jeden ZIP zawiera wszystko).

Słowa Piotra 19.10 (15:16 i 15:18): "2 cut działa ale nie rozumiem dlaczego nie ma paneli płyt, w sensie jak tniemy
pionowe to wszystko jest a jak poziome to nie ma, dlaczego?"; "changes chat can we keep close, nawet jeśli użytkownik
otworzy czy możemy za jakiś czas zamknąć? bo za bardzo przeszkadza"; "sprawdź dokładnie ale wiem że czasami cnc rysuje
items jak 3 mm drills czy coś takiego czy litery poza elementami, czy możesz się upewnić na milion procent że wszystkie
elementy są zamknięte?"; "side panele powinny być większe o 20 mm, to samo z plinth, panele 20mm góra + dół + bok (nie
przód, 0 to zawsze powinno być ok)". 15:19: "analiza i koduj".

## 1. Cięcie poziome (CUT EDGE) dostaje deski jak pionowe (KIT_NOTCH.lsp D22 zmienione pod licencją z Twoimi słowami)

Prawo: krawędziowe wycięcie to narożne puszczone na całą szerokość (nw = cw), więc jego pudło to pudło narożnego bez
RETURN (nie ma bocznej ściany do zamknięcia). Deska po desce (edge-notch-box-places, sekcja H2):
- EDGE-STEP tylko przy krawędzi TYLNEJ (D4: przód to otwór na fronty): cw x eh, stoi w g za ściętymi końcami obu boków
  (plan y cd - ed - g .. cd - ed), zakrywa je tak jak plecy zakrywają końce boków; od podłogi (BB) albo wisi od góry (TB,
  D21). Za nim zostaje ed dla przeszkody (D2), tak jak nd przy narożnym.
- EDGE-LID przy krawędzi DOLNEJ (BB, BF): (cw - 2g) x ed, leży NA STEP między bokami, od czoła STEP do czoła pleców
  (tył) albo od czoła karkasu ed w głąb (przód), z eh .. eh + g.
- EDGE-FLOOR przy krawędzi GÓRNEJ (TB, TF): LID odbity, pod STEP.
- Bez RETURN, bez wkrętów (D10): czyste prostokąty, mocowanie stolarza (jak pudło narożnego). Check #30 żółty jak przy
  narożnym ("outline only").
- END panel zakrywa koniec STEP (D23): jego cięcie na tylnej płaszczyźnie STEP, sb + ed (było sb + g + ed, równo z
  bokiem). Przy krawędzi przedniej równo z bokiem jak było.
- Narożne + krawędziowe razem: deski obu; gdy się nakładają, odmawia krawędziowe swoim zdaniem (jak D22 mówi), a
  narożne stoi (notchVerdict D8 nie liczy desek krawędziowego za przeszkodę).
Liczby (I3): BUD 600 BB 20/120: EDGE-STEP 600 x 120 (y 520..538, z 0..120), EDGE-LID 564 x 20 (z 120..138);
TB 50/100: EDGE-STEP 600 x 100 (z 670..770), EDGE-FLOOR 564 x 50 (z 652..670); BF: tylko LID 564 x 20 z przodu.
Goldeny golden-edge-notch-bb/tb przepięte z Twoimi słowami (dwie deski więcej, reszta bajt w bajt).

## 2. Changes zamyka się samo

profile.ui.messages.historyOpenMs = 10000 (PROPOSED): otwarta lista Changes zamyka się po 10 s; pasek i wiersze
zostają; Escape jak było. Tylko PRO (src/components/Messages.jsx, re-frozen).

## 3. "Na milion procent" poza elementem: strażnik + trzy znalezione błędy naprawione

Strażnik (src/engine/cnc/offBoardGuard.js): każdy ENTITY każdego DXF, ten sam spis który pisarz serializuje:
obrys = jedna zamknięta pętla (flaga R12), skończone liczby; każdy otwór (koło) w całości na desce i poza oknem
przelotowym; każdy tekst (podpis, notatka) punktem wstawienia na desce; każda otwarta polilinia (znak narożny, strzałka
EDGE) na desce; kieszeń może przełamać krawędź (gniazdo puzzla, dog bone, rowek szuflady, kieszeń Cabineo otwarta na
koniec deski) ale nigdy nie leży w całości poza deską. Reguła 4: mówi, nie naprawia. Wpięty do bramki eksportu jako
Check #9 (czerwone). Sonda (scripts/chatfix-1910-offboard-probe.mjs): 59 szafek, 656 plików DXF, 0 znalezisk.

Co sonda znalazła i co naprawione:
a. OKAP (WUD_HOOD, WUD_HOOD_SHORT): drabinka zawiasów liczona z wysokości karkasu (720), więc na drzwiach 367 cupy
   stały na 420 i 620, poza deską. Teraz drzwi okapu to krótkie drzwi nad aperturą jak drzwi wieży nad sprzętem (T75 F12):
   drabinka low na własnej wysokości, podniesiona o aperturę: cupy 100/267 na drzwiach, 450/617 w karkasie.
   golden-hood-short przepięty z Twoimi słowami.
b. PODPISY poza deską: podpis stał w środku PROSTOKĄTA (w/2, h/2), a środek bywa dziurą: pasek plinthu przy zmywarce
   (20 mm nad wycięciem), okno w plecach przy recess, SPURS lodówki rysowany obrócony. Teraz (src/engine/cnc/
   labelAnchor.js, jedno prawo dla DXF i arkusza CNC) punkt zamierzony jest ten sam co zawsze; przesuwany na deskę tylko
   gdy nie leży na desce. Każdy plik, którego podpis był na desce, bajt w bajt jak był (BUL szafy 26bec93d trzyma).
   Notatka (OVERSIZE, CUT) mierzona w pudle obrysu (pasek 40 mm), blok podnoszony żeby ostatnia linia została na desce.
c. PLECY przy recess sięgającym boku (bite): kolumna wkrętów 3 mm po prawej szła przez wgryzienie (x 591, z 392.5 w
   oknie). KIT_RECESS.lsp recess-side-row zmienione pod licencją: okno wycina krawędź boczną wszędzie gdzie band sięga
   boku, z notch czy bez (było: tylko na krawędzi notcha). Kolumna: 50, 178 pod wgryzieniem i 622, 720 nad nim.
d. OKNO w plecach (recess w środku, KIT_RECESS.lsp D9): kieszeń przelotowa była pisana przeciwnie do zegara (jak obrys),
   bramka mówiła czerwono "wrong-winding" przy każdym recess z oknem. Teraz cutout (zgodnie z zegarem, T25 F1.2), w
   LISP polilinia odwrócona.

## 4. Zapas 20 mm na docięcie (KIT_SITE_TRIM.lsp, NOWY plik; src/engine/siteTrim.js)

- END panel: CIĘCIE większe o 20 na górze, dole i z TYŁU; przód nigdy (D2). Plinth: góra, dół i każdy koniec, który nie
  jest złączem maszynowym (D3): pojedynczy obie strony; run w paskach: lewy koniec pierwszego, prawy ostatniego; narożny
  butt (T75 F6) i mitra wyspy (F10): ten koniec nie; ramiona L: koniec daleki od butt.
- Obrys rośnie KRAWĘDZIAMI (D5), nie skalą: wierzchołek na rosnącej krawędzi idzie z nią, reszta zostaje; więc notch na
  END trzyma wymiar od krawędzi KOŃCOWYCH (230 x 420 w cięciu = 210 x 400 po docięciu), wycięcie zmywarki trzyma otwór na
  dole a pasek 20 mm jest 40 (20 + zapas góry). Otwory, kieszenie, znaki jadą z początkiem.
- Rekord: panel.w/h i DXF = cięcie; box i scena = nominał (meta.oversize.nominal; 3d/panelSolid.js czyta sceneBoard,
  deska nie wchodzi w podłogę); etykieta "OVERSIZE +20 BACK/TOP/BOTTOM - TRIM ON SITE (NOM 596 x 870)", plinth
  "ALL EDGES"; obrzeże i pole po cięciu; BOM wiersz = cięcie. Liczby: autoParts.endPanel.siteTrim 20,
  autoParts.plinth.siteTrim 20 (PROPOSED), 0 wyłącza i tnie jak wczoraj.
- Liczby (sekcja 4 LISP, test linia po linii): WARDROBE END-L 606 x 2250 -> 626 x 2290; BUD z notch END-L
  (0 0) (386 0) (386 420) (616 420) (616 910) (0 910); PLINTH 600 x 100 -> 640 x 140; paski 1820/1020 x 140; L: 430 x 140
  i 412 x 140. Goldeny notch-end-panel, recess-end-panel, corner-l-base przepięte z Twoimi słowami; szóstka IDENTICAL
  (goły kit nie ma END ani plinthu).
- 65 starych testów o desce w pokoju czytają nominał (test/site-trim.js: nominal, asNominal, trimOf), testy o cięciu
  mają nowe liczby.

## Dowody

Pełna suita: 7042/7042 (było 7014; 28 nowych testów). Klasyfikator t78 strict GREEN (40/40 bramek żywych, T78 goldeny 27/27, T75 16/16, 6 przepiętych
nazwanych, LISP 25 plików zbalansowanych). t78-copy --check CLEAN. Walk scripts/chatfix-1910-walk.mjs 28/28 (sekcja 5:
EDGE-STEP i EDGE-LID w scenie, END-R cięty 616 x 910 a w pokoju 870 x 596, arkusz CNC z notatką OVERSIZE, Check tylko
#30 żółty, lista Changes zamyka się po 10 s); klatki 09..12 w verify/chatfix-1910/. Build Vite OK.
Sonda off-board 0/656. BUL szafy z cnc-export-identity bajt w bajt (26bec93d).

## Odczyty przyjęte bez pytania (Piotr: "analiza i koduj")

1. Deski krawędziowego: STEP tylko przy tylnej krawędzi (D4 narożnego), LID/FLOOR przy każdej, bez RETURN, bez wkrętów.
2. END panel przy tylnej krawędzi zakrywa koniec STEP (sb + ed), jak przy zapudłowanym narożnym.
3. Zapas 20 na obrzeżonych krawędziach: obrzeże liczone po cięciu (deska wychodzi z warsztatu obrzeżona, stolarz docina).
4. Plinth: góra też +20 (Twoje "góra + dół + bok"); złącze maszynowe (butt, mitra, pasek) bez zapasu.
5. Changes zamyka się po 10 s od otwarcia (liczba w profilu).
6. Kieszeń Cabineo otwarta na koniec deski (drill15: płatki łamią krawędź) to nie błąd (prawo Cabineo A.2).
7. Okno recess pisane zgodnie z zegarem (cutout), LISP odwrócony.
8. Drzwi okapu: drabinka low na własnej wysokości, podniesiona o aperturę (jak wieża nad sprzętem).

## Nie kodowane / pytania (numerowane na końcu, jak zawsze)

1. notch b i c (wkręty paska pod 96 mm: które otwory, średnica; próg odmowy "obniż/spłyć") - jak w RAPORT-zip2.
2. Wpis "ZROBIONE 19.10" do Petrosa i zamknięcie HANDOVER - nic nie pisane, czekam na "tak".
