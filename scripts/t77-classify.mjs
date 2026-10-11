#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT FOR TURN 77 ────────────────────────────────
//
// CLAUDE.md T77, FROZEN 1, verbatim:
//
//   *"Goldens: the six, T75's nine, T76's decoration file, byte-identical
//   (`scripts/t64-classify.mjs dump()` against `verify/t70/goldens-base.json`
//   and the later bases). `scripts/t77-classify.mjs` (T76's pattern) names
//   every engine delta and proves no golden can reach it: no old project
//   carries an `ORNATE_A_*` style, so none moves."*
//
// FROZEN 2, verbatim:
//
//   *"LISP untouched: the relief is surface machining on a slab the kits
//   already cut, like T76's recipes; no LISP is asked for and the PR says so.
//   `engine/drawings/**` only through GPT's own hunks. Lighting untouched.
//   `doors.js`, `hinges.js`, `hingeLadder.js`, `handles.js`, `splitDoors.js`,
//   `shaker.js`, `frontDimensions.js`, `frontGapClash.js` untouched
//   (`test/turn68-f6-f8-hinges-and-one-road.test.js` changes only its style
//   ORDER list; that is the whole of the hinge file's involvement)."*
//
// T76's shape (`scripts/t76-classify.mjs`): every `src/engine` and `src/lib`
// file the turn touched is NAMED here with its one-line reason; a file
// CLAUDE.md marks read-only is a failure; and the question "can a golden reach
// this delta" is asked of the import graph and of the DATA. Tonight's deltas
// hang on two opt-ins: T76's `params.front_decoration` (every decorated
// front: F4's one board rule, `engine/frontBoard.js`, is reached by all of
// them) and, inside it, an Ornate A style (GPT's relief, its reference files
// and its sentence). The six and T75's goldens are asked whether any of them
// opens a gate, and whether any of them carries an `ORNATE_A_*` style at all;
// each gate is then opened on a crafted cabinet, to show the delta is live;
// then the six are hashed, T75's goldens re-made, and T76's decoration golden
// file re-made record by record. Its records open T76's gate by design (they
// are that gate's goldens), so they are asked of the Ornate gate alone, and
// what they do reach is held by their re-made bytes.
//
// CLAUDE.md T77, THE ORDER 2: *"The relief is a PROPOSAL and stays one: the
// owner's board says "Do produkcji wymagane pomiary i akceptacja fizycznego
// wzoru." The slab is cut; the relief ships as CAD/CAM reference files with
// the state `geometry`, never as approved machining, until the owner says
// otherwise."*  So the four ORNATE_A styles are NAMED beside the decoration
// golden file as proposals and are not pinned in it.
//
// GPT's files carry GPT's own reason, word for word from the LICENSED table of
// `scripts/ornate-classify.mjs`, prefixed "GPT patch:", then where the delta
// is reached. The integration's own deltas are named in
// `scripts/t77-classify.d/fNN.mjs`, one file per F (THE FRAGMENTS, below).
//
//   node scripts/t77-classify.mjs          (no arguments)

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

import { dump } from './t64-classify.mjs';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { T75_GOLDENS } from './t75-goldens.mjs';
import { goldenOf } from './t75-golden.mjs';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
// Namespaces, not names (T76's reason): a name that leaves these modules must
// be a finding in the report, not a crash at link.
import * as FRONT_DECORATION from '../src/engine/frontDecoration.js';
import * as DESIGN from '../src/engine/design.js';

const ROOT = new URL('../', import.meta.url).pathname;
const src = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
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

// THE BASE: origin/main as this turn found it (405b98c, whose code equals
// 2766045, the base GPT's patch was cut on; only CLAUDE.md, CZYTAJ-T77.txt and
// patches/gpt-ornate-a.patch differ). Named as a COMMIT, not a branch:
// origin/main moves when the owner merges this turn, and a diff against a base
// that already carries the turn names nothing. A clone without the commit
// falls back to the branch, and the report says so.
const BASE_COMMIT = '405b98c3a681638ee2aa8e0b4abf9d6a28af4ac3';
const baseRef = () => [BASE_COMMIT, 'origin/main', 'main'].find(hasCommit);

// GPT's patch as it came (T77 F1, "the patch as it came"): the one commit
// allowed to touch `engine/drawings/**` (FROZEN 2).
const GPT_COMMIT = '8ff45c6672f2ad84bd710d3160507a757453a07c';

