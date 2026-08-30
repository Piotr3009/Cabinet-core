// ─── TURN 48, CLAUDE.md F2: THE TOP INFILL IS A BOARD, AND THE SHEET CUTS TWO ─
//
// The owner, 25.08.2026, in full:
//
//   *"zamiast L shape … pomyslem zeby na wizualizacji tylko zrobic jedna deske
//   jak plinth i tyle. … infill pionowy nie ruszamy. natomiast na CNC robisz
//   tak: dlugosc infila poziomego nad szafa = rysujesz 2 deski = dlugosc infila
//   x 60 mm, plus 20 mm dluzsze na odciecie, z jednej strony."*
//   — on the widths: *"zostaw jedna 60 a druga nominal 80 bez zmian."*
//   — on the corner: *"jak zakreca i mamy infill z boku to sie robi mitre, ale
//     to rzadko."*
//   — and: *"nie rob adnotacji — stolarze wiedza."*
//
// Every guard the L had is updated where it stands, each with its own OVERRULED
// note and the quote (test/mitre, test/turn15-infill-mitre, test/run-infill,
// test/autoparts, test/turn47-f4). This file holds the NEW law, positively, and
// the four things about it that are easy to get wrong:
//
//   the ARITHMETIC   60 is `faceH + fillerOversize`, never a literal
//   the ONE END      +20 on the LENGTH, and the part says which end
//   the DEAD L       no 'long', no `mitre.L`, no chamfer inside a piece
//   the SANCTITY     the SIDE infill is not touched by one line

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { infillSolid } from '../src/engine/mitre.js';
import { buildBom } from '../src/engine/bom.js';
import { partLabelText, slopeNoteText } from '../src/engine/cnc/partLabel.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';

const T = P.autoParts.topInfill;
const OVER = P.autoParts.fillerOversize;

const BASE = {
  type: 'BUDTALL', width: 600, height: 2100, depth: 558, unit_num: '01',
};

const build = (over = {}, profile = P) => computeCabinet({ ...BASE, top_infill_mm: T.defaultHeight, ...over }, profile);
const byId = (r, id) => r.panels.find((p) => p.id === id);
const tops = (r) => r.panels.filter((p) => p.part === 'INFILL' && p.meta.side === 'top');

// ═══ ONE PLAIN RECTANGLE ════════════════════════════════════════════════════

test('the engine emits ONE board where the L used to be, and it is a rectangle', () => {
  const r = build();
  const boards = tops(r);
  assert.equal(boards.length, 1, 'one board');
  for (const p of boards) {
    assert.equal(p.cnc.outline.length, 4, `${p.id} is a rectangle`);
    assert.deepEqual(p.cnc.outline, [[0, 0], [p.w, 0], [p.w, p.h], [0, p.h]],
      `${p.id}: the outline IS the cut size — nothing taken off a corner`);
  }
});

test('BOARD A is (run + 20) × 60, and the 60 is ARITHMETIC', () => {
  const face = byId(build(), 'INFILL-T-FACE');
  assert.equal(face.w, 600 + OVER);
  assert.equal(face.h, T.defaultHeight + OVER, '40 + 20 = 60');
  // …which is the whole point of writing it as arithmetic: a project with a
  // different infill height computes its own 60, and a workshop that trims 25
  // gets 25 everywhere without anybody editing a literal.
  assert.equal(byId(build({ top_infill_mm: 55 }), 'INFILL-T-FACE').h, 55 + OVER);
  const P25 = { ...P, autoParts: { ...P.autoParts, fillerOversize: 25 } };
  assert.equal(byId(build({}, P25), 'INFILL-T-FACE').h, T.defaultHeight + 25);
});

test('there is no BOARD B — the shelf does not exist', () => {
  assert.equal(byId(build(), 'INFILL-T-SHELF'), undefined,
    'not in the room, not on the sheet, not in the bill');
});

// ═══ +20 ON THE LENGTH, ONE END, STATED ═════════════════════════════════════

test('the site cut is +20 on the LENGTH, on ONE end, and the part says which', () => {
  for (const p of tops(build())) {
    assert.deepEqual(p.meta.lengthOversize, { mm: OVER, end: 'right', nominal: 600 },
      `${p.id}: "plus 20 mm dluzsze na odciecie, z jednej strony"`);
    assert.equal(p.w - p.box.w, OVER, 'the blank is 20 longer than the piece that is fitted');
  }
});

test('…and it goes on the TURNING CORNER when there is one', () => {
  // An open LEFT end is the run turning the corner. That is the end that meets
  // its neighbour, so that is the end the allowance hangs off.
  const r = build({
    run_top_infill: {
      role: 'owner',
      offset: 0,
      length: 600,
      faceH: T.defaultHeight,
      ends: { left: 'open', right: 'wall' },
      returns: { left: 200 },
    },
  });
  assert.equal(byId(r, 'INFILL-T-FACE').meta.lengthOversize.end, 'left');
});

