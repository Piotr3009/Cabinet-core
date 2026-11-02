/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// Chat, 02.11.2026 . THE AI PROMPT KEEPS THE COLOURS AND GIVES EACH TRY ITS OWN ROOM.
// The owner, on his sprayed wardrobe whose AI picture came back with oak sides and an oak plinth: *"chodzi o to
// zeby nigdy nie zmienial kolorystyki elementow"*; on the three tries: *"zeby one byly inne od siebie tylko meble
// takie same, a jednak srodek inny, bo 3 takie same bez sensu"*; *"jak beda lazienki to musza byc inne prompty"*.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const { buildPrompt, generateRun, roomKindOf, roomOfAttempt, visualise, ROOM_KINDS } = await import('../src/lib/aiVisualise.js');
const { visualNumbers } = await import('../src/lib/visualNumbers.js');
const { getCabinetProfile } = await import('../src/engine/profile.js');

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** The owner's wardrobe of 02.11.2026: fronts sprayed RAL 3005 Wine red, the carcass EGGER H3325, a bar handle. */
const DESIGN = { colour: { front: { hex: '#8a1c2b', name: '3005 Wine red', system: 'RAL' } }, fronts: { handle: { type: 'bar' } } };
const WARDROBE = [{ id: 'w1', type: 'WARDROBE', params: {} }];
const FINISHES = { fronts: ['RAL 3005 Wine red spray'], carcass: ['EGGER H3325 ST28 Tobacco Gladstone Oak'], handle: 'bar handles', worktop: null };
const prompt = (extra = {}) => buildPrompt({ project: { design: DESIGN, room: { width: 3000, height: 2400 } }, units: WARDROBE, profile: getCabinetProfile(), ...extra });

test('the colour lock: no part of the furniture changes colour or material, sides, end panels and plinths named', () => {
  const p = prompt({ finishes: FINISHES });
  assert.match(p, /Do not change the colour or the material of any part of the furniture\./);
  assert.match(p, /keeps exactly the colour and material it has in the picture: fronts, sides, end panels, plinths, cornices, worktops and handles\./);
  assert.ok(p.indexOf('Do not change the colour') < p.indexOf('The fronts are finished'), 'the lock comes before any finish is named');
});

test('the carcass decor is named as the inside of the cabinets, never as "the carcasses" (it repainted a sprayed side)', () => {
  const p = prompt({ finishes: FINISHES });
  assert.match(p, /The insides of the cabinets are EGGER H3325 ST28 Tobacco Gladstone Oak\./);
  assert.doesNotMatch(p, /The carcasses are/);
  assert.match(p, /The fronts are finished in RAL 3005 Wine red spray\./);
  assert.doesNotMatch(read('src/lib/aiVisualise.js'), /The carcasses are/, 'the old sentence is gone from the source');
});

test('the room kind follows the units: wardrobe a bedroom, vanity and mirror cabinet a bathroom, kitchen kits a kitchen', () => {
  assert.deepEqual([...ROOM_KINDS], ['kitchen', 'bedroom', 'bathroom']);
  assert.equal(roomKindOf(WARDROBE), 'bedroom');
  assert.equal(roomKindOf([{ type: 'VANITY2' }, { type: 'MIRROR_CABINET' }]), 'bathroom');
  assert.equal(roomKindOf([{ type: 'BUD' }, { type: 'WUD' }]), 'kitchen');
  assert.equal(roomKindOf([{ type: 'BUD' }, { type: 'WARDROBE' }, { type: 'WARDROBE_TOP' }]), 'bedroom', 'the family with the most units wins');
  assert.equal(roomKindOf([{ type: 'BUD' }, { type: 'WARDROBE' }]), 'kitchen', 'a tie goes to the first of kitchen, bedroom, bathroom');
  assert.equal(roomKindOf([]), 'kitchen');
  assert.equal(roomKindOf([{ type: 'FREE_PANEL' }]), 'kitchen', 'a unit of no family counts for nothing');
});

