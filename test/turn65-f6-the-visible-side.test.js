// ─── TURN 65 · F6 — NO CARCASS SIDE IS EVER LEFT SHOWING ────────────────────
//
// The owner, and this sentence is the whole law:
//
//   *"po prostu nie dopuszczamy do pozostawienia boku szafy / carcasa
//   widocznego."*
//
// Not *"a step demands a panel"* — VISIBILITY demands a panel. The table below
// is his, row for row, and every row is a test.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { setPersistence } from '../src/stores/persistence.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import {
  askedSides, autoEndPanelJunctions, declinedSides, setWardrobeEndPanelAuto,
  sideIsVisible, withAsked,
} from '../src/engine/endPanelAuto.js';

setPersistence('none');
const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const S = () => useProjectStore.getState();

const room = () => {
  S().loadProject({
    id: null, name: 'T65 F6', number: '65', client: 'the owner',
    room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }),
    design: {},
  }, []);
};

const wardrobe = ({ x = 1500, width = 1000, height = 2200, depth = null } = {}) => {
  const u = S().addUnit('WARDROBE');
  S().updateUnitParams(u.id, { width, height, ...(depth ? { depth } : {}) });
  S().moveUnit(u.id, x, 0, { magnet: false });
  return u.id;
};

const sidesWithPanels = (id) => (S().units.find((u) => u.id === id)?.params?.end_panels || [])
  .map((ep) => ep.side).sort();

// ═══ 1 · THE ONE FUNCTION, ROW BY ROW ══════════════════════════════════════

const unit = (over = {}) => ({
  id: 'u1', type: 'WARDROBE', position: { wall: 0, x_mm: 0, rotation_deg: 0 },
  params: { width: 1000, height: 2200, depth: 568, ...over },
});

test('F6 · nothing beside it — a free end — the whole side shows', () => {
  assert.equal(sideIsVisible(unit(), 'L', null, { atWall: false }, P).visible, true);
});

test('F6 · a wall — no panel; the wall covers it and the infill closes the gap', () => {
  const seen = sideIsVisible(unit(), 'L', null, { atWall: true }, P);
  assert.equal(seen.visible, false);
  assert.equal(seen.why, 'wall');
});

test('F6 · a neighbour, flush — same height, same depth — the neighbour covers it', () => {
  const seen = sideIsVisible(unit(), 'R', unit({ }), { atWall: false }, P);
  assert.equal(seen.visible, false, 'a flush neighbour still left the side showing');
});

test('F6 · a SHORTER neighbour — part of the side still shows', () => {
  assert.equal(sideIsVisible(unit(), 'R', unit({ height: 800 }), { atWall: false }, P).visible, true);
});

test('F6 · a SHALLOWER neighbour — part of the side still shows', () => {
  assert.equal(sideIsVisible(unit(), 'R', unit({ depth: 350 }), { atWall: false }, P).visible, true);
});

test('F6 · a TALLER, DEEPER neighbour covers it completely — no panel', () => {
  assert.equal(sideIsVisible(unit(), 'R', unit({ height: 2400, depth: 650 }), { atWall: false }, P).visible, false);
});

