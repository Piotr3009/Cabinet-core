#!/usr/bin/env node
// ─── T43 · F7 — THE RUNNER STAND-IN DIES, AND THE MISSING ARTICLE SPEAKS ────
//
//     npm run build && npx vite preview --port 4173 &
//     node scripts/fixture-server.mjs --port 4174 &
//     node verify/t43/f7-runner-probe.mjs [--out verify/t43/]
//
// The owner, 20.08.2026, after the fourth grey overlay: *"jak kod nadpisuje to
// go usuń."*
//
// This walk drives the real app against the SILENT SHOWROOM — which, since
// T43's iron rule 8, serves ONLY the rows the committed snapshot
// `reference/hardware/movento.json` names (NL 250–450, 8-digit articles). That
// is the whole point: the showroom is now the shop, so the app in this walk
// meets exactly the catalogue the owner's own bucket serves.
//
// What is proved, on the glass and off the registry:
//
//   1  a BUDR's box is 490, which asks NL 500, which the shop does not stock —
//      so ZERO runner models mount and every row reports `no-url`
//   2  and NOTHING IS DRAWN in their place: the registry says no model, and
//      the scene has no stand-in left to fall back to
//   3  the Check panel carries the RED, naming NL500 and the variant
//   4  with the catalogue UNREACHABLE instead, it is ONE amber note and no
//      reds at all

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { launch } from '../../scripts/cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const SHOWROOM = process.env.E2E_SHOWROOM || 'http://127.0.0.1:4174';
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

const SEED = `
  const S = () => ${P}.project.getState();
  S().newProject('T43 runners');
  ${P}.ui.getState().openEditor();
  ${P}.ui.getState().closeModal();
  ${P}.ui.getState().closeLibrary();
  const a = S().addUnit('BUDR');
  S().updateUnitParams(a.id, { width: 600, plinth: true });
  ${P}.ui.getState().selectUnit(a.id);
  // The runners are drawn when the fronts are off, which is what a joiner does
  // to look at them — the same one gate every runner in the app obeys.
  ${P}.ui.getState().setHideFronts(true);
  ${P}.ui.getState().setXray(true);
  const r = S().unitResult(a.id);
  return {
    unit: a.id,
    boxDepth: Math.max(...r.panels.filter((p) => p.part === 'DRAWER-SIDE').map((p) => p.box.d)),
    drawers: new Set(r.panels.filter((p) => p.part === 'DRAWER-SIDE').map((p) => p.meta.drawer)).size,
  };
`;

