// ─── TURN 70 · F1 — THE SHOE BOX IS ONE MOVING THING ───────────────────────
//
// The owner, 13.09.2026, verbatim and whole:
//
//   *"szuflada na buty super, że traktujesz jak normalną szufladę, ale nie
//   może mieć półki nad sobą, i skos ma się otwierać razem z boxem, a nie box
//   się otwiera a reszta zostaje."*
//
// TWO FACTS, and T58 got one of them half-right and the other not at all.
//
//   1. NO SHELF ABOVE. T58 wrote the sentence as a REFUSAL — a shoe drawer
//      standing under a board was refused its INSERT, in words, and the board
//      was cut anyway. The client did not ask for the ramp to be refused; he
//      asked for the BOARD NOT TO BE CUT. Three sites in `cabinet.js` cap a
//      stack; all three now ask one predicate.
//
//   2. THE SLOPE TRAVELS WITH THE BOX. `engine/drawerMotion.js drawerOf` named
//      two roles — `drawer_box` and `watch_insert` — and T58 gave the shoe
//      insert a third, `shoe_insert`, that nobody added here. So the box came
//      out and the ramp stayed in the carcass. One assembly, one runner pair.
//
// LISP IS LAW: `reference/lisp/KIT_WARDROBE_FULL.lsp` section G states both
// before the engine does, and the last block of this file holds the kit and
// the engine to the same words.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet, shoeCapsTheStack } from '../src/engine/cabinet.js';
import { drawerOf, drawerMotion } from '../src/engine/drawerMotion.js';
import { defaultParamsFor } from '../src/engine/types.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const DR = P.wardrobe.drawers;
const SHOE_FRONT = DR.shoeSideMm + DR.frontToSideDelta;

const wardrobeWith = (items, over = {}) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P),
  unit_num: 'W01',
  sections: [{ items }],
  ...over,
}, P);

const plainStack = (n = 2) => wardrobeWith(
  Array.from({ length: n }, (_, i) => ({ id: `d${i + 1}`, kind: 'drawer', index: i + 1, height_mm: 200 })),
);

const shoeOnTop = (below = 1) => wardrobeWith([
  ...Array.from({ length: below }, (_, i) => ({ id: `d${i + 1}`, kind: 'drawer', index: i + 1, height_mm: 200 })),
  { id: 'shoe', kind: 'drawer', index: below + 1, height_mm: SHOE_FRONT, variant: 'shoe' },
]);

// ═══ 1 · THE PREDICATE — ONE LAW, ASKED ONE WAY ════════════════════════════

test('F1 · the law is a predicate on the TOP of a stack, and nothing else', () => {
  const plain = { id: 'a', variant: null };
  const shoe = { id: 'b', variant: 'shoe' };
  assert.equal(shoeCapsTheStack([plain, plain]), false, 'a plain stack is capped');
  assert.equal(shoeCapsTheStack([plain, shoe]), true, 'the shoe on top uncaps it');
  assert.equal(shoeCapsTheStack([shoe, plain]), false,
    'a shoe UNDER another drawer is not the top — T58\'s own "tylko na wierzchu"');
  assert.equal(shoeCapsTheStack([shoe]), true, 'a stack of one shoe drawer is a shoe-topped stack');
  assert.equal(shoeCapsTheStack([]), false, 'no stack, no cap to withhold');
  assert.equal(shoeCapsTheStack(), false, 'and nothing at all is not a shoe');
  assert.equal(shoeCapsTheStack([{ variant: 'SHOE' }]), true, 'the variant is asked case-blind');
});

// ═══ 2 · NO BOARD IS CUT OVER A SHOE BOX ═══════════════════════════════════

test('F1 · a plain stack keeps its capping PARTITION — nothing else moved', () => {
  const r = plainStack(2);
  const cap = r.panels.filter((p) => p.part === 'PARTITION');
  assert.equal(cap.length, 1, 'SPEC 4.7 still closes an ordinary stack');
  assert.equal(cap[0].meta.locked, true, 'and it still belongs to the stack');
});

test('F1 · …and a shoe-topped stack is NOT capped', () => {
  const r = shoeOnTop(2);
  assert.equal(r.panels.filter((p) => p.part === 'PARTITION').length, 0,
    'the owner\'s law: a shoe drawer carries nothing above it');
  // The boxes are still cut — the drawer is untouched, only what stands over it.
  assert.ok(r.panels.some((p) => p.part === 'DRAWER-SIDE' && p.meta?.drawer === 3),
    'the shoe drawer itself is still a drawer');
  assert.ok(r.panels.some((p) => p.part === 'DP'), 'the drawer MECHANISM\'s own panels stay');
});

