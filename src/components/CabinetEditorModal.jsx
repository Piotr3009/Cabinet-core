import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Modal from './Modal.jsx';
import ElementProperties from './ElementProperties.jsx';
import { MovingPanel } from '../3d/UnitView.jsx';
import { mm } from '../3d/constants.js';
import { surfaceFor, outlineFor } from '../3d/materials.js';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { projectSheen, resolveFinishes, resolveUnitDesign } from '../engine/design.js';
import { joineryLayers as resolveJoineryLayers } from '../engine/joinery.js';
import { cabinetBounds, explodeOffsets, explodeSettings } from '../engine/explode.js';
import { elementLabel, isSelectableElement } from '../engine/elements.js';
import { getUnitType } from '../engine/types.js';

// ─── The cabinet editor window (turn 12, CLAUDE.md F4) ──────────────────────
//
// Right-click a unit → "Edit cabinet" → this. A modal on the F2 shell, standing
// beside the cabinet it is about, with its own small 3D canvas holding THAT
// CABINET and nothing else.
//
// What it is: a VIEWER AND EDITOR OVER EXISTING DATA. It renders the panels the
// engine already computed for this unit — the same `result.panels`, through the
// same `MovingPanel` the room view uses — so a mitre, a machined dog-bone
// socket, a decor and an X-ray all look the way they look everywhere else. It
// re-derives nothing. The working scene, the engine and the BOM do not know it
// exists, and the canvas is mounted only while the window is open.
//
// What it adds is two gestures a room view cannot give you:
//
//   EXPLODE (F4.1) — the parts slide apart along their face normals, like the
//   cabinet was unscrewed. The arithmetic is engine/explode.js and the distance
//   is a profile number; this file only animates towards the answer.
//
//   TURN A PART OVER (F4.2) — in the exploded state, a part can be selected and
//   ROTATED freely, which is how you look at the back of a side panel without
//   taking the room apart around it. Selecting a part shows its EXISTING
//   properties: `ElementProperties`, the same component the right panel and the
//   double-click modal use, so an edit made here is the same override made
//   anywhere else. It is reused, not forked — CLAUDE.md F4.2 says so, and two
//   copies would offer different fields for the same piece within a turn.

export default function CabinetEditorModal() {
  const args = useUiStore((s) => s.modalArgs);
  const closeModal = useUiStore((s) => s.closeModal);
  const anchor = args?.anchor || null;
  const units = useProjectStore((s) => s.units);
  const unitResult = useProjectStore((s) => s.unitResult);
  const storedDesign = useProjectStore((s) => s.project.design);
  const profile = useCabinetProfileStore((s) => s.profile);

  const unit = units.find((u) => u.id === args?.unitId) || null;
  const result = unit ? unitResult(unit.id) : null;

  const [exploded, setExploded] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // A part that has gone (a shelf deleted from the panel below) must not stay
  // selected: the properties block would be showing a piece that is not there.
  const panels = useMemo(() => (result?.panels || []).filter((p) => p.box), [result]);
  useEffect(() => {
    if (selectedId && !panels.some((p) => p.id === selectedId)) setSelectedId(null);
  }, [panels, selectedId]);

  const selected = panels.find((p) => p.id === selectedId) || null;
  const item = useMemo(() => {
    const id = selected?.meta?.itemId;
    if (!id) return null;
    return (unit?.params.sections?.[0]?.items || []).find((i) => i.id === id) || null;
  }, [selected, unit]);

  if (!unit || !result) return null;

  const type = getUnitType(unit.type);

  return (
    <Modal
      anchor={anchor}
      title={`${unit.params.unit_num} · ${type.label} — edit cabinet`}
      onClose={closeModal}
      width="w-[560px]"
      footer={(
        <>
          <span className="text-[11px] text-ink-400 flex-1 text-left">
            {exploded
              ? 'Click a part to select it, then drag it to turn it over.'
              : 'Explode to look inside — every piece comes apart on its own face.'}
          </span>
          <button
            type="button"
            className={`cc-btn ${exploded ? 'border-gold text-gold' : ''}`}
            data-explode="1"
            onClick={() => { setExploded((v) => !v); }}
          >
            {exploded ? 'Assemble' : 'Explode'}
          </button>
          <button type="button" className="cc-btn-gold" onClick={closeModal}>Done</button>
        </>
      )}
    >
      <div className="space-y-3">
        <div
          className="h-[300px] rounded border border-shell-600 overflow-hidden"
          data-cabinet-canvas="1"
          style={{ background: profile.appearance.room?.background || '#fafaf8' }}
        >
          {/* The canvas exists only while this window is open — CLAUDE.md F4.3:
              "Cost: canvas mounts only while the modal is open." */}
          <CabinetCanvas
            unit={unit}
            panels={panels}
            design={storedDesign}
            profile={profile}
            exploded={exploded}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        {selected ? (
          <div className="border border-shell-600 rounded p-2 space-y-2">
            <div className="cc-row">
              <span className="text-xs uppercase tracking-wide text-ink-200 flex-1">
                {elementLabel(selected)}
              </span>
              <button type="button" className="cc-btn-ghost" title="Deselect" onClick={() => setSelectedId(null)}>×</button>
            </div>
            {/* The SAME properties block the right panel shows. An edit here is
                the same override, on the same unit, through the same store. */}
            <ElementProperties unit={unit} panel={selected} item={item} compact />
          </div>
        ) : (
          <p className="text-[11px] text-ink-400">
            Nothing selected. Click a piece in the view — its properties appear here, and they are the
            same fields the right-hand panel offers.
          </p>
        )}
      </div>
    </Modal>
  );
}

