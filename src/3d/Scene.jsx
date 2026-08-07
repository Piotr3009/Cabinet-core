import { useRef, useEffect, useMemo } from 'react';
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
import { resolveFinishes, resolveUnitDesign } from '../engine/design.js';
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
 * Lights, rebalanced in turn 6 because the environment now does most of the
 * work. Turn 4 ran an ambient at 1.7 to keep the walls white with no tone
 * mapping; leaving it there on top of an environment map washes every shadow
 * out and the furniture goes flat again. The ambient comes down, the key light
 * goes up, and the walls stay white because the working view still does no tone
 * mapping — that decision from turn 4 stands, and the render is where ACES
 * comes in (renderCapture.js).
 */
function Lights({ roomHeight, roomWidth, shadow }) {
  // The key light's shadow camera has to cover the room. On the default ±5
  // frustum a 4 m kitchen has its far end outside the shadow map, which reads
  // as "shadows work for some units and not others".
  const reach = Math.max(roomWidth, roomHeight) * 1.4 + 2;
  return (
    <>
      {/* Tagged by ROLE, so the render can rebalance them (renderCapture.js)
          without the capture pass having to guess which light is which. */}
      <ambientLight userData={{ ccLight: 'ambient' }} intensity={1.25} />
      <hemisphereLight userData={{ ccLight: 'ambient' }} args={['#ffffff', '#e8e4dd', 0.45]} />
      <directionalLight
        userData={{ ccLight: 'key' }}
        position={[roomWidth * 0.5, roomHeight * 1.6, roomWidth * 1.1]}
        intensity={0.85}
        castShadow
        shadow-mapSize={[shadow.mapSize, shadow.mapSize]}
        shadow-bias={shadow.bias}
        shadow-radius={shadow.radius}
        shadow-camera-left={-reach}
        shadow-camera-right={reach}
        shadow-camera-top={reach}
        shadow-camera-bottom={-reach}
        shadow-camera-near={0.1}
        shadow-camera-far={reach * 4}
      />
      {/* Fill from the other side, so the shadowed face is modelled rather
          than black. No shadow of its own — two shadow maps for one visible
          gain is exactly the kind of cost CLAUDE.md rules out of the working
          view. */}
      <directionalLight
        userData={{ ccLight: 'fill' }}
        position={[-roomWidth * 0.7, roomHeight * 1.1, roomWidth * 0.8]}
        intensity={0.3}
      />
    </>
  );
}

/**
 * Hands the render pass everything it needs — the renderer, the scene, the live
 * camera, and where the furniture actually is — without the modal knowing
 * anything about three.js.
 */
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
      level: result.assemblies.mount === 'wall' ? 'wall' : 'floor',
      label: unit.params.unit_num,
      y: base + profile.dimensions.height,
    };
  }), [results, profile.dimensions.height]);
  const roomW = mm(bounds.width);
  const roomH = mm(room.height ?? 2500);

  return (
    <Canvas
      // "soft" = PCFSoftShadowMap. A shadow with a hard edge under a cabinet
      // is a shadow from a point source, and there are none in a room.
      shadows="soft"
      dpr={[1, 2]}
      // preserveDrawingBuffer: the PDF export reads this canvas back.
      // NoToneMapping: ACES (the R3F default) turns the white walls grey.
      gl={{ preserveDrawingBuffer: true, antialias: true, toneMapping: THREE.NoToneMapping }}
      camera={{ position: [0, roomH * 0.95, mm(bounds.depth) * 1.25 + roomW * 0.35], fov: 38, near: 0.05, far: 100 }}
      // Clicking the background clears the selection and any open menu; the
      // orbit only ever starts from the background or a wall, because every
      // unit mesh stops the event and takes the pointer for itself.
      onPointerMissed={() => { clearSelection(); closeContextMenu(); }}
      onContextMenu={(e) => e.preventDefault()}
      style={{ background: '#fafaf8' }}
    >
      <color attach="background" args={['#fafaf8']} />
      <Environment intensity={profile.appearance.environment.intensity} on={realisticLighting} />
      <Lights roomHeight={roomH} roomWidth={roomW} shadow={profile.render.shadow.normal} />
      <Room room={room} showLabels={showDimensions} />

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
