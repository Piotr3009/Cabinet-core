// ─── TURN 70 · F2 + F3 — THE LEFT STOPS SPECIFYING, THE DOCK STARTS ────────
//
// The owner, 13.09.2026, circling INSIDE's drawer row:
//
//   *"jak dodajemy internal drawers, to te informacje — tie, belt, with
//   fronts, bare boxes — wywal proszę."*
//
// …and, of the docked editor:
//
//   *"dodaj do menu po prawej spec — zmianę frontu, jak by ktoś chciał; i jak
//   już dajesz wysokość frontu, to daj gdzieś informację, ile będzie miała
//   szuflada w środku boxa."*
//
// ONE SENTENCE: **LEFT ADDS, RIGHT EDITS.** The row keeps COUNT · HEIGHT ·
// ADD; the six chips and the paragraph under them move to the dock, and no
// control is lost.
//
// ─── WHY THE LEFT HALF IS A STYLESHEET ─────────────────────────────────────
//
// `detail/AddItems.jsx` is a COPY. `turn63-the-copies.test.js` holds it to
// PRO's own line count, PRO's element count and every label PRO shows, and the
// standing law is *"kopiuj — nie kasuj"*. A guard written into the copy fails
// all three; a deletion breaks the law. So the chips are HIDDEN, not cut,
// under the one flag the workshop fields, the context menu and the hinge rows
// are already hidden by — and the scope is tighter than either of those, which
// is the argument `turn66-f3` now holds this rule to.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { rectCorners } from '../src/engine/room.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { drawerBoxInterior } from '../src/engine/watchDrawer.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';
import { REASONS } from '../src/retail/design/reasons.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const S = () => useProjectStore.getState();
const DR = P.wardrobe.drawers;

function wardrobe() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 900, height: 2200, depth: 600 } });
  return id;
}

const stackOf = (id) => A.drawerStack(id).drawers;

// ═══ 1 · F2 — THE ROW KEEPS COUNT · HEIGHT · ADD, AND LOSES THE REST ═══════

test('F2 · the copy is untouched — every chip is still in the file, byte for byte', () => {
  const copy = read('src/retail/design/detail/AddItems.jsx');
  const pro = read('src/components/AddItems.jsx');
  for (const label of ['With fronts', 'Bare boxes', 'Inset', 'Standard', 'Belt/tie', 'Belt/tie + glass']) {
    assert.ok(copy.includes(label), `the copy lost ${label} — that is a deletion, not a move`);
    assert.ok(pro.includes(label), `PRO lost ${label} — PRO is frozen tonight`);
  }
  assert.equal(copy.split('\n').length, pro.split('\n').length, 'the copy drifted from PRO\'s line count');
  assert.match(copy, /Stacked from the bottom, \{DR\.minFrontHeight\}/, 'the paragraph was cut out of the copy');
});

test('F2 · the six chips and the paragraph are hidden IN THE COLUMN, by the room\'s own sheet', () => {
  const css = read('src/retail/styles/room.css');
  const scope = '\\.pbi-room\\[data-workshop-tools="no"\\] \\[data-testid="interior-pro-list"\\]';
  for (const hook of ['\\[data-drawer-mount\\]', '\\[data-drawer-variant\\]']) {
    assert.match(css, new RegExp(`${scope} div:has\\(> ${hook}\\)`),
      `${hook} is still specifying in the left column`);
  }
  assert.match(css, new RegExp(`${scope} div:has\\(> \\[data-add-kind="drawers"\\]\\) > div > p`),
    'the paragraph under the chips is still in the column');
  // …and the declaration really takes them out of the tab ring, not just the eye.
  assert.match(css, new RegExp(`${scope}[\\s\\S]{0,400}?display: none !important;`));
});

test('F2 · COUNT · HEIGHT · ADD are NOT hidden — the row still adds', () => {
  const css = read('src/retail/styles/room.css');
  const f2 = css.slice(css.indexOf('T70 F2 · THE LEFT COLUMN STOPS SPECIFYING'));
  const rule = f2.slice(f2.indexOf('*/') + 2).split('}')[0];
  for (const kept of ['data-add-overlay-drawers', 'pbi-re-bottom', 'pbi-re-w16', 'pbi-re-w20']) {
    assert.ok(!rule.includes(kept), `the F2 rule reaches ${kept} — that is the ADD row`);
  }
  // The copy still draws them, and the left column still renders the copy.
  assert.match(uncomment(read('src/retail/design/Options.jsx')), /<AddItems unit=\{unit\} \/>/);
  assert.match(read('src/retail/design/detail/AddItems.jsx'), /onAddDrawers\(drawerCount, drawerHeight\)/);
});

