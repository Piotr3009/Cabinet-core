#!/usr/bin/env node
// ─── The CNC identity report (turn 12, CLAUDE.md rule 7 / F12.4) ────────────
//
// "CNC EXPORT byte-identical for everything that exists today — re-run the
// turn-11 fingerprint script and publish the diff (new variants get NEW
// fingerprints, listed separately)."
//
// This is that script. It prints one line per unit type per preset: a 32-bit
// FNV-1a of the actual DXF text the browser path would write, taken from the
// pure generator (engine/cnc/dxf.js — lib/cncExport.js is the ZIP and the
// download around it and adds nothing to the content).
//
// It is deliberately runnable against ANY checkout, so the way to prove rule 7
// is to run it on the turn-11 baseline and on the branch and diff the two
// outputs. A type that does not exist in the older checkout simply prints
// nothing there, which is what makes a NEW variant show up as an addition
// rather than as a change.
//
//     git worktree add /tmp/base <turn-11 commit>
//     node scripts/cnc-fingerprint.mjs > /tmp/head.txt
//     (cd /tmp/base && node scripts/cnc-fingerprint.mjs > /tmp/base.txt)
//     diff /tmp/base.txt /tmp/head.txt
//
// Usage: node scripts/cnc-fingerprint.mjs [--json]

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { buildUnitDxfFiles, sheetDxf } from '../src/engine/cnc/dxf.js';
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

/**
 * The cases. Ordinary units, plus the ones that carry the pieces this turn
 * touched: a plinth, an end panel, a top infill, shelves, a partition.
 */
function cases() {
  const out = [];
  for (const type of UNIT_TYPE_ORDER) {
    const base = { ...defaultParamsFor(type, P), unit_num: '01' };
    out.push({ id: `${type}`, params: base });
    out.push({ id: `${type}+plinth`, params: { ...base, plinth: true } });
    // ─── The deliberate delta (turn 12, CLAUDE.md F8) ───
    // A unit standing in a RUN of plinthed cabinets. The turn-11 engine has no
    // `run_plinth` input and cuts its own 600 mm piece; turn 12 cuts one board
    // for the whole segment. This case is here so the change SHOWS in the diff
    // instead of hiding behind a script that only ever builds one cabinet.
    out.push({
      id: `${type}+plinth-run-owner`,
      params: {
        ...base,
        plinth: true,
        run_plinth: {
          role: 'owner', offset: 0, length: 1800, unitIds: ['a', 'b', 'c'],
        },
      },
    });
    out.push({
      id: `${type}+plinth-run-member`,
      params: { ...base, plinth: true, run_plinth: { role: 'member', ownerId: 'a' } },
    });
    out.push({
      id: `${type}+shelves`,
      params: {
        ...base,
        sections: [{
          width_mm: base.width,
          items: [
            { id: 's1', kind: 'shelf', pos_mm: 300, variant: 'adjustable' },
            { id: 's2', kind: 'shelf', pos_mm: 500, variant: 'fixed' },
          ],
        }],
      },
    });
  }
  return out;
}

const PRESETS = ['all', 'non-sprayed', 'sprayed', 'fronts'];

function sheetOf(result, ids) {
  const wanted = new Set(ids);
  const panels = exportablePanels(result.panels).filter((p) => wanted.has(p.id));
  if (!panels.length) return null;
  const layout = layoutPanels(panels, result.drills, {
    gap: P.cnc.layoutGap,
    rowWidth: P.cnc.layoutRowWidth,
  });
  return sheetDxf({
    panels, drills: result.drills, layout, unitNum: result.unitNum, profile: P,
  });
}

const rows = [];
for (const c of cases()) {
  let result;
  try {
    result = computeCabinet(c.params, P);
  } catch (e) {
    rows.push(`${c.id}  ERROR  ${e.message}`);
    continue;
  }
  // Per-panel files: one fingerprint per file, so a single moved coordinate
  // names the part it moved in.
  for (const f of buildUnitDxfFiles(result, P)) {
    rows.push(`${c.id}  file  ${f.name}  ${fingerprint(f.dxf)}`);
  }
  const cuttable = exportablePanels(result.panels);
  for (const preset of PRESETS) {
    const text = sheetOf(result, panelIdsForPreset(cuttable, preset));
    rows.push(`${c.id}  sheet ${preset}  ${text ? fingerprint(text) : '(empty)'}`);
  }
}

rows.sort();
if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(rows, null, 1)}\n`);
} else {
  process.stdout.write(`${rows.join('\n')}\n`);
}
