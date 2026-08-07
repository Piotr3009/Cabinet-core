import { useRef, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import Room from './Room.jsx';
import UnitView from './UnitView.jsx';
import DistanceArrows from './DistanceArrows.jsx';
import { captureRender, furnitureBounds } from './renderCapture.js';
import { mm } from './constants.js';
import { roomWalls, roomBounds } from '../engine/room.js';
import { backStandoff } from '../engine/collision.js';
import { projectSheen, resolveFinishes, resolveUnitDesign } from '../engine/design.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useUiStore } from '../stores/uiStore.js';

// 3D scaffolding follows Production Core's rig (scene / camera / soft light /
// capture), not its window geometry. Preview is 3D from the start (SPEC 7).

// Hands the WebGL canvas to the PDF exporter without a second render pass.
function CaptureRig({ onReady }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    if (!onReady) return undefined;
    // Downscaled JPEG rather than a raw PNG read-back: the full-resolution
    // canvas turns a 3-page PDF into a ~5 MB file for no visible gain.
    const capture = ({ maxWidth = 1600, quality = 0.85 } = {}) => {
      gl.render(scene, camera);           // force a fresh frame before reading
      const src = gl.domElement;
      const scale = Math.min(1, maxWidth / src.width);
      const out = document.createElement('canvas');
      out.width = Math.max(1, Math.round(src.width * scale));
      out.height = Math.max(1, Math.round(src.height * scale));
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#fafaf8';           // JPEG has no alpha channel
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(src, 0, 0, out.width, out.height);
      return { dataUrl: out.toDataURL('image/jpeg', quality), width: out.width, height: out.height };
    };
    onReady(capture);
    return () => onReady(null);
  }, [gl, scene, camera, onReady]);
  return null;
}

/**
 * "Look at THIS." A double click asks for a point and a size; the camera and
 * the orbit target fly there together over a few frames, so the view ends up
 * NEAR the thing that was clicked instead of framing the middle of the room
 * (CLAUDE.md phase 5).
 */
function FocusRig({ request, orbitRef, onDone }) {
  const { camera } = useThree();
  const flight = useRef(null);

  useEffect(() => {
    if (!request) return;
    const target = new THREE.Vector3(...request.target);
    // Keep the direction the user is already looking from; only close in.
    const from = orbitRef.current?.target?.clone() ?? new THREE.Vector3();
    const dir = camera.position.clone().sub(from);
    if (dir.lengthSq() < 1e-6) dir.set(0, 0.4, 1);
    dir.normalize();
    const distance = Math.max(mm(request.radius) * 2.6, 0.7);
    flight.current = {
      target,
      position: target.clone().addScaledVector(dir, distance).setY(Math.max(target.y + distance * 0.35, 0.35)),
      t: 0,
    };
  }, [request, camera, orbitRef]);

  useFrame((_, delta) => {
    const f = flight.current;
    if (!f) return;
    f.t = Math.min(1, f.t + delta * 3);
    const ease = 1 - (1 - f.t) ** 3;
    camera.position.lerp(f.position, ease * 0.35);
    if (orbitRef.current) {
      orbitRef.current.target.lerp(f.target, ease * 0.35);
      orbitRef.current.update();
    }
    if (f.t >= 1) { flight.current = null; onDone?.(); }
  });
  return null;
}

/**
 * The room the furniture is lit BY (turn 6, CLAUDE.md F2 / BACKLOG #37).
 *
 * `RoomEnvironment` ships inside the three package — CLAUDE.md forbids a new
 * dependency AND forbids downloading a .hdr, and this is the answer to both: a
 * little box of emissive panels, rendered once through PMREM into a blurred
 * cube map. What it buys is the thing flat lights cannot fake — a highlight
 * that MOVES across a sprayed door as the camera orbits, and a soft gradient
 * down a white side panel instead of one even tone.
 *
 * Built once per renderer and thrown away with it. Its intensity is a profile
 * number and is turned up for a render.
 */