let PORT = 9481;
async function withPage(fn) {
  PORT += 1;
  const page = await launch({ port: PORT });
  try {
    return await fn(page);
  } finally {
    await page.close();
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  say('─── T43 · F7 — the runner stand-in dies ───────────────────────────────');
  say(`app:      ${BASE}`);
  say(`showroom: ${SHOWROOM}   (pinned to reference/hardware/movento.json — iron rule 8)`);
  say('');

  // ═══ 1 — THE SHOP IS OPEN, AND IT DOES NOT STOCK NL500 ═══════════════════
  await withPage(async (page) => {
    await page.goto(BASE);
    await page.evaluate(`
      window.localStorage.setItem('cc.hardwareBase', ${JSON.stringify(SHOWROOM)});
      return true;
    `);
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await page.waitFor(`window.__ccRunners && window.__ccRunners.runnerCatalogue()`, {
      what: 'the runner catalogue to arrive from the showroom', timeout: 25000,
    });

    const shop = await page.evaluate(`
      const cat = window.__ccRunners.runnerCatalogue();
      const nls = [...new Set(cat.files.map((f) => f.nl))].sort((a, b) => a - b);
      return { rows: cat.files.length, nls, top: Math.max(...nls) };
    `);
    say('1 — the catalogue the app is shopping in');
    say(`      ${shop.rows} rows · NL ${shop.nls.join(', ')}`);
    check('the shop stops at NL450, exactly as the owner\'s bucket does',
      shop.top === 450 && shop.rows === 40, JSON.stringify(shop.top));

    const seeded = await page.evaluate(SEED);
    await page.sleep(2500);
    say('');
    say('2 — a BUDR: box 490, which asks NL500');
    say(`      ${JSON.stringify(seeded)}`);
    const asked = await page.evaluate(`
      const P2 = ${P}.profile.getState().profile;
      const R = window.__ccRunners;
      const rows = window.__ccHardware3d.hardwareInstances(
        ${P}.project.getState().unitResult(${JSON.stringify(seeded.unit)}), P2,
      ).runners;
      const M = P2.hardware.runner.movento;
      return rows.map((r) => ({
        box: r.length,
        ask: R.runnerAskFor(r.length, P2),
        rung: R.ladderRungFor(R.runnerAskFor(r.length, P2), P2),
        entry: R.runnerEntry({
          system: M.system, nl: R.runnerAskFor(r.length, P2), variant: M.defaultVariant,
          side: r.side, ladder: R.runnerLadder(P2),
        }),
      }));
    `);
    say(`      box ${asked[0].box} → ask NL${asked[0].ask} → rung ${asked[0].rung} → entry ${asked[0].entry}`);
    check('every row asks NL500 and the shop answers NOTHING',
      asked.length === 6 && asked.every((r) => r.ask === 500 && r.entry === null),
      `${asked.length} rows`);

    // ═══ 2 — NOTHING IS DRAWN, AND THE REGISTRY SAYS SO ════════════════════
    say('');
    say('3 — the scene: no model, and NO STAND-IN EITHER');
    const registry = await page.evaluate(`
      const rows = ${P}.hardware.of('runner');
      return {
        rows: rows.length,
        modelled: rows.filter((r) => r.model).length,
        reasons: [...new Set(rows.map((r) => r.reason))],
        urls: [...new Set(rows.map((r) => String(r.url)))],
      };
    `);
    say(`      ${JSON.stringify(registry)}`);
    check('the walk sees runner rows, and NOT ONE of them is model-backed',
      registry.rows > 0 && registry.modelled === 0, JSON.stringify(registry.modelled));
    check('and the reason is `no-url` — the article does not exist, so no file was asked for',
      JSON.stringify(registry.reasons) === JSON.stringify(['no-url']), JSON.stringify(registry.reasons));

    // ═══ 3 — THE CHECK PANEL SPEAKS ═══════════════════════════════════════
    say('');
    say('4 — the Check panel: RED, per drawer, naming the NL and the variant');
    await page.evaluate(`${P}.ui.getState().setCheckOpen(true); return true;`);
    await page.sleep(900);
    const checks = await page.evaluate(`
      const rows = [...document.querySelectorAll('[data-check-finding="18"]')];
      return {
        count: rows.length,
        levels: [...new Set(rows.map((r) => r.getAttribute('data-check-level')))],
        text: rows.map((r) => r.textContent.replace(/\\s+/g, ' ').trim()),
      };
    `);
    for (const t of checks.text) say(`      ${t}`);
    check('one RED per drawer, and each names NL500 and the variant',
      checks.count === 3 && JSON.stringify(checks.levels) === JSON.stringify(['red'])
      && checks.text.every((t) => /Runner NL500 \(T\)/.test(t)
        && /no article in catalogue — upload the model or adjust the ladder\./.test(t)),
      `${checks.count} findings · ${JSON.stringify(checks.levels)}`);
    await page.screenshot(join(OUT, 'f7-empty-rung-speaks.png'));
    say('      shot:  f7-empty-rung-speaks.png');
  });

  // ═══ 4 — NO CATALOGUE AT ALL: ONE AMBER, ZERO REDS ══════════════════════
  await withPage(async (page) => {
    say('');
    say('5 — no catalogue at all: ONE amber note, and never a red wall');
    await page.goto(BASE);
    await page.evaluate(`window.localStorage.removeItem('cc.hardwareBase'); return true;`);
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await page.evaluate(SEED);
    await page.sleep(2000);
    // In THIS container the bucket is refused by the egress policy (R2's own
    // recorded refusal), so the catalogue really is unreachable — which is the
    // state being proved rather than a state being simulated.
    const state = await page.evaluate(`
      return { catalogue: window.__ccRunners.runnerCatalogue() };
    `);
    check('the registry really has no catalogue here', state.catalogue === null, JSON.stringify(state.catalogue));
    await page.evaluate(`${P}.ui.getState().setCheckOpen(true); return true;`);
    await page.sleep(900);
    const checks = await page.evaluate(`
      const rows = [...document.querySelectorAll('[data-check-finding="18"]')];
      return {
        reds: rows.filter((r) => r.getAttribute('data-check-level') === 'red').length,
        ambers: rows.filter((r) => r.getAttribute('data-check-level') === 'yellow').length,
        text: rows.map((r) => r.textContent.replace(/\\s+/g, ' ').trim()),
      };
    `);
    for (const t of checks.text) say(`      ${t}`);
    check('ONE amber, zero reds — a dead network is not thirty faults',
      checks.reds === 0 && checks.ambers === 1
      && checks.text.some((t) => /hardware catalogue unreachable — runners not verified/.test(t)),
      JSON.stringify(checks));
    const registry = await page.evaluate(`
      const rows = ${P}.hardware.of('runner');
      return { rows: rows.length, modelled: rows.filter((r) => r.model).length };
    `);
    check('and still NOTHING is drawn in the groove — the deletion is global',
      registry.rows > 0 && registry.modelled === 0, JSON.stringify(registry));
  });

  say('');
  const failed = steps.filter((s) => !s.ok);
  say('─── VERDICT ───────────────────────────────────────────────────────────');
  say(`${steps.length - failed.length} / ${steps.length} checks passed`);
  for (const f of failed) say(`  FAILED: ${f.label}   ${f.detail}`);
  writeFileSync(join(OUT, 'f7-runner-probe.txt'), `${lines.join('\n')}\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  say(`WALK ERROR: ${e.stack || e.message}`);
  writeFileSync(join(OUT, 'f7-runner-probe.txt'), `${lines.join('\n')}\n`);
  process.exit(1);
});
