import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { mm, MM, COLORS } from './constants.js';
import { contourSurface, decorTexture, onDecorLoad, outlineFor, surfaceFor } from './materials.js';
import { bevelHook, createBevelState, syncBevelState } from './bevel.js';
import ContactShadow from './ContactShadow.jsx';
import DimLabel from './DimLabel.jsx';
import { formatMm } from '../engine/format.js';

// One unit, rendered straight from the ENGINE output: every panel record
// carries a `box` in cabinet-local mm, so what you see is what the cut list
// says (CLAUDE.md phase 2). Nothing here re-derives a dimension.
//
// Turn 3 adds the interactions on top of that, and they are all VIEW state:
// a drawer slides out, a door swings on its hinge, the camera flies to what
// was double-clicked. None of it reaches the engine, the BOM or the CNC sheet.

/** Which kind of front this panel is, if any — that decides how it moves. */
function frontKind(panel) {
  if (panel.part === 'DRAWER-FRONT') return 'drawer';
  if (panel.part === 'FRONT') return 'door';
  return null;
}

/**
 * A decor image scaled to THIS piece: 900 mm of grain stays 900 mm of grain
 * whether it is a door or a drawer bottom. The clone shares the decoded image,
 * so a whole room of walnut is still one texture on the GPU.
 */
function useDecor(url, wMm, hMm, repeatMm) {
  // `tick` is the COUNTER, not the setter: keying the memo on the setter (which
  // never changes) left every clone holding the placeholder the loader starts
  // with, and every decor panel rendered plain white.
  const [tick, bump] = useState(0);
  useEffect(() => {
    if (!url) return undefined;
    return onDecorLoad(url, () => bump((n) => n + 1));
  }, [url]);
  return useMemo(
    () => (url ? decorTexture(url, wMm / repeatMm, hMm / repeatMm) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, wMm, hMm, repeatMm, tick],
  );
}

/**
 * The edge break on one panel (turn 6, CLAUDE.md F2).
 *
 * The state object is created once per panel and never replaced, so the shader
 * hook keeps one identity for the life of the mesh and three compiles the
 * bevel program once for the whole project. Resizing a panel is then a uniform
 * write, which is why dragging a shelf does not stutter.
 */
function useBevel(box, profile) {
  const state = useMemo(() => createBevelState(), []);
  const hook = useMemo(() => bevelHook(state), [state]);
  const B = profile.appearance.bevel;

  state.half.set(mm(box.w) / 2, mm(box.h) / 2, mm(box.d) / 2);
  state.bevel = mm(B.mm);
  state.strength = B.strength;
  state.aoRadius = mm(B.ao.mm);
  // The RENDER turns this up (renderCapture.js); the working view stays cheap.
  if (state.ao === 0 || state.ao === undefined) state.ao = B.ao.strength;
  syncBevelState(state);

  return useCallback((material) => {
    if (!material) return;
    material.userData.ccBevel = state;
    material.onBeforeCompile = hook.onBeforeCompile;
    material.customProgramCacheKey = hook.customProgramCacheKey;
    material.needsUpdate = true;
  }, [state, hook]);
}

/**
 * One panel. Fronts animate towards their open state; everything else is a
 * static box. The animation lives here, per panel, so opening one drawer does
 * not re-render the rest of the unit.
 */
