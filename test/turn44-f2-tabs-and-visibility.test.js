import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  AUDIENCES, DEFAULT_AUDIENCE, KITCHEN_ONLY_DIMENSIONS, WIZARD_NODES, WIZARD_TABS,
  dimensionAsked, dimensionsFor, firstTab, hiddenNodes, nodeAudience, nodeVisible,
  normaliseAudience, tabAfter, tabBefore, tabPosition, tabVisible, visibleNodes, visibleTabs,
} from '../src/lib/wizardTabs.js';

// ─── TURN 44 · F2 — THE STEP-4 SHELL: TABS, SEQUENCE, VISIBILITY ────────────
//
// CLAUDE.md: *"Replace the single scroll with a tabbed sequence: 1 Ustawienia →
// 2 Carcases → 3 Fronts → 4 Hardware → 5 Produkcja → 6 Podsumowanie. Tabs stay
// clickable once visited; Next advances."* and, of iron rule 5, *"The
// visibility engine … lives here: one declarative map `{tabId, audience}` +
// per-field flags. Retail simply never renders factory nodes — no disabled
// ghosts."*
//
// F2 names two tests: tab return keeps state, and retail renders zero
// factory-flagged nodes. The first is a PROBE assertion (state lives in a
// mounted component) and is walked in `scripts/e2e-turn44.mjs`; the DOM audit
// the second asks for is walked there too. What is testable in node is the
// TREE and the FILTER, and that is deliberately where the rule lives.

const WIZ = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');
// T45 F4: step 6's own screen. It carries the `summary.*` nodes of the same
// tree and stamps them the same way, so the audit below walks both surfaces as
// one page — which is what they are to the hand that walks the wizard.
const SUM = readFileSync(new URL('../src/components/WizardSummary.jsx', import.meta.url), 'utf8');

// ── the sequence itself ──

// T45 F4 folds the sixth sub-tab — the settings' own summary — into the
// WIZARD's step 6, which shows the whole project rather than one step of it.
// The five that remain are the owner's five, in his order.
test('the tabs are the owner’s, in his order and his words', () => {
  assert.deepEqual(
    WIZARD_TABS.map((t) => `${t.n} ${t.label}`),
    // T45 F8: the English sweep, by name — `Ustawienia → Settings`,
    // `Produkcja → Production` — and the numbers the strip prints are `5.N`,
    // because these are sub-tabs OF STEP 5.
    ['1 Settings', '2 Carcases', '3 Fronts', '4 Hardware', '5 Production', '6 Lighting'],
  );
});

test('Next advances, Back retreats, and the ends of the sequence are ends', () => {
  assert.equal(firstTab('factory'), 'settings');
  assert.equal(tabAfter('settings', 'factory'), 'carcases');
  // T45 F9b adds `5.6 Lighting` at the end of the strip; T45 F4 took the
  // settings' own summary off it and gave the wizard's step 6 the whole job.
  assert.equal(tabAfter('production', 'factory'), 'lighting');
  assert.equal(tabAfter('lighting', 'factory'), null, 'the walk ends here and step 6 begins');
  assert.equal(tabBefore('settings', 'factory'), null);
  assert.equal(tabBefore('carcases', 'factory'), 'settings');
});

test('retail loses Produkcja and the rest RENUMBER — no hole where 5 was', () => {
  const retail = visibleTabs('retail');
  assert.deepEqual(retail.map((t) => t.id), ['settings', 'carcases', 'fronts', 'hardware']);
  assert.deepEqual(retail.map((t) => t.n), [1, 2, 3, 4]);
  assert.equal(tabAfter('hardware', 'retail'), null, 'the walk skips the tab that is not there');
  assert.equal(tabPosition('hardware', 'retail'), 3);
  assert.equal(tabPosition('production', 'retail'), -1);
});

test('factory sees them all', () => {
  assert.equal(visibleTabs('factory').length, WIZARD_TABS.length);
  assert.equal(tabVisible('production', 'factory'), true);
  assert.equal(tabVisible('production', 'retail'), false);
});

// ── the filter ──

