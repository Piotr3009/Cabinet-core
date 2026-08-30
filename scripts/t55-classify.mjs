#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT (turn 55, CLAUDE.md iron rule) ──────────────
//
// T54's classifier, RE-HEADED rather than reused, because the header IS the
// argument and the argument is tonight's. CLAUDE.md, 30.08:
//
//   *"The six golden fixtures stay byte-identical. Goldens are FLAT rooms: a
//   slope fix that moves a flat room is a fault. Slope-case deltas are
//   expected here and must be NAMED in the classifier. UNNAMED=0."*
//
// Eight features, and the claim is made feature by feature. Every one has a
// `--probe`, exit codes and all — an argument that is only prose is an
// argument nobody re-runs.
//
// ─── WHY NOT ONE OF THE EIGHT CAN MOVE A GOLDEN ─────────────────────────────
//
//   F1   the four-corner infill exists only under a `slope_cut`, and no
//        golden carries one. `--probe f1` — the corners land on the ceiling
//        line to < 0.001 mm, on the straight rake and the knee fixture.
//   F2   is a PICTURE fix (rig screenshots); the engine is proven clean by
//        number: `--probe f2` measures the cut leaf's edge parallel to the
//        ceiling. No golden carries a cut leaf.
//   F3   the door partition is forced in the STORE, on the slope-flip
//        transition only; `computeCabinet` on a golden sees no forced leaf.
//        `--probe f3`.
//   F4   widens one predicate (`isShelfBoard`) asked only on the watch-glass
//        road; no golden carries a watch item. `--probe f4`.
//   F5   deletes two finishes and wires the survivor through part records; no
//        golden carries `watch_finish`. `--probe f5`.
//   F6   stamps `grain: 'h'` on watch-insert parts at birth; no golden
//        carries an insert. `--probe f6`.
//   F7   trims LED strips on the carcass's own roof law; strips are UI-side
//        pictures and `result.params.slope_cut` is echoed only where a cut is
//        ACTIVE — absent on every flat unit. `--probe f7`.
//   F8   is a UI select plus a drilling assertion; the drilling itself is the
//        unchanged T46/T50 law. `--probe f8`.
//
// NAMED SLOPE DELTAS of this turn (expected, and only under a `slope_cut` or
// a lighting item — never in a golden):
//   · INFILL-T-FACE under a rake: `meta.corners` replaces `tilt_*` +
//     `elevation`; its cnc outline is the parallelogram (was a rectangle);
//     box is the corners' own bounds.
//   · `result.params.slope_cut` is echoed on ACTIVELY cut units (F7).
//   · watch-insert parts carry `cnc.grain: 'h'` and a standing drawn frame
//     (F6) — watch items only.
//   · the watch pane lands in the forced PARTITION where that is the board
//     directly above (F4) — watch-glass items only.
//
// If a golden moves anyway: iron rule — **write it up as a FINDING. Do not
// name a bucket for it.**
//
// Usage — the three lines every classifier in this house has taken:
//
//     node scripts/t54-classify.mjs --dump > /tmp/base.json     # on the base
//     node scripts/t55-classify.mjs --dump > /tmp/head.json     # on the branch
//     node scripts/t55-classify.mjs /tmp/base.json /tmp/head.json
//
//     node scripts/t55-classify.mjs --probe        # all eight, one exit code
//     node scripts/t55-classify.mjs --probe f1     # one of them
//
// The KIT COUNT is DERIVED from the folder, never typed: 13 tonight, and T55
// buries no kit.
//
// Zero dependencies beyond the engine and node:crypto.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

// The six standard configs are T34's through T54's, unchanged — the same set,
// so a T54 dump and a T55 dump are directly comparable.
export const STANDARD_CONFIGS = [
  { id: 'WARDROBE', drawers: false },
  { id: 'BUD', drawers: false },
  { id: 'WUD', drawers: false },
  { id: 'BUDR', drawers: true },
  { id: 'BUDR4', drawers: true },
  { id: 'PANTRY', drawers: true },
];

/** Key-sorted JSON, so two runs of the same engine serialise identically. */
export function canonical(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value === undefined ? null : value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
}

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

export function dump() {
  const out = {};
  for (const cfg of STANDARD_CONFIGS) {
    let result;
    try {
      result = computeCabinet({ ...defaultParamsFor(cfg.id, P), unit_num: '01' }, P);
    } catch (e) {
      out[cfg.id] = { error: e.message };
      continue;
    }
    const text = canonical(result);
    out[cfg.id] = { drawers: cfg.drawers, sha256: sha256(text), tree: JSON.parse(text) };
  }
  return out;
}

