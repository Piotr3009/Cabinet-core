import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { layoutPanels, sheetPolygon, sheetRect, toSheet } from '../engine/cnc/layout.js';
import { CNC_LAYERS, layerScreenColor } from '../engine/cnc/layers.js';
import {
  EXPORT_PRESETS, PART_GROUPS, exportablePanels, groupOfPanel,
  panelIdsForPreset, presetOfSelection,
} from '../engine/cnc/groups.js';
import { exportSheetDxf, exportUnitDxfZip } from '../lib/cncExport.js';

// ─── CNC view ───
// The workshop's visual check before the machine — the job AutoCAD used to do.
// Every cut part of the SELECTED unit, laid out flat, drawn from the engine's
// own CNC geometry with one colour per layer. Read only: nothing here writes to
// the project, and nothing re-derives a dimension (CLAUDE.md task 1).
//
// Readability beats beauty. Dark background and bright layer colours because
// that is what VCarve and AutoCAD look like on Piotr's screen; strokes are
// non-scaling so a 3 mm screw hole is still visible when the whole sheet fits.

const PADDING_MM = 120;
const LABEL_PX = 12;
const MIN_HOLE_PX = 1.7;   // a sub-pixel hole would simply vanish
const ZOOM_STEP = 1.25;
const MIN_VIEW_MM = 40;    // hard zoom-in limit: 40 mm across the viewport
const MAX_VIEW_MM = 60000; // hard zoom-out limit

