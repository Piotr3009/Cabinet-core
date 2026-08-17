import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { topDemandMm } from '../src/engine/doors.js';
import {
  SPLIT_SEG_GAP, SPLIT_SEG_MIN, SPLIT_SHELF_BACK,
  splitDoorActive, splitDoorBottomH, splitDoorHingeCount, splitDoorLineY, splitDoorOpening,
  splitDoorSegments, splitDoorShelfD, splitDoorShelfW, splitSegmentHingeRows, splitTopFor,
} from '../src/engine/splitDoors.js';

// ─── TURN 36 (CLAUDE.md F6): SPLIT DOORS — THE ENGINE CATCHES UP WITH THE KIT
//
// T35 merged the `SPLIT DOORS (T35)` section into KIT_WARDROBE_FULL.lsp and
// the paren-balance test that guards it; the engine half never landed. These
// asserts hold the engine to that section — iron rule 3, "the engine matches
// it, never interprets; a divergence is reported, not resolved".
//
// Tests-first, because this is an ENGINE-LAW feature (the turn's own rule).

const KIT = readFileSync(new URL('../reference/lisp/KIT_WARDROBE_FULL.lsp', import.meta.url), 'utf8');
const SECTION = (() => {
  const at = KIT.indexOf(';; --- SPLIT DOORS (T35)');
  assert.notEqual(at, -1, 'the merged kit section is on main — the VERIFY gate');
  const rest = KIT.slice(at);
  const next = rest.indexOf(';; --- DOOR TOP EDGE');
  return next < 0 ? rest : rest.slice(0, next);
})();

const wardrobe = (over = {}) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P), unit_num: '01', ...over,
}, P);

const frontsOf = (r) => r.panels.filter((p) => p.part === 'FRONT' && p.role === 'front');

// ═══ 1. THE KIT'S OWN CONSTANTS, read off the kit ═══════════════════════════

test('F6 — the three constants are the kit\'s, to the character', () => {
  assert.match(SECTION, /\(setq SPLIT_SEG_GAP\s+3\.0\)/);
  assert.match(SECTION, /\(setq SPLIT_SHELF_BACK\s+0\.0\)/);
  assert.match(SECTION, /\(setq SPLIT_SEG_MIN\s+100\.0\)/);
  assert.equal(SPLIT_SEG_GAP, 3);
  assert.equal(SPLIT_SHELF_BACK, 0);
  assert.equal(SPLIT_SEG_MIN, 100);
});

test('F6 — the hinge bands are the kit\'s cond AND the published JSON, band for band', () => {
  // The kit: 900/9 → 2, 1600/13 → 3, 2000/19 → 4, 2400/24 → 5, else 6.
  assert.match(SECTION, /<= segH\s+900\.0\)[^)]*<= segKg\s+9\.0\)\) 2\)/);
  assert.match(SECTION, /<= segH 1600\.0\)[^)]*<= segKg 13\.0\)\) 3\)/);
  assert.match(SECTION, /<= segH 2000\.0\)[^)]*<= segKg 19\.0\)\) 4\)/);
  assert.match(SECTION, /<= segH 2400\.0\)[^)]*<= segKg 24\.0\)\) 5\)/);
  assert.match(SECTION, /\(T 6\)/);
  // …and the engine answers the same, off the JSON. No divergence to report.
  assert.equal(splitDoorHingeCount(900, 9), 2);
  assert.equal(splitDoorHingeCount(901, 9), 3);
  assert.equal(splitDoorHingeCount(1600, 13), 3);
  assert.equal(splitDoorHingeCount(1601, 13), 4);
  assert.equal(splitDoorHingeCount(2000, 19), 4);
  assert.equal(splitDoorHingeCount(2400, 24), 5);
  assert.equal(splitDoorHingeCount(2401, 24), 6);
  // WEIGHT bands the same way: a heavy short door climbs.
  assert.equal(splitDoorHingeCount(800, 12), 3);
});

