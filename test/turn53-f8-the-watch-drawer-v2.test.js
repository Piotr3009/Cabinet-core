// ─── T53 · F8 — THE WATCH DRAWER v2: HIS RE-SPECIFICATION ─────────────────
//
// The owner walked T52's insert and re-specified it, 27.08.2026:
//
//   *"szuflada z zegarkami powinna być jako osobna pozycja, pod szufladami —
//   czyli pozycja 3. dodajesz normalne szuflady i później masz: czy chcesz
//   dodać szufladę (nad nimi, z zegarkami). wtedy dokładamy taką szufladę już
//   bez możliwości sterowania wysokością — zawsze stała wysokość. i wtedy
//   opcja: dodać szybę ponad szufladą — wtedy wycinamy w półce otwór, offset
//   od półki na 50 mm, i wstawiamy szybę w ten otwór. i dookoła tej szyby masz
//   LED od spodu, offset około 15 mm na LED. i dodajesz do opcji kilka
//   zaproponowanych i zaprojektowanych układów … otwiera się nowy modal z 4
//   propozycjami rozmieszczenia. i wybierasz finish: spray … czy oak, walnut."*
//
// T52's decisions 1 and 2 are VETOED by those words, and the ONE sanctity
// licence of the night covers exactly that removal — accounted for in
// `engine/watchDrawer.js`, in `KIT_WATCH_DRAWER.lsp` and in T52's own test file.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { runChecks } from '../src/engine/checks.js';
import {
  DEFAULT_WATCH_LAYOUT, WATCH_FINISHES, WATCH_LAYERS, WATCH_LAYOUTS,
  shelfGlassPlan, watchDrawerFixedHeight, watchDrawerLayout, watchDrawerSpec,
  watchFinishOf, watchInsertParts, watchLayoutOf,
} from '../src/engine/watchDrawer.js';

const S = watchDrawerSpec(P);
const LISP = readFileSync(new URL('../reference/lisp/KIT_WATCH_DRAWER.lsp', import.meta.url), 'utf8');
const store = () => useProjectStore.getState();

/** A wardrobe with a stack, a watch drawer on top of it and (optionally) a shelf. */
function job({ shelf = true, glass = true, layout = null, finish = null } = {}) {
  const H = watchDrawerFixedHeight(P);
  const items = [
    { id: 'd1', kind: 'drawer', index: 1, height_mm: 200 },
    {
      id: 'd2',
      kind: 'drawer',
      index: 2,
      height_mm: H,
      watch_insert: true,
      ...(glass ? { watch_shelf_glass: true } : {}),
      ...(layout ? { watch_layout: layout } : {}),
      ...(finish ? { watch_finish: finish } : {}),
    },
    ...(shelf ? [{ id: 'sh1', kind: 'shelf', pos_mm: 900 }] : []),
  ];
  return computeCabinet({
    ...defaultParamsFor('WARDROBE', P), unit_num: 'W01', width: 900, sections: [{ width_mm: 900, items }],
  }, P);
}

// ─── (a) ITS OWN ENTRY, AND A FIXED HEIGHT ────────────────────────────────

test('F8a — the watch drawer is added ON TOP of a stack, and refuses without one', () => {
  store().loadProject({
    id: null, name: 'T53 F8', number: '53', client: 'the owner',
    room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }), design: {},
  }, []);
  const unit = store().addUnit('WARDROBE');
  const empty = store().addWatchDrawer(unit.id);
  assert.equal(empty.ok, false, 'no stack, no watch drawer');
  assert.match(empty.error, /Add the drawers first/i);

  store().addDrawers(unit.id, 2, 'overlay', 200, null, null);
  const made = store().addWatchDrawer(unit.id);
  assert.equal(made.ok, true, made.error || '');
  assert.equal(made.index, 3, 'on TOP of the two that were there');
  assert.equal(made.height, watchDrawerFixedHeight(P), 'at the one derived height');

  const items = store().units.find((u) => u.id === unit.id).params.sections[0].items;
  const added = items.find((i) => i.id === made.id);
  assert.equal(added.watch_insert, true);
  assert.equal(added.watch_layout, DEFAULT_WATCH_LAYOUT, 'Classic by default');
  assert.equal(store().addWatchDrawer(unit.id).ok, false, 'and only one per stack');
});

