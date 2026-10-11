// ─── T77 F5 · KASACJA: THE COPYRIGHT HEADERS ──────────────────────────────────
//
// CLAUDE.md T77 F5: *"Eight new files open with `// Copyright [...] Ltd. All
// rights reserved.` No file in this repo carries a copyright header, and that
// company name is not one of the owner's. Delete the line from every file the
// patch adds (`src/engine/ornateFront.js`, `ornateFrontProfile.js`,
// `ornateFrontArt.js`, `engine/cnc/ornateExport.js`, the four `ornate-*`
// scripts and tests that carry it) and from `docs/ornate-a-handoff-PL.md`. The
// owner decides any notice for the whole repo separately; nothing is invented
// in its place."*  And TESTS AND PROOF: *"`test/turn77-*.test.js` ... for F5
// (no file under `src/` or `scripts/` starts with a copyright line)."*
// (The company's name is elided in the quote and built from parts below, so a
// search of the repo for it finds this file clean.)
//
// The F2 probe counted fourteen files in five spellings, not eight: four in
// src/engine, five scripts (one a seven line "proprietary" block under the
// shebang, one an HTML comment), GPT's four tests and the handoff doc. The
// owner's own names (Skylon Joinery, the Skylon puzzle, SKYLON_COMMON.lsp) are
// not a copyright line: nothing here matches them and nothing may touch them.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const at = (rel) => new URL(rel, ROOT);
const read = (rel) => readFileSync(at(rel), 'utf8');
const linesOf = (text) => text.split(/\r?\n/);

// The company that is not the owner's, never written whole in this file.
const COMPANY = ['Skylon', 'Development'].join(' ');

// A copyright line, as GPT spelled it five ways (and the sign, for good measure).
// A copyright LINE: one whose text, once its comment marker (// /* * <!-- #)
// is set aside, opens with the notice. A heading or a quotation that only
// mentions the word (the F5 fragment of scripts/t77-classify.d quotes
// CLAUDE.md T77 F5, line for line) is not a copyright line.
const HEADER_NOTICE = /^\s*(?:\/\/+|\/\*+|\*+|<!--|#)?\s*(?:copyright\b|all rights reserved|\(c\)\s*\d{4}|©\s*\d{4})/i;
// Anywhere in the files the patch added: no notice, and nothing in its place.
const ANY_NOTICE = /copyright|all rights reserved|proprietary/i;
const HEAD_LINES = 15;

const TEXT_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.html', '.css', '.json', '.md', '.txt', '.sh',
]);
const extensionOf = (name) => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot).toLowerCase() : '';
};

// Every text file under a top-level directory, as repo-relative posix paths.
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(at(`${dir}/`), { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(rel));
    else if (entry.isFile() && TEXT_EXTENSIONS.has(extensionOf(entry.name))) out.push(rel);
  }
  return out;
}

const report = (hits) => hits.map((h) => `  ${h.path}:${h.line}: ${h.text}`).join('\n');
// The whole line is tested; only the report is shortened (the preview HTML is
// one long minified line, and a notice may sit far along it).
const scan = (path, pattern, limit = Infinity) => linesOf(read(path))
  .slice(0, limit)
  .map((text, i) => ({ path, line: i + 1, full: text, text: text.trim().slice(0, 120) }))
  .filter((h) => pattern.test(h.full));

// The files the patch added that carried the line, and the doc.
const PATCH_ADDED = [
  'src/engine/ornateFront.js',
  'src/engine/ornateFrontProfile.js',
  'src/engine/ornateFrontArt.js',
  'src/engine/cnc/ornateExport.js',
  'scripts/ornate-classify.mjs',
  'scripts/ornate-export-examples.mjs',
  'scripts/ornate-render.mjs',
  'scripts/ornate-preview.html',
  'test/ornate-front-cnc.test.js',
  'test/ornate-front-geometry.test.js',
  'test/ornate-front-integration.test.js',
  'test/ornate-front-solid.test.js',
  'docs/ornate-a-handoff-PL.md',
];
// GPT's walk is folded into scripts/t77-walk.mjs and deleted in F7: checked
// only while it stands.
const WALK = 'scripts/ornate-walk.mjs';
const patchAddedStanding = () => [...PATCH_ADDED, ...(existsSync(at(WALK)) ? [WALK] : [])];

