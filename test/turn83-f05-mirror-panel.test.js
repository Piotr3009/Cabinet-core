/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F5 . THE RIGHT PANEL, THE LIBRARY, THE SHEETS (slice M3)
//
// CLAUDE.md T83 F5: *"Right panel (EXEMPT with the owner's words): section
// MIRROR CABINET: Bays 1 / 2 / 3; Door widths (one field a bay, the sum
// checked against the width with the stiles, refused in words when it does
// not add up); Stiles LED / timber / none and their width; Panels L / R / top
// / bottom on or off and Panel thickness; Mirror doors on / off; Mirror back
// on / off; Glass shelves per bay; LED under on / off; LED inside on / off;
// Bottom box on / off; Recess mm. Library rows in PRO's Kitchen and Wardrobe
// libraries under Bathroom"*; *"Sheets: the fronts sheet draws the three
// mirror doors and the two stiles (a new ink `LED_STILE`, warm yellow, one ink
// one layer), the panels round, the unit number; the section shows the
// recess, the bottom box and the LED; the plan the stiles flush with the
// doors."*
//
// The owner, 25.10.2026 (22:41): *"daj wszystkie mozliwosci z panelami, z
// ledami, bez, szerokosc ustawianych drzwiczek etc"*; (14:14) *"panele led
// trzeba bedzie zamontowac na rowno z drzwiami, nie wcisniete"*; (14:09) *"w
// tym przypadku to reces ale tez w standardzie normalnie wiszaca"*.
//
// The kit itself is M1's (F1, F2: KIT_MIRROR.lsp and its mirror); this file
// holds what F5 adds: the row that places it, the one store action the panel
// answers through (each answer checked and refused in words), the panel
// section that calls it, and the kit on the sheets (the projector's mirror
// rows and the LED_STILE ink). Tested the way the client clicks: the store
// the panel calls, the sheets the Drawings window builds.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, getCategory, getUnitType, UNIT_TYPES } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, getCabinetProfile } from '../src/engine/profile.js';
import {
  KITCHEN_LIBRARY, WARDROBE_LIBRARY, filterLibraryByProject, flattenLibrary, resolveEntry,
} from '../src/engine/library.js';
import { DRAWING_LAYERS, LAYER_ORDER } from '../src/engine/drawings/layers.js';
import { frontDetail } from '../src/engine/drawings/frontElevation.js';
import {
  mirrorLedBoxes, mirrorRecessLines, projectRun,
} from '../src/engine/drawings/projector.js';
import { wallGroups } from '../src/engine/drawings/wallElevation.js';
import { worktopsOnWall } from '../src/engine/drawings/setElevation.js';
import { drawingContext } from '../src/engine/drawings/setSheet.js';
import { buildPlan } from '../src/engine/drawings/setPlan.js';
import { buildStation, sectionStations } from '../src/engine/drawings/setSection.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { lightingSpec } from '../src/engine/ledStrips.js';
import { rectCorners } from '../src/engine/room.js';
import { resolveUnitDesign } from '../src/engine/design.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import {
  flushHistory, unwatchProjectHistory, useHistoryStore, watchProjectHistory,
} from '../src/stores/historyStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const M = (id) => S().unitResult(id).derived.mirror;
const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;
const familyOf = (id) => getUnitType(id)?.family || null;

// The profile's numbers (M1's `profile.mirror`): read, never typed here.
const D = P.mirror.defaults;

/**
 * The client's bathroom: a VANITY3 on wall A and the mirror cabinet over it,
 * centred, at its own 1250 (the architect's elevation 34). Returns the ids.
 */
function bathroom({ recess = 0 } = {}) {
  useUiStore.getState().clearSelection?.();
  S().newProject('Holland Park bathroom');
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const vanity = S().addUnit('VANITY3', { wall: 0, x: 1000 }).id;
  const W = Number(U(vanity).params.width);
  const mc = S().addUnit('MIRROR_CABINET', { wall: 0, x: 1000 + W / 2 - D.width / 2 }).id;
  if (recess) assert.equal(S().setMirrorCabinet(mc, { recess_mm: recess }).ok, true);
  return { vanity, mc };
}

/** What the Drawings window hands the sheets (scripts/t81-kitchen.mjs setArgs, read off the store). */
function sheetArgs() {
  const st = S();
  return {
    entries: st.allResults(),
    project: st.project,
    room: st.project.room,
    worktops: st.worktopsOf(),
    design: st.project.design,
    frontTypeOf: (u) => resolveUnitDesign(u, st.project.design).frontType,
    profile: getCabinetProfile(),
    date: '26/10/2026',
  };
}

