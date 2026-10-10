#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT FOR TURN 76 ────────────────────────────────
//
// CLAUDE.md T76, FROZEN 1, verbatim:
//
//   *"Goldens: the six (`scripts/t64-classify.mjs dump()` against
//   `verify/t70/goldens-base.json`) plus T75's nine, byte-identical.
//   `scripts/t76-classify.mjs` (T75's pattern) names every engine delta of this
//   turn and proves no golden can reach it. GPT's
//   `fixtures/golden-decorative-fronts.json` becomes the tenth golden file of
//   this repo, re-pinned after F3 and F4 (six records, SS gone, the owner's
//   numbers in), and joins the classifier."*
//
// T75's shape (`scripts/t75-classify.mjs`): every `src/engine` and `src/lib`
// file the turn touched is NAMED here with its one-line reason; a file
// CLAUDE.md marks read-only is a failure; and the question "can a golden reach
// this delta" is asked of the import graph and of the DATA. Tonight's cut-path
// delta is GPT's, and it hangs on ONE opt-in: `params.front_decoration` (a
// style name alone machines nothing). The six and T75's goldens are
// asked whether any of them opens a gate; each gate is then opened on a crafted
// cabinet, to show the delta is live; then the six are hashed, T75's goldens
// re-made, and GPT's decoration golden file re-made record by record.
//
// GPT's files carry GPT's own reason, word for word from the LICENSED table of
// `scripts/decorative-fronts-classify.mjs`, prefixed "GPT patch:", then where
// the delta is reached. The integration's own deltas are named in
// `scripts/t76-classify.d/fNN.mjs`, one file per F (THE FRAGMENTS, below).
//
//   node scripts/t76-classify.mjs          (no arguments)

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

import { dump } from './t64-classify.mjs';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { T75_GOLDENS } from './t75-goldens.mjs';
import { goldenOf } from './t75-golden.mjs';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
// Namespaces, not names: F3 and F4 rewrite these two modules tonight, and a
// name that leaves them must be a finding in the report, not a crash at link.
import * as FRONT_DECORATION from '../src/engine/frontDecoration.js';
import * as DESIGN from '../src/engine/design.js';

const ROOT = new URL('../', import.meta.url).pathname;
const src = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const git = (args) => {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch { return null; }
};
const lines = (out) => (out || '').trim().split('\n').filter(Boolean);
const sha256 = (text) => createHash('sha256').update(text).digest('hex');

// THE BASE: origin/main as this turn found it (b810560, "fronty tura": T75
// merged, GPT's patch not yet applied). Named as a COMMIT, not a branch:
// origin/main moves when the owner merges this turn, and a diff against a base
// that already carries the turn names nothing. A clone without the commit
// falls back to the branch, and the report says so.
const BASE_COMMIT = 'b810560278e9853555e69fdb7c7b1332284dc28c';
const baseRef = () => [BASE_COMMIT, 'origin/main', 'main'].find(
  (ref) => git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]) !== null,
);

const THE_SIX = ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY'];

/** A decorative recipe through the profile (F4's signature; one argument is read today). */
const recipeOf = (style) => (typeof FRONT_DECORATION.defaultFrontDecoration === 'function'
  ? FRONT_DECORATION.defaultFrontDecoration(style, P)
  : null);
const decoratedPart = (p) => Boolean(p?.meta?.frontDecoration || p?.meta?.frontDecorationParent);

/**
 * THE GATES a cut-path delta hangs on, each asked of one golden's params:
 * true means the golden OPENS it (and could reach the delta). Each `opens`
 * asks what the engine asks: cabinet.js runs the pass on `if
 * (params?.front_decoration)`, and a leaf's style is its `front_type` (the
 * profile's default where none is given).
 */
export const GATES = {
  frontDecoration: {
    what: 'a decorative recipe on the unit (`params.front_decoration`, GPT\'s opt-in: written when a style is '
      + 'picked, never by opening one; a style name alone machines nothing)',
    opens: (p) => Boolean(p?.front_decoration),
  },
  appliedStrips: {
    what: 'an applied moulding recipe (`params.front_decoration` on a leaf of style AM: the FRONT-MOULDING cut parts)',
    opens: (p) => Boolean(p?.front_decoration)
      && [p.front_decoration?.style, p.front_type || P.front?.defaultType].includes('AM'),
  },
};

