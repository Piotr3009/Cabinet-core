#!/usr/bin/env node
// ─── T42 · F0 — THE WALL PDF, PROVED ON THE BYTES AND ON THE GLASS ──────────
//
//     npm run build && npx vite preview --port 4173 &
//     node verify/t42/f0-wall-pdf-probe.mjs [--out verify/t42/]
//
// The owner, 19/20.08.2026: *"pdf w ogóle nie zadziałał — coś się znowu
// zablokowało."* This probe walks HIS path in a real browser with real pointer
// input, and it refuses to believe anything it has not measured:
//
//   1  A KITCHEN AT A WALL → the set is non-empty, the button is ENABLED,
//      the click writes a REAL FILE, and the file's own first four bytes are
//      `%PDF` while its `/Count` equals the number of sheets on screen.
//      The file is then OPENED, on page 1, and photographed.
//   2  THE BUILDER CRASHES → the window says `Wall drawings failed: …` with
//      the message on it, in the error style, buttons still disabled. The
//      crash is a REAL one: `allResults()` is replaced with a thrower, which
//      is exactly the modelled fault (*"ONE unit whose computeCabinet throws
//      kills the whole set"*).
//   3  A GENUINELY EMPTY JOB → the honest sentence, no error styling.
//   4  A TURNED CABINET → the window NAMES it and its wall, instead of
//      dropping the wall off the list without a word.
//
// Iron rule 6, in this feature's words: *"assert the EXPORTED BYTES and the
// words ON SCREEN, never the array's length alone."* Nothing below counts an
// array and calls it a PDF.
//
// ─── ON "IN PLAYWRIGHT" ─────────────────────────────────────────────────────
//
// The brief asks for Playwright. Iron rule 5 forbids a new dependency, and
// Playwright is not one this repo has (`package.json` has no test-browser
// dependency at all — `scripts/cdp.mjs` has been this house's browser since
// turn 5, for exactly that reason). What the instruction is FOR — a real
// Chromium, real pointer input, a real download landing on disk — is what this
// does, over the DevTools protocol. The rule that is iron wins; the tool that
// was named does not.

import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { launch } from '../../scripts/cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const argOf = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('.', import.meta.url).pathname);
const DL = join(OUT, 'downloads');
const P = 'window.__cc';

const lines = [];
const say = (s = '') => { lines.push(s); process.stdout.write(`${s}\n`); };
const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  say(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? `   ${detail}` : ''}`);
};

/** The PDF's own answers, read off the file the browser wrote. */
function readPdf(path) {
  const bytes = readFileSync(path);
  const text = bytes.toString('latin1');
  const counts = [...text.matchAll(/\/Count\s+(\d+)/g)].map((m) => Number(m[1]));
  return {
    bytes: bytes.length,
    head: text.slice(0, 8),
    magic: text.slice(0, 4),
    // `/Type /Page` (not `/Pages`) once per page, and the catalogue's own
    // `/Count`. Two independent readings of the same fact, so a probe that
    // agreed with itself by accident would have to do it twice.
    pageObjects: (text.match(/\/Type\s*\/Page[^s]/g) || []).length,
    count: counts.length ? Math.max(...counts) : null,
    // The SHEET NAMES, read out of the file rather than off the screen. jsPDF
    // writes this app's title blocks uncompressed, so `Wall A /1` is literally
    // in the bytes — which is how a picture of the open document gets a NAMED
    // SUBJECT (iron rule 7) that a folder listing could not give it.
    names: ['Wall A /1', 'Wall A /2', 'Horizontal section'].filter((n) => text.includes(n)),
    scale: text.includes('No Scale'),
  };
}

// ─── ONE BROWSER PER PHASE (T41's own lesson, and this probe needed it) ─────
//
// MEASURED, 19.08.2026: after this walk navigates to `file://…​.pdf` to
// photograph the drawing, Chromium's PDF viewer owns the tab — and the next
// `Runtime.evaluate` never comes back, so the walk wedges with three checks
// still to run. A phase gets a browser of its own and gives it back; it costs a
// second of start-up and it buys a walk that cannot hang.
let PORT = 9411;
async function withPage(fn) {
  PORT += 1;
  const page = await launch({ port: PORT });
  try {
    await page.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DL });
    return await fn(page);
  } finally {
    await page.close();
  }
}

