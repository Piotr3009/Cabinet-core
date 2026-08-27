#!/usr/bin/env node
// ─── THE DXF EXPORT, OPENED (turn 53, CLAUDE.md F2) ─────────────────────────
//
// The handover, standing five days (22–26.08):
//
//   *"DXF eksport PUSTY — bez tego CNC nie dostaje nic."*
//
// CLAUDE.md F2: *"A green suite that never opened the file is exactly how this
// stayed broken for five days."*  So this script OPENS THE FILES. It builds the
// seeded job the feature asks for — a real one, through the store, never
// fabricated catalogue rows — exports it by all three paths the app offers, and
// then reads every byte back with a DXF reader that knows nothing about this
// engine:
//
//   * the file parses as R12 group-code pairs, with no odd line and no blank
//     value (one blank value shifts every pair after it and the file is
//     garbage from there down — the classic way a DXF opens EMPTY);
//   * its ENTITIES section is not empty;
//   * its `$EXTMIN`/`$EXTMAX` match the part's own `cnc` outline, within
//     tolerance — so the file is of the part the engine says it is;
//   * every hole the engine put on that part is a CIRCLE in the file, at the
//     engine's own millimetre and diameter;
//   * every layer an entity stands on is declared in the LAYER table;
//   * no two parts of a unit share a file name — a ZIP entry written twice is
//     ONE entry, and the machine silently never gets the second part.
//
// That last one is what tonight FOUND, and it is a part the CNC really did not
// get: a drawer shoe box hinged both sides cuts two battens and both were
// called `SHOE1-BATTEN`. See `src/engine/cabinet.js` and the verdict.
//
// Usage:
//     node scripts/t53-dxf-audit.mjs                     # audit, exit code
//     node scripts/t53-dxf-audit.mjs --write verify/t53/dxf   # …and keep them
//
// Zero dependencies: the store, the engine, and node's own fs.

import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { exportablePanels } from '../src/engine/cnc/groups.js';
import { buildUnitDxfFiles, sheetDxf, materialSheetDxf } from '../src/engine/cnc/dxf.js';
import { layoutPanels } from '../src/engine/cnc/layout.js';
import { materialExportSection } from '../src/engine/cnc/views.js';

// ─── AN INDEPENDENT READER ──────────────────────────────────────────────────
//
// Deliberately NOT `engine/cnc/dxf.js parseDxf`: a writer proof-read by its own
// reader proves that the two agree, which is not the question. This one knows
// only the R12 spec — pairs of lines, code then value, sections, tables,
// entities — and it is the whole of what a CAM package does before it draws.

/** Every (code, value) pair in the file, or a fault if the file is not pairs. */
export function readPairs(text) {
  const lines = String(text).split('\r\n');
  // The writer ends with a trailing CRLF, so the last element is an empty
  // string that is not a line.
  const body = lines[lines.length - 1] === '' ? lines.slice(0, -1) : lines;
  const faults = [];
  if (body.length % 2 !== 0) faults.push(`odd number of lines (${body.length}) — this file is not code/value pairs`);
  const pairs = [];
  for (let i = 0; i + 1 < body.length; i += 2) {
    const code = body[i].trim();
    if (!/^-?\d+$/.test(code)) {
      faults.push(`line ${i + 1} is "${body[i]}" where a group code was expected`);
      break;
    }
    // A blank VALUE is legal for a few string codes but is the single likeliest
    // way a naive writer desynchronises a reader, so it is reported.
    if (body[i + 1] === '') faults.push(`line ${i + 2} is a blank value after group ${code}`);
    pairs.push([Number(code), body[i + 1]]);
  }
  return { pairs, faults };
}

