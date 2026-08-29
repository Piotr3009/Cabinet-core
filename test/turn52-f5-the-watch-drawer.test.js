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
  shelfGlassPlan,
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
  // ─── AMENDED BY T53 · F8 — THE ONE SANCTITY LICENCE OF THE NIGHT ────────
  //
  // `drawWatchGlassRebate` and `drawWatchLed` are GONE, and the owner's own
  // words are what spent the licence, 27.08.2026: *"opcja: dodać szybę ponad
  // szufladą — wtedy wycinamy w półce otwór, offset od półki na 50 mm … i
  // dookoła tej szyby masz LED od spodu, offset około 15 mm na LED."*  The pane
  // and the strip are not on the tray any more; they are on the SHELF above it,
  // so a rebate for a pane that is not there and a groove for a strip that is
  // not there were two operations the machine would do for nothing.
  //
  // What replaces them is asserted here, so the file still holds the LISP to
  // the geometry it is the law for.
  assert.match(LISP, /\(defun SKY:watchShelfOpening \(szer gleb off\)/);
  assert.match(LISP, /\(defun SKY:watchShelfLedRing \(szer gleb off led \/ o\)/);
  assert.match(LISP, /\(defun SKY:watchRearField \(variant innerW t \/ \)/);
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

test('F5 — nine millimetre dividers and forty inside, both from him', () => {
  assert.equal(S.dividerT, 9, '*"przegródki z 9 mm zrób"*');
  assert.equal(S.frameT, 9, 'and the frame from the same board');
  // T54-F4 AMENDED (28.08.2026): the owner re-sized — *"120 proszę"* — and
  // the front height derives, so the inside depth is the number that moved:
  // his 26.08 "około 60 mm" (asserted here since T52) became 40. The 60
  // stays in profile.js as history, with the amended trade note beside the
  // new number (a 44–48 chronograph no longer lies flat — his veto line).
  assert.equal(S.insideDepthMm, 40, '*"120 proszę"* — 40 + 9 + 2 + 15 + 18 + 36 = 120');
  // CLAUDE.md asks for BOTH numbers to be noted: the trade standard is ~50 —
  // still written beside his, tonight with the chronograph consequence.
  const src = readFileSync(new URL('../src/engine/profile.js', import.meta.url), 'utf8');
  assert.match(src, /trade standard is ~50/, 'the trade number is written down beside his');
  assert.match(src, /chronograph will no longer lie flat/, 'and the 40\'s own cost is named');
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

// ─── DECISIONS 1 AND 2 ARE VETOED BY THE OWNER (T53 · F8) ─────────────────
//
// 27.08.2026, walking T52's insert: the pane is not IN the tray and the strip
// is not in the front rail. Both are on the SHELF ABOVE. T52's two tests are
// kept here, amended, because the CLAIMS they made are the ones that had to
// survive the move — and one of them did, unchanged:
//
//   DECISION 1 (the pane lifts out of a rebate in the frame) is OVERTURNED.
//   The pane sits in the SHELF now, flush with its top — a DECISION TAKEN for
//   the owner, veto in one line: a proud pane on a wardrobe shelf catches
//   every sleeve.
//
//   DECISION 2 (the LED lights the WATCHES, not the glass) STANDS, relocated.
//   The strip rings the opening on the shelf's UNDERSIDE and fires DOWN onto
//   the watches. Same law, from above.
test('F5 — DECISION 1, overturned: the pane is in the SHELF, flush with its top', () => {
  const L = watchDrawerLayout({ width: 518, depth: 454, height: 204 }, P);
  assert.equal(L.glass, undefined, 'the tray carries no pane at all any more');
  const plan = shelfGlassPlan({ w: 864, d: 550 }, P);
  assert.ok(plan, 'the SHELF carries it');
  assert.equal(plan.glass.flush, true, 'flush with the shelf top — the decision taken');
  assert.equal(plan.rebate.depth, S.glassT, 'so the rebate is exactly the pane');
  // …and the opening is his own 50 from every edge.
  assert.equal(plan.opening.x1, P.watchDrawer.openingOffsetMm);
  assert.equal(plan.opening.y1, P.watchDrawer.openingOffsetMm);
  assert.equal(864 - plan.opening.x2, P.watchDrawer.openingOffsetMm);
  assert.equal(550 - plan.opening.y2, P.watchDrawer.openingOffsetMm);
});

test('F5 — DECISION 2 STANDS, relocated: the LED lights the WATCHES', () => {
  assert.match(LISP, /firing down onto the watches/i);
  const L = watchDrawerLayout({ width: 518, depth: 454, height: 204 }, P);
  assert.equal(L.led, undefined, 'not in the front rail any more');
  const plan = shelfGlassPlan({ w: 864, d: 550 }, P);
  assert.equal(plan.led.aimedAt, 'contents', 'the law itself, unchanged');
  assert.equal(plan.led.face, 'underside', 'and it fires DOWN');
  // ~15 mm OUTSIDE the opening, all round — his own number.
  const led = P.watchDrawer.ledOffsetMm;
  assert.equal(plan.opening.x1 - plan.led.x1, led);
  assert.equal(plan.led.x2 - plan.opening.x2, led);
  assert.equal(plan.opening.y1 - plan.led.y1, led);
  assert.equal(plan.led.y2 - plan.opening.y2, led);
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

  //   THE REBATE AND THE GROOVE ARE NOT ON THE TRAY (T53 · F8, the licence).
  //   They are on the SHELF above, and `test/turn53-f8-*` holds them to it.
  const rebates = parts.filter((q) => (q.cnc?.pockets || [])
    .some((k) => k.layer === WATCH_LAYERS.rebate));
  assert.deepEqual(rebates, [], 'no rail is rebated for a pane that is upstairs');
  const grooved = parts.filter((q) => (q.cnc?.paths || [])
    .some((k) => k.layer === LED_GROOVE_LAYER.name));
  assert.deepEqual(grooved, [], 'and no rail is grooved for a strip that is upstairs');
});

// AMENDED BY T53 · F8: the groove is not in the front rail any more, and the
// claim that mattered — that it is KIT_LED_GROOVE's own groove and never a
// second one — is asserted where the groove now is.
test('F5 — the groove is still KIT_LED_GROOVE’s, wherever it is cut', () => {
  const r = wardrobe({ drawers: [{ height_mm: 220, watch_insert: true }] });
  const rail = insertParts(r).find((q) => q.part === 'WATCH-RAIL-FRONT');
  assert.deepEqual(rail.cnc.paths || [], [], 'the front rail carries no groove');
  assert.match(LISP, /drawLedGroove/, 'and the kit still defers to KIT_LED_GROOVE');
  assert.equal(LED_FLEXI_WIDTH_MM, 4, 'the flexi’s own width is untouched');
  assert.ok(GROOVE_END_EXTRA_MM > 0, '…as is T48’s end extra');
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
    // T53 (F8e): the line names the LAYOUT and the field behind the row, which
    // is what "long sections" became when the rear field grew three siblings.
    assert.match(line.spec_label, /across in \d+ lane/);
    assert.match(line.spec_label, /classic|cufflinks|ties|belts/);
  }
  // …and T53 · F8: the pane and the strip are the SHELF's, so a drawer with no
  // shelf above it buys neither. `test/turn53-f8-*` asserts the other half —
  // with a shelf, both lines appear and each names the shelf it belongs to.
  const glass = (r.hardware || []).filter((h) => h.role === 'drawer_glass');
  assert.deepEqual(glass, [], 'no shelf above, no pane ordered');
  const led = (r.hardware || []).filter((h) => h.role === 'led_strip');
  assert.deepEqual(led, [], '…and no strip');
});

// AMENDED BY T53 · F8: the pane is drawn where the SHELF is.
test('F5 — the pane is NOT drawn on the tray any more', () => {
  const r = wardrobe({ drawers: [{ height_mm: 220, watch_insert: true }] });
  assert.equal((r.assemblies.watchGlass || []).length, 0,
    'no shelf above, so there is no pane at all');
  const rail = insertParts(r).find((q) => q.part === 'WATCH-RAIL-FRONT');
  assert.equal(rail.meta.led, undefined, 'and the front rail carries no light');
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
