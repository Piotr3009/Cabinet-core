// ─── The sheet: a frame, a title block and a scale (turn 6, CLAUDE.md F7) ───
//
// "Ramka rysunku + tabelka — to ona robi 'jak z AutoCADa'." That is the whole
// brief for this file, and it is right: the same lines printed inside a border
// with a title block read as a DRAWING, and printed on their own read as a
// screenshot of some lines. The AutoLISP never had to draw either, because
// AutoCAD's own template already carried them.
//
// The scale is chosen, not fitted: a technical drawing is at 1:10 or 1:20, not
// at 1:13.7. The largest standard scale that fits wins, so a 600 mm base unit
// comes out at 1:5 and a 3.6 m run at 1:20, and both of them say so.
//
// Everything here is in PAPER millimetres with Y up. The renderer flips Y.
//
// Pure functions — no React, no store imports, no jsPDF.

import { boundsOf } from './primitives.js';

/** Sheet sizes. Landscape is the default; a tall subject turns the paper. */
export const PAGE_FORMATS = {
  A4: { id: 'A4', label: 'A4', long: 297, short: 210 },
  A3: { id: 'A3', label: 'A3', long: 420, short: 297 },
};

export function pageFormat(id, orientation = 'landscape') {
  const f = PAGE_FORMATS[String(id).toUpperCase()] || PAGE_FORMATS.A4;
  return orientation === 'portrait'
    ? { ...f, orientation, width: f.short, height: f.long }
    : { ...f, orientation: 'landscape', width: f.long, height: f.short };
}

/**
 * The largest of the standard scales at which the drawing still fits.
 *
 * @param {{w:number,h:number}} drawing   in drawing mm
 * @param {{w:number,h:number}} area      the usable paper area, in paper mm
 * @param {number[]} steps                e.g. [5, 10, 20, 25, 50]
 * @returns {number}  the denominator: 10 means 1:10
 */
/**
 * ─── TURN 41 (F5c/F5d): THE BEST FIT, FOR A SHEET THAT PRINTS "No Scale" ────
 *
 * MEASURED FAULT. The wall sheets snap to the standard ladder [5,10,20,25,50]
 * even though their title block deliberately says "No Scale" — the owner does
 * not print to a scale, he trusts the dimensions (CLAUDE.md F5). Reproducing
 * T40's own proof sheet: a 3265 × 2957 mm wall laid at 1:20 on A3 landscape is
 * 163.3 × 147.8 mm of drawing inside a usable area of 392 × 204.5 mm.
 *
 *     AREA FILL: 30.1 %
 *
 * A small drawing floating in a large empty sheet, which is the first thing the
 * owner sees when he opens the PDF. The best fit for that wall is 1:14.46 — not
 * on the ladder, and there is no reason it should be, because nothing on this
 * sheet claims a scale.
 *
 * So a sheet may ask for the EXACT fit instead. The ladder is untouched and is
 * still what the Unit Card uses, because a Unit Card DOES print its scale and a
 * scale a joiner cannot put a rule against is worse than an empty margin.
 */
export function exactScale(drawing, area) {
  const w = Number(drawing?.w) || 0;
  const h = Number(drawing?.h) || 0;
  if (w <= 0 || h <= 0) return 1;
  // The denominator, so it reads the same way round as the ladder's numbers.
  return Math.max(w / area.w, h / area.h, 1e-6);
}

export function chooseScale(drawing, area, steps) {
  const list = [...steps].sort((a, b) => a - b);
  for (const step of list) {
    if (drawing.w / step <= area.w && drawing.h / step <= area.h) return step;
  }
  // Nothing on the list fits: the biggest one, so a drawing is produced and
  // the title block says honestly what it is at. A missing drawing helps
  // nobody; an oversized one at least shows what will not fit.
  return list[list.length - 1];
}

export function scaleLabel(denominator) {
  return `1:${denominator}`;
}

/**
 * Lay a drawing on a sheet.
 *
 * @param {object} args
 *   drawing   { entities, bounds } from buildFrontElevation
 *   format    'A4' | 'A3'
 *   title     { project, unit, view, date }
 *   profile
 * @returns {{entities:Array, width:number, height:number, scale:number, format:object}}
 *          entities in PAPER mm, Y up
 */
/**
 * Lay a drawing on a sheet, turning the paper if that draws it bigger.
 *
 * A wardrobe is 1200 × 2250 and a sheet of A3 is 420 × 297: landscape it comes
 * out at 1:20 with half the paper empty, portrait it comes out at 1:10 and
 * fills it. A drawing office turns the paper without being asked, so this does
 * too — and landscape wins a tie, because a RUN of units is wide.
 */
export function layoutSheet({
  drawing, format = 'A4', orientation = 'auto', title = {}, profile, titleRows = null, blockWidth = null,
}) {
  if (orientation === 'auto') {
    const args = { drawing, format, title, profile, titleRows, blockWidth };
    const landscape = layoutSheet({ ...args, orientation: 'landscape' });
    const portrait = layoutSheet({ ...args, orientation: 'portrait' });
    return portrait.scale < landscape.scale ? portrait : landscape;
  }
  return layoutOne({ drawing, format, orientation, title, profile, titleRows, blockWidth });
}

