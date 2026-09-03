// ─── TURN 64 · F2 – F5 — THE STEPS, POSH, LAYOUT B, MY ESTIMATE ─────────────
//
// CLAUDE.md, TESTS AND PROOF, 5: *"`CATEGORIES` is the six steps in order; an
// item round-trips DESIGN → estimate → EDIT → DESIGN unchanged."* And the
// balance's three one-line answers, each asserted to be ONE: keyboard
// handlers on the stage (`turn64-f1`), places that decide which wardrobe an
// add goes to (`turn64-f1`), persistence paths that hold estimate items
// (here).

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { setPersistence } from '../src/stores/persistence.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { parseDecorCatalogue, setDecorCatalogue } from '../src/engine/decors.js';
import { PROJECT_TYPES } from '../src/engine/projectTypes.js';
import * as A from '../src/retail/design/adapter.js';
import { useEstimateStore } from '../src/retail/estimate/store.js';
import { ROUTES, parseHash } from '../src/retail/site/router.js';
import { REASONS } from '../src/retail/design/reasons.js';
import { ALL_COPIES, isCopy } from '../scripts/t63-copies.mjs';

setPersistence('none');
const ROOT = new URL('../', import.meta.url).pathname;
const RETAIL = join(ROOT, 'src/retail');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const S = () => useProjectStore.getState();
const E = () => useEstimateStore.getState();

setDecorCatalogue(parseDecorCatalogue(
  JSON.parse(read('public/decors/egger/egger-decors.json')), { basePath: '/decors/egger/' },
));

function filesUnder(dir, re = /\.(js|jsx)$/) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path, re));
    else if (re.test(path)) out.push(path);
  }
  return out;
}

/** The rail's list, read off the component's source — node cannot import a .jsx. */
const categories = () => {
  const src = read('src/retail/design/Categories.jsx');
  const block = src.slice(src.indexOf('export const CATEGORIES = ['), src.indexOf('];', src.indexOf('export const CATEGORIES = [')));
  return [...block.matchAll(/id: '([a-z]+)', label: '([A-Z]+)'/g)].map((m) => ({ id: m[1], label: m[2] }));
};

// ═══ F2 · THE SIX STEPS ══════════════════════════════════════════════════════

test('F2 · CATEGORIES is the six steps, in the owner\'s order', () => {
  assert.deepEqual(categories().map((c) => c.id), ['what', 'where', 'inside', 'fronts', 'extras', 'review']);
  assert.deepEqual(categories().map((c) => c.label), ['WHAT', 'WHERE', 'INSIDE', 'FRONTS', 'EXTRAS', 'REVIEW']);
  // …and the options column has a panel per step, in the same order, with NEXT and BACK.
  const options = code('src/retail/design/Options.jsx');
  const order = ['panel-what', 'panel-where', 'panel-inside', 'panel-fronts', 'panel-extras', 'panel-review']
    .map((id) => options.indexOf(`testid="${id}"`));
  assert.ok(order.every((at, i) => at > 0 && (i === 0 || at > order[i - 1])), 'the panels are not in the rail\'s order');
  assert.match(options, /data-testid="step-next"/);
  assert.match(options, /data-testid="step-back"/);
  // No slider anywhere in the steps.
  assert.ok(!/type="range"|<Slider/.test(options), 'a slider is back in a step');
});