/**
 * THE LICENCE: every engine and lib file GPT's patch spent, with GPT's reason
 * and where the delta is reached, and the gates its delta hangs on. A gate is
 * named where the delta changes what is cut or machined (or writes the param
 * that opens the cut); none where it changes what is drawn, listed or offered.
 */
export const LICENSED = {
  'src/engine/bom.js': {
    why: 'GPT patch: Distinct manufacturing identity and real strip quantities. A list, not a cut',
    gates: [],
  },
  'src/engine/cabinet.js': {
    why: 'GPT patch: Optional front_decoration pass after drilling; AM parts before totals. IS the cut path: '
      + 'the pass runs only under `params.front_decoration`, the strips (`appliedFrontParts`, '
      + '`reconcileAppliedFrontParts`) only for a recipe that adds them (AM)',
    gates: ['frontDecoration', 'appliedStrips'],
  },
  'src/engine/cnc/dxf.js': {
    why: 'GPT patch: Separate front setup vectors; existing back output retained. The machine file: a '
      + '-FRONT.dxf is written only beside a part with `meta.frontDecoration`, and `setup` defaults to \'back\'',
    gates: ['frontDecoration'],
  },
  'src/engine/cnc/exportGate.js': {
    why: 'GPT patch: Hold invalid recipes and conflicting operation layers. Two findings read off '
      + '`meta.frontDecoration`, empty without it. A refusal, not a cut',
    gates: [],
  },
  'src/engine/cnc/frontOperations.js': {
    why: 'GPT patch: Single front export frame and explicit machining manifest. NEW: read by the DXF writer, '
      + 'the export gate and the ZIP; each function answers nothing for a part without `meta.frontDecoration`',
    gates: ['frontDecoration'],
  },
  'src/engine/design.js': {
    why: 'GPT patch: Stable new style IDs and optional recipe cascade. The design layer: a cut sees the recipe '
      + 'only as `params.front_decoration`, which the store writes from `resolveUnitDesign`',
    gates: ['frontDecoration'],
  },
  'src/engine/drawings/frontDecorationDrawing.js': {
    why: 'GPT patch: Canonical decorative projection for elevations and part detail. NEW. A drawing, not a '
      + 'cut: it draws `meta.frontDecoration` and nothing else',
    gates: [],
    drawing: true,
  },
  'src/engine/drawings/frontElevation.js': {
    why: 'GPT patch: Draw the machining and applied strips that the engine now emits. A drawing, not a cut: a '
      + 'front without `meta.frontDecoration` is drawn by `frontDetail` as before',
    gates: [],
    drawing: true,
  },
  'src/engine/drawings/partDetail.js': {
    why: 'GPT patch: Draw exact operation contours, depths and setup notes. A drawing, not a cut',
    gates: [],
    drawing: true,
  },
  'src/engine/frontDecoration.js': {
    why: 'GPT patch: Versioned canonical geometry, defaults and opposing-cut validation. NEW: on the cut path '
      + 'only through cabinet.js\'s pass, behind `params.front_decoration`',
    gates: ['frontDecoration', 'appliedStrips'],
  },
  'src/engine/frontDecorationBom.js': {
    why: 'GPT patch: Manufacturing identity, status and construction descriptions. NEW: read by bom.js, null '
      + 'for a part with neither `meta.frontDecoration` nor `meta.frontDecorationParent`. A list, not a cut',
    gates: [],
  },
  'src/engine/frontStyleArt.js': {
    why: 'GPT patch: Gallery art for the three added style IDs. Pictures, not a cut; FROZEN 5 lifts T75\'s '
      + 'FRONTS BOUNDARY for this file tonight',
    gates: [],
  },
  'src/engine/materials.js': {
    why: 'GPT patch: Separate thickness-correct material identity for applied strips. Which stock a strip '
      + '(`meta.frontDecorationParent`) is cut from, not the cut',
    gates: [],
  },
  'src/engine/partEdits.js': {
    why: 'GPT patch: Revalidate decorated fronts after hand-added drilling. A hand edit\'s re-cut: only a front '
      + 'with `meta.frontDecoration` that the edit touched is rebuilt, its strips with it',
    gates: ['frontDecoration', 'appliedStrips'],
  },
  'src/engine/partRegistry.js': {
    why: 'GPT patch: Register actual FRONT-MOULDING cut parts for purchasing. The `front_moulding` row and '
      + 'FRONT-MOULDING mapped to it; no fixture cuts one',
    gates: ['appliedStrips'],
  },
  'src/engine/projectSettings.js': {
    why: 'GPT patch: Keep optional recipes in the saved material palette. A design record, not a cut',
    gates: [],
  },
  'src/lib/cncExport.js': {
    why: 'GPT patch: Package both setups and the operation specification. The FRONT setup and the manifest '
      + 'ride the export only for a decorated selection',
    gates: ['frontDecoration'],
  },
  'src/lib/exporters.js': {
    why: 'GPT patch: Print decorative construction and status in BOM PDF. A file writer, not a cut: the note '
      + 'prints only on a row that carries `manufacturing`',
    gates: [],
  },
};