const ofUnit = (entities, id, part) => entities.filter((e) => e.src === `${id}:${part}` && e.layer !== 'MASK');
const span = (es) => {
  const xs = es.flatMap((e) => (e.kind === 'rect' ? [e.x, e.x + e.w] : [e.x1, e.x2]));
  const ys = es.flatMap((e) => (e.kind === 'rect' ? [e.y, e.y + e.h] : [e.y1, e.y2]));
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};

// ═══ 1 · THE LIBRARY ═════════════════════════════════════════════════════════

test('F5 · the Bathroom group: "Mirror cabinet" beside the vanity, in the Kitchen library and in the wardrobe library', () => {
  for (const list of [KITCHEN_LIBRARY, WARDROBE_LIBRARY]) {
    const group = list.find((e) => e.id === 'bathroom');
    assert.ok(group, 'no Bathroom group');
    assert.deepEqual(group.items.map((i) => i.typeId), ['VANITY2', 'VANITY3', 'VANITY4', 'MIRROR_CABINET'], 'beside the vanity');
    const row = group.items.find((i) => i.typeId === 'MIRROR_CABINET');
    assert.equal(resolveEntry(row, P).enabled, true, 'the row places the kit');
    // One name for a kit: the row leaves `label` out, so it reads the kit's own.
    assert.equal(row.label, undefined);
    assert.equal(getUnitType('MIRROR_CABINET').label, 'Mirror cabinet');
    assert.doesNotMatch(`${row.hint} ${group.hint}`, /[\u2013\u2014]/);
  }
  // One group, one source: the same data in both lists, so the two cannot drift.
  assert.equal(KITCHEN_LIBRARY.find((e) => e.id === 'bathroom'), WARDROBE_LIBRARY.find((e) => e.id === 'bathroom'));
  for (const cat of ['kitchen', 'wardrobe']) assert.ok(getCategory(cat).types.includes('MIRROR_CABINET'), `not in ${cat}`);
});

test('F5 · a bathroom kit is every job\'s: the mirror cabinet shows in a kitchen job and a wardrobe job; the library places MC01 at 1250', () => {
  assert.equal(familyOf('MIRROR_CABINET'), 'bathroom');
  const ids = (r) => flattenLibrary(r.entries).filter((e) => e.kind === 'type').map((e) => e.typeId);
  for (const [list, job] of [[KITCHEN_LIBRARY, 'kitchen'], [WARDROBE_LIBRARY, 'wardrobe'], [KITCHEN_LIBRARY, 'wardrobe']]) {
    assert.ok(ids(filterLibraryByProject(list, job, familyOf)).includes('MIRROR_CABINET'), `${job} job lost it`);
  }
  useUiStore.getState().clearSelection?.();
  S().newProject('Wardrobe job', { design: { projectType: 'wardrobe' } });
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const id = S().addUnit('MIRROR_CABINET').id;
  assert.equal(U(id).type, 'MIRROR_CABINET');
  assert.equal(U(id).params.unit_num, 'MC01');
  assert.equal(U(id).params.mount_height, D.mountHeight, 'at its own height, the drawing\'s');
});

// ═══ 2 · THE STORE'S ONE ACTION ══════════════════════════════════════════════

test('F5 · Bays 1 / 2 / 3: the kit\'s own widths for the new count; 4 refused in words; any other kit refused', () => {
  const { vanity, mc } = bathroom();
  assert.deepEqual(M(mc).doorWidths, D.doorWidths, 'born with the drawing\'s 330 / 480 / 330');
  assert.equal(S().setMirrorCabinet(mc, { door_widths: [300, 510, 330] }).ok, true);
  for (const n of [2, 1, 3]) {
    const res = S().setMirrorCabinet(mc, { bays: n });
    assert.equal(res.ok, true, res.said);
    const m = M(mc);
    assert.equal(m.bays, n);
    assert.equal(m.doors.length, n);
    assert.equal(m.dividers.length, n - 1);
    assert.equal(U(mc).params.mirror.door_widths, null, 'a typed width is a bay\'s: the new count starts from the kit\'s own');
    assert.ok(near(m.doorWidths.reduce((t, w) => t + w, 0) + m.stiles.reduce((t, s) => t + s.w, 0), m.carcass.w), `${n} bays fill the carcass`);
  }
  assert.deepEqual(M(mc).doorWidths, D.doorWidths, 'three bays: the drawing\'s widths again');
  const no = S().setMirrorCabinet(mc, { bays: 4 });
  assert.equal(no.ok, false);
  assert.match(no.said, /^MC01: a mirror cabinet has 1, 2 or 3 bays\.$/);
  const other = S().setMirrorCabinet(vanity, { bays: 2 });
  assert.equal(other.ok, false);
  assert.match(other.said, /only a mirror cabinet/);
  assert.equal(U(vanity).params.mirror, undefined, 'the vanity carries no mirror key');
});

