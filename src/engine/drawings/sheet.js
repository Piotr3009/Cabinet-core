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

import { boundsOf } from './frontElevation.js';

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
export function layoutSheet({ drawing, format = 'A4', orientation = 'auto', title = {}, profile }) {
  if (orientation === 'auto') {
    const landscape = layoutSheet({ drawing, format, orientation: 'landscape', title, profile });
    const portrait = layoutSheet({ drawing, format, orientation: 'portrait', title, profile });
    return portrait.scale < landscape.scale ? portrait : landscape;
  }
  return layoutOne({ drawing, format, orientation, title, profile });
}

function layoutOne({ drawing, format, orientation, title, profile }) {
  const D = profile.drawings;
  const page = pageFormat(format, orientation);
  const m = D.margin;

  // The border, and the area inside it the drawing may use. The title block
  // sits in the bottom-right corner of that area and the drawing keeps clear
  // of it — a dimension running under the title block is the classic way to
  // make a sheet unreadable.
  const frame = { x: m, y: m, w: page.width - m * 2, h: page.height - m * 2 };
  const block = {
    w: D.titleBlock.width,
    h: D.titleBlock.rows.length * D.titleBlock.rowHeight,
  };
  const area = {
    w: frame.w - D.padding * 2,
    h: frame.h - D.padding * 2 - block.h - D.padding,
  };

  const scale = chooseScale(drawing.bounds, area, D.scales);
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
    } else if (e.kind === 'text') {
      const [x, y] = place(e.x, e.y);
      // Text does NOT scale with the drawing: a 40 mm label at 1:20 would be
      // 2 mm on paper and unreadable. It is set in paper millimetres, which is
      // how a drawing office sets it.
      entities.push({ ...e, x, y, height: e.height / scale < D.minTextHeight ? D.minTextHeight : e.height / scale });
    }
  }

  entities.push(...sheetFrame({ page, frame, block, title, scale, profile }));

  return { entities, width: page.width, height: page.height, scale, format: page };
}

/** The border and the title block. */
function sheetFrame({ frame, block, title, scale, profile }) {
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
  };

  // Rows are listed bottom-up on paper, so the first row of the config is the
  // top line of the block — which is where a title block puts the name.
  const rows = D.titleBlock.rows;
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
        text: String(value), height: D.titleBlock.valueHeight, align: 'left',
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

/** The paper box a laid-out sheet fills — used by the tests and the preview. */
export function sheetBounds(sheet) {
  return boundsOf(sheet.entities);
}
