// T78 F12 · PROBE: THE GLASS IS NOT IN THE DOOR
//
// The owner, 11.10.2026: *"szyba powinna byc smoke, i powinna byc na
// drzwiczkach a nie gdzies na scianie."*
//
// CLAUDE.md T78 LAWS: *"diagnose before you cut (every BUG starts with a
// committed PROBE table)"* and *"test the way the client clicks (real mouse)."*
// This probe READS the code and the running app and writes numbers. It fixes
// nothing. The store is only read (`window.__cc.project.getState()`,
// `window.__cc.ui.getState()`, `window.__cc.views.room.three`); every unit,
// door and style is made by the REAL library row, the REAL Add doors button,
// the REAL Front type select and a REAL double click on the leaf.
//
// WHAT IT MEASURES, per glazed leaf: the panel record `p.box` (the unit's own
// frame, mm), the door mesh's world box, the pane mesh's world box
// (`userData.ccGlassPane`), both taken back into the unit frame through the
// unit group's inverse matrix, the pane's centre against the door's centre,
// and the same again with the door swung open by a 2klik (does the pane move
// with the leaf?).
//
// HOW TO RUN (the app already built and served; E2E_URL defaults to
// http://127.0.0.1:4173/):
//     node scripts/t78-f12-probe.mjs                 # all three sections
//     node scripts/t78-f12-probe.mjs wud             # PRO, a WUD_GLASS from the library
//     node scripts/t78-f12-probe.mjs wardrobe        # PRO, a WARDROBE set to Glass by the Front type select
//     node scripts/t78-f12-probe.mjs retail          # retail.html#/design, a wardrobe set to GLASS in FRONTS
// Frames go to verify/t78/f12-probe-*.png (wide and close); the readings to
// verify/t78/f12-probe.json and the table rows to verify/t78/f12-probe.rows.md,
// so verify/t78/f12-probe.md can be re-made from them.

import { mkdirSync, writeFileSync } from 'node:fs';
import {
  open, pro, room, unitsNow, settleCamera, showroomDown,
} from './t74-harness.mjs';
import {
  library, choose, clickWith, boxOf, until, reachFree, key,
} from './t75-harness.mjs';

const SHOTS = 'verify/t78/';
mkdirSync(SHOTS, { recursive: true });
const sections = process.argv.slice(2).filter((a) => /^(wud|wardrobe|retail)$/.test(a));
const runs = (name) => !sections.length || sections.includes(name);

const S = 'window.__cc.project.getState()';
const UI = 'window.__cc.ui.getState()';
const j = (v) => JSON.stringify(v);
const r1 = (n) => (n == null || Number.isNaN(Number(n)) ? null : Math.round(Number(n) * 10) / 10);
const fmt = (a) => (Array.isArray(a) ? a.map(r1).join(', ') : String(a));

const rows = [];
const readings = {};
let n = 0;
const row = (gesture, expected, observed, decides) => {
  n += 1;
  const line = `| ${n} | ${gesture} | ${expected} | ${observed} | ${decides} |`;
  rows.push(line);
  console.log(line);
};
const note = (text) => { console.log(`  ${text}`); };

const stamp = (page) => page.ask('((document.body.innerText || \'\').match(/#\\d+ · [0-9-]+ [0-9:]+ UTC · [0-9a-f]{7}/) || [null])[0]');
const lastSaid = (page, k = 3) => page.ask(`(${UI}.messages || []).slice(-${k}).map((m) => m.message)`);

