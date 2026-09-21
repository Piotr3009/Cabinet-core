// ─── T71 · THE SHEET LAW: ONE FRAME, ONE TITLE STRIP, FIXED ZONES ───────────
//
// The owner, 21.09.2026, with Skylon Joinery's own set for 3-7 Herbal Hill on
// the table: *"nasze w CC teraz się nakładają, a tutaj jest wszystko osobno"*,
// and, on the mock-up: *"mega profesjonalnie, nie zapomnij zostawić w stopce
// miejsca na firmę, daty, nazwy"*, then *"żeby tylko odzwierciedlało
// rzeczywistość, nóżki żeby były takie jak wszędzie"*.
//
// This module is the LAYOUT half of that: every sheet of the set is an A3
// landscape with the same frame, the same title strip across the whole width,
// the same column down the right (key plan, legend, notes) and a drawing box
// whose object sits in the middle with a 26 mm dimension band on every side.
// Nothing enters another zone, which is why nothing overlaps. What goes INTO
// the object area is another module's business; this one only places it.
//
// Everything here is PAPER millimetres, Y UP, exactly as `sheet.js` holds a
// card. `layoutSheet` (the unit card's own layout) is not touched: the card is
// pinned by iron rule 4 and draws tonight exactly what it drew yesterday.
//
// Pure functions: no React, no store imports, no jsPDF.

import { PAGE_FORMATS } from './sheet.js';
import {
  boundsOf, entLine as line, entRect as rect, entText as text, entPoly as poly,
} from './primitives.js';
import { roomWalls } from '../room.js';
import { wallLabel } from './wallElevation.js';

/** The A3 landscape every set sheet is printed on. */
export function setPage(profile) {
  const f = PAGE_FORMATS[String(profile.drawings.set.format || 'A3').toUpperCase()] || PAGE_FORMATS.A3;
  return { id: f.id, label: f.label, orientation: 'landscape', width: f.long, height: f.short };
}

/**
 * THE ZONES, in paper mm. `column` false gives the drawing box the whole width
 * (the cover and the cut list carry no key plan).
 */
export function setZones(profile, { column = true, caption = true } = {}) {
  const S = profile.drawings.set;
  const page = setPage(profile);
  const m = S.margin;
  const frame = { x: m, y: m, w: page.width - m * 2, h: page.height - m * 2 };
  const title = { x: frame.x, y: frame.y, w: frame.w, h: S.titleHeight };
  const col = column
    ? { x: frame.x + frame.w - S.columnWidth, y: title.y + title.h, w: S.columnWidth, h: frame.h - title.h }
    : null;
  const box = { x: frame.x, y: title.y + title.h, w: frame.w - (col ? col.w : 0), h: frame.h - title.h };
  const cap = caption ? S.captionHeight : 0;
  const object = {
    x: box.x + S.band, y: box.y + S.band, w: box.w - S.band * 2, h: box.h - cap - S.band * 2,
  };
  return { page, frame, title, column: col, box, object, captionHeight: cap };
}

/**
 * The scale a drawing is placed at: the largest rung of the set's ladder at
 * which it still fits the object area, and the exact fit (printed as NTS) when
 * no rung does. A 4420 mm run on A3 lands on 1:20; a 2400 mm section on 1:15.
 *
 * @returns {{scale:number, label:string, onLadder:boolean}}
 */
export function chooseSetScale(bounds, object, profile) {
  const S = profile.drawings.set;
  const w = Math.max(1, Number(bounds?.w) || 1);
  const h = Math.max(1, Number(bounds?.h) || 1);
  const maxW = object.w * S.fillMax;
  const maxH = object.h * S.fillMax;
  for (const s of [...S.scales].sort((a, b) => a - b)) {
    if (w / s <= maxW && h / s <= maxH) return { scale: s, label: `1:${s} @ ${setPage(profile).id}`, onLadder: true };
  }
  const scale = Math.max(w / maxW, h / maxH);
  return { scale, label: 'NTS', onLadder: false };
}

/**
 * The context a builder draws its dimensions in once the scale is known: how
 * many DRAWING millimetres a paper millimetre is, and the paper sizes of text
 * and bands expressed in drawing millimetres, so that after placement every
 * figure on the sheet is exactly `set.textHeight` tall whatever the scale.
 */