/** What is IN the file: tables, layers, entities, extents, texts, circles. */
export function readDxf(text) {
  const { pairs, faults } = readPairs(text);
  const out = {
    faults: [...faults],
    tables: [],
    layersDeclared: new Set(),
    layersUsed: new Set(),
    entities: {},
    circles: [],
    texts: [],
    polys: 0,
    extents: null,
    acadver: null,
  };
  let section = null;
  let table = null;
  let entity = null;
  let header = null;
  let circle = null;
  const min = [null, null];
  const max = [null, null];
  for (let i = 0; i < pairs.length; i += 1) {
    const [code, value] = pairs[i];
    if (code === 0) {
      if (circle) { out.circles.push(circle); circle = null; }
      if (value === 'SECTION') { section = pairs[i + 1]?.[1] || null; continue; }
      if (value === 'ENDSEC') { section = null; table = null; entity = null; continue; }
      if (section === 'TABLES') {
        if (value === 'TABLE') { table = pairs[i + 1]?.[1] || null; out.tables.push(table); continue; }
        if (value === 'ENDTAB') { table = null; continue; }
        if (value === 'LAYER' && table === 'LAYER') { out.layersDeclared.add(pairs[i + 1]?.[1]); continue; }
        continue;
      }
      if (section === 'ENTITIES') {
        entity = value;
        out.entities[value] = (out.entities[value] || 0) + 1;
        if (value === 'POLYLINE') out.polys += 1;
        if (value === 'CIRCLE') circle = { layer: null, x: null, y: null, r: null };
        if (value === 'TEXT') out.texts.push({ layer: null, str: null });
        continue;
      }
      continue;
    }
    if (section === 'HEADER') {
      if (code === 9) { header = value; continue; }
      if (header === '$ACADVER' && code === 1) out.acadver = value;
      if (header === '$EXTMIN' && code === 10) min[0] = Number(value);
      if (header === '$EXTMIN' && code === 20) min[1] = Number(value);
      if (header === '$EXTMAX' && code === 10) max[0] = Number(value);
      if (header === '$EXTMAX' && code === 20) max[1] = Number(value);
      continue;
    }
    if (section === 'ENTITIES') {
      if (code === 8) {
        out.layersUsed.add(value);
        if (circle) circle.layer = value;
        if (entity === 'TEXT' && out.texts.length) out.texts[out.texts.length - 1].layer = value;
      }
      if (circle && code === 10) circle.x = Number(value);
      if (circle && code === 20) circle.y = Number(value);
      if (circle && code === 40) circle.r = Number(value);
      if (entity === 'TEXT' && code === 1 && out.texts.length) out.texts[out.texts.length - 1].str = value;
    }
  }
  if (circle) out.circles.push(circle);
  if (min[0] != null && max[0] != null) out.extents = { min, max };
  return out;
}

/** The bounding box of a part's own CNC geometry, in the part's own frame. */
export function cncExtents(panel, drills = []) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  const hit = (x, y) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };
  for (const [x, y] of panel.cnc?.outline || []) hit(x, y);
  for (const p of panel.cnc?.pockets || []) {
    if (Array.isArray(p.pts)) for (const [x, y] of p.pts) hit(x, y);
    else { hit(p.x1, p.y1); hit(p.x2, p.y2); }
  }
  for (const d of drills.filter((h) => h.panel === panel.id)) {
    hit(d.x - d.d / 2, d.y - d.d / 2); hit(d.x + d.d / 2, d.y + d.d / 2);
  }
  return Number.isFinite(minX) ? { min: [minX, minY], max: [maxX, maxY] } : null;
}

// ─── THE SEEDED JOB ─────────────────────────────────────────────────────────
//
// *"a real one — a run of BUD/BUDR with drawers, one wardrobe with a slope, a
// shoe box, one watch drawer; never fabricated catalogue rows."*  Built through
// the STORE, which is the same door the Library uses.

export const WALL = 6000;

export function seedProject() {
  const store = useProjectStore.getState();
  store.loadProject({
    id: null,
    name: 'T53 seed',
    number: '53',
    client: 'the owner',
    room: migrateRoom({ height: 2500, corners: rectCorners(WALL, 3000) }),
    design: {},
  }, []);
  const S = () => useProjectStore.getState();
  const a = S().addUnit('BUD');
  const b = S().addUnit('BUDR', { near: a.id, side: 'R' });
  const w = S().addUnit('WARDROBE', { near: b.id, side: 'R' });
  // A slope over the wardrobe's end of the wall.
  S().addWallSlope({
    wall: 0, side: 'R', startHeight: 1900, run: 900,
  });
  // …drawers and the WATCH DRAWER inside it, which is where they go.
  const wu = S().units.find((u) => u.id === w.id);
  S().updateUnitParams(w.id, {
    sections: [{
      width_mm: Number(wu.params.width) || 600,
      items: [
        { id: 'dw1', kind: 'drawer', index: 1, height_mm: 200 },
        { id: 'dw2', kind: 'drawer', index: 2, height_mm: 220, watch_insert: true },
      ],
    }],
  });
  // …and a SECOND wardrobe, doors on, with the SHOE BOX in it. Two cabinets
  // rather than one because the two features live on different cabinets in a
  // real job: a wardrobe whose section is a drawer stack has no doors, and the
  // shoe box's battens exist only where a side is HINGED. Putting them on one
  // cabinet would have hidden the very part that never reached the machine.
  const s = S().addUnit('WARDROBE', { near: w.id, side: 'R' });
  if (!s.id) throw new Error(`the seed could not place the shoe-box wardrobe: ${s.error}`);
  const su = S().units.find((u) => u.id === s.id);
  S().updateUnitParams(s.id, {
    // DOORS ON. The shoe box's battens exist only where a side is HINGED — the
    // runner has to screw into something (`engine/shoeBox.js`, the owner's
    // chat-fix of 16.08) — and a wardrobe the store adds has its doors off. A
    // shoe box behind doors is what the owner draws, and it is the only shape
    // that cuts the two battens tonight's fix names apart.
    doors: true,
    // …and 900 wide, so BOTH sides are hinged and the box cuts TWO battens.
    // That is the pair that shared one file name until tonight.
    width: 900,
    sections: [{
      width_mm: 900,
      items: [{ id: 'sb1', kind: 'shoe_box', variant: 'D', dividers: 1 }],
    }],
  });
  return { ids: [a.id, b.id, w.id, s.id], store: S };
}