// ─── THE FRAGMENTS: ONE FILE PER F, SO NO TWO WRITERS SHARE A LINE ─────────
//
// Each F of the integration names its deltas in `scripts/t76-classify.d/fNN.mjs`
// (exports, all optional, T75's shape exactly):
//
//   GATES     { key: { what, opens: (params, typeId) => boolean } }
//   LICENSED  { 'src/engine/x.js': { why, gates: [keys], drawing?: true } }
//   LIVENESS  { gateKey: () => ({ live, said }) }
//
// They are MERGED here: a file licensed twice carries both reasons and the
// union of their gates; a gate or a liveness probe named twice is a failure,
// not a merge. A fragment's licence must be spent (its file touched); GPT's
// table, copied above, is reported when a later F leaves one of its files
// untouched, and does not fail the run.
const FRAGMENT_DIR = new URL('./t76-classify.d/', import.meta.url);
const fragments = existsSync(FRAGMENT_DIR)
  ? readdirSync(FRAGMENT_DIR).filter((n) => /^f\d\d[a-z0-9-]*\.mjs$/.test(n)).sort()
  : [];
const FRAGMENT_LIVENESS = {};
const FRAGMENT_LICENSED = new Set();
for (const name of fragments) {
  // eslint-disable-next-line no-await-in-loop
  const frag = await import(new URL(name, FRAGMENT_DIR));
  for (const [k, g] of Object.entries(frag.GATES || {})) {
    if (GATES[k]) throw new Error(`${name}: gate ${k} is named twice`);
    GATES[k] = g;
  }
  for (const [file, lic] of Object.entries(frag.LICENSED || {})) {
    FRAGMENT_LICENSED.add(file);
    const had = LICENSED[file];
    LICENSED[file] = had
      ? {
        why: `${had.why.replace(/\.$/, '')}. ${lic.why}`,
        gates: [...new Set([...(had.gates || []), ...(lic.gates || [])])],
        ...(had.drawing || lic.drawing ? { drawing: true } : {}),
      }
      : { ...lic, gates: lic.gates || [] };
  }
  for (const [k, probe] of Object.entries(frag.LIVENESS || {})) {
    if (FRAGMENT_LIVENESS[k]) throw new Error(`${name}: liveness ${k} is named twice`);
    FRAGMENT_LIVENESS[k] = probe;
  }
}

/**
 * Named read-only by CLAUDE.md. A diff here is a failure, not a delta.
 * FROZEN 2: the LISP (T75's list names `lisp.js`; the LISP itself is the
 * `.lsp` files, held below) and the lighting files; `engine/drawings/**` only
 * through GPT's own hunks (a drawing file is read-only unless its licence
 * carries `drawing: true`). FROZEN 5: the fronts files the patch does not
 * touch. `frontStyleArt.js` is NOT here: FROZEN 5 lifts it tonight.
 */
const READ_ONLY_PREFIX = ['src/engine/drawings/'];
const READ_ONLY = [
  'src/engine/lisp.js',
  'src/engine/ledStrips.js', 'src/engine/lighting.js', 'src/engine/lightRig.js',
  'src/engine/doors.js', 'src/engine/hinges.js', 'src/engine/hingeLadder.js', 'src/engine/handles.js',
  'src/engine/splitDoors.js', 'src/engine/shaker.js', 'src/engine/frontDimensions.js', 'src/engine/frontGapClash.js',
];
const isReadOnly = (f) => READ_ONLY.includes(f)
  || (READ_ONLY_PREFIX.some((p) => f.startsWith(p)) && !LICENSED[f]?.drawing);

