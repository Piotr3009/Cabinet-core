#!/usr/bin/env node
// ─── The CNC delta probe (turn 18, CLAUDE.md F1.4 / rule 0) ─────────────────
//
// `scripts/cnc-fingerprint.mjs` answers "did anything change". It cannot answer
// "WHAT changed", and on a turn whose delta 1 is a label every part carries,
// every fingerprint moves and the diff says nothing useful.
//
// Turn 17 answered that with an ad-hoc probe run by hand against two checkouts
// (verify/t17/delta-evidence.txt). CLAUDE.md F1.4 asks for the same probe again
// — "the probe from the turn-17 audit (entity-by-entity, pairs) is the check:
// zero non-TEXT changes" — so this turn it is a SCRIPT, runnable against any
// checkout, and the diff of two runs IS the evidence.
//
// It prints three sections, one line per fact, in a stable order:
//
//   GEOM   <kit> <file> <hash>          every poly and circle of a per-panel
//                                       DXF, hashed WITHOUT the text entities
//   CENSUS <kit> <preset> <type/layer> <n>
//                                       every entity of every preset sheet,
//                                       counted by type and layer
//   TEXT   <kit> <file> <layer>|<str>|<height>|<x>,<y>
//                                       every TEXT entity a per-panel file
//                                       carries, in order
//
// A turn whose only delta is the lettering therefore diffs to TEXT lines and
// nothing else — which is what "TEXT entities only" means as a fact rather than
// as a promise.
//
//     git worktree add /tmp/base <baseline commit>
//     node scripts/cnc-delta-probe.mjs > /tmp/head.txt
//     (cd /tmp/base && node scripts/cnc-delta-probe.mjs > /tmp/base.txt)
//     diff /tmp/base.txt /tmp/head.txt

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { buildUnitDxfFiles, parseDxf, sheetDxf } from '../src/engine/cnc/dxf.js';
import { layoutPanels } from '../src/engine/cnc/layout.js';
import { exportablePanels, panelIdsForPreset } from '../src/engine/cnc/groups.js';
import { UNIT_TYPE_ORDER, defaultParamsFor } from '../src/engine/types.js';

/** 32-bit FNV-1a, written out so this depends on nothing but the engine. */
function fingerprint(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const num = (n) => {
  const s = Number(n).toFixed(4).replace(/\.?0+$/, '');
  return s === '-0' ? '0' : s;
};

/** One entity as a line of text — everything a cutter would notice. */
function describe(e) {
  if (e.type === 'poly') {
    return `poly ${e.layer} ${e.closed ? 'closed' : 'open'} ${e.pts.map(([x, y]) => `${num(x)},${num(y)}`).join(' ')}`;
  }
  if (e.type === 'circle') return `circle ${e.layer} ${num(e.cx)},${num(e.cy)} r${num(e.r)}`;
  return `text ${e.layer}|${e.str}|${num(e.h)}|${num(e.x)},${num(e.y)}`;
}

const PRESETS = ['all', 'non-sprayed', 'sprayed', 'fronts'];

/**
 * The cases. Every kit at its own defaults, plus the ones carrying the pieces
 * THIS turn touches.
 *
 * A kit at its defaults is not enough on its own and turn 18 is the proof: a
 * WARDROBE arrives with no drawers, so a probe that only ever built one would
 * have reported "no geometry changed" while delta 2 — the two pockets a
 * wardrobe's drawer sides gain — went past it unseen. A new turn adds its own
 * case here rather than trusting the defaults to reach its work.
 */
export function cases() {
  const out = [];
  for (const type of UNIT_TYPE_ORDER) {
    const base = { ...defaultParamsFor(type, P), unit_num: '01' };
    out.push({ id: type, params: base });
    // Turn 18 (CLAUDE.md F3): the internal drawer box, which is where delta 2
    // lands. Harmless on a kit that does not support drawers — the engine drops
    // them with a warning and the case is the plain cabinet again.
    out.push({ id: `${type}+drawers`, params: { ...base, drawers: 2 } });
    // ─── TURN 23 (CLAUDE.md F5 / F6): THE PARTITION PROBE ──────────────────
    //
    // This turn's only two CNC classes live on a VERTICAL PARTITION and
    // nowhere else, and a probe that only ever builds an undivided box would
    // report `no change` for a subtraction and an addition. Three shapes,
    // because the two laws behave differently on each:
    //
    //   +partition        floor to top — one full run of back screws, and the
    //                     biscuit set that used to be here is gone
    //   +partition-on-shelf
    //                     turn 12's attachment: a crossing FIXED shelf, which
    //                     is what F6.2's per-segment rule is about
    //   +partitions-2     the owner's own three-bay case
    const partition = (items) => ({
      ...base,
      width: Math.max(Number(base.width) || 0, 900),
      sections: [{ width_mm: Math.max(Number(base.width) || 0, 900), items }],
    });
    out.push({
      id: `${type}+partition`,
      params: partition([{ id: 'p1', kind: 'partition', x_mm: 450 }]),
    });
    out.push({
      id: `${type}+partition-on-shelf`,
      params: partition([
        { id: 's1', kind: 'shelf', pos_mm: Math.round((Number(base.height) || 720) / 2), variant: 'fixed' },
        { id: 'p1', kind: 'partition', x_mm: 450 },
      ]),
    });
    out.push({
      id: `${type}+partitions-2`,
      params: partition([
        { id: 'p1', kind: 'partition', x_mm: 300 },
        { id: 'p2', kind: 'partition', x_mm: 600 },
      ]),
    });
  }
  return out;
}

function main() {
  const geom = [];
  const census = [];
  const text = [];

  for (const { id: type, params } of cases()) {
    let result;
    try {
      result = computeCabinet(params, P);
    } catch {
      continue;                       // a kit this checkout does not have
    }

    // ── per-panel files ──
    for (const f of buildUnitDxfFiles(result, P)) {
      const parsed = parseDxf(f.dxf);
      const shape = parsed.entities.filter((e) => e.type !== 'text').map(describe).join('\n');
      geom.push(`GEOM   ${type} ${f.name} ${fingerprint(shape)}`);
      for (const e of parsed.entities.filter((t) => t.type === 'text')) {
        text.push(`TEXT   ${type} ${f.name} ${e.layer}|${e.str}|${num(e.h)}|${num(e.x)},${num(e.y)}`);
      }
    }

    // ── preset sheets, by entity type and layer ──
    const cuttable = exportablePanels(result.panels);
    for (const preset of PRESETS) {
      const ids = new Set(panelIdsForPreset(cuttable, preset));
      const panels = cuttable.filter((p) => ids.has(p.id));
      if (!panels.length) continue;
      const layout = layoutPanels(panels, result.drills, {
        gap: P.cnc.layoutGap, rowWidth: P.cnc.layoutRowWidth,
      });
      const dxf = sheetDxf({
        panels, drills: result.drills, layout, unitNum: result.unitNum, profile: P,
      });
      const counts = new Map();
      for (const e of parseDxf(dxf).entities) {
        const key = `${e.type}/${e.layer}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      for (const key of [...counts.keys()].sort()) {
        census.push(`CENSUS ${type} ${preset} ${key} ${counts.get(key)}`);
      }
    }
  }

  for (const line of geom) process.stdout.write(`${line}\n`);
  for (const line of census) process.stdout.write(`${line}\n`);
  for (const line of text) process.stdout.write(`${line}\n`);
}

// Run only when this file is the entry point: turn 24's axis classifier
// imports `cases()` so that both scripts ask the engine the SAME questions,
// and an import must not print 1 500 lines to stdout on the way in.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) main();
