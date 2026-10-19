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
// T78 F21 - the paint code of the spray law, read off the panel's role.
import { sprayCodeFor } from '../spray.js';

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
    // …and the NOMINAL beside it, so nobody prices the extra (F4). The board on
    // the bench is 60 wide and the job is 40; both numbers are on it.
    // CHAT FIX 19.10.2026 (KIT_SITE_TRIM.lsp D4): an end panel or a plinth
    // grown on several edges names them (TOP/BOTTOM/BACK) and its nominal is
    // both sizes (NOM 596 x 2250); the filler's one-edge record prints as it did.
    const edges = Array.isArray(over.edges) && over.edges.length
      ? ` ${over.edges.map((e) => String(e).toUpperCase()).join('/')}` : '';
    const nomObj = over.nominal && typeof over.nominal === 'object' ? over.nominal : null;
    const nom = nomObj ? NaN : Number(over.nominal);
    const r1 = (v) => Math.round(Number(v) * 10) / 10;
    const nomText = nomObj && Number.isFinite(Number(nomObj.w)) && Number.isFinite(Number(nomObj.h))
      ? ` (NOM ${r1(nomObj.w)} x ${r1(nomObj.h)})`
      : (Number.isFinite(nom) ? ` (NOM ${r1(nom)})` : '');
    parts.push(`OVERSIZE +${Math.round(Number(over.mm))}${edges}${ascii ? ' - ' : ' — '}TRIM ON SITE${nomText}`);
  }
  // Joined with a SEMICOLON and not a bar: the note wraps by words on a narrow
  // board (`cnc/dxf.js panelNoteBlock`), and a lone `|` at the head of a line
  // reads as a character in the instruction rather than as a separator.
  return parts.join('; ');
}

/**
 * WHICH FACE THE BOARD IS MACHINED FROM (T78 F20, CLAUDE.md PART E).
 *
 * The owner, 11.10.2026: the Cabineo pocket is cut from the OUTSIDE face of
 * the carcass board (*"ciecie nie od srodka korpusu tylko do zewnatrz"*), so
 * the top, the bottom and a fixed shelf of a Cabineo unit are exported as
 * seen from that face (their DXF reflected through T76's one reflection,
 * cnc/dxf.js) and the board must SAY so on the bench, where a top put down
 * inside face up would have its pockets milled into the wrong face. The
 * engine marks such a board `meta.machinedFace: 'outside'`
 * (engine/cabineo.js) and this prints the LISP's own words for it
 * (SKYLON_JOINTS_CABINEO.lsp `cabineo-face-label`): `OUTSIDE FACE UP`. Every
 * other board prints nothing more, so no existing label moves.
 *
 * @returns {string} 'OUTSIDE FACE UP' or ''
 */
export function faceTag(panel) {
  return panel?.meta?.machinedFace === 'outside' ? 'OUTSIDE FACE UP' : '';
}

/**
 * THE PAINT CODE (T78 F21, CLAUDE.md PART F).
 *
 * The owner's law of 11.10.2026 says what of each sprayed element is painted,
 * and *"the CNC part label carries the paint code beside the part number"*:
 * a door reads `2S+4E` (two faces, four edges), an end panel `1S+F100+4E`
 * (one face, the 100 mm frame on the back, four edges), a plinth `1S+TE`.
 * The code is the rule's own (profile.spray.rules, engine/spray.js
 * sprayCodeFor), read off the panel's ROLE the way every other tag here is,
 * and printed COMPACT (no spaces) so the label block keeps its word count on a
 * narrow board. A part the law does not paint (a side, a back, a drawer box)
 * prints nothing more, so no carcass label moves. Set 2 (a sprayed or veneered
 * carcass) is said by the caller, because a label knows nothing about the
 * job's carcass material.
 *
 * @returns {string} the compact code, or ''
 */
export function paintTag(panel, { set2 = false, openUnit = false } = {}) {
  return sprayCodeFor(panel, { set2, openUnit });
}

/**
 * THE PART NUMBER (chat fix 17.10.2026). The owner: *"ponumerujemy wszystkie
 * elementy"*: one number per carcass board through the whole project
 * (engine/partNumbers.js), and it leads the label: `#07 W01 TOP 1071x550`,
 * the same `#07` as on the sticker. A label given no number prints exactly
 * what it printed before, which is every file written before this day.
 *
 * @returns {string} '#07' or ''
 */
export function numberTag(no, { pad = 2 } = {}) {
  if (no == null || !Number.isFinite(Number(no))) return '';
  return `#${String(Math.max(0, Math.round(Number(no)))).padStart(pad, '0')}`;
}

/**
 * `F-01 BUR 597x568` — the cabinet, the part, the cut size.
 *
 * …and on a SHELF, the kind it is: `F-01 SHELF-1 564x520 (FIX)`.
 * …and on a board machined from the carcass's outside face (T78 F20):
 * `F-01 TOP 564x540 OUTSIDE FACE UP`.
 * …and on a sprayed element, its paint code (T78 F21): `F-01 F 597x767 2S+4E`.
 * …and, numbered (17.10.2026), the number first: `#07 F-01 TOP 564x540`.
 *
 * @param {string} unitNum  what the cabinet is called (result.unitNum)
 * @param {object} panel    an engine panel record
 * @param {{set2?:boolean, openUnit?:boolean, no?:number|null, pad?:number}} [opts]
 *   T78 F21: the job's carcass is sprayed or veneered; the unit stands open;
 *   17.10.2026: the part's number in the project, when it has one
 * @returns {string}
 */
export function partLabelText(unitNum, panel, { set2 = false, openUnit = false, no = null, pad = 2 } = {}) {
  const name = String(unitNum ?? '').trim();
  const code = partCode(name, panel?.id);
  const size = `${formatMm(panel?.w)}x${formatMm(panel?.h)}`;
  return [numberTag(no, { pad }), name, code, size, shelfTypeTag(panel), faceTag(panel), paintTag(panel, { set2, openUnit })].filter((s) => s !== '').join(' ');
}
