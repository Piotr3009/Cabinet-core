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
//   openProjectFromFile()   T-CC1a F6: a picked file IMPORTED: bound to the
//                           Joinery Core project the picker returns
//                           (components/jc/JcProjectPicker.jsx, handed in as
//                           `pickProject`), born with cc_create_item, saved
//                           once with cc_save_item; its settings not applied.

import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { useHistoryStore } from '../stores/historyStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { getCabinetProfile } from '../engine/profile.js';
import { browserStorage } from './projectLibrary.js';
import {
  buildProjectFile, jobLabel, parseProjectFile, projectFileName,
  projectFileQuestions, projectFileText, projectForOpen,
} from './projectFile.js';
import { download } from './exporters.js';
import { withDb } from './jcApi.js';
import { persistProject } from './persist.js';
import { createItem, loadJcList, projectOfItem, pushRecent } from './jcList.js';

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

// ─── T-CC1a F6 · OPEN FROM FILE IS THE IMPORT ROAD (the owner's answer 10) ───
//
// The owner, 31.10.2026, 01:06: *"w przyszlosci nie bedzie save to file, po
// co?"*: Save to file and Open from file stay ONLY as the one-time import of
// the owner's old jobs, and die in T-CC2. An imported job is an item like any
// other (law 4): it is born bound to the Joinery Core project the joiner picks,
// its id is the server's (projectForOpen's 'copy' road takes the file's id
// away), and ONE cc_save_item puts its design in the row at once. The file's
// workshop settings are not applied to this browser any more: the picker says
// so in read-only words (the company numbers live in Joinery Core from T-CC1b).

/** The words for a file that carries workshop settings (PROPOSED, CLAUDE.md T-CC1a F6.1). */
export const PROFILE_NOT_IMPORTED = 'This file carries workshop settings; they are not imported (the company numbers live in Joinery Core from T-CC1b)';

/**
 * The item JSON (law 5): the `.ccproject` shape WITHOUT `profile`, the logo as `{ ref }`, the assignments folded.
 * T-CC1a F7: built by the store's projectForSave, the ONE builder; this name stays for the import's readers.
 */
export function itemDesign({ storage = browserStorage(), at = Date.now() } = {}) {
  return useProjectStore.getState().projectForSave({ storage, at });
}

/**
 * ONE `cc_save_item` of the item on the screen. T-CC1a F7: through lib/persist.js persistProject, the one save
 * road (the size guard, markSaved and `project.savedAt` on success, unsaved on a refusal). Resolves
 * `{ ok, data, error }` with the error in words (JC_OFFLINE when JC did not answer).
 */
export async function saveItem({ storage = browserStorage(), at = Date.now(), db = withDb } = {}) {
  const r = await persistProject({ storage, at, db });
  return r.stored ? { ok: true, data: r.data, error: null } : { ok: false, data: null, error: r.error || r.message };
}

/**
 * Open a picked file (`{ name, text }`, lib/projectFile.js pickProjectFile) as an IMPORT: read it (the version
 * gate); when the file's own id is an item of the list (a file saved from a Joinery Core item), the id-collision
 * question (`ask`, components/ProjectFileModal.jsx; `{ mode }` or null for Cancel): Replace saves the file into
 * that item, Keep both imports a copy. Otherwise, and for Keep both, `pickProject` (the picker window,
 * components/jc/JcProjectPicker.jsx) resolves the project row it belongs to, or null for Cancel; it is told when
 * the file carries settings, which are not imported; then `cc_create_item` with the file's `project.name` and that
 * binding, the job opened under the server's id (projectForOpen's 'copy' road), and ONE `cc_save_item` at once so
 * the row holds the design. `beforeOpen` runs once the answers are in and before anything is replaced.
 * Resolves 'opened', 'cancelled' or 'refused'.
 */
export async function openProjectFromFile({
  picked, anchor = null, beforeOpen = null, storage = browserStorage(), at = Date.now(),
  ask = null, pickProject = null, list = null, db = withDb,
}) {
  if (!picked) return 'cancelled';
  const ui = useUiStore.getState();
  const read = parseProjectFile(picked.text);
  if (!read.ok) {
    ui.notify(`${picked.name}: ${read.error}`, 'error');
    return 'refused';
  }
  const { file } = read;
  const jobName = String(file.project?.name || '').trim() || 'Untitled item';
  const profileNote = Boolean(file.profile);
  const jc = list && !list.error ? list : await loadJcList({ db });
  // The id-collision question, against Joinery Core's items (never this browser's shelf); never the settings.
  const { collision } = projectFileQuestions({ file: { project: file.project }, shelfRows: jc.error ? [] : jc.items });
  let mode = 'copy';
  if (collision) {
    // No window to ask in is a Cancel: nothing in Joinery Core is replaced unasked.
    const answer = typeof ask === 'function' ? await ask({ file, questions: { collision, profile: null }, anchor }) : null;
    if (!answer) return 'cancelled';
    mode = answer.mode === 'replace' ? 'replace' : 'copy';
  }
  let row;
  let project;
  if (mode === 'replace') {
    row = collision;
    project = projectOfItem(jc, collision) || { number: collision.jc_project_number || '', client: '' };
  } else {
    // No window to ask in is a Cancel: an item is never made unbound.
    project = typeof pickProject === 'function'
      ? await pickProject({ jobName: jobLabel(file.project), profileNote, anchor })
      : null;
    if (!project) return 'cancelled';
    const made = await createItem({ name: jobName, project, db });
    if (made.error) {
      ui.notify(`${picked.name}: not imported. ${made.error}`, 'error');
      return 'refused';
    }
    row = made.row;
  }
  if (beforeOpen) beforeOpen();
  const { jc_tenant_id: _t, jc_project_id: _p, jc_pipeline_id: _l, ...inner } = projectForOpen(file, 'copy');
  const bound = {
    ...inner,
    id: row.id,
    name: row.name || jobName,
    number: String(row.jc_project_number ?? project.number ?? ''),
    client: project.client || '',
  };
  // A different job: the undo stack from the last one must not reach into it (turn 12, CLAUDE.md F9).
  useHistoryStore.getState().clear();
  useProjectStore.getState().loadProject(bound, file.units);
  const saved = await saveItem({ storage, at, db });
  try { pushRecent(storage, useAuthStore.getState().tenant?.id, row.id); } catch { /* Recent is a convenience */ }
  const where = `${project.number || ''} ${project.name || ''}`.trim();
  if (!saved.ok) {
    ui.notify(`${jobLabel(bound)} imported into ${where}, not saved yet: ${saved.error}`, 'error');
  } else {
    ui.notify(
      `${jobLabel(bound)} imported from ${picked.name} into ${where}${profileNote ? `. ${PROFILE_NOT_IMPORTED}.` : '.'}`,
      'ok',
    );
  }
  ui.openEditor();
  return 'opened';
}
