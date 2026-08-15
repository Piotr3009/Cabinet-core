// ─── F1: THE SHELL IS MANDATORY (turn 31, CLAUDE.md F1) ─────────────────────
//
// "The owner's standing rule — every modal draggable, opening BESIDE the
// clicked object — is real in 3 of 42 components. `Modal.jsx` already knows
// how; make it the mandatory shell."
//
// Turn 12 wrote the shell and turn 12's own test (test/modal-shell.test.js)
// proves the ARITHMETIC: a placed modal never covers its object, a dragged one
// is clamped and never flipped. None of that was ever the problem. The problem
// is the word MANDATORY, and mandatory is not a property of a calculation — it
// is a property of the SOURCE. A window that draws its own floating div is not
// wrong at 1440×900 and right at 1280×720; it is simply not a shell window,
// and no runtime assertion can find it because nothing ever mounts it in node.
//
// So this file reads src/ and asserts three things about the code itself:
//
//   1. EVERY window goes through the shell. A component whose name ends in
//      "Modal", or which the app renders for a registry name, imports
//      `Modal.jsx` and renders `<Modal`.
//   2. EVERY floating surface takes its z-order from ONE authority. No second
//      opinion about what sits over what, anywhere in src/.
//   3. EVERY opener of an object-bound modal hands it the object. The guard
//      that speaks is tested here as arithmetic; the CALL SITES are tested as
//      text, because that is where the fault lives.
//
// Plus the guard's own contract (rule 4): it SPEAKS and never fixes.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  LAYER_CLASS, LAYER_ORDER, MODAL_KINDS, MODAL_NAMES,
  isAnchor, layerClass, modalAnchorFault, modalNeedsAnchor, withModalAnchor,
} from '../src/lib/modalLayer.js';

const SRC = new URL('../src/', import.meta.url).pathname;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.(js|jsx)$/.test(path)) out.push(path);
  }
  return out;
}
const FILES = walk(SRC);
const read = (p) => readFileSync(p, 'utf8');
const short = (p) => p.slice(SRC.length);

// ─── 1. EVERY WINDOW GOES THROUGH THE SHELL ─────────────────────────────────

test('every *Modal component in the app renders the shell, and nothing else does its own', () => {
  const windows = FILES.filter((p) => /components\/\w*Modal\.jsx$/.test(p) && !p.endsWith('/Modal.jsx'));
  assert.ok(windows.length >= 12, `only ${windows.length} modal components found`);
  for (const path of windows) {
    const text = read(path);
    assert.match(text, /import Modal from '\.\/Modal\.jsx'/, `${short(path)} does not import the shell`);
    assert.match(text, /<Modal\b/, `${short(path)} imports the shell but does not render it`);
  }
});

test('…and the new-project flow, which is a window without the word in its name', () => {
  const text = read(join(SRC, 'components/NewProjectFlow.jsx'));
  assert.match(text, /import Modal from '\.\/Modal\.jsx'/);
  assert.match(text, /<Modal\b/);
});

test('every shell window names itself, and every name it gives is in the registry', () => {
  const seen = new Set();
  for (const path of FILES) {
    if (!path.endsWith('.jsx')) continue;
    const text = read(path);
    if (!/<Modal\b/.test(text)) continue;
    for (const m of text.matchAll(/<Modal\b[\s\S]{0,400}?name="([^"]+)"/g)) seen.add(m[1]);
  }
  // Every window that the app can put on screen has said which one it is…
  assert.ok(seen.size >= 15, `only ${seen.size} named windows`);
  // …and no window has invented a name the registry has never heard of.
  for (const name of seen) {
    assert.ok(MODAL_KINDS[name], `<Modal name="${name}"> is not in the registry`);
  }
});

