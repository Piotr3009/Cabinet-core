/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── TURN 79 · F16: RESTORE SLEEVE ROWS, THE BUTTON ─────────────────────────
//
// The handover of 18.10.2026: *"przycisk Restore sleeve rows"*, accepted by the
// owner at 14:55: *"ok daj"*. The store has had `restoreSleeveRows` since the
// chat fix of 17.10 (the clash finding drops ONE row of a shelf's cluster);
// nothing on the screen called it. Now the shelf's Type field carries the
// button, shown only when the shelf has a dropped row.
//
// The claims are asked of the source the way the other ElementProperties tests
// ask them (no renderer in this repo's tests), and the button's own guard and
// its own click are lifted out of the source and run against the real store,
// so "appears with a dropped row, absent otherwise" and "calls the action" are
// answered by the code that ships, not by a copy of it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getCabinetProfile } from '../src/engine/profile.js';
import { shelfHingeClashes } from '../src/engine/shelfHingeClash.js';
import { shelfHingeFindings } from '../src/engine/checks.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const PRO = 'src/components/ElementProperties.jsx';
const RETAIL = 'src/retail/design/detail/ElementProperties.jsx';

const P = getCabinetProfile();
const SH = P.shelfHoles;
const store = () => useProjectStore.getState();
const freshProject = () => store().loadProject({
  id: null, name: 't79-f16', design: {},
  room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
}, []);
const sleeveHoles = (r) => r.drills.filter((d) => d.layer === SH.layer);
const shelfItem = (unitId, itemId) => store().units.find((u) => u.id === unitId)
  .params.sections[0].items.find((i) => i.id === itemId);

/** The `case 'shelf-type'` block of a file, up to the next case. */
function shelfTypeCase(text) {
  const at = text.indexOf("case 'shelf-type':");
  assert.ok(at >= 0, 'no shelf-type case');
  const end = text.indexOf('case ', at + 20);
  return text.slice(at, end);
}

/** The button's guard and its click, lifted from the source as they ship. */
function theButton(text) {
  const block = shelfTypeCase(text);
  const m = block.match(/\{(item\?\.sleeves_dropped\?\.length) \? \(\s*<button([\s\S]*?)<\/button>\s*\) : null\}/);
  assert.ok(m, 'the shelf-type field carries no guarded Restore sleeve rows button');
  const [, guard, body] = m;
  // The click takes its event (the T79 walk: it cancels the label's default); a stub event stands in for it here.
  const click = body.match(/onClick=\{\((\w*)\) => \{([\s\S]*?)\n\s*\}\}/);
  assert.ok(click, 'the button has no click of its own');
  const ev = click[1] ? `const ${click[1]} = { preventDefault() {} };\n` : '';
  return {
    body,
    shows: new Function('item', `return Boolean(${guard});`),
    click: new Function('restoreSleeveRows', 'unit', 'item', 'notify', `${ev}${click[2]}`),
  };
}

/** A BUD with doors and one shelf 40 under a hinge: the 17.10 clash, the +50 row droppable. */
function aClash() {
  freshProject();
  const u = store().addUnit('BUD');
  store().addDoors(u.id);
  store().addShelves(u.id, 1);
  const shelfId = store().units.find((x) => x.id === u.id).params.sections[0].items.find((i) => i.kind === 'shelf').id;
  const hinge = store().unitResult(u.id).drillSummary.hinge_centers[1];
  store().setShelfPos(u.id, shelfId, hinge - 40);
  return { unitId: u.id, shelfId };
}

/** The finding's own `Remove the +50 mm sleeve row`, run as `useGoToSubject` runs it (lib/checkFindings.js). */
function clickTheFinding(unitId) {
  const [f] = shelfHingeFindings({ unitId, unitNum: '01', result: store().unitResult(unitId), profile: P });
  const drop = f.actions.find((a) => a.id === 'drop-sleeve-row');
  assert.equal(drop.label, 'Remove the +50 mm sleeve row');
  const { action, args } = drop.subject.store;
  return store()[action](...args);
}

// ─── 1 · THE BUTTON IS IN THE SHELF'S TYPE FIELD, IN PRO AND IN THE COPY ────

test('F16 · PRO: the Type field carries `Restore sleeve rows`, cc-btn w-full, its data hook, the store action', () => {
  const text = read(PRO);
  const { body } = theButton(text);
  assert.match(body, /className="cc-btn w-full[ "]/, 'not the cc-btn w-full of the spec');
  assert.match(body, /data-restore-sleeve-rows="1"/, 'no stable hook for the walk');
  assert.match(body, />\s*Restore sleeve rows\s*$/, 'the label is not the handover\'s words');
  assert.match(body, /restoreSleeveRows\(unit\.id, item\.id\)/, 'the click does not call the store action on this shelf');
  assert.match(text, /const restoreSleeveRows = useProjectStore\(\(s\) => s\.restoreSleeveRows\);/,
    'the action is not the store\'s own');
  assert.equal(text.match(/data-restore-sleeve-rows/g).length, 1, 'one button, one road');
});

test('F16 · retail: the copy carries the same button, made by the copy script (the skin only differs)', () => {
  const text = read(RETAIL);
  const { body } = theButton(text);
  assert.match(body, /data-restore-sleeve-rows="1"/);
  assert.match(body, /restoreSleeveRows\(unit\.id, item\.id\)/);
  assert.match(body, />\s*Restore sleeve rows\s*$/);
  // The machine re-skins the class tokens (cc-btn, w-full) and nothing else on the line.
  assert.match(body, /className="pbi-re-btn pbi-re-wfull[ "]/, 'the copy is not the machine\'s skin of PRO');
  // `shelf-type` is a client's field: retail's dock does not leave it out.
  assert.doesNotMatch(read('src/retail/design/detail/docked.jsx'), /'shelf-type'/,
    'the retail dock hides the field that carries the button');
});