test('F2 · the lazy client: every step has its answer chosen, and the defaults are the engine\'s', () => {
  useUiStore.getState().clearSelection();
  const id = A.startDesign('Lazy');
  const done = A.applyLazyDefaults(id);
  const p = S().project;
  // WHAT — a wardrobe, PRO's own project type.
  assert.equal(A.projectTypeOf(p), 'wardrobe');
  // WHERE — the wardrobe fills the wall, as far as the store lets it.
  assert.equal(done.fit.ok, true, done.fit.said);
  const unit = S().units.find((u) => u.id === id);
  const wall = A.wallLengthMm(p.room, 0);
  const max = A.unitBounds(id).width.max;
  assert.equal(Math.round(unit.params.width), Math.min(wall, max));
  // INSIDE — white, EGGER's own W1000.
  assert.equal(A.insideColourOf(p), 'white');
  // FRONTS — shaker, the house collection's decor, push-to-open (no handle).
  assert.equal(p.design.fronts.style, 'S');
  assert.ok(A.frontDecorOf(p), 'no front decor chosen for the lazy client');
  assert.equal(A.frontOpeningOf(p), 'push');
  assert.equal(p.design.fronts.handle, null);
  // EXTRAS — lighting off, the standard plinth.
  assert.equal(A.lightingOn(p), false);
  assert.equal(Math.round(unit.params.leg_height), 100);
});

test('F2 · WHAT offers PRO\'s own eight types; only the wardrobe is buildable, and the grey says why', () => {
  const tiles = A.projectTypeTiles();
  assert.deepEqual(tiles.map((t) => t.id), PROJECT_TYPES.map((t) => t.id));
  assert.deepEqual(tiles.filter((t) => !t.reason).map((t) => t.id), ['wardrobe']);
  for (const t of tiles.filter((t) => t.reason)) assert.equal(t.reason, REASONS.projectTypeNotOnline(t.label));
  A.startDesign('x');
  assert.equal(A.setProjectType('kitchen'), null, 'a greyed tile wrote the project type');
  assert.equal(A.setProjectType('wardrobe'), 'wardrobe');
});

test('F2 · INSIDE opens on the carcass material, above the interior rows, and offers three inside colours', () => {
  const options = read('src/retail/design/Options.jsx');
  const inside = options.slice(options.indexOf('function InsidePanel'), options.indexOf('/* ─── 4 · FRONTS'));
  const material = inside.indexOf('<MaterialSlot kind="carcass"');
  const colour = inside.indexOf('data-testid="inside-colour"');
  const rows = inside.indexOf('<AddItems unit={unit} />');
  assert.ok(material > 0 && colour > material && rows > colour, 'the material is not first, the rows not last');
  assert.match(inside, /SAME AS FRONTS/);
  assert.match(inside, /label="WHITE"/);
  assert.match(inside, /CHOOSE…/);
  // The three answers, through the store's own carcass setters.
  A.startDesign('x');
  A.setFrontDecor('H3195_19');
  assert.equal(A.setInsideColour('white'), A.swatchFor(A.WHITE_DECOR).finishId);
  assert.equal(A.insideColourOf(S().project), 'white');
  A.setInsideColour('fronts');
  assert.equal(A.insideColourOf(S().project), 'fronts');
  assert.equal(A.carcassDecorOf(S().project), A.frontDecorOf(S().project));
});

// ═══ F3 · POSH ═══════════════════════════════════════════════════════════════