test('the two heads, and anything else is the workshop’s', () => {
  assert.deepEqual(AUDIENCES, ['factory', 'retail']);
  assert.equal(DEFAULT_AUDIENCE, 'factory');
  assert.equal(normaliseAudience('retail'), 'retail');
  assert.equal(normaliseAudience('workshop'), 'factory');
  assert.equal(normaliseAudience(undefined), 'factory');
  assert.equal(normaliseAudience(null), 'factory');
});

test('a node nobody classified is FACTORY — the safe direction', () => {
  assert.equal(nodeAudience('something.nobody.wrote.down'), 'factory');
  assert.equal(nodeVisible('something.nobody.wrote.down', 'retail'), false);
  assert.equal(nodeVisible('something.nobody.wrote.down', 'factory'), true);
});

test('RETAIL SEES exactly the clauses of iron rule 5 — and nothing else', () => {
  // "Retail sees: Ustawienia (read-only basics), material/colour pickers,
  //  — T45 F8 renamed that tab `Settings`, in English, by name —
  //  drawer choice, front type + opening + shine, hardware COLOUR only,
  //  summary."
  const seen = WIZARD_NODES.filter((n) => nodeVisible(n.id, 'retail')).map((n) => n.id).sort();
  assert.deepEqual(seen, [
    'carcases.chosen',
    'carcases.count',
    'carcases.drawers',
    'carcases.picker',
    'fronts.chosen',
    'fronts.count',
    'fronts.opening',
    'fronts.picker',
    'fronts.shine',
    'hardware.colour',
    'settings.ceiling',
    'settings.dimensions',
    'settings.identity',
    'settings.kitchen-heights',
    'summary.decors',
    'summary.dimensions',
    'summary.hardware',
    'summary.project',
  ]);
});

test('every workshop node is hidden from retail, by name', () => {
  const hidden = hiddenNodes('retail');
  for (const id of [
    'carcases.stock-board', 'carcases.sheets', 'carcases.cnc-corner',
    'carcases.thickness-note', 'fronts.shaker-frame', 'fronts.door-styles', 'fronts.run-materials',
    'hardware.choices', 'hardware.hinge-standard', 'hardware.hinge-plate-pilot',
    'hardware.shelf-sleeve', 'hardware.runners',
    'production.infill', 'production.per-material', 'production.box-gate',
    'summary.production', 'summary.save-set', 'settings.sets',
  ]) {
    assert.ok(hidden.includes(id), `${id} must not reach a client`);
  }
  assert.deepEqual(hiddenNodes('factory'), [], 'the workshop is hidden from nothing');
});

test('the hardware tab keeps ONLY colour for retail (F6, in the map)', () => {
  const retailHardware = visibleNodes('hardware', 'retail').map((n) => n.id);
  assert.deepEqual(retailHardware, ['hardware.colour']);
  assert.equal(visibleNodes('hardware', 'factory').length, 7);
});

test('every node names a tab that exists — or the wizard’s own step 6', () => {
  // T45 F4: the `summary.*` nodes are the WIZARD's sixth step and not a
  // sub-tab of step 5, which is why `WIZARD_TABS` has no `summary` row. They
  // are nodes because the FILTER is the filter — a client's summary is built
  // smaller, never built and then hidden.
  const ids = new Set([...WIZARD_TABS.map((t) => t.id), 'summary']);
  for (const n of WIZARD_NODES) assert.ok(ids.has(n.tab), `${n.id} points at no tab`);
});

test('every node id is unique — one tree, not two', () => {
  const ids = WIZARD_NODES.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length);
});

// ── the kitchen-only dimensions (F3's rule, stated here) ──

test('base / wall / wall-mount are a kitchen’s three, and a wardrobe never sees them', () => {
  assert.deepEqual(KITCHEN_ONLY_DIMENSIONS, ['base', 'wall', 'wallMount']);
  for (const key of KITCHEN_ONLY_DIMENSIONS) {
    assert.equal(dimensionAsked(key, 'kitchen'), true);
    assert.equal(dimensionAsked(key, 'wardrobe'), false);
    assert.equal(dimensionAsked(key, 'vanity'), false);
  }
  // …and everything else is asked of everybody.
  assert.equal(dimensionAsked('depth', 'wardrobe'), true);
  assert.equal(dimensionAsked('toeKick', 'wardrobe'), true);
  assert.equal(dimensionAsked('tall', 'wardrobe'), true);
});

