// ─── TURN 69 · F2 — THE LINE FOLLOWS THE MOUSE ─────────────────────────────
//
// CLAUDE.md, F2, verbatim:
//
//   *"Owner's model: drag → a straight line follows (ortho: up/down/sides
//   only); **click → a small input opens AT THE CLICK POINT**, inside the
//   canvas — never leave the drawing, orientation never lost; type the length,
//   Enter → wall done, the next line starts, direction from the mouse. Escape
//   lets go. Close the loop → the room stands. This REPLACES the current
//   DrawRoomModal interaction in the retail copy; PRO's DrawRoomModal is NOT
//   touched (not in EXEMPT)."*
//
// The GEOMETRY is `engine/drawRoom.js` and neither app touched it tonight —
// this file proves that too, because a gesture rewritten on top of a moved
// engine would be two changes wearing one name.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  DIRS, dirFromCursor, newPath, penOf, addSegment, closePath, cornersOfPath,
} from '../src/engine/drawRoom.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

const COPY = 'src/retail/design/room/DrawRoomModal.jsx';
const PRO = 'src/components/DrawRoomModal.jsx';

// ═══ 1 · THE FIELD OPENS AT THE CLICK POINT, INSIDE THE CANVAS ══════════════

test('F2 · the length field is inside the drawing, placed at the click', () => {
  const src = read(COPY);
  // It exists, it is positioned, and what positions it is the CLICK.
  assert.match(src, /data-draw-field="1"/, 'no field at the click point');
  assert.match(src, /data-draw-field-at=\{`\$\{Math\.round\(field\.px\)\},\$\{Math\.round\(field\.py\)\}`\}/,
    'the field does not publish where it opened');
  assert.match(src, /left: Math\.min\(Math\.max\(field\.px/, 'the field is not placed at the click x');
  assert.match(src, /top: Math\.min\(Math\.max\(field\.py/, 'the field is not placed at the click y');

  // INSIDE the canvas: the field is a sibling of the <svg> inside the wrapper
  // that the <svg> shares, and nothing else stands between them.
  const code = uncomment(src);
  const wrap = code.indexOf('data-draw-canvas-wrap="1"');
  const svgEnd = code.indexOf('</svg>', wrap);
  const fieldAt = code.indexOf('data-draw-field="1"', svgEnd);
  const wrapEnd = code.indexOf('</div>', svgEnd);
  assert.ok(wrap > 0 && fieldAt > svgEnd && fieldAt < wrapEnd,
    'the field is not inside the canvas wrapper — it would be outside the drawing');
});

test('F2 · the click freezes the direction, so the orientation cannot be lost', () => {
  const src = uncomment(read(COPY));
  assert.match(src, /const onCanvasDown = \(e\) => \{/, 'the canvas does not take the click');
  assert.match(src, /if \(field\) return;/,
    'the pointer still re-aims the wall while the number is being typed');
  assert.match(src, /setField\(\{ px, py, dir: d\.id \}\)/, 'the click does not record its direction');
});

test('F2 · Enter draws the wall and the next line starts; Escape lets go', () => {
  const src = uncomment(read(COPY));
  // Enter → committed → the field closes, so `onMove` is reading the cursor again.
  const commit = src.slice(src.indexOf('const commit = useCallback'), src.indexOf('const close = useCallback'));
  assert.match(commit, /setField\(null\)/, 'Enter does not start the next line');
  // Escape → the field goes, the pen does not.
  assert.match(src, /const letGo = useCallback\(\(\) => \{\s*setField\(null\);/, 'nothing lets go');
  assert.match(src, /if \(e\.key === 'Escape'\) \{ e\.preventDefault\(\); letGo\(\); return; \}/,
    'Escape does not let go from the field');
  assert.match(src, /const onKey = \(ev\) => \{ if \(ev\.key === 'Escape'\) letGo\(\); \};/,
    'Escape does not reach the drawing when the hand has left the field');
  assert.ok(!/setPath\(newPath\(\)\)/.test(src.slice(src.indexOf('const letGo'), src.indexOf('const undo'))),
    'letting go threw the drawing away');
});

test('F2 · the line follows the mouse before a single key is pressed', () => {
  const src = uncomment(read(COPY));
  assert.match(src, /const reach = !closed && pen && d && cursor/,
    'nothing measures the cursor');
  assert.match(src, /const ghostLen = Number\(typed\) > 0 \? Number\(typed\) : \(field \? 0 : reach\);/,
    'the ghost is still drawn only from the keyboard');
  // Ortho: the reach is PROJECTED on the chosen axis, never a diagonal.
  assert.match(src, /d\.dx \? \(cursor\.x - pen\.x\) \* d\.dx : \(cursor\.y - pen\.y\) \* d\.dy/,
    'the following line is not projected on an axis — it would be a diagonal');
});

test('F2 · the right-hand Wall length row is gone, and nothing dead is left', () => {
  const src = read(COPY);
  assert.ok(!src.includes('data-draw-length-clear'), 'the old row\'s ✕ is still here');
  // The one field that remains is the one inside the canvas.
  assert.equal((src.match(/data-draw-length="1"/g) || []).length, 1,
    'there is more than one length field — one law, one control');
});

// ═══ 2 · PRO IS NOT TOUCHED, AND THE GEOMETRY IS SHARED ═════════════════════

test('F2 · PRO\'s DrawRoomModal keeps its own interaction — it is not in EXEMPT', () => {
  const pro = read(PRO);
  assert.ok(!/data-draw-field/.test(pro), 'F2 reached into PRO');
  assert.ok(!/onCanvasDown/.test(pro), 'F2 reached into PRO');
  assert.match(pro, /data-draw-length="1"/, 'PRO lost the field it always had');
  assert.match(pro, /onPointerDown=\{\(\) => \{ if \(catching && !typed\.trim\(\)\) close\(\); \}\}/,
    'PRO\'s canvas gesture changed');
});

test('F2 · the drawing engine is the same engine, and it still answers', () => {
  // Both windows read `engine/drawRoom.js`; F2 rewrote a HAND, not a law.
  for (const rel of [PRO, COPY]) {
    assert.match(read(rel), /from '[^']*engine\/drawRoom\.js'/, `${rel} stopped reading the engine`);
  }
  // ortho, and only ortho
  assert.deepEqual(DIRS.map((d) => d.id).sort(), ['E', 'N', 'S', 'W']);
  assert.equal(dirFromCursor(900, 120).id, 'E', 'a mostly-right drag is not East');
  assert.equal(dirFromCursor(-40, -900).id, 'N', 'a mostly-up drag is not North');

  // …and a room drawn by that hand still closes and still stands.
  let path = newPath();
  for (const [dir, mm] of [['E', 3000], ['S', 2400], ['W', 3000]]) {
    const res = addSegment(path, dir, mm);
    assert.equal(res.error, undefined, `the engine refused ${dir} ${mm}`);
    path = res.path;
  }
  const done = closePath(path);
  assert.equal(done.error, undefined, 'the loop would not close');
  assert.equal(cornersOfPath(done.path).length, 4, 'a closed rectangle is four corners');
  assert.deepEqual(penOf(done.path), done.path[0], 'the pen did not come home');
});