// ─── WHAT THE PROBE READS OFF THE LIVE SCENE ────────────────────────────────
//
// For every glazed leaf of one unit: the engine's panel record, the door
// mesh (`userData.ccPanelId`), the pane mesh (`userData.ccGlassPane`), both in
// the ROOM frame (world, mm) and in the UNIT frame (the unit group's inverse),
// the pane's own local position inside the swing group and the door mesh's.
const MEASURE = `(function (unitId) {
  const v = window.__cc.views && window.__cc.views.room; if (!v) return { why: 'no room view' };
  const T = v.three; const P = ${S};
  const u = P.units.find((x) => x.id === unitId); if (!u) return { why: 'no unit ' + unitId };
  const r = P.unitResult(unitId);
  let g = null; v.scene.traverse((o) => { if (!g && o.userData && o.userData.ccUnitId === unitId) g = o; });
  if (!g) return { why: 'no unit group in the scene' };
  g.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(g.matrixWorld).invert();
  const origin = new T.Vector3().setFromMatrixPosition(g.matrixWorld);
  const rot = new T.Euler().setFromRotationMatrix(g.matrixWorld);
  const k = (m) => Math.round(m * 10000) / 10;
  const asMm = (b) => ({ min: [b.min.x, b.min.y, b.min.z].map(k), max: [b.max.x, b.max.y, b.max.z].map(k),
    centre: [(b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, (b.min.z + b.max.z) / 2].map(k),
    size: [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z].map(k) });
  const corners = (o, M) => { o.updateMatrixWorld(true); if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox; const out = new T.Box3();
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
      const p = new T.Vector3(x, y, z).applyMatrix4(o.matrixWorld); if (M) p.applyMatrix4(M); out.expandByPoint(p); }
    return out; };
  const meshOf = (o) => ({ world: asMm(corners(o, null)), local: asMm(corners(o, inv)),
    position: o.position.toArray().map(k), parentPosition: o.parent ? o.parent.position.toArray().map(k) : null,
    parentRotYdeg: o.parent ? Math.round(o.parent.rotation.y * 1800 / Math.PI) / 10 : null,
    visible: o.visible, vertices: o.geometry.attributes.position ? o.geometry.attributes.position.count : 0 });
  const fronts = r.panels.filter((p) => p.role === 'front' && !(p.meta && p.meta.frontDecorationParent));
  const leaves = fronts.map((p) => {
    let door = null; let pane = null;
    g.traverse((o) => { if (!o.isMesh || !o.userData) return;
      if (o.userData.ccPanelId === p.id) { const c = o.geometry.attributes.position ? o.geometry.attributes.position.count : 0;
        if (!door || c > door.c) door = { o, c }; }
      if (o.userData.ccGlassPane === p.id) pane = o; });
    const d = door ? meshOf(door.o) : null; const q = pane ? meshOf(pane) : null;
    const expected = [p.box.x + p.box.w / 2, p.box.y + p.box.h / 2, p.box.z + p.box.d / 2];
    return { id: p.id, part: p.part, hinge: p.meta && p.meta.hinge, frontType: p.meta && p.meta.frontType,
      box: p.box, thickness: p.thickness, glass: (p.meta && p.meta.glass) || null,
      door: d, pane: q, sameGroup: Boolean(door && pane && pane.parent === door.o.parent),
      expectedLocalCentre: expected,
      paneMinusDoorWorld: (d && q) ? q.world.centre.map((c, i) => Math.round((c - d.world.centre[i]) * 10) / 10) : null,
      paneMinusExpectedLocal: q ? q.local.centre.map((c, i) => Math.round((c - expected[i]) * 10) / 10) : null };
  });
  return { unit: { id: u.id, type: u.type, num: u.params.unit_num, wall: u.position.wall, x_mm: u.position.x_mm,
      w: u.params.width, h: u.params.height, d: u.params.depth, frontType: u.params.front_type || null,
      mountHeight: r.assemblies ? r.assemblies.mountHeight : null, legHeight: r.assemblies ? r.assemblies.legHeight : null },
    origin: [origin.x, origin.y, origin.z].map(k), rotYdeg: Math.round(rot.y * 1800 / Math.PI) / 10,
    open: (${UI}.openFronts || {})[unitId] || {},
    bom: ((r.hardware || []).filter((h) => h.role === 'glass_pane' || /glass/i.test(h.label || ''))).map((h) => ({ role: h.role, label: h.label, qty: h.qty, spec: h.spec || h.note || null })),
    warnings: (r.warnings || []).filter((w) => /GLASS/.test(w.code || '')).map((w) => w.code + ': ' + w.message),
    leaves };
})`;
const measure = (page, unitId) => page.ask(`${MEASURE}(${j(unitId)})`);

