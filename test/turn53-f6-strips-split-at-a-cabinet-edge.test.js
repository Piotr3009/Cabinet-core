// ─── T53 · F6 — PLINTHS AND INFILLS: VERTICAL, SPLIT AT A CABINET EDGE ────
//
// The owner, 27.08.2026:
//
//   *"infille i plinthy układaj na CNC w pionie zawsze i dziel tak, żeby się
//   równo z szafką którąś — żeby nie przekroczyło wysokości materiału. przy
//   okazji rozwiążemy problem oversizu."*
//
// …and his own worked example, which is the assertion below, number for number:
//
//   *"płyta ma 2400 a plinth wychodzi 3200 — zobacz jakie mamy szafki:
//   3 × 650 = 1950, reszta drugi pasek. łączenie zawsze równo z szafką, a nie
//   na środku szafki."*
//
// LISP FIRST (iron rule 3): `SKY:stripsAtCabinetEdges` and `SKY:stripOversize`
// in `reference/lisp/SKYLON_COMMON.lsp`. `engine/strips.js` matches them.
//
// ─── WHAT WAS ALREADY TRUE, AND WHAT WAS NOT ──────────────────────────────
//
// *"plinthy już chyba mamy pionowo"* — CHECKED, and he is right: `PLINTH` has
// been on `CUT_STANDING_PARTS` since T40 and a 600 × 100 toe kick really is
// laid 100 across × 600 up the page. The INFILL was NOT on that list, so a long
// filler came off the saw lying down and banded across its own grain. That is
// the half of his sentence that was not already true, and it is the seventh
// role on the list tonight.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { sheetTurn } from '../src/engine/cnc/layout.js';
import { CUT_STANDING_PARTS, cutStanding } from '../src/engine/grain.js';
import {
  oversizeCabinets, splitStretchAtEdges, stripLimitMm, stripsAtCabinetEdges,
} from '../src/engine/strips.js';

const store = () => useProjectStore.getState();

// ─── THE OWNER'S OWN WORKED EXAMPLE, LITERALLY ────────────────────────────

test('F6 — board 2400, plinth 3200 over 650s: 1950 then 1250', () => {
  const spans = [650, 650, 650, 650, 600].map((w, i) => ({ id: `u${i}`, width: w }));
  assert.equal(spans.reduce((n, s) => n + s.width, 0), 3200, 'his 3200');
  const strips = stripsAtCabinetEdges(spans, 2400);
  assert.equal(strips.length, 2);
  assert.equal(strips[0].length, 1950, '3 × 650 — a fourth would be 2600 > 2400');
  assert.equal(strips[1].length, 1250, 'the rest, as one strip');
  assert.deepEqual(strips[0].unitIds, ['u0', 'u1', 'u2']);
  assert.deepEqual(strips[1].unitIds, ['u3', 'u4']);
  assert.equal(strips[0].from, 0);
  assert.equal(strips[1].from, 1950, 'the joint is where the third cabinet ends');
});

test('F6 — a joint NEVER lands mid-cabinet, across a randomised run', () => {
  // A deterministic pseudo-random walk: no `Math.random` in a test that has to
  // say the same thing twice.
  let seed = 20260827;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let round = 0; round < 200; round += 1) {
    const n = 2 + Math.floor(next() * 10);
    const widths = Array.from({ length: n }, () => 300 + Math.round(next() * 900));
    const limit = 1500 + Math.round(next() * 1500);
    const spans = widths.map((w, i) => ({ id: `u${i}`, width: w }));
    const strips = stripsAtCabinetEdges(spans, limit);
    // Every joint is a running sum of whole cabinet widths.
    const edges = new Set([0]);
    let acc = 0;
    for (const w of widths) { acc += w; edges.add(Math.round(acc * 1000) / 1000); }
    let at = 0;
    for (const s of strips) {
      assert.ok(edges.has(Math.round(at * 1000) / 1000), `joint at ${at} is a cabinet edge`);
      at += s.length;
    }
    assert.equal(Math.round(at * 1000) / 1000, Math.round(acc * 1000) / 1000,
      'and the strips are the whole piece');
    // …and no strip exceeds the board unless ONE CABINET does.
    const tooWide = oversizeCabinets(spans, limit);
    for (const s of strips) {
      if (!tooWide.length) assert.ok(s.length <= limit + 1e-6, `${s.length} ≤ ${limit}`);
    }
    // Every cabinet is in exactly one strip.
    assert.deepEqual(strips.flatMap((s) => s.unitIds), widths.map((_, i) => `u${i}`));
  }
});

