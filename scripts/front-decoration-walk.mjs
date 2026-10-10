import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { open, room, withWardrobe, showroomDown } from './t74-harness.mjs';
// T76 F6 · the lazy client: retail shows no recipe number, so the walk reads
// the owner's numbers off the profile instead of typing one.
import { DEFAULT_CABINET_PROFILE } from '../src/engine/profile.js';

const OWNER_PITCH = DEFAULT_CABINET_PROFILE.front.decoration.G.groovePitchMm;

const output = new URL('../verify/front-decoration/', import.meta.url).pathname;
mkdirSync(output, { recursive: true });
const ledger = [];
const probe = process.argv.includes('--probe-g');
const lifecycle = process.argv.includes('--lifecycle');
const stylesOnly = process.argv.includes('--styles-only');
const check = (name, value, detail = null) => {
  ledger.push({ name, pass: Boolean(value), detail });
  console.log(`${value ? 'PASS' : 'FAIL'} ${name}${detail ? ` ${JSON.stringify(detail)}` : ''}`);
};
const base = 'http://127.0.0.1:4174/';
const server = spawn(process.execPath, ['--input-type=module', '-e',
  "import { createServer } from 'vite'; const server = await createServer({ server: { host: '127.0.0.1', port: 4174, strictPort: true, hmr: false } }); await server.listen();"],
{ cwd: new URL('..', import.meta.url), stdio: 'ignore' });
process.on('exit', () => server.kill());
for (let attempt = 0; attempt < 60; attempt += 1) {
  if (await fetch(base).then((response) => response.ok).catch(() => false)) break;
  await new Promise((resolve) => setTimeout(resolve, 250));
}
const page = await open({ width: 1600, height: 1100 });
try {
  await room(page, { base });
  await withWardrobe(page);
  await page.press('[data-testid="cat-fronts"]');
  if (!await page.ask('window.__cc.project.getState().units[0]?.params.doors')) {
    await page.press('[data-testid="fronts-add-doors"]');
  }
  const read = () => page.ask(`(() => {
    const s = window.__cc.project.getState(); const unit = s.units[0];
    const result = s.unitResult(unit.id);
    return { style: s.project.design.fronts.style, decoration: s.project.design.fronts.decoration,
      width: unit.params.width, fronts: result.panels.filter((p) => p.meta?.frontDecoration)
      .map((p) => ({ id: p.id, decoration: p.meta.frontDecoration, pockets: p.cnc?.pockets?.length,
        paths: p.cnc?.paths?.length, width: p.w, thickness: p.thickness, drills: result.drills.filter((drill) => (drill.panel || drill.panelId) === p.id) })), warnings: result.warnings };
  })()`);
  for (const style of (probe || lifecycle ? ['G'] : ['G', 'GF', 'A', 'AH', 'FL', 'AM'])) {
    await page.press(`[data-testid="fronts-style-${style}"]`);
    const now = await read();
    check(`click ${style} stores its explicit defaults`, now.style === style && now.decoration?.style === style, now.decoration);
    check(`click ${style} reaches the cabinet fronts`, now.fronts.length > 0, now.fronts.map((front) => ({ id: front.id, style: front.decoration.style, status: front.decoration.status, problems: front.decoration.problems, thickness: front.thickness, drills: front.decoration.status === 'blocked' ? front.drills : undefined })));
    check(`click ${style} defaults are ready for production`, now.fronts.length > 0 && now.fronts.every((front) => front.decoration.status === 'ready'));
    check(`click ${style} shows no recipe number (T76 F6)`, await page.count('[data-decoration-field]') === 0);
    await page.sleep(1800);
    const meshes = await page.ask(`(() => { const out = []; window.__cc.views.room.scene.traverse((mesh) => {
      if (!mesh.isMesh || !String(mesh.userData?.ccPanelId || '').includes('-F')) return;
      const geometry = mesh.geometry; const position = geometry.attributes?.position;
      out.push({ panel: mesh.userData.ccPanelId, name: mesh.name, vertices: position?.count,
        decoration: geometry.userData?.frontDecoration || null, visible: mesh.visible,
        z: position ? [Math.min(...Array.from(position.array).filter((_, i) => i % 3 === 2)), Math.max(...Array.from(position.array).filter((_, i) => i % 3 === 2))] : null });
    }); return out; })()`);
    check(`click ${style} installs decorated geometry`, meshes.some((mesh) => mesh.decoration?.style === style), meshes);
    await page.screenshot(`${output}retail-${style}.png`);
  }
  if (!probe && !stylesOnly) {
  await page.press('[data-testid="fronts-style-G"]');
  check('the owner\'s groove spacing is the recipe', (await read()).decoration.groovePitchMm === OWNER_PITCH);
  await page.press('[data-testid="fronts-opening-jhandle"]');
  check('opening change preserves face pattern', (await read()).decoration.groovePitchMm === OWNER_PITCH && (await read()).style === 'G');
  await page.press('[data-testid="fronts-opening-handles"]');
  await page.waitFor(`document.querySelector('[data-testid="cat-size"]')`, { timeout: 15000 });
  await page.press('[data-testid="cat-size"]');
  await page.press('[data-testid="size-width"]');
  await page.key('a', { ctrl: true });
  await page.typeText('850');
  await page.pressKey('Enter');
  const resized = await read();
  check('width edit rebuilds the decorated front', resized.width === 850 && resized.fronts.length > 0, { width: resized.width, fronts: resized.fronts.length });
  // Retail persistence is the estimate file, not browser memory.
  const downloads = mkdtempSync(`${output}retail-downloads-`);
  await page.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });
  await page.press('[data-testid="cat-review"]');
  await page.press('[data-testid="review-done"]');
  await page.waitFor(`document.querySelector('[data-testid="estimate-edit-1"]')`, { timeout: 45000 });
  await page.press('[data-testid="estimate-save"]');
  let filename;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    filename = readdirSync(downloads).find((name) => name.endsWith('.json'));
    if (filename) break;
    await page.sleep(200);
  }
  if (!filename) throw new Error('SAVE THIS ESTIMATE did not download a JSON file');
  const savedPath = `${downloads}/${filename}`;
  const saved = JSON.parse(readFileSync(savedPath, 'utf8'));
  check('Save estimate downloads the recipe', JSON.stringify(saved).includes(`"groovePitchMm":${OWNER_PITCH}`), { file: savedPath });
  const documentStarted = await page.ask('performance.timeOrigin');
  await page.send('Page.reload', {});
  await page.waitFor(`performance.timeOrigin !== ${documentStarted} && document.querySelector('[data-testid="estimate-empty"]')`, { timeout: 60000 });
  check('reload follows the existing memory-only estimate contract', await page.has('[data-testid="estimate-empty"]'));
  const documentNode = await page.send('DOM.getDocument', {});
  const fileInput = await page.send('DOM.querySelector', { nodeId: documentNode.root.nodeId, selector: '[data-testid="detail-load"]' });
  await page.send('DOM.setFileInputFiles', { nodeId: fileInput.nodeId, files: [savedPath] });
  await page.waitFor(`document.querySelector('[data-testid="estimate-edit-1"]')`, { timeout: 30000 });
  check('Load estimate restores the saved wardrobe row', await page.has('[data-testid="estimate-edit-1"]'));
  await page.press('[data-testid="estimate-edit-1"]');
  await page.waitFor(`window.__cc && window.__cc.project && window.__cc.project.getState().units.length > 0 && document.querySelector('[data-testid="cat-fronts"]')`, { timeout: 60000 });
  await page.sleep(2000);
  const reloaded = await read();
  check('saved file reload keeps the chosen recipe and width', reloaded.decoration?.groovePitchMm === OWNER_PITCH && reloaded.width === 850, { recipe: reloaded.decoration, width: reloaded.width });
  check('saved file reload rebuilds production-ready fronts', reloaded.fronts.length > 0 && reloaded.fronts.every((front) => front.decoration.status === 'ready'));
  await page.press('[data-testid="cat-fronts"]');
  await page.screenshot(`${output}retail-reloaded.png`);
  }
  const errors = page.errors.filter((error) => !/favicon|supabase|fonts\.googleapis\.com|Failed to load resource.*404/.test(error));
  check('browser reports no app exceptions', errors.length === 0, errors);
} catch (error) {
  check('walk completed', false, String(error?.stack || error));
  console.log('BROWSER', JSON.stringify(page.errors));
  console.log('PAGE', await page.ask('({ url: location.href, text: document.body.innerText.slice(0,3000) })').catch(() => null));
  await page.screenshot(`${output}retail-failure.png`).catch(() => {});
} finally {
  writeFileSync(`${output}${probe ? 'retail-probe-G' : (lifecycle ? 'retail-lifecycle' : (stylesOnly ? 'retail-style-walk' : 'retail-walk'))}.json`, JSON.stringify(ledger, null, 2));
  await page.close();
  await showroomDown();
  server.kill();
}
if (ledger.some((entry) => !entry.pass)) process.exitCode = 1;