function Environment({ intensity, on }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    // 64, not the default 256. This is a blurred light probe of a white box —
    // there is no detail in it to lose, and a smaller cube map is a smaller
    // mip chain to walk for every lit pixel of every panel.
    const target = pmrem.fromScene(room, 0.04, 0.1, 100, { size: 64 });
    // Kept on the scene even when the working view has the lighting switched
    // off, so a RENDER can put it back: a still is always lit properly, whatever
    // the editor is set to (3d/renderCapture.js).
    scene.userData.ccEnvironment = target.texture;
    return () => {
      scene.environment = null;
      scene.userData.ccEnvironment = null;
      target.dispose();
      pmrem.dispose();
      room.traverse((o) => {
        o.geometry?.dispose?.();
        const m = o.material;
        for (const one of Array.isArray(m) ? m : [m]) one?.dispose?.();
      });
    };
  }, [gl, scene]);

  useEffect(() => {
    scene.environment = on ? (scene.userData.ccEnvironment || null) : null;
    scene.environmentIntensity = intensity;
  }, [scene, intensity, on]);
  return null;
}

/**
 * ─── The studio rig (turn 8, CLAUDE.md F1 — carried over from Spraying-Calc) ──
 *
 * Piotr's verdict on turn 7's lighting was three words long: no shadow, no
 * depth, white runs into white. He was right, and the cause was arithmetic
 * rather than taste — turn 7 ran an AMBIENT at 1.25 with a KEY at 0.85, and a
 * key light weaker than the flat light it is meant to beat cannot model
 * anything. Everything was lit; nothing was shaped.
 *
 * So the balance is inverted to the one a photographer uses — key 1.0, fill
 * 0.5, rim 0.3, ambient 0.2 — and, crucially, IT IS THE SAME RIG IN BOTH
 * PLACES. Turn 7 lit the editor one way and the still another, so a joiner
 * could not tell from the screen what the customer would be sent. What you see
 * while you work is the picture.
 *
 * The other half of "no shadow" is the shadow CAMERA. It used to be fitted to
 * the room and a bit over: on a 4 m kitchen that is an 8 m frustum, and a 1024
 * map across 8 m is 8 mm per texel — wider than the gap between two cabinets,
 * so the shadow between them simply is not resolved. It is fitted to the
 * FURNITURE now, with `studio.shadowPadding` of margin, so every texel lands on
 * something that casts a shadow.
 */
function Lights({ roomHeight, roomWidth, shadow, studio, subject }) {
  const key = useRef(null);
  // The box the shadow map has to cover, in scene units. Falls back to the room
  // when there is no furniture yet — an empty room casts nothing, but the
  // camera still has to be valid.
  const fit = useMemo(() => {
    const pad = mm(studio.shadowPadding);
    if (!subject) {
      const reach = Math.max(roomWidth, roomHeight) * 0.75 + pad;
      return { centre: [0, roomHeight * 0.4, 0], radius: reach };
    }
    const centre = [0, 1, 2].map((i) => (subject.min[i] + subject.max[i]) / 2);
    const half = [0, 1, 2].map((i) => (subject.max[i] - subject.min[i]) / 2 + pad);
    // A directional light's frustum is square in its own frame; the safe square
    // is the half-diagonal, so the box fits from whatever angle the light is at.
    return { centre, radius: Math.hypot(half[0], half[1], half[2]) };
  }, [subject, roomWidth, roomHeight, studio.shadowPadding]);

  // The light's TARGET has to be in the scene graph for three to use it, and it
  // has to be where the furniture is or the frustum is centred on the room's
  // origin and the cabinets stand at its edge.
  const target = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    target.position.set(...fit.centre);
    target.updateMatrixWorld();
    if (key.current) {
      key.current.target = target;
      key.current.shadow.camera.updateProjectionMatrix();
    }
  }, [target, fit]);

  const reach = fit.radius;
  const distance = Math.max(reach * 2.2, roomHeight * 1.6);

  return (
    <>
      {/* Tagged by ROLE, so a render can still rebalance them
          (renderCapture.js) without the capture pass guessing which is which.
          By default it does not: profile.render.lightScale is all 1s now. */}
      <ambientLight userData={{ ccLight: 'ambient' }} intensity={studio.ambient} />
      <primitive object={target} />
      <directionalLight
        ref={key}
        userData={{ ccLight: 'key' }}
        position={[fit.centre[0] + distance * 0.55, fit.centre[1] + distance * 0.85, fit.centre[2] + distance * 0.7]}
        intensity={studio.key}
        castShadow
        shadow-mapSize={[shadow.mapSize, shadow.mapSize]}
        shadow-bias={shadow.bias}
        shadow-radius={shadow.radius}
        shadow-camera-left={-reach}
        shadow-camera-right={reach}
        shadow-camera-top={reach}
        shadow-camera-bottom={-reach}
        shadow-camera-near={0.05}
        shadow-camera-far={distance * 3}
      />
      {/* Fill from the other side, so the shadowed face is modelled rather
          than black. No shadow of its own — two shadow maps for one visible
          gain is exactly the kind of cost CLAUDE.md rules out of the working
          view. */}
      <directionalLight
        userData={{ ccLight: 'fill' }}
        position={[fit.centre[0] - distance * 0.8, fit.centre[1] + distance * 0.5, fit.centre[2] + distance * 0.55]}
        intensity={studio.fill}
      />
      {/* Rim, from behind and above: the light that draws a bright edge down
          the side of a white cabinet standing against a white wall. It is what
          separates one from the next when nothing else does. */}
      <directionalLight
        userData={{ ccLight: 'rim' }}
        position={[fit.centre[0] - distance * 0.3, fit.centre[1] + distance * 0.6, fit.centre[2] - distance * 0.9]}
        intensity={studio.rim}
      />
    </>
  );
}

