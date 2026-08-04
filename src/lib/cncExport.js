import JSZip from 'jszip';
import { buildUnitDxfFiles } from '../engine/cnc/dxf.js';
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
