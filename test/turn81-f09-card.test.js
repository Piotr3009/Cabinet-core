/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F9 · THE CARD DRAWS ITS OWN UNIT
//
// The owner, 22.10.2026 (22:57): *"zalezy mi zebys rysowal w pdf 1 do 1 co
// mamy na cabinet core"*. CLAUDE.md T81 F9: "the projector in fronts, no-fronts
// (the CARCASS view) and top-of-card modes for ONE member, with the run parts
// (plinth, frame, worktop, cornice) CLIPPED to the unit's own width plus the
// profile's margin (drawings.card.runMargin 50, PROPOSED) ... Tests
// test/turn81-f09-card.test.js: the card's widest entity is the unit plus the
// margin; the frame appears clipped under in-frame; the colour line once."

import test from 'node:test';
import assert from 'node:assert/strict';

import { S, t81Kitchen, setArgs } from '../scripts/t81-kitchen.mjs';
import { getCabinetProfile } from '../src/engine/profile.js';
import { buildUnitCard } from '../src/engine/drawings/unitCard.js';
import { unitCardSheet } from '../src/engine/drawings/card.js';

const P = () => getCabinetProfile();

function card(inframe, which = 'a') {
  const ids = t81Kitchen({ inframe });
  const a = setArgs();
  const e = a.entries.find((x) => x.unit.id === ids[which]);
  const drawing = buildUnitCard(e.result, { unitNum: e.unit.params.unit_num, frontType: 'S', profile: P(), unit: e.unit });
  return { ids, a, e, drawing };
}

const widthOf = (e) => {
  if (e.kind === 'line') return Math.abs(e.x2 - e.x1);
  if (e.kind === 'rect') return e.w;
  if (e.kind === 'poly') { const xs = e.pts.map((p) => p[0]); return Math.max(...xs) - Math.min(...xs); }
  if (e.kind === 'circle') return 2 * e.r;
  return 0;
};

test('F9 · the card\'s widest entity is the unit and the margin either side: the run\'s 1920 frame and 1900 plinth are clipped', () => {
  for (const inframe of [true, false]) {
    const { e, drawing } = card(inframe);
    const W = Number(e.result.params.width);
    const m = P().drawings.card.runMargin;
    assert.equal(m, 50, 'T81 PROPOSED');
    const geometry = drawing.entities.filter((x) => x.kind !== 'text' && x.layer !== 'DIMENSIONS' && x.layer !== 'VIEW_TITLE');
    const widest = Math.max(...geometry.map(widthOf));
    assert.ok(widest <= W + 2 * m + 1e-6, `in-frame ${inframe}: the widest is ${widest}, the unit ${W} and ${m} either side`);
    // The run's plinth is on the card, clipped (the audit of 22.10, finding 2).
    const plinth = geometry.filter((x) => x.src === `${e.unit.id}:PLINTH` && x.kind === 'line');
    assert.ok(plinth.length > 0, 'the plinth the unit owns');
    assert.ok(plinth.every((x) => widthOf(x) <= W + 2 * m + 1e-6));
  }
});

test('F9 · the frame appears on the card, clipped, under in-frame only', () => {
  const on = card(true);
  const W = Number(on.e.result.params.width);
  const m = P().drawings.card.runMargin;
  const frame = on.drawing.entities.filter((x) => x.layer === 'FRAME_BOARD' && x.kind === 'line');
  assert.ok(frame.length > 0, 'the frame, on the run owner\'s card');
  // In the FRONT view's own frame (the card sets the front view at its origin)
  // the frame runs from the unit's left, past the end panel, to the margin.
  const front = on.drawing.views.front;
  const xs = frame.flatMap((x) => [x.x1, x.x2]).filter((x) => x <= front.x + front.w + 1e-6);
  assert.ok(Math.max(...xs) - Math.min(...xs) <= W + 2 * m + 1e-6, 'clipped to the unit and its margin');
  const off = card(false);
  assert.equal(off.drawing.entities.filter((x) => x.layer === 'FRAME_BOARD').length, 0, 'lay-on: no frame');
});

test('F9 · the three views are the room\'s: the fronts with their hinge bars and knob, the carcass with its plates, the plan from the front', () => {
  const { e, drawing } = card(true);
  const door = e.result.panels.find((p) => p.part === 'FRONT');
  assert.ok(drawing.entities.some((x) => x.kind === 'rect' && x.layer === 'DOORS' && x.src === `${e.unit.id}:${door.id}` && !x.meta), 'the leaf, one rect');
  assert.ok(drawing.entities.some((x) => x.layer === 'HINGE_MARK' && x.src === `${e.unit.id}:${door.id}`), 'its hinge bars');
  assert.ok(drawing.entities.some((x) => x.kind === 'circle' && x.handle === 'knob'), 'its knob');
  assert.ok(drawing.entities.some((x) => x.family === 'plate' && x.src.startsWith(`${e.unit.id}:`)), 'the plates, on the carcass view');
  const captions = drawing.entities.filter((x) => x.kind === 'text' && x.layer === 'VIEW_TITLE').map((x) => x.text);
  for (const c of ['FRONT', 'CARCASS (no fronts)', 'TOP']) assert.ok(captions.includes(c), c);
  // The T80 filler stays a NOTE on the run owner's card.
  assert.ok(drawing.entities.some((x) => x.kind === 'text' && /^NOTE: Site filler 19 mm/.test(x.text)));
});

test('F9 · the Fronts row of the title block says the colour and its system once', () => {
  const ids = t81Kitchen({ inframe: true });
  const a = setArgs();
  const e = a.entries.find((x) => x.unit.id === ids.a);
  const sheet = unitCardSheet({ result: e.result, unit: e.unit, project: S().project, design: a.design, profile: P(), date: '22/10/2026' });
  const words = sheet.entities.filter((x) => x.kind === 'text').map((x) => x.text);
  assert.ok(words.includes('F&B Card Room Green spray'), 'the colour, once');
  assert.ok(!words.some((w) => /F&B F&B/.test(w)), 'never "F&B F&B" (the audit of 22.10, finding 4)');
});