/** Every export the app can write for this job, as { name, dxf } records. */
export function exportEverything() {
  const { ids, store } = seedProject();
  const files = [];
  const units = [];
  for (const id of ids) {
    const unit = store().units.find((u) => u.id === id);
    const result = store().unitCncResult(id);
    const panels = exportablePanels(result.panels);
    units.push({ unit, result, panels });
    // 1 — the per-unit ZIP's contents, part by part.
    for (const f of buildUnitDxfFiles(result, P, {})) {
      files.push({ ...f, kind: 'part', unitNum: result.unitNum, result });
    }
    // 2 — the one-file sheet, exactly as the preview lays it out.
    const layout = layoutPanels(panels, result.drills, {
      gap: P.cnc.layoutGap, rowWidth: P.cnc.layoutRowWidth,
    });
    files.push({
      name: `${result.unitNum}-sheet.dxf`,
      kind: 'sheet',
      unitNum: result.unitNum,
      result,
      dxf: sheetDxf({
        panels, drills: result.drills, layout, unitNum: result.unitNum, profile: P,
      }),
    });
  }
  // 3 — one board, every cabinet: the by-material export.
  const entries = units.map((u) => ({ unit: u.unit, result: u.result, panels: u.panels }));
  const section = materialExportSection(entries, {
    key: 'all', design: null, profile: P, materials: [],
  });
  if (section?.blocks?.length) {
    files.push({
      name: 'all-materials.dxf',
      kind: 'material',
      unitNum: null,
      result: null,
      dxf: materialSheetDxf({ blocks: section.blocks, gap: P.cnc.layoutGap, profile: P }),
    });
  }
  return { units, files };
}

// ─── THE AUDIT ──────────────────────────────────────────────────────────────

const TOL = 0.05;

/** Every complaint the files have, as plain sentences. */
export function auditFiles({ units, files }) {
  const faults = [];
  const rows = [];

  // A name written twice is a ZIP entry written once (see the header).
  for (const { unit, result, panels } of units) {
    const seen = new Map();
    for (const f of buildUnitDxfFiles(result, P, {})) {
      seen.set(f.name, (seen.get(f.name) || 0) + 1);
    }
    for (const [name, n] of seen) {
      if (n > 1) {
        faults.push(`${result.unitNum}: ${n} parts are all called ${name} — a ZIP keeps ONE of them`);
      }
    }
    const ids = new Map();
    for (const p of result.panels) ids.set(p.id, (ids.get(p.id) || 0) + 1);
    for (const [id, n] of ids) {
      if (n > 1) faults.push(`${result.unitNum}: ${n} panels share the id ${id}`);
    }
    if (!panels.length) faults.push(`${unit.type} ${result.unitNum} has no exportable part at all`);
  }

  for (const f of files) {
    const read = readDxf(f.dxf);
    const geometry = (read.entities.POLYLINE || 0) + (read.entities.CIRCLE || 0)
      + (read.entities.ARC || 0) + (read.entities.LINE || 0);
    const row = {
      name: f.name,
      kind: f.kind,
      bytes: f.dxf.length,
      geometry,
      circles: read.circles.length,
      texts: read.texts.length,
      ok: true,
    };
    for (const fault of read.faults) { faults.push(`${f.name}: ${fault}`); row.ok = false; }
    if (read.acadver !== 'AC1009') { faults.push(`${f.name}: $ACADVER is ${read.acadver}, not AC1009`); row.ok = false; }
    if (!geometry) { faults.push(`${f.name}: the ENTITIES section carries no geometry — this file IS empty`); row.ok = false; }
    for (const layer of read.layersUsed) {
      if (!read.layersDeclared.has(layer)) {
        faults.push(`${f.name}: entities stand on layer ${layer}, which the LAYER table never declares`);
        row.ok = false;
      }
    }
    // A PART file is of ONE part, so it can be held to that part's own geometry.
    if (f.kind === 'part' && f.panelId) {
      const panel = f.result.panels.find((p) => p.id === f.panelId);
      const want = panel ? cncExtents(panel, f.result.drills) : null;
      if (want && read.extents) {
        const off = [
          Math.abs(read.extents.min[0] - want.min[0]), Math.abs(read.extents.min[1] - want.min[1]),
          Math.abs(read.extents.max[0] - want.max[0]), Math.abs(read.extents.max[1] - want.max[1]),
        ];
        // The label is a TEXT and TEXT counts toward the writer's own extents,
        // so the file may be WIDER than the cut — never narrower.
        const short = read.extents.min[0] > want.min[0] + TOL
          || read.extents.min[1] > want.min[1] + TOL
          || read.extents.max[0] < want.max[0] - TOL
          || read.extents.max[1] < want.max[1] - TOL;
        if (short) {
          faults.push(`${f.name}: $EXTMIN/$EXTMAX ${JSON.stringify(read.extents)} does not cover the part's own cnc geometry ${JSON.stringify(want)} (off by ${off.map((v) => v.toFixed(2)).join('/')})`);
          row.ok = false;
        }
        row.extents = `${want.min.map((v) => Math.round(v)).join(',')} → ${want.max.map((v) => Math.round(v)).join(',')}`;
      } else if (!read.extents) {
        faults.push(`${f.name}: no $EXTMIN/$EXTMAX at all`);
        row.ok = false;
      }
      // Every hole the ENGINE says is on this part must be a CIRCLE in the file.
      const holes = (f.result.drills || []).filter((d) => d.panel === f.panelId);
      for (const h of holes) {
        const hit = read.circles.find((c) => Math.abs(c.x - h.x) <= TOL
          && Math.abs(c.y - h.y) <= TOL && Math.abs(c.r - h.d / 2) <= TOL);
        if (!hit) {
          faults.push(`${f.name}: the engine drills ⌀${h.d} at ${h.x},${h.y} and the file has no such circle`);
          row.ok = false;
          break;
        }
      }
      row.holes = holes.length;
    }
    rows.push(row);
  }
  return { rows, faults };
}

