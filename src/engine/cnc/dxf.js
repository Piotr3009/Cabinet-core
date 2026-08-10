// ─── DXF generator ───
// One DXF file per cut part, straight out of the engine's CNC geometry.
// Pure JavaScript: no React, no store, no third-party library (the ZIP wrapper
// that needs jszip lives in src/lib/, not here — CLAUDE.md rule 2).
//
// DIALECT — why R12 and not a modern DXF.
//   Syntax pattern: reference/production-core/dxfWriter.js, which is in
//   production at Piotr's shop today. Its header records why: an AC1015
//   attempt died in VCarve's parser (02.08.2026), so the writer was downgraded
//   to R12 (AC1009) ASCII — the oldest mainstream dialect, no handles, no
//   subclass markers, no BLOCKS/OBJECTS sections, and the dialect Vectric's own
//   documentation recommends for DXF import.
//   R12 has no LWPOLYLINE, so a closed polyline is written the R12 way:
//   POLYLINE + VERTEX… + SEQEND with the closed flag (70 = 1). Semantically
//   identical to the LWPOLYLINE the AutoLISP entmakes — same points, same
//   closed flag, same layer — just spelled in the dialect that is known to
//   import. See BLOCKERS.md #8.
//
// COORDINATES — origin is the bottom-left corner of the part's nominal
// rectangle, i.e. exactly the panel-local frame the engine already emits
// (src/engine/puzzle.js). Puzzle tabs and socket reliefs deliberately reach
// OUTSIDE that rectangle (a tab on BUR runs to x = −G, a socket overshoots the
// edge by 6 mm) because that is what they physically do; the coordinates are
// therefore not clamped to the positive quadrant. $EXTMIN/$EXTMAX in the
// header state the true extents so any CAM package sees them immediately.

import { layerTableFor } from './layers.js';
import { partLabelText } from './partLabel.js';
import { MONO_ADVANCE, truncateToWidth } from './annotation.js';
import { turnPoint } from './layout.js';
import { fileSafeName } from '../naming.js';

// ─── Low-level R12 serialiser (shape from production-core/dxfWriter.js) ───

/** Plain decimal, no exponent, trimmed — CAD readers dislike 1e-7 notation. */
const fmt = (n) => {
  const s = Number(n).toFixed(6).replace(/\.?0+$/, '');
  return s === '-0' ? '0' : s;
};

/**
 * @param {Array} entities  { type:'poly'|'circle'|'text', … } — see below
 * @param {Array} layers    [{ name, color }] — every layer the entities use
 * @param {object} [extents] { min:[x,y], max:[x,y] } for $EXTMIN/$EXTMAX
 * @returns {string} DXF R12 ASCII, CRLF line endings (what AutoCAD itself emits)
 */
export function writeDxf(entities, layers, extents) {
  const out = [];
  const put = (code, val) => { out.push(String(code), String(val)); };

  // ── HEADER ──
  put(0, 'SECTION'); put(2, 'HEADER');
  put(9, '$ACADVER'); put(1, 'AC1009');
  put(9, '$INSBASE'); put(10, 0); put(20, 0); put(30, 0);
  if (extents) {
    put(9, '$EXTMIN'); put(10, fmt(extents.min[0])); put(20, fmt(extents.min[1])); put(30, 0);
    put(9, '$EXTMAX'); put(10, fmt(extents.max[0])); put(20, fmt(extents.max[1])); put(30, 0);
  }
  put(0, 'ENDSEC');

  // ── TABLES (layers only, R12 style) ──
  put(0, 'SECTION'); put(2, 'TABLES');
  put(0, 'TABLE'); put(2, 'LAYER'); put(70, layers.length + 1);
  const layerRow = (name, color) => {
    put(0, 'LAYER'); put(2, name); put(70, 0); put(62, color); put(6, 'CONTINUOUS');
  };
  layerRow('0', 7);
  for (const l of layers) layerRow(l.name, l.color);
  put(0, 'ENDTAB');
  put(0, 'ENDSEC');

  // ── ENTITIES ──
  put(0, 'SECTION'); put(2, 'ENTITIES');
  for (const e of entities) {
    if (e.type === 'poly') {
      put(0, 'POLYLINE'); put(8, e.layer);
      put(66, 1);                                 // vertices follow
      put(70, e.closed ? 1 : 0);
      put(10, 0); put(20, 0); put(30, 0);
      for (const [x, y, b] of e.pts) {
        put(0, 'VERTEX'); put(8, e.layer);
        put(10, fmt(x)); put(20, fmt(y)); put(30, 0);
        if (b) put(42, fmt(b));
      }
      put(0, 'SEQEND'); put(8, e.layer);
    } else if (e.type === 'circle') {
      put(0, 'CIRCLE'); put(8, e.layer);
      put(10, fmt(e.cx)); put(20, fmt(e.cy)); put(30, 0);
      put(40, fmt(e.r));
    } else if (e.type === 'text') {
      put(0, 'TEXT'); put(8, e.layer);
      put(10, fmt(e.x)); put(20, fmt(e.y)); put(30, 0);
      put(40, fmt(e.h)); put(1, e.str);
      if (e.rot) put(50, fmt(e.rot));
      put(72, e.halign ?? 1);                     // 1 = centred horizontally
      put(11, fmt(e.x)); put(21, fmt(e.y)); put(31, 0);
      put(73, e.valign ?? 2);                     // 2 = middle vertically
    }
  }
  put(0, 'ENDSEC');
  put(0, 'EOF');
  return `${out.join('\r\n')}\r\n`;
}