// ═══ 2. THE ARITHMETIC ══════════════════════════════════════════════════════

test('F6 — top + 3 + bottom = the opening, exactly, at every height', () => {
  for (const opening of [1400, 1997, 2147, 2400, 2600]) {
    for (const top of [300, 500, 600, 900]) {
      const bottom = splitDoorBottomH(opening, top);
      assert.equal(top + SPLIT_SEG_GAP + bottom, opening, `${opening} / ${top}`);
    }
  }
});

test('F6 — the opening is the carcase less the T35-F12 top demand', () => {
  assert.equal(splitDoorOpening(2150, 3), 2147);
  assert.equal(splitDoorOpening(2150, 0), 2150);
  // …and the engine's own leaf IS that number on the wardrobe kit.
  const p = { ...defaultParamsFor('WARDROBE', P), unit_num: '01' };
  const leaf = frontsOf(computeCabinet(p, P))[0];
  assert.equal(leaf.h, splitDoorOpening(p.height, topDemandMm(p, P)));
});

test('F6 — 0 is no split, and a mistyped number is refused rather than cut', () => {
  assert.equal(splitDoorActive(2147, 0), false);
  assert.equal(splitDoorActive(2147, null), false);
  assert.equal(splitDoorActive(2147, undefined), false);
  assert.equal(splitDoorActive(2147, -400), false);
  assert.equal(splitDoorActive(2147, 40), false, 'a 40 mm door is a typo');
  assert.equal(splitDoorActive(2147, 99), false, 'one below the minimum');
  assert.equal(splitDoorActive(2147, 100), true, 'exactly the minimum is a segment');
  // …and the BOTTOM has to come out real too.
  assert.equal(splitDoorActive(2147, 2147 - 3 - 99), false, 'the bottom would be 99');
  assert.equal(splitDoorActive(2147, 2147 - 3 - 100), true);
});

test('F6 — the split line is the bottom segment\'s top, on the door\'s own datum', () => {
  assert.equal(splitDoorLineY(2147, 600), 1544);
  assert.equal(splitDoorLineY(2147, 600), splitDoorBottomH(2147, 600));
});

test('F6 — the divider is cut to the PARTITION law, not the shelf\'s', () => {
  // The kit: `(- szerSzafki (* 2.0 G))` and `(- glSzafki G SPLIT_SHELF_BACK)`.
  assert.equal(splitDoorShelfW(900, 18), 864);
  assert.equal(splitDoorShelfD(568, 18), 550);
  // An ORDINARY shelf would be 4 narrower and 20 shallower. It is not one.
  assert.notEqual(splitDoorShelfW(900, 18), 900 - 2 * 18 - 4);
  assert.notEqual(splitDoorShelfD(568, 18), 568 - 18 - 20);
});

test('F6 — the segments come back TOP FIRST, with their own hinge counts', () => {
  const segs = splitDoorSegments({ opening: 2147, topH: 600 });
  assert.equal(segs.length, 2);
  assert.equal(segs[0].id, 'T');
  assert.equal(segs[1].id, 'B');
  assert.equal(segs[0].h, 600);
  assert.equal(segs[1].h, 1544);
  assert.equal(segs[0].y, 1547, 'the top starts 3 above the bottom\'s top edge');
  assert.equal(segs[1].y, 0);
  assert.equal(segs[0].hinges, 2, '600 mm → the 900 band');
  assert.equal(segs[1].hinges, 3, '1544 mm → the 1600 band');
  assert.equal(splitDoorSegments({ opening: 2147, topH: 0 }), null);
});

test('F6 — a segment\'s ladder is its own, ends first, evenly between', () => {
  assert.deepEqual(splitSegmentHingeRows(600, 2, 100), [100, 500]);
  assert.deepEqual(splitSegmentHingeRows(1544, 3, 100), [100, 772, 1444]);
  assert.deepEqual(splitSegmentHingeRows(0, 3, 100), []);
  assert.deepEqual(splitSegmentHingeRows(600, 0, 100), []);
});