const THE_SIX = ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY'];
/** The four style ids CLAUDE.md T77 names (THE ORDER 1: Classic, Symmetric, Soft, Plain). */
const ORNATE = ['ORNATE_A_1', 'ORNATE_A_2', 'ORNATE_A_3', 'ORNATE_A_4'];
const ORNATE_TEXT = /ORNATE_A_/;
const PLACEHOLDER = 'procedural placeholder';

/** A decorative recipe through the profile (T76 F4's signature). */
const recipeOf = (style) => (typeof FRONT_DECORATION.defaultFrontDecoration === 'function'
  ? FRONT_DECORATION.defaultFrontDecoration(style, P)
  : null);
const decoratedPart = (p) => Boolean(p?.meta?.frontDecoration || p?.meta?.frontDecorationParent);

/**
 * THE GATES a delta hangs on, each asked of one golden's params: true means
 * the golden OPENS it (and could reach the delta). Each `opens` asks what the
 * engine asks: cabinet.js runs the pass on `if (params?.front_decoration)`,
 * and a leaf's style is its `front_type` (the profile's default where none is
 * given); `buildFrontDecoration` hands a leaf to `buildOrnateFront` only for
 * an ORNATE_A style. T76's two gates are restated here identically (importing
 * `scripts/t76-classify.mjs` would run its report and its exit).
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
  ornateRecipe: {
    what: 'an Ornate A recipe on the unit (`params.front_decoration` whose style, or the unit\'s `front_type`, '
      + 'is ORNATE_A_1..4)',
    opens: (p) => Boolean(p?.front_decoration)
      && [p.front_decoration?.style, p.front_type || P.front?.defaultType].some((s) => ORNATE.includes(s)),
  },
};

/**
 * GPT's own reasons, word for word from the LICENSED table of
 * `scripts/ornate-classify.mjs` (its `src/engine` and `src/lib` rows; its
 * `src/3d`, `src/components` and `src/retail` rows are not engine files).
 * The report checks each against that file while it is in the tree.
 */
const GPT_REASON = {
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
};
const gpt = (file, where, gates, extra = {}) => ({ why: `GPT patch: ${GPT_REASON[file]} ${where}`, gates, ...extra });

/**
 * THE LICENCE: every engine and lib file GPT's patch spent, with GPT's reason
 * and where the delta is reached, and the gates its delta hangs on. A delta
 * only an Ornate recipe reaches hangs on `ornateRecipe`, whatever it changes
 * (the relief, a reference file, a manifest row, a sentence, a drawn
 * contour); a delta every decorated front reaches hangs on `frontDecoration`;
 * none is named where the delta is a picture or a comment that no cut reads.
 */
