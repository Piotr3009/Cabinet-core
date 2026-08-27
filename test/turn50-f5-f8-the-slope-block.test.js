// ─── T50 · F5–F8: THE SLOPE BLOCK ──────────────────────────────────────────
//
// CLAUDE.md: *"the slope block (F5–F8), which is one geometry and one file and
// must not be split."*  So it is tested as one, and every one of the owner's
// four sentences is a section below:
//
//   F5  *"end panele nie powinny się ciągnąć do płaskiego sufitu jak jest skos
//       — koniecznie muszą się zakończyć na skosie."*
//   F6  *"shaker nie powinien znikać jak najedziemy na skos, powinien się
//       renderować razem z drzwiami."*
//   F7  *"jak drzwi się zmniejszają, automatycznie usuwamy zawiasy tam gdzie
//       jest skos."*
//   F8  the LISP: the kits learn the slope.
//
// The GATE is the whole safety of it. Every assertion below has a FLAT twin,
// because a cut that reached a flat room would be a moved golden.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { shakerCutPocket, shakerPocket } from '../src/engine/shaker.js';
import { slopeNoteText } from '../src/engine/cnc/partLabel.js';
import { runChecks } from '../src/engine/checks.js';
import {
  parenBalance, balanceOfKits, routineCensus, routineFaults, gateFaults,
  T50_ROUTINE, T50_KIT, T50_GATED, T50_LISP_FILES,
} from '../scripts/t50-paren-balance.mjs';

const WARDROBE = { ...defaultParamsFor('WARDROBE', P), unit_num: '01' };
/** A ceiling FLAT for the first 200 mm and then falling — T47's own knee. */
const KNEE = { pts: [{ x: 0, y: 2100 }, { x: 200, y: 2100 }, { x: 600, y: 1200 }], infill: 40 };
const STRAIGHT = { pts: [{ x: 0, y: 2100 }, { x: 600, y: 1200 }], infill: 40 };

const build = (over = {}) => computeCabinet({ ...WARDROBE, ...over }, P);
const partOf = (r, part) => r.panels.find((p) => p.part === part);
const frontOf = (r) => r.panels.find((p) => p.role === 'front');

// ─── F5 · AN END PANEL STOPS AT THE SLOPE ──────────────────────────────────

const EP_R = [{ id: 'ep', side: 'R', thickness: 18, height: 'floor' }];

test('F5 · an end panel under the slope stops at it, and says at what angle', () => {
  const flat = partOf(build({ end_panels: EP_R }), 'END-PANEL');
  const cut = partOf(build({ end_panels: EP_R, slope_cut: STRAIGHT }), 'END-PANEL');

  assert.ok(cut.h < flat.h, 'it is shorter than the one under a flat ceiling');
  // The ceiling at the panel's own x (just past the carcass's 600) is 1200;
  // the panel drops 100 to the floor, so its own board is 1300 tall.
  assert.equal(cut.h, 1300);
  assert.equal(cut.box.h, cut.h, 'and the box in the room is the board that was cut');
  assert.equal(cut.w, flat.w, 'the DEPTH is untouched — the slope runs along the wall');

  assert.equal(cut.meta.slopeCut.h, 1300);
  assert.equal(cut.meta.slopeCut.full, flat.h, 'and it says what it would have been');
  assert.ok(Number(cut.meta.slopeCut.angles?.[0]?.deg) > 0, 'with the angle on the part');
  assert.match(slopeNoteText(cut), /^CUT \d+\.\d°/, '…and on the CNC sheet');
});

test('F5 · a flat room’s end panel is byte-identical', () => {
  const flat = partOf(build({ end_panels: EP_R }), 'END-PANEL');
  assert.equal(flat.meta.slopeCut, undefined, 'no record at all');
  assert.equal(slopeNoteText(flat), '', 'and nothing on the sheet');
  assert.deepEqual(flat.cnc.outline, [[0, 0], [flat.w, 0], [flat.w, flat.h], [0, flat.h]]);
  assert.equal(flat.cnc.drawn_h, undefined, 'and no drawn size it never carried');
});

