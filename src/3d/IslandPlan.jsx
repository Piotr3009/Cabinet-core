/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── THE ISLAND PLAN: THE ROOM FROM ABOVE, THE ISLAND AS A DRAFT ────────────
//
// The owner, 14.10.2026: *"przy dodaniu wyspy chciałbym żeby był widok z
// góry i proponowana na podłodze plan wyspy ... przycisk dodaj szafkę, i
// wtedy ona się pojawia na tym planie coś jak prawdziwa szafka ale bez
// wstawienia i z możliwością zmieniania szerokości ... i dopiero jak się
// wstawi to wtedy pokaże się cała wyspa."*
//
// This window covers the room canvas while a plan is open (the 3-D stands
// still underneath: 3d/frameDemand.jsx pauses it). It draws the room, its
// cabinets and boxes from above, the island's core as a dashed rectangle the
// hand drags (snapped to 10 mm), the plan's cabinets as plain rectangles on
// the faces, and on every face the clear distance to the first thing in front
// of it (engine/islandPlan.js). Nothing here touches the project: INSERT hands
// the draft to the store, which refuses in the room's own words or builds the
// whole island in one undo step.
//
// It lives in src/3d because it is the room canvas's own window and because
// the PRO component surface is frozen byte for byte (turn59-f1): this adds a
// window without touching that surface.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { getCabinetProfile } from '../engine/profile.js';
import {
  normalizeRoom, realWalls, roomBoxes, boxCorners, roomIslands, islandCorners, roomWalls,
} from '../engine/room.js';
import { unitFootprint } from '../engine/collision.js';
import { getUnitType, UNIT_TYPES } from '../engine/types.js';
import { wallGapOf } from '../engine/runs.js';
import {
  PLAN_FACES, planOuterFaces, planCabinets, planFaceFree, planClearances, clearanceLevel, planCabinet, planCore, planCoreRefusal,
} from '../engine/islandPlan.js';

const SNAP_MM = 10;
const PAD = 40;
const INK = { ok: '#5f9e6e', tight: '#d9a441', bad: '#c9524b', none: '#7a7a74' };
const PLAN_TYPES = ['BUD', 'BUDR', 'BUDR2', 'SINK', 'BUDTALL'];

const round = (v, step = SNAP_MM) => Math.round(v / step) * step;
const fmt = (mm) => (mm == null ? '?' : `${Math.round(mm)}`);