test('a BENT ceiling puts the allowance on each run\'s OUTER end, and nowhere else', () => {
  // Three segments: the first is scribed on the left, the last on the right,
  // and the one in the middle has two machine-cut joins and no allowance at all.
  const r = computeCabinet({
    ...BASE,
    width: 1200,
    top_infill_mm: T.defaultHeight,
    slope_cut: {
      pts: [{ x: 0, y: 2400 }, { x: 400, y: 2400 }, { x: 800, y: 2000 }, { x: 1200, y: 2000 }],
      infill: T.defaultHeight,
    },
  }, P);
  const faces = tops(r).filter((p) => p.meta.piece === 'face');
  assert.equal(faces.length, 3, 'one piece per segment, as T47 left it');
  assert.deepEqual(faces.map((p) => p.meta.lengthOversize?.end ?? null), ['left', null, 'right']);
});

test('NO ANNOTATION goes with it — "stolarze wiedza"', () => {
  // T47's own note (the WIDTH scribe) is what it was and is not printed twice;
  // the LENGTH allowance adds nothing to the sheet at all. The record is on the
  // part, where the machine and a later turn can read it.
  const face = byId(build(), 'INFILL-T-FACE');
  const note = slopeNoteText(face);
  assert.equal(note, `OVERSIZE +${OVER} — TRIM ON SITE (NOM ${T.defaultHeight})`,
    'exactly T47\'s sentence — no new words');
  assert.equal(note.includes('LENGTH'), false);
  assert.equal(slopeNoteText(face, { ascii: true }).includes('LENGTH'), false);
});

// ═══ THE CORNER L IS GONE FROM THE GEOMETRY ═════════════════════════════════

test('no 45° corner mitre inside a piece — not even against a side filler', () => {
  const r = build({
    side_infill_left_mm: 120,
    run_top_infill: {
      role: 'owner',
      offset: 0,
      length: 600,
      faceH: T.defaultHeight,
      ends: { left: 'infill', right: 'wall' },
      mitre: { left: T.defaultHeight },
      sideMitre: { left: T.defaultHeight },
    },
  });
  const face = byId(r, 'INFILL-T-FACE');
  assert.equal(face.cnc.outline.length, 4, 'a rectangle, corner or no corner');
  assert.equal(face.box.x, 0, 'and it does not run on over the filler to a long point');
  assert.equal(face.w, 600 + OVER, 'its blank is the run plus the site cut, not the run plus a mitre');
  // The number survives as a RECORD: this end turns, and by how much.
  assert.equal(face.meta.corner.left, T.defaultHeight);
});

test('`mitre_45` no longer says "long" anywhere on the top infill', () => {
  const cases = [
    {},
    { run_top_infill: { role: 'owner', offset: 0, length: 600, faceH: T.defaultHeight, ends: { left: 'open', right: 'open' }, returns: { left: 200, right: 200 } } },
    { slope_cut: { pts: [{ x: 0, y: 2400 }, { x: 600, y: 1800 }], infill: T.defaultHeight } },
  ];
  for (const over of cases) {
    for (const p of tops(build(over))) {
      assert.equal(p.meta.mitre_45.includes('long'), false, `${p.id}: the L is dead`);
      assert.equal(p.meta.mitre?.L, undefined, `${p.id}: and so is its 45`);
    }
  }
});

test('…and the 45 that SURVIVES is the turning corner, and the slope\'s own joins', () => {
  // 1 — a run walled at both ends turns nothing and mitres nothing.
  for (const p of tops(build())) assert.deepEqual(p.meta.mitre_45, []);

  // 2 — an OPEN end is two runs meeting. Both the main piece and the return
  //     carry 'end', which is the picture frame the owner calls rare.
  const turned = build({
    run_top_infill: {
      role: 'owner', offset: 0, length: 600, faceH: T.defaultHeight,
      ends: { left: 'open', right: 'wall' }, returns: { left: 200 },
    },
  });
  assert.ok(byId(turned, 'INFILL-T-FACE').meta.mitre_45.includes('end'));
  assert.deepEqual(byId(turned, 'INFILL-TL-FACE').meta.mitre_45, ['end']);

  // 3 — a bent ceiling joins segment to segment, at EXACTLY T47's angles: a
  //     flat run meeting a 45° fall makes 135°, so each piece is cut at 67.5.
  const bent = computeCabinet({
    ...BASE,
    width: 900,
    top_infill_mm: T.defaultHeight,
    slope_cut: { pts: [{ x: 0, y: 2000 }, { x: 300, y: 2000 }, { x: 900, y: 1400 }], infill: T.defaultHeight },
  }, P);
  const faces = tops(bent).filter((p) => p.meta.piece === 'face');
  assert.equal(faces[0].meta.mitre.right, 67.5);
  assert.equal(faces[1].meta.mitre.left, 67.5);
  for (const p of faces) assert.ok(p.meta.mitre_45.includes('end'));
});

// ═══ THE SCENE SHOWS ONE BOARD ══════════════════════════════════════════════

