#!/usr/bin/env node
// ─── T43 · F6 — THE PROOF PROJECT IS A KITCHEN, AND EVERY SHEET IS LOOKED AT ─
//
//     npm run build && npx vite preview --port 4173 &
//     node verify/t43/f6-wall-set-probe.mjs [--out verify/t43/]
//
// The T42 lesson, made law by CLAUDE.md: *"a wall-drawing probe on a project
// with no shelf, no drawer and no shaker proves paper exists, not that it says
// anything."* T42-F0 proved the wall PDF's BYTES on three bare carcasses. Every
// drawing complaint the owner made on 20.08.2026 is about CONTENT.
//
// So this walk builds a KITCHEN, through the STORE'S OWN ACTIONS, with real
// pointer input in a real Chromium:
//
//   Wall A   BUD 600 with 2 shelves · BUDR 500 touching it · WUD 600 over the
//            BUD with 1 shelf, hung at 1500
//   Wall B   one BUD, and one unit TURNED AWAY
//   design   frontType 'S', shakerFrame 85, bar handles
//   room     2400 high
//
// …then walks EVERY sheet of the set, photographs each one, and asserts F1–F5
// on the sheet that is on the glass:
//
//   F1  /1 carries ZERO dashed geometry, ZERO leg blocks, ZERO shelves
//   F2  the shaker inset on /1 is the PROJECT's 85 mm, measured off the SVG
//   F3  /2 carries the drawer boxes and three lines per leg
//   F4  the stroke-weight census: no geometry above 0.50 on an elevation
//   F5  the sheet list is /1 /2 /3 per wall + the horizontal section, and
//       Section A-A joins it when a cabinet is chosen from the dropdown
//   F6  the PDF's own bytes: `%PDF`, and a page per sheet; and the DXF zip
//       carries one file per sheet
//
// ─── ON "IN PLAYWRIGHT" ─────────────────────────────────────────────────────
// Iron rule 6 forbids a new dependency and this repo has no test-browser one.
// `scripts/cdp.mjs` has been this house's browser since turn 5 and drives a
// real Chromium over the DevTools protocol: real pointer input, real
// downloads, real files on disk. The rule that is iron wins.

