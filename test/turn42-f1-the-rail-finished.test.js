// ─── TURN 42 (CLAUDE.md F1): THE RAIL, FINISHED ─────────────────────────────
//
// The rail has had four turns — T37-F2, T40-F6, T41-F2 and tonight — and until
// tonight it still added a shelf when it was asked not to. The owner,
// 19.08.2026, after the fourth broken rail: *"mamy w dupie stare rzeczy — to
// nie jest online, to jest w fazie budowania. Nie patrzymy na przeszłość w
// ogóle."*
//
// THE MODEL, AFTER THIS TURN — EXACTLY TWO KINDS, NO THIRD:
//
//   ALONE     a rod mounted to the carcass sides. Position from the item's own
//             `pos_mm` + datum. NO RAIL-PART, no shelf, no bracket board. The
//             side flange drilling stays.
//   ASSEMBLY  T37's: the FIX shelf with the rod beneath it. Untouched.
//
// THE LEGACY RULE, IN ONE SENTENCE: a stored rail item with no `mount` — or any
// value that is not SHELF — is read as ALONE. No migration table, no
// compatibility branch, no warning.
//
// ─── AND EVERY TEST HERE ASKS THE PANEL LIST ────────────────────────────────
//
// Iron rule 6, made permanent this turn: *"PROVE THE THING, NOT THE FIELD."*
// T41's own probe asserted the ITEM list (no shelf item — true) instead of the
// PANEL list (RAIL-PART present — the lie). It proved the field, not the thing.
// So nothing below is satisfied by a `mount` string: every claim is read off
// `result.panels`, `result.drills`, `assemblies.rail.y`, or the instance the
// scene is actually handed.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import {
  RAIL_MOUNT, clampRailAxis, hangerDropMm, isLegacyRail, railChosenAlone, railMountOf,
} from '../src/engine/railAssembly.js';
import { elementKind } from '../src/engine/elements.js';

const G = P.board.thickness;
const DROP = hangerDropMm(P);
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const wardrobe = (items, over = {}) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P), unit_num: '01', width: 900, height: 2150,
  items, sections: [{ items }], ...over,
}, P);

const railParts = (r) => r.panels.filter((p) => p.part === 'RAIL-PART').map((p) => p.id);
const kindOf = (r, kind) => r.drills.filter((d) => d.kind === kind);

// ═══ 1. AN ALONE RAIL CUTS NOTHING ═════════════════════════════════════════

test('F1 — an ALONE rail: NO RAIL-PART in the panel list, and the rod is at its pos_mm', () => {
  const r = wardrobe([{ id: 'h1', kind: 'hanger', mount: RAIL_MOUNT.ALONE, pos_mm: 1200 }]);
  // THE PANEL LIST. Not the item, not the mount string, not a count.
  assert.deepEqual(railParts(r), [], 'the shelf the owner refused is not cut');
  assert.ok(!r.panels.some((p) => p.meta?.locked && p.box?.y === 1200 + DROP), 'nor anything standing where it stood');

  // …and the rod is where the ITEM says: its own `pos_mm` over its own datum,
  // which with nothing below it is the carcass floor.
  assert.equal(r.assemblies.rail.support, G, 'the datum is the interior floor');
  assert.equal(r.assemblies.rail.y, G + 1200, 'pos_mm + datum, exactly the grammar a shelf uses');
  assert.equal(r.derived.rail_y, G + 1200);
  assert.equal(r.derived.rail_partition_y, undefined, 'and no partitioner height is published');
});

test('F1 — with `mount: SHELF` the shelf panel exists and the rod hangs `drop` below it', () => {
  const r = wardrobe([
    { id: 's1', kind: 'shelf', variant: 'fixed', pos_mm: 1500 },
    { id: 'h1', kind: 'hanger', mount: RAIL_MOUNT.SHELF, shelf_id: 's1' },
  ]);
  const shelf = r.panels.find((p) => p.part === 'SHELF' && p.meta?.itemId === 's1');
  assert.ok(shelf, 'the FIX shelf is cut, as T37 wrote');
  assert.equal(shelf.box.y, 1500);
  assert.equal(r.assemblies.rail.y, 1500 - DROP, 'and the rod hangs `drop` below it');
  assert.equal(r.assemblies.rail.mount, RAIL_MOUNT.SHELF);
  assert.deepEqual(railParts(r), [], 'still no RAIL-PART: the fix shelf IS the board above the rod');
});

