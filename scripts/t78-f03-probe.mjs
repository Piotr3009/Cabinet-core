// T78 F3 · PROBE: AN L DOOR WITH A DECORATIVE FRONT READS 40 MM THICK
//
// The owner, 11.10.2026: *"drzwiczki na L shape sa i jak sa ozdobne to maja
// grubosc okolo 40 mm."*
//
// CLAUDE.md T78 LAWS: *"diagnose before you cut (every BUG starts with a
// committed PROBE table)"* and *"test the way the client clicks (real mouse)."*
// This probe READS the code and the running app and writes numbers. It fixes
// nothing and writes no store: the L is placed by the real library row, its
// doors by the real "Add doors" button, the front style by the real
// <select> (a click, the arrows, Enter), exactly as scripts/t77-walk.mjs f03
// did it; the store is only read (`window.__cc.project.getState()`,
// `window.__cc.ui.getState()`, `window.__cc.views.room`).
//
// WHAT IS MEASURED, per style (Flat, Shaker, Grooved, Ornate A, Arched):
//   · every panel of the L with role 'front': its record (thickness, box,
//     meta.arm, the decoration's style and status);
//   · every mesh the scene draws those panels with: the geometry's own
//     bounding box (x, y, z extents in mm, in the mesh's frame), its vertex
//     count and the style the solid is marked with, and the mesh's box in the
//     UNIT's frame (x along wall A, y up, z out of wall A);
//   · the cut list: the BOM panel's Parts rows for the two leaves (the
//     material cell carries the thickness);
//   · frames: verify/t78/f03-probe-<style>.png (the room) and
//     verify/t78/f03-probe-<style>-doors.png (the camera brought in on the
//     two leaves).
//
// HOW TO RUN (the app already built and served; E2E_URL defaults to
// http://127.0.0.1:4173/):
//     node scripts/t78-f03-probe.mjs                 # all five styles
//     node scripts/t78-f03-probe.mjs F ORNATE_A_1    # a subset, Flat first
//     node scripts/t78-f03-probe.mjs tree            # no browser: the WORKING
//         TREE's solid builders and UnitView turn, measured in node (the fix)
// The table rows are printed to stdout and to verify/t78/f03-probe.rows.md so
// verify/t78/f03-probe.md can be re-made from them.

import { mkdirSync, writeFileSync } from 'node:fs';
import {
  open, pro, unitsNow, settleCamera, pointOn, showroomDown,
} from './t74-harness.mjs';
import {
  choose, clickWith, boxOf, until, reachFree, key, orbitFree,
} from './t75-harness.mjs';

const SHOTS = 'verify/t78/';
mkdirSync(SHOTS, { recursive: true });
const ALL = ['F', 'S', 'G', 'ORNATE_A_1', 'ORNATE_A_2', 'A'];
const LABEL = {
  F: 'Flat', S: 'Shaker', G: 'Grooved', ORNATE_A_1: 'Ornate A - Classic', ORNATE_A_2: 'Ornate A - Symmetric', A: 'Arched',
};
const wanted = process.argv.slice(2).filter((a) => ALL.includes(a));
const STYLES = wanted.length ? wanted : ALL;

const S = 'window.__cc.project.getState()';
const j = (v) => JSON.stringify(v);
const r1 = (v) => (v == null ? null : Math.round(Number(v) * 10) / 10);
// The app's own sentences carry a long dash; the table may not (the owner's law).
const undash = (s) => String(s).replace(/[–—]/g, '-');

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
const frames = [];
const shot = async (page, file, clip = null) => {
  await page.screenshot(`${SHOTS}${file}`, clip);
  frames.push(file);
  return file;
};
const stamp = (page) => page.ask('((document.body.innerText || \'\').match(/#\\d+ · [0-9-]+ [0-9:]+ UTC · [0-9a-f]{7}/) || [null])[0]');
const pageErrors = (page) => page.errors.filter((e) => !/props\/manifest\.json|favicon|hardware-local|showroom|ERR_TUNNEL_CONNECTION_FAILED|supabase\.co|fonts\.g/i.test(e));

// ─── WHAT THE PROBE READS ──────────────────────────────────────────────────
/** The L's own numbers and every front it carries, as the engine cut them. */
const unitNow = (page, unitId) => page.ask(`(() => { const P = ${S}; const u = P.units.find((x) => x.id === ${j(unitId)});
  if (!u) return null; const r = P.unitResult(u.id); const lc = r.derived && r.derived.corner_l;
  const pick = (b) => (b ? { x: b.x, y: b.y, z: b.z, w: b.w, h: b.h, d: b.d } : null);
  return { id: u.id, type: u.type, num: u.params.unit_num, w: u.params.width, h: u.params.height, d: u.params.depth,
    frontT: u.params.front_t ?? null, frontType: u.params.front_type || null, side: u.params.corner_side ?? null, arm: lc ? lc.arm : null,
    gap: window.__cc.profile.getState().profile.doors.gap, cornerClear: window.__cc.profile.getState().profile.doors.clearance.corner,
    fronts: r.panels.filter((p) => p.role === 'front').map((p) => { const d = p.meta && p.meta.frontDecoration;
      return { id: p.id, part: p.part, role: p.role, arm: (p.meta && p.meta.arm) || null, lBoard: (p.meta && p.meta.lBoard) || null,
        w: p.w, h: p.h, thickness: p.thickness, box: pick(p.box), frontType: (p.meta && p.meta.frontType) || null,
        shaker: p.meta && p.meta.shaker ? { frame: p.meta.shaker.frame, depth: p.meta.shaker.depth } : null,
        parent: (p.meta && p.meta.frontDecorationParent) || null,
        deco: d ? { style: d.style, status: d.status, ops: (d.operations || []).length, additions: (d.additions || []).length,
          outlineW: d.outline && d.outline.length ? Math.max(...d.outline.map((q) => q[0])) : null,
          outlineH: d.outline && d.outline.length ? Math.max(...d.outline.map((q) => q[1])) : null,
          problems: (d.problems || []).map((x) => x.code + ': ' + x.message) } : null,
        cncW: p.cnc ? p.cnc.drawn_w : null, cncH: p.cnc ? p.cnc.drawn_h : null,
        swingZ: (p.meta && p.meta.swingZ) || null, hinge: (p.meta && p.meta.hinge) || null }; }),
    sides: r.panels.filter((p) => p.role === 'side' || p.role === 'top').map((p) => ({ id: p.id, box: pick(p.box) })),
    csv: r.csvLines.filter((l) => /-F(-|,)/.test(l)) }; })()`);

