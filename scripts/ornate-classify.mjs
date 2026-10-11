#!/usr/bin/env node
// Read-only proof for Ornate A. This does not re-pin any fixture or reuse a
// previous turn's mutable base. Run: node scripts/ornate-classify.mjs
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const BASE = '2766045116637e0b0cc37894d4333290abe0e894';
const ORNATE = ['ORNATE_A_1', 'ORNATE_A_2', 'ORNATE_A_3', 'ORNATE_A_4'];
const LEGACY_DECORATION = ['G', 'GF', 'A', 'AH', 'FL', 'AM'];
const sha = (value) => createHash('sha256').update(value).digest('hex');
const stable = (value) => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]])) : item);
const git = (...args) => execFileSync('git', args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
const names = (buffer) => buffer.toString('utf8').split(/\r?\n/).filter(Boolean);

export const LICENSED = {
  'src/3d/frontDecorationSolid.js': 'Render the canonical Ornate relief surface only when the explicit recipe emitted it.',
  'src/components/CncView.jsx': 'Preview only: show shared proposed relief contours and reference depth labels; default production entities unchanged.',
  'src/components/FrontDecorationControls.jsx': 'Expose the requested Ornate variant and mirror controls; retain legacy controls.',
  'src/engine/cnc/frontOperations.js': 'Recognise Ornate reference-only reliefs and prevent production DXF machining layers.',
  'src/engine/cnc/ornateExport.js': 'New reference DXF, STL and manifest from canonical Ornate geometry; no approved toolpaths.',
  'src/engine/design.js': 'Add four explicit ORNATE_A style IDs to the existing style cascade.',
  'src/engine/drawings/frontDecorationDrawing.js': 'Project the canonical Ornate contours in existing front and part drawings.',
  'src/engine/frontDecoration.js': 'Delegate only the four ORNATE_A recipe IDs; leave legacy geometry in its existing path.',
  'src/engine/frontDecorationBom.js': 'Describe Ornate reliefs and their reference-only manufacturing status.',
  'src/engine/frontStyleArt.js': 'Register the four new gallery thumbnails.',
  'src/engine/ornateFront.js': 'New pure opt-in Ornate normalization, validation and canonical relief geometry.',
  'src/engine/ornateFrontArt.js': 'New four-variant gallery art, independent of production geometry.',
  'src/engine/ornateFrontProfile.js': 'New proposed profile numbers for the four Ornate recipes.',
  'src/engine/profile.js': 'Append proposed Ornate recipes without changing legacy profile values.',
  'src/lib/cncExport.js': 'Package Ornate CAD/CAM references through the existing export route.',
  'src/retail/design/Options.jsx': 'Recognise the explicitly selected Ornate recipe in Retail.',
  'src/retail/design/adapter.js': 'Persist the explicitly selected Ornate recipe through Retail updates.',
  'src/retail/design/material/FrontDecorationControls.jsx': 'Maintain the independent Retail copy of Ornate controls.',
};

// The same worker is executed against the named commit and the current tree.
// It never calls a fixture writer and it checks stored expected results too.
const WORKER = String.raw`
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dump } from './scripts/t64-classify.mjs';
import { T75_GOLDENS } from './scripts/t75-goldens.mjs';
import { goldenOf } from './scripts/t75-golden.mjs';
import { computeCabinet } from './src/engine/cabinet.js';
import { defaultParamsFor } from './src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from './src/engine/profile.js';
import { defaultFrontDecoration } from './src/engine/frontDecoration.js';
const stable = (value) => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]])) : item);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const decorated = (panel) => Boolean(panel.meta?.frontDecoration || panel.meta?.frontDecorationParent);
const six = dump();
const pinnedSix = JSON.parse(readFileSync('./verify/t70/goldens-base.json', 'utf8'));
const t75 = T75_GOLDENS.map((g) => {
  const file = JSON.parse(readFileSync('./fixtures/' + g.file, 'utf8'));
  const value = g.make ? g.make() : goldenOf(file.params, P);
  const expected = file.expected ?? file;
  return { file: g.file, sha256: sha(stable(value)), expectedSha256: sha(stable(expected)),
    matchesFixture: stable(value) === stable(expected),
    ornateGateOpen: String(file.params?.front_type || '').startsWith('ORNATE_A_')
      || String(file.params?.front_decoration?.style || '').startsWith('ORNATE_A_') };
});
const fixture = JSON.parse(readFileSync('./fixtures/golden-decorative-fronts.json', 'utf8'));
const decoration = Object.entries(fixture).map(([style, want]) => {
  const params = { ...defaultParamsFor('BUD', P), front_type: style };
  const withoutRecipe = computeCabinet(params, P).panels.filter(decorated).length;
  const cut = computeCabinet({ ...params, front_decoration: defaultFrontDecoration(style, P) }, P).panels.filter(decorated);
  const parts = cut.map((p) => ({ id: p.id, w: p.w, h: p.h, thickness: p.thickness,
    operations: p.meta?.frontDecoration?.operations?.length || 0 }));
  const hash = sha(JSON.stringify(cut));
  return { style, sha256: hash, matchesFixture: hash === want.sha256 && stable(parts) === stable(want.parts),
    withoutRecipe, ready: cut.filter((p) => p.meta?.frontDecoration).every((p) => p.meta.frontDecoration.status === 'ready') };
});
const oldGates = Object.keys(six).map((type) => {
  const params = defaultParamsFor(type, P);
  return { type, recipeAbsent: params.front_decoration === undefined,
    decoratedParts: computeCabinet(params, P).panels.filter(decorated).length };
});
console.log(JSON.stringify({ six, pinnedSix, t75, decoration, oldGates }));
`;

function runtimeAt(root) {
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', WORKER], {
    cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  }));
}

