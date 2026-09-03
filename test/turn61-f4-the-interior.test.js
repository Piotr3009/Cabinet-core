// ─── TURN 61 · F4 — INTERIOR, THE FULL ROW SET ─────────────────────────────
//
// The owner: *"dowozimy dla klientow musi bcy wszystko"*.
//
// ─── THE TEST CLAUDE.md ASKS FOR, AND WHY IT IS SHAPED LIKE THIS ───────────
//
//   *"INTERIOR row parity against PRO — a test that READS both lists and diffs
//   them, so drift becomes impossible."*
//
// So the list on PRO's side is not typed here. It is PARSED out of
// `src/components/AddItems.jsx` — the `kinds` array, filtered by the same
// `k.families` rule the component renders through — and diffed against
// `adapter.INTERIOR_ROWS`. The day somebody adds an eleventh row to PRO, this
// file fails and the retail list is one edit behind rather than a year behind.
//
// ─── AND NOT FROM `profile.itemsByContext` ─────────────────────────────────
//
// That list looks like the answer and is not. The filter that consumed it has
// been COMMENTED OUT since the 19.08 chat-fix (*"the list must be ALWAYS fully
// expanded"*), so `offered` is computed and never read — and it disagrees with
// what PRO draws: it names neither `shoe_box` (which left it at T54-F7) nor
// `watch_drawer`, and PRO renders both. A parity test that read the profile
// would build the WRONG list and pass.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { isCopy } from '../scripts/t63-copies.mjs';
import { join } from 'node:path';

import * as A from '../src/retail/design/adapter.js';
import { REASONS } from '../src/retail/design/reasons.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { getUnitType } from '../src/engine/types.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const S = () => useProjectStore.getState();

const fresh = (width = 1200) => {
  A.startDesign('Bedroom wardrobe');
  A.setSpace({ wallMm: 3000, ceilingMm: 2600 });
  const id = A.designUnit(S().units).id;
  A.setUnitSize(id, { width });
  return id;
};
const unit = (id) => S().units.find((u) => u.id === id);

/**
 * PRO's own row list for a WARDROBE, read out of its source.
 *
 * `AddItems.jsx` builds `kinds` as an array of object literals and then draws
 * `kinds.filter((k) => !k.families || k.families.includes(type.family))`. This
 * is that, in a parser: every `id:` in the array, minus the ones whose entry
 * carries a `families:` line that does not name the wardrobe.
 */
function proRows() {
  const text = read('src/components/AddItems.jsx');
  const from = text.indexOf('const kinds = [');
  const to = text.indexOf('\n  ];', from);
  assert.ok(from > 0 && to > from, 'AddItems.jsx no longer builds a `kinds` array — reread it');
  const body = text.slice(from, to);
  // An entry's `id:` is either the first thing after its opening brace (the
  // one-liners) or the first line inside it (the ones carrying a paragraph of
  // argument). The ENTRY is then everything up to the next `id:` rather than a
  // matched brace, so a `families:` inside that span belongs to it.
  const at = [...body.matchAll(/(?:^ {6}|\{ )id: '([^']+)',/gm)];
  assert.ok(at.length >= 12, `only ${at.length} entries parsed — the parser is broken`);
  return at
    .map((m, i) => ({
      id: m[1],
      span: body.slice(m.index, i + 1 < at.length ? at[i + 1].index : body.length),
    }))
    .filter((e) => {
      const families = (e.span.match(/families: \[([^\]]*)\]/) || [])[1];
      return !families || families.includes("'wardrobe'");
    })
    .map((e) => e.id);
}

test('F4 · the parser is not a tautology — it finds what PRO actually hides', () => {
  // A parity test whose parser matches everything would pass on any list. The
  // two kitchen-only entries are the proof that the `families` filter is really
  // being applied: they are in the array and NOT in the answer.
  const text = read('src/components/AddItems.jsx');
  assert.match(text, /id: 'cargo',[\s\S]{0,120}families: \['kitchen'\]/);
  assert.match(text, /id: 'bins',[\s\S]{0,120}families: \['kitchen'\]/);
  const rows = proRows();
  assert.ok(!rows.includes('cargo'), 'the parser kept a kitchen-only row');
  assert.ok(!rows.includes('bins'), 'the parser kept a kitchen-only row');
  // …and the WARDROBE really is the family those predicates are evaluated for.
  assert.equal(getUnitType('WARDROBE').family, 'wardrobe');
});

