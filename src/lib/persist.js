import { useProjectStore } from '../stores/projectStore.js';
import { getCabinetProfile } from '../engine/profile.js';
import { browserStorage } from './projectLibrary.js';
import { JC_OFFLINE, withDb } from './jcApi.js';
import { createItem } from './jcList.js';
import { byteSize, saveNumbers } from './saveNumbers.js';

// ─── Saving, in one place ───
// File ▸ Save, Update and save, File ▸ Save as… (now "Save as new item"),
// Ctrl+S, the autosave and the save before an export are the same act, and
// they all come here.
//
// ─── T-CC1a F7 · ONE SAVE, ONE REQUEST (CLAUDE.md T-CC1a law 5) ─────────────
// The owner, 30.10.2026: *"moje zdanie to powinno sie wszystko zapisywac na
// pamiec podreczna, dopiero caly json powinien sie zapisac do DB przy
// nacisnieciu Zapisz lub co 5 minut automatycznie"*. A change is memory (and
// the crash buffer, F9); a save is ONE `cc_save_item` through Joinery Core's
// client carrying the whole item JSON, built by the store's projectForSave
// (the one builder: the `.ccproject` shape without `profile`, the logo as its
// `{ ref }`). The shelf write and the cloud branch of the shelf days are
// deleted. A body over `profile.save.maxBodyMb` is refused in words and never
// sent. On a refusal the job stays marked unsaved, the words say why, and the
// crash buffer already holds the work.

/** The words of the size guard (PROPOSED, CLAUDE.md T-CC1a F7.2). */
export const tooLargeWords = (mb) => `This item is too large to save: ${mb} MB. A logo or a picture is riding in it.`;

/** The words of a job with no item (CC mints no id, law 4). */
const NO_ITEM = 'this job has no item in Joinery Core yet. Open it from the list, or start it with New item.';

/** "Saved 14:05": the status words of a save that landed. */
function savedWords(at) {
  const d = new Date(Number(at) || Date.now());
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `Saved ${hh}:${mm}.`;
}

/**
 * The one request's parameters for the item on the screen: `{ p_item_id, p_name, p_design }`, the design from
 * the store's projectForSave. The keepalive save on leaving the page (lib/saveTriggers.js) sends the same.
 */
export function itemPayload({ storage = browserStorage(), at = Date.now(), stamp = true } = {}) {
  const st = useProjectStore.getState();
  // CHAT FIX 01.11.2026: while a Restore's pictures are being read back from the row, nothing is sent (the
  // keepalive on leaving skips; saveOnce reads them first), so the row's pictures are never saved away.
  if (st.project?.visualsPending) return null;
  const p_design = st.projectForSave({ stamp, storage, at });
  return { p_item_id: st.project?.id || null, p_name: st.project?.name || '', p_design };
}

const refused = (project, words, extra = {}) => {
  try { useProjectStore.getState().markUnsaved(); } catch { /* the store is the store */ }
  return {
    project: useProjectStore.getState().project, message: `Not saved: ${words}`, tone: 'error', stored: false,
    error: words, data: null, ...extra,
  };
};

// One save in flight at a time: a second ask while one is out shares its answer (Ctrl+S during an autosave).
let inFlight = null;

/**
 * Save the item on the screen to Joinery Core: ONE `cc_save_item`.
 *
 * @param {object} args
 *   asName   a name = "Save as new item": `cc_create_item` in the same Joinery Core project (the row's binding,
 *            read once), the job becomes that new item, then the same one save
 *   at       timestamp, injected so the caller owns the clock
 *   db       withDb (a test hands its fake)
 *   (`project` and `units` are accepted from the three callers of the shelf days and not read: the item JSON is
 *   built from the store, in one place.)
 * @returns {Promise<{project, message, tone, stored, error, data}>}
 */
export function persistProject({ asName = null, at = Date.now(), storage = null, db = withDb, numbers = null } = {}) {
  if (!asName && inFlight) return inFlight;
  const run = saveOnce({ asName, at, storage: storage || browserStorage(), db, numbers: numbers || saveNumbers(getCabinetProfile()) });
  if (asName) return run;
  inFlight = run.finally(() => { inFlight = null; });
  return inFlight;
}

async function saveOnce({ asName, at, storage, db, numbers }) {
  const start = useProjectStore.getState();
  if (!start.project?.id) return refused(start.project, NO_ITEM);

  if (asName) {
    // "Save as new item" (PROPOSED): a new item in the SAME Joinery Core project. The binding lives in the row's
    // columns, so the row is read once for it; then cc_create_item with the typed name.
    const bind = await db((c) => c.from('cc_items')
      .select('id, jc_pipeline_id, jc_project_id, jc_project_number').eq('id', start.project.id).single(), null);
    if (bind?.mock) return refused(start.project, JC_OFFLINE);
    const row = bind?.data;
    if (bind?.error || !row || (!row.jc_pipeline_id && !row.jc_project_id)) {
      return refused(start.project, String(bind?.error?.message || bind?.error || 'Joinery Core did not say which project this item belongs to.'));
    }
    const project = row.jc_pipeline_id
      ? { kind: 'pipeline', id: row.jc_pipeline_id }
      : { kind: 'production', id: row.jc_project_id };
    const made = await createItem({ name: asName, project, db });
    if (made.error) return refused(start.project, made.error);
    useProjectStore.setState((s) => ({
      project: {
        ...s.project,
        id: made.row.id,
        name: made.row.name || asName,
        number: String(made.row.jc_project_number ?? row.jc_project_number ?? s.project.number ?? ''),
        savedAt: null,
        revision: made.row.revision ?? null,
      },
    }));
  }

  if (useProjectStore.getState().project?.visualsPending) {
    const back = await useProjectStore.getState().fetchRowVisuals({ db });
    if (!back.ok) return refused(useProjectStore.getState().project, `${back.error} The item's pictures are read back from Joinery Core first, so they are not lost.`);
  }
  const params = itemPayload({ storage, at });
  if (!params) return refused(useProjectStore.getState().project, 'the item\'s pictures are still being read back from Joinery Core. Try again in a moment.');
  const body = JSON.stringify(params);
  const bytes = byteSize(body);
  if (bytes > Number(numbers.maxBodyMb) * 1024 * 1024) {
    return refused(params.p_design.project, tooLargeWords((bytes / (1024 * 1024)).toFixed(1)));
  }
  const sent = useProjectStore.getState();
  const res = await db((c) => c.rpc('cc_save_item', params), null);
  if (res?.mock) return refused(sent.project, JC_OFFLINE);
  if (res?.error) return refused(sent.project, String(res.error?.message || res.error));
  const data = (Array.isArray(res.data) ? res.data[0] : res.data) || {};
  const now = useProjectStore.getState();
  const stamped = { savedAt: data.updated_at || null, revision: data.revision ?? now.project.revision ?? null };
  if (now.project === sent.project && now.units === sent.units) {
    now.markSaved({ ...now.project, ...stamped });
  } else {
    // The joiner kept working while the request was out: the row holds what was sent; what came after is
    // still unsaved, and the next save carries it.
    useProjectStore.setState((s) => ({ project: { ...s.project, ...stamped }, dirty: true }));
  }
  const message = asName ? `Saved as new item "${useProjectStore.getState().project.name}". ${savedWords(at)}` : savedWords(at);
  return { project: useProjectStore.getState().project, message, tone: 'ok', stored: true, error: null, data };
}
