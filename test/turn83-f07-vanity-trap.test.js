/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F7 . THE TRAP'S U AT TWO COLUMNS WITH ONE BASIN
//
// The owner, 25.10.2026 (22:41): *"nie ma wyciecia na U na sinki nawet jak je
// wlacze ... jest wyciecie jak jest 1 szuflada ale nie jak sa 2 szuflady a
// mamy jeden sink, albo mam pomysl: zmniejszmy szuflady na szerokosc, tylko
// fronty zostawmy szerokie i pomiedzy szufladami zrobi sie miejsce na syfon
// (tylko gorna row)"*.
//
// PROBE (verify/t83/f07-probe.md): at columns 2 with one basin the waste at
// W / 2 stood inside the DIVIDER, no box took it, no U was cut and #39 said
// "The trap stands over the divider". The columns rule fixes NO shelf over the
// stacks (the TOP is the board over both, D10), and `vanity.trapClearMm` is
// already #39's shallow-trap 60, so the 20 takes its own key.
//
// LISP FIRST: reference/lisp/KIT_VANITY.lsp D28 (D10, D11, D17, D21 amended):
// `vanity-trap-gap`, `vanity-gap-box`, `vanity-gap-of`, `vanity-boxes-cut`,
// `vanity-divider-cut`, the GAP of `vanity-trap-plan` and the RUNNERS of
// `vanity-trap-verdict`. The engine mirrors it (`engine/vanity.js
// vanityTrapGap`, `vanityGapBox`, `vanityGapOf`; `cabinet.js` the narrowed top
// boxes and the short divider; `hardware3d.js` the runners on their own box).
//
// CLAUDE.md F7's test: VANITY3 at columns 2, sinks 1: the divider's height, the
// two top boxes' widths, the gap 200 between them centred on W / 2, the
// fronts' widths unchanged, the runners' positions; sinks 2: two U cuts as
// T82; columns 1: the U as T82.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import {
  vanityBoxesOf, vanityGapBox, vanityGapOf, vanitySpec, vanityTrapGap,
} from '../src/engine/vanity.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { rectCorners } from '../src/engine/room.js';
import { confirmDrawerBox } from './drawer-box-gate.js';
import { goldenOf } from '../scripts/t75-golden.mjs';
import { loadLisp } from './lisp-mini.js';
import { parenBalance } from '../scripts/t57-paren-balance.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const TEXT = readFileSync(`${ROOT}reference/lisp/KIT_VANITY.lsp`, 'utf8');
const L = loadLisp(TEXT);
const PROSE = TEXT.split('\n').map((l) => l.replace(/^;;;\s?/, '')).join(' ').replace(/\s+/g, ' ');
const say = (s) => assert.ok(PROSE.includes(s), `the kit states: ${s}`);
const OWNER = 'zmniejszmy szuflady na szerokosc, tylko fronty zostawmy szerokie i pomiedzy szufladami zrobi sie '
  + 'miejsce na syfon (tylko gorna row)';

const G = P.board.thickness;
const GB = P.wardrobe.drawers.boxSideThickness;
const EX = [900, 600, 500, G, GB, P.front.thickness];
const VD = P.vanity.serviceVoidMm;
const kit = (id, extra = {}) => computeCabinet({ ...defaultParamsFor(id, P), unit_num: 'VU01', ...extra }, P);
const byId = (r, id) => r.panels.find((p) => p.id === id);
const S = () => useProjectStore.getState();
const RUNNERS_SAID = 'The trap stands in the gap between the top drawers: no wall carries their two inner runners';
const DIVIDER_SAID = 'The trap stands over the divider: no top drawer can take its U';
const trapSaid = (r) => r.warnings.filter((w) => w.code === 'VANITY_TRAP');
/** The outer faces of a box tag's two sides: [left, right]. */
const faces = (r, tag) => [byId(r, `${tag}-SL`).box.x, byId(r, `${tag}-SR`).box.x + byId(r, `${tag}-SR`).box.w];

// === THE LISP, FIRST =========================================================