/**
 * Every mesh the scene draws the L's fronts with: the geometry's OWN bounding
 * box (the mesh's frame, mm), and the same box taken into the UNIT's frame
 * (x along wall A, y up, z out of wall A), so a solid built the wrong way
 * round is seen as the size it stands at.
 */
const meshesOf = (page, unitId, ids) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null; const T = v.three;
  let unit = null; v.scene.traverse((o) => { if (!unit && o.userData && o.userData.ccUnitId === ${j(unitId)}) unit = o; });
  if (!unit) return null; unit.updateMatrixWorld(true); const inv = new T.Matrix4().copy(unit.matrixWorld).invert();
  const want = ${j(ids)}; const out = {}; const r = (q) => Math.round(q * 10) / 10;
  unit.traverse((o) => { if (!o.isMesh || !o.userData || !want.includes(o.userData.ccPanelId)) return;
    const g = o.geometry; const nv = (g && g.attributes && g.attributes.position) ? g.attributes.position.count : 0;
    const prev = out[o.userData.ccPanelId]; if (prev && prev.vertices >= nv) return;
    if (!g.boundingBox) g.computeBoundingBox(); const b = g.boundingBox;
    const lo = [Infinity, Infinity, Infinity]; const hi = [-Infinity, -Infinity, -Infinity];
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
      const p = new T.Vector3(x, y, z).applyMatrix4(o.matrixWorld).applyMatrix4(inv); const q = [p.x * 1000, p.y * 1000, p.z * 1000];
      for (let i = 0; i < 3; i += 1) { lo[i] = Math.min(lo[i], q[i]); hi[i] = Math.max(hi[i], q[i]); } }
    out[o.userData.ccPanelId] = { vertices: nv, uuid: g.uuid, kind: g.type,
      style: (g.userData && g.userData.frontDecoration) ? g.userData.frontDecoration.style : null,
      own: { x: [r(b.min.x * 1000), r(b.max.x * 1000)], y: [r(b.min.y * 1000), r(b.max.y * 1000)], z: [r(b.min.z * 1000), r(b.max.z * 1000)] },
      ownSize: { w: r((b.max.x - b.min.x) * 1000), h: r((b.max.y - b.min.y) * 1000), depthMm: r((b.max.z - b.min.z) * 1000) },
      unit: { x: [r(lo[0]), r(hi[0])], y: [r(lo[1]), r(hi[1])], z: [r(lo[2]), r(hi[2])] },
      unitSize: { x: r(hi[0] - lo[0]), y: r(hi[1] - lo[1]), z: r(hi[2] - lo[2]) }, visible: o.visible }; });
  return out; })()`);

/**
 * WHAT THE EYE GETS: the canvas sampled on a grid, the scene's own raycaster
 * cast from every pixel; where the first visible mesh is one of the L's
 * leaves, its face normal (taken into the UNIT's frame and named by axis) and
 * the hit point are kept. Per leaf: how many pixels, which faces, and the
 * extents of the points seen on each face, so a face that should not be
 * there (a solid reaching into the carcass) is named by where it was seen.
 */
const seenOf = (page, unitId, ids) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null; const T = v.three;
  let unit = null; v.scene.traverse((o) => { if (!unit && o.userData && o.userData.ccUnitId === ${j(unitId)}) unit = o; });
  if (!unit) return null; unit.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(unit.matrixWorld).invert(); const rotInv = new T.Matrix3().setFromMatrix4(inv);
  const want = ${j(ids)}; const r = v.gl.domElement.getBoundingClientRect(); const ray = new T.Raycaster();
  const hidden = (o) => { for (let a = o; a; a = a.parent) { if (a.visible === false) return true; if (a.userData && a.userData.ccHelper) return true; } return false; };
  const out = {}; const N = 150; const M = 100; const nm = new T.Matrix3();
  for (let i = 0; i <= N; i += 1) for (let k = 0; k <= M; k += 1) {
    const nx = -1 + 2 * i / N; const ny = -1 + 2 * k / M;
    ray.setFromCamera(new T.Vector2(nx, ny), v.camera);
    const hit = ray.intersectObjects(v.scene.children, true).find((h) => h.object.isMesh && !hidden(h.object));
    if (!hit || !hit.object.userData || !want.includes(hit.object.userData.ccPanelId) || !hit.face) continue;
    const id = hit.object.userData.ccPanelId;
    nm.getNormalMatrix(hit.object.matrixWorld);
    const n = hit.face.normal.clone().applyMatrix3(nm).normalize().applyMatrix3(rotInv).normalize();
    const p = hit.point.clone().applyMatrix4(inv); const q = [p.x * 1000, p.y * 1000, p.z * 1000];
    const ax = ['x', 'y', 'z']; let best = 0; for (let a = 1; a < 3; a += 1) if (Math.abs(n.getComponent(a)) > Math.abs(n.getComponent(best))) best = a;
    const face = (n.getComponent(best) > 0 ? '+' : '-') + ax[best];
    const rec = out[id] || (out[id] = { pixels: 0, faces: {} }); rec.pixels += 1;
    const f = rec.faces[face] || (rec.faces[face] = { n: 0, lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity] });
    f.n += 1; for (let a = 0; a < 3; a += 1) { f.lo[a] = Math.min(f.lo[a], q[a]); f.hi[a] = Math.max(f.hi[a], q[a]); }
  }
  const r1 = (x) => Math.round(x * 10) / 10;
  for (const id of Object.keys(out)) for (const f of Object.values(out[id].faces)) { f.lo = f.lo.map(r1); f.hi = f.hi.map(r1); }
  return out; })()`);
