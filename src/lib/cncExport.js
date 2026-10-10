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
import { frontOperationsManifest, frontSetupPlacements, hasFrontDecorations } from '../engine/cnc/frontOperations.js';
import { buildOrnateReferenceFiles } from '../engine/cnc/ornateExport.js';
import { getCabinetProfile } from '../engine/profile.js';
// ─── T75 F23 · THE DOWEL GATE ─────────────────────────────────────────────
// CLAUDE.md: *"the CNC export REFUSES a dowel job while
// `joints.dowel.confirmed` is false, in words ("the dowel pattern is proposed,
// not confirmed by the owner")."*  A REFUSAL, not a hold: it is thrown at the
// top of each export, BEFORE `exportGate`, so "Export anyway" cannot pass it.
// Only an export that would machine a dowel hole is refused.
import { dowelExportRefusal } from '../engine/dowels.js';
import { download } from './exporters.js';
// T75 F22 · *"the CNC export carries a banner counting the lines that are not
// 'cut'"*: read off the parts that go, never written into them.
import {
  READINESS_LABELS, appliedStripNotes, readinessBanner, readinessOf,
} from '../engine/readiness.js';
// ─── TURN 45 (CLAUDE.md F9-CNC): THE GROOVE UNDER EVERY PLACED LINE ─────────
// Born in `reference/lisp/KIT_LED_GROOVE.lsp` (iron rule 3), cut here. It is
// ADDITIVE and GATED: a unit with no LED line is handed back the very result
// object it came in as, so `computeCabinet()` is never asked and the six
// standard configs cannot move (iron rule 2).
import { stripsForUnit } from '../engine/ledStrips.js';
import { migrateDesign } from '../engine/design.js';
import { LED_GROOVE_LAYER, grooveCount, withLedGrooves } from './ledGroove.js';

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
  // ─── TURN 48 (CLAUDE.md F5): CUT ONCE ───────────────────────────────────
  // The sheet asks for its grooves through the store now (`unitCncResult`), and
  // the export button then hands that same result here on its way to the file.
  // Without this line the pocket would be added twice — two identical closed
  // polylines on the same layer, which a nesting program cuts TWICE. So a
  // result that already carries its grooves is handed back as it is, which is
  // the same answer the gate below gives a cabinet with no line at all.
  if (grooveCount(result) > 0) return result;
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
 * T75 F22 · the state of every part that goes, and the banner for those that
 * are not `cut`: `{ lines: [{ id, state }], count, banner }`.
 */
export function exportReadiness(panels, drills = []) {
  // T76 F5 · a decorated front and its strips are lines like any other (cut);
  // the gluing of the strips is a line of its own, to fit on site.
  const lines = [
    ...(panels || []).map((p) => ({ id: p.id, part: p.part, state: readinessOf(p, { drills }) })),
    ...appliedStripNotes(panels).map((n) => ({ id: n.id, part: n.part, state: n.state })),
  ];
  const { count, banner } = readinessBanner(lines);
  return { lines, count, banner };
}

// Proposed CAD/CAM references use the existing geometry state, separately
// from the unchanged slab state. A reference is never counted as a cut line.
function withReferenceReadiness(ready, files) {
  const lines = [...ready.lines, ...files.filter((file) => file.type === 'json').map((file) => ({
    id: `${file.unitNum} ${file.panelId} Ornate proposed reference`, part: 'front_reference', state: 'geometry',
  }))];
  return { lines, ...readinessBanner(lines) };
}

const fileRecord = ({ contents, ...file }) => file;

/**
 * T75 F22 · the banner a unit's ZIP carries as a file of its own beside the
 * DXFs (a DXF carries no letters but the part's own, T17 F2.2): the count,
 * then every part that is not `cut` with its state. Null when all are cut.
 */
