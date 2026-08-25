// ─── TURN 48, CLAUDE.md F7: `top_under` GETS ITS OWN PICTURE ────────────────
//
//   *"`LightArt` has no branch for `top_under` — the variant falls through to a
//   neighbour's drawing and shows a strip washing UP over the cabinet (owner's
//   screenshot). Draw its own: the strip UNDER the top board, inside the
//   carcass, washing DOWN. And verify the 3-D emission for the same variant —
//   if the light itself points up, fix it here, named in the PR."*
//
// The chain of `if`s in `LightArt` ended at `top` and everything after it fell
// through to the SPOTS drawing, so the call site asked for `kind="top"` — and
// the control that puts a strip UNDER the top board was illustrated by one
// sitting ON it, washing up the wall.
//
// THE 3-D WAS ALREADY RIGHT. `top_under` fell into the `else` of `orientation`
// and shone DOWN. But "right by falling through" is exactly how the panel's own
// bug happened one file over, so the law is written down rather than left to a
// default, and this file holds it.
//
// React is tested by READING it here — no component is mounted anywhere in this
// suite, and a JSX file cannot be imported by `node --test` at all.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const PANEL = src('components/LightingPanel.jsx');
const STRIPS = src('3d/LedStrips.jsx');

// ══ F7 — top_under GETS ITS OWN PICTURE ════════════════════════════════════

test('F7 — `top_under` has a branch of its own in LightArt', () => {
  assert.match(PANEL, /if \(kind === 'top_under'\) \{/,
    'it used to fall through the whole chain and land on the SPOTS drawing');
  // …and the call site stops borrowing its neighbour's.
  const tool = PANEL.slice(PANEL.indexOf('data-lighting-tool="top_under"'));
  const art = /<LightArt kind="([a-z_]+)" \/>/.exec(tool);
  assert.equal(art[1], 'top_under', 'the under-the-top tool draws the under-the-top picture');
  // There is exactly ONE `kind="top"` art left, and it is the top wash's own.
  assert.equal((PANEL.match(/<LightArt kind="top" \/>/g) || []).length, 1);
});

test('F7 — and the picture is the OPPOSITE of the top wash: inside, and downward', () => {
  const from = PANEL.indexOf("if (kind === 'top_under')");
  const art = PANEL.slice(from, PANEL.indexOf('</svg>', from));
  // The carcass is drawn from the TOP of the frame down (y=4), like every other
  // interior drawing here — the top wash draws it from y=18 with the strip
  // above it, which is the whole difference.
  assert.match(art, /<rect x="14" y="4" width="44" height="36"/);
  // The top BOARD is a line inside that outline, and the strip is UNDER it.
  assert.match(art, /<path d="M14 11 L58 11"/);
  assert.match(art, /<rect x="22" y="12" width="28" height="3" fill=\{led\} \/>/);
  // The rays go DOWN: every one of them ends lower than it starts.
  const rays = /<path d="(M26 19[^"]*)"/.exec(art)[1];
  for (const seg of rays.split('M').filter(Boolean)) {
    const [y0, y1] = seg.trim().split(/\s+L?/).filter(Boolean).map(Number).filter((v, i) => i % 2 === 1);
    assert.ok(y1 > y0, `a ray from ${y0} to ${y1} is not going down`);
  }
});

// ══ F7 — …AND THE LIGHT ITSELF POINTS DOWN ═════════════════════════════════

test('F7 — the 3-D emission for top_under is DOWN, and it is stated, not fallen into', () => {
  // It was already right: `top_under` fell into the `else` and shone down. But
  // "right by falling through" is exactly how the panel's own bug happened one
  // file over, so the two sets are written down and this holds them.
  assert.match(STRIPS, /const EMITS_UP = new Set\(\['top'\]\);/);
  assert.match(STRIPS, /const EMITS_DOWN = new Set\(\['shelf', 'bottom', 'top_under'\]\);/);
  // Named in DOWN, and NOT in UP — the two are opposites and a kind in both
  // would be a contradiction.
  const up = /const EMITS_UP = new Set\(\[([^\]]*)\]\)/.exec(STRIPS)[1];
  const down = /const EMITS_DOWN = new Set\(\[([^\]]*)\]\)/.exec(STRIPS)[1];
  assert.equal(up.includes('top_under'), false);
  assert.ok(down.includes('top_under'));
  // …and the rotation each set gets is the one that means what it says: a light
  // looks along its local −Z, so +90° about X aims it at +Y and −90° at −Y.
  assert.match(STRIPS, /if \(up\) e\.set\(HALF_PI, 0, 0\);\s+\/\/ -Z → \+Y \(up\)/);
  assert.match(STRIPS, /else if \(down\) e\.set\(-HALF_PI, 0, 0\);\s+\/\/ -Z → -Y \(down\)/);
});

test('F7 — a kind nobody has classified still shines DOWN', () => {
  // The default is load-bearing: the next variant somebody adds gets a shelf
  // strip's behaviour rather than a wall wash's, which is the safe way round.
  assert.match(STRIPS, /const down = EMITS_DOWN\.has\(s\.kind\) \|\| \(!up && s\.kind !== 'side'\);/);
});
