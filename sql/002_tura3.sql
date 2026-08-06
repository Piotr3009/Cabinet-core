-- ═══════════════════════════════════════════════════════════════════════════
-- SQL PRZED push — uruchamia Piotr RĘCZNIE w Supabase SQL Editor.
-- Ten plik NIE jest wykonywany przez aplikację (CLAUDE.md, zasada 6).
--
-- Migracja tury 3. Idempotentna: można puścić dwa razy bez szkody.
-- Wymaga wcześniejszego sql/001_init.sql.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Pokój v2: lista ścian zamiast jednej ────────────────────────────────
-- Pokój jest teraz listą narożników (prostokąt = przypadek szczególny, L-kształt
-- = sześć narożników) plus okna i drzwi. Stary kształt {height, walls:[{width}]}
-- jest migrowany W KODZIE przy odczycie (src/engine/room.js migrateRoom), więc
-- kolumna `room` zostaje jsonb i nic nie trzeba przepisywać w bazie.
-- Ta kolumna dokłada tylko wersję schematu, żeby dało się kiedyś odfiltrować
-- projekty sprzed tury 3 bez parsowania JSON-a.
alter table if exists public.cc_projects
  add column if not exists room_schema smallint not null default 2;

comment on column public.cc_projects.room_schema is
  'Wersja schematu pokoju: 1 = jedna ściana (tura 1-2), 2 = lista narożników + otwory (tura 3).';

-- ── 2. Design settings per projekt ─────────────────────────────────────────
-- Materiały korpusu (1-3 typy), standardowy front, biblioteka drzwi
-- użytkownika, kolor frontów (RAL / F&B / własny HEX) i szerokość infillu.
-- Kształt: src/engine/design.js DEFAULT_DESIGN.
alter table if exists public.cc_projects
  add column if not exists design jsonb not null default '{}'::jsonb;

comment on column public.cc_projects.design is
  'Design settings projektu: carcass.types[], fronts.style, doorStyles[], colour.front, infill.sideWidth.';

-- ── 3. Jednostki: ściana, obrót i przypisanie stylu drzwi ──────────────────
-- Pozycja jednostki to teraz {wall, x_mm, rotation_deg} — obrót jest realnym
-- ustawieniem (wpływa na footprint i kolizje), nie ozdobą. `params` jest jsonb,
-- więc door_style_id / front_colour / carcass_type_id siedzą tam bez migracji;
-- osobna kolumna `wall` ułatwia indeksowanie i zapytania per ściana.
alter table if exists public.cc_units
  add column if not exists wall smallint not null default 0;

alter table if exists public.cc_units
  add column if not exists rotation_deg numeric not null default 0;

comment on column public.cc_units.wall is 'Indeks ściany pokoju, na której stoi jednostka (0 = pierwsza).';
comment on column public.cc_units.rotation_deg is 'Obrót jednostki względem ściany, 0 = tyłem do ściany, 90 = bokiem.';

create index if not exists cc_units_project_wall_idx on public.cc_units (project_id, wall);

-- ── 4. Kolory: nic do zrobienia ────────────────────────────────────────────
-- Listy RAL i Farrow & Ball są plikiem referencyjnym w repo
-- (reference/colors/psw-colors.json, wyekstrahowane 1:1 z PSW) i nie trafiają
-- do bazy — w projekcie zapisuje się WYBRANY kolor (hex + nazwa + system),
-- a nie cały katalog.

-- ── 5. Sprawdzenie po uruchomieniu ─────────────────────────────────────────
-- Powinno zwrócić po jednym wierszu na kolumnę:
--   select column_name, data_type
--     from information_schema.columns
--    where table_name in ('cc_projects','cc_units')
--      and column_name in ('room_schema','design','wall','rotation_deg')
--    order by table_name, column_name;
--
-- RLS: kolumny dokładają się do tabel, które już mają włączone RLS i polityki
-- per auth.uid() z 001_init.sql — nowe kolumny są nimi objęte automatycznie.
