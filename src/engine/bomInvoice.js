// ─── TURN 32 (CLAUDE.md F5): THE BOM THE WORKSHOP CAN INVOICE FROM ──────────
//
// The owner's words: wardrobes go first "including BOM — that is where we
// learn what BOM needs, and the kitchen inherits the fixes." Two blocks, one
// export:
//
//   MATERIALS, per decor — m² net → +waste % → "~N sheets of 2800×2070" (a
//   DIVISION with a label, never a cutting plan; nesting is parked) → edging
//   metres per decor and thickness. FRONTS listed SEPARATELY from carcasses:
//   often another decor, often another supplier.
//
//   IRONMONGERY, counted with ARTICLES — the F2 automat picks the hinge row,
//   the runner pairs carry the article the snap already chose, the rail is
//   bought by the METRE with its supports, the plinth clips and their
//   connectors follow the FRONT legs only, and the screws are counted off
//   the drilling — the numbers were always there, unread. Anything the
//   registry (F6) does not know prints as a YELLOW named spec line: never
//   invented, never silently dropped (rule 3).
//
// Pure functions — no React, no store. The registry arrives as an injectable
// `lookup`, exactly as the automat takes it, so mock mode answers null and
// the yellow lines do the honest talking.

import { roundTo } from './format.js';
import { DEFAULT_CABINET_PROFILE } from './profile.js';
import { hingeAutomat, plateFamily } from './hinges.js';
import { frontLegCount } from './legs.js';
import { hardwareVariant, projectFrontThickness } from './projectSettings.js';
// UX turn B6: the Order tab counts sheets with the purchase list's own law
// (function-level reads only: the import cycle with bom.js is safe).
import { LINK_WORDS, sheetCount, sheetYieldOf } from './bom.js';
import { NOT_IN_CATALOGUE, entryById } from './catalogue.js';

/**
 * The waste allowance as a percentage: T-CC2a's ONE offcut number,
 * `profile.materials.sheetYield` (1.10 is 10 percent; the owner, 01.11.2026,
 * 13:28: *"dajmy 10 procent na offcuts"*). The second number this block kept
 * (`profile.bom.wastePct` 15) is deleted by T-CC2a's Deletion licence.
 */
export function bomWastePct(profile) {
  const y = Number(profile?.materials?.sheetYield ?? DEFAULT_CABINET_PROFILE.materials.sheetYield);
  return Number.isFinite(y) && y >= 1 ? roundTo((y - 1) * 100, 2) : 0;
}

/** The PURCHASE sheet (2800×2070 until he says) — never the CNC bed. */
export function bomSheet(profile) {
  const s = profile?.bom?.sheet || {};
  const width = Number(s.width) > 0 ? Number(s.width) : 2800;
  const height = Number(s.height) > 0 ? Number(s.height) : 2070;
  return { width, height };
}

/**
 * BLOCK 1 — the materials, per decor and thickness, fronts apart.
 *
 * @param {object} bom  buildBom() output
 * @param {object} profile
 * @param {object} [opts]  { excludeDrawerBoxes } — F7's ready-made boxes
 *   leave the cut list; their purchase line is ironmongery's business.
 *   `links` (UX turn B6): the company's links, a Map cc_material_id to link
 *   (stores/materialLinkStore.js `links`); see `linkedSummary` below.
 * @returns {Array<{kind:'carcasses'|'fronts', label, thickness, pieces,
 *   net_m2, waste_pct, order_m2, sheets, sheet_label, edging_m}>}
 */
