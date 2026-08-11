// ─── TURN 20 F10 + F12: THE CONTEXTS, AND THREE SMALL VERDICTS ──────────────
//
// F10's gate is a BROWSER assertion (the walk opens the editor twelve times and
// reads `window.__cc.diag`), so what a node test can hold is the contract the
// walk reads: the shape of the counter and the fact that a deliberate release
// is counted apart from a loss nobody asked for.
//
// F12's three are numbers and routing, and all three are checkable here.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import {
  carcassSources, facingMatchesSource, frontSources, pickerForSource, sourceById,
} from '../src/engine/projectSettings.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (...parts) => readFileSync(join(HERE, '..', ...parts), 'utf8');

// ─── F10 — the lost contexts ────────────────────────────────────────────────

test('F10.1 — every canvas the app mounts carries the guard', () => {
  // Three surfaces, and the walk's assertion is only as good as this list.
  const surfaces = [
    ['src/3d/Scene.jsx', 'room'],
    ['src/components/CabinetEditorModal.jsx', 'editor'],
    ['src/components/PartDetailModal.jsx', 'part-detail'],
  ];
  for (const [file, name] of surfaces) {
    const source = read(file);
    assert.ok(source.includes('<Canvas'), `${file} still mounts a canvas`);
    assert.ok(source.includes(`useContextGuard('${name}')`), `${file} names its surface`);
    assert.ok(source.includes('ref={guardContext.ref}'), `${file} hands the guard the canvas`);
    assert.ok(source.includes('onCreated={guardContext.onCreated}'), `${file} hands it the renderer too`);
  }
  // …and nothing else in the app mounts one without being on that list.
  const all = read('src/components/CncView.jsx');
  assert.ok(!all.includes('<Canvas'), 'the CNC sheet is SVG and has no context to lose');
});

test('F10.2 — the guard hangs off the canvas’s OWNER, not off the canvas', () => {
  // The turn-20 walk caught this: a guard mounted INSIDE the canvas lives in
  // r3f's separate React root, and closing the window before that root flushes
  // its effects means the guard never registers and the context leaks — which
  // is the one case the whole feature exists for.
  const source = read('src/3d/contextGuard.jsx');
  assert.ok(source.includes('export default function useContextGuard'));
  assert.ok(!source.includes('useThree'), 'it does not live inside the canvas any more');
  assert.ok(source.includes('useEffect(() => () => { release(held.current)'),
    'the release is the OWNER’s unmount, which React cannot skip');
  // …and it hangs off the ELEMENT, because r3f can have made the context
  // before it calls `onCreated` — the second thing the walk caught.
  assert.ok(source.includes('function attach(canvas, name)'));
  assert.ok(source.includes('loseContextOf'), 'the fallback for a context r3f never handed over');
  // A ref called with null is NOT a release: a forwarded ref recomposed on a
  // re-render detaches and re-attaches the same canvas, and dropping a live
  // context for that would be this module causing the bug it fixes.
  assert.ok(source.includes('if (!canvas || held.current?.canvas === canvas) return;'));
});

test('F10.2 — the guard RELEASES the context, which is what dispose() does not', () => {
  const source = read('src/3d/contextGuard.jsx');
  // The cause, and the cure, both in the file rather than in a commit message.
  assert.ok(source.includes('forceContextLoss'), 'the one call that gives a context back');
  assert.ok(source.includes('webglcontextlost'), 'and the listener F10.1 asks for');
  // A deliberate release must NOT be counted as a loss, or the gate can never
  // be zero and the number stops meaning anything…
  assert.ok(source.includes('if (!handle.releasing && !DELIBERATE.has(handle.canvas)) {'));
  // …and it must not print three's own "Context Lost" either, or the fix for
  // the owner's ten console lines would have written ten of its own. The
  // listener is registered in the CAPTURE phase so it can stop three's from
  // running on a teardown, and only on a teardown.
  assert.ok(source.includes("addEventListener('webglcontextlost', handle.onLost, true)"));
  assert.ok(source.includes('e.stopImmediatePropagation();'));
  // The loss event is ASYNCHRONOUS, so the suppressing listener stays on the
  // canvas after the teardown and a WeakSet remembers which canvases we lost —
  // otherwise three prints the message a moment after we stop listening.
  assert.ok(source.includes('const DELIBERATE = new WeakSet();'));
  assert.ok(source.includes('DELIBERATE.has(handle.canvas)'));
});

test('F10.1 — the counter the walk reads is `window.__cc.diag`', () => {
  const source = read('src/3d/contextGuard.jsx');
  assert.ok(source.includes('cc.diag'));
  for (const field of ['created', 'released', 'lost', 'restored', 'liveContexts']) {
    assert.ok(source.includes(field), `diag.${field}`);
  }
});