const saySeen = (s) => (s ? `${s.pixels} px: ${Object.entries(s.faces).sort((a, b) => b[1].n - a[1].n).map(([f, q]) => `${f} ${q.n} px at x ${q.lo[0]}..${q.hi[0]}, y ${q.lo[1]}..${q.hi[1]}, z ${q.lo[2]}..${q.hi[2]}`).join('; ')}` : 'not seen');

/** The BOM panel's Parts rows (the material cell carries the thickness), by a real click on its button. */
const BOM_ASIDE = '[...document.querySelectorAll(\'aside\')].find((a) => /Bill of materials/.test(a.textContent))';
async function bomRead(page, file) {
  if (!(await page.ask(`Boolean(${BOM_ASIDE})`))) await page.press('button[title="Bill of materials"]');
  await until(page, `Boolean(${BOM_ASIDE}) && Boolean((${BOM_ASIDE}).querySelector('tbody tr'))`, 6000);
  const out = await page.ask(`(() => { const a = ${BOM_ASIDE}; if (!a) return null;
    return [...a.querySelectorAll('tbody tr')].map((tr) => { const td = [...tr.querySelectorAll('td')]; if (td.length < 9) return { head: tr.textContent.trim() };
      const cell = td[1]; const id = ((cell.childNodes[0] && cell.childNodes[0].textContent) || '').trim(); const man = cell.querySelector('[data-front-manufacturing]');
      return { unit: td[0].textContent.trim(), id, construction: man ? man.textContent.trim() : null, material: td[2].textContent.trim(),
        w: td[3].textContent.trim(), h: td[4].textContent.trim(), qty: td[5].textContent.trim(), state: td[8].textContent.trim() }; }); })()`);
  if (file) {
    const last = await page.ask(`(() => { const a = ${BOM_ASIDE}; const trs = a ? [...a.querySelectorAll('tbody tr')] : []; const b = trs.length ? trs[trs.length - 1].getBoundingClientRect() : null; const t = a ? a.getBoundingClientRect() : null; return t && b ? { x: t.left, y: t.top, w: t.width, h: Math.min(t.height, b.bottom - t.top + 12) } : null; })()`);
    if (last) await shot(page, file, { x: Math.round(last.x), y: Math.round(last.y), width: Math.round(last.w), height: Math.round(last.h), scale: 1 });
  }
  const x = await boxOf(page, `(() => { const a = ${BOM_ASIDE}; return a ? [...a.querySelectorAll('button')].find((b) => b.textContent.trim() === '×') : null; })()`);
  if (x) await clickWith(page, x.x, x.y);
  return out || [];
}

