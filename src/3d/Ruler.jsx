import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { mm, MM } from './constants.js';
import DimLabel from './DimLabel.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { formatMm, snap } from '../engine/format.js';
import { rulerDistance } from '../engine/ruler.js';
import { nearestSnap, snapTargets } from '../lib/rulerSnaps.js';

// ─── THE RULER (turn 17, CLAUDE.md F11) ─────────────────────────────────────
//
// "A ruler in the canvas: click one point, click another, read the distance in
// mm. formatMm, 0.5 mm, palette colours, Escape cancels. It measures; it never
// edits."
//
// The last sentence is the design and it is why this is a component of its own
// rather than a mode inside the selection code. Nothing here writes to the
// project store. It cannot move a cabinet, it cannot change a number, and the
// worst thing a mis-click can do is put a dot somewhere and want another click.
//
// ─── TURN 20 (CLAUDE.md F6): IT CATCHES THE POINTS A JOINER MEANS ───────────
//
// Owner: "the tape grabs wherever the ray lands." It did — turn 17 measured to
// the exact spot on a face the ray happened to hit, which is a number nobody
// can cut to. It measures OBJECT SNAPS now, AutoCAD's own three:
//
//   END  the corners of every visible panel — a square marker
//   MID  the midpoints of its edges       — a triangle
//   INT  where two panels meet            — a cross
//
// and the marker is the whole of the feedback: a joiner who works in AutoCAD
// reads it without a legend, and F6.3's rule — "a click WITHOUT a caught point
// places nothing" — means the tape can only ever have measured points it
// showed you first.
//
// WHERE THE BOXES COME FROM. The scene itself, not the store: every panel mesh
// carries `ccPanelId` (turn 16) and every overlay carries `ccHelper`, so the
// visible furniture is exactly what a walk of the graph finds. That also makes
// it right by construction — the snaps are on what is ON SCREEN, including a
// cabinet the room has moved and a drawer that is standing open.
//
// The arithmetic is `lib/rulerSnaps.js`, which is pure and has no camera in it.
// This file does the three things that need three.js: it reads the boxes,
// projects them, and draws the marks.

/** Scene units → millimetres. `mm()` is the other way round. */
const toMm = (v) => v / MM;

/** AutoCAD's own shapes, so the owner reads them without a legend. */
const MARKER_COLOURS = { END: '#E0B64A', MID: '#7FD1AE', INT: '#E08A4A' };

