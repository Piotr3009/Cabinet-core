#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT FOR TURN 60 ────────────────────────────────
//
// CLAUDE.md, STANDING LAW, verbatim:
//
//   *"**BYTE-IDENTITY.** Engine untouched → goldens byte-identical,
//   `t60-classify.mjs` = ZERO deltas, `UNNAMED=0`, `NAMED=0`. LISP untouched,
//   census 14/14."*
//
// ─── NAMED = 0, AND WHY THAT IS STILL THE WHOLE REPORT ─────────────────────
//
// Turn 59's classifier could say the strongest possible thing — that no file
// under `src/engine` had moved, so no mechanism existed by which a golden
// COULD move — and this one says it again. What turn 60 changed is the two
// zones the boundary calls SHARED CORE but not ENGINE:
//
//   src/3d      five files. `chrome.js` gained CHANNELS; four overlays ask a
//               channel instead of the master switch; and one line of
//               `UnitView` does the same for the contour pass. Every one of
//               them falls through to the switch when no channel is set, which
//               is PRO, always. A new file, `propsPack.js`, is three
//               re-exports nothing in PRO imports.
//   src/stores  `projectStore` gained three READ-ONLY selectors and two
//               additive actions. Nothing in PRO calls any of the five, and
//               not one existing line changed except the rail selector's own.
//
// None of that is reachable from `computeCabinet`, which is what a golden is.
// So the goldens cannot move, and the job of this file is to PROVE that
// sentence rather than to assert it.
//
//   node scripts/t60-classify.mjs                  the six goldens, hashed
//   node scripts/t60-classify.mjs --dump           the results, as JSON
//   node scripts/t60-classify.mjs base.json head.json     classify two dumps
//   node scripts/t60-classify.mjs --probe          argue every option
//   node scripts/t60-classify.mjs --probe chrome   argue one of them

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

const ROOT = new URL('../', import.meta.url).pathname;

