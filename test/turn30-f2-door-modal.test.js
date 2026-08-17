// ─── TURN 30 F2 — ONE modal for the door and its hinges ─────────────────────
//
// The owner approved the shape and CLAUDE.md spells it out: one draggable
// window called **Door**, two sections. Section A is turn 11's element window,
// whole. Section B is turn 19's hinge window, whole — assignment, rows, the
// ±5 mm arrows, the typed millimetre, Reset, remove, add.
//
// ─── WHAT WAS ACTUALLY WRONG ────────────────────────────────────────────────
//
// Not that there were two windows. That `openModal` has ONE SLOT, so the two
// could never be open together: double-clicking a hinge REPLACED the door's
// window with the hinge's, and a joiner moving a cup by five millimetres could
// not see the leaf he was moving it on. Two components, two open paths, two
// answers to "what is open".
//
// So the test that matters is not "does a component exist" — it is:
//
//   • ONE modal kind. `hinge` is gone from the app entirely; the hinge gesture
//     opens `element` with a SECTION and a ROW.
//   • ONE component. Both old files are deleted, and nothing imports them.
//   • EVERY ACTION SURVIVES. The store setters section B calls are the ones
//     turn 19 called, named here so a rewrite cannot pass this file.
//   • NOTHING NEW. No dependency, and the shell is rule 15's own.
//
// ─── WHY THIS IS A SOURCE TEST ──────────────────────────────────────────────
//
// This repository mounts no React (zero dependencies — no test renderer, and
// CLAUDE.md forbids adding one), so a component's WIRING is proved by reading
// it, exactly as `test/turn29-f5` proves the fold's three lines. What the
// pictures prove instead is the window on the screen: `verify/t30/2*.png`, one
// window with both sections in it, opened from the leaf and opened from the
// ironmongery.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const SRC_DIR = new URL('../src/', import.meta.url).pathname;

const DOOR = src('components/DoorModal.jsx');
const PAGE = src('pages/ConfiguratorPage.jsx');
const SCENE = src('3d/Scene.jsx');

