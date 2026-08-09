import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { layoutPanels, sheetPolygon, sheetRect, toSheet } from '../engine/cnc/layout.js';
import { CNC_LAYERS, layerScreenColor } from '../engine/cnc/layers.js';
import { exportablePanels } from '../engine/cnc/groups.js';
import { formatMmPair } from '../engine/format.js';

// ─── CNC view ───
// The workshop's visual check before the machine — the job AutoCAD used to do.
// Laid out flat, drawn from the engine's own CNC geometry with one colour per
// layer. Read only: nothing here writes to the project, and nothing re-derives a
// dimension (CLAUDE.md task 1).
//
// ─── TURN 11 (CLAUDE.md F8): THE WHOLE PROJECT, AT ONCE ───
//
// It used to show ONE unit — the selected one — and a joiner checking a kitchen
// before sending it to the machine had to click through fourteen of them. It
// shows every unit now, each laid out as its own block with its number over it,
// stacked down the sheet the way a nesting program stacks them.
//
// WHICH of them are on the sheet is the checkbox tree, and the tree lives in
// the RIGHT PANEL (components/CncTree.jsx), which is the other half of F8: the
// panels stay open when you enter CNC, so the tool you need is the one that is
// already there. This file no longer carries an export panel at all.
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
  const units = useProjectStore((s) => s.units);
  const unitResult = useProjectStore((s) => s.unitResult);
  const profile = useCabinetProfileStore((s) => s.profile);
  const hiddenUnits = useUiStore((s) => s.cncHiddenUnits);
  const hiddenParts = useUiStore((s) => s.cncHiddenParts);

  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const [size, setSize] = useState({ w: 1, h: 1 });
  const [box, setBox] = useState(null);                 // viewport in sheet mm: { x, y, w }
  const [hidden, setHidden] = useState(() => new Set());

  // ── what is on the sheet ──────────────────────────────────────────────────
  //
  // EVERY unit, each laid out as its own block and stacked down the sheet with a
  // gap between them (turn 11, CLAUDE.md F8.1). The layout inside a block is the
  // one the export uses — engine/cnc/layout.js, unchanged — so a block IS the
  // file that unit would produce, and the sheet is those files side by side.
  //
  // The ticks come from the store (components/CncTree.jsx, in the right panel):
  // a hidden UNIT contributes no block at all, and a hidden PART is simply not
  // in its block.
  const sheets = useMemo(() => {
    const gap = profile.cnc.layoutGap;
    const out = [];
    let y = 0;
    for (const unit of units) {
      if (hiddenUnits[unit.id]) continue;
      const result = unitResult(unit.id);
      if (!result) continue;
      const parts = exportablePanels(result.panels)
        .filter((p) => !hiddenParts[unit.id]?.[p.id]);
      if (!parts.length) continue;
      const layout = layoutPanels(parts, result.drills, {
        gap, rowWidth: profile.cnc.layoutRowWidth,
      });
      out.push({
        unit, result, layout, offsetY: y,
      });
      // A unit's own caption sits above its block; `gap * 3` is one layout gap
      // for the caption and two to keep two units from reading as one nest.
      y += layout.height + gap * 3;
    }
    return out;
  }, [units, unitResult, hiddenUnits, hiddenParts, profile.cnc.layoutGap, profile.cnc.layoutRowWidth]);

  const sheet = useMemo(() => {
    if (!sheets.length) return null;
    const width = Math.max(...sheets.map((s2) => s2.layout.width));
    const last = sheets[sheets.length - 1];
    return { width, height: last.offsetY + last.layout.height };
  }, [sheets]);

  // Every drill of every unit on the sheet, keyed by unit, so a part draws its
  // own holes and never another unit's (two cabinets can both have a `BUL`).
  const drillsOf = useMemo(
    () => new Map(sheets.map((s2) => [s2.unit.id, s2.result.drills])),
    [sheets],
  );

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
  const sheetKey = sheet
    ? `${sheets.length}|${formatMmPair(sheet.width, sheet.height, 'x')}`
    : null;
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
  // Counted over the parts actually on the SHEET — every unit's, since turn 11
  // — so the legend describes the picture rather than one cabinet: untick the
  // drawers everywhere and the drawer layers go.
  const layerCounts = useMemo(() => {
    const counts = new Map();
    const bump = (name, n = 1) => counts.set(name, (counts.get(name) || 0) + n);
    for (const s2 of sheets) {
      const onSheet = new Set(s2.layout.places.map((pl) => pl.panel.id));
      for (const place of s2.layout.places) {
        const p = place.panel;
        bump(p.cnc.layer || profile.puzzle.layers.outline);
        for (const pk of p.cnc?.pockets || []) bump(pk.layer);
        // Turn 13 (F8): the biscuit marks are a layer of their own, so the
        // legend has to count them or BISCUIT_4MM never appears in it.
        for (const mk of p.cnc?.marks || []) bump(mk.layer);
      }
      for (const d of s2.result.drills) if (onSheet.has(d.panel)) bump(d.layer);
    }
    return counts;
  }, [sheets, profile.puzzle.layers.outline]);

  const legend = CNC_LAYERS.filter((l) => layerCounts.has(l.name));
  const toggle = (name) => setHidden((prev) => {
    const next = new Set(prev);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });
  const visible = (name) => !hidden.has(name);

  // ── empty state ───────────────────────────────────────────────────────────
  if (!units.length) {
    return <Empty text="Add a unit from the Library, then switch to CNC." />;
  }

  const labelSize = LABEL_PX * mmPerPx;
  const minHoleR = MIN_HOLE_PX * mmPerPx;
  const partCount = sheets.reduce((n, s2) => n + s2.layout.places.length, 0);

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
          {sheets.map((s2) => (
            // One group per unit, moved down the sheet by that unit's offset —
            // so a block is exactly the layout that unit would export, and the
            // sheet is those blocks stacked (turn 11, CLAUDE.md F8.1).
            <g key={s2.unit.id} transform={`translate(0 ${s2.offsetY})`}>
              <text
                x={0}
                y={-profile.cnc.layoutGap}
                fontSize={labelSize * 1.6}
                fill={s2.unit.id === selectedUnitId ? '#e0b64a' : '#9a9a92'}
                style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}
              >
                {s2.unit.params.unit_num}
                <tspan fill="#6f6f68">{`  ${s2.layout.places.length} parts`}</tspan>
              </text>
              {s2.layout.places.map((place) => (
                <Part
                  key={place.panel.id}
                  place={place}
                  drills={drillsOf.get(s2.unit.id) || []}
                  outlineLayer={profile.puzzle.layers.outline}
                  labelSize={labelSize}
                  minHoleR={minHoleR}
                  visible={visible}
                />
              ))}
            </g>
          ))}
        </svg>
      )}

      {!sheet && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-sm text-ink-400">
            Nothing on the sheet — tick a unit in the panel on the right.
          </p>
        </div>
      )}

      {/* toolbar */}
      <div className="absolute top-3 left-3 flex items-center gap-2 bg-shell-800/95 border border-shell-600 rounded px-2 py-1.5">
        <span className="text-xs text-gold uppercase tracking-wide">CNC</span>
        <span className="text-[11px] text-ink-400 tabular-nums">
          {sheets.length} of {units.length} units · {partCount} parts
        </span>
        <span className="w-px h-4 bg-shell-600" />
        <button type="button" className="cc-btn-ghost" title="Zoom out" onClick={() => zoomBy(ZOOM_STEP)}>−</button>
        <button type="button" className="cc-btn-ghost" title="Zoom in" onClick={() => zoomBy(1 / ZOOM_STEP)}>+</button>
        <button type="button" className="cc-btn-ghost" title="Fit the whole sheet" onClick={fit}>Fit</button>
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
  const caption = `${panel.id}  ${formatMmPair(panel.w, panel.h, '×')}`;
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

      {/* ─── Turn 13 (CLAUDE.md F8): the biscuit marks ───
          Drawn as the LINE the cutter runs, because that is what it is: an
          in-and-out pass, not a pocket and not a hole. Thicker than a pocket
          outline so a 70 mm mark reads at sheet zoom, where it is the only
          thing in a set that has any length. */}
      {(cnc.marks || []).filter((m) => visible(m.layer)).map((m, i) => {
        const [x1, y1] = toSheet(place, m.from[0], m.from[1]);
        const [x2, y2] = toSheet(place, m.to[0], m.to[1]);
        return (
          <line
            key={`m${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={layerScreenColor(m.layer)} strokeWidth={2} strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
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
        <tspan fill="#8f8f88">{`  ${formatMmPair(panel.w, panel.h, '×')}`}</tspan>
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
