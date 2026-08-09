// ─── The 45° mitre, as geometry (turn 8, CLAUDE.md F6) ───
//
// The top infill is an L in section: a face strip standing on the units and a
// shelf running back off the top of it, the two mitred at 45° and glued. The
// engine has said so since turn 6 — `meta.mitre_45` carries the flag and the
// cut list is right — but the 3D drew both strips as plain boxes butted end to
// face. Piotr's verdict: "nie ma opcji, będzie źle wyglądać".
//
// He is right, and it is not only the joint. The four end conditions include
// one where the element TURNS THE CORNER and runs back to the wall, and two
// boxes meeting at a corner do not turn a corner — they overlap by the corner
// square and z-fight through each other. A picture frame is mitred for exactly
// that reason.
//
// So this module cuts the solids. It is pure geometry with no three.js in it,
// which is the point: a 45° plane through a box is arithmetic, and arithmetic
// belongs somewhere it can be checked in node rather than by eye on a screen
// (CLAUDE.md F6 asks for a test on the chamfer's vertices).
//
// ─── WHAT IT DOES NOT DO ───
// Nothing here reaches the cut list. The BOM and the DXF are unchanged: a
// mitred piece is CUT as a rectangle to its long point and the mitre is a
// setting on the saw, which is exactly what `meta.mitre_45` already tells the
// workshop. This is what the piece LOOKS like.
//
// Coordinates are the unit's own millimetres — the frame every `panel.box` is
// already in — so a caller hands over a box and gets back the same solid it
// would have drawn, with the corners taken off.

/** A tolerance in millimetres. Two vertices closer than this are one vertex. */
const EPS = 1e-6;

/**
 * The eight corners and six faces of a box, in absolute unit-local mm.
 * Faces are wound counter-clockwise seen from OUTSIDE, which is what makes the
 * triangles face the right way once this reaches a renderer.
 */
export function boxPolyhedron({ x, y, z, w, h, d }) {
  const x1 = x + w; const y1 = y + h; const z1 = z + d;
  const vertices = [
    [x, y, z], [x1, y, z], [x1, y1, z], [x, y1, z],
    [x, y, z1], [x1, y, z1], [x1, y1, z1], [x, y1, z1],
  ];
  const faces = [
    [4, 5, 6, 7],   // +Z
    [1, 0, 3, 2],   // −Z
    [5, 1, 2, 6],   // +X
    [0, 4, 7, 3],   // −X
    [3, 7, 6, 2],   // +Y
    [0, 1, 5, 4],   // −Y
  ];
  return { vertices, faces };
}

const AXIS = { x: 0, y: 1, z: 2 };

/**
 * The plane of a 45° chamfer on the edge where two faces of a box meet.
 *
 * `axisA`/`signA` name one face ('y', +1 = the top), `axisB`/`signB` the other
 * ('z', −1 = the back), and `size` is how far the cut reaches back along EACH
 * of them. A chamfer of `size` on an edge between two faces takes a right
 * triangle with legs `size` off the section — which at 45° is the only cut
 * whose two legs are equal, and is why a mitre is a mitre.
 *
 * @returns {{n:number[], d:number}} keep the half-space `n · p ≤ d`
 */
export function chamferPlane(box, axisA, signA, axisB, signB, size) {
  const n = [0, 0, 0];
  n[AXIS[axisA]] = signA;
  n[AXIS[axisB]] = signB;
  const far = (axis, sign) => {
    const lo = box[axis];
    const hi = lo + box[{ x: 'w', y: 'h', z: 'd' }[axis]];
    return sign > 0 ? hi : -lo;
  };
  return { n, d: far(axisA, signA) + far(axisB, signB) - size };
}

/**
 * Cut a convex solid with a plane, keeping `n · p ≤ d`.
 *
 * Sutherland–Hodgman on every face, plus the CAP: the polygon the plane leaves
 * behind. Without the cap the solid is open, and an open solid renders as a
 * hole you can see the inside of the cabinet through — which is worse than the
 * butt joint this is replacing.
 *
 * The cap is built by chaining the cut edges each face contributes. Every
 * intersection point is snapped onto a shared vertex list first, because two
 * faces meeting at an edge must produce the SAME point there or the chain has
 * a gap in it and the cap comes out as a fan of slivers.
 */
