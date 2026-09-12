import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import Modal from './Modal.jsx';
import WallElevationModal from './WallElevationModal.jsx';
import { useProjectStore } from '../../../stores/projectStore.js';
import { useUiStore } from '../../../stores/uiStore.js';
import { migrateRoom, roomWalls } from '../../../engine/room.js';
import { formatMm } from '../../../engine/format.js';
import {
  DIRS, dirOf, dirFromCursor, newPath, penOf, addSegment, undoSegment,
  catchesStart, closePath, pathFaults, cornersOfPath, pathBounds, MIN_SEGMENT_MM,
} from '../../../engine/drawRoom.js';

// ─── THE DRAWN ROOM (turn 53, CLAUDE.md F10) ────────────────────────────────
//
// The owner, 27.08.2026:
//
//   *"teraz rysowanie — prawdziwe room, od nowa, robimy jak w CAD: linia od
//   punktu zero, rysujesz w którym kierunku i wpisujesz numer, enter — i linia
//   narysowana. później następna linia, kierunek zawsze 90 stopni, i to samo:
//   wpisujesz milimetry, enter, etc. na końcu ostatnią linię łapiesz i łączysz
//   — zawsze łączysz, taki catch, żeby pokój był zawsze połączony (jak w życiu
//   ściany). później klikamy na ścianę i się pokazuje ściana w pionie (jak
//   'one wall') i edycja: okno, drzwi, skosy — w standardzie. modal 2× większy
//   — rysowanie."*
//
// The MOCKUP was shot first (`verify/t53/f10-mockup.png`, F10's own order), and
// this window answers to it: the same bar, the same origin, the same catch, the
// same three buttons. Where the picture and this file disagree, the picture is
// the older promise and this file is the bug.
//
// ─── WHAT THIS FILE IS NOT ─────────────────────────────────────────────────
//
// It is not the geometry. Every millimetre of the drawing — the four
// directions, the segment, the undo, the catch, the close, the faults and the
// corner list — is `engine/drawRoom.js`, argued in a node test with no browser
// anywhere near it. This file is the HAND: where the cursor is, what is typed,
// and which of the engine's answers gets drawn. That division is the only
// reason a CAD flow can be asserted at all.
//
// ─── TURN 69 · F2 · THIS COPY IS NO LONGER A COPY, AND SAYS SO ─────────────
//
// CLAUDE.md F2, verbatim and in full:
//
//   *"Owner's model: drag → a straight line follows (ortho: up/down/sides
//   only); **click → a small input opens AT THE CLICK POINT**, inside the
//   canvas — never leave the drawing, orientation never lost; type the length,
//   Enter → wall done, the next line starts, direction from the mouse. Escape
//   lets go. Close the loop → the room stands. This REPLACES the current
//   DrawRoomModal interaction in the retail copy; PRO's DrawRoomModal is NOT
//   touched (not in EXEMPT) — retail's copy carries the new controls and says
//   so in the PR."*
//
// So this file and `src/components/DrawRoomModal.jsx` are DELIBERATELY no
// longer byte-twins, and `scripts/t69-copy.mjs` does NOT list it: a copy that a
// machine re-makes the same night is a copy of nothing. The divergence is
// exactly F2's, it is fenced by `test/turn69-f2-the-line-follows-the-mouse.js`,
// and every other rule of the copy stands — imports repointed, classes
// reskinned, colours swapped, PRO's geometry untouched.
//
// WHAT CHANGED, and only this:
//
//   · THE LINE FOLLOWS THE MOUSE. The ghost was drawn only once a number had
//     been typed into a field on the other side of the window. Now it runs from
//     the pen to the cursor, ortho-snapped, the whole time the hand is moving —
//     which is the half of "like in CAD" T53 never had.
//   · THE NUMBER IS TYPED WHERE THE HAND IS. The `Wall length` field left the
//     right-hand column and became a small input that opens AT THE CLICK POINT
//     inside the drawing, pre-filled with the length the hand just drew. The
//     eye never leaves the line, so the orientation is never lost.
//   · ESCAPE LETS GO — the input closes and the pen stays where it is.
//
// ─── TOMBSTONE ─────────────────────────────────────────────────────────────
// The right-hand `Wall length` row (`data-draw-length`, its ✕ and its
// `onKeyDown`) stood in the column beside the drawing. It is the control F2
// replaces; the column keeps the wall list, the state line and the faults.
//
// ─── DECISIONS TAKEN FOR THE OWNER (veto in one line each) ─────────────────
//
//   · **2× the one-wall modal** is measured on the DRAWING, which is the thing
//     he asked to be bigger: the elevation's canvas is 560 × 300 and this one
//     is 800 × 430 — twice the area — and the window grows 820 → 1160 px to
//     hold it. A literal 1640 px window does not fit the laptop it is drawn on.
//   · **Close** completes the minimal ortho path home (see `closePath`) — the
//     catch, made one-click, for the hand that would rather press a button.
//   · **Clicking a wall SAVES the outline first.** The elevation editor edits
//     `project.room` — doors, windows and slopes are the project's, not this
//     window's draft — so a wall that is not in the project has no elevation to
//     open. The room is written, then the wall opens; a guard refusal (a
//     cabinet standing where the wall would land) says so and opens nothing.