export function materialsSummary(bom, profile, { excludeDrawerBoxes = false, links = null } = {}) {
  if (links) return linkedSummary(bom, profile, { excludeDrawerBoxes, links });
  const wastePct = bomWastePct(profile);
  const sheet = bomSheet(profile);
  const sheetM2 = (sheet.width * sheet.height) / 1e6;
  const groups = new Map();
  for (const r of bom.cutRows || []) {
    if (excludeDrawerBoxes && r.role === 'drawer_box') continue;
    const kind = r.material_role === 'front' ? 'fronts' : 'carcasses';
    const label = r.material_label || 'Unassigned';
    const key = `${kind}|${r.material_key || label}|${r.thickness}`;
    const g = groups.get(key) || {
      kind, label, thickness: r.thickness, pieces: 0, net_m2: 0, edging_m: 0,
    };
    g.pieces += r.qty;
    g.net_m2 += r.area_m2 * r.qty;
    g.edging_m += r.edge_m * r.qty;
    groups.set(key, g);
  }
  return [...groups.values()]
    .map((g) => {
      const order = g.net_m2 * (1 + wastePct / 100);
      const sheets = g.net_m2 > 0 ? Math.max(1, Math.ceil(order / sheetM2)) : 0;
      return {
        ...g,
        net_m2: roundTo(g.net_m2, 3),
        waste_pct: wastePct,
        order_m2: roundTo(order, 3),
        sheets,
        sheet_label: `~${sheets} sheet${sheets === 1 ? '' : 's'} of ${sheet.width}×${sheet.height}`,
        edging_m: roundTo(g.edging_m, 2),
      };
    })
    // Carcasses first, fronts after — SEPARATE, as the owner ordered.
    .sort((a, b) => (a.kind === b.kind ? a.label.localeCompare(b.label) : (a.kind === 'fronts' ? 1 : -1)));
}

/** A link lookup over a Map, an object keyed by catalogue id, or an array of link rows (bom.js purchaseBom's own shapes). */
function linkLookup(links) {
  if (links instanceof Map) return (id) => links.get(id) || null;
  if (Array.isArray(links)) {
    const m = new Map(links.filter(Boolean).map((l) => [l.cc_material_id, l]));
    return (id) => m.get(id) || null;
  }
  if (links && typeof links === 'object') return (id) => links[id] || null;
  return () => null;
}

/**
 * ─── UX TURN B6 · THE ORDER TAB COUNTS THE PURCHASE LIST'S SHEETS ───────────
 *
 * Ewa P3, Wiktor: the Order tab counted sheets on the profile's fixed 2800 x
 * 2070 sheet while the purchase list (engine/bom.js purchaseBom) counts each
 * catalogue entry over the whole project on its LINK's size and yield (law 6).
 * Two numbers for one board. With `links` the Order tab is grouped as the
 * purchase list is, ONE row per catalogue entry, and counted with the SAME
 * functions (bom.js sheetCount, sheetYieldOf), so the two numbers are one.
 *
 * A row carries `sheets` and `sheetSize: { width_mm, length_mm }` (the
 * purchase rows' names), `catalogueId`, its own `yield` and `waste_pct` (a
 * link may hold its own), and `words` where there is no count, the purchase
 * list's own: no link, "Not linked"; a linked sheet with no size, "Sheet size
 * missing, add it in Link materials"; a board the catalogue does not hold,
 * "Not in the catalogue yet".
 * The count is never guessed. `kind` is 'fronts' when every piece of the
 * entry is a front, else 'carcasses' (one board bought once, listed once);
 * `kinds` names both where an entry serves both. A piece with no catalogue id
 * keeps today's group (kind, material key, thickness). Without `links` the
 * function above is untouched.
 */
