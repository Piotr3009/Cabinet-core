# Chat fix 21.10.2026: połysk od 5 do 100 (wariant A) i mockup szafki in-frame

Baza: main 743b8e9 ("115", Twój push paczki 4 z 19.10). Ta paczka nakłada się na nią; nic z paczek 1 do 4 nie jest tu powtórzone.

Słowa Piotra 21.10 (20:15): "nie mamy wogole polysku czy mzomey zrobic polysjk od 0 do 100procent ? przeanalizuj prosze";
(20:24): "a co z britisg style kicthen z ramkami ?"; (20:31): "1 - wariant a ,, 2 ,imi,u, 5 zostaw 3 - chat zip. 4- cnc blum
in frame 6 - mockup pls".

Czytam to tak: 1 połysk jako wariant A (neutralne studio, nigdy pokój); 2 minimum skali zostaje 5 (nie 0); 3 jako chat
fix + ZIP, nie Code turn; 4 in-frame = rama frezowana na CNC + zawiasy Blum in-frame; 6 najpierw mockup, nie kod.

## 1. Pomiar PRZED (Twoja skarga sprawdzona liczbą, nie okiem)

Sonda: drzwi natryskowe RAL 5008 na BUD, ta sama kamera z przodu nisko, zrzut przy 5 %, 60 % i 100 %, średnia jasność
środka drzwi (własny czytnik PNG, bez narzędzia do obrazów). Wynik: 5 % i 100 % różniły się o JEDNĄ jednostkę na 255.
Czyli miałeś rację: suwak Sheen ruszał roughness lakieru i clearcoat ograniczony do 0.35 z rodziny lacquer, nad sondą
studia przypiętą na 0.25 (hotfix 08.08) z kostki 64 px. Lustro przy 100 % nie miało w czym się przejrzeć: sonda 64 px
to rozmyta plama bez żadnego jasnego panelu, a 0.25 jej wagi to i tak ćwierć niczego.

## 2. Co zrobione: JAZDA POŁYSKU (sześć liczb PROPOSED w profilu)

`profile.appearance.gloss` (src/engine/profile.js, z Twoimi słowami obok; migracja klucz po kluczu, profil zapisany
wcześniej dostaje wszystkie sześć):

| liczba | wartość | co robi |
|---|---|---|
| coatMax | 1.0 | clearcoat przy 100 % (było: sufit 0.35 z lacquer) |
| coatRoughnessMin | 0.03 | ostrość tej powłoki przy 100 % (lustro) |
| coatRoughnessMax | 0.5 | ...i przy 5 % (mat, powłoki praktycznie nie ma) |
| envMin | 0.25 | waga sondy studia przy 5 % (= hotfix 08.08, zostaje podłogą) |
| envMax | 1.0 | waga sondy przy 100 % |
| probeSize | 256 | rozdzielczość sondy studia (było 64) |

src/3d/materials.js `surfaceFor`: na elemencie "sheen-driven" (natrysk albo fornir, to co było od T49) clearcoat,
clearcoatRoughness i envMapIntensity jadą liniowo po gloss = 1 - roughness(sheen), tym samym źródłem co roughness
(formuła roughness nie ruszona: 5 % = 0.95, 100 % = 0). Laminat, surowy MDF, element lakierowany bez podanego sheen,
karkas melaminowy i okucia: każda liczba jak była (test to sprawdza przy 5 i 100).

src/3d/Scene.jsx `Environment`: sonda studia budowana w `gloss.probeSize` (256) zamiast 64; to samo neutralne
RoomEnvironment three, ta sama intensywność, raz na renderer. Okna edytora montują Environment bez rozmiaru i czytają
profil same. Światła: ani linii (FROZEN 4: ledStrips.js, lighting.js, lightRig.js, LightingPanel trzymają; klasyfikator
"lighting touched: 0"). hardwareEnv.js (sonda okuć T24 F12, 64 px): nie ruszony.

