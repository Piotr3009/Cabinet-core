// ─── Turn 6, end to end, in a real Chromium ───
//
// Run:  npm run build && npm run preview -- --port 4173
//       node scripts/e2e-turn6.mjs
//
// What it walks: Output ▸ Render (1080p PNG, dimensions checked), the Drawings
// probe (SVG on screen and exported), a run of units with an L-shaped top
// infill and an open end, the end panel pulled to the ceiling, the selection
// outline, and the three exports from their new home in Output.
//
// It exists because turn 5 shipped a green test suite, a green build and a dead
// 3D canvas. Screenshots land in docs/turn6.

import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const SHOTS = new URL('../docs/turn6/', import.meta.url).pathname;

/** Pull the render itself out of the page, so the PNG can be looked at. */
async function saveRender(page, name) {
  const dataUrl = await page.evaluate(
    'const img = document.querySelector(\'img[alt="Render preview"]\'); return img ? img.src : null;',
  );
  if (!dataUrl) return null;
  mkdirSync(SHOTS, { recursive: true });
  const path = `${SHOTS}${name}.png`;
  writeFileSync(path, Buffer.from(dataUrl.split(',')[1], 'base64'));
  return path;
}

const steps = [];
let shotNo = 0;
const shot = async (page, name) => {
  shotNo += 1;
  await page.screenshot(`${SHOTS}${String(shotNo).padStart(2, '0')}-${name}.png`);
};
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  console.log(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

/** Open a top-bar menu and click one of its entries (hovering any submenu). */
async function menu(page, top, path) {
  await page.click('nav[aria-label="Main menu"] > div > button', top);
  for (const label of path.slice(0, -1)) await page.hover('[role="menu"] button', label);
  await page.click('[role="menu"] button', path[path.length - 1]);
}

const page = await launch({ width: 1600, height: 1000 });

try {
  // ── 1. a project and a run of three units ──
  await page.goto(BASE);
  await page.waitFor('document.body.innerText.includes("NEW PROJECT")');
  await page.click('button', 'New project');
  await page.waitFor('document.querySelector("canvas")');
  await page.sleep(1200);
  check('the editor opens with a live canvas', await page.evaluate(
    'const c = document.querySelector("canvas"); return Boolean(c && c.width > 100);',
  ));
  await shot(page, 'editor-empty');

  // Doors on every unit, so the render has SPRAYED surfaces in it to compare
  // with the melamine carcass — that comparison is the acceptance test in
  // CLAUDE.md ("melamina ≠ lakier okiem").
  const addUnit = async (label) => {
    await menu(page, 'Library', ['Base units']);
    await page.click('button', label);
    await page.sleep(500);
    // A shelf, so the elevation has something BEHIND the door to draw as a
    // hidden line — which is one of the things phase 7 is checked on.
    await page.click('button', 'Add items').catch(() => {});
    await page.sleep(250);
    await page.click('button', 'Shelves').catch(() => {});
    await page.sleep(250);
    await page.click('button', 'Add', { exact: true }).catch(() => {});
    await page.sleep(350);
    await page.click('button', 'Add doors — finish unit').catch(() => {});
    await page.sleep(400);
  };
  await addUnit('Base unit');
  await addUnit('Base unit');
  await addUnit('Base unit');
  await page.sleep(600);

  // The right panel closes itself once doors are on (SPEC 4.10), so the count
  // is read where it is always true: the live BOM.
  await page.click('button', 'BOM');
  await page.sleep(700);
  const built = await page.evaluate(`
    const rows = [...document.querySelectorAll('td[colspan="7"]')].map((td) => td.textContent.trim());
    const fronts = document.body.innerText.match(/Fronts\\s+([\\d.]+) m²/);
    return { units: rows, frontArea: fronts ? Number(fronts[1]) : 0 };
  `);
  check('three base units placed, with doors',
    built.units.length === 3 && built.frontArea > 0,
    `${built.units.join(' | ')} — fronts ${built.frontArea} m²`);
  await page.click('button', 'BOM');
  await page.sleep(400);

  // A dark front against a broken-white carcass: the difference between the
  // two PBR families has to be visible on a still, not argued about.
  await menu(page, 'Settings', ['Design settings…']);
  await page.waitFor('document.body.innerText.includes("Design settings")');
  const frontFinish = await page.evaluate(`
    // The FRONTS select is the one that offers "same as the carcass" — matching
    // on the label is a trap, the panel styles it uppercase.
    const target = [...document.querySelectorAll('select')]
      .find((s) => [...s.options].some((o) => /same as the carcass/i.test(o.text))
        && [...s.options].some((o) => o.value === 'dark_walnut'));
    if (!target) return null;
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    setter.call(target, 'dark_walnut');
    target.dispatchEvent(new Event('change', { bubbles: true }));
    return target.value;
  `);
  check('the project fronts are set to a decor', frontFinish === 'dark_walnut', String(frontFinish));
  await page.sleep(400);
  await page.click('button', 'Done');
  await page.sleep(600);

  // ── 2. Output ▸ Render ──
  await menu(page, 'Output', ['Render…']);
  await page.waitFor('document.body.innerText.includes("Shadow quality")');
  check('Output ▸ Render opens the settings', true);
  await shot(page, 'render-settings');

  await page.click('button', '3/4 Left');
  await page.click('button', 'Render');
  await page.waitFor('document.querySelector(\'img[alt="Render preview"]\')', { timeout: 60000 });
  const preview = await page.evaluate(`
    const img = document.querySelector('img[alt="Render preview"]');
    const canvas = document.querySelector('canvas');
    const text = document.body.innerText;
    const m = text.match(/(\\d+) × (\\d+) px · saves as (\\S+)/);
    return {
      src: img.src.slice(0, 22), bytes: img.src.length,
      w: m && +m[1], h: m && +m[2], name: m && m[3],
      viewAspect: canvas.clientWidth / canvas.clientHeight,
    };
  `);
  check('the render is a real PNG', preview.src === 'data:image/png;base64,' && preview.bytes > 40000,
    `${Math.round(preview.bytes / 1024)} kB`);
  // 1080p fixes the LONGER side at 1920; the shorter one follows the view, so
  // the render frames what the screen frames instead of cropping it.
  check('1080p means 1920 on the longer side, at the view\'s aspect',
    Math.max(preview.w, preview.h) === 1920
      && Math.abs(preview.w / preview.h - preview.viewAspect) < 0.01,
    `${preview.w} × ${preview.h}, view ${preview.viewAspect.toFixed(3)}`);
  check('the file is named {project}-{unit|scene}-{date}',
    /^[a-z0-9-]+-(scene|[a-z0-9]+)-\d{4}-\d{2}-\d{2}\.png$/.test(preview.name || ''), preview.name);
  check('a render with no unit picked is of the whole scene', /-scene-/.test(preview.name || ''), preview.name);
  await shot(page, 'render-1080p');
  await saveRender(page, 'render-1080p-image');

  // 4K, high shadows — the expensive path, and the one that must not be in the
  // working view.
  await page.click('button', '4K');
  await page.click('button', 'High');
  await page.click('button', 'Render');
  await page.sleep(300);
  await page.waitFor('document.body.innerText.includes("3840 ×") || document.body.innerText.includes("× 3840")', { timeout: 120000 });
  const big = await page.evaluate(`
    const m = document.body.innerText.match(/(\\d+) × (\\d+) px/);
    return { w: +m[1], h: +m[2] };
  `);
  check('4K means 3840 on the longer side', Math.max(big.w, big.h) === 3840, `${big.w} × ${big.h}`);
  await shot(page, 'render-4k-high');
  await saveRender(page, 'render-4k-image');
  await page.click('button', 'Close');
  await page.sleep(400);

  // The working view must come back exactly as it was — the render borrows the
  // canvas and has to give it back.
  const canvasBack = await page.evaluate(
    'const c = document.querySelector("canvas"); return { w: c.width, h: c.height };',
  );
  check('the canvas is handed back at its own size', canvasBack.w < 3840 && canvasBack.w > 100,
    `${canvasBack.w} × ${canvasBack.h}`);

  // ── 3. the pieces: end panel, L infills, run ──
  await page.evaluate(`
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    const ev = (t, x, y, extra) => c.dispatchEvent(new PointerEvent(t, {
      clientX: x, clientY: y, bubbles: true, button: 0, buttons: 1, pointerId: 1, isPrimary: true, ...extra,
    }));
    window.__cc = { c, r, ev };
    return true;
  `);

  await shot(page, 'run-of-units');

  // ── 4. the drawings probe ──
  // A download is watched at the URL: jsPDF dispatches its own MouseEvent
  // rather than calling .click(), so patching the anchor sees the SVG and
  // misses the PDF.
  await page.evaluate(`
    window.__downloads = [];
    const make = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => { window.__downloads.push(blob.type || 'blob'); return make(blob); };
    return true;
  `);

  await menu(page, 'Output', ['Drawings', 'Front elevation (preview)']);
  await page.waitFor("document.querySelector('.cc-drawing svg')", { timeout: 20000 });
  const drawing = await page.evaluate(`
    const svg = document.querySelector('.cc-drawing svg');
    if (!svg) return null;
    const text = svg.outerHTML;
    const layers = {};
    for (const el of svg.querySelectorAll('[data-layer]')) {
      layers[el.dataset.layer] = (layers[el.dataset.layer] || 0) + 1;
    }
    return {
      swing: (text.match(/data-cc="door-swing"/g) || []).length,
      hidden: (text.match(/stroke-dasharray/g) || []).length,
      title: text.includes('CABINET CORE'),
      scale: (document.body.innerText.match(/Drawn at (1:\\d+)/) || [])[1] || null,
      layers,
      length: text.length,
    };
  `);
  check('the front elevation draws', Boolean(drawing), drawing ? `${drawing.length} chars of SVG, ${drawing.scale}` : 'no SVG found');
  if (drawing) {
    check('it carries the LISP door-swing diagonals', drawing.swing >= 2, `${drawing.swing} lines`);
    check('what is behind the doors is a hidden line', drawing.hidden >= 1, `${drawing.hidden} dashed`);
    check('the LISP view layers are all on it', Boolean(drawing.layers.DOORS && drawing.layers.CARCASE
      && drawing.layers.UNIT_NUMBER && drawing.layers.DIMENSIONS), Object.keys(drawing.layers).join(' '));
    check('it has a title block and a scale', drawing.title && /^1:\d+$/.test(drawing.scale || ''), drawing.scale);
  }
  await shot(page, 'drawing-front-elevation');

  await page.click('button', 'Export SVG');
  await page.sleep(600);
  await page.click('button', 'Export PDF');
  await page.sleep(1600);
  const drawn = await page.evaluate('return window.__downloads;');
  check('the drawing exports as SVG and as PDF',
    drawn.some((t) => /svg/.test(t)) && drawn.some((t) => /pdf/.test(t)), drawn.join(', '));
  await page.click('button', 'Close');
  await page.sleep(400);

  // ── 5. the exports, from their new home ──
  // A download is watched at the URL, not at the anchor: jsPDF dispatches its
  // own MouseEvent rather than calling .click(), so patching the prototype sees
  // the CSV and misses the PDF.
  await page.evaluate('window.__downloads = []; return true;');
  const exported = [];
  for (const label of ['Cutting list CSV', 'BOM PDF', 'CNC / DXF']) {
    await menu(page, 'Output', [label]);
    await page.sleep(1600);
    exported.push(await page.evaluate('return window.__downloads.length;'));
  }
  const downloads = await page.evaluate('return window.__downloads;');
  check('all three exports fire from Output', downloads.length >= 3, `${downloads.join(', ')} (${exported.join('/')})`);

  check('nothing wrote an error to the console', page.errors.filter(consoleWorthComplainingAbout).length === 0,
    page.errors.filter(consoleWorthComplainingAbout).join(' | '));
  await shot(page, 'final');
} catch (e) {
  check('the run finished', false, e.message);
  await shot(page, 'failure');
} finally {
  await page.close();
}

function consoleWorthComplainingAbout(line) {
  // A favicon nobody added is not a bug in the furniture.
  return !/favicon|404 \(Not Found\)/.test(line);
}

const failed = steps.filter((s) => !s.ok);
console.log(`\n${steps.length - failed.length}/${steps.length} checks passed`);
process.exit(failed.length ? 1 : 0);
