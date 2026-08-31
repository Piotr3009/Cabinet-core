import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// ─── TURN 58b · F1 — THE PANE IS ALPHA GLASS, NOT PHYSICAL TRANSMISSION ────
//
// Two nights running the pane was declared glass and photographed opaque.
// The owner, live: *"szyba w ogóle nie jest przezroczysta… nic nie widać."*
//
// The cause is ONE property, and it is not the opacity: `transmission` moves
// a material onto three's own transmission pass, which renders what is BEHIND
// the pane into an offscreen buffer. Behind a closed watch drawer sits an
// unlit drawer box, so the buffer comes back near black, the pane resolves to
// a dark slab, and `opacity` is never consulted at all — which is why T57's
// and T58's lowering of it changed nothing anybody could see.
//
// So this turn does not lower a number. It takes the pane OFF that path.

const UNIT_VIEW = readFileSync(new URL('../src/3d/UnitView.jsx', import.meta.url), 'utf8');

/** A file with its PROSE taken out — the house quotes what it deletes, so a
 *  grep for a dead line finds the quotation unless the comments come out. */
const code = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/^\s*\*.*$/gm, '');

const LIVE = code(UNIT_VIEW);

/** The material law, read out of the file as numbers rather than as a string. */
const paneLaw = () => {
  const block = LIVE.slice(LIVE.indexOf('const PANE_ALPHA_GLASS = {'));
  const body = block.slice(0, block.indexOf('};'));
  const read = (k) => (body.match(new RegExp(`${k}:\\s*([^,\\n]+)`)) || [])[1]?.trim();
  return {
    color: (read('color') || '').replace(/['"]/g, ''),
    transparent: read('transparent'),
    opacity: Number(read('opacity')),
    roughness: Number(read('roughness')),
    metalness: Number(read('metalness')),
    depthWrite: read('depthWrite'),
    side: read('side'),
  };
};

// ═══ 1. THE PHYSICAL-GLASS PATH IS GONE (licensed deletion 1) ══════════════

test('F1 · no pane in this file is on the transmission path any more', () => {
  assert.ok(!/transmission=/.test(LIVE),
    'transmission renders the backdrop into its own buffer; behind a closed '
    + 'drawer that buffer is black, and the pane comes back a slab');
  assert.ok(!/thickness=\{0\.004\}/.test(LIVE), 'and its companion goes with it');
  // …and the dead property IS quoted in the prose, by the house rule: a
  // deletion nobody can read about is one the next turn re-introduces.
  assert.match(UNIT_VIEW, /NO `transmission`, NO `thickness`/,
    'the fault is written down where the next reader will find it');
});

test('F1 · the old cold blue-grey pane tint is out of the live code', () => {
  assert.ok(!/#eef3f4/.test(LIVE), '"a nie szara" — the grey is not in the code any more');
});

// ═══ 2. THE EXACT MATERIAL ═════════════════════════════════════════════════

test('F1 · plain alpha-blended glass, on the numbers the spec names', () => {
  const m = paneLaw();
  assert.equal(m.transparent, 'true', 'plain alpha blending, which cannot silently fail');
  assert.ok(m.opacity >= 0.2 && m.opacity <= 0.35,
    `opacity ${m.opacity} is glass: dark enough to read, light enough to see through`);
  assert.equal(m.depthWrite, 'false',
    'a transparent surface that writes depth rejects everything drawn behind it — '
    + 'which is exactly how a pane turns back into a board');
  assert.equal(m.metalness, 0, 'glass is not a metal');
  assert.ok(m.roughness > 0 && m.roughness < 0.3, `roughness ${m.roughness} is polished, not frosted`);
  assert.equal(m.side, 'THREE.FrontSide', 'the far faces of the pane\'s own box would darken it twice');
});

test('F1 · the tint is SMOKY BROWN and never grey — checkable, not a matter of eye', () => {
  const { color } = paneLaw();
  assert.match(color, /^#[0-9a-f]{6}$/i, `${color} is a hex colour`);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  assert.ok(r > g && g > b, `${color} is warm: r ${r} > g ${g} > b ${b}`);
});

test('F1 · the material is meshStandard, and it is REMOUNTED by identity', () => {
  // This file's own Turn-11 note: three caches a compiled program per material,
  // and `transparent` is part of what that program is built for. A NEW material
  // identity is the way to ask for a new program — which is what the key is.
  const uses = LIVE.match(/<meshStandardMaterial key="pane-alpha" \{\.\.\.PANE_ALPHA_GLASS \} ?\/>/g)
    || LIVE.match(/<meshStandardMaterial key="pane-alpha" \{\.\.\.PANE_ALPHA_GLASS\} \/>/g);
  assert.ok(uses && uses.length >= 2,
    'every pane that wore the physical material now wears this one');
});

// ═══ 3. IT DRAWS AFTER THE INTERIOR IT EXISTS TO SHOW ══════════════════════

test('F1 · renderOrder 20 — the pane is laid over the opaque interior', () => {
  assert.match(LIVE, /const PANE_RENDER_ORDER = 20;/);
  const orders = LIVE.match(/renderOrder=\{PANE_RENDER_ORDER\}/g) || [];
  assert.ok(orders.length >= 3,
    'the glazed door, the display drawer and the watch pane keep one order between them');
});

// ═══ 4. ONE PATH PER JOB ═══════════════════════════════════════════════════

test('F1 · one law, not a copy per pane', () => {
  const decls = LIVE.match(/const PANE_ALPHA_GLASS = \{/g) || [];
  assert.equal(decls.length, 1, 'the numbers are written once');
  // The display drawer's pane has always said it is "drawn with the glass
  // door's material" — after this turn that sentence is true again.
  assert.match(UNIT_VIEW, /drawn with the glass door's material/);
});

test('F1 · the watch pane keeps T58-F7\'s own record, and is off the path too', () => {
  // It was never the pane in the licence — T58 took it off transmission — but
  // a frame shot through a glazed door needs BOTH to be glass, so it is
  // asserted here rather than assumed.
  assert.match(UNIT_VIEW, /const WATCH_GLASS_HEX = '#6b4f3a';/);
  const pane = LIVE.slice(LIVE.indexOf('ccWatchGlass'), LIVE.indexOf('ccWatchGlass') + 900);
  assert.ok(!/transmission=/.test(pane));
  assert.match(pane, /depthWrite=\{false\}/);
});

// ═══ 5. …AND THE OTHER HALF OF "NIC NIE WIDAĆ": THE LID ════════════════════
//
// The material was never the whole fault, and this is the half no frame of
// T57 or T58 could have fixed.
//
// The shelf the pane sits in carries TWO features over one rectangle: a
// through OPENING, and a REBATE one glass thickness deep, stated as a
// rectangle four millimetres larger — the ledge the pane drops onto. The
// SOLID handled both. But the rebate is BLIND, and `buildCuts` drew a blind
// recess's floor as a fan across its whole outline — the opening included. A
// raw-board lid, laid across the hole the glass was cut for.
//
// This is asserted with a RAY, not with an eye: the opening is centred on its
// shelf, so a ray dropped down the board's own axis through its centre must
// come out the other side having hit nothing at all.

import * as THREE from 'three';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { panelSolids } from '../src/3d/panelSolid.js';
import { watchDrawerFixedHeight } from '../src/engine/watchDrawer.js';

/** A wardrobe whose top drawer carries the watch insert and its pane — the
 *  T55-F4 fixture, which is the one the engine's own tests are written on. */
const paneShelf = () => {
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    width: 900,
    sections: [{
      width_mm: 900,
      items: [
        { id: 'd1', kind: 'drawer', index: 1, height_mm: 200 },
        {
          id: 'd2',
          kind: 'drawer',
          index: 2,
          height_mm: watchDrawerFixedHeight(P),
          watch_insert: true,
          watch_shelf_glass: true,
        },
      ],
    }],
  }, P);
  const pane = (r.assemblies.watchGlass || [])[0];
  assert.ok(pane, 'the fixture really does cut a pane into a shelf');
  const shelf = r.panels.find((p) => p.id === pane.shelfId);
  assert.ok(shelf, 'and the shelf it is cut in is a real board');
  return { r, pane, shelf };
};

/** What a ray straight down the board's thickness through its CENTRE hits. */
const hitsThroughCentre = (built) => {
  const meshes = [built.solid, built.cuts].filter(Boolean).map((g) => new THREE.Mesh(
    g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  ));
  meshes.forEach((m) => m.updateMatrixWorld(true));
  const ray = new THREE.Raycaster(
    new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0), 0, 4,
  );
  return ray.intersectObjects(meshes, false).length;
};

test('F1 · the rebate no longer roofs the opening — a ray goes clean through', () => {
  const { shelf } = paneShelf();
  const built = panelSolids(shelf, P.puzzle.layers, P, []);
  assert.ok(built.solid, 'the shelf is a machined board, not a plain box');
  assert.equal(hitsThroughCentre(built), 0,
    'the opening is centred on its shelf, so a ray down the middle must meet '
    + 'no board and no cut face — a hole you cannot see through is a lid');
});

test('F1 · …and the LEDGE the pane sits on is still cut', () => {
  // The fix removes a floor that was never there in the board; it must not
  // remove the rebate itself. Same shelf with the rebate pocket taken out is
  // the control: the real one carries strictly more cut-face geometry.
  const { shelf } = paneShelf();
  const bare = {
    ...shelf,
    cnc: { ...shelf.cnc, pockets: (shelf.cnc.pockets || []).filter((k) => k.layer !== 'WATCH_GLASS_REBATE') },
  };
  const withRebate = panelSolids(shelf, P.puzzle.layers, P, []);
  const without = panelSolids(bare, P.puzzle.layers, P, []);
  const tris = (b) => (b.cuts ? b.cuts.attributes.position.count / 3 : 0);
  assert.ok(tris(withRebate) > tris(without),
    `the rebate still cuts: ${tris(withRebate)} triangles against ${tris(without)}`);
  // And the control proves the ray test above is about the LID and not about
  // some other absence: with no rebate at all the ray was always clear.
  assert.equal(hitsThroughCentre(without), 0);
});
