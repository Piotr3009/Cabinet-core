import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  GROOVE_END_EXTRA_MM, LED_GROOVE_LAYER, grooveCount, grooveForStrip, panelForStrip, panelPlane,
  withLedGrooves,
} from '../src/lib/ledGroove.js';
import { grooved } from '../src/lib/cncExport.js';
import { T45_LISP_FILE, balanceOfKits, parenBalance } from '../scripts/t45-paren-balance.mjs';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { stripsForUnit } from '../src/engine/ledStrips.js';
import { migrateDesign } from '../src/engine/design.js';
import { CNC_LAYERS, layerTableFor } from '../src/engine/cnc/layers.js';
import { panelDxf } from '../src/engine/cnc/dxf.js';
import { STANDARD_CONFIGS, canonical } from '../scripts/t45-classify.mjs';

// ─── TURN 45 · F9-CNC — THE GROOVE UNDER EVERY PLACED LINE ──────────────────
//
// CLAUDE.md:
//
//   *"F9-CNC [falls first] The groove under every placed line: born in
//   `reference/lisp/` (rule 3), then the app's CNC export cuts it — width =
//   4 mm or the channel width, on the panel the line sits on. Gated on lines
//   existing; six configs untouched."*
//
// And iron rule 3: *"LISP is law … Paren balance 0/0 by script. No other kit
// is touched."*
//
// It did not fall. This file is what holds it to all four clauses.
//
// ─── TURN 48 (CLAUDE.md F4) EXTENDS THE LAW, IN THE SAME FILE ───────────────
//
// The owner, 25.08.2026: *"dluzszy niz profil o 10 mm z KAZDEJ strony …
// zaokraglenie bita, nikt nie chce uzywac dlutka na rogach."*
//
// The slot outgrows the profile by 10 mm at EACH end. CLAUDE.md F4 names THIS
// file as the place the two are held to each other, so the new constant is
// parsed off the kit exactly as the widths already are, and the length
// assertion below moves with it. Nothing about the WIDTH or the CENTRELINE
// changes — a groove that grew sideways would move the light.

const LISP = readFileSync(new URL(`../reference/lisp/${T45_LISP_FILE}`, import.meta.url), 'utf8');

/** A BUD with two shelves, and a unit record to go with it. */
function bud(extra = {}) {
  const params = {
    ...defaultParamsFor('BUD', P), unit_num: '01', shelves: 2, ...extra,
  };
  return { params, result: computeCabinet(params, P), unit: { id: 'u1', type: 'BUD', params } };
}

/** …with these lighting items placed on it. */
function lit(items) {
  return migrateDesign({ lighting: { on: true, items: items.map((i) => ({ unitId: 'u1', ...i })) } });
}

// ══ iron rule 3 — LISP is law ══════════════════════════════════════════════

test('F9-CNC — the groove is BORN in reference/lisp/, and balances 0/0', () => {
  const own = parenBalance(LISP);
  assert.equal(own.balance, 0, 'the LED groove kit is out of balance');
  assert.equal(own.negativeAt, null, 'a stray ) closes something never opened');
  // …and so does every other kit, which is the half of the rule that catches a
  // careless edit somewhere else in the folder.
  for (const kit of balanceOfKits()) {
    assert.equal(kit.balance, 0, `${kit.name} is ${kit.balance} out`);
    assert.equal(kit.negativeAt, null, `${kit.name} has a stray ) at line ${kit.negativeAt}`);
  }
});

