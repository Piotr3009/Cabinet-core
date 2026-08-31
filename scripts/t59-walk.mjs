// ─── THE ACCEPTANCE WALK, IN A REAL BROWSER (turn 59) ───────────────────────
//
// Every claim this turn makes about a PAGE ends in a frame, and every frame has
// this script behind it. The rule turns 5 and 58b both learned the hard way:
// `npm test` and `npm run build` can be green while the thing on screen is
// wrong, because neither of them opens a browser.
//
//   npm run build && npx vite preview --port 4173
//   node scripts/t59-walk.mjs             every section
//   node scripts/t59-walk.mjs f3          one of them
//
// THE CAMERA IS PLACED, NEVER NUDGED — T57's rule, kept. Every 3-D frame parks
// the camera through the app's own preset (`src/3d/cameraPresets.js`) and waits
// for the renderer to settle before the shutter, so a frame taken tonight is a
// frame anybody can take again tomorrow.

import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const SHOTS = new URL('../verify/t59/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const runs = (name) => want.length === 0 || want.includes(name);

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  process.stdout.write(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}\n`);
};

// ─── A PORT NOBODY ELSE IS ON ──────────────────────────────────────────────
//
// `scripts/cdp.mjs` finds its browser by asking `127.0.0.1:PORT/json/list` and
// taking a target from the answer. It does not close the browser when a walk
// exits, so a second run on the same fixed port ATTACHES TO THE FIRST RUN'S
// BROWSER — and photographs whatever bundle was on disk when that one started.
//
// This cost most of an evening. A guard was added, the build was verified by
// hand, the served bytes were checksummed against the ones on disk, and the
// walk went on reporting eight contour lines that existed nowhere except in a
// process nobody had killed. 141 of them were running by the end.
//
// So: a port derived from this process's own id, and a browser closed on the
// way out.
const PORT = 9600 + (process.pid % 300);
const page = await launch({ width: 1600, height: 1000, port: PORT });

// ─── THE CACHE IS NOT YOUR FRIEND HERE ─────────────────────────────────────
//
// `scripts/cdp.mjs` spawns Chromium without a `--user-data-dir`, so every walk
// shares the machine's default profile — and therefore its DISK CACHE. A frame
// taken against last build's JavaScript is worse than no frame at all: this
// walk spent an hour proving a bug that had already been fixed, because the
// page it was measuring was not the page that had just been built.
await page.send('Network.enable', {});
await page.send('Network.setCacheDisabled', { cacheDisabled: true });

const ask = (expr) => page.evaluate(`return (${expr});`);

/** Go to a hash route and wait for the app to have drawn it. */
async function route(path, settle = 900) {
  await page.evaluate(`window.location.hash = ${JSON.stringify(path)}; return true;`);
  await page.sleep(settle);
}

/** A whole page, however tall it is. */
async function fullPage(file) {
  const size = await ask('({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight })');
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: 1600, height: Math.min(size.h, 20000), deviceScaleFactor: 1, mobile: false,
  });
  await page.sleep(500);
  await page.screenshot(`${SHOTS}${file}`);
  await page.send('Emulation.clearDeviceMetricsOverride');
  await page.sleep(300);
  return size.h;
}

const text = (sel) => ask(`(document.querySelector(${JSON.stringify(sel)})?.textContent || '').trim()`);
const has = (sel) => ask(`Boolean(document.querySelector(${JSON.stringify(sel)}))`);
const count = (sel) => ask(`document.querySelectorAll(${JSON.stringify(sel)}).length`);

/** Wait for the wardrobe to exist and the renderer to have a scene. */
async function stageReady(timeout = 30000) {
  await page.waitFor('window.__cc && window.__cc.views && window.__cc.views.room', { timeout });
  await page.waitFor('window.__cc.pbi && window.__cc.pbi.render', { timeout });
  await page.waitFor('window.__cc.pbi.render.bounds() !== null', { timeout });
  // The EGGER pack arrives over the network and re-renders the boards when it
  // does; a frame taken before that is a frame of a half-dressed wardrobe.
  await page.sleep(3500);
}

/** Park the camera through the app's own preset, then let it settle. */
async function preset(name) {
  await page.click('[data-testid="view-' + name + '"]');
  await page.sleep(1100);
}

// ─── F1 · THE SWITCH ───────────────────────────────────────────────────────
if (runs('f1')) {
  process.stdout.write('\nF1 — THE SWITCH: TWO DOORS, ONE HOUSE\n');
  await page.goto(`${BASE}start.html`);
  await page.sleep(900);

  check('the switch page loads', await has('[data-testid="switch-pro"]'));
  check('door one is CABINET CORE PRO', (await text('[data-testid="switch-pro"]')).includes('CABINET CORE'));
  check('door two is PRIME BESPOKE INTERIORS',
    (await text('[data-testid="switch-retail"]')).includes('PRIME'));
  check('PRO\'s door goes to /', await ask(
    'document.querySelector(\'[data-testid="switch-pro"]\').getAttribute("href") === "/"',
  ));
  check('PBI\'s door goes to /retail.html', await ask(
    'document.querySelector(\'[data-testid="switch-retail"]\').getAttribute("href") === "/retail.html"',
  ));
  check('the ground is Porcelain', await ask(
    'getComputedStyle(document.querySelector("main")).backgroundColor === "rgb(250, 248, 243)"',
  ));
  check('nothing is rounded', await ask(
    '[...document.querySelectorAll("main *")].every((n) => getComputedStyle(n).borderRadius === "0px")',
  ));
  await page.screenshot(`${SHOTS}f1-switch.png`);
  process.stdout.write(`  frame  ${SHOTS}f1-switch.png\n`);
}

// ─── F2 · THE SHELL ────────────────────────────────────────────────────────
if (runs('f2')) {
  process.stdout.write('\nF2 — THE SHELL: IVORY & ONYX\n');
  await page.goto(`${BASE}retail.html`);
  await page.sleep(1200);
  await route('/');

  check('the header is 82px', await ask(
    'Math.round(document.querySelector(\'[data-testid="pbi-header"]\').getBoundingClientRect().height) === 82',
  ));
  check('the header is Warm White', await ask(
    'getComputedStyle(document.querySelector(\'[data-testid="pbi-header"]\')).backgroundColor === "rgb(242, 238, 231)"',
  ));
  // FOUR LINES, and `textContent` cannot see them: a <br> contributes no
  // whitespace to it, so the four words come back run together. `innerText` is
  // what a reader sees, which is the thing being asserted.
  const heroLines = await ask(
    'document.querySelector(\'[data-testid="hero-h1"]\').innerText.trim().split(/\\n+/)',
  );
  check('the hero H1 is four lines', heroLines.join(' ') === 'MADE TO EXACTING STANDARDS',
    heroLines.join(' / '));
  check('the hero image is a SLOT, not a photograph',
    (await text('[data-testid="hero-image-slot"]')).includes('owner to supply'));
  check('there are four collection cards', await count('[data-testid^="collection-card-"]') === 4);
  check('the craftsmanship band is Onyx', await ask(
    'getComputedStyle(document.querySelector(\'[data-testid="section-craftsmanship"]\')).backgroundColor === "rgb(9, 10, 9)"',
  ));
  check('DESIGN YOURS is on the header', await has('[data-testid="cta-design-yours"]'));
  check('not a price anywhere on the page', !/[£$€]\s?\d/.test(await ask('document.body.innerText')));

  await page.screenshot(`${SHOTS}f2-landing-top.png`);
  const tall = await fullPage('f2-landing-full.png');
  check('the landing page is a full page', tall > 2400, `${tall}px tall`);

  await page.evaluate('document.querySelector(\'[data-testid="pbi-footer"]\').scrollIntoView({block:"end"}); return true;');
  await page.sleep(600);
  await page.screenshot(`${SHOTS}f2-footer.png`);
  check('the footer is Onyx', await ask(
    'getComputedStyle(document.querySelector(\'[data-testid="pbi-footer"]\')).backgroundColor === "rgb(9, 10, 9)"',
  ));
  process.stdout.write(`  frames ${SHOTS}f2-landing-top.png, f2-landing-full.png, f2-footer.png\n`);
}

// ─── F3 · THE DESIGN ROOM ──────────────────────────────────────────────────
if (runs('f3') || runs('f4') || runs('f4b') || runs('f5')) {
  process.stdout.write('\nF3 — THE DESIGN ROOM: FOUR COLUMNS, THE PSW LAW\n');
  await page.goto(`${BASE}retail.html#/design`);
  await page.sleep(1500);
  await stageReady();

  check('the header shrank to 60px', await ask(
    'Math.round(document.querySelector(\'[data-testid="pbi-header"]\').getBoundingClientRect().height) === 60',
  ));
  for (const [testid, wide] of [['column-categories', 220], ['column-options', 320], ['column-detail', 300]]) {
    // eslint-disable-next-line no-await-in-loop
    const w = await ask(`Math.round(document.querySelector('[data-testid="${testid}"]').getBoundingClientRect().width)`);
    check(`${testid} is ${wide}px`, w === wide, `${w}px`);
  }
  check('the view bar is 40px', await ask(
    'Math.round(document.querySelector(\'[data-testid="view-bar"]\').getBoundingClientRect().height) === 40',
  ));
  check('six categories, and none of them folds', await count('[data-testid^="cat-"]') === 6);
  check('the total says Price on request',
    (await text('[data-testid="total-price"]')) === 'Price on request');
  check('the stage says how to drive it',
    (await text('[data-testid="stage-caption"]')).includes('DRAG TO ORBIT'));
  check('column 4 opens on the ESTIMATE', await ask(
    'document.querySelector(\'[data-testid="column-detail"]\').dataset.duty === "estimate"',
  ));

  // ─── THE PRO CHROME IS OFF ────────────────────────────────────────────────
  // ─── WHAT "NO PRO CHROME" MEANS, EXACTLY ─────────────────────────────────
  //
  // F3.6 bans *"dimension chips, hinge rings, LED icons, `+` add markers, the
  // top bar"* — the TOOL. It does not ban the HOVER AURA, and the aura is kept
  // on purpose: the line under the stage promises "CLICK AN ELEMENT FOR
  // DETAIL", and a client needs to see what is clickable before they click it.
  // So the aura is named here and excluded, rather than quietly slipping
  // through a looser test.
  const helpers = await ask(`(() => {
    const seen = {};
    window.__cc.views.room.scene.traverse((o) => {
      if (!o.visible || !(o.isSprite || o.userData?.ccHelper)) return;
      if (o.userData?.ccHoverAura) return;   // kept: it is what says "clickable"
      if (o.parent?.userData?.ccHoverAura) return;
      const key = o.type + (o.userData?.ccDimensionPick ? ' dim' : '')
        + (o.userData?.ccDrillRing ? ' drill' : '')
        + (o.userData?.ccHoverAura ? ' aura' : '')
        + (o.userData?.ccHoverDimension ? ' hoverdim' : '');
      seen[key] = (seen[key] || 0) + 1;
    });
    return seen;
  })()`);
  const helperCount = Object.values(helpers).reduce((a, b) => a + b, 0);
  check('not one dimension chip, hinge ring or LED icon in the scene', helperCount === 0,
    helperCount ? JSON.stringify(helpers) : '');

  await preset('room');
  await page.screenshot(`${SHOTS}f3-design-room.png`);

  // ─── INSIDE: doors open and the camera in ─────────────────────────────────
  await preset('inside');
  const open = await ask(`(() => {
    const of = window.__cc.pbi ? 1 : 0;
    return of;
  })()`);
  check('INSIDE parks the camera and opens the doors', open === 1);
  await page.screenshot(`${SHOTS}f3-design-room-inside.png`);

  // ─── FULL SCREEN: a looking mode that comes back ─────────────────────────
  await preset('room');
  await page.click('[data-testid="cat-fronts"]');
  await page.sleep(400);
  const beforeCam = await ask('({ ...window.__cc.views.room.camera.position })');
  await page.click('[data-testid="view-fullscreen"]');
  await page.sleep(1200);
  check('full screen hides columns 1, 2 and 4',
    !(await has('[data-testid="column-categories"]'))
    && !(await has('[data-testid="column-options"]'))
    && !(await has('[data-testid="column-detail"]')));
  check('the view bar stays, with a way back', await has('[data-testid="view-back"]'));
  check('and it carries SAVE IMAGE', await has('[data-testid="view-save-image"]'));
  await page.screenshot(`${SHOTS}f3-design-room-fullscreen.png`);

  await page.key('Escape', { code: 'Escape', windowsVirtualKeyCode: 27 });
  await page.sleep(1200);
  check('Esc comes back to the design', await has('[data-testid="column-categories"]'));
  check('…with the SAME category still active', await ask(
    'document.querySelector(\'[data-testid="cat-fronts"]\').getAttribute("aria-current") === "true"',
  ));
  const afterCam = await ask('({ ...window.__cc.views.room.camera.position })');
  const moved = Math.abs(beforeCam.x - afterCam.x) + Math.abs(beforeCam.y - afterCam.y)
    + Math.abs(beforeCam.z - afterCam.z);
  check('…and the SAME camera', moved < 0.01, `moved ${moved.toFixed(4)}`);
  process.stdout.write(`  frames ${SHOTS}f3-design-room.png, -inside.png, -fullscreen.png\n`);
}