test('F1 · the confirmats go with the board — no hole for a board nobody cut', () => {
  const plain = plainStack(2);
  const shoe = shoeOnTop(2);
  assert.ok((plain.drills || []).some((d) => d.kind === 'partition_screw'),
    'a capped stack is screwed to its sides');
  assert.equal((shoe.drills || []).filter((d) => d.kind === 'partition_screw').length, 0,
    'a confirmat is a hole for a board');
  // The DP fixings are the mechanism's and are NOT part of the cap.
  assert.equal(
    (plain.drills || []).filter((d) => d.kind === 'dp_screw').length,
    (shoe.drills || []).filter((d) => d.kind === 'dp_screw').length,
    'the drawer panel is fixed the same way either side of this law',
  );
});

test('F1 · the engine SAYS it — a stack left open names the drawer that opened it', () => {
  const r = shoeOnTop(2);
  const said = r.warnings.find((w) => w.code === 'SHOE_STACK_UNCAPPED');
  assert.ok(said, 'the cut list gained a board-shaped hole and said nothing');
  assert.equal(said.drawer, 3, 'and it names which drawer did it');
  assert.match(said.message, /shoe drawer carries nothing above it/);
});

test('F1 · the COLUMN twin — the same law, the same predicate, a bay at a time', () => {
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    width: 1200,
    sections: [{
      width_mm: 1200,
      items: [
        { id: 'p1', kind: 'partition', x_mm: 600, front_mm: 0 },
        { id: 's1', kind: 'drawer', index: 1, zone: 0, height_mm: SHOE_FRONT, variant: 'shoe' },
        { id: 'd1', kind: 'drawer', index: 1, zone: 1, height_mm: 200 },
      ],
    }],
  }, P);
  const caps = r.panels.filter((p) => p.part === 'PARTITION');
  assert.ok(caps.every((p) => p.meta?.zone !== 0), 'column 1 holds the shoe drawer and is not capped');
  assert.ok(caps.some((p) => p.meta?.zone === 1), 'column 2 is an ordinary stack and still is');
  // …and column 1 still gets its own drawer, its DP and its fillers.
  assert.ok(r.panels.some((p) => p.id === 'Z1D1-SL'), 'the bay still cut its drawer');
  assert.ok(r.panels.some((p) => /^Z1-DP-/.test(p.id)), 'the column\'s mechanism panel stays');
});

test('F1 · the ramp is cut now, because nothing is standing on its headroom', () => {
  const r = shoeOnTop(1);
  const ramp = r.panels.find((p) => p.part === 'SHOE-RAMP');
  assert.ok(ramp, 'the insert the owner asked for is cut');
  assert.equal(ramp.meta.clamped, false,
    'with no board over it the ramp runs its full depth — which is what removing the board was FOR');
  assert.equal(r.warnings.filter((w) => w.code === 'shoe_ramp_clamped').length, 0);
  assert.equal(r.panels.filter((p) => p.part === 'SHOE-DIVIDER').length, 2, 'and its two lanes');
});

// ═══ 3 · THE SLOPE TRAVELS WITH THE BOX ════════════════════════════════════

test('F1 · every board of the assembly answers to ONE drawer index', () => {
  const r = shoeOnTop(1);
  const mine = r.panels.filter((p) => Number(p.meta?.drawer) === 2);
  const ramp = mine.find((p) => p.part === 'SHOE-RAMP');
  const divs = mine.filter((p) => p.part === 'SHOE-DIVIDER');
  const side = mine.find((p) => p.part === 'DRAWER-SIDE');
  const face = mine.find((p) => p.part === 'DRAWER-FRONT');
  assert.ok(ramp && divs.length === 2 && side && face, 'the assembly is all there');
  for (const p of [ramp, ...divs, side, face]) {
    assert.equal(drawerOf(p), 2, `${p.id} does not travel with its drawer`);
  }
});