test('F5 · Door widths: one a bay; the sum with the stiles must make the carcass, else refused in the kit\'s words and nothing moves', () => {
  const { mc } = bathroom();
  const before = JSON.stringify(U(mc).params);
  const short = S().setMirrorCabinet(mc, { door_widths: [300, 480, 330] });
  assert.equal(short.ok, false);
  assert.equal(short.said, 'MC01: the door widths 300 + 480 + 330 and the stiles 75 + 75 make 1260, the carcass is 1290 wide: '
    + 'type door widths that make 1290 with the stiles. The doors stand as they were.');
  assert.equal(JSON.stringify(U(mc).params), before, 'refused: the unit untouched');
  const count = S().setMirrorCabinet(mc, { door_widths: [645, 495] });
  assert.equal(count.ok, false);
  assert.match(count.said, /2 door widths for 3 bays: type one width a bay\./);
  assert.equal(S().setMirrorCabinet(mc, { door_widths: [300, 'wide', 330] }).ok, false);
  // Widths that add up: cut as typed (the doors 3 less, the half gaps), the stiles where the widths put them.
  const ok = S().setMirrorCabinet(mc, { door_widths: [300, 510, 330] });
  assert.equal(ok.ok, true, ok.said);
  const m = M(mc);
  assert.deepEqual(m.doorWidths, [300, 510, 330]);
  assert.deepEqual(m.doors.map((d) => d.w), [300 - P.doors.gap, 510 - P.doors.gap, 330 - P.doors.gap]);
  assert.deepEqual(m.stiles.map((s) => s.x), [m.carcass.x + 300, m.carcass.x + 300 + 75 + 510]);
  // "Kit's widths": null hands the doors back.
  assert.equal(S().setMirrorCabinet(mc, { door_widths: null }).ok, true);
  assert.deepEqual(M(mc).doorWidths, D.doorWidths);
});

test('F5 · Stiles LED / timber / none and their width: the doors meet over the dividers with none; typed widths that no longer add up go back to the kit\'s, said', () => {
  const { mc } = bathroom();
  const part = (id) => S().unitResult(mc).panels.filter((p) => p.part === id);
  assert.deepEqual(part('MIRROR-STILE').map((p) => p.role), ['led_stile', 'led_stile']);
  assert.equal(S().setMirrorCabinet(mc, { stile: 'timber' }).ok, true);
  assert.deepEqual(part('MIRROR-STILE').map((p) => p.role), ['mirror_stile', 'mirror_stile']);
  assert.equal(S().setMirrorCabinet(mc, { stile: 'none' }).ok, true);
  assert.equal(part('MIRROR-STILE').length, 0, 'no stiles');
  assert.equal(M(mc).stile, 'none');
  assert.ok(near(M(mc).doorWidths.reduce((t, w) => t + w, 0), M(mc).carcass.w), 'the doors take the whole carcass');
  assert.match(S().setMirrorCabinet(mc, { stile: 'glass' }).said, /^MC01: a stile is LED, timber or none\.$/);
  assert.equal(S().setMirrorCabinet(mc, { stile: 'led', door_widths: [300, 510, 330] }).ok, true);
  const res = S().setMirrorCabinet(mc, { stile_width_mm: 100 });
  assert.equal(res.ok, true);
  assert.equal(res.said, 'MC01: the door widths typed (300 + 510 + 330) no longer make the carcass with the stiles: the doors are back to the kit\'s own widths.');
  assert.equal(U(mc).params.mirror.door_widths, null);
  assert.deepEqual(M(mc).stiles.map((s) => s.w), [100, 100]);
  assert.ok(near(M(mc).doorWidths.reduce((t, w) => t + w, 0) + 200, M(mc).carcass.w));
  assert.equal(S().setMirrorCabinet(mc, { stile_width_mm: 0 }).ok, false);
  const wide = S().setMirrorCabinet(mc, { stile_width_mm: 700 });
  assert.equal(wide.ok, false, 'two stiles of 700 leave the doors no width');
  assert.match(wide.said, /^MC01: 3 doors and stiles of 1400 do not go into a carcass 1290 wide/);
  assert.deepEqual(M(mc).stiles.map((s) => s.w), [100, 100], 'refused: the stiles stand');
});

