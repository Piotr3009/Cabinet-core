// ─── THE MATERIALS WAREHOUSE (turn 51, CLAUDE.md F7) ────────────────────────
//
// As mocked up and agreed with the owner on 25.08.2026. `Database ▸ Materials`
// opens THIS, not the design modal.
//
// ─── THE MODEL IS PRODUCTION CORE'S, EXACTLY ────────────────────────────────
//
// CLAUDE.md names the twelve fields and this module holds them in that order,
// because the order is the CSV and *"the same columns as PC so the two files
// interchange"*. A thirteenth column of ours in the middle of them would break
// that sentence quietly, the first time somebody opened one file in the other
// app — so the two fields that ARE ours (`id` and `price_source`) are not in
// the CSV at all, and the reason is written beside them.
//
// ─── ITS OWN TABLE ──────────────────────────────────────────────────────────
//
// *"Own table, not shared with PC."*  It is also not shared with Cabinet Core's
// OWN `cc_materials`, which is the short stock list the assignment modal reads
// (turn 39) and which has six columns to this one's twelve. Two lists with
// different jobs and different shapes are two tables; merging them would have
// meant one of the two screens losing fields it needs.
//
// ─── AND ITS OWN CATEGORIES ────────────────────────────────────────────────
//
// The owner's nine, in his order. A material with no category lands in OTHERS,
// which is a real department with a real count and not a filter that hides it:
// a row nobody has filed is a row somebody has to file, and it has to be
// findable to be filed.
//
// Pure functions and pure data. No React, no store, no network.

import { warehouseStamp } from './naming.js';

/** The owner's own departments, in his own order. */
export const CATEGORIES = [
  { id: 'sheets', label: 'Sheets' },
  { id: 'timber', label: 'Timber' },
  { id: 'hinges', label: 'Hinges' },
  { id: 'runners', label: 'Runners' },
  { id: 'other_hardware', label: 'Other hardware' },
  { id: 'bead', label: 'Bead' },
  { id: 'drawer_pins', label: 'Drawer pins' },
  { id: 'paints', label: 'Paints' },
  { id: 'consumables', label: 'Consumables' },
];

/** Where a row with no category lands. A department, not a hiding place. */
export const OTHERS = { id: 'others', label: 'Others' };

/**
 * Every department the list draws down its left-hand side.
 *
 * Module-private, like `CATEGORY_IDS`, `nextItemNumber` and `splitCsvLine`
 * below: each is one step of an answer this module already gives whole
 * (`departmentCounts`, `categoryOf`, `migrateMaterial`, `fromCsv`), and a
 * second door onto a step is a second thing to keep in step.
 */
const DEPARTMENTS = [...CATEGORIES, OTHERS];

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

/**
 * The CSV columns, in PC's own order — *"the same columns as PC so the two
 * files interchange."*
 *
 * `id` and `price_source` are OURS and are deliberately absent: a column PC
 * does not know would break the interchange the moment somebody opened one
 * file in the other app. `price_source` is re-derived on import (below) rather
 * than carried, which is the honest answer — a file cannot tell you whether the
 * figure in it was typed by a human.
 */
export const CSV_COLUMNS = [
  'item_number', 'name', 'category', 'subcategory', 'size', 'thickness',
  'color', 'unit', 'cost_per_unit', 'image_url', 'jc_uuid', 'notes',
];

/** Where a price came from. The record says WHICH (CLAUDE.md F7). */
export const PRICE_TYPED = 'typed';

// === T78 F21 (CLAUDE.md PART F): THE PAINT AS A MATERIAL ======================
//
// The owner, 11.10.2026: *"Database > Materials gets a department Paints (the
// warehouse's twelve columns plus: type topcoat | primer, sheen, coverage m2
// per litre per coat, coats, tin sizes)."*  The department has stood in
// CATEGORIES since T51; tonight a row of it carries its PAINT record. The five
// fields ride the row and the table (`paint`, one jsonb column:
// supabase/migrations/t78_warehouse_paint.sql), NOT the CSV: the CSV is PC's
// twelve columns and *"the same columns as PC so the two files interchange"*
// is the older law. The spray page reads them (engine/spray.js paintSpecOf)
// for the litres and the tins; where a field is empty the profile's defaults
// answer and the page says so.

/** The two kinds of paint a row may be. */
export const PAINT_TYPES = Object.freeze(['topcoat', 'primer']);