/** The screen rectangle (CSS px) that the door AND the pane of a leaf cover, for a close frame. */
const RECT = `(function (unitId, panelId) {
  const v = window.__cc.views && window.__cc.views.room; if (!v) return null; const T = v.three;
  let g = null; v.scene.traverse((o) => { if (!g && o.userData && o.userData.ccUnitId === unitId) g = o; });
  if (!g) return null; const targets = [];
  g.traverse((o) => { if (o.isMesh && o.userData && (o.userData.ccPanelId === panelId || o.userData.ccGlassPane === panelId)) targets.push(o); });
  if (!targets.length) return null;
  const r = v.gl.domElement.getBoundingClientRect(); let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const t of targets) { t.updateMatrixWorld(true); const b = new T.Box3().setFromObject(t);
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
      const p = new T.Vector3(x, y, z).project(v.camera); const px = r.left + (p.x * 0.5 + 0.5) * r.width; const py = r.top + (-p.y * 0.5 + 0.5) * r.height;
      x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py); } }
  const pad = 40; x0 = Math.max(r.left, x0 - pad); y0 = Math.max(r.top, y0 - pad); x1 = Math.min(r.right, x1 + pad); y1 = Math.min(r.bottom, y1 + pad);
  if (!(x1 > x0 && y1 > y0)) return null;
  return { x: Math.round(x0), y: Math.round(y0), width: Math.round(x1 - x0), height: Math.round(y1 - y0) };
})`;
async function closeFrame(page, unitId, panelId, file) {
  const rect = await page.ask(`${RECT}(${j(unitId)}, ${j(panelId)})`);
  if (!rect) { await page.screenshot(`${SHOTS}${file}`); return 'no rect, full frame'; }
  const scale = Math.max(1, Math.min(3, Math.floor(1400 / Math.max(rect.width, rect.height))));
  await page.screenshot(`${SHOTS}${file}`, { ...rect, scale });
  return `clip ${rect.width}x${rect.height} at ${rect.x},${rect.y} scale ${scale}`;
}

// ─── THE HANDS (all real events; nothing writes a store) ───────────────────
const grabIds = (page, id) => page.ask(`(() => { const r = ${S}.unitResult(${j(id)}); const pick = [];
  for (const f of [(p) => p.part === 'FRONT', (p) => p.role === 'front', (p) => p.id === 'TOP' || p.part === 'TOP', (p) => p.role === 'side', (p) => p.role === 'back']) {
    for (const p of r.panels) if (f(p) && !(p.meta && p.meta.frontDecorationParent) && !pick.includes(p.id)) pick.push(p.id);
  }
  return pick.length ? pick : r.panels.map((p) => p.id); })()`);
