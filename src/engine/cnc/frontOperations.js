// Decorative machining is supplied in the engine's back-view coordinates.
// A separate front setup reflects each PART about its own vertical axis.
// It is not a whole-sheet flip, and no back drilling enters that setup.

import { appliedStripNotes, readinessOf } from '../readiness.js';

export const FRONT_REFERENCE_LAYER = 'FRONT_REFERENCE_NO_CUT';

// ─── THE ONE REFLECTION (T76; T78 F20 names it) ──────────────────────────
// A part drawn in the engine's back-view frame and machined from its OTHER
// face is written as seen from that face: every x is reflected about the
// part's own vertical axis, `frontX = partWidth - backX`, y untouched. T76
// wrote it for the decorative fronts' FRONT files; T78 F20 reads the SAME
// helper for a Cabineo board whose pockets are cut from the carcass's outside
// face (`meta.machinedFace === 'outside'`, engine/cabineo.js and cnc/dxf.js).
// One formula, exported once, so no second one can drift from it.
/** The reflection of one part about its own vertical axis: `([x, y]) => [width - x, y]`. */
export function mirrorAboutVerticalAxis(width) {
  const w = Number(width);
  return ([x, y]) => [w - x, y];
}

// Approval belongs to the physical pattern and workshop CAM validation. A
// saved recipe cannot make this reconstructed family production approved.
export const ORNATE_REFERENCE_MESSAGE = 'Ornate A is a proposed reference pattern. Its separate CAD and relief files need physical-pattern approval and CAM verification before production.';
export function isOrnateReference(panel) {
  return /^ORNATE_A_[1-4]$/.test(frontDecorationOf(panel)?.style || '');
}

/** Shared reference layer grammar for the read-only view and reference DXF. */
export function ornateReferenceContourLayer(contour) {
  if (contour?.kind === 'ornament-reference') return 'FRONT_REF_ORNAMENT';
  if (contour?.kind !== 'profile-level' || !Number.isFinite(contour.depth) || contour.depth <= 0
    || Math.abs(contour.depth - Number(contour.depth.toFixed(6))) > 1e-10) return null;
  const token = contour.depth.toFixed(6).replace(/\.?0+$/, '').replace('.', 'P');
  const layer = `FRONT_REF_PROFILE_D${token}`;
  return layer.length <= 31 ? layer : null;
}

export function frontDecorationOf(panel) {
  return panel?.meta?.frontDecoration || null;
}

export function hasFrontDecorations(entries = []) {
  return entries.some((entry) => (entry.panels || entry.result?.panels || [])
    .some((panel) => frontDecorationOf(panel)));
}

const pointsOk = (points, count) => Array.isArray(points) && points.length >= count
  && points.every((point) => Array.isArray(point) && point.length >= 2
    && Number.isFinite(point[0]) && Number.isFinite(point[1]));

// T76 F4 · a V groove (`vgroove`) is the owner's G and GF groove: like a
// flute its vector is the centre line, and unlike one it names no diameter.
// Its record carries the width at the mouth and the depth; CAM picks the bit.
// T82 F15 · a reed valley (`reed`) is the owner's cloud: its vector is the
// reed profile cutter's centre path along one valley, its record the cutter's
// diameter and the section it leaves (one flank and a wall at a field edge).
const CENTRELINE_KINDS = ['flute', 'vgroove', 'reed'];

