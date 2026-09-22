#!/usr/bin/env node
// ─── T72 · F6 — THE DOOR WINDOW PROBE: THREE BLOCKS, AND WHICH SHOW ────────
//
// CLAUDE.md F6, verbatim:
//
//   *"2klik na drzwiach nie pokazuje w ogóle hinges"*, *"mamy fajny w PRO to
//   menu z zawiasami i ze strzałkami up and down, skopiuj z PRO"*, *"gdzie jest
//   left/right wybór oraz podzielenie drzwi, top section?"*
//
//   *"PROBE first: 2klik on a wardrobe door in retail; what `panel.part`,
//   `panel.role` and `meta` the door carries, and which of the three blocks
//   render. Commit the table. Then fix the one gate (or the one route) so all
//   three show, in retail as in PRO."*
//
// DIAGNOSE BEFORE YOU CUT. Nothing here changes a line. The three blocks are
// PRO's own, and the copy mounts all three behind ONE expression, `isDoor`,
// which is read OUT OF THE FILE rather than restated:
//
//   SPLIT DOOR (TOP SEGMENT)   `<SplitDoorField …>` — `data-split-door-modal`
//   THE HINGES                 `<HingeSection …>`   — `data-hinge-modal`
//   HINGE SIDE                 `elementFields`' own `hinge-side` row
//
// MOUNTING IS NOT SHOWING. Retail hides parts of a copied window with the
// ROOM's stylesheet — the lawful way, because a copy may not be edited — so
// this probe asks BOTH questions of every block: does the copy MOUNT it, and
// does a `data-workshop-tools="no"` rule take it off the screen.
//
//   node scripts/t72-f6-probe.mjs            print the table
//   node scripts/t72-f6-probe.mjs --md       …as the markdown committed to verify/

import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { elementFields } from '../src/engine/elements.js';
import { getUnitType } from '../src/engine/types.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import * as A from '../src/retail/design/adapter.js';
import { loadPlainJsx } from './t72-load.mjs';

const { dockFor } = await loadPlainJsx('src/retail/design/detail/docked.jsx');

const src = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();
const md = process.argv.includes('--md');

// ─── THE ROOM, AND THE DOOR ────────────────────────────────────────────────

S().newProject();
S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
const { id: unitId } = S().addUnit('WARDROBE', { params: { width: 1800, height: 2200, depth: 600 } });
A.addDoors(unitId);

const unit = S().units.find((u) => u.id === unitId);
const result = S().unitResult(unitId);
const door = (result?.panels || []).find((p) => p.part === 'FRONT' && p.role === 'front') || null;

// ─── THE 2KLIK, AND WHERE IT LANDS ─────────────────────────────────────────

U().clearSelection();
if (door) U().selectElement(unitId, door.id);
const resolved = A.resolveSelection(U().selectedElement);
const selection = resolved
  ? A.resolveTarget({ menu: resolved.menu, unitId: resolved.unitId, ref: resolved.ref })
  : null;
const route = selection ? dockFor(selection) : null;

// ─── THE GATE, READ OUT OF THE COPY ────────────────────────────────────────
//
// `src/retail/design/detail/DoorModal.jsx` is a 1:1 copy of PRO's, so the
// expression below is the copy's own line, found by pattern and then EVALUATED
// against the real panel. A probe that retyped the condition would be grading
// its own homework.

const copy = src('src/retail/design/detail/DoorModal.jsx');
const gateLine = copy.split('\n').find((l) => /const isDoor =/.test(l))?.trim() || null;
const isDoor = door?.part === 'FRONT' && door?.role === 'front' && !door?.meta?.appliance;

/** Does the copy MOUNT this block, and behind which condition? */
const mounts = (re) => {
  const line = copy.split('\n').find((l) => re.test(l));
  return line ? line.trim() : null;
};

const splitMount = mounts(/<SplitDoorField unit=/);
const hingeMount = mounts(/<HingeSection$/);
const propsMount = mounts(/<ElementProperties unit=\{unit\} panel=\{panel\} item=\{item\} compact omit=/);

// `hinge-side` is a FIELD, so whether it is mounted is `elementFields` minus
// whatever the window omits — and the window omits exactly `['hinges']`.
const type = getUnitType(unit.type);
const omitted = /omit=\{\['hinges'\]\}/.test(copy) ? ['hinges'] : [];
const fields = door ? elementFields(door, type).filter((f) => !omitted.includes(f)) : [];

