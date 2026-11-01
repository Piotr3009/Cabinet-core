/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F8 . TWO ANGLES AND THE RENDER AS SHEETS (law 8). The owner, 01.11.2026: *"dodac wizualizacje z
// drugiego kata, render wedlug wyboru, wizualizacja AI z renderu, max 3 proby, wybierasz jedna i dodajesz do
// rysunkow"*. The one visualisation sheet became up to four, each ticked like any other, bound by the one PDF.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickedSheets, visualSheetsOf, wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { sheetToSvg } from '../src/engine/drawings/svg.js';
import { bookletDoc } from '../src/lib/drawingExport.js';
import { keepPicture } from '../src/lib/keepPicture.js';
import { dataUrlBytes, visualNumbers } from '../src/lib/visualNumbers.js';
import { getCabinetProfile } from '../src/engine/profile.js';
import { CAMERA_PRESETS } from '../src/engine/render.js';
import { t81Kitchen, setArgs, S } from '../scripts/t81-kitchen.mjs';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const JPEG = (bytes) => `data:image/jpeg;base64,${Buffer.alloc(bytes, 7).toString('base64')}`;
const names = (set) => set.map((s) => s.name);
const VISUALS = ['Visualisation, left', 'Visualisation, right', 'Visualisation, render', 'Visualisation, AI'];

test('F8 · the presets the window captures exist in engine/render.js', () => {
  const ids = CAMERA_PRESETS.map((p) => p.id);
  assert.ok(ids.includes('iso-left') && ids.includes('iso-right'));
});

test('F8 · the set lists Visualisation, left and right, and no "Visualisation" alone; after the sections, before the cut list', () => {
  t81Kitchen({ inframe: false });
  const set = wallDrawingSheets(setArgs({ visuals: { isoLeft: PNG, isoRight: PNG } }));
  const list = names(set);
  assert.ok(!list.includes('Visualisation'), list.join(', '));
  const left = list.indexOf('Visualisation, left');
  const right = list.indexOf('Visualisation, right');
  assert.ok(left > 0 && right === left + 1);
  assert.ok(list.slice(0, left).some((n) => /Sections/.test(n)), 'after the sections');
  assert.match(list[right + 1], /^Cut list and materials/, 'before the cut list');
  assert.ok(!list.includes('Visualisation, render') && !list.includes('Visualisation, AI'), 'the other two only when present');
  for (const name of ['Visualisation, left', 'Visualisation, right']) {
    const sh = set.find((s) => s.name === name);
    assert.equal(sh.variant, 'visual');
    assert.ok(sh.sheet.entities.some((e) => e.kind === 'image' && e.href === PNG), `${name} frames its angle`);
  }
  // A window with no scene: the two frames wait, the sheets still stand.
  assert.deepEqual(names(wallDrawingSheets(setArgs())).filter((n) => /^Visualisation/.test(n)), VISUALS.slice(0, 2));
});

test('F8 · project.visuals.render adds the third; the chosen AI picture the fourth', () => {
  t81Kitchen({ inframe: false });
  const render = { dataUrl: PNG, preset: 'front', at: '2026-11-01T01:00:00Z' };
  const ai = { dataUrl: PNG, prompt: 'p', at: '2026-11-01T01:05:00Z' };
  S().setVisual('render', render);
  const st = S();
  const visuals = { isoLeft: PNG, isoRight: PNG, render: st.project.visuals.render, ai: st.project.visuals.ai || null };
  assert.deepEqual(names(wallDrawingSheets(setArgs({ visuals }))).filter((n) => /^Visualisation/.test(n)), VISUALS.slice(0, 3));
  S().setVisual('ai', ai);
  const all = wallDrawingSheets(setArgs({ visuals: { ...visuals, ai: S().project.visuals.ai } }));
  assert.deepEqual(names(all).filter((n) => /^Visualisation/.test(n)), VISUALS);
  assert.deepEqual(visualSheetsOf({ render: { dataUrl: 'https://x/y.png' } }).map((v) => v.name), VISUALS.slice(0, 2), 'only a data URL is a picture');
});

