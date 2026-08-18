-- SQL PRZED push. Tego pliku NIE uruchamia aplikacja ani Claude (CLAUDE.md,
-- tura 39, żelazna zasada 6). Piotr odpala go RĘCZNIE w Supabase SQL Editor,
-- ZANIM zdeployuje build tej tury.
-- Idempotentny: można puścić drugi raz bez szkody. Wymaga sql/001_init.sql.
--
-- ─── cc_material_assignments — PRZYPISANIA MATERIAŁÓW, JEDEN WIERSZ NA PROJEKT ─
--
-- Właściciel, 18.08.2026: *"każdy jeden projekt powinien mieć Assign
-- materials"*. Nie warsztat — PROJEKT. Ta sama kuchnia w dwóch domach ma dwie
-- płyty, a rejestr warsztatu (profile.materials.defaults) jest tylko punktem
-- startowym, który zasiewa NOWY projekt.
--
-- Jeden wiersz = jeden projekt. `data` to blob schema-2 z
-- src/engine/partRegistry.js:
--
--   { schema: 2,
--     base:        { [partId]: { material_id, yield, category, subcategory } },
--     overrides:   { [partId]: { [rodzina]: { … } } },
--     customParts: [ { id, name, unit, qtyPerUnit } ],
--     auto:        { [partId]: true } }
--
-- `base` = domyślne dla projektu. `overrides` = per RODZINA SZAFKI
-- (wardrobe | base | wall | tall | pantry). Override wygrywa, base dziedziczy.
-- `yield` = współczynnik odpadu (1.0 = bez zapasu, 1.15 = zamów 15 % więcej).
--
-- ─── DEGRADACJA (żelazna zasada 6) ──────────────────────────────────────────
--
-- Bez tej tabeli aplikacja DZIAŁA W PEŁNI. `withDb` (src/lib/supabase.js)
-- zamienia brak tabeli, martwą sieć i mock mode w to samo `null`, a
-- `loadAssignments()` czyta wtedy lokalny blob projektu (localStorage —
-- `saveLocalProject` trzyma cały obiekt project, więc przypisania jadą z nim).
-- BOM pokazuje linie `part:` bez ceny zamiast pustego ekranu. NIC nie rzuca,
-- nic nie blokuje, żaden ekran nie znika.

create table if not exists public.cc_material_assignments (
  project_id uuid primary key references public.cc_projects (id) on delete cascade,
  owner      uuid not null references auth.users (id) on delete cascade default auth.uid(),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists cc_material_assignments_owner_idx
  on public.cc_material_assignments (owner);

-- updated_at przez wspólny trigger z sql/001_init.sql.
drop trigger if exists cc_material_assignments_touch on public.cc_material_assignments;
create trigger cc_material_assignments_touch
  before update on public.cc_material_assignments
  for each row execute function public.cc_touch_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
-- Idiom cc_units: właściciel wiersza JEST właścicielem projektu, więc polityka
-- pyta rodzica przez EXISTS. Dodatkowo `owner = auth.uid()`, tak jak
-- cc_materials — dwa zamki na tych samych drzwiach są tańsze niż jeden zły.
alter table public.cc_material_assignments enable row level security;

drop policy if exists cc_material_assignments_select on public.cc_material_assignments;
create policy cc_material_assignments_select on public.cc_material_assignments
  for select using (owner = auth.uid() and exists (
    select 1 from public.cc_projects p
    where p.id = cc_material_assignments.project_id and p.owner = auth.uid()
  ));

drop policy if exists cc_material_assignments_insert on public.cc_material_assignments;
create policy cc_material_assignments_insert on public.cc_material_assignments
  for insert with check (owner = auth.uid() and exists (
    select 1 from public.cc_projects p
    where p.id = cc_material_assignments.project_id and p.owner = auth.uid()
  ));

drop policy if exists cc_material_assignments_update on public.cc_material_assignments;
create policy cc_material_assignments_update on public.cc_material_assignments
  for update using (owner = auth.uid() and exists (
    select 1 from public.cc_projects p
    where p.id = cc_material_assignments.project_id and p.owner = auth.uid()
  )) with check (owner = auth.uid());

drop policy if exists cc_material_assignments_delete on public.cc_material_assignments;
create policy cc_material_assignments_delete on public.cc_material_assignments
  for delete using (owner = auth.uid());

-- ─── cc_materials: SŁOWNIK KATEGORII SIĘ POSZERZA ───────────────────────────
--
-- `category` w sql/001_init.sql miało komentarz `board | front | edging |
-- hardware`. Rejestr części z tury 39 ma siedem typów materiału — doszły
-- `lighting` (taśma, zasilacz, profil) i `consumable` (konfirmaty, kołki,
-- klej). Kolumna NIE MA CHECK-a, więc nie trzeba migrować danych; to jest
-- poprawka komentarza, żeby następny czytający nie musiał zgadywać.
comment on column public.cc_materials.category is
  'board | front | edging | hardware | lighting | consumable — src/engine/partRegistry.js materialType';