test('F2 · the same list inside the copied MODAL keeps every chip — it left the COLUMN', () => {
  const css = read('src/retail/styles/room.css');
  const f2 = css.slice(css.indexOf('T70 F2 · THE LEFT COLUMN STOPS SPECIFYING'));
  const body = f2.slice(f2.indexOf('*/') + 2);
  const selectors = body.slice(0, body.indexOf('{')).split(',').map((q) => q.trim()).filter(Boolean);
  for (const sel of selectors) {
    assert.ok(sel.includes('[data-testid="interior-pro-list"]'),
      `an F2 selector that is not scoped to the column: ${sel}`);
  }
  assert.match(read('src/retail/design/detail/AddItemsModal.jsx'), /<AddItems unit=\{unit\}/);
});

// ═══ 2 · F3 — AND EVERY ONE OF THEM HAS A NEW HOME ════════════════════════

test('F3 · WITH FRONTS · BARE BOXES · INSET stand in the dock, on the stack', () => {
  const dock = read('src/retail/design/detail/ReHomed.jsx');
  assert.match(dock, /testid="drawers-mount"/, 'the mount chips have no home');
  assert.match(dock, /id: 'overlay', label: 'WITH FRONTS'/);
  assert.match(dock, /id: 'internal', label: 'BARE BOXES'/);
  assert.match(dock, /id: 'inset', label: 'INSET', reason: REASONS\.insetStillToCome/,
    'INSET lost the reason it was greyed with');
  assert.match(dock, /testid="drawers-variant"/, 'the variant chips have no home');
  for (const label of ['STANDARD', 'BELT/TIE', 'BELT/TIE \\+ GLASS']) {
    assert.match(dock, new RegExp(`label: '${label}'`), `${label} has no home`);
  }
  assert.match(dock, /testid="drawers-stack-law"/, 'the paragraph has no home');
});

test('F3 · the mount chip writes the WHOLE stack, through the store\'s own add', () => {
  const id = wardrobe();
  S().addDrawers(id, 3, 'overlay', 200);
  assert.equal(A.stackMount(id), 'overlay');
  assert.equal(stackOf(id).length, 3);

  A.setStackMount(id, 'internal');
  assert.equal(A.stackMount(id), 'internal', 'BARE BOXES did not reach the stack');
  assert.ok(stackOf(id).every((d) => d.mount === 'internal'), 'only some of the stack changed');
  assert.equal(stackOf(id).length, 3, 'the count changed with the mount');

  A.setStackMount(id, 'overlay');
  assert.ok(stackOf(id).every((d) => d.mount === 'overlay'), 'WITH FRONTS did not come back');
});

test('F3 · the variant chip writes the whole stack, and CLEARS — the left column could too', () => {
  const id = wardrobe();
  S().addDrawers(id, 2, 'overlay', 200);
  assert.equal(A.stackVariant(id), 'std');

  A.setStackVariant(id, 'belt_tie');
  assert.equal(A.stackVariant(id), 'belt_tie');
  assert.ok(stackOf(id).every((d) => d.variant === 'belt_tie'), 'only some of the stack took it');

  A.setStackVariant(id, 'belt_tie_glass');
  assert.equal(A.stackVariant(id), 'belt_tie_glass');

  // The half `addDrawers`' sixth argument cannot do: STANDARD must CLEAR.
  A.setStackVariant(id, 'std');
  assert.equal(A.stackVariant(id), 'std', 'STANDARD is a dead chip');
  assert.ok(stackOf(id).every((d) => !d.variant), 'a variant survived STANDARD');
});

test('F3 · a FITTED drawer is not un-fitted by a stack-wide chip', () => {
  const id = wardrobe();
  S().addDrawers(id, 2, 'overlay', 200);
  const shoe = S().addShoeDrawer(id);
  assert.ok(shoe, 'the shoe drawer was not added');
  A.setStackVariant(id, 'belt_tie');
  const after = stackOf(id);
  assert.equal(after.find((d) => d.id === shoe)?.variant, 'shoe',
    'the belt chip un-fitted the shoe drawer');
  assert.ok(after.filter((d) => d.id !== shoe).every((d) => d.variant === 'belt_tie'),
    'the plain drawers did not take the chip');
});

test('F3 · …and the fault the re-home uncovered: HOW MANY no longer loses the mount', () => {
  // `setStackCount` was `addDrawers(unitId, n)` — the store's `mount` defaults
  // to 'overlay' and is written unconditionally, so counting a BARE-BOX stack
  // up or down quietly gave every drawer a front. Invisible while the chips
  // were add-time only; a fight the moment they became edit controls.
  const id = wardrobe();
  S().addDrawers(id, 2, 'internal', 200);
  assert.equal(A.stackMount(id), 'internal');
  A.setStackCount(id, 4);
  assert.equal(stackOf(id).length, 4, 'the count did not change');
  assert.equal(A.stackMount(id), 'internal', 'counting up put fronts on a bare-box stack');
  A.setStackCount(id, 2);
  assert.equal(A.stackMount(id), 'internal', 'counting down put fronts on a bare-box stack');
});

// ═══ 3 · F3 — THE INNER BOX HEIGHT, DERIVED AND NEVER TYPED ═══════════════

