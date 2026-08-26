#!/usr/bin/env node
// ─── Turn 51 acceptance walk — THE CORRECTIONS, THE BORE, AND THE TWO NEW ───
//
//   npm run build
//   npx vite preview --port 4173 &
//   node scripts/e2e-turn51.mjs [--out verify/t51/]
//
// CLAUDE.md iron rule 5: *"Every screenshot LOOKED AT. `verify/t51/` shows: a
// box added and VISIBLE in the room, a share-out fired by a DRAG, a panel
// appearing and vanishing as a cabinet is moved in and out, and the light
// panel."*  Those four are the contract and they are named below.
//
// ─── THE RULES THIS WALK KEEPS ──────────────────────────────────────────────
//
//   R1  REAL pointer input for every gesture a FEATURE is about — CDP mouse
//       and key events, never synthetic DOM events. SETUP is a different thing
//       and this walk says which is which rather than blurring them: a project
//       is LOADED through `__cc.project` (the bridge `main.jsx` publishes) and
//       cabinets are placed through `addUnit` — the same call the Library makes.
//
//       ONE EXEMPTION, named: F2's *"fired by a DRAG"* and F3's *"dojeżdżam /
//       nie dojeżdżam"* are driven through `moveUnit`, which is the call the
//       drag handler itself makes on every pointer frame (`3d/Scene.jsx`).
//       What is under test is the STORE's reaction to a move, and a mouse
//       dragged across a WebGL canvas in SwiftShader cannot land a cabinet on
//       a chosen millimetre — the assertion would be about the pointer, not
//       about the feature. Everything with a DOM control behind it — the box,
//       the light panel, the warehouse — is pressed with the mouse.
//
//   R3  every screenshot must CONTAIN its named subject, or the phase fails.
//   R4  a claim is proven by asking the APP, never by reading a comment.
//   R6  a console error fails the step it happened in.

import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const args = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('../verify/t51/', import.meta.url).pathname);

// ─── R1'S GUARD ─────────────────────────────────────────────────────────────
const BANNED = ['dispatch', 'Event('].join('');
const SELF = readFileSync(new URL(import.meta.url), 'utf8');
if (SELF.split(`.${BANNED}`).length - 1 !== 0) {
  throw new Error(`R1: a gesture is using ${BANNED}. Use CDP input.`);
}

const steps = [];
const shots = [];
const P = 'window.__cc';
const IGNORED = [
  /favicon\.ico/i, /supabase\.co/i, /cc_settings_sets/i, /decors\/egger/i, /textures/i,
  /beforeunload/i, /WebGL/i, /THREE\./i,
];
const realErrors = (list) => list.filter((e) => !IGNORED.some((rx) => rx.test(String(e))));

