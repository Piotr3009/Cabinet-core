/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T-CC1a F4 · THE LIST IS JOINERY CORE'S (CLAUDE.md T-CC1a law 3) ─────────
//
// The owner, 30.10.2026: *"w cc musimy zapisywac na glownej stronie; projekty
// dzielimy na itemy; kazdy projekt dodany to folder w JC"*; *"automatyczne
// polaczenie danego projektu do danego pipelinu lub production projektu"*.
//
// The start screen shows the company's pipeline and production projects as
// Joinery Core holds them, each with its Cabinet Core items under it. A
// project number is JC's and is never typed or invented here. The list is
// FOUR reads through JC's own client (`withDb`, lib/jcApi.js), never a write;
// the item list never reads the design (the big column). Everything below the
// reads is pure: rows in, a list out.

import { JC_OFFLINE, withDb } from './jcApi.js';

/** The columns of each read, exactly (CLAUDE.md T-CC1a F4.1). The LIST read of cc_items never names `design`. */
export const LIST_COLUMNS = {
  pipeline_projects: 'id, project_number, name, client_id, site_address, status',
  projects: 'id, project_number, name, client_id, site_address, status, pipeline_id',
  clients: 'id, company_name',
  cc_items: 'id, name, revision, updated_at, archived_at, jc_pipeline_id, jc_project_id, jc_project_number',
};

/** The project status the list shows (PROPOSED, CLAUDE.md T-CC1a THE NUMBERS). */
export const LIST_STATUS = 'active';

/** The two groups, in their order (PROPOSED: Production first). */
export const LIST_GROUPS = [
  { id: 'production', label: 'Production' },
  { id: 'pipeline', label: 'Pipeline' },
];

/** A read's error in words: JC's own message, or JC_OFFLINE when JC did not answer. */
function words(res) {
  if (!res) return JC_OFFLINE;
  if (res.mock) return JC_OFFLINE;
  if (res.error) return String(res.error?.message || res.error?.error || res.error || JC_OFFLINE);
  return null;
}

/**
 * The four reads. Resolves `{ pipeline, production, items, clients: Map<id, company_name>, error }`;
 * `error` is the first refusal in words (JC_OFFLINE when JC did not answer), and the rows are then empty:
 * the screen says the words and offers Retry, never an empty list in silence.
 */
export async function loadJcList({ db = withDb } = {}) {
  const [pipe, prod, cli, items] = await Promise.all([
    db((c) => c.from('pipeline_projects').select(LIST_COLUMNS.pipeline_projects)
      .eq('status', LIST_STATUS).order('project_number', { ascending: false }), []),
    db((c) => c.from('projects').select(LIST_COLUMNS.projects)
      .eq('status', LIST_STATUS).order('project_number', { ascending: false }), []),
    db((c) => c.from('clients').select(LIST_COLUMNS.clients), []),
    db((c) => c.from('cc_items').select(LIST_COLUMNS.cc_items)
      .order('jc_project_number', { ascending: false }), []),
  ]);
  const error = words(pipe) || words(prod) || words(cli) || words(items);
  if (error) return { pipeline: [], production: [], items: [], clients: new Map(), error };
  const rows = (r) => (Array.isArray(r?.data) ? r.data : []);
  return {
    pipeline: rows(pipe),
    production: rows(prod),
    items: rows(items),
    clients: new Map(rows(cli).map((c) => [c.id, c.company_name || ''])),
    error: null,
  };
}

/** The key an item and its project meet on: `p:<project id>` (production) or `pl:<pipeline id>`. */
export function projectKey(kind, id) {
  return kind === 'production' ? `p:${id}` : `pl:${id}`;
}

/** The key of the project an item is bound to (exactly one of the two ids, the row's columns). */
export function itemKey(item) {
  if (item?.jc_project_id) return `p:${item.jc_project_id}`;
  if (item?.jc_pipeline_id) return `pl:${item.jc_pipeline_id}`;
  return null;
}

