import * as THREE from 'three';
import { mm } from './constants.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { cncRect, notchedOutline, socketNotches, tabOutlines } from '../engine/socketFace.js';
// Turn 46 (F6a): the ONE cut, imported — never a second diagonal in the scene.
import { slopeCutActive, trimOutlineOnSlope } from '../engine/puzzle.js';
import { panelPlacement } from '../engine/joinery.js';
import { panelRecesses, recessKey } from '../engine/recesses.js';

// ─── The board with the joint cut into it (turn 11, CLAUDE.md F6) ───────────
//
// Turn 8 drew the joint as LINES lying on the face of a box. Piotr's verdict:
// stop drawing CNC layers, show the joint. So the box goes: a panel that carries
// sockets is extruded from its own machined outline instead, and the socket is a
// real absence in the solid — you can see through it, the light falls into it,
// and the fillet the cutter leaves is on the corner.
//
// Everything about the SHAPE is engine/socketFace.js, which is pure and tested.
// This file does the two things that need three.js: it extrudes the polygon, and
// it puts the result where the box would have been.
//
// ─── COST ───
// CLAUDE.md F6.2 is explicit that the working view must not pay per frame. It
// does not pay per FRAME or even per panel: a geometry is built once per panel
// CONFIGURATION — the part, its rectangle, its notches and the cutter — and
// cached under that key, so a kitchen of fourteen identical 600 mm base units
// builds two side solids in total and every carcass after the first is a cache
// hit. Dragging a unit across the room rebuilds nothing at all: nothing in the
// key is a position.

/** How many distinct panel configurations to keep. */
const CACHE_LIMIT = 240;
const cache = new Map();

/**
 * The machined solid for one panel, or null when the panel is a plain box.
 *
 * Returned geometry is centred on the panel's own box, exactly as a
 * `boxGeometry(w, h, d)` is, so the caller places the mesh unchanged and the
 * bevel shader — which measures a fragment against the object's half-extents —
 * keeps working with no idea anything has changed.
 *
 * @param {object} panel   an engine panel record
 * @param {object} layers  joineryLayers(profile)
 * @param {object} profile
 * @returns {THREE.BufferGeometry|null}
 */
export function machinedPanelGeometry(panel, layers, profile, drills = []) {
  return panelSolids(panel, layers, profile, drills).solid;
}

/**
 * The board AND its cut faces (turn 20, CLAUDE.md F8).
 *
 * Two geometries, because they are two MATERIALS: a cut is raw board and must
 * never wear the decor or the lacquer the faces wear (F8.2). They are built and
 * cached together — one triangulation, one key — because they are two halves of
 * one answer and a cache that could hold one without the other would eventually
 * draw a hole with no wall in it.
 *
 * @returns {{solid:THREE.BufferGeometry|null, cuts:THREE.BufferGeometry|null}}
 *   `solid` is null where the panel is a plain box with nothing cut into it,
 *   which is what tells the caller to use a `boxGeometry` as it always has.
 */