// ─── AND THE STYLESHEET, WHICH IS THE OTHER HALF OF "SHOWS" ────────────────
//
// Every `data-workshop-tools="no"` rule in the room's sheet, with the markup it
// takes off the screen. The three markers below are the ones the three blocks
// carry, and `Field` in `ElementProperties` is
// `<label class="block"><span class="cc-label">…</span>{children}</label>` — so
// a field whose control is a bare `<select className="cc-input">` IS a
// `label:has(> select.pbi-re-input)`.

const css = src('src/retail/styles/room.css');
const HIDES = css
  .split('\n')
  .map((l, i) => ({ at: `src/retail/styles/room.css:${i + 1}`, text: l.trim() }))
  .filter((l) => /^\.pbi-room\[data-workshop-tools="no"\]/.test(l.text) && /\.pbi-dock/.test(l.text));

const hiddenBy = (marker) => HIDES.filter((l) => l.text.includes(marker));

const splitHidden = hiddenBy('data-split-door-modal');
const dedupe = (rows) => [...new Map(rows.map((r) => [r.at, r])).values()];
// THE HINGE BLOCK IS TWO BLOCKS, and they are hidden by two different rules:
// the HEIGHT ROWS (`data-hinge-modal-rows`, PRO's numbered list with the ▲▼)
// and ASSIGN OTHER HINGE (`data-hinge-assign`, the catalogue dropdown). The
// owner's words of 22.09 are about the first; his words of 11.09 were about
// the second. So they are asked separately or the answer is a blur.
const hingeHidden = dedupe(hiddenBy('data-hinge-modal-rows'));
const assignHidden = dedupe(hiddenBy('data-hinge-assign'));
// The `hinge-side` row is a label whose direct child is a select.
const sideHidden = hiddenBy('select.pbi-re-input');

const say = (v) => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

const ROWS = [
  ['the door', 'panel.id', say(door?.id)],
  ['the door', 'panel.part', say(door?.part)],
  ['the door', 'panel.role', say(door?.role)],
  ['the door', 'panel.meta (keys)', say(Object.keys(door?.meta || {}).sort())],
  ['the door', 'panel.meta.appliance', say(door?.meta?.appliance ?? null)],
  ['the door', 'panel.meta.split', say(door?.meta?.split ?? null)],
  ['the route', 'resolveSelection().menu', say(resolved?.menu)],
  ['the route', 'dockFor() → modal', say(route?.modal)],
  ['the route', 'dockFor() → args.panelId', say(route?.args?.panelId)],
  ['the gate', 'the copy\'s own line', say(gateLine)],
  ['the gate', 'isDoor, evaluated on this panel', say(isDoor)],
  ['1 · SPLIT DOOR', 'mounted by the copy', say(splitMount)],
  ['1 · SPLIT DOOR', 'hidden by the room sheet', say(splitHidden.map((l) => l.at))],
  ['1 · SPLIT DOOR', 'ON SCREEN', say(isDoor && !splitHidden.length)],
  ['2 · THE HINGES', 'mounted by the copy', say(hingeMount)],
  ['2 · THE HINGES', 'the HEIGHT ROWS hidden by the room sheet', say(hingeHidden.map((l) => `${l.at} — ${l.text}`))],
  ['2 · THE HINGES', 'the HEIGHT ROWS on screen', say(isDoor && !hingeHidden.length)],
  ['2 · THE HINGES', 'ASSIGN OTHER HINGE hidden by the room sheet', say(assignHidden.map((l) => l.at))],
  ['2 · THE HINGES', 'ASSIGN OTHER HINGE on screen (PRO only)', say(isDoor && !assignHidden.length)],
  ['3 · HINGE SIDE', 'mounted by the copy', say(propsMount)],
  ['3 · HINGE SIDE', 'the window omits', say(omitted)],
  ['3 · HINGE SIDE', 'elementFields after the omit', say(fields)],
  ['3 · HINGE SIDE', "carries `hinge-side`", say(fields.includes('hinge-side'))],
  ['3 · HINGE SIDE', 'its markup', say('<label class="block"><span class="cc-label">Hinge side</span><select class="cc-input">…')],
  ['3 · HINGE SIDE', 'hidden by the room sheet', say(sideHidden.map((l) => `${l.at} — ${l.text}`))],
  ['3 · HINGE SIDE', 'ON SCREEN', say(isDoor && fields.includes('hinge-side') && !sideHidden.length)],
];

