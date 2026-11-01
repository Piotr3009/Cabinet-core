// ─── The Output menu (turn 6, CLAUDE.md F1) ───
//
// Everything that LEAVES the app, in one menu, in the order a workshop meets
// it: show the client (a render), draw it (elevations), cut it (the machine
// files). Turn 4 kept the three exports under File ▸ Export because that is
// where a file menu usually keeps them; turn 6 has a render and three drawings
// to offer as well, and "where do I get a picture of this?" is not a question
// about files.
//
// It is a pure BUILDER, not a component: MenuBar already treats a menu as data
// ({ label, items: [...] }), so the shape of Output is testable in node without
// mounting React — which is the whole point of the check that the three
// existing exports are still reachable and still reachable exactly once.
//
// Zero new logic, deliberately: every `run` below is a handler that already
// existed and did the same thing from the old place.

// ─── T-CC1b F5 · OUTPUT SHRINKS (law 5) ─────────────────────────────────────
// The owner, 01.11.2026: *"na dole Drawings dobre, ale myli sie z Output;
// Output zmniejszyc"*; *"Output tylko: cutting list, BOM PDF, labels 21 i
// 44"*; *"BOM pdf to export listy materialow w pdf (malo potrzebny ale niech
// U maja)"*. Output is what leaves for the workshop. DELETED from the menu (the
// Deletion licence, by name): Preview..., Unit card (PDF), Unit card (SVG),
// All units (PDF), Drawing set (PDF), Drawing set (DXF), Render..., CNC / DXF,
// Bill of materials..., Spraying.... Their doors now: the drawings and the
// renders in the Drawings window (the camera bar's "Drawings..."); the BOM on
// the top bar's BOM button; Spraying on its own menu; the CNC files on the CNC
// workspace's "Export CNC / DXF".

/**
 * @param {object} handlers
 *   onExportCsv     the cutting-list CSV
 *   onExportPdf     the BOM PDF (the materials list of the job)
 *   onExportLabels  ({sheet}) => the part labels PDF on that paper (chat fix 17.10.2026; T79 F18)
 * @returns {{label:string, items:Array}}  a MenuBar menu
 */
export function buildOutputMenu({ onExportCsv, onExportPdf, onExportLabels } = {}) {
  return {
    label: 'Output',
    items: [
      { label: 'Cutting list CSV', hint: 'The LISP cutting-list format, unchanged', run: onExportCsv },
      { label: 'BOM PDF', hint: 'The materials list of the job as a PDF: parts, materials, hardware', run: onExportPdf },
      // CHAT FIX 17.10.2026 (the owner, 13:07): *"naklejki 44 na A4 bo takie
      // mam, kolorami ... napis co to, i strzalka co oklejamy"*. T79 F18: the
      // paper is chosen by the entry, each naming a preset of
      // profile.labels.sheets; the sizes are the profile's, never typed here.
      {
        label: 'Part labels · 21 per sheet (Avery L7160)',
        hint: 'A4 sticker sheets on the default Avery paper: cabinet colour, element colour, number, size, the edge to band',
        run: () => onExportLabels?.({ sheet: 'L7160' }),
      },
      {
        label: 'Part labels · 44 per sheet',
        hint: 'The same stickers, scaled onto the 44-up A4 paper',
        run: () => onExportLabels?.({ sheet: 'generic44' }),
      },
    ],
  };
}
