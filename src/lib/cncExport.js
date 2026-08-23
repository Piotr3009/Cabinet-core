import JSZip from 'jszip';
import {
  buildUnitDxfFiles, materialDxfFileName, materialSheetDxf, sheetDxf, sheetDxfFileName,
} from '../engine/cnc/dxf.js';
import { layoutPanels } from '../engine/cnc/layout.js';
import { exportablePanels, presetOfSelection } from '../engine/cnc/groups.js';
import { materialExportSection } from '../engine/cnc/views.js';
import { exportFileName, fileSafeName } from '../engine/naming.js';
// Turn 31 (CLAUDE.md F3): both guards run before any file is written.
import { exportGate, panelsThatGo } from '../engine/cnc/exportGate.js';
import { getCabinetProfile } from '../engine/profile.js';
import { download } from './exporters.js';
// ─── TURN 45 (CLAUDE.md F9-CNC): THE GROOVE UNDER EVERY PLACED LINE ─────────
// Born in `reference/lisp/KIT_LED_GROOVE.lsp` (iron rule 3), cut here. It is
// ADDITIVE and GATED: a unit with no LED line is handed back the very result
// object it came in as, so `computeCabinet()` is never asked and the six
// standard configs cannot move (iron rule 2).
import { stripsForUnit } from '../engine/ledStrips.js';
import { migrateDesign } from '../engine/design.js';
import { LED_GROOVE_LAYER, withLedGrooves } from './ledGroove.js';

/**
 * A result with its LED grooves cut in — or the very result, when there are
 * none. THE GATE, in one place, for both export paths.
 *
 * @param {object} args
 *   result   computeCabinet() output
 *   unit     the cabinet it is of, when the caller has one
 *   design   the project design (the placed lines live on it)
 *   ledSpec  the project's LED spec — 4 mm flexi, or the channel's width
 */
export function grooved(result, {
  unit = null, design = null, ledSpec = null, profile = getCabinetProfile(),
} = {}) {
  if (!result || !unit || !design) return result;
  const d = migrateDesign(design);
  const items = d.lighting.items.filter((i) => i.unitId === unit.id);
  if (!items.length) return result;
  // The lines are placed whether the PREVIEW is on or off (F9a), so the read
  // forces the flag — it is a read of the geometry and stores nothing.
  const strips = stripsForUnit({
    unit, result, design: { ...d, lighting: { ...d.lighting, on: true } }, profile,
  });
  return withLedGrooves({
    result, strips, items, ledSpec,
  });
}

// ─── CNC export ───
// The ZIP wrapper around the pure-JS DXF generator. jszip lives HERE and not in
// src/engine/ so the engine stays dependency-free (CLAUDE.md rule 2); the
// generator is fully testable in node without ever touching this file.
//
// ─── TURN 31 (CLAUDE.md F3): THE EXPORT GATE ────────────────────────────────
//
// "Both guards run before files are written. A faulty panel is HELD OUT of the
// export — message names it — with an explicit 'Export anyway'."
//
// Turn 25's outline guard was tested from turn 25 and was never once consulted
// by the button the owner actually presses. It is now, together with turn 31's
// drill guard, and it happens HERE rather than in each of the three export
// functions' callers: a gate one caller can forget is a gate.
//
// Every function below takes `{ exportAnyway }` and returns `held` and
// `gateMessage` beside its filename. The DECISION is the caller's — this layer
// sorts the panels into two piles and writes the sentence (rule 4: it speaks,
// it never fixes).

/**
 * One ZIP per unit: `{unitNum}-dxf.zip`, containing `{unitNum}-{PANEL_ID}.dxf`
 * for every cut part of that unit.
 *
 * @param {object} result   computeCabinet() output for the selected unit
 * @param {object} [profile]
 * @returns {Promise<{filename:string, files:string[]}>}
 */
