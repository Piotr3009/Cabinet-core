// ─── T75 · ONE SHAPE FOR EVERY NEW GOLDEN ──────────────────────────────────
//
// CLAUDE.md T75, FROZEN 1: *"Every new kit and every new cut geometry gets a
// golden of its own under `fixtures/` (named in each F) and a line in the
// classifier."*
//
// The six old goldens are hand-traced from the LISP. A NEW golden is the cut
// a new kit makes today, written down so that tomorrow's engine is held to it
// byte for byte: the cut list rows the workshop reads, every board with its
// size, box and outline vertex count, every hole by layer, and the order
// lines. One function makes that summary, so the classifier, the tests and
// the script that first wrote each file cannot disagree about what a golden
// IS.
//
//   node scripts/t75-golden.mjs --write <name>    re-write one fixture (only
//                                                 when the F that owns it says so)

import { writeFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const r4 = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v) * 10000) / 10000 : v);
const box = (b) => (b ? {
  x: r4(b.x), y: r4(b.y), z: r4(b.z), w: r4(b.w), h: r4(b.h), d: r4(b.d),
} : null);

/** The summary a golden holds: what the workshop cuts, drills and orders. */
export function goldenSummary(result) {
  const drillsByLayer = {};
  for (const d of result.drills || []) {
    const k = `${d.layer || 'none'}|${d.panel || d.part || ''}`;
    drillsByLayer[k] = (drillsByLayer[k] || 0) + 1;
  }
  return {
    csvLines: result.csvLines || [],
    panels: (result.panels || []).map((p) => ({
      id: p.id,
      part: p.part,
      role: p.role,
      w: r4(p.w),
      h: r4(p.h),
      thickness: r4(p.thickness),
      box: box(p.box),
      outline: Array.isArray(p.cnc?.outline) ? p.cnc.outline.length : null,
      holes: Array.isArray(p.cnc?.holes) ? p.cnc.holes.length : null,
      pockets: Array.isArray(p.cnc?.pockets) ? p.cnc.pockets.length : null,
      readiness: p.meta?.readiness ?? null,
    })),
    drills: Object.keys(drillsByLayer).sort().map((k) => [k, drillsByLayer[k]]),
    hardware: (result.hardware || []).map((h) => ({ role: h.role, qty: h.qty ?? h.count ?? null, label: h.label ?? h.name ?? null })),
  };
}

/** The params a golden is computed from, through the default profile. */
export function goldenOf(params, profile = P) {
  return goldenSummary(computeCabinet(params, profile));
}

/** A fixture file's body: what it is, where its truth comes from, and the summary. */
export function goldenFile({ name, F, source, params, profile = P }) {
  return {
    meta: {
      name,
      turn: 'T75',
      F,
      source,
      computed_by: 'scripts/t75-golden.mjs goldenSummary(computeCabinet(params, DEFAULT_CABINET_PROFILE))',
      status: 'PENDING_OWNER_VERIFICATION',
      rule: 'GOLDEN FIXTURE. Tests and scripts/t75-classify.mjs hold the engine to it byte for byte. '
        + 'If the engine differs, the ENGINE moved: name why, or put it back.',
    },
    params,
    expected: goldenOf(params, profile),
  };
}

export function writeGolden(path, spec) {
  writeFileSync(path, `${JSON.stringify(goldenFile(spec), null, 2)}\n`);
}