/** Every file under `src/` that names this symbol, comments stripped. */
const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function codeReadersOf(symbol) {
  const files = lines(git(['grep', '-l', '-e', symbol, '--', 'src']));
  const re = new RegExp(symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return files.filter((f) => re.test(strip(src(f))));
}

function engineImportsOf(rel, seen = new Set()) {
  if (seen.has(rel)) return seen;
  seen.add(rel);
  const t = strip(src(rel));
  for (const m of t.matchAll(/from\s+'([^']+)'/g)) {
    const spec = m[1];
    if (!spec.startsWith('.')) continue;
    const dir = rel.split('/').slice(0, -1).join('/');
    const parts = `${dir}/${spec}`.split('/');
    const out = [];
    for (const p of parts) { if (p === '..') out.pop(); else if (p !== '.') out.push(p); }
    let path = out.join('/');
    if (!/\.jsx?$/.test(path)) path += '.js';
    try { src(path); engineImportsOf(path, seen); } catch { /* not a file we can read */ }
  }
  return seen;
}

const cutGraph = engineImportsOf('src/engine/cabinet.js');

// ─── EVERY OLD GOLDEN, ASKED OF EACH GATE ─────────────────────────────────
//
// The six (`defaultParamsFor`, as `dump()` cuts them) and T75's goldens (the
// params their fixture files hold). The decoration golden file is not asked:
// it is the gate's own golden, and opening it is what it is for.

function gateTable() {
  const asked = [
    ...THE_SIX.map((id) => ({ id, params: defaultParamsFor(id, P), typeId: id })),
    ...T75_GOLDENS.filter((g) => existsSync(new URL(`../fixtures/${g.file}`, import.meta.url))).map((g) => {
      const params = JSON.parse(src(`fixtures/${g.file}`)).params || {};
      return { id: g.file, params, typeId: params.type };
    }),
  ];
  return asked.map(({ id, params, typeId }) => ({
    id,
    open: Object.entries(GATES).filter(([, g]) => g.opens(params, typeId)).map(([k]) => k),
  }));
}

// ─── THE SIX CARRY NO RECIPE, AND CUT NO DECORATED PART ──────────────────

function sixWithoutRecipe() {
  return THE_SIX.map((id) => {
    const params = defaultParamsFor(id, P);
    const decorated = computeCabinet(params, P).panels.filter(decoratedPart).length;
    const carries = params.front_decoration !== undefined;
    return { id, carries, decorated, ok: !carries && decorated === 0 };
  });
}

// ─── …AND EACH GATE OPENED, SO THE DELTA IS SHOWN TO BE LIVE ─────────────

const LIVENESS = {
  frontDecoration: () => {
    const recipe = recipeOf('G');
    if (!recipe) return { live: false, said: 'the engine gives no recipe for G (`defaultFrontDecoration`)' };
    const bare = { ...defaultParamsFor('BUD', P), front_type: 'G' };
    const alone = computeCabinet(bare, P).panels.filter(decoratedPart).length;
    const r = computeCabinet({ ...bare, front_decoration: recipe }, P);
    const fronts = r.panels.filter((p) => p.meta?.frontDecoration);
    const ready = fronts.filter((p) => p.meta.frontDecoration.status === 'ready');
    const ops = ready.reduce((n, p) => n + (p.meta.frontDecoration.operations?.length || 0), 0);
    return {
      live: alone === 0 && fronts.length > 0 && ready.length === fronts.length && ops > 0,
      said: `BUD G with its recipe: ${ready.length} of ${fronts.length} ${fronts.length === 1 ? 'leaf' : 'leaves'} ready, `
        + `${ops} operations; the style alone: ${alone} decorated part(s)`,
    };
  },
  appliedStrips: () => {
    const recipe = recipeOf('AM');
    if (!recipe) return { live: false, said: 'the engine gives no recipe for AM (`defaultFrontDecoration`)' };
    const r = computeCabinet({ ...defaultParamsFor('BUD', P), front_type: 'AM', front_decoration: recipe }, P);
    const hosts = r.panels.filter((p) => p.meta?.frontDecoration?.style === 'AM');
    const strips = r.panels.filter((p) => p.part === 'FRONT-MOULDING');
    const owned = strips.every((s) => hosts.some((h) => h.id === s.meta?.frontDecorationParent));
    return {
      live: hosts.length > 0 && strips.length === 4 * hosts.length && owned,
      said: `BUD AM cuts ${strips.length} FRONT-MOULDING strip(s) on ${hosts.map((h) => h.id).join(', ') || 'no leaf'}`
        + `${strips.length ? ` (${strips.map((s) => `${s.w} x ${s.h} x ${s.thickness}`).join(', ')})` : ''}`,
    };
  },
};

