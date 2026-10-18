// ─── THE PART LABELS PDF (chat fix 17.10.2026) ──────────────────────────────
//
// The owner, 13:07: *"naklejki 44 na A4 bo takie mam, kolorami: 3 szafy to 3
// kolory, drugi kolor to kolor elementu, parami ten sam kolor; szuflady nie
// trzeba; napis co to; i strzalka co oklejamy"*; 13:13: *"strzalka ... zrob
// troszeczke wieksza"*; 13:15: every element numbered, the project number
// off the sticker. The mockup he saw (13:12 to 13:17) is this page: a band on
// the left in the CABINET's colour with the cabinet's name up it, a strip on
// top in the ELEMENT's colour with what the board is and its code, the cut
// size large, the part's number large, and the board as a small rectangle in
// its drawing's proportions with the banded edge thick and an arrow at it.
//
// The records and the grid are the engine's (engine/partNumbers.js, pure,
// tested in node); this file is the jsPDF half, in src/lib for the reason
// `drawingExport.js` is. The bytes go through T42 F0's own measurement
// (`assertPdfBytes`) before the word "saved" is allowed. Plain ASCII in the
// PDF text: jsPDF's built-in faces are WinAnsi.

import jsPDFDefault from 'jspdf';
import { assertPdfBytes, pdfBytes } from './drawingExport.js';
import { exportFileName } from '../engine/naming.js';
import { labelPages, labelSettings, labelSheetGrid } from '../engine/partNumbers.js';

const jsPDF = jsPDFDefault?.jsPDF || jsPDFDefault;

/** '#1b5e20' -> [27, 94, 32]; anything unreadable -> mid grey. */
function rgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return [120, 120, 120];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** mm of text height -> jsPDF's font size in points (cap height is about 0.72 of the em). */
const pt = (mm) => (mm / 0.72) * 72 / 25.4;

/**
 * THE EDGE ICON: the board as a rectangle in its drawing's proportions, inside
 * a box `bw x bh` at (bx, by); the banded edges thick in the element colour;
 * one arrow at the banded edge the sticker points to; the word under it.
 */
function drawEdgeIcon(doc, rec, bx, by, bw, bh, K = 1) {
  // K: the design scale of the sticker (16:40; drawLabel), every length of the icon takes it.
  const S = (mm) => mm * K;
  const maxW = bw - S(2);
  const maxH = bh - S(3.4);   // the word under the icon keeps its own line (a tall door's icon stopped on it)
  const ratio = rec.drawnH > 0 ? rec.drawnW / rec.drawnH : 1;
  let w = maxW;
  let h = ratio > 0 ? maxW / ratio : maxH;
  if (h > maxH) { h = maxH; w = maxH * ratio; }
  w = Math.max(S(3), Math.min(maxW, w));
  h = Math.max(S(3), Math.min(maxH, h));
  const x0 = bx + (bw - w) / 2;
  const y0 = by + (maxH - h) / 2 + S(0.3);
  const e = rec.edge;
  // the board (a board with no banded edge in a lighter line: nothing to point at)
  if (e.arrow === 'none') doc.setDrawColor(170, 170, 170); else doc.setDrawColor(110, 110, 110);
  doc.setLineWidth(S(0.25));
  doc.rect(x0, y0, w, h, 'S');
  // the banded edges, thick, in the element colour
  const [kr, kg, kb] = rgb(rec.kindColour);
  doc.setDrawColor(kr, kg, kb);
  doc.setLineWidth(S(1.1));
  if (e.left) doc.line(x0, y0, x0, y0 + h);
  if (e.right) doc.line(x0 + w, y0, x0 + w, y0 + h);
  if (e.top) doc.line(x0, y0, x0 + w, y0);
  if (e.bottom) doc.line(x0, y0 + h, x0 + w, y0 + h);
  // the arrow: shaft and head, black, pointing AT the banded edge
  doc.setDrawColor(20, 20, 20);
  doc.setFillColor(20, 20, 20);
  doc.setLineWidth(S(0.9));
  const cx = x0 + w / 2;
  const cy = y0 + h / 2;
  const head = S(2.2);
  const shaft = S(4.2);
  const in1 = S(1.2);
  if (e.arrow === 'right') {
    const tip = x0 + w - in1;
    doc.line(tip - head - shaft, cy, tip - head, cy);
    doc.triangle(tip - head, cy - head * 0.75, tip, cy, tip - head, cy + head * 0.75, 'F');
  } else if (e.arrow === 'left') {
    const tip = x0 + in1;
    doc.line(tip + head, cy, tip + head + shaft, cy);
    doc.triangle(tip + head, cy - head * 0.75, tip, cy, tip + head, cy + head * 0.75, 'F');
  } else if (e.arrow === 'up') {
    const tip = y0 + in1;
    doc.line(cx, tip + head, cx, tip + head + shaft);
    doc.triangle(cx - head * 0.75, tip + head, cx, tip, cx + head * 0.75, tip + head, 'F');
  } else if (e.arrow === 'down') {
    const tip = y0 + h - in1;
    doc.line(cx, tip - head - shaft, cx, tip - head);
    doc.triangle(cx - head * 0.75, tip - head, cx, tip, cx + head * 0.75, tip - head, 'F');
  } else if (e.arrow === 'all') {
    // the word inside only where the board is wide enough to hold it (a door
    // drawn 497 x 2147 is a thin strip); the word under the icon says it anyway
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(pt(S(2.4)));
    doc.setTextColor(20, 20, 20);
    if (doc.getTextWidth('ALL') + S(1.6) <= w && h >= S(3.2)) doc.text('ALL', cx, cy + S(0.9), { align: 'center' });
  }
  // the word under it
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(pt(S(1.9)));
  doc.setTextColor(20, 20, 20);
  const word = e.arrow === 'none' ? 'NO EDGE' : (e.arrow === 'all' ? 'ALL EDGES' : 'EDGE');
  doc.text(word, bx + bw / 2, by + bh - S(0.4), { align: 'center', charSpace: S(0.2) });
}

