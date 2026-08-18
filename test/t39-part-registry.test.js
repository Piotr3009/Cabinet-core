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

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPES } from '../src/engine/types.js';
import {
  PART_REGISTRY, ALL_PARTS, PART_GROUPS, ELEMENT_TO_PART_ID, HARDWARE_TO_PART_ID,
  LIGHTING_TO_PART_ID, partIdForElement, familyOf, edgePartFor, partsInGroup,
  VARIANT_ORDER,
} from '../src/engine/partRegistry.js';

// ─── The walk ───────────────────────────────────────────────────────────────

/** A full wardrobe interior: shelves fixed and loose, drawers, rails, partitions, two shoe boxes. */
const INTERIOR = [
  { id: 'sf0', kind: 'shelf', variant: 'fixed', pos_mm: 500 },
  { id: 's1', kind: 'shelf', pos_mm: 800 },
  { id: 's2', kind: 'shelf', pos_mm: 1100 },
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

test('every unit type lands in one of the five families', () => {
  for (const typeId of Object.keys(UNIT_TYPES)) {
    assert.ok(VARIANT_ORDER.includes(familyOf(typeId)), `${typeId} → ${familyOf(typeId)}`);
  }
  assert.equal(familyOf('WARDROBE'), 'wardrobe');
  assert.equal(familyOf('WARDROBE_TOP'), 'wardrobe');   // it hangs, but it is a wardrobe
  assert.equal(familyOf('BUD'), 'base');
  assert.equal(familyOf('WUD'), 'wall');
  assert.equal(familyOf('BUDTALL'), 'tall');
  assert.equal(familyOf('PANTRY'), 'pantry');           // named in the owner's own list
  assert.equal(familyOf('LOW_CABINET'), 'base');        // no height group, stands on the floor
  assert.equal(familyOf('NOT-A-TYPE'), 'base');
});
