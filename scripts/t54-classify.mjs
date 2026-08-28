#!/usr/bin/env node
// ─── THE BYTE-IDENTITY CONTRACT (turn 54, CLAUDE.md iron rule 2) ────────────
//
// T53's classifier, RE-HEADED rather than reused, because the header IS the
// argument and the argument is tonight's. CLAUDE.md, 28.08:
//
//   *"Six goldens IDENTICAL, UNNAMED = 0, three-line proof … Expected buckets:
//   none."*
//
// Seven features (F8 is FROZEN for T55 and has no probe because it has no
// code), and the claim is made feature by feature. Every one has a `--probe`,
// exit codes and all — an argument that is only prose is an argument nobody
// re-runs.
//
// ─── WHY NOT ONE OF THE SEVEN CAN MOVE A GOLDEN ─────────────────────────────
//
//   F1   the trio cuts only under a `slope_cut`, and no golden carries one.
//        `--probe f1` — and it prints the WORST RESIDUAL of the trio's own
//        three-station law, which is the number `audit/f1.txt` keeps.
//   F2   the peak census — the same gate. `--probe f2` names every panel in
//        the peak band and refuses any that is not on the allowed list.
//   F3   the door leaf cuts only under a `slope_cut`; no golden carries one
//        and no golden's leaf carries a cut. `--probe f3`.
//   F4   changes a watch-insert derivation (60 → 40 inside, 140 → 120 front)
//        and the click wiring. No golden carries an insert; the wiring is UI
//        and cannot reach `computeCabinet`. `--probe f4` proves 120 fits and
//        119 refuses.
//   F5   is UI visibility plus a per-project scene-light multiplier that the
//        EXPORT RIG never reads. `--probe f5`.
//   F6   is a UI timer flipping an existing uiStore toggle. `--probe f6`.
//   F7   cuts only where a shoe item exists, and no golden carries one.
//        `--probe f7` — the shoe drawer equals a plain drawer board for board
//        except the side height.
//
// If a golden moves anyway: iron rule 2 — **write it up as a FINDING. Do not
// name a bucket for it.**
//
// Usage — the three lines every classifier in this house has taken:
//
//     node scripts/t53-classify.mjs --dump > /tmp/base.json     # on the base
//     node scripts/t54-classify.mjs --dump > /tmp/head.json     # on the branch
//     node scripts/t54-classify.mjs /tmp/base.json /tmp/head.json
//
//     node scripts/t54-classify.mjs --probe        # all seven, one exit code
//     node scripts/t54-classify.mjs --probe f1     # one of them
//
// The KIT COUNT is DERIVED from the folder, never typed (iron rule 3): the
// shelf starts tonight at 14 and F7 buries KIT_SHOE_BOX, so the walk ends at
// 13 — derived, never typed.
//
// Zero dependencies beyond the engine and node:crypto.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

// `--dump` has to run on the BASE as well as on the branch — that is the whole
// comparison — so anything this turn INTRODUCED is imported lazily inside the
// probe that needs it. A static import of tonight's own module would turn "the
// goldens did not move" into a syntax error on the base.

// The six standard configs are T34's through T53's, unchanged — the same set,
// so a T53 dump and a T54 dump are directly comparable.
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

/** Every kit on the shelf — DERIVED, never typed (iron rule 3). */
export function kitCount(dir = 'reference/lisp') {
  return readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.lsp')).length;
}

const round = (v, n = 3) => Math.round(v * 10 ** n) / 10 ** n;

/** Every golden, computed once — the probes share it rather than re-deriving. */
function goldens() {
  return STANDARD_CONFIGS.map((cfg) => {
    const params = { ...defaultParamsFor(cfg.id, P), unit_num: '01' };
    return { cfg, params, result: computeCabinet(params, P) };
  });
}

