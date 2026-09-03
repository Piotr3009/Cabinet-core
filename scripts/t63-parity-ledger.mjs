#!/usr/bin/env node
// ─── TURN 63 · F6 — THE PARITY LEDGER, WRITTEN FROM THE CODE ───────────────
//
// The owner: *"sprawdź jakie jeszcze funkcje pominąłeś."*
//
// CLAUDE.md F6: *"walk `src/components/**`, and for every file state — its
// line count, whether a retail copy exists (and at what line count), and one
// of three verdicts: COPIED, WORKSHOP (never for a client — with the reason),
// or OWED (a client surface still missing — with what it does). Sort the OWED
// list so the owner reads the biggest gap first."*
//
// FROM THE CODE, NOT FROM MEMORY:
//   the file list       `readdirSync('src/components')`, tonight
//   the line counts     `wc -l`, both sides, tonight
//   COPIED              a file of the SAME NAME under `src/retail/design/**`
//                       whose manifest entry (`scripts/t63-copies.mjs`) or T62
//                       origin says it was copied from this one
//   WORKSHOP / OWED     the one judgement no walk can make — whether a client
//                       ever needs the surface — is read from the one place it
//                       was already argued file by file, `verify/t60/
//                       parity-map.md` §3 (30 workshop surfaces, each with its
//                       reason). A file the T60 map does not know is OWED
//                       until somebody argues otherwise, which is the safe
//                       direction to be wrong in.
//
// This ledger REPLACES the T60 map as the map, because that map counted
// "surfaces" and this one counts code.
//
//   node scripts/t63-parity-ledger.mjs        writes verify/t63/parity-ledger.md

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ALL_COPIES } from './t63-copies.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const lines = (rel) => readFileSync(join(ROOT, rel), 'utf8').split('\n').length - 1;

// ─── THE T60 MAP, PARSED — purposes and the workshop verdicts ───────────────
const map = readFileSync(join(ROOT, 'verify/t60/parity-map.md'), 'utf8');
const sections = map.split(/^## /m);
const rowsOf = (text) => [...text.matchAll(/^\| ((?:[^|\\]|\\\|)+) \| `([^`]+)` \| (\d+) \| ((?:[^|\\]|\\\|)+) \|/gm)]
  .map((m) => ({ surface: m[1].trim(), file: m[2].trim(), what: m[4].trim() }));
const clientRows = rowsOf(sections.find((s) => s.startsWith('1 · WHAT A CLIENT NEEDS')) || '');
const laterRows = rowsOf(sections.find((s) => s.startsWith('2 · WHAT A CLIENT WILL WANT LATER')) || '');
const workshopRows = rowsOf(sections.find((s) => s.startsWith('3 · THE WORKSHOP')) || '');
const purpose = new Map([...clientRows, ...laterRows, ...workshopRows].map((r) => [r.file, r]));
const workshop = new Map(workshopRows.map((r) => [r.file, r]));

// ─── THE WALK ───────────────────────────────────────────────────────────────
const files = readdirSync(join(ROOT, 'src/components')).filter((f) => /\.jsx?$/.test(f)).sort();
const retailFiles = [];
const walk = (dir) => {
  for (const e of readdirSync(join(ROOT, dir))) {
    const p = `${dir}/${e}`;
    if (statSync(join(ROOT, p)).isDirectory()) walk(p);
    else retailFiles.push(p);
  }
};
walk('src/retail');

const rows = files.map((file) => {
  const pro = `src/components/${file}`;
  const proLines = lines(pro);
  const copy = ALL_COPIES.find((c) => c.pro === pro)?.retail
    || retailFiles.find((r) => r.endsWith(`/${file}`) && r.startsWith('src/retail/design/')) || null;
  const copyLines = copy && existsSync(join(ROOT, copy)) ? lines(copy) : null;
  const p = purpose.get(file);
  let verdict;
  let note;
  if (copy) {
    verdict = 'COPIED';
    note = ALL_COPIES.find((c) => c.pro === pro)?.why || 'T62';
  } else if (workshop.has(file)) {
    verdict = 'WORKSHOP';
    note = workshop.get(file).what;
  } else {
    verdict = 'OWED';
    note = p ? p.what : 'not in the T60 map — read the file; owed until argued otherwise';
  }
  return {
    file, pro, proLines, copy, copyLines, verdict, note, surface: p?.surface || file,
  };
});

const copied = rows.filter((r) => r.verdict === 'COPIED');
const owed = rows.filter((r) => r.verdict === 'OWED').sort((a, b) => b.proLines - a.proLines);
const ws = rows.filter((r) => r.verdict === 'WORKSHOP').sort((a, b) => b.proLines - a.proLines);
const sum = (list) => list.reduce((n, r) => n + r.proLines, 0);
const cut = (s, n = 170) => (s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…` : s);
const esc = (s) => s.replace(/\|/g, '\\|');