/** The canvas — twice the elevation's 560 × 300, which is what "2×" buys. */
const VIEW_W = 800;
const VIEW_H = 430;
const PAD = 44;
/** An empty canvas still needs a scale: four metres across, a room's worth. */
const VIEW_SPAN_MM = 4000;
/** The grid the drawing stands on, in millimetres. */
const GRID_MM = 500;
/** How near the pen has to be for the catch to bite, in drawing millimetres. */
const CATCH_MM = 250;

export default function DrawRoomModal({ anchor: anchorProp = null, onClose = null }) {
  const room = useProjectStore((s) => s.project.room);
  const setRoom = useProjectStore((s) => s.setRoom);
  const closeFromStore = useUiStore((s) => s.closeModal);
  const anchorFromStore = useUiStore((s) => s.modalArgs?.anchor) || null;
  const notify = useUiStore((s) => s.notify);
  const anchor = anchorProp || anchorFromStore;
  const closeModal = onClose || closeFromStore;

  const [path, setPath] = useState(() => newPath());
  const [dir, setDir] = useState('E');
  const [typed, setTyped] = useState('');
  const [cursor, setCursor] = useState(null);      // { x, y } in mm
  // ─── T69 F2 · THE INPUT THAT OPENS AT THE CLICK POINT ────────────────────
  // `null` while the hand is drawing; `{ px, py, dir }` once it has clicked —
  // the SVG-local pixel the click landed on, so the field opens THERE, and the
  // direction that click chose, which is frozen so a twitch of the mouse while
  // typing cannot turn the wall that is being measured.
  const [field, setField] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [wall, setWall] = useState(null);          // the elevation being edited
  const svgRef = useRef(null);
  const fieldRef = useRef(null);

  const pen = penOf(path);
  const closed = path.length > 3
    && Math.abs(path[0].x - pen.x) < 1e-6 && Math.abs(path[0].y - pen.y) < 1e-6;
  const catching = !closed && catchesStart(path, cursor, CATCH_MM);
  const corners = useMemo(() => cornersOfPath(path), [path]);
  const faults = useMemo(() => (closed ? pathFaults(path) : []), [closed, path]);

  // ── the picture's own arithmetic: mm → svg, one scale for both axes ──
  //
  // Framed on the PATH, and deliberately NOT on the cursor. Including the
  // cursor makes the frame follow the hand: the drawing re-scales on every
  // pointer move, the pen slides under the cursor, and the direction the pen
  // reads is not the direction the hand pointed at. The first browser walk of
  // this window drew "right" and got "away" for exactly that, three walls
  // running. A drawing that moves while you aim at it is not a drawing.
  const view = useMemo(() => {
    const b = pathBounds(path);
    const spanX = Math.max(b.width * 1.25, VIEW_SPAN_MM);
    const spanY = Math.max(b.depth * 1.25, VIEW_SPAN_MM * (VIEW_H / VIEW_W));
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    const scale = Math.min((VIEW_W - PAD * 2) / spanX, (VIEW_H - PAD * 2) / spanY);
    return {
      scale,
      sx: (x) => VIEW_W / 2 + (x - cx) * scale,
      sy: (y) => VIEW_H / 2 + (y - cy) * scale,
      mx: (px) => cx + (px - VIEW_W / 2) / scale,
      my: (py) => cy + (py - VIEW_H / 2) / scale,
      minX: cx - (VIEW_W / 2) / scale,
      maxX: cx + (VIEW_W / 2) / scale,
      minY: cy - (VIEW_H / 2) / scale,
      maxY: cy + (VIEW_H / 2) / scale,
    };
  }, [path]);

  const onMove = (e) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    const at = { x: view.mx(e.clientX - r.left), y: view.my(e.clientY - r.top) };
    setCursor(at);
    // T69 F2: while the FIELD is open the wall being measured is already
    // chosen. *"orientation never lost"* — a direction that kept turning under
    // a hand that has moved to the keyboard is exactly how it gets lost.
    if (field) return;
    if (!closed && pen) {
      const d = dirFromCursor(at.x - pen.x, at.y - pen.y);
      if (d && d.id !== dir) setDir(d.id);
    }
  };

  /**
   * ─── T69 F2 · WHAT THE CLICK DOES ────────────────────────────────────────
   *
   * *"click → a small input opens AT THE CLICK POINT, inside the canvas."*
   *
   * The catch still answers first, because a click on the origin is the close
   * and has been since T53. Otherwise the click FREEZES the direction the hand
   * was pointing and opens the field at the pixel it landed on, pre-filled with
   * the length the hand just drew — so Enter alone commits what is on screen
   * and a number typed over it commits that instead.
   */
  const onCanvasDown = (e) => {
    if (closed) return;
    if (catching && !typed.trim()) { close(); return; }
    const r = svgRef.current?.getBoundingClientRect();
    if (!r || !pen) return;
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    const at = { x: view.mx(px), y: view.my(py) };
    const d = dirFromCursor(at.x - pen.x, at.y - pen.y);
    if (!d) return;
    setDir(d.id);
    setTyped(String(Math.max(0, Math.round(Math.abs(d.dx ? at.x - pen.x : at.y - pen.y)))));
    setError(null);
    setField({ px, py, dir: d.id });
  };

  /** *"Escape lets go."* The field closes; the pen has not moved. */
  const letGo = useCallback(() => {
    setField(null);
    setTyped('');
    setError(null);
  }, []);

  /** Enter on a typed number: one wall, committed. */
  const commit = useCallback(() => {
    const res = addSegment(path, dir, Number(typed));
    if (res.error) { setError(res.error); return false; }
    setPath(res.path);
    setTyped('');
    setError(null);
    setSaved(false);
    // T69 F2: *"Enter → wall done, the next line starts, direction from the
    // mouse."*  Letting the field go is what starts the next line: `onMove` is
    // reading the cursor again the moment it is gone.
    setField(null);
    return true;
  }, [path, dir, typed]);

  const close = useCallback(() => {
    const res = closePath(path);
    if (res.error) { setError(res.error); return false; }
    setPath(res.path);
    setTyped('');
    setError(null);
    setSaved(false);
    return true;
  }, [path]);

  const undo = useCallback(() => {
    setPath((p) => undoSegment(p));
    setError(null);
    setSaved(false);
  }, []);

  /**
   * The room, written. Returns the guard's verdict so a caller that needs the
   * room to EXIST (the wall click) can tell whether it now does.
   */
  const save = useCallback(() => {
    const issues = pathFaults(path);
    if (issues.length) { setError(issues[0]); return { ok: false, message: issues[0] }; }
    const verdict = setRoom({ corners: cornersOfPath(path) });
    if (!verdict?.ok) {
      const message = verdict?.issues?.[0]?.message || verdict?.message
        || 'This outline cannot be applied — something in the room stands where a wall would go.';
      setError(message);
      notify(message, 'warn');
      return { ok: false, message };
    }
    setError(null);
    setSaved(true);
    notify(`Room drawn — ${cornersOfPath(path).length} walls.`, 'ok');
    return { ok: true };
  }, [path, setRoom, notify]);

  /** *"później klikamy na ścianę i się pokazuje ściana w pionie."* */
  const openWall = (index) => {
    if (!closed) return;
    const res = saved ? { ok: true } : save();
    if (!res.ok) return;
    setWall(index);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // The catch answers first: with the pen on the start point and nothing
      // typed, Enter is the CLOSE — *"ostatnią linię łapiesz i łączysz"*.
      if (catching && !typed.trim()) { close(); return; }
      commit();
      return;
    }
    // T69 F2 · *"Escape lets go."*
    if (e.key === 'Escape') { e.preventDefault(); letGo(); return; }
    if (e.key === 'Backspace' && !typed) {
      e.preventDefault();
      undo();
    }
  };

  // T69 F2: the field is not always there any more — it opens where the hand
  // clicked — so the focus follows it there, every time it opens. The eye never
  // has to find it: it is under the cursor.
  useEffect(() => { if (field) fieldRef.current?.focus(); }, [field]);

  // …and Escape reaches the drawing even when the hand has left the field.
  useEffect(() => {
    if (!field) return undefined;
    const onKey = (ev) => { if (ev.key === 'Escape') letGo(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [field, letGo]);

  // ─── ONE WINDOW AT A TIME (T45's rule: no window-over-window, ever) ───────
  if (wall !== null) {
    return (
      <WallElevationModal
        anchor={anchor}
        wallIndex={wall}
        onBack={() => setWall(null)}
        onSave={() => setWall(null)}
      />
    );
  }

  const grid = [];
  for (let g = Math.ceil(view.minX / GRID_MM) * GRID_MM; g <= view.maxX; g += GRID_MM) {
    grid.push(<line key={`gx${g}`} x1={view.sx(g)} y1={0} x2={view.sx(g)} y2={VIEW_H} stroke="#E7E1D8" strokeWidth={1} />);
  }
  for (let g = Math.ceil(view.minY / GRID_MM) * GRID_MM; g <= view.maxY; g += GRID_MM) {
    grid.push(<line key={`gy${g}`} x1={0} y1={view.sy(g)} x2={VIEW_W} y2={view.sy(g)} stroke="#E7E1D8" strokeWidth={1} />);
  }

  // ─── T69 F2 · THE LINE FOLLOWS THE MOUSE ─────────────────────────────────
  //
  // *"drag → a straight line follows (ortho: up/down/sides only)."*
  //
  // The typed number wins when there is one — that is the measurement the hand
  // is committing — and the CURSOR draws it the rest of the time, projected on
  // the chosen axis so the line is always square. Before tonight there was no
  // line at all until a number existed, which is a CAD window that shows you
  // nothing while you aim.
  const d = dirOf(dir);
  const reach = !closed && pen && d && cursor
    ? Math.max(0, Math.round(d.dx ? (cursor.x - pen.x) * d.dx : (cursor.y - pen.y) * d.dy))
    : 0;
  const ghostLen = Number(typed) > 0 ? Number(typed) : (field ? 0 : reach);
  const ghostTo = !closed && pen && d && ghostLen > 0
    ? { x: pen.x + d.dx * ghostLen, y: pen.y + d.dy * ghostLen }
    : null;

  const savedWalls = roomWalls(migrateRoom(room));

  return (
    <Modal
      name="draw-room"
      title="Draw room"
      anchor={anchor}
      onClose={closeModal}
      width="pbi-re-w1160"
      footer={(
        <>
          <button
            type="button"
            className="pbi-re-btn"
            data-draw-undo="1"
            disabled={path.length < 2}
            onClick={undo}
          >
            Undo wall
          </button>
          <button
            type="button"
            className="pbi-re-btn"
            data-draw-close="1"
            disabled={closed || path.length < 3}
            title="Finish the room with the shortest square path back to the start."
            onClick={close}
          >
            Close
          </button>
          <button
            type="button"
            className="pbi-re-btn-gold"
            data-draw-save="1"
            disabled={!closed || faults.length > 0}
            onClick={() => { if (save().ok) closeModal(); }}
          >
            Save room
          </button>
        </>
      )}
    >
      <div className="pbi-re-row pbi-re-gap-4" data-draw-room="1" data-draw-closed={closed ? '1' : '0'}>
        {/* ── the drawing ──
            T69 F2: the SVG is wrapped so the length field can stand ON it, at
            the pixel the hand clicked. The wrapper carries no size of its own —
            it is the canvas's own box and nothing else — so the drawing is the
            width it always was and the field's coordinates are the SVG's. */}
        <div className="pbi-re-rel" data-draw-canvas-wrap="1">
        <svg
          ref={svgRef}
          width={VIEW_W}
          height={VIEW_H}
          className="pbi-re-fill-ground pbi-re-line pbi-re-hair pbi-re-round pbi-re-notouch"
          data-draw-canvas="1"
          onPointerMove={onMove}
          onPointerLeave={() => setCursor(null)}
          onPointerDown={onCanvasDown}
        >
          {grid}

          {/* the walls, in the order they were drawn */}
          {path.slice(0, -1).map((a, i) => {
            const b = path[i + 1];
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            const len = Math.hypot(b.x - a.x, b.y - a.y);
            return (
              <g key={`w${i}`}>
                <line
                  x1={view.sx(a.x)} y1={view.sy(a.y)} x2={view.sx(b.x)} y2={view.sy(b.y)}
                  stroke="#090A09" strokeWidth={2.5} strokeLinecap="square"
                />
                {/* the hit area: a wall is 2.5 px of ink and a hand is not */}
                {closed ? (
                  <line
                    x1={view.sx(a.x)} y1={view.sy(a.y)} x2={view.sx(b.x)} y2={view.sy(b.y)}
                    stroke="transparent" strokeWidth={16} style={{ cursor: 'pointer' }}
                    data-draw-wall={i}
                    onClick={() => openWall(i)}
                  >
                    <title>{`Wall ${i + 1} — ${formatMm(len)} mm · click for the elevation`}</title>
                  </line>
                ) : null}
                <text
                  x={view.sx(mid.x) + 6} y={view.sy(mid.y) - 6}
                  fill="#5C5B57" fontSize={11}
                >
                  {formatMm(len)}
                </text>
              </g>
            );
          })}

          {/* the ghost — dashed, and carrying the number as it is typed */}
          {ghostTo ? (
            <g data-draw-ghost="1">
              <line
                x1={view.sx(pen.x)} y1={view.sy(pen.y)} x2={view.sx(ghostTo.x)} y2={view.sy(ghostTo.y)}
                stroke="#806A44" strokeWidth={2} strokeDasharray="7 5"
              />
              <text
                x={view.sx((pen.x + ghostTo.x) / 2) + 6} y={view.sy((pen.y + ghostTo.y) / 2) + 16}
                fill="#806A44" fontSize={11}
              >
                {formatMm(ghostLen)}{Number(typed) > 0 ? ' …typing' : ' …drag'}
              </text>
            </g>
          ) : null}

          {/* the pen, and the direction it is pointed */}
          {!closed && pen ? (
            <g data-draw-pen={`${pen.x},${pen.y}`}>
              <line
                x1={view.sx(pen.x) - 7} y1={view.sy(pen.y)} x2={view.sx(pen.x) + 7} y2={view.sy(pen.y)}
                stroke="#806A44" strokeWidth={1.5}
              />
              <line
                x1={view.sx(pen.x)} y1={view.sy(pen.y) - 7} x2={view.sx(pen.x)} y2={view.sy(pen.y) + 7}
                stroke="#806A44" strokeWidth={1.5}
              />
              <text x={view.sx(pen.x) - 4} y={view.sy(pen.y) + 26} fill="#5C5B57" fontSize={11}>
                {DIRS.find((v) => v.id === dir)?.label} (ortho)
              </text>
            </g>
          ) : null}

          {/* the origin, and the catch when the pen comes home */}
          <circle
            cx={view.sx(path[0].x)} cy={view.sy(path[0].y)} r={catching ? 9 : 4}
            fill={catching ? '#806A44' : 'none'} stroke="#806A44" strokeWidth={1.5}
            data-draw-catch={catching ? '1' : '0'}
          />
          <text x={view.sx(path[0].x) - 22} y={view.sy(path[0].y) + 20} fill="#5C5B57" fontSize={11}>
            0,0
          </text>
          {catching ? (
            <text x={view.sx(path[0].x) - 6} y={view.sy(path[0].y) - 16} fill="#806A44" fontSize={11}>
              catch — Enter closes the room
            </text>
          ) : null}
        </svg>

          {/* ─── T69 F2 · THE INPUT, AT THE CLICK POINT ────────────────────
              *"click → a small input opens AT THE CLICK POINT, inside the
              canvas — never leave the drawing, orientation never lost."*

              It is an HTML input over the SVG rather than a `foreignObject`
              inside it: a foreignObject inherits the drawing's own scaling, so
              the field would grow and shrink with the room. This one is 92 px
              whatever the room measures, which is what a field is.

              It is nudged 10 px up and left of the click so the cursor is not
              standing on its own text, and clamped to the canvas so a click at
              the far edge does not open a field half outside the drawing. */}
          {field ? (
            <div
              className="pbi-re-abs"
              data-draw-field="1"
              data-draw-field-at={`${Math.round(field.px)},${Math.round(field.py)}`}
              data-draw-field-dir={field.dir}
              style={{
                left: Math.min(Math.max(field.px - 10, 4), VIEW_W - 100),
                top: Math.min(Math.max(field.py - 10, 4), VIEW_H - 34),
              }}
            >
              <input
                ref={fieldRef}
                type="number"
                inputMode="numeric"
                className="pbi-re-input pbi-re-w120 pbi-re-right"
                data-draw-length="1"
                value={typed}
                placeholder="mm"
                aria-label={`Wall length, ${DIRS.find((v) => v.id === field.dir)?.label}`}
                onChange={(e) => { setTyped(e.target.value); setError(null); }}
                onKeyDown={onKeyDown}
              />
            </div>
          ) : null}
        </div>

        {/* ── the hand's side ── */}
        <div className="pbi-re-w280 pbi-re-stack-3">
          <p className="pbi-re-t11 pbi-re-lead-snug pbi-re-quiet">
            Move the cursor and the wall follows it — up, down or sideways, never at an angle.
            <b className="pbi-re-ink-1"> Click</b> where it should end and type the millimetres
            right there; <b className="pbi-re-ink-1">Enter</b> draws it and the next wall starts
            from the cursor. <b className="pbi-re-ink-1">Esc</b> lets go, Backspace takes the last
            wall off. The shortest wall this app will draw is {formatMm(MIN_SEGMENT_MM)} mm.
          </p>

          <div className="pbi-re-line-t pbi-re-hair-soft pbi-re-pt2" data-draw-list="1">
            {path.length < 2 ? (
              <p className="pbi-re-t11 pbi-re-ink-3">No walls yet — the pen is at 0,0.</p>
            ) : path.slice(0, -1).map((a, i) => {
              const b = path[i + 1];
              const len = Math.hypot(b.x - a.x, b.y - a.y);
              const label = DIRS.find((v) => v.dx === Math.sign(b.x - a.x) && v.dy === Math.sign(b.y - a.y))?.label;
              return (
                <div key={`r${i}`} className="pbi-re-fieldrow pbi-re-py05 pbi-re-tsm">
                  <span className="pbi-re-grow pbi-re-ink-3">{i + 1} · {label}</span>
                  <span className="pbi-re-ink-1">{formatMm(len)} mm</span>
                  {closed ? (
                    <button
                      type="button"
                      className="pbi-re-btn-ghost pbi-re-px1 pbi-re-t11"
                      data-draw-wall-row={i}
                      title="Open this wall's elevation — windows, doors and slopes"
                      onClick={() => openWall(i)}
                    >
                      Elevation…
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          {closed ? (
            <p className="pbi-re-t11 pbi-re-ok" data-draw-state="closed">
              The room is closed — {corners.length} walls.
              {saved ? ' Saved.' : ' Click a wall for its elevation, or Save room.'}
            </p>
          ) : (
            <p className="pbi-re-t11 pbi-re-warn" data-draw-state="open">
              The room is always closed — the last wall is caught to the first.
            </p>
          )}

          {faults.length ? (
            <ul className="pbi-re-stack-05 pbi-re-t11 pbi-re-warn" data-draw-faults={faults.length}>
              {faults.map((f) => <li key={f}>{f}</li>)}
            </ul>
          ) : null}

          {error && !faults.includes(error) ? (
            <p className="pbi-re-t11 pbi-re-warn" data-draw-error="1">{error}</p>
          ) : null}

          {savedWalls.length && !closed ? (
            <p className="pbi-re-t11 pbi-re-ink-3">
              The project’s room has {savedWalls.length} walls today. Saving replaces it.
            </p>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
