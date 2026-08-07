import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { mm, MM, COLORS } from './constants.js';
import {
  contourSurface, decorFailed, decorPlacement, decorTexture, onDecorLoad, outlineFor, surfaceFor,
} from './materials.js';
import { bevelHook, createBevelState, syncBevelState } from './bevel.js';
import ContactShadow from './ContactShadow.jsx';
import Hardware from './Hardware.jsx';
import EdgeHandle from './EdgeHandle.jsx';
import SelectionOutline, { solidBounds } from './SelectionOutline.jsx';
import DimLabel from './DimLabel.jsx';
import { formatMm } from '../engine/format.js';
import { hardwareInstances } from '../engine/hardware3d.js';
import { backStandoff } from '../engine/collision.js';

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
 * A decor image laid on THIS piece.
 *
 * Turn 8 moved the arithmetic into 3d/materials.js `decorPlacement`, because
 * turn 7's version was wrong in the one place it shows most. It scaled the
 * texture by the box's x and y — but three gives a box's ±X faces a u along Z
 * and a v along Y, and a carcass side IS a ±X face. So every side panel in the
 * app had its grain lying on its side (Piotr: "słoje leżą POZIOMO na bokach").
 * The placement now works out which face is the big one, which way the grain
 * runs on the cut piece, and turns the image a quarter turn when it has to.
 *
 * The FALLBACK is the other half: the manufacturer scans are fetched from
 * Supabase Storage, so a machine with no network gets our own procedural grain
 * rather than 400 white panels. Mock mode WORKS (CLAUDE.md rule 7).
 */
