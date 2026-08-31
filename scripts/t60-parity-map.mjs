#!/usr/bin/env node
// ─── T60 F5 · THE PARITY MAP, RENDERED ─────────────────────────────────────
//
// CLAUDE.md F5, verbatim:
//
//   *"this turn ALSO produces the map that makes the remaining turns cheap:
//   `verify/t60/parity-map.md` — a table of every PRO modal and panel, with:
//   its purpose in one line, whether a client needs it (yes / no — workshop /
//   later), where it landed in PBI (or "not yet"), and the engine functions it
//   drives. This file is the spec source for T61+. No guessing: every row read
//   from the code."*
//
// THE ROWS are `verify/t60/parity-map.json`, and every one of them was
// produced by READING the file it describes and grepping `src/retail/**` for
// where its decisions live now. This script only renders them, so a turn that
// moves a surface edits one row of data rather than a paragraph of prose — and
// the counts at the top can never disagree with the tables under them, because
// they are counted from the same array.
//
//   node scripts/t60-parity-map.mjs           write verify/t60/parity-map.md
//   node scripts/t60-parity-map.mjs --check   fail if the file is stale
//
// `--check` is what a later turn runs: it re-renders and compares, so a row
// edited without regenerating is caught rather than discovered.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC = new URL('../verify/t60/parity-map.json', import.meta.url);
const OUT = new URL('../verify/t60/parity-map.md', import.meta.url);

/** A cell in a GitHub table: one line, no bar of its own. */
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

/** "not yet" said any of the ways an agent might have said it, said once. */
const landed = (row) => (/^not yet/i.test(String(row.landedIn || '').trim())
  ? 'not yet' : cell(row.landedIn));

export function render(rows) {
  const yes = rows.filter((r) => r.clientNeeds === 'yes');
  const later = rows.filter((r) => r.clientNeeds === 'later');
  const shop = rows.filter((r) => r.clientNeeds === 'no — workshop');
  const done = yes.filter((r) => !/^not yet/i.test(String(r.landedIn || '').trim()));
  const left = (yes.length - done.length) + later.length;

  const out = [];
  const w = (s = '') => out.push(s);

  w('# T60 F5 · THE PARITY MAP — WHAT PRO STILL HAS THAT PBI DOES NOT');
  w();
  w('The owner: *"wszystkie funkcje muszą się pojawić w retail te co w PRO, tylko');
  w('inaczej poustawiane i inaczej poukładane — bardziej wizualnie."*');
  w();
  w(`That is more than one night. PRO carries **${rows.length} modals and panels**, one of them`);
  w('1546 lines and another 1141. So this turn ALSO produces the map that makes the');
  w('remaining turns cheap: every surface read from the code, with its purpose in one');
  w('line, whether a CLIENT needs it, where it landed in PBI today, and the engine and');
  w('store functions it drives.');
  w();
  w('**No row is a guess.** Each was produced by reading the file itself and grepping');
  w('`src/retail/**` for where its decisions live now. `lines` is the real line count.');
  w();
  w('## THE HEADLINE COUNTS');
  w();
  w('| | surfaces |');
  w('|---|---|');
  w(`| PRO modals and panels, in total | **${rows.length}** |`);
  w(`| a client NEEDS | **${yes.length}** |`);
  w(`| …of those, LANDED in PBI as of t60 | **${done.length}** |`);
  w(`| …of those, still to come | **${yes.length - done.length}** |`);
  w(`| a client will want LATER | **${later.length}** |`);
  w(`| the WORKSHOP's, and never the client's | **${shop.length}** |`);
  w();
  w(`So the remaining client-facing work is **${left} surfaces**, not ${rows.length} — which is the`);
  w('whole point of writing this down.');
  w();

  const table = (list, title, note) => {
    w(`## ${title}`);
    w();
    w(note);
    w();
    w('| PRO surface | file | lines | what it is | where it landed in PBI | engine / store it drives |');
    w('|---|---|---|---|---|---|');
    for (const r of list) {
      w(`| ${cell(r.surface)} | \`${r.file.replace('src/components/', '')}\` | ${r.lines} `
        + `| ${cell(r.purpose)} | ${landed(r)} | ${cell((r.engineFunctions || []).join(', '))} |`);
    }
    w();
  };

  table(yes, `1 · WHAT A CLIENT NEEDS (${yes.length})`,
    'A home client designing a wardrobe genuinely makes this decision.');
  table(later, `2 · WHAT A CLIENT WILL WANT LATER (${later.length})`,
    'Real for a client, and not this turn.');
  table(shop, `3 · THE WORKSHOP'S OWN, AND NEVER THE CLIENT'S (${shop.length})`,
    "The joiner's and the owner's instruments: the cut list, the machine, the materials, "
    + "the accounts, the templates, the part-level editing. A client reading any of these "
    + "is reading the owner's costs and method.");

  w('---');
  w();
  w('*Rendered by `scripts/t60-parity-map.mjs` from `verify/t60/parity-map.json`.');
  w('Re-run it after any turn that moves a surface; `--check` fails on a stale file.*');
  return `${out.join('\n')}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = JSON.parse(readFileSync(SRC, 'utf8'));
  const text = render(rows);
  if (process.argv.includes('--check')) {
    const on = readFileSync(OUT, 'utf8');
    if (on !== text) {
      process.stdout.write('parity-map.md is STALE — re-run scripts/t60-parity-map.mjs\n');
      process.exit(1);
    }
    process.stdout.write(`parity-map.md is current — ${rows.length} surfaces\n`);
  } else {
    writeFileSync(OUT, text);
    process.stdout.write(`verify/t60/parity-map.md — ${rows.length} surfaces\n`);
  }
}
