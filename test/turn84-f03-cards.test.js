/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F3 · THE QUICK CARDS (CLAUDE.md T84 PART B, F3)
//
// CLAUDE.md T84 F3: *"Tests `test/turn84-f03-cards.test.js`: every type in
// `UNIT_TYPES` yields a card of at most six rows; a BUD card has no Drawers
// row and a BUDR no Doors row; a corner's first and third rows read Arm A and
// Arm B; every row's action is one of the store's own names (a list in the
// test, no new setter); a type with no plinth has no Plinth row; the seven
// typed cards match the contract row for row."*  LAW 3, THE CARD NEVER LIES:
// *"a field the type does not have is absent, never disabled as a promise.
// Every card row commits through the existing setter with the existing
// refusal (`roomFitRefusalFor` first), and surfaces the notice it returns."*
//
// The cards are worked out by a pure module (components/studio/lib/
// studioCards.js), so the units here are the store's own, placed by its own
// `addUnit` in a 6000 x 4000 room as the census places them, and the rows'
// commits are driven through the store's own actions. The two .jsx files are
// read as source (a test never imports JSX).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getCabinetProfile } from '../src/engine/profile.js';
import { rectCorners } from '../src/engine/room.js';
import { UNIT_TYPES, defaultParamsFor, floatHeightOf, getUnitType } from '../src/engine/types.js';
import { takesPlinth } from '../src/engine/autoparts.js';
import { liftTakesKit } from '../src/engine/liftSystems.js';
import { freePanelOf } from '../src/engine/freePanel.js';
import { bayWidthsOf } from '../src/engine/partitionPositions.js';
import { formatMm } from '../src/engine/format.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import {
  CARD_ACTIONS, CARD_KINDS, CARD_STORE_ACTIONS, MIRROR_BAYS_WARNING, SUMMARY_CALLS, callAction,
  capabilitiesOf, cardFor, cardKindOf, cardTitleOf, commitRow, doorsSummary, drawersSummary, finishSummary,
  frontSystemPatch, frontTypePatch, isSameValue, libraryRowOf, pocketCoversOf, readAnswer,
} from '../src/components/studio/lib/studioCards.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const P = getCabinetProfile();
const S = () => useProjectStore.getState();

/** The type's default unit, placed by the store's own action, as the census places it. */
function placed(typeId) {
  S().newProject(`T84 F3 ${typeId}`);
  S().setRoom({ corners: rectCorners(6000, 4000), height: 2700 });
  // An L stands in a room corner only (projectStore.js, T75 F4): the census's x 10.
  const made = S().addUnit(typeId, { wall: 0, x: getUnitType(typeId).corner ? 10 : 1200 });
  assert.ok(made?.id, `${typeId} was placed`);
  return made.id;
}
const unitOf = (id) => S().units.find((u) => u.id === id);
const cardOf = (id, extra = {}) => cardFor(unitOf(id), {
  profile: P,
  result: S().unitResult(id),
  design: S().project.design,
  units: S().units,
  runElements: S().runElements,
  figures: S().pocketFiguresFor(id),
  category: 'kitchen',
  ...extra,
});
const labels = (card) => card.rows.map((r) => r.label);
const rowOf = (card, key) => card.rows.find((r) => r.key === key) || null;

// ─── THE STORE'S OWN NAMES (a list in the test, no new setter) ──────────────

const OWN_NAMES = {
  'src/stores/projectStore.js': [
    'roomFitRefusalFor', 'updateUnitParams', 'resetUnitHeight', 'addPlinth', 'removePlinth',
    'setVanityDrawers', 'setMirrorCabinet', 'setPocket', 'setPocketCovers',
  ],
  // openModal, openRightPanel, setPanelSection and notify are main's; showFullSettings and
  // hideInspector the Studio inspector's (verify/t84/agents/CONTRACT.md, section 4).
  'src/stores/uiStore.js': [
    'openModal', 'openRightPanel', 'setPanelSection', 'showFullSettings', 'hideInspector', 'notify',
  ],
};
const OWN = Object.values(OWN_NAMES).flat();

/** Every store name a row (its chips, its button, the height's Reset) carries. */
function namesOf(card) {
  const out = [];
  for (const row of card.rows) {
    if (row.action != null) out.push(row.action);
    if (row.refusal) out.push(row.refusal);
    out.push(...(row.calls || []));
    if (row.button) out.push(row.button.action);
  }
  if (card.inherit?.reset) out.push(card.inherit.reset.action);
  return out;
}

test('T84 F3 · every name a card row may call is the store\'s own, already in its source', () => {
  for (const [file, names] of Object.entries(OWN_NAMES)) {
    const src = read(file);
    for (const name of names) {
      assert.match(src, new RegExp(`^  ${name}: `, 'm'), `${file} defines ${name}`);
    }
  }
  assert.deepEqual([...CARD_ACTIONS].sort(), [...OWN].sort(), 'the card adds no name of its own');
  assert.deepEqual([...CARD_STORE_ACTIONS.projectStore].sort(), [...OWN_NAMES['src/stores/projectStore.js']].sort());
  assert.deepEqual([...CARD_STORE_ACTIONS.uiStore].sort(), [...OWN_NAMES['src/stores/uiStore.js']].sort());
  assert.deepEqual([...SUMMARY_CALLS], ['openRightPanel', 'setPanelSection', 'showFullSettings']);
});

