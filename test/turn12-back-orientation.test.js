// ─── The back panel that turned 90° (turn 12, CLAUDE.md F10) ────────────────
//
// Owner: the TALL/FRIDGE back panel renders rotated, and "poprzednio było
// dobrze". CLAUDE.md asks to diagnose FIRST, fix at the guilty layer, and leave
// a regression guard on whatever orientation data the fix pins.
//
// ─── THE DIAGNOSIS ───
//
// It is the VISUAL layer, as the chat triage suspected, but not the grain: it
// is the CNC→cabinet MAPPING, and the differentiator between the kits is one
// flag nobody had to think about before.
//
// Most panels are drawn upright. Some are nested TURNED to save sheet — the TOP
// and BOTTOM always have been, and `panelPlacement` has always said so for
// them: their CNC x runs along the cabinet's DEPTH. KIT_FRIDGE nests its top
// back panel the same way (`cnc.rotated: true`, `drawn_w` = the panel's HEIGHT
// = 296, `drawn_h` = its width = 600) and `panelPlacement`'s BACK case did not:
// it mapped CNC x onto the cabinet's x unconditionally.
//
// Turn 11 is when that started to show, because turn 11 is when a panel with
// sockets stopped being a box and became an extrusion of its machined outline
// (3d/panelSolid.js). Before that the wrong mapping produced a rectangle, and a
// rectangle looks the same either way round. So the ENGINE geometry really was
// untouched, exactly as the triage said — the piece is 600 × 296 in the cut
// list on both sides of the bug.
//
// ─── THE GUARD ───
//
// Two things are pinned. The first is the orientation datum itself: for every
// machined panel of every kit, the CNC rectangle must AGREE with the spans of
// the axes its placement maps onto. That is what was false for exactly one
// panel in the app and true for every other, and it is a property rather than a
// list, so a kit added in turn 15 is covered by it on the day it lands.
//
// The second is the physical check the placement's own comment names: the
// sockets have to land on the tabs they mate with.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { joineryLayers, panelPlacement } from '../src/engine/joinery.js';
import { cncRect, socketNotches, tabOutlines } from '../src/engine/socketFace.js';
import { defaultParamsFor, UNIT_TYPE_ORDER } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const LAYERS = joineryLayers(P, null);
const unit = (id) => computeCabinet(defaultParamsFor(id, P), P);

/** How long the cabinet axis this unit vector points along is, on this box. */
function spanAlong(axis, box) {
  if (Math.abs(axis[0]) > 0.5) return box.w;
  if (Math.abs(axis[1]) > 0.5) return box.h;
  return box.d;
}

const isMachined = (panel) => socketNotches(panel, LAYERS).length > 0 || tabOutlines(panel).length > 0;

test('THE GUARD: every machined panel’s CNC rectangle fits the axes it is laid on', () => {
  const wrong = [];
  for (const id of UNIT_TYPE_ORDER) {
    for (const panel of unit(id).panels) {
      const placement = panelPlacement(panel);
      if (!placement || !isMachined(panel)) continue;
      const rect = cncRect(panel);
      const u = spanAlong(placement.u, panel.box);
      const v = spanAlong(placement.v, panel.box);
      if (Math.abs(u - rect.w) > 1 || Math.abs(v - rect.h) > 1) {
        wrong.push(`${id} ${panel.id}: drawn ${rect.w}×${rect.h}, laid on ${u}×${v}`);
      }
    }
  }
  assert.deepEqual(wrong, [], wrong.join('\n'));
});

test('a rotated BACK is the case that was missing', () => {
  const back = unit('FRIDGE').panels.find((p) => p.part === 'BACK');
  assert.equal(back.cnc.rotated, true, 'KIT_FRIDGE nests its top back turned');
  assert.equal(back.w, 600);
  assert.equal(back.h, 296);
  assert.equal(back.cnc.drawn_w, 296, 'the DRAWING has its height along x');
  assert.equal(back.cnc.drawn_h, 600);

  const placement = panelPlacement(back);
  // CNC x runs DOWN from the top of the piece, CNC y across it.
  assert.deepEqual(placement.u, [0, -1, 0]);
  assert.deepEqual(placement.v, [1, 0, 0]);
  assert.deepEqual(placement.origin, [back.box.x, back.box.y + back.box.h, back.box.z]);
  assert.deepEqual(placement.n, [0, 0, -1]);
});

