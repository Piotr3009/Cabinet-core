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
 * `F-01 BUR 597x568` — the cabinet, the part, the cut size.
 *
 * @param {string} unitNum  what the cabinet is called (result.unitNum)
 * @param {object} panel    an engine panel record
 * @returns {string}
 */
export function partLabelText(unitNum, panel) {
  const name = String(unitNum ?? '').trim();
  const code = partCode(name, panel?.id);
  const size = `${formatMm(panel?.w)}x${formatMm(panel?.h)}`;
  return [name, code, size].filter((s) => s !== '').join(' ');
}