export async function exportUnitDxfZip(result, profile = getCabinetProfile(), {
  exportAnyway = false, project = null,
  // T45 F9-CNC: hand the unit, the design and the LED spec in and the grooves
  // are cut. Left out — every caller that predates this turn — nothing changes
  // at all, which is the gate stated as a default.
  unit = null, design = null, ledSpec = null,
} = {}) {
  const gate = exportGate([{ result }], { profile });
  const held = new Set(gate.held.map((h) => h.panelId));
  const cut = grooved(result, {
    unit, design, ledSpec, profile,
  });
  const safe = exportAnyway || gate.ok
    ? cut
    : { ...cut, panels: (cut.panels || []).filter((p) => !held.has(p.id)) };
  const files = buildUnitDxfFiles(safe, profile, { userLayers: [LED_GROOVE_LAYER] });
  if (!files.length) {
    throw new Error(gate.ok
      ? 'This unit has no CNC geometry to export.'
      : `Every part of this unit is held back: ${gate.message}`);
  }

  const zip = new JSZip();
  for (const f of files) zip.file(f.name, f.dxf);

  // DEFLATE: the DXFs are ASCII group codes, so they compress ~10:1.
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  // Turn 16 (CLAUDE.md F6): a cabinet's name is the owner's now, so it may
  // contain a space or a slash — neither of which belongs in a path a
  // workshop's machine has to open. The DXF names inside the zip have been
  // sanitised since turn 3 (engine/cnc/dxf.js); this is the wrapper catching
  // up. An automatic name ("01", "WU05") passes through untouched.
  // Turn 31 (CLAUDE.md F5): the job names its own files. Without a project —
  // nothing in the app calls it that way any more — it is what it always was.
  const filename = project
    ? exportFileName({ project, kind: 'cnc', subject: result.unitNum, ext: 'zip' })
    : `${fileSafeName(result.unitNum, 'unit')}-dxf.zip`;
  download(filename, blob);
  return {
    filename,
    files: files.map((f) => f.name),
    held: exportAnyway ? [] : gate.held,
    gateMessage: exportAnyway ? null : gate.message,
  };
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
export function exportSheetDxf(result, selectedIds, profile = getCabinetProfile(), { exportAnyway = false, project = null } = {}) {
  const wanted = new Set(selectedIds);
  const chosen = exportablePanels(result.panels).filter((p) => wanted.has(p.id));
  if (!chosen.length) throw new Error('Nothing selected to export.');
  const gate = exportGate([{ result, panels: chosen }], { profile });
  const panels = panelsThatGo(chosen, { gate, unitId: result.unitId || null, exportAnyway });
  if (!panels.length) throw new Error(`Every selected part is held back: ${gate.message}`);

  const layout = layoutPanels(panels, result.drills, {
    gap: profile.cnc.layoutGap,
    rowWidth: profile.cnc.layoutRowWidth,
  });
  const presetId = presetOfSelection(result.panels, panels.map((p) => p.id));
  const dxf = sheetDxf({
    panels, drills: result.drills, layout, unitNum: result.unitNum, profile,
  });
  const filename = sheetDxfFileName(result.unitNum, presetId, { project });
  download(filename, new Blob([dxf], { type: 'application/dxf' }));
  return {
    filename,
    parts: panels.length,
    presetId,
    held: exportAnyway ? [] : gate.held,
    gateMessage: exportAnyway ? null : gate.message,
  };
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
  key = 'all', design = null, materials = [], profile = getCabinetProfile(), exportAnyway = false,
  project = null,
} = {}) {
  const gate = exportGate(entries, { profile });
  // The held-back parts leave the SELECTION before the section is laid out, so
  // the sheet the file carries is the sheet that was actually cut — no gap
  // where a board was quietly dropped afterwards.
  const passed = exportAnyway || gate.ok ? entries : (entries || []).map((e) => ({
    ...e,
    panels: (e.panels || []).filter((p) => !gate.heldPanelIds.has(`${e.unit?.id || null}::${p.id}`)),
  }));
  const section = materialExportSection(passed, {
    key, design, profile, materials,
  });
  if (!section || !section.blocks.length) {
    throw new Error(gate.ok
      ? 'Nothing on the sheet for that material.'
      : `Every part on this sheet is held back: ${gate.message}`);
  }

  const dxf = materialSheetDxf({
    blocks: section.blocks, gap: profile.cnc.layoutGap, profile,
  });
  const filename = materialDxfFileName(section.label, { project });
  download(filename, new Blob([dxf], { type: 'application/dxf' }));
  return {
    filename,
    label: section.label,
    parts: section.blocks.reduce((n, b) => n + b.panels.length, 0),
    units: section.blocks.length,
    held: exportAnyway ? [] : gate.held,
    gateMessage: exportAnyway ? null : gate.message,
  };
}