test('F1 · pull the front and the SKOS comes with it — the same amount, the same travel', () => {
  const r = shoeOnTop(1);
  const face = r.panels.find((p) => p.part === 'DRAWER-FRONT' && p.meta?.drawer === 2);
  const motion = drawerMotion(r.panels, { [face.id]: 1 });
  const ride = (part) => motion.forPanel(r.panels.find((p) => p.part === part && p.meta?.drawer === 2));
  const box = ride('DRAWER-SIDE');
  assert.ok(box.travel > 0, 'the box travels its own nominal length');
  for (const part of ['SHOE-RAMP', 'SHOE-DIVIDER']) {
    const q = ride(part);
    assert.ok(q, `${part} is not part of the moving assembly — "a reszta zostaje"`);
    assert.equal(q.open, box.open, `${part} opens by a different amount than the box`);
    assert.equal(q.travel, box.travel, `${part} travels a different distance than the box`);
  }
});

test('F1 · ONE set of runners — the assembly buys no second pair', () => {
  const plain = wardrobeWith([{ id: 'd1', kind: 'drawer', index: 1, height_mm: SHOE_FRONT }]);
  const shoe = wardrobeWith([{ id: 'd1', kind: 'drawer', index: 1, height_mm: SHOE_FRONT, variant: 'shoe' }]);
  const runners = (r) => (r.hardware || []).filter((h) => /runner/i.test(`${h.role} ${h.label}`));
  assert.ok(runners(plain).length >= 1, 'a drawer buys a runner pair');
  assert.equal(
    runners(shoe).reduce((n, h) => n + (Number(h.qty) || 1), 0),
    runners(plain).reduce((n, h) => n + (Number(h.qty) || 1), 0),
    'the slope is carried by the box\'s own runners, never a bearer of its own',
  );
});

test('F1 · the watch tray and the box are untouched by tonight\'s line', () => {
  assert.equal(drawerOf({ role: 'watch_insert', meta: { drawer: 1 } }), 1, 'T52\'s tray still rides');
  assert.equal(drawerOf({ role: 'drawer_box', meta: { drawer: 1 } }), 1, 'the box still rides');
  assert.equal(drawerOf({ role: 'shelf', meta: { drawer: 1 } }), null, 'a shelf never did and still does not');
  assert.equal(drawerOf({ role: 'shoe_insert', meta: {} }), null, 'and a part with no drawer is nobody\'s');
});

// ═══ 4 · LISP IS LAW — THE KIT SAID IT FIRST ═══════════════════════════════

test('F1 · the kit states both facts, and the engine reads the kit\'s own words', () => {
  const kit = read('reference/lisp/KIT_WARDROBE_FULL.lsp');
  assert.match(kit, /G\. THE SHOE BOX IS ONE MOVING THING \(turn 70, CLAUDE\.md F1\)/,
    'the kit has no T70 section — LISP IS LAW means the kit is first');
  assert.match(kit, /\(defun SKY:shoeCapsTheStack/, 'the no-shelf law is not stated in the kit');
  assert.match(kit, /\(defun SKY:shoeAssembly/, 'the moving assembly is not named in the kit');
  assert.match(kit, /\(defun SKY:shoeRunnerPairs \( \/ \) 1\)/, 'the kit does not say ONE runner pair');
  // The owner's sentence, in the kit and in both engine files that act on it.
  assert.match(kit, /skos ma sie otwierac razem z boxem/, 'the kit does not carry his sentence');
  assert.match(read('src/engine/cabinet.js'), /nie może mieć półki nad sobą/);
  assert.match(read('src/engine/drawerMotion.js'), /skos ma się otwierać razem z boxem/);
});

test('F1 · the kit\'s assembly and the engine\'s moving parts are the same list', () => {
  const kit = read('reference/lisp/KIT_WARDROBE_FULL.lsp');
  const block = kit.slice(kit.indexOf('(defun SKY:shoeAssembly'));
  const named = [...block.slice(0, block.indexOf(')\n)')).matchAll(/"([A-Z-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(named, [
    'DRAWER-FRONT', 'DRAWER-SIDE', 'DRAWER-BOX-FRONT', 'DRAWER-BOX-BACK',
    'DRAWER-BOTTOM', 'SHOE-RAMP', 'SHOE-DIVIDER',
  ], 'the kit\'s assembly list drifted');
  // Every one of them, on a real shoe drawer, travels.
  const r = shoeOnTop(1);
  for (const part of named) {
    const p = r.panels.find((q) => q.part === part && q.meta?.drawer === 2);
    assert.ok(p, `the engine cuts no ${part} for a shoe drawer`);
    assert.equal(drawerOf(p), 2, `${part} is in the kit's assembly and does not move in the app`);
  }
});