// The rotation the scene applies — T(pivot)·Rz(deg)·T(−pivot) — restated here
// so a probe measures what the ROOM shows, not what the meta promises.
const spin = ([x, y], pivot, deg) => {
  const a = (deg * Math.PI) / 180;
  const dx = x - pivot.x;
  const dy = y - pivot.y;
  return [pivot.x + dx * Math.cos(a) - dy * Math.sin(a),
    pivot.y + dx * Math.sin(a) + dy * Math.cos(a)];
};
const spunCorners = (p) => {
  const b = p.box;
  const corners = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]];
  if (!p.meta?.tilt_deg || !p.meta?.tilt_pivot) return corners;
  return corners.map((c) => spin(c, p.meta.tilt_pivot, p.meta.tilt_deg));
};
const edgeAt = (a, b) => (x) => a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);

// ─── THE PROBES ─────────────────────────────────────────────────────────────

export const PROBES = {};

/**
 * F1 — THE TRIO. Everything tonight cuts is gated on a `slope_cut`, and no
 * golden carries one. Then the owner's audit scene is rebuilt and the trio's
 * own law measured: FACE top on the ceiling, FACE bottom and TOP top on the
 * cut line, SHELF top on the roof's underside — worst residual printed, which
 * is the number `verify/t54/audit/f1.txt` keeps.
 */
PROBES.f1 = () => {
  const rows = goldens().map(({ cfg, params, result }) => {
    const cut = params.slope_cut ?? params.slopeCut ?? null;
    const tilted = (result.panels || []).filter((p) => p.meta?.tilt_axis === 'z').length;
    const sloped = (result.panels || []).filter((p) => p.meta?.slopeCut).length;
    return {
      id: cfg.id,
      cells: [cut == null ? '(none)' : 'YES', String(sloped), String(tilted)],
      ok: cut == null && sloped === 0 && tilted === 0,
    };
  });
  // The audit scene: spadek w prawo, β = 26.5651°, infill 40, W = 600,
  // ceiling 2000 → 1700 — the exact table the owner measured, now the law.
  const W = 600;
  const INFILL = 40;
  const asked = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    top_infill_mm: 40,
    slope_cut: { axis: 'width', infill: INFILL, low: 'R', pts: [{ x: 0, y: 2000 }, { x: W, y: 1700 }] },
  }, P);
  const by = (id) => (asked.panels || []).find((p) => p.id === id);
  const ceil = (x) => 2000 - (300 * x) / W;
  const res = INFILL / Math.cos(Math.atan(300 / W));
  const G = P.board.thickness;
  const foot = G / Math.cos(Math.atan(300 / W));
  let worst = 0;
  const face = by('INFILL-T-FACE');
  const top = by('TOP');
  const shelf = by('INFILL-T-SHELF');
  if (face && top && shelf) {
    const f = spunCorners(face);
    const t = spunCorners(top);
    const s = spunCorners(shelf);
    for (const x of [0, W / 2, W]) {
      worst = Math.max(worst,
        Math.abs(edgeAt(f[3], f[2])(x) - ceil(x)),
        Math.abs(edgeAt(f[0], f[1])(x) - (ceil(x) - res)),
        Math.abs(edgeAt(t[3], t[2])(x) - (ceil(x) - res)),
        Math.abs(edgeAt(s[3], s[2])(x) - (ceil(x) - res - foot)));
    }
  }
  rows.push({
    id: 'the audit scene',
    cells: ['YES', face && top && shelf ? 'trio emitted' : 'MISSING',
      `worst residual ${worst.toFixed(4)} mm`],
    ok: Boolean(face && top && shelf) && worst <= 0.01,
  });
  return {
    head: 'F1 · THE TRIO — three pieces, three lines, gated on a slope_cut no golden carries',
    columns: ['slope_cut', 'cut panels', 'tilted panels'],
    rows,
    note: 'The residual is the trio law measured through the scene\'s own rotation: FACE top → ceiling, FACE bottom and TOP top → cutReach, SHELF top → the roof\'s underside.',
    verdict: [
      'CLEAN — not one of the six is under a rake, and the audit scene lands the trio on its three lines to a hundredth.',
      'NOT CLEAN — a golden grew a tilt, or the trio missed its lines. STOP (iron rule 2).',
    ],
  };
};