function baseRuntime() {
  git('rev-parse', '--verify', `${BASE}^{commit}`);
  const folder = mkdtempSync(join(tmpdir(), 'cabinet-ornate-proof-'));
  try {
    const archive = git('archive', BASE, 'package.json', 'src', 'scripts', 'fixtures', 'reference', 'verify/t70/goldens-base.json');
    execFileSync('tar', ['-xf', '-', '-C', folder], { input: archive });
    const dependencies = join(ROOT, 'node_modules');
    if (existsSync(dependencies)) symlinkSync(dependencies, join(folder, 'node_modules'), 'dir');
    return runtimeAt(folder);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

const failures = [];
const requireProof = (value, reason) => { if (!value) failures.push(reason); };
const trackedBase = names(git('ls-tree', '-r', '--name-only', BASE));
const frozenPaths = trackedBase.filter((path) => /(^|\/)fixtures\/.*\.json$/i.test(path) || /\.lsp$/i.test(path));
const bytes = frozenPaths.map((path) => {
  const baseHash = sha(git('show', `${BASE}:${path}`));
  const currentHash = existsSync(join(ROOT, path)) ? sha(readFileSync(join(ROOT, path))) : null;
  const identical = baseHash === currentHash;
  requireProof(identical, `Frozen fixture/LISP bytes changed: ${path}`);
  return { path, baseSha256: baseHash, headSha256: currentHash, identical };
});
const touched = [...new Set([
  ...names(git('diff', '--name-only', BASE, '--', 'src')),
  ...names(git('ls-files', '--others', '--exclude-standard', '--', 'src')),
])].sort();
const sourceChanges = touched.map((path) => ({ path, why: LICENSED[path] ?? null }));
const unnamed = sourceChanges.filter((row) => !row.why);
requireProof(!unnamed.length, `Unnamed source changes: ${unnamed.map((row) => row.path).join(', ')}`);
const addedLisp = [...new Set([
  ...names(git('diff', '--name-only', '--diff-filter=A', BASE, '--', '*.lsp')),
  ...names(git('ls-files', '--others', '--exclude-standard', '--', '*.lsp')),
])];
requireProof(addedLisp.length === 0, `LISP is unchanged for this reference-only extension: ${addedLisp.join(', ')}`);

const base = baseRuntime();
const head = runtimeAt(ROOT);
requireProof(stable(base.six) === stable(head.six), 'Six legacy runtime goldens differ from the exact base commit.');
requireProof(stable(head.six) === stable(head.pinnedSix), 'Six legacy runtime goldens differ from their pinned expectations.');
requireProof(stable(base.t75) === stable(head.t75), 'T75 golden summaries differ from the exact base commit.');
requireProof(head.t75.length > 0 && head.t75.every((g) => g.matchesFixture && !g.ornateGateOpen), 'A T75 fixture changed or opens the Ornate gate.');
requireProof(stable(base.decoration) === stable(head.decoration), 'Legacy decoration results differ from the exact base commit.');
requireProof(stable(head.decoration.map((g) => g.style).sort()) === stable([...LEGACY_DECORATION].sort()), 'The six existing decorative fixtures changed identity.');
requireProof(head.decoration.every((g) => g.matchesFixture && g.withoutRecipe === 0 && g.ready), 'A legacy decoration fixture or explicit opt-in changed.');
requireProof(head.oldGates.every((g) => g.recipeAbsent && g.decoratedParts === 0), 'A standard cabinet now carries decoration without opt-in.');

const { ORNATE_STYLE_IDS, defaultFrontDecoration } = await import('../src/engine/frontDecoration.js');
const { computeCabinet } = await import('../src/engine/cabinet.js');
const { defaultParamsFor } = await import('../src/engine/types.js');
const { DEFAULT_CABINET_PROFILE: P } = await import('../src/engine/profile.js');
const { FRONT_STYLE_OPTIONS } = await import('../src/engine/design.js');
requireProof(stable(ORNATE_STYLE_IDS) === stable(ORNATE), 'Ornate geometry IDs differ from the four authorised IDs.');
requireProof(stable(FRONT_STYLE_OPTIONS.filter((s) => s.id.startsWith('ORNATE')).map((s) => s.id)) === stable(ORNATE), 'The gallery exposes unexpected Ornate IDs.');
const ornateOptIn = ORNATE.map((style) => {
  const params = { ...defaultParamsFor('BUD', P), front_type: style };
  const withoutRecipe = computeCabinet(params, P).panels.filter((p) => p.meta?.frontDecoration).length;
  const recipe = defaultFrontDecoration(style, P);
  const fronts = computeCabinet({ ...params, front_decoration: recipe }, P).panels.filter((p) => p.meta?.frontDecoration);
  const readyReliefs = fronts.filter((p) => p.meta.frontDecoration.status === 'ready'
    && p.meta.frontDecoration.operations.some((op) => op.kind === 'relief')).length;
  requireProof(withoutRecipe === 0 && fronts.length > 0 && readyReliefs === fronts.length,
    `${style} has no live explicit opt-in, or produces decoration without a recipe.`);
  return { style, withoutRecipe, explicitFronts: fronts.length, readyReliefs };
});

console.log(JSON.stringify({
  schema: 'cabinet-core.ornate-proof', base: BASE, passed: failures.length === 0,
  UNNAMED: unnamed.length, sourceChanges,
  frozenBytes: { fixtureJson: bytes.filter((r) => /\.json$/i.test(r.path)).length,
    lisp: bytes.filter((r) => /\.lsp$/i.test(r.path)).length, rows: bytes },
  addedLisp, legacyRuntime: head, exactBaseRuntimeMatches: {
    six: stable(base.six) === stable(head.six), t75: stable(base.t75) === stable(head.t75),
    decoration: stable(base.decoration) === stable(head.decoration),
  }, ornateOptIn, failures,
}, null, 2));
process.exitCode = failures.length ? 1 : 0;
