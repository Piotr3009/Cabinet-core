-- SQL PRZED push. Tego pliku NIE uruchamia aplikacja ani Claude (CLAUDE.md,
-- tura 44, żelazna zasada 7). Piotr odpala go RĘCZNIE w Supabase SQL Editor,
-- ZANIM zdeployuje build tej tury.
-- Idempotentny: można puścić drugi raz bez szkody. Wymaga sql/001_init.sql
-- (funkcja `public.cc_touch_updated_at` i tabela `public.cc_projects`).
--
-- ─── cc_settings_sets — ZESTAW USTAWIEŃ, KTÓRY IDZIE ZA KONTEM ──────────────
--
-- CLAUDE.md tury 44, F8: *"Final separate modal: 'Zapisać te ustawienia jako
-- Twój standard?' big Y/N + name field → INSERT into `cc_settings_sets`
-- (payload = the whole settings object). The list in F3 reads from the same
-- table."*
--
-- Zestaw ustawień żyje w localStorage od tury 7 (`src/lib/settingsSets.js`) i
-- to się NIE ZMIENIA — półka lokalna jest zapisywana zawsze i pierwsza. Ta
-- tabela dokłada drugą połowę: warsztat, który zapisał "nasza standardowa
-- kuchnia" na laptopie, ma ją znaleźć na tablecie.
--
-- `payload` to CAŁY obiekt `design` (src/engine/design.js `migrateDesign`),
-- nie jego wycinek. Powód jest z tury 7 i nadal obowiązuje: zestaw, który
-- niósłby materiały, ale nie wysokości, zapisywałby się po połowie, a pierwszy
-- raz zauważyłby to ktoś dopiero na liście cięć.
--
-- ─── DEGRADACJA (żelazna zasada 6 i 7) ──────────────────────────────────────
--
-- Bez tej tabeli aplikacja DZIAŁA W PEŁNI. `withDb` (src/lib/supabase.js)
-- zamienia mock mode, martwą sieć i brak tabeli w to samo ciche `null`, a
-- `src/lib/settingsSetsDb.js` zwraca wtedy `source: 'local'`. Kreator zapisuje
-- zestaw na tym komputerze i mówi to bursztynową linijką ("Saved on this
-- computer. Run supabase/migrations/t44_settings_sets.sql…"). NIC nie rzuca,
-- nic nie blokuje, żaden ekran nie znika.

create extension if not exists "pgcrypto";

create table if not exists public.cc_settings_sets (
  id         uuid primary key default gen_random_uuid(),
  -- Właściciel wiersza. CLAUDE.md F8 wymienia cztery kolumny; ta piąta jest
  -- warunkiem "owner-only policies matching the other cc_* tables" — bez niej
  -- RLS nie ma o co zapytać.
  owner      uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name       text not null,
  payload    jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cc_settings_sets_owner_idx
  on public.cc_settings_sets (owner, created_at desc);

-- Jeden warsztat nie ma dwóch zestawów o tej samej nazwie — półka lokalna
-- trzyma tę samą zasadę od tury 7 ("save my standard kitchen" dwa razy znaczy
-- ZASTĄP, a nie "zgadnij, który jest żywy").
create unique index if not exists cc_settings_sets_owner_name_idx
  on public.cc_settings_sets (owner, lower(name));

-- updated_at przez wspólny trigger z sql/001_init.sql.
drop trigger if exists cc_settings_sets_touch on public.cc_settings_sets;
create trigger cc_settings_sets_touch
  before update on public.cc_settings_sets
  for each row execute function public.cc_touch_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
-- Idiom cc_materials: wiersz należy do konta i tylko konto go widzi. Nie ma
-- rodzica do zapytania (zestaw nie należy do projektu — należy do warsztatu),
-- więc polityka jest jednym zamkiem i jest nim `owner = auth.uid()`.
alter table public.cc_settings_sets enable row level security;

drop policy if exists cc_settings_sets_select on public.cc_settings_sets;
create policy cc_settings_sets_select on public.cc_settings_sets
  for select using (owner = auth.uid());

drop policy if exists cc_settings_sets_insert on public.cc_settings_sets;
create policy cc_settings_sets_insert on public.cc_settings_sets
  for insert with check (owner = auth.uid());

drop policy if exists cc_settings_sets_update on public.cc_settings_sets;
create policy cc_settings_sets_update on public.cc_settings_sets
  for update using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists cc_settings_sets_delete on public.cc_settings_sets;
create policy cc_settings_sets_delete on public.cc_settings_sets
  for delete using (owner = auth.uid());

comment on table public.cc_settings_sets is
  'Zestawy ustawień projektu (tura 44, F8). payload = cały design z src/engine/design.js.';
comment on column public.cc_settings_sets.payload is
  'Cały obiekt design — migrateDesign() na wejściu i na wyjściu.';