export function drawingContext(scale, profile) {
  const S = profile.drawings.set;
  const mm = (paper) => paper * scale;
  return {
    scale,
    mm,
    textHeight: mm(S.textHeight),
    labelHeight: mm(S.labelHeight),
    unitNumberHeight: mm(S.unitNumberHeight),
    chainFirst: mm(S.chainFirst),
    chainSecond: mm(S.chainSecond),
    chainThird: mm(S.chainThird),
    band: mm(S.band),
  };
}

/** The extent of the geometry alone: no chains, no words. */
function geometryBounds(entities) {
  return boundsOf(entities.filter((e) => e.layer !== 'DIMENSIONS' && e.kind !== 'text'));
}

/** Scale and move one drawing-mm entity onto the paper. */
function placeEntity(e, place, scale, minText) {
  if (e.kind === 'line') {
    const [x1, y1] = place(e.x1, e.y1); const [x2, y2] = place(e.x2, e.y2);
    return { ...e, x1, y1, x2, y2 };
  }
  if (e.kind === 'rect') {
    const [x, y] = place(e.x, e.y);
    return { ...e, x, y, w: e.w / scale, h: e.h / scale };
  }
  if (e.kind === 'circle') {
    const [cx, cy] = place(e.cx, e.cy);
    return { ...e, cx, cy, r: e.r / scale };
  }
  if (e.kind === 'poly') {
    return { ...e, pts: (e.pts || []).map((p) => place(p[0], p[1])) };
  }
  if (e.kind === 'text') {
    const [x, y] = place(e.x, e.y);
    // A figure set in DRAWING mm is scaled and floored; one that names its
    // paper height keeps it, which is how every dimension on the set reads
    // at one size.
    const height = e.paperHeight != null ? e.paperHeight : Math.max(minText, e.height / scale);
    return { ...e, x, y, height };
  }
  if (e.kind === 'image') {
    const [x, y] = place(e.x, e.y);
    return { ...e, x, y, w: e.w / scale, h: e.h / scale };
  }
  return e;
}

/**
 * FIT A BUILT DRAWING INTO A PAPER BOX: the cover's picture is the perspective
 * built once more and shrunk into its frame. Geometry scales to fit and is
 * centred; every word is set at one paper height so the small picture stays
 * legible. Returns paper-mm entities.
 */
export function fitEntities(entities, box, { textHeight = 2.2, fill = 0.96 } = {}) {
  const b = geometryBounds(entities);
  const scale = Math.max(b.w / (box.w * fill), b.h / (box.h * fill), 1e-9);
  const ox = box.x + (box.w - b.w / scale) / 2 - b.x / scale;
  const oy = box.y + (box.h - b.h / scale) / 2 - b.y / scale;
  const place = (x, y) => [ox + x / scale, oy + y / scale];
  return entities.map((e) => {
    const p = placeEntity(e, place, scale, textHeight);
    if (p.kind !== 'text') return p;
    const { paperHeight, ...rest } = p;
    return { ...rest, height: textHeight };
  });
}

/**
 * LAY ONE DRAWING ON A SET SHEET.
 *
 * @param {object} args
 *   drawing   { measure: () => bounds (drawing mm, the solid geometry only),
 *               build: (ctx) => { entities } (drawing mm, Y up; may include the
 *               chains, built with ctx.textHeight and ctx.chainFirst so they
 *               land in the bands) }
 *             or { paper: true, build: (zones) => entities } for a sheet that
 *             is laid in paper mm directly (cover, cut list).
 *   scaleAt   a fixed denominator to use instead of choosing (sections share
 *             one across a sheet); null chooses
 *   title     the title block's cells (see titleStrip)
 *   caption   { title, sub }
 *   column    { room, highlight, arrow, legend, notes } or false
 *   profile
 * @returns {{entities, width, height, scale, scaleLabel, format, zones}}
 */