test('F5 · Panels L / R / top / bottom and their thickness: the carcass grows where one is off; the panels reach the mirror\'s face', () => {
  const { mc } = bathroom();
  const panels = () => S().unitResult(mc).panels.filter((p) => p.part === 'MIRROR-PANEL');
  assert.deepEqual(panels().map((p) => p.id), ['PANEL-L', 'PANEL-R', 'PANEL-TOP', 'PANEL-BOTTOM']);
  assert.ok(panels().every((p) => p.box.d === 215 + P.mirror.doorBoardMm + P.mirror.mirrorMm), 'to the mirror face, 237');
  assert.equal(S().setMirrorCabinet(mc, { panels: { bottom: false } }).ok, true);
  assert.deepEqual(panels().map((p) => p.id), ['PANEL-L', 'PANEL-R', 'PANEL-TOP']);
  assert.deepEqual(U(mc).params.mirror.panels, { L: true, R: true, top: true, bottom: false }, 'the others kept');
  assert.equal(S().setMirrorCabinet(mc, { panels: { L: false } }).ok, true);
  assert.equal(M(mc).carcass.w, D.width - D.panelT, 'the carcass takes the left panel\'s 30');
  assert.equal(S().setMirrorCabinet(mc, { panel_t: 18 }).ok, true);
  assert.ok(panels().every((p) => p.thickness === 18));
  assert.equal(M(mc).carcass.w, D.width - 18);
  assert.match(S().setMirrorCabinet(mc, { panels: { back: true } }).said, /a panel round is L, R, top or bottom/);
  assert.match(S().setMirrorCabinet(mc, { panels: { L: 'yes' } }).said, /each on or off/);
  assert.equal(S().setMirrorCabinet(mc, { panel_t: -5 }).ok, false);
  assert.equal(S().setMirrorCabinet(mc, { panels: { L: false, R: false, top: false, bottom: false } }).ok, true);
  assert.equal(panels().length, 0, 'the bare carcass');
});

test('F5 · Mirror doors, Mirror back, LED under, LED inside, Bottom box: on and off, each read by the kit; a word that is not on or off refused', () => {
  const { mc } = bathroom();
  const doorD = () => S().unitResult(mc).panels.filter((p) => p.part === 'FRONT').map((p) => p.box.d);
  assert.deepEqual(doorD(), [22, 22, 22]);
  assert.equal(S().setMirrorCabinet(mc, { mirror_doors: false }).ok, true);
  assert.deepEqual(doorD(), [18, 18, 18], 'the board alone');
  assert.ok(S().unitResult(mc).panels.filter((p) => p.part === 'MIRROR-PANEL').every((p) => p.box.d === 233), 'the panels 233 deep');
  assert.equal(M(mc).mirrorArea.back_m2, 0);
  assert.equal(S().setMirrorCabinet(mc, { mirror_back: true }).ok, true);
  assert.equal(M(mc).mirrorBack, true);
  assert.ok(M(mc).mirrorArea.back_m2 > 0, 'the back\'s mirror is ordered');
  assert.equal(S().setMirrorCabinet(mc, { led_under: false, led_inside: false }).ok, true);
  assert.equal(M(mc).led.under, null);
  assert.equal(M(mc).led.inside, null);
  assert.equal(S().setMirrorCabinet(mc, { bottom_box: false }).ok, true);
  assert.equal(M(mc).bottomBox.on, false);
  assert.ok(!S().unitResult(mc).panels.some((p) => p.id === 'BOX-TOP' || p.id === 'BOX-FRONT'), 'no box');
  const no = S().setMirrorCabinet(mc, { led_under: 'yes' });
  assert.equal(no.ok, false);
  assert.equal(no.said, 'MC01: the LED under is on or off.');
});

test('F5 · Glass shelves per bay: the count a bay, 0 to clear them; the shelves placed by hand give way to it, said', () => {
  const { mc } = bathroom();
  const glass = () => S().unitResult(mc).panels.filter((p) => p.meta?.glassShelf);
  assert.equal(glass().length, 15, 'five a bay, three bays');
  assert.equal(S().setMirrorCabinet(mc, { shelves_per_bay: 3 }).ok, true);
  assert.equal(glass().length, 9);
  assert.equal(S().setMirrorCabinet(mc, { shelves_per_bay: 0 }).ok, true);
  assert.equal(glass().length, 0);
  for (const bad of [-1, 2.5, 'five']) assert.equal(S().setMirrorCabinet(mc, { shelves_per_bay: bad }).ok, false, String(bad));
  // A shelf placed by hand (KIT_MIRROR.lsp D14: the unit's shelf items win), then a count asked for.
  const sections = [{ width_mm: D.width, items: [{ id: 'g1', kind: 'shelf', pos_mm: 400 }] }];
  S().updateUnitParams(mc, { sections });
  const res = S().setMirrorCabinet(mc, { shelves_per_bay: 2 });
  assert.equal(res.ok, true);
  assert.match(res.said, /^MC01: the 1 glass shelves placed by hand give way to 2 a bay\.$/);
  assert.equal(U(mc).params.sections[0].items.filter((i) => i.kind === 'shelf').length, 0);
  assert.equal(glass().length, 6);
});

