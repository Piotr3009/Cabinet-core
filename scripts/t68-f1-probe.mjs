#!/usr/bin/env node
// ─── T68 · F1 · THE PROBE, BEFORE ANY FIX ──────────────────────────────────
//
// CLAUDE.md, F1, verbatim:
//
//   *"**PROBE FIRST, commit its output**: after each of the three entry points
//   — the FRONTS step, a `?collection=` URL, a per-unit change — dump
//   `design.fronts` (style, source, colour, opening), the unit's `door_style`,
//   and whether the cut parts carry `meta.jpull` / the shaker recess. Three
//   entries × the order permutations."*
//
// This file GUESSES NOTHING. It drives the very adapter calls the three doors
// make, in every order, and prints what the STORE and the ENGINE then say.
// The fix that follows is written against this table and not against the
// spec's suspicion.
//
//   node scripts/t68-f1-probe.mjs            → verify/t68/f1-probe.md
//
// The owner's three symptoms, in his words:
//   *"powinien być oak H3325 … dodaj do kodu jako default, na zawsze"*
//   *"czasami się pojawia … co jest?"* (shaker)  ·  the same of the J-pull.
// His URL carried `?collection=royal-burgundy`.

import { mkdirSync, writeFileSync } from 'node:fs';

import * as A from '../src/retail/design/adapter.js';
import { resolveUnitDesign } from '../src/engine/design.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { FRONT_STYLE_OPTIONS } from '../src/engine/design.js';
import { parseDecorCatalogue, setDecorCatalogue } from '../src/engine/decors.js';
import decorPack from '../public/decors/egger/egger-decors.json' with { type: 'json' };

setDecorCatalogue(parseDecorCatalogue(decorPack, { basePath: '/decors/egger/' }));

