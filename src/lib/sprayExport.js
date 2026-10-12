// === T78 F21 - THE SPRAYING PDF (CLAUDE.md PART F) ============================
//
// *"Export PDF: the same page, landscape, in the T71 report frame."*  The
// sheets are the engine's (`engine/drawings/spraySheets.js`, pure, tested in
// node); this file is the jsPDF half, in src/lib for the reason
// `drawingExport.js` is: the drawing engine stays dependency-free. The document
// goes through T71's own booklet (`bookletDoc`: one page per sheet, A3
// landscape) and T42 F0's own measurement (`assertPdfBytes`: the bytes really
// are a PDF and the page count really is the sheet count) before the word
// "saved" is allowed.
//
// Plain ASCII throughout.

import { assertPdfBytes, bookletDoc, pdfBytes } from './drawingExport.js';
import { exportFileName } from '../engine/naming.js';
import { spraySheets } from '../engine/drawings/spraySheets.js';

/** `{ProjectName}-spraying-{DDMM-HHMM}.pdf`, by the one naming law (engine/naming.js). */
function sprayingFilename({ project, ext = 'pdf', now = new Date() } = {}) {
  return exportFileName({ project, kind: 'spraying', ext, now });
}

/**
 * The document, measured, without writing it anywhere: a node test counts its
 * pages the way turn 42's wall-set test does.
 */
function sprayingDoc({ schedule, project = {}, profile, date = '' }) {
  const pages = spraySheets({ schedule, project, profile, date });
  const doc = bookletDoc(pages.map((p) => p.sheet));
  const measured = assertPdfBytes(pdfBytes(doc), {
    pages: doc.getNumberOfPages(), sheets: pages.length, what: 'The spraying PDF',
  });
  return { doc, pages, bytes: measured.bytes };
}

/** The same page as a file, landscape, in the T71 frame. */
export function exportSprayingPdf({ schedule, project = {}, profile, date = '', now = new Date() }) {
  const { doc, pages, bytes } = sprayingDoc({ schedule, project, profile, date });
  const filename = sprayingFilename({ project: project?.name, now });
  doc.save(filename);
  return { filename, pages: pages.length, bytes };
}