function operationProblems(operation, panel) {
  const out = [];
  const op = operation || {};
  const name = op.id || 'unnamed operation';
  if (!['pocket', 'flute', 'vgroove', 'reed'].includes(op.kind)) out.push(`${name}: unsupported machining kind.`);
  if (op.face !== 'front') out.push(`${name}: front machining must name the front face.`);
  if (!Number.isFinite(Number(panel.thickness)) || Number(panel.thickness) <= 0
    || !Number.isFinite(op.depth) || op.depth <= 0 || op.depth >= Number(panel.thickness)) {
    out.push(`${name}: depth must be positive and below the panel thickness.`);
  }
  if (!Number.isFinite(op.startDepth) || op.startDepth < 0 || op.startDepth >= op.depth) {
    out.push(`${name}: start depth must be below the finished depth.`);
  }
  if (op.kind === 'vgroove') {
    if (op.tool?.kind !== 'v') out.push(`${name}: cutter kind does not match the machining operation.`);
    if (op.crossSection?.kind !== 'v' || !(Number(op.crossSection?.width) > 0) || !(Number(op.crossSection?.depth) > 0)) {
      out.push(`${name}: the V groove's width and depth are missing.`);
    }
  } else if (!['endmill', 'ballnose', 'reedProfile'].includes(op.tool?.kind)
    || !Number.isFinite(op.tool?.diameter) || op.tool.diameter <= 0) {
    out.push(`${name}: a cutter kind and positive diameter are required.`);
  }
  if ((op.kind === 'flute' && op.tool?.kind !== 'ballnose')
    || (op.kind === 'reed' && op.tool?.kind !== 'reedProfile')
    || (op.kind === 'pocket' && op.tool?.kind !== 'endmill')) {
    out.push(`${name}: cutter kind does not match the machining operation.`);
  }
  if (op.kind === 'flute' && op.crossSection?.kind !== 'circular') {
    out.push(`${name}: flute circular cross-section is missing.`);
  }
  if (op.kind === 'reed' && (op.crossSection?.kind !== 'reed' || !(Number(op.crossSection?.radius) > 0))) {
    out.push(`${name}: the reed's cross-section is missing.`);
  }
  if (typeof op.layer !== 'string' || op.layer.length > 31 || !/^FRONT_[A-Z0-9_]+$/.test(op.layer)) {
    out.push(`${name}: an uppercase FRONT machining layer of at most 31 characters is required.`);
  }
  const line = CENTRELINE_KINDS.includes(op.kind);
  if (!pointsOk(line ? op.centreline : op.points, line ? 2 : 3)) {
    out.push(`${name}: machining geometry is missing or non-finite.`);
  }
  return out;
}

export function frontDecorationProblems(panel) {
  const decoration = frontDecorationOf(panel);
  if (!decoration) return [];
  const out = (Array.isArray(decoration.problems) ? decoration.problems : []).map((problem) => typeof problem === 'string'
    ? problem : problem?.message || problem?.code || 'Invalid decoration.');
  if (decoration.version !== 1) out.push('Unsupported decorative machining version.');
  if (decoration.status !== 'ready' && !out.length) out.push('Decorative machining is not ready.');
  if (!Array.isArray(decoration.operations)) out.push('Decorative machining operations are missing.');
  // T77 F4 · an Ornate relief that built is a proposal, not a fault: its slab
  // is cut (state `cut`) and its relief rides the reference files (state
  // `geometry`), so the Check and the export gate say nothing about it. A
  // relief that was refused (a board too thin, radii that do not fit) is said
  // in its own words above and holds its leaf, as every refused recipe does.
  if (isOrnateReference(panel)) return [...new Set(out)];
  for (const operation of Array.isArray(decoration.operations) ? decoration.operations : []) out.push(...operationProblems(operation, panel));
  return [...new Set(out)];
}

export function frontDecorationFindings(result, { unitId = null, unitNum = '' } = {}) {
  return (result?.panels || []).flatMap((panel) => frontDecorationProblems(panel).map((message) => ({
    check: 9,
    level: 'red',
    unitId,
    unitNum,
    panel: panel.id,
    part: panel.part,
    layer: 'FRONT_DECORATION',
    code: 'front-decoration-invalid',
    message: `${unitNum ? `${unitNum} ` : ''}${panel.id}: ${message}`,
  })));
}

