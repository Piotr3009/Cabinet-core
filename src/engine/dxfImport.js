// ─── DXF floor-plan import ───
// Reads a DXF as TEXT and pulls the plan outline out of it. No library: a DXF
// is a flat list of (group code, value) pairs, and the two entities a floor
// plan is drawn with — LINE and LWPOLYLINE — need about forty lines of parsing
// (CLAUDE.md rule 4: no new dependencies).
//
// What comes out is a PROPOSAL: corner points for the room modal to preview,
// let the user correct, and only then apply. Nothing here writes to a store.
//
// Pure functions — no React, no store imports.

/**
 * Split a DXF into (code, value) pairs. Handles both CRLF and LF, and the
 * indented-code style AutoCAD writes ("  0\nSECTION").
 */
export function parseDxfPairs(text) {
  const lines = String(text).split(/\r\n|\r|\n/);
  const pairs = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number(lines[i].trim());
    if (!Number.isFinite(code)) continue;
    pairs.push([code, lines[i + 1].trim()]);
  }
  return pairs;
}

/**
 * The LINE and LWPOLYLINE entities of the ENTITIES section.
 * Everything else (text, dimensions, hatches, blocks) is ignored on purpose —
 * a floor plan's geometry is its lines.
 */
export function readDxfEntities(text) {
  const pairs = parseDxfPairs(text);
  const lines = [];
  const polylines = [];

  let inEntities = false;
  let current = null;

  const flush = () => {
    if (!current) return;
    if (current.type === 'LINE' && current.x1 != null && current.x2 != null) {
      lines.push({ x1: current.x1, y1: current.y1 ?? 0, x2: current.x2, y2: current.y2 ?? 0, layer: current.layer });
    }
    if (current.type === 'LWPOLYLINE' && current.points.length >= 2) {
      polylines.push({ closed: Boolean(current.closed), points: current.points, layer: current.layer });
    }
    current = null;
  };

  for (const [code, value] of pairs) {
    if (code === 0) {
      flush();
      if (value === 'SECTION') { current = { type: 'SECTION' }; continue; }
      if (value === 'ENDSEC') { inEntities = false; continue; }
      if (!inEntities) continue;
      if (value === 'LINE') current = { type: 'LINE', points: [] };
      else if (value === 'LWPOLYLINE') current = { type: 'LWPOLYLINE', points: [], closed: false };
      else current = null;
      continue;
    }
    if (code === 2 && current?.type === 'SECTION') {
      inEntities = value === 'ENTITIES';
      current = null;
      continue;
    }
    if (!current) continue;
    const num = Number(value);
    switch (code) {
      case 8: current.layer = value; break;
      case 10:
        if (current.type === 'LINE') current.x1 = num;
        else current.points.push({ x: num, y: 0 });
        break;
      case 20:
        if (current.type === 'LINE') current.y1 = num;
        else if (current.points.length) current.points[current.points.length - 1].y = num;
        break;
      case 11: current.x2 = num; break;
      case 21: current.y2 = num; break;
      case 70: if (current.type === 'LWPOLYLINE') current.closed = (num & 1) === 1; break;
      default: break;
    }
  }
  flush();
  return { lines, polylines };
}

const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

/** Drop points that sit on the straight line between their neighbours. */
export function dropCollinear(points, toleranceMm = 1) {
  if (points.length < 3) return points;
  const out = [];
  const n = points.length;
  for (let i = 0; i < n; i += 1) {
    const prev = points[(i - 1 + n) % n];
    const cur = points[i];
    const next = points[(i + 1) % n];
    const cross = (cur.x - prev.x) * (next.y - prev.y) - (cur.y - prev.y) * (next.x - prev.x);
    const base = dist(prev, next) || 1;
    if (Math.abs(cross) / base > toleranceMm) out.push(cur);
  }
  return out.length >= 3 ? out : points;
}

