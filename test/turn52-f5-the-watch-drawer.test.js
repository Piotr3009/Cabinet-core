// ─── T52 · F5 — THE WATCH DRAWER ───────────────────────────────────────────
//
// The owner, 26.08.2026:
//
//   *"szuflada z przegródkami na zegarki, krawaty etc … szkło i podświetlenie
//   … rama z Eggera ale podświetlone zegarki … oczywiście szuflada nasza
//   standardowa, tylko przegródki z 9 mm zrób, i szuflada płytka w środku,
//   myślę że około 60 mm."*
//
// *"szuflada nasza standardowa, tylko przegródki"* — an INSERT, not a drawer
// type. The BOX is untouched, and this file asserts that as a fact rather than
// promising it.
//
// LISP IS LAW, FIRST (iron rule 3): every rule is born in
// `reference/lisp/KIT_WATCH_DRAWER.lsp` and the JS follows it. This file reads
// that .lsp off disk and holds the two to each other, exactly as T48 does for
// the LED groove.
//
// AND THE THREE DECISIONS TAKEN FOR THE OWNER, each asserted where it lands:
//   1. the glass LIFTS OUT (a rebate in the frame, no bead, no stop);
//   2. the LED lights the WATCHES, not the glass;
//   3. the insert is its OWN BOM LINE, addable to any drawer.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { runChecks } from '../src/engine/checks.js';
import { drawerOf } from '../src/engine/drawerMotion.js';
import { GROOVE_END_EXTRA_MM, LED_GROOVE_LAYER } from '../src/lib/ledGroove.js';
import {
  LED_FLEXI_WIDTH_MM, WATCH_LAYERS, dividerXs, drawerBoxInterior, drawerItemOf,
  insertHeight, pocketCount, pocketWidth, watchDrawerFit, watchDrawerLayout,
  watchDrawerSpec, watchInsertOn, watchInsertParts,
} from '../src/engine/watchDrawer.js';

const LISP = readFileSync(new URL('../reference/lisp/KIT_WATCH_DRAWER.lsp', import.meta.url), 'utf8');
const S = watchDrawerSpec(P);

/** A wardrobe with a drawer stack, some of whose drawers carry the insert. */
function wardrobe({ width = 900, drawers = [] } = {}) {
  return computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: '01',
    width,
    sections: [{ items: drawers.map((d, i) => ({ kind: 'drawer', index: i + 1, ...d })) }],
  }, P);
}

const insertParts = (r) => r.panels.filter((p) => p.role === 'watch_insert');
const boxParts = (r) => r.panels.filter((p) => p.role === 'drawer_box');

// ─── WHERE IT IS BORN ──────────────────────────────────────────────────────