// ─── F12.1 — the interior outlines ──────────────────────────────────────────

test('F12.1 — the outline takes its OWN depth bias, opposite the fill’s', () => {
  const o = P.appearance.outline.polygonOffset;
  assert.deepEqual(o, {
    factor: 1, units: 1, outlineFactor: -1, outlineUnits: -1,
  });
  assert.ok(o.outlineFactor < 0 && o.outlineUnits < 0,
    'the line leans towards the camera while the face leans away');
  // A profile saved before this turn comes back with all four, or the fix is
  // off for every existing workshop.
  const older = migrateCabinetProfile({
    ...P,
    appearance: { ...P.appearance, outline: { colour: '#000', width: 1, threshold: 12 } },
  });
  assert.deepEqual(older.appearance.outline.polygonOffset, o);
});

test('F12.1 — it is a PROFILE number and the view spreads it, in both scenes', () => {
  const materials = read('src/3d/materials.js');
  assert.ok(materials.includes('export function panelOutlineOffset'));
  assert.ok(!materials.includes('polygonOffsetFactor: -1'), 'no literal in the view (rule 2)');
  // `MovingPanel` is the ONE panel renderer — the room and the cabinet editor
  // both draw through it — so one spread covers both scenes.
  const view = read('src/3d/UnitView.jsx');
  assert.ok(view.includes('{...panelOutlineOffset(profile)}'));
  assert.ok(read('src/components/CabinetEditorModal.jsx').includes('MovingPanel'));
  // No geometry changes: the bias reaches a material and nothing else.
  assert.ok(!materials.includes('geometry'), 'materials.js does not build shapes');
});

// ─── F12.2 — the save that says so ──────────────────────────────────────────

test('F12.2 — the confirmation lasts a PROFILE number of milliseconds', () => {
  assert.equal(P.ui.saveConfirmMs, 2000, '~2 s, and it is not a literal in the component');
  const stored = { ...P, ui: { ...P.ui } };
  delete stored.ui.saveConfirmMs;
  assert.equal(migrateCabinetProfile(stored).ui.saveConfirmMs, 2000);
});

test('F12.2 — only a clean save goes green, and it goes back to rest', () => {
  const bar = read('src/components/TopBar.jsx');
  assert.ok(bar.includes("data-save-control"), 'there is a control to look at');
  assert.ok(bar.includes("data-save-state"), 'and it says which state it is in');
  // The gate: a save that came back anything but 'ok' — including the
  // "saved here, the database refused it" warning — does not go green.
  assert.ok(bar.includes("if (tone !== 'ok') { setSaveState('rest'); return; }"));
  // …and it returns to rest by itself.
  assert.ok(bar.includes("setTimeout(() => setSaveState('rest'), confirmMs)"));
  assert.ok(!/setTimeout\([^,]+,\s*2000\)/.test(bar), 'the 2000 comes from the profile');
});

// ─── F12.3 — Veneer and Laminate pick EGGER decors ──────────────────────────

test('F12.3 — both faced FRONTS open the decor picker; spray keeps its palette', () => {
  const picker = (id) => pickerForSource(sourceById(frontSources(P), id));
  assert.equal(picker('laminate'), 'decor');
  assert.equal(picker('veneer'), 'decor', 'the verdict of this turn');
  assert.equal(picker('spray'), 'colour', 'and spray keeps its palette');
  assert.equal(picker('wood'), null, 'the wood range is still a later turn’s');
});

test('F12.3 — the CARCASS’s veneer source is untouched: that question was not asked', () => {
  assert.equal(pickerForSource(sourceById(carcassSources(P), 'veneer')), 'veneer');
  assert.equal(pickerForSource(sourceById(carcassSources(P), 'egger')), 'decor');
});

test('F12.3 — a project already faced in a veneer keeps it', () => {
  const front = sourceById(frontSources(P), 'veneer');
  assert.equal(facingMatchesSource('veneer:oak-natural', front), true, 'the choice is not thrown away');
  assert.equal(facingMatchesSource('egger:H1180_37', front), true, 'and a decor is what a new pick is');
  // On the CARCASS the old rule stands, because the picker there did not move.
  const carcass = sourceById(carcassSources(P), 'veneer');
  assert.equal(facingMatchesSource('egger:H1180_37', carcass), false);
});

test('F12.3 — nothing about the BOARD moves: thickness and grouping keys stand', () => {
  // "CNC grouping keys don't change." The source's own thickness is what a
  // veneer front has always been cut from, and the picker does not touch it.
  assert.equal(sourceById(frontSources(P), 'veneer').thickness, 19);
  assert.equal(sourceById(frontSources(P), 'laminate').thickness, 18);
  assert.equal(sourceById(frontSources(P), 'veneer').kind, 'board');
});