test('F5 · the matcher knows the five spellings GPT used, and not the owner\'s own names', () => {
  const gpt = [
    `// Copyright ${COMPANY} Ltd. All rights reserved.`,
    `// Copyright (c) 2026 ${COMPANY} Ltd.`,
    `// Copyright (c) ${COMPANY} Ltd. All rights reserved.`,
    ` * Copyright (c) 2026 ${COMPANY} Ltd. All rights reserved.`,
    `<!-- Copyright ${COMPANY} Ltd. All rights reserved. --><html lang="en">`,
    `Copyright (c) 2026 ${COMPANY} Ltd.`,
  ];
  for (const line of gpt) {
    assert.match(line, HEADER_NOTICE, `the head scan would miss: ${line}`);
    assert.match(line, ANY_NOTICE, `the body scan would miss: ${line}`);
    assert.ok(line.toLowerCase().includes(COMPANY.toLowerCase()), `the company needle would miss: ${line}`);
  }
  assert.match(' * This file is proprietary and confidential. Unauthorised copying,', ANY_NOTICE);
  const owners = [
    "  label: 'Skylon Joinery',",
    '// drill positions, the Skylon puzzle joint geometry and the drawer standard.',
    '    // rake. The law is stated in `reference/lisp/SKYLON_COMMON.lsp`',
  ];
  for (const line of owners) {
    assert.doesNotMatch(line, HEADER_NOTICE, `the owner's name is not a copyright line: ${line}`);
    assert.doesNotMatch(line, ANY_NOTICE, `the owner's name is not a notice: ${line}`);
    assert.ok(!line.toLowerCase().includes(COMPANY.toLowerCase()), `the needle caught the owner's name: ${line}`);
  }
});

test('F5 · no file under src/ or scripts/ starts with a copyright line (first 15 lines)', () => {
  const files = [...walk('src'), ...walk('scripts')];
  // The walk is real: it reaches the whole tree, and the patch's own files in it.
  assert.ok(files.length > 300, `the walk found only ${files.length} text files under src/ and scripts/`);
  for (const rel of patchAddedStanding().filter((p) => p.startsWith('src/') || p.startsWith('scripts/'))) {
    assert.ok(files.includes(rel), `the walk did not reach ${rel}`);
  }
  const hits = files.flatMap((rel) => scan(rel, HEADER_NOTICE, HEAD_LINES));
  assert.deepEqual(
    hits.map((h) => `${h.path}:${h.line}`), [],
    `${hits.length} copyright line(s) in the head of a file under src/ or scripts/:\n${report(hits)}`,
  );
});

test('F5 · the company line is gone from every file the patch added and from the doc', () => {
  const missing = PATCH_ADDED.filter((rel) => !existsSync(at(rel)));
  assert.deepEqual(missing, [], `a file F5 names is gone, so this test cannot read it: ${missing.join(', ')}`);
  const needle = new RegExp(COMPANY, 'i');
  const hits = patchAddedStanding().flatMap((rel) => scan(rel, needle));
  assert.deepEqual(
    hits.map((h) => `${h.path}:${h.line}`), [],
    `the company that is not the owner's still stands in ${hits.length} line(s):\n${report(hits)}`,
  );
});

test('F5 · nothing is invented in its place: no notice of any kind in those files', () => {
  const hits = patchAddedStanding()
    .filter((rel) => existsSync(at(rel)))
    .flatMap((rel) => scan(rel, ANY_NOTICE));
  assert.deepEqual(
    hits.map((h) => `${h.path}:${h.line}`), [],
    `a copyright, rights or proprietary notice stands in ${hits.length} line(s):\n${report(hits)}`,
  );
});

test('F5 · the owner\'s own names stand: kasacja took the company line only', () => {
  // *"that company name is not one of the owner's"*: the owner's are left whole.
  assert.match(read('src/engine/profile.js'), /label:\s*'Skylon Joinery'/, 'the workshop profile lost the owner\'s name');
  assert.ok(existsSync(at('reference/lisp/SKYLON_COMMON.lsp')), 'the owner\'s LISP is gone');
  assert.match(read('src/components/RightPanel.jsx'), /Skylon puzzle/, 'the Skylon puzzle lost its name');
});