/** Every kit on the shelf — DERIVED, never typed. */
export function kitCount(dir = 'reference/lisp') {
  return readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.lsp')).length;
}

/** Every golden, computed once — the probes share it rather than re-deriving. */
function goldens() {
  return STANDARD_CONFIGS.map((cfg) => {
    const params = { ...defaultParamsFor(cfg.id, P), unit_num: '01' };
    return { cfg, params, result: computeCabinet(params, P) };
  });
}

const edgeAt = (a, b) => (x) => a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);

// ─── THE PROBES ─────────────────────────────────────────────────────────────

export const PROBES = {};

/**
 * F1 — THE FOUR CORNERS. Everything tonight cuts is gated on a `slope_cut`,
 * and no golden carries one. Then the audit scene is rebuilt and the corner
 * law measured: top corners ON the ceiling, bottom corners one vertical
 * reserve below it, ends plumb — worst residual printed, on the straight rake
 * AND the knee fixture.
 */
PROBES.f1 = () => {
  const rows = goldens().map(({ cfg, params, result }) => {
    const cut = params.slope_cut ?? null;
    const cornered = (result.panels || []).filter((p) => Array.isArray(p.meta?.corners)).length;
    const sloped = (result.panels || []).filter((p) => p.meta?.slopeCut).length;
    return {
      id: cfg.id,
      cells: [cut == null ? '(none)' : 'YES', String(sloped), String(cornered)],
      ok: cut == null && sloped === 0 && cornered === 0,
    };
  });
  const W = 600;
  const INFILL = 40;
  const scenes = [
    ['straight rake', { infill: INFILL, pts: [{ x: 0, y: 2000 }, { x: W, y: 1700 }] }],
    ['the knee', { infill: INFILL, pts: [{ x: 0, y: 2000 }, { x: 300, y: 2000 }, { x: W, y: 1700 }] }],
  ];
  for (const [name, cut] of scenes) {
    const r = computeCabinet({
      ...defaultParamsFor('WARDROBE', P), unit_num: 'W01', top_infill_mm: 40, slope_cut: cut,
    }, P);
    const faces = (r.panels || []).filter((p) => /^INFILL-T-FACE/.test(p.id) && p.meta?.corners);
    const shelf = (r.panels || []).find((p) => /^INFILL-T-SHELF/.test(p.id));
    const ceil = (x) => {
      const pts = cut.pts;
      for (let i = 1; i < pts.length; i += 1) {
        if (x <= pts[i].x) {
          return pts[i - 1].y + ((pts[i].y - pts[i - 1].y) * (x - pts[i - 1].x))
            / (pts[i].x - pts[i - 1].x || 1);
        }
      }
      return pts[pts.length - 1].y;
    };
    let worst = 0;
    let plumb = true;
    for (const face of faces) {
      const c = face.meta.corners;
      const beta = (face.meta.slopeCut.deg * Math.PI) / 180;
      const resV = INFILL / Math.cos(beta);
      worst = Math.max(worst,
        Math.abs(c[3][1] - ceil(c[3][0])),
        Math.abs(c[2][1] - ceil(c[2][0])),
        Math.abs(c[0][1] - (ceil(c[0][0]) - resV)),
        Math.abs(c[1][1] - (ceil(c[1][0]) - resV)));
      plumb = plumb && c[0][0] === c[3][0] && c[1][0] === c[2][0];
    }
    rows.push({
      id: name,
      cells: ['YES', faces.length ? (shelf ? 'SHELF LEAKED' : `${faces.length} corner board(s)`) : 'MISSING',
        `worst residual ${worst.toFixed(6)} mm`],
      ok: faces.length >= 1 && !shelf && plumb && worst < 0.001,
    });
  }
  return {
    head: 'F1 · THE FOUR CORNERS — one board, stated outright, gated on a slope_cut no golden carries',
    columns: ['slope_cut', 'cut panels', 'corner boards'],
    rows,
    note: 'The residual is the corner law itself: top corners on the ceiling, bottom corners one vertical reserve (infill / cos β) below, ends plumb by construction — CLAUDE.md demands < 0.001 mm.',
    verdict: [
      'CLEAN — not one of the six is under a rake, the shelf stayed off it, and the corners land on their lines to a thousandth.',
      'NOT CLEAN — a golden grew a corner board, or a corner missed its line. STOP (iron rule).',
    ],
  };
};

