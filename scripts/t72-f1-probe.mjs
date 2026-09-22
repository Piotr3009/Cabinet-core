#!/usr/bin/env node
// ─── T72 · F1 — THE END PANEL'S MENU PROBE ─────────────────────────────────
//
// CLAUDE.md F1, verbatim:
//
//   *"jak kliknę 2 razy na panel boczny po prawej nie pokazuje mi się menu
//   panelu"*
//
//   *"PROBE first: in the retail room, 2klik on an END-PANEL. Which element the
//   scene hands to `dockFor` (`src/retail/design/detail/docked.jsx`), what
//   `menu` and `panel` it carries, and why nothing opens. Commit the table."*
//
// DIAGNOSE BEFORE YOU CUT. Nothing here changes a line. It builds the room a
// client builds, adds the end panel the way EXTRAS adds it, and then walks the
// chain a 2klik actually travels, link by link, printing what each link holds:
//
//   1. THE SCENE      is the board pickable at all, and does a double click
//                     open its own thing? (`engine/elements.js`)
//   2. THE STORE      what the stage writes: `{ unitId, elementRef }`
//   3. THE ADAPTER    `resolveSelection` — the menu, the panel, the item
//   4. THE ROOM       `DesignRoom`'s effect: `setTarget` or `clearElement`
//   5. THE DOCK       `dockFor` — what the editor is handed
//
//   node scripts/t72-f1-probe.mjs            print the table
//   node scripts/t72-f1-probe.mjs --md       …as the markdown committed to verify/

import { rectCorners } from '../src/engine/room.js';
import {
  elementKind, elementLabel, isSelectableElement, isAttachedElement, opensOwnModal,
  elementFields,
} from '../src/engine/elements.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import * as A from '../src/retail/design/adapter.js';
import { loadPlainJsx } from './t72-load.mjs';

const { dockFor } = await loadPlainJsx('src/retail/design/detail/docked.jsx');

const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();
const md = process.argv.includes('--md');

// ─── THE ROOM, BUILT THE WAY A CLIENT BUILDS IT ────────────────────────────

S().newProject();
S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
const { id: unitId } = S().addUnit('WARDROBE', { params: { width: 1800, height: 2200, depth: 600 } });

// EXTRAS' own road to an end panel — `adapter.addEndPanelByHand`, which is the
// call the END PANELS L/R/BOTH row presses. Nothing is reached round the side.
const added = A.addEndPanelByHand(unitId, 'R');

const result = S().unitResult(unitId);
const panels = result?.panels || [];
const ep = panels.find((p) => p.part === 'END-PANEL') || null;

// ─── LINK 1 · THE SCENE ────────────────────────────────────────────────────

const scene = ep ? {
  'panel.id': ep.id,
  'panel.part': ep.part,
  'panel.role': String(ep.role ?? '—'),
  'panel.meta.side': String(ep.meta?.side ?? '—'),
  elementKind: String(elementKind(ep)),
  elementLabel: String(elementLabel(ep)),
  isSelectableElement: isSelectableElement(ep),
  isAttachedElement: isAttachedElement(ep),
  opensOwnModal: opensOwnModal(ep),
  elementFields: elementFields(ep).join(', '),
} : { 'panel.id': '— NO END PANEL CUT —' };

// ─── LINK 2 · THE STORE — what a 2klik writes ──────────────────────────────

U().clearSelection();
if (ep) U().selectElement(unitId, ep.id);
const stored = U().selectedElement;

// ─── LINK 3 · THE ADAPTER ──────────────────────────────────────────────────

const resolved = A.resolveSelection(stored);

// ─── LINK 4 · THE ROOM'S EFFECT (DesignRoom.jsx:366) ───────────────────────
//
//     const found = A.resolveSelection(selectedElement);
//     if (!found) { setTarget(null); useUiStore.getState().clearElement?.(); return; }
//     setTarget({ menu: found.menu, unitId: found.unitId, ref: found.ref });

const target = resolved
  ? { menu: resolved.menu, unitId: resolved.unitId, ref: resolved.ref }
  : null;

// ─── LINK 5 · THE DOCK ─────────────────────────────────────────────────────

const selection = target ? A.resolveTarget(target) : null;
const route = selection ? dockFor(selection) : null;

// ─── THE TABLE ─────────────────────────────────────────────────────────────