// ─── Engine geometry → entities ───

/** A pocket record { x1,y1,x2,y2 } is a closed 4-point rectangle. */
function pocketPoints(p) {
  return [[p.x1, p.y1], [p.x2, p.y1], [p.x2, p.y2], [p.x1, p.y2]];
}

/**
 * Label height that still fits INSIDE a part this size (turn 17, CLAUDE.md F1.3).
 *
 * Two limits, and the second is this turn's. The height has been capped at a
 * share of the part's SHORT side since turn 3, which keeps a caption from
 * standing taller than the board. It never looked at the WIDTH, because the
 * string was `01-BUL` and six characters fit on anything. The string is
 * `F-01 BUL 560x2100` now — three times as long — so a small part would have
 * had its label hanging over both edges, which is the one thing F1.3 forbids
 * ("it never spills over the outline and never overlaps a neighbour").
 *
 * The advance width is `annotation.js`'s own, so the size the sheet shrinks a
 * caption to and the size the file writes it at are computed the same way.
 */
function labelHeightFor(panel, cnc, text = '') {
  const w = Math.abs(panel.cnc?.drawn_w ?? panel.w);
  const h = Math.abs(panel.cnc?.drawn_h ?? panel.h);
  const fitted = Math.min(w, h) * cnc.labelFitRatio;
  const chars = String(text).length;
  // …and never wider than the board it is cut into.
  const acrossFit = chars > 0 ? (w * 0.94) / (chars * MONO_ADVANCE) : Infinity;
  return Math.max(cnc.labelMinHeight, Math.min(cnc.labelHeight, fitted, acrossFit));
}

/**
 * The part's own caption AS THE FILE WRITES IT: the string and its height.
 *
 * Exported because two other places have to agree with it exactly — the identity
 * test, which asserts the label fits inside the outline on every kit, and any
 * future reader that wants to know what a board will actually say. One answer,
 * in the module that writes it (turn 17, CLAUDE.md F1.1).
 *
 * @returns {{str:string, h:number}} `str` is '' where not even one character fits
 */
export function panelLabel(panel, { unitNum, profile }) {
  const cnc = profile.cnc;
  const w = Math.abs(panel.cnc?.drawn_w ?? panel.w);
  const wanted = partLabelText(unitNum, panel);
  const h = labelHeightFor(panel, cnc, wanted);
  // Where even the readable floor is too tall for the board — a 30 mm scribe
  // filler is 30 mm wide and the string is seventeen characters — the label
  // TRUNCATES rather than hanging over the edge. That is `annotation.js`'s own
  // middle step between "draw it" and "hide it" (turn 16 F3), and using it here
  // is what keeps F1.1 and F1.3 both true at once: the piece still says which
  // cabinet it belongs to, which is the whole point of the label, and it still
  // fits inside its own outline.
  return { str: truncateToWidth(wanted, w * 0.94, h, '~'), h };
}

/**
 * All DXF entities of one cut part, in panel-local mm.
 *
 * The circles come from `drills[]` and ONLY from there. `panel.cnc.holes` is
 * already copied into `drills[]` by computeCabinet, so reading both would
 * double every puzzle hole.
 *
 * @param {object} panel   one entry of result.panels
 * @param {object[]} drills  result.drills (the whole list; filtered here)
 * @param {object} opts    { unitNum, profile }
 */
