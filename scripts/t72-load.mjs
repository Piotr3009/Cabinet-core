#!/usr/bin/env node
// ─── T72 · LOADING A `.jsx` FILE THAT IS NOT JSX ───────────────────────────
//
// `src/retail/design/detail/docked.jsx` carries no JSX at all — it is the
// TABLE that says which editor edits which selection, and every branch of it
// returns a plain object. Node still refuses the extension, and the probes of
// F1 and F6 have to ask the REAL `dockFor` rather than a paraphrase of it: a
// probe that re-implements the thing it is diagnosing proves nothing.
//
// So the file is read, its relative specifiers are made absolute, and the
// unchanged text is handed to the loader as `.mjs`. Nothing is rewritten but
// the paths, and the module that runs is the file on disk.
//
// If a caller ever points this at a file that really does hold JSX, the loader
// says so in its own words and the probe stops — which is the failure mode
// this is shaped to make obvious.

import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = new URL('../', import.meta.url).pathname;

/** Every relative specifier, resolved against the file's OWN directory. */
function absolutise(text, fromDir) {
  return text.replace(
    /(from\s*|import\s*\(\s*)(['"])(\.[^'"]*)\2/g,
    (_, head, q, spec) => `${head}${q}${pathToFileURL(resolve(fromDir, spec)).href}${q}`,
  );
}

/**
 * Import a `.jsx` file that contains no JSX.
 *
 * @param {string} rel  repo-relative path, e.g. `src/retail/design/detail/docked.jsx`
 */
export async function loadPlainJsx(rel) {
  const path = join(ROOT, rel);
  const text = readFileSync(path, 'utf8');
  const dir = mkdtempSync(join(tmpdir(), 't72-'));
  const out = join(dir, `${rel.split('/').pop().replace(/\.jsx$/, '')}.mjs`);
  writeFileSync(out, absolutise(text, dirname(path)));
  return import(pathToFileURL(out).href);
}