/**
 * The little canvas. A cut-down version of the room's rig — the same tone
 * mapping is not needed for one cabinet on a plain ground, but the LIGHTS are
 * the room's shape so a panel does not read a different colour here than it
 * does in the scene.
 */
function CabinetCanvas({
  unit, panels, design, profile, exploded, selectedId, onSelect,
}) {
  const bounds = useMemo(() => cabinetBounds(panels), [panels]);
  const size = bounds ? Math.max(bounds.size.x, bounds.size.y, bounds.size.z) : 800;
  const radius = mm(size) * 1.9;

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{
        position: [radius * 0.75, radius * 0.55, radius], fov: 40, near: 0.01, far: 100,
      }}
      onPointerMissed={() => onSelect(null)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ambientLight intensity={0.75} />
      <directionalLight position={[radius, radius * 1.6, radius]} intensity={1.6} />
      <directionalLight position={[-radius, radius * 0.6, -radius * 0.4]} intensity={0.5} />
      <ExplodedCabinet
        unit={unit}
        panels={panels}
        design={design}
        profile={profile}
        exploded={exploded}
        selectedId={selectedId}
        onSelect={onSelect}
        bounds={bounds}
      />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={radius * 0.35}
        maxDistance={radius * 4}
        enableDamping
        dampingFactor={0.12}
      />
    </Canvas>
  );
}

/**
 * The cabinet itself, centred on the origin so the orbit turns around it.
 *
 * Every piece is a `MovingPanel` — the room view's own — wrapped in a group
 * this file animates. The wrapper is why nothing about the shared renderer had
 * to change: the explode is an OFFSET applied outside it, exactly as the door
 * swing is an offset applied inside it.
 */
function ExplodedCabinet({
  unit, panels, design, profile, exploded, selectedId, onSelect, bounds,
}) {
  const finishes = useMemo(() => resolveFinishes(unit, design, profile), [unit, design, profile]);
  const unitDesign = useMemo(() => resolveUnitDesign(unit, design), [unit, design]);
  const sheen = useMemo(() => projectSheen(design, profile), [design, profile]);
  const joineryLayers = useMemo(
    () => resolveJoineryLayers(profile, unitDesign?.joinery || null),
    [profile, unitDesign],
  );
  const offsets = useMemo(
    () => explodeOffsets(panels, explodeSettings(profile)),
    [panels, profile],
  );
  const centre = bounds ? [-mm(bounds.centre.x), -mm(bounds.centre.y), -mm(bounds.centre.z)] : [0, 0, 0];

  return (
    <group position={centre}>
      {panels.map((p) => (
        <ExplodingPart
          key={p.id}
          panel={p}
          offset={offsets.get(p.id) || { x: 0, y: 0, z: 0 }}
          exploded={exploded}
          selected={selectedId === p.id}
          selectable={isSelectableElement(p)}
          onSelect={onSelect}
          profile={profile}
          finishes={finishes}
          unitDesign={unitDesign}
          sheen={sheen}
          joineryLayers={joineryLayers}
          depth={unit.params.depth}
        />
      ))}
    </group>
  );
}

