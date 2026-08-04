# BUILD-LOG.md — noc 04.08.2026

Dziennik autonomicznej sesji Claude Code: fazy 0–7 wg `CLAUDE.md`.
Jeden wpis na fazę, każdy z **werdyktem**. Problemy → `BLOCKERS.md`.

---

## Faza 0 — Scaffold + shell UI — ✅ ZIELONA

**Co powstało.** Vite + React 19 + Zustand + Tailwind + R3F, struktura
`src/{engine,stores,components,3d,pages,lib}` + `sql/` + `test/`.
Paleta Cabinet Core w `tailwind.config.js` (struktura z PC, kolory z JC:
shell `#1a1a1a`/`#252526`/`#2d2d30`, bordery `#3e3e42`, złoto `#AA8E68`
hover `#C8A678` dark `#8F7654`, kanwas `#fafaf8`, font systemowy).
Layout zamrożony wg SPEC 7: topbar (CABINET CORE złotem, edytowalna nazwa
projektu, BOM, Account, złoty Export) / lewy **pływający** panel Library
przeciągalny za uchwyt (Wardrobe, Base unit, Kitchen — soon wyszarzone,
Room setup, Snap 0.5/1/32 mm) / biały kanwas / prawy panel parametrów
(zamykalny). Badge **Mock data mode** żółty, gdy brak kluczy Supabase.

**Wersje.** Przypięte DOKŁADNIE do PC: React 19.1.1, react-dom 19.1.1,
@react-three/fiber 9.4.0, @react-three/drei 10.7.6, three 0.180.0,
zustand 5.0.0, vite 7.1.3, tailwindcss 3.4.14, @supabase/supabase-js 2.45.4,
jspdf 2.5.2. Jeden wyjątek — `@vitejs/plugin-react` musi zostać zakresem
(peer conflict z vite 7): **BLOCKERS #5**.

**Werdykt.** `npm install` czysty, `npm run build` przechodzi.

---

## Faza 1 — Silnik + testy (brama jakości) — ✅ ZIELONA (1 × todo, udokumentowane)

**Co powstało.**
- `src/engine/profile.js` — WSZYSTKIE stałe Skylonu jako edytowalne defaulty,
  wzorzec 1:1 z PC: komentarz *"different workshops = different NUMBERS, never
  different formulas"*, pojedynczy punkt odczytu `getCabinetProfile()`,
  migracja schematu `migrateCabinetProfile()`. Zero gołych liczb we wzorach —
  łącznie z systemem puzzli, progiem drzwi, standardem prowadnic i CSV.
- `src/engine/types.js` — konfigi typów z diffów LISP (BUD / WARDROBE).
- `src/engine/puzzle.js` — geometria puzzli Skylon **1:1** z `SKYLON_COMMON.lsp`
  (drawBUL / drawBUR / drawTOP_ROT90 / drawBACK): outline z zębami, dogbones,
  sockety, wkręty, nazwy warstw.
- `src/engine/cabinet.js` — `computeCabinet(params, profile)` →
  `{ derived, panels[], drills[], drillSummary, totals, csvLines[], warnings[], assemblies }`.
  Zero importów Reacta. Pełny typ BUD + pełny typ WARDROBE (szuflady, drawer
  panel, fillery, wieniec, rail, prowadnice).
- `src/engine/format.js` — `rtos()` odtwarzający zaokrąglanie AutoLISP-a,
  żeby CSV był identyczny co do znaku.
- `test/engine.test.js` — czyta OBA pliki fixtures, dla każdego case porównuje
  `derived`, panele (wymiary, qty, banding, area), **kompletny multiset formatek**
  (nic nie ginie i nic nie dochodzi), wiercenia (i rekordy `drills[]`, nie tylko
  podsumowanie), totals i `csv_labels` **dokładnie co do znaku**. Do tego testy
  reguł: próg drzwi, liczba zawiasów tall/low, snap głębokości szuflady, ścieżki
  ostrzeżeń, geometria puzzli, migracja profilu.

**Zasada precyzji w testach.** Fixtures podają wartości zaokrąglone i **nie
zawsze do tylu samo miejsc** (BUD-A `board_area_m2` = 2.19 → 2 miejsca,
W-A = 6.757 → 3). Test zaokrągla wynik silnika do tylu miejsc, ile podaje
fixture, i wymaga trafienia **dokładnego** — ostrzej niż widełki ±0.001.

**Fixtures.** Nietknięte. Żadna wartość oczekiwana nie została zmieniona,
zaokrąglona ani wyłączona.

**Werdykt.** `npm test` → **69 testów, 68 pass, 0 fail, 1 todo**.
Jedyne `todo` to `W-B › totals.panels_true_incl_railpart` — fixture jest
wewnętrznie sprzeczna (W-A liczy panele wg formuły LISP, W-B dolicza jeszcze
fronty drzwi). Test **działa i raportuje** różnicę 29 vs 27, nie jest wyciszony.
Pełna analiza + rekomendacja: **BLOCKERS #1**. Reszta W-B (wszystkie wymiary,
11.044 m² płyty, 2.985 m² frontów, 8.95 mb obrzeża, wiercenia) przechodzi
dokładnie, więc sam zestaw formatek jest potwierdzony.

Przy okazji wyszła rozbieżność progu drzwi 704 vs 705 mm — **BLOCKERS #2**.
