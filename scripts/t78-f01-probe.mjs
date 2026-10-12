// T78 F1 · PROBE: NOTHING CAN BE ADDED LEFT OF AN L (the owner's blocker)
//
// The owner, 11.10.2026: *"dodawanie szafek po lewej stronie l shape szafki
// prosze, teraz nie mozna dodac zadnych szafek."*
//
// CLAUDE.md T78 LAWS: *"diagnose before you cut (every BUG starts with a
// committed PROBE table)"* and *"test the way the client clicks (real mouse)."*
// This probe READS the code and the running app and writes numbers. It fixes
// nothing. The store is read (`window.__cc.project.getState()`,
// `window.__cc.ui.getState()`, `window.__cc.views.room`); the only store
// WRITE is the one the task names as a reading, `addUnit` through the API
// (section `api`), on a browser of its own so the real-mouse page stays pure.
//
// HOW TO RUN (the app already built and served; E2E_URL defaults to
// http://127.0.0.1:4173/):
//     node scripts/t78-f01-probe.mjs            # both sections
//     node scripts/t78-f01-probe.mjs mouse      # the real-mouse gestures only
//     node scripts/t78-f01-probe.mjs api        # the store-API readings only
// Frames go to verify/t78/f01-probe-*.png; the table rows are printed to
// stdout (and verify/t78/f01-probe.rows.md) so verify/t78/f01-probe.md can be
// re-made from them.
//
// THE ENGINE THE NODE SIDE READS is the one the served bundle was built from:
// `src/engine` as COMMITTED (git archive HEAD, read-only), because the working
// tree may already carry the fix while the bundle does not (the probe found
// exactly that: the build stamp on the frames is HEAD's hash). To read the
// working tree's engine instead: T78_ENGINE=tree node scripts/t78-f01-probe.mjs

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  open, pro, unitsNow, settleCamera, showroomDown,
} from './t74-harness.mjs';
import {
  library, clickWith, choose, dragAlong, reachFree, until, helperAt,
} from './t75-harness.mjs';

const engineDir = (() => {
  if (process.env.T78_ENGINE === 'tree') return new URL('../src/engine/', import.meta.url).href;
  const dir = mkdtempSync(join(tmpdir(), 't78-f01-engine-'));
  execSync(`git archive HEAD src/engine | tar -x -C ${JSON.stringify(dir)}`, { cwd: new URL('..', import.meta.url), stdio: 'ignore' });
  return pathToFileURL(`${dir}/src/engine/`).href;
})();
const { roomWalls, roomBounds } = await import(`${engineDir}room.js`);
const { addPlusPoints } = await import(`${engineDir}runs.js`);
const { wallObstacles, unitFootprint, spanInWallFrame } = await import(`${engineDir}collision.js`);
const { cornersOf } = await import(`${engineDir}corners.js`);
const engineLabel = process.env.T78_ENGINE === 'tree' ? 'the working tree' : `HEAD ${execSync('git rev-parse --short HEAD', { cwd: new URL('..', import.meta.url) }).toString().trim()}`;

const SHOTS = 'verify/t78/';
mkdirSync(SHOTS, { recursive: true });
const sections = process.argv.slice(2).filter((a) => /^(mouse|api)$/.test(a));
const runs = (name) => !sections.length || sections.includes(name);

const S = 'window.__cc.project.getState()';
const PROFILE = 'window.__cc.profile.getState().profile';
const j = (v) => JSON.stringify(v);
const r1 = (v) => (v == null ? null : Math.round(Number(v) * 10) / 10);
// The app's own sentences carry a long dash; the table may not (the owner's law).
const undash = (s) => String(s).replace(/[\u2013\u2014]/g, '-');

// ─── THE TABLE ─────────────────────────────────────────────────────────────
const rows = [];
let n = 0;
const row = (gesture, expected, observed, where) => {
  n += 1;
  const line = `| ${n} | ${undash(gesture)} | ${undash(expected)} | ${undash(observed)} | ${undash(where)} |`;
  rows.push(line);
  process.stdout.write(`${line}\n`);
};
const note = (label, detail) => process.stdout.write(`  ·   ${undash(label)}: ${undash(detail)}\n`);

