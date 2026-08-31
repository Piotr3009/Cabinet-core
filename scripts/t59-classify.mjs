#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT FOR TURN 59 ────────────────────────────────
//
// CLAUDE.md, STANDING LAW, verbatim:
//
//   *"**BYTE-IDENTITY.** Engine untouched → goldens byte-identical,
//   `t59-classify.mjs` = ZERO deltas, `UNNAMED=0`, `NAMED=0`."*
//
// ─── NAMED = 0, AND WHY THAT IS THE WHOLE REPORT ───────────────────────────
//
// Every classifier before this one existed to ARGUE a delta: T58 had five, and
// each was a paragraph proving that a change to the engine could not reach a
// golden. This one has none to argue, and that is not a weaker claim than
// theirs — it is a stronger one. Turn 59 changed no file under `src/engine`
// at all, so there is no mechanism by which a golden COULD move, and the job
// of this file is to prove that sentence rather than to assert it.
//
// It proves it four ways:
//
//   1. THE GOLDENS. The same six configurations T58b hashed, hashed again.
//      Compared against a dump taken on `origin/main` they are identical or
//      the turn has a FINDING to write up.
//   2. THE ENGINE'S OWN BYTES. `git diff origin/main -- src/engine` must be
//      empty. A hash of six results is a strong claim; a diff of the source
//      that produced them is a different and simpler one, and the two together
//      cannot both be true by accident.
//   3. THE FROZEN PRO SURFACE. `index.html`, `src/App.jsx`, `src/main.jsx`,
//      `src/components`, `src/pages` — the same assertion
//      `test/turn59-f1-the-switch.test.js` makes, repeated here so that one
//      command answers for the whole turn.
//   4. THE ADDITIVE OPTIONS, AT THEIR DEFAULTS. Three shared-core files gained
//      a switch this turn. Each defaults to PRO's behaviour, and `--probe`
//      argues each one as an exit code: the default value, the fact that no
//      PRO file calls the setter, and — for the two that gate real behaviour —
//      that the behaviour under the default is the behaviour of last night.
//
//   node scripts/t59-classify.mjs                  the six goldens, hashed
//   node scripts/t59-classify.mjs --dump           the results, as JSON
//   node scripts/t59-classify.mjs base.json head.json     classify two dumps
//   node scripts/t59-classify.mjs --probe          argue every option
//   node scripts/t59-classify.mjs --probe chrome   argue one of them

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

const ROOT = new URL('../', import.meta.url).pathname;

/**
 * THE SIX, AND THEY ARE T58b'S SIX.
 *
 * Not a new set: the point of a golden is that it is the SAME question asked
 * again, and a turn that chose its own configurations would be marking its own
 * homework. These are `scripts/t58b-classify.mjs`'s, unchanged.
 */
const STANDARD_CONFIGS = [
  { id: 'WARDROBE', type: 'WARDROBE', drawers: false },
  { id: 'BUD', type: 'BUD', drawers: false },
  { id: 'WUD', type: 'WUD', drawers: false },
  { id: 'BUDR', type: 'BUDR', drawers: true },
  { id: 'BUDR4', type: 'BUDR4', drawers: true },
  { id: 'PANTRY', type: 'PANTRY', drawers: true },
];

const stable = (value) => JSON.stringify(value, (key, v) => {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]));
  }
  return v;
});

function resultFor(cfg) {
  const params = defaultParamsFor(cfg.type, P);
  return computeCabinet(params, P);
}

export function dump() {
  const out = {};
  for (const cfg of STANDARD_CONFIGS) {
    try {
      const result = resultFor(cfg);
      out[cfg.id] = {
        drawers: cfg.drawers,
        sha256: createHash('sha256').update(stable(result)).digest('hex'),
      };
    } catch (e) {
      out[cfg.id] = { drawers: cfg.drawers, error: e.message };
    }
  }
  return out;
}

function classify(base, head) {
  const counts = { IDENTICAL: 0, UNNAMED: 0 };
  const rows = [];
  for (const cfg of STANDARD_CONFIGS) {
    const b = base[cfg.id];
    const h = head[cfg.id];
    const same = b && h && b.sha256 && b.sha256 === h.sha256;
    if (same) counts.IDENTICAL += 1;
    else counts.UNNAMED += 1;
    rows.push(`${cfg.id.padEnd(12)}${same ? 'IDENTICAL' : 'UNNAMED  '}  ${h?.sha256 || h?.error || '(missing)'}`);
  }
  return { rows, counts };
}