function liveness() {
  return Object.keys(GATES).map((gate) => {
    try {
      const probe = LIVENESS[gate] || FRAGMENT_LIVENESS[gate];
      const r = probe ? probe() : { live: false, said: 'no liveness probe written' };
      return { gate, ...r };
    } catch (e) {
      return { gate, live: false, said: `threw: ${e.message}` };
    }
  });
}

// ─── T75'S GOLDENS, RE-MADE AND COMPARED ──────────────────────────────────

const stable = (value) => JSON.stringify(value, (key, v) => {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]));
  }
  return v;
});

function t75Goldens() {
  return T75_GOLDENS.map((g) => {
    const file = `fixtures/${g.file}`;
    if (!existsSync(new URL(`../${file}`, import.meta.url))) return { ...g, ok: false, said: 'fixture missing' };
    try {
      const want = JSON.parse(src(file));
      const got = g.make ? g.make() : goldenOf(want.params, P);
      const ok = stable(want.expected ?? want) === stable(got);
      return { ...g, ok, said: ok ? 'byte-identical to its fixture' : 'DIFFERS from its fixture' };
    } catch (e) {
      return { ...g, ok: false, said: `threw: ${e.message}` };
    }
  });
}

// ─── THE TENTH GOLDEN FILE: GPT'S DECORATIVE FRONTS, RECORD BY RECORD ─────
//
// Each record is re-made the way GPT's `scripts/decorative-fronts-classify.mjs`
// makes it: BUD's defaults, `front_type` the style, `front_decoration` the
// style's default recipe; the record is the sha256 of `JSON.stringify` of the
// decorated cut parts (the leaves with `meta.frontDecoration`, the strips with
// `meta.frontDecorationParent`) and their summary rows. The styles are the
// file's own keys (F3 deletes SS and F4 re-pins the numbers), and they must be
// the styles the engine offers with a recipe: a recipe without its golden is
// as much a finding as a golden without its recipe.

const DECORATION_FILE = 'fixtures/golden-decorative-fronts.json';
const partsOf = (cut) => cut.map((p) => ({
  id: p.id, w: p.w, h: p.h, thickness: p.thickness, operations: p.meta?.frontDecoration?.operations?.length || 0,
}));

function decorationGoldens() {
  if (!existsSync(new URL(`../${DECORATION_FILE}`, import.meta.url))) {
    return { rows: [], offered: [], pinned: [], agree: false, said: 'fixture missing' };
  }
  const file = JSON.parse(src(DECORATION_FILE));
  const pinned = Object.keys(file).filter((k) => typeof file[k]?.sha256 === 'string');
  const rows = pinned.map((style) => {
    const want = file[style];
    try {
      const recipe = recipeOf(style);
      if (!recipe) return { style, ok: false, said: 'the engine has no recipe for this style' };
      const params = { ...defaultParamsFor('BUD', P), front_type: style };
      const alone = computeCabinet(params, P).panels.filter(decoratedPart).length;
      const cut = computeCabinet({ ...params, front_decoration: recipe }, P).panels.filter(decoratedPart);
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
      return { style, ok, said: ok ? `${summary} · sha256 ${sha.slice(0, 16)}` : `DIFFERS: ${why.join('; ')}` };
    } catch (e) {
      return { style, ok: false, said: `threw: ${e.message}` };
    }
  });
  const ids = Array.isArray(DESIGN.FRONT_STYLE_OPTIONS) ? DESIGN.FRONT_STYLE_OPTIONS.map((o) => o.id) : [];
  const offered = ids.filter((id) => { try { return Boolean(recipeOf(id)); } catch { return false; } });
  const agree = offered.length > 0 && stable([...offered].sort()) === stable([...pinned].sort());
  return { rows, offered, pinned, agree };
}

