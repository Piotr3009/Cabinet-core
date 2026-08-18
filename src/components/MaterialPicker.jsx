import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { LAYER_CLASS } from '../lib/modalLayer.js';

/**
 * ─── THE MATERIAL PICKER (turn 39, CLAUDE.md F3) ────────────────────────────
 *
 * Production Core's `src/components/MaterialPicker.jsx`, in Cabinet Core's own
 * vocabulary. Its shape is copied deliberately, down to the portal, because the
 * problem it solves is exactly the one this modal has: a list this long, opened
 * from a row inside a scrolling table inside a draggable window, is clipped by
 * the first `overflow` container above it unless it renders somewhere else.
 *
 * So the open panel goes through a PORTAL into `document.body`, positions
 * itself to the trigger, flips upwards when there is more room above than
 * below, tracks scroll and resize, and clamps to the viewport edges.
 *
 * Pure UI. It emits the chosen material through `onSelect(material)` and reads
 * no store, no engine and no assignment of its own.
 */
export default function MaterialPicker({
  materials = [],
  value = null,
  onSelect,
  disabled = false,
  materialType = null,
  placeholder = '— no material —',
  className = '',
  allowClear = true,
  testId = null,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  // `null` = the part's own material type, which is what a joiner wants nine
  // times in ten; 'all' is the escape hatch for a workshop that files its LED
  // channel under hardware.
  const [scope, setScope] = useState('type');
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const [pos, setPos] = useState({
    top: 0, bottom: null, left: 0, width: 460, maxH: 420,
  });

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.max(Math.min(460, vw - 24), Math.min(r.width, vw - 24));
    let left = r.left;
    if (left + width > vw - 12) left = Math.max(12, vw - 12 - width);
    const below = vh - r.bottom - 12;
    const above = r.top - 12;
    const want = Math.min(vh * 0.6, 520);
    const up = below < 260 && above > below;
    const maxH = Math.max(200, Math.min(want, up ? above : below));
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

  useEffect(() => { if (!open) setQ(''); }, [open]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    // The part's own material type first: a shelf offers boards, a hinge offers
    // hardware. `cc_materials.category` is that vocabulary already.
    const scoped = scope === 'all' || !materialType
      ? materials
      : materials.filter((m) => String(m.category || '').toLowerCase() === materialType);
    if (!needle) return scoped;
    return scoped.filter((m) => `${m.code || ''} ${m.name || ''} ${m.id}`.toLowerCase().includes(needle));
  }, [materials, materialType, scope, q]);

  const selected = value ? materials.find((m) => m.id === value) || null : null;
  const label = selected
    ? `${selected.name}${selected.thickness ? ` · ${selected.thickness} mm` : ''}`
    : placeholder;

  const priceOf = (m) => {
    const v = m?.cost_per_unit ?? m?.price;
    return Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null;
  };

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
      className={`${LAYER_CLASS.menu} cc-panel shadow-panel flex flex-col overflow-hidden`}
    >
      <div className="p-2 border-b border-shell-600 shrink-0 flex items-center gap-1.5">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the stock list…"
          className="cc-input flex-1 text-xs"
          data-material-search="1"
        />
        {materialType && (
          <button
            type="button"
            className={scope === 'all' ? 'cc-btn px-2 text-[11px] border-gold text-gold' : 'cc-btn px-2 text-[11px]'}
            onClick={() => setScope((s) => (s === 'all' ? 'type' : 'all'))}
            title={`Show every material, not only ${materialType}`}
            data-material-scope={scope}
          >
            All
          </button>
        )}
      </div>
      <div className="cc-scroll min-h-0 flex-1">
        {allowClear && value && (
          <button
            type="button"
            onClick={() => { onSelect?.(null); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-xs text-ink-400 border-b border-shell-600/60 hover:bg-shell-700 hover:text-status-danger"
            data-material-clear="1"
          >
            — Clear this assignment —
          </button>
        )}
        {list.length === 0 && (
          <div className="px-3 py-4 text-[11px] text-ink-400">
            {materials.length === 0
              ? 'The stock list is empty — add materials in Database ▸ Materials.'
              : `No ${scope === 'all' ? '' : `${materialType} `}material matches.`}
          </div>
        )}
        {list.map((m) => {
          const price = priceOf(m);
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={m.id === value}
              onClick={() => { onSelect?.(m); setOpen(false); }}
              data-material-option={m.id}
              className={`w-full text-left px-3 py-2 border-b border-shell-600/60 hover:bg-shell-700 transition-colors ${m.id === value ? 'bg-gold/10' : ''}`}
            >
              <div className="text-[12px] text-ink-100 truncate">
                {m.name}
                {m.placeholder && <span className="cc-tag ml-1.5">generic</span>}
                {m.jc_uuid && <span className="cc-tag ml-1.5">JC</span>}
              </div>
              <div className="text-[10px] text-ink-400 flex items-center gap-2 tabular-nums">
                {m.category && <span className="uppercase tracking-wide">{m.category}</span>}
                {m.thickness ? <span>{m.thickness} mm</span> : null}
                {price != null && <span>£{price.toFixed(2)}{m.unit ? `/${m.unit}` : ''}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        {...(testId ? { 'data-material-picker': testId } : {})}
        className={`cc-input text-left flex items-center justify-between gap-2 disabled:opacity-50 ${selected ? 'text-ink-50' : 'text-ink-400'}`}
      >
        <span className="truncate text-xs">{label}</span>
        <span className="text-ink-400 text-[10px] shrink-0">▾</span>
      </button>
      {panel}
    </div>
  );
}