test('F3 · beside every front height, the ENGINE\'s own clear height inside the box', () => {
  const id = wardrobe();
  S().addDrawers(id, 3, 'overlay', 200);
  const rows = A.frontAndInsideWords(id);
  assert.equal(rows.length, 3, 'a drawer with a box said nothing');
  const panels = S().unitResult(id).panels;
  for (const row of rows) {
    assert.equal(row.front, 200, 'the front height is not the item\'s own');
    // THE ENGINE'S NUMBER, not a number of retail's: the same function the
    // watch tray and the shoe ramp are fitted by, asked of the same panels.
    assert.equal(row.inside, Math.round(drawerBoxInterior(panels, row.index).height),
      'the inner height is not the engine\'s own');
    assert.ok(row.inside > 0 && row.inside < row.front,
      'the clear inside must be shorter than the face over it');
    assert.equal(row.said, `front ${row.front} · inside ${row.inside}`, 'the quiet line changed shape');
  }
});

test('F3 · it FOLLOWS the front height, because it is derived from it', () => {
  const id = wardrobe();
  S().addDrawers(id, 2, 'overlay', 200);
  const before = A.frontAndInsideWords(id)[0];
  A.setStackFronts(id, 300);
  const after = A.frontAndInsideWords(id)[0];
  assert.equal(after.front, 300, 'the field did not write');
  assert.ok(after.inside > before.inside, 'a taller front did not make a taller box');
  assert.equal(after.inside - before.inside, 100,
    'the box grew by something other than the hundred the front grew by');
});

test('F3 · a drawer with no box says NOTHING — never a zero', () => {
  const id = wardrobe();
  assert.deepEqual(A.frontAndInsideWords(id), [], 'a wardrobe with no drawers invented a line');
  assert.equal(A.innerBoxHeight(id, 1), null, 'a drawer that does not exist has an inner height');
});

test('F3 · no engine key was added for it — the panels already said it', () => {
  // CLAUDE.md F3: *"do not … add an engine key the cut path would read."*
  const adapter = read('src/retail/design/adapter.js');
  assert.match(adapter, /drawerBoxInterior/, 'the inner height is not read off the engine at all');
  assert.doesNotMatch(read('src/engine/cabinet.js'), /inner_box_height|innerBoxHeight/,
    'the cut path grew a key for a read-out');
  assert.doesNotMatch(read('src/engine/watchDrawer.js'), /innerBoxHeight/);
});

// ═══ 4 · NOTHING IS LOST, AND THE PARAGRAPH TELLS THE TRUTH ═══════════════

test('F2/F3 · the paragraph moved whole, and its numbers are the profile\'s', () => {
  const id = wardrobe();
  S().addDrawers(id, 2, 'overlay', 200);
  const said = A.stackLawWords(id);
  assert.match(said, new RegExp(`${DR.minFrontHeight}–${DR.maxFrontHeight} mm each`),
    'the bounds are not the profile\'s own');
  assert.match(said, /Stacked from the bottom/);
  assert.match(said, /A partition closes the stack automatically \(SPEC 4\.7\)/);
  assert.match(said, /the doors open so you can see them/);
});

test('F2/F3 · …and where T70 F1 removed that partition, the paragraph says so instead', () => {
  const id = wardrobe();
  S().addDrawers(id, 2, 'overlay', 200);
  S().addShoeDrawer(id);
  const said = A.stackLawWords(id);
  assert.doesNotMatch(said, /A partition closes the stack automatically/,
    'the line still promises a board F1 no longer cuts');
  assert.match(said, /nothing is cut over this stack/);
  // …and the engine agrees, which is the point of reading it off the stack.
  assert.equal(S().unitResult(id).panels.filter((p) => p.part === 'PARTITION').length, 0);
});

test('F2/F3 · every chip that left the column is named, and reachable, in the dock', () => {
  const dock = uncomment(read('src/retail/design/detail/ReHomed.jsx'));
  const copy = read('src/retail/design/detail/AddItems.jsx');
  // The six, paired: the copy's own hook on the left, the dock's chip id on
  // the right. A chip with no pair is a control this turn lost.
  const MOVED = [
    ['data-drawer-mount="overlay"', "id: 'overlay'"],
    ['data-drawer-mount="internal"', "id: 'internal'"],
    ['Inset <span', "id: 'inset'"],
    ["[null, 'Standard'", "id: 'std'"],
    ["['belt_tie', 'Belt/tie'", "id: 'belt_tie'"],
    ["['belt_tie_glass', 'Belt/tie + glass'", "id: 'belt_tie_glass'"],
  ];
  for (const [was, now] of MOVED) {
    assert.ok(copy.includes(was), `the copy no longer carries ${was}`);
    assert.ok(dock.includes(now), `${was} left the column and has no home: ${now}`);
  }
  assert.ok(REASONS.insetStillToCome.length > 10, 'INSET is greyed without a reason');
  assert.ok(REASONS.bareBoxesLiveBehindDoors.length > 10, 'the mount row lost its note');
});
