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
const TOGGLE = readFileSync(new URL('../src/components/AudienceToggle.jsx', import.meta.url), 'utf8');
const UI = readFileSync(new URL('../src/stores/uiStore.js', import.meta.url), 'utf8');
const TOP = readFileSync(new URL('../src/components/TopBar.jsx', import.meta.url), 'utf8');
const START = readFileSync(new URL('../src/components/StartScreen.jsx', import.meta.url), 'utf8');

// ── the sequence itself ──

test('the six tabs are the owner’s six, in his order and his words', () => {
  assert.deepEqual(
    WIZARD_TABS.map((t) => `${t.n} ${t.label}`),
    ['1 Ustawienia', '2 Carcases', '3 Fronts', '4 Hardware', '5 Produkcja', '6 Podsumowanie'],
  );
});

test('Next advances, Back retreats, and the ends of the sequence are ends', () => {
  assert.equal(firstTab('factory'), 'ustawienia');
  assert.equal(tabAfter('ustawienia', 'factory'), 'carcases');
  assert.equal(tabAfter('produkcja', 'factory'), 'podsumowanie');
  assert.equal(tabAfter('podsumowanie', 'factory'), null);
  assert.equal(tabBefore('ustawienia', 'factory'), null);
  assert.equal(tabBefore('carcases', 'factory'), 'ustawienia');
});

test('retail loses Produkcja and the rest RENUMBER — no hole where 5 was', () => {
  const retail = visibleTabs('retail');
  assert.deepEqual(retail.map((t) => t.id), ['ustawienia', 'carcases', 'fronts', 'hardware', 'podsumowanie']);
  assert.deepEqual(retail.map((t) => t.n), [1, 2, 3, 4, 5]);
  assert.equal(tabAfter('hardware', 'retail'), 'podsumowanie', 'the walk skips the tab that is not there');
  assert.equal(tabPosition('podsumowanie', 'retail'), 4);
  assert.equal(tabPosition('produkcja', 'retail'), -1);
});

test('factory sees all six', () => {
  assert.equal(visibleTabs('factory').length, 6);
  assert.equal(tabVisible('produkcja', 'factory'), true);
  assert.equal(tabVisible('produkcja', 'retail'), false);
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
    'fronts.style',
    'hardware.colour',
    'podsumowanie.summary',
    'ustawienia.ceiling',
    'ustawienia.dimensions',
    'ustawienia.identity',
    'ustawienia.kitchen-heights',
  ]);
});

test('every workshop node is hidden from retail, by name', () => {
  const hidden = hiddenNodes('retail');
  for (const id of [
    'carcases.stock-board', 'carcases.sheets', 'carcases.cnc-corner', 'carcases.joinery',
    'carcases.thickness-note', 'fronts.shaker-frame', 'fronts.door-styles', 'fronts.run-materials',
    'hardware.choices', 'hardware.hinge-standard', 'hardware.hinge-plate-pilot',
    'hardware.shelf-sleeve', 'hardware.runners',
    'produkcja.infill', 'produkcja.per-material', 'produkcja.box-gate',
    'podsumowanie.save-set', 'ustawienia.sets',
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

test('every node names a tab that exists', () => {
  const ids = new Set(WIZARD_TABS.map((t) => t.id));
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
    assert.ok(WIZ.includes(`data-wizard-node="${n.id}"`), `${n.id} is not rendered anywhere`);
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
  assert.match(WIZ, /const \[visited, setVisited\] = useState/);
  assert.match(WIZ, /setVisited\(\(v\) => new Set\(\[\.\.\.v, id\]\)\)/);
  assert.match(WIZ, /disabled=\{state === 'ahead'\}/);
});

test('a head that loses its tab is not left standing on it', () => {
  assert.match(WIZ, /if \(!tabs\.some\(\(t\) => t\.id === tab\)\) setTab\(firstTab\(audience\)\);/);
});

// ── the app-level toggle ──

test('the mode is APP-level, default factory, and persisted', () => {
  assert.match(UI, /const AUDIENCE_KEY = 'cc\.audience';/);
  assert.match(UI, /audience: loadAudience\(\),/);
  assert.match(UI, /setAudience: \(v\) => set\(\{ audience: saveAudience\(normaliseAudience\(v\)\) \}\)/);
  assert.match(UI, /localStorage\.setItem\(AUDIENCE_KEY, value\)/);
  assert.match(UI, /return normaliseAudience\(localStorage\.getItem\(AUDIENCE_KEY\) \|\| DEFAULT_AUDIENCE\)/);
});

test('the toggle is in the HEADER of both screens a wizard opens from', () => {
  assert.match(TOGGLE, /data-audience-toggle="1"/);
  assert.match(TOGGLE, /data-audience-option=\{id\}/);
  assert.match(TOP, /<AudienceToggle/);
  assert.match(START, /<AudienceToggle/);
});

test('the mode reaches nothing but the drawing', () => {
  // It must not touch the design, the profile, the BOM or the engine.
  assert.doesNotMatch(TOGGLE, /setDesign|setProjectDefaults|computeCabinet|engine\//);
  assert.doesNotMatch(
    readFileSync(new URL('../src/lib/wizardTabs.js', import.meta.url), 'utf8'),
    /import .* from '\.\.\/engine\//,
    'the visibility engine imports no engine at all',
  );
});
