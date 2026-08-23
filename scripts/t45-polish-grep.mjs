#!/usr/bin/env node
// ─── THE POLISH SWEEP (turn 45, CLAUDE.md F8) ───────────────────────────────
//
// *"Every Polish string shipped by T44 goes English, BY NAME … and a grep for
// Polish diacritics in `src/components/` returns only comments."*
//
// The law was ours and we broke it ourselves: T44 shipped "Ustawienia /
// Produkcja / Podsumowanie / Zapisać te ustawienia…" on a screen the owner
// turns round to English-speaking clients. He laughed at us. Rightly.
//
// A plain `grep` cannot answer this, because this repository is FULL of Polish
// on purpose: every argument in it is recorded in the owner's own words, in
// comments, and those must stay — a comment that translates his sentence is a
// comment that has lost the evidence. So the sweep has to tell a comment from a
// string, which is what this file is.
//
// ─── HOW IT DECIDES ─────────────────────────────────────────────────────────
//
// A line is a COMMENT line if the diacritic on it falls inside a `//` comment,
// or inside a `/* … */` block (JSX's `{/* … */}` is one of those). Anything
// else is CODE — a string literal, an attribute, a piece of JSX text — and is a
// failure. The scan is stateful across lines because the owner's quotes run to
// six lines at a time.
//
// It is deliberately CONSERVATIVE: a `//` inside a string ("https://…") would
// make this call a code line a comment, so the check would MISS something
// rather than invent it. A sweep that cried wolf would be turned off by the
// third false alarm.
//
// Usage:
//     node scripts/t45-polish-grep.mjs                # src/components, the law
//     node scripts/t45-polish-grep.mjs src/lib        # anywhere else
//     node scripts/t45-polish-grep.mjs --list         # print the comment hits
//
// Exit 0 = every hit is a comment. Exit 1 = a Polish string is still shipping.
//
// Zero dependencies.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The nine Polish letters that are not in the English alphabet, both cases. */
export const POLISH_DIACRITICS = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;

const SOURCE = /\.(jsx?|mjs)$/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (SOURCE.test(name)) out.push(p);
  }
  return out;
}

/**
 * Every Polish-diacritic hit in one file, each marked comment or code.
 *
 * @returns {Array<{line:number, text:string, comment:boolean}>}
 */
export function polishHits(source) {
  const hits = [];
  let inBlock = false;
  source.split('\n').forEach((raw, i) => {
    const m = raw.match(POLISH_DIACRITICS);
    if (!m) {
      // A line with no diacritic still moves the block-comment state.
      inBlock = blockStateAfter(raw, inBlock);
      return;
    }
    const at = raw.search(POLISH_DIACRITICS);
    hits.push({
      line: i + 1,
      text: raw.trim(),
      comment: isCommentAt(raw, at, inBlock),
    });
    inBlock = blockStateAfter(raw, inBlock);
  });
  return hits;
}

/** Is the character at `at` inside a comment, given the state on the way in? */
function isCommentAt(line, at, inBlock) {
  let block = inBlock;
  for (let i = 0; i < at; i += 1) {
    if (!block && line.startsWith('//', i)) return true;
    if (!block && line.startsWith('/*', i)) { block = true; i += 1; continue; }
    if (block && line.startsWith('*/', i)) { block = false; i += 1; }
  }
  return block;
}

/** The block-comment state at the end of a line. */
function blockStateAfter(line, inBlock) {
  let block = inBlock;
  for (let i = 0; i < line.length; i += 1) {
    if (!block && line.startsWith('//', i)) return block;   // rest of line is a comment
    if (!block && line.startsWith('/*', i)) { block = true; i += 1; continue; }
    if (block && line.startsWith('*/', i)) { block = false; i += 1; }
  }
  return block;
}

/** Every CODE hit under a directory — what F8 says must be empty. */
export function polishInCode(dir) {
  const bad = [];
  for (const file of walk(dir)) {
    for (const hit of polishHits(readFileSync(file, 'utf8'))) {
      if (!hit.comment) bad.push({ file, ...hit });
    }
  }
  return bad;
}

/** …and every COMMENT hit, which is the owner's own words and must STAY. */
export function polishInComments(dir) {
  const kept = [];
  for (const file of walk(dir)) {
    for (const hit of polishHits(readFileSync(file, 'utf8'))) {
      if (hit.comment) kept.push({ file, ...hit });
    }
  }
  return kept;
}

// ─── THE CLI, AND ONLY WHEN IT IS THE CLI ───────────────────────────────────
// The exports above are imported by the suite; the block below is what a
// terminal runs. Without this guard, `node --test` would import this file, hit
// a `process.exit` at module scope and take the test runner down with it — a
// script that kills its own proof is a script nobody runs twice.
const IS_CLI = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (IS_CLI) {
  const argv = process.argv.slice(2);
  const dir = argv.find((a) => !a.startsWith('--')) || 'src/components';
  const bad = polishInCode(dir);
  const kept = polishInComments(dir);

  if (argv.includes('--list')) {
    for (const h of kept) process.stdout.write(`  comment  ${h.file}:${h.line}  ${h.text.slice(0, 90)}\n`);
  }
  process.stdout.write(`${dir}: ${kept.length} comment line(s) in the owner's own words — they stay.\n`);
  if (bad.length) {
    process.stdout.write(`\n${bad.length} POLISH STRING(S) STILL SHIPPING:\n`);
    for (const h of bad) process.stdout.write(`  ${h.file}:${h.line}  ${h.text.slice(0, 110)}\n`);
    process.exit(1);
  }
  process.stdout.write('UI copy: English, everywhere. ✓\n');
}
