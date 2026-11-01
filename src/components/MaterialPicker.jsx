import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import Modal from './Modal.jsx';
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
 *
 * T-CC2a F8.4: the Link materials window uses the SAME list for its right
 * column (*"polaczenie A i C plus B"*, the owner, 01.11.2026), with three
 * opt-in props so the Stock window and the old Assign window draw exactly as
 * they did: `photos` (a 40 px photo per row, enlarged on click, the
 * MaterialCard pattern of WarehouseModal), `categoryChips` (the tenant's
 * categories as chips from `categoryTree`, JC rule 6.5, never typed) and
 * `onLink` (a "Link" button per row; `afterRow` draws the small link form
 * under the row it was pressed on). The search carries a clear cross whenever
 * something is typed, in every window.
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

/** The node of the tree with this id, or null. */
function nodeOf(tree = [], id = null) {
  for (const n of tree) {
    if (n.id === id) return n;
    const hit = nodeOf(n.children || [], id);
    if (hit) return hit;
  }
  return null;
}

/** The top-level node a category id sits under (itself when it is one). */
function topOf(tree = [], id = null) {
  return tree.find((n) => n.id === id || nodeOf(n.children || [], id)) || null;
}

/**
 * A photo, WHOLE (`object-contain`: a picture is never cropped, the EGGER
 * licence of engine/decors.js and plain manners for a supplier's photo), or
 * the space where one would be, so every row stands the same height. Given
 * `onOpen`, it is a button and a click enlarges it.
 */
export function StockPhoto({
  url, alt = '', size = 40, onOpen = null, testId = null, fill = null,
}) {
  const body = url ? (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className="object-contain rounded border border-shell-600 bg-shell-900 block"
      style={{ width: size, height: size }}
      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
    />
  ) : (
    <span
      className="rounded border border-dashed border-shell-600 bg-shell-800/60 flex items-center justify-center text-ink-600"
      style={{ width: size, height: size, ...(fill ? { background: fill, borderStyle: 'solid' } : {}) }}
      aria-hidden={fill ? undefined : 'true'}
    >
      {fill ? '' : 'no photo'}
    </span>
  );
  if (!onOpen || (!url && !fill)) return <span className="inline-block shrink-0" data-photo={testId || undefined}>{body}</span>;
  return (
    <button
      type="button"
      className="inline-block shrink-0 rounded hover:outline hover:outline-1 hover:outline-gold"
      title="Click to enlarge"
      data-photo={testId || '1'}
      onClick={(e) => {
        e.stopPropagation?.();
        const r = e.currentTarget?.getBoundingClientRect?.();
        onOpen(r ? { x: r.left, y: r.top, width: r.width, height: r.height } : null);
      }}
    >
      {body}
    </button>
  );
}

/**
 * ONE picture, enlarged: *"a draggable card on click with the picture
 * enlarged"* (WarehouseModal's MaterialCard, turn 51). Beside the row it was
 * opened from; `caption` is the line that must stand next to the picture (an
 * EGGER decor's `decorLabel()`, a stock row's number and name).
 */
