import { wallElements as wallElementList } from '../lib/wallElements.js';
import { ceilingAt, ceilingPolyline } from '../lib/slopeLine.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCallback, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mm, COLORS } from './constants.js';
import DimLabel from './DimLabel.jsx';
import {
  roomWalls, roomBounds, openingsOnWall, wallsInScope, roomBoxes,
} from '../engine/room.js';
import { formatMm } from '../engine/format.js';
import { roomClickIsBackground } from '../lib/selection.js';

// The room is a LIST OF WALLS (engine/room.js) — four for a rectangle, six for
// an L. All four are drawn, and the ones the camera is behind hide themselves,
// so looking down at the room from above gives a clean plan view instead of a
// white box (CLAUDE.md turn 3, phase 3; supersedes the "fourth wall is never
// drawn" decision of SPEC 4.2).

const V = new THREE.Vector3();

/**
 * Is this wall facing the camera, or are we standing behind it?
 *
 * Shared by the editor's per-frame hook and by the render pass, which looks
 * through a camera of its own — one test, so a still can never disagree with
 * the view it was taken from about which walls are in the way.
 */
export function wallFacesCamera(face, cameraPosition) {
  if (!face) return true;
  V.set(cameraPosition.x - face.midX, 0, cameraPosition.z - face.midZ);
  return face.inwardX * V.x + face.inwardZ * V.z > 0;
}

/**
 * What the room is painted (turn 10, CLAUDE.md F3).
 *
 * Three tones, and they are profile numbers rather than constants, because
 * "our floor is oak and our walls are off-white" is workshop configuration in
 * exactly the way a carcass board is. `COLORS` stays as the fallback for a
 * caller with no profile to hand — a test, a preview mounted before the store
 * has loaded.
 */

/**
 * "Click the background" — but only when the background is what was clicked.
 *
 * ─── TURN 14 (CLAUDE.md F1.1) ───
 * The rule itself — and the three turns of pendulum behind it — is written out
 * in lib/selection.js `roomClickIsBackground`, because it is a SELECTION rule
 * and not a fact about three.js. All that happens here is that a room surface
 * hands it the event: how far away I am, and everything the ray met.
 */
function backgroundHit(event) {
  return roomClickIsBackground(event?.intersections, event?.distance);
}

function tone(profile, surface, fallback) {
  return profile?.appearance?.room?.[surface] || fallback;
}

/**
 * The bounced light a studio rig has no way to produce (turn 8, CLAUDE.md F1).
 *
 * The walls and the floor are the only surfaces in the scene that are not
 * furniture, and they are the only ones that need this: a wall is lit almost
 * entirely by light that has already been somewhere else. Carried as emission
 * on the room's own materials rather than as an ambient light, because an
 * ambient big enough to whiten a wall is an ambient big enough to flatten every
 * cabinet in front of it — which is exactly what turn 7 did and what Piotr
 * reported.
 *
 * ─── Turn 10 (CLAUDE.md F2/F3): PER SURFACE, AND WHY IT MATTERS ───
 * Emission is ADDED after the lighting. That makes it the one part of a
 * surface's brightness a shadow map cannot darken — so a floor carrying 42 %
 * of itself as emission is a floor on which a shadow can only ever be 58 % of
 * a shadow. That is a large part of "the shadow under the cabinets is barely
 * there", and it is fixed where it is caused: the WALL keeps 0.42 because a
 * wall really is lit by nothing else, and the FLOOR drops to 0.16 because the
 * floor's whole job this turn is to receive a shadow.
 */
function bounce(hex, profile, surface) {
  const R = profile?.appearance?.room;
  const amount = R?.bounce?.[surface] ?? profile?.appearance?.studio?.roomBounce ?? 0;
  return new THREE.Color(hex).multiplyScalar(Math.max(0, Math.min(1, amount)));
}

/**
 * One wall: a plane with a hole per window and per door.
 *
 * ─── TURN 46 F1: THE WALL CLOSES, AND THE STUB CLOSES WITH IT ───────────────
 *
 * `xOffset`/`spanWidth` are how a STUB says which fragment of its wall it is.
 * A stub is not a wall of its own — `engine/room.js truncateWall` cuts a real
 * wall back to `wall_stub_mm` and keeps its index — so it inherits that wall's
 * ceiling line OVER ITS OWN x RANGE, which is the whole of F1's geometry.
 * A full wall passes 0 and its own width and nothing changes for it.
 */
