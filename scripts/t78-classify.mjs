#!/usr/bin/env node
// === THE BYTE-IDENTITY CONTRACT FOR TURN 78 ===================================
//
// CLAUDE.md T78, FROZEN 1, verbatim:
//
//   "Goldens: the six, T75's nine, T76's decoration file, T77's ornate
//   records, byte-identical. `scripts/t78-classify.mjs` names every engine
//   delta and proves no golden can reach it. New kits and new cut geometries
//   get goldens of their own (named per F)."
//
// FROZEN 2: "Existing LISP untouched; new LISP files only (named per F)";
// two Fs amend an existing file by the owner's own order and are licensed
// below by CLAUDE.md's words (F4: KIT_CORNER_L.lsp, "lisp najpierw"; F19:
// SKYLON_JOINTS_DOWEL.lsp, "T75's file is amended to the owner's numbers").
// FROZEN 4: lighting untouched. FROZEN 5: the biscuit numbers do not move.
//
// T77's shape (`scripts/t77-classify.mjs`): every `src/engine` and `src/lib`
// file that differs from THE BASE is NAMED by a fragment with its reason and
// the GATES its delta hangs on; every gate is asked of every golden's params
// (the six by `defaultParamsFor`, T75's goldens, T76's decoration records,
// T77's ornate proposals and T78's own goldens); every gate is OPENED on a
// crafted cabinet so the delta is shown to be live; then the six are hashed
// against `verify/t70/goldens-base.json` AS THE BASE COMMIT HOLDS IT, T75's
// goldens re-made, T76's decoration file re-made record by record, T77's four
// proposals shown to be proposals still, and T78's goldens compared through
// `scripts/t78-goldens.mjs`.
//
// WHAT IS NEW TONIGHT, because the owner's list moves goldens on purpose:
//
//   RE-PINNED (named)  a fragment's `REPINNED: [{ file, why }]` names a golden
//                      or a fixture its F moves knowingly (F10: the blind
//                      goldens and two T75 store fixtures; F15: PANTRY of the
//                      six and golden-bud-int; F19: golden-dowel-bud). Such a
//                      file may differ from the base; the row says who named
//                      it and why. A moved file nobody named is MOVED and
//                      fails the run.
//
//   A GATE A GOLDEN OPENS is answered in one of four ways, printed beside it:
//     own          the golden is the gate's own F's (T78's goldens are cut
//                  through the gates they were written to prove);
//     re-pinned    the golden is named in REPINNED by the fragment (it was
//                  moved knowingly and its new bytes are held above);
//     held         the golden opens the gate (the three L goldens of T75 are
//                  L kits, T76's A / AH records are arched) and its bytes are
//                  byte-identical in THIS run: what the delta reaches is held
//                  by the golden itself, T77's treatment of T76's records;
//     FAIL         none of the above: a golden can reach the delta and nothing
//                  holds it.
//
//   --allow-unnamed <regex>   the integrator's intermediate runs: an UNNAMED
//                             engine/lib file, or a moved fixture nobody has
//                             named yet, matching the regex is reported as
//                             "awaiting its fragment" and does not fail the
//                             run. The strict run (no flag) is the contract and
//                             is what test/turn78-classify.test.js asserts.
//
// THE FRAGMENTS: one file per F in `scripts/t78-classify.d/fNN*.mjs` (its
// README names the shape: GATES, LICENSED, LIVENESS, GOLDENS, REPINNED,
// COMMIT, and tonight also an optional LISP: { 'reference/lisp/X.lsp': why }
// for an existing LISP file an F amends). A fragment file that lands later is
// picked up by the directory read; nothing here lists them by name.
//
//   node scripts/t78-classify.mjs
//   node scripts/t78-classify.mjs --allow-unnamed 'spray|warehouse'

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

import { dump } from './t64-classify.mjs';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { T75_GOLDENS } from './t75-goldens.mjs';
import { T78_GOLDENS } from './t78-goldens.mjs';
import { goldenOf } from './t75-golden.mjs';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
// Namespaces, not names (T76's reason): a name that leaves these modules must
// be a finding in the report, not a crash at link.
import * as FRONT_DECORATION from '../src/engine/frontDecoration.js';
import * as DESIGN from '../src/engine/design.js';

const ROOT = new URL('../', import.meta.url).pathname;
const src = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const here = (rel) => existsSync(new URL(`../${rel}`, import.meta.url));
const git = (args) => {
  try {
    return execFileSync('git', args, {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024,
    });
  } catch { return null; }
};
const lines = (out) => (out || '').trim().split('\n').filter(Boolean);
const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const hasCommit = (ref) => git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]) !== null;
const inTreeOf = (ref, file) => git(['cat-file', '-e', `${ref}:${file}`]) !== null;
const out = (s) => process.stdout.write(s);

// THE BASE: the owner's own commit before this turn ("tura spray i cabneo",
// origin/main after PR #76). Named as a COMMIT, not a branch: origin/main moves
// when the owner merges this turn, and a diff against a base that already
// carries the turn names nothing. A clone without the commit falls back to the
// branch, and the report says so.
const BASE_COMMIT = '16477dfef32e0a2a38411a35f56a760e8c9d88f2';
const BASE_SUBJECT = 'tura spray i cabneo';
const baseRef = () => [BASE_COMMIT, 'origin/main', 'main'].find(hasCommit);

// --allow-unnamed <regex> | --allow-unnamed=<regex>
const argv = process.argv.slice(2);
let allowUnnamed = null;
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  if (a === '--allow-unnamed') { allowUnnamed = new RegExp(argv[i + 1] || '(?!)'); i += 1; } else if (a.startsWith('--allow-unnamed=')) allowUnnamed = new RegExp(a.slice('--allow-unnamed='.length) || '(?!)');
}