function linkedSummary(bom, profile, { excludeDrawerBoxes = false, links } = {}) {
  const linkOf = linkLookup(links);
  const groups = new Map();
  for (const r of bom.cutRows || []) {
    if (excludeDrawerBoxes && r.role === 'drawer_box') continue;
    const kind = r.material_role === 'front' ? 'fronts' : 'carcasses';
    const id = r.catalogue_id || null;
    const label = r.material_label || 'Unassigned';
    const key = id ? `cat:${id}` : `${kind}|${r.material_key || label}|${r.thickness}`;
    const g = groups.get(key) || {
      catalogueId: id, kinds: new Set(), label: id ? (entryById(id)?.name || label) : label, thickness: r.thickness, pieces: 0, net_m2: 0, edging_m: 0,
    };
    g.kinds.add(kind);
    g.pieces += r.qty;
    g.net_m2 += r.area_m2 * r.qty;
    g.edging_m += r.edge_m * r.qty;
    groups.set(key, g);
  }
  return [...groups.values()]
    .map(({ kinds, ...g }) => {
      const kind = kinds.size === 1 && kinds.has('fronts') ? 'fronts' : 'carcasses';
      const link = g.catalogueId ? linkOf(g.catalogueId) : null;
      const y = sheetYieldOf(link, profile);
      const sheets = link ? sheetCount(g.net_m2, { yield: y, widthMm: link.sheet_width_mm, lengthMm: link.sheet_length_mm }) : null;
      const sheetSize = sheets == null ? null : { width_mm: Number(link.sheet_width_mm), length_mm: Number(link.sheet_length_mm) };
      // The purchase list's words, in its order: not in the catalogue, not linked, a linked sheet with no size.
      let words = null;
      if (sheets == null && g.net_m2 > 0) {
        if (!g.catalogueId) words = NOT_IN_CATALOGUE;
        else if (!link) words = LINK_WORDS.notLinked;
        else words = LINK_WORDS.sheetSizeMissing;
      }
      return {
        ...g,
        kind,
        kinds: [...kinds].sort(),
        net_m2: roundTo(g.net_m2, 3),
        // Each row its OWN yield (the link's, else the company's): two links may hold two, so a
        // header that reads one row's percent for the whole table can mislead; read it per row.
        yield: y,
        waste_pct: roundTo((y - 1) * 100, 2),
        order_m2: roundTo(g.net_m2 * y, 3),
        sheets: sheets == null ? (g.net_m2 > 0 ? null : 0) : sheets,
        sheetSize,
        words,
        sheet_label: sheets != null
          ? `${sheets} sheet${sheets === 1 ? '' : 's'} of ${sheetSize.width_mm}×${sheetSize.length_mm}`
          : (words || '0 sheets'),
        edging_m: roundTo(g.edging_m, 2),
      };
    })
    .sort((a, b) => (a.kind === b.kind ? a.label.localeCompare(b.label) : (a.kind === 'fronts' ? 1 : -1)));
}

const line = (l) => ({
  article: null, articles: [], source: null, yellow: false, note: null, ...l,
});

/**
 * BLOCK 2 — the ironmongery, counted with articles.
 *
 * @param {object} args
 *   entries    [{unit, result}] — the same list buildBom eats
 *   bom        buildBom() output (the merged hardware rows)
 *   design     the migrated project design
 *   profile
 *   materials  the workshop stock list (front thickness resolution)
 *   lookup     the REGISTRY (F6) — ({category, …}) → row | null
 * @returns {Array<{role, label, qty, unit, article, articles, source,
 *   yellow, spec_label, note}>}
 */
