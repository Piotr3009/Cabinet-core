#!/usr/bin/env node
// ─── T72 · F2 — THE COUNT SHELF: IS IT WHY THE TYPE IS MISSING? ───────────
//
// CLAUDE.md F2, verbatim:
//
//   *"PROBE inside F2: a wardrobe shelf added as a COUNT has no `itemId`, and
//   `elementFields` then drops every field but material (`engine/elements.js`,
//   turn 21). If that is why the type is missing on the owner's screen, the fix
//   is that a count shelf becomes an item at the moment it is edited (the store
//   already turns a count into items for dragging: read `setShelfPos`), never a
//   second field list."*
//
// A CONDITIONAL INSTRUCTION, so the condition is tested before anything is
// built. The guard is real — `engine/elements.js` line for line — and the
// question is only whether a shelf can reach the RETAIL ROOM without an item.
//
//   node scripts/t72-f2-probe.mjs            print the table
//   node scripts/t72-f2-probe.mjs --md       …as the markdown committed to verify/

import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, getUnitType } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { elementFields } from '../src/engine/elements.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';

const src = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const S = () => useProjectStore.getState();
const md = process.argv.includes('--md');

function lineWith(rel, re) {
  const lines = src(rel).split('\n');
  const i = lines.findIndex((l) => re.test(l));
  return i < 0 ? null : { at: `${rel}:${i + 1}`, text: lines[i].trim() };
}

// ─── 1 · THE GUARD ITSELF, QUOTED AND THEN RUN ─────────────────────────────

const guard = lineWith('src/engine/elements.js', /kind === 'shelf' \|\| kind === 'partition'\) && !panel\.meta\?\.itemId/);

// A bare engine call — `computeCabinet` with a COUNT and no items — is the one
// place such a panel exists, and it is where the guard was written for.
const bare = computeCabinet({ ...defaultParamsFor('WARDROBE', P), shelves: 3 }, P);
const bareShelf = (bare.panels || []).find((p) => p.part === 'SHELF' && p.role === 'shelf') || null;
const bareFields = bareShelf ? elementFields(bareShelf, getUnitType('WARDROBE')) : [];

// ─── 2 · AND THE ROOM, WHICH IS WHERE THE OWNER IS STANDING ───────────────
//
// `projectStore.paramsForEngine` derives the count from the ITEMS:
//
//     shelves: items.filter((i) => i.kind === 'shelf').length,
//
// …so a number typed into `params.shelves` reaches the engine as whatever the
// items say, and a shelf in a retail room therefore always has one.

const derived = lineWith('src/stores/projectStore.js', /^\s*shelves: items\.filter\(\(i\) => i\.kind === 'shelf'\)\.length,/);

S().newProject();
S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
const { id: unitId } = S().addUnit('WARDROBE', { params: { width: 1800, height: 2200, depth: 600 } });

// a) a bare COUNT written straight onto the unit
S().updateUnitParams(unitId, { shelves: 3 });
const afterCount = (S().unitResult(unitId)?.panels || []).filter((p) => p.part === 'SHELF' && p.role === 'shelf');

// b) …and the road a client actually takes, which is INSIDE's own row
S().addShelves(unitId, 3);
const unit = S().units.find((u) => u.id === unitId);
const items = unit.params.sections?.[0]?.items || [];
const roomShelves = (S().unitResult(unitId)?.panels || []).filter((p) => p.part === 'SHELF' && p.role === 'shelf');
const withoutItem = roomShelves.filter((p) => !p.meta?.itemId);
const roomFields = roomShelves.map((p) => elementFields(p, getUnitType(unit.type)));

const say = (v) => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  return String(v);
};

