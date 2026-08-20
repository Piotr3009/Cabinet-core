// ─── THE PART REGISTRY (turn 39, CLAUDE.md F1) ──────────────────────────────
//
// The rule this file exists to enforce, verbatim from CLAUDE.md:
//
//   *"Every engine part name that reaches the cut list MUST appear in
//   `ELEMENT_TO_PART_ID`. Anything missing is silently dropped from every BOM —
//   Production Core carries a comment about exactly that bug ('the casement
//   drop bug'). Ship a test that walks a full wardrobe + kitchen cabinet cut
//   list and asserts ZERO unmapped part names."*
//
// A missing mapping is not an exception anywhere in this system. It is a line
// that simply is not printed, on a document a workshop buys timber from. So the
// walk below is DELIBERATELY greedy: every unit type in `types.js`, each one
// driven through every feature the engine will emit a panel for — doors,
// plinth, shelves, rail, drawers, the wardrobe interior, a shoe box of each
// variant, partitions, split doors, end panels, top infill, side infill, a
// bottom mask, a cornice — and the assertion is on the SET of part names the
// engine produced, not on a list somebody typed.

import test from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPES } from '../src/engine/types.js';
import {
  PART_REGISTRY, ALL_PARTS, PART_GROUPS, ELEMENT_TO_PART_ID, HARDWARE_TO_PART_ID,
  LIGHTING_TO_PART_ID, INVOICE_TO_PART_ID, partIdForElement, cabinetFamilyOf, familyLabel, edgePartFor,
  partsInGroup, VARIANT_ORDER,
} from '../src/engine/partRegistry.js';

// ─── The walk ───────────────────────────────────────────────────────────────

/** A full wardrobe interior: shelves fixed and loose, drawers, rails, partitions, two shoe boxes. */
const INTERIOR = [
  { id: 'sf0', kind: 'shelf', variant: 'fixed', pos_mm: 500 },
  { id: 's1', kind: 'shelf', pos_mm: 800 },
  { id: 's2', kind: 'shelf', pos_mm: 1100 },
  // T33's shoe shelf, which is the ONLY way `SHOE-RAIL` ever reaches a cut
  // list. A walk without it passes while the stop rail drops silently — this
  // is the casement drop bug in miniature, and it is why the source scan
  // below exists as well as the walk.
  { id: 's3', kind: 'shelf', variant: 'shoe', pos_mm: 1400 },
  { id: 's4', kind: 'shelf', variant: 'pullout', pos_mm: 1600 },
  { id: 'd1', kind: 'drawer', index: 1, mount: 'overlay' },
  { id: 'd2', kind: 'drawer', index: 2, mount: 'overlay' },
  { id: 'h1', kind: 'hanger', pos_mm: 1800 },
  { id: 'h2', kind: 'hanger', mount: 'shelf', shelf_id: 'sf0', pos_mm: 1700 },
  { id: 'p1', kind: 'partition', x_mm: 300 },
  { id: 'p2', kind: 'partition', x_mm: 900 },
  { id: 'sb1', kind: 'shoe_box', variant: 'F', dividers: 1, pos_mm: 300 },
  { id: 'sb2', kind: 'shoe_box', variant: 'D', dividers: 1, pos_mm: 900 },
];