/**
 * F2 — THE PICTURE, NOT THE ENGINE. The shaker fault is a 3-D question and
 * the fix (F1's own corners) never touches engine geometry. Proven clean by
 * number: the owner's scene, the cut leaf's edge parallel to the ceiling.
 */
PROBES.f2 = () => {
  const rows = goldens().map(({ cfg, result }) => {
    const leaves = (result.panels || []).filter((p) => p.role === 'front');
    return {
      id: cfg.id,
      cells: [String(leaves.length), String(leaves.filter((p) => p.meta?.slopeCut).length)],
      ok: leaves.every((p) => !p.meta?.slopeCut),
    };
  });
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    width: 1000,
    height: 2200,
    depth: 600,
    front_type: 'S',
    door_count: 2,
    slope_cut: { infill: 40, pts: [{ x: 0, y: 1300 }, { x: 520, y: 2200 }, { x: 1000, y: 2200 }] },
  }, P);
  const leaf = (r.panels || []).find((p) => p.id === 'W01-FL');
  let worst = null;
  if (leaf?.cnc?.outline && leaf?.meta?.slopeCut) {
    // The leaf's cut edge, measured against the ceiling's own gradient over
    // the raked stretch: parallel to < 0.1 mm across the leaf (the number the
    // spec calls proven).
    const beta = Math.atan((2200 - 1300) / 520);
    const want = Math.tan(beta);
    const pts = leaf.cnc.outline.filter(([, y]) => y > leaf.meta.slopeCut.low - 1e-6);
    if (pts.length >= 2) {
      const [a, b] = [pts[0], pts[pts.length - 1]];
      const got = Math.abs((b[1] - a[1]) / ((b[0] - a[0]) || 1));
      worst = Math.abs(Math.abs(got) - want) * Math.abs(b[0] - a[0]);
    }
  }
  rows.push({
    id: 'the owner\'s scene',
    cells: [leaf?.meta?.slopeCut ? 'leaf cut' : 'NOT CUT',
      worst == null ? 'NO EDGE' : `parallel to ${worst.toFixed(4)} mm`],
    ok: Boolean(leaf?.meta?.slopeCut) && worst != null && worst <= 0.1,
  });
  return {
    head: 'F2 · THE PICTURE — the engine is clean by number; the fix is the scene\'s (rig frames)',
    columns: ['leaves', 'cut (meta)'],
    rows,
    verdict: [
      'CLEAN — no golden leaf is cut, and the owner\'s leaf runs parallel to its ceiling.',
      'NOT CLEAN — a golden leaf grew a cut, or the leaf lost its line. STOP (iron rule).',
    ],
  };
};

/**
 * F3 — THE DOOR PARTITION. Forced in the STORE on the slope-flip transition;
 * the engine on a bare golden sees no forced leaf and no VPART.
 */
PROBES.f3 = () => {
  const rows = goldens().map(({ cfg, result }) => ({
    id: cfg.id,
    cells: [String((result.panels || []).filter((p) => p.meta?.hingeForced).length),
      String((result.panels || []).filter((p) => p.part === 'VPART').length)],
    ok: (result.panels || []).every((p) => !p.meta?.hingeForced && p.part !== 'VPART'),
  }));
  const store = readFileSync(new URL('../src/stores/projectStore.js', import.meta.url), 'utf8');
  rows.push({
    id: 'the sweep',
    cells: [/settleSlopeDoorPartitions/.test(store) ? 'store-side, transition-gated' : 'MISSING',
      /no slope, no forcing/.test(store) ? 'width never triggers' : 'UNSAID'],
    ok: /settleSlopeDoorPartitions/.test(store) && /no slope, no forcing/.test(store),
  });
  return {
    head: 'F3 · THE DOOR PARTITION — a store transition; no golden carries a forced leaf',
    columns: ['forced leaves', 'VPARTs'],
    rows,
    verdict: [
      'CLEAN — no golden leaf is forced, no golden carries a partition, and the sweep lives in the store behind its transition gate.',
      'NOT CLEAN — forcing reached a golden. STOP (iron rule).',
    ],
  };
};

/**
 * F4 — THE GLASS ACCEPTS THE PARTITION. One predicate, two callers; no
 * golden carries a watch item.
 */