test('F6 — the limit is the ASSIGNED board, never a literal', () => {
  assert.equal(stripLimitMm(P, 'carcasses'), P.cnc.sheet.height,
    'the workshop’s own 2790 × 2060, which is what this shop has always cut on');
  const jumbo = {
    cnc: { sheet: { width: 2790, height: 2060 }, sheetCarcass: { width: 2070, height: 2800 } },
  };
  assert.equal(stripLimitMm(jumbo, 'carcasses'), 2800, 'a shop on Jumbo splits at 2800');
  const fronts = { cnc: { sheet: { width: 1220, height: 2440 } } };
  assert.equal(stripLimitMm(fronts, 'fronts'), 2440, '…and a front board is its own');
  assert.notEqual(stripLimitMm(P, 'carcasses'), 2400, 'no hardcoded 2400');
  assert.notEqual(stripLimitMm(P, 'carcasses'), 2070, '…and no hardcoded 2070');
});

// ─── THE ENGINE ACTUALLY CUTS THEM ────────────────────────────────────────

function longRun(widths) {
  store().loadProject({
    id: null, name: 'T53 F6', number: '53', client: 'the owner',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }), design: {},
  }, []);
  const ids = [];
  let last = null;
  for (const w of widths) {
    const r = last ? store().addUnit('BUD', { near: last, side: 'R' }) : store().addUnit('BUD');
    assert.ok(r.id, r.error || '');
    store().updateUnitParams(r.id, { width: w, plinth: true });
    ids.push(r.id);
    last = r.id;
  }
  store().refreshAutoParts();
  return ids;
}

test('F6 — a run longer than the board cuts STRIPS, and they sum to the run', () => {
  longRun([650, 650, 650, 650, 600]);
  const owner = store().units.find((u) => store().runElements[u.id]?.plinth?.role === 'owner');
  assert.ok(owner);
  const limit = stripLimitMm(P, 'carcasses');
  const strips = store().unitResult(owner.id).panels.filter((p) => p.role === 'plinth');
  assert.ok(strips.length > 1, `${strips.length} strips on a ${store().runElements[owner.id].plinth.length} run`);
  assert.equal(strips.reduce((n, p) => n + p.w, 0), 3200, 'the whole toe kick');
  for (const s of strips) {
    assert.ok(s.w <= limit, `${s.id} is ${s.w} ≤ ${limit}`);
    assert.equal(s.meta.strip.limit, limit, 'and says which board it was cut to');
  }
  assert.deepEqual(strips.map((p) => p.w), [1950, 1250], 'his own two numbers');
  // The joints are cabinet lines: strip 1 covers three cabinets, strip 2 two.
  assert.deepEqual(strips.map((p) => p.meta.unitIds.length), [3, 2]);
});

test('F6 — a run that FITS the board is one board, exactly as it was', () => {
  longRun([600, 600, 600]);
  const owner = store().units.find((u) => store().runElements[u.id]?.plinth?.role === 'owner');
  const plinths = store().unitResult(owner.id).panels.filter((p) => p.role === 'plinth');
  assert.equal(plinths.length, 1, 'one piece');
  assert.equal(plinths[0].id, 'PLINTH', 'under its own old name');
  assert.equal(plinths[0].w, 1800);
  assert.equal(plinths[0].meta?.strip, undefined, 'and it says nothing about strips');
});

test('F6 — the strips lie side by side in the room, with no overlap', () => {
  longRun([650, 650, 650, 650, 600]);
  const owner = store().units.find((u) => store().runElements[u.id]?.plinth?.role === 'owner');
  const strips = store().unitResult(owner.id).panels.filter((p) => p.role === 'plinth');
  let edge = null;
  for (const s of strips) {
    if (edge != null) {
      assert.equal(s.box.x, edge, 'each strip starts where the last one ended');
    }
    edge = s.box.x + s.box.w;
  }
});

