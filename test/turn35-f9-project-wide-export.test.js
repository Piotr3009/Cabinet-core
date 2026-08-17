// ─── Turn 35, CLAUDE.md F9: EXPORT BY ELEMENT TYPE, PROJECT-WIDE ───────────
//
// The owner, 16.08.2026: *"wybór all carcases, infill, shelves etc powinien
// też być dla wszystkich szafek, nie tylko pojedynczych — mogę na przykład
// tylko eksportować shelves. Ale export poprzez materiał zostaw jak jest."*
//
// Four things have to be true together:
//   1. the type list answers for the WHOLE project — every cabinet's shelves
//      in one press, and nothing that is not a shelf;
//   2. it is applied through the store action the per-cabinet row already
//      uses, per unit — part ids are NOT unique across cabinets (every one of
//      them has a BUL), so a flat set of ids would tick the wrong boards;
//   3. the per-cabinet row is still there, still inside its branch (rule 4 —
//      "nigdy nie kasuj bez mojej zgody jakichkolwiek funkcji");
//   4. EXPORT BY MATERIAL IS UNTOUCHED. Not "still works" — unchanged.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import {
  PART_GROUP_IDS, QUICK_SELECTS, exportablePanels, groupOfPanel, panelIdsForQuickSelect,
  projectQuickSelect,
} from '../src/engine/cnc/groups.js';

const store = () => useProjectStore.getState();
const ui = () => useUiStore.getState();