// ─── THE HANDS (T77's, the real ones) ──────────────────────────────────────
async function hideDimensions(page) {
  if (await page.ask('[...document.querySelectorAll(\'button\')].some((b) => b.offsetParent && b.textContent.trim() === \'Hide dimensions\')')) {
    await page.click('button', 'Hide dimensions', { exact: true });
    await page.sleep(500);
    return true;
  }
  return false;
}
async function addFromLibrary(page, { category = 'Kitchen', path = [], entry }) {
  const before = new Set((await unitsNow(page)).map((u) => u.id));
  const listed = () => page.has(`[data-library-entry="${entry}"]`);
  if (!(await listed())) {
    await page.press('nav[aria-label="Main menu"] > div > button', 'Library');
    await page.press('[role="menuitem"]', category);
    await page.sleep(500);
    for (const g of path) {
      if (await listed()) break;
      if (!(await page.has(`[data-library-flyout="${g}"]`))) await page.press(`[data-library-group="${g}"]`);
    }
    if (!(await listed()) && await page.has('[data-library-show-all="1"]')) {
      await page.press('[data-library-show-all="1"]');
      for (const g of path) if (!(await listed()) && !(await page.has(`[data-library-flyout="${g}"]`))) await page.press(`[data-library-group="${g}"]`);
    }
  }
  if (!(await listed())) return { ok: false, unit: null };
  await page.press(`[data-library-entry="${entry}"]`);
  await page.sleep(1300);
  const added = (await unitsNow(page)).filter((u) => !before.has(u.id) && u.type !== 'FREE_PANEL');
  if (await page.has('[aria-label="Close the library"]')) await page.press('[aria-label="Close the library"]');
  return { ok: true, unit: added[0] || null };
}
async function sectionOpen(page, title) {
  if (await page.has(`[data-section="${title}"][data-open="0"]`)) await page.press(`[data-section="${title}"] > button`);
  return page.has(`[data-section="${title}"][data-open="1"]`);
}
const grabIds = (page, id) => page.ask(`(() => { const r = ${S}.unitResult(${j(id)}); const pick = [];
  for (const f of [(p) => p.part === 'FRONT', (p) => p.role === 'front', (p) => p.id === 'TOP-L', (p) => p.role === 'side', (p) => p.role === 'back']) {
    for (const p of r.panels) if (f(p) && !(p.meta && p.meta.frontDecorationParent) && !pick.includes(p.id)) pick.push(p.id);
  }
  return pick.length ? pick : r.panels.map((p) => p.id); })()`);
const selectedIs = (unitId) => `window.__cc.ui.getState().selectedUnitId === ${j(unitId)} && !window.__cc.ui.getState().selectedElement && Boolean(document.querySelector('[data-section="Carcass"]'))`;
async function selectUnit(page, unitId) {
  if (await page.ask(selectedIs(unitId))) return true;
  if (await page.ask('Boolean(window.__cc.ui.getState().selectedElement)')) {
    const blank = await boxOf(page, 'document.querySelector(\'header > div.flex-1\')');
    if (blank) await clickWith(page, blank.x, blank.y);
    await key(page, 'Escape');
  }
  for (const pid of (await grabIds(page, unitId)).slice(0, 5)) {
    const at = await reachFree(page, unitId, pid);
    if (!at) continue;
    await clickWith(page, at.x, at.y);
    if (await until(page, selectedIs(unitId), 4000)) return true;
  }
  return false;
}
async function addDoors(page, unitId) {
  const has = (await unitNow(page, unitId)).fronts.length > 0;
  if (has) return 'had leaves';
  await selectUnit(page, unitId);
  if (!(await sectionOpen(page, 'Doors'))) return 'no Doors section';
  const btn = await page.ask('[...document.querySelectorAll(\'button.cc-btn-gold\')].some((b) => b.offsetParent && /Add doors/.test(b.textContent))');
  if (!btn) return 'no Add doors button';
  await page.press('button.cc-btn-gold', 'Add doors');
  await page.sleep(900);
  return 'Add doors pressed';
}
const FT = 'document.querySelector(\'[data-unit-front-type]\')';
/** The Front type select set by the real select; the engine and the scene let catch up. */
async function setStyle(page, unitId, style, leafIds) {
  await selectUnit(page, unitId);
  await sectionOpen(page, 'Carcass');
  const before = await meshesOf(page, unitId, leafIds);
  const res = await choose(page, FT, style);
  const decorated = style !== 'F' && style !== 'S';
  await until(page, `(() => { const r = ${S}.unitResult(${j(unitId)}); const leaves = r.panels.filter((p) => ${j(leafIds)}.includes(p.id));
    return leaves.length > 0 && leaves.every((p) => ${decorated ? `p.meta && p.meta.frontDecoration && p.meta.frontDecoration.style === ${j(style)}` : `!(p.meta && p.meta.frontDecoration) && p.meta && p.meta.frontType === ${j(style)}`}); })()`, 15000);
  // The scene builds a decorated solid a frame or two later: wait for a NEW
  // geometry on every leaf (the uuid changes), or for the style mark.
  for (let t = 0; t < 80; t += 1) {
    const m = await meshesOf(page, unitId, leafIds);
    if (m && leafIds.every((id) => m[id] && (decorated ? m[id].style === style : (!m[id].style && m[id].uuid !== (before[id] || {}).uuid)))) break;
    await page.sleep(300);
  }
  await page.sleep(900);
  return res;
}