Wariant A znaczy: studio jest szare i neutralne, więc biały front przy 100 % zostaje biały, a próbka RAL zostaje swoją
próbką na każdym stopniu. Nie ma sondy pokoju (żadnej CubeCamera): drzwi nie odbijają ścian ani podłogi kuchni. To
cena wariantu A i Twój wybór.

Cięcie: nic tu nie dochodzi do computeCabinet, więc każdy golden trzyma z definicji (sześć bazowych IDENTICAL,
T75 16/16, T78 27/27).

## 3. Pomiar PO (ta sama sonda, scripts/chatfix-2110-walk.mjs, 5/5 GREEN)

- materiał drzwi przy 5 %: clearcoat 0.05, jego roughness 0.4765, sonda 0.2875; przy 60 %: 0.6 / 0.218 / 0.7;
  przy 100 %: 1.0 / 0.03 / 1.0
- średnia jasność środka drzwi RAL 5008: 55.9 (5 %) -> 56.1 (60 %) -> 65.6 (100 %), czyli +9.7 na 255 zamiast +1
- 60 % stoi między 5 a 100
- białe drzwi RAL 9010 przy 100 %: 215.9 (biały zostaje biały, nic nie barwi)
- z boku przy 100 % w drzwiach widać panele świetlne studia jako kształty, przy 5 % nic (klatki gloss-100-side.png
  i gloss-5-side.png)

Zrzuty w verify/chatfix-2110/: gloss-5.png, gloss-60.png, gloss-100.png, gloss-white-100.png, gloss-100-side.png,
gloss-5-side.png. Uwaga do oka: przy 60 % różnica jasności z przodu jest mała (+0.2), bo z przodu nisko odbija się
ciemna część studia; z boku i w ruchu kamery widać ją wyraźnie. Jeśli chcesz, żeby 60 % było wyraźniej "pół-połyskiem"
z przodu, to jedna liczba: coatRoughnessMax w dół (np. 0.35) albo envMin w górę (pytanie 3).

## 4. Testy i bramki

- nowy test/chatfix-2110-gloss.test.js (5 testów): liczby i migracja; jazda na każdym stopniu skali, monotoniczna;
  laminat / surowy / bez sheen / melamina nie ruszone; fornir jedzie z natryskiem; Scene czyta probeSize, bez CubeCamera,
  licencje f39 z Twoimi słowami
- przepisane pod nową jazdę (sprawdzały stare przypięte liczby): test/chatfix-2508-sheen-and-slope-buttons.test.js,
  test/sheen.test.js, test/spray-fronts.test.js, test/sprayed-carcass-sheen.test.js
- NEW_FILES (turn77-f5): cztery nowe pliki z nagłówkiem
- klasyfikator strict: GREEN (f39-owner-2110: trzy pliki licencjonowane, zero bramek, zero goldenów)
- t78-copy --check: CLEAN (żadna powierzchnia PRO/retail nie ruszona)
- vite build: OK
- pełna suita: wynik w CZYTAJ.txt w ZIP (7042 + 5 nowych oczekiwane)

## 5. In-frame (British style): analiza, przekroje, mockup OSTATECZNY wg Twoich liczb, zero kodu silnika

Dziś silnik nie zna ramy: wszystkie fronty (S/H/F/G/A) są nakładane (lay-on) na karkas, zawias liczony od krawędzi
boku, szczelina frontów z profilu. "British in-frame" to inna rodzina: fronty siedzą W ramie (inset), rama jest
widocznym elementem, a zawias to specjalny Blum do in-frame.

Droga 21.10 wieczorem: pierwszy mockup (stile 45, rama 22, szafka 1000) -> Twoje "rama coś takiego dokładnie, ale
szafki 4 mm od siebie, 18 + 18 + 4 = 40, pokaż przekrój" -> przekrój poziomy -> Twoje liczby (22:03) -> przekrój
poziomy v2 i pionowy (trzy warianty raila) -> Twoje "dół wariant C, góra tak samo nad szafkę, stolarz wypełni, blat na
wierzch; zrób ostateczne mockupy" (22:14) -> mockup ostateczny.