export function ironmongerySummary({
  entries = [], bom, design = null, profile, materials = [], lookup = null,
}) {
  const lines = [];
  const rows = bom?.hardware || [];
  const softClose = hardwareVariant(design, profile, 'hinges') === 'soft-close';
  const metal = design?.hardware?.shelfSleeve || profile.appearance.metalDefault;

  // ── hinges: pcs + PLATES, via the F2 automat ──
  let hingeTotal = 0;
  let plateFinish = null;
  for (const row of rows.filter((r) => r.role === 'hinges')) {
    hingeTotal += row.qty;
    const auto = hingeAutomat({
      frontThickness: projectFrontThickness(design, profile, materials),
      angle: row.spec?.angle ?? null,
      metal,
      softClose,
    }, { profile, lookup });
    plateFinish = plateFinish || auto.finish;
    lines.push(line({
      role: 'hinges',
      label: `Hinges ${auto.angle != null ? `${auto.angle}°` : ''}`.trim(),
      qty: row.qty,
      unit: 'pcs',
      article: auto.article,
      articles: auto.articles,
      source: auto.source,
      yellow: !auto.resolved,
      spec_label: auto.spec_label,
    }));
  }
  if (hingeTotal > 0) {
    const plate = (typeof lookup === 'function'
      && lookup({ category: 'hinge_plate', finish: plateFinish }))
      || plateFamily({ plate: design?.hinges?.plate, finish: plateFinish });
    lines.push(line({
      role: 'hinge_plates',
      label: 'Hinge mounting plates',
      qty: hingeTotal,
      unit: 'pcs',
      article: plate?.article ?? null,
      articles: plate?.articles ? [...plate.articles] : [],
      source: plate ? (plate.source || 'catalogue') : null,
      yellow: !plate?.article,
      spec_label: `Mounting plate · ${plateFinish || 'finish unknown'}`,
    }));
  }

  // ── runner PAIRS, at the length the snap already chose ──
  for (const row of rows.filter((r) => r.role === 'runner_pairs')) {
    const spec = row.spec || {};
    const own = spec.articles?.L || spec.articles?.R
      ? [spec.articles.L, spec.articles.R].filter(Boolean)
      : [];
    const reg = !own.length && typeof lookup === 'function'
      ? lookup({ category: 'runner', nl: spec.nl ?? spec.length_mm, variant: spec.variant })
      : null;
    lines.push(line({
      role: 'runner_pairs',
      label: `Drawer runners${spec.length_mm ? ` ${roundTo(spec.length_mm, 0)} mm` : ''}`,
      qty: row.qty,
      unit: 'pairs',
      article: own[0] ?? reg?.article ?? null,
      articles: own.length ? own : (reg?.articles ? [...reg.articles] : []),
      source: own.length ? 'catalogue' : (reg ? reg.source || 'registry' : null),
      yellow: !own.length && !reg?.article,
      spec_label: row.spec_label || 'Runner pair',
    }));
  }
  for (const row of rows.filter((r) => r.role === 'runner_sync_rods' && r.qty > 0)) {
    lines.push(line({
      role: 'runner_sync_rods',
      label: 'Runner synchronisation rods',
      qty: row.qty,
      unit: 'pcs',
      yellow: true,
      spec_label: row.spec_label || 'Sync rod',
    }));
  }

  // ── the hanging rail, by the METRE, with its supports ──
  let railMm = 0;
  let railCount = 0;
  for (const row of rows.filter((r) => r.role === 'rail' && r.qty > 0)) {
    railMm += (Number(row.spec?.length_mm) || 0) * row.qty;
    railCount += row.qty;
  }
  if (railCount > 0) {
    const reg = typeof lookup === 'function' ? lookup({ category: 'rail' }) : null;
    lines.push(line({
      role: 'rail',
      label: 'Hanging rail',
      qty: roundTo(railMm / 1000, 2),
      unit: 'm',
      article: reg?.article ?? null,
      source: reg ? reg.source || 'registry' : null,
      yellow: !reg?.article,
      spec_label: `Hanging rail · ${roundTo(railMm / 1000, 2)} m in ${railCount} length${railCount === 1 ? '' : 's'}`,
    }));
    // The supports are the brackets the engine already drills for — counted
    // off the drilling, never invented.
    const brackets = entries.reduce((s, { result }) => s
      + (result.drills || []).filter((d) => d.kind === 'rail_bracket').length, 0);
    if (brackets > 0) {
      lines.push(line({
        role: 'rail_supports',
        label: 'Rail supports',
        qty: brackets,
        unit: 'pcs',
        yellow: true,
        spec_label: 'Rail support bracket',
      }));
    }
  }

  // ── legs, and the plinth's clips + connectors — FRONT LEGS ONLY ──
  for (const row of rows.filter((r) => r.role === 'legs' && r.qty > 0)) {
    const reg = typeof lookup === 'function' ? lookup({ category: 'leg' }) : null;
    lines.push(line({
      role: 'legs',
      label: 'Legs',
      qty: row.qty,
      unit: 'pcs',
      article: reg?.article ?? null,
      source: reg ? reg.source || 'registry' : null,
      yellow: !reg?.article,
      spec_label: row.spec_label ? `Leg · ${row.spec_label}` : 'Leg',
    }));
  }
  let clips = 0;
  for (const { unit } of entries) {
    if (!unit?.params?.plinth) continue;
    clips += frontLegCount({
      width: Number(unit.params.width) || 0,
      depth: Number(unit.params.depth) || 0,
      boardT: Number(unit.params.board_t) || profile.board.thickness,
    }, profile);
  }
  if (clips > 0) {
    const clipReg = typeof lookup === 'function' ? lookup({ category: 'clip' }) : null;
    lines.push(line({
      role: 'plinth_clips',
      label: 'Plinth clips',
      qty: clips,
      unit: 'pcs',
      article: clipReg?.article ?? null,
      source: clipReg ? clipReg.source || 'registry' : null,
      yellow: !clipReg?.article,
      spec_label: 'Plinth clip — one per front leg',
    }));
    lines.push(line({
      role: 'plinth_clip_connectors',
      label: 'Plinth clip connectors',
      qty: clips,
      unit: 'pcs',
      yellow: true,
      spec_label: 'Plinth clip connector — one per front leg',
    }));
  }

  // ── shelf supports ──
  for (const row of rows.filter((r) => r.role === 'shelf_pins' && r.qty > 0)) {
    const reg = typeof lookup === 'function' ? lookup({ category: 'shelf_pin' }) : null;
    lines.push(line({
      role: 'shelf_pins',
      label: 'Shelf supports',
      qty: row.qty,
      unit: 'pcs',
      article: reg?.article ?? null,
      source: reg ? reg.source || 'registry' : null,
      yellow: !reg?.article,
      spec_label: row.spec_label ? `Shelf support ${row.spec_label}` : 'Shelf support',
    }));
  }

  // ── confirmats and screws, counted off the DRILLING ──
  // The engine has drilled every one of these since its own turn; the counts
  // were simply never read. Grouped by what the hole is for and its diameter.
  const screws = new Map();
  for (const { result } of entries) {
    for (const d of result.drills || []) {
      if (!/screw/.test(d.kind)) continue;
      const key = `${d.kind}|${d.d}`;
      screws.set(key, (screws.get(key) || 0) + 1);
    }
  }
  for (const [key, qty] of [...screws.entries()].sort()) {
    const [kind, dia] = key.split('|');
    lines.push(line({
      role: `screws:${kind}`,
      label: `Screws — ${kind.replace(/_/g, ' ').replace(/ screw$/, '')} ⌀${dia}`,
      qty,
      unit: 'pcs',
      yellow: true,
      spec_label: `Screw ⌀${dia} · ${kind.replace(/_/g, ' ')}`,
    }));
  }

  // ── everything else the engine already buys (glass, cornice, kits…) ──
  const covered = new Set(['hinges', 'runner_pairs', 'runner_sync_rods', 'rail', 'legs', 'shelf_pins']);
  for (const row of rows.filter((r) => !covered.has(r.role) && r.qty > 0)) {
    lines.push(line({
      role: row.role,
      label: row.label,
      qty: row.qty,
      unit: row.unit,
      yellow: true,
      spec_label: row.spec_label || row.label,
    }));
  }

  return lines;
}