/** One sticker at cell (x, y, w, h). */
/**
 * The sticker was DESIGNED on the 44-up paper of 13:07 (48.3 x 25.4): the
 * band, the strip, the number, the icon are millimetres of that face. 16:40,
 * the owner moved to the 21-up paper (*"44 to za male naklejki"*) and asked
 * for a print smaller than the sticker (*"nadruk mniejszy od naklejek, to
 * nawet jak sie przesunie, to nie bedzie koniec swiata"*). So the design is
 * drawn SCALED: the sticker less `insetMm` on every side is the print area,
 * the design face grows by one factor to fit it (the smaller of the two
 * ratios) and sits centred; every length and every font size takes that
 * factor. On L7160 that is 1.21: a 4.8 mm number reads 5.8 mm. Nothing is
 * drawn on the sticker's own edge any more (the old hairline cut guide went
 * with the inset: a line that may land off the sticker is no guide).
 */
const DESIGN_W = 48.3;
const DESIGN_H = 25.4;

function drawLabel(doc, rec, cell, insetMm = 0) {
  const inset = Math.max(0, Number(insetMm) || 0);
  const pw = cell.w - 2 * inset;
  const ph = cell.h - 2 * inset;
  const K = Math.max(0.1, Math.min(pw / DESIGN_W, ph / DESIGN_H));
  const w = DESIGN_W * K;
  const h = DESIGN_H * K;
  const x = cell.x + inset + (pw - w) / 2;
  const y = cell.y + inset + (ph - h) / 2;
  const S = (mm) => mm * K;
  const band = S(7);
  const head = S(4.2);
  const [ur, ug, ub] = rgb(rec.unitColour);
  const [kr, kg, kb] = rgb(rec.kindColour);
  // the white body
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, w, h, 'F');
  // the cabinet's band, its name up it
  doc.setFillColor(ur, ug, ub);
  doc.rect(x, y, band, h, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(pt(S(4.4)));
  // Up the band: with angle 90 the baseline runs up the page from (x, y) and
  // the glyphs stand to its left, so the baseline sits right of the band's
  // middle by half a cap height and starts half the text's length below it.
  const unitText = String(rec.unitNum);
  const unitW = Math.min(doc.getTextWidth(unitText), h - S(2));
  doc.text(unitText, x + band / 2 + S(4.4) * 0.5, y + h / 2 + unitW / 2, { angle: 90 });
  // the element's strip: what it is, and its code. 17:38: the drawer's and
  // the fronts' names are long, so the name shrinks to the room left of the
  // code and, past that, is cut (the code is the one that must stay whole).
  doc.setFillColor(kr, kg, kb);
  doc.rect(x + band, y, w - band, head, 'F');
  doc.setFontSize(pt(S(2.5)));
  const codeW = doc.getTextWidth(rec.code);
  doc.text(rec.code, x + w - S(1.2), y + head - S(1.2), { align: 'right' });
  const nameRoom = w - band - S(1.4) - codeW - S(2.2);
  let nameMm = S(2.9);
  doc.setFontSize(pt(nameMm));
  while (doc.getTextWidth(rec.name) > nameRoom && nameMm > S(2.1)) {
    nameMm -= S(0.1);
    doc.setFontSize(pt(nameMm));
  }
  let name = String(rec.name);
  while (name.length > 3 && doc.getTextWidth(name) > nameRoom) name = name.slice(0, -1);
  doc.text(name, x + band + S(1.4), y + head - S(1.2));
  // the cut size, shrunk to the room beside the icon when it is long
  const iconW = S(18);
  const textW = w - band - S(1.4) - iconW - S(0.6);
  doc.setTextColor(17, 17, 17);
  let sizeMm = S(4.1);
  doc.setFontSize(pt(sizeMm));
  while (doc.getTextWidth(rec.size) > textW && sizeMm > S(2.4)) {
    sizeMm -= S(0.2);
    doc.setFontSize(pt(sizeMm));
  }
  doc.text(rec.size, x + band + S(1.4), y + head + S(5.4));
  // the number, large, and the count beside it
  doc.setFontSize(pt(S(4.8)));
  doc.text(rec.noText, x + band + S(1.4), y + head + S(11.6));
  const numW = doc.getTextWidth(rec.noText);
  doc.setFontSize(pt(S(2.2)));
  doc.setTextColor(90, 90, 90);
  doc.text(`/ ${rec.total}`, x + band + S(1.4) + numW + S(1.2), y + head + S(11.6));
  // the edge icon, bottom right
  drawEdgeIcon(doc, rec, x + w - iconW - S(0.4), y + head + S(0.8), iconW, h - head - S(1.2), K);
}