export const LICENSED = {
  'src/engine/cnc/frontOperations.js': gpt('src/engine/cnc/frontOperations.js',
    'Read by the DXF writer, the export gate and the ZIP: each new branch asks `isOrnateReference(panel)` (a leaf '
      + 'whose `meta.frontDecoration.style` is ORNATE_A_1..4), so a relief is never a pocket in the FRONT setup and '
      + 'its manifest row reads reference only, exported false; every other part is answered as before',
    ['ornateRecipe']),
  'src/engine/cnc/ornateExport.js': gpt('src/engine/cnc/ornateExport.js',
    'NEW: read by cncExport.js; `buildOrnateReferenceFiles` writes the `ornate-reference/` DXF, STL and JSON only '
      + 'for a leaf that `isOrnateReference`, so a selection without one gets no file from it',
    ['ornateRecipe']),
  'src/engine/design.js': gpt('src/engine/design.js',
    'Four rows appended to FRONT_STYLE_OPTIONS, offered in the gallery (a list, not a cut); a cut sees one only as '
      + 'the unit\'s `front_type` with its recipe, which the store writes when the style is picked',
    ['ornateRecipe']),
  'src/engine/drawings/frontDecorationDrawing.js': gpt('src/engine/drawings/frontDecorationDrawing.js',
    'A drawing, not a cut: an operation\'s `contours` (only a relief carries them) are drawn beside it, open where '
      + '`closed` is false; an operation without them is drawn entity for entity as before',
    ['ornateRecipe'], { drawing: true }),
  'src/engine/frontDecoration.js': gpt('src/engine/frontDecoration.js',
    'On the cut path through cabinet.js\'s pass, behind `params.front_decoration`: each new branch asks '
      + '`ORNATE_STYLE_IDS.includes(style)` and hands that leaf to ornateFront.js; the six recipes keep their path',
    ['ornateRecipe']),
  'src/engine/frontDecorationBom.js': gpt('src/engine/frontDecorationBom.js',
    'Read by bom.js: the new sentence only for a record with `referenceOnly` (an Ornate relief). A list, not a cut',
    ['ornateRecipe']),
  'src/engine/frontStyleArt.js': gpt('src/engine/frontStyleArt.js',
    '`ORNATE_FRONT_ART` spread into FRONT_STYLE_ART. Pictures, not a cut: the gallery draws them for every user and '
      + 'no cut reads them',
    []),
  'src/engine/ornateFront.js': gpt('src/engine/ornateFront.js',
    'NEW: on the cut path only through frontDecoration.js, which hands it a leaf only for an ORNATE_A style behind '
      + '`params.front_decoration`',
    ['ornateRecipe']),
  'src/engine/ornateFrontArt.js': gpt('src/engine/ornateFrontArt.js',
    'NEW: read only by frontStyleArt.js. Pictures, not a cut',
    []),
  'src/engine/ornateFrontProfile.js': gpt('src/engine/ornateFrontProfile.js',
    'NEW: spread by profile.js into `front.decoration` under the four ORNATE_A keys, read only for an ORNATE_A style '
      + '(`recipeOf` asks the style first)',
    ['ornateRecipe']),
  'src/engine/profile.js': gpt('src/engine/profile.js',
    'The four ORNATE_A keys spread into `front.decoration`; a legacy recipe is read by its own key, an ORNATE_A key '
      + 'only for an ORNATE_A style; the six read none of it',
    ['ornateRecipe']),
  'src/lib/cncExport.js': gpt('src/lib/cncExport.js',
    'The `ornate-reference/` files and their `geometry` readiness lines ride a ZIP only when '
      + '`buildOrnateReferenceFiles` finds an Ornate leaf; the material export\'s manifest entries now carry each '
      + 'block\'s drills (any decorated selection). A file writer, not a cut',
    ['frontDecoration', 'ornateRecipe']),
};

// ─── THE FRAGMENTS: ONE FILE PER F, SO NO TWO WRITERS SHARE A LINE ─────────
//
// Each F of the integration names its deltas in `scripts/t77-classify.d/fNN.mjs`
// (exports, all optional, T76's shape exactly, plus the F's commit):
//
//   GATES     { key: { what, opens: (params, typeId) => boolean } }
//   LICENSED  { 'src/engine/x.js': { why, gates: [keys], drawing?: true } }
//   LIVENESS  { gateKey: () => ({ live, said }) }
//   COMMIT    the full sha of the F's commit, where the fragment is written
//             after it: its `src/engine` and `src/lib` files must then be
//             exactly the fragment's LICENSED keys. A fragment that lands in
//             its own F's commit cannot name it, and is asked at file level
//             (T76's rule), which the report says
//
// They are MERGED here: a file licensed twice carries both reasons and the
// union of their gates; a gate or a liveness probe named twice is a failure,
// not a merge. A fragment's licence must be spent (its file touched, and, when
// the fragment names its commit, touched by that commit); GPT's table, copied
// above, is held to GPT's commit the same way, and is reported when a later F
// leaves one of its files untouched against the base, which does not fail
// the run.
const FRAGMENT_DIR = new URL('./t77-classify.d/', import.meta.url);
const fragments = existsSync(FRAGMENT_DIR)
  ? readdirSync(FRAGMENT_DIR).filter((n) => /^f\d\d[a-z0-9-]*\.mjs$/.test(n)).sort()
  : [];
const FRAGMENT_LIVENESS = {};
const FRAGMENT_LICENSED = new Set();
const OWNED = [{ name: 'GPT patch (this file)', commit: GPT_COMMIT, files: Object.keys(GPT_REASON) }];
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
  OWNED.push({ name, commit: frag.COMMIT || null, files: Object.keys(frag.LICENSED || {}) });
}

