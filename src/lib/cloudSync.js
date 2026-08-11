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
