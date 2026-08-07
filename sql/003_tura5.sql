-- ════════════════════════════════════════════════════════════════════════════
-- CABINET CORE — sql/003_tura5.sql — TURA 5
--
-- SQL PRZED push. Ten plik NIE zostal uruchomiony przez Claude (CLAUDE.md:
-- "sql tylko jako pliki"). Piotr odpala go w Supabase SQL Editor, gdy przejdzie
-- na realny zapis (BACKLOG #26 — to samo dotyczy sql/002_tura3.sql).
--
-- Do czasu uruchomienia aplikacja dziala w mock-mode: zapisane komplety siedza
-- w localStorage (`cc.templates.v1`, lib/templates.js), a wysokosci projektu w
-- kolumnie `design` z sql/002. Nic ponizej nie jest wymagane, zeby tura 5
-- dzialala — to jest miejsce, do ktorego te dane trafia w bazie.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Zapisane komplety (BACKLOG #30) ─────────────────────────────────────
-- "Save as template": skonfigurowana jednostka zapisana pod nazwa i wstawiana
-- ponownie z Library ▸ Saved sets.
--
-- Wlasna tabela, nie kolumna w cc_projects: komplet NALEZY DO WARSZTATU, a nie
-- do projektu — cala jego wartosc polega na tym, ze przezywa projekt, w ktorym
-- powstal. `params` jest jsonb, wiec kazdy przyszly parametr jednostki jedzie
-- tu bez migracji, dokladnie tak jak w cc_units.
--
-- Czego tu NIE MA i byc nie powinno: pozycji (sciana, x_mm, obrot) ani numeru
-- jednostki. Komplet to szafka, nie miejsce — wstawienie idzie normalna sciezka
-- add, wiec kolizje i wolne sloty dzialaja jak dla typu z biblioteki.
create table if not exists public.cc_templates (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  unit_type    text not null,                       -- 'WARDROBE' | 'BUD' | ...
  params       jsonb not null default '{}'::jsonb,
  schema       smallint not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table  public.cc_templates            is 'Zapisane komplety (Library ▸ Saved sets) — parametry skonfigurowanej jednostki, bez pozycji.';
comment on column public.cc_templates.unit_type  is 'Typ jednostki z engine/types.js (UNIT_TYPES).';
comment on column public.cc_templates.params     is 'unit.params bez unit_num i bez side_infill_* (lib/templates.js templateParams()).';
comment on column public.cc_templates.schema     is 'Wersja ksztaltu params; migracja po stronie aplikacji.';

-- Nazwa jest identyfikatorem dla uzytkownika: zapis pod istniejaca nazwa
-- PODMIENIA komplet (lib/templates.js saveTemplate), wiec baza pilnuje tego
-- samego. Biblioteka pelna "Standard", "Standard (2)", "Standard (3)" to
-- biblioteka, ktorej nikt nie uzywa.
create unique index if not exists cc_templates_user_name_idx
  on public.cc_templates (user_id, lower(name));

create index if not exists cc_templates_user_updated_idx
  on public.cc_templates (user_id, updated_at desc);

alter table public.cc_templates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'cc_templates' and policyname = 'cc_templates_own'
  ) then
    create policy cc_templates_own on public.cc_templates
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- ── 2. Wysokosci projektu (BACKLOG #29) ────────────────────────────────────
-- NIC DO ZROBIENIA. Wysokosci projektu (base / wall / tall / wallMount /
-- toeKick) siedza w `design.heights`, a kolumna `design` jsonb powstala juz w
-- sql/002_tura3.sql. Wpisane tutaj, zeby przy czytaniu tego pliku nie powstalo
-- pytanie "a gdzie sa wysokosci" — odpowiedz brzmi: w design, jak reszta
-- ustawien projektu.
--
-- Wysokosc pojedynczej jednostki i jej flaga "custom" jada w cc_units.params
-- (`height`, `height_custom`, `leg_height`, `mount_height`) — jsonb, wiec bez
-- migracji.

-- ── 3. Dekory EGGER (BACKLOG #19, picker v1) ───────────────────────────────
-- NIC DO ZROBIENIA W TEJ TURZE. Wybrany dekor zapisuje sie w projekcie jako id
-- w `design.finish.carcass` / `design.finish.front` w formie 'egger:H1180_37',
-- a katalog jest plikiem w repo (public/decors/egger-decors.json). Bucket
-- `decors` w Supabase (decyzja z 06.08) dotyczy PACZEK DEKOROW per warsztat i
-- czeka na pisemna zgode Eggera na tekstury 3D — do tego czasu w aplikacji sa
-- tylko miniaturki z atrybucja i `hex` do tonowania naszej wlasnej tekstury.

-- ── 4. Sprawdzenie po uruchomieniu ─────────────────────────────────────────
--   select table_name, column_name, data_type
--     from information_schema.columns
--    where table_name = 'cc_templates'
--    order by ordinal_position;
--
--   select policyname from pg_policies
--    where schemaname = 'public' and tablename = 'cc_templates';