const THE_SIX = ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY'];
const SIX_FILE = 'verify/t70/goldens-base.json';
const DECORATION_FILE = 'fixtures/golden-decorative-fronts.json';
/** T77's four proposals (THE ORDER 1: Classic, Symmetric, Soft, Plain), named and not pinned. */
const ORNATE = ['ORNATE_A_1', 'ORNATE_A_2', 'ORNATE_A_3', 'ORNATE_A_4'];
const PLACEHOLDER = 'procedural placeholder';

/** A decorative recipe through the profile (T76 F4's signature). */
const recipeOf = (style) => (typeof FRONT_DECORATION.defaultFrontDecoration === 'function'
  ? FRONT_DECORATION.defaultFrontDecoration(style, P)
  : null);
const decoratedPart = (p) => Boolean(p?.meta?.frontDecoration || p?.meta?.frontDecorationParent);

// === THE FRAGMENTS, MERGED ====================================================
//
// A file licensed twice carries both reasons and the union of their gates; a
// gate or a liveness probe named twice is a failure, not a merge. Each gate
// remembers the fragment (and the F) that owns it, so a golden opening it can
// be answered "own" or "re-pinned" by that fragment's own lists.

const FRAGMENT_DIR = new URL('./t78-classify.d/', import.meta.url);
const fragmentNames = existsSync(FRAGMENT_DIR)
  ? readdirSync(FRAGMENT_DIR).filter((n) => /^f\d\d[a-z0-9-]*\.mjs$/.test(n)).sort()
  : [];
const fLabel = (name) => `F${parseInt(name.slice(1, 3), 10)}`;

export const GATES = {};
export const LICENSED = {};
const GATE_OWNER = {};
const FRAGMENT_LIVENESS = {};
const REPINNED = [];
const LISP_LICENSED = {
  // CLAUDE.md T78 F4: "rotate the CUT orientation of SHELF-L (and the L bottom
  // and top ...) by 90 degrees in KIT_CORNER_L.lsp first, then in the engine".
  'reference/lisp/KIT_CORNER_L.lsp': { F: 'F4', why: 'CLAUDE.md F4: the grain of the L boards, LISP first (section 10 gained)' },
  // CLAUDE.md T78 F19: "SKYLON_JOINTS_DOWEL.lsp (T75's file) is amended to the owner's numbers".
  'reference/lisp/SKYLON_JOINTS_DOWEL.lsp': { F: 'F19', why: 'CLAUDE.md F19: T75\'s file amended to the owner\'s numbers (6 mm, every 250, min 2)' },
};
const FRAGS = [];
for (const name of fragmentNames) {
  // eslint-disable-next-line no-await-in-loop
  const frag = await import(new URL(name, FRAGMENT_DIR));
  const F = fLabel(name);
  for (const [k, g] of Object.entries(frag.GATES || {})) {
    if (GATES[k]) throw new Error(`${name}: gate ${k} is named twice (first by ${GATE_OWNER[k].frag})`);
    GATES[k] = g;
    GATE_OWNER[k] = { frag: name, F };
  }
  for (const [file, lic] of Object.entries(frag.LICENSED || {})) {
    const had = LICENSED[file];
    LICENSED[file] = had
      ? {
        why: `${had.why.replace(/\.$/, '')}. ${lic.why}`,
        gates: [...new Set([...(had.gates || []), ...(lic.gates || [])])],
        by: [...had.by, name],
        ...(had.drawing || lic.drawing ? { drawing: true } : {}),
      }
      : { ...lic, gates: lic.gates || [], by: [name] };
  }
  for (const [k, probe] of Object.entries(frag.LIVENESS || {})) {
    if (FRAGMENT_LIVENESS[k]) throw new Error(`${name}: liveness ${k} is named twice`);
    FRAGMENT_LIVENESS[k] = probe;
  }
  for (const r of frag.REPINNED || []) REPINNED.push({ ...r, frag: name, F });
  for (const [file, why] of Object.entries(frag.LISP || {})) LISP_LICENSED[file] = { F, why: typeof why === 'string' ? why : why?.why || '' };
  FRAGS.push({
    name, F, commit: frag.COMMIT || null, files: Object.keys(frag.LICENSED || {}), gates: Object.keys(frag.GATES || {}),
    goldens: (frag.GOLDENS || []).map((g) => g.file), repinned: (frag.REPINNED || []).map((r) => r.file),
  });
}

/** A REPINNED entry's file, as a fixture path or `verify/t70/goldens-base.json (ID)`. */
const normFile = (f) => String(f || '').trim().replace(/^\.\//, '');
const repinsOf = (fileKey) => REPINNED.filter((r) => normFile(r.file) === normFile(fileKey));

// === WHAT CLAUDE.md FREEZES BY NAME ===========================================

const ASKED = ['src/engine', 'src/lib'];
/** FROZEN 4: "engine/ledStrips.js, engine/lighting.js, engine/lightRig.js, the light panels: not one line." */
const LIGHTING = [
  'src/engine/ledStrips.js', 'src/engine/lighting.js', 'src/engine/lightRig.js',
  'src/components/LightingPanel.jsx', 'src/retail/design/lighting/LightingPanel.jsx',
  'src/3d/LedStrips.jsx', 'src/3d/LedIcons.jsx',
];
/** FROZEN 5: "profile.biscuits stays gap 10, wideThreshold 700, edgeMin 50, markLength 70". */
const BISCUITS = { gap: 10, wideThreshold: 700, edgeMin: 50, markLength: 70 };
const BISCUIT_FIXTURE = 'fixtures/golden-partition-biscuits.json';

/** Every file under `src/` that names this symbol, comments stripped. */
const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function codeReadersOf(symbol) {
  const files = lines(git(['grep', '-l', '-e', symbol, '--', 'src']));
  const re = new RegExp(symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return files.filter((f) => { try { return re.test(strip(src(f))); } catch { return false; } });
}

function engineImportsOf(rel, seen = new Set()) {
  if (seen.has(rel)) return seen;
  seen.add(rel);
  let t;
  try { t = strip(src(rel)); } catch { return seen; }
  for (const m of t.matchAll(/from\s+'([^']+)'/g)) {
    const spec = m[1];
    if (!spec.startsWith('.')) continue;
    const dir = rel.split('/').slice(0, -1).join('/');
    const parts = `${dir}/${spec}`.split('/');
    const acc = [];
    for (const p of parts) { if (p === '..') acc.pop(); else if (p !== '.') acc.push(p); }
    let path = acc.join('/');
    if (!/\.(jsx?|json)$/.test(path)) path += '.js';
    if (here(path)) engineImportsOf(path, seen);
  }
  return seen;
}
const cutGraph = engineImportsOf('src/engine/cabinet.js');

/** The LISP paren scan of test/turn35-lisp-parens.test.js (the law); restated so the report can say "balanced". */
function parenScan(text) {
  let depth = 0; let min = 0; let inString = false; let inComment = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inComment) { if (ch === '\n') inComment = false; continue; }
    if (inString) { if (ch === '\\') { i += 1; continue; } if (ch === '"') inString = false; continue; }
    if (ch === '"') { inString = true; continue; }
    if (ch === ';') { inComment = true; continue; }
    if (ch === '(') depth += 1;
    else if (ch === ')') { depth -= 1; if (depth < min) min = depth; }
  }
  return { balance: depth, min };
}