export default function Ruler() {
  const on = useUiStore((s) => s.rulerOn);
  const points = useUiStore((s) => s.rulerPoints);
  const addPoint = useUiStore((s) => s.addRulerPoint);
  const clear = useUiStore((s) => s.clearRuler);
  const setRuler = useUiStore((s) => s.setRuler);
  // The workshop's own grid. F11 asks for `formatMm` AND half a millimetre,
  // and they are two different rules: one is how a number is printed, the other
  // is what numbers this workshop works in. A tape that reads 2583.13 is a tape
  // nobody writes down.
  const step = useCabinetProfileStore((s) => s.profile.editor.mmStep);
  const R = useCabinetProfileStore((s) => s.profile.editor.ruler);
  const { gl, camera, scene } = useThree();
  // The point currently under the magnet, or null. State and nothing else — it
  // reaches no store and no project.
  const [caught, setCaught] = useState(null);
  const targets = useRef([]);

  // A HELPER is anything the app draws ON the furniture rather than as
  // furniture. Walking up the parents matters: an overlay is usually a group
  // with the flag and a mesh without it.
  const isHelper = useCallback((object) => {
    for (let o = object; o; o = o.parent) if (o.userData?.ccHelper) return true;
    return false;
  }, []);

  /**
   * Every visible panel's world box, in room millimetres.
   *
   * Rebuilt when the tool is switched on and on every gesture, not per frame:
   * a scene of fourteen cabinets is a few hundred boxes and the projection
   * below is what runs under the cursor.
   */
  const collect = useCallback(() => {
    const boxes = [];
    const box3 = new THREE.Box3();
    scene.traverse((object) => {
      if (!object.isMesh || !object.visible || isHelper(object)) return;
      let owner = object;
      for (let o = object; o; o = o.parent) if (o.userData?.ccPanelId) { owner = o; break; }
      const id = owner.userData?.ccPanelId;
      if (!id) return;
      box3.setFromObject(object);
      if (box3.isEmpty()) return;
      boxes.push({
        id: `${id}:${object.id}`,
        min: [toMm(box3.min.x), toMm(box3.min.y), toMm(box3.min.z)],
        max: [toMm(box3.max.x), toMm(box3.max.y), toMm(box3.max.z)],
      });
    });
    return snapTargets(boxes, { contactMm: R.contactMm });
  }, [scene, isHelper, R.contactMm]);

  useEffect(() => {
    if (!on) { setCaught(null); targets.current = []; return undefined; }
    const el = gl.domElement;

    /** A room-millimetre point, in client pixels. */
    const project = (p) => {
      const rect = el.getBoundingClientRect();
      const v = new THREE.Vector3(mm(p[0]), mm(p[1]), mm(p[2])).project(camera);
      return {
        x: rect.left + ((v.x + 1) / 2) * rect.width,
        y: rect.top + ((1 - v.y) / 2) * rect.height,
        behind: v.z > 1,
      };
    };

    targets.current = collect();

    const onMove = (e) => {
      // The scene can have changed under the cursor — a unit dragged, a drawer
      // opened — so the boxes are refreshed on the move that follows it. It is
      // one traverse, and only while the tape is out.
      if (!targets.current.length) targets.current = collect();
      const hit = nearestSnap(targets.current, project, { x: e.clientX, y: e.clientY }, R.snapPx);
      setCaught(hit ? { kind: hit.kind, p: hit.p, of: hit.of } : null);
    };

    const onDown = (e) => {
      if (e.button !== 0) return;
      // Capture-phase, and stopped: nothing downstream — r3f's own pointer
      // handling, the orbit controls, the context menu — sees this click.
      e.preventDefault();
      e.stopPropagation();
      // ─── F6.3: THE TAPE MEASURES POINTS, NOT AIR ───────────────────────
      // A click with nothing caught places NOTHING. That is what makes the
      // marker the whole of the feedback: every point the tape has ever
      // measured is a point it showed you first.
      const hit = nearestSnap(targets.current, project, { x: e.clientX, y: e.clientY }, R.snapPx);
      if (!hit) return;
      addPoint([hit.p[0], hit.p[1], hit.p[2]]);
    };

    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      // Escape cancels: a half-taken measurement first, then the tool itself.
      // Two steps, because "I clicked in the wrong place" is a different
      // sentence from "I have finished measuring".
      if (useUiStore.getState().rulerPoints.length) clear();
      else setRuler(false);
    };

    // A fresh gesture re-reads the scene: cheap, and it is what keeps the
    // snaps honest when a cabinet has been moved since the tool came out.
    const refresh = () => { targets.current = collect(); };

    el.addEventListener('pointerdown', onDown, true);
    el.addEventListener('pointermove', onMove, true);
    el.addEventListener('pointerleave', () => setCaught(null), true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('cc:scene-changed', refresh);
    const previous = el.style.cursor;
    el.style.cursor = 'crosshair';
    return () => {
      el.removeEventListener('pointerdown', onDown, true);
      el.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('cc:scene-changed', refresh);
      el.style.cursor = previous;
    };
  }, [on, gl, camera, scene, addPoint, clear, setRuler, collect, R.snapPx]);

  const line = useMemo(() => {
    if (points.length < 2) return null;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(
      [...points[0], ...points[1]].map(mm),
    ), 3));
    return geometry;
  }, [points]);

  useEffect(() => () => line?.dispose(), [line]);

  if (!on) return null;
  const [a, b] = points;
  const span = b ? snap(rulerDistance(a, b), step) : 0;
  const midpoint = b
    ? [mm((a[0] + b[0]) / 2), mm((a[1] + b[1]) / 2) + 0.06, mm((a[2] + b[2]) / 2)]
    : null;

  return (
    // `ccHelper`, like every other overlay: it must not appear in a render, it
    // must not cast a shadow, and — the reason that matters here — the ruler
    // must not be able to measure to its own marks.
    <group userData={{ ccHelper: true }}>
      {points.map((p, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <mesh key={`m${i}`} position={[mm(p[0]), mm(p[1]), mm(p[2])]} userData={{ ccHelper: true }}>
          <sphereGeometry args={[0.012, 12, 12]} />
          <meshBasicMaterial color="#AA8E68" depthTest={false} toneMapped={false} />
        </mesh>
      ))}
      {line && (
        <lineSegments geometry={line} userData={{ ccHelper: true }}>
          <lineBasicMaterial color="#AA8E68" depthTest={false} toneMapped={false} />
        </lineSegments>
      )}
      {midpoint && (
        <DimLabel position={midpoint} text={`${formatMm(span)} mm`} tone="gold" variant="flat" />
      )}
      {/* ─── F6.2: THE MARKER, WHILE THE POINT IS CAUGHT ───────────────────
          AutoCAD's own vocabulary, so the owner reads it without a legend. */}
      {caught && <SnapMarker point={caught.p} kind={caught.kind} sizePx={R.markerPx} />}
    </group>
  );
}

