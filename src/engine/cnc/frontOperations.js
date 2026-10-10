// Decorative machining is supplied in the engine's back-view coordinates.
// A separate front setup reflects each PART about its own vertical axis.
// It is not a whole-sheet flip, and no back drilling enters that setup.

export const FRONT_REFERENCE_LAYER = 'FRONT_REFERENCE_NO_CUT';

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

function operationProblems(operation, panel) {
  const out = [];
  const op = operation || {};
  const name = op.id || 'unnamed operation';
  if (!['pocket', 'flute'].includes(op.kind)) out.push(`${name}: unsupported machining kind.`);
  if (op.face !== 'front') out.push(`${name}: front machining must name the front face.`);
  if (!Number.isFinite(Number(panel.thickness)) || Number(panel.thickness) <= 0
    || !Number.isFinite(op.depth) || op.depth <= 0 || op.depth >= Number(panel.thickness)) {
    out.push(`${name}: depth must be positive and below the panel thickness.`);
  }
  if (!Number.isFinite(op.startDepth) || op.startDepth < 0 || op.startDepth >= op.depth) {
    out.push(`${name}: start depth must be below the finished depth.`);
  }
  if (!['endmill', 'ballnose'].includes(op.tool?.kind)
    || !Number.isFinite(op.tool?.diameter) || op.tool.diameter <= 0) {
    out.push(`${name}: a cutter kind and positive diameter are required.`);
  }
  if ((op.kind === 'flute' && op.tool?.kind !== 'ballnose')
    || (op.kind === 'pocket' && op.tool?.kind !== 'endmill')) {
    out.push(`${name}: cutter kind does not match the machining operation.`);
  }
  if (op.kind === 'flute' && op.crossSection?.kind !== 'circular') {
    out.push(`${name}: flute circular cross-section is missing.`);
  }
  if (typeof op.layer !== 'string' || op.layer.length > 31 || !/^FRONT_[A-Z0-9_]+$/.test(op.layer)) {
    out.push(`${name}: an uppercase FRONT machining layer of at most 31 characters is required.`);
  }
  if (!pointsOk(op.kind === 'flute' ? op.centreline : op.points, op.kind === 'flute' ? 2 : 3)) {
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
export function frontPanelEntities(panel) {
  const decoration = frontDecorationOf(panel);
  if (!decoration) return [];
  const width = Number(panel.cnc?.drawn_w ?? panel.w);
  const mirror = ([x, y]) => [width - x, y];
  const entities = [];
  const outline = panel.cnc?.outline;
  if (pointsOk(outline, 3)) entities.push({
    type: 'poly', layer: FRONT_REFERENCE_LAYER, closed: true,
    pts: outline.map(mirror).reverse(),
  });
  for (const operation of Array.isArray(decoration.operations) ? decoration.operations : []) {
    // Export-anyway retains every geometrically valid operation and reports
    // the blocked state in the manifest. Non-finite entities cannot be DXF.
    if (operationProblems(operation, panel).length) continue;
    const flute = operation.kind === 'flute';
    entities.push({
      type: 'poly', layer: operation.layer, closed: !flute, operationId: operation.id,
      pts: (flute ? operation.centreline : operation.points).map(mirror),
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
      parts.push({
        unitId, unitNum, panelId: panel.id,
        widthMm: panel.cnc?.drawn_w ?? panel.w,
        heightMm: panel.cnc?.drawn_h ?? panel.h,
        thicknessMm: panel.thickness,
        style: decoration.style,
        status: problems.length ? 'blocked' : (held ? 'held' : 'ready'),
        exported: exportAnyway || !held,
        override: exportAnyway && (held || problems.length > 0),
        problems,
        placement: placements.find((place) => place.unitId === unitId && place.unitNum === unitNum && place.panelId === panel.id) || null,
        additions: (decoration.additions || []).map((addition) => ({
          id: addition.id, construction: addition.construction,
          face: 'front', mitres: addition.mitres, cut: addition.cut,
          assemblyPointsFrontMm: (addition.points || []).map(([x, y]) => [Number(panel.cnc?.drawn_w ?? panel.w) - x, y]),
          attachment: 'Applied strip assembly; fix to the front after machining.',
        })),
        appliedParts: (entry.panels || result.panels || [])
          .filter((part) => part.meta?.frontDecorationParent === panel.id)
          .map((part) => ({
            panelId: part.id, part: part.part, widthMm: part.w, heightMm: part.h, thicknessMm: part.thickness,
            construction: part.meta.construction, mitres: part.meta.mitres, assemblySide: part.meta.assemblySide,
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
          vectorMeaning: operation.kind === 'flute' ? 'tool-centre path' : 'finished pocket boundary',
          exported: (exportAnyway || !held) && operationProblems(operation, panel).length === 0,
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
export function frontDecorationLayers(panels = []) {
  const layers = new Map();
  for (const panel of panels) {
    const decoration = frontDecorationOf(panel);
    if (!decoration) continue;
    layers.set(FRONT_REFERENCE_LAYER, {
      name: FRONT_REFERENCE_LAYER, label: 'Front reference (do not cut)',
      screen: '#8d8d92', aci: 8, kind: 'outline',
    });
    for (const operation of Array.isArray(decoration.operations) ? decoration.operations : []) {
      if (operationProblems(operation, panel).length) continue;
      const flute = operation.kind === 'flute';
      layers.set(operation.layer, {
        name: operation.layer,
        label: `${flute ? 'Flute' : 'Pocket'}: ${operation.depth} mm, ${operation.tool.diameter} mm ${operation.tool.kind}`,
        screen: flute ? '#63e6e2' : '#c3a06a', aci: flute ? 4 : 41,
        kind: flute ? 'mark' : 'pocket',
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
      const operations = frontDecorationOf(panel)?.operations;
      for (const operation of Array.isArray(operations) ? operations : []) {
        if (operationProblems(operation, panel).length) continue;
        const signature = JSON.stringify([
          operation.kind, operation.face, operation.depth, operation.startDepth,
          operation.tool.kind, operation.tool.diameter,
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
