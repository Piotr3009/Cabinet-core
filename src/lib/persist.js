import { browserStorage, saveLocalProject } from './projectLibrary.js';
import { saveProject as saveCloudProject, saveAssignments } from './cloudSync.js';
import { isMockMode } from './supabase.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';

// ─── Saving, in one place ───
// File ▸ Save and File ▸ Save as… are the same act with a different name, and
// both have to answer the same question: WHERE does this project live?
//
// The local shelf always — it is what makes mock mode a working app rather than
// a demo (CLAUDE.md rule 7). The database as well whenever keys are configured,
// and if the database refuses, the save still HAPPENED and says where.

/**
 * @param {object} args
 *   project, units   the live state
 *   asName           a new name = Save as (a copy; the original stays put)
 *   at               timestamp, injected so the caller owns the clock
 * @returns {Promise<{project:object, message:string, tone:string}>}
 */
export async function persistProject({ project, units, asName = null, at = Date.now(), storage = null }) {
  const shelf = storage || browserStorage();
  // ─── TURN 39 (CLAUDE.md F2): THE ASSIGNMENTS GO WITH THE JOB ─────────────
  //
  // The store is the live editor of the assignments; the project object is what
  // gets written. Folding them in HERE rather than at each call site means a
  // save can never write a stale set, and File ▸ Save, File ▸ Save as… and
  // every future caller get it without remembering to.
  //
  // Reading the store is wrapped: a save must not fail because a store is not
  // there, and a project with no assignments is a project, not an error.
  let assignments = project?.assignments || null;
  try { assignments = useMaterialAssignmentStore.getState().data || assignments; } catch { /* keep what the project had */ }
  const withAssignments = assignments ? { ...project, assignments } : project;

  const named = asName
    ? { ...withAssignments, name: asName, id: null }   // a copy: a new id, not an overwrite
    : withAssignments;

  const row = saveLocalProject(shelf, { project: named, units, at });
  let saved = row.project;

  if (isMockMode) {
    return {
      project: saved,
      message: asName ? `Saved as “${saved.name}” on this computer.` : 'Project saved on this computer.',
      tone: 'ok',
    };
  }

  const res = await saveCloudProject({ ...named }, units);
  if (res.error) {
    return {
      project: saved,
      message: `Saved on this computer — the database refused it: ${res.error.message || 'error'}`,
      tone: 'warn',
    };
  }
  saved = { ...saved, id: res.project?.id || saved.id };
  // The assignment row goes in under whatever id the project ended up with —
  // which for a Save as… is a NEW id, so the copy gets its own materials rather
  // than sharing the original's row.
  //
  // It is deliberately NOT part of the success test. sql/006_tura39.sql has not
  // been run when the owner first opens this build, and a project that saved
  // perfectly must not report a failure because a table nobody created yet
  // refused a write (iron rule 6). The blob is already on the local shelf and in
  // `cc_projects` nowhere — the shelf is what makes it survive.
  if (assignments && saved.id) {
    try {
      useMaterialAssignmentStore.setState({ projectId: saved.id });
      await saveAssignments(saved.id, assignments);
    } catch { /* the local copy is the copy */ }
  }
  return {
    project: saved,
    message: asName ? `Saved as “${saved.name}”.` : 'Project saved.',
    tone: 'ok',
  };
}
