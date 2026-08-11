import {
  useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mm } from './constants.js';
import { runnerEntry, runnerModelSrc } from '../engine/runners.js';
import { hingeModelSrc, plateFamily, resolveDoorHinge } from '../engine/hinges.js';
import { clearHardwareSurface, reportHardware } from './hardwareRegistry.js';
import {
  onRunnerLoad, runnerModel, runnerModelFits, runnerSource,
} from './runnerModels.js';
import {
  hingeModel, hingeModelFits, hingeSource, onHingeLoad,
} from './hingeModels.js';

// ─── The hardware, in 3D (turn 7, CLAUDE.md F3 / BACKLOG #42) ───
//
// Procedural, to the millimetre: a hinge is a ⌀35 cup, a body, an arm and a
// mounting plate; a runner is a pair of L-profiles; a leg is a plate, a stem
// and a foot; a rail is a tube. Nothing is downloaded and no model file exists
// — the sizes are `profile.hardware` (the catalogue) and the POSITIONS are
// engine/hardware3d.js, which reads them off the same drilling the CNC files
// come from. A hinge in this view is where the machine will bore for one.
//
// Everything repeatable is an InstancedMesh. A wardrobe has twelve hinges and
// four legs; ten of them in a room is 160 pieces of hardware, and 160 draw
// calls per frame is how a working view starts to stutter. Instanced, it is
// five — one per SHAPE per unit, whatever the counts are.
//
// What shows when: hinges and runners are X-RAY ONLY, because a working view
// full of ironmongery is a working view nobody can read (CLAUDE.md: "the normal
// view stays clean"). Legs and the rail are always drawn, as they always have
// been — hiding a leg would be a regression dressed as a feature.
//
// ─── TURN 12 (CLAUDE.md F6.1): WHY THEY COULD NOT BE SEEN ───
//
// Owner: "hinges invisible in Solid — find why". They were being drawn, in the
// right place, every frame. The answer is that every part of one was INSIDE
// solid board:
//
//   • the CUP is bored into the back of the door, so the cylinder turn 7 drew
//     at `z + cupDepth/2` sits entirely within the door's 25 mm — visible in
//     X-ray, where the board is translucent, and in nothing else;
//   • the ARM and the PLATE are inside the carcass, behind a shut door.
//
// Two things were missing and both are here now.
//
//   THE BOSS. `profile.hardware.hinge.bossHeight` has carried the number since
//   turn 7 with the comment "the cup body standing proud of the door's back
//   face", and nothing ever drew it. It is the part of a hinge a joiner
//   actually sees when he opens a cabinet, and it was the one part missing.
//
//   THE SWING. The cup and the boss are screwed to the DOOR. They were drawn in
//   a static group, so opening a door left them behind in the air where the
//   door had been — which is worse than not drawing them. They are rendered as
//   children of the door's own swinging group now (3d/UnitView.jsx), so they go
//   with it, and the arm and plate stay on the carcass where they are screwed.
//   That is also what makes the joint READ: open the door and the two halves
//   separate, exactly as the ironmongery does.

/**
 * @param {object} props
 *   instances  engine/hardware3d.js hardwareInstances() output
 *   profile
 *   xray       are we looking through the furniture?
 *   hinges     draw the hinge bodies even in Solid (turn 11, CLAUDE.md F3.5)
 *   runners    …and the runners, when the fronts are off or a door is open
 *              (turn 18, CLAUDE.md F6.7)
 *   runnerVariants  { [drawer]: 'T' | 'S' } — resolved project → unit → drawer
 *   storageBase     where the models are served from, '' in mock mode
 */
