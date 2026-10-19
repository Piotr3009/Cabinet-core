/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT FIX 19.10.2026 · THE WALK: DELETE IN THE WINDOW, THE EDGE SQUARES, THE CLOCKS ───
//
// Test the way the client clicks (T74's law): a real wardrobe, a real click on
// a piece in the cabinet editor window, a real Delete key; a real click on
// each of the four edge squares, two of them through a board; a real notify
// and the clock. Frames under verify/chatfix-1910/.
//
//   npx vite build && npx vite preview --port 4173 --strictPort &
//   node scripts/chatfix-1910-walk.mjs
import { mkdirSync } from 'node:fs';
import { open, pro, roomView, settleCamera, orbit, showroomDown } from './t74-harness.mjs';
import { helperAt, until } from './t75-harness.mjs';

const J = JSON.stringify;
const OUT = 'verify/chatfix-1910';
mkdirSync(OUT, { recursive: true });
const page = await open();
const checks = [];
const check = (name, ok, said = '') => { checks.push({ name, ok: Boolean(ok), said }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${said ? ' . ' + said : ''}`); };
const P = 'window.__cc.project.getState()';
const U = 'window.__cc.ui.getState()';

async function pressKey(key, code) {
  const k = { key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code };
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...k });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...k });
  await page.sleep(700);
}
const editorCentre = (pid) => page.ask(`(() => { const v = window.__cc.views.editor; if (!v) return null; const T = v.three;
  const r = v.gl.domElement.getBoundingClientRect(); let t = null;
  v.scene.traverse((o) => { if (!t && o.isMesh && o.userData.ccPanelId === ${J(pid)}) t = o; });
  if (!t) return null; const c = new T.Box3().setFromObject(t).getCenter(new T.Vector3()).project(v.camera);
  return { x: Math.round(r.left + (c.x * 0.5 + 0.5) * r.width), y: Math.round(r.top + (-c.y * 0.5 + 0.5) * r.height) }; })()`);
const items = (unitId) => page.ask(`(${P}.units.find((u) => u.id === ${J(unitId)}).params.sections[0].items || []).map((i) => i.kind)`);

try {
  await pro(page);
  const unitId = await page.ask(`(() => { const r = ${P}.addUnit('WARDROBE', { wall: 0, x: 600 }); return r && r.id; })()`);
  await page.sleep(1200);

  // ── 1. DELETE IN THE CABINET EDITOR WINDOW ──
  await page.ask(`${P}.addItem(${J(unitId)}, { kind: 'shelf', pos_mm: 1000 })`);
  await page.ask(`${P}.addDrawers(${J(unitId)}, 2)`);
  await page.sleep(900);
  check('1.0 staged: a shelf and two drawers', (await items(unitId)).sort().join() === 'drawer,drawer,shelf', (await items(unitId)).join());
  await page.ask(`(() => { ${U}.clearElement(); ${U}.clearSelection(); ${U}.openModal('cabinet', { unitId: ${J(unitId)} }); return true; })()`);
  await page.waitFor('window.__cc.views && window.__cc.views.editor', { timeout: 30000 });
  await page.sleep(2500);
  let at = await editorCentre('SHELF-1');
  await page.clickAt(at.x, at.y);
  const picked = await page.ask(`(document.querySelector('[role=dialog]') || document.body).innerText.includes('SHELF-1')`);
  check('1.1 a click in the window picks the shelf (its menu opens)', picked);
  await page.screenshot(`${OUT}/01-window-shelf-picked.png`);
  await pressKey('Delete', 46);
  const after = await items(unitId);
  check('1.2 Delete takes the shelf, the cabinet stands', !after.includes('shelf') && (await page.ask(`${P}.units.length`)) === 1, after.join());
  await page.screenshot(`${OUT}/02-window-shelf-deleted.png`);
  // the drawer stack, one per press: the selection falls to the next
  const front = await page.ask(`(${P}.unitResult(${J(unitId)}).panels.find((p) => p.part === 'DRAWER-FRONT' && Number(p.meta && p.meta.drawer) === 2) || {}).id || null`);
  if (front) {
    at = await editorCentre(front);
    if (at) {
      await page.clickAt(at.x, at.y);
      await pressKey('Delete', 46);
      const once = await items(unitId);
      await pressKey('Delete', 46);
      const twice = await items(unitId);
      check('1.3 two presses clear a stack of two (the selection falls)', once.filter((k) => k === 'drawer').length === 1 && !twice.includes('drawer'), `${once.join()} -> ${twice.join()}`);
    } else check('1.3 two presses clear a stack of two', false, 'drawer front not on the glass');
  } else check('1.3 two presses clear a stack of two', false, 'no DRAWER-FRONT 2');
  // a carcass board is refused in words, nothing goes
  at = await editorCentre('BUL');
  await page.clickAt(at.x, at.y);
  const before = await page.ask(`${P}.unitResult(${J(unitId)}).panels.length`);
  await pressKey('Delete', 46);
  const refused = await page.ask(`${U}.messages.map((m) => m.level + ':' + m.message).join('|')`);
  check('1.4 a side under Delete answers in words, stays', (await page.ask(`${P}.unitResult(${J(unitId)}).panels.length`)) === before && /held together/.test(refused), refused.slice(0, 80));
  await page.screenshot(`${OUT}/03-window-side-refused.png`);
  // Backspace, inert in a field (the guard): type into the first number field, press Backspace, nothing goes
  await page.ask(`${U}.closeModal()`);
  await page.sleep(600);

  // ── 2. THE FOUR EDGE SQUARES ──
  await roomView(page); await settleCamera(page);
  await page.ask(`${U}.startEdgeNotchPick(${J(unitId)})`);
  await page.sleep(900);
  const handles = await helperAt(page, '(u) => u.ccNotchEdge');
  check('2.0 four squares on the glass', handles && handles.length === 4, JSON.stringify((handles || []).map((h) => JSON.parse(h.data).ccNotchEdge + (h.first ? '' : '(behind a board)'))));
  await page.screenshot(`${OUT}/04-edge-squares-room.png`);
  for (const edge of ['TF', 'BF', 'TB', 'BB']) {
    await page.ask(`(() => { if (${U}.modal) ${U}.closeModal(); if (!${U}.edgeNotchPick) ${U}.startEdgeNotchPick(${J(unitId)}); return true; })()`);
    await page.sleep(500);
    let h = (await helperAt(page, `(u) => u.ccNotchEdge === ${J(edge)}`) || [])[0];
    let turned = false;
    if (!h) { await orbit(page, 260); turned = true; h = (await helperAt(page, `(u) => u.ccNotchEdge === ${J(edge)}`) || [])[0]; }
    if (!h) { check(`2.${edge} the square is on the glass`, false, 'not hit from either camera'); continue; }
    await page.clickAt(h.x, h.y);
    const modal = await until(page, `${U}.modal === 'edge-notch' && ${U}.modalArgs.edge`, 3000);
    check(`2.${edge} a click on the square opens the edge window ${h.first ? '(first hit)' : '(through a board)'}`, modal === edge, `modal ${modal}${turned ? ', camera turned' : ''}`);
    await page.screenshot(`${OUT}/05-edge-${edge}-window.png`);
    await page.ask(`${U}.closeModal()`);
    if (turned) { await roomView(page); await settleCamera(page); }
  }
  await page.ask(`${U}.stopEdgeNotchPick()`);

  // ── 3. THE CLOCKS ──
  await page.ask(`(() => { ${U}.clearMessages(); ${U}.clearHistory(); return true; })()`);
  const t0 = Date.now();
  await page.ask(`(() => { ${U}.notify('Walk: a grey', 'ok'); ${U}.notify('Walk: a red', 'error'); return true; })()`);
  await page.sleep(400);
  const cls = await page.ask(`(document.querySelector('[data-message-level="grey"]') || {}).className || ''`);
  check('3.0 the grey card is translucent (bg-shell-800/70)', /bg-shell-800\/70/.test(cls), cls.slice(0, 60));
  await page.screenshot(`${OUT}/06-messages-shown.png`);
  const count = () => page.ask(`${U}.messages.map((m) => m.level).sort().join()`);
  check('3.1 both stand at once', (await count()) === 'grey,red', await count());
  await page.sleep(Math.max(0, 4600 - (Date.now() - t0)));
  check('3.2 after 4.6 s the grey is gone, the red stands', (await count()) === 'red', await count());
  await page.sleep(Math.max(0, 8600 - (Date.now() - t0)));
  check('3.3 after 8.6 s the red is gone', (await count()) === '', await count());
  const hist = await page.ask(`${U}.history.map((r) => r.message).join('|')`);
  check('3.4 both rows stay in the Changes list', hist === 'Walk: a red|Walk: a grey', hist);
  await page.ask(`${U}.toggleHistory()`);
  await page.sleep(400);
  await page.screenshot(`${OUT}/07-changes-list-after-clock.png`);
  await page.ask(`${U}.toggleHistory()`);

  // ── 4. THE SECOND ROD (ZIP 3, KIT_HANGER_TWO.lsp) ──
  const w2 = await page.ask(`(() => { const r = ${P}.addUnit('WARDROBE', { wall: 0, x: 1400 }); return r && r.id; })()`);
  await page.sleep(1200);
  const first = await page.ask(`${P}.addHangerRail(${J(w2)}, {})`);
  await page.sleep(600);
  const second = await page.ask(`${P}.addHangerRail(${J(w2)}, {})`);
  await page.sleep(1200);
  const rodsNow = await page.ask(`(() => { const r = ${P}.unitResult(${J(w2)}); return [r.assemblies.rail, ...(r.assemblies.columnRails || [])].filter(Boolean).map((x) => x.y); })()`);
  check('4.0 the second rod is born 950 under the first', Boolean(first && second) && JSON.stringify(rodsNow) === '[1418,468]', JSON.stringify(rodsNow));
  const tubes = await page.ask(`(() => { const v = window.__cc.views.room; let n = 0; v.scene.traverse((o) => { if (o.isMesh && o.userData && o.userData.ccRailItemId) n += 1; }); return n; })()`);
  const rodMeshes = await page.ask(`(() => { const v = window.__cc.views.room; const ys = new Set(); v.scene.traverse((o) => { if (o.isMesh && o.userData && (o.userData.ccRailItemId || o.userData.ccRail)) { o.updateMatrixWorld(true); ys.add(Math.round(new v.three.Vector3().setFromMatrixPosition(o.matrixWorld).y * 1000)); } }); return [...ys]; })()`);
  await roomView(page); await settleCamera(page);
  await page.screenshot(`${OUT}/08-two-rods.png`);
  check('4.1 the scene draws two rods', rodMeshes.length >= 2 || tubes >= 2, `rod meshes at y ${JSON.stringify(rodMeshes)}, tagged ${tubes}`);
  const third = await page.ask(`${P}.addHangerRail(${J(w2)}, {})`);
  const why = await page.ask(`${P}.hangerRailRefusal(${J(w2)}, null)`);
  check('4.2 a third is refused in words', third === null && why === 'This bay already hangs two rails.', String(why));
  const pulled = await page.ask(`${P}.moveRail(${J(w2)}, ${J(first)}, 1395)`);
  check('4.3 a drag of the first rod to 1395 is caught at 1400 (950 over the second)', pulled && pulled.pos === 1400 && pulled.magnet && pulled.magnet.railItemId === second, JSON.stringify(pulled));
} catch (e) {
  check('walk ran to the end', false, String(e && e.stack || e).slice(0, 300));
} finally {
  const bad = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - bad.length}/${checks.length} ${bad.length ? 'RED' : 'GREEN'}`);
  await page.close();
  await showroomDown();
  process.exit(bad.length ? 1 : 0);
}
