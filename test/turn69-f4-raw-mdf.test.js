// ─── TURN 69 · F4 — RAW MDF, THE UNPAINTED FINISH ──────────────────────────
//
// CLAUDE.md, F4, verbatim:
//
//   *"Fourth front source: **RAW (unpainted MDF)** — applies to FRONTS, END
//   PANELS and PLINTH; **the carcass never** (it keeps its decor). No colour
//   picker — choosing RAW ends the choice. Thicknesses unchanged; only the
//   finish differs."*
//   *"3D material … warm beige-brown with the olive undertone, matte, zero
//   grain, uniform; the shaker frame/edge LIGHTER cream against the field …
//   High roughness, no sheen."*
//   *"One sentence at the choice … Estimate and REVIEW name it."*

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getCabinetProfile } from '../src/engine/profile.js';
import { carcassSources, frontSources, pickerForSource } from '../src/engine/projectSettings.js';
import { resolveFinishes } from '../src/engine/design.js';
import { materialSlotOf, resolvePanelMaterial } from '../src/engine/materials.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { surfaceFor, outlineFor } from '../src/3d/materials.js';
import * as A from '../src/retail/design/adapter.js';
import { describeDesign } from '../src/retail/estimate/document.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const S = () => useProjectStore.getState();
const P = () => getCabinetProfile();

function job({ raw = true } = {}) {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 1000, height: 2000, depth: 600 } });
  S().updateUnitParams(id, { width: 1000, height: 2000 });
  if (raw) A.setMaterialSource('front', 'raw');
  return id;
}
const unitOf = (id) => S().units.find((u) => u.id === id);

// ═══ 1 · THE SOURCE ═════════════════════════════════════════════════════════

test('F4 · RAW is a FRONT source and the carcass has never heard of it', () => {
  const fronts = frontSources(P()).map((s) => s.id);
  assert.ok(fronts.includes('raw'), 'RAW is not offered on the fronts');
  assert.ok(!carcassSources(P()).map((s) => s.id).includes('raw'),
    'RAW reached the carcass — it keeps its decor');
  // A source a list does not offer cannot be chosen; there is no second guard.
  assert.match(read('src/engine/profile.js'), /the carcass law: a\n      \/\/ carcass keeps its decor/);
});

test('F4 · choosing RAW ends the choice — there is no picker under it', () => {
  const raw = frontSources(P()).find((s) => s.id === 'raw');
  assert.equal(pickerForSource(raw), null, 'RAW opens a picker');
  assert.equal(A.materialSlot('front').sources.find((s) => s.id === 'raw').picker, null);
});

test('F4 · the thickness is unchanged — only the finish differs', () => {
  const raw = frontSources(P()).find((s) => s.id === 'raw');
  const laminate = frontSources(P()).find((s) => s.id === 'laminate');
  assert.equal(raw.thickness, laminate.thickness, 'RAW changed a thickness');
  assert.equal(raw.thickness, 18);
});

// ═══ 2 · IT REACHES THE THREE PIECES, AND ONLY THOSE ════════════════════════

test('F4 · a RAW front resolves to the raw board, whatever was chosen before it', () => {
  const id = job({ raw: false });
  A.setFrontColour({ system: 'RAL', name: 'Wine Red', hex: '#7B1E2B' });
  assert.equal(resolveFinishes(unitOf(id), S().project.design, P()).front.kind, 'spray');

  A.setMaterialSource('front', 'raw');
  const f = resolveFinishes(unitOf(id), S().project.design, P()).front;
  assert.equal(f.kind, 'raw', 'the colour chosen before RAW still painted the board');
  assert.equal(f.id, 'raw_mdf');
  assert.equal(A.rawFronts(S().project), true);
});

test('F4 · THE CARCASS NEVER — it keeps its own finish while the fronts are raw', () => {
  const id = job();
  const { carcass, front } = resolveFinishes(unitOf(id), S().project.design, P());
  assert.equal(front.kind, 'raw');
  assert.notEqual(carcass.kind, 'raw', 'the raw board reached the carcass');
  assert.equal(carcass.id, 'broken_white');
});

test('F4 · END PANELS and the PLINTH take it, because they follow the fronts', () => {
  const id = job();
  const design = S().project.design;
  for (const role of ['end_panel', 'plinth']) {
    const slot = materialSlotOf({ role }, unitOf(id), design);
    assert.equal(slot.kind, 'front', `the ${role} stopped following the fronts`);
    const m = resolvePanelMaterial({ role }, unitOf(id), design, P(), []);
    assert.equal(m.finish.kind, 'raw', `the ${role} is not raw`);
  }
  // …and a CARCASS piece is not.
  const side = resolvePanelMaterial({ role: 'side' }, unitOf(id), design, P(), []);
  assert.notEqual(side.finish.kind, 'raw', 'a carcass side came out raw');
});

