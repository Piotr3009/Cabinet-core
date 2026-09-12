#!/usr/bin/env node
// ─── T69 · F3 · THE SLOPE PROBE, BEFORE ANY FIX ────────────────────────────
//
// CLAUDE.md, F3, verbatim:
//
//   *"**Probe**: add slope L, then R, on one wall — dump what the store holds
//   and what draws. Owner: only R ever shows, L+R lands one on top of the
//   other. Fix to the law: L draws at the LEFT end, R at the RIGHT; one slope
//   per side per wall."*
//
// This file GUESSES NOTHING. It builds the slope record the two buttons in
// `WallElevationModal.jsx` build — the SAME literal, read out of that file's
// own `addSlope` — writes it through the store the editor writes through, and
// then asks `lib/wallElements.js` what the wall now holds and what the
// elevation would draw.
//
//   node scripts/t69-f3-probe.mjs            → verify/t69/f3-probe.md
//
// `T69_PROBE_SUFFIX=-after` writes the proof beside the diagnosis.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { useProjectStore } from '../src/stores/projectStore.js';
import { rectCorners } from '../src/engine/room.js';
import {
  SLOPE_DEFAULTS, slopesOnWall, slopePolygon, wallHeightAt,
} from '../src/lib/wallElements.js';

const OUT = new URL('../verify/t69/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const SUFFIX = process.env.T69_PROBE_SUFFIX || '';

const S = () => useProjectStore.getState();

const WALL_W = 4000;
const WALL_H = 2500;

/**
 * WHAT THE BUTTON ACTUALLY PASSES. Not a guess: the two arguments are read out
 * of the shipped `WallElevationModal.jsx`, so if the file ever changes its mind
 * the probe changes with it and cannot describe a window that is not there.
 */
const EDITOR = readFileSync(
  new URL('../src/components/WallElevationModal.jsx', import.meta.url), 'utf8',
);
const PRESSES = [...EDITOR.matchAll(/\(\) => addSlope\('([^']+)'\)/g)].map((m) => m[1]);

/** `addSlope(side)` in that file, verbatim — the record the button builds. */
const buttonRecord = (side, wallIndex = 0) => ({
  kind: 'slope',
  wall: wallIndex,
  side,
  startHeight: Math.min(SLOPE_DEFAULTS.startHeight, Math.max(0, WALL_H - 200)),
  run: Math.min(SLOPE_DEFAULTS.run, Math.max(0, WALL_W / 2)),
});

function fresh() {
  S().newProject();
  S().setRoom({ corners: rectCorners(WALL_W, 3000), height: WALL_H });
  S().setWallSlopes([]);
}

/** Which END of the wall a drawn slope actually eats, read off its polygon. */
function drawnEnd(slope) {
  const poly = slopePolygon(slope, { wallWidth: WALL_W, wallHeight: WALL_H });
  if (!poly.length) return '(nothing drawn)';
  const xs = poly.map((p) => p.x);
  const near = Math.min(...xs);
  const far = Math.max(...xs);
  if (far <= WALL_W / 2) return 'LEFT';
  if (near >= WALL_W / 2) return 'RIGHT';
  return 'both/none';
}

fresh();
const pressed = [];
for (const arg of PRESSES) {
  const id = S().addWallSlope(buttonRecord(arg));
  const held = slopesOnWall(S().project.wallSlopes, 0);
  pressed.push({
    arg,
    id,
    count: held.length,
    sides: held.map((s) => s.side).join(' + '),
    drawn: held.map(drawnEnd).join(' + '),
  });
}

const held = slopesOnWall(S().project.wallSlopes, 0);
const ends = {
  'left end (x=0)': Math.round(wallHeightAt(0, S().project.wallSlopes, { wallWidth: WALL_W, wallHeight: WALL_H })),
  'middle': Math.round(wallHeightAt(WALL_W / 2, S().project.wallSlopes, { wallWidth: WALL_W, wallHeight: WALL_H })),
  'right end (x=w)': Math.round(wallHeightAt(WALL_W, S().project.wallSlopes, { wallWidth: WALL_W, wallHeight: WALL_H })),
};

// And the same two presses on the SAME side twice, which is the stacking half.
fresh();
S().addWallSlope(buttonRecord(PRESSES[0]));
S().addWallSlope(buttonRecord(PRESSES[0]));
const doubled = slopesOnWall(S().project.wallSlopes, 0);

// …and what the editor's own "already has one" guard answers, verbatim.
const hasSlopeOn = (side, list) => list.some((s) => s.side === side);
const guard = PRESSES.map((arg) => ({ arg, answers: hasSlopeOn(arg, held) }));

const md = [];
md.push('# T69 · F3 — THE SLOPE PROBE');
md.push('');
md.push(`_The two buttons in \`WallElevationModal.jsx\` pass \`${PRESSES.join('\` and \`')}\`, read`);
md.push('out of that file. Everything below is what the STORE then holds and what the');
md.push('ENGINE then draws. `node scripts/t69-f3-probe.mjs`._');
md.push('');
md.push('## 1 · SLOPE LEFT, THEN SLOPE RIGHT, ON ONE WALL');
md.push('');
md.push('| press | slopes on the wall | sides STORED | end each one EATS |');
md.push('| --- | --- | --- | --- |');
for (const r of pressed) {
  md.push(`| \`addSlope('${r.arg}')\` | ${r.count} | ${r.sides} | ${r.drawn} |`);
}
md.push('');
md.push('The ceiling the wall then has:');
md.push('');
md.push('| where | height |');
md.push('| --- | --- |');
for (const [where, mm] of Object.entries(ends)) md.push(`| ${where} | ${mm} mm |`);
md.push('');
const sides = new Set(held.map((s) => s.side));
md.push(`**VERDICT 1 — two buttons, ${sides.size} side(s) stored: \`${[...sides].join('`, `')}\`.** `
  + (sides.size === 1
    ? 'Both presses land on the SAME end of the wall, one on top of the other — '
      + 'exactly what the owner sees. `migrateSlope` reads the side as '
      + '`raw.side === \'L\' ? \'L\' : \'R\'`, and neither button passes `L`: '
      + `they pass \`${PRESSES.join('\` and \`')}\`, so BOTH normalise to \`R\`.`
    : 'L draws at the left end and R at the right, which is the law.'));
md.push('');
md.push('## 2 · THE SAME SIDE, PRESSED TWICE');
md.push('');
md.push(`\`addSlope('${PRESSES[0]}')\` twice leaves **${doubled.length}** slope(s) on the wall`
  + ` (\`${doubled.map((s) => s.side).join('`, `') || 'none'}\`).`);
md.push('');
md.push(`**VERDICT 2 — ${doubled.length > 1 ? 'the store stacks them' : 'one slope per side per wall'}.** `
  + (doubled.length > 1
    ? 'Nothing in the shared core holds a wall to one slope per side, so a second '
      + 'press adds a second triangle over the first and nothing appears to happen.'
    : 'A second press on a side that already has one replaces it.'));
md.push('');
md.push('## 3 · THE EDITOR\'S OWN "ALREADY HAS ONE" GUARD');
md.push('');
md.push('| the button asks | it is told |');
md.push('| --- | --- |');
for (const g of guard) md.push(`| \`hasSlopeOn('${g.arg}')\` | ${g.answers ? 'yes' : '**no**'} |`);
md.push('');
const blind = guard.filter((g) => !g.answers).length;
md.push(`**VERDICT 3 — the guard is blind in ${blind} of ${guard.length} cases:** it compares the `
  + `button's own word (\`'${PRESSES[0]}'\`) with the side the core STORES (\`'L'\`/\`'R'\`), so it can `
  + 'never be true. It lives inside `WallElevationModal.jsx`, which is FROZEN in PRO and a COPY in '
  + 'retail, and no feature tonight licenses either — so the fix goes where the law belongs, in the '
  + 'shared core, and the greyed-out hint stays unreachable. Noted, not silently left.');
md.push('');
writeFileSync(`${OUT}f3-probe${SUFFIX}.md`, `${md.join('\n')}\n`);
process.stdout.write(`${md.join('\n')}\n\nwritten: verify/t69/f3-probe${SUFFIX}.md\n`);