test('F6 — the field is read per unit and per bay, and both are additive', () => {
  assert.equal(splitTopFor({ unit: undefined, bays: undefined }, null), 0);
  assert.equal(splitTopFor({ unit: 600 }, null), 600);
  assert.equal(splitTopFor({ unit: 600 }, 1), 600, 'the unit answers a bay that says nothing');
  assert.equal(splitTopFor({ unit: 600, bays: [{ door: 'one' }, { door: 'one', split_top_mm: 800 }] }, 1), 800);
  assert.equal(splitTopFor({ unit: 600, bays: [{ door: 'one', split_top_mm: 0 }] }, 0), 0, 'a bay may opt out');
});

// ═══ 3. THE ENGINE ══════════════════════════════════════════════════════════

test('F6 — a wardrobe with NO split is the wardrobe it was, to the panel', () => {
  const plain = wardrobe();
  const zero = wardrobe({ split_top_mm: 0 });
  const absent = wardrobe({ split_top_mm: null });
  assert.deepEqual(zero.panels, plain.panels);
  assert.deepEqual(zero.drills, plain.drills);
  assert.deepEqual(absent.panels, plain.panels);
  assert.equal(plain.assemblies.splitDoors, undefined, 'the key is absent, not empty');
});

test('F6 — a split leaf becomes TWO panels that add up to it exactly', () => {
  const plain = wardrobe({ width: 600 });
  const leaf = frontsOf(plain)[0];
  const r = wardrobe({ width: 600, split_top_mm: 600 });
  const fronts = frontsOf(r);
  assert.equal(fronts.length, 2, 'one leaf, two segments');
  const top = fronts.find((p) => p.meta.split === 'top');
  const bottom = fronts.find((p) => p.meta.split === 'bottom');
  assert.ok(top && bottom);
  assert.equal(top.id, `${leaf.id}-T`);
  assert.equal(bottom.id, `${leaf.id}-B`);
  assert.equal(top.h, 600);
  assert.equal(top.h + SPLIT_SEG_GAP + bottom.h, leaf.h);
  assert.equal(top.w, leaf.w, 'the width does not move');
  assert.equal(bottom.w, leaf.w);
  assert.equal(bottom.box.y, leaf.box.y);
  assert.equal(top.box.y, leaf.box.y + bottom.h + SPLIT_SEG_GAP);
  assert.equal(top.box.z, leaf.box.z, 'both stand where the leaf stood');
  assert.equal(top.meta.hinge, leaf.meta.hinge, 'the hand is the leaf\'s');
  // The whole leaf is GONE — not left behind beside its own segments.
  assert.equal(r.panels.some((p) => p.id === leaf.id), false);
});

test('F6 — ONE auto fix shelf on the split line, FULL DEPTH, G thick', () => {
  const r = wardrobe({ width: 900, split_top_mm: 600 });
  const dividers = r.panels.filter((p) => p.meta?.splitDivider);
  assert.equal(dividers.length, 1, 'one board, whatever the leaf count');
  const d = dividers[0];
  const leafH = r.assemblies.splitDoors[0].opening;
  assert.equal(d.part, 'SHELF');
  assert.equal(d.role, 'shelf');
  assert.equal(d.thickness, 18, 'G thick');
  assert.equal(d.w, splitDoorShelfW(900, 18));
  assert.equal(d.h, splitDoorShelfD(r.params.depth, 18), 'FULL depth — no 20 setback');
  assert.equal(d.box.y, splitDoorLineY(leafH, 600), 'the underside is the split line');
  assert.equal(d.box.x, 18);
  assert.equal(d.meta.variant, 'fixed');
  assert.equal(d.meta.locked, true);
  assert.equal(d.meta.front_mm, SPLIT_SHELF_BACK);
  // Its FRONT edge is flush with the carcase front, which is the whole point.
  assert.equal(d.box.z + d.box.d, r.params.depth);
});

