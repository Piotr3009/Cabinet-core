// === T78 F21 - THE SPRAYING PAGE ON PAPER (CLAUDE.md PART F) =================
//
// *"Export PDF: the same page, landscape, in the T71 report frame."*  The
// schedule `engine/spray.js sprayScheduleFor` builds is laid onto A3 landscape
// sheets through T71's own law (`setSheet.js layoutSetSheet`: the frame, the
// title strip across the whole width, the caption, the drawing box), the way
// the cover and the cut list are (`setPaper.js`). Paper millimetres, Y up.
//
// Three kinds of sheet, in the order the page shows them:
//   PART A  the SPRAYING INFORMATION card and the elements by colour, as many
//           sheets as the lines need;
//   PART B  the cards, one per rule that is not "all around": the board
//           unfolded (face, back, edges drawn THICKER than true and said so),
//           the painted areas filled, the rule's numbers, the area broken down,
//           the parts of the job under it;
//   PART C  the paint per colour: m2, coats, coverage, waste, litres, tins,
//           which material, the price or its absence.
//
// `unfoldedLayout` is shared with the screen (components/SprayingPanel.jsx
// draws the same rectangles in SVG), so the card on the glass and the card on
// paper cannot disagree about which face is painted.
//
// Pure functions: no React, no store, no jsPDF. Plain ASCII throughout.

import { entLine as line, entRect as rect, entText as text } from './primitives.js';
import { layoutSetSheet } from './setSheet.js';
import { titleFor } from './wallSheets.js';

const muted = (x, y, s, h = 2, align = 'left', extra = {}) => ({ ...text('SHEET_MUTED', x, y, s, h, align), ...extra });
const ink = (x, y, s, h = 2.4, align = 'left', extra = {}) => ({ ...text('FRAME', x, y, s, h, align), ...extra });
const rule = (x1, y, x2, pen = 'FINE', layer = 'SHEET_MUTED') => ({ ...line(layer, x1, y, x2, y), pen });
const swatch = (x, y, hex, w = 5, h = 3.2) => ({ ...rect('FRAME', x, y, w, h), pen: 'THIN', ...(hex ? { fill: hex } : {}) });

const f2 = (v) => (Number(v) || 0).toFixed(2);
const f3 = (v) => (Number(v) || 0).toFixed(3);
const clip = (s, max) => { const t = String(s ?? ''); return t.length > max ? `${t.slice(0, Math.max(0, max - 1))}~` : t; };

/** The columns of PART A, in paper mm from the table's left edge. */
const PART_A_COLUMNS = Object.freeze([
  { id: 'no', label: '#', w: 8, align: 'left' },
  { id: 'units', label: 'Unit no.', w: 24, align: 'left' },
  { id: 'element', label: 'Element', w: 44, align: 'left' },
  { id: 'code', label: 'Paint code', w: 34, align: 'left' },
  { id: 'size', label: 'Size (w x h x t)', w: 40, align: 'left' },
  { id: 'm2Each', label: 'm2 each', w: 17, align: 'right' },
  { id: 'qty', label: 'Qty', w: 10, align: 'right' },
  { id: 'm2', label: 'm2', w: 17, align: 'right' },
  { id: 'edgesLm', label: 'Edges lm', w: 17, align: 'right' },
  { id: 'note', label: 'Additional info', w: 0, align: 'left' },
]);

// --- the board unfolded -------------------------------------------------------

/**
 * THE UNFOLDED BOARD AS RECTANGLES: the face with its four edges round it, the
 * back beside it, every rectangle saying whether it is painted. In the
 * board's own millimetres first (Y up), then fitted into `box` (w x h, paper
 * mm or pixels, the caller's unit) by one scale.
 *
 * The EDGES ARE DRAWN THICKER THAN TRUE: a 25 mm edge on a 900 mm board is a
 * hairline at any scale a card has, so an edge is drawn `edgeDrawnMm` wide
 * (never under 8 percent of the board's shorter side) and the card says so in
 * `note`. The areas on the card are the law's arithmetic, never read off the
 * drawing.
 *
 * @param {object} unfolded  `engine/spray.js unfoldBoard`'s record
 * @param {{w:number, h:number}} box
 * @returns {{ scale:number, edgeDrawnMm:number, note:string, width:number, height:number,
 *             items:Array<{kind:string, side?:string, x:number, y:number, w:number, h:number, painted:boolean, label:string}>,
 *             labels:Array<{x:number, y:number, text:string}> }}
 */