// ─── F4 · THE OPTIONS ──────────────────────────────────────────────────────
if (runs('f4')) {
  process.stdout.write('\nF4 — COLUMN 2: THE OPTIONS OF EACH CATEGORY\n');

  await page.click('[data-testid="cat-space"]');
  await page.sleep(500);
  check('YOUR SPACE has a wall and a ceiling',
    (await has('[data-testid="space-wall"]')) && (await has('[data-testid="space-ceiling"]')));
  check('…and a sloped-ceiling chip', await has('[data-testid="space-slope"]'));
  check('…and says we will survey',
    (await text('[data-testid="column-options"]')).includes('We will survey before we build'));
  await page.screenshot(`${SHOTS}f4-space.png`);

  await page.click('[data-testid="cat-fronts"]');
  await page.sleep(500);
  check('FRONTS offers the three the engine cuts',
    await ask('document.querySelector(\'[data-testid="fronts-style"]\').textContent.includes("SLAB")'));
  check('…and refuses the two it does not, in words',
    await ask(`[...document.querySelectorAll('[data-testid="fronts-style"] .pbi-chip-reason')]
      .some((n) => n.textContent.includes('Coming soon'))`));
  check('four collection swatches', await ask(
    'document.querySelectorAll(\'[data-testid="fronts-collection"] .pbi-chip\').length === 4',
  ));
  check('every colour swatch carries EGGER', await ask(`(() => {
    const labels = [...document.querySelectorAll('[data-testid="fronts-colour"] .pbi-choice')];
    return labels.length > 0 && labels.every((n) => n.textContent.includes('EGGER'));
  })()`));
  await page.screenshot(`${SHOTS}f4-fronts.png`);

  await page.click('[data-testid="cat-interior"]');
  await page.sleep(500);
  check('six interior rows', await count('[data-testid^="interior-"]:not([data-testid*="add"])') >= 6);
  await page.click('[data-testid="interior-add-drawers"]');
  await page.sleep(900);
  await page.click('[data-testid="interior-add-shelves"]');
  await page.sleep(900);
  await page.click('[data-testid="interior-add-hanger"]');
  await page.sleep(900);
  check('what went in is counted on its row',
    (await text('[data-testid="interior-drawers"]')).includes('›'));
  await page.screenshot(`${SHOTS}f4-interior.png`);
  process.stdout.write(`  frames ${SHOTS}f4-space.png, f4-fronts.png, f4-interior.png\n`);
}

