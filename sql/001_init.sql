-- ============================================================================
-- SQL PRZED push — uruchamia Piotr ręcznie w Supabase SQL Editor
-- ============================================================================
-- Cabinet Core — schemat początkowy (projekt Supabase "cabinet-core", OSOBNY
-- od JoineryCore — SPEC 2.1). Skrypt jest idempotentny: można go puścić drugi
-- raz bez psucia danych.
--
-- ŻELAZNA ZASADA: RLS na KAŻDEJ tabeli, polityki per auth.uid().
-- Aplikacja działa bez tej bazy (mock-mode), więc nic tu nie jest wykonywane
-- automatycznie — uruchomienie jest świadomą decyzją Piotra.
--
-- Zakres: cc_projects + cc_units to model z SPEC 5. cc_materials i cc_profiles
-- są dołożone, bo bez nich „własna lista materiałów" i profil warsztatu
-- mieszkałyby wyłącznie w localStorage, co łamie zasadę „baza nad localStorage".
-- ============================================================================

create extension if not exists "pgcrypto";

-- ─── Projekty ───────────────────────────────────────────────────────────────
create table if not exists public.cc_projects (
  id            uuid primary key default gen_random_uuid(),
  owner         uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name          text not null default 'Untitled project',
  room          jsonb not null default '{"height": 2500, "walls": [{"width": 4000}]}'::jsonb,
  jc_tenant_id  uuid,          -- wypełniane po „Connect JoineryCore"
  jc_project_id uuid,          -- cel eksportu BOM po stronie JC
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists cc_projects_owner_idx on public.cc_projects (owner, updated_at desc);

-- ─── Jednostki (szafy / szafki) w projekcie ─────────────────────────────────
create table if not exists public.cc_units (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.cc_projects (id) on delete cascade,
  type       text not null,                 -- WARDROBE | BUD | WUD | ...
  position   jsonb not null default '{"wall": 0, "x_mm": 0}'::jsonb,
  params     jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists cc_units_project_idx on public.cc_units (project_id, sort_order);

-- ─── Własna lista materiałów warsztatu ──────────────────────────────────────
-- jc_uuid trzyma UUID pozycji stock_items z JoineryCore: import po stronie JC
-- identyfikuje materiały po UUID, nie po kodzie MAT ani nazwie (SPEC 3).
create table if not exists public.cc_materials (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name       text not null,
  category   text not null default 'board',   -- board | front | edging | hardware
  thickness  numeric,
  unit       text not null default 'm2',
  price      numeric,
  jc_uuid    uuid,
  created_at timestamptz not null default now()
);

create index if not exists cc_materials_owner_idx on public.cc_materials (owner, category);

-- ─── Profil warsztatu (edytowalne domyślne liczby silnika) ──────────────────
create table if not exists public.cc_profiles (
  owner      uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  profile    jsonb not null,
  updated_at timestamptz not null default now()
);

-- ─── updated_at ─────────────────────────────────────────────────────────────
create or replace function public.cc_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists cc_projects_touch on public.cc_projects;
create trigger cc_projects_touch before update on public.cc_projects
  for each row execute function public.cc_touch_updated_at();

drop trigger if exists cc_profiles_touch on public.cc_profiles;
create trigger cc_profiles_touch before update on public.cc_profiles
  for each row execute function public.cc_touch_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY — na KAŻDEJ tabeli, polityki per auth.uid()
-- ============================================================================

alter table public.cc_projects  enable row level security;
alter table public.cc_units     enable row level security;
alter table public.cc_materials enable row level security;
alter table public.cc_profiles  enable row level security;

-- cc_projects: właściciel widzi i zmienia wyłącznie swoje projekty
drop policy if exists cc_projects_select on public.cc_projects;
create policy cc_projects_select on public.cc_projects
  for select using (owner = auth.uid());

drop policy if exists cc_projects_insert on public.cc_projects;
create policy cc_projects_insert on public.cc_projects
  for insert with check (owner = auth.uid());

drop policy if exists cc_projects_update on public.cc_projects;
create policy cc_projects_update on public.cc_projects
  for update using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists cc_projects_delete on public.cc_projects;
create policy cc_projects_delete on public.cc_projects
  for delete using (owner = auth.uid());

-- cc_units: własność dziedziczona z projektu rodzica.
-- WITH CHECK na insert/update pilnuje, żeby nie dało się wstawić jednostki
-- do cudzego projektu ani przepiąć swojej do cudzego.
drop policy if exists cc_units_select on public.cc_units;
create policy cc_units_select on public.cc_units
  for select using (exists (
    select 1 from public.cc_projects p where p.id = cc_units.project_id and p.owner = auth.uid()
  ));

drop policy if exists cc_units_insert on public.cc_units;
create policy cc_units_insert on public.cc_units
  for insert with check (exists (
    select 1 from public.cc_projects p where p.id = cc_units.project_id and p.owner = auth.uid()
  ));

drop policy if exists cc_units_update on public.cc_units;
create policy cc_units_update on public.cc_units
  for update using (exists (
    select 1 from public.cc_projects p where p.id = cc_units.project_id and p.owner = auth.uid()
  )) with check (exists (
    select 1 from public.cc_projects p where p.id = cc_units.project_id and p.owner = auth.uid()
  ));

drop policy if exists cc_units_delete on public.cc_units;
create policy cc_units_delete on public.cc_units
  for delete using (exists (
    select 1 from public.cc_projects p where p.id = cc_units.project_id and p.owner = auth.uid()
  ));

-- cc_materials
drop policy if exists cc_materials_select on public.cc_materials;
create policy cc_materials_select on public.cc_materials
  for select using (owner = auth.uid());

drop policy if exists cc_materials_insert on public.cc_materials;
create policy cc_materials_insert on public.cc_materials
  for insert with check (owner = auth.uid());

drop policy if exists cc_materials_update on public.cc_materials;
create policy cc_materials_update on public.cc_materials
  for update using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists cc_materials_delete on public.cc_materials;
create policy cc_materials_delete on public.cc_materials
  for delete using (owner = auth.uid());

-- cc_profiles
drop policy if exists cc_profiles_select on public.cc_profiles;
create policy cc_profiles_select on public.cc_profiles
  for select using (owner = auth.uid());

drop policy if exists cc_profiles_insert on public.cc_profiles;
create policy cc_profiles_insert on public.cc_profiles
  for insert with check (owner = auth.uid());

drop policy if exists cc_profiles_update on public.cc_profiles;
create policy cc_profiles_update on public.cc_profiles
  for update using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists cc_profiles_delete on public.cc_profiles;
create policy cc_profiles_delete on public.cc_profiles
  for delete using (owner = auth.uid());

-- ============================================================================
-- Test izolacji (wykonaj RĘCZNIE, zalogowany jako user A):
--   select count(*) from public.cc_projects;   -- tylko projekty A
--   select count(*) from public.cc_units;      -- tylko jednostki z projektów A
-- Zalogowany jako B te same zapytania nie mogą pokazać ani jednego wiersza A.
-- ============================================================================