export function unfoldedLayout(unfolded, box) {
  const w = Math.max(1, Number(unfolded?.w) || 1);
  const h = Math.max(1, Number(unfolded?.h) || 1);
  const t = Math.max(0, Number(unfolded?.t) || 0);
  const et = Math.max(t, 0.08 * Math.min(w, h));
  const gap = Math.max(et * 1.5, 0.08 * w);
  const totalW = 2 * et + w + gap + w;
  const totalH = 2 * et + h + 0.22 * h;      // the labels under the two boards
  const scale = Math.min((box?.w || totalW) / totalW, (box?.h || totalH) / totalH);
  const items = [];
  const labels = [];
  const face = unfolded?.face || { painted: 'none' };
  const back = unfolded?.back || { painted: 'none' };
  const edges = unfolded?.edges || {};
  const push = (kind, side, x, y, rw, rh, painted, label) => items.push({ kind, side, x, y, w: rw, h: rh, painted: Boolean(painted), label });

  // The face, and what of it is painted.
  const fx = et; const fy = et;
  push('face', null, fx, fy, w, h, face.painted === 'all' || face.painted === 'after gluing', face.label || 'face');
  if (face.painted === 'strip') {
    const s = Math.min(Number(face.stripMm) || 0, w);
    const sx = face.side === 'right' ? fx + w - s : fx;
    push('region', 'strip', sx, fy, s, h, true, `${s} mm strip at the door side`);
  }
  // The edges round the face: a value of 'all' paints the whole edge, a number
  // paints that many mm from the door side (the left end), 'none' leaves it.
  const edgeRun = (side, x, y, rw, rh, horizontal) => {
    const v = edges[side] ?? 'none';
    if (v === 'all') { push('edge', side, x, y, rw, rh, true, `${side} edge`); return; }
    push('edge', side, x, y, rw, rh, false, `${side} edge`);
    const mm = Number(v);
    if (Number.isFinite(mm) && mm > 0) {
      if (horizontal) push('region', `${side}-part`, x, y, Math.min(mm, rw), rh, true, `${side} edge, ${mm} mm`);
      else push('region', `${side}-part`, x, y, rw, Math.min(mm, rh), true, `${side} edge, ${mm} mm`);
    }
  };
  edgeRun('left', 0, fy, et, h, false);
  edgeRun('right', fx + w, fy, et, h, false);
  edgeRun('bottom', fx, 0, w, et, true);
  edgeRun('top', fx, fy + h, w, et, true);

  // The back, beside the face, with its frame when the rule paints one.
  const bx = 2 * et + w + gap; const by = et;
  push('back', null, bx, by, w, h, back.painted === 'all', back.label || 'back');
  if (back.painted === 'frame') {
    const f = Math.min(Number(back.frameMm) || 0, w / 2, h / 2);
    push('region', 'frame-bottom', bx, by, w, f, true, `${f} mm frame`);
    push('region', 'frame-top', bx, by + h - f, w, f, true, `${f} mm frame`);
    push('region', 'frame-left', bx, by + f, f, Math.max(0, h - 2 * f), true, `${f} mm frame`);
    push('region', 'frame-right', bx + w - f, by + f, f, Math.max(0, h - 2 * f), true, `${f} mm frame`);
  }
  labels.push({ x: fx + w / 2, y: -0.1 * h, text: `FACE${face.label ? ` (${face.label})` : ''}` });
  labels.push({ x: bx + w / 2, y: -0.1 * h, text: `BACK${back.label ? ` (${back.label})` : ''}` });

  const sc = (v) => v * scale;
  return {
    scale,
    edgeDrawnMm: Math.round(et * 10) / 10,
    note: `Edges drawn ${Math.round(et * 10) / 10} mm wide for the eye; the board is ${t} mm. Areas are the rule's arithmetic, not the drawing's.`,
    width: sc(totalW),
    height: sc(2 * et + h),
    labelDrop: sc(0.1 * h),
    items: items.map((i) => ({ ...i, x: sc(i.x), y: sc(i.y), w: sc(i.w), h: sc(i.h) })),
    labels: labels.map((l) => ({ ...l, x: sc(l.x), y: sc(l.y) })),
  };
}

// --- PART A -------------------------------------------------------------------