function layoutOne({ drawing, format, orientation, title, profile, titleRows, blockWidth }) {
  const D = profile.drawings;
  const page = pageFormat(format, orientation);
  const m = D.margin;
  // A card's title block carries more rows than an elevation's and needs more
  // room for a decor name; it says so rather than this file knowing about cards.
  const rows = titleRows?.length ? titleRows : D.titleBlock.rows;

  // The border, and the area inside it the drawing may use. The title block
  // sits in the bottom-right corner of that area and the drawing keeps clear
  // of it — a dimension running under the title block is the classic way to
  // make a sheet unreadable.
  const frame = { x: m, y: m, w: page.width - m * 2, h: page.height - m * 2 };
  const block = {
    w: Number(blockWidth) > 0 ? Number(blockWidth) : D.titleBlock.width,
    h: rows.length * D.titleBlock.rowHeight,
  };
  const area = {
    w: frame.w - D.padding * 2,
    h: frame.h - D.padding * 2 - block.h - D.padding,
  };

  // T41-F5d: a sheet whose title block says "No Scale" fills the paper; one
  // that prints a scale keeps the ladder. `fit` is opt-in per drawing, so the
  // Unit Card is laid exactly where it was laid yesterday.
  const scale = drawing.fit === true
    ? exactScale(drawing.bounds, area)
    : chooseScale(drawing.bounds, area, D.scales);
  const scaled = { w: drawing.bounds.w / scale, h: drawing.bounds.h / scale };

  // Centred in what is left, sitting on the bottom of the drawing area — an
  // elevation reads as standing on something rather than floating.
  const originX = frame.x + D.padding + Math.max(0, (area.w - scaled.w) / 2);
  const originY = frame.y + D.padding + block.h + D.padding;

  const place = (x, y) => [
    originX + (x - drawing.bounds.x) / scale,
    originY + (y - drawing.bounds.y) / scale,
  ];

  const entities = [];
  for (const e of drawing.entities) {
    if (e.kind === 'line') {
      const [x1, y1] = place(e.x1, e.y1);
      const [x2, y2] = place(e.x2, e.y2);
      entities.push({ ...e, x1, y1, x2, y2 });
    } else if (e.kind === 'rect') {
      const [x, y] = place(e.x, e.y);
      entities.push({ ...e, x, y, w: e.w / scale, h: e.h / scale });
    } else if (e.kind === 'circle') {
      const [cx, cy] = place(e.cx, e.cy);
      entities.push({ ...e, cx, cy, r: e.r / scale });
    } else if (e.kind === 'text') {
      const [x, y] = place(e.x, e.y);
      // Text does NOT scale with the drawing: a 40 mm label at 1:20 would be
      // 2 mm on paper and unreadable. It is set in paper millimetres, which is
      // how a drawing office sets it.
      entities.push({ ...e, x, y, height: e.height / scale < D.minTextHeight ? D.minTextHeight : e.height / scale });
    }
  }

  entities.push(...sheetFrame({ page, frame, block, title, scale, profile, rows }));

  return { entities, width: page.width, height: page.height, scale, format: page };
}

/** The border and the title block. */
function sheetFrame({ frame, block, title, scale, profile, rows }) {
  const D = profile.drawings;
  const out = [
    { kind: 'rect', layer: 'FRAME', x: frame.x, y: frame.y, w: frame.w, h: frame.h },
  ];

  const bx = frame.x + frame.w - block.w;
  const by = frame.y;
  out.push({ kind: 'rect', layer: 'FRAME', x: bx, y: by, w: block.w, h: block.h });

  const values = {
    'CABINET CORE': '',
    Project: title.project || 'Untitled project',
    Unit: title.unit || '—',
    View: title.view || 'Front elevation',
    Scale: scaleLabel(scale),
    Date: title.date || '',
    // Anything else the sheet has been asked to carry — a card names the type
    // and both materials, and does it through the same rows rather than
    // scattering captions across the paper.
    ...(title.extra || {}),
  };

  // Rows are listed bottom-up on paper, so the first row of the config is the
  // top line of the block — which is where a title block puts the name.
  rows.forEach((key, i) => {
    const rowY = by + block.h - (i + 1) * D.titleBlock.rowHeight;
    if (i > 0) out.push({ kind: 'line', layer: 'FRAME_LIGHT', x1: bx, y1: rowY + D.titleBlock.rowHeight, x2: bx + block.w, y2: rowY + D.titleBlock.rowHeight });
    const label = key === 'CABINET CORE' ? '' : key;
    const value = values[key] ?? '';
    if (label) {
      out.push({
        kind: 'text', layer: 'FRAME_LIGHT', x: bx + 2, y: rowY + D.titleBlock.rowHeight / 2,
        text: label, height: D.titleBlock.labelHeight, align: 'left',
      });
      out.push({
        kind: 'text', layer: 'FRAME', x: bx + D.titleBlock.labelWidth, y: rowY + D.titleBlock.rowHeight / 2,
        // A decor's attributed name is long by design ("EGGER H1180 ST37
        // Natural Halifax Oak"); the block is not going to grow to fit the
        // longest one in the catalogue, so it is cut where it stops fitting.
        text: fitInBlock(String(value), block.w - D.titleBlock.labelWidth - 2, D.titleBlock.valueHeight),
        height: D.titleBlock.valueHeight, align: 'left',
      });
    } else {
      out.push({
        kind: 'text', layer: 'FRAME', x: bx + block.w / 2, y: rowY + D.titleBlock.rowHeight / 2,
        text: key, height: D.titleBlock.titleHeight, align: 'centre', tracking: 0.18,
      });
    }
  });

  return out;
}

/**
 * Cut a title-block value where it stops fitting.
 *
 * The 0.55 is the average advance of a proportional sans face as a fraction of
 * its point size — near enough for a title block, and honest about being an
 * estimate: nothing here can measure a glyph, because nothing here is allowed
 * to know about a font (this file is tested in node).
 */
function fitInBlock(value, widthMm, textHeight) {
  const perChar = textHeight * 0.55;
  const max = Math.max(4, Math.floor(widthMm / perChar));
  if (value.length <= max) return value;
  // ASCII: this string goes into a PDF, and jsPDF's built-in faces are WinAnsi.
  return `${value.slice(0, max - 3)}...`;
}

