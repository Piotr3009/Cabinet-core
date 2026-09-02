#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT FOR TURN 63 ────────────────────────────────
//
// CLAUDE.md, TESTS AND PROOF, verbatim:
//
//   *"Goldens ×6 byte-identical; `computeCabinet()` vs LISP exact; `UNNAMED=0`;
//   `verify/t63/t63-classify.mjs` proving **zero** files changed under
//   `src/engine` and `src/lib`."*
//
// And WHAT IS FROZEN: *"`src/engine/**` and `src/lib/**` — read-only tonight.
// No engine file is licensed. … `src/3d/**` — one file licensed, F1 only."*
//
// So the probes are T62's, asked again with one more name on the list: did
// ANY file under `src/engine` or `src/lib` move (a single name is a finding);
// is the ONE licensed 3d file the only 3d file that moved; are the six golden
// hashes the ones they were; is PRO frozen; is the copy a copy — twenty-one
// times, from the one manifest.
//
//   node scripts/t63-classify.mjs                  the six goldens, hashed
//   node scripts/t63-classify.mjs --dump           the results, as JSON
//   node scripts/t63-classify.mjs base.json head.json     classify two dumps
//   node scripts/t63-classify.mjs --probe          argue every option
//   node scripts/t63-classify.mjs --probe copy     argue one of them

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { T63_COPIES } from './t63-copies.mjs';

const ROOT = new URL('../', import.meta.url).pathname;

/** THE SIX — T58b's six, by way of T59, T60, T61 and T62. The same question. */
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
      out[cfg.id] = { drawers: cfg.drawers, sha256: createHash('sha256').update(stable(result)).digest('hex') };
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
  try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; }
};
const baseRef = () => ['origin/main', 'main'].find(
  (ref) => git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]) !== null,
);
const src = (rel) => readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8');
const code = (rel) => src(rel).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function proMentions(name) {
  const out = git(['grep', '-l', '-e', name, '--',
    'src/App.jsx', 'src/main.jsx', 'src/components', 'src/pages', 'index.html']);
  return (out || '').trim().split('\n').filter(Boolean);
}
const moved = (ref, path) => (git(['diff', '--name-only', ref, '--', path]) || '').trim().split('\n').filter(Boolean);

