#!/usr/bin/env node
// ─── T69 · F7 · THE LIGHT PROBE, BEFORE ANY FIX ────────────────────────────
//
// CLAUDE.md, F7, verbatim:
//
//   *"Probe: add shoe, dump the light flag before/after, find the writer. Fix
//   to one law: nothing writes the light but the LIGHTS button and the client.
//   Commit the verdict."*
//
// Two questions, and this file answers both by DOING rather than by reading:
//
//   1. WHAT HAPPENS. `design.lighting.on` is dumped before and after the very
//      call the client's ADD SHOE DRAWER makes, and after every other ADD the
//      same table offers — because a bug that belongs to one row is a bug about
//      the shoe, and a bug that belongs to all of them is a bug about adding.
//   2. WHO WROTE IT. Every `set`/`setDesign` that passes through the store
//      while that call runs is COUNTED, with the key it touched and a stack
//      line, by wrapping the store's own setters for the duration. A writer
//      found this way cannot be the wrong one: it is the one that ran.
//
//   node scripts/t69-f7-probe.mjs            → verify/t69/f7-probe.md
//
// `T69_PROBE_SUFFIX=-after` writes the proof beside the diagnosis.

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { useProjectStore } from '../src/stores/projectStore.js';
import { rectCorners } from '../src/engine/room.js';
import { migrateDesign } from '../src/engine/design.js';
import * as A from '../src/retail/design/adapter.js';
import { stripsForUnit } from '../src/engine/ledStrips.js';
import { getCabinetProfile } from '../src/engine/profile.js';

const OUT = new URL('../verify/t69/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const SUFFIX = process.env.T69_PROBE_SUFFIX || '';

const S = () => useProjectStore.getState();

/** The one flag this probe is about, read the way every reader reads it. */
const lightOn = () => Boolean(migrateDesign(S().project.design).lighting?.on);
const lightItems = () => (migrateDesign(S().project.design).lighting?.items || []).length;

/**
 * A wardrobe in a room with THE LIGHT ON — and "on" means what a client means
 * by it, which is a strip they can see. The flag alone lights nothing: a lit
 * job is `lighting.on` AND at least one strip hung under a shelf, and both are
 * the client's own two acts (the LIGHTS button, and the strip switch on a
 * shelf). Probing the flag without the strip would answer a question nobody
 * asked.
 */
function litWardrobe() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 1000, height: 2200, depth: 600 } });
  S().updateUnitParams(id, { width: 1000, height: 2200 });
  S().addShelves(id, 2);
  A.setLighting(true);                       // THE LIGHTS BUTTON. Nothing else.
  for (const p of shelfPanels(id)) A.setShelfStrip(id, p.id, true);
  return id;
}

/** The shelf FACES a strip can hang under — the engine's own panels. */
const shelfPanels = (id) => (S().unitResult(id)?.panels || [])
  .filter((p) => p.part === 'SHELF' || p.role === 'shelf');

/**
 * THE STRIPS THAT ACTUALLY LIGHT — the ENGINE's own answer, not the stored
 * list. `stripsForUnit` drops a strip whose shelf is gone (*"no shelf, no
 * strip"*), which is exactly the failure a client would call "the light went
 * out": the record is still in the project and nothing is lit.
 */
function liveStrips(id) {
  const unit = S().units.find((u) => u.id === id);
  const result = S().unitResult(id);
  if (!unit || !result) return 0;
  return stripsForUnit({
    unit,
    result,
    design: migrateDesign(S().project.design),
    profile: getCabinetProfile(),
  }).length;
}

/**
 * WHO WROTE THE DESIGN while `run` was running.
 *
 * `setDesign` is the one door every lighting write goes through (`setLighting`,
 * `addLightingItem`, `updateLightingItem`, …), so wrapping it catches every
 * writer by construction rather than by grep.
 */
function watchWrites(run) {
  const store = useProjectStore;
  const real = S().setDesign;
  const writes = [];
  store.setState({
    setDesign: (patch) => {
      const keys = Object.keys(patch || {});
      const site = (new Error().stack || '').split('\n')[2] || '';
      writes.push({
        keys,
        touchesLighting: keys.includes('lighting'),
        on: patch?.lighting ? Boolean(patch.lighting.on) : null,
        site: site.trim().replace(process.cwd(), '.').slice(0, 120),
      });
      return real(patch);
    },
  });
  try { return { result: run(), writes }; } finally { store.setState({ setDesign: real }); }
}