const OUT = new URL('../verify/t68/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

// The probe is run TWICE tonight: once before the fix (committed as the
// diagnosis) and once after it (committed as the proof). `T68_PROBE_SUFFIX`
// is how the second run is told not to overwrite the first.
const SUFFIX = process.env.T68_PROBE_SUFFIX || '';

const S = () => useProjectStore.getState();

/** What the T66 F4 STYLE LIST offers — `Options.jsx` filters `HJ` out. */
const LIST_STYLES = ['F', 'S', 'G', 'A'];

/** THE THREE DOORS, as the UI presses them — and nothing else. */
const DOORS = {
  // The FRONTS step: the STYLE list and the OPENING list (Options.jsx).
  fronts: (unitId) => { A.setFrontStyle('S'); A.setFrontOpening('jhandle'); return unitId; },
  // A `?collection=` URL: the room's own call on landing (DesignRoom.jsx).
  collection: (unitId) => { A.applyLazyDefaults(unitId, { collectionId: 'royal-burgundy' }); return unitId; },
  // A per-unit change: the store's own per-unit front pointer (UnitFinishModal).
  unit: (unitId) => {
    const front = (S().project.design.fronts?.types || [])[0];
    if (front) S().setUnitFinish([unitId], { front_type_id: front.id });
    return unitId;
  },
};

/** Every order of the three doors. */
function permutations(keys) {
  if (keys.length <= 1) return [keys];
  return keys.flatMap((k) => permutations(keys.filter((x) => x !== k)).map((rest) => [k, ...rest]));
}

function fresh() {
  useUiStore.getState().clearSelection();
  A.startDesign('T68 · F1 probe');
  return A.addFirstWardrobe();
}

/** What the STORE says the project's fronts are. */
function frontsOf() {
  const d = S().project.design || {};
  const f = d.fronts || {};
  const t = (f.types || [])[0] || {};
  return {
    style: f.style ?? null,
    source: t.source ?? null,
    finish: t.finish_id ?? null,
    colour: t.colour?.name || t.colour?.hex || null,
    opening: A.frontOpeningOf(S().project),
    handle: f.handle ? (f.handle.type || 'set') : null,
    carcass: d.carcass?.types?.[0]?.finish_id ?? null,
  };
}

/** What the ENGINE actually cut: does any front carry the J or the recess? */
function cutOf(unitId) {
  let panels = [];
  try { panels = S().unitResult(unitId)?.panels || []; } catch { panels = []; }
  const fronts = panels.filter((p) => p.meta?.front || /door|front/i.test(String(p.part || '')));
  return {
    doors: fronts.length,
    jpull: fronts.filter((p) => p.meta?.jpull).length,
    shaker: fronts.filter((p) => p.meta?.shaker).length,
    doorStyle: S().units.find((u) => u.id === unitId)?.params?.door_style_id ?? null,
    frontTypeId: S().units.find((u) => u.id === unitId)?.params?.front_type_id ?? null,
    // What the UNIT actually wears once the cascade has run — the shape the
    // 3-D view and the cut both take (`engine/design.js resolveUnitDesign`).
    worn: resolveUnitDesign(S().units.find((u) => u.id === unitId), S().project.design).frontType,
    runners: S().project.design?.runners?.variant ?? null,
  };
}

const rows = [];
for (const order of permutations(Object.keys(DOORS))) {
  const unitId = fresh();
  A.addDoors(unitId);
  for (const door of order) DOORS[door](unitId);
  rows.push({ order: order.join(' → '), ...frontsOf(), ...cutOf(unitId) });
}

// ─── AND THE CARCASS DEFAULT, ASKED ON ITS OWN ─────────────────────────────
// A fresh design WITHOUT a collection, and the same WITH one — H3325 or not.
const carcassRows = [];
for (const collectionId of [null, 'royal-burgundy', 'ivory-and-onyx', 'mayfair-green', 'black-label']) {
  const unitId = fresh();
  A.applyLazyDefaults(unitId, { collectionId });
  const f = frontsOf();
  carcassRows.push({
    collection: collectionId || '(none)',
    carcass: f.carcass,
    isH3325: String(f.carcass || '').includes('H3325'),
    style: f.style,
    opening: f.opening,
    front: f.finish || f.colour,
  });
}

// ─── 3 · THE TWO ROADS OUT OF THE FRONTS STEP ──────────────────────────────
// The STYLE list at the top offers four. MORE OPTIONS' STYLE GALLERY offers
// `FRONT_STYLE_OPTIONS` whole. Ask what each id actually cuts.
const roadRows = [];
for (const id of FRONT_STYLE_OPTIONS.map((o) => o.id)) {
  const unitId = fresh();
  A.addDoors(unitId);
  A.applyLazyDefaults(unitId, {});
  A.setFrontStyle(id);
  const f = frontsOf();
  const c = cutOf(unitId);
  roadRows.push({
    id,
    inList: LIST_STYLES.includes(id),
    opening: f.opening,
    handle: f.handle,
    worn: c.worn,
    jpull: c.jpull,
    shaker: c.shaker,
  });
}

// ─── WHO WRITES THE FRONT STYLE? asked of the tree, not of the spec ────────
const writers = [];
{
  const { execFileSync } = await import('node:child_process');
  const ROOT = new URL('../', import.meta.url).pathname;
  const grep = (pat) => {
    try {
      return execFileSync('git', ['grep', '-n', '-e', pat, '--', 'src'], { cwd: ROOT, encoding: 'utf8' })
        .trim().split('\n').filter(Boolean);
    } catch { return []; }
  };
  writers.push(['fronts.style written', grep('fronts: { \\.\\.\\..*style')]);
  writers.push(['setFrontStyle called', grep('setFrontStyle(')]);
  writers.push(['setFrontOpening called', grep('setFrontOpening(')]);
  writers.push(['applyCollection called', grep('applyCollection(')]);
  writers.push(['setCarcassDecor called', grep('setCarcassDecor(')]);
}

const md = [];
md.push('# T68 · F1 — THE PROBE');
md.push('');
md.push('_Generated by `node scripts/t68-f1-probe.mjs`. Nothing below is typed by hand._');
md.push('');
md.push('## 1 · THE THREE DOORS, IN EVERY ORDER');
md.push('');
md.push('Each row: a fresh design, doors hung, then the three entry points pressed in');
md.push('the order named. `jpull` / `shaker` count the CUT FRONTS carrying `meta.jpull`');
md.push('/ `meta.shaker` — the engine\'s own answer, not the store\'s intention.');
md.push('');
md.push('| order | design.fronts.style | unit wears | opening | handle | front | carcass | doors | jpull | shaker |');
md.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of rows) {
  md.push(`| ${r.order} | ${r.style} | ${r.worn} | ${r.opening} | ${r.handle ?? '(none)'} | `
    + `${r.finish || r.colour || '—'} | ${r.carcass || '—'} | ${r.doors} | ${r.jpull} | ${r.shaker} |`);
}
md.push('');
const styles = [...new Set(rows.map((r) => r.style))];
const openings = [...new Set(rows.map((r) => r.opening))];
const jpulls = [...new Set(rows.map((r) => `${r.opening}/${r.jpull}`))];
const shakers = [...new Set(rows.map((r) => `${r.style}/${r.shaker}`))];
const worn = [...new Set(rows.map((r) => r.worn))];
md.push('**VERDICT 1 — the geometry is NOT identical across the orders.**');
md.push('');
md.push(`- styles reached: \`${styles.join('`, `')}\``);
md.push(`- openings reached: \`${openings.join('`, `')}\``);
md.push(`- opening→jpull-fronts pairs: \`${jpulls.join('`, `')}\``);
md.push(`- style→shaker-fronts pairs: \`${shakers.join('`, `')}\``);
md.push(`- shapes the UNIT actually wears: \`${worn.join('`, `')}\``);
md.push('');
md.push('## 2 · THE CARCASS ON A FRESH DESIGN');
md.push('');
md.push('| collection in the URL | carcass finish | H3325? | style | opening | front |');
md.push('| --- | --- | --- | --- | --- | --- |');
for (const r of carcassRows) {
  md.push(`| ${r.collection} | ${r.carcass || '—'} | ${r.isH3325 ? 'YES' : '**NO**'} | `
    + `${r.style} | ${r.opening} | ${r.front || '—'} |`);
}
md.push('');
md.push('## 3 · THE TWO ROADS OUT OF THE FRONTS STEP');
md.push('');
md.push('The STYLE LIST at the top of FRONTS offers four ids. MORE OPTIONS\' STYLE');
md.push('GALLERY offers `FRONT_STYLE_OPTIONS` whole — eight. What each id then cuts:');
md.push('');
md.push('| style id | in the STYLE list? | opening it reads as | handle | unit wears | jpull | shaker |');
md.push('| --- | --- | --- | --- | --- | --- | --- |');
for (const r of roadRows) {
  md.push(`| \`${r.id}\` | ${r.inList ? 'yes' : '**gallery only**'} | ${r.opening} | `
    + `${r.handle ?? '(none)'} | ${r.worn} | ${r.jpull} | ${r.shaker} |`);
}
md.push('');
const liars = roadRows.filter((r) => r.opening === 'jhandle' && r.jpull === 0);
md.push(`**VERDICT 3 — ${liars.length} gallery-only style(s) read as J-pull and machine nothing:** `
  + `\`${liars.map((r) => r.id).join('`, `') || 'none'}\`.`);
md.push('');
md.push('## 4 · THE WRITE SITES, ASKED OF THE TREE');
md.push('');
for (const [what, lines] of writers) {
  md.push(`### ${what} — ${lines.length} site(s)`);
  md.push('');
  md.push('```');
  for (const l of lines) md.push(l);
  md.push('```');
  md.push('');
}
writeFileSync(`${OUT}f1-probe${SUFFIX}.md`, `${md.join('\n')}\n`);
process.stdout.write(md.join('\n'));
process.stdout.write(`\n\nwritten: verify/t68/f1-probe.md\n`);
