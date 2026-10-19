# Chat fix 19.10.2026, paczka 3 (ZIP 3): drugi drążek w tym samym bayu, 950 mm jako propozycja

Baza: ZIP 1 + ZIP 2 na main f93a047. Ta paczka nakłada się na obie.

Słowa Piotra 19.10 (09:16, eye-test T79, punkt F11): "nie ma mozliwosci dodania drugiego ponizej, dodaj to
prosze, i proponuj (jak polki) 950 jedne od drugiego"; na pytanie "950 mm os do osi, drugi w tym samym bayu pod
pierwszym?" (09:59): "tak ale tylko jako propozycja". 10:15: "koduj, nic juz nie pytaj".

## Prawo po tej paczce (reference/lisp/KIT_HANGER_TWO.lsp, NOWY plik, skamieliny nietknięte)

D1 dwa drążki na bay, trzeci odmowa zdaniem "This bay already hangs two rails." (PROPOSED).
D2 drugi rodzi się 950 pod pierwszym (oś do osi); jak nie ma miejsca (oś minus promień poniżej dna albo poniżej
   wieńca stosu szuflad) odmowa zdaniem "No room for a second rail 950 mm under this one; raise the first."
D3 propozycja = magnes przy przeciąganiu, w obie strony: 950 pod i nad każdym innym drążkiem w tym samym bayu,
   obok 50 pod półką z T79 F11; Alt odmawia.
D4 jeden tor: drugi drążek to prawo drążka kolumnowego (T32 F4) bez kolumny: ta sama oś, ten sam clamp, te same
   2 wkręty 3 mm uchwytów w BUL i BUR, ta sama linia BOM. Żadnego nowego wzoru otworów.
D5 liczba w profilu: hardware.hanger.betweenRailsMm 950 (PROPOSED, owner to confirm), bez pola w UI.

## Co weszło

- Silnik (src/engine/cabinet.js): cfg.columnRails dostaje hangery unit-wide po pierwszym jako wpisy z zone null;
  pętla drążków kolumnowych bierze zone null jako cały bay (BUL do BUR, półki i stos unit-wide jako podpory);
  wkręty uchwytów w BUL/BUR; linia BOM bez kolumny; RAIL_TOO_HIGH mówi "Second rail"; totals.rail liczy drążki.
  Pierwszy drążek (rail / railOffset) bez zmian bajt w bajt.
- src/engine/profile.js: hardware.hanger.betweenRailsMm 950.
- Store (src/stores/projectStore.js): hangerRailRefusal(unitId, zone) (zdanie odmowy albo null), secondRailAxis
  (oś, między, pierwszy, podłoga, fits), addHangerRail: drugi 950 pod pierwszym, trzeci null; railMagnetCandidates:
  950 pod i nad innymi drążkami tego samego biegu obok półek (railItemId w ofercie).
- UI PRO (src/components/AddItems.jsx): Add hanger rail pyta store "dlaczego nie" i mówi zdaniem; komunikat
  "Second rail added 950 mm under the first; drag it, Alt refuses the magnet."; wiersz gaśnie dopiero przy dwóch.
  src/components/RailModal.jsx: okno znajduje drążek po itemId (drugi unit-wide jest wśród drążków kolumnowych).
  Kopie retail przez scripts/t78-copy.mjs (AddItems, RailModal: byte for byte). Retail: adapter.js
  interiorRefusals.hanger = zdanie store'u; reasons.js: railAlreadyThere skasowane (martwe).
- Golden: fixtures/golden-rails-two.json (WARDROBE 600, drążki 1418 i 468, 4 wkręty uchwytów, 2 linie 564).
  Bramka secondRail (fragment scripts/t78-classify.d/f37-owner-1910c.mjs) otwiera się tylko na 2+ hangery unit-wide:
  szóstka IDENTICAL, każdy inny golden bez zmian.
- Testy: nowy test/chatfix-1910-hanger-two.test.js (8); przepisane do nowego prawa: turn32-f4-zones (trzeci odmowa),
  turn79-f11-rail, turn61-f4-the-interior; turn35-lisp-parens (nowy plik), turn77-f5 (NEW_FILES), turn59-f1 (EXEMPT
  i hashe AddItems, RailModal).

## Dowody

Pełna suita: 7014 testow: pierwszy pelny przebieg 7008 zielone, 6 czerwone (trzy spisy LISP liczyly do 23, dwa spisy kopii i test F9 nie znaly RailModal), kazdy przepisany o jedna linie listy; drugi pelny przebieg po tych poprawkach: patrz koncowka czatu (w toku przy pakowaniu). Klasyfikator t78 strict GREEN (T78 goldeny 27/27, 35/35 bramek żywych). t78-copy --check
CLEAN (adapter.js hunk 2282 i reasons.js hunk 305 przypięte). Walk scripts/chatfix-1910-walk.mjs 19/19 (sekcja 4:
drugi drążek 950 pod pierwszym, scena rysuje dwa pręty, trzeci odmowa zdaniem, drag pierwszego do 1395 łapie 1400);
klatka 08-two-rods.png. Build Vite OK. LISP ASCII, nawiasy 0/0, nagłówek Skylon.

## Odczyty przyjęte bez pytania (Piotr: "nic już nie pytaj")

1. Maksimum dwa drążki na bay (prosił o "drugi"); trzeci odmowa.
2. Drugi bez miejsca pod pierwszym: odmowa zdaniem, nic nie stawiane gdzie indziej (room refuses first).
3. Magnes 950 działa w obie strony (pod i nad), żeby drugi i pierwszy przeciągały się tak samo.
4. Drążek kolumnowy w podzielonej szafie też dostaje drugiego tym samym prawem.
