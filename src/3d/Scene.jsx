import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Room from './Room.jsx';
import UnitView from './UnitView.jsx';
import { mm } from './constants.js';
import { roomWalls, roomBounds } from '../engine/room.js';
import { useProjectStore } from '../stores/projectStore.js';
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

function Lights({ roomHeight, roomWidth }) {
  return (
    <>
      {/* Soft, flat light: white walls must read as WHITE, not as a render. */}
      <ambientLight intensity={1.7} />
      <hemisphereLight args={['#ffffff', '#efedea', 0.45]} />
      <directionalLight
        position={[roomWidth * 0.5, roomHeight * 1.6, roomWidth * 1.1]}
        intensity={0.35}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0006}
      />
      <directionalLight position={[-roomWidth * 0.7, roomHeight * 1.1, roomWidth * 0.8]} intensity={0.22} />
    </>
  );
}

export default function Scene({ onCaptureReady }) {
  const orbitRef = useRef(null);
  const room = useProjectStore((s) => s.project.room);
  const units = useProjectStore((s) => s.units);
  const moveUnit = useProjectStore((s) => s.moveUnit);
  const allResults = useProjectStore((s) => s.allResults);
  const moveShelf = useProjectStore((s) => s.moveShelf);
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

  // `units` is the subscription that drives the re-render; allResults() is a
  // stable store function, so deriving from it alone would never update.
  const results = useMemo(() => allResults(), [units, allResults]);
  const walls = useMemo(() => roomWalls(room), [room]);
  const bounds = useMemo(() => roomBounds(room), [room]);
  const roomW = mm(bounds.width);
  const roomH = mm(room.height ?? 2500);

  return (
    <Canvas
      shadows
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
      <Lights roomHeight={roomH} roomWidth={roomW} />
      <Room room={room} />

      {results.map(({ unit, result }) => (
        <UnitView
          key={unit.id}
          unit={unit}
          result={result}
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
        />
      ))}

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
    </Canvas>
  );
}
