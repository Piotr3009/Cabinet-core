import jsPDF from 'jspdf';
import { drawingLayer } from '../engine/drawings/layers.js';
import { sheetToSvg } from '../engine/drawings/svg.js';
import { slug } from '../engine/render.js';
import { download } from './exporters.js';

// ─── Getting a drawing off the screen (turn 6, CLAUDE.md F7) ───
//
// SVG and PDF, from the SAME laid-out sheet. jsPDF lives here and not in
// src/engine/ so the drawing engine stays dependency-free (CLAUDE.md rule 2)
// and the whole of it — geometry, sheet, layers, SVG — is testable in node.
//
// The PDF is drawn with real vectors rather than an embedded raster: a joiner
// prints this and works off it, and a 150 dpi picture of a drawing is not a
// drawing.

/** `{project}-{unit}-front-elevation.{ext}` — the same naming family as a render. */
export function drawingFilename({ project, unit, view = 'front-elevation', ext = 'svg' }) {
  return `${slug(project)}-${slug(unit, 'unit')}-${slug(view, 'view')}.${ext}`;
}

export function exportDrawingSvg(sheet, { project, unit }) {
  const svg = sheetToSvg(sheet);
  const filename = drawingFilename({ project, unit, ext: 'svg' });
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
export function exportDrawingPdf(sheet, { project, unit }) {
  const { width, height } = sheet;
  const doc = new jsPDF({
    unit: 'mm',
    format: [width, height],
    orientation: width >= height ? 'landscape' : 'portrait',
  });
  const flip = (y) => height - y;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, width, height, 'F');

  for (const e of sheet.entities) {
    const L = drawingLayer(e.layer);
    const [r, g, b] = hexToRgb(L.colour);
    doc.setDrawColor(r, g, b);
    doc.setTextColor(r, g, b);
    doc.setLineWidth(L.width);
    const dash = e.hidden || L.dash ? (L.dash || [5, 3]) : null;
    // setLineDashPattern is jsPDF 2.x; guarded because a dashed line that
    // throws would cost the whole document.
    if (typeof doc.setLineDashPattern === 'function') doc.setLineDashPattern(dash || [], 0);

    if (e.kind === 'line') {
      doc.line(e.x1, flip(e.y1), e.x2, flip(e.y2));
    } else if (e.kind === 'rect') {
      doc.rect(e.x, flip(e.y + e.h), e.w, e.h, 'S');
    } else if (e.kind === 'text') {
      if (typeof doc.setLineDashPattern === 'function') doc.setLineDashPattern([], 0);
      // jsPDF sizes text in POINTS whatever the document unit is.
      doc.setFontSize(e.height * 2.8346);
      const opts = { align: e.align === 'left' ? 'left' : 'center', baseline: 'middle' };
      if (e.rotate) opts.angle = -e.rotate;
      doc.text(String(e.text), e.x, flip(e.y), opts);
    }
  }

  const filename = drawingFilename({ project, unit, ext: 'pdf' });
  doc.save(filename);
  return { filename, doc };
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