test('F1 — a stored item with `mount: undefined` is IDENTICAL to ALONE, byte for byte', () => {
  const alone = wardrobe([{ id: 'h1', kind: 'hanger', mount: 'alone', pos_mm: 1200 }]);
  const silent = wardrobe([{ id: 'h1', kind: 'hanger', pos_mm: 1200 }]);
  // One sentence, zero layers: not "similar", not "migrated" — the same answer.
  assert.deepEqual(silent.assemblies.rail, alone.assemblies.rail);
  assert.deepEqual(silent.panels.map((p) => p.id), alone.panels.map((p) => p.id));
  assert.deepEqual(silent.drills.length, alone.drills.length);
  // …and so is anything else that is not SHELF. There is no third kind to be.
  for (const said of ['legacy', 'LEGACY', 'nonsense', '', 'shelf']) {
    const r = wardrobe([{ id: 'h1', kind: 'hanger', mount: said, pos_mm: 1200 }]);
    assert.equal(r.assemblies.rail.mount, RAIL_MOUNT.ALONE, `"${said}" is a rod on its own`);
    assert.deepEqual(railParts(r), []);
  }
});

// ═══ 2. NO COMBINATION OF RAIL INPUTS EVER EMITS RAIL-PART ═════════════════

test('F1 — the suite-level law: NO rail input, in any combination, emits RAIL-PART', () => {
  // CLAUDE.md, verbatim: *"a suite-level test asserts NO COMBINATION of rail
  // inputs ever emits a panel named RAIL-PART."* Every producer of a rail this
  // engine has: the params flag, an item that says nothing, one that says
  // alone, one that says shelf, a zoned one, and both together.
  const CASES = [
    ['params flag only', { rail: true, rail_offset: 1400 }, []],
    ['params flag, no offset', { rail: true }, []],
    ['item, silent', {}, [{ id: 'h1', kind: 'hanger', pos_mm: 900 }]],
    ['item, alone', {}, [{ id: 'h1', kind: 'hanger', mount: 'alone', pos_mm: 900 }]],
    ['item, alone, absurdly high', {}, [{ id: 'h1', kind: 'hanger', mount: 'alone', pos_mm: 99999 }]],
    ['item, alone, zero', {}, [{ id: 'h1', kind: 'hanger', mount: 'alone', pos_mm: 0 }]],
    ['item, shelf named', {}, [
      { id: 's1', kind: 'shelf', variant: 'fixed', pos_mm: 1500 },
      { id: 'h1', kind: 'hanger', mount: 'shelf', shelf_id: 's1' },
    ]],
    ['item, shelf named but GONE (orphan)', {}, [{ id: 'h1', kind: 'hanger', mount: 'shelf', shelf_id: 'nope' }]],
    ['a COLUMN rod, alone', { width: 1600 }, [
      { id: 'p1', kind: 'partition', x_mm: 800 },
      { id: 'h1', kind: 'hanger', zone: 0, pos_mm: 1200 },
      { id: 'h2', kind: 'hanger', mount: 'alone', zone: 1, pos_mm: 1400 },
    ]],
    ['a COLUMN rod riding its bay shelf', { width: 1600 }, [
      { id: 'p1', kind: 'partition', x_mm: 800 },
      { id: 's1', kind: 'shelf', variant: 'fixed', pos_mm: 1500, zone: 0 },
      { id: 'h1', kind: 'hanger', mount: 'shelf', shelf_id: 's1', zone: 0 },
    ]],
    ['unit-wide AND column, both alone', { width: 1600 }, [
      { id: 'p1', kind: 'partition', x_mm: 800 },
      { id: 'h0', kind: 'hanger', pos_mm: 1000 },
      { id: 'h1', kind: 'hanger', mount: 'alone', zone: 0, pos_mm: 1200 },
    ]],
    ['with drawers under it', { drawers: 2 }, [{ id: 'h1', kind: 'hanger', mount: 'alone', pos_mm: 600 }]],
    ['with shelves around it', { shelves: 2 }, [{ id: 'h1', kind: 'hanger', mount: 'alone', pos_mm: 1200 }]],
  ];
  for (const [label, over, items] of CASES) {
    const r = wardrobe(items, { rail: over.rail ?? true, ...over });
    assert.deepEqual(railParts(r), [], `${label}: emitted ${railParts(r).join(', ')}`);
    assert.equal(kindOf(r, 'rail_partition_screw').length, 0, `${label}: partitioner screws`);
  }
  // …and on EVERY kit that supports a rail, not only the wardrobe.
  for (const typeId of ['WARDROBE', 'LOW_CABINET', 'BUDTALL', 'PANTRY', 'CARGO', 'WARDROBE_TOP']) {
    const r = computeCabinet({ ...defaultParamsFor(typeId, P), unit_num: '01', rail: true }, P);
    assert.deepEqual(r.panels.filter((p) => p.part === 'RAIL-PART').map((p) => p.id), [], `${typeId}`);
  }
});