test('F5 · Recess mm: T79\'s key, typed; 0 on the wall; deeper than the cabinet refused in words', () => {
  const { mc } = bathroom();
  assert.equal(M(mc).recess.mm, 0);
  assert.equal(S().setMirrorCabinet(mc, { recess_mm: 155 }).ok, true);
  assert.equal(U(mc).params.recess_mm, 155);
  assert.equal(M(mc).recess.mm, 155);
  assert.deepEqual(M(mc).recess.wallOpening, { x: 0, y: 0, w: D.width, h: D.height, depth: 155 });
  S().refreshAutoParts?.();
  assert.equal(U(mc).params.recess_mm, 155, 'the room keeps a typed recess (settleRecesses skips the kit)');
  const deep = S().setMirrorCabinet(mc, { recess_mm: 300 });
  assert.equal(deep.ok, false);
  assert.equal(deep.said, 'MC01: a recess of 300 is deeper than the cabinet: type 0 to 215.');
  assert.equal(S().setMirrorCabinet(mc, { recess_mm: -10 }).ok, false);
  assert.equal(U(mc).params.recess_mm, 155);
  assert.equal(S().setMirrorCabinet(mc, { recess_mm: 0 }).ok, true);
  assert.equal(M(mc).recess.wallOpening, null, 'on the wall');
});

test('F5 · every answer is one Undo step, and it survives a save and a reload, cut for cut', () => {
  watchProjectHistory();
  try {
    const { mc } = bathroom();
    useHistoryStore.getState().clear();
    const cut0 = JSON.stringify(S().unitResult(mc).panels.map((p) => [p.id, p.w, p.h, p.box]));
    S().setMirrorCabinet(mc, { bays: 2, stile: 'timber', panel_t: 25, mirror_back: true, recess_mm: 155 });
    flushHistory();
    const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
    const cut1 = JSON.stringify(S().unitResult(mc).panels.map((p) => [p.id, p.w, p.h, p.box]));
    assert.notEqual(cut1, cut0);
    assert.equal(useHistoryStore.getState().undo(), true);
    assert.equal(JSON.stringify(S().unitResult(mc).panels.map((p) => [p.id, p.w, p.h, p.box])), cut0, 'one press undoes the answer');
    // The save: the plain params, read back by the kit as they were cut.
    S().loadProject(saved.project, saved.units);
    assert.deepEqual(U(mc).params.mirror, saved.units.find((u) => u.id === mc).params.mirror);
    assert.equal(JSON.stringify(S().unitResult(mc).panels.map((p) => [p.id, p.w, p.h, p.box])), cut1);
  } finally {
    unwatchProjectHistory();
  }
});

// ═══ 3 · THE RIGHT PANEL ═════════════════════════════════════════════════════