test('T84 F3 · every type in UNIT_TYPES yields a card of at most six rows, each row the store\'s own, none disabled', () => {
  const max = P.ui.studio.cardRowsMax;
  assert.equal(max, 6, 'profile.ui.studio.cardRowsMax is the six of CLAUDE.md F3');
  for (const typeId of Object.keys(UNIT_TYPES)) {
    const id = placed(typeId);
    const card = cardOf(id);
    assert.ok(card, `${typeId} has a card`);
    assert.ok(CARD_KINDS.includes(card.kind), `${typeId}: ${card.kind}`);
    assert.ok(card.rows.length > 0 && card.rows.length <= max, `${typeId}: ${card.rows.length} rows`);
    for (const name of namesOf(card)) assert.ok(OWN.includes(name), `${typeId}: ${name} is a store's own name`);
    for (const row of card.rows) {
      assert.ok(!('disabled' in row), `${typeId} ${row.key}: a row is absent, never disabled`);
      for (const option of row.options || []) assert.ok(!('disabled' in option), `${typeId} ${row.key}: no disabled option`);
      if (row.kind === 'number' || row.kind === 'select') assert.equal(typeof row.args, 'function', `${typeId} ${row.key} writes`);
      if (row.kind === 'chips') for (const o of row.options) assert.ok(Array.isArray(o.args), `${typeId} ${row.key} ${o.key}`);
    }
    assert.equal(new Set(card.rows.map((r) => r.key)).size, card.rows.length, `${typeId}: one row a key`);
    // And a bare unit (no result, no store): the same rule, the same limit.
    const bare = cardFor({ id: 'u-bare', type: typeId, params: defaultParamsFor(typeId, P), position: { wall: 0, x_mm: 0 } }, { profile: P });
    assert.ok(bare.rows.length > 0 && bare.rows.length <= max, `${typeId} bare: ${bare.rows.length} rows`);
  }
});

test('T84 F3 · the capability table is read from engine/types.js at run time, never typed', () => {
  for (const [typeId, type] of Object.entries(UNIT_TYPES)) {
    const caps = capabilitiesOf(typeId, P);
    assert.equal(caps.doors, Boolean(type.supports?.doors), `${typeId} doors`);
    assert.equal(caps.drawers, Boolean(type.supports?.drawers), `${typeId} drawers`);
    assert.equal(caps.mount, type.mount, `${typeId} mount`);
    assert.equal(caps.corner, Boolean(type.corner), `${typeId} corner`);
    assert.equal(caps.plinth, takesPlinth(typeId, P) && type.mount === 'floor', `${typeId} plinth`);
    assert.equal(caps.lift, liftTakesKit(type), `${typeId} lift`);
    assert.equal(caps.card, cardKindOf(typeId));
    for (const name of caps.builders.store) assert.match(read('src/stores/projectStore.js'), new RegExp(`^  ${name}: `, 'm'), `${typeId} builder ${name}`);
  }
  const src = read('src/components/studio/lib/studioCards.js');
  assert.doesNotMatch(src, /\b(?:doors|drawers|plinth|corner)\s*:\s*(?:true|false)\b/, 'no capability typed as a literal');
  assert.match(src, /type\.supports\?\.doors/);
  assert.match(src, /takesPlinth\(type\.id, profile\) && type\.mount === 'floor'/);
  assert.match(src, /liftTakesKit\(type\)/);
});

test('T84 F3 · a BUD card has no Drawers row and a BUDR no Doors row; BUD_INT shows both', () => {
  const bud = cardOf(placed('BUD'));
  assert.equal(rowOf(bud, 'drawers'), null);
  assert.ok(rowOf(bud, 'doors'));
  for (const typeId of ['BUDR', 'BUDR2', 'BUDR4']) {
    const budr = cardOf(placed(typeId));
    assert.equal(rowOf(budr, 'doors'), null, `${typeId} has no Doors row`);
    assert.ok(rowOf(budr, 'drawers'), `${typeId} has its Drawers row`);
  }
  const both = cardOf(placed('BUD_INT'));
  assert.ok(rowOf(both, 'doors') && rowOf(both, 'drawers'));
});

test('T84 F3 · a corner\'s first and third rows read Arm A and Arm B, the setter and the room the same', () => {
  const corners = Object.keys(UNIT_TYPES).filter((t) => UNIT_TYPES[t].corner);
  assert.deepEqual(corners.sort(), ['CORNER_L_BASE', 'CORNER_L_WALL', 'CORNER_L_WARDROBE']);
  for (const typeId of corners) {
    const card = cardOf(placed(typeId));
    assert.deepEqual(card.rows.slice(0, 3).map((r) => r.label), ['Arm A', 'Height', 'Arm B'], typeId);
    assert.deepEqual(card.rows.slice(0, 3).map((r) => r.key), ['width', 'height', 'depth'], typeId);
    assert.deepEqual(card.rows[0].args(900), [{ width: 900 }]);
    assert.deepEqual(card.rows[2].args(700), [{ depth: 700 }]);
    assert.equal(card.rows[0].refusal, 'roomFitRefusalFor');
  }
});