/** Reference and machining only. A reflected CCW contour is a CW pocket. */
export function frontPanelEntities(panel, { referencePreview = false } = {}) {
  const decoration = frontDecorationOf(panel);
  if (!decoration) return [];
  const width = Number(panel.cnc?.drawn_w ?? panel.w);
  const mirror = mirrorAboutVerticalAxis(width);
  const entities = [];
  const outline = panel.cnc?.outline;
  if (pointsOk(outline, 3)) entities.push({
    type: 'poly', layer: FRONT_REFERENCE_LAYER, closed: true,
    pts: outline.map(mirror).reverse(),
  });
  // Proposed relief contours live in explicitly named reference files. They
  // are never pocket boundaries in the normal production FRONT setup.
  if (isOrnateReference(panel)) {
    if (!referencePreview || !Number.isFinite(width) || decoration.status !== 'ready') return entities;
    for (const [operationIndex, operation] of (decoration.operations || []).entries()) {
      for (const [contourIndex, contour] of (operation.contours || []).entries()) {
        const layer = ornateReferenceContourLayer(contour);
        const closed = contour.closed !== false;
        if (!layer || !pointsOk(contour.points, closed ? 3 : 2)) continue;
        entities.push({
          type: 'poly', layer, closed,
          operationId: `${operation.id || operationIndex}/${contour.id || contourIndex}`,
          pts: contour.points.map(mirror), referenceOnly: true,
          referenceKind: contour.kind, depth: contour.depth ?? null,
          startDepth: contour.startDepth ?? null, surfaceDepth: operation.depth,
        });
      }
    }
    return entities;
  }
  for (const operation of Array.isArray(decoration.operations) ? decoration.operations : []) {
    // Export-anyway retains every geometrically valid operation and reports
    // the blocked state in the manifest. Non-finite entities cannot be DXF.
    if (operationProblems(operation, panel).length) continue;
    const line = CENTRELINE_KINDS.includes(operation.kind);
    entities.push({
      type: 'poly', layer: operation.layer, closed: !line, operationId: operation.id,
      pts: (line ? operation.centreline : operation.points).map(mirror),
    });
  }
  return entities;
}

