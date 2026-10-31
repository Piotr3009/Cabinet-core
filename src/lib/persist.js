import { browserStorage, notOnShelf, saveLocalProject } from './projectLibrary.js';
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
  const saved = row.project;
  // T82 F20, after the review: a job the browser would not take is NOT on
  // this computer, and the save says so in words instead of "saved". The job
  // stays open as it is; nothing in it is lost while the window is open.
  // `stored` says whether the save landed anywhere (the shelf, or the
  // database where that is the road): a caller marks the job saved only then.
  const notHere = notOnShelf(row);

  // T-CC1a F3: the cloud branch (cc_projects, the assignments' row) is deleted with the road; the one request to
  // Joinery Core is PART C's cc_save_item (*"oczywiscie do CC laczysz sie tylko przez JC"*).
  if (notHere) return { project: saved, message: `Not saved: ${notHere}`, tone: 'error', stored: false };
  return {
    project: saved,
    message: asName ? `Saved as “${saved.name}” on this computer.` : 'Project saved on this computer.',
    tone: 'ok',
    stored: true,
  };
}