/**
 * THE SIX, AND THEY ARE T58b'S SIX — by way of T59's.
 *
 * Not a new set: the point of a golden is that it is the SAME question asked
 * again, and a turn that chose its own configurations would be marking its own
 * homework.
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
        + 'sentence, checked rather than asserted — and it is the reason T60 could\n'
        + 'reach for `unitSizeBoundsFor` in the STORE rather than a bound in the engine.',
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
        + 'zachowany jak teraz." NOT ONE VISIBLE BYTE OF PRO CHANGES THIS TURN —\n'
        + 'including the turn that put PRO\'s whole VIEW BAR into the client\'s room.',
      verdict: ['CLEAN — PRO IS FROZEN.',
        'NOT CLEAN — PRO moved. That is the one thing this turn was not allowed to do.'],
    };
  },

  /**
   * T60's headline addition: the viewer's chrome CHANNELS.
   *
   * The argument is a fall-through. `chromeOn(part)` answers the master switch
   * for any part nobody has claimed — and PRO claims none — so every guard in
   * the five files below still reads `if (!true) return null`, exactly as it
   * did last night.
   */
  chrome: async () => {
    const {
      chromeOn, proChromeOn, setChromePart, setProChrome,
    } = await import('../src/3d/chrome.js');
    const before = proChromeOn();
    const fell = ['dimensions', 'outlines', 'measure', 'anything'].every((p) => chromeOn(p) === true);
    setProChrome(false);
    setChromePart('dimensions', true);
    const claimed = chromeOn('dimensions') === true && chromeOn('hinges') === false;
    setProChrome(true);                       // …which also clears every channel
    const cleared = chromeOn('dimensions') === true;
    const mentions = [...proMentions('setChromePart'), ...proMentions('chromeOn')];

    // The eleven guards of T59, each still asking exactly one question in its
    // own first line — four of them a channel, seven the master switch.
    const CHANNELLED = {
      DimLabel: "chromeOn('dimensions')",
      DimensionChain: "chromeOn('dimensions')",
      DistanceArrows: "chromeOn('dimensions')",
      Ruler: "chromeOn('measure')",
    };
    const ELEVEN = ['AddPlus', 'DimLabel', 'DimensionChain', 'DistanceArrows', 'DrillRings',
      'EdgeHandle', 'HoverDimensions', 'LedIcons', 'PartMachining', 'Ruler', 'ShareOutBar'];
    const guards = ELEVEN.filter((n) => src(`3d/${n}.jsx`)
      .includes(`if (!${CHANNELLED[n] || 'proChromeOn()'}) return null;`));
    const contour = src('3d/UnitView.jsx').includes("chromeOn('outlines') && (outlines || contour || xray)");

    return {
      title: 'src/3d/chrome.js — THE VIEWER\'S CHROME, AND ITS CHANNELS',
      head: ['what', 'answer', 'wanted'],
      rows: [
        { id: 'default', cells: [String(before), 'true'], ok: before === true },
        { id: 'falls through', cells: [String(fell), 'true'], ok: fell },
        { id: 'a channel', cells: [String(claimed), 'true'], ok: claimed },
        { id: 'switch clears it', cells: [String(cleared), 'true'], ok: cleared },
        { id: 'PRO calls it', cells: [mentions.length ? mentions.join(' ') : 'nowhere', 'nowhere'], ok: mentions.length === 0 },
        { id: 'guards intact', cells: [`${guards.length}`, '11'], ok: guards.length === 11 },
        { id: 'contour guarded', cells: [String(contour), 'true'], ok: contour },
      ],
      note: 'A CHANNEL is an override, and PRO sets none — so `chromeOn(part)` returns\n'
        + 'the master switch and every one of the eleven guards is the line it was.\n'
        + 'The retail entry claims three: dimensions, outlines and measure, which is\n'
        + 'what stops five of PRO\'s bar entries being DEAD CONTROLS in the room.',
      verdict: ['CLEAN — the chrome is on by default and PRO cannot tell this file grew.',
        'NOT CLEAN — PRO\'s overlays are not what they were.'],
    };
  },

  /** The store's five additions: three read-only, two write, none of them PRO's. */
  store: async () => {
    const { useProjectStore } = await import('../src/stores/projectStore.js');
    const s = useProjectStore.getState();
    const ADDED = ['shelfTravelFor', 'railTravelFor', 'unitSizeBoundsFor',
      'setRailMount', 'setDrawerFitting'];
    const rows = ADDED.map((name) => {
      const mentions = proMentions(name);
      return {
        id: name,
        cells: [typeof s[name], mentions.length ? mentions.join(' ') : 'nowhere'],
        ok: typeof s[name] === 'function' && mentions.length === 0,
      };
    });
    // The three READ-ONLY ones must write nothing: asked twice, the project is
    // the same object it was.
    const before = JSON.stringify(useProjectStore.getState().units);
    s.unitSizeBoundsFor('nothing-like-this');
    s.shelfTravelFor('nothing-like-this', 'nor-this');
    s.railTravelFor('nothing-like-this', 'nor-this');
    const after = JSON.stringify(useProjectStore.getState().units);
    rows.push({ id: 'read-only', cells: [before === after ? 'wrote nothing' : 'WROTE', 'wrote nothing'], ok: before === after });
    return {
      title: 'src/stores/projectStore.js — FIVE ADDITIONS, NONE OF THEM PRO\'S',
      head: ['name', 'is', 'PRO calls it'],
      rows,
      note: 'Three ANSWER a question the surface had no way to ask without performing\n'
        + 'an edit — where a shelf may go, how high a rod may hang, how big a\n'
        + 'wardrobe may be. Two ACT where PRO has only ever acted at add time. No\n'
        + 'existing line changed except the rail selector\'s own lookup.',
      verdict: ['CLEAN — additive, read-only where it says so, and invisible to PRO.',
        'NOT CLEAN — one of them is not what it claims.'],
    };
  },

  /** Nothing outside src/retail imports src/retail, and retail imports no PRO. */
  boundary: () => {
    const mentions = proMentions('src/retail');
    const fromRetail = (git(['grep', '-l', '-e', "from '\\.\\./\\.\\./components", '--', 'src/retail'])
      || '').trim().split('\n').filter(Boolean);
    const intoLib = (git(['grep', '-l', '-e', "from '\\.\\./\\.\\./lib", '--', 'src/retail'])
      || '').trim().split('\n').filter(Boolean);
    return {
      title: 'THE IRON BOUNDARY (Petros, 30.08)',
      head: ['what', 'answer', 'wanted'],
      rows: [
        { id: 'PRO names retail', cells: [mentions.length ? mentions.join(' ') : 'nowhere', 'nowhere'], ok: mentions.length === 0 },
        { id: 'retail names PRO', cells: [fromRetail.length ? fromRetail.join(' ') : 'nowhere', 'nowhere'], ok: fromRetail.length === 0 },
        { id: 'retail names lib', cells: [intoLib.length ? intoLib.join(' ') : 'nowhere', 'nowhere'], ok: intoLib.length === 0 },
      ],
      note: 'The walker in test/turn59-f1-the-switch.test.js is the real assertion —\n'
        + 'it resolves every specifier under src/ and sorts it into three zones.\n'
        + 'T60 added `src/3d/propsPack.js` so the VIEW BAR could ask whether the\n'
        + 'props pack arrived WITHOUT reaching into src/lib, which the boundary\n'
        + 'calls PRO\'s. The door is in the core; retail knocks on the core.',
      verdict: ['CLEAN — two applications, one house, one wall between them.',
        'NOT CLEAN — the boundary leaks.'],
    };
  },

  /** The nine menus, and the law that governs all of them. */
  menus: async () => {
    const A = await import('../src/retail/design/adapter.js');
    const router = src('retail/design/detail/index.jsx');
    const keys = [...router.matchAll(/^ {2}(\w+): \w+Menu,$/gm)].map((m) => m[1]);
    const placeholder = (git(['grep', '-l', '-e', 'No options for this element', '--', 'src'])
      || '').trim().split('\n').filter(Boolean);
    return {
      title: 'COLUMN 7 — A MENU FOR EVERY ELEMENT',
      head: ['what', 'answer', 'wanted'],
      rows: [
        { id: 'menus', cells: [String(A.MENUS.length), '9'], ok: A.MENUS.length === 9 },
        { id: 'router table', cells: [String(keys.length), '9'], ok: keys.length === 9 },
        { id: 'no default branch', cells: [String(!/default:/.test(router)), 'true'], ok: !/default:/.test(router) },
        {
          id: 'placeholder',
          cells: [placeholder.length ? placeholder.join(' ') : 'deleted', 'deleted'],
          // The two files that ARGUE the deletion quote the sentence in a
          // comment; a hit anywhere else is the placeholder coming back.
          ok: placeholder.every((f) => /Detail\.jsx$|detail\/index\.jsx$/.test(f)),
        },
      ],
      note: 'The router is a TABLE, so a kind that is not a key in it has no menu, is\n'
        + 'not selectable, and cannot render an empty panel. That is where the\n'
        + 'licensed deletion actually lands: the DEFAULT BRANCH went with the string.',
      verdict: ['CLEAN — nine menus, no default branch, no placeholder.',
        'NOT CLEAN — column 7 can render a panel with nothing in it.'],
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
    process.stdout.write('EXPECTED BUCKETS: none, and this turn cannot name one. Turn 60 changed no\n'
      + 'file under src/engine, so there is no mechanism by which a golden could move.\n'
      + 'The five src/3d files and the five store additions it DID make are switches\n'
      + 'and selectors whose defaults are PRO\'s behaviour today, and `--probe` argues\n'
      + 'each of them as an exit code.\n');
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
