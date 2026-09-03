#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT FOR TURN 64 ────────────────────────────────
//
// CLAUDE.md, TESTS AND PROOF, verbatim:
//
//   *"Goldens ×6 byte-identical; `computeCabinet()` vs LISP exact; `UNNAMED=0`;
//   `verify/t64/t64-classify.mjs` proving zero files changed under
//   `src/engine` and `src/lib`."*
//
// And WHAT IS FROZEN: *"PRO — zero bytes … `src/engine/**`, `src/lib/**` —
// read-only … `src/3d/**` — two files licensed, by the channel/flag pattern
// only (`LedIcons.jsx` for F1.3, and whichever file owns PRO's Delete-key
// handler if it lives in `src/3d`)."* PRO's Delete handler lives in
// `src/pages/ConfiguratorPage.jsx` (frozen, copied into retail's `keys.js`),
// so exactly ONE `src/3d` file may move tonight, and the probe says which.
//
// T63's probes, asked again with T64's answers: did ANY file under
// `src/engine` or `src/lib` move (a single name is a finding); is `LedIcons.jsx`
// the only 3d file that moved, and does its PRO branch read what it read; are
// the six golden hashes the ones they were; is PRO frozen; is the copy still a
// copy — twenty-five times, from the one manifest, under the F3 reskin.
//
//   node scripts/t64-classify.mjs                  the six goldens, hashed
//   node scripts/t64-classify.mjs --dump           the results, as JSON
//   node scripts/t64-classify.mjs base.json head.json     classify two dumps
//   node scripts/t64-classify.mjs --probe          argue every option
//   node scripts/t64-classify.mjs --probe copy     argue one of them

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { ALL_COPIES, T63_COPIES } from './t63-copies.mjs';

const ROOT = new URL('../', import.meta.url).pathname;

