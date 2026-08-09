import {
  useCallback, useRef, useEffect, useMemo, useState,
} from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import Room from './Room.jsx';
import UnitView from './UnitView.jsx';
import DistanceArrows from './DistanceArrows.jsx';
import AddPlus from './AddPlus.jsx';
import { captureRender, furnitureBounds } from './renderCapture.js';
import { useViewHandle } from './viewHandle.js';
import { mm } from './constants.js';
import { roomWalls, roomBounds } from '../engine/room.js';
import {
  addPlusPoints, unitBase, unitVerticals, verticalsInBand,
} from '../engine/runs.js';
import { backStandoff, wallClearance } from '../engine/collision.js';
import { projectSheen, resolveFinishes, resolveUnitDesign } from '../engine/design.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { categoryOf } from '../engine/types.js';

// 3D scaffolding follows Production Core's rig (scene / camera / soft light /
// capture), not its window geometry. Preview is 3D from the start (SPEC 7).

// Hands the WebGL canvas to the PDF exporter without a second render pass.
/**
 * The room's own end-to-end handle (turn 13, F1/F10). Inside the Canvas,
 * because that is where `useThree` can see anything; a component of its own so
 * the registration unmounts with the view.
 */
function ViewHandle({ name }) {
  useViewHandle(name);
  return null;
}

function CaptureRig({ onReady, background }) {
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
      // JPEG has no alpha channel, so the sheet behind the canvas has to be
      // painted — and it is painted the SCENE's own background (turn 10, F3),
      // not a literal, or a workshop that retones its room gets a PDF with a
      // hairline of the old colour around every 3D view.
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(src, 0, 0, out.width, out.height);
      return { dataUrl: out.toDataURL('image/jpeg', quality), width: out.width, height: out.height };
    };
    onReady(capture);
    return () => onReady(null);
  }, [gl, scene, camera, onReady, background]);
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

/**
 * The room the furniture is lit BY (turn 6, CLAUDE.md F2 / BACKLOG #37).
 *
 * `RoomEnvironment` ships inside the three package — CLAUDE.md forbids a new
 * dependency AND forbids downloading a .hdr, and this is the answer to both: a
 * little box of emissive panels, rendered once through PMREM into a blurred
 * cube map. What it buys is the thing flat lights cannot fake — a highlight
 * that MOVES across a sprayed door as the camera orbits, and a soft gradient
 * down a white side panel instead of one even tone.
 *
 * Built once per renderer and thrown away with it. Its intensity is a profile
 * number and is turned up for a render.
 *
 * ─── Exported since the editor windows need it too ───
 * The exploded cabinet editor and the part-detail window ran WITHOUT a
 * probe — five lamps, an ambient and a hemisphere, and `envMapIntensity`
 * multiplying nothing. That term is a large part of the light on a panel in
 * this view (1.0 on board, 0.25 on lacquer), so its absence read as "serio nic
 * nie widać", and it read WORST exactly where the editor exists to be looked
 * at: the inside faces, which no directional lamp reaches and which a probe
 * lights by definition. It is exported rather than copied so both windows are
 * lit by the SAME box — one rig, the standing rule.
 */
export function Environment({ intensity, on }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    // 64, not the default 256. This is a blurred light probe of a white box —
    // there is no detail in it to lose, and a smaller cube map is a smaller
    // mip chain to walk for every lit pixel of every panel.
    const target = pmrem.fromScene(room, 0.04, 0.1, 100, { size: 64 });
    // Kept on the scene even when the working view has the lighting switched
    // off, so a RENDER can put it back: a still is always lit properly, whatever
    // the editor is set to (3d/renderCapture.js).
    scene.userData.ccEnvironment = target.texture;
    return () => {
      scene.environment = null;
      scene.userData.ccEnvironment = null;
      target.dispose();
      pmrem.dispose();
      room.traverse((o) => {
        o.geometry?.dispose?.();
        const m = o.material;
        for (const one of Array.isArray(m) ? m : [m]) one?.dispose?.();
      });
    };
  }, [gl, scene]);

  useEffect(() => {
    scene.environment = on ? (scene.userData.ccEnvironment || null) : null;
    scene.environmentIntensity = intensity;
  }, [scene, intensity, on]);
  return null;
}

/**
 * ─── The studio rig (turn 8, CLAUDE.md F1 — carried over from Spraying-Calc) ──
 *
 * Piotr's verdict on turn 7's lighting was three words long: no shadow, no
 * depth, white runs into white. He was right, and the cause was arithmetic
 * rather than taste — turn 7 ran an AMBIENT at 1.25 with a KEY at 0.85, and a
 * key light weaker than the flat light it is meant to beat cannot model
 * anything. Everything was lit; nothing was shaped.
 *
 * So the balance is inverted to the one a photographer uses — key 1.0, fill
 * 0.5, rim 0.3, ambient 0.2 — and, crucially, IT IS THE SAME RIG IN BOTH
 * PLACES. Turn 7 lit the editor one way and the still another, so a joiner
 * could not tell from the screen what the customer would be sent. What you see
 * while you work is the picture.
 *
 * The other half of "no shadow" is the shadow CAMERA. It used to be fitted to
 * the room and a bit over: on a 4 m kitchen that is an 8 m frustum, and a 1024
 * map across 8 m is 8 mm per texel — wider than the gap between two cabinets,
 * so the shadow between them simply is not resolved. It is fitted to the
 * FURNITURE now, with `studio.shadowPadding` of margin, so every texel lands on
 * something that casts a shadow.
 *
 * ─── Turn 10 (CLAUDE.md F1): THE JUPITERS ───
 *
 * Piotr asked for the light in the language of the trade — two studio spots in
 * the upper front corners, aimed about 45° down across the furniture. Turn 9's
 * four point lights were the wrong instrument: a point light has no direction,
 * so it lit the ceiling and the back wall as eagerly as the doors and left no
 * POOL anywhere for the eye to read depth off.
 *
 * The spots come out of `profile.appearance.studio.spots`, which is an ARRAY
 * because the count is half the setting — "maybe a second one lower" is four
 * lines in profile.js and nothing at all in this file. Their positions are
 * fractions of the rig distance, exactly as the key, fill, rim and points are,
 * so the whole rig scales with the job instead of being tuned for one kitchen.
 */