test('no window in src/ draws its own full-screen backdrop — that is the shell\'s', () => {
  for (const path of FILES) {
    if (path.endsWith('/Modal.jsx')) continue;
    const text = read(path);
    assert.ok(
      !/fixed inset-0/.test(text),
      `${short(path)} draws its own full-screen overlay; route it through Modal.jsx`,
    );
  }
});

// ─── 2. ONE Z-ORDER AUTHORITY ───────────────────────────────────────────────

test('the z-order is one ordered list, and a menu is over a modal on purpose', () => {
  const ORDER = ['inPanel', 'panel', 'chrome', 'flyout', 'modal', 'menu', 'message'];
  assert.deepEqual(Object.keys(LAYER_ORDER), ORDER, 'the authority lists every layer, in order');
  for (let i = 1; i < ORDER.length; i += 1) {
    assert.ok(
      LAYER_ORDER[ORDER[i - 1]] < LAYER_ORDER[ORDER[i]],
      `${ORDER[i - 1]} is not under ${ORDER[i]}`,
    );
  }
  assert.ok(LAYER_ORDER.panel < LAYER_ORDER.flyout);
  assert.ok(LAYER_ORDER.flyout < LAYER_ORDER.modal);
  // A right-click menu is opened FROM a window and its whole job is to be
  // clicked: a modal covering one is a menu nobody can use.
  assert.ok(LAYER_ORDER.modal < LAYER_ORDER.menu);
  // …and a RED message that stays until it is clicked is over everything, or
  // the app has no way left to say "this is lost work" (F2).
  assert.ok(LAYER_ORDER.menu < LAYER_ORDER.message);
  assert.equal(layerClass('menu'), LAYER_CLASS.menu);
  // An unknown layer is the modal layer rather than `z-auto` — an unnamed
  // floating surface that lands under the page is invisible, which is worse
  // than landing in the wrong order.
  assert.equal(layerClass('nonsense'), LAYER_CLASS.modal);
});

test('nothing in src/ has a second opinion about z-order', () => {
  const AUTHORITY = join(SRC, 'lib/modalLayer.js');
  for (const path of FILES) {
    if (path === AUTHORITY) continue;
    const text = read(path);
    const hits = [...text.matchAll(/\bz-(?:\d+|\[\d+\])\b/g)].map((m) => m[0]);
    assert.deepEqual(hits, [], `${short(path)} sets its own z-order (${hits.join(', ')}) — use LAYER_CLASS`);
  }
});

test('the classes are LITERALS, or Tailwind never generates them', () => {
  const text = read(join(SRC, 'lib/modalLayer.js'));
  for (const cls of Object.values(LAYER_CLASS)) {
    assert.ok(text.includes(`'${cls}'`), `${cls} is not written as a literal in the authority`);
  }
});

// ─── 3. AN OBJECT-BOUND WINDOW IS OPENED WITH ITS OBJECT ────────────────────

test('every openModal / pushModal call site for an object-bound window carries one', () => {
  const bad = [];
  for (const path of FILES) {
    const text = read(path);
    for (const m of text.matchAll(/\b(?:openModal|pushModal)\(\s*'([^']+)'\s*(,|\))/g)) {
      const name = m[1];
      if (!modalNeedsAnchor(name)) continue;
      // A line comment explaining an old bug is not a call site. (`editorStack.js`
      // quotes `openModal('part-detail', …)` in the note about why it exists.)
      const lineStart = text.lastIndexOf('\n', m.index) + 1;
      if (/^\s*(?:\/\/|\*|\/\*)/.test(text.slice(lineStart, m.index))) continue;
      // The args expression: from the comma to the balanced close.
      const from = m.index + m[0].length;
      if (m[2] === ')') { bad.push(`${short(path)}: ${name} opened with no args at all`); continue; }
      let depth = 1;
      let i = from;
      while (i < text.length && depth > 0) {
        const c = text[i];
        if ('({['.includes(c)) depth += 1;
        else if (')}]'.includes(c)) depth -= 1;
        i += 1;
      }
      const args = text.slice(from, i);
      if (!/\banchor\s*:/.test(args) && !/\bat\b\s*[,:}]/.test(args)) {
        bad.push(`${short(path)}: ${name} opened without an anchor`);
      }
    }
  }
  assert.deepEqual(bad, [], bad.join('\n'));
});