/**
 * F2 — THE PEAK CENSUS. The same slope gate as F1, measured at the peak: the
 * band [cutReach − 120, ceilReach] over the peak-side G may hold exactly the
 * allowed census, and no roof board may be narrower than its own thickness.
 */
PROBES.f2 = () => {
  const rows = goldens().map(({ cfg, params, result }) => ({
    id: cfg.id,
    cells: [params.slope_cut == null ? '(none)' : 'YES',
      String((result.panels || []).filter((p) => p.part === 'TOP').length),
      String((result.panels || []).filter((p) => p.meta?.slopeCut).length)],
    ok: params.slope_cut == null
      && (result.panels || []).every((p) => !p.meta?.slopeCut),
  }));
  const G = P.board.thickness;
  const H = defaultParamsFor('WARDROBE', P).height;
  const W = 600;
  for (const [name, pts, peak] of [
    ['peak RIGHT', [{ x: 0, y: H - 636 }, { x: W, y: H - 636 + 710 }], 'R'],
    ['peak LEFT', [{ x: 0, y: H - 636 + 710 }, { x: W, y: H - 636 }], 'L'],
  ]) {
    const r = computeCabinet({
      ...defaultParamsFor('WARDROBE', P),
      unit_num: 'W01',
      top_infill_mm: 40,
      slope_cut: { axis: 'width', infill: 40, low: peak === 'R' ? 'L' : 'R', pts },
    }, P);
    const tops = (r.panels || []).filter((p) => p.part === 'TOP');
    const stub = tops.find((t) => (t.meta?.slopeCut?.span ?? t.box.w) <= G + 1e-6);
    const raked = tops.find((t) => (t.meta?.slopeCut?.deg ?? 0) > 1);
    const reaches = raked
      && (peak === 'R' ? raked.meta.slopeCut.to === W : raked.meta.slopeCut.from === 0);
    const side = (r.panels || []).find((p) => p.id === (peak === 'R' ? 'BUR' : 'BUL'));
    const bevel = side?.meta?.slopeCut?.bevel3d;
    rows.push({
      id: name,
      cells: [stub ? `STUB ${stub.id}` : 'no stub',
        reaches ? 'roof to the outer face' : 'ROOF SHORT',
        bevel && Math.abs(bevel.a - bevel.b) > 1 ? 'side bevelled' : 'SIDE SQUARE'],
      ok: !stub && Boolean(reaches) && Boolean(bevel) && Math.abs(bevel.a - bevel.b) > 1,
    });
  }
  return {
    head: 'F2 · THE PEAK — no third piece, the rake runs to the outer face, the side is bevelled',
    columns: ['slope_cut', 'TOP boards', 'cut panels'],
    rows,
    verdict: [
      'CLEAN — no golden stands under a rake, and at both peaks the stub is dead, the roof reaches the outer face and the side is cut like BUL.',
      'NOT CLEAN — a kawałek survives at a peak, or a golden moved. STOP (iron rule 2).',
    ],
  };
};

/**
 * F3 — THE DOOR LEAF. The same gate: no golden's leaf carries a cut; a leaf
 * under a rake is cut with every vertex under its line; a leaf under a flat
 * stretch is byte-identical.
 */