test('F6 — a two-door wardrobe splits both leaves and shares ONE divider', () => {
  const r = wardrobe({ width: 1000, split_top_mm: 600 });
  const fronts = frontsOf(r);
  assert.equal(fronts.length, 4, 'two leaves, two segments each');
  assert.deepEqual(
    fronts.map((p) => p.meta.split).sort(),
    ['bottom', 'bottom', 'top', 'top'],
  );
  assert.equal(r.panels.filter((p) => p.meta?.splitDivider).length, 1);
  assert.equal(r.assemblies.splitDoors.length, 2);
});

test('F6 — hinge sets are PER SEGMENT, and the drilling follows', () => {
  const r = wardrobe({ width: 600, height: 2150, split_top_mm: 600 });
  const top = frontsOf(r).find((p) => p.meta.split === 'top');
  const bottom = frontsOf(r).find((p) => p.meta.split === 'bottom');
  assert.equal(top.meta.cupY.length, 2, '600 mm takes two');
  assert.equal(bottom.meta.cupY.length, 3, '1544 mm takes three');
  const cupsOn = (id) => r.drills.filter((d) => d.panel === id && d.kind === 'cup');
  assert.equal(cupsOn(top.id).length, 2);
  assert.equal(cupsOn(bottom.id).length, 3);
  // Every cup is inside its OWN segment, measured in that segment's frame.
  for (const d of cupsOn(top.id)) assert.ok(d.y > 0 && d.y < top.h, `${d.y} inside ${top.h}`);
  for (const d of cupsOn(bottom.id)) assert.ok(d.y > 0 && d.y < bottom.h);
  // …and it is never the full-height count halved.
  const plain = wardrobe({ width: 600, height: 2150 });
  assert.notEqual(top.meta.cupY.length + bottom.meta.cupY.length,
    plain.drillSummary.hinge_centers.length);
});

test('F6 — the CARCASS side is bored at the SEGMENTS\' rows, not the door ladder', () => {
  const r = wardrobe({ width: 600, height: 2150, split_top_mm: 600 });
  const rows = [...new Set(r.drills.filter((d) => d.panel === 'BUL' && d.kind === 'hinge').map((d) => d.y))]
    .sort((a, b) => a - b);
  const wanted = frontsOf(r)
    .flatMap((p) => p.meta.plateY)
    .flatMap((c) => [c - P.hinges.holePairOffset, c + P.hinges.holePairOffset])
    .sort((a, b) => a - b);
  assert.deepEqual(rows, [...new Set(wanted)]);
  assert.equal(rows.length, (2 + 3) * 2, 'five hinges, a pair of holes each');
});

test('F6 — the BOM buys per segment, and the total says so', () => {
  const r = wardrobe({ width: 600, height: 2150, split_top_mm: 600 });
  assert.equal(r.totals.hinges, 5, '2 on the top + 3 on the bottom');
  const lines = r.hardware.filter((h) => h.role === 'hinges');
  assert.deepEqual(lines.map((l) => l.qty).sort((a, b) => a - b), [2, 3]);
  assert.deepEqual(lines.map((l) => l.spec.per_door).sort((a, b) => a - b), [2, 3]);
  // …and the printed label says the SEGMENT's count, not the cabinet's ladder.
  assert.deepEqual(lines.map((l) => l.spec_label).sort(), ['2 per door × 1', '3 per door × 1']);
  // …and a cabinet with no split buys exactly what it always did.
  const plain = wardrobe({ width: 600, height: 2150 });
  assert.equal(plain.totals.hinges,
    plain.drillSummary.hinge_centers.length * 1);
});