export function layoutSetSheet({
  drawing, scaleAt = null, title = {}, caption = null, column = false, profile,
}) {
  const S = profile.drawings.set;
  const zones = setZones(profile, { column: Boolean(column), caption: Boolean(caption) });
  const entities = [];
  let scale = 1;
  let scaleLabel = 'n/a';

  if (drawing?.paper) {
    entities.push(...(drawing.build(zones) || []));
  } else if (drawing) {
    // A drawing that cannot say its extent cheaply is built once at 1:1 to
    // measure its GEOMETRY (chains and words excluded), then built again at
    // the chosen scale. Sections and plans take this road; the elevation
    // knows its run and measures directly.
    const bounds = typeof drawing.measure === 'function'
      ? drawing.measure()
      : geometryBounds((drawing.build(drawingContext(1, profile)) || {}).entities || []);
    const chosen = scaleAt
      ? { scale: scaleAt, label: `1:${scaleAt} @ ${zones.page.id}`, onLadder: true }
      : (drawing.nts
        // A picture (the perspective) has no scale to print: it fills the area.
        ? { scale: Math.max(bounds.w / (zones.object.w * S.fillMax), bounds.h / (zones.object.h * S.fillMax)), label: 'NTS', onLadder: false }
        : chooseSetScale(bounds, zones.object, profile));
    scale = chosen.scale;
    scaleLabel = chosen.label;
    const ctx = drawingContext(scale, profile);
    const built = drawing.build(ctx) || { entities: [] };
    // The SOLID is centred in the object area; the chains it built hang in
    // the bands around it, which is where the band width came from.
    const ox = zones.object.x + (zones.object.w - bounds.w / scale) / 2 - bounds.x / scale;
    const oy = zones.object.y + (zones.object.h - bounds.h / scale) / 2 - bounds.y / scale;
    const place = (x, y) => [ox + x / scale, oy + y / scale];
    for (const e of built.entities || []) entities.push(placeEntity(e, place, scale, S.minTextHeight));
    if (typeof built.afterPlace === 'function') entities.push(...(built.afterPlace({ place, scale, zones }) || []));
  }

  // The label the strip prints is the label the sheet reports: a caller may
  // name it (NTS on a picture), and the index on the cover reads it back.
  const printed = title.scale ?? scaleLabel;
  entities.push(...sheetFrame(zones, profile));
  entities.push(...titleStrip(zones, { ...title, scale: printed, paper: zones.page.id }, profile));
  if (column) entities.push(...sideColumn(zones, column, profile));
  if (caption) entities.push(...captionBlock(zones, caption, profile));

  return {
    entities, width: zones.page.width, height: zones.page.height, scale, scaleLabel: printed, format: zones.page, zones,
  };
}

// ─── the frame ───────────────────────────────────────────────────────────────

function sheetFrame(zones) {
  const f = zones.frame;
  const out = [{ ...rect('FRAME', f.x, f.y, f.w, f.h), pen: 'OUTLINE' }];
  // Fold marks at the quarters, fine and outside the frame.
  for (const q of [0.25, 0.5, 0.75]) {
    const x = f.x + f.w * q;
    out.push({ ...line('FRAME_LIGHT', x, f.y + f.h, x, f.y + f.h + 2), pen: 'FINE' });
  }
  if (zones.column) {
    out.push({ ...line('FRAME', zones.column.x, zones.column.y, zones.column.x, zones.column.y + zones.column.h), pen: 'VISIBLE' });
  }
  return out;
}

// ─── the title strip ─────────────────────────────────────────────────────────

/** A muted label: the small grey word over a title-block value. */
const label = (x, y, s) => ({
  ...text('SHEET_MUTED', x, y, s, 1.7, 'left'), tracking: 0.12,
});
const value = (x, y, s, height = 2.7, extra = {}) => ({ ...text('FRAME', x, y, s, height, 'left'), ...extra });

/**
 * THE TITLE STRIP across the whole width: status · company · client · project
 * and drawing · drawn, checked, date · job and scale · rev and sheet. Every
 * cell reads its words from `title`; a word nobody has typed prints as the
 * empty string, never as a made-up name.
 */