test('F5 · an end panel under the FLAT stretch of a bent ceiling is not cut either', () => {
  // The LEFT panel of the knee fixture stands under the 2100 run, which clears
  // a 2150 carcass + 100 of drop... except it does not: 2100 < 2250. So the
  // honest assertion is the OTHER way round — it IS cut, and to the flat run's
  // own height, not to a chord across the cabinet.
  const left = partOf(build({
    end_panels: [{ id: 'ep', side: 'L', thickness: 18, height: 'floor' }],
    slope_cut: KNEE,
  }), 'END-PANEL');
  assert.equal(left.h, 2200, 'the FLAT run at 2100, plus its own 100 of drop');
  assert.equal(left.meta.slopeCut.angles[0].deg, 0, 'a level cut carries a level angle');
  assert.equal(slopeNoteText(left), '', 'and a level cut prints no CUT note');
});

test('F5 · an end panel clear of the ceiling keeps its full height', () => {
  const high = partOf(build({
    end_panels: EP_R,
    slope_cut: { pts: [{ x: 0, y: 4000 }, { x: 600, y: 3800 }], infill: 40 },
  }), 'END-PANEL');
  assert.equal(high.meta.slopeCut, undefined, 'a ceiling above the board cuts nothing');
});

// ─── F6 · THE SHAKER LEAF IS CUT WITH ITS DOOR ─────────────────────────────

test('F6 · a shaker under a slope keeps its recess, and the recess follows the cut', () => {
  const cut = frontOf(build({ front_type: 'S', slope_cut: STRAIGHT }));
  const pocket = (cut.cnc.pockets || [])[0];
  assert.ok(pocket, 'T46 named this debt: the leaf rendered a pentagon and lost its recess');
  assert.ok(Array.isArray(pocket.points), 'and the recess is a polygon, not a rectangle');
  assert.ok(pocket.points.length >= 4);
  assert.equal(cut.meta.shaker.frame, P.front.types.S.frameWidth, 'the profile’s own frame');
});

test('F6 · the recess follows the KNEE — five edges, not a chord across it', () => {
  const straight = (cut) => (frontOf(build({ front_type: 'S', slope_cut: cut })).cnc.pockets || [])[0];
  const one = straight(STRAIGHT);
  const bent = straight(KNEE);
  assert.ok(bent.points.length > one.points.length,
    'a bent ceiling puts more corners in the recess than a straight one');
  // The knee is at x = 200 in the ROOM; the leaf's sheet frame is the mirror,
  // so the recess bends somewhere strictly inside its own width.
  const xs = bent.points.map((q) => q[0]);
  assert.ok(Math.max(...xs) > Math.min(...xs));
  const knees = bent.points.filter((q) => q[0] > Math.min(...xs) + 1 && q[0] < Math.max(...xs) - 1);
  assert.ok(knees.length >= 1, 'and the bend is a VERTEX rather than a smear');
});

test('F6 · the rail is what gets shortened where the cut crosses one', () => {
  // A cut low enough to eat into the top rail leaves the rail SHORTER — the
  // recess's top boundary is the inset line — and never a half rail.
  const pocket = shakerCutPocket({
    w: 597, h: 2000, frame: 60, cut: { pts: [{ x: 0, y: 2000 }, { x: 597, y: 700 }] },
  }, P);
  assert.ok(pocket, 'still a shaker');
  const f = 60;
  for (const [x, y] of pocket.points) {
    // Every vertex of the recess is at least `frame` inside the leaf.
    assert.ok(x >= f - 1e-6 && x <= 597 - f + 1e-6, `x ${x} is inside the stiles`);
    assert.ok(y >= f - 1e-6, `y ${y} is above the bottom rail`);
  }
});

test('F6 · a frame that will not fit is REFUSED, not squeezed — T25’s law, unchanged', () => {
  // A 200 mm frame on a leaf that falls to 90 mm is two rails meeting.
  assert.equal(shakerCutPocket({
    w: 597, h: 2000, frame: 200, cut: { pts: [{ x: 0, y: 2000 }, { x: 597, y: 90 }] },
  }, P), null);
  const r = build({ front_type: 'S', shaker_frame_mm: 200, slope_cut: { pts: [{ x: 0, y: 2100 }, { x: 600, y: 200 }], infill: 40 } });
  assert.ok(r.warnings.some((w) => w.code === 'SHAKER_FRAME_TOO_WIDE'), 'and the cabinet says so');
});

test('F6 · a flat shaker is byte-identical — the pocket is the rectangle it always was', () => {
  const flat = frontOf(build({ front_type: 'S' }));
  const pocket = (flat.cnc.pockets || [])[0];
  assert.deepEqual(pocket, shakerPocket({
    w: flat.w, h: flat.h, frame: P.front.types.S.frameWidth,
  }, P), 'the same record, and no `points` on it at all');
  assert.equal(pocket.points, undefined);
});