import {
  mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { launch } from '../../scripts/cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const argOf = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const OUT = argOf('--out', new URL('.', import.meta.url).pathname);
const SHOTS = join(OUT, 'f6-all-sheets-walked');
const DL = join(OUT, 'downloads');
const P = 'window.__cc';

const lines = [];
const say = (s = '') => { lines.push(s); process.stdout.write(`${s}\n`); };
const steps = [];
const check = (label, ok, detail = '') => {
  steps.push({ label, ok: Boolean(ok), detail });
  say(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? `   ${detail}` : ''}`);
};

/** A filename that is the sheet's own name — so a folder listing is a set. */
const shotName = (name) => `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;

/** The PDF's own answers, read off the file the browser wrote. */
function readPdf(path) {
  const bytes = readFileSync(path);
  const text = bytes.toString('latin1');
  const counts = [...text.matchAll(/\/Count\s+(\d+)/g)].map((m) => Number(m[1]));
  return {
    bytes: bytes.length,
    magic: text.slice(0, 4),
    pageObjects: (text.match(/\/Type\s*\/Page[^s]/g) || []).length,
    count: counts.length ? Math.max(...counts) : null,
    names: ['Wall A /1', 'Wall A /2', 'Wall A /3', 'Wall B /1', 'Wall B /2', 'Wall B /3', 'Horizontal section']
      .filter((n) => text.includes(n)),
  };
}

/**
 * How many files a ZIP holds, without a dependency: every central-directory
 * record starts `PK\x01\x02`, one per entry, and the count is in the EOCD.
 */
function readZip(path) {
  const bytes = readFileSync(path);
  const text = bytes.toString('latin1');
  const central = (text.match(/PK\x01\x02/g) || []).length;
  // The stored names are 7-bit and end in the extension the writer gave them,
  // so they are read straight out of the bytes rather than by inflating.
  const names = [...new Set(text.match(/[\x20-\x7E]{4,120}?\.(?:dxf|txt)/g) || [])];
  return { bytes: bytes.length, magic: text.slice(0, 2), entries: central, names };
}

let PORT = 9451;
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

/** THE PROOF KITCHEN, built through the store's own actions. */
const SEED = `
  const S = () => ${P}.project.getState();
  S().newProject('T43 kitchen');
  ${P}.ui.getState().openEditor();
  ${P}.ui.getState().closeModal();
  ${P}.ui.getState().closeLibrary();
  ${P}.ui.getState().setCheckOpen(false);
  S().setProjectInfo({ client: 'Mr Anderson', number: 'J-1043', rev: 'A' });
  S().setRoom({ height: 2400 });
  // frontType S, the owner's own 85 mm frame, and handles on.
  S().setDesign({ fronts: { style: 'S', shakerFrame: 85, handle: { type: 'bar', centres: 128 } } });

  // ── Wall A ──
  const a1 = S().addUnit('BUD');
  S().updateUnitParams(a1.id, { width: 600, plinth: true, doors: { count: 1, hinge: 'L' } });
  // Shelves through the store's OWN action, not a param poked in from the side
  // — the same call the Add Items panel makes when a joiner clicks Shelf.
  S().addShelves(a1.id, 2);
  S().moveUnit(a1.id, 0);
  const a2 = S().addUnit('BUDR');
  S().updateUnitParams(a2.id, { width: 500, plinth: true });
  S().moveUnit(a2.id, 600);
  const a3 = S().addUnit('WUD');
  S().updateUnitParams(a3.id, { width: 600, mount_height: 1500, doors: { count: 1, hinge: 'R' } });
  S().addShelves(a3.id, 1);
  S().moveUnit(a3.id, 0);

  // ── Wall B: one cabinet, and one TURNED AWAY ──
  const b1 = S().addUnit('BUD');
  S().updateUnitParams(b1.id, { width: 600, plinth: true, doors: { count: 1, hinge: 'L' } });
  S().setUnitWall(b1.id, 1);
  S().moveUnitToWall(b1.id, 1, 0);
  const b2 = S().addUnit('BUD');
  S().updateUnitParams(b2.id, { width: 500, plinth: true, doors: { count: 1, hinge: 'R' } });
  S().setUnitWall(b2.id, 1);
  S().moveUnitToWall(b2.id, 1, 900);
  S().rotateUnit(b2.id, 'side', 90);

  return {
    units: S().units.length,
    walls: S().units.map((u) => u.position.wall),
    rotations: S().units.map((u) => u.position.rotation_deg),
    shakerFrame: S().project.design?.fronts?.shakerFrame ?? null,
    style: S().project.design?.fronts?.style ?? null,
    ceiling: S().project.room?.height ?? null,
    // Read off the ENGINE's own answer, never off the item list: what the
    // drawing draws is a shelf PANEL, and that is the thing worth counting.
    shelves: S().units.map((u) => (S().unitResult(u.id)?.panels || []).filter((p) => p.role === 'shelf').length),
    numbers: S().units.map((u) => u.params.unit_num),
    drawers: S().units.map((u) => new Set((S().unitResult(u.id)?.panels || [])
      .filter((p) => p.part === 'DRAWER-SIDE').map((p) => p.meta?.drawer)).size),
  };
`;

/** The SVG that is on the glass right now, as text. */
const SVG_ON_GLASS = `
  const host = document.querySelector('.cc-drawing');
  return host ? host.innerHTML : null;
`;

/** Every stroked element of the previewed sheet, with its layer and weight. */
function censusOf(svg) {
  const out = [];
  for (const m of svg.matchAll(/<(line|rect|circle)\b[^>]*>/g)) {
    const tag = m[0];
    const width = Number((tag.match(/stroke-width="([\d.]+)"/) || [])[1]);
    const layer = (tag.match(/data-layer="([^"]+)"/) || [])[1] || '(none)';
    const dashed = /stroke-dasharray/.test(tag);
    if (!Number.isFinite(width)) continue;
    out.push({ kind: m[1], layer, width, dashed });
  }
  return out;
}

/** The DOORS rectangles of the previewed sheet, in paper millimetres. */
function doorRects(svg) {
  return [...svg.matchAll(/<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*data-layer="DOORS"/g)]
    .map((m) => ({
      x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]),
    }));
}