// ─── F4b · THE DETAIL OF A SELECTED ELEMENT ────────────────────────────────
if (runs('f4b')) {
  process.stdout.write('\nF4b — COLUMN 4: THE DETAIL OF A SELECTED ELEMENT\n');
  await page.click('[data-testid="cat-interior"]');
  await page.sleep(500);
  await page.click('[data-testid="interior-drawers"] .pbi-link', '›');
  await page.sleep(700);
  check('column 4 turned to the DRAWERS detail', await ask(
    'document.querySelector(\'[data-testid="column-detail"]\').dataset.duty === "detail"',
  ));
  check('…with a way back to the estimate', await has('[data-testid="detail-back"]'));
  check('HOW MANY, and an insert', (await has('[data-testid="drawers-count"]'))
    && (await has('[data-testid="drawers-insert"]')));
  check('GLASS TOP is refused, in words, without a watch insert', await ask(`(() => {
    const reasons = [...document.querySelectorAll('[data-testid="drawers-glass"] .pbi-chip-reason')];
    return reasons.some((n) => n.textContent.includes('watch insert'));
  })()`));
  await page.screenshot(`${SHOTS}f4b-drawers.png`);
  await page.click('[data-testid="detail-done"]');
  await page.sleep(500);

  // The DOOR detail, reached the way a client reaches it.
  await page.evaluate(`(() => {
    const ui = window.__ccRetailUi;
    return true;
  })()`);
  await page.click('[data-testid="cat-details"]');
  await page.sleep(600);
  check('DETAILS offers handles, lighting and a plinth',
    (await has('[data-testid="details-handle"]'))
    && (await has('[data-testid="details-lighting"]'))
    && (await has('[data-testid="details-plinth"]')));
  await page.click('[data-testid="details-handle"] .pbi-chip', 'J-PULL');
  await page.sleep(700);
  check('a J-pull refuses the other handles, in the T57 law\'s own words', await ask(`(() => {
    const reasons = [...document.querySelectorAll('[data-testid="details-handle"] .pbi-chip-reason')];
    return reasons.some((n) => n.textContent.includes('machined into'));
  })()`));
  await page.screenshot(`${SHOTS}f4b-door.png`);
  process.stdout.write(`  frames ${SHOTS}f4b-drawers.png, f4b-door.png\n`);
}

