// ─── TURN 70 · F4 — DOORS ON THE FIRST LINE ────────────────────────────────
//
// The owner, 13.09.2026:
//
//   *"dodawanie drzwi jest tak schowane, że dopiero w accessories można
//   znaleźć — a powinno być na pierwszej linii, zaraz pod style: ADD DOORS /
//   REMOVE DOORS."*
//
// CLAUDE.md F4: *"FRONTS gains ADD DOORS · REMOVE DOORS immediately under the
// STYLE list. EXTRAS keeps its entry — same store path, two doors to one law
// (the HANDLES pattern from T69 F8)."*
//
// So the whole of this feature is a PLACE, and the whole of this test is that
// the place is right and that nothing behind it was duplicated. The balance
// question CLAUDE.md asks — *"how many paths add a door"* — is asked here as
// an assertion rather than answered in prose.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';
import { REASONS } from '../src/retail/design/reasons.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const S = () => useProjectStore.getState();

function wardrobe() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  return S().addUnit('WARDROBE', { params: { width: 900, height: 2200, depth: 600 } }).id;
}

const OPTIONS = () => read('src/retail/design/Options.jsx');

// ═══ 1 · THE PLACE — UNDER THE STYLE LIST, BEFORE EVERYTHING ELSE ═════════

test('F4 · the pair stands in FRONTS, immediately under the STYLE list', () => {
  const src = OPTIONS();
  const style = src.indexOf('data-testid="fronts-style"');
  const add = src.indexOf('data-testid="fronts-add-doors"');
  const remove = src.indexOf('data-testid="fronts-remove-doors"');
  assert.ok(add > 0 && remove > 0, 'FRONTS has no doors row at all');
  assert.ok(style > 0 && style < add, 'the doors row stands above the style list');
  assert.ok(add < remove, 'REMOVE comes before ADD');
  // *"zaraz pod style"* — nothing of the step stands between them. The only
  // things that may is the pair's own note.
  const between = src.slice(src.indexOf('</Field>', style), add);
  for (const later of ['FRAME WIDTH', 'fronts-style-notes', 'fronts-opening', 'fronts-material', 'fronts-sheen']) {
    assert.ok(!between.includes(later), `${later} got between the style list and the doors`);
  }
});

test('F4 · …and it is where the owner said it was hidden: EXTRAS keeps its entry', () => {
  const src = OPTIONS();
  assert.match(src, /data-testid="extras-add-doors"/, 'EXTRAS lost the entry it is meant to keep');
  assert.match(src, /testid="wardrobe-doors"/, 'the door COUNT left EXTRAS with it');
});

// ═══ 2 · ONE LAW, TWO DOORS — THE HANDLES PATTERN ═════════════════════════

test('F4 · both rows press the SAME adapter calls — no second door law', () => {
  const src = uncomment(OPTIONS());
  // The FRONTS pair.
  assert.match(src, /data-testid="fronts-add-doors"[\s\S]{0,600}?A\.addDoors\(unit\.id\)/);
  assert.match(src, /data-testid="fronts-remove-doors"[\s\S]{0,600}?A\.removeDoors\(unit\.id\)/);
  // EXTRAS' own, unchanged.
  assert.match(src, /data-testid="extras-add-doors"[\s\S]{0,400}?A\.removeDoors\(unit\.id\) : A\.addDoors\(unit\.id\)/);
});