export default function Hardware({
  instances, profile, xray = false, hinges = false,
  runners = false, runnerVariants = null, storageBase = '', drawerSlide = null,
  hingeSpecs = null, onEditHinge = null, surface = 'room', scope = '',
}) {
  const colours = profile.appearance.hardware;
  // ─── TURN 21 (CLAUDE.md R4 / F2.2 / F6.3) ───
  // What this surface mounted goes with this surface. A window that closes
  // stops claiming to be showing anything.
  useEffect(() => () => clearHardwareSurface(surface), [surface]);
  return (
    <group userData={{ ccHardware: true }}>
      <Legs items={instances.legs} profile={profile} colour={colours.leg} />
      {instances.rails.map((rail, i) => (
        <Rail key={`rail-${i}`} rail={rail} colour={colours.rail} />
      ))}
      {/* ─── Turn 11 (CLAUDE.md F3.5): the hinges are furniture ───
          Owner verdict: a hinge is a thing that is FITTED, and a joiner opening
          a door wants to see it there rather than having to switch to X-ray to
          be told it exists. Same instances, same positions — the engine's own
          drilling (engine/hardware3d.js) — so the count of what is drawn is
          still the count of what is on order.

          The RUNNERS stay behind X-ray: they live inside a closed drawer box
          where nothing but an X-ray can see them anyway, and drawing eight of
          them per stack in Solid is the wall of ironmongery this component was
          written to avoid. The colour is `appearance.hardware.hinge` — a dark
          hardware tone, quieter than the bright bracket grey X-ray uses,
          because in Solid it is a small object on a white door rather than the
          thing being explained. */}
      {(xray || hinges) && (
        <CarcassHinges
          items={instances.hinges}
          profile={profile}
          colour={xray ? colours.bracket : (colours.hinge || colours.bracket)}
          specs={hingeSpecs}
          storageBase={storageBase}
          onEditHinge={onEditHinge}
          surface={surface}
          scope={scope}
        />
      )}
      {/* ─── Turn 18 (CLAUDE.md F6.7) ───
          The runners come out from behind X-ray when the FRONTS are off or a
          door is open — which is exactly when a joiner is looking INTO the
          cabinet and the ironmongery is what he is looking at. With the fronts
          on and the doors shut they stay hidden, because a closed drawer hides
          them in the workshop too and a wall of ironmongery is what this
          component was written to avoid. */}
      {(xray || runners) && (
        <>
          <Runners
            slide={drawerSlide}
            items={instances.runners}
            profile={profile}
            colour={colours.bracket}
            variants={runnerVariants}
            storageBase={storageBase}
            surface={surface}
            scope={scope}
          />
          <Rods items={instances.rods || []} colour={colours.bracket} />
        </>
      )}
    </group>
  );
}

/**
 * One instanced mesh, positioned by a callback.
 *
 * `place(i, matrix)` writes the matrix for instance i. The effect is layout —
 * not `useFrame` — because none of this moves: hardware is nailed to the
 * cabinet, and re-writing 160 matrices every frame for furniture that is
 * standing still is exactly the cost this component exists to avoid.
 */
function Pieces({
  count, place, colour, roughness = 0.35, metalness = 0.75, children,
  onDoubleClick = null, visible = true,
}) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < count; i += 1) {
      place(i, matrix);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [count, place]);

  if (!count) return null;
  return (
    // ccNoBounds: hardware is IN the picture but must not frame it — a render
    // that zoomed out to fit a leg bracket would be a render of a leg bracket.
    //
    // ─── Turn 19 (CLAUDE.md F1.3): AND IT CAN BE POINTED AT ──────────────────
    // An InstancedMesh raycasts, and the hit carries the `instanceId` — so a
    // double-click on the ninth hinge in a wardrobe arrives here as `9` without
    // a single extra object in the scene. That matters: this component exists
    // to keep 160 pieces of ironmongery at five draw calls, and a pick target
    // per hinge would have handed all of that back to get one gesture.
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, count]}
      userData={{ ccNoBounds: true }}
      onDoubleClick={onDoubleClick || undefined}
    >
      {children}
      <meshStandardMaterial
        color={colour}
        roughness={roughness}
        metalness={metalness}
        // An INVISIBLE instanced mesh is not raycast by three.js at all, so a
        // pick surface that must not be seen is drawn transparent instead —
        // which is what the model path below needs, and it costs one draw call
        // for the whole set rather than one per hinge.
        transparent={!visible}
        opacity={visible ? 1 : 0}
        depthWrite={visible}
      />
    </instancedMesh>
  );
}

const put = (matrix, position, quaternion = null, scale = null) => matrix.compose(
  position,
  quaternion || new THREE.Quaternion(),
  scale || new THREE.Vector3(1, 1, 1),
);