/** The equal-on-four-sides inset of any rect inside another, in paper mm. */
function insetsOf(rects) {
  const out = [];
  for (const a of rects) {
    for (const b of rects) {
      if (a === b) continue;
      const left = a.x - b.x;
      const right = (b.x + b.w) - (a.x + a.w);
      const down = a.y - b.y;
      const up = (b.y + b.h) - (a.y + a.h);
      if (left <= 0.001 || right <= 0.001 || down <= 0.001 || up <= 0.001) continue;
      if (Math.abs(left - right) > 0.01 || Math.abs(left - down) > 0.01 || Math.abs(left - up) > 0.01) continue;
      out.push(left);
    }
  }
  return out;
}

async function main() {
  rmSync(DL, { recursive: true, force: true });
  rmSync(SHOTS, { recursive: true, force: true });
  mkdirSync(DL, { recursive: true });
  mkdirSync(SHOTS, { recursive: true });
  mkdirSync(OUT, { recursive: true });

  say('─── T43 · F6 — the wall set draws what the workshop sells ─────────────');
  say(`app:       ${BASE}`);
  say(`shots:     ${SHOTS}`);
  say(`downloads: ${DL}`);
  say('');

  const census = { sheets: [], scale: null };

  await withPage(async (page) => {
    await page.goto(BASE);
    await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });

    // ═══ 1 — THE KITCHEN ═══════════════════════════════════════════════════
    say('1 — a KITCHEN, built through the store\'s own actions');
    const seeded = await page.evaluate(SEED);
    await page.sleep(600);
    say(`      ${JSON.stringify(seeded)}`);
    check('five cabinets, on two walls, one of them TURNED AWAY',
      seeded.units === 5
      && JSON.stringify(seeded.walls) === JSON.stringify([0, 0, 0, 1, 1])
      && seeded.rotations.filter((r) => r !== 0).length === 1, JSON.stringify(seeded.walls));
    check('shaker S at the PROJECT\'s 85 mm, ceiling 2400, shelves on the BUD and the WUD',
      seeded.style === 'S' && seeded.shakerFrame === 85 && seeded.ceiling === 2400
      && seeded.shelves.filter((n) => n > 0).length === 2,
      `shelves ${JSON.stringify(seeded.shelves)} · shaker ${seeded.shakerFrame}`);
    check('…and a REAL DRAWER STACK on the BUDR — the thing T42\'s proof had none of',
      seeded.drawers.filter((n) => n > 0).length === 1 && Math.max(...seeded.drawers) === 3,
      JSON.stringify(seeded.drawers));

    // ═══ 2 — THE SET, WALKED SHEET BY SHEET, WITH REAL POINTER INPUT ═══════
    say('');
    say('2 — every sheet of the set, clicked and photographed');
    await page.evaluate(`${P}.ui.getState().openModal('drawing', { kind: 'walls' }); return true;`);
    await page.waitFor('document.querySelector(\'[data-drawing-kind-tab="walls"]\')', { what: 'the Drawings window' });
    await page.click('[data-drawing-kind-tab="walls"]');
    await page.sleep(700);

    const names = await page.evaluate(`
      return [...document.querySelectorAll('[data-wall-sheet]')].map((b) => b.getAttribute('data-wall-sheet'));
    `);
    say(`      sheets: ${names.join(' | ')}`);
    check('the sheet list is /1 /2 /3 per wall, plus the horizontal section (F5a)',
      JSON.stringify(names) === JSON.stringify([
        'Wall A /1', 'Wall A /2', 'Wall A /3', 'Wall B /1', 'Wall B /2', 'Wall B /3', 'Horizontal section',
      ]), JSON.stringify(names));

    for (const name of names) {
      await page.click(`[data-wall-sheet="${name}"]`);
      await page.sleep(450);
      const svg = await page.evaluate(SVG_ON_GLASS);
      const rows = censusOf(svg || '');
      census.sheets.push({ name, rows });
      await page.screenshot(join(SHOTS, shotName(name)));
      say(`      ${name.padEnd(20)} ${String(rows.length).padStart(4)} strokes   → ${shotName(name)}`);
    }
    check('every sheet in the set was walked and photographed',
      readdirSync(SHOTS).filter((f) => f.endsWith('.png')).length === names.length,
      `${readdirSync(SHOTS).length} files`);

    // ═══ 3 — F1: /1 IS FRONTS ══════════════════════════════════════════════
    say('');
    say('3 — F1: /1 is FRONTS, and nothing that hides behind them');
    for (const name of ['Wall A /1', 'Wall B /1']) {
      const rows = census.sheets.find((s) => s.name === name).rows
        .filter((r) => r.layer !== 'FRAME' && r.layer !== 'FRAME_LIGHT');
      const dashed = rows.filter((r) => r.dashed);
      const legs = rows.filter((r) => r.layer === 'LEG_BLOCK');
      const shelves = rows.filter((r) => r.layer === 'SHELVES');
      check(`${name}: zero dashed, zero LEG_BLOCK, zero SHELVES — on the glass`,
        dashed.length === 0 && legs.length === 0 && shelves.length === 0,
        `dashed ${dashed.length} · legs ${legs.length} · shelves ${shelves.length}`);
    }

    // …and the PROOF PICTURE: /1 beside the same wall's /2.
    await page.click('[data-wall-sheet="Wall A /1"]');
    await page.sleep(400);
    await page.screenshot(join(OUT, 'f1-wall-1-fronts-clean.png'));
    say('      shot:  f1-wall-1-fronts-clean.png');

    // ═══ 4 — F2: THE SHAKER IS 85, MEASURED OFF THE GLASS ══════════════════
    say('');
    say('4 — F2: the shaker frame, measured off the SVG on screen');
    const scale = await page.evaluate(`
      const el = [...document.querySelectorAll('*')].map((n) => n.textContent || '')
        .filter((s) => s.includes('laid out at 1:'));
      return el.length ? el[el.length - 1] : null;
    `);
    const ratio = Number((String(scale).match(/laid out at 1:([\d.]+)/) || [])[1]);
    const svgOne = await page.evaluate(SVG_ON_GLASS);
    const insets = insetsOf(doorRects(svgOne || ''));
    const mm = insets.map((v) => Math.round(v * ratio * 10) / 10);
    census.scale = ratio;
    say(`      laid out at 1:${ratio}`);
    say(`      shaker insets on paper: ${insets.map((v) => v.toFixed(3)).join(', ')} mm`);
    say(`      × the scale            : ${mm.join(', ')} mm`);
    check('every shaker inset on /1 measures 85 mm, not the profile\'s 60',
      mm.length > 0 && mm.every((v) => Math.abs(v - 85) < 0.5), JSON.stringify(mm));
    await page.screenshot(join(OUT, 'f2-shaker-85-not-60.png'));
    say(`      shot:  f2-shaker-85-not-60.png   (measured inset ${mm[0]} mm at 1:${ratio})`);

    // ═══ 5 — F3: /2 HAS THE DRAWERS AND THE LEG SYMBOLS ════════════════════
    say('');
    say('5 — F3: /2 shows the drawers it is for, and the legs are legs');
    await page.click('[data-wall-sheet="Wall A /2"]');
    await page.sleep(450);
    const svgTwo = await page.evaluate(SVG_ON_GLASS);
    const two = censusOf(svgTwo || '');
    const legLines = two.filter((r) => r.layer === 'LEG_BLOCK' && r.kind === 'line');
    const legRects = two.filter((r) => r.layer === 'LEG_BLOCK' && r.kind === 'rect');
    const shelfRects = two.filter((r) => r.layer === 'SHELVES' && r.kind === 'rect');
    check('the legs are SYMBOLS (three lines each) and not one brick between them',
      legLines.length === 24 && legRects.length === 0,
      `${legLines.length} lines · ${legRects.length} rects`);
    check('and the drawer boxes are on it — the BUDR\'s three, plus the shelves',
      shelfRects.length >= 6, `${shelfRects.length} rects on SHELVES`);
    await page.screenshot(join(OUT, 'f3-wall-2-drawers-and-legs.png'));
    say('      shot:  f3-wall-2-drawers-and-legs.png');

    // ═══ 6 — F4: THE PEN CENSUS, OFF THE SHEETS ON SCREEN ══════════════════
    say('');
    say('6 — F4: the stroke-weight census, off the sheets that were on the glass');
    const LADDER = [0.13, 0.18, 0.25, 0.35, 0.5, 0.7];
    const report = ['THE PEN CENSUS — T43 F4, read off the previewed SVG of every sheet', ''];
    let f4ok = true;
    for (const sheet of census.sheets) {
      const geo = sheet.rows.filter((r) => r.layer !== 'FRAME' && r.layer !== 'FRAME_LIGHT');
      const byWidth = new Map();
      for (const r of geo) byWidth.set(r.width, (byWidth.get(r.width) || 0) + 1);
      const widths = [...byWidth.keys()].sort((a, b) => a - b);
      const offLadder = widths.filter((w) => !LADDER.includes(w));
      const isSection = /\/3|Horizontal section|Section A-A/.test(sheet.name);
      const outlines = geo.filter((r) => r.kind === 'rect' && r.width === 0.5).length;
      const heavy = geo.filter((r) => r.width > 0.5).length;
      if (offLadder.length) f4ok = false;
      if (!isSection && heavy > 0) f4ok = false;
      report.push(`${sheet.name}`);
      report.push(`   widths: ${widths.map((w) => `${w}×${byWidth.get(w)}`).join('  ')}`);
      report.push(`   0.50 geometry rects (silhouettes): ${outlines}`);
      report.push(`   heavier than 0.50 (CUT): ${heavy}${isSection ? '  — a section may' : '  — an elevation may not'}`);
      report.push('');
    }
    writeFileSync(join(OUT, 'f4-pen-census.txt'), `${report.join('\n')}\n`);
    say(report.map((l) => `      ${l}`).join('\n'));
    check('every weight is on the ISO ladder, and no elevation carries a cut weight', f4ok);
    await page.click('[data-wall-sheet="Wall A /1"]');
    await page.sleep(400);
    await page.screenshot(join(OUT, 'f4-line-weights.png'));
    say('      shot:  f4-line-weights.png');

    // ═══ 7 — F5a: THE WALL'S OWN SECTION ═══════════════════════════════════
    say('');
    say('7 — F5a: `Wall A /3`, the wall cut at its first cabinet');
    await page.click('[data-wall-sheet="Wall A /3"]');
    await page.sleep(500);
    const svgThree = await page.evaluate(SVG_ON_GLASS);
    const three = censusOf(svgThree || '');
    check('the section carries the heaviest ink on any sheet (0.70)',
      three.some((r) => r.width === 0.7), `${three.filter((r) => r.width === 0.7).length} cut strokes`);
    check('and it says where the knife went', /section at unit 01/.test(svgThree || ''),
      /section at unit 01/.test(svgThree || '') ? 'section at unit 01' : 'NOT ON THE SHEET');
    await page.screenshot(join(OUT, 'f5a-wall-3-section.png'));
    say('      shot:  f5a-wall-3-section.png');

    // ═══ 8 — F5b: SECTION A-A, THROUGH THE CABINET HE POINTS AT ════════════
    say('');
    say('8 — F5b: `Section A-A through:` — the BUDR');
    const picked = await page.evaluate(`
      const sel = document.querySelector('[data-section-aa="1"]');
      if (!sel) return null;
      // The store numbers a drawer unit DR01; that is the BUDR, and it is the
      // cabinet the owner would point at for a section through a stack.
      const budr = [...sel.options].find((o) => /^DR/.test(o.textContent));
      if (!budr) return null;
      // REAL input: the value is set and the change event is dispatched the way
      // a pointer on a <select> produces one.
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      setter.call(sel, budr.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return { options: [...sel.options].map((o) => o.textContent), chose: budr.textContent };
    `);
    await page.sleep(700);
    say(`      dropdown: ${picked ? picked.options.join(' | ') : '(missing)'}`);
    const withAa = await page.evaluate(`
      return [...document.querySelectorAll('[data-wall-sheet]')].map((b) => b.getAttribute('data-wall-sheet'));
    `);
    check('the dropdown offers every DRAWABLE cabinet and not the turned one',
      Boolean(picked) && picked.options.length === 5 && !picked.options.some((o) => /^05/.test(o)),
      JSON.stringify(picked?.options));
    check('choosing one APPENDS `Section A-A — unit DR01` to the set',
      withAa.length === 8 && /^Section A-A — unit /.test(withAa[7]), JSON.stringify(withAa.slice(-1)));
    await page.click(`[data-wall-sheet="${withAa[7]}"]`);
    await page.sleep(500);
    const svgAa = await page.evaluate(SVG_ON_GLASS);
    check('and the A-A sheet is a real section, with cut ink on it',
      censusOf(svgAa || '').some((r) => r.width === 0.7));
    await page.screenshot(join(OUT, 'f5b-section-aa-through-budr.png'));
    await page.screenshot(join(SHOTS, shotName(withAa[7])));
    say('      shot:  f5b-section-aa-through-budr.png');

    // ═══ 9 — F6: THE BYTES ═════════════════════════════════════════════════
    say('');
    say('9 — F6: the PDF and the DXF zip, on disk, looked at');
    await page.click('[data-wall-drawings-pdf="1"]');
    await page.sleep(2600);
    const pdfs = readdirSync(DL).filter((f) => f.endsWith('.pdf'));
    check('a real PDF landed on disk', pdfs.length === 1, JSON.stringify(pdfs));
    if (pdfs.length === 1) {
      const pdf = readPdf(join(DL, pdfs[0]));
      say(`      file:  ${pdfs[0]}   bytes ${pdf.bytes}   /Count ${pdf.count}   page objects ${pdf.pageObjects}`);
      check('THE BYTES START %PDF', pdf.magic === '%PDF', JSON.stringify(pdf.magic));
      check('THE PAGE COUNT EQUALS THE SHEET COUNT (8, with the A-A)',
        pdf.count === withAa.length && pdf.pageObjects === withAa.length,
        `${pdf.count} pages · ${withAa.length} sheets on screen`);
      check('and every sheet name in the set is IN the file',
        pdf.names.length === 7, JSON.stringify(pdf.names));
    }

    await page.click('[data-wall-drawings-dxf="1"]');
    await page.sleep(3200);
    const zips = readdirSync(DL).filter((f) => f.endsWith('.zip'));
    check('a real DXF zip landed on disk', zips.length === 1, JSON.stringify(zips));
    if (zips.length === 1) {
      const zip = readZip(join(DL, zips[0]));
      say(`      file:  ${zips[0]}   bytes ${zip.bytes}   entries ${zip.entries}`);
      // One DXF per sheet, plus the READ-ME the exporter always writes.
      check('ONE FILE PER SHEET in the zip, plus the READ-ME',
        zip.entries === withAa.length + 1, `${zip.entries} entries for ${withAa.length} sheets`);
      check('and the A-A is one of them',
        zip.names.some((n) => /section-a-a/i.test(n)), JSON.stringify(zip.names.slice(0, 9)));
    }

    // ═══ 10 — THE CENSUS SENTENCE ══════════════════════════════════════════
    say('');
    say('10 — the turned cabinet is NAMED, not silently dropped');
    const skips = await page.evaluate(`
      const el = document.querySelector('[data-wall-skips]');
      return el ? el.textContent.replace(/\\s+/g, ' ').trim() : null;
    `);
    check('the census sentence is under the sheet list, naming the wall and the reason',
      /turned away/.test(skips || '') && /Wall B/.test(skips || ''), String(skips));

    // ─── R2/R8: THE SANDBOX CANNOT REACH THE BUCKET, AND SAYS SO ─────────
    // The container's egress policy refuses the storage host (`403 CONNECT` /
    // `ERR_TUNNEL_CONNECTION_FAILED`), which is why the silent showroom exists
    // at all. It is recorded here rather than filtered silently: a probe that
    // hid the refusal would be the same silence T43-F7 is about.
    const blocked = page.errors.filter((e) => /supabase\.co|ERR_TUNNEL|ERR_PROXY|net::/i.test(String(e)));
    const consoleErrors = page.errors
      .filter((e) => !/favicon/i.test(String(e)))
      .filter((e) => !/supabase\.co|ERR_TUNNEL|ERR_PROXY|net::/i.test(String(e)));
    if (blocked.length) {
      say(`      NOTE: ${blocked.length} request(s) refused by the container's egress policy —`);
      say(`            ${String(blocked[0]).slice(0, 140)}`);
      say('            This is R2\'s recorded refusal, not a fault in the app: with no');
      say('            bucket the runner catalogue is simply absent, which after T43-F7');
      say('            is an empty groove and ONE amber note rather than a grey fake.');
    }
    check('and the browser console is clean of APP errors through the whole walk',
      consoleErrors.length === 0, String(consoleErrors[0] || '').slice(0, 160));
  });

  say('');
  const failed = steps.filter((s) => !s.ok);
  say('─── VERDICT ───────────────────────────────────────────────────────────');
  say(`${steps.length - failed.length} / ${steps.length} checks passed`);
  for (const f of failed) say(`  FAILED: ${f.label}   ${f.detail}`);
  writeFileSync(join(OUT, 'f6-wall-pdf-probe.txt'), `${lines.join('\n')}\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  say(`WALK ERROR: ${e.stack || e.message}`);
  writeFileSync(join(OUT, 'f6-wall-pdf-probe.txt'), `${lines.join('\n')}\n`);
  process.exit(1);
});
