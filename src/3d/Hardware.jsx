import {
  useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mm } from './constants.js';
import { runnerEntry, runnerModelSrc } from '../engine/runners.js';
import { hingeModelSrc } from '../engine/hinges.js';
import { clearHardwareSurface, reportHardware } from './hardwareRegistry.js';
import {
  onRunnerLoad, runnerModel, runnerModelFits, runnerSource,
} from './runnerModels.js';
import {
  foldMemberB, hingeMembers, hingeModel, hingeModelFits, hingeSource, onHingeLoad,
  rigHidesBody,
} from './hingeModels.js';
import { shelfSupportMetal } from './hardwareFinish.js';
// Turn 31 (CLAUDE.md F7): the catchment around every handle and hinge.
import HoverAura from './HoverAura.jsx';

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
// ─── TURN 23 (CLAUDE.md F2.1): THE MOUNTING IS SPLIT ───────────────────────
//
// `onEditHinge` is no longer taken here. The gesture rides the hinge's ARM, and
// the arm went to the DOOR with the rest of the body — so `<DoorHinges>` takes
// it where the door is rendered (3d/UnitView.jsx, and the cabinet editor). What
// is left in this component's hinge branch is the PLATE, which is the only half
// screwed to the carcass.
export default function Hardware({
  instances, profile, xray = false, hinges = false,
  runners = false, runnerVariants = null, storageBase = '', drawerSlide = null,
  hingeSpecs = null, surface = 'room', scope = '',
  // ─── TURN 28 (CLAUDE.md F5): ONE COLOUR SOURCE FOR THE WHOLE FAMILY ──────
  // Turn 25 handed this component the chosen METAL ID and let it resolve the
  // numbers; `3d/DrillRings.jsx` resolved its own, off its own table, with its
  // own fallback — so an untouched project drew silver collars round gold
  // sleeves. The DESIGN comes in now and `shelfSupportMetal` is the one place
  // the answer is worked out, for the sleeve, the pin and the collar alike.
  design = null,
  // Turn 24 took every leaf's signed opening angle here, so the hinge's CARCASS
  // half could fold after the door it belonged to. Turn 29 (CLAUDE.md F5) moved
  // that half INTO the leaf's own group, where the angle already is — so the
  // prop is gone rather than left as a wire nothing pulls.
}) {
  const colours = profile.appearance.hardware;
  const shelfMetal = shelfSupportMetal(design, profile);
  // ─── TURN 21 (CLAUDE.md R4 / F2.2 / F6.3) ───
  // What this surface mounted goes with this surface. A window that closes
  // stops claiming to be showing anything.
  useEffect(() => () => clearHardwareSurface(surface), [surface]);
  return (
    <group userData={{ ccHardware: true }}>
      <Legs items={instances.legs} profile={profile} colour={colours.leg} />
      {/* ─── Turn 30 (CLAUDE.md F16): "BOM + visual" ──────────────────────
          The SPACE a bought mechanism occupies, on the kits that ask for one.
          It is a PLACEHOLDER and it looks like one: an open, wireframe-thin
          box standing well inside the opening it was measured from, in the
          bracket grey the rest of the bought ironmongery is drawn in. It cuts
          nothing and it is drilled for nothing. */}
      <KitBodies items={instances.kits || []} colour={colours.bracket} />
      {/* ─── Turn 25 (CLAUDE.md F6): the adjustable shelf's sleeves and pins ───
          Always drawn, like the legs and the rail — a fitting a joiner looks
          for, not a workshop overlay. A FIX shelf has no pin holes and so
          contributes nothing, which is the whole feature: one look tells you
          which shelf is which. */}
      <ShelfSupports
        items={instances.shelfSupports || []}
        profile={profile}
        metal={shelfMetal}
      />
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
  // Turn 28 (CLAUDE.md F5 / R4): which member of a family this set is, so a
  // walk can read the MOUNTED material of a sleeve and of a pin by name rather
  // than by counting children.
  member = null,
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
      userData={{ ccNoBounds: true, ...(member ? { ccMember: member } : {}) }}
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
 * WHICH FILE these hinges want, and the clone of it where one has arrived.
 *
 * ─── TURN 23 (CLAUDE.md F2.1): ONE RESOLUTION, TWO PARENTS ─────────────────
 *
 * Until this turn both halves of a hinge were resolved and drawn in one place,
 * on the carcass — which is why the owner's model "hangs closed on the carcass
 * while the door stands open". The two halves are two components now, under two
 * different parents, and this hook is what stops that being two copies of the
 * loading, the caching, the mirror rule and the degradation story.
 *
 * @param {object} args
 *   items        the hinge instances this caller is drawing
 *   specs        { [door panel id]: the engine's resolution for that door }
 *   kind         'hinge' (the body: cup + arm, on the DOOR) | 'plate' (carcass)
 *   profile, storageBase
 * @returns {{urls:(string|null)[], models:Array<{model:Object3D|null, reason:string|null}>}}
 */
function useHingeModels({
  items, specs, kind, profile, storageBase,
}) {
  // A file arriving is not a state change anything else can see, so this is the
  // one re-render it causes.
  const [arrived, setArrived] = useState(0);

  // ─── TURN 21 (CLAUDE.md F2.1): THE URL, OR NOTHING ───
  // `hingeModelSrc` and not `hingeModelUrl`: a path with no host is not a URL,
  // and turn 20 handed the bare in-bucket path to the loader, which asked the
  // app's own domain for it — the owner's `/hinges/blum/…glb → 404`. Null here
  // is the stand-in path, and no request leaves the page.
  const urls = useMemo(() => items.map((h) => {
    const spec = specs?.[h.panelId] || null;
    if (!spec) return null;
    if (kind === 'plate') {
      return spec.plateFile ? hingeModelSrc({ file: spec.plateFile }, profile, storageBase) : null;
    }
    return spec.file ? hingeModelSrc(spec, profile, storageBase) : null;
  }), [items, specs, kind, profile, storageBase]);

  useEffect(() => {
    const offs = urls.filter(Boolean).map((u) => onHingeLoad(u, () => setArrived((n) => n + 1)));
    return () => { for (const off of offs) off(); };
  }, [urls]);

  const models = useMemo(() => urls.map((url, i) => {
    const h = items[i];
    if (!url) return { model: null, reason: 'no-url' };
    const source = hingeSource(url);
    if (source?.failed) return { model: null, reason: 'failed' };
    if (!source?.loaded) return { model: null, reason: 'loading' };
    if (!hingeModelFits(source, profile)) return { model: null, reason: 'wrong-size' };
    const C = profile.hardware.hinge.cliptop;
    // The body file is authored for ONE hand (profile: `fileHand`); the other
    // hand is the same clone mirrored about the cup — the runners' own rule,
    // and the mirror pivot IS the cup because the measured origin put it there.
    // The plate's base grows +x off the panel face as authored, so a door whose
    // opening lies the other way (dir −1) takes the mirrored clone.
    const mirror = kind === 'plate' ? h?.dir === -1 : h?.side !== C.fileHand;
    const args = {
      profile,
      plate: kind === 'plate',
      mirror,
      // Turn 23 (CLAUDE.md F4.1): the project's finish, per door, off the
      // very resolution the BOM orders by — so the metal on screen and the
      // article on the list cannot be two different finishes.
      finish: specs?.[h?.panelId]?.finish || null,
    };
    // ─── TURN 24 (CLAUDE.md F1): WHICH HALF OF THE HINGE THIS IS ───────────
    //
    // The plate is one file and is never split. The BODY file is cut in two by
    // node name — member A clips into the door, member B stays on the carcass
    // and folds — and each caller asks for its own half. With the rig OFF the
    // owner's fallback applies: `cup` is the WHOLE model again, exactly as
    // turn 23 drew it, and there is no member B at all.
    if (kind === 'cup' || kind === 'body') {
      const rigged = Boolean(C.rig?.enabled);
      if (!rigged) {
        return kind === 'cup'
          ? { model: hingeModel(url, args), reason: null }
          : { model: null, reason: 'rig-off' };
      }
      const members = hingeMembers(url, args);
      const model = kind === 'cup' ? members.cup : members.body;
      return { model, reason: model ? null : 'no-member' };
    }
    return { model: hingeModel(url, args), reason: null };
    // `arrived` is the dependency that matters: a clone taken before the file
    // lands holds nothing, so it has to be re-taken after it does.
  }), [urls, items, specs, kind, profile, arrived]);

  return { urls, models };
}

/**
 * The CARCASS half: the mounting plate, and only the plate.
 *
 * ─── TURN 23 (CLAUDE.md F2.1): THE BODY LEFT ───────────────────────────────
 *
 * Owner: "the model hangs closed on the carcass while the door stands open.
 * Looks awful, and it is wrong." It was: the cup, the arm and the whole
 * downloaded body were drawn here, in the unit's static frame, while the door
 * they are clipped into swung away from them.
 *
 * The split is physical and it is the phase. A CLIP top's plate is screwed to
 * the side panel and never moves; everything else is clipped into the door and
 * goes wherever the door goes. So this component is the plate, `DoorHinges`
 * below is the body, and the joint READS when a door opens because the two
 * halves separate exactly as the ironmongery does.
 *
 * ─── TURN 19 (CLAUDE.md F1.6): THE MANUFACTURER'S OWN GEOMETRY ─────────────
 *
 * Where the model has ARRIVED it is drawn, one clone per position; where it has
 * not (the file still on its way, a bucket that is down, mock mode, a file that
 * measures far too big) the row falls through to the INSTANCED GREY BODY this
 * file has drawn since turn 7. Never a hole, never a blocked scene.
 *
 * THE MODEL IS A COSTUME ON THE SCREWS. Every position is the engine's —
 * `hardwareInstances` reads `drillSummary.hinge_centers`, the rows the machine
 * drills — and the models are moved to them. Nothing about a downloaded file
 * can move a hole, which is why this turn's CNC export has zero hardware
 * deltas.
 */
function CarcassHinges({
  items, profile, colour, specs = null, storageBase = '',
  surface = 'room', scope = '',
}) {
  const H = profile.hardware.hinge;
  const { urls, models } = useHingeModels({
    items, specs, kind: 'plate', profile, storageBase,
  });
  // ─── TURN 29 (CLAUDE.md F5): MEMBER B MOVED NEXT DOOR ─────────────────────
  //
  // Turn 24 drew the arm here, in the CARCASS's frame, and folded it forward by
  // the leaf's angle. With the knuckle measured it is possible to say what that
  // cost: the leaf turns about its own hinge line, so member A's pin travelled
  // on an arc and member B's — the centre of its own rotation — did not, and by
  // 110° the two halves of one hinge stood 25 mm apart.
  //
  // The arm rides the LEAF now and turns BACK through the same angle, which
  // keeps its world orientation the carcass's (it does not swing out with the
  // door — turn 23's fault) and keeps the knuckle a single point (turn 24's).
  // It is drawn by `<DoorHinges>` below, beside the cup it is jointed to.
  // Everything else about this component is what it was: the PLATE, screwed to
  // the side panel, which is the one piece of a CLIP top that never moves.

  // ─── TURN 26 (CLAUDE.md F1.3): WHICH LEAF THIS HINGE BELONGS TO ──────────
  //
  // A DIAGNOSTIC, and the reason it exists is the no-pierce guarantee. A room
  // with six cabinets in it has sixty hinge members in one scene graph, and
  // "no part of THE HINGE crosses THE DOOR's outer face" is a claim about one
  // leaf and its own three. Without this the acceptance walk would be
  // measuring the cabinet next door and calling it a pierce. Stamped on the
  // clone rather than passed as a prop because `<primitive>` hands the object
  // straight to three and a `userData` prop would replace the split's own.
  // Nothing in the app reads it back.
  useEffect(() => {
    models.forEach((m, i) => {
      if (m?.model) m.model.userData.ccHingePanel = items[i]?.panelId ?? null;
    });
  }, [models, items]);

  // ─── TURN 21 (CLAUDE.md R4 / F2.3) ───
  // What the walk is allowed to believe: the exact url string this component
  // handed the loader, and whether the GLB or the stand-in is what is drawn.
  // Turn 23 adds the PARENT, because F2.4 asks the registry to assert both.
  useEffect(() => {
    reportHardware(surface, 'plate', items.map((h, i) => ({
      key: h.panelId ?? i,
      url: urls[i] || null,
      model: Boolean(models[i]?.model),
      reason: models[i]?.reason,
      parent: 'carcass',
      finish: models[i]?.model?.userData?.ccFinish || null,
    })), scope);
  }, [surface, scope, items, urls, models]);

  const drawnModel = models.some((m) => m.model);

  // The plate, screwed to the inner face of the side panel the door hangs from.
  const placePlate = useMemo(() => (i, m) => {
    const h = items[i];
    const x = h.plateX + h.dir * (H.plateThickness / 2);
    put(m, new THREE.Vector3(mm(x), mm(h.y), mm(h.plateZ)));
  }, [items, H.plateThickness]);

  return (
    <>
      {models.map((m, i) => (m.model ? (
        <primitive
          key={`pm${items[i].panelId}-${items[i].y}`}
          object={m.model}
          position={[mm(items[i].plateX), mm(items[i].y), mm(items[i].plateZ)]}
        />
      ) : null))}
      <Pieces count={items.length} place={placePlate} colour={colour} visible={!drawnModel}>
        <boxGeometry args={[mm(H.plateThickness), mm(H.plateWidth), mm(H.plateLength)]} />
      </Pieces>
    </>
  );
}

/**
 * Member B, folding BACK through its door's own angle (turn 24 F1.2; turn 29
 * CLAUDE.md F5).
 *
 * The easing is the DOOR's own — `3d/UnitView.jsx MovingPanel` settles at
 * `delta × 8` towards its target — because the two halves of one hinge must
 * arrive together. Copying the constant would be two numbers that could drift,
 * so the target comes from the same place the door's does (the open fraction
 * times the leaf's swing) and only the integration happens here.
 *
 * Since turn 29 this object is a child of the LEAF, so the easing matters twice
 * over: the group it sits in is being eased by `MovingPanel` at the same rate,
 * and a fold that lagged its own parent would show as an arm scissoring open
 * and shut on every click. Same rate, same target, arrives together.
 */
function HingeBody({
  object, profile, position, angle,
}) {
  const at = useRef(0);
  useFrame((_, delta) => {
    const target = Number(angle) || 0;
    if (Math.abs(at.current - target) < 0.0005) at.current = target;
    else at.current += (target - at.current) * Math.min(1, delta * 8);
    foldMemberB(object, profile, at.current);
  });
  return <primitive object={object} position={position} />;
}

// ─── WHICH MODEL EACH DOOR'S HINGES WEAR ────────────────────────────────────
//
// `hingeSpecsFor` moved to `engine/hinges.js` in turn 26 (CLAUDE.md F2.2). It
// is pure — a resolution over the engine's own panels and the catalogue — and
// it had no business living in a `.jsx` file where a node test cannot import
// it, which is exactly why the pair could not assert the MOUNT. Re-exported
// here so every existing caller is unchanged.
export { hingeSpecsFor } from '../engine/hinges.js';

/**
 * The DOOR half: the whole hinge BODY — the ⌀35 cup in its bore, the boss
 * standing proud of it, and the arm that sweeps out into the carcass opening.
 *
 * Rendered INSIDE the door's own group (3d/UnitView.jsx and the cabinet
 * editor), so every part of it swings with the door. `pivot` is that group's
 * origin in cabinet millimetres, because a child of it is positioned relative
 * to it and the hinge instances are in the cabinet's frame like every other
 * number in this file.
 *
 * ─── TURN 23 (CLAUDE.md F2): IT SWINGS WITH ITS DOOR ───────────────────────
 *
 * Owner: "the model hangs closed on the carcass while the door stands open."
 * Turn 12 got the PROCEDURAL half of this right — the cup and the boss have
 * been children of the door since then — and turn 19 then hung the downloaded
 * BODY on the carcass beside them, where it stayed shut while the door opened.
 * The body is here now, under the leaf, and the plate is the only thing left on
 * the carcass. The pose itself is untouched: the chat hotfix's `modelOrigin`
 * puts the cup centre on the drilled point with the flange plane on the door's
 * back face, and re-parenting does not move a millimetre of that — the point it
 * is placed on is simply expressed in the door's frame instead of the unit's.
 *
 * ARTICULATION, honestly scoped (turn 23, F2.2). The body followed the leaf
 * RIGIDLY: the cup stayed in its bore and the arm swept with the door. A real
 * CLIP top folds at its knuckle as it opens, so at 110° the arm lies along the
 * carcass side rather than square off the door. THAT IS A RIG, NOT A TRANSFORM
 * — it needs the model split at the knuckle and a joint angle driven off the
 * swing — and turn 23 named it as future work rather than approximating it.
 *
 * ─── TURN 24 (CLAUDE.md F1): THE RIG IS BUILT, AND THIS IS ITS DOOR HALF ───
 *
 * The owner's verdict on the rigid body was that it must BREAK in the middle.
 * It does: `3d/hingeModels.js` cuts the clone in two by NODE NAME, this
 * component draws MEMBER A — the cup, its flange, the clip cap and the link
 * cover, the pieces clipped into the leaf — and `CarcassHinges` draws MEMBER B
 * beside the plate and folds it after the door. The joint is ONE hinge standing
 * in for Blum's seven-link cross, and it says so where it is applied.
 *
 * With `profile.hardware.hinge.cliptop.rig.enabled` FALSE this component is
 * turn 23's again, undivided — and hides the model beyond ~15° instead, which
 * is the owner's own fallback (F1.4).
 *
 * The open/close animation is the door's own `openFronts` value. Nothing in
 * this file drives it (F2.3).
 *
 * ─── AND THE BLACK CYLINDER (F3) ───────────────────────────────────────────
 *
 * Owner's screenshot: "a black drum floating beside each hinge." It is the
 * `boss` below — this app's OWN ⌀33 × 16 procedural cylinder, in the dark
 * hardware tone `appearance.hardware.hinge`, drawn on top of the downloaded
 * model because turn 19 gated the arm and the plate on "is a model drawn" and
 * never gated these two. See `verify/t23/hinge-meshes.md` for the mesh tables
 * that rule out the alternative (a stray cam or cover mesh in the file itself).
 * They are gated now, exactly as their neighbours are.
 *
 * @param {object} props
 *   items   the hinge instances belonging to THIS door
 *   pivot   [x, y, z] in THREE units — the door group's origin
 *   specs   the engine's per-door hinge resolution, for the model and finish
 */
export function DoorHinges({
  items, profile, colour, pivot, specs = null, storageBase = '',
  surface = 'room', scope = '', onEditHinge = null, openDeg = 0,
  // ─── TURN 29 (CLAUDE.md F5) ───
  // The leaf's own SIGNED opening angle, in radians — `dir × open × swing`, the
  // very expression `MovingPanel` integrates. Member B folds BACK through it,
  // which is what keeps the arm at the carcass's angle while it rides the leaf.
  swing = 0,
}) {
  const H = profile.hardware.hinge;
  // ─── TURN 24 (CLAUDE.md F1.1): MEMBER A ───────────────────────────────────
  // The cup, its flange, the clip cap and the link cover — the pieces that are
  // clipped INTO the door. With the rig switched off this is the whole model
  // again, exactly as turn 23 drew it (F1.4).
  const { urls, models } = useHingeModels({
    items, specs, kind: 'cup', profile, storageBase,
  });
  // ─── TURN 29 (CLAUDE.md F5): …AND MEMBER B, BESIDE IT ─────────────────────
  //
  // The arm and the rear body. Turn 24 drew them in the CARCASS's frame and
  // turned them FORWARD by the leaf's angle; with the knuckle measured, that
  // rig can be checked, and it fails the check — the leaf turns about its own
  // hinge line, so member A's pin travels on an arc while member B's stands
  // still, and at 110° the two halves of one hinge are 25 mm apart.
  //
  // They are jointed at the pin, so they are drawn in ONE frame and jointed
  // there: member B rides the leaf on the same drilled point member A stands
  // on, and `foldMemberB` turns it back through the leaf's own angle. The
  // knuckle is then a single point by construction and the arm keeps the
  // carcass's orientation — at 110° it lies along the side panel rather than
  // standing square off the door, which is what a CLIP top does.
  const { models: bodies } = useHingeModels({
    items, specs, kind: 'body', profile, storageBase,
  });

  // Turn 26 (CLAUDE.md F1.3): which LEAF each cup belongs to, for the same
  // reason member B carries it — a no-pierce claim is about ONE door and its
  // own hinges, and a room full of cabinets is a scene full of everyone's.
  useEffect(() => {
    for (const list of [models, bodies]) {
      list.forEach((m, i) => {
        if (m?.model) m.model.userData.ccHingePanel = items[i]?.panelId ?? null;
      });
    }
  }, [models, bodies, items]);
  // …and the other half of F1.4: with the flag off, an opening door HIDES the
  // model beyond ~15° and shows the plate only. A wrong pose held on screen is
  // worse than an honest absence, and this is the owner's own fallback.
  const hidden = rigHidesBody(profile, openDeg);

  // Turn 21 (R4) / turn 23 (F2.4): the same report the plate makes, and it
  // names its PARENT — which is the whole of F2 stated as a fact the walk can
  // assert instead of a picture it has to believe.
  useEffect(() => {
    reportHardware(surface, 'hinge', items.map((h, i) => ({
      key: h.panelId ?? i,
      url: urls[i] || null,
      model: Boolean(models[i]?.model) && !hidden,
      reason: hidden ? 'rig-off-hidden' : models[i]?.reason,
      parent: 'door',
      // Turn 24 (F1.5): which MEMBER this row is. `null` is the rig-off answer
      // and it is not a gap — it says the model is the undivided turn-23 one.
      member: profile.hardware.hinge.cliptop.rig?.enabled ? 'A' : null,
      nodes: models[i]?.model?.userData?.ccHingeMemberNodes || null,
      finish: models[i]?.model?.userData?.ccFinish || null,
      // Turn 29 (F5): where this hinge's knuckle is, in the clone's own
      // millimetres, and which hand it is — so a walk can put the point into
      // the room for BOTH members and check that they are one point.
      pivotMm: models[i]?.model?.userData?.ccHingePivotMm || null,
      mirror: models[i]?.model?.userData?.ccHingeMirror ?? null,
    })), scope);
  }, [surface, scope, items, urls, models, hidden, profile]);

  // Turn 24 (F1.5): member B's own row, so the walk can assert the SPLIT off
  // the scene — which member is drawn, under which parent, folded by how much
  // — rather than off a picture of a hinge. Turn 29 (F5): the parent is the
  // DOOR now, and the fold is the leaf's angle turned back.
  useEffect(() => {
    reportHardware(surface, 'hingeBody', items.map((h, i) => ({
      key: h.panelId ?? i,
      url: urls[i] || null,
      model: Boolean(bodies[i]?.model) && !hidden,
      reason: hidden ? 'rig-off-hidden' : bodies[i]?.reason,
      parent: 'door',
      member: 'B',
      nodes: bodies[i]?.model?.userData?.ccHingeMemberNodes || null,
      pivotMm: bodies[i]?.model?.userData?.ccHingePivotMm || null,
      mirror: bodies[i]?.model?.userData?.ccHingeMirror ?? null,
      fold: bodies[i]?.model?.userData?.ccHingeFold ?? null,
    })), scope);
  }, [surface, scope, items, urls, bodies, hidden]);

  const drawnModel = models.some((m) => m.model);

  const local = (x, y, z) => new THREE.Vector3(
    mm(x) - pivot[0], mm(y) - pivot[1], mm(z) - pivot[2],
  );

  // The arm runs straight back off the cup, into the carcass. It is the pick
  // surface for the hinge modal and nothing else — see the note below.
  const placeArm = useMemo(() => (i, m) => {
    const h = items[i];
    put(m, local(h.x, h.y, h.z - H.armLength / 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, H.armLength, pivot[0], pivot[1], pivot[2]]);

  // ─── Turn 19 (CLAUDE.md F1.3): AND IT CAN BE POINTED AT ───────────────────
  // "Po podwójnym kliknięciu na hinge otworzy się modal." The arm's instanced
  // mesh carries the gesture, because it is the piece a joiner is actually
  // looking at when a door is open; where a MODEL is drawn over it the arm
  // stays as a transparent pick surface underneath, so the hinge is clickable
  // whether or not the bucket answered. It travels with the door now, which is
  // also where the pointer expects to find it once the leaf has swung.
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

  if (!items.length) return null;
  return (
    <>
      {/* The model, standing on the drilled cup point — in the DOOR's frame,
          which is the one line that makes it swing. */}
      {(hidden ? [] : models).map((m, i) => (m.model ? (
        <primitive
          key={`hm${items[i].panelId}-${items[i].y}`}
          object={m.model}
          position={[
            mm(items[i].x) - pivot[0], mm(items[i].y) - pivot[1], mm(items[i].z) - pivot[2],
          ]}
        />
      ) : null))}

      {/* ─── TURN 29 (CLAUDE.md F5): member B, on the SAME drilled point ───
          Placed on the cup and not on the plate: the arm's geometry is authored
          about the cup like the rest of the file, and re-datuming it would be
          inventing an offset. It stands in the LEAF's frame beside member A, so
          the knuckle the two share is one point — and `foldMemberB` turns it
          back through the leaf's own angle, which is what keeps the arm at the
          carcass's attitude while the door swings away from it. */}
      {(hidden ? [] : bodies).map((m, i) => (m.model ? (
        <HingeBody
          key={`hb${items[i].panelId}-${items[i].y}`}
          object={m.model}
          profile={profile}
          position={[
            mm(items[i].x) - pivot[0], mm(items[i].y) - pivot[1], mm(items[i].z) - pivot[2],
          ]}
          angle={swing}
        />
      ) : null))}

      {/* ─── CHAT FIX 14.08.2026: THE STAND-INS ARE GONE — OWNER'S ORDER ───
          "Najlepiej będzie usunąć ten kod ze starymi zawiasami i spokój."
          On his restored projects the old procedural hinge — the black drum's
          cousins, cup cylinder, boss and arm box, drawn since turn 12 — kept
          appearing ON TOP of a correctly loaded GLB. The gate (`visible=
          {!drawnModel}`, turn 23's fix, `verify/t23/hinge-meshes.md` beside
          it) should have stood them down and on his machine did not; rather
          than defend a gate nobody can reproduce misfiring, the stand-ins are
          REMOVED. A hinge is the downloaded model or nothing — the same
          honesty `rigHidesBody` chose for a rig that is off.

          ONE instanced surface remains, permanently invisible: the ARM as the
          double-click PICK target for the hinge modal (turn 19 F1.3). It is
          `visible={false}` by constant, not by gate — there is no state in
          which it is seen. `drawnModel` above still gates nothing visual; it
          is kept for the registry rows, which is what the walk reads. */}
      <Pieces
        count={items.length}
        place={placeArm}
        colour={colour}
        onDoubleClick={pick}
        visible={false}
      >
        <boxGeometry args={[mm(H.armWidth), mm(H.armThickness), mm(H.armLength)]} />
      </Pieces>

      {/* ─── TURN 31 (CLAUDE.md F7): THE CATCHMENT ─────────────────────────
          The arm above is 4 mm of plate and, on a canvas showing a kitchen,
          two pixels. This is the same pick surface at a size a hand can hit —
          the profile's ~8 mm on every side — and it carries the OTHER two
          things F7 asks for: the number, in orange, while the cursor is
          anywhere inside it, and the double-click that opens the hinge's own
          window. The arm keeps its own gesture so nothing that worked before
          stops working. */}
      {items.map((h, i) => (
        <HoverAura
          key={`ha-${h.panelId}-${h.y}`}
          at={[mm(h.x) - pivot[0], mm(h.y) - pivot[1], mm(h.z - H.armLength / 2) - pivot[2]]}
          size={{ w: H.armWidth, h: H.armThickness, d: H.armLength }}
          subject={{ kind: 'hinge', id: `${h.panelId}-${h.y}`, mm: h.y }}
          profile={profile}
          onActivate={onEditHinge ? (e) => onEditHinge({
            panelId: h.panelId,
            index: items.filter((x) => x.panelId === h.panelId).indexOf(h),
            at: { x: e.clientX, y: e.clientY },
          }) : null}
          labelAt={[
            mm(h.x) - pivot[0],
            mm(h.y + 26) - pivot[1],
            mm(h.z) - pivot[2],
          ]}
        />
      ))}
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
    // Turn 23 (CLAUDE.md F4.3): the same override helper the hinges use. The
    // runner finish is a project setting the profile does not yet carry
    // numbers for, so this asks for the default and gets one neutral metal —
    // which is exactly what F4.3 asks for until the owner tunes it.
    return runnerModel(w.url, { mirror: w.mirror, profile, finish: null });
    // `arrived` is the dependency that matters: the clone must be re-taken
    // AFTER the file lands, or it holds nothing (3d/materials.js says the same
    // thing about a texture clone taken too early).
  }), [wanted, items, profile, arrived]);

  // Turn 21 (CLAUDE.md R4 / F6.3): the same report the hinges make, so the
  // walk can tell a MODEL from a stand-in in the editor as well as in the room.
  useEffect(() => {
    reportHardware(surface, 'runner', wanted.map((w, i) => ({
      key: `${w.row.drawer}${w.row.side}`,
      url: w.url,
      model: Boolean(models[i]),
      reason: models[i] ? null : (w.url ? 'no-model' : 'no-url'),
      // A runner is screwed to the box side and rides it; there is no second
      // half on the carcass to distinguish, so the parent is the drawer.
      parent: 'drawer',
      finish: models[i]?.userData?.ccFinish || null,
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
/**
 * ─── TURN 30 (CLAUDE.md F16): THE PLACEHOLDER A MECHANISM STANDS IN ────────
 *
 * A pull-out bin is bought, not cut, and this repo holds no drawing of one. So
 * what is drawn is the SPACE it takes — `engine/hardware3d.js kitInstances`,
 * measured off the same opening the BOM line is specified by — as four thin
 * walls and a floor, open at the top.
 *
 * It is deliberately not a bin. It is the room for one, and a joiner reading
 * the picture sees a volume rather than a product he might try to order from.
 */
function KitBodies({ items, colour }) {
  if (!items.length) return null;
  const T = 6;                       // the placeholder's own wall, in mm
  return items.map((k) => {
    const walls = [
      // floor, back, front, left, right — in the cabinet's own frame
      { x: k.w / 2, y: T / 2, z: k.d / 2, w: k.w, h: T, d: k.d },
      { x: k.w / 2, y: k.h / 2, z: T / 2, w: k.w, h: k.h, d: T },
      { x: k.w / 2, y: k.h / 2, z: k.d - T / 2, w: k.w, h: k.h, d: T },
      { x: T / 2, y: k.h / 2, z: k.d / 2, w: T, h: k.h, d: k.d },
      { x: k.w - T / 2, y: k.h / 2, z: k.d / 2, w: T, h: k.h, d: k.d },
    ];
    return (
      <group
        key={k.role}
        position={[mm(k.x), mm(k.y), mm(k.z)]}
        userData={{ ccKitBody: k.role, ccKitPlaceholder: true, ccNoBounds: true }}
      >
        {walls.map((p, i) => (
          <mesh
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            position={[mm(p.x), mm(p.y), mm(p.z)]}
          >
            <boxGeometry args={[mm(p.w), mm(p.h), mm(p.d)]} />
            <meshStandardMaterial
              color={colour}
              roughness={0.7}
              metalness={0.1}
              transparent
              opacity={0.45}
            />
          </mesh>
        ))}
      </group>
    );
  });
}

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

// ─── HANDLES (turn 25, CLAUDE.md F4.3) ──────────────────────────────────────
//
// "Procedural, GOLD for now — a round bar on two posts, a hemispherical knob.
// Catalogue models arrive later by the bucket route; the mount point and axis
// are already the contract."
//
// So this draws the two shapes and reports the contract. What a bought model
// will replace is the GEOMETRY and nothing else: it arrives at
// `handle.x, handle.y` on the front's own face, along `handle.axis`, and it is
// the engine (`engine/handles.js`) that decides both — exactly as a hinge's
// downloaded body arrives at the cup the engine drilled.
//
// It hangs off the FRONT's own swinging group (3d/UnitView.jsx passes it as a
// child), so a handle on an open door is on the open door and not left in the
// air where the door used to be — the same mistake turn 12 found in the cup.

/**
 * One handle on one front.
 *
 * @param {object} props
 *   panel    the front's engine record — `meta.handle` is the contract
 *   pivot    the group's own origin in scene units, backed out so the handle
 *            can be placed in the cabinet's millimetres like everything else
 */
export function FrontHandle({
  panel, profile, pivot, surface = 'room', scope = '',
}) {
  const spec = panel?.meta?.handle || null;
  const metal = profile.appearance.metals[profile.handles.finish]
    || profile.appearance.metals.gold;

  useEffect(() => {
    if (!spec) return;
    // R4/R8: what the SCENE mounted, in the app's own registry. A procedural
    // piece has no url and says so — `model: false` with a reason, exactly as a
    // hinge that fell back to its stand-in does — so the walk can tell a handle
    // that is drawn from one that is merely configured.
    reportHardware(surface, 'handle', [{
      key: panel.id,
      url: null,
      model: false,
      reason: 'procedural',
      parent: 'front',
      finish: profile.handles.finish,
      member: spec.type,
      pivotMm: [spec.x, spec.y],
    }], scope || panel.id);
  }, [spec, panel?.id, profile.handles.finish, surface, scope]);

  if (!spec || !panel?.box) return null;

  const H = profile.handles;
  const box = panel.box;
  // The front's OUTER face, in the cabinet's own frame — a handle stands proud
  // of the door it is screwed through.
  const faceZ = box.z + box.d;
  // ─── TURN 28 (CLAUDE.md F2): THE CUT FRAME IS THE INSIDE MIRROR ──────────
  //
  // The reference point is in the FRONT's cut frame, whose origin is the
  // leaf's bottom-RIGHT corner with x running LEFT (`engine/joinery.js
  // panelPlacement`) — the door seen from the carcass side, which is how the
  // joiner has it on the bench when he bores it. This read it as a bottom-LEFT
  // frame, so the model stood on the HINGE stile in the room while the sheet
  // said the other one; with F2b's law behind it, one mirror puts both on the
  // free stile. The scene works in the cabinet's frame, so the translation is
  // here and nothing downstream has to know there are two.
  const sheetX = (x) => box.x + box.w - Number(x);
  const wx = sheetX(spec.x);
  const wy = box.y + spec.y;

  const at = (x, y, z) => [mm(x) - pivot[0], mm(y) - pivot[1], mm(z) - pivot[2]];
  const material = (
    <meshStandardMaterial color={metal.colour} metalness={metal.metalness} roughness={metal.roughness} />
  );

  if (spec.type === 'knob') {
    const r = H.knob.diameter / 2;
    const stem = H.knob.standoff;
    return (
      <group userData={{ ccHardware: true, ccHandle: panel.id }}>
        {/* Turn 31 (CLAUDE.md F7): the catchment. A knob is 30 mm across and
            its stem is 8; the box is the knob plus the profile's ~8 on every
            side, and inside it the leaf's own nearest-edge distance shows in
            orange. */}
        <HoverAura
          at={at(wx, wy, faceZ + stem / 2)}
          size={{ w: H.knob.diameter, h: H.knob.diameter, d: stem + r }}
          subject={{ kind: 'handle', id: panel.id, panel }}
          profile={profile}
        />
        <mesh position={at(wx, wy, faceZ + stem / 2)} userData={{ ccNoBounds: true }}>
          <cylinderGeometry args={[mm(H.knob.stemDiameter / 2), mm(H.knob.stemDiameter / 2), mm(stem), 12]} />
          {material}
        </mesh>
        {/* A HEMISPHERE — `thetaLength: π/2` — because that is what a knob is:
            a dome on a stem, flat where it meets the shaft. A full sphere reads
            as a ball on a stick and catches the light in the wrong place. */}
        <mesh
          position={at(wx, wy, faceZ + stem)}
          rotation={[Math.PI / 2, 0, 0]}
          userData={{ ccNoBounds: true }}
        >
          <sphereGeometry args={[mm(r), 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          {material}
        </mesh>
      </group>
    );
  }

  // A BAR: two posts standing off the door, and a rod between them running
  // `overhang` past each post — which is what a bar handle actually is, and
  // what makes the gap a hand goes into.
  const horizontal = spec.axis === 'horizontal';
  const centres = spec.centres || H.defaultCentres;
  const half = centres / 2;
  // The rod is centred on the two SCREWS, wherever the anchor put them.
  const holes = Array.isArray(spec.holes) && spec.holes.length === 2 ? spec.holes : null;
  const midX = holes ? (holes[0][0] + holes[1][0]) / 2 : spec.x;
  const midY = holes ? (holes[0][1] + holes[1][1]) / 2 : spec.y;
  // The screw holes are in the same cut frame as the reference, so they take
  // the same mirror (F2).
  const postAt = holes
    ? holes.map(([hx, hy]) => [sheetX(hx), box.y + hy])
    : [[wx, wy], [wx, wy]];
  const rodLen = centres + 2 * H.bar.overhang;

  return (
    <group userData={{ ccHardware: true, ccHandle: panel.id }}>
      {/* Turn 31 (CLAUDE.md F7): the catchment, round the WHOLE bar rather
          than round one post — "no more pixel-hunting a thin rail" is a rail
          you can point anywhere along. */}
      <HoverAura
        at={at(sheetX(midX), box.y + midY, faceZ + H.bar.standoff)}
        size={horizontal
          ? { w: rodLen, h: H.bar.rodDiameter, d: H.bar.standoff + H.bar.rodDiameter }
          : { w: H.bar.rodDiameter, h: rodLen, d: H.bar.standoff + H.bar.rodDiameter }}
        subject={{ kind: 'handle', id: panel.id, panel }}
        profile={profile}
      />
      {postAt.map(([px, py], i) => (
        <mesh
          // eslint-disable-next-line react/no-array-index-key
          key={`post-${i}`}
          position={at(px, py, faceZ + H.bar.standoff / 2)}
          rotation={[Math.PI / 2, 0, 0]}
          userData={{ ccNoBounds: true }}
        >
          <cylinderGeometry args={[mm(H.bar.postDiameter / 2), mm(H.bar.postDiameter / 2), mm(H.bar.standoff), 12]} />
          {material}
        </mesh>
      ))}
      <mesh
        position={at(sheetX(midX), box.y + midY, faceZ + H.bar.standoff)}
        rotation={horizontal ? [0, 0, Math.PI / 2] : [0, 0, 0]}
        userData={{ ccNoBounds: true }}
      >
        <cylinderGeometry args={[mm(H.bar.rodDiameter / 2), mm(H.bar.rodDiameter / 2), mm(rodLen), 14]} />
        {material}
      </mesh>
    </group>
  );
}

// ─── THE EXTRACTOR'S SLOT (turn 31, CLAUDE.md F9) ───────────────────────────
//
// "The extractor itself is HARDWARE: BOM line + GLB slot for when the owner
// uploads a model (the Blum pattern)."
//
// THE BLUM PATTERN, exactly: the app declares the piece to the registry with
// `model: false` and a REASON, so `hardwareHealth` counts it as a family whose
// bucket is empty rather than as a family nobody asked for — which is the
// difference between "the owner has not uploaded it yet" and "this app forgot
// about extractors". The moment a file lands under `hardware/appliances/`, the
// slot resolves and the machine appears; nothing else has to change.
//
// NOTHING IS DRAWN. Not a stand-in, not a grey box: turn 30's own lesson
// (`CHAT FIX 14.08.2026 — the stand-ins are gone`) is that a procedural
// pretend-piece is worse than an empty aperture, because an empty aperture is
// honest about what the app knows. And NOT ONE HOLE goes with it (rule 2):
// every make of extractor fixes differently and this repo has no published
// pattern for any of them.

/**
 * @param {object} props
 *   unitId    which cabinet's aperture this is
 *   aperture  { w, h, d } in mm — what the BOM ordered against
 */
export function Extractor({
  unitId, aperture, surface = 'room', scope = '',
}) {
  useEffect(() => {
    if (!aperture) return;
    reportHardware(surface, 'extractor', [{
      key: unitId,
      url: null,
      model: false,
      reason: 'no model uploaded yet',
      parent: 'carcass',
      member: 'extractor',
      spec: aperture,
    }], scope || unitId);
  }, [unitId, aperture?.w, aperture?.h, aperture?.d, surface, scope]);
  // The aperture is the geometry. There is nothing else to draw until there is
  // a file to draw it from.
  return null;
}

// ─── THE ADJUSTABLE SHELF'S BRASS (turn 25, CLAUDE.md F6) ───────────────────
//
// Owner: he wants to SEE gold or silver sleeves — and they are the ⌀7.5 this
// engine has drilled since turn 1, not a new 5 mm system.
//
// Two pieces per support and a joiner buys them as one: the SLEEVE, a knock-in
// collar lining the hole, and the PIN — the "spon" — that goes into it and that
// the shelf rests on. The sleeve is what shows when the shelf is out, and it is
// what he is asking to see.
//
// ALWAYS VISIBLE, like the legs and the rail: this is a fitting a joiner looks
// for, not a workshop overlay. A FIX shelf contributes nothing at all, because
// it has no pin holes for `shelfSupportInstances` to find — and that visual
// difference IS the feature (F6.2).

/**
 * @param {object} props
 *   items   `hardwareInstances(result, profile).shelfSupports`
 *   metal   one entry of `profile.appearance.metals`
 */
export function ShelfSupports({ items, profile, metal }) {
  const S = profile.hardware.shelfPin;

  // Every support points INTO the cabinet off the board it is knocked into, and
  // a cylinder is modelled up its own y — so the quaternion is the one that
  // takes +y onto that normal. Both side panels are ±x, so this is a quarter
  // turn about z in one direction or the other; written as a general rotation
  // so a support in a PARTITION or a back panel needs no second case.
  const placeAt = (offset, length) => (i, m) => {
    const it = items[i];
    const n = new THREE.Vector3(it.normal[0], it.normal[1], it.normal[2]).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    const at = new THREE.Vector3(
      mm(it.x) + n.x * mm(offset),
      mm(it.y) + n.y * mm(offset),
      mm(it.z) + n.z * mm(offset),
    );
    put(m, at, q, new THREE.Vector3(1, mm(length), 1));
  };

  const placeSleeve = useMemo(
    () => placeAt(S.sleeveFlange / 2, S.sleeveFlange),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, S.sleeveFlange],
  );
  // ─── TURN 26 (CLAUDE.md F3.2): THE PART THAT IS IN THE HOLE ───────────────
  //
  // "Sleeves and pins mount INSIDE the holes that actually carry a shelf. The
  // hole is the panel's; the sleeve is the hardware's."
  //
  // Until this turn there was no hole to be inside — the scene bored none — so
  // the collar was a rim standing on a blank face. The barrel goes the other
  // way along the normal, into the board, and it is never longer than the bore
  // the machine actually cuts (`holeDepth`, read off the record by
  // `engine/hardware3d.js`). Its DIAMETER is the drilling's own, per instance,
  // because a sleeve that did not fit its hole is the parallel idea R10 forbids.
  const placeBarrel = useMemo(
    () => (i, m) => {
      const it = items[i];
      const deep = Math.max(0, Math.min(S.sleeveDepth ?? 0, it.holeDepth ?? S.sleeveDepth ?? 0));
      if (!(deep > 0)) { put(m, new THREE.Vector3(0, -1e6, 0)); return; }
      const n = new THREE.Vector3(it.normal[0], it.normal[1], it.normal[2]).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
      const at = new THREE.Vector3(
        mm(it.x) - n.x * mm(deep / 2),
        mm(it.y) - n.y * mm(deep / 2),
        mm(it.z) - n.z * mm(deep / 2),
      );
      // The unit cylinder is scaled to the HOLE, so one geometry serves a ⌀7.5
      // system and whatever the next workshop drills.
      put(m, at, q, new THREE.Vector3(mm(it.diameter), mm(deep), mm(it.diameter)));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, S.sleeveDepth],
  );
  const placePin = useMemo(
    () => placeAt(S.pinLength / 2, S.pinLength),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, S.pinLength],
  );
  const placeShoulder = useMemo(
    () => placeAt(S.pinLength - S.shoulderThickness / 2, S.shoulderThickness),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, S.pinLength, S.shoulderThickness],
  );

  if (!items.length) return null;
  const r = (d) => mm(d / 2);
  return (
    <group userData={{ ccHardware: true, ccShelfSupports: items.length }}>
      {/* The barrel, INSIDE the bore the machine cuts (F3.2). Unit-sized and
          scaled per instance to the hole's own diameter, so the fitting can
          never be a different size from the hole it lines. */}
      <Pieces
        count={items.length}
        member="shelf-sleeve-barrel"
        place={placeBarrel}
        colour={metal.colour}
        metalness={metal.metalness}
        roughness={metal.roughness}
      >
        <cylinderGeometry args={[0.5, 0.5, 1, 16]} />
      </Pieces>
      {/* …and its RIM, on the face — the piece that shows when the shelf is
          out, and what the owner is asking to see. */}
      <Pieces
        count={items.length}
        member="shelf-sleeve"
        place={placeSleeve}
        colour={metal.colour}
        metalness={metal.metalness}
        roughness={metal.roughness}
      >
        <cylinderGeometry args={[r(S.sleeveOuter), r(S.sleeveOuter), 1, 16]} />
      </Pieces>
      {/* The pin the shelf rests on. */}
      <Pieces
        count={items.length}
        member="shelf-pin"
        place={placePin}
        colour={metal.colour}
        metalness={metal.metalness}
        roughness={metal.roughness}
      >
        <cylinderGeometry args={[r(S.pinDiameter), r(S.pinDiameter), 1, 12]} />
      </Pieces>
      {/* …and its little shoulder, so the board is seen to be standing ON
          something rather than floating beside a peg. */}
      <Pieces
        count={items.length}
        member="shelf-pin-shoulder"
        place={placeShoulder}
        colour={metal.colour}
        metalness={metal.metalness}
        roughness={metal.roughness}
      >
        <cylinderGeometry args={[r(S.shoulderDiameter), r(S.shoulderDiameter), 1, 12]} />
      </Pieces>
    </group>
  );
}
