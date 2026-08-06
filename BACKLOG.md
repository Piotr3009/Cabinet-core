# CABINET CORE — BACKLOG
Żywy dokument. Numeracja stała (nie zmieniamy po fakcie). Priorytety: [CRITICAL]/[HIGH]/[MEDIUM]/[LOW].
Status: OPEN → TURA-N (przypisane) → DONE.

## BUGI
1. [CRITICAL] Kolejność szuflad odwrócona: góra listy w panelu = dół w 3D. Ma być 1:1 (góra=góra). — TURA-4
2. [CRITICAL] Pole wysokości szuflady nie przyjmuje wpisywania. Przyczyna (zdiagnozowana):
   kontrolowany input normalizuje/clampuje per klawisz (RightPanel ~281). Fix: lokalny bufor,
   commit na Enter/blur, clamp dopiero przy zatwierdzeniu. Dotyczy też innych pól liczbowych. — TURA-4
3. [DO WERYFIKACJI] Szeroka szafa + drawers internal: silnik i dane 3D na main POPRAWNE
   (inset 71 mm/str., DP 48, front wyśrodkowany — zweryfikowane liczbowo). Piotr: twardy refresh
   produkcji po deployu tury 3 i retest; jeśli nadal źle → zrzut Z APLIKACJI + konfiguracja → CRITICAL.

## TURA 4 — WYGLĄD + SZKIELET + UX PANELU (propozycja cięcia)
4. [HIGH] Materiały neutralne: default korpus złamana biel (#F2F0EC), opcje jasny szary;
   dekory: ciemny orzech + 1 jasne drewno (tekstury lokalne). Złoto-brąz znika z mebli.
5. [HIGH] Kontury elementów: czarne, cienkie; przełącznik konturów OFF/ON. Cel: detaliczny look jak PSW.
6. [MEDIUM] Sheen materiałów ~20% (delikatny połysk jak okna PSW).
7. [HIGH] Ekran startowy (styl AutoCAD): Recent projects / New Project / Open.
8. [HIGH] Górne menu klasyczne: File (New/Open/Save/…) · View · Library · Settings ·
   Database (soon) · Clients (soon). Styl przycisków = obecne Account/Export (złoty akcent).
9. [HIGH] Library z menu: kategorie rozwijane (Szafy / Zapisane komplety / Dolne / Górne /
   Media walls / …) → jeden modal per kategoria; modal grab&move + przycisk X (dziś brak).
   Pływający charakter zostaje (menu tylko otwiera/chowa).
10. [HIGH] Prawy panel — Add items: lista typów; sekcje ustawień ZWIJANE (accordion), bez osobnych modali.
11. [HIGH] Wysokości szuflad: checkbox "Equal heights" (✓ jedna wartość dla wszystkich;
    bez ✓ pola per szuflada).
12. [MEDIUM] Auto-porządek przy dodawaniu: półki od góry, szuflady na dole, hangers pomiędzy.
13. [MEDIUM] Dodanie szuflad wewnętrznych → drzwi jednostki otwierają się (pokazać wnętrze).
14. [MEDIUM] Add hangers: wybór z listy materiałów (hardware); link do stocku JC — później (zaślepka).
15. [HIGH] Infill boczny — zmiana zachowania: jednostka NIE dojeżdża do ściany; stop w odległości
    infilla (mm z ustawień) + infill pojawia się automatycznie przy dojechaniu.
16. [HIGH] Plinth i top infill: NIE automatyczne przy wstawieniu (odwrócenie tury 3) —
    dodawane ręcznie, dopiero wtedy widoczne (i w BOM).
17. [MEDIUM] Prawy klik → "Add end panel" (panel maskujący bok): wybór do podłogi / do wysokości
    szafki; grubość default = grubość frontów; checkbox "wszystkie panele tak samo" (✓) —
    kolejne dodania dziedziczą. Formatka w BOM/CNC.
18. [LOW] Widok konturowy/przezroczysty (render & print): same kontury, tryb prezentacyjny.

## KOLEJKA (po turze 4)
19. [MEDIUM] Egger/producenci: import katalogów dekorów (infrastruktura z pkt 4 gotowa).
    BLOKADA: licencja na grafiki w aplikacji komercyjnej — sprawdza Claude (czat).
20. [MEDIUM] Infille/plinth w kształcie L (przykręcane do boku) — na razie proste (decyzja Piotra).
21. [MEDIUM] VCarve — drobiazgi do zmiany (listę poda Piotr).
22. [MEDIUM] Rzuty z góry / dokumentacja do druku; Print w menu File.
23. [MEDIUM] Rysunek techniczny pomieszczenia DXF/SVG (z tury 3 — odłożone).
24. [LOW] Database / Clients: docelowo dane z JoineryCore (miejsce w menu już w turze 4).
25. [LOW] Import DXF rzutu — test na realnym pliku od architekta (Piotr podeśle).
26. [LOW] sql/002 — odpalić w Supabase przy przejściu na realny zapis.
27. [LOW] GitHub Actions — billing/minuty, potem Re-run (nie blokuje: audyt lokalny działa).

## PARKING (świadomie później)
JC integracja (Stock live, push BOM — endpointy tylko w czacie) · uchwyty · nesting 2D ·
PWA/offline/ikona · tryb demo · fronty inset (czekają liczby od Piotra) · model biznesowy ·
BUDR: potwierdzenie warsztatowe 0.70 / holdery SINK bez oklejki / cokół per ciąg (pyt. 4 z audytu t3).
