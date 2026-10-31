/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T86B F9 · THE SCENE PROBE: the owner's Corner L opened through the app's own
// "Open from file" on the built app, every mesh of the unit read back into the
// unit's frame (scripts/t74-harness.mjs localBox) and set against the engine's
// boxes. The owner, 30.10.2026: *"wychodzi na to ze dziala CNC ale nie dziala
// 3D, tak?"*
//
// Run from the repo root with a preview up: `node verify/t86b/probe-f09-scene.mjs
// <base url> <tag>`; writes verify/t86b/f09-<tag>-*.png and prints the table.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { open, localBox, settleCamera } from '../../scripts/t74-harness.mjs';
import { computeCabinet } from '../../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { paramsForEngine } from '../../src/stores/projectStore.js';

const BASE = process.argv[2] || 'http://127.0.0.1:4173/';
const TAG = process.argv[3] || 'before';
const OWNER = JSON.parse(readFileSync(new URL('./owner.ccproject', import.meta.url), 'utf8'));
const GAP = P.room.wallBackClearance;

/** A file of the owner's with its units replaced (the room and design kept). */
function fileWith(units, name) {
  const f = structuredClone(OWNER);
  f.units = units;
  const dir = join(tmpdir(), `t86b-f09-${process.pid}`);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${name}.ccproject`);
  writeFileSync(path, JSON.stringify(f));
  return path;
}

const left = structuredClone(OWNER.units[0]);
const right = structuredClone(OWNER.units[0]);
right.id = 'u_t86b_right';
right.params.corner_side = 'right';
right.params.unit_num = 'CX02';
right.position = { ...right.position, x_mm: 4000 - GAP - Number(right.params.width) };

const CASES = [
  { tag: 'left', label: "the owner's file as saved (one left L)", units: [left] },
  { tag: 'right', label: "the same file with corner_side 'right'", units: [right] },
  { tag: 'two', label: 'the owner\'s room: a right L, then the left one (his screenshot)', units: [right, left] },
];

const r1 = (v) => Math.round(v * 10) / 10;

function engineBoxes(unit) {
  const r = computeCabinet(paramsForEngine(unit, OWNER.project.design), P);
  return Object.fromEntries(r.panels.map((p) => [p.id, p.box]));
}

/** The drawn box stands in the engine's: through the board exactly, along its faces within one board (a tab). */
function verdict(e, g) {
  const want = { x: [e.x, e.x + e.w], y: [e.y, e.y + e.h], z: [e.z, e.z + e.d] };
  const thin = ['x', 'y', 'z'].reduce((m, a) => ((want[a][1] - want[a][0]) < (want[m][1] - want[m][0]) ? a : m), 'x');
  for (const a of ['x', 'y', 'z']) {
    const [w0, w1] = want[a]; const [g0, g1] = g[a];
    if (a === thin ? (Math.abs(g0 - w0) > 0.6 || Math.abs(g1 - w1) > 0.6)
      : (g0 > w0 + 0.6 || g1 < w1 - 0.6 || g0 < w0 - 18.6 || g1 > w1 + 18.6)) return 'FAIL';
  }
  return 'PASS';
}

async function openFile(page, path) {
  await page.send('DOM.enable');
  await page.send('Page.setInterceptFileChooserDialog', { enabled: true });
  // The start screen's own button, a real click; the app makes its input and clicks it.
  if (await page.has('[data-open-from-file]')) {
    await page.press('[data-open-from-file]');
  } else {
    await page.ask(`(() => { import('/src/lib/projectFile.js'); return true; })()`);
  }
  await page.waitFor('document.querySelector("[data-project-file-input]")', { timeout: 10000 });
  const { root } = await page.send('DOM.getDocument', { depth: 1 });
  const { nodeId } = await page.send('DOM.querySelector', { nodeId: root.nodeId, selector: '[data-project-file-input]' });
  await page.send('DOM.setFileInputFiles', { nodeId, files: [path] });
  // The window's questions, answered by their own buttons: this computer's
  // settings (the engine boxes below are the default profile's).
  for (let t = 0; t < 30; t += 1) {
    await page.sleep(500);
    if (await page.has('[data-project-file-choice="replace"]')) await page.press('[data-project-file-choice="replace"]');
    if (await page.has('[data-project-file-choice="keep-settings"]')) await page.press('[data-project-file-choice="keep-settings"]');
    if (await page.ask('Boolean(window.__cc && window.__cc.views && window.__cc.views.room)')) break;
  }
  await page.waitFor('window.__cc && window.__cc.views && window.__cc.views.room', { timeout: 45000 });
  await page.sleep(2500);
}

async function ownerCamera(page) {
  // The owner's screenshot: from the room's front, high, looking down into
  // both corners of wall A (the room is centred on the origin, metres,
  // components/studio/lib/cameraPresets.js; wall A stands at world z -1.5).
  await page.ask('(() => { window.dispatchEvent(new Event("resize")); return true; })()');
  await page.sleep(800);
  await page.ask(`(() => { const v = window.__cc.views.room; const c = v.camera;
    c.position.set(0, 5.0, 4.4); const t = v.controls && v.controls.target;
    if (t) { t.set(0, 0.7, -0.9); v.controls.update(); } else c.lookAt(0, 0.7, -0.9);
    return true; })()`);
  await page.sleep(1200);
  await settleCamera(page);
}

async function shot(page, file) {
  const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(file, Buffer.from(data, 'base64'));
}

const out = [];
for (const c of CASES) {
  const page = await open({ width: 1440, height: 900 });
  try {
    await page.showroom(`${BASE}index.html`);
    await page.waitFor('document.querySelector("[data-open-from-file]")', { timeout: 45000 });
    await openFile(page, fileWith(c.units, c.tag));
    const ids = await page.ask('window.__cc.project.getState().units.map((u) => u.id)');
    out.push(`## ${c.label} (${TAG})`);
    out.push(`units in the store: ${ids.join(', ')}`);
    for (const u of c.units) {
      const eng = engineBoxes(u);
      out.push(`### ${u.id} corner_side ${u.params.corner_side}`);
      out.push('| board | engine x / y / z | drawn x / y / z | verdict |');
      out.push('| - | - | - | - |');
      for (const [id, e] of Object.entries(eng)) {
        const g = await localBox(page, u.id, id);
        if (!g) { out.push(`| ${id} | ${e.x}..${e.x + e.w} / ${e.y}..${e.y + e.h} / ${e.z}..${e.z + e.d} | no mesh | - |`); continue; }
        out.push(`| ${id} | ${e.x}..${e.x + e.w} / ${e.y}..${e.y + e.h} / ${e.z}..${e.z + e.d} | ${g.x.map(r1).join('..')} / ${g.y.map(r1).join('..')} / ${g.z.map(r1).join('..')} | ${verdict(e, g)} |`);
      }
    }
    await ownerCamera(page);
    await shot(page, new URL(`./f09-${TAG}-${c.tag}.png`, import.meta.url).pathname);
    if (page.errors.length) out.push(`page errors: ${page.errors.slice(0, 3).join(' | ')}`);
  } finally {
    await page.close();
  }
}
console.log(out.join('\n'));