// ─── THE FRAMES: WHERE THE LEAVES ARE ON THE GLASS (T77's) ─────────────────
const leafRect = (page, unitId, ids) => page.ask(`(() => { const v = window.__cc.views && window.__cc.views.room; if (!v) return null; const T = v.three;
  let unit = null; v.scene.traverse((o) => { if (!unit && o.userData && o.userData.ccUnitId === ${j(unitId)}) unit = o; });
  if (!unit) return null; const want = ${j(ids)}; const box = new T.Box3(); let any = false;
  unit.updateMatrixWorld(true);
  unit.traverse((o) => { if (o.isMesh && o.userData && want.includes(o.userData.ccPanelId)) { box.expandByObject(o); any = true; } });
  if (!any) return null; const r = v.gl.domElement.getBoundingClientRect();
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    const p = new T.Vector3(x, y, z).project(v.camera);
    const px = r.left + (p.x * 0.5 + 0.5) * r.width; const py = r.top + (-p.y * 0.5 + 0.5) * r.height;
    x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
  const aside = [...document.querySelectorAll('aside')].map((a) => a.getBoundingClientRect()).filter((a) => a.width > 0 && a.left > r.left + r.width / 2).map((a) => a.left);
  return { x0, y0, x1, y1, left: r.left, top: r.top, right: Math.min(r.right, ...aside), bottom: r.bottom, cw: r.width, ch: r.height };
})()`);
async function closeIn(page, unitId, ids, { fillH = 0.62, fillW = 0.42, notches = 36 } = {}) {
  await settleCamera(page);
  let rect = await leafRect(page, unitId, ids);
  let last = 0;
  const inView = (r) => r.y1 < r.bottom - 6 && r.y0 > r.top + 6 && r.x0 > r.left + 6 && r.x1 < r.right - 6;
  for (let i = 0; i < notches && rect; i += 1) {
    const h = rect.y1 - rect.y0; const w = rect.x1 - rect.x0;
    if (h >= fillH * rect.ch || w >= fillW * rect.cw) break;
    if (i > 2 && Math.abs(h - last) < 0.5) break;
    last = h;
    const cx = Math.round((rect.x0 + rect.x1) / 2); const cy = Math.round((rect.y0 + rect.y1) / 2);
    await page.wheel(cx, cy, -120, 1);
    await settleCamera(page);
    const next = await leafRect(page, unitId, ids);
    if (next && inView(rect) && !inView(next)) { await page.wheel(cx, cy, 120, 1); break; }
    rect = next;
  }
  await settleCamera(page);
  return leafRect(page, unitId, ids);
}
async function focusPiece(page, unitId, pieceId) {
  const at = await reachFree(page, unitId, pieceId);
  if (!at) return null;
  await page.dblclick(at.x, at.y);
  await page.sleep(1500);
  const modal = await page.ask('window.__cc.ui.getState().modal || null');
  if (modal) {
    const x = await boxOf(page, `[...document.querySelectorAll('[data-modal-name="${modal}"] button')].find((b) => b.textContent.trim() === '×')`);
    if (x) await clickWith(page, x.x, x.y);
  }
  await settleCamera(page);
  return { ...at, modal };
}
const sightOf = async (page, unitId, ids) => {
  const out = [];
  for (const id of ids) {
    const r = await pointOn(page, unitId, id, { all: true, grid: 30 });
    out.push(r ? r.n : 0);
  }
  return out;
};
async function turnToSee(page, unitId, ids, turns = [-150, -150, 450, 150]) {
  let pos = 0; let best = { pos: 0, sight: await sightOf(page, unitId, ids) };
  for (const dx of turns) {
    if (Math.min(...best.sight) > 400) break;
    if (!(await orbitFree(page, dx, 0))) break;
    pos += dx;
    const sight = await sightOf(page, unitId, ids);
    if (Math.min(...sight) > Math.min(...best.sight)) best = { pos, sight };
  }
  if (pos !== best.pos) await orbitFree(page, best.pos - pos, 0);
  return { turned: best.pos, sight: await sightOf(page, unitId, ids) };
}
async function leafFrame(page, unitId, ids, file) {
  await settleCamera(page);
  const r = await leafRect(page, unitId, ids);
  if (!r) return shot(page, file);
  const mx = (r.x1 - r.x0) * 0.12 + 12; const my = (r.y1 - r.y0) * 0.08 + 12;
  const x = Math.max(r.left, r.x0 - mx); const y = Math.max(r.top, r.y0 - my);
  const x2 = Math.min(r.right, r.x1 + mx); const y2 = Math.min(r.bottom, r.y1 + my);
  const width = Math.max(40, x2 - x); const height = Math.max(40, y2 - y);
  const scale = Math.max(1, Math.min(2, 760 / Math.max(width, height)));
  return shot(page, file, {
    x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height), scale,
  });
}

// ─── THE PROBE ─────────────────────────────────────────────────────────────
const sayBox = (b) => (b ? `x ${r1(b.x)}..${r1(b.x + b.w)} (w ${r1(b.w)}), z ${r1(b.z)}..${r1(b.z + b.d)} (d ${r1(b.d)}), h ${r1(b.h)}` : 'no box');
const sayMesh = (m) => (m ? `geometry ${m.kind} ${m.vertices} vertices${m.style ? ` marked ${m.style}` : ''}: own box w ${m.ownSize.w} x h ${m.ownSize.h} x depth ${m.ownSize.depthMm} (x ${m.own.x[0]}..${m.own.x[1]}, z ${m.own.z[0]}..${m.own.z[1]}); in the unit's frame x ${m.unit.x[0]}..${m.unit.x[1]} (${m.unitSize.x}), z ${m.unit.z[0]}..${m.unit.z[1]} (${m.unitSize.z}), y ${m.unit.y[0]}..${m.unit.y[1]}` : 'no mesh');

