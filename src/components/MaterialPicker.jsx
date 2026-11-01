import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { LAYER_CLASS } from '../lib/modalLayer.js';
import { filterStock } from '../lib/jcStock.js';
import { materialBadge } from '../stores/materialAssignmentStore.js';

/**
 * ─── THE MATERIAL PICKER (turn 39, CLAUDE.md F3; T-CC1b F10.4) ──────────────
 *
 * T-CC1b F10.4: the picker is THE STOCK LIST, embedded and visible at once,
 * never a dropdown only. The owner, 01.11.2026: *"modal duzo wiekszy i
 * czytelny, polaczony na stale"*. One component, used by the Assign window
 * (its right column, a click assigns the row to the selected line) and by the
 * Stock window (read-only, no `onSelect`). A search that narrows by name,
 * number, colour and size; a kind filter (switchable, preselected by the
 * caller to the line's kind); the tenant's categories as a tree filter (JC
 * rule 6.3: an embedded list plus a search, never search-only).
 *
 * `MaterialPickerMenu` keeps turn 39's portal popover for the one compact
 * place left (a cabinet family's exception under a Sheets line): the same
 * list, opened beside its trigger, clamped to the viewport.
 *
 * Pure UI. It emits the chosen material through `onSelect(material)` and reads
 * no store and no assignment of its own.
 */

const KIND_OPTIONS = [
  { id: 'all', label: 'All kinds' },
  { id: 'board', label: 'Boards' },
  { id: 'front', label: 'Fronts' },
  { id: 'edging', label: 'Edging' },
  { id: 'hardware', label: 'Hardware' },
  { id: 'paint', label: 'Paint' },
  { id: 'other', label: 'Other' },
];

const priceOf = (m) => {
  const v = m?.cost_per_unit ?? m?.price;
  return Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null;
};

/** The tree as indented options for the category filter. */
function flatTree(tree = [], depth = 0, out = []) {
  for (const n of tree) {
    out.push({ id: n.id, name: n.name, depth });
    flatTree(n.children || [], depth + 1, out);
  }
  return out;
}