// ─── Hinges ─────────────────────────────────────────────────────────────────

/**
 * The CARCASS half: the arm that leaves the cup and the plate it is screwed to.
 *
 * Two instanced meshes — an InstancedMesh carries one geometry, and two of them
 * is two draw calls for twelve hinges rather than twenty-four. Neither piece
 * moves when a door opens: they are screwed to the side panel.
 *
 * ─── TURN 19 (CLAUDE.md F1.6): THE MANUFACTURER'S OWN GEOMETRY ──────────────
 *
 * The runners' bargain, on the hinges. The owner has the whole CLIP top world
 * as GLB and a Blum hinge drawn from two boxes is a Blum hinge nobody
 * recognises — so where the model has ARRIVED it is drawn, one clone per
 * position, and where it has not (the file still on its way, a bucket that is
 * down, mock mode, a file that measures far too big) the row falls through to
 * the INSTANCED GREY BODY this function has drawn since turn 7. Never a hole,
 * never a blocked scene.
 *
 * THE MODEL IS A COSTUME ON THE SCREWS. Every position below is the engine's —
 * `hardwareInstances` reads `drillSummary.hinge_centers`, the rows the machine
 * drills — and the models are moved to them. That is why this turn's CNC export
 * has zero deltas: nothing about a downloaded file can move a hole.
 *
 * ─── AND IT CAN BE POINTED AT (F1.3) ───────────────────────────────────────
 *
 * "Po podwójnym kliknięciu na hinge otworzy się modal." The arm's instanced
 * mesh carries the gesture, because it is the piece a joiner is actually
 * looking at when a door is open; where a MODEL is drawn over it the arm stays
 * as a transparent pick surface underneath, so the hinge is clickable whether
 * or not the bucket answered.
 */
