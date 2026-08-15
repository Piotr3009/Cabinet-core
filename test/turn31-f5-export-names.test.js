// ─── F5: THE EXPORT NAMES THE PROJECT (turn 31, CLAUDE.md F5) ───────────────
//
// "`{ProjectName}-cnc-{DDMM-HHMM}.dxf` (sanitised), never `All-materials-cnc`
// again — nine identical filenames were half of yesterday's confusion. Same
// pattern for any other export the app writes."
//
// Nine identical filenames is the whole argument, and it is not a cosmetic
// complaint. A workshop exports the same sheet three times while it corrects
// something, opens a Downloads folder holding `All-materials-cnc.dxf`,
// `All-materials-cnc (1).dxf` and `All-materials-cnc (2).dxf`, and has no way
// on earth to tell which one goes on the machine. Two facts fix it and both
// were already in the app: WHICH JOB, and WHEN.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { exportFileName, exportStamp, fileSafeName } from '../src/engine/naming.js';
import { materialDxfFileName, sheetDxfFileName } from '../src/engine/cnc/dxf.js';
import { exportFilename } from '../src/lib/exporters.js';
import { bookletFilename, drawingFilename } from '../src/lib/drawingExport.js';
import { renderFilename } from '../src/engine/render.js';

const AT = new Date(2026, 7, 15, 21, 30);

test('the owner’s own pattern, verbatim', () => {
  assert.equal(
    exportFileName({ project: 'Hampstead kitchen', kind: 'cnc', ext: 'dxf', now: AT }),
    'Hampstead-kitchen-cnc-1508-2130.dxf',
  );
  assert.equal(exportStamp(AT), '1508-2130');
});

test('THE file he named: All-materials-cnc is gone', () => {
  // What it used to be, every single time.
  assert.equal(materialDxfFileName('All materials'), 'All-materials-cnc.dxf');
  // What it is now.
  const named = materialDxfFileName('All materials', { project: 'Hampstead kitchen', now: AT });
  assert.equal(named, 'Hampstead-kitchen-cnc-All-materials-1508-2130.dxf');
  // …and the material is still in it: the file says which board goes on the bed.
  assert.match(named, /All-materials/);
});

test('two exports in the same minute do not collide', () => {
  const a = materialDxfFileName('MFC 18 white', { project: 'Smith', now: AT });
  const b = materialDxfFileName('Oak veneer', { project: 'Smith', now: AT });
  assert.notEqual(a, b, 'the subject is what tells two sheets apart inside a minute');
  // …and the same sheet a minute later is a different file, which is the half
  // that ends the "(1)" and "(2)" suffixes.
  const later = materialDxfFileName('MFC 18 white', {
    project: 'Smith', now: new Date(2026, 7, 15, 21, 31),
  });
  assert.notEqual(a, later);
});

test('a name a joiner typed is SANITISED, not rejected', () => {
  assert.equal(
    exportFileName({ project: 'Smith / kitchen: phase 2', kind: 'cnc', ext: 'dxf', now: AT }),
    'Smith-kitchen-phase-2-cnc-1508-2130.dxf',
  );
  // Nothing that could be a path separator survives.
  const name = exportFileName({ project: '../../etc', kind: 'cnc', ext: 'dxf', now: AT });
  assert.ok(!name.includes('/'));
  assert.ok(!name.startsWith('.'));
  // An empty project name is still a file.
  assert.equal(
    exportFileName({ project: '', kind: 'cnc', ext: 'dxf', now: AT }),
    'project-cnc-1508-2130.dxf',
  );
  assert.equal(fileSafeName('01'), '01', 'an automatic name passes through untouched');
});

test('"the same pattern for any other export the app writes" — all of them', () => {
  // The unit sheet.
  assert.equal(
    sheetDxfFileName('W01', 'non-sprayed', { project: 'Smith', now: AT }),
    'Smith-cnc-W01-non-sprayed-1508-2130.dxf',
  );
  // The cutting list, and the project PDF.
  assert.equal(exportFilename('cutlist', 'csv', AT, 'Smith'), 'Smith-cutlist-1508-2130.csv');
  assert.equal(exportFilename('project', 'pdf', AT, 'Smith'), 'Smith-project-1508-2130.pdf');
  // The drawings and the booklet.
  assert.equal(
    drawingFilename({
      project: 'Smith', unit: 'W01', view: 'front-elevation', ext: 'svg', now: AT,
    }),
    'Smith-drawing-w01-front-elevation-1508-2130.svg',
  );
  assert.equal(bookletFilename({ project: 'Smith', now: AT }), 'Smith-unit-cards-1508-2130.pdf');
  // …and the render, which carried the DAY and not the minute — the same fault
  // with a longer fuse: three renders of one room on one afternoon collided.
  assert.equal(
    renderFilename({ project: 'Smith', subject: 'W01', date: AT }),
    'Smith-render-w01-1508-2130.png',
  );
  // …and every one of them carries the job and the minute.
  for (const name of [
    sheetDxfFileName('W01', 'custom', { project: 'Smith', now: AT }),
    materialDxfFileName('Oak', { project: 'Smith', now: AT }),
    exportFilename('cutlist', 'csv', AT, 'Smith'),
    drawingFilename({ project: 'Smith', unit: 'W01', ext: 'pdf', now: AT }),
    bookletFilename({ project: 'Smith', now: AT }),
  ]) {
    assert.ok(name.startsWith('Smith-'), name);
    assert.match(name, /1508-2130\./, name);
  }
});

test('nothing that writes a file builds its own name any more', () => {
  const SRC = new URL('../src/', import.meta.url).pathname;
  const walk = (dir) => readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : (/\.(js|jsx)$/.test(p) ? [p] : []);
  });
  const AUTHORITY = join(SRC, 'engine/naming.js');
  for (const path of walk(SRC)) {
    if (path === AUTHORITY) continue;
    const text = readFileSync(path, 'utf8');
    // A file that WRITES one — anything that builds a name with an extension on
    // it. A component that formats "last opened 15.08.2026 11:25" for the eye is
    // not naming a file and is none of this test's business.
    if (!/\.\$\{ext\}|\.(?:dxf|pdf|csv|zip|svg|png)['`]/.test(text)) continue;
    assert.ok(
      !/getMonth\(\)/.test(text),
      `${path.slice(SRC.length)} builds its own date stamp — use exportStamp()`,
    );
  }
});

test('the app hands the project down to every export it presses', () => {
  const read = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
  const tree = read('components/CncTree.jsx');
  assert.match(tree, /const projectName = useProjectStore\(\(s\) => s\.project\.name\)/);
  // All three of the CNC panel's buttons.
  assert.equal([...tree.matchAll(/project: projectName/g)].length, 3);
  const page = read('pages/ConfiguratorPage.jsx');
  assert.match(page, /project: project\.name/);
  assert.match(page, /exportCuttingListCsv\(allResults\(\), project\.name\)/);
});

test('an export with no project named still produces a working file', () => {
  // Nothing in the app calls them that way any more, and a name that throws
  // because an argument is missing is a worse failure than a dull name.
  assert.equal(materialDxfFileName('Oak'), 'Oak-cnc.dxf');
  assert.equal(sheetDxfFileName('01', 'custom'), '01-cnc-custom.dxf');
  assert.match(exportFilename('cutlist', 'csv', AT), /^cabinetcore-cutlist-1508-2130\.csv$/);
});