test('F4 · retail\'s rows are PRO\'s rows — same set, same order', () => {
  assert.deepEqual(A.INTERIOR_ROWS.map((r) => r.pro), proRows(),
    'the INTERIOR list and PRO\'s Add-items list have drifted');
  assert.equal(A.INTERIOR_ROWS.length, 10, 'ten rows for a wardrobe');
  // Every id is unique, and every row opens a menu that exists — T60's law,
  // which is what made four new menus part of this feature rather than an extra.
  const ids = A.INTERIOR_ROWS.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const row of A.INTERIOR_ROWS) {
    assert.ok(A.MENUS.includes(row.menu), `${row.id} opens a menu that does not exist`);
  }
});

test('F4 · every row adds something, and the count moves', () => {
  const id = fresh();
  const store = S();
  for (const row of A.INTERIOR_ROWS) {
    const refused = A.interiorRefusals(id, unit(id))[row.id];
    if (refused) continue;                      // greyed rows have their own test
    const before = A.interiorCounts(unit(id))[row.id] || 0;
    row.add(store, id);
    const after = A.interiorCounts(unit(id))[row.id] || 0;
    assert.ok(after > before, `${row.id}: ADD changed nothing`);
  }
});

test('F4 · a greyed row carries the predicate\'s own sentence, not a retail one', () => {
  const id = fresh(900);

  // THE WATCH DRAWER — PRO's own precondition, which retail did not have: it
  // goes on top of a stack, so there has to be a stack. The words are the
  // STORE's, verbatim from `addWatchDrawer`'s refusal.
  const noStack = A.interiorRefusals(id, unit(id)).watch;
  assert.match(noStack, /^Add the drawers first/);
  const pressed = S().addWatchDrawer(id);
  assert.equal(pressed.ok, false);
  assert.equal(pressed.error, noStack, 'the greyed row and the press disagree');

  // …and it clears the moment the stack exists.
  S().addDrawers(id, 3);
  assert.equal(A.interiorRefusals(id, unit(id)).watch, '');

  // THE HANGING RAIL — one per column, the store's own refusal (`addHangerRail`
  // answers null); the words are `reasons.js`'s against that predicate.
  S().addHangerRail(id, {});
  assert.equal(A.interiorRefusals(id, unit(id)).hanger, REASONS.railAlreadyThere);
  assert.equal(S().addHangerRail(id, {}), null, 'the store did not refuse the second rail');

  // A BOUGHT MECHANISM — one of each kind per opening.
  S().addWardrobeKit(id, 'trouser');
  assert.equal(A.interiorRefusals(id, unit(id)).trouser,
    REASONS.kitAlreadyThere('trouser pull-out'));
  assert.equal(S().addWardrobeKit(id, 'trouser'), null);
});

