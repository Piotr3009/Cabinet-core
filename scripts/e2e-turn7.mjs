// ─── Turn 7, end to end, in a real Chromium ───
//
// Run:  npm run build && npm run preview -- --port 4173
//       node scripts/e2e-turn7.mjs
//
// The walk CLAUDE.md F6 asks for, in one pass: the new-project flow from the
// start screen (number → type → one wall → settings, keeping the settings as a
// SAVED SET and using it), a unit placed into the canvas the type chose, X-ray
// with the hardware in it, and the production card out as a PDF and an SVG.
//
// It exists for the reason turn 6's does: turn 5 shipped a green test suite, a
// green build and a dead 3D canvas, and the only thing that noticed was a
// browser. Screenshots land in docs/turn7.

import { mkdirSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const SHOTS = new URL('../docs/turn7/', import.meta.url).pathname;

const steps = [];
let shotNo = 0;
const shot = async (page, name) => {
  shotNo += 1;
  mkdirSync(SHOTS, { recursive: true });
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

/** Open a right-panel section, if it is not already open. */
async function section(page, header, contains) {
  const isOpen = () => page.evaluate(
    `return [...document.querySelectorAll('button')].some((b) => b.offsetParent && b.textContent.includes(${JSON.stringify(contains)}));`,
  );
  for (let i = 0; i < 3; i += 1) {
    if (await isOpen()) return;
    await page.click('button', header);
    await page.sleep(350);
  }
}

/** Type into a field by its label, and commit it the way NumberField wants. */
async function typeInto(page, label, value) {
  await page.evaluate(`
    const spans = [...document.querySelectorAll('span')];
    const tag = spans.find((s) => s.textContent.trim() === ${JSON.stringify(label)});
    const field = tag && tag.parentElement.querySelector('input');
    if (!field) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(field, ${JSON.stringify(String(value))});
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    field.blur();
    return true;
  `);
  await page.sleep(400);
}

const page = await launch({ width: 1600, height: 1000 });

try {
  // ── 1. the new-project flow ──
  await page.goto(BASE);
  await page.waitFor('document.body.innerText.includes("NEW PROJECT")');
  await page.click('button', 'New project');
  await page.waitFor('/project number/i.test(document.body.innerText)');

  const proposed = await page.evaluate(
    'const i = document.querySelector("input"); return i ? i.value : "";',
  );
  check('the flow opens with a project number already proposed', /\d/.test(proposed), proposed);
  await shot(page, 'flow-project');

  await page.click('button', 'Next', { exact: true });
  await page.waitFor('document.body.innerText.includes("Media wall")');
  const tiles = await page.evaluate(
    'return [...document.querySelectorAll("button")].filter((b) => /Kitchen|Wardrobe|Media wall|Sideboard|Vanity|Utility|Hallway|Other/.test(b.textContent.split("\\n")[0])).length;',
  );
  check('eight project types to choose from', tiles >= 8, String(tiles));
  await page.click('button', 'Vanity');
  await shot(page, 'flow-type');
  await page.click('button', 'Next', { exact: true });

  await page.waitFor('document.body.innerText.includes("One wall is enough")');
  const suggested = await page.evaluate(
    'return [...document.querySelectorAll("button")].some((b) => /One wall/.test(b.textContent) && /border-gold/.test(b.className));',
  );
  check('a vanity suggests ONE WALL, which is the example CLAUDE.md gives', suggested);
  await shot(page, 'flow-scope');
  await page.click('button', 'Next — settings');

  // ── 2. design settings, and a saved SET ──
  await page.waitFor('/joinery type/i.test(document.body.innerText)');
  await page.click('button', 'Dog bones');
  await page.sleep(400);
  const preview = await page.evaluate('return document.querySelectorAll("svg polygon").length;');
  check('the joinery preview draws the joint itself', preview > 0, `${preview} outline(s)`);
  await shot(page, 'flow-settings');

  await page.evaluate(`
    const field = [...document.querySelectorAll('input')].find((i) => /Keep these settings/.test(i.placeholder || ''));
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(field, 'Contract spec');
    field.dispatchEvent(new Event('input', { bubbles: true }));
    return true;`);
  await page.sleep(200);
  await page.click('button', 'Save set');
  await page.sleep(400);
  await page.click('button', 'Use saved settings');
  await page.sleep(300);
  const savedSet = await page.evaluate('return document.body.innerText.includes("Contract spec");');
  check('the settings are kept as a named set, and offered back', savedSet);
  await page.click('button', 'Contract spec');
  await page.sleep(400);

  await page.click('button', 'Start designing');
  await page.waitFor('document.querySelector("canvas")');
  await page.sleep(1400);
  check('the canvas opens with a live 3D context', await page.evaluate(
    'const c = document.querySelector("canvas"); return Boolean(c && c.width > 100);',
  ));
  const opened = await page.evaluate('return document.body.innerText.includes("BASE UNITS");');
  check('…on the Library category the project type asked for', opened);
  await shot(page, 'canvas-opened');

  // ── 3. a unit, at the height the type set ──
  await page.click('button', 'Base unit', { exact: false });
  await page.sleep(900);
  const height = await page.evaluate(`
    const cache = JSON.parse(localStorage.getItem('cc.project.cache.v1'));
    const u = cache.units[0];
    return { height: u.params.height, type: cache.project.design.projectType, number: cache.project.number };
  `);
  check('the unit arrives at the VANITY height, not the kitchen one',
    height.height === 700, `${height.height} mm, type ${height.type}, project ${height.number}`);

  await section(page, 'Add items', 'Shelves');
  await page.click('button', 'Shelves').catch(() => {});
  await page.sleep(250);
  await page.click('button', 'Add', { exact: true }).catch(() => {});
  await page.sleep(400);
  await page.click('button', 'Add doors — finish unit').catch(() => {});
  await page.sleep(700);

  // ── 4. an inset, respected by the clamp ──
  // The inset goes on BEFORE the doors: the right panel closes itself once
  // doors are fitted (SPEC 4.10), and a section cannot be opened in a panel
  // that is not there.
  await page.click('button', 'Base unit', { exact: false });
  await page.sleep(900);
  // 'Add top infill' is a BUTTON inside Construction — a marker that is only
  // ever a span reads as "still closed" for ever and the toggle just flaps.
  await section(page, 'Construction', 'Add top infill');
  await typeInto(page, 'Left', 40);
  const insetState = await page.evaluate(`
    const cache = JSON.parse(localStorage.getItem('cc.project.cache.v1'));
    const [a, b] = cache.units;
    return { inset: b.params.inset_left_mm, gap: b.position.x_mm - (a.position.x_mm + a.params.width) };
  `);
  check('a 40 mm inset opens a 40 mm gap the clamp keeps',
    insetState.inset === 40 && insetState.gap >= 40,
    `inset ${insetState.inset}, gap ${insetState.gap}`);
  await shot(page, 'inset');
  await page.click('button', 'Add doors — finish unit').catch(() => {});
  await page.sleep(700);

  // ── 5. X-ray, with the hardware in it ──
  await page.click('button', 'X-ray', { exact: true });
  await page.sleep(1400);
  const xray = await page.evaluate(`
    const c = document.querySelector('canvas');
    return Boolean(c && c.width > 100);`);
  check('X-ray renders without taking the canvas down', xray);
  await shot(page, 'xray');
  await page.click('button', 'X-ray', { exact: true });
  await page.sleep(700);

  // ── 6. the production card ──
  // Downloads are watched at the URL, not at the anchor: jsPDF dispatches its
  // own MouseEvent rather than calling .click().
  await page.evaluate(`
    window.__downloads = [];
    const create = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => { const u = create(blob); window.__downloads.push(u); return u; };
    return true;`);

  await menu(page, 'Output', ['Drawings', 'Preview…']);
  await page.waitFor('document.body.innerText.includes("Unit card")');
  await page.sleep(900);
  const card = await page.evaluate(`
    const svg = document.querySelector('.cc-drawing svg');
    if (!svg) return null;
    const layer = (n) => svg.querySelectorAll('[data-layer="' + n + '"]').length;
    return {
      kind: svg.getAttribute('data-cc-drawing'),
      views: [...svg.querySelectorAll('[data-layer="UNIT_NUMBER"]')].length,
      swings: svg.querySelectorAll('[data-cc="door-swing"]').length,
      hinges: layer('HINGES'),
      dims: layer('DIMENSIONS'),
      titles: [...svg.querySelectorAll('[data-layer="VIEW_TITLE"]')].map((t) => t.textContent),
    };
  `);
  check('the card is on screen with three views',
    card && card.views === 3, card ? `${card.views} unit numbers, titles: ${card.titles.join(' / ')}` : 'no svg');
  check('…the door diagonals are on it', card && card.swings === 2, card ? String(card.swings) : '');
  check('…a hinge is on the plan', card && card.hinges >= 3, card ? String(card.hinges) : '');
  check('…and it is dimensioned', card && card.dims > 20, card ? String(card.dims) : '');
  await shot(page, 'unit-card');

  await page.click('button', 'Export SVG');
  await page.sleep(900);
  await page.click('button', 'Export PDF');
  await page.sleep(1600);
  await page.click('button', 'All units (PDF)');
  await page.sleep(2200);
  const downloads = await page.evaluate('return window.__downloads.length;');
  check('the card exports as SVG and PDF, and the booklet as one document',
    downloads >= 3, `${downloads} files`);
  await shot(page, 'exports');

  check('nothing wrote an error to the console', page.errors.filter(worthComplainingAbout).length === 0,
    page.errors.filter(worthComplainingAbout).join(' | '));
  await shot(page, 'final');
} catch (e) {
  check('the run finished', false, e.message);
  await shot(page, 'failure');
} finally {
  await page.close();
}

function worthComplainingAbout(line) {
  // A favicon nobody added is not a bug in the furniture.
  return !/favicon|404 \(Not Found\)/.test(line);
}

const failed = steps.filter((s) => !s.ok);
console.log(`\n${steps.length - failed.length}/${steps.length} checks passed`);
process.exit(failed.length ? 1 : 0);