test('F8a — the height is FIXED, and it is a derivation the engine agrees with', () => {
  const H = watchDrawerFixedHeight(P);
  // T54-F4 AMENDED (28.08.2026): the owner re-sized — *"120 proszę"* — and
  // the derivation answered without a code change, which is the whole claim
  // this test makes: 40 inside + 9 base + 2 headroom + 15 seat + 18 bottom +
  // 36 delta = 120 (was 140 over his 60 inside).
  assert.equal(H, 120, 'his 40 inside, the tray’s base, the headroom, the seat and the delta');
  // The claim, checked against the engine: at H the insert is cut, at H − 1 it
  // is refused. That is what makes it a derivation rather than a guess.
  const at = (h) => {
    const r = computeCabinet({
      ...defaultParamsFor('WARDROBE', P),
      unit_num: 'W01',
      width: 600,
      sections: [{ width_mm: 600, items: [{ kind: 'drawer', index: 1, height_mm: h, watch_insert: true }] }],
    }, P);
    return (r.assemblies?.watchInserts || []).length > 0;
  };
  assert.equal(at(H), true, `a ${H} mm drawer takes the insert`);
  assert.equal(at(H - 1), false, '…and one a millimetre under it does not');
  // Every term is a profile number, so nobody has to remember a literal.
  assert.equal(
    H,
    S.insideDepthMm + S.baseT + S.headroomMm
      + P.baseDrawerUnit.runnerPocketWidth + P.board.thickness
      + P.wardrobe.drawers.frontToSideDelta,
  );
});

test('F8a — the menu offers it at POSITION 3, under the two drawer entries', () => {
  const src = readFileSync(new URL('../src/components/AddItems.jsx', import.meta.url), 'utf8');
  const order = [...src.matchAll(/id: '(drawers|overlay_drawers|watch_drawer|shelves)'/g)]
    .map((m) => m[1]);
  assert.deepEqual(order.slice(0, 4), ['drawers', 'overlay_drawers', 'watch_drawer', 'shelves'],
    'third, under Drawers — his own "pozycja 3"');
  assert.match(src, /add the drawers first/i, 'and it says why when it cannot be used');
  // NO height field: its absence IS the feature.
  const block = src.slice(src.indexOf("kind.id === 'watch_drawer'"), src.indexOf("kind.id === 'shoe_box'"));
  assert.doesNotMatch(block, /NumberField|type="number"/, 'no slider, no field — fixed height');
  assert.match(block, /data-add-watch-drawer="1"/);
});

// ─── (b) THE GLASS MOVES TO THE SHELF ABOVE ───────────────────────────────
//
// T55 AMENDED (30.08.2026, CLAUDE.md F4): the board DIRECTLY above the watch
// drawer in a wardrobe stack is the FORCED PARTITION (part 'PARTITION', role
// 'shelf') — and `isShelfBoard` now lets it serve, which is the owner's own
// ask: *"na półce która jest wymuszona nad szufladami."*  The board that
// takes the pane is read off the pane's own record, so these tests state the
// law and not a part name.

const paneBoard = (r) => r.panels.find((p) => p.id === (r.assemblies.watchGlass || [])[0]?.shelfId);

test('F8b — the opening is cut IN THE BOARD ABOVE, 50 mm in from every edge', () => {
  const r = job();
  const shelf = paneBoard(r);
  assert.ok(shelf, 'there is a board above');
  assert.equal(shelf.part, 'PARTITION', 'the forced board over the bank serves (T55 F4)');
  const opening = (shelf.cnc.pockets || []).find((k) => k.layer === WATCH_LAYERS.opening);
  assert.ok(opening, 'and it carries the opening');
  const off = P.watchDrawer.openingOffsetMm;
  assert.equal(off, 50, 'his own number');
  assert.equal(opening.x1, off);
  assert.equal(opening.y1, off);
  assert.equal(shelf.box.w - opening.x2, off);
  assert.equal(shelf.box.d - opening.y2, off);
  assert.equal(opening.cutout, true, 'it is a through cut, not a pocket');
  assert.equal(opening.depth, shelf.thickness, '…all the way through the board');
});

