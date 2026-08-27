// ─── F10'S SCOPE FENCE, MEASURED (turn 53, CLAUDE.md F10) ───────────────────
//
// CLAUDE.md draws the fence itself, and this script is how the night stays
// inside it honestly rather than by assertion:
//
//   *"A 4-corner rectangle drawn this way must be FLAWLESS end to end: drawn,
//   closed, saved, furnished, exported. More than 4 corners is BEST-EFFORT:
//   the drawing, closing, saving and wall elevations must work for any closed
//   rectilinear outline; where DOWNSTREAM (placement, collision, share-out,
//   exports) breaks on a >4-wall room, it is skip-and-note per breakage — a
//   numbered finding each, not a reason to halt and not tonight's to fix."*
//
// So: the same walk twice — once on the drawn rectangle, once on a drawn
// SIX-wall room — and every downstream stage answered with a number rather
// than a shrug. What passes on four and fails on six is a finding with an
// index; what fails on both is a bug tonight owns.
//
//   node scripts/t53-f10-downstream.mjs                 print
//   node scripts/t53-f10-downstream.mjs --write PATH    …and file it

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, roomWalls, rectCorners } from '../src/engine/room.js';
import { getCabinetProfile } from '../src/engine/profile.js';
import { runChecks } from '../src/engine/checks.js';
import {
  newPath, addSegment, closePath, cornersOfPath, pathFaults,
} from '../src/engine/drawRoom.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';

const S = () => useProjectStore.getState();

/** Draw a room the way the modal does: direction, millimetres, Enter. */
export function draw(segments) {
  let p = newPath();
  for (const [dir, len] of segments) {
    const res = addSegment(p, dir, len);
    if (res.error) throw new Error(res.error);
    p = res.path;
  }
  const home = closePath(p);
  if (home.error) throw new Error(home.error);
  return { path: home.path, added: home.added, corners: cornersOfPath(home.path) };
}

/** One room, walked end to end. Every stage answers, none throws. */
export function walk(name, segments) {
  const out = { name, stages: [] };
  const say = (stage, ok, detail) => out.stages.push({ stage, ok, detail });

  let drawn = null;
  try {
    drawn = draw(segments);
    const faults = pathFaults(drawn.path);
    say('draw + close', faults.length === 0,
      `${drawn.corners.length} corners, ${drawn.added} wall(s) home, ${faults.length} fault(s)`);
  } catch (e) {
    say('draw + close', false, e.message);
    return out;
  }

  // SAVE — the corner list `migrateRoom` already speaks.
  S().loadProject({
    id: null, name: `T53 F10 · ${name}`, number: '53', client: 'the owner',
    room: migrateRoom({ height: 2500, corners: rectCorners(3000, 2000) }), design: {},
  }, []);
  const verdict = S().setRoom({ corners: drawn.corners });
  say('save to project.room.corners', Boolean(verdict?.ok), verdict?.ok ? 'applied' : (verdict?.message || 'refused'));

  const walls = roomWalls(migrateRoom(S().project.room));
  say('roomWalls', walls.length === drawn.corners.length,
    `${walls.length} walls: ${walls.map((w) => Math.round(w.width)).join(' / ')} mm`);

  // WALL ELEVATIONS — what the editor reads for each wall it is handed.
  const elev = walls.map((w, i) => (w.width > 0 && Number(S().project.room.height) > 0 ? null : i + 1))
    .filter((v) => v !== null);
  say('every wall has an elevation', elev.length === 0,
    elev.length ? `walls ${elev.join(', ')} have none` : `${walls.length} of ${walls.length}`);

  // FURNISH — a cabinet on the first wall, one on the last, and a run of three.
  const first = S().addUnit('BUD');
  say('place on wall 1', Boolean(first.id), first.id ? 'placed' : first.error);
  let last = first.id;
  for (let i = 0; i < 2 && last; i += 1) {
    const nxt = S().addUnit('BUD', { near: last, side: 'R' });
    if (!nxt.id) { last = null; say(`run: cabinet ${i + 2}`, false, nxt.error); break; }
    last = nxt.id;
  }
  if (last) say('a run of three', true, `${S().units.length} cabinets`);

  // …and one on the LAST wall, which is the >4 case's own question.
  const far = S().addUnit('BUD');
  if (far.id) {
    const moved = S().setUnitWall(far.id, walls.length - 1);
    say(`place on wall ${walls.length}`, !moved?.error && !moved?.blocked,
      moved?.error || `x = ${Math.round(moved?.x_mm ?? 0)} mm`);
  } else {
    say(`place on wall ${walls.length}`, false, far.error);
  }

  // COLLISION — the store's own guard, asked to do the thing it forbids.
  const ids = S().units.map((u) => u.id);
  if (ids.length >= 2) {
    const a = S().units[0];
    const onto = S().moveUnit(ids[1], Number(a.position.x_mm), 0, { magnet: false });
    const after = S().units.find((u) => u.id === ids[1]);
    const overlapping = Math.abs(Number(after.position.x_mm) - Number(a.position.x_mm)) < 1
      && (after.position.wall ?? 0) === (a.position.wall ?? 0);
    say('collision refused', !overlapping, overlapping ? 'TWO CABINETS IN ONE PLACE' : `held at ${Math.round(after.position.x_mm)} mm${onto?.blocked ? ' (blocked)' : ''}`);
  }

  // SHARE-OUT — the gate F1 fixed, asked of this room.
  const view = S().shareOutView(ids[0]);
  say('share-out resolves', view === null || typeof view === 'object',
    view?.plan?.ok ? `offers ${view.plan.each} mm each` : (view ? 'stands, nothing to offer' : 'no offer'));

  // CHECKS — the panel, run over the whole job.
  try {
    const findings = runChecks({
      units: S().units,
      room: S().project.room,
      design: S().project.design,
      profile: getCabinetProfile(),
    });
    const bad = findings.filter((f) => f.level === 'error');
    say('checks run', true, `${findings.length} finding(s), ${bad.length} error(s)${bad.length ? `: ${bad.map((f) => f.check).join(', ')}` : ''}`);
  } catch (e) {
    say('checks run', false, e.message);
  }

  // EXPORT — the DXF, which is F2's own subject and the machine's only input.
  try {
    const P = getCabinetProfile();
    let files = 0;
    let entities = 0;
    for (const u of S().units) {
      for (const f of buildUnitDxfFiles(S().unitCncResult(u.id), P, {})) {
        files += 1;
        // DXF is CRLF (R12, and VCarve's parser is strict about it), so the
        // entity name is counted on its own line however the line ends.
        entities += (f.dxf.match(/^(POLYLINE|CIRCLE|LINE|TEXT)\r?$/gm) || []).length;
      }
    }
    say('DXF export', files > 0 && entities > 0, `${files} file(s), ${entities} entit(y|ies)`);
  } catch (e) {
    say('DXF export', false, e.message);
  }

  return out;
}