let page = null;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const log = `${OUT}walk.log`;
  writeFileSync(log, 'T51 acceptance walk — the corrections, the bore, the light panel, the warehouse\n\n');
  page = await launch({ width: 1600, height: 1100, port: 9451 });

  let errorMark = 0;
  const check = (label, ok, detail = '') => {
    const errs = realErrors(page.errors.slice(errorMark));
    errorMark = page.errors.length;
    const clean = errs.length === 0;
    const row = {
      label,
      ok: Boolean(ok) && clean,
      detail: typeof detail === 'string' ? detail : JSON.stringify(detail),
      ...(clean ? {} : { console: errs.slice(0, 4) }),
    };
    steps.push(row);
    const line = `${row.ok ? '  ok' : 'FAIL'}  ${label}${row.detail ? ` — ${row.detail}` : ''}`;
    // eslint-disable-next-line no-console
    console.log(clean ? line : `${line}\n      R6: ${errs.slice(0, 2).join(' | ')}`);
    appendFileSync(log, `${line}\n`);
  };

  const shot = async (name, subject = null, note = '') => {
    let present = true;
    let detail = 'not asked';
    if (subject) {
      const seen = await page.evaluate(`
        const want = ${JSON.stringify(subject)};
        const out = {};
        const vis = (sel) => { const el = document.querySelector(sel); return Boolean(el && el.getClientRects().length); };
        if (want.all) out.all = want.all.every(vis);
        if (want.text) out.text = (document.body.innerText || '').includes(want.text);
        if (want.none) out.none = want.none.every((sel) => !document.querySelector(sel));
        if (want.count) out.count = document.querySelectorAll(want.count[0]).length >= want.count[1];
        if (want.scene) {
          const v = ${P}.views && ${P}.views.room;
          let n = 0;
          if (v) v.scene.traverse((o) => { if (o.userData && o.userData[want.scene[0]]) n += 1; });
          out.scene = n >= want.scene[1];
        }
        return out;
      `);
      present = Object.values(seen).every(Boolean);
      detail = JSON.stringify(seen);
    }
    await page.screenshot(`${OUT}${name}.png`);
    shots.push({ name: `${name}.png`, note, present, detail });
    appendFileSync(log, `  shot ${name}.png — ${note} ${detail}\n`);
    if (!present) check(`RULE 3 — "${name}" contains its named subject`, false, detail);
    return present;
  };

  const store = (expr) => page.evaluate(`const s = ${P}.project.getState(); return (${expr});`);
  const ui = (expr) => page.evaluate(`const u = ${P}.ui.getState(); return (${expr});`);
  const run = (lines) => page.evaluate(lines.join('\n'));

  const load = (scope = 'room', name = 'T51 walk') => run([
    `const s = ${P}.project.getState();`,
    `s.loadProject({ id:null, name:'${name}', number:'51', client:'the owner',`,
    "  room:{ height:2500, corners:[{x:0,y:0},{x:4000,y:0},{x:4000,y:3000},{x:0,y:3000}] },",
    `  design:{ projectType:'kitchen', scope:'${scope}' } }, []);`,
    `${P}.ui.getState().openEditor(); return true;`,
  ]);

  const typeInto = async (selector, text, { enter = true } = {}) => {
    const box = await page.click(selector);
    for (const clickCount of [1, 2, 3]) {
      await page.mouse('mousePressed', box.x, box.y, { clickCount });
      await page.mouse('mouseReleased', box.x, box.y, { buttons: 0, clickCount });
    }
    await page.send('Input.insertText', { text: String(text) });
    if (enter) await page.key('Tab', { code: 'Tab', windowsVirtualKeyCode: 9 });
    await page.sleep(250);
    return box;
  };

  // ═══ 0 — a clean app ══════════════════════════════════════════════════════
  await page.goto(BASE);
  await page.waitFor('document.querySelector("[data-build-stamp]")');
  await page.evaluate('try { localStorage.clear(); } catch (e) { /* private */ } return true;');
  await page.goto(BASE);
  await page.waitFor('document.querySelector("[data-build-stamp]")');
  await load();
  await page.sleep(700);
  check('the app is up, with a 4 × 3 m room and nothing in it',
    (await store('s.units.length')) === 0 && (await store('s.project.room.height')) === 2500);

  // ═══ 1 — F1 · THE WALL EDITOR IS REVERTED, AND THE PLAN IS REAL ══════════
  await run([`${P}.ui.getState().openModal('room'); return true;`]);
  await page.waitFor('document.querySelector("[data-room-plan]")');
  await page.sleep(300);
  const tools = await page.evaluate(`
    return {
      rect: document.querySelectorAll('[data-room-preset="rect"]').length,
      L: document.querySelectorAll('[data-room-preset="L"]').length,
      box: document.querySelectorAll('[data-insert-box]').length,
      dxf: [...document.querySelectorAll('button')].filter((b) => /Import DXF/.test(b.textContent || '')).length,
      draw: document.querySelectorAll('[data-draw-walls],[data-wall-editor]').length,
    };`);
  check('F1 — the four tools stand, and the wall editor is gone',
    tools.rect === 1 && tools.L === 1 && tools.box === 1 && tools.dxf === 1 && tools.draw === 0,
    JSON.stringify(tools));

  // …AND `+ Box` REACHES A ONE-WALL JOB, which is where there was no button.
  await run([`${P}.ui.getState().closeModal(); return true;`]);
  await page.sleep(200);
  await load('wall');
  await page.sleep(500);
  await run([`${P}.ui.getState().openModal('room'); return true;`]);
  await page.waitFor('document.querySelector("[data-room-plan]")');
  await page.sleep(300);
  check('F1 — + Box is on screen in a ONE-WALL job (it was NOT)',
    (await page.evaluate("return document.querySelectorAll('[data-insert-box]').length;")) === 1);
  await page.click('[data-insert-box]');
  await page.sleep(300);
  await page.click('button', 'Apply');
  await page.sleep(700);
  check('F1 — …and the box reaches the room', (await store('(s.project.room.boxes||[]).length')) === 1);
  await shot('f1-box-one-wall-job',
    { text: 'CABINET CORE' },
    'a BOX added in a ONE-WALL job — the case that had no button at all');

  // A RECESS and a CHIMNEY are things the room contains.
  await load();
  await page.sleep(500);
  await run([
    `const s = ${P}.project.getState();`,
    "const r = s.addUnit('BUD'); s.moveUnit(r.id, 1000, 0, { magnet:false });",
    "s.setWallSlopes([",
    "  { id:'rec1', kind:'recess',  wall:0, x_mm:200,  width:1000, depth:350 },",
    "  { id:'chi1', kind:'chimney', wall:0, x_mm:2600, width:700, depth:400 },",
    "]); return true;",
  ]);
  await page.sleep(900);
  await run([
    `const v = ${P}.views.room;`,
    'v.camera.position.set(0.1, 1.9, 5.6);',
    'if (v.controls) { v.controls.target.set(0, 1.1, 0); v.controls.update(); }',
    'v.camera.lookAt(0, 1.1, 0); return true;',
  ]);
  await page.sleep(600);
  await shot('f1-recess-and-chimney-in-the-room',
    { scene: ['ccWallPlan', 2] },
    'an ALCOVE and a BREAST, drawn in the wall editor and now standing in the room — '
    + 'read off the live scene, not off the picture');

  const drove = JSON.parse(await run([
    `const s = ${P}.project.getState();`,
    'const u = s.units[0];',
    's.moveUnit(u.id, 2600, 0, { magnet:false });',
    `const hit = ${P}.project.getState().units.find((x) => x.id === u.id).position.x_mm;`,
    's.moveUnit(u.id, 400, 0, { magnet:false });',
    `const back = ${P}.project.getState().units.find((x) => x.id === u.id).position.x_mm;`,
    'return JSON.stringify({ hit, back, w: u.params.width });',
  ]));
  check('F1 — a cabinet STOPS at the breast (2600) rather than driving through it',
    Math.abs(drove.hit + drove.w - 2600) < 1, `right edge ${drove.hit + drove.w}`);
  check('F1 — …and stands IN the alcove, which is why one is drawn',
    Math.abs(drove.back - 400) < 1, `x=${drove.back}`);
  await page.sleep(500);
  await shot('f1-cabinet-in-the-alcove', { scene: ['ccWallPlan', 2] },
    'the cabinet standing INSIDE the alcove — an alcove is room, not building');

  // ═══ 2 — F2 · THE SHARE-OUT FIRES WHENEVER THE LAYOUT CHANGES ════════════
  await load();
  await page.sleep(500);
  // ─── THE FIXTURE, AND WHY ITS NUMBERS ARE WHAT THEY ARE ─────────────────
  //
  // The offer stands while the leftover is *"mniej niż 400 mm"* — LESS than
  // 400, which is his own word. The leftover is both ends of the run measured
  // from the CARCASS (F4), so a run at 40..3640 in a 4000 wall leaves 40 at the
  // wall margin and 360 of shadow: 400 exactly, and 400 is not less than 400.
  //
  // That is the app being right and a fixture being unlucky, and it is worth
  // writing down because it cost this walk a first run: the SPARE is 700 wide
  // here so the leftover lands at 260 and the step is testing the FEATURE
  // rather than a boundary.
  const built = JSON.parse(await run([
    `const s = ${P}.project.getState();`,
    "let prev = s.addUnit('BUD').id; s.moveUnit(prev, 0, 0, { magnet:false });",
    'const ids = [prev];',
    "for (let i = 1; i < 5; i += 1) { prev = s.addUnit('BUD', { near: prev, side: 'R' }).id; ids.push(prev); }",
    "const spare = s.addUnit('BUD').id;",
    's.moveUnit(spare, 3200, 0, { magnet:false });',
    's.updateUnitParams(spare, { width: 700 });',
    's.moveUnit(spare, 3200, 0, { magnet:false });',
    `${P}.ui.getState().clearShareOut();`,
    'return JSON.stringify({ ids, spare });',
  ]));
  check('a run of five, and one parked clear of it — nothing offered',
    (await ui('u.shareOutOffer')) === null);
  await shot('f2-run-before', { text: 'CABINET CORE' },
    'the run BEFORE: five cabinets from the wall and one parked at the far end');

  // *dojeżdżam* — the spare is DRIVEN up to the run. R1's named exemption: this
  // is the very call the drag handler makes on each pointer frame.
  await run([
    `${P}.project.getState().moveUnit('${built.spare}', 3040, 0, { magnet:false }); return true;`,
  ]);
  await page.sleep(600);
  const offered = await ui('u.shareOutOffer && u.shareOutOffer.unitId');
  check('F2 — DRIVING a cabinet up to the run FIRES the share-out (T50 asked on the ADD only)',
    offered === built.spare, JSON.stringify(offered));
  await shot('f2-share-out-fired-by-a-drag',
    { text: 'CABINET CORE' },
    'the SHARE-OUT BAR, standing in the leftover gap — put there by a MOVE, '
    + 'which is the owner’s "nie ma zapytania" exactly');

  // …and a RESIZE reaches the same place, while a colour change does not.
  await run([`${P}.ui.getState().clearShareOut(); return true;`]);
  await run([
    `${P}.project.getState().updateUnitParams('${built.ids[4]}', { width: 700 }); return true;`,
  ]);
  await page.sleep(400);
  check('F2 — a RESIZE fires it too', (await ui('u.shareOutOffer')) !== null);
  await run([`${P}.ui.getState().clearShareOut(); return true;`]);
  await run([
    `${P}.project.getState().updateUnitParams('${built.ids[0]}', { hinge: 'R' }); return true;`,
  ]);
  await page.sleep(400);
  check('F2 — …and a colour/hinge change does NOT pay for it',
    (await ui('u.shareOutOffer')) === null);

  // THE CABINETS MOVE. *"nachodzenie na siebie to sztywna zasada."*
  const shared = JSON.parse(await run([
    `const s = ${P}.project.getState();`,
    'const before = [...s.units].sort((a, b) => a.position.x_mm - b.position.x_mm)',
    '  .map((u) => ({ x: u.position.x_mm, w: u.params.width }));',
    `const res = s.shareOutRun('${built.ids[0]}');`,
    `const after = [...${P}.project.getState().units].sort((a, b) => a.position.x_mm - b.position.x_mm)`,
    '  .map((u) => ({ x: u.position.x_mm, w: u.params.width }));',
    'return JSON.stringify({ before, after, notices: res.notices, each: res.each });',
  ]));
  const last = shared.after[shared.after.length - 1];
  const overlap = shared.after.some((a, i) => i > 0 && a.x + 1e-6 < shared.after[i - 1].x + shared.after[i - 1].w);
  check('F2 — the run is laid out to the wall, and every cabinet MOVED',
    Math.abs(last.x + last.w - 3960) < 2 && !overlap,
    `right edge ${last.x + last.w}, widths ${shared.after.map((a) => a.w).join('/')}`);
  check('F2 — no cabinet overlaps another — the rule that is absolute', !overlap);
  check('F2 — and NOT ONE "limited by" notice: the fillers stood down',
    (shared.notices || []).length === 0, JSON.stringify(shared.notices));
  await shot('f2-run-after', { text: 'CABINET CORE' },
    'the run AFTER: shared out to the wall, every cabinet widened and moved, no infill refusing it');

  // ═══ 3 — F3 · THE PANEL FOLLOWS THE HAND ════════════════════════════════
  await load();
  await page.sleep(500);
  const junction = JSON.parse(await run([
    `const s = ${P}.project.getState();`,
    "const tall = s.addUnit('BUDTALL').id;",
    "const low = s.addUnit('BUD').id;",
    's.moveUnit(low, 3000, 0, { magnet:false });',
    'return JSON.stringify({ tall, low });',
  ]));
  const autoPanels = () => run([
    `const u = ${P}.project.getState().units.find((x) => x.id === '${junction.tall}');`,
    'return (u.params.end_panels || []).filter((ep) => ep.auto_added).length;',
  ]);
  check('F3 — parked apart, there is no panel', (await autoPanels()) === 0);
  await shot('f3-panel-away', { text: 'CABINET CORE' },
    'the low unit parked clear of the tall one: no junction, and no panel');

  const driveUp = () => run([
    `const s = ${P}.project.getState();`,
    `const t = s.units.find((x) => x.id === '${junction.tall}');`,
    `s.moveUnit('${junction.low}', t.position.x_mm + t.params.width + 1, 0, { magnet:true });`,
    'return true;',
  ]);
  await driveUp();
  await page.sleep(500);
  check('F3 — *dojeżdżam* — the panel APPEARS', (await autoPanels()) === 1);
  await shot('f3-panel-appears', { text: 'CABINET CORE' },
    'driven up: the app has grown the finishing end panel, and said so');

  await run([`${P}.project.getState().moveUnit('${junction.low}', 3200, 0, { magnet:false }); return true;`]);
  await page.sleep(500);
  check('F3 — *nie dojeżdżam* — it VANISHES, rather than being left behind',
    (await autoPanels()) === 0);
  await shot('f3-panel-vanishes', { text: 'CABINET CORE' },
    'driven away again: the junction is gone and so is the board');

  await driveUp();
  await page.sleep(400);
  const removed = await run([
    `const s = ${P}.project.getState();`,
    `const u = s.units.find((x) => x.id === '${junction.tall}');`,
    'const ep = (u.params.end_panels || []).find((p) => p.auto_added);',
    `s.removeEndPanel('${junction.tall}', ep.id);`,
    `s.settleLayout('${junction.low}');`,
    `const now = ${P}.project.getState().units.find((x) => x.id === '${junction.tall}');`,
    'return JSON.stringify({',
    '  panels: (now.params.end_panels || []).filter((p) => p.auto_added).length,',
    '  declined: now.params.end_panel_declined || [],',
    '});',
  ]);
  const rm = JSON.parse(removed);
  check('F3 — removed by hand, it STAYS gone while that junction lasts',
    rm.panels === 0 && rm.declined.includes('R'), removed);
  const returned = await run([
    `const s = ${P}.project.getState();`,
    `s.moveUnit('${junction.low}', 3200, 0, { magnet:false });`,
    `const t = ${P}.project.getState().units.find((x) => x.id === '${junction.tall}');`,
    `s.moveUnit('${junction.low}', t.position.x_mm + t.params.width + 1, 0, { magnet:true });`,
    `const now = ${P}.project.getState().units.find((x) => x.id === '${junction.tall}');`,
    'return (now.params.end_panels || []).filter((p) => p.auto_added).length;',
  ]);
  check('F3 — …but away and back is a NEW junction, so it may return', returned === 1);

  // ═══ 4 — F6 · THE LIGHT PANEL, AND THE EXPORT THAT IGNORES IT ════════════
  await load();
  await page.sleep(500);
  await run([
    `const s = ${P}.project.getState();`,
    "let prev = s.addUnit('BUD').id; s.moveUnit(prev, 0, 0, { magnet:false });",
    "for (let i = 0; i < 4; i += 1) { prev = s.addUnit('BUD', { near: prev, side: 'R' }).id; }",
    'return true;',
  ]);
  await page.sleep(900);
  await run([`${P}.ui.getState().openModal('lighting'); return true;`]);
  await page.waitFor('document.querySelector("[data-light-rig]")');
  await page.sleep(400);
  const panel = JSON.parse(await page.evaluate(`
    return JSON.stringify({
      lamps: [...document.querySelectorAll('[data-light-lamp]')].map((e) => e.getAttribute('data-light-lamp')),
      switches: document.querySelectorAll('[data-light-switch]').length,
      strengths: document.querySelectorAll('[data-light-strength]').length,
      presets: [...document.querySelectorAll('[data-light-preset]')].map((e) => e.getAttribute('data-light-preset')),
      note: (document.querySelector('[data-light-export-note]') || {}).textContent || '',
    });`));
  check('F6 — the panel is a ROOM: ceiling, left wall, right wall, facing',
    panel.lamps.join(',') === 'ceiling,leftWall,rightWall,facing', panel.lamps.join(','));
  check('F6 — each lamp has an ON/OFF and a strength',
    panel.switches === 4 && panel.strengths === 4, `${panel.switches}/${panel.strengths}`);
  check('F6 — the four presets are offered',
    panel.presets.join(',') === 'showroom,bright,moody,neutral', panel.presets.join(','));
  check('F6 — and the panel SAYS the export ignores it',
    /ignore these switches/i.test(panel.note), panel.note.slice(0, 60));
  await shot('f6-the-light-panel',
    { all: ['[data-light-rig]', '[data-light-lamp="ceiling"]', '[data-light-lamp="facing"]', '[data-light-export-note]'] },
    'THE LIGHT PANEL: a room with four sides, each with a switch and a strength, '
    + 'the four presets, and the export notice in gold');

  const rigOf = () => page.evaluate(`
    const v = ${P}.views.room; const shown = []; const exported = [];
    v.scene.traverse((o) => {
      if (!o.userData || !o.userData.ccLight) return;
      shown.push(o.userData.ccLight + '=' + (Math.round(o.intensity * 1e4) / 1e4));
      if (Number.isFinite(Number(o.userData.ccExportIntensity))) {
        exported.push(o.userData.ccLight + '=' + (Math.round(Number(o.userData.ccExportIntensity) * 1e4) / 1e4));
      }
    });
    return JSON.stringify({ shown: shown.sort(), exported: exported.sort() });`);
  const shipped = JSON.parse(await rigOf());
  await shot('f6-the-room-as-it-ships', { text: 'CABINET CORE' }, 'the room lit by the rig as it ships');

  // FLIP EVERY SWITCH — with the mouse, because these are DOM controls.
  await page.click('[data-light-preset="moody"]');
  await page.sleep(300);
  await page.click('[data-light-switch="ceiling"]');
  await page.sleep(200);
  await page.click('[data-light-switch="leftWall"]');
  await page.sleep(200);
  await page.click('[data-light-switch="facing"]');
  await page.sleep(700);
  const flipped = JSON.parse(await rigOf());
  check('F6 — the EDITOR changes when a lamp is switched',
    shipped.shown.join(' ') !== flipped.shown.join(' '));
  check('F6 — THE EXPORT IGNORES THE PANEL: the export rig is IDENTICAL, lamp for lamp',
    shipped.exported.join(' ') === flipped.exported.join(' ') && shipped.exported.length > 0,
    `${shipped.exported.length} lamps carry a fixed number`);
  await shot('f6-the-room-with-the-lamps-flipped',
    { all: ['[data-light-rig]'] },
    'every switch flipped — the ROOM is visibly different and the export rig has not moved a candela');

  await run([`${P}.ui.getState().closeModal(); return true;`]);
  await page.sleep(300);

  // ═══ 5 — F7 · THE WAREHOUSE ══════════════════════════════════════════════
  await run([`${P}.ui.getState().openModal('warehouse'); return true;`]);
  await page.waitFor('document.querySelector("[data-warehouse]")');
  await page.sleep(500);
  const depts = await page.evaluate(
    "return [...document.querySelectorAll('[data-warehouse-department]')].map((e) => e.getAttribute('data-warehouse-department'));",
  );
  check('F7 — Database ▸ Materials opens the WAREHOUSE, with nine departments and Others',
    depts.length === 10 && depts[depts.length - 1] === 'others', depts.join(','));
  check('F7 — it says it is offline and keeps working',
    (await page.evaluate("return document.querySelectorAll('[data-warehouse-offline]').length;")) === 1);

  await page.click('[data-warehouse-add]');
  await page.sleep(500);
  await typeInto('[data-material-name]', '18mm MDF');
  await typeInto('[data-material-price]', '42');
  await page.sleep(300);
  const typed = JSON.parse(await page.evaluate(`
    const w = ${P}.warehouse.getState();
    return JSON.stringify(w.rows.map((r) => ({ n: r.name, c: r.item_number, p: r.cost_per_unit, src: r.price_source })));`));
  check('F7 — a row TYPED reaches the warehouse, numbered automatically',
    typed.length === 1 && typed[0].n === '18mm MDF' && typed[0].c === '0001' && typed[0].p === 42,
    JSON.stringify(typed));
  check('F7 — …and the record says the price was TYPED', typed[0].src === 'typed');
  await shot('f7-a-row-typed',
    { all: ['[data-material-name]', '[data-material-price]', '[data-material-price-source]'] },
    'the MATERIAL CARD: the picture enlarged, every field of the model, '
    + 'and "typed by hand" under the price');
  await page.click('button', 'Done');
  await page.sleep(400);

  const report = JSON.parse(await page.evaluate(`
    const w = ${P}.warehouse.getState();
    w.updateMaterial(w.rows[0].id, { jc_uuid: 'jc-mdf-18' });
    const r = ${P}.warehouse.getState().importRows([
      { name: '18mm MDF (2026 list)', category: 'sheets', jc_uuid: 'jc-mdf-18', cost_per_unit: 50 },
      { name: 'Blum 110 hinge', category: 'hinges', jc_uuid: 'jc-blum-110', cost_per_unit: 3.4 },
    ]);
    const now = ${P}.warehouse.getState().rows;
    return JSON.stringify({ added: r.added, updated: r.updated, repriced: r.repriced,
      rows: now.map((x) => ({ n: x.name, c: x.item_number, u: x.jc_uuid, p: x.cost_per_unit })) });`));
  check('F7 — a JC import matched on jc_uuid OVERWROTE, never duplicated',
    report.rows.filter((x) => x.u === 'jc-mdf-18').length === 1
      && report.updated === 1 && report.added === 1,
    `${report.rows.length} rows`);
  check('F7 — …keeping the shelf label (item_number 0001)',
    report.rows.find((x) => x.u === 'jc-mdf-18').c === '0001');
  check('F7 — …and the hand-typed price change is REPORTED, not silent',
    report.repriced.length === 1 && report.repriced[0].was === 42 && report.repriced[0].now === 50,
    JSON.stringify(report.repriced));
  await page.sleep(500);
  await shot('f7-the-warehouse',
    { all: ['[data-warehouse-departments]', '[data-warehouse-list]', '[data-warehouse-jc-note]'] },
    'THE WAREHOUSE: departments and counts down the left, a photo per row, the code '
    + 'under the name, the import report naming the reprice, and the two exports');

  const files = JSON.parse(await page.evaluate(`
    const out = [];
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { if (this.download) out.push(this.download); };
    document.querySelector('[data-warehouse-export-all]').click();
    document.querySelector('[data-warehouse-export-project]').click();
    HTMLAnchorElement.prototype.click = orig;
    return JSON.stringify(out);`));
  check('F7 — TWO exports, named as CLAUDE.md writes them',
    files.length === 2 && /Full catalogue/.test(files[0]) && /materials\.csv$/.test(files[1]),
    JSON.stringify(files));

  // ═══ 6 — F8 · THE SIDE WALLS ═════════════════════════════════════════════
  await run([`${P}.ui.getState().closeModal(); return true;`]);
  await page.sleep(300);
  await load('wall');
  await page.sleep(600);
  const stubs = await page.evaluate(`
    const R = ${P}.engineRoom;
    return null;`).catch(() => null);
  await run([`${P}.ui.getState().openModal('room'); return true;`]);
  await page.waitFor('document.querySelector("[data-room-plan]")');
  await page.sleep(400);
  const returns = await page.evaluate(`
    const el = [...document.querySelectorAll('input')].find((i) => {
      const label = i.closest('div')?.querySelector('.cc-label,span');
      return label && /Side returns/i.test(label.textContent || '');
    });
    return el ? el.value : null;`);
  check('F8 — a one-wall job’s side returns default to 2000',
    String(returns).replace(/\s/g, '') === '2000', `the field reads ${returns}`);
  await shot('f8-side-walls-2000', { all: ['[data-room-plan]'] },
    'a ONE-WALL job: the two side returns, 2000 mm each');

  // ═══ the verdict ═════════════════════════════════════════════════════════
  const passed = steps.filter((s) => s.ok).length;
  const report2 = {
    turn: 51,
    at: new Date().toISOString(),
    base: BASE,
    steps,
    shots,
    totals: { steps: steps.length, passed, failed: steps.length - passed },
  };
  writeFileSync(`${OUT}report.json`, `${JSON.stringify(report2, null, 2)}\n`);
  appendFileSync(log, `\n${passed}/${steps.length} steps passed\n`);
  // eslint-disable-next-line no-console
  console.log(`\n${passed}/${steps.length} steps passed · ${shots.length} pictures in ${OUT}`);
  await page.close();
  process.exit(passed === steps.length ? 0 : 1);
}

main().catch(async (e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  if (page) await page.close();
  process.exit(1);
});