const stable = (value) => JSON.stringify(value, (key, v) => {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]));
  }
  return v;
});

// === THE SIX, AGAINST THE BASE COMMIT'S OWN FILE ==============================
//
// FROZEN 1 says byte-identical to the base. The working tree's
// `verify/t70/goldens-base.json` may itself have been re-pinned (F15 names
// PANTRY), so the truth asked here is the file AS THE BASE COMMIT HOLDS IT;
// the working tree's copy is then asked whether it carries the head's hash
// for a re-pinned row (the re-pin was written) and nothing else moved.

const HEAD_DUMP = dump();
function sixRows(ref) {
  const atBase = ref && inTreeOf(ref, SIX_FILE) ? JSON.parse(git(['show', `${ref}:${SIX_FILE}`])) : null;
  const inTree = here(SIX_FILE) ? JSON.parse(src(SIX_FILE)) : null;
  const truth = atBase || inTree || {};
  const head = HEAD_DUMP;
  return THE_SIX.map((id) => {
    const want = truth[id]?.sha256;
    const got = head[id]?.sha256;
    const same = Boolean(want && got && want === got);
    const repins = repinsOf(`${SIX_FILE} (${id})`);
    const written = inTree?.[id]?.sha256 === got;
    const verdict = same ? 'IDENTICAL' : repins.length ? 'RE-PINNED (named)' : 'MOVED';
    return {
      id, same, verdict, held: same || repins.length > 0, repins, written, got: got || head[id]?.error,
      truthFrom: atBase ? `${ref.slice(0, 7)}:${SIX_FILE}` : SIX_FILE,
    };
  });
}

// === T75'S GOLDENS, RE-MADE AND COMPARED ======================================

function t75Rows(ref) {
  return T75_GOLDENS.map((g) => {
    const file = `fixtures/${g.file}`;
    const repins = repinsOf(file);
    const changed = ref ? lines(git(['diff', '--name-only', ref, '--', file])).length > 0 : false;
    if (!here(file)) return { ...g, file: g.file, ok: false, held: false, repins, changed, params: {}, said: 'fixture missing' };
    try {
      const want = JSON.parse(src(file));
      const got = g.make ? g.make() : goldenOf(want.params, P);
      const ok = stable(want.expected ?? want) === stable(got);
      const pin = changed ? (repins.length ? ` . fixture RE-PINNED (named by ${repins.map((r) => r.frag).join(', ')})` : ' . fixture MOVED against the base, NOT NAMED') : '';
      return {
        ...g, file: g.file, ok, held: ok, repins, changed, params: want.params || {},
        said: `${ok ? 'byte-identical to its fixture' : 'DIFFERS from its fixture'}${pin}`,
      };
    } catch (e) {
      return { ...g, file: g.file, ok: false, held: false, repins, changed, params: {}, said: `threw: ${e.message}` };
    }
  });
}

// === T78'S GOLDENS, THROUGH scripts/t78-goldens.mjs ===========================
//
// The same comparison `--check` makes (JSON.stringify of the re-made summary
// against the file's `expected`), so this report and that script cannot
// disagree about a golden.

function t78Rows(ref) {
  return T78_GOLDENS.map((g) => {
    const file = `fixtures/${g.file}`;
    const existedAtBase = ref ? inTreeOf(ref, file) : false;
    if (!here(file)) return { ...g, ok: false, held: false, existedAtBase, params: {}, said: 'MISSING: the fixture is not written' };
    try {
      const want = JSON.parse(src(file));
      const got = g.make ? g.make() : goldenOf(want.params, P);
      const ok = JSON.stringify(got) === JSON.stringify(want.expected);
      return {
        ...g, ok, held: ok, existedAtBase, params: want.params || {},
        said: `${ok ? 'byte-identical to its fixture' : 'MOVED against its fixture'}${existedAtBase ? ' . existed at the base (not new)' : ' . new since the base'}`,
      };
    } catch (e) {
      return { ...g, ok: false, held: false, existedAtBase, params: {}, said: `threw: ${e.message}` };
    }
  });
}

// === T76'S DECORATION FILE, RECORD BY RECORD; T77'S FOUR PROPOSALS ============
//
// Each record is re-made the way T76 makes it: BUD's defaults, `front_type`
// the style, `front_decoration` the style's default recipe; the record is the
// sha256 of `JSON.stringify` of the decorated cut parts. T77's four ORNATE_A
// styles are proposals (CLAUDE.md T77, THE ORDER 2): named beside the file,
// not pinned in it, each shown to be a ready relief the style alone never
// cuts, reference only, not production approved.

