import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { mm, MM, COLORS } from './constants.js';
import {
  contourSurface, decorFailed, decorPlacement, decorTexture, onDecorLoad, outlineFor,
  panelFillOffset, surfaceFor,
} from './materials.js';
import { bevelHook, createBevelState, syncBevelState } from './bevel.js';
import Hardware, { DoorHinges } from './Hardware.jsx';
import EdgeHandle from './EdgeHandle.jsx';
import AddPlus from './AddPlus.jsx';
import JointLines from './JointLines.jsx';
import SelectionOutline, { solidBounds } from './SelectionOutline.jsx';
import DimLabel from './DimLabel.jsx';
import { formatMm } from '../engine/format.js';
import { hardwareInstances } from '../engine/hardware3d.js';
import { shelfGapLadder } from '../engine/items.js';
import { joineryLayers as resolveJoineryLayers } from '../engine/joinery.js';
import { isMainViewElement, opensOwnModal } from '../engine/elements.js';
import { panelFinish } from '../engine/materials.js';
import { wallAtPoint } from '../engine/room.js';
import { widthZones } from '../engine/zones.js';
import { machinedPanelGeometry } from './panelSolid.js';
import { backStandoff } from '../engine/collision.js';
import { doorOpenAngle } from '../engine/doors.js';
import {
  boxPolyhedron, clipAll, infillMitre, solidTriangles,
} from '../engine/mitre.js';

// One unit, rendered straight from the ENGINE output: every panel record
// carries a `box` in cabinet-local mm, so what you see is what the cut list
// says (CLAUDE.md phase 2). Nothing here re-derives a dimension.
//
// Turn 3 adds the interactions on top of that, and they are all VIEW state:
// a drawer slides out, a door swings on its hinge, the camera flies to what
// was double-clicked. None of it reaches the engine, the BOM or the CNC sheet.

// The floor, as a plane: y = 0, normal up. One object for the whole app rather
// than one per drag — it never moves, and a drag allocating a plane per frame is
// a drag allocating a plane per frame.
const FLOOR = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

/**
 * Which kind of front this panel is, if any — that decides how it moves.
 *
 * Exported since turn 14 (CLAUDE.md F8.1): the cabinet editor opens doors now,
 * and it has to ask the same question the room asks rather than keeping a
 * second list of which parts are fronts.
 */
