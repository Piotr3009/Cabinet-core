/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// CHAT-FIX 25.10.2026, THE WALK: THE FREE PANEL STUCK TO A SURFACE
//
// The owner, 25.10.2026: *"zebym ja mogl go przykleic do tej powierzchni
// jakiej chce"*, *"chce tez oblozyc boxy lub kominy tez prosze z odsunieciem
// od nich"*, *"naprzyklad bede chcial polozyc na szafkach jako daszek albo
// oblozyc komin w kacie"*.
//
// THE STAGE, through the page's own store (window.__cc.project): a 5000 x 3000
// room 2500 high, a chimney on wall 1 at x 2500 (600 wide, 350 deep), a BUD at
// x 600 widened to 800, a FREE_PANEL at x 3600. Then the store's
// `attachFreePanel` puts the panel ON the BUD (its top), IN FRONT OF the
// chimney, and BESIDE the BUD (its left side); the 3-D is shot after each, and
// the numbers the store holds are read back off the page into the README. The
// last frame selects the panel and shoots the right panel as it stands.
//
//   npx vite build                                  (dist/, from this tree)
//   npx vite preview --port 4173 --strictPort       (in the background)
//   CHROME_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome \
//     node scripts/chatfix-2510-attach-walk.mjs
//
// Frames and the README: verify/chatfix-2510/. Everything this file writes is
// plain ASCII (no em or en dash).

import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  open, pro, roomView, settleCamera, showroomDown,
} from './t74-harness.mjs';
import { until } from './t75-harness.mjs';

const REPO = new URL('..', import.meta.url).pathname;
const OUT = new URL('../verify/chatfix-2510/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
let head = '(unknown)';
try { head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO }).toString().trim(); } catch { /* not a repo */ }

