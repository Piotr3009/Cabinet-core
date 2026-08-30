import {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { mm, MM, COLORS } from './constants.js';

// ─── Turn 30 (CLAUDE.md F21): how thick the PANE is drawn ────────────────────
// 4 mm is what a cabinet door is glazed with. It is a picture and not a cut —
// glass is ordered, never machined here — so it is a constant in the view
// rather than a number in the profile a workshop might mistake for a spec.
const GLASS_PANE_MM = 4;

// ─── TURN 52 (CLAUDE.md F5, decision 2): THE WATCH INSERT'S OWN LIGHT ───────
// The strip is 4 mm — the app's own flexi, the same width the groove is cut to
// (`reference/lisp/KIT_LED_GROOVE.lsp ledFlexiWidth`) — and it stands a hair
// proud of the rail's inner face so it reads as a strip and not as a stripe
// painted on the board.
const WATCH_LED_WIDTH_MM = 4;
const WATCH_LED_STANDOFF_M = 0.0015;
// The warm white the app's own strips are drawn in, and how hard this one
// throws. It is a PICTURE — nothing here reaches a hole, a cut or a BOM line,
// which is the same standing every number in `profile.lighting` has.
const WATCH_LED_HEX = '#ffe9c2';
const WATCH_LED_LUX = 6;
// …and how far the beam is turned DOWN off the horizontal. A rect area light
// emits along its own −z; a rotation of −θ about x carries that to
// (0, −sin θ, −cos θ) — back into the drawer AND down onto the watches.
const WATCH_LED_TILT_RAD = 0.5;
/**
 * How far up the FRONT RAIL the line runs — under the glass, at the watches.
 *
 * Measured from the rail's OWN bottom edge (`box.y`, which is the top of the
 * tray's base), which is the frame `engine/watchDrawer.js` publishes it in as
 * `led.railY`. Measuring it from the tray's floor instead would put the strip
 * one board thickness high, and the light would graze the glass.
 */
const watchLedRailY = (profile) => {
  const s = watchDrawerSpec(profile);
  return s.insideDepthMm - s.glassT - s.ledBelowGlassMm;
};
import {
  contourSurface, decorFailed, decorPlacement, decorTexture, onDecorLoad, outlineFor,
  panelOutlineOffset,
  panelFillOffset, surfaceFor,
} from './materials.js';
import { bevelHook, createBevelState, syncBevelState } from './bevel.js';
import Hardware, {
  DoorHinges, Extractor, FrontHandle, hingeSpecsFor,
} from './Hardware.jsx';
import HoverDimensions from './HoverDimensions.jsx';
import EdgeHandle from './EdgeHandle.jsx';
import AddPlus from './AddPlus.jsx';
import Cornice from './Cornice.jsx';
import DrillRings from './DrillRings.jsx';
import LedStrips from './LedStrips.jsx';
import LedIcons from './LedIcons.jsx';

// A stable empty list: a fresh [] would rebuild every panel solid on every
// render.
const EMPTY_DRILLS = [];
import PartMachining from './PartMachining.jsx';
import { shakerFrontGeometry } from './shakerSolid.js';
import { isShakerFront } from '../engine/shaker.js';
import { panelRecesses } from '../engine/recesses.js';
// T54-F1: the ghost line draws the CARCASS cut — the engine's own offset of
// the ceiling — so the drag hint and the boards cannot disagree.
import { carcassCutPts } from '../engine/puzzle.js';
// T52 (CLAUDE.md F5): where the watch insert's strip runs in its front rail —
// the ENGINE's own number, so the picture and the groove agree.
import { watchDrawerSpec } from '../engine/watchDrawer.js';
// The LTC tables a RectAreaLight needs. Lazy and once per app — the room calls
// it too, and calling it twice is a no-op; without it the insert's strip would
// light nothing at all (the same chat-fix T33's own strips needed).
import { ensureLtc } from './LedStrips.jsx';
import SelectionOutline, { solidBounds } from './SelectionOutline.jsx';
import DimLabel from './DimLabel.jsx';
import DimensionChain from './DimensionChain.jsx';
import { formatDimension, formatMm } from '../engine/format.js';
import { hardwareInstances } from '../engine/hardware3d.js';
import { resolveRunnerVariant } from '../engine/runners.js';
import { resolveHingeFinish, resolveHingePlate } from '../engine/hinges.js';
// ─── TURN 47 (CLAUDE.md F6): THE GHOST LINE READS THE ONE `ceilingAt` ───────
// *"It reads `ceilingAt` — the same one, no second chain."* `3d/Room.jsx`
// traces the wall from this very module and the engine is handed the cut from
// it; a drag ghost that lerped its own diagonal would be the two-chain disease
// this house has already paid for once.
import { ceilingPolyline, slopeInfillMm } from '../lib/slopeLine.js';
import { wallElements } from '../lib/wallElements.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useStorageBase } from '../lib/storageBase.js';
import {
  columnOfItem, columnOfShelf, fieldFromPos, interiorFloor, lightBelow, shelfColumns,
} from '../engine/shelfHeights.js';
import { joineryLayers as resolveJoineryLayers } from '../engine/joinery.js';
import { dimensionStyle } from '../engine/dimensionArrows.js';
import { drawerFrontDimsVisible, frontDimensionRows } from '../engine/frontDimensions.js';
import { isMainViewElement, opensOwnModal } from '../engine/elements.js';
import { panelFinish } from '../engine/materials.js';
// ─── TURN 49 (CLAUDE.md F9): AND WHETHER IT IS A VENEER ────────────────────
// The finish alone cannot say for a FRONT — a front veneer borrows an EGGER
// scan (T20 F12.3) and is stored as a decor — so the piece's own material SLOT
// is asked instead. Two engine readers, called; nothing in `src/engine/**` is
// edited by this turn.
import { frontsAreVeneered, panelIsVeneered } from '../lib/veneerSheen.js';
import { wallAtPoint } from '../engine/room.js';
import { widthZones } from '../engine/zones.js';
import { panelSolids } from './panelSolid.js';
import { backStandoff } from '../engine/collision.js';
import { doorOpenAngle } from '../engine/doors.js';
import { drawerMotion } from '../engine/drawerMotion.js';
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
  // ─── TURN 29 (CLAUDE.md F1): AND THE FALLBACK NEEDS A LISTENER TOO ───────
  //
  // Found by the walk, on the very machine rule 7 is written for. When the scan
  // FAILS, the failure itself is a notification and this memo re-runs — and
  // then asks for the fallback's texture, which has only just started loading
  // and comes back null. Nothing was ever listening for THAT image, so no
  // second re-render ever came: the panel stayed blank until something else in
  // the app happened to touch it.
  //
  // So both urls are subscribed. It also starts the fallback's own download at
  // mount rather than at the moment of failure, which is one 512 px file for
  // the whole project and is the difference between mock mode WORKING and mock
  // mode working eventually.
  const fallbackUrl = surface?.fallback?.texture || null;
  useEffect(() => {
    const offs = [];
    if (url) offs.push(onDecorLoad(url, () => bump((n) => n + 1)));
    if (fallbackUrl && fallbackUrl !== url) offs.push(onDecorLoad(fallbackUrl, () => bump((n) => n + 1)));
    return () => { for (const off of offs) off(); };
  }, [url, fallbackUrl]);

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
  swing = null, joineryLayers: layers = null, children = null,
  machining = false, drills = [], slide = false, travel = null, ...handlers
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
  // ─── Turn 20 (CLAUDE.md F8): …and every other cut with it ───────────────
  // `panelSolids` returns the board with every drilling, pocket and groove
  // taken OUT of it, and — separately, because a cut is raw board and not a
  // decor — the walls and floors of those cuts. Same cache, same key, so a
  // kitchen of fourteen identical carcasses still builds two side geometries.
  // ─── Turn 26 (chat, owner: "usuń te zagłębienia") ───────────────────────
  // A bored drilling leaves a ring of wall COPLANAR with the face it is bored
  // into, and two coplanar surfaces have no depth order — that is the flicker
  // the owner kept circling, and why the back of a cabinet showed through its
  // own front. The room therefore gets a CLEAN board and the holes are drawn
  // as decals by 3d/DrillRings.jsx. The workshop overlay is a different
  // question: with a part on a bench — the cabinet editor, the detail window —
  // the machining is what you are there to look at, so the solid keeps its
  // cuts. R10 is untouched: the sheet is still the truth and the scene still
  // follows it; only the way a hole is DRAWN has changed.
  const boredDrills = machining ? drills : EMPTY_DRILLS;
  const built = useMemo(
    () => (layers && !mitre ? panelSolids(p, layers, profile, boredDrills) : null),
    [p, layers, profile, mitre, boredDrills],
  );
  // ─── Turn 25 (CLAUDE.md F3): THE SHAKER IS A TRAY, NOT A SLAB ───────────
  // A recess in the face, leaving the frame standing — one solid, so the
  // rebate's walls and the frame's face cannot z-fight, and the shadow those
  // walls throw at a grazing angle is what makes it read as a shaker rather
  // than as a rectangle drawn on a door (3d/shakerSolid.js). Cached by leaf
  // size and frame, so a kitchen of identical doors builds one geometry.
  //
  // ─── TURN 26 (CLAUDE.md R10 / F3.3): …AND ITS DRILLING ──────────────────
  // A shaker leaf never reached `panelSolids`, so it was the one FRONT class
  // whose cups and cup screws the scene did not show. The tray takes the same
  // `engine/recesses.js` records every other board reads, and bores them
  // itself — one solid, which is turn 25's own reason for building it by hand.
  // ─── TURN 50 (CLAUDE.md F6): …AND A CUT LEAF IS A TRAY TOO ──────────────
  // T46 sent a leaf cut on the slope to `panelSolids` and it lost its recess —
  // the owner: *"shaker nie powinien znikać jak najedziemy na skos, powinien
  // się renderować razem z drzwiami."*  The tray holds a polygon now, so the
  // line below is unchanged and it is `shakerSolid.js` that stopped refusing.
  const shaker = useMemo(() => {
    if (mitre) return null;
    if (!isShakerFront(p) || !profile?.appearance?.cuts?.enabled) return shakerFrontGeometry(p);
    return shakerFrontGeometry(p, panelRecesses(p, drills, { thickness: p.box.d, profile }));
  }, [p, mitre, drills, profile]);
  const machined = shaker || built?.solid || null;

  // ─── CHAT FIX 15.08.2026: THE OUTLINE DRAWS THE BOARD, NOT THE DRILLING ──
  //
  // Owner, off his own doors: "pokazuje linie CNC na zawiasach — to
  // niepotrzebne" — every closed leaf wore its cup rims on the OUTSIDE.
  // Measured on the running build: the marks survive DrillRings being hidden
  // and vanish the moment Outlines is toggled off, so the carrier is the
  // Edges pass — the cup recess is milled into the BACK (that was checked
  // too), and it is its RIM CREASES that the fat-line pass carries through
  // 25 mm of board.
  //
  // The fix is the owner's own sentence: the pretty view's contour is the
  // BOARD — silhouette and shaker frame — never the machining. So the Edges
  // pass gets a PLAIN solid: the same leaf with no recesses bored. The
  // TECHNICAL views keep every rim — contour and X-ray exist to show the
  // work, so there the pass still reads the machined geometry.
  const outlinePlain = useMemo(() => {
    if (mitre) return null;
    if (isShakerFront(p)) return shakerFrontGeometry(p);
    return null;
  }, [p, mitre]);
  useEffect(() => () => { outlinePlain?.dispose?.(); }, [outlinePlain]);
  const cuts = built?.cuts || null;
  const bevelRef = useBevel(mitre?.box || p.box, profile, surface.sprayed && !contour && !xray);

  // ─── TURN 26 (CLAUDE.md F5.2): AND A D/W FRONT DROPS ────────────────────
  // Owner: "it opens sideways." It did, because the scene had one way for a
  // FRONT to open and a D/W panel is a front. It is not on cup hinges at all:
  // it is screwed to the appliance's own door and falls FORWARD about its
  // BOTTOM edge. The panel says which (`meta.opening`), so this is a fact
  // about the PIECE and not a question about what kind of cabinet it is on.
  //
  // Turn 27 (CLAUDE.md F2.1): the value is `'drop'` — the same word the unit
  // type uses (`frontOpens: 'drop'`), because a front that falls forward is
  // not a species of cabinet and the two names for it were one name too many.
  const drops = front === 'door' && p.meta?.opening === 'drop';

  // A door rotates about its hinge edge, so the mesh is offset inside a group
  // pinned to that edge; a drop front rotates about its BOTTOM one; everything
  // else sits at its own centre.
  const hingeAtRight = p.meta?.hinge === 'R';
  const centre = mitre?.box || p.box;
  // eslint-disable-next-line no-nested-ternary
  const pivot = drops
    ? [mm(p.box.x + p.box.w / 2), mm(p.box.y), mm(p.box.z + p.box.d / 2)]
    : (front === 'door'
      ? [mm(hingeAtRight ? p.box.x + p.box.w : p.box.x), mm(p.box.y + p.box.h / 2), mm(p.box.z + p.box.d / 2)]
      : [mm(centre.x + centre.w / 2), mm(centre.y + centre.h / 2), mm(centre.z + centre.d / 2)]);
  // eslint-disable-next-line no-nested-ternary
  const meshOffset = drops
    ? [0, mm(p.box.h / 2), 0]
    : (front === 'door' ? [mm(hingeAtRight ? -p.box.w / 2 : p.box.w / 2), 0, 0] : [0, 0, 0]);

  // ─── Turn 20 (CLAUDE.md F3): THE BOX TRAVELS TOO ───────────────────────
  // `slide` is a piece of a drawer that is not its face — a side, the box
  // front or back, the bottom. It has no gesture of its own and no swing; it
  // rides the SAME 0..1 its front does, so the two cannot get out of step.
  const travels = Boolean(front) || slide;
  useFrame((_, delta) => {
    if (!group.current || !travels) return;
    const target = open;
    if (Math.abs(amount.current - target) < 0.001) { amount.current = target; } else {
      // Frame-rate independent easing: fast at the start, settled in ~0.35 s.
      amount.current += (target - amount.current) * Math.min(1, delta * 8);
    }
    const a = amount.current;
    // The animation is an OFFSET from where the engine put the panel, never an
    // absolute position: writing position.z directly moved every front to
    // z = 0, i.e. inside the carcass, and the unit rendered as an open box.
    if (front === 'drawer' || slide) {
      // ─── Turn 20 (CLAUDE.md F3.1): AS FAR AS THE RUNNER GOES ───────────
      // The drawer's own NOMINAL LENGTH — a MOVENTO is full-extension and the
      // box comes out its own length. `depth × 0.75` was turn 3's guess, made
      // before the app knew which runner a drawer was on, and it is what left
      // a face standing proud of a box that had not moved.
      group.current.position.z = pivot[2] + mm(travel ?? depth * 0.75) * a;
      group.current.rotation.y = 0;
    } else if (drops) {
      // ─── TURN 27 (CLAUDE.md F2.1): THE AXIS WAS INVERTED ────────────────
      //
      // Turn 26 turned this NEGATIVE and reasoned it out backwards. A rotation
      // by θ about +x carries a point at +y (the leaf's top edge, measured
      // from the pivot at its bottom) to z = y·sin θ — so a NEGATIVE θ sends
      // the top edge to −z, back INTO the carcass, which is the owner's "it
      // drops the wrong way". POSITIVE is forward, towards the room, and the
      // panel finishes leaning out over the plinth.
      //
      // The angle is the PIECE's own (`meta.openAngleDeg`, the type's 45°),
      // handed down as this front's `swing` like every other front's.
      group.current.rotation.x = a * (swing ?? Math.PI / 4);
      group.current.rotation.y = 0;
      group.current.position.z = pivot[2];
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

  const body = (
    <group ref={group} position={pivot}>
      {/* Anything screwed TO this piece and travelling with it — the door half
          of a hinge (turn 12, CLAUDE.md F6.1). Inside the group, so the swing
          is free: no second animation to keep in step with this one. */}
      {children}
      {/* ─── Turn 17 (CLAUDE.md F4.1): THE MACHINING, ON THE PIECE ───────────
          Every pocket, mark and drilled hole this part carries, read off the
          SAME `panel.cnc` and `drills` the DXF is written from
          (3d/PartMachining.jsx). Off by default: it is a WORKSHOP overlay and
          the room view is a picture of furniture, so only the two windows that
          show a part on a bench — the cabinet editor and the detail window —
          ask for it.

          The lines are in the cabinet's own millimetres, and this group stands
          at `pivot`; backing them out by exactly that puts them where the
          engine says they are, and leaves them inside the group that animates,
          so a door's hinge cups swing with the door. */}
      {machining && (
        <group position={[-pivot[0], -pivot[1], -pivot[2]]}>
          <PartMachining panel={p} drills={drills} profile={profile} />
        </group>
      )}
      {/* ─── Turn 25 (CLAUDE.md F4.3): THE HANDLE ───
          Screwed THROUGH this front, so it lives inside the group that
          animates: a door's handle swings with the door and a drawer's comes
          out with the drawer. Rendered HERE rather than handed in from
          outside, because `pivot` is what a handle has to be backed out by and
          a door's pivot is its hinge edge while a drawer front's is its middle
          — one formula, in the one place that already knows which. */}
      {/* ─── Turn 30 (CLAUDE.md F21): THE PANE ───────────────────────────
          "frame + translucent panel in 3D". The FRAME is the board itself —
          its aperture is a full-depth cutout, so `panelSolids` takes it out
          and what is left is a frame. This is the glass in the hole: one
          translucent slab, at the aperture the engine measured and the order
          form is written to, inside the group that animates so it swings with
          its door. It is not a board and it is not machined; it is what the
          glazier delivers. */}
      {/* ─── TURN 33 (CLAUDE.md F4): THE MIRROR, ON ITS CHOSEN FACE ───────
          Bonded to the door — inside or outside — so it lives in the group
          that swings: open the door and the inside mirror shows. A thin
          metallic plane with the environment in it (realistic lighting is
          where it reads as glass); the ORDER is the engine's own
          `Mirror W × H` line, front minus the profile's margin a side. */}
      {p.meta?.mirror && (
        <mesh
          position={[
            mm(p.box.x + p.box.w / 2) - pivot[0],
            mm(p.box.y + p.box.h / 2) - pivot[1],
            (p.meta.mirror.face === 'outside'
              ? mm(p.box.z + p.box.d) + 0.0012
              : mm(p.box.z) - 0.0012) - pivot[2],
          ]}
          userData={{ ccDoorMirror: p.meta.mirror.face, ccNoBounds: true }}
        >
          <boxGeometry args={[mm(p.meta.mirror.w), mm(p.meta.mirror.h), 0.002]} />
          <meshPhysicalMaterial
            color="#e8edf0"
            metalness={1}
            roughness={0.03}
            envMapIntensity={2.2}
          />
        </mesh>
      )}
      {p.meta?.glass && (
        <mesh
          position={[
            -pivot[0] + mm((p.meta.glass.frame + p.meta.glass.aperture.w / 2) - p.box.w / 2),
            -pivot[1],
            -pivot[2],
          ]}
          userData={{ ccGlassPane: p.id, ccNoBounds: true }}
        >
          <boxGeometry args={[
            mm(p.meta.glass.aperture.w),
            mm(p.meta.glass.aperture.h),
            mm(GLASS_PANE_MM),
          ]}
          />
          <meshPhysicalMaterial
            color="#eef3f4"
            transparent
            opacity={0.42}
            roughness={0.06}
            metalness={0}
            transmission={0.85}
            thickness={0.004}
          />
        </mesh>
      )}
      {p.meta?.handle && (
        // The surface is the PANEL's own, not `<Hardware>`'s: a handle is
        // mounted by the front it is screwed through, and reporting it on the
        // room surface would let `<Hardware>`'s unmount clear it (turn 21's
        // registry clears a whole surface at once).
        <FrontHandle panel={p} profile={profile} pivot={pivot} surface="room-front" scope={p.id} />
      )}
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
            // The pretty view outlines the PLAIN board (see the block above);
            // contour and X-ray keep the machined solid — they are there to
            // show the work. `undefined` hands the choice back to the parent
            // mesh's own geometry, which is drei's default.
            geometry={(contour || xray) ? undefined : (outlinePlain || undefined)}
            threshold={outline.threshold}
            color={outline.colour}
            lineWidth={outline.width}
            // Turn 20 (CLAUDE.md F12.1): the line leans towards the camera as
            // far as the fill leans away from it, so an interior edge lying in
            // a neighbour's face reads in both scenes. drei hands its rest
            // props to the LineMaterial, which is where this has to land.
            {...panelOutlineOffset(profile)}
            // The contour is the TOOL, not the furniture: a render hides it
            // (3d/renderCapture.js). Tagged explicitly rather than sniffed,
            // because drei draws a fat line as a LineSegments2 — which is a
            // Mesh, and reads as furniture to anything looking at the type.
            userData={{ ccHelper: true }}
          />
        )}
        {/* ─── Turn 20 (CLAUDE.md F8.2): THE CUT FACES ────────────────────
            The walls and floors of every recess, in `appearance.cutFace` and
            in NOTHING else — a decor, a lacquer and a sprayed colour are what
            is on a board's FACE, and past the cutter there is only core. One
            merged buffer per panel configuration, so a side panel's eighteen
            holes are one draw call and every identical carcass shares it.
            Nested inside the panel's own mesh, so it is disposed with it and
            travels with every animation the board has. */}
        {cuts && !contour && (
          <mesh geometry={cuts} userData={{ ccHelper: false, ccCutFaces: p.id }}>
            <meshStandardMaterial
              color={profile.appearance.cutFace}
              roughness={0.9}
              metalness={0}
              transparent={translucent}
              opacity={faded}
              depthWrite={!translucent}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </mesh>
    </group>
  );

  // ─── TURN 33 (CLAUDE.md F3): THE SHOE SHELF LEANS ─────────────────────────
  // The CUT is a plain rectangle and the pins are the standard rows; the LEAN
  // is a picture — the board (and its stop rail, which carries the same meta)
  // rotates about the shelf's back-bottom edge by the profile's 15°. Positive
  // rotation about x drops the FRONT edge, which is what a shoe shelf does.
  //
  // ─── CHAT-FIX 25.08.2026: …AND THE SLOPE'S BOARDS LEAN ABOUT Z ────────────
  // The owner: *"dziwne boxy mi sie robia zamiast normalnie pochyly top."*
  // The roof board and the top infill run ALONG the width, so their lean is
  // about the Z axis — `meta.tilt_axis: 'z'`, deg signed CCW, pivot on the
  // line the piece hangs from. The shoe shelf carries no axis and keeps its
  // x-rotation to the letter.
  const tiltDeg = Number(p.meta?.tilt_deg) || 0;
  const tiltPivot = p.meta?.tilt_pivot || null;
  if (!tiltDeg || !tiltPivot) return body;
  const rad = THREE.MathUtils.degToRad(tiltDeg);
  const px = mm(Number(tiltPivot.x) || 0);
  const py = mm(Number(tiltPivot.y) || 0);
  const pz = mm(Number(tiltPivot.z) || 0);
  return (
    <group
      position={[px, py, pz]}
      rotation={p.meta?.tilt_axis === 'z' ? [0, 0, rad] : [rad, 0, 0]}
    >
      <group position={[-px, -py, -pz]}>{body}</group>
    </group>
  );
}


/**
 * ─── TURN 52 (CLAUDE.md F5): THE INSERT'S PANE AND ITS LIGHT ────────────────
 *
 * Rendered INSIDE the drawer's own moving group — as `children` of the front
 * rail's `MovingPanel`, exactly the way a hinge is a child of its door (T23).
 * That is not tidiness: a pane left behind in the carcass while its drawer
 * slides out is the very fault the owner found in a hinge that stayed shut,
 * and it is worse than not drawing it.
 *
 * DECISION 1 — the pane LIFTS OUT. It bears on a rebate cut in the top of the
 * tray's four rails and nothing holds it down, so it is drawn sitting DOWN in
 * the frame: the 4 mm lip of rail standing proud of it all round is the
 * picture of that decision.
 *
 * DECISION 2 — the LED lights the WATCHES. The strip is on the INNER face of
 * the FRONT rail, under the glass, and the area light on the same line is
 * turned back and DOWN into the tray. A line along the top of the frame would
 * light the pane, which is a shop display and not a wardrobe.
 *
 * @param {object} props
 *   rail   the WATCH-RAIL-FRONT panel — the piece that carries the light
 *   pane   the assembly's own `watchGlass` row for this drawer, or null
 *   pivot  the rail's own MovingPanel origin, in THREE units
 */
function WatchInsertLight({ rail, pane, pivot, profile }) {
  const y = watchLedRailY(profile);
  return (
    <>
      {pane && (
        <mesh
          position={[
            mm(pane.box.x + pane.box.w / 2) - pivot[0],
            mm(pane.box.y + pane.box.h / 2) - pivot[1],
            mm(pane.box.z + pane.box.d / 2) - pivot[2],
          ]}
          userData={{ ccWatchGlass: rail.meta.drawer, ccNoBounds: true }}
        >
          <boxGeometry args={[mm(pane.box.w), mm(pane.box.h), mm(pane.box.d)]} />
          <meshPhysicalMaterial
            color="#eef3f4"
            transparent
            opacity={0.35}
            roughness={0.05}
            metalness={0}
            transmission={0.9}
            thickness={0.004}
          />
        </mesh>
      )}
      <group
        position={[
          mm(rail.box.x + rail.box.w / 2) - pivot[0],
          mm(rail.box.y + y) - pivot[1],
          mm(rail.box.z) - pivot[2] - WATCH_LED_STANDOFF_M / 2,
        ]}
        userData={{ ccWatchLed: rail.meta.drawer, ccNoBounds: true }}
      >
        <mesh userData={{ ccWatchLedStrip: rail.meta.drawer, ccNoBounds: true }}>
          <boxGeometry args={[mm(rail.box.w), mm(WATCH_LED_WIDTH_MM), WATCH_LED_STANDOFF_M]} />
          <meshStandardMaterial
            color={WATCH_LED_HEX}
            emissive={WATCH_LED_HEX}
            emissiveIntensity={6}
            roughness={0.4}
            toneMapped={false}
          />
        </mesh>
        <rectAreaLight
          rotation={[-WATCH_LED_TILT_RAD, 0, 0]}
          args={[WATCH_LED_HEX, WATCH_LED_LUX, mm(rail.box.w), 0.03]}
        />
      </group>
    </>
  );
}

export default function UnitView({
  unit, result, wall, walls = null, roomCentre, selected, snapStep, onSelect, onMove, onMoveToWall,
  onMoveShelf, onShelfDragState,
  orbitRef, showLabels = true, shelfDrag = null, openFronts = null, onToggleFront, onFocus, onContextMenu,
  // TURN 40 (CLAUDE.md F4c): { panelId, atMm } — fly to THAT piece.
  focusPanel = null, onFocusPanelDone = null,
  frontColour = null, design = null, onSetTopInfill, onFillToCeiling, groupRef = null,
  onSetEndPanelTop, onEndPanelToCeiling, onSetSideInfillTop, onSideInfillToCeiling,
  profile, finishes, outlines = true, contour = false, xray = false, sheen = null,
  showHinges = false, hideFronts = false,
  wallGaps = null, showAllDims = false, unitDesign = null,
  // ─── TURN 29 (CLAUDE.md F2.2) ───
  // Does THIS cabinet carry its run's W and its 100 + 770? The answer is the
  // engine's (`engine/dimensions.js dimensionCarriers`) and it arrives as a
  // prop, exactly as `showAllDims` does, because it is a fact about the ROOM
  // and a cabinet cannot see the one next door. Defaults true, so a caller
  // with one cabinet in its hand — the editor window — draws as it always did.
  carriesSizeChain = true,
  // Turn 25 (CLAUDE.md F13): project-wide, so it arrives as a prop rather than
  // being read out of the store in here.
  showFrontDimensions = false,
  // Turn 34 (CLAUDE.md F5): `panelId|side` keys whose per-unit edge figure the
  // room draws as one merged leaf-to-leaf dimension instead. Null = every
  // figure this cabinet has always drawn (turn 25's own answer, to the byte).
  suppressEdgeDims = null,
  // …and the MERGED leaf-to-leaf figure(s) this cabinet carries in their place
  // — already in this unit's own frame, in `frontDimensionRows`' own shape, so
  // they go through the one DimensionChain like every other front figure.
  meetingDimRows = null,
  // ─── One element inside this cabinet (turn 9, CLAUDE.md F4) ───
  // `selectedElement` is the ENGINE's own panel id (`SHELF-2`) or null, which
  // is the same id the BOM prints and the CNC sheet lays out — so there is no
  // second identity to keep in step with it.
  selectedElement = null, selectedElements = [],
  onSelectElement, onMoveElementDepth, onEditElement, onEditDrawer, onEditWatch, onAddItems,
  // ─── TURN 42 (CLAUDE.md F1): THE ALONE ROD'S OWN TWO VERBS ───────────────
  // `onEditRail(itemId, at)` opens the hanging-rail window; `onMoveRail(itemId,
  // offsetMm)` writes the item's `pos_mm`. Both are the rod's, and neither is
  // a panel's — after this turn there is no board to borrow one from.
  onEditRail = null, onMoveRail = null,
  // Turn 31 (CLAUDE.md F8): double-click the width or height FIGURE.
  onEditSize = null,
  // Turn 19 (CLAUDE.md F1.3): double-click a hinge and its modal opens.
  onEditHinge = null,
  // The ink every dimension caption on this cabinet is written in (turn 11,
  // CLAUDE.md F1.5). Null falls back to the two tones the scene has always had.
  dimensionColour = null,
  // Which BAY is being pointed at in the "which side" picker (turn 12, F5.3).
  // An index into this cabinet's own zones, or null.
  zoneHint = null,
}) {
  // ─── TURN 52 (CLAUDE.md F5, decision 2) ─────────────────────────────────
  // The watch insert's strip is a RectAreaLight, and a RectAreaLight without
  // the LTC tables lights NOTHING — the same chat-fix T33's own strips needed.
  // Lazy and idempotent; a cabinet with no insert pays one boolean.
  const litInserts = (result?.assemblies?.watchInserts || []).length;
  useEffect(() => { if (litInserts > 0) ensureLtc(); }, [litInserts]);
  const { camera, gl } = useThree();
  const drag = useRef(null);
  // ─── TURN 47 (CLAUDE.md F6): THE GHOST LINE ───────────────────────────────
  //
  // *"During a drag into a slope zone, a ghost line shows the cut-to-be."*
  //
  // A cabinet driving under a slope is about to lose its top corner, and until
  // the hand lets go there is nothing on the screen that says so — the cut
  // arrives when the drag ends. This is the line it will be cut on, drawn while
  // the hand is still moving, so the joiner can see where to stop.
  //
  // It is a HELD signal, exactly like `activeEdge` above (T14-F1.3: "a handle
  // is lit while it is being HELD"). Nothing about it survives the release.
  const [dragging, setDragging] = useState(false);
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
  // Turn 21 (CLAUDE.md F10): this unit's own board — the interior floor is one
  // of them up, and a cabinet cut from 22 mm has its floor at 22.
  const G = boardT;
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
    setDragging(true);
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
      setDragging(false);
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

  // ─── TURN 47 (CLAUDE.md F6): …AND WHERE THAT LINE IS ──────────────────────
  //
  // The ceiling over the unit's OWN stretch of its own wall, knee by knee, less
  // the project's scribe gap — the same three numbers `slopeCutLine` hands the
  // engine and the same `ceilingPolyline` `3d/Room.jsx` traces the wall from.
  // There is no fourth idea about where the ceiling is.
  //
  // In the UNIT's own frame, because that is the frame this group is drawn in:
  // x from its left edge, y up from its carcass floor, z at its front face.
  //
  // NULL — and nothing is drawn — for every unit on every wall with no slope,
  // and for a unit under a stretch of ceiling that never dips. That is every
  // unit in every project before tonight.
  const wallSlopeList = useProjectStore((s) => s.project.wallSlopes);
  const roomHeight = useProjectStore((s) => s.project.room?.height);
  const projectDesign = useProjectStore((s) => s.project.design);
  const ghost = useMemo(() => {
    if (!dragging) return null;
    const wallIndex = unit.position?.wall ?? 0;
    const slopes = wallElements(wallSlopeList)
      .filter((e) => (e.kind ?? 'slope') === 'slope' && (e.wall ?? 0) === wallIndex);
    if (!slopes.length) return null;
    const h = Number(roomHeight) || 0;
    if (!(h > 0) || !(W > 0)) return null;
    const gap = slopeInfillMm(projectDesign);
    const x0 = Number(unit.position?.x_mm) || 0;
    const line = ceilingPolyline({
      slopes, wallWidth: wall.width, wallHeight: h, from: x0, to: x0 + W,
    });
    // Under a flat stretch there is nothing to warn about.
    if (!line.some((q) => q.y < h - 1e-6)) return null;
    // T54-F1: the ghost shows where the CARCASS will be cut, and the carcass
    // line is the ceiling less `infill / cos β` per segment — the same
    // `carcassCutPts` the engine cuts with, never a second arithmetic.
    const ceil = line.map((q) => ({ x: q.x - x0, y: q.y - baseY }));
    return carcassCutPts({ pts: ceil }, gap).map((q) => ({ x: q.x, y: Math.max(0, q.y) }));
  }, [dragging, wallSlopeList, roomHeight, projectDesign, unit.position?.wall,
    unit.position?.x_mm, wall.width, W, baseY]);
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
  // ─── TURN 36 (CLAUDE.md F2): EVERY MEMBER OF THE SET IS MARKED ───────────
  // The dashed box the PRIMARY piece has worn since turn 9, drawn once per
  // selected piece. One component, one style, one law — a set that showed
  // only its last member would be a set nobody can see.
  const selectedElementBoxes = useMemo(
    () => (selectedElements || [])
      .map((id) => result.panels.find((p) => p.id === id && p.box)?.box || null)
      .filter(Boolean),
    [selectedElements, result.panels],
  );
  const selectedElementBox = useMemo(
    () => (selectedElement
      ? result.panels.find((p) => p.id === selectedElement && p.box)?.box || null
      : null),
    [selectedElement, result.panels],
  );

  // Where the bought hardware sits (turn 7, CLAUDE.md F3). Derived from the
  // engine's own drilling, so a hinge is drawn where the machine bores for it.
  const hardware = useMemo(() => hardwareInstances(result, profile), [result, profile]);

  // ─── Turn 18 (CLAUDE.md F6.4): WHICH RUNNER EACH DRAWER IS FITTED WITH ────
  // Project → unit → drawer, the colour hierarchy exactly (engine/runners.js).
  // It is HARDWARE and never geometry, so nothing above this line knows about
  // it: the cabinet is cut identically whichever variant is chosen.
  const runnerVariants = useMemo(() => {
    const out = {};
    for (const r of hardware.runners) {
      out[r.drawer] = resolveRunnerVariant({
        drawer: r.drawer, unit, design, profile,
      });
    }
    return out;
  }, [hardware.runners, unit, design, profile]);

  // ─── Turn 19 (CLAUDE.md F1.6): WHICH HINGE EACH DOOR IS FITTED WITH ───────
  // Project (finish, plate) → the rule (the front's thickness, and whether a
  // drawer is behind this door) → the door's own assignment. ONE resolution,
  // the engine's, handed to the view — so the model on screen and the article
  // in the BOM cannot be two different hinges.
  const hingeSpecs = useMemo(() => hingeSpecsFor({
    result,
    unit,
    finish: resolveHingeFinish(design, profile),
    plate: resolveHingePlate(design, profile),
  }), [result, unit, design, profile]);
  // Where the models are served from. '' in mock mode, and '' is a complete
  // answer: the runner is drawn from the workshop's own profile instead.
  // ─── Turn 21 (CLAUDE.md F2) ───
  // Asked once at mount, this was '' forever on a build with no configuration
  // — the decor pack that carries the host lands after the scene does. The
  // hook re-renders the view when the host is known.
  const storageBase = useStorageBase();
  // Is anything open? A door part-way through its swing counts — that is when
  // the ironmongery is worth looking at (F6.7).
  const anyFrontOpen = useMemo(
    () => Object.values(openFronts || {}).some((v) => Number(v) > 0),
    [openFronts],
  );
  // ─── Turn 20 (CLAUDE.md F3): which drawer is out, and how far it goes ─────
  // Engine arithmetic (engine/drawerMotion.js), so a node test can hold the
  // travel to the runner's nominal length without a browser.
  const motion = useMemo(
    () => drawerMotion(result.panels, openFronts),
    [result.panels, openFronts],
  );

  // ─── Every number this cabinet has (turn 8, CLAUDE.md F7) ───
  // Built from the ENGINE's own output, never re-derived: what is shown is what
  // is cut. Ordered the way a joiner reads a cabinet — the box, what it stands
  // on, then what is inside it, then what finishes it.
  // ─── Turn 25 (CLAUDE.md F13): the front dimensions of THIS cabinet ───
  // Pure geometry from `engine/frontDimensions.js`, turned into the same
  // arrows every other dimension in the app is drawn with. Memoised on the
  // result, so a drag does not rebuild them per frame.
  const dimStyle = useMemo(() => dimensionStyle(profile), [profile]);
  const frontDimRows = useMemo(() => {
    if (!showFrontDimensions) return [];
    // Turn 28 (CLAUDE.md F8.3/F8.4): where the two labels sit is the PROFILE's
    // answer, resolved in the engine, so the scene still decides nothing.
    // Turn 34 (CLAUDE.md F5): the edge figures the room replaced with ONE
    // leaf-to-leaf dimension at a meeting line — decided at room level,
    // because a cabinet cannot see the one beside it.
    // ─── TURN 35 (CLAUDE.md F11): THE DRAWER FRONTS WAIT FOR THE DOOR ─────
    // The owner, 16.08: *"jeśli są szuflady w szafie, to nie pokazuj wymiarów
    // frontów szuflad, dopóki nie otworzysz szafy"*. The decision is the
    // ENGINE's (`drawerFrontDimsVisible` reads the very same `openFronts` map
    // the swing animation runs on), so the view still decides nothing; and
    // where the answer is yes the call is the three-argument one it has been
    // since turn 34, to the byte.
    const rows = drawerFrontDimsVisible(result, openFronts)
      ? frontDimensionRows(result, profile, suppressEdgeDims)
      : frontDimensionRows(result, profile, suppressEdgeDims, { drawerFronts: false });
    return [
      ...rows,
      ...(meetingDimRows || []),
    ].map((row, i) => ({
      key: `${row.kind}-${row.a || ''}-${row.b || ''}-${i}`,
      from: row.axis === 'h' ? [row.from, row.at] : [row.at, row.from],
      to: row.axis === 'h' ? [row.to, row.at] : [row.at, row.to],
      // Turn 32 (CLAUDE.md F3): the engine's collision pass decided this —
      // two gap figures that sit close stand on different rungs.
      offset: row.offsetMm || 0,
    }));
  }, [showFrontDimensions, result, profile, suppressEdgeDims, meetingDimRows, openFronts]);
  // A hair proud of the door plane, so the chain is not buried in it.
  const frontDimZ = result.params.depth + profile.doors.gap + (result.params.front_t || 25) + 1;

  // ─── TURN 21 (CLAUDE.md F10): THE ONE DERIVATION ───────────────────────────
  // It stands HERE, above the chains, because turn 26's full-dimension chain
  // reads it: a `const` declared below its own reader is a temporal dead zone
  // and the whole view throws on first render.
  // Every shelf readout in this view — the "all dims" chip, the hover ladder
  // and the live drag — is a slice of THIS. `engine/shelfHeights.js` is the
  // only place a shelf height is turned into something a person reads, and the
  // panel field on the right is the same function's other half.
  //
  // ─── TURN 28 (CLAUDE.md F3): …AND EACH COLUMN IS A BAY ────────────────────
  //
  // The owner: *"znowu pokazuje po prawej stronie szafki półki, które są po
  // lewej od divertera — to nie jest spójne; jak jest diverter, to półki
  // inaczej będą rozdzielone."*
  //
  // Turn 27 F1 taught the DRILLING which two boards carry a shelf; this list
  // never learned it, so every shelf in the cabinet was one column measured
  // against all the others and drawn down the unit's RIGHT flank whichever bay
  // it stood in. `shelfColumns` groups them through the very same
  // `engine/shelfBearers.js` resolution the ⌀7.5 ladder is bored through, and
  // hands each group the FLANK its chain belongs on. One resolution, one
  // dimension component (R11), a different anchor.
  //
  // An undivided cabinet resolves to ONE column whose bearers are BUL and BUR
  // and whose flank is `W` — which is what turn 8 shipped, to the millimetre.
  const shelfColumnList = useMemo(() => shelfColumns({
    panels: result.panels,
    floor: result.assemblies.drawerZone
      ? result.assemblies.drawerZone.top + G
      : interiorFloor(G),
    ceiling: H - G,
    width: W,
    tolerance: profile.carcass.shelfWidthClearance,
  }, profile.editor.mmStep), [
    result.panels, result.assemblies.drawerZone, G, H, W,
    profile.carcass.shelfWidthClearance, profile.editor.mmStep,
  ]);
  /** The flank a piece with no column of its own falls back to: the unit's. */
  const unitFlank = useMemo(() => ({ x: W, dir: +1, on: 'BUR' }), [W]);

  // ─── EVERY NUMBER THIS CABINET HAS, AS CHAINS (turn 26, CLAUDE.md R11) ────
  //
  // Turn 8 drew these as floating captions and the owner's turn-26 verdict is
  // the last word on that: white labels, no arrows, badly placed, rounded to
  // 1 mm. They are DIMENSIONS, so they are drawn by the one dimension
  // component like every other dimension in the app — points in, chain out.
  //
  // Two groups, and the split is F4.2's picture:
  //
  //   the FLOOR chain  everything horizontal — the width, the internal width,
  //                    the depth — lying on the floor in front of the run with
  //                    witness lines dropping to it from the front edges;
  //   the SIDE chain   everything vertical — the height, every shelf's clear
  //                    light, every drawer front, the toe kick, the infill —
  //                    running down the side of the unit, never across a face.
  const floorY = isWallMounted ? 0 : -legHeight;
  const sideOffset = profile.hoverDimensions.offsetMm * 3;

  // ─── TURN 29 (CLAUDE.md F2.1): THE VERTICAL CHAIN IS TWO SEGMENTS ────────
  //
  // The owner: *"nie ma 100, plinthu nie pokazuje"* — the base unit's chain
  // still reads a single 770, drawn across the whole 870 from the floor. The
  // law is turn 28's F8.1, restated: TWO segments on ONE vertical line, the
  // toe kick below and the carcass above, each with its own stop arrows.
  //
  // Both take the SAME offset, because that is the whole of what "one line"
  // means here, and they meet at 0 — the outside of the carcass bottom, which
  // is the datum every other number on this cabinet is measured from. A wall
  // unit has no kick and draws the one segment it has.
  const heightChain = useMemo(() => {
    const rows = [];
    if (!isWallMounted && legHeight > 0) {
      rows.push({
        key: 'kick', from: [W, -legHeight], to: [W, 0], offset: sideOffset, label: formatDimension(legHeight),
      });
    }
    rows.push({
      key: 'h', from: [W, 0], to: [W, H], offset: sideOffset, label: formatDimension(H),
    });
    return rows;
  }, [W, H, legHeight, isWallMounted, sideOffset]);

  const fullDimensions = useMemo(() => {
    if (!showAllDims) return { floor: [], side: [] };
    const floor = [];
    const side = [];
    // The floor chain measures the FRONT edge of the cabinet, pushed forward of
    // it — which is what a drawing's dimension line is.
    floor.push({
      key: 'w', from: [0, D], to: [W, D], offset: sideOffset, label: `W ${formatDimension(W)}`,
    });
    floor.push({
      key: 'iw',
      from: [G, D],
      to: [W - G, D],
      offset: sideOffset * 2,
      label: `internal ${formatDimension(result.derived.internal_width)}`,
    });
    // The DEPTH runs the other way in the same plane, off the cabinet's left.
    floor.push({
      key: 'd', from: [0, 0], to: [0, D], offset: -sideOffset, label: `D ${formatDimension(D)}`,
    });

    // The unit's own numbers stand on the unit's own flank; a SHELF's stand on
    // its BAY's (F3), which is what `flank` is for.
    const column = (key, from, to, label, step = 1, flank = unitFlank) => side.push({
      key,
      from: [flank.x, from],
      to: [flank.x, to],
      offset: flank.dir * sideOffset * step,
      label,
    });
    // ─── TURN 28 (CLAUDE.md F8.1): HEIGHT IS NEVER "FROM THE FLOOR" ───────
    //
    // The chain ran the whole way from the floor to the top of the carcass and
    // printed 870 — a number that is on no cut list, that nobody orders board
    // to and that the joiner then has to do arithmetic on to get back to the
    // two he cares about. The owner's picture is two SEGMENTS on ONE line: the
    // toe kick below and the carcass above, stacked, each with its own stop
    // arrows, sharing the vertical they stand on.
    //
    // So both take `step` 1 — the same offset, which is what "one line" means
    // here — and the carcass starts at 0 rather than at −legHeight.
    if (isWallMounted) {
      column('mount', 0, -result.assemblies.mountHeight, `hung at ${formatDimension(result.assemblies.mountHeight)}`);
    } else if (legHeight > 0) {
      column('kick', -legHeight, 0, `toe kick ${formatDimension(legHeight)}`);
    }
    column('h', 0, H, `H ${formatDimension(H)}`);
    // ─── TURN 21 (CLAUDE.md F10): ONE DERIVATION, TWO DISPLAYS ─────────────
    // This printed the STORED number — whose zero is the outside of the carcass
    // bottom — while the hover ladder printed the clear light above the
    // INTERIOR floor. 860 against 842 on the owner's screenshot, about one
    // shelf. Both come out of `clearLights`, so the chain, the ladder and the
    // panel field are the same arithmetic and cannot disagree again.
    // ─── TURN 28 (CLAUDE.md F3): A SHELF'S LADDER STANDS IN ITS OWN BAY ────
    // Its clear light is measured against the shelves it shares a compartment
    // with, and the chain is drawn on that compartment's flank — the left of
    // the unit for a left-bay shelf, the right for a right-bay one, and its
    // own partition for a middle bay.
    for (const shelf of result.assemblies.shelves || []) {
      const board = result.panels.find((p) => p.part === 'SHELF' && p.meta?.index === shelf.index);
      const col = board ? columnOfShelf(shelfColumnList, board.id) : null;
      const light = lightBelow(shelf.y, col?.lights || []);
      const from = light ? light.from : G;
      const to = light ? light.to : shelf.y;
      column(`shelf-${shelf.index}`, from, to,
        `S${shelf.index} ${formatDimension(to - from)}${shelf.locked ? ' fixed' : ''}`,
        2, col?.flank || unitFlank);
    }
    for (const df of result.assemblies.drawerFronts || []) {
      column(`drawer-${df.index}`, df.y, df.y + df.h, `D${df.index} ${formatDimension(df.h)}`, 3);
    }
    const infillFace = result.panels.find((p) => p.part === 'INFILL' && p.meta?.side === 'top' && p.meta?.piece === 'face');
    if (infillFace) {
      column('top-infill', infillFace.box.y, infillFace.box.y + infillFace.box.h,
        `infill ${formatDimension(infillFace.box.h)}`, 2);
    }
    for (const ep of result.panels.filter((p) => p.part === 'END-PANEL')) {
      side.push({
        key: `ep-${ep.id}`,
        from: [ep.box.x + ep.box.w / 2, ep.box.y],
        to: [ep.box.x + ep.box.w / 2, ep.box.y + ep.box.h],
        offset: 0,
        label: `end panel ${formatDimension(ep.h)}`,
      });
    }
    return { floor, side };
  }, [showAllDims, W, H, D, G, isWallMounted, legHeight, result, shelfColumnList, unitFlank, sideOffset]);

  //
  // ─── TURN 26 (CLAUDE.md F2.1): THE LEAF'S OWN WIDTH, NOT THE FIRST ONE'S ──
  //
  // This asked `result.panels.find(p => p.part === 'FRONT')` — the FIRST front
  // in the cabinet — for every door in it. On a face with two matched leaves
  // that is the same number twice and nobody notices. On a cabinet with doors
  // in its BAYS the leaves are different widths by construction, so every
  // partition-hung leaf swung by its neighbour's angle, and turn 24's rig then
  // folded its hinge by that wrong angle too. That is one of the owner's three
  // symptoms — "they do not fold" — and it is a leaf being handed another
  // leaf's number.
  //
  // It takes the PANEL now. Same law, same profile, asked about the door it is
  // actually about.
  const swingFor = useCallback((panel) => {
    // Turn 26 (CLAUDE.md F5.2) / turn 27 (F2.1): a D/W front is not on cup
    // hinges and its opening is not a swing past a wall — it drops forward
    // about its bottom edge, to the angle THE PIECE carries. 45° is the
    // owner's number and it reaches here off `meta`, so the scene never asks
    // what kind of cabinet a front is on.
    if (panel?.meta?.opening === 'drop') {
      return ((Number(panel.meta.openAngleDeg) || 45) * Math.PI) / 180;
    }
    const hinge = panel?.meta?.hinge;
    const gap = hinge === 'R' ? wallGaps?.right : wallGaps?.left;
    return doorOpenAngle({
      doorWidth: panel?.w ?? result.panels.find((p) => p.part === 'FRONT')?.w ?? W,
      hingeOffset: profile.doors.gap / 2,
      gapToWall: gap ?? null,
    }, profile);
  }, [wallGaps, result.panels, W, profile]);

  // ─── TURN 24 (CLAUDE.md F1.2): EVERY LEAF'S SIGNED ANGLE ──────────────────
  //
  // The hinge splits in two this turn: member A rides the door and member B
  // stays on the carcass and FOLDS by the door's own opening angle. Member B is
  // drawn by `<Hardware>`, which is not a child of any door, so the angle has
  // to cross — and it crosses as the SAME expression `MovingPanel` integrates
  // (`dir × open × swing`), read off the same two inputs, so a fold that lagged
  // its leaf would be a bug in one place rather than a disagreement between two.
  const doorSwing = useMemo(() => {
    const out = {};
    for (const p of result.panels) {
      if (p.part !== 'FRONT' || !p.box) continue;
      // A DROP FRONT has no hinge to fold (F5.2/F5.3): it is screwed to the
      // appliance's own door, and there is no carcass half to turn after it.
      if (p.meta?.opening === 'drop') { out[p.id] = 0; continue; }
      const dir = p.meta?.hinge === 'R' ? 1 : -1;
      out[p.id] = dir * (openFronts?.[p.id] ?? 0) * swingFor(p);
    }
    return out;
  }, [result.panels, openFronts, swingFor]);

  // ─── The gaps between the shelves (turn 8, CLAUDE.md F4) ───
  // Which shelf the cursor is on, and the whole ladder of clear openings in the
  // column it belongs to. Measured between FACES — the clear space a thing has
  // to fit into — not between centre lines, because a joiner asking "will the
  // toaster go in there" is asking about the clear space.
  const [hoverShelf, setHoverShelf] = useState(null);
  // Turn 23 (CLAUDE.md F8.2): which VPART the pointer is on. A MOMENT, like the
  // shelf hover beside it — it lives exactly as long as the pointer is over the
  // piece and reaches nothing that is exported.
  const [hoverPartition, setHoverPartition] = useState(null);
  // ─── TURN 28 (CLAUDE.md F3) ───
  // The ladder is the HOVERED shelf's own bay: the gaps it shares with the
  // shelves beside it, on the flank of the compartment they are all in.
  const hoverColumn = useMemo(
    () => columnOfItem(shelfColumnList, hoverShelf),
    [shelfColumnList, hoverShelf],
  );
  const shelfGaps = useMemo(
    () => (hoverColumn?.lights || []).map((g, i) => ({ ...g, key: `gap-${i}` })),
    [hoverColumn],
  );
  // ─── Turn 21 (CLAUDE.md F11) ───
  // Where this cabinet draws the magnet's guide, in ITS OWN frame — the caught
  // height for the cabinet that was caught, the dragged height for the one
  // doing the catching, and nothing at all for every other cabinet on the wall.
  const magnetLine = useMemo(() => {
    const caught = shelfDrag?.magnet;
    if (!caught) return null;
    if (shelfDrag.unitId === unit.id) return shelfDrag.pos;
    if (caught.unitId === unit.id && Number.isFinite(caught.ownPos)) return caught.ownPos;
    return null;
  }, [shelfDrag, unit.id]);

  // The two openings the shelf being dragged stands between — the same list,
  // sliced to the board in the hand. Turn 28 (F3): its OWN bay's list.
  const dragColumn = useMemo(() => (shelfDrag && shelfDrag.unitId === unit.id
    ? columnOfItem(shelfColumnList, shelfDrag.itemId)
    : null), [shelfDrag, shelfColumnList, unit.id]);
  const dragLights = useMemo(() => {
    if (!dragColumn || !shelfDrag) return [];
    const pos = Number(shelfDrag.pos);
    return dragColumn.lights.filter(
      (g) => Math.abs(g.to - pos) < 1e-6 || g.from >= pos,
    ).slice(0, 2);
  }, [shelfDrag, dragColumn]);

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
   * ─── TURN 40 (CLAUDE.md F4c): TAKE ME TO THAT PIECE ───────────────────────
   *
   * The owner: *"jeśli to ta półka, powinno nas wziąć do tej półki, jakby
   * najechać kamerą na nią, lub na zawias który jest problemem."*
   *
   * A Check finding names a PANEL and, where the fault is at a height on that
   * panel, the height itself. Only this component knows where a piece actually
   * is — the unit's origin, its wall's angle and its own rotation are all here
   * — so the request is resolved here and handed to `onFocus`, which is the
   * very same smooth flight a double-click on a piece has used since turn 5
   * (`3d/Scene.jsx FocusRig`). One flight, one easing, one place.
   *
   * The piece is also SELECTED by the caller before the request is raised, so
   * it arrives centred AND ringed — `SelectionOutline` is what highlights it,
   * and asking for a second highlight here would be a second answer.
   */
  useEffect(() => {
    if (!focusPanel?.panelId || !onFocus) return;
    const piece = result.panels.find((p) => p.id === focusPanel.panelId && p.box);
    if (!piece) { onFocusPanelDone?.(); return; }
    // `atMm` centres on a HEIGHT up the piece rather than on its middle, which
    // is what makes "or on the hinge that is the problem" literally true.
    const at = Number(focusPanel.atMm);
    const centre = panelWorldCentre(Number.isFinite(at)
      ? { ...piece, box: { ...piece.box, y: at - piece.box.h / 2 } }
      : piece);
    onFocus(centre, Math.max(piece.box.w, piece.box.h, piece.box.d));
    onFocusPanelDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPanel, result.panels, panelWorldCentre]);

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

  // ─── TURN 42 (CLAUDE.md F1): AND THE ROD IS DRAGGED THE SAME WAY ─────────
  //
  // *"Dragging the ALONE rod writes the item's `pos_mm` (the same store path a
  // shelf drag uses), and the engine's next answer moves the rod."*
  //
  // It is `startShelfDrag` with one conversion in it. A shelf's `pos_mm` IS its
  // height above the interior floor; a rod's is its height above its own
  // SUPPORT — the board or the floor `railDatum.js` resolved — so the pointer's
  // world Y becomes an OFFSET by subtracting the support the engine published.
  // The clamp and the snap live in the store, exactly where a shelf's do.
  const startRailDrag = useCallback((e, itemId, currentAxisMm) => {
    if (!itemId || !onMoveRail) return;
    e.stopPropagation();
    onSelect();
    const hit = pointerToPlane(e.clientX, e.clientY);
    if (!hit) return;
    const support = Number(result.assemblies?.rail?.support) || 0;
    const grabDelta = currentAxisMm - (hit.y - originY) / MM;
    if (orbitRef?.current) orbitRef.current.enabled = false;

    const move = (ev) => {
      const p = pointerToPlane(ev.clientX, ev.clientY);
      if (!p) return;
      const axisMm = (p.y - originY) / MM + grabDelta;
      onMoveRail(itemId, axisMm - support);
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
  }, [onMoveRail, onSelect, pointerToPlane, originY, orbitRef, result]);

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

      {/* ─── TURN 47 (CLAUDE.md F6): THE GHOST LINE ───
          The cut-to-be, while the hand is still moving. `ghost` is null for
          every unit that is not being dragged into a slope, so this draws
          nothing at all in every project before tonight. */}
      {ghost && <SlopeGhost points={ghost} depth={D} />}

      {/* ─── Turn 18 (CLAUDE.md F4): HIDE FRONTS ───
          Doors and drawer fronts leave the PICTURE together, and nothing else
          about the project moves — `result` is the engine's own answer and it
          is not recomputed, the BOM and the CNC sheet read it unchanged, and
          the params never hear about this. It is a lens over the same cabinet,
          which is what makes it different in kind from "Remove doors". */}
      {result.panels.filter((p) => p.box && !(hideFronts && frontKind(p))).map((p) => {
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
        // ─── Turn 20 (CLAUDE.md F3): the box rides with its face ───────────
        // Not a front and not a gesture: a piece of the drawer's mechanism,
        // reading the SAME open amount the face it is screwed to reads.
        const ride = motion.forPanel(p);
        const slide = Boolean(ride && !front && ride.travel > 0);
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
            // T49 F9: is this piece cut from a VENEERED board? The finish alone
            // cannot say for a front — a front veneer borrows an EGGER scan and
            // is stored as a decor — so the slot's own source answers.
            veneered: design ? panelIsVeneered(p, unit, design) : false,
            ...(own ? { finish: own.finish } : {}),
          });
        return (
          <MovingPanel
            key={p.id}
            panel={p}
            front={front}
            // ─── Turn 12 (CLAUDE.md F6.1) / TURN 23 (F2.1) ───
            // The cup, its boss, the ARM and the downloaded BODY are screwed to
            // THIS door, so they hang off it and swing with it. Only the PLATE
            // stays on the carcass, drawn by <Hardware> below — which is what a
            // hinge does. Turn 19 hung the model on the carcass beside the cup
            // and it stayed shut while the door opened; the model comes through
            // here now, on the same specs the plate is resolved from.
            {...(!contour && p.role === 'watch_insert' && p.meta?.led ? {
              children: (
                <WatchInsertLight
                  rail={p}
                  pane={(result.assemblies.watchGlass || []).find((g) => Number(g.drawer) === Number(p.meta.drawer)
                    && (g.zone ?? null) === (p.meta.zone ?? null)) || null}
                  pivot={[
                    mm(p.box.x + p.box.w / 2),
                    mm(p.box.y + p.box.h / 2),
                    mm(p.box.z + p.box.d / 2),
                  ]}
                  profile={profile}
                />
              ),
            } : {})}
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
                  specs={hingeSpecs}
                  storageBase={storageBase}
                  onEditHinge={onEditHinge}
                  // Turn 24 (F1.4): with the rig OFF the model hides beyond
                  // ~15°, and this is the number it is asked about.
                  openDeg={Math.abs(((doorSwing[p.id] || 0) * 180) / Math.PI)}
                  // Turn 29 (CLAUDE.md F5): the leaf's SIGNED angle, which the
                  // arm folds back through. Same expression `MovingPanel`
                  // integrates, so the two halves cannot disagree.
                  swing={doorSwing[p.id] || 0}
                  surface="room"
                  // One mount per door, so the registry names which leaf each
                  // reported hinge belongs to.
                  scope={p.id}
                />
              ),
            } : {})}
            open={front ? (openFronts?.[p.id] ?? 0) : (ride?.open ?? 0)}
            slide={slide}
            travel={ride?.travel ?? null}
            // ─── Turn 20 (CLAUDE.md F8.1) ───
            // The unit's own drilling, so the board can lose the material it
            // loses. It reaches the SOLID and nothing else here: the machining
            // OVERLAY (`machining`) is still off in the room, because a room is
            // a picture of furniture and the lines are a workshop tool.
            drills={result.drills}
            surface={beingDragged && !contour ? { ...surface, colour: COLORS.goldSoft, texture: null } : surface}
            outline={outlineFor(profile, { contour })}
            outlines={outlines}
            contour={contour}
            xray={xray}
            depth={D}
            profile={profile}
            swing={front === 'door' ? swingFor(p) : null}
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
              // ─── TURN 54 (CLAUDE.md F4.1): A WATCH TRAY PIECE OPENS ITS OWN ──
              // MODAL. The rails, the dividers, the base — until tonight a
              // click on any of them fell through to "drag the cabinet", and
              // NO click in the whole app opened `watch-layout`. The pieces
              // carry the drawer index in their meta — used, never guessed
              // by y — and the modal opens BESIDE the click (house law).
              if (p.role === 'watch_insert' && p.meta?.drawer && onEditWatch) {
                e.stopPropagation();
                onEditWatch(p.meta.drawer, p.meta.zone ?? null, { x: e.clientX, y: e.clientY });
                return;
              }
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
                // ─── TURN 36 (CLAUDE.md F2): CTRL+CLICK BUILDS A SET ───────
                // The modifier travels with the click, exactly as it has for
                // CABINETS since turn 13 — and the NATIVE event is asked
                // first for the same reason: react-three-fiber builds its own
                // event object by spreading the DOM one, which copies own
                // enumerable properties and leaves every modifier behind.
                // With the modifier down this is a TICK, not a grab: the
                // piece joins or leaves the set and stays where it is.
                const native = e.nativeEvent || e;
                const additive = Boolean(native.ctrlKey || native.metaKey || e.ctrlKey || e.metaKey);
                if (additive) {
                  // …and it must NOT travel on to the boards behind this one.
                  // Without this the same press reaches the carcass, whose own
                  // handler reads the same modifier and ticks the CABINET out
                  // of its selection — which nulls the element selection with
                  // it, so every Ctrl+click replaced the set instead of
                  // growing it. Found by the walk, which is what it is for.
                  e.stopPropagation();
                  onSelectElement?.(p.id, { additive: true });
                  return;
                }
                onSelectElement?.(p.id);
                // ─── TURN 37 (CLAUDE.md F1): THE PRIORITY FLIPS ────────────
                //
                // The owner, on T36-F2: *"przesuwanie półek up-and-down jest
                // strasznie trudne — zazwyczaj catch jest na ustawianie
                // głębokości, co jest najmniej przydatne."* He is right, and
                // the cause is the rule written above this block: once a shelf
                // is the selected piece — which it becomes the moment you
                // touch it — the SAME grab pulls it in depth. So the second
                // grab on any shelf, which is the one a joiner makes when he
                // wants to nudge it, changed the setback instead of the height.
                //
                // The DEFAULT grab moves it UP AND DOWN, whether it is selected
                // or not. DEPTH is still one gesture away and nothing was
                // taken out: it is the same drag with ALT held. Alt because
                // Ctrl and ⌘ already mean "tick this into the set" and Shift is
                // the orbit's; and Alt reads as "the other axis" the way it
                // does in every drawing tool a joiner has used.
                const wantsDepth = Boolean(native.altKey || e.altKey);
                // A shelf carrying a hanging rail is a T37 assembly and is
                // dragged like any other, even though it is FIX (F2).
                const canDrag = isShelfLike && shelfId && (!p.meta?.locked || p.meta?.railItemId);
                if (canDrag && wantsDepth) {
                  startDepthDrag(e, shelfId, p.meta?.front_mm ?? 0, p.box.y);
                  return;
                }
                if (canDrag) { startShelfDrag(e, shelfId, p.box.y); return; }
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
              // ─── TURN 54 (CLAUDE.md F4.1): …AND A WATCH DRAWER'S OWN PIECES
              // OPEN THE WATCH LAYOUT. The front (after its slide above) and
              // the box of a drawer that carries the insert route to
              // `watch-layout` rather than the generic drawer editor — its
              // height is the law (120, derived), so the layout is what there
              // is to edit. The piece says which drawer; the ITEM says it is
              // a watch one.
              if (p.meta?.drawer && onEditWatch
                && (unit.params?.sections?.[0]?.items || []).some((i) => i?.kind === 'drawer'
                  && i.watch_insert === true
                  && Number(i.index) === Number(p.meta.drawer)
                  && ((i.zone ?? null) === (p.meta.zone ?? null)))) {
                onEditWatch(p.meta.drawer, p.meta.zone ?? null, { x: e.clientX, y: e.clientY });
                return;
              }
              // ─── TURN 20 (CLAUDE.md F11.1): A DRAWER BOX OPENS THE DRAWER ──
              // A side, the box front or back, the bottom — the parts that are
              // the DRAWER rather than its face. The FRONT keeps its slide:
              // opening a drawer by its face is older than the editor and is
              // the first thing anybody does to one.
              if (!front && p.role === 'drawer_box' && p.meta?.drawer && onEditDrawer) {
                onEditDrawer(p.meta.drawer, { x: e.clientX, y: e.clientY });
                return;
              }
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
              if (onContextMenu) {
                onContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  panelId: p.id,
                  part: p.part,
                  // Turn 20 (CLAUDE.md F11.1): WHICH drawer was right-clicked,
                  // so the menu can offer that drawer's window rather than
                  // guessing at one.
                  drawer: Number(p.meta?.drawer) > 0 ? Number(p.meta.drawer) : null,
                });
              }
            }}
            onPointerOver={shelfId
              ? () => {
                // A screwed or locked shelf does not move, so the cursor must
                // not promise that it does (turn 8, F4).
                // ─── TURN 37 (CLAUDE.md F1) ───
                // …and every shelf that DOES move now moves UP AND DOWN on the
                // plain grab, selected or not, so the cursor says so once and
                // stops changing under the hand. Depth is Alt+drag; the cursor
                // follows the modifier rather than the selection.
                // T37-F2: a rail's own fix shelf is dragged like any other.
                const held = Boolean(p.meta?.locked) && !p.meta?.railItemId;
                if (held) document.body.style.cursor = 'default';
                else document.body.style.cursor = 'ns-resize';
                setHoverShelf(shelfId);
              }
              // ─── TURN 23 (CLAUDE.md F8.2) ───
              // Hovering a vertical partition dimensions the CLEAR BAYS either
              // side of it, in the same thin blue the CNC detail draws in.
              // Appears on hover, gone on leave — a moment, like the shelf gaps
              // above it, and nothing here writes anything.
              : (p.part === 'VPART'
                ? () => { document.body.style.cursor = 'pointer'; setHoverPartition(p.id); }
                : (front ? () => { document.body.style.cursor = 'pointer'; } : undefined))}
            onPointerOut={(shelfId || front || p.part === 'VPART')
              ? () => {
                document.body.style.cursor = '';
                if (shelfId) setHoverShelf(null);
                // ─── TURN 24 (CLAUDE.md F10.1): THE ARROWS GROW A MAGNET ────
                //
                // The partition's hover is NOT dropped here any more. Turn 23
                // tied it to this event and the set vanished at a pixel's
                // twitch — a ray sliding off an 18 mm board is a twitch. The
                // set is held by `<HoverDimensions>`'s own magnet volume, which
                // is the piece's box grown by `hoverMagnetMm` and mounted only
                // while the set is showing; leaving THAT is what fades them.
              }
              : undefined}
          />
        );
      })}

      {/* ─── TURN 23 (CLAUDE.md F8.2): hover a PARTITION, read the bays ───
          The same style as the CNC detail's arrows, from the same profile block
          and the same pure geometry — thin blue, open heads, the value on the
          line. `contour` is a presentation mode and a measurement is not part
          of the picture it presents, which is the rule every helper in this
          file already follows. */}
      {hoverPartition && !contour && (
        <HoverDimensions
          result={result}
          panelId={hoverPartition}
          profile={profile}
          // Turn 24 (CLAUDE.md F10.1): leaving the MAGNET is what fades the
          // set, not leaving the 18 mm board.
          onLeave={() => setHoverPartition(null)}
        />
      )}

      {/* ─── Hover a shelf: the gaps in the whole column (turn 8, F4) ───
          "Are they even?" is the question a joiner asks about a set of
          shelves, and it cannot be answered one gap at a time. Hovering ANY
          shelf therefore measures EVERY gap in the column — floor to the first
          shelf, shelf to shelf, and the last one to the underside of the top —
          so a stack that is 3 mm out says so at a glance.
          It is a readout, not a drag: nothing here writes anything. */}
      {hoverShelf && hoverColumn && !contour && !shelfDrag && (
        <DimensionChain
          rows={shelfGaps.map((g) => ({
            key: g.key,
            // TURN 28 (CLAUDE.md F3): its own bay's flank, not the unit's.
            from: [hoverColumn.flank.x, g.from],
            to: [hoverColumn.flank.x, g.to],
            offset: hoverColumn.flank.dir * sideOffset,
            // The set is read as a set — "are they even?" — so an UNEVEN gap
            // says so in the gold the app uses for "this is the one".
            label: `${formatDimension(g.size)}${g.even ? '' : ' ≠'}`,
          }))}
          style={dimStyle}
          plane="xy"
          at={D}
          name={`shelf-gaps-${unit.id}`}
        />
      )}

      {/* ─── TURN 21 (CLAUDE.md F11): THE HEIGHT MAGNET'S GUIDE LINE ───
          Drawn by BOTH cabinets — the one with the shelf in the hand and the
          one it caught — each at its own stored height, which is the whole
          point: they line up on the wall because that is what the magnet
          means. Nothing is linked; the line exists for the length of the drag
          and no longer, and the chip carries the number they now share. */}
      {magnetLine != null && !contour && (
        <group userData={{ ccHelper: true, ccMagnet: magnetLine }}>
          <DashedGuide y={magnetLine} width={W} depth={D} />
          <DimLabel
            position={[mm(W / 2), mm(magnetLine) + 0.05, mm(D) + 0.1]}
            text={formatMm(fieldFromPos(magnetLine, G), { unit: true })}
            tone="gold"
          />
        </group>
      )}

      {/* live dimension while a shelf is being dragged (SPEC 4.8) */}
      {shelfDrag && shelfDrag.unitId === unit.id && (
        <group userData={{ ccHelper: true }}>
          {/* ─── Turn 21 (CLAUDE.md F10): THE SAME FUNCTION AS EVERY OTHER
              SHELF READOUT ───
              These read the CLEAR LIGHTS either side of the board being
              dragged, out of the shelf's OWN BAY's lights — the very list the ladder
              and the "all dims" chips are slices of. They used to read the
              distance to the NEIGHBOUR'S OWN STORED FACE, which beside another
              shelf is one board thickness bigger than the opening the label is
              drawn across: a third datum for one question. */}
          <DimensionChain
            rows={dragLights.map((g) => ({
              key: `drag-${g.from}`,
              // TURN 28 (CLAUDE.md F3): on the bay the board is being dragged
              // in, so the live readout does not jump the divider.
              from: [(dragColumn?.flank || unitFlank).x, g.from],
              to: [(dragColumn?.flank || unitFlank).x, g.to],
              offset: (dragColumn?.flank || unitFlank).dir * sideOffset,
              label: formatDimension(g.size),
            }))}
            style={dimStyle}
            plane="xy"
            at={D}
            colour={COLORS.gold}
            name={`shelf-drag-${unit.id}`}
          />
          {/* …and the piece's own height, on the interior datum the panel
              field speaks. */}
          <DimLabel
            position={[
              mm((dragColumn?.flank || unitFlank).x) + (dragColumn?.flank || unitFlank).dir * 0.17,
              mm(shelfDrag.pos),
              mm(D),
            ]}
            text={formatMm(fieldFromPos(shelfDrag.pos, G), { unit: true })}
            tone="gold"
          />
        </group>
      )}

      {/* ─── The joint (turn 8, CLAUDE.md F8) ───
          Solid: the division lines a tab leaves where a side meets a wieniec.
          X-ray: every tab profile, socket and dog bone. Both read off the CNC
          data, so a second joint system draws itself. Not in Contour, where
          the whole point is that everything but the silhouette goes away. */}
      {!contour && (
        <DrillRings result={result} profile={profile} design={unitDesign} />
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
      {/* ─── THE CORNICE (turn 22, CLAUDE.md F1) ───
          Bought moulding: it is not in `result.panels` because it is not a cut
          piece, so it is drawn from `assemblies.cornice` — the same element the
          BOM's linear metres are counted from, so the picture and the order can
          never be two opinions. It wears the FRONT surface because it stands in
          the door plane and is finished with the doors. */}
      {result.assemblies.cornice && (
        <Cornice
          element={result.assemblies.cornice}
          profile={profile}
          surface={contour
            ? contourSurface(profile)
            : surfaceFor({
              role: 'infill',
              materialRole: 'front',
              finishExposed: true,
              finishes,
              profile,
              frontColour,
              sheen,
              // T49 F9: bought moulding, finished with the doors — so it is
              // veneered when the doors are.
              veneered: frontsAreVeneered(design),
            })}
          outline={outlines ? outlineFor(profile, { contour }) : null}
        />
      )}

      {/* ─── TURN 31 (CLAUDE.md F9): THE EXTRACTOR'S SLOT ───────────────────
          The machine is HARDWARE — a BOM line and a registry slot for the GLB
          the owner will upload — and the APERTURE is the geometry. Nothing is
          drawn: an empty aperture is honest about what the app knows, which is
          the lesson turn 30 learnt the hard way about procedural stand-ins. */}
      {result.hardware?.some?.((h) => h.role === 'extractor') && (
        <Extractor
          unitId={unit.id}
          aperture={{
            w: result.hardware.find((h) => h.role === 'extractor').spec.aperture_width_mm,
            h: result.hardware.find((h) => h.role === 'extractor').spec.aperture_height_mm,
            d: result.hardware.find((h) => h.role === 'extractor').spec.aperture_depth_mm,
          }}
        />
      )}
      <Hardware
        instances={hardware}
        profile={profile}
        // Turn 36 (CLAUDE.md F8): the hanging rod is a double-click target now,
        // and it opens the SAME modal the shelves open — the grammar is the
        // one this component already hands its panels.
        onEditElement={onEditElement}
        // T42-F1: …unless it is ALONE, in which case it is its own subject and
        // opens its own window, and it is dragged.
        onEditRail={onEditRail}
        onDragRail={startRailDrag}
        xray={xray && !contour}
        hinges={showHinges && !contour}
        // ─── Turn 18 (CLAUDE.md F6.7) ───
        // The runners appear when the fronts are OFF or a door is OPEN, which
        // is precisely when a joiner is looking into the cabinet — and they go
        // back behind X-ray the moment it is shut again.
        runners={!contour && (hideFronts || anyFrontOpen)}
        runnerVariants={runnerVariants}
        // ─── Turn 20 (CLAUDE.md F3.1/F3.2) ───
        // The runner under an open drawer travels with it. One value per
        // drawer, the same one its box and its face read.
        drawerSlide={motion}
        storageBase={storageBase}
        surface="room"
        // ─── Turn 19 (CLAUDE.md F1.6/F1.3) ───
        // WHICH hinge each door wears — resolved once, by the engine, and
        // handed down; and the gesture that opens the hinge modal on it.
        hingeSpecs={hingeSpecs}
        // Turn 25 (CLAUDE.md F6.1): gold or silver, chosen once for the job.
        // Turn 28 (F5): and RESOLVED once — the sleeve, the pin and the drill
        // ring's collar all take `3d/hardwareFinish.js shelfSupportMetal` of
        // this one design.
        design={design}
        // ─── TURN 24 (CLAUDE.md F1.2): HOW FAR EACH LEAF HAS SWUNG ───────────
        // The hinge's carcass half folds by the DOOR's own angle, and the door
        // is not this component's child — so the angle is handed across rather
        // than a second swing being computed beside the first.
        doorSwing={doorSwing}
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

      {/* ─── TURN 33 (CLAUDE.md F1): THE PLACED LEDs ─────────────────────────
          Emissive geometry only, in the unit's own frame so the light rides a
          moved or rotated cabinet. Not in contour view — that lens is outlines
          only and a glowing strip is exactly what it exists to remove. */}
      {!contour && (
        <LedStrips unit={unit} result={result} design={design} />
      )}

      {/* ─── TURN 54 (CLAUDE.md F5): THE LED ICONS, WHILE LIGHTING IS OPEN ──
          The owner: "po otwarciu modalu Lighting ikony LED mają być widoczne
          … ludzie nie wiedzą, że takie funkcje istnieją." Two clickable
          sprites per unit — left LED, right LED — visible on EVERY unit
          while the existing Lighting panel is open, gone the moment it
          closes. Pure UI (ccHelper): nothing is added to the cabinets. */}
      {!contour && (
        <LedIcons unit={unit} W={W} H={H} D={D} />
      )}

      {/* ─── TURN 33 (CLAUDE.md F3): THE DISPLAY DRAWER'S GLASS ──────────────
          Lying on the box's own rim, drawn with the glass door's material —
          a picture of what the BOM orders (`Glass W × D`), never a cut. It
          does not ride an opened box tonight: the pane is drawn at rest, and
          the walk photographs it shut. */}
      {!contour && (result.assemblies.drawerGlass || []).map((pane) => (
        <mesh
          key={`glass-${pane.zone ?? 'w'}-${pane.drawer}`}
          position={[
            mm(pane.box.x + pane.box.w / 2),
            mm(pane.box.y + pane.box.h / 2),
            mm(pane.box.z + pane.box.d / 2),
          ]}
          userData={{ ccDrawerGlass: true, ccNoBounds: true }}
        >
          <boxGeometry args={[mm(pane.box.w), mm(pane.box.h), mm(pane.box.d)]} />
          <meshPhysicalMaterial
            color="#eef3f4"
            transparent
            opacity={0.42}
            roughness={0.06}
            metalness={0}
            transmission={0.85}
            thickness={0.004}
          />
        </mesh>
      ))}

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
      {/* T36 F2: the OTHER members of the set — the primary is drawn below,
          so a single selection is exactly the one outline it always was. */}
      {!contour && selectedElementBoxes
        .filter((b) => b !== selectedElementBox)
        .map((b, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <SelectionOutline key={`sel-${i}`} box={b} profile={profile} opacity={1} />
        ))}
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
          {/* ─── TURN 26 (CLAUDE.md R11 / F4.2): W AND H ARE DIMENSIONS ─────
              They were two floating captions in the project's dimension ink.
              They are CHAINS now, drawn by the one component, and they are
              placed the way the owner drew them: the width lies on the FLOOR
              in front of the cabinet with witness lines dropping from its
              front edges, and the height runs down its SIDE. Never across the
              face of a front.

              The SELECTED cabinet keeps the gold, which is not a colour
              choice: it is the answer to "which one am I holding".

              ─── TURN 29 (CLAUDE.md F2.2): AND A RUN SAYS IT ONCE ───────────
              Turn 28 wrote the run rule into `showAllDims` — the RIGHT-CLICK
              chain — and the owner's *"nadal pokazuje na każdej szafce"* is
              about THIS one, the one "Show dimensions" draws. It is the same
              rule, on the path the eye sees: the engine says which cabinet of
              a run carries the numbers (`engine/dimensions.js`) and the scene
              draws what it is told. The NAME chip below is not a dimension and
              keeps appearing on every cabinet. */}
          {carriesSizeChain && (
            <>
              <DimensionChain
                rows={[{
                  key: 'w', from: [0, D], to: [W, D], offset: sideOffset, label: formatDimension(W),
                }]}
                style={dimStyle}
                plane="xz"
                at={floorY}
                colour={selected ? COLORS.gold : dimensionColour}
                name={`w-${unit.id}`}
                onPick={onEditSize ? (row, e) => onEditSize({
                  field: 'width', at: { x: e.clientX, y: e.clientY }, row: row.key,
                }) : null}
              />
              {/* ─── TURN 29 (CLAUDE.md F2.1): THE 100 THE OWNER CANNOT SEE ──
                  *"nie ma 100, plinthu nie pokazuje."* The chain ran the whole
                  way from the floor to the top of the carcass and printed the
                  CARCASS's number over it — 770 drawn across 870 — so the toe
                  kick was inside the arrow and named nowhere.

                  Two segments on ONE vertical line, each with its own stop
                  arrows: the kick below, the carcass above, both on the same
                  offset, which is what "one line" means. It is turn 28's own
                  F8.1 law, moved to the chain the walk actually draws. */}
              <DimensionChain
                rows={heightChain}
                style={dimStyle}
                plane="xy"
                at={D}
                colour={selected ? COLORS.gold : dimensionColour}
                name={`h-${unit.id}`}
                onPick={onEditSize ? (row, e) => onEditSize({
                  field: 'height', at: { x: e.clientX, y: e.clientY }, row: row.key,
                }) : null}
              />
            </>
          )}
          {/* ─── Turn 17 (CLAUDE.md F6.3) ───
              The cabinet's NAME is not a dimension and does not dress like
              one: a flat plate in the app's own tones, square-cornered, in the
              label type the panels use. This is the use `DimLabel` keeps
              (R11): a CHIP, not a measurement. The depth stays on it because
              it is what a joiner reads next. */}
          <DimLabel
            position={[mm(W / 2), mm(H) + 0.1, mm(D / 2)]}
            text={`${unit.params.unit_num} · ${formatMm(D)} deep`}
            tone={selected ? 'gold' : 'dim'}
            variant="flat"
          />
        </group>
      )}

      {/* ─── Every number this cabinet has (turn 8, CLAUDE.md F7) ───
          The right-click toggle. It is per UNIT and not global for the reason
          it is worth having at all: this much text over a whole kitchen is a
          wall of numbers, and over ONE cabinet it is the answer to "what did I
          set this to". Tool chrome, so it never reaches a render. */}
      {showAllDims && !contour && (
        <group userData={{ ccHelper: true, ccAllDimensions: fullDimensions.floor.length + fullDimensions.side.length }}>
          <DimensionChain
            rows={fullDimensions.floor}
            style={dimStyle}
            plane="xz"
            at={floorY}
            colour={dimensionColour}
            name={`all-floor-${unit.id}`}
          />
          <DimensionChain
            rows={fullDimensions.side}
            style={dimStyle}
            plane="xy"
            at={D}
            colour={dimensionColour}
            name={`all-side-${unit.id}`}
          />
        </group>
      )}

      {/* ─── Turn 25 (CLAUDE.md F13): SHOW FRONT DIMENSIONS ─────────────────
          Every front's width and height, and the gaps — between doors, between
          drawer fronts, to the sides, to the top, to the floor. PROJECT-WIDE,
          which is why it is not the per-unit toggle above it.

          The SAME arrows as everything else this turn (F14.3): one style block,
          `engine/dimensionArrows.js`'s geometry, and rows that are horizontal
          or vertical and nothing else. The maths is `engine/frontDimensions.js`
          and is pure, so the gap between two doors is a number a test can hold
          rather than a picture somebody has to look at. */}
      {showFrontDimensions && !contour && !hideFronts && (
        <group userData={{ ccHelper: true, ccFrontDimensions: frontDimRows.length }}>
          <DimensionChain
            rows={frontDimRows}
            style={dimStyle}
            plane="xy"
            at={frontDimZ}
            name={`fronts-${unit.id}`}
          />
        </group>
      )}
    </group>
  );
}

