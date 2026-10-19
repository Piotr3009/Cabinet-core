# Chat fix 19.10.2026, paczka 2 (ZIP 2): pierwsze plecy bez rzędów 3 mm przy notch i recess (cofnięcie T79 F6 na BACK)

Baza: ZIP 1 (main f93a047 + paczka cabinetcore-chatfix-delete-edges-messages-1910-1045.zip). Ta paczka nakłada się na ZIP 1.

Słowa Piotra 19.10 (09:16, eye-test T79, punkt F6): "nie na pierwszych plecach tylko na tych drugich ktore sa we
wnetrzu recess, na tych pierwszych nie, to juz bylo usuniete i znowu trzeba usunac". 10:15: "koduj, nic juz nie pytaj".

## Prawo po tej paczce

Pierwsze plecy (BACK) wracają do prawa 17.10: rzędy 3 mm drawBACK w boki, TOP i BOTTOM i nic więcej. Zero rzędów
w RETURN, LID i FLOOR komina (KIT_NOTCH.lsp D10), zero kolumn i rzędów wokół okna wnęki (KIT_RECESS.lsp D17), zero
rzędów w skrzynkę komina na kawałku pleców wnęki (D13, szew F6 x F8 z 18.10). Drugie plecy, EXT-BACK we wnęce,
zostają jak 18.10: wiercone, 12 otworów wokół pasa, część cięta.

## Co weszło

LISP najpierw, pod licencją z cytatem Piotra (fragment scripts/t78-classify.d/f36-owner-1910b.mjs):
- reference/lisp/KIT_NOTCH.lsp: D10 "AMENDED 18.10 and WITHDRAWN 19.10"; notch-back-joints jak 17.10 (bez "SHORT");
  notch-back-box-rows i blok NUMBERS I5 skasowane; NUMBERS I i I2 mówią 10 i 13 otworów; komenda mówi liczbę
  otworów pleców. notch-edge-row zostaje dla EXT-BACK. git: 174 usunięte, 35 dodane.
- reference/lisp/KIT_RECESS.lsp: D17 "HALF WITHDRAWN 19.10"; recess-back-joints jak 17.10; recess-notch-box-rows
  i recess-put-hole skasowane; NUMBERS CASE A 10, CASE B 14, CASE D 6 otworów pleców; recess-ext-back-screws i
  wiercony EXT-BACK bez zmian. git: 160 usunięte, 71 dodane.
- Nawiasy: test/turn35-lisp-parens.test.js 44/44 (wpisy F6 i F8 x F6 przepisane).

Silnik:
- src/engine/notch.js: notchBackJoints jak 17.10; notchBackBoxRows, SHORT, backRowsShort skasowane (62 usunięte,
  12 dodane).
- src/engine/extension.js: recessBackJoints bez rzędów wokół okna i bez rzędów w skrzynkę komina;
  recessNotchBoxRows i recessPutHole skasowane (59 usunięte, 12 dodane); recessExtBackScrews i wiercony EXT-BACK
  bez zmian; joinery.js (ramka RECESS-BACK) bez zmian.
- Tory: jeden tor rzędów na pierwszych plecach (drawBACK przez notchBackJoints / recessBackJoints), jeden na
  EXT-BACK (recessExtBackScrews).

Goldeny REPINNED z cytatem (meta.repinned, fragment f36): golden-notch 14 -> 10, golden-notch-top 19 -> 13,
golden-recess 13 -> 10, golden-recess-band 26 -> 14, golden-notch-and-recess 13 -> 6, golden-notch-end-panel
19 -> 13, golden-recess-end-panel 22 -> 13 (SCREWS_3MM|BACK); EXT-BACK 12 bez zmian. Szóstka IDENTICAL.

Testy przepisane do nowego prawa (sprawdzały kasowaną regułę): turn79-f06-back-rows (od nowa, 8 testów),
chatfix-1710-corners-screws-shelves, recess-extension-1510, turn75-f7, turn79-f04, turn79-f08, turn35-lisp-parens.
Fragment f34-t79-f06.mjs: LIVENESS przepisana (bramka backRowsRoundTheBox żywa: BACK 10 przy BL full, 14 przy
oknie, EXT-BACK 12). BOM: wkręty liczone z wierceń spadają razem z otworami (BL full 28, CASE A 40, CASE B 44).

## Dowody

Pełna suita: 7004/7004 (6999 bazowe + 7 z ZIP 1, test F6 przepisany z 10 na 8 przypadkow), 11 min 9 s. Klasyfikator t78 strict GREEN (66 plików nazwanych, 34/34 bramek żywych, T78 goldeny 26/26,
T75 16/16). t78-copy --check CLEAN. t64 dump szóstki IDENTICAL vs verify/t70/goldens-base.json.
Zero myślników w nowym tekście, LISP ASCII, nagłówek Skylon w nowym pliku fragmentu.

## Notch b oraz c (punkt 5 odpowiedzi Piotra): NIE kodowane, sonda i pytanie

Odmowa dziś (notch.js notchRefusal, KIT_NOTCH.lsp D6): pasek boku przed kominem (D - 18 - głębokość notcha) musi
mieć min 96 mm = 2 x (dogbone 30 + płyta 18), bo stoi na nim ząb puzzle z TOP i BOTTOM. Przy D 558: notch max
444 w głąb (400 przechodzi, 450 odmowa).
Decyzja Piotra: b (pasek bez zęba puzzle, tylko na wkręty) oraz c (wycięcie prawie na całą głębokość = niższa lub
płytsza szafa). Zanim to zakoduję, potrzebuję prawa warsztatu (zasada GEOMETRIA z petros/zasady, pytania na końcu
wiadomości w chacie): gdzie idą wkręty paska (przez bok w czoło TOP/BOTTOM: jakie otwory w boku, ile, jaka
średnica; dziś jedyne wkręty w karkasie to rzędy 3 mm w plecach) i od jakiej szerokości paska zamiast b jest c.
Bez tych dwóch liczb kod byłby zmyślony.