test('F7 . KIT_VANITY.lsp: D28 in the owner\'s words, the amended notes, balanced, ASCII, no dash', () => {
  const b = parenBalance(TEXT);
  assert.equal(b.balance, 0);
  assert.equal(b.negativeAt, null);
  assert.ok(/^[\x00-\x7F]*$/.test(TEXT), 'ASCII');
  assert.doesNotMatch(TEXT, /[\u2013\u2014]/, 'no em or en dash');
  say(`D28 THE TRAP'S GAP (CONFIRMED 22:41 "${OWNER}"; the 20 a side PROPOSED, vanityTrapGapClear).`);
  say('nie ma wyciecia na U na sinki nawet jak je wlacze ... jest wyciecie jak jest 1 szuflada ale nie jak sa 2 szuflady a mamy jeden sink');
  say('AMENDED 25.10.2026 (T83 F7, D28): in the vanity with ONE basin the top row\'s two boxes are narrowed to the trap\'s gap (vanity-boxes-cut).');
  say('AMENDED 25.10.2026 (T83 F7, D28): under the trap\'s gap it stops at the top row\'s runner underside, a SHORT DIVIDER (vanity-divider-cut)');
  say('AMENDED 25.10.2026 (T83 F7): the vanity cuts the trap\'s gap there now (D28); the sentence stays for a unit too narrow for the gap.');
  say('no fixed shelf and no rail is cut');
  for (const r of ['vanity-trap-gap', 'vanity-gap-box', 'vanity-gap-fits-p', 'vanity-gap-of', 'vanity-boxes-cut',
    'vanity-divider-cut', 'vanity-trap-shallow']) assert.ok(L.has(r), `${r} defined`);
});

test('F7 . the 20 is its own PROPOSED key, the LISP\'s constant: #39\'s shallow-trap 60 stays where it was', () => {
  assert.equal(P.vanity.trapGapClearMm, 20);
  assert.equal(L.call('vanityTrapGapClear'), P.vanity.trapGapClearMm);
  assert.equal(P.vanity.trapClearMm, 60, 'the probe\'s name clash: the shallow-trap air is not moved');
  assert.match(TEXT, /^;; profile\.vanity\.trapGapClearMm\s+PROPOSED/m);
  const src = readFileSync(`${ROOT}src/engine/profile.js`, 'utf8');
  assert.ok(src.includes('trapGapClearMm: 20,'));
  assert.ok(src.includes('T83 F7 · PROPOSED (CLAUDE.md T83 F7 "160 / 2 + 20 PROPOSED"'), 'profile.js says the source beside the number');
  assert.equal(vanitySpec(P).trapGapClearMm, 20);
});

test('F7 . the LISP\'s worked case: the gap 350..550, the top boxes 327 at 23 and 550, the short divider 382', () => {
  assert.deepEqual(L.call('vanity-trap-gap', 900, 2, 1), [350, 550]);
  assert.equal(L.call('vanity-trap-gap', 900, 2, 2), null, 'two basins: T82\'s road');
  assert.equal(L.call('vanity-trap-gap', 900, 1, 1), null, 'one column: T82\'s U');
  const cut = L.call('vanity-boxes-cut', ...EX, 3, 2, 1, VD);
  const top = cut.filter((b) => b[1] === 3);
  assert.deepEqual(top.map((b) => [b[0], b[2], b[3]]), [[1, 23, 327], [2, 550, 327]]);
  assert.deepEqual(top.map((b) => [L.call('vanity-box-len', b, GB), L.call('vanity-box-bottom-w', b, GB)]), [[291, 304], [291, 304]]);
  // Only the top row ("tylko gorna row"): every other box is vanity-boxes'.
  const whole = L.call('vanity-boxes', ...EX, 3, 2, VD);
  assert.deepEqual(cut.filter((b) => b[1] !== 3), whole.filter((b) => b[1] !== 3));
  assert.deepEqual(L.call('vanity-divider-cut', ...EX, 3, 2, 1), ['DIVIDER', 441, 18, 18, 18, 382, 482]);
  assert.deepEqual(L.call('vanity-divider-cut', ...EX, 3, 2, 2), L.call('vanity-divider', 900, 600, 500, G, 2), 'two basins: the divider of D11');
  assert.deepEqual(L.call('vanity-trap-plan', ...EX, 3, 2, 1).map((e) => e[3]), ['GAP']);
  assert.equal(L.call('vanity-trap-us', ...EX, 3, 2, 1), null, 'no U where there is air');
  assert.deepEqual(L.call('vanity-trap-verdict', ...EX, 3, 2, 1), [['RUNNERS', 450, `#39 ${RUNNERS_SAID}`]]);
  say('ONE BASIN ON TWO COLUMNS (T83 F7, D28). The trap\'s gap 350..550, 200 centred on the waste at 450; the top boxes Z1D3 at x 23 and Z2D3 at x 550, 327 wide, walls 291, bottoms 304; the fronts 447 at x 1.5 and 451.5 as before; the SHORT DIVIDER at x 441, 18 x 382 x 482 from y 18 and z 18, to the top row\'s runner underside at 400, carrying the runner rows at 56 and 238; no U;');
  say('the trap\'s bottom line 428.5, the box under it tops at 351.5: 77 of air, no shallow trap.');
  // A unit too narrow for the gap keeps D17.
  assert.equal(L.call('vanity-gap-of', L.call('vanity-boxes', 300, 600, 500, G, GB, 25, 3, 2, VD), 300, 3, 2, 1, GB), null);
  assert.deepEqual(L.call('vanity-trap-verdict', 300, 600, 500, G, GB, 25, 3, 2, 1), [['DIVIDER', 150, `#39 ${DIVIDER_SAID}`]]);
  // The chest: no basin, no gap.
  assert.equal(L.call('vanity-gap-of', L.call('vanity-boxes', 800, 647, 568, G, GB, 25, 3, 2, 0), 800, 3, 2, null, GB), null);
});

