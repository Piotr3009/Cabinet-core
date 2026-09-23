// ─── TURN 74 · F3 · SETUP ROOM: THE WALL LENGTH FIELD OPENS FOCUSED ────────
//
// The owner, 23.09.2026 (list point 1):
//
//   *"Po kliknięciu długości ściany pole na karteczce od razu ma focus i całą
//   wartość zaznaczoną (np. 3437, piszę 3500 bez myszki). Enter potwierdza to,
//   co narysowane myszką; Escape anuluje."*
//
// The same pattern as T73 F3 (`src/3d/SpacingChain.jsx`: a ref, `focus()`
// then `select()`), not a second one.
//
// WHERE THE LABEL IS. The field ON THE LABEL, opened by a click at the end of
// the wall the mouse drew, exists in the client's DrawRoomModal since T69 F2,
// and there only: T69 F2 made retail's file stop being a copy (PRO's was not
// touched, on the owner's order then), so the copy machine does not list it
// and running it would erase the very field this point is about. Retail's file
// is therefore edited by hand, fenced here. PRO's window keeps its own
// always-open field; it gets the same focus and select, the same refusal and
// the same Escape, and nothing of T69 F2 is ported into it.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

const PRO = 'src/components/DrawRoomModal.jsx';
const RETAIL = 'src/retail/design/room/DrawRoomModal.jsx';
const SELECT = /setTimeout\(\(\) => \{ fieldRef\.current\?\.focus\(\); fieldRef\.current\?\.select\(\); \}, 0\)/;

test('T74 F3 · retail: the field on the label opens focused, its whole number selected', () => {
  const src = uncomment(read(RETAIL));
  assert.match(src, SELECT, 'not T73 F3\'s focus-then-select');
  // …every time the field opens, since it opens at each click.
  const effect = src.slice(src.indexOf('if (!field) return undefined;\n    const t = setTimeout'));
  assert.ok(effect.length > 0 && /\}, \[field\]\);/.test(effect.slice(0, 260)),
    'the select does not follow the field when it opens');
  assert.match(src, /onFocus=\{\(e\) => e\.currentTarget\.select\(\)\}/);
  // …and the number in it is the length the mouse drew (the 3437).
  assert.match(src, /const drawn = Math\.max\(0, Math\.round\(Math\.abs\(d\.dx \? at\.x - pen\.x : at\.y - pen\.y\)\)\);/);
  assert.match(src, /setTyped\(String\(drawn\)\);/);
});

test('T74 F3 · retail: Enter commits the typed number, or with nothing typed the drawn one', () => {
  const src = uncomment(read(RETAIL));
  const commit = src.slice(src.indexOf('const commit = useCallback'), src.indexOf('const close = useCallback'));
  assert.match(commit, /const want = typed\.trim\(\) \? Number\(typed\) : \(field \? field\.drawn : Number\(typed\)\);/);
  assert.match(commit, /addSegment\(path, dir, want\)/);
  assert.match(commit, /\[path, dir, typed, field\]/, 'the commit reads a stale field');
  // A refusal leaves the number selected, so the next key replaces it.
  assert.match(commit, /if \(res\.error\) \{ setError\(res\.error\); fieldRef\.current\?\.select\(\); return false; \}/);
});

test('T74 F3 · retail: Escape cancels the field and the drawing stays', () => {
  const src = uncomment(read(RETAIL));
  assert.match(src, /if \(e\.key === 'Escape'\) \{ e\.preventDefault\(\); letGo\(\); return; \}/);
  // Before tonight the shell's own Escape (on `window`) fired too, and Escape
  // threw the whole drawing away. The field's listener now takes the key in
  // the capture phase and stops it; rule 15 stands (no `escapeCloses=`).
  assert.match(src, /const onKey = \(ev\) => \{ if \(ev\.key === 'Escape'\) \{ ev\.stopPropagation\(\); letGo\(\); \} \};/);
  assert.match(src, /window\.addEventListener\('keydown', onKey, true\);/);
  assert.ok(!/escapeCloses=/.test(src), 'the shell\'s key was turned off (rule 15)');
  const letGo = src.slice(src.indexOf('const letGo'), src.indexOf('const commit'));
  assert.ok(!/setPath/.test(letGo), 'letting go touched the drawing');
});

test('T74 F3 · PRO: the same focus and select, the same refusal, the same Escape', () => {
  const src = uncomment(read(PRO));
  assert.match(src, SELECT, 'PRO does not open its field with the number selected');
  assert.match(src, /onFocus=\{\(e\) => e\.currentTarget\.select\(\)\}/);
  assert.match(src, /if \(res\.error\) \{ setError\(res\.error\); fieldRef\.current\?\.select\(\); return false; \}/);
  assert.match(src, /if \(e\.key === 'Escape' && typed\.trim\(\)\) \{\s*e\.preventDefault\(\);\s*e\.stopPropagation\(\);\s*setTyped\(''\);/);
  assert.ok(!/escapeCloses=/.test(src), 'the shell\'s key was turned off (rule 15)');
  // T69 F2's fence still stands: nothing of the click-point field in PRO.
  assert.ok(!/data-draw-field/.test(src) && !/onCanvasDown/.test(src));
});

test('T74 F3 · one pattern: the field\'s select is SpacingChain\'s, not a second one', () => {
  assert.match(read('src/3d/SpacingChain.jsx'), SELECT);
});