export function PhotoCard({
  url, fill = null, title, caption = '', anchor = null, onClose,
}) {
  return (
    <Modal name="material-card" title={title || 'Picture'} anchor={anchor} onClose={onClose} width="w-[460px]">
      <figure className="space-y-2" data-photo-card="1">
        {url ? (
          <img src={url} alt={caption || title || ''} className="object-contain w-full max-h-[60vh] rounded border border-shell-600 bg-shell-900" />
        ) : (
          <div className="w-full h-[240px] rounded border border-shell-600" style={{ background: fill || 'transparent' }} />
        )}
        {caption && <figcaption className="text-[13px] text-ink-100" data-photo-caption="1">{caption}</figcaption>}
      </figure>
    </Modal>
  );
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
  // T-CC2a F8.4, opt-in: the Link materials window's right column.
  photos = false,
  categoryChips = false,
  showKind = true,
  onLink = null,
  linkDisabled = false,
  linkLabel = 'Link',
  afterRow = null,
}) {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState(kindIn || 'all');
  const [category, setCategory] = useState(null);
  const [enlarged, setEnlarged] = useState(null);       // { material, anchor }
  // The caller's kind follows the selected line (board for Sheets, hardware
  // for the rest); the user can switch it, and a new line resets it.
  useEffect(() => { setKind(kindIn || 'all'); }, [kindIn]);

  const list = useMemo(
    () => filterStock(materials, { q, kind, category, tree }),
    [materials, q, kind, category, tree],
  );
  const cats = useMemo(() => flatTree(tree), [tree]);
  const top = categoryChips ? topOf(tree, category) : null;
  const linkMode = Boolean(onLink);
  const cols = linkMode ? 6 : 7;

  return (
    <div className="flex flex-col min-h-0 gap-2" data-material-list={testId || '1'}>
      <div className="flex items-center gap-2">
        <span className="relative flex-1 flex items-center">
          <input
            autoFocus={autoFocus}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, number, colour or size"
            className="cc-input flex-1 pr-7"
            data-material-search="1"
          />
          {q !== '' && (
            <button
              type="button"
              className="absolute right-1 px-1.5 text-ink-400 hover:text-gold"
              aria-label="Clear the search"
              title="Clear the search"
              data-material-search-clear="1"
              onClick={() => setQ('')}
            >
              ✕
            </button>
          )}
        </span>
        {showKind && (
          <select
            className="cc-input w-[130px]"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            data-material-kind={kind}
            aria-label="Kind"
          >
            {KIND_OPTIONS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        )}
        {!categoryChips && cats.length > 0 && (
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
      {/* T-CC2a F8.4: the tenant's own categories as chips (JC rule 6.5), the top level first and, under a
          chosen one, its subcategories. */}
      {categoryChips && tree.length > 0 && (
        <div className="flex flex-col gap-1" data-material-category-chips="1">
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              className={`cc-btn px-2 py-0.5 ${category == null ? 'border-gold text-gold' : ''}`}
              data-material-category-chip=""
              aria-pressed={category == null}
              onClick={() => setCategory(null)}
            >
              All categories
            </button>
            {tree.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`cc-btn px-2 py-0.5 ${top?.id === n.id ? 'border-gold text-gold' : ''}`}
                data-material-category-chip={String(n.id)}
                aria-pressed={top?.id === n.id}
                onClick={() => setCategory(n.id)}
              >
                {n.name}
              </button>
            ))}
          </div>
          {top && (top.children || []).length > 0 && (
            <div className="flex flex-wrap gap-1 pl-3" data-material-subcategory-chips={String(top.id)}>
              {top.children.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`cc-btn px-2 py-0.5 ${category === c.id ? 'border-gold text-gold' : ''}`}
                  data-material-category-chip={String(c.id)}
                  aria-pressed={category === c.id}
                  onClick={() => setCategory(category === c.id ? top.id : c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
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
              if (linkMode) {
                const extra = afterRow ? afterRow(m) : null;
                return (
                  <Fragment key={m.id}>
                    <tr
                      aria-selected={chosen}
                      data-material-option={m.id}
                      className={`border-b border-shell-600/60 ${chosen ? 'bg-gold/10' : ''}`}
                    >
                      <td className="w-[52px]">
                        <StockPhoto
                          url={m.image_url}
                          alt={m.name}
                          testId={`stock:${m.id}`}
                          onOpen={(anchor) => setEnlarged({ material: m, anchor })}
                        />
                      </td>
                      <td className="text-ink-400 tabular-nums whitespace-nowrap">{m.item_number || ''}</td>
                      <td className="text-ink-100">{m.name}</td>
                      <td className="text-ink-400">{m.unit || ''}</td>
                      <td className="text-right tabular-nums">{price != null ? `£${price.toFixed(2)}` : ''}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="cc-btn px-2 py-0.5"
                          disabled={linkDisabled}
                          data-material-link={m.id}
                          onClick={(e) => {
                            const r = e.currentTarget?.getBoundingClientRect?.();
                            onLink(m, r ? { x: r.left, y: r.top, width: r.width, height: r.height } : null);
                          }}
                        >
                          {linkLabel}
                        </button>
                      </td>
                    </tr>
                    {extra && (
                      <tr data-material-after={m.id}>
                        <td colSpan={cols}>{extra}</td>
                      </tr>
                    )}
                  </Fragment>
                );
              }
              return (
                <tr
                  key={m.id}
                  aria-selected={chosen}
                  onClick={onSelect ? () => onSelect(m) : undefined}
                  data-material-option={m.id}
                  className={`border-b border-shell-600/60 ${onSelect ? 'cursor-pointer hover:bg-shell-700' : ''} ${chosen ? 'bg-gold/10' : ''}`}
                >
                  {photos && (
                    <td className="w-[52px]">
                      <StockPhoto url={m.image_url} alt={m.name} testId={`stock:${m.id}`} onOpen={(anchor) => setEnlarged({ material: m, anchor })} />
                    </td>
                  )}
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
      {enlarged && (
        <PhotoCard
          url={enlarged.material.image_url}
          title={enlarged.material.name}
          caption={[enlarged.material.item_number, enlarged.material.name].filter(Boolean).join(', ')}
          anchor={enlarged.anchor}
          onClose={() => setEnlarged(null)}
        />
      )}
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
