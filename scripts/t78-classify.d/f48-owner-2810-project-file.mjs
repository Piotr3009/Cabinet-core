/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After T84 . the owner's chat fix of 28.10.2026, the night, named here so the strict run says why. His words:
// *"ja mowie o pliku z CC zebym mial ten sam na innym kompie"*; *"wiesz ze CC nie jest w chmurze jeszcze"*;
// *"zrobisz mi pozniej cos co zadziala, czyli export i import projektow"*; *"problem polega na tym ze nie dzialaja te
// szuflady ani import ani export plikow"* (28.10.2026). THE JOB AS A FILE: File > Save to file... writes the job on
// the screen into one .ccproject file (the job, its assignments folded in as lib/persist.js folds them, its logo
// whole, its cabinets, the workshop settings it is drawn with); File > Open from file... and the start screen's Open
// from file... put it on this computer's shelf and open it, asking first when the job is already here (Replace,
// Keep both, Cancel) or was drawn with other workshop settings (use the file's, keep this computer's), as the mockup
// of the same evening draws it. Three src/lib files: the file (pure), its two roads, a registry row. No engine file,
// no gate, no golden: a bare computeCabinet() reaches none of it, and the six hold byte for byte.

const OWNER = '*"ja mowie o pliku z CC zebym mial ten sam na innym kompie"*; *"wiesz ze CC nie jest w chmurze jeszcze"*; '
  + '*"zrobisz mi pozniej cos co zadziala, czyli export i import projektow"*; *"problem polega na tym ze nie dzialaja te '
  + 'szuflady ani import ani export plikow"* (28.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/lib/projectFile.js': {
    why: `Chat fix 28.10.2026, NEW and pure: the .ccproject file (format cabinet-core-project, version 1): its name `
      + `(number, name, dd.mm.yyyy, safe for Windows), buildProjectFile (the job, its assignments folded in as `
      + `lib/persist.js folds them, its logo whole through projectWithLogo, its cabinets, the workshop settings), `
      + `parseProjectFile (its refusals in words), the two questions (shelfCollision by id; compareProfiles through `
      + `migrateCabinetProfile) and projectForOpen (replace keeps the id, copy is Save as's "name copy"), and the one `
      + `browser door, pickProjectFile. ${OWNER}`,
    gates: [],
  },
  'src/lib/projectFileRoad.js': {
    why: `Chat fix 28.10.2026, NEW: the file's two roads through the app, written once for the File menu and the start `
      + `screen: saveProjectToFile (the job on the screen, one download) and openProjectFromFile (read, ask in the `
      + `window handed in, the settings when taken, saveLocalProject, the history cleared, loadProject, the editor). `
      + `Nothing cut. ${OWNER}`,
    gates: [],
  },
  'src/lib/modalLayer.js': {
    why: `Chat fix 28.10.2026: MODAL_KINDS gains 'project-file' { about: 'project', label: 'Open from file' }, the `
      + `window of the two questions (components/ProjectFileModal.jsx), a project window beside the entry that picked `
      + `the file. A registry row, nothing cut. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
