# T80 IN-FRAME: co zrobić z tą paczką (Piotr, 21.10.2026, 23:20)

Paczka: cabinetcore-t80-spec-2110-2157.zip. CAŁY ZESTAW: zawiera w sobie paczkę z 21:27
(połysk wariant A + przekroje + mockup ostateczny, 35 plików) ORAZ spec T80. Jeśli już rozpakowałeś
2127, ten ZIP nadpisze te same pliki tym samym, nic nie zepsuje. Baza: main 743b8e9 ("115").

Zawartość do repo (struktura repo-root):
- CLAUDE.md (spec T80, ZASTĘPUJE CLAUDE.md z T79; zaczyna się od nagłówka tury; T79 zostaje w historii git)
- verify/t80/mockup-inframe-final-01..05.png, mockup-inframe-final-sheet.png (mockup, który zatwierdziłeś "1 tak")
- verify/t80/przekroj-poziomy-v2-38.png, przekroj-pionowy.png, przekroj-poziomy-v1-40.png (przekroje, które czytałeś)
- src/engine/profile.js, src/3d/materials.js, src/3d/Scene.jsx + testy (połysk, z paczki 2127)
- scripts/chatfix-2110-*.mjs, scripts/t78-classify.d/f39-owner-2110.mjs, verify/chatfix-2110/* (z paczki 2127)
Folder _nie-do-repo/ skasuj przed git add (CZYTAJ i patch są tylko dla Ciebie).

## Kroki
1. Rozpakuj do folderu repo Cabinet-core (nadpisze CLAUDE.md).
2. Skasuj folder _nie-do-repo.
3. git add -A
4. git commit -m "Chat fix 21.10 (gloss ride, in-frame sections and mockup) + T80 spec: in-frame, the British frame"
5. git push
6. Uruchom sesję Claude Code z repo (nie z Projektu), agenci i tryb równoległy ON.
   Prompt startowy: "Read CLAUDE.md and run TURN 80 exactly as written. Autonomous, zero questions, skip and name in the PR, PR before morning."
7. Rano: podaj mi numer PR, robię audyt (klon, suita, klasyfikator, parens, walk, porównanie klatek z mockupem), potem merge i Twój eye-test.

## Co jest w turze (12 punktów, kolejność = wartość)
PART A: F1 KIT_INFRAME.lsp (prawo ramy ciągu, łączenie powyżej 2800, fronty inset) NAJPIERW, osobny commit.
PART B: F2 przełącznik per projekt: Settings i Wizard, wiersz FRONTS: Lay-on / In-frame (British), przez paramsForEngine.
PART C: F3 rama jako element ciągu (jak plinth run): BOM, etykiety FRAME / FRAME-1..n; F4 rama na CNC (DXF z otworami jako cutout, arkusz, strażnicy, widok CNC).
PART D: F5 drzwi i fronty szuflad 22 inset (3 do ramy, 3 między frontami, bez ramy w parze i w stosie); F6 zawias Blum in-frame na boku z pliku reference/hardware/blum-inframe-hinge.json.
PART E: F7 panel końcowy na styk, do lica ramy, do góry ramy (+19); F8 blat na ramie (+19), wypełnienie 19 = notatka + kawałek timber na przekroju PDF, bez pozycji BOM.
PART F: F9 rama w 3D (jedna siatka z otworami, jak mockup); F10 Checki #40 do #44; F11 goldeny golden-inframe-run i golden-inframe-wud, szóstka i wszystkie stare IDENTICAL, REPINNED puste.
PART G: F12 walk t80-walk.mjs, 10 klatek, pięć z kamer mockupu (porównanie jeden do jednego).
In-frame OFF = main bajt w bajt. Poza turą: zawias na stile ramy, okucie łączenia ramy, listwy ozdobne, rama na sprzętach AGD / narożnikach / okapach (ciąg dzieli się tam na segmenty, Check #42), drzwi dwuskrzydłowe, notch b/c, pull-down.

## Decyzje, które podjąłem za Ciebie w specu (PROPOSED; jedno słowo i zmienię przed pushem)
1. Lip liczony z 38: lip = (38 - 2 x grubość boku) / 2, czyli 1 przy 18 i 0 przy 19 (Twoje "veneer 19 x 2 idealnie"); rail poza karkas = 38 - bok - lip = 19 w obu przypadkach.
2. Stile na końcu ciągu też 38: kryje lip + bok + panel i wystaje poza panel o resztę (1 przy 18 + 18, 0 przy 19 + 19). Panel na styk, jak kazałeś.
3. Łączenie ramy powyżej 2800: cięcie w osi stile między szafkami, bez okucia łączącego (Check żółty mówi, że rama jest w dwóch); okucie wybierzesz później.
4. Zawias: plik reference/hardware/blum-inframe-hinge.json startuje z geometrią CLIP top BLUMOTION 110° INSET (71B3750 / 71B3790) na płytce 0 mm (173H7100 / 175H7100), płytka cofnięta od czoła karkasu o grubość frontu + 1.5 minus 3 = 20.5 (regula Blum dla inset, strona dealera z 21.10). Patrz "Zawias Blum" niżej.
5. Zakres jednostek z ramą: BUD, BUD_INT, BUDR, BUDR2, BUDR4, BUDTALL, SINK, WUD, WUD_GLASS, LOW_CABINET, WARDROBE, WARDROBE_LOW. Sprzęty AGD, narożniki, blind, okapy, topy, desk, free panel, wyspy: rama się tam kończy (segmenty).
6. Blat podnosi się o 19 pod in-frame; gzyms górnej szafki stoi na górnej krawędzi ramy (+19).
7. Front inny niż 22 przy włączonym in-frame: Check #40 czerwony (nie zmieniam Ci materiału sam).
8. Szafki w ciągu nie na styk (dziś silnik może stawiać je z odstępem): stile rośnie o odstęp, Check #41 żółty.
9. Rama z materiału typu frontu (natrysk, jak zielona w mockupie), bez obrzeża.

## Zawias Blum in-frame (Twoje "2 wyszukaj w katalogu"; nic nie wymyślam, same źródła)
Katalog Blum 2024/25 online (wpis Petros 69d71b91): https://publications.blum.com/2024/catalogue/en/ , rozdział Hinge systems od s. 70.
Kandydaci, wszystkie Blum, sprzedawane w UK do in-frame; wybierz jeden, wpiszę / T80 wpisze do json:
- 71B3750 (wkręcany) / 71B3790 (INSERTA): CLIP top BLUMOTION 110°, INSET, cup 35 / 13; reguła Blum dla inset: płytkę cofnąć od czoła o grubość drzwi + 1.5 mm (u nas minus 3 mm, bo front stoi 3 mm przed karkasem). Źródło: https://www.cabinetparts.com/p/blum-hinges-european-cabinet-hinges-BH71B3750-p6667 i https://www.woodworkerexpress.com/blum-110deg-blumotion-hinge-inset-screw-on.html ; zestaw z płytkami 0 mm w UK: https://www.ironmongerydirect.co.uk/product/blum-clip-top-soft-close-cabinet-hinge-pack-&-0mm-mounting-plates-110°-inset-zinc-plated-pair-611564
- 71M2750: CLIP 100°, inset, sprężynowy, bez BLUMOTION; dealer UK pisze wprost "for use with in-frame door systems": https://cpkitchencomponents.co.uk/shop/hinges-lifts/hinges/blum-clip-top-hinges/blum-100-degree-clip-on-hinge-for-use-with-in-frame-door-systems/
- 71B9750: CLIP top BLUMOTION 95°, inset, do grubych drzwi (do 32 mm); przy 22 mm niepotrzebny: https://hardwarehut.com/products/blum-95degree-clip-top-blumotion-thick-door-hinge-inset-screw-on-soft-close
- "71B3650+P": zestaw dealera UK "Blum 110 Degree Integrated Soft Close Inframe Hinge & Plate" (zawias 110° BLUMOTION + płytka krzyżowa "used on inframe kitchens to allow the hinge to open past the frame"): https://www.larkandlarks.co.uk/p/components/accessories/hinges-fittings/blum-110-degree-integrated-soft-close-inframe-hinge-plate
Moja propozycja: 71B3750 na płytce 173H7100 (regulacja mimośrodem), bo geometria inset + cofnięcie 20.5 wychodzi z reguły Blum. Jeśli masz inny numer w cenniku, podaj, spec bierze Twój.

## Gdzie jest co po T80 (żebyś wiedział, co sprawdzać rano)
- Settings / Wizard: wiersz FRONTS: Lay-on / In-frame (British).
- 3D: rama zielona na czole ciągu, fronty w ramie, blat na ramie, 19 nad i pod karkasem.
- CNC: deska FRAME z otworami (cutout), etykieta na stile.
- BOM: FRAME pod ciągiem; notatka "Site filler 19 mm x szerokość ciągu (joiner, not supplied)".
- PDF przekrój: rama 25 x 808 z lipami, drzwi 22 równo z licem, kawałek timber 19 nad wieńcem.
- Check: #40 front nie 22, #41 szafki nie na styk, #42 rama zatrzymana na jednostce poza zakresem, #43 rama łączona, #44 cup za blisko lipu.
- Wyłączony in-frame = dokładnie to, co masz dziś (goldeny i DXF bajt w bajt).