test('T84 F3 · a type with no plinth has no Plinth row; a base or generic kit that takes one has it', () => {
  for (const typeId of Object.keys(UNIT_TYPES)) {
    const card = cardOf(placed(typeId));
    const takes = takesPlinth(typeId, P) && UNIT_TYPES[typeId].mount === 'floor';
    if (!takes) assert.equal(rowOf(card, 'plinth'), null, `${typeId} takes no plinth`);
    if (takes && (card.kind === 'base' || card.kind === 'generic')) assert.ok(rowOf(card, 'plinth'), `${typeId} has its Plinth row`);
  }
  // Add / Remove, the height derived (RightPanel.jsx:1376-1408).
  const id = placed('BUD');
  let plinth = rowOf(cardOf(id), 'plinth');
  assert.equal(unitOf(id).params.plinth, true, 'a BUD is born with its plinth');
  assert.deepEqual(plinth.button, { label: 'Remove', action: 'removePlinth' });
  assert.equal(plinth.text, formatMm(S().unitResult(id).assemblies.carcass.legHeight, { unit: true }));
  callAction(S(), 'removePlinth', id);
  plinth = rowOf(cardOf(id), 'plinth');
  assert.deepEqual(plinth.button, { label: 'Add plinth', action: 'addPlinth' });
  assert.equal(plinth.text, 'not fitted');
  assert.equal(callAction(S(), 'addPlinth', id).ok, true);
  assert.equal(unitOf(id).params.plinth, true);
});

// ─── THE SEVEN TYPED CARDS, ROW FOR ROW (the designer's contract) ───────────

test('T84 F3 · Base: Width · Height · Depth · Doors · Drawers · Plinth, the doors summary to the Doors section', () => {
  // Each `placed` starts a project of its own: the two other base kits first.
  assert.deepEqual(labels(cardOf(placed('BUDR'))), ['Width', 'Height', 'Depth', 'Drawers', 'Plinth']);
  assert.deepEqual(labels(cardOf(placed('BUD_INT'))), ['Width', 'Height', 'Depth', 'Doors', 'Drawers', 'Plinth']);
  const id = placed('BUD');
  let card = cardOf(id);
  assert.equal(card.kind, 'base');
  assert.deepEqual(labels(card), ['Width', 'Height', 'Depth', 'Doors', 'Plinth']);
  const width = rowOf(card, 'width');
  assert.equal(width.value, unitOf(id).params.width);
  assert.equal(width.refusal, 'roomFitRefusalFor');
  assert.equal(width.action, 'updateUnitParams');
  assert.deepEqual(width.calls, ['roomFitRefusalFor', 'updateUnitParams']);
  assert.deepEqual(width.args(920), [{ width: 920 }]);
  let doors = rowOf(card, 'doors');
  assert.equal(doors.kind, 'summary');
  assert.equal(doors.section, 'doors');
  assert.deepEqual(doors.calls, [...SUMMARY_CALLS]);
  assert.equal(doors.text, 'none yet', 'the Doors badge\'s own words before the doors (RightPanel.jsx:1606)');
  S().addDoors(id);
  card = cardOf(id);
  doors = rowOf(card, 'doors');
  const leaves = S().unitResult(id).panels.filter((p) => p.part === 'FRONT' && p.role === 'front' && p.meta?.hinge);
  const n = S().unitResult(id).derived.doors;
  assert.equal(doors.text, `${n} door${n === 1 ? '' : 's'} · ${leaves.map((p) => p.meta.hinge).join(' / ')}`);
  assert.equal(doors.text, doorsSummary(unitOf(id), S().unitResult(id)));
  assert.equal(doorsSummary({ params: { doors: false } }, null), 'none yet');
  callAction(S(), 'updateUnitParams', id, [{ width: 900 }]);
  const two = rowOf(cardOf(id), 'doors').text;
  assert.match(two, /^2 doors · [LR] \/ [LR]$/, `a pair reads as CLAUDE.md's "2 doors · L / R": ${two}`);
  // A split leaf is still one door (its two segments carry `meta.splitOf`).
  S().setSplitTop(id, 300);
  assert.ok(S().unitResult(id).panels.some((p) => p.meta?.splitOf), 'the leaves are split');
  assert.equal(rowOf(cardOf(id), 'doors').text, two);
  // The Drawers summary goes to the contents section, titled "Section 1" (p1-registry.md row 25).
  const budr = placed('BUDR');
  const drawers = rowOf(cardOf(budr), 'drawers');
  assert.equal(drawers.section, 'contents');
  assert.match(drawers.text, /^3 × drawer$/);
  assert.equal(drawers.text, drawersSummary(unitOf(budr)));
  assert.equal(drawersSummary({ params: { sections: [{ items: [] }] } }), 'none yet');
});