export default function CncView() {
  const selectedUnitId = useUiStore((s) => s.selectedUnitId);
  const selectUnit = useUiStore((s) => s.selectUnit);
  const notify = useUiStore((s) => s.notify);
  // The parameter panel and the BOM own the right-hand edge; the export panel
  // stands next to whichever of them is open rather than underneath it.
  const rightPanelOpen = useUiStore((s) => s.rightPanelOpen);
  const bomOpen = useUiStore((s) => s.bomOpen);
  const units = useProjectStore((s) => s.units);
  const unitResult = useProjectStore((s) => s.unitResult);
  const profile = useCabinetProfileStore((s) => s.profile);

  // The sheet follows the selection, but nothing selected falls back to the
  // first unit rather than showing an empty canvas — selection is view state
  // and does not survive a reload, and "switch to CNC, see nothing" is a
  // worse answer than "see the first unit and pick another from the toolbar".
  const unit = units.find((u) => u.id === selectedUnitId) || units[0] || null;
  const result = unit ? unitResult(unit.id) : null;

  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const [size, setSize] = useState({ w: 1, h: 1 });
  const [box, setBox] = useState(null);                 // viewport in sheet mm: { x, y, w }
  const [hidden, setHidden] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState({ unitId: null, known: '', ids: new Set() });
  const [listOpen, setListOpen] = useState(true);

  // ── which parts go on the sheet ───────────────────────────────────────────
  // Everything the machine could cut, in cut-list order. The list, the picture
  // and the exported DXF all start from this one array.
  const cuttable = useMemo(() => (result ? exportablePanels(result.panels) : []), [result]);
  const partsKey = useMemo(() => cuttable.map((p) => p.id).join('|'), [cuttable]);

  // The selection is DERIVED, not synchronised: a part nobody has touched is
  // in, a part that was ticked off stays off, and a part that appeared since
  // (a drawer added, a door removed) arrives ticked. No effect, so there is no
  // frame where the picture and the checkboxes disagree.
  const selected = useMemo(() => {
    if (picked.unitId !== (unit?.id ?? null)) return new Set(cuttable.map((p) => p.id));
    const known = new Set(picked.known ? picked.known.split('|') : []);
    const out = new Set();
    for (const p of cuttable) if (!known.has(p.id) || picked.ids.has(p.id)) out.add(p.id);
    return out;
  }, [picked, unit?.id, cuttable]);

  const setSelection = useCallback((ids) => {
    setPicked({ unitId: unit?.id ?? null, known: partsKey, ids: new Set(ids) });
  }, [unit?.id, partsKey]);

  const togglePart = useCallback((id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelection(next);
  }, [selected, setSelection]);

  const toggleGroup = useCallback((groupId) => {
    const ids = cuttable.filter((p) => groupOfPanel(p) === groupId).map((p) => p.id);
    const allOn = ids.every((id) => selected.has(id));
    const next = new Set(selected);
    for (const id of ids) { if (allOn) next.delete(id); else next.add(id); }
    setSelection(next);
  }, [cuttable, selected, setSelection]);

  const activePreset = useMemo(
    () => presetOfSelection(cuttable, [...selected]),
    [cuttable, selected],
  );

  // The preview draws the SELECTED parts — and the export runs the same
  // layout over the same array, which is what makes the file the picture.
  const sheetPanels = useMemo(() => cuttable.filter((p) => selected.has(p.id)), [cuttable, selected]);

  const sheet = useMemo(() => {
    if (!result || !sheetPanels.length) return null;
    return layoutPanels(sheetPanels, result.drills, {
      gap: profile.cnc.layoutGap,
      rowWidth: profile.cnc.layoutRowWidth,
    });
  }, [result, sheetPanels, profile.cnc.layoutGap, profile.cnc.layoutRowWidth]);

  // ── viewport ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.max(1, width), h: Math.max(1, height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit = useCallback(() => {
    if (!sheet || size.w <= 1) return;
    const aspect = size.w / size.h;
    const wantW = sheet.width + PADDING_MM * 2;
    const wantH = sheet.height + PADDING_MM * 2;
    const w = Math.max(wantW, wantH * aspect, MIN_VIEW_MM);
    const h = w / aspect;
    setBox({ x: sheet.width / 2 - w / 2, y: sheet.height / 2 - h / 2, w });
  }, [sheet, size.w, size.h]);

  // Refit whenever the sheet itself changes shape (another unit, another
  // parameter) — but not on every re-render, or panning would fight the user.
  const sheetKey = sheet ? `${unit?.id}|${Math.round(sheet.width)}x${Math.round(sheet.height)}` : null;
  const lastKey = useRef(null);
  useEffect(() => {
    if (!sheetKey || size.w <= 1) return;
    if (lastKey.current === sheetKey && box) return;
    lastKey.current = sheetKey;
    fit();
  }, [sheetKey, size.w, size.h, fit, box]);

  const mmPerPx = box ? box.w / size.w : 1;
  const viewH = box ? box.w * (size.h / size.w) : 1;

  const zoomBy = useCallback((factor, anchor) => {
    setBox((b) => {
      if (!b) return b;
      const h = b.w * (size.h / size.w);
      const ax = anchor ? anchor.x : b.x + b.w / 2;
      const ay = anchor ? anchor.y : b.y + h / 2;
      const w = Math.min(MAX_VIEW_MM, Math.max(MIN_VIEW_MM, b.w * factor));
      const k = w / b.w;
      return { x: ax - (ax - b.x) * k, y: ay - (ay - b.y) * k, w };
    });
  }, [size.h, size.w]);

  const pointerToSheet = useCallback((clientX, clientY) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !box) return null;
    const scale = box.w / rect.width;
    return { x: box.x + (clientX - rect.left) * scale, y: box.y + (clientY - rect.top) * scale };
  }, [box]);

  const onWheel = useCallback((e) => {
    if (!box) return;
    e.preventDefault();
    zoomBy(e.deltaY > 0 ? ZOOM_STEP : 1 / ZOOM_STEP, pointerToSheet(e.clientX, e.clientY));
  }, [box, zoomBy, pointerToSheet]);

  // Wheel has to be bound non-passively or the browser refuses preventDefault
  // and the page scrolls behind the drawing.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return undefined;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  const pan = useRef(null);
  const onPointerDown = (e) => {
    if (e.button !== 0 && e.button !== 1) return;
    pan.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!pan.current || !box) return;
    const dx = (e.clientX - pan.current.x) * mmPerPx;
    const dy = (e.clientY - pan.current.y) * mmPerPx;
    pan.current = { x: e.clientX, y: e.clientY };
    setBox((b) => (b ? { ...b, x: b.x - dx, y: b.y - dy } : b));
  };
  const endPan = (e) => {
    pan.current = null;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // ── layers actually present, for the legend ───────────────────────────────
  // Counted over the parts actually on the sheet, so the legend describes the
  // picture rather than the unit — untick the drawers and the drawer layers go.
  const layerCounts = useMemo(() => {
    const counts = new Map();
    if (!result) return counts;
    const onSheet = new Set(sheetPanels.map((p) => p.id));
    const bump = (name, n = 1) => counts.set(name, (counts.get(name) || 0) + n);
    for (const p of sheetPanels) {
      bump(p.cnc.layer || profile.puzzle.layers.outline);
      for (const pk of p.cnc?.pockets || []) bump(pk.layer);
    }
    for (const d of result.drills) if (onSheet.has(d.panel)) bump(d.layer);
    return counts;
  }, [result, sheetPanels, profile.puzzle.layers.outline]);

  const legend = CNC_LAYERS.filter((l) => layerCounts.has(l.name));
  const toggle = (name) => setHidden((prev) => {
    const next = new Set(prev);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });
  const visible = (name) => !hidden.has(name);

  // The ZIP stays: one file per part is Piotr's way out when a single formatka
  // comes back damaged and has to be re-cut on its own.
  const onDownloadZip = async () => {
    if (!result) return;
    setBusy(true);
    try {
      const { filename, files } = await exportUnitDxfZip(result, profile);
      notify(`${filename} — ${files.length} DXF files.`, 'ok');
    } catch (err) {
      notify(err?.message || 'DXF export failed.', 'warn');
    } finally {
      setBusy(false);
    }
  };

  const onDownloadSheet = () => {
    if (!result) return;
    try {
      const { filename, parts } = exportSheetDxf(result, [...selected], profile);
      notify(`${filename} — ${parts} parts, laid out as shown.`, 'ok');
    } catch (err) {
      notify(err?.message || 'DXF export failed.', 'warn');
    }
  };

  // ── empty state ───────────────────────────────────────────────────────────
  if (!unit) {
    return <Empty text="Add a unit from the Library, then switch to CNC." />;
  }

  const labelSize = LABEL_PX * mmPerPx;
  const minHoleR = MIN_HOLE_PX * mmPerPx;

  return (
    <div ref={wrapRef} className="absolute inset-0 bg-[#131313] overflow-hidden select-none">
      {box && sheet && (
        <svg
          ref={svgRef}
          className="w-full h-full touch-none"
          style={{ cursor: pan.current ? 'grabbing' : 'grab' }}
          viewBox={`${box.x} ${box.y} ${box.w} ${viewH}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPan}
          onPointerCancel={endPan}
        >
          {sheet.places.map((place) => (
            <Part
              key={place.panel.id}
              place={place}
              drills={result.drills}
              outlineLayer={profile.puzzle.layers.outline}
              labelSize={labelSize}
              minHoleR={minHoleR}
              visible={visible}
            />
          ))}
        </svg>
      )}

      {!sheet && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-sm text-ink-400">Nothing selected — tick a part or pick a preset.</p>
        </div>
      )}

      {/* toolbar */}
      <div className="absolute top-3 left-3 flex items-center gap-2 bg-shell-800/95 border border-shell-600 rounded px-2 py-1.5">
        <span className="text-xs text-gold uppercase tracking-wide">CNC</span>
        {units.length > 1 ? (
          // Flip between sheets without going back to 3D. Selecting here is the
          // same selection the rest of the app uses, so nothing gets out of step.
          <select
            className="cc-input w-auto py-0.5" value={unit.id}
            aria-label="Unit" onChange={(e) => selectUnit(e.target.value)}
          >
            {units.map((u) => <option key={u.id} value={u.id}>{u.params.unit_num}</option>)}
          </select>
        ) : (
          <span className="text-xs text-ink-100">{unit.params.unit_num}</span>
        )}
        <span className="text-[11px] text-ink-400 tabular-nums">{selected.size} / {cuttable.length} parts</span>
        <span className="w-px h-4 bg-shell-600" />
        <button type="button" className="cc-btn-ghost" title="Zoom out" onClick={() => zoomBy(ZOOM_STEP)}>−</button>
        <button type="button" className="cc-btn-ghost" title="Zoom in" onClick={() => zoomBy(1 / ZOOM_STEP)}>+</button>
        <button type="button" className="cc-btn-ghost" title="Fit the whole sheet" onClick={fit}>Fit</button>
      </div>

      {/* export panel — what goes on the sheet, and how it leaves */}
      <div
        // top-14 keeps it clear of the canvas toolbar, which is centred over
        // the whole canvas and would otherwise clip this panel's header.
        className="absolute top-14 z-20 w-[268px] bg-shell-800/95 border border-shell-600 rounded flex flex-col max-h-[calc(100%-4.25rem)]"
        // The BOM (560) and the parameter panel (310) are docked to the right
        // edge; the export panel sits beside the open one, never under it.
        style={{ right: (bomOpen ? 560 : (rightPanelOpen ? 310 : 0)) + 12 }}
      >
        <div className="flex items-center justify-between px-2.5 pt-2">
          <span className="text-[11px] uppercase tracking-wide text-ink-400">Export</span>
          <button
            type="button"
            className="text-[11px] text-ink-400 hover:text-gold"
            onClick={() => setListOpen((v) => !v)}
          >
            {listOpen ? 'Hide list' : 'Show list'}
          </button>
        </div>

        {/* presets — the four selections Piotr asked for by name */}
        <div className="grid grid-cols-2 gap-1 px-2.5 pt-2">
          {EXPORT_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={activePreset === p.id}
              className={`px-1.5 py-1 text-[11px] rounded border transition-colors ${activePreset === p.id
                ? 'bg-gold text-shell-900 border-gold font-medium'
                : 'border-shell-600 text-ink-100 hover:bg-shell-700'}`}
              onClick={() => setSelection(panelIdsForPreset(cuttable, p.id))}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="px-2.5 pt-1.5 text-[10px] text-ink-400">
          {activePreset === 'custom' ? 'Custom selection' : 'Preset selection'} — the preview shows what will be exported.
        </p>

        {listOpen && (
          <div className="mt-1.5 px-1.5 overflow-y-auto flex-1 min-h-0">
            {PART_GROUPS.map((g) => {
              const parts = cuttable.filter((p) => groupOfPanel(p) === g.id);
              if (!parts.length) return null;
              const on = parts.filter((p) => selected.has(p.id)).length;
              return (
                <div key={g.id} className="mb-1.5">
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-1 py-1 rounded hover:bg-shell-700 text-left"
                    onClick={() => toggleGroup(g.id)}
                    title={g.hint}
                  >
                    <Tick state={on === parts.length ? 'on' : (on === 0 ? 'off' : 'some')} />
                    <span className="text-[11px] text-ink-100 flex-1 truncate">{g.label}</span>
                    <span className="text-[10px] text-ink-400 tabular-nums">{on}/{parts.length}</span>
                  </button>
                  <ul>
                    {parts.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className={`w-full flex items-center gap-2 pl-6 pr-1 py-0.5 rounded hover:bg-shell-700 text-left ${selected.has(p.id) ? '' : 'opacity-45'}`}
                          onClick={() => togglePart(p.id)}
                        >
                          <Tick state={selected.has(p.id) ? 'on' : 'off'} small />
                          <span className="text-[11px] text-ink-100 flex-1 truncate font-mono">{p.id}</span>
                          <span className="text-[10px] text-ink-400 tabular-nums">
                            {Math.round(p.w)}×{Math.round(p.h)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        <div className="p-2 border-t border-shell-600 space-y-1.5">
          <button
            type="button"
            className="cc-btn-gold w-full"
            disabled={selected.size === 0}
            onClick={onDownloadSheet}
          >
            Download DXF (one file)
          </button>
          <button type="button" className="cc-btn w-full" disabled={busy} onClick={onDownloadZip}>
            {busy ? 'Zipping…' : 'Download ZIP (per panel)'}
          </button>
          <p className="text-[10px] text-ink-400 leading-snug">
            One file: the selected parts, arranged as shown. ZIP: every part of the
            unit in its own DXF, for re-cutting a single damaged panel.
          </p>
        </div>
      </div>

      {/* layer legend — click a row to hide that layer */}
      <div className="absolute bottom-3 left-3 bg-shell-800/95 border border-shell-600 rounded p-2 max-w-[230px]">
        <div className="text-[11px] uppercase tracking-wide text-ink-400 mb-1.5">Layers</div>
        <ul className="space-y-0.5">
          {legend.map((l) => (
            <li key={l.name}>
              <button
                type="button"
                className={`w-full flex items-center gap-2 text-left px-1 py-0.5 rounded hover:bg-shell-700 ${visible(l.name) ? '' : 'opacity-40'}`}
                onClick={() => toggle(l.name)}
                title={`${l.name} — click to ${visible(l.name) ? 'hide' : 'show'}`}
              >
                <span className="w-3 h-3 rounded-sm shrink-0 border border-black/40" style={{ background: l.screen }} />
                <span className="text-[11px] text-ink-100 flex-1 truncate">{l.name}</span>
                <span className="text-[10px] text-ink-400 tabular-nums">{layerCounts.get(l.name)}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-ink-400 mt-1.5 leading-snug">
          Preview only. Drag to pan, scroll to zoom.
        </p>
      </div>
    </div>
  );
}

// ─── checkbox ───
// Drawn rather than an <input type="checkbox">: the row is the button, and a
// real checkbox inside a button is a nested control the browser fights over.
function Tick({ state, small = false }) {
  const box = small ? 'w-3 h-3' : 'w-3.5 h-3.5';
  if (state === 'on') {
    return (
      <span className={`${box} shrink-0 rounded-sm bg-gold border border-gold flex items-center justify-center`}>
        <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" aria-hidden="true">
          <path d="M1.5 5.2 L4 7.5 L8.5 2.5" fill="none" stroke="#131313" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (state === 'some') {
    return (
      <span className={`${box} shrink-0 rounded-sm border border-gold flex items-center justify-center`}>
        <span className="w-1.5 h-0.5 bg-gold" />
      </span>
    );
  }
  return <span className={`${box} shrink-0 rounded-sm border border-shell-500`} />;
}

// ─── one cut part ───

// Rough advance width of the monospace face, as a fraction of the font size.
// Only needs to be close: it decides when a label stops growing, not layout.
const MONO_ADVANCE = 0.62;

function Part({ place, drills, outlineLayer, labelSize, minHoleR, visible }) {
  const { panel } = place;
  const cnc = panel.cnc || {};
  const holes = drills.filter((d) => d.panel === panel.id);
  const oLayer = cnc.layer || outlineLayer;

  // Labels are capped at the width of the part they belong to, so two parts
  // standing side by side on the sheet can never overprint each other's label.
  // A 30 mm filler therefore gets a tiny caption when the whole sheet is in
  // view and a perfectly legible one as soon as you zoom to it — which is the
  // only moment you actually need to read it.
  const caption = `${panel.id}  ${Math.round(panel.w)}×${Math.round(panel.h)}`;
  const fitted = place.w / (caption.length * MONO_ADVANCE);
  const size = Math.min(labelSize, fitted);
  const [labelX, labelY] = [place.x + place.w / 2, place.y + place.h + size * 1.35];

  return (
    <g>
      {visible(oLayer) && cnc.outline?.length >= 2 && (
        <polygon
          points={sheetPolygon(place, cnc.outline)}
          fill="rgba(255,255,255,0.035)"
          stroke={layerScreenColor(oLayer)}
          strokeWidth={1.4}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {(cnc.pockets || []).filter((p) => visible(p.layer)).map((p, i) => {
        const r = sheetRect(place, p);
        return (
          <rect
            key={`p${i}`} x={r.x} y={r.y} width={r.w} height={r.h}
            fill="none" stroke={layerScreenColor(p.layer)} strokeWidth={1} vectorEffect="non-scaling-stroke"
          />
        );
      })}

      {holes.filter((h) => visible(h.layer)).map((h, i) => {
        const [cx, cy] = toSheet(place, h.x, h.y);
        return (
          <circle
            key={`h${i}`} cx={cx} cy={cy} r={Math.max(h.d / 2, minHoleR)}
            fill="none" stroke={layerScreenColor(h.layer)} strokeWidth={1} vectorEffect="non-scaling-stroke"
          />
        );
      })}

      {/* id + the cut-list dimensions, so the sheet reads like the CSV */}
      <text
        x={labelX} y={labelY} textAnchor="middle"
        fontSize={size} fill="#d6d6d2"
        style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}
      >
        {panel.id}
        <tspan fill="#8f8f88">{`  ${Math.round(panel.w)}×${Math.round(panel.h)}`}</tspan>
      </text>
    </g>
  );
}

function Empty({ text, children }) {
  return (
    <div className="absolute inset-0 bg-[#131313] flex flex-col items-center justify-center">
      <p className="text-sm text-ink-400">{text}</p>
      {children}
    </div>
  );
}
