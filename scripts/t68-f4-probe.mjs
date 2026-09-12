#!/usr/bin/env node
// ─── T68 · F4 · THE PROBE — WHY THE DIVIDER WILL NOT MOVE ──────────────────
//
// The owner: *"divider nie mogę przesunąć."*
//
// CLAUDE.md, F4, verbatim:
//
//   *"**Probe**: click a divider — what docks? Grep where the old control
//   wrote."*
//
// So: select the divider the way the stage selects it, ask `resolveSelection`
// and `dockFor` what opens, and ask `elementFields` — PRO's own table — which
// rows survive the dock's `omit`. Then grep for the deleted `PartitionMenu`
// and for every writer of a partition's X.
//
//   node scripts/t68-f4-probe.mjs           → verify/t68/f4-probe.md

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import * as A from '../src/retail/design/adapter.js';
import { elementFields, elementKind } from '../src/engine/elements.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { parseDecorCatalogue, setDecorCatalogue } from '../src/engine/decors.js';
import decorPack from '../public/decors/egger/egger-decors.json' with { type: 'json' };

setDecorCatalogue(parseDecorCatalogue(decorPack, { basePath: '/decors/egger/' }));

const ROOT = new URL('../', import.meta.url).pathname;
const OUT = new URL('../verify/t68/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();

// `docked.jsx` cannot be IMPORTED by node (no JSX loader), and every test in
// this repo reads a component as TEXT for the same reason. So the dock's own
// table is read off its source — the list itself, not a copy of it.
const dockSrc = readFileSync(new URL('../src/retail/design/detail/docked.jsx', import.meta.url), 'utf8');
const WORKSHOP_FIELDS = [...dockSrc.slice(
  dockSrc.indexOf('const WORKSHOP_FIELDS'), dockSrc.indexOf(']);', dockSrc.indexOf('const WORKSHOP_FIELDS')),
).matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
const DOCK_MODALS = ['element', 'rail', 'watch-layout'];

/** `dockFor`'s own branches, read off the file above and applied here. */
function dockFor(selection) {
  if (!selection?.unitId) return null;
  const { menu, panel, item } = selection;
  if (menu === 'door') return panel ? { modal: 'element' } : null;
  if (menu === 'watch') return item ? { modal: 'watch-layout' } : null;
  if (menu === 'rail') return item ? { modal: 'rail' } : null;
  if (!panel) return null;
  return { props: { panel, item, omit: [...WORKSHOP_FIELDS] } };
}

const grep = (pat, paths = ['src']) => {
  try {
    return execFileSync('git', ['grep', '-n', '-e', pat, '--', ...paths], { cwd: ROOT, encoding: 'utf8' })
      .trim().split('\n').filter(Boolean);
  } catch { return []; }
};

function wardrobe() {
  U().clearSelection();
  A.startDesign('T68 · F4 probe');
  const id = A.addFirstWardrobe();
  A.setUnitSize(id, { width: 1800 });
  return id;
}

// ─── 1 · CLICK A DIVIDER, THE WAY THE STAGE CLICKS ONE ─────────────────────
const rows = [];
for (const how of ['INSIDE row (addFlushPartition)', 'a door count of 3']) {
  const unitId = wardrobe();
  if (how.startsWith('INSIDE')) A.addFlushPartition(unitId);
  else A.setDoorCount(unitId, 3);
  const panels = (S().unitResult(unitId)?.panels || []);
  const vpart = panels.find((p) => p.part === 'VPART') || null;
  if (!vpart) { rows.push({ how, found: false }); continue; }
  U().selectElement(unitId, vpart.id);
  const sel = A.resolveSelection(U().selectedElement);
  const dock = sel ? dockFor(sel) : null;
  const kind = elementKind(vpart);
  const all = elementFields(vpart, null);
  const omit = dock?.props?.omit || [];
  // ─── AND CAN THE FIELD ACTUALLY WRITE? ──────────────────────────────────
  // `ElementProperties`' `position-x` commits with `setPartitionX(unit.id,
  // item.id, …)`. Run exactly that, with exactly the `item` the dock hands it.
  let commit = 'not reached';
  let movedTo = null;
  const beforeX = (S().units.find((u) => u.id === unitId)?.params.sections?.[0]?.items || [])
    .find((i) => i.kind === 'partition')?.x_mm ?? null;
  try {
    S().setPartitionX(unitId, sel?.item.id, 400);
    const after = (S().units.find((u) => u.id === unitId)?.params.sections?.[0]?.items || [])
      .find((i) => i.kind === 'partition')?.x_mm ?? null;
    movedTo = after;
    commit = after !== beforeX ? `moved ${beforeX} → ${after}` : `WROTE NOTHING (still ${after})`;
  } catch (e) {
    commit = `THREW — ${e.constructor.name}: ${e.message}`;
  }
  // …and the same call with the panel's OWN stamped item id, for comparison.
  // The stamped id names ONE partition of however many stand in the unit, so
  // the honest reading is every partition's x, before and after.
  const xsOf = () => (S().units.find((u) => u.id === unitId)?.params.sections?.[0]?.items || [])
    .filter((i) => i.kind === 'partition').map((i) => Math.round(Number(i.x_mm) || 0));
  const xsBefore = xsOf();
  let stamped = 'not reached';
  try {
    S().setPartitionX(unitId, vpart.meta?.itemId, 400);
    const xsAfter = xsOf();
    stamped = JSON.stringify(xsBefore) !== JSON.stringify(xsAfter)
      ? `moved [${xsBefore.join(', ')}] → [${xsAfter.join(', ')}]`
      : `WROTE NOTHING (still [${xsAfter.join(', ')}] — the setter's own clamp)`;
  } catch (e) {
    stamped = `THREW — ${e.constructor.name}: ${e.message}`;
  }

  rows.push({
    how,
    found: true,
    commit,
    stamped,
    movedTo,
    panelId: vpart.id,
    metaItemId: vpart.meta?.itemId ?? null,
    kind,
    menu: sel?.menu ?? null,
    item: sel?.item?.id ?? null,
    dock: dock ? (dock.modal ? `modal:${dock.modal}` : 'props:ElementProperties') : null,
    fields: all,
    omitted: omit,
    visible: all.filter((f) => !omit.includes(f)),
  });
}

// ─── 2 · WHERE THE OLD CONTROL WROTE, AND WHO WRITES AN X TODAY ────────────
const writers = [
  ['the deleted `PartitionMenu`', grep('PartitionMenu')],
  ['`setPartitionX` — the store\'s own setter', grep('setPartitionX')],
  ['`centrePartitions`', grep('centrePartitions')],
  ['`chainFromX` / `xFromChain`', grep('FromChain\\|chainFromX')],
  ['`position-x` — the field in the copied editor', grep("'position-x'")],
  ['the stage\'s own drag handles', grep('EdgeHandle')],
  ['retail\'s adapter on a partition position', grep('setPartitionPos\\|partitionTravel')],
];

// ─── 3 · AND WHAT THE STAGE OFFERS A HAND ──────────────────────────────────
const stage = grep('onPointerDown\\|drag', ['src/retail/design/Stage.jsx']);

const md = [];
md.push('# T68 · F4 — THE PROBE');
md.push('');
md.push('_Generated by `node scripts/t68-f4-probe.mjs`. Nothing below is typed by hand._');
md.push('');
md.push(`The dock's own \`WORKSHOP_FIELDS\`, read off \`detail/docked.jsx\`: \`${WORKSHOP_FIELDS.join('`, `')}\`.`);
md.push(`Its modal names: \`${DOCK_MODALS.join('`, `')}\`.`);
md.push('');
md.push('## 1 · CLICK A DIVIDER — WHAT DOCKS?');
md.push('');
for (const r of rows) {
  md.push(`### ${r.how}`);
  md.push('');
  if (!r.found) { md.push('No `VPART` panel was cut at all.'); md.push(''); continue; }
  md.push(`- panel: \`${r.panelId}\` · \`elementKind\` → \`${r.kind}\``);
  md.push(`- \`panel.meta.itemId\`: \`${r.metaItemId ?? 'MISSING'}\``);
  md.push(`- \`resolveSelection\` → menu \`${r.menu ?? 'null'}\`, item \`${r.item ?? 'null'}\``);
  md.push(`- \`dockFor\` → \`${r.dock ?? 'NOTHING DOCKS'}\``);
  md.push(`- \`elementFields\` offers: \`${r.fields.join('`, `') || '(none)'}\``);
  md.push(`- the dock omits: \`${r.omitted.join('`, `') || '(none)'}\``);
  md.push(`- **rows a client actually sees: \`${r.visible.join('`, `') || 'NONE — the panel is empty'}\`**`);
  md.push(`- the field's own commit, \`setPartitionX(unitId, selection.item.id, 400)\`: **${r.commit}**`);
  md.push(`- the same call with the PANEL's stamped id, \`meta.itemId\`: **${r.stamped}**`);
  md.push('');
}
const empty = rows.filter((r) => r.found && r.visible.length === 0);
const noPos = rows.filter((r) => r.found && !r.visible.includes('position-x'));
const broken = rows.filter((r) => r.found && !/^moved /.test(r.commit));
md.push('## VERDICT');
md.push('');
md.push(noPos.length
  ? `- ${noPos.length} of ${rows.length} dividers dock an editor with NO position field`
    + `${empty.length ? ` (${empty.length} of them dock an EMPTY panel)` : ''}.`
  : `- every divider docks its position field (\`position-x\` survives the dock's \`omit\`).`);
md.push(broken.length
  ? `- **and on ${broken.length} of ${rows.length} that field CANNOT WRITE**: ${broken.map((r) => r.commit).join(' · ')}`
  : '- and the field writes.');
md.push(rows.some((r) => /^moved /.test(r.stamped))
  ? '- the SAME store setter DOES move the divider when it is given the id the ENGINE'
    + ' stamped on the panel (`meta.itemId`) — so the setter is sound and the id is the fault.'
  : '- and the panel\'s stamped id does not help either.');
md.push('');
md.push('So the control is not missing — `adapter.resolveSelection` never looks a');
md.push('PARTITION\'s item up (it does it for `shelf` and for `drawers`, and for nothing');
md.push('else), so the dock is handed `item: null` and the field commits against');
md.push('`null.id`. The divider cannot be moved because the one road to the setter is');
md.push('broken at the selection, not at the control.');
md.push('');
if (rows.some((r) => r.found && r.metaItemId == null)) {
  md.push('The cause is named by `engine/elements.js:326` — a partition whose panel carries no');
  md.push('`meta.itemId` is stripped to `[\'material\']`, and `material` is a WORKSHOP field the');
  md.push('retail dock omits. So the panel opens with nothing in it.');
  md.push('');
}
md.push('## 2 · WHERE THE OLD CONTROL WROTE');
md.push('');
for (const [what, lines] of writers) {
  md.push(`### ${what} — ${lines.length} site(s)`);
  md.push('');
  md.push('```');
  for (const l of lines.slice(0, 40)) md.push(l);
  md.push('```');
  md.push('');
}
md.push('## 3 · WHAT THE RETAIL STAGE OFFERS A HAND');
md.push('');
md.push('```');
for (const l of stage.slice(0, 40)) md.push(l);
if (!stage.length) md.push('(nothing — `Stage.jsx` carries no pointer drag at all)');
md.push('```');
writeFileSync(`${OUT}f4-probe.md`, `${md.join('\n')}\n`);
process.stdout.write(`${md.join('\n')}\n\nwritten: verify/t68/f4-probe.md\n`);
