// ─── Turn 32, CLAUDE.md F5: the BOM the workshop can invoice from ───────────
//
// The owner: wardrobes go first "including BOM — that is where we learn what
// BOM needs." Two blocks, one export:
//
//   MATERIALS per decor — m² net → +waste % → "~N sheets of 2800×2070" (a
//   DIVISION, never a cutting plan) → edging metres; FRONTS listed apart.
//   IRONMONGERY with ARTICLES — the F2 automat, the snapped runner article,
//   the rail by the metre, clips from FRONT legs only, screws counted off
//   the drilling. What the registry does not know is a YELLOW named spec.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { buildBom } from '../src/engine/bom.js';
import {
  bomSheet, bomWastePct, buildBomCsvText, ironmongerySummary, materialsSummary, readyBoxLines,
} from '../src/engine/bomInvoice.js';
import { migrateDesign } from '../src/engine/design.js';
import { frontLegCount } from '../src/engine/legs.js';
import { loadHardwareCatalogues } from '../src/lib/hardwareCatalogue.js';
import { exportFileName } from '../src/engine/naming.js';

loadHardwareCatalogues();

const wardrobe = (extra = {}) => ({
  type: 'WARDROBE',
  width: 900,
  height: 2400,
  depth: 568,
  unit_num: '01',
  board_t: 18,
  plinth: true,
  doors: { count: 2, hinge: 'L' },
  drawers: 2,
  shelves: 2,
  rail: true,
  ...extra,
});

function entriesOf(params) {
  const result = computeCabinet(params, P);
  return [{ unit: { id: 'u1', params, type: params.type }, result }];
}

// ─── the owner-tunable numbers, marked ──────────────────────────────────────

test('waste 15 % and the 2800×2070 sheet ship marked "owner to confirm"', async () => {
  assert.equal(bomWastePct(P), 15);
  assert.deepEqual(bomSheet(P), { width: 2800, height: 2070 });
  const { readFile } = await import('node:fs/promises');
  const src = await readFile(new URL('../src/engine/profile.js', import.meta.url), 'utf8');
  assert.match(src, /wastePct — OWNER — unanswered; ship 15, owner to confirm/);
  assert.match(src, /sheet {4}— OWNER — unanswered; ship 2800×2070, owner to confirm/);
  // …and the purchase sheet is NOT the CNC bed.
  assert.notDeepEqual(bomSheet(P), P.cnc.sheet);
});

// ─── block 1: materials per decor, fronts apart ─────────────────────────────

test('materials group per decor and thickness, FRONTS listed separately', () => {
  const entries = entriesOf(wardrobe());
  const bom = buildBom(entries, { design: migrateDesign(null), profile: P });
  const summary = materialsSummary(bom, P);
  const kinds = [...new Set(summary.map((g) => g.kind))];
  assert.deepEqual(kinds, ['carcasses', 'fronts'], 'carcasses first, fronts after — separate');
  for (const g of summary) {
    assert.ok(g.net_m2 > 0);
    assert.equal(g.order_m2, Math.round(g.net_m2 * 1.15 * 1000) / 1000, '+15 % waste');
    // The sheets line is a DIVISION with the owner's label, never a plan.
    assert.match(g.sheet_label, /^~\d+ sheets? of 2800×2070$/);
    assert.equal(g.sheets, Math.max(1, Math.ceil(g.order_m2 / ((2800 * 2070) / 1e6))));
  }
});

// ─── block 2: ironmongery with articles ─────────────────────────────────────

test('hinges carry the automat’s article; plates ride beside them', () => {
  const entries = entriesOf(wardrobe());
  const design = migrateDesign({ hardware: { shelfSleeve: 'chrome' } });
  const bom = buildBom(entries, { design, profile: P });
  const lines = ironmongerySummary({
    entries, bom, design, profile: P,
  });
  const hinges = lines.filter((l) => l.role === 'hinges');
  assert.ok(hinges.length >= 1);
  for (const h of hinges) {
    assert.equal(h.yellow, false, 'chrome + soft-close resolves from the catalogue');
    assert.match(h.article, /^\d+$/);
  }
  const plates = lines.find((l) => l.role === 'hinge_plates');
  assert.ok(plates, 'plates are their own line at last');
  assert.equal(plates.qty, hinges.reduce((s, h) => s + h.qty, 0), 'one plate per hinge');
});

test('what no registry knows is a YELLOW named spec — never invented, never dropped', () => {
  const entries = entriesOf(wardrobe());
  const design = migrateDesign({ hardware: { shelfSleeve: 'gold' } });
  const bom = buildBom(entries, { design, profile: P });
  const lines = ironmongerySummary({
    entries, bom, design, profile: P,
  });
  const hinge = lines.find((l) => l.role === 'hinges');
  assert.equal(hinge.yellow, true, 'no published gold hinge');
  assert.equal(hinge.article, null);
  assert.match(hinge.spec_label, /gold/);
  // The clips have no registry yet either — named, counted, yellow.
  const clips = lines.find((l) => l.role === 'plinth_clips');
  assert.equal(clips.yellow, true);
  assert.ok(clips.qty > 0);
});