function Lights({ roomHeight, roomWidth, shadow, studio, subject }) {
  const key = useRef(null);
  // The box the shadow map has to cover, in scene units. Falls back to the room
  // when there is no furniture yet — an empty room casts nothing, but the
  // camera still has to be valid.
  const fit = useMemo(() => {
    const pad = mm(studio.shadowPadding);
    if (!subject) {
      const reach = Math.max(roomWidth, roomHeight) * 0.75 + pad;
      return { centre: [0, roomHeight * 0.4, 0], radius: reach };
    }
    const centre = [0, 1, 2].map((i) => (subject.min[i] + subject.max[i]) / 2);
    const half = [0, 1, 2].map((i) => (subject.max[i] - subject.min[i]) / 2 + pad);
    // A directional light's frustum is square in its own frame; the safe square
    // is the half-diagonal, so the box fits from whatever angle the light is at.
    return { centre, radius: Math.hypot(half[0], half[1], half[2]) };
  }, [subject, roomWidth, roomHeight, studio.shadowPadding]);

  // The light's TARGET has to be in the scene graph for three to use it, and it
  // has to be where the furniture is or the frustum is centred on the room's
  // origin and the cabinets stand at its edge.
  const target = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    target.position.set(...fit.centre);
    target.updateMatrixWorld();
    if (key.current) {
      key.current.target = target;
      key.current.shadow.camera.updateProjectionMatrix();
    }
  }, [target, fit]);

  const reach = fit.radius;
  const distance = Math.max(reach * 2.2, roomHeight * 1.6);

  // ─── The shadow budget (turn 10, CLAUDE.md F1.4) ───
  // Two casters in the whole rig, counted here rather than trusted to the
  // profile: a workshop editing `spots` by hand must not be able to hand the
  // working view five depth passes by ticking five boxes. The key is counted
  // first because it is the one the rest of the app is fitted around
  // (`ShadowFit`, the frustum below), and a spot that loses its budget keeps
  // LIGHTING — it just stops writing a map.
  const keyCasts = studio.keyCastsShadow !== false;
  const budget = studio.shadowCasters ?? 2;
  const spots = useMemo(() => {
    let left = Math.max(0, budget - (keyCasts ? 1 : 0));
    return (studio.spots || []).map((s) => {
      const casts = Boolean(s.castShadow) && left > 0;
      if (casts) left -= 1;
      return { ...s, casts };
    });
  }, [studio.spots, keyCasts, budget]);

  return (
    <>
      {/* Tagged by ROLE, so a render can still rebalance them
          (renderCapture.js) without the capture pass guessing which is which.
          By default it does not: profile.render.lightScale is all 1s now. */}
      <ambientLight userData={{ ccLight: 'ambient' }} intensity={studio.ambient} />
      {/* ─── Turn 9 (CLAUDE.md F1) ───
          The flat light, given a direction. An ambient is one number from every
          side, which is the one thing light in a room never is: what comes from
          above is warm, what comes from below has bounced off the floor and
          carries its colour. It costs exactly what an ambient costs — no shadow
          map, no second pass — and it is what lets the fill come up far enough
          to keep a shadowed door a COLOUR without the scene turning to fog.
          It casts nothing: the key below is still the only shadow in the app. */}
      <hemisphereLight
        userData={{ ccLight: 'ambient' }}
        color={studio.hemisphere.sky}
        groundColor={studio.hemisphere.ground}
        intensity={studio.hemisphere.intensity}
      />
      <primitive object={target} />
      <directionalLight
        ref={key}
        userData={{ ccLight: 'key' }}
        position={[fit.centre[0] + distance * 0.55, fit.centre[1] + distance * 0.85, fit.centre[2] + distance * 0.7]}
        intensity={studio.key}
        // Turn 10 (CLAUDE.md F1.4) makes this a profile decision rather than a
        // fact of the file, because the alternative — handing the shadow to a
        // jupiter and letting the key light only — had to be tried by LOOKING.
        // It was, and the key won: see profile.appearance.studio.keyCastsShadow.
        castShadow={keyCasts}
        shadow-mapSize={[shadow.mapSize, shadow.mapSize]}
        shadow-bias={shadow.bias}
        // ─── Turn 9 (CLAUDE.md F1): the stripes ───
        // The line that was missing. `bias` pushes the depth comparison along
        // the LIGHT, which fixes acne and detaches the shadow from the foot of
        // whatever cast it; `normalBias` pushes it along the SURFACE NORMAL,
        // which is what a flat panel needs and what stops it shadowing itself
        // in diagonal bands. It is the modern answer to exactly the artefact
        // Piotr photographed, and turn 8 had none of it.
        shadow-normalBias={shadow.normalBias}
        shadow-radius={shadow.radius}
        shadow-camera-left={-reach}
        shadow-camera-right={reach}
        shadow-camera-top={reach}
        shadow-camera-bottom={-reach}
        shadow-camera-near={0.05}
        shadow-camera-far={distance * 3}
      />
      {/* Fill from the other side, so the shadowed face is modelled rather
          than black. No shadow of its own — two shadow maps for one visible
          gain is exactly the kind of cost CLAUDE.md rules out of the working
          view. */}
      <directionalLight
        userData={{ ccLight: 'fill' }}
        position={[fit.centre[0] - distance * 0.8, fit.centre[1] + distance * 0.5, fit.centre[2] + distance * 0.55]}
        intensity={studio.fill}
      />
      {/* Rim, from behind and above: the light that draws a bright edge down
          the side of a white cabinet standing against a white wall. It is what
          separates one from the next when nothing else does. */}
      <directionalLight
        userData={{ ccLight: 'rim' }}
        position={[fit.centre[0] - distance * 0.3, fit.centre[1] + distance * 0.6, fit.centre[2] - distance * 0.9]}
        intensity={studio.rim}
      />
      {/* ─── The jupiters (turn 10, CLAUDE.md F1) ───
          Hung in the upper front corners and aimed DOWN-ACROSS at the same fit
          centre everything else in this rig is aimed at, so the angle below the
          horizon is atan(y / hypot(x, z)) — 44° at the shipped numbers.

          `distance` is the falloff cutoff AND, for a caster, the shadow
          camera's far plane: three takes `light.distance` for it in
          SpotLightShadow.updateMatrices (read before it was relied on —
          CLAUDE.md rule 13). `decay={2}` is three's own default in r0.180 and
          is written out anyway, because it is the reason the intensities in
          profile are in the twenties rather than around 1. */}
      {spots.map((s, i) => (
        <spotLight
          key={`ccSpot${i}`}
          userData={{ ccLight: 'spot' }}
          position={[
            fit.centre[0] + distance * s.x,
            fit.centre[1] + distance * s.y,
            fit.centre[2] + distance * s.z,
          ]}
          target={target}
          intensity={s.intensity}
          color={s.colour}
          angle={s.angle}
          penumbra={s.penumbra}
          distance={distance * (studio.spotReach ?? 4)}
          decay={2}
          castShadow={s.casts}
          shadow-mapSize={[shadow.mapSize, shadow.mapSize]}
          shadow-bias={shadow.bias}
          shadow-normalBias={shadow.normalBias}
          shadow-radius={shadow.radius}
          shadow-camera-near={Math.max(0.05, distance * 0.1)}
        />
      ))}
      {/* The glints (hotfix 08.08; EMPTIED turn 10, CLAUDE.md F1.5). Point
          sources whose highlights move across a door as the camera orbits —
          which the F4 orbit test showed the spots already do on their own, so
          the shipped array has nothing in it. The loop stays, because the
          decision is data: profile.appearance.studio.points says why, and one
          line there brings them back. None casts a shadow. */}
      {/* ─── Turn 14 (CLAUDE.md F9): the pair at EYE LEVEL ───
          `yMm` is an ABSOLUTE height above the floor, and it is the whole
          phase: a specular highlight is the mirror of its source, so a rig
          whose every strong light is at three metres can only put a highlight
          on a vertical door for somebody looking UP at it. Eyes do not scale
          with the kitchen — 1650 is 1650 in a vanity and in a six-metre run —
          so this one number is not a fraction of the rig distance while x and z
          still are, and the pair opens out with the job without rising with it.

          `p.y` is still honoured where `yMm` is absent, so the example pair in
          profile.js and any rig a workshop has already written keep working. */}
      {(studio.points || []).map((p, i) => (
        <pointLight
          key={`ccPoint${i}`}
          userData={{ ccLight: 'point' }}
          position={[
            fit.centre[0] + distance * p.x,
            Number.isFinite(Number(p.yMm)) ? mm(Number(p.yMm)) : fit.centre[1] + distance * (p.y || 0),
            fit.centre[2] + distance * p.z,
          ]}
          intensity={p.intensity}
          color={p.colour}
          distance={distance * (studio.pointReach ?? 3)}
          decay={2}
        />
      ))}
    </>
  );
}

