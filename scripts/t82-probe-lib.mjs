/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 · THE PROBES' OWN TOOLS (F16, F17, F18, F21, F22)
//
// CLAUDE.md T82 LAWS: "diagnose before you cut (every BUG starts with a
// committed PROBE table)". Every probe of this turn reads the source by LINE
// (so a table names the line as it stands on the branch, never a remembered
// one) and writes one markdown table whose columns are the same five: what,
// where, measured, CLAUDE.md said, verdict.
//
// Read only: nothing here writes anything but the probe's own markdown, and
// only when the script is run with `--write`.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { execSync } from 'node:child_process';

export const ROOT = new URL('..', import.meta.url).pathname;
const cache = new Map();

/** The file's lines, read once. `rel` is from the repo root. */
export function linesOf(rel) {
  if (!cache.has(rel)) cache.set(rel, readFileSync(ROOT + rel, 'utf8').split('\n'));
  return cache.get(rel);
}

/**
 * The 1-based line of the first line at or after `after` that holds `needle`
 * (a string, or a RegExp). Throws when the source no longer has it, so a
 * probe never prints a line number it did not find.
 */
export function lineOf(rel, needle, after = 1) {
  const lines = linesOf(rel);
  for (let i = Math.max(0, after - 1); i < lines.length; i++) {
    const hit = typeof needle === 'string' ? lines[i].includes(needle) : needle.test(lines[i]);
    if (hit) return i + 1;
  }
  throw new Error(`${rel}: no line holds ${String(needle)} at or after ${after}`);
}

/** The text of one line, trimmed. */
export function textAt(rel, line) {
  return linesOf(rel)[line - 1].trim();
}

/** `file:a` or `file:a-b`. */
export function at(rel, a, b = a) {
  return b && b !== a ? `${rel}:${a}-${b}` : `${rel}:${a}`;
}

/** Two dashes this repo's laws keep out of anything written: shown by name. */
export const noDash = (s) => String(s).replace(/\u2014/g, '[U+2014]').replace(/\u2013/g, '[U+2013]');

/** A cell: no pipe breaks the table, no new line breaks the row, no dash. */
const cell = (v) => noDash(v == null ? '' : String(v)).replace(/\|/g, '\\|').replace(/\n/g, ' ');

/** The table: rows of `{ what, where, measured, said, verdict }`. */
export function table(rows) {
  const out = ['| # | what | where (file:line on this branch) | measured | CLAUDE.md said | verdict |', '| - | - | - | - | - | - |'];
  rows.forEach((r, k) => out.push(`| ${k + 1} | ${[r.what, r.where, r.measured, r.said, r.verdict].map(cell).join(' | ')} |`));
  return out.join('\n');
}

/** A number as the probe prints it: whole, or to one decimal. */
export const mm = (v) => (Number.isFinite(Number(v)) ? String(Math.round(Number(v) * 10) / 10) : String(v));

/**
 * Print the markdown; with `--write`, write it to `verify/t82/<name>` too.
 * Refuses to write a dash the laws keep out.
 */
export function emit(name, md) {
  const text = `${noDash(md).replace(/\s+$/, '')}\n`;
  if (/[\u2013\u2014]/.test(text)) throw new Error('a dash survived');
  process.stdout.write(text);
  if (process.argv.includes('--write')) {
    const file = `${ROOT}verify/t82/${name}`;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
    process.stderr.write(`wrote verify/t82/${name}\n`);
  }
}

/** The last commit that touched the source: the line numbers are of that tree. */
export function sourceCommit() {
  try {
    return execSync('git log -1 --format=%h -- src', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}
