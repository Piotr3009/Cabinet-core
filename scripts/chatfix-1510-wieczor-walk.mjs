/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT-FIX 15.10.2026 (the evening) · THE WALK IN A REAL CHROMIUM ───────
//
// The app built and served (E2E_URL, default http://127.0.0.1:4173/):
//     node scripts/chatfix-1510-wieczor-walk.mjs
// Frames go to verify/chatfix-1510-wieczor/; the rows are printed and written
// beside them. Reads the stores through window.__cc; adds through the API
// where the gesture itself is not the point.
//
// What it walks (the owner's evening list of 15.10.2026):
//   A  the island plan window: a number typed over the old one and committed
//      with Enter, a cabinet's depth typed, a cabinet TURNED onto the next
//      face, the gold front edge drawn;
//   B  the corner notch: the STEP covers the RETURN's end (218 / 182);
//   C  the recess: a cabinet wholly inside is DEEPER on the same line of
//      fronts; one partly inside grows an EXTENSION behind its back, and the
//      scene shows its EXT-BACK in the alcove; a band recess from the floor to
//      1000 takes a tall unit's bottom only (a LID);
//   D  the wall seen from the FRONT: the recess and the chimney are drawn
//      where they stand, the recess as its band; Bottom and Top typed in its
//      own window.

import { mkdirSync, writeFileSync } from 'node:fs';
import { open, pro, settleCamera, showroomDown } from './t74-harness.mjs';

const SHOTS = 'verify/chatfix-1510-wieczor/';
mkdirSync(SHOTS, { recursive: true });
const S = 'window.__cc.project.getState()';
const UI = 'window.__cc.ui.getState()';
const j = (v) => JSON.stringify(v);
const rows = [];
let n = 0;
let failed = 0;
const row = (what, expected, observed, ok) => {
  n += 1;
  if (!ok) failed += 1;
  const line = `| ${n} | ${what} | ${expected} | ${observed} | ${ok ? 'OK' : 'FAIL'} |`;
  rows.push(line);
  process.stdout.write(`${line}\n`);
};
const ROOM = '[{x:0,y:0},{x:4000,y:0},{x:4000,y:3000},{x:0,y:3000}]';
const newRoom = (page, name) => page.ask(`(() => { ${S}.newProject(${j(name)}); ${S}.setRoom({ corners: ${ROOM}, height: 2500 }); return true; })()`);
/** Type a number into a field the real way: click it, select all, type, Enter. */
const typeInto = async (page, sel, value) => {
  await page.press(sel);
  await page.ask(`(() => { const el = document.querySelector(${j(sel)}); if (el) { el.focus(); el.select(); } return true; })()`);
  await page.typeText(String(value));
  await page.pressKey('Enter');
  await page.sleep(500);
};
/** A panel's mesh in the room scene: its world bounding box, mm. */
const meshBox = (page, unitId, panelId) => page.ask(`(() => { const v = window.__cc.views.room; const T = v.three; let unit = null; let m = null;
  v.scene.traverse((o) => { if (o.userData && o.userData.ccUnitId === ${j(unitId)}) unit = o; });
  if (!unit) return null; unit.traverse((o) => { if (!m && o.isMesh && o.userData && o.userData.ccPanelId === ${j(panelId)}) m = o; });
  if (!m) return { found: false };
  m.updateMatrixWorld(true); const b = new T.Box3().setFromObject(m); const r = (q) => Math.round(q * 1000);
  return { found: true, x: [r(b.min.x), r(b.max.x)], y: [r(b.min.y), r(b.max.y)], z: [r(b.min.z), r(b.max.z)] }; })()`);

