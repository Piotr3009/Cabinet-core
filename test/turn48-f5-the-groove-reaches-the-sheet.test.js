// ─── TURN 48, CLAUDE.md F5: THE GROOVE REACHES THE SHEET ────────────────────
//
//   *"T45's named debt, paid. The groove `lib/ledGroove.js` computes finally
//   lands on the panel it is cut into: a pocket on the panel's CNC record, on
//   the layer `ledMakeLayers` declares, through to the DXF and the CNC preview.
//   Gated on the strip existing — a project without LED moves nothing. Prove
//   the rectangle against the LISP's own, F4's +10s included."*
//
// WHAT THE DEBT ACTUALLY WAS. T45 cut the groove on the way to the DXF and
// nowhere else. Every surface that DRAWS a sheet — the CNC preview, the tree,
// the material sections, the per-sheet DXF button — read `unitResult`, which is
// the engine's answer and knows nothing about a strip. So the pocket a joiner
// was about to cut was in the file and not on the picture of the file, and the
// two disagreed silently.
//
// ONE ANSWER FOR THE SHEET: `projectStore.unitCncResult`. `unitResult` is
// untouched (the 3-D, the BOM and the checks are the same), and everything that
// speaks to the machine asks the new one.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import {
  GROOVE_END_EXTRA_MM, LED_GROOVE_LAYER, grooveCount, grooveForStrip,
} from '../src/lib/ledGroove.js';
import { grooved } from '../src/lib/cncExport.js';
import { stripsForUnit } from '../src/engine/ledStrips.js';
import { allLayers, resolveLayer } from '../src/engine/partLayers.js';
import { panelDxf } from '../src/engine/cnc/dxf.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const LISP = readFileSync(new URL('../reference/lisp/KIT_LED_GROOVE.lsp', import.meta.url), 'utf8');

/** A kitchen with one BUD, two shelves, and a strip under the lower one. */
function litProject({ mode = 'flexi', channelWidth = 12 } = {}) {
  store().loadProject({
    id: null,
    name: 't48-f5',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: { projectType: 'kitchen' },
    ledSpec: { mode, channelWidth },
  }, []);
  const { id } = store().addUnit('BUD');
  store().updateUnitParams(id, { width: 600, doors: { count: 1 } });
  store().addShelves(id, 2);
  const shelf = store().unitResult(id).panels.find((p) => p.part === 'SHELF');
  store().addLightingItem({ unitId: id, kind: 'shelf', ref: shelf.id });
  return { id, shelf };
}

// ══ THE DEBT, PAID ═════════════════════════════════════════════════════════

test('the SHEET\'s answer carries the groove; the ENGINE\'s answer still does not', () => {
  const { id } = litProject();
  assert.equal(grooveCount(store().unitResult(id)), 0,
    'unitResult is the engine speaking, and the engine never hears about a strip');
  assert.equal(grooveCount(store().unitCncResult(id)), 1,
    'and the sheet asks the one question the machine needs answered');
});

test('it lands on the PANEL the line is cut into, and on the LISP\'s own layer', () => {
  const { id, shelf } = litProject();
  const cut = store().unitCncResult(id);
  const carrying = cut.panels.filter((p) => (p.cnc?.paths || []).some((x) => x.layer === 'LED_GROOVE'));
  assert.deepEqual(carrying.map((p) => p.id), [shelf.id], 'the board somebody pointed at, and no other');
  const groove = carrying[0].cnc.paths.find((x) => x.layer === 'LED_GROOVE');
  assert.equal(groove.closed, true, 'a POCKET, not a profile — the cutter stays in the board');
  assert.equal(groove.pts.length, 4);
  assert.match(LISP, /"LED_GROOVE" "_C" "44"/);
  assert.equal(LED_GROOVE_LAYER.aci, 44, 'the file states what the kit declares');
});

// ══ THE RECTANGLE IS THE LISP'S OWN, +10s INCLUDED ═════════════════════════

test('the rectangle the sheet carries IS the one drawLedGroove draws', () => {
  const { id, shelf } = litProject({ mode: 'channel', channelWidth: 12 });
  const unit = store().units.find((u) => u.id === id);
  const result = store().unitResult(id);
  const strip = stripsForUnit({
    unit,
    result,
    design: { ...store().project.design, lighting: { ...store().project.design.lighting, on: true } },
    profile: P,
  }).find((s) => s.kind === 'shelf');

  // The LISP's own two numbers, parsed off disk rather than typed twice.
  const extra = Number(/\(defun ledGrooveEndExtra \( \/ \) ([-0-9.]+)\)/.exec(LISP)[1]);
  const flexi = Number(/\(defun ledFlexiWidth \( \/ \) ([-0-9.]+)\)/.exec(LISP)[1]);
  assert.equal(extra, GROOVE_END_EXTRA_MM);
  assert.equal(flexi, 4);

  const board = result.panels.find((p) => p.id === shelf.id);
  const g = grooveForStrip(strip, board, 12);
  const xs = g.pts.map((p) => p[0]);
  const ys = g.pts.map((p) => p[1]);

  // WIDTH: the channel's slot, centred on the line — the rule the LISP states
  // once and F4 did not touch.
  assert.equal(Math.max(...xs) - Math.min(...xs), 12);

  // LENGTH: the profile, plus the bit's overrun at EACH end — F4's law, drawn.
  //   drawLedGroove: lo = (min − extra), hi = (max + extra)
  assert.equal(Math.max(...ys) - Math.min(...ys), strip.box.w + 2 * extra);
  const origin = strip.box.x - board.box.x;                   // the profile's own start
  assert.equal(Math.min(...ys), origin - extra);
  assert.equal(Math.max(...ys), origin + strip.box.w + extra);

  // …and the sheet's own copy is that very rectangle, not a second arithmetic.
  const onSheet = store().unitCncResult(id).panels
    .find((p) => p.id === shelf.id).cnc.paths.find((x) => x.layer === 'LED_GROOVE');
  assert.deepEqual(onSheet.pts, g.pts);
});

