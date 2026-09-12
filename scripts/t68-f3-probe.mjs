#!/usr/bin/env node
// ─── T68 · F3 · THE PROBE — WHERE THE 1/4 AND THE 3/4 COME FROM ────────────
//
// CLAUDE.md, F3, verbatim:
//
//   *"**Probe**: set split/top-segment, then choose 2 doors (and: 4 then 2);
//   dump the leaf widths and the unit's split params. Commit it."*
//
// And F3's own fence, which is the reason the probe comes first:
//
//   *"If the probe shows the 1/4–3/4 comes from the engine itself, STOP that
//   fix and skip-and-note with the line."*
//
// So this file asks the ENGINE for the leaf widths after each sequence, and
// asks the STORE what it is carrying at that moment. The verdict names which
// of the two is holding the residue.
//
//   node scripts/t68-f3-probe.mjs           → verify/t68/f3-probe.md

import { mkdirSync, writeFileSync } from 'node:fs';

import * as A from '../src/retail/design/adapter.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
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
const unitOf = (id) => S().units.find((u) => u.id === id) || null;

function fresh(widthMm = 1800) {
  useUiStore.getState().clearSelection();
  A.startDesign('T68 · F3 probe');
  const id = A.addFirstWardrobe();
  A.setUnitSize(id, { width: widthMm });
  A.addDoors(id);
  return id;
}

/** The LEAF WIDTHS the engine cut, left to right. */
function leaves(unitId) {
  let panels = [];
  try { panels = S().unitResult(unitId)?.panels || []; } catch { return []; }
  return panels
    .filter((p) => p.role === 'front')
    .sort((a, b) => (Number(a.x) || 0) - (Number(b.x) || 0))
    .map((p) => ({ w: Math.round(Number(p.w) || 0), h: Math.round(Number(p.h) || 0), split: Boolean(p.meta?.split) }));
}

/** EVERY param on the unit that could hold a residue of a split or a width. */
function residue(unitId) {
  const p = unitOf(unitId)?.params || {};
  const items = (p.sections?.[0]?.items || []).filter((i) => i.kind === 'partition');
  return {
    split_top_mm: p.split_top_mm ?? null,
    bay_doors: (p.bay_doors || []).map((b) => ({
      door: b?.door ?? null,
      split_top_mm: b?.split_top_mm ?? null,
      width_mm: b?.width_mm ?? null,
    })),
    partitions: items.map((i) => ({ id: i.id, x: Math.round(Number(i.x_mm ?? i.x ?? 0)), front_mm: i.front_mm ?? null })),
    bay_widths: (p.bay_widths || null),
    door_widths: (p.door_widths || null),
  };
}

const equalish = (ws) => ws.length > 1 && Math.max(...ws) - Math.min(...ws) <= 2;

const rows = [];
function run(label, steps, widthMm = 1800) {
  const id = fresh(widthMm);
  for (const s of steps) s(id);
  const ls = leaves(id);
  rows.push({
    label,
    widths: ls.map((l) => l.w),
    equal: equalish(ls.map((l) => l.w)),
    split: ls.some((l) => l.split),
    residue: residue(id),
  });
}

const setCount = (n) => (id) => A.setDoorCount(id, n);
const setSplit = (mm) => (id) => {
  const s = A.splitDoor(id);
  if (s && !s.said) A.setSplitTopMm(id, s.bay, mm);
};
const setBays = (n) => (id) => A.setBayCount(id, n);

run('2 doors, nothing else', [setCount(2)]);
run('split the leaf, then press 2', [setCount(2), setSplit(700), setCount(2)]);
run('4 doors, then press 2', [setCount(4), setCount(2)]);
run('4 doors, split one, then press 2', [setCount(4), setSplit(700), setCount(2)]);
run('3 doors, then press 2', [setCount(3), setCount(2)]);
run('bays 3, then press 2 doors', [setBays(3), setCount(2)]);
run('bays 3, split, then press 2 doors', [setBays(3), setSplit(700), setCount(2)]);
run('split, then top segment 0, then press 2', [setCount(2), setSplit(700), setSplit(0), setCount(2)]);

// ─── AND THE ENGINE'S OWN LAW, ASKED DIRECTLY ──────────────────────────────
// Two ways to have two leaves on an 1800 carcass:
//   · the STORE's — a flush divider making two bays, one leaf in each;
//   · the ENGINE's — `doors: true` and NOTHING else, its own width law
//     splitting the face into a pair.
// Which of them is the owner's *"2 równe standardowe otwierane na boki"*?
const clean = fresh(1800);
A.setDoorCount(clean, 2);
const cleanLeaves = leaves(clean);

const bare = fresh(1800);
const bareLeaves = leaves(bare);   // `fresh` already called addDoors and nothing else

// …and what a re-centre WOULD give, asked without writing the fix: run the
// store's own `centrePartitions` after the count drops and read the leaves.
const recentred = [];
for (const from of [3, 4]) {
  const id = fresh(1800);
  A.setDoorCount(id, from);
  A.setDoorCount(id, 2);
  const before = leaves(id).map((l) => l.w);
  useProjectStore.getState().centrePartitions(id);
  recentred.push({ from, before, after: leaves(id).map((l) => l.w) });
}