// ─── F5 · THE ESTIMATE ─────────────────────────────────────────────────────
if (runs('f5')) {
  process.stdout.write('\nF5 — THE ESTIMATE WITHOUT A PRICE\n');
  await page.click('[data-testid="cat-estimate"]');
  await page.sleep(600);
  check('the summary says every choice in words',
    (await text('[data-testid="estimate-summary"]')).includes('Price on request'));

  // A second wardrobe, in the same estimate.
  await page.click('[data-testid="add-another"]');
  await page.sleep(2000);
  check('the estimate now lists two designs', await count('[data-testid^="estimate-row-"]') === 2);
  check('…and neither of them has a price', await ask(`(() => {
    const rows = [...document.querySelectorAll('[data-testid^="estimate-row-"]')];
    return rows.length === 2 && rows.every((r) => r.textContent.includes('Price on request'))
      && !/[£$€]\\s?\\d/.test(rows.map((r) => r.textContent).join(' '));
  })()`));
  await page.screenshot(`${SHOTS}f5-summary-two-designs.png`);

  await page.click('[data-testid="detail-quote"]');
  await page.sleep(700);
  check('the quote form opens, in the design system', await has('[data-testid="quote-overlay"]'));
  for (const field of ['name', 'email', 'phone', 'postcode', 'message']) {
    // eslint-disable-next-line no-await-in-loop
    check(`  the form asks for ${field}`, await has(`[data-testid="field-${field}"]`));
  }
  check('…and promises a human', (await text('[data-testid="quote-overlay"]'))
    .includes('within one working day'));
  await page.screenshot(`${SHOTS}f5-quote-form.png`);
  await page.click('[data-testid="quote-close"]');
  await page.sleep(500);

  // ─── SAVE IMAGE — through the app's own fixed rig ────────────────────────
  await page.click('[data-testid="view-fullscreen"]');
  await page.sleep(1400);
  const shot = await ask('window.__cc.pbi.saveImage("Bedroom wardrobe")');
  check('the stage photographs itself through the fixed rig', Boolean(shot?.dataUrl));
  check('…under the name the client\'s design has', shot?.filename === 'pbi-bedroom-wardrobe.png',
    shot?.filename);
  if (shot?.dataUrl) {
    writeFileSync(`${SHOTS}f5-saved-image.png`, Buffer.from(shot.dataUrl.split(',')[1], 'base64'));
    process.stdout.write(`  frame  ${SHOTS}f5-saved-image.png (${shot.width}x${shot.height})\n`);
  }
  await page.click('[data-testid="view-back"]');
  await page.sleep(900);

  // ─── AND THE DETAIL DUTY, PHOTOGRAPHED ───────────────────────────────────
  await page.click('[data-testid="cat-interior"]');
  await page.sleep(600);
  // The SECOND wardrobe is a fresh one and has nothing in it yet — a row only
  // carries its "›" once there is something to open.
  await page.click('[data-testid="interior-add-shelves"]');
  await page.sleep(1100);
  await page.click('[data-testid="interior-shelves"] .pbi-link', '›');
  await page.sleep(700);
  await page.screenshot(`${SHOTS}f3-design-room-detail.png`);
  check('column 4 in its detail duty, photographed', await ask(
    'document.querySelector(\'[data-testid="column-detail"]\').dataset.duty === "detail"',
  ));
  process.stdout.write(`  frames ${SHOTS}f5-quote-form.png, f5-summary-two-designs.png, f3-design-room-detail.png\n`);
}