/**
 * One piece: it slides out, it comes back, and while it is out it can be turned
 * over in the hand.
 *
 * The rotation is the PART's own and is remembered while the window is open —
 * a joiner who has turned a side panel round to look at the drilling has not
 * finished looking at it just because he clicked something else. Assembling
 * puts every part back the way it was found, because a cabinet with one side
 * panel at 40° is not an assembled cabinet.
 */
function ExplodingPart({
  panel: p, offset, exploded, selected, selectable, onSelect,
  profile, finishes, unitDesign, sheen, joineryLayers, depth,
}) {
  const group = useRef(null);
  const spin = useRef(null);
  const [turning, setTurning] = useState(false);
  const { gl } = useThree();
  const { seconds } = explodeSettings(profile);

  // The animated position, in metres, eased towards the target every frame.
  const at = useRef(0);
  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const target = exploded ? 1 : 0;
    if (Math.abs(at.current - target) < 0.001) at.current = target;
    else at.current += (target - at.current) * Math.min(1, delta / Math.max(0.05, seconds / 3));
    const a = at.current;
    g.position.set(mm(offset.x) * a, mm(offset.y) * a, mm(offset.z) * a);
    // Assembled means assembled: a part turned over springs back as it lands.
    if (!exploded && spin.current) {
      spin.current.rotation.x *= 1 - Math.min(1, delta * 6);
      spin.current.rotation.y *= 1 - Math.min(1, delta * 6);
    }
  });

  // ─── Turning a part over (CLAUDE.md F4.2) ───
  // Only while it is out, and only the SELECTED one: a drag on an unexploded
  // cabinet is how the orbit works, and taking that away would make the window
  // unusable for the thing it is mostly used for — looking at the cabinet.
  const startTurn = useCallback((e) => {
    if (!exploded || !selected || !spin.current) return;
    e.stopPropagation();
    setTurning(true);
    const from = { x: e.clientX, y: e.clientY };
    const start = { x: spin.current.rotation.x, y: spin.current.rotation.y };
    const move = (ev) => {
      if (!spin.current) return;
      spin.current.rotation.y = start.y + (ev.clientX - from.x) * 0.01;
      spin.current.rotation.x = start.x + (ev.clientY - from.y) * 0.01;
    };
    const up = () => {
      setTurning(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }, [exploded, selected]);

  const surface = useMemo(() => surfaceFor({
    role: p.role,
    materialRole: p.material_role,
    finishExposed: p.finish_exposed,
    finishes,
    profile,
    frontColour: unitDesign?.colour || null,
    sheen,
  }), [p, finishes, profile, unitDesign, sheen]);

  // The selected part goes gold, the same signal a dragged shelf gives in the
  // room — one colour for "this is the one you have hold of" (rule 14 territory:
  // the rig and its colours are not reinvented per window).
  const shown = selected
    ? { ...surface, colour: profile.appearance.selection?.colour || '#2B6CB0', texture: null }
    : surface;

  return (
    <group ref={group}>
      <group ref={spin}>
        <MovingPanel
          panel={p}
          front={null}
          open={0}
          surface={shown}
          outline={outlineFor(profile)}
          outlines
          contour={false}
          xray={false}
          depth={depth}
          profile={profile}
          joineryLayers={joineryLayers}
          onPointerDown={(e) => {
            if (!selectable) return;
            e.stopPropagation();
            if (selected && exploded) { startTurn(e); return; }
            onSelect(p.id);
          }}
          onPointerOver={selectable ? () => { gl.domElement.style.cursor = turning ? 'grabbing' : 'pointer'; } : undefined}
          onPointerOut={selectable ? () => { gl.domElement.style.cursor = 'auto'; } : undefined}
        />
      </group>
    </group>
  );
}
