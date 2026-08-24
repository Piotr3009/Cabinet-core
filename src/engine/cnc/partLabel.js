// ─── WHAT A PART SAYS ABOUT ITSELF (turn 17, CLAUDE.md F1) ──────────────────
//
// Owner: "numer szafki musi być na każdym elemencie, inaczej się pogubimy który
// jest do którego."
//
// A workshop cutting four kitchens in a week ends up with a pallet of boards
// that all look alike. Until this turn a part carried `01-BUL` on the sheet and
// `01-BUL` in the file, which says which PIECE it is and nothing about which
// CABINET it belongs to once the cabinets are called what the owner calls them
// (turn 16 F6 made a name editable, so "01" may now read "F-01" or "Island").
//
// So there is ONE formatter, and it is here rather than in the sheet or in the
// DXF writer, because CLAUDE.md F1.1 asks for exactly that: "One formatter in
// the engine, used by the sheet and by the export, so the two cannot word it
// differently." Change the wording once and both move.
//
//     F-01 BUR 597x568
//     └─┬─┘ └┬┘ └──┬──┘
//       │    │     └─ the CUT size: width × height, the two numbers the piece
//       │    │        is ordered by and the ones on the cut list
//       │    └─ the part code, without the cabinet number the engine already
//       │       puts on a front's id (`01-F` is the `F` of cabinet `01`)
//       └─ the cabinet, as the OWNER names it (engine/naming.js unitName)
//
// ─── WHY 'x' AND NOT '×' ────────────────────────────────────────────────────
// The sheet has drawn `597 × 568` since turn 11 and it looks better. This
// string goes into a DXF R12 file, which is the dialect VCarve on Piotr's
// machine parses, and R12 predates any agreement about what a byte above 127
// means: a multiplication sign is a coin toss between code pages. An ASCII 'x'
// is the same character in every one of them. The sheet takes the export's
// spelling rather than the other way round, because a label a joiner reads off
// the BOARD and a label he reads off the SCREEN have to be the same label.
//
// Pure functions — no React, no store, no DOM.

import { formatMm } from '../format.js';

/**
 * The part code, with the cabinet number stripped off the front of it.
 *
 * The engine names a front `01-F` and a drawer front `01-DF1` — the cabinet
 * number is already in the id — while a side is plain `BUL`. Printing the
 * number twice is what `dxfFileName` has avoided since turn 3, by the same
 * rule and with the same one line.
 */
export function partCode(unitNum, panelId) {
  const id = String(panelId ?? '');
  const prefix = `${unitNum ?? ''}-`;
  return id.startsWith(prefix) ? id.slice(prefix.length) : id;
}

/**
 * WHAT KIND OF SHELF THIS IS (turn 24, CLAUDE.md F9).
 *
 * Owner: a shelf's CNC label gains its type — `… SHELF (FIX)` / `… SHELF
 * (ADJ)`. Same label block, one word more.
 *
 * It matters on a pallet: the two are cut to DIFFERENT WIDTHS now (F6 — fix
 * takes the full clear light, adjustable is 4 mm narrower so it slides), they
 * are drilled differently (F7 — a fix shelf is screwed and biscuited, an
 * adjustable one is on pins), and 4 mm is not a difference a joiner will spot
 * across a workshop. The board says which it is.
 *
 * It is read off the PANEL's own `meta.variant`, which the engine has set since
 * turn 8, so there is no second answer to keep in step. Anything that is not a
 * shelf gets nothing added: a side panel is a side panel.
 *
 * @returns {string} '(FIX)', '(ADJ)' or ''
 */
export function shelfTypeTag(panel) {
  if (panel?.part !== 'SHELF') return '';
  const locked = panel?.meta?.locked === true || String(panel?.meta?.variant || '') === 'fixed';
  return locked ? '(FIX)' : '(ADJ)';
}

/**
 * ─── WHAT A CUT BOARD SAYS ABOUT ITS ANGLE (turn 47, CLAUDE.md F2/F3/F4) ────
 *
 * The owner, 24.08.2026: *"ustawione ciecie pod skosem, najlepiej zeby bylo
 * napisane jaki kat ciecia, na CNC tez zeby bylo napisane."*
 *
 * Three notes, one formatter, because they are all the same sentence — THIS
 * BOARD IS NOT WHAT ITS OUTLINE SAYS IT IS:
 *
 *   CUT 63.4 DEG                      a side's top is a bevel through the
 *                                     thickness (F2). Two angles where the
 *                                     ceiling bends inside the board's own G.
 *   BEVEL 47.7 DEG BOTH ENDS - 5-AXIS the roof board's ends are cut VERTICALLY
 *                                     and the blank is a rectangle (F3). A
 *                                     three-axis machine cannot cut it and the
 *                                     sheet must not pretend otherwise.
 *   OVERSIZE +20 - TRIM ON SITE       an infill leaves 20 mm over on its WALL
 *                                     edge (F4), and the nominal is beside it.
 *
 * ─── WHY `DEG` IN THE FILE AND `°` ON THE GLASS ─────────────────────────────
 *
 * The same reason this file gives about the multiplication sign, and it is the
 * same mechanism `truncateToWidth`'s `ellipsis` already uses: R12 predates any
 * agreement about what a byte above 127 means, so a degree sign written into a
 * DXF is a coin toss between code pages and a note the machine mis-decodes is
 * worse than a plain one. The NUMBER, the wording and the decimal place are
 * identical either way — only the mark differs, and only where it has to.
 *
 * @param {object} panel  an engine panel record
 * @param {{ascii?:boolean}} opts  `ascii` for the DXF writer; the sheet's own
 *   spelling is the default.
 * @returns {string} '' where the board has nothing extra to say.
 */
export function slopeNoteText(panel, { ascii = false } = {}) {
  const deg = (v) => `${(Math.round(Number(v) * 10) / 10).toFixed(1)}${ascii ? ' DEG' : '°'}`;
  const dot = ascii ? ' - ' : ' · ';
  const parts = [];
  const bevel = panel?.meta?.bevel;
  if (bevel && Number(bevel.deg) > 0) {
    parts.push(`BEVEL ${deg(bevel.deg)} BOTH ENDS${dot}5-AXIS`);
  }
  const angles = panel?.meta?.slopeCut?.angles;
  if (!bevel && Array.isArray(angles)) {
    for (const a of angles) {
      if (Number(a?.deg) > 0) parts.push(`CUT ${deg(a.deg)}`);
    }
  }
  const over = panel?.meta?.oversize;
  if (over && Number(over.mm) > 0) {
    parts.push(`OVERSIZE +${Math.round(Number(over.mm))}${ascii ? ' - ' : ' — '}TRIM ON SITE`);
  }
  return parts.join(ascii ? ' | ' : ' | ');
}

/**
 * `F-01 BUR 597x568` — the cabinet, the part, the cut size.
 *
 * …and on a SHELF, the kind it is: `F-01 SHELF-1 564x520 (FIX)`.
 *
 * @param {string} unitNum  what the cabinet is called (result.unitNum)
 * @param {object} panel    an engine panel record
 * @returns {string}
 */
export function partLabelText(unitNum, panel) {
  const name = String(unitNum ?? '').trim();
  const code = partCode(name, panel?.id);
  const size = `${formatMm(panel?.w)}x${formatMm(panel?.h)}`;
  return [name, code, size, shelfTypeTag(panel)].filter((s) => s !== '').join(' ');
}