export function panelSolids(panel, layers, profile, drills = []) {
  const placement = panelPlacement(panel);
  if (!placement || !panel?.box) return NOTHING;
  // ─── CHAT-FIX 25.08.2026 (part two): THE ROOF BOARD'S ENDS ARE VERTICAL ──
  //
  // The owner, red pen on both corners: *"katy nie sa poucinane."* His law,
  // 24.08: *"pionowo lico do boku."* The leant board rendered as a rotated
  // BOX, so its ends stood perpendicular to the board and the lower corners
  // poked `G·sin β` past the plumb line at each end. The true section is a
  // PARALLELOGRAM — ends vertical AFTER the lean, which in the board's own
  // level frame means the underside is shifted `G·tan β` toward the LOW end.
  // Its overall run is then `L + G·tan β` — the very `L_MAX` the cut list
  // already prints, so the scene and the sheet finally say one number.
  //
  // Sides' bevel (part one, below) is untouched; a LEVEL top keeps the plain
  // box it has always been.
  if (panel.part === 'TOP' && panel.meta?.tilt_axis === 'z'
    && Number.isFinite(Number(panel.meta?.tilt_deg)) && panel.meta?.tilt_pivot) {
    const bx = panel.box;
    const shear = bx.h * Math.tan(Math.abs(Number(panel.meta.tilt_deg)) * (Math.PI / 180));
    const sign = Number(panel.meta.tilt_pivot.x) >= bx.x + bx.w / 2 ? 1 : -1;
    const key = `ROOF|${bx.w}|${bx.h}|${bx.d}|${shear.toFixed(4)}|${sign}`;
    const hit = cache.get(key);
    if (hit) {
      cache.delete(key);
      cache.set(key, hit);
      return hit;
    }
    const geometry = shearedRoofGeometry(bx, shear * sign);
    applyBoxUVs(geometry, bx);
    geometry.computeBoundingSphere();
    const built = { solid: geometry, cuts: null };
    cache.set(key, built);
    if (cache.size > CACHE_LIMIT) {
      const oldest = cache.keys().next().value;
      const dropped = cache.get(oldest);
      dropped?.solid?.dispose();
      dropped?.cuts?.dispose();
      cache.delete(oldest);
    }
    return built;
  }
  const notches = socketNotches(panel, layers);
  // ─── Turn 12 (CLAUDE.md F6.2): the OTHER half of the joint ───
  // A socket is a POCKET and a TAB is part of the OUTLINE, and turn 11 only
  // read the pockets — so a side panel came out a rectangle and its three tabs
  // went with it. `tabOutlines` reads the outline the LISP actually draws.
  const tabs = tabOutlines(panel);

  const { w, h } = cncRect(panel);
  const thickness = thicknessOf(panel, placement);
  if (!(w > 0) || !(h > 0) || !(thickness > 0)) return NOTHING;
  const radius = Math.max(0, (Number(profile?.cnc?.toolDiameter) || 0) / 2);
  // Turn 46 (F6a): the engine's own cut, or null on every panel that has none.
  // Turn 47 (F1): …and that cut is a LINE now, so the scene clips on the line.
  // `slopeCutActive` reads `pts` where the engine published them and the two
  // ends where it did not, which is the same board either way.
  const slopeCut = panel?.cnc?.slopeCut
    && slopeCutActive({ w, h, ...panel.cnc.slopeCut })
    ? panel.cnc.slopeCut : null;
  // ─── CHAT-FIX 25.08.2026: THE WEDGE, SEEN FROM THE FRONT ─────────────────
  // The owner: *"bur jest nadal prosto ciety a powinien byc po skosie …
  // patrzac od czola."* A side's CNC outline lives in the DEPTH plane and
  // cannot hold the bevel through the 18 mm, so the blank rendered square.
  // The engine now states the top edge at EACH face (`meta.slopeCut.bevel3d`,
  // world heights at the board's two x faces) and the solid tilts its top
  // vertices between them. Sides only, cut only — everything else unchanged.
  //
  // ─── TURN 53 (CLAUDE.md F4): …AND THE GATE WAS DEAD ──────────────────────
  //
  // The owner, 27.08, screenshot in hand: *"zamiast BUL obciąć pod kątem
  // pasującym do wieńca, to się nachodzą materiały na siebie"* — and *"wygląda
  // na to, że cięcia istniejące na BUL i BUR są odwrotnie"*.
  //
  // DIAGNOSED, and it is not a mirrored sign. The chat-fix above required
  // `slopeCut` — `panel.cnc.slopeCut` — and a SIDE NEVER HAS ONE. Its CNC
  // outline is deliberately a square blank (`engine/cabinet.js`: *"a side
  // stands at ONE x across the width and its board is drawn in the DEPTH
  // frame, so the ceiling over it is one number"*), because a three-axis
  // machine cannot cut a bevel and the angle rides the part's record instead.
  // So `slopeCut` was null on every BUL and BUR ever built, `bevel3d` was null
  // with it, and `bevelTopEdge` HAS NEVER RUN. The wedge was never taken off:
  // the blank stood square at the PEAK across its whole 18 mm, proud of the
  // roof line at the low face, and overlapped the board that should lie flat
  // on it. That is the owner's screenshot, and it reads as "the cut is on the
  // wrong side" because the high edge is on BOTH sides.
  //
  // The engine's numbers were right all along and are asserted so in
  // `test/turn53-f4-*`: `bevel3d.a`/`.b` are the roof board's own underside at
  // the board's two faces, and the high one is always on the PEAK side. The
  // law is stated in `reference/lisp/SKYLON_COMMON.lsp SKY:sideBevelFaces`.
  //
  // So the gate is the RECORD, which is the thing that says there is a wedge —
  // never the outline, which by design cannot.
  const bevel3d = (panel.part === 'BUL' || panel.part === 'BUR')
    && panel.meta?.slopeCut?.bevel3d ? panel.meta.slopeCut.bevel3d : null;

  // ─── TURN 20 (CLAUDE.md F8.1): EVERY FEATURE, AS AN ABSENCE ──────────────
  // The SOCKET layer is skipped: turn 11 cuts it out of the outline already,
  // and cutting it twice would punch a hole through a notch.
  //
  // ─── TURN 21 (CLAUDE.md F3): AND IT IS RETIRED, BEHIND A FLAG ────────────
  // The owner saw pilot dots on his door faces and stray dashes inside
  // carcasses and called it: the CNC sheet is the document, the carving is not
  // worth its problems. `profile.appearance.cuts.enabled` is FALSE, so this is
  // an empty list and everything downstream of it — the holes punched in the
  // board's polygon, the cut-face buffer, the cache key — collapses to what it
  // was before turn 20. The NOTCHES and the TABS above are turn 11 and turn 12
  // and are not behind the flag: they are the board's own outline, and a panel
  // whose only feature is a drilling falls back to a `boxGeometry` exactly as
  // it did in turn 19.
  //
  // ─── TURN 26 (CLAUDE.md R10 / F3): AND IT IS BACK ON ─────────────────────
  // The owner's newer and higher law — the sheet is the truth and the scene
  // follows it — outranks the retirement, and the flag ships TRUE. What makes
  // it honest this time is that the depth is real (`engine/recesses.js` reads
  // the record's own, then the workshop's table) and that WHICH classes are
  // bored is a named policy with a reason per class (`engine/machining.js`).
  const recesses = profile?.appearance?.cuts?.enabled
    ? panelRecesses(panel, drills, {
      thickness,
      // Turn 46 (F6a): …and the SHAKER rebate on a CUT leaf. Its pocket is a
      // rectangle whose bounding box reaches past the diagonal, so punching it
      // through a five-sided board is a hole partly outside its own shape —
      // which a triangulator is entitled to refuse. A cut shaker leaf renders
      // as a plain pentagon until a tray exists that can hold five edges.
      skipLayers: [layers?.socket, ...(slopeCut ? [profile?.front?.types?.S?.pocketLayer] : [])],
      profile,
    })
    : [];
  // …and a panel whose ONLY feature is the slope cut is still a shape: a flat
  // cut door has no notch, no tab and no recess, and a `boxGeometry` would
  // render it as the rectangle it is not.
  // T53 (F4): …and a board whose ONLY feature is the WEDGE is a shape too. A
  // side always has tabs, so this never bit — but a gate that depends on
  // another feature being present is exactly the fault F4 is about.
  if (!notches.length && !tabs.length && !recesses.length && !slopeCut && !bevel3d) return NOTHING;

  const key = [
    panel.part,
    w, h, thickness, radius,
    ...notches.map((n) => `${n.edge}:${n.from}:${n.to}:${n.depth}`),
    // The tabs are part of the SHAPE, so two panels that differ only in their
    // tabs must not share a cached solid.
    ...tabs.map((t) => t.map(([x, y]) => `${x},${y}`).join(';')),
    // Two leaves that differ only in where the ceiling cuts them are two
    // different boards, so the cut is part of the key.
    slopeCut
      ? `slope:${(slopeCut.pts || [{ x: 0, y: slopeCut.hL }, { x: w, y: slopeCut.hR }])
        .map((p) => `${p.x},${p.y}`).join(';')}`
      : '',
    // Two sides that differ only in the wedge off their top are two boards.
    bevel3d ? `bevel:${bevel3d.a},${bevel3d.b}` : '',
    recessKey(recesses),
  ].join('|');

  const hit = cache.get(key);
  if (hit) {
    // Touch it: a Map keeps insertion order, so re-inserting is what makes the
    // eviction below least-recently-USED rather than oldest-built.
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }

  const built = build({
    w, h, thickness, radius, notches, tabs, recesses, placement, box: panel.box, slopeCut, bevel3d,
  });
  cache.set(key, built);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    const dropped = cache.get(oldest);
    dropped?.solid?.dispose();
    dropped?.cuts?.dispose();
    cache.delete(oldest);
  }
  return built;
}