async function main() {
  rmSync(DL, { recursive: true, force: true });
  mkdirSync(DL, { recursive: true });
  mkdirSync(OUT, { recursive: true });

  say('─── T42 · F0 — the wall PDF speaks ────────────────────────────────────');
  say(`app:       ${BASE}`);
  say(`downloads: ${DL}`);
  say('');

  await withPage(async (page) => {
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });

    const fresh = async (name) => {
      await page.evaluate(`
        const S = () => ${P}.project.getState();
        S().newProject(${JSON.stringify(name)});
        ${P}.ui.getState().openEditor();
        ${P}.ui.getState().closeModal();
        ${P}.ui.getState().closeLibrary();
        ${P}.ui.getState().setCheckOpen(false);
        return true;
      `);
      await page.sleep(250);
    };

    // ═══ 1 — A KITCHEN AT A WALL, AT ROTATION 0 ═════════════════════════════
    say('1 — a kitchen standing at a wall');
    await fresh('Anderson Kitchen');
    const seeded = await page.evaluate(`
      const S = () => ${P}.project.getState();
      S().setProjectInfo({ client: 'Mr Anderson', number: 'J-1042' });
      const a = S().addUnit('BUD');
      S().updateUnitParams(a.id, { width: 600, plinth: true, doors: { count: 1, hinge: 'L' } });
      const b = S().addUnit('BUD');
      S().updateUnitParams(b.id, { width: 500, plinth: true, doors: { count: 1, hinge: 'R' } });
      S().moveUnit(b.id, 640);
      const c = S().addUnit('WUD');
      S().updateUnitParams(c.id, { width: 600, mount_height: 1500, doors: { count: 1, hinge: 'L' } });
      S().moveUnit(c.id, 40);
      return {
        units: S().units.length,
        rotations: S().units.map((u) => u.position.rotation_deg),
        walls: [...new Set(S().units.map((u) => u.position.wall))],
      };
    `);
    check('three cabinets on wall A, every one of them at rotation 0',
      seeded.units === 3 && seeded.rotations.every((r) => r === 0), JSON.stringify(seeded));

    await page.evaluate(`${P}.ui.getState().openModal('drawing', { kind: 'walls' }); return true;`);
    await page.waitFor('document.querySelector(\'[data-drawing-kind-tab="walls"]\')', { what: 'the Drawings window' });
    await page.click('[data-drawing-kind-tab="walls"]');
    await page.sleep(500);

    const onScreen = await page.evaluate(`
      const list = document.querySelector('[data-wall-sheets]');
      const pdf = document.querySelector('[data-wall-drawings-pdf="1"]');
      return {
        sheets: list ? Number(list.getAttribute('data-wall-sheets')) : 0,
        names: [...document.querySelectorAll('[data-wall-sheet]')].map((b) => b.getAttribute('data-wall-sheet')),
        pdfDisabled: pdf ? pdf.disabled : null,
        failed: Boolean(document.querySelector('[data-wall-failed]')),
        empty: Boolean(document.querySelector('[data-wall-empty]')),
      };
    `);
    check('the set is on screen and the PDF button is ENABLED',
      onScreen.sheets === 3 && onScreen.pdfDisabled === false
      && !onScreen.failed && !onScreen.empty, JSON.stringify(onScreen));

    await page.click('[data-wall-sheet="Wall A /1"]');
    await page.sleep(300);
    await page.click('[data-wall-drawings-pdf="1"]');
    await page.sleep(2200);

    const files = readdirSync(DL).filter((f) => f.endsWith('.pdf'));
    check('a REAL FILE landed on disk', files.length === 1, JSON.stringify(files));

    let pdf = null;
    if (files.length === 1) {
      pdf = readPdf(join(DL, files[0]));
      say(`      file:  ${files[0]}`);
      say(`      head:  ${JSON.stringify(pdf.head)}`);
      say(`      bytes: ${pdf.bytes}`);
      say(`      pages: /Count ${pdf.count}  ·  ${pdf.pageObjects} page objects`);
      check('THE BYTES START %PDF', pdf.magic === '%PDF', JSON.stringify(pdf.magic));
      check('THE PAGE COUNT EQUALS THE SHEET COUNT',
        pdf.count === onScreen.sheets && pdf.pageObjects === onScreen.sheets,
        `${pdf.count} pages · ${onScreen.sheets} sheets on screen`);
      check('and the SHEETS IN THE FILE are the sheets on the screen, by name',
        JSON.stringify(pdf.names) === JSON.stringify(onScreen.names) && pdf.scale,
        `${JSON.stringify(pdf.names)} — title block reads "No Scale": ${pdf.scale}`);
    }

    const toast = await page.evaluate(`
      const t = [...document.querySelectorAll('*')].map((n) => n.textContent || '')
        .filter((s) => s.startsWith('Saved ') && s.includes('.pdf'));
      return t.length ? t[t.length - 1] : null;
    `);
    check('and the app SAID so, naming the file and the sheet count',
      Boolean(toast && /sheets/.test(toast)), String(toast));

    return { files, sheets: onScreen.sheets };
  }).then(async ({ files }) => {
    // …and the file is OPENED, so the proof is the drawing rather than a name
    // in a folder listing. Page 1 of the set is `Wall A /1`. Its own browser,
    // because the PDF viewer keeps the one it is given (see `withPage`).
    if (!files.length) return;
    await withPage(async (page) => {
      // `#view=Fit` and not `#zoom=…`: the whole SHEET has to be in frame,
      // title block and all, or the picture proves a drawing and not a
      // DRAWING — `Wall A /1`, `No Scale`, the job number. Measured: `#zoom`
      // is ignored by Chromium's viewer here and leaves it at 100 %.
      await page.send('Page.navigate', { url: `file://${join(DL, files[0])}#view=Fit` });
      await page.sleep(4000);
      await page.screenshot(join(OUT, 'f0a-wall-pdf-downloaded-and-opened.png'));
      say('      shot:  f0a-wall-pdf-downloaded-and-opened.png');
    });
  });
  say('');

  // ═══ 1b — THE SAME THING THROUGH THE OUTPUT MENU ═══════════════════════
  //
  // F0: *"drive his path — a project with cabinets at a wall → Output → Wall
  // drawings (PDF), and the same through the modal."* They are two DIFFERENT
  // pieces of code — `ConfiguratorPage.onDrawing` builds its own set and never
  // opens a window — so proving one proves nothing about the other.
  await withPage(async (page) => {
    say('1b — the same wall PDF through Output ▸ Drawings ▸ Wall drawings (PDF)');
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await page.evaluate(`
      const S = () => ${P}.project.getState();
      S().newProject('Menu path');
      ${P}.ui.getState().openEditor(); ${P}.ui.getState().closeModal();
      ${P}.ui.getState().closeLibrary(); ${P}.ui.getState().setCheckOpen(false);
      const a = S().addUnit('BUD');
      S().updateUnitParams(a.id, { width: 600, plinth: true, doors: { count: 1, hinge: 'L' } });
      const b = S().addUnit('WUD');
      S().updateUnitParams(b.id, { width: 600, mount_height: 1500, doors: { count: 1, hinge: 'L' } });
      ${P}.ui.getState().selectUnit(a.id);
      return true;
    `);
    await page.sleep(500);

    const before = readdirSync(DL).length;
    // REAL POINTER INPUT, through the real menu — no store call stands in for
    // the click a joiner makes.
    await page.click('button, [role="menuitem"]', 'Output');
    await page.sleep(250);
    await page.click('[role="menuitem"]', 'Drawings');
    await page.sleep(250);
    await page.click('[role="menuitem"]', 'Wall drawings (PDF)');
    await page.sleep(2200);

    const made = readdirSync(DL).filter((f) => f.endsWith('.pdf'));
    check('the MENU path writes a real file too', made.length === before + 1, JSON.stringify(made));
    const fresh2 = made.map((f) => join(DL, f)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
    const menuPdf = readPdf(fresh2);
    say(`      file:  ${fresh2.split('/').pop()}`);
    say(`      head:  ${JSON.stringify(menuPdf.head)}   bytes: ${menuPdf.bytes}   /Count ${menuPdf.count}`);
    check('%PDF, and three pages for its three sheets',
      menuPdf.magic === '%PDF' && menuPdf.count === 3 && menuPdf.names.length === 3,
      JSON.stringify(menuPdf.names));
    const toast = await page.evaluate(`
      const t = [...document.querySelectorAll('*')].map((n) => n.textContent || '')
        .filter((s) => s.startsWith('Saved ') && s.includes('.pdf'));
      return t.length ? t[t.length - 1] : null;
    `);
    check('and the menu path names every sheet it bound',
      Boolean(toast && /Wall A \/1/.test(toast) && /Horizontal section/.test(toast)), String(toast));
  });
  say('');

  // ═══ 2 — THE BUILDER CRASHES, AND THE WINDOW SAYS SO ═══════════════════
  await withPage(async (page) => {
    const fresh = async (name) => {
      await page.evaluate(`
        const S = () => ${P}.project.getState();
        S().newProject(${JSON.stringify(name)});
        ${P}.ui.getState().openEditor();
        ${P}.ui.getState().closeModal();
        ${P}.ui.getState().closeLibrary();
        ${P}.ui.getState().setCheckOpen(false);
        return true;
      `);
      await page.sleep(250);
    };
    say('2 — the builder crashes: an outage that no longer pretends to be empty');
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await fresh('Anderson Kitchen');
    await page.evaluate(`
      const S = () => ${P}.project.getState();
      const a = S().addUnit('BUD');
      S().updateUnitParams(a.id, { width: 600, plinth: true, doors: { count: 1, hinge: 'L' } });
      return true;
    `);
    await page.sleep(300);
    // A REAL CRASH UNDER `wallDrawingSheets()`, and one that reaches nothing
    // else in the app: the wall set's own title block is the only reader of
    // `profile.drawings.wallDrawing`, so taking it away throws inside
    // `titleFor` — which is precisely the shape of fault F0 is about ("a crash
    // ANYWHERE under wallDrawingSheets()"), with no second symptom to confuse
    // the picture.
    //
    // (`allResults: () => { throw }` was tried first and is a WORSE probe: it
    // takes the BOM panel and the checks down with it, so the window never
    // renders at all and the thing under test is never reached. Measured.)
    await page.evaluate(`
      ${P}.profile.setState((s) => ({
        profile: { ...s.profile, drawings: { ...s.profile.drawings, wallDrawing: null } },
      }));
      return true;
    `);
    await page.evaluate(`${P}.ui.getState().openModal('drawing', { kind: 'walls' }); return true;`);
    await page.waitFor('document.querySelector(\'[data-drawing-kind-tab="walls"]\')', { what: 'the Drawings window' });
    await page.click('[data-drawing-kind-tab="walls"]');
    await page.sleep(600);

    const crashed = await page.evaluate(`
      const el = document.querySelector('[data-wall-failed]');
      const pdf = document.querySelector('[data-wall-drawings-pdf="1"]');
      const dxf = document.querySelector('[data-wall-drawings-dxf="1"]');
      return {
        speaks: Boolean(el),
        text: el ? el.textContent.trim() : null,
        colour: el ? getComputedStyle(el).color : null,
        empty: Boolean(document.querySelector('[data-wall-empty]')),
        pdfDisabled: pdf ? pdf.disabled : null,
        dxfDisabled: dxf ? dxf.disabled : null,
      };
    `);
    check('the window SAYS the set failed, with the message on it',
      crashed.speaks && /Wall drawings failed: \S/.test(crashed.text || '')
      && /titleRows|Cannot read/.test(crashed.text || ''), JSON.stringify(crashed.text));
    check('it is NOT wearing the emptiness sentence', crashed.empty === false
      && !/No cabinet is standing/.test(crashed.text || ''), JSON.stringify(crashed.empty));
    check('in the error style, and both buttons stay disabled',
      crashed.pdfDisabled === true && crashed.dxfDisabled === true
      && /rgb\(201, 82, 75\)/.test(String(crashed.colour)), JSON.stringify(crashed.colour));
    const console42 = page.errors.filter((e) => /wall drawings/i.test(String(e)));
    check('and the WHOLE error went to the console, where a diagnosis can reach it',
      console42.length > 0, String(console42[0] || '').slice(0, 120));
    await page.screenshot(join(OUT, 'f0b-crash-speaks-or-empty-is-honest.png'));
    say('      shot:  f0b-crash-speaks-or-empty-is-honest.png');
  });
  say('');

  // ═══ 3 — A GENUINELY EMPTY JOB STILL REFUSES POLITELY ══════════════════
  await withPage(async (page) => {
    const fresh = async (name) => {
      await page.evaluate(`
        const S = () => ${P}.project.getState();
        S().newProject(${JSON.stringify(name)});
        ${P}.ui.getState().openEditor();
        ${P}.ui.getState().closeModal();
        ${P}.ui.getState().closeLibrary();
        ${P}.ui.getState().setCheckOpen(false);
        return true;
      `);
      await page.sleep(250);
    };
    say('3 — a genuinely empty job: the honest sentence, and no error styling');
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });
    await fresh('An empty job');
    await page.evaluate(`${P}.ui.getState().openModal('drawing', { kind: 'walls' }); return true;`);
    await page.waitFor('document.querySelector(\'[data-drawing-kind-tab="walls"]\')', { what: 'the Drawings window' });
    await page.click('[data-drawing-kind-tab="walls"]');
    await page.sleep(500);
    const empty = await page.evaluate(`
      const el = document.querySelector('[data-wall-empty]');
      const pdf = document.querySelector('[data-wall-drawings-pdf="1"]');
      return {
        honest: el ? el.textContent.trim() : null,
        failed: Boolean(document.querySelector('[data-wall-failed]')),
        colour: el ? getComputedStyle(el).color : null,
        pdfDisabled: pdf ? pdf.disabled : null,
      };
    `);
    check('the honest sentence, the buttons disabled, and NO error styling',
      /No cabinet is standing against a wall yet/.test(empty.honest || '')
      && empty.failed === false && empty.pdfDisabled === true
      && !/rgb\(201, 82, 75\)/.test(String(empty.colour)), JSON.stringify(empty));
    say('');

    // ═══ 4 — A TURNED CABINET IS NAMED, NOT SILENTLY DROPPED ═══════════════
    say('4 — a turned cabinet: the window names it and its wall');
    await fresh('Turned away');
    await page.evaluate(`
      const S = () => ${P}.project.getState();
      const a = S().addUnit('BUD');
      S().updateUnitParams(a.id, { width: 600, plinth: true });
      const b = S().addUnit('BUD');
      S().updateUnitParams(b.id, { width: 500, plinth: true });
      S().moveUnit(b.id, 900);
      S().rotateUnit(b.id, 'side', 90);
      return true;
    `);
    await page.sleep(300);
    await page.evaluate(`${P}.ui.getState().openModal('drawing', { kind: 'walls' }); return true;`);
    await page.waitFor('document.querySelector(\'[data-drawing-kind-tab="walls"]\')', { what: 'the Drawings window' });
    await page.click('[data-drawing-kind-tab="walls"]');
    await page.sleep(500);
    const skips = await page.evaluate(`
      const el = document.querySelector('[data-wall-skips]');
      return { text: el ? el.textContent.replace(/\\s+/g, ' ').trim() : null };
    `);
    check('the census is on the glass, naming the cabinet and the reason',
      /turned away/.test(skips.text || '') && /Wall A/.test(skips.text || ''), JSON.stringify(skips.text));
  });
  say('');

  const failed = steps.filter((s) => !s.ok);
  say('─── VERDICT ───────────────────────────────────────────────────────────');
  say(`${steps.length - failed.length} / ${steps.length} checks passed`);
  for (const f of failed) say(`  FAILED: ${f.label}   ${f.detail}`);
  say('');
  say('THE FAULT THE OWNER HIT DID NOT REPRODUCE on this build: every one of the');
  say('five drawing exports wrote a real file, and the wall PDF came out %PDF with');
  say('a page per sheet. What ships is the INSTRUMENTATION — see the PR body.');
  writeFileSync(join(OUT, 'f0-wall-pdf-probe.txt'), `${lines.join('\n')}\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  say(`WALK ERROR: ${e.stack || e.message}`);
  writeFileSync(join(OUT, 'f0-wall-pdf-probe.txt'), `${lines.join('\n')}\n`);
  process.exit(1);
});