/** The paint fields, in the order the card shows them. */
export const PAINT_FIELDS = Object.freeze(['type', 'sheen', 'coverage_m2_per_l', 'coats', 'tin_sizes']);

/** "1, 2.5, 5" (or an array) into litres, positive numbers only, sorted, no doubles. */
export function parseTinSizes(value) {
  const list = Array.isArray(value) ? value : String(value ?? '').split(/[,;\s]+/);
  const out = [];
  for (const v of list) {
    const n = Number(String(v).trim().replace(',', '.'));
    if (Number.isFinite(n) && n > 0 && !out.includes(n)) out.push(n);
  }
  return out.sort((a, b) => a - b);
}

/**
 * The paint record of a row, normalised: `type` one of PAINT_TYPES or null,
 * `sheen` text, `coverage_m2_per_l` and `coats` numbers or null, `tin_sizes`
 * as typed and `tin_sizes_l` parsed. Null for a row that carries no paint
 * field at all (every row that is not a paint).
 */
export function paintOf(material) {
  const p = material?.paint;
  if (!p || typeof p !== 'object') return null;
  const num = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };
  const type = PAINT_TYPES.includes(String(p.type || '').toLowerCase()) ? String(p.type).toLowerCase() : null;
  const tins = p.tin_sizes ?? (Array.isArray(p.tin_sizes_l) ? p.tin_sizes_l.join(', ') : '');
  return {
    type,
    sheen: str(p.sheen),
    coverage_m2_per_l: num(p.coverage_m2_per_l),
    coats: num(p.coats),
    tin_sizes: str(tins),
    tin_sizes_l: parseTinSizes(tins),
  };
}
export const PRICE_IMPORT = 'import';