export function titleStrip(zones, title, profile) {
  const S = profile.drawings.set;
  const t = zones.title;
  const top = t.y + t.h;
  const out = [{ ...rect('FRAME', t.x, t.y, t.w, t.h), pen: 'OUTLINE' }];
  const xs = [t.x];
  let cx = t.x;
  for (const w of S.titleCells) { cx += w; xs.push(cx); }
  // The last cell absorbs any rounding so the strip always reaches the frame.
  xs[xs.length - 1] = t.x + t.w;
  for (let i = 1; i < xs.length - 1; i += 1) out.push({ ...line('FRAME', xs[i], t.y, xs[i], top), pen: 'VISIBLE' });

  const company = { ...S.company, ...(title.company || {}) };
  const str = (v) => (v == null ? '' : String(v));

  // 1 · STATUS
  let c = xs[0];
  out.push(label(c + 2, top - 3, 'STATUS'));
  S.statuses.forEach(([k, name], i) => {
    const yy = top - 8.5 - i * 5.6;
    out.push({ ...rect('FRAME', c + 2, yy - 2, 4, 4), pen: 'THIN', ...(title.status === k ? { fill: '#151515' } : {}) });
    out.push({ ...text(title.status === k ? 'FRAME' : 'SHEET_MUTED', c + 8, yy, `${k}   ${name}`, 2.2, 'left') });
  });
  out.push({ ...line('SHEET_MUTED', c + 2, t.y + 4.5, c + S.titleCells[0] - 2, t.y + 4.5), pen: 'FINE' });
  out.push(label(c + 2, t.y + 2.2, 'Approved:                    Date:'));

  // 2 · COMPANY (logo box, name, tagline, contact lines)
  c = xs[1];
  // The placeholder is sheet furniture, named so (`meta`): a census of the
  // drawing's own dashed lines can leave it out by name.
  out.push({ ...rect('SHEET_MUTED', c + 2.5, t.y + 4, 24, 24), pen: 'FINE', hidden: true, meta: 'logo' });
  out.push({ ...text('SHEET_MUTED', c + 14.5, t.y + 17.5, company.logo ? '' : 'LOGO', 2.6), tracking: 0.3 });
  out.push({ ...text('SHEET_MUTED', c + 14.5, t.y + 13.5, company.logo ? '' : '(Settings)', 1.7) });
  out.push(value(c + 30, top - 8, str(company.name), 4.4, { weight: 'bold', tracking: 0.2 }));
  out.push({ ...text('SHEET_MUTED', c + 30, top - 12.2, str(company.tagline), 1.9, 'left'), tracking: 0.35 });
  (company.lines || []).slice(0, 3).forEach((l, i) => out.push({ ...text('SHEET_MUTED', c + 30, top - 17.5 - i * 3.4, str(l), 2.1, 'left') }));

  // 3 · CLIENT
  c = xs[2];
  out.push(label(c + 2, top - 3, 'CLIENT'));
  out.push(value(c + 2, top - 7.5, str(title.client)));
  out.push(label(c + 2, top - 14, 'SITE ADDRESS'));
  out.push(value(c + 2, top - 18.5, str(title.address)));
  out.push(label(c + 2, top - 25, 'PROPERTY OF'));
  out.push({ ...text('SHEET_MUTED', c + 2, top - 29, company.name ? `${company.name}. Not to be copied without consent.` : '', 1.7, 'left') });

  // 4 · PROJECT / DRAWING
  c = xs[3];
  out.push(label(c + 2, top - 3, 'PROJECT'));
  out.push(value(c + 2, top - 7.5, str(title.project)));
  out.push(label(c + 2, top - 14, 'DRAWING'));
  out.push(value(c + 2, top - 19, str(title.drawing), 3.3, { weight: 'bold' }));
  out.push(label(c + 2, top - 25, 'DRAWING No'));
  out.push(value(c + 2, top - 29, str(title.drawingNo)));

  // 5 · DRAWN / CHECKED / DATE
  c = xs[4];
  out.push(label(c + 2, top - 3, 'DRAWN')); out.push(value(c + 2, top - 7.5, str(title.drawn)));
  out.push(label(c + 2, top - 14, 'CHECKED')); out.push(value(c + 2, top - 18.5, str(title.checked)));
  out.push(label(c + 2, top - 25, 'DATE')); out.push(value(c + 2, top - 29, str(title.date)));

  // 6 · JOB / SCALE / PAPER
  c = xs[5];
  out.push(label(c + 2, top - 3, 'JOB No')); out.push(value(c + 2, top - 7.5, str(title.job)));
  out.push(label(c + 2, top - 14, 'SCALE')); out.push(value(c + 2, top - 18.5, str(title.scale)));
  out.push(label(c + 2, top - 25, 'PAPER')); out.push(value(c + 2, top - 29, str(title.paper)));

  // 7 · REV / SHEET
  c = xs[6];
  const cw = xs[7] - xs[6];
  out.push(label(c + 2, top - 3, 'REV'));
  out.push({ ...text('FRAME', c + cw / 2, top - 10, str(title.rev), 7), weight: 'bold' });
  out.push(label(c + 2, top - 18, 'SHEET'));
  out.push({ ...text('FRAME', c + cw / 2, top - 25, `${str(title.sheet)} / ${str(title.of)}`, 4), weight: 'bold' });
  return out;
}

// ─── the caption ─────────────────────────────────────────────────────────────

