import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  EMPTY_NAV, canGoBack, closeNav, navDepth, openNav, parentView, popNav, pushNav,
} from '../src/lib/editorStack.js';

// ─── TURN 23 · F1 — Back: the editor grows a navigation stack ───────────────
//
// CLAUDE.md's TESTS section asks for exactly this: "the navigation stack
// (push/pop/Esc as arithmetic on view state)". So the whole of F1's behaviour
// is proven here, in node, without a browser — and the browser walk then proves
// that the BUTTON is wired to it (R1, real CDP input).

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('F1.1 — nothing open is depth 0, and there is nothing to go back to', () => {
  assert.equal(navDepth(EMPTY_NAV), 0);
  assert.equal(canGoBack(EMPTY_NAV), false);
  assert.equal(parentView(EMPTY_NAV), null);
});

test('F1.1 — a top-level open is depth 1 and carries its args', () => {
  const nav = openNav(EMPTY_NAV, 'cabinet', { unitId: 'u1' });
  assert.equal(nav.view, 'cabinet');
  assert.deepEqual(nav.args, { unitId: 'u1' });
  assert.equal(navDepth(nav), 1);
});

test('F1.2 — THE TOP LEVEL HAS NO BACK', () => {
  const nav = openNav(EMPTY_NAV, 'cabinet', { unitId: 'u1' });
  assert.equal(canGoBack(nav), false);
});

test('F1.1 — PUSH: the nested view is on screen, the parent is suspended', () => {
  const editor = openNav(EMPTY_NAV, 'cabinet', { unitId: 'u1' });
  const detail = pushNav(editor, 'part-detail', { unitId: 'u1', panelId: 'BACK' }, { selectedId: 'BUL' });
  assert.equal(detail.view, 'part-detail');
  assert.equal(navDepth(detail), 2);
  assert.equal(canGoBack(detail), true);
  assert.equal(parentView(detail), 'cabinet');
  assert.equal(detail.stack.length, 1);
  assert.deepEqual(detail.stack[0].args, { unitId: 'u1' });
});

test('F1.1 — POP restores the previous view EXACTLY as it was left', () => {
  const left = {
    exploded: true,
    selectedId: 'BUL',
    openFronts: { FRONT: 1 },
    allOpen: false,
    camera: { position: [1, 2, 3], target: [0, 0.5, 0] },
    scrollTop: 120,
  };
  const editor = openNav(EMPTY_NAV, 'cabinet', { unitId: 'u1' });
  const detail = pushNav(editor, 'part-detail', { unitId: 'u1', panelId: 'BACK' }, left);
  const back = popNav(detail);

  assert.equal(back.view, 'cabinet');
  // …the SAME unit,
  assert.deepEqual(back.args, { unitId: 'u1' });
  // …and the same camera, selection and scroll, handed back on the way in.
  assert.deepEqual(back.restore, left);
  assert.equal(navDepth(back), 1);
  assert.equal(canGoBack(back), false);
});

test('F1.2 — ESC IS BACK ONE LEVEL, not close-everything', () => {
  // Three deep: the drawer editor's own part detail, which is the case F1.1
  // names as "future" and which this arithmetic already serves.
  let nav = openNav(EMPTY_NAV, 'cabinet', { unitId: 'u1' });
  nav = pushNav(nav, 'cabinet', { unitId: 'u1', drawer: 2 }, { exploded: false });
  nav = pushNav(nav, 'part-detail', { unitId: 'u1', panelId: 'D2-S-L' }, { exploded: true });
  assert.equal(navDepth(nav), 3);

  nav = popNav(nav);
  assert.equal(nav.view, 'cabinet');
  assert.deepEqual(nav.args, { unitId: 'u1', drawer: 2 });
  assert.deepEqual(nav.restore, { exploded: true });
  // One level, not all of them: the cabinet editor is still underneath.
  assert.equal(navDepth(nav), 2);
});

test('F1.2 — DONE / × closes the WHOLE editor, however deep it is', () => {
  let nav = openNav(EMPTY_NAV, 'cabinet', { unitId: 'u1' });
  nav = pushNav(nav, 'part-detail', { unitId: 'u1', panelId: 'BACK' }, {});
  const shut = closeNav(nav);
  assert.equal(shut.view, null);
  assert.equal(navDepth(shut), 0);
  assert.deepEqual(shut.stack, []);
});

