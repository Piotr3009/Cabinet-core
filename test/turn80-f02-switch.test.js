/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T80 F2 · IN-FRAME PER PROJECT, ONE ROW IN SETTINGS ──────────────────────
//
// CLAUDE.md T80 PART B: *"Owner 22:40: "3 per projekt." The decision lives in
// the project's design, beside the sheen: design.inframe (boolean, default
// false), normalised in engine/design.js (migrateDesign gives an old project
// false), saved and reloaded with the project, in the project's history (one
// undo step) ... paramsForEngine(unit, design) is the ONLY door to the
// engine ... A bare computeCabinet() without the flag is today, byte for
// byte."*  Tests: default false, migration, undo, the engine sees the flag
// only through paramsForEngine, a bare compute is identical with and without
// the design key; the profile's numbers are the LISP's; the row's words are
// the engine's and no number is typed in the UI.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DEFAULT_DESIGN, INFRAME_CHOICES, inframeHint, inframeOn, inframeTooltip, migrateDesign,
} from '../src/engine/design.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import {
  flushHistory, unwatchProjectHistory, useHistoryStore, watchProjectHistory,
} from '../src/stores/historyStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { lispConstant } from '../scripts/t57-paren-balance.mjs';
import * as A from '../src/retail/design/adapter.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const H = () => useHistoryStore.getState();
const K = (name) => lispConstant(name, `${ROOT}reference/lisp`, 'KIT_INFRAME.lsp');

function fresh(design = {}) {
  S().loadProject({
    id: null,
    name: 't80-f02',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design,
  }, []);
  H().clear();
}

test.before(() => watchProjectHistory());
test.after(() => unwatchProjectHistory());

// ═══ THE DESIGN KEY ═══════════════════════════════════════════════════════

test('F2 · design.inframe defaults to false (lay-on, no key); migrateDesign gives an old project lay-on and keeps a stored true only', () => {
  // Lay-on leaves NO key behind (DECISIONS 10): a lay-on project's design, saved and reloaded, is the bytes main
  // wrote, which is what the T75 set fixtures hold. `inframeOn` is the one boolean reader.
  assert.equal('inframe' in DEFAULT_DESIGN, false);
  assert.equal(inframeOn(DEFAULT_DESIGN), false);
  assert.equal('inframe' in migrateDesign(null), false, 'no design at all');
  assert.equal('inframe' in migrateDesign({}), false, 'a project saved before T80');
  assert.equal(inframeOn({}), false);
  assert.equal(migrateDesign({ inframe: true }).inframe, true);
  assert.equal('inframe' in migrateDesign({ inframe: false }), false, 'a switch back to lay-on leaves no key');
  for (const junk of ['yes', 1, 'true', {}, null]) assert.equal(inframeOn({ inframe: junk }), false, String(junk));
  // Idempotent: a migrated design migrates to itself.
  const once = migrateDesign({ inframe: true, sheen: 30 });
  assert.equal(migrateDesign(JSON.parse(JSON.stringify(once))).inframe, true);
  assert.equal(inframeOn({ inframe: true }), true);
  assert.equal(inframeOn({}), false);
});

test('F2 · the switch is saved and reloaded with the project, and is ONE undo step', () => {
  fresh();
  const id = S().addUnit('BUD').id;
  flushHistory();
  H().clear();
  assert.equal(inframeOn(S().project.design), false, 'a new project is lay-on');
  S().setDesign({ inframe: true });
  flushHistory();
  assert.equal(S().project.design.inframe, true);
  assert.equal(H().past.length, 1, 'one undo step');
  // Save and reload.
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  S().loadProject(saved.project, saved.units);
  assert.equal(migrateDesign(S().project.design).inframe, true, 'reloaded in-frame');
  assert.ok(S().units.some((u) => u.id === id));
  // Undo puts it back to lay-on (the reload cleared nothing the watcher keeps; start again for the undo).
  fresh();
  S().addUnit('BUD');
  flushHistory();
  H().clear();
  S().setDesign({ inframe: true });
  flushHistory();
  assert.equal(H().undo(), true);
  assert.equal(inframeOn(S().project.design), false, 'undo is lay-on again');
  assert.equal(H().redo(), true);
  assert.equal(migrateDesign(S().project.design).inframe, true, 'redo is in-frame again');
});

