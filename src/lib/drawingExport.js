import jsPDFDefault from 'jspdf';
import { drawingLayer } from '../engine/drawings/layers.js';
import { sheetToSvg } from '../engine/drawings/svg.js';
import { slug } from '../engine/render.js';
import { download } from './exporters.js';

// ─── Getting a drawing off the screen (turn 6, CLAUDE.md F7; turn 7, F1) ───
//
// SVG and PDF, from the SAME laid-out sheet. jsPDF lives here and not in
// src/engine/ so the drawing engine stays dependency-free (CLAUDE.md rule 2)
// and the whole of it — geometry, sheet, layers, SVG — is testable in node.
//
// The PDF is drawn with real vectors rather than an embedded raster: a joiner
// prints this and works off it, and a 150 dpi picture of a drawing is not a
// drawing.
//
// Turn 7 adds the BOOKLET: one PDF, a page per unit, and it is the same
// function with a list instead of a sheet. There is no second renderer for it —
// `drawSheet` below draws one page and the booklet calls it n times, so a
// booklet page cannot come out looking different from the single card.

/**
 * jsPDF ships CJS. Vite's interop hands back the constructor as the default
 * export; node's hands back the module object, and `new` on that throws. One
 * line, so a node test can count the pages of a booklet — which is the only way
 * "the PDF really is n pages long" gets checked by anything other than a
 * browser.
 */
const jsPDF = jsPDFDefault?.jsPDF || jsPDFDefault;

/** `{project}-{unit}-{view}.{ext}` — the same naming family as a render. */
export function drawingFilename({ project, unit, view = 'front-elevation', ext = 'svg' }) {
  return `${slug(project)}-${slug(unit, 'unit')}-${slug(view, 'view')}.${ext}`;
}

/** `{project}-unit-cards.pdf` — the whole job in one document. */
export function bookletFilename({ project, ext = 'pdf' }) {
  return `${slug(project)}-unit-cards.${ext}`;
}

export function exportDrawingSvg(sheet, { project, unit, view = 'front-elevation' }) {
  const svg = sheetToSvg(sheet, { kind: view });
  const filename = drawingFilename({ project, unit, view, ext: 'svg' });
  download(filename, new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  return { filename, svg };
}

/**
 * The same sheet as a PDF, at its true paper size.
 *
 * jsPDF measures from the TOP-LEFT and the sheet is held Y-up, so this flips
 * once at the boundary and never again — the same bargain the SVG renderer
 * makes, for the same reason.
 */
export function exportDrawingPdf(sheet, { project, unit, view = 'front-elevation' }) {
  const doc = newDoc(sheet);
  drawSheet(doc, sheet);
  const filename = drawingFilename({ project, unit, view, ext: 'pdf' });
  doc.save(filename);
  return { filename, doc, pages: 1 };
}

/**
 * Every unit of the project, one page each, in one PDF.
 *
 * Pages may differ in size and orientation — a wardrobe turns the paper and a
 * base unit does not — and jsPDF takes both per `addPage`, so a booklet is not
 * forced onto one shape to keep the code simple.
 *
 * @param {Array} sheets  laid-out sheets, in the order they should be bound
 * @returns {{filename:string, doc:object, pages:number}}
 */
export function exportBookletPdf(sheets, { project }) {
  const doc = bookletDoc(sheets);
  const filename = bookletFilename({ project });
  doc.save(filename);
  return { filename, doc, pages: doc.getNumberOfPages() };
}

/**
 * The document itself, without writing it anywhere.
 *
 * Split out from the export so a node test can count the pages: `doc.save()`
 * reaches for a filesystem or a browser download, and neither belongs in a
 * test whose question is "did the booklet come out n pages long".
 */
export function bookletDoc(sheets) {
  const pages = sheets.filter(Boolean);
  if (!pages.length) throw new Error('There is nothing to draw yet — add a unit first.');

  const doc = newDoc(pages[0]);
  pages.forEach((sheet, i) => {
    if (i > 0) {
      doc.addPage([sheet.width, sheet.height], sheet.width >= sheet.height ? 'landscape' : 'portrait');
    }
    drawSheet(doc, sheet);
  });
  return doc;
}

function newDoc(sheet) {
  return new jsPDF({
    unit: 'mm',
    format: [sheet.width, sheet.height],
    orientation: sheet.width >= sheet.height ? 'landscape' : 'portrait',
  });
}

/** One laid-out sheet onto the CURRENT page of a jsPDF document. */
export function drawSheet(doc, sheet) {
  const { width, height } = sheet;
  const flip = (y) => height - y;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, width, height, 'F');

  for (const e of sheet.entities) {
    const L = drawingLayer(e.layer);
    const [r, g, b] = hexToRgb(L.colour);
    doc.setDrawColor(r, g, b);
    doc.setTextColor(r, g, b);
    doc.setLineWidth(L.width);
    const dash = !e.solid && (e.hidden || L.dash) ? (L.dash || [5, 3]) : null;
    // setLineDashPattern is jsPDF 2.x; guarded because a dashed line that
    // throws would cost the whole document.
    if (typeof doc.setLineDashPattern === 'function') doc.setLineDashPattern(dash || [], 0);

    if (e.kind === 'line') {
      doc.line(e.x1, flip(e.y1), e.x2, flip(e.y2));
    } else if (e.kind === 'rect') {
      doc.rect(e.x, flip(e.y + e.h), e.w, e.h, 'S');
    } else if (e.kind === 'circle') {
      doc.circle(e.cx, flip(e.cy), e.r, 'S');
    } else if (e.kind === 'text') {
      if (typeof doc.setLineDashPattern === 'function') doc.setLineDashPattern([], 0);
      // jsPDF sizes text in POINTS whatever the document unit is.
      doc.setFontSize(e.height * 2.8346);
      const opts = { align: e.align === 'left' ? 'left' : 'center', baseline: 'middle' };
      if (e.rotate) opts.angle = -e.rotate;
      doc.text(String(e.text), e.x, flip(e.y), opts);
    }
  }
  return doc;
}

function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}