function CarcassHinges({
  items, profile, colour, specs = null, storageBase = '', onEditHinge = null,
  surface = 'room', scope = '',
}) {
  const H = profile.hardware.hinge;
  const [arrived, setArrived] = useState(0);

  // Which FILE each hinge wants. `specs` is the resolution the view was handed
  // — one entry per door panel id — so the model that is drawn is the hinge the
  // BOM is ordering, and not a second opinion about it.
  // ─── TURN 21 (CLAUDE.md F2.1): THE URL, OR NOTHING ───
  // `hingeModelSrc` and not `hingeModelUrl`: a path with no host is not a URL,
  // and turn 20 handed the bare in-bucket path to the loader, which asked the
  // app's own domain for it — the owner's `/hinges/blum/…glb → 404`. Null here
  // is the stand-in path, and no request leaves the page.
  const wanted = useMemo(() => items.map((h) => {
    const spec = specs?.[h.panelId] || null;
    if (!spec?.file) return { hinge: null, plate: null };
    return {
      hinge: hingeModelSrc(spec, profile, storageBase),
      plate: spec.plateFile
        ? hingeModelSrc({ file: spec.plateFile }, profile, storageBase)
        : null,
    };
  }), [items, specs, profile, storageBase]);

  useEffect(() => {
    const offs = [];
    for (const w of wanted) {
      if (w.hinge) offs.push(onHingeLoad(w.hinge, () => setArrived((n) => n + 1)));
      if (w.plate) offs.push(onHingeLoad(w.plate, () => setArrived((n) => n + 1)));
    }
    return () => { for (const off of offs) off(); };
  }, [wanted]);

  const models = useMemo(() => wanted.map((w) => {
    const take = (url, plate) => {
      if (!url) return { model: null, reason: 'no-url' };
      const source = hingeSource(url);
      if (source?.failed) return { model: null, reason: 'failed' };
      if (!source?.loaded) return { model: null, reason: 'loading' };
      if (!hingeModelFits(source, profile)) return { model: null, reason: 'wrong-size' };
      return { model: hingeModel(url, { profile, plate }), reason: null };
    };
    const hinge = take(w.hinge, false);
    const plate = take(w.plate, true);
    return {
      hinge: hinge.model, plate: plate.model, hingeReason: hinge.reason, plateReason: plate.reason,
    };
    // `arrived` is the dependency that matters: a clone taken before the file
    // lands holds nothing, so it has to be re-taken after it does.
  }), [wanted, profile, arrived]);

  // ─── TURN 21 (CLAUDE.md R4 / F2.3) ───
  // What the walk is allowed to believe: the exact url string this component
  // handed the loader, and whether the GLB or the stand-in is what is drawn.
  useEffect(() => {
    reportHardware(surface, 'hinge', items.map((h, i) => ({
      key: h.panelId ?? i, url: wanted[i]?.hinge || null, model: Boolean(models[i]?.hinge), reason: models[i]?.hingeReason,
    })), scope);
    reportHardware(surface, 'plate', items.map((h, i) => ({
      key: h.panelId ?? i, url: wanted[i]?.plate || null, model: Boolean(models[i]?.plate), reason: models[i]?.plateReason,
    })), scope);
  }, [surface, scope, items, wanted, models]);

  const drawnModel = models.some((m) => m.hinge);

  // The arm runs straight back off the cup, into the carcass.
  const placeArm = useMemo(() => (i, m) => {
    const h = items[i];
    put(m, new THREE.Vector3(mm(h.x), mm(h.y), mm(h.z - H.armLength / 2)));
  }, [items, H.armLength]);

  // The plate, screwed to the inner face of the side panel the door hangs from.
  const placePlate = useMemo(() => (i, m) => {
    const h = items[i];
    const x = h.plateX + h.dir * (H.plateThickness / 2);
    put(m, new THREE.Vector3(mm(x), mm(h.y), mm(h.plateZ)));
  }, [items, H.plateThickness]);

  const pick = useMemo(() => (onEditHinge ? (e) => {
    const h = items[e.instanceId];
    if (!h) return;
    e.stopPropagation();
    onEditHinge({
      panelId: h.panelId,
      // WHICH ROW, counted from the floor exactly as the engine counts them —
      // `hardwareInstances` walks the drilled centres in order, per door, so
      // the index inside one door's run is the index in `hinge_centers`.
      index: items.filter((x) => x.panelId === h.panelId).indexOf(h),
      at: { x: e.clientX, y: e.clientY },
    });
  } : null), [items, onEditHinge]);

  return (
    <>
      {/* The models, standing on the drilled points. */}
      {models.map((m, i) => (
        <group key={`hm${items[i].panelId}-${items[i].y}`}>
          {m.hinge && (
            <primitive object={m.hinge} position={[mm(items[i].x), mm(items[i].y), mm(items[i].z)]} />
          )}
          {m.plate && (
            <primitive
              object={m.plate}
              position={[mm(items[i].plateX), mm(items[i].y), mm(items[i].plateZ)]}
            />
          )}
        </group>
      ))}

      {/* The procedural arm — the grey stand-in when the bucket is unreachable,
          and the PICK SURFACE always. Where a model is drawn over it, it is
          transparent: it is then doing one job, which is carrying the gesture. */}
      <Pieces
        count={items.length}
        place={placeArm}
        colour={colour}
        onDoubleClick={pick}
        visible={!drawnModel}
      >
        <boxGeometry args={[mm(H.armWidth), mm(H.armThickness), mm(H.armLength)]} />
      </Pieces>
      <Pieces count={items.length} place={placePlate} colour={colour} visible={!drawnModel}>
        <boxGeometry args={[mm(H.plateThickness), mm(H.plateWidth), mm(H.plateLength)]} />
      </Pieces>
    </>
  );
}

/**
 * WHICH MODEL EACH DOOR'S HINGES WEAR, keyed by the door's panel id
 * (turn 19, CLAUDE.md F1.6).
 *
 * The view asks the ENGINE, once per unit, and hands the answer down — so the
 * hinge in the picture, the article in the BOM and the angle in the hinge modal
 * are one resolution rather than three. A catalogue that has not been read
 * gives an empty map, and the whole of the 3D falls back to the procedural body
 * without a branch anywhere else.
 *
 * @param {object} args
 *   result   computeCabinet() output
 *   unit     the project unit (its params carry the per-door exceptions)
 *   finish   the project's hinge finish
 *   plate    the project's mounting plate
 * @returns {object} { [panelId]: { file, plateFile, family, angle, article } }
 */