test('three tries, three different rooms of the same kind; everything about the furniture is the same in all three', () => {
  const n = visualNumbers(getCabinetProfile());
  for (const kind of ROOM_KINDS) {
    assert.equal(n.aiRooms[kind].length, 3, `three rooms for a ${kind}`);
    assert.equal(new Set(n.aiRooms[kind]).size, 3, `the three ${kind} rooms differ`);
    for (const r of n.aiRooms[kind]) assert.match(r, new RegExp(kind), `a ${kind} room says ${kind}`);
  }
  const ps = [1, 2, 3].map((attempt) => prompt({ finishes: FINISHES, attempt }));
  assert.equal(new Set(ps).size, 3, 'three different prompts');
  ps.forEach((p, i) => assert.ok(p.includes(`Set it in ${n.aiRooms.bedroom[i]}.`), `try ${i + 1} stands in bedroom room ${i + 1}`));
  const furniture = ps.map((p) => p.replace(/Set it in [^.]*\./, ''));
  assert.equal(new Set(furniture).size, 1, 'the prompt without its room is identical: the furniture does not change');
  for (const p of ps) assert.match(p, /Change only the room around the furniture/);
  assert.equal(roomOfAttempt('bedroom', 4, n), n.aiRooms.bedroom[0], 'a fourth try starts the rooms again');
});

test('a bathroom item gets bathroom rooms, a kitchen item kitchen rooms', () => {
  const n = visualNumbers(getCabinetProfile());
  const bath = buildPrompt({ design: DESIGN, units: [{ type: 'VANITY3' }], profile: getCabinetProfile(), attempt: 2 });
  assert.ok(bath.includes(`Set it in ${n.aiRooms.bathroom[1]}.`));
  const kit = buildPrompt({ design: DESIGN, units: [{ type: 'SINK' }], profile: getCabinetProfile(), attempt: 3 });
  assert.ok(kit.includes(`Set it in ${n.aiRooms.kitchen[2]}.`));
});

test('the rooms live in the profile: a profile\'s own visuals.aiRooms replaces them', () => {
  const own = { ...getCabinetProfile(), visuals: { aiRooms: { bedroom: ['a loft bedroom with brick walls'] } } };
  const p = buildPrompt({ design: DESIGN, units: WARDROBE, profile: own, attempt: 2 });
  assert.match(p, /Set it in a loft bedroom with brick walls\./);
  assert.equal(visualNumbers(own).aiTries, 3, 'the other numbers keep their defaults');
});

test('the card asks each try with its own room and keeps the prompt of the picture chosen (the card\'s Generate road)', async () => {
  const card = read('src/components/drawings/AiVisualCard.jsx');
  assert.match(card, /buildPrompt\(\{[^}]*attempt: k \}\)/, 'the card builds the prompt of try k');
  assert.match(card, /call: \(k\) =>/);
  assert.match(card, /prompt: pic\.prompt \|\| lastPrompt/);
  // The same road the card runs: generateRun hands each call its try number.
  const calls = [];
  const before = globalThis.apiFetch;
  globalThis.apiFetch = async (endpoint, options) => {
    calls.push(JSON.parse(options.body).prompt);
    return { data: { image: 'data:image/png;base64,AAAA', model: 'gpt-image-2.5-flare', seconds: 9 }, error: null };
  };
  try {
    const numbers = visualNumbers(getCabinetProfile());
    const run = await generateRun({
      tries: numbers.aiTries,
      call: (k) => visualise({ image: 'data:image/png;base64,AAAA', prompt: prompt({ attempt: k }), numbers }),
    });
    assert.equal(run.error, null);
  } finally { if (before === undefined) delete globalThis.apiFetch; else globalThis.apiFetch = before; }
  assert.equal(calls.length, 3);
  assert.equal(new Set(calls).size, 3, 'three calls, three rooms');
});

test('without a room the picture stays in daylight; with one the room names its own light', () => {
  const none = { ...getCabinetProfile(), visuals: { aiRooms: {} } };
  assert.match(buildPrompt({ design: DESIGN, units: WARDROBE, profile: none }), /Natural daylight/);
  assert.doesNotMatch(prompt({ attempt: 3 }), /Natural daylight/, 'the evening room is not told it is daylight');
  assert.match(prompt({ attempt: 3 }), /No people, no text, no labels, no dimensions\./);
});