test('the REGISTRY’s answer wins, through the same injectable door as the automat', () => {
  const entries = entriesOf(wardrobe());
  const design = migrateDesign(null);
  const bom = buildBom(entries, { design, profile: P });
  const lookup = (q) => (q.category === 'clip'
    ? { article: 'CL-100', source: 'registry' }
    : null);
  const lines = ironmongerySummary({
    entries, bom, design, profile: P, lookup,
  });
  const clips = lines.find((l) => l.role === 'plinth_clips');
  assert.equal(clips.article, 'CL-100');
  assert.equal(clips.yellow, false);
  assert.equal(clips.source, 'registry');
});

test('clips + connectors count FROM FRONT LEGS ONLY, per plinthed unit', () => {
  const params = wardrobe({ width: 1200 });      // wide → 5 legs, still 2 at the front
  const entries = entriesOf(params);
  const design = migrateDesign(null);
  const bom = buildBom(entries, { design, profile: P });
  const lines = ironmongerySummary({
    entries, bom, design, profile: P,
  });
  const want = frontLegCount({ width: 1200, depth: 568, boardT: 18 }, P);
  assert.equal(want, 2);
  assert.equal(lines.find((l) => l.role === 'plinth_clips').qty, want);
  assert.equal(lines.find((l) => l.role === 'plinth_clip_connectors').qty, want);
});

test('the rail is bought by the METRE, its supports counted off the drilling', () => {
  const entries = entriesOf(wardrobe());
  const design = migrateDesign(null);
  const bom = buildBom(entries, { design, profile: P });
  const lines = ironmongerySummary({
    entries, bom, design, profile: P,
  });
  const rail = lines.find((l) => l.role === 'rail');
  assert.equal(rail.unit, 'm');
  assert.equal(rail.qty, Math.round(((900 - 36) / 1000) * 100) / 100, 'the internal width, in metres');
  const supports = lines.find((l) => l.role === 'rail_supports');
  const drilled = entries[0].result.drills.filter((d) => d.kind === 'rail_bracket').length;
  assert.equal(supports.qty, drilled, 'the brackets the engine already drills for');
});

test('screws and confirmats are counted off the DRILLING — the numbers were always there', () => {
  const entries = entriesOf(wardrobe());
  const design = migrateDesign(null);
  const bom = buildBom(entries, { design, profile: P });
  const lines = ironmongerySummary({
    entries, bom, design, profile: P,
  });
  const screwLines = lines.filter((l) => l.role.startsWith('screws:'));
  assert.ok(screwLines.length >= 2, `partition + rail screws at least, got ${screwLines.length}`);
  const total = screwLines.reduce((s, l) => s + l.qty, 0);
  const drilled = entries[0].result.drills.filter((d) => /screw/.test(d.kind)).length;
  assert.equal(total, drilled, 'every drilled screw hole buys a screw');
});

// ─── ready-made boxes: purchase lines, cut parts gone (the F7 hook) ─────────

test('ready-made boxes leave the cut summary and arrive as purchase lines', () => {
  const entries = entriesOf(wardrobe());
  const design = migrateDesign(null);
  const bom = buildBom(entries, { design, profile: P });
  const withBoxes = materialsSummary(bom, P);
  const without = materialsSummary(bom, P, { excludeDrawerBoxes: true });
  const net = (list) => list.reduce((s, g) => s + g.net_m2, 0);
  assert.ok(net(without) < net(withBoxes), 'the box boards left the sheets');
  const lines = readyBoxLines(entries);
  assert.equal(lines.length >= 1, true);
  assert.equal(lines[0].yellow, true, 'a named spec until the registry knows a system');
  assert.equal(lines.reduce((s, l) => s + l.qty, 0), 2, 'one line per bought box');
});

// ─── one export ─────────────────────────────────────────────────────────────

test('one CSV, two blocks, the T31 name pattern, and the RED warning on top', () => {
  const entries = entriesOf(wardrobe());
  const design = migrateDesign(null);
  const bom = buildBom(entries, { design, profile: P });
  const csv = buildBomCsvText({
    summary: materialsSummary(bom, P),
    ironmongery: ironmongerySummary({
      entries, bom, design, profile: P,
    }),
    warnings: ['01 F: front gap 2 mm'],
  });
  assert.match(csv, /^WARNING,01 F: front gap 2 mm\r\n/);
  assert.match(csv, /\r\nMATERIALS\r\n/);
  assert.match(csv, /\r\nIRONMONGERY\r\n/);
  assert.match(csv, /SPEC — no article in the registry/);
  const name = exportFileName({
    project: 'Hampstead', kind: 'bom', ext: 'csv', now: new Date(2026, 7, 15, 21, 5),
  });
  assert.equal(name, 'Hampstead-bom-1508-2105.csv', '{ProjectName}-bom-{DDMM-HHMM}.csv');
});