test('T84 F3 · Wall: Width · Height · Depth · Mount height · Doors · Front opening, only where a lift takes the kit and doors hang', () => {
  const id = placed('WUD');
  let card = cardOf(id);
  assert.equal(card.kind, 'wall');
  assert.deepEqual(labels(card), ['Width', 'Height', 'Depth', 'Mount height', 'Doors'], 'no doors yet: no Front opening');
  const mount = rowOf(card, 'mount-height');
  assert.equal(mount.value, unitOf(id).params.mount_height ?? P.wallUnit.defaults.mountHeight);
  assert.deepEqual(mount.args(1450), [{ mount_height: 1450 }]);
  assert.equal(mount.refusal, undefined, 'the right panel asks the room nothing of a mount height (RightPanel.jsx:711-720)');
  S().addDoors(id);
  card = cardOf(id);
  assert.ok(S().unitResult(id).derived.doors > 0 && liftTakesKit(getUnitType('WUD')));
  assert.deepEqual(labels(card), ['Width', 'Height', 'Depth', 'Mount height', 'Doors', 'Front opening']);
  const opening = rowOf(card, 'front-opening');
  assert.equal(opening.value, 'hinged');
  assert.deepEqual(opening.options.map((o) => o.value), ['hinged', 'hk', 'hs', 'hl', 'hf']);
  assert.deepEqual(opening.args('hk'), [{ front_system: 'hk' }]);
  assert.deepEqual(opening.args('hinged'), [{ front_system: null }]);
  assert.deepEqual(frontSystemPatch('nonsense'), { front_system: null });
  // A hood takes no lift (liftSystems.js): it is a generic card, and no Front opening.
  assert.equal(cardKindOf('WUD_HOOD'), 'generic');
  assert.equal(rowOf(cardOf(placed('WUD_HOOD')), 'front-opening'), null);
});

