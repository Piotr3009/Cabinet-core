// ─── TURN 38 · F6 / F11 — the verbs, the group, and the step back ───────────
//
//   F6   Move, Copy, Rotate, Group, Delete — the five the owner named on
//        17.08 — plus Mirror, which is on F2's toolbar. Every one of them acts
//        on MANUAL objects only.
//   F11  Esc, and Ctrl+Z / Ctrl+Y over this panel's own ops.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  copyObject, groupIn, makeArc, makeCircle, makeLine, makePolyline, makeRect, mirrorObject,
  moveObject, nextGroupId, objectPoints, rotateObject, selectionFor, ungroupIn,
} from '../src/engine/partObjects.js';
import { UNDO_DEPTH } from '../src/lib/partTools.js';

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const L = 'SCREWS_3MM';

const shapes = () => [
  makeLine({ id: 'o1', layer: L, from: [0, 0], to: [100, 0] }),
  makeRect({ id: 'o2', layer: L, from: [10, 10], to: [50, 40] }),
  makeCircle({ id: 'o3', layer: L, at: [200, 200], r: 25 }),
  makeArc({ id: 'o4', layer: L, a: [0, 300], b: [50, 350], c: [100, 300] }),
  makePolyline({ id: 'o5', layer: L, pts: [[400, 0], [420, 30], [450, 0]] }),
];

// ═══ MOVE ═══════════════════════════════════════════════════════════════════

test('F6 — MOVE takes every shape by the same offset, and keeps its kind', () => {
  for (const o of shapes()) {
    const moved = moveObject(o, 7, -3);
    assert.equal(moved.op, o.op, `${o.op} is still a ${o.op}`);
    const before = objectPoints(o, 16);
    const after = objectPoints(moved, 16);
    assert.equal(before.length, after.length);
    for (let i = 0; i < before.length; i += 1) {
      assert.ok(Math.abs(after[i][0] - before[i][0] - 7) < 1e-6, `${o.op} moved 7 across`);
      assert.ok(Math.abs(after[i][1] - before[i][1] + 3) < 1e-6, `${o.op} moved 3 down`);
    }
  }
  // …and the other two things an override list carries move too, because a
  // joiner selecting a set does not sort it by kind first.
  assert.deepEqual(moveObject({ op: 'drill', x: 10, y: 20, d: 5 }, 5, 5), {
    op: 'drill', x: 15, y: 25, d: 5,
  });
  assert.deepEqual(moveObject({ op: 'dowels', from: [0, 0], to: [10, 0] }, 1, 2).to, [11, 2]);
});

test('F6 — COPY is a move with an id of its own, and no group of its own', () => {
  const [line] = shapes();
  const grouped = { ...line, group: 'g1' };
  const made = copyObject(grouped, 'o9');
  assert.equal(made.id, 'o9');
  assert.equal('group' in made, false, 'a copy of a member is not a member');
  assert.deepEqual(made.from, line.from, 'and it is the same shape until it is moved');
});

// ═══ ROTATE ═════════════════════════════════════════════════════════════════

test('F6 — ROTATE turns about the base point, anticlockwise', () => {
  const line = makeLine({ id: 'o1', layer: L, from: [0, 0], to: [100, 0] });
  const turned = rotateObject(line, 0, 0, 90);
  assert.deepEqual(turned.from, [0, 0]);
  assert.deepEqual(turned.to.map(Math.round), [0, 100]);
  // A circle keeps its radius and its centre goes round.
  const circle = rotateObject(makeCircle({ id: 'o2', layer: L, at: [10, 0], r: 5 }), 0, 0, 180);
  assert.deepEqual(circle.at.map(Math.round), [-10, 0]);
  assert.equal(circle.r, 5);
  // An arc's ends take the turn with it.
  const arc = makeArc({ id: 'o3', layer: L, a: [10, 0], b: [0, 10], c: [-10, 0] });
  const spun = rotateObject(arc, 0, 0, 90);
  assert.equal(spun.r, arc.r);
  assert.ok(Math.abs(((spun.start - arc.start) % 360 + 360) % 360 - 90) < 1e-6);
});