// === THE ENGINE MIRRORS IT ===================================================

test('F7 . VANITY3 columns 2, sinks 1: the short divider from the bottom to the top row\'s runner underside', () => {
  const r = kit('VANITY3', { columns: 2, sinks: 1 });
  const dv = byId(r, 'DIVIDER');
  const runnerBottom = r.drillSummary.runner_bottoms_carcass_y[2];
  assert.equal(runnerBottom, 400, 'the top row\'s runner underside');
  assert.deepEqual([dv.box.x, dv.box.y, dv.box.z, dv.box.w, dv.box.h, dv.box.d], [441, 18, 18, 18, 382, 482]);
  assert.equal(dv.box.y + dv.box.h, runnerBottom, 'it stops under the top row');
  assert.equal(dv.w, 382, 'the cut length is the short divider\'s');
  assert.equal(dv.meta.fullHeight, false);
  const L1 = L.call('vanity-divider-cut', ...EX, 3, 2, 1);
  assert.deepEqual([dv.box.x, dv.box.y, dv.box.z, dv.box.w, dv.box.h, dv.box.d], L1.slice(1), 'the LISP\'s divider');
  // Its head stands free under the gap: no board of the columns rule spans the stacks under the TOP.
  const head = (r.derived.dividerJoints || []).find((j) => j.divider === 'DIVIDER' && j.end === 'head');
  assert.equal(head?.receiver ?? null, null, 'the head in the air: no fixed shelf, no rail (the probe\'s row 12)');
  const foot = (r.derived.dividerJoints || []).find((j) => j.divider === 'DIVIDER' && j.end === 'foot');
  assert.equal(foot?.receiver, 'BOTTOM');
  assert.ok(dv.box.y + dv.box.h < byId(r, 'Z1D3-DNO').box.y, 'under the trap\'s bottom line (428.5)');
});

test('F7 . the two top boxes narrowed toward the centre, a 200 gap centred on W / 2; their fronts unchanged', () => {
  const W = 900;
  const r = kit('VANITY3', { columns: 2, sinks: 1 });
  const ref = kit('VANITY3', { columns: 2, sinks: 0 });
  const [a0, a1] = faces(r, 'Z1D3');
  const [b0, b1] = faces(r, 'Z2D3');
  assert.deepEqual([a0, a1, b0, b1], [23, 350, 550, 877]);
  assert.equal(b0 - a1, 200, 'the gap between them: 160 / 2 + 20 each side');
  assert.equal((a1 + b0) / 2, W / 2, 'centred on W / 2, the waste');
  assert.deepEqual(r.derived.vanity.trap.gap, [350, 550]);
  assert.deepEqual(vanityTrapGap({ W, columns: 2, sinks: 1 }, P), [350, 550]);
  for (const tag of ['Z1D3', 'Z2D3']) {
    assert.equal(byId(r, `${tag}-BF`).w, 291, `${tag}: the walls follow the width`);
    assert.equal(byId(r, `${tag}-BB`).w, 291);
    assert.equal(byId(r, `${tag}-DNO`).w, 304, 'the bottom 13 longer, the parent\'s law');
    for (const s of ['SL', 'SR']) assert.equal(byId(r, `${tag}-${s}`).meta.trapGap, true);
  }
  // The fronts are the pair's, wide, as the columns rule has them: every front the same as with no basin.
  const fr = (x) => x.panels.filter((p) => p.part === 'DRAWER-FRONT').map((p) => [p.id, p.box.x, p.w, p.h]);
  assert.deepEqual(fr(r), fr(ref));
  assert.deepEqual([...new Set(fr(r).map((f) => f[2]))], [447]);
  // Only the top row: the lower boxes are what columns 2 cuts with no basin, board for board.
  const lower = (x) => x.panels.filter((p) => p.role === 'drawer_box' && !/D3-/.test(p.id))
    .map((p) => [p.id, p.box, p.w, p.h]);
  assert.deepEqual(lower(r), lower(ref));
  // The engine's boxes are the LISP's, tuple for tuple.
  const eng = vanityBoxesOf(r.panels, { n: 3, columns: 2 }).map((b) => [b.col, b.idx, b.x0, b.bw, b.side, b.base, b.depth, b.zBack]);
  assert.deepEqual(eng, L.call('vanity-boxes-cut', ...EX, 3, 2, 1, VD));
  assert.deepEqual(vanityGapBox({ col: 1, x0: 23, bw: 413 }, [350, 550]), { col: 1, x0: 23, bw: 327 });
});

