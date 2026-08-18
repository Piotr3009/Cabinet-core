#!/usr/bin/env node
// ─── THE TURN 39 ACCEPTANCE WALK — ASSIGN MATERIALS → BOM ───────────────────
//
//   npm run build
//   npx vite preview --port 4173 &
//   node scripts/e2e-turn39.mjs [--only f3,f6,…] [--out verify/t39/]
//
// Iron rule 7: a screenshot per visible feature, REAL POINTER INPUT, and every
// picture asserts a NAMED SUBJECT — a selector or a literal string that must be
// on the glass when the shutter goes. A picture whose subject is missing is an
// EMPTY FRAME, which fails the step and the exit code.
//
// Iron rule 1: zero-stop. A phase that throws is recorded FAILED and the walk
// carries on to the next one.

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';

import { launch } from './cdp.mjs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:4173/';
const OUT = argOf('--out', new URL('../verify/t39/', import.meta.url).pathname);
const ONLY = argOf('--only', null);

function argOf(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const want = (id) => !ONLY || ONLY.split(',').map((s) => s.trim()).includes(id);

// ─── R1: REAL POINTER INPUT, AND THE GUARD THAT PROVES IT ───────────────────
// The string is assembled from two halves so the guard does not trip on itself.
const BANNED = ['dispatch', 'Event('].join('');
const SELF = readFileSync(new URL(import.meta.url), 'utf8');
if (SELF.includes(`.${BANNED}`)) {
  throw new Error(`R1: a pointer gesture in this walk is using ${BANNED}. Use CDP input.`);
}

mkdirSync(OUT, { recursive: true });

const steps = [];
const shots = [];
const P = 'window.__cc';

async function main() {
  const page = await launch({ headless: true, width: 1680, height: 1050 });

  const IGNORED = [/favicon\.ico/i, /supabase\.co\/storage/i, /storage\/v1\/object/i];
  const realErrors = (list) => list.filter((e) => !IGNORED.some((rx) => rx.test(String(e))));
  let errorMark = 0;
  const consoleSince = () => realErrors(page.errors.slice(errorMark));

  const check = (label, ok, detail = '') => {
    const errs = consoleSince();
    errorMark = page.errors.length;
    const clean = errs.length === 0;
    steps.push({
      label,
      ok: Boolean(ok) && clean,
      detail: typeof detail === 'string' ? detail : JSON.stringify(detail),
      ...(clean ? {} : { console: errs.slice(0, 4) }),
    });
    const line = `${Boolean(ok) && clean ? '  ok' : 'FAIL'}  ${label}${detail ? ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`;
    console.log(clean ? line : `${line}\n      R6: ${errs.slice(0, 2).join(' | ')}`);
  };

  /** R3 — the named subject. A picture that does not contain it is empty. */
  const shot = async (name, subject = null) => {
    let present = true;
    let detail = 'not asked';
    if (subject) {
      const seen = await page.evaluate(`
        const want = ${JSON.stringify(subject)};
        const out = {};
        if (want.all) {
          out.all = want.all.every((sel) => {
            const el = document.querySelector(sel);
            return Boolean(el && el.getClientRects().length);
          });
        }
        if (want.text) out.text = (document.body.innerText || '').includes(want.text);
        if (want.count) {
          out.count = Object.entries(want.count)
            .every(([sel, n]) => document.querySelectorAll(sel).length >= n);
        }
        return out;
      `);
      present = Object.values(seen).every(Boolean);
      detail = JSON.stringify(seen);
    }
    await page.screenshot(`${OUT}${name}.png`);
    shots.push({ name, subject, present, detail });
    if (!present) check(`RULE 3 — "${name}" contains its named subject`, false, detail);
    else console.log(`  📷  ${name}.png — ${detail}`);
    return present;
  };

  const phase = async (id, label, fn) => {
    if (!want(id)) { console.log(`  ··  ${id} skipped by --only`); return; }
    console.log(`\n── ${id.toUpperCase()} — ${label}`);
    try { await fn(); } catch (e) {
      check(`${id} — the phase ran`, false, e.message);
      console.log(`      ${e.stack?.split('\n').slice(0, 3).join('\n      ')}`);
    }
  };

  // ─── BOOT AND SEED ────────────────────────────────────────────────────────
  await page.goto(BASE);
  await page.evaluate('localStorage.clear(); return true;');
  await page.goto(BASE);
  await page.waitFor(`${P} && ${P}.project`, { what: 'the app to boot' });

  // Every line re-reads `getState()`: zustand hands back a SNAPSHOT, and a walk
  // that held one across an `addUnit` would be asking yesterday's store how
  // many cabinets there are.
  const seeded = await page.evaluate(`
    const S = () => ${P}.project.getState();
    S().newProject('Turn 39 walk');
    ${P}.ui.getState().openEditor();
    ${P}.ui.getState().closeModal();
    ${P}.ui.getState().closeLibrary();
    // A wardrobe and a kitchen base — two FAMILIES, so the per-family override
    // and the project-is-the-sum claim both have something to stand on.
    const w = S().addUnit('WARDROBE');
    S().updateUnitParams(w.id, { doors: true, width: 1200, height: 2150, shelves: 3, rail: true, plinth: true });
    S().addShelves(w.id, 3);
    S().addDrawers(w.id, 2);
    const b = S().addUnit('BUD');
    S().updateUnitParams(b.id, { doors: true, width: 600, plinth: true });
    S().addShelves(b.id, 1);
    window.__t39 = { wardrobeId: w.id, budId: b.id };
    const r = S().unitResult(w.id);
    return {
      units: S().units.length,
      parts: r.panels.length,
      kinds: [...new Set(r.panels.map((p) => p.part))].sort().join(','),
    };
  `);
  check('the scene is seeded — a wardrobe and a base unit', seeded.units === 2, JSON.stringify(seeded));

  // ═════════════════════════════════════════════════════════════════════════
  // F3 — THE ASSIGN MATERIALS MODAL
  // ═════════════════════════════════════════════════════════════════════════
  await phase('f3', 'Assign materials — the unassigned are marked', async () => {
    // Opened the way a joiner opens it: Database ▸ Assign materials…, with a
    // real pointer on both.
    await page.click('button', 'Database');
    await page.sleep(250);
    await shot('f3a-database-menu-carries-assign-materials', { text: 'Assign materials' });
    await page.click('button', 'Assign materials');
    await page.waitFor('document.querySelector(\'[data-assign-materials="1"]\')', { what: 'the Assign Materials modal' });
    await page.sleep(500);

    const opened = await page.evaluate(`
      const el = document.querySelector('[data-assign-counter]');
      return { counter: el && el.getAttribute('data-assign-counter'),
               groups: document.querySelectorAll('[data-assign-group]').length,
               rows: document.querySelectorAll('[data-assign-part]').length };
    `);
    check('the modal opens with the seven registry groups', opened.groups === 7, JSON.stringify(opened));
    check('…and a running counter of what is unassigned', Number(opened.counter) > 0, `counter=${opened.counter}`);

    // R4 — the claim is the APP's own arithmetic, not the walk's.
    const truth = await page.evaluate(`
      const s = ${P}.project.getState();
      const entries = s.allResults();
      const profile = ${P}.profile.getState().profile;
      const data = ${P}.materials.getState().data;
      const missing = window.__ccT39.bom.unassignedInUse(entries, { assignments: data, profile, design: s.project.design });
      return { missing: missing.length, ids: missing.map((m) => m.partId) };
    `);
    check('the counter IS the engine’s own answer', Number(opened.counter) === truth.missing,
      `screen=${opened.counter} engine=${truth.missing}`);

    // The MARK — underlined, coloured, dotted. This is the proof CLAUDE.md F3
    // names by name.
    const marked = await page.evaluate(`
      const rows = [...document.querySelectorAll('[data-assign-part]')];
      const missing = rows.filter((r) => r.getAttribute('data-assign-missing') === '1');
      const underlined = missing.filter((r) => {
        const span = r.querySelector('td span');
        return span && /underline/.test(span.className);
      });
      const dotted = [...document.querySelectorAll('[data-assign-group-missing]')]
        .filter((g) => Number(g.getAttribute('data-assign-group-missing')) > 0).length;
      return { rows: rows.length, missing: missing.length, underlined: underlined.length, groupsWithDots: dotted };
    `);
    check('every unassigned row is UNDERLINED and coloured',
      marked.missing > 0 && marked.underlined === marked.missing, JSON.stringify(marked));
    check('…and the group list carries a dot for each group with something missing',
      marked.groupsWithDots > 0, `${marked.groupsWithDots} groups dotted`);

    await shot('f3-assign-materials-unassigned-marked', {
      all: ['[data-assign-materials="1"]', '[data-assign-counter]', '[data-assign-group="board"]'],
      text: 'parts unassigned',
      count: { '[data-assign-part]': 4, '[data-assign-missing="1"]': 3 },
    });

    // ── A REAL ASSIGNMENT, made with the pointer ─────────────────────────────
    const before = await page.evaluate(`
      return Number(document.querySelector('[data-assign-counter]').getAttribute('data-assign-counter'));
    `);
    await page.click('[data-material-picker="carcase_side"]');
    await page.waitFor('document.querySelector(\'[data-material-picker-panel="1"]\')', { what: 'the material picker' });
    await page.sleep(300);
    await shot('f3b-material-picker-open-on-carcase-sides', {
      all: ['[data-material-picker-panel="1"]', '[data-material-search="1"]'],
      count: { '[data-material-option]': 3 },
    });
    const pickedId = await page.evaluate(`
      const first = document.querySelector('[data-material-option]');
      return first ? first.getAttribute('data-material-option') : null;
    `);
    await page.click(`[data-material-option="${pickedId}"]`);
    await page.sleep(500);

    const after = await page.evaluate(`
      const s = ${P}.materials.getState();
      return {
        counter: Number(document.querySelector('[data-assign-counter]').getAttribute('data-assign-counter')),
        stored: s.assignments.carcase_side ? s.assignments.carcase_side.material_id : null,
        marked: document.querySelector('[data-assign-part="carcase_side"]').getAttribute('data-assign-missing'),
      };
    `);
    check('a pointer-made assignment reaches the store', after.stored === pickedId,
      `stored=${after.stored} picked=${pickedId}`);
    check('…the row stops being marked', after.marked === '0', `marked=${after.marked}`);
    check('…and the counter drops by exactly one', after.counter === before - 1,
      `${before} → ${after.counter}`);
    await shot('f3c-carcase-sides-assigned-counter-drops', {
      all: ['[data-assign-part="carcase_side"][data-assign-missing="0"]'],
    });

    // ── THE OWNER'S OWN QUESTION: BUL and BUR are ONE ROW ───────────────────
    const collapse = await page.evaluate(`
      const reg = window.__ccT39.partRegistry;
      const rows = [...document.querySelectorAll('[data-assign-part]')].map((r) => r.getAttribute('data-assign-part'));
      return {
        bul: reg.ELEMENT_TO_PART_ID.BUL,
        bur: reg.ELEMENT_TO_PART_ID.BUR,
        rowsForSides: rows.filter((id) => id === 'carcase_side').length,
      };
    `);
    check('BUL and BUR are ONE assignable row — the owner’s question, on the glass',
      collapse.bul === 'carcase_side' && collapse.bur === 'carcase_side' && collapse.rowsForSides === 1,
      JSON.stringify(collapse));

    // ── THE PER-FAMILY OVERRIDE ────────────────────────────────────────────
    await page.click('[data-assign-override="carcase_side"]');
    await page.sleep(350);
    // The literal is UPPER CASE because `.cc-label` is `uppercase` and
    // `innerText` reports what is on the glass, not what is in the JSX.
    await shot('f3d-per-family-override-open', {
      all: ['[data-material-picker="carcase_side@wardrobe"]', '[data-material-picker="carcase_side@base"]'],
      text: 'PER CABINET FAMILY',
      count: { '[data-material-picker^="carcase_side@"]': 5 },
    });
    check('the override row offers all five families',
      await page.evaluate(`return document.querySelectorAll('[data-material-picker^="carcase_side@"]').length === 5;`),
      'five families');
  });

  // ─── REPORT ───────────────────────────────────────────────────────────────
  const failed = steps.filter((s) => !s.ok);
  const empty = shots.filter((s) => !s.present);
  writeFileSync(`${OUT}report.json`, `${JSON.stringify({
    turn: 39, when: new Date().toISOString(), steps, shots, failed: failed.length, emptyFrames: empty.length,
  }, null, 1)}\n`);
  console.log(`\n${steps.length - failed.length}/${steps.length} checks, ${shots.length} pictures, ${empty.length} empty frames`);
  if (failed.length) console.log(`FAILED:\n  ${failed.map((f) => `${f.label} — ${f.detail}`).join('\n  ')}`);
  await page.close();
  process.exit(failed.length || empty.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