/**
 * Named read-only by CLAUDE.md. A diff here is a failure, not a delta.
 * FROZEN 2: the LISP (T76's list names `lisp.js`; the LISP itself is the
 * `.lsp` files, held below), the lighting files, and the eight fronts files;
 * `engine/drawings/**` only through GPT's own hunks (a drawing file is
 * read-only unless its licence carries `drawing: true`, and only GPT's
 * `frontDecorationDrawing.js` carries it tonight).
 */
const READ_ONLY_PREFIX = ['src/engine/drawings/'];
const LIGHTING = ['src/engine/ledStrips.js', 'src/engine/lighting.js', 'src/engine/lightRig.js'];
const FRONTS_EIGHT = [
  'src/engine/doors.js', 'src/engine/hinges.js', 'src/engine/hingeLadder.js', 'src/engine/handles.js',
  'src/engine/splitDoors.js', 'src/engine/shaker.js', 'src/engine/frontDimensions.js', 'src/engine/frontGapClash.js',
];
const READ_ONLY = ['src/engine/lisp.js', ...LIGHTING, ...FRONTS_EIGHT];
const isReadOnly = (f) => READ_ONLY.includes(f)
  || (READ_ONLY_PREFIX.some((p) => f.startsWith(p)) && !LICENSED[f]?.drawing);
/** The frontier the PR prints: `git diff --stat BASE --` these, which must be empty. */
const FRONTIER = [...FRONTS_EIGHT, ...LIGHTING, 'src/engine/lisp.js', 'reference/lisp'];

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
// params their fixture files hold), each asked of every gate and asked whether
// it carries an `ORNATE_A_*` style anywhere in its params (FROZEN 1: "no old
// project carries an ORNATE_A_* style, so none moves").

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
    ornate: ORNATE_TEXT.test(JSON.stringify(params)),
  }));
}

// ─── T76'S DECORATION RECORDS, ASKED OF EACH GATE ─────────────────────────
//
// Each record is cut from BUD's defaults, `front_type` its style and
// `front_decoration` its default recipe: it opens T76's gate by design, so a
// T77 delta behind `frontDecoration` (F4's one board rule) IS reached by it,
// and is held by the record's re-made bytes below. None may open the Ornate
// gate.

const DECORATION_FILE = 'fixtures/golden-decorative-fronts.json';
const decorationFile = () => (existsSync(new URL(`../${DECORATION_FILE}`, import.meta.url))
  ? JSON.parse(src(DECORATION_FILE)) : null);
const pinnedOf = (file) => (file ? Object.keys(file).filter((k) => typeof file[k]?.sha256 === 'string') : []);