/**
 * ─── The pluses at the ends of the runs (turn 9, CLAUDE.md F2) ───
 *
 * Where they GO is `engine/runs.js addPlusPoints`, which is pure arithmetic and
 * is tested as such. All that happens here is the last step every other
 * annotation in this scene takes: a position along a wall, in millimetres,
 * turned into a point in the room.
 *
 * The anchor is the mid-height of the END FACE of the run, standing one disc
 * clear of it in the gap — so a plus is always in the space it would fill, and
 * never on top of the cabinet it is offered beside.
 */
function AddPluses({
  units, walls, roomCentre, profile, onPick,
}) {
  const points = useMemo(() => addPlusPoints(units, { walls }, profile), [units, walls, profile]);
  const byId = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const size = mm(profile.ui.addPlusMinGapMm) * 0.9;

  return points.map((point) => {
    const unit = byId.get(point.unitId);
    const wall = walls[point.wall] || walls[0];
    if (!unit || !wall) return null;
    const base = unitBase(unit, profile);
    const height = Number(unit.params?.height) || 0;
    // Along the wall from its start corner, out into the gap by half a disc,
    // and forward of the cabinet's face so nothing can hide it.
    const along = point.x_mm + (point.side === 'left' ? -1 : 1) * (profile.ui.addPlusMinGapMm * 0.45);
    const depth = Number(unit.params?.depth) || 0;
    const world = new THREE.Vector3(
      mm(wall.start.x - roomCentre.x), 0, mm(wall.start.y - roomCentre.y),
    )
      .addScaledVector(new THREE.Vector3(wall.along.x, 0, wall.along.y), mm(along))
      .addScaledVector(new THREE.Vector3(wall.inward.x, 0, wall.inward.y), mm(depth / 2))
      .setY(mm(base + height / 2));

    return (
      <AddPlus
        key={`${point.unitId}-${point.side}`}
        position={world.toArray()}
        size={size}
        colour={profile.appearance.addPlus.run}
        title={`Add a unit to the ${point.side} of ${unit.params?.unit_num ?? ''}`}
        onClick={() => onPick(point)}
      />
    );
  });
}

