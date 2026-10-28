/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT FIX 28.10.2026 · THE JOB AS A FILE: ITS TWO ROADS THROUGH THE APP ──
//
// The owner, 28.10.2026: *"ja mowie o pliku z CC zebym mial ten sam na innym
// kompie"*; *"wiesz ze CC nie jest w chmurze jeszcze"*; *"zrobisz mi pozniej
// cos co zadziala, czyli export i import projektow"*; *"problem polega na tym
// ze nie dzialaja te szuflady ani import ani export plikow"*.
//
// The file is lib/projectFile.js (pure). These are its two roads, written ONCE
// for the File menu (components/TopBar.jsx) and the start screen
// (components/StartScreen.jsx):
//
//   saveProjectToFile()     the job on the screen as one .ccproject file;
//   openProjectFromFile()   a picked file read, its questions asked (the
//                           window, components/ProjectFileModal.jsx, is handed
//                           in as `ask`), the job put on this computer's shelf
//                           and opened the way a shelf job opens.

import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useHistoryStore } from '../stores/historyStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { getCabinetProfile, migrateCabinetProfile } from '../engine/profile.js';
import {
  browserStorage, listLocalProjects, notOnShelf, saveLocalProject,
} from './projectLibrary.js';
import {
  buildProjectFile, jobLabel, parseProjectFile, projectFileName, projectFileQuestions, projectFileText, projectForOpen,
} from './projectFile.js';
import { download } from './exporters.js';

/**
 * File > Save to file...: the job on the screen as it would be saved (the
 * assignments folded in as lib/persist.js folds them, the logo whole) with
 * the workshop settings it is drawn with, handed to `deliver` (the browser's
 * download, beside the drawings and the DXFs). Returns the file's name.
 */
export function saveProjectToFile({ storage = browserStorage(), at = Date.now(), deliver = download } = {}) {
  const { project, units } = useProjectStore.getState();
  let live = null;
  try { live = useMaterialAssignmentStore.getState().data || null; } catch { live = null; }
  const file = buildProjectFile({
    project, units, assignments: live, profile: getCabinetProfile(), at, storage,
  });
  const name = projectFileName(project, new Date(at));
  deliver(name, new Blob([projectFileText(file)], { type: 'application/json' }));
  useUiStore.getState().notify(
    `Saved to a file: ${name}. It is in your Downloads; on another computer open it with File > Open from file.`,
    'ok',
  );
  return name;
}

/**
 * Open a picked file (`{ name, text }`, lib/projectFile.js pickProjectFile):
 * read it; ask what there is to ask (`ask`, the window, resolves
 * `{ mode, takeProfile }` or null for Cancel); then the road a shelf job takes
 * (StartScreen.jsx `start`): the settings when the file's are taken, the shelf
 * (saveLocalProject), the history cleared, loadProject (which opens the job's
 * own assignments, `cc.assignments.v2:<id>`), the editor. `beforeOpen` runs
 * once the answer is in and before anything is replaced (the top bar's word
 * about unsaved work). Resolves 'opened', 'cancelled' or 'refused'.
 */
export async function openProjectFromFile({
  picked, anchor = null, beforeOpen = null, storage = browserStorage(), at = Date.now(), ask = null,
}) {
  if (!picked) return 'cancelled';
  const ui = useUiStore.getState();
  const read = parseProjectFile(picked.text);
  if (!read.ok) {
    ui.notify(`${picked.name}: ${read.error}`, 'error');
    return 'refused';
  }
  const { file } = read;
  const questions = projectFileQuestions({
    file, shelfRows: listLocalProjects(storage), hereProfile: getCabinetProfile(),
  });
  let answer = { mode: 'replace', takeProfile: false };
  if (questions.collision || questions.profile) {
    // No window to ask in is a Cancel: nothing on this computer is replaced unasked.
    answer = typeof ask === 'function' ? await ask({ file, questions, anchor }) : null;
  }
  if (!answer) return 'cancelled';
  if (beforeOpen) beforeOpen();
  // The settings first: loadProject reads them (a saved job's shaker frame, the settle sweeps).
  if (answer.takeProfile && file.profile) {
    useCabinetProfileStore.getState().setProfile(migrateCabinetProfile(file.profile));
  }
  const saved = saveLocalProject(storage, { project: projectForOpen(file, answer.mode), units: file.units, at });
  // A different job: the undo stack from the last one must not reach into it (turn 12, CLAUDE.md F9).
  useHistoryStore.getState().clear();
  const store = useProjectStore.getState();
  store.loadProject(saved.project, saved.units);
  if (saved.stored === false) {
    useProjectStore.getState().markUnsaved();
    ui.notify(`Not saved: ${notOnShelf(saved)}`, 'error');
  } else {
    ui.notify(
      `${jobLabel(saved.project)} opened from ${picked.name}`
        + `${answer.takeProfile ? ', with the file\'s workshop settings' : ''}.`,
      'ok',
    );
  }
  ui.openEditor();
  return 'opened';
}