/** Chain loose LINE segments into a closed loop, if they form one. */
export function chainLines(lines, toleranceMm = 5) {
  if (!lines.length) return [];
  const segments = lines.map((l) => ({ a: { x: l.x1, y: l.y1 }, b: { x: l.x2, y: l.y2 }, used: false }));
  const near = (p, q) => dist(p, q) <= toleranceMm;

  const start = segments[0];
  start.used = true;
  const points = [start.a, start.b];

  let progressed = true;
  while (progressed) {
    progressed = false;
    const tail = points[points.length - 1];
    for (const s of segments) {
      if (s.used) continue;
      if (near(s.a, tail)) { points.push(s.b); s.used = true; progressed = true; break; }
      if (near(s.b, tail)) { points.push(s.a); s.used = true; progressed = true; break; }
    }
    if (points.length > 1 && near(points[points.length - 1], points[0]) && points.length >= 4) break;
  }

  // A loop that closed on itself repeats its first point — drop the duplicate.
  if (points.length >= 4 && near(points[points.length - 1], points[0])) points.pop();
  return points;
}

/**
 * The room outline a DXF proposes.
 *
 * Preference order, and why: a CLOSED polyline is somebody having drawn the
 * room as one object, which is the least ambiguous thing in the file. Failing
 * that, the largest open polyline, then loose lines chained end to end. The
 * result is snapped to whole millimetres and stripped of collinear points, so
 * a wall drawn as three segments arrives as one wall.
 *
 * @param {string} text        DXF file contents
 * @param {object} [opts]
 * @param {number} [opts.scale] multiply every coordinate (1 = the file is in mm)
 * @param {number} [opts.minWallMm] ignore outlines whose walls are shorter than this
 */
export function proposeRoomFromDxf(text, opts = {}) {
  const scale = Number(opts.scale) || 1;
  const { lines, polylines } = readDxfEntities(text);
  const warnings = [];

  const candidates = [];
  for (const p of polylines) {
    candidates.push({ source: p.closed ? 'closed polyline' : 'open polyline', closed: p.closed, points: p.points });
  }
  if (lines.length) {
    const chained = chainLines(lines);
    if (chained.length >= 3) candidates.push({ source: 'chained lines', closed: false, points: chained });
  }
  if (!candidates.length) {
    return { ok: false, corners: [], warnings: ['No LINE or LWPOLYLINE entities found in the ENTITIES section.'], stats: { lines: lines.length, polylines: polylines.length } };
  }

  const scored = candidates.map((c) => {
    const pts = c.points.map((p) => ({ x: p.x * scale, y: p.y * scale }));
    const area = Math.abs(pts.reduce((s, p, i) => {
      const q = pts[(i + 1) % pts.length];
      return s + (p.x * q.y - q.x * p.y);
    }, 0)) / 2;
    return { ...c, points: pts, area };
  });
  scored.sort((a, b) => (Number(b.closed) - Number(a.closed)) || (b.area - a.area));
  const best = scored[0];

  let corners = dropCollinear(best.points.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })));
  // Move the outline so its own bottom-left corner is the origin: the room
  // model measures from (0,0) and a plan drawn at survey coordinates would
  // otherwise arrive thousands of millimetres off screen.
  const minX = Math.min(...corners.map((c) => c.x));
  const minY = Math.min(...corners.map((c) => c.y));
  corners = corners.map((c) => ({ x: c.x - minX, y: c.y - minY }));

  if (!best.closed) warnings.push(`The outline came from ${best.source} — check that it closes where you expect.`);
  const minWall = Number(opts.minWallMm) || 100;
  for (let i = 0; i < corners.length; i += 1) {
    const w = dist(corners[i], corners[(i + 1) % corners.length]);
    if (w < minWall) warnings.push(`Wall ${i + 1} is only ${Math.round(w)} mm — merge or delete it.`);
  }
  if (corners.length > 12) warnings.push(`${corners.length} corners is a lot for a room — simplify the plan or raise the tolerance.`);

  return {
    ok: corners.length >= 3,
    corners,
    warnings,
    source: best.source,
    stats: { lines: lines.length, polylines: polylines.length, area_m2: Math.round(best.area / 1e6 * 100) / 100 },
  };
}