PROBES.f4 = async () => {
  const { isShelfBoard, watchDrawerFixedHeight } = await import('../src/engine/watchDrawer.js');
  const rows = goldens().map(({ cfg, params, result }) => {
    const items = (params.sections || []).flatMap((s) => s?.items || []);
    return {
      id: cfg.id,
      cells: [String(items.filter((i) => i?.watch_insert === true).length),
        String((result.panels || []).filter((p) => p.role === 'watch_insert').length)],
      ok: items.every((i) => i?.watch_insert !== true)
        && (result.panels || []).every((p) => p.role !== 'watch_insert'),
    };
  });
  const H = watchDrawerFixedHeight(P);
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    width: 900,
    sections: [{
      width_mm: 900,
      items: [
        { id: 'd1', kind: 'drawer', index: 1, height_mm: 200 },
        {
          id: 'd2', kind: 'drawer', index: 2, height_mm: H, watch_insert: true, watch_shelf_glass: true,
        },
      ],
    }],
  }, P);
  const pane = (r.assemblies.watchGlass || [])[0];
  const board = pane && (r.panels || []).find((p) => p.id === pane.shelfId);
  rows.push({
    id: 'the asked-for pane',
    cells: [board ? `cut in ${board.part}` : 'REFUSED',
      (r.warnings || []).some((w) => w.code === 'watch_glass_needs_shelf') ? 'STILL WARNS' : 'no refusal'],
    ok: Boolean(board) && board.part === 'PARTITION' && isShelfBoard(board)
      && !(r.warnings || []).some((w) => w.code === 'watch_glass_needs_shelf'),
  });
  return {
    head: 'F4 · THE GLASS — isShelfBoard lets the forced PARTITION serve; no golden asks',
    columns: ['asking items', 'watch parts'],
    rows,
    verdict: [
      'CLEAN — no golden carries a watch item, and the forced partition takes the pane without a refusal.',
      'NOT CLEAN — a watch part reached a golden, or the partition still refuses. STOP (iron rule).',
    ],
  };
};

/**
 * F5 — THE FINISH. Two choices survive; no golden carries `watch_finish`.
 */
PROBES.f5 = async () => {
  const { WATCH_FINISHES } = await import('../src/engine/watchDrawer.js');
  const rows = goldens().map(({ cfg, params }) => {
    const items = (params.sections || []).flatMap((s) => s?.items || []);
    return {
      id: cfg.id,
      cells: [items.some((i) => i?.watch_finish) ? 'LEAKED' : '(none)'],
      ok: items.every((i) => !i?.watch_finish),
    };
  });
  const src = readFileSync(new URL('../src/engine/watchDrawer.js', import.meta.url), 'utf8');
  rows.push({
    id: 'the graves',
    cells: [WATCH_FINISHES.map((f) => f.id).join(',') === 'spray'
      ? 'spray alone beside Project' : 'OAK/WALNUT BREATHE'],
    ok: WATCH_FINISHES.length === 1 && WATCH_FINISHES[0].id === 'spray'
      && !/'oak'|'walnut'/.test(src),
  });
  const materials = readFileSync(new URL('../src/engine/materials.js', import.meta.url), 'utf8');
  rows.push({
    id: 'the wiring',
    cells: [/watch_finish === 'spray'/.test(materials)
      ? 'one resolution serves 3-D, BOM, sheet' : 'NOT WIRED'],
    ok: /watch_finish === 'spray'/.test(materials),
  });
  return {
    head: 'F5 · THE FINISH — oak and walnut deleted, Sprayed wired through the one resolution',
    columns: ['watch_finish key'],
    rows,
    verdict: [
      'CLEAN — no golden carries the key, the graves are graves, and the survivor reaches the picture and the bill through resolvePanelMaterial.',
      'NOT CLEAN — a finish leaked into a golden or survived deletion. STOP (iron rule).',
    ],
  };
};

/**
 * F6 — THE GRAIN. Insert parts born `grain: 'h'`, drawn standing; no golden
 * carries an insert.
 */