/** The job's explicit operation handoff. DXF is geometry, not a toolpath. */
export function frontOperationsManifest(entries = [], {
  files = [], gate = null, exportAnyway = false, placements = [],
} = {}) {
  const parts = [];
  for (const entry of entries) {
    const result = entry.result || {};
    const unitId = entry.unit?.id || result.unitId || null;
    const unitNum = result.unitNum || entry.unitNum || '';
    for (const panel of entry.panels || result.panels || []) {
      const decoration = frontDecorationOf(panel);
      if (!decoration) continue;
      const held = Boolean(gate?.heldPanelIds?.has(`${unitId}::${panel.id}`));
      const problems = [...new Set([
        ...frontDecorationProblems(panel),
        ...(gate?.findings || []).filter((finding) => finding.unitId === unitId
          && finding.panel === panel.id && finding.code === 'front-layer-conflict').map((finding) => finding.message),
      ])];
      // T76 F5 · T75's readiness, the one production state: the part's, each
      // operation's, each strip's, and the gluing of the strips (one law,
      // `engine/readiness.js`). `status` below is the EXPORT's (held,
      // blocked), not a second production state.
      const fixing = appliedStripNotes([panel])[0] || null;
      parts.push({
        unitId, unitNum, panelId: panel.id,
        widthMm: panel.cnc?.drawn_w ?? panel.w,
        heightMm: panel.cnc?.drawn_h ?? panel.h,
        thicknessMm: panel.thickness,
        readiness: readinessOf(panel, { drills: result.drills || null }),
        style: decoration.style,
        status: problems.length ? 'blocked' : (held ? 'held' : 'ready'),
        exported: !isOrnateReference(panel) && (exportAnyway || !held),
        ...(isOrnateReference(panel) ? {
          referenceOnly: true, productionApproved: false,
          referenceFiles: files.filter((file) => file.referenceOnly && file.panelId === panel.id
            && (!file.unitId || file.unitId === unitId)),
        } : {}),
        override: exportAnyway && (held || problems.length > 0),
        problems,
        placement: placements.find((place) => place.unitId === unitId && place.unitNum === unitNum && place.panelId === panel.id) || null,
        additions: (decoration.additions || []).map((addition) => ({
          id: addition.id, construction: addition.construction,
          face: 'front', mitres: addition.mitres, cut: addition.cut,
          assemblyPointsFrontMm: (addition.points || []).map(mirrorAboutVerticalAxis(panel.cnc?.drawn_w ?? panel.w)),
          attachment: 'Applied strip assembly; fix to the front after machining.',
          readiness: fixing?.state || null,
        })),
        appliedParts: (entry.panels || result.panels || [])
          .filter((part) => part.meta?.frontDecorationParent === panel.id)
          .map((part) => ({
            panelId: part.id, part: part.part, widthMm: part.w, heightMm: part.h, thicknessMm: part.thickness,
            construction: part.meta.construction, mitres: part.meta.mitres, assemblySide: part.meta.assemblySide,
            readiness: readinessOf(part, { drills: result.drills || null }),
          })),
        operations: (Array.isArray(decoration.operations) ? decoration.operations : []).map((operation, index) => ({
          sequence: index + 1,
          id: operation.id,
          kind: operation.kind,
          face: operation.face,
          layer: operation.layer,
          startDepthMm: operation.startDepth,
          finalDepthMm: operation.depth,
          cuttingDepthMm: operation.depth - operation.startDepth,
          tool: operation.tool,
          ...(operation.crossSection ? { crossSection: operation.crossSection } : {}),
          vectorMeaning: operation.kind === 'reed' && operation.crossSection?.edge
            // T82 F15, after the review (reeds:3): the field's edge is its own cut.
            ? 'reed field edge: the wall line; one reed flank rises from it toward the field'
            : { flute: 'tool-centre path', vgroove: 'groove centre line', reed: 'reed profile cutter centre path along a valley', relief: 'proposed 3D machining surface; DXF contours are references only' }[operation.kind] || 'finished pocket boundary',
          readiness: readinessOf(isOrnateReference(panel) ? { ...operation, readiness: 'geometry' } : operation),
          ...(isOrnateReference(panel) ? { referenceOnly: true, productionApproved: false } : {}),
          exported: !isOrnateReference(panel) && (exportAnyway || !held) && operationProblems(operation, panel).length === 0,
        })),
      });
    }
  }
  return {
    schema: 'cabinet-core.front-operations', version: 1, units: 'mm',
    files,
    output: 'DXF vectors and operation specification. CAM toolpaths and G-code are not generated.',
    setups: {
      back: 'Existing CNC files use the back-view frame and contain the existing drilling and machining.',
      front: 'FRONT files contain front-face machining only. Front face up; zero Z at the original unmachined front surface.',
      flip: 'Flip each individual part about its local vertical axis: frontX = partWidth - backX, frontY = backY. Re-fixture each part in its recorded layout slot. Do not flip a whole sheet using this layout.',
      reference: `${FRONT_REFERENCE_LAYER} is an alignment reference only. Do not assign a cutting toolpath to it.`,
    },
    machining: {
      depths: 'All final and start depths are positive millimetres below the original front face. Recessed grooves start at the preceding pocket floor.',
      pocket: 'Closed vectors describe finished pocket boundaries. Apply tool-radius compensation in CAM.',
      flute: 'Open vectors are ballnose cutter centre paths. Use the specified cutter and final depth.',
      vgroove: 'Open vectors are V groove centre lines. The record gives the width at the mouth and the depth; select a V cutter that cuts that width at that depth in CAM. No included angle is assumed.',
      // T82 F15 · said only in an export that carries reeds, so every manifest before them is what it was.
      ...(parts.some((part) => part.operations.some((operation) => operation.kind === 'reed')) ? {
        reed: 'Open vectors on a FRONT_REED layer are reed valley lines: the centre path of a reed profile cutter of the '
          + 'recorded diameter, cut to the final depth (half the diameter), two flanks. The reeds are convex half-rounds '
          + 'touching, their crests on the original face. Open vectors on a FRONT_REEDEDGE layer are the two edges of a '
          + 'field, a different cut: a vertical wall on the line, as deep as a valley, to the flat margin, and ONE reed '
          + 'flank rising from it toward the field, which lies between the two lines (crossSection.edge, '
          + 'crossSection.profile); nothing is cut on the margin side of the line. Give each layer its own CAM recipe.',
      } : {}),
      registration: 'No registration holes or fixtures are generated. Set the part datum and secure each part for both setups.',
      cam: 'Select tools, feeds, speeds, stepdown, stepover and workholding in CAM. Simulate the supplied depths and both setups before machining.',
    },
    held: gate?.held || [],
    exportAnyway,
    parts,
  };
}

/** Coordinates used by sheetEntities after the local front-face reflection. */
export function frontSetupPlacements(blocks = [], gap = 0) {
  const height = blocks.reduce((sum, block) => sum + block.layout.height, 0)
    + gap * 3 * Math.max(0, blocks.length - 1);
  const placements = [];
  let offsetY = 0;
  for (const block of blocks) {
    for (const place of block.layout.places) {
      if (!frontDecorationOf(place.panel)) continue;
      placements.push({
        unitId: block.unit?.id || block.unitId || null,
        unitNum: block.unitNum,
        panelId: place.panel.id,
        turnDegrees: place.bounds.turn || 0,
        translationMm: [
          place.x - place.bounds.minX,
          height - offsetY - place.y - place.h - place.bounds.minY,
        ],
        transformOrder: 'Reflect local X, rotate about local origin, then translate.',
      });
    }
    offsetY += block.layout.height + gap * 3;
  }
  return placements;
}