test('F3 · one Button, in controls.jsx, and every ad-hoc <button> under src/retail that is retail\'s own is gone', () => {
  const controls = read('src/retail/design/controls.jsx');
  assert.match(controls, /export function Button\(/);
  assert.match(read('src/retail/ui/Button.jsx'), /import \{ Button \} from '\.\.\/design\/controls\.jsx';\s*[\s\S]*export default Button;/);
  const strays = [];
  for (const file of filesUnder(RETAIL, /\.jsx$/)) {
    const rel = relative(ROOT, file);
    if (isCopy(rel)) continue;                                   // PRO's markup, untouched
    if (rel.startsWith('src/retail/design/room/') && existsSync(join(ROOT, 'src/components', rel.split('/').pop()))) continue;
    // The three that ARE the control: the button itself, the chip (a flat
    // rectangle with its own law) and the view bar's tiles (T63 F5, the
    // owner's own order for that bar).
    if (/design\/controls\.jsx|ui\/Chip\.jsx|design\/ViewBar\.jsx/.test(rel)) continue;
    const text = code(rel);
    for (const m of text.matchAll(/<button\b[^>]*className="([^"]*)"/g)) strays.push(`${rel}: <button className="${m[1]}">`);
  }
  assert.deepEqual(strays, [], `ad-hoc buttons survive:\n  ${strays.join('\n  ')}`);
});

test('F3 · square, hairline, 12px tracked +0.08em, 44 / 36 — in the two stylesheets', () => {
  const base = read('src/retail/styles/base.css');
  const room = read('src/retail/styles/room.css');
  const scale = read('src/retail/styles/scale.css');
  const btn = base.slice(base.indexOf('.pbi-btn {'), base.indexOf('}', base.indexOf('.pbi-btn {')));
  assert.match(btn, /font-size: 12px;/);
  assert.match(btn, /letter-spacing: 0\.08em;/);
  assert.match(btn, /text-transform: uppercase;/);
  assert.match(btn, /border-radius: var\(--pbi-radius\);/);
  assert.match(read('src/retail/styles/tokens.css'), /--pbi-radius: 0;/);
  // The secondary: Onyx at 40% hairline, Ivory fill, gold hairline on hover.
  const secondary = base.slice(base.indexOf('.pbi-btn-secondary {'), base.indexOf('}', base.indexOf('.pbi-btn-secondary {')));
  assert.match(secondary, /border: 1px solid rgba\(9, 10, 9, 0\.4\);/);
  assert.match(secondary, /background: var\(--pbi-ivory\);/);
  assert.match(base, /\.pbi-btn-secondary:hover[^{]*\{ border-color: var\(--pbi-deep-gold\);/);
  // The primary is the filled one — and it is Onyx.
  assert.match(base, /\.pbi-btn-primary \{\s*background: var\(--pbi-onyx\);/);
  // The room's heights, as tokens: 44 and 36 × the scale; the type at 12 on the 11 floor.
  assert.match(scale, /--pbi-button-h: calc\(44 \* var\(--pbi-scale\)\);/);
  assert.match(scale, /--pbi-button-h-sm: calc\(36 \* var\(--pbi-scale\)\);/);
  assert.match(scale, /--pbi-fs-btn: max\(11px, calc\(12 \* var\(--pbi-scale\)\)\);/);
  assert.match(room, /\.pbi-room \.pbi-btn \{[^}]*font-size: var\(--pbi-fs-btn\);/);
  assert.match(room, /\.pbi-room \.pbi-btn-small \{[^}]*height: var\(--pbi-button-h-sm\);/);
  // Gold is never a fill: no rule on the PBI side fills with a gold token.
  for (const rel of ['src/retail/styles/base.css', 'src/retail/styles/room.css', 'src/retail/styles/copies.css', 'src/retail/styles/roomeditor.css']) {
    const css = read(rel).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of css.matchAll(/background(?:-color)?:\s*var\(--pbi-(gold|deep-gold|gold-highlight|champagne)\)/g)) {
      // Champagne as a HOVER wash on a secondary is F2's own law; a fill at rest is not.
      const at = css.lastIndexOf('{', m.index);
      const selector = css.slice(css.lastIndexOf('}', at) + 1, at).trim();
      // The 48×1 line under a heading IS a hairline — its background is the
      // line, as is the 1px rule on Onyx — and a chip's 6px selection mark is
      // the "small mark" the system allows gold for. Never a fill on a
      // control's face.
      // (`::selection` is the caret's own highlight, not a face either.)
      assert.ok(/:hover|:focus|gold-line|rule-gold|::after|::selection/.test(selector), `${rel}: gold fills ${selector}`);
    }
  }
});

test('F3 · the rail is six square tiles, icon over one word, gold hairline for the active one', () => {
  const cats = read('src/retail/design/Categories.jsx');
  assert.match(cats, /className=\{`pbi-tile/);
  assert.match(cats, /<StepIcon step=\{c\.id\} \/>/);
  assert.match(cats, /className="pbi-tile-word"/);
  assert.ok(!/pbi-rail-row|pbi-rail-hint|pbi-rail-foot|total-price|RESET DESIGN/.test(cats), 'the old rail rows survive');
  const room = read('src/retail/styles/room.css');
  assert.match(room, /\.pbi-tile \{[^}]*width: var\(--pbi-tile\);[^}]*height: var\(--pbi-tile\);/);
  assert.match(room, /\.pbi-tile\.is-on \{[^}]*border-bottom-color: var\(--pbi-deep-gold\);/);
  assert.ok(!/\.pbi-tile\.is-on \{[^}]*background: var\(--pbi-(gold|deep-gold)/.test(room), 'the active tile is a filled block');
  const scale = read('src/retail/styles/scale.css');
  assert.match(scale, /--pbi-tile: calc\(79 \* var\(--pbi-scale\)\);/);      // 64px at 1440
  assert.match(scale, /--pbi-tile-icon: calc\(25 \* var\(--pbi-scale\)\);/); // 20px at 1440
  assert.match(scale, /--pbi-fs-tile: max\(11px, calc\(11 \* var\(--pbi-scale\)\)\);/);
  // The icons are inline SVG in drawings.jsx — no npm icon set.
  const drawings = read('src/retail/design/detail/drawings.jsx');
  for (const step of ['what', 'where', 'inside', 'fronts', 'extras', 'review']) assert.match(drawings, new RegExp(`^  ${step}: \\(`, 'm'));
  const deps = JSON.parse(read('package.json'));
  assert.ok(!Object.keys({ ...deps.dependencies, ...deps.devDependencies }).some((d) => /icon/i.test(d)), 'an icon dependency arrived');
});

test('F3 · the copies are reskinned through the GENERATED sheet, and their markup did not move', () => {
  const map = read('scripts/t63-copy.mjs');
  assert.match(map, /'cc-btn': \['pbi-re-btn', '\.pbi-re-btn \{[^']*border-radius: 0;[^']*font-size: 12px;[^']*letter-spacing: 0\.08em;/);
  const sheet = read('src/retail/styles/copies.css');
  assert.match(sheet, /^\.pbi-re-btn \{ padding: 0\.5rem 0\.75rem; border-radius: 0;/m);
  assert.match(sheet, /^\.pbi-re-btn-gold \{[^\n]*background: var\(--pbi-onyx\);/m);
  assert.ok(!/^\.pbi-re-btn \{/m.test(read('src/retail/styles/roomeditor.css')), 'the hand-written rule is still there beside the generated one');
  // T63's own fidelity test holds the copies' markup; here only the count.
  assert.equal(ALL_COPIES.length, 25);
});

// ═══ F4 · LAYOUT B ═══════════════════════════════════════════════════════════

test('F4 · the owner\'s container numbers at 1440: rail 72, options ~340, detail ~360', () => {
  const scale = read('src/retail/styles/scale.css');
  const at1440 = 0.78 + (1440 - 1280) * 0.00017;
  const base = (name) => Number((scale.match(new RegExp(`${name}: calc\\((\\d+) \\* var\\(--pbi-scale\\)\\);(?![\\s\\S]*${name}: calc)`)) || [])[1]);
  assert.equal(Math.round(base('--pbi-col-categories') * at1440), 72);
  assert.ok(Math.abs(base('--pbi-col-options') * at1440 - 340) <= 2, `options ${base('--pbi-col-options') * at1440}`);
  assert.ok(Math.abs(base('--pbi-col-detail') * at1440 - 360) <= 2, `detail ${base('--pbi-col-detail') * at1440}`);
  assert.equal(Math.round(base('--pbi-tile') * at1440), 64);
  assert.equal(Math.round(base('--pbi-tile-icon') * at1440), 20);
});

test('F4 · the detail is a panel over the stage, slid in by a selection and out by DONE or the empty stage', () => {
  const room = read('src/retail/styles/room.css');
  const detail = room.slice(room.indexOf('.pbi-detail {'), room.indexOf('}', room.indexOf('.pbi-detail {')));
  assert.match(detail, /position: absolute;/);
  assert.match(detail, /transform: translateX\(100%\);/);
  assert.match(room, /\.pbi-detail\[data-open="yes"\] \{\s*transform: none;/);
  assert.match(room, /\.pbi-stage-col \{[^}]*position: relative;/);
  const component = read('src/retail/design/Detail.jsx');
  assert.match(component, /data-open=\{Menu \? 'yes' : 'no'\}/);
  assert.ok(!/EstimateDuty|add-another|detail-quote|detail-save/.test(component), 'the estimate duty is still in the panel');
  // The room mounts it INSIDE the stage column, and closes what the stage opened.
  const design = read('src/retail/design/DesignRoom.jsx');
  const stageAt = design.indexOf('<div className="pbi-stage-col">');
  assert.ok(design.indexOf('<Detail', stageAt) > stageAt && design.indexOf('<Detail', stageAt) < design.indexOf('</div>', design.indexOf('<StageHint', stageAt)));
  assert.match(design, /from: 'stage'/);
  assert.match(design, /from: 'list'/);
});

test('F4 · the top bar\'s right end is "Price on request · MY ESTIMATE (n)", from anywhere', () => {
  const header = read('src/retail/ui/Header.jsx');
  assert.match(header, /data-testid="total-price"/);
  assert.match(header, /\{PRICE_ON_REQUEST\}/);
  assert.match(header, /label=\{`MY ESTIMATE \(\$\{count\}\)`\}/);
  assert.match(header, /useEstimateStore\(\(s\) => s\.designs\.filter\(\(d\) => d\.committed\)\.length\)/);
  assert.match(header, /path="\/estimate"/);
});

// ═══ F5 · MY ESTIMATE ════════════════════════════════════════════════════════

test('F5 · the route exists on the retail router only, and the page is PSW\'s list', () => {
  assert.ok(ROUTES.includes('/estimate'));
  assert.equal(parseHash('#/estimate').path, '/estimate');
  assert.equal(parseHash('#/design?edit=design-3').query.edit, 'design-3');
  assert.equal(parseHash('#/design?new=1').query.new, '1');
  for (const rel of ['src/App.jsx', 'src/main.jsx', 'src/pages/ConfiguratorPage.jsx']) {
    assert.ok(!/\/estimate|EstimatePage/.test(read(rel)), `${rel} learnt the estimate page`);
  }
  const page = read('src/retail/estimate/EstimatePage.jsx');
  for (const name of ['EstimatesPage.jsx', 'EstimateConfiguratorPage.jsx', 'MainLayout.jsx', 'AppSidebar.jsx']) {
    assert.ok(page.includes(name), `the page does not name the PSW file it was modelled on: ${name}`);
  }
  assert.ok(!/from '[^']*psw/.test(page) && !/react-router/.test(page), 'something was IMPORTED from PSW');
  for (const testid of ['estimate-edit-', 'estimate-duplicate-', 'estimate-remove-', 'add-another', 'estimate-quote', 'estimate-save', 'detail-load']) {
    assert.ok(page.includes(testid), `${testid} is missing from the page`);
  }
  assert.match(page, /go\(`\/design\?edit=\$\{item\.id\}`\)/);
  assert.match(page, /go\('\/design\?new=1'\)/);
  assert.match(page, /SAVED ESTIMATES/);
});

test('F5 · ONE persistence path holds the items — the existing SAVE/LOAD store', () => {
  const stores = filesUnder(RETAIL).filter((f) => /create\(\s*\(set, get\)/.test(read(relative(ROOT, f))));
  assert.deepEqual(stores.map((f) => relative(ROOT, f)), ['src/retail/estimate/store.js']);
  for (const file of filesUnder(RETAIL)) {
    assert.ok(!/localStorage|sessionStorage|indexedDB/.test(code(relative(ROOT, file))), `${relative(ROOT, file)} persists on its own`);
  }
});

test('F5 · an item round-trips DESIGN → estimate → EDIT → DESIGN unchanged', () => {
  useUiStore.getState().clearSelection();
  const id = A.startDesign('Bedroom wardrobe');
  E().begin('Bedroom wardrobe');
  A.applyLazyDefaults(id);
  A.setUnitSize(id, { width: 2400 });
  S().addShelves(id, 2);
  A.setFrontOpening('jhandle');
  const before = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));

  // DONE → ADD TO MY ESTIMATE
  const itemId = E().commit({ thumb: 'data:image/png;base64,x' });
  assert.equal(E().items().length, 1);
  assert.equal(E().items()[0].thumb, 'data:image/png;base64,x');
  assert.deepEqual(E().items()[0].snapshot, before, 'the item is not what was on the stage');

  // ADD ANOTHER WARDROBE — a fresh design on the stage, the item untouched.
  E().addDesign((name) => A.startDesign(name), 'Wardrobe 2');
  assert.notEqual(S().units[0].id, id);
  assert.equal(E().items().length, 1, 'an uncommitted design is not an item');

  // EDIT → the item back on the stage. `loadProject` is the store's own door
  // and it MIGRATES on the way in (a `shelf_schema` tag, a `shakerFrame`
  // filled from the profile) — so "unchanged" is asserted as the facts the
  // client chose, and as a FIXED POINT: a second trip changes nothing more.
  assert.equal(E().select(itemId), true);
  const facts = (snap) => ({
    width: Math.round(snap.units[0].params.width),
    shelves: snap.units[0].params.sections[0].items.filter((i) => i.kind === 'shelf').map((i) => i.pos_mm),
    opening: A.frontOpeningOf(snap.project),
    front: snap.project.design.fronts.types[0]?.finish_id || null,
    carcass: snap.project.design.carcass.types[0]?.finish_id || null,
    style: snap.project.design.fronts.style,
  });
  const after1 = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  assert.deepEqual(facts(after1), facts(before), 'the item drifted through the round trip');
  E().addDesign((name) => A.startDesign(name), 'Wardrobe 3');
  assert.equal(E().select(itemId), true);
  const after2 = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  assert.deepEqual(after2, after1, 'a second round trip moved something');
  assert.equal(A.frontOpeningOf(S().project), 'jhandle');

  // SAVE CHANGES is the same act; DUPLICATE and × are the store's own.
  A.setUnitSize(S().units[0].id, { width: 2200 });
  E().commit();
  assert.equal(E().items()[0].snapshot.units[0].params.width, 2200);
  const copy = E().duplicate(itemId);
  assert.equal(E().items().length, 2);
  assert.equal(E().items()[1].id, copy);
  assert.deepEqual(E().items()[1].snapshot, E().items()[0].snapshot);
  assert.equal(E().remove(copy), true);
  assert.equal(E().items().length, 1);
  // …and a whole estimate saved and loaded keeps its items as items.
  const doc = { designs: E().items().map((d) => ({ name: d.name, snapshot: d.snapshot })) };
  assert.equal(E().loadEstimate(doc), true);
  assert.equal(E().items().length, 1);
});

test('F5 · the room enters in ADD or EDIT mode off the URL, and REVIEW\'s button says which', () => {
  const room = read('src/retail/design/DesignRoom.jsx');
  assert.match(room, /const editId = query\?\.edit \|\| null;/);
  assert.match(room, /query\?\.new === '1'/);
  assert.match(room, /estimate\.select\(editId\)/);
  assert.match(room, /`EDIT — \$\{designName\}`/);
  const options = read('src/retail/design/Options.jsx');
  assert.match(options, /editing \? 'SAVE CHANGES' : 'DONE → ADD TO MY ESTIMATE'/);
  assert.match(room, /stageThumbnail\(handle\.current, name\)/);
  assert.match(room, /commit\(\{ thumb \}\)/);
  assert.match(room, /go\('\/estimate'\)/);
});