test('F5 · the MIRROR CABINET section: every row the owner asked for, each through setMirrorCabinet, its own figures read off the engine', () => {
  const src = read('src/components/RightPanel.jsx');
  assert.match(src, /\{type\.mirrorCabinet && \(\s*<MirrorCabinetSection/, 'the section is the mirror cabinet\'s alone');
  assert.match(src, /title="Mirror cabinet"/);
  assert.match(src, /mirror=\{result\?\.derived\?\.mirror \|\| null\}/, 'the figures are the engine\'s');
  for (const hook of ['data-mirror-bays', 'data-mirror-door-width', 'data-mirror-widths-sum', 'data-mirror-widths-own', 'data-mirror-said',
    'data-mirror-stile-kind', 'data-mirror-stile-width', 'data-mirror-panel', 'data-mirror-panel-t', 'data-mirror-flag',
    'data-mirror-shelves-per-bay', 'data-mirror-recess']) {
    assert.match(src, new RegExp(hook), `${hook} is not in the panel`);
  }
  assert.match(src, /\[1, 2, 3\]\.map\(\(n\) =>/);
  // CHAT FIX 26.10.2026 (D5a): one door typed is `door_width`, its lock set free `door_free`; the list whole is the test's road.
  for (const call of ['answer({ bays: n })', 'answer({ door_width: { bay: i, mm: v } })', 'answer({ door_free: i })', 'answer({ door_widths: null })', 'answer({ stile: k })',
    'answer({ stile_width_mm: v })', 'answer({ panels: { [k]: !on } })', 'answer({ panel_t: v })', 'answer({ [k]: v })',
    'answer({ shelves_per_bay: v })', 'answer({ recess_mm: v })']) {
    assert.ok(src.includes(call), `the panel does not call ${call}`);
  }
  assert.match(src, /const res = setMirrorCabinet\(unit\.id, patch\)/, 'one action');
  for (const k of ['mirror_doors', 'mirror_back', 'led_under', 'led_inside', 'bottom_box']) assert.match(src, new RegExp(`\\['${k}'`), `${k} has no row`);
  for (const w of ['\'Mirror doors\'', '\'Mirror back\'', '\'LED under\'', '\'LED inside\'', '\'Bottom box\'', 'Glass shelves per bay', '>Recess<', '>Stiles<', '>Panels<', '>Bays<']) {
    assert.ok(src.includes(w), `${w} is not said`);
  }
  // No number is typed by the panel: the answers are the person's, the figures the engine's.
  const body = src.slice(src.indexOf('function MirrorCabinetSection'));
  assert.doesNotMatch(body, /answer\(\{ [a-z_]+: \d/);
  assert.doesNotMatch(body, /330|480|4000 K|6 mm/);
  assert.doesNotMatch(body, /[\u2013\u2014]/);
});

// ═══ 4 · THE SHEETS ══════════════════════════════════════════════════════════

test('F5 · LED_STILE: a new ink, warm yellow, a layer of its own in the pen order, by the fronts', () => {
  const L = DRAWING_LAYERS.LED_STILE;
  assert.ok(L, 'no LED_STILE layer');
  assert.equal(L.colour, '#D9A21B');
  assert.equal(L.pen, 'VISIBLE');
  const others = Object.entries(DRAWING_LAYERS).filter(([k]) => k !== 'LED_STILE');
  assert.ok(others.every(([, x]) => x.colour.toLowerCase() !== L.colour.toLowerCase()), 'its colour is no other layer\'s');
  assert.ok(others.every(([, x]) => x.aci !== L.aci), 'its ACI is no other layer\'s');
  assert.deepEqual([...LAYER_ORDER].sort(), Object.keys(DRAWING_LAYERS).sort());
  assert.equal(LAYER_ORDER.indexOf('LED_STILE'), LAYER_ORDER.indexOf('DOORS') + 1);
});

test('F5 · the fronts sheet: three mirror doors, two LED stiles flush between them on LED_STILE, the panels round, MC01', () => {
  const { mc } = bathroom();
  const a = sheetArgs();
  const group = wallGroups(a.entries, P).find((g) => g.members.some((m) => m.unit.id === mc));
  const m = group.members.find((x) => x.unit.id === mc);
  const run = projectRun(group, { view: 'front', mode: 'fronts', profile: P, frontTypeOf: a.frontTypeOf });
  const es = run.entities;
  for (const k of [1, 2, 3]) {
    const door = ofUnit(es, mc, `MC01-F${k}`).filter((e) => e.layer === 'DOORS');
    assert.equal(door.length, 1, `door ${k} is one leaf`);
    assert.equal(door[0].kind, 'rect');
    // A mirror door's face is its mirror: no front style drawn on it.
    assert.equal(ofUnit(es, mc, `MC01-F${k}`).filter((e) => e.meta === 'front-detail').length, 0);
  }
  const d1 = ofUnit(es, mc, 'MC01-F1').find((e) => e.layer === 'DOORS');
  const d2 = ofUnit(es, mc, 'MC01-F2').find((e) => e.layer === 'DOORS');
  for (const k of [1, 2]) {
    const st = ofUnit(es, mc, `STILE-${k}`);
    assert.ok(st.length > 0, `stile ${k} is drawn`);
    assert.ok(st.every((e) => e.layer === 'LED_STILE'), 'on its own ink');
    const s = span(st);
    assert.ok(near(s.y0, d1.y) && near(s.y1, d1.y + d1.h), 'as high as the doors');
    assert.ok(near(s.x1 - s.x0, D.stileWidthMm), 'its width');
  }
  const s1 = span(ofUnit(es, mc, 'STILE-1'));
  assert.ok(near(s1.x0 - (d1.x + d1.w), P.doors.gap / 2) && near(d2.x - s1.x1, P.doors.gap / 2), 'between door 1 and door 2, the half gaps');
  for (const id of ['PANEL-L', 'PANEL-R', 'PANEL-TOP', 'PANEL-BOTTOM']) {
    const p = ofUnit(es, mc, id);
    assert.ok(p.length > 0 && p.every((e) => e.layer === 'DOORS'), `${id} in the front finish's ink`);
  }
  const sp = span(ofUnit(es, mc, 'PANEL-L'));
  assert.ok(near(sp.x0, m.x) && near(sp.y0, m.base) && near(sp.y1, m.base + D.height), 'the panels round are the cabinet\'s outline');
  // The set's fronts sheet carries the ink and the number.
  const sheets = wallDrawingSheets(a);
  const fronts = sheets.find((x) => x.variant === 'fronts').sheet.entities;
  assert.ok(fronts.some((e) => e.layer === 'LED_STILE'), 'the sheet draws the stiles');
  assert.ok(fronts.some((e) => e.kind === 'text' && e.layer === 'UNIT_NUMBER' && e.text === 'MC01'), 'MC01 on the fronts');
});

test('F5 · a mirror door with the mirror off is the run\'s front again: its style drawn as every front\'s', () => {
  const { mc } = bathroom();
  S().setMirrorCabinet(mc, { mirror_doors: false });
  const a = sheetArgs();
  const group = wallGroups(a.entries, P).find((g) => g.members.some((x) => x.unit.id === mc));
  const es = projectRun(group, { view: 'front', mode: 'fronts', profile: P, frontTypeOf: a.frontTypeOf }).entities;
  const door = S().unitResult(mc).panels.find((p) => p.id === 'MC01-F2');
  const type = door.meta?.frontType || a.frontTypeOf(U(mc)) || P.front.defaultType;
  assert.equal(ofUnit(es, mc, 'MC01-F2').filter((e) => e.meta === 'front-detail').length > 0, frontDetail(door.box, type, P, null).length > 0);
});

test('F5 · the section through the vanity cuts the cabinet over it: the recess in the wall, the bottom box, the LED under', () => {
  const recess = 155;
  const { mc } = bathroom({ recess });
  const a = sheetArgs();
  const group = wallGroups(a.entries, P).find((g) => g.members.some((x) => x.unit.id === mc));
  const m = group.members.find((x) => x.unit.id === mc);
  const st = sectionStations(group)[0];
  assert.ok(st.x > m.x && st.x < m.x + D.width, 'A-A through the vanity passes under the cabinet');
  const sec = buildStation(group, st, { room: a.room, worktops: worktopsOnWall(a.worktops, 0), profile: P, ctx: drawingContext(20, P), frontTypeOf: a.frontTypeOf });
  const es = sec.entities;
  // The recess: its back 155 behind the wall line, its head and its sill to the wall line, the wall's cut ink.
  const rec = ofUnit(es, mc, 'RECESS');
  assert.equal(rec.length, 3);
  assert.ok(rec.every((e) => e.layer === 'BUILDING' && e.pen === 'CUT' && e.kind === 'line'));
  const y0 = m.base;
  const y1 = m.base + D.height;
  const has = (x1, ya, x2, yb) => rec.some((e) => (near(e.x1, x1) && near(e.y1, ya) && near(e.x2, x2) && near(e.y2, yb))
    || (near(e.x2, x1) && near(e.y2, ya) && near(e.x1, x2) && near(e.y1, yb)));
  assert.ok(has(-recess, y0, -recess, y1), 'the pocket\'s back');
  assert.ok(has(-recess, y0, 0, y0) && has(-recess, y1, 0, y1), 'its sill and its head, open to the room');
  // The carcass stands in it: its back the house's clearance off the pocket's back.
  const back = span(ofUnit(es, mc, 'BACK'));
  assert.ok(near(back.x0, -recess + P.room.wallBackClearance), `the back at ${back.x0}`);
  // The bottom box: its lid and its strip cut by the knife.
  const r = S().unitResult(mc);
  for (const id of ['BOX-TOP', 'BOX-FRONT']) {
    const cut = ofUnit(es, mc, id).filter((e) => e.cut);
    assert.ok(cut.length > 0, `${id} cut`);
    const b = r.panels.find((p) => p.id === id).box;
    const s = span(cut);
    assert.ok(near(s.y0, m.base + b.y) && near(s.y1, m.base + b.y + b.h), `${id} at its height`);
  }
  // The LED under: the room's strip, cut, on the stiles' warm ink.
  const led = ofUnit(es, mc, 'LED-UNDER');
  assert.ok(led.length > 0 && led.every((e) => e.layer === 'LED_STILE' && e.cut));
  const strip = lightingSpec(P).strip;
  const ls = span(led);
  assert.ok(near(ls.y1, m.base) && near(ls.y1 - ls.y0, strip.thickness), 'on the cabinet\'s underside');
  assert.ok(near(ls.x1 - ls.x0, strip.width));
  // On the wall: no recess drawn.
  S().setMirrorCabinet(mc, { recess_mm: 0 });
  const flat = buildStation(wallGroups(sheetArgs().entries, P).find((g) => g.members.some((x) => x.unit.id === mc)), st, {
    room: a.room, worktops: worktopsOnWall(a.worktops, 0), profile: P, ctx: drawingContext(20, P), frontTypeOf: a.frontTypeOf,
  });
  assert.equal(ofUnit(flat.entities, mc, 'RECESS').length, 0);
});

test('F5 · the wall plan: the knife through the doors and the stiles; the stiles flush with the doors; the recess in the wall', () => {
  const { mc } = bathroom({ recess: 155 });
  const a = sheetArgs();
  const plan = buildPlan(a.entries, {
    which: 'wall', room: a.room, worktops: a.worktops.map((w) => w.geometry || w), profile: P, ctx: drawingContext(20, P), frontTypeOf: a.frontTypeOf,
  });
  const es = plan.entities;
  const cutOf = (id) => ofUnit(es, mc, id).filter((e) => e.cut);
  const doors = [1, 2, 3].map((k) => span(cutOf(`MC01-F${k}`)));
  const stiles = [1, 2].map((k) => {
    const c = cutOf(`STILE-${k}`);
    assert.ok(c.length > 0 && c.every((e) => e.layer === 'LED_STILE'), `stile ${k} cut on its ink`);
    return span(c);
  });
  // Flush: on the axis across the wall the stile's cut is the doors' cut, face and back.
  const across = near(doors[0].x1 - doors[0].x0, 327) ? 'y' : 'x';
  for (const s of stiles) {
    for (const d of doors) {
      assert.ok(near(s[`${across}0`], d[`${across}0`]) && near(s[`${across}1`], d[`${across}1`]), 'the stile\'s face is the mirror\'s face');
    }
    assert.ok(near(s[`${across}1`] - s[`${across}0`], P.mirror.doorBoardMm + P.mirror.mirrorMm), '22 deep, the door and its mirror');
  }
  assert.equal(cutOf('RECESS').length, 3, 'the pocket in the wall at the cut');
  assert.ok(es.some((e) => e.kind === 'text' && e.layer === 'UNIT_NUMBER' && e.text === 'MC01'));
});

test('F5 · the mirror rows reach no other unit: a kitchen run draws no LED_STILE, no recess line, no LED strip', () => {
  S().newProject('Kitchen');
  S().setRoom({ corners: rectCorners(6000, 3000), height: 2500 });
  const b = S().addUnit('BUD', { wall: 0, x: 1000 }).id;
  S().addUnit('WUD', { wall: 0, x: 1000 });
  S().updateUnitParams(b, { recess_mm: 100 });
  const a = sheetArgs();
  const all = wallDrawingSheets(a).flatMap((s) => s.sheet.entities);
  assert.equal(all.filter((e) => e.layer === 'LED_STILE').length, 0);
  assert.equal(all.filter((e) => e.meta === 'mirror-recess').length, 0);
  for (const g of wallGroups(a.entries, P)) {
    for (const view of ['section', 'plan']) assert.deepEqual(mirrorRecessLines(g, { view, cut: 1200, profile: P }), []);
    for (const m of g.members) assert.deepEqual(mirrorLedBoxes(m.result, P), []);
  }
  // A bare kit of every type that existed before tonight carries no mirror record for the sheets to read.
  for (const id of Object.keys(UNIT_TYPES).filter((k) => k !== 'MIRROR_CABINET')) {
    assert.equal(computeCabinet(defaultParamsFor(id, P), P).derived?.mirror, undefined, id);
  }
});

test('F5 · the LED strips on the sheets are the room\'s strips, box for box (3d/mirrorCabinetRoom.js, T83 F3)', async (t) => {
  let room = null;
  try {
    room = await import('../src/3d/mirrorCabinetRoom.js');
  } catch {
    t.skip('3d/mirrorCabinetRoom.js (M2, F3) is not on this tree yet');
    return;
  }
  const r = computeCabinet({ ...defaultParamsFor('MIRROR_CABINET', P), unit_num: 'MC01' }, P);
  const theirs = room.mirrorLedStrips(r, P).map((s) => [s.kind, s.box]);
  const ours = mirrorLedBoxes(r, P).map((s) => [s.kind, s.box]);
  assert.deepEqual(ours, theirs);
});
