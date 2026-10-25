// Decorative faces use the engine's production contours. CNC coordinates look
// at the back of a front, so only the elevation reflects their X coordinate.
import { entPoly } from './primitives.js';
import { formatMm } from '../format.js';

function contourPoints(points, minimumPoints = 3) {
  return Array.isArray(points) && points.length >= minimumPoints
    && points.every((p) => Array.isArray(p) && p.length >= 2 && p.every(Number.isFinite));
}

// A sculpted relief has one canonical surface and several contour references.
// These curves describe that surface; each curve is not a separate pocket.
function operationContours(operation) {
  // T82 F15 · a reed's visible line is its VALLEY (the sharp edge between two
  // convex reeds, and the wall at a field's side): its centre line, open. The
  // crests are smooth and draw nothing; the strip it cuts is not an outline.
  if (operation.kind === 'reed') {
    return contourPoints(operation.centreline, 2) && operation.face === 'front'
      ? [{ ...operation, points: operation.centreline, closed: false, contourId: null }] : [];
  }
  return [
    { ...operation, contourId: null },
    ...(operation.contours || []).map((contour) => ({
      ...contour, face: operation.face, contourId: contour.id,
      layer: contour.layer || operation.layer,
      kind: 'relief-reference',
    })),
  ].filter((contour) => contour.face === 'front'
    && contourPoints(contour.points, contour.closed === false ? 2 : 3));
}

/** Front elevation only. A top view must not flatten this face onto a plan. */
export function frontDecorationElevation(panel) {
  const decoration = panel?.meta?.frontDecoration;
  const box = panel?.box;
  if (!decoration || !box) return [];
  const projected = (points) => points.map(([x, y]) => [box.x + box.w - x, box.y + y]);
  const out = [];
  for (const operation of decoration.operations || []) {
    for (const contour of operationContours(operation)) {
      out.push({
        ...entPoly('DOORS', projected(contour.points), { open: contour.closed === false }),
        pen: 'FINE', meta: 'front-decoration', operationId: operation.id,
        ...(contour.contourId ? { contourId: contour.contourId } : {}),
      });
    }
  }
  for (const addition of decoration.additions || []) {
    if (addition.face !== 'front' || !contourPoints(addition.points)) continue;
    out.push({
      ...entPoly('DOORS', projected(addition.points)),
      pen: 'THIN', meta: 'front-decoration', additionId: addition.id,
    });
  }
  return out;
}

/** Manufacturing detail stays in the panel's CNC datum, matching its drills. */
export function frontDecorationMachinings(panel) {
  const decoration = panel?.meta?.frontDecoration;
  if (!decoration) return [];
  const out = [];
  for (const operation of decoration.operations || []) {
    for (const contour of operationContours(operation)) {
      const pts = contour.points.map((p) => [...p]);
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const x = Math.min(...xs); const y = Math.min(...ys);
      const w = Math.max(...xs) - x; const h = Math.max(...ys) - y;
      const tool = operation.tool;
      const cutter = tool?.diameter > 0 ? `, ${tool.kind || 'cutter'} diameter ${formatMm(tool.diameter)} mm` : '';
      const start = Number(contour.startDepth) > 0 ? `, starts ${formatMm(contour.startDepth)} mm below face` : '';
      const reference = operation.kind === 'relief';
      const depthNote = Number.isFinite(contour.depth) ? `, ${formatMm(contour.depth)} mm below front face` : '';
      out.push({
        id: `decoration-${operation.id}${contour.contourId ? `-${contour.contourId}` : ''}`,
        kind: 'path', machiningKind: reference ? 'relief-reference' : operation.kind,
        layer: contour.layer, pts, closed: contour.closed !== false,
        face: 'front', depth: contour.depth, startDepth: contour.startDepth || 0,
        x, y, w, h, at: [x + w / 2, y + h / 2],
        note: reference
          ? `FRONT FACE RELIEF REFERENCE${depthNote}. Surface geometry requires CAM and sample approval; this curve is not a pocket toolpath.`
          : `FRONT FACE ${operation.kind} · ${formatMm(operation.depth)} mm total depth${start}${cutter}`,
      });
    }
  }
  for (const addition of decoration.additions || []) {
    if (addition.face !== 'front' || !contourPoints(addition.points)) continue;
    const pts = addition.points.map((p) => [...p]);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x = Math.min(...xs); const y = Math.min(...ys);
    const w = Math.max(...xs) - x; const h = Math.max(...ys) - y;
    out.push({
      id: `decoration-addition-${addition.id}`,
      kind: 'path', machiningKind: 'assembly-reference',
      layer: addition.layer || 'FRONT_REFERENCE_NO_CUT', pts, closed: true,
      face: 'front', x, y, w, h, at: [x + w / 2, y + h / 2],
      note: `ASSEMBLY REFERENCE ONLY · fit to FRONT face, ${formatMm(addition.length)} mm long, ${formatMm(addition.width)} mm wide, ${formatMm(addition.projection)} mm projection, mitres ${formatMm(addition.mitreStart)} / ${formatMm(addition.mitreEnd)} degrees`,
    });
  }
  return out;
}

/** Keep setup and hand-applied parts explicit without annotating every flute. */
export function frontDecorationDetailNote(panel) {
  const decoration = panel?.meta?.frontDecoration;
  if (!decoration) return '';
  const notes = [];
  if (decoration.status === 'blocked') {
    notes.push(`Decoration blocked: ${(decoration.problems || []).map((p) => p.message).filter(Boolean).join('; ') || 'Check the front recipe'}`);
  }
  if (decoration.operations?.length) notes.push('Front-face decoration shown in the CNC back-view datum; the separate FRONT DXF mirrors X for front-face setup');
  if (decoration.reeds) {
    const r = decoration.reeds;
    notes.push(`Reeded face: ${r.count} convex reeds of ${formatMm(r.diameterMm)} mm, touching, valleys ${formatMm(r.diameterMm / 2)} mm deep; the lines are the valleys`);
  }
  if (decoration.operations?.some((operation) => operation.kind === 'relief')) {
    notes.push('Ornate relief is a proposed reconstruction. Dimensions, ornament and cutter access require a physical sample and workshop approval. Relief contours are references, not independent pocket cuts');
  }
  if (decoration.additions?.length) {
    const count = decoration.additions.length;
    notes.push(`${count} applied moulding ${count === 1 ? 'piece' : 'pieces'}, fit to FRONT face`);
  }
  return notes.join('. ');
}