/** Shared preview and DXF layer declarations for each configured cutter. */
export function frontDecorationLayers(panels = [], { referencePreview = false } = {}) {
  const layers = new Map();
  for (const panel of panels) {
    const decoration = frontDecorationOf(panel);
    if (!decoration) continue;
    layers.set(FRONT_REFERENCE_LAYER, {
      name: FRONT_REFERENCE_LAYER, label: 'Front reference (do not cut)',
      screen: '#8d8d92', aci: 8, kind: 'outline',
    });
    if (isOrnateReference(panel)) {
      if (referencePreview) for (const entity of frontPanelEntities(panel, { referencePreview: true })) {
        if (!entity.referenceOnly) continue;
        const ornament = entity.referenceKind === 'ornament-reference';
        layers.set(entity.layer, {
          name: entity.layer,
          label: ornament ? 'Proposed ornament (3D surface)' : `Proposed profile reference: ${entity.depth} mm`,
          screen: ornament ? '#63e6e2' : '#c3a06a', aci: ornament ? 4 : 41,
          kind: 'mark', referenceOnly: true,
        });
      }
      continue;
    }
    for (const operation of Array.isArray(decoration.operations) ? decoration.operations : []) {
      if (operationProblems(operation, panel).length) continue;
      const line = CENTRELINE_KINDS.includes(operation.kind);
      layers.set(operation.layer, {
        name: operation.layer,
        label: operation.kind === 'vgroove'
          ? `V groove: ${operation.depth} mm, ${operation.crossSection.width} mm wide at the mouth`
          : operation.kind === 'reed' && operation.crossSection?.edge
            ? `Reed field edge: ${operation.depth} mm, one flank of a ${operation.tool.diameter} mm reed profile and a wall`
          : operation.kind === 'reed'
            ? `Reed valley: ${operation.depth} mm, ${operation.tool.diameter} mm reed profile`
            : `${line ? 'Flute' : 'Pocket'}: ${operation.depth} mm, ${operation.tool.diameter} mm ${operation.tool.kind}`,
        screen: line ? '#63e6e2' : '#c3a06a', aci: line ? 4 : 41,
        kind: line ? 'mark' : 'pocket',
      });
    }
  }
  return [...layers.values()];
}

/** A layer is a machining recipe within one export, never two recipes. */
export function frontLayerFindings(entries = []) {
  const layers = new Map();
  for (const entry of entries) {
    const result = entry.result || {};
    const unitId = entry.unit?.id || result.unitId || null;
    const unitNum = result.unitNum || entry.unitNum || '';
    for (const panel of entry.panels || result.panels || []) {
      if (isOrnateReference(panel)) continue;
      const operations = frontDecorationOf(panel)?.operations;
      for (const operation of Array.isArray(operations) ? operations : []) {
        if (operationProblems(operation, panel).length) continue;
        const signature = JSON.stringify([
          operation.kind, operation.face, operation.depth, operation.startDepth,
          operation.tool.kind, operation.tool.diameter, operation.crossSection?.width ?? null,
          // T82 F15, after the review (reeds:3): a reed's field edge is not its valley (the
          // two edges of a field are one recipe, mirrored: the wall on the line, the flank inward).
          operation.crossSection?.edge ? 'edge' : null,
        ]);
        const rows = layers.get(operation.layer) || [];
        rows.push({ signature, unitId, unitNum, panel: panel.id, part: panel.part });
        layers.set(operation.layer, rows);
      }
    }
  }
  const findings = [];
  for (const [layer, rows] of layers) {
    if (new Set(rows.map((row) => row.signature)).size <= 1) continue;
    const reported = new Set();
    for (const row of rows) {
      const key = `${row.unitId}::${row.panel}`;
      if (reported.has(key)) continue;
      reported.add(key);
      findings.push({
        check: 9, level: 'red', unitId: row.unitId, unitNum: row.unitNum,
        panel: row.panel, part: row.part, layer, code: 'front-layer-conflict',
        message: `${row.unitNum ? `${row.unitNum} ` : ''}${row.panel}: ${layer} names different tools or depths in this export.`,
      });
    }
  }
  return findings;
}