function infoCard(zones, schedule, { left, right, top }) {
  const out = [];
  const info = schedule.info;
  const y0 = top;
  out.push(muted(left, y0, 'SPRAYING INFORMATION', 2.6, 'left', { tracking: 0.5 }));
  out.push(rule(left, y0 - 2.6, right, 'THIN', 'FRAME'));
  const col = (i) => left + i * ((right - left) / 4);
  const cell = (i, label, value) => {
    out.push(muted(col(i), y0 - 7, label, 1.8));
    out.push(ink(col(i), y0 - 11.2, clip(value || '', 36), 2.6));
  };
  cell(0, 'PROJECT', info.project);
  cell(1, 'JOB No / TYPE', [info.number, info.type].filter(Boolean).join(' / ') || 'not set');
  cell(2, 'DEADLINE', info.deadline || 'not set');
  cell(3, 'DATE', info.date || '');
  // The colour chips, and which sets are on.
  const cy = y0 - 18;
  out.push(muted(left, cy, 'COLOURS', 1.8));
  let cx = left + 18;
  for (const c of info.colours) {
    out.push(swatch(cx, cy - 1.3, c.hex));
    const label = `${clip(c.label, 28)} (set ${c.set}, ${f3(c.m2)} m2)`;
    out.push(ink(cx + 6.5, cy, label, 2.2));
    cx += 6.5 + Math.min(label.length * 1.35, 80) + 6;
    if (cx > right - 60) break;
  }
  const sy = cy - 5.5;
  out.push(muted(left, sy, 'SETS', 1.8));
  out.push(ink(left + 18, sy, `Set 1 (fronts and run pieces): ${info.sets.set1 ? 'ON' : 'nothing sprayed'}   |   Set 2 (veneer or sprayed carcass): ${info.sets.set2 ? 'ON' : 'off, the carcass is board'}`, 2.2));
  out.push(muted(left, sy - 4.2, `Edges ${info.edgesInM2 ? 'counted in the m2 for the paint, the lm beside them is the work' : 'in lm only'}; waste ${info.wastePct} percent; identical parts on one line.`, 1.8));
  return { entities: out, bottom: sy - 7 };
}

function tableHeader(left, right, y) {
  const out = [];
  let x = left;
  for (const c of PART_A_COLUMNS) {
    const w = c.w || (right - x);
    out.push(muted(c.align === 'right' ? x + w - 1 : x, y, c.label, 1.9, c.align === 'right' ? 'right' : 'left'));
    x += w;
  }
  out.push(rule(left, y - 2.4, right, 'THIN', 'FRAME'));
  return out;
}

function tableRow(left, right, y, l) {
  const out = [];
  const values = {
    no: String(l.no),
    units: clip(l.units.join(', '), 17),
    element: clip(l.element, 30),
    code: l.code,
    size: l.size,
    m2Each: f3(l.m2Each),
    qty: String(l.qty),
    m2: f3(l.m2),
    edgesLm: f2(l.edgesLm),
    note: l.note || '',
  };
  let x = left;
  for (const c of PART_A_COLUMNS) {
    const w = c.w || (right - x);
    const s = c.id === 'note' ? clip(values.note, Math.floor((right - x) / 1.3)) : values[c.id];
    out.push(ink(c.align === 'right' ? x + w - 1 : x, y, s, 2.2, c.align === 'right' ? 'right' : 'left'));
    x += w;
  }
  out.push(rule(left, y - 2.1, right, 'FINE'));
  return out;
}