test('the scene shows ONE board, like the plinth', () => {
  const r = build();
  const face = byId(r, 'INFILL-T-FACE');
  assert.equal(byId(r, 'INFILL-T-SHELF'), undefined, 'there is no second board');
  // …and it is drawn as a plain box: nothing left for the mitre cutter to do.
  assert.equal(infillSolid(face), null);
});

test('…its face in the plane of the fronts, over the full run', () => {
  const r = build();
  const face = byId(r, 'INFILL-T-FACE');
  const front = r.panels.find((p) => p.part === 'FRONT');
  assert.equal(face.box.z + face.box.d, front.box.z + front.box.d,
    'the board and the doors finish in ONE plane, exactly as the plinth and the end panel do');
  assert.equal(face.box.x, 0);
  assert.equal(face.box.w, 600, 'the full run — the site cut is on the blank, not on the piece');
  assert.equal(face.box.y, 2100, 'standing on the carcass');
});

test('…and under a slope it LEANS, with the 25.08 tilt mechanism', () => {
  // T47-F4's own fixture: a 45° fall across a 600 wardrobe, 2000 → 1400.
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: '01',
    top_infill_mm: T.defaultHeight,
    slope_cut: { pts: [{ x: 0, y: 2000 }, { x: 600, y: 1400 }], infill: T.defaultHeight },
  }, P);
  const face = byId(r, 'INFILL-T-FACE');
  assert.equal(face.meta.tilt_deg, -45, 'a fall to the right leans clockwise — the SIGNED deg');
  assert.equal(face.meta.tilt_axis, 'z');
  assert.deepEqual(face.meta.tilt_pivot, { x: 600, y: 1400 }, 'the ceiling at the LOW end');
  assert.equal(face.cnc.outline.length, 4, 'one plain board, one lean — which is the point of the ruling');
  assert.equal(byId(r, 'INFILL-T-SHELF'), undefined, 'one board, full stop');
});

// ═══ CNC / DXF / BOM SPEAK IN ONE BOARD ═════════════════════════════════════

test('one outline, one label, one row', () => {
  const r = build();
  const boards = tops(r);

  assert.equal(boards.filter((p) => p.cnc?.outline?.length === 4).length, 1);

  const labels = boards.map((p) => partLabelText(r.unitNum, p));
  assert.deepEqual(labels, ['01 INFILL-T-FACE 620x60']);

  const rows = buildBom([{ unit: { id: 'u1', params: {} }, result: r }])
    .units.flatMap((u) => u.rows).filter((row) => String(row.id).startsWith('INFILL-T'));
  assert.equal(rows.length, 1);
  assert.deepEqual(rows.map((row) => [row.w, row.h]), [[620, 60]]);

  const files = buildUnitDxfFiles(r, P).filter((f) => f.name.includes('INFILL-T'));
  assert.equal(files.length, 1);
});

// ═══ THE SIDE INFILLS ARE NOT TOUCHED ═══════════════════════════════════════

test('the SIDE infill is not touched by one line — "infill pionowy nie ruszamy"', () => {
  const r = build({ side_infill_left_mm: 120, side_infill_right_mm: 120 });
  for (const id of ['INFILL-L-FACE', 'INFILL-L-ARM', 'INFILL-R-FACE', 'INFILL-R-ARM']) {
    const p = byId(r, id);
    assert.ok(p, `${id} is still cut`);
    assert.equal(p.meta.shape, 'L', `${id} is still an L`);
    assert.equal(p.meta.mitre.L, 45, `${id} keeps its own 45`);
  }
  // ─── …AND THE ONE THING T48 LEFT, WHICH T50-F11 FINISHED ─────────────────
  //
  // T48 asserted here that the filler "still loses its triangle", and raised
  // the consequence against itself in BACKLOG 122: the top board had become a
  // plain rectangle and the filler was still being cut at 45° on the machine
  // for a long point that no longer existed. CLAUDE.md T50-F11: *"Make the pair
  // agree: where the top is a plain board, the side that meets it is cut square
  // too."*
  //
  // Everything above this line is untouched — the filler is still an L, still
  // mitred 45 along its own two arms, still cut, still the same piece. What has
  // gone is the corner it used to lose to a joint the top board no longer makes.
  const cornered = computeCabinet({
    ...BASE,
    height: 2100,
    side_infill_left_mm: 120,
    run_top_infill: {
      role: 'owner', offset: 0, length: 600, faceH: 100,
      ends: { left: 'infill', right: 'wall' }, sideMitre: { left: 100 },
    },
  }, P);
  const filler = byId(cornered, 'INFILL-L-FACE');
  assert.equal(filler.cnc.outline.length, 4, 'a plain board, like the one it meets');
  assert.equal(filler.meta.corner, 100, 'and it still says which end turns, and by how much');
  // …and the board it meets is a plain rectangle too, which is the whole of
  // "the pair agree". (Its OWN corner number comes from `run_top_infill.mitre`,
  // which this fixture does not state — `sideMitre` is the filler's half.)
  const top = byId(cornered, 'INFILL-T-FACE');
  assert.equal(top.cnc.outline.length, 4, 'exactly as the top board is');
});