// ─── VERTICAL, ALWAYS ─────────────────────────────────────────────────────

test('F6 — every strip is nested STANDING: the length runs up the sheet', () => {
  longRun([650, 650, 650, 650, 600]);
  const owner = store().units.find((u) => store().runElements[u.id]?.plinth?.role === 'owner');
  for (const s of store().unitResult(owner.id).panels.filter((p) => p.role === 'plinth')) {
    // Turn 90 puts the drawn WIDTH — the strip's length — up the page.
    assert.equal(sheetTurn(s), 90, `${s.id} stands up the sheet`);
  }
});

test('F6 — INFILL joins the cut-standing list, which is the half that was NOT true', () => {
  assert.ok(cutStanding('INFILL'), 'an infill is nested standing now');
  assert.ok(cutStanding('PLINTH'), '…as the plinth already was');
  assert.equal(CUT_STANDING_PARTS.length, 7, 'the seventh role, added deliberately');
  // A long filler: 40 wide, 2100 long. Standing means the 2100 runs up the page.
  const filler = { part: 'INFILL', w: 2100, h: 40, cnc: { drawn_w: 2100, drawn_h: 40 } };
  assert.equal(sheetTurn(filler), 90, 'the length up the page, the grain along it');
});

// ─── THE OVERSIZE, CLOSED ─────────────────────────────────────────────────

test('F6 — the only thing left to flag is ONE CABINET wider than the board', () => {
  assert.deepEqual(oversizeCabinets([{ id: 'a', width: 600 }, { id: 'b', width: 900 }], 2060), []);
  assert.deepEqual(oversizeCabinets([{ id: 'a', width: 2600 }], 2060), [{ id: 'a', width: 2600 }]);
  // A cabinet no split can save yields ONE strip that is over — and it says so.
  const strips = stripsAtCabinetEdges([{ id: 'a', width: 2600 }], 2060);
  assert.equal(strips.length, 1);
  assert.equal(strips[0].length, 2600, 'no split can save it — and none is invented');
});

// ─── THE TWO LAWS COMPOSE ─────────────────────────────────────────────────

test('F6 — a segment still too long after a knee splits again, at a cabinet edge', () => {
  // F3 broke the top infill at the ceiling's knee; F6 splits what is left.
  const edges = [0, 650, 1300, 1950, 2600, 3200];
  assert.deepEqual(splitStretchAtEdges(0, 3200, edges, 2400),
    [{ from: 0, to: 1950 }, { from: 1950, to: 3200 }]);
  // A stretch that already fits is ONE stretch and is untouched.
  assert.deepEqual(splitStretchAtEdges(0, 1800, edges, 2400), [{ from: 0, to: 1800 }]);
  // …and a stretch that starts mid-cabinet (a knee did that) still only joins
  // where a cabinet ends inside it.
  const cut = splitStretchAtEdges(300, 3500, edges, 2400);
  assert.ok(cut.length >= 2);
  assert.equal(cut[0].from, 300);
  assert.equal(cut[cut.length - 1].to, 3500);
  for (let i = 1; i < cut.length; i += 1) {
    assert.ok(edges.includes(cut[i].from), `${cut[i].from} is a cabinet edge`);
  }
});

// ─── THE LAW IS IN THE LISP, FIRST ────────────────────────────────────────

test('F6 — the split rule is stated in SKYLON_COMMON before any of this', () => {
  const lisp = readFileSync(new URL('../reference/lisp/SKYLON_COMMON.lsp', import.meta.url), 'utf8');
  assert.match(lisp, /\(defun SKY:stripsAtCabinetEdges /);
  assert.match(lisp, /\(defun SKY:stripOversize /);
  assert.match(lisp, /3 x 650 = 1950/, 'his own worked example, in the kit');
  assert.match(lisp, /AND THE SPLIT IS WHAT CLOSES THE OVERSIZE/);
});