test('F4 · ONE path adds a divider — the chips and the row cannot disagree', () => {
  const id = fresh(1800);
  const parts = () => (unit(id).params.sections[0].items || []).filter((i) => i.kind === 'partition');

  // The INTERIOR row.
  A.INTERIOR_ROWS.find((r) => r.id === 'partition').add(S(), id);
  assert.equal(parts().length, 1);
  // FLUSH — which is what makes it visible to the door law, and therefore what
  // makes the BAYS chip agree that there are two bays.
  assert.equal(Number(parts()[0].front_mm), 0, 'the row made a divider the door law cannot see');
  assert.equal(A.bayCount(id), 2, 'the BAYS chip disagrees with the INTERIOR row');

  // The BAYS chips, on the same wardrobe, reaching the same function.
  A.setBayCount(id, 3);
  assert.equal(parts().length, 2);
  for (const p of parts()) assert.equal(Number(p.front_mm), 0);
  assert.equal(A.interiorCounts(unit(id)).partition, 2,
    'the INTERIOR count disagrees with the BAYS chips');

  // …and it is literally one function, not two that agree today.
  const adapter = read('src/retail/design/adapter.js');
  assert.match(adapter, /export function addFlushPartition\(unitId\)/);
  const bare = [...adapter.matchAll(/S\(\)\.addPartition\(/g)];
  assert.equal(bare.length, 1, 'more than one place in retail calls addPartition');
});

test('F4 · an overlay stack opens its OWN menu — the drawerRef fault, closed', () => {
  const id = fresh();
  S().addOverlayDrawers(id, 3, 200);
  assert.equal(A.overlayStack(id).count, 3);
  // `drawerStack` filters `kind === 'drawer'` and an overlay drawer's kind is
  // `overlay_drawer` — the exact fault `engine/drawerRef.js` documents. Which is
  // why the internal DRAWERS menu could not have edited this stack.
  assert.equal(A.drawerStack(id).drawers.length, 0);

  const front = S().unitResult(id).panels
    .find((p) => p.part === 'DRAWER-FRONT' && p.meta?.itemId);
  assert.ok(front, 'the overlay stack cut no fronts');
  const sel = A.resolveSelection({ unitId: id, elementRef: front.id });
  assert.equal(sel.menu, 'overlay', 'an overlay front opens the internal drawers menu');
  assert.equal(sel.item.kind, 'overlay_drawer');
  assert.ok(sel.item, 'the menu would open on nothing');
});

test('F4 · the three bought mechanisms resolve, not just the pull-down', () => {
  const id = fresh();
  for (const kind of ['pulldown_rail', 'trouser', 'tie_rack']) {
    S().addWardrobeKit(id, kind);
    const item = A.kitItem(id, kind);
    assert.ok(item, `${kind} was not added`);
    const sel = A.resolveSelection({ unitId: id, elementRef: item.id });
    assert.ok(sel, `${kind} resolves to nothing — it would have no menu`);
    assert.equal(sel.menu, A.KIT_MENUS[kind]);
    // …and the INTERIOR list's `›` reaches the SAME selection a click does.
    const fromList = A.selectionForMenu(A.KIT_MENUS[kind], id);
    assert.equal(fromList.menu, sel.menu);
    assert.equal(fromList.ref, item.id);
  }
});

test('F4 · every new row has a menu FILE, and none of them reaches past the adapter', () => {
  const router = read('src/retail/design/detail/index.jsx');
  for (const name of ['OverlayMenu', 'PartitionMenu', 'TrouserMenu', 'TieRackMenu']) {
    assert.match(router, new RegExp(`import ${name} from './${name}.jsx'`));
  }
  // The iron boundary holds for the new files too: a menu asks the adapter.
  for (const file of readdirSync(join(ROOT, 'src/retail/design/detail'))) {
    if (!/\.jsx$/.test(file)) continue;
    // T63: a COPY of a PRO window speaks the engine because PRO's file does —
    // per file, per original, `scripts/t63-copies.mjs`. `Entries.jsx` is
    // retail's own and still answers here.
    if (isCopy(`src/retail/design/detail/${file}`)) continue;
    const text = read(`src/retail/design/detail/${file}`);
    for (const m of text.matchAll(/from '\.\.[^']*\/(engine|3d|stores|components|lib)\/[^']*'/g)) {
      assert.fail(`${file} reaches ${m[0]}`);
    }
  }
});

test('F4 · ONE law answers "what may be added here"', () => {
  // The plus markers and the INTERIOR rows must not be two tracks. The INNER
  // plus does not answer the question at all — it OPENS the list that does,
  // which is how there is one answer rather than two that agree.
  const room = read('src/retail/design/DesignRoom.jsx');
  assert.match(room, /onAddInside=\{\(unitId\) => \{[\s\S]{0,400}setActive\('interior'\)/,
    'the inner plus does not send the client to the INTERIOR list');
  assert.ok(!/INTERIOR_ROWS/.test(room),
    'DesignRoom holds a second copy of what may be added');
  // …and the run-end plus asks about UNITS, not about what goes inside one.
  assert.match(room, /A\.addBesidePlus\(point\)/);
});