test('F5 — the geometry is stated in the LISP, and the LISP is where it is born', () => {
  assert.match(LISP, /\(defun SKY:watchPocketCount \(innerW target t minW \/ n\)/);
  assert.match(LISP, /\(defun SKY:watchPocketWidth \(innerW n t\)/);
  assert.match(LISP, /\(defun SKY:watchDividerXs \(innerW n t \/ w out i\)/);
  assert.match(LISP, /\(defun SKY:watchDrawerTooShallow \(clearH baseT insideD keep\)/);
  assert.match(LISP, /\(defun drawWatchSlot \(x y1 y2 t \/ \)/);
  assert.match(LISP, /\(defun drawWatchGlassRebate \(x1 x2 y w \/ \)/);
  assert.match(LISP, /\(defun drawWatchLed \(railLen yBelow width \/ \)/);
  // The owner's own sentence, so the reason survives the next reader.
  assert.match(LISP, /szuflada z przegrodkami na zegarki/);
  assert.match(LISP, /przegrodki z 9 mm zrob/);
  // …and the promise the whole feature rests on.
  assert.match(LISP, /NOTHING IN THIS FILE TOUCHES THE DRAWER BOX/);
});

test('F5 — the two layers the LISP declares are the two the app cuts on', () => {
  assert.match(LISP, /"WATCH_DIVIDER_SLOT"/);
  assert.match(LISP, /"WATCH_GLASS_REBATE"/);
  assert.equal(WATCH_LAYERS.slot, 'WATCH_DIVIDER_SLOT');
  assert.equal(WATCH_LAYERS.rebate, 'WATCH_GLASS_REBATE');
});

test('F5 — the count law is the LISP’s, arm for arm', () => {
  // `(fix (+ x 0.5))` is AutoLISP for "nearest", and the give-way loop runs
  // DOWNWARDS while the pocket is under the floor.
  assert.match(LISP, /\(setq n \(fix \(\+ \(\/ \(\+ innerW t\) \(\+ target t\)\) 0\.5\)\)\)/);
  assert.match(LISP, /\(while \(and \(> n 1\) \(< \(SKY:watchPocketWidth innerW n t\) minW\)\)/);
  // …and the JS gives the same answer over a sweep of real widths.
  for (let innerW = 120; innerW <= 1200; innerW += 7) {
    const n = pocketCount(innerW, P);
    const w = pocketWidth(innerW, n, S.dividerT);
    assert.ok(n >= 1, `${innerW}: at least one pocket`);
    if (n > 1) {
      assert.ok(w >= S.pocketMinMm, `${innerW}: ${w} is under the ${S.pocketMinMm} mm floor`);
      // …and one MORE pocket would have broken the floor, which is what makes
      // this the nearest count that still fits.
      const wider = pocketWidth(innerW, n + 1, S.dividerT);
      assert.ok(wider < w, `${innerW}: more pockets must mean smaller ones`);
    }
    // The dividers and the pockets add up to the width, to the last millimetre.
    assert.ok(Math.abs(n * w + (n - 1) * S.dividerT - innerW) < 1e-9, `${innerW}: the row adds up`);
  }
});

// ─── THE OWNER'S NUMBERS ───────────────────────────────────────────────────

test('F5 — nine millimetre dividers and sixty inside, both from him', () => {
  assert.equal(S.dividerT, 9, '*"przegródki z 9 mm zrób"*');
  assert.equal(S.frameT, 9, 'and the frame from the same board');
  assert.equal(S.insideDepthMm, 60, '*"szuflada płytka w środku, myślę że około 60 mm"*');
  // CLAUDE.md asks for BOTH numbers to be noted: the trade standard is ~50 and
  // 60 is his, because 60 carries a chronograph and a lining.
  const src = readFileSync(new URL('../src/engine/profile.js', import.meta.url), 'utf8');
  assert.match(src, /trade standard is ~50/, 'the trade number is written down beside his');
});

test('F5 — a pocket never falls below 60 mm clear, whatever the drawer', () => {
  assert.equal(S.pocketMinMm, 60, 'a watch CASE runs 30–48 mm across');
  for (const innerW of [120, 200, 340, 500, 700, 900, 1100]) {
    const n = pocketCount(innerW, P);
    assert.ok(pocketWidth(innerW, n, S.dividerT) >= S.pocketMinMm - 1e-9,
      `${innerW}: ${pocketWidth(innerW, n, S.dividerT)}`);
  }
});

test('F5 — the count FOLLOWS the width; five is not a constant', () => {
  // CLAUDE.md's own example lands here: an insert of about 500 mm inside width
  // — which is a 600 mm drawer — takes five at ~92, and 5 × 95 + 4 × 9 = 511
  // is the arithmetic that puts it there.
  assert.equal(pocketCount(500, P), 5);
  assert.ok(Math.abs(pocketWidth(500, 5, S.dividerT) - 92.8) < 0.05);
  // A 900 mm drawer is EIGHT by the same rule, and that is the point of a rule.
  assert.equal(pocketCount(800, P), 8);
  // …and a narrow one gives way rather than making pockets nothing fits in.
  assert.equal(pocketCount(140, P), 1);
  assert.equal(pocketCount(200, P), 2);
});

test('F5 — the dividers are evenly spaced, and there are one fewer than pockets', () => {
  for (const innerW of [200, 500, 800]) {
    const n = pocketCount(innerW, P);
    const xs = dividerXs(innerW, n, S.dividerT);
    assert.equal(xs.length, n - 1);
    for (let i = 1; i < xs.length; i += 1) {
      assert.ok(Math.abs((xs[i] - xs[i - 1]) - (pocketWidth(innerW, n, S.dividerT) + S.dividerT)) < 1e-9);
    }
    if (xs.length) {
      assert.ok(xs[0] > 0 && xs[xs.length - 1] + S.dividerT < innerW, 'inside the frame');
    }
  }
});

// ─── ONE ROW AT THE FRONT, LONG SECTIONS BEHIND ────────────────────────────

test('F5 — ONE row of pockets, at the FRONT, with sections behind it', () => {
  const L = watchDrawerLayout({ width: 518, depth: 454, height: 204 }, P);
  assert.ok(L);
  assert.equal(L.pockets.depth, S.pocketRowDepthMm, 'the row is the pocket’s own depth');
  assert.ok(L.sections.count >= 1, 'and there is room behind it');
  assert.ok(L.sections.depth > L.pockets.depth,
    'the sections are LONGER than the pockets — a tie wants length');
  // Row + rail + sections = the whole inside, to the millimetre. There is no
  // second row and no room for one.
  assert.ok(Math.abs(L.pockets.depth + S.dividerT + L.sections.depth - L.inner.d) < 1e-9);
  assert.ok(L.sections.count < L.pockets.count, 'few and wide, not the pocket rule again');
});

// ─── THE THREE DECISIONS ───────────────────────────────────────────────────

test('F5 — DECISION 1: the glass lifts out of a rebate in the frame', () => {
  assert.match(LISP, /THE GLASS LIFTS OUT/);
  const L = watchDrawerLayout({ width: 518, depth: 454, height: 204 }, P);
  assert.equal(L.glass.liftsOut, true);
  assert.equal(L.glass.t, 4, 'what a drawer is glazed with');
  // It BEARS on the rebate, so the pane is the opening plus a bearing each side.
  assert.equal(L.glass.w, L.inner.w + 2 * S.glassBearingMm);
  assert.equal(L.glass.d, L.inner.d + 2 * S.glassBearingMm);
  // …and the bearing leaves a lip of rail standing proud of it all round,
  // which is what a fingernail lifts against.
  assert.ok(S.glassBearingMm < S.frameT, 'a bearing as wide as the rail is a rail with nothing left');
  assert.equal(S.frameT - S.glassBearingMm, 4, 'a 4 mm lip on a 9 mm rail');
});

test('F5 — DECISION 2: the LED lights the WATCHES, not the glass', () => {
  assert.match(LISP, /THE LED LIGHTS THE WATCHES, not the glass/);
  const L = watchDrawerLayout({ width: 518, depth: 454, height: 204 }, P);
  assert.equal(L.led.aimedAt, 'contents');
  // UNDER the glass, in the rail's own board frame, by the profile's number.
  assert.equal(L.led.railY, S.insideDepthMm - S.glassT - S.ledBelowGlassMm);
  assert.ok(L.led.railY < S.insideDepthMm - S.glassT, 'below the pane, never level with it');
  assert.ok(L.led.railY > 0, 'and in the rail, not under the tray');
});

test('F5 — DECISION 3: it is a FLAG on a drawer, not a drawer type', () => {
  assert.match(LISP, /THE INSERT IS ITS OWN BOM LINE, addable to any drawer/);
  assert.equal(watchInsertOn({ kind: 'drawer', watch_insert: true }), true);
  assert.equal(watchInsertOn({ kind: 'drawer' }), false);
  assert.equal(watchInsertOn({ kind: 'drawer', variant: 'belt_tie' }), false);
  // …and it composes with a VARIANT rather than replacing one.
  assert.equal(watchInsertOn({ kind: 'drawer', variant: 'belt_tie', watch_insert: true }), true);

  const unit = {
    params: {
      sections: [{
        items: [
          { kind: 'drawer', index: 1, id: 'a' },
          { kind: 'drawer', index: 2, id: 'b', watch_insert: true },
        ],
      }],
    },
  };
  assert.equal(drawerItemOf(unit, 2)?.id, 'b');
  assert.equal(watchInsertOn(drawerItemOf(unit, 1)), false, 'one drawer of six');
  assert.equal(watchInsertOn(drawerItemOf(unit, 2)), true);
});

// ─── AND THE BOX IS UNTOUCHED ──────────────────────────────────────────────

test('F5 — "szuflada nasza standardowa": the BOX does not move a millimetre', () => {
  const plain = wardrobe({ drawers: [{ height_mm: 220 }, { height_mm: 220 }] });
  const withOne = wardrobe({ drawers: [{ height_mm: 220 }, { height_mm: 220, watch_insert: true }] });

  const strip = (r) => JSON.stringify(boxParts(r).map((p) => ({
    id: p.id, part: p.part, w: p.w, h: p.h, box: p.box, cnc: p.cnc,
  })));
  assert.equal(strip(withOne), strip(plain), 'every box board, every pocket, byte for byte');
  assert.equal(
    JSON.stringify(withOne.drills), JSON.stringify(plain.drills),
    'and not one hole moved',
  );
  assert.ok(insertParts(withOne).length > 0, 'while the tray really was cut');
  assert.equal(insertParts(plain).length, 0, 'and a plain drawer grows nothing');
});

test('F5 — the tray rides its drawer, like everything else screwed to one', () => {
  assert.equal(drawerOf({ role: 'watch_insert', meta: { drawer: 2 } }), 2);
  assert.equal(drawerOf({ role: 'shelf', meta: { drawer: 2 } }), null);
});

// ─── WHAT IS CUT ───────────────────────────────────────────────────────────

test('F5 — the four things CLAUDE.md asks the machine for', () => {
  const r = wardrobe({ drawers: [{ height_mm: 220, watch_insert: true }] });
  const parts = insertParts(r);
  assert.ok(parts.length >= 8, `${parts.length} pieces`);

  //   THE FRAME — four rails and a base, in the CARCASS material like every
  //   other board (*"rama z Eggera … it is not special-cased"*).
  const byPart = (p) => parts.filter((q) => q.part === p);
  assert.equal(byPart('WATCH-BASE').length, 1);
  assert.equal(byPart('WATCH-RAIL-FRONT').length, 1);
  assert.equal(byPart('WATCH-RAIL-BACK').length, 1);
  assert.equal(byPart('WATCH-RAIL-SIDE').length, 2);
  assert.equal(byPart('WATCH-RAIL-ROW').length, 1, 'the rail that makes it ONE row');
  for (const q of parts) {
    assert.equal(q.material_role, 'board', `${q.id} takes the project’s carcass board`);
    assert.equal(q.thickness, 9, `${q.id} is cut from the owner’s 9 mm`);
  }

  //   THE DIVIDER SLOTS.
  const slots = parts.flatMap((q) => (q.cnc?.pockets || []).filter((k) => k.layer === WATCH_LAYERS.slot));
  assert.ok(slots.length >= 4, `${slots.length} housings`);
  for (const k of slots) {
    assert.equal(k.x2 - k.x1, S.dividerT, 'a slot is the divider’s own stock across');
    assert.equal(k.depth, S.slotDepthMm, '…and a housing, not a through slot');
    assert.ok(k.depth < S.frameT, 'it never goes through the rail');
  }

  //   THE REBATE FOR THE GLASS — on all four outer rails and nowhere else.
  const rebates = parts.filter((q) => (q.cnc?.pockets || [])
    .some((k) => k.layer === WATCH_LAYERS.rebate));
  assert.deepEqual(
    rebates.map((q) => q.part).sort(),
    ['WATCH-RAIL-BACK', 'WATCH-RAIL-FRONT', 'WATCH-RAIL-SIDE', 'WATCH-RAIL-SIDE'],
  );
  for (const q of rebates) {
    const k = q.cnc.pockets.find((x) => x.layer === WATCH_LAYERS.rebate);
    assert.equal(k.y2 - k.y1, S.glassT, 'the pane’s own thickness, down from the top edge');
    assert.equal(k.depth, S.glassBearingMm, 'and the bearing, into the rail');
    assert.equal(k.y2, q.h, 'it is in the TOP edge — that is what makes the glass lift out');
  }

  //   THE LED GROOVE — in the FRONT rail, and in that one alone.
  const grooved = parts.filter((q) => (q.cnc?.paths || [])
    .some((k) => k.layer === LED_GROOVE_LAYER.name));
  assert.equal(grooved.length, 1);
  assert.equal(grooved[0].part, 'WATCH-RAIL-FRONT', 'decision 2: at the watches, not at the pane');
});

test('F5 — the groove matches the LISP: 4 mm, centred, +10 at each end', () => {
  const r = wardrobe({ drawers: [{ height_mm: 220, watch_insert: true }] });
  const rail = insertParts(r).find((q) => q.part === 'WATCH-RAIL-FRONT');
  const path = rail.cnc.paths.find((k) => k.layer === LED_GROOVE_LAYER.name);
  assert.ok(path.closed);
  const xs = path.pts.map((p) => p[0]);
  const ys = path.pts.map((p) => p[1]);
  // WIDTH — the flexi strip's own 4, as `ledFlexiWidth` states it.
  assert.equal(Math.max(...ys) - Math.min(...ys), LED_FLEXI_WIDTH_MM);
  assert.match(LISP, /drawLedGroove/, 'and it is KIT_LED_GROOVE’s groove, not a second one');
  // CENTRED on the line — never from the line outwards.
  assert.equal((Math.max(...ys) + Math.min(...ys)) / 2,
    S.insideDepthMm - S.glassT - S.ledBelowGlassMm);
  // LENGTH — T48's own law: 10 mm PAST the profile at each end, so a round bit
  // leaves no corner for a chisel.
  assert.equal(Math.min(...xs), -GROOVE_END_EXTRA_MM);
  assert.equal(Math.max(...xs), rail.w + GROOVE_END_EXTRA_MM);
  assert.equal(Math.max(...xs) - Math.min(...xs), rail.w + 2 * GROOVE_END_EXTRA_MM);
});

// ─── THE POCKETS, COUNTED AGAINST THE DRAWER WIDTH ─────────────────────────

test('F5 — the pockets are counted against the drawer that was built', () => {
  for (const width of [600, 900, 1200]) {
    const r = wardrobe({ width, drawers: [{ height_mm: 220, watch_insert: true }] });
    const built = r.assemblies.watchInserts?.[0];
    if (!built) continue;
    const interior = drawerBoxInterior(r.panels, 1);
    const innerW = interior.width - 2 * S.frameT - 2 * S.clearanceMm;
    assert.equal(built.pockets, pocketCount(innerW, P), `${width}: counted off the box, not guessed`);
    // …and the tray really carries that many dividers.
    const dividers = insertParts(r).filter((q) => q.meta?.divider === 'pocket').length;
    assert.equal(dividers, built.pockets - 1, `${width}: one fewer divider than pockets`);
  }
});

// ─── TOO SHALLOW: REPORTED, NEVER SQUASHED ─────────────────────────────────

test('F5 — a drawer too shallow is REFUSED, and nothing is cut', () => {
  assert.equal(insertHeight(P), S.baseT + S.insideDepthMm);
  const needs = insertHeight(P) + S.headroomMm;
  assert.equal(watchDrawerFit({ width: 500, depth: 400, height: needs }, P).ok, true);
  assert.equal(watchDrawerFit({ width: 500, depth: 400, height: needs - 1 }, P).reason, 'too-shallow');
  assert.equal(watchDrawerFit({ width: 60, depth: 400, height: 200 }, P).reason, 'too-narrow');
  assert.equal(watchDrawerFit({ width: 500, depth: 120, height: 200 }, P).reason, 'too-short');

  const r = wardrobe({ drawers: [{ height_mm: 110, watch_insert: true }] });
  assert.equal(insertParts(r).length, 0, 'nothing was cut');
  assert.equal(r.assemblies.watchInserts, undefined, 'and nothing was ordered');
  const warned = (r.warnings || []).filter((w) => w.code === 'watch_insert_refused');
  assert.equal(warned.length, 1);
  assert.equal(warned[0].reason, 'too-shallow');
  assert.match(warned[0].message, /is not cut/);
});

test('F5 — …and Check says which drawer, and by how much', () => {
  const r = wardrobe({ drawers: [{ height_mm: 110, watch_insert: true }] });
  const unit = {
    id: 'u1', type: 'WARDROBE', params: r.params, position: { wall: 0, x_mm: 0 },
  };
  const found = runChecks({ entries: [{ unit, result: r }], profile: P })
    .filter((f) => f.check === 23);
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 'red');
  assert.match(found[0].message, /cannot take the watch insert/);
  assert.match(found[0].message, /Nothing was cut/);
  assert.ok(found[0].needsHeightMm > found[0].hasHeightMm);

  // A drawer that CAN take one says nothing at all.
  const fine = wardrobe({ drawers: [{ height_mm: 220, watch_insert: true }] });
  const unit2 = {
    id: 'u2', type: 'WARDROBE', params: fine.params, position: { wall: 0, x_mm: 0 },
  };
  assert.deepEqual(runChecks({ entries: [{ unit: unit2, result: fine }], profile: P })
    .filter((f) => f.check === 23), []);
});

// ─── ITS OWN BOM LINE (decision 3) ─────────────────────────────────────────

test('F5 — one line per drawer that carries one, and it names the pockets', () => {
  const r = wardrobe({
    drawers: [
      { height_mm: 220 },
      { height_mm: 220, watch_insert: true },
      { height_mm: 220, watch_insert: true },
    ],
  });
  const lines = (r.hardware || []).filter((h) => h.role === 'watch_insert');
  assert.equal(lines.length, 2, 'two drawers of three — *"one drawer of six"*');
  for (const line of lines) {
    assert.equal(line.qty, 1);
    assert.ok(line.spec.pockets >= 1);
    assert.match(line.spec_label, /pockets at/);
    assert.match(line.spec_label, /long section/);
  }
  // …and the two things that really ARE ordered.
  const glass = (r.hardware || []).filter((h) => h.role === 'drawer_glass' && /lift-out/.test(h.label));
  assert.equal(glass.length, 2);
  assert.match(glass[0].spec_label, /lifts out/);
  const led = (r.hardware || []).filter((h) => h.role === 'led_strip');
  assert.equal(led.length, 2);
  assert.equal(led[0].spec.aimed_at, 'contents', 'decision 2, on the order form too');
  assert.equal(led[0].unit, 'm');
});

test('F5 — the pane and the strip are drawn where the tray is', () => {
  const r = wardrobe({ drawers: [{ height_mm: 220, watch_insert: true }] });
  const pane = r.assemblies.watchGlass?.[0];
  assert.ok(pane, 'the scene is handed a pane');
  assert.equal(pane.liftsOut, true);
  const rail = insertParts(r).find((q) => q.part === 'WATCH-RAIL-FRONT');
  // It sits DOWN in the frame: its underside is the rail's top less the pane.
  assert.equal(pane.box.y + pane.box.h, rail.box.y + S.insideDepthMm);
  assert.ok(pane.box.x > rail.box.x, 'and inside the frame, not over it');
  assert.equal(rail.meta.led, true, 'the front rail is the one that carries the light');
});

// ─── AND NOTHING ELSE IN THE APP MOVED ─────────────────────────────────────

test('F5 — a project with no insert is the project it was', () => {
  const plain = wardrobe({ drawers: [{ height_mm: 220 }] });
  assert.equal(plain.assemblies.watchGlass, undefined, 'absent rather than empty');
  assert.equal(plain.assemblies.watchInserts, undefined);
  assert.equal((plain.hardware || []).filter((h) => h.role === 'watch_insert').length, 0);
  assert.equal((plain.warnings || []).filter((w) => w.code === 'watch_insert_refused').length, 0);
});

test('F5 — the six standard configs carry no insert at all', () => {
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) {
    const r = computeCabinet({ ...defaultParamsFor(id, P), unit_num: '01' }, P);
    assert.equal(insertParts(r).length, 0, `${id} grows nothing`);
    assert.equal(r.assemblies.watchInserts, undefined, `${id} publishes nothing`);
  }
});

test('F5 — the parts helper answers null for a box that cannot take one', () => {
  assert.equal(watchInsertParts({ width: 500, depth: 400, height: 40, at: { x: 0, y: 0, z: 0 } }, P), null);
  assert.equal(drawerBoxInterior([], 1), null, 'and a drawer with no boards has no interior');
});
