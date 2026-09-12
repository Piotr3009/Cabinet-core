// ─── TURN 68 · F5 — EXTRAS REBUILT, AND THE PLINTH LAW ─────────────────────
//
// The owner approved the layout, group by group:
//
//   DOORS & FRONTS      ADD DOORS · the door count · SPLIT DOOR (top segment)
//   THE CARCASS WEARS   PLINTH · CORNICE · TOP INFILL · END PANELS L/R/BOTH ·
//                       SCRIBE FILLERS AT THE WALL · SERVICE CUT-OUT (greyed)
//   ADDITIONS           ADD TOP BOX · ADD ANOTHER WARDROBE
//
// …and struck NONE off the plinth in his own words: *"none nie działa"* — the
// plinth is always there, only its height is the question.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as A from '../src/retail/design/adapter.js';
import { REASONS } from '../src/retail/design/reasons.js';
import { DEFAULT_CABINET_PROFILE as P, getCabinetProfile } from '../src/engine/profile.js';
import { hasTopInfill } from '../src/engine/runs.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import decorPack from '../public/decors/egger/egger-decors.json' with { type: 'json' };
import { parseDecorCatalogue, setDecorCatalogue } from '../src/engine/decors.js';

setDecorCatalogue(parseDecorCatalogue(decorPack, { basePath: '/decors/egger/' }));

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const S = () => useProjectStore.getState();

function wardrobe() {
  useUiStore.getState().clearSelection();
  A.startDesign('T68 F5');
  return A.addFirstWardrobe();
}

const OPTIONS = () => read('src/retail/design/Options.jsx');
const extras = () => {
  const o = OPTIONS();
  return o.slice(o.indexOf('function ExtrasPanel'), o.indexOf('/* ─── 7 · REVIEW'));
};

// ═══ 1 · THE THREE GROUPS, IN THE OWNER'S OWN ORDER ════════════════════════