/**
 * The square / triangle / cross that says a point has been caught.
 *
 * Drawn as lines that always face the camera and always measure the same on
 * screen: a marker is part of the TOOL, not part of the furniture, so it must
 * not shrink into the distance the way a cabinet does. `depthTest={false}`
 * keeps it visible through the board it is on the far corner of, which is what
 * an osnap marker does in every CAD package.
 */
function SnapMarker({ point, kind, sizePx = 11 }) {
  const { camera, size } = useThree();
  const geometry = useMemo(() => {
    // How many scene units the marker's pixels are worth AT THIS POINT: the
    // perspective camera's own vertical FOV over the distance to it.
    const at = new THREE.Vector3(mm(point[0]), mm(point[1]), mm(point[2]));
    const distance = camera.position.distanceTo(at);
    const perPixel = camera.isPerspectiveCamera
      ? (2 * Math.tan((camera.fov * Math.PI) / 360) * distance) / Math.max(1, size.height)
      : 0.002;
    const r = (sizePx / 2) * perPixel;
    const shape = MARKER_SHAPES[kind] || MARKER_SHAPES.END;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(
      shape.flatMap(([x, y]) => [x * r, y * r, 0]),
    ), 3));
    return g;
  }, [point, kind, sizePx, camera, size.height]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group
      position={[mm(point[0]), mm(point[1]), mm(point[2])]}
      quaternion={camera.quaternion}
      userData={{ ccHelper: true }}
      data-snap-kind={kind}
    >
      <lineSegments geometry={geometry} userData={{ ccHelper: true, ccSnapKind: kind }}>
        <lineBasicMaterial
          color={MARKER_COLOURS[kind] || MARKER_COLOURS.END}
          depthTest={false}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  );
}

/**
 * The three shapes, as line SEGMENTS in a unit square — AutoCAD's own:
 * a square on an endpoint, a triangle on a midpoint, a cross on an
 * intersection.
 */
const MARKER_SHAPES = {
  END: [
    [-1, -1], [1, -1], [1, -1], [1, 1], [1, 1], [-1, 1], [-1, 1], [-1, -1],
  ],
  MID: [
    [-1, -0.85], [1, -0.85], [1, -0.85], [0, 1], [0, 1], [-1, -0.85],
  ],
  INT: [
    [-1, -1], [1, 1], [-1, 1], [1, -1],
  ],
};
