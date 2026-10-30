import { computeCabinet } from '../../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { rectCorners } from '../../src/engine/room.js';
import { useProjectStore, paramsForEngine } from '../../src/stores/projectStore.js';
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const GAP = P.room.wallBackClearance;
const variants = [
  { doors: true },
  { doors: true, shelves: 3 },
  { doors: true, drawers: 2 },
  { doors: true, width: 1200, depth: 1000 },
];
for (const v of variants) {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const a = S().addUnit('CORNER_L_WARDROBE', { params: v });
  const ua = U(a.id); const W = Number(ua.params.width);
  const b = S().addUnit('CORNER_L_WARDROBE', { wall: 0, x: 4000 - GAP - W, params: v });
  const ub = U(b.id);
  if (!ua || !ub) { console.log(JSON.stringify(v), 'refused', a, b); continue; }
  const L = computeCabinet(paramsForEngine(ua), P), R = computeCabinet(paramsForEngine(ub), P);
  const r4 = (x) => Math.round(x * 1e4) / 1e4; const swap = { BUL: 'BUR', BUR: 'BUL' };
  const key = (p, m) => { const bx = p.box || p; return `${m ? (swap[p.part] || p.part) : p.part} x=${m ? r4(W - bx.x - bx.w) : r4(bx.x)} y=${r4(bx.y)} z=${r4(bx.z)} w=${r4(bx.w)} h=${r4(bx.h)} d=${r4(bx.d)}`; };
  const rm = new Set(R.panels.map((p) => key(p, true))), lk = new Set(L.panels.map((p) => key(p, false)));
  const miss = [...lk].filter((k) => !rm.has(k)).length + [...rm].filter((k) => !lk.has(k)).length;
  console.log(JSON.stringify(v), `sides L/R ${ua.params.corner_side}/${ub.params.corner_side}`, `panels ${L.panels.length}/${R.panels.length}`, `warn L ${L.warnings.map((w)=>w.code).join(',')||'-'} R ${R.warnings.map((w)=>w.code).join(',')||'-'}`, miss ? `MIRROR BROKEN ${miss}` : 'MIRROR OK');
  if (miss) { for (const k of lk) if (!rm.has(k)) console.log('  L only:', k); for (const k of rm) if (!lk.has(k)) console.log('  R only:', k); }
}