const say = (v) => {
  if (v === null) return 'null';
  if (v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
};

const ROWS = [
  ['1 · the scene', 'panel cut by the engine', say(ep?.id || null)],
  ['1 · the scene', 'elementKind(panel)', say(elementKind(ep))],
  ['1 · the scene', 'isSelectableElement', say(ep ? isSelectableElement(ep) : null)],
  ['1 · the scene', 'opensOwnModal (2klik opens its own)', say(ep ? opensOwnModal(ep) : null)],
  ['2 · the store', 'ui.selectedElement.unitId === the wardrobe', say(stored?.unitId === unitId)],
  ['2 · the store', 'ui.selectedElement.elementRef', say(stored?.elementRef ?? null)],
  ['3 · the adapter', "MENU_FOR_KIND['end-panel']", say(A.MENU_FOR_KIND['end-panel'] ?? null)],
  ['3 · the adapter', 'resolveSelection(...)', say(resolved)],
  ['3 · the adapter', 'resolveSelection().menu', say(resolved?.menu ?? null)],
  ['3 · the adapter', 'resolveSelection().panel', say(resolved?.panel?.id ?? null)],
  ['4 · the room', 'DesignRoom setTarget', say(target)],
  ['4 · the room', 'DesignRoom clearElement() called', say(!resolved)],
  ['5 · the dock', 'resolveTarget(target)', say(selection)],
  ['5 · the dock', 'dockFor(selection)', say(route)],
];

const VERDICT = resolved === null
  ? 'CONVICTED · `MENU_FOR_KIND` has no `end-panel` key, so `resolveSelection` '
    + 'answers null, `DesignRoom` CLEARS the element, and `dockFor` is never called '
    + 'at all. The board is pickable and the engine cuts it; the TABLE is the fault.'
  : 'NOT CONVICTED — the chain reaches the dock; the fault is downstream.';

if (md) {
  const out = [];
  out.push('# T72 · F1 — the end panel\'s menu: the probe');
  out.push('');
  out.push('> *"jak kliknę 2 razy na panel boczny po prawej nie pokazuje mi się menu panelu"*');
  out.push('');
  out.push('A retail room, one wardrobe 1800 × 2200 × 600, one end panel added the way');
  out.push('EXTRAS adds it (`adapter.addEndPanelByHand(unitId, \'R\')`), then a 2klik on the');
  out.push('board. Every link of the chain, as it actually answers:');
  out.push('');
  out.push('| link | what was asked | what it answered |');
  out.push('| --- | --- | --- |');
  for (const [link, asked, got] of ROWS) {
    out.push(`| ${link} | \`${asked}\` | \`${got}\` |`);
  }
  out.push('');
  out.push(`**The add:** \`addEndPanelByHand → ok=${say(added.ok)}${added.said ? `, said "${added.said}"` : ''}\``);
  out.push('');
  out.push('## The fact');
  out.push('');
  out.push(VERDICT);
  out.push('');
  out.push('The line, as the file writes it —');
  out.push('`src/retail/design/adapter.js`, `MENU_FOR_KIND`:');
  out.push('');
  out.push('```');
  out.push("//   `plinth`, `end-panel`, `infill`, `masking-panel`, `holder` and `spurs` are");
  out.push('//   NOT KEYS HERE, so `resolveSelection` answers null and `DesignRoom` clears');
  out.push('//   the selection.');
  out.push('```');
  out.push('');
  out.push('T66 F3 put the end panel out of the table with the CARCASS, on turn 13\'s');
  out.push('verdict that *"clicking a cabinet must select the CABINET"*. An end panel is');
  out.push('not carcass: `engine/elements.js` files it under `ATTACHED_KINDS`, beside the');
  out.push('door — *"things you HANG ON the carcass afterwards, one at a time, and each of');
  out.push('them is a decision with its own properties"* — and `opensOwnModal` has said');
  out.push('`true` for it since turn 14. One key is the whole of it.');
  out.push('');
  console.log(out.join('\n'));
} else {
  console.log('T72 · F1 — the end panel\'s menu, link by link\n');
  const w = Math.max(...ROWS.map((r) => r[1].length));
  let last = '';
  for (const [link, asked, got] of ROWS) {
    if (link !== last) { console.log(`\n${link}`); last = link; }
    console.log(`  ${asked.padEnd(w)}  ${got}`);
  }
  console.log(`\n${VERDICT}\n`);
}