const NOTHING = { solid: null, cuts: null };

/**
 * The roof board with VERTICAL ends (chat-fix 25.08.2026, part two).
 *
 * Box-centred like every solid here: x is the board's run, y its perpendicular
 * G, z its depth. The TOP face keeps the box's own [−w/2, w/2]; the UNDERSIDE
 * is shifted by `shift` (signed toward the low end), so after the scene's
 * lean the ends stand plumb — *"pionowo lico do boku."* Non-indexed, so
 * `computeVertexNormals` gives the flat facets a board has.
 */
function shearedRoofGeometry(box, shift) {
  const hw = mm(box.w) / 2;
  const hh = mm(box.h) / 2;
  const hd = mm(box.d) / 2;
  const s = mm(shift);
  // Eight corners: t = top face, b = underside (shifted); L/R ends, F/K front/back.
  const tLF = [-hw, hh, hd]; const tRF = [hw, hh, hd];
  const tLK = [-hw, hh, -hd]; const tRK = [hw, hh, -hd];
  const bLF = [-hw + s, -hh, hd]; const bRF = [hw + s, -hh, hd];
  const bLK = [-hw + s, -hh, -hd]; const bRK = [hw + s, -hh, -hd];
  const quads = [
    [tLF, tRF, tRK, tLK], // top
    [bRF, bLF, bLK, bRK], // underside
    [bLF, bRF, tRF, tLF], // front
    [bRK, bLK, tLK, tRK], // back
    [bLK, bLF, tLF, tLK], // low/left end — vertical after the lean
    [bRF, bRK, tRK, tRF], // high/right end
  ];
  const pos = [];
  for (const [a, b, c, d] of quads) pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * The wedge off a cut side's top, seen from the front (chat-fix 25.08.2026).
 *
 * After `build`'s basis the geometry sits in WORLD axes about the box centre:
 * a side's 18 mm runs along world x, its height along world y. The blank was
 * extruded to the PEAK over its own thickness — `max(a, b)` — so every vertex
 * on that flat top is moved down to the ceiling line at its own face,
 * interpolated through the thickness. `a` is the edge height at `box.x`, `b`
 * at `box.x + box.w`, both from the engine's own record — this function
 * invents no geometry, it only applies the engine's two numbers.
 */
function bevelTopEdge(geometry, box, { a, b }) {
  const pos = geometry.attributes.position;
  const cx = mm(box.x + box.w / 2);
  const cy = mm(box.y + box.h / 2);
  const yTop = mm(box.y + box.h) - cy;
  const x0 = mm(box.x) - cx;
  const span = mm(box.w) || 1;
  const ya = mm(a) - cy;
  const yb = mm(b) - cy;
  const eps = 1e-4;
  for (let i = 0; i < pos.count; i += 1) {
    if (Math.abs(pos.getY(i) - yTop) < eps) {
      const t = Math.min(1, Math.max(0, (pos.getX(i) - x0) / span));
      pos.setY(i, ya + (yb - ya) * t);
    }
  }
  pos.needsUpdate = true;
}

/**
 * How thick the board is along its own normal.
 *
 * Read off the BOX rather than `panel.thickness`, because the box is what the
 * mesh occupies and the two must agree to the millimetre or the solid stands
 * proud of where the panel was.
 */
function thicknessOf(panel, placement) {
  const n = placement.n;
  const box = panel.box;
  if (Math.abs(n[0]) > 0.5) return box.w;
  if (Math.abs(n[1]) > 0.5) return box.h;
  return box.d;
}

function build({
  w, h, thickness, radius, notches, tabs = [], recesses = [], placement, box, slopeCut = null,
  bevel3d = null,
}) {
  const shapeOf = (points) => new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(mm(x), mm(y))));
  const extrudeShape = (shape) => new THREE.ExtrudeGeometry(shape, {
    depth: mm(thickness),
    bevelEnabled: false,
    // The outline already carries its fillets as real points; asking the
    // extruder to re-approximate curves would only add triangles.
    curveSegments: 1,
  });
  const extrude = (points) => extrudeShape(shapeOf(points));

  // ─── TURN 46 (CLAUDE.md F6a): THE SCENE READS THE ENGINE'S OWN CUT ───────
  //
  // *"the cut cabinet renders from the engine's own panels — no scene-side twin
  // geometry."* A board is built here from its rectangle plus its notches, so a
  // panel cut on the slope needs the LINE — and it is the ENGINE's line
  // (`panel.cnc.slopeCut`, in the panel's own drawn frame), clipped by the very
  // function that cut the outline on the sheet. There is no second opinion in
  // this file about where the ceiling is, which is the whole of the F6a claim.
  const outline = trimOutlineOnSlope(notchedOutline({
    w, h, notches, radius,
  }), slopeCut
    ? { w, h, ...slopeCut }
    : { w, h, pts: [{ x: 0, y: h }, { x: w, y: h }] });

  // ─── TURN 20 (CLAUDE.md F8.1): THE MATERIAL IS ACTUALLY GONE ─────────────
  //
  // Every drilling, pocket and groove becomes a HOLE in the board's own
  // polygon, so it is a real absence: you can see into it, the light falls
  // into it, and it is the same absence a dog-bone socket has been since turn
  // 11. A BLIND feature then gets its floor back as a separate cap at the true
  // depth (below), which is what makes 2 mm read as 2 mm rather than as a slot
  // straight through an 18 mm board.
  const board = shapeOf(outline);
  for (const f of recesses) board.holes.push(recessPath(f));

  // The board, and then each tab standing off its edge. They are separate
  // extrusions merged into one buffer rather than one polygon, because a tab
  // that shares an edge with the board is a self-touching outline and the
  // triangulator is entitled to refuse it. Merged, it is still ONE draw call
  // and still one cached geometry per panel configuration.
  const parts = [extrudeShape(board), ...tabs.map((t) => extrude(t))];
  const geometry = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
  if (parts.length > 1) for (const g of parts) g.dispose();

  // ExtrudeGeometry works in the z = 0 plane and extrudes towards +z. The panel
  // lives on a face of its box, so the basis is the placement's own: u and v are
  // the CNC axes, and the extrusion runs INTO the board — the opposite of the
  // outward normal.
  const u = new THREE.Vector3(...placement.u);
  const v = new THREE.Vector3(...placement.v);
  const into = new THREE.Vector3(...placement.n).negate();
  const centre = new THREE.Vector3(
    mm(box.x + box.w / 2), mm(box.y + box.h / 2), mm(box.z + box.d / 2),
  );
  const origin = new THREE.Vector3(...placement.origin.map(mm)).sub(centre);

  const basis = new THREE.Matrix4().makeBasis(u, v, into).setPosition(origin);
  geometry.applyMatrix4(basis);
  // ─── Turn 13 (CLAUDE.md F1): THE TOP FACES THAT WENT MISSING ───
  //
  // Owner's screenshot: looking down into a run of wall units, the tops are
  // half there and the whole thing shimmers. It is ONE line — the basis above —
  // and one panel class.
  //
  // A placement is an orthonormal triple, but nothing ever said WHICH WAY ROUND.
  // Four of the five are right-handed against the extrusion direction
  // (u × v = −n, so (u, v, into) has determinant +1); `panelPlacement`'s BACK
  // case even says so in as many words. TOP is the exception: its u × v is +n,
  // so (u, v, into) is LEFT-handed and `makeBasis` is a REFLECTION. A reflection
  // maps the extruder's counter-clockwise triangles to clockwise ones, so every
  // triangle of a TOP came out wound backwards: the outward faces were
  // back-face culled (missing from above) and the shadow pass drew the board's
  // far side into its own shadow map (the shimmer).
  //
  // It did not show before turn 12 for the same reason the rotated BACK did not:
  // a panel with no tabs was a plain box, and a box has no winding to get wrong.
  //
  // The positions are right either way — only the ORDER is wrong — so the fix
  // is to put the order back, and to do it from the determinant rather than
  // from a list of parts, so the sixth placement someone adds in turn 15 is
  // covered on the day it lands.
  const flipped = u.clone().cross(v).dot(into) < 0;
  if (flipped) reverseWinding(geometry);
  // The wedge comes off HERE — after the basis (vertices are in world axes
  // about the box centre, so the board's 18 mm runs along world x) and before
  // the normals, so the tilted top face shades as the plane it is.
  if (bevel3d) bevelTopEdge(geometry, box, bevel3d);
  geometry.computeVertexNormals();
  // The grain is a CABINET-SPACE rule and must not follow the nesting (F1).
  applyBoxUVs(geometry, box);
  geometry.computeBoundingSphere();

  // ─── TURN 20 (CLAUDE.md F8.2): THE CUT FACES, IN THEIR OWN MATERIAL ──────
  //
  // The hole in the board above is an absence and has no inside. What a joiner
  // sees when he looks into a drilling is the WALL of it and, on a blind one,
  // its FLOOR — and both are raw board. So they are a second geometry, drawn
  // by the caller with `appearance.cutFace` on it: a decor or a sprayed colour
  // must never be painted onto a cut, and one mesh with two materials would
  // have painted the board's own edges grey along with them.
  //
  // ONE buffer for the whole panel, merged and cached with the solid. F8.3
  // asks for instancing so a side panel's eighteen holes are not eighteen draw
  // calls; a merged buffer is ONE, is shared across every identical panel in
  // the project by the same cache key, and needs no per-frame matrix work —
  // which is the same bargain instancing offers, taken further.
  const cuts = buildCuts({
    recesses, thickness, flipped, matrix: basis, box,
  });
  return { solid: geometry, cuts };
}

