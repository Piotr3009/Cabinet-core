import { useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Modal from './Modal.jsx';
import { MovingPanel } from '../3d/UnitView.jsx';
import EditorRig from '../3d/EditorRig.jsx';
import { mm } from '../3d/constants.js';
import { outlineFor, surfaceFor } from '../3d/materials.js';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { projectSheen, resolveFinishes, resolveUnitDesign } from '../engine/design.js';
import { panelFinish } from '../engine/materials.js';
import { joineryLayers as resolveJoineryLayers } from '../engine/joinery.js';
import { elementLabel } from '../engine/elements.js';
import { partDetailDrawing } from '../engine/drawings/partDetail.js';
import { drawingLayer } from '../engine/drawings/layers.js';
import { formatMm, formatMmPair } from '../engine/format.js';
import {
  dimensionSet, dimensionStyle, featureDimensionRows,
} from '../engine/dimensionArrows.js';
import { useElementSize, useSheetView } from '../lib/sheetView.js';
import useContextGuard from '../3d/contextGuard.jsx';

// ─── The element DETAIL window (turn 14, CLAUDE.md F7) ──────────────────────
//
// Double-click a part in the exploded cabinet and this opens: the piece on the
// left, in the hand; the piece on the right, as the machine will cut it.
//
// It is the answer to the question a joiner asks holding a panel — "what is
// THAT hole for?" — and until now the only place to ask it was the CNC sheet,
// which shows forty parts at once and cannot tell you what any one of them is.
//
// THREE THINGS ABOUT IT ARE THE PHASE.
//
//   IT SHOWS ONE PIECE (F7.1). The left half is the room's own `MovingPanel`,
//   with the room's own machined geometry — a socket is a socket here because
//   it is the same extrusion the scene draws — orbiting on its own centre. It
//   is not a second renderer.
//
//   THE DRAWING IS THE DRAWING (F7.2/F7.4). The outline, every path on it, a
//   LAYER LEGEND with the names and colours from `cnc/layers.js`, and the
//   overall dimensions with the delicate extension lines a draughtsman leaves.
//   Those dimensions are turn 7's `dimensionEntities`, unchanged and imported,
//   because CLAUDE.md says not to fork a second drawing engine and because a
//   dimension drawn twice is a dimension drawn two ways.
//
//   IT ANSWERS (F7.3). Hovering a machining lights it and prints its NOTE —
//   what it is, how big, and where on the part. The overall dimensions never
//   go away, whatever is being hovered, because they are the two numbers the
//   piece is ordered by.

const PAD = 0.14;   // margin round the drawing, as a fraction of its long side
// Turn 23 (CLAUDE.md F7): the zoom's own limits, in the part's millimetres —
// 10 mm across the window is a ⌀5 hole filling it, and 5 m is any part in the
// app lost in the middle. The main sheet's are wider because it holds a whole
// project; a part is a part.
const MIN_VIEW_MM = 10;
const MAX_VIEW_MM = 5000;

//   ─── TURN 23 (CLAUDE.md F1): AND THERE IS A WAY BACK ───
//
//   This window used to REPLACE the cabinet editor that opened it — one modal
//   slot, overwritten — so the only door out was ×, which threw away the
//   explode, the camera and the selection a joiner had set up to get here. It
//   is a level on a STACK now: ← Back beside the title, Escape for the same
//   thing, and the cabinet comes back exactly as it was left. Not a line of
//   history lives in this file; the shell owns all of it.

export default function PartDetailModal() {
  const args = useUiStore((s) => s.modalArgs);
  const closeModal = useUiStore((s) => s.closeModal);
  const popModal = useUiStore((s) => s.popModal);
  const canBack = useUiStore((s) => s.modalStack.length > 0);
  const units = useProjectStore((s) => s.units);
  const unitResult = useProjectStore((s) => s.unitResult);
  const storedDesign = useProjectStore((s) => s.project.design);
  const profile = useCabinetProfileStore((s) => s.profile);
  const [hovered, setHovered] = useState(null);

  const unit = units.find((u) => u.id === args?.unitId) || null;
  const result = unit ? unitResult(unit.id) : null;
  const panel = result?.panels.find((p) => p.id === args?.panelId) || null;

  const drawing = useMemo(
    () => (panel ? partDetailDrawing(panel, { drills: result?.drills || [], profile }) : null),
    [panel, result, profile],
  );

  if (!unit || !panel || !drawing) return null;

  const note = drawing.machinings.find((m) => m.id === hovered)?.note || null;

  return (
    <Modal
      anchor={args?.anchor || null}
      title={`${unit.params.unit_num} · ${elementLabel(panel) || panel.part} — ${panel.id}`}
      onClose={closeModal}
      onBack={canBack ? popModal : null}
      backLabel="cabinet"
      width="w-[720px]"
      // The editor window's own exception to rule 15 (turn 13, F2.1): this is a
      // workspace — two views side by side — and not a side dialog.
      maximised
      footer={(
        <>
          {/* ─── TURN 23 (CLAUDE.md F8.1): THE CAPTION GOES AWAY ───────────
              Owner: "the corner caption is not what he asked for." What a
              hovered feature IS still belongs in words — a ⌀35 cup and a ⌀35
              pocket are the same circle — but WHERE it is, which is what the
              caption was mostly spending its room on, is drawn now. The
              turn-20 sheet tooltip stays where it is: different surface,
              different job. */}
          <span className="text-[11px] text-ink-400 flex-1 text-left" data-part-note="1">
            {note || 'Hover a hole, a pocket or a mark — it dimensions itself. Wheel to zoom, drag to pan, double-click to fit.'}
          </span>
          <button type="button" className="cc-btn-gold" onClick={closeModal}>Done</button>
        </>
      )}
    >
      <div className="h-full min-h-0 flex gap-3 flex-col md:flex-row">
        {/* ── LEFT: the piece itself (F7.1) ── */}
        <div
          className="rounded border border-shell-600 overflow-hidden flex-1 min-w-0 min-h-[240px]"
          data-part-canvas="1"
          style={{ background: profile.appearance.room?.background || '#fafaf8' }}
        >
          <PartCanvas unit={unit} panel={panel} design={storedDesign} profile={profile} drills={result?.drills || []} />
        </div>

        {/* ── RIGHT: the CNC drawing (F7.2) ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div
            className="flex-1 min-h-[240px] rounded border border-shell-600 bg-[#131313] overflow-hidden"
            data-part-drawing="1"
          >
            <PartDrawing drawing={drawing} hovered={hovered} onHover={setHovered} profile={profile} />
          </div>

          <div className="flex items-start gap-3">
            <div className="text-[11px] text-ink-400 flex-1">
              <div className="text-ink-100">
                {formatMmPair(panel.w, panel.h, ' × ')} · {formatMm(panel.thickness)} mm
              </div>
              {drawing.size.rotated && <div>nested turned on the sheet</div>}
              {panel.meta?.material_label ? <div>{panel.meta.material_label}</div> : null}
            </div>

            {/* The LEGEND (F7.2): the names and the colours from cnc/layers.js,
                and only the layers this part actually carries. */}
            <ul className="space-y-0.5 min-w-[150px]" data-part-legend="1">
              {drawing.legend.map((l) => (
                <li key={l.name}>
                  <button
                    type="button"
                    data-legend-layer={l.name}
                    className={`w-full flex items-center gap-2 px-1 py-0.5 rounded text-left hover:bg-shell-700 ${
                      hovered && drawing.machinings.find((m) => m.id === hovered)?.layer === l.name ? 'bg-shell-700' : ''}`}
                    onPointerEnter={() => {
                      const first = drawing.machinings.find((m) => m.layer === l.name);
                      if (first) setHovered(first.id);
                    }}
                    onPointerLeave={() => setHovered(null)}
                  >
                    <span className="w-3 h-3 rounded-sm shrink-0 border border-black/40" style={{ background: l.colour }} />
                    <span className="text-[11px] text-ink-100 flex-1 truncate">{l.name}</span>
                    <span className="text-[10px] text-ink-400 tabular-nums">{l.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/**
 * The drawing. Entities in, SVG out — and every machining is its own DOM node,
 * which is what makes F7.3's hover possible at all.
 *
 * ─── TURN 23 (CLAUDE.md F7): IT ZOOMS ──────────────────────────────────────
 *
 * Owner: "the part preview in the editor detail is fixed." Wheel zooms about
 * the cursor, drag pans, double-click or the ⌂ fits — and the grammar is the
 * MAIN CNC SHEET's, extracted to `lib/sheetView.js` and consumed by both, so
 * there is no possibility of the two behaving differently. Turn 20's capture-on
 * -MOVEMENT law comes with it: nothing is captured on a press, so a click still
 * reaches the feature under it.
 *
 * NOTHING ABOUT THE DRAWING CHANGES (F7.2). It is presentation: the same
 * entities, in the same frame, seen through a different window.
 */
function PartDrawing({
  drawing, hovered, onHover, profile,
}) {
  const { size } = drawing;
  const svgRef = useRef(null);
  const wrapRef = useRef(null);
  const pad = Math.max(size.w, size.h) * PAD + drawing.dimensionOffset;
  // The drawing's own frame has y UP (every engine drawing does); SVG has y
  // down, so the whole picture is flipped once by the group below rather than
  // every entity being written backwards. The VIEW therefore works in the
  // flipped frame, which is what `lib/sheetView.js` speaks.
  const content = useMemo(() => ({
    x: -pad, y: -size.h - pad, w: size.w + pad * 2, h: size.h + pad * 2,
  }), [pad, size.w, size.h]);
  const px = useElementSize(wrapRef);
  const view = useSheetView({
    svgRef,
    content,
    size: px,
    min: MIN_VIEW_MM,
    max: MAX_VIEW_MM,
    panThreshold: profile.cnc.annotation.panThresholdPx,
    // A dimension chasing the cursor across a drawing being dragged is noise.
    onPanStart: () => onHover(null),
  });
  const dimInk = drawingLayer('DIMENSIONS').colour;
  const outlineColour = drawing.legend.find((l) => l.name === drawing.outlineLayer)?.colour || '#f0ece4';
  const lit = (id) => hovered === id;

  // ─── TURN 23 (CLAUDE.md F8.1): THE HOVER IS A DRAWING ────────────────────
  //
  // "…hovering a drill/pocket/feature draws dimension arrows from the feature
  // to the part's nearest edges and to the nearest neighbouring feature —
  // extension lines, arrowheads, the value on the line, formatMm." The corner
  // caption turn 22 put in the footer is gone; this is what replaces it.
  const style = useMemo(() => dimensionStyle(profile), [profile]);
  const arrows = useMemo(() => {
    if (!hovered) return [];
    const centreOf = (m) => (m.kind === 'pocket'
      ? { x: m.x + m.w / 2, y: m.y + m.h / 2 }
      : (m.kind === 'mark'
        ? { x: (m.from[0] + m.to[0]) / 2, y: (m.from[1] + m.to[1]) / 2 }
        : { x: m.x, y: m.y }));
    const me = drawing.machinings.find((m) => m.id === hovered);
    if (!me) return [];
    return dimensionSet(featureDimensionRows({
      feature: centreOf(me),
      size: { w: size.w, h: size.h },
      others: drawing.machinings.filter((m) => m.id !== hovered).map((m) => ({ id: m.id, ...centreOf(m) })),
      style,
    }), style);
  }, [hovered, drawing.machinings, size.w, size.h, style]);

  const viewBox = view.box
    ? `${view.box.x} ${view.box.y} ${view.box.w} ${view.viewH}`
    : `${content.x} ${content.y} ${content.w} ${content.h}`;

  return (
    <div ref={wrapRef} className="w-full h-full relative">
      <button
        type="button"
        className="absolute right-1 top-1 z-10 cc-btn-ghost text-[11px] px-1.5 py-0.5"
        data-part-fit="1"
        title="Fit the part to the window (or double-click the drawing)"
        onClick={view.fit}
      >
        ⌂
      </button>
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: view.panning ? 'grabbing' : 'default', touchAction: 'none' }}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        onDoubleClick={view.fit}
        {...view.handlers}
      >
        <g transform="scale(1 -1)">
        {drawing.outline.length >= 2 && (
          <polygon
            points={drawing.outline.map(([x, y]) => `${x},${y}`).join(' ')}
            fill="rgba(255,255,255,0.04)"
            stroke={outlineColour}
            strokeWidth={1.4}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {drawing.machinings.map((m) => {
          const colour = drawing.legend.find((l) => l.name === m.layer)?.colour || '#c0c0c0';
          const common = {
            stroke: colour,
            fill: 'none',
            strokeWidth: lit(m.id) ? 3 : 1.2,
            vectorEffect: 'non-scaling-stroke',
            opacity: hovered && !lit(m.id) ? 0.35 : 1,
            onPointerEnter: () => onHover(m.id),
            onPointerLeave: () => onHover(null),
            style: { cursor: 'pointer' },
            'data-machining': m.id,
          };
          if (m.kind === 'pocket') {
            return <rect key={m.id} x={m.x} y={m.y} width={m.w} height={m.h} {...common} />;
          }
          if (m.kind === 'mark') {
            return (
              <line
                key={m.id} x1={m.from[0]} y1={m.from[1]} x2={m.to[0]} y2={m.to[1]}
                strokeLinecap="round" {...common}
              />
            );
          }
          return <circle key={m.id} cx={m.x} cy={m.y} r={Math.max(m.d / 2, 1.2)} {...common} />;
        })}

        {/* The dimensions — turn 7's own entities, drawn in the drawing-office
            ink. Never dimmed: F7.3 asks for the overall size to be visible
            whatever is being hovered. */}
        {drawing.dimensions.map((e, i) => {
          if (e.kind === 'line') {
            return (
              <line
                key={`d${i}`} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                stroke={dimInk} strokeWidth={0.9} vectorEffect="non-scaling-stroke" opacity={0.85}
              />
            );
          }
          if (e.kind !== 'text') return null;
          return (
            <text
              key={`d${i}`}
              x={e.x}
              y={e.y}
              fill="#9fb4d8"
              fontSize={e.height}
              textAnchor="middle"
              transform={`scale(1 -1) translate(0 ${-2 * e.y})${e.rotate ? ` rotate(${-e.rotate} ${e.x} ${e.y})` : ''}`}
              style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}
            >
              {e.text}
            </text>
          );
        })}

        {/* ─── F8.1: the hovered feature, dimensioned ───
            Extension lines, open arrowheads, the value on the line. Thin blue,
            from `profile.hoverDimensions` — the SAME style the scene's hover
            arrows use, defined once and consumed twice. */}
        {arrows.map((d) => (
          <g key={d.key} data-hover-dim={String(d.key)}>
            {d.segments.map(([a, b], i) => (
              <line
                // eslint-disable-next-line react/no-array-index-key -- a segment has no identity of its own
                key={i}
                x1={a[0]}
                y1={a[1]}
                x2={b[0]}
                y2={b[1]}
                stroke={style.colour}
                strokeWidth={style.strokeMm}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
              />
            ))}
            <text
              x={d.text.at[0]}
              y={d.text.at[1]}
              fill={style.colour}
              fontSize={style.textMm}
              textAnchor="middle"
              transform={`scale(1 -1) translate(0 ${-2 * d.text.at[1]}) rotate(${-d.text.angle} ${d.text.at[0]} ${d.text.at[1]})`}
              style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}
            >
              {formatMm(d.value)}
            </text>
          </g>
        ))}
        </g>
      </svg>
    </div>
  );
}

/** The piece on its own, in the room's own materials. */
function PartCanvas({ unit, panel, design, profile, drills = [] }) {
  // Turn 20 (CLAUDE.md F10): the third surface, and its context is released
  // when this window closes rather than left for the collector.
  const guardContext = useContextGuard('part-detail');
  const finishes = useMemo(() => resolveFinishes(unit, design, profile), [unit, design, profile]);
  const unitDesign = useMemo(() => resolveUnitDesign(unit, design), [unit, design]);
  const sheen = useMemo(() => projectSheen(design, profile), [design, profile]);
  // Named for the prop it feeds, exactly as the editor window names it: the
  // import is aliased, so a local of this name is what keeps
  // test/imports.test.js's tripwire honest about an aliased export.
  const joineryLayers = useMemo(
    () => resolveJoineryLayers(profile, unitDesign?.joinery || null),
    [profile, unitDesign],
  );
  // Turn 16 (CLAUDE.md F1.4): this piece's OWN material, resolved by the engine
  // — the same answer the room and the editor window get.
  const own = useMemo(
    () => (design ? panelFinish(panel, unit, design, profile) : null),
    [panel, unit, design, profile],
  );
  const surface = useMemo(() => surfaceFor({
    role: panel.role,
    materialRole: panel.material_role,
    finishExposed: panel.finish_exposed,
    finishes,
    profile,
    frontColour: own?.overridden ? (own.colour?.hex || null) : (unitDesign?.colour?.hex || null),
    sheen,
    ...(own ? { finish: own.finish } : {}),
  }), [panel, finishes, profile, unitDesign, sheen, own]);

  const box = panel.box;
  const span = Math.max(box.w, box.h, box.d);
  const radius = mm(span) * 1.8;
  const centre = [-mm(box.x + box.w / 2), -mm(box.y + box.h / 2), -mm(box.z + box.d / 2)];

  return (
    <Canvas
      // Turn 20 (CLAUDE.md F10): the third surface, the same guard.
      ref={guardContext.ref}
      onCreated={guardContext.onCreated}
      dpr={[1, 2]}
      camera={{ position: [radius * 0.7, radius * 0.6, radius], fov: 40, near: 0.01, far: 100 }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Turn 16 (CLAUDE.md F7): the editor's own rig, shared with the
          exploded editor — one rig for the two windows that show a part on a
          bench, and its numbers are in the profile. */}
      <EditorRig profile={profile} radius={radius} />
      <group position={centre}>
        <MovingPanel
          panel={panel}
          surface={surface}
          outline={outlineFor(profile, {})}
          outlines
          depth={unit.params.depth}
          profile={profile}
          joineryLayers={joineryLayers}
          // Turn 17 (CLAUDE.md F4.1): the same machining the right-hand drawing
          // lists, on the piece itself — one reading of `panel.cnc`, shown two
          // ways rather than drawn twice.
          machining
          drills={drills}
        />
      </group>
      {/* Zoom, pan and rotate — F7.1 names all three. */}
      <OrbitControls makeDefault enablePan enableDamping dampingFactor={0.12} />
    </Canvas>
  );
}
