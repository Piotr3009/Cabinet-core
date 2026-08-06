import { useCallback, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { mm, MM, COLORS, colorForRole, edgeColorForRole } from './constants.js';
import DimLabel from './DimLabel.jsx';

// One unit, rendered straight from the ENGINE output: every panel record
// carries a `box` in cabinet-local mm, so what you see is what the cut list
// says (CLAUDE.md phase 2). Nothing here re-derives a dimension.

export default function UnitView({
  unit, result, wall, roomCentre, selected, snapStep, onSelect, onMove, onMoveShelf, onShelfDragState,
  orbitRef, showLabels = true, shelfDrag = null,
}) {
  const { camera, gl } = useThree();
  const drag = useRef(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const wallWidthMm = wall.width;

  const W = unit.params.width;
  const H = unit.params.height;
  const D = unit.params.depth;
  const legHeight = result.assemblies.carcass.legHeight || 0;
  // A wall unit stands on nothing — it hangs at its mounting height. Every
  // other type stands on its legs. Both numbers come from the engine.
  const isWallMounted = result.assemblies.mount === 'wall';
  const baseY = isWallMounted ? result.assemblies.mountHeight : legHeight;

  // Where this unit stands: at `x_mm` along its wall, back against it, with the
  // room centred on the world origin. Every number comes from engine/room.js,
  // so a unit on wall 3 of an L-shaped room needs no special case here.
  const wallStart = useMemo(() => new THREE.Vector3(
    mm(wall.start.x - roomCentre.x), 0, mm(wall.start.y - roomCentre.y),
  ), [wall.start.x, wall.start.y, roomCentre.x, roomCentre.y]);
  const along = useMemo(() => new THREE.Vector3(wall.along.x, 0, wall.along.y), [wall.along.x, wall.along.y]);
  const inward = useMemo(() => new THREE.Vector3(wall.inward.x, 0, wall.inward.y), [wall.inward.x, wall.inward.y]);

  // A vertical plane parallel to the wall, halfway into the cabinet — the ray
  // is intersected with it so the unit follows the cursor instead of itself.
  const dragPlane = useMemo(() => {
    const point = wallStart.clone().addScaledVector(inward, mm(D / 2));
    return new THREE.Plane().setFromNormalAndCoplanarPoint(inward, point);
  }, [wallStart, inward, D]);

  const pointerToPlane = useCallback((clientX, clientY) => {
    const rect = gl.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    const target = new THREE.Vector3();
    return raycaster.ray.intersectPlane(dragPlane, target) ? target : null;
  }, [camera, gl, raycaster, dragPlane]);

  // Listeners live on `window` (not the mesh) so a fast drag that outruns the
  // cursor does not drop; they are local closures, so removal always matches
  // the exact function that was added.
  /** Distance of a world point along the wall, in mm from the wall's start. */
  const alongMm = useCallback((point) => point.clone().sub(wallStart).dot(along) / MM, [wallStart, along]);

  const startDrag = useCallback((e) => {
    e.stopPropagation();
    onSelect();
    const hit = pointerToPlane(e.clientX, e.clientY);
    if (!hit) return;
    drag.current = { offset: alongMm(hit) - unit.position.x_mm };
    if (orbitRef?.current) orbitRef.current.enabled = false;

    const move = (ev) => {
      if (!drag.current) return;
      const p = pointerToPlane(ev.clientX, ev.clientY);
      if (!p) return;
      onMove(alongMm(p) - drag.current.offset, snapStep);
    };
    const up = () => {
      drag.current = null;
      if (orbitRef?.current) orbitRef.current.enabled = true;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }, [onSelect, pointerToPlane, alongMm, unit.position.x_mm, orbitRef, onMove, snapStep]);

  // Cabinet origin: on its wall, back against it (local z = 0 is the wall
  // face), standing on its legs or hanging at its mount height.
  const origin = useMemo(
    () => wallStart.clone().addScaledVector(along, mm(unit.position.x_mm)).setY(mm(baseY)),
    [wallStart, along, unit.position.x_mm, baseY],
  );
  const originY = mm(baseY);

  // Vertical shelf drag (SPEC 4.8). Same plane, but the Y of the hit is used;
  // clamping and snapping live in the store so the rules stay in one place.
  const startShelfDrag = useCallback((e, itemId, currentPosMm) => {
    if (!itemId || !onMoveShelf) return;
    e.stopPropagation();
    onSelect();
    const hit = pointerToPlane(e.clientX, e.clientY);
    if (!hit) return;
    // Keep the grab point: the shelf must not jump to the cursor on mouse-down.
    const grabDelta = currentPosMm - (hit.y - originY) / MM;
    if (orbitRef?.current) orbitRef.current.enabled = false;

    const move = (ev) => {
      const p = pointerToPlane(ev.clientX, ev.clientY);
      if (!p) return;
      const posMm = (p.y - originY) / MM + grabDelta;
      const state = onMoveShelf(itemId, posMm, snapStep);
      if (state && onShelfDragState) onShelfDragState({ unitId: unit.id, itemId, ...state });
    };
    const up = () => {
      if (orbitRef?.current) orbitRef.current.enabled = true;
      if (onShelfDragState) onShelfDragState(null);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }, [onMoveShelf, onSelect, pointerToPlane, originY, orbitRef, snapStep, onShelfDragState, unit.id]);

  return (
    <group position={origin} rotation={[0, wall.angle, 0]}>
      {result.panels.filter((p) => p.box).map((p) => {
        const shelfId = p.part === 'SHELF' ? p.meta?.itemId : null;
        const beingDragged = shelfDrag?.itemId && shelfDrag.itemId === shelfId;
        return (
          <mesh
            key={p.id}
            position={[mm(p.box.x + p.box.w / 2), mm(p.box.y + p.box.h / 2), mm(p.box.z + p.box.d / 2)]}
            castShadow
            receiveShadow
            onPointerDown={shelfId ? (e) => startShelfDrag(e, shelfId, p.box.y) : startDrag}
            onPointerOver={shelfId ? () => { document.body.style.cursor = 'ns-resize'; } : undefined}
            onPointerOut={shelfId ? () => { document.body.style.cursor = ''; } : undefined}
          >
            <boxGeometry args={[mm(p.box.w), mm(p.box.h), mm(p.box.d)]} />
            <meshStandardMaterial
              color={beingDragged ? COLORS.goldSoft : colorForRole(p.role)}
              roughness={0.72}
              metalness={0.02}
              transparent={p.role === 'front'}
              opacity={p.role === 'front' ? 0.93 : 1}
            />
            <Edges threshold={15} color={selected || beingDragged ? COLORS.gold : edgeColorForRole(p.role)} />
          </mesh>
        );
      })}

      {/* live dimension while a shelf is being dragged (SPEC 4.8) */}
      {shelfDrag && shelfDrag.unitId === unit.id && (
        <>
          {shelfDrag.below != null && (
            <DimLabel
              position={[mm(W / 2), mm((shelfDrag.below + shelfDrag.pos) / 2), mm(D) + 0.06]}
              text={`${Math.round(shelfDrag.pos - shelfDrag.below)}`}
              tone="gold"
            />
          )}
          {shelfDrag.above != null && (
            <DimLabel
              position={[mm(W / 2), mm((shelfDrag.above + shelfDrag.pos) / 2), mm(D) + 0.06]}
              text={`${Math.round(shelfDrag.above - shelfDrag.pos)}`}
              tone="gold"
            />
          )}
          <DimLabel position={[mm(W) + 0.17, mm(shelfDrag.pos), mm(D)]} text={`${Math.round(shelfDrag.pos)} mm`} tone="gold" />
        </>
      )}

      {/* hanging rail — hardware, not a cut piece */}
      {result.assemblies.rail && (
        <mesh
          position={[
            mm((result.assemblies.rail.x1 + result.assemblies.rail.x2) / 2),
            mm(result.assemblies.rail.y),
            mm(result.assemblies.rail.z),
          ]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[mm(15), mm(15), mm(result.assemblies.rail.x2 - result.assemblies.rail.x1), 12]} />
          <meshStandardMaterial color={COLORS.rail} roughness={0.4} metalness={0.6} />
        </mesh>
      )}

      {/* legs — the engine's own layout: four in the corners, a fifth in the
          middle over the width threshold. The view places what it is given. */}
      {result.assemblies.legs?.positions.map((leg, i) => (
        <mesh
          key={`leg-${i}`}
          position={[mm(leg.x + result.assemblies.legs.width / 2), mm(-legHeight / 2), mm(leg.z + result.assemblies.legs.width / 2)]}
        >
          <boxGeometry args={[mm(result.assemblies.legs.width), mm(legHeight), mm(result.assemblies.legs.width)]} />
          <meshStandardMaterial color="#4a4a4a" roughness={0.6} />
        </mesh>
      ))}

      {/* wall unit: the bracket line it hangs from, so it does not read as
          floating by accident */}
      {isWallMounted && (
        <mesh position={[mm(W / 2), mm(H) + 0.004, mm(6)]}>
          <boxGeometry args={[mm(W), 0.006, mm(12)]} />
          <meshStandardMaterial color="#8d8d92" roughness={0.5} metalness={0.4} />
        </mesh>
      )}

      {/* selection outline — gold, around the whole carcass */}
      {selected && (
        <mesh position={[mm(W / 2), mm(H / 2), mm(D / 2)]}>
          <boxGeometry args={[mm(W) + 0.006, mm(H) + 0.006, mm(D) + 0.006]} />
          <meshBasicMaterial visible={false} />
          <Edges threshold={1} color={COLORS.gold} lineWidth={2} />
        </mesh>
      )}

      {showLabels && (
        <>
          <DimLabel position={[mm(W / 2), mm(isWallMounted ? 0 : -legHeight) - 0.09, mm(D)]} text={`${Math.round(W)}`} tone={selected ? 'gold' : 'dim'} />
          <DimLabel position={[mm(W) + 0.16, mm(H / 2), mm(D)]} text={`${Math.round(H)}`} tone={selected ? 'gold' : 'dim'} />
          <DimLabel position={[mm(W / 2), mm(H) + 0.1, mm(D / 2)]} text={`${unit.params.unit_num} · ${Math.round(D)} deep`} tone={selected ? 'gold' : 'dim'} />
        </>
      )}
    </group>
  );
}
