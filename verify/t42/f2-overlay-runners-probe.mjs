#!/usr/bin/env node
// ─── T42 · F2 — OVERLAY DRAWER RUNNERS ARE GLB ─────────────────────────────
//
//     npm run build && npx vite preview --port 4173 &
//     node verify/t42/f2-overlay-runners-probe.mjs [--out verify/t42/]
//
// The owner: *"w nowych szufladach zamiast się podstawić ładne GLB, to znowu
// się pojawiają te gówna kodowane."*
//
// The models are fetched from the SILENT SHOWROOM (`scripts/fixture-server.mjs`
// over `test/fixtures/hardware-local/`), pointed at with the app's own
// documented `localStorage['cc.hardwareBase']` knob — the same rig turns 23-32
// used, and for the same reason: this container's egress policy answers 403 to
// the real bucket, and a GLB has to actually be FETCHED for this proof to mean
// anything.
//
// WHAT IS ASSERTED IS THE MOUNT REGISTRY, NOT A PIXEL. `window.__cc.hardware`
// records, per mounted runner, whether it is a MODEL or the stand-in and why
// (`reason: 'no-url' | 'no-model' | null`). That is the field that distinguishes
// a GLB from a hand-made L-profile, and it is written by the component that
// mounts one or the other.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { launch } from '../../scripts/cdp.mjs';
import { startFixtureServer } from '../../scripts/fixture-server.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const argOf = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('.', import.meta.url).pathname);
const P = 'window.__cc';