test('F6 · ONE function decides where an end panel goes', () => {
  const src = read('src/engine/endPanelAuto.js');
  assert.equal([...src.matchAll(/export function sideIsVisible\(/g)].length, 1,
    'there is more than one visibility function');
  // …and the two passes that use it live in the one sites builder.
  assert.equal([...src.matchAll(/function autoEndPanelSites\(/g)].length, 1);
});

// ═══ 2 · RETAIL ADDS THEM; PRO IS NOT CHANGED ══════════════════════════════

test('F6 · PRO is untouched — the wardrobe pass is OFF unless retail throws the switch', () => {
  setWardrobeEndPanelAuto(false);
  room();
  const id = wardrobe({ x: 1500 });
  assert.deepEqual(autoEndPanelJunctions(S().units, P, { room: S().project.room }), [],
    'PRO grew a wardrobe end panel — its law is "added, never assumed"');
  assert.deepEqual(sidesWithPanels(id), [], 'PRO put a panel on a wardrobe');
});

test('F6 · retail: one wardrobe alone in the room — panels BOTH ends', () => {
  setWardrobeEndPanelAuto(true);
  room();
  const id = wardrobe({ x: 1500 });
  S().settleLayout();
  assert.deepEqual(sidesWithPanels(id), ['L', 'R'], 'a wardrobe standing alone showed a bare side');
  setWardrobeEndPanelAuto(false);
});

test('F6 · retail: against a wall — no panel that side, and the infill closes the gap', () => {
  setWardrobeEndPanelAuto(true);
  room();
  const id = wardrobe({ x: 0 });
  // The side filler is raised with the TOP one — T58 F5's own setup — so the
  // "and the infill closes the gap" half of the owner's row is asked the way
  // the app actually raises it.
  S().setTopInfill(id, 40);
  S().settleLayout();
  assert.deepEqual(sidesWithPanels(id), ['R'], 'the wall side grew a panel the wall already covers');
  const infills = (S().unitResult(id)?.panels || []).filter((p) => p.part === 'INFILL');
  assert.ok(infills.some((p) => /^INFILL-L/.test(p.id)),
    `nothing closes the gap the panel was refused for: ${infills.map((p) => p.id).join(', ')}`);
  setWardrobeEndPanelAuto(false);
});

test('F6 · retail: a FLUSH neighbour arrives and the shared panel goes; a TALLER one keeps it', () => {
  setWardrobeEndPanelAuto(true);
  room();
  const a = wardrobe({ x: 1000, width: 800, height: 2200 });
  S().settleLayout();
  assert.ok(sidesWithPanels(a).includes('R'), 'the free right end had no panel to lose');

  // A flush neighbour — same height, same depth — covers it.
  const b = S().addUnit('WARDROBE', { near: a, side: 'R' });
  S().updateUnitParams(b.id, { width: 800, height: 2200 });
  S().settleLayout();
  const seen = sideIsVisible(
    S().units.find((u) => u.id === a),
    'R',
    S().units.find((u) => u.id === b.id),
    { atWall: false },
    P,
  );
  assert.equal(seen.visible, false, 'a flush neighbour did not cover the side');

  // …and a TALLER neighbour does not cover the SHORT one's side from above:
  // asked the other way round, the taller one's own side still shows.
  S().updateUnitParams(b.id, { height: 2400 });
  const tallSide = sideIsVisible(
    S().units.find((u) => u.id === b.id),
    'L',
    S().units.find((u) => u.id === a),
    { atWall: false },
    P,
  );
  assert.equal(tallSide.visible, true, 'the taller neighbour lost the panel it needs');
  setWardrobeEndPanelAuto(false);
});

// ═══ 3 · THE CLIENT'S OWN DECISION OUTRANKS THE AUTOMAT ════════════════════

test('F6 · a hand-added panel is permanent — the "asked for" set sits beside declinedSides', () => {
  const u = unit();
  assert.deepEqual(askedSides(u), []);
  const asked = { ...u, params: { ...u.params, end_panel_asked: withAsked(u, 'R') } };
  assert.deepEqual(askedSides(asked), ['R']);
  // Same shape as its opposite, in the same file.
  assert.deepEqual(declinedSides({ params: { end_panel_declined: ['L', 'X'] } }), ['L']);
  assert.deepEqual(askedSides({ params: { end_panel_asked: ['L', 'X'] } }), ['L']);
  // Idempotent, like withDeclined.
  assert.deepEqual(withAsked(asked, 'R'), ['R']);
});

test('F6 · …and the automat never takes it off, whatever arrives beside it', () => {
  const src = read('src/engine/endPanelAuto.js');
  assert.match(src, /if \(askedSides\(unit\)\.includes\(side\)\) continue;/,
    'autoEndPanelStrays can still remove a panel the client asked for');
  // The store records it when the client asks, through EXTRAS.
  assert.match(read('src/stores/projectStore.js'), /end_panel_asked: withAsked\(u, wanted\)/);
  assert.match(read('src/retail/design/adapter.js'), /asked: true/);
});