PROBES.f3 = () => {
  const rows = goldens().map(({ cfg, result }) => {
    const leaves = (result.panels || []).filter((p) => p.role === 'front');
    return {
      id: cfg.id,
      cells: [String(leaves.length),
        String(leaves.filter((p) => p.meta?.slopeCut).length),
        String(leaves.filter((p) => p.cnc?.slopeCut).length)],
      ok: leaves.every((p) => !p.meta?.slopeCut && !p.cnc?.slopeCut),
    };
  });
  const PARAMS = { ...defaultParamsFor('WARDROBE', P), unit_num: 'W01' };
  const W = PARAMS.width;
  const cut = { infill: 40, pts: [{ x: 0, y: 2000 }, { x: W, y: 1400 }] };
  const r = computeCabinet({ ...PARAMS, slope_cut: cut }, P);
  const leaf = (r.panels || []).find((p) => p.id === 'W01-F');
  const beta = Math.atan(600 / W);
  const line = (x) => 2000 - x - 40 / Math.cos(beta) - Number(P.doors.gap);
  let worst = 0;
  if (leaf?.cnc?.outline) {
    for (const [sx, sy] of leaf.cnc.outline) {
      const x = leaf.box.x + leaf.w - sx;
      worst = Math.max(worst, sy - line(x));
    }
  }
  const flatA = computeCabinet({ ...PARAMS }, P).panels.find((p) => p.id === 'W01-F');
  const flatB = computeCabinet({
    ...PARAMS,
    slope_cut: { infill: 40, pts: [{ x: 0, y: 2800 }, { x: W, y: 2650 }] },
  }, P).panels.find((p) => p.id === 'W01-F');
  rows.push({
    id: 'asked for one',
    cells: [leaf?.meta?.slopeCut ? 'cut' : 'NOT CUT',
      `worst overhang ${worst.toFixed(4)} mm`,
      canonical(flatA) === canonical(flatB) ? 'flat leaf byte-identical' : 'FLAT LEAF MOVED'],
    ok: Boolean(leaf?.meta?.slopeCut) && worst <= 0.01 && canonical(flatA) === canonical(flatB),
  });
  return {
    head: 'F3 · THE DOOR LEAF — cut only under a slope_cut, and no golden carries one',
    columns: ['leaves', 'cut (meta)', 'cut (sheet)'],
    rows,
    verdict: [
      'CLEAN — no golden leaf is cut; a leaf under the rake keeps every vertex under its line; a leaf under a flat stretch does not move by a byte.',
      'NOT CLEAN — a golden leaf grew a cut, or a vertex stands above the line. STOP (iron rule 2).',
    ],
  };
};

/**
 * F4 — THE WATCH DRAWER. No golden carries an insert; the derivation answers
 * 120 and refuses 119. The click wiring is UI and cannot reach a golden.
 */
PROBES.f4 = async () => {
  const { watchDrawerFit, watchDrawerFixedHeight } = await import('../src/engine/watchDrawer.js');
  const rows = goldens().map(({ cfg, params, result }) => {
    const items = (params.sections || []).flatMap((s) => s?.items || []);
    return {
      id: cfg.id,
      cells: [String(items.filter((i) => i?.watch_insert === true).length),
        String((result.panels || []).filter((p) => p.role === 'watch_insert').length),
        result.assemblies?.watchInserts == null ? '(none)' : 'YES'],
      ok: items.every((i) => i?.watch_insert !== true)
        && (result.panels || []).every((p) => p.role !== 'watch_insert')
        && result.assemblies?.watchInserts == null,
    };
  });
  const H = watchDrawerFixedHeight(P);
  const clearOf = (front) => front - P.baseDrawerUnit.runnerPocketWidth
    - P.board.thickness - P.wardrobe.drawers.frontToSideDelta;
  const fits = watchDrawerFit({ width: 500, height: clearOf(120), depth: 450 }, P).ok;
  const refuses = !watchDrawerFit({ width: 500, height: clearOf(119), depth: 450 }, P).ok;
  rows.push({
    id: 'the derivation',
    cells: [`derives ${H}`, fits ? '120 fits' : '120 REFUSED', refuses ? '119 refuses' : '119 FITS'],
    ok: H === 120 && fits && refuses,
  });
  return {
    head: 'F4 · THE WATCH DRAWER — 40 + 9 + 2 + 15 + 18 + 36 = 120, and no golden asks',
    columns: ['asking items', 'watch parts', 'assembly key'],
    rows,
    note: 'The click wiring (scene + menu) is UI: it opens a modal and cannot reach computeCabinet.',
    verdict: [
      'CLEAN — not one of the six carries an insert, the derivation answers 120, and 119 refuses.',
      'NOT CLEAN — an insert reached a golden, or the derivation drifted. STOP (iron rule 2).',
    ],
  };
};