/** The path a feature cuts out of the board, in scene units. */
function recessPath(f) {
  const path = new THREE.Path();
  if (f.kind === 'round') {
    path.absarc(mm(f.x), mm(f.y), mm(f.r), 0, Math.PI * 2, true);
    return path;
  }
  const x0 = mm(f.x - f.w / 2);
  const x1 = mm(f.x + f.w / 2);
  const y0 = mm(f.y - f.h / 2);
  const y1 = mm(f.y + f.h / 2);
  // Wound the opposite way round from the outline, which is what makes a hole
  // a hole rather than a second island.
  path.moveTo(x0, y0);
  path.lineTo(x0, y1);
  path.lineTo(x1, y1);
  path.lineTo(x1, y0);
  path.closePath();
  return path;
}

/** How many sides a drilled hole is drawn with. */
const HOLE_SEGMENTS = 14;

/**
 * The walls and floors of every recess, as one buffer in the panel's own frame.
 *
 * A THROUGH feature is a wall and nothing else — you see daylight. A BLIND one
 * is a wall down to its true depth and a floor across the bottom of it, and
 * BOTH faces of the floor are drawn: the recess is open from the machined side
 * and the board is solid from the other, so the far side needs a face too or a
 * joiner looking at the back of a hinged door sees into the cup.
 */
