import { browserStorage, saveLocalProject } from './projectLibrary.js';
import { saveProject as saveCloudProject } from './cloudSync.js';
import { isMockMode } from './supabase.js';

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
  const named = asName
    ? { ...project, name: asName, id: null }   // a copy: a new id, not an overwrite
    : project;

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
  return {
    project: saved,
    message: asName ? `Saved as “${saved.name}”.` : 'Project saved.',
    tone: 'ok',
  };
}
