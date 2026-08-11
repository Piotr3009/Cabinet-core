import { useMemo, useState } from 'react';
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
          <span className="text-[11px] text-ink-400 flex-1 text-left" data-part-note="1">
            {note || 'Hover a hole, a pocket or a mark to see what it is. Drag the left view to turn the piece over.'}
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
            <PartDrawing drawing={drawing} hovered={hovered} onHover={setHovered} />
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
 */
function PartDrawing({ drawing, hovered, onHover }) {
  const { size } = drawing;
  const pad = Math.max(size.w, size.h) * PAD + drawing.dimensionOffset;
  // The drawing's own frame has y UP (every engine drawing does); SVG has y
  // down, so the whole picture is flipped once here rather than every entity
  // being written backwards.
  const viewBox = `${-pad} ${-size.h - pad} ${size.w + pad * 2} ${size.h + pad * 2}`;
  const dimInk = drawingLayer('DIMENSIONS').colour;
  const outlineColour = drawing.legend.find((l) => l.name === drawing.outlineLayer)?.colour || '#f0ece4';
  const lit = (id) => hovered === id;

  return (
    <svg className="w-full h-full" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
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
      </g>
    </svg>
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