/**
 * ─── The dark under the run (turn 9, CLAUDE.md F1.3; REBUILT turn 10, F2) ───
 *
 * The key light comes in from off to one side, so its shadow lands BESIDE the
 * furniture and the floor between the legs stays as bright as the open room.
 * The eye reads that as hovering, and no amount of shadow-map tuning fixes it —
 * it is the wrong shadow, not a bad one.
 *
 * Turn 6 answered it with a hand-painted quad per unit. This is the same idea
 * done for the RUN: one soft blob covering the same furniture bounds the key
 * light's frustum is fitted to (`ShadowFit`), so six cabinets standing side by
 * side sit in one shadow instead of six with a bright seam at every joint.
 *
 * The cost is paid on LAYOUT, never per frame: `frames={1}` bakes one depth
 * pass per mount and the `key` below re-mounts it only when the furniture has
 * actually moved. Orbiting the scene, which is what a joiner does all day,
 * costs nothing at all.
 *
 * ═══ TURN 10: WHY THIS IS CENTRED ON THE ROOM AND NOT ON THE FURNITURE ═══
 *
 * Turn 9 gave the blob `position={[cx, 1 mm, cz]}` — over the furniture, a hair
 * above the floor — which is the obvious thing to write and is why the shadow
 * has been INVISIBLE on every machine since. It has nothing to do with GPUs.
 *
 * Read drei's ContactShadows (CLAUDE.md rule 13, and this is the second time
 * this turn that reading it was the whole job). It bakes the scene through a
 * depth override into a render target, then blurs that target in two passes by
 * rendering a full-size quad — `blurPlane` — through the SAME orthographic
 * camera. `blurPlane` is created with `new THREE.Mesh(planeGeometry)` and is
 * never added to the group, so its world matrix is the IDENTITY: it sits at the
 * world origin, flat, whatever the group is doing. The camera, being a child of
 * the group, goes wherever the group goes. Move the group and the two stop
 * agreeing:
 *
 *   • x/z offset — the blur pass reads and writes a region displaced by exactly
 *     (cx, cz) from the bake it is meant to be smoothing;
 *   • y offset — worse. The camera is rotated to look UP (`rotation-x` π/2) and
 *     drei's `near` defaults to 0, so lifting the group by a millimetre puts
 *     the quad ONE MILLIMETRE BEHIND the near plane. It is clipped, nothing is
 *     drawn, and the blur pass overwrites the perfectly good bake with an empty
 *     target. Measured, not deduced: probing the target between the two calls
 *     gives max alpha 255 before the blur and 0 after it (BUILD-LOG, F2.2).
 *
 * So the blob is anchored where drei needs it — the world origin, at floor
 * level — and it is the ROOM that steps aside: `appearance.room.floorOffsetMm`
 * drops the room's own surfaces half a millimetre so the shadow camera cannot
 * see the floor (which would otherwise bake as one solid rectangle: three's
 * `allowOverride = false` means "render with your OWN material", not "skip me")
 * and so the blob is a hair proud of it instead of z-fighting with it.
 *
 * The price of a fixed anchor is that the canvas must now reach from the room's
 * centre out to the furniture wherever it stands, so it is bigger than the run.
 * Both of the things that made turn 9's 18 m canvas useless are therefore
 * carried explicitly rather than hoped for:
 *
 *   • `resolution` is chosen to hold a target TEXEL SIZE in millimetres, so a
 *     leg is the same number of texels in a 2 m vanity and a 6 m kitchen;
 *   • `blur` is derived from `blurMm`, a real world smear, because drei's blur
 *     is in UV units — the same number is twice the softness on half the
 *     canvas, which is precisely how turn 9's shadow dissolved.
 */