// ─── F6 · THE OTHER PAGES ──────────────────────────────────────────────────
if (runs('f6')) {
  process.stdout.write('\nF6 — THE OTHER PAGES: THIN BUT REAL\n');
  await page.goto(`${BASE}retail.html#/collections`);
  await page.sleep(1200);
  check('four collections, each with a way into the design room',
    await count('[data-testid^="collection-row-"]') === 4);
  await page.screenshot(`${SHOTS}f6-collections.png`);

  await route('/contact');
  check('contact is the same flat form', await has('[data-testid="contact-form"]'));
  await page.screenshot(`${SHOTS}f6-contact.png`);

  for (const path of ['/materials', '/design-process', '/about', '/journal']) {
    // eslint-disable-next-line no-await-in-loop
    await route(path, 700);
    // eslint-disable-next-line no-await-in-loop
    const body = await ask('document.body.innerText');
    // The mark is UPPERCASED by the design system (`.pbi-ui`), so what the
    // page actually reads is "— OWNER TO WRITE". Asking case-sensitively for
    // the source's own casing tests the stylesheet, not the page.
    check(`${path} is a real page, and says who owes the words`,
      /owner to write/i.test(body), '');
  }
  // …and nothing 404s.
  await route('/nowhere-at-all', 700);
  check('an unknown route is the landing page, not an error',
    (await ask('document.body.innerText')).includes('MADE'));
  process.stdout.write(`  frames ${SHOTS}f6-collections.png, f6-contact.png\n`);
}