Twoje liczby (22:03, 22:14), tak jak je zapisałem:
| | liczba | Twoje słowa |
|---|---|---|
| rama | 38 szerokości WSZĘDZIE, 25 grubości, jedna na cały ciąg z jednej płyty (do 2800; dłuższy ciąg = łączenie) | "wszędzie ramkę 38", "ramka 25", "raczej płyta" |
| szafki | na styk (0 mm), skręcone | "będziemy mogli szafki do siebie połączyć" |
| stile przy styku | 38 = 1 + 18 + 18 + 1: lip 1 mm do otworu z każdej strony; przy forniru 19 równo | "1 mm będzie w środku wystawać, veneer 19 x 2" |
| rail dół | 38 = lip 1 + dno 18 + 19 POD dnem (przed cokołem) | "dół zdecydowanie wariant C" |
| rail góra | 38 = lip 1 + wieniec 18 + 19 NAD karkasem; stolarz wypełnia te 19 na budowie, blat na wierzchu | "góra ma iść nad szafkę tak samo jak dół, stolarz wypełni, blat pójdzie na wierzch" |
| drzwi | 22, lico równo z ramą, 3 mm luzu do czoła karkasu (25 - 22) | "ramka 25, drzwi 22, 3 mm gap" |
| szczelina | 3 zawsze: do ramy i między frontami | "3 mm zawsze" |
| para drzwi, szuflady | bez ramy między nimi, tylko 3 mm; stile tylko między szafkami | "między drzwiami nie ma ramki, tylko między szafkami" |
| panel końcowy | Twoje "4 mm jak sąsiad" padło przy schemacie 40; przy 38 na styk narysowałem stile 38 nad panelem 18 (1 mm poza panel) | pytanie 5 |
| zawias | na boku szafki, specjalny Blum in-frame (numer z Twojego cennika) | "zawias na boku szafki (specjalne zawiasy z Bluma)" |

Z tego wynika: otwór w ramie = światło karkasu minus 2 lipy, wysokość minus 2 lipy (600 x 770 -> 562 x 732), drzwi
556 x 726; w 800 z parą drzwi 376.5 każde ((762 - 9) / 2); rama ciągu = szerokość ciągu + lipy, wysokość karkasu + 38
(770 -> 808). Rama to element CIĄGU (jak plinth run, cornice run), nie szafki: to decyduje o modelu w silniku.

Rysunki (verify/chatfix-2110/): przekrój poziomy v1 (schemat 40 z 4 mm), v2 (Twoje liczby), pionowy (trzy warianty
raila); mockup ostateczny mockup-inframe-final-01..05.png + mockup-inframe-final-sheet.png
(scripts/chatfix-2110-mockup-inframe-final.mjs: ciąg panel + BUD 600 + BUD 800 (para) + BUDR2 500 + WUD 600, jedna
rama na ciąg dolny i jedna na górny, wypełnienie 19 i blat 38 narysowane nad ramą, prawdziwe fronty i panel schowane,
nic w silniku nie ruszone). Pierwszy mockup (45/22) zostaje w repo jako historia.

Co kit in-frame musiałby zawierać (Code turn klasy T80, nie chat fix; szacunek 2 do 3 dni Code):
a. reference/lisp/KIT_INFRAME.lsp: prawo ramy ciągu (jedna płyta, otwory z siatki frontów szafek, stile 38 między
   szafkami, rail 38 z 19 poza karkas góra i dół, lip 1), prawo inset (szczelina 3 od otworu, luz 3 do karkasu),
   prawo zawiasu in-frame (na boku, drabinka od otworu ramy), łączenie ramy powyżej 2800