/** Every file under src/, so "nothing anywhere still reaches for it" is real. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(`${path}/`));
    else if (/\.(js|jsx)$/.test(entry.name)) out.push(path);
  }
  return out;
}
const ALL = walk(SRC_DIR).map((p) => ({ path: p, text: readFileSync(p, 'utf8') }));

// ─── THE TWO OLD WINDOWS ARE GONE ───────────────────────────────────────────

test('F2 the two old modals are REMOVED, not left beside the new one', () => {
  assert.equal(existsSync(new URL('../src/components/ElementModal.jsx', import.meta.url)), false);
  assert.equal(existsSync(new URL('../src/components/HingeModal.jsx', import.meta.url)), false);
  // …and nothing anywhere still imports them, which is the half a deletion
  // usually forgets.
  for (const f of ALL) {
    assert.doesNotMatch(f.text, /from '.*ElementModal\.jsx'/, `${f.path} imports ElementModal`);
    assert.doesNotMatch(f.text, /from '.*HingeModal\.jsx'/, `${f.path} imports HingeModal`);
  }
});

test('F2 there is ONE modal kind: `hinge` no longer opens anything', () => {
  // The registry of "what is open" is `uiStore.modal`, and it now has one name
  // for this window. A second kind is the very thing that made a door and its
  // own ironmongery two mutually-exclusive windows.
  for (const f of ALL) {
    assert.doesNotMatch(f.text, /openModal\('hinge'/, `${f.path} still opens a 'hinge' modal`);
    assert.doesNotMatch(f.text, /modal === 'hinge'/, `${f.path} still renders on modal === 'hinge'`);
  }
  assert.match(PAGE, /\{modal === 'element' && <DoorModal \/>\}/);
  assert.equal((PAGE.match(/<DoorModal \/>/g) || []).length, 1, 'mounted once, from one place');
});

// ─── THE TWO GESTURES, AND WHERE EACH LANDS ─────────────────────────────────

test('F2 double-clicking the LEAF opens the window at section A', () => {
  // No section, no row: the window opens where it opens, which is the top.
  assert.match(SCENE, /onEditElement=\{\(panelId, at\) => openModal\('element', \{\s*unitId: unit\.id, panelId, at,\s*\}\)\}/);
});

test('F2 double-clicking a HINGE opens the SAME window, at section B, on that row', () => {
  const at = SCENE.indexOf('onEditHinge=');
  assert.ok(at > 0, 'the hinge gesture is still wired');
  const body = SCENE.slice(at, at + 600);
  assert.match(body, /openModal\('element',/, 'the same modal kind as the leaf');
  assert.match(body, /section: 'hinges'/, 'scrolled to section B');
  assert.match(body, /hingeIndex: index/, 'and the row that was pointed at travels with it');
});

test('F2 the window scrolls to section B and rings the row it was opened on', () => {
  // The scroll is an effect on the SECTION, not a scrollTop typed into the
  // shell: the shell owns the scroller (`overflow-y-auto`) and a modal that
  // reached into it would be a second placement rule.
  assert.match(DOOR, /const wantHinges = args\?\.section === 'hinges';/);
  assert.match(DOOR, /node\?\.scrollIntoView/);
  // Turn 19's own row style, unchanged — `ring-gold` on the row whose index
  // arrived with the click.
  //
  // ─── TURN 36 (CLAUDE.md F4c): THE ROWS READ TOP-DOWN NOW ─────────────────
  // The owner: *the modal's hinge rows sort by Y DESCENDING — top hinge
  // first.* So the loop counter `i` is gone and every row carries the ENGINE's
  // own index (`engine/items.js hingeRows`) — which is what the click brings
  // with it, because the 3-D pick counts bottom-up. The RING is unchanged: the
  // same class on the same row, matched on the same number.
  assert.match(DOOR, /row === hr\.index \? 'ring-1 ring-gold\/70' : ''/);
});

// ─── BOTH SECTIONS ARE IN ONE WINDOW ────────────────────────────────────────

test('F2 the window is called Door and carries section A and section B', () => {
  assert.match(DOOR, /data-door-section="A"/);
  assert.match(DOOR, /data-door-section="B"/);
  assert.match(DOOR, /\$\{unit\.params\.unit_num\} · Door · \$\{hand\}/);
  // ONE shell, so it is draggable and opens BESIDE the object by rule 15 —
  // the same three lines every modal in this app is placed by.
  assert.equal((DOOR.match(/<Modal\b/g) || []).length, 1, 'one window, not two nested');
  assert.match(DOOR, /anchor=\{anchor\}/);
  // ─── TURN 31 (CLAUDE.md F1) ──────────────────────────────────────────────
  // Turn 30 asserted that THIS component reconciled turn 11's `{ at }` with
  // turn 12's `{ anchor }`. It no longer does, and that is the improvement:
  // the conversion happens once, in the store's own opener
  // (lib/modalLayer.js `withModalAnchor`), so the window reads one field. The
  // property under test is unchanged — this door opens BESIDE the click.
  assert.match(DOOR, /const anchor = useMemo\(\(\) => args\?\.anchor \|\| null/);
  assert.doesNotMatch(DOOR, /anchorAtPoint/);
});

test('F2 section A is turn 11’s element window, whole', () => {
  for (const piece of [
    // Turn 33 (CLAUDE.md F7): the owner's "ten górny usuń" — the field list
    // OMITS its duplicate hinge rows in this modal (the working HingeSection
    // stands alone at the top); everything else of turn 11's window is whole,
    // and the right-hand panel keeps every row it ever had.
    /<ElementProperties unit=\{unit\} panel=\{panel\} item=\{item\} compact omit=\{\['hinges'\]\} \/>/,
    /<HandleSection unit=\{unit\} panel=\{panel\} \/>/,
    /<FrontDimensionsToggle panel=\{panel\} \/>/,
    /<RemoveDoor unit=\{unit\} panel=\{panel\} onDone=\{closeModal\} \/>/,
    /<PieceWeight unit=\{unit\} panel=\{panel\} \/>/,
  ]) assert.match(DOOR, piece);
});

test('F2 section B is turn 19’s hinge window, whole — every control, by name', () => {
  for (const control of [
    'data-hinge-assign="1"',      // assign another hinge to THIS door
    'data-hinge-modal-rows="1"',  // the rows list
    'data-hinge-modal-reset="1"', // Reset
    'data-hinge-modal-add="1"',   // + Add a hinge
    'data-hinge-resolved',        // what this door is actually fitted with
    'data-hinge-up=',             // the ±5 mm arrows
    'data-hinge-down=',
    'data-hinge-modal-row=',      // the typed millimetre (NumberField)
    'data-hinge-modal-remove=',   // remove
  ]) assert.ok(DOOR.includes(control), `section B lost ${control}`);
  // …and the arrows still take the profile's own stride rather than a 5 typed
  // into the view (chat fix 14.08.2026 put `hingeNudgeMm` in the profile).
  assert.equal((DOOR.match(/profile\.editor\.hingeNudgeMm \|\| 5/g) || []).length, 2);
});

test('F2 every action is the store action that already existed — nothing rewritten', () => {
  for (const action of [
    'setHingePos', 'addHinge', 'removeHinge', 'resetHinges', 'assignDoorHinge',
    'removeFront', 'setFrontHandle', 'setProjectHandle', 'moveHandleClass',
    'hingeRowsOf', 'toggleFrontDimensions',
  ]) assert.ok(DOOR.includes(action), `${action} is not called any more`);
  // The resolved spec is the ENGINE's own function, so the window cannot
  // describe one hinge while the BOM orders another.
  assert.match(DOOR, /resolveDoorHinge\(\{/);
  assert.match(DOOR, /from '\.\.\/engine\/hinges\.js'/);
});

// ─── A SHELF IS NOT A DOOR ──────────────────────────────────────────────────

test('F2 section B is a HINGED FRONT’s only — a shelf opens the window it always did', () => {
  // The one component still serves every piece: that is what let the two old
  // files be deleted rather than kept as a special case. An appliance face has
  // no cups and is excluded by name.
  assert.match(DOOR, /const isDoor = panel\?\.part === 'FRONT' && panel\?\.role === 'front' && !panel\?\.meta\?\.appliance;/);
  assert.match(DOOR, /\{isDoor \? \(\s*<HingeSection/);
  // …and a piece that is not a door keeps its own title, so a shelf's window
  // does not announce itself as a Door.
  assert.match(DOOR, /elementLabel\(panel\) \|\| 'piece'/);
});

// ─── NO NEW DEPENDENCIES (CLAUDE.md rule 4 / F2) ────────────────────────────

test('F2 the window brought no new dependency with it', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const known = new Set([...Object.keys(pkg.dependencies), ...Object.keys(pkg.devDependencies)]);
  for (const m of DOOR.matchAll(/^import[^']*'([^']+)'/gm)) {
    const from = m[1];
    if (from.startsWith('.')) continue;
    assert.ok(known.has(from) || known.has(from.split('/').slice(0, 2).join('/')), `${from} is new`);
  }
});