test('F4 · going back to a painted source un-does it completely', () => {
  const id = job();
  A.setMaterialSource('front', 'spray');
  A.setFrontColour({ system: 'RAL', name: 'Wine Red', hex: '#7B1E2B' });
  const f = resolveFinishes(unitOf(id), S().project.design, P()).front;
  assert.equal(f.kind, 'spray', 'RAW would not let go');
  assert.equal(A.rawFronts(S().project), false);
});

// ═══ 3 · THE PICTURE ════════════════════════════════════════════════════════

const rawSurface = (sheen = 60) => {
  const id = job();
  const finishes = resolveFinishes(unitOf(id), S().project.design, P());
  return surfaceFor({
    role: 'front', finishExposed: true, finishes, profile: P(), sheen,
  });
};

test('F4 · matte, high roughness, no sheen, no probe — and never "sprayed"', () => {
  const s = rawSurface();
  assert.equal(s.raw, true);
  assert.equal(s.sprayed, false, 'raw MDF went to the spray booth');
  assert.equal(s.sheenDriven, false, 'the gloss slider moved a board with no coat on it');
  assert.ok(s.roughness >= 0.9, `roughness ${s.roughness} — that is not matte`);
  assert.equal(s.clearcoat, 0, 'there is a gloss coat on unpainted MDF');
  assert.equal(s.envMapIntensity, 0, 'a probe put a gradient across a flat face');
});

test('F4 · the SHEEN slider cannot touch it — at 5 % and at 100 % it is the same board', () => {
  const dead = rawSurface(5);
  const gloss = rawSurface(100);
  assert.equal(dead.roughness, gloss.roughness);
  assert.equal(dead.clearcoat, gloss.clearcoat);
});

test('F4 · zero grain, uniform — warm beige-brown, and no texture at all', () => {
  const s = rawSurface();
  assert.equal(s.texture, null, 'raw MDF was given a grain');
  assert.equal(s.repeatMm, 0);
  assert.equal(s.fallbackHex, '#A9926E');
  // WARM: red ≥ green ≥ blue, and the green above the blue is the olive.
  const [r, g, b] = ['A9', '92', '6E'].map((h) => parseInt(h, 16));
  assert.ok(r > g && g > b, 'that is not a warm beige-brown');
});

test('F4 · the shaker frame/edge is LIGHTER than the field, not darker', () => {
  const s = rawSurface();
  assert.equal(s.rawEdgeHex, '#C6B394', 'the raw board has no edge colour');
  const lum = (hex) => [1, 3, 5].reduce((t, i) => t + parseInt(hex.slice(i, i + 2), 16), 0);
  assert.ok(lum('#C6B394') > lum('#A9926E'), 'the frame is DARKER than the field — the photo says lighter');
  // …and it is the line the Edges pass draws, which on a shaker leaf IS the
  // silhouette and the frame.
  assert.equal(outlineFor(P(), { rawEdgeHex: s.rawEdgeHex }).colour, '#C6B394');
  // Every other board keeps the outline it always had.
  assert.equal(outlineFor(P(), {}).colour, P().appearance.outline.colour);
  assert.equal(outlineFor(P(), { contour: true, rawEdgeHex: '#C6B394' }).colour,
    P().appearance.contour.outline, 'the contour view is the TOOL\'s picture and must not change');
});

// ═══ 4 · WHAT IT SAYS ═══════════════════════════════════════════════════════

test('F4 · one sentence at the choice, and only when RAW is live', () => {
  const slot = read('src/retail/design/material/MaterialSlot.jsx');
  assert.match(slot, /data-testid="material-raw-note"/, 'the choice says nothing');
  assert.match(slot, /m\.activeSource === A\.RAW_FRONT_SOURCE \? \(/, 'the sentence stands under every source');
  const reasons = read('src/retail/design/reasons.js');
  assert.match(reasons,
    /rawIsUnpainted: 'Unpainted — ready for your own finish\. We sand it, you paint it\.'/,
    'the sentence is not CLAUDE.md\'s');
});

test('F4 · the ESTIMATE and REVIEW name it', () => {
  const id = job();
  void id;
  const rows = describeDesign({ project: S().project, units: S().units });
  const finish = rows.find((r) => /front finish/i.test(r.label || r[0] || ''));
  assert.ok(finish, 'there is no front finish row');
  assert.match(String(finish.value ?? finish[1]), /Raw MDF/,
    'the summary says "workshop default" for a choice the client made deliberately');
  assert.match(String(finish.value ?? finish[1]), /unpainted/i);
});