// ─── THE WORKING TREE, IN NODE (`node scripts/t78-f03-probe.mjs tree`) ─────
//
// The served bundle is HEAD's; the fix lands in the working tree first. This
// section builds the same L through the tree's own engine, hands door B to the
// tree's solid builders (src/3d/frontDecorationSolid.js, src/3d/shakerSolid.js)
// and turns the solid the way the tree's UnitView.jsx turns it (`turnY`, a
// quarter about Y for a leaf hung along Z), so the fix is measured before any
// build: the leaf's own cut size in, a 25 mm solid standing at door B's box out.
if (process.argv.includes('tree')) {
  const { computeCabinet } = await import('../src/engine/cabinet.js');
  const { defaultFrontDecoration } = await import('../src/engine/frontDecoration.js');
  const { frontDecorationGeometry } = await import('../src/3d/frontDecorationSolid.js');
  const { shakerFrontGeometry } = await import('../src/3d/shakerSolid.js');
  const THREE = await import('three');
  const mk = (style) => computeCabinet({
    type: 'CORNER_L_BASE', width: 900, depth: 900, height: 770, unit_num: 'CL01', corner_side: 'left',
    doors: { count: 2 }, front_type: style, front_decoration: style === 'F' || style === 'S' ? null : defaultFrontDecoration(style),
  });
  const bboxOf = (g) => { g.computeBoundingBox(); const b = g.boundingBox; const r = (q) => Math.round(q * 10000) / 10;
    return { w: r(b.max.x - b.min.x), h: r(b.max.y - b.min.y), depthMm: r(b.max.z - b.min.z), x: [r(b.min.x), r(b.max.x)], z: [r(b.min.z), r(b.max.z)] }; };
  const inUnit = (g, box, turnY) => { const m = new THREE.Matrix4().makeRotationY(turnY).setPosition((box.x + box.w / 2) / 1000, (box.y + box.h / 2) / 1000, (box.z + box.d / 2) / 1000);
    const c = g.clone().applyMatrix4(m); c.computeBoundingBox(); const b = c.boundingBox; const r = (q) => Math.round(q * 10000) / 10;
    return { x: [r(b.min.x), r(b.max.x)], y: [r(b.min.y), r(b.max.y)], z: [r(b.min.z), r(b.max.z)] }; };
  for (const style of ['A', 'G', 'ORNATE_A_2', 'S']) {
    const res = mk(style);
    const doorB = res.panels.find((p) => p.id === 'CL01-B-F');
    const doorA = res.panels.find((p) => p.id === 'CL01-A-F');
    if (!doorB || !doorA) { row(`tree ${style}: the L's leaves`, 'both', `A ${Boolean(doorA)} B ${Boolean(doorB)}; warnings ${(res.warnings || []).map((w) => w.code).join(',')}`, 'src/engine/cabinet.js'); continue; }
    const build = (p) => (style === 'S' ? shakerFrontGeometry(p, []) : frontDecorationGeometry(p, []));
    const gB = build(doorB); const gA = build(doorA);
    const dir = Number(doorB.meta?.swingZ?.dir) || -1;
    const turnY = -dir * (Math.PI / 2);
    const deco = doorB.meta?.frontDecoration;
    row(`tree ${style}: door B's record and the working tree's builder`,
      `a solid ${doorB.w} x ${doorB.h} x ${doorB.thickness} in the leaf's own frame (w across x, thickness through z)`,
      `record w ${doorB.w} h ${doorB.h} thickness ${doorB.thickness}, box ${sayBox(doorB.box)}, ${deco ? `${deco.style} ${deco.status}` : (doorB.meta?.shaker ? 'shaker' : 'plain')}; `
      + `builder ${gB ? `own box w ${bboxOf(gB).w} x h ${bboxOf(gB).h} x depth ${bboxOf(gB).depthMm} (x ${bboxOf(gB).x.join('..')}, z ${bboxOf(gB).z.join('..')})` : 'returned null'}; `
      + `door A ${gA ? `w ${bboxOf(gA).w} x h ${bboxOf(gA).h} x depth ${bboxOf(gA).depthMm}` : 'null'}`,
      'src/3d/frontDecorationSolid.js cutSizeOf (working tree); src/3d/shakerSolid.js 92-97 (working tree)');
    if (gB) {
      const u = inUnit(gB, doorB.box, turnY);
      row(`tree ${style}: door B's solid turned by UnitView's turnY (${Math.round(turnY * 180 / Math.PI)} deg about Y, dir ${dir}) and set at its box centre`,
        `x ${r1(doorB.box.x)}..${r1(doorB.box.x + doorB.box.w)}, z ${r1(doorB.box.z)}..${r1(doorB.box.z + doorB.box.d)}, y 0..${doorB.box.h} (the box, to 0.1 mm)`,
        `x ${u.x.join('..')}, z ${u.z.join('..')}, y ${u.y.join('..')}`,
        'src/3d/UnitView.jsx MovingPanel `turned` / `turnY` (working tree), the mesh rotation=[0, turnY, 0] about the box centre');
      // The face the decoration is carved into must face the room: the +z cap
      // of the builder turns to +x on the left hand (door B faces +x).
      const n = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), turnY);
      row(`tree ${style}: the carved face after the turn`, 'faces +x (the left hand\'s door B faces +x, its hinge at z = D)',
        `the builder's +z turns to [${[n.x, n.y, n.z].map((q) => Math.round(q * 100) / 100).join(', ')}]`, 'src/3d/UnitView.jsx turnY = -(swingZ.dir) * PI / 2; engine/joinery.js panelPlacement DOOR-B n = [-1, 0, 0] is the CNC back face, so the front is +x');
    }
  }
  writeFileSync(`${SHOTS}f03-probe.tree.rows.md`, `${rows.join('\n')}\n`);
  process.exit(0);
}