/** PART A, paginated: the first sheet carries the information card. */
function partASheets(schedule, { project, profile, date, startNo }) {
  const rowH = 4.4;
  const pages = [];
  // Rows as the page prints them: a colour heading, then its lines.
  const rows = [];
  for (const g of schedule.groups) {
    rows.push({ kind: 'colour', group: g });
    for (const l of g.lines) rows.push({ kind: 'line', line: l });
  }
  if (!rows.length) rows.push({ kind: 'empty' });
  let i = 0;
  let pageIndex = 0;
  while (i < rows.length || pageIndex === 0) {
    const first = pageIndex === 0;
    const no = String(startNo + pageIndex).padStart(2, '0');
    const slice = { from: i };
    const build = (zones) => {
      const b = zones.box;
      const left = b.x + 6; const right = b.x + b.w - 6;
      let y = b.y + b.h - zones.captionHeight - 6;
      const out = [];
      if (first) {
        const card = infoCard(zones, schedule, { left, right, top: y });
        out.push(...card.entities);
        y = card.bottom - 4;
      }
      out.push(muted(left, y, 'PART A - ELEMENTS, BY COLOUR', 2.6, 'left', { tracking: 0.5 }));
      y -= 5;
      out.push(...tableHeader(left, right, y));
      y -= rowH;
      let k = slice.from;
      while (k < rows.length && y > b.y + 8) {
        const r = rows[k];
        if (r.kind === 'colour') {
          out.push(swatch(left, y - 1.2, r.group.hex));
          out.push(ink(left + 6.5, y, `${clip(r.group.label, 60)}   set ${r.group.set}   ${r.group.lines.length} line${r.group.lines.length === 1 ? '' : 's'}   ${f3(r.group.m2)} m2   ${f2(r.group.edgesLm)} lm`, 2.4, 'left', { weight: 'bold' }));
          out.push(rule(left, y - 2.2, right, 'THIN', 'FRAME'));
        } else if (r.kind === 'line') {
          out.push(...tableRow(left, right, y, r.line));
        } else {
          out.push(muted(left, y, 'Nothing to spray yet: add a cabinet with a door, or a run piece.', 2.2));
        }
        y -= rowH;
        k += 1;
      }
      slice.to = k;
      if (k >= rows.length) {
        y -= 1;
        out.push(rule(left, y + 2.4, right, 'THIN', 'FRAME'));
        out.push(ink(left, y, `TOTAL   ${schedule.totals.parts} parts on ${schedule.totals.lines} lines   ${f3(schedule.totals.m2)} m2   ${f2(schedule.totals.edgesLm)} lm`, 2.4, 'left', { weight: 'bold' }));
      }
      return out;
    };
    const sheet = layoutSetSheet({
      drawing: { paper: true, build },
      caption: { title: `${no} - SPRAYING - PART A - ELEMENTS${rows.length && pageIndex > 0 ? ' (continued)' : ''}`, sub: 'Every sprayed element of the job by colour, with its paint code, size, m2 each, quantity, m2 and the painted edges in running metres.' },
      title: { ...titleFor({ project, profile, no, name: 'Spraying, elements', date }), scale: 'n/a' },
      column: false,
      profile,
    });
    pages.push({ no, name: `Spraying, elements${pageIndex > 0 ? ' (cont.)' : ''}`, sheet });
    // A page that fitted nothing new would loop for ever; a build that
    // consumed no row consumed the empty marker.
    i = Math.max(slice.to ?? i + 1, i + 1);
    pageIndex += 1;
    if (i >= rows.length) break;
  }
  return pages;
}

// --- PART B -------------------------------------------------------------------

