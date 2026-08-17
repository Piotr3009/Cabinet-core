import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { hingeRows } from '../src/engine/items.js';

// ─── TURN 36 (CLAUDE.md F4): HINGES — THE THREE 14.08 FINDINGS, CLOSED ──────
//
// Re-issued from T35-F5, all three of the owner's findings verbatim in that
// spec:
//   (a) REMOVE the plate stand-in — a plate is the downloaded GLB or nothing;
//       the invisible pick target stays;
//   (b) the plate GLB moves 5 mm INTO the side (`hardware.hinge.plateBiteMm`,
//       profile-listed) so screws sit in timber;
//   (c) the modal's hinge rows sort by Y DESCENDING — top hinge first.

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

/** The body of one component, cut at the next top-level thing. */
function block(text, marker) {
  const at = text.indexOf(marker);
  assert.notEqual(at, -1, `expected to find ${marker}`);
  const rest = text.slice(at + marker.length);
  const next = rest.search(/\n(?:export )?function |\n\/\*\*\n|\n\/\/ ─── /);
  return rest.slice(0, next < 0 ? rest.length : next);
}

const HARDWARE = src('3d/Hardware.jsx');

// ═══ (a) THE STAND-IN IS GONE ═══════════════════════════════════════════════

test('F4a — no plate PRIMITIVE is drawn in any state (the 14.08 pattern)', () => {
  const carcass = block(HARDWARE, 'function CarcassHinges(');
  // The 14.08 assertion shape, applied to the fourth member: a hinge is the
  // downloaded model or NOTHING.
  assert.doesNotMatch(carcass, /<Pieces/, 'no stand-in surface at all');
  assert.doesNotMatch(carcass, /placePlate/, 'and no placement helper for one');
  assert.doesNotMatch(carcass, /boxGeometry/, 'the plate box is not drawn from here');
  assert.doesNotMatch(carcass, /drawnModel/, 'nothing is gated on "did a model load"');
  // What DID stay: the GLB, and the registry row the acceptance walk reads.
  assert.match(carcass, /<primitive/);
  assert.match(carcass, /reportHardware\(surface, 'plate'/);
});

test('F4a — the INVISIBLE PICK TARGET stays, exactly where it was', () => {
  // The owner's sentence has two halves and this is the second. The pick
  // surface is the ARM's, in DoorHinges, invisible by CONSTANT rather than by
  // gate — untouched by this turn.
  const door = block(HARDWARE, 'export function DoorHinges(');
  const stands = door.split('<Pieces').slice(1);
  assert.equal(stands.length, 1, 'the pick surface, and nothing else');
  const props = stands[0].slice(0, stands[0].indexOf('>'));
  assert.match(props, /visible=\{false\}/, 'invisible in every state — no gate to misfire');
  assert.match(props, /onDoubleClick=\{pick\}/, 'and it is the gesture, which is why it exists');
});

// ═══ (b) THE 5 mm BITE ══════════════════════════════════════════════════════

test('F4b — the bite is a PROFILE number, and it is 5', () => {
  assert.equal(P.hardware.hinge.plateBiteMm, 5);
  // Beside the plate's other measurements, where a workshop would look for it.
  const profile = src('engine/profile.js');
  const at = profile.indexOf('plateBiteMm');
  assert.ok(at > profile.indexOf('plateThickness: 12'), 'listed with the plate');
});

test('F4b — the plate GLB is placed INTO the side, never on its face', () => {
  const carcass = block(HARDWARE, 'function CarcassHinges(');
  assert.match(carcass, /const bite = Number\(H\.plateBiteMm\) \|\| 0;/);
  // `dir` is +1 towards the middle of the door for a left hinge, so INTO the
  // side is −dir. The sign is the whole feature.
  assert.match(carcass, /position=\{\[mm\(items\[i\]\.plateX - items\[i\]\.dir \* bite\), /);
});

test('F4b — the bite reaches the PICTURE and nothing else', () => {
  // No hole, no cut and no BOM line may follow from it. The engine never reads
  // the number: it is a 3-D placement and it is stated as one.
  for (const file of ['engine/cabinet.js', 'engine/hardware3d.js', 'engine/bom.js', 'engine/checks.js']) {
    assert.doesNotMatch(src(file), /plateBiteMm/, `${file} does not read the bite`);
  }
});

// ═══ (c) TOP HINGE FIRST ════════════════════════════════════════════════════

test('F4c — hingeRows sorts by Y DESCENDING and keeps the ENGINE index', () => {
  const rows = hingeRows([100, 1000, 2050]);
  assert.deepEqual(rows.map((r) => r.mm), [2050, 1000, 100], 'top first');
  assert.deepEqual(rows.map((r) => r.index), [2, 1, 0], 'the engine index rides along');
  assert.deepEqual(rows.map((r) => r.num), [3, 2, 1], '…and so does the engine number');
});

test('F4c — an unsorted or empty list is answered without complaint', () => {
  assert.deepEqual(hingeRows([]).length, 0);
  assert.deepEqual(hingeRows().length, 0);
  assert.deepEqual(hingeRows(null).length, 0);
  // A list the engine has not sorted still comes back top-first, and each row
  // still points at the entry it came from.
  const rows = hingeRows([500, 100, 900]);
  assert.deepEqual(rows.map((r) => r.mm), [900, 500, 100]);
  assert.deepEqual(rows.map((r) => r.index), [2, 0, 1]);
});

test('F4c — the modal renders THAT order, and passes the engine index on', () => {
  const modal = src('components/DoorModal.jsx');
  assert.match(modal, /import \{ hingeRows \} from '\.\.\/engine\/items\.js'/);
  assert.match(modal, /\{hingeRows\(rows\)\.map\(\(hr\) => \(/);
  // Every control that WRITES takes `hr.index` — never the display position.
  for (const call of [
    /setHingePos\(unit\.id, hr\.index, hr\.mm \+ /,
    /setHingePos\(unit\.id, hr\.index, hr\.mm - /,
    /setHingePos\(unit\.id, hr\.index, v\)/,
    /removeHinge\(unit\.id, hr\.index\)/,
  ]) assert.match(modal, call);
  // …and the gold ring from a 3-D pick reads the same index, because the pick
  // counts bottom-up.
  assert.match(modal, /row === hr\.index/);
  assert.match(modal, /data-hinge-row=\{hr\.index\}/);
  assert.match(modal, /data-hinge-modal-row=\{hr\.index\}/);
  assert.match(modal, /data-hinge-modal-remove=\{hr\.index\}/);
});

test('F4c — the DISPLAYED number is still the engine\'s, so 1 is the bottom hinge', () => {
  const modal = src('components/DoorModal.jsx');
  assert.match(modal, /tabular-nums">\{hr\.num\}/);
  // The same law the shelves and the drawers have carried since turn 4.
  const items = src('engine/items.js');
  assert.match(items, /export function hingeRows/);
  assert.match(items, /export function shelfRows/);
  assert.match(items, /export function drawerRows/);
});