function MovingPanel({
  panel: p, front, open, surface, outline, outlines, contour, depth, profile, ...handlers
}) {
  const group = useRef(null);
  const amount = useRef(0);
  const bevelRef = useBevel(p.box, profile);

  // A door rotates about its hinge edge, so the mesh is offset inside a group
  // pinned to that edge; everything else sits at its own centre.
  const hingeAtRight = p.meta?.hinge === 'R';
  const pivot = front === 'door'
    ? [mm(hingeAtRight ? p.box.x + p.box.w : p.box.x), mm(p.box.y + p.box.h / 2), mm(p.box.z + p.box.d / 2)]
    : [mm(p.box.x + p.box.w / 2), mm(p.box.y + p.box.h / 2), mm(p.box.z + p.box.d / 2)];
  const meshOffset = front === 'door' ? [mm(hingeAtRight ? -p.box.w / 2 : p.box.w / 2), 0, 0] : [0, 0, 0];

  useFrame((_, delta) => {
    if (!group.current || !front) return;
    const target = open;
    if (Math.abs(amount.current - target) < 0.001) { amount.current = target; } else {
      // Frame-rate independent easing: fast at the start, settled in ~0.35 s.
      amount.current += (target - amount.current) * Math.min(1, delta * 8);
    }
    const a = amount.current;
    // The animation is an OFFSET from where the engine put the panel, never an
    // absolute position: writing position.z directly moved every front to
    // z = 0, i.e. inside the carcass, and the unit rendered as an open box.
    if (front === 'drawer') {
      // Slides straight out of the carcass, most of its own depth.
      group.current.position.z = pivot[2] + mm(depth * 0.75) * a;
      group.current.rotation.y = 0;
    } else {
      // Swings on the hinge side, about the group's origin.
      const dir = p.meta?.hinge === 'R' ? 1 : -1;
      group.current.rotation.y = dir * a * (Math.PI * 0.55);
      group.current.position.z = pivot[2];
    }
  });

  // The grain runs across the piece's own face, so it is scaled by the two
  // dimensions the eye actually sees.
  const decor = useDecor(surface.texture, p.box.w, Math.max(p.box.h, p.box.d), surface.repeatMm);
  const faded = contour ? surface.opacity : (p.role === 'front' ? 0.94 : 1);

  return (
    <group ref={group} position={pivot}>
      <mesh position={meshOffset} castShadow={!contour} receiveShadow={!contour} {...handlers}>
        <boxGeometry args={[mm(p.box.w), mm(p.box.h), mm(p.box.d)]} />
        {/* Physical, not standard. Turn 6: the numbers are no longer one sheen
            for everything — a sprayed piece wears lacquer and a carcass wears
            melamine (profile.appearance.materials), and the edges are broken
            on the normals by the ref below. Nothing here is a bare number. */}
        <meshPhysicalMaterial
          // The key is not decoration: a material compiled WITHOUT a map does
          // not grow one when the decor finishes loading — the shader has to be
          // rebuilt, and remounting the material is how that is asked for. Left
          // out, a decor chosen while the scene is already on screen showed up
          // only after a reload.
          key={decor ? 'decor' : 'plain'}
          ref={bevelRef}
          color={surface.colour}
          map={decor}
          roughness={surface.roughness}
          metalness={surface.metalness}
          clearcoat={surface.clearcoat}
          clearcoatRoughness={surface.clearcoatRoughness}
          transparent={faded < 1}
          opacity={faded}
          depthWrite={!contour}
        />
        {/* Thin BLACK contours, switchable from the toolbar. In contour view
            they are the whole picture, so they are never off there. */}
        {(outlines || contour) && (
          <Edges
            threshold={outline.threshold}
            color={outline.colour}
            lineWidth={outline.width}
            // The contour is the TOOL, not the furniture: a render hides it
            // (3d/renderCapture.js). Tagged explicitly rather than sniffed,
            // because drei draws a fat line as a LineSegments2 — which is a
            // Mesh, and reads as furniture to anything looking at the type.
            userData={{ ccHelper: true }}
          />
        )}
      </mesh>
    </group>
  );
}