test('POP at the top level closes — Escape on the cabinet editor still shuts it', () => {
  const nav = openNav(EMPTY_NAV, 'cabinet', { unitId: 'u1' });
  assert.equal(popNav(nav).view, null);
});

test('a TOP-LEVEL open clears the stack — a new journey has no Back into the old one', () => {
  let nav = openNav(EMPTY_NAV, 'cabinet', { unitId: 'u1' });
  nav = pushNav(nav, 'part-detail', { unitId: 'u1', panelId: 'BACK' }, {});
  nav = openNav(nav, 'design', null);
  assert.equal(navDepth(nav), 1);
  assert.equal(canGoBack(nav), false);
  assert.deepEqual(nav.stack, []);
});

test('a resumed view is told ONCE: the next open clears the restore', () => {
  let nav = openNav(EMPTY_NAV, 'cabinet', { unitId: 'u1' });
  nav = pushNav(nav, 'part-detail', { unitId: 'u1', panelId: 'BACK' }, { exploded: true });
  nav = popNav(nav);
  assert.deepEqual(nav.restore, { exploded: true });
  nav = pushNav(nav, 'part-detail', { unitId: 'u1', panelId: 'TOP' }, null);
  assert.equal(nav.restore, null);
});

test('pushing onto nothing is an OPEN — a Back button that goes nowhere is a bug', () => {
  const nav = pushNav(EMPTY_NAV, 'part-detail', { panelId: 'BACK' }, { a: 1 });
  assert.equal(nav.view, 'part-detail');
  assert.equal(navDepth(nav), 1);
  assert.equal(canGoBack(nav), false);
});

test('a partial or missing nav reads as the empty one rather than throwing', () => {
  assert.equal(navDepth(null), 0);
  assert.equal(navDepth(undefined), 0);
  assert.equal(canGoBack({}), false);
  assert.equal(popNav({}).view, null);
  assert.equal(pushNav({ view: 'cabinet' }, 'part-detail', null, null).stack.length, 1);
});

test('EMPTY_NAV is frozen — a shared constant nobody can edit under the app', () => {
  assert.equal(Object.isFrozen(EMPTY_NAV), true);
});

// ─── The wiring, asserted at the source (F1.3) ─────────────────────────────
//
// "One implementation in the editor shell — views register onto the stack, none
// keeps its own history." The arithmetic above proves the stack; these prove
// that the app is standing on it rather than beside it.

test('F1.3 — the shell owns Back and Escape, and no nested view keeps a history', () => {
  const modal = src('components/Modal.jsx');
  assert.match(modal, /onBack/, 'the shell takes an onBack');
  assert.match(modal, /data-modal-back="1"/, 'the shell renders ← Back');
  // Turn 31 (CLAUDE.md F1) renamed the shell's close to `close` — ONE close
  // path, defaulted to the store's `closeModal` so a window cannot ship
  // without one. The rule this asserts is unchanged: Escape is BACK where
  // there is a back, and close where there is not.
  assert.match(
    modal,
    /Escape'\)\s*\(onBack \|\| close\)\(\)/,
    'Escape is BACK where there is a back, and close where there is not',
  );
  assert.match(modal, /const close = onClose \|\| closeModal;/, 'one close path');
});

test('F1.3 — the part detail is PUSHED by the editor, never openModal-ed', () => {
  const editor = src('components/CabinetEditorModal.jsx');
  assert.match(editor, /pushModal\('part-detail'/, 'the detail is a level, not a replacement');
  assert.doesNotMatch(editor, /openModal\('part-detail'/);
});

test('F1.3 — the store keeps ONE stack and both editor surfaces read it', () => {
  const store = src('stores/uiStore.js');
  for (const name of ['modalStack', 'pushModal', 'popModal', 'registerViewSnapshot']) {
    assert.match(store, new RegExp(name), `uiStore exposes ${name}`);
  }
  for (const file of ['components/PartDetailModal.jsx', 'components/CabinetEditorModal.jsx']) {
    assert.match(src(file), /popModal/, `${file} goes back through the shared stack`);
  }
});

test('F1.1 — the cabinet editor snapshots the four things POP has to restore', () => {
  const editor = src('components/CabinetEditorModal.jsx');
  const snap = editor.slice(editor.indexOf('const snapshot = useCallback'), editor.indexOf('registerViewSnapshot(snapshot)'));
  for (const key of ['exploded', 'selectedId', 'openFronts', 'camera', 'scrollTop']) {
    assert.match(snap, new RegExp(key), `the snapshot carries ${key}`);
  }
});