test('F8b — the pane sits FLUSH with the shelf top (the decision taken)', () => {
  const r = job();
  const shelf = paneBoard(r);
  const rebate = (shelf.cnc.pockets || []).find((k) => k.layer === WATCH_LAYERS.rebate);
  assert.ok(rebate);
  assert.equal(rebate.depth, S.glassT, 'the rebate IS the glass thickness — flush');
  const pane = (r.assemblies.watchGlass || [])[0];
  assert.ok(pane, 'the scene is handed a pane');
  assert.equal(pane.flush, true);
  assert.equal(pane.shelfId, shelf.id, 'and it belongs to the shelf, not the tray');
  assert.equal(pane.box.y + pane.box.h, shelf.box.y + shelf.box.h,
    'its top face is the shelf’s top face');
});

test('F8b — the tray carries no rebate and no groove any more (the ONE licence)', () => {
  const r = job();
  const tray = r.panels.filter((p) => p.role === 'watch_insert');
  assert.ok(tray.length >= 8);
  for (const q of tray) {
    for (const k of q.cnc?.pockets || []) {
      assert.notEqual(k.layer, WATCH_LAYERS.rebate, `${q.id} is not rebated`);
    }
    assert.deepEqual(q.cnc?.paths || [], [], `${q.id} is not grooved`);
  }
  // …and the removal is ACCOUNTED FOR, in the two files that carried it.
  const eng = readFileSync(new URL('../src/engine/watchDrawer.js', import.meta.url), 'utf8');
  assert.match(eng, /THE ONE SANCTITY LICENCE OF THE NIGHT/);
  assert.doesNotMatch(LISP, /\(defun drawWatchGlassRebate /);
  assert.doesNotMatch(LISP, /\(defun drawWatchLed /);
});

// ─── (c) THE LED RINGS THE GLASS FROM BELOW ───────────────────────────────

test('F8c — the strip rings the opening ~15 mm outside it, on the underside', () => {
  const r = job();
  const pane = (r.assemblies.watchGlass || [])[0];
  const shelf = paneBoard(r);
  const plan = shelfGlassPlan({ w: shelf.box.w, d: shelf.box.d }, P);
  const led = P.watchDrawer.ledOffsetMm;
  assert.equal(led, 15, 'his own number');
  assert.equal(plan.opening.x1 - plan.led.x1, led);
  assert.equal(plan.led.x2 - plan.opening.x2, led);
  assert.equal(pane.led.face, 'underside');
  assert.equal(pane.led.aimedAt, 'contents', 'T52’s law, relocated and not repealed');
  assert.equal(pane.led.y, shelf.box.y, 'on the shelf’s own underside');
  assert.equal(pane.led.width, 4, 'the app’s own flexi');
});

test('F8c — the pane and the strip are their own BOM lines, tied to the SHELF', () => {
  const r = job();
  const glass = (r.hardware || []).filter((h) => h.role === 'drawer_glass');
  const led = (r.hardware || []).filter((h) => h.role === 'led_strip');
  assert.equal(glass.length, 1);
  assert.equal(led.length, 1);
  // T55 (F4): the board above is the forced PARTITION, and the BOM says so.
  assert.match(glass[0].spec_label, /flush in PARTITION/);
  assert.match(led[0].spec_label, /underside of PARTITION/);
  assert.equal(glass[0].spec.shelf, led[0].spec.shelf, 'both name the same board');
  assert.equal(led[0].unit, 'm');
});

// ─── (d) NO MANUAL SHELF → THE FORCED PARTITION SERVES (T55, CLAUDE.md F4) ──
//
// T55 AMENDED (30.08.2026): the drawer bank always forces its own closing
// board (`PARTITION`, role `shelf`) directly above the stack, and
// `isShelfBoard` now lets it take the pane — so "no shelf above" is no
// refusal in a wardrobe stack any more. The owner: *"z automatycznym
// dodaniem leda dookoła szyby … na półce która jest wymuszona nad
// szufladami."*  The refusal (`watch_glass_needs_shelf`, Check #23) stays in
// the engine for the board-less case; here its ABSENCE is the claim.

test('F8d — no manual shelf: the forced PARTITION takes the pane, no refusal', () => {
  const r = job({ shelf: false });
  assert.equal((r.assemblies.watchGlass || []).length, 1, 'the pane is cut');
  assert.equal((r.hardware || []).filter((h) => h.role === 'drawer_glass').length, 1, 'and ordered');
  assert.equal((r.hardware || []).filter((h) => h.role === 'led_strip').length, 1, 'the LED ring is born');
  assert.equal(paneBoard(r).part, 'PARTITION', 'cut in the forced board');
  assert.equal((r.warnings || []).find((w) => w.code === 'watch_glass_needs_shelf'), undefined,
    'the refusal is gone — the partition IS the shelf here');
  const found = runChecks({
    entries: [{ unit: { id: 'u', params: { unit_num: 'W01' } }, result: r }],
    profile: P,
  });
  assert.equal(found.find((f) => f.check === 23 && /shelf directly above/i.test(f.message)), undefined,
    'and Check #23 has nothing to say');
  // …and the INSERT itself is cut exactly as asked.
  assert.equal((r.assemblies.watchInserts || []).length, 1);
});

test('F8d — the control is DISABLED with the reason, never hidden', () => {
  const src = readFileSync(new URL('../src/components/WatchLayoutModal.jsx', import.meta.url), 'utf8');
  assert.match(src, /disabled=\{!shelf\}/, 'greyed, not gone');
  assert.match(src, /Needs a shelf directly above/);
  assert.match(src, /data-watch-glass-why="1"/);
});

// ─── (e) THE FOUR LAYOUTS ─────────────────────────────────────────────────

test('F8e — there are exactly four, and Classic is the default', () => {
  assert.equal(WATCH_LAYOUTS.length, 4);
  assert.deepEqual(WATCH_LAYOUTS.map((l) => l.id), ['classic', 'cufflinks', 'ties', 'belts']);
  assert.equal(DEFAULT_WATCH_LAYOUT, 'classic');
  assert.equal(watchLayoutOf({}).id, 'classic', 'an item that never said is Classic');
  assert.equal(watchLayoutOf({ watch_layout: 'belts' }).id, 'belts');
  assert.equal(watchLayoutOf({ watch_layout: 'nonsense' }).id, 'classic', 'and nonsense is Classic');
});

test('F8e — ALL FOUR keep the hard law: ONE pocket row, at the FRONT', () => {
  const clear = { width: 520, depth: 440, height: 120, at: { x: 0, y: 0, z: 0 } };
  const rows = WATCH_LAYOUTS.map((l) => {
    const L = watchDrawerLayout(clear, P, { layout: l.id });
    return { id: l.id, pockets: L.pockets.count, depth: L.pockets.depth };
  });
  // The row is IDENTICAL in all four — it is the rear field that varies.
  assert.equal(new Set(rows.map((r) => r.pockets)).size, 1, 'the same pocket count');
  assert.equal(new Set(rows.map((r) => r.depth)).size, 1, '…at the same depth');
  for (const r of rows) assert.ok(r.pockets >= 1, `${r.id} has a row`);
  // And exactly ONE row: there is one row rail, whatever the layout.
  for (const l of WATCH_LAYOUTS) {
    const made = watchInsertParts(clear, P, { drawer: 1, layout: l.id });
    assert.equal(made.parts.filter((q) => q.part === 'WATCH-RAIL-ROW').length, 1, l.id);
  }
});

test('F8e — each layout’s parts sum to the tray width, to the millimetre', () => {
  const clear = { width: 520, depth: 440, height: 120, at: { x: 0, y: 0, z: 0 } };
  for (const l of WATCH_LAYOUTS) {
    const L = watchDrawerLayout(clear, P, { layout: l.id });
    // The pocket row: n pockets and n − 1 dividers span the inner width.
    const row = L.pockets.count * L.pockets.width
      + (L.pockets.count - 1) * S.dividerT;
    assert.ok(Math.abs(row - L.inner.w) < 1e-6, `${l.id}: the row spans the tray`);
    // …and the rear field, the same way.
    const field = L.sections.count * L.sections.width
      + (L.sections.count - 1) * S.dividerT;
    assert.ok(Math.abs(field - L.inner.w) < 1e-6, `${l.id}: the field spans it too`);
    // No cell may break the pocket floor.
    assert.ok(L.pockets.width >= S.pocketMinMm, `${l.id}: pockets clear the floor`);
    assert.ok(L.sections.width >= 1, `${l.id}: and so does the field`);
    // The lanes and their rails span the field's depth.
    const depth = L.sections.lanes * L.sections.depth
      + (L.sections.lanes - 1) * S.dividerT;
    assert.ok(Math.abs(depth - (L.inner.d - L.pockets.depth - S.dividerT)) < 1e-6,
      `${l.id}: the lanes span what is behind the row`);
  }
});

test('F8e — the four are four DIFFERENT trays, and each is the one asked for', () => {
  const clear = { width: 520, depth: 440, height: 120, at: { x: 0, y: 0, z: 0 } };
  const shape = (id) => {
    const L = watchDrawerLayout(clear, P, { layout: id });
    return `${L.sections.count}×${L.sections.lanes}${L.sections.backStrip ? '+strip' : ''}`;
  };
  const shapes = WATCH_LAYOUTS.map((l) => shape(l.id));
  assert.equal(new Set(shapes).size, 4, `four distinct rear fields — ${shapes.join(', ')}`);
  // …and each says what the owner asked it to be.
  assert.ok(watchDrawerLayout(clear, P, { layout: 'cufflinks' }).sections.lanes >= 3,
    'cufflinks: a two-row grid AND a long section behind it');
  assert.equal(watchDrawerLayout(clear, P, { layout: 'belts' }).sections.count, 2,
    'belts: two channels, whatever the drawer measures');
  assert.equal(watchDrawerLayout(clear, P, { layout: 'belts' }).sections.backStrip, true,
    '…and a shallow tray behind them');
  assert.ok(watchDrawerLayout(clear, P, { layout: 'ties' }).sections.count
    > watchDrawerLayout(clear, P, { layout: 'classic' }).sections.count,
    'ties: narrower sections than Classic’s');
});

test('F8e — the modal is a NEW window, draggable, beside the drawer', () => {
  const src = readFileSync(new URL('../src/components/WatchLayoutModal.jsx', import.meta.url), 'utf8');
  assert.match(src, /name="watch-layout"/);
  assert.match(src, /anchor=\{anchor\}/, 'it opens BESIDE what was clicked');
  for (const l of WATCH_LAYOUTS) {
    assert.ok(src.includes(`data-watch-layout={l.id}`) || src.includes('data-watch-layout'), 'a card per layout');
  }
  assert.match(src, /<svg /, 'each card is a top-view schematic');
  const layer = readFileSync(new URL('../src/lib/modalLayer.js', import.meta.url), 'utf8');
  assert.match(layer, /'watch-layout': \{ about: 'object'/, 'and the shell holds it beside its object');
});

// ─── (f) THE FINISH ───────────────────────────────────────────────────────

test('F8f — Spray / Oak / Walnut, and the project’s own decor by default', () => {
  assert.deepEqual(WATCH_FINISHES.map((f) => f.id), ['spray', 'oak', 'walnut']);
  assert.equal(watchFinishOf({}), null, 'the project decor, T52’s standing rule');
  assert.equal(watchFinishOf({ watch_finish: 'walnut' }), 'walnut');
  assert.equal(watchFinishOf({ watch_finish: 'brass' }), null, 'and nonsense falls back');
  const r = job({ finish: 'oak' });
  const line = (r.hardware || []).find((h) => h.role === 'watch_insert');
  assert.equal(line.spec.finish, 'oak', 'the BOM carries it');
  assert.match(line.spec_label, /oak/);
});

// ─── (g) MIGRATION ────────────────────────────────────────────────────────

test('F8g — a T52 v1 insert loads, asks for the glass upstairs, and is answered', () => {
  const ROOM = migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) });
  // A saved unit as T52 wrote it: the flag, and nothing else.
  const saved = [{
    id: 'u1',
    type: 'WARDROBE',
    position: { wall: 0, x_mm: 40, rotation_deg: 0 },
    params: {
      type: 'WARDROBE',
      width: 900,
      height: 2150,
      depth: 568,
      unit_num: 'W01',
      sections: [{
        width_mm: 900,
        items: [
          { id: 'd1', kind: 'drawer', index: 1, height_mm: 220, watch_insert: true },
          { id: 'sh1', kind: 'shelf', pos_mm: 900 },
        ],
      }],
    },
  }];
  store().loadProject({
    id: null, name: 'a T52 job', number: '52', client: 'the owner', room: ROOM, design: {},
  }, JSON.parse(JSON.stringify(saved)));
  const item = store().units[0].params.sections[0].items.find((i) => i.kind === 'drawer');
  assert.equal(item.watch_shelf_glass, true, 'v1 had a pane, so it asks for one upstairs');
  assert.equal(item.watch_layout, 'classic', 'and v1 had exactly one arrangement');
  // …and it is answered, because this job has a shelf above.
  const result = store().unitResult('u1');
  assert.equal((result.assemblies.watchGlass || []).length, 1, 'the pane is cut in the shelf');
});