function captionBlock(zones, caption, profile) {
  const S = profile.drawings.set;
  const b = zones.box;
  const top = b.y + b.h;
  const out = [];
  const t = String(caption.title || '');
  const sub = String(caption.sub || '');
  out.push({ ...text('FRAME', b.x + 6, top - 7, t, 3.6, 'left'), weight: 'bold', tracking: 0.25 });
  if (sub) out.push({ ...text('SHEET_MUTED', b.x + 6, top - 11.2, sub, 2.2, 'left') });
  const w = Math.max(t.length * 3.6 * 0.62, sub.length * 2.2 * 0.55) + 2;
  out.push({ ...line('FRAME', b.x + 6, top - 13.5, b.x + 6 + Math.min(w, b.w - 12), top - 13.5), pen: 'VISIBLE' });
  void S;
  return out;
}

// ─── the column: key plan, legend, notes ─────────────────────────────────────

/**
 * THE KEY PLAN: the room's own walls, small, with the wall this sheet is
 * about filled in and an arrow saying which way the elevation looks. Read off
 * `roomWalls(room)`, so an L-shaped room draws as an L.
 */
export function keyPlan(zones, { room = null, highlight = null, arrow = true }, profile) {
  const out = [];
  const c = zones.column;
  const x = c.x + 4;
  const w = c.w - 8;
  const h = 34;
  const y = c.y + c.h - 8 - h;
  out.push({ ...text('SHEET_MUTED', x, y + h + 2.2, 'KEY PLAN', 2, 'left'), tracking: 0.3 });
  out.push({ ...rect('SHEET_MUTED', x, y, w, h), pen: 'FINE' });
  const walls = room ? roomWalls(room) : [];
  if (!walls.length) return out;
  const xs = walls.flatMap((wl) => [wl.start.x, wl.end.x]);
  const ys = walls.flatMap((wl) => [wl.start.y, wl.end.y]);
  const bx0 = Math.min(...xs); const bx1 = Math.max(...xs);
  const by0 = Math.min(...ys); const by1 = Math.max(...ys);
  const inner = { x: x + 7, y: y + 5, w: w - 14, h: h - 10 };
  const s = Math.max((bx1 - bx0) / inner.w, (by1 - by0) / inner.h, 1e-6);
  const ox = inner.x + (inner.w - (bx1 - bx0) / s) / 2;
  const oy = inner.y + (inner.h - (by1 - by0) / s) / 2;
  // The room's plan y grows INTO the room from wall 0 in the engine's frame;
  // on paper it is drawn as it lies, Y up, with wall A at the bottom.
  const P = (px, py) => [ox + (px - bx0) / s, oy + (py - by0) / s];
  for (const wl of walls) {
    const [x1, y1] = P(wl.start.x, wl.start.y); const [x2, y2] = P(wl.end.x, wl.end.y);
    out.push({ ...line('BUILDING', x1, y1, x2, y2), pen: 'VISIBLE' });
    const [lx, ly] = P(
      (wl.start.x + wl.end.x) / 2 - wl.inward.x * (s * 3.2),
      (wl.start.y + wl.end.y) / 2 - wl.inward.y * (s * 3.2),
    );
    out.push({ ...text('SHEET_MUTED', lx, ly, wallLabel(wl.index), 2) });
    if (highlight != null && wl.index === highlight) {
      const depth = s * 4; // a 4 mm band on paper, inside the wall
      const q = [
        P(wl.start.x, wl.start.y),
        P(wl.end.x, wl.end.y),
        P(wl.end.x + wl.inward.x * depth, wl.end.y + wl.inward.y * depth),
        P(wl.start.x + wl.inward.x * depth, wl.start.y + wl.inward.y * depth),
      ];
      out.push({ ...poly('DOORS', q, { fill: '#f4e6f4' }), pen: 'THIN' });
      if (arrow) {
        const mx = (wl.start.x + wl.end.x) / 2; const my = (wl.start.y + wl.end.y) / 2;
        const a0 = P(mx + wl.inward.x * s * 16, my + wl.inward.y * s * 16);
        const a1 = P(mx + wl.inward.x * s * 7, my + wl.inward.y * s * 7);
        out.push({ ...line('FRAME', a0[0], a0[1], a1[0], a1[1]), pen: 'VISIBLE' });
        const dx = a1[0] - a0[0]; const dy = a1[1] - a0[1];
        const len = Math.hypot(dx, dy) || 1; const ux = dx / len; const uy = dy / len;
        const tip = [a1[0] + ux * 2, a1[1] + uy * 2];
        out.push({ ...poly('FRAME', [tip, [a1[0] - uy * 1.3, a1[1] + ux * 1.3], [a1[0] + uy * 1.3, a1[1] - ux * 1.3]], { fill: '#151515' }), pen: 'FINE' });
      }
    }
  }
  void profile;
  return out;
}

