// Hypothesis: an L born in one corner and MOVED to the other corner (the hand
// flips in the store) is not the mirror of an L born there.
import { computeCabinet } from '../../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { rectCorners } from '../../src/engine/room.js';
import { useProjectStore, paramsForEngine } from '../../src/stores/projectStore.js';
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const GAP = P.room.wallBackClearance;
const r4 = (x) => Math.round(x * 1e4) / 1e4; const swap = { BUL: 'BUR', BUR: 'BUL' };
const keyOf = (W) => (p, m) => { const bx = p.box || p; return `${m ? (swap[p.part] || p.part) : p.part} x=${m ? r4(W - bx.x - bx.w) : r4(bx.x)} y=${r4(bx.y)} z=${r4(bx.z)} w=${r4(bx.w)} h=${r4(bx.h)} d=${r4(bx.d)}`; };
const compare = (label, left, right, W) => {
  const key = keyOf(W);
  const rm = new Set(right.panels.map((p) => key(p, true))), lk = new Set(left.panels.map((p) => key(p, false)));
  const lo = [...lk].filter((k) => !rm.has(k)), ro = [...rm].filter((k) => !lk.has(k));
  console.log(`${label}: panels ${left.panels.length}/${right.panels.length} ${lo.length + ro.length ? 'MIRROR BROKEN ' + (lo.length + ro.length) : 'MIRROR OK'}`);
  lo.slice(0, 12).forEach((k) => console.log('   LEFT only :', k)); ro.slice(0, 12).forEach((k) => console.log('   RIGHT only:', k));
};
const params = { doors: true, shelves: 2 };
// Scenario 1: born left (first L), a fresh right L beside it, then MOVE the left one to... cannot (right taken). So: born left alone, moved right, vs fresh right.
S().newProject(); S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
const a = S().addUnit('CORNER_L_WARDROBE', { params }); const ua0 = U(a.id); const W = Number(ua0.params.width);
console.log('born:', JSON.stringify(ua0.position), ua0.params.corner_side);
const mv = S().moveUnit(a.id, 4000 - GAP - W, 0, { magnet: false });
const ua1 = U(a.id);
console.log('after move:', JSON.stringify(ua1.position), ua1.params.corner_side, 'result', JSON.stringify(mv).slice(0, 120));
S().newProject(); S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
S().addUnit('CORNER_L_WARDROBE', { params }); // occupies left
const b = S().addUnit('CORNER_L_WARDROBE', { params }); const ub = U(b.id);
console.log('fresh right:', JSON.stringify(ub.position), ub.params.corner_side);
const Rmoved = computeCabinet(paramsForEngine(ua1), P); const Rfresh = computeCabinet(paramsForEngine(ub), P);
const same = JSON.stringify(Rmoved.panels.map((p) => keyOf(W)(p, false))) === JSON.stringify(Rfresh.panels.map((p) => keyOf(W)(p, false)));
console.log('moved-right vs fresh-right identical:', same);
if (!same) compare('moved-right(as left) vs fresh-right', Rmoved, Rfresh, W);
const diffs = Object.keys({ ...ua1.params, ...ub.params }).filter((k) => JSON.stringify(ua1.params[k]) !== JSON.stringify(ub.params[k]));
console.log('param diffs moved vs fresh:', diffs.map((k) => `${k}: ${JSON.stringify(ua1.params[k])} | ${JSON.stringify(ub.params[k])}`).join('\n  '));
// Scenario 2: resize after birth (width 1200, depth 1000) on both hands
S().newProject(); S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
const c = S().addUnit('CORNER_L_WARDROBE', { params }); const d = S().addUnit('CORNER_L_WARDROBE', { params });
S().updateUnitParams?.(c.id, { width: 1200, depth: 1000 }); S().updateUnitParams?.(d.id, { width: 1200, depth: 1000 });
const uc = U(c.id), ud = U(d.id);
console.log('resized:', uc.params.width, uc.params.depth, uc.params.corner_side, '|', ud.params.width, ud.params.depth, ud.params.corner_side, 'pos', JSON.stringify(uc.position), JSON.stringify(ud.position));
compare('resized left vs right', computeCabinet(paramsForEngine(uc), P), computeCabinet(paramsForEngine(ud), P), Number(uc.params.width));