/**
 * THE SLOPE NOTE — CLAUDE.md F2: *"the slope note text where F3/F4 give a piece
 * an angle."*  A piece cut on the rake carries its angle in the part label
 * (`engine/cnc/partLabel.js slopeNoteText`), and that note has to reach the
 * FILE, not only the sheet. Where the seeded job has no sloped piece the answer
 * is honestly "none", which is a count and not a pass.
 */
export function slopeNotes({ files }) {
  const notes = [];
  for (const f of files) {
    for (const t of readDxf(f.dxf).texts) {
      if (t.str && /[°]|slope|SL /i.test(t.str)) notes.push({ file: f.name, text: t.str });
    }
  }
  return notes;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const writeAt = argv.indexOf('--write');
  const out = writeAt >= 0 ? (argv[writeAt + 1] || 'verify/t53/dxf') : null;

  const exported = exportEverything();
  const { rows, faults } = auditFiles(exported);
  const notes = slopeNotes(exported);

  process.stdout.write('THE DXF EXPORT, OPENED — the seeded job, every file read back\n\n');
  process.stdout.write(`${'file'.padEnd(30)}${'kind'.padEnd(10)}${'bytes'.padStart(8)}${'geom'.padStart(7)}${'holes'.padStart(7)}${'texts'.padStart(7)}\n`);
  for (const r of rows) {
    process.stdout.write(
      `${r.name.padEnd(30)}${r.kind.padEnd(10)}${String(r.bytes).padStart(8)}`
      + `${String(r.geometry).padStart(7)}${String(r.holes ?? '').padStart(7)}${String(r.texts).padStart(7)}`
      + `${r.ok ? '' : '   ←'}\n`,
    );
  }
  const bytes = rows.reduce((n, r) => n + r.bytes, 0);
  const geom = rows.reduce((n, r) => n + r.geometry, 0);
  process.stdout.write(`\n${rows.length} files, ${bytes} bytes, ${geom} geometry entities, `
    + `${rows.reduce((n, r) => n + (r.holes || 0), 0)} drillings matched to the engine's own.\n`);
  process.stdout.write(`slope notes in the files: ${notes.length}${notes.length ? ` — ${notes.slice(0, 3).map((n) => n.text).join(' · ')}` : ''}\n`);

  if (out) {
    rmSync(out, { recursive: true, force: true });
    mkdirSync(out, { recursive: true });
    for (const f of exported.files) writeFileSync(join(out, f.name), f.dxf);
    process.stdout.write(`\nwritten to ${out}/ — ${exported.files.length} files\n`);
  }

  if (faults.length) {
    process.stdout.write(`\n${faults.length} FAULT(S):\n`);
    for (const f of faults) process.stdout.write(`  ← ${f}\n`);
  } else {
    process.stdout.write('\nCLEAN — every file parses, carries geometry, covers its own part, '
      + 'declares every layer it stands on, and no two parts share a name.\n');
  }
  process.exit(faults.length ? 1 : 0);
}