function buildCuts({
  recesses, thickness, flipped, matrix, box,
}) {
  if (!recesses.length) return null;
  const positions = [];
  const t = mm(thickness);

  // The extrusion runs from z = 0 (the machined face) to z = t (into the
  // board), so a feature `depth` deep has its floor at z = depth.
  const quad = (a, b, c, d) => { positions.push(...a, ...b, ...c, ...a, ...c, ...d); };

  for (const f of recesses) {
    const deep = f.through ? t : mm(f.depth);
    const ring = [];
    if (f.kind === 'round') {
      for (let i = 0; i < HOLE_SEGMENTS; i += 1) {
        const angle = (i / HOLE_SEGMENTS) * Math.PI * 2;
        ring.push([mm(f.x) + Math.cos(angle) * mm(f.r), mm(f.y) + Math.sin(angle) * mm(f.r)]);
      }
    } else {
      const x0 = mm(f.x - f.w / 2);
      const x1 = mm(f.x + f.w / 2);
      const y0 = mm(f.y - f.h / 2);
      const y1 = mm(f.y + f.h / 2);
      ring.push([x0, y0], [x1, y0], [x1, y1], [x0, y1]);
    }

    // The wall, one quad per segment, from the face down to the floor.
    for (let i = 0; i < ring.length; i += 1) {
      const [ax, ay] = ring[i];
      const [bx, by] = ring[(i + 1) % ring.length];
      quad([ax, ay, 0], [bx, by, 0], [bx, by, deep], [ax, ay, deep]);
    }

    if (f.through) continue;

    // The floor, as a fan about the feature's own centre — and again facing
    // the other way, so the board reads solid from behind.
    const cx = mm(f.x);
    const cy = mm(f.y);
    for (let i = 0; i < ring.length; i += 1) {
      const [ax, ay] = ring[i];
      const [bx, by] = ring[(i + 1) % ring.length];
      positions.push(cx, cy, deep, ax, ay, deep, bx, by, deep);
      positions.push(cx, cy, deep, bx, by, deep, ax, ay, deep);
    }
  }

  if (!positions.length) return null;
  const cuts = new THREE.BufferGeometry();
  cuts.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  cuts.applyMatrix4(matrix);
  if (flipped) reverseWinding(cuts);
  cuts.computeVertexNormals();
  cuts.computeBoundingSphere();
  return cuts;
}

