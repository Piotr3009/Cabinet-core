import jsPDFDefault from 'jspdf';
// jszip is already this project's ZIP (src/lib/cncExport.js has used it since
// turn 3) and it lives in src/lib/ for the same reason jsPDF does: the drawing
// ENGINE stays dependency-free and testable in node (CLAUDE.md rule 2).
import JSZip from 'jszip';
import { drawingLayer, penWidth } from '../engine/drawings/layers.js';
import { sheetToSvg } from '../engine/drawings/svg.js';
// TURN 40 (CLAUDE.md F5): the wall set's DXF, which is the ONE drawing path in
// this app that ships text — see engine/drawings/dxf.js for why it is a
// separate writer from the CNC one and not a flag on it.
import { DXF_AUTOCAD_ONLY, sheetToDxf } from '../engine/drawings/dxf.js';
import { slug } from '../engine/render.js';
import { exportFileName } from '../engine/naming.js';
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

/**
 * `{ProjectName}-drawing-{unit}-{view}-{DDMM-HHMM}.{ext}` (turn 31, CLAUDE.md F5).
 *
 * "Same pattern for any other export the app writes." A drawing already said
 * which job and which cabinet; what it did not say is WHEN, so exporting the
 * same elevation twice after a correction produced two identical names and the
 * same afternoon the owner lost to `All-materials-cnc`.
 */
export function drawingFilename({
  project, unit, view = 'front-elevation', ext = 'svg', now = new Date(),
}) {
  return exportFileName({
    project, kind: 'drawing', subject: `${slug(unit, 'unit')}-${slug(view, 'view')}`, ext, now,
  });
}

