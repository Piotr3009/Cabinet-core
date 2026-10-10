#!/usr/bin/env node
// Real PRO controls and actual downloaded files. The harness only creates
// the initial empty project; all feature changes use mouse and keyboard.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import JSZip from 'jszip';
import { createServer } from 'vite';
import { open, pro, showroomDown, reach } from './t74-harness.mjs';
import { readDxf } from './t53-dxf-audit.mjs';

const output = resolve('verify/decorative-fronts');
const downloads = resolve(output, `pro-downloads-${Date.now()}`);
mkdirSync(downloads, { recursive: true });
const checks = [];
const check = (label, ok, detail = '') => {
  checks.push({ label, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? `: ${detail}` : ''}`);
};
const vite = process.env.CC_WALK_SERVER === '1'
  ? await createServer({ server: { host: '127.0.0.1', port: 4173, strictPort: true, hmr: false, watch: { ignored: ['**/*'] } }, clearScreen: false }) : null;
await vite?.listen();
const page = await open({ width: 1600, height: 1000 });
const runtimeExceptions = [];
page.socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') runtimeExceptions.push(message.params.exceptionDetails);
});
const shot = (name) => page.screenshot(resolve(output, `pro-${name}.png`));
const menu = async (name, item) => {
  await page.click('nav[aria-label="Main menu"] > div > button', name, { exact: true });
  await page.sleep(200);
  if (item) await page.press('[role="menuitem"]', item);
};
const select = async (selector, value) => {
  const index = await page.ask(`Array.from(document.querySelector(${JSON.stringify(selector)}).options).findIndex(o => o.value === ${JSON.stringify(value)})`);
  if (index < 0) throw new Error(`No select option ${value}`);
  await page.click(selector);
  await page.key('Home', { code: 'Home', windowsVirtualKeyCode: 36 });
  for (let i = 0; i < index; i += 1) await page.key('ArrowDown', { code: 'ArrowDown', windowsVirtualKeyCode: 40 });
  await page.pressKey('Enter');
  await page.sleep(900);
};
const field = async (selector, value) => {
  await page.click(selector);
  await page.key('a', { ctrl: true });
  await page.typeText(value);
  await page.pressKey('Enter');
  await page.sleep(600);
};
const state = () => page.ask(`(() => {
  const store = window.__cc.project.getState();
  const unit = store.units[0];
  const result = unit && store.unitResult(unit.id);
  const front = result?.panels.find(p => p.meta?.frontDecoration);
  return { units: store.units.length, unitId: unit?.id, params: unit?.params,
    front: front ? { id: front.id, w: front.w, h: front.h, thickness: front.thickness,
      decoration: { style: front.meta.frontDecoration.style, status: front.meta.frontDecoration.status,
        problems: front.meta.frontDecoration.problems, operations: front.meta.frontDecoration.operations.map(o=>({id:o.id,kind:o.kind,depth:o.depth,tool:o.tool})),
        additions: front.meta.frontDecoration.additions.length } } : null,
    strips: result?.panels.filter(p => p.meta?.frontDecorationParent).length };
})()`);
const downloadAfter = async (run, extension) => {
  const before = new Set(readdirSync(downloads));
  await run();
  let path;
  for (let i = 0; i < 80; i += 1) {
    path = readdirSync(downloads).find(name => !before.has(name) && name.endsWith(extension));
    if (path) return resolve(downloads, path);
    await page.sleep(200);
  }
  throw new Error(`No ${extension} download. Body: ${await page.ask('document.body.innerText')}`);
};

try {
  await pro(page);
  await page.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });
  await menu('Library', 'Kitchen');
  await page.press('[data-library-group="base-units"]');
  await page.press('[data-library-entry="door-base"]');
  await page.press('[aria-label="Close the library"]');
  check('Standard BUD added through library', (await state()).units === 1);
  await page.press('button', 'Doors');
  await page.press('button', 'Add doors');
  const target = await page.ask(`(() => { const s=window.__cc.project.getState(); const u=s.units[0]; return {unitId:u.id,panelId:s.unitResult(u.id).panels.find(p=>p.role==='front').id}; })()`);
  for (const prefer of ['top', 'bottom', 'middle']) {
    const at = await reach(page, target.unitId, target.panelId, { prefer });
    if (!at) continue;
    await page.clickAt(at.x, at.y);
    if (await page.has('[data-unit-name]')) break;
  }
  await page.press('button', 'Carcass');
  if (!(await page.has('[data-unit-front-type]'))) {
    const text = await page.ask('document.body.innerText');
    throw new Error(`Unit front selector not visible after add: ${text}`);
  }
  const styles = process.env.CC_WALK_EXPORTS_ONLY === '1' ? ['GF'] : ['G', 'GF', 'A', 'AH', 'SS', 'FL', 'AM'];
  for (const style of styles) {
    await select('[data-unit-front-type]', style);
    const current = await state();
    check(`${style} selected through real dropdown and computed ready`, current.front?.decoration.style === style && current.front.decoration.status === 'ready', JSON.stringify({ style: current.front?.decoration.style, status: current.front?.decoration.status, operations: current.front?.decoration.operations.length, additions: current.front?.decoration.additions }));
    if (['GF', 'A', 'FL', 'AM'].includes(style)) await shot(style.toLowerCase());
    if (style === 'AM') check('Applied moulding contributes four real parts', current.strips === 4);
  }
  await select('[data-unit-front-type]', 'GF');
  await field('[data-decoration-field="groovePitchMm"]', '32');
  check('Groove spacing edited through NumberField', (await state()).params.front_decoration.groovePitchMm === 32);
  await field('[data-unit-size-field="width"]', '650');
  check('Front resizes with its cabinet', (await state()).params.width === 650 && (await state()).front.w > 640);
  await shot('edited-gf');

  const unitZip = await downloadAfter(async () => { await menu('Output', 'CNC / DXF'); }, '.zip');
  const unitArchive = await JSZip.loadAsync(readFileSync(unitZip));
  const unitNames = Object.keys(unitArchive.files);
  const manifestName = unitNames.find(name => /operations\.json$/.test(name));
  const manifest = JSON.parse(await unitArchive.file(manifestName).async('string'));
  const frontName = unitNames.find(name => /-FRONT\.dxf$/.test(name));
  const frontRead = readDxf(await unitArchive.file(frontName).async('string'));
  check('Real unit ZIP includes front setup and full operation depths', manifest.parts[0].operations.some(op => op.startDepthMm === 6 && op.finalDepthMm === 9));
  check('Downloaded front DXF has decoration and no back drilling', frontRead.polys > 2 && frontRead.circles.length === 0, JSON.stringify({ file: frontName, polys: frontRead.polys }));

  if (await page.has('[data-check-panel]')) await page.press('[data-check-panel] button[title="Close"]');
  await menu('View', 'CNC sheet');
  await page.press('[data-testid="cnc-face-front"]');
  check('Front CNC preview uses separate setup', await page.has('[data-cnc-face="front"]'));
  await page.press('button[title="Fit the whole sheet"]');
  await page.sleep(300);
  const visibleFront = await page.ask(`(() => {
    const ops = [...document.querySelectorAll('[data-cnc-decoration]')].map(node => node.getBoundingClientRect());
    const tree = document.querySelector('[data-material-export]')?.closest('aside')?.getBoundingClientRect();
    const right = tree?.left || innerWidth;
    return { count: ops.length, right, boxes: ops.map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom})),
      visible: ops.length > 0 && ops.every(r=>r.width > 0 && r.left >= 0 && r.right <= right && r.top >= 48 && r.bottom <= innerHeight) };
  })()`);
  check('Front cut geometry fits visibly beside the CNC tree', visibleFront.visible, JSON.stringify(visibleFront));
  await shot('cnc-front');
  await page.press('[data-testid="cnc-face-back"]');
  check('Back CNC preview remains available', await page.has('[data-cnc-face="back"]'));
  await shot('cnc-back');
  const materialZip = await downloadAfter(() => page.press('[data-download-material]'), '.zip');
  const materialArchive = await JSZip.loadAsync(readFileSync(materialZip));
  check('Real material export is a single ZIP containing both setups', Object.keys(materialArchive.files).some(name => /-FRONT\.dxf$/.test(name))
    && Object.keys(materialArchive.files).some(name => /-BACK\.dxf$/.test(name)));

  if (await page.has('[data-check-panel]')) await page.press('[data-check-panel] button[title="Close"]');
  await page.press('[data-cnc-branch]');
  const sheetZip = await downloadAfter(() => page.click('button', 'Download CNC package (ZIP)', { exact: true }), '.zip');
  const sheetArchive = await JSZip.loadAsync(readFileSync(sheetZip));
  check('Real per-unit sheet export includes both setups and operations manifest',
    Object.keys(sheetArchive.files).some(name => /-FRONT\.dxf$/.test(name))
      && Object.keys(sheetArchive.files).some(name => /-BACK\.dxf$/.test(name))
      && Object.keys(sheetArchive.files).some(name => /-operations\.json$/.test(name)));
  if (await page.has('[data-check-panel]')) await page.press('[data-check-panel] button[title="Close"]');
  await menu('View', '3D');
  await menu('Output', 'Bill of materials');
  await shot('bom');
  check('Live BOM identifies routed slab and machining depths', /Routed slab.*depths 6\/9/.test(await page.text('[data-front-manufacturing]')));
  check('BOM opens with the front part', (await page.ask('document.body.innerText')).includes((await state()).front.id));
  await page.click('aside:has([data-bom-purchase-tab]) > div:first-child > button:last-child');
  await menu('Output', 'Drawings');
  await page.press('[role="menuitem"]', 'Preview');
  await page.press('[data-drawing-kind-tab="walls"]');
  await page.sleep(1200);
  await shot('drawing-set');
  const pdf = await downloadAfter(() => page.press('[data-wall-drawings-pdf]'), '.pdf');
  check('Actual drawing set PDF downloads with PDF signature', readFileSync(pdf).subarray(0, 5).toString() === '%PDF-', pdf);
  await page.press('button', 'Close');

  await page.press('[data-save-control]');
  await page.sleep(800);
  check('Save button handled the edited project', !(await page.ask('window.__cc.project.getState().dirty')));
  check('No browser runtime exceptions', runtimeExceptions.length === 0, JSON.stringify(runtimeExceptions));
} catch (error) {
  check('PRO acceptance execution', false, String(error.stack || error));
  await shot('failure').catch(() => {});
  writeFileSync(resolve(output, 'pro-failure-dom.txt'), await page.ask('document.body.innerText').catch(() => 'unavailable'));
} finally {
  writeFileSync(resolve(output, process.env.CC_WALK_REPORT || (process.env.CC_WALK_EXPORTS_ONLY === '1' ? 'pro-exports-walk.json' : 'pro-walk.json')), JSON.stringify({ checks, downloads, console: page.consoleLines, errors: page.errors, runtimeExceptions }, null, 2));
  await page.close();
  await showroomDown();
  await vite?.close();
}
if (checks.some(entry => !entry.ok)) process.exitCode = 1;