export default function MaterialPicker({
  materials = [],
  value = null,
  onSelect = null,
  kind: kindIn = 'all',
  tree = [],
  testId = null,
  emptyText = 'No material in this list.',
  maxHeight = '56vh',
  autoFocus = false,
  onClear = null,
}) {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState(kindIn || 'all');
  const [category, setCategory] = useState(null);
  // The caller's kind follows the selected line (board for Sheets, hardware
  // for the rest); the user can switch it, and a new line resets it.
  useEffect(() => { setKind(kindIn || 'all'); }, [kindIn]);

  const list = useMemo(
    () => filterStock(materials, { q, kind, category, tree }),
    [materials, q, kind, category, tree],
  );
  const cats = useMemo(() => flatTree(tree), [tree]);

  return (
    <div className="flex flex-col min-h-0 gap-2" data-material-list={testId || '1'}>
      <div className="flex items-center gap-2">
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, number, colour or size"
          className="cc-input flex-1"
          data-material-search="1"
        />
        <select
          className="cc-input w-[130px]"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          data-material-kind={kind}
          aria-label="Kind"
        >
          {KIND_OPTIONS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
        {cats.length > 0 && (
          <select
            className="cc-input w-[170px]"
            value={category ?? ''}
            onChange={(e) => setCategory(e.target.value === '' ? null : cats.find((c) => String(c.id) === e.target.value)?.id ?? null)}
            data-material-category={category ?? ''}
            aria-label="Category"
          >
            <option value="">All categories</option>
            {cats.map((c) => (
              <option key={c.id} value={String(c.id)}>{`${'. '.repeat(c.depth)}${c.name}`}</option>
            ))}
          </select>
        )}
      </div>
      <div className="cc-scroll min-h-0 border border-shell-600 rounded" style={{ maxHeight }}>
        {onClear && value && (
          <button
            type="button"
            onClick={() => onClear()}
            className="w-full text-left px-3 py-2 text-ink-400 border-b border-shell-600/60 hover:bg-shell-700 hover:text-status-danger"
            data-material-clear="1"
          >
            Clear this assignment
          </button>
        )}
        {list.length === 0 && (
          <div className="px-3 py-4 text-ink-400" data-material-empty="1">
            {materials.length === 0 ? emptyText : 'No material matches.'}
          </div>
        )}
        <table className="w-full" data-material-rows={String(list.length)}>
          <tbody>
            {list.map((m) => {
              const price = priceOf(m);
              const badge = materialBadge(m);
              const chosen = m.id === value;
              return (
                <tr
                  key={m.id}
                  aria-selected={chosen}
                  onClick={onSelect ? () => onSelect(m) : undefined}
                  data-material-option={m.id}
                  className={`border-b border-shell-600/60 ${onSelect ? 'cursor-pointer hover:bg-shell-700' : ''} ${chosen ? 'bg-gold/10' : ''}`}
                >
                  <td className="text-ink-100">
                    {m.name}
                    {m.placeholder && <span className="cc-tag ml-1.5">generic</span>}
                    {badge && <span className="cc-tag ml-1.5" data-material-badge={badge}>{badge}</span>}
                  </td>
                  <td className="text-ink-400 tabular-nums">{m.item_number || m.code || ''}</td>
                  <td className="text-ink-400">{[m.group, m.subgroup].filter(Boolean).join(', ') || m.category || ''}</td>
                  <td className="text-ink-400 tabular-nums">{m.thickness ? `${m.thickness} mm` : ''}</td>
                  <td className="text-ink-400">{m.unit || ''}</td>
                  <td className="text-right tabular-nums">{price != null ? `£${price.toFixed(2)}` : ''}</td>
                  <td className="text-right tabular-nums text-ink-400">{Number.isFinite(m.stock) ? m.stock : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * The compact form: a trigger that opens the SAME list in a portal popover
 * beside it (turn 39's placement: flips up when there is more room above,
 * tracks scroll and resize, clamps to the viewport edges).
 */
export function MaterialPickerMenu({
  materials = [], value = null, onSelect, kind = 'all', tree = [],
  placeholder = 'inherit', testId = null, className = '',
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const [pos, setPos] = useState({
    top: 0, bottom: null, left: 0, width: 620, maxH: 420,
  });

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(620, vw - 24);
    let left = r.left;
    if (left + width > vw - 12) left = Math.max(12, vw - 12 - width);
    const below = vh - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 260 && above > below;
    const maxH = Math.max(200, Math.min(Math.min(vh * 0.6, 520), up ? above : below));
    setPos(up
      ? { top: null, bottom: vh - r.top + 6, left, width, maxH }
      : { top: r.bottom + 6, bottom: null, left, width, maxH });
  };

  useLayoutEffect(() => { if (open) place(); }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    const onMove = () => place();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open]);

  const selected = value ? materials.find((m) => m.id === value) || null : null;

  const panel = open ? createPortal(
    <div
      ref={panelRef}
      data-material-picker-panel="1"
      style={{
        position: 'fixed',
        left: pos.left,
        width: pos.width,
        maxHeight: pos.maxH,
        ...(pos.bottom != null ? { bottom: pos.bottom } : { top: pos.top }),
      }}
      className={`${LAYER_CLASS.menu} cc-panel cc-modal-wide shadow-panel flex flex-col overflow-hidden p-2`}
    >
      <MaterialPicker
        materials={materials}
        value={value}
        kind={kind}
        tree={tree}
        autoFocus
        maxHeight={`${Math.max(120, pos.maxH - 70)}px`}
        onSelect={(m) => { onSelect?.(m); setOpen(false); }}
        onClear={() => { onSelect?.(null); setOpen(false); }}
      />
    </div>,
    document.body,
  ) : null;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        {...(testId ? { 'data-material-picker': testId } : {})}
        className={`cc-input text-left flex items-center justify-between gap-2 ${selected ? 'text-ink-50' : 'text-ink-400'}`}
      >
        <span className="truncate">{selected ? selected.name : placeholder}</span>
        <span className="text-ink-400 shrink-0" aria-hidden="true">v</span>
      </button>
      {panel}
    </div>
  );
}
