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
//
// T-CC1a F4 (the owner, 30.10.2026: *"w cc musimy zapisywac na glownej stronie;
// projekty dzielimy na itemy"*): the list is Joinery Core's (lib/jcList.js). The
// shelf is no longer shown; what survives is the browser door, the logo kept
// once ({ ref }) and the shelf's rows until PART C's one save replaces them.

export const LIBRARY_KEY = 'cc.library.v1';

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

/**
 * The shelf, written. T82 F20, after the review: the browser's refusal (its
 * storage full, private mode) is RETURNED, never swallowed, so the save that
 * asked can say in words that the job is not on this computer (`persist.js`).
 * Null when the write was taken.
 */
function write(storage, data) {
  try { storage.setItem(LIBRARY_KEY, JSON.stringify(data)); } catch (err) { return err || new Error('the write was refused'); }
  return null;
}

/** The refusal in a joiner's words: the browser's quota error is "full". */
function storageRefusal(err) {
  const name = String(err?.name || '');
  if (/quota/i.test(name) || /quota/i.test(String(err?.message || ''))) return 'this computer\'s storage for the app is full';
  return `this computer's storage refused it (${String(err?.message || name || 'no reason given')})`;
}

/**
 * The sentence for a job the shelf did not take (`saveLocalProject` answered
 * `stored: false`), after "Not saved: ". One sentence for every road that
 * puts a job on the shelf: File > Save, Save as, Update and save, the start
 * screen's new job. Null when the job is on the shelf.
 */
export function notOnShelf(row) {
  if (!row || row.stored !== false) return null;
  return `${row.storeError || storageRefusal(null)}, so this job is not on its shelf. Remove jobs you no longer need on the start screen and save again.`;
}

// ─── T82 F20, AFTER THE REVIEW · THE LOGO IS KEPT ONCE ──────────────────────
//
// The owner, 25.10.2026, 11:40: *"do tego dodawanie loga do rysunkow musze
// miec dzisiaj profesjonalne rysunki dla klientow"*. The logo (up to the
// profile's `drawings.set.logo.maxKb`) is the company's, and it was copied
// into every job, so the shelf (ONE key) filled at about 19 jobs and the 20th
// was reported saved and lost. Now the picture is kept ONCE, under its own key
// beside the company memory, by an id read off its own bytes; a job on the
// shelf (and the current-job cache, and the company memory) carries only
// `{ ref }`, and the picture is put back when the job is read. In memory the
// job holds the picture whole, so every sheet draws it as before. A job saved
// with the picture inside it (by F20's first build) still opens and draws;
// its next save keeps the picture once like any other.
export const LOGO_KEY = 'cabinet-core.titleBlock.logos';

let lastLogo = { key: null, id: null };
/** The picture's id, read off its bytes (FNV-1a over the data URLs, and their length). */
export function logoId(logo) {
  const key = `${logo?.href || ''}|${logo?.raster || ''}`;
  if (lastLogo.key === key) return lastLogo.id;
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  const id = `logo-${h.toString(16).padStart(8, '0')}-${key.length.toString(36)}`;
  lastLogo = { key, id };
  return id;
}

function readLogos(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(LOGO_KEY) || 'null');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

/** The logo the shelf names by `ref`, or null. */
function logoForRef(storage, ref) {
  const hit = ref ? readLogos(storage)[ref] : null;
  return hit && typeof hit.href === 'string' ? hit : null;
}

/**
 * Keep a picture once. Returns its `{ ref }`, or null when the browser refused
 * the write (the caller then keeps the picture where it was, nothing lost).
 * `prune` (the company memory taking a NEW picture) lets go of every older
 * picture no job on the shelf names any more.
 */
function keepLogo(storage, logo, { prune = false } = {}) {
  if (!logo || typeof logo.href !== 'string' || !storage) return null;
  const ref = logoId(logo);
  // Asked on every cache write and every save: a picture the key already
  // holds is found by its id in the text, without parsing the pictures.
  let raw = null;
  try { raw = storage.getItem(LOGO_KEY); } catch { raw = null; }
  if (typeof raw === 'string' && raw.includes(`"${ref}":`)) return { ref };
  const next = { ...readLogos(storage) };
  if (prune) {
    const named = new Set(read(storage).projects.map((p) => p.project?.titleBlock?.company?.logo?.ref).filter(Boolean));
    for (const id of Object.keys(next)) if (!named.has(id)) delete next[id];
  }
  const { href, width, height, raster } = logo;
  next[ref] = { href, width, height, ...(raster ? { raster } : {}) };
  try { storage.setItem(LOGO_KEY, JSON.stringify(next)); } catch { return null; }
  return { ref };
}