function cardEntities(card, { x, y, w, h, hex }) {
  const out = [];
  const top = y + h;
  out.push({ ...rect('FRAME', x, y, w, h), pen: 'THIN' });
  out.push(ink(x + 3, top - 4.5, `${card.title}   ${card.code}`, 2.8, 'left', { weight: 'bold' }));
  const nums = [];
  const R = card.rule || {};
  if (R.backFrameMm != null) nums.push(`frame on the back ${R.backFrameMm} mm`);
  if (R.faceStripMm != null) nums.push(`face strip ${R.faceStripMm} mm at the door side, top and bottom edges for ${R.endEdgesMm} mm`);
  if (R.sideMm != null) nums.push(`both ${R.sideMm} mm sides of each strip, painted after gluing inside the door's face`);
  if (R.topEdge) nums.push('the top edge');
  if (R.frontEdge) nums.push('the front edge');
  if (R.unitEdge) nums.push('the edge toward the unit');
  if (R.longEdges) nums.push(`${R.longEdges} long edges`);
  if (R.underside) nums.push('the underside');
  out.push(muted(x + 3, top - 8.5, clip(nums.join('; ') || 'the face', 110), 1.9));
  // The drawing, left half.
  const drawBox = { x: x + 3, y: y + 14, w: w * 0.48, h: h - 24 };
  const lay = unfoldedLayout(card.unfolded, { w: drawBox.w, h: drawBox.h - lay0(drawBox) });
  const ox = drawBox.x + (drawBox.w - lay.width) / 2;
  const oy = drawBox.y + lay.labelDrop + 2;
  for (const it of lay.items) {
    const fill = it.painted ? (hex || '#9a9a9a') : (it.kind === 'edge' || it.kind === 'face' || it.kind === 'back' ? '#f4f4f4' : null);
    out.push({ ...rect('FRAME', ox + it.x, oy + it.y, it.w, it.h), pen: 'THIN', ...(fill ? { fill } : {}) });
  }
  for (const l of lay.labels) out.push(muted(ox + l.x, oy + l.y, l.text, 1.8, 'centre'));
  out.push(muted(drawBox.x, y + 3.2, clip(lay.note, 96), 1.6));
  // The breakdown and the parts, right half.
  const rx = x + w * 0.53; let ry = top - 13;
  out.push(muted(rx, ry, 'AREA PER PART, BROKEN DOWN', 1.9, 'left', { tracking: 0.3 }));
  ry -= 3.6;
  const first = card.lines[0];
  for (const b of first?.breakdown || []) {
    out.push(ink(rx, ry, clip(b.label, 40), 2));
    out.push(ink(x + w - 3, ry, `${f3(b.m2)} m2`, 2, 'right'));
    ry -= 3.4;
  }
  out.push(rule(rx, ry + 1.2, x + w - 3, 'THIN', 'FRAME'));
  out.push(ink(rx, ry - 1.4, `one part ${first?.size || ''}`, 2));
  out.push(ink(x + w - 3, ry - 1.4, `${f3(first?.m2Each)} m2`, 2, 'right', { weight: 'bold' }));
  ry -= 7;
  out.push(muted(rx, ry, 'THE PARTS OF THIS JOB UNDER THIS CARD', 1.9, 'left', { tracking: 0.3 }));
  ry -= 3.6;
  for (const l of card.lines.slice(0, 7)) {
    out.push(ink(rx, ry, clip(`#${l.no}  units ${l.units.join(', ')}  ${l.size}  x${l.qty}`, 52), 1.9));
    out.push(ink(x + w - 3, ry, `${f3(l.m2)} m2`, 1.9, 'right'));
    ry -= 3.2;
  }
  if (card.lines.length > 7) out.push(muted(rx, ry, `and ${card.lines.length - 7} more lines`, 1.8));
  return out;
}
const lay0 = (box) => Math.max(6, box.h * 0.12);

function partBSheets(schedule, { project, profile, date, startNo }) {
  const pages = [];
  const cards = schedule.cards || [];
  if (!cards.length) return pages;
  const perPage = 4;
  for (let p = 0; p * perPage < cards.length; p += 1) {
    const no = String(startNo + p).padStart(2, '0');
    const mine = cards.slice(p * perPage, (p + 1) * perPage);
    const build = (zones) => {
      const b = zones.box;
      const left = b.x + 6; const right = b.x + b.w - 6;
      const top = b.y + b.h - zones.captionHeight - 6;
      const out = [muted(left, top, 'PART B - CARDS: THE RULES THAT ARE NOT ALL AROUND, THE BOARD UNFOLDED', 2.6, 'left', { tracking: 0.5 })];
      const gap = 6;
      const cw = (right - left - gap) / 2;
      const ch = (top - 6 - b.y - 6 - gap) / 2;
      mine.forEach((card, i) => {
        const cx = left + (i % 2) * (cw + gap);
        const cy = top - 6 - ch - Math.floor(i / 2) * (ch + gap);
        out.push(...cardEntities(card, { x: cx, y: cy, w: cw, h: ch, hex: card.lines[0]?.colour?.hex || null }));
      });
      return out;
    };
    const sheet = layoutSetSheet({
      drawing: { paper: true, build },
      caption: { title: `${no} - SPRAYING - PART B - CARDS`, sub: 'One card per rule present in the job that is not all around: face, back and edges unfolded, the painted areas filled, the rule\'s numbers, the area per part broken down.' },
      title: { ...titleFor({ project, profile, no, name: 'Spraying, cards', date }), scale: 'n/a' },
      column: false,
      profile,
    });
    pages.push({ no, name: 'Spraying, cards', sheet });
  }
  return pages;
}

// --- PART C -------------------------------------------------------------------