test('F4 · HOW MANY PATHS ADD A DOOR — one, and this is it', () => {
  // THE PATH, end to end and named once, because "one" is only a true answer
  // if you can say WHICH one:
  //
  //   a button  →  A.addDoors(unitId)  →  A.setDoorCount(unitId, 1)
  //             →  projectStore.setDoors + bay_doors + the flush partitions
  //
  // Every retail surface that hangs a door enters at `A.addDoors`, and
  // `A.addDoors` is the ONLY thing in the file that reaches the count law for
  // the purpose of TURNING DOORS ON — the wizard's two placements
  // (`addFirstWardrobe`, the room's own placement) call `setDoorCount` for the
  // COUNT, which is the same one law and not a second road to it.
  const adapter = uncomment(read('src/retail/design/adapter.js'));
  assert.equal((adapter.match(/export function addDoors\(/g) || []).length, 1);
  assert.equal((adapter.match(/export function removeDoors\(/g) || []).length, 1);
  assert.equal((adapter.match(/export function setDoorCount\(/g) || []).length, 1,
    'the door-count law is written more than once');
  // `params.doors` is the flag that makes a wardrobe wear leaves at all, and
  // exactly two places in the adapter write it — on, inside the one count law
  // (twice in that one function, which is one road), and off, inside
  // `removeDoors`.
  assert.match(adapter, /export function removeDoors\(unitId\) \{[\s\S]{0,200}?S\(\)\.setDoors\(unitId, false\)/,
    'the way back out is not the store\'s own flag');
  assert.match(adapter, /export function addDoors\(unitId\) \{[\s\S]{0,200}?setDoorCount\(unitId, 1\)/,
    'ADD DOORS does not go through the one count law');

  // …and no retail SCREEN reaches the store behind the adapter's back.
  for (const f of readdirSync(join(ROOT, 'src/retail/design')).filter((q) => /\.jsx$/.test(q))) {
    const text = uncomment(read(`src/retail/design/${f}`));
    assert.ok(!/s\.setDoors\b/.test(text), `${f} writes the doors flag directly — that is a second path`);
  }
  // Both FRONTS and EXTRAS enter at the same two adapter functions, and
  // nothing else in the retail tree calls them.
  const callers = readdirSync(join(ROOT, 'src/retail/design'))
    .filter((q) => /\.jsx$/.test(q))
    .filter((q) => /A\.(add|remove)Doors\(/.test(uncomment(read(`src/retail/design/${q}`)))); 
  assert.deepEqual(callers, ['Options.jsx'],
    `doors are hung from ${callers.length} screens: ${callers.join(', ')}`);
});

// ═══ 3 · THE BUTTONS DO WHAT THEY SAY, AND REFUSE IN WORDS WHEN THEY CANNOT ═

test('F4 · ADD hangs the doors, REMOVE takes them off — the store\'s own flag', () => {
  const id = wardrobe();
  assert.equal(A.doorsOn(id), false, 'a fresh wardrobe arrives with doors');
  A.addDoors(id);
  assert.equal(A.doorsOn(id), true, 'ADD DOORS hung nothing');
  assert.ok(S().unitResult(id).panels.some((p) => p.role === 'front'), 'no front was cut');
  A.removeDoors(id);
  assert.equal(A.doorsOn(id), false, 'REMOVE DOORS took nothing off');
  assert.ok(!S().unitResult(id).panels.some((p) => p.role === 'front'), 'a front survived the removal');
});

test('F4 · the one that cannot act is DISABLED with a reason, never hidden', () => {
  const src = OPTIONS();
  assert.match(src, /data-testid="fronts-add-doors"[\s\S]{0,300}?disabled=\{!unit \|\| A\.doorsOn\(unit\.id\)\}/,
    'ADD stays live on a wardrobe that already has doors');
  assert.match(src, /data-testid="fronts-remove-doors"[\s\S]{0,300}?disabled=\{!unit \|\| !A\.doorsOn\(unit\.id\)\}/,
    'REMOVE stays live on a wardrobe with none');
  for (const key of ['doorsAreAlreadyOn', 'doorsAreAlreadyOff', 'doorsNeedAWardrobe', 'doorsAreASeparateChoice']) {
    assert.ok(REASONS[key] && REASONS[key].length > 10, `${key} is not a sentence`);
    assert.ok(src.includes(`REASONS.${key}`), `${key} is written and never shown`);
  }
});

test('F4 · with no wardrobe on the stage neither button can fire', () => {
  const src = OPTIONS();
  assert.match(src, /onClick=\{\(\) => unit && setSaid\(A\.addDoors\(unit\.id\)\.said\)\}/,
    'ADD would read a unit that is not there');
  assert.match(src, /onClick=\{\(\) => unit && setSaid\(A\.removeDoors\(unit\.id\)\.said\)\}/,
    'REMOVE would read a unit that is not there');
  // …and the step is handed the unit at all, which it was not before tonight.
  assert.match(src, /<FrontsPanel design=\{props\.design\} project=\{props\.project\} unit=\{props\.unit\} \/>/);
  assert.match(src, /function FrontsPanel\(\{ design, project, unit \}\)/);
});

test('F4 · the engine answers both presses in words, and retail shows them', () => {
  const id = wardrobe();
  const on = A.addDoors(id);
  assert.equal(typeof on.said, 'string', 'the store said nothing about hanging doors');
  const off = A.removeDoors(id);
  assert.equal(typeof off.said, 'string');
  assert.match(OPTIONS(), /\{said \? <Said testid="fronts-said">\{said\}<\/Said> : null\}/,
    'FRONTS has nowhere to show what the store said');
});