/**
 * F5 — THE LED ICONS + SCENE LIGHT. Pure UI plus a per-project multiplier the
 * EXPORT RIG never reads — proven off the sources, the way T53's f10 proved
 * the drawing module reaches no engine.
 */
PROBES.f5 = () => {
  const rows = goldens().map(({ cfg, params }) => ({
    id: cfg.id,
    cells: [params.sceneLight == null ? '(none)' : 'LEAKED',
      params.lighting == null ? '(none)' : 'LEAKED'],
    ok: params.sceneLight == null && params.lighting == null,
  }));
  const scene = readFileSync(new URL('../src/3d/Scene.jsx', import.meta.url), 'utf8');
  const icons = readFileSync(new URL('../src/3d/LedIcons.jsx', import.meta.url), 'utf8');
  const stamps = [...scene.matchAll(/ccExportIntensity:[^,}]*/g)].map((m) => m[0]);
  rows.push({
    id: 'the export rig',
    cells: [`${stamps.length} stamps`,
      stamps.every((s) => !/sceneScale|sceneLight/.test(s)) ? 'none reads the slider' : 'A STAMP LEAKS'],
    ok: stamps.length >= 6 && stamps.every((s) => !/sceneScale|sceneLight/.test(s)),
  });
  rows.push({
    id: 'the icons',
    cells: [/s\.modal === 'lighting'/.test(icons) ? 'gated on the panel' : 'UNGATED',
      /ccHelper/.test(icons) ? 'helper — no render sees it' : 'IN THE RENDER'],
    ok: /s\.modal === 'lighting'/.test(icons) && /ccHelper/.test(icons),
  });
  return {
    head: 'F5 · LED ICONS + SCENE LIGHT — UI, and the export rig never hears of it',
    columns: ['sceneLight key', 'lighting key'],
    rows,
    verdict: [
      'CLEAN — no golden carries a lighting key, no export stamp reads the slider, and the icons live behind the panel gate as helpers.',
      'NOT CLEAN — the slider leaks into an export stamp, or a golden moved. STOP (iron rule 2).',
    ],
  };
};

/**
 * F6 — THE DIMENSION TIMER. A UI clock flipping an existing uiStore toggle;
 * the engine never hears of it.
 */