test('F6 · the 3-D tray no longer refuses a cut leaf', () => {
  const src = readFileSync(new URL('../src/3d/shakerSolid.js', import.meta.url), 'utf8');
  assert.ok(!src.includes('if (panel?.cnc?.slopeCut) return null;'),
    'T46’s "a cut leaf is not a tray" is gone');
  assert.ok(src.includes('panel.cnc.outline.map(toMesh)'),
    'the board comes from the ENGINE’s own cut outline');
  assert.ok(src.includes('pocket.points.map(toMesh)'),
    'and the recess from the ENGINE’s own pocket — no second geometry');
  // A rectangle is the four-edge case of one walk, not a branch.
  assert.ok(!/if \(cut\) \{[\s\S]{0,400}?buildTray/.test(src), 'and there is one builder');
});

// ─── F7 · A HINGE THAT HAS NO DOOR GOES ────────────────────────────────────

test('F7 · a door the slope has shortened loses hinges, and the rest re-space', () => {
  const flat = frontOf(build({}));
  const cut = frontOf(build({ slope_cut: { pts: [{ x: 0, y: 1400 }, { x: 600, y: 900 }], infill: 40 } }));

  assert.equal(flat.meta.cupY, undefined, 'a full door carries the cabinet’s own ladder');
  const rows = cut.meta.cupY;
  assert.ok(Array.isArray(rows) && rows.length > 0);
  assert.equal(cut.meta.slopeCut.hinges.was, 6, 'six on the full door');
  assert.equal(cut.meta.slopeCut.hinges.now, rows.length);
  assert.ok(rows.length < 6, 'and fewer on this one');

  // RE-SPACED, not merely filtered: the top hinge is near the top of what is
  // LEFT of the leaf, not at the height it stood at on a 2150 door.
  const top = Math.max(...rows);
  assert.ok(top > cut.h - 200, `the top hinge (${top}) is at the top of a ${cut.h} leaf`);
  assert.ok(Math.min(...rows) <= P.hinges.endOffset + 1, 'and the bottom one is still at the bottom');
});

test('F7 · every cup still lands on the board, plate and all', () => {
  const cut = frontOf(build({ slope_cut: { pts: [{ x: 0, y: 1400 }, { x: 600, y: 900 }], infill: 40 } }));
  const margin = Number(P.hinges.cups.screwOffsetY) || 0;
  const stile = cut.meta.hinge === 'R' ? cut.meta.slopeCut.roomR : cut.meta.slopeCut.roomL;
  for (const y of cut.meta.cupY) {
    assert.ok(y >= 0, 'no cup below the leaf');
    assert.ok(y + margin <= stile + 1e-6, `a cup at ${y} + its plate is still on the ${stile} stile`);
  }
});

test('F7 · the hinges hang on the FULL-HEIGHT edge, which is where they are counted', () => {
  const cut = frontOf(build({ slope_cut: STRAIGHT }));
  assert.equal(cut.meta.hinge, 'L', 'the taller edge (T46-F4’s law)');
  assert.equal(cut.meta.hingeForced, true);
  // The ladder is run over THAT edge, not over the leaf's tallest point.
  assert.ok(Math.max(...cut.meta.cupY) < cut.meta.slopeCut.roomL);
});

test('F7 · a door somebody has drilled BY HAND still wins', () => {
  const own = [120, 900];
  const cut = frontOf(build({
    hinge_rows: own,
    slope_cut: { pts: [{ x: 0, y: 1400 }, { x: 600, y: 900 }], infill: 40 },
  }));
  assert.deepEqual(cut.meta.cupY, own, 'his list, not a ladder');
});

test('F7 · Check reports what was removed, per door', () => {
  const params = { ...WARDROBE, slope_cut: { pts: [{ x: 0, y: 1400 }, { x: 600, y: 900 }], infill: 40 } };
  const result = computeCabinet(params, P);
  const unit = { id: 'u1', type: 'WARDROBE', params, position: { wall: 0, x_mm: 0 } };
  const rows = runChecks({ entries: [{ unit, result }], profile: P }).filter((f) => f.check === 21);
  assert.equal(rows.length, 1, 'one door, one finding');
  assert.equal(rows[0].level, 'yellow', 'a notice: the app did the right thing and is saying so');
  assert.match(rows[0].message, /took \d+ hinges? off this door/);
  assert.match(rows[0].message, /6 became \d+/);
  assert.equal(rows[0].hingesWas, 6);
});

test('F7 · a flat door raises nothing at all', () => {
  const params = { ...WARDROBE };
  const result = computeCabinet(params, P);
  const unit = { id: 'u1', type: 'WARDROBE', params, position: { wall: 0, x_mm: 0 } };
  assert.deepEqual(runChecks({ entries: [{ unit, result }], profile: P }).filter((f) => f.check === 21), []);
});

// ─── F8 · LISP IS LAW: THE KITS LEARN THE SLOPE ────────────────────────────

// ─── UPDATED BY T52 (CLAUDE.md F5) ─────────────────────────────────────────
// The shelf grew a fourteenth file: `KIT_WATCH_DRAWER.lsp`, the watch drawer's
// insert, born in the LISP before any JS exactly as iron rule 3 asks. The
// COUNT is not the assertion — every file balancing at 0/0 is — so it is
// derived from the folder rather than typed, and a fifteenth kit needs no edit
// here.
test('F8 · every kit, every zero', () => {
  const rows = balanceOfKits();
  assert.ok(rows.length >= 13, `${rows.length} files under reference/lisp/`);
  for (const r of rows) {
    assert.equal(r.balance, 0, `${r.name} is ${r.balance} out`);
    assert.equal(r.negativeAt, null, `${r.name} has a stray ) at line ${r.negativeAt}`);
  }
});

test('F8 · the reader itself is honest about what a paren is', () => {
  assert.equal(parenBalance('(a (b))').balance, 0);
  assert.equal(parenBalance('(a ; ) a comment\n)').balance, 0, 'a comment is prose');
  assert.equal(parenBalance('(a ")" )').balance, 0, 'and so is a string');
  assert.equal(parenBalance(')(').negativeAt, 1, 'a stray ) is found even when the count balances');
});

test('F8 · SKY:slopeOn is defined once, and only SKYLON_COMMON.lsp calls it', () => {
  const census = routineCensus();
  assert.deepEqual(census.defined, [T50_KIT], `${T50_ROUTINE} is ${T50_KIT}’s alone`);
  assert.deepEqual(census.callers, [T50_KIT]);
  assert.deepEqual(routineFaults(census), []);
});

test('F8 · …and the gate is INSIDE drawBUL and drawBUR, on both blocks the law names', () => {
  assert.deepEqual(gateFaults(), []);
  const lisp = readFileSync(new URL('../reference/lisp/SKYLON_COMMON.lsp', import.meta.url), 'utf8');
  for (const routine of T50_GATED) {
    const at = lisp.indexOf(`(defun ${routine} `);
    const body = lisp.slice(at, lisp.indexOf('\n(defun ', at + 1));
    assert.equal((body.match(/\(if \(not \(SKY:slopeOn\)\)/g) || []).length, 2,
      `${routine}: the TOP sockets and the TOP screw row, which is what the law names`);
    // The BOTTOM edge is untouched — it screws into a panel that is there
    // whatever the ceiling does.
    assert.match(body, /;; Puzzle sockets - BOTTOM edge\n {2}\(drawRect "PUZZLE_SOCKET"/);
  }
});

test('F8 · the switch defaults to OFF, so a kit that never sets it draws what it always drew', () => {
  const lisp = readFileSync(new URL('../reference/lisp/SKYLON_COMMON.lsp', import.meta.url), 'utf8');
  assert.match(lisp, /\(defun SKY:slopeOn \(\)\n\s+\(and \(boundp '\*SKY:SLOPE-PTS\*\)/,
    'an unbound variable is not an error, it is "nobody has said"');
  assert.match(lisp, /\(defun SKY:setSlope \(pts\)/);
  assert.match(lisp, /\(defun SKY:clearSlope \(\)/, 'and there is a way back to flat');
});

test('F8 · only SKYLON_COMMON.lsp is on this turn’s list', () => {
  assert.deepEqual(T50_LISP_FILES, ['SKYLON_COMMON.lsp']);
});

test('F8 · the application already obeyed the law, and still does', () => {
  // The kit-level gate closes a gap; it does not change what the app cuts. A
  // carcass under a roof drills no top socket and no top screw, which is what
  // `sideCnc` has done since the 25.08 chat-fix.
  const src = readFileSync(new URL('../src/engine/cabinet.js', import.meta.url), 'utf8');
  assert.ok(src.includes("{ ...sideEdges, topSocket: false, topScrews: false }"),
    'the two flags the LISP gate now mirrors');
});
