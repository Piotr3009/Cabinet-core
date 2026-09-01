// ─── THE ACCEPTANCE WALK, IN A REAL BROWSER (turn 62) ───────────────────────
//
// Every claim this turn makes about a PAGE ends in a frame. `npm test` and
// `npm run build` can both be green while the thing on screen is wrong,
// because neither of them opens a browser — turns 5, 58b, 59, 60 and 61 all
// learnt that the same way.
//
//   npm run build && npx vite preview --port 4173
//   node scripts/t62-walk.mjs             every section
//   node scripts/t62-walk.mjs f3          one of them
//
// ─── WHAT THIS WALK HAS TO PROVE, AND IT IS NOT "IT RENDERS" ───────────────
//
// The owner's verdict on T61: *"miało być prawie 1 do 1 a jest 1 do 20."* He
// was shown a `SLOPED CEILING NO | YES` chip where PRO has an editor. A frame
// of a chip is a frame; so is a frame of an editor. What separates them is
// COUNTING and READING — the number of controls on the screen, the words on
// them, and the geometry that comes out the other end.
//
// So every section below asks a question with a number or a word in the
// answer, and the screenshot stands beside the answer rather than instead of
// it. The one that matters most is F3's third frame: the SAME slope, entered
// in the editor, standing in the 3-D room and cutting PART of the ceiling —
// read off the live scene's own geometry, not judged by eye.
//
// THE CAMERA IS PLACED, NEVER NUDGED — T57's rule, kept.
// THE PORT IS DERIVED FROM THE PID — t59's lesson 4.

import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const SHOTS = new URL('../verify/t62/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const runs = (name) => want.length === 0 || want.includes(name);

const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  process.stdout.write(`${ok ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}\n`);
};

let seq = 0;
const nextPort = () => 9600 + ((process.pid + (seq += 13)) % 240);