const page = await open({ width: 1440, height: 900 });
try {
  await pro(page);
  await newRoom(page, 'wieczor 1510');
  await page.sleep(800);

  // ─── A · the island plan window: typing, the depth, the turn, the front ──
  await page.ask(`${S}.beginIslandPlan(null).ok`);
  await page.sleep(900);
  const planOpen = await page.has('[data-island-plan="1"]');
  await page.ask(`(() => { const u = ${UI}; const cab = (face, w) => ({ key: 'plan_' + face + w, unitId: null, face, w, depth: null, type: 'BUD', label: null });
    u.setIslandPlan({ cx: 2000, cy: 1700, w: 1800, d: 1100, cabs: [cab('A', 600), cab('E2', 450)] }); return true; })()`);
  await page.sleep(700);
  await typeInto(page, '[data-plan-w="1"]', 2100);
  const wAfter = await page.ask(`${UI}.islandPlan.w`);
  row('A1 the island width typed over the old number, Enter', 'the plan is 2100 wide', `open ${planOpen}, w ${wAfter}`, planOpen && wAfter === 2100);
  await typeInto(page, '[data-plan-cab-d]', 400);
  const dAfter = await page.ask(`${UI}.islandPlan.cabs[0].depth`);
  row('A2 the first cabinet\'s depth typed', 'depth 400 on the plan cabinet', `${dAfter}`, dAfter === 400);
  const faceBefore = await page.ask(`${UI}.islandPlan.cabs[0].face`);
  await page.press('[data-plan-cab-turn]');
  const faceAfter = await page.ask(`${UI}.islandPlan.cabs[0].face`);
  row('A3 the turn button', 'the cabinet moves from face A to E2 (clockwise)', `${faceBefore} -> ${faceAfter}`, faceBefore === 'A' && faceAfter === 'E2');
  const fronts = await page.count('[data-plan-cab-front]');
  const gold = await page.ask(`(() => { const l = document.querySelector('[data-plan-cab-front]'); return l ? l.getAttribute('stroke') : null; })()`);
  row('A4 the front edge', 'a gold line on every plan cabinet', `${fronts} line(s), stroke ${gold}`, fronts === 2 && gold === '#E0B35A');
  await page.screenshot(`${SHOTS}a-island-plan-fields.png`);
  await page.press('[data-plan-cancel="1"]');
  await page.sleep(600);

  // ─── B · the corner notch: the STEP covers the RETURN's end ──────────────
  await newRoom(page, 'wieczor 1510 notch');
  await page.sleep(600);
  const nb = await page.ask(`(() => { const P = ${S}; const r = P.addUnit('BUD', { wall: 0, x: 1200 }); P.addDoors(r.id); P.setUnitNotch(r.id, { corner: 'BL', w: 200, d: 200, h: 0 }); return { id: r.id, err: r.error }; })()`);
  await page.sleep(1500);
  const notchRead = await page.ask(`(() => { const r = ${S}.unitResult(${j(nb.id)}); const by = (id) => r.panels.find((p) => p.id === id);
    return { refused: r.derived.notch && r.derived.notch.refused, step: by('STEP') && [by('STEP').w, by('STEP').h], ret: by('RETURN') && [by('RETURN').w, by('RETURN').h], stepBox: by('STEP') && by('STEP').box, retBox: by('RETURN') && by('RETURN').box }; })()`);
  row('B1 a BL 200 x 200 notch', 'STEP 218 x 770 over x 0..218, RETURN 182 x 770 behind it', j(notchRead),
    !notchRead.refused && j(notchRead.step) === '[218,770]' && j(notchRead.ret) === '[182,770]' && notchRead.stepBox?.w === 218 && notchRead.retBox?.d === 182);
  await settleCamera(page);
  await page.screenshot(`${SHOTS}b-notch-step.png`);

  // ─── C · the recess: deeper inside, an extension partly in, a band ───────
  await newRoom(page, 'wieczor 1510 recess');
  await page.sleep(600);
  const rc = await page.ask(`(() => { const P = ${S}; P.addWallSlope({ kind: 'recess', wall: 0, x_mm: 1000, width: 1300, depth: 300 });
    const a = P.addUnit('BUD', { wall: 0, x: 200 }); P.addDoors(a.id); const front = ${S}.units.find((u) => u.id === a.id).params.depth + 10;
    P.moveUnit(a.id, 1100, 1); const u = ${S}.units.find((x) => x.id === a.id); return { id: a.id, front, depth: u.params.depth, recess: u.params.recess_mm, full: u.params.depth_full, x: u.position.x_mm }; })()`);
  await page.sleep(1500);
  row('C1 a BUD slid wholly into a 300 recess', 'depth 858 (558 + 300), recess_mm 300, its own 558 kept', j(rc), rc.depth === 858 && rc.recess === 300 && rc.full === 558);
  await settleCamera(page);
  const inside = await meshBox(page, rc.id, 'BACK');
  const frontBox = await page.ask(`(() => { const r = ${S}.unitResult(${j(rc.id)}); const f = r.panels.find((p) => p.part === 'FRONT'); return f ? f.id : null; })()`);
  const frontMesh = frontBox ? await meshBox(page, rc.id, frontBox) : null;
  // The room is centred on the origin: wall 0 runs along y = 0, so its line in the scene is z = -1500 and the room is toward +z.
  row('C2 the scene', 'the BACK stands in the alcove (behind the wall line, z < -1500), the door on the line of fronts (z about -932)',
    j({ back: inside, front: frontMesh }), Boolean(inside?.found) && inside.z[1] < -1500 + 5 && Boolean(frontMesh?.found) && Math.abs(frontMesh.z[1] - (-1500 + 10 + 558 + 25)) < 6);
  await page.screenshot(`${SHOTS}c1-recess-deeper.png`);
  // Half across the edge: the extension, its EXT-BACK in the alcove.
  await page.ask(`(() => { ${S}.moveUnit(${j(rc.id)}, 1800, 1); return true; })()`);
  await page.sleep(1500);
  const half = await page.ask(`(() => { const P = ${S}; const u = P.units.find((x) => x.id === ${j(rc.id)}); const r = P.unitResult(u.id);
    return { x: u.position.x_mm, depth: u.params.depth, recess: u.params.recess_mm, ext: r.derived.extension && { boards: r.derived.extension.boards, x0: r.derived.extension.x0, x1: r.derived.extension.x1 }, warn: r.warnings.map((w) => w.code) }; })()`);
  row('C3 the same BUD half across the recess edge', 'depth 558 on the wall line, an extension: RETURN-R and EXT-BACK, no warning', j(half),
    half.depth === 558 && !half.recess && half.ext && half.ext.boards.join(',') === 'RETURN-R,EXT-BACK' && half.warn.length === 0);
  await settleCamera(page);
  const extBack = await meshBox(page, rc.id, 'EXT-BACK');
  const bul = await meshBox(page, rc.id, 'BUL');
  row('C4 the scene', 'EXT-BACK drawn in the alcove (z about -1790 .. -1772), BUL grown back to it', j({ extBack, bul }),
    Boolean(extBack?.found) && extBack.z[0] < -1700 && Boolean(bul?.found) && bul.z[0] < -1700);
  await page.screenshot(`${SHOTS}c2-recess-extension.png`);
  // A band recess from the floor to 1000 and a tall unit in it.
  const band = await page.ask(`(() => { const P = ${S}; P.addWallSlope({ kind: 'recess', wall: 0, x_mm: 2600, width: 700, depth: 150, bottom_mm: null, top_mm: 1000 });
    const t = P.addUnit('BUDTALL', { wall: 0, x: 2650 }); P.addDoors(t.id); const r = P.unitResult(t.id); const u = ${S}.units.find((x) => x.id === t.id);
    return { id: t.id, err: t.error, depth: u.params.depth, recess: u.params.recess_mm, ext: r.derived.extension && { boards: r.derived.extension.boards, z1: r.derived.extension.z1 }, warn: r.warnings.map((w) => w.code) }; })()`);
  await page.sleep(1500);
  row('C5 a tall unit in a recess from the floor to 1000', 'its depth kept, an extension with a LID at the band\'s top (z1 890 = 1000 - 100 base - 10)', j(band),
    !band.err && band.depth === 558 && !band.recess && band.ext && band.ext.boards.join(',') === 'LID,EXT-BACK' && band.ext.z1 === 890);
  await settleCamera(page);
  const lid = await meshBox(page, band.id, 'LID');
  row('C6 the scene', 'the LID drawn in the alcove at about 1000 off the floor', j(lid), Boolean(lid?.found) && Math.abs(lid.y[1] - 1000) < 30 && lid.z[0] < -1500);
  await page.screenshot(`${SHOTS}c3-recess-band-tall.png`);

  // ─── D · the wall seen from the FRONT ────────────────────────────────────
  await page.ask(`(() => { ${S}.addWallSlope({ kind: 'chimney', wall: 0, x_mm: 3500, width: 400, depth: 350 }); ${UI}.openModal('room', null); return true; })()`);
  await page.sleep(1500);
  const front = await page.ask(`(() => { const els = [...document.querySelectorAll('[data-elevation-plan]')]; const wall = document.querySelector('[data-elevation-wall="1"]');
    const wh = wall ? Number(wall.getAttribute('height')) : 0;
    return { view: document.querySelector('[data-wall-elevation]') && document.querySelector('[data-wall-elevation]').getAttribute('data-wall-view'),
      drawn: els.map((e) => [e.getAttribute('data-elevation-kind'), Math.round(Number(e.getAttribute('height')) / wh * 2500)]), listed: document.querySelectorAll('[data-elevation-row]').length }; })()`);
  row('D1 Room setup, the wall from the FRONT', 'two recesses and the chimney drawn: the full one 2500 high, the band 1000 high, the chimney 2500', j(front),
    front.view === 'front' && front.drawn.length === 3 && front.drawn.some(([k, h]) => k === 'recess' && Math.abs(h - 2500) < 3) && front.drawn.some(([k, h]) => k === 'recess' && Math.abs(h - 1000) < 3) && front.drawn.some(([k, h]) => k === 'chimney' && Math.abs(h - 2500) < 3) && front.listed === 3);
  await page.ask(`(() => { const svg = document.querySelector('[data-wall-elevation-svg="1"]'); if (svg) svg.scrollIntoView({ block: 'center' }); return true; })()`);
  await page.sleep(500);
  await page.screenshot(`${SHOTS}d1-elevation-front.png`);
  // Double-click the band recess: its window, Bottom and Top.
  // The band stands at the foot of the wall, below the fold of a 900 px window: scrolled into view first, as a hand would.
  const bandBox = await page.ask(`(() => { const el = [...document.querySelectorAll('[data-elevation-plan]')].find((e) => e.getAttribute('data-elevation-kind') === 'recess' && Number(e.getAttribute('height')) < 200);
    if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
  await page.sleep(400);
  let fields = null;
  if (bandBox) {
    await page.dblclick(bandBox.x, bandBox.y);
    await page.sleep(900);
    fields = await page.ask(`(() => { const b = document.querySelector('[data-plan-bottom="1"]'); const t = document.querySelector('[data-plan-top="1"]'); return { bottom: b && b.value, top: t && t.value }; })()`);
  }
  row('D2 double-click the band recess', 'its window shows Bottom 0 and Top 1000', j(fields), fields && String(fields.bottom) === '0' && String(fields.top) === '1000');
  if (fields) {
    await typeInto(page, '[data-plan-top="1"]', 1200);
    await typeInto(page, '[data-plan-bottom="1"]', 300);
  }
  const stored = await page.ask(`(() => { const e = ${S}.project.wallSlopes.find((x) => x.kind === 'recess' && x.x_mm === 2600); return e && [e.bottom_mm, e.top_mm]; })()`);
  row('D3 Top 1200 and Bottom 300 typed', 'stored as bottom_mm 300, top_mm 1200', j(stored), j(stored) === '[300,1200]');
  await page.screenshot(`${SHOTS}d2-elevation-recess-band.png`);
  const bandNow = await page.ask(`(() => { const els = [...document.querySelectorAll('[data-elevation-plan]')]; const wall = document.querySelector('[data-elevation-wall="1"]'); const wh = Number(wall.getAttribute('height'));
    const e = els.find((x) => x.getAttribute('data-elevation-kind') === 'recess' && Math.abs(Number(x.getAttribute('height')) / wh * 2500 - 900) < 3); return Boolean(e); })()`);
  row('D4 the drawing follows', 'the band recess is now drawn 900 high (300 to 1200)', `${bandNow}`, bandNow === true);
} finally {
  writeFileSync(`${SHOTS}walk.rows.md`, `${['| # | gesture | expected | observed | verdict |', '|---|---|---|---|---|', ...rows].join('\n')}\n`);
  await page.close();
  await showroomDown();
}
process.stdout.write(`\n${failed ? `${failed} row(s) FAILED` : 'every row OK'}\n`);
process.exit(failed ? 1 : 0);