function Wall({
  wall, height, openings, centre, showLabel, profile, onBackground, slopes = [],
  xOffset = 0, spanWidth = null, capY = null,
}) {
  const ref = useRef(null);

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const w = mm(wall.width);
    // ─── TURN 46 F1: ONE ceilingAt, IMPORTED (CLAUDE.md, "The slope, in
    // numbers") ─────────────────────────────────────────────────────────────
    //
    // The CHAT-FIX of 24.08 taught this mesh to cut itself on the slope, and it
    // did it with a lerp of its OWN — a second chain beside
    // `wallElements.wallHeightAt`'s. *"Two independent lerps in two files is
    // the two-chain disease and fails the turn."* So the diagonal is gone from
    // here: `lib/slopeLine.js ceilingPolyline` hands back the ceiling over this
    // wall's own stretch, knee by knee, and the shape is TRACED rather than
    // derived. Same wall, same numbers, one source.
    const span = Number(spanWidth) > 0 ? Number(spanWidth) : wall.width;
    // ─── …AND THE CORNER CAP (F1: "the return stub at the slope's low end is
    // `startHeight` tall") ─────────────────────────────────────────────────
    //
    // A RETURN runs perpendicular to the wall the slope is on, so the ceiling
    // over it never changes: walking along the return does not move along the
    // sloped wall's x at all. Its height is therefore the ONE number the
    // ceiling has at the corner the two share — `startHeight` where the slope
    // reaches the wall's end, which is the owner's own sentence. The SAME
    // `ceilingAt`, asked at one x.
    const cap = Number.isFinite(Number(capY)) ? Number(capY) : height;
    const line = ceilingPolyline({
      slopes, wallWidth: span, wallHeight: height, from: xOffset, to: xOffset + wall.width,
    }).map((p) => ({ x: p.x, y: Math.min(p.y, cap) }));
    shape.moveTo(0, 0);
    shape.lineTo(w, 0);
    // Up the far edge to the ceiling there, then back along the ceiling to the
    // near edge. With no slope the line is two points at full height and this
    // traces exactly the rectangle it traced before turn 44.
    for (let i = line.length - 1; i >= 0; i -= 1) {
      const px = Math.min(Math.max(line[i].x - xOffset, 0), wall.width);
      shape.lineTo(mm(px), mm(Math.min(line[i].y, height)));
    }
    shape.closePath();
    for (const o of openings) {
      const hole = new THREE.Path();
      const x1 = mm(o.x_mm); const x2 = mm(o.x_mm + o.width);
      const y1 = mm(o.sill); const y2 = mm(o.sill + o.height);
      hole.moveTo(x1, y1);
      hole.lineTo(x2, y1);
      hole.lineTo(x2, y2);
      hole.lineTo(x1, y2);
      hole.closePath();
      shape.holes.push(hole);
    }
    return new THREE.ShapeGeometry(shape);
  }, [wall.width, height, openings, slopes, xOffset, spanWidth, capY]);

  // World position of the wall's start corner, with the room centred on origin.
  const position = [mm(wall.start.x - centre.x), 0, mm(wall.start.y - centre.y)];

  // Auto-hide: a wall the camera is BEHIND would only ever be seen from its
  // back face, so it is hidden. Done per frame against the live camera, not
  // once at mount — the whole point is that it follows the orbit.
  //
  // The test itself lives in `wallFacesCamera` and the numbers it needs are
  // parked in userData, because a RENDER looks through a camera of its own
  // (3d/renderCapture.js) and this hook would have hidden the walls for the
  // editor's camera instead. The first render framed on a unit standing at a
  // wall came back as a full-frame grey rectangle — the back of that wall.
  const face = useMemo(() => ({
    midX: mm((wall.start.x + wall.end.x) / 2 - centre.x),
    midZ: mm((wall.start.y + wall.end.y) / 2 - centre.y),
    inwardX: wall.inward.x,
    inwardZ: wall.inward.y,
  }), [wall.start.x, wall.start.y, wall.end.x, wall.end.y, wall.inward.x, wall.inward.y, centre.x, centre.y]);

  useFrame(({ camera }) => {
    if (!ref.current) return;
    ref.current.visible = wallFacesCamera(face, camera.position);
  });

  // ─── Turn 14 (CLAUDE.md F1.1): a wall you cannot SEE, you cannot CLICK ─────
  //
  // three's raycaster walks the graph and asks the geometry; it does not look
  // at `visible` (read in node_modules/three — Raycaster.intersectObject calls
  // object.raycast() the moment the LAYER test passes, and there is no other
  // gate). So the auto-hidden front wall — the one the camera is standing
  // outside of, which is every camera position this app ever has — was
  // answering every pointer event in the application from in front of the
  // furniture. That is the whole reason "click a cabinet through a wall" was
  // ever a hard case: the wall in the way is not a wall anybody can see.
  //
  // It is the mesh's own `raycast` and not a `layers` trick because a layer is
  // a rendering concern shared with the render pass, and this is one sentence
  // about picking: I am not drawn, so I am not here.
  const raycast = useCallback(function raycastWhenFacing(raycaster, intersects) {
    if (ref.current && ref.current.visible === false) return;
    THREE.Mesh.prototype.raycast.call(this, raycaster, intersects);
  }, []);

  const midLabel = [
    mm((wall.start.x + wall.end.x) / 2 - centre.x),
    mm(height) * 0.5,
    mm((wall.start.y + wall.end.y) / 2 - centre.y),
  ];

  return (
    <group>
      <group ref={ref} userData={{ ccWall: face }} position={position} rotation={[0, wall.angle, 0]}>
        {/* Lambert, not standard, since turn 6 — and this is a PERFORMANCE
            decision with a visual answer attached. A wall is matt white paint:
            at roughness 0.95 and metalness 0 the standard material was already
            computing a physically-based response to arrive at flat diffuse.
            What it was ALSO doing, once the environment map arrived, was
            sampling the room probe for every wall and floor pixel — and the
            walls and the floor are most of the frame. `scene.environment`
            reaches MeshStandardMaterial only, so this one change takes the
            biggest surface in the scene out of the image-based lighting path
            and leaves it looking exactly the same. */}
        {/* ─── Turn 11 (CLAUDE.md F1.1) ───
            Clicking a WALL drops the selection, exactly as clicking empty space
            does. It did not, and the reason is easy to miss: the canvas's
            `onPointerMissed` fires only when the ray hits NOTHING, and a wall is
            something. So the room's own surfaces say so themselves. */}
        <mesh
          geometry={geometry}
          receiveShadow
          raycast={raycast}
          onPointerDown={(e) => { if (backgroundHit(e)) onBackground?.(e); }}
        >
          <meshLambertMaterial
            color={tone(profile, 'wall', COLORS.wall)}
            emissive={bounce(tone(profile, 'wall', COLORS.wall), profile, 'wall')}
            side={THREE.DoubleSide}
            // ─── Turn 9 (CLAUDE.md F1.3) ───
            // The contact shadow is baked by rendering the scene through a
            // depth material (drei's <ContactShadows>). A wall is DoubleSide
            // and stands ON the floor, so it would render into that pass from
            // the inside and print itself along the edge of the blob. `three`
            // has the exact hook for it: this material refuses to be swapped
            // for a scene override. The room is what the shadow falls ON, never
            // what casts it.
            allowOverride={false}
          />
        </mesh>
        {/* the opening reveals, so a hole reads as a hole and not as a gap */}
        {openings.map((o) => (
          <lineSegments key={o.id} position={[0, 0, 0.001]}>
            <edgesGeometry args={[new THREE.PlaneGeometry(mm(o.width), mm(o.height))
              .translate(mm(o.x_mm + o.width / 2), mm(o.sill + o.height / 2), 0)]}
            />
            <lineBasicMaterial color={o.kind === 'door' ? COLORS.gold : '#9fb4c8'} allowOverride={false} />
          </lineSegments>
        ))}
      </group>
      {showLabel && (
        <DimLabel position={[midLabel[0], mm(height) + 0.12, midLabel[2]]} text={formatMm(wall.width, { unit: true })} />
      )}
    </group>
  );
}