const PROBES = {
  /** ENGINE AND LIB — read-only tonight, no whitelist; a single name is a finding. */
  engine: () => {
    const ref = baseRef();
    if (!ref) {
      return {
        title: 'THE ENGINE AND THE LIB, AGAINST THEIR BASE',
        head: ['what', 'answer'],
        rows: [{ id: 'git', cells: ['no base ref — cannot answer'], ok: null }],
        verdict: ['NO BASE REF. The goldens are the whole proof here.', 'NO BASE REF.'],
      };
    }
    const rows = [];
    for (const path of ['src/engine', 'src/lib']) {
      const m = moved(ref, path);
      rows.push({ id: path, cells: [m.length ? m.join(' ') : 'nothing', 'nothing'], ok: m.length === 0 });
    }
    for (const path of ['KIT_SINK.lsp', 'reference']) {
      const diff = (git(['diff', '--stat', ref, '--', path]) || '').trim();
      rows.push({ id: path, cells: [diff === '' ? 'unchanged' : 'MOVED', 'unchanged'], ok: diff === '' });
    }
    // ONE 3d FILE LICENSED, F1 ONLY.
    const threeD = moved(ref, 'src/3d');
    rows.push({
      id: 'src/3d (one licensed: Hardware.jsx)',
      cells: [threeD.length ? threeD.join(' ') : 'nothing', 'src/3d/Hardware.jsx'],
      ok: threeD.length === 1 && threeD[0] === 'src/3d/Hardware.jsx',
    });
    const stores = moved(ref, 'src/stores');
    rows.push({ id: 'src/stores', cells: [stores.length ? stores.join(' ') : 'nothing', 'nothing'], ok: stores.length === 0 });
    return {
      title: 'THE ENGINE AND THE LIB, AGAINST THEIR BASE — READ-ONLY TONIGHT',
      head: ['path', `diff vs ${ref}`, 'wanted'],
      rows,
      note: 'CLAUDE.md: *"src/engine/** and src/lib/** — read-only tonight. No engine\n'
        + 'file is licensed."* No whitelist to argue about, because there is no\n'
        + 'whitelist. The six hashes answer the same question a second time.',
      verdict: ['CLEAN — not one engine or lib byte moved; one 3d file, the licensed one.',
        'NOT CLEAN — a read-only file moved. Iron rule: write it up as a FINDING.'],
    };
  },

  /** PRO's own surface did not move either. */
  pro: () => {
    const ref = baseRef();
    if (!ref) {
      return {
        title: 'THE FROZEN PRO SURFACE', head: ['what', 'answer'],
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
      note: 'NOT ONE VISIBLE BYTE OF PRO CHANGES THIS TURN — the turn that copied\n'
        + 'twenty-one of its components into the client\'s room.',
      verdict: ['CLEAN — PRO IS FROZEN.', 'NOT CLEAN — PRO moved.'],
    };
  },

  /** The twelfth channel, and the trap it steps round. */
  chrome: async () => {
    const {
      chromeOn, proChromeOn, setChromePart, setProChrome,
    } = await import('../src/3d/chrome.js');
    const hardwareAlways = () => chromeOn('hardware-always') && !proChromeOn();
    setProChrome(true);
    const trap = chromeOn('hardware-always') === true;       // the bare channel falls through
    const proGate = hardwareAlways() === false;              // …and the wired gate does not
    setProChrome(false);
    setChromePart('hardware-always', true);
    const retailGate = hardwareAlways() === true;
    setProChrome(true);
    const cleared = hardwareAlways() === false;
    const entry = src('retail/main-retail.jsx');
    const claimed = [...entry.matchAll(/setChromePart\('([^']+)', true\)/g)].map((m) => m[1]);
    const hw = code('3d/Hardware.jsx');
    const gates = (hw.match(/\|\| hardwareAlways\(\)\) && \(/g) || []).length;
    const mentions = proMentions('hardware-always');
    return {
      title: 'src/3d/chrome.js — THE TWELFTH CHANNEL, AND THE TRAP',
      head: ['what', 'answer', 'wanted'],
      rows: [
        { id: 'bare channel falls through in PRO', cells: [String(trap), 'true'], ok: trap },
        { id: 'wired gate closed in PRO', cells: [String(proGate), 'true'], ok: proGate },
        { id: 'wired gate open in retail', cells: [String(retailGate), 'true'], ok: retailGate },
        { id: 'master switch clears it', cells: [String(cleared), 'true'], ok: cleared },
        { id: 'entry claims', cells: [`${claimed.length}`, '12'], ok: claimed.length === 12 },
        { id: 'gates in Hardware.jsx', cells: [`${gates}`, '2'], ok: gates === 2 },
        { id: 'PRO names it', cells: [mentions.length ? mentions.join(' ') : 'nowhere', 'nowhere'], ok: mentions.length === 0 },
      ],
      note: 'A channel nobody set FALLS THROUGH to the master switch, and PRO\'s is ON —\n'
        + 'so the gate is the channel AND the switch off, which only the retail entry\n'
        + 'throws. PRO\'s two conditions read what they read last night.',
      verdict: ['CLEAN — hinges always for the client, X-ray-only for the joiner.',
        'NOT CLEAN — the trap fired, or the channel is unclaimed.'],
    };
  },

  /** Nothing outside src/retail imports src/retail, and retail imports no PRO. */
  boundary: () => {
    const mentions = proMentions('src/retail');
    const fromRetail = (git(['grep', '-l', '-e', "/components/", '--', 'src/retail']) || '')
      .trim().split('\n').filter(Boolean)
      // A comment naming `src/components/` is prose; an IMPORT is an edge.
      .filter((f) => /from '[^']*\/components\//.test(code(f.replace(/^src\//, ''))));
    return {
      title: 'THE IRON BOUNDARY (Petros, 30.08)',
      head: ['what', 'answer', 'wanted'],
      rows: [
        { id: 'PRO names retail', cells: [mentions.length ? mentions.join(' ') : 'nowhere', 'nowhere'], ok: mentions.length === 0 },
        { id: 'retail imports PRO', cells: [fromRetail.length ? fromRetail.join(' ') : 'nowhere', 'nowhere'], ok: fromRetail.length === 0 },
      ],
      note: 'Twenty-one PRO components exist twice tonight. Not one retail file IMPORTS\n'
        + 'one — the law is COPY, not import, and the walker in\n'
        + 'test/turn59-f1-the-switch.test.js is the real assertion.',
      verdict: ['CLEAN — two applications, one house, one wall between them.', 'NOT CLEAN — the boundary leaks.'],
    };
  },

  /** T63 · THE COPY IS A COPY — twenty-one times, from the one manifest. */
  copy: () => {
    const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    const labels = (t) => {
      const out = new Set();
      for (const m of uncomment(t).matchAll(/>([^<>{}]+)</g)) {
        const s2 = m[1].replace(/\s+/g, ' ').trim();
        if (!/[;=()[\]|&`]|=>/.test(s2) && s2.length >= 2 && /[A-Za-z]/.test(s2)) out.add(s2);
      }
      return [...out];
    };
    const hooks = (t) => [...new Set([...uncomment(t).matchAll(/\bdata-([a-z0-9-]+)=/g)].map((m) => m[1]))];
    const gestures = (t) => [...new Set([...uncomment(t).matchAll(/\b(on[A-Z][A-Za-z]+)=/g)].map((m) => m[1]))];
    const rows = [];
    let lostAll = 0;
    for (const c of T63_COPIES) {
      const pro = src(c.pro.replace(/^src\//, ''));
      const copy = src(c.retail.replace(/^src\//, ''));
      const flat = copy.replace(/\s+/g, ' ');
      const lost = [
        ...labels(pro).filter((l) => !/^#[0-9a-f]{3,8}$/i.test(l) && !flat.includes(l)).map((l) => `label "${l}"`),
        ...hooks(pro).filter((h) => !hooks(copy).includes(h)).map((h) => `data-${h}`),
        ...gestures(pro).filter((g) => !gestures(copy).includes(g)).map((g) => g),
      ];
      lostAll += lost.length;
      const proLines = pro.split('\n').length;
      const copyLines = copy.split('\n').length;
      rows.push({
        id: c.pro.split('/').pop(),
        cells: [`${proLines}`, `${copyLines}`, `${labels(pro).length}/${hooks(pro).length}/${gestures(pro).length}`, lost.length ? lost.slice(0, 3).join(', ') : 'nothing'],
        ok: lost.length === 0 && proLines === copyLines,
      });
    }
    return {
      title: 'T63 · THE COPY IS A COPY — TWENTY-ONE TIMES',
      head: ['file', 'PRO lines', 'copy lines', 'labels/hooks/gestures', 'lost'],
      rows,
      note: 'Each row reads PRO\'s file and the copy off disk and asks four things: the\n'
        + 'labels a person reads, the data-* hooks a test grabs, the gestures a hand\n'
        + 'makes, and the line count. `scripts/t63-copy.mjs` made every one of these\n'
        + 'by machine; `test/turn63-the-copies.test.js` is the assertion with teeth.',
      verdict: ['CLEAN — twenty-one copies, nothing lost, every one PRO\'s own length.',
        `NOT CLEAN — ${lostAll} thing(s) lost across the copies.`],
    };
  },
};

// ─── THE REPORT ────────────────────────────────────────────────────────────

function table(section) {
  const w = section.head.map((h, i) => Math.max(h.length, ...section.rows.map((r) => String(i === 0 ? r.id : r.cells[i - 1] ?? '').length)));
  const line = (cells) => cells.map((c, i) => String(c ?? '').padEnd(w[i])).join('  ');
  const out = [`\n── ${section.title}`, line(section.head), line(w.map((n) => '─'.repeat(n)))];
  for (const r of section.rows) out.push(`${line([r.id, ...r.cells])}  ${r.ok === null ? '·' : (r.ok ? 'ok' : 'FAIL')}`);
  if (section.note) out.push('', section.note);
  const clean = section.rows.every((r) => r.ok !== false);
  out.push('', `VERDICT: ${section.verdict[clean ? 0 : 1]}`);
  return { text: out.join('\n'), clean };
}

const argv = process.argv.slice(2);
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (argv[0] === '--dump') {
    process.stdout.write(`${JSON.stringify(dump(), null, 1)}\n`);
  } else if (argv[0] === '--probe') {
    const want = argv[1] ? [argv[1]] : Object.keys(PROBES);
    let allClean = true;
    for (const name of want) {
      const section = await PROBES[name]();
      const { text, clean } = table(section);
      process.stdout.write(`${text}\n`);
      allClean = allClean && clean;
    }
    process.stdout.write(`\n${allClean ? 'ALL CLEAN' : 'FINDINGS — see above'}\n`);
    process.exit(allClean ? 0 : 1);
  } else if (argv.length === 2) {
    const base = JSON.parse(readFileSync(argv[0], 'utf8'));
    const head = JSON.parse(readFileSync(argv[1], 'utf8'));
    const { rows, counts } = classify(base, head);
    process.stdout.write(`${rows.join('\n')}\n\nIDENTICAL=${counts.IDENTICAL} UNNAMED=${counts.UNNAMED} NAMED=0\n`);
    process.exit(counts.UNNAMED === 0 ? 0 : 1);
  } else {
    const head = dump();
    for (const [id, h] of Object.entries(head)) process.stdout.write(`${id.padEnd(12)}${h.sha256 || h.error}\n`);
  }
}