/** ACES, at the rig's exposure — in the working view as well as in a still. */
function ToneMapping({ exposure }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = exposure;
  }, [gl, exposure]);
  return null;
}

/**
 * Hands the render pass everything it needs — the renderer, the scene, the live
 * camera, and where the furniture actually is — without the modal knowing
 * anything about three.js.
 */
/**
 * Where the furniture is, for the key light's shadow camera (turn 8, F1).
 *
 * Measured after the frame the units were drawn in — the groups' world matrices
 * do not exist before that — and only when the units change, so an orbit does
 * not walk 400 meshes per frame.
 */
function ShadowFit({ signal, unitsRef, onFit }) {
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      onFit(furnitureBounds(Object.values(unitsRef.current).filter(Boolean)));
    });
    return () => cancelAnimationFrame(id);
  }, [signal, unitsRef, onFit]);
  return null;
}

function RenderRig({ onReady, unitsRef }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    if (!onReady) return undefined;
    onReady({
      aspect: () => {
        const el = gl.domElement;
        const w = el.clientWidth || el.width || 16;
        const h = el.clientHeight || el.height || 9;
        return w / h;
      },
      bounds: (unitId = null) => {
        const groups = Object.entries(unitsRef.current)
          .filter(([id]) => !unitId || id === unitId)
          .map(([, group]) => group)
          .filter(Boolean);
        return furnitureBounds(groups);
      },
      capture: (job) => captureRender({ gl, scene, camera }, job),
    });
    return () => onReady(null);
  }, [gl, scene, camera, onReady, unitsRef]);
  return null;
}