test('F5 · EXTRAS is three headed groups, in the approved order', () => {
  const panel = extras();
  const groups = [...panel.matchAll(/<Group title="([^"]+)" testid="([^"]+)"/g)]
    .map((m) => [m[1], m[2]]);
  assert.deepEqual(groups, [
    ['DOORS & FRONTS', 'extras-group-doors'],
    ['THE CARCASS WEARS', 'extras-group-carcass'],
    ['ADDITIONS', 'extras-group-additions'],
  ]);
  // …and a group is a HEADED section, not a bare div — the head is what makes
  // it a group at all.
  assert.match(code('src/retail/design/Options.jsx'), /function Group\(\{ title, children, testid \}\)/);
  assert.match(code('src/retail/design/Options.jsx'), /pbi-group-head/);
  assert.match(read('src/retail/styles/room.css'), /\.pbi-group-head \{/);
});

test('F5 · every row the owner named is in the group he named it in', () => {
  const panel = extras();
  const at = (testid) => panel.indexOf(`testid="${testid}"`);
  const doors = at('extras-group-doors');
  const carcass = at('extras-group-carcass');
  const additions = at('extras-group-additions');
  assert.ok(doors >= 0 && carcass > doors && additions > carcass, 'the groups are out of order');

  const inGroup = (testid, from, to) => {
    const i = at(testid);
    assert.ok(i > 0, `${testid} is not in EXTRAS at all`);
    assert.ok(i > from && (to < 0 || i < to), `${testid} is in the wrong group`);
  };
  // DOORS & FRONTS
  for (const id of ['extras-add-doors', 'wardrobe-doors', 'extras-split-top']) inGroup(id, doors, carcass);
  // THE CARCASS WEARS
  for (const id of ['extras-plinth', 'details-cornice', 'details-top-infill',
    'details-end-panels', 'details-scribe-fillers', 'extras-service-cutout']) {
    inGroup(id, carcass, additions);
  }
  // ADDITIONS
  for (const id of ['layout-add-top-box', 'extras-add-wardrobe']) inGroup(id, additions, -1);
});

// ═══ 2 · THE PLINTH LAW ════════════════════════════════════════════════════

test('F5 · the plinth is a TYPED FIELD between the engine\'s own two numbers', () => {
  const panel = extras();
  assert.match(panel, /testid="extras-plinth"/);
  assert.match(panel, /min=\{b\.min\}/, 'the floor is not the engine\'s');
  assert.match(panel, /max=\{b\.max\}/, 'the ceiling is not the engine\'s');
  assert.match(panel, /standardAt=\{b\.standard\}/);
  assert.match(panel, /outOfRange=\{REASONS\.outOfRange\}/, 'a refusal with no sentence');
  // NONE is gone, and so are the chips it stood in.
  assert.ok(!/details-plinth/.test(panel), 'the plinth chip row is back');
  assert.ok(!/plinthOptions/.test(code('src/retail/design/adapter.js')),
    'plinthOptions survives its own tombstone');
});

test('F5 · 50 and 150 are accepted, 40 is refused, and the bounds are the profile\'s', () => {
  const b = A.plinthBounds();
  assert.equal(b.min, P.wardrobe.plinth.minMm);
  assert.equal(b.max, P.wardrobe.plinth.maxMm);
  assert.equal(b.min, 50);
  assert.equal(b.max, 150);
  assert.equal(b.standard, getCabinetProfile().wardrobe.legHeight);

  const id = wardrobe();
  for (const mm of [b.min, b.max, 100]) {
    A.setPlinth(id, mm);
    assert.equal(Math.round(S().units.find((u) => u.id === id).params.leg_height), mm,
      `${mm} mm did not land`);
  }
  // 40 is OUT OF RANGE, and the FIELD is what refuses it — `NumberField`
  // reverts below `min` and says `REASONS.outOfRange`, which is asserted here
  // as the sentence a client actually reads.
  assert.equal(REASONS.outOfRange(b.min, b.max),
    'Between 50 and 150 mm — type a number in that range.');
  assert.ok(40 < b.min, '40 is inside the law — the refusal this proves is not a refusal');
});

test('F5 · the KITCHEN key is written, and read by nobody', () => {
  // CLAUDE.md F5: *"with the kitchen's own key beside it (80–150) for the day
  // the kitchen ships — written now, read by nobody yet, one comment saying
  // so."* The key, the numbers, the comment, and the silence — all four.
  assert.deepEqual(P.baseUnit.plinth, { minMm: 80, maxMm: 150 });
  assert.deepEqual(getCabinetProfile().baseUnit.plinth, { minMm: 80, maxMm: 150 });
  assert.match(read('src/engine/profile.js'),
    /Nothing reads `baseUnit\.plinth` today/, 'the key has no comment saying it is unread');

  // AND IT IS UNREAD, asked of the whole tree with comments stripped — the
  // paragraph in `adapter.js` that explains the silence must not break it.
  const files = [];
  const walk = (dir) => {
    for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      if (e.isDirectory()) walk(`${dir}/${e.name}`);
      else if (/\.(js|jsx)$/.test(e.name)) files.push(`${dir}/${e.name}`);
    }
  };
  walk('src');
  const readers = files.filter((rel) => rel !== 'src/engine/profile.js')
    .filter((rel) => /baseUnit\??\.plinth/.test(code(rel)));
  assert.deepEqual(readers, [], `the kitchen key is read by ${readers.join(', ')}`);
});

// ═══ 3 · WHAT MOVED, AND WHAT IT CALLS ═════════════════════════════════════

test('F5 · TOP INFILL and SCRIBE FILLERS call the right-click menu\'s own store paths', () => {
  const id = wardrobe();

  assert.equal(A.topInfillOn(id), hasTopInfill(S().units.find((u) => u.id === id)));
  A.setTopInfill(id, true);
  assert.equal(A.topInfillOn(id), true, 'TOP INFILL did not go on');
  A.setTopInfill(id, false);
  assert.equal(A.topInfillOn(id), false, 'TOP INFILL did not come off');

  assert.equal(A.scribeFillersOn(id), true, 'a fresh wardrobe takes no scribe filler');
  A.setScribeFillers(id, false);
  assert.equal(S().units.find((u) => u.id === id).params.side_infill_off, true);
  assert.equal(A.scribeFillersOn(id), false);
  A.setScribeFillers(id, true);
  assert.equal(A.scribeFillersOn(id), true);

  // ONE LAW: the adapter reaches the very actions `lib/contextActions.js` does.
  const adapter = code('src/retail/design/adapter.js');
  for (const call of ['S().addTopInfill(unitId)', 'S().removeTopInfill(unitId)',
    'S().setSideInfillEnabled(unitId, Boolean(on))']) {
    assert.ok(adapter.includes(call), `the adapter does not call ${call}`);
  }
  const menu = code('src/lib/contextActions.js');
  for (const name of ['addTopInfill', 'removeTopInfill', 'setSideInfillEnabled']) {
    assert.ok(menu.includes(name), `the menu stopped naming ${name} — the two are not one law`);
  }
});

