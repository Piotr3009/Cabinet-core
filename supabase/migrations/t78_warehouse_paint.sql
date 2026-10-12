-- SQL PRZED push. Tego pliku NIE uruchamia aplikacja ani Claude (zelazna
-- zasada 7 z tury 44). Piotr odpala go RECZNIE w Supabase SQL Editor, ZANIM
-- zdeployuje build tej tury. Idempotentny: mozna puscic drugi raz bez szkody.
-- Wymaga supabase/migrations/t51_warehouse.sql (tabela cc_warehouse).
--
-- === cc_warehouse.paint - FARBA JAKO MATERIAL (T78 F21, CLAUDE.md PART F) ===
--
-- Wlasciciel, 11.10.2026: "Database > Materials gets a department Paints (the
-- warehouse's twelve columns plus: type topcoat | primer, sheen, coverage m2
-- per litre per coat, coats, tin sizes)." Dzial Paints stoi w CATEGORIES od
-- T51; dzis wiersz tego dzialu niesie swoj rekord farby. Piec pol w JEDNEJ
-- kolumnie jsonb, bo nie sa kolumnami PC i nie wchodza do CSV ("the same
-- columns as PC so the two files interchange"): { type, sheen,
-- coverage_m2_per_l, coats, tin_sizes }. Czyta ja engine/warehouse.js
-- paintOf, pisze lib/warehouseDb.js payloadOf; strona Spraying liczy z niej
-- litry i puszki (engine/spray.js paintSpecOf).
--
-- Bez tej kolumny magazyn czyta sie dalej lokalnie (withDb -> source 'local',
-- bursztynowa linijka), wiersz nie ginie: ta sama degradacja co w T51.

alter table public.cc_warehouse
  add column if not exists paint jsonb;

comment on column public.cc_warehouse.paint is
  'T78 F21: the Paints department''s own fields { type: topcoat|primer, sheen, coverage_m2_per_l, coats, tin_sizes }; null on every row that is not a paint.';