PROBES.f6 = async () => {
  const { watchDrawerFixedHeight } = await import('../src/engine/watchDrawer.js');
  const rows = goldens().map(({ cfg, result }) => ({
    id: cfg.id,
    cells: [String((result.panels || []).filter((p) => p.role === 'watch_insert').length)],
    ok: (result.panels || []).every((p) => p.role !== 'watch_insert'),
  }));
  const H = watchDrawerFixedHeight(P);
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    width: 900,
    sections: [{
      width_mm: 900,
      items: [{ id: 'd1', kind: 'drawer', index: 1, height_mm: H, watch_insert: true }],
    }],
  }, P);
  const parts = (r.panels || []).filter((p) => p.role === 'watch_insert');
  rows.push({
    id: 'the insert',
    cells: [`${parts.length} boards`,
      parts.every((p) => p.cnc?.grain === 'h') ? "every one grain 'h'" : 'A BOARD FORGOT'],
    ok: parts.length >= 8 && parts.every((p) => p.cnc?.grain === 'h' && p.cnc?.rotated === true),
  });
  return {
    head: "F6 · THE GRAIN — born 'h', drawn standing; no golden carries an insert",
    columns: ['watch parts'],
    rows,
    verdict: [
      'CLEAN — the goldens carry no insert, and every insert board is born with its grain stated.',
      'NOT CLEAN — an insert reached a golden, or a board carries no grain. STOP (iron rule).',
    ],
  };
};

/**
 * F7 — THE LED. Strips are UI-side; the engine's only new word is
 * `result.params.slope_cut`, echoed ONLY where a cut is active — never on a
 * golden.
 */
PROBES.f7 = async () => {
  const { stripsForUnit } = await import('../src/engine/ledStrips.js');
  const rows = goldens().map(({ cfg, result }) => ({
    id: cfg.id,
    cells: [result.params.slope_cut == null ? '(none)' : 'LEAKED'],
    ok: result.params.slope_cut == null,
  }));
  const W = 1000;
  const H = 2200;
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    width: W,
    height: H,
    slope_cut: { infill: 40, pts: [{ x: 0, y: 1300 }, { x: 520, y: 2200 }, { x: W, y: 2200 }] },
  }, P);
  const unit = {
    id: 'u1', type: 'WARDROBE', params: { width: W, height: H, depth: 600, board_t: P.board.thickness },
  };
  const design = (kind, ref) => ({
    projectType: 'wardrobe',
    lighting: { enabled: true, items: [{ id: 'led1', unitId: 'u1', kind, ...(ref ? { ref } : {}) }] },
  });
  const top = stripsForUnit({
    unit, result: r, design: design('top'), profile: P,
  });
  const side = stripsForUnit({
    unit, result: r, design: design('side', 'L'), profile: P,
  })[0];
  const G = P.board.thickness;
  rows.push({
    id: 'the raked wardrobe',
    cells: [top.length === 1 && top[0].box.x > 400 ? 'level run only' : 'A STRIP ON THE DIAGONAL',
      side && side.box.h < H - 2 * G - 100 ? 'side ends at the roof' : 'SIDE STANDS PROUD'],
    ok: top.length === 1 && top[0].box.x > 400 && side && side.box.h < H - 2 * G - 100,
  });
  return {
    head: 'F7 · THE LED — level runs only; the cut-line echo never reaches a flat unit',
    columns: ['params.slope_cut'],
    rows,
    verdict: [
      'CLEAN — no golden carries the echo, no strip rides the diagonal, and the side strip stops at the roof.',
      'NOT CLEAN — the echo leaked into a golden, or a strip stands proud of the rake. STOP (iron rule).',
    ],
  };
};

/**
 * F8 — THE SELECT. UI conduct plus the standing drilling law, asserted: cup
 * side == meta.hinge under a slope; a golden's drilling is the flat law.
 */