function FloorShadow({ subject, profile }) {
  const C = profile.appearance.contactShadow;
  const pad = mm(profile.appearance.studio.shadowPadding);
  const step = profile.editor.mmStep;

  const fit = useMemo(() => {
    if (!subject) return null;
    // Centred on the world origin (see above), so the half-span is how far the
    // furthest corner of the furniture reaches from it, plus the margin.
    const halfW = Math.max(Math.abs(subject.min[0]), Math.abs(subject.max[0])) + pad;
    const halfD = Math.max(Math.abs(subject.min[2]), Math.abs(subject.max[2])) + pad;
    const width = halfW * 2;
    const depth = halfD * 2;
    const span = Math.max(width, depth);
    // A power of two, because a render target that is not one is a slow path on
    // more drivers than it is worth arguing with — the smallest that holds the
    // asked-for texel size, and never more than the cap.
    const wanted = span / mm(C.texelMm || 4);
    const resolution = Math.min(
      C.maxResolution || 1024,
      Math.max(512, 2 ** Math.ceil(Math.log2(Math.max(1, wanted)))),
    );
    return {
      width,
      depth,
      // drei blurs in UV: `h = blur / 256` of the canvas. Millimetres of smear
      // divided by the canvas they are being smeared across is what keeps a
      // 22 mm penumbra 22 mm wide on every job.
      blur: Math.max(0.2, (mm(C.blurMm) / span) * 256),
      resolution,
    };
  }, [subject, pad, C.blurMm, C.texelMm, C.maxResolution]);
  if (!fit) return null;

  // On the workshop's own grid, and nothing finer: the fit is measured off world
  // matrices, and a raw float would re-bake the shadow on floating-point noise.
  const bake = [fit.width, fit.depth, fit.resolution]
    .map((v) => Math.round(v / mm(step))).join('|');

  return (
    // In the picture, but it must never FRAME it: the blob reaches half a metre
    // past the furniture, and a render fitted to it would put the cabinets in
    // the middle distance of their own photograph.
    <group userData={{ ccNoBounds: true }}>
      <ContactShadows
        key={bake}
        // drei multiplies width/height by its `scale`, DEFAULT 10 — turn 9
        // missed it, so a 1.8 m run baked onto an 18 m canvas: the legs were
        // two texels and the blur dissolved them. Silent on every GPU.
        scale={1}
        frames={1}
        // NO `position`. Read the essay above before adding one: the blur pass
        // renders a quad that stays at the world origin, so a group that moves
        // is a group whose blur pass misses — and a group that RISES is one
        // whose blur pass is clipped by the near plane and returns an empty
        // target. The room drops out of the way instead (Room.jsx).
        width={fit.width}
        height={fit.depth}
        resolution={fit.resolution}
        // How high the shadow camera still sees. Past this nothing contributes,
        // so a wall unit hanging at 1500 mm prints no second blob on the floor.
        far={mm(C.farMm)}
        blur={fit.blur}
        opacity={C.opacity}
      />
    </group>
  );
}

/**
 * Put the orbit back in the middle of the room — once, and again only when the
 * room itself changes (turn 11).
 *
 * A `target` PROP would be re-applied on every render, which is the same thing
 * as saying the camera may never be pointed anywhere else. This is the same
 * default, expressed as an event rather than as a fact.
 */
function HomeTarget({ orbitRef, height }) {
  useEffect(() => {
    const controls = orbitRef.current;
    if (!controls) return;
    controls.target.set(0, height * 0.45, 0);
    controls.update();
  }, [orbitRef, height]);
  return null;
}

/** ACES, at the rig's exposure — in the working view as well as in a still. */
function ToneMapping({ exposure }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = exposure;
  }, [gl, exposure]);
  return null;
}

/**
 * Hands the render pass everything it needs — the renderer, the scene, the live
 * camera, and where the furniture actually is — without the modal knowing
 * anything about three.js.
 */
/**
 * Where the furniture is, for the key light's shadow camera (turn 8, F1).
 *
 * Measured after the frame the units were drawn in — the groups' world matrices
 * do not exist before that — and only when the units change, so an orbit does
 * not walk 400 meshes per frame.
 */
function ShadowFit({ signal, unitsRef, onFit }) {
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      onFit(furnitureBounds(Object.values(unitsRef.current).filter(Boolean)));
    });
    return () => cancelAnimationFrame(id);
  }, [signal, unitsRef, onFit]);
  return null;
}

function RenderRig({ onReady, unitsRef }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    if (!onReady) return undefined;
    onReady({
      aspect: () => {
        const el = gl.domElement;
        const w = el.clientWidth || el.width || 16;
        const h = el.clientHeight || el.height || 9;
        return w / h;
      },
      bounds: (unitId = null) => {
        const groups = Object.entries(unitsRef.current)
          .filter(([id]) => !unitId || id === unitId)
          .map(([, group]) => group)
          .filter(Boolean);
        return furnitureBounds(groups);
      },
      capture: (job) => captureRender({ gl, scene, camera }, job),
    });
    return () => onReady(null);
  }, [gl, scene, camera, onReady, unitsRef]);
  return null;
}