/**
 * T79 F18 (the handover: *"przełącznik 21/44 naklejek w oknie eksportu"*; the
 * owner 18.10, 14:55: *"ok daj"*): the profile with `labels.sheet` set to the
 * preset `sheet` names in profile.labels.sheets, the paper an Output entry
 * chose. No name: the profile's own sheet (L7160 by default). A name the
 * profile does not hold is refused in words, never printed on another paper.
 */
export function labelsProfileOn(profile, sheet) {
  if (sheet == null) return profile;
  const paper = profile?.labels?.sheets?.[sheet];
  if (!paper) throw new Error(`There is no label paper called ${sheet} in the profile; no labels were made.`);
  return { ...profile, labels: { ...profile.labels, sheet: paper } };
}

/**
 * The document: one page per 21 stickers (whatever the paper holds), in
 * number order, nothing else on the page (a label sheet has no frame).
 * `sheet` names the paper (labelsProfileOn); none is the profile's own.
 *
 * @returns {{doc:object, pages:number, labels:number, bytes:number, perPage:number, paper:string}}
 */
export function labelsDoc({ records, profile: given, sheet = null }) {
  const profile = labelsProfileOn(given, sheet);
  const grid = labelSheetGrid(profile);
  const pages = labelPages(records, profile);
  if (!pages.length) throw new Error('There is nothing to label yet: no carcass board in the project.');
  const doc = new jsPDF({ unit: 'mm', format: [grid.pageW, grid.pageH], orientation: grid.pageW >= grid.pageH ? 'landscape' : 'portrait' });
  pages.forEach((page, i) => {
    if (i > 0) doc.addPage([grid.pageW, grid.pageH], grid.pageW >= grid.pageH ? 'landscape' : 'portrait');
    page.forEach((rec, k) => drawLabel(doc, rec, grid.cells[k], grid.insetMm));
  });
  const measured = assertPdfBytes(pdfBytes(doc), { pages: doc.getNumberOfPages(), sheets: pages.length, what: 'The labels PDF' });
  return { doc, pages: pages.length, labels: records.length, bytes: measured.bytes, perPage: grid.perPage, paper: labelSettings(profile).sheet.preset };
}

/** `{ProjectName}-labels-{DDMM-HHMM}.pdf`, by the one naming law (engine/naming.js). */
export function labelsFilename({ project, ext = 'pdf', now = new Date() } = {}) {
  return exportFileName({ project, kind: 'labels', ext, now });
}

/** The stickers as a file, on the paper `sheet` names (T79 F18; none: the profile's own). */
export function exportLabelsPdf({ records, profile, sheet = null, project = null, now = new Date() }) {
  const { doc, pages, labels, bytes, perPage, paper } = labelsDoc({ records, profile, sheet });
  const filename = labelsFilename({ project, now });
  doc.save(filename);
  return { filename, pages, labels, bytes, perPage, paper };
}
