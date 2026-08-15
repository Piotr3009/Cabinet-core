-- SQL PRZED push. Tego pliku NIE uruchamia aplikacja ani Claude (CLAUDE.md,
-- tura 32, F6 — "the only SQL in this turn"). Piotr odpala go RĘCZNIE w
-- Supabase SQL Editor, ZANIM zdeployuje build tej tury.
-- Idempotentny: można puścić drugi raz bez szkody. Wymaga sql/001_init.sql.
--
-- ─── cc_hardware_register — REJESTR ISTNIENIA osprzętu (tura 32, F6) ────────
--
-- Decyzja właściciela, 15.08.2026: CabinetCore trzyma rejestr ISTNIENIA,
-- nigdy stanów magazynowych. Stock żyje w JoineryCore; eksport tam jest
-- zaparkowany. Jeden wiersz = jeden artykuł, który automat (engine/hinges.js
-- hingeAutomat, engine/bomInvoice.js) ma prawo wpisać do BOM.
--
-- Zarejestrowany = automat wpisuje artykuł. Niezarejestrowany = ŻÓŁTA linia
-- w BOM (named SPEC). NIC nie blokuje na rejestrze — on informuje. Mock mode
-- / brak tabeli → każdy lookup odpowiada null → żółte linie, aplikacja w
-- pełni żywa (żelazna zasada degradacji).

create table if not exists public.cc_hardware_register (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users (id) on delete cascade default auth.uid(),
  -- Kategorie z języka automatu i BOM (F2/F5). Otwarta lista jest zamierzona:
  -- CHECK trzyma tylko format, nie słownik — nowy rodzaj osprzętu to wiersz,
  -- nie migracja.
  category   text not null check (category <> ''),
  family     text not null default '',
  finish     text,
  -- soft | std — wariant zakupu (miękki domyk czy nie). Prowadnice: T → soft,
  -- S → std (skrypt zasiewu tak mapuje MOVENTO).
  variant    text check (variant in ('soft', 'std') or variant is null),
  angle      numeric,
  article    text not null check (article <> ''),
  -- own = artykuł warsztatu; joinerycore = przyjdzie z integracji (zaparkowana).
  source     text not null default 'own' check (source in ('own', 'joinerycore')),
  label      text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table  public.cc_hardware_register          is 'Rejestr ISTNIENIA artykułów osprzętu (tura 32 F6). Nigdy stany magazynowe — te żyją w JoineryCore.';
comment on column public.cc_hardware_register.category is 'hinge | hinge_plate | runner | leg | clip | rail | shelf_pin | … — język automatu i BOM, otwarta lista.';
comment on column public.cc_hardware_register.family   is 'Rodzina produktu, np. 71B3550, 760H.';
comment on column public.cc_hardware_register.finish   is 'nickel | onyx | … — wykończenie, jeśli artykuł je ma.';
comment on column public.cc_hardware_register.variant  is 'soft | std — miękki domyk czy standard.';
comment on column public.cc_hardware_register.angle    is 'Kąt zawiasu (110 / 95 / 155). NULL dla nie-zawiasów.';
comment on column public.cc_hardware_register.article  is 'Numer artykułu — z katalogu producenta, nigdy wymyślony (zasada 3).';
comment on column public.cc_hardware_register.source   is 'own | joinerycore.';
comment on column public.cc_hardware_register.label    is 'Etykieta dla człowieka; prowadnice niosą tu "NL <mm>", bo długość nominalna to cecha artykułu, nie kolumna.';

-- Artykuł jest identyfikatorem dla właściciela: zasiew drugi raz PODMIENIA
-- wiersz zamiast dokładać duplikat.
create unique index if not exists cc_hardware_register_owner_article_idx
  on public.cc_hardware_register (owner, article);

create index if not exists cc_hardware_register_owner_category_idx
  on public.cc_hardware_register (owner, category);

drop trigger if exists cc_hardware_register_touch on public.cc_hardware_register;
create trigger cc_hardware_register_touch
  before update on public.cc_hardware_register
  for each row execute function public.cc_touch_updated_at();

-- ─── RLS — jak każda inna tabela (001_init.sql) ─────────────────────────────

alter table public.cc_hardware_register enable row level security;

drop policy if exists cc_hardware_register_select on public.cc_hardware_register;
create policy cc_hardware_register_select on public.cc_hardware_register
  for select using (owner = auth.uid());

drop policy if exists cc_hardware_register_insert on public.cc_hardware_register;
create policy cc_hardware_register_insert on public.cc_hardware_register
  for insert with check (owner = auth.uid());

drop policy if exists cc_hardware_register_update on public.cc_hardware_register;
create policy cc_hardware_register_update on public.cc_hardware_register
  for update using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists cc_hardware_register_delete on public.cc_hardware_register;
create policy cc_hardware_register_delete on public.cc_hardware_register
  for delete using (owner = auth.uid());

-- ════════════════════════════════════════════════════════════════════════════
-- PO URUCHOMIENIU
--
--   1. zasiew rejestru z katalogów w repo (uruchamia Piotr, nigdy aplikacja):
--      40 artykułów z manifestu MOVENTO + artykuły zawiasów i płytek Blum z
--      katalogu CLIP top:
--
--        SUPABASE_URL=… SUPABASE_SERVICE_KEY=… CC_OWNER=<uuid użytkownika> \
--          node scripts/seed-hardware-register.mjs
--
--      Bez zmiennych środowiskowych skrypt DRUKUJE, co by zrobił, i nie
--      dotyka bazy.
--
--   2. test izolacji (RĘCZNIE, zalogowany jako user A):
--
--        select count(*) from public.cc_hardware_register;  -- tylko wiersze A
--
--      Zalogowany jako B to samo zapytanie nie może pokazać ani jednego
--      wiersza A.
-- ════════════════════════════════════════════════════════════════════════════
