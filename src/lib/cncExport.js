import JSZip from 'jszip';
import {
  buildUnitDxfFiles, materialDxfFileName, materialSheetDxf, sheetDxf, sheetDxfFileName,
} from '../engine/cnc/dxf.js';
import { layoutPanels } from '../engine/cnc/layout.js';
import { exportablePanels, presetOfSelection } from '../engine/cnc/groups.js';
import { materialExportSection } from '../engine/cnc/views.js';
import { fileSafeName } from '../engine/naming.js';
import { getCabinetProfile } from '../engine/profile.js';
import { download } from './exporters.js';

// ─── CNC export ───
// The ZIP wrapper around the pure-JS DXF generator. jszip lives HERE and not in
// src/engine/ so the engine stays dependency-free (CLAUDE.md rule 2); the
// generator is fully testable in node without ever touching this file.

/**
 * One ZIP per unit: `{unitNum}-dxf.zip`, containing `{unitNum}-{PANEL_ID}.dxf`
 * for every cut part of that unit.
 *
 * @param {object} result   computeCabinet() output for the selected unit
 * @param {object} [profile]
 * @returns {Promise<{filename:string, files:string[]}>}
 */
export async function exportUnitDxfZip(result, profile = getCabinetProfile()) {
  const files = buildUnitDxfFiles(result, profile);
  if (!files.length) throw new Error('This unit has no CNC geometry to export.');

  const zip = new JSZip();
  for (const f of files) zip.file(f.name, f.dxf);

  // DEFLATE: the DXFs are ASCII group codes, so they compress ~10:1.
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  // Turn 16 (CLAUDE.md F6): a cabinet's name is the owner's now, so it may
  // contain a space or a slash — neither of which belongs in a path a
  // workshop's machine has to open. The DXF names inside the zip have been
  // sanitised since turn 3 (engine/cnc/dxf.js); this is the wrapper catching
  // up. An automatic name ("01", "WU05") passes through untouched.
  const filename = `${fileSafeName(result.unitNum, 'unit')}-dxf.zip`;
  download(filename, blob);
  return { filename, files: files.map((f) => f.name) };
}

/**
 * ONE DXF with the selected parts, laid out exactly as the preview shows them.
 *
 * Same layout module as the view (engine/cnc/layout.js) — the export cannot
 * drift from the picture, because there is only one arrangement.
 *
 * @param {object} result     computeCabinet() output
 * @param {string[]} selectedIds  panel ids to include
 * @param {object} [profile]
 */
export function exportSheetDxf(result, selectedIds, profile = getCabinetProfile()) {
  const wanted = new Set(selectedIds);
  const panels = exportablePanels(result.panels).filter((p) => wanted.has(p.id));
  if (!panels.length) throw new Error('Nothing selected to export.');

  const layout = layoutPanels(panels, result.drills, {
    gap: profile.cnc.layoutGap,
    rowWidth: profile.cnc.layoutRowWidth,
  });
  const presetId = presetOfSelection(result.panels, panels.map((p) => p.id));
  const dxf = sheetDxf({
    panels, drills: result.drills, layout, unitNum: result.unitNum, profile,
  });
  const filename = sheetDxfFileName(result.unitNum, presetId);
  download(filename, new Blob([dxf], { type: 'application/dxf' }));
  return { filename, parts: panels.length, presetId };
}

/**
 * ─── ONE MATERIAL, ONE EXPORT (turn 17, CLAUDE.md F2.1) ─────────────────────
 *
 * "Choose the material, export the lot." Every ticked part of every ticked
 * cabinet that comes off ONE board, in one file, laid out exactly as the CNC
 * view's section shows it — because it is the same `layoutPanels` and the same
 * `materialSection` the sheet is drawn from.
 *
 * The file carries the in-part labels and NOTHING else (F2.2). The sheet's own
 * lettering — the yellow section header, the cabinet name over each block, the
 * part counts — stays on the glass: "żadnych innych liter bo to nam zaśmieca
 * program w CNC."
 *
 * @param {Array} entries  [{ unit, result, panels }] — the ticked parts, as the
 *                         CNC view assembles them
 * @param {object} opts    { key, design, materials, profile }
 */
export function exportMaterialDxf(entries, {
  key = 'all', design = null, materials = [], profile = getCabinetProfile(),
} = {}) {
  const section = materialExportSection(entries, {
    key, design, profile, materials,
  });
  if (!section || !section.blocks.length) throw new Error('Nothing on the sheet for that material.');

  const dxf = materialSheetDxf({
    blocks: section.blocks, gap: profile.cnc.layoutGap, profile,
  });
  const filename = materialDxfFileName(section.label);
  download(filename, new Blob([dxf], { type: 'application/dxf' }));
  return {
    filename,
    label: section.label,
    parts: section.blocks.reduce((n, b) => n + b.panels.length, 0),
    units: section.blocks.length,
  };
}