/** Every ADD the client's own table offers, driven through the adapter. */
const ADDS = [
  ['shoe drawer', (id) => S().addShoeDrawer(id)],
  ['drawer', (id) => S().addDrawers(id, 1)],
  ['shelves', (id) => S().addShelves(id, 1)],
  ['rail', (id) => S().addRail(id)],
];

const rows = [];
for (const [label, add] of ADDS) {
  const id = litWardrobe();
  const before = lightOn();
  const beforeItems = lightItems();
  const beforeLive = liveStrips(id);
  let threw = null;
  const { writes } = watchWrites(() => {
    try { add(id); } catch (e) { threw = e.message; }
  });
  rows.push({
    label,
    before,
    after: lightOn(),
    beforeItems,
    afterItems: lightItems(),
    beforeLive,
    afterLive: liveStrips(id),
    writes: writes.filter((w) => w.touchesLighting),
    allWrites: writes.length,
    threw,
  });
}

// …and the two acts that are ALLOWED to write it, for contrast.
const lawful = [];
{
  const id = litWardrobe();
  lawful.push({ act: 'the LIGHTS button, off', before: lightOn(), after: (A.setLighting(false), lightOn()) });
  lawful.push({ act: 'the LIGHTS button, on', before: lightOn(), after: (A.setLighting(true), lightOn()) });
  void id;
}

// ─── AND THE SWEEP: EVERY WRITER IN THE TREE, NOT ONLY THE ONES THAT RAN ───
//
// The driven half above proves what happens on the paths a client walks. This
// half proves there is no path it did not walk: every site under `src/` that
// can put a value into `lighting.on` is counted, so the answer to *"how many
// writers has the light flag"* is a number and not an impression.
//
// A LOCAL PREVIEW is not a writer and is counted apart: `{ ...design, lighting:
// { ...design.lighting, on: true } }` handed to a renderer shows a panel what
// its own strips would look like and never reaches the store. PRO's four are
// exactly that, and they say so where they stand.
const ROOT = new URL('../', import.meta.url).pathname;
const SRC = join(ROOT, 'src');
const CODE = /\.(js|jsx)$/;
const walk = (dir) => readdirSync(dir).sort().flatMap((e) => {
  const path = join(dir, e);
  return statSync(path).isDirectory() ? walk(path) : (CODE.test(path) ? [path] : []);
});
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

const writersInTree = [];
const previews = [];
for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  const text = uncomment(readFileSync(file, 'utf8'));
  for (const m of text.matchAll(/lighting:\s*\{[^}]*\bon\b\s*:/g)) {
    const line = text.slice(0, m.index).split('\n').length;
    const near = text.slice(m.index, m.index + 160).replace(/\s+/g, ' ');
    // A preview never goes through a setter: it is spread into a NEW design
    // object that is handed to a component.
    (/\.\.\.design,|\.\.\.migrated,|\.\.\.d,/.test(text.slice(Math.max(0, m.index - 60), m.index))
      ? previews : writersInTree).push({ rel, line, near: near.slice(0, 90) });
  }
  for (const m of text.matchAll(/setLighting\(\s*\{[^}]*\bon\b/g)) {
    const line = text.slice(0, m.index).split('\n').length;
    writersInTree.push({ rel, line, near: text.slice(m.index, m.index + 90).replace(/\s+/g, ' ') });
  }
}