function decorationGateTable() {
  return pinnedOf(decorationFile()).map((style) => {
    const params = { ...defaultParamsFor('BUD', P), front_type: style, front_decoration: recipeOf(style) };
    return {
      id: style,
      open: Object.entries(GATES).filter(([, g]) => g.opens(params, 'BUD')).map(([k]) => k),
    };
  });
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
  ornateRecipe: () => {
    const recipe = recipeOf('ORNATE_A_1');
    if (!recipe) return { live: false, said: 'the engine gives no recipe for ORNATE_A_1 (`defaultFrontDecoration`)' };
    const bare = { ...defaultParamsFor('BUD', P), front_type: 'ORNATE_A_1' };
    const alone = computeCabinet(bare, P).panels.filter(decoratedPart).length;
    const r = computeCabinet({ ...bare, front_decoration: recipe }, P);
    const fronts = r.panels.filter((p) => p.meta?.frontDecoration);
    const ready = fronts.filter((p) => p.meta.frontDecoration.status === 'ready');
    const relief = ready.filter((p) => {
      const ops = p.meta.frontDecoration.operations || [];
      return ops.length === 1 && ops[0].kind === 'relief';
    });
    const labels = [...new Set(fronts.map((p) => p.meta.frontDecoration.ornament))];
    const placeholder = ready.filter((p) => p.meta.frontDecoration.ornament === PLACEHOLDER);
    return {
      live: alone === 0 && fronts.length > 0 && ready.length === fronts.length
        && relief.length === fronts.length && placeholder.length === fronts.length,
      said: `BUD ORNATE_A_1 with its recipe: ${ready.length} of ${fronts.length} ${fronts.length === 1 ? 'leaf' : 'leaves'} `
        + `ready, ${relief.length} with one 'relief' operation, ornament '${labels.join("', '") || 'none'}'; `
        + `the style alone: ${alone} decorated part(s)`,
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

// ─── T76'S DECORATION GOLDEN FILE, RECORD BY RECORD ───────────────────────
//
// Each record is re-made the way T76 makes it: BUD's defaults, `front_type`
// the style, `front_decoration` the style's default recipe; the record is the
// sha256 of `JSON.stringify` of the decorated cut parts (the leaves with
// `meta.frontDecoration`, the strips with `meta.frontDecorationParent`) and
// their summary rows. The styles the engine offers with a recipe must be the
// file's six PLUS the four ORNATE_A proposals, which are named and not pinned
// (THE ORDER 2): anything else is a finding. Each proposal is cut the same way
// and shown to be what CLAUDE.md says it is: a ready relief that the style
// alone never cuts, labelled with its ornament (F6), and not production
// approved.

const partsOf = (cut) => cut.map((p) => ({
  id: p.id, w: p.w, h: p.h, thickness: p.thickness, operations: p.meta?.frontDecoration?.operations?.length || 0,
}));

function proposalOf(style) {
  try {
    const recipe = recipeOf(style);
    if (!recipe) return { style, ok: false, said: 'the engine has no recipe for this proposal' };
    const params = { ...defaultParamsFor('BUD', P), front_type: style };
    const alone = computeCabinet(params, P).panels.filter(decoratedPart).length;
    const cut = computeCabinet({ ...params, front_decoration: recipe }, P).panels.filter(decoratedPart);
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
    return {
      style,
      ok,
      said: ok ? `${summary} · ornament: ${want} · proposed, not production approved · not pinned`
        : `NOT THE PROPOSAL: ${why.join('; ')}`,
    };
  } catch (e) {
    return { style, ok: false, said: `threw: ${e.message}` };
  }
}

function decorationGoldens() {
  const file = decorationFile();
  if (!file) return { rows: [], proposals: [], offered: [], pinned: [], expected: [], agree: false, said: 'fixture missing' };
  const pinned = pinnedOf(file);
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
  const proposals = ORNATE.map(proposalOf);
  const ids = Array.isArray(DESIGN.FRONT_STYLE_OPTIONS) ? DESIGN.FRONT_STYLE_OPTIONS.map((o) => o.id) : [];
  const offered = ids.filter((id) => { try { return Boolean(recipeOf(id)); } catch { return false; } });
  const expected = [...pinned, ...ORNATE];
  const engineOrnate = Array.isArray(FRONT_DECORATION.ORNATE_STYLE_IDS) ? [...FRONT_DECORATION.ORNATE_STYLE_IDS] : [];
  const agree = offered.length > 0
    && pinned.every((s) => !ORNATE.includes(s))
    && stable([...offered].sort()) === stable([...expected].sort())
    && stable(engineOrnate) === stable(ORNATE);
  return { rows, proposals, offered, pinned, expected, engineOrnate, agree };
}

// ─── THE REPORT ────────────────────────────────────────────────────────────

const base = JSON.parse(src('verify/t70/goldens-base.json'));
const head = dump();

process.stdout.write('─── T77 · THE ENGINE/LIB DELTAS, AND WHAT THEY REACH ───\n\n');
const ref = baseRef();
const exactBase = ref === BASE_COMMIT;
const gptHere = hasCommit(GPT_COMMIT);
let stray = [];
let readOnlyTouched = [];
let unspent = [];
let unspentOwned = [];
let lispTouched = [];
let commitMismatch = 0;
let frontierEmpty = false;
let drawingsOk = false;
let fixturesSame = false;
let gptWordsOk = true;
if (ref) {
  process.stdout.write(`  base: ${exactBase ? `${BASE_COMMIT.slice(0, 7)} (origin/main before this turn)`
    : `${ref} (the base commit ${BASE_COMMIT.slice(0, 7)} is not in this clone; once the turn is merged this branch `
      + 'carries it, and the list below can read short)'}\n`);
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
  process.stdout.write(`  named and unspent: ${unspent.length ? unspent.map((f) => `${f}${FRAGMENT_LICENSED.has(f) ? '' : ' (GPT\'s table only, reported)'}`).join(', ') : 'none'}\n`);

  // Each licence against the commit that spent it: the commit's own engine and
  // lib files, exactly (a file it touched and did not name is a stray of that
  // F; a file it named and did not touch is a licence that F did not spend).
  process.stdout.write('\n  each licence against its own commit (git show --name-only <commit> -- src/engine src/lib):\n');
  for (const own of OWNED) {
    if (!own.files.length) continue;
    if (!own.commit) {
      process.stdout.write(`  ----  ${own.name.padEnd(22)} names no COMMIT: its ${own.files.length} licence(s) asked at file level (T76's rule)\n`);
      continue;
    }
    if (!hasCommit(own.commit)) {
      process.stdout.write(`  ----  ${own.name.padEnd(22)} ${own.commit.slice(0, 7)} is not in this clone (reported, not asked)\n`);
      continue;
    }
    const spent = lines(git(['show', '--name-only', '--format=', own.commit, '--', 'src/engine', 'src/lib'])).sort();
    const notNamed = spent.filter((f) => !own.files.includes(f));
    const notSpent = own.files.filter((f) => !spent.includes(f));
    const ok = notNamed.length === 0 && notSpent.length === 0;
    if (!ok) commitMismatch += 1;
    process.stdout.write(`  ${ok ? 'ok  ' : 'FAIL'}  ${own.name.padEnd(22)} ${own.commit.slice(0, 7)} ${own.files.length} named, `
      + `${spent.length} touched${notNamed.length ? ` · touched, not named: ${notNamed.join(', ')}` : ''}`
      + `${notSpent.length ? ` · named, not touched by it: ${notSpent.join(', ')}` : ''}\n`);
  }
  // The turn's commits that touched an engine or lib file, each with the
  // licence that owns it, and what the working tree holds that no commit does
  // yet: reported (a file in either is still asked above, by name).
  if (exactBase) {
    const owners = new Map(OWNED.filter((o) => o.commit).map((o) => [o.commit, o.name]));
    const turn = lines(git(['log', '--reverse', '--format=%H', `${ref}..HEAD`, '--', 'src/engine', 'src/lib']));
    process.stdout.write(`  the turn's engine/lib commits: ${turn.map((c) => `${c.slice(0, 7)} ${owners.get(c)
      || '(no fragment names it: asked at file level)'}`).join(' · ') || 'none'}\n`);
    const pending = [...new Set([
      ...lines(git(['diff', '--name-only', 'HEAD', '--', 'src/engine', 'src/lib'])),
      ...lines(git(['ls-files', '--others', '--exclude-standard', '--', 'src/engine', 'src/lib'])),
    ])].sort();
    process.stdout.write(`  engine/lib changes in the working tree, in no commit yet: ${pending.length
      ? `${pending.map((f) => `${f}${LICENSED[f] ? '' : ' (UNNAMED)'}`).join(', ')} (asked above, by name)` : 'none'}\n`);
  }

  // GPT's reasons, word for word, while GPT's classifier is in the tree.
  const gptTable = existsSync(new URL('./ornate-classify.mjs', import.meta.url)) ? src('scripts/ornate-classify.mjs') : null;
  if (gptTable) {
    const differ = Object.entries(GPT_REASON).filter(([file, why]) => !gptTable.includes(`'${file}': '${why.replace(/'/g, "\\'")}'`));
    gptWordsOk = differ.length === 0;
    process.stdout.write(`  ${gptWordsOk ? 'ok  ' : 'FAIL'}  GPT's reasons word for word against scripts/ornate-classify.mjs: `
      + `${Object.keys(GPT_REASON).length - differ.length} of ${Object.keys(GPT_REASON).length}`
      + `${differ.length ? ` (differ: ${differ.map(([f]) => f).join(', ')})` : ''}\n`);
  } else {
    process.stdout.write('  ----  GPT\'s reasons: scripts/ornate-classify.mjs is not in this tree (reported, not asked)\n');
  }

  // FROZEN 2 · the read-only frontier, as the PR prints it.
  const frontierStat = lines(git(['diff', '--stat', ref, '--', ...FRONTIER]));
  const frontierNew = lines(git(['ls-files', '--others', '--exclude-standard', '--', ...FRONTIER]));
  frontierEmpty = frontierStat.length === 0 && frontierNew.length === 0;
  process.stdout.write(`\n  ${frontierEmpty ? 'ok  ' : 'FAIL'}  git diff --stat ${ref.slice(0, 7)} -- the eight fronts files, the lighting files, `
    + `src/engine/lisp.js, reference/lisp: ${frontierEmpty ? 'empty' : ''}\n`);
  for (const l of [...frontierStat, ...frontierNew.map((f) => `${f} (untracked)`)]) process.stdout.write(`          ${l}\n`);

  // FROZEN 2 · `engine/drawings/**` only through GPT's own hunks: the
  // drawings in this tree are byte for byte what GPT's commit made them, and
  // no other commit of the turn touched them.
  if (gptHere) {
    const drawnSince = [...new Set([
      ...lines(git(['diff', '--name-only', GPT_COMMIT, '--', 'src/engine/drawings'])),
      ...lines(git(['ls-files', '--others', '--exclude-standard', '--', 'src/engine/drawings'])),
    ])];
    const commits = exactBase ? lines(git(['log', '--format=%H', `${ref}..HEAD`, '--', 'src/engine/drawings'])) : [];
    const others = commits.filter((c) => c !== GPT_COMMIT);
    drawingsOk = drawnSince.length === 0 && others.length === 0;
    process.stdout.write(`  ${drawingsOk ? 'ok  ' : 'FAIL'}  src/engine/drawings: ${exactBase
      ? `git log ${ref.slice(0, 7)}..HEAD names ${commits.map((c) => c.slice(0, 7)).join(', ') || 'no commit'}`
        + `${others.length ? ` (NOT GPT's: ${others.map((c) => c.slice(0, 7)).join(', ')})` : ' (GPT\'s patch only)'}`
      : 'the log is not asked (no exact base)'}; changed since GPT's commit: ${drawnSince.join(', ') || 'nothing'}\n`);
  } else {
    drawingsOk = true;
    process.stdout.write(`  ----  src/engine/drawings: GPT's commit ${GPT_COMMIT.slice(0, 7)} is not in this clone; `
      + 'the drawings are asked by the licence alone (READ-ONLY above)\n');
  }

  // FROZEN 1 · no fixture is re-pinned tonight: every file under fixtures/ is
  // the base's own bytes.
  const fixturesChanged = [...new Set([
    ...lines(git(['diff', '--name-only', ref, '--', 'fixtures'])),
    ...lines(git(['ls-files', '--others', '--exclude-standard', '--', 'fixtures'])),
  ])];
  fixturesSame = fixturesChanged.length === 0;
  process.stdout.write(`  ${fixturesSame ? 'ok  ' : 'FAIL'}  fixtures/ against the base: `
    + `${fixturesSame ? `none changed (${lines(git(['ls-files', '--', 'fixtures'])).length} file(s))` : fixturesChanged.join(', ')}\n\n`);
} else {
  process.stdout.write('  no base ref: the goldens below are the whole proof\n\n');
  frontierEmpty = true; drawingsOk = true; fixturesSame = true;
}

const gates = gateTable();
const decoGates = decorationGateTable();
const t75Count = gates.length - THE_SIX.length;
let reachable = 0;
const unknownGates = [];
for (const [file, lic] of Object.entries(LICENSED)) {
  const inCut = cutGraph.has(file);
  const readers = codeReadersOf(`/${file.split('/').pop()}'`).filter((r) => r !== file);
  const missing = lic.gates.filter((k) => !GATES[k]);
  unknownGates.push(...missing.map((k) => `${file}: ${k}`));
  const opened = gates.filter((g) => lic.gates.some((k) => g.open.includes(k))).map((g) => g.id);
  const decoOpened = decoGates.filter((g) => lic.gates.some((k) => g.open.includes(k))).map((g) => g.id);
  if (opened.length) reachable += 1;
  process.stdout.write(`${opened.length || missing.length ? ' FAIL ' : '  ok  '}${file}\n        ${lic.why}\n`);
  process.stdout.write(`        on computeCabinet's import graph: ${inCut}; imported by ${readers.length} file(s)\n`);
  process.stdout.write(`        gates: ${lic.gates.length ? lic.gates.map((k) => GATES[k]?.what || `UNKNOWN GATE ${k}`).join('; ') : 'none (cannot reach a cut)'}\n`);
  process.stdout.write(`        goldens that open them: ${opened.length ? opened.join(', ') : 'NONE, no golden can enter this path'}\n`);
  process.stdout.write(`        T76's decoration records that open them: ${decoOpened.length ? `${decoOpened.join(', ')} `
    + `(${inCut ? 'on the cut: held by their re-made bytes below' : 'off the cut: a record is the cut parts and cannot see it'})`
    : 'none'}\n`);
}

process.stdout.write(`\n─── EVERY OLD GOLDEN, GATE BY GATE (THE SIX AND T75'S ${t75Count}) ───\n`);
for (const g of gates) {
  process.stdout.write(`  ${g.id.padEnd(34)} opens: ${(g.open.length ? g.open.join(', ') : 'none').padEnd(6)}`
    + ` · carries an ORNATE_A_* style: ${g.ornate ? 'YES' : 'no'}\n`);
}
const carriesOrnate = gates.filter((g) => g.ornate).length;

process.stdout.write('\n─── T76\'S DECORATION RECORDS, GATE BY GATE (THEIR OWN GATE OPEN BY DESIGN) ───\n');
for (const g of decoGates) {
  const ornate = g.open.includes('ornateRecipe');
  process.stdout.write(`  ${ornate ? 'FAIL' : 'ok  '}  ${g.id.padEnd(4)} opens: ${g.open.join(', ') || 'none'}\n`);
}
const decoOrnate = decoGates.filter((g) => g.open.includes('ornateRecipe')).length;

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

process.stdout.write(`\n─── T76'S DECORATION GOLDEN FILE: ${DECORATION_FILE} ───\n`);
const deco = decorationGoldens();
if (deco.said) process.stdout.write(`  FAIL  ${deco.said}\n`);
for (const r of deco.rows) process.stdout.write(`  ${r.ok ? 'ok  ' : 'FAIL'}  ${r.style.padEnd(10)} ${r.said}\n`);
process.stdout.write('  the four proposals, named and not pinned (CLAUDE.md T77, THE ORDER 2):\n');
for (const r of deco.proposals) process.stdout.write(`  ${r.ok ? 'ok  ' : 'FAIL'}  ${r.style.padEnd(10)} ${r.said}\n`);
process.stdout.write(`  ${deco.agree ? 'ok  ' : 'FAIL'}  the styles the engine offers with a recipe: ${deco.offered.join(', ') || 'none'}`
  + ` · the styles the file pins: ${deco.pinned.join(', ') || 'none'} · the proposals: ${ORNATE.join(', ')}`
  + ` · the engine's ORNATE_STYLE_IDS: ${(deco.engineOrnate || []).join(', ') || 'none'}\n`);
const decorationOk = !deco.said && deco.rows.length > 0 && deco.rows.every((r) => r.ok) && deco.agree;
const proposalsOk = deco.proposals.length === ORNATE.length && deco.proposals.every((r) => r.ok);

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
  + ` · licences not matching their commit: ${commitMismatch}`
  + ` · read-only files touched: ${readOnlyTouched.length} · frontier empty: ${frontierEmpty}`
  + ` · drawings only GPT's: ${drawingsOk} · LISP files touched: ${lispTouched.length}`
  + ` · fixtures unchanged: ${fixturesSame} · GPT's words: ${gptWordsOk}`
  + ` · unknown gates: ${unknownGates.length} · old goldens carrying ORNATE_A_*: ${carriesOrnate}`
  + ` · decoration records opening the Ornate gate: ${decoOrnate}`
  + ` · six without a recipe: ${six.filter((s) => s.ok).length}/${six.length}`
  + ` · every gate live: ${allLive} · T75 goldens: ${t75.filter((g) => g.ok).length}/${t75.length}`
  + ` · decoration goldens: ${deco.rows.filter((r) => r.ok).length}/${deco.rows.length}`
  + ` (the styles ${deco.agree ? 'agree' : 'DISAGREE'})`
  + ` · proposals: ${deco.proposals.filter((r) => r.ok).length}/${ORNATE.length}\n`,
);
const hash = sha256(JSON.stringify(head)).slice(0, 16);
process.stdout.write(`dump ${hash}\n`);
process.exit(
  moved === 0 && reachable === 0 && stray.length === 0 && unspentOwned.length === 0 && commitMismatch === 0
    && readOnlyTouched.length === 0 && frontierEmpty && drawingsOk && lispTouched.length === 0 && fixturesSame
    && gptWordsOk && unknownGates.length === 0 && carriesOrnate === 0 && decoOrnate === 0
    && sixClean && allLive && t75Ok && decorationOk && proposalsOk ? 0 : 1,
);
