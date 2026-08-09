import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import Modal from './Modal.jsx';
import NumberField from './NumberField.jsx';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import {
  migrateRoom, roomWalls, roomBounds, rectCorners, lCorners, validateRoomShape,
  roomChangeGuard, openingsOnWall, clampOpening, OPENING_DEFAULTS,
  setWallLength as setWallLengthCorners, wallsInScope, wallStub,
  moveWall, moveBoxSide, roomBoxes, migrateBox, BOX_SIDES, MIN_BOX_SIZE,
} from '../engine/room.js';
import { proposeRoomFromDxf } from '../engine/dxfImport.js';
import { formatMm, snap } from '../engine/format.js';
import { getCabinetProfile } from '../engine/profile.js';

// Room v2 (CLAUDE.md turn 3, phase 3): the room is a list of walls, edited as a
// PLAN. A rectangle is the four-wall case, an L is the six-wall case, and a DXF
// import is somebody else's corner list — all the same editor.
//
// Nothing is applied until Apply: the guard runs on every change and says what
// would break, so shrinking a room under a unit is refused before it happens,
// not repaired afterwards.

const PLAN_W = 380;
const PLAN_H = 260;

/**
 * `onClose` / `onApplied` are for the NEW-PROJECT FLOW (turn 7, CLAUDE.md F2),
 * which shows this same editor as a step rather than as a modal off the
 * Settings menu — CLAUDE.md asks for "the existing modal", and this is how it
 * stays the existing one instead of becoming a second room editor to keep in
 * step. Left out, both fall back to what turn 3 did.
 */