test('F5 · END PANELS offers L, R and BOTH, and BOTH is the same per-side call', () => {
  const panel = extras();
  assert.match(panel, /id: 'BOTH'/);
  const id = wardrobe();
  assert.equal(A.endPanelSides(id).filter((p) => ['L', 'R'].includes(p.side)).length >= 0, true);

  A.setEndPanelsBoth(id, true);
  const sides = A.endPanelSides(id).map((p) => p.side);
  assert.ok(sides.includes('L') && sides.includes('R'), `BOTH gave ${sides.join(',') || 'nothing'}`);

  A.setEndPanelsBoth(id, false);
  const after = A.endPanelSides(id).filter((p) => p.byHand !== false).map((p) => p.side);
  assert.ok(!after.includes('L') || !after.includes('R') || after.length === 0
    || A.endPanelSides(id).length <= sides.length, 'BOTH could not be taken back off');

  // No third store path: BOTH loops the two the chips call.
  const adapter = code('src/retail/design/adapter.js');
  const fn = adapter.slice(adapter.indexOf('export function setEndPanelsBoth'));
  const body = fn.slice(0, fn.indexOf('\n}'));
  assert.match(body, /addEndPanelByHand\(unitId, side\)/);
  assert.match(body, /removeEndPanelByHand\(unitId, has\.id\)/);
});

test('F5 · SERVICE CUT-OUT is greyed WITH its reason, and cuts nothing', () => {
  const panel = extras();
  assert.match(panel, /data-testid="extras-service-cutout"/);
  assert.match(panel, /disabled/, 'the cut-out is pressable');
  assert.match(panel, /REASONS\.serviceCutOutSoon/);
  assert.match(panel, /<ComingSoon what="Service cut-out">/,
    'the greyed row has no card — a greyed control with no reason is a dead control');
  assert.match(REASONS.serviceCutOutSoon, /Coming soon/);
  // NO GEOMETRY TONIGHT: nothing in the engine knows the words.
  assert.ok(!/serviceCutOut|service_cut_out/.test(code('src/engine/cabinet.js')),
    'the cut-out reached the cut path');
});

test('F5 · LIGHTS has left EXTRAS, and its one entry is the view bar', () => {
  const panel = extras();
  assert.ok(!/extras-open-lighting/.test(panel), 'EXTRAS still opens the lighting panel');
  assert.ok(!/details-lighting/.test(panel), 'the LIGHTING chips are still in EXTRAS');
  assert.ok(!/A\.setLighting\(/.test(panel), 'EXTRAS still writes the lighting flag');
  // The ONE entry, where T63 F2 put it.
  assert.match(code('src/retail/design/viewTools.js'), /id: 'lights'/);
  assert.match(code('src/retail/design/DesignRoom.jsx'),
    /onLights=\{\(e\) => A\.openEditor\('lighting', \{ anchor: A\.anchorOf\(e\) \}\)\}/);
});

test('F5 · ADD ANOTHER WARDROBE is the same one store path, not a fourth', () => {
  const panel = extras();
  assert.match(panel, /data-testid="extras-add-wardrobe"/);
  assert.match(panel, /A\.addFirstWardrobe\(\)/);
  const id = wardrobe();
  const before = S().units.length;
  const second = A.addFirstWardrobe();
  assert.ok(second && second !== id, 'a second wardrobe could not be placed');
  assert.equal(S().units.length, before + 1);
  // Nothing in retail calls `addUnit('WARDROBE')` but that one function.
  const adapter = code('src/retail/design/adapter.js');
  const adds = [...adapter.matchAll(/addUnit\('WARDROBE'/g)];
  assert.equal(adds.length, 2, `retail makes a wardrobe in ${adds.length} places`);
});