export function clipPolyhedron(solid, plane) {
  const dist = (v) => plane.n[0] * v[0] + plane.n[1] * v[1] + plane.n[2] * v[2] - plane.d;
  const vertices = [];
  const key = (v) => v.map((c) => Math.round(c / EPS)).join(',');
  const index = new Map();
  const push = (v) => {
    const k = key(v);
    if (index.has(k)) return index.get(k);
    const i = vertices.length;
    vertices.push(v);
    index.set(k, i);
    return i;
  };

  const faces = [];
  const cutEdges = [];
  for (const face of solid.faces) {
    const out = [];
    const n = face.length;
    for (let i = 0; i < n; i += 1) {
      const a = solid.vertices[face[i]];
      const b = solid.vertices[face[(i + 1) % n]];
      const da = dist(a);
      const db = dist(b);
      if (da <= EPS) out.push(push(a));
      if ((da > EPS && db < -EPS) || (da < -EPS && db > EPS)) {
        const t = da / (da - db);
        out.push(push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]));
      }
    }
    // Drop degenerate faces (a face entirely on the plane, or cut to a line).
    const unique = [...new Set(out)];
    if (unique.length >= 3) faces.push(unique);

    // The new edge this face contributes to the cap. Found by looking for the
    // consecutive PAIR of output vertices that lie on the plane, rather than by
    // remembering where the two crossings were — because when the plane passes
    // exactly through a corner of the box there is only one crossing to
    // remember, and the cap then never closes. That is not a corner case here:
    // a 45° chamfer whose size equals the board thickness passes through a
    // corner of every strip it cuts, which is to say through all of them.
    if (unique.length < 3) continue;
    const onPlane = (i) => Math.abs(dist(vertices[i])) <= EPS * 10;
    // A face lying flat ON the plane is not a border of the cap, it IS one
    // (and it has already been dropped as degenerate). Every other face that
    // touches the plane along an edge borders it — INCLUDING one the plane only
    // grazes without removing anything, which is how a chamfer as deep as the
    // board is thick meets the outer face of the strip it is cutting.
    if (unique.every(onPlane)) continue;
    for (let i = 0; i < unique.length; i += 1) {
      const a = unique[i];
      const b = unique[(i + 1) % unique.length];
      if (a !== b && onPlane(a) && onPlane(b)) {
        // The face walks a→b along the cap's boundary, so the CAP walks b→a:
        // its outward normal is the plane's, which is the way the material went.
        cutEdges.push([b, a]);
        break;
      }
    }
  }

  // ── the cap ──
  if (cutEdges.length >= 3) {
    const next = new Map(cutEdges.map(([a, b]) => [a, b]));
    const start = cutEdges[0][0];
    const loop = [start];
    let at = next.get(start);
    while (at != null && at !== start && loop.length <= cutEdges.length + 1) {
      loop.push(at);
      at = next.get(at);
    }
    if (loop.length >= 3 && at === start) faces.push(loop);
  }

  return { vertices, faces };
}

/** Every plane in turn. */
export function clipAll(solid, planes) {
  return (planes || []).reduce((s, p) => clipPolyhedron(s, p), solid);
}

/**
 * A solid as triangles, with one flat normal per face.
 *
 * Flat and not smoothed, deliberately: a mitre is a sharp arris between two
 * surfaces and smoothing it away is undoing the whole exercise. The edge BREAK
 * that softens it is done per fragment in the shader (3d/bevel.js), where it
 * costs nothing and is under a millimetre wide.
 *
 * @returns {{positions:number[], normals:number[], indices:number[]}}
 */
export function solidTriangles(solid) {
  const positions = [];
  const normals = [];
  const indices = [];
  for (const face of solid.faces) {
    if (face.length < 3) continue;
    const base = positions.length / 3;
    const n = faceNormal(solid, face);
    for (const vi of face) {
      const v = solid.vertices[vi];
      positions.push(v[0], v[1], v[2]);
      normals.push(n[0], n[1], n[2]);
    }
    for (let i = 1; i < face.length - 1; i += 1) indices.push(base, base + i, base + i + 1);
  }
  return { positions, normals, indices };
}