const lines = [];
const say = (s = '') => { lines.push(s); process.stdout.write(`${s}\n`); };
const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  say(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? `   ${detail}` : ''}`);
};

async function main() {
  mkdirSync(OUT, { recursive: true });
  say('─── T42 · F2 — overlay drawer runners are GLB ─────────────────────────');
  const showroom = await startFixtureServer({ port: 4184 });
  say(`app:      ${BASE}`);
  say(`showroom: ${showroom.url}`);
  say('');

  const page = await launch({ port: 9481 });
  try {
    await page.goto(BASE);
    await page.evaluate(`localStorage.clear(); localStorage.setItem('cc.hardwareBase', ${JSON.stringify(showroom.url)}); return true;`);
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });

    // A wardrobe with an OVERLAY stack on the outside of it, and the fronts OFF
    // — which is exactly when a joiner looks at his runners.
    const made = await page.evaluate(`
      const S = () => ${P}.project.getState();
      S().newProject('T42 · overlay runners');
      ${P}.ui.getState().openEditor();
      ${P}.ui.getState().closeModal();
      ${P}.ui.getState().closeLibrary();
      ${P}.ui.getState().setCheckOpen(false);
      ${P}.ui.getState().setHideFronts(true);
      const w = S().addUnit('WARDROBE');
      S().updateUnitParams(w.id, { width: 900, height: 2150, doors: { count: 2 } });
      S().addOverlayDrawers
        ? S().addOverlayDrawers(w.id, 3, 200)
        : S().updateUnitParams(w.id, {
          sections: [{
            width_mm: 900,
            items: [1, 2, 3].map((i) => ({ id: 'o' + i, kind: 'overlay_drawer', height_mm: 200 })),
          }],
        });
      ${P}.ui.getState().selectUnit(w.id);
      const r = S().unitResult(w.id);
      return {
        id: w.id,
        overlay: r.assemblies.overlayDrawers,
        rows: r.drillSummary.runner_rows_carcass_y,
        sides: r.panels.filter((p) => p.part === 'DRAWER-SIDE').map((p) => p.id),
        boxDepth: (r.panels.find((p) => p.part === 'DRAWER-SIDE') || {}).box?.d ?? null,
        bom: (r.hardware.find((h) => h.role === 'runner_pairs') || {}).spec || null,
      };
    `);
    say(`      overlay stack: ${JSON.stringify(made.overlay)}`);
    say(`      runner rows:   ${JSON.stringify(made.rows)}`);
    say(`      box sides:     ${JSON.stringify(made.sides)}`);
    say(`      box depth:     ${made.boxDepth} mm      BOM orders: NL${made.bom?.nl} ${JSON.stringify(made.bom?.articles)}`);
    check('an OVERLAY stack is standing, with runner rows and box sides of its own',
      made.overlay?.count === 3 && made.rows?.length === 3 && made.sides?.length === 6,
      JSON.stringify({ count: made.overlay?.count, rows: made.rows?.length, sides: made.sides?.length }));

    await page.waitFor('document.querySelector("canvas")', { what: 'the 3D canvas' });
    await page.waitFor(`${P}.hardware && ${P}.hardware.of('runner').length > 0`, { what: 'the runners to mount' });
    await page.waitFor(`${P}.hardware.allModelled('runner')`, {
      what: 'every overlay runner to be a MODEL and not a stand-in', timeout: 30000,
    }).catch(() => {});
    await page.sleep(900);

    const mounted = await page.evaluate(`
      const rows = ${P}.hardware.of('runner');
      return {
        count: rows.length,
        modelled: rows.filter((r) => r.model === true).length,
        reasons: [...new Set(rows.map((r) => r.reason))],
        urls: [...new Set(rows.map((r) => (r.url || '').split('/').pop()))],
        parents: [...new Set(rows.map((r) => r.parent))],
      };
    `);
    say(`      mounted:       ${JSON.stringify(mounted)}`);
    check('EVERY overlay runner on the glass is a GLB MODEL — none is the stand-in',
      mounted.count === 6 && mounted.modelled === 6 && mounted.reasons.every((r) => r === null),
      `${mounted.modelled}/${mounted.count} modelled, reasons ${JSON.stringify(mounted.reasons)}`);
    check('…and the file it fetched is the article the BOM orders',
      mounted.urls.some((u) => u.includes(String(made.bom?.nl))),
      `${JSON.stringify(mounted.urls)} vs NL${made.bom?.nl}`);
    check('…hanging off the drawer, like every other runner in the app',
      mounted.parents.length === 1 && mounted.parents[0] === 'drawer', JSON.stringify(mounted.parents));

    // AND THE SAME QUESTION, ASKED OF A BUDR AT THE SAME DEPTH — CLAUDE.md's
    // own named test, on the mounted scene rather than in node.
    const both = await page.evaluate(`
      const S = ${P}.project.getState();
      const prof = ${P}.profile.getState().profile;
      const R = window.__ccRunners;
      const M = prof.hardware.runner.movento;
      const ask = (res) => {
        const row = window.__ccHardware3d.hardwareInstances(res, prof).runners[0];
        const e = R.runnerEntry({
          system: M.system, nl: R.runnerAskFor(row.length, prof) ?? row.length,
          variant: M.defaultVariant, side: row.side, ladder: R.runnerLadder(prof),
        });
        return { depth: row.length, file: e && e.file, nl: e && e.nl, article: e && e.article };
      };
      const overlay = ask(S.unitResult(${JSON.stringify(made.id)}));
      const b = S.addUnit('BUDR');
      const budr = ask(S.unitResult(b.id));
      S.removeUnit ? S.removeUnit(b.id) : null;
      return { overlay, budr };
    `);
    say(`      overlay: ${JSON.stringify(both.overlay)}`);
    say(`      budr:    ${JSON.stringify(both.budr)}`);
    check('AN OVERLAY DRAWER AT DEPTH D RESOLVES THE SAME ENTRY AND GLB AS A BUDR AT D',
      both.overlay.depth === both.budr.depth && both.overlay.file === both.budr.file
      && Boolean(both.overlay.file), JSON.stringify([both.overlay.file, both.budr.file]));

    // THE PICTURE CLAUDE.md ASKS FOR: *"fronts off, GLB runners visible under
    // the overlay boxes."* A wardrobe drawn whole puts a 490 mm runner at about
    // forty pixels, which is a picture of a claim rather than the claim itself
    // — so the camera goes in, with the wheel, the way a joiner would.
    const stack = await page.evaluate(`
      const v = ${P}.views.room;
      const THREE = v.three;
      v.scene.updateMatrixWorld(true);
      let box = null;
      v.scene.traverse((o) => {
        if (!o.userData || !o.userData.ccPanelId) return;
        if (!/^D\\d-S[LR]$/.test(String(o.userData.ccPanelId))) return;
        const b = new THREE.Box3().setFromObject(o);
        box = box ? box.union(b) : b;
      });
      if (!box) return null;
      const c = box.getCenter(new THREE.Vector3());
      const p = c.clone().project(v.camera);
      const r = v.gl.domElement.getBoundingClientRect();
      return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
    `);
    if (stack) {
      await page.wheel(stack.x, stack.y, -220, 7);
      await page.sleep(700);
    }
    // …and the drawers come OUT, with a real click on the toolbar's own
    // control, because a runner under a shut box is a runner nobody can see.
    // The GLB travels with its drawer (`<SlideOut>`), which is the other half
    // of "the same channel every other runner is on".
    await page.click('button', 'Open all');
    await page.sleep(1400);
    const opened = await page.evaluate(`
      const rows = ${P}.hardware.of('runner');
      return { modelled: rows.filter((r) => r.model === true).length, count: rows.length };
    `);
    check('…and they are STILL models with the drawers pulled out, travelling with them',
      opened.count === 6 && opened.modelled === 6, JSON.stringify(opened));
    // A CLOSE-UP, which is this house's own answer to a 40-pixel subject
    // (`scripts/cdp.mjs`: *"`clip` is a CLOSE-UP: CDP crops and rescales the
    // capture, so a 300 px canvas can be published at a size somebody can
    // actually look at"*). The frame is the stack, at 3×, so the MODEL under
    // each box is a thing a person can see rather than a claim in a log.
    const at = await page.evaluate(`
      const v = ${P}.views.room;
      const THREE = v.three;
      v.scene.updateMatrixWorld(true);
      let box = null;
      v.scene.traverse((o) => {
        if (!o.userData || !o.userData.ccPanelId) return;
        if (!/^D\\d-S[LR]$/.test(String(o.userData.ccPanelId))) return;
        const b = new THREE.Box3().setFromObject(o);
        box = box ? box.union(b) : b;
      });
      if (!box) return null;
      const r = v.gl.domElement.getBoundingClientRect();
      const pts = [];
      for (const x of [box.min.x, box.max.x]) {
        for (const y of [box.min.y, box.max.y]) {
          for (const z of [box.min.z, box.max.z]) {
            const p = new THREE.Vector3(x, y, z).project(v.camera);
            pts.push([r.left + ((p.x + 1) / 2) * r.width, r.top + ((1 - p.y) / 2) * r.height]);
          }
        }
      }
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const pad = 26;
      return {
        x: Math.max(0, Math.min(...xs) - pad),
        y: Math.max(0, Math.min(...ys) - pad),
        width: (Math.max(...xs) - Math.min(...xs)) + pad * 2,
        height: (Math.max(...ys) - Math.min(...ys)) + pad * 2,
      };
    `);
    await page.screenshot(join(OUT, 'f2-overlay-runners-are-glb.png'),
      at ? { ...at, scale: 3 } : null);
    say(`      shot: f2-overlay-runners-are-glb.png  (close-up on the stack: ${JSON.stringify(at)})`);
    const errs = page.errors.filter((e) => !/favicon/.test(String(e)));
    check('and no console error while it loaded them', errs.length === 0, JSON.stringify(errs.slice(0, 2)));
  } finally {
    await page.close();
    showroom.close?.();
  }

  const failed = steps.filter((s) => !s.ok);
  say('');
  say('─── VERDICT ───────────────────────────────────────────────────────────');
  say(`${steps.length - failed.length} / ${steps.length} checks passed`);
  for (const f of failed) say(`  FAILED: ${f.label}   ${f.detail}`);
  writeFileSync(join(OUT, 'f2-overlay-runners-probe.txt'), `${lines.join('\n')}\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  say(`WALK ERROR: ${e.stack || e.message}`);
  writeFileSync(join(OUT, 'f2-overlay-runners-probe.txt'), `${lines.join('\n')}\n`);
  process.exit(1);
});
