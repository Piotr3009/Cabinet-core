// ─── One unit's card, laid out on paper (turn 7, CLAUDE.md F1) ───
//
// The join between "what the geometry is" (unitCard.js) and "what the sheet
// says" (sheet.js): the type's name, the two materials in full, and the number
// the workshop calls the cabinet by.
//
// It lives in the engine and not in the modal because the BOOKLET needs exactly
// the same thing n times. A card built one way for the screen and another way
// for the PDF is how a printed drawing stops matching the one it was approved
// from.
//
// Pure functions — no React, no store imports, no jsPDF.

import { CARD_ARRANGEMENTS, buildUnitCard } from './unitCard.js';
import { buildCoverSheet } from './cover.js';
import { layoutSheet } from './sheet.js';
import { resolveFinishes, resolveUnitDesign } from '../design.js';
import { getUnitType } from '../types.js';
import { formatMm } from '../format.js';

/**
 * A unit's production card, ready to render or to export.
 *
 * @param {object} args
 *   result    computeCabinet() output
 *   unit      the stored unit (for its number, its door style and its finishes)
 *   project   { name, design }
 *   profile
 *   format    'auto' | 'A4' | 'A3'
 *   date      already formatted by the caller — the engine does not own a clock
 * @returns {object} a laid-out sheet (layoutSheet output)
 */
export function unitCardSheet({ result, unit, project = {}, profile, format = 'auto', date = '' }) {
  const design = project.design;
  const finishes = resolveFinishes(unit, design, profile);
  const resolved = resolveUnitDesign(unit, design);
  const type = getUnitType(unit.type);
  const unitNum = unit.params?.unit_num ?? result.unitNum;

  const title = {
    project: project.name,
    unit: unitNum,
    view: 'Unit card',
    date,
    extra: {
      Type: type.label,
      // The decor's own attributed name, in full — a decor is never named
      // anywhere in this app without EGGER in front of it (engine/decors.js).
      Carcass: finishes.carcass?.label || '-',
      Fronts: resolved.colour
        ? `${finishes.front?.label || '-'} / ${resolved.colour.name}`
        : (finishes.front?.label || '-'),
    },
  };

  // Every arrangement on every paper size the caller allows, and the one that
  // draws the cabinet BIGGEST wins — the same bargain layoutSheet already makes
  // with the paper's orientation.
  //
  // Two ties are broken deliberately. Same scale, two arrangements: PROJECTION,
  // because when it is free it is the arrangement a drawing office would have
  // chosen anyway. Same scale, two paper sizes: A4, because a workshop that can
  // print the smaller sheet would rather.
  const papers = format === 'auto' ? ['A4', 'A3'] : [format];
  const laid = [];
  for (const paper of papers) {
    for (const arrangement of CARD_ARRANGEMENTS) {
      laid.push(layoutSheet({
        drawing: buildUnitCard(result, { unitNum, frontType: resolved.frontType, profile, arrangement }),
        format: paper,
        profile,
        titleRows: profile.drawings.unitCard.titleRows,
        blockWidth: profile.drawings.unitCard.titleWidth,
        title,
      }));
    }
  }
  return laid.reduce((best, sheet) => (sheet.scale < best.scale ? sheet : best));
}

/**
 * The whole project as a booklet: a cover, then a card per unit.
 *
 * The cover is [MEDIUM] in CLAUDE.md — "if there is time". There was, and it is
 * cheap: it is the only page that answers "what job is this" without reading a
 * title block through a magnifier.
 *
 * @param {object} args
 *   entries  [{ unit, result }] — the store's allResults() shape
 * @returns {Array} laid-out sheets, cover first
 */
export function projectBookletSheets({
  entries = [], project = {}, profile, format = 'auto', date = '', cover = true,
}) {
  const cards = entries.map(({ unit, result }) => unitCardSheet({
    result, unit, project, profile, format, date,
  }));
  if (!cover) return cards;

  const rows = entries.map(({ unit, result }) => ({
    unitNum: unit.params?.unit_num ?? result.unitNum,
    type: getUnitType(unit.type).label,
    size: [result.params.width, result.params.height, result.params.depth].map((v) => formatMm(v)).join(' × '),
  }));

  // The cover takes the PAPER the first card ended up on, so a booklet does not
  // open on an A4 cover in front of a stack of A3 drawings.
  const first = cards[0];
  const coverSheet = buildCoverSheet({
    project: {
      name: project.name,
      number: project.number ?? project.project_number ?? null,
      client: project.client ?? null,
    },
    units: rows,
    format: first?.format?.id || (format === 'auto' ? 'A4' : format),
    orientation: first && first.height > first.width ? 'portrait' : 'landscape',
    date,
    profile,
  });
  return [coverSheet, ...cards];
}