const VERDICT = [];
if (!isDoor) VERDICT.push('CONVICTED AT THE GATE · `isDoor` is false for a wardrobe leaf.');
else if (!hingeHidden.length && !sideHidden.length && !splitHidden.length) {
  VERDICT.push('ALL THREE ARE ON THE SCREEN · `isDoor` is TRUE for this leaf, the copy mounts');
  VERDICT.push('all three blocks behind it, and no `data-workshop-tools="no"` rule takes any of');
  VERDICT.push('them. SPLIT DOOR (TOP SEGMENT) was never hidden; the HINGE HEIGHT ROWS came');
  VERDICT.push('back on the owner\'s own word of 22.09; and HINGE SIDE is let through by a rule');
  VERDICT.push('that now names the board pickers it was written for.');
  VERDICT.push('');
  VERDICT.push('ASSIGN OTHER HINGE — the catalogue dropdown that picks WHICH hinge the workshop');
  VERDICT.push('buys — stays PRO\'s, which is what *"wybór hinges to nie jest dobry pomysł, nie');
  VERDICT.push('tutaj — zostaw w PRO"* was ever about. Nothing in tonight\'s sentence asks for it.');
} else {
  VERDICT.push('THE GATE IS SOUND · `isDoor` is TRUE for this leaf, and the copy mounts all');
  VERDICT.push('three blocks behind it. The fault is not a gate and not a route — every one of');
  VERDICT.push('the three is MOUNTED. It is the ROOM\'S OWN STYLESHEET that takes them off:');
  VERDICT.push('');
  for (const l of hingeHidden) VERDICT.push(`  · THE HINGE HEIGHT ROWS — ${l.at}\n      ${l.text}`);
  for (const l of sideHidden) VERDICT.push(`  · HINGE SIDE — ${l.at}\n      ${l.text}`);
  if (!hingeHidden.length && !sideHidden.length) {
    VERDICT.push('  · nothing. All three are on the screen.');
  }
  VERDICT.push('');
  VERDICT.push('THE HINGES were hidden on purpose (T68 F6, *"wybór hinges to nie jest dobry');
  VERDICT.push('pomysł, nie tutaj — zostaw w PRO"*), and the owner has OVERTURNED that tonight in');
  VERDICT.push('as many words: *"mamy fajny w PRO to menu z zawiasami i ze strzałkami up and');
  VERDICT.push('down, skopiuj z PRO."*  22.09 outranks 11.09.');
  VERDICT.push('');
  VERDICT.push('HINGE SIDE was never meant to be hidden at all. The rule that takes it is');
  VERDICT.push('`label:has(> select.pbi-re-input)`, written for *"the board-thickness pickers"* —');
  VERDICT.push('and `ElementProperties`\' `Field` wraps EVERY control in a `<label>`, so that');
  VERDICT.push('selector reaches every `<select>` in the dock: `hinge-side`, `shelf-type`,');
  VERDICT.push('`partition-slot` and `end-panel-height` with it. ONE selector, written wider than');
  VERDICT.push('its own comment. That is the gate F6 names.');
}

if (md) {
  const out = [];
  out.push('# T72 · F6 — the door window: the probe');
  out.push('');
  out.push('> *"2klik na drzwiach nie pokazuje w ogóle hinges"* · *"gdzie jest left/right wybór');
  out.push('> oraz podzielenie drzwi, top section?"*');
  out.push('');
  out.push('A retail room, one wardrobe 1800 × 2200 × 600 with its doors on, then a 2klik on');
  out.push('the left leaf. Both halves of "shows" asked of all three blocks — does the copy');
  out.push('MOUNT it, and does the room\'s sheet take it off the screen:');
  out.push('');
  out.push('| where | what was asked | what it answered |');
  out.push('| --- | --- | --- |');
  for (const [where, asked, got] of ROWS) {
    out.push(`| ${where} | \`${asked}\` | \`${String(got).replace(/\|/g, '\\|')}\` |`);
  }
  out.push('');
  out.push('## The fact');
  out.push('');
  out.push('```');
  out.push(VERDICT.join('\n'));
  out.push('```');
  out.push('');
  console.log(out.join('\n'));
} else {
  console.log('T72 · F6 — the door window, block by block\n');
  const w = Math.max(...ROWS.map((r) => r[1].length));
  let last = '';
  for (const [where, asked, got] of ROWS) {
    if (where !== last) { console.log(`\n${where}`); last = where; }
    console.log(`  ${asked.padEnd(w)}  ${got}`);
  }
  console.log(`\n${VERDICT.join('\n')}\n`);
}
