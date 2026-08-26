import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from './Modal.jsx';
import NumberField from './NumberField.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useWarehouseStore } from '../stores/warehouseStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { OFFLINE_NOTICE } from '../lib/warehouseDb.js';
import {
  CATEGORIES, JC_NOTICE, OTHERS, PRICE_IMPORT,
  departmentCounts, departmentLabel, fromCsv, importSummary, materialsFilename,
  projectMaterialNames, rowsOfDepartment, subcategoriesInUse, toCsv, usedInProject,
} from '../engine/warehouse.js';

// ─── THE MATERIALS WAREHOUSE (turn 51, CLAUDE.md F7) ────────────────────────
//
// As mocked up and agreed with the owner on 25.08.2026. `Database ▸ Materials`
// opens this, not the design modal — which is what it opened before tonight,
// and which is why he could not find a warehouse: there wasn't one.
//
// His own description of the screen, and it is the layout:
//
//   *"List with departments down the left and counts, a photo per row, code
//   under the name, and a draggable card on click with the picture enlarged."*
//
// The CARD is a second window rather than a panel inside this one, for rule
// 15's reason: it is about ONE material, so it opens beside the row it is
// about and can be pushed aside. It is `Modal`'s own shell, so it is draggable
// without this file knowing how to drag anything.
//
// ─── WHAT IS PURE AND WHAT IS HERE ──────────────────────────────────────────
//
// The MODEL, the departments, the counts, the CSV both ways, the `jc_uuid`
// merge and the two filenames are all `engine/warehouse.js`. The TABLE is
// `lib/warehouseDb.js` and it never throws. This file is the screen.

/** A photo, or the space where one would be — so every row is the same height. */
function Thumb({ url, alt, size = 40 }) {
  if (url) {
    return (
      <img
        src={url}
        alt={alt || ''}
        className="object-cover rounded border border-shell-600 bg-shell-800 shrink-0"
        style={{ width: size, height: size }}
        // A dead URL must not leave a broken-image glyph in a list of stock.
        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
      />
    );
  }
  return (
    <div
      className="rounded border border-dashed border-shell-600 bg-shell-800/60 shrink-0 flex items-center justify-center text-ink-500 text-[9px]"
      style={{ width: size, height: size }}
    >
      no photo
    </div>
  );
}

/**
 * ONE MATERIAL, as a card — *"a draggable card on click with the picture
 * enlarged."*
 *
 * Every field of the model is editable here, because this is the only screen
 * that shows all twelve: the list shows a name, a code and a price, which is
 * what a joiner reads down a shelf.
 */