export default function IslandPlan() {
  const plan = useUiStore((s) => s.islandPlan);
  const setPlan = useUiStore((s) => s.setIslandPlan);
  const closePlan = useUiStore((s) => s.closeIslandPlan);
  const notify = useUiStore((s) => s.notify);
  const room = useProjectStore((s) => s.project.room);
  const wallSlopes = useProjectStore((s) => s.project.wallSlopes);
  const units = useProjectStore((s) => s.units);
  const insertIslandPlan = useProjectStore((s) => s.insertIslandPlan);
  const profile = getCabinetProfile();
  const [sel, setSel] = useState(null);
  const [face, setFace] = useState('A');
  const [type, setType] = useState('BUD');
  const [said, setSaid] = useState('');
  const svgRef = useRef(null);
  const drag = useRef(null);

  const normal = useMemo(() => normalizeRoom(room), [room]);
  const corners = normal.corners || [];
  const bounds = useMemo(() => {
    const xs = corners.map((c) => c.x); const ys = corners.map((c) => c.y);
    return { minX: Math.min(...xs, 0), maxX: Math.max(...xs, 1), minY: Math.min(...ys, 0), maxY: Math.max(...ys, 1) };
  }, [corners]);
  const view = { w: 900, h: 620 };
  const scale = Math.min((view.w - 2 * PAD) / (bounds.maxX - bounds.minX), (view.h - 2 * PAD) / (bounds.maxY - bounds.minY));
  const X = (mm) => PAD + (mm - bounds.minX) * scale;
  const Y = (mm) => PAD + (mm - bounds.minY) * scale;
  const pts = (poly) => poly.map((p) => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');

  const walls = useMemo(() => roomWalls(room), [room]);
  const others = useMemo(() => units
    .filter((u) => !getUnitType(u.type)?.freePanel && !(plan && u.position?.island === plan.islandId))
    .map((u) => {
      const wall = walls[u.position?.wall ?? 0];
      if (!wall) return null;
      return {
        id: u.id,
        label: u.params?.unit_num || '',
        poly: unitFootprint({
          wall, x: Number(u.position?.x_mm) || 0, width: Number(u.params?.width) || 600,
          depth: Number(u.params?.depth) || 560, rotation: Number(u.position?.rotation_deg) || 0,
          backInset: wallGapOf(u, profile),
        }),
      };
    }).filter(Boolean), [units, walls, plan, profile]);

  // 15.10.2026: the rectangle on the floor is the island's OUTER footprint; the
  // cabinets stand inside it and the CORE is what they leave (engine/islandPlan.js).
  const faces = useMemo(() => (plan ? planOuterFaces(plan) : []), [plan]);
  const cabs = useMemo(() => (plan ? planCabinets(plan, profile) : []), [plan, profile]);
  const clearances = useMemo(() => (plan ? planClearances({
    room, units, elements: wallSlopes || [], draft: plan, profile,
  }) : []), [room, units, wallSlopes, plan, profile]);
  const outer = useMemo(() => (plan ? islandCorners({ ...plan, id: plan.islandId || 'draft' }) : []), [plan]);
  const core = useMemo(() => (plan ? planCore(plan, profile) : null), [plan, profile]);
  const coreCorners = useMemo(() => (core && core.w > 0 && core.d > 0 ? islandCorners(core) : []), [core]);
  const tooSmall = plan ? planCoreRefusal(plan, profile) : null;

  const toMm = useCallback((e) => {
    const svg = svgRef.current; if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const k = view.w / r.width;
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
  }, [view.w]);

  const onCoreDown = (e) => {
    e.preventDefault(); e.stopPropagation();
    const p = toMm(e); if (!p || !plan) return;
    drag.current = { px: p.x, py: p.y, cx: plan.cx, cy: plan.cy };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setSel(null);
  };
  const onCoreMove = (e) => {
    const d = drag.current; if (!d) return;
    const p = toMm(e); if (!p) return;
    const cx = round(d.cx + (p.x - d.px) / scale);
    const cy = round(d.cy + (p.y - d.py) / scale);
    if (cx !== plan.cx || cy !== plan.cy) setPlan({ cx, cy });
  };
  const onCoreUp = () => { drag.current = null; };

  useEffect(() => {
    if (!plan) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closePlan(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [plan, closePlan]);

  if (!plan) return null;

  const setNum = (key, v) => {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 50) setPlan({ [key]: Math.round(n) });
  };
  const addCab = () => {
    // 15.10.2026: the new cabinet takes what the face has free, up to 600, so a
    // click never overfills a face; a face with less than 150 free says so.
    const free = planFaceFree(plan, face, profile);
    if (free < 150) { setSaid(`Face ${face} has ${Math.max(0, free)} mm free: take a cabinet off it, or make the island bigger.`); return; }
    const cab = planCabinet(face, type, Math.min(600, Math.floor(free / 10) * 10));
    setSaid('');
    setPlan({ cabs: [...plan.cabs, cab] });
    setSel(cab.key);
  };
  const changeCab = (key, patch) => setPlan({ cabs: plan.cabs.map((c) => (c.key === key ? { ...c, ...patch } : c)) });
  const removeCab = (key) => { setPlan({ cabs: plan.cabs.filter((c) => c.key !== key) }); if (sel === key) setSel(null); };
  const rotate = () => setPlan({ rotation: ((Number(plan.rotation) || 0) + 90) % 360 });
  const overfull = PLAN_FACES.filter((f) => planFaceFree(plan, f, profile) < 0);
  const insert = () => {
    if (tooSmall) { setSaid(tooSmall); return; }
    if (overfull.length) { setSaid(`Face ${overfull.join(', ')} is overfilled: shorten a cabinet or lengthen the island.`); return; }
    const verdict = insertIslandPlan(plan);
    if (!verdict.ok) { setSaid(verdict.message); return; }
    notify(plan.islandId ? 'Island updated.' : `Island inserted with ${plan.cabs.length} cabinet${plan.cabs.length === 1 ? '' : 's'}.`, 'info');
    closePlan();
  };

  const selected = plan.cabs.find((c) => c.key === sel) || null;
  const islandNo = plan.islandId ? roomIslands(room).findIndex((i) => i.id === plan.islandId) + 1 : roomIslands(room).length + 1;
  const faceAt = (f) => {
    const mid = { x: (f.start.x + f.end.x) / 2, y: (f.start.y + f.end.y) / 2 };
    return { x: X(mid.x) + f.inward.x * 14, y: Y(mid.y) + f.inward.y * 14 };
  };

  return (
    <div
      data-island-plan="1"
      className="absolute inset-0 z-[36] bg-shell-900 text-ink-50 flex"
      onPointerMove={onCoreMove}
      onPointerUp={onCoreUp}
    >
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="h-10 shrink-0 flex items-center gap-3 px-4 border-b border-shell-600">
          <span className="font-semibold tracking-[0.14em] text-gold text-xs uppercase">
            {plan.islandId ? `Island ${islandNo} · plan` : `Add island ${islandNo} · plan`}
          </span>
          <span className="text-ink-200 text-xs">
            Drag the island, type its size, add cabinets to its faces. Nothing is built until Insert.
          </span>
        </div>
        <div className="flex-1 min-h-0 p-3">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${view.w} ${view.h}`}
            className="w-full h-full select-none"
            style={{ touchAction: 'none' }}
            onPointerDown={() => setSel(null)}
          >
            <polygon points={pts(corners)} fill="#2d2d30" stroke="#d6d6d2" strokeWidth="2" />
            {realWalls(room).map((w) => {
              const mid = { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 };
              const anchor = w.inward.x > 0.5 ? 'end' : (w.inward.x < -0.5 ? 'start' : 'middle');
              return (
                <text key={w.index} x={X(mid.x) - w.inward.x * 8} y={Y(mid.y) - w.inward.y * 10} fontSize="10" fill="#a8a8a2" textAnchor={anchor} dominantBaseline="middle">
                  {`wall ${w.index + 1} · ${Math.round(w.width)}`}
                </text>
              );
            })}
            {roomBoxes(room).map((b, i) => (
              <polygon key={`box${i}`} points={pts(boxCorners(b))} fill="#3e3e42" stroke="#7a7a74" />
            ))}
            {roomIslands(room).filter((i) => i.id !== plan.islandId).map((i, k) => (
              <polygon key={i.id} points={pts(islandCorners(i))} fill="#3e3e42" stroke="#7a7a74" strokeDasharray="4 3" />
            ))}
            {others.map((u) => (
              <g key={u.id}>
                <polygon points={pts(u.poly)} fill="#3e3e42" stroke="#a8a8a2" />
                <text x={X((u.poly[0].x + u.poly[2].x) / 2)} y={Y((u.poly[0].y + u.poly[2].y) / 2)} fontSize="9" fill="#d6d6d2" textAnchor="middle" dominantBaseline="middle">{u.label}</text>
              </g>
            ))}
            {clearances.map((c) => (c.from && c.to ? (
              <g key={`cl${c.face}`}>
                <line x1={X(c.from.x)} y1={Y(c.from.y)} x2={X(c.to.x)} y2={Y(c.to.y)} stroke={INK[clearanceLevel(c.mm)]} strokeWidth="1.5" />
                <text
                  x={(X(c.from.x) + X(c.to.x)) / 2} y={(Y(c.from.y) + Y(c.to.y)) / 2 - 4}
                  fontSize="11" fontFamily="ui-monospace, monospace" fill={INK[clearanceLevel(c.mm)]} textAnchor="middle"
                >
                  {fmt(c.mm)}
                </text>
              </g>
            ) : null))}
            {cabs.map((row) => (
              <g key={row.cab.key} onPointerDown={(e) => { e.stopPropagation(); setSel(row.cab.key); }} style={{ cursor: 'pointer' }}>
                <polygon
                  points={pts(row.poly)}
                  fill={row.overhang > 0 ? '#5a2a28' : '#252526'}
                  stroke={sel === row.cab.key ? '#C8A678' : '#a8a8a2'}
                  strokeWidth={sel === row.cab.key ? 2 : 1}
                />
                <text x={X((row.poly[0].x + row.poly[2].x) / 2)} y={Y((row.poly[0].y + row.poly[2].y) / 2)} fontSize="9" fontFamily="ui-monospace, monospace" fill="#f2f2f0" textAnchor="middle" dominantBaseline="middle">
                  {row.cab.label ? `${row.cab.label} · ${row.width}` : `${row.width}`}
                </text>
              </g>
            ))}
            <polygon
              data-plan-core="1"
              points={pts(outer)}
              fill="rgba(170,142,104,0.10)"
              stroke={tooSmall ? INK.bad : '#C8A678'}
              strokeWidth="2"
              strokeDasharray="8 5"
              style={{ cursor: 'move' }}
              onPointerDown={onCoreDown}
            />
            {coreCorners.length === 4 && (
              <polygon data-plan-core-left="1" points={pts(coreCorners)} fill="rgba(170,142,104,0.16)" stroke="#C8A678" strokeWidth="1" strokeDasharray="3 3" pointerEvents="none" />
            )}
            <text x={X(plan.cx)} y={Y(plan.cy)} fontSize="11" fontFamily="ui-monospace, monospace" fill="#C8A678" textAnchor="middle" dominantBaseline="middle" pointerEvents="none">
              {`${plan.w} × ${plan.d}`}
            </text>
            {faces.map((f) => {
              const at = faceAt(f);
              return <text key={f.face} x={at.x} y={at.y} fontSize="10" fill="#C8A678" textAnchor="middle" dominantBaseline="middle">{f.face}</text>;
            })}
          </svg>
        </div>
      </div>

      <div className="w-[300px] shrink-0 border-l border-shell-600 bg-shell-800 overflow-y-auto p-4 flex flex-col gap-4 text-sm">
        <section className="flex flex-col gap-2">
          <span className="cc-label">Island size (mm)</span>
          <label className="flex items-center justify-between gap-2"><span>Length (faces A, B)</span>
            <input className="cc-input w-24 text-right font-mono" type="number" step="50" min="50" value={plan.w} data-plan-w="1" onChange={(e) => setNum('w', e.target.value)} />
          </label>
          <label className="flex items-center justify-between gap-2"><span>Depth (faces E1, E2)</span>
            <input className="cc-input w-24 text-right font-mono" type="number" step="50" min="50" value={plan.d} data-plan-d="1" onChange={(e) => setNum('d', e.target.value)} />
          </label>
          <button type="button" className="cc-btn" data-plan-rotate="1" onClick={rotate}>Rotate 90°</button>
          <span className="text-ink-400 text-xs" data-plan-core-size="1">
            {core && core.w > 0 && core.d > 0
              ? `The cabinets stand inside this rectangle; what they leave in the middle is ${Math.round(core.w)} × ${Math.round(core.d)} mm.`
              : 'The cabinets stand inside this rectangle.'}
          </span>
          {tooSmall && <span className="text-xs" style={{ color: INK.bad }} data-plan-too-small="1">{tooSmall}</span>}
        </section>

        <section className="flex flex-col gap-1">
          <span className="cc-label">Clearances (mm)</span>
          {clearances.map((c) => (
            <div key={c.face} className="flex items-center justify-between gap-2">
              <span className="text-ink-100">Face {c.face}{c.what ? ` → ${c.what}` : ''}</span>
              <span className="font-mono tabular-nums" style={{ color: INK[clearanceLevel(c.mm)] }}>{fmt(c.mm)}</span>
            </div>
          ))}
          <span className="text-ink-400 text-xs">Green from 1000, amber from 900, red below.</span>
        </section>

        <section className="flex flex-col gap-2">
          <span className="cc-label">Cabinets on the plan</span>
          <div className="flex items-center gap-2">
            <select className="cc-input flex-1" value={face} data-plan-face="1" onChange={(e) => setFace(e.target.value)}>
              {PLAN_FACES.map((f) => <option key={f} value={f}>{`Face ${f} · ${planFaceFree(plan, f, profile)} free`}</option>)}
            </select>
            <select className="cc-input flex-1" value={type} data-plan-type="1" onChange={(e) => setType(e.target.value)}>
              {PLAN_TYPES.filter((t) => UNIT_TYPES?.[t] || getUnitType(t)).map((t) => <option key={t} value={t}>{getUnitType(t)?.label || t}</option>)}
            </select>
          </div>
          <button type="button" className="cc-btn" data-plan-add-cab="1" onClick={addCab}>+ Add cabinet</button>
          {plan.cabs.length === 0 && <span className="text-ink-400 text-xs">No cabinets yet. A plan cabinet is a rectangle with a width: nothing is computed or drawn in 3D.</span>}
          {plan.cabs.map((c) => (
            <div
              key={c.key}
              className={`flex items-center justify-between gap-2 rounded px-2 py-1 border ${sel === c.key ? 'border-gold' : 'border-shell-600'}`}
              onClick={() => setSel(c.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') setSel(c.key); }}
            >
              <span className="text-ink-100 text-xs">{c.label ? `${c.label} · ` : ''}{getUnitType(c.type)?.label || c.type} · {c.face}</span>
              <input
                className="cc-input w-20 text-right font-mono"
                type="number" step="50" min="100" value={c.w} data-plan-cab-w={c.key}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n) && n >= 100) changeCab(c.key, { w: Math.round(n) }); }}
              />
              <button type="button" className="cc-btn-ghost text-xs" title="Take it off the plan" data-plan-cab-remove={c.key} onClick={(e) => { e.stopPropagation(); removeCab(c.key); }}>×</button>
            </div>
          ))}
          {selected && <span className="text-ink-400 text-xs">Selected: {getUnitType(selected.type)?.label || selected.type} on face {selected.face}, {selected.w} mm.</span>}
        </section>

        {said && <div className="text-status-danger text-xs" data-plan-said="1">{said}</div>}
        <div className="flex flex-col gap-2 mt-auto">
          <button type="button" className="cc-btn-gold" data-plan-insert="1" onClick={insert}>
            {plan.islandId ? 'Apply plan' : 'Insert island'}
          </button>
          <button type="button" className="cc-btn" data-plan-cancel="1" onClick={closePlan}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