const str = (v) => (v == null ? '' : String(v).trim());
// ─── T75 F21 · A NUMBER, READ THE WAY A JOINERYCORE FILE WRITES IT ────────────
//
// verify/t75/p07-probe.md measured the old reading on JoineryCore-shaped rows:
// `42,50` came back as 4250 and `n/a` as 0. A price list from a Polish locale
// would have multiplied every price by a hundred. Now: a unit or a currency
// sign is dropped; where a comma and a point are both present the LAST one is
// the decimal and the other groups thousands; a lone comma with exactly three
// digits after it groups thousands (`1,234`), any other lone comma is the
// decimal (`42,50`); a space groups thousands (`1 234,56`). Anything that is
// still not a number is NULL, never 0: a price nobody gave is not free.
const numOrNull = (v) => {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let t = String(v).trim().replace(/[\s\u00a0]/g, '');
  if (t === '') return null;
  t = t.replace(/[^0-9.,\-eE]/g, '');
  if (!/[0-9]/.test(t)) return null;
  const comma = t.lastIndexOf(',');
  const point = t.lastIndexOf('.');
  if (comma >= 0 && point >= 0) {
    t = comma > point ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  } else if (comma >= 0) {
    t = /^-?\d{1,3}(,\d{3})+$/.test(t) ? t.replace(/,/g, '') : t.replace(/,/g, '.');
  }
  if (!/^-?(\d+\.?\d*|\.\d+)([eE]-?\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/** The category a row is filed under — OTHERS when it names none we know. */
export function categoryOf(material) {
  const said = str(material?.category).toLowerCase().replace(/[\s-]+/g, '_');
  return CATEGORY_IDS.includes(said) ? said : OTHERS.id;
}

/** What a department is called, for a heading. */
export function departmentLabel(id) {
  return DEPARTMENTS.find((d) => d.id === id)?.label || OTHERS.label;
}

/**
 * ─── THE ITEM NUMBER IS AUTOMATIC (CLAUDE.md F7: `item_number` (auto)) ──────
 *
 * Sequential over the whole warehouse rather than per department, because a
 * code is what a joiner reads off a label on a shelf and two rows wearing one
 * number is exactly the fault T40 spent a turn on. It takes the next number
 * NOBODY IS WEARING, not `count + 1`: delete row 7 of 9 and the next row must
 * not be born as 9 again.
 */
function nextItemNumber(rows = []) {
  let top = 0;
  for (const row of rows) {
    const n = Number(String(row?.item_number ?? '').replace(/\D/g, ''));
    if (Number.isFinite(n) && n > top) top = n;
  }
  return String(top + 1).padStart(4, '0');
}

/** Bring any row — typed, imported, or out of the table — to the model. */
export function migrateMaterial(raw, { rows = [] } = {}) {
  if (!raw) return null;
  const price = numOrNull(raw.cost_per_unit ?? raw.price);
  return {
    // OURS, and not a CSV column: a row has to be identifiable while it is
    // still being typed, before it has a number or a name.
    id: str(raw.id) || `m_${Math.random().toString(36).slice(2, 10)}`,
    item_number: str(raw.item_number) || nextItemNumber(rows),
    name: str(raw.name),
    category: categoryOf(raw),
    // ─── SUBCATEGORIES ARE FLAT (CLAUDE.md F7) ────────────────────────────
    // *"a text field, one level, renameable in bulk. No tree."*  A string, and
    // the bulk rename is one pass over the list (`renameSubcategory` below).
    subcategory: str(raw.subcategory),
    size: str(raw.size),
    thickness: numOrNull(raw.thickness),
    color: str(raw.color ?? raw.colour),
    unit: str(raw.unit) || 'each',
    cost_per_unit: price,
    image_url: str(raw.image_url),
    // ─── `jc_uuid` FROM DAY ONE (CLAUDE.md F7) ────────────────────────────
    // Empty until a JoineryCore import fills it. It is the match key and it is
    // the ONLY match key: see `mergeImport`.
    jc_uuid: str(raw.jc_uuid),
    notes: str(raw.notes),
    // OURS. Not in the CSV, because a file cannot tell you whether a number in
    // it was typed by a human.
    price_source: raw.price_source === PRICE_IMPORT ? PRICE_IMPORT : PRICE_TYPED,
    // T78 F21 - OURS, and the Paints department's: kept as a record where the
    // row has one, absent everywhere else (a shelf board carries no coats).
    ...(paintOf(raw) ? { paint: paintOf(raw) } : {}),
  };
}

/** A blank row, ready to type into. */
export function newMaterial(rows = [], patch = {}) {
  return migrateMaterial({ name: '', unit: 'each', ...patch }, { rows });
}

/** Every row of one department, by name. */
export function rowsOfDepartment(rows = [], departmentId) {
  return rows.filter((r) => categoryOf(r) === departmentId)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

/** The count beside each department's name in the list (CLAUDE.md F7). */
export function departmentCounts(rows = []) {
  const counts = new Map(DEPARTMENTS.map((d) => [d.id, 0]));
  for (const row of rows) counts.set(categoryOf(row), (counts.get(categoryOf(row)) || 0) + 1);
  return DEPARTMENTS.map((d) => ({ ...d, count: counts.get(d.id) || 0 }));
}

/** Every subcategory in use, for the bulk rename and the filter chips. */
export function subcategoriesInUse(rows = []) {
  const seen = new Set();
  for (const row of rows) if (row?.subcategory) seen.add(String(row.subcategory));
  return [...seen].sort((a, b) => a.localeCompare(b));
}

/**
 * *"renameable in bulk"* — one pass, every row that wears the old name.
 * Returns the whole list, so the caller writes once.
 */
export function renameSubcategory(rows = [], from, to) {
  const was = str(from);
  const now = str(to);
  if (!was) return rows;
  return rows.map((r) => (str(r.subcategory) === was ? { ...r, subcategory: now } : r));
}

// ─── THE CSV ────────────────────────────────────────────────────────────────

const escape = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The catalogue as a CSV, in PC's own column order. */
export function toCsv(rows = []) {
  const lines = [CSV_COLUMNS.join(',')];
  for (const row of rows) {
    lines.push(CSV_COLUMNS.map((c) => escape(row?.[c] ?? '')).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

/**
 * T75 F21 · the file split into RECORDS with quotes honoured: a newline inside
 * a quoted cell (a note of two lines) is part of the cell, not the end of the
 * row. The probe measured the old split losing the second line of every such
 * note and dropping it silently.
 */
function splitCsvRecords(text) {
  const out = [];
  let rec = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { rec += '""'; i += 1; continue; }
      quoted = !quoted;
      rec += c;
      continue;
    }
    if (!quoted && (c === '\n' || c === '\r')) {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      out.push(rec);
      rec = '';
      continue;
    }
    rec += c;
  }
  if (rec !== '') out.push(rec);
  return out;
}

/** One CSV line, split with quotes honoured. */
function splitCsvLine(line) {
  const out = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cell += '"'; i += 1; continue; }
      if (c === '"') { quoted = false; continue; }
      cell += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { out.push(cell); cell = ''; continue; }
    cell += c;
  }
  out.push(cell);
  return out;
}

/**
 * A CSV back into rows — the header decides which column is which, so a file
 * whose columns are in another order still reads. A file with no recognisable
 * header is refused rather than guessed at.
 *
 * @returns {{rows:Array, error:string|null}}
 */
export function fromCsv(text) {
  const lines = splitCsvRecords(String(text || '')).filter((l) => l.trim() !== '');
  if (!lines.length) return { rows: [], error: 'That file is empty.' };
  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const known = header.filter((h) => CSV_COLUMNS.includes(h));
  if (!known.includes('name')) {
    return { rows: [], error: 'No `name` column — this does not look like a materials CSV.' };
  }
  const rows = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const raw = {};
    header.forEach((h, i) => { if (CSV_COLUMNS.includes(h)) raw[h] = cells[i]; });
    if (!str(raw.name)) continue;
    // A price that arrived in a file was NOT typed by a hand, and the record
    // has to say so or the guard below has nothing to read.
    rows.push(migrateMaterial({ ...raw, price_source: PRICE_IMPORT }, { rows }));
  }
  return { rows, error: null };
}

/**
 * ─── THE IMPORT MATCHES ON `jc_uuid` AND OVERWRITES (CLAUDE.md F7) ─────────
 *
 * *"On import from JoineryCore, match on it: **overwrite the existing row,
 * never add a second.**"*
 *
 * `jc_uuid` is the ONLY match key. Matching on name as well would be a
 * kindness that costs a warehouse its integrity the first time two suppliers
 * both sell "18mm MDF" — an incoming row with no uuid is a NEW row, and the
 * count says how many arrived that way so nobody has to guess.
 *
 * ─── AND A HAND-TYPED PRICE IS NOT SILENTLY OVERWRITTEN ───────────────────
 *
 * *"Price comes from an import or is typed; the record says WHICH, so a
 * re-import cannot silently overwrite a hand-typed figure without saying so."*
 *
 * So it is overwritten and SAID: the row is updated, its price with it, and
 * every one of them comes back in `repriced` with the old figure and the new.
 * The alternative — keeping the old price — would be an import that silently
 * did not import, which is the same fault the other way round.
 *
 * @returns {{rows:Array, added:number, updated:number,
 *            repriced:Array<{name,item_number,was,now}>}}
 */
export function mergeImport(existing = [], incoming = []) {
  const rows = [...existing];
  const byUuid = new Map();
  // T75 F21 · ONE identity, however it is printed: JoineryCore's Postgres
  // prints a uuid in lower case, a hand or a spreadsheet may not. The probe
  // measured the same uuid in upper case ADDED as a second row.
  const keyOf = (u) => String(u ?? '').trim().toLowerCase();
  rows.forEach((r, i) => { if (r.jc_uuid) byUuid.set(keyOf(r.jc_uuid), i); });

  let added = 0;
  let updated = 0;
  const repriced = [];
  // T75 F21 · a NEW row arriving with a number the warehouse already wears is
  // given the next free one, and SAID: two rows wearing one number is the
  // fault T40 spent a turn on (and the table's unique key would refuse it).
  const renumbered = [];

  for (const raw of incoming) {
    // THIS IS THE IMPORT, so this is where a price becomes an imported price.
    // Leaving it to the caller was a bug my own test found: a row handed
    // straight to `mergeImport` (a JC payload rather than a CSV) came out
    // marked `typed`, and the next import would then have reported it as a
    // hand-typed figure being overruled by a machine that had written it.
    const next = migrateMaterial({ ...raw, price_source: PRICE_IMPORT }, { rows });
    const at = next.jc_uuid ? byUuid.get(keyOf(next.jc_uuid)) : undefined;
    if (at == null) {
      if (rows.some((r) => r.item_number === next.item_number)) {
        const was = next.item_number;
        next.item_number = nextItemNumber(rows);
        renumbered.push({ name: next.name, was, now: next.item_number });
      }
      rows.push(next);
      if (next.jc_uuid) byUuid.set(keyOf(next.jc_uuid), rows.length - 1);
      added += 1;
      continue;
    }
    const was = rows[at];
    // A hand-typed figure that an import is about to change: say so.
    if (was.price_source === PRICE_TYPED
        && was.cost_per_unit != null
        && next.cost_per_unit != null
        && Math.abs(was.cost_per_unit - next.cost_per_unit) > 1e-9) {
      repriced.push({
        name: was.name,
        item_number: was.item_number,
        was: was.cost_per_unit,
        now: next.cost_per_unit,
      });
    }
    // OVERWRITE, never a second row — the id and the item number are the
    // WAREHOUSE'S and survive, because they are what a shelf label says.
    rows[at] = { ...next, id: was.id, item_number: was.item_number };
    updated += 1;
  }
  return {
    rows, added, updated, repriced, renumbered,
  };
}

/**
 * ─── T75 F21 · WHAT A PROJECT WAS PRICED AGAINST ───────────────────────────
 *
 * `project.warehouseStamp`: the stamp of the materials the project assigns,
 * and each one's price and `price_source` at that moment. A material assigned
 * since joins at today's price; one already in it keeps the price the job was
 * quoted at until the owner accepts today's (`keep` merges, never overwrites).
 */
export function priceSnapshot({
  assignments = null, materials = [], at = null, keep = null,
} = {}) {
  const ids = assignedMaterialIds(assignments);
  const prices = {};
  for (const m of materials || []) {
    if (!m || !ids.has(String(m.id))) continue;
    prices[m.id] = {
      name: str(m.name) || String(m.id),
      price: numOrNull(m.price ?? m.cost_per_unit),
      price_source: str(m.price_source) || 'stock list',
      jc_uuid: str(m.jc_uuid) || null,
    };
  }
  const merged = { ...prices, ...(keep?.prices || {}) };
  const rows = Object.entries(merged).map(([id, p]) => ({ id, jc_uuid: p.jc_uuid, price: p.price }));
  return { stamp: catalogueStamp(rows), at, prices: merged };
}

/**
 * Which quoted prices today's list no longer says: `[{ id, name, was, now }]`
 * (`now` null when the material has left the list). Empty when nothing moved,
 * or when the project was never priced.
 */
export function catalogueMoves(snapshot, { materials = [] } = {}) {
  if (!snapshot?.prices) return [];
  const byId = new Map((materials || []).filter(Boolean).map((m) => [String(m.id), m]));
  const out = [];
  for (const [id, p] of Object.entries(snapshot.prices)) {
    const m = byId.get(String(id));
    const now = m ? numOrNull(m.price ?? m.cost_per_unit) : null;
    if (m && (now ?? null) === (p.price ?? null)) continue;
    if (m && now != null && p.price != null && Math.abs(now - p.price) < 1e-9) continue;
    out.push({
      id, name: p.name, was: p.price, now,
    });
  }
  return out;
}

/**
 * ─── T75 F21 · THE CATALOGUE'S STAMP ───────────────────────────────────────
 *
 * *"The project stores the `warehouseStamp` it was priced against ...;
 * opening a project whose catalogue has moved since raises a CHECK, in words,
 * never a silent recompute."*  No row carries an `updated_at` the app reads
 * (the probe), so the stamp is a fingerprint of what prices a job: each
 * material's identity and price, sorted, hashed. Two lists that price every
 * material the same have the same stamp, whatever order they arrived in.
 */
export function catalogueStamp(materials = []) {
  const key = (m) => [str(m?.id), str(m?.jc_uuid).toLowerCase(), numOrNull(m?.price ?? m?.cost_per_unit) ?? ''].join('|');
  const text = (materials || []).filter(Boolean).map(key).sort().join('\n');
  // FNV-1a, 32 bits, in hex: a stamp to compare, not a secret to keep.
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** The sentence the panel prints after an import. */
export function importSummary({
  added = 0, updated = 0, repriced = [], renumbered = [],
} = {}) {
  const parts = [];
  parts.push(`${added} new`);
  parts.push(`${updated} matched on jc_uuid and overwritten`);
  if (repriced.length) {
    parts.push(`${repriced.length} hand-typed price${repriced.length === 1 ? '' : 's'} changed`);
  }
  // T75 F21 · a number already worn was given the next free one, and said.
  if (renumbered.length) {
    parts.push(`${renumbered.length} given a new item number (${renumbered.map((r) => `${r.was} to ${r.now}`).join(', ')})`);
  }
  return `${parts.join(' · ')}.`;
}

/** The line the UI must show about linking (CLAUDE.md F7). */
export const JC_NOTICE = 'Automatic linking to JoineryCore needs the JC list imported first — '
  + 'a row is matched on its jc_uuid, and a row that has none is a new row.';

// ─── THE TWO EXPORTS (decision 3, at the top of CLAUDE.md) ──────────────────
//
// *"The warehouse exports TWO ways — the whole catalogue, and the materials
// used by the open project. Both were asked for at once (`nazwa projektu` on a
// global catalogue), and they are two different documents: a catalogue and a
// shopping list."*

/**
 * Which of the warehouse's rows this project actually uses.
 *
 * Matched on `jc_uuid` first — an exact identity — and then on NAME, because
 * the project's own records (the design's decors and boards, the assignment
 * store's choices) name a material by its name and have never carried a uuid.
 * Case- and space-insensitive, because "18mm MDF" and "18 mm mdf" are one
 * board in every workshop in the world.
 *
 * @param {Array} rows       the warehouse
 * @param {object} context   `{ names, uuids }` — whatever the project names
 */
export function usedInProject(rows = [], { names = [], uuids = [] } = {}) {
  // SPACING IS NOT A SUPPLIER DIFFERENCE. "18mm MDF" and "18 mm mdf" are one
  // board in every workshop in the world, so the key drops whitespace
  // altogether rather than merely collapsing it. That is a forgiving key on
  // purpose: `jc_uuid` above is the identity, this is a shopping list, and a
  // line the joiner has to strike out costs him less than one he never saw.
  const key = (v) => String(v || '').toLowerCase().replace(/\s+/g, '');
  const wantNames = new Set(names.map(key).filter(Boolean));
  // T75 F21 · a uuid is one identity however it is printed.
  const wantUuids = new Set(uuids.map((u) => String(u || '').trim().toLowerCase()).filter(Boolean));
  return rows.filter((r) => (r.jc_uuid && wantUuids.has(String(r.jc_uuid).trim().toLowerCase())) || wantNames.has(key(r.name)));
}

/**
 * ─── T75 F21 · THE UUIDS A PROJECT ACTUALLY USES ──────────────────────────
 *
 * The probe measured the project export handed EVERY warehouse uuid as "used",
 * so a project naming none of three JoineryCore rows exported all three. The
 * uuids a project uses are those of the stock materials its assignments name
 * (every `material_id` in the record, however deep), read off the stock list.
 */
/** Every `material_id` a project's assignment record names, however deep. */
function assignedMaterialIds(assignments) {
  const ids = new Set();
  const walk = (v) => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (v.material_id != null) ids.add(String(v.material_id));
    Object.values(v).forEach(walk);
  };
  walk(assignments);
  return ids;
}

export function projectUuids({ assignments = null, materials = [] } = {}) {
  const ids = assignedMaterialIds(assignments);
  return (materials || [])
    .filter((m) => m && ids.has(String(m.id)) && m.jc_uuid)
    .map((m) => String(m.jc_uuid));
}

/**
 * Every material NAME a project mentions, gathered from its own records.
 *
 * Deliberately a WALK rather than a list of field paths: the design has grown a
 * material field almost every turn since T3, and a shopping list that silently
 * missed one because nobody updated a path here would be worse than no list at
 * all. Anything that is a string and matches a row in the warehouse counts.
 */
export function projectMaterialNames(...sources) {
  const out = new Set();
  const seen = new Set();
  const walk = (v) => {
    if (v == null) return;
    if (typeof v === 'string') { if (v.trim()) out.add(v.trim()); return; }
    if (typeof v !== 'object') return;
    if (seen.has(v)) return;
    seen.add(v);
    for (const k of Object.keys(v)) walk(v[k]);
  };
  for (const s of sources) walk(s);
  return [...out];
}

/**
 * The filename, exactly as CLAUDE.md writes it:
 *
 *   `Cabinet Core - {project} - {YYYY-MM-DD HH-mm} - materials.csv`
 *
 * The CATALOGUE export has no project to name — it is the whole warehouse — so
 * it says so in that slot rather than carrying somebody's kitchen in the name
 * of a global list. That is the half of decision 3 the owner's own request
 * (*"nazwa projektu"* on a global catalogue) could not have: the two documents
 * are different documents and the names say which is which.
 */
export function materialsFilename({ project = '', now = new Date(), kind = 'project' } = {}) {
  // The STAMP is `engine/naming.js`'s, not this file's — T31-F5's law, which
  // holds whatever shape a name takes: one authority on what a written file is
  // called, so two exports can never disagree about what time it is.
  const stamp = warehouseStamp(now);
  const who = kind === 'catalogue'
    ? 'Full catalogue'
    : (str(project) || 'Untitled project');
  // A filename is a filename: the characters a file system refuses come out.
  const safe = who.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
  return `Cabinet Core - ${safe} - ${stamp} - materials.csv`;
}
