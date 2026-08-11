-- ════════════════════════════════════════════════════════════════════════════
-- CABINET CORE — sql/004_tura22.sql — TURA 22
--
-- SQL PRZED push. Tego pliku NIE uruchamia aplikacja ani Claude (CLAUDE.md,
-- zasada 6 i zasada 0 tury 22). Piotr odpala go RĘCZNIE w Supabase SQL Editor,
-- ZANIM zdeployuje build tej tury.
--
-- Idempotentny: można puścić drugi raz bez szkody. Wymaga sql/001_init.sql.
--
-- ŻELAZNA ZASADA: RLS na KAŻDEJ tabeli, polityki wypisane per auth.uid().
--
-- CO TU JEST I DLACZEGO
--
--   cc_hardware            manifesty osprzętu (runners / hinges / lifts) —
--                          moduł danych parkowany od tury 15 (F6.8 tury 18).
--   cc_company_defaults    domyślne warsztatu: piętro, którego brakowało
--                          między kodem a projektem.
--
-- BEZ TYCH TABEL APLIKACJA DZIAŁA DOKŁADNIE TAK JAK DZIŚ. Brak tabeli, brak
-- sesji, brak sieci — to trzy różne "nie ma" i wszystkie trzy kończą się tym
-- samym: liczby z profilu, manifesty z bucketu, mock-mode. Wiersz w bazie —
-- gdy JEST — WYGRYWA. To jest cała zasada "database over localStorage,
-- degradation over blocking".
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─── 1. cc_hardware — manifesty osprzętu (CLAUDE.md F2a) ────────────────────
--
-- Jeden wiersz na KATALOG: rodzina + system. `manifest` to jsonb w DOKŁADNIE
-- tym kształcie, który dziś leży w buckecie — test/fixtures/bucket/*.json są
-- kontraktem (R3), a parser (`engine/runners.js parseRunnerManifest`,
-- `engine/hinges.js parseHingeCatalogue`) jest tolerancyjny z tury 20 i czyta
-- jedno i drugie tak samo. Wiersz PODMIENIA pobrany JSON i nic więcej:
-- składanie URL-i do modeli GLB zostaje bez zmian (R4 tego pilnuje).
--
-- `bucket_path` jest zapisany, żeby było widać, SKĄD wiersz pochodzi —
-- scripts/seed-hardware.mjs wpisuje tam ścieżkę, z której czytał.
create table if not exists public.cc_hardware (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users (id) on delete cascade default auth.uid(),
  family      text not null check (family in ('runners', 'hinges', 'lifts')),
  system      text not null default '',
  manifest    jsonb not null default '{}'::jsonb,
  bucket_path text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.cc_hardware             is 'Manifesty osprzętu — jeden wiersz na katalog (rodzina + system). Wiersz wygrywa nad manifestem z bucketu; brak wiersza = zachowanie sprzed tury 22.';
comment on column public.cc_hardware.family      is 'runners | hinges | lifts — rodziny z engine/*.js, nie nazwy plików.';
comment on column public.cc_hardware.system      is 'System w obrębie rodziny: 760H, cliptop_blumotion, aventos.';
comment on column public.cc_hardware.manifest    is 'JSON w kształcie pliku z bucketu (R3: test/fixtures/bucket/*.json to kontrakt).';
comment on column public.cc_hardware.bucket_path is 'Ścieżka w buckecie, z której wiersz został zasiany (scripts/seed-hardware.mjs).';

-- Rodzina + system jest identyfikatorem dla właściciela: zasiew drugi raz
-- PODMIENIA wiersz zamiast dokładać duplikat, którego nikt nie odróżni.
create unique index if not exists cc_hardware_owner_family_system_idx
  on public.cc_hardware (owner, family, lower(system));

create index if not exists cc_hardware_owner_updated_idx
  on public.cc_hardware (owner, updated_at desc);

-- ─── 2. cc_company_defaults — domyślne warsztatu (CLAUDE.md F2b) ────────────
--
-- JEDEN wiersz na właściciela — dlatego `owner` jest kluczem głównym, tak samo
-- jak w cc_profiles z tury 1. To nie jest projekt i nie jest profil silnika:
-- to PREFERENCJE warsztatu, od których startuje każdy nowy projekt.
--
-- CO TU WOLNO, A CZEGO NIE WOLNO — to jest cała treść F2b.1:
--
--   WOLNO   tylko takie rzeczy, których reguła NIE JEST W STANIE wyliczyć:
--           który system zawiasów warsztat trzyma, w jakim wykończeniu
--           (nikiel / onyks), na jakiej prowadnicy montażowej, który wariant
--           prowadnic szuflad (T / S) i jaka płyta na rodzinę.
--
--   NIE WOLNO niczego, co reguła liczy. KĄT ZAWIASU wynika z grubości frontu
--           (engine/hinges.js hingeAngleFor) i wpisanie go tutaj byłoby
--           warsztatem kłócącym się z własnym frontem. Walidator po stronie
--           aplikacji (engine/companyDefaults.js) ODRZUCA takie klucze, a
--           `check` niżej jest tym samym zdaniem powiedzianym przez bazę —
--           bo aplikacja to nie jedyna droga do tabeli.
create table if not exists public.cc_company_defaults (
  owner      uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  defaults   jsonb not null default '{}'::jsonb,
  schema     smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Klucze, które NALEŻĄ DO REGUŁY. Baza odmawia ich tak samo jak walidator.
  constraint cc_company_defaults_no_rule_keys check (
    not (defaults ?| array[
      'hinge_angle', 'hingeAngle', 'angle',
      'hinge_count', 'hinge_centres', 'hinge_positions',
      'drilling', 'cup_diameter', 'cup_depth'
    ])
  )
);

comment on table  public.cc_company_defaults          is 'Domyślne warsztatu — jeden wiersz na właściciela. Nowy projekt startuje od nich; odchylenia mieszkają w ustawieniach projektu.';
comment on column public.cc_company_defaults.defaults is 'Tylko preferencje: hinge_system, hinge_finish, plate, runner_variant, boards{}. Nigdy nic, co reguła wylicza.';
comment on column public.cc_company_defaults.schema   is 'Wersja kształtu; migracja po stronie aplikacji (engine/companyDefaults.js).';

-- ─── 3. updated_at ──────────────────────────────────────────────────────────
-- Funkcja `public.cc_touch_updated_at()` pochodzi z sql/001_init.sql; tu tylko
-- wieszamy na niej dwa nowe triggery.
drop trigger if exists cc_hardware_touch on public.cc_hardware;
create trigger cc_hardware_touch before update on public.cc_hardware
  for each row execute function public.cc_touch_updated_at();

drop trigger if exists cc_company_defaults_touch on public.cc_company_defaults;
create trigger cc_company_defaults_touch before update on public.cc_company_defaults
  for each row execute function public.cc_touch_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — na KAŻDEJ tabeli, polityki per auth.uid()
-- ════════════════════════════════════════════════════════════════════════════

alter table public.cc_hardware          enable row level security;
alter table public.cc_company_defaults  enable row level security;

-- cc_hardware
drop policy if exists cc_hardware_select on public.cc_hardware;
create policy cc_hardware_select on public.cc_hardware
  for select using (owner = auth.uid());

drop policy if exists cc_hardware_insert on public.cc_hardware;
create policy cc_hardware_insert on public.cc_hardware
  for insert with check (owner = auth.uid());

drop policy if exists cc_hardware_update on public.cc_hardware;
create policy cc_hardware_update on public.cc_hardware
  for update using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists cc_hardware_delete on public.cc_hardware;
create policy cc_hardware_delete on public.cc_hardware
  for delete using (owner = auth.uid());

-- cc_company_defaults
drop policy if exists cc_company_defaults_select on public.cc_company_defaults;
create policy cc_company_defaults_select on public.cc_company_defaults
  for select using (owner = auth.uid());

drop policy if exists cc_company_defaults_insert on public.cc_company_defaults;
create policy cc_company_defaults_insert on public.cc_company_defaults
  for insert with check (owner = auth.uid());

drop policy if exists cc_company_defaults_update on public.cc_company_defaults;
create policy cc_company_defaults_update on public.cc_company_defaults
  for update using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists cc_company_defaults_delete on public.cc_company_defaults;
create policy cc_company_defaults_delete on public.cc_company_defaults
  for delete using (owner = auth.uid());

-- ════════════════════════════════════════════════════════════════════════════
-- PO URUCHOMIENIU
--
--   1. zasiew osprzętu z ŻYWEGO bucketu (uruchamia Piotr, nigdy aplikacja):
--
--        SUPABASE_URL=… SUPABASE_SERVICE_KEY=… CC_OWNER=<uuid użytkownika> \
--          node scripts/seed-hardware.mjs
--
--      Skrypt czyta manifesty z bucketu i robi upsert. Bez zmiennych
--      środowiskowych DRUKUJE, co by zrobił, i nie dotyka bazy.
--
--   2. test izolacji (RĘCZNIE, zalogowany jako user A):
--
--        select count(*) from public.cc_hardware;          -- tylko wiersze A
--        select count(*) from public.cc_company_defaults;  -- najwyżej jeden
--
--      Zalogowany jako B te same zapytania nie mogą pokazać ani jednego
--      wiersza A.
--
--   3. próba wpisania klucza należącego do reguły MA SIĘ NIE UDAĆ:
--
--        update public.cc_company_defaults
--           set defaults = defaults || '{"hinge_angle": 110}'::jsonb;
--        -- ERROR: new row violates check constraint
--           "cc_company_defaults_no_rule_keys"
-- ════════════════════════════════════════════════════════════════════════════
