#!/usr/bin/env node
// ─── T72 · F7 — LIGHTS MODE: WHICH HANDLER ENDS IT ────────────────────────
//
// CLAUDE.md F7, verbatim:
//
//   *"po naciśnięciu LED wyłącza mi się funkcja lights i zaznacza mi drzwi, a
//   nie powinno; nie powinno wyłączyć aż do momentu, że albo wyłączę sam w
//   menu, albo zrobię 2klik na innym elemencie lub na ścianie."*
//
//   *"PROBE first: which handler ends lights mode on the LED press (`ViewBar`
//   `onLights`, `LightingPanel`, the stage's click). Commit it."*
//
// DIAGNOSE BEFORE YOU CUT. Nothing here changes a line. All THREE candidates
// CLAUDE.md names are walked at runtime, against the real ui store, and each
// is asked one question: after you, is the lighting panel still on screen?
//
//   node scripts/t72-f7-probe.mjs            print the table
//   node scripts/t72-f7-probe.mjs --md       …as the markdown committed to verify/

import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import * as A from '../src/retail/design/adapter.js';
import { loadPlainJsx } from './t72-load.mjs';

const { DOCK_MODALS, dockFor } = await loadPlainJsx('src/retail/design/detail/docked.jsx');

const src = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();
const md = process.argv.includes('--md');

function lineWith(rel, re) {
  const lines = src(rel).split('\n');
  const i = lines.findIndex((l) => re.test(l));
  return i < 0 ? null : { at: `${rel}:${i + 1}`, text: lines[i].trim() };
}

// ─── THE ROOM, AND A DOOR TO CLICK ────────────────────────────────────────

S().newProject();
S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
const { id: unitId } = S().addUnit('WARDROBE', { params: { width: 1800, height: 2200, depth: 600 } });
A.addDoors(unitId);
const door = (S().unitResult(unitId)?.panels || [])
  .find((p) => p.part === 'FRONT' && p.role === 'front') || null;

/**
 * `Detail.jsx`'s own effect, which is where the dock decides what modal to
 * open. Quoted from the file and then RUN against the live store, so what this
 * prints is what that effect does and not a paraphrase of it.
 *
 *     const name = route?.modal || '';
 *     if (name) { if (ui.modal !== name) ui.openModal(name, args); return; }
 *     if (DOCK_MODALS.includes(ui.modal)) ui.closeModal();
 */
const detailEffect = lineWith('src/retail/design/Detail.jsx', /if \(name\) \{ if \(ui\.modal !== name\) ui\.openModal\(name, args\); return; \}/);

function runDetailEffect() {
  const selected = U().selectedElement;
  const resolved = selected ? A.resolveSelection(selected) : null;
  const selection = resolved
    ? A.resolveTarget({ menu: resolved.menu, unitId: resolved.unitId, ref: resolved.ref })
    : null;
  const route = selection ? dockFor(selection) : null;
  const name = route?.modal || '';
  const ui = U();
  if (name) { if (ui.modal !== name) ui.openModal(name, route.args || null); return name; }
  if (DOCK_MODALS.includes(ui.modal)) { ui.closeModal(); return 'closed'; }
  return '(nothing)';
}

const lightsOpen = () => U().modal === 'lighting';
const steps = [];
const step = (what, act) => {
  act();
  steps.push({ what, modal: String(U().modal), lights: lightsOpen(), selected: U().selectedElement?.elementRef || null });
};

// ─── CANDIDATE 1 · `ViewBar` onLights ──────────────────────────────────────
//
// `DesignRoom.jsx:471` — `onLights={(e) => A.openEditor('lighting', …)}`, and
// `adapter.openEditor` is `U().openModal(name, args)`. That is the whole of it.