PROBES.f6 = async () => {
  const { createDimensionSleep, dimensionsIdleMs } = await import('../src/lib/dimensionSleep.js');
  const rows = goldens().map(({ cfg, params }) => ({
    id: cfg.id,
    cells: ['no engine key', '—'],
    ok: !('dimensions_idle_ms' in params),
  }));
  const lib = readFileSync(new URL('../src/lib/dimensionSleep.js', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/pages/ConfiguratorPage.jsx', import.meta.url), 'utf8');
  let fired = 0;
  const sleep = createDimensionSleep({ idleMs: 1, hide: () => { fired += 1; } });
  sleep.touch();
  sleep.cancel();
  rows.push({
    id: 'the clock',
    cells: [`${dimensionsIdleMs(P)} ms`,
      /return \{ touch, cancel, armed/.test(lib) && fired === 0 ? 'cancellable, never fires early' : 'BROKEN'],
    ok: dimensionsIdleMs(P) === 30000 && fired === 0
      && !/from '\.\.\/engine\//.test(lib)
      && /setShowDimensions\(false\)/.test(page)
      && !/setShowDimensions\(true\)/.test(page.slice(page.indexOf('DIMENSIONS GO TO SLEEP'), page.indexOf('captureRef'))),
  });
  return {
    head: 'F6 · THE DIMENSION TIMER — 30 000 ms of quiet flips the existing toggle, off only',
    columns: ['idle ms', 'the clock'],
    rows,
    note: 'lib/dimensionSleep.js imports nothing from the engine; the timer never turns dimensions ON.',
    verdict: [
      'CLEAN — the profile says 30 000, the clock cancels clean, and the only write is the hide.',
      'NOT CLEAN — the timer reaches the engine or can turn dimensions on. STOP (iron rule 2).',
    ],
  };
};

/**
 * F7 — THE SHOE DRAWER. No golden carries a shoe item; a shoe drawer IS a
 * plain drawer of the same numbers, board for board, and the old world is
 * dead (the kit count is 13, derived).
 */
PROBES.f7 = () => {
  const rows = goldens().map(({ cfg, params, result }) => {
    const items = (params.sections || []).flatMap((s) => s?.items || []);
    return {
      id: cfg.id,
      cells: [String(items.filter((i) => i?.kind === 'shoe_box' || i?.variant === 'shoe').length),
        String((result.panels || []).filter((p) => /SHOEBOX|BATTEN/.test(p.id)).length)],
      ok: items.every((i) => i?.kind !== 'shoe_box' && i?.variant !== 'shoe')
        && (result.panels || []).every((p) => !/SHOEBOX|BATTEN/.test(p.id)),
    };
  });
  const DR = P.wardrobe.drawers;
  const front = (Number(DR.shoeSideMm) || 80) + (Number(DR.frontToSideDelta) || 36);
  const build = (variant) => computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    width: 900,
    sections: [{
      width_mm: 900,
      items: [{
        id: 'd1', kind: 'drawer', index: 1, height_mm: front, ...(variant ? { variant } : {}),
      }],
    }],
  }, P);
  const boards = (r) => (r.panels || [])
    .filter((p) => p.role === 'drawer_box' || p.part === 'DRAWER-FRONT')
    .map((p) => ({ ...p, meta: { ...p.meta, variant: undefined } }));
  const plain = build(null);
  const shoe = build('shoe');
  const equal = canonical(boards(plain)) === canonical(boards(shoe))
    && canonical(plain.drills) === canonical(shoe.drills);
  const side = boards(shoe).find((p) => p.part === 'DRAWER-SIDE');
  rows.push({
    id: 'the proof',
    cells: [equal ? 'board for board, the same cut' : 'THE WORLDS DIVERGE',
      `side ${side?.h} (law ${DR.shoeSideMm})`],
    ok: equal && side?.h === DR.shoeSideMm,
  });
  rows.push({
    id: 'the graves',
    cells: [`${kitCount()} kits (derived)`, kitCount() === 13 ? 'KIT_SHOE_BOX buried' : 'STILL BREATHING'],
    ok: kitCount() === 13,
  });
  return {
    head: 'F7 · THE SHOE DRAWER — a standard drawer with an 80 side, and no golden carries one',
    columns: ['shoe items', 'old-world boards'],
    rows,
    verdict: [
      'CLEAN — no golden carries a shoe, the shoe drawer equals the plain drawer board for board, and the old world is buried (13 kits, derived).',
      'NOT CLEAN — a golden grew a shoe part, or the two worlds diverge. STOP (iron rule 2).',
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
    r.cells.forEach((c, i) => { out += String(c).padEnd(colW[i]); });
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
        : `${bad} NOT CLEAN. Iron rule 2: write it up as a FINDING.`}\n`);
    }
    process.exit(bad === 0 ? 0 : 1);
  } else if (argv.length >= 2) {
    const base = JSON.parse(readFileSync(argv[0], 'utf8'));
    const head = JSON.parse(readFileSync(argv[1], 'utf8'));
    const { rows, counts } = classify(base, head);
    process.stdout.write(`${rows.join('\n')}\n\n`);
    process.stdout.write('EXPECTED BUCKETS: none. F1, F2, F3 cut only under `slope_cut` (no golden carries one); F4 changes a watch-insert derivation and the click wiring (no golden carries an insert); F5 and F6 are UI visibility/timers; F7 cuts only where a shoe item exists (no golden carries one). `--probe` argues each one as an exit code.\n');
    process.stdout.write('IF A GOLDEN MOVED:  iron rule 2 — write it up as a FINDING. Do not name a bucket for it.\n');
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
