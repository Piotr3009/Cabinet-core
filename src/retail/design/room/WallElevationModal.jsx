import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from './Modal.jsx';
import NumberField from './NumberField.jsx';
import { useProjectStore } from '../../../stores/projectStore.js';
import { useUiStore } from '../../../stores/uiStore.js';
import {
  migrateRoom, roomWalls, setWallLength as setWallLengthCorners, clampOpening, OPENING_DEFAULTS,
} from '../../../engine/room.js';
import { formatMm, snap } from '../../../engine/format.js';
import { migrateDesign } from '../../../engine/design.js';
import { projectDepth } from '../../../engine/projectSettings.js';
import { getCabinetProfile } from '../../../engine/profile.js';
import {
  CHIMNEY_DEFAULTS, MIN_ELEMENT_MM, PLAN_DEFAULTS, RECESS_DEFAULTS, SLOPE_DEFAULTS,
  clampPlanElement, dragSlope, elevationDimensionChains, elevationElements, moveOpening,
  movePlanElement, newElementId, planElementsOnWall, slopePolygon, slopesOnWall, wallElevationIssues,
  wallElements as normaliseWallElements, wallSlopes as normaliseSlopes,
} from '../../../lib/wallElements.js';
// ─── TURN 49 (CLAUDE.md F8): THE DIALOG'S OWN ARITHMETIC ────────────────────
// `flat + run = wall width`, and the rule about when Flat is asked at all. Pure
// functions in a lib, so a node test can hold the dialog to its word — nothing
// about `ceilingAt`, the cut line or the engine is involved.
import {
  TWO_SLOPES_NOTE, flatFieldShown, flatFromRun, runFromFlat,
} from '../../../lib/slopeFlat.js';

// ─── THE WALL, AND IT GETS A FACE (turn 44, CLAUDE.md F1) ───────────────────
//
// The owner, 23.08.2026: *"One wall is the FIRST card and the default focus"* —
// and choosing it opens THIS, not the plan. A plan is what you draw a room in;
// a single wall is what a joiner tapes out, and what he tapes out is an
// ELEVATION: the wall seen from the front, with the window where the window is
// and the ceiling coming down where the ceiling comes down.
//
// Two fields — width and height — and the picture redraws as they are typed.
// Three buttons down the right-hand side, styled rather than bare, because
// "Add door" is a tool and a tool that looks like a link is a tool nobody
// presses. Everything on the wall can be dragged, and double-clicking one opens
// its own small window BESIDE it (rule 15, and this turn's rule 4).
//
// ─── WHERE IT IS STORED (F1: "ONE wall schema, no twin") ────────────────────
//
// Doors and windows are `room.openings` — the same records the Room editor has
// written since turn 3, clamped by the same `clampOpening`, on the same wall
// index. Not a copy of them: THEM. A slope is the one element the room schema
// has never carried, and iron rule 2 shuts `src/engine/**` for the night, so it
// rides the project beside the room and is keyed by the same wall index
// (`lib/wallElements.js` has the whole argument, and the store's
// `setWallSlopes` repeats it).

const VIEW_W = 560;
const VIEW_H = 300;
// T45 F1a: the chains live OUTSIDE the wall, so the drawing needs room round it.
// 26 px was the frame a bare rectangle wanted; a rectangle with two chains on
// every side wants the room for the numbers as well.
const PAD = 46;

// ─── TURN 45 (CLAUDE.md F1b): THE TOP VIEW'S OWN DEPTH WINDOW ───────────────
// How much wall-depth the plan draws, in mm, before anything is placed on it.
// The DEPTH ZONE — the band a cabinet stands in — is the project's own depth,
// read from the design; this is only how far the picture sees past it.
const PLAN_DEPTH_MM = 1200;
/** The line of type that names a recess, in pixels — it is drawn above it. */
const PLAN_LABEL_PX = 13;

/**
 * @param {object} props
 *   wallIndex  which wall this is the face of — 0 in a one-wall job
 *   anchor     where it opens BESIDE (rule 15)
 *   onBack     ← the scope step, WITHOUT losing the wall
 *   onSave     the green button: the wizard goes on to Project settings
 */
