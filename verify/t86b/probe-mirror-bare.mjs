// B1 probe (30.10.2026): is the LEFT corner L the mirror of the RIGHT one?
// Compares every panel of the left hand with the right hand mirrored in x.
import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

const type = process.argv[2] || 'CORNER_L_WARDROBE';
const over = JSON.parse(process.argv[3] || '{}');
const base = { ...defaultParamsFor(type, P), unit_num: 'CL01', doors: true, shelves: 2, ...over };
const R = computeCabinet({ ...base, corner_side: 'right' }, P);
const L = computeCabinet({ ...base, corner_side: 'left' }, P);
const W = Number(base.width);
const r4 = (v) => Math.round(v * 10000) / 10000;
const swap = { BUL: 'BUR', BUR: 'BUL' };
const key = (p, mirrored) => {
  const b = p.box || p;
  const x = mirrored ? r4(W - b.x - b.w) : r4(b.x);
  const part = mirrored ? (swap[p.part] || p.part) : p.part;
  return `${part} x=${x} y=${r4(b.y)} z=${r4(b.z)} w=${r4(b.w)} h=${r4(b.h)} d=${r4(b.d)}`;
};
console.log(`type ${type} W=${W} D=${base.depth} H=${base.height} arm=${base.arm_mm}`);
console.log(`warnings R: ${R.warnings.map((w) => w.code).join(',') || 'none'} | L: ${L.warnings.map((w) => w.code).join(',') || 'none'}`);
console.log(`panels R=${R.panels.length} L=${L.panels.length}`);
const rightMirrored = new Map(R.panels.map((p) => [key(p, true), p]));
const leftKeys = new Map(L.panels.map((p) => [key(p, false), p]));
let miss = 0;
for (const [k, p] of leftKeys) {
  if (!rightMirrored.has(k)) { miss++; console.log(`LEFT has, mirrored RIGHT lacks: ${p.id.padEnd(14)} ${k}`); }
}
for (const [k, p] of rightMirrored) {
  if (!leftKeys.has(k)) { miss++; console.log(`mirrored RIGHT has, LEFT lacks:  ${p.id.padEnd(14)} ${k}`); }
}
console.log(miss === 0 ? 'MIRROR OK' : `MIRROR BROKEN: ${miss} rows differ`);
