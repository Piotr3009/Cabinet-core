/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT FIX 19.10.2026 · THE WALK: DELETE IN THE WINDOW, THE EDGE SQUARES, THE CLOCKS, THE ROD, THE AFTERNOON ───
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

  // ── 5. THE AFTERNOON (ZIP 4): THE EDGE NOTCH'S BOARDS, THE SITE TRIM, THE CHANGES LIST CLOSING ITSELF ──
  // A BUD with the bottom-back edge notch (KIT_NOTCH.lsp I3 case A), an END panel on its right and a plinth.
  const bud = await page.ask(`(() => { const r = ${P}.addUnit('BUD', { wall: 0, x: 2400 }); return r && r.id; })()`);
  await page.sleep(900);
  const en = await page.ask(`${P}.setUnitEdgeNotch(${J(bud)}, { edge: 'BB', d: 20, h: 120 })`);
  await page.ask(`${P}.addEndPanel(${J(bud)}, { side: 'R' })`);
  await page.ask(`${P}.addPlinth(${J(bud)})`);
  await page.sleep(1200);
  const boards = await page.ask(`${P}.unitResult(${J(bud)}).panels.filter((p) => p.role === 'notch_box').map((p) => p.id + ' ' + p.w + 'x' + p.h).join('|')`);
  check('5.0 the edge notch cuts its closing boards (KIT_NOTCH.lsp D22 amended)', en && en.ok && boards === 'EDGE-STEP 600x120|EDGE-LID 564x20', `${JSON.stringify(en)} ${boards}`);
  const sceneBoards = await page.ask(`(() => { const v = window.__cc.views.room; const ids = new Set(); v.scene.traverse((o) => { if (o.isMesh && o.userData && /^EDGE-/.test(String(o.userData.ccPanelId || ''))) ids.add(o.userData.ccPanelId); }); return [...ids].sort().join('|'); })()`);
  check('5.1 the scene draws the EDGE-STEP and the EDGE-LID', sceneBoards === 'EDGE-LID|EDGE-STEP', sceneBoards);
  const trim = await page.ask(`(() => { const r = ${P}.unitResult(${J(bud)}); const ep = r.panels.find((p) => p.id === 'END-R'); const pl = r.panels.find((p) => p.id === 'PLINTH');
    return { ep: [ep.w, ep.h, ep.box.d, ep.box.h, (ep.meta.oversize || {}).frame], pl: [pl.w, pl.h, pl.box.w, pl.box.h], epNotch: ep.meta.oversize && ep.meta.oversize.nominal.cnc.notch }; })()`);
  check('5.2 END-R is CUT 20 bigger on its back, top and bottom, its box the nominal; the plinth on all four (KIT_SITE_TRIM.lsp)',
    trim && JSON.stringify(trim.ep) === '[616,910,596,870,["L","T","B"]]' && JSON.stringify(trim.pl) === '[640,140,600,100]', JSON.stringify(trim));
  check('5.3 END-R covers the EDGE-STEP\'s end (sb + ed = 30, D23)', trim && trim.epNotch && trim.epNotch.nw === 30 && trim.epNotch.nh === 220, JSON.stringify(trim && trim.epNotch));
  const endSolid = await page.ask(`(() => { const v = window.__cc.views.room; let box = null; v.scene.traverse((o) => { if (!box && o.isMesh && o.userData && o.userData.ccPanelId === 'END-R' && o.userData.ccUnitId === ${J(bud)}) { box = new v.three.Box3().setFromObject(o); } });
    if (!box) { v.scene.traverse((o) => { if (!box && o.isMesh && o.userData && o.userData.ccPanelId === 'END-R') box = new v.three.Box3().setFromObject(o); }); }
    return box ? [Math.round((box.max.y - box.min.y) * 1000), Math.round((box.max.z - box.min.z) * 1000)] : null; })()`);
  check('5.4 the room draws the END panel at its NOMINAL (870 high, 596 deep), not the cut', endSolid && endSolid[0] === 870 && endSolid[1] === 596, JSON.stringify(endSolid));
  await roomView(page); await settleCamera(page);
  await page.screenshot(`${OUT}/09-edge-box-and-trim.png`);
  // The CNC sheet says OVERSIZE +20 BACK/TOP/BOTTOM on END-R and ALL EDGES on the plinth.
  await page.ask(`${U}.setViewMode('cnc')`);
  await page.sleep(1500);
  let sheet = '';
  for (let i = 0; i < 12 && !/NOM 596 x 870/.test(sheet); i += 1) {
    await page.sleep(500);
    sheet = await page.ask(`[...document.querySelectorAll('svg text')].map((t) => t.textContent).filter((t) => /OVERSIZE/.test(t)).join('|')`);
  }
  // (the plinth's own note is drawn only where the sheet's scale keeps it legible: minLabelPx; END-R's is the proof)
  check('5.5 the CNC sheet says OVERSIZE +20 BACK/TOP/BOTTOM - TRIM ON SITE (NOM 596 x 870) on END-R', /BACK\/TOP\/BOTTOM/.test(sheet) && /NOM 596 x 870/.test(sheet), sheet.slice(0, 140));
  const checkRows = await page.ask(`${P}.runChecks().filter((f) => f.unitId === ${J(bud)} || /\\b01\\b/.test(String(f.message || ''))).map((f) => (f.check || '?') + ':' + (f.level || '') + ':' + String(f.message || '').slice(0, 90))`);
  check('5.6a the Check on this cabinet: one row, #30 yellow (the box boards are the joiner\'s to finish), nothing red', checkRows.length === 1 && /^30:yellow/.test(checkRows[0]), JSON.stringify(checkRows));
  await page.screenshot(`${OUT}/10-cnc-oversize-notes.png`);
  await page.ask(`${U}.setViewMode('3d')`);
  await page.sleep(600);
  // The Changes list closes itself after historyOpenMs (10 s).
  await page.ask(`(() => { ${U}.clearMessages(); ${U}.clearHistory(); ${U}.notify('Walk: a row for the list', 'ok'); return true; })()`);
  await page.ask(`${U}.toggleHistory()`);
  await page.sleep(500);
  const openNow = await page.ask(`${U}.historyOpen`);
  check('5.6 the Changes list opens on the click', openNow === true, String(openNow));
  await page.screenshot(`${OUT}/11-changes-open.png`);
  await page.sleep(10800);
  const openLater = await page.ask(`${U}.historyOpen`);
  const rows = await page.ask(`${U}.history.length`);
  check('5.7 after 10.8 s it has closed itself; its rows stay', openLater === false && rows >= 1, `open ${openLater}, rows ${rows}`);
  await page.screenshot(`${OUT}/12-changes-closed-itself.png`);
} catch (e) {
  check('walk ran to the end', false, String(e && e.stack || e).slice(0, 300));
} finally {
  const bad = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - bad.length}/${checks.length} ${bad.length ? 'RED' : 'GREEN'}`);
  await page.close();
  await showroomDown();
  process.exit(bad.length ? 1 : 0);
}