/** Newell's method: right for a polygon of any winding, and for a non-planar one. */
function faceNormal(solid, face) {
  let nx = 0; let ny = 0; let nz = 0;
  for (let i = 0; i < face.length; i += 1) {
    const a = solid.vertices[face[i]];
    const b = solid.vertices[face[(i + 1) % face.length]];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const len = Math.hypot(nx, ny, nz) || 1;
  return [nx / len, ny / len, nz / len];
}

// ─── The top infill, piece by piece ─────────────────────────────────────────

/**
 * The box a piece actually OCCUPIES once it is mitred, and the planes that cut
 * it — for one strip of a top infill.
 *
 * Two things happen here that are worth naming.
 *
 * THE SHELF GROWS FORWARD. The engine puts the shelf strip BEHIND the face, so
 * that the two boxes butt without overlapping (turn 6). A mitre is the other
 * way round: two pieces cut to their LONG POINTS overlap by exactly the square
 * the joint occupies, and the two 45° cuts share that square between them. So
 * the drawn shelf runs forward to the face's own outer plane and is then cut
 * back — same outer envelope, same cut sizes, a joint instead of a butt.
 *
 * THE RETURN IS THE SAME JOINT, TURNED. At an open end the element carries on
 * around the corner and back to the wall. Both the faces and the shelves meet
 * there, each pair mitred, which is what makes it read as a picture frame
 * rather than as two boxes ending near each other.
 *
 * @param {object} panel  an engine panel record with `box` and `meta`
 * @returns {{box:object, planes:Array}|null} null when the piece takes no mitre
 */
export function infillMitre(panel) {
  const meta = panel?.meta;
  const box = panel?.box;
  if (!box || !meta) return null;

  // ─── The VERTICAL member (turn 15, CLAUDE.md F6 / BACKLOG #51) ────────────
  //
  // #51 was parked deliberately: turn 6 describes a side infill's arm A as
  // SCREWED to the carcass side, and a screwed joint is not a mitre, so this
  // function refused to cut the piece and a test guarded the refusal.
  //
  // What turn 15 activates is a DIFFERENT joint on the same piece, and the
  // owner is right that it was square: where the filler runs up past the units
  // and the top infill stops against it, the two stand in one plane and make
  // the corner of a frame. The arm stays screwed. The FACE is mitred.
  //
  // `meta.corner` is the leg of the 45°, put there by the engine only when
  // there is genuinely room for the cut (engine/runs.js). Everything else about
  // the vertical infill is untouched, which is why a run without this corner
  // draws exactly the box it drew before.
  if (meta.side === 'left' || meta.side === 'right') {
    const corner = Math.max(0, Number(meta.corner) || 0);
    if (meta.piece !== 'face' || !corner) return null;
    // The corner nearest the top infill: the INNER edge, at the top. For a
    // left-hand filler that is +X, for a right-hand one −X.
    const sign = meta.side === 'left' ? +1 : -1;
    return { box: { ...box }, planes: [chamferPlane(box, 'x', sign, 'y', +1, corner)] };
  }

  if (meta.side !== 'top') return null;
  const isFace = meta.piece === 'face';
  const isShelf = meta.piece === 'shelf';
  if (!isFace && !isShelf) return null;

  const segment = String(meta.segment || 'main');
  const ends = meta.ends || {};
  const planes = [];

  if (segment === 'main') {
    // ── the long run along the wall ──
    const t = isFace ? box.d : box.h;
    if (isFace) {
      const faceBox = { ...box };
      // The L: the top of the face is cut back to meet the shelf behind it.
      planes.push(chamferPlane(faceBox, 'y', +1, 'z', -1, t));
      // …and each OPEN end turns the corner, so it is cut in plan as well.
      if (ends.left === 'open') planes.push(chamferPlane(faceBox, 'x', -1, 'z', -1, t));
      if (ends.right === 'open') planes.push(chamferPlane(faceBox, 'x', +1, 'z', -1, t));
      // Turn 15 (F6): where it stops against a ceiling-height filler it runs to
      // its LONG POINT over the corner and comes to a point — the same cut the
      // filler takes, on the same plane, which is what makes it a joint rather
      // than two pieces ending near each other. The corner that comes away is
      // the BOTTOM one, because the top edge is what runs on over the corner.
      const cL = Math.max(0, Number(meta.corner?.left) || 0);
      const cR = Math.max(0, Number(meta.corner?.right) || 0);
      if (cL) planes.push(chamferPlane(faceBox, 'x', -1, 'y', -1, cL));
      if (cR) planes.push(chamferPlane(faceBox, 'x', +1, 'y', -1, cR));
      return { box: faceBox, planes };
    }
    // The shelf, MOVED forward to its long point (see above). Its length does
    // not change — a mitred piece is cut to the same 80 mm — it is where the
    // 80 is measured FROM that moves: from the face's outer plane, not from
    // behind the face's thickness.
    const shelfBox = { ...box, z: box.z + t };
    planes.push(chamferPlane(shelfBox, 'y', -1, 'z', +1, t));
    // In plan the two shelves mitre over a square as wide as a shelf is deep.
    if (ends.left === 'open') planes.push(chamferPlane(shelfBox, 'x', -1, 'z', -1, box.d));
    if (ends.right === 'open') planes.push(chamferPlane(shelfBox, 'x', +1, 'z', -1, box.d));
    return { box: shelfBox, planes };
  }

  // ── the return, running back to the wall ──
  const left = segment === 'return-left';
  if (isFace) {
    const t = box.w;
    const faceBox = { ...box };
    // The L, turned a quarter: the top of the return face meets the return
    // shelf, which is INBOARD of it.
    planes.push(chamferPlane(faceBox, 'y', +1, 'x', left ? +1 : -1, t));
    // …and the corner where it meets the main face.
    planes.push(chamferPlane(faceBox, 'x', left ? +1 : -1, 'z', +1, t));
    return { box: faceBox, planes };
  }

  // The return shelf, moved sideways to its own long point — measured from the
  // return face's outer plane, the same move the main shelf makes forward.
  const t = box.h;
  const shelfBox = left ? { ...box, x: box.x - t } : { ...box, x: box.x + t };
  planes.push(chamferPlane(shelfBox, 'y', -1, 'x', left ? -1 : +1, t));
  planes.push(chamferPlane(shelfBox, 'x', left ? +1 : -1, 'z', +1, box.w));
  return { box: shelfBox, planes };
}

/** The mitred solid for one infill strip, or null when it takes no mitre. */
export function infillSolid(panel) {
  const spec = infillMitre(panel);
  if (!spec) return null;
  return clipAll(boxPolyhedron(spec.box), spec.planes);
}