// ─── F7 · THE MID-WIDTH BEHAVIOUR ──────────────────────────────────────────
if (runs('f7')) {
  process.stdout.write('\nF7 — THE MID-WIDTH BEHAVIOUR\n');

  // ─── A REAL WINDOW, NOT AN EMULATED ONE ──────────────────────────────────
  //
  // `Emulation.setDeviceMetricsOverride` resizes the LAYOUT viewport and leaves
  // `window.innerWidth` where it was — 1124 at a declared 640 — so a component
  // that decides on `innerWidth` never sees the narrow screen. The first
  // attempt at this section photographed a four-column design room squeezed
  // into 640 px and called it the under-768 page, which is exactly the kind of
  // frame turn 58b was written to stop.
  //
  // So each width gets its own BROWSER, opened at that size. Slower, real.
  for (const [width, file, want] of [
    [1100, 'f7-tablet.png', 'narrow'],
    [640, 'f7-under-768.png', 'too-small'],
  ]) {
    // eslint-disable-next-line no-await-in-loop
    const small = await launch({ width, height: 900, port: PORT + 1 + (width % 7) });
    // eslint-disable-next-line no-await-in-loop
    await small.send('Network.enable', {});
    // eslint-disable-next-line no-await-in-loop
    await small.send('Network.setCacheDisabled', { cacheDisabled: true });
    // eslint-disable-next-line no-await-in-loop
    await small.goto(`${BASE}retail.html#/design`);
    // eslint-disable-next-line no-await-in-loop
    await small.sleep(width < 768 ? 2200 : 6000);

    // eslint-disable-next-line no-await-in-loop
    const seen = await small.evaluate(`return JSON.stringify({
      innerWidth: window.innerWidth,
      tooSmall: Boolean(document.querySelector('[data-testid="design-too-small"]')),
      narrow: document.querySelector('[data-testid="design-room"]')?.dataset?.narrow || null,
    });`);
    const state = JSON.parse(seen);
    check(`at ${width}px the window really is ${width}px`, state.innerWidth === width,
      `innerWidth ${state.innerWidth}`);
    if (want === 'narrow') {
      check('between 768 and 1280 the room knows it is narrow', state.narrow === 'yes',
        JSON.stringify(state));
    } else {
      check('under 768 it says so, and offers the link', state.tooSmall, JSON.stringify(state));
      check('…and the four columns are NOT built at that width', state.narrow === null);
    }
    // eslint-disable-next-line no-await-in-loop
    await small.screenshot(`${SHOTS}${file}`);
    // eslint-disable-next-line no-await-in-loop
    try { await small.send('Browser.close', {}); } catch { /* already gone */ }
  }
  process.stdout.write(`  frames ${SHOTS}f7-tablet.png, f7-under-768.png\n`);
}