const selectedIs = (unitId) => `${UI}.selectedUnitId === ${j(unitId)} && !${UI}.selectedElement && Boolean(document.querySelector('[data-section="Carcass"]'))`;
async function selectUnit(page, unitId) {
  if (await page.ask(selectedIs(unitId))) return true;
  if (await page.ask(`Boolean(${UI}.selectedElement)`)) await key(page, 'Escape');
  for (const pid of (await grabIds(page, unitId)).slice(0, 6)) {
    const at = await reachFree(page, unitId, pid);
    if (!at) continue;
    await clickWith(page, at.x, at.y);
    if (await until(page, selectedIs(unitId), 4000)) return true;
  }
  return false;
}
async function sectionOpen(page, title) {
  if (await page.has(`[data-section="${title}"][data-open="0"]`)) await page.press(`[data-section="${title}"] > button`);
  return page.has(`[data-section="${title}"][data-open="1"]`);
}
async function closeLibrary(page) {
  if (await page.has('[aria-label="Close the library"]')) await page.press('[aria-label="Close the library"]');
}
async function addFromLibrary(page, spec) {
  const before = new Set((await unitsNow(page)).map((u) => u.id));
  const ok = await library(page, spec);
  const added = (await unitsNow(page)).filter((u) => !before.has(u.id) && u.type !== 'FREE_PANEL');
  await closeLibrary(page);
  return { ok, unit: added[0] || null, said: await lastSaid(page) };
}
const leavesOf = (page, unitId) => page.ask(`${S}.unitResult(${j(unitId)}).panels.filter((p) => p.role === 'front').map((p) => p.id)`);
async function addDoors(page, unitId) {
  if ((await leavesOf(page, unitId)).length) return 'had leaves';
  if (!(await selectUnit(page, unitId))) return 'could not select the unit';
  if (!(await sectionOpen(page, 'Doors'))) return 'no Doors section';
  const btn = await page.ask('[...document.querySelectorAll(\'button.cc-btn-gold\')].some((b) => b.offsetParent && /Add doors/.test(b.textContent))');
  if (!btn) return 'no Add doors button';
  await page.press('button.cc-btn-gold', 'Add doors');
  await until(page, `${S}.unitResult(${j(unitId)}).panels.some((p) => p.role === 'front')`, 8000);
  return 'Add doors pressed';
}
const FT = 'document.querySelector(\'[data-unit-front-type]\')';
async function setStyleGL(page, unitId) {
  if (!(await selectUnit(page, unitId))) return { ok: false, why: 'could not select the unit' };
  await sectionOpen(page, 'Carcass');
  const res = await choose(page, FT, 'GL');
  await until(page, `${S}.unitResult(${j(unitId)}).panels.some((p) => p.role === 'front' && p.meta && p.meta.glass)`, 12000);
  await page.sleep(1500);
  return res;
}
/** A 2klik on the leaf (the app's own gesture: it swings AND opens the piece's window, which is shut by its X). */
async function dblclickLeaf(page, unitId, leafId) {
  const at = await reachFree(page, unitId, leafId);
  if (!at) return { at: null };
  await page.dblclick(at.x, at.y);
  await page.sleep(2500);
  const modal = await page.ask(`${UI}.modal || null`);
  if (modal) {
    const x = await boxOf(page, `[...document.querySelectorAll('[data-modal-name="${modal}"] button')].find((b) => b.textContent.trim() === '×')`);
    if (x) await clickWith(page, x.x, x.y);
  }
  await settleCamera(page);
  await page.sleep(1200);
  return { at, modal };
}

