#!/usr/bin/env node
// ─── T74 · THE BROWSER PROBES, COMMITTED AS TABLES BEFORE ANY FIX ──────────
//
// CLAUDE.md T74, LAWS: *"Diagnose before you cut."* and *"Test the way the
// client clicks."*  Three of tonight's points are about what the SCENE does
// under the hand, so they are asked of a real browser with real hands (the
// shared `scripts/t74-harness.mjs`): every piece is added by its own button,
// every gesture is a CDP mouse or key event at a pixel the scene's raycaster
// says the piece is under, and the store and the scene are only READ.
//
//   F8   the sloped shoe drawer bottom: where it is, shut and open
//   F11  the corner: a wardrobe pushed in under the slope, then pulled away
//   F12  the J-pull groove: shut, open, shut again, orbit, a colour, a width,
//        a reload, measured on the glass
//
//   npm run build && npx vite preview --port 4173
//   node scripts/t74-probes.mjs [--suffix -after] [f8 f11 f12]

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {
  open, room, withWardrobe, pointOn, reach, orbit, roomView, unitsNow, showroomDown,
} from './t74-harness.mjs';
import { decodePng, regionLuminance } from './png.mjs';

const OUT = new URL('../verify/t74/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const sIdx = process.argv.indexOf('--suffix');
const SUFFIX = sIdx > 0 ? process.argv[sIdx + 1] : '';
const want = process.argv.slice(2).filter((a) => !a.startsWith('-') && a !== SUFFIX);
const runs = (n) => want.length === 0 || want.includes(n);
const table = (cols, rows) => [
  `| ${cols.join(' | ')} |`,
  `|${cols.map(() => '---').join('|')}|`,
  ...rows.map((r) => `| ${cols.map((c) => String(r[c] ?? '').replace(/\|/g, '/')).join(' | ')} |`),
].join('\n');
const write = (name, lines) => {
  writeFileSync(`${OUT}${name}${SUFFIX}.md`, `${lines.join('\n')}\n`);
  process.stdout.write(`written verify/t74/${name}${SUFFIX}.md\n`);
};
const shot = (page, file) => page.screenshot(`${OUT}${file.replace(/\.png$/, `${SUFFIX}.png`)}`);

/**
 * A panel's box in its UNIT's own frame, in millimetres, off the live scene:
 * the mesh's world box corners taken back through the unit group's inverse.
 * x along the unit, y up from its origin, z out from the wall toward the room.
 */
const LOCAL_BOX = `(function (unitId, panelId) {
  const v = window.__cc.views.room; const T = v.three; let mesh = null; let unit = null;
  v.scene.traverse((o) => { if (o.userData && o.userData.ccUnitId === unitId) unit = o; });
  if (!unit) return null;
  unit.traverse((o) => { if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === panelId) mesh = o; });
  if (!mesh) return null;
  unit.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(unit.matrixWorld).invert();
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  const b = mesh.geometry.boundingBox; const lo = [Infinity, Infinity, Infinity]; const hi = [-Infinity, -Infinity, -Infinity];
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
    const p = new T.Vector3(x, y, z).applyMatrix4(mesh.matrixWorld).applyMatrix4(inv);
    const q = [p.x * 1000, p.y * 1000, p.z * 1000];
    for (let i = 0; i < 3; i += 1) { lo[i] = Math.min(lo[i], q[i]); hi[i] = Math.max(hi[i], q[i]); }
  }
  const r = (n) => Math.round(n * 10) / 10;
  return { x: [r(lo[0]), r(hi[0])], y: [r(lo[1]), r(hi[1])], z: [r(lo[2]), r(hi[2])] };
})`;
const localBox = (page, unitId, panelId) => page.ask(`${LOCAL_BOX}(${JSON.stringify(unitId)}, ${JSON.stringify(panelId)})`);

// ═══ F8 · THE SLOPED SHOE DRAWER BOTTOM ═══════════════════════════════════
if (runs('f8')) {
  process.stdout.write('\n─── F8 · the shoe drawer\'s sloped bottom, shut and open ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.press('[data-testid="cat-inside"]');
  await page.press('[data-add-kind="shoe_box"]');
  await page.press('[data-add-shoe-box="1"]');
  await page.sleep(1200);
  const [unit] = await unitsNow(page);
  const ids = await page.ask(`(() => { const r = window.__cc.project.getState().unitResult(${JSON.stringify(unit.id)});
    const ramp = r.panels.find((p) => p.part === 'SHOE-RAMP'); if (!ramp) return null; const n = ramp.meta.drawer;
    const pick = (f) => (r.panels.find(f) || {}).id || null;
    return { n, ramp: ramp.id, floor: pick((p) => p.part === 'DRAWER-BOTTOM' && p.meta && p.meta.drawer === n),
      front: pick((p) => p.part === 'DRAWER-FRONT' && p.meta && p.meta.drawer === n),
      side: pick((p) => p.part === 'DRAWER-SIDE' && p.meta && p.meta.drawer === n),
      tilt: ramp.meta.tilt_deg, pivot: ramp.meta.tilt_pivot, box: ramp.box }; })()`);
  const rows = [];
  if (!ids) {
    rows.push({ state: 'no shoe drawer was made by the buttons', ramp: '', floor: '', front: '' });
  } else {
    // The doors must be open so the drawer front is under the pointer. INSIDE
    // opens them itself (T69 F5); only where it has not is OPEN ALL pressed.
    await page.sleep(1500);
    const doorsOpen = await page.ask(`(() => { const r = window.__cc.project.getState().unitResult(${JSON.stringify(unit.id)});
      const o = (window.__cc.ui.getState().openFronts || {})[${JSON.stringify(unit.id)}] || {};
      return r.panels.filter((p) => p.part === 'FRONT').every((p) => (o[p.id] || 0) > 0); })()`);
    if (!doorsOpen && await page.has('[data-testid="view-open-all"]')) await page.press('[data-testid="view-open-all"]');
    await page.sleep(1500);
    const read = async (state) => {
      const ramp = await localBox(page, unit.id, ids.ramp);
      const floor = await localBox(page, unit.id, ids.floor);
      const front = await localBox(page, unit.id, ids.front);
      const open = await page.ask(`(window.__cc.ui.getState().openFronts || {})[${JSON.stringify(unit.id)}] || {}`);
      rows.push({
        state,
        'drawer open': JSON.stringify(open[ids.front] ?? 0),
        'ramp y (low..high)': ramp ? `${ramp.y[0]}..${ramp.y[1]}` : 'not drawn',
        'ramp z (back..front)': ramp ? `${ramp.z[0]}..${ramp.z[1]}` : '',
        'floor y top': floor ? floor.y[1] : '',
        'floor z (back..front)': floor ? `${floor.z[0]}..${floor.z[1]}` : '',
        'front z': front ? `${front.z[0]}..${front.z[1]}` : '',
        'ramp below the floor by': ramp && floor ? Math.round((floor.y[1] - ramp.y[0]) * 10) / 10 : '',
      });
    };
    await read('shut');
    await shot(page, 'f08-probe-shut.png');
    // A REAL 2klik on the drawer's own front opens it (turn 3's gesture).
    const at = await reach(page, unit.id, ids.front);
    if (at) {
      await page.dblclick(at.x, at.y);
      await page.sleep(1800);
      await read(`open (2klik on ${ids.front})`);
      await shot(page, 'f08-probe-open.png');
      // The front has travelled out, so it is found again where it now is.
      const back = (await reach(page, unit.id, ids.front)) || at;
      await page.dblclick(back.x, back.y);
      await page.sleep(1800);
      await read('shut again');
    } else {
      rows.push({ state: 'the drawer front could not be reached by the pointer' });
    }
    rows.push({ state: `engine: ${ids.ramp} box ${JSON.stringify(ids.box)}, tilt ${ids.tilt}, pivot ${JSON.stringify(ids.pivot)}` });
  }
  await page.close();
  write('f08-probe', [
    '# T74 F8 · the probe: the sloped shoe drawer bottom stays behind',
    '',
    'The owner, 23.09.2026: *"skośne dno szuflady na buty zostaje w szafie przy otwieraniu, nie wysuwa się z szufladą."*',
    '',
    'Run by `node scripts/t74-probes.mjs f8` against the preview. A wardrobe from WHERE, a shoe drawer from INSIDE\'s own',
    'buttons (`shoe_box`, ADD), the doors opened by OPEN ALL, the drawer opened and shut by a real 2klik on its front.',
    'Every box is read off the LIVE scene, in the unit\'s own frame, in mm (y up from the unit origin, z out toward',
    'the room).',
    '',
    table(['state', 'drawer open', 'ramp y (low..high)', 'ramp z (back..front)', 'floor y top', 'floor z (back..front)', 'front z', 'ramp below the floor by'], rows),
    '',
  ]);
}

// ═══ F11 · THE CORNER: PUSHED IN, THEN PULLED AWAY ═══════════════════════
if (runs('f11')) {
  process.stdout.write('\n─── F11 · into the corner and out again ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  // The slope on the corner wall, through the room editor's own buttons.
  await page.press('[data-testid="space-edit-room"]');
  await page.press('[data-elevation-add="slope-right"]');
  await page.sleep(500);
  if (await page.has('[data-room-apply="1"]')) await page.press('[data-room-apply="1"]');
  await page.sleep(800);
  if (await page.has('[data-modal-name="room"]')) await page.pressKey('Escape');
  await page.sleep(600);
  const [unit] = await unitsNow(page);
  const state = async (when) => page.ask(`(() => { const P = window.__cc.project.getState(); const u = P.units.find((x) => x.id === ${JSON.stringify(unit.id)});
    const r = P.unitResult(u.id); const leaves = r.panels.filter((p) => p.part === 'FRONT');
    const items = (u.params.sections && u.params.sections[0] && u.params.sections[0].items) || [];
    return { when: ${JSON.stringify(when)}, x: Math.round(u.position.x_mm),
      doors: JSON.stringify(u.params.doors), bay_doors: JSON.stringify(u.params.bay_doors ?? null),
      hinges: leaves.map((p) => p.id + ':' + (p.meta.hinge || '?') + (p.meta.hingeForced ? '!' : '') + (p.meta.hingeOn ? '@' + p.meta.hingeOn : '')).join(' '),
      partitions: items.filter((i) => i.kind === 'partition').map((i) => Math.round(i.x_mm) + (i.auto_added ? '(auto)' : '')).join(' ') || '(none)',
      items: items.map((i) => i.kind).join(' ') || '(none)',
      end_panels: (u.params.end_panels || []).map((e) => e.side + (e.auto_added ? '(auto)' : '')).join(' ') || '(none)',
      slopes: JSON.stringify((P.project.wallSlopes || []).map((s) => s.wall + ':' + s.side)) }; })()`);
  const rows = [await state('added, the slope on the corner wall (right)')];
  const leafOf = () => page.ask(`(() => { const r = window.__cc.project.getState().unitResult(${JSON.stringify(unit.id)});
    const f = r.panels.filter((p) => p.part === 'FRONT'); return f.length ? f[0].id : null; })()`);
  // PUSH IN: a real drag of a door leaf to the right, far enough to meet the wall.
  let leaf = await leafOf();
  let at = leaf ? await pointOn(page, unit.id, leaf) : null;
  if (at) {
    await page.dragFromTo(at.x, at.y, at.x + 700, at.y, { steps: 30 });
    await page.sleep(1200);
    rows.push(await state(`pushed into the corner (real drag of ${leaf}, +700 px)`));
    await shot(page, 'f11-probe-in-the-corner.png');
    // PULL AWAY: the same gesture back.
    leaf = await leafOf();
    at = leaf ? await reach(page, unit.id, leaf) : null;
    if (at) {
      await page.dragFromTo(at.x, at.y, at.x - 900, at.y, { steps: 30 });
      await page.sleep(1200);
      rows.push(await state(`pulled away (real drag of ${leaf}, -900 px)`));
      await shot(page, 'f11-probe-pulled-away.png');
    }
  } else {
    rows.push({ when: 'no door leaf under the pointer' });
  }
  await page.close();
  write('f11-probe', [
    '# T74 F11 · the probe: pulling away does not undo what pushing in did',
    '',
    'The owner, 23.09.2026: *"dosunięcie szafy do ściany narożnej zmienia orientację drzwi i dokłada panel',
    '(perfekcyjnie), ale po odsunięciu nic nie wraca: drzwi nie wracają na oryginalną stronę, panel/divider nie znika.',
    'Brak odwrócenia operacji."*',
    '',
    'Run by `node scripts/t74-probes.mjs f11`. A wardrobe from WHERE; the slope on the corner wall through EDIT THE ROOM',
    '(the elevation\'s SLOPE RIGHT); then a REAL drag of a door leaf into the corner and a real drag back. `hinges` lists',
    'each leaf as `id:hand`, `!` where the slope forced the hand and `@board` for the board it hangs on.',
    '',
    table(['when', 'x', 'doors', 'bay_doors', 'hinges', 'partitions', 'items', 'end_panels'], rows),
    '',
  ]);
}

// ═══ F12 · THE J-PULL GROOVE, ON THE GLASS ═══════════════════════════════
if (runs('f12')) {
  process.stdout.write('\n─── F12 · the J groove, condition by condition ───\n');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.press('[data-testid="cat-extras"]');
  if (!(await page.ask('(() => { const u = window.__cc.project.getState().units[0]; return Boolean(u && u.params.doors); })()'))) {
    await page.press('[data-testid="extras-add-doors"]');
  }
  await page.press('[data-testid="extras-handle-jpull"]');
  await page.sleep(1500);
  const [unit] = await unitsNow(page);

  /** The J leaf, its groove's patch on the glass, and a patch of plain door beside it. */
  const patches = () => page.ask(`(() => { const P = window.__cc.project.getState(); const r = P.unitResult(${JSON.stringify(unit.id)});
    const leaf = r.panels.find((p) => p.part === 'FRONT' && p.cnc && p.cnc.jpull && p.cnc.jpull.edge); if (!leaf) return null;
    const v = window.__cc.views.room; const T = v.three; let mesh = null; let unitG = null;
    v.scene.traverse((o) => { if (o.userData && o.userData.ccUnitId === ${JSON.stringify(unit.id)}) unitG = o; });
    if (unitG) unitG.traverse((o) => { if (!mesh && o.isMesh && o.userData && o.userData.ccPanelId === leaf.id) mesh = o; });
    if (!mesh) return { leaf: leaf.id, mesh: false };
    const jp = leaf.meta.jpull || {}; const b = leaf.box;
    const from = (jp.run && jp.run.from) != null ? jp.run.from : 0; const to = (jp.run && jp.run.to) != null ? jp.run.to : b.h;
    const edgeX = jp.edge === 'L' ? b.x : (jp.edge === 'R' ? b.x + b.w : b.x + b.w / 2);
    const inward = jp.edge === 'L' ? 1 : -1; const zFace = b.z + b.d;
    const r0 = v.gl.domElement.getBoundingClientRect();
    const scr = (x, y, z) => { const p = new T.Vector3(x / 1000, y / 1000, z / 1000).applyMatrix4(unitG.matrixWorld).project(v.camera);
      return { x: r0.left + (p.x * 0.5 + 0.5) * r0.width, y: r0.top + (-p.y * 0.5 + 0.5) * r0.height }; };
    const rect = (x0, x1, y0, y1, z) => { const pts = [scr(x0, y0, z), scr(x1, y0, z), scr(x0, y1, z), scr(x1, y1, z)];
      const xs = pts.map((p) => p.x); const ys = pts.map((p) => p.y);
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; };
    const mid0 = b.y + from + (to - from) * 0.2; const mid1 = b.y + from + (to - from) * 0.8;
    const g0 = edgeX + inward * 6; const g1 = edgeX + inward * 26;
    const f0 = edgeX + inward * 60; const f1 = edgeX + inward * 120;
    const geo = mesh.geometry; let key = null;
    for (const [k, m] of Object.entries(window.__cc.views)) { if (m && m.scene) { key = k; break; } }
    let light = null; v.scene.traverse((o) => { if (!light && o.isDirectionalLight && o.castShadow) light = o; });
    return { leaf: leaf.id, edge: jp.edge, mesh: true, verts: geo.attributes.position.count, type: geo.type,
      castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow,
      normalBiasMm: light ? Math.round(light.shadow.normalBias * 1000 * 10) / 10 : null,
      groove: rect(Math.min(g0, g1), Math.max(g0, g1), mid0, mid1, zFace), face: rect(Math.min(f0, f1), Math.max(f0, f1), mid0, mid1, zFace) }; })()`);

  const rows = [];
  const measure = async (condition, file) => {
    await page.sleep(1300);
    const p = await patches();
    const path = `${OUT}${file.replace(/\.png$/, `${SUFFIX}.png`)}`;
    await page.screenshot(path);
    let g = null; let f = null;
    if (p && p.mesh) {
      const png = decodePng(readFileSync(path));
      g = regionLuminance(png, p.groove);
      f = regionLuminance(png, p.face);
    }
    const contrast = g && f && f.mean ? Math.round((Math.abs(f.mean - g.mean) / f.mean) * 1000) / 10 : null;
    rows.push({
      condition,
      leaf: p ? `${p.leaf} (${p.edge})` : '(no J leaf)',
      'solid built': p ? `${p.mesh ? `${p.type}, ${p.verts} vertices` : 'no mesh'}` : '',
      shadows: p && p.mesh ? `cast ${p.castShadow}, receive ${p.receiveShadow}, key normalBias ${p.normalBiasMm} mm` : '',
      'groove luma': g ? g.mean : '',
      'door face luma': f ? f.mean : '',
      'groove vs face': contrast == null ? '' : `${contrast} %`,
      frame: file.replace(/\.png$/, `${SUFFIX}.png`),
    });
    process.stdout.write(`${condition}: ${JSON.stringify(rows[rows.length - 1])}\n`);
  };

  await page.press('[data-testid="view-front"]');
  await measure('doors shut, front camera', 'f12-probe-1-shut.png');
  await page.press('[data-testid="view-open-all"]');
  await measure('doors open (OPEN ALL)', 'f12-probe-2-open.png');
  await page.press('[data-testid="view-open-all"]');
  await measure('shut again (OPEN ALL twice)', 'f12-probe-3-shut-again.png');
  await roomView(page);
  await orbit(page, 90, 0);
  await measure('orbit (ROOM, then a real drag)', 'f12-probe-4-orbit.png');
  await page.press('[data-testid="view-front"]');
  await page.press('[data-testid="cat-fronts"]');
  const colour = await page.ask('(() => { const b = [...document.querySelectorAll(\'[data-testid^="fronts-colour-"]\')].find((el) => /fronts-colour-(?!rows|picker|remove|add)/.test(el.getAttribute("data-testid"))); return b ? b.getAttribute("data-testid") : null; })()');
  if (colour) await page.press(`[data-testid="${colour}"]`);
  const swatch = await page.ask('(() => { const all = [...document.querySelectorAll(\'[data-testid="fronts-colour-picker"] button\')]; return all.length > 3 ? all.length : 0; })()');
  if (swatch) {
    await page.ask('(() => { const all = [...document.querySelectorAll(\'[data-testid="fronts-colour-picker"] button\')]; const b = all[3]; const r = b.getBoundingClientRect(); window.__probeAt = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; return true; })()');
    const xy = await page.ask('window.__probeAt');
    await page.clickAt(Math.round(xy.x), Math.round(xy.y));
  }
  await measure(`a colour change (${colour || 'no colour row'})`, 'f12-probe-5-colour.png');
  await page.press('[data-testid="cat-size"]');
  if (await page.has('[data-testid="size-width"]')) {
    await page.click('[data-testid="size-width"]');
    await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
    await page.typeText('1400');
    await page.pressKey('Enter');
  }
  await page.press('[data-testid="view-front"]');
  await measure('a width change (SIZE, typed 1400)', 'f12-probe-6-width.png');
  await page.evaluate('location.reload(); return true;');
  await page.waitFor('window.__cc && window.__cc.pbi && window.__cc.pbi.render', { timeout: 45000 });
  await page.sleep(2600);
  const after = await page.ask('window.__cc.project.getState().units.length');
  rows.push({
    condition: 'a page reload',
    leaf: after ? '' : '(the client\'s room keeps no project across a reload: `setPersistence(\'none\')`, `main-retail.jsx`)',
  });
  await page.close();

  write('f12-probe', [
    '# T74 F12 · the probe: when is the J-pull groove seen',
    '',
    'The owner, 23.09.2026: *"na 3D nie widać J-pulla w ogóle; czasami się pojawia, ale nie wiem co powoduje, że',
    'czasami widać, czasami nie; pasowałoby, żeby miał cień, bo teraz nie ma i nic nie widać."*',
    '',
    'Run by `node scripts/t74-probes.mjs f12`. A wardrobe from WHERE, doors and the J-pull from EXTRAS\' own buttons,',
    'then each condition by the room\'s own controls (FRONT, OPEN ALL, ROOM and a real orbit drag, a colour chip, a typed',
    'width, a reload). `groove luma` is the mean luminance of the groove\'s patch on the screenshot (6 to 26 mm in from',
    'the J edge, the middle of the run), `door face luma` a patch of plain door 60 to 120 mm in, same height; `groove vs',
    'face` is how far apart the two are. A groove the eye can find differs from its door.',
    '',
    table(['condition', 'leaf', 'solid built', 'shadows', 'groove luma', 'door face luma', 'groove vs face', 'frame'], rows),
    '',
  ]);
}

await showroomDown();
process.exit(0);