export function panelEntities(panel, drills, { unitNum, profile }) {
  const pz = profile.puzzle;
  const cnc = profile.cnc;
  const entities = [];

  const outline = panel.cnc?.outline || [];
  if (outline.length >= 2) {
    entities.push({
      type: 'poly',
      layer: panel.cnc?.layer || pz.layers.outline,
      closed: true,
      pts: outline.map(([x, y]) => [x, y]),
    });
  }

  for (const pocket of panel.cnc?.pockets || []) {
    entities.push({ type: 'poly', layer: pocket.layer, closed: true, pts: pocketPoints(pocket) });
  }

  // ─── Turn 13 (CLAUDE.md F8): the biscuit MARKS ───
  // An OPEN two-point polyline — a path the cutter follows in and back out —
  // rather than a closed rectangle, because that is what the owner's dedicated
  // 4 mm program is: plunge, run 70 mm, retract. R12 has the closed flag
  // already (`70 = 0` here against `1` for a pocket), so nothing about the
  // writer changes. A panel with no marks contributes nothing, which is what
  // keeps every existing file byte-identical.
  for (const mark of panel.cnc?.marks || []) {
    entities.push({ type: 'poly', layer: mark.layer, closed: false, pts: [mark.from, mark.to] });
  }

  for (const hole of drills) {
    if (hole.panel !== panel.id) continue;
    entities.push({ type: 'circle', layer: hole.layer, cx: hole.x, cy: hole.y, r: hole.d / 2 });
  }

  // ─── Turn 17 (CLAUDE.md F1): THE PART SAYS WHICH CABINET IT IS FOR ────────
  //
  // Part label at the centre of the nominal rectangle, exactly like
  // (drawText "UNIT_NUMBER" midX midY 40.0 unitNum) in the LISP — but the
  // STRING is `engine/cnc/partLabel.js` now, the same one the sheet draws, so
  // the board on the bench and the picture on the screen say the same words.
  // It is INSIDE the part (F1.2), on the existing text layer (F1.4), and it is
  // the only text this file ever writes (F2.2).
  const w = panel.cnc?.drawn_w ?? panel.w;
  const h = panel.cnc?.drawn_h ?? panel.h;
  const label = panelLabel(panel, { unitNum, profile });
  if (label.str) {
    entities.push({
      type: 'text',
      layer: cnc.unitNumberLayer,
      x: w / 2,
      y: h / 2,
      h: label.h,
      str: label.str,
    });
  }

  return entities;
}

/** Bounding box over every entity, so the header can state the real extents. */
export function entitiesExtents(entities) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  const hit = (x, y) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };
  for (const e of entities) {
    if (e.type === 'poly') for (const [x, y] of e.pts) hit(x, y);
    else if (e.type === 'circle') { hit(e.cx - e.r, e.cy - e.r); hit(e.cx + e.r, e.cy + e.r); }
    else if (e.type === 'text') hit(e.x, e.y);
  }
  if (!Number.isFinite(minX)) return { min: [0, 0], max: [0, 0] };
  return { min: [minX, minY], max: [maxX, maxY] };
}

/** `{unitNum}-{PANEL_ID}.dxf`, without repeating a unit number already in the id. */
export function dxfFileName(unitNum, panelId) {
  const prefix = `${unitNum}-`;
  const id = String(panelId).startsWith(prefix) ? String(panelId).slice(prefix.length) : String(panelId);
  const safe = `${unitNum}-${id}`.replace(/[^A-Za-z0-9._-]+/g, '_');
  return `${safe}.dxf`;
}

/** Complete DXF text for one part. */
export function panelDxf(panel, drills, opts) {
  const entities = panelEntities(panel, drills, opts);
  const layers = layerTableFor(entities.map((e) => e.layer));
  return writeDxf(entities, layers, entitiesExtents(entities));
}

/**
 * Every cut part of one unit as its own DXF.
 *
 * Door and drawer FRONTS are included: they carry the hinge cups and cup
 * screws, which are drilled on the CNC just like the carcass holes.
 *
 * @param {object} result  computeCabinet() output
 * @param {object} profile the profile the result was computed with
 * @returns {{name:string, panelId:string, dxf:string, entities:object[]}[]}
 */
export function buildUnitDxfFiles(result, profile) {
  const unitNum = result.unitNum;
  return result.panels
    .filter((p) => p.cnc && Array.isArray(p.cnc.outline) && p.cnc.outline.length >= 2)
    .map((panel) => {
      const entities = panelEntities(panel, result.drills, { unitNum, profile });
      const layers = layerTableFor(entities.map((e) => e.layer));
      return {
        name: dxfFileName(unitNum, panel.id),
        panelId: panel.id,
        entities,
        dxf: writeDxf(entities, layers, entitiesExtents(entities)),
      };
    });
}

