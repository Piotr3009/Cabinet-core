/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F23 . THE PROBE: WHY THE SHEETS DID NOT CHANGE WITH THE TRACED FILE
//
// The owner, 24.10.2026 (19:34): *"narysowane zawiasy to jakas karykatura,
// dalem ci przeciez dxf z dokladnymi rysunkami"*. CLAUDE.md T82 F23 (b): on
// 25.10 the nine pages of the T81 kitchen were pixel-identical with the traced
// file in place; probe the match of `hingeMark` (silhouettes.js, the file the
// door resolves against the entry's `file`) and the projector's `sil` reaching
// the entity, BEFORE any fix.
//
//     node scripts/t82-probe-f23.mjs                      # the table, both files
//     node scripts/t82-probe-f23.mjs --json               # the same, as JSON
//     node scripts/t82-probe-f23.mjs --one --file <f> [--catalogue]   # one run
//
// HOW. The engine's reader imports `reference/hardware/silhouettes.json` once,
// at module load, so each measurement is its own child process with a resolve
// hook pointing that one import at the document under test: T81's committed
// file (45 named fallbacks, read from git at the F0 commit) and the tracer's
// own live output of 25.10 (`verify/t82/silhouettes-live.json`). Each child
// builds the T81 kitchen (scripts/t81-kitchen.mjs, the store's own actions),
// the nine sheets (`wallDrawingSheets`), and asks the reader per instance
// exactly what the projector asks. Two states of the engine's hinge catalogue
// (module state, `engine/hinges.js`): as a node script finds it (never loaded)
// and as the app loads it at start (`lib/hardwareCatalogue.js
// loadHardwareCatalogues`, App.jsx).
//
// Read only: nothing is written but stdout.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { register } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SELF = fileURLToPath(import.meta.url);
const T81_COMMIT = 'd0f84ebe';
const LIVE = join(ROOT, 'verify', 't82', 'silhouettes-live.json');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };

/** The resolve hook: the reader's one JSON import, pointed at the file under test. */
const HOOK = `
let target = null;
export async function initialize(d) { target = d && d.target; }
export async function resolve(spec, ctx, next) {
  const r = await next(spec, ctx);
  if (target && r.url.endsWith('/reference/hardware/silhouettes.json')) return { ...r, url: target, shortCircuit: true };
  return r;
}`;

const sha = (v) => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 12);
/**
 * What a sheet PRINTS: every entity with the units' random ids (`u_...`, in
 * `src`, `host`, `unit`) blanked, in a sorted order (the solids are keyed by
 * those ids, so their order moves from one run to the next; the ink does not).
 */
const printed = (ents) => ents.map((e) => JSON.stringify(e).replace(/u_[a-z0-9]+/g, 'u_')).sort().join('\n');