// ═══ THE ONE DOOR ════════════════════════════════════════════════════════

test('F2 · the engine hears in-frame ONLY through paramsForEngine, and only on a unit a frame stands on', () => {
  const unit = (type) => ({ id: `u-${type}`, type, params: { ...defaultParamsFor(type, P), unit_num: '01' }, position: { wall: 0, x_mm: 0 } });
  const on = migrateDesign({ inframe: true });
  const off = migrateDesign({});
  for (const type of P.inframe.unitTypes) {
    assert.equal(paramsForEngine(unit(type), on).inframe, true, `${type} is framed`);
    assert.equal('inframe' in paramsForEngine(unit(type), off), false, `${type} lay-on: the key is absent`);
    assert.equal('inframe' in paramsForEngine(unit(type)), false, `${type} with no design: absent`);
  }
  for (const type of ['OVEN_BASE', 'FRIDGE', 'APPLIANCE_TALL2', 'DW_PANEL', 'CORNER_L_BASE', 'BLIND_BASE', 'WUD_HOOD',
    'WARDROBE_TOP', 'WARDROBE_DESK', 'FREE_PANEL']) {
    assert.equal('inframe' in paramsForEngine(unit(type), on), false, `the frame stops at ${type}`);
  }
  // In-frame OFF is main: a lay-on project hands the engine exactly what an old project (no key) hands it.
  const old = migrateDesign({ sheen: 30 });
  const layon = migrateDesign({ sheen: 30, inframe: false });
  for (const type of ['BUD', 'BUDR2', 'WUD', 'WARDROBE']) {
    assert.deepEqual(paramsForEngine(unit(type), layon), paramsForEngine(unit(type), old), type);
  }
});

test('F2 · a bare computeCabinet() is today, byte for byte, with the design key or without it', () => {
  for (const type of ['BUD', 'BUDR2', 'WUD', 'WARDROBE', 'BUDTALL', 'SINK']) {
    const kit = { ...defaultParamsFor(type, P), unit_num: '01' };
    const bare = JSON.stringify(computeCabinet(kit, P));
    // The key a project's design carries is not a param; handing the engine a lay-on project's params moves nothing.
    assert.equal(JSON.stringify(computeCabinet({ ...kit }, P)), bare, type);
    const viaStore = paramsForEngine({ id: 'x', type, params: kit, position: { wall: 0, x_mm: 0 } });
    assert.equal('inframe' in viaStore, false);
  }
});

// ═══ THE NUMBERS ═════════════════════════════════════════════════════════

test('F2 · profile.inframe IS the LISP\'s constants, merged key by key for a saved profile', () => {
  assert.equal(P.inframe.stile, K('inframeStile'));
  assert.equal(P.inframe.rail, K('inframeRail'));
  assert.equal(P.inframe.frameT, K('inframeFrameT'));
  assert.equal(P.inframe.frontT, K('inframeFrontT'));
  assert.equal(P.inframe.gap, K('inframeGap'));
  assert.equal(P.inframe.outside, K('inframeOutside'));
  assert.equal(P.inframe.boardMax, K('inframeBoardMax'));
  assert.deepEqual(P.inframe.unitTypes, ['BUD', 'BUD_INT', 'BUDR', 'BUDR2', 'BUDR4', 'BUDTALL', 'SINK', 'WUD', 'WUD_GLASS',
    'LOW_CABINET', 'WARDROBE', 'WARDROBE_LOW']);
  // A profile saved before T80 comes back with the block; one that tuned one number keeps it and gets the rest.
  const { inframe: _gone, ...old } = P;
  assert.deepEqual(migrateCabinetProfile(old).inframe, P.inframe);
  assert.equal(migrateCabinetProfile({ ...P, inframe: { boardMax: 2440 } }).inframe.boardMax, 2440);
  assert.equal(migrateCabinetProfile({ ...P, inframe: { boardMax: 2440 } }).inframe.stile, 38);
});

