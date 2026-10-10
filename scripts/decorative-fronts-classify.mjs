#!/usr/bin/env node
// Owner, 09.10.2026: editable defaults and decorative fronts including CNC.
// Name every source delta, prove the optional gate, and compare all six goldens.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dump } from './t64-classify.mjs';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { DECORATIVE_FRONT_STYLES, defaultFrontDecoration } from '../src/engine/frontDecoration.js';

const base = '7f2285a38993a157b897d45600035420fb414c58';
const root = new URL('../', import.meta.url);
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
export const LICENSED = {
  'src/3d/UnitView.jsx': 'Route opted-in fronts to canonical solids; attach applied strips to their moving host.',
  'src/3d/frontDecorationSolid.js': 'New solid builder for pockets, flutes, intersecting bores and applied strips.',
  'src/components/AssignMaterialsModal.jsx': 'Validate applied strip stock badges through the purchase material law.',
  'src/components/BomPanel.jsx': 'Display construction and manufacturing status from BOM data.',
  'src/components/CncTree.jsx': 'Await packaged front/back sheet and material downloads.',
  'src/components/CncView.jsx': 'Read-only front setup preview from the same vectors as DXF.',
  'src/components/FrontDecorationControls.jsx': 'Editable owner-authorised recipe controls.',
  'src/components/PartDetailModal.jsx': 'Canonical decorative legend colour.',
  'src/components/RightPanel.jsx': 'Unit style selection and recipe controls.',
  'src/components/SettingsPanel.jsx': 'Project and saved-style recipe persistence.',
  'src/components/WizardSettings.jsx': 'Material-slot recipe controls and saved styles.',
  'src/engine/bom.js': 'Distinct manufacturing identity and real strip quantities.',
  'src/engine/cabinet.js': 'Optional front_decoration pass after drilling; AM parts before totals.',
  'src/engine/cnc/dxf.js': 'Separate front setup vectors; existing back output retained.',
  'src/engine/cnc/exportGate.js': 'Hold invalid recipes and conflicting operation layers.',
  'src/engine/cnc/frontOperations.js': 'Single front export frame and explicit machining manifest.',
  'src/engine/design.js': 'Stable new style IDs and optional recipe cascade.',
  'src/engine/drawings/frontDecorationDrawing.js': 'Canonical decorative projection for elevations and part detail.',
  'src/engine/drawings/frontElevation.js': 'Draw the machining and applied strips that the engine now emits.',
  'src/engine/drawings/partDetail.js': 'Draw exact operation contours, depths and setup notes.',
  'src/engine/frontDecoration.js': 'Versioned canonical geometry, defaults and opposing-cut validation.',
  'src/engine/frontDecorationBom.js': 'Manufacturing identity, status and construction descriptions.',
  'src/engine/frontStyleArt.js': 'Gallery art for the three added style IDs.',
  'src/engine/materials.js': 'Separate thickness-correct material identity for applied strips.',
  'src/engine/partEdits.js': 'Revalidate decorated fronts after hand-added drilling.',
  'src/engine/partRegistry.js': 'Register actual FRONT-MOULDING cut parts for purchasing.',
  'src/engine/projectSettings.js': 'Keep optional recipes in the saved material palette.',
  'src/lib/cncExport.js': 'Package both setups and the operation specification.',
  'src/lib/exporters.js': 'Print decorative construction and status in BOM PDF.',
  'src/pages/ConfiguratorPage.jsx': 'Supply actual stock records to decorative strip export assignment warnings.',
  'src/retail/design/FrontThumb.jsx': 'Use shared style art, including the correct internal arch.',
  'src/retail/design/Options.jsx': 'Retail decorative selection and copied controls.',
  'src/retail/design/adapter.js': 'Persist recipes through the existing Retail update path.',
  'src/retail/design/detail/PartDetailModal.jsx': 'Scripted copy of the licensed PRO legend change.',
  'src/retail/design/material/FrontDecorationControls.jsx': 'Scripted copy of the PRO recipe controls.',
  'src/stores/projectStore.js': 'Resolve optional recipes and pass the active profile to edit validation.',
};

const changed = [...new Set([
  ...git('diff', '--name-only', base, '--', 'src'),
  ...git('ls-files', '--others', '--exclude-standard', 'src'),
])].sort();
const unnamed = changed.filter((path) => !LICENSED[path]);
assert.deepEqual(unnamed, [], 'Every source delta needs a named licence.');
const baseline = JSON.parse(readFileSync(new URL('../verify/t70/goldens-base.json', import.meta.url)));
const goldens = dump();
assert.deepEqual(goldens, baseline, 'A production golden changed.');
const decorativeGoldens = JSON.parse(readFileSync(new URL('../fixtures/golden-decorative-fronts.json', import.meta.url)));
for (const type of Object.keys(baseline)) {
  const params = defaultParamsFor(type, P);
  assert.equal(params.front_decoration, undefined);
  const result = computeCabinet(params, P);
  assert.ok(result.panels.every((panel) => !panel.meta?.frontDecoration && !panel.meta?.frontDecorationParent));
}
const recipes = DECORATIVE_FRONT_STYLES.map((style) => {
  const params = { ...defaultParamsFor('BUD', P), front_type: style };
  assert.ok(computeCabinet(params, P).panels.every((panel) => !panel.meta?.frontDecoration));
  const result = computeCabinet({ ...params, front_decoration: defaultFrontDecoration(style) }, P);
  const fronts = result.panels.filter((panel) => panel.meta?.frontDecoration);
  assert.ok(fronts.length > 0);
  assert.ok(fronts.every((panel) => panel.meta.frontDecoration.status === 'ready'), style);
  const cutParts = result.panels.filter((panel) => panel.meta?.frontDecoration || panel.meta?.frontDecorationParent);
  assert.equal(createHash('sha256').update(JSON.stringify(cutParts)).digest('hex'), decorativeGoldens[style].sha256, style);
  return { style, fronts: fronts.length, operations: fronts.reduce((sum, panel) => sum + panel.meta.frontDecoration.operations.length, 0), appliedParts: result.panels.filter((panel) => panel.meta?.frontDecorationParent).length };
});
console.log(JSON.stringify({ base, UNNAMED: unnamed.length, sourceChanges: changed.map((path) => ({ path, why: LICENSED[path] })), gate: 'params.front_decoration explicitly present; absent in all six fixtures', goldens, decorativeGoldens, recipes }, null, 2));