export default function WallElevationModal({
  wallIndex = 0, anchor = null, onBack = null, onSave = null,
}) {
  const room = useProjectStore((s) => s.project.room);
  // T45 F1b: the DEPTH ZONE the plan draws is the project's own unit depth, so
  // a 300 mm recess and a 568 mm carcass are read against each other rather
  // than in the abstract. Read, never written — the engine ignores the plan
  // elements this turn, and this reads the number it already publishes.
  const storedDesign = useProjectStore((s) => s.project.design);
  const storedSlopes = useProjectStore((s) => s.project.wallSlopes);
  const setRoom = useProjectStore((s) => s.setRoom);
  const setWallSlopes = useProjectStore((s) => s.setWallSlopes);
  const notify = useUiStore((s) => s.notify);

  const draft = useMemo(() => migrateRoom(room), [room]);
  // T45 F1b: ONE list, three kinds. `slopes` is the elevation's slice of it and
  // `plan` is the top view's; every write goes back through `all`, so editing a
  // slope in the front view cannot drop a chimney the top view put there.
  const all = useMemo(() => normaliseWallElements(storedSlopes), [storedSlopes]);
  const slopes = useMemo(() => normaliseSlopes(storedSlopes), [storedSlopes]);
  // T49 F8: the slopes of THIS wall, which is what decides whether the Flat
  // field has one meaning. `slopesOnWall` is the reader `elevationElements` and
  // the dimension chains already use, so there is no second answer to "how many
  // slopes has this wall".
  const slopesHere = useMemo(() => slopesOnWall(storedSlopes, wallIndex), [storedSlopes, wallIndex]);
  const plan = useMemo(() => planElementsOnWall(storedSlopes, wallIndex), [storedSlopes, wallIndex]);
  const walls = useMemo(() => roomWalls(draft), [draft]);
  const wall = walls[wallIndex] || walls[0] || null;
  const wallWidth = wall?.width || 0;
  const wallHeight = Number(draft.height) || 0;

  const grid = (v) => snap(v, getCabinetProfile().editor.mmStep);
  const unitDepth = useMemo(
    () => projectDepth(migrateDesign(storedDesign), getCabinetProfile()),
    [storedDesign],
  );

  const elements = useMemo(() => elevationElements({
    openings: draft.openings, slopes, wallIndex, wallWidth, wallHeight,
  }), [draft.openings, slopes, wallIndex, wallWidth, wallHeight]);

  const issues = wallElevationIssues({ wallWidth, wallHeight });

  // ── the picture's own arithmetic: mm → svg, one scale for both axes ──
  const scale = Math.min(
    (VIEW_W - PAD * 2) / Math.max(wallWidth, 1),
    (VIEW_H - PAD * 2) / Math.max(wallHeight, 1),
  );
  const sx = (xMm) => PAD + xMm * scale;
  // y is measured UP from the floor; SVG's is down from the top.
  const sy = (yMm) => PAD + (wallHeight - yMm) * scale;

  const [picked, setPicked] = useState(null);   // element id
  const [editing, setEditing] = useState(null); // { id, kind, anchor }
  // ─── TURN 45 (CLAUDE.md F1b): FRONT / TOP ─────────────────────────────────
  // *"A `Front / Top` switch in the wall modal."* One window, two drawings of
  // the same wall, one list behind both — a hand that adds a chimney in the top
  // view and then flips to Front is looking at the same wall it just changed.
  const [view, setView] = useState('front');
  const svgRef = useRef(null);

  // ─── TURN 45 (CLAUDE.md F1a): THE CHAINS, RECOMPUTED ON EVERY RENDER ──────
  // *"They follow every drag live."* Which is free, and deliberately so: a drag
  // writes the store, the store re-renders this component, and the chains are a
  // pure function of the numbers it was just handed. There is no second copy of
  // the geometry that could forget to move.
  const chains = useMemo(() => elevationDimensionChains({
    wallWidth, wallHeight, slopes, wallIndex,
  }), [wallWidth, wallHeight, slopes, wallIndex]);

  // ── the TOP view's own arithmetic: x along the wall, y OUT from it ──
  // Two budgets, not one: a CHIMNEY stands into the room and is drawn BELOW the
  // wall line, a RECESS bites backwards and is drawn ABOVE it. Measuring both
  // against the same downward budget is what put the first recess's label off
  // the top of the canvas — 300 mm of bite had 46 px of paper to be drawn on.
  const planBelow = Math.max(
    PLAN_DEPTH_MM,
    ...plan.filter((el) => el.kind !== 'recess').map((el) => el.depth + 200),
    0,
  );
  const planAbove = Math.max(0, ...plan.filter((el) => el.kind === 'recess').map((el) => el.depth));
  const planScale = Math.min(
    (VIEW_W - PAD * 2) / Math.max(wallWidth, 1),
    (VIEW_H - PAD * 2) / Math.max(planBelow + planAbove, 1),
  );
  const px = (xMm) => PAD + xMm * planScale;
  // The wall LINE is at the top of the plan and the room is below it, which is
  // how a joiner draws it: he stands in the room, looking at the wall. It moves
  // DOWN the paper by however deep the deepest recess is, plus the line of type
  // that names it — and with nothing biting the wall it is at PAD, exactly
  // where it has been since this view was drawn.
  const wallY = PAD + planAbove * planScale + (planAbove > 0 ? PLAN_LABEL_PX : 0);
  const py = (dMm) => wallY + dMm * planScale;

  // ── writing back ──
  const patchRoom = (patch) => {
    const verdict = setRoom(patch);
    if (verdict && verdict.ok === false) notify(verdict.message, 'error');
    return verdict;
  };

  const setWidth = (mm) => {
    const want = Math.max(100, Number(mm) || 0);
    patchRoom({
      corners: setWallLengthCorners(draft, wallIndex, want).map((c) => ({ x: grid(c.x), y: grid(c.y) })),
    });
  };
  const setHeight = (mm) => patchRoom({ height: Math.max(100, Number(mm) || 0) });

  const openingsOf = () => (draft.openings || []);

  const addOpening = (kind) => {
    const d = OPENING_DEFAULTS[kind];
    const opening = clampOpening({
      id: newElementId('op'),
      kind,
      wall: wallIndex,
      x_mm: Math.max(0, wallWidth / 2 - d.width / 2),
      ...d,
    }, draft);
    patchRoom({ openings: [...openingsOf(), opening] });
    setPicked(opening.id);
  };

  // ─── CHAT-FIX 25.08.2026: THE SIDE IS THE BUTTON ─────────────────────────
  //
  // The owner: *"jak dodajesz skos to nawet sie nie domyslilem ze trzeba
  // nacisnac 2 razy zeby dodac drugi skos — powinien byc przycisk lewy i prawy
  // skos."* One "Add slope" that always landed on the SAME default side made
  // the second slope invisible: press it twice and the second one arrives on
  // top of the first, so nothing appears to happen. The side moves into the
  // button, where it can be seen before it is pressed.
  //
  // A side that already carries a slope offers nothing to add: that button is
  // disabled and says why, rather than silently stacking a second one.
  const addSlope = (side = SLOPE_DEFAULTS.side) => {
    const slope = {
      id: newElementId('slope'),
      kind: 'slope',
      wall: wallIndex,
      side,
      startHeight: Math.min(SLOPE_DEFAULTS.startHeight, Math.max(0, wallHeight - 200)),
      run: Math.min(SLOPE_DEFAULTS.run, Math.max(0, wallWidth / 2)),
    };
    setWallSlopes([...all, slope]);
    setPicked(slope.id);
  };
  const hasSlopeOn = (side) => slopes.some((s) => s.side === side);

  // ─── TURN 45 (CLAUDE.md F1b): THE TWO THE TOP VIEW ADDS ───────────────────
  //
  // *"two NEW draggable elements — `Recess` and `Chimney` (rectangles with
  // width + depth, double-click for numbers). Stored on the same wall model.
  // Engine ignores them this turn — they are geometry for the eye and for
  // future unit clamping."*
  const addPlanElement = (kind) => {
    const d = PLAN_DEFAULTS[kind];
    const el = clampPlanElement({
      id: newElementId(kind),
      kind,
      wall: wallIndex,
      x_mm: Math.max(0, wallWidth / 2 - d.width / 2),
      ...d,
    }, { wallWidth });
    if (!el) return;
    setWallSlopes([...all, el]);
    setPicked(el.id);
    setView('top');
  };

  const updateOpening = (id, patch) => patchRoom({
    openings: openingsOf().map((o) => (o.id === id ? clampOpening({ ...o, ...patch }, draft) : o)),
  });
  const removeOpening = (id) => patchRoom({ openings: openingsOf().filter((o) => o.id !== id) });

  // Every write goes through the WHOLE list (T45 F1b): a slope edited in the
  // front view must not take the top view's chimneys with it.
  const updateElement = (id, patch) => setWallSlopes(
    all.map((el) => (el.id === id ? { ...el, ...patch, id } : el)),
  );
  const removeStoredElement = (id) => setWallSlopes(all.filter((el) => el.id !== id));
  const updateSlope = updateElement;
  const removeSlope = removeStoredElement;

  const removeElement = (id, kind) => {
    if (kind === 'slope' || kind === 'recess' || kind === 'chimney') removeStoredElement(id);
    else removeOpening(id);
    setPicked((p) => (p === id ? null : p));
    setEditing((e) => (e?.id === id ? null : e));
  };

  // ── dragging on the wall (real pointer, one absolute move from where it started) ──
  //
  // The listeners go on the WINDOW rather than on the SVG, and the pointer is
  // deliberately NOT captured. Capture retargets every later event to the
  // element that took it, which means the second click of a double-click never
  // reaches the shape — and double-click is how an element opens its own
  // window (F1). Window listeners give the drag the same reach capture would
  // (the hand may leave the picture) without stealing the gesture that follows.
  //
  // The move is ABSOLUTE from where the hand went down, so a hundred small
  // events are one move and nothing accumulates rounding. `draftRef` is what
  // keeps that honest across re-renders: the record the drag started from is
  // held in the closure, and the room it is written back into is always the
  // current one.
  const draftRef = useRef(draft);
  useEffect(() => { draftRef.current = draft; }, [draft]);

  /**
   * Dragging in the TOP view (T45 F1b).
   *
   * Sideways moves the element along the wall; up and down changes its DEPTH,
   * which is the axis the elevation does not have and the reason this view
   * exists. Same gesture rules as the elevation's: window listeners, no pointer
   * capture, one absolute move from where the hand went down.
   */
  const startPlanDrag = (e, el) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setPicked(el.id);
    const from = { x: e.clientX, y: e.clientY };
    const start = plan.find((v) => v.id === el.id) || null;
    const move = (ev) => {
      if (!planScale || !start) return;
      const dx = grid((ev.clientX - from.x) / planScale);
      const dd = grid((ev.clientY - from.y) / planScale);
      if (!dx && !dd) return;
      const patch = movePlanElement(start, { dxMm: dx, ddMm: dd }, { wallWidth });
      setWallSlopes(normaliseWallElements(useProjectStore.getState().project.wallSlopes)
        .map((v) => (v.id === el.id ? { ...v, ...patch } : v)));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const startDrag = (e, el) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setPicked(el.id);
    const from = { x: e.clientX, y: e.clientY };
    const opening = el.kind === 'slope'
      ? null
      : (draftRef.current.openings || []).find((o) => o.id === el.id) || null;
    const slope = el.kind === 'slope' ? slopes.find((v) => v.id === el.id) || null : null;

    const move = (ev) => {
      if (!scale) return;
      const dx = grid((ev.clientX - from.x) / scale);
      // Screen-down is wall-DOWN, so the sill moves the other way.
      const dy = grid(-(ev.clientY - from.y) / scale);
      if (!dx && !dy) return;
      if (el.kind === 'slope') {
        if (!slope) return;
        const next = dragSlope(slope, dx, { wallWidth, wallHeight });
        if (next) {
          setWallSlopes(normaliseWallElements(useProjectStore.getState().project.wallSlopes)
            .map((v) => (v.id === el.id ? { ...v, run: next.run } : v)));
        }
        return;
      }
      if (!opening) return;
      const patch = moveOpening(opening, { dxMm: dx, dyMm: dy }, { wallWidth, wallHeight });
      const room = draftRef.current;
      setRoom({
        openings: (room.openings || []).map((o) => (o.id === el.id
          ? clampOpening({ ...o, ...patch }, room)
          : o)),
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  /** Where a small modal opens: BESIDE the element it is about (rule 15). */
  const anchorOfElement = (id) => {
    const node = svgRef.current?.querySelector(`[data-elevation-element="${id}"]`);
    const r = node?.getBoundingClientRect();
    return r ? {
      x: r.left, y: r.top, width: r.width, height: r.height,
    } : anchor;
  };

  const openElement = (el) => setEditing({ id: el.id, kind: el.kind, anchor: anchorOfElement(el.id) });

  // What this VIEW is a list of: the elevation's own elements, or the plan's.
  const onThisWall = view === 'front' ? elements : plan;
  const editingElement = editing
    ? onThisWall.find((el) => el.id === editing.id) || null
    : null;

  return (
    <>
      <Modal
        name="wall-elevation"
        title="One wall — the elevation"
        anchor={anchor}
        width="pbi-re-w820"
        onClose={onBack || undefined}
        onBack={onBack || undefined}
        backLabel="scope step"
        footer={(
          <>
            <button type="button" className="pbi-re-btn" data-elevation-back="1" onClick={onBack}>Back</button>
            {/* GREEN, and the only green thing in the window: it is what
                finishes the wall and takes the wizard on (F1). */}
            <button
              type="button"
              className="pbi-re-btn pbi-re-hair-ok pbi-re-ok pbi-re-fill-ok-hover"
              data-elevation-save="1"
              disabled={issues.length > 0}
              title={issues[0] || 'Save this wall and go on to Project settings'}
              onClick={() => onSave?.()}
            >
              Save
            </button>
          </>
        )}
      >
        <div className="pbi-re-stack-3" data-wall-elevation="1" data-wall-view={view}>
          {/* ─── TURN 45 (CLAUDE.md F1b): FRONT / TOP ───────────────────────
              *"A `Front / Top` switch in the wall modal."* Two drawings of ONE
              wall, over one list: what the top view adds — a recess, a chimney
              — is on the same wall the front view is drawing, and flipping back
              shows a wall that has just changed. */}
          <div className="pbi-re-fieldrow" data-wall-view-switch="1">
            {[['front', 'Front', 'The wall seen from the front — the elevation'],
              ['top', 'Top', 'The wall seen from above — the plan']].map(([id, label, hint]) => (
                <button
                  key={id}
                  type="button"
                  title={hint}
                  data-wall-view-option={id}
                  aria-pressed={view === id}
                  className={`pbi-re-btn pbi-re-px3 ${view === id ? 'pbi-re-hair-gold pbi-re-gold' : ''}`}
                  onClick={() => setView(id)}
                >
                  {label}
                </button>
            ))}
            <span className="pbi-re-grow" />
            <span className="pbi-re-t10 pbi-re-quiet">
              {formatMm(wallWidth)} × {formatMm(wallHeight)} mm
            </span>
          </div>

          <p className="pbi-re-t11 pbi-re-quiet">
            {view === 'front'
              ? 'The wall seen from the front. Type its width and height and the drawing follows; drop a door, a'
                + ' window or a slope on it and drag it where it is. Double-click one to type its numbers.'
              : 'The wall seen from above. The depth zone is where the units will stand; drop a recess or a'
                + ' chimney on it and drag it — sideways along the wall, up and down for its depth.'}
          </p>

          <div className="pbi-re-grid pbi-re-grid-plan pbi-re-gap-3">
            {/* ── the elevation ── */}
            <div>
              <div className="pbi-re-grid pbi-re-grid-2 pbi-re-gap-3 pbi-re-mb2">
                <label className="pbi-re-block">
                  <span className="pbi-re-fieldlabel">Wall width (mm)</span>
                  <NumberField
                    value={wallWidth}
                    min={100}
                    data-wall-width="1"
                    onCommit={setWidth}
                  />
                </label>
                <label className="pbi-re-block">
                  <span className="pbi-re-fieldlabel">Wall height (mm)</span>
                  <NumberField
                    value={wallHeight}
                    min={100}
                    data-wall-height="1"
                    onCommit={setHeight}
                  />
                </label>
              </div>

              {view === 'front' && (
              <svg
                ref={svgRef}
                width={VIEW_W}
                height={VIEW_H}
                className="pbi-re-fill-ground pbi-re-line pbi-re-hair pbi-re-round pbi-re-notouch pbi-re-noselect"
                data-wall-elevation-svg="1"
                onPointerDown={() => setPicked(null)}
              >
                {/* ─── T45 F1a: THE DIMENSION CHAINS, AS HIS RED PEN ────────
                    Four chains, one per edge, each broken where the wall is.
                    The arithmetic is `lib/wallElements.js`'s, so this draws
                    numbers it did not work out and cannot disagree with. */}
                {chains.top.map((d, i) => (
                  <DimLine
                    key={d.id}
                    kind="top"
                    x1={sx(d.from)} x2={sx(d.to)}
                    y={PAD - 12 - i * 15}
                    mm={d.mm}
                    label={d.label}
                    id={d.id}
                  />
                ))}
                {chains.bottom.map((d) => (
                  <DimLine
                    key={d.id}
                    kind="bottom"
                    x1={sx(d.from)} x2={sx(d.to)}
                    y={sy(0) + 22}
                    mm={d.mm}
                    label={d.label}
                    id={d.id}
                  />
                ))}
                {chains.left.map((d) => (
                  <DimLine
                    key={d.id}
                    kind="left"
                    y1={sy(d.from)} y2={sy(d.to)}
                    x={PAD - 14}
                    mm={d.mm}
                    label={d.label}
                    id={d.id}
                  />
                ))}
                {chains.right.map((d) => (
                  <DimLine
                    key={d.id}
                    kind="right"
                    y1={sy(d.from)} y2={sy(d.to)}
                    x={sx(wallWidth) + 14}
                    mm={d.mm}
                    label={d.label}
                    id={d.id}
                  />
                ))}

                {/* the floor line, and the wall itself */}
                <rect
                  x={sx(0)} y={sy(wallHeight)}
                  width={Math.max(0, wallWidth * scale)} height={Math.max(0, wallHeight * scale)}
                  fill="#E7E1D8" stroke="#090A09" strokeWidth="1.5"
                  data-elevation-wall="1"
                />
                <line
                  x1={sx(0) - 10} y1={sy(0)} x2={sx(wallWidth) + 10} y2={sy(0)}
                  stroke="#C7BCAF" strokeWidth="2"
                />

                {elements.map((el) => {
                  const on = picked === el.id;
                  if (el.kind === 'slope') {
                    const pts = slopePolygon(el, { wallWidth, wallHeight })
                      .map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ');
                    return (
                      <polygon
                        key={el.id}
                        points={pts}
                        fill="#FAF8F3"
                        stroke={on ? '#806A44' : '#5C5B57'}
                        strokeWidth={on ? 2.5 : 1.5}
                        className="pbi-re-ew"
                        data-elevation-element={el.id}
                        data-elevation-kind="slope"
                        onPointerDown={(e) => startDrag(e, el)}
                        onDoubleClick={() => openElement(el)}
                      />
                    );
                  }
                  const isDoor = el.kind === 'door';
                  return (
                    <g key={el.id}>
                      <rect
                        x={sx(el.x)} y={sy(el.y + el.h)}
                        width={Math.max(1, el.w * scale)} height={Math.max(1, el.h * scale)}
                        fill={isDoor ? '#D9D1C6' : '#F2EEE7'}
                        stroke={on ? '#806A44' : (isDoor ? '#090A09' : '#5C5B57')}
                        strokeWidth={on ? 2.5 : 1.5}
                        className={isDoor ? 'pbi-re-ew' : 'pbi-re-grab'}
                        data-elevation-element={el.id}
                        data-elevation-kind={el.kind}
                        onPointerDown={(e) => startDrag(e, el)}
                        onDoubleClick={() => openElement(el)}
                      />
                      <text
                        x={sx(el.x + el.w / 2)} y={sy(el.y + el.h) - 4}
                        textAnchor="middle" fontSize="9" fill="#090A09"
                        className="pbi-re-noptr"
                      >
                        {isDoor ? 'door' : 'window'} {formatMm(el.w)}×{formatMm(el.h)}
                      </text>
                    </g>
                  );
                })}
              </svg>
              )}

              {/* ─── TURN 45 (CLAUDE.md F1b): THE WALL FROM ABOVE ───────────
                  *"Top = the wall seen from above: wall line, depth zone, and
                  two NEW draggable elements — Recess and Chimney."*

                  The wall LINE is at the top and the room is below it, because
                  that is where the joiner is standing. The DEPTH ZONE is the
                  band a unit occupies — the project's own depth, drawn so a
                  recess 300 deep and a cabinet 568 deep are read against each
                  other rather than in the abstract. */}
              {view === 'top' && (
              <svg
                ref={svgRef}
                width={VIEW_W}
                height={VIEW_H}
                className="pbi-re-fill-ground pbi-re-line pbi-re-hair pbi-re-round pbi-re-notouch pbi-re-noselect"
                data-wall-plan-svg="1"
                onPointerDown={() => setPicked(null)}
              >
                {/* the DEPTH ZONE — where the units will stand */}
                <rect
                  x={px(0)} y={py(0)}
                  width={Math.max(0, wallWidth * planScale)}
                  height={Math.max(0, unitDepth * planScale)}
                  fill="#E7E1D8" stroke="#C7BCAF" strokeWidth="1" strokeDasharray="4 3"
                  data-plan-depth-zone={unitDepth}
                />
                <text
                  x={px(0) + 6} y={py(unitDepth) - 6}
                  fontSize="9" fill="#5C5B57" className="pbi-re-noptr"
                >
                  depth zone · {formatMm(unitDepth)} mm
                </text>

                {/* the WALL LINE itself, and the two ends of it */}
                <line
                  x1={px(0)} y1={py(0)} x2={px(wallWidth)} y2={py(0)}
                  stroke="#090A09" strokeWidth="3"
                  data-plan-wall-line="1"
                />
                <line x1={px(0)} y1={py(0) - 8} x2={px(0)} y2={py(0) + 8} stroke="#C7BCAF" strokeWidth="1.5" />
                <line
                  x1={px(wallWidth)} y1={py(0) - 8} x2={px(wallWidth)} y2={py(0) + 8}
                  stroke="#C7BCAF" strokeWidth="1.5"
                />
                <DimLine
                  kind="top"
                  x1={px(0)} x2={px(wallWidth)}
                  y={PAD - 14}
                  mm={wallWidth}
                  label="wall width"
                  id="plan-width"
                />

                {plan.map((el) => {
                  const on = picked === el.id;
                  // A RECESS is a bite out of the wall — it is drawn ABOVE the
                  // wall line, going away from the room. A CHIMNEY stands proud
                  // of it, into the room, which is where a cabinet meets it.
                  const isRecess = el.kind === 'recess';
                  const h = Math.max(1, el.depth * planScale);
                  return (
                    <g key={el.id}>
                      <rect
                        x={px(el.x_mm)} y={isRecess ? py(0) - h : py(0)}
                        width={Math.max(1, el.width * planScale)} height={h}
                        fill={isRecess ? '#F2EEE7' : '#D9D1C6'}
                        stroke={on ? '#806A44' : (isRecess ? '#5C5B57' : '#090A09')}
                        strokeWidth={on ? 2.5 : 1.5}
                        className="pbi-re-grab"
                        data-plan-element={el.id}
                        data-plan-kind={el.kind}
                        onPointerDown={(e) => startPlanDrag(e, el)}
                        onDoubleClick={() => openElement(el)}
                      />
                      <text
                        x={px(el.x_mm + el.width / 2)} y={isRecess ? py(0) - h - 5 : py(el.depth) + 12}
                        textAnchor="middle" fontSize="9" fill="#090A09"
                        className="pbi-re-noptr"
                      >
                        {el.kind} {formatMm(el.width)}×{formatMm(el.depth)}
                      </text>
                    </g>
                  );
                })}
              </svg>
              )}

              <p className="pbi-re-t11 pbi-re-quiet pbi-re-mt1">
                {picked
                  ? (view === 'front'
                    ? 'Drag it along the wall — a window lifts and drops too. Double-click for its numbers.'
                    : 'Drag it along the wall, or up and down for its depth. Double-click for its numbers.')
                  : `${formatMm(wallWidth)} × ${formatMm(wallHeight)} mm · ${onThisWall.length} element${onThisWall.length === 1 ? '' : 's'} in this view.`}
              </p>
              {issues.map((iss) => (
                <p key={iss} className="pbi-re-t11 pbi-re-warn pbi-re-mt1" data-elevation-issue="1">{iss}</p>
              ))}
            </div>

            {/* ── the tools, down the right-hand side, STYLED (F1) ──
                T45 F1b: the list follows the VIEW. A recess and a chimney are
                facts about the wall's PLAN — width and depth — and there is
                nowhere in an elevation to drag one to, so they are offered in
                the drawing that can show them. */}
            <div className="pbi-re-stack-2" data-elevation-tools="1">
              <span className="pbi-re-block pbi-re-t10 pbi-re-caps pbi-re-track pbi-re-quiet">Put on the wall</span>
              {(view === 'front' ? [
                ['door', 'Add door', 'A doorway — it stands on the floor', () => addOpening('door')],
                ['window', 'Add window', 'A window — it has a sill', () => addOpening('window')],
                ['slope-left', 'Slope left', hasSlopeOn('left')
                  ? 'This wall already has a left slope'
                  : 'A ceiling coming down at the LEFT end',
                () => addSlope('left'), hasSlopeOn('left')],
                ['slope-right', 'Slope right', hasSlopeOn('right')
                  ? 'This wall already has a right slope'
                  : 'A ceiling coming down at the RIGHT end',
                () => addSlope('right'), hasSlopeOn('right')],
              ] : [
                ['recess', 'Add recess', `An alcove — ${RECESS_DEFAULTS.width} × ${RECESS_DEFAULTS.depth} to start`,
                  () => addPlanElement('recess')],
                ['chimney', 'Add chimney', `A breast standing proud — ${CHIMNEY_DEFAULTS.width} × ${CHIMNEY_DEFAULTS.depth}`,
                  () => addPlanElement('chimney')],
              ]).map(([id, label, hint, run, off = false]) => (
                <button
                  key={id}
                  type="button"
                  title={hint}
                  disabled={off}
                  data-elevation-add={id}
                  className={`pbi-re-wfull pbi-re-line pbi-re-round pbi-re-px25 pbi-re-py2 pbi-re-left pbi-re-fade ${
                    off
                      ? 'pbi-re-hair-soft pbi-re-fill-panel-soft pbi-re-dim pbi-re-nope'
                      : 'pbi-re-hair pbi-re-fill-panel pbi-re-hair-gold-hover pbi-re-fill-hover'
                  }`}
                  onClick={run}
                >
                  <span className="pbi-re-row pbi-re-mid pbi-re-gap-2">
                    <ToolArt kind={id.startsWith('slope') ? 'slope' : id} />
                    <span className="pbi-re-minw">
                      <span className="pbi-re-block pbi-re-t12 pbi-re-ink">{label}</span>
                      <span className="pbi-re-block pbi-re-t10 pbi-re-quiet pbi-re-lead-snug">{hint}</span>
                    </span>
                  </span>
                </button>
              ))}

              <div className="pbi-re-divider" />
              <span className="pbi-re-block pbi-re-t10 pbi-re-caps pbi-re-track pbi-re-quiet">On this wall</span>
              <ul className="pbi-re-stack-1" data-elevation-list="1">
                {onThisWall.length === 0 && (
                  <li className="pbi-re-t11 pbi-re-quiet">Nothing yet — a plain wall is a fine answer.</li>
                )}
                {onThisWall.map((el) => (
                  <li key={el.id} className="pbi-re-row pbi-re-mid pbi-re-gap-1">
                    <button
                      type="button"
                      className={`pbi-re-btn pbi-re-px2 pbi-re-grow pbi-re-left ${picked === el.id ? 'pbi-re-hair-gold pbi-re-gold' : ''}`}
                      data-elevation-row={el.id}
                      onClick={() => { setPicked(el.id); openElement(el); }}
                    >
                      {el.kind === 'slope' && `slope ${el.side} · ${formatMm(el.run)}`}
                      {(el.kind === 'recess' || el.kind === 'chimney')
                        && `${el.kind} · ${formatMm(el.width)} × ${formatMm(el.depth)}`}
                      {(el.kind === 'door' || el.kind === 'window') && `${el.kind} · ${formatMm(el.w)}`}
                    </button>
                    <button
                      type="button"
                      className="pbi-re-btn-ghost pbi-re-bad pbi-re-px15"
                      title="Take it off the wall"
                      data-elevation-remove={el.id}
                      onClick={() => removeElement(el.id, el.kind)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── one element's own small window, BESIDE it (rule 4) ── */}
      {editingElement && (
        <ElementModal
          element={editingElement}
          anchor={editing.anchor}
          wallWidth={wallWidth}
          wallHeight={wallHeight}
          // T49 F8: how many slopes THIS wall carries. With two the Flat field
          // steps aside — *"jak beda 2 skosy to wtedy skosy musisz dac a nie
          // flat"* — and each slope is entered by its own run.
          slopeCount={slopesHere.length}
          opening={editingElement.kind === 'door' || editingElement.kind === 'window'
            ? openingsOf().find((o) => o.id === editingElement.id) || null
            : null}
          onOpening={(patch) => updateOpening(editingElement.id, patch)}
          onSlope={(patch) => updateSlope(editingElement.id, patch)}
          onPlan={(patch) => updateElement(
            editingElement.id,
            clampPlanElement({ ...editingElement, ...patch }, { wallWidth }) || patch,
          )}
          onRemove={() => removeElement(editingElement.id, editingElement.kind)}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

/**
 * ONE dimension of a chain (turn 45, CLAUDE.md F1a).
 *
 * A witness line at each end, an arrowed rule between them, and the millimetres
 * on it — the way a joiner's drawing says a number, and the way `engine/drawings`
 * already says it on paper. It draws what it is handed and works nothing out:
 * the arithmetic is `lib/wallElements.js elevationDimensionChains()`, so the
 * picture and the chain cannot come to disagree.
 *
 * `kind` is which edge it belongs to, which is all the geometry it needs: top
 * and bottom run in x, left and right in y.
 */
function DimLine({
  kind, x1, x2, y, y1, y2, x, mm, label, id,
}) {
  const stroke = '#5C5B57';
  const ink = '#090A09';
  const horizontal = kind === 'top' || kind === 'bottom';
  const tick = 4;
  return (
    <g className="pbi-re-noptr" data-dim={id} data-dim-mm={mm} data-dim-edge={kind}>
      {horizontal ? (
        <>
          <line x1={x1} y1={y} x2={x2} y2={y} stroke={stroke} strokeWidth="1" />
          <line x1={x1} y1={y - tick} x2={x1} y2={y + tick} stroke={stroke} strokeWidth="1" />
          <line x1={x2} y1={y - tick} x2={x2} y2={y + tick} stroke={stroke} strokeWidth="1" />
          <text
            x={(x1 + x2) / 2}
            y={kind === 'top' ? y - 4 : y + 10}
            textAnchor="middle"
            fontSize="9"
            fill={ink}
          >
            {formatMm(mm)}{label ? ` · ${label}` : ''}
          </text>
        </>
      ) : (
        <>
          <line x1={x} y1={y1} x2={x} y2={y2} stroke={stroke} strokeWidth="1" />
          <line x1={x - tick} y1={y1} x2={x + tick} y2={y1} stroke={stroke} strokeWidth="1" />
          <line x1={x - tick} y1={y2} x2={x + tick} y2={y2} stroke={stroke} strokeWidth="1" />
          <text
            x={x}
            y={(y1 + y2) / 2}
            textAnchor="middle"
            fontSize="9"
            fill={ink}
            transform={`rotate(-90 ${x} ${(y1 + y2) / 2})`}
          >
            {formatMm(mm)}{label ? ` · ${label}` : ''}
          </text>
        </>
      )}
    </g>
  );
}

/** The little drawing on each tool button — a tool that looks like a tool. */
function ToolArt({ kind }) {
  if (kind === 'slope') {
    return (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden className="pbi-re-nogrow">
        <rect x="2" y="4" width="22" height="18" stroke="#5C5B57" strokeWidth="1.3" />
        <path d="M24 9 L14 4 L24 4 Z" fill="#D2C19F" stroke="#806A44" strokeWidth="1.2" />
      </svg>
    );
  }
  if (kind === 'door') {
    return (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden className="pbi-re-nogrow">
        <rect x="2" y="4" width="22" height="18" stroke="#5C5B57" strokeWidth="1.3" />
        <rect x="8" y="9" width="9" height="13" fill="#D9D1C6" stroke="#090A09" strokeWidth="1.2" />
        <circle cx="15" cy="16" r="0.9" fill="#806A44" />
      </svg>
    );
  }
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden className="pbi-re-nogrow">
      <rect x="2" y="4" width="22" height="18" stroke="#5C5B57" strokeWidth="1.3" />
      <rect x="7" y="9" width="12" height="8" fill="#F2EEE7" stroke="#5C5B57" strokeWidth="1.2" />
      <path d="M13 9 L13 17 M7 13 L19 13" stroke="#5C5B57" strokeWidth="0.9" />
    </svg>
  );
}

/**
 * ONE element's numbers — position and size, and for a slope the side, the
 * start height and the run. Opened by a double-click on the element and placed
 * BESIDE it by the shell, which is rule 15 and this turn's rule 4.
 *
 * Chat-fix 25.08.2026, the owner: *"modal powieksz x 2 bo mamy miejsce."* At
 * 320 px every label/field row was squeezed into a strip beside a drawing that
 * has the whole screen to itself; at 640 the numbers and their names sit on one
 * line without wrapping.
 */
function ElementModal({
  element, opening, anchor, wallWidth, wallHeight, onOpening, onSlope, onPlan, onRemove, onClose,
  slopeCount = 1,
}) {
  const isSlope = element.kind === 'slope';
  // T45 F1b: *"rectangles with width + depth, double-click for numbers"* — the
  // same window, one more branch, so a recess is typed where a window is typed.
  const isPlan = element.kind === 'recess' || element.kind === 'chimney';
  const TITLES = {
    slope: 'Slope', door: 'Door', window: 'Window', recess: 'Recess', chimney: 'Chimney',
  };
  return (
    <Modal
      name="wall-element"
      title={TITLES[element.kind] || 'Wall element'}
      anchor={anchor}
      width="pbi-re-w640"
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="pbi-re-btn pbi-re-bad" data-element-remove="1" onClick={onRemove}>
            Remove
          </button>
          <button type="button" className="pbi-re-btn-gold" data-element-done="1" onClick={onClose}>Done</button>
        </>
      )}
    >
      <div className="pbi-re-stack-2" data-element-modal={element.kind}>
        {isPlan && (
          <>
            <label className="pbi-re-fieldrow">
              <span className="pbi-re-t11 pbi-re-quiet pbi-re-w24 pbi-re-nogrow">From the left</span>
              <NumberField
                className="pbi-re-input pbi-re-w24 pbi-re-right"
                data-plan-x="1"
                value={element.x_mm}
                min={0}
                max={Math.max(0, wallWidth - element.width)}
                onCommit={(v) => onPlan({ x_mm: v })}
              />
              <span className="pbi-re-t11 pbi-re-quiet">mm</span>
            </label>
            <label className="pbi-re-fieldrow">
              <span className="pbi-re-t11 pbi-re-quiet pbi-re-w24 pbi-re-nogrow">Width</span>
              <NumberField
                className="pbi-re-input pbi-re-w24 pbi-re-right"
                data-plan-width="1"
                value={element.width}
                min={MIN_ELEMENT_MM}
                onCommit={(v) => onPlan({ width: v })}
              />
              <span className="pbi-re-t11 pbi-re-quiet">mm</span>
            </label>
            <label className="pbi-re-fieldrow">
              <span className="pbi-re-t11 pbi-re-quiet pbi-re-w24 pbi-re-nogrow">Depth</span>
              <NumberField
                className="pbi-re-input pbi-re-w24 pbi-re-right"
                data-plan-depth="1"
                value={element.depth}
                min={MIN_ELEMENT_MM}
                onCommit={(v) => onPlan({ depth: v })}
              />
              <span className="pbi-re-t11 pbi-re-quiet">mm</span>
            </label>
            <p className="pbi-re-t10 pbi-re-quiet">
              {element.kind === 'recess'
                ? 'An alcove goes INTO the wall — a unit can sit back in it.'
                : 'A breast stands OUT of the wall — a unit has to come forward past it, or stop short.'}
              {' '}Geometry for the eye this turn: nothing is cut from it yet.
            </p>
          </>
        )}
        {!isPlan && (isSlope ? (
          <>
            <div className="pbi-re-fieldrow">
              <span className="pbi-re-t11 pbi-re-quiet pbi-re-w24 pbi-re-nogrow">Side</span>
              <div className="pbi-re-row pbi-re-gap-1">
                {[['L', 'Left'], ['R', 'Right']].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    data-slope-side={id}
                    aria-pressed={element.side === id}
                    className={`pbi-re-btn pbi-re-px25 ${element.side === id ? 'pbi-re-hair-gold pbi-re-gold' : ''}`}
                    onClick={() => onSlope({ side: id })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <label className="pbi-re-fieldrow">
              <span className="pbi-re-t11 pbi-re-quiet pbi-re-w24 pbi-re-nogrow">Start height</span>
              <NumberField
                className="pbi-re-input pbi-re-w24 pbi-re-right"
                data-slope-start="1"
                value={element.startHeight}
                min={0}
                max={wallHeight}
                onCommit={(v) => onSlope({ startHeight: v })}
              />
              <span className="pbi-re-t11 pbi-re-quiet">mm</span>
            </label>
            {/* ─── TURN 49 (CLAUDE.md F8): FLAT, AND THE RUN IT LEAVES ────────
                A slope is entered today as `run` — the length of the fall. The
                ARCHITECT gives the flat stretch instead: how far the ceiling
                stays up, measured from the opposite corner. So the dialog takes
                either, and `flat + run = wall width` is the whole of it: type
                one and the other follows, and the sum is always the wall.

                Nothing is STORED but the run. `flat` is a way of typing it,
                derived from the wall the moment it is shown — `ceilingAt`, the
                cut line and the engine are exactly what they were. */}
            {flatFieldShown(slopeCount) && (
              <label className="pbi-re-fieldrow" data-slope-flat-row="1">
                <span className="pbi-re-t11 pbi-re-quiet pbi-re-w24 pbi-re-nogrow">Flat</span>
                <NumberField
                  className="pbi-re-input pbi-re-w24 pbi-re-right"
                  data-slope-flat="1"
                  value={flatFromRun(element.run, wallWidth)}
                  min={0}
                  max={wallWidth}
                  onCommit={(v) => onSlope({ run: runFromFlat(v, wallWidth) })}
                />
                <span className="pbi-re-t11 pbi-re-quiet">mm from the far corner</span>
              </label>
            )}
            <label className="pbi-re-fieldrow">
              <span className="pbi-re-t11 pbi-re-quiet pbi-re-w24 pbi-re-nogrow">Run</span>
              <NumberField
                className="pbi-re-input pbi-re-w24 pbi-re-right"
                data-slope-run="1"
                value={element.run}
                min={0}
                max={wallWidth}
                onCommit={(v) => onSlope({ run: v })}
              />
              <span className="pbi-re-t11 pbi-re-quiet">mm</span>
            </label>
            {flatFieldShown(slopeCount) ? (
              <p className="pbi-re-t10 pbi-re-quiet" data-slope-note="flat">
                How high the wall still is at that end, and how far along it takes to reach the ceiling.
                {' '}Flat and run always add up to the {formatMm(wallWidth)} mm wall — type either one.
              </p>
            ) : (
              /* T49 F8: *"jak beda 2 skosy to wtedy skosy musisz dac a nie
                 flat."* With a fall at both ends the level part is between
                 them, so there is no distance from a corner to call "flat" —
                 and a field that means two things is worse than one that means
                 one. One short line, and the runs do the talking. */
              <p className="pbi-re-t10 pbi-re-warn" data-slope-note="two-slopes">
                {TWO_SLOPES_NOTE}
              </p>
            )}
          </>
        ) : (
          <>
            <label className="pbi-re-fieldrow">
              <span className="pbi-re-t11 pbi-re-quiet pbi-re-w24 pbi-re-nogrow">From the left</span>
              <NumberField
                className="pbi-re-input pbi-re-w24 pbi-re-right"
                data-element-x="1"
                value={opening?.x_mm ?? element.x}
                min={0}
                onCommit={(v) => onOpening({ x_mm: v })}
              />
              <span className="pbi-re-t11 pbi-re-quiet">mm</span>
            </label>
            <label className="pbi-re-fieldrow">
              <span className="pbi-re-t11 pbi-re-quiet pbi-re-w24 pbi-re-nogrow">Width</span>
              <NumberField
                className="pbi-re-input pbi-re-w24 pbi-re-right"
                data-element-w="1"
                value={opening?.width ?? element.w}
                min={MIN_ELEMENT_MM}
                onCommit={(v) => onOpening({ width: v })}
              />
              <span className="pbi-re-t11 pbi-re-quiet">mm</span>
            </label>
            <label className="pbi-re-fieldrow">
              <span className="pbi-re-t11 pbi-re-quiet pbi-re-w24 pbi-re-nogrow">Height</span>
              <NumberField
                className="pbi-re-input pbi-re-w24 pbi-re-right"
                data-element-h="1"
                value={opening?.height ?? element.h}
                min={MIN_ELEMENT_MM}
                onCommit={(v) => onOpening({ height: v })}
              />
              <span className="pbi-re-t11 pbi-re-quiet">mm</span>
            </label>
            {element.kind === 'window' && (
              <label className="pbi-re-fieldrow">
                <span className="pbi-re-t11 pbi-re-quiet pbi-re-w24 pbi-re-nogrow">Sill</span>
                <NumberField
                  className="pbi-re-input pbi-re-w24 pbi-re-right"
                  data-element-sill="1"
                  value={opening?.sill ?? element.y}
                  min={0}
                  onCommit={(v) => onOpening({ sill: v })}
                />
                <span className="pbi-re-t11 pbi-re-quiet">mm off the floor</span>
              </label>
            )}
            <p className="pbi-re-t10 pbi-re-quiet">
              A door stands on the floor — it has no sill, and dragging it only ever moves it sideways.
            </p>
          </>
        ))}
      </div>
    </Modal>
  );
}