// ─── WHAT THE PROBE READS ──────────────────────────────────────────────────
/** Every message the ui store ever shows, kept by a subscription (yellows go on click-away, greys expire). */
async function recordSaid(page) {
  await page.ask(`(() => { if (window.__probeSaid) return true; window.__probeSaid = []; const seen = new Set();
    const take = (s) => { for (const m of (s.messages || [])) { if (!seen.has(m.id)) { seen.add(m.id); window.__probeSaid.push({ level: m.level, message: m.message }); } } };
    take(window.__cc.ui.getState()); window.__cc.ui.subscribe(take); return true; })()`);
}
const saidCount = (page) => page.ask('(window.__probeSaid || []).length');
const saidSince = (page, from) => page.ask(`(window.__probeSaid || []).slice(${from}).map((m) => m.level + ': ' + m.message)`);

const roomNow = (page) => page.ask(`${S}.project.room`);
const profileNow = (page) => page.ask(`JSON.parse(JSON.stringify(${PROFILE}))`);
const unitsRaw = (page) => page.ask(`JSON.parse(JSON.stringify(${S}.units))`);
const unitOf = (page, id) => page.ask(`(() => { const P = ${S}; const u = P.units.find((x) => x.id === ${j(id)});
  if (!u) return null; const r = P.unitResult(u.id); const lc = r.derived && r.derived.corner_l;
  return { id: u.id, type: u.type, num: u.params.unit_num, wall: u.position.wall ?? 0, x: u.position.x_mm,
    w: u.params.width, d: u.params.depth, h: u.params.height, frontT: u.params.front_t, wallGap: u.params.wall_gap ?? null,
    cornerSide: u.params.corner_side ?? null, arm: lc ? lc.arm : null, lside: lc ? lc.side : null,
    postL: u.params.corner_post_left_mm ?? null, postR: u.params.corner_post_right_mm ?? null,
    infL: u.params.side_infill_left_mm ?? null, infR: u.params.side_infill_right_mm ?? null,
    panels: r.panels.length, posts: r.panels.filter((p) => p.role === 'corner_post').length,
    warnings: (r.warnings || []).map((w) => w.code + ': ' + w.message) }; })()`);
const clearanceOf = (page, id) => page.ask(`(() => { const rows = ${S}.frontClearances().filter((r) => r.unitId === ${j(id)});
  return rows.map((row) => ({ panel: row.panelId, wall: row.wall, left: row.edges.left ? row.edges.left.kind + ' ' + row.edges.left.haveClearanceMm : null,
    right: row.edges.right ? row.edges.right.kind + ' ' + row.edges.right.haveClearanceMm : null })); })()`);
const selectedNow = (page) => page.ask('window.__cc.ui.getState().selectedUnitId || null');
const insertNow = (page) => page.ask('window.__cc.ui.getState().libraryInsert || null');

/**
 * The plus sprites the SCENE draws, each placed on the wall it stands at (plan
 * maths in node, the room's own frames). Two kinds carry `ccAddPlus`: the RUN
 * pluses at the ends of the runs (Scene.jsx AddPluses, titled "Add a unit to
 * the ... of NN") and the selected unit's own INSIDE plus on its face
 * (UnitView.jsx 3398, "Add something inside this unit"); only the first kind
 * offers a place for a cabinet, so each sprite is told apart by its title.
 */