test('T84 F3 · Wardrobe: Width · Height · Depth · Front type · Finish · Bays, the bays read-only to the contents section', () => {
  const id = placed('WARDROBE');
  const card = cardOf(id);
  assert.equal(card.kind, 'wardrobe');
  assert.deepEqual(labels(card), ['Width', 'Height', 'Depth', 'Front type', 'Finish', 'Bays']);
  const front = rowOf(card, 'front-type');
  assert.equal(front.options[0].value, '', 'the project default first');
  assert.match(front.options[0].label, /^Project default \(/);
  const [patch] = front.args('S');
  assert.deepEqual(Object.keys(patch).sort(), ['front_decoration', 'front_type'], 'never front_type alone');
  assert.equal(patch.front_type, 'S');
  assert.deepEqual(front.args(''), [{ front_type: null, front_decoration: null }]);
  const finish = rowOf(card, 'finish');
  assert.equal(finish.action, 'openModal');
  assert.equal(finish.modal, 'unit-finish');
  assert.deepEqual(finish.modalArgs, { unitIds: [id] });
  assert.equal(finish.text, 'project', 'UnitFinishModal\'s own word while the unit follows the project');
  // Its own carcass slot: the palette's name, as the colour window shows it.
  S().setUnitFinish([id], { carcass_type_id: 'c1' });
  assert.equal(finishSummary(unitOf(id), { design: S().project.design, profile: P }), 'Carcass 1');
  assert.equal(rowOf(cardOf(id), 'finish').text, 'Carcass 1');
  const bays = rowOf(card, 'bays');
  assert.equal(bays.kind, 'summary');
  assert.equal(bays.section, 'contents');
  const engine = bayWidthsOf(S().unitResult(id), unitOf(id).params.board_t);
  assert.equal(bays.text, `${engine.length} bay${engine.length > 1 ? 's' : ''} · ${engine.map((b) => formatMm(b.size)).join(' · ')}`);
  assert.equal(card.note, 'Bays are a summary. Edit dividers in the full settings.');
});

test('T84 F3 · Vanity: Width · Height · Depth · Drawers (2 / 3 / 4) · Sinks (0 / 1 / 2) · Mounting, to the VANITY section', () => {
  const id = placed('VANITY2');
  let card = cardOf(id);
  assert.equal(card.kind, 'vanity');
  assert.deepEqual(labels(card), ['Width', 'Height', 'Depth', 'Drawers', 'Sinks', 'Mounting']);
  const drawers = rowOf(card, 'drawers');
  assert.equal(drawers.action, 'setVanityDrawers');
  assert.deepEqual(drawers.options.map((o) => [o.label, o.on, o.args]), [['2', true, [2]], ['3', false, [3]], ['4', false, [4]]]);
  const sinks = rowOf(card, 'sinks');
  assert.equal(sinks.action, 'updateUnitParams');
  assert.deepEqual(sinks.options.map((o) => o.args), [[{ sinks: 0 }], [{ sinks: 1 }], [{ sinks: 2 }]]);
  assert.ok(sinks.options[1].on, 'a vanity is born with one basin');
  const mounting = rowOf(card, 'mounting');
  assert.equal(mounting.section, 'vanity', 'p1-registry.md row 34: the Floor / Floating row is in the Vanity section');
  assert.equal(mounting.text, 'Floor');
  assert.equal(callAction(S(), 'setVanityDrawers', id, [3]).ok, true);
  assert.equal(unitOf(id).type, 'VANITY3', 'the count IS the kit');
  assert.equal(S().setVanityFloating(id, true).ok, true);
  card = cardOf(id);
  const float = floatHeightOf(unitOf(id).type, unitOf(id).params, P);
  assert.equal(rowOf(card, 'mounting').text, `Floating · ${formatMm(float, { unit: true })}`);
  assert.ok(rowOf(card, 'drawers').options.find((o) => o.label === '3').on);
  // The refusal is the store's own sentence.
  const no = callAction(S(), 'setVanityDrawers', id, [5]);
  assert.equal(no.ok, false);
  assert.equal(no.reason, S().setVanityDrawers(id, 5).said);
});

test('T84 F3 · Mirror cabinet: Width · Height · Depth · Mount height · Bays (1 / 2 / 3) · Recess, the bays warning kept', () => {
  const id = placed('MIRROR_CABINET');
  const card = cardOf(id);
  assert.equal(card.kind, 'mirror');
  assert.deepEqual(labels(card), ['Width', 'Height', 'Depth', 'Mount height', 'Bays', 'Recess']);
  const bays = rowOf(card, 'bays');
  assert.equal(bays.action, 'setMirrorCabinet');
  assert.deepEqual(bays.options.map((o) => o.args), [[{ bays: 1 }], [{ bays: 2 }], [{ bays: 3 }]]);
  assert.ok(bays.options.find((o) => o.on).args[0].bays === S().unitResult(id).derived.mirror.bays);
  // The chips keep the app's own title (RightPanel.jsx, the bay chips).
  assert.ok(read('src/components/RightPanel.jsx').includes("door${n > 1 ? 's' : ''}: the doors take the kit's own widths again"));
  assert.equal(bays.options[1].title, "2 doors: the doors take the kit's own widths again");
  // The warning line, CLAUDE.md's sentence verbatim (CLAUDE.md wraps it across two lines).
  assert.ok(read('CLAUDE.md').replace(/\s+/g, ' ').includes(`"${MIRROR_BAYS_WARNING}"`), 'the warning is CLAUDE.md\'s own sentence');
  assert.equal(card.warning, 'Changing bays resets door widths to the kit defaults');
  const recess = rowOf(card, 'recess');
  assert.equal(recess.action, 'setMirrorCabinet');
  assert.equal(recess.value, 0);
  assert.deepEqual(recess.args(40), [{ recess_mm: 40 }]);
  // The typed widths of 26.10 are held: an unchanged count is no answer, a refused recess is the kit's words.
  const typed = callAction(S(), 'setMirrorCabinet', id, [{ door_width: { bay: 0, mm: 300 } }]);
  assert.equal(typed.ok, true);
  const held = S().unitResult(id).derived.mirror.doorWidths;
  const pressed = rowOf(cardOf(id), 'bays').options.find((o) => o.on);
  assert.ok(pressed, 'the count as it stands is the pressed chip');
  // The card does not press a pressed chip (CardRow.jsx); and the store would keep the widths if it did.
  assert.match(read('src/components/studio/cards/CardRow.jsx'), /if \(!option\.on\) act\.run\(row\.action, option\.args\)/);
  assert.equal(callAction(S(), 'setMirrorCabinet', id, pressed.args).ok, true);
  assert.deepEqual(S().unitResult(id).derived.mirror.doorWidths, held, 'the typed width is untouched');
  const deep = commitRow(rowOf(cardOf(id), 'recess'), 5000, { actions: S(), unitId: id });
  assert.equal(deep.ok, false);
  assert.equal(deep.reason, S().setMirrorCabinet(id, { recess_mm: 5000 }).said);
});

test('T84 F3 · HAWA pocket: Doors · Hand · Opening · Covered cabinets · Hardware class · Calculated size (read-only)', () => {
  const id = placed('HAWA_POCKET');
  let card = cardOf(id);
  assert.equal(card.kind, 'hawa');
  assert.deepEqual(labels(card), ['Doors', 'Hand', 'Opening', 'Covered cabinets', 'Hardware class', 'Calculated size']);
  assert.ok(!card.rows.some((r) => ['width', 'height', 'depth'].includes(r.key)), 'never a generic editable W / H / D');
  for (const key of ['pocket-doors', 'hand', 'opening', 'hardware-class']) assert.equal(rowOf(card, key).action, 'setPocket', key);
  assert.deepEqual(rowOf(card, 'pocket-doors').options.map((o) => o.args), [[{ doors: 1 }], [{ doors: 2 }]]);
  assert.deepEqual(rowOf(card, 'opening').options.map((o) => o.args), [[{ push: true }], [{ push: false }]]);
  assert.deepEqual(rowOf(card, 'hardware-class').options.map((o) => o.args), [[{ cls: null }], [{ cls: 25 }], [{ cls: 35 }]]);
  assert.equal(rowOf(card, 'covers').action, 'setPocketCovers');
  const size = rowOf(card, 'size');
  assert.equal(size.kind, 'readonly');
  assert.equal(size.action, null);
  const u = unitOf(id);
  assert.equal(size.text, `${formatMm(u.params.width)} × ${formatMm(u.params.height)} × ${formatMm(u.params.depth)} mm`);
  // Two doors: no Hand (*"Only visible for one door"*).
  assert.equal(callAction(S(), 'setPocket', id, [{ doors: 2 }]).ok, true);
  card = cardOf(id);
  assert.deepEqual(labels(card), ['Doors', 'Opening', 'Covered cabinets', 'Hardware class', 'Calculated size']);
  assert.deepEqual(rowOf(card, 'covers').sides.map((s) => s.side), ['L', 'R']);
});

test('T84 F3 · HAWA pocket: the covered cabinets are the right panel\'s contiguous chain', () => {
  // Two narrow tall units butted on the pocket's left: one door can close both (HAWA's widest door).
  S().newProject('T84 F3 covers');
  S().setRoom({ corners: rectCorners(6000, 4000), height: 2700 });
  const far = S().addUnit('BUDTALL', { wall: 0, x: 600 }).id;
  callAction(S(), 'updateUnitParams', far, [{ width: 300 }]);
  const near = S().addUnit('BUDTALL', { wall: 0, x: 900 }).id;
  callAction(S(), 'updateUnitParams', near, [{ width: 300 }]);
  const hp = S().addUnit('HAWA_POCKET', { wall: 0, x: 1200 }).id;
  const num = (id) => unitOf(id).params.unit_num;
  assert.deepEqual(rowOf(cardOf(hp), 'covers').sides, pocketCoversOf(unitOf(hp), {
    profile: P, units: S().units, runElements: S().runElements,
  }));
  let side = rowOf(cardOf(hp), 'covers').sides[0];
  assert.equal(side.side, 'L');
  assert.equal(side.text, num(near), 'the nearest unit is covered at birth');
  assert.deepEqual(side.add, { label: `+ ${num(far)}`, title: `Cover ${num(far)} too`, args: [[near, far]] });
  assert.equal(side.remove, null, 'the last one is never taken off');
  assert.equal(callAction(S(), 'setPocketCovers', hp, side.add.args).ok, true);
  side = rowOf(cardOf(hp), 'covers').sides[0];
  assert.equal(side.text, `${num(near)}, ${num(far)}`);
  assert.equal(side.add, null, 'nothing further butted on');
  assert.deepEqual(side.remove.args, [[near]]);
  assert.equal(callAction(S(), 'setPocketCovers', hp, side.remove.args).ok, true);
  assert.deepEqual(S().runElements[hp].pocket.sides.L, [near]);
});

test('T84 F3 · Free panel: Length · Width · Thickness · Facing · Tilt · Height above floor, the BOARD, never its rotated box', () => {
  const id = placed('FREE_PANEL');
  let card = cardOf(id);
  assert.equal(card.kind, 'panel');
  assert.deepEqual(labels(card), ['Length', 'Width', 'Thickness', 'Facing', 'Tilt', 'Height above floor']);
  assert.equal(card.openCabinet, false, 'a board takes no "Edit cabinet" (lib/contextActions.js FREE_PANEL_MENU)');
  assert.equal(card.thumb, 'panel');
  assert.equal(card.scope, 'This panel');
  const keys = { length: 'panel_length', width: 'panel_width', thickness: 'board_t', tilt: 'panel_tilt_deg', 'height-above-floor': 'mount_height' };
  for (const [key, param] of Object.entries(keys)) {
    const row = rowOf(card, key);
    assert.equal(row.action, 'updateUnitParams', key);
    assert.deepEqual(row.args(123), [{ [param]: 123 }], key);
  }
  assert.deepEqual(rowOf(card, 'facing').options.map((o) => o.args), [[{ panel_facing: 'along' }], [{ panel_facing: 'across' }]]);
  // Laid flat, the box is the rotated board: the card still reads the board.
  assert.equal(commitRow(rowOf(card, 'tilt'), 90, { actions: S(), unitId: id }).ok, true);
  card = cardOf(id);
  const board = freePanelOf(unitOf(id).params, P);
  assert.equal(rowOf(card, 'length').value, board.length);
  assert.equal(rowOf(card, 'width').value, board.width);
  assert.equal(rowOf(card, 'thickness').value, board.thickness);
  assert.equal(rowOf(card, 'tilt').value, 90);
  assert.notEqual(rowOf(card, 'width').value, unitOf(id).params.height, 'not the box\'s height (the board\'s thickness, flat)');
  assert.notEqual(rowOf(card, 'width').value, unitOf(id).params.width, 'not the box\'s width (the board\'s length)');
  // A width typed is the board's (the store reads it through freePanelPatch).
  assert.equal(commitRow(rowOf(card, 'width'), 350, { actions: S(), unitId: id }).ok, true);
  assert.equal(freePanelOf(unitOf(id).params, P).width, 350);
});

test('T84 F3 · the generic card: Width · Height · Depth · Front type · Finish · Plinth, each where the type has it', () => {
  assert.deepEqual(labels(cardOf(placed('CORNER_L_BASE'))), ['Arm A', 'Height', 'Arm B', 'Front type', 'Finish', 'Plinth']);
  assert.deepEqual(labels(cardOf(placed('PANTRY'))), ['Width', 'Height', 'Depth', 'Front type', 'Finish', 'Plinth']);
  // No door and no drawer: no Front type; hung: no plinth.
  assert.deepEqual(labels(cardOf(placed('WUD_HOOD_CANOPY'))), ['Width', 'Height', 'Depth', 'Finish']);
  assert.deepEqual(labels(cardOf(placed('WINE'))), ['Width', 'Height', 'Depth', 'Finish', 'Plinth']);
  for (const typeId of ['SINK', 'BLIND_BASE', 'BUDTALL', 'FRIDGE', 'DW_PANEL', 'OVEN_BASE', 'TWIN', 'BIN', 'CARGO', 'LOW_CABINET',
    'WARDROBE_TOP', 'WARDROBE_DESK', 'WARDROBE_CHEST3', 'WARDROBE_LOW', 'BLIND_WARDROBE', 'WUD_HOOD', 'WUD_HOOD_SHORT', 'BLIND_WALL']) {
    assert.equal(cardKindOf(typeId), 'generic', typeId);
  }
});

// ─── THE COMMIT: THE ROOM FIRST, THE SETTER'S NOTICE, NOTHING WRITTEN ON A REFUSAL ─

test('T84 F3 · a dimension commits through the room first: a refusal writes nothing, in the engine\'s own sentence', () => {
  const id = placed('BUD');
  const width = rowOf(cardOf(id), 'width');
  const before = S().units;
  const no = commitRow(width, 7000, { actions: S(), unitId: id });
  assert.equal(no.ok, false);
  assert.equal(no.reason, S().roomFitRefusalFor(id, { width: 7000 }).message, 'the room\'s sentence, word for word');
  assert.equal(S().units, before, 'nothing was written, so nothing enters the history');
  // The number already shown is no edit at all: not even the room is asked.
  assert.equal(commitRow(width, width.value, { actions: S(), unitId: id }).ok, true);
  assert.equal(S().units, before);
  const yes = commitRow(width, 700, { actions: S(), unitId: id });
  assert.equal(yes.ok, true);
  assert.equal(unitOf(id).params.width, 700);
  assert.ok(Array.isArray(yes.notices));
  // A width its neighbours stop on both sides: applied as far as it goes, the store's own notice
  // handed back for the card to say (LAW 3: *"surfaces the notice it returns"*).
  callAction(S(), 'updateUnitParams', id, [{ width: 600 }]);
  assert.ok(S().addUnit('BUD', { wall: 0, x: 500 })?.id);
  assert.ok(S().addUnit('BUD', { wall: 0, x: 1900 })?.id);
  const grow = commitRow(rowOf(cardOf(id), 'width'), 1200, { actions: S(), unitId: id });
  assert.equal(grow.ok, true);
  assert.equal(unitOf(id).params.width, 800);
  assert.equal(grow.notices.length, 1, 'a clamp is said, never silent');
  assert.ok(grow.notices[0].startsWith('Width limited to 800 mm'), grow.notices[0]);
});

test('T84 F3 · Height keeps the project default and the custom status, and resetUnitHeight puts it back', () => {
  const id = placed('BUD');
  let card = cardOf(id);
  assert.deepEqual(card.inherit, { follows: true, text: 'Height follows project default', reset: null });
  assert.equal(rowOf(card, 'height').mark, undefined);
  assert.equal(commitRow(rowOf(card, 'height'), 720, { actions: S(), unitId: id }).ok, true);
  card = cardOf(id);
  assert.equal(unitOf(id).params.height_custom, true);
  assert.equal(card.inherit.follows, false);
  assert.equal(card.inherit.reset.action, 'resetUnitHeight');
  assert.match(card.inherit.text, /^Project base height is \d+(\.\d)? mm$/);
  assert.equal(rowOf(card, 'height').mark.text, 'custom');
  assert.equal(callAction(S(), 'resetUnitHeight', id).ok, true);
  assert.equal(cardOf(id).inherit.follows, true);
  // A kit whose height is its own (no group) says nothing about a project height.
  assert.equal(cardOf(placed('VANITY2')).inherit, null);
});

test('T84 F3 · each store answers in its own words, and the card reads them as they are', () => {
  assert.deepEqual(readAnswer('roomFitRefusalFor', null), { ok: true, reason: '', notices: [], info: '' });
  assert.deepEqual(readAnswer('roomFitRefusalFor', { message: 'the room says no' }), {
    ok: false, reason: 'the room says no', notices: [], info: '',
  });
  assert.deepEqual(readAnswer('updateUnitParams', { applied: {}, notices: ['limited by 02'] }).notices, ['limited by 02']);
  assert.deepEqual(readAnswer('setVanityDrawers', { ok: false, said: 'no' }), { ok: false, reason: 'no', notices: [], info: '' });
  assert.deepEqual(readAnswer('setMirrorCabinet', { ok: true, said: 'door 2 set free' }).info, 'door 2 set free');
  assert.deepEqual(readAnswer('setPocket', { ok: false, error: 'no room' }).reason, 'no room');
  assert.equal(readAnswer('addPlinth', false).ok, false);
  assert.equal(callAction(S(), 'removeUnit', 'x').ok, false, 'a name outside the card\'s list is never called');
  assert.equal(isSameValue(600, '600'), true);
  assert.equal(isSameValue(600.04, 600), true, 'as the field shows it');
  assert.equal(isSameValue(601, 600), false);
  assert.equal(isSameValue(null, 600), false);
});

test('T84 F3 · the title is the library row and the unit number; the thumb the library\'s icon', () => {
  const id = placed('BUD');
  const card = cardOf(id);
  assert.equal(card.title, 'Base units · Standard');
  assert.equal(cardTitleOf('BUD', { profile: P, category: 'kitchen' }), card.title);
  assert.equal(card.unitNum, unitOf(id).params.unit_num);
  assert.equal(card.thumb, 'cube');
  const x3 = P.baseDrawerUnit.variants.find((v) => v.id === 'x3').label;
  assert.equal(cardOf(placed('BUDR')).title, `Drawer unit · ${x3}`);
  assert.equal(cardOf(placed('WARDROBE'), { category: 'wardrobe' }).title, 'Wardrobe');
  assert.equal(libraryRowOf('HAWA_POCKET', { profile: P, category: 'wardrobe' }).groups.length, 0);
  assert.equal(libraryRowOf('HAWA_POCKET', { profile: P, category: 'kitchen' }).groups[0], 'Tall units');
  assert.equal(frontTypePatch('', null).front_type, null);
});

// ─── THE CARD, READ AS SOURCE ───────────────────────────────────────────────

const FILES = [
  'src/components/studio/QuickSelectionCard.jsx',
  'src/components/studio/cards/CardRow.jsx',
  'src/components/studio/lib/studioCards.js',
  'test/turn84-f03-cards.test.js',
];

test('T84 F3 · the card opens the cabinet, the full panel at its section, and carries its hooks', () => {
  const card = read('src/components/studio/QuickSelectionCard.jsx');
  const row = read('src/components/studio/cards/CardRow.jsx');
  assert.match(card, /export default function QuickSelectionCard\(\{ unitId, strip = null, Field = null \}\)/);
  assert.match(card, /openModal\('cabinet', \{ unitId: unit\.id, anchor: anchorOfEvent\(e\) \}\)/);
  assert.match(card, /openRightPanel\(\);\s*setPanelSection\(id, true\);\s*showFullSettings\(\);/, 'the summary road, in order');
  assert.match(card, /data-studio="card-full-settings"[\s\S]*?showFullSettings\(\)/);
  assert.match(card, /data-studio="card-open-cabinet"/);
  assert.match(card, /data-studio="card"/);
  assert.match(card, /data-card-type=\{card\.kind\}/);
  assert.match(card, /className="studio-skin /, 'the Studio scale reaches the card');
  assert.match(card, /\{strip\}/, 'the issue strip of F5 under the rows');
  assert.match(row, /data-studio="card-row" data-row=\{row\.key\}/);
  assert.match(row, /<Field[\s\S]*?commit=\{commit\}/, 'F5\'s field gets the commit');
  assert.match(row, /<NumberField[\s\S]*?onCommit=/, 'no field given: the house NumberField');
  // The card is no setter: it calls the store's actions only through the list (callAction).
  for (const src of [card, row]) {
    assert.doesNotMatch(src, /\b(?:updateUnitParams|roomFitRefusalFor|setPocket|setMirrorCabinet|setVanityDrawers)\(/);
  }
});

// Built from code points, so this file holds none of the characters it looks for.
const DASHES = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);
const CURLY = new RegExp(`[${String.fromCharCode(0x2018, 0x2019, 0x201c, 0x201d)}]`);

test('T84 F3 · every new file opens with the Skylon header and holds no em or en dash', () => {
  const header = read('scripts/t83-walk.mjs').split('\n').slice(0, 8).join('\n');
  for (const rel of FILES) {
    const text = read(rel);
    assert.ok(text.startsWith(`${header}\n`), `${rel} opens with the header`);
    assert.doesNotMatch(text, DASHES, `${rel}: no em or en dash`);
    assert.doesNotMatch(text, CURLY, `${rel}: no curly quote`);
  }
});