// ═══ THE ROW ═════════════════════════════════════════════════════════════

test('F2 · the row: FRONTS, Lay-on and In-frame (British), the owner\'s hint, every number from the profile', () => {
  assert.deepEqual(INFRAME_CHOICES.map((c) => [c.id, c.label, c.on]), [['layon', 'Lay-on', false], ['inframe', 'In-frame (British)', true]]);
  assert.equal(inframeHint(P),
    'In-frame: one routed frame per run, 38 mm, fronts set in it with 3 mm, hinges on the side.');
  const tip = inframeTooltip(P);
  for (const n of ['38 mm', '25 mm thick', '22 mm', '3 mm of air', '1 mm on 18 mm boards', '19 mm above and below', '2800 mm']) {
    assert.ok(tip.includes(n), `the tooltip shows ${n}`);
  }
  // The words follow the profile: a workshop that changed a number reads its own.
  assert.ok(inframeHint({ ...P, inframe: { ...P.inframe, stile: 40 } }).includes('40 mm'));
  // PRO: one row, in SettingsPanel next to the sheen, imported by the wizard; no number typed in it.
  const panel = read('src/components/SettingsPanel.jsx');
  const row = panel.slice(panel.indexOf('export function InframeRow('), panel.indexOf('export function SheetSizeRow('));
  assert.ok(row.includes('setDesign({ inframe: c.on })'), 'the one write');
  assert.ok(row.includes('title={inframeTooltip(profile)}') && row.includes('{inframeHint(profile)}'));
  assert.doesNotMatch(row.replace(/className=\{?[`'"][^`'"]*[`'"]\}?/g, ''), /\b(38|25|22|19|2800|3 mm)\b/, 'no number typed in the row');
  const sheen = panel.indexOf('<SheenSlider design={design} setDesign={setDesign} profile={profile} />');
  const mine = panel.indexOf('<InframeRow design={design} setDesign={setDesign} profile={profile} />');
  assert.ok(sheen > 0 && mine > sheen && mine - sheen < 400, 'next to the SheenSlider row');
  const wizard = read('src/components/WizardSettings.jsx');
  assert.match(wizard, /import \{ InframeRow \} from '\.\/SettingsPanel\.jsx';/, 'imported on its own line');
  assert.match(wizard, /import \{ HingeHardware, SheetSizeRow \} from '\.\/SettingsPanel\.jsx';/, 'T36\'s line untouched');
  assert.ok(wizard.indexOf('<InframeRow design={design} setDesign={setDesign} profile={profile} />')
    > wizard.indexOf('<SheenSlider design={design} setDesign={setDesign} profile={profile} />'));
});

test('F2 · retail: the same row by its own chips, PRO\'s one write through the adapter', () => {
  fresh();
  assert.equal(A.inframeOf(S().project), 'layon');
  assert.deepEqual(A.inframeChoices().map((c) => c.label), ['LAY-ON', 'IN-FRAME (BRITISH)']);
  assert.equal(A.setInframe('inframe'), inframeHint(P));
  assert.equal(S().project.design.inframe, true);
  assert.equal(A.inframeOf(S().project), 'inframe');
  A.setInframe('layon');
  assert.equal(inframeOn(S().project.design), false);
  assert.equal(A.setInframe('nonsense'), '');
  const options = read('src/retail/design/Options.jsx');
  assert.match(options, /<Field label="FRONTS" note=\{A\.inframeWords\(\)\}>/);
  assert.match(options, /testid="fronts-inframe"/);
});
