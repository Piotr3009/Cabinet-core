// ─── Turn 33, CLAUDE.md F6: drawers in a column BEHIND DOORS — the missing 30
//
// Owner, 15.08: drawers between a divider and the doors "nie wstawiają
// automatycznie 30 mm infila i nie odsuwa szuflady — patrz szafy bez
// dividera". The behind-door law lives where it always has — the DP panel
// DP.inset in from the hinged carcass side, its two fillers, the box riding
// the DP wall, the 155° hinge over the stack — and the COLUMN path now reads
// THAT source (`dpSideLaw`): one law, two readers, zero divergence, held
// edge-length by these tests.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { hingeSpecsFor } from '../src/engine/hinges.js';
import { loadHardwareCatalogues } from '../src/lib/hardwareCatalogue.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

// The catalogue of record, in hand — the 155° is ITS rule, never a literal.
loadHardwareCatalogues();

const store = () => useProjectStore.getState();
const DP = P.wardrobe.drawerPanel;
const DR = P.wardrobe.drawers;
const G = P.board.thickness;

function project() {
  store().loadProject({
    id: null,
    name: 't33-f6',
    room: migrateRoom({ height: 2600, corners: rectCorners(6000, 3000) }),
    design: { projectType: 'wardrobe' },
  }, []);
}

/** The doored wardrobe as it has always been: full-width stack, no divider. */
function noDivider(width = 1000) {
  project();
  const { id } = store().addUnit('WARDROBE');
  store().updateUnitParams(id, { width, doors: true });
  const res = store().addDrawers(id, 2, 'overlay', 200, null);
  assert.equal(res.ok, true, res.error || '');
  return store().unitResult(id);
}

/** The same wardrobe, divided — drawers in the LEFT column, doors in front. */
function dividedLeftColumn(width = 1000) {
  project();
  const { id } = store().addUnit('WARDROBE');
  store().updateUnitParams(id, { width, doors: true, drawers: 0 });
  store().addPartition(id);
  store().setPartitionFront(id, 0);         // the guard's own reset
  const res = store().addDrawers(id, 2, 'overlay', 200, 0);
  assert.equal(res.ok, true, res.error || '');
  return { id, result: store().unitResult(id) };
}

// ─── the law, measured edge to edge ─────────────────────────────────────────

test('the column box stands off the hinged carcass side EXACTLY as the no-divider box does', () => {
  const plain = noDivider();
  const { result } = dividedLeftColumn();

  const plainSL = plain.panels.find((p) => p.id === 'D1-SL');
  const colSL = result.panels.find((p) => p.id === 'Z1D1-SL');
  assert.ok(plainSL && colSL, 'both stacks cut their left sides');

  // The measure the owner pointed at: how far the box's left wall stands from
  // the carcass side. Same law, same number — the DP standoff.
  assert.equal(colSL.box.x, plainSL.box.x,
    'the column box rides the DP wall at the very x the full-width box has always ridden');

  // …and the depth setback ("nie odsuwa szuflady"): box front vs door plane.
  assert.equal(colSL.box.z + colSL.box.d, plainSL.box.z + plainSL.box.d,
    'the box front stands at the same setback behind the door plane');
});

test('the 30 mm infill is CUT for the column — the DP and its two fillers, zone-tagged', () => {
  const { result } = dividedLeftColumn();
  const dp = result.panels.find((p) => p.id === 'Z1-DP-L');
  assert.ok(dp, 'the DP panel is cut for the column');
  assert.equal(dp.box.x, G + DP.inset, 'DP.inset in from the side — the law’s own x');
  assert.equal(dp.meta.zone, 0);

  const fillers = result.panels.filter((p) => p.part === 'FILLER' && p.meta.zone === 0);
  assert.equal(fillers.length, 2, 'two fillers close the 30, as the full-width zone has always cut');
  assert.ok(fillers.every((f) => f.w === DP.fillerWidth), `the fillers are the ${DP.fillerWidth}`);
  assert.ok(fillers.every((f) => f.box.x === G), 'flush to the carcass side');
});

test('a column wall that is the PARTITION takes no standoff — the divider is the wall', () => {
  project();
  const { id } = store().addUnit('WARDROBE');
  store().updateUnitParams(id, { width: 1200, doors: true });   // a pair, both sides hinged
  store().addPartition(id);
  store().setPartitionFront(id, 0);
  assert.equal(store().addDrawers(id, 2, 'overlay', 200, 0).ok, true);
  assert.equal(store().addDrawers(id, 2, 'overlay', 200, 1).ok, true);
  const result = store().unitResult(id);

  // Each edge column carries the DP at ITS hinged carcass side — and neither
  // carries one at the partition: the divider is the runner's wall, full stop.
  assert.ok(result.panels.some((p) => p.id === 'Z1-DP-L'), 'left column: DP at the left side');
  assert.ok(result.panels.some((p) => p.id === 'Z2-DP-R'), 'right column: DP at the right side');
  assert.ok(!result.panels.some((p) => p.id === 'Z1-DP-R' || p.id === 'Z2-DP-L'),
    'no DP anywhere near the partition');

  // The right column's box hugs the partition side with only the box
  // clearance — no standoff on that wall.
  const partition = result.panels.find((p) => p.part === 'VPART' || /^VPART/.test(p.id));
  const rightSL = result.panels.find((p) => p.id === 'Z2D1-SL');
  assert.ok(partition && rightSL, 'the divider and the right stack stand');
  const partRight = partition.box.x + partition.box.w;
  assert.ok(Math.abs((rightSL.box.x - partRight) - P.wardrobe.drawers.boxWidthClearance / 2) < 0.51,
    'only the box clearance between the partition face and the box wall');
});

test('the 155° follows the column stack — BOM, modal contract and 3D specs alike', () => {
  const { id, result } = dividedLeftColumn();
  // derived publishes BOTH counts now (the field the modal read was never
  // written before this turn — the sweep's textbook fault).
  assert.equal(result.derived.drawers, 0);
  assert.equal(result.derived.column_drawers, 2);

  const hingeRow = result.hardware.find((h) => h.role === 'hinges');
  assert.ok(hingeRow, 'hinges are bought');
  assert.equal(hingeRow.spec.angle, 155,
    'a door over a COLUMN stack takes the wide swing the full-width stack always took');

  const unit = store().units.find((u) => u.id === id);
  const specs = hingeSpecsFor({ result, unit });
  const doorSpec = Object.values(specs)[0];
  assert.equal(doorSpec.angle, 155, 'the 3D model folds the same hinge the BOM buys');
});

test('the no-divider wardrobe and the bare engine do not move', () => {
  const plain = noDivider();
  assert.ok(plain.panels.some((p) => p.id === 'DP-L'), 'the full-width DP stands as ever');
  assert.ok(!plain.panels.some((p) => /^Z\d/.test(p.id)), 'no column pieces without columns');

  const bare = computeCabinet({
    type: 'WARDROBE', width: 1000, height: 2200, depth: 568, unit_num: '01', drawers: 2,
  }, P);
  assert.equal(bare.derived.drawers, 2, 'derived.drawers finally tells the truth');
  const dpx = bare.panels.find((p) => p.id === 'DP-L').box.x;
  assert.equal(dpx, G + DP.inset, 'the AutoLISP’s own DP x, untouched');
});