/**
 * ONE DXF holding several parts, laid out exactly as the preview shows them.
 *
 * The arrangement is not recomputed here: it comes from the same
 * layoutPanels() the CNC view draws with, so "what you see is what you cut" is
 * a fact about the code, not a promise in a comment. The only thing that
 * changes is the frame — the preview works in y-DOWN sheet coordinates (an SVG
 * viewport) and a DXF is y-UP, so each part's placement is flipped once, as a
 * whole, which preserves the layout exactly.
 *
 * @param {object} args
 *   panels   the SELECTED parts, in cut-list order
 *   drills   result.drills (filtered per part inside)
 *   layout   { places, width, height } from layoutPanels()
 *   unitNum, profile
 */
export function sheetEntities({
  panels, drills, layout, unitNum, profile, sheetHeight = null, offsetY = 0,
}) {
  const byId = new Map(layout.places.map((pl) => [pl.panel.id, pl]));
  const entities = [];
  // `sheetHeight`/`offsetY` are how a MATERIAL sheet stacks several cabinets'
  // blocks into one file (F2.1). Left out, they are this layout's own height and
  // no offset — which is the arithmetic that has produced every sheet since
  // turn 3, to the byte.
  const total = sheetHeight == null ? layout.height : sheetHeight;

  for (const panel of panels) {
    const place = byId.get(panel.id);
    if (!place) continue;
    const turn = place.bounds.turn || 0;
    // Sheet (y-down, origin top-left) → DXF (y-up, origin bottom-left).
    const dx = place.x - place.bounds.minX;
    const dy = (total - (offsetY + place.y) - place.h) - place.bounds.minY;
    // Turn 17 (CLAUDE.md F3): a part may be laid down TURNED, and the file has
    // to agree with the picture — so it is the SAME transform the preview uses
    // (engine/cnc/layout.js `turnPoint`), applied to the part's own geometry
    // before it is moved into place. A part at turn 0 goes through unchanged.
    const at = (x, y) => {
      const [tx, ty] = turnPoint(x, y, turn);
      return [tx + dx, ty + dy];
    };
    for (const e of panelEntities(panel, drills, { unitNum, profile })) {
      if (e.type === 'poly') entities.push({ ...e, pts: e.pts.map(([x, y]) => at(x, y)) });
      else if (e.type === 'circle') {
        const [cx, cy] = at(e.cx, e.cy);
        entities.push({ ...e, cx, cy });
      } else if (e.type === 'text') {
        const [x, y] = at(e.x, e.y);
        // The caption is cut INTO the board, so it turns with the board.
        entities.push({ ...e, x, y, rot: ((e.rot || 0) + turn) % 360 });
      }
    }
  }
  return entities;
}

/** `{unitNum}-cnc-{preset}.dxf` — the file says what is inside it. */
export function sheetDxfFileName(unitNum, presetId) {
  const safe = `${unitNum}-cnc-${presetId}`.replace(/[^A-Za-z0-9._-]+/g, '_');
  return `${safe}.dxf`;
}

/** Complete DXF text for a whole sheet of selected parts. */
export function sheetDxf(args) {
  const entities = sheetEntities(args);
  const layers = layerTableFor(entities.map((e) => e.layer));
  return writeDxf(entities, layers, entitiesExtents(entities));
}

// ─── ONE BOARD, ONE FILE (turn 17, CLAUDE.md F2.1) ──────────────────────────
//
// "Choose the material, export the lot." Turn 16 gave the SHEET its material
// grouping; this is the same identity driving what leaves the app. A material
// section on screen is a stack of per-cabinet blocks (components/CncView.jsx),
// and this writes exactly that stack into one file — the blocks in the same
// order, at the same spacing, so what the joiner ticked is what he gets.
//
// It carries THE PART LABELS AND NOTHING ELSE (F2.2, delta 2). The sheet draws
// a yellow header over each section and a name over each block; those are
// SCREEN furniture — "żadnych innych liter bo to nam zaśmieca program w CNC" —
// and there is deliberately no code path here that could write one. The only
// TEXT entity any of this can emit is `panelEntities`'s single in-part label.

/**
 * @param {object} args
 *   blocks  [{ unitNum, panels, drills, layout }] — one per cabinet, in order
 *   gap     profile.cnc.layoutGap; the blocks stand three gaps apart, exactly
 *           as the preview stacks them
 *   profile
 */