/**
 * ─── TURN 32 (CLAUDE.md F7): READY-MADE BOXES ARE PURCHASE LINES ────────────
 * One line per drawer whose box is bought rather than cut: the box's own
 * width and the runner's snapped depth name the thing to order. A NAMED SPEC
 * (yellow) until the registry knows a system — never an invented article.
 */
export function readyBoxLines(entries) {
  const byDims = new Map();
  for (const { result } of entries) {
    const sides = (result.panels || []).filter((p) => p.part === 'DRAWER-SIDE' && p.meta?.side === 'L');
    for (const side of sides) {
      const key = `${roundTo(side.w, 0)}×${roundTo(side.h, 0)}`;
      byDims.set(key, (byDims.get(key) || 0) + 1);
    }
  }
  return [...byDims.entries()].sort().map(([dims, qty]) => line({
    role: 'ready_boxes',
    label: `Ready-made drawer box ${dims}`,
    qty,
    unit: 'pcs',
    yellow: true,
    spec_label: `Ready-made drawer box · depth×side ${dims} mm`,
  }));
}

const csvField = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * ONE export, both blocks. `{ProjectName}-bom-{DDMM-HHMM}.csv` is the
 * caller's business (engine/naming.js, T31 F5's pattern); this builds the
 * bytes.
 */
export function buildBomCsvText({ summary = [], ironmongery = [], warnings = [] } = {}) {
  const out = [];
  for (const w of warnings) out.push(`WARNING,${csvField(w)}`);
  out.push('MATERIALS');
  out.push('KIND,DECOR,THICKNESS_MM,PIECES,NET_M2,WASTE_PCT,ORDER_M2,SHEETS,EDGING_M');
  for (const g of summary) {
    out.push([g.kind, csvField(g.label), g.thickness, g.pieces, g.net_m2,
      g.waste_pct, g.order_m2, csvField(g.sheet_label), g.edging_m].join(','));
  }
  out.push('');
  out.push('IRONMONGERY');
  out.push('LINE,QTY,UNIT,ARTICLE,STATUS,SPEC');
  for (const l of ironmongery) {
    out.push([csvField(l.label), l.qty, l.unit, csvField(l.article || ''),
      l.yellow ? 'SPEC — no article in the registry' : (l.source || ''),
      csvField(l.spec_label || '')].join(','));
  }
  return `${out.join('\r\n')}\r\n`;
}