// ─── THE REPORT ────────────────────────────────────────────────────────────

const base = JSON.parse(src('verify/t70/goldens-base.json'));
const head = dump();

process.stdout.write('─── T76 · THE ENGINE/LIB DELTAS, AND WHAT THEY REACH ───\n\n');
const ref = baseRef();
let stray = [];
let readOnlyTouched = [];
let unspent = [];
let unspentOwned = [];
let lispTouched = [];
if (ref) {
  const fellBack = ref !== BASE_COMMIT;
  process.stdout.write(`  base: ${fellBack ? `${ref} (the base commit ${BASE_COMMIT.slice(0, 7)} is not in this clone; `
    + 'once the turn is merged this branch carries it, and the list below can read short)' : `${BASE_COMMIT.slice(0, 7)} (origin/main before this turn)`}\n`);
  process.stdout.write(`  fragments merged: ${fragments.join(', ') || 'none'}\n`);
  const touched = [...new Set([
    ...lines(git(['diff', '--name-only', ref, '--', 'src/engine', 'src/lib'])),
    ...lines(git(['ls-files', '--others', '--exclude-standard', '--', 'src/engine', 'src/lib'])),
  ])].sort();
  for (const f of touched) {
    process.stdout.write(`${LICENSED[f] ? '  named    ' : '  UNNAMED  '} ${f}\n`);
  }
  stray = touched.filter((f) => !LICENSED[f]);
  readOnlyTouched = touched.filter(isReadOnly);
  unspent = Object.keys(LICENSED).filter((f) => !touched.includes(f));
  unspentOwned = unspent.filter((f) => FRAGMENT_LICENSED.has(f));
  lispTouched = [...new Set([
    ...lines(git(['diff', '--name-only', ref, '--', '*.lsp'])),
    ...lines(git(['ls-files', '--others', '--exclude-standard', '--', '*.lsp'])),
  ])];
  const lispCount = lines(git(['ls-files', '--', '*.lsp'])).length;
  const absent = READ_ONLY.filter((f) => !existsSync(new URL(`../${f}`, import.meta.url)));
  process.stdout.write(`\n  ${touched.length} engine/lib file(s) changed or added · ${stray.length} not named\n`);
  process.stdout.write(`  named READ-ONLY by CLAUDE.md and touched: ${readOnlyTouched.join(', ') || 'none'}\n`);
  process.stdout.write(`  named read-only and not in this repo: ${absent.join(', ') || 'none'}\n`);
  process.stdout.write(`  the LISP (*.lsp) touched: ${lispTouched.join(', ') || 'none'} (of ${lispCount} file(s))\n`);
  process.stdout.write(`  named and unspent: ${unspent.length ? unspent.map((f) => `${f}${FRAGMENT_LICENSED.has(f) ? '' : ' (GPT\'s table only, reported)'}`).join(', ') : 'none'}\n\n`);
} else {
  process.stdout.write('  no base ref: the goldens below are the whole proof\n\n');
}

const gates = gateTable();
const t75Count = gates.length - THE_SIX.length;
let reachable = 0;
const unknownGates = [];
for (const [file, lic] of Object.entries(LICENSED)) {
  const inCut = cutGraph.has(file);
  const readers = codeReadersOf(`/${file.split('/').pop()}'`).filter((r) => r !== file);
  const missing = lic.gates.filter((k) => !GATES[k]);
  unknownGates.push(...missing.map((k) => `${file}: ${k}`));
  const opened = gates.filter((g) => lic.gates.some((k) => g.open.includes(k))).map((g) => g.id);
  if (opened.length) reachable += 1;
  process.stdout.write(`${opened.length || missing.length ? ' FAIL ' : '  ok  '}${file}\n        ${lic.why}\n`);
  process.stdout.write(`        on computeCabinet's import graph: ${inCut}; imported by ${readers.length} file(s)\n`);
  process.stdout.write(`        gates: ${lic.gates.length ? lic.gates.map((k) => GATES[k]?.what || `UNKNOWN GATE ${k}`).join('; ') : 'none (cannot reach a cut)'}\n`);
  process.stdout.write(`        goldens that open them: ${opened.length ? opened.join(', ') : 'NONE, no golden can enter this path'}\n`);
}

process.stdout.write(`\n─── EVERY OLD GOLDEN, GATE BY GATE (THE SIX AND T75'S ${t75Count}) ───\n`);
for (const g of gates) {
  process.stdout.write(`  ${g.id.padEnd(34)} opens: ${g.open.length ? g.open.join(', ') : 'none'}\n`);
}

process.stdout.write('\n─── THE SIX CARRY NO RECIPE AND CUT NO DECORATED PART ───\n');
const six = sixWithoutRecipe();
for (const s of six) {
  process.stdout.write(`  ${s.ok ? 'ok  ' : 'FAIL'}  ${s.id.padEnd(10)} front_decoration: ${s.carries ? 'CARRIED' : 'absent'} · decorated parts: ${s.decorated}\n`);
}
const sixClean = six.every((s) => s.ok);

process.stdout.write('\n─── EACH GATE OPENED ON A CRAFTED CABINET: THE DELTA IS LIVE ───\n');
const live = liveness();
for (const l of live) process.stdout.write(`  ${l.live ? 'live' : 'DEAD'}  ${l.gate.padEnd(15)} ${l.said}\n`);
const allLive = live.every((l) => l.live);

process.stdout.write(`\n─── T75'S GOLDENS (CLAUDE.md NAMES NINE; THE REPO HOLDS ${T75_GOLDENS.length}) ───\n`);
const t75 = t75Goldens();
for (const g of t75) process.stdout.write(`  ${g.ok ? 'ok  ' : 'FAIL'}  ${g.file.padEnd(34)} ${g.F.padEnd(4)} ${g.said}\n`);
const t75Ok = t75.length > 0 && t75.every((g) => g.ok);

process.stdout.write(`\n─── THE TENTH GOLDEN FILE: ${DECORATION_FILE} ───\n`);
const deco = decorationGoldens();
if (deco.said) process.stdout.write(`  FAIL  ${deco.said}\n`);
for (const r of deco.rows) process.stdout.write(`  ${r.ok ? 'ok  ' : 'FAIL'}  ${r.style.padEnd(4)} ${r.said}\n`);
process.stdout.write(`  ${deco.agree ? 'ok  ' : 'FAIL'}  the styles the engine offers with a recipe: ${deco.offered.join(', ') || 'none'}`
  + ` · the styles the file pins: ${deco.pinned.join(', ') || 'none'}\n`);
const decorationOk = !deco.said && deco.rows.length > 0 && deco.rows.every((r) => r.ok) && deco.agree;

process.stdout.write('\n─── THE SIX ───\n');
let moved = 0;
for (const id of THE_SIX) {
  const same = base[id]?.sha256 && base[id].sha256 === head[id]?.sha256;
  if (!same) moved += 1;
  process.stdout.write(`  ${id.padEnd(10)} ${same ? 'IDENTICAL' : 'UNNAMED  '}  ${head[id]?.sha256 || head[id]?.error}\n`);
}
process.stdout.write(
  `\nIDENTICAL=${THE_SIX.length - moved} UNNAMED=${moved} · deltas a golden can reach: ${reachable}/${Object.keys(LICENSED).length}`
  + ` · engine files not named: ${stray.length} · named and unspent: ${unspent.length} (fragments: ${unspentOwned.length})`
  + ` · read-only files touched: ${readOnlyTouched.length} · LISP files touched: ${lispTouched.length}`
  + ` · unknown gates: ${unknownGates.length} · six without a recipe: ${six.filter((s) => s.ok).length}/${six.length}`
  + ` · every gate live: ${allLive} · T75 goldens: ${t75.filter((g) => g.ok).length}/${t75.length}`
  + ` · decoration goldens: ${deco.rows.filter((r) => r.ok).length}/${deco.rows.length}`
  + ` (the styles ${deco.agree ? 'agree' : 'DISAGREE'})\n`,
);
const hash = sha256(JSON.stringify(head)).slice(0, 16);
process.stdout.write(`dump ${hash}\n`);
process.exit(
  moved === 0 && reachable === 0 && stray.length === 0 && unspentOwned.length === 0
    && readOnlyTouched.length === 0 && lispTouched.length === 0 && unknownGates.length === 0
    && sixClean && allLive && t75Ok && decorationOk ? 0 : 1,
);