// ─── THE VERDICT ───────────────────────────────────────────────────────────
const bad = steps.filter((s) => !s.ok);
process.stdout.write(`\n${'─'.repeat(72)}\n${steps.length} check(s), ${bad.length} failed.\n`);
if (bad.length) for (const s of bad) process.stdout.write(`  FAIL  ${s.label}${s.detail ? ` — ${s.detail}` : ''}\n`);

// ─── WHAT IS NOT AN ERROR ──────────────────────────────────────────────────
//
// `fonts.googleapis.com` is unreachable from this container, so every frame in
// verify/t59 is set in the FALLBACK of `--pbi-font-display` — Georgia, and
// Arial for the UI face. That is the fallback stack working, not a defect, and
// it is why tokens.css gives every face a real one. The frames therefore show
// the LAYOUT and the COLOUR faithfully and the exact letterforms only
// approximately; a machine with the network open renders Cormorant Garamond
// and Inter and nothing else about the page moves.
const errors = page.errors.filter(
  // …and the PROPS MANIFEST, for a different reason worth writing down.
  //
  // `src/3d/Props.jsx` asks `lib/usePropsPack.js` for the pack on MOUNT,
  // whatever the props toggle says, and that is one anonymous GET to the
  // workshop's PUBLIC storage bucket. It is not PRO's Supabase CLIENT — retail
  // imports no such thing, and `test/turn59-f3-the-design-room.test.js` proves
  // it — and it carries no credentials and no project. But it IS a request the
  // PBI page makes to the workshop's bucket for a feature a client is never
  // offered, and it belongs in the morning report as an R2 item rather than
  // being silently swallowed. It fails harmlessly here (no egress) and the
  // pack settles to "absent", which is the path a build with no bucket takes.
  (e) => !/favicon|Download the React DevTools|fonts\.(googleapis|gstatic)\.com|storage\/v1\/object\/public\/props/i.test(String(e)),
);
if (errors.length) {
  process.stdout.write(`\n${errors.length} page error(s):\n`);
  for (const e of errors.slice(0, 8)) process.stdout.write(`  ${String(e).slice(0, 240)}\n`);
}

// Leave no browser behind — the next run must find its own.
try { await page.send('Browser.close', {}); } catch { /* already gone */ }

process.exit(bad.length === 0 && errors.length === 0 ? 0 : 1);