/**
 * Flip every triangle of a non-indexed geometry front-to-back.
 *
 * ExtrudeGeometry emits no index, and `mergeGeometries` of non-indexed inputs
 * emits none either, so a triangle is three consecutive vertices of every
 * attribute and swapping the last two is the whole operation. Indexed geometry
 * is handled too, because a caller should not have to know which it got.
 */
function reverseWinding(geometry) {
  const index = geometry.getIndex();
  if (index) {
    const a = index.array;
    for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; }
    index.needsUpdate = true;
    return;
  }
  for (const attribute of Object.values(geometry.attributes)) {
    const { array, itemSize } = attribute;
    for (let i = 0; i < attribute.count; i += 3) {
      for (let k = 0; k < itemSize; k += 1) {
        const b = (i + 1) * itemSize + k;
        const c = (i + 2) * itemSize + k;
        const t = array[b]; array[b] = array[c]; array[c] = t;
      }
    }
    attribute.needsUpdate = true;
  }
}

/**
 * The UVs a plain BOX of this size would have carried — the third symptom of
 * F1, and the same root.
 *
 * ExtrudeGeometry's own UV generator works in the SHAPE's plane, so a machined
 * panel's texture axes became the CNC axes. For most parts that is harmless
 * because the two agree; for a part that is NESTED TURNED it is not, and the
 * owner saw it immediately: a TOP is drawn with its CNC x along the cabinet's
 * DEPTH (joinery.js, and that is machining truth), so from turn 12 every top
 * and bottom in the app had its figure running front-to-back.
 *
 * THE RULE: the visual grain axis is a CABINET-SPACE rule and owes nothing to
 * how the part is nested. So the UVs are re-derived here from the panel's place
 * in the CABINET — the biggest face of its box, projected exactly the way
 * three.js gives a box its axes (`decorMapping` in engine/decors.js names the
 * convention: ±X → u along Z, v along Y; ±Y → u along X, v along Z; ±Z → u
 * along X, v along Y) and normalised 0..1 over the box, which is the range
 * `decorPlacement`'s repeats are written against.
 *
 * Then the piece's grain runs where the CABINET says it runs, whichever way the
 * sheet nester turned it — and `decorMapping`, which has always assumed the
 * box's axes, is telling the truth again.
 *
 * ─── TURN 29 (CLAUDE.md F1): AND THE FACE IT PICKS IS THE ONE THAT MATTERS ──
 *
 * The face pick and the axis pair here are `decorMapping`'s own, deliberately
 * duplicated in the two frames one answer has to be true in — the UVs of the
 * mesh, and the repeats of the texture laid on them. F1's fault was NOT here:
 * this file and that function have agreed since turn 13, and a shelf's big face
 * has come out ±Y (u along X, v along Z) in both the whole time. What was wrong
 * was WHICH WAY the image was turned onto those axes, and that is one flag in
 * `engine/decors.js`.
 */