async function plusesInScene(page) {
  const room = await roomNow(page);
  const walls = roomWalls(room).filter((w) => !w.island);
  const centre = roomBounds(room).centre;
  const sprites = await page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return []; const T = v.three; const out = [];
    v.scene.traverse((o) => { if (o.userData && o.userData.ccAddPlus && o.visible !== false) { o.updateMatrixWorld(true);
      const p = new T.Vector3().setFromMatrixPosition(o.matrixWorld); out.push({ x: p.x, y: p.y, z: p.z, title: (o.children[0] && o.children[0].name) || '' }); } });
    return out; })()`);
  return sprites.map((s) => {
    const plan = { x: s.x * 1000 + centre.x, y: s.z * 1000 + centre.y };
    let best = null;
    for (const w of walls) {
      const sp = spanInWallFrame([plan], w);
      if (sp.near < -1 || sp.left < -200 || sp.left > w.width + 200) continue;
      if (!best || sp.near < best.v) best = { wall: w.index, u: r1(sp.left), v: r1(sp.near) };
    }
    const kind = /^Add a unit (to the|beside)/.test(s.title) ? 'run' : 'inside';
    return { ...best, yMm: r1(s.y * 1000), title: s.title, kind };
  });
}
const runPluses = (list) => list.filter((p) => p.kind === 'run');
const saySprites = (list) => `${runPluses(list).length} run plus(es): ${runPluses(list).map((p) => `${wallNo(p.wall)} u ${p.u} v ${p.v} "${p.title}"`).join('; ') || 'none'}${list.some((p) => p.kind === 'inside') ? `; plus the inside disc of the selected unit ("${list.find((p) => p.kind === 'inside').title}", not a place for a cabinet)` : ''}`;
/** The plus points the ENGINE offers, computed in node from the page's own units, walls and profile. */
async function plusesByEngine(page) {
  const [units, room, profile] = await Promise.all([unitsRaw(page), roomNow(page), profileNow(page)]);
  return addPlusPoints(units, { walls: roomWalls(room) }, profile).map((p) => ({ unitId: p.unitId, side: p.side, wall: p.wall, x: r1(p.x_mm), gap: r1(p.gap) }));
}
/** The corner rulebook's answer and the L's footprint in the adjacent wall's frame, in node from the page's data. */
async function cornerReading(page, lId, depthOfNewcomer = 560) {
  const [units, room, profile] = await Promise.all([unitsRaw(page), roomNow(page), profileNow(page)]);
  const walls = roomWalls(room);
  const L = units.find((u) => u.id === lId);
  const wallA = walls[L.position.wall ?? 0];
  const n2 = walls.filter((w) => !w.island).length;
  const wallB = L.params.corner_side === 'right' ? walls[(wallA.index + 1) % n2] : walls[(wallA.index - 1 + n2) % n2];
  const gap = Number(L.params.wall_gap ?? profile.room.wallBackClearance) || 0;
  const foot = unitFootprint({ wall: wallA, x: L.position.x_mm, width: L.params.width, depth: L.params.depth, backInset: gap });
  const spanB = spanInWallFrame(foot, wallB);
  const spanA = spanInWallFrame(foot, wallA);
  const obstaclesB = wallObstacles({
    wall: wallB, walls, depth: depthOfNewcomer,
    others: [{ wall: wallA.index, x_mm: L.position.x_mm, width: L.params.width, depth: L.params.depth, rotation: 0, backInset: gap, label: L.params.unit_num }],
  });
  const corners = cornersOf({ units, walls, profile }).filter((c) => c.kind === 'internal');
  return {
    wallA: wallA.index, wallB: wallB.index, lenA: wallA.width, lenB: wallB.width, gap,
    spanA: { left: r1(spanA.left), right: r1(spanA.right), near: r1(spanA.near), far: r1(spanA.far) },
    spanB: { left: r1(spanB.left), right: r1(spanB.right), near: r1(spanB.near), far: r1(spanB.far) },
    obstaclesB: obstaclesB.map((o) => ({ left: r1(o.left), right: r1(o.right), corner: o.corner, stopPad: o.stopPad ?? 0 })),
    corners: corners.map((c) => ({ wallA: c.wallA, wallB: c.wallB, solution: c.solution, stopMm: c.stopMm, runA: c.runA && c.runA.unitId, runB: c.runB && c.runB.unitId, gapB: c.runB && c.runB.gapMm })),
  };
}

// ─── THE HANDS THIS PROBE NEEDS ────────────────────────────────────────────
async function closeLibrary(page) {
  if (await page.has('[aria-label="Close the library"]')) await page.press('[aria-label="Close the library"]');
}
/** The L from the library: Library, Kitchen, Base units, Corner L (the real row), as T75 f04 and T77 f03 placed it. */
async function placeL(page) {
  const before = new Set((await unitsNow(page)).map((u) => u.id));
  const ok = await library(page, { category: 'Kitchen', group: 'base-units', entry: 'corner-l' });
  const added = (await unitsNow(page)).filter((u) => !before.has(u.id));
  await closeLibrary(page);
  return { ok, unit: added[0] || null };
}
/** A unit SELECTED by a real click on it, piece by piece until the store says it is the one (a click on the first piece in reach can land on a dimension's pick box). */
async function selectUnit(page, id) {
  const want = `window.__cc.ui.getState().selectedUnitId === ${j(id)} && Boolean(document.querySelector('[data-section="Carcass"]'))`;
  const ids = await page.ask(`(() => { const r = ${S}.unitResult(${j(id)}); const pick = [];
    for (const f of [(p) => p.id === 'TOP' || p.part === 'TOP' || p.part === 'TOP-L', (p) => p.part === 'FRONT', (p) => p.role === 'side', (p) => p.role === 'bottom', (p) => true]) {
      for (const p of r.panels) if (f(p) && !pick.includes(p.id)) pick.push(p.id); }
    return pick; })()`);
  let last = null;
  for (const pid of ids.slice(0, 8)) {
    const at = await reachFree(page, id, pid);
    if (!at) continue;
    await clickWith(page, at.x, at.y);
    last = { ...at, by: pid };
    if (await until(page, want, 2500)) return last;
  }
  return last;
}
async function section(page, title) {
  if (await page.has(`[data-section="${title}"][data-open="0"]`)) await page.press(`[data-section="${title}"] > button`);
  return page.has(`[data-section="${title}"][data-open="1"]`);
}
const WALL_SELECT = '[...document.querySelectorAll(\'select\')].find((s) => s.offsetParent && s.previousElementSibling && s.previousElementSibling.textContent.trim() === \'Wall\')';
/** A row of the open library pressed, the panel left as it was opened (the insert point must survive: the menu would clear it). */
async function pressRow(page, group, entry) {
  if (!(await page.has(`[data-library-entry="${entry}"]`)) && await page.has(`[data-library-group="${group}"]`)) await page.press(`[data-library-group="${group}"]`);
  if (!(await page.has(`[data-library-entry="${entry}"]`))) return false;
  await page.press(`[data-library-entry="${entry}"]`);
  await page.sleep(1200);
  return true;
}
/** PRO's right panel folded away by its own X, the camera settled, a frame. */
async function framed(page, file) {
  for (const sel of ['button[title="Close panel"]']) if (await page.has(sel)) await page.press(sel);
  await settleCamera(page);
  await page.screenshot(`${SHOTS}${file}`);
}
/** A RUN plus sprite's pixel: the one the scene's raycaster meets first, at the wall and nearest the x asked. */
async function plusPixel(page, wall, nearU) {
  const pluses = await plusesInScene(page);
  const pix = await helperAt(page, '(u) => u.ccAddPlus === true');
  if (!pix || !pluses.length) return null;
  // helperAt lists the sprites in traverse order, as plusesInScene does (the
  // same userData test, the same visibility test), so the indices agree.
  let best = null;
  pluses.forEach((p, i) => {
    if (p.kind !== 'run' || p.wall !== wall || !pix[i]) return;
    const dist = Math.abs(p.u - nearU);
    if (!best || dist < best.dist) best = { ...pix[i], dist, u: p.u, title: p.title };
  });
  return best;
}
const wallNo = (i) => `wall ${i + 1}`;

// ═══ SECTION MOUSE · THE REAL GESTURES ═══════════════════════════════════════
if (runs('mouse')) {
  process.stdout.write('\n=== MOUSE · the L from the library, the plus, the library insert, the Wall select, the drag ===\n');
  const page = await open();
  await pro(page);
  await recordSaid(page);
  const room = await roomNow(page);
  const walls = roomWalls(room).filter((w) => !w.island);
  note('the default room', `${walls.length} walls: ${walls.map((w) => `${wallNo(w.index)} ${w.width} from (${w.start.x},${w.start.y})`).join('; ')}`);
  const profile = await profileNow(page);
  note('the profile', `room.wallBackClearance ${profile.room.wallBackClearance}; ui.addPlusMinGapMm ${profile.ui.addPlusMinGapMm}; editor.minUnitGap ${profile.editor.minUnitGap}; corner.postMm ${profile.corner?.postMm}; cornerBase.defaults ${j(profile.cornerBase?.defaults)}`);
  note('the build under the mouse', `${await page.text('[data-testid="build-stamp"]') || (await page.ask('(document.body.innerText.match(/#\\d+ · [^\\n]*UTC · [0-9a-f]{7}/) || [""])[0]')) || 'no stamp read'}; the node-side engine is ${engineLabel}`);

  const L = await placeL(page);
  const l0 = L.unit ? await unitOf(page, L.unit.id) : null;
  const cr0 = l0 ? await cornerReading(page, l0.id) : null;
  row('Library, Kitchen, Base units, Corner L (the real row)',
    'a CORNER_L_BASE in a room corner',
    l0 ? `CORNER_L_BASE ${l0.num} on ${wallNo(l0.wall)} at x ${l0.x}, width ${l0.w} (arm A), depth ${l0.d} (arm B), arm ${l0.arm}, corner_side ${l0.cornerSide}; wall B is ${wallNo(cr0.wallB)} (${cr0.lenB} long); arm A ends at x ${r1(l0.x + l0.w)} on ${wallNo(l0.wall)}; arm B ends ${r1(cr0.gap + l0.d)} from the corner, u ${cr0.spanB.left} in ${wallNo(cr0.wallB)}'s frame` : `nothing added: ${j(L)}`,
    'projectStore.js addUnit 4842-4854 cornerLSlots 10217 (first free internal corner of wall 1: x = wallClearance, side left)');
  if (!l0) { await page.close(); process.exit(1); }
  await framed(page, 'f01-probe-01-the-l.png');

  // THE PLUS POINTS, L alone.
  const eng0 = await plusesByEngine(page);
  const sc0 = await plusesInScene(page);
  row('the plus points with the L alone (engine addPlusPoints, and the sprites the scene draws)',
    `a plus on ${wallNo(cr0.wallB)} at arm B\'s end (u ${cr0.spanB.left}) and one on ${wallNo(l0.wall)} at arm A\'s end (x ${r1(l0.x + l0.w)})`,
    `engine (${engineLabel}): ${eng0.length} point(s): ${eng0.map((p) => `${wallNo(p.wall)} ${p.side} x ${p.x} gap ${p.gap}`).join('; ') || 'none'}; scene: ${saySprites(sc0)}; run pluses on ${wallNo(cr0.wallB)}: ${runPluses(sc0).filter((p) => p.wall === cr0.wallB).length}`,
    'runs.js addPlusPoints 790-816 (one plus per END of a RUN, runs built per wall from units on that wall: buildRuns 236; no unit on wall B, no run, no plus); the L\'s left end gap = wall clearance < addPlusMinGapMm, 801');
  await framed(page, 'f01-probe-02-plus-points.png');

  // GESTURE 1 on wall B: the plus beside arm B's end.
  const plusB = await plusPixel(page, cr0.wallB, cr0.spanB.left);
  row(`gesture 1, ${wallNo(cr0.wallB)}: click the plus beside the L\'s arm B end`,
    'the library opens to insert on wall B at arm B\'s end',
    plusB ? `a plus found at pixel ${plusB.x},${plusB.y} ("${plusB.title}")` : `NO PLUS on ${wallNo(cr0.wallB)}: nothing to click (the only run plus is ${runPluses(sc0).map((p) => `${wallNo(p.wall)} u ${p.u}`).join(', ') || 'none'})`,
    'Scene.jsx AddPluses 1002-1035 draws addPlusPoints only; runs.js 793-813');

  // GESTURE 1 on wall A: the plus at arm A's end, a real click, then the Standard row.
  const plusA = await plusPixel(page, l0.wall, l0.x + l0.w);
  let said0 = await saidCount(page);
  let a1 = null;
  if (plusA) {
    await clickWith(page, plusA.x, plusA.y);
    await until(page, 'Boolean(window.__cc.ui.getState().libraryInsert)', 4000);
    const ins = await insertNow(page);
    const before = new Set((await unitsNow(page)).map((u) => u.id));
    const pressed = await pressRow(page, 'base-units', 'door-base');
    const added = (await unitsNow(page)).filter((u) => !before.has(u.id));
    a1 = added[0] ? await unitOf(page, added[0].id) : null;
    row(`gesture 1, ${wallNo(l0.wall)}: click the plus at arm A\'s end (pixel ${plusA.x},${plusA.y}), then Standard (door-base)`,
      `a BUD lands on ${wallNo(l0.wall)} at x ${r1(l0.x + l0.w)}, flush with arm A`,
      `insert ${j(ins)}; row pressed ${pressed}; ${a1 ? `BUD ${a1.num} on ${wallNo(a1.wall)} at x ${a1.x}..${r1(a1.x + a1.w)} (flush: ${Math.abs(a1.x - (l0.x + l0.w)) < 0.6})` : 'nothing added'}; said ${j(await saidSince(page, said0))}`,
      'Scene.jsx 2148-2154 onPick -> uiStore openLibraryToInsert 222 { near, side }; LibraryPanel.jsx handleAdd 128-134 -> addUnit { near, side }; freeSlotOnWall collision.js 822-873');
    await closeLibrary(page);
  } else {
    row(`gesture 1, ${wallNo(l0.wall)}: click the plus at arm A\'s end`, 'a plus at arm A\'s end', 'no plus found on wall A either', 'runs.js addPlusPoints');
  }
  await framed(page, 'f01-probe-03-plus-a-added.png');

  // GESTURE 2: the library insert, the L selected, nothing says which wall.
  const selAt = await selectUnit(page, l0.id);
  const selWas = await selectedNow(page) === l0.id;
  said0 = await saidCount(page);
  const before2 = new Set((await unitsNow(page)).map((u) => u.id));
  const lib2 = await library(page, { category: 'Kitchen', group: 'base-units', entry: 'door-base' });
  const added2 = (await unitsNow(page)).filter((u) => !before2.has(u.id));
  const b2 = added2[0] ? await unitOf(page, added2[0].id) : null;
  await closeLibrary(page);
  row(`gesture 2: the L selected by a real click (${selWas ? `selected, by ${selAt && selAt.by} at ${selAt && selAt.x},${selAt && selAt.y}` : 'NOT selected'}), Library, Kitchen, Base units, Standard`,
    `the client means ${wallNo(cr0.wallB)}; a way to say so, or the unit beside the L on wall B at u ${r1(cr0.spanB.left - 600)}..${cr0.spanB.left}`,
    `row ${lib2}; ${b2 ? `BUD ${b2.num} on ${wallNo(b2.wall)} at x ${b2.x}..${r1(b2.x + b2.w)}` : 'nothing added'}; the library has no wall control (LibraryPanel reads only libraryInsert.near/side/wall); said ${j(await saidSince(page, said0))}`,
    'LibraryPanel.jsx handleAdd 128-134: near = insertAt?.near ?? selectedUnitId, wall only from an island face\'s plus; addUnit 4830-4840 ordered = [besideWall, ...]; freeSlotOnWall near/side 846-871 (ties go right)');

  // …then the Wall select, the one road the panel offers to wall B.
  let b3 = null;
  if (b2) {
    await selectUnit(page, b2.id);
    await section(page, 'Carcass');
    said0 = await saidCount(page);
    const chosen = await choose(page, WALL_SELECT, String(cr0.wallB));
    b3 = await unitOf(page, b2.id);
    row(`gesture 2b: the new Standard's Wall select set to ${wallNo(cr0.wallB)} (a real click, the arrows, Enter)`,
      `it lands on ${wallNo(cr0.wallB)} beside the L: x ${r1(cr0.spanB.left - b2.w)}..${cr0.spanB.left} (the first free slot from the corner)`,
      `option ${j(chosen.label)} ${chosen.ok ? 'chosen' : chosen.why}; BUD ${b3.num} on ${wallNo(b3.wall)} at x ${b3.x}..${r1(b3.x + b3.w)}; distance from the L\'s arm B end ${r1(cr0.spanB.left - (b3.x + b3.w))}; said ${j(await saidSince(page, said0))}`,
      'projectStore.js setUnitWall 6554-6582: freeSlotOnWall with no `near` -> collision.js 876-885: the right-hand end is taken by the L, so the FIRST gap from the wall\'s start wins (x = wallMargin, the far corner)');
    await framed(page, 'f01-probe-04-wall-select.png');
  }

  // …and a real drag toward the corner: where the clamp stops it.
  if (b3 && b3.wall === cr0.wallB) {
    said0 = await saidCount(page);
    const toward = 4000;
    let dragged = null;
    for (const pid of ['TOP', 'SIDE-R', 'SIDE-L', 'BOTTOM', 'BACK']) {
      const x0 = (await unitOf(page, b3.id)).x;
      const d = await dragAlong(page, b3.id, pid, toward);
      if (!d) continue;
      const x1 = (await unitOf(page, b3.id)).x;
      if (Math.abs(x1 - x0) > 0.5) { dragged = { ...d, by: pid }; break; }
    }
    const b4 = await unitOf(page, b3.id);
    const cr4 = await cornerReading(page, l0.id, b4.d);
    row(`gesture 2c: a real drag of ${b4.num} along ${wallNo(cr0.wallB)} toward the corner (+${toward} mm asked)`,
      `it stops flush with arm B\'s end: right edge at u ${cr0.spanB.left}, no corner post`,
      `${dragged ? `grabbed by ${dragged.by}` : 'no drag took'}; x ${b3.x} -> ${b4.x}; right edge ${r1(b4.x + b4.w)} vs arm B end ${cr4.spanB.left} (flush: ${Math.abs(b4.x + b4.w - cr4.spanB.left) < 0.6}); posts L ${b4.postL} R ${b4.postR}; infill R ${b4.infR}; rulebook: ${j(cr4.corners)}; obstacles on ${wallNo(cr0.wallB)} for a ${b4.d} deep unit: ${j(cr4.obstaclesB)}; said ${j(await saidSince(page, said0))}`,
      'moveUnit 6276-6330 -> wallObstacles collision.js 497-541 (the L\'s footprint in wall B\'s frame, corner: true, stopPad 0: cornerStopMm null for a corner kit, corners.js 97-101) -> clampUnitX 674-735');
    await framed(page, 'f01-probe-05-dragged-to-arm-b.png');

    // THE PLUS ON RUN B's CORNER SIDE: an offer inside the L.
    const eng5 = await plusesByEngine(page);
    const sc5 = await plusesInScene(page);
    const wrong = eng5.find((p) => p.wall === cr0.wallB && p.unitId === b4.id && p.side === 'right');
    row(`the plus points with a run on ${wallNo(cr0.wallB)} standing on arm B\'s end`,
      `no plus between ${b4.num} and the L (the L occupies u ${cr4.spanB.left}..${cr4.spanB.right}); a plus on ${b4.num}\'s far side`,
      `engine (${engineLabel}): ${eng5.map((p) => `${wallNo(p.wall)} ${p.side} of ${p.unitId === l0.id ? l0.num : (p.unitId === b4.id ? b4.num : p.unitId)} x ${p.x} gap ${p.gap}`).join('; ')}; scene: ${saySprites(sc5)}; a plus INSIDE the L\'s footprint: ${wrong ? `yes, at u ${wrong.x}, gap ${wrong.gap} (the L is not in its others)` : 'no'}`,
      'runs.js addPlusPoints 797-800: others = units on the SAME wall only; runEndGap 702-760 measures to the wall\'s end');
    if (wrong) {
      const px = await plusPixel(page, cr0.wallB, wrong.x);
      said0 = await saidCount(page);
      let a6 = null;
      if (px) {
        await clickWith(page, px.x, px.y);
        await until(page, 'Boolean(window.__cc.ui.getState().libraryInsert)', 4000);
        const ins = await insertNow(page);
        const before6 = new Set((await unitsNow(page)).map((u) => u.id));
        const pressed = await pressRow(page, 'base-units', 'door-base');
        const added6 = (await unitsNow(page)).filter((u) => !before6.has(u.id));
        a6 = added6[0] ? await unitOf(page, added6[0].id) : null;
        // The frame with the library still open and the sentence on the screen.
        await page.screenshot(`${SHOTS}f01-probe-06-wrong-plus.png`);
        row(`click that plus (pixel ${px.x},${px.y}, "${px.title}"), then Standard`,
          'no such plus; or, if offered, a unit that lands',
          `insert ${j(ins)}; row pressed ${pressed}; ${a6 ? `BUD ${a6.num} on ${wallNo(a6.wall)} at x ${a6.x}` : 'NOTHING ADDED'}; said ${j(await saidSince(page, said0))}`,
          'addUnit 4866-4893: cornerSpansFor puts the L in `others`, freeSlotOnWall finds no slot on that side -> the refusal at 4897-4899');
        await closeLibrary(page);
      } else {
        row('click that plus', 'a pixel to click', 'the sprite is drawn but no pixel of it is first under the pointer from this camera', 'Scene.jsx AddPluses');
      }
    }
  }
  note('units at the end', j(await unitsNow(page)));
  const errs = page.errors.filter((e) => !/props\/manifest\.json|favicon|hardware-local|showroom|ERR_TUNNEL_CONNECTION_FAILED|supabase\.co/i.test(e));
  if (errs.length) note('console errors on the page', errs.slice(0, 3).join(' | '));
  await page.close();
}