/** The legend rows every set sheet shares: the owner's colour convention. */
export const SET_LEGEND = [
  ['line', 'DOORS', 'Fronts (doors, drawer fronts)'],
  ['line', 'CARCASE', 'Carcass'],
  ['dash', 'SHELVES', 'Hidden / above the cut'],
  ['text', 'UNIT_NUMBER', 'Unit number'],
  ['box', 'HINGES', 'Hardware, appliance space'],
  ['line', 'BUILDING', 'Building (walls, floor, ceiling)'],
  ['line', 'DIMENSIONS', 'Dimensions in mm'],
];

function legendBlock(zones, rows, y0) {
  const out = [];
  const c = zones.column;
  const x = c.x + 4;
  out.push({ ...text('SHEET_MUTED', x, y0 + 2.2, 'LEGEND', 2, 'left'), tracking: 0.3 });
  // Every swatch is named `legend` (`meta`): it wears a geometry layer's
  // colour to show the convention, and a census of the drawing leaves it out
  // by that name rather than by guessing.
  rows.forEach(([kind, layer, name], i) => {
    const yy = y0 - 1.5 - i * 4.2;
    if (kind === 'line') out.push({ ...line(layer, x, yy, x + 8, yy), pen: 'VISIBLE', meta: 'legend' });
    if (kind === 'dash') out.push({ ...line(layer, x, yy, x + 8, yy), pen: 'HIDDEN', hidden: true, meta: 'legend' });
    if (kind === 'text') out.push({ ...text(layer, x + 4, yy, '01', 2.4), weight: 'bold', meta: 'legend' });
    if (kind === 'box') out.push({ ...rect(layer, x, yy - 1.5, 8, 3), pen: 'THIN', meta: 'legend' });
    out.push(text('FRAME', x + 10.5, yy, name, 2, 'left'));
  });
  return { entities: out, bottom: y0 - 1.5 - rows.length * 4.2 };
}

/** Break a sentence into rows of at most `maxChars` characters, on spaces. */
export function wrapWords(s, maxChars) {
  const rows = [];
  let cur = '';
  for (const wd of String(s).split(' ')) {
    if ((`${cur} ${wd}`).trim().length > maxChars && cur) { rows.push(cur); cur = wd; } else cur = (`${cur} ${wd}`).trim();
  }
  if (cur) rows.push(cur);
  return rows;
}

function notesBlock(zones, lines, y0, heading = 'NOTES') {
  const out = [];
  const c = zones.column;
  const x = c.x + 4;
  const w = c.w - 8;
  out.push({ ...text('SHEET_MUTED', x, y0 + 2.2, heading, 2, 'left'), tracking: 0.3 });
  out.push({ ...line('SHEET_MUTED', x, y0 + 0.2, x + w, y0 + 0.2), pen: 'FINE' });
  let yy = y0 - 2.4;
  const maxChars = Math.floor(w / (2 * 0.55));
  lines.forEach((l, i) => {
    const rows = wrapWords(l, maxChars);
    rows.forEach((r, j) => { out.push(text('FRAME', x + (j ? 3.2 : 0), yy, (j ? '' : `${i + 1}. `) + r, 2, 'left')); yy -= 3.1; });
    yy -= 0.8;
  });
  return out;
}

function sideColumn(zones, column, profile) {
  const out = [];
  const c = zones.column;
  out.push(...keyPlan(zones, column, profile));
  let y = c.y + c.h - 8 - 34 - 10;
  if (column.legend !== false) {
    const lg = legendBlock(zones, column.legend || SET_LEGEND, y);
    out.push(...lg.entities);
    y = lg.bottom - 8;
  }
  if (Array.isArray(column.notes) && column.notes.length) out.push(...notesBlock(zones, column.notes, y));
  return out;
}

/** The notes every drawing sheet carries unless the project says otherwise. */
export const SET_NOTES = [
  'All dimensions in millimetres. Do not scale off this drawing; work to figured dimensions.',
  'Carcass and fronts as the cut list, sheet with the materials.',
  'Appliances and worktop are shown for position only, supplied by others unless stated.',
  'Site dimensions to be checked before cutting.',
];