const ROWS = [
  ['the guard', 'the line, as `engine/elements.js` writes it', say(guard?.text)],
  ['the guard', 'where', say(guard?.at)],
  ['a bare engine call', "computeCabinet({…, shelves: 3, items: none})", say(`${(bare.panels || []).filter((p) => p.part === 'SHELF').length} shelf panels`)],
  ['a bare engine call', 'the first shelf\'s meta.itemId', say(bareShelf?.meta?.itemId ?? null)],
  ['a bare engine call', 'elementFields on it', say(bareFields)],
  ['the retail room', 'the line that derives the count', say(derived?.text)],
  ['the retail room', 'where', say(derived?.at)],
  ['the retail room', 'params.shelves = 3 written by hand → panels cut', say(afterCount.length)],
  ['the retail room', 'addShelves(unitId, 3) → items', say(items.filter((i) => i.kind === 'shelf').length)],
  ['the retail room', '…→ shelf panels cut', say(roomShelves.length)],
  ['the retail room', 'shelf panels with NO meta.itemId', say(withoutItem.length)],
  ['the retail room', 'elementFields on every one of them', say([...new Set(roomFields.map((f) => f.join(' · ')))])],
];

const reachable = withoutItem.length > 0 || afterCount.length > 0;
const VERDICT = reachable
  ? 'CONVICTED · a shelf reaches the retail room with no item, so the guard fires and the\n'
    + 'type is dropped. F2\'s conditional fix applies: a count shelf becomes an item when it\n'
    + 'is edited.'
  : [
    'NOT CONVICTED · THE COUNT SHELF CANNOT REACH THE RETAIL ROOM.',
    '',
    '`projectStore.paramsForEngine` derives `shelves` FROM THE ITEMS, so a bare count',
    'written onto a unit reaches the engine as 0 and cuts no board at all (row 8 above:',
    'three written, none cut). Every shelf a client can point at came from `addShelves`,',
    'which makes an item, so every one of them carries `meta.itemId` and',
    '`elementFields` returns the whole list — `shelf-type` included.',
    '',
    'The guard IS real and it IS reachable: a BARE `computeCabinet({shelves: 3})` — the',
    'goldens\' own road — produces exactly the panel turn 21 wrote it for. It is not a',
    'road through the app, and nothing in the store needs to change.',
    '',
    'F2\'s clause is conditional — *"IF that is why the type is missing"* — and it is not.',
    'So no count-to-item conversion is built: it would be a store path nothing can call.',
    '',
    'WHAT IS ACTUALLY MISSING ON HIS SCREEN is `verify/t72/f6-probe.md`\'s finding, and it',
    'is one CSS selector: `.pbi-dock label:has(> select.pbi-re-input)` hides EVERY',
    '`<select>` in the docked editor, because `ElementProperties`\' `Field` wraps every',
    'control in a `<label>`. `shelf-type` was a `<select>`. It is TWO CHIPS tonight —',
    'the owner\'s own *"nie choose, tylko te 2 opcje"* — so it is not a `<select>` any',
    'more, and F6 narrows the selector to the board pickers it was written for.',
  ].join('\n');

if (md) {
  const out = [];
  out.push('# T72 · F2 — the count shelf: the probe');
  out.push('');
  out.push('> *"jest menu po 2kliku, ale nie ma opcji back 20 mm, czyli regulacji głębokości,');
  out.push('> ani nie ma wyboru fix / adjustable, nie choose, tylko te 2 opcje."*');
  out.push('');
  out.push('CLAUDE.md F2 names a suspect and makes the fix conditional on it: a shelf added as');
  out.push('a COUNT has no `itemId`, and `elementFields` then drops every field but material.');
  out.push('This asks whether such a shelf can reach the room the owner is looking at.');
  out.push('');
  out.push('| where | what was asked | what it answered |');
  out.push('| --- | --- | --- |');
  for (const [where, asked, got] of ROWS) out.push(`| ${where} | \`${asked}\` | \`${got}\` |`);
  out.push('');
  out.push('## The fact');
  out.push('');
  out.push('```');
  out.push(VERDICT);
  out.push('```');
  out.push('');
  console.log(out.join('\n'));
} else {
  console.log('T72 · F2 — the count shelf, asked of the room\n');
  const w = Math.max(...ROWS.map((r) => r[1].length));
  let last = '';
  for (const [where, asked, got] of ROWS) {
    if (where !== last) { console.log(`\n${where}`); last = where; }
    console.log(`  ${asked.padEnd(w)}  ${got}`);
  }
  console.log(`\n${VERDICT}\n`);
}