/** The readings of one leaf said in the table's words. */
function describe(where, m, leaf) {
  const u = m.unit;
  const unitLine = `${u.type} ${u.num || u.id} on wall ${u.wall}, x_mm ${u.x_mm}, ${u.w} x ${u.h} x ${u.d}, ${u.mountHeight != null ? `mount ${r1(u.mountHeight)}` : `legs ${r1(u.legHeight)}`}; unit group at world [${fmt(m.origin)}] mm, rotY ${m.rotYdeg} deg`;
  row(`${where}: the unit and its frame`, 'a glazed unit in the room', unitLine, 'UnitView.jsx 1743 (origin = wallStart + x_mm along, baseY up), 2495 to 2503 (group at origin, rotated to the wall)');
  if (!leaf) { row(`${where}: a glazed leaf`, 'a front with meta.glass', 'NONE', 'cabinet.js 7757 (glassFronts)'); return; }
  const b = leaf.box;
  row(`${where}: leaf ${leaf.id} record`, 'p.box in the unit frame and meta.glass on it',
    `p.box x ${b.x} y ${b.y} z ${b.z} w ${b.w} h ${b.h} d ${b.d}; t ${leaf.thickness}; hinge ${leaf.hinge}; frontType ${leaf.frontType}; meta.glass ${leaf.glass ? `frame ${leaf.glass.frame}, aperture ${leaf.glass.aperture.w} x ${leaf.glass.aperture.h}` : 'NONE'} (no x, y, z on it)`,
    'cabinet.js 7772 to 7778 (meta.glass = { frame, aperture: { w, h } }); shaker.js 169 to 179 (aperture rect x1 = f, y1 = f, x2 = w - f, y2 = h - f: centred on the leaf)');
  if (!leaf.door) { row(`${where}: door mesh`, 'a mesh with ccPanelId', 'NONE', 'UnitView.jsx'); return; }
  const dl = leaf.door.local; const dw = leaf.door.world;
  row(`${where}: door mesh, shut`, `centre in the unit frame = [${fmt(leaf.expectedLocalCentre)}] (p.box centre)`,
    `unit frame centre [${fmt(dl.centre)}], size [${fmt(dl.size)}]; world centre [${fmt(dw.centre)}], world box y ${fmt(dw.min[1])}..${fmt(dw.max[1])}`,
    'UnitView.jsx 876 to 886 (pivot and meshOffset), 973 (the swing group at pivot)');
  if (!leaf.pane) { row(`${where}: pane mesh`, 'a mesh with ccGlassPane', 'NONE in the scene', 'UnitView.jsx 1036 (p.meta?.glass)'); return; }
  const pl = leaf.pane.local; const pw = leaf.pane.world;
  row(`${where}: pane mesh, shut`, `centre in the unit frame = [${fmt(leaf.expectedLocalCentre)}], the door's own centre; size ${leaf.glass.aperture.w} x ${leaf.glass.aperture.h} x 4`,
    `unit frame centre [${fmt(pl.centre)}], size [${fmt(pl.size)}]; world centre [${fmt(pw.centre)}], world box y ${fmt(pw.min[1])}..${fmt(pw.max[1])}, z ${fmt(pw.min[2])}..${fmt(pw.max[2])}`,
    'UnitView.jsx 1037 to 1041 (position = [-pivot[0] + mm(frame + aperture.w / 2 - box.w / 2), -pivot[1], -pivot[2]]: no p.box.x, p.box.y, p.box.z)');
  row(`${where}: pane minus door, shut`, '[0, 0, 0] in the unit frame (the pane sits in the leaf)',
    `pane centre minus p.box centre, unit frame: [${fmt(leaf.paneMinusExpectedLocal)}] mm; pane minus door mesh, world: [${fmt(leaf.paneMinusDoorWorld)}] mm; pane.position in the swing group [${fmt(leaf.pane.position)}] vs door mesh position [${fmt(leaf.door.position)}]; same group ${leaf.sameGroup}`,
    'UnitView.jsx 1037 to 1041 against 1017 to 1024 (the mirror backs p.box out of pivot; the pane backs 0 out of pivot)');
}

