/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 · THE PROBES' OWN TOOLS (F7, F9, F10)
//
// CLAUDE.md T83 LAWS: "diagnose before you cut (every BUG starts with a
// committed PROBE table)". The line finder, the table and the dash guard are
// T82's (`scripts/t82-probe-lib.mjs`), read from there, one law one path; what
// is this turn's own is where a probe writes: `verify/t83/<name>`, and only
// when the script is run with `--write`.
//
// Read only: nothing here writes anything but the probe's own markdown.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { ROOT, noDash } from './t82-probe-lib.mjs';

export {
  ROOT, linesOf, lineOf, textAt, at, noDash, table, mm, sourceCommit,
} from './t82-probe-lib.mjs';

/**
 * Print the markdown; with `--write`, write it to `verify/t83/<name>` too.
 * Refuses to write a dash the laws keep out.
 */
export function emit(name, md) {
  const text = `${noDash(md).replace(/\s+$/, '')}\n`;
  if (/[\u2013\u2014]/.test(text)) throw new Error('a dash survived');
  process.stdout.write(text);
  if (process.argv.includes('--write')) {
    const file = `${ROOT}verify/t83/${name}`;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
    process.stderr.write(`wrote verify/t83/${name}\n`);
  }
}