test('F6 — a rotated RECT becomes a polyline, because a turned rectangle is not one', () => {
  const rect = makeRect({ id: 'o1', layer: L, from: [0, 0], to: [40, 20] });
  const turned = rotateObject(rect, 0, 0, 30);
  assert.equal(turned.op, 'polyline');
  assert.equal(turned.closed, true);
  assert.equal(turned.pts.length, 4, 'its own four corners, kept exactly');
  assert.equal(turned.id, 'o1', 'and it is the same object');
  // At a multiple of 90 the shape is still a rectangle, and the four corners
  // say so — the name is what was lost, not the geometry.
  const square = rotateObject(rect, 0, 0, 90);
  const xs = square.pts.map((p) => Math.round(p[0]));
  const ys = square.pts.map((p) => Math.round(p[1]));
  assert.deepEqual([...new Set(xs)].sort((a, b) => a - b), [-20, 0]);
  assert.deepEqual([...new Set(ys)].sort((a, b) => a - b), [0, 40]);
});

// ═══ MIRROR ═════════════════════════════════════════════════════════════════

test('F6 — MIRROR reflects in the line through two points', () => {
  const line = makeLine({ id: 'o1', layer: L, from: [10, 0], to: [30, 0] });
  const flipped = mirrorObject(line, { x: 0, y: 0 }, { x: 0, y: 100 });
  assert.deepEqual(flipped.from, [-10, 0]);
  assert.deepEqual(flipped.to, [-30, 0]);
  // Mirroring twice in the same line is the identity.
  const back = mirrorObject(flipped, { x: 0, y: 0 }, { x: 0, y: 100 });
  assert.deepEqual(back.from, line.from);
  // A degenerate mirror line — two identical points — is refused.
  assert.equal(mirrorObject(line, { x: 5, y: 5 }, { x: 5, y: 5 }), null);
  // …and an arc comes back an arc of the same radius.
  const arc = makeArc({ id: 'o2', layer: L, a: [10, 0], b: [20, 10], c: [30, 0] });
  const marc = mirrorObject(arc, { x: 0, y: 0 }, { x: 0, y: 100 });
  assert.equal(marc.op, 'arc');
  assert.ok(Math.abs(marc.r - arc.r) < 1e-6);
  assert.ok(Math.abs(marc.cx + arc.cx) < 1e-6, 'the centre reflected');
});

// ═══ GROUP ══════════════════════════════════════════════════════════════════

test('F6 — GROUP gives the set one id, and clicking any member selects all of it', () => {
  const ops = shapes();
  const g = nextGroupId(ops);
  assert.equal(g, 'g1');
  const grouped = groupIn(ops, ['o1', 'o2'], g);
  assert.deepEqual(grouped.filter((o) => o.group === 'g1').map((o) => o.id), ['o1', 'o2']);
  assert.deepEqual(selectionFor(grouped, 'o1'), ['o1', 'o2'], 'a click on one takes both');
  assert.deepEqual(selectionFor(grouped, 'o3'), ['o3'], 'and an ungrouped shape is itself');
  assert.deepEqual(selectionFor(grouped, 'nope'), []);
});

test('F6 — grouping a MEMBER brings its whole group with it, never splits one', () => {
  let ops = groupIn(shapes(), ['o1', 'o2'], 'g1');
  ops = groupIn(ops, ['o2', 'o3'], 'g2');
  // o1 came along: a joiner who groups one of four with a fifth means all five.
  assert.deepEqual(ops.filter((o) => o.group === 'g2').map((o) => o.id), ['o1', 'o2', 'o3']);
  assert.equal(ops.some((o) => o.group === 'g1'), false, 'and nothing is left half-grouped');
  assert.equal(nextGroupId(ops), 'g3');
});

test('F6 — UNGROUP takes the key off, and off only the named group', () => {
  let ops = groupIn(shapes(), ['o1', 'o2'], 'g1');
  ops = groupIn(ops, ['o4', 'o5'], 'g2');
  const out = ungroupIn(ops, 'g1');
  assert.equal(out.filter((o) => 'group' in o).length, 2, 'the other group is untouched');
  assert.ok(out.filter((o) => o.group === 'g2').length === 2);
  for (const o of out.filter((x) => ['o1', 'o2'].includes(x.id))) {
    assert.equal('group' in o, false, 'ABSENT, not null');
  }
});

// ═══ THE VERBS TOUCH MANUAL OBJECTS ONLY ════════════════════════════════════