// ─── 2 · IT APPEARS WITH A DROPPED ROW, AND ONLY THEN ───────────────────────

test('F16 · the guard: absent on a plain shelf and after the restore, present with a dropped row', () => {
  const { shows } = theButton(read(PRO));
  assert.equal(shows({ kind: 'shelf' }), false, 'a shelf that never lost a row');
  assert.equal(shows({ kind: 'shelf', sleeves_dropped: [] }), false, 'a shelf whose rows came back');
  assert.equal(shows(null), false, 'no item behind the panel');
  assert.equal(shows({ kind: 'shelf', sleeves_dropped: [50] }), true);
  assert.equal(shows({ kind: 'shelf', sleeves_dropped: [-50, 50] }), true);

  // ...and on the store's own item, through the 17.10 clash and its finding.
  const { unitId, shelfId } = aClash();
  assert.equal(shows(shelfItem(unitId, shelfId)), false, 'before the drop');
  const [c] = shelfHingeClashes({ result: store().unitResult(unitId), profile: P });
  assert.equal(c.droppableOffset, 50, 'the clash offers the +50 row');
  assert.deepEqual(clickTheFinding(unitId), { dropped: [50] });
  assert.equal(shows(shelfItem(unitId, shelfId)), true, 'after the drop');
});

test('F16 · save and reload: the dropped row rides the saved shelf, the button comes back with it, and the restore is saved', () => {
  const { shows, click } = theButton(read(PRO));
  const { unitId, shelfId } = aClash();
  clickTheFinding(unitId);
  const room = migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) });
  const reload = () => store().loadProject(
    { id: null, name: 't79-f16-reopen', design: {}, room },
    JSON.parse(JSON.stringify(store().units)),
  );
  reload();
  assert.deepEqual(shelfItem(unitId, shelfId).sleeves_dropped, [50], 'the drop is saved with the shelf');
  assert.equal(shows(shelfItem(unitId, shelfId)), true, 'the reopened shelf offers the restore');
  assert.equal(sleeveHoles(store().unitResult(unitId)).length, 8);
  click(store().restoreSleeveRows, store().units.find((u) => u.id === unitId), shelfItem(unitId, shelfId), () => {});
  reload();
  assert.deepEqual(shelfItem(unitId, shelfId).sleeves_dropped, []);
  assert.equal(shows(shelfItem(unitId, shelfId)), false);
  assert.equal(sleeveHoles(store().unitResult(unitId)).length, 12, 'the reopened project bores the whole cluster');
});

// ─── 3 · THE CLICK RUNS THE ACTION, AND A REFUSAL IS SAID ───────────────────

test('F16 · the click: the store action on this unit and this shelf; the cluster comes back whole', () => {
  const { click, shows } = theButton(read(PRO));
  const { unitId, shelfId } = aClash();
  clickTheFinding(unitId);
  assert.equal(sleeveHoles(store().unitResult(unitId)).length, 8, 'one row gone on both sides');

  const calls = [];
  const said = [];
  const restore = (...args) => { calls.push(args); return store().restoreSleeveRows(...args); };
  const unit = store().units.find((u) => u.id === unitId);
  click(restore, unit, shelfItem(unitId, shelfId), (m, l) => said.push([m, l]));
  assert.deepEqual(calls, [[unitId, shelfId]]);
  assert.deepEqual(said, [], 'a restore that worked says nothing');
  assert.deepEqual(shelfItem(unitId, shelfId).sleeves_dropped, []);
  assert.equal(sleeveHoles(store().unitResult(unitId)).length, 12, 'three rows, two columns, two sides');
  assert.equal(shows(shelfItem(unitId, shelfId)), false, 'the button goes with the dropped row');
  // The finding is back, as it was before the drop: the clash was never solved, only hidden.
  assert.equal(shelfHingeClashes({ result: store().unitResult(unitId), profile: P }).length, 1);
});

test('F16 · a refusal from the store is said in its own words, never silent', () => {
  const { click } = theButton(read(PRO));
  const said = [];
  click(() => ({ error: 'No such shelf.' }), { id: 'u' }, { id: 's', sleeves_dropped: [50] },
    (m, l) => said.push([m, l]));
  assert.deepEqual(said, [['No such shelf.', 'warn']]);
});

// The T79 walk (verify/t79/walk.txt, f16, the real mouse) found the button inside Field's <label>: it leaves the page
// on its own click, and the label handed the click on to the Type field's first control, the Fix chip, which pinned
// the shelf. The click now cancels the label's default (PRO, and retail through the copy script).
test('F16 · the click stays the button\'s: the label never hands it on to the Fix chip', () => {
  for (const rel of ['src/components/ElementProperties.jsx', 'src/retail/design/detail/ElementProperties.jsx']) {
    const src = read(rel);
    const at = src.indexOf('data-restore-sleeve-rows="1"');
    assert.ok(at > 0, `${rel}: the button`);
    const body = src.slice(at, src.indexOf('Restore sleeve rows', at));
    assert.match(body, /onClick=\{\(e\) => \{[\s\S]*?e\.preventDefault\(\);[\s\S]*?restoreSleeveRows\(unit\.id, item\.id\)/, `${rel}: the click cancels the label's default before the store action`);
  }
});