b. silnik: rama jako element ciągu (BOM, DXF z wycięciami jak okno T25 F1.2, etykiety), fronty inset (wymiar z
   otworu), zawias in-frame w kolumnie okuć, wypełnienie 19 nad karkasem jako element "site" (stolarz) albo w BOM
c. 3D: rama + fronty w ramie, blat podniesiony o 19; Check: front mieści się w otworze, para drzwi 3 mm, zawias nie
   koliduje z lipem 1 mm
d. goldeny: nowe dla ciągu in-frame; bazowe sześć bez zmian (in-frame to nowy styl frontów, nie zmiana istniejących)
e. UI: przełącznik "in-frame" per projekt (styl kuchni) albo per ciąg (pytanie 6)

## 6. Odczyty, które zrobiłem bez pytania (do weta)

- probeSize 256 (nie 512): 256 wystarczyło w pomiarze; 512 nie sprawdzałem, kosztowałoby cztery razy więcej pamięci na sondę
- coatRoughnessMax 0.5 i coatMax 1.0: wybrane tak, żeby 5 % było "zero lustra", 100 % "lustro"
- envMin 0.25 jako podłoga: to liczba z hotfixu 08.08, nie ruszona, żeby mat wyglądał jak dotąd
- mockup: F&B Card Room Green, satyna 30, gałki mosiężne 28 x 30, pole shaker 60/6, blat dębowy 38: wybór do pokazania,
  nie standard
- mockup ostateczny: koniec ciągu = stile 38 nad panelem 18 (1 mm poza panel); panel końcowy do podłogi jak dziś; rama
  górnej szafki też 19 pod i 19 nad; prawy koniec ciągu bez panelu (stile 19 = 1 + 18, "jakby sąsiad szedł dalej")
- fornir jedzie razem z natryskiem (tak było od T49: oba "sheen-driven"); jeśli fornir ma mieć własny sufit połysku,
  to druga szóstka liczb

## 7. Pytania (ponumerowane)

1. Sześć liczb połysku PROPOSED: zostają jak w tabeli, czy zmieniasz którąś?
2. Skala Sheen w UI zostaje 5..100 co 5 (jak kazałeś). Etykiety (matt / satin / gloss) zostają jak były?
3. 60 % z przodu: zostawić jak jest (liczbowo między, z boku widać), czy podciągnąć środek skali (coatRoughnessMax 0.35
   albo envMin 0.4)?
4. In-frame: tabela w sekcji 5 to Twoje liczby tak jak je zapisałem: potwierdzasz całość?
5. Koniec ciągu z panelem końcowym: stile 38 nad panelem 18 (1 mm poza panel, jak w mockupie), panel fornir 19 na
   styk (19 + 18 + 1 = 38), czy co innego? Panel do podłogi (jak dziś) czy do dołu ramy?
6. In-frame: przełącznik per projekt (cała kuchnia) czy per ciąg?
7. Szuflada za ramą z lipem 1 mm: pudło jak dziś (lip 1 mm nie przeszkadza prowadnicy) czy węższe?
8. Zawias Blum in-frame na boku: numer katalogowy z Twojego cennika (zawias + płytka), nie wymyślam numerów.
9. Wypełnienie 19 nad karkasem: tylko notatka dla stolarza, czy element w BOM (listwa 19 x szerokość ciągu)?
10. Tryb: kit in-frame jako Code turn T80 (2 do 3 dni), start po Twoim "tak" na 4 do 9?
11. Petros: wpis "ZROBIONE 19.10" + HANDOVER 20.10 + zamknięcie 9f31099f nadal czeka na Twoje "tak"; do tego dopisać
    dzisiejszy połysk i in-frame?
12. Wciąż otwarte z 19.10: liczby notch b/c (wybrałeś b i c, liczby niepotwierdzone), trzy PROPOSED z paczki 4, pytania
    7 do 15 z HANDOVER 19.10.