export function hingeSpecsFor({
  result, unit, finish = null, plate = null,
}) {
  const out = {};
  const doors = (result?.panels || []).filter((p) => p.part === 'FRONT' && p.role === 'front');
  if (!doors.length) return out;
  const plateEntry = plateFamily({ plate, finish });
  const innerDrawer = unit?.type === 'WARDROBE' && Number(result?.derived?.drawers) > 0;
  for (const door of doors) {
    const spec = resolveDoorHinge({
      assigned: unit?.params?.door_hinges?.[door.id] || null,
      frontThickness: door.thickness,
      innerDrawer,
      finish,
    });
    out[door.id] = {
      ...spec,
      file: spec.file || null,
      plateFile: plateEntry?.file || null,
    };
  }
  return out;
}

/**
 * The DOOR half: the ⌀35 cup bored into the back of the door, and the boss
 * standing proud of it — which is the part you can actually see.
 *
 * Rendered INSIDE the door's own group (3d/UnitView.jsx), so it swings with the
 * door. `pivot` is that group's origin in cabinet millimetres, because a child
 * of it is positioned relative to it and the hinge instances are in the
 * cabinet's frame like every other number in this file.
 *
 * @param {object} props
 *   items   the hinge instances belonging to THIS door
 *   pivot   [x, y, z] in cabinet mm — the group's origin
 */