test('F6 — the divider is SCREWED like a fix shelf, never pinned', () => {
  const r = wardrobe({ width: 900, split_top_mm: 600 });
  const d = r.panels.find((p) => p.meta?.splitDivider);
  const screws = r.drills.filter((x) => x.kind === 'shelf_screw' && Math.abs(x.y - d.box.y - 9) < 12);
  assert.ok(screws.length > 0, 'the machine is told where the screws go');
  const pins = r.drills.filter((x) => x.kind === 'shelf_pin' && Math.abs(x.y - d.box.y) < 1);
  assert.equal(pins.length, 0, 'a screwed board takes no pins');
});

test('F6 — handles and mirrors are asked PER SEGMENT, by panel id', () => {
  const base = { ...defaultParamsFor('WARDROBE', P), unit_num: '01', width: 600, split_top_mm: 600 };
  const ids = frontsOf(computeCabinet(base, P)).map((p) => p.id);
  const topId = ids.find((id) => id.endsWith('-T'));
  const r = computeCabinet({
    ...base,
    door_mirrors: { [topId]: 'outside' },
  }, P);
  const top = r.panels.find((p) => p.id === topId);
  const bottom = r.panels.find((p) => p.id === ids.find((x) => x.endsWith('-B')));
  assert.ok(top.meta.mirror, 'the TOP segment wears the mirror');
  assert.equal(bottom.meta.mirror, undefined, '…and the bottom does not');
  assert.equal(top.meta.mirror.h <= top.h, true, 'cut to the segment, not the leaf');
});

test('F6 — the published record is TOP FIRST and names both segments', () => {
  const r = wardrobe({ width: 600, split_top_mm: 600 });
  const rec = r.assemblies.splitDoors[0];
  assert.equal(rec.topMm, 600);
  assert.equal(rec.gapMm, 3);
  assert.deepEqual(rec.segments.map((s) => s.id), ['T', 'B'], 'top first — the owner\'s order');
  assert.equal(rec.segments[0].h + rec.gapMm + rec.segments[1].h, rec.opening);
  assert.equal(rec.segments[0].hinges, 2);
  assert.equal(rec.segments[1].hinges, 3);
  assert.equal(r.assemblies.splitDividers.length, 1);
  assert.equal(r.assemblies.splitDividers[0].setback, 0);
  // …and the per-panel rows are published beside the cabinet's own ladder.
  assert.equal(Object.keys(r.drillSummary.hinge_rows_by_panel).length, 2);
  assert.ok(Array.isArray(r.drillSummary.hinge_centers), 'the old key is untouched');
});

test('F6 — the TOP EDGE law is T35-F12\'s, unchanged: the split rides it', () => {
  const flush = wardrobe({ width: 600, split_top_mm: 600, front_top_gap_mm: 0 });
  const gapped = wardrobe({ width: 600, split_top_mm: 600, front_top_gap_mm: 3 });
  const topOf = (r) => frontsOf(r).find((p) => p.meta.split === 'top');
  const botOf = (r) => frontsOf(r).find((p) => p.meta.split === 'bottom');
  // The TOP number the owner typed is the top number; the 3 comes off the
  // BOTTOM, because the opening is what shrank.
  assert.equal(topOf(flush).h, 600);
  assert.equal(topOf(gapped).h, 600);
  assert.equal(botOf(flush).h - botOf(gapped).h, 3);
});

test('F6 — the LISP outside the named section is untouched by this turn', () => {
  // Iron rule 3: "outside that named section not one character of any kit
  // changes". The section is where T35 left it, and it still ends where the
  // DOOR TOP EDGE section begins.
  assert.match(KIT, /;; --- SPLIT DOORS \(T35\)/);
  assert.match(KIT, /;; --- DOOR TOP EDGE \(T35\)/);
  assert.ok(KIT.indexOf(';; --- SPLIT DOORS (T35)') < KIT.indexOf(';; --- DOOR TOP EDGE (T35)'));
});
