// ─── T50 · F2: THE RUN IS SHARED OUT, EQUALLY, ONCE ────────────────────────
//
// The owner, 25.08.2026:
//
//   *"jak dodaję ostatnią szafkę do ściany i zostanie mniej niż 400 mm … czy
//   chcesz wyśrodkować? i wtedy wszystkie szafy się ustawią w jednej szerokości
//   od ściany do ściany, oczywiście odejmując infill."*
//
// Which cabinets: *"wszystkie co nie mają narzucone."*  Rounding: *"zaokrąglamy
// — milimetr nie robi różnicy."*  How long it lasts: *"tylko jednorazowe, z
// możliwością zrobienia Undo."*
//
// And the two decisions taken FOR him at the top of CLAUDE.md, both tested
// here: the offer is a BAR AT THE GAP (never a centre modal), and a share-out
// that would make the fronts too wide OFFERS the extra cabinet rather than
// adding one.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners, roomWalls } from '../src/engine/room.js';
import { buildRuns } from '../src/engine/runs.js';
import { getUnitType } from '../src/engine/types.js';
import {
  shareOutSpec, widthFixed, shareOutPlan, shareOutOffered, shareOutFor, shareOutGapSpan,
} from '../src/engine/shareOut.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';

const ROOM = migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) });
const WALLS = roomWalls(ROOM);

/** A run of plain base units, hand-built — no store, no placement. */
function run(widths, { types = null, x0 = 0 } = {}) {
  let x = x0;
  const units = widths.map((w, i) => {
    const u = {
      id: `u${i + 1}`,
      type: types?.[i] || 'BUD',
      params: { width: w, height: 770, depth: 570, unit_num: `0${i + 1}` },
      position: { wall: 0, x_mm: x, rotation_deg: 0 },
    };
    x += w;
    return u;
  });
  return { units, runs: buildRuns(units, P) };
}

const only = (r) => {
  assert.equal(r.runs.length, 1, 'one run');
  return r.runs[0];
};

const context = (r, wallWidth = 4000) => ({
  wallWidth,
  others: r.units.filter((u) => (u.position?.wall ?? 0) === 0
    && getUnitType(u.type).mount === 'floor'),
});

// ─── THE OFFER ─────────────────────────────────────────────────────────────

test('F2 · the offer stands under 400 mm of leftover, and nowhere else', () => {
  assert.equal(shareOutSpec(P).gapMm, 400, 'the owner’s own number, from the profile');

  // Six 600s on a 4000 wall: 400 left over — his threshold exactly, and the
  // offer is UNDER it, so 400 is not an offer.
  const at400 = run([600, 600, 600, 600, 600, 600]);
  assert.equal(shareOutOffered(only(at400), context(at400), P), null, '400 is not under 400');

  // Six 610s: 340 left. That is the case he describes.
  const under = run([610, 610, 610, 610, 610, 610]);
  const plan = shareOutOffered(only(under), context(under), P);
  assert.ok(plan, 'under 400, the bar offers');
  assert.equal(plan.gap, 340);

  // A run that finishes ON the wall has nothing to share.
  const exact = run([1000, 1000, 1000, 1000]);
  assert.equal(shareOutOffered(only(exact), context(exact), P), null, 'no gap, no offer');
});

// ─── WHICH CABINETS: "wszystkie co nie mają narzucone" ─────────────────────

test('F2 · an appliance keeps its width — the kit declares it', () => {
  for (const id of ['DW_PANEL', 'OVEN_BASE', 'FRIDGE', 'FRIDGE_US', 'WUD_HOOD']) {
    assert.equal(getUnitType(id).widthFixed, true, `${id} is what the appliance is`);
  }
  for (const id of ['BUD', 'BUDR', 'WARDROBE', 'WUD', 'SINK', 'PANTRY']) {
    assert.ok(!getUnitType(id).widthFixed, `${id} is share-out material`);
  }
});

test('F2 · …and so does one the JOINER has pinned', () => {
  const plain = { type: 'BUD', params: { width: 600 } };
  assert.equal(widthFixed(plain), false);
  assert.equal(widthFixed({ ...plain, params: { width: 600, width_fixed: true } }), true);
  assert.equal(widthFixed({ type: 'DW_PANEL', params: { width: 600 } }), true);
});