function project() {
  store().loadProject({
    id: null,
    name: 't35-f9',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
  ui().resetCncVisibility();
}

/**
 * Three cabinets of three kinds, and deliberately not alike:
 *   W01  wardrobe — two shelves, a door, a plinth and the top infills
 *   WU02 wall unit — one shelf and a door
 *   03   base unit — no shelves at all
 * The third is the one that matters most: "only shelves" across a job has to
 * empty a cabinet that has none, not leave it holding its carcass.
 */
function threeCabinets() {
  project();
  const a = store().addUnit('WARDROBE');
  store().updateUnitParams(a.id, { doors: true, plinth: true, top_infill_mm: 100 });
  store().addItem(a.id, { kind: 'shelf', pos_mm: 900 });
  store().addItem(a.id, { kind: 'shelf', pos_mm: 1400, variant: 'fixed' });
  const b = store().addUnit('WUD', { near: a.id, side: 'right' });
  store().updateUnitParams(b.id, { doors: { count: 1 } });
  store().addItem(b.id, { kind: 'shelf', pos_mm: 300 });
  const c = store().addUnit('BUD', { near: b.id, side: 'right' });
  return { wardrobe: a.id, wall: b.id, base: c.id };
}

/** What the CNC tree hands the selection: every cabinet and its cut parts. */
const sheets = () => store().units.map((u) => ({
  unitId: u.id,
  panels: exportablePanels(store().unitResult(u.id).panels),
}));

/** Every part of the project, tagged with the cabinet it is in. */
const allParts = () => sheets().flatMap((s) => s.panels.map((p) => ({ unitId: s.unitId, panel: p })));

// ─── the selection, over the whole project ─────────────────────────────────

test('a project-wide shelf selection picks EVERY cabinet’s shelves — and nothing else', () => {
  threeCabinets();
  const plan = projectQuickSelect(sheets(), 'shelves');

  // What it picked, unit by unit, against the engine's own grouping.
  const picked = plan.flatMap((r) => r.ids.map((id) => `${r.unitId}::${id}`));
  const expected = allParts()
    .filter((x) => groupOfPanel(x.panel) === 'shelves')
    .map((x) => `${x.unitId}::${x.panel.id}`);
  assert.deepEqual(picked.sort(), expected.sort());

  // …and it really is more than one cabinet's worth, or this test proves
  // nothing the per-unit one did not already prove.
  assert.ok(expected.length >= 3, 'the fixture must carry shelves in more than one cabinet');
  assert.ok(new Set(plan.filter((r) => r.ids.length).map((r) => r.unitId)).size >= 2);

  // Nothing that is not a shelf came with them.
  const byId = new Map(allParts().map((x) => [`${x.unitId}::${x.panel.id}`, x.panel]));
  for (const key of picked) assert.equal(groupOfPanel(byId.get(key)), 'shelves', key);
});

test('the cabinet with no shelves is EMPTIED, not left holding its carcass', () => {
  const ids = threeCabinets();
  const plan = projectQuickSelect(sheets(), 'shelves');
  const base = plan.find((r) => r.unitId === ids.base);
  assert.equal(base.ids.length, 0, 'the base unit has no shelves');
  assert.ok(base.all.length > 0, 'but it does have parts, and they are named so they can go off');
});

test('the plan is keyed per cabinet — BUL is three different boards', () => {
  threeCabinets();
  const plan = projectQuickSelect(sheets(), 'carcasses');
  // Part ids repeat across cabinets: every one of the three has a BUL. A flat
  // id list would be ambiguous, which is why the plan carries the unit.
  const bulOwners = plan.filter((r) => r.ids.includes('BUL')).map((r) => r.unitId);
  assert.equal(bulOwners.length, 3);
  assert.equal(new Set(bulOwners).size, 3);
  assert.equal(plan.length, store().units.length, 'every cabinet is in the plan, none skipped');
});

test('each button answers project-wide, and All is still the sum of the four', () => {
  threeCabinets();
  const total = (id) => projectQuickSelect(sheets(), id).reduce((n, r) => n + r.ids.length, 0);
  const all = total('all');
  assert.equal(all, allParts().length);
  assert.equal(PART_GROUP_IDS.reduce((n, id) => n + total(id), 0), all,
    'the four groups add up to All across the project — no part in two, none in none');
});

test('it is the SAME list as the per-cabinet row, unit by unit', () => {
  threeCabinets();
  // Not a second answer to the same question: the project plan for one cabinet
  // is exactly what that cabinet's own row would have ticked.
  for (const q of QUICK_SELECTS) {
    const plan = projectQuickSelect(sheets(), q.id);
    for (const s of sheets()) {
      const mine = plan.find((r) => r.unitId === s.unitId);
      assert.deepEqual(mine.ids, panelIdsForQuickSelect(s.panels, q.id), `${q.id} · ${s.unitId}`);
    }
  }
});

test('a selection nobody offers selects nothing at all', () => {
  threeCabinets();
  assert.deepEqual(projectQuickSelect(sheets(), 'sprayed'), [],
    'EXPORT_PRESETS ids are a different list and must not leak in here');
  assert.deepEqual(projectQuickSelect(sheets(), 'nope'), []);
  assert.deepEqual(projectQuickSelect(null, 'shelves'), []);
});

// ─── replayed into the store the tree already writes to ────────────────────

/** The two writes the tree makes per cabinet: everything off, then the type on. */
function applyPlan(plan) {
  for (const row of plan) {
    ui().setCncParts(row.unitId, row.all, false);
    ui().setCncParts(row.unitId, row.ids, true);
  }
}

/** What the sheet is left showing — the tree's own `entries` shape. */
function onTheSheet() {
  const hidden = ui().cncHiddenParts;
  return sheets().flatMap((s) => s.panels
    .filter((p) => !hidden[s.unitId]?.[p.id])
    .map((p) => `${s.unitId}::${p.id}`));
}

test('replayed through setCncParts, the whole project is left showing shelves only', () => {
  threeCabinets();
  applyPlan(projectQuickSelect(sheets(), 'shelves'));

  const left = onTheSheet().sort();
  const expected = allParts()
    .filter((x) => groupOfPanel(x.panel) === 'shelves')
    .map((x) => `${x.unitId}::${x.panel.id}`)
    .sort();
  assert.deepEqual(left, expected, 'every shelf in the project, and nothing else, is on the sheet');
});

test('…and All puts the whole job back, in every cabinet', () => {
  threeCabinets();
  applyPlan(projectQuickSelect(sheets(), 'fronts'));
  assert.ok(onTheSheet().length < allParts().length);
  applyPlan(projectQuickSelect(sheets(), 'all'));
  assert.equal(onTheSheet().length, allParts().length);
  assert.deepEqual(ui().cncHiddenParts, {}, 'nothing is left hidden, and no empty rows are left behind');
});

test('one cabinet’s own row still ticks only that cabinet', () => {
  const ids = threeCabinets();
  const mine = sheets().find((s) => s.unitId === ids.wardrobe);
  // Exactly what CncTree's per-unit button does, and it must stay local.
  ui().setCncParts(ids.wardrobe, mine.panels.map((p) => p.id), false);
  ui().setCncParts(ids.wardrobe, panelIdsForQuickSelect(mine.panels, 'shelves'), true);
  const touched = Object.keys(ui().cncHiddenParts);
  assert.deepEqual(touched, [ids.wardrobe], 'the per-cabinet row is still per-cabinet');
});

// ─── where the control lives, and what it is not allowed to have moved ─────

const TREE = readFileSync(new URL('../src/components/CncTree.jsx', import.meta.url), 'utf8');

test('the project-wide row is rendered OUTSIDE the per-cabinet loop', () => {
  const box = TREE.indexOf('data-cnc-quick-all="1"');
  const button = TREE.indexOf('data-cnc-quick-project={q.id}');
  const loop = TREE.indexOf('{sheets.map((sheet) => {');
  assert.ok(box > 0 && button > 0 && loop > 0, 'the three anchors exist');
  assert.ok(box < loop, 'the project-wide box is above the cabinet loop, not inside a branch');
  assert.ok(button < loop, 'so are its buttons — no caret has to be opened to reach them');
  // It sits beside the material export, in the same top-level column.
  assert.ok(box < TREE.indexOf('data-material-export="1"'), 'select the type, then choose the board');
  // …and it drives the store through the existing per-unit action.
  assert.match(TREE, /setCncParts\(row\.unitId, row\.all, false\);/);
  assert.match(TREE, /setCncParts\(row\.unitId, row\.ids, true\);/);
});

test('the per-cabinet row is untouched, and still inside the branch', () => {
  const loop = TREE.indexOf('{sheets.map((sheet) => {');
  const perUnit = TREE.indexOf('data-cnc-quick={q.id}');
  assert.ok(perUnit > loop, 'the per-cabinet quick-select row is still in the per-cabinet branch');
  assert.match(TREE, /const wanted = new Set\(panelIdsForQuickSelect\(parts, q\.id\)\);/);
  assert.match(TREE, /setCncParts\(unit\.id, parts\.map\(\(p\) => p\.id\), false\);/);
  assert.match(TREE, /setCncParts\(unit\.id, \[\.\.\.wanted\], true\);/);
  // Both rows draw from ONE list, so they cannot come to mean different things.
  assert.equal(TREE.split('QUICK_SELECTS.map((q) => (').length - 1, 2);
});

// ─── "Ale export poprzez materiał zostaw jak jest" ─────────────────────────

test('EXPORT BY MATERIAL — not one character of it moved', () => {
  for (const line of [
    '      <div className="border border-shell-600 rounded p-2 space-y-1.5" data-material-export="1">',
    '        <span className="text-[11px] uppercase tracking-wide text-ink-400">Export by material</span>',
    '          data-export-material="1"',
    '          value={materialKey}',
    '          onChange={(e) => setMaterial(e.target.value)}',
    '          data-download-material="1"',
    '          disabled={!entries.length}',
    '          onClick={() => downloadMaterial(false)}',
    "          Download DXF — {materialKey === 'all' ? 'all materials' : (sections.find((s) => s.key === materialKey)?.label || 'material')}",
  ]) {
    assert.ok(TREE.includes(line), `the material export lost: ${line.trim()}`);
  }
  // Its handler, its memo and its state, exactly as they were.
  assert.match(TREE, /const \[material, setMaterial\] = useState\('all'\);/);
  assert.match(TREE, /const sections = useMemo\(\n {4}\(\) => groupByMaterial\(entries, \{ design: storedDesign, profile, materials \}\),/);
  assert.match(TREE, /const materialKey = material === 'all' \|\| sections\.some\(\(s\) => s\.key === material\) \? material : 'all';/);
  assert.match(TREE, /const res = exportMaterialDxf\(entries, \{\n {8}key: materialKey, design: storedDesign, materials, profile, exportAnyway, project: projectName,\n {6}\}\);/);
  // One caller, one path — this turn added no second way to write that file.
  assert.equal(TREE.split('exportMaterialDxf').length - 1, 2, 'imported once, called once');
});

test('EXPORT BY MATERIAL — the export function itself is where it was', () => {
  const src = readFileSync(new URL('../src/lib/cncExport.js', import.meta.url), 'utf8');
  assert.ok(src.includes('export function exportMaterialDxf(entries, {'));
  assert.ok(src.includes("  key = 'all', design = null, materials = [], profile = getCabinetProfile(), exportAnyway = false,"));
  assert.ok(src.includes('  const filename = materialDxfFileName(section.label, { project });'));
  // F9 is a SELECTION. It writes no file of its own and needed no new export.
  assert.ok(!/projectQuickSelect/.test(src), 'nothing in the export path had to learn about it');
});