/** A company with its picture as a `{ ref }`, kept once; as it was when it cannot be kept. */
export function companyWithLogoRef(storage, company, opts) {
  const logo = company?.logo;
  if (!logo || typeof logo.href !== 'string') return company;
  const kept = keepLogo(storage, logo, opts);
  return kept ? { ...company, logo: kept } : company;
}

/** A company with its picture put back from its `{ ref }`; a ref with no picture stays a ref (no logo). */
export function companyWithLogo(storage, company) {
  const ref = company?.logo?.ref;
  if (!ref || typeof company.logo.href === 'string') return company;
  const logo = logoForRef(storage, ref);
  return logo ? { ...company, logo } : company;
}

/** The job as the shelf (or the cache) keeps it: its logo a `{ ref }`. */
export function projectWithLogoRef(storage, project) {
  const company = project?.titleBlock?.company;
  const next = companyWithLogoRef(storage, company);
  return next === company ? project : { ...project, titleBlock: { ...project.titleBlock, company: next } };
}

/** The job as it is read back: its logo whole again. */
export function projectWithLogo(storage, project) {
  const company = project?.titleBlock?.company;
  const next = companyWithLogo(storage, company);
  return next === company ? project : { ...project, titleBlock: { ...project.titleBlock, company: next } };
}

// T-CC1a F5 (law 4): CC mints no id of its own; an item's id is the one Joinery Core's cc_create_item returned.

/**
 * Save (insert or replace) one project with its units.
 * `openedAt` is set too: saving a project is using it, so it also becomes the
 * most recent one.
 */
export function saveLocalProject(storage, { project, units, at = 0, id = null }) {
  const data = read(storage);
  const projectId = project?.id || id || null;
  // T-CC1a F5: a job without an item id is not kept under an invented one: the shelf says so in words.
  if (!projectId) {
    return {
      id: null, name: project?.name || 'Untitled project', project, units: Array.isArray(units) ? units : [],
      stored: false, storeError: 'this job has no item in Joinery Core yet',
    };
  }
  const row = {
    id: projectId,
    name: project?.name || 'Untitled project',
    // Turn 7 (BACKLOG #41): the NUMBER is what a workshop calls a job, and it
    // is on the row rather than only inside the project blob so the start
    // screen and the next auto-number can read it without opening every
    // project on the shelf.
    number: project?.number ? String(project.number) : '',
    client: project?.client ? String(project.client) : '',
    project: { ...project, id: projectId },
    units: Array.isArray(units) ? units : [],
    unit_count: Array.isArray(units) ? units.length : 0,
    updated_at: at,
    opened_at: at,
    source: 'local',
  };
  // T82 F20, after the review: the shelf keeps the job with its logo as a
  // `{ ref }` (the picture once, `keepLogo`), and says whether the browser
  // took the write: `stored` false and `storeError` the refusal, never a row
  // reported saved that is not on the shelf.
  const shelved = { ...row, project: projectWithLogoRef(storage, row.project) };
  const projects = [shelved, ...data.projects.filter((p) => p.id !== projectId)];
  const refused = write(storage, { projects });
  return refused ? { ...row, stored: false, storeError: storageRefusal(refused) } : { ...row, stored: true };
}

/** Every project on the shelf, most recently touched first. */
export function listLocalProjects(storage) {
  return [...read(storage).projects]
    .sort((a, b) => (Number(b.updated_at) || 0) - (Number(a.updated_at) || 0))
    .map((p) => ({
      id: p.id,
      name: p.name,
      number: p.number || p.project?.number || '',
      client: p.client || p.project?.client || '',
      unit_count: p.unit_count ?? p.units?.length ?? 0,
      updated_at: p.updated_at || 0,
      opened_at: p.opened_at || 0,
      source: 'local',
    }));
}

// T-CC1a F4: `nextProjectNumber` and the shelf's own Recent (`recentProjects`, `touchLocalProject`) are deleted: a
// project number is Joinery Core's, never proposed here, and Recent is per tenant (lib/jcList.js readRecent).

/** The project and its units, or null when the id is unknown. */
export function loadLocalProject(storage, id) {
  const row = read(storage).projects.find((p) => p.id === id);
  if (!row) return null;
  // T82 F20, after the review: the logo the shelf names by `{ ref }` comes back whole.
  return { project: projectWithLogo(storage, { ...row.project, id: row.id, name: row.name }), units: row.units || [] };
}

// T-CC1a F4: `deleteLocalProject` (the start screen's x) and `mergeProjectLists` (the cloud list) are deleted:
// an item is archived in Joinery Core (cc_archive_item), never destroyed (law 8).