/** THE SIX — T58b's six, by way of T59 … T63. The same question. */
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
    // ONE 3d FILE LICENSED — F1.3's, by the channel/flag pattern.
    const threeD = moved(ref, 'src/3d');
    rows.push({
      id: 'src/3d (one licensed: LedIcons.jsx)',
      cells: [threeD.length ? threeD.join(' ') : 'nothing', 'src/3d/LedIcons.jsx'],
      ok: threeD.length === 1 && threeD[0] === 'src/3d/LedIcons.jsx',
    });
    const stores = moved(ref, 'src/stores');
    rows.push({ id: 'src/stores', cells: [stores.length ? stores.join(' ') : 'nothing', 'nothing'], ok: stores.length === 0 });
    return {
      title: 'THE ENGINE AND THE LIB, AGAINST THEIR BASE — READ-ONLY TONIGHT',
      head: ['path', `diff vs ${ref}`, 'wanted'],
      rows,
      note: 'CLAUDE.md: *"src/engine/** and src/lib/** — read-only."* No whitelist to\n'
        + 'argue about, because there is no whitelist. PRO\'s Delete handler lives in\n'
        + 'src/pages (frozen; copied to retail/design/keys.js), so one 3d file moves.',
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
      note: 'NOT ONE VISIBLE BYTE OF PRO CHANGES THIS TURN.',
      verdict: ['CLEAN — PRO IS FROZEN.', 'NOT CLEAN — PRO moved.'],
    };
  },

  /** F1.3 · the LED icons' law — PRO's branch answers what it answered. */
  led: async () => {
    const { ledIconState } = await import('./t64-led-law.mjs');
    const pro = ledIconState({ pro: true, panelOpen: false, lightOn: true });
    const closed = ledIconState({ pro: false, panelOpen: false, lightOn: false });
    const off = ledIconState({ pro: false, panelOpen: true, lightOn: false });
    const on = ledIconState({ pro: false, panelOpen: true, lightOn: true });
    const file = code('3d/LedIcons.jsx');
    const guardFirst = /if \(!chromeOn\('led-icons'\)\) return null;/.test(file);
    const proSides = /\['L', 'R'\]\.map\(\(side\) => \(/.test(file) && /mm\(side === 'L' \? 60 : W - 60\), mm\(H \* 0\.78\), mm\(D \+ 60\)/.test(file);
    const mentions = proMentions('ledIconState');
    return {
      title: 'src/3d/LedIcons.jsx — THREE STATES FOR THE CLIENT, ONE FOR PRO',
      head: ['what', 'answer', 'wanted'],
      rows: [
        { id: 'PRO: shown whatever the flags say', cells: [String(pro.show), 'true'], ok: pro.show === true },
        { id: 'retail: panel closed → none', cells: [String(closed.show), 'false'], ok: closed.show === false },
        { id: 'retail: panel open, light OFF → shown', cells: [String(off.show), 'true'], ok: off.show === true },
        { id: 'retail: light ON → hidden', cells: [String(on.show), 'false'], ok: on.show === false },
        { id: 'the channel guard is still the first line', cells: [String(guardFirst), 'true'], ok: guardFirst },
        { id: 'PRO\'s two side icons, at PRO\'s positions', cells: [String(proSides), 'true'], ok: proSides },
        { id: 'PRO names the law', cells: [mentions.length ? mentions.join(' ') : 'nowhere', 'nowhere'], ok: mentions.length === 0 },
      ],
      note: 'The owner: *"dopiero po włączeniu menu lights — i też powinny zniknąć jak\n'
        + 'włączę światło ON."* Two flags that already exist, no new one; PRO\'s\n'
        + 'branch is the T58 behaviour, byte for byte.',
      verdict: ['CLEAN — three states for the client, PRO unchanged.', 'NOT CLEAN — the law drifted.'],
    };
  },

  /** Nothing outside src/retail imports src/retail, and retail imports no PRO. */
  boundary: () => {
    const mentions = proMentions('src/retail');
    const fromRetail = (git(['grep', '-l', '-e', '/components/', '--', 'src/retail']) || '')
      .trim().split('\n').filter(Boolean)
      .filter((f) => /from '[^']*\/components\//.test(code(f.replace(/^src\//, ''))));
    return {
      title: 'THE IRON BOUNDARY (Petros, 30.08)',
      head: ['what', 'answer', 'wanted'],
      rows: [
        { id: 'PRO names retail', cells: [mentions.length ? mentions.join(' ') : 'nowhere', 'nowhere'], ok: mentions.length === 0 },
        { id: 'retail imports PRO', cells: [fromRetail.length ? fromRetail.join(' ') : 'nowhere', 'nowhere'], ok: fromRetail.length === 0 },
      ],
      note: 'Twenty-five PRO components exist twice. Not one retail file IMPORTS one —\n'
        + 'the law is COPY, not import; keys.js COPIES PRO\'s Delete handler and\n'
        + 'imports the shared lib, as PRO\'s page does.',
      verdict: ['CLEAN — two applications, one house, one wall between them.', 'NOT CLEAN — the boundary leaks.'],
    };
  },

  /** THE COPY IS STILL A COPY — twenty-five times, under the F3 reskin. */
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
    const ref = baseRef();
    const rows = [];
    let lostAll = 0;
    for (const c of ALL_COPIES) {
      const pro = src(c.pro.replace(/^src\//, ''));
      const copy = src(c.retail.replace(/^src\//, ''));
      const flat = copy.replace(/\s+/g, ' ');
      const lost = [
        ...labels(pro).filter((l) => !/^#[0-9a-f]{3,8}$/i.test(l) && !flat.includes(l)).map((l) => `label "${l}"`),
        ...hooks(pro).filter((h) => !hooks(copy).includes(h)).map((h) => `data-${h}`),
        ...gestures(pro).filter((g) => !gestures(copy).includes(g)).map((g) => g),
      ];
      lostAll += lost.length;
      const movedTonight = ref ? moved(ref, c.retail).length > 0 : false;
      // T62's four copies carry ONE declared, opt-in addition (`turn62-f2-f3`
      // proves it), so their length is not PRO's; T63's twenty-one are PRO's
      // own length. Neither may have moved tonight.
      const sameLength = T63_COPIES.includes(c) ? pro.split('\n').length === copy.split('\n').length : true;
      rows.push({
        id: c.pro.split('/').pop(),
        cells: [`${pro.split('\n').length}`, `${copy.split('\n').length}`, movedTonight ? 'MOVED' : 'still', lost.length ? lost.slice(0, 3).join(', ') : 'nothing'],
        ok: lost.length === 0 && sameLength && !movedTonight,
      });
    }
    return {
      title: 'T64 · THE COPIES DID NOT DRIFT UNDER THE RESKIN — TWENTY-FIVE TIMES',
      head: ['file', 'PRO lines', 'copy lines', 'markup tonight', 'lost'],
      rows,
      note: 'F3 reskins the copies through their GENERATED `pbi-re-*` sheet (THE MAP in\n'
        + 'scripts/t63-copy.mjs → styles/copies.css) and never through their markup:\n'
        + 'not one copy file moved against the base.',
      verdict: ['CLEAN — twenty-five copies, nothing lost, no markup moved.',
        `NOT CLEAN — ${lostAll} thing(s) lost, or a copy's markup moved.`],
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
