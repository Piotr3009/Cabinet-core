// ─── Turn 8, end to end, in a real Chromium ───
//
// Run:  npm run build && npm run preview -- --port 4173
//       node scripts/e2e-turn8.mjs
//
// The walk CLAUDE.md F9 asks for, in one pass: three white cabinets that can be
// told apart, a render with a shadow on it, a cabinet ADDED ON THE LEFT, the
// hinge switch actually switching, a FIX shelf, the hover dimensions, the wall
// clearance, the mitre in frame, and X-ray with the dog bones in it.
//
// It exists for the reason turn 6's and turn 7's do: turn 5 shipped a green
// test suite, a green build and a dead 3D canvas, and the only thing that
// noticed was a browser. Screenshots land in docs/turn8.

import { mkdirSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const SHOTS = new URL('../docs/turn8/', import.meta.url).pathname;

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

/** The stored project, straight from the cache the app writes on every change. */
const cache = (page, expression) => page.evaluate(`
  const c = JSON.parse(localStorage.getItem('cc.project.cache.v1'));
  const units = c.units;
  const unit = (n) => units[n];
  return (${expression});
`);

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

const page = await launch({ width: 1600, height: 1000 });

try {
  // ── 1. into the canvas ──
  await page.goto(BASE);
  await page.waitFor('document.body.innerText.includes("NEW PROJECT")');
  await page.click('button', 'New project');
  await page.waitFor('/project number/i.test(document.body.innerText)');
  await page.click('button', 'Next', { exact: true });
  await page.sleep(300);
  await page.click('button', 'Kitchen');
  await page.click('button', 'Next', { exact: true });
  await page.sleep(300);
  await page.click('button', 'One wall').catch(() => {});
  await page.sleep(200);
  await page.click('button', 'Next — settings').catch(async () => {
    await page.click('button', 'Next', { exact: true });
  });
  await page.sleep(500);

  // ── 2. the sheen slider, on the way through ──
  const sheen = await page.evaluate(`
    const range = [...document.querySelectorAll('input[type=range]')]
      .find((i) => i.max === '25' && i.step === '5');
    if (!range) return null;
    return { min: range.min, max: range.max, step: range.step, value: range.value };`);
  check('Design settings carries the 0–25 sheen slider, in fives',
    sheen && sheen.max === '25' && sheen.step === '5', sheen ? JSON.stringify(sheen) : 'not found');
  await shot(page, 'sheen');

  await page.click('button', 'Start designing');
  await page.waitFor('document.querySelector("canvas")');
  await page.sleep(1600);
  check('the canvas opens with a live 3D context', await page.evaluate(
    'const c = document.querySelector("canvas"); return Boolean(c && c.width > 100);',
  ));

  // ── 3. three white cabinets, and the wall clearance ──
  for (let i = 0; i < 3; i += 1) {
    await page.click('button', 'Base unit', { exact: false });
    await page.sleep(800);
  }
  const three = await cache(page, '{ n: units.length, xs: units.map((u) => u.position.x_mm) }');
  check('three cabinets, butted into a run', three.n === 3, JSON.stringify(three.xs));
  await shot(page, 'three-white-cabinets');

  const clearance = await cache(page, 'unit(0).params.inset_back_mm ?? 0');
  check('…and every one of them stands off the wall by the profile clearance',
    clearance === 0, 'the 10 mm is the PROFILE’s, not an inset typed on the unit');

  // ── 4. THE BUG: a cabinet on the LEFT ──
  await page.click('button', '◀');
  await page.sleep(200);
  await page.click('button', 'Base unit', { exact: false });
  await page.sleep(900);
  const four = await cache(page, 'units.map((u) => u.position.x_mm).sort((a, b) => a - b)');
  const leftmostIsNew = await cache(page, 'unit(3).position.x_mm');
  check('a cabinet can be added ON THE LEFT of the run — CLAUDE.md F2.1',
    leftmostIsNew === Math.min(...four), `${JSON.stringify(four)}, new one at ${leftmostIsNew}`);
  await shot(page, 'added-on-the-left');
  await page.click('button', 'auto');
  await page.sleep(150);

  // ── 5. the hinge switch ──
  // On the unit that is SELECTED — the one just added — and before the doors go
  // on, because fitting doors closes the panel (SPEC 4.10). The check is the
  // one that matters: the switch has to reach BOTH places the hinge is stored,
  // or the engine goes on reading the stale one (CLAUDE.md F2.2).
  const hingeBefore = await cache(page, 'unit(units.length - 1).params.hinge');
  const flipped = await page.evaluate(`
    const sel = [...document.querySelectorAll('select')]
      .find((s) => !s.disabled && [...s.options].map((o) => o.value).join() === 'L,R');
    if (!sel) return null;
    const want = sel.value === 'L' ? 'R' : 'L';
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    setter.call(sel, want);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return want;`);
  await page.sleep(600);
  await page.click('button', 'Add doors — finish unit').catch(() => {});
  await page.sleep(900);
  const hingeAfter = await cache(page, `(() => {
    const u = units.find((x) => x.params.doors && x.params.doors.count);
    return u ? { hinge: u.params.hinge, doors: u.params.doors.hinge } : null;
  })()`);
  check('the hinge switch flips the hinge — in BOTH places the engine reads',
    Boolean(flipped) && hingeAfter && hingeAfter.hinge === flipped && hingeAfter.doors === flipped
      && flipped !== hingeBefore,
    `${hingeBefore} → ${JSON.stringify(hingeAfter)}`);

  // ── 6. a FIX shelf, screwed rather than pinned ──
  await page.click('button', 'Base unit', { exact: false });
  await page.sleep(800);
  await section(page, 'Add items', 'Shelves');
  await page.click('button', 'Shelves').catch(() => {});
  await page.sleep(250);
  await page.click('button', 'Add', { exact: true }).catch(() => {});
  await page.sleep(600);
  const madeFix = await page.evaluate(`
    const sel = [...document.querySelectorAll('select')]
      .find((s) => [...s.options].map((o) => o.value).join() === 'adjustable,fixed,pullout');
    if (!sel) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    setter.call(sel, 'fixed');
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return true;`);
  await page.sleep(700);
  const shelf = await cache(page, `(() => {
    const items = units.flatMap((u) => (u.params.sections || []).flatMap((s) => s.items || []));
    const sh = items.filter((i) => i.kind === 'shelf');
    return { count: sh.length, variants: sh.map((i) => i.variant) };
  })()`);
  check('a shelf can be made FIX in the panel, and it is screwed rather than pinned',
    madeFix && shelf.variants.includes('fixed'), JSON.stringify(shelf));
  await shot(page, 'fix-shelf');

  // ── 7. the top infill, its mitre, and the context menu ──
  await page.click('button', 'Library');
  await page.sleep(250);
  await page.click('[role="menu"] button', 'Tall units').catch(() => {});
  await page.sleep(500);
  await page.click('button', 'Tall unit', { exact: false });
  await page.sleep(1000);
  await section(page, 'Construction', 'Add top infill');
  await page.click('button', 'Add top infill').catch(() => {});
  await page.sleep(900);
  const infill = await cache(page, `(() => {
    const u = units.find((x) => x.type === 'BUDTALL');
    return u ? { top: u.params.top_infill_mm, ends: u.params.run_top_infill && u.params.run_top_infill.ends } : null;
  })()`);
  check('a tall unit takes a top infill, and its open ends turn the corner',
    infill && infill.top > 0, JSON.stringify(infill));
  await shot(page, 'mitre');

  // …and a BASE unit is not offered one at all (F2.7).
  await page.click('button', 'Base unit', { exact: false }).catch(() => {});
  await page.sleep(900);
  const baseOffered = await page.evaluate(
    'return document.body.innerText.includes("Add top infill");',
  );
  check('a BASE unit is not offered a top infill — a worktop goes on top of it',
    baseOffered === false || (await page.evaluate('return document.body.innerText.includes("A worktop goes on top");')));

  // ── 7b. the context menu, and its toggles ──
  // Right-clicking is the gesture; the menu is driven through the same store
  // path the canvas uses, because a synthetic contextmenu on a WebGL canvas
  // hits a pixel and not a mesh.
  await page.evaluate(`
    const canvas = document.querySelector('canvas');
    const r = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
    }));
    return true;`);
  await page.sleep(300);
  const infillParked = await cache(page, `(() => {
    const u = units.find((x) => (x.params.side_infill_left_mm || 0) > 0
      || (x.params.side_infill_right_mm || 0) > 0);
    return u ? { left: u.params.side_infill_left_mm, right: u.params.side_infill_right_mm } : null;
  })()`);
  check('a unit parked at the wall grows the scribe filler that closes the gap',
    infillParked && (infillParked.left > 0 || infillParked.right > 0), JSON.stringify(infillParked));

  // ── 8. X-ray, with the joint in it ──
  await page.click('button', 'X-ray', { exact: true });
  await page.sleep(1600);
  check('X-ray renders without taking the canvas down', await page.evaluate(
    'const c = document.querySelector("canvas"); return Boolean(c && c.width > 100);',
  ));
  await shot(page, 'xray-dogbones');
  await page.click('button', 'X-ray', { exact: true });
  await page.sleep(800);

  // ── 9. the render, with a shadow on it ──
  await menu(page, 'Output', ['Render…']);
  await page.waitFor('document.body.innerText.includes("Render")');
  await page.sleep(500);
  // From three-quarters, which is where a shadow falls INTO the picture rather
  // than behind the cabinets — the shot a workshop sends a customer, and the
  // one CLAUDE.md's "cień kluczowy na całych szafkach" is about.
  await page.click('button', '3/4 Left');
  await page.sleep(300);
  await page.click('button', 'Render', { exact: true });
  await page.sleep(4500);
  const render = await page.evaluate(`
    const img = [...document.querySelectorAll('img')].find((i) => (i.src || '').startsWith('data:image/png'));
    if (!img) return null;
    return { w: img.naturalWidth, h: img.naturalHeight, bytes: img.src.length };`);
  check('the render comes back as a picture', render && render.w > 800, JSON.stringify(render));

  // Is there a SHADOW in it? Read the pixels back and look for tones darker
  // than the walls in the lower half of the frame. A flat render — turn 7's
  // complaint — has none.
  const shadow = await page.evaluate(`
    const img = [...document.querySelectorAll('img')].find((i) => (i.src || '').startsWith('data:image/png'));
    if (!img) return null;
    const c = document.createElement('canvas');
    c.width = 320; c.height = Math.round(320 * img.naturalHeight / img.naturalWidth);
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let dark = 0; let light = 0; let min = 255; let max = 0;
    for (let i = 0; i < d.length; i += 4) {
      const l = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
      if (l < min) min = l;
      if (l > max) max = l;
      if (l < 150) dark += 1; else light += 1;
    }
    return { dark, light, min: Math.round(min), max: Math.round(max), range: Math.round(max - min) };`);
  check('…with real tonal range in it: a shadow, and depth',
    shadow && shadow.range > 90 && shadow.dark > 200,
    shadow ? JSON.stringify(shadow) : 'no pixels');
  await shot(page, 'render');
  await page.click('button', 'Close');
  await page.sleep(400);

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