// ══ THE PREVIEW CAN DRAW IT ════════════════════════════════════════════════

test('the sheet can NAME and INK the layer — a preview never draws the unnamed', () => {
  // The groove is a USER layer (T45's decision, and iron rule 2's reason for
  // it), so the app's own table does not know it — which is precisely why the
  // CNC view has to hand it in beside the project's own layers.
  assert.equal(allLayers([]).some((l) => l.name === 'LED_GROOVE'), false);
  assert.equal(resolveLayer('LED_GROOVE', []).name, 'LED_GROOVE');
  assert.equal(resolveLayer('LED_GROOVE', []).screen, '#c0c0c0', 'unknown, without the record');
  // With the record it has an ink of its own — the app's own LED gold, so a
  // groove on the sheet is the same colour as a strip in the lighting panel.
  assert.equal(LED_GROOVE_LAYER.screen, '#c8a24a');
  // …and the view really does hand it in. A colour the legend cannot resolve is
  // the failure this assertion is here to catch, and it is one grep away.
  const view = readFileSync(new URL('../src/components/CncView.jsx', import.meta.url), 'utf8');
  assert.match(view, /import \{ LED_GROOVE_LAYER \} from '\.\.\/lib\/ledGroove\.js'/);
  assert.match(view, /\[\.\.\.allLayers\(projectLayers\), LED_GROOVE_LAYER\]/);
  assert.match(view, /const legend = sheetLayers\.filter/);
});

test('…and the DXF still carries it, at the ACI the kit declares', () => {
  const { id, shelf } = litProject();
  const cut = store().unitCncResult(id);
  const panel = cut.panels.find((p) => p.id === shelf.id);
  const dxf = panelDxf(panel, cut.drills, { unitNum: '01', profile: P, userLayers: [LED_GROOVE_LAYER] });
  assert.match(dxf.slice(0, dxf.indexOf('ENTITIES')), /LAYER\r\n2\r\nLED_GROOVE\r\n70\r\n0\r\n62\r\n44\r\n/);
});

// ══ CUT ONCE ═══════════════════════════════════════════════════════════════

test('a result that already carries its grooves is not cut a second time', () => {
  // The export button hands the SHEET's result to `grooved()` on its way to the
  // file. Without this the pocket would be two identical closed polylines on
  // one layer — which a nesting program cuts TWICE, in the same slot.
  const { id } = litProject();
  const unit = store().units.find((u) => u.id === id);
  const once = store().unitCncResult(id);
  const twice = grooved(once, {
    unit, design: store().project.design, ledSpec: store().project.ledSpec, profile: P,
  });
  assert.equal(twice, once, 'the very object back');
  assert.equal(grooveCount(twice), 1);
});

// ══ THE GATE ═══════════════════════════════════════════════════════════════

test('GATED ON THE STRIP EXISTING: no line, the very object `unitResult` made', () => {
  store().loadProject({
    id: null,
    name: 't48-f5-dark',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: { projectType: 'kitchen' },
  }, []);
  const { id } = store().addUnit('BUD');
  store().addShelves(id, 2);
  const plain = store().unitResult(id);
  const sheet = store().unitCncResult(id);
  assert.equal(grooveCount(sheet), 0);
  // Not an equal copy — nothing at all happened. `unitResult` recomputes on
  // every read, so the two objects differ by construction; what is asserted is
  // that the groove pass added no key to any panel.
  assert.deepEqual(
    sheet.panels.map((p) => (p.cnc?.paths || []).length),
    plain.panels.map((p) => (p.cnc?.paths || []).length),
  );
});

test('…and the six standard configs are still nowhere near it', () => {
  for (const cfg of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) {
    const params = { ...defaultParamsFor(cfg, P), unit_num: '01' };
    const result = computeCabinet(params, P);
    assert.equal(grooveCount(result), 0, `${cfg} carries no groove`);
    assert.equal(
      grooved(result, { unit: { id: 'u1', type: cfg, params }, design: { lighting: { items: [] } } }),
      result,
      `${cfg} was touched`,
    );
  }
});