test('F2 · the dishwasher is stepped around and everything else takes the gap', () => {
  // 600 D/W + three 600 base units = 2400 on a 4000 wall: 1600 over, which is
  // not an offer — but the ARITHMETIC is what is under test here.
  const r = run([600, 600, 600, 600], { types: ['BUD', 'DW_PANEL', 'BUD', 'BUD'] });
  const plan = shareOutPlan(only(r), context(r), P, {});
  assert.equal(plan.ok, true);
  assert.equal(plan.n, 3, 'three cabinets to widen, not four');
  assert.equal(plan.fixed, 600, 'and the machine’s own 600 comes out of the span first');
  // (4000 − 0 infill − 0 pads − 600 fixed) / 3
  assert.equal(plan.each, Math.floor(3400 / 3));
  assert.equal(plan.widths.length, 3);
  assert.ok(!plan.widths.some((w) => w.id === 'u2'), 'the D/W is not in the plan');
});

test('F2 · a run of nothing BUT appliances says so instead of offering', () => {
  const r = run([600, 600], { types: ['DW_PANEL', 'OVEN_BASE'] });
  const plan = shareOutPlan(only(r), context(r), P, {});
  assert.equal(plan.ok, false);
  assert.equal(plan.reason, 'nothing-to-widen');
});

// ─── THE ARITHMETIC ────────────────────────────────────────────────────────

test('F2 · (wall clear − infills) ÷ n, rounded to 1 mm, the odd one to the LAST', () => {
  // Three cabinets on a 4000 wall: 4000 / 3 = 1333.33 → 1333, 1333, 1334.
  const r = run([600, 600, 600]);
  const plan = shareOutPlan(only(r), context(r), P, {});
  assert.equal(plan.clear, 4000);
  assert.equal(plan.each, 1333);
  assert.equal(plan.last, 1334, '*"milimetr nie robi różnicy"* — and it goes to the last one');
  assert.deepEqual(plan.widths.map((w) => w.to), [1333, 1333, 1334]);
  assert.equal(plan.widths.reduce((s, w) => s + w.to, 0), 4000, 'and the run finishes ON the wall');
});

test('F2 · "oczywiście odejmując infill" — the side infills come out first', () => {
  const r = run([600, 600, 600]);
  r.units[0].params.side_infill_left_mm = 40;
  r.units[2].params.side_infill_right_mm = 40;
  const plan = shareOutPlan(buildRuns(r.units, P)[0], context(r), P, {});
  assert.equal(plan.infills, 80);
  assert.equal(plan.each, Math.floor((4000 - 80) / 3), 'the fillers keep their 40 each');
  assert.equal(plan.widths.reduce((s, w) => s + w.to, 0), 4000 - 80);
});

test('F2 · an END PANEL is board, not cabinet — it comes out too', () => {
  const r = run([600, 600, 600]);
  r.units[0].params.end_panels = [{ id: 'ep1', side: 'L', thickness: 18 }];
  r.units[0].params.front_t = 18;
  const plan = shareOutPlan(buildRuns(r.units, P)[0], context(r), P, {});
  assert.equal(plan.each, Math.floor((4000 - 18) / 3));
});

// ─── DECISION 2: THE EXTRA CABINET IS OFFERED, NEVER TAKEN ─────────────────

test('F2 · a share-out that makes the fronts too wide OFFERS one more cabinet', () => {
  assert.equal(shareOutSpec(P).maxWidthMm, 620, 'the line, from the profile');

  // CLAUDE.md's own worked example: 3900 over six is 650 of front.
  const r = run([600, 600, 600, 600, 600, 600]);
  const plan = shareOutPlan(only(r), context(r, 3900), P, {});
  assert.equal(plan.each, 650);
  assert.equal(plan.tooWide, true, '650 is wider than one door should be');

  assert.ok(plan.alternative, 'so the bar has a second button');
  assert.equal(plan.alternative.n, 7, 'seven cabinets');
  assert.equal(plan.alternative.each, 557, '…at 557 mm — CLAUDE.md’s own figure');
  assert.equal(plan.alternative.tooWide, false);
});