export default function RoomModal({ onClose = null, onApplied = null }) {
  const room = useProjectStore((s) => s.project.room);
  const units = useProjectStore((s) => s.units);
  const setRoom = useProjectStore((s) => s.setRoom);
  // The hook is called unconditionally and the prop chosen afterwards — a hook
  // behind an `||` is a hook that sometimes does not run.
  const closeFromStore = useUiStore((s) => s.closeModal);
  // Where this modal opens (turn 12, rule 15): beside whatever asked for it.
  // Nothing to work out here — the opener said, and the shell places it.
  const anchor = useUiStore((s) => s.modalArgs?.anchor) || null;
  const closeModal = onClose || closeFromStore;
  const notify = useUiStore((s) => s.notify);

  const [draft, setDraft] = useState(() => migrateRoom(room));
  // ─── Turn 14 (CLAUDE.md F10): WHAT IS SELECTED, AND WHAT IS BEING DRAGGED ──
  //
  // The owner's verdict on corner-dragging: unusable, and he is describing the
  // arithmetic rather than the mouse. A corner is a point shared by two walls,
  // so dragging it turns BOTH of them: every angle moves at once and a right
  // angle can only be hit by luck. What a joiner moves is a WALL.
  //
  // So the plan has one selection — `{ kind: 'wall'|'box', index, side }` — and
  // one drag, and both of them go through the same engine primitive (`moveWall`
  // / `moveBoxSide`). The drag remembers the room AS IT WAS when the hand went
  // down and applies an ABSOLUTE offset from it, so a drag is one move rather
  // than a hundred small ones accumulating rounding.
  const [picked, setPicked] = useState(null);
  const drag = useRef(null);
  const [typed, setTyped] = useState('');
  const [importInfo, setImportInfo] = useState(null);
  const fileRef = useRef(null);

  const scope = useProjectStore((st) => (st.project.design?.scope === 'wall' ? 'wall' : 'room'));
  const walls = useMemo(() => roomWalls(draft), [draft]);
  // ─── Turn 14 (CLAUDE.md F1.5b): "One wall" means ONE WALL, here too ───────
  // The editor offered four walls for a job whose scope says there is one. The
  // list is the engine's (`wallsInScope`), so the plan, the wall rows and the
  // 3D scene cannot disagree about what this project has.
  const shown = useMemo(() => wallsInScope(draft, scope), [draft, scope]);
  const editable = useMemo(() => shown.filter((w) => !w.stub), [shown]);
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
  // Dragged corners land on the workshop grid (0.5 mm), not on whole mm: this
  // is a room measurement like any other, and turn 5 stopped rounding those.
  const grid = (v) => snap(v, getCabinetProfile().editor.mmStep);
  const fromSvg = (p) => ({
    x: grid((p.x - pad) / scale + bounds.minX),
    y: grid((p.y - pad) / scale + bounds.minY),
  });

  const patch = (next) => setDraft((d) => migrateRoom({ ...d, ...next }));

  const setPreset = (kind) => {
    const w = Math.max(bounds.width, 1000);
    const d = Math.max(bounds.depth, 1000);
    patch({ corners: kind === 'L' ? lCorners(w, d, grid(w / 3), grid(d / 3)) : rectCorners(w, d) });
  };

  /**
   * ─── Turn 14 (CLAUDE.md F1.5a): TYPING A LENGTH KEEPS THE RIGHT ANGLES ────
   *
   * Turn 3 moved the wall's END CORNER along the wall's direction, which is the
   * obvious reading of "make this side 4500" and is wrong for the only shape
   * anybody types into: a rectangle shears into a rhombus, and the two walls
   * that were 3000 come out at 3041.4 — the number on the owner's screenshot.
   *
   * The rule is in the engine (`setWallLength`), and it is the SAME primitive
   * the wall drag uses: this wall keeps its start and its direction, and the
   * NEXT wall is moved along its own normal until the two cross at the distance
   * asked for. Every angle in the room is preserved because no wall's direction
   * is ever written.
   */
  const setWallLength = (index, lengthMm) => {
    const len = Math.max(100, Number(lengthMm) || 0);
    patch({ corners: setWallLengthCorners(draft, index, len).map((c) => ({ x: grid(c.x), y: grid(c.y) })) });
  };

  // ─── Dragging a WHOLE WALL (F10.1) ───────────────────────────────────────
  //
  // The gesture is: grab anywhere on the wall, and it travels along its own
  // NORMAL. The neighbours stretch to meet it and keep their own directions
  // exactly, which is `moveWall` in the engine and is the same primitive the
  // typed LENGTH field (F1.5a) uses — CLAUDE.md F10.5 asks for exactly that,
  // and it is why there is no second constraint solver in this file.
  const boxes = useMemo(() => roomBoxes(draft), [draft]);

  /** How far the pointer has travelled along a wall's outward normal, in mm. */
  const alongNormal = (wall, dxMm, dyMm) => -(dxMm * wall.inward.x + dyMm * wall.inward.y);

  const startWallDrag = (e, index) => {
    e.stopPropagation();
    const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    setPicked({ kind: 'wall', index });
    setTyped('');
    drag.current = {
      kind: 'wall',
      index,
      from: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      room: draft,
      wall: roomWalls(draft)[index],
    };
    e.currentTarget.ownerSVGElement.setPointerCapture?.(e.pointerId);
  };

  const startBoxDrag = (e, boxId, side) => {
    e.stopPropagation();
    const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    setPicked({ kind: 'box', id: boxId, side });
    setTyped('');
    drag.current = {
      kind: 'box',
      id: boxId,
      side,
      from: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      box: boxes.find((b) => b.id === boxId) || null,
    };
    e.currentTarget.ownerSVGElement.setPointerCapture?.(e.pointerId);
  };

  const setBoxes = (next) => patch({ boxes: next });

  const onPlanPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = ((e.clientX - rect.left) - d.from.x) / scale;
    const dy = ((e.clientY - rect.top) - d.from.y) / scale;
    if (d.kind === 'wall') {
      const delta = grid(alongNormal(d.wall, dx, dy));
      if (!delta) return;
      patch({ corners: moveWall(d.room, d.index, delta) });
      return;
    }
    if (!d.box) return;
    const axis = d.side === 'left' || d.side === 'right' ? dx : dy;
    const delta = grid((d.side === 'left' || d.side === 'front' ? -1 : 1) * axis);
    setBoxes(boxes.map((b) => (b.id === d.id ? moveBoxSide(d.box, d.side, delta) : b)));
  };

  const endDrag = () => { drag.current = null; };

  // ─── Typed distance, AutoCAD-style (F10.2) ───────────────────────────────
  //
  // "Start dragging (or select a wall), TYPE a number, Enter → the wall moves
  // EXACTLY that many mm in the drag direction." It is the gesture every CAD
  // package has and the reason is the owner's own: a hand cannot land on 4500,
  // and a room is a set of numbers somebody measured on site.
  //
  // The DIRECTION is the drag's, and with nothing dragged it is OUTWARD, which
  // is what "the wall moves 202" means when nobody has said which way: the room
  // gets bigger. A minus sign is how you say the other thing, and it is typed
  // like any other character.
  const applyTyped = useCallback((raw) => {
    const value = Number(raw);
    if (!picked || !Number.isFinite(value) || value === 0) return false;
    if (picked.kind === 'wall') {
      setDraft((d) => migrateRoom({ ...d, corners: moveWall(d, picked.index, value) }));
      return true;
    }
    setDraft((d) => migrateRoom({
      ...d,
      boxes: roomBoxes(d).map((b) => (b.id === picked.id ? moveBoxSide(b, picked.side, value) : b)),
    }));
    return true;
  }, [picked]);

  useEffect(() => {
    if (!picked) return undefined;
    const onKey = (ev) => {
      // Anything typed into a real field belongs to that field.
      const tag = ev.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (/^[0-9]$/.test(ev.key) || (ev.key === '-' && !typed) || (ev.key === '.' && !typed.includes('.'))) {
        setTyped((t) => t + ev.key);
        ev.preventDefault();
        return;
      }
      if (ev.key === 'Backspace') { setTyped((t) => t.slice(0, -1)); ev.preventDefault(); return; }
      if (ev.key === 'Enter' && typed) {
        if (applyTyped(typed)) { setTyped(''); drag.current = null; }
        ev.preventDefault();
        return;
      }
      if (ev.key === 'Escape') { setTyped(''); setPicked(null); ev.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picked, typed, applyTyped]);

  // ─── Insert box: a chimney, a pillar, a boxed pipe (F10.3) ───────────────
  const insertBox = () => {
    const w = Math.max(MIN_BOX_SIZE, Math.round(bounds.width * 0.12));
    const d = Math.max(MIN_BOX_SIZE, Math.round(bounds.depth * 0.12));
    const box = migrateBox({
      id: `box_${Math.random().toString(36).slice(2, 9)}`,
      x: grid(bounds.centre.x - w / 2),
      y: grid(bounds.centre.y - d / 2),
      w,
      d,
    });
    setBoxes([...boxes, box]);
    setPicked({ kind: 'box', id: box.id, side: 'right' });
  };

  const removeBox = (id) => {
    setBoxes(boxes.filter((b) => b.id !== id));
    setPicked((p) => (p?.kind === 'box' && p.id === id ? null : p));
  };

  const addCorner = (wallIndex) => {
    const w = walls[wallIndex];
    const mid = { x: grid((w.start.x + w.end.x) / 2), y: grid((w.start.y + w.end.y) / 2) };
    const corners = [...draft.corners];
    corners.splice(wallIndex + 1, 0, mid);
    patch({ corners });
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
    if (onApplied) { onApplied(); return; }
    closeModal();
  };

  return (
    <Modal
      anchor={anchor}
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
            {/* A one-wall job has no shape to choose (turn 14, F1.5b). */}
            {scope === 'room' && (
              <div className="flex gap-1">
                <button type="button" className="cc-btn" onClick={() => setPreset('rect')}>Rectangle</button>
                <button type="button" className="cc-btn" onClick={() => setPreset('L')}>L-shape</button>
                {/* F10.3: a chimney, a pillar, a boxed pipe. */}
                <button type="button" className="cc-btn" data-insert-box="1" onClick={insertBox}>+ Box</button>
              </div>
            )}
          </div>

          <svg
            width={PLAN_W} height={PLAN_H}
            className="bg-shell-900 border border-shell-600 rounded touch-none"
            data-room-plan="1"
            onPointerMove={onPlanPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            onPointerDown={() => { setPicked(null); setTyped(''); }}
          >
            <polygon
              points={draft.corners.map((c) => { const p = toSvg(c); return `${p.x},${p.y}`; }).join(' ')}
              fill="#2d2d30"
              stroke={scope === 'wall' ? 'none' : '#AA8E68'}
              strokeWidth="1.5"
            />
            {shown.map((w) => {
              const a = toSvg(w.start); const b = toSvg(w.end);
              return (
                <g key={w.stub ? `stub-${w.index}` : w.index}>
                  {/* A stub carries no number: it is a fixed return, not a
                      wall whose length is part of the job. */}
                  <line
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={w.stub ? '#6b6b70' : '#AA8E68'} strokeWidth={w.stub ? 2 : 3}
                  />
                  {!w.stub && (
                    <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} fill="#c9c9cd" fontSize="9" textAnchor="middle">
                      {w.index + 1}: {formatMm(w.width)}
                    </text>
                  )}
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
            {/* ─── The BOXES (F10.3) ───
                A chimney breast, a pillar, a boxed soil pipe. Each SIDE is
                grabbed and moved exactly as a wall is, and typing a number
                while one is picked moves it exactly that far. */}
            {boxes.map((b) => {
              const a = toSvg({ x: b.x, y: b.y });
              const c = toSvg({ x: b.x + b.w, y: b.y + b.d });
              const on = picked?.kind === 'box' && picked.id === b.id;
              return (
                <g key={b.id}>
                  <rect
                    x={Math.min(a.x, c.x)} y={Math.min(a.y, c.y)}
                    width={Math.abs(c.x - a.x)} height={Math.abs(c.y - a.y)}
                    fill="#3a3a3e" stroke={on ? '#C8A678' : '#6b6b70'} strokeWidth={on ? 2 : 1.2}
                    data-plan-box={b.id}
                    onPointerDown={(e) => { e.stopPropagation(); setPicked({ kind: 'box', id: b.id, side: 'right' }); setTyped(''); }}
                    onDoubleClick={() => removeBox(b.id)}
                  />
                  {BOX_SIDES.map((side) => {
                    const horizontal = side === 'front' || side === 'back';
                    const x1 = side === 'right' ? c.x : a.x;
                    const y1 = side === 'back' ? c.y : a.y;
                    return (
                      <line
                        key={side}
                        x1={horizontal ? a.x : x1}
                        y1={horizontal ? y1 : a.y}
                        x2={horizontal ? c.x : x1}
                        y2={horizontal ? y1 : c.y}
                        stroke={picked?.kind === 'box' && picked.id === b.id && picked.side === side ? '#C8A678' : 'transparent'}
                        strokeWidth={7}
                        className={horizontal ? 'cursor-ns-resize' : 'cursor-ew-resize'}
                        data-box-side={`${b.id}:${side}`}
                        onPointerDown={(e) => startBoxDrag(e, b.id, side)}
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* ─── The WALLS, as grab bars (F10.1) ───
                A transparent fat line on top of each wall: what you grab is the
                wall itself, and it travels along its own normal. There are no
                corner handles any more — a corner is shared by two walls, so
                dragging one turns both, and that is the interaction the owner
                has ruled unusable. */}
            {shown.filter((w) => !w.stub).map((w) => {
              const a = toSvg(w.start); const b = toSvg(w.end);
              const on = picked?.kind === 'wall' && picked.index === w.index;
              const vertical = Math.abs(b.x - a.x) < Math.abs(b.y - a.y);
              return (
                <line
                  key={`grab-${w.index}`}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={on ? '#C8A678' : 'transparent'}
                  strokeWidth={on ? 4 : 9}
                  strokeLinecap="round"
                  className={vertical ? 'cursor-ew-resize' : 'cursor-ns-resize'}
                  data-plan-wall={w.index}
                  onPointerDown={(e) => startWallDrag(e, w.index)}
                />
              );
            })}

            {/* The typed distance, where the eye is (F10.2). */}
            {picked && typed && (
              <g>
                <rect x={PLAN_W / 2 - 46} y={6} width={92} height={20} rx={3} fill="#1a1a1a" stroke="#AA8E68" />
                <text x={PLAN_W / 2} y={20} textAnchor="middle" fontSize="11" fill="#C8A678" data-typed-distance="1">
                  {typed} mm ⏎
                </text>
              </g>
            )}
          </svg>
          <p className="text-[11px] text-ink-400 mt-1">
            {picked
              ? 'Drag it, or TYPE a distance in millimetres and press Enter. Escape lets go.'
              : 'Grab a WALL and it moves along its own normal — the neighbours stretch and every angle is kept. Corners are not dragged.'}
          </p>

          <div className="cc-divider" />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="cc-label">{scope === 'wall' ? 'Wall height (mm)' : 'Room height (mm)'}</span>
              <NumberField
                value={draft.height}
                onCommit={(v) => patch({ height: v || draft.height })}
              />
            </div>
            {/* ─── Turn 14 (CLAUDE.md F1.5b): the two returns ───
                "that wall plus, OPTIONALLY, two 1000 mm side stubs forward".
                Optional is 0, and it is one field rather than a checkbox and a
                length, because a return of no length is no return. */}
            {scope === 'wall' && (
              <div>
                <span className="cc-label">Side returns (mm, 0 = none)</span>
                <NumberField
                  value={wallStub(draft)}
                  min={0}
                  onCommit={(v) => patch({ wall_stub_mm: Math.max(0, Number(v) || 0) })}
                />
              </div>
            )}
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
            {editable.map((w) => (
              <li key={w.index} className="border border-shell-600 rounded p-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink-100 w-12">Wall {w.index + 1}</span>
                  <NumberField
                    className="cc-input w-24 text-right" value={w.width}
                    onCommit={(v) => setWallLength(w.index, v)}
                  />
                  <span className="text-[11px] text-ink-400 flex-1">mm</span>
                  <button type="button" className="cc-btn px-2" title="Insert window" onClick={() => addOpening('window', w.index)}>+ Window</button>
                  <button type="button" className="cc-btn px-2" title="Insert door" onClick={() => addOpening('door', w.index)}>+ Door</button>
                  {scope === 'room' && (
                    <button type="button" className="cc-btn-ghost" title="Split this wall in two" onClick={() => addCorner(w.index)}>⊕</button>
                  )}
                </div>
                {openingsOnWall(draft, w.index).map((o) => (
                  <div key={o.id} className="flex items-center gap-1 text-[11px] text-ink-300">
                    <span className="w-12 capitalize">{o.kind}</span>
                    <label className="flex items-center gap-1">from
                      <NumberField className="cc-input w-16 text-right" value={o.x_mm}
                        onCommit={(v) => updateOpening(o.id, { x_mm: v })} />
                    </label>
                    <label className="flex items-center gap-1">w
                      <NumberField className="cc-input w-16 text-right" value={o.width}
                        onCommit={(v) => updateOpening(o.id, { width: v })} />
                    </label>
                    <label className="flex items-center gap-1">h
                      <NumberField className="cc-input w-16 text-right" value={o.height}
                        onCommit={(v) => updateOpening(o.id, { height: v })} />
                    </label>
                    {o.kind === 'window' && (
                      <label className="flex items-center gap-1">sill
                        <NumberField className="cc-input w-14 text-right" value={o.sill}
                          onCommit={(v) => updateOpening(o.id, { sill: v })} />
                      </label>
                    )}
                    <button type="button" className="cc-btn-ghost" onClick={() => removeOpening(o.id)}>×</button>
                  </div>
                ))}
              </li>
            ))}
          </ul>

          {/* ─── The boxes (F10.3), as numbers ───
              The plan is where they are DRAGGED; this is where they are typed,
              which is the same pair of gestures every other measurement in this
              window has. */}
          {boxes.length > 0 && (
            <>
              <span className="text-xs uppercase tracking-wide text-ink-200">Boxes in the plan</span>
              <ul className="space-y-1" data-box-list="1">
                {boxes.map((b) => (
                  <li key={b.id} className="border border-shell-600 rounded p-2 flex items-center gap-2">
                    <span className="text-sm text-ink-100 w-10">Box</span>
                    {[['x', 'X'], ['y', 'Y'], ['w', 'W'], ['d', 'D']].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-1 text-[11px] text-ink-300">
                        {label}
                        <NumberField
                          className="cc-input w-16 text-right"
                          value={b[key]}
                          onCommit={(v) => setBoxes(boxes.map((o) => (o.id === b.id
                            ? migrateBox({ ...o, [key]: v })
                            : o)))}
                        />
                      </label>
                    ))}
                    <button type="button" className="cc-btn-ghost" title="Remove this box" onClick={() => removeBox(b.id)}>×</button>
                  </li>
                ))}
              </ul>
            </>
          )}

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
            A BOX does: it stands floor to ceiling and a cabinet stops at it, exactly as it stops at a wall.
          </p>
        </div>
      </div>
    </Modal>
  );
}
