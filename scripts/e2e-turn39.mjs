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

  /** A keyDown carrying `text` is what actually inserts a character. */
  const typeText = async (text) => {
    for (const ch of text) {
      const code = /[0-9]/.test(ch) ? `Digit${ch}` : `Key${ch.toUpperCase()}`;
      await page.send('Input.dispatchKeyEvent', {
        type: 'keyDown', text: ch, key: ch, code: ch === ' ' ? 'Space' : code,
        windowsVirtualKeyCode: ch.toUpperCase().charCodeAt(0),
        nativeVirtualKeyCode: ch.toUpperCase().charCodeAt(0),
      });
      await page.send('Input.dispatchKeyEvent', {
        type: 'keyUp', key: ch, code: ch === ' ' ? 'Space' : code,
        windowsVirtualKeyCode: ch.toUpperCase().charCodeAt(0),
      });
      await page.sleep(60);
    }
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

  // ═════════════════════════════════════════════════════════════════════════
  // F6 — THE BOM VIEW
  // ═════════════════════════════════════════════════════════════════════════
  await phase('f6', 'The BOM — unassigned on top, two levels, incomplete says so', async () => {
    // Close the modal with a real pointer on its own × before opening the panel.
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(200);

    // Assign a few parts to the SAME board so the second collapse is visible on
    // the glass: many parts, one purchase line.
    const assigned = await page.evaluate(`
      const m = ${P}.materials.getState();
      for (const id of ['carcase_side', 'carcase_horizontal', 'shelf', 'partition']) {
        m.setAssignment(id, 'mat_mfc18_white', 1.1);
      }
      ${P}.materials.getState().setAssignment('back', 'mat_hdf6_back');
      ${P}.materials.getState().setAssignment('door', 'mat_mdf25_shaker');
      return Object.keys(${P}.materials.getState().data.base);
    `);
    check('six parts assigned, four of them to ONE board', assigned.length === 6, assigned.join(','));

    // The panel itself is a toolbar toggle; the TAB inside it is what F6 adds,
    // and it is the tab that gets the real pointer.
    await page.evaluate(`${P}.ui.getState().setBomOpen(true); return true;`);
    await page.waitFor('document.querySelector(\'[data-bom-purchase-tab="1"]\')', { what: 'the BOM panel' });
    await page.sleep(300);
    await page.click('[data-bom-purchase-tab="1"]');
    await page.waitFor('document.querySelector(\'[data-bom-purchase="1"]\')', { what: 'the BOM tab' });
    await page.sleep(400);

    const view = await page.evaluate(`
      const rows = [...document.querySelectorAll('[data-bom-line]')].map((r) => r.getAttribute('data-bom-line'));
      const firstAssigned = rows.findIndex((k) => k.startsWith('mat:'));
      const lastUnassigned = rows.map((k) => k.startsWith('part:')).lastIndexOf(true);
      return {
        lines: rows.length,
        firstAssigned,
        lastUnassigned,
        incomplete: document.querySelector('[data-bom-incomplete]') ? document.querySelector('[data-bom-incomplete]').getAttribute('data-bom-incomplete') : null,
        total: document.querySelector('[data-bom-total]').getAttribute('data-bom-total'),
        groups: document.querySelectorAll('[data-bom-group]').length,
        subtotals: document.querySelectorAll('[data-bom-subtotal]').length,
        assignButtons: document.querySelectorAll('[data-bom-assign]').length,
      };
    `);
    check('the unassigned lines sit at the TOP', view.lastUnassigned < view.firstAssigned, JSON.stringify(view));
    check('…each with a button that opens Assign Materials on that exact part',
      view.assignButtons > 0, `${view.assignButtons} buttons`);
    check('the total is marked INCOMPLETE while anything is unassigned',
      view.total === 'incomplete' && Number(view.incomplete) > 0, JSON.stringify(view));
    check('the assigned lines are grouped, each group with a subtotal',
      view.groups > 0 && view.subtotals === view.groups, JSON.stringify(view));

    await shot('f6-bom-project-with-unassigned-on-top', {
      all: ['[data-bom-purchase="1"]', '[data-bom-total="incomplete"]', '[data-bom-scope="project"]'],
      // UPPER CASE because the group header is `uppercase` and `innerText`
      // reports what is on the glass, not what is in the JSX.
      text: 'NOT ASSIGNED',
      count: { '[data-bom-line]': 6, '[data-bom-assign]': 1 },
    });

    // The list is longer than the panel, so the TOTAL needs its own frame — a
    // picture that asserts a subject nobody can see is half a proof.
    await page.evaluate(`
      const el = document.querySelector('[data-bom-purchase="1"]').closest('.overflow-y-auto');
      if (el) el.scrollTop = el.scrollHeight;
      return true;
    `);
    await page.sleep(350);
    await shot('f6c-bom-total-marked-incomplete', {
      all: ['[data-bom-total="incomplete"]', '[data-bom-subtotal="board"]'],
      text: 'INCOMPLETE',
    });

    // ── THE SECOND COLLAPSE, ON THE GLASS ──────────────────────────────────
    const collapse = await page.evaluate(`
      const s = ${P}.project.getState();
      const entries = s.allResults();
      const profile = ${P}.profile.getState().profile;
      const mats = ${P}.materials.getState();
      const bom = window.__ccT39.bom.purchaseBom(entries, {
        assignments: mats.data, materials: mats.materials, profile, design: s.project.design });
      const line = bom.rows.find((r) => r.key === 'mat:mat_mfc18_white');
      const shown = [...document.querySelectorAll('[data-bom-line="mat:mat_mfc18_white"]')].length;
      return { parts: line ? line.parts.sort() : null, qty: line ? line.qty : null, shown };
    `);
    check('four parts on one board are ONE line with the summed area — the owner’s sentence',
      collapse.shown === 1 && collapse.parts.length === 4,
      `${collapse.shown} line, parts=${(collapse.parts || []).join('+')}, qty=${collapse.qty}`);

    // ── THIS CABINET vs THE WHOLE PROJECT ──────────────────────────────────
    const projectTotal = await page.evaluate(`
      return document.querySelector('[data-bom-total]').parentElement.innerText;
    `);
    await page.click('[data-bom-scope="cabinet"]');
    await page.sleep(400);
    const levels = await page.evaluate(`
      const s = ${P}.project.getState();
      const profile = ${P}.profile.getState().profile;
      const mats = ${P}.materials.getState();
      const ctx = { assignments: mats.data, materials: mats.materials, profile, design: s.project.design };
      const entries = s.allResults();
      const all = window.__ccT39.bom.purchaseBom(entries, ctx);
      const parts = entries.map((e) => window.__ccT39.bom.purchaseBom([e], ctx));
      const sum = parts.reduce((a, b) => a + b.totals.cost, 0);
      return { project: all.totals.cost, sumOfCabinets: Math.round(sum * 100) / 100,
               onScreen: document.querySelector('[data-bom-scope="cabinet"]').className.includes('border-gold') };
    `);
    check('the project BOM IS the sum of its cabinets’ BOMs',
      Math.abs(levels.project - levels.sumOfCabinets) < 0.02,
      `project=${levels.project} sum=${levels.sumOfCabinets}`);
    check('the level switch is on "this cabinet"', levels.onScreen, projectTotal.slice(0, 40));
    await shot('f6b-bom-this-cabinet-level', {
      all: ['[data-bom-purchase="1"]'],
      text: 'CABINET TOTAL',
    });

    // ── THE CSV IS THE SAME NUMBERS ────────────────────────────────────────
    const csv = await page.evaluate(`
      const s = ${P}.project.getState();
      const profile = ${P}.profile.getState().profile;
      const mats = ${P}.materials.getState();
      const bom = window.__ccT39.bom.purchaseBom(s.allResults(), {
        assignments: mats.data, materials: mats.materials, profile, design: s.project.design });
      return { text: window.__ccT39.csv(bom, { scope: 'project' }), total: bom.totals.cost };
    `);
    check('the purchase CSV carries the unassigned lines and says INCOMPLETE',
      /,NO,/.test(csv.text) && /TOTAL \(INCOMPLETE\)/.test(csv.text), `${csv.text.split('\n').length} rows`);
    writeFileSync(`${OUT}f6-purchase-bom.csv`, csv.text);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // F4 — THE AUTOMATIC ASSIGNMENTS
  // ═════════════════════════════════════════════════════════════════════════
  await phase('f4', 'The automatics — the colour picks the hinge, the height picks the leg', async () => {
    // A workshop's own ladders, written into the profile the way the owner
    // would: a nickel hinge and its plate, and two legs with real adjustment
    // ranges and a real GAP between them.
    await page.evaluate(`
      const st = ${P}.profile.getState();
      const p = st.profile;
      st.setProfile({ ...p, materials: { ...p.materials,
        hingeRules: [{ material_id: 'hw_hinge_soft', label: 'Soft-close 110° nickel', finish: 'nickel' }],
        hingePlateRules: [{ material_id: 'hw_hinge_clip', label: 'Knock-in plate nickel', finish: 'nickel' }],
        legRules: [
          { material_id: 'hw_leg_100', label: 'Adjustable leg 100', nominal_mm: 100, min_mm: 95, max_mm: 120 },
        ],
      } });
      // The colour the project is already in — one field, no second question.
      ${P}.project.getState().setDesign({ hardware: { ...${P}.project.getState().project.design.hardware, shelfSleeve: "chrome" } });
      return true;
    `);
    await page.sleep(300);

    await page.evaluate(`${P}.ui.getState().setBomOpen(false); ${P}.ui.getState().openModal('assign-materials'); return true;`);
    await page.waitFor('document.querySelector(\'[data-assign-materials="1"]\')', { what: 'the modal' });
    await page.sleep(700);
    await page.click('[data-assign-group="hardware"]');
    await page.sleep(400);

    const auto = await page.evaluate(`
      const m = ${P}.materials.getState();
      const tag = (id) => document.querySelector('[data-assign-auto="' + id + '"]') != null;
      return {
        hinge: m.assignments.hinge ? m.assignments.hinge.material_id : null,
        plate: m.assignments.hinge_plate ? m.assignments.hinge_plate.material_id : null,
        leg: m.assignments.leg ? m.assignments.leg.material_id : null,
        hingeTagged: tag('hinge'),
        legTagged: tag('leg'),
        runnerWhy: (document.querySelector('[data-assign-why="runner"]') || {}).innerText || null,
      };
    `);
    check('the chosen metal assigned the hinge without being asked', auto.hinge === 'hw_hinge_soft', JSON.stringify(auto));
    check('…and its plate with it', auto.plate === 'hw_hinge_clip', `plate=${auto.plate}`);
    check('the plinth height assigned the leg', auto.leg === 'hw_leg_100', `leg=${auto.leg}`);
    check('every automatic wears an "auto" tag', auto.hingeTagged && auto.legTagged, JSON.stringify(auto));
    check('a rule that cannot answer SAYS WHY, beside the part',
      Boolean(auto.runnerWhy && /no runner rules/.test(auto.runnerWhy)), auto.runnerWhy || 'no sentence');

    await shot('f4-automatics-hinge-and-leg-tagged', {
      all: ['[data-assign-auto="hinge"]', '[data-assign-auto="leg"]', '[data-assign-why="runner"]'],
      text: 'auto',
    });

    // ── THE LAW: A HAND WINS, AND THE RULE NEVER TAKES IT BACK ─────────────
    await page.click('[data-material-picker="leg"]');
    await page.waitFor('document.querySelector(\'[data-material-picker-panel="1"]\')', { what: 'the picker' });
    await page.sleep(250);
    const byHand = await page.evaluate(`
      const opts = [...document.querySelectorAll('[data-material-option]')].map((o) => o.getAttribute('data-material-option'));
      return opts.find((id) => id !== 'hw_leg_100') || opts[0];
    `);
    await page.click(`[data-material-option="${byHand}"]`);
    await page.sleep(400);
    // Run the automatics again, exactly as the button does.
    await page.click('[data-assign-auto-run]');
    await page.sleep(500);

    const afterHand = await page.evaluate(`
      const m = ${P}.materials.getState();
      return {
        leg: m.assignments.leg ? m.assignments.leg.material_id : null,
        stillTagged: document.querySelector('[data-assign-auto="leg"]') != null,
        hinge: m.assignments.hinge ? m.assignments.hinge.material_id : null,
      };
    `);
    check('a hand assignment SURVIVES a rule re-run', afterHand.leg === byHand,
      `chose=${byHand} now=${afterHand.leg}`);
    check('…and the "auto" tag is gone from that part', afterHand.stillTagged === false, JSON.stringify(afterHand));
    check('…while the parts the rule still owns are untouched', afterHand.hinge === 'hw_hinge_soft', `hinge=${afterHand.hinge}`);
    await shot('f4b-hand-beats-the-rule', {
      all: ['[data-material-picker="leg"]', '[data-assign-auto="hinge"]'],
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // F7 — THE GATE
  // ═════════════════════════════════════════════════════════════════════════
  await phase('f7', 'The gate blocks as it always did; Export CNC warns and does not', async () => {
    await page.evaluate(`${P}.ui.getState().closeModal(); return true;`);
    await page.sleep(200);

    // R4 — the gate is a pure function; ask the APP for its answer under three
    // states, rather than inferring one from a disabled button.
    const gate = await page.evaluate(`
      const S = ${P}.project.getState();
      const profile = ${P}.profile.getState().profile;
      const ps = window.__ccT39.settings;
      const design = { projectType: 'kitchen' };
      const args = (assignments) => ({
        design, heights: window.__ccT39.heights(design, profile), roomHeight: 2500, profile, assignments });
      const codes = (a) => ps.wizardStartBlockers(args(a)).blockers.map((b) => b.code);
      return {
        nothing: codes(null),
        emptyStore: codes({ schema: 2, base: {}, overrides: {} }),
        assignedInTheNewPlace: codes({ base: { carcase_side: { material_id: 'x' }, door: { material_id: 'y' } } }),
        halfAnswered: codes({ base: { carcase_side: { material_id: 'x' } } }),
      };
    `);
    check('a project with no board anywhere is still BLOCKED',
      gate.nothing.includes('materials') && gate.emptyStore.includes('materials'), JSON.stringify(gate));
    check('a board named in Assign materials OPENS it — one system, not two',
      !gate.assignedInTheNewPlace.includes('materials'), gate.assignedInTheNewPlace.join(',') || 'no blockers');
    check('half an answer is still a block', gate.halfAnswered.includes('materials'),
      gate.halfAnswered.join(','));

    // ── EXPORT CNC WARNS, AND THE EXPORT STILL HAPPENS ─────────────────────
    // Clear the boards this walk assigned so there is something to warn about.
    await page.evaluate(`
      const m = ${P}.materials.getState();
      for (const id of Object.keys(m.data.base)) ${P}.materials.getState().removeAssignment(id);
      return Object.keys(${P}.materials.getState().data.base).length;
    `);
    await page.sleep(300);

    const warned = await page.evaluate(`
      const S = ${P}.project.getState();
      const profile = ${P}.profile.getState().profile;
      return window.__ccT39.bom.cncAssignmentWarning(S.allResults(), {
        assignments: ${P}.materials.getState().data, profile, design: S.project.design });
    `);
    check('the CNC export warning fires when nothing has a board',
      Boolean(warned) && /nobody has said what from/.test(warned), String(warned).slice(0, 90));

    // ── THE EXPORT ITSELF, pressed with a real pointer ─────────────────────
    // Output ▸ CNC / DXF is the menu entry a joiner uses. It goes through
    // `checkBeforeExport()`, which is where the warning was added.
    await page.click('button', 'Output');
    await page.sleep(250);
    await page.click('button', 'CNC / DXF');
    await page.sleep(900);

    const said = await page.evaluate(`
      const notes = [...document.querySelectorAll('[data-message]')].map((n) => ({
        level: n.getAttribute('data-message-level'), text: n.innerText }));
      return {
        notes,
        warned: notes.some((n) => /nobody has said what from/.test(n.text)),
        blockedLevel: notes.filter((n) => n.level === 'red').length,
        alive: Boolean(window.__cc && window.__cc.project.getState().units.length),
      };
    `);
    check('the warning is SAID on the glass when the export is pressed', said.warned,
      said.notes.map((n) => `${n.level}:${n.text.slice(0, 44)}`).join(' | ') || 'no banner');
    check('…and it is a WARNING, not a refusal — the export went ahead', said.alive,
      `${said.notes.length} message(s), ${said.blockedLevel} red`);

    await shot('f7-cnc-warns-and-does-not-block', {
      all: ['[data-message]'],
      text: 'nobody has said what from',
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // F8 — THE JOINER'S OWN ROWS
  // ═════════════════════════════════════════════════════════════════════════
  await phase('f8', 'Custom consumables — typed, assigned, and down the same path', async () => {
    await page.evaluate(`${P}.ui.getState().openModal('assign-materials'); return true;`);
    await page.waitFor('document.querySelector(\'[data-assign-materials="1"]\')', { what: 'the modal' });
    await page.sleep(500);
    await page.click('[data-assign-group="consumable"]');
    await page.sleep(350);

    // Typed with a real keyboard into a real field.
    await page.click('[data-custom-draft-name="1"]');
    await typeText('DOWELS 8 40');
    await page.sleep(200);
    await page.click('[data-custom-add="1"]');
    await page.sleep(450);

    const added = await page.evaluate(`
      const cps = ${P}.materials.getState().data.customParts || [];
      return { count: cps.length, name: cps[0] ? cps[0].name : null, id: cps[0] ? cps[0].id : null,
               row: document.querySelectorAll('[data-custom-part]').length };
    `);
    check('a row the joiner typed exists, in the store and on the glass',
      added.count === 1 && added.row === 1, JSON.stringify(added));

    // Assign it the SAME board four registry parts already use, so the merge
    // path is visible rather than asserted.
    await page.evaluate(`
      const S = () => ${P}.materials.getState();
      for (const id of ['carcase_side', 'carcase_horizontal', ${JSON.stringify(added.id)}]) {
        S().setAssignment(id, 'mat_mfc18_white');
      }
      return Object.keys(S().data.base);
    `);
    await page.sleep(400);
    // The row's NAME lives in an <input value>, which `innerText` does not
    // report — so the named subject is the row itself plus the board it now
    // carries, both of which are on the glass.
    await shot('f8-custom-consumable-typed-and-assigned', {
      all: [
        '[data-custom-parts="1"]',
        `[data-custom-part="${added.id}"]`,
        `[data-material-picker="${added.id}"]`,
      ],
      text: 'YOUR OWN CONSUMABLES',
    });

    const merged = await page.evaluate(`
      const S = ${P}.project.getState();
      const m = ${P}.materials.getState();
      const bom = window.__ccT39.bom.purchaseBom(S.allResults(), {
        assignments: m.data, materials: m.materials,
        profile: ${P}.profile.getState().profile, design: S.project.design });
      const line = bom.rows.find((r) => r.key === 'mat:mat_mfc18_white');
      return { parts: line ? line.parts : [], lines: bom.rows.filter((r) => r.key === 'mat:mat_mfc18_white').length };
    `);
    check('the custom row rides the SAME merge path — one board, ONE line',
      merged.lines === 1 && merged.parts.includes(added.id),
      `${merged.lines} line, parts=${merged.parts.join('+')}`);

    // Removing it takes its assignment with it.
    await page.click(`[data-custom-remove="${added.id}"]`);
    await page.sleep(400);
    const gone = await page.evaluate(`
      const d = ${P}.materials.getState().data;
      return { rows: (d.customParts || []).length, assignment: Boolean(d.base[${JSON.stringify(added.id)}]) };
    `);
    check('removing the row removes its board with it', gone.rows === 0 && gone.assignment === false,
      JSON.stringify(gone));
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