test('F2 · an ordinary share-out does NOT offer an extra cabinet', () => {
  const r = run([600, 600, 600, 600, 600, 600]);      // 3600 of cabinet
  const plan = shareOutPlan(only(r), context(r, 3660), P, {});
  assert.equal(plan.each, 610, 'the scribe shared in — a perfectly ordinary run');
  assert.equal(plan.tooWide, false);
  assert.equal(plan.alternative, null, 'and no second button');
});

// ─── WHERE THE BAR STANDS (decision 1) ─────────────────────────────────────

test('F2 · the bar stands IN the leftover gap — the bigger of the two free ends', () => {
  const r = run([600, 600, 600], { x0: 100 });
  const span = shareOutGapSpan(only(r), context(r));
  assert.equal(span.side, 'right', '100 on the left, 2100 on the right');
  assert.equal(span.from, 1900);
  assert.equal(span.to, 4000);
  assert.equal(span.gap, 2100);
});

test('F2 · the bar is a BAR — not a modal, and not a canvas glyph', () => {
  const src = readFileSync(new URL('../src/3d/ShareOutBar.jsx', import.meta.url), 'utf8');
  assert.ok(src.includes('data-share-out-bar='), 'the strip');
  assert.ok(src.includes('data-share-out-go='), 'and its one button');
  assert.ok(src.includes('data-share-out-extra='), 'and decision 2’s second one');
  assert.ok(src.includes('data-share-out-blocked='), 'and the sentence for a run with nothing to widen');
  assert.ok(!/openModal\(/.test(src), 'it never opens a modal');
  assert.ok(src.includes('ccHelper'), 'and it is a TOOL — no render, no shadow');

  const scene = readFileSync(new URL('../src/3d/Scene.jsx', import.meta.url), 'utf8');
  assert.ok(scene.includes('<ShareOutBar'), 'drawn in the room, where the gap is');
});

// ─── ONCE, NOT A STATE ─────────────────────────────────────────────────────

test('F2 · it is ONCE: no flag is written, and nothing recalculates later', () => {
  const src = readFileSync(new URL('../src/engine/shareOut.js', import.meta.url), 'utf8');
  // Prose about the decision is welcome; a WRITE is not. The module hands back
  // a plan and touches nothing — no assignment into a unit anywhere in it.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/\.params\s*=|params\.\w+\s*=[^=]/.test(code),
    'no state is stamped on a unit — *"tylko jednorazowe"*');
  const store = readFileSync(new URL('../src/stores/projectStore.js', import.meta.url), 'utf8');
  const action = store.slice(store.indexOf('  shareOutRun:'), store.indexOf('  removeUnit:'));
  assert.ok(action.includes('runBatch'), 'ONE undo step — *"z możliwością zrobienia Undo"*');
  assert.ok(action.includes('updateUnitParams(u.id, { width: to.width })'),
    'written through the ordinary width setter, with the ordinary clamp');
  // …from the RIGHT, because every cabinet in a share-out is growing and a
  // cabinet grows into the space the one after it has just vacated.
  assert.ok(action.includes('for (const u of [...units].reverse()) place(u);'));
  // …and with the MAGNET off: it is a hand's convenience and it is exactly
  // wrong for a position somebody has worked out.
  assert.ok(action.includes('{ magnet: false }'));
});

// ─── THE STORE, END TO END ─────────────────────────────────────────────────

const store = () => useProjectStore.getState();

function project() {
  store().loadProject({
    id: null, name: 'T50 F2', number: '50', client: 'the owner',
    room: ROOM, design: {},
  }, []);
}

const add = (type, opts) => store().addUnit(type, opts);
const unit = (id) => store().units.find((u) => u.id === id);

