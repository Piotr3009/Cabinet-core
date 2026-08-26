-- SQL PRZED push. Tego pliku NIE uruchamia aplikacja ani Claude (żelazna
-- zasada 7 z tury 44). Piotr odpala go RĘCZNIE w Supabase SQL Editor, ZANIM
-- zdeployuje build tej tury.
-- Idempotentny: można puścić drugi raz bez szkody. Wymaga sql/001_init.sql
-- (funkcja `public.cc_touch_updated_at`).
--
-- ─── cc_warehouse — MAGAZYN MATERIAŁÓW (tura 51, F7) ────────────────────────
--
-- CLAUDE.md tury 51, F7: *"Model, exactly Production Core's: `item_number`
-- (auto), `name`, `category`, `subcategory`, `size`, `thickness`, `color`,
-- `unit`, `cost_per_unit`, `image_url`, `jc_uuid`, `notes`. **Own table**, not
-- shared with PC."*
--
-- Nie jest też dzielona z `cc_materials` — tamta to sześciokolumnowa lista
-- stanu, którą czyta modal przypisań (tura 39). Dwie listy o dwóch różnych
-- zadaniach i dwóch różnych kształtach to dwie tabele; złączenie ich kosztowało
-- by jeden z dwóch ekranów pola, których potrzebuje.
--
-- ─── `jc_uuid` OD PIERWSZEGO DNIA ──────────────────────────────────────────
--
-- *"On import from JoineryCore, match on it: overwrite the existing row, never
-- add a second."*  Stąd UNIKALNY indeks na (owner, jc_uuid) — baza trzyma tę
-- samą zasadę co `engine/warehouse.js mergeImport`, więc podwójny wiersz nie
-- powstanie nawet, gdyby import poszedł z dwóch kart naraz.
--
-- ─── DEGRADACJA (żelazna zasada 6) ─────────────────────────────────────────
--
-- Bez tej tabeli aplikacja DZIAŁA W PEŁNI. `withDb` (src/lib/supabase.js)
-- zamienia mock mode, martwą sieć i brak tabeli w to samo ciche `null`, a
-- `src/lib/warehouseDb.js` zwraca wtedy `source: 'local'`. Magazyn otwiera się,
-- mówi bursztynową linijką, że jest offline, i NIE GUBI wpisanego wiersza.

create extension if not exists "pgcrypto";

create table if not exists public.cc_warehouse (
  id            uuid primary key default gen_random_uuid(),
  -- Właściciel wiersza — warunek RLS, tak jak w cc_settings_sets.
  owner         uuid not null references auth.users (id) on delete cascade default auth.uid(),
  item_number   text not null,
  name          text not null,
  category      text,
  subcategory   text,
  size          text,
  thickness     numeric,
  color         text,
  unit          text,
  cost_per_unit numeric,
  image_url     text,
  jc_uuid       text,
  notes         text,
  -- NASZE, nie PC: skąd wzięła się cena. *"the record says WHICH, so a
  -- re-import cannot silently overwrite a hand-typed figure without saying
  -- so."*  Nie ma tego w CSV — plik nie potrafi powiedzieć, czy liczbę wpisał
  -- człowiek.
  price_source  text not null default 'typed',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists cc_warehouse_owner_idx
  on public.cc_warehouse (owner, item_number);

create index if not exists cc_warehouse_category_idx
  on public.cc_warehouse (owner, category);

-- Jeden warsztat nie ma dwóch wierszy z tym samym jc_uuid. To jest ta sama
-- zasada, którą trzyma mergeImport — tu, żeby trzymała się także wtedy, gdy
-- import poleci z dwóch kart naraz.
create unique index if not exists cc_warehouse_owner_jc_idx
  on public.cc_warehouse (owner, jc_uuid)
  where jc_uuid is not null and jc_uuid <> '';

-- …i jeden warsztat nie ma dwóch wierszy z tym samym numerem katalogowym.
-- `item_number` to etykieta na półce.
create unique index if not exists cc_warehouse_owner_item_idx
  on public.cc_warehouse (owner, item_number);

drop trigger if exists cc_warehouse_touch on public.cc_warehouse;
create trigger cc_warehouse_touch
  before update on public.cc_warehouse
  for each row execute function public.cc_touch_updated_at();

-- ─── RLS (CLAUDE.md F7: "RLS on the table") ────────────────────────────────
-- Idiom cc_settings_sets: wiersz należy do konta i tylko konto go widzi.
alter table public.cc_warehouse enable row level security;

drop policy if exists cc_warehouse_select on public.cc_warehouse;
create policy cc_warehouse_select on public.cc_warehouse
  for select using (owner = auth.uid());

drop policy if exists cc_warehouse_insert on public.cc_warehouse;
create policy cc_warehouse_insert on public.cc_warehouse
  for insert with check (owner = auth.uid());

drop policy if exists cc_warehouse_update on public.cc_warehouse;
create policy cc_warehouse_update on public.cc_warehouse
  for update using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists cc_warehouse_delete on public.cc_warehouse;
create policy cc_warehouse_delete on public.cc_warehouse
  for delete using (owner = auth.uid());

comment on table public.cc_warehouse is
  'Magazyn materiałów (tura 51, F7). Model jak w Production Core; własna tabela.';
comment on column public.cc_warehouse.price_source is
  'typed | import — skąd wzięła się cost_per_unit. Nie ma tego w CSV.';