const page = await open();
let errs = [];
try {
  await pro(page);
  note('build', `${await stamp(page)}; ${process.env.E2E_URL || 'http://127.0.0.1:4173/'}`);
  await hideDimensions(page);
  const L = await addFromLibrary(page, { category: 'Kitchen', path: ['base-units'], entry: 'corner-l' });
  row('Library, Kitchen, Base units, "Corner L" (a real click on the row)', 'a CORNER_L_BASE in the room corner',
    L.unit ? `${L.unit.type} ${L.unit.id} at wall ${L.unit.wall} x ${L.unit.x}, ${L.unit.w} x ${L.unit.h} x ${L.unit.d}` : 'nothing added', 'engine/library.js corner-l row; stores/projectStore.js addUnit');
  if (!L.unit) throw new Error('no L');
  const id = L.unit.id;
  const doors = await addDoors(page, id);
  const u0 = await unitNow(page, id);
  const A = u0.fronts.find((f) => f.arm === 'A' && !f.parent);
  const B = u0.fronts.find((f) => f.arm === 'B' && !f.parent);
  row('DOORS, "Add doors" (a real click): the L\'s two leaves', 'door A on arm A (faces +z), door B on arm B (faces +x), each front_t thick',
    `${doors}; front_t ${u0.frontT ?? 'profile'} (profile.front.thickness), arm ${u0.arm}, gap ${u0.gap}, clearance.corner ${u0.cornerClear}; `
    + `${[A, B].map((f) => (f ? `${f.id}: record ${f.w} x ${f.h} x ${f.thickness}, box ${sayBox(f.box)}` : 'missing')).join('; ')}`,
    'engine/cabinet.js 3867 (HEAD; door A: the virtual frame moved), 3871 (door B: box = { x: b.z, z: D - (b.x + b.w), w: b.d, d: b.w }: its WIDTH stands in box.d and its THICKNESS in box.w), 3698 innerTrim (the overlap, 26.5, taken off the WIDTH)');
  if (!A || !B) throw new Error('no leaves');
  const leafIds = [A.id, B.id];
  const wB = B.w; const tB = B.thickness;

  let camera = false;
  const bomThick = (rowsB, pid) => { const r = rowsB.find((x) => x.id === pid); return r ? `${r.material.split('·')[0].trim()} (${r.w} x ${r.h}${r.construction ? `, "${r.construction.slice(0, 48)}"` : ''})` : 'no row'; };
  for (const style of STYLES) {
    const sel = await setStyle(page, id, style, leafIds);
    const u = await unitNow(page, id);
    const m = await meshesOf(page, id, u.fronts.map((f) => f.id));
    const a = u.fronts.find((f) => f.id === A.id); const b = u.fronts.find((f) => f.id === B.id);
    const extras = u.fronts.filter((f) => f.parent);
    const deco = (f) => (f.deco ? `${f.deco.style} ${f.deco.status}, ${f.deco.ops} ops, ${f.deco.additions} additions, outline ${f.deco.outlineW} x ${f.deco.outlineH}` : (f.shaker ? `shaker frame ${f.shaker.frame} depth ${f.shaker.depth}` : `plain ${f.frontType}`));
    row(`Front type "${LABEL[style]}" (${style}) by the real select: the RECORDS of the two leaves`,
      `thickness ${tB} on both; door B\'s box.w = ${tB} (its thickness along x), box.d = ${wB} (its width along z)`,
      `select ${sel.ok ? `${j(sel.before.value)} -> ${j(sel.after.value)}` : sel.why}; `
      + `${[a, b].map((f) => `${f.id} (arm ${f.arm}): thickness ${f.thickness}, w ${f.w}, box ${sayBox(f.box)}, ${deco(f)}`).join('; ')}`
      + `${extras.length ? `; applied parts ${extras.map((f) => `${f.id} ${f.w} x ${f.h} x ${f.thickness}`).join(', ')}` : ''}`,
      'engine/cabinet.js 3871 (HEAD) door B box; 9279 buildFrontDecoration(panel): frontDecoration.js 269 reads cnc.drawn_w / panel.w and panel.thickness, never the box');
    const mA = m[A.id]; const mB = m[B.id];
    row(`${LABEL[style]}: door A\'s SOLID in the scene`, `a solid ${a.w} wide (x) x ${a.h} x ${tB} deep (z), standing at door A\'s box`,
      sayMesh(mA), 'src/3d/UnitView.jsx 754 frontDecorationGeometry(p) / 779 shakerFrontGeometry(p) / 757 panelSolids / boxGeometry(box.w, box.h, box.d)');
    row(`${LABEL[style]}: door B\'s SOLID in the scene`, `a solid ${tB} along x (its thickness) x ${b.h} x ${wB} along z (its width), standing at door B\'s box: x ${r1(b.box.x)}..${r1(b.box.x + b.box.w)}, z ${r1(b.box.z)}..${r1(b.box.z + b.box.d)}`,
      sayMesh(mB), 'src/3d/frontDecorationSolid.js 137 and 165 (HEAD): const { w, h, d: thickness } = panel.box (door B: w = 25, thickness = its width), 168 toMesh = w / 2 - x; shakerSolid.js 92-94 (HEAD) the same read, 97 returns null when w <= 2 * frame');
    const over = mB ? { x: r1(mB.unitSize.x - b.box.w), z: r1(mB.unitSize.z - b.box.d), intoX: r1(b.box.x - mB.unit.x[0]) } : null;
    row(`${LABEL[style]}: door B\'s solid against its box (what the eye gets)`, 'the solid is the box: 0 mm over in x, 0 mm over in z',
      mB ? `${over.x} mm over its box along x (the solid reaches ${over.intoX} mm back from the door\'s hinge face, into the carcass), ${over.z} mm over along z; the solid\'s depth (z) is ${mB.unitSize.z} where the door\'s width is ${wB}` : 'no mesh',
      'src/3d/UnitView.jsx 882 meshOffset, 1067 the mesh at it with no turn (HEAD): the solid is centred on the box, so a solid of the wrong size spreads about the box\'s centre');
    const rowsB = await bomRead(page, style === STYLES[0] ? 'f03-probe-bom.png' : null);
    row(`${LABEL[style]}: the cut list (the BOM panel\'s Parts rows, a real click on BOM)`, `both leaves ${tB} mm`,
      `${leafIds.map((pid) => `${pid}: ${bomThick(rowsB, pid)}`).join('; ')}; CSV ${u.csv.map((l) => l.split(',').slice(1, 4).join(' ')).join(' / ')} (the CSV carries no thickness column)`,
      'components/BomPanel.jsx 677 formatMm(r.thickness); engine/cabinet.js 10539 buildCsvLines');
    await shot(page, `f03-probe-${style}.png`);
    if (!camera) {
      const flown = await focusPiece(page, id, 'TOP-L');
      const seen = await turnToSee(page, id, leafIds);
      await closeIn(page, id, leafIds, { fillH: 0.5, fillW: 0.5 });
      note('the camera: a 2klik on TOP-L, real drags on the floor into the corner, the wheel', `2klik ${flown ? `at ${flown.x},${flown.y}` : 'none'}; turned ${seen.turned} px; pixels a hand could touch on A and B: ${seen.sight.join(' and ')}`);
      camera = true;
    }
    const sight = await sightOf(page, id, leafIds);
    await leafFrame(page, id, leafIds, `f03-probe-${style}-doors.png`);
    note(`${LABEL[style]} close-up`, `f03-probe-${style}-doors.png; pixels a hand could touch on A and B from this camera: ${sight.join(' and ')}`);
    const seen = await seenOf(page, id, leafIds);
    row(`${LABEL[style]}: what the eye gets from the close-up camera (the scene's raycaster from a 151 x 101 grid of pixels)`,
      `door B: its +x face (x = ${r1(b.box.x + b.box.w)}) and its +z end (z = ${r1(b.box.z + b.box.d)}, ${tB} wide at x ${r1(b.box.x)}..${r1(b.box.x + b.box.w)}); nothing of it at x < ${r1(b.box.x)}`,
      `${A.id}: ${saySeen(seen && seen[A.id])} || ${B.id}: ${saySeen(seen && seen[B.id])}`,
      'the scene as drawn (src/3d/UnitView.jsx MovingPanel, the geometry of rows above); SIDE-B and TOP-L stand at ' + u.sides.map((sd) => `${sd.id} ${sayBox(sd.box)}`).join(', '));
    if (a.deco && a.deco.problems.length) note(`${LABEL[style]} problems`, `${A.id}: ${a.deco.problems.join(' / ')}; ${B.id}: ${b.deco ? b.deco.problems.join(' / ') : 'none'}`);
    // THE DOORS OPEN (the toolbar's own "Open all"): a solid built into the
    // carcass swings out of it with the leaf and stands in the room.
    if (await page.ask('[...document.querySelectorAll(\'button\')].some((b) => b.offsetParent && b.textContent.trim() === \'Open all\')')) {
      await page.click('button', 'Open all', { exact: true });
      await page.sleep(1800);
      const mo = await meshesOf(page, id, leafIds);
      const so = await seenOf(page, id, leafIds);
      await leafFrame(page, id, leafIds, `f03-probe-${style}-open.png`);
      const mB2 = mo && mo[B.id];
      row(`${LABEL[style]}: "Open all" (a real click on the toolbar): door B swung open, its solid in the unit's frame`,
        `a ${tB} thick leaf standing out from its hinge at z ${r1(b.box.z + b.box.d)}: ${wB} along x, ${tB} along z`,
        mB2 ? `x ${mB2.unit.x[0]}..${mB2.unit.x[1]} (${mB2.unitSize.x}), z ${mB2.unit.z[0]}..${mB2.unit.z[1]} (${mB2.unitSize.z}), y ${mB2.unit.y[0]}..${mB2.unit.y[1]}; the eye: ${saySeen(so && so[B.id])}` : 'no mesh',
        'src/3d/UnitView.jsx 946 the swing about the hinge end (alongZ), the solid of rows above turning with it; frame f03-probe-' + style + '-open.png');
      if (await page.ask('[...document.querySelectorAll(\'button\')].some((b) => b.offsetParent && b.textContent.trim() === \'Close all\')')) {
        await page.click('button', 'Close all', { exact: true });
        await page.sleep(1500);
      }
    }
  }
} catch (e) {
  row('the probe ran to its end', 'yes', `threw: ${String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e)}`, 'scripts/t78-f03-probe.mjs');
}
errs = pageErrors(page);
note('page errors', errs.length ? errs.join(' | ') : 'none');
note('frames', frames.join(', '));
writeFileSync(`${SHOTS}f03-probe.rows.md`, `${rows.join('\n')}\n`);
await page.close();
await showroomDown();
process.exit(0);