const decorationFile = () => (here(DECORATION_FILE) ? JSON.parse(src(DECORATION_FILE)) : null);
const pinnedOf = (file) => (file ? Object.keys(file).filter((k) => typeof file[k]?.sha256 === 'string') : []);
const partsOf = (cut) => cut.map((p) => ({
  id: p.id, w: p.w, h: p.h, thickness: p.thickness, operations: p.meta?.frontDecoration?.operations?.length || 0,
}));
const recordParams = (style) => ({ ...defaultParamsFor('BUD', P), front_type: style, front_decoration: recipeOf(style) });

function decorationRows() {
  const file = decorationFile();
  if (!file) return { rows: [], pinned: [], agree: false, said: 'fixture missing' };
  const pinned = pinnedOf(file);
  const rows = pinned.map((style) => {
    const want = file[style];
    try {
      const recipe = recipeOf(style);
      if (!recipe) return { style, ok: false, said: 'the engine has no recipe for this style' };
      const bare = { ...defaultParamsFor('BUD', P), front_type: style };
      const alone = computeCabinet(bare, P).panels.filter(decoratedPart).length;
      const cut = computeCabinet({ ...bare, front_decoration: recipe }, P).panels.filter(decoratedPart);
      const fronts = cut.filter((p) => p.meta?.frontDecoration);
      const blocked = fronts.filter((p) => p.meta.frontDecoration.status !== 'ready').map((p) => p.id);
      const sha = sha256(JSON.stringify(cut));
      const parts = partsOf(cut);
      const sameSha = sha === want.sha256;
      const sameParts = want.parts === undefined || stable(parts) === stable(want.parts);
      const ok = sameSha && sameParts && alone === 0 && fronts.length > 0 && blocked.length === 0;
      const summary = parts.map((x) => `${x.id} ${x.w} x ${x.h} x ${x.thickness}${x.operations ? `, ${x.operations} op` : ''}`).join('; ');
      const why = [
        sameSha ? null : `sha256 now ${sha}`,
        sameParts ? null : `parts now ${JSON.stringify(parts)}`,
        alone === 0 ? null : `the style alone cuts ${alone} decorated part(s)`,
        fronts.length ? null : 'no leaf decorated',
        blocked.length ? `BLOCKED: ${blocked.join(', ')}` : null,
      ].filter(Boolean);
      return { style, ok, said: ok ? `${summary} . sha256 ${sha.slice(0, 16)}` : `DIFFERS: ${why.join('; ')}` };
    } catch (e) {
      return { style, ok: false, said: `threw: ${e.message}` };
    }
  });
  const ids = Array.isArray(DESIGN.FRONT_STYLE_OPTIONS) ? DESIGN.FRONT_STYLE_OPTIONS.map((o) => o.id) : [];
  const offered = ids.filter((id) => { try { return Boolean(recipeOf(id)); } catch { return false; } });
  const engineOrnate = Array.isArray(FRONT_DECORATION.ORNATE_STYLE_IDS) ? [...FRONT_DECORATION.ORNATE_STYLE_IDS] : [];
  const agree = offered.length > 0
    && pinned.every((s) => !ORNATE.includes(s))
    && stable([...offered].sort()) === stable([...pinned, ...ORNATE].sort())
    && stable(engineOrnate) === stable(ORNATE);
  return { rows, pinned, offered, engineOrnate, agree };
}

function proposalRow(style) {
  try {
    const recipe = recipeOf(style);
    if (!recipe) return { style, ok: false, said: 'the engine has no recipe for this proposal' };
    const bare = { ...defaultParamsFor('BUD', P), front_type: style };
    const alone = computeCabinet(bare, P).panels.filter(decoratedPart).length;
    const cut = computeCabinet({ ...bare, front_decoration: recipe }, P).panels.filter(decoratedPart);
    const fronts = cut.filter((p) => p.meta?.frontDecoration);
    const want = recipe.ornament === true ? PLACEHOLDER : 'none';
    const bad = fronts.filter((p) => {
      const d = p.meta.frontDecoration;
      const ops = d.operations || [];
      return d.status !== 'ready' || ops.length !== 1 || ops[0].kind !== 'relief' || d.ornament !== want
        || d.referenceOnly !== true || d.approval?.productionApproved !== false;
    });
    const ok = alone === 0 && fronts.length > 0 && bad.length === 0 && cut.length === fronts.length;
    const summary = fronts.map((p) => `${p.id} ${p.w} x ${p.h} x ${p.thickness}, `
      + `${(p.meta.frontDecoration.operations || []).map((o) => o.kind).join('/') || 'no operation'}`).join('; ');
    const why = [
      alone === 0 ? null : `the style alone cuts ${alone} decorated part(s)`,
      fronts.length ? null : 'no leaf decorated',
      cut.length === fronts.length ? null : `${cut.length - fronts.length} strip(s) cut`,
      ...bad.map((p) => {
        const d = p.meta.frontDecoration;
        return `${p.id}: ${d.status}, ${(d.operations || []).length} op, ornament '${d.ornament}' (want '${want}'), `
          + `referenceOnly ${d.referenceOnly}, productionApproved ${d.approval?.productionApproved}`;
      }),
    ].filter(Boolean);
    return { style, ok, said: ok ? `${summary} . ornament: ${want} . proposed, not production approved . not pinned` : `NOT THE PROPOSAL: ${why.join('; ')}` };
  } catch (e) {
    return { style, ok: false, said: `threw: ${e.message}` };
  }
}

// === EVERY GOLDEN, ASKED OF EVERY GATE ========================================

function openedBy(params, typeId) {
  return Object.entries(GATES).filter(([, g]) => { try { return Boolean(g.opens(params, typeId)); } catch { return false; } }).map(([k]) => k);
}

