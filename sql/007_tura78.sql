-- SQL PRZED push.
-- ─── TURA 78 (CLAUDE.md T78 F19): WYBÓR SYSTEMU ŁĄCZEŃ W DOMYŚLNYCH FIRMY ──
--
-- Właściciel, 11.10.2026: cztery systemy łączeń (puzzle, kołki, ciastka,
-- Cabineo 8 i 12), wybierane w domyślnych ustawieniach firmy. W jsonb
-- `defaults` wiersza cc_company_defaults mieszka klucz `joints_system`:
-- ID systemu, nigdy liczba. Liczby łączeń (podziałka kołków, średnica,
-- kieszeń Cabineo, zestaw ciastek) należą do reguły: profilu i LISP-a.
-- Baza odmawia ich tak samo jak walidator (engine/companyDefaults.js
-- RULE_OWNED_KEYS), bo aplikacja nie jest jedyną drogą do tabeli.
--
-- Prawo T22 bez zmian: kąt zawiasu nadal wynika z grubości frontu i nadal
-- jest tu zakazany.

alter table public.cc_company_defaults
  drop constraint if exists cc_company_defaults_no_rule_keys;

alter table public.cc_company_defaults
  add constraint cc_company_defaults_no_rule_keys check (
    not (defaults ?| array[
      'hinge_angle', 'hingeAngle', 'angle',
      'hinge_count', 'hinge_centres', 'hinge_positions',
      'drilling', 'cup_diameter', 'cup_depth',
      -- T78 F19: liczby łączeń
      'joints_pitch', 'joints_pitch_mm', 'dowel_pitch', 'dowel_pitch_mm',
      'dowel_diameter', 'dowel_dia_mm', 'dowel_depth', 'dowels_per_joint',
      'cabineo_pitch', 'cabineo_pitch_mm', 'biscuit_pitch', 'joints_angle'
    ])
    and (
      not (defaults ? 'joints_system')
      or defaults->>'joints_system' in ('puzzle', 'dowel', 'biscuit', 'cabineo8', 'cabineo12')
    )
  );

comment on column public.cc_company_defaults.defaults is
  'Tylko preferencje: hinge_system, hinge_finish, plate, runner_variant, joints_system (T78: puzzle | dowel | biscuit | cabineo8 | cabineo12), boards{}. Nigdy nic, co reguła wylicza.';