PROBES.f8 = () => {
  const rows = goldens().map(({ cfg, result }) => ({
    id: cfg.id,
    cells: [String((result.panels || []).filter((p) => p.meta?.hingeForced).length)],
    ok: (result.panels || []).every((p) => !p.meta?.hingeForced),
  }));
  const src = readFileSync(new URL('../src/components/RightPanel.jsx', import.meta.url), 'utf8');
  rows.push({
    id: 'the select',
    cells: [/data-unit-hinge-forced=/.test(src) ? 'forced hand shown, greyed, reasoned' : 'STILL LYING'],
    ok: /data-unit-hinge-forced=/.test(src)
      && /Cut on the slope — the door opens from the slope\./.test(src)
      && /this governs the free leaves only/.test(src),
  });
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    width: 1000,
    height: 2200,
    door_count: 2,
    slope_cut: { infill: 40, pts: [{ x: 0, y: 1300 }, { x: 520, y: 2200 }, { x: 1000, y: 2200 }] },
  }, P);
  const leaves = (r.panels || []).filter((p) => p.part === 'FRONT' && p.role === 'front');
  const honest = leaves.every((leaf) => (r.drills || [])
    .filter((d) => d.panel === leaf.id && d.kind === 'cup')
    .every((cup) => ((leaf.w - cup.x > leaf.w / 2) ? 'R' : 'L') === leaf.meta.hinge));
  rows.push({
    id: 'the drilling',
    cells: [honest ? 'cup side == meta.hinge, every leaf' : 'A CUP DISAGREES'],
    ok: leaves.length === 2 && honest,
  });
  return {
    head: 'F8 · THE SELECT — the panel reads the engine\'s hand; the drilling already did',
    columns: ['forced leaves'],
    rows,
    verdict: [
      'CLEAN — no golden is forced, the select shows the engine\'s hand, and every cup sits on the meta.hinge edge.',
      'NOT CLEAN — the select still lies, or a cup disagrees with the meta. STOP (iron rule).',
    ],
  };
};

// ─── THE COMPARISON ─────────────────────────────────────────────────────────

/** Compare two dumps, config by config. */
export function classify(base, head) {
  const rows = [];
  const counts = { IDENTICAL: 0, UNNAMED: 0 };
  for (const cfg of STANDARD_CONFIGS) {
    const b = base[cfg.id];
    const h = head[cfg.id];
    const same = b?.sha256 && b.sha256 === h?.sha256;
    if (same) counts.IDENTICAL += 1;
    else counts.UNNAMED += 1;
    rows.push(`${cfg.id.padEnd(12)}${same ? 'IDENTICAL' : 'UNNAMED  '}  ${h?.sha256 || h?.error || '(missing)'}`);
  }
  return { rows, counts };
}

async function runProbe(name) {
  const probe = await PROBES[name]();
  const clean = probe.rows.every((r) => r.ok !== false);
  const width = Math.max(16, ...probe.rows.map((r) => r.id.length + 2));
  let out = `${probe.head}\n\n${'subject'.padEnd(width)}`;
  const colW = probe.columns.map((c) => Math.max(c.length + 2, 12));
  probe.columns.forEach((c, i) => { out += c.padEnd(colW[i]); });
  out += '\n';
  for (const r of probe.rows) {
    out += r.id.padEnd(width);
    r.cells.forEach((c, i) => { out += String(c).padEnd(colW[i] || 12); });
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
      const { out, clean } = await runProbe(name);
      process.stdout.write(`${out}\n`);
      if (!clean) bad += 1;
    }
    if (names.length > 1) {
      process.stdout.write(`${'─'.repeat(72)}\n${names.length} probe(s), ${bad === 0
        ? 'every one CLEAN — no feature of tonight reaches a golden.'
        : `${bad} NOT CLEAN. Iron rule: write it up as a FINDING.`}\n`);
    }
    process.exit(bad === 0 ? 0 : 1);
  } else if (argv.length >= 2) {
    const base = JSON.parse(readFileSync(argv[0], 'utf8'));
    const head = JSON.parse(readFileSync(argv[1], 'utf8'));
    const { rows, counts } = classify(base, head);
    process.stdout.write(`${rows.join('\n')}\n\n`);
    process.stdout.write('EXPECTED BUCKETS: none. F1/F2/F7/F8 act only under a `slope_cut` (no golden carries one); F3 is a store transition; F4/F5/F6 act only on watch items (no golden carries one). The NAMED slope deltas are listed in this file\'s header; `--probe` argues each feature as an exit code.\n');
    process.stdout.write('IF A GOLDEN MOVED:  iron rule — write it up as a FINDING. Do not name a bucket for it.\n');
    process.stdout.write(`UNNAMED:          ${counts.UNNAMED}\n`);
    process.exit(counts.UNNAMED === 0 ? 0 : 1);
  } else {
    const d = dump();
    for (const cfg of STANDARD_CONFIGS) {
      process.stdout.write(`${cfg.id.padEnd(12)} drawers=${cfg.drawers ? 'yes' : 'no '}  ${d[cfg.id].sha256 || d[cfg.id].error}\n`);
    }
    process.stdout.write(`\n${kitCount()} kits on the shelf.\n`);
  }
}