test('dimensionsFor filters a row list without reordering it', () => {
  const rows = [
    { key: 'base' }, { key: 'depth' }, { key: 'tall' }, { key: 'wall' }, { key: 'toeKick' },
  ];
  assert.deepEqual(dimensionsFor(rows, 'wardrobe').map((d) => d.key), ['depth', 'tall', 'toeKick']);
  assert.deepEqual(dimensionsFor(rows, 'kitchen').map((d) => d.key), ['base', 'depth', 'tall', 'wall', 'toeKick']);
  assert.deepEqual(dimensionsFor(null, 'kitchen'), []);
});

// ── the surface obeys the tree rather than deciding for itself ──

test('the surface asks `show(id)` and stamps the node it drew', () => {
  assert.match(WIZ, /const show = \(id\) => nodeVisible\(id, audience\);/);
  assert.match(WIZ, /data-wizard-tabs="1"/);
  assert.match(WIZ, /data-wizard-tab=\{t\.id\}/);
  assert.match(WIZ, /data-tab-state=\{state\}/);
  assert.match(WIZ, /data-wizard-audience=\{audience\}/);
  assert.match(WIZ, /data-wizard-tab-body=\{tab\}/);
  // Every node in the map is stamped on the surface, so the DOM audit can walk
  // the page and compare it with the table without the component confessing.
  for (const n of WIZARD_NODES) {
    const stamp = `data-wizard-node="${n.id}"`;
    assert.ok(
      WIZ.includes(stamp) || SUM.includes(stamp) || SUM.includes('data-wizard-node={node}'),
      `${n.id} is not rendered anywhere`,
    );
  }
});

test('NO DISABLED GHOSTS — a hidden node is not built', () => {
  // Every `show(...)` in the surface guards with `&&`, which builds nothing.
  // A `disabled={...}` driven by the audience would be the ghost rule 5 forbids
  // by name, and there is none.
  assert.doesNotMatch(WIZ, /disabled=\{[^}]*audience/);
  assert.doesNotMatch(WIZ, /audience === 'retail' \? 'opacity/);
  const guards = WIZ.match(/\{show\('[a-z.-]+'\) &&/g) || [];
  assert.ok(guards.length >= 15, `only ${guards.length} nodes are guarded`);
});

test('a tab stays clickable once visited, and one ahead of the walk does not', () => {
  // T45 F7 lifts the walk out of this component's own `useState` so a detour to
  // the room editor and back cannot forget it. The RULE is unchanged: a visited
  // tab is clickable, and one ahead of the walk is not a place you can be.
  assert.match(WIZ, /visited: visited\.includes\(id\) \? visited : \[\.\.\.visited, id\]/);
  assert.match(WIZ, /visited\.includes\(t\.id\) \? 'visited' : 'ahead'/);
  assert.match(WIZ, /disabled=\{state === 'ahead'\}/);
});

test('a head that loses its tab is not left standing on it', () => {
  assert.match(WIZ, /if \(!tabs\.some\(\(t\) => t\.id === tab\)\) setTab\(firstTab\(audience\)\);/);
});

// ── the app-level head ──
//
// T44 shipped this as a HEADER TOGGLE, remembered in `cc.audience`. T45's F2
// removes the toggle by name (iron rule 4) and hardwires the head to the DOOR
// instead — see test/turn45-f2-one-codebase-two-entries.test.js, which is
// where the three assertions that used to stand here now live. What survives
// unchanged, and is what this file has always really been about, is that the
// head reaches NOTHING but the drawing.

test('the mode reaches nothing but the drawing', () => {
  assert.doesNotMatch(
    readFileSync(new URL('../src/lib/wizardTabs.js', import.meta.url), 'utf8'),
    /import .* from '\.\.\/engine\//,
    'the visibility engine imports no engine at all',
  );
  assert.doesNotMatch(
    readFileSync(new URL('../src/lib/appEntry.js', import.meta.url), 'utf8'),
    /setDesign|setProjectDefaults|computeCabinet|engine\//,
    'and neither does the door that chooses the head',
  );
});