export function DoorHinges({
  items, profile, colour, pivot,
}) {
  const H = profile.hardware.hinge;

  // The cup is bored along the DEPTH axis, so the cylinder (whose own axis is
  // Y) is laid down once, here, rather than per instance.
  const laid = useMemo(() => new THREE.Quaternion()
    .setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), []);

  const local = (x, y, z) => new THREE.Vector3(
    mm(x) - pivot[0], mm(y) - pivot[1], mm(z) - pivot[2],
  );

  // Into the door, from its back face.
  const placeCup = useMemo(() => (i, m) => {
    const h = items[i];
    put(m, local(h.x, h.y, h.z + H.cupDepth / 2), laid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, H.cupDepth, laid, pivot[0], pivot[1], pivot[2]]);

  // …and OUT of it, into the carcass opening, which is the half a joiner sees.
  const placeBoss = useMemo(() => (i, m) => {
    const h = items[i];
    put(m, local(h.x, h.y, h.z - H.bossHeight / 2), laid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, H.bossHeight, laid, pivot[0], pivot[1], pivot[2]]);

  if (!items.length) return null;
  return (
    <>
      <Pieces count={items.length} place={placeCup} colour={colour} metalness={0.8}>
        <cylinderGeometry args={[mm(H.cupDiameter / 2), mm(H.cupDiameter / 2), mm(H.cupDepth), 18]} />
      </Pieces>
      <Pieces count={items.length} place={placeBoss} colour={colour} metalness={0.8}>
        {/* Slightly narrower than the bore it stands in, as the body of a cup
            hinge is — it is the moving part, not the hole. */}
        <cylinderGeometry
          args={[mm(H.cupDiameter / 2 - 1), mm(H.cupDiameter / 2 - 1), mm(H.bossHeight), 18]}
        />
      </Pieces>
    </>
  );
}

// ─── Runners ────────────────────────────────────────────────────────────────

/**
 * A pair per drawer.
 *
 * ─── TURN 18 (CLAUDE.md F6): THE MANUFACTURER'S OWN GEOMETRY ───────────────
 *
 * Everything else in this file is procedural on purpose. A runner is the
 * exception the owner asked for: he has the whole MOVENTO 760H ladder as GLB,
 * and a Blum runner drawn from three boxes is a Blum runner nobody recognises.
 *
 * Two lists, and they are disjoint so nothing is ever drawn twice:
 *
 *   • rows whose model has ARRIVED are drawn with it, one clone per row —
 *     which is what makes a drawer's two runners two objects at two heights;
 *   • every other row — the file still on its way, a bucket that is down, mock
 *     mode, a model that measures the wrong length — falls through to the
 *     INSTANCED PROFILE this function has drawn since turn 7: the same grey
 *     shape, at the runner's true size, in the same place (F6.6). Never a
 *     hole, never a blocked scene.
 *
 * THE MODEL IS A COSTUME ON THE SCREWS (F6.2). Every position is the engine's —
 * `hardwareInstances` reads `drillSummary.runner_rows_carcass_y`, the row the
 * CNC actually drills — and the model is moved to it. Nothing about a
 * downloaded file is allowed to move a hole.
 */
function Runners({
  items, profile, colour, variants = null, storageBase = '', slide = null,
  surface = 'room', scope = '',
}) {
  const R = profile.hardware.runner;
  const M = R.movento;
  // A file arriving is not a state change anything else can see, so this is the
  // one re-render it causes — the same trick 3d/UnitView.jsx uses for a decor
  // image that lands after the panel was drawn.
  const [arrived, setArrived] = useState(0);

  // Which FILE each row wants. The catalogue may know nothing (no bucket, mock
  // mode) — then every url is null and every row is drawn plain.
  const wanted = useMemo(() => items.map((r) => {
    const variant = variants?.[r.drawer] || M.defaultVariant;
    const entry = runnerEntry({
      system: M.system, nl: r.length, variant, side: r.side,
    });
    return {
      row: r,
      // Turn 21 (CLAUDE.md F2.1): the hinges' own helper, for the same reason.
      url: entry ? runnerModelSrc(entry, profile, storageBase) : null,
      // The manifest names L and R separately. Where it gives one file for
      // both, the other hand is that file mirrored across the cabinet.
      mirror: Boolean(entry && entry.side == null && r.side === 'R'),
    };
  }), [items, variants, profile, storageBase, M]);

  useEffect(() => {
    const offs = wanted
      .filter((w) => w.url)
      .map((w) => onRunnerLoad(w.url, () => setArrived((n) => n + 1)));
    return () => { for (const off of offs) off(); };
  }, [wanted]);

  const models = useMemo(() => wanted.map((w) => {
    if (!w.url) return null;
    const source = runnerSource(w.url);
    if (!source?.loaded || !runnerModelFits(source, w.row.length, profile)) return null;
    return runnerModel(w.url, { mirror: w.mirror, profile });
    // `arrived` is the dependency that matters: the clone must be re-taken
    // AFTER the file lands, or it holds nothing (3d/materials.js says the same
    // thing about a texture clone taken too early).
  }), [wanted, profile, arrived]);

  // Turn 21 (CLAUDE.md R4 / F6.3): the same report the hinges make, so the
  // walk can tell a MODEL from a stand-in in the editor as well as in the room.
  useEffect(() => {
    reportHardware(surface, 'runner', wanted.map((w, i) => ({
      key: `${w.row.drawer}${w.row.side}`,
      url: w.url,
      model: Boolean(models[i]),
      reason: models[i] ? null : (w.url ? 'no-model' : 'no-url'),
    })), scope);
  }, [surface, scope, wanted, models]);

  const plain = useMemo(() => items.filter((_, i) => !models[i]), [items, models]);

  // ─── TURN 20 (CLAUDE.md F3.1/F3.2): THE RUNNER RIDES OUT WITH ITS DRAWER ──
  //
  // "The runner's fixed profile (cabinet-side) stays put; only the moving
  // member and the box ride out. If the GLB is a single body, slide the whole
  // model with the box — a note in the code says why, and splitting the model
  // is the owner's future call, not this turn's guess."
  //
  // Both of this app's runners ARE single bodies: the manufacturer's GLB is one
  // mesh of the whole assembly, and the grey stand-in is one L-profile drawn
  // from three numbers. So the whole runner travels with the drawer it carries,
  // and there is no fixed member drawn separately to leave behind. Splitting
  // the cabinet profile from the carriage needs the model split, which is the
  // owner's call on his own files.
  //
  // The offset is an OFFSET and never an absolute position — the model is
  // placed on the drilled row by `hardwareInstances` and this adds to it, so a
  // downloaded file still cannot move a hole (F6.2).
  const slideOf = (drawer) => (Number(slide?.open?.get?.(drawer)) || 0)
    * (Number(slide?.travel?.get?.(drawer)) || 0);

  // One animated group per DRAWER: everything that drawer's runner is made of
  // hangs inside it and the group's own z is eased, so the slide costs no
  // re-render and no instance matrix is rewritten per frame. A cabinet with no
  // drawers has one group with a zero offset, exactly as before.
  const drawers = useMemo(
    () => [...new Set(items.map((r) => r.drawer ?? 0))].sort((a, b) => a - b),
    [items],
  );
  const inDrawer = (list, drawer) => list
    .map((value, i) => ({ value, i }))
    .filter(({ i }) => (items[i]?.drawer ?? 0) === drawer);

  const placeFace = useMemo(() => (i, m) => {
    const r = plain[i];
    const dir = r.side === 'L' ? -1 : 1;
    put(
      m,
      new THREE.Vector3(mm(r.x + dir * (r.thickness / 2)), mm(r.y + R.profileHeight / 2), mm(r.z + r.length / 2)),
      null,
      new THREE.Vector3(1, 1, mm(r.length)),
    );
  }, [plain, R.profileHeight]);

  const placeFlange = useMemo(() => (i, m) => {
    const r = plain[i];
    const dir = r.side === 'L' ? -1 : 1;
    put(
      m,
      new THREE.Vector3(mm(r.x + dir * (R.flangeDepth / 2)), mm(r.y), mm(r.z + r.length / 2)),
      null,
      new THREE.Vector3(1, 1, mm(r.length)),
    );
  }, [plain, R.flangeDepth]);

  // The plain rows keep their own indices into `plain`, and the models theirs
  // into `items`; both are filtered per drawer so a group holds exactly its own
  // runner and the instanced geometry is still shared across the unit.
  const plainOfDrawer = useMemo(() => {
    const out = new Map();
    plain.forEach((r, i) => {
      const key = r.drawer ?? 0;
      if (!out.has(key)) out.set(key, []);
      out.get(key).push(i);
    });
    return out;
  }, [plain]);

  return (
    <>
      {drawers.map((drawer) => {
        const mine = plainOfDrawer.get(drawer) || [];
        return (
          <SlideOut key={`d${drawer}`} distance={slideOf(drawer)}>
            {/* The model, standing on the drilled row: x is the face of the
                panel it is screwed to, y is the row itself, z is the back of
                the box. */}
            {inDrawer(models, drawer).map(({ value: model, i }) => (model ? (
              <primitive
                // eslint-disable-next-line react/no-array-index-key -- the row IS the identity
                key={`m${i}`}
                object={model}
                position={[mm(items[i].x), mm(items[i].y), mm(items[i].z)]}
              />
            ) : null))}

            {/* The upright face. Its LENGTH is a per-instance scale, so one
                geometry serves a 390 mm runner and a 690 mm one. */}
            <Pieces
              count={mine.length}
              place={(n, m) => placeFace(mine[n], m)}
              colour={colour}
              metalness={0.7}
            >
              <boxGeometry args={[mm(R.profileThickness), mm(R.profileHeight), 1]} />
            </Pieces>
            <Pieces
              count={mine.length}
              place={(n, m) => placeFlange(mine[n], m)}
              colour={colour}
              metalness={0.7}
            >
              <boxGeometry args={[mm(R.flangeDepth), mm(R.profileThickness), 1]} />
            </Pieces>
          </SlideOut>
        );
      })}
    </>
  );
}

/**
 * A group that eases itself out along +Z (turn 20, CLAUDE.md F3.3).
 *
 * The SAME spring the fronts use — `3d/UnitView.jsx`'s `MovingPanel` runs the
 * identical `+= (target - current) × min(1, delta × 8)` — so a drawer's box,
 * its face and its runner arrive together instead of one of them snapping. It
 * is done on the GROUP rather than on the instances because an instanced matrix
 * rewritten sixty times a second is the cost this file exists to avoid.
 */
function SlideOut({ distance = 0, children }) {
  const group = useRef(null);
  const at = useRef(0);
  useFrame((_, delta) => {
    if (!group.current) return;
    const target = mm(distance);
    if (Math.abs(at.current - target) < 1e-5) at.current = target;
    else at.current += (target - at.current) * Math.min(1, delta * 8);
    group.current.position.z = at.current;
  });
  return <group ref={group}>{children}</group>;
}

/**
 * The synchronisation rod (turn 18, CLAUDE.md F6.5): a tube across the back of
 * a wide drawer box, tying the two runners together so it cannot rack.
 *
 * Parametric to the millimetre and never a decoration — WHETHER there is one is
 * Blum's own threshold on the cabinet opening (engine/runners.js `syncRodFor`),
 * and its LENGTH is the box less the ends its adapters take up. A narrow drawer
 * draws nothing, because a narrow drawer is fitted with nothing.
 */
function Rods({ items, colour }) {
  const place = useMemo(() => (i, m) => {
    const rod = items[i];
    put(
      m,
      new THREE.Vector3(mm(rod.x), mm(rod.y), mm(rod.z)),
      // The tube is modelled up the y axis; the rod runs ACROSS the cabinet.
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2),
      new THREE.Vector3(1, mm(rod.length), 1),
    );
  }, [items]);

  if (!items.length) return null;
  return (
    <Pieces count={items.length} place={place} colour={colour} metalness={0.75}>
      <cylinderGeometry args={[mm(items[0].diameter / 2), mm(items[0].diameter / 2), 1, 12]} />
    </Pieces>
  );
}

