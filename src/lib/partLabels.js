// ─── THE PROJECT'S PART NUMBER PLAN, FOR THE APP (chat fix 17.10.2026) ──────
//
// The engine numbers the boards (engine/partNumbers.js, pure); this is the
// one place the APP asks it, with the project's units in their order and each
// unit's CNC answer (the result with its grooves cut in, the same one the sheet
// draws and the files are written from). Every exporter and the CNC view take
// the plan from here, so a sticker, a DXF text and a caption on the glass
// cannot number one board three ways.

import {
  dxfLabelsFor, labelRecords, partNumberPlan,
} from '../engine/partNumbers.js';

/**
 * The units as the plan takes them: id, the engine's own name for the
 * cabinet and its panels. A unit with no result contributes no board and
 * keeps its place, so the numbers of the cabinets after it do not move.
 */
export function planUnits(units, resultOf) {
  return (units || []).map((u) => {
    const result = typeof resultOf === 'function' ? resultOf(u.id) : null;
    return {
      id: u.id,
      unitNum: result?.unitNum ?? u.params?.unit_num ?? '',
      panels: result?.panels || [],
    };
  });
}

/** The plan of the whole project. */
export function projectLabelPlan({ units, resultOf, profile }) {
  return partNumberPlan(planUnits(units, resultOf), profile);
}

/** The DXF writers' `labels` record for one cabinet of the plan (null = unnumbered, as before). */
export function labelsForUnit(plan, unitId) {
  return dxfLabelsFor(plan, unitId);
}

/** The stickers of the whole project, in number order. */
export function projectLabelRecords({ units, resultOf, profile }) {
  return labelRecords(planUnits(units, resultOf), profile);
}