export default function Scene({ onCaptureReady, onRenderReady }) {
  const orbitRef = useRef(null);
  // One entry per unit group, so the render can frame the furniture and only
  // the furniture (and one selected unit, when one is selected).
  const unitGroups = useRef({});
  const room = useProjectStore((s) => s.project.room);
  const design = useProjectStore((s) => s.project.design);
  const units = useProjectStore((s) => s.units);
  const moveUnit = useProjectStore((s) => s.moveUnit);
  const moveUnitToWall = useProjectStore((s) => s.moveUnitToWall);
  const allResults = useProjectStore((s) => s.allResults);
  const wallGapsFor = useProjectStore((s) => s.wallGapsFor);
  const moveShelf = useProjectStore((s) => s.moveShelf);
  const setElementDepth = useProjectStore((s) => s.setElementDepth);
  const setTopInfill = useProjectStore((s) => s.setTopInfill);
  const fillToCeiling = useProjectStore((s) => s.fillToCeiling);
  const setEndPanelTop = useProjectStore((s) => s.setEndPanelTop);
  const endPanelToCeiling = useProjectStore((s) => s.endPanelToCeiling);
  const setSideInfillTop = useProjectStore((s) => s.setSideInfillTop);
  const sideInfillToCeiling = useProjectStore((s) => s.sideInfillToCeiling);
  const selectedUnitId = useUiStore((s) => s.selectedUnitId);
  const selectUnit = useUiStore((s) => s.selectUnit);
  const selectedUnitIds = useUiStore((s) => s.selectedUnitIds);
  const openRightPanel = useUiStore((s) => s.openRightPanel);
  const setPanelSection = useUiStore((s) => s.setPanelSection);
  const selectedElement = useUiStore((s) => s.selectedElement);
  const selectElement = useUiStore((s) => s.selectElement);
  const clearSelection = useUiStore((s) => s.clearSelection);
  const snapStep = useUiStore((s) => s.snapStep);
  const shelfDrag = useUiStore((s) => s.dragging);
  const setShelfDrag = useUiStore((s) => s.setDragging);
  const openFronts = useUiStore((s) => s.openFronts);
  const toggleFront = useUiStore((s) => s.toggleFront);
  const focusRequest = useUiStore((s) => s.focusRequest);
  const focusOn = useUiStore((s) => s.focusOn);
  const clearFocus = useUiStore((s) => s.clearFocus);
  const openModal = useUiStore((s) => s.openModal);
  const zoneHint = useUiStore((s) => s.zoneHint);
  const notify = useUiStore((s) => s.notify);
  const openContextMenu = useUiStore((s) => s.openContextMenu);
  const closeContextMenu = useUiStore((s) => s.closeContextMenu);
  const openLibraryToInsert = useUiStore((s) => s.openLibraryToInsert);
  const showDimensions = useUiStore((s) => s.showDimensions);
  const unitDimensions = useUiStore((s) => s.unitDimensions);
  const dimensionColour = useUiStore((s) => s.dimensionColour);
  const showOutlines = useUiStore((s) => s.showOutlines);
  const contourView = useUiStore((s) => s.contourView);
  const xray = useUiStore((s) => s.xray);
  const showHinges = useUiStore((s) => s.showHinges);
  const realisticLighting = useUiStore((s) => s.realisticLighting);
  const profile = useCabinetProfileStore((s) => s.profile);

  // `units` is the subscription that drives the re-render; allResults() is a
  // stable store function, so deriving from it alone would never update.
  const results = useMemo(() => allResults(), [units, allResults]);
  const walls = useMemo(() => roomWalls(room), [room]);
  const bounds = useMemo(() => roomBounds(room), [room]);

  // What the distance arrows measure. Derived from the SAME results the boxes
  // are drawn from, so an arrow cannot describe a unit that is somewhere else —
  // and a drag updates it frame by frame with no drag state of its own.
  const measured = useMemo(() => {
    const rows = results.map(({ unit, result }) => {
      const base = result.assemblies.mount === 'wall'
        ? (result.assemblies.mountHeight || 0)
        : (result.assemblies.carcass.legHeight || 0);
      return {
        id: unit.id,
        wall: unit.position?.wall ?? 0,
        x_mm: Number(unit.position?.x_mm) || 0,
        width: Number(unit.params.width) || 0,
        depth: Number(unit.params.depth) || 0,
        rotation: Number(unit.position?.rotation_deg) || 0,
        // A unit stood off the wall is measured where it stands (turn 7,
        // CLAUDE.md F5): the arrow reads the real distance, not the one it would
        // be at if it were pushed back.
        backInset: backStandoff(unit, profile),
        level: result.assemblies.mount === 'wall' ? 'wall' : 'floor',
        label: unit.params.unit_num,
        y: base + profile.dimensions.height,
      };
    });

    // ─── Turn 15 (CLAUDE.md F7): …and the BOARDS the chain has to stop at ───
    // The other half of the owner's bug. A base unit's end panel taken to the
    // ceiling stands in the wall units' band, so a wall-unit dimension chain
    // that measured past it was measuring to a wall it could not reach. The
    // panel is measured at the WALL level as a piece of its own thickness —
    // the same span the collision clamp stops at, from the same engine
    // function, so the picture and the rule cannot disagree.
    const wallLevel = rows.filter((r) => r.level === 'wall');
    if (!wallLevel.length) return rows;
    const band = {
      from: profile.wallUnit.defaults.mountHeight,
      to: profile.wallUnit.defaults.mountHeight + profile.wallUnit.defaults.height,
    };
    const owners = new Set(wallLevel.map((r) => r.id));
    const boards = verticalsInBand(
      unitVerticals(units.filter((u) => !owners.has(u.id)), profile),
      band,
      profile.editor.levelOverlapMm,
    ).map((v, i) => ({
      id: `${v.unitId}:${v.pieceId || v.kind}:${i}`,
      wall: v.wall,
      x_mm: v.from,
      width: Math.max(0, v.to - v.from),
      depth: v.depth,
      rotation: 0,
      backInset: wallClearance(profile),
      level: 'wall',
      label: null,
      y: band.from + profile.dimensions.height,
    }));
    return [...rows, ...boards];
  }, [results, units, profile]);
  const roomW = mm(bounds.width);
  const roomH = mm(room.height ?? 2500);
  // What the project's sprayed surfaces are polished to, on Piotr's 0–25 scale.
  const sheen = useMemo(() => projectSheen(design, profile), [design, profile]);
  const studio = profile.appearance.studio;
  // ─── Turn 10 (CLAUDE.md F3) ───
  // The lightest of the room's three tones, and the only one that is not a
  // surface: it is what is seen ABOVE the walls, so it has to sit clear of the
  // wall or the top edge of the room disappears. A profile number for the same
  // reason the wall and the floor are.
  const background = profile.appearance.room?.background || '#fafaf8';
  const [subject, setSubject] = useState(null);
  // Recomputed with the units, not per frame: a door swing is decided by where
  // the cabinets stand, and that only changes when one of them moves.
  const wallGaps = useMemo(
    () => Object.fromEntries(units.map((u) => [u.id, wallGapsFor(u.id)])),
    [units, wallGapsFor],
  );

  // "Nothing is selected" — one function, called from the two places a click can
  // land on nothing: empty space (the canvas's own miss) and the room's own
  // surfaces (turn 11, CLAUDE.md F1.1).
  const dropSelection = useCallback(() => {
    clearSelection();
    closeContextMenu();
  }, [clearSelection, closeContextMenu]);

  // Which ink the dimensions are drawn in (turn 11, CLAUDE.md F1.5). RED by
  // default now — the drawing-office navy is the option, which is the reverse of
  // turn 5. The hexes are profile.dimensions.colours; this is only WHICH.
  const dimensionInk = profile.dimensions.colours[dimensionColour]
    || profile.dimensions.colours[profile.appearance.dimensions.colour];

  return (
    <Canvas
      // "soft" = PCFSoftShadowMap. A shadow with a hard edge under a cabinet
      // is a shadow from a point source, and there are none in a room.
      shadows="soft"
      dpr={[1, 2]}
      // preserveDrawingBuffer: the PDF export reads this canvas back.
      // Tone mapping is ACES and is set by <ToneMapping> below rather than here,
      // because it is now one setting shared with the render pass (turn 8, F1).
      // Turn 7 ran the working view flat to keep the walls white; the price was
      // a view that could not be trusted to predict the still.
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{ position: [0, roomH * 0.95, mm(bounds.depth) * 1.25 + roomW * 0.35], fov: 38, near: 0.05, far: 100 }}
      // Clicking the background clears the selection and any open menu; the
      // orbit only ever starts from the background or a wall, because every
      // unit mesh stops the event and takes the pointer for itself.
      onPointerMissed={dropSelection}
      onContextMenu={(e) => e.preventDefault()}
      style={{ background }}
    >
      <color attach="background" args={[background]} />
      <ToneMapping exposure={studio.exposure} />
      <Environment intensity={profile.appearance.environment.intensity} on={realisticLighting} />
      <Lights
        roomHeight={roomH}
        roomWidth={roomW}
        shadow={profile.render.shadow.normal}
        studio={studio}
        subject={subject}
      />
      <ShadowFit signal={results} unitsRef={unitGroups} onFit={setSubject} />
      {/* Solid and Render only. Contour is a silhouette and X-ray is a look
          THROUGH the furniture — a shadow on the floor is furniture standing on
          it, which is the one thing neither mode is saying. */}
      {!contourView && !xray && <FloorShadow subject={subject} profile={profile} />}
      {/* ─── Turn 11 (CLAUDE.md F1.1) ───
          `onPointerMissed` above only fires when the ray hits NOTHING, and the
          floor and the walls are something — so clicking them left the last
          cabinet selected with its dashed box on. The room clears the selection
          itself now, and the two paths call the same function, so "click the
          background" means one thing wherever the background happens to be. */}
      <Room
        room={room}
        showLabels={showDimensions}
        profile={profile}
        onBackground={dropSelection}
        // ─── Turn 14 (CLAUDE.md F1.5b) ───
        // "One wall" has decided one thing since turn 7 — whether the
        // new-project flow showed Room setup — and the scene was never told.
        // A vanity drawn against one wall was shown standing in a four-walled
        // room, which is not the job the joiner is quoting.
        scope={design?.scope === 'wall' ? 'wall' : 'room'}
      />

      {results.map(({ unit, result }) => (
        <UnitView
          key={unit.id}
          unit={unit}
          result={result}
          groupRef={(group) => {
            if (group) unitGroups.current[unit.id] = group;
            else delete unitGroups.current[unit.id];
          }}
          wall={walls[unit.position?.wall ?? 0] || walls[0]}
          // Every wall, so a drag can take the cabinet round the corner
          // (turn 11, CLAUDE.md F4.1).
          walls={walls}
          roomCentre={bounds.centre}
          // Every unit in the SET is marked, not only the primary (turn 13,
          // F5.1) — a selection you cannot see is a selection you cannot trust.
          selected={selectedUnitIds.includes(unit.id)}
          snapStep={snapStep}
          // Turn 13 (F5.1): the modifier travels with the click — the SET is
          // built in the store, so the canvas only has to say what happened.
          onSelect={(opts) => selectUnit(unit.id, opts)}
          onMove={(x, step) => moveUnit(unit.id, x, step)}
          onMoveToWall={(wallIndex, x, step) => {
            const moved = moveUnitToWall(unit.id, wallIndex, x, step);
            if (moved?.error) notify(moved.error, 'warn');
          }}
          onMoveShelf={(itemId, pos, step) => moveShelf(unit.id, itemId, pos, step)}
          onShelfDragState={setShelfDrag}
          shelfDrag={shelfDrag}
          orbitRef={orbitRef}
          openFronts={openFronts[unit.id]}
          onToggleFront={(panelId) => toggleFront(unit.id, panelId)}
          onFocus={(point, sizeMm) => focusOn([point.x, point.y, point.z], sizeMm)}
          onContextMenu={(menu) => openContextMenu({ ...menu, unitId: unit.id })}
          frontColour={resolveUnitDesign(unit, design).colour?.hex || null}
          // Turn 16 (CLAUDE.md F1.4): the design itself, so a piece with a
          // material of its own is painted with ITS material and not the
          // project's. The resolution is the engine's (engine/materials.js).
          design={design}
          onSetTopInfill={(h) => setTopInfill(unit.id, h)}
          onFillToCeiling={() => fillToCeiling(unit.id)}
          onSetEndPanelTop={(panelId, v) => setEndPanelTop(unit.id, panelId, v)}
          onEndPanelToCeiling={(panelId) => endPanelToCeiling(unit.id, panelId)}
          onSetSideInfillTop={(side, v) => setSideInfillTop(unit.id, side, v)}
          onSideInfillToCeiling={(side) => sideInfillToCeiling(unit.id, side)}
          showLabels={showDimensions && !contourView}
          profile={profile}
          finishes={resolveFinishes(unit, design, profile)}
          outlines={showOutlines}
          contour={contourView}
          xray={xray}
          showHinges={showHinges}
          sheen={sheen}
          // How much clear WALL is beside this unit, per side. The door swing
          // reads it: past square a door comes back towards the wall on its
          // hinge side (turn 8, CLAUDE.md F5).
          wallGaps={wallGaps[unit.id]}
          // The right-click toggle: every number THIS cabinet has (turn 8, F7).
          showAllDims={Boolean(unitDimensions[unit.id])}
          zoneHint={selectedUnitId === unit.id ? zoneHint : null}
          // The ink every dimension caption on this cabinet is written in
          // (turn 11, CLAUDE.md F1.5) — the same one the distance arrows use,
          // because they are one thing to a joiner: the numbers.
          dimensionColour={dimensionInk}
          // Which joint system this project is cut with — the joint drawing
          // reads its layer names through it (turn 8, F8).
          unitDesign={design}
          // ─── One element inside this cabinet (turn 9, CLAUDE.md F4) ───
          // Only ever passed to the unit the element belongs to, so a shelf
          // called SHELF-1 in one cabinet cannot light up SHELF-1 in the next.
          selectedElement={selectedElement?.unitId === unit.id ? selectedElement.elementRef : null}
          onSelectElement={(panelId) => selectElement(unit.id, panelId)}
          onMoveElementDepth={(itemId, setback) => setElementDepth(unit.id, itemId, setback)}
          // ─── Turn 11 (CLAUDE.md F3.3) ───
          // Double-click a piece: an edit modal opens NEXT TO IT (the click
          // point travels with the request, so the modal lands where the eye
          // already is) and the right panel focuses on the same piece.
          onEditElement={(panelId, at) => openModal('element', {
            unitId: unit.id, panelId, at,
          })}
          // The inner "+" (turn 11, CLAUDE.md F4.3): the unit STAYS selected and
          // the right panel opens its Add items section. Nothing about the
          // selection changes — that is what "inner" means.
          // ─── Turn 12 (CLAUDE.md F5.1) ───
          // The golden "+" opens a MODAL beside the cabinet — the answer where
          // the question was asked. The right panel still opens on the same
          // section, because CLAUDE.md asks it to keep mirroring: the modal is
          // primary, not exclusive.
          onAddItems={(at) => {
            selectUnit(unit.id);
            openModal('add-items', { unitId: unit.id, anchor: at || null });
            openRightPanel();
            setPanelSection('add', true);
          }}
        />
      ))}

      {/* Contour view is for a render or a printout: the numbers would be
          in the way of the only thing it is for. */}
      {showDimensions && !contourView && (
        <group userData={{ ccHelper: true }}>
          <DistanceArrows
            walls={walls}
            units={measured}
            roomCentre={bounds.centre}
            profile={profile}
            colourKey={dimensionColour}
          />
        </group>
      )}

      {/* ─── "Another one here" (turn 9, CLAUDE.md F2) ───
          A "+" at every free end of every run, in the gap it would fill. Not in
          Contour, which is a picture, and not while a shelf is being dragged —
          a control that appears under a moving hand is a control you press by
          accident. The library opens at the category the cabinet you clicked
          beside belongs to, carrying the place with it, so a wall unit's plus
          offers wall units. */}
      {!contourView && !shelfDrag && (
        <AddPluses
          units={units}
          walls={walls}
          roomCentre={bounds.centre}
          profile={profile}
          onPick={(point) => {
            const near = units.find((u) => u.id === point.unitId);
            closeContextMenu();
            openLibraryToInsert(categoryOf(near?.type)?.id || null, { near: point.unitId, side: point.side });
          }}
        />
      )}

      <FocusRig request={focusRequest} orbitRef={orbitRef} onDone={clearFocus} />

      {/* ─── Turn 11: the orbit target is set ONCE, not every render ───
          `target={[0, roomH * 0.45, 0]}` looked harmless and was not. React
          applies a prop on EVERY render, and this scene re-renders whenever
          anything at all changes — a selection, a drag, a shelf. So the orbit
          target was being written back to the middle of the room continuously,
          and the camera fly that turn 5 built ("look at THIS", FocusRig above)
          could never arrive: it lerped the target for a frame and the next
          render put it back. Double-clicking a piece appeared to do nothing but
          zoom slightly, which is exactly what it did.

          It is imperative now, and only when the ROOM changes shape — which is
          the one time "the middle of the room" has moved. */}
      <OrbitControls
        ref={orbitRef}
        makeDefault
        minDistance={0.8}
        maxDistance={24}
        maxPolarAngle={Math.PI / 2}
        enableDamping
        dampingFactor={0.12}
      />
      {/* AFTER the controls, deliberately: effects run in tree order, so a
          sibling placed above would look for a ref that has not been attached
          yet and silently do nothing — which is how the orbit ends up pointed
          at the floor. */}
      <HomeTarget orbitRef={orbitRef} height={roomH} />
      <ViewHandle name="room" />
      <CaptureRig onReady={onCaptureReady} background={background} />
      <RenderRig onReady={onRenderReady} unitsRef={unitGroups} />
    </Canvas>
  );
}