// ─── Legs ───────────────────────────────────────────────────────────────────

/**
 * Plate, stem, foot — the three parts of an adjustable leg, which is what turn
 * 7 replaces the single box with. Always visible, as legs have always been.
 */
function Legs({ items, profile, colour }) {
  const L = profile.hardware.leg;

  const placePlate = useMemo(() => (i, m) => {
    const leg = items[i];
    // The plate is screwed to the underside of the carcass base.
    put(m, new THREE.Vector3(mm(leg.x), mm(-L.plateThickness / 2), mm(leg.z)));
  }, [items, L.plateThickness]);

  const placeStem = useMemo(() => (i, m) => {
    const leg = items[i];
    const stem = Math.max(1, leg.height - L.plateThickness - L.footHeight);
    put(
      m,
      new THREE.Vector3(mm(leg.x), mm(-(L.plateThickness + stem / 2)), mm(leg.z)),
      null,
      new THREE.Vector3(1, mm(stem), 1),
    );
  }, [items, L.plateThickness, L.footHeight]);

  const placeFoot = useMemo(() => (i, m) => {
    const leg = items[i];
    put(m, new THREE.Vector3(mm(leg.x), mm(-(leg.height - L.footHeight / 2)), mm(leg.z)));
  }, [items, L.footHeight]);

  return (
    <>
      <Pieces count={items.length} place={placePlate} colour={colour} roughness={0.55} metalness={0.3}>
        <boxGeometry args={[mm(items[0]?.plate || L.footDiameter), mm(L.plateThickness), mm(items[0]?.plate || L.footDiameter)]} />
      </Pieces>
      <Pieces count={items.length} place={placeStem} colour={colour} roughness={0.5} metalness={0.4}>
        <cylinderGeometry args={[mm(L.stemDiameter / 2), mm(L.stemDiameter / 2), 1, 12]} />
      </Pieces>
      <Pieces count={items.length} place={placeFoot} colour={colour} roughness={0.6} metalness={0.2}>
        <cylinderGeometry args={[mm(L.footDiameter / 2), mm(L.footDiameter / 2), mm(L.footHeight), 14]} />
      </Pieces>
    </>
  );
}

// ─── The rail ───────────────────────────────────────────────────────────────

/** One tube, at the diameter the profile carries. Not instanced: there is one. */
function Rail({ rail, colour }) {
  return (
    <mesh
      position={[mm(rail.x), mm(rail.y), mm(rail.z)]}
      rotation={[0, 0, Math.PI / 2]}
      userData={{ ccNoBounds: true }}
    >
      <cylinderGeometry args={[mm(rail.diameter / 2), mm(rail.diameter / 2), mm(rail.length), 14]} />
      <meshStandardMaterial color={colour} roughness={0.4} metalness={0.6} />
    </mesh>
  );
}