function partCSheet(schedule, { project, profile, date, no }) {
  const build = (zones) => {
    const b = zones.box;
    const left = b.x + 6; const right = b.x + b.w - 6;
    let y = b.y + b.h - zones.captionHeight - 6;
    const out = [muted(left, y, 'PART C - PAINT, PER COLOUR', 2.6, 'left', { tracking: 0.5 })];
    y -= 5;
    const cols = [
      ['Colour', 70, 'left'], ['Set', 10, 'right'], ['m2', 16, 'right'], ['Coats', 12, 'right'], ['Coverage m2/L', 24, 'right'],
      ['Waste', 12, 'right'], ['Litres', 14, 'right'], ['Tins', 44, 'left'], ['Paint material', 90, 'left'], ['Price', 0, 'left'],
    ];
    let x = left;
    for (const [label, w, align] of cols) {
      const cw = w || (right - x);
      out.push(muted(align === 'right' ? x + cw - 1 : x, y, label, 1.9, align === 'right' ? 'right' : 'left'));
      x += cw;
    }
    out.push(rule(left, y - 2.4, right, 'THIN', 'FRAME'));
    y -= 4.6;
    let litres = 0;
    for (const p of schedule.paint) {
      litres += p.litres;
      const tins = p.tins.map((t) => `${t.count} x ${t.sizeL} L`).join(', ') || 'none';
      const values = [
        null, String(p.set), f3(p.m2), String(p.coats), f2(p.coverage), `${p.wastePct} %`, f2(p.litres), tins,
        p.material ? clip(`${p.material.name}${p.material.type ? `, ${p.material.type}` : ''}${p.material.sheen ? `, ${p.material.sheen}` : ''}`, 60) : 'NOT ASSIGNED',
        p.priceMissing ? 'no price' : `${f2(p.pricePerUnit)} per ${p.material?.unit || 'L'} = ${f2(p.cost)}`,
      ];
      x = left;
      cols.forEach(([, w, align], i) => {
        const cw = w || (right - x);
        if (i === 0) {
          out.push(swatch(x, y - 1.2, p.colour.hex));
          out.push(ink(x + 6.5, y, clip(p.colour.label, 40), 2.2));
        } else {
          out.push(ink(align === 'right' ? x + cw - 1 : x, y, values[i], 2.2, align === 'right' ? 'right' : 'left'));
        }
        x += cw;
      });
      out.push(rule(left, y - 2.1, right, 'FINE'));
      y -= 4.4;
      if (p.says) { out.push(muted(left + 6.5, y, clip(p.says, 150), 1.8)); y -= 3.6; }
    }
    if (!schedule.paint.length) out.push(muted(left, y, 'Nothing to spray yet.', 2.2));
    y -= 2;
    out.push(ink(left, y, `Litres = m2 x coats / coverage, plus ${schedule.info.wastePct} percent waste; tins rounded UP to the material's sizes. Total ${f2(litres)} L. The lines go to BOM > Purchase list (paint, set 1 and set 2).`, 2));
    return out;
  };
  return {
    no,
    name: 'Spraying, paint',
    sheet: layoutSetSheet({
      drawing: { paper: true, build },
      caption: { title: `${no} - SPRAYING - PART C - PAINT`, sub: 'Per colour: the m2 (faces and edges), coats, coverage, waste, litres, tins, which paint material and its price; a missing price is said.' },
      title: { ...titleFor({ project, profile, no, name: 'Spraying, paint', date }), scale: 'n/a' },
      column: false,
      profile,
    }),
  };
}

/**
 * THE WHOLE SPRAYING DOCUMENT, as sheets a booklet binds in order.
 * @returns {Array<{no:string, name:string, sheet:object}>}
 */
export function spraySheets({ schedule, project = {}, profile, date = '', startNo = 1 }) {
  const a = partASheets(schedule, { project, profile, date, startNo });
  const b = partBSheets(schedule, { project, profile, date, startNo: startNo + a.length });
  const c = partCSheet(schedule, { project, profile, date, no: String(startNo + a.length + b.length).padStart(2, '0') });
  const all = [...a, ...b, c];
  // Every sheet says which it is of how many: the set's own stamp (wallSheets.js
  // `stamp`), the ' / ' cell of the title strip filled in.
  const of = String(all.length).padStart(2, '0');
  for (const page of all) {
    for (const e of page.sheet.entities) {
      if (e.kind === 'text' && e.text === ' / ' && e.layer === 'FRAME') e.text = `${page.no} / ${of}`;
    }
    page.sheet.sheetNo = page.no;
    page.sheet.sheetOf = of;
  }
  return all;
}