// ─── AND ACROSS WIDTHS: where does the engine's own law give a pair? ───────
// `profile.doors.singleDoorMaxWidth` decides (cabinet.js:314). If the face's
// own law already gives two leaves, a divider is a THIRD board nobody asked
// for; if it gives one, the divider is the only way to two.
const widthRows = [];
for (const w of [600, 700, 800, 1000, 1200, 1800, 2400]) {
  const bareId = fresh(w);
  const bareW = leaves(bareId).map((l) => l.w);
  const divId = fresh(w);
  A.setDoorCount(divId, 2);
  const divW = leaves(divId).map((l) => l.w);
  widthRows.push({
    w,
    bare: bareW,
    bareEqual: equalish(bareW),
    div: divW,
    divEqual: equalish(divW),
    refusal: A.doorCountRefusal(w, 2) || '',
  });
}

const md = [];
md.push('# T68 · F3 — THE PROBE');
md.push('');
md.push('_Generated by `node scripts/t68-f3-probe.mjs`. Nothing below is typed by hand._');
md.push('');
md.push('A 1800 mm wardrobe. Each row is a FRESH one, driven through the named');
md.push('sequence with the very adapter calls the chips press, then asked for the');
md.push('LEAF WIDTHS the engine cut and the params the store is holding.');
md.push('');
md.push('| sequence | leaf widths (mm) | equal? | split? | split_top_mm | bay_doors |');
md.push('| --- | --- | --- | --- | --- | --- |');
for (const r of rows) {
  md.push(`| ${r.label} | ${r.widths.join(' · ') || '—'} | ${r.equal ? 'YES' : '**NO**'} | `
    + `${r.split ? 'yes' : 'no'} | ${r.residue.split_top_mm ?? '—'} | `
    + `${JSON.stringify(r.residue.bay_doors)} |`);
}
md.push('');
md.push('### The partitions each sequence left behind');
md.push('');
md.push('```json');
for (const r of rows) md.push(`${r.label}: ${JSON.stringify(r.residue.partitions)}`);
md.push('```');
md.push('');
md.push('### The engine on its own, with nothing set');
md.push('');
md.push(`- \`setDoorCount(2)\` — a flush divider, one leaf per bay: \`${cleanLeaves.map((l) => l.w).join(' · ')}\``
  + ` — equal: **${equalish(cleanLeaves.map((l) => l.w)) ? 'YES' : 'NO'}**`);
md.push(`- \`addDoors\` alone — the engine's own width law, no divider: \`${bareLeaves.map((l) => l.w).join(' · ')}\``
  + ` — equal: **${equalish(bareLeaves.map((l) => l.w)) ? 'YES' : 'NO'}**`);
md.push('');
md.push('### What a re-centre WOULD give (the store\'s own `centrePartitions`, run after the drop)');
md.push('');
md.push('| from | leaves after pressing 2 | leaves after `centrePartitions` | equal then? |');
md.push('| --- | --- | --- | --- |');
for (const r of recentred) {
  md.push(`| ${r.from} doors | ${r.before.join(' · ')} | ${r.after.join(' · ')} | `
    + `${equalish(r.after) ? 'YES' : '**NO**'} |`);
}
md.push('');
const broken = rows.filter((r) => !r.equal);
const carriers = broken.map((r) => {
  const bits = [];
  if (r.residue.split_top_mm) bits.push(`unit.split_top_mm=${r.residue.split_top_mm}`);
  const baySplit = r.residue.bay_doors.filter((b) => b.split_top_mm);
  if (baySplit.length) bits.push(`bay_doors[].split_top_mm=${baySplit.map((b) => b.split_top_mm).join(',')}`);
  const widths = r.residue.bay_doors.filter((b) => b.width_mm);
  if (widths.length) bits.push(`bay_doors[].width_mm=${widths.map((b) => b.width_mm).join(',')}`);
  if (r.residue.partitions.length !== 1) bits.push(`${r.residue.partitions.length} partition(s)`);
  return `${r.label} → ${bits.join(' · ') || 'nothing in the store — the ENGINE decided'}`;
});
md.push('### Across widths — where the engine\'s own law already gives a pair');
md.push('');
md.push('`profile.doors.singleDoorMaxWidth = 700` (cabinet.js:314). Left: `addDoors`');
md.push('alone. Right: `setDoorCount(2)`, which adds a flush divider.');
md.push('');
md.push('| width | engine alone | equal? | with the store\'s divider | equal? | refusal for 2 |');
md.push('| --- | --- | --- | --- | --- | --- |');
for (const r of widthRows) {
  md.push(`| ${r.w} | ${r.bare.join(' · ')} | ${r.bareEqual ? 'YES' : 'no'} | `
    + `${r.div.join(' · ')} | ${r.divEqual ? 'YES' : '**NO**'} | ${r.refusal || '—'} |`);
}
md.push('');
md.push('## VERDICT');
md.push('');
if (!broken.length) {
  md.push('**Every sequence gave an equal pair.** Nothing to cut here.');
} else {
  md.push(`**${broken.length} of ${rows.length} sequences did NOT give an equal pair.** What each was carrying:`);
  md.push('');
  for (const c of carriers) md.push(`- ${c}`);
  md.push('');
  const engineOnly = carriers.filter((c) => c.includes('the ENGINE decided'));
  md.push(engineOnly.length === broken.length
    ? '**The residue is the ENGINE\'s own — F3\'s fence applies: STOP and skip-and-note.**'
    : '**The residue lives in PARAMS THE STORE WROTE — the store clears what it wrote.**');
}
writeFileSync(`${OUT}f3-probe${SUFFIX}.md`, `${md.join('\n')}\n`);
process.stdout.write(`${md.join('\n')}\n\nwritten: verify/t68/f3-probe.md\n`);
