# START — checklista Piotra (rano, 04.08)

## 1. Weryfikacja fixtures (10 minut, NAJWAŻNIEJSZE)
Otwórz `fixtures/golden-bud.json` i `fixtures/golden-wardrobe.json`.
Szybki spot-check 8 liczb (BUD 600×770×558 G18 / SZAFA 600×2150×578, 2 szuflady):

1. Bok BUD: **540 × 770**
2. Półka BUD: **560 × 520**
3. Front BUD pojedynczy: **597 × 767**
4. Pary zawiasów w boku BUD: **84/116, 454/486, 654/686** (x=37 od przodu)
5. Szafa 2150 → **6 zawiasów**: 100, 490, 880, 1270, 1660, 2050
6. Skrzynka szuflady szafy: głębokość **440** (prowadnica), bok **440×164**, dno **483×440**
7. Front szuflady: **510×197** (pierwszy od dołu), **510×200** (kolejne)
8. Wieniec/partition od spodu: **426** (dla 2 szuflad)

Zgadza się z produkcją → jedziemy. Coś nie gra → napisz do Claude w czacie, poprawimy PRZED push.
Sekcja `verify_with_piotr` w golden-wardrobe.json — 3 rzeczy do potwierdzenia przy okazji.

## 2. Push pakietu do repo
```
git -c http.proxyAuthMethod=basic clone https://github.com/Piotr3009/Cabinet-Core.git
```
Skopiuj CAŁĄ zawartość tego pakietu do katalogu repo (CLAUDE.md, SPEC.md, fixtures/,
reference/, BLOCKERS.md, ten plik), potem:
```
git add -A
git commit -m "Starter package: SPEC, golden fixtures, CLAUDE.md, LISP+PC references"
git push
```

## 3. (Opcjonalnie, można PO nocy) Klucze Supabase
Noc 1 działa w mock-mode bez kluczy. Jeśli chcesz od razu: w katalogu repo utwórz `.env`:
```
VITE_SUPABASE_URL=...        (Supabase: Project Settings → API)
VITE_SUPABASE_ANON_KEY=...
```
`.env` NIE trafia do gita (Claude Code doda .gitignore w Fazie 0).

## 4. Odpalenie nocnej sesji Claude Code
W katalogu repo uruchom Claude Code (jak przy Production Core) i napisz:
```
Przeczytaj CLAUDE.md i wykonaj wszystkie fazy 0-7 zgodnie z instrukcją. Autonomia nocna.
```

## 5. Rano po sesji
Napisz do Claude w czacie projektu: "audyt" — sklonuje wynik, przejdzie skillem
code-repo-auditor, sprawdzi testy vs fixtures i da listę poprawek.

---
Pamiętaj: `sql/001_init.sql` (powstanie w nocy) uruchamiasz RĘCZNIE w Supabase SQL Editor
— zasada "SQL PRZED push" dotyczy dopiero wdrożenia z realną bazą, nie mock-mode.