/** Every way this app knows of asking the engine for panels, per unit type. */
function paramSets(typeId) {
  const base = defaultParamsFor(typeId, P);
  const T = UNIT_TYPES[typeId];
  const sets = [
    ['bare', base],
    ['doors', { ...base, doors: true }],
    ['plinth', { ...base, doors: true, plinth: true }],
    ['shelves', { ...base, doors: true, shelves: 3 }],
    ['rail', { ...base, doors: true, rail: true }],
    ['drawers', { ...base, doors: true, drawers: 3 }],
    ['door-extend', { ...base, doors: true, door_extend: true }],
    ['interior', {
      ...base, doors: true, plinth: true, width: 1200, height: 2100, sections: [{ items: INTERIOR }],
    }],
    ['interior-wide', {
      ...base, doors: true, width: 1800, height: 2200, sections: [{ items: INTERIOR }],
    }],
    ['split-doors', {
      ...base, doors: true, height: 2400, width: 1000, split_top_mm: 600, sections: [{ items: INTERIOR }],
    }],
    ['wide', {
      ...base, doors: true, width: 2400, height: 2400, depth: 700, shelves: 4, plinth: true,
    }],
    ['narrow', { ...base, doors: true, width: 300, height: 400, depth: 300 }],
    ['mask', { ...base, doors: true, bottom_mask: true, mount_height: 1500 }],
    ['end-panels', {
      ...base, doors: true, plinth: true, end_panels: [{ side: 'L', top_mm: 200 }, { side: 'R' }],
    }],
    ['infill', {
      ...base, doors: true, top_infill_mm: 300, side_infill_left_mm: 120, side_infill_right_mm: 120,
    }],
    ['cornice', { ...base, doors: true, cornice: 90, top_infill_mm: 200 }],
    ['run-infill', {
      ...base,
      doors: true,
      run_top_infill: {
        role: 'owner', length: 2400, offset: 0, faceH: 300, thickness: 18,
        ends: { left: 'open', right: 'open' }, mitre: { left: 40, right: 40 },
      },
    }],
    ['everything', {
      ...base,
      doors: true,
      plinth: true,
      bottom_mask: true,
      cornice: 90,
      top_infill_mm: 250,
      side_infill_left_mm: 150,
      side_infill_right_mm: 150,
      end_panels: [{ side: 'L' }, { side: 'R' }],
      width: 1500,
      height: 2200,
      depth: 600,
      shelves: 3,
      drawers: 2,
      rail: true,
      mount_height: 1400,
      sections: [{ items: INTERIOR }],
    }],
  ];
  if (T.appliance === 'extractor') sets.push(['hood', { ...base, doors: true, hood_aperture_mm: 400 }]);
  if (T.id === 'L_SHAPE') sets.push(['arm', { ...base, doors: true, corner_arm_mm: 900, plinth: true }]);
  if (T.id === 'FRIDGE' || T.id === 'FRIDGE_US') {
    sets.push(['fridge', { ...base, doors: true, fridge_h: 1780, plinth: true }]);
  }
  return sets;
}

/** The whole walk, computed once and shared by every assertion below. */
const WALK = (() => {
  const partNames = new Map();      // engine part name → [typeId…]
  const hardwareRoles = new Map();  // engine hardware role → [typeId…]
  const failures = [];
  let runs = 0;
  for (const typeId of Object.keys(UNIT_TYPES)) {
    for (const [label, params] of paramSets(typeId)) {
      runs += 1;
      let result;
      try {
        result = computeCabinet({ ...params, unit_num: '01' }, P);
      } catch (err) {
        failures.push(`${typeId}/${label}: ${err.message}`);
        continue;
      }
      for (const panel of result.panels || []) {
        if (!partNames.has(panel.part)) partNames.set(panel.part, []);
        partNames.get(panel.part).push(typeId);
      }
      for (const hw of result.hardware || []) {
        if (!hardwareRoles.has(hw.role)) hardwareRoles.set(hw.role, []);
        hardwareRoles.get(hw.role).push(typeId);
      }
    }
  }
  return {
    partNames, hardwareRoles, failures, runs,
  };
})();

test('the walk itself ran — every unit type, every feature, no engine throw', () => {
  assert.equal(WALK.failures.length, 0, `computeCabinet threw:\n${WALK.failures.join('\n')}`);
  assert.ok(WALK.runs >= 400, `expected a greedy walk, got ${WALK.runs} runs`);
  // A walk that produced three part names has not walked anything.
  assert.ok(WALK.partNames.size >= 30, `only ${WALK.partNames.size} distinct part names — the walk is not walking`);
});