export function readinessNote(unitNum, ready) {
  if (!ready?.count) return null;
  const rows = ready.lines.filter((l) => l.state !== 'cut')
    .map((l) => `${l.id}: ${READINESS_LABELS[l.state]}`);
  return [`${unitNum}: ${ready.banner}`, '', ...rows, ''].join('\r\n');
}

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
  const dowelRefused = dowelExportRefusal([{ result }], profile);
  if (dowelRefused) throw new Error(dowelRefused);
  const gate = exportGate([{ result }], { profile });
  const held = new Set(gate.held.map((h) => h.panelId));
  const cut = grooved(result, {
    unit, design, ledSpec, profile,
  });
  const safe = exportAnyway || gate.ok
    ? cut
    : { ...cut, panels: (cut.panels || []).filter((p) => !held.has(p.id)) };
  const files = buildUnitDxfFiles(safe, profile, { userLayers: [LED_GROOVE_LAYER] });
  const referenceFiles = buildOrnateReferenceFiles([{ result }]);
  if (!files.length && !referenceFiles.length) {
    throw new Error(gate.ok
      ? 'This unit has no CNC geometry to export.'
      : `Every part of this unit is held back: ${gate.message}`);
  }

  const zip = new JSZip();
  for (const f of files) zip.file(f.name, f.dxf);
  for (const f of referenceFiles) zip.file(f.name, f.contents);
  // T75 F22 · the banner rides the ZIP as a file of its own.
  const ready = withReferenceReadiness(exportReadiness(safe.panels, safe.drills), referenceFiles);
  const note = readinessNote(result.unitNum, ready);
  if (note) zip.file(`${fileSafeName(result.unitNum, 'unit')}-READINESS.txt`, note);
  // T76 F1 · GPT's operation manifest rides the same ZIP beside it.
  const manifestName = 'front-operations.json';
  const decorated = hasFrontDecorations([{ result }]);
  if (decorated) zip.file(manifestName, JSON.stringify(frontOperationsManifest([{ result }], {
    files: [...files.map((f) => ({ name: f.name, setup: f.setup || 'back', panelId: f.panelId })), ...referenceFiles.map(fileRecord)],
    gate, exportAnyway,
  }), null, 2));

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
    files: [...files.map((f) => f.name), ...referenceFiles.map((f) => f.name)],
    ...(referenceFiles.length ? { referenceFiles: referenceFiles.map((f) => f.name) } : {}),
    ...(decorated ? { operationManifest: manifestName } : {}),
    held: exportAnyway ? [] : gate.held,
    gateMessage: exportAnyway ? null : gate.message,
    readinessBanner: ready.banner,
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
  const dowelRefused = dowelExportRefusal([{ result, panels: chosen }], profile);
  if (dowelRefused) throw new Error(dowelRefused);
  const gate = exportGate([{ result, panels: chosen }], { profile });
  const panels = panelsThatGo(chosen, { gate, unitId: result.unitId || null, exportAnyway });
  const referenceFiles = buildOrnateReferenceFiles([{ result, panels: chosen }]);
  if (!panels.length && !referenceFiles.length) throw new Error(`Every selected part is held back: ${gate.message}`);

  const layout = layoutPanels(panels, result.drills, {
    gap: profile.cnc.layoutGap,
    rowWidth: profile.cnc.layoutRowWidth,
  });
  const presetId = presetOfSelection(result.panels, panels.map((p) => p.id));
  const dxf = sheetDxf({
    panels, drills: result.drills, layout, unitNum: result.unitNum, profile,
  });
  const filename = sheetDxfFileName(result.unitNum, presetId, { project });
  const said = (exported = null) => ({
    filename: exported ? exported.filename : filename,
    parts: panels.length,
    presetId,
    ...(exported ? { operationManifest: exported.operationManifest, ...(exported.referenceFiles?.length ? { referenceFiles: exported.referenceFiles } : {}) } : {}),
    held: exportAnyway ? [] : gate.held,
    gateMessage: exportAnyway ? null : gate.message,
    readinessBanner: withReferenceReadiness(exportReadiness(panels, result.drills), referenceFiles).banner,
  });
  // T76 F1 · GPT's two setups ride one ZIP, which JSZip builds asynchronously,
  // so a decorated selection answers with a Promise; an ordinary export stays
  // synchronous and its refusals above still THROW (T75 F23's gate).
  if (hasFrontDecorations([{ result, panels: chosen }])) {
    const args = { panels, drills: result.drills, layout, unitNum: result.unitNum, unitId: result.unitId || null, profile };
    return downloadFrontSetups({
      filename, backDxf: panels.length ? dxf : null, referenceFiles,
      frontDxf: hasFrontDecorations([{ panels }]) ? sheetDxf({ ...args, setup: 'front' }) : null,
      entries: [{ result, panels: chosen }], gate, exportAnyway,
      placements: frontSetupPlacements([args]),
      // T76 F5 · the package is a ZIP, so the banner rides it as a file, as
      // the unit ZIP's does.
      note: readinessNote(result.unitNum, withReferenceReadiness(exportReadiness(panels, result.drills), referenceFiles)),
    }).then(said);
  }
  download(filename, new Blob([dxf], { type: 'application/dxf' }));
  return said();
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
  const dowelRefused = dowelExportRefusal(entries, profile);
  if (dowelRefused) throw new Error(dowelRefused);
  const gate = exportGate(entries, { profile });
  const requested = materialExportSection(entries, { key, design, profile, materials });
  const manifestEntries = (requested?.blocks || []).map((block) => ({
    unit: block.unit, result: { unitNum: block.unitNum, drills: block.drills }, panels: block.panels,
  }));
  const referenceFiles = buildOrnateReferenceFiles(manifestEntries);
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
  if ((!section || !section.blocks.length) && !referenceFiles.length) {
    throw new Error(gate.ok
      ? 'Nothing on the sheet for that material.'
      : `Every part on this sheet is held back: ${gate.message}`);
  }

  const blocks = section?.blocks || [];
  const label = section?.label || requested?.label || 'Ornate-reference';
  const dxf = blocks.length ? materialSheetDxf({
    blocks, gap: profile.cnc.layoutGap, profile,
  }) : null;
  const filename = materialDxfFileName(label, { project });
  const said = (exported = null) => ({
    filename: exported ? exported.filename : filename,
    label,
    ...(exported ? { operationManifest: exported.operationManifest, ...(exported.referenceFiles?.length ? { referenceFiles: exported.referenceFiles } : {}) } : {}),
    parts: blocks.reduce((n, b) => n + b.panels.length, 0),
    units: blocks.length,
    held: exportAnyway ? [] : gate.held,
    gateMessage: exportAnyway ? null : gate.message,
    readinessBanner: withReferenceReadiness({ lines: blocks.flatMap((b) => exportReadiness(b.panels, b.drills).lines) }, referenceFiles).banner,
  });
  // T76 F1 · as the sheet export: a Promise only when the ZIP of two setups
  // is built; the refusals above throw synchronously (T75 F23).
  if (hasFrontDecorations(manifestEntries)) {
    const lines = blocks.flatMap((b) => exportReadiness(b.panels, b.drills).lines);
    return downloadFrontSetups({
      filename, backDxf: dxf, referenceFiles,
      frontDxf: hasFrontDecorations(blocks)
        ? materialSheetDxf({ blocks, gap: profile.cnc.layoutGap, profile, setup: 'front' }) : null,
      entries: manifestEntries, gate, exportAnyway,
      placements: frontSetupPlacements(blocks, profile.cnc.layoutGap),
      // T76 F5 · the banner rides the package as a file.
      note: readinessNote(label, withReferenceReadiness({ lines }, referenceFiles)),
    }).then(said);
  }
  download(filename, new Blob([dxf], { type: 'application/dxf' }));
  return said();
}