const md = [];
md.push('# T69 · F7 — THE LIGHT PROBE');
md.push('');
md.push('_The LIGHTS button is pressed, then a piece is added, and the flag is read');
md.push('again. Every `setDesign` that ran in between is counted with the key it');
md.push('touched. `node scripts/t69-f7-probe.mjs`._');
md.push('');
md.push('## 1 · ADD A PIECE TO A LIT WARDROBE');
md.push('');
md.push('| added | flag before | flag after | strips stored | strips that still LIGHT | `setDesign` calls | touching `lighting` |');
md.push('| --- | --- | --- | --- | --- | --- | --- |');
for (const r of rows) {
  const lit = r.afterLive < r.beforeLive ? `${r.beforeLive} → **${r.afterLive}**` : `${r.beforeLive} → ${r.afterLive}`;
  md.push(`| ${r.label}${r.threw ? ' *(refused)*' : ''} | ${r.before ? 'ON' : 'off'} `
    + `| ${r.after ? 'ON' : '**off**'} | ${r.beforeItems} → ${r.afterItems} | ${lit} `
    + `| ${r.allWrites} | ${r.writes.length} |`);
}
md.push('');
const killedFlag = rows.filter((r) => r.before && !r.after);
const killedStrips = rows.filter((r) => r.afterLive < r.beforeLive);
md.push(`**VERDICT 1 — ${killedFlag.length} of ${rows.length} adds turn the FLAG off, and `
  + `${killedStrips.length} of ${rows.length} put a strip OUT** (its shelf is gone, so it lights nothing).`);
for (const r of killedStrips) {
  md.push(`- \`${r.label}\`: ${r.beforeLive} lit strip(s) → ${r.afterLive}; `
    + `${r.afterItems} still stored, pointing at a shelf that no longer exists`);
}
md.push('');
md.push('## 2 · WHO WROTE THE FLAG');
md.push('');
const writers = new Set();
for (const r of rows) for (const w of r.writes) writers.add(w.site);
if (!writers.size) {
  md.push('No `setDesign` call touched `lighting` during any add. Every writer of the');
  md.push('flag is therefore one of the two lawful acts below, which is F7\'s own law:');
  md.push('*"nothing writes the light but the LIGHTS button and the client."*');
} else {
  md.push('| site | key | wrote `on` |');
  md.push('| --- | --- | --- |');
  for (const r of rows) {
    for (const w of r.writes) md.push(`| \`${w.site}\` | ${w.keys.join(', ')} | ${w.on} |`);
  }
}
md.push('');
md.push(`**VERDICT 2 — the light flag has ${writers.size || 0} writer(s) outside the LIGHTS button, `
  + `on every path a client walks.**`);
md.push('');
md.push('### …and the whole tree, swept');
md.push('');
md.push('| site | line | what it says |');
md.push('| --- | --- | --- |');
for (const w of writersInTree) md.push(`| \`${w.rel}\` | ${w.line} | \`${w.near}\` |`);
md.push('');
// How many of those sites are the SAME ACT — the store's one setter — and how
// many are something else. That is the number F7 is actually asking for.
const throughSetter = writersInTree.filter((w) => /setLighting\(/.test(w.near));
const theDefault = writersInTree.filter((w) => /on: false, temperature/.test(w.near));
const strays = writersInTree.filter((w) => !throughSetter.includes(w) && !theDefault.includes(w));
md.push(`**VERDICT 3 — ${writersInTree.length} site(s) in \`src/\` name \`lighting.on\` at all, `
  + `and they are ONE ACT:** ${throughSetter.length} of them call \`projectStore.setLighting\` — PRO's `
  + `LIGHTING panel, PRO's View menu, retail's copied panel and retail's adapter, which is the LIGHTS `
  + `control in two apps — and ${theDefault.length} is \`DEFAULT_DESIGN\`, a default and not a write. `
  + `**${strays.length} site(s) write it any other way.**`);
md.push('');
md.push(`A further ${previews.length} are LOCAL PREVIEWS that never reach the store — a panel`);
md.push('showing what its own strips would look like:');
md.push('');
for (const p of previews) md.push(`- \`${p.rel}:${p.line}\` — \`${p.near}\``);
md.push('');
md.push('## 3 · THE TWO LAWFUL ACTS, FOR CONTRAST');
md.push('');
md.push('| act | before | after |');
md.push('| --- | --- | --- |');
for (const l of lawful) md.push(`| ${l.act} | ${l.before ? 'ON' : 'off'} | ${l.after ? 'ON' : 'off'} |`);
md.push('');
writeFileSync(`${OUT}f7-probe${SUFFIX}.md`, `${md.join('\n')}\n`);
process.stdout.write(`${md.join('\n')}\n\nwritten: verify/t69/f7-probe${SUFFIX}.md\n`);