export default function Scene({ onCaptureReady, onRenderReady }) {
  const orbitRef = useRef(null);
  // One entry per unit group, so the render can frame the furniture and only
  // the furniture (and one selected unit, when one is selected).
  const unitGroups = useRef({});
  const room = useProjectStore((s) => s.project.room);
  const design = useProjectStore((s) => s.project.design);
  const units = useProjectStore((s) => s.units);
  const moveUnit = useProjectStore((s) => s.moveUnit);
  const allResults = useProjectStore((s) => s.allResults);
  const wallGapsFor = useProjectStore((s) => s.wallGapsFor);
  const moveShelf = useProjectStore((s) => s.moveShelf);
  const setTopInfill = useProjectStore((s) => s.setTopInfill);
  const fillToCeiling = useProjectStore((s) => s.fillToCeiling);
  const setEndPanelTop = useProjectStore((s) => s.setEndPanelTop);
  const endPanelToCeiling = useProjectStore((s) => s.endPanelToCeiling);
  const setSideInfillTop = useProjectStore((s) => s.setSideInfillTop);
  const sideInfillToCeiling = useProjectStore((s) => s.sideInfillToCeiling);
  const selectedUnitId = useUiStore((s) => s.selectedUnitId);
  const selectUnit = useUiStore((s) => s.selectUnit);
  const clearSelection = useUiStore((s) => s.clearSelection);
  const snapStep = useUiStore((s) => s.snapStep);
  const shelfDrag = useUiStore((s) => s.dragging);
  const setShelfDrag = useUiStore((s) => s.setDragging);
  const openFronts = useUiStore((s) => s.openFronts);
  const toggleFront = useUiStore((s) => s.toggleFront);
  const focusRequest = useUiStore((s) => s.focusRequest);
  const focusOn = useUiStore((s) => s.focusOn);
  const clearFocus = useUiStore((s) => s.clearFocus);
  const openContextMenu = useUiStore((s) => s.openContextMenu);
  const closeContextMenu = useUiStore((s) => s.closeContextMenu);
  const showDimensions = useUiStore((s) => s.showDimensions);
  const unitDimensions = useUiStore((s) => s.unitDimensions);
  const dimensionColour = useUiStore((s) => s.dimensionColour);
  const showOutlines = useUiStore((s) => s.showOutlines);
  const contourView = useUiStore((s) => s.contourView);
  const xray = useUiStore((s) => s.xray);
  const realisticLighting = useUiStore((s) => s.realisticLighting);
  const profile = useCabinetProfileStore((s) => s.profile);

  // `units` is the subscription that drives the re-render; allResults() is a
  // stable store function, so deriving from it alone would never update.
  const results = useMemo(() => allResults(), [units, allResults]);
  const walls = useMemo(() => roomWalls(room), [room]);
  const bounds = useMemo(() => roomBounds(room), [room]);

  // What the distance arrows measure. Derived from the SAME results the boxes
  // are drawn from, so an arrow cannot describe a unit that is somewhere else —
  // and a drag updates it frame by frame with no drag state of its own.
  const measured = useMemo(() => results.map(({ unit, result }) => {
    const base = result.assemblies.mount === 'wall'
      ? (result.assemblies.mountHeight || 0)
      : (result.assemblies.carcass.legHeight || 0);
    return {
      id: unit.id,
      wall: unit.position?.wall ?? 0,
      x_mm: Number(unit.position?.x_mm) || 0,
      width: Number(unit.params.width) || 0,
      depth: Number(unit.params.depth) || 0,
      rotation: Number(unit.position?.rotation_deg) || 0,
      // A unit stood off the wall is measured where it stands (turn 7,
      // CLAUDE.md F5): the arrow reads the real distance, not the one it would
      // be at if it were pushed back.
      backInset: backStandoff(unit, profile),
      level: result.assemblies.mount === 'wall' ? 'wall' : 'floor',
      label: unit.params.unit_num,
      y: base + profile.dimensions.height,
    };
  }), [results, profile.dimensions.height]);
  const roomW = mm(bounds.width);
  const roomH = mm(room.height ?? 2500);
  // What the project's sprayed surfaces are polished to, on Piotr's 0–25 scale.
  const sheen = useMemo(() => projectSheen(design, profile), [design, profile]);
  const studio = profile.appearance.studio;
  const [subject, setSubject] = useState(null);
  // Recomputed with the units, not per frame: a door swing is decided by where
  // the cabinets stand, and that only changes when one of them moves.
  const wallGaps = useMemo(
    () => Object.fromEntries(units.map((u) => [u.id, wallGapsFor(u.id)])),
    [units, wallGapsFor],
  );

  return (
    <Canvas
      // "soft" = PCFSoftShadowMap. A shadow with a hard edge under a cabinet
      // is a shadow from a point source, and there are none in a room.
      shadows="soft"
      dpr={[1, 2]}
      // preserveDrawingBuffer: the PDF export reads this canvas back.
      // Tone mapping is ACES and is set by <ToneMapping> below rather than here,
      // because it is now one setting shared with the render pass (turn 8, F1).
      // Turn 7 ran the working view flat to keep the walls white; the price was
      // a view that could not be trusted to predict the still.
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{ position: [0, roomH * 0.95, mm(bounds.depth) * 1.25 + roomW * 0.35], fov: 38, near: 0.05, far: 100 }}
      // Clicking the background clears the selection and any open menu; the
      // orbit only ever starts from the background or a wall, because every
      // unit mesh stops the event and takes the pointer for itself.
      onPointerMissed={() => { clearSelection(); closeContextMenu(); }}
      onContextMenu={(e) => e.preventDefault()}
      style={{ background: '#fafaf8' }}
    >
      <color attach="background" args={['#fafaf8']} />
      <ToneMapping exposure={studio.exposure} />
      <Environment intensity={profile.appearance.environment.intensity} on={realisticLighting} />
      <Lights
        roomHeight={roomH}
        roomWidth={roomW}
        shadow={profile.render.shadow.normal}
        studio={studio}
        subject={subject}
      />
      <ShadowFit signal={results} unitsRef={unitGroups} onFit={setSubject} />
      <Room room={room} showLabels={showDimensions} profile={profile} />

      {results.map(({ unit, result }) => (
        <UnitView
          key={unit.id}
          unit={unit}
          result={result}
          groupRef={(group) => {
            if (group) unitGroups.current[unit.id] = group;
            else delete unitGroups.current[unit.id];
          }}
          wall={walls[unit.position?.wall ?? 0] || walls[0]}
          roomCentre={bounds.centre}
          selected={unit.id === selectedUnitId}
          snapStep={snapStep}
          onSelect={() => selectUnit(unit.id)}
          onMove={(x, step) => moveUnit(unit.id, x, step)}
          onMoveShelf={(itemId, pos, step) => moveShelf(unit.id, itemId, pos, step)}
          onShelfDragState={setShelfDrag}
          shelfDrag={shelfDrag}
          orbitRef={orbitRef}
          openFronts={openFronts[unit.id]}
          onToggleFront={(panelId) => toggleFront(unit.id, panelId)}
          onFocus={(point, sizeMm) => focusOn([point.x, point.y, point.z], sizeMm)}
          onContextMenu={(menu) => openContextMenu({ ...menu, unitId: unit.id })}
          frontColour={resolveUnitDesign(unit, design).colour?.hex || null}
          onSetTopInfill={(h) => setTopInfill(unit.id, h)}
          onFillToCeiling={() => fillToCeiling(unit.id)}
          onSetEndPanelTop={(panelId, v) => setEndPanelTop(unit.id, panelId, v)}
          onEndPanelToCeiling={(panelId) => endPanelToCeiling(unit.id, panelId)}
          onSetSideInfillTop={(side, v) => setSideInfillTop(unit.id, side, v)}
          onSideInfillToCeiling={(side) => sideInfillToCeiling(unit.id, side)}
          showLabels={showDimensions && !contourView}
          profile={profile}
          finishes={resolveFinishes(unit, design, profile)}
          outlines={showOutlines}
          contour={contourView}
          xray={xray}
          grounded={realisticLighting}
          sheen={sheen}
          // How much clear WALL is beside this unit, per side. The door swing
          // reads it: past square a door comes back towards the wall on its
          // hinge side (turn 8, CLAUDE.md F5).
          wallGaps={wallGaps[unit.id]}
          // The right-click toggle: every number THIS cabinet has (turn 8, F7).
          showAllDims={Boolean(unitDimensions[unit.id])}
        />
      ))}

      {/* Contour view is for a render or a printout: the numbers would be
          in the way of the only thing it is for. */}
      {showDimensions && !contourView && (
        <group userData={{ ccHelper: true }}>
          <DistanceArrows
            walls={walls}
            units={measured}
            roomCentre={bounds.centre}
            profile={profile}
            colourKey={dimensionColour}
          />
        </group>
      )}

      <FocusRig request={focusRequest} orbitRef={orbitRef} onDone={clearFocus} />

      <OrbitControls
        ref={orbitRef}
        makeDefault
        target={[0, roomH * 0.45, 0]}
        minDistance={0.8}
        maxDistance={24}
        maxPolarAngle={Math.PI / 2}
        enableDamping
        dampingFactor={0.12}
      />
      <CaptureRig onReady={onCaptureReady} />
      <RenderRig onReady={onRenderReady} unitsRef={unitGroups} />
    </Canvas>
  );
}