function useDecor(surface, panel, profile) {
  // `tick` is the COUNTER, not the setter: keying the memo on the setter (which
  // never changes) left every clone holding the placeholder the loader starts
  // with, and every decor panel rendered plain white.
  const [tick, bump] = useState(0);
  const url = surface?.texture || null;
  useEffect(() => {
    if (!url) return undefined;
    return onDecorLoad(url, () => bump((n) => n + 1));
  }, [url]);

  return useMemo(() => {
    if (!url) return { map: null, tinted: false };
    const failed = decorFailed(url);
    // A scan that could not be fetched drops to the tinted procedural grain the
    // decor carries for exactly this case.
    const use = failed && surface.fallback
      ? { ...surface, ...surface.fallback, scanAlongGrainMm: 0 }
      : surface;
    const placement = decorPlacement(use, panel, profile);
    if (!placement) return { map: null, tinted: false };
    return {
      map: decorTexture(placement.url, placement),
      // The fallback grain is greyscale and is MULTIPLIED by the decor's colour;
      // a scan is shown at its own tone over white.
      tinted: Boolean(use.tint),
      hex: use === surface ? null : surface.fallbackHex,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, panel.box.w, panel.box.h, panel.box.d, panel.w, panel.h,
    surface?.scanAlongGrainMm, surface?.repeatMm, profile, tick]);
}

/**
 * The edge break on one panel (turn 6, CLAUDE.md F2).
 *
 * The state object is created once per panel and never replaced, so the shader
 * hook keeps one identity for the life of the mesh and three compiles the
 * bevel program once for the whole project. Resizing a panel is then a uniform
 * write, which is why dragging a shelf does not stutter.
 */
function useBevel(box, profile, sprayed = false) {
  const state = useMemo(() => createBevelState(), []);
  const hook = useMemo(() => bevelHook(state), [state]);
  const B = profile.appearance.bevel;
  const S = profile.appearance.spray || {};

  state.half.set(mm(box.w) / 2, mm(box.h) / 2, mm(box.d) / 2);
  state.bevel = mm(B.mm);
  state.strength = B.strength;
  state.aoRadius = mm(B.ao.mm);
  // The RENDER turns this up (renderCapture.js); the working view stays cheap.
  if (state.ao === 0 || state.ao === undefined) state.ao = B.ao.strength;
  // Orange peel: a sprayed piece only (turn 8, CLAUDE.md F1).
  state.spray = sprayed ? (S.normalScale ?? 0.1) : 0;
  state.sprayFreq = (2 * Math.PI) / Math.max(mm(S.peelMm ?? 2), 1e-6);
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
  panel: p, front, open, surface, outline, outlines, contour, xray, depth, profile, ...handlers
}) {
  const group = useRef(null);
  const amount = useRef(0);
  const bevelRef = useBevel(p.box, profile, surface.sprayed && !contour && !xray);

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

  // The grain runs along the piece, on the face the eye actually sees.
  const { map: decor, tinted, hex: fallbackHex } = useDecor(surface, p, profile);
  // X-ray (turn 7): the board goes translucent so the inside reads, and a FRONT
  // stays more solid than the carcass — it is the face of the cabinet, and
  // fading it as far as the sides would leave a unit with no face at all.
  //
  // ─── TURN 8 (CLAUDE.md F1): SOLID MEANS SOLID ───
  // Turn 7 left every FRONT at 0.94 in the ordinary view. That is where Piotr's
  // "everything is transparent" came from, and it is worse than it sounds: a
  // material with `transparent: true` leaves the opaque queue altogether, so
  // every door in the room was sorted back-to-front against every other door
  // and drawn without the depth ordering the rest of the scene relies on. Six
  // per cent of see-through, bought at the price of the whole depth buffer.
  //
  // Solid is opaque now, full stop. Translucency belongs to the two modes that
  // exist to be translucent.
  const X = profile.appearance.xray;
  const faded = contour ? surface.opacity : (xray ? (front ? X.front : X.carcass) : 1);
  const translucent = faded < 1;

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
          // An untinted scan sits on white so the figure comes through at its
          // own tone; a tinted procedural grain multiplies the decor's colour.
          color={decor && tinted && fallbackHex ? fallbackHex : surface.colour}
          map={decor}
          roughness={surface.roughness}
          metalness={surface.metalness}
          clearcoat={surface.clearcoat}
          clearcoatRoughness={surface.clearcoatRoughness}
          // A sprayed colour is THE colour: no environment probe on it, or the
          // room tints the lacquer and a RAL match on screen is a lie
          // (CLAUDE.md F1, the Spraying philosophy). Melamine and decors keep
          // the probe — a foil board really does reflect the room.
          envMapIntensity={surface.envMapIntensity}
          transparent={translucent}
          opacity={faded}
          // Translucent board must not write depth, or the panel nearest the
          // camera hides everything the mode exists to show. Opaque board
          // always writes it.
          depthWrite={!translucent}
        />
        {/* Thin BLACK contours, switchable from the toolbar. In contour view
            they are the whole picture, so they are never off there. */}
        {/* The contours are what hold an X-ray together: with the material at
            a fifth of its opacity, the edges ARE the cabinet. */}
        {(outlines || contour || xray) && (
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
  onSetEndPanelTop, onEndPanelToCeiling, onSetSideInfillTop, onSideInfillToCeiling,
  profile, finishes, outlines = true, contour = false, grounded = true, xray = false, sheen = null,
}) {
  const { camera, gl } = useThree();
  const drag = useRef(null);
  // Which top edge has been clicked. Purely visual: it decides which handle is
  // lit, nothing else (CLAUDE.md F3 — "click the edge → the edge highlights").
  const [activeEdge, setActiveEdge] = useState(null);
  // Hover, debounced. R3F fires pointerout on the panel you are leaving and
  // pointerover on the one you are entering, in that order — so sliding the
  // cursor across a cabinet would strobe the hover mark once per panel without
  // this. The clear is deferred by one frame and cancelled by any new enter.
  const [hovered, setHovered] = useState(false);
  const leaving = useRef(null);
  const enter = useCallback(() => {
    if (leaving.current) { cancelAnimationFrame(leaving.current); leaving.current = null; }
    setHovered(true);
  }, []);
  const leave = useCallback(() => {
    if (leaving.current) cancelAnimationFrame(leaving.current);
    leaving.current = requestAnimationFrame(() => { leaving.current = null; setHovered(false); });
  }, []);
  useEffect(() => () => { if (leaving.current) cancelAnimationFrame(leaving.current); }, []);
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
  //
  // …unless it has been given a BACK INSET (turn 7, CLAUDE.md F5), in which case
  // it stands that far off the wall and hangs in the depth of the room. The same
  // number the collision clamp and the plan use — engine/collision.js insetPads —
  // so the picture and the rule cannot disagree about where it is.
  // Turn 8 (CLAUDE.md F3): plus the 10 mm EVERY unit stands off the wall
  // behind it. One function, engine/collision.js, so the picture and the clamp
  // cannot disagree about where a cabinet is.
  const backInset = backStandoff(unit, profile);
  const origin = useMemo(
    () => wallStart.clone()
      .addScaledVector(along, mm(unit.position.x_mm))
      .addScaledVector(inward, mm(backInset))
      .setY(mm(baseY)),
    [wallStart, along, inward, unit.position.x_mm, baseY, backInset],
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

  // The whole solid, for the selection mark: every panel this unit emits, from
  // the engine's own boxes.
  const solid = useMemo(() => solidBounds(result.panels), [result.panels]);

  // Where the bought hardware sits (turn 7, CLAUDE.md F3). Derived from the
  // engine's own drilling, so a hinge is drawn where the machine bores for it.
  const hardware = useMemo(() => hardwareInstances(result, profile), [result, profile]);

  // How tall the top infill is right now — the handle sits on top of it. The
  // FACE strip is the piece the edge belongs to (there is a shelf behind it,
  // and its top is 18 mm lower).
  const topInfill = Number(unit.params.top_infill_mm) || 0;
  const topInfillFace = useMemo(
    () => result.panels.find((p) => p.part === 'INFILL' && p.box
      && p.meta?.side === 'top' && p.meta?.piece === 'face' && p.meta?.segment === 'main') || null,
    [result.panels],
  );

  /**
   * Drag something's top edge. The pointer's height above `fromMm` (a height in
   * the unit's own frame) IS the value asked for; the store clamps it against
   * the ceiling, so the piece grows under the cursor and stops when the room
   * runs out.
   *
   * One function for the top infill and for every end panel (turn 6), because
   * it is one gesture: a joiner closing the gap between what he built and what
   * the builder left.
   */
  const startHeightDrag = useCallback((e, fromMm, onValue) => {
    if (!onValue) return;
    e.stopPropagation();
    onSelect();
    if (orbitRef?.current) orbitRef.current.enabled = false;
    const fromY = originY + mm(fromMm);

    const move = (ev) => {
      const p = pointerToPlane(ev.clientX, ev.clientY);
      if (!p) return;
      onValue((p.y - fromY) / MM);
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
  }, [onSelect, orbitRef, pointerToPlane, originY]);

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
    <group
      ref={groupRef}
      position={origin}
      rotation={[0, wall.angle + rotationRad, 0]}
      onPointerOver={enter}
      onPointerOut={leave}
    >
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
          : surfaceFor({
            role: p.role,
            // The ENGINE's answer to "is this cut from the front sheet", not a
            // guess from the role — which is what left end panels and infills
            // wearing the carcass finish (turn 8, CLAUDE.md F2.3).
            materialRole: p.material_role,
            finishExposed: p.finish_exposed,
            finishes,
            profile,
            frontColour,
            sheen,
          });
        return (
          <MovingPanel
            key={p.id}
            panel={p}
            front={front}
            open={front ? (openFronts?.[p.id] ?? 0) : 0}
            surface={beingDragged && !contour ? { ...surface, colour: COLORS.goldSoft, texture: null } : surface}
            outline={outlineFor(profile, { contour })}
            outlines={outlines}
            contour={contour}
            xray={xray}
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

      {/* The bought hardware (turn 7, CLAUDE.md F3): legs and the rail always,
          hinges and runners only in X-ray. Every position comes from
          engine/hardware3d.js, which reads the engine's own drilling — so the
          count of what is drawn is the count of what is on order. */}
      <Hardware instances={hardware} profile={profile} xray={xray && !contour} />

      {/* Top infill: grab its top edge and drag UP to the ceiling, or
          double-click it to send it there. The piece itself is drawn from the
          engine like every other panel; this is the handle on top of it.
          Turn 4: the handle exists only when the PIECE does (BACKLOG #16) —
          a handle for something nobody added is a handle for nothing.

          ─── TURN 8 (CLAUDE.md F2.6): THE GHOST BLOCK ───
          It used to be a 240 × 24 × 60 mm translucent grey box floating 12 mm
          above the infill, and that is the "obcy prostopadłościan" on Piotr's
          screenshot: a chunk of nothing, in a colour no cabinet is, hanging in
          mid air beside the piece it belongs to.

          It is the same EDGE the end panels and the fillers have used since
          turn 6 now — invisible at rest, lit on hover, lying on the piece's own
          top edge. One gesture, learnt once, for all three of the things that
          finish a run against a ceiling. */}
      {onSetTopInfill && topInfill > 0 && topInfillFace && (
        <EdgeHandle
          position={[
            mm(topInfillFace.box.x + topInfillFace.box.w / 2),
            mm(topInfillFace.box.y + topInfillFace.box.h),
            mm(topInfillFace.box.z + topInfillFace.box.d / 2),
          ]}
          width={Math.max(topInfillFace.box.w, 22)}
          depth={Math.max(topInfillFace.box.d, 22)}
          thickness={22}
          colour={profile.appearance.selection.colour}
          active={activeEdge === 'top-infill'}
          onPointerDown={(e) => {
            setActiveEdge('top-infill');
            startHeightDrag(e, H, onSetTopInfill);
          }}
          onDoubleClick={(e) => { e.stopPropagation(); setActiveEdge('top-infill'); onFillToCeiling?.(); }}
        />
      )}

      {/* End panels: the top edge is the control (turn 6, CLAUDE.md F3).
          Click it to see it, drag it to place it, double-click it to send it to
          the ceiling. The band lies ON the edge of the piece it moves — what
          you grab is the thing that grows. */}
      {onSetEndPanelTop && result.panels
        .filter((p) => p.part === 'END-PANEL' && p.box && p.meta?.panelId)
        .map((p) => (
          <EdgeHandle
            key={`edge-${p.id}`}
            position={[mm(p.box.x + p.box.w / 2), mm(p.box.y + p.box.h), mm(p.box.z + p.box.d / 2)]}
            width={Math.max(p.box.w, 22)}
            depth={p.box.d}
            thickness={22}
            colour={profile.appearance.selection.colour}
            active={activeEdge === p.meta.panelId}
            onPointerDown={(e) => {
              setActiveEdge(p.meta.panelId);
              startHeightDrag(e, H, (v) => onSetEndPanelTop(p.meta.panelId, v));
            }}
            onDoubleClick={(e) => { e.stopPropagation(); setActiveEdge(p.meta.panelId); onEndPanelToCeiling?.(p.meta.panelId); }}
          />
        ))}

      {/* Vertical L-infills get the same edge (turn 6, CLAUDE.md F4). A filler
          and a masking panel finish on the same line, so a joiner who has
          learnt one edge has learnt both. */}
      {onSetSideInfillTop && result.panels
        .filter((p) => p.part === 'INFILL' && p.box && p.meta?.piece === 'face'
          && (p.meta.side === 'left' || p.meta.side === 'right'))
        .map((p) => {
          const side = p.meta.side === 'left' ? 'L' : 'R';
          return (
            <EdgeHandle
              key={`edge-${p.id}`}
              position={[mm(p.box.x + p.box.w / 2), mm(p.box.y + p.box.h), mm(p.box.z + p.box.d / 2)]}
              width={Math.max(p.box.w, 22)}
              depth={Math.max(p.box.d, 22)}
              thickness={22}
              colour={profile.appearance.selection.colour}
              active={activeEdge === p.id}
              onPointerDown={(e) => {
                setActiveEdge(p.id);
                startHeightDrag(e, H, (v) => onSetSideInfillTop(side, v));
              }}
              onDoubleClick={(e) => { e.stopPropagation(); setActiveEdge(p.id); onSideInfillToCeiling?.(side); }}
            />
          );
        })}

      {/* wall unit: the bracket line it hangs from, so it does not read as
          floating by accident */}
      {isWallMounted && (
        <mesh position={[mm(W / 2), mm(H) + 0.004, mm(6)]}>
          <boxGeometry args={[mm(W), 0.006, mm(12)]} />
          <meshStandardMaterial color={profile.appearance.hardware.bracket} roughness={0.5} metalness={0.4} />
        </mesh>
      )}

      {/* Selection (turn 6, CLAUDE.md F5): a thin dashed navy box standing
          clear of the SOLID — doors stand proud of the carcass and an end panel
          stands outside it, so a mark drawn on the carcass would cut through
          both. Hover is the same mark, quieter. */}
      {(selected || hovered) && !contour && (
        <SelectionOutline
          box={solid}
          profile={profile}
          opacity={selected ? 1 : profile.appearance.selection.hoverOpacity}
        />
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