/**
 * ─── THE GHOST LINE (turn 47, CLAUDE.md F6) ─────────────────────────────────
 *
 * *"During a drag into a slope zone, a ghost line shows the cut-to-be. It reads
 * `ceilingAt` — the same one, no second chain."*
 *
 * The line the cabinet WILL be cut on, drawn across its front while the hand is
 * still moving. It bends where the ceiling bends, because it is the ceiling's
 * own polyline (F1) and not a diagonal drawn between two ends.
 *
 * `LineDashedMaterial` needs the distances computed once — three.js will not do
 * it for you, and an undashed "dashed" line is the classic symptom. It is a
 * HELPER, like `DashedGuide` below: `ccHelper` keeps it out of the bounds the
 * camera frames and out of every render and screenshot that asks for the
 * furniture alone.
 */
function SlopeGhost({ points, depth }) {
  const line = useRef(null);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setFromPoints(points.map((p) => new THREE.Vector3(mm(p.x), mm(p.y), mm(depth) + 0.02)));
    return g;
  }, [points, depth]);
  useLayoutEffect(() => { line.current?.computeLineDistances(); }, [geometry]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <line ref={line} geometry={geometry} userData={{ ccHelper: true }} renderOrder={999}>
      <lineDashedMaterial
        color="#e0b64a" dashSize={mm(60)} gapSize={mm(40)}
        depthTest={false} transparent opacity={0.95}
      />
    </line>
  );
}

/**
 * A dashed line across the front of a cabinet at one height (turn 21, F11.1).
 *
 * `LineDashedMaterial` needs the distances computed once — three.js will not do
 * it for you, and an undashed "dashed" line is the classic symptom. It is a
 * HELPER: `ccHelper` keeps it out of the bounds the camera frames and out of
 * every render and screenshot that asks for the furniture alone.
 */
function DashedGuide({ y, width, depth, overhang = 120 }) {
  const line = useRef(null);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    // It runs a little past the cabinet on both sides, because what it is
    // saying is "and the one next door", and a line that stops at the carcass
    // says only "here".
    g.setFromPoints([
      new THREE.Vector3(mm(-overhang), mm(y), mm(depth) + 0.02),
      new THREE.Vector3(mm(width + overhang), mm(y), mm(depth) + 0.02),
    ]);
    return g;
  }, [y, width, depth, overhang]);
  useLayoutEffect(() => { line.current?.computeLineDistances(); }, [geometry]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <line ref={line} geometry={geometry}>
      <lineDashedMaterial color="#c8a24a" dashSize={mm(24)} gapSize={mm(16)} depthTest={false} transparent opacity={0.95} />
    </line>
  );
}