async function open({ width = 1920, height = 1200 } = {}) {
  const page = await launch({ width, height, port: nextPort() });
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
   * TYPE A NUMBER INTO A FIELD, THE WAY A HAND WOULD — T61's helper, kept.
   *
   * React holds a `_valueTracker` on every controlled input, so assigning
   * `el.value` is a change React never sees. And the COMMIT is ENTER: both the
   * retail field and PRO's copied `NumberField` write on blur and on Enter and
   * never per keystroke, so a helper that typed and walked away would
   * photograph a draft nobody had committed. The real CLICK first is what makes
   * the blur real — in a headless browser nothing is focused until a mouse
   * event says so.
   */
  page.type = async (sel, to, { commit = true } = {}) => {
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
      await page.key('Enter', { code: 'Enter', windowsVirtualKeyCode: 13 });
      await page.sleep(700);
    }
    return at;
  };

  /** Click the chip whose LABEL is this word, inside this chip row. */
  page.clickChip = async (testid, label) => {
    const at = await page.ask(
      `(() => { const row = document.querySelector('[data-testid=${JSON.stringify(testid)}]');`
      + ' if (!row) return null;'
      + ` const want = ${JSON.stringify(String(label))};`
      + ' const hit = [...row.querySelectorAll(".pbi-chip")]'
      + '   .find((c) => (c.textContent || "").trim() === want);'
      + ' if (!hit) return null; const r = hit.getBoundingClientRect();'
      + ' return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()',
    );
    if (!at) return false;
    await page.mouse('mouseMoved', at.x, at.y, { buttons: 0, clickCount: 0 });
    await page.mouse('mousePressed', at.x, at.y);
    await page.mouse('mouseReleased', at.x, at.y);
    await page.sleep(900);
    return true;
  };

  /** Click by a CSS selector's own box centre — for hooks with no testid. */
  page.clickBox = async (sel) => {
    const b = await page.box(sel);
    if (!b) return false;
    const x = Math.round(b.x + b.w / 2);
    const y = Math.round(b.y + b.h / 2);
    await page.mouse('mouseMoved', x, y, { buttons: 0, clickCount: 0 });
    await page.mouse('mousePressed', x, y);
    await page.mouse('mouseReleased', x, y);
    return true;
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

/** YOUR SPACE → EDIT THE ROOM, and the modal it opens. */
async function openRoomEditor(page) {
  await page.click('[data-testid="space-edit-room"]');
  await page.sleep(1200);
  return page.has('[data-room-plan="1"]');
}

// ═══ F2 · THE ROOM EDITOR, COPIED ══════════════════════════════════════════
//
// The proof is a COUNT and a set of WORDS, because "the modal opened" is what
// T61's chip could also have claimed. PRO's room editor has presets, a walls
// list with a typed length per wall, a plan you drag in, boxes, openings and a
// DXF import. The copy is asked for all of them by name.
if (runs('f2')) {
  process.stdout.write('\nF2 — THE ROOM EDITOR, COPIED\n');
  const page = await open();
  try {
    await room(page, 'space');

    // ─── THE ENTRY (the owner's iron rule: a feature without a visible entry
    //     is a feature NOT DONE). WHERE it is, before it is pressed.
    const entry = await page.has('[data-testid="space-edit-room"]');
    check('YOUR SPACE offers EDIT THE ROOM', entry,
      await page.text('[data-testid="space-edit-room"]'));
    await shot(page, 'f2-entry-where.png');

    // …and WHAT opens.
    const opened = await openRoomEditor(page);
    check('EDIT THE ROOM opens PRO\'s own room window', opened);
    await shot(page, 'f2-modal-one-wall.png');

    // ─── THE HOUSE RULE: BESIDE ITS TRIGGER, NEVER ON IT ──────────────────
    const trigger = await page.box('[data-testid="space-edit-room"]');
    const modal = await page.box('[data-modal-shell="1"]');
    const clear = trigger && modal
      && (modal.x >= trigger.x + trigger.w - 2 || modal.x + modal.w <= trigger.x + 2
        || modal.y >= trigger.y + trigger.h - 2 || modal.y + modal.h <= trigger.y + 2);
    check('the window stands BESIDE its trigger, not on it', clear,
      `trigger x${trigger?.x} w${trigger?.w} · modal x${modal?.x} w${modal?.w}`);

    // ─── ONE WALL IS WHAT A CLIENT LANDS ON, AND THE COPY OBEYS IT ────────
    //
    // NOT A FAULT — the copy behaving exactly as PRO's file behaves. Line 131
    // of both files reads the project's own scope, and retail's design starts
    // at ONE WALL (T61 F2's `WALLS 1 | 2`). At that scope PRO's editor shows
    // one wall row and says `Wall height (mm)`; at any other it shows the room
    // and says `Room height (mm)`. Both are photographed, because a walk that
    // only ever saw one of them would not know the copy could do the other.
    const oneWallWords = await page.text('[data-modal-shell="1"]');
    const oneWall = await page.count('[data-open-wall]');
    check('at ONE WALL the copy shows one wall and asks its height',
      oneWall === 1 && oneWallWords.includes('Wall height'), `${oneWall} wall`);

    // ─── AND THE WHOLE ROOM, WHEN THE CLIENT ASKS FOR TWO WALLS ───────────
    await page.key('Escape');
    await page.sleep(800);
    await page.clickChip('space-walls', '2');
    await openRoomEditor(page);
    await page.sleep(600);

    const words = await page.text('[data-modal-shell="1"]');
    const HAS = ['Rectangle', 'L-shape', 'Walls', 'Box', 'Room height',
      'Import DXF plan', 'Elevation'];
    const missing = HAS.filter((w) => !words.includes(w));
    check('the copy shows every control PRO shows', missing.length === 0,
      missing.length ? `missing: ${missing.join(', ')}` : `${HAS.length} of ${HAS.length}`);

    const walls = await page.count('[data-open-wall]');
    check('a walls list with one row per wall', walls > 1, `${walls} walls`);
    await shot(page, 'f2-modal-rectangle.png');

    // ─── THE L PRESET ─────────────────────────────────────────────────────
    await page.clickBox('[data-room-preset="L"]');
    await page.sleep(1100);
    const lWalls = await page.count('[data-open-wall]');
    check('the L preset is a six-wall room', lWalls > walls, `${walls} → ${lWalls} walls`);
    await shot(page, 'f2-l-preset.png');

    // ─── A TYPED WALL LENGTH KEEPS EVERY ANGLE (T14 F1.5a) ────────────────
    //
    // The whole reason `setWallLengthCorners` exists: a rectangle that is
    // stretched by one wall must not shear into a rhombus. Read off the
    // room's own corners, not judged by eye.
    await page.clickBox('[data-room-preset="rect"]');
    await page.sleep(900);
    const before = await page.ask(
      '(() => { const r = window.__cc.stores.project.getState().project.room;'
      + ' return r.corners.map((c) => [Math.round(c.x), Math.round(c.y)]); })()',
    ).catch(() => null);
    const field = '[data-modal-shell="1"] input';
    await page.type(field, 3600);
    await page.sleep(900);
    const angles = await page.ask(
      '(() => { const svg = document.querySelector(\'[data-room-plan="1"]\');'
      + ' const poly = svg && svg.querySelector("polygon"); if (!poly) return null;'
      + ' const pts = poly.getAttribute("points").trim().split(/\\s+/)'
      + '   .map((p) => p.split(",").map(Number));'
      + ' const out = []; for (let i = 0; i < pts.length; i += 1) {'
      + '   const a = pts[(i - 1 + pts.length) % pts.length], b = pts[i],'
      + '         c = pts[(i + 1) % pts.length];'
      + '   const u = [a[0] - b[0], a[1] - b[1]], v = [c[0] - b[0], c[1] - b[1]];'
      + '   const dot = u[0] * v[0] + u[1] * v[1];'
      + '   const m = Math.hypot(...u) * Math.hypot(...v);'
      + '   out.push(Math.round((Math.acos(Math.max(-1, Math.min(1, dot / m))) * 180) / Math.PI));'
      + ' } return out; })()',
    );
    const square = Array.isArray(angles) && angles.every((a) => Math.abs(a - 90) <= 1);
    check('a typed wall length holds every right angle', square,
      `corners ${JSON.stringify(angles)}${before ? '' : ''}`);
    await shot(page, 'f2-typed-wall-holds-its-angles.png');

    // ─── + BOX, IN BOTH SCOPES (T51's bug, not re-introduced) ─────────────
    const boxButton = await page.has('[data-insert-box="1"]');
    check('+ Box is offered', boxButton);
    if (boxButton) {
      await page.clickBox('[data-insert-box="1"]');
      await page.sleep(1000);
      const boxes = await page.count('[data-plan-box]');
      const listed = await page.has('[data-box-list="1"]');
      check('a box stands in the plan and in the list', boxes > 0 && listed, `${boxes} in the plan`);
      await shot(page, 'f2-box-in-the-plan.png');
    }
  } finally {
    await page.close?.();
  }
}

// ═══ F3 · THE WALL ELEVATION, AND THE REAL SLOPE ═══════════════════════════
//
// THE TURN'S REASON FOR EXISTING. CLAUDE.md: *"if the night can only finish one
// big thing, it finishes F3."*
if (runs('f3')) {
  process.stdout.write('\nF3 — THE WALL ELEVATION, AND THE REAL SLOPE\n');
  const page = await open();
  try {
    await room(page, 'space');
    await openRoomEditor(page);

    // ─── ONE WALL → ITS ELEVATION, the route PRO takes ────────────────────
    await shot(page, 'f3-where-one-wall.png');
    await page.clickBox('[data-open-wall="0"]');
    await page.sleep(1400);
    const editor = await page.has('[data-wall-elevation="1"]');
    check('a wall opens its own elevation editor', editor);

    // ─── AND IT IS AN EDITOR, NOT A CHIP ──────────────────────────────────
    //
    // TWO VIEWS ON ONE WALL'S DATA, which is PRO's own design and the copy's:
    // the ELEVATION offers what stands UP a wall (a door, a window, a slope at
    // either end) and the PLAN offers what sticks OUT of it (a recess, a
    // chimney). A walk that expected one list of five would have reported a
    // missing control where there is a second view. Both are counted.
    const front = await page.count('[data-elevation-add]');
    check('the ELEVATION offers door, window and a slope at each end',
      front === 4, `${front} rows`);
    const frontWords = await page.text('[data-elevation-tools="1"]');
    check('…named as PRO names them', ['Add door', 'Add window', 'Slope left', 'Slope right']
      .every((w) => frontWords.includes(w)), frontWords.replace(/\s+/g, ' ').slice(0, 90));
    await shot(page, 'f3-editor-open.png');

    await page.clickBox('[data-wall-view-option="top"]');
    await page.sleep(1000);
    const plan = await page.count('[data-elevation-add]');
    const planWords = await page.text('[data-elevation-tools="1"]');
    check('the TOP view offers a recess and a chimney',
      plan === 2 && planWords.includes('Add recess') && planWords.includes('Add chimney'),
      `${plan} rows — ${planWords.replace(/\s+/g, ' ').slice(0, 70)}`);
    await shot(page, 'f3-top-view-recess-chimney.png');

    const both = await page.count('[data-wall-view-option]');
    check('one wall, two views, one set of data', both === 2, `${both} views`);
    await page.clickBox('[data-wall-view-option="front"]');
    await page.sleep(900);

    // ─── A SLOPE, ON THE RIGHT, RUN 900 ───────────────────────────────────
    await page.clickBox('[data-elevation-add="slope-right"]');
    await page.sleep(1400);
    const listed0 = await page.count('[data-elevation-row]');
    check('the slope lands ON THIS WALL', listed0 > 0, `${listed0} on the wall`);
    // Its own editor — opened the way PRO opens it, by picking the row.
    await page.clickBox('[data-elevation-row]');
    await page.sleep(1200);
    const fields = await page.text('[data-element-modal="slope"]');
    const SLOPE_FIELDS = ['Side', 'Start height', 'Run'];
    const lost = SLOPE_FIELDS.filter((f) => !fields.includes(f));
    check('a slope has Side, Start height and Run', lost.length === 0,
      lost.length ? `missing: ${lost.join(', ')}` : '3 of 3');
    const flat = await page.has('[data-slope-flat="1"]');
    check('…and Flat, while there is only one slope on this wall', flat);

    await page.clickBox('[data-slope-side="R"]');
    await page.sleep(600);
    await page.type('[data-slope-start="1"]', 1800);
    await page.type('[data-slope-run="1"]', 900);
    await page.sleep(900);
    await shot(page, 'f3-slope-right-run-900.png');

    // WHAT THE EDITOR WROTE, read off the page rather than out of a debug hook.
    // The store is not on `window` and this turn is not licensed to put it
    // there — `src/stores` is shared core. The row in ON THIS WALL is the
    // engine's own answer rendered back: `slope R · 900 mm`.
    const written = await page.ask(
      '(() => { const rows = [...document.querySelectorAll("[data-elevation-row]")];'
      + ' const hit = rows.find((r) => /slope/i.test(r.textContent || ""));'
      + ' return hit ? (hit.textContent || "").replace(/\\s+/g, " ").trim() : null; })()',
    );
    const start = await page.ask('(document.querySelector(\'[data-slope-start="1"]\')?.value || "")');
    const run = await page.ask('(document.querySelector(\'[data-slope-run="1"]\')?.value || "")');
    check('the slope the editor wrote is the one that was typed',
      /slope R/.test(String(written)) && /900/.test(String(written))
      && String(start).replace(/\D/g, '') === '1800' && String(run).replace(/\D/g, '') === '900',
      `${written} · start ${start} · run ${run}`);

    // ─── AND THE SAME SLOPE STANDS IN THE 3-D ROOM ────────────────────────
    //
    // THE FRAME THAT MATTERS. Not "a sloped room" by eye: the wall mesh's own
    // bounding box is read at the two ends of the wall, and the answer has to
    // be FULL HEIGHT at one end and 1800 at the other. That is the difference
    // between a ceiling cut on PART of a wall and one cut on all of it, and it
    // is the sentence T61's chip could not say.
    await page.clickBox('[data-element-done="1"]');
    await page.sleep(900);
    await page.clickBox('[data-elevation-save="1"]');
    await page.sleep(1600);
    const closed = await page.ask('!document.querySelector(\'[data-modal-shell="1"]\')');
    if (!closed) { await page.key('Escape'); await page.sleep(900); }
    await page.sleep(2500);
    await shot(page, 'f3-slope-in-the-3d-room.png');

    // ─── AND IT IS READ OFF THE GLASS, NOT JUDGED BY EYE ─────────────────
    //
    // `3d/Room.jsx` TRACES the wall's top edge through `lib/slopeLine.js
    // ceilingAt`, knee by knee, into a `THREE.Shape`. So the mesh's own
    // vertices ARE the ceiling line, and the question can be put to them
    // directly: how high is the wall at its left end, and at its right one.
    // In millimetres, because the geometry is in metres and a walk that
    // reported 2.5 would be reporting a number nobody in this project uses.
    const cut = await page.ask(
      '(() => { const v = window.__cc && window.__cc.views && window.__cc.views.room;'
      + ' if (!v) return null; let best = null;'
      + ' v.scene.traverse((g) => { if (!g.userData || g.userData.ccWall === undefined) return;'
      + '   g.traverse((o) => { if (!o.isMesh || !o.geometry || !o.geometry.attributes) return;'
      + '     const pos = o.geometry.attributes.position; if (!pos) return;'
      + '     if (best && pos.count <= best.count) return;'
      + '     best = { count: pos.count, pos }; }); });'
      + ' if (!best) return null; const p = best.pos;'
      + ' let minX = Infinity, maxX = -Infinity;'
      + ' for (let i = 0; i < p.count; i += 1) {'
      + '   minX = Math.min(minX, p.getX(i)); maxX = Math.max(maxX, p.getX(i)); }'
      + ' const span = maxX - minX; const near = span * 0.02;'
      + ' let left = -Infinity, right = -Infinity, top = -Infinity;'
      + ' for (let i = 0; i < p.count; i += 1) {'
      + '   const x = p.getX(i), y = p.getY(i); top = Math.max(top, y);'
      + '   if (x <= minX + near) left = Math.max(left, y);'
      + '   if (x >= maxX - near) right = Math.max(right, y); }'
      + ' const mm = (n) => Math.round(n * 1000);'
      + ' return { verts: p.count, width: mm(span), left: mm(left),'
      + '   right: mm(right), top: mm(top) }; })()',
    );
    check('the 3-D room has wall geometry to read', cut !== null, JSON.stringify(cut));

    if (cut) {
      // ONE END FULL HEIGHT, THE OTHER AT THE SLOPE'S START. That difference,
      // in the geometry the client is looking at, is the whole of F3.
      const cutsOneEnd = Math.abs(cut.left - cut.top) <= 5 && cut.right < cut.top - 100;
      check('the ceiling is cut on PART of the wall, not all of it', cutsOneEnd,
        `left ${cut.left} mm · right ${cut.right} mm · full ${cut.top} mm`);
      check('…and the right end is the 1800 that was typed',
        Math.abs(cut.right - 1800) <= 25, `${cut.right} mm`);
    }

    // ─── A RECESS, A WINDOW, AND TWO SLOPES WITH THE NOTE ─────────────────
    await openRoomEditor(page);
    await page.clickBox('[data-open-wall="0"]');
    await page.sleep(1400);

    // A RECESS lives in the PLAN view, because it sticks out of the wall.
    await page.clickBox('[data-wall-view-option="top"]');
    await page.sleep(900);
    await page.clickBox('[data-elevation-add="recess"]');
    await page.sleep(1400);
    const recessRow = await page.ask(
      '(() => { const rows = [...document.querySelectorAll("[data-elevation-row]")];'
      + ' const hit = rows.find((r) => /recess/i.test(r.textContent || ""));'
      + ' if (!hit) return null; const b = hit.getBoundingClientRect();'
      + ' return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }; })()',
    );
    if (recessRow) {
      await page.mouse('mouseMoved', recessRow.x, recessRow.y, { buttons: 0, clickCount: 0 });
      await page.mouse('mousePressed', recessRow.x, recessRow.y);
      await page.mouse('mouseReleased', recessRow.x, recessRow.y);
      await page.sleep(1200);
    }
    const recessWords = await page.text('[data-element-modal="recess"]');
    check('a recess asks Width, Depth and From the left',
      ['Width', 'Depth', 'From the left'].every((w) => recessWords.includes(w)),
      recessWords.replace(/\s+/g, ' ').slice(0, 80));
    await shot(page, 'f3-recess.png');
    await page.clickBox('[data-element-done="1"]');
    await page.sleep(900);

    // A WINDOW stands UP the wall, so it is the elevation's.
    await page.clickBox('[data-wall-view-option="front"]');
    await page.sleep(900);
    await page.clickBox('[data-elevation-add="window"]');
    await page.sleep(1300);
    const winRow = await page.ask(
      '(() => { const rows = [...document.querySelectorAll("[data-elevation-row]")];'
      + ' const hit = rows.find((r) => /window/i.test(r.textContent || ""));'
      + ' if (!hit) return null; const b = hit.getBoundingClientRect();'
      + ' return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }; })()',
    );
    if (winRow) {
      await page.mouse('mouseMoved', winRow.x, winRow.y, { buttons: 0, clickCount: 0 });
      await page.mouse('mousePressed', winRow.x, winRow.y);
      await page.mouse('mouseReleased', winRow.x, winRow.y);
      await page.sleep(1200);
    }
    const winWords = await page.text('[data-element-modal="window"]');
    check('a window asks Width, Height, From the left and Sill',
      ['Width', 'Height', 'From the left', 'Sill'].every((w) => winWords.includes(w)),
      winWords.replace(/\s+/g, ' ').slice(0, 90));
    await shot(page, 'f3-window.png');
    await page.clickBox('[data-element-done="1"]');
    await page.sleep(900);

    // TWO SLOPES ON ONE WALL: Flat steps aside and the note appears — the law
    // `lib/slopeFlat.js` owns, carried verbatim by the copy.
    await page.clickBox('[data-elevation-add="slope-left"]');
    await page.sleep(1400);
    const twoSlopes = await page.count('[data-elevation-kind="slope"]');
    const slopeRow = await page.ask(
      '(() => { const rows = [...document.querySelectorAll("[data-elevation-row]")];'
      + ' const hit = rows.find((r) => /slope/i.test(r.textContent || ""));'
      + ' if (!hit) return null; const b = hit.getBoundingClientRect();'
      + ' return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }; })()',
    );
    if (slopeRow) {
      await page.mouse('mouseMoved', slopeRow.x, slopeRow.y, { buttons: 0, clickCount: 0 });
      await page.mouse('mousePressed', slopeRow.x, slopeRow.y);
      await page.mouse('mouseReleased', slopeRow.x, slopeRow.y);
      await page.sleep(1200);
    }
    const note = await page.has('[data-slope-note="two-slopes"]');
    const flatGone = !(await page.has('[data-slope-flat="1"]'));
    check('two slopes on one wall, and Flat steps aside for the note',
      twoSlopes >= 2 && note && flatGone,
      `${twoSlopes} slopes · note=${note} · flat hidden=${flatGone}`);
    await shot(page, 'f3-two-slopes-and-the-note.png');
    await page.clickBox('[data-element-done="1"]');
    await page.sleep(800);

    // ─── ON THIS WALL, WITH TAKE IT OFF THE WALL ──────────────────────────
    const listed = await page.count('[data-elevation-row]');
    const remove = await page.count('[data-elevation-remove]');
    check('ON THIS WALL lists them, each with TAKE IT OFF THE WALL',
      listed > 0 && remove === listed, `${listed} rows, ${remove} remove buttons`);
  } finally {
    await page.close?.();
  }
}

// ═══ F4 · THE COLUMN STOPS SHOUTING ════════════════════════════════════════
//
// The owner named the fault as a SHAPE — *"rozwalone po całości … nie ma
// składu"* — so the answer is measured as a shape: how many lines YOUR SPACE
// takes, and how tall one setting is. The before/after is the same viewport at
// the same width, and the BEFORE is taken from `origin/main` by
// `t62-before.mjs`, not reconstructed.
if (runs('f4')) {
  process.stdout.write('\nF4 — THE COLUMN STOPS SHOUTING\n');
  const page = await open();
  try {
    await room(page, 'space');
    await shot(page, 'f4-your-space-after.png');

    // ─── THE SAME MEASUREMENT `t62-before.mjs` TOOK OF origin/main ────────
    //
    // The owner's complaint was a SHAPE and a SIZE — *"duże, rozwalone po
    // całości"* — so the pair of frames carries a pair of numbers rather than
    // an opinion. Identical code, identical viewport, the other build's on
    // port 4174 by way of a git worktree at `origin/main`.
    const shape = await page.ask(
      '(() => { const col = document.querySelector(\'[data-testid="column-options"]\');'
      + ' if (!col) return null;'
      + ' const panel = col.querySelector(".pbi-panel") || col;'
      + ' const lines = [...panel.querySelectorAll("span, p, label")]'
      + '   .filter((el) => (el.textContent || "").trim()'
      + '     && el.getBoundingClientRect().height > 0'
      + '     && ![...el.children].some((c) => (c.textContent || "").trim()));'
      + ' return { height: Math.round(panel.getBoundingClientRect().height),'
      + '   lines: lines.length, fields: panel.querySelectorAll("input").length,'
      + '   sliders: panel.querySelectorAll(\'input[type="range"]\').length }; })()',
    );
    process.stdout.write(`  ·   AFTER — YOUR SPACE: ${JSON.stringify(shape)}\n`);
    steps.push({ label: 'YOUR SPACE, measured', ok: true, detail: JSON.stringify(shape) });

    const rows = await page.count('[data-testid="column-options"] .pbi-field-row');
    check('every setting in YOUR SPACE is a row', rows > 0, `${rows} rows`);

    // ─── ONE HEIGHT FOR EVERY CONTROL, AND IT IS THE CHIP'S ───────────────
    //
    // CLAUDE.md: *"One height for every control in the column; nothing taller
    // than a chip row."* Measured on the CONTROLS, not on the rows that hold
    // them — a row is a control plus its own padding, and a law about controls
    // answered with a row height would be answered with the wrong number.
    const controls = await page.ask(
      '(() => { const sel = \'[data-testid="column-options"] .pbi-field-row-ctl\';'
      + ' const out = [];'
      + ' for (const box of document.querySelectorAll(sel)) {'
      + '   for (const el of box.querySelectorAll(".pbi-chip, .pbi-numfield, .pbi-field")) {'
      + '     out.push(Math.round(el.getBoundingClientRect().height)); } }'
      + ' return out; })()',
    );
    const one = new Set(controls || []);
    check('every control in the column is ONE height', controls.length > 0 && one.size === 1,
      `${controls.length} controls at ${[...one].join(', ')}px`);

    const rows2 = await page.ask(
      '(() => [...document.querySelectorAll(\'[data-testid="column-options"] .pbi-field-row\')]'
      + '  .map((r) => Math.round(r.getBoundingClientRect().height)))()',
    );
    check('…and no setting is more than one row tall',
      Math.max(...(rows2 || [0])) <= [...one][0] + 16,
      `rows ${JSON.stringify(rows2)} · control ${[...one][0]}px`);

    // THE RANGE IS NOT A PERMANENT LINE — it is in the input's title.
    const permanent = await page.count('[data-testid="column-options"] .pbi-numfield-scale');
    const title = await page.ask(
      '(document.querySelector(\'[data-testid="space-wall"]\')?.getAttribute("title") || "")',
    );
    check('the range lives in the title, not under the field',
      permanent === 0 && /\d+–\d+/.test(title), `${permanent} scale lines · title "${title}"`);

    // …AND IT COMES BACK AS A SENTENCE WHEN A VALUE IS REFUSED, and only then.
    const before = await page.count('[data-testid="space-wall-said"]');
    await page.type('[data-testid="space-wall"]', 99999);
    await page.sleep(900);
    const after = await page.count('[data-testid="space-wall-said"]');
    check('a refused value shows its sentence — and only then',
      before === 0 && after === 1, `${before} → ${after}`);
    await shot(page, 'f4-refused-value.png');
  } finally {
    await page.close?.();
  }
}

// ═══ F5 · NOT ONE SLIDER LEFT ══════════════════════════════════════════════
if (runs('f5')) {
  process.stdout.write('\nF5 — NOT ONE SLIDER LEFT\n');
  const page = await open();
  try {
    await room(page, 'layout');
    await page.click('[data-testid="layout-open-wardrobe"]');
    await page.sleep(1600);

    const sliders = await page.count('[data-testid="column-detail"] input[type="range"]');
    const fields = await page.count('[data-testid="column-detail"] .pbi-numfield');
    check('the wardrobe menu has no slider in it', sliders === 0, `${sliders} sliders`);
    check('…and its numbers are typed fields instead', fields > 0, `${fields} fields`);
    await shot(page, 'f5-detail-menu-no-slider.png');

    // AND NOWHERE ELSE ON THE PAGE EITHER.
    const anywhere = await page.count('input[type="range"]');
    check('not one range input anywhere in the design room', anywhere === 0, `${anywhere} on the page`);
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
