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
  unit, result, wallWidthMm, selected, snapStep, onSelect, onMove, onMoveShelf, onShelfDragState,
  orbitRef, showLabels = true, shelfDrag = null,
}) {
  const { camera, gl } = useThree();
  const drag = useRef(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  const W = unit.params.width;
  const H = unit.params.height;
  const D = unit.params.depth;
  const legHeight = result.assemblies.carcass.legHeight || 0;

  // A vertical plane parallel to the wall, halfway into the cabinet — the ray
  // is intersected with it so the unit follows the cursor instead of itself.
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), -mm(D / 2)), [D]);

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
  const startDrag = useCallback((e) => {
    e.stopPropagation();
    onSelect();
    const hit = pointerToPlane(e.clientX, e.clientY);
    if (!hit) return;
    drag.current = { offset: hit.x - mm(unit.position.x_mm - wallWidthMm / 2) };
    if (orbitRef?.current) orbitRef.current.enabled = false;

    const move = (ev) => {
      if (!drag.current) return;
      const p = pointerToPlane(ev.clientX, ev.clientY);
      if (!p) return;
      onMove((p.x - drag.current.offset) / MM + wallWidthMm / 2, snapStep);
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
  }, [onSelect, pointerToPlane, unit.position.x_mm, wallWidthMm, orbitRef, onMove, snapStep]);

  // Cabinet origin: pushed against the wall (z = 0 is the wall face), standing
  // on its legs, offset along the wall by the unit position.
  const originX = mm(unit.position.x_mm - wallWidthMm / 2);
  const originY = mm(legHeight);

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
    <group position={[originX, originY, 0]}>
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

      {/* legs */}
      {legHeight > 0 && [0, 1].map((i) => (
        <mesh key={i} position={[i === 0 ? mm(60) : mm(W - 60), mm(-legHeight / 2), mm(D / 2)]}>
          <boxGeometry args={[mm(78), mm(legHeight), mm(78)]} />
          <meshStandardMaterial color="#4a4a4a" roughness={0.6} />
        </mesh>
      ))}

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
          <DimLabel position={[mm(W / 2), mm(-legHeight) - 0.09, mm(D)]} text={`${Math.round(W)}`} tone={selected ? 'gold' : 'dim'} />
          <DimLabel position={[mm(W) + 0.16, mm(H / 2), mm(D)]} text={`${Math.round(H)}`} tone={selected ? 'gold' : 'dim'} />
          <DimLabel position={[mm(W / 2), mm(H) + 0.1, mm(D / 2)]} text={`${unit.params.unit_num} · ${Math.round(D)} deep`} tone={selected ? 'gold' : 'dim'} />
        </>
      )}
    </group>
  );
}