// ═══ A · PRO, A WUD_GLASS BY THE REAL LIBRARY ROW ═══════════════════════════
async function probeWud() {
  console.log('\n## A · PRO, WUD_GLASS (Library, Kitchen, Wall units, Glass unit)');
  const page = await open();
  try {
    await pro(page);
    note(`build ${await stamp(page)}`);
    const added = await addFromLibrary(page, { category: 'Kitchen', group: 'wall-units', entry: 'glass-unit' });
    row('PRO: Library, Kitchen, Wall units, "Glass unit" row (real click)', 'a WUD_GLASS in the room',
      added.unit ? `${added.unit.type} ${added.unit.id} on wall ${added.unit.wall}, x_mm ${added.unit.x}, ${added.unit.w} x ${added.unit.h} x ${added.unit.d}` : `nothing added (${j(added.said)})`,
      'library.js 240 (glass-unit, WUD_GLASS); types.js 539 (frontType GL)');
    if (!added.unit) return;
    const id = added.unit.id;
    const doors = await addDoors(page, id);
    const ids = await leavesOf(page, id);
    row('PRO: Doors section, "Add doors" (real click)', 'one GL leaf with meta.glass', `${doors}; leaves ${j(ids)}`, 'RightPanel.jsx Doors section; cabinet.js 7757 (isGlassFront)');
    await settleCamera(page);
    const m0 = await measure(page, id);
    readings.wud = { shut: m0 };
    if (m0.why) { row('PRO: measure', 'readings', m0.why, ''); return; }
    const leaf = m0.leaves.find((l) => l.glass) || m0.leaves[0];
    describe('PRO WUD_GLASS', m0, leaf);
    row('PRO WUD_GLASS: BOM', 'one "Glass pane" line to the aperture', m0.bom.map((h) => `${h.role} "${h.label}" x${h.qty} ${j(h.spec)}`).join('; ') || 'none', 'cabinet.js 9741 to 9748 (hw glass_pane "Glass pane", spec { aperture_w_mm, aperture_h_mm }, label "W x H mm aperture"); partRegistry.js 298 ("Glass panes"); no kind of glass anywhere');
    await page.screenshot(`${SHOTS}f12-probe-01-wud-wide.png`);
    if (leaf) note(`close frame: ${await closeFrame(page, id, leaf.id, 'f12-probe-02-wud-close.png')}`);
    if (leaf && leaf.door) {
      const dc = await dblclickLeaf(page, id, leaf.id);
      const m1 = await measure(page, id);
      readings.wud.open = m1;
      const L1 = m1.leaves.find((l) => l.id === leaf.id);
      const open = m1.open[leaf.id];
      const doorMoved = L1 && L1.door ? L1.door.world.centre.map((c, i) => r1(c - leaf.door.world.centre[i])) : null;
      const paneMoved = L1 && L1.pane ? L1.pane.world.centre.map((c, i) => r1(c - leaf.pane.world.centre[i])) : null;
      row('PRO WUD_GLASS: 2klik on the leaf (real mouse), door open', 'the door swings and the pane swings with it (same world displacement)',
        `${dc.at ? `2klik at ${dc.at.x},${dc.at.y}` : 'leaf out of reach'}; openFronts ${open}; swing group rotY ${L1 && L1.door ? L1.door.parentRotYdeg : '?'} deg; door centre moved [${fmt(doorMoved)}] mm; pane centre moved [${fmt(paneMoved)}] mm; pane minus door, world, now [${fmt(L1 && L1.paneMinusDoorWorld)}]`,
        'UnitView.jsx 946 to 947 (rotation.y about the swing group origin), 1037 (the pane is in the group but at the group origin, so it turns about itself)');
      await page.screenshot(`${SHOTS}f12-probe-03-wud-open-wide.png`);
      note(`close frame: ${await closeFrame(page, id, leaf.id, 'f12-probe-04-wud-open-close.png')}`);
    }
  } finally { await page.close(); }
}

