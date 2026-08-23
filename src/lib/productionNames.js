// ─── PRODUCTION SPEAKS THE MATERIAL'S NAME OUT LOUD (turn 45, CLAUDE.md F6) ─
//
// The owner, 23.08.2026, on the Produkcja tab:
//
//   *"The assigned material name per block: FULL-SIZE text (it is the
//   information, not a footnote) — 'Carcass 1 — MFC Halifax Oak 18 mm' as the
//   block's title line."*
//
// T44 grouped the measured thicknesses by the material they measure, which was
// right, and then set the material's NAME in 10 px grey at the far right of the
// row — a footnote to the thing the row is about. A joiner standing at a
// caliper reading "Carcass 1" off a screen has to remember which board carcass
// 1 is; a joiner reading "Carcass 1 — MFC Halifax Oak 18 mm" does not.
//
// The title is composed HERE rather than in the `.jsx` for the reason every
// sentence in this house is: it is asserted by a test that must not have to
// mount React, and it is one string rather than three spans that could each
// drift.
//
// Pure. `src/engine/**` is closed byte-for-byte tonight (iron rule 2), and a
// LABEL is a surface decision in any case.

import { formatMm } from '../engine/format.js';

/** What a block with no board assigned says instead of a name. */
export const NO_BOARD = 'no stock board assigned';

/**
 * The block's title line.
 *
 * @param {object} args
 *   label       what the slot is called — "Carcass 1", "Front 2", "Drawer box"
 *   boardName   the assigned stock board's name, or null
 *   decorName   what it is FACED in, when that is not the board's own name
 *   thickness   millimetres — the measured number the block is about
 * @returns {string} "Carcass 1 — MFC Halifax Oak 18 mm"
 */
export function productionBlockTitle({
  label, boardName = null, decorName = null, thickness = null,
} = {}) {
  const head = String(label || 'Material').trim();
  // The BOARD is the answer when there is one: it is what the shop buys and
  // what the caliper is on. A decor with no board behind it is still worth
  // saying — it is what the client chose — and "no stock board assigned" is
  // worth saying loudest of all, which is why it is in the title and not in a
  // grey line under it.
  const what = boardName || decorName || NO_BOARD;
  const mmText = Number(thickness) > 0 ? `${formatMm(thickness)} mm` : '';
  // Half the boards a workshop stocks are NAMED after their thickness —
  // "Generic board 18 mm", "MDF 18 mm" — and "Generic board 18 mm 18 mm" is
  // what saying it twice looks like. The measured number is the one that
  // matters, so it is the one that stays.
  const already = mmText && what.trim().toLowerCase().endsWith(mmText.toLowerCase());
  return `${head} — ${what}${mmText && !already ? ` ${mmText}` : ''}`;
}

/** Is this block still waiting for somebody to say what it is cut from? */
export function blockNeedsBoard({ boardName = null, decorName = null } = {}) {
  return !boardName && !decorName;
}