const ascii = (t) => String(t)
  .replace(new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`, 'g'), '-')
  .replace(/[·]/g, '.')
  .replace(/[^\x09\x0a\x20-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
const j = (v) => JSON.stringify(v);
const S = 'window.__cc.project.getState()';
const UI = 'window.__cc.ui.getState()';
const log = (line) => process.stdout.write(`${ascii(line)}\n`);

const frames = [];
const readings = [];
let failures = 0;

/** The panel's stance and place, as the page's store holds it. */
const stanceOf = (page, id) => page.ask(`(() => { const u = ${S}.units.find((x) => x.id === ${j(id)}); if (!u) return null;
  return { wall: u.position.wall, x: u.position.x_mm, facing: u.params.panel_facing, tilt: u.params.panel_tilt_deg,
    mount: u.params.mount_height, inset: u.params.inset_back_mm || 0,
    box: { width: u.params.width, height: u.params.height, depth: u.params.depth } }; })()`);

async function frame(page, name, title, result, stance) {
  await page.sleep(1500);
  await page.screenshot(`${OUT}${name}`);
  frames.push({ name, title, result, stance });
  log(`FRAME ${name}: ${title}`);
  log(`      attach -> ${j(result)}`);
  log(`      store  -> ${j(stance)}`);
}

const page = await open({ width: 1440, height: 900 });
try {
  await pro(page, { base: BASE });
  log(`the build under the mouse: HEAD ${head}, ${BASE}`);

  // --- THE STAGE, through the store -------------------------------------------
  await page.ask(`(() => { const P = ${S}; P.setRoom({ corners: [{ x: 0, y: 0 }, { x: 5000, y: 0 }, { x: 5000, y: 3000 }, { x: 0, y: 3000 }], height: 2500 }); return true; })()`);
  const chimney = await page.ask(`${S}.addWallSlope({ kind: 'chimney', wall: 0, x_mm: 2500, width: 600, depth: 350 })`);
  const bud = await page.ask(`(() => { const r = ${S}.addUnit('BUD', { wall: 0, x: 600 }); return r && r.id; })()`);
  await page.ask(`${S}.updateUnitParams(${j(bud)}, { width: 800 })`);
  const panel = await page.ask(`(() => { const r = ${S}.addUnit('FREE_PANEL', { wall: 0, x: 3600 }); return r && r.id; })()`);
  await page.sleep(1200);
  const stageUnits = await page.ask(`${S}.units.map((u) => [u.type, u.params.unit_num, u.position.wall, u.position.x_mm, u.params.width, u.params.height, u.params.depth])`);
  const room = await page.ask(`(() => { const r = ${S}.project.room; return { height: r.height, corners: r.corners }; })()`);
  const slopes = await page.ask(`${S}.project.wallSlopes`);
  readings.push(['the room', room], ['the chimney (project.wallSlopes)', slopes], ['the units [type, number, wall, x, width, height, depth]', stageUnits]);
  log(`THE STAGE: units ${j(stageUnits)}; chimney ${j(slopes)}`);
  if (!bud || !panel || !chimney) throw new Error(`the stage did not stand: bud ${bud}, panel ${panel}, chimney ${chimney}`);

  const targets = await page.ask(`${S}.attachTargetsFor(${j(panel)}).map((t) => [t.key, t.label])`);
  readings.push(['attachTargetsFor(panel) [key, label]', targets]);
  log(`the surfaces offered: ${j(targets)}`);
  const before = await stanceOf(page, panel);
  readings.push(['the panel before any attach', before]);

  // The camera on the room preset, so the frames show the whole wall.
  await roomView(page);

  // --- 01: ON THE BUD'S TOP ("jako daszek") ----------------------------------
  const top = await page.ask(`${S}.attachFreePanel(${j(panel)}, ${j(`unit:${bud}:top`)}, { gap: 0 })`);
  const topStance = await stanceOf(page, panel);
  if (!top || !top.ok || topStance.mount !== 870 || topStance.x !== 600 || topStance.tilt !== 90) failures += 1;
  await frame(page, '01-top.png', 'the panel laid on the BUD\'s top, gap 0, from the room preset (expect: x 600, mount 870, tilt 90, along, box 800 x 18 x 400)', top, topStance);
  // The same, looked at from above (a real orbit drag, OrbitControls' own
  // gesture, on an empty pixel of the far wall: the harness's raycasting
  // `orbit` trips on this build), so the lid on the carcass can be seen; then
  // the preset again for the rest.
  await page.dragFromTo(150, 300, 150, 470, { steps: 20 });
  await settleCamera(page);
  await frame(page, '01b-top-from-above.png', 'the same lid on the BUD, the camera turned to look down on it', top, topStance);
  await roomView(page);

  // --- 02: IN FRONT OF THE CHIMNEY -------------------------------------------
  const front = await page.ask(`${S}.attachFreePanel(${j(panel)}, ${j(`obstacle:${chimney}:front`)}, { gap: 0 })`);
  const frontStance = await stanceOf(page, panel);
  if (!front || !front.ok || frontStance.x !== 2500 || frontStance.inset !== 340 || frontStance.tilt !== 0) failures += 1;
  await frame(page, '02-chimney-front.png', 'the panel stood in front of the chimney, gap 0 (expect: x 2500, inset 340, tilt 0, along)', front, frontStance);

  // --- 03: BESIDE THE BUD, ITS LEFT SIDE ---------------------------------------
  const left = await page.ask(`${S}.attachFreePanel(${j(panel)}, ${j(`unit:${bud}:left`)}, { gap: 0 })`);
  const leftStance = await stanceOf(page, panel);
  if (!left || !left.ok || leftStance.x !== 582 || leftStance.mount !== 0 || leftStance.facing !== 'across') failures += 1;
  await frame(page, '03-left-side.png', 'the panel stood on the BUD\'s left side, gap 0 (expect: x 582, mount 0, tilt 0, across, box 18 x 400 x 800)', left, leftStance);

  // --- 04: THE PANEL SELECTED, THE RIGHT PANEL AS IT STANDS ------------------
  const selected = await page.ask(`(() => { const ui = ${UI}; if (typeof ui.selectUnit !== 'function') return null; ui.selectUnit(${j(panel)}); return ${UI}.selectedUnitId; })()`);
  await until(page, 'Boolean(document.querySelector(\'[data-section="Attach"]\'))', 4000);
  const attachSection = await page.has('[data-section="Attach"]');
  const attachOptions = attachSection
    ? await page.ask('[...document.querySelectorAll(\'[data-attach-select="1"] option\')].map((o) => o.textContent.trim())')
    : null;
  readings.push(['the right panel: selectedUnitId', selected], ['the right panel: an Attach section on the page', attachSection], ['the Attach select\'s options', attachOptions]);
  await frame(page, '04-right-panel.png', `the panel selected (${selected === panel ? 'through ui.selectUnit' : 'selection failed'}); the right panel as it stands${attachSection ? ', the Attach section on it' : ', no Attach section yet'}`, { selected, attachSection }, leftStance);
} catch (e) {
  failures += 1;
  log(`FAIL the walk to its end: ${String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e)}`);
  await page.screenshot(`${OUT}walk-failure.png`).catch(() => {});
  frames.push({ name: 'walk-failure.png', title: 'the page when the walk stopped', result: String(e), stance: null });
}
const errors = page.errors.filter((e) => !/props\/manifest\.json|favicon|hardware-local|showroom|ERR_TUNNEL_CONNECTION_FAILED|supabase\.co|fonts\.g/i.test(e));
log(`console errors on the page: ${errors.length ? errors.slice(0, 3).join(' | ') : 'none'}`);
await page.close();
await showroomDown();

// --- THE README -------------------------------------------------------------
const md = [
  '# CHAT-FIX 25.10.2026: the free panel stuck to a surface (browser evidence)',
  '',
  `Walked ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC on HEAD ${head} plus the uncommitted work, against ${BASE} (dist/ built from this tree), by scripts/chatfix-2510-attach-walk.mjs. The stage and every attach went through the page's own store (window.__cc.project); the numbers below are read back from that store after each step.`,
  '',
  'The owner, 25.10.2026: "zebym ja mogl go przykleic do tej powierzchni jakiej chce", "chce tez oblozyc boxy lub kominy tez prosze z odsunieciem od nich", "3 nie jedzie", "naprzyklad bede chcial polozyc na szafkach jako daszek albo oblozyc komin w kacie".',
  '',
  '## The stage',
  '',
  '- Room 5000 x 3000, height 2500 (wall 1 runs along y = 0).',
  '- Chimney on wall 1 at x 2500, 600 wide, 350 deep (addWallSlope).',
  '- BUD at x 600, widened to 800 (legs 100 + carcass 770: top at 870).',
  '- FREE_PANEL at x 3600: 800 long, 400 wide, 18 thick, along the wall, upright, on the floor.',
  '',
  '## The frames',
  '',
  ...frames.flatMap((f) => [
    `### ${f.name}`,
    '',
    f.title,
    '',
    `- attach result: \`${j(f.result)}\``,
    f.stance ? `- the panel in the store: \`${j(f.stance)}\`` : '- the panel in the store: (not read)',
    '',
  ]),
  '## Readings off the page',
  '',
  ...readings.flatMap(([what, value]) => [`- ${what}:`, '', '```json', JSON.stringify(value, null, 2), '```', '']),
  `Console errors on the page: ${errors.length ? errors.slice(0, 3).join(' | ') : 'none'}.`,
  '',
  `Result: ${failures ? `${failures} step(s) did not match the expected numbers (see above)` : 'every attach landed on the expected numbers'}.`,
  '',
].join('\n');
writeFileSync(`${OUT}README.md`, ascii(md));
log(`README: ${OUT}README.md; frames ${frames.map((f) => f.name).join(', ')}; ${failures ? `${failures} FAIL` : 'all expected numbers met'}`);
process.exit(failures ? 1 : 0);