test('ZERO unmapped part names — the casement drop bug cannot happen here', () => {
  const unmapped = [...WALK.partNames.keys()]
    .filter((name) => !ELEMENT_TO_PART_ID[name])
    .sort();
  assert.deepEqual(
    unmapped, [],
    `these engine part names reach the cut list and would be SILENTLY DROPPED from every BOM:\n  ${unmapped.join('\n  ')}`,
  );
});

test('every mapped part id is a real registry id', () => {
  for (const [name, id] of Object.entries(ELEMENT_TO_PART_ID)) {
    assert.ok(PART_REGISTRY[id], `${name} → ${id}, which is not in PART_REGISTRY`);
  }
});

test('ZERO unmapped hardware roles', () => {
  const unmapped = [...WALK.hardwareRoles.keys()]
    .filter((role) => !HARDWARE_TO_PART_ID[role])
    .sort();
  assert.deepEqual(unmapped, [], `unmapped engine hardware roles: ${unmapped.join(', ')}`);
  for (const [role, id] of Object.entries(HARDWARE_TO_PART_ID)) {
    assert.ok(PART_REGISTRY[id], `hardware role ${role} → ${id}, which is not in PART_REGISTRY`);
  }
});

test('every lighting role maps to a real registry id', () => {
  for (const [role, id] of Object.entries(LIGHTING_TO_PART_ID)) {
    assert.ok(PART_REGISTRY[id], `lighting role ${role} → ${id}, which is not in PART_REGISTRY`);
  }
});

// ─── THE SOURCE SCAN ─────────────────────────────────────────────────────────
//
// The walk above is greedy, and greedy is not the same as complete: a part that
// needs a shelf whose variant is `shoe`, or a kit nobody thought to switch on,
// exists in the engine and never appears in the walk. So the walk is checked a
// SECOND way, against `cabinet.js` itself, which is the one and only file that
// writes `panel.part` in this app.
//
// Three producers, and there are no others:
//   `part: 'X'`             the literal, 28 of them
//   `board(id, 'X', …)`     the L-shape corner unit's own helper
//   `part: \`SHOEBOX-\${s}\`` the shoe box, whose suffixes come off one map

const ENGINE_SRC = readFileSync(new URL('../src/engine/cabinet.js', import.meta.url), 'utf8');