function MaterialCard({ material, onClose, anchor, onPatch, onRemove, subcategories }) {
  const set = (field) => (v) => onPatch(material.id, { [field]: v });
  const text = (field) => (e) => onPatch(material.id, { [field]: e.target.value });
  return (
    <Modal
      name="material-card"
      title={material.name || 'New material'}
      anchor={anchor}
      onClose={onClose}
      width="w-[520px]"
      footer={(
        <>
          <button type="button" className="cc-btn text-status-danger" data-material-remove onClick={() => { onRemove(material.id); onClose(); }}>
            Remove
          </button>
          <button type="button" className="cc-btn-gold" onClick={onClose}>Done</button>
        </>
      )}
    >
      <div className="space-y-3" data-material-card={material.id}>
        <div className="flex gap-3">
          {/* THE PICTURE ENLARGED — his own words, and the reason the card
              exists rather than a wider row. */}
          <Thumb url={material.image_url} alt={material.name} size={140} />
          <div className="flex-1 space-y-2 min-w-0">
            <label className="block">
              <span className="cc-label">Name</span>
              <input className="cc-input w-full" data-material-name value={material.name} onChange={text('name')} />
            </label>
            <div className="flex items-center gap-2 text-[11px] text-ink-400">
              <span className="font-mono text-ink-300" data-material-code>{material.item_number}</span>
              <span>·</span>
              <span>{departmentLabel(material.category)}</span>
            </div>
            <label className="block">
              <span className="cc-label">Photo URL</span>
              <input className="cc-input w-full" data-material-image value={material.image_url} onChange={text('image_url')} />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="cc-label">Category</span>
            <select
              className="cc-input w-full"
              data-material-category
              value={CATEGORIES.some((c) => c.id === material.category) ? material.category : OTHERS.id}
              onChange={text('category')}
            >
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              <option value={OTHERS.id}>{OTHERS.label}</option>
            </select>
          </label>
          <label className="block">
            {/* FLAT — a text field, one level, no tree (CLAUDE.md F7). The
                datalist offers what is already in use without forbidding a
                new one, which is the whole difference between a suggestion
                and a taxonomy. */}
            <span className="cc-label">Subcategory</span>
            <input
              className="cc-input w-full"
              data-material-subcategory
              list="cc-subcategories"
              value={material.subcategory}
              onChange={text('subcategory')}
            />
            <datalist id="cc-subcategories">
              {subcategories.map((s) => <option key={s} value={s} />)}
            </datalist>
          </label>
          <label className="block">
            <span className="cc-label">Size</span>
            <input className="cc-input w-full" data-material-size value={material.size} onChange={text('size')} />
          </label>
          <label className="block">
            <span className="cc-label">Thickness (mm)</span>
            <NumberField
              className="cc-input w-full"
              data-material-thickness
              value={material.thickness ?? ''}
              onCommit={set('thickness')}
            />
          </label>
          <label className="block">
            <span className="cc-label">Colour</span>
            <input className="cc-input w-full" data-material-color value={material.color} onChange={text('color')} />
          </label>
          <label className="block">
            <span className="cc-label">Unit</span>
            <input className="cc-input w-full" data-material-unit value={material.unit} onChange={text('unit')} />
          </label>
          <label className="block">
            <span className="cc-label">Cost per unit</span>
            <NumberField
              className="cc-input w-full"
              data-material-price
              value={material.cost_per_unit ?? ''}
              onCommit={set('cost_per_unit')}
            />
            {/* WHERE THE PRICE CAME FROM. *"the record says WHICH, so a
                re-import cannot silently overwrite a hand-typed figure without
                saying so."*  It is on the screen and not only in the row. */}
            <span className="block text-[10px] text-ink-500 mt-0.5" data-material-price-source>
              {material.price_source === PRICE_IMPORT ? 'from an import' : 'typed by hand'}
            </span>
          </label>
          <label className="block">
            <span className="cc-label">JoineryCore uuid</span>
            <input className="cc-input w-full font-mono text-[11px]" data-material-jc value={material.jc_uuid} onChange={text('jc_uuid')} />
          </label>
        </div>

        <label className="block">
          <span className="cc-label">Notes</span>
          <textarea className="cc-input w-full h-16" data-material-notes value={material.notes} onChange={text('notes')} />
        </label>
      </div>
    </Modal>
  );
}