test('the click point → anchor conversion happens ONCE, in the authority', () => {
  // Four components used to carry their own copy of this line. `anchorAtPoint`
  // still exists and is still the adapter; what must not come back is a second
  // reconciliation of `{ at }` and `{ anchor }` inside a window.
  const offenders = FILES.filter((p) => p.includes('/components/'))
    .filter((p) => /anchorAtPoint\(\s*args\?\./.test(read(p)));
  assert.deepEqual(offenders.map(short), []);
});

// ─── THE GUARD ITSELF — IT SPEAKS, AND IT NEVER FIXES (rule 4) ──────────────

test('a click point becomes a rectangle of zero size, and nothing else changes', () => {
  const out = withModalAnchor({ unitId: 'u1', at: { x: 300, y: 210 } });
  assert.deepEqual(out.anchor, {
    x: 300, y: 210, width: 0, height: 0,
  });
  assert.equal(out.unitId, 'u1');
  // An anchor already given is left exactly alone.
  const rect = { x: 1, y: 2, width: 3, height: 4 };
  assert.equal(withModalAnchor({ anchor: rect }).anchor, rect);
  // Nothing to convert is not an error and is not an invention.
  assert.deepEqual(withModalAnchor({ unitId: 'u1' }), { unitId: 'u1' });
  assert.equal(withModalAnchor(null), null);
  assert.equal(isAnchor({ x: 0, y: 0 }), true);
  assert.equal(isAnchor({ x: 'a', y: 0 }), false);
  assert.equal(isAnchor(null), false);
});

test('an object-bound window opened with nothing is NAMED — and still opens', () => {
  const fault = modalAnchorFault('cabinet', { unitId: 'u1' });
  assert.ok(fault, 'the guard said nothing');
  assert.match(fault, /cabinet/);
  assert.match(fault, /without an anchor/);
  // Rule 4: it SPEAKS. It returns a sentence — it does not return a repaired
  // args object, and there is no code path here that manufactures a rectangle.
  assert.equal(typeof fault, 'string');
});

test('…and a project-level window opened with nothing is perfectly correct', () => {
  assert.equal(modalAnchorFault('save-as', null), null);
  assert.equal(modalAnchorFault('auth', {}), null);
  // With a gesture behind it, it still takes the anchor — the shell centres
  // only when there was nothing to stand beside.
  assert.equal(modalAnchorFault('save-as', { anchor: { x: 4, y: 4 } }), null);
});

test('a window nobody registered is a fault of its own', () => {
  const fault = modalAnchorFault('mystery-window', { anchor: { x: 1, y: 1 } });
  assert.match(fault, /not in the registry/);
});

test('the registry says which windows are about an object, and means it', () => {
  assert.equal(modalNeedsAnchor('cabinet'), true);
  assert.equal(modalNeedsAnchor('element'), true);
  assert.equal(modalNeedsAnchor('part-detail'), true);
  assert.equal(modalNeedsAnchor('unit-finish'), true);
  assert.equal(modalNeedsAnchor('auth'), false);
  assert.equal(modalNeedsAnchor('save-as'), false);
  for (const name of MODAL_NAMES) {
    assert.ok(['object', 'project'].includes(MODAL_KINDS[name].about), name);
    assert.ok(MODAL_KINDS[name].label, `${name} has no label`);
  }
});

test('an `at` point satisfies the guard as well as a rectangle does', () => {
  assert.equal(modalAnchorFault('element', { at: { x: 12, y: 34 } }), null);
  assert.ok(modalAnchorFault('element', { at: { x: null, y: 34 } }));
});