function partNamesInSource() {
  const names = new Set();
  for (const m of ENGINE_SRC.matchAll(/part:\s*'([^']+)'/g)) names.add(m[1]);
  for (const m of ENGINE_SRC.matchAll(/\bboard\(\s*`[^`]*`\s*,\s*'([^']+)'/g)) names.add(m[1]);
  // The shoe box suffix map, read where it is written rather than copied.
  const suffixBlock = ENGINE_SRC.match(/const suffix = \{([\s\S]*?)\}\[piece\.role\]/);
  if (suffixBlock) {
    // Two characters minimum: the map's `side` row is a ternary on
    // `piece.side === 'L'`, and 'L' / 'R' there are the QUESTION, not an answer.
    // Every real suffix — SL SR BK BF BT DV FR BATTEN — is two or more.
    for (const m of suffixBlock[1].matchAll(/'([A-Z0-9]{2,})'/g)) names.add(`SHOEBOX-${m[1]}`);
  }
  return names;
}

test('the source scan finds the whole vocabulary — 36 names, not the 35 a walk reaches', () => {
  // T42-F1: 37 → 36. `RAIL-PART` is not a part name any more — the rail's
  // partitioner is not cut, in the engine or in KIT_WARDROBE_FULL.lsp — and its
  // registry row went with it. One name left the vocabulary; the scan's own
  // three canaries below say the regexes did not drift.
  const names = partNamesInSource();
  assert.ok(names.size >= 36, `the scan found only ${names.size} part names — its regexes have drifted from cabinet.js`);
  // Three canaries: one plain literal, one board() helper name, one shoe box
  // suffix. If any of the three stops being found the scan is broken, not the
  // registry, and this test says which.
  assert.ok(names.has('BUL'), 'the `part:` literal scan is broken');
  assert.ok(names.has('SIDE'), 'the board() helper scan is broken');
  assert.ok(names.has('SHOEBOX-BATTEN'), 'the shoe box suffix scan is broken');
  assert.ok(names.has('SHOE-RAIL'), 'the stop rail is gone from the engine — or the scan is');
});

test('ZERO unmapped part names IN THE SOURCE — the stricter half of the same rule', () => {
  const unmapped = [...partNamesInSource()].filter((name) => !ELEMENT_TO_PART_ID[name]).sort();
  assert.deepEqual(
    unmapped, [],
    `cabinet.js can emit these part names and the registry does not know them:\n  ${unmapped.join('\n  ')}`,
  );
});

// ─── THE SAME SCAN, FOR HARDWARE ────────────────────────────────────────────
//
// The walk reaches 12 of the engine's hardware roles. The engine writes 18. A
// mirror, a cornice, a trouser pull-out and a display drawer's glass all need a
// kit or an option the walk never switches on — and an unmapped hardware role
// is the identical bug to an unmapped part name: a line nobody ever sees.
//
// Three producers here too:
//   `hw('role', …)`                        the literal
//   `hw(\`wardrobe_kit_\${kit.kind}\`, …)`  × WARDROBE_KIT_KINDS
//   `type.hardwareKit.role`                in types.js — a NEW unit type that
//                                          declares a bought mechanism MINTS a
//                                          role, so types.js is scanned as well
const TYPES_SRC = readFileSync(new URL('../src/engine/types.js', import.meta.url), 'utf8');

function hardwareRolesInSource() {
  const roles = new Set();
  for (const m of ENGINE_SRC.matchAll(/\bhw\(\s*'([a-z_]+)'/g)) roles.add(m[1]);
  const kinds = ENGINE_SRC.match(/WARDROBE_KIT_KINDS\s*=\s*\[([^\]]*)\]/);
  if (kinds) {
    for (const m of kinds[1].matchAll(/'([a-z_]+)'/g)) roles.add(`wardrobe_kit_${m[1]}`);
  }
  for (const m of TYPES_SRC.matchAll(/hardwareKit:\s*\{\s*role:\s*'([a-z_]+)'/g)) roles.add(m[1]);
  return roles;
}

test('the hardware scan finds the whole vocabulary — 18 roles, not the 12 a walk reaches', () => {
  const roles = hardwareRolesInSource();
  assert.ok(roles.size >= 18, `the scan found only ${roles.size} hardware roles — its regexes have drifted`);
  assert.ok(roles.has('hinges'), 'the hw() literal scan is broken');
  assert.ok(roles.has('wardrobe_kit_pulldown_rail'), 'the WARDROBE_KIT_KINDS scan is broken');
  assert.ok(roles.has('bin_pullout'), 'the types.js hardwareKit scan is broken');
});

test('ZERO unmapped hardware roles IN THE SOURCE', () => {
  const unmapped = [...hardwareRolesInSource()].filter((r) => !HARDWARE_TO_PART_ID[r]).sort();
  assert.deepEqual(
    unmapped, [],
    `computeCabinet() can emit these hardware roles and the registry does not know them:\n  ${unmapped.join('\n  ')}`,
  );
});

test('the registry maps no hardware role the engine cannot emit', () => {
  const roles = hardwareRolesInSource();
  const orphans = Object.keys(HARDWARE_TO_PART_ID).filter((r) => !roles.has(r)).sort();
  assert.deepEqual(orphans, [], `mapped hardware roles nothing emits: ${orphans.join(', ')}`);
});

test('the invoice’s synthesised lines have registry rows too', () => {
  for (const [role, id] of Object.entries(INVOICE_TO_PART_ID)) {
    assert.ok(PART_REGISTRY[id], `invoice role ${role} → ${id}, which is not in PART_REGISTRY`);
  }
});

test('the registry maps nothing the engine cannot emit', () => {
  const names = partNamesInSource();
  const orphans = Object.keys(ELEMENT_TO_PART_ID).filter((n) => !names.has(n)).sort();
  assert.deepEqual(orphans, [], `mapped part names no engine line writes: ${orphans.join(', ')}`);
});

test('the walk reaches all but the parts that need a switch nobody flips', () => {
  const walked = new Set(WALK.partNames.keys());
  const missed = [...partNamesInSource()].filter((n) => !walked.has(n)).sort();
  // Nothing is asserted absent — this records WHAT the walk cannot reach, so a
  // future turn that adds a kit sees the gap rather than inheriting it.
  assert.ok(missed.length <= 1, `the walk now misses ${missed.length} names: ${missed.join(', ')}`);
});

// ─── The owner's own collapse ───────────────────────────────────────────────

test('BUL and BUR are ONE assignable part — the owner’s question, answered', () => {
  assert.equal(ELEMENT_TO_PART_ID.BUL, 'carcase_side');
  assert.equal(ELEMENT_TO_PART_ID.BUR, 'carcase_side');
  assert.equal(ELEMENT_TO_PART_ID.BUL, ELEMENT_TO_PART_ID.BUR);
});

test('TOP and BOTTOM are one board; BACK and DRAWER-BOTTOM are not', () => {
  assert.equal(ELEMENT_TO_PART_ID.TOP, ELEMENT_TO_PART_ID.BOTTOM);
  // Separate, because the MATERIAL genuinely differs — 6 mm, not 18.
  assert.notEqual(ELEMENT_TO_PART_ID.BACK, ELEMENT_TO_PART_ID.BUL);
  assert.notEqual(ELEMENT_TO_PART_ID['DRAWER-BOTTOM'], ELEMENT_TO_PART_ID['DRAWER-SIDE']);
  // …and a front is never the carcass board.
  assert.notEqual(ELEMENT_TO_PART_ID.FRONT, ELEMENT_TO_PART_ID.BUL);
});

test('the three drawer-box boards collapse; the shoe box body collapses too', () => {
  assert.equal(ELEMENT_TO_PART_ID['DRAWER-SIDE'], 'drawer_box_side');
  assert.equal(ELEMENT_TO_PART_ID['DRAWER-BOX-FRONT'], 'drawer_box_side');
  assert.equal(ELEMENT_TO_PART_ID['DRAWER-BOX-BACK'], 'drawer_box_side');
  for (const p of ['SHOEBOX-BT', 'SHOEBOX-BK', 'SHOEBOX-SL', 'SHOEBOX-SR', 'SHOEBOX-BF', 'SHOEBOX-DV', 'SHOEBOX-BATTEN']) {
    assert.equal(ELEMENT_TO_PART_ID[p], 'shoe_box_carcase', p);
  }
  // …but the shoe box FRONT is a drawer front, because that is what it is cut from.
  assert.equal(ELEMENT_TO_PART_ID['SHOEBOX-FR'], 'drawer_front');
});

test('a top box’s carcase routes to its own row, and nobody else’s does', () => {
  assert.equal(partIdForElement('BUL', { typeId: 'WARDROBE_TOP' }), 'top_box_carcase');
  assert.equal(partIdForElement('TOP', { typeId: 'WARDROBE_TOP' }), 'top_box_carcase');
  assert.equal(partIdForElement('BACK', { typeId: 'WARDROBE_TOP' }), 'top_box_carcase');
  assert.equal(partIdForElement('BUL', { typeId: 'WARDROBE' }), 'carcase_side');
  assert.equal(partIdForElement('BUL', {}), 'carcase_side');
  // A door on a top box is still a door — only the CARCASE re-routes.
  assert.equal(partIdForElement('FRONT', { typeId: 'WARDROBE_TOP' }), 'door');
  assert.equal(partIdForElement('NOT-A-PART', { typeId: 'WARDROBE' }), null);
});

// ─── Registry hygiene ───────────────────────────────────────────────────────

test('no duplicate ids, and the flat list is the registry', () => {
  const ids = ALL_PARTS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate part id in ALL_PARTS');
  assert.equal(ALL_PARTS.length, Object.keys(PART_REGISTRY).length);
  for (const p of ALL_PARTS) assert.equal(PART_REGISTRY[p.id], p, `${p.id} is not its own registry entry`);
});

test('every part has an id, a name, a group, a unit and a material type', () => {
  const groups = new Set(PART_GROUPS.map((g) => g.id));
  for (const p of ALL_PARTS) {
    assert.ok(p.id && typeof p.id === 'string', 'missing id');
    assert.ok(p.name && typeof p.name === 'string', `${p.id}: missing name`);
    assert.ok(groups.has(p.group), `${p.id}: group "${p.group}" is not one of ${[...groups].join(', ')}`);
    assert.ok(p.unit && typeof p.unit === 'string', `${p.id}: missing unit`);
    assert.ok(p.materialType && typeof p.materialType === 'string', `${p.id}: missing materialType`);
  }
});

test('every group has at least one part, and the seven groups are the seven CLAUDE.md names', () => {
  assert.deepEqual(
    PART_GROUPS.map((g) => g.id),
    ['board', 'front', 'drawer_box', 'edging', 'hardware', 'lighting', 'consumable'],
  );
  for (const g of PART_GROUPS) {
    assert.ok(partsInGroup(g.id).length > 0, `group ${g.id} has no parts`);
  }
});

test('every board / front / drawer-box part has an edging line to pay for its banding', () => {
  for (const p of ALL_PARTS) {
    if (!['board', 'front', 'drawer_box'].includes(p.group)) continue;
    const edge = edgePartFor(p.id);
    assert.ok(edge, `${p.id} has no edging part — its banding metres would vanish`);
    assert.equal(PART_REGISTRY[edge].group, 'edging', `${p.id} → ${edge}, which is not an edging part`);
  }
});

test('the units are the units CLAUDE.md names', () => {
  const byGroup = (g) => partsInGroup(g).map((p) => p.unit);
  for (const u of byGroup('board')) assert.equal(u, 'm²');
  for (const u of byGroup('front')) assert.equal(u, 'm²');
  for (const u of byGroup('drawer_box')) assert.equal(u, 'm²');
  for (const u of byGroup('edging')) assert.equal(u, 'm');
  assert.equal(PART_REGISTRY.led_strip.unit, 'm');
  assert.equal(PART_REGISTRY.led_profile.unit, 'm');
  assert.equal(PART_REGISTRY.led_driver.unit, 'pcs');
  assert.equal(PART_REGISTRY.glue.unit, 'L');
});

// ─── The variant key: a cabinet family ──────────────────────────────────────

test('every family has a name a joiner would recognise', () => {
  assert.equal(familyLabel('wardrobe'), 'Wardrobe');
  assert.equal(familyLabel('pantry'), 'Pantry');
  assert.equal(familyLabel('nothing'), 'nothing');
  for (const f of VARIANT_ORDER) assert.ok(familyLabel(f).length > 0, f);
});

test('every unit type lands in one of the five families', () => {
  for (const typeId of Object.keys(UNIT_TYPES)) {
    assert.ok(VARIANT_ORDER.includes(cabinetFamilyOf(typeId)), `${typeId} → ${cabinetFamilyOf(typeId)}`);
  }
  assert.equal(cabinetFamilyOf('WARDROBE'), 'wardrobe');
  assert.equal(cabinetFamilyOf('WARDROBE_TOP'), 'wardrobe');   // it hangs, but it is a wardrobe
  assert.equal(cabinetFamilyOf('BUD'), 'base');
  assert.equal(cabinetFamilyOf('WUD'), 'wall');
  assert.equal(cabinetFamilyOf('BUDTALL'), 'tall');
  assert.equal(cabinetFamilyOf('PANTRY'), 'pantry');           // named in the owner's own list
  assert.equal(cabinetFamilyOf('LOW_CABINET'), 'base');        // no height group, stands on the floor
  assert.equal(cabinetFamilyOf('NOT-A-TYPE'), 'base');
});