export default function WarehouseModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const anchor = useUiStore((s) => s.modalArgs?.anchor) || null;
  const notify = useUiStore((s) => s.notify);

  const rows = useWarehouseStore((s) => s.rows);
  const source = useWarehouseStore((s) => s.source);
  const load = useWarehouseStore((s) => s.load);
  const addMaterial = useWarehouseStore((s) => s.addMaterial);
  const updateMaterial = useWarehouseStore((s) => s.updateMaterial);
  const removeMaterial = useWarehouseStore((s) => s.removeMaterial);
  const renameSub = useWarehouseStore((s) => s.renameSubcategory);
  const importRows = useWarehouseStore((s) => s.importRows);
  const lastImport = useWarehouseStore((s) => s.lastImport);
  const clearImportReport = useWarehouseStore((s) => s.clearImportReport);

  const project = useProjectStore((s) => s.project);
  const assignments = useMaterialAssignmentStore((s) => s.data);

  const [department, setDepartment] = useState(CATEGORIES[0].id);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [cardAnchor, setCardAnchor] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const fileRef = useRef(null);

  // The table, once, on the way in. It never throws and it never blocks: the
  // shelf is already on screen while this is in flight.
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => departmentCounts(rows), [rows]);
  const subcategories = useMemo(() => subcategoriesInUse(rows), [rows]);
  const shown = useMemo(() => {
    const list = rowsOfDepartment(rows, department);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => [r.name, r.item_number, r.subcategory, r.color, r.size]
      .some((v) => String(v || '').toLowerCase().includes(q)));
  }, [rows, department, query]);
  const open = rows.find((r) => r.id === openId) || null;

  /** A file, named and handed to the browser. */
  const download = (text, filename) => {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ─── DECISION 3: TWO EXPORTS, AND THEY ARE TWO DOCUMENTS ────────────────
  //
  // *"The warehouse exports TWO ways — the whole catalogue, and the materials
  // used by the open project … they are two different documents: a catalogue
  // and a shopping list."*
  const exportCatalogue = () => {
    download(toCsv(rows), materialsFilename({ kind: 'catalogue' }));
    notify(`Catalogue exported — ${rows.length} material${rows.length === 1 ? '' : 's'}.`, 'info');
  };

  const projectRows = useMemo(() => usedInProject(rows, {
    names: projectMaterialNames(project?.design, assignments),
    uuids: rows.map((r) => r.jc_uuid).filter(Boolean),
  }), [rows, project, assignments]);

  const exportProject = () => {
    if (!projectRows.length) {
      notify('This project names no material that is in the warehouse yet.', 'warn');
      return;
    }
    download(toCsv(projectRows), materialsFilename({ project: project?.name, kind: 'project' }));
    notify(`Shopping list exported — ${projectRows.length} material${projectRows.length === 1 ? '' : 's'} this project uses.`, 'info');
  };

  const onImport = async (file) => {
    if (!file) return;
    const { rows: incoming, error } = fromCsv(await file.text());
    if (error) { notify(error, 'warn'); return; }
    const result = importRows(incoming);
    notify(importSummary(result), result.repriced.length ? 'warn' : 'info');
  };

  return (
    <>
      <Modal
        name="warehouse"
        title="Materials warehouse"
        anchor={anchor}
        onClose={closeModal}
        width="w-[900px]"
        footer={(
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(e) => onImport(e.target.files?.[0])}
            />
            <button type="button" className="cc-btn" data-warehouse-import onClick={() => fileRef.current?.click()}>
              Import CSV…
            </button>
            <span className="flex-1" />
            <button type="button" className="cc-btn" data-warehouse-export-project onClick={exportProject}>
              Export this project ({projectRows.length})
            </button>
            <button type="button" className="cc-btn-gold" data-warehouse-export-all onClick={exportCatalogue}>
              Export catalogue ({rows.length})
            </button>
          </>
        )}
      >
        <div className="grid grid-cols-[190px_1fr] gap-3" data-warehouse="1">
          {/* ─── THE DEPARTMENTS, DOWN THE LEFT, WITH COUNTS ──────────────
              The owner's own layout. `Others` is a real department with a real
              count: a row nobody has filed is a row somebody has to file, and
              it has to be findable to be filed. */}
          <div className="space-y-1" data-warehouse-departments="1">
            <span className="text-[11px] uppercase tracking-wide text-ink-400">Departments</span>
            <ul className="space-y-0.5">
              {counts.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    data-warehouse-department={d.id}
                    aria-pressed={department === d.id}
                    className={`w-full text-left px-2 py-1.5 rounded border text-[12px] flex items-center gap-2 ${
                      department === d.id
                        ? 'border-gold text-ink-50 bg-shell-700'
                        : 'border-transparent text-ink-300 hover:bg-shell-700'}`}
                    onClick={() => setDepartment(d.id)}
                  >
                    <span className="flex-1 truncate">{d.label}</span>
                    <span className="text-[11px] text-ink-500 tabular-nums" data-warehouse-count={d.id}>{d.count}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="cc-divider" />

            {/* FLAT subcategories, renameable IN BULK (CLAUDE.md F7). */}
            <span className="text-[11px] uppercase tracking-wide text-ink-400">Subcategories</span>
            {subcategories.length === 0 && (
              <p className="text-[11px] text-ink-500">None yet — it is a free text field on each card.</p>
            )}
            <ul className="space-y-0.5" data-warehouse-subcategories="1">
              {subcategories.map((s) => (
                <li key={s} className="flex items-center gap-1">
                  {renaming?.from === s ? (
                    <>
                      <input
                        className="cc-input flex-1 text-[11px]"
                        data-subcategory-rename={s}
                        autoFocus
                        value={renaming.to}
                        onChange={(e) => setRenaming({ from: s, to: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { renameSub(s, renaming.to); setRenaming(null); }
                          if (e.key === 'Escape') setRenaming(null);
                        }}
                      />
                      <button type="button" className="cc-btn-ghost px-1" onClick={() => { renameSub(s, renaming.to); setRenaming(null); }}>✓</button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="cc-btn-ghost flex-1 text-left text-[11px] truncate"
                      title="Rename this subcategory on every material that wears it"
                      data-subcategory={s}
                      onClick={() => setRenaming({ from: s, to: s })}
                    >
                      {s}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* ─── THE LIST ─────────────────────────────────────────────────── */}
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wide text-ink-400">
                {departmentLabel(department)}
              </span>
              <input
                className="cc-input flex-1 text-[12px]"
                data-warehouse-search
                placeholder="Search this department — name, code, colour, size"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                type="button"
                className="cc-btn-gold"
                data-warehouse-add
                onClick={() => {
                  const born = addMaterial({ category: department });
                  setOpenId(born.id);
                  setCardAnchor(null);
                }}
              >
                + Material
              </button>
            </div>

            {source !== 'db' && (
              <p
                className="text-[11px] px-2 py-1 rounded border border-status-warn/50 bg-status-warn/10 text-status-warn"
                data-warehouse-offline="1"
              >
                {OFFLINE_NOTICE}
              </p>
            )}

            {lastImport && (
              <p
                className="text-[11px] px-2 py-1 rounded border border-gold/40 bg-gold/5 text-ink-200 flex items-start gap-2"
                data-warehouse-import-report="1"
              >
                <span className="flex-1">
                  {importSummary(lastImport)}
                  {lastImport.repriced.length > 0 && (
                    <span className="block text-status-warn mt-0.5">
                      {lastImport.repriced.map((r) => `${r.item_number} ${r.name}: ${r.was} → ${r.now}`).join(' · ')}
                    </span>
                  )}
                </span>
                <button type="button" className="cc-btn-ghost px-1" onClick={clearImportReport}>×</button>
              </p>
            )}

            <ul className="space-y-1 max-h-[420px] overflow-y-auto pr-1" data-warehouse-list="1">
              {shown.length === 0 && (
                <li className="text-[12px] text-ink-500 px-1 py-3">
                  Nothing in {departmentLabel(department)} yet — press + Material.
                </li>
              )}
              {shown.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    data-warehouse-row={r.id}
                    className="w-full flex items-center gap-3 p-2 rounded border border-shell-600 hover:border-gold hover:bg-shell-700 text-left"
                    onClick={(e) => {
                      const box = e.currentTarget.getBoundingClientRect();
                      setCardAnchor({
                        x: box.left, y: box.top, width: box.width, height: box.height,
                      });
                      setOpenId(r.id);
                    }}
                  >
                    {/* A PHOTO PER ROW. */}
                    <Thumb url={r.image_url} alt={r.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] text-ink-50 truncate">{r.name || '(unnamed)'}</span>
                      {/* THE CODE UNDER THE NAME — his own words. */}
                      <span className="block text-[11px] text-ink-500 font-mono">
                        {r.item_number}
                        {r.subcategory ? ` · ${r.subcategory}` : ''}
                        {r.size ? ` · ${r.size}` : ''}
                        {r.thickness ? ` · ${r.thickness} mm` : ''}
                      </span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block text-[12px] text-ink-100 tabular-nums">
                        {r.cost_per_unit == null ? '—' : r.cost_per_unit}
                      </span>
                      <span className="block text-[10px] text-ink-500">
                        {r.unit}{r.price_source === PRICE_IMPORT ? ' · imported' : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {/* THE LINE CLAUDE.md ASKS FOR, IN AS MANY WORDS. */}
            <p className="text-[10px] text-ink-500 leading-snug" data-warehouse-jc-note="1">
              {JC_NOTICE}
            </p>
          </div>
        </div>
      </Modal>

      {open && (
        <MaterialCard
          material={open}
          anchor={cardAnchor}
          subcategories={subcategories}
          onPatch={updateMaterial}
          onRemove={removeMaterial}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}