// ═══ B · PRO, A WARDROBE SET TO GLASS BY THE REAL FRONT TYPE SELECT ═════════
async function probeWardrobe() {
  console.log('\n## B · PRO, WARDROBE, Front type "Glass" by the real select');
  const page = await open();
  try {
    await pro(page);
    note(`build ${await stamp(page)}`);
    const added = await addFromLibrary(page, { category: 'Wardrobes', group: null, entry: 'WARDROBE' });
    row('PRO: Library, Wardrobes, "Wardrobe" row (real click)', 'a WARDROBE in the room',
      added.unit ? `${added.unit.type} ${added.unit.id} on wall ${added.unit.wall}, x_mm ${added.unit.x}, ${added.unit.w} x ${added.unit.h} x ${added.unit.d}` : `nothing added (${j(added.said)})`, 'library.js (Wardrobes, WARDROBE)');
    if (!added.unit) return;
    const id = added.unit.id;
    const doors = await addDoors(page, id);
    const ids = await leavesOf(page, id);
    const sel = await setStyleGL(page, id);
    row('PRO: Doors "Add doors", then Carcass, Front type select: "Glass" (click, arrows, Enter)', 'every leaf GL with meta.glass',
      `${doors}; leaves ${j(ids)}; select ${sel.ok ? `${sel.before.value || '(project)'} -> ${sel.after.value} "${sel.label}"` : sel.why}`,
      'RightPanel.jsx 467 (data-unit-front-type); design.js 46 (GL "Glass"); cabinet.js 912 (frontType = front_type)');
    await settleCamera(page);
    const m0 = await measure(page, id);
    readings.wardrobe = { shut: m0 };
    if (m0.why) { row('PRO: measure', 'readings', m0.why, ''); return; }
    for (const leaf of m0.leaves) describe(`PRO WARDROBE leaf ${leaf.id}`, m0, leaf);
    row('PRO WARDROBE: BOM', 'one "Glass pane" line per aperture size, qty the leaves', m0.bom.map((h) => `${h.role} "${h.label}" x${h.qty} ${j(h.spec)}`).join('; ') || 'none', 'cabinet.js 9741 to 9748');
    await page.screenshot(`${SHOTS}f12-probe-05-wardrobe-wide.png`);
    const leaf = m0.leaves.find((l) => l.pane && l.door);
    if (leaf) note(`close frame: ${await closeFrame(page, id, leaf.id, 'f12-probe-06-wardrobe-close.png')}`);
    if (leaf) {
      const dc = await dblclickLeaf(page, id, leaf.id);
      const m1 = await measure(page, id);
      readings.wardrobe.open = m1;
      const L1 = m1.leaves.find((l) => l.id === leaf.id);
      const doorMoved = L1 && L1.door ? L1.door.world.centre.map((c, i) => r1(c - leaf.door.world.centre[i])) : null;
      const paneMoved = L1 && L1.pane ? L1.pane.world.centre.map((c, i) => r1(c - leaf.pane.world.centre[i])) : null;
      row(`PRO WARDROBE: 2klik on leaf ${leaf.id} (real mouse), door open`, 'the door swings and the pane swings with it',
        `${dc.at ? `2klik at ${dc.at.x},${dc.at.y}` : 'leaf out of reach'}; openFronts ${m1.open[leaf.id]}; swing group rotY ${L1 && L1.door ? L1.door.parentRotYdeg : '?'} deg; door centre moved [${fmt(doorMoved)}] mm; pane centre moved [${fmt(paneMoved)}] mm; pane minus door, world, now [${fmt(L1 && L1.paneMinusDoorWorld)}]`,
        'UnitView.jsx 946 to 947, 1037 to 1041');
      await page.screenshot(`${SHOTS}f12-probe-07-wardrobe-open-wide.png`);
      note(`close frame: ${await closeFrame(page, id, leaf.id, 'f12-probe-08-wardrobe-open-close.png')}`);
    }
  } finally { await page.close(); }
}