test('F7 . the trap stands in the air: no U in either box, #39 says the inner runners have no wall', () => {
  const r = kit('VANITY3', { columns: 2, sinks: 1 });
  assert.equal(r.panels.filter((p) => /-BB-\d+$/.test(p.id)).length, 0, 'no back wall cut into pieces');
  assert.ok(!r.panels.some((p) => p.meta?.vanityTrap), 'no notch anywhere');
  assert.deepEqual(r.derived.vanity.trap.cuts, []);
  assert.deepEqual(trapSaid(r).map((w) => [w.kind, w.message]), [['RUNNERS', RUNNERS_SAID]]);
  assert.ok(!trapSaid(r).some((w) => w.message === DIVIDER_SAID), 'the probe\'s "over the divider" is gone');
  // The shallow-trap air stays for the second row as before: 428.5 - 351.5 = 77, nothing said.
  assert.equal(byId(r, 'Z1D3-DNO').box.y - (byId(r, 'Z1D2-SL').box.y + byId(r, 'Z1D2-SL').box.h), 77);
  // A shallow stack says it, as T82 did for one column.
  const tight = kit('VANITY4', { columns: 2, sinks: 1, height: 560 });
  assert.ok(trapSaid(tight).some((w) => w.kind === 'SHALLOW' && /59 mm under the trap's bottom, 60 wanted/.test(w.message)));
  assert.deepEqual(trapSaid(tight).map((w) => [w.kind, `#39 ${w.message}`]),
    L.call('vanity-trap-verdict', 900, 560, 500, G, GB, 25, 4, 2, 1).map((e) => [e[0], e[2]]));
});

test('F7 . the runners move with the boxes: the room\'s pairs on the narrowed sides, the short divider drilled below', () => {
  const r = kit('VANITY3', { columns: 2, sinks: 1 });
  const runs = hardwareInstances(r, P).runners;
  const at = (drawer) => runs.filter((x) => x.drawer === drawer).map((x) => [x.side, x.x]);
  assert.deepEqual(at(3), [['L', 23], ['R', 350]], 'column 1\'s top pair on its own box');
  assert.deepEqual(at(6), [['L', 550], ['R', 877]], 'column 2\'s top pair');
  assert.deepEqual(at(2), [['L', 23], ['R', 436]], 'the rows below as T82 put them');
  assert.deepEqual(at(5), [['L', 464], ['R', 877]]);
  // The divider carries only the rows below the top one (its own frame: 38 and 220).
  assert.deepEqual(r.drillSummary.divider_runner_rows_y, [38, 220]);
  const dvRows = [...new Set(r.drills.filter((d) => d.panel === 'DIVIDER' && d.kind === 'runner').map((d) => d.y))].sort((p, q) => p - q);
  assert.deepEqual(dvRows, [38, 220]);
  for (const side of ['BUL', 'BUR']) {
    const rows = [...new Set(r.drills.filter((d) => d.panel === side && d.kind === 'runner').map((d) => d.y))].sort((p, q) => p - q);
    assert.deepEqual(rows, [56, 238, 438], `${side}: the outer runners of every row`);
  }
  // The order is the same six pairs: one per box.
  const pairs = r.hardware.find((h) => h.role === 'runner_pairs');
  assert.equal(pairs.qty, 6);
  // Each top front's screws keep their distance from their OWN box's side, as every row's.
  const ref = kit('VANITY3', { columns: 2, sinks: 0 });
  for (const [front, tag] of [['VU01-Z1D3-F', 'Z1D3'], ['VU01-Z2D3-F', 'Z2D3']]) {
    const f = byId(r, front);
    const lo = byId(ref, front.replace('D3', 'D2'));
    const off = (x, t) => {
      const [l, rr] = faces(x, t);
      const hs = (x === r ? f : lo).cnc.holes.map((h) => (x === r ? f : lo).box.x + h.x);
      return [hs[0] - l, rr - hs[1]];
    };
    assert.deepEqual(off(r, tag), off(ref, tag.replace('D3', 'D2')), `${front}: the screw off its own box side`);
  }
});

test('F7 . sinks 2 on two columns: a U in each column\'s top box, as T82; columns 1: the U as T82', () => {
  const two = kit('VANITY3', { columns: 2, sinks: 2 });
  assert.equal(byId(two, 'DIVIDER').box.h, 564, 'the divider of D11, under the TOP');
  assert.equal(byId(two, 'DIVIDER').meta.fullHeight, true);
  assert.deepEqual(two.derived.vanity.trap.cuts.map((c) => [c.tag, c.us]), [
    ['Z1D3', [{ from: 145, to: 305 }]], ['Z2D3', [{ from: 595, to: 755 }]],
  ]);
  assert.equal(two.derived.vanity.trap.gap, undefined);
  assert.deepEqual(faces(two, 'Z1D3'), [23, 436], 'no box narrowed');
  const one = kit('VANITY3', { columns: 1, sinks: 1 });
  assert.deepEqual(one.derived.vanity.trap.cuts.map((c) => [c.tag, c.us, c.pieces]), [
    ['D3', [{ from: 370, to: 530 }], ['D3-BB-1', 'D3-BB-2']],
  ]);
  assert.ok(!byId(one, 'DIVIDER'));
  assert.ok(!one.panels.some((p) => p.meta?.trapGap));
});

test('F7 . a vanity too narrow for the gap keeps the divider and D17\'s words; the chest is untouched', () => {
  const narrow = kit('VANITY3', { columns: 2, sinks: 1, width: 300 });
  assert.equal(narrow.derived.vanity.trap.gap, undefined);
  assert.equal(byId(narrow, 'DIVIDER').box.h, 564);
  assert.deepEqual(trapSaid(narrow).map((w) => w.message), [DIVIDER_SAID]);
  assert.equal(vanityGapOf({
    W: 300, columns: 2, sinks: 1, GB, tops: [{ col: 1, x0: 23, bw: 113 }, { col: 2, x0: 164, bw: 113 }],
  }, P), null);
  // The chest of drawers at two columns carries no basin and no gap: its full divider, no trapGap anywhere.
  const chest = kit('WARDROBE_CHEST3', { columns: 2, drawer_split: 'equal', sinks: 1 });
  assert.ok(!chest.panels.some((p) => p.meta?.trapGap));
  assert.equal(byId(chest, 'DIVIDER').meta.fullHeight, true);
});

test('F7 . the CNC files are the cut boards: the narrowed walls and bottoms 291 and 304, the short divider 382', () => {
  const r = kit('VANITY3', { columns: 2, sinks: 1 });
  const files = buildUnitDxfFiles(r, P);
  const names = files.map((f) => String(f.name || f.filename || f.path || ''));
  for (const id of ['Z1D3-BB', 'Z2D3-BF', 'Z1D3-DNO', 'DIVIDER']) {
    assert.ok(names.some((n) => n.includes(id)), `${id} has its DXF`);
  }
  assert.deepEqual([byId(r, 'Z1D3-BB').cnc.drawn_h, byId(r, 'Z1D3-DNO').cnc.drawn_w ?? byId(r, 'Z1D3-DNO').w], [291, 304]);
  assert.equal(byId(r, 'DIVIDER').cnc.drawn_h, 382);
});

test('F7 . by the road the client clicks: columns 2 and sinks 1 on a born vanity, the Check says #39 RUNNERS', () => {
  S().newProject('T83 F7');
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  confirmDrawerBox();
  const { id } = S().addUnit('VANITY3', { wall: 0, x: 1000 });
  S().updateUnitParams(id, { columns: 2, sinks: 1 });
  const found = S().runChecks().filter((f) => f.check === 39 && f.unitId === id);
  assert.deepEqual(found.map((f) => [f.level, f.trap, f.message]), [['yellow', 'RUNNERS', `VU01: ${RUNNERS_SAID}`]]);
  // Saved and reloaded the gap is the params' (columns, sinks): no key of its own is written.
  const u = S().units.find((x) => x.id === id);
  assert.deepEqual(Object.keys(u.params).filter((k) => /gap/i.test(k) && k !== 'wall_gap'), []);
});

test('F7 . the new golden: VANITY3 columns 2, sinks 1, as the cut stands it (verify/t83/goldens)', () => {
  const file = `${ROOT}verify/t83/goldens/golden-vanity3-columns2-sinks1.json`;
  const golden = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(golden.params.type, 'VANITY3');
  assert.deepEqual([golden.params.columns, golden.params.sinks], [2, 1]);
  assert.deepEqual(goldenOf(golden.params), golden.expected, 'byte for byte the cut');
});