test('…and an upright BACK is untouched, on every other kit', () => {
  for (const id of UNIT_TYPE_ORDER) {
    for (const back of unit(id).panels.filter((p) => p.part === 'BACK')) {
      if (back.cnc.rotated) continue;
      const placement = panelPlacement(back);
      assert.deepEqual(placement.u, [1, 0, 0], `${id}`);
      assert.deepEqual(placement.v, [0, 1, 0], `${id}`);
      assert.deepEqual(placement.origin, [back.box.x, back.box.y, back.box.z], `${id}`);
    }
  }
});

test('the face is TURNED and not MIRRORED', () => {
  // u × v against n, on both branches. A 90° turn keeps the relationship; a
  // mirror flips it, and a mirrored panel puts its drilling on the wrong face.
  // `+ 0` normalises negative zero: a strict deep-equal separates -0 from 0,
  // and "which side of zero is this zero on" is not a fact about handedness.
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1] + 0,
    a[2] * b[0] - a[0] * b[2] + 0,
    a[0] * b[1] - a[1] * b[0] + 0,
  ];
  const upright = panelPlacement(unit('BUD').panels.find((p) => p.part === 'BACK'));
  const turned = panelPlacement(unit('FRIDGE').panels.find((p) => p.part === 'BACK'));
  assert.deepEqual(cross(upright.u, upright.v), cross(turned.u, turned.v));
});

test('THE PHYSICAL CHECK: the sockets land on the tabs they mate with', () => {
  // The placement's own comment says this is the check that matters, and it is:
  // the geometry is only right if the joint closes. The fridge's top back panel
  // is held by the two side panels, so its end sockets have to sit on their top
  // tabs — and the top tab is at cabinet y 1980–2030.
  const r = unit('FRIDGE');
  const back = r.panels.find((p) => p.part === 'BACK');
  const placement = panelPlacement(back);
  const toCabinet = (x, y) => [
    placement.origin[0] + placement.u[0] * x + placement.v[0] * y,
    placement.origin[1] + placement.u[1] * x + placement.v[1] * y,
    placement.origin[2] + placement.u[2] * x + placement.v[2] * y,
  ];

  // The notches on the panel's two SHORT edges are the ones the sides go into.
  const ends = socketNotches(back, LAYERS).filter((n) => n.edge === 'top' || n.edge === 'bottom');
  assert.equal(ends.length, 2, 'one at each end, for the two side panels');

  const tabs = tabOutlines(r.panels.find((p) => p.part === 'BUL'))
    .map((t) => [Math.min(...t.map(([, y]) => y)), Math.max(...t.map(([, y]) => y))]);

  for (const notch of ends) {
    const from = toCabinet(notch.from, 0)[1];
    const to = toCabinet(notch.to, 0)[1];
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const mate = tabs.find(([a, b]) => a >= lo - 1 && b <= hi + 1);
    assert.ok(mate, `a socket at cabinet y ${lo}–${hi} mates with no tab (${JSON.stringify(tabs)})`);
  }
});

test('the CUT LIST never moved — the bug was in the view and only in the view', () => {
  // The triage's own claim, held to account: the piece the machine cuts is
  // 600 × 296 whichever way the 3D was drawing it, and it is drawn rotated on
  // the sheet because that is how the kit nests it.
  const back = unit('FRIDGE').panels.find((p) => p.part === 'BACK');
  assert.equal(back.w, 600);
  assert.equal(back.h, 296);
  assert.equal(back.box.w, 600);
  assert.equal(back.box.h, 296);
  assert.equal(back.box.d, P.board.thickness);
});