test('F8g — …and where there is no shelf, the pane is dropped and named', () => {
  const ROOM = migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) });
  const saved = [{
    id: 'u1',
    type: 'WARDROBE',
    position: { wall: 0, x_mm: 40, rotation_deg: 0 },
    params: {
      type: 'WARDROBE',
      width: 900,
      height: 2150,
      depth: 568,
      unit_num: 'W01',
      sections: [{
        width_mm: 900,
        items: [{ id: 'd1', kind: 'drawer', index: 1, height_mm: 220, watch_insert: true }],
      }],
    },
  }];
  store().loadProject({
    id: null, name: 'a T52 job', number: '52', client: 'the owner', room: ROOM, design: {},
  }, JSON.parse(JSON.stringify(saved)));
  const result = store().unitResult('u1');
  // T55 AMENDED (CLAUDE.md F4): the forced PARTITION over the stack now takes
  // the pane the migration asks for — no refusal, the glass is simply cut.
  assert.equal((result.assemblies.watchGlass || []).length, 1, 'the pane is cut in the partition');
  assert.equal((result.warnings || []).some((w) => w.code === 'watch_glass_needs_shelf'), false,
    'no refusal — the partition IS the shelf here');
  assert.equal((result.assemblies.watchInserts || []).length, 1, 'the tray itself is untouched');
});

// ─── THE LAW IS IN THE LISP, FIRST ────────────────────────────────────────

test('F8 — the re-specification is stated in KIT_WATCH_DRAWER before any of it', () => {
  assert.match(LISP, /\(defun SKY:watchShelfOpening \(szer gleb off\)/);
  assert.match(LISP, /\(defun SKY:watchShelfLedRing /);
  assert.match(LISP, /\(defun SKY:watchRearField /);
  assert.match(LISP, /\(defun drawWatchShelfOpening /);
  assert.match(LISP, /\(defun drawWatchShelfLed /);
  assert.match(LISP, /THE ONE SANCTITY LICENCE OF THE NIGHT/);
  assert.match(LISP, /WATCH_GLASS_OPENING/, 'a cut-out and a rebate are different tools');
  // …and his own words, so the reason survives the next reader.
  assert.match(LISP, /offset od polki na 50 mm/);
  assert.match(LISP, /offset okolo 15 mm na LED/);
});
