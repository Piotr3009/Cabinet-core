import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { mm, MM } from './constants.js';
import DimLabel from './DimLabel.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { formatMm } from '../engine/format.js';
import { rulerDistance } from '../engine/ruler.js';

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
// ─── HOW IT PICKS A POINT ───────────────────────────────────────────────────
//
// By raycasting the scene itself, on the CANVAS element, in the CAPTURE phase.
// Three consequences, all of them wanted:
//
//   • It measures whatever is there — a cabinet's corner, a worktop edge, the
//     floor, a wall — rather than only the floor plane. A joiner measuring a
//     run is measuring furniture.
//   • Stopping the event in capture means react-three-fiber never sees it, so a
//     click while measuring cannot select a unit, open a menu or start a drag.
//     A tool that quietly edited while you measured would be the one thing F11
//     forbids.
//   • The HELPERS are filtered out. Every overlay in this app carries
//     `ccHelper` — the dimension arrows, the selection box, the add-plus, and
//     the ruler's own marks — and measuring to a label floating in the air is
//     measuring nothing.
//
// Distances are in the room's own millimetres and printed with `formatMm`, so
// the ruler reads in exactly the units the cut list does, on the workshop's
// half-millimetre grid.

/** Scene units → millimetres. `mm()` is the other way round. */
const toMm = (v) => v / MM;

export default function Ruler() {
  const on = useUiStore((s) => s.rulerOn);
  const points = useUiStore((s) => s.rulerPoints);
  const addPoint = useUiStore((s) => s.addRulerPoint);
  const clear = useUiStore((s) => s.clearRuler);
  const setRuler = useUiStore((s) => s.setRuler);
  const { gl, camera, scene } = useThree();

  useEffect(() => {
    if (!on) return undefined;
    const el = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    // A HELPER is anything the app draws ON the furniture rather than as
    // furniture. Walking up the parents matters: an overlay is usually a group
    // with the flag and a mesh without it.
    const isHelper = (object) => {
      for (let o = object; o; o = o.parent) if (o.userData?.ccHelper) return true;
      return false;
    };

    const onDown = (e) => {
      if (e.button !== 0) return;
      const rect = el.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(scene.children, true)
        .find((i) => i.object.visible && !isHelper(i.object));
      if (!hit) return;
      // Capture-phase, and stopped: nothing downstream — r3f's own pointer
      // handling, the orbit controls, the context menu — sees this click.
      e.preventDefault();
      e.stopPropagation();
      addPoint([toMm(hit.point.x), toMm(hit.point.y), toMm(hit.point.z)]);
    };

    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      // Escape cancels: a half-taken measurement first, then the tool itself.
      // Two steps, because "I clicked in the wrong place" is a different
      // sentence from "I have finished measuring".
      if (useUiStore.getState().rulerPoints.length) clear();
      else setRuler(false);
    };

    el.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey);
    const previous = el.style.cursor;
    el.style.cursor = 'crosshair';
    return () => {
      el.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey);
      el.style.cursor = previous;
    };
  }, [on, gl, camera, scene, addPoint, clear, setRuler]);

  const line = useMemo(() => {
    if (points.length < 2) return null;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(
      [...points[0], ...points[1]].map(mm),
    ), 3));
    return geometry;
  }, [points]);

  useEffect(() => () => line?.dispose(), [line]);

  if (!on || !points.length) return null;
  const [a, b] = points;
  const span = b ? rulerDistance(a, b) : 0;
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
    </group>
  );
}
