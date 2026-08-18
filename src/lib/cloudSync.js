import { supabase, isMockMode, withDb } from './supabase.js';

// ─── Cloud persistence ───
// Every function degrades gracefully: without keys (or before sql/001_init.sql
// has been run) it returns a mock result and the app keeps working on the
// localStorage cache. Nothing here ever throws at the caller.

export async function listProjects() {
  const { data, mock, error } = await withDb(
    (db) => db.from('cc_projects').select('id, name, room, updated_at').order('updated_at', { ascending: false }),
    [],
  );
  return { projects: data || [], mock, error };
}

export async function loadProject(projectId) {
  if (isMockMode || !supabase) return { project: null, units: [], mock: true, error: null };
  const p = await withDb((db) => db.from('cc_projects').select('*').eq('id', projectId).single(), null);
  if (!p.data) return { project: null, units: [], mock: p.mock, error: p.error };
  const u = await withDb(
    (db) => db.from('cc_units').select('*').eq('project_id', projectId).order('sort_order', { ascending: true }),
    [],
  );
  return {
    project: {
      id: p.data.id, name: p.data.name, room: p.data.room,
      jc_tenant_id: p.data.jc_tenant_id, jc_project_id: p.data.jc_project_id,
    },
    units: (u.data || []).map((row) => ({ id: row.id, type: row.type, position: row.position, params: row.params })),
    mock: false,
    error: p.error || u.error,
  };
}

/**
 * Save the whole project. Units are replaced wholesale — the project is small
 * and this keeps the client free of diffing logic that could silently drop a
 * unit. RLS makes both statements owner-scoped server-side.
 */
export async function saveProject(project, units) {
  if (isMockMode || !supabase) return { project, mock: true, error: null };

  const payload = {
    name: project.name,
    room: project.room,
    jc_tenant_id: project.jc_tenant_id ?? null,
    jc_project_id: project.jc_project_id ?? null,
  };

  let projectId = project.id;
  if (projectId) {
    const res = await withDb((db) => db.from('cc_projects').update(payload).eq('id', projectId).select().single(), null);
    if (res.error) return { project, mock: false, error: res.error };
  } else {
    const res = await withDb((db) => db.from('cc_projects').insert(payload).select().single(), null);
    if (res.error || !res.data) return { project, mock: false, error: res.error };
    projectId = res.data.id;
  }

  const del = await withDb((db) => db.from('cc_units').delete().eq('project_id', projectId), null);
  if (del.error) return { project: { ...project, id: projectId }, mock: false, error: del.error };

  if (units.length) {
    const rows = units.map((u, i) => ({
      project_id: projectId, type: u.type, position: u.position, params: u.params, sort_order: i,
    }));
    const ins = await withDb((db) => db.from('cc_units').insert(rows), null);
    if (ins.error) return { project: { ...project, id: projectId }, mock: false, error: ins.error };
  }

  return { project: { ...project, id: projectId }, mock: false, error: null };
}

export async function deleteProject(projectId) {
  return withDb((db) => db.from('cc_projects').delete().eq('id', projectId), null);
}

// ─── MATERIAL ASSIGNMENTS, PER PROJECT (turn 39, CLAUDE.md F2) ──────────────
//
// The owner: *"każdy jeden projekt powinien mieć Assign materials"*. One row
// per project in `cc_material_assignments` (sql/006_tura39.sql), holding the
// schema-2 blob `engine/partRegistry.js` normalises.
//
// GRACEFUL DEGRADATION IS THE POINT (iron rule 6). The migration has not been
// run when the owner first opens this build, and both calls below have to be
// fine with that: `withDb` turns a missing table, a dead network and mock mode
// into the same `null`, the store falls back to the project's own local blob,
// and the BOM shows `part:` lines with no price instead of an empty screen.
// Neither function throws, and neither reports failure as an error the user has
// to read — a save that could not reach the database still happened locally.

/** This project's assignment blob, or null when there is nothing to read. */
export async function loadAssignments(projectId) {
  if (!projectId || isMockMode || !supabase) return null;
  const { data } = await withDb(
    (db) => db.from('cc_material_assignments').select('data').eq('project_id', projectId).limit(1),
    null,
  );
  const row = Array.isArray(data) ? data[0] : data;
  return row?.data || null;
}

/**
 * Write this project's assignment blob. Upsert on the primary key, so the
 * second save of a project overwrites the first rather than colliding.
 *
 * @returns {Promise<{saved:boolean, mock:boolean, error:object|null}>}
 *          `saved: false` is not an exception — it is "the local copy is the
 *          only copy for now", which is exactly the state before the migration
 *          has been applied.
 */
export async function saveAssignments(projectId, data) {
  if (!projectId || isMockMode || !supabase) return { saved: false, mock: true, error: null };
  const res = await withDb(
    (db) => db.from('cc_material_assignments')
      .upsert({ project_id: projectId, data: data || {} }, { onConflict: 'project_id' }),
    null,
  );
  return { saved: !res.error, mock: Boolean(res.mock), error: res.error || null };
}

// ─── COMPANY DEFAULTS (turn 22, CLAUDE.md F2b) ──────────────────────────────
//
// One row per owner in `cc_company_defaults` (sql/004_tura22.sql). Both calls
// degrade exactly as everything else here does: no keys, no session, no table
// and no network all resolve to "no row", and the app runs on profile numbers
// as it always has. Nothing throws at the caller.

export async function loadCompanyDefaults() {
  if (isMockMode || !supabase) return { defaults: null, mock: true, error: null };
  const { data, error } = await withDb(
    (db) => db.from('cc_company_defaults').select('defaults, schema, updated_at').limit(1),
    null,
  );
  const row = Array.isArray(data) ? data[0] : data;
  return { defaults: row?.defaults || null, mock: false, error };
}

/**
 * Save the row. `upsert` on the primary key, which IS the owner — so a
 * workshop has one set of defaults and saving twice replaces rather than
 * duplicating. RLS makes it owner-scoped server-side; the client never sends
 * an owner and could not send somebody else's if it tried.
 */
export async function saveCompanyDefaults(defaults) {
  if (isMockMode || !supabase) {
    return { saved: false, mock: true, error: new Error('Mock data mode — no Supabase keys configured.') };
  }
  const { data } = await supabase.auth.getUser().catch(() => ({ data: null }));
  const owner = data?.user?.id || null;
  if (!owner) return { saved: false, mock: false, error: new Error('Company defaults need an account.') };
  const res = await withDb(
    (db) => db.from('cc_company_defaults')
      .upsert({ owner, defaults, schema: 1 }, { onConflict: 'owner' })
      .select()
      .single(),
    null,
  );
  return { saved: !res.error, mock: false, error: res.error };
}

// ─── Auth ───

export async function getSession() {
  if (isMockMode || !supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session ?? null;
  } catch {
    return null;
  }
}

export async function signIn(email, password) {
  if (isMockMode || !supabase) return { user: null, error: new Error('Mock data mode — no Supabase keys configured.') };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { user: data?.user ?? null, error };
  } catch (error) {
    return { user: null, error };
  }
}

export async function signUp(email, password) {
  if (isMockMode || !supabase) return { user: null, error: new Error('Mock data mode — no Supabase keys configured.') };
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { user: data?.user ?? null, error };
  } catch (error) {
    return { user: null, error };
  }
}

export async function signOut() {
  if (isMockMode || !supabase) return { error: null };
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    return { error };
  }
}

export function onAuthChange(callback) {
  if (isMockMode || !supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data?.subscription?.unsubscribe?.();
}