test('F1 — `grep RAIL-PART src/` returns only history comments', () => {
  // The other half of the same law, asked of the SOURCE rather than of an
  // answer: a line of code that can still write the name is a line that can
  // still cut the board.
  const FILES = [
    'src/engine/cabinet.js', 'src/engine/elements.js', 'src/engine/partRegistry.js',
    'src/engine/hardware3d.js', 'src/engine/joinery.js', 'src/engine/checks.js',
    'src/engine/cnc/groups.js', 'src/engine/cnc/layout.js', 'src/components/RightPanel.jsx',
    'src/3d/UnitView.jsx', 'src/3d/Hardware.jsx',
  ];
  const offenders = [];
  for (const file of FILES) {
    const lines = read(file).split('\n');
    lines.forEach((line, i) => {
      if (!line.includes('RAIL-PART')) return;
      // Comments are HISTORY and are allowed — a whole-line one, and the tail
      // of a line that also carries code.
      const code = line.replace(/^\s*(\/\/|\*|\/\*).*$/, '').replace(/\/\/.*$/, '');
      if (!code.includes('RAIL-PART')) return;
      // What may still NAME it in code is a set or a test of board names that
      // decides how a board is laid, grouped or EXCLUDED. None of them emits a
      // panel, and none is on iron rule 3's list, so none is deleted.
      // A `case` with no body falls through to the neighbour it shares an
      // answer with; an `||` in a display predicate asks whether a board is
      // there. Both are inert, both are dead now, and neither is on the list.
      const inert = /SHELF_BOARD_PARTS|!== 'RAIL-PART'|\|\| p\.part === 'RAIL-PART'|^\s*case 'RAIL-PART':\s*$|'PARTITION', 'RAIL-PART'|'RAIL-PART', 'FIXED'/;
      if (inert.test(code) && !/panels\.push|part: 'RAIL-PART'/.test(code)) return;
      offenders.push(`${file}:${i + 1}  ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, [], `code that still writes RAIL-PART:\n${offenders.join('\n')}`);
  // The one that matters most, stated on its own: nothing PUSHES that panel.
  assert.ok(!/part: 'RAIL-PART'/.test(read('src/engine/cabinet.js')), 'no panel is built with that part name');
  assert.ok(!/id: `Z\$\{k \+ 1\}-RAIL-PART`/.test(read('src/engine/cabinet.js')), 'nor its column twin');
});

// ═══ 3. THE SIDE FLANGE STAYS ══════════════════════════════════════════════

test('F1 — the rod still hangs on something: one bracket screw per side, at the axis', () => {
  // CLAUDE.md keeps this by name: *"The side flange drilling from the kit's
  // rail block applies — the rod has to hang on something, and it hangs on the
  // sides."*
  const r = wardrobe([{ id: 'h1', kind: 'hanger', mount: 'alone', pos_mm: 1200 }]);
  const brackets = kindOf(r, 'rail_bracket');
  assert.equal(brackets.length, 2);
  assert.deepEqual([...new Set(brackets.map((d) => d.panel))].sort(), ['BUL', 'BUR']);
  for (const b of brackets) assert.equal(b.y, r.assemblies.rail.y);
  assert.equal(r.drillSummary.rail_bracket_y, r.assemblies.rail.y, 'and it is published');
  assert.equal(r.drillSummary.rail_partition_screw_y, undefined, 'the partitioner rows are not');
  // The kit agrees, which is iron rule 4: `drawWardrobeRailHolesBUL/BUR` stay,
  // `drawWardrobeRailPartHolesBUL/BUR/BACK` are deleted.
  const lisp = read('reference/lisp/KIT_WARDROBE_FULL.lsp');
  assert.match(lisp, /\(defun drawWardrobeRailHolesBUL/);
  assert.match(lisp, /\(defun drawWardrobeRailHolesBUR/);
  assert.doesNotMatch(lisp, /\(defun drawWardrobeRailPartHoles/);
  assert.doesNotMatch(lisp, /,RAIL-PART,/, 'and the cut-list CSV row is gone');
  assert.doesNotMatch(lisp, /\(setq wysRAILPART/, 'and so is the board it measured');
  assert.doesNotMatch(lisp, /\(drawRect "OUTLINE" curX cncY \(\+ curX wysRAILPART\)/, 'and its cut line');
});

// ═══ 4. THE CLAMP ══════════════════════════════════════════════════════════

test('F1 — the rod is CLAMPED inside the carcass, as a shelf would be', () => {
  const r = wardrobe([{ id: 'h1', kind: 'hanger', mount: 'alone', pos_mm: 99999 }]);
  const rod = r.assemblies.rail;
  const radius = P.hardware.rail.diameter / 2;
  assert.equal(rod.y, 2150 - G - P.wardrobe.rail.topClearance - radius,
    'the ROD takes the top clearance now — there is no board to take it for him');
  assert.equal(rod.fits, false, 'and it SAYS it did not fit, rather than pretending');
  assert.ok(r.warnings.some((w) => w.code === 'RAIL_TOO_HIGH'));
  assert.ok(rod.wanted > rod.y, 'the number he typed is published beside the number he got');

  // The arithmetic on its own, so a regression names itself.
  assert.deepEqual(clampRailAxis({
    axis: 1400, floor: 18, ceiling: 2132, clearance: 50, radius: 15,
  }), { axis: 1400, lowered: false, raised: false });
  assert.deepEqual(clampRailAxis({
    axis: 9000, floor: 18, ceiling: 2132, clearance: 50, radius: 15,
  }), { axis: 2067, lowered: true, raised: false });
  assert.deepEqual(clampRailAxis({
    axis: -5, floor: 18, ceiling: 2132, clearance: 50, radius: 15,
  }), { axis: 33, lowered: false, raised: true });
});

// ═══ 5. TWO KINDS, TWO WINDOWS ═════════════════════════════════════════════

test('F1 — the fingerprint carries `mount`, so a reader never has to guess', () => {
  const alone = wardrobe([{ id: 'h1', kind: 'hanger', mount: 'alone', pos_mm: 1200 }]);
  assert.equal(alone.assemblies.rail.mount, RAIL_MOUNT.ALONE);
  assert.equal(alone.assemblies.rail.itemId, 'h1');
  assert.ok(!('shelfItemId' in alone.assemblies.rail), 'and names no shelf (iron rule 2)');

  const assembly = wardrobe([
    { id: 's1', kind: 'shelf', variant: 'fixed', pos_mm: 1500 },
    { id: 'h1', kind: 'hanger', mount: 'shelf', shelf_id: 's1' },
  ]);
  assert.equal(assembly.assemblies.rail.mount, RAIL_MOUNT.SHELF);
  assert.equal(assembly.assemblies.rail.shelfItemId, 's1');

  // A COLUMN rod says the same two things, because it is the same law.
  const zoned = wardrobe([
    { id: 'p1', kind: 'partition', x_mm: 800 },
    { id: 'h1', kind: 'hanger', mount: 'alone', zone: 0, pos_mm: 1200 },
  ], { width: 1600 });
  assert.equal(zoned.assemblies.columnRails[0].mount, RAIL_MOUNT.ALONE);
  assert.equal(zoned.assemblies.columnRails[0].itemId, 'h1');
});

test('F1 — the SCENE gets an address for both kinds, and routes them apart', () => {
  const alone = wardrobe([{ id: 'h1', kind: 'hanger', mount: 'alone', pos_mm: 1200 }]);
  const rod = hardwareInstances(alone, P).rails[0];
  assert.equal(rod.panelId, 'h1', 'the ITEM is the address — there is no board');
  assert.equal(rod.mount, RAIL_MOUNT.ALONE);
  assert.equal(rod.y, alone.assemblies.rail.y, 'and it is drawn where the engine put it');

  const assembly = wardrobe([
    { id: 's1', kind: 'shelf', variant: 'fixed', pos_mm: 1500 },
    { id: 'h1', kind: 'hanger', mount: 'shelf', shelf_id: 's1' },
  ]);
  const rides = hardwareInstances(assembly, P).rails[0];
  const board = assembly.panels.find((p) => p.id === rides.panelId);
  assert.equal(board.part, 'SHELF', 'an assembly still names the fix shelf it rides');
  assert.equal(elementKind(board), 'shelf');

  // The routing, in the two files that do it.
  const hw = read('src/3d/Hardware.jsx');
  assert.match(hw, /const alone = rail\.mount === 'alone';/);
  assert.match(hw, /const to = alone \? onEditRail : onEdit;/);
  assert.match(read('src/3d/Scene.jsx'), /onEditRail=\{\(railItemId, at\) => openModal\('rail', \{/);
  assert.match(read('src/lib/modalLayer.js'), /rail: \{ about: 'object', label: 'Hanging rail' \}/);
});

test('F1 — DRAG: the ALONE rod is dragged and an ASSEMBLY’s is not', () => {
  const hw = read('src/3d/Hardware.jsx');
  assert.match(hw, /const grab = alone && onDragRail && rail\.itemId/, 'only an alone rod takes a grab');
  assert.match(hw, /onPointerDown=\{grab \|\| undefined\}/);
  // The view converts the pointer's world Y into the item's own offset, and the
  // store snaps and writes it. One number, one writer.
  const view = read('src/3d/UnitView.jsx');
  assert.match(view, /const startRailDrag = useCallback\(/);
  assert.match(view, /onMoveRail\(itemId, axisMm - support\)/);
  const store = read('src/stores/projectStore.js');
  assert.match(store, /moveRail: \(unitId, itemId, offsetMm\) => \{/);
  assert.match(store, /if \(railMountOf\(item\) === RAIL_MOUNT\.SHELF\) return null;/);
  assert.match(store, /get\(\)\.updateItem\(unitId, itemId, \{ pos_mm: pos \}\)/);
});

test('F1 — the drag PROBE, as arithmetic: +100 mm on pos_mm is +100 mm on the rod', () => {
  // CLAUDE.md's own named test. Read off the DRAWN rod (the scene instance),
  // not off the item.
  const at = (mm) => hardwareInstances(
    wardrobe([{ id: 'h1', kind: 'hanger', mount: 'alone', pos_mm: mm }]), P,
  ).rails[0].y;
  assert.equal(at(1200) + 100, at(1300));
  assert.equal(at(900) + 100, at(1000));
  assert.equal(at(1200) - at(900), 300);
});

// ═══ 6. THE LAW ITSELF ═════════════════════════════════════════════════════

test('F1 — two kinds, no third, and no migration code anywhere', () => {
  assert.deepEqual(Object.keys(RAIL_MOUNT).sort(), ['ALONE', 'SHELF']);
  assert.equal(railMountOf({ mount: 'shelf', shelf_id: 's1' }), RAIL_MOUNT.SHELF);
  for (const item of [null, {}, { mount: 'alone' }, { mount: 'legacy' }, { mount: 'shelf' }, { mount: 42 }]) {
    assert.equal(railMountOf(item), RAIL_MOUNT.ALONE, JSON.stringify(item));
  }
  // The one difference that is about a PERSON and not about geometry survives.
  assert.equal(railChosenAlone({ mount: 'alone' }), true);
  assert.equal(railChosenAlone({ kind: 'hanger' }), false);
  assert.equal(isLegacyRail({ mount: 'shelf', shelf_id: 's1' }), false);

  // No migration table, no compatibility branch: the whole rule is one return.
  const law = read('src/engine/railAssembly.js')
    .split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.doesNotMatch(law, /LEGACY:/, 'the third kind is gone from the enum');
  assert.doesNotMatch(law, /RAIL_MOUNT\.LEGACY/, 'and nothing reads it');
  assert.doesNotMatch(law, /migrat/i, 'and no code migrates anything');
  // The whole rule really is ONE return.
  const fn = law.slice(law.indexOf('export function railMountOf'));
  assert.equal((fn.slice(0, fn.indexOf('\n}')).match(/return/g) || []).length, 1);
});
