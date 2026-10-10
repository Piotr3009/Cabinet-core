// Decorative faces use the engine's production contours. CNC coordinates look
// at the back of a front, so only the elevation reflects their X coordinate.
import { entPoly } from './primitives.js';
import { formatMm } from '../format.js';

function contourPoints(points) {
  return Array.isArray(points) && points.length >= 3
    && points.every((p) => Array.isArray(p) && p.length >= 2 && p.every(Number.isFinite));
}

/** Front elevation only. A top view must not flatten this face onto a plan. */
export function frontDecorationElevation(panel) {
  const decoration = panel?.meta?.frontDecoration;
  const box = panel?.box;
  if (!decoration || !box) return [];
  const projected = (points) => points.map(([x, y]) => [box.x + box.w - x, box.y + y]);
  const out = [];
  for (const operation of decoration.operations || []) {
    if (operation.face !== 'front' || !contourPoints(operation.points)) continue;
    out.push({
      ...entPoly('DOORS', projected(operation.points)),
      pen: 'FINE', meta: 'front-decoration', operationId: operation.id,
    });
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
    if (operation.face !== 'front' || !contourPoints(operation.points)) continue;
    const pts = operation.points.map((p) => [...p]);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x = Math.min(...xs); const y = Math.min(...ys);
    const w = Math.max(...xs) - x; const h = Math.max(...ys) - y;
    const tool = operation.tool;
    const cutter = tool?.diameter > 0 ? `, ${tool.kind || 'cutter'} diameter ${formatMm(tool.diameter)} mm` : '';
    const start = Number(operation.startDepth) > 0 ? `, starts ${formatMm(operation.startDepth)} mm below face` : '';
    out.push({
      id: `decoration-${operation.id}`,
      kind: 'path', machiningKind: operation.kind,
      layer: operation.layer, pts, closed: true,
      face: 'front', depth: operation.depth, startDepth: operation.startDepth || 0,
      x, y, w, h, at: [x + w / 2, y + h / 2],
      note: `FRONT FACE ${operation.kind} · ${formatMm(operation.depth)} mm total depth${start}${cutter}`,
    });
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
  if (decoration.additions?.length) {
    const count = decoration.additions.length;
    notes.push(`${count} applied moulding ${count === 1 ? 'piece' : 'pieces'}, fit to FRONT face`);
  }
  return notes.join('. ');
}
