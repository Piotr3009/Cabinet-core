#!/usr/bin/env node
// ─── The turn-22 equivalence probes (CLAUDE.md F1.4 / F2b.5 / F4.5) ─────────
//
// Three of this turn's phases make the same shape of claim — "this changes
// nothing the equivalent thing typed in by hand would not change" — and
// CLAUDE.md asks for each of them to be ASSERTED rather than asserted-about.
// The assertions live in the test suite; this script is the EVIDENCE, printed
// so a person can read it beside the fingerprints:
//
//   CORNICE   a cabinet with a cornice cuts exactly what the same cabinet
//             without one cuts, plus the infill it is mounted on — because the
//             moulding is bought, not machined (F1.4);
//   LEG 50    the D/W panel at 50 mm differs from the D/W at 100 exactly as
//             its LEGGED twin does — the height-derived pieces and nothing
//             else (F4.5);
//   COMPANY   a project prefilled from a company row produces the same cut
//             list as the same project with those settings typed in (F2b.5).
//
//     node scripts/t22-probes.mjs

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import {
  clearCompanyDefaults, setCompanyDefaults,
} from '../src/engine/companyDefaults.js';

/** 32-bit FNV-1a — the same hash the fingerprint script uses. */
function fingerprint(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Every DXF file a unit produces, as name → fingerprint. */
const files = (result) => Object.fromEntries(
  buildUnitDxfFiles(result, P).map((f) => [f.name, fingerprint(f.dxf)]),
);

const cut = (result) => result.panels
  .map((p) => `${p.id}|${p.w}x${p.h}x${p.thickness}`)
  .sort();

function section(title) {
  process.stdout.write(`\n${'═'.repeat(76)}\n${title}\n${'═'.repeat(76)}\n`);
}

function compare(label, a, b) {
  const same = JSON.stringify(a) === JSON.stringify(b);
  process.stdout.write(`  ${same ? 'SAME' : 'DIFF'}  ${label}\n`);
  if (!same) {
    const onlyA = a.filter((x) => !b.includes(x));
    const onlyB = b.filter((x) => !a.includes(x));
    for (const x of onlyA) process.stdout.write(`        − ${x}\n`);
    for (const x of onlyB) process.stdout.write(`        + ${x}\n`);
  }
  return same;
}

// ─── 1. THE CORNICE IS NOT A CUT PIECE ──────────────────────────────────────
section('F1.4 — the cornice is bought moulding: zero CNC delta');
{
  const base = { ...defaultParamsFor('WARDROBE', P), unit_num: '01' };
  const withInfill = computeCabinet({ ...base, top_infill_mm: 40 }, P);
  for (const height of [70, 100]) {
    const withCornice = computeCabinet({ ...base, top_infill_mm: 40, cornice: height }, P);
    compare(`WARDROBE + ${height} mm cornice vs the same cabinet with only its infill`,
      cut(withInfill), cut(withCornice));
    const a = files(withInfill);
    const b = files(withCornice);
    const same = JSON.stringify(a) === JSON.stringify(b);
    process.stdout.write(`  ${same ? 'SAME' : 'DIFF'}  …and every DXF file it writes (${Object.keys(a).length} files)\n`);
    const order = withCornice.hardware.find((h) => h.role === 'cornice');
    process.stdout.write(`        ordered instead: ${order.qty} ${order.unit} · ${order.spec_label}\n`);
  }
}

// ─── 2. THE D/W AT 50 ───────────────────────────────────────────────────────
section('F4.5 — the D/W at leg 50 moves exactly as its legged twin does');
{
  const build = (type, leg) => computeCabinet({
    ...defaultParamsFor(type, P), unit_num: '01', plinth: true, leg_height: leg,
  }, P);
  for (const type of ['DW_PANEL', 'BUD']) {
    const hi = build(type, 100);
    const lo = build(type, 50);
    const moved = cut(hi).filter((k, i) => k !== cut(lo)[i]);
    process.stdout.write(`  ${type.padEnd(9)} stands ${hi.assemblies.carcass.legHeight} → ${lo.assemblies.carcass.legHeight}`
      + `, plinth ${hi.panels.find((p) => p.part === 'PLINTH').h} → ${lo.panels.find((p) => p.part === 'PLINTH').h}\n`);
    process.stdout.write(`            pieces whose CUT changed: ${moved.length ? moved.join(', ') : 'none'}\n`);
  }
  // …and at the DEFAULT leg height the D/W is byte-for-byte what it was.
  const dwDefault = computeCabinet({ ...defaultParamsFor('DW_PANEL', P), unit_num: '01' }, P);
  process.stdout.write(`  DW_PANEL at its own defaults: ${Object.keys(files(dwDefault)).length} DXF files, `
    + `front ${dwDefault.panels.find((p) => p.part === 'FRONT').w} wide\n`);
}

// ─── 3. THE COMPANY ROW ─────────────────────────────────────────────────────
section('F2b.5 — a company row equals its manual-settings twin');
{
  const M = P.hardware.runner.movento;
  const other = M.variants.map((v) => v.id).find((id) => id !== M.defaultVariant);
  const base = { ...defaultParamsFor('BUDR', P), unit_num: '01' };

  clearCompanyDefaults();
  const plain = computeCabinet(base, P);

  setCompanyDefaults({ runner_variant: other, hinge_finish: 'onyx' }, P);
  const fromRow = computeCabinet(base, P);

  clearCompanyDefaults();
  const manual = computeCabinet({ ...base, runner_variant: other }, P);

  compare('a BUDR under a company row vs the same BUDR with the variant typed in',
    cut(fromRow), cut(manual));
  compare('…and against golden defaults (no row at all)', cut(plain), cut(fromRow));
  const spec = (r) => r.hardware.filter((h) => h.role === 'runner_pairs').map((h) => h.spec_label);
  process.stdout.write(`        golden defaults order: ${spec(plain).join(' | ') || '(none)'}\n`);
  process.stdout.write(`        under the row:         ${spec(fromRow).join(' | ') || '(none)'}\n`);
  process.stdout.write(`        typed in by hand:      ${spec(manual).join(' | ') || '(none)'}\n`);
  clearCompanyDefaults();
}

process.stdout.write('\n');