// ═══ SECTION API · addUnit THROUGH THE STORE, AS A READING ═══════════════════
if (runs('api')) {
  process.stdout.write('\n=== API · addUnit on wall B and wall A through the store, the refusal or the landing x ===\n');
  const page = await open();
  await pro(page);
  await recordSaid(page);
  const L = await placeL(page);
  const l0 = L.unit ? await unitOf(page, L.unit.id) : null;
  if (!l0) { row('the L from the library (api page)', 'a CORNER_L_BASE', `nothing added: ${j(L)}`, 'addUnit'); await page.close(); process.exit(1); }
  const cr = await cornerReading(page, l0.id, 560);
  const B = cr.wallB; const A = l0.wall;
  const armBEnd = cr.spanB.left; // u on wall B where the L's arm B ends (the first free slot's far edge)
  const armAEnd = r1(l0.x + l0.w);
  const W = 600;
  const call = async (opts) => page.ask(`(() => { const res = ${S}.addUnit('BUD', ${j(opts)}); const u = res.id ? ${S}.units.find((x) => x.id === res.id) : null;
    return { id: res.id, error: res.error || null, wall: u ? (u.position.wall ?? 0) : null, x: u ? u.position.x_mm : null, num: u ? u.params.unit_num : null, w: u ? u.params.width : null }; })()`);
  const fmt = (res) => (res.id ? `LANDED: ${res.num} on ${wallNo(res.wall)} at x ${res.x}..${r1(res.x + res.w)}` : `REFUSED: ${j(res.error)}`);

  note('the L (api page)', `${l0.num} on ${wallNo(A)} at x ${l0.x}, ${l0.w} x ${l0.d}, corner_side ${l0.cornerSide}; wall B = ${wallNo(B)} (${cr.lenB}); the L in wall B\'s frame (engine ${engineLabel}): u ${cr.spanB.left}..${cr.spanB.right}, v ${cr.spanB.near}..${cr.spanB.far}; wallObstacles for a 560 deep unit on wall B: ${j(cr.obstaclesB)}`);

  // Wall B, inside the L's square.
  const inside = await call({ wall: B, x: armBEnd + 10 });
  row(`addUnit('BUD', { wall: ${B}, x: ${armBEnd + 10} }) (inside the L\'s corner square)`, 'refused in words', fmt(inside), 'addUnit 4869-4871 slotTakes with cornerSpansFor 10198-10207; the refusal 4895-4896');
  // Wall B, one mm into the arm.
  const overlap = await call({ wall: B, x: armBEnd - W + 1 });
  row(`addUnit('BUD', { wall: ${B}, x: ${armBEnd - W + 1} }) (1 mm into arm B)`, 'refused in words', fmt(overlap), 'collision.js slotTakes 899-911 (half a millimetre of slack)');
  // Wall B, just past the arm B end: the slot the spec names.
  const flush = await call({ wall: B, x: armBEnd - W });
  const f1 = flush.id ? await unitOf(page, flush.id) : null;
  row(`addUnit('BUD', { wall: ${B}, x: ${armBEnd - W} }) (just past arm B\'s end)`, `lands at x ${armBEnd - W}, right edge flush with arm B at u ${armBEnd}`,
    `${fmt(flush)}${f1 ? `; posts L ${f1.postL} R ${f1.postR}; infills L ${f1.infL} R ${f1.infR}; clearance rows ${j(await clearanceOf(page, f1.id))}` : ''}`,
    'addUnit 4869-4871 slotTakes; refreshAutoParts 2176-2260 (others = same wall only: no infill against the L, no post: cornersOf says L)');
  const crF = await cornerReading(page, l0.id, 560);
  note('the corner rulebook with a run on wall B', j(crF.corners));
  // Wall B, no x: where does the store put it by itself?
  const freeB = await call({ wall: B });
  row(`addUnit('BUD', { wall: ${B} }) (no x: the store\'s own first free slot)`, `beside what stands there: x ${armBEnd - 2 * W}..${armBEnd - W}`, fmt(freeB), 'freeSlotOnWall collision.js 876-885: right-hand end taken, so the first gap from the wall\'s START (the far corner) wins');
  // near the L, side left: the owner's own words as the API hears them.
  const nearLeft = await call({ near: l0.id, side: 'left' });
  row(`addUnit('BUD', { near: ${j(l0.num)}, side: 'left' }) (the owner\'s sentence, as the plus would send it)`, `a unit on ${wallNo(B)} at arm B\'s end`, fmt(nearLeft),
    'addUnit 4830-4840: a SIDE pins the search to the L\'s own wall (ordered = [besideWall]); freeSlotOnWall 846-871 finds nothing left of x ' + l0.x + '; the refusal 4897-4899');
  // Wall A, just past arm A's end.
  const flushA = await call({ wall: A, x: armAEnd });
  row(`addUnit('BUD', { wall: ${A}, x: ${armAEnd} }) (just past arm A\'s end)`, `lands at x ${armAEnd}, flush with arm A`, fmt(flushA), 'addUnit 4869-4871 slotTakes (same wall: unitSpan of the L)');
  const freeA = await call({ wall: A });
  row(`addUnit('BUD', { wall: ${A} }) (no x)`, `beside the run: x ${armAEnd + W}`, fmt(freeA), 'freeSlotOnWall 876-878: rightMost + clearance');
  const nearRight = await call({ near: l0.id, side: 'right' });
  row(`addUnit('BUD', { near: ${j(l0.num)}, side: 'right' })`, `the nearest free slot right of the L on ${wallNo(A)}: x ${armAEnd + 2 * W}`, fmt(nearRight), 'freeSlotOnWall 846-871');
  note('what was said, in order', j(await saidSince(page, 0)));
  note('units at the end', j(await unitsNow(page)));
  const eng = await plusesByEngine(page);
  note(`plus points at the end (engine ${engineLabel})`, eng.map((p) => `${wallNo(p.wall)} ${p.side} of ${p.unitId} x ${p.x} gap ${p.gap}`).join('; '));
  await framed(page, 'f01-probe-07-api-landings.png');
  await page.close();
}

writeFileSync(`${SHOTS}f01-probe.rows.md`, `${['| # | Gesture or call | Expected | Observed | File:line that decides it |', '| - | - | - | - | - |', ...rows].join('\n')}\n`);
await showroomDown();
process.exit(0);