const onLights = lineWith('src/retail/design/DesignRoom.jsx', /onLights=\{\(e\) => A\.openEditor\('lighting'/);
const openEditor = lineWith('src/retail/design/adapter.js', /export const openEditor = /);

U().clearSelection();
step('start — nothing open, nothing selected', () => {});
step("1 · ViewBar LED pressed — A.openEditor('lighting')", () => A.openEditor('lighting', null));

// ─── CANDIDATE 2 · `LightingPanel` itself ─────────────────────────────────
//
// The panel is `sticky` and closes only through its own `onClose={closeModal}`.
// Pressing ON or OFF writes `design.lighting.on` and nothing else — proved by
// running the very call its ON button makes.

const panelSticky = lineWith('src/retail/design/lighting/LightingPanel.jsx', /^\s*sticky$/);
const panelClose = lineWith('src/retail/design/lighting/LightingPanel.jsx', /onClose=\{closeModal\}/);
step('2 · LightingPanel ON pressed — setLighting({ on: true })', () => S().setLighting({ on: true }));
step('2 · LightingPanel OFF pressed — setLighting({ on: false })', () => S().setLighting({ on: false }));

// ─── CANDIDATE 3 · THE STAGE'S CLICK ──────────────────────────────────────
//
// ONE click on a door writes `{unitId, elementRef}`; `DesignRoom` resolves it
// and `Detail`'s effect opens the dock's own modal OVER the lighting panel.

let opened = null;
step('3 · ONE click on a door — ui.selectElement(unit, leaf)', () => {
  U().selectElement(unitId, door.id);
});
step("3 · …and Detail's effect runs", () => { opened = runDetailEffect(); });

const say = (v) => (v === null || v === undefined ? 'null' : String(v));

const ROWS = steps.map((s) => [
  s.what,
  `modal=${say(s.modal)}`,
  `lights mode ${s.lights ? 'ON' : 'OFF'}${s.selected ? ` · selected ${s.selected}` : ''}`,
]);

const culprit = steps[steps.length - 1].lights === false && steps[1].lights === true;
const VERDICT = culprit
  ? [
    'CONVICTED · THE STAGE\'S CLICK, through the DOCK\'s own effect — and neither of the',
    'other two candidates touches the mode.',
    '',
    '  · `ViewBar` onLights only OPENS it (`adapter.openEditor` → `openModal`).',
    '  · `LightingPanel` is `sticky` and closes only by its own ×; ON and OFF write',
    '    `design.lighting.on` and leave the modal exactly where it is.',
    '  · A SINGLE click on a leaf writes `selectedElement`; `DesignRoom` resolves it to',
    '    the `door` menu; and `Detail.jsx`\'s effect then calls',
    `      ${detailEffect ? detailEffect.text : ''}`,
    `    which opens '${opened}' ON TOP OF 'lighting'. \`openModal\` REPLACES — the nav has`,
    '    `pushModal` for a nested surface and this is not it — so the lighting panel is',
    '    gone and the client is looking at the door he only meant to point at.',
    '',
    'ONE HANDLER, and it is not the LED button: the dock opens an editor on a SINGLE',
    'click, where the owner\'s law for opening an editor is a 2klik.',
  ].join('\n')
  : 'NOT CONVICTED — lights mode survived every one of the three.';

if (md) {
  const out = [];
  out.push('# T72 · F7 — lights mode: the probe');
  out.push('');
  out.push('> *"po naciśnięciu LED wyłącza mi się funkcja lights i zaznacza mi drzwi, a nie');
  out.push('> powinno"*');
  out.push('');
  out.push('A retail room, one wardrobe with its doors on. The three handlers CLAUDE.md names,');
  out.push('run in order against the real ui store:');
  out.push('');
  out.push('| step | the store after it | lights mode |');
  out.push('| --- | --- | --- |');
  for (const [what, modal, lights] of ROWS) out.push(`| ${what} | \`${modal}\` | ${lights} |`);
  out.push('');
  out.push('The lines, quoted from the files that hold them:');
  out.push('');
  for (const l of [onLights, openEditor, panelSticky, panelClose, detailEffect]) {
    if (l) out.push(`- \`${l.at}\` — \`${l.text}\``);
  }
  out.push('');
  out.push('## The fact');
  out.push('');
  out.push('```');
  out.push(VERDICT);
  out.push('```');
  out.push('');
  console.log(out.join('\n'));
} else {
  console.log('T72 · F7 — lights mode, handler by handler\n');
  const w = Math.max(...ROWS.map((r) => r[0].length));
  for (const [what, modal, lights] of ROWS) console.log(`  ${what.padEnd(w)}  ${modal.padEnd(18)} ${lights}`);
  console.log(`\n${VERDICT}\n`);
}