export default function Room({
  room, showLabels = true, profile = null, onBackground = null, scope = 'room',
}) {
  // A left click on the room is a click on NOTHING: it clears the selection and
  // shuts any open menu (turn 11, CLAUDE.md F1.1). Middle and right buttons are
  // left alone — the right one opens a menu, and orbiting must not deselect.
  const background = useMemo(() => (onBackground
    ? (e) => { if (e.button === 0) onBackground(); }
    : undefined), [onBackground]);
  // ─── Turn 14 (CLAUDE.md F1.5b): "One wall" means ONE WALL ─────────────────
  // The scope has decided which walls exist since turn 7 and the scene has
  // never been told. A vanity job drawn against one wall was shown standing in
  // a four-walled room, which is not the job. The list is `wallsInScope`, in
  // the engine and tested there; the drawing is unchanged — a stub is a wall
  // record like any other, just a shorter one.
  const walls = useMemo(() => wallsInScope(room, scope), [room, scope]);
  // ─── TURN 46 F1: WHICH FRAGMENT OF ITS WALL A STUB IS ─────────────────────
  //
  // Asked of the geometry rather than stored on it: a stub keeps its wall's
  // `index` and its `along` direction (engine/room.js `truncateWall`), so how
  // far along that wall it starts is the projection of its own start corner
  // onto that direction. No engine record grows a field, and a wall that is not
  // a stub answers 0 by the same arithmetic.
  const fullWalls = useMemo(() => roomWalls(room), [room]);
  const fullWidthOf = useCallback(
    (index) => Number(fullWalls[index]?.width) || null,
    [fullWalls],
  );
  const stubOffset = useCallback((w) => {
    const full = fullWalls[w.index];
    if (!full || !w.stub) return 0;
    const dx = w.start.x - full.start.x;
    const dy = w.start.y - full.start.y;
    return Math.max(0, Math.round((dx * full.along.x + dy * full.along.y) * 1e4) / 1e4);
  }, [fullWalls]);
  const wallSlopeList = useProjectStore((s) => s.project.wallSlopes);
  const slopesOnWall = useCallback((idx) => wallElementList(wallSlopeList)
    .filter((e) => (e.kind ?? 'slope') === 'slope' && (e.wall ?? 0) === idx), [wallSlopeList]);
  const boxes = useMemo(() => roomBoxes(room), [room]);
  const bounds = useMemo(() => roomBounds(room), [room]);
  const height = room.height ?? 2500;
  // ─── TURN 46 F1: THE CEILING OVER A RETURN ────────────────────────────────
  //
  // *"The return stub at the slope's low end is `startHeight` tall, not
  // `room.height`."* A return meets the main wall at a corner, and the ceiling
  // at that corner is one number — so the return's whole outline is capped by
  // it. Read from the MAIN wall's own slopes through the same `ceilingAt`
  // every other consumer reads, at the x where the two walls meet.
  const stubCap = useCallback((w) => {
    if (!w?.stub || !walls.length) return null;
    const main = walls[0];
    if (!main || main.stub) return null;
    const near = (a, b) => Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
    let cornerX = null;
    if (near(w.end, main.start) || near(w.start, main.start)) cornerX = 0;
    else if (near(w.start, main.end) || near(w.end, main.end)) cornerX = main.width;
    if (cornerX == null) return null;
    return ceilingAt(cornerX, slopesOnWall(main.index), {
      wallWidth: main.width, wallHeight: height,
    });
  }, [walls, slopesOnWall, height]);

  const floor = useMemo(() => {
    const shape = new THREE.Shape();
    room.corners.forEach((c, i) => {
      const x = mm(c.x - bounds.centre.x);
      const y = mm(c.y - bounds.centre.y);
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    });
    shape.closePath();
    const geom = new THREE.ShapeGeometry(shape);
    // The shape is built in XY; lay it flat with x → X and y → Z.
    geom.rotateX(Math.PI / 2);
    return geom;
  }, [room.corners, bounds.centre.x, bounds.centre.y]);

  // ─── Half a millimetre down (turn 10, CLAUDE.md F2) ───
  // The contact shadow has to be baked by a camera standing at the world
  // origin, at floor level, looking up — that is drei's own requirement and the
  // reason is written out in full in 3d/Scene.jsx FloorShadow. Two things
  // follow, and they are the same thing: the room's surfaces must be BELOW that
  // camera, or the floor bakes into the shadow as one solid rectangle (three's
  // `allowOverride = false` means "use my own material", not "skip me"); and
  // the blob has to be a hair proud of the floor or the two z-fight.
  //
  // So the room steps down rather than the shadow stepping up. It is the whole
  // room and not just the floor, so the wall/floor junction stays sealed — a
  // floor dropped on its own leaves a slit you can see the background through
  // at close zoom. Half a millimetre is the app's own finest unit and is under
  // a quarter of a pixel at the closest the orbit will go.
  const drop = -mm(profile?.appearance?.room?.floorOffsetMm ?? 0.5);

  return (
    <group position={[0, drop, 0]}>
      {/* ─── The floor is a DIFFERENT SURFACE from the wall (turn 10, F3) ───
          A step warmer and a clear step darker, because "the wall and the floor
          melt into one white blur" was Piotr's complaint and three values inside
          5 % of each other was the arithmetic behind it. The numbers are in
          profile.appearance.room; the reasoning is written down there. */}
      <mesh
        geometry={floor}
        receiveShadow
        onPointerDown={(e) => { if (backgroundHit(e)) background?.(e); }}
      >
        {/* The floor is never auto-hidden, so it needs no picking gate: it is
            drawn from above and is behind everything standing on it. */}
        <meshLambertMaterial
          color={tone(profile, 'floor', COLORS.floor)}
          emissive={bounce(tone(profile, 'floor', COLORS.floor), profile, 'floor')}
          side={THREE.DoubleSide}
          // The floor is the surface the contact shadow is PAINTED ON. Left in
          // the depth pass it sits exactly at the shadow camera's near plane and
          // blacks out the whole blob (turn 9, CLAUDE.md F1.3).
          allowOverride={false}
        />
      </mesh>

      {/* ─── The plan's own obstacles (turn 14, CLAUDE.md F10.3) ───
          A chimney breast, a pillar, a boxed soil pipe: floor to ceiling, in
          the room's own tone so it reads as BUILDING rather than as furniture.
          The engine already stops a cabinet at one (engine/collision.js
          `boxSpansOnWall`); this is where it becomes visible.

          It takes no pointer handlers at all, which is deliberate: it is part
          of the room, so clicking it must mean what clicking a wall means —
          and with no handler the ray passes through to the floor behind, which
          says exactly that. */}
      {boxes.map((b) => (
        <mesh
          key={b.id}
          userData={{ ccRoomBox: b.id }}
          position={[
            mm(b.x + b.w / 2 - bounds.centre.x),
            mm(height / 2),
            mm(b.y + b.d / 2 - bounds.centre.y),
          ]}
          receiveShadow
          raycast={null}
        >
          <boxGeometry args={[mm(b.w), mm(height), mm(b.d)]} />
          <meshLambertMaterial
            color={tone(profile, 'wall', COLORS.wall)}
            emissive={bounce(tone(profile, 'wall', COLORS.wall), profile, 'wall')}
            allowOverride={false}
          />
        </mesh>
      ))}

      {walls.map((wall) => (
        <Wall
          key={wall.stub ? `stub-${wall.index}` : wall.index}
          wall={wall}
          height={height}
          // A STUB is a fragment of a wall, so an opening measured along the
          // whole wall would land in the wrong place on it — and a 1000 mm
          // return is not where anybody puts a window.
          openings={wall.stub ? [] : openingsOnWall(room, wall.index)}
          // ─── TURN 46 F1 (CLAUDE.md rule 4, the repair BY NAME) ───────────
          // The chat-fix of 23.08 handed every stub `slopes={[]}`, and THAT is
          // the gap in the owner's screenshot: the ceiling cut itself, the
          // return wall beside it did not, and the two stopped meeting. A stub
          // is a FRAGMENT OF ITS WALL and inherits its wall's line over its own
          // x range. One line changes; nothing else about it is licensed.
          slopes={slopesOnWall(wall.index)}
          xOffset={stubOffset(wall)}
          spanWidth={fullWidthOf(wall.index)}
          capY={stubCap(wall)}
          centre={bounds.centre}
          showLabel={showLabels && !wall.stub}
          profile={profile}
          onBackground={background}
        />
      ))}

      {showLabels && (
        <DimLabel
          position={[-mm(bounds.width) / 2 - 0.2, mm(height) / 2, -mm(bounds.depth) / 2]}
          text={formatMm(height, { unit: true })}
        />
      )}
    </group>
  );
}
