import {
  useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import * as THREE from 'three';
import { mm } from './constants.js';
import { runnerEntry, runnerModelUrl } from '../engine/runners.js';
import {
  onRunnerLoad, runnerModel, runnerModelFits, runnerSource,
} from './runnerModels.js';

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
  runners = false, runnerVariants = null, storageBase = '',
}) {
  const colours = profile.appearance.hardware;
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
            items={instances.runners}
            profile={profile}
            colour={colours.bracket}
            variants={runnerVariants}
            storageBase={storageBase}
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
function Pieces({ count, place, colour, roughness = 0.35, metalness = 0.75, children }) {
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
    <instancedMesh ref={ref} args={[undefined, undefined, count]} userData={{ ccNoBounds: true }}>
      {children}
      <meshStandardMaterial color={colour} roughness={roughness} metalness={metalness} />
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
 */
function CarcassHinges({ items, profile, colour }) {
  const H = profile.hardware.hinge;

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

  return (
    <>
      <Pieces count={items.length} place={placeArm} colour={colour}>
        <boxGeometry args={[mm(H.armWidth), mm(H.armThickness), mm(H.armLength)]} />
      </Pieces>
      <Pieces count={items.length} place={placePlate} colour={colour}>
        <boxGeometry args={[mm(H.plateThickness), mm(H.plateWidth), mm(H.plateLength)]} />
      </Pieces>
    </>
  );
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
  items, profile, colour, variants = null, storageBase = '',
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
      url: entry ? runnerModelUrl(entry, profile, storageBase) : null,
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

  const plain = useMemo(() => items.filter((_, i) => !models[i]), [items, models]);

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

  return (
    <>
      {/* The model, standing on the drilled row: x is the face of the panel it
          is screwed to, y is the row itself, z is the back of the box. */}
      {models.map((model, i) => (model ? (
        <primitive
          // eslint-disable-next-line react/no-array-index-key -- the row IS the identity
          key={`m${i}`}
          object={model}
          position={[mm(items[i].x), mm(items[i].y), mm(items[i].z)]}
        />
      ) : null))}

      {/* The upright face. Its LENGTH is a per-instance scale, so one geometry
          serves a 390 mm runner and a 690 mm one. */}
      <Pieces count={plain.length} place={placeFace} colour={colour} metalness={0.7}>
        <boxGeometry args={[mm(R.profileThickness), mm(R.profileHeight), 1]} />
      </Pieces>
      <Pieces count={plain.length} place={placeFlange} colour={colour} metalness={0.7}>
        <boxGeometry args={[mm(R.flangeDepth), mm(R.profileThickness), 1]} />
      </Pieces>
    </>
  );
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