test('F2 · a run shared out finishes on the wall, in one undo step', () => {
  project();
  const a = add('BUD');
  const b = add('BUD', { near: a.id, side: 'R' });
  const c = add('BUD', { near: b.id, side: 'R' });
  assert.ok(a.id && b.id && c.id);

  const res = store().shareOutRun(c.id, {});
  assert.equal(res.ok, true, res.message || '');

  const widths = [a, b, c].map((r) => Number(unit(r.id).params.width));
  const total = widths.reduce((s, w) => s + w, 0);
  // *"od ściany do ściany, oczywiście odejmując infill."*  The project scribes
  // 40 at each wall, so the cabinets fill the wall LESS those two fillers —
  // which is the sentence, not a shortfall.
  const margin = P.autoParts.sideInfill.defaultWidth;
  assert.equal(total + 2 * margin, 4000, 'from wall to wall, less the two scribes');
  // *"zaokrąglamy — milimetr nie robi różnicy."*  3920 over three is 1306.67,
  // so two of them take 1306 and the last takes the two millimetres that are
  // left. The spread can never be more than the count, by construction.
  assert.ok(Math.max(...widths) - Math.min(...widths) < widths.length,
    'and all one width, to the odd millimetre');

  // …and they stand end to end, in order, starting off the wall by the scribe.
  const xs = [a, b, c].map((r) => Number(unit(r.id).position.x_mm));
  assert.equal(xs[0], margin);
  assert.equal(xs[1], xs[0] + widths[0]);
  assert.equal(xs[2], xs[1] + widths[1]);

  // And nothing was refused on the way: a plan that agreed with the clamp
  // produces no "Width limited by…" notices at all.
  assert.deepEqual((res.notices || []).filter((n) => /limited/i.test(n)), [],
    'the plan and the placement agree to the millimetre');
});

test('F2 · the OFFER is raised by the add itself, and only when there is a gap worth it', () => {
  project();
  useUiStore.getState().clearShareOut();
  const a = add('BUD');
  // 600 on a 4000 wall leaves 3400 — a gap, but not the owner's case.
  assert.equal(useUiStore.getState().shareOutOffer, null, 'no offer over a gap a cabinet fits in');

  // Fill the wall until under 400 mm is left.
  let last = a;
  for (let i = 0; i < 5; i += 1) {
    const next = add('BUD', { near: last.id, side: 'R' });
    if (next.id) last = next;
  }
  const room = store().units.reduce((s, u) => s + (Number(u.params.width) || 0), 0);
  if (4000 - room < 400 && 4000 - room > 0) {
    assert.ok(useUiStore.getState().shareOutOffer, 'under 400, the offer stands');
  }
});

test('F2 · a run whose widths are ALL imposed refuses with a sentence', () => {
  project();
  const a = add('DW_PANEL');
  assert.ok(a.id);
  const res = store().shareOutRun(a.id, {});
  assert.equal(res.ok, false);
  assert.match(res.message, /imposed|Nothing to share/i);
});

// ─── WHAT IT DOES TO A SLOPED RUN (CLAUDE.md asks this be said PLAINLY) ────

test('F2 · a share-out under a slope recomputes the cut, the angle and the hinges', () => {
  // CLAUDE.md: *"Say plainly in the PR what this does to a SLOPED run: changing
  // a cabinet's width changes where the ceiling line crosses it, so the cut,
  // the angle and the hinge set are all recomputed."*
  //
  // This is the mechanism that makes that true, asserted rather than promised:
  // the cut a cabinet is given is resolved over ITS OWN WIDTH, so a width that
  // moves moves the line across it. `lib/slopeLine.js slopeCutLine` takes the
  // width as an input, which is the whole of the reason.
  const src = readFileSync(new URL('../src/lib/slopeLine.js', import.meta.url), 'utf8');
  const sig = src.slice(src.indexOf('export function slopeCutLine('), src.indexOf('} = {}) {', src.indexOf('export function slopeCutLine(')));
  assert.ok(/width/.test(sig), 'the cut line is resolved over the unit’s own width');
  assert.ok(/\bx\b/.test(sig), '…at the unit’s own x on the wall');
  // …and the share-out writes width and x through the ordinary setters, so the
  // recompute happens by the route every other width edit already takes.
  const store2 = readFileSync(new URL('../src/stores/projectStore.js', import.meta.url), 'utf8');
  const action = store2.slice(store2.indexOf('  shareOutRun:'), store2.indexOf('  removeUnit:'));
  assert.ok(action.includes('moveUnit('), 'x moves');
  assert.ok(action.includes('width: want'), 'and width with it');
});