/** Items grouped under their project: `Map<projectKey, items[]>`, newest first inside a project. */
export function groupItems(items) {
  const out = new Map();
  for (const it of Array.isArray(items) ? items : []) {
    const key = itemKey(it);
    if (!key) continue;
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(it);
  }
  for (const list of out.values()) {
    list.sort((a, b) => (Date.parse(b.updated_at || '') || 0) - (Date.parse(a.updated_at || '') || 0));
  }
  return out;
}

/** A project row as the screen shows it (and as New item and the import picker are handed it). */
export function projectRow(kind, row, clients) {
  return {
    key: projectKey(kind, row.id),
    kind,
    id: row.id,
    number: String(row.project_number ?? ''),
    name: String(row.name ?? ''),
    client: (clients && row.client_id != null ? clients.get(row.client_id) : '') || '',
  };
}

const has = (text, q) => String(text || '').toLowerCase().includes(q);

/**
 * The screen's list: `[{ id, label, projects: [{ ...projectRow, items }] }]`, the two groups in order.
 * An archived item is hidden unless `showArchived`; `query` narrows by project number, project name,
 * client or item name (a project that matches keeps all its items; otherwise only the items that match).
 */
export function listView(list, { query = '', showArchived = false } = {}) {
  const q = String(query || '').trim().toLowerCase();
  const grouped = groupItems((list?.items || []).filter((it) => showArchived || !it.archived_at));
  return LIST_GROUPS.map(({ id, label }) => {
    const rows = (id === 'production' ? list?.production : list?.pipeline) || [];
    const projects = [];
    for (const r of rows) {
      const p = projectRow(id, r, list?.clients);
      const items = grouped.get(p.key) || [];
      if (!q) { projects.push({ ...p, items }); continue; }
      const projectHit = has(p.number, q) || has(p.name, q) || has(p.client, q);
      const itemHits = items.filter((it) => has(it.name, q));
      if (projectHit) projects.push({ ...p, items });
      else if (itemHits.length) projects.push({ ...p, items: itemHits });
    }
    return { id, label, projects };
  });
}

/** Every project of the list as rows (for the import picker), Production first. */
export function allProjects(list) {
  return listView(list).flatMap((g) => g.projects);
}

/** The project row an item belongs to, or null. */
export function projectOfItem(list, item) {
  const key = itemKey(item);
  return key ? allProjects(list).find((p) => p.key === key) || null : null;
}

// ─── RECENT, PER TENANT (PROPOSED key, CLAUDE.md T-CC1a F4.2) ───────────────
export const RECENT_LIMIT = 5;
export const recentKey = (tenantId) => `cc.${tenantId}.recent.v1`;

/** The last opened item ids of a tenant, newest first. */
export function readRecent(storage, tenantId) {
  if (!tenantId || !storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(recentKey(tenantId)) || '[]');
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string' && id).slice(0, RECENT_LIMIT) : [];
  } catch { return []; }
}

/** An item opened: it goes to the top, the list keeps five. Returns the list. */
export function pushRecent(storage, tenantId, itemId) {
  if (!tenantId || !itemId || !storage) return readRecent(storage, tenantId);
  const next = [itemId, ...readRecent(storage, tenantId).filter((id) => id !== itemId)].slice(0, RECENT_LIMIT);
  try { storage.setItem(recentKey(tenantId), JSON.stringify(next)); } catch { /* Recent is a convenience */ }
  return next;
}

// ─── ARCHIVED, NEVER DESTROYED (CLAUDE.md T-CC1a law 8) ─────────────────────
/** Archive (or, with `restore`, bring back) one item: `cc_archive_item`. Resolves `{ ok, error }` in words. */
export async function archiveItem(itemId, { restore = false, db = withDb } = {}) {
  const res = await db((c) => c.rpc('cc_archive_item', { p_item_id: itemId, p_restore: Boolean(restore) }), null);
  const error = words(res);
  return error ? { ok: false, error } : { ok: true, error: null };
}

/** The revision letter as the list shows it ('' for none). */
export function revisionLabel(item) {
  const r = item?.revision;
  return r == null || r === '' ? '' : String(r);
}