test('F6 — the engine’s own geometry is NOT selectable for the verbs', () => {
  const src = read('components/PartDetailModal.jsx');
  // The verbs act on `chosen`, which is `objects` filtered — and `objects` is
  // the OP LIST, which is by construction only what a hand has drawn.
  assert.match(src, /const objects = useMemo\(\(\) => ops\.filter\(isObjectOp\)/);
  assert.match(src, /const chosen = useMemo\(\(\) => objects\.filter\(\(o\) => selected\.includes\(o\.id\)\)/);
  // …and the older flow — take a COMPUTED hole off this print — is untouched.
  assert.match(src, /op: 'hide', feature: feature\.fid/);
  assert.match(src, /data-delete-feature="1"/);
});

test('F6 — the context menu is the owner’s own five, plus Ungroup where it applies', () => {
  const src = read('components/PartDetailModal.jsx');
  assert.match(src, /data-object-menu="1"/);
  for (const verb of ['move', 'copy', 'rotate', 'group', 'delete']) {
    assert.ok(src.includes(`['${verb}',`), `${verb} is in the menu`);
  }
  assert.match(src, /canUngroup \? \[\['ungroup', 'Ungroup'\]\] : \[\]/);
  // It opens BESIDE the cursor and never off-screen — `floatAt` is the clamp
  // the drill popover and the typed entry already use, so there is one answer
  // to "where does a floating box go" in this window.
  assert.match(src, /onContextMenu\?\.\(floatAt\(/);
  // Del is the same door.
  assert.match(src, /if \(selected\.length\) \{ e\.preventDefault\(\); deleteSelected\(\); return; \}/);
});

// ═══ F11 — ESC AND THE STEP BACK ════════════════════════════════════════════

test('F11 — Esc unwinds one thing at a time and only CLOSES with nothing armed', () => {
  const src = read('components/PartDetailModal.jsx');
  const at = src.indexOf("if (e.key === 'Escape')");
  assert.ok(at > 0);
  const block = src.slice(at, at + 1200);
  // The order is the order a hand expects: the menu, the number, the dimension
  // box, the measurements, the dropdowns, the tool, the selection — and only
  // then does the key fall through to the shell, which is what closes it.
  const order = ['menu', 'typed !== null', 'entry', 'measures.length', 'openMenu', "tool !== 'select'", 'selected.length'];
  let last = -1;
  for (const step of order) {
    const i = block.indexOf(step);
    assert.ok(i > last, `${step} is unwound in order`);
    last = i;
  }
  // It CONSUMES the key while something is armed (the shell's Back listener is
  // on the same target), and does not when nothing is — one per rung above,
  // plus the Ctrl+Z branch that shares this handler.
  assert.equal((block.match(/stopImmediatePropagation\(\)/g) || []).length, order.length);
  const tail = block.slice(block.indexOf('selected.length'));
  assert.match(tail, /return;/, 'and the key falls through with nothing armed');
});

test('F11 — undo is a BOUNDED stack of this panel’s ops and nothing else', () => {
  assert.equal(UNDO_DEPTH, 50, 'CLAUDE.md’s own number');
  const src = read('components/PartDetailModal.jsx');
  assert.match(src, /const history = useRef\(\{ stack: \[\], at: -1, key: null \}\)/);
  assert.match(src, /\.slice\(-UNDO_DEPTH\)/, 'the stack is bounded');
  // Every write goes through ONE door, so nothing can be done that cannot be
  // undone…
  assert.match(src, /const commitOps = useCallback\(/);
  // …and Ctrl+Z / Ctrl+Y walk it.
  assert.match(src, /e\.key === 'z' \|\| e\.key === 'Z' \|\| e\.key === 'y' \|\| e\.key === 'Y'/);
  assert.match(src, /step\(redo \? 1 : -1\)/);
  // The DROP-BY-RESIZE is not in it — F9 calls that a rule, not an edit.
  assert.doesNotMatch(src, /dropResizedPartEdits/);
});

test('F11 — a step back really is the list as it was', () => {
  // The stack is snapshots of the ops array, so "undo" is "the previous
  // snapshot", with no replaying and nothing to get wrong. This is that
  // arithmetic, run the way the component runs it.
  const stack = [];
  let at = -1;
  const push = (ops) => {
    stack.splice(at + 1, stack.length, ops);
    while (stack.length > UNDO_DEPTH) stack.shift();
    at = stack.length - 1;
  };
  push([]);
  const a = [makeLine({ id: 'o1', layer: L, from: [0, 0], to: [10, 0] })];
  push(a);
  const b = [...a, makeCircle({ id: 'o2', layer: L, at: [5, 5], r: 3 })];
  push(b);
  assert.deepEqual(stack[at], b);
  at -= 1;
  assert.deepEqual(stack[at], a, 'undo restores the deleted circle’s absence');
  at += 1;
  assert.deepEqual(stack[at], b, 'and redo puts it back');
  // A new edit after an undo TRUNCATES the forward history, which is what
  // every undo stack in this app does.
  at -= 1;
  push([...a, makeRect({ id: 'o3', layer: L, from: [0, 0], to: [4, 4] })]);
  assert.equal(stack.length, 3);
  assert.equal(stack[at].length, 2);
});
