import JSZip from 'jszip';
import { buildUnitDxfFiles, sheetDxf, sheetDxfFileName } from '../engine/cnc/dxf.js';
import { layoutPanels } from '../engine/cnc/layout.js';
import { exportablePanels, presetOfSelection } from '../engine/cnc/groups.js';
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
  const filename = `${result.unitNum}-dxf.zip`;
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