/**
 * One row per golden: who it is, what it opens, and for each opened gate how
 * the reach is answered (own / re-pinned / held / FAIL), see the header.
 */
function goldenGateRows({ six, t75, t78, deco, proposals }) {
  const rows = [];
  for (const s of six) {
    rows.push({ id: s.id, kind: 'the six', F: null, fileKey: `${SIX_FILE} (${s.id})`, params: defaultParamsFor(s.id, P), typeId: s.id, held: s.held });
  }
  for (const g of t75) {
    rows.push({ id: g.file, kind: `T75 ${g.F}`, F: null, fileKey: `fixtures/${g.file}`, params: g.params || {}, typeId: g.params?.type, held: g.held });
  }
  for (const r of deco.rows) {
    rows.push({ id: `decoration ${r.style}`, kind: 'T76 record', F: null, fileKey: `${DECORATION_FILE} (${r.style})`, params: recordParams(r.style), typeId: 'BUD', held: r.ok });
  }
  for (const r of proposals) {
    rows.push({ id: `ornate ${r.style}`, kind: 'T77 proposal', F: null, fileKey: null, params: recordParams(r.style), typeId: 'BUD', held: r.ok });
  }
  for (const g of t78) {
    rows.push({ id: g.file, kind: `T78 ${g.F}`, F: g.F, fileKey: `fixtures/${g.file}`, params: g.params || {}, typeId: g.params?.type, held: g.held });
  }
  return rows.map((row) => {
    const opens = openedBy(row.params, row.typeId).map((gate) => {
      const owner = GATE_OWNER[gate];
      const repins = row.fileKey ? repinsOf(row.fileKey) : [];
      let verdict;
      if (row.F && owner?.F === row.F) verdict = 'own';
      else if (repins.length) verdict = `re-pinned (named by ${repins.map((r) => r.frag).join(', ')})`;
      else if (row.held) verdict = 'held by its bytes';
      else verdict = 'FAIL';
      return { gate, owner: owner?.frag || '?', verdict };
    });
    return { ...row, opens, fail: opens.some((o) => o.verdict === 'FAIL') };
  });
}

// === EACH GATE OPENED, SO THE DELTA IS SHOWN TO BE LIVE =======================

function liveness() {
  return Object.keys(GATES).map((gate) => {
    try {
      const probe = FRAGMENT_LIVENESS[gate];
      const r = probe ? probe() : { live: false, said: 'no liveness probe written' };
      return { gate, owner: GATE_OWNER[gate]?.frag, ...r };
    } catch (e) {
      return { gate, owner: GATE_OWNER[gate]?.frag, live: false, said: `threw: ${e.message}` };
    }
  });
}

// === THE REPORT ===============================================================

out('=== T78 . THE ENGINE/LIB DELTAS, AND WHAT THEY REACH ===\n\n');
const ref = baseRef();
const exactBase = ref === BASE_COMMIT;
const tally = {
  touched: 0, stray: [], allowed: [], unspent: [], unknownGates: [], lighting: [], lispUnlicensed: [], lispUnbalanced: [],
  fixturesMoved: [], commitMismatch: 0, biscuitsOk: true, beyond: [],
};

