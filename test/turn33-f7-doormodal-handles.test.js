// ─── Turn 33, CLAUDE.md F7: one hinge block, and handles measured from the EDGE
//
// Two owner findings, one modal. The duplicate hinge block leaves the door
// modal (the working one — arrows + picker — stands alone at the top; the
// right-hand panel keeps its own rows untouched). And the handle offset
// becomes EDGE-RELATIVE AND MIRRORED: "30 means 30 from the LEFT edge on the
// left door and 30 from the RIGHT edge on the right door" — a pair stays
// 50/50, never 60/40, all the way to the drilling.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { resolveHandle } from '../src/engine/handles.js';
import { getUnitType } from '../src/engine/types.js';

const spec = P.handles;

/** A leaf of a pair, as the engine cuts it. */
const leaf = (hinge, w = 497, h = 700) => ({
  part: 'FRONT', role: 'front', w, h, meta: { hinge },
});

const resolve = (hinge, offset) => resolveHandle({
  panel: leaf(hinge),
  unitType: getUnitType('BUD'),
  project: { type: 'bar', centres: 128, offsets: { 'base-door': offset } },
  hinge,
}, P);

// ─── the law: edge-relative, mirrored ───────────────────────────────────────

test('a pair with NO offset is already symmetric — the base the fault sat on top of', () => {
  const L = resolve('L', undefined);
  const R = resolve('R', undefined);
  // Sheet x → distance from the OWN handle edge: L's edge is at sheet 0,
  // R's at sheet w.
  assert.equal(L.reference.x, spec.inset);
  assert.equal(497 - R.reference.x, spec.inset);
});

test('the offset is measured from the door’s OWN handle edge and MIRRORS — 50/50, never 60/40', () => {
  const off = { x: 30, y: 0 };
  const L = resolve('L', off);
  const R = resolve('R', off);
  const fromEdgeL = L.reference.x;              // L's handle edge is sheet 0
  const fromEdgeR = 497 - R.reference.x;        // R's is sheet w
  assert.equal(fromEdgeL, spec.inset + 30, 'the left leaf: inset + 30 from ITS edge');
  assert.equal(fromEdgeR, spec.inset + 30, 'the right leaf: the same 30 from ITS edge');
  assert.equal(fromEdgeL, fromEdgeR, 'MIRRORED — the pair stays symmetric');
});

test('y is y on both hands, and a horizontal front keeps its plain centred reading', () => {
  const off = { x: 10, y: -25 };
  assert.equal(resolve('L', off).reference.y, resolve('R', off).reference.y);
  const drawerFront = resolveHandle({
    panel: { part: 'DRAWER-FRONT', role: 'front', w: 597, h: 200, meta: {} },
    unitType: getUnitType('BUDR'),
    project: { type: 'bar', centres: 128, offsets: { horizontal: { x: 10, y: 0 } } },
    hinge: 'L',
  }, P);
  assert.equal(drawerFront.reference.x, 597 / 2 + 10, 'one centred piece, no pair to mirror');
});

// ─── consumer sweep: the mirrored offset reaches the DRILLING ───────────────

test('the drilled holes of a pair straddle the centre symmetrically, offset and all', () => {
  const result = computeCabinet({
    type: 'BUD',
    width: 1000,
    height: 720,
    depth: 560,
    unit_num: '01',
    doors: { count: 2 },
    project_handle: { type: 'knob', offsets: { 'base-door': { x: 30, y: 0 } } },
  }, P);
  const holes = result.drills.filter((d) => d.kind === 'handle');
  assert.equal(holes.length, 2, 'one knob hole per leaf');
  const fl = result.panels.find((p) => p.id.endsWith('-FL'));
  const holeByPanel = new Map(holes.map((d) => [d.panel, d]));
  const hL = holeByPanel.get(fl.id);
  const hR = holes.find((d) => d !== hL);
  // Sheet-frame x → distance from each leaf's own handle edge.
  const edgeL = hL.x;                 // FL: handle edge at sheet 0
  const edgeR = fl.w - hR.x;          // FR: handle edge at sheet w
  assert.ok(Math.abs(edgeL - edgeR) < 1e-9,
    `the pair drills mirrored (${edgeL} vs ${edgeR})`);
  // …and the 30 is exactly the walk off the un-offset base (a shaker front
  // centres on its stile, so the base is the frame's — whatever the rule, the
  // offset adds its 30 from the same edge on both hands).
  const plain = computeCabinet({
    type: 'BUD',
    width: 1000,
    height: 720,
    depth: 560,
    unit_num: '01',
    doors: { count: 2 },
    project_handle: { type: 'knob' },
  }, P);
  const plainL = plain.drills.find((d) => d.kind === 'handle' && d.panel === fl.id);
  assert.equal(edgeL, plainL.x + 30, 'the offset walks 30 off the base, from the edge');
});

test('golden fixtures carry no handle drilling — the reinterpretation moves no fixture', () => {
  for (const name of ['golden-bud.json', 'golden-wardrobe.json']) {
    const fx = JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url)));
    const text = JSON.stringify(fx);
    assert.ok(!/"kind":\s*"handle"/.test(text), `${name} drills no handle`);
  }
});

// ─── the modal: one block, at the top ───────────────────────────────────────

test('the door modal renders ONE hinge block — the working one, first', () => {
  const src = readFileSync(new URL('../src/components/DoorModal.jsx', import.meta.url), 'utf8');
  // The upper (field-list) block is omitted from THIS modal only…
  assert.match(src, /omit=\{\['hinges'\]\}/, 'the duplicate field-list rows are omitted');
  // …and the working HingeSection stands before ElementProperties.
  const hingeAt = src.indexOf('<HingeSection');
  const propsAt = src.indexOf('<ElementProperties');
  assert.ok(hingeAt > -1 && propsAt > -1 && hingeAt < propsAt,
    'the arrow-mover block moved UP to where the deleted one sat');
  // The right panel keeps its rows: it passes no omit.
  const rp = readFileSync(new URL('../src/components/RightPanel.jsx', import.meta.url), 'utf8');
  assert.ok(!/omit=/.test(rp), 'the right-hand panel is untouched');
});