export function report() {
  const rect = walk('the drawn RECTANGLE (4 walls)', [['E', 4000], ['S', 3000], ['W', 4000]]);
  const six = walk('the drawn L (6 walls)', [['E', 4000], ['S', 1500], ['E', 2000], ['S', 2500], ['W', 6000]]);
  let out = 'T53 · F10 — THE SCOPE FENCE, MEASURED\n\n';
  const findings = [];
  for (const room of [rect, six]) {
    out += `${room.name}\n`;
    for (const st of room.stages) {
      out += `  ${st.ok ? 'ok  ' : 'FAIL'}  ${st.stage.padEnd(32)}${st.detail}\n`;
      if (!st.ok) findings.push(`${room.name} · ${st.stage}: ${st.detail}`);
    }
    out += '\n';
  }
  const rectBad = rect.stages.filter((s) => !s.ok);
  out += rectBad.length
    ? `THE RECTANGLE IS NOT FLAWLESS — ${rectBad.length} stage(s) failed, and F10's fence says it must be.\n`
    : 'THE RECTANGLE IS FLAWLESS end to end: drawn, closed, saved, furnished, checked, exported.\n';
  const sixBad = six.stages.filter((s) => !s.ok);
  out += sixBad.length
    ? `THE SIX-WALL ROOM: ${sixBad.length} downstream stage(s) break — skip-and-note, one numbered finding each.\n`
    : 'THE SIX-WALL ROOM: nothing downstream broke — best-effort came out whole.\n';
  if (findings.length) {
    out += '\nFINDINGS\n';
    findings.forEach((f, i) => { out += `  ${i + 1}. ${f}\n`; });
  }
  return { out, findings, rectBad: rectBad.length, sixBad: sixBad.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { out, rectBad } = report();
  process.stdout.write(out);
  const i = process.argv.indexOf('--write');
  if (i >= 0 && process.argv[i + 1]) {
    mkdirSync(dirname(process.argv[i + 1]), { recursive: true });
    writeFileSync(process.argv[i + 1], out);
    process.stdout.write(`\n→ ${process.argv[i + 1]}\n`);
  }
  // The RECTANGLE is the promise; the six-wall room is best-effort.
  process.exit(rectBad ? 1 : 0);
}