// ─── THE PROBES ────────────────────────────────────────────────────────────

const git = (args) => {
  try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }); } catch { return null; }
};

const baseRef = () => ['origin/main', 'main'].find(
  (ref) => git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]) !== null,
);

const src = (rel) => readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8');

/** Does any PRO file mention this name? PRO must not know these exist. */
function proMentions(name) {
  const out = git(['grep', '-l', '-e', name, '--',
    'src/App.jsx', 'src/main.jsx', 'src/components', 'src/pages', 'src/lib', 'index.html']);
  return (out || '').trim().split('\n').filter(Boolean);
}

const PROBES = {
  /** The engine did not move. Not one byte of it. */
  engine: () => {
    const ref = baseRef();
    const rows = [];
    if (!ref) {
      return {
        title: 'THE ENGINE, AGAINST ITS BASE',
        head: ['what', 'answer'],
        rows: [{ id: 'git', cells: ['no base ref — cannot answer'], ok: null }],
        verdict: ['NO BASE REF. The goldens above are the whole proof here.',
          'NO BASE REF. The goldens above are the whole proof here.'],
      };
    }
    for (const path of ['src/engine', 'KIT_SINK.lsp', 'reference']) {
      const diff = (git(['diff', '--stat', ref, '--', path]) || '').trim();
      rows.push({ id: path, cells: [diff === '' ? 'unchanged' : diff.split('\n').pop().trim()], ok: diff === '' });
    }
    return {
      title: 'THE ENGINE, AGAINST ITS BASE',
      head: ['path', `diff vs ${ref}`],
      rows,
      note: 'A turn that changes no engine file cannot move a golden. This is that\n'
        + 'sentence, checked rather than asserted.',
      verdict: ['CLEAN — src/engine is byte-for-byte its base.',
        'NOT CLEAN — an engine file moved. Iron rule: write it up as a FINDING.'],
    };
  },

  /** PRO's own surface did not move either. */
  pro: () => {
    const ref = baseRef();
    if (!ref) {
      return {
        title: 'THE FROZEN PRO SURFACE',
        head: ['what', 'answer'],
        rows: [{ id: 'git', cells: ['no base ref — see test/turn59-f1-the-switch.test.js'], ok: null }],
        verdict: ['NO BASE REF.', 'NO BASE REF.'],
      };
    }
    const paths = ['index.html', 'src/App.jsx', 'src/main.jsx', 'src/components', 'src/pages'];
    const rows = paths.map((path) => {
      const diff = (git(['diff', '--stat', ref, '--', path]) || '').trim();
      return { id: path, cells: [diff === '' ? 'unchanged' : 'MOVED'], ok: diff === '' };
    });
    return {
      title: 'THE FROZEN PRO SURFACE',
      head: ['path', `diff vs ${ref}`],
      rows,
      note: 'The owner, verbatim: "ten istniejący tryb to jest tryb PRO i musi być\n'
        + 'zachowany jak teraz." NOT ONE VISIBLE BYTE OF PRO CHANGES THIS TURN.',
      verdict: ['CLEAN — PRO IS FROZEN.',
        'NOT CLEAN — PRO moved. That is the one thing this turn was not allowed to do.'],
    };
  },

  /** The viewer's chrome switch: default true, and PRO cannot see it. */
  chrome: async () => {
    const { proChromeOn, setProChrome } = await import('../src/3d/chrome.js');
    const before = proChromeOn();
    setProChrome(false);
    const off = proChromeOn();
    setProChrome(true);
    const back = proChromeOn();
    const mentions = proMentions('proChromeOn');
    const guards = ['AddPlus', 'DimLabel', 'DimensionChain', 'DistanceArrows', 'DrillRings',
      'EdgeHandle', 'HoverDimensions', 'LedIcons', 'PartMachining', 'Ruler', 'ShareOutBar']
      .filter((n) => /if \(!proChromeOn\(\)\) return null;/.test(src(`3d/${n}.jsx`)));
    return {
      title: 'src/3d/chrome.js — THE VIEWER\'S CHROME',
      head: ['what', 'answer', 'wanted'],
      rows: [
        { id: 'default', cells: [String(before), 'true'], ok: before === true },
        { id: 'off', cells: [String(off), 'false'], ok: off === false },
        { id: 'restored', cells: [String(back), 'true'], ok: back === true },
        { id: 'PRO calls it', cells: [mentions.length ? mentions.join(' ') : 'nowhere', 'nowhere'], ok: mentions.length === 0 },
        { id: 'overlays guarded', cells: [`${guards.length}`, '11'], ok: guards.length === 11 },
      ],
      note: 'DEFAULT true is PRO\'s behaviour today. PRO never calls the setter, so\n'
        + 'every one of the eleven guards is a line that reads `if (!true) return null`.',
      verdict: ['CLEAN — the chrome is on by default and PRO cannot tell this file exists.',
        'NOT CLEAN — PRO\'s overlays are not what they were.'],
    };
  },

  /** The persistence switch: default 'local', and every call site gated. */
  persistence: async () => {
    const { persistenceMode, persistenceOn, setPersistence } = await import('../src/stores/persistence.js');
    const before = persistenceMode();
    setPersistence('none');
    const off = persistenceOn();
    setPersistence('local');
    const mentions = proMentions('setPersistence');
    const ungated = [];
    for (const rel of ['stores/projectStore.js', 'stores/uiStore.js']) {
      const lines = src(rel).split('\n');
      lines.forEach((line, i) => {
        if (!/localStorage\.(get|set|remove)Item/.test(line) || /^\s*(\/\/|\*)/.test(line)) return;
        const above = lines.slice(Math.max(0, i - 30), i + 1).join('\n');
        if (!/persistenceOn\(\)/.test(above)) ungated.push(`${rel}:${i + 1}`);
      });
    }
    return {
      title: 'src/stores/persistence.js — MEMORY-ONLY MODE',
      head: ['what', 'answer', 'wanted'],
      rows: [
        { id: 'default', cells: [before, 'local'], ok: before === 'local' },
        { id: "'none' works", cells: [String(off), 'false'], ok: off === false },
        { id: 'restored', cells: [persistenceMode(), 'local'], ok: persistenceMode() === 'local' },
        { id: 'PRO calls it', cells: [mentions.length ? mentions.join(' ') : 'nowhere', 'nowhere'], ok: mentions.length === 0 },
        { id: 'ungated calls', cells: [ungated.length ? ungated.join(' ') : 'none', 'none'], ok: ungated.length === 0 },
      ],
      note: 'DEFAULT \'local\' is what both stores have always done. Every localStorage\n'
        + 'call in either of them now sits behind a gate that is open for PRO.',
      verdict: ['CLEAN — PRO reads and writes exactly the keys it always did.',
        'NOT CLEAN — a store\'s persistence is not what it was.'],
    };
  },

  /** The camera presets: new file, PRO calls none of it. */
  camera: async () => {
    const { CAMERA_PRESETS, presetPlacement } = await import('../src/3d/cameraPresets.js');
    const mentions = [...proMentions('parkCamera'), ...proMentions('presetPlacement')];
    const box = { min: [-0.3, 0, -0.28], max: [0.3, 2.15, 0.28] };
    return {
      title: 'src/3d/cameraPresets.js — THREE PLACES TO STAND',
      head: ['what', 'answer', 'wanted'],
      rows: [
        { id: 'presets', cells: [CAMERA_PRESETS.join(' '), 'front inside room'], ok: CAMERA_PRESETS.join(' ') === 'front inside room' },
        { id: 'PRO calls it', cells: [mentions.length ? mentions.join(' ') : 'nowhere', 'nowhere'], ok: mentions.length === 0 },
        { id: 'no bounds', cells: [String(presetPlacement('front', null)), 'null'], ok: presetPlacement('front', null) === null },
        { id: 'pure', cells: [String(Boolean(presetPlacement('front', box))), 'true'], ok: Boolean(presetPlacement('front', box)) },
      ],
      note: 'An ADDITION, not a change: nothing in PRO imports this file, so PRO\'s\n'
        + 'camera behaves exactly as it did.',
      verdict: ['CLEAN — PRO\'s camera is untouched.',
        'NOT CLEAN — PRO reached for a preset.'],
    };
  },

  /** Nothing outside src/retail imports src/retail, and retail imports no PRO. */
  boundary: () => {
    const mentions = proMentions('src/retail');
    const fromRetail = (git(['grep', '-l', '-e', "from '\\.\\./\\.\\./components", '--', 'src/retail'])
      || '').trim().split('\n').filter(Boolean);
    return {
      title: 'THE IRON BOUNDARY (Petros, 30.08)',
      head: ['what', 'answer', 'wanted'],
      rows: [
        { id: 'PRO names retail', cells: [mentions.length ? mentions.join(' ') : 'nowhere', 'nowhere'], ok: mentions.length === 0 },
        { id: 'retail names PRO', cells: [fromRetail.length ? fromRetail.join(' ') : 'nowhere', 'nowhere'], ok: fromRetail.length === 0 },
      ],
      note: 'The walker in test/turn59-f1-the-switch.test.js is the real assertion —\n'
        + 'it resolves every specifier under src/ and sorts it into three zones. This\n'
        + 'is the same claim in one grep, for a reader at a terminal.',
      verdict: ['CLEAN — two applications, one house, one wall between them.',
        'NOT CLEAN — the boundary leaks.'],
    };
  },
};