if (!ref) {
  out('  no base ref: the goldens below are the whole proof\n\n');
} else {
  out(`  base: ${exactBase ? `${BASE_COMMIT.slice(0, 7)} (the owner's commit, "${BASE_SUBJECT}", origin/main before this turn)`
    : `${ref} (the base commit ${BASE_COMMIT.slice(0, 7)} is not in this clone; once the turn is merged this branch carries it, `
      + 'and the list below can read short)'}\n`);
  out(`  fragments merged: ${fragmentNames.join(', ') || 'none'}\n`);
  out(`  allow-unnamed: ${allowUnnamed ? `/${allowUnnamed.source}/ (an intermediate run; the strict run passes no flag)` : 'none (the strict run)'}\n\n`);

  const touched = [...new Set([
    ...lines(git(['diff', '--name-only', ref, '--', ...ASKED])),
    ...lines(git(['ls-files', '--others', '--exclude-standard', '--', ...ASKED])),
  ])].sort();
  tally.touched = touched.length;
  for (const f of touched) {
    if (LICENSED[f]) out(`  named     ${f}  (${LICENSED[f].by.join(', ')})\n`);
    else if (allowUnnamed && allowUnnamed.test(f)) { tally.allowed.push(f); out(`  UNNAMED   ${f}  (allowed by --allow-unnamed: awaiting its fragment)\n`); } else { tally.stray.push(f); out(`  UNNAMED   ${f}\n`); }
  }
  tally.unspent = Object.keys(LICENSED).filter((f) => ASKED.some((d) => f.startsWith(`${d}/`)) && !touched.includes(f));
  tally.beyond = Object.keys(LICENSED).filter((f) => !ASKED.some((d) => f.startsWith(`${d}/`)))
    .map((f) => ({ f, touched: lines(git(['diff', '--name-only', ref, '--', f])).length > 0 || lines(git(['ls-files', '--others', '--exclude-standard', '--', f])).length > 0 }));
  out(`\n  ${touched.length} engine/lib file(s) changed or added . ${tally.stray.length} not named`
    + `${tally.allowed.length ? ` . ${tally.allowed.length} unnamed but allowed` : ''}\n`);
  out(`  named and unspent (licensed, not touched against the base): ${tally.unspent.length ? tally.unspent.join(', ') : 'none'}\n`);
  out(`  licensed beyond src/engine and src/lib (reported, not asked): ${tally.beyond.length
    ? tally.beyond.map((b) => `${b.f} (${b.touched ? 'touched' : 'NOT touched'})`).join(', ') : 'none'}\n`);

  // FROZEN 4 . lighting.
  tally.lighting = [...new Set([
    ...lines(git(['diff', '--name-only', ref, '--', ...LIGHTING])),
    ...lines(git(['ls-files', '--others', '--exclude-standard', '--', ...LIGHTING])),
  ])];
  out(`  ${tally.lighting.length ? 'FAIL' : 'ok  '}  FROZEN 4, lighting (${LIGHTING.length} files): ${tally.lighting.length ? `TOUCHED ${tally.lighting.join(', ')}` : 'not one line'}\n`);

  // FROZEN 5 . the biscuit numbers.
  const b = P.biscuits || {};
  const biscuitDiff = Object.entries(BISCUITS).filter(([k, v]) => b[k] !== v).map(([k, v]) => `${k} ${b[k]} (want ${v})`);
  const biscuitFixtureMoved = lines(git(['diff', '--name-only', ref, '--', BISCUIT_FIXTURE])).length > 0;
  tally.biscuitsOk = biscuitDiff.length === 0 && !biscuitFixtureMoved;
  out(`  ${tally.biscuitsOk ? 'ok  ' : 'FAIL'}  FROZEN 5, biscuits: gap ${b.gap}, wideThreshold ${b.wideThreshold}, edgeMin ${b.edgeMin}, markLength ${b.markLength}`
    + `${biscuitDiff.length ? ` . MOVED: ${biscuitDiff.join(', ')}` : ''} . ${BISCUIT_FIXTURE} ${biscuitFixtureMoved ? 'MOVED' : 'unchanged'}\n`);

  // FROZEN 2 . the LISP: new files are the F's own; an existing file amended must be licensed.
  const lisp = [...new Set([
    ...lines(git(['diff', '--name-only', ref, '--', '*.lsp'])),
    ...lines(git(['ls-files', '--others', '--exclude-standard', '--', '*.lsp'])),
  ])].sort();
  out(`\n  the LISP (*.lsp) against the base: ${lisp.length} file(s) (of ${lines(git(['ls-files', '--', '*.lsp'])).length})\n`);
  for (const f of lisp) {
    const existed = inTreeOf(ref, f);
    const scan = here(f) ? parenScan(src(f)) : { balance: NaN, min: NaN };
    const balanced = scan.balance === 0 && scan.min === 0;
    if (!balanced) tally.lispUnbalanced.push(f);
    const lic = LISP_LICENSED[f];
    if (existed && !lic) tally.lispUnlicensed.push(f);
    out(`  ${(!balanced || (existed && !lic)) ? 'FAIL' : 'ok  '}  ${f.padEnd(46)} ${existed ? `EXISTING, amended: ${lic ? `licensed by ${lic.F} (${lic.why})` : 'NOT LICENSED (FROZEN 2)'}` : 'new (FROZEN 2: new files only)'}`
      + ` . parens ${balanced ? 'balanced' : `UNBALANCED (balance ${scan.balance}, min ${scan.min})`}\n`);
  }

  // Each F's commit against its fragment: the commit's own engine and lib
  // files against the licences of the fragments carrying its F (by the
  // subject "T78 Fn:"), reported; a fragment that names its COMMIT is asked
  // strictly (T77's rule).
  out('\n  each commit against its fragment (git show --name-only <commit> -- src/engine src/lib):\n');
  const log = lines(git(['log', '--reverse', '--format=%H%x09%s', `${ref}..HEAD`]));
  const commits = log.map((l) => { const [sha, ...rest] = l.split('\t'); return { sha, subject: rest.join('\t') }; });
  const fOf = (subject) => {
    const m = /^T78 F(\d+)\b/.exec(subject);
    if (m) return `F${parseInt(m[1], 10)}`;
    if (/^T78 PROBES/.test(subject)) return 'probes';
    if (/^T78 PART [A-G]/.test(subject)) return 'sweep';
    return 'other';
  };
  const pending = [...new Set([
    ...lines(git(['diff', '--name-only', 'HEAD', '--', ...ASKED])),
    ...lines(git(['ls-files', '--others', '--exclude-standard', '--', ...ASKED])),
  ])].sort();
  for (const c of commits) {
    const F = fOf(c.subject);
    const frags = FRAGS.filter((fr) => fr.F === F);
    const spent = lines(git(['show', '--name-only', '--format=', c.sha, '--', ...ASKED])).sort();
    const named = new Set(frags.flatMap((fr) => fr.files));
    const notNamed = spent.filter((f) => !named.has(f) && !LICENSED[f]);
    const strict = frags.find((fr) => fr.commit === c.sha);
    if (strict) {
      const notSpent = strict.files.filter((f) => ASKED.some((d) => f.startsWith(`${d}/`)) && !spent.includes(f));
      const bad = spent.filter((f) => !strict.files.includes(f));
      if (notSpent.length || bad.length) tally.commitMismatch += 1;
    }
    c.F = F; c.frags = frags.map((fr) => fr.name); c.spent = spent; c.notNamed = notNamed;
  }
  for (const c of commits) {
    out(`  ${c.sha.slice(0, 7)}  ${c.F.padEnd(6)} ${c.frags.length ? c.frags.join(', ') : (c.F.startsWith('F') ? 'NO FRAGMENT' : '-')}`.padEnd(48)
      + ` engine/lib: ${c.spent.length ? c.spent.map((f) => f.replace(/^src\//, '')).join(', ') : 'none'}`
      + `${c.notNamed.length ? ` . touched and NAMED BY NO FRAGMENT: ${c.notNamed.map((f) => f.replace(/^src\//, '')).join(', ')}` : ''}\n`);
  }
  out(`  engine/lib changes in the working tree, in no commit yet: ${pending.length
    ? pending.map((f) => `${f}${LICENSED[f] ? ` (named by ${LICENSED[f].by.join(', ')})` : (allowUnnamed && allowUnnamed.test(f) ? ' (UNNAMED, allowed)' : ' (UNNAMED)')}`).join(', ')
    : 'none'}\n`);
}

// The goldens first (their "held" is what a reached gate is answered with).
const six = sixRows(ref);
const t75 = t75Rows(ref);
const t78 = t78Rows(ref);
const deco = decorationRows();
const proposals = ORNATE.map(proposalRow);
const gateRows = goldenGateRows({ six, t75, t78, deco, proposals });
const live = liveness();

// The licences, file by file.
out('\n=== THE LICENCES, FILE BY FILE (WHAT EACH DELTA HANGS ON, AND WHO REACHES IT) ===\n');
let reachUnheld = 0;
for (const [file, lic] of Object.entries(LICENSED).sort(([a], [b]) => a.localeCompare(b))) {
  const inCut = cutGraph.has(file);
  const readers = codeReadersOf(`/${file.split('/').pop()}'`).filter((r) => r !== file);
  const missing = lic.gates.filter((k) => !GATES[k]);
  tally.unknownGates.push(...missing.map((k) => `${file}: ${k}`));
  const reached = gateRows.filter((g) => g.opens.some((o) => lic.gates.includes(o.gate)));
  const failing = reached.filter((g) => g.opens.some((o) => lic.gates.includes(o.gate) && o.verdict === 'FAIL'));
  if (failing.length) reachUnheld += 1;
  out(`${failing.length || missing.length ? ' FAIL ' : '  ok  '}${file}  (${lic.by.join(', ')})\n        ${lic.why}\n`);
  out(`        on computeCabinet's import graph: ${inCut}; imported by ${readers.length} file(s)\n`);
  out(`        gates: ${lic.gates.length ? lic.gates.map((k) => `${k} [${GATE_OWNER[k]?.frag || 'UNKNOWN'}]`).join('; ') : 'none (cannot reach a cut)'}\n`);
  out(`        goldens that open them: ${reached.length
    ? reached.map((g) => `${g.id} (${g.opens.filter((o) => lic.gates.includes(o.gate)).map((o) => `${o.gate}: ${o.verdict}`).join('; ')})`).join(', ')
    : 'NONE, no golden can enter this path'}\n`);
}

out('\n=== EVERY GATE (WHAT IT ASKS, WHO OWNS IT) ===\n');
for (const [k, g] of Object.entries(GATES)) out(`  ${k.padEnd(18)} [${GATE_OWNER[k].frag}] ${g.what}\n`);

out(`\n=== EVERY GOLDEN, GATE BY GATE (THE SIX, T75'S ${t75.length}, T76'S ${deco.rows.length} RECORDS, T77'S ${proposals.length} PROPOSALS, T78'S ${t78.length}) ===\n`);
for (const g of gateRows) {
  out(`  ${g.fail ? 'FAIL' : 'ok  '}  ${g.id.padEnd(32)} ${g.kind.padEnd(13)} opens: ${g.opens.length
    ? g.opens.map((o) => `${o.gate} (${o.verdict})`).join(', ') : 'none'}\n`);
}
const gateFails = gateRows.filter((g) => g.fail).length;

out('\n=== EACH GATE OPENED ON A CRAFTED CABINET: THE DELTA IS LIVE ===\n');
for (const l of live) out(`  ${l.live ? 'live' : 'DEAD'}  ${l.gate.padEnd(18)} [${l.owner || '?'}] ${l.said}\n`);
const allLive = live.length > 0 && live.every((l) => l.live);

out(`\n=== THE SIX (sha256 against ${six[0]?.truthFrom || SIX_FILE}) ===\n`);
for (const s of six) {
  out(`  ${s.id.padEnd(10)} ${s.verdict.padEnd(18)} ${s.got}${s.verdict === 'RE-PINNED (named)'
    ? `  ${s.repins.map((r) => `${r.frag}: ${r.why}`).join(' | ')} . the working tree's ${SIX_FILE} ${s.written ? 'carries the new hash' : 'DOES NOT carry the new hash'}` : ''}\n`);
}
const sixMoved = six.filter((s) => s.verdict === 'MOVED').length;
const sixRepinned = six.filter((s) => s.verdict === 'RE-PINNED (named)').length;

out(`\n=== T75'S GOLDENS (CLAUDE.md NAMES NINE; THE REPO HOLDS ${T75_GOLDENS.length}) ===\n`);
for (const g of t75) out(`  ${g.ok && !(g.changed && !g.repins.length) ? 'ok  ' : 'FAIL'}  ${g.file.padEnd(34)} ${String(g.F).padEnd(4)} ${g.said}\n`);
const t75Ok = t75.length > 0 && t75.every((g) => g.ok && !(g.changed && !g.repins.length));

out(`\n=== T76'S DECORATION GOLDEN FILE: ${DECORATION_FILE} ===\n`);
if (deco.said) out(`  FAIL  ${deco.said}\n`);
for (const r of deco.rows) out(`  ${r.ok ? 'ok  ' : 'FAIL'}  ${r.style.padEnd(10)} ${r.said}\n`);
out(`  ${deco.agree ? 'ok  ' : 'FAIL'}  the styles the engine offers with a recipe: ${(deco.offered || []).join(', ') || 'none'}`
  + ` . the styles the file pins: ${deco.pinned.join(', ') || 'none'} . the proposals: ${ORNATE.join(', ')}`
  + ` . the engine's ORNATE_STYLE_IDS: ${(deco.engineOrnate || []).join(', ') || 'none'}\n`);
const decorationOk = !deco.said && deco.rows.length > 0 && deco.rows.every((r) => r.ok) && deco.agree;

out('\n=== T77\'S ORNATE RECORDS: THE FOUR PROPOSALS, NAMED AND NOT PINNED ===\n');
for (const r of proposals) out(`  ${r.ok ? 'ok  ' : 'FAIL'}  ${r.style.padEnd(10)} ${r.said}\n`);
const proposalsOk = proposals.length === ORNATE.length && proposals.every((r) => r.ok);

out('\n=== THE T78 GOLDENS (scripts/t78-goldens.mjs --check, the same comparison) ===\n');
for (const g of t78) out(`  ${g.ok ? 'ok  ' : 'FAIL'}  ${g.file.padEnd(34)} ${String(g.F).padEnd(4)} ${g.said}\n`);
const t78Ok = t78.length > 0 && t78.every((g) => g.ok);

// Every file under fixtures/ that differs from the base: a new T78 golden, a
// re-pin somebody named, or MOVED.
out('\n=== FIXTURES AGAINST THE BASE (new golden . re-pinned, named . MOVED) ===\n');
if (ref) {
  const changed = [...new Set([
    ...lines(git(['diff', '--name-only', ref, '--', 'fixtures'])),
    ...lines(git(['ls-files', '--others', '--exclude-standard', '--', 'fixtures'])),
  ])].sort();
  const t78Files = new Set(T78_GOLDENS.map((g) => `fixtures/${g.file}`));
  for (const f of changed) {
    const existed = inTreeOf(ref, f);
    const repins = repinsOf(f);
    let said;
    if (repins.length) said = `RE-PINNED (named): ${repins.map((r) => `${r.frag}: ${r.why}`).join(' | ')}`;
    else if (t78Files.has(f) && !existed) said = `new T78 golden (${T78_GOLDENS.find((g) => `fixtures/${g.file}` === f).F})`;
    else if (allowUnnamed && allowUnnamed.test(f)) { tally.allowed.push(f); said = 'MOVED, NOT NAMED (allowed by --allow-unnamed: awaiting its REPINNED line)'; }
    else { tally.fixturesMoved.push(f); said = `MOVED, NOT NAMED${t78Files.has(f) ? ' (a T78 golden that existed at the base)' : ''}`; }
    out(`  ${tally.fixturesMoved.includes(f) ? 'FAIL' : 'ok  '}  ${f.padEnd(42)} ${said}\n`);
  }
  if (!changed.length) out('  none changed\n');
  // The base file of the six, if re-written in the tree: only named rows may differ.
  const sixFileChanged = lines(git(['diff', '--name-only', ref, '--', SIX_FILE])).length > 0;
  if (sixFileChanged) {
    const strays = six.filter((s) => s.verdict === 'MOVED' || (s.verdict === 'IDENTICAL' && !s.written));
    out(`  ${strays.length ? 'FAIL' : 'ok  '}  ${SIX_FILE} re-written in the tree: rows differing from the base ${six.filter((s) => s.verdict !== 'IDENTICAL').map((s) => `${s.id} (${s.verdict})`).join(', ') || 'none'}\n`);
    if (strays.length) tally.fixturesMoved.push(...strays.map((s) => `${SIX_FILE} (${s.id})`));
  }
} else out('  no base ref\n');

out('\n=== THE COMMITS OF THE TURN (git log BASE..HEAD --oneline) ===\n');
if (ref) {
  for (const l of lines(git(['log', '--reverse', '--oneline', `${ref}..HEAD`]))) {
    const m = /^T78 F(\d+)\b/.exec(l.slice(l.indexOf(' ') + 1));
    out(`  ${(m ? `F${parseInt(m[1], 10)}` : '').padEnd(5)} ${l}\n`);
  }
} else out('  no base ref\n');

const okAll = tally.stray.length === 0 && tally.unspent.length === 0 && tally.unknownGates.length === 0
  && reachUnheld === 0 && gateFails === 0 && allLive && sixMoved === 0 && t75Ok && decorationOk && proposalsOk && t78Ok
  && tally.fixturesMoved.length === 0 && tally.lispUnlicensed.length === 0 && tally.lispUnbalanced.length === 0
  && tally.lighting.length === 0 && tally.biscuitsOk && tally.commitMismatch === 0;

out(`\nSUMMARY: six IDENTICAL=${six.length - sixMoved - sixRepinned} RE-PINNED(named)=${sixRepinned} MOVED=${sixMoved}`
  + ` . engine/lib files changed: ${tally.touched} . not named: ${tally.stray.length} (allowed: ${tally.allowed.length})`
  + ` . named and unspent: ${tally.unspent.length} . unknown gates: ${tally.unknownGates.length}`
  + ` . licences a golden reaches unheld: ${reachUnheld}/${Object.keys(LICENSED).length} . goldens opening a gate unheld: ${gateFails}`
  + ` . every gate live: ${allLive} (${live.filter((l) => l.live).length}/${live.length})`
  + ` . T75 goldens: ${t75.filter((g) => g.ok).length}/${t75.length}`
  + ` . T76 decoration records: ${deco.rows.filter((r) => r.ok).length}/${deco.rows.length} (the styles ${deco.agree ? 'agree' : 'DISAGREE'})`
  + ` . T77 proposals: ${proposals.filter((r) => r.ok).length}/${ORNATE.length}`
  + ` . T78 goldens: ${t78.filter((g) => g.ok).length}/${t78.length}`
  + ` . fixtures moved and not named: ${tally.fixturesMoved.length}`
  + ` . LISP existing amended unlicensed: ${tally.lispUnlicensed.length} . LISP unbalanced: ${tally.lispUnbalanced.length}`
  + ` . lighting touched: ${tally.lighting.length} . biscuits frozen: ${tally.biscuitsOk}`
  + ` . fragment COMMITs mismatching: ${tally.commitMismatch}\n`);
out(`dump ${sha256(JSON.stringify(HEAD_DUMP)).slice(0, 16)}\n`);
out(`${okAll ? 'GREEN' : 'RED'}: ${okAll ? 'every delta is named, every gate is live, and what a golden reaches a golden holds'
  : 'see the FAIL rows above'}\n`);
process.exit(okAll ? 0 : 1);