// ═══ C · RETAIL, A WARDROBE SET TO GLASS IN THE FRONTS STEP ═════════════════
async function probeRetail() {
  console.log('\n## C · RETAIL (retail.html#/design), WHERE add wardrobe, FRONTS "GLASS"');
  const page = await open();
  try {
    await room(page);
    await page.press('[data-testid="cat-where"]');
    await page.press('[data-testid="where-add-wardrobe"]');
    await page.sleep(1500);
    const units = await unitsNow(page);
    const w = units.find((u) => u.type === 'WARDROBE');
    row('RETAIL: WHERE, "add wardrobe" (real click)', 'a WARDROBE in the room', w ? `${w.type} ${w.id} on wall ${w.wall}, x_mm ${w.x}, ${w.w} x ${w.h} x ${w.d}` : 'none', 'retail Options.jsx 241 (where-add-wardrobe)');
    if (!w) return;
    const id = w.id;
    await page.press('[data-testid="cat-fronts"]');
    const addBtn = await page.ask('(() => { const b = document.querySelector(\'[data-testid="fronts-add-doors"]\'); return b ? { disabled: b.disabled } : null; })()');
    if (addBtn && !addBtn.disabled) await page.press('[data-testid="fronts-add-doors"]');
    await until(page, `${S}.unitResult(${j(id)}).panels.some((p) => p.role === 'front')`, 8000);
    const tile = await page.ask('(() => { const b = document.querySelector(\'[data-testid="fronts-style-GL"]\'); return b ? { disabled: b.disabled, refused: b.getAttribute(\'data-refused\'), on: b.getAttribute(\'data-on\') } : null; })()');
    if (tile && !tile.disabled) await page.press('[data-testid="fronts-style-GL"]');
    const got = await until(page, `${S}.unitResult(${j(id)}).panels.some((p) => p.role === 'front' && p.meta && p.meta.glass)`, 12000);
    await page.sleep(1500);
    row('RETAIL: FRONTS, ADD DOORS, then the "GLASS" style row (real clicks)', 'every leaf GL with meta.glass',
      `add-doors ${j(addBtn)}; GL tile ${j(tile)}; meta.glass on a leaf: ${Boolean(got)}; said ${j(await page.ask('[...document.querySelectorAll(\'[data-testid^="fronts-style-refused"]\')].map((e) => e.textContent.trim())'))}`,
      'retail Options.jsx 769 (fronts-style-GL), adapter.js 202 (GL live), 214 (frontStyles: boardRefusal)');
    await settleCamera(page);
    const m0 = await measure(page, id);
    readings.retail = { shut: m0 };
    if (m0.why) { row('RETAIL: measure', 'readings', m0.why, 'retail Stage.jsx 103 (Scene), Scene.jsx 2190 (ViewHandle room)'); return; }
    for (const leaf of m0.leaves) describe(`RETAIL WARDROBE leaf ${leaf.id}`, m0, leaf);
    await page.screenshot(`${SHOTS}f12-probe-09-retail-wide.png`);
    const leaf = m0.leaves.find((l) => l.pane && l.door);
    if (leaf) note(`close frame: ${await closeFrame(page, id, leaf.id, 'f12-probe-10-retail-close.png')}`);
    if (leaf) {
      const at = await reachFree(page, id, leaf.id);
      if (at) { await page.dblclick(at.x, at.y); await page.sleep(2500); await settleCamera(page); await page.sleep(1000); }
      const m1 = await measure(page, id);
      readings.retail.open = m1;
      const L1 = m1.leaves.find((l) => l.id === leaf.id);
      const doorMoved = L1 && L1.door ? L1.door.world.centre.map((c, i) => r1(c - leaf.door.world.centre[i])) : null;
      const paneMoved = L1 && L1.pane ? L1.pane.world.centre.map((c, i) => r1(c - leaf.pane.world.centre[i])) : null;
      row(`RETAIL: 2klik on leaf ${leaf.id} (real mouse), door open`, 'the door swings and the pane swings with it',
        `${at ? `2klik at ${at.x},${at.y}` : 'leaf out of reach'}; openFronts ${m1.open[leaf.id]}; swing group rotY ${L1 && L1.door ? L1.door.parentRotYdeg : '?'} deg; door centre moved [${fmt(doorMoved)}] mm; pane centre moved [${fmt(paneMoved)}] mm; pane minus door, world, now [${fmt(L1 && L1.paneMinusDoorWorld)}]`,
        'the same UnitView.jsx (retail draws the room with Scene.jsx and UnitView.jsx)');
      await page.screenshot(`${SHOTS}f12-probe-11-retail-open-wide.png`);
      note(`close frame: ${await closeFrame(page, id, leaf.id, 'f12-probe-12-retail-open-close.png')}`);
    }
  } finally { await page.close(); }
}

console.log('| # | Gesture or call | Expected | Observed | File:line that decides it |');
console.log('| - | - | - | - | - |');
try {
  if (runs('wud')) await probeWud();
  if (runs('wardrobe')) await probeWardrobe();
  if (runs('retail')) await probeRetail();
} finally {
  await showroomDown();
}
// A run of named sections writes files of its own, so two probes running at
// once (each browser on its own port) cannot overwrite each other's rows.
const tag = sections.length ? `.${sections.join('-')}` : '';
writeFileSync(`${SHOTS}f12-probe${tag}.rows.md`, `${['| # | Gesture or call | Expected | Observed | File:line that decides it |', '| - | - | - | - | - |', ...rows].join('\n')}\n`);
writeFileSync(`${SHOTS}f12-probe${tag}.json`, `${JSON.stringify(readings, null, 2)}\n`);
console.log(`\nrows: ${SHOTS}f12-probe${tag}.rows.md; readings: ${SHOTS}f12-probe${tag}.json`);