/** `{ProjectName}-unit-cards-{DDMM-HHMM}.pdf` — the whole job in one document. */
export function bookletFilename({ project, ext = 'pdf', now = new Date() }) {
  return exportFileName({
    project, kind: 'unit-cards', ext, now,
  });
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
function drawSheet(doc, sheet) {
  const { width, height } = sheet;
  const flip = (y) => height - y;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, width, height, 'F');

  for (const e of sheet.entities) {
    const L = drawingLayer(e.layer);
    const [r, g, b] = hexToRgb(L.colour);
    doc.setDrawColor(r, g, b);
    doc.setTextColor(r, g, b);
    // T41-F5a: the same single resolver the SVG uses, so the PDF and the
    // screen cannot disagree about how heavy a line is.
    doc.setLineWidth(penWidth(e));
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


// ─── THE WALL DRAWINGS (turn 40, CLAUDE.md F5) ──────────────────────────────
//
// *"Output as PDF, in the Output menu beside the existing Unit Card. DXF 2D as
// a SEPARATE output, same geometry, with text."*
//
// Both are the SAME laid-out sheets — `engine/drawings/wallSheets.js` builds
// them once and these two bind them. There is no second geometry for the DXF,
// which is what "same geometry" means and what stops the two files disagreeing
// about a wall after a correction.

/** `{ProjectName}-wall-drawings-{DDMM-HHMM}.pdf` — the whole set, bound. */
export function wallDrawingsFilename({ project, ext = 'pdf', now = new Date() }) {
  return exportFileName({ project, kind: 'wall-drawings', ext, now });
}

/**
 * ─── TURN 42 (CLAUDE.md F0): "SAVED" IS A MEASUREMENT, NOT A CLAIM ──────────
 *
 * The owner, 19/20.08.2026: *"pdf w ogóle nie zadziałał — coś się znowu
 * zablokowało."* This is the only feature in the app whose output is PAPER a
 * workshop hands to a client, and everything about the path before tonight was
 * a claim: the modal caught a crash and showed an empty set, the menu path
 * relabelled an error as emptiness, and THIS function announced `Saved …` on
 * the strength of having called `doc.save()`.
 *
 * F0's own law, applied to the product and not only to its test: *"assert the
 * EXPORTED BYTES … never the array's length alone."* So the document is
 * serialised and LOOKED AT before the toast is allowed to say the word saved —
 * the header really is `%PDF`, and the page count really is the sheet count.
 * Anything else THROWS, into a catch that now speaks (DrawingModal.jsx,
 * ConfiguratorPage.jsx), and the joiner is told rather than reassured.
 *
 * It costs one extra serialisation of a document that is tens of kilobytes.
 * That is the price of never again printing "Saved" over a file that is not
 * a PDF.
 */
export const PDF_MAGIC = '%PDF';

/** The document as bytes, which is the only form worth asserting anything about. */
export function pdfBytes(doc) {
  return new Uint8Array(doc.output('arraybuffer'));
}

/**
 * The two questions F0 asks of an exported PDF, asked of the BYTES.
 *
 * @throws {Error} named, so the reporting catches downstream have something to
 *                 put on the screen that a person can act on.
 */
export function assertPdfBytes(bytes, { pages, sheets, what = 'The PDF' }) {
  const head = String.fromCharCode(...(bytes || []).slice(0, PDF_MAGIC.length));
  if (head !== PDF_MAGIC) {
    throw new Error(`${what} did not come out as a PDF — it starts "${head}", not "${PDF_MAGIC}".`);
  }
  if (sheets != null && pages !== sheets) {
    throw new Error(`${what} came out ${pages} page${pages === 1 ? '' : 's'} long for ${sheets} sheet${sheets === 1 ? '' : 's'}.`);
  }
  return { bytes: bytes.length, pages };
}

/**
 * The wall set as one PDF: a page per sheet, in the order they were built —
 * Wall A /1, Wall A /2, Wall B /1, …, then the horizontal section.
 */
export function exportWallDrawingsPdf(sheets, { project }) {
  const pages = (sheets || []).filter(Boolean);
  const doc = bookletDoc(pages);
  // T42-F0: looked at, not assumed. See the note above.
  const measured = assertPdfBytes(pdfBytes(doc), {
    pages: doc.getNumberOfPages(), sheets: pages.length, what: 'The wall drawings PDF',
  });
  const filename = wallDrawingsFilename({ project });
  doc.save(filename);
  return { filename, doc, pages: doc.getNumberOfPages(), bytes: measured.bytes };
}

/**
 * ─── TURN 42 (CLAUDE.md F0): AN ERROR IS NEVER RELABELLED AS EMPTINESS ──────
 *
 * Both wall paths ended in `err.message || 'Nothing to draw yet.'`, so an error
 * whose message happens to be empty — a `TypeError` thrown by a minified frame,
 * a rejected promise carrying a string, an `AbortError` — was reported to the
 * joiner as "there is nothing here", which is the one thing it definitely was
 * not. CLAUDE.md: *"if `err.message` is empty, show the error's NAME — never
 * the emptiness sentence."*
 *
 * There is deliberately no fallback to any sentence about emptiness in this
 * function. The last resort is the word `unknown`, which is at least true.
 */
export function drawingErrorText(err) {
  const message = String(err?.message ?? '').trim();
  if (message) return message;
  const name = String(err?.name ?? '').trim();
  if (name) return `${name} (no message)`;
  const text = String(err ?? '').trim();
  if (text && text !== '[object Object]') return text;
  return 'an unknown error (the browser gave no message — see the console)';
}

/**
 * The same set as DXF, one file per sheet, in a ZIP.
 *
 * ONE FILE PER SHEET rather than one file with everything on it, because that
 * is what a wall drawing IS — AutoCAD opens a drawing, not a booklet — and
 * because a sheet's coordinates are its own paper's.
 *
 * Every file carries the warning ON THE DRAWING as well as in its name, which
 * is the point: a note in a menu is read once, a note in the file is read by
 * whoever opens it.
 */
export async function exportWallDrawingsDxf(sheets, { project }) {
  const pages = (sheets || []).filter((s) => s && s.sheet);
  if (!pages.length) throw new Error('There is nothing to draw yet — add a unit first.');

  const zip = new JSZip();
  const names = [];
  for (const page of pages) {
    const name = `${slug(page.name, 'sheet')}-autocad-only.dxf`;
    names.push(name);
    zip.file(name, sheetToDxf(page.sheet));
  }
  // The warning travels with the files as well as ON them, because the person
  // who unzips this is not always the person who opens a sheet.
  zip.file('READ-ME-FIRST.txt', [
    DXF_AUTOCAD_ONLY,
    '',
    'These sheets carry TEXT - dimensions, labels and a title block - because a',
    'drawing is nothing without them. VCarve\'s DXF parser crashes on text styles',
    '(02.08.2026), so do not send these to the machine. The CNC export is a',
    'separate path and still ships no text of any kind.',
    '',
  ].join('\r\n'));

  const blob = await zip.generateAsync({
    type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 },
  });
  const filename = wallDrawingsFilename({ project, ext: 'zip' });
  download(filename, blob);
  return { filename, files: names };
}