export default function UnitView({
  unit, result, wall, roomCentre, selected, snapStep, onSelect, onMove, onMoveShelf, onShelfDragState,
  orbitRef, showLabels = true, shelfDrag = null, openFronts = null, onToggleFront, onFocus, onContextMenu,
  frontColour = null, onSetTopInfill, onFillToCeiling, groupRef = null,
  profile, finishes, outlines = true, contour = false, grounded = true,
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
  // A turned unit pivots about the point where it meets the wall — the same
  // anchor engine/collision.js rotates its footprint about, so the picture and
  // the collision rules can never disagree about where it is.
  //
  // The SIGN matters and is not cosmetic: rotating about world Y takes local
  // +X onto along·cosφ − inward·sinφ, while the footprint takes the width axis
  // onto along·cosφ + inward·sinφ. Subtracting the angle here is what makes the
  // two the same turn — with the sign the other way round a rotated unit swings
  // behind the wall and disappears from the scene while the clamp thinks it is
  // standing in the room.
  const rotationRad = -((Number(unit.position.rotation_deg) || 0) * Math.PI) / 180;

  // How tall the top infill is right now — the handle sits on top of it.
  const topInfill = Number(unit.params.top_infill_mm) || 0;

  /**
   * Drag the top infill. The pointer's height above the unit IS the infill
   * height, clamped by the store against the ceiling — so the piece grows
   * under the cursor and stops when the room runs out.
   */
  const startTopInfillDrag = useCallback((e) => {
    if (!onSetTopInfill) return;
    e.stopPropagation();
    onSelect();
    if (orbitRef?.current) orbitRef.current.enabled = false;
    const unitTopY = originY + mm(H);

    const move = (ev) => {
      const p = pointerToPlane(ev.clientX, ev.clientY);
      if (!p) return;
      onSetTopInfill((p.y - unitTopY) / MM);
    };
    const up = () => {
      if (orbitRef?.current) orbitRef.current.enabled = true;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }, [onSetTopInfill, onSelect, orbitRef, pointerToPlane, originY, H]);

  /** World position of a panel's centre, for "fly the camera here". */
  const panelWorldCentre = useCallback((p) => {
    const local = new THREE.Vector3(
      mm(p.box.x + p.box.w / 2), mm(p.box.y + p.box.h / 2), mm(p.box.z + p.box.d / 2),
    );
    local.applyAxisAngle(new THREE.Vector3(0, 1, 0), wall.angle + rotationRad);
    return local.add(origin);
  }, [origin, wall.angle, rotationRad]);

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
    <group ref={groupRef} position={origin} rotation={[0, wall.angle + rotationRad, 0]}>
      {/* Contact shadow (turn 6): the dark that says this cabinet is standing
          on the floor. Only for a unit that HAS a floor under it — a wall unit
          hangs, and a blob under it 1.5 m down would be a shadow from nothing.
          It is in the picture but must not frame it, hence ccNoBounds. */}
      {!isWallMounted && !contour && grounded && (
        <group userData={{ ccNoBounds: true }}>
          <ContactShadow width={W} depth={D} y={-legHeight} profile={profile} />
        </group>
      )}

      {result.panels.filter((p) => p.box).map((p) => {
        const shelfId = p.part === 'SHELF' ? p.meta?.itemId : null;
        const beingDragged = shelfDrag?.itemId && shelfDrag.itemId === shelfId;
        const front = frontKind(p);
        // What the piece is made of: the project's finishes, resolved once per
        // unit (3d/materials.js). A front COLOUR from Design Settings is paint
        // and covers the decor, exactly as it does in the workshop. The shelf
        // being dragged goes gold, so the hand knows what it has hold of.
        const surface = contour
          ? contourSurface(profile)
          : surfaceFor({ role: p.role, finishExposed: p.finish_exposed, finishes, profile, frontColour });
        return (
          <MovingPanel
            key={p.id}
            panel={p}
            front={front}
            open={front ? (openFronts?.[p.id] ?? 0) : 0}
            surface={beingDragged && !contour ? { ...surface, colour: COLORS.goldSoft, texture: null } : surface}
            outline={outlineFor(profile, { selected: selected || beingDragged, contour })}
            outlines={outlines}
            contour={contour}
            depth={D}
            profile={profile}
            onPointerDown={(e) => {
              if (shelfId) { startShelfDrag(e, shelfId, p.box.y); return; }
              startDrag(e);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              // A front opens; anything else pulls the camera in to look at it.
              if (front && onToggleFront) onToggleFront(p.id);
              else if (onFocus) onFocus(panelWorldCentre(p), Math.max(p.box.w, p.box.h, p.box.d));
            }}
            onContextMenu={(e) => {
              e.stopPropagation();
              e.nativeEvent?.preventDefault?.();
              onSelect();
              if (onContextMenu) onContextMenu({ x: e.clientX, y: e.clientY, panelId: p.id, part: p.part });
            }}
            onPointerOver={shelfId ? () => { document.body.style.cursor = 'ns-resize'; } : (front ? () => { document.body.style.cursor = 'pointer'; } : undefined)}
            onPointerOut={(shelfId || front) ? () => { document.body.style.cursor = ''; } : undefined}
          />
        );
      })}

      {/* live dimension while a shelf is being dragged (SPEC 4.8) */}
      {shelfDrag && shelfDrag.unitId === unit.id && (
        <group userData={{ ccHelper: true }}>
          {shelfDrag.below != null && (
            <DimLabel
              position={[mm(W / 2), mm((shelfDrag.below + shelfDrag.pos) / 2), mm(D) + 0.06]}
              text={formatMm(shelfDrag.pos - shelfDrag.below)}
              tone="gold"
            />
          )}
          {shelfDrag.above != null && (
            <DimLabel
              position={[mm(W / 2), mm((shelfDrag.above + shelfDrag.pos) / 2), mm(D) + 0.06]}
              text={formatMm(shelfDrag.above - shelfDrag.pos)}
              tone="gold"
            />
          )}
          <DimLabel position={[mm(W) + 0.17, mm(shelfDrag.pos), mm(D)]} text={formatMm(shelfDrag.pos, { unit: true })} tone="gold" />
        </group>
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
          <meshStandardMaterial color={profile.appearance.hardware.rail} roughness={0.4} metalness={0.6} />
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
          <meshStandardMaterial color={profile.appearance.hardware.leg} roughness={0.6} />
        </mesh>
      ))}

      {/* Top infill: grab it and drag UP to the ceiling, or double-click it to
          send it there. The piece itself is drawn from the engine like every
          other panel; this is the handle on top of it.
          Turn 4: the handle exists only when the PIECE does (BACKLOG #16) —
          a handle for something nobody added is a handle for nothing. */}
      {onSetTopInfill && topInfill > 0 && (
        <mesh
          userData={{ ccHelper: true }}
          position={[mm(W / 2), mm(H + Math.max(topInfill, 0) + 12), mm(D - 30)]}
          onPointerDown={startTopInfillDrag}
          onDoubleClick={(e) => { e.stopPropagation(); onFillToCeiling?.(); }}
          onPointerOver={() => { document.body.style.cursor = 'ns-resize'; }}
          onPointerOut={() => { document.body.style.cursor = ''; }}
        >
          <boxGeometry args={[mm(Math.min(W, 240)), mm(24), mm(60)]} />
          <meshStandardMaterial
            color={selected ? COLORS.gold : profile.appearance.hardware.bracket}
            roughness={0.5} transparent opacity={selected ? 0.9 : 0.35}
          />
        </mesh>
      )}

      {/* wall unit: the bracket line it hangs from, so it does not read as
          floating by accident */}
      {isWallMounted && (
        <mesh position={[mm(W / 2), mm(H) + 0.004, mm(6)]}>
          <boxGeometry args={[mm(W), 0.006, mm(12)]} />
          <meshStandardMaterial color={profile.appearance.hardware.bracket} roughness={0.5} metalness={0.4} />
        </mesh>
      )}

      {/* selection outline — gold, around the whole carcass */}
      {selected && (
        <mesh userData={{ ccHelper: true }} position={[mm(W / 2), mm(H / 2), mm(D / 2)]}>
          <boxGeometry args={[mm(W) + 0.006, mm(H) + 0.006, mm(D) + 0.006]} />
          <meshBasicMaterial visible={false} />
          <Edges threshold={1} color={profile.appearance.selection.colour} lineWidth={profile.appearance.selection.width} />
        </mesh>
      )}

      {showLabels && (
        <group userData={{ ccHelper: true }}>
          <DimLabel position={[mm(W / 2), mm(isWallMounted ? 0 : -legHeight) - 0.09, mm(D)]} text={formatMm(W)} tone={selected ? 'gold' : 'dim'} />
          <DimLabel position={[mm(W) + 0.16, mm(H / 2), mm(D)]} text={formatMm(H)} tone={selected ? 'gold' : 'dim'} />
          <DimLabel position={[mm(W / 2), mm(H) + 0.1, mm(D / 2)]} text={`${unit.params.unit_num} · ${formatMm(D)} deep`} tone={selected ? 'gold' : 'dim'} />
        </group>
      )}
    </group>
  );
}