// A single download keeps the operation specification with both setups.
// Ordinary exports do not enter this path and keep their original DXF bytes.
async function downloadFrontSetups({ filename, backDxf, frontDxf, entries, gate, exportAnyway, placements, note = null, referenceFiles = [] }) {
  const zip = new JSZip();
  if (note) zip.file(filename.replace(/\.dxf$/, '-READINESS.txt'), note);
  const backName = filename.replace(/\.dxf$/, '-BACK.dxf');
  const frontName = filename.replace(/\.dxf$/, '-FRONT.dxf');
  const operationManifest = filename.replace(/\.dxf$/, '-operations.json');
  const files = [];
  if (backDxf) {
    files.push({ name: backName, setup: 'back' });
    zip.file(backName, backDxf);
  }
  for (const file of referenceFiles) {
    zip.file(file.name, file.contents);
    files.push(fileRecord(file));
  }
  if (frontDxf) {
    zip.file(frontName, frontDxf);
    files.push({ name: frontName, setup: 'front' });
  }
  zip.file(operationManifest, JSON.stringify(frontOperationsManifest(entries, {
    files, gate, exportAnyway, placements,
  }), null, 2));
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  const zipName = filename.replace(/\.dxf$/, '.zip');
  download(zipName, blob);
  return { filename: zipName, operationManifest, referenceFiles: referenceFiles.map((file) => file.name) };
}