export function frontKind(panel) {
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
 * The mitred solid for one strip of a top infill (turn 8, CLAUDE.md F6), or
 * null for every other piece — which is every piece but four per run.
 *
 * The geometry comes back in the UNIT's millimetres, so it is moved to sit
 * about its own centre and the mesh is placed at that centre. Two things then
 * carry on working with no special case: the bevel shader, which measures a
 * fragment against the object's half-extents, and the selection box, which
 * frames the panel boxes the engine emitted.
 *
 * Disposed with the panel: a BufferGeometry holds GPU buffers, and a run being
 * dragged rebuilds these several times a second.
 */
function useMitre(panel) {
  const built = useMemo(() => {
    const spec = infillMitre(panel);
    if (!spec) return null;
    const solid = clipAll(boxPolyhedron(spec.box), spec.planes);
    const tri = solidTriangles(solid);
    const { box } = spec;
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const cz = box.z + box.d / 2;
    const positions = new Float32Array(tri.positions.length);
    for (let i = 0; i < tri.positions.length; i += 3) {
      positions[i] = mm(tri.positions[i] - cx);
      positions[i + 1] = mm(tri.positions[i + 1] - cy);
      positions[i + 2] = mm(tri.positions[i + 2] - cz);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(tri.normals), 3));
    geometry.setIndex(tri.indices);
    geometry.computeBoundingSphere();
    return { geometry, box };
  }, [panel]);

  useEffect(() => () => built?.geometry.dispose(), [built]);
  return built;
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
// Exported since turn 12 (CLAUDE.md F4): the cabinet-editor window renders THE
// SAME meshes from THE SAME engine panels — "a viewer+editor over existing
// data". A second panel renderer would be a second answer to what a mitre, a
// machined socket, a decor and an X-ray look like.
export function MovingPanel({
  panel: p, front, open, surface, outline, outlines, contour, xray, depth, profile,
  swing = null, joineryLayers: layers = null, children = null, ...handlers
}) {
  const group = useRef(null);
  const amount = useRef(0);
  // The mitre, when this piece has one (turn 8, CLAUDE.md F6). Its geometry is
  // built about the piece's own centre, so the mesh sits exactly where a box
  // would have — and the bevel shader, which measures a fragment against the
  // half-extents of the object it is on, keeps working unchanged.
  const mitre = useMitre(p);
  // ─── The joint, cut into the board (turn 11, CLAUDE.md F6) ───
  // A panel that receives tabs is extruded from its own machined outline, so a
  // socket is a real absence in the solid rather than a rectangle drawn on it.
  // Cached in 3d/panelSolid.js by panel CONFIGURATION, so this is a Map lookup
  // for every carcass after the first and nothing at all per frame.
  const machined = useMemo(
    () => (layers && !mitre ? machinedPanelGeometry(p, layers, profile) : null),
    [p, layers, profile, mitre],
  );
  const bevelRef = useBevel(mitre?.box || p.box, profile, surface.sprayed && !contour && !xray);

  // A door rotates about its hinge edge, so the mesh is offset inside a group
  // pinned to that edge; everything else sits at its own centre.
  const hingeAtRight = p.meta?.hinge === 'R';
  const centre = mitre?.box || p.box;
  const pivot = front === 'door'
    ? [mm(hingeAtRight ? p.box.x + p.box.w : p.box.x), mm(p.box.y + p.box.h / 2), mm(p.box.z + p.box.d / 2)]
    : [mm(centre.x + centre.w / 2), mm(centre.y + centre.h / 2), mm(centre.z + centre.d / 2)];
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
      // Swings on the hinge side, about the group's origin. How FAR is decided
      // by what is beside the cabinet (turn 8, CLAUDE.md F5): a door with a
      // wall on its hinge side stops square, because past square its free edge
      // comes back over the hinge and into the plaster.
      const dir = p.meta?.hinge === 'R' ? 1 : -1;
      group.current.rotation.y = dir * a * (swing ?? Math.PI * 0.55);
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
      {/* Anything screwed TO this piece and travelling with it — the door half
          of a hinge (turn 12, CLAUDE.md F6.1). Inside the group, so the swing
          is free: no second animation to keep in step with this one. */}
      {children}
      {/* ─── Turn 16 (CLAUDE.md F8): THE PIECE SAYS WHICH PIECE IT IS ───
          The wall-units-do-not-shine diagnosis has to READ the scene — "read
          the actual door materials of a wall vs base unit from the scene" —
          and a scene graph of anonymous meshes cannot be read. The panel id is
          the engine's own, the same id the BOM prints and the sheet lays out,
          so the harness names what it measured in the project's vocabulary.
          It costs one object per mesh and reaches nothing. */}
      <mesh
        position={meshOffset}
        castShadow={!contour}
        receiveShadow={!contour}
        userData={{ ccPanelId: p.id, ccRole: p.role, ccMaterialRole: p.material_role }}
        {...handlers}
      >
        {/* A mitred strip carries its own geometry (turn 8, CLAUDE.md F6), and
            since turn 11 so does a panel with the joint machined into it (F6).
            Everything else is the box the engine emitted. */}
        {/* eslint-disable-next-line no-nested-ternary */}
        {mitre
          ? <primitive object={mitre.geometry} attach="geometry" />
          : (machined
            // `dispose={null}`: this geometry is SHARED — one solid serves every
            // identical side panel in the project — so the cache owns it and a
            // unit being deleted must not take the other thirteen carcasses'
            // buffers with it.
            ? <primitive object={machined} attach="geometry" dispose={null} />
            : <boxGeometry args={[mm(p.box.w), mm(p.box.h), mm(p.box.d)]} />)}
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
          //
          // ─── Turn 11 (CLAUDE.md F1.3): AND ON THE TRANSLUCENCY ───
          // The same trap, one property along, and it is the half of "X-ray
          // resets itself" that lives in the renderer. Turning X-ray on flips
          // `transparent` on a material three has ALREADY compiled and cached a
          // program for; the flag is part of what that program is built for, and
          // the way to ask for a new one is a new material. Without it the mode
          // was on in the store and off on the screen after the next redraw —
          // which is exactly what a mode that "resets" looks like.
          key={`${decor ? 'decor' : 'plain'}-${translucent ? 'through' : 'solid'}`}
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
          // ─── Turn 15 (CLAUDE.md F2): the outlines INSIDE the cabinet ───
          // The fill is pushed a hair back in the DEPTH BUFFER so an edge line
          // lying exactly on a neighbouring panel's face wins instead of
          // z-fighting it away. Nothing moves; only what the depth test
          // believes. Numbers from profile.appearance.outline.polygonOffset.
          {...panelFillOffset(profile)}
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
  unit, result, wall, walls = null, roomCentre, selected, snapStep, onSelect, onMove, onMoveToWall,
  onMoveShelf, onShelfDragState,
  orbitRef, showLabels = true, shelfDrag = null, openFronts = null, onToggleFront, onFocus, onContextMenu,
  frontColour = null, design = null, onSetTopInfill, onFillToCeiling, groupRef = null,
  onSetEndPanelTop, onEndPanelToCeiling, onSetSideInfillTop, onSideInfillToCeiling,
  profile, finishes, outlines = true, contour = false, xray = false, sheen = null,
  showHinges = false,
  wallGaps = null, showAllDims = false, unitDesign = null,
  // ─── One element inside this cabinet (turn 9, CLAUDE.md F4) ───
  // `selectedElement` is the ENGINE's own panel id (`SHELF-2`) or null, which
  // is the same id the BOM prints and the CNC sheet lays out — so there is no
  // second identity to keep in step with it.
  selectedElement = null, onSelectElement, onMoveElementDepth, onEditElement, onAddItems,
  // The ink every dimension caption on this cabinet is written in (turn 11,
  // CLAUDE.md F1.5). Null falls back to the two tones the scene has always had.
  dimensionColour = null,
  // Which BAY is being pointed at in the "which side" picker (turn 12, F5.3).
  // An index into this cabinet's own zones, or null.
  zoneHint = null,
}) {
  const { camera, gl } = useThree();
  const drag = useRef(null);
  // Which top edge is being DRAGGED. Purely visual: it decides which handle is
  // lit, nothing else (CLAUDE.md F3 — "click the edge → the edge highlights").
  //
  // ─── Turn 14 (CLAUDE.md F1.3): it is cleared when the hand lets go ────────
  // It never was, and that is the "blue helper line that stays". The band is
  // the full length of the run and lies on top of the piece, so once a top
  // infill had been dragged — or double-clicked to the ceiling — a blue bar sat
  // across the finished work until the cabinet was deselected and re-drawn.
  // The owner reads it as a leftover guide line, which is exactly what it is: a
  // handle is lit while it is being HELD, and this is the release.
  const [activeEdge, setActiveEdge] = useState(null);
  // ─── Turn 14 (CLAUDE.md F1.4): THE HOVER MARK IS GONE ─────────────────────
  //
  // Turn 6 drew the selection box a second time, quieter, under the cursor —
  // "this is what you would get". The owner's verdict after living with it: a
  // kitchen is a wall of cabinets, so moving the mouse anywhere lights
  // something up, and a mark that appears without being asked for stops meaning
  // "this one" and starts meaning "the mouse is somewhere". Highlight is what a
  // CLICK does now, and nothing else.
  //
  // What goes with it is the debounce, the deferred clear, and the unit group's
  // own pointerover/pointerout — and that last one is worth its own sentence,
  // because it is not just tidying. An object with a handler is an object R3F
  // RAYCASTS, recursively: with those two props on the group, every outline
  // line, every joint line and every invisible tool band inside a cabinet was
  // in the intersection list of every click in the room. That is what made a
  // click on the floor in front of a base unit look like a click on the unit
  // (F1.1). The panels keep their own handlers, so nothing that was clickable
  // has stopped being clickable.
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const wallWidthMm = wall.width;
  // The cabinet's bays — the openings between its vertical partitions. One zone
  // when there is no partition, which is when nothing is ever highlighted.
  const boardT = unit.params.board_t ?? profile.board.thickness;
  const bays = useMemo(() => widthZones({
    width: unit.params.width,
    boardT,
    partitions: (unit.params.sections?.[0]?.items || []).filter((i) => i.kind === 'partition'),
  }), [unit.params.width, boardT, unit.params.sections]);

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

  /**
   * Where the pointer is standing ON THE FLOOR, in ROOM millimetres.
   *
   * The drag along a wall is projected onto a plane parallel to that wall; this
   * is the other question, and it is the one that lets a cabinet go round a
   * corner (turn 11, CLAUDE.md F4.1): the floor is one plane for the whole room,
   * so a point on it can be asked which wall it belongs to.
   */
  const pointerToFloor = useCallback((clientX, clientY) => {
    const rect = gl.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    const target = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(FLOOR, target)) return null;
    return { x: target.x / MM + roomCentre.x, y: target.z / MM + roomCentre.y };
  }, [camera, gl, raycaster, roomCentre.x, roomCentre.y]);

  const startDrag = useCallback((e) => {
    e.stopPropagation();
    // ─── Turn 13 (CLAUDE.md F5.1): CTRL+CLICK BUILDS A SET ───
    // With the modifier down this is not a grab, it is a tick: the cabinet
    // joins or leaves the selection and stays exactly where it is. Letting the
    // drag run as well would move six cabinets by the two pixels the hand
    // wobbles while it is ticking the sixth.
    //
    // The NATIVE event is asked first, and that is not belt-and-braces: a
    // pointer event carries `ctrlKey` on its PROTOTYPE, and react-three-fiber
    // builds its own event object by spreading the DOM one — which copies own
    // enumerable properties and therefore leaves every modifier behind. Read
    // off the synthetic event alone, Ctrl+click is an ordinary click and the
    // selection replaces instead of growing. The browser walk is what found it.
    const native = e.nativeEvent || e;
    const additive = Boolean(native.ctrlKey || native.metaKey || e.ctrlKey || e.metaKey);
    onSelect({ additive });
    if (additive) return;
    const hit = pointerToPlane(e.clientX, e.clientY);
    if (!hit) return;
    drag.current = { offset: alongMm(hit) - unit.position.x_mm };
    if (orbitRef?.current) orbitRef.current.enabled = false;

    const move = (ev) => {
      if (!drag.current) return;
      // ─── Cross-wall drag REMOVED (owner verdict, 08.08) ───
      // Turn 11 re-homed a unit to whatever wall the floor ray said the hand
      // was in front of. With a perspective camera the drag plane and the
      // floor ray disagree by design, so near a corner a few pixels of motion
      // read as another wall and the cabinet teleported across the room —
      // "ledwo dotknę i jest na drugiej ścianie". Dragging now NEVER changes
      // the wall; the deliberate path is the Wall dropdown in the right panel.
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
  }, [onSelect, pointerToPlane, alongMm, unit.position.x_mm, unit.position.wall, orbitRef,
    onMove, onMoveToWall, pointerToFloor, walls, snapStep, W]);

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

  // …and the box round the ONE piece that is selected inside it (turn 9, F4.1).
  const selectedElementBox = useMemo(
    () => (selectedElement
      ? result.panels.find((p) => p.id === selectedElement && p.box)?.box || null
      : null),
    [selectedElement, result.panels],
  );

  // Where the bought hardware sits (turn 7, CLAUDE.md F3). Derived from the
  // engine's own drilling, so a hinge is drawn where the machine bores for it.
  const hardware = useMemo(() => hardwareInstances(result, profile), [result, profile]);

  // ─── Every number this cabinet has (turn 8, CLAUDE.md F7) ───
  // Built from the ENGINE's own output, never re-derived: what is shown is what
  // is cut. Ordered the way a joiner reads a cabinet — the box, what it stands
  // on, then what is inside it, then what finishes it.
  const fullDimensions = useMemo(() => {
    if (!showAllDims) return [];
    const out = [];
    const say = (key, at, text, tone) => out.push({
      key, at, text, tone,
    });
    const front = mm(D) + 0.09;
    say('w', [mm(W / 2), mm(isWallMounted ? -60 : -legHeight - 60), front], `W ${formatMm(W)}`);
    say('h', [mm(W) + 0.22, mm(H / 2), front], `H ${formatMm(H)}`);
    say('d', [mm(W / 2), mm(H) + 0.16, mm(D / 2)], `D ${formatMm(D)}`);
    say('iw', [mm(W / 2), mm(H) + 0.09, front], `internal ${formatMm(result.derived.internal_width)}`, 'dim');
    if (isWallMounted) {
      say('mount', [mm(W) + 0.22, mm(-60), front], `hung at ${formatMm(result.assemblies.mountHeight)}`, 'dim');
    } else if (legHeight > 0) {
      say('kick', [-0.22, mm(-legHeight / 2), front], `toe kick ${formatMm(legHeight)}`, 'dim');
    }
    for (const shelf of result.assemblies.shelves || []) {
      say(`shelf-${shelf.index}`, [-0.22, mm(shelf.y), front],
        `S${shelf.index} ${formatMm(shelf.y)}${shelf.locked ? ' fixed' : ''}`, 'dim');
    }
    for (const df of result.assemblies.drawerFronts || []) {
      say(`drawer-${df.index}`, [mm(W / 2), mm(df.y + df.h / 2), front + 0.02],
        `D${df.index} ${formatMm(df.h)}`, 'dim');
    }
    const infillFace = result.panels.find((p) => p.part === 'INFILL' && p.meta?.side === 'top' && p.meta?.piece === 'face');
    if (infillFace) {
      say('top-infill', [mm(W / 2), mm(infillFace.box.y + infillFace.box.h / 2), front],
        `infill ${formatMm(infillFace.box.h)}`, 'dim');
    }
    for (const ep of result.panels.filter((p) => p.part === 'END-PANEL')) {
      say(`ep-${ep.id}`, [mm(ep.box.x + ep.box.w / 2), mm(ep.box.y + ep.box.h + 40), mm(D)],
        `end panel ${formatMm(ep.h)}`, 'dim');
    }
    return out;
  }, [showAllDims, W, H, D, isWallMounted, legHeight, result]);

  // ─── How far each door may swing (turn 8, CLAUDE.md F5) ───
  // Decided by what is beside the cabinet ON THE HINGE SIDE. `wallGaps` is null
  // for a side whose neighbour is another cabinet rather than a wall, and a
  // null gap means the door is free — two doors opening into each other is a
  // different question, with a different answer, and CLAUDE.md asks about walls.
  const swingFor = useCallback((hinge) => {
    const gap = hinge === 'R' ? wallGaps?.right : wallGaps?.left;
    return doorOpenAngle({
      doorWidth: result.panels.find((p) => p.part === 'FRONT')?.w ?? W,
      hingeOffset: profile.doors.gap / 2,
      gapToWall: gap ?? null,
    }, profile);
  }, [wallGaps, result.panels, W, profile]);

  // ─── The gaps between the shelves (turn 8, CLAUDE.md F4) ───
  // Which shelf the cursor is on, and the whole ladder of clear openings in the
  // column it belongs to. Measured between FACES — the clear space a thing has
  // to fit into — not between centre lines, because a joiner asking "will the
  // toaster go in there" is asking about the clear space.
  const [hoverShelf, setHoverShelf] = useState(null);
  const shelfGaps = useMemo(() => {
    const G = Number(unit.params.board_t) || profile.board.thickness;
    return shelfGapLadder({
      positions: result.panels.filter((p) => p.part === 'SHELF' && p.box).map((p) => p.box.y),
      floor: result.assemblies.drawerZone ? result.assemblies.drawerZone.top + G : G,
      ceiling: H - G,
      boardT: G,
    }, profile.editor.mmStep).map((g, i) => ({ ...g, key: `gap-${i}` }));
  }, [result.panels, result.assemblies.drawerZone, unit.params.board_t, profile, H]);

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
      // F1.3: the handle goes out with the gesture that lit it.
      setActiveEdge(null);
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

  /**
   * ─── Grab a shelf and pull it out (turn 9, CLAUDE.md F4.2) ───
   *
   * The other axis. A shelf has always been draggable UP and DOWN; this is the
   * gesture a joiner makes when he wants one further forward or further back —
   * he takes hold of it and pulls.
   *
   * The plane is HORIZONTAL, at the shelf's own height, because that is the
   * plane the piece travels in; the vertical drag uses a plane parallel to the
   * wall for the same reason. The hit is measured along the unit's own INWARD
   * axis, so a cabinet on wall 3 of an L-shaped room needs no special case: the
   * arithmetic is in the unit's frame and the frame is the wall's.
   *
   * What is written is a SETBACK from the face, which is the number the engine
   * already takes (`front_mm`, turn 8) and the number a joiner says out loud.
   * The clamp and the 0.5 mm grid live in the store, with every other rule.
   */
  const startDepthDrag = useCallback((e, itemId, currentSetbackMm, atHeightMm) => {
    if (!itemId || !onMoveElementDepth) return;
    e.stopPropagation();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(originY + mm(atHeightMm)));
    const toPlane = (clientX, clientY) => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const target = new THREE.Vector3();
      return raycaster.ray.intersectPlane(plane, target) ? target : null;
    };
    // How far into the cabinet a world point is, in the unit's own millimetres.
    const intoMm = (point) => point.clone().sub(origin).dot(inward) / MM;

    const hit = toPlane(e.clientX, e.clientY);
    if (!hit) return;
    // Keep the grab point: the shelf must not jump to the cursor on mouse-down.
    const grabDelta = currentSetbackMm - (D - intoMm(hit));
    if (orbitRef?.current) orbitRef.current.enabled = false;

    const move = (ev) => {
      const p = toPlane(ev.clientX, ev.clientY);
      if (!p) return;
      onMoveElementDepth(itemId, D - intoMm(p) + grabDelta);
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
  }, [onMoveElementDepth, camera, gl, raycaster, origin, originY, inward, D, orbitRef]);

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

  // Which joint system this project is cut with, as its LAYER NAMES — the same
  // indirection engine/joinery.js has used since turn 8, so a second system
  // arrives as a block of numbers rather than as a rewrite of the 3D view
  // (turn 11, CLAUDE.md F6).
  const jointLayers = useMemo(
    () => (contour ? null : resolveJoineryLayers(profile, unitDesign?.joinery || null)),
    [profile, unitDesign, contour],
  );

  return (
    <group
      ref={groupRef}
      position={origin}
      rotation={[0, wall.angle + rotationRad, 0]}
      // Which cabinet this is, on the object itself (turn 13, F10). The scene
      // already marks what a thing IS — `ccHelper`, `ccFurniture`, `ccHardware`
      // — and this is the same kind of mark: it is what lets the acceptance
      // walk aim a click at a named cabinet through the camera instead of
      // guessing at a fraction of the canvas and falling back when it misses.
      userData={{ ccUnitId: unit.id }}
    >
      {/* ─── Turn 9 (CLAUDE.md F1.3) ───
          The contact shadow used to be drawn HERE, one hand-painted quad per
          unit. It is one blob for the whole run now (3d/Scene.jsx FloorShadow),
          fitted to the same furniture bounds the key light is fitted to —
          because what reads as hovering is a RUN hovering, and a per-unit
          footprint leaves a bright seam at every joint between two cabinets. */}

      {result.panels.filter((p) => p.box).map((p) => {
        const shelfId = p.part === 'SHELF' ? p.meta?.itemId : null;
        // ─── Turn 9 (CLAUDE.md F4.1) ───
        // What can be selected as an ELEMENT. It is the engine's own `shelf`
        // role and not a list of part names: SHELF, PARTITION and RAIL-PART are
        // one kind of thing to this app and always have been (they share a CNC
        // group and a BOM role), and asking the role is how the app has decided
        // every other "which pieces are these" question since turn 6.
        //
        // A partition is DERIVED — the engine builds it from the drawer stack
        // under it — so it selects and reads out, and the panel says so.
        // ─── Turn 11 (CLAUDE.md F3.1) ───
        // Turn 9 could select one kind of thing: a piece whose engine ROLE was
        // `shelf`. The whole cabinet is selectable now — sides, bottom, top,
        // back, vertical partitions, end panels, infills, the fronts — through
        // one rule in engine/elements.js, so the 3D view, the right panel and a
        // node test all agree about what a "piece" is.
        //
        // What is deliberately NOT a piece is a mechanism: a drawer box's own
        // sides, the panel that carries the runners, its fillers. Those follow
        // the stack, and the way to change one is to change the stack.
        //
        // ─── TURN 13 (CLAUDE.md F2.4) ───
        // …and turn 11 went one step too far. The owner's verdict after using
        // it: clicking a cabinet must select the CABINET. So the ROOM asks the
        // narrower question — `isMainViewElement`, which is the ADDED INTERIOR
        // items and nothing else: shelves, partitions, rails. A side, a top, a
        // bottom, a back, a door, an end panel is reached in the EDITOR window
        // (F2.3), which is where the properties now live.
        //
        // Nothing about the element paths changed. `onSelectElement`,
        // `onEditElement`, the properties block, the override store — all of it
        // is the same code the editor drives. The room simply stops sending
        // carcass clicks down it.
        const isElement = isMainViewElement(p);
        // ─── Turn 14 (CLAUDE.md F4.1) ───
        // What a DOUBLE click opens. Wider than what a single click selects,
        // and deliberately so: the owner's turn-13 verdict is that clicking a
        // cabinet selects the cabinet, and his turn-14 one is that the pieces
        // hung ON a cabinet — doors, end panels, fillers, the masking panel —
        // are reached directly rather than through the editor window. The two
        // fit together in the gesture turn 11 already taught: click selects,
        // double click opens the piece.
        const opensModal = opensOwnModal(p);
        const isShelfLike = p.role === 'shelf';
        const beingDragged = shelfDrag?.itemId && shelfDrag.itemId === shelfId;
        const front = frontKind(p);
        // ─── Turn 16 (CLAUDE.md F1.4): THIS PIECE'S OWN MATERIAL ────────────
        //
        // "An element override reaches the PICTURE." It did not: a per-element
        // material choice reached the BOM and the sheet and the view went on
        // painting the project's one front and one carcass finish, so a shelf
        // switched to Front 2's board stayed white on screen and came out of
        // the machine in oak (BACKLOG #75).
        //
        // The resolution is the ENGINE's — `panelFinish` in
        // engine/materials.js, a pure function of (panel, unit, design,
        // profile), tested there — and this only consumes it. With no design to
        // hand (a preview, a test) it falls back to the pair the view has
        // always taken, so nothing about the default picture moves.
        const own = design ? panelFinish(p, unit, design, profile) : null;
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
            // A front COLOUR is paint: it covers the decor, exactly as it does
            // in the workshop. The piece's OWN colour where it has been given
            // one, the unit's otherwise.
            frontColour: own?.overridden ? (own.colour?.hex || null) : frontColour,
            sheen,
            ...(own ? { finish: own.finish } : {}),
          });
        return (
          <MovingPanel
            key={p.id}
            panel={p}
            front={front}
            // ─── Turn 12 (CLAUDE.md F6.1) ───
            // The cup and its boss are screwed to THIS door, so they hang off
            // it and swing with it. The arm and the plate stay on the carcass,
            // drawn by <Hardware> below — which is what a hinge does.
            {...(front === 'door' && (showHinges || xray) ? {
              children: (
                <DoorHinges
                  items={hardware.hinges.filter((hg) => hg.panelId === p.id)}
                  profile={profile}
                  colour={xray
                    ? profile.appearance.hardware.bracket
                    : (profile.appearance.hardware.hinge || profile.appearance.hardware.bracket)}
                  pivot={[
                    mm(p.meta?.hinge === 'R' ? p.box.x + p.box.w : p.box.x),
                    mm(p.box.y + p.box.h / 2),
                    mm(p.box.z + p.box.d / 2),
                  ]}
                />
              ),
            } : {})}
            open={front ? (openFronts?.[p.id] ?? 0) : 0}
            surface={beingDragged && !contour ? { ...surface, colour: COLORS.goldSoft, texture: null } : surface}
            outline={outlineFor(profile, { contour })}
            outlines={outlines}
            contour={contour}
            xray={xray}
            depth={D}
            profile={profile}
            swing={front === 'door' ? swingFor(p.meta?.hinge) : null}
            joineryLayers={jointLayers}
            onPointerDown={(e) => {
              // ─── Turn 13 (CLAUDE.md F5.1/F5.3): THE LEFT BUTTON ONLY ───
              // A pointer-down fires for every button, so a RIGHT press on a
              // cabinet ran this handler before the context menu ever saw it —
              // selecting the unit, and therefore collapsing a multi-selection
              // the instant somebody right-clicked it to act on the set. The
              // right button belongs to the menu and to the orbit; the middle
              // one to the pan. Neither is a grab.
              if (((e.nativeEvent || e).button ?? 0) !== 0) return;
              // ─── Turn 9 (CLAUDE.md F4.1/F4.2): which axis this drag is on ───
              //
              // A shelf you have not touched yet behaves as it always has —
              // grab it and it moves UP and DOWN — and the touch also SELECTS
              // it, which is how the properties for it appear in the panel.
              //
              // Once it is the selected element, the same grab pulls it in
              // DEPTH: that is the second gesture CLAUDE.md asks for, and
              // making it the second one means neither needs a modifier key.
              // Escape (or clicking anything else) hands the vertical drag
              // back, and the height is a typed field in the panel throughout.
              //
              // A LOCKED shelf is neither: grabbing a screwed shelf and pulling
              // is grabbing the cabinet (turn 8, F4). It still selects, because
              // a shelf that cannot move can still be made thicker.
              if (isElement) {
                const alreadyOn = selectedElement === p.id;
                onSelectElement?.(p.id);
                if (isShelfLike && shelfId && alreadyOn && !p.meta?.locked) {
                  startDepthDrag(e, shelfId, p.meta?.front_mm ?? 0, p.box.y);
                  return;
                }
                if (isShelfLike && shelfId && !p.meta?.locked) { startShelfDrag(e, shelfId, p.box.y); return; }
              }
              // Everything else still DRAGS THE UNIT. Selecting a side panel is
              // how you look at that piece's properties; grabbing a side panel
              // and pulling has meant "move this cabinet" since turn 3, and a
              // gesture that changed meaning because a piece became selectable
              // would be the feature breaking the app it was added to.
              startDrag(e);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              // ─── Turn 11 (CLAUDE.md F3.3) ───
              // A double click OPENS THE PIECE: an edit modal beside it, and the
              // right panel focused on the same thing. Single click still only
              // selects, which is what makes the two gestures learnable.
              //
              // A FRONT keeps its swing as well — opening a door by
              // double-clicking it is turn 3's and is the first thing anybody
              // does to a cabinet — so a front does both: it swings, and its
              // hinge side is what the modal is about.
              if (front && onToggleFront) onToggleFront(p.id);
              if (opensModal && onEditElement) {
                onSelectElement?.(p.id);
                onEditElement(p.id, { x: e.clientX, y: e.clientY });
              }
              // …and the camera still flies to it, which is turn 5's "look at
              // THIS" and is not replaced by the modal: a joiner who
              // double-clicks a piece wants to SEE it as well as edit it, and
              // the card opens beside the piece the camera has just closed in
              // on. A front is the exception — it swings, and flying the camera
              // into a door that is opening is a way to see nothing.
              if (onFocus && !front) {
                onFocus(panelWorldCentre(p), Math.max(p.box.w, p.box.h, p.box.d));
              }
            }}
            onContextMenu={(e) => {
              e.stopPropagation();
              e.nativeEvent?.preventDefault?.();
              // ─── Turn 13 (CLAUDE.md F5.3) ───
              // Right-clicking a cabinet that is ALREADY in the selection must
              // not collapse it: the whole point of the menu over a set is that
              // it acts on the set, and re-selecting would leave the joiner
              // with the entries for one cabinet after ticking three. A
              // right-click on a cabinet OUTSIDE the selection still selects
              // it, which is what every desktop application does.
              if (!selected) onSelect();
              if (onContextMenu) onContextMenu({ x: e.clientX, y: e.clientY, panelId: p.id, part: p.part });
            }}
            onPointerOver={shelfId
              ? () => {
                // A screwed or locked shelf does not move, so the cursor must
                // not promise that it does (turn 8, F4). A SELECTED shelf moves
                // in depth, so it promises the other axis (turn 9, F4.2).
                if (p.meta?.locked) document.body.style.cursor = 'default';
                else document.body.style.cursor = selectedElement === p.id ? 'ew-resize' : 'ns-resize';
                setHoverShelf(shelfId);
              }
              : (front ? () => { document.body.style.cursor = 'pointer'; } : undefined)}
            onPointerOut={(shelfId || front)
              ? () => { document.body.style.cursor = ''; if (shelfId) setHoverShelf(null); }
              : undefined}
          />
        );
      })}

      {/* ─── Hover a shelf: the gaps in the whole column (turn 8, F4) ───
          "Are they even?" is the question a joiner asks about a set of
          shelves, and it cannot be answered one gap at a time. Hovering ANY
          shelf therefore measures EVERY gap in the column — floor to the first
          shelf, shelf to shelf, and the last one to the underside of the top —
          so a stack that is 3 mm out says so at a glance.
          It is a readout, not a drag: nothing here writes anything. */}
      {hoverShelf && !contour && !shelfDrag && (
        <group userData={{ ccHelper: true }}>
          {shelfGaps.map((g) => (
            <DimLabel
              key={g.key}
              position={[mm(W / 2), mm((g.from + g.to) / 2), mm(D) + 0.06]}
              text={formatMm(g.size)}
              tone={g.even ? 'dim' : 'gold'}
            />
          ))}
        </group>
      )}

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

      {/* ─── The joint (turn 8, CLAUDE.md F8) ───
          Solid: the division lines a tab leaves where a side meets a wieniec.
          X-ray: every tab profile, socket and dog bone. Both read off the CNC
          data, so a second joint system draws itself. Not in Contour, where
          the whole point is that everything but the silhouette goes away. */}
      {!contour && (
        <JointLines result={result} profile={profile} xray={xray} design={unitDesign} />
      )}

      {/* The bought hardware (turn 7, CLAUDE.md F3): legs and the rail always,
          the RUNNERS only in X-ray, and the hinges whenever the profile says so.
          Every position comes from engine/hardware3d.js, which reads the
          engine's own drilling — so the count of what is drawn is the count of
          what is on order.

          ─── TURN 13 (CLAUDE.md F7): WHY THEY LOOKED X-RAY-ONLY ───
          Owner: "still X-ray-only in practice". The rendering is NOT branch-
          bound — `hinges` below has been independent of `xray` since turn 11
          and CarcassHinges/DoorHinges draw the same procedural bodies either
          way. Two other things were making it true in practice, and both are
          fixed rather than argued with:

            • the flag is REMEMBERED, so a browser that switched it off once in
              turn 11 kept it off through every reload and no change to the
              default could reach it. The storage key is versioned now
              (stores/uiStore.js).
            • with the doors SHUT there is nothing to see, and that is not a
              bug: every part of a cup hinge is inside the door or inside the
              carcass behind it. Turn 12 added the BOSS for exactly this, and
              it reads the moment a door swings — which is what the capture in
              verify/t13 shows. Making a closed cabinet show its ironmongery
              would mean drawing through solid board, which is what X-ray is. */}
      <Hardware
        instances={hardware}
        profile={profile}
        xray={xray && !contour}
        hinges={showHinges && !contour}
      />

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
          // F1.3: no `setActiveEdge` — the piece is placed, so there is
          // nothing left to be holding.
          onDoubleClick={(e) => { e.stopPropagation(); setActiveEdge(null); onFillToCeiling?.(); }}
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
            onDoubleClick={(e) => { e.stopPropagation(); setActiveEdge(null); onEndPanelToCeiling?.(p.meta.panelId); }}
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
              onDoubleClick={(e) => { e.stopPropagation(); setActiveEdge(null); onSideInfillToCeiling?.(side); }}
            />
          );
        })}

      {/* ─── The inner "+" (turn 11, CLAUDE.md F4.3) ───
          On the ACTIVE unit only, and in a different colour from the pluses at
          the ends of the runs (profile.appearance.addPlus): the two ask
          different questions — that one adds a CABINET beside this one, this one
          adds something INSIDE it — and two identical discs a hand's width apart
          is a mistake waiting for a Friday afternoon.

          It hangs in the middle of the carcass, standing just proud of the door
          line so a closed front cannot swallow it. Clicking it leaves the unit
          selected and opens the right panel's Add items section, which is where
          the answer to "what goes inside" already lives.

          It is hidden the moment the unit is deselected — and while a shelf is
          being dragged, for the same reason the run pluses are: a control that
          appears under a moving hand is a control you press by accident. */}
      {selected && !contour && !shelfDrag && onAddItems && (
        <AddPlus
          position={[mm(W / 2), mm(H / 2), mm(D) + 0.12]}
          size={mm(profile.ui.addPlusMinGapMm) * 0.8}
          colour={profile.appearance.addPlus.inner}
          title="Add something inside this unit"
          onClick={onAddItems}
        />
      )}

      {/* ─── The bay being pointed at (turn 12, CLAUDE.md F5.3) ───
          "the zones left/right of the partition highlight, the user clicks
          one". A translucent slab filling the clear opening — not an outline,
          because what is being chosen is a VOLUME ("the shelf goes in there")
          and an outline reads as a piece. It exists only while the pointer is
          over the choice, and it carries `ccHelper` like every other tool mark
          so it never reaches a render. */}
      {zoneHint != null && bays[zoneHint] && !contour && (
        <mesh
          userData={{ ccHelper: true }}
          position={[
            mm(bays[zoneHint].centre),
            mm(H / 2),
            mm(D / 2),
          ]}
          raycast={null}
        >
          <boxGeometry args={[mm(bays[zoneHint].size), mm(H - 2 * boardT), mm(D * 0.9)]} />
          <meshBasicMaterial
            color={profile.appearance.addPlus.inner}
            transparent
            opacity={0.22}
            depthWrite={false}
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

      {/* Selection (turn 6, CLAUDE.md F5): a thin dashed navy box standing
          clear of the SOLID — doors stand proud of the carcass and an end panel
          stands outside it, so a mark drawn on the carcass would cut through
          both. Turn 14 (F1.4): it appears on a CLICK and on nothing else. */}
      {/* ─── Turn 11 (CLAUDE.md F1.2): EXACTLY ONE THING IS SELECTED ───
          With a shelf selected inside it, the CABINET is not selected — it is
          the thing the shelf is in. Turn 9 drew both marks at once, so a joiner
          editing one shelf was looking at two dashed boxes and had to work out
          from the right-hand panel which of them the fields belonged to.
          (Turn 6's quieter hover copy of this mark is deleted — F1.4.) */}
      {selected && !contour && !selectedElement && (
        <SelectionOutline box={solid} profile={profile} opacity={1} />
      )}

      {/* ─── The selected ELEMENT (turn 9, CLAUDE.md F4.1) ───
          The SAME mark the cabinet gets, round the piece instead of round the
          box: a joiner who has learnt what a dashed blue outline means has
          learnt it once. Drawn from the engine's own panel box, so a shelf
          somebody has made 25 mm and pulled out to the face is outlined at the
          size it will be cut. */}
      {selectedElementBox && !contour && (
        <SelectionOutline box={selectedElementBox} profile={profile} opacity={1} />
      )}

      {/* The unit's own W / H / D. Written in the project's DIMENSION INK
          (turn 11, CLAUDE.md F1.5) — red by default — because these are
          dimensions and a dimension has one colour wherever it appears. The
          SELECTED cabinet keeps the gold, which is not a colour choice: it is
          the answer to "which one am I holding". */}
      {showLabels && (
        <group userData={{ ccHelper: true }}>
          <DimLabel position={[mm(W / 2), mm(isWallMounted ? 0 : -legHeight) - 0.09, mm(D)]} text={formatMm(W)} tone={selected ? 'gold' : 'dim'} colour={selected ? null : dimensionColour} />
          <DimLabel position={[mm(W) + 0.16, mm(H / 2), mm(D)]} text={formatMm(H)} tone={selected ? 'gold' : 'dim'} colour={selected ? null : dimensionColour} />
          <DimLabel position={[mm(W / 2), mm(H) + 0.1, mm(D / 2)]} text={`${unit.params.unit_num} · ${formatMm(D)} deep`} tone={selected ? 'gold' : 'dim'} colour={selected ? null : dimensionColour} />
        </group>
      )}

      {/* ─── Every number this cabinet has (turn 8, CLAUDE.md F7) ───
          The right-click toggle. It is per UNIT and not global for the reason
          it is worth having at all: this much text over a whole kitchen is a
          wall of numbers, and over ONE cabinet it is the answer to "what did I
          set this to". Tool chrome, so it never reaches a render. */}
      {showAllDims && !contour && (
        <group userData={{ ccHelper: true }}>
          {fullDimensions.map((d) => (
            <DimLabel
              key={d.key}
              position={d.at}
              text={d.text}
              tone={d.tone || 'gold'}
              colour={d.tone === 'dim' ? dimensionColour : null}
            />
          ))}
        </group>
      )}
    </group>
  );
}