test('F9-CNC — the LISP declares the layer, the rule and the two widths', () => {
  assert.match(LISP, /\(defun ledMakeLayers/);
  assert.match(LISP, /"LED_GROOVE" "_C" "44"/);
  // T48-F4 widened the signature: `extra`, `lo` and `hi` are its locals.
  assert.match(LISP, /\(defun drawLedGroove \(x1 y1 x2 y2 width \/ half extra lo hi\)/);
  assert.match(LISP, /\(defun ledGrooveOnPanel \(lines width \/ ln\)/);
  assert.match(LISP, /\(defun ledFlexiWidth \( \/ \) 4\.0\)/);
  // T48-F4: …and the END EXTRA, named, in its own section.
  assert.match(LISP, /\(defun ledGrooveEndExtra \( \/ \) 10\.0\)/);
  assert.match(LISP, /\(setq extra \(ledGrooveEndExtra\)\)/, 'and drawLedGroove uses it');
  // min/max, not "x1 first": a line handed over the other way round would come
  // back 20 mm SHORTER instead of 20 longer.
  assert.match(LISP, /\(- \(min x1 x2\) extra\)/);
  assert.match(LISP, /\(\+ \(max x1 x2\) extra\)/);
  assert.match(LISP, /\(- \(min y1 y2\) extra\)/);
  assert.match(LISP, /\(\+ \(max y1 y2\) extra\)/);
  // THE GATE, in the LISP itself: no lines, no layer, no rectangle.
  assert.match(LISP, /\(if lines/);
  // CENTRED on the line — the rule the application has to obey.
  assert.match(LISP, /\(setq half \(\/ width 2\.0\)\)/);
  assert.match(LISP, /\(- y1 half\)/);
  assert.match(LISP, /\(\+ y1 half\)/);
});

test('T48-F4 — the LISP owns the number, and the APPLICATION reads it off disk', () => {
  // The whole of "LISP is law" in one assertion: the kit's own line is parsed
  // and the JS constant is held to it. Change 10.0 in the kit and this fails
  // until `src/lib/ledGroove.js` follows.
  const m = /\(defun ledGrooveEndExtra \( \/ \) ([-0-9.]+)\)/.exec(LISP);
  assert.ok(m, 'ledGrooveEndExtra is not in KIT_LED_GROOVE.lsp');
  assert.equal(GROOVE_END_EXTRA_MM, Number(m[1]),
    'the application states a different overrun from the law');
  assert.equal(GROOVE_END_EXTRA_MM, 10, '10 at each end — 20 overall');
});

test('F9-CNC — the APPLICATION follows it: same layer, same colour, same rule', () => {
  assert.equal(LED_GROOVE_LAYER.name, 'LED_GROOVE');
  assert.equal(LED_GROOVE_LAYER.aci, 44);
  // ACI 44 is unused by the engine's own table, so nothing already drawn moves.
  assert.equal(CNC_LAYERS.some((l) => l.aci === 44), false);
  assert.equal(CNC_LAYERS.some((l) => l.name === 'LED_GROOVE'), false,
    'the engine is untouched — the groove is a USER layer (iron rule 2)');
  // …and it still declares properly in a DXF, at its own colour.
  const rows = layerTableFor(['OUTLINE', 'LED_GROOVE'], [LED_GROOVE_LAYER]);
  assert.deepEqual(rows.find((r) => r.name === 'LED_GROOVE'), { name: 'LED_GROOVE', color: 44 });
});

// ══ the frame ══════════════════════════════════════════════════════════════

test('F9-CNC — the panel plane rule is what the ENGINE actually draws', () => {
  const { result } = bud();
  for (const panel of result.panels) {
    const plane = panelPlane(panel);
    if (!plane || !panel.cnc?.outline?.length) continue;
    const xs = panel.cnc.outline.map((p) => p[0]);
    const ys = panel.cnc.outline.map((p) => p[1]);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    const size = { x: panel.box.w, y: panel.box.h, z: panel.box.d };
    // Every outline covers its own two large dimensions, on the axes the rule
    // names — with room for the joinery tabs that hang off the edges.
    assert.ok(spanX >= size[plane.x] - 1, `${panel.id}: cnc x spans ${spanX}, ${plane.x} is ${size[plane.x]}`);
    assert.ok(spanY >= size[plane.y] - 1, `${panel.id}: cnc y spans ${spanY}, ${plane.y} is ${size[plane.y]}`);
  }
});

// ══ the cut ════════════════════════════════════════════════════════════════

test('F9-CNC — a shelf line is cut in THE SHELF SOMEBODY POINTED AT', () => {
  const { result, unit } = bud();
  const shelves = result.panels.filter((p) => p.part === 'SHELF');
  assert.ok(shelves.length >= 2, 'the fixture needs two shelves to tell them apart');
  const design = lit([{ id: 'l1', kind: 'shelf', ref: shelves[1].id, inset_mm: 80 }]);
  const strips = stripsForUnit({
    unit, result, design, profile: P,
  });
  const cut = withLedGrooves({
    result, strips, items: design.lighting.items, ledSpec: { mode: 'flexi' },
  });
  assert.equal(grooveCount(cut), 1);
  const cutInto = cut.panels.filter((p) => (p.cnc?.paths || []).some((x) => x.layer === 'LED_GROOVE'));
  assert.deepEqual(cutInto.map((p) => p.id), [shelves[1].id], 'the OTHER shelf is untouched');
});

test('F9-CNC — the slot is the SPEC’s width, and CENTRED on the line', () => {
  const { result, unit } = bud();
  const shelf = result.panels.find((p) => p.part === 'SHELF');
  const design = lit([{ id: 'l1', kind: 'shelf', ref: shelf.id, inset_mm: 80 }]);
  const strips = stripsForUnit({
    unit, result, design, profile: P,
  });
  const strip = strips.find((s) => s.kind === 'shelf');
  const centre = (strip.box.z + strip.box.d / 2) - shelf.box.z;

  for (const [spec, width] of [
    [{ mode: 'flexi' }, 4],
    [{ mode: 'channel', channelWidth: 12 }, 12],
    [{ mode: 'channel', channelWidth: 18 }, 18],
    [null, 4],
  ]) {
    const g = grooveForStrip(strip, shelf, width);
    const xs = g.pts.map((p) => p[0]);
    assert.equal(Math.max(...xs) - Math.min(...xs), width, `${JSON.stringify(spec)} cuts ${width} mm`);
    assert.ok(Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - centre) < 0.01,
      'centred on the line — 80 mm in puts the light at 80, not at 82');
    // …and it runs the LENGTH of the line, on the other axis — T48-F4: PLUS
    // the bit's overrun at each end, so the channel's square end is not sitting
    // in the cutter's radius.
    const ys = g.pts.map((p) => p[1]);
    assert.equal(Math.max(...ys) - Math.min(...ys), strip.box.w + 2 * GROOVE_END_EXTRA_MM);
    // The pocket is still CENTRED on the profile, end to end: the 10 is the
    // same at both ends, not 20 at one.
    const along = (v) => v - (strip.box.x - shelf.box.x);
    assert.equal(along(Math.min(...ys)), -GROOVE_END_EXTRA_MM);
    assert.equal(along(Math.max(...ys)), strip.box.w + GROOVE_END_EXTRA_MM);
    assert.equal(g.layer, 'LED_GROOVE');
    assert.equal(g.closed, true, 'a pocket, not a profile');
    assert.equal(g.pts.length, 4);
  }
});

test('F9-CNC — a side line is cut in the side the item names', () => {
  const { result, unit } = bud();
  for (const [ref, part] of [['L', 'BUL'], ['R', 'BUR']]) {
    const design = lit([{ id: `s${ref}`, kind: 'side', ref }]);
    const strips = stripsForUnit({
      unit, result, design, profile: P,
    });
    const cut = withLedGrooves({
      result, strips, items: design.lighting.items, ledSpec: { mode: 'flexi' },
    });
    const into = cut.panels.filter((p) => (p.cnc?.paths || []).some((x) => x.layer === 'LED_GROOVE'));
    assert.deepEqual(into.map((p) => p.part), [part], `${ref} → ${part}`);
  }
});

test('F9-CNC — a SPOT is not a run and cuts nothing', () => {
  const { result, unit } = bud();
  const design = lit([{ id: 'p1', kind: 'spot', count: 2 }]);
  const strips = stripsForUnit({
    unit, result, design, profile: P,
  });
  const cut = withLedGrooves({
    result, strips, items: design.lighting.items, ledSpec: { mode: 'flexi' },
  });
  assert.equal(grooveCount(cut), 0);
  assert.equal(panelForStrip({ kind: 'spot' }, result.panels), null);
});

// ══ THE GATE — and the six configs ═════════════════════════════════════════

test('F9-CNC — GATED ON LINES EXISTING: no line, the SAME object back', () => {
  const { result, unit } = bud();
  // Not a copy with nothing added — the very object, so a caller comparing by
  // identity sees what iron rule 2 promises.
  assert.equal(withLedGrooves({ result, strips: [] }), result);
  assert.equal(withLedGrooves({ result, strips: null }), result);
  assert.equal(withLedGrooves({ result: null, strips: [{ kind: 'shelf' }] }), null);
  // …and through the export's own door, which is where the app enters.
  assert.equal(grooved(result, {}), result, 'no unit, no design → untouched');
  assert.equal(grooved(result, { unit, design: { lighting: { items: [] } } }), result);
  assert.equal(grooved(result, { unit, design: migrateDesign({}) }), result);
});

test('F9-CNC — the six standard configs carry no line, so nothing reaches them', () => {
  // The classifier's claim, said again from the other end: `defaultParamsFor`
  // places no LED item, so the gate above closes on every one of the six and
  // `computeCabinet()` is never even asked.
  for (const cfg of STANDARD_CONFIGS) {
    const params = { ...defaultParamsFor(cfg.id, P), unit_num: '01' };
    const result = computeCabinet(params, P);
    const before = canonical(result);
    const unit = { id: 'u1', type: cfg.id, params };
    const out = grooved(result, { unit, design: migrateDesign({}), ledSpec: { mode: 'channel', channelWidth: 18 } });
    assert.equal(out, result, `${cfg.id} was touched`);
    assert.equal(canonical(result), before, `${cfg.id} moved a byte`);
  }
});

test('F9-CNC — the export takes the groove and the DXF carries it', () => {
  const { result, unit } = bud();
  const shelf = result.panels.find((p) => p.part === 'SHELF');
  const design = lit([{ id: 'l1', kind: 'shelf', ref: shelf.id, inset_mm: 80 }]);
  const cut = grooved(result, {
    unit, design, ledSpec: { mode: 'channel', channelWidth: 12 }, profile: P,
  });
  assert.equal(grooveCount(cut), 1);
  const panel = cut.panels.find((p) => p.id === shelf.id);
  const dxf = panelDxf(panel, cut.drills, { unitNum: '01', profile: P, userLayers: [LED_GROOVE_LAYER] });
  assert.match(dxf, /LED_GROOVE/, 'the layer is declared and used');
  // …declared at ACI 44, which is what the LISP says.
  const table = dxf.slice(0, dxf.indexOf('ENTITIES'));
  assert.match(table, /LAYER\r\n2\r\nLED_GROOVE\r\n70\r\n0\r\n62\r\n44\r\n/);
  // …and the very same file with the light not placed has no such layer.
  const plain = panelDxf(shelf, result.drills, { unitNum: '01', profile: P });
  assert.doesNotMatch(plain, /LED_GROOVE/);
});

test('F9-CNC — the PREVIEW being off does not stop the cut (F9a)', () => {
  const { result, unit } = bud();
  const shelf = result.panels.find((p) => p.part === 'SHELF');
  // The line is placed; the room is not dimmed. It is still cut.
  const design = migrateDesign({
    lighting: { on: false, items: [{ id: 'l1', unitId: 'u1', kind: 'shelf', ref: shelf.id }] },
  });
  const cut = grooved(result, {
    unit, design, ledSpec: { mode: 'flexi' }, profile: P,
  });
  assert.equal(grooveCount(cut), 1);
});
