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

/**
 * The submenu of technical drawings.
 *
 * Turn 6 held two places open here — "Top view" and "Front (carcass only)" —
 * for the turn that drew them. Turn 7 draws them, and it does NOT add two more
 * menu entries: the three views are one CARD, which is what a workshop hands to
 * a bench, and three separate exports of the same cabinet is three things to
 * keep in step. So the places close, and what replaces them is the card, its
 * SVG, and the whole project as a booklet.
 */
export const DRAWING_KINDS = [
  {
    id: 'preview',
    label: 'Preview…',
    hint: 'The card on screen, and turn 6’s single elevation beside it',
  },
  {
    id: 'unit-card',
    label: 'Unit card (PDF)',
    hint: 'The selected unit: front, carcass and plan, dimensioned',
  },
  {
    id: 'unit-card-svg',
    label: 'Unit card (SVG)',
    hint: 'The same card as vectors, for a drawing office',
  },
  {
    id: 'booklet',
    label: 'All units (PDF)',
    hint: 'A cover and a page per unit — the whole project',
  },
];

/**
 * @param {object} handlers
 *   onRender      open the render settings
 *   onDrawing     (kindId) => open that drawing
 *   onExportDxf   the CNC / DXF ZIP of the selected unit
 *   onExportCsv   the cutting-list CSV
 *   onExportPdf   the project PDF
 *   onOpenBom     the live BOM panel
 * @returns {{label:string, items:Array}}  a MenuBar menu
 */
export function buildOutputMenu({
  onRender, onDrawing, onExportDxf, onExportCsv, onExportPdf, onOpenBom,
} = {}) {
  return {
    label: 'Output',
    items: [
      // 1 — the render. First, because it is the one thing here a workshop
      // shows to somebody who is not a workshop.
      { label: 'Render…', hint: 'A photographic image of this project, to 4K', run: onRender },
      { divider: true },

      // 2 — the drawings.
      {
        label: 'Drawings',
        hint: 'Technical drawings of the selected unit',
        items: DRAWING_KINDS.map((d) => ({
          label: d.label,
          hint: d.soon ? 'A later turn' : d.hint,
          soon: d.soon || undefined,
          disabled: Boolean(d.soon),
          run: d.soon ? undefined : (e) => onDrawing?.(d.id, e),
        })),
      },
      { divider: true },

      // 3 — the machine files. Moved here from File ▸ Export; the old place is
      // gone rather than duplicated, so there is one route to each of them.
      { label: 'CNC / DXF', hint: 'Every cut part of the selected unit, as a ZIP', run: onExportDxf },
      { label: 'Cutting list CSV', hint: 'The LISP cutting-list format, unchanged', run: onExportCsv },
      { label: 'BOM PDF', hint: 'The project sheet: 3D view, parts, materials, hardware', run: onExportPdf },
      { divider: true },
      { label: 'Bill of materials…', hint: 'Live BOM, with the export buttons', run: onOpenBom },
    ],
  };
}
