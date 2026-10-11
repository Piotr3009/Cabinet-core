#!/usr/bin/env node
// ─── T78 F2 · PROBE (browser half): THE L WORKTOP THROUGH THE REAL BUTTONS ─
//
// The engine half is `scripts/t78-f02-probe.mjs`. This one asks the running
// app, with the real mouse (T74's harness): Library ▸ Kitchen ▸ Base units ▸
// Corner L; the Worktop row's ADD WORKTOP; then a Standard beside the L and
// the selection panel's "Add worktop (2)". The store is READ
// (`window.__cc.project.getState().worktopsOf()`), never written to make
// something happen. Frames: verify/t78/f02-probe-worktop*.png; the facts are
// appended to verify/t78/f02-probe.md under "## The app, real mouse".
//
//   E2E_URL=http://127.0.0.1:4173/ node scripts/t78-f02-probe-browser.mjs

import { appendFileSync, mkdirSync } from 'node:fs';

import { open, pro, unitsNow, settleCamera } from './t74-harness.mjs';
import { library, clickWith, reachFree, until } from './t75-harness.mjs';

const OUT = new URL('../verify/t78/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const S = 'window.__cc.project.getState()';
const j = (v) => JSON.stringify(v);
const lines = [];
const say = (label, detail) => {
  lines.push(`- ${label}: ${detail}`);
  process.stdout.write(`  ${label}: ${detail}\n`);
};

const worktopsNow = (page) => page.ask(`${S}.worktopsOf().map((w) => ({ slab: w.slabId || w.id, wall: w.geometry.wall,
  x: w.geometry.x, w: w.geometry.w, d: w.geometry.d, shape: w.geometry.shape || null,
  points: (w.geometry.outline || []).length, outline: w.geometry.outline || null, joint: w.joint ? w.joint.at : null }))`);
const recordsNow = (page) => page.ask(`(${S}.project.design.worktops || []).map((w) => ({ id: w.id, units: w.unitIds.length, kind: w.kind || null }))`);
const grabIds = (page, id) => page.ask(`(() => { const r = ${S}.unitResult(${JSON.stringify(id)});
  const pick = [];
  for (const f of [(p) => p.part === 'FRONT', (p) => p.id === 'TOP', (p) => p.part === 'TOP' || p.part === 'TOP-L', (p) => p.role === 'side', (p) => p.role === 'back']) {
    for (const p of r.panels) if (f(p) && !pick.includes(p.id)) pick.push(p.id);
  }
  return pick.length ? pick : r.panels.map((p) => p.id); })()`);
async function clickUnit(page, id, modifiers = 0) {
  for (const pid of (await grabIds(page, id)).slice(0, 6)) {
    const at = await reachFree(page, id, pid);
    if (at) { await clickWith(page, at.x, at.y, modifiers); return { ...at, by: pid }; }
  }
  return null;
}
async function closeLibrary(page) {
  if (await page.has('[aria-label="Close the library"]')) await page.press('[aria-label="Close the library"]');
}
async function section(page, title) {
  if (await page.has(`[data-section="${title}"][data-open="0"]`)) await page.press(`[data-section="${title}"] > button`);
  return page.has(`[data-section="${title}"][data-open="1"]`);
}
async function framed(page, file) {
  for (const sel of ['button[title="Close panel"]', 'button[title="Close"]']) {
    if (await page.has(sel)) { await page.press(sel); break; }
  }
  await settleCamera(page);
  await page.screenshot(`${OUT}${file}`);
  say('frame', `verify/t78/${file}`);
}
/** The scene's own measure of a slab: the mesh the Worktops component drew, its bounding box in mm. */
const slabMeshes = (page) => page.ask(`(() => { const v = window.__cc.views.room; const T = v.three; const out = [];
  v.scene.traverse((o) => { if (o.isMesh && o.userData && (o.userData.ccWorktopSlab || o.userData.ccWorktopId)) {
    const b = new T.Box3().setFromObject(o); const s = new T.Vector3(); b.getSize(s);
    out.push({ slab: o.userData.ccWorktopSlab || o.userData.ccWorktopId, kind: o.geometry && o.geometry.type, mmW: Math.round(s.x * 1000), mmH: Math.round(s.y * 1000), mmD: Math.round(s.z * 1000) }); } });
  return out; })()`);

const page = await open();
try {
  await pro(page);
  const before = new Set((await unitsNow(page)).map((u) => u.id));
  const ok = await library(page, { category: 'Kitchen', group: 'base-units', entry: 'corner-l' });
  await closeLibrary(page);
  const L = (await unitsNow(page)).find((u) => !before.has(u.id));
  const l = L ? await page.ask(`(() => { const u = ${S}.units.find((x) => x.id === ${j(L.id)}); return { id: u.id, type: u.type, wall: u.position.wall, x: u.position.x_mm, w: u.params.width, d: u.params.depth, side: u.params.corner_side }; })()`) : null;
  say('Library, Kitchen, Base units, Corner L (real row)', `${ok ? 'pressed' : 'row not found'}; placed ${j(l)}`);
  if (!l) throw new Error('no Corner L placed');
  await clickUnit(page, l.id);
  await until(page, `window.__cc.ui.getState().selectedUnitId === ${j(l.id)}`, 4000);
  await section(page, 'Construction');
  const rowThere = await page.has('[data-add-worktop-one="1"]');
  say('the L selected by a real click: the Worktop row offers ADD WORKTOP', String(rowThere));
  if (rowThere) await page.press('[data-add-worktop-one="1"]');
  const recs1 = await recordsNow(page);
  const slabs1 = await worktopsNow(page);
  const meshes1 = await slabMeshes(page);
  say('ADD WORKTOP on the lone L: records', j(recs1));
  say('ADD WORKTOP on the lone L: slabs (store, worktopsOf)', j(slabs1));
  say('ADD WORKTOP on the lone L: the scene\'s slab meshes (bounding box mm)', j(meshes1));
  await framed(page, 'f02-probe-worktop.png');

  // A Standard beside the L on its own wall, the way the T75 walk did it: the
  // L selected, Standard from the library lands beside it.
  await clickUnit(page, l.id);
  await until(page, `window.__cc.ui.getState().selectedUnitId === ${j(l.id)}`, 4000);
  const before2 = new Set((await unitsNow(page)).map((u) => u.id));
  await library(page, { category: 'Kitchen', group: 'base-units', entry: 'door-base' });
  await closeLibrary(page);
  const R = (await unitsNow(page)).find((u) => !before2.has(u.id));
  const r = R ? await page.ask(`(() => { const u = ${S}.units.find((x) => x.id === ${j(R.id)}); return { id: u.id, type: u.type, wall: u.position.wall, x: u.position.x_mm, w: u.params.width, d: u.params.depth }; })()`) : null;
  say('a Standard from the library beside the L', j(r));
  if (r) {
    // Ctrl+click both, the selection panel's "Add worktop (2)".
    await clickUnit(page, l.id);
    await clickUnit(page, r.id, 2);
    const sel = await page.ask('window.__cc.ui.getState().selectedUnitIds');
    say('Ctrl+click: the selection', j(sel));
    const label = await page.text('[data-add-worktop="1"]');
    say('the selection panel\'s button', j(label));
    if (label) await page.press('[data-add-worktop="1"]');
    const recs2 = await recordsNow(page);
    const slabs2 = await worktopsNow(page);
    const meshes2 = await slabMeshes(page);
    say('"Add worktop (2)" over the L and the Standard: records', j(recs2));
    say('"Add worktop (2)" over the L and the Standard: slabs', j(slabs2));
    say('"Add worktop (2)": the scene\'s slab meshes (bounding box mm)', j(meshes2));
    await framed(page, 'f02-probe-worktop-run.png');
  }
  const errs = page.errors.filter((e) => !/props\/manifest\.json|favicon|hardware-local|showroom|ERR_TUNNEL_CONNECTION_FAILED|supabase\.co/i.test(e));
  if (errs.length) say('console errors', errs.slice(0, 3).join(' | '));
} finally {
  await page.close();
}
appendFileSync(`${OUT}f02-probe.md`, `\n## The app, real mouse (\`node scripts/t78-f02-probe-browser.mjs\`)\n\n${lines.join('\n')}\n`);
process.stdout.write('appended to verify/t78/f02-probe.md\n');