export function materialSheetEntities({ blocks = [], gap = 0, profile }) {
  const step = gap * 3;
  const height = blocks.reduce((h, b) => h + b.layout.height, 0)
    + step * Math.max(0, blocks.length - 1);
  const entities = [];
  let offsetY = 0;
  for (const block of blocks) {
    entities.push(...sheetEntities({
      panels: block.panels,
      drills: block.drills,
      layout: block.layout,
      unitNum: block.unitNum,
      profile,
      sheetHeight: height,
      offsetY,
    }));
    offsetY += block.layout.height + step;
  }
  return entities;
}

/** `{material}-cnc.dxf` — the file says which board is on the bed. */
export function materialDxfFileName(label) {
  return `${fileSafeName(label, 'material')}-cnc.dxf`;
}

/** Complete DXF text for one material's worth of parts, across every cabinet. */
export function materialSheetDxf(args) {
  const entities = materialSheetEntities(args);
  const layers = layerTableFor(entities.map((e) => e.layer));
  return writeDxf(entities, layers, entitiesExtents(entities));
}

// ─── Reading our own output back ───
// Used by test/dxf.test.js, and small enough to keep next to the writer so the
// two can never drift apart.

/** DXF text → [[code, value], …]. */
export function parseDxfPairs(text) {
  const lines = text.split(/\r\n|\r|\n/);
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  const pairs = [];
  for (let i = 0; i + 1 < lines.length; i += 2) pairs.push([Number(lines[i]), lines[i + 1]]);
  return pairs;
}

/**
 * DXF text → { sections, entities } where every entity is
 * { type, layer, closed?, pts?, cx?, cy?, r?, str? }.
 */
export function parseDxf(text) {
  const pairs = parseDxfPairs(text);
  const sections = [];
  const entities = [];
  const layerTable = [];
  let inEntities = false;
  let inLayerTable = false;
  let current = null;
  let expectSectionName = false;
  let expectTableName = false;

  const flush = () => {
    if (current) entities.push(current);
    current = null;
  };

  for (const [code, raw] of pairs) {
    if (expectSectionName && code === 2) { sections.push(raw); expectSectionName = false; inEntities = raw === 'ENTITIES'; continue; }
    if (expectTableName && code === 2) { inLayerTable = raw === 'LAYER'; expectTableName = false; continue; }

    if (code === 0) {
      if (raw === 'SECTION') { expectSectionName = true; continue; }
      if (raw === 'ENDSEC') { flush(); inEntities = false; continue; }
      if (raw === 'TABLE') { expectTableName = true; continue; }
      if (raw === 'ENDTAB') { inLayerTable = false; continue; }

      if (inLayerTable && raw === 'LAYER') { layerTable.push({ name: null, color: null }); continue; }

      if (!inEntities) continue;
      if (raw === 'VERTEX') continue;                    // folded into the open POLYLINE
      if (raw === 'SEQEND') { flush(); continue; }
      flush();
      if (raw === 'POLYLINE') current = { type: 'poly', layer: null, closed: false, pts: [] };
      else if (raw === 'CIRCLE') current = { type: 'circle', layer: null };
      else if (raw === 'TEXT') current = { type: 'text', layer: null };
      else current = null;
      continue;
    }

    if (inLayerTable && layerTable.length) {
      const row = layerTable[layerTable.length - 1];
      if (code === 2 && row.name === null) row.name = raw;
      else if (code === 62) row.color = Number(raw);
      continue;
    }

    if (!current) continue;
    if (code === 8 && current.layer === null) { current.layer = raw; continue; }

    if (current.type === 'poly') {
      if (code === 70) { current.closed = Number(raw) === 1; continue; }
      // The first 10/20 pair belongs to the POLYLINE header (always 0,0 in R12);
      // every pair after it is a VERTEX.
      if (code === 10) { current._x = Number(raw); continue; }
      if (code === 20) {
        if (current._seenHeader) current.pts.push([current._x, Number(raw)]);
        else current._seenHeader = true;
        continue;
      }
    } else if (current.type === 'circle') {
      if (code === 10) { current.cx = Number(raw); continue; }
      if (code === 20) { current.cy = Number(raw); continue; }
      if (code === 40) { current.r = Number(raw); continue; }
    } else if (current.type === 'text') {
      if (code === 10 && current.x == null) { current.x = Number(raw); continue; }
      if (code === 20 && current.y == null) { current.y = Number(raw); continue; }
      if (code === 40) { current.h = Number(raw); continue; }
      if (code === 1) { current.str = raw; continue; }
    }
  }
  flush();

  for (const e of entities) { delete e._x; delete e._seenHeader; }
  return { sections, entities, layerTable };
}