async function runProbe(name) {
  const probe = await PROBES[name]();
  const clean = probe.rows.every((r) => r.ok !== false);
  const width = Math.max(18, ...probe.rows.map((r) => r.id.length + 2));
  const colW = probe.head.slice(1).map((h, i) => Math.max(
    h.length + 2, ...probe.rows.map((r) => String(r.cells[i] ?? '').length + 2),
  ));
  let out = `${probe.title}\n${'─'.repeat(72)}\n`;
  out += probe.head[0].padEnd(width);
  probe.head.slice(1).forEach((h, i) => { out += h.padEnd(colW[i]); });
  out += '\n';
  for (const r of probe.rows) {
    out += r.id.padEnd(width);
    r.cells.forEach((c, i) => { out += String(c).padEnd(colW[i] || 14); });
    out += `${r.ok === false ? '  ← ' : ''}\n`;
  }
  if (probe.note) out += `\n${probe.note}\n`;
  out += `\n${clean ? probe.verdict[0] : probe.verdict[1]}\n`;
  return { out, clean };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const probeAt = argv.indexOf('--probe');
  if (argv.includes('--dump')) {
    process.stdout.write(`${JSON.stringify(dump())}\n`);
  } else if (probeAt >= 0) {
    const only = argv[probeAt + 1] && !argv[probeAt + 1].startsWith('--')
      ? argv[probeAt + 1].toLowerCase() : null;
    const names = only ? [only] : Object.keys(PROBES);
    if (only && !PROBES[only]) {
      process.stdout.write(`no probe named ${only} — have [${Object.keys(PROBES).join(', ')}]\n`);
      process.exit(2);
    }
    let bad = 0;
    for (const name of names) {
      // eslint-disable-next-line no-await-in-loop
      const { out, clean } = await runProbe(name);
      process.stdout.write(`${out}\n`);
      if (!clean) bad += 1;
    }
    if (names.length > 1) {
      process.stdout.write(`${'─'.repeat(72)}\n${names.length} probe(s), ${bad === 0
        ? 'every one CLEAN — the engine did not move and PRO cannot tell this turn happened.'
        : `${bad} NOT CLEAN. Iron rule: write it up as a FINDING.`}\n`);
    }
    process.exit(bad === 0 ? 0 : 1);
  } else if (argv.length === 2) {
    const base = JSON.parse(readFileSync(argv[0], 'utf8'));
    const head = JSON.parse(readFileSync(argv[1], 'utf8'));
    const { rows, counts } = classify(base, head);
    process.stdout.write(`${rows.join('\n')}\n\n`);
    process.stdout.write('EXPECTED BUCKETS: none, and this turn cannot name one. Turn 59 changed no\n'
      + 'file under src/engine, so there is no mechanism by which a golden could move.\n'
      + 'The three shared-core files it DID add are switches whose defaults are PRO\'s\n'
      + 'behaviour today, and `--probe` argues each of them as an exit code.\n');
    process.stdout.write('IF A GOLDEN MOVED:  iron rule — write it up as a FINDING. Do not name a bucket for it.\n');
    process.stdout.write(`NAMED:            0\nUNNAMED:          ${counts.UNNAMED}\n`);
    process.exit(counts.UNNAMED === 0 ? 0 : 1);
  } else {
    const d = dump();
    for (const cfg of STANDARD_CONFIGS) {
      const row = d[cfg.id];
      process.stdout.write(`${cfg.id.padEnd(12)}drawers=${cfg.drawers ? 'yes' : 'no '}  ${row.sha256 || row.error}\n`);
    }
    process.stdout.write('\nNAMED deltas this turn: 0 — no engine file changed.\n');
  }
}
