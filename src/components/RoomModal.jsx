import { useMemo, useRef, useState } from 'react';
import Modal from './Modal.jsx';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import {
  migrateRoom, roomWalls, roomBounds, rectCorners, lCorners, validateRoomShape,
  roomChangeGuard, openingsOnWall, clampOpening, OPENING_DEFAULTS,
} from '../engine/room.js';
import { proposeRoomFromDxf } from '../engine/dxfImport.js';

// Room v2 (CLAUDE.md turn 3, phase 3): the room is a list of walls, edited as a
// PLAN. A rectangle is the four-wall case, an L is the six-wall case, and a DXF
// import is somebody else's corner list — all the same editor.
//
// Nothing is applied until Apply: the guard runs on every change and says what
// would break, so shrinking a room under a unit is refused before it happens,
// not repaired afterwards.

const PLAN_W = 380;
const PLAN_H = 260;

export default function RoomModal() {
  const room = useProjectStore((s) => s.project.room);
  const units = useProjectStore((s) => s.units);
  const setRoom = useProjectStore((s) => s.setRoom);
  const closeModal = useUiStore((s) => s.closeModal);
  const notify = useUiStore((s) => s.notify);

  const [draft, setDraft] = useState(() => migrateRoom(room));
  const [dragCorner, setDragCorner] = useState(null);
  const [importInfo, setImportInfo] = useState(null);
  const fileRef = useRef(null);

  const walls = useMemo(() => roomWalls(draft), [draft]);
  const bounds = useMemo(() => roomBounds(draft), [draft]);
  const shapeIssues = useMemo(() => validateRoomShape(draft.corners), [draft.corners]);
  const guard = useMemo(() => roomChangeGuard(draft, units), [draft, units]);

  // Plan → SVG. One scale for both axes so a square room looks square.
  const pad = 18;
  const scale = Math.min(
    (PLAN_W - pad * 2) / Math.max(bounds.width, 1),
    (PLAN_H - pad * 2) / Math.max(bounds.depth, 1),
  );
  const toSvg = (c) => ({ x: pad + (c.x - bounds.minX) * scale, y: pad + (c.y - bounds.minY) * scale });
  const fromSvg = (p) => ({
    x: Math.round((p.x - pad) / scale + bounds.minX),
    y: Math.round((p.y - pad) / scale + bounds.minY),
  });

  const patch = (next) => setDraft((d) => migrateRoom({ ...d, ...next }));

  const setPreset = (kind) => {
    const w = Math.max(bounds.width, 1000);
    const d = Math.max(bounds.depth, 1000);
    patch({ corners: kind === 'L' ? lCorners(w, d, Math.round(w / 3), Math.round(d / 3)) : rectCorners(w, d) });
  };

  const setWallLength = (index, lengthMm) => {
    // Move the wall's END corner along the wall direction. For a rectangle
    // that is exactly "make this side longer"; for a free shape it is the
    // least surprising thing a length field can mean.
    const wall = walls[index];
    const len = Math.max(100, Number(lengthMm) || 0);
    const endIndex = (index + 1) % draft.corners.length;
    const corners = draft.corners.map((c, i) => (i === endIndex
      ? { x: Math.round(wall.start.x + wall.along.x * len), y: Math.round(wall.start.y + wall.along.y * len) }
      : c));
    patch({ corners });
  };

  const onPlanPointerMove = (e) => {
    if (dragCorner == null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const p = fromSvg({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    patch({ corners: draft.corners.map((c, i) => (i === dragCorner ? p : c)) });
  };

  const addCorner = (wallIndex) => {
    const w = walls[wallIndex];
    const mid = { x: Math.round((w.start.x + w.end.x) / 2), y: Math.round((w.start.y + w.end.y) / 2) };
    const corners = [...draft.corners];
    corners.splice(wallIndex + 1, 0, mid);
    patch({ corners });
  };

  const removeCorner = (index) => {
    if (draft.corners.length <= 3) { notify('A room needs at least three corners.', 'warn'); return; }
    patch({ corners: draft.corners.filter((_, i) => i !== index) });
  };

  const addOpening = (kind, wallIndex) => {
    const d = OPENING_DEFAULTS[kind];
    const opening = clampOpening({
      id: `op_${Math.random().toString(36).slice(2, 9)}`,
      kind, wall: wallIndex, x_mm: Math.max(0, walls[wallIndex].width / 2 - d.width / 2), ...d,
    }, draft);
    patch({ openings: [...(draft.openings || []), opening] });
  };

  const updateOpening = (id, next) => patch({
    openings: (draft.openings || []).map((o) => (o.id === id ? clampOpening({ ...o, ...next }, draft) : o)),
  });

  const removeOpening = (id) => patch({ openings: (draft.openings || []).filter((o) => o.id !== id) });

  const onImport = async (file) => {
    if (!file) return;
    const text = await file.text();
    // The plan may be drawn in mm, cm or m — the file does not reliably say,
    // so the proposal is shown at 1:1 and the scale is one click away.
    const proposal = proposeRoomFromDxf(text, { scale: 1 });
    setImportInfo({ ...proposal, fileName: file.name, text });
    if (proposal.ok) patch({ corners: proposal.corners });
    else notify(proposal.warnings[0] || 'Nothing usable in that DXF.', 'warn');
  };

  const rescaleImport = (factor) => {
    if (!importInfo?.text) return;
    const proposal = proposeRoomFromDxf(importInfo.text, { scale: factor });
    setImportInfo({ ...proposal, fileName: importInfo.fileName, text: importInfo.text });
    if (proposal.ok) patch({ corners: proposal.corners });
  };

  const apply = () => {
    if (shapeIssues.length) { notify(shapeIssues[0], 'warn'); return; }
    const verdict = setRoom(draft);
    if (!verdict.ok) { notify(verdict.message, 'error'); return; }
    notify('Room updated.', 'ok');
    closeModal();
  };

  return (
    <Modal
      title="Room setup"
      onClose={closeModal}
      width="w-[860px]"
      footer={<>
        <button type="button" className="cc-btn" onClick={closeModal}>Cancel</button>
        <button type="button" className="cc-btn-gold" onClick={apply} disabled={!guard.ok || shapeIssues.length > 0}>
          Apply
        </button>
      </>}
    >
      <div className="grid grid-cols-2 gap-4">
        {/* ── plan ── */}
        <div>
          <div className="cc-row mb-2">
            <span className="text-xs uppercase tracking-wide text-ink-200">Plan (top view)</span>
            <div className="flex gap-1">
              <button type="button" className="cc-btn" onClick={() => setPreset('rect')}>Rectangle</button>
              <button type="button" className="cc-btn" onClick={() => setPreset('L')}>L-shape</button>
            </div>
          </div>

          <svg
            width={PLAN_W} height={PLAN_H}
            className="bg-shell-900 border border-shell-600 rounded touch-none"
            onPointerMove={onPlanPointerMove}
            onPointerUp={() => setDragCorner(null)}
            onPointerLeave={() => setDragCorner(null)}
          >
            <polygon
              points={draft.corners.map((c) => { const p = toSvg(c); return `${p.x},${p.y}`; }).join(' ')}
              fill="#2d2d30" stroke="#AA8E68" strokeWidth="1.5"
            />
            {walls.map((w) => {
              const a = toSvg(w.start); const b = toSvg(w.end);
              return (
                <g key={w.index}>
                  <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} fill="#c9c9cd" fontSize="9" textAnchor="middle">
                    {w.index + 1}: {Math.round(w.width)}
                  </text>
                  {openingsOnWall(draft, w.index).map((o) => {
                    const t1 = o.x_mm / (w.width || 1);
                    const t2 = (o.x_mm + o.width) / (w.width || 1);
                    return (
                      <line
                        key={o.id}
                        x1={a.x + (b.x - a.x) * t1} y1={a.y + (b.y - a.y) * t1}
                        x2={a.x + (b.x - a.x) * t2} y2={a.y + (b.y - a.y) * t2}
                        stroke={o.kind === 'door' ? '#AA8E68' : '#7fb3d5'} strokeWidth="4"
                      />
                    );
                  })}
                </g>
              );
            })}
            {draft.corners.map((c, i) => {
              const p = toSvg(c);
              return (
                <circle
                  key={i} cx={p.x} cy={p.y} r={5}
                  fill={dragCorner === i ? '#C8A678' : '#AA8E68'} stroke="#1a1a1a"
                  className="cursor-move"
                  onPointerDown={() => setDragCorner(i)}
                  onDoubleClick={() => removeCorner(i)}
                />
              );
            })}
          </svg>
          <p className="text-[11px] text-ink-400 mt-1">
            Drag a corner to reshape. Double-click a corner to delete it. Wall numbers match the list on the right.
          </p>

          <div className="cc-divider" />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="cc-label">Room height (mm)</span>
              <input
                type="number" className="cc-input" value={draft.height}
                onChange={(e) => patch({ height: Number(e.target.value) || draft.height })}
              />
            </div>
            <div className="flex items-end">
              <button type="button" className="cc-btn w-full" onClick={() => fileRef.current?.click()}>
                Import DXF plan…
              </button>
              <input
                ref={fileRef} type="file" accept=".dxf,text/plain" className="hidden"
                onChange={(e) => onImport(e.target.files?.[0])}
              />
            </div>
          </div>

          {importInfo && (
            <div className="mt-2 text-[11px] text-ink-300 border border-shell-600 rounded p-2 space-y-1">
              <div className="text-ink-100">{importInfo.fileName}</div>
              {importInfo.ok ? (
                <>
                  <div>
                    {importInfo.corners.length} corners from the {importInfo.source} · {importInfo.stats.area_m2} m²
                  </div>
                  <div className="flex gap-1 items-center">
                    <span>Drawn in</span>
                    {[['mm', 1], ['cm', 10], ['m', 1000]].map(([label, f]) => (
                      <button key={label} type="button" className="cc-btn px-2 py-0.5" onClick={() => rescaleImport(f)}>{label}</button>
                    ))}
                  </div>
                </>
              ) : <div className="text-status-warn">{importInfo.warnings[0]}</div>}
              {importInfo.warnings?.slice(importInfo.ok ? 0 : 1).map((w, i) => (
                <div key={i} className="text-status-warn">{w}</div>
              ))}
            </div>
          )}
        </div>

        {/* ── walls, openings, guard ── */}
        <div className="space-y-3">
          <span className="text-xs uppercase tracking-wide text-ink-200">Walls</span>
          <ul className="space-y-1">
            {walls.map((w) => (
              <li key={w.index} className="border border-shell-600 rounded p-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink-100 w-12">Wall {w.index + 1}</span>
                  <input
                    type="number" className="cc-input w-24 text-right" value={Math.round(w.width)}
                    onChange={(e) => setWallLength(w.index, e.target.value)}
                  />
                  <span className="text-[11px] text-ink-400 flex-1">mm</span>
                  <button type="button" className="cc-btn px-2" title="Insert window" onClick={() => addOpening('window', w.index)}>+ Window</button>
                  <button type="button" className="cc-btn px-2" title="Insert door" onClick={() => addOpening('door', w.index)}>+ Door</button>
                  <button type="button" className="cc-btn-ghost" title="Split this wall in two" onClick={() => addCorner(w.index)}>⊕</button>
                </div>
                {openingsOnWall(draft, w.index).map((o) => (
                  <div key={o.id} className="flex items-center gap-1 text-[11px] text-ink-300">
                    <span className="w-12 capitalize">{o.kind}</span>
                    <label className="flex items-center gap-1">from
                      <input type="number" className="cc-input w-16 text-right" value={Math.round(o.x_mm)}
                        onChange={(e) => updateOpening(o.id, { x_mm: Number(e.target.value) })} />
                    </label>
                    <label className="flex items-center gap-1">w
                      <input type="number" className="cc-input w-16 text-right" value={Math.round(o.width)}
                        onChange={(e) => updateOpening(o.id, { width: Number(e.target.value) })} />
                    </label>
                    <label className="flex items-center gap-1">h
                      <input type="number" className="cc-input w-16 text-right" value={Math.round(o.height)}
                        onChange={(e) => updateOpening(o.id, { height: Number(e.target.value) })} />
                    </label>
                    {o.kind === 'window' && (
                      <label className="flex items-center gap-1">sill
                        <input type="number" className="cc-input w-14 text-right" value={Math.round(o.sill)}
                          onChange={(e) => updateOpening(o.id, { sill: Number(e.target.value) })} />
                      </label>
                    )}
                    <button type="button" className="cc-btn-ghost" onClick={() => removeOpening(o.id)}>×</button>
                  </div>
                ))}
              </li>
            ))}
          </ul>

          {shapeIssues.map((iss, i) => (
            <p key={i} className="text-[11px] px-2 py-1 rounded border border-status-warn/50 bg-status-warn/10 text-status-warn">{iss}</p>
          ))}

          {!guard.ok && (
            <div className="text-[11px] px-2 py-1 rounded border border-status-danger/50 bg-status-danger/10 text-status-danger space-y-1">
              <div>{guard.message}</div>
              <ul className="list-disc list-inside">
                {guard.blocking.map((b, i) => <li key={i}>{b.label}: {b.reason}</li>)}
              </ul>
            </div>
          )}

          <p className="text-[11px] text-ink-400 leading-relaxed">
            Walls that face away from the camera hide themselves in the 3D view, so looking down at the room
            gives a plan view. Windows and doors are drawn as openings — they do not yet block units.
          </p>
        </div>
      </div>
    </Modal>
  );
}