async function one() {
  const file = resolve(value('--file') || join(ROOT, 'reference', 'hardware', 'silhouettes.json'));
  register(`data:text/javascript,${encodeURIComponent(HOOK)}`, import.meta.url, { data: { target: pathToFileURL(file).href } });
  const { getCabinetProfile } = await import('../src/engine/profile.js');
  const { hardwareInstances } = await import('../src/engine/hardware3d.js');
  const { hingeCatalogue, resolveDoorHinge, plateFamily } = await import('../src/engine/hinges.js');
  const { runnerAskFor, ladderRungFor } = await import('../src/engine/runners.js');
  const { modelBasename } = await import('../src/engine/hardwareUrl.js');
  const { silhouetteEntries, silhouetteMark } = await import('../src/engine/drawings/silhouettes.js');
  const { wallDrawingSheets } = await import('../src/engine/drawings/wallSheets.js');
  const { S, t81Kitchen, setArgs } = await import('./t81-kitchen.mjs');
  if (flag('--catalogue')) {
    const { loadHardwareCatalogues } = await import('../src/lib/hardwareCatalogue.js');
    loadHardwareCatalogues();
  }
  const P = getCabinetProfile();
  const C = P.hardware.hinge.cliptop;
  const M = P.hardware.runner.movento;
  const entries = silhouetteEntries();
  const traced = entries.filter((e) => !e.fallback && (e.views || e.parts));
  const byFamily = {};
  for (const e of traced) byFamily[e.family] = (byFamily[e.family] || 0) + 1;

  const ids = t81Kitchen({ inframe: true });
  // `--depth N`: the BUDR2 at another depth (the control: a box that asks a
  // rung the bucket has a model for); `--section a|b|w`: a section chosen
  // through that unit (C-C), as the Drawings window's dropdown chooses it.
  if (value('--depth')) S().updateUnitParams(ids.c, { depth: Number(value('--depth')) });
  const a = setArgs(value('--section') ? { sectionUnitId: ids[value('--section')] } : {});
  const units = [];
  for (const { unit, result } of a.entries) {
    const hw = hardwareInstances(result, P);
    const hinges = hw.hinges.map((h) => {
      const resolved = resolveDoorHinge({ assigned: h.assigned ?? null, frontThickness: h.thickness ?? null, finish: h.finish ?? C.defaultFinish ?? null });
      const file = modelBasename(h.spec?.file || resolved?.file);
      const entry = entries.find((e) => e.family === 'hinge' && e.file === file) || null;
      const pfile = modelBasename(h.spec?.plateFile || plateFamily({ plate: h.plateRole ?? C.defaultPlate ?? null, finish: h.finish ?? C.defaultFinish ?? null })?.file);
      const pentry = entries.find((e) => e.family === 'plate' && e.file === pfile) || null;
      return {
        side: h.side,
        y: h.y,
        thickness: h.thickness,
        spec: h.spec ? 'on the instance' : 'none',
        angle: resolved?.angle ?? null,
        file: file || '(none)',
        entry: entry ? (entry.fallback ? 'fallback' : 'traced') : 'no entry',
        mark: silhouetteMark('hinge', h) ? 'function' : 'null',
        plateFile: pfile || '(none)',
        plateEntry: pentry ? (pentry.fallback ? 'fallback' : 'traced') : 'no entry',
        plateMark: silhouetteMark('plate', h) ? 'function' : 'null',
      };
    });
    const runners = hw.runners.map((r) => {
      const nominal = runnerAskFor(r.length, P) ?? r.length;
      const rung = ladderRungFor(nominal, P);
      const variant = String(r.variant || M.defaultVariant || '').toUpperCase();
      const entry = entries.find((e) => e.family === 'runner' && Number(e.nl) === Number(rung) && String(e.variant) === variant) || null;
      return {
        side: r.side,
        drawer: r.drawer,
        box: r.length,
        nominal,
        rung,
        variant,
        entry: entry ? (entry.fallback ? `fallback: ${String(entry.reason).slice(0, 60)}` : `traced ${entry.file}`) : 'no entry',
        mark: silhouetteMark('runner', { ...r, nominal }) ? 'function' : 'null',
      };
    });
    units.push({
      num: String(unit.params.unit_num), type: unit.type, depth: unit.params.depth, hinges, runners,
    });
  }

  const sheets = wallDrawingSheets(a).map((s) => {
    const ents = s.sheet?.entities || [];
    const sil = {};
    for (const e of ents) if (e.silhouette) sil[e.family] = (sil[e.family] || 0) + 1;
    const layer = (L) => ents.filter((e) => e.layer === L).length;
    return {
      no: s.no,
      name: s.name,
      entities: ents.length,
      hash: sha(printed(ents)),
      silhouettes: sil,
      HINGE_MARK: ents.filter((e) => e.layer === 'HINGE_MARK' && e.kind === 'rect').length,
      HINGES: layer('HINGES'),
      RUNNERS: layer('RUNNERS'),
    };
  });
  return {
    file: file.startsWith(ROOT) ? file.slice(ROOT.length + 1) : file,
    source: entries.length ? String((await import('../src/engine/drawings/silhouettes.js')).silhouetteSource()) : '',
    traced: traced.length,
    of: entries.length,
    byFamily,
    catalogue: hingeCatalogue() ? `loaded (${hingeCatalogue().items.length} rows)` : 'not loaded',
    ladder: (P.hardware.runner.movento.nominalLadder || []).join(' '),
    units,
    sheets,
  };
}

