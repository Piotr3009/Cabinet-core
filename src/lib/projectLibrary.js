// ─── The local project library ───
//
// Turn 4 puts a START SCREEN in front of the canvas (BACKLOG #7): New project /
// Open / Recent. That needs somewhere for projects to BE, and mock mode has no
// database — so this is the local shelf they sit on, and the same shelf feeds
// the Recent list.
//
// Supabase remains the real home when it is configured (lib/cloudSync.js). This
// never pretends otherwise: `source: 'local'` is on every row it returns, so
// the UI can say where a project came from.
//
// Every function takes its storage, so the rules are testable in node without a
// DOM and without touching the real localStorage.

export const LIBRARY_KEY = 'cc.library.v1';
export const RECENT_LIMIT = 5;

/** The browser's localStorage, or a harmless stand-in (private mode, node). */
export function browserStorage() {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch { /* blocked by the browser */ }
  return memoryStorage();
}

export function memoryStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function read(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(LIBRARY_KEY) || 'null');
    if (!parsed || !Array.isArray(parsed.projects)) return { projects: [] };
    return { projects: parsed.projects.filter((p) => p && p.id) };
  } catch {
    // A corrupted shelf must not take the app down with it — an empty library
    // is recoverable, a crash on boot is not.
    return { projects: [] };
  }
}

function write(storage, data) {
  try { storage.setItem(LIBRARY_KEY, JSON.stringify(data)); } catch { /* quota */ }
  return data;
}

/** A project id that does not collide and reads as ours. */
export function newProjectId(seed) {
  const rand = seed != null ? String(seed) : Math.random().toString(36).slice(2, 9);
  return `loc_${rand}`;
}

/**
 * Save (insert or replace) one project with its units.
 * `openedAt` is set too: saving a project is using it, so it also becomes the
 * most recent one.
 */
export function saveLocalProject(storage, { project, units, at = 0, id = null }) {
  const data = read(storage);
  const projectId = project?.id || id || newProjectId();
  const row = {
    id: projectId,
    name: project?.name || 'Untitled project',
    project: { ...project, id: projectId },
    units: Array.isArray(units) ? units : [],
    unit_count: Array.isArray(units) ? units.length : 0,
    updated_at: at,
    opened_at: at,
    source: 'local',
  };
  const projects = [row, ...data.projects.filter((p) => p.id !== projectId)];
  write(storage, { projects });
  return row;
}

/** Every project on the shelf, most recently touched first. */
export function listLocalProjects(storage) {
  return [...read(storage).projects]
    .sort((a, b) => (Number(b.updated_at) || 0) - (Number(a.updated_at) || 0))
    .map((p) => ({
      id: p.id,
      name: p.name,
      unit_count: p.unit_count ?? p.units?.length ?? 0,
      updated_at: p.updated_at || 0,
      opened_at: p.opened_at || 0,
      source: 'local',
    }));
}

/** The last five OPENED projects — the start screen's Recent list. */
export function recentProjects(storage, limit = RECENT_LIMIT) {
  return [...read(storage).projects]
    .filter((p) => Number(p.opened_at) > 0)
    .sort((a, b) => (Number(b.opened_at) || 0) - (Number(a.opened_at) || 0))
    .slice(0, limit)
    .map((p) => ({
      id: p.id,
      name: p.name,
      unit_count: p.unit_count ?? p.units?.length ?? 0,
      opened_at: p.opened_at,
      source: 'local',
    }));
}

/** The project and its units, or null when the id is unknown. */
export function loadLocalProject(storage, id) {
  const row = read(storage).projects.find((p) => p.id === id);
  if (!row) return null;
  return { project: { ...row.project, id: row.id, name: row.name }, units: row.units || [] };
}

/** Mark a project as just opened, so Recent means recently opened. */
export function touchLocalProject(storage, id, at = 0) {
  const data = read(storage);
  const projects = data.projects.map((p) => (p.id === id ? { ...p, opened_at: at } : p));
  write(storage, { projects });
  return projects.some((p) => p.id === id);
}

export function deleteLocalProject(storage, id) {
  const data = read(storage);
  const projects = data.projects.filter((p) => p.id !== id);
  write(storage, { projects });
  return projects.length !== data.projects.length;
}

/**
 * The list the Open dialog shows: what is on the local shelf, plus whatever the
 * database has, matched up by id so a project saved to both appears ONCE (as
 * the cloud row, which is the one that outlives this browser).
 */
export function mergeProjectLists(local = [], cloud = []) {
  const out = [];
  const seen = new Set();
  for (const c of cloud) {
    if (!c?.id || seen.has(c.id)) continue;
    seen.add(c.id);
    out.push({
      id: c.id,
      name: c.name || 'Untitled project',
      unit_count: c.unit_count ?? null,
      updated_at: Date.parse(c.updated_at || '') || 0,
      source: 'cloud',
    });
  }
  for (const l of local) {
    if (!l?.id || seen.has(l.id)) continue;
    seen.add(l.id);
    out.push(l);
  }
  return out.sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
}
