// ─── THE ACCEPTANCE WALK, IN A REAL BROWSER (turn 61) ───────────────────────
//
// Every claim this turn makes about a PAGE ends in a frame. `npm test` and
// `npm run build` can both be green while the thing on screen is wrong,
// because neither of them opens a browser — turns 5, 58b, 59 and 60 all learnt
// that the same way.
//
//   npm run build && npx vite preview --port 4173
//   node scripts/t61-walk.mjs             every section
//   node scripts/t61-walk.mjs f3          one of them
//
// ─── THE OWNER'S IRON RULE, AND WHY EVERY SHOT IS A PAIR ───────────────────
//
//   *"Nowa funkcja = widoczne wejście w UI, w tym samym pakiecie."*
//
// A feature without a visible entry is a feature NOT DONE. So every new entry
// this turn ships is photographed TWICE — `*-where.png` is the control before
// it is pressed, `*-what.png` is what opened — and the pair is the proof that
// a client can reach it. A screenshot of a working feature nobody can find
// proves nothing.
//
// THE CAMERA IS PLACED, NEVER NUDGED — T57's rule, kept.
// THE PORT IS DERIVED FROM THE PID — t59's lesson 4: a fixed port attaches to
// a browser somebody else left running and photographs last build's bundle.

import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const SHOTS = new URL('../verify/t61/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const runs = (name) => want.length === 0 || want.includes(name);

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  process.stdout.write(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}\n`);
};

let seq = 0;
const nextPort = () => 9300 + ((process.pid + (seq += 11)) % 260);

async function open({ width = 1920, height = 1200 } = {}) {
  const page = await launch({ width, height, port: nextPort() });
  // `cdp.mjs` spawns Chromium with no `--user-data-dir`, so every walk shares
  // the machine's disk cache — and a frame of last build's JavaScript is worse
  // than no frame at all.
  await page.send('Network.enable', {});
  await page.send('Network.setCacheDisabled', { cacheDisabled: true });
  page.ask = (expr) => page.evaluate(`return (${expr});`);
  page.text = (sel) => page.ask(`(document.querySelector(${JSON.stringify(sel)})?.textContent || '').trim()`);
  page.has = (sel) => page.ask(`Boolean(document.querySelector(${JSON.stringify(sel)}))`);
  page.count = (sel) => page.ask(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
  page.box = (sel) => page.ask(
    `(() => { const el = document.querySelector(${JSON.stringify(sel)});`
    + ' if (!el) return null; const r = el.getBoundingClientRect();'
    + ' return { w: Math.round(r.width), h: Math.round(r.height),'
    + ' x: Math.round(r.x), y: Math.round(r.y) }; })()',
  );
  /**
   * TYPE A NUMBER INTO A FIELD, THE WAY A HAND WOULD — T61 F5's own helper.
   *
   * T60's `slide` exists for the same reason and says it: React holds a
   * `_valueTracker` on every controlled input, so assigning `el.value` is a
   * change React never sees. What is different here is the COMMIT: the field
   * writes on BLUR and on Enter and never per keystroke, so a helper that typed
   * and walked away would photograph a draft that had not been committed.
   */
  page.type = async (sel, to, { commit = true } = {}) => {
    // A REAL CLICK FIRST, so the box is really focused — everything below
    // depends on it and neither of the two faults this helper was written
    // around shows up without it.
    await page.click(sel);
    const at = await page.evaluate(
      `const el = document.querySelector(${JSON.stringify(sel)});`
      + ' if (!el) return null;'
      + ` const want = String(${JSON.stringify(String(to))});`
      + ' const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");'
      + ' if (d && d.set) d.set.call(el, want); else el.value = want;'
      + ' if (el._valueTracker) el._valueTracker.setValue("");'
      + ' el.dispatchEvent(new Event("input", { bubbles: true }));'
      + ' return el.value;',
    );
    if (commit) {
      // ─── AND THE COMMIT IS ENTER, THE WAY A HAND COMMITS ─────────────────
      //
      // TWO MEASURED FAULTS, both on the first run of this script.
      //
      // 1. `new Event("blur")` is not what React listens for. React 17+
      //    delegates at the root and maps `onBlur` onto the native FOCUSOUT, so
      //    a dispatched blur reaches no handler and the field never committed.
      // 2. `el.focus(); el.blur()` is a no-op when the element was not focused
      //    to begin with — and in a headless browser nothing is, until a real
      //    mouse event says so. That is what the click above is for.
      //
      // What is left is the gesture itself: ENTER, which the field's own
      // `onKeyDown` turns into a blur, which the browser then fires for real.
      await page.key('Enter', { code: 'Enter', windowsVirtualKeyCode: 13 });
      await page.sleep(700);
    }
    return at;
  };
  return page;
}

/** Wait for the wardrobe to exist and the renderer to have a scene. */
async function stageReady(page, timeout = 45000) {
  await page.waitFor('window.__cc && window.__cc.pbi && window.__cc.pbi.render', { timeout });
  await page.waitFor('window.__cc.pbi.render.bounds() !== null', { timeout });
  // The EGGER pack arrives over the network and re-renders the boards when it
  // does; a frame taken before that is a half-dressed wardrobe.
  await page.sleep(3500);
}

const shot = (page, file) => page.screenshot(`${SHOTS}${file}`);

/** Open the design room on a category. */
async function room(page, category = 'space') {
  await page.goto(`${BASE}retail.html#/design`);
  await stageReady(page);
  if (category !== 'space') {
    await page.click(`[data-testid="cat-${category}"]`);
    await page.sleep(700);
  }
}

/** The stage's own centre, for a click on the furniture. */
async function stageCentre(page) {
  const b = await page.box('[data-testid="stage-canvas"]');
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

// ═══ F1 · THE EIGHT OVERLAYS RETURN ════════════════════════════════════════
//
// ─── A FRAME IS NOT THE PROOF HERE, AND SAYING SO IS THE POINT ─────────────
//
// A drill ring is four millimetres of dark on a board a client is looking at
// from two metres away. A photograph of it is a photograph either way, and
// `test/turn58b-f4-the-classifier-debt.test.js` names the failure exactly:
// *"a probe cannot pass by its feature being dead."*
//
// So F1 COUNTS. `window.__cc.views.room.scene` is the LIVE three.js scene the
// canvas is drawing — `viewHandle.js` puts it there deliberately, *"the build
// that gets verified has to be the build that gets used"* — and every one of
// these overlays marks its own objects `userData.ccHelper` (which is also how
// `captureRender` strips them from a picture a workshop shows a customer). A
// walk that can count them can tell a drawn overlay from a switched-off one,
// which is the whole of what this feature is.
if (runs('f1')) {
  process.stdout.write('\nF1 — THE EIGHT OVERLAYS RETURN\n');
  const page = await open();

  /** Every `ccHelper` object in the live scene, by the tag it carries. */
  const helpers = () => page.ask(
    '(() => { const v = window.__cc && window.__cc.views && window.__cc.views.room;'
    + ' if (!v) return null; const out = { total: 0, rings: 0, hover: 0 };'
    + ' v.scene.traverse((o) => { if (!o.userData || !o.userData.ccHelper) return;'
    + ' out.total += 1;'
    + ' if (o.userData.ccDrillRing) out.rings += 1;'
    + ' if (o.userData.ccHoverDimension) out.hover += 1; });'
    + ' return out; })()',
  );

  try {
    await room(page);
    const first = await helpers();
    check('the walk can read the live scene', first !== null, JSON.stringify(first));

    // ─── DRILL RINGS · channel `drill` ─────────────────────────────────────
    // The owner's own 7.5 / 5.5 / dark rings, and every CNC hole. t59 switched
    // them off wholesale; a shelf gives the wardrobe pins to drill for.
    await page.click('[data-testid="cat-interior"]');
    await page.sleep(800);
    await page.click('[data-testid="interior-add-shelves"]');
    await page.sleep(2200);
    // OPEN ALL, so a client is looking INTO the wardrobe — PRO's own bar entry.
    await page.click('[data-testid="view-open-all"]');
    await page.sleep(2200);
    const withRings = await helpers();
    check('drill rings are drawn in the client\'s room',
      withRings && withRings.rings > 0, `${withRings && withRings.rings} rings`);
    await shot(page, 'f1-drill-rings.png');

    // ─── THE `+` MARKERS · channel `plus` ──────────────────────────────────
    // WHERE I CLICK: the marker itself, in the scene, beside the wardrobe.
    // It has no `data-testid` — it is a disc in WebGL — so it is found the only
    // way a 3-D object can be: by its own world position, projected.
    await page.click('[data-testid="view-open-all"]');
    await page.sleep(1600);
    const plus = await page.ask(
      '(() => { const v = window.__cc.views.room; const out = [];'
      + ' v.scene.traverse((o) => { if (o.userData && o.userData.ccAddPlus) out.push(o); });'
      + ' if (!out.length) return null;'
      + ' const p = new v.three.Vector3(); out[0].getWorldPosition(p);'
      + ' p.project(v.camera); const r = v.gl.domElement.getBoundingClientRect();'
      + ' return { n: out.length, x: Math.round(r.left + (p.x * 0.5 + 0.5) * r.width),'
      + ' y: Math.round(r.top + (-p.y * 0.5 + 0.5) * r.height) }; })()',
    );
    check('a `+` marker stands beside the wardrobe', plus !== null, JSON.stringify(plus));
    await shot(page, 'f1-plus-where.png');

    // WHAT OPENS: it ADDS. PRO's plus opens the LIBRARY, which this page never
    // mounts; retail's route is `Scene`'s `onAddPlus` → `adapter.addBesidePlus`,
    // and the proof is a second wardrobe on the glass.
    if (plus) {
      const before = await page.ask('window.__cc.views.room.scene.children.length');
      await page.mouse('mouseMoved', plus.x, plus.y, { buttons: 0, clickCount: 0 });
      await page.mouse('mousePressed', plus.x, plus.y);
      await page.mouse('mouseReleased', plus.x, plus.y);
      await page.sleep(3000);
      const after = await page.ask('window.__cc.views.room.scene.children.length');
      check('pressing it adds a unit — the route is live', after !== before, `${before} → ${after}`);
      await shot(page, 'f1-plus-what.png');
    }

    // ─── HOVER DIMENSIONS · channel `hover-dims` ───────────────────────────
    // The figures under the cursor, over a divider. The gesture is a hover on
    // the partition, which needs one to exist.
    await page.goto(`${BASE}retail.html?f1b=1#/design`);
    await stageReady(page);
    await page.click('[data-testid="cat-interior"]');
    await page.sleep(800);
    await page.click('[data-testid="interior-add-partition"]');
    await page.sleep(2400);
    const overPartition = await page.ask(
      '(() => { const v = window.__cc.views.room; let hit = null;'
      + ' v.scene.traverse((o) => { if (hit) return;'
      + ' if (o.userData && /^VPART/.test(String(o.userData.ccPanelId || ""))) hit = o; });'
      + ' if (!hit) return null; const p = new v.three.Vector3(); hit.getWorldPosition(p);'
      + ' p.project(v.camera); const r = v.gl.domElement.getBoundingClientRect();'
      + ' return { x: Math.round(r.left + (p.x * 0.5 + 0.5) * r.width),'
      + ' y: Math.round(r.top + (-p.y * 0.5 + 0.5) * r.height) }; })()',
    );
    if (overPartition) {
      await page.mouse('mouseMoved', overPartition.x, overPartition.y, { buttons: 0, clickCount: 0 });
      await page.sleep(1400);
      const hovered = await helpers();
      check('hover dimensions are drawn under the cursor',
        hovered && hovered.hover > 0, `${hovered && hovered.hover} figures`);
      await shot(page, 'f1-hover-dimensions.png');
    } else {
      check('a divider was found to hover', false, 'no VPART in the scene');
    }

    // ─── AND THE TOTAL MOVES ───────────────────────────────────────────────
    // The blunt version of the same argument: with the channels claimed there
    // are helper objects in the client's scene at all. In t59 there were none.
    const last = await helpers();
    check('the client\'s room draws the tool\'s overlays',
      last && last.total > 0, `${last && last.total} helper objects`);
    await shot(page, 'f1-overlays.png');
  } finally {
    await page.close?.();
  }
}

// ═══ F2 · TWO WALLS ════════════════════════════════════════════════════════
if (runs('f2')) {
  process.stdout.write('\nF2 — TWO WALLS\n');
  const page = await open();
  try {
    await room(page, 'space');

    // WHERE I CLICK: the WALLS chips, at 1.
    check('YOUR SPACE carries a WALLS row', await page.has('[data-testid="space-walls"]'));
    check('…and it is at 1', (await page.text('[data-testid="space-walls"]')).includes('1'));
    check('there is no WALL 2 WIDTH yet', !(await page.has('[data-testid="space-wall2"]')));
    await shot(page, 'f2-walls-where.png');

    // WHAT OPENS: two walls, and a second width field for the second one.
    await page.click('[data-testid="space-walls"] button', '2', { exact: true });
    await page.sleep(1600);
    check('WALL 2 WIDTH appears', await page.has('[data-testid="space-wall2"]'));
    await shot(page, 'f2-walls-what.png');

    // …and typing into it moves the room.
    const was = await page.ask('document.querySelector(\'[data-testid="space-wall2"]\').value');
    await page.type('[data-testid="space-wall2"]', 2400);
    await page.sleep(1600);
    const now = await page.ask('document.querySelector(\'[data-testid="space-wall2"]\').value');
    check('WALL 2 WIDTH commits', String(now) === '2400', `${was} → ${now}`);
    await shot(page, 'f2-wall2-width.png');

    // ADD WARDROBE ON WALL 2 — the entry, and the second wardrobe.
    await page.click('[data-testid="cat-layout"]');
    await page.sleep(900);
    check('LAYOUT offers ADD WARDROBE ON WALL 2', await page.has('[data-testid="layout-add-wardrobe"]'));
    await shot(page, 'f2-add-wardrobe-where.png');
    await page.click('[data-testid="layout-add-wardrobe"]');
    await page.sleep(3000);
    check('a WALL chip row appears once there are two', await page.has('[data-testid="layout-wall"]'));
    await shot(page, 'f2-add-wardrobe-what.png');

    // …and the STAGE HINT names the WALL now that there are two to confuse.
    // Opened from LAYOUT rather than by clicking the glass: a click at the
    // stage's centre lands on whatever the camera happens to be pointing at,
    // and a check that passes because it found SOMETHING is not a check.
    await page.click('[data-testid="layout-open-wardrobe"]');
    await page.sleep(1400);
    const named = await page.text('[data-testid="stage-caption-name"]');
    check('the hint names which wall the wardrobe is on', /WALL \d WARDROBE/.test(named), named);
    await shot(page, 'f2-two-wardrobes.png');
  } finally {
    await page.close?.();
  }
}

// ═══ F3 · ADD TOP BOX ══════════════════════════════════════════════════════
if (runs('f3')) {
  process.stdout.write('\nF3 — ADD TOP BOX\n');
  const page = await open();
  try {
    await room(page, 'layout');

    // WHERE I CLICK.
    check('LAYOUT carries ADD TOP BOX', await page.has('[data-testid="layout-add-top-box"]'));
    const disabled = await page.ask(
      'document.querySelector(\'[data-testid="layout-add-top-box"]\').disabled',
    );
    check('…and in a 2500 room it is live', disabled === false);
    await shot(page, 'f3-add-top-box-where.png');

    // WHAT OPENS: a box riding the wardrobe.
    await page.click('[data-testid="layout-add-top-box"]');
    await page.sleep(3000);
    await shot(page, 'f3-add-top-box-what.png');

    // …and the box is selectable, opens its own menu, and says what it is.
    await page.click('[data-testid="cat-space"]');
    await page.sleep(600);
    await page.click('[data-testid="cat-layout"]');
    await page.sleep(900);
    await shot(page, 'f3-top-box-riding.png');

    // ─── THE REFUSAL, AND WHY IT NEEDS A FRESH ROOM ───────────────────────
    //
    // MEASURED, on the first run: lowering the ceiling to 2200 with a box
    // already on the wardrobe is a room change `roomChangeGuard` REFUSES — the
    // box would be through the ceiling — so the ceiling never moved and the
    // button stayed live. Which is T50's room-refuses-first working exactly as
    // it should, in the way of the shot. So the greyed frame is taken on a
    // fresh room: the ceiling first, the button second.
    // A QUERY STRING, so it is a real navigation: the hash is already
    // `#/design`, and `Page.navigate` to the same URL is a same-document change
    // that reloads nothing and resets no state.
    await page.goto(`${BASE}retail.html?fresh=1#/design`);
    await stageReady(page);
    await page.type('[data-testid="space-ceiling"]', 2200);
    await page.sleep(1800);
    await page.click('[data-testid="cat-layout"]');
    await page.sleep(1200);
    const greyed = await page.ask(
      'document.querySelector(\'[data-testid="layout-add-top-box"]\').disabled',
    );
    const reason = await page.text('[data-testid="layout-top-box-reason"]');
    check('a low ceiling greys ADD TOP BOX', greyed === true);
    check('…with the engine\'s own sentence', /top box needs/.test(reason), reason);
    await shot(page, 'f3-add-top-box-greyed.png');
  } finally {
    await page.close?.();
  }
}

// ═══ F4 · THE INTERIOR, AT PRO'S OWN LENGTH ════════════════════════════════
if (runs('f4')) {
  process.stdout.write('\nF4 — INTERIOR: THE FULL ROW SET\n');
  const page = await open();
  try {
    await room(page, 'interior');

    // WHERE I CLICK: the whole list.
    const ROWS = ['drawers', 'overlay', 'watch', 'shelves', 'shoe',
      'partition', 'hanger', 'pulldown_rail', 'trouser', 'tie_rack'];
    for (const id of ROWS) {
      // eslint-disable-next-line no-await-in-loop
      check(`the list carries ${id}`, await page.has(`[data-testid="interior-${id}"]`));
    }
    check('ten rows, and no more', (await page.count('.pbi-interior-row')) === 10);
    await shot(page, 'f4-rows.png');

    // A GREYED ROW carries its reason — the watch drawer, before there is a
    // stack for it to sit on. The words are the STORE's.
    const watchReason = await page.ask(
      '(() => { const row = document.querySelector(\'[data-testid="interior-watch"]\');'
      + ' const r = row && row.querySelector(".pbi-chip-reason");'
      + ' return r ? r.textContent.trim() : ""; })()',
    );
    check('the watch drawer is greyed before there are drawers',
      /^Add the drawers first/.test(watchReason), watchReason);
    await shot(page, 'f4-greyed-row.png');

    // WHAT OPENS: a new row's own Duty menu. The trouser pull-out, which PRO
    // has no editor for at all.
    await page.click('[data-testid="interior-add-trouser"]');
    await page.sleep(1600);
    check('the trouser row now has one', (await page.text('[data-testid="interior-open-trouser"]')).includes('1'));
    await shot(page, 'f4-trouser-where.png');
    await page.click('[data-testid="interior-open-trouser"]');
    await page.sleep(1200);
    check('…and its menu opens', (await page.ask(
      'document.querySelector(\'[data-testid="column-detail"]\').dataset.menu',
    )) === 'trouser');
    await shot(page, 'f4-trouser-what.png');
    await page.click('[data-testid="detail-done"]');
    await page.sleep(600);

    // …and the divider, which is the one that had to become ONE path.
    await page.click('[data-testid="interior-add-partition"]');
    await page.sleep(1800);
    await page.click('[data-testid="interior-open-partition"]');
    await page.sleep(1200);
    check('the divider opens its own menu', (await page.ask(
      'document.querySelector(\'[data-testid="column-detail"]\').dataset.menu',
    )) === 'partition');
    await shot(page, 'f4-partition-menu.png');
  } finally {
    await page.close?.();
  }
}

// ═══ F5 · FIELDS, NOT SLIDERS ══════════════════════════════════════════════
if (runs('f5')) {
  process.stdout.write('\nF5 — FIELDS, NOT SLIDERS\n');
  const page = await open();
  try {
    await room(page, 'space');

    check('YOUR SPACE has no slider left', (await page.count('.pbi-options .pbi-slider')) === 0);
    check('…and WALL WIDTH is a typed field', await page.has('input[data-testid="space-wall"]'));

    // THE GOLD RING, measured off the glass rather than off the CSS.
    const border = await page.ask(
      'getComputedStyle(document.querySelector(\'[data-testid="space-wall"]\')).borderTopColor',
    );
    const radius = await page.ask(
      'getComputedStyle(document.querySelector(\'[data-testid="space-wall"]\')).borderTopLeftRadius',
    );
    check('the field is bordered in gold', border.replace(/\s/g, '') === 'rgb(184,165,136)', border);
    check('…and its corners are rounded', parseFloat(radius) > 0, radius);
    await page.evaluate('document.querySelector(\'[data-testid="space-wall"]\').focus(); return true;');
    await page.sleep(400);
    await shot(page, 'f5-field-focused.png');

    // AN OUT-OF-RANGE ENTRY IS REFUSED — no silent clamp, and a sentence.
    await page.type('[data-testid="space-wall"]', 9999);
    await page.sleep(900);
    const said = await page.text('[data-testid="space-wall-said"]');
    check('an out-of-range number is refused in words', said.length > 0, said);
    check('…and it names the range', /Between \d+ and \d+ mm/.test(said), said);
    await shot(page, 'f5-field-refused.png');

    // …and a number INSIDE the range lands.
    await page.type('[data-testid="space-wall"]', 3200);
    await page.sleep(1600);
    const now = await page.ask('document.querySelector(\'[data-testid="space-wall"]\').value');
    check('a number in range commits', String(now) === '3200', String(now));
    // …and it reached the STORE, not just the box. Read back through another
    // surface entirely — LAYOUT's note names the wall the wardrobe stands on —
    // so this check cannot pass on a draft nobody committed.
    await page.click('[data-testid="cat-layout"]');
    await page.sleep(900);
    const note = await page.ask(
      '(() => { const els = [...document.querySelectorAll(".pbi-field-note")];'
      + ' return els.map((e) => e.textContent.trim()).join(" | "); })()',
    );
    check('…and the room really is 3200 now', /3200 mm/.test(note), note);
    await page.click('[data-testid="cat-space"]');
    await page.sleep(700);
    await shot(page, 'f5-field-committed.png');
  } finally {
    await page.close?.();
  }
}

// ═══ F6 · WINDOWS AND DOORS ════════════════════════════════════════════════
if (runs('f6')) {
  process.stdout.write('\nF6 — WINDOWS AND DOORS, DRAWN ONLY\n');
  const page = await open();
  try {
    await room(page, 'space');

    // WHERE I CLICK.
    check('YOUR SPACE carries a WINDOWS & DOORS block', await page.has('[data-testid="space-openings"]'));
    check('…with ADD WINDOW', await page.has('[data-testid="opening-add-window"]'));
    check('…and ADD DOOR', await page.has('[data-testid="opening-add-door"]'));
    await shot(page, 'f6-block-where.png');

    // WHAT OPENS: an opening, with its four fields.
    await page.click('[data-testid="opening-add-window"]');
    await page.sleep(1800);
    const ids = await page.ask(
      '[...document.querySelectorAll(\'[data-testid^="opening-op_"]\')].map((e) => e.dataset.testid)',
    );
    check('a window record appears', ids.length === 1, String(ids));
    check('…and it is a WINDOW', (await page.text(`[data-testid="${ids[0]}"] .pbi-choice`)) === 'WINDOW');
    check('…with FROM THE LEFT, WIDTH, HEIGHT and SILL',
      (await page.count('[data-testid^="opening-x_mm-"]')) === 1
      && (await page.count('[data-testid^="opening-width-"]')) === 1
      && (await page.count('[data-testid^="opening-height-"]')) === 1
      && (await page.count('[data-testid^="opening-sill-"]')) === 1);
    await shot(page, 'f6-block-what.png');

    // A DOOR HAS NO SILL — `clampOpening`'s own law, on the glass.
    await page.click('[data-testid="opening-add-door"]');
    await page.sleep(1600);
    check('a door has no sill field',
      (await page.count('[data-testid^="opening-sill-"]')) === 1, 'still one — the window\'s');
    await shot(page, 'f6-window-and-door.png');

    // …and they are DRAWN, behind the wardrobe, which is the whole feature.
    await page.click('[data-testid="cat-layout"]');
    await page.sleep(1200);
    await shot(page, 'f6-drawn-in-the-wall.png');

    // REMOVE takes one.
    await page.click('[data-testid="cat-space"]');
    await page.sleep(800);
    const beforeN = await page.count('[data-testid^="opening-remove-"]');
    await page.click('[data-testid^="opening-remove-"]');
    await page.sleep(1400);
    const afterN = await page.count('[data-testid^="opening-remove-"]');
    check('REMOVE takes one opening', afterN === beforeN - 1, `${beforeN} → ${afterN}`);
  } finally {
    await page.close?.();
  }
}

// ═══ THE VERDICT ═══════════════════════════════════════════════════════════
const failed = steps.filter((s) => !s.ok);
writeFileSync(`${SHOTS}walk.json`, `${JSON.stringify({ steps, failed: failed.length }, null, 1)}\n`);
process.stdout.write(`\n${'─'.repeat(72)}\n${steps.length} checks, ${failed.length} failed\n`);
if (failed.length) {
  for (const s of failed) process.stdout.write(`  FAIL  ${s.label}${s.detail ? ` — ${s.detail}` : ''}\n`);
}
process.exit(failed.length ? 1 : 0);