function applyBoxUVs(geometry, box) {
  const w = mm(Math.abs(box.w)) || 1;
  const h = mm(Math.abs(box.h)) || 1;
  const d = mm(Math.abs(box.d)) || 1;
  // Which pair of axes: the biggest face wins, as it does in decorMapping. The
  // two edges are 18 mm of board and nobody reads the grain on them.
  const areas = [h * d, w * d, w * h];
  const face = areas.indexOf(Math.max(...areas));
  // [ along-U axis, its extent, along-V axis, its extent ]
  const map = [
    ['z', d, 'y', h],
    ['x', w, 'z', d],
    ['x', w, 'y', h],
  ][face];
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  if (!position || !uv) return;
  const read = { x: (i) => position.getX(i), y: (i) => position.getY(i), z: (i) => position.getZ(i) };
  for (let i = 0; i < uv.count; i += 1) {
    // The solid is centred on its box, so half an extent turns a coordinate
    // into a fraction of the board.
    uv.setXY(
      i,
      read[map[0]](i) / map[1] + 0.5,
      read[map[2]](i) / map[3] + 0.5,
    );
  }
  uv.needsUpdate = true;
}

/** For tests and teardown: drop every cached solid. */
export function clearPanelSolidCache() {
  for (const built of cache.values()) {
    built?.solid?.dispose();
    built?.cuts?.dispose();
  }
  cache.clear();
}

/** How many distinct configurations are being held (the cost check). */
export function panelSolidCacheSize() {
  return cache.size;
}