const out = [];
out.push('# T63 F6 · THE PARITY LEDGER — WHAT PRO HAS, IN LINES OF CODE');
out.push('');
out.push('The owner: *"sprawdź jakie jeszcze funkcje pominąłeś i je dodaj, a później');
out.push('będziemy ustawiać jak je rozmieścić."*');
out.push('');
out.push('Written by `scripts/t63-parity-ledger.mjs` FROM THE CODE: every file under');
out.push('`src/components/`, its line count tonight, whether a file of the same name');
out.push('stands under `src/retail/design/**` as a COPY (`scripts/t63-copies.mjs`, plus');
out.push('T62\'s four), and one verdict. The WORKSHOP verdicts and every purpose line');
out.push('are read from `verify/t60/parity-map.md`, where each was argued file by file;');
out.push('a file that map does not know is OWED until somebody argues otherwise.');
out.push('');
out.push('This ledger replaces the T60 map as the map: that one counted surfaces, this');
out.push('one counts code.');
out.push('');
out.push('## THE HEADLINE COUNTS');
out.push('');
out.push('| | files | PRO lines |');
out.push('|---|---|---|');
out.push(`| \`src/components/**\`, in total | **${rows.length}** | **${sum(rows)}** |`);
out.push(`| COPIED into retail (T62 + T63) | **${copied.length}** | **${sum(copied)}** |`);
out.push(`| WORKSHOP — never for a client | **${ws.length}** | **${sum(ws)}** |`);
out.push(`| OWED — a client surface still missing | **${owed.length}** | **${sum(owed)}** |`);
out.push('');
out.push(`Of the client-facing code (COPIED + OWED = ${sum(copied) + sum(owed)} lines), **${Math.round((100 * sum(copied)) / (sum(copied) + sum(owed)))} %** is across tonight.`);
out.push('');
out.push('## 1 · OWED — biggest gap first');
out.push('');
out.push('A client surface with no copy in retail. The biggest is at the top, so the');
out.push('owner reads the largest gap first.');
out.push('');
out.push('| PRO file | lines | what it does (T60 map) |');
out.push('|---|---|---|');
for (const r of owed) out.push(`| \`${r.file}\` | ${r.proLines} | ${esc(cut(r.note))} |`);
out.push('');
out.push('## 2 · COPIED');
out.push('');
out.push('| PRO file | PRO lines | retail copy | copy lines | why |');
out.push('|---|---|---|---|---|');
for (const r of copied.sort((a, b) => b.proLines - a.proLines)) {
  out.push(`| \`${r.file}\` | ${r.proLines} | \`${r.copy.replace('src/retail/', '')}\` | ${r.copyLines} | ${esc(cut(r.note, 110))} |`);
}
out.push('');
out.push('## 3 · WORKSHOP — never for a client, with the reason');
out.push('');
out.push('| PRO file | lines | why the client never sees it (T60 map) |');
out.push('|---|---|---|');
for (const r of ws) out.push(`| \`${r.file}\` | ${r.proLines} | ${esc(cut(r.note))} |`);
out.push('');
out.push('## HOW TO READ A ROW');
out.push('');
out.push('- **COPIED** — a file of the same name stands under `src/retail/design/**`, made by');
out.push('  `scripts/t63-copy.mjs` (or T62\'s hand) with imports repointed and classes');
out.push('  reskinned; `test/turn63-the-copies.test.js` holds each to every label, hook,');
out.push('  gesture and imported name of the original. A copy\'s line count is the');
out.push('  original\'s: the method adds nothing and drops nothing.');
out.push('- **WORKSHOP** — the T60 map argued, file by file, that a home client never');
out.push('  makes this decision (the cut list, the machine output, the stock, the');
out.push('  workshop\'s own account and defaults, the bars that hold PRO\'s menus).');
out.push('- **OWED** — everything else. Some of it is a container (`RightPanel`,');
out.push('  `SettingsPanel`, `WizardSettings`) whose DECISIONS retail already takes');
out.push('  through the copies and the adapter; the line count is still the honest');
out.push('  measure of what has not been copied, and that is what this ledger counts.');
out.push('');

writeFileSync(join(ROOT, 'verify/t63/parity-ledger.md'), `${out.join('\n')}\n`);
process.stdout.write(`ledger: ${rows.length} files · ${copied.length} copied · ${ws.length} workshop · ${owed.length} owed\n`);
for (const r of owed) process.stdout.write(`  OWED ${String(r.proLines).padStart(5)}  ${r.file}\n`);
