/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F22 · HANDLES ON THE SHEETS. The owner, 24.10.2026 (19:34): *"nie widac wogole zeby bylo jakiekolwiek handles
// nic"*. The probe (verify/t82/f22-probe.md): with no handle chosen the engine drills none (R9), so every sheet showed
// fronts with nothing to pull. The fronts and the X-ray sheets now draw the profile's DEFAULT handle (new
// profile.handles.default { type: 'knob' }, PROPOSED, drawn at drawings.knobDiameter 30) at the point the engine's own
// law gives (engine/drawings/projector.js handleMarks asks engine/handles.js resolveHandle exactly as cabinet.js asks
// it); 'none' is read from what Settings already writes (push-to-open runners.variant 'T' on the design, or the T32
// hardware.handles 'none'). No meta.handle, no drill: the drill summary, the CNC, the BOM and the room never see it,
// and computeCabinet reads no handles.default. Drawing modules and one profile key only. DRAFT by slice E3 for INT:
// copy to scripts/t78-classify.d/f43-t82-f22.mjs.

const OWNER = '*"nie widac wogole zeby bylo jakiekolwiek handles nic"* (24.10.2026, 19:34)';

export const GATES = {};

export const LICENSED = {
  'src/engine/drawings/projector.js': {
    why: `T82 F22: sheetDefaultHandle(design, profile) names the handle a sheet draws where the project chose none; `
      + `handleMarks draws it on every house front the engine fitted none to, at resolveHandle's own point, flagged `
      + `defaultHandle, through runSolids / buildScene / projectRun's new defaultHandle option. Never drilled. ${OWNER}`
      + ' After the C/D/E review (sheets 2): takesSheetDefault asks ownsAPull first (the front\'s own record in params.front_handles, a handle or J edge the engine wrote on it, a handleless shape), so a front with its own pull takes no default knob.',
    gates: [],
  },
  'src/engine/drawings/setElevation.js': {
    why: `T82 F22: buildRunElevation and projectedRun hand defaultHandle to projectRun (fronts and X-ray). ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/wallSheets.js': {
    why: `T82 F22: wallDrawingSheets resolves sheetDefaultHandle once beside shakerFrame and gives it to the three `
      + `elevations of every wall. ${OWNER}`,
    gates: [],
  },
  'src/engine/profile.js': {
    why: `T82 F22: profile.handles.default { type: 'knob' } (PROPOSED), the sheet's handle where none is chosen; `
      + `computeCabinet reads no handles.default. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