function run(file, { catalogue = false, depth = null, section = null } = {}) {
  const args = [SELF, '--one', '--file', file, ...(catalogue ? ['--catalogue'] : []),
    ...(depth ? ['--depth', String(depth)] : []), ...(section ? ['--section', section] : [])];
  return JSON.parse(execFileSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
}

async function all() {
  const tmp = mkdtempSync(join(tmpdir(), 't82-f23-'));
  try {
    const t81 = join(tmp, 'silhouettes-t81.json');
    writeFileSync(t81, execFileSync('git', ['show', `${T81_COMMIT}:reference/hardware/silhouettes.json`], { cwd: ROOT }));
    const committed = join(ROOT, 'reference', 'hardware', 'silhouettes.json');
    const runs = {
      'R1 t81 file, headless': run(t81),
      'R2 live file, headless': run(LIVE),
      'R3 t81 file, app catalogue': run(t81, { catalogue: true }),
      'R4 live file, app catalogue': run(LIVE, { catalogue: true }),
      'R5 live file, app catalogue, C-C through 02': run(LIVE, { catalogue: true, section: 'b' }),
      'R6 live file, headless, BUDR2 depth 460': run(LIVE, { depth: 460 }),
      'R7 committed file, app catalogue': run(committed, { catalogue: true }),
    };
    if (flag('--json')) { process.stdout.write(`${JSON.stringify(runs, null, 1)}\n`); return; }
    const out = [];
    const say = (s) => out.push(s);
    for (const [k, r] of Object.entries(runs)) {
      say(`${k}: ${r.file}, traced ${r.traced} of ${r.of} ${JSON.stringify(r.byFamily)}, hinge catalogue ${r.catalogue}`);
    }
    say(`ladder ${runs['R2 live file, headless'].ladder}`);
    for (const k of ['R2 live file, headless', 'R4 live file, app catalogue', 'R6 live file, headless, BUDR2 depth 460']) {
      say(`instances, ${k}:`);
      const seen = new Set();
      for (const u of runs[k].units) {
        for (const h of u.hinges) {
          const line = `  ${u.num} ${u.type} hinge t ${h.thickness} angle ${h.angle} file ${h.file} entry ${h.entry} mark ${h.mark}; plate ${h.plateFile} entry ${h.plateEntry} mark ${h.plateMark}`;
          if (!seen.has(line)) { seen.add(line); say(`${line} (x${u.hinges.filter((x) => x.file === h.file).length})`); }
        }
        for (const rn of u.runners) {
          const line = `  ${u.num} ${u.type} depth ${u.depth} runner box ${rn.box} ask ${rn.nominal} rung ${rn.rung} ${rn.variant} entry ${rn.entry} mark ${rn.mark}`;
          if (!seen.has(line)) { seen.add(line); say(`${line} (x${u.runners.length})`); }
        }
      }
    }
    say('sheets: entities / printed hash / silhouette lines by family / HINGE_MARK rects / HINGES / RUNNERS');
    const keys = Object.keys(runs);
    runs[keys[0]].sheets.forEach((s0, i) => {
      say(`  ${s0.no} ${s0.name}`);
      for (const k of keys) {
        const s = runs[k].sheets[i];
        say(`     ${k.split(' ')[0]} ${s.name === s0.name ? '' : `(${s.name}) `}${s.entities} ${s.hash} sil ${JSON.stringify(s.silhouettes)} bars ${s.HINGE_MARK} HINGES ${s.HINGES} RUNNERS ${s.RUNNERS}`);
      }
    });
    const same = (x, y) => runs[x].sheets.map((s, i) => (s.hash === runs[y].sheets[i]?.hash ? s.no : null)).filter(Boolean);
    say(`identical R1 vs R2 (t81 file vs live file, headless): ${same(keys[0], keys[1]).join(' ')}`);
    say(`identical R3 vs R4 (t81 file vs live file, app catalogue): ${same(keys[2], keys[3]).join(' ')}`);
    process.stdout.write(`${out.join('\n')}\n`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (flag('--one')) {
  one().then((r) => process.stdout.write(`${JSON.stringify(r)}\n`)).catch((e) => { process.stderr.write(`${e?.stack || e}\n`); process.exit(1); });
} else {
  all().catch((e) => { process.stderr.write(`${e?.stack || e}\n`); process.exit(1); });
}