test('F8 · the sheets export through the ONE PDF road, ticked like any other, in the set\'s order', () => {
  t81Kitchen({ inframe: false });
  const set = wallDrawingSheets(setArgs({ visuals: { isoLeft: PNG, isoRight: PNG, render: { dataUrl: PNG } } }));
  // The window ticks every sheet by default; leave the left angle out and the cut list.
  const leftOut = new Set(['Visualisation, left']);
  const picked = pickedSheets(set, (s) => !leftOut.has(s.name));
  assert.equal(picked.length, set.length - 1);
  assert.deepEqual(names(picked).filter((n) => /^Visualisation/.test(n)), ['Visualisation, right', 'Visualisation, render']);
  const ordered = picked.map((s) => set.indexOf(s));
  assert.deepEqual(ordered, [...ordered].sort((a, b) => a - b), 'the set\'s order');
  const doc = bookletDoc(picked.map((s) => s.sheet));
  assert.equal(doc.getNumberOfPages(), picked.length);
  assert.match(sheetToSvg(picked.find((s) => s.name === 'Visualisation, render').sheet, { kind: 'visual' }), /<image [^>]*href="data:image\/png/);
});

test('F8 · keepPicture: a 2 MB render is kept under 400 KB as JPEG; a small one as it is; a hopeless one refused in words', async () => {
  const { maxKb } = visualNumbers(getCabinetProfile());
  assert.equal(maxKb, 400);
  const big = JPEG(2 * 1024 * 1024);
  const asked = [];
  // The canvas, faked: the bytes fall with the quality and the area.
  const encode = async (src, quality, scale) => { asked.push([quality, scale]); return JPEG(Math.round(2 * 1024 * 1024 * quality * scale * scale * 0.3)); };
  const kept = await keepPicture(big, { maxKb, encode });
  assert.equal(kept.error, null);
  assert.ok(kept.bytes <= 400 * 1024 && dataUrlBytes(kept.dataUrl) === kept.bytes, `${kept.bytes} bytes`);
  assert.match(kept.dataUrl, /^data:image\/jpeg;base64,/);
  assert.ok(asked.length > 1 && asked[0][0] > asked[asked.length - 1][0] - 1e-9, 'down the ladder');
  const small = JPEG(100 * 1024);
  assert.deepEqual(await keepPicture(small, { maxKb, encode: () => { throw new Error('never'); } }), { dataUrl: small, bytes: 100 * 1024, error: null });
  const stuck = await keepPicture(big, { maxKb, encode: async () => big });
  assert.equal(stuck.dataUrl, null);
  assert.match(stuck.error, /would not come under 400 KB, so it is not kept/);
  assert.equal((await keepPicture('nope', { maxKb })).dataUrl, null);
});

test('F8 · the window: two angles captured, Render... over it, its picture kept through setVisual; RenderModal hands back beside the download', () => {
  const modal = readFileSync(new URL('../src/components/DrawingModal.jsx', import.meta.url), 'utf8');
  assert.match(modal, /isoLeft: shoot\('iso-left'\), isoRight: shoot\('iso-right'\)/);
  assert.match(modal, /rig\.capture\(job\)/);
  assert.match(modal, /aspect: visualAspect\(profile\)/);
  assert.match(modal, /render: project\?\.visuals\?\.render \|\| null,\s+ai: project\?\.visuals\?\.ai \|\| null,/);
  assert.match(modal, /worktops: worktopsOf\(\),\s+visuals,/, 'the set receives the visuals');
  assert.ok(!/renderImage/.test(modal), 'the one render is gone');
  assert.match(modal, />\s*Render\.\.\.\s*</);
  assert.match(modal, /<RenderModal rig=\{rig\} onResult=\{keepRender\} onClose=\{\(\) => setRenderOpen\(false\)\} \/>/);
  assert.match(modal, /keepPicture\(dataUrl, \{ maxKb \}\)/);
  assert.match(modal, /setVisual\('render', \{ dataUrl: kept\.dataUrl, preset, at: /);
  assert.match(modal, /<AiVisualCard project=\{project\} visuals=\{visuals\} \/>/, 'A4\'s card mounted under the sheet list');
  const render = readFileSync(new URL('../src/components/RenderModal.jsx', import.meta.url), 'utf8');
  assert.match(render, /export default function RenderModal\(\{ rig, onResult = null, onClose = null \}\)/);
  assert.match(render, /onClick=\{save\}>Save PNG</, 'the download stays');
  assert.match(render, /\{onResult \? \(/, 'the hand back only when asked');
  assert.match(render, /const presets = useMemo\(\(\) => CAMERA_PRESETS, \[\]\);/, 'the shots untouched');
  assert.match(render, /profile\.render\.resolutions\.map/, 'the resolution untouched');
});
