// T78 F20 (PART E): the CABINEO LISP, reference/lisp/SKYLON_JOINTS_CABINEO.lsp.
//
// CLAUDE.md T78 F20: "LISP FIRST: reference/lisp/SKYLON_JOINTS_CABINEO.lsp
// reads cabineo.json's numbers and draws the pocket (by the chosen machining
// option), the counterpart hole and the cap recess, board by board; the engine
// mirrors it for cabineo8 / cabineo12". This test holds the LISP to the data
// file it restates (reference/hardware/cabineo/cabineo.json) and re-computes
// its NUMBERS block (section H) by the rule the file states (section B), so
// the engine mirror that follows has one set of numbers to land on. Pure: it
// reads two files and imports no engine code.
//
// No em or en dash anywhere in the LISP (AutoCAD's loader wants ASCII and
// CLAUDE.md wants no dash); the paren walk of test/turn35-lisp-parens.test.js
// covers balance for every file in the folder, and is repeated here by name
// so a deleted file fails by name.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const LISP = fileURLToPath(new URL('../reference/lisp/SKYLON_JOINTS_CABINEO.lsp', import.meta.url));
const JSON_PATH = fileURLToPath(new URL('../reference/hardware/cabineo/cabineo.json', import.meta.url));
const text = readFileSync(LISP, 'utf8');
const sheet = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
/** The LISP's prose with the comment prefixes and line wraps folded away, for sentences that wrap. */
const flat = text.replace(/\n;;;+\s*/g, ' ').replace(/\s+/g, ' ');

/** The turn 35 stripper, repeated: strings and comments hold no paren. */
function parenScan(src) {
  let depth = 0; let min = 0; let open = 0; let inString = false; let inComment = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inComment) { if (ch === '\n') inComment = false; continue; }
    if (inString) { if (ch === '\\') { i += 1; continue; } if (ch === '"') inString = false; continue; }
    if (ch === '"') { inString = true; continue; }
    if (ch === ';') { inComment = true; continue; }
    if (ch === '(') { depth += 1; open += 1; } else if (ch === ')') { depth -= 1; if (depth < min) min = depth; }
  }
  return { balance: depth, min, open };
}

/** The LISP text of one `(cons "<id>" (list ...` block, up to the next sibling id. */
function block(id, nextId) {
  const start = text.indexOf(`(cons "${id}" (list`);
  assert.ok(start >= 0, `no block "${id}"`);
  const end = nextId ? text.indexOf(`(cons "${nextId}" (list`, start + 1) : text.length;
  assert.ok(end > start, `no block "${nextId}" after "${id}"`);
  return text.slice(start, end);
}

/** The number a `(cons "<key>" <n>)` line of a block carries, or null for nil. */
function consNumber(src, key) {
  const m = src.match(new RegExp(`\\(cons "${key}" (nil|-?[0-9.]+)\\)`));
  assert.ok(m, `no (cons "${key}" ...) in block`);
  return m[1] === 'nil' ? null : Number(m[1]);
}

/** The LISP's section B rule, re-stated in JS: the owner's dowel rule bounded by the sheet. */
function positions(L, e, p, nMin, wide) {
  const ceil = (x) => { const n = Math.trunc(x); return x - n > 1e-9 ? n + 1 : n; };
  if (L <= 0) return [];
  if (L - 2 * e < wide) return [L / 2];
  const S = L - 2 * e; const n = Math.max(nMin, 1 + ceil(S / p)); const g = S / (n - 1);
  const out = []; for (let i = 0; i < n - 1; i += 1) out.push(e + i * g); out.push(L - e); return out;
}

test('F20 LISP: the file is there, balances 0/0, is a kit and not a stub, ASCII, no dash', () => {
  const { balance, min, open } = parenScan(text);
  assert.equal(balance, 0);
  assert.equal(min, 0);
  assert.ok(open > 400, `${open} opens`);
  assert.doesNotMatch(text, new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`), 'no em or en dash');
  assert.doesNotMatch(text, /[^\x00-\x7F]/, 'ASCII only, for AutoCAD\'s loader');
  for (const s of ['A. THE NUMBERS', 'B. THE SET-OUT RULE', 'C. THE INVERTED SIDE', 'D. PER BOARD',
    'E. THE GATE AND THE REFUSALS', 'F. WHAT A CABINEO JOINT REPLACES, AND THE BOM', 'G. THE COMMANDS', 'H. NUMBERS']) {
    assert.ok(text.includes(s), `section "${s}"`);
  }
  for (const d of ['cabineo-profile', 'cabineo-sheet', 'cabineo-positions', 'cabineo-too-close', 'cabineo-machined-face',
    'cabineo-reflect-x', 'cabineo-joint-table', 'cabineo-pockets', 'cabineo-outline-key-points', 'cabineo-outline-arcs',
    'cabineo-recess', 'cabineo-side-holes', 'cabineo-gate', 'cabineo-refusal', 'cabineo-bom-lines', 'cabineo-skin-clash',
    'c:CABINEO_JOINTS', 'c:CABINEO_DRAW']) {
    assert.match(text, new RegExp(`\\(defun ${d.replace(/[:]/g, '\\$&')}\\b`), `defun ${d}`);
  }
});

test('F20 LISP: the gate sentence, verbatim, and the profile choices as CLAUDE.md names them', () => {
  assert.ok(text.includes('"the Cabineo pattern is proposed, not confirmed by the owner"'));
  const prof = text.slice(text.indexOf('(defun cabineo-profile'), text.indexOf('(defun cabineo-get'));
  assert.match(prof, /\(cons "variant" "12"\)/);
  assert.match(prof, /\(cons "mounting" "flush"\)/, 'the owner, 15.10.2026: the collar skimmed in');
  assert.match(prof, /\(cons "machining" "drill15"\)/, 'the owner, 15.10.2026: three dia 15 holes');
  assert.match(prof, /\(cons "skimMm" 0\.5\)/, 'the owner, 15.10.2026: zebranie 0.5 mm laminatu');
  assert.match(prof, /\(cons "holeDepthMm" nil\)/, 'the owner names it when he remembers; X until then');
  assert.match(prof, /\(cons "pitchMm" 250\.0\)/);
  assert.match(prof, /\(cons "endOffsetMm" 50\.0\)/);
  assert.match(prof, /\(cons "minPerJoint" 2\)/);
  assert.match(prof, /\(cons "maxSpacingMm" 300\.0\)/);
  assert.match(prof, /\(cons "minFromEdgeMm" 20\.0\)/);
  assert.match(prof, /\(cons "confirmed" nil\)/);
  assert.match(prof, /T78 proposed, owner to confirm/);
  // The sheet's two limits are marked as the sheet's, with the page.
  assert.match(prof, /maxSpacingMm.*page 1, Assembly panel 1/);
  assert.match(prof, /minFromEdgeMm.*page 1, Assembly panel 1/);
});

test('F20 LISP: section A restates cabineo.json key for key (the geometry numbers, every one)', () => {
  // Spacing and the counterpart hole.
  const sp = block('spacing', 'counterpartHole');
  assert.equal(consNumber(sp, 'edgeMinMm'), sheet.spacing.edgeMinMm);
  assert.equal(consNumber(sp, 'maxMm'), sheet.spacing.maxMm);
  const ch = block('counterpartHole', 'variants');
  assert.equal(consNumber(ch, 'diaMm'), sheet.counterpartHole.diaMm);
  assert.equal(consNumber(ch, 'depthMm'), sheet.counterpartHole.depthMm);
  assert.equal(sheet.counterpartHole.depthMm, null, 'the depth is NOT on the sheet');
  // Variants: the screw reach and the minimum panels.
  const v8 = block('8', '12'); const v12 = block('12', '8M6'); const v8m6 = block('8M6', 'mountings');
  assert.equal(consNumber(v8, 'screwReachXMm'), sheet.variants['8'].screwReachXMm);
  assert.equal(consNumber(v12, 'screwReachXMm'), sheet.variants['12'].screwReachXMm);
  assert.equal(consNumber(v8m6, 'screwReachXMm'), sheet.variants['8M6'].screwReachXMm);
  assert.equal(consNumber(v8, 'minCounterpartMm'), sheet.variants['8'].minPanelMm.cornerJoint.counterpartPanel);
  assert.equal(consNumber(v12, 'minCounterpartMm'), sheet.variants['12'].minPanelMm.cornerJoint.counterpartPanel);
  assert.equal(consNumber(v8m6, 'minCounterpartMm'), sheet.variants['8M6'].minPanelMm.cornerJoint.counterpartPanel);
  assert.equal(consNumber(v8, 'minConnectorBoardMm'), sheet.variants['8'].minPanelMm.cornerJoint.connectorBoard);
  assert.equal(consNumber(v8, 'minCentreWallMm'), sheet.variants['8'].minPanelMm.centreWall.centrePanel);
  assert.equal(consNumber(v12, 'minCentreWallMm'), sheet.variants['12'].minPanelMm.centreWall.centrePanel);
  assert.equal(consNumber(v8m6, 'insertMm'), sheet.variants['8M6'].insert.lengthMm);
  for (const v of [v8, v12, v8m6]) assert.equal(consNumber(v, 'article'), null, 'no article on the sheet');
  // Mountings.
  const mount = { surface: block('surface', 'flush'), flush: block('flush', 'flushCap'), flushCap: block('flushCap', 'hpl'), hpl: block('hpl', 'machining') };
  for (const [id, src] of Object.entries(mount)) {
    const m = sheet.mountings[id];
    assert.equal(consNumber(src, 'pocketDepthMm'), m.pocketDepthMm, `${id} pocket depth`);
    assert.equal(consNumber(src, 'axisFromCollarSeatMm'), m.axisFromCollarSeatMm, `${id} axis from the collar seat`);
    assert.equal(consNumber(src, 'axisFromSurfaceMm'), m.derived.axisFromSurfaceMm, `${id} axis from the surface (derived)`);
    assert.equal(consNumber(src, 'recessDepthMm'), m.collarRecessDepthMm ?? m.capRecessDepthMm ?? null, `${id} recess depth`);
    assert.equal(consNumber(src, 'recessWidthMm'), m.recessOutline?.widthMm ?? null, `${id} recess width`);
    assert.equal(consNumber(src, 'recessEndRadiusMm'), m.recessOutline?.endRadiusMm ?? null, `${id} recess end radius`);
    assert.equal(consNumber(src, 'recessEndCentreFromEndMm'), m.recessOutline?.endCentreFromEndMm ?? null, `${id} recess end centre`);
    assert.equal(consNumber(src, 'recessLengthMm'), m.recessOutline?.lengthMm ?? null, `${id} recess length`);
    assert.equal(consNumber(src, 'floorMm'), m.floorDimensionMm, `${id} floor dimension`);
    assert.match(src, /\(cons "pageOf" 2\)/);
  }
  // Machining: the standard and hpl sets of every option.
  const drill = block('drill15', 'cutter10'); const c10 = block('cutter10', 'cutter12'); const c12 = block('cutter12', 'cap');
  const half = (src) => [src.slice(0, src.indexOf('(cons "hpl"')), src.slice(src.indexOf('(cons "hpl"'))];
  const [d15s, d15h] = half(drill);
  assert.equal(consNumber(d15s, 'lobeDiaMm'), sheet.machining.drill15.standard.diaMm);
  assert.equal(consNumber(d15s, 'firstCentreFromEndMm'), sheet.machining.drill15.standard.firstCentreFromEndMm);
  assert.equal(consNumber(d15s, 'pitchMm'), sheet.machining.drill15.standard.pitchMm);
  assert.match(d15s, /\(cons "lobeCentresFromEndMm" \(list 3\.6 14\.8 26\.0\)\)/);
  assert.deepEqual(sheet.machining.drill15.standard.derived.centresFromEndMm, [3.6, 14.8, 26]);
  assert.equal(consNumber(d15h, 'lobeDiaMm'), sheet.machining.drill15.hpl.diaMm);
  assert.equal(consNumber(d15h, 'firstCentreFromEndMm'), sheet.machining.drill15.hpl.firstCentreFromEndMm);
  assert.match(d15h, /\(cons "lobeCentresFromEndMm" \(list 3\.5 14\.7 25\.9\)\)/);
  const [c10s, c10h] = half(c10);
  assert.equal(consNumber(c10s, 'halfHeightAtWaistMm'), sheet.machining.cutter10.standard.halfHeightAtWaistMm);
  assert.equal(consNumber(c10s, 'halfHeightAtEndMm'), sheet.machining.cutter10.standard.halfHeightAtEndMm);
  assert.match(c10s, /\(cons "waistsFromEndMm" \(list 9\.2 20\.4\)\)/);
  assert.deepEqual(sheet.machining.cutter10.standard.waistsFromEndMm, [9.2, 20.4]);
  assert.equal(consNumber(c10h, 'halfHeightAtWaistMm'), sheet.machining.cutter10.hpl.halfHeightAtWaistMm);
  assert.match(c10h, /\(cons "waistsFromEndMm" \(list 9\.1 20\.3\)\)/);
  const [c12s, c12h] = half(c12);
  assert.equal(consNumber(c12s, 'channelHeightMm'), sheet.machining.cutter12.standard.channelHeightMm);
  assert.equal(consNumber(c12s, 'halfHeightAtChannelMm'), sheet.machining.cutter12.standard.halfHeightAtChannelMm);
  assert.equal(consNumber(c12s, 'halfHeightAtEndMm'), sheet.machining.cutter12.standard.halfHeightAtEndMm);
  assert.match(c12s, /\(cons "reliefs" \(list \(list 8\.1 2\.2\) \(list 19\.3 2\.2\)\)\)/);
  assert.deepEqual(sheet.machining.cutter12.standard.reliefs, [{ fromEndMm: 8.1, lengthMm: 2.2 }, { fromEndMm: 19.3, lengthMm: 2.2 }]);
  assert.equal(consNumber(c12h, 'halfHeightAtEndMm'), sheet.machining.cutter12.hpl.halfHeightAtEndMm);
  assert.match(c12h, /\(cons "reliefs" \(list \(list 8\.2 1\.8\) \(list 19\.3 1\.8\)\)\)/);
  assert.match(c12, /\(cons "shearStrengthF3" "-13 %"\)/);
  // The cap: nothing named on the sheet.
  const cap = block('cap', null);
  assert.equal(consNumber(cap, 'article'), null);
  assert.equal(sheet.cap.article, null);
});

test('F20 LISP: nothing invented: 186310 is never a value, every nil says what is missing', () => {
  assert.doesNotMatch(text, /\(cons "article" "186310"\)/);
  assert.doesNotMatch(text, /\(cons "article" [0-9]/);
  assert.match(text, /186310 is NOT printed on page 1 or 2/);
  assert.match(text, /\(cons "depthMm" nil\)\s*;; NOT ON THE SHEET/);
  assert.match(text, /\(cons "recessLengthMm" nil\)\s*;; NOT ON THE SHEET/);
  assert.match(text, /owner to confirm/i);
  assert.match(text, /DERIVED/);
});

test('F20 LISP: the inverted side, the owner\'s words, the one reflection, the label', () => {
  assert.match(flat, /ciecie nie od srodka korpusu tylko do zewnatrz/);
  assert.match(text, /\(defun cabineo-machined-face \(board\)\s*\(if \(wcmatch board "TOP,BOTTOM,SHELF\*"\) "outside" "inside"\)\)/);
  assert.match(text, /"OUTSIDE FACE UP"/);
  assert.match(flat, /x' = W - x, y' = y/);
  assert.match(text, /src\/engine\/cnc\/frontOperations\.js/);
  assert.match(text, /never a second one/);
  assert.match(text, /\(defun cabineo-reflect-x \(x W\)\s*\(- \(float W\) \(float x\)\)\)/);
  assert.match(text, /MIN_SKIN 3/);
  assert.match(text, /\(defun cabineo-skin-clash \(boardT pocketDepth otherDepth minSkin\)/);
  // The back: no Cabineo in it, and since 15.10.2026 no puzzle either: screwed.
  assert.match(flat, /joints into the BACK are NOT in the owner's sentence/);
  assert.match(flat, /THE BACK IS SCREWED \(the owner, 15\.10\.2026, DECIDED/);
  assert.match(flat, /jak mamy cabineo to nie robimy dog bonsow/);
  assert.match(text, /\(defun cabineo-recess-depth \(prof sheet/);
  assert.match(text, /\(defun cabineo-hole-depth \(prof sheet/);
  assert.match(flat, /CABINEO_POCKET_15MM.*CABINEO_RECESS.*CABINEO_HOLE_5MM/, 'the three layers, in the owner\'s order');
  // The side's hole is not on the board's centre line.
  assert.match(flat, /1\.9 nearer the outside/);
});

test('F20 LISP: the NUMBERS block (section H) re-computed by the section B rule, to the decimal', () => {
  const W = 600; const D = 558; const H = 770; const G = 18; const sideW = D - G; const topW = W - 2 * G;
  const e = 50; const p = 250; const wide = 18.8; const ax = 7.1; const r = 7.5; const far = 33.5;
  const offs = positions(sideW, e, p, 2, wide);
  assert.deepEqual(offs, [50, 270, 490]);
  assert.match(flat, /offsets from the FRONT 50 270 490/);
  // The TOP's axes in its own frame (x from the BACK) and reflected (x' = 540 - x).
  const own = offs.map((o) => sideW - o);
  assert.deepEqual(own, [490, 270, 50]);
  assert.deepEqual(own.map((x) => sideW - x), [50, 270, 490]);
  assert.match(text, /490 270 50/);
  assert.match(flat, /W of the reflection = 540 \(the drawn width\), not 600/);
  for (const x of own) {
    assert.ok(text.includes(`${x - r} .. ${x + r}`), `pocket box ${x - r} .. ${x + r}`);
    assert.ok(text.includes(`${(x - 9.4).toFixed(1)} .. ${(x + 9.4).toFixed(1)}`), `recess box ${x - 9.4} .. ${x + 9.4}`);
  }
  // The BUR end: y -> 564 - y; the pocket's far end and the recess's length.
  for (const y of [3.6, 14.8, 26]) assert.ok(text.includes(String(+(topW - y).toFixed(1))), `BUR lobe at ${topW - y}`);
  assert.ok(text.includes(`${topW - far} .. ${topW}`), 'BUR pocket box 530.5 .. 564');
  assert.ok(text.includes(`${+(topW - 35.65).toFixed(2)} .. ${topW}`), 'BUR recess 528.35 .. 564');
  assert.ok(text.includes(String(+(topW - 26.25).toFixed(2))), 'BUR semicircle centre 537.75');
  for (const s of [8.1, 10.3, 19.3, 21.5]) assert.ok(text.includes(String(+(topW - s).toFixed(1))), `BUR straight ${topW - s}`);
  // The sides' holes: 7.1 from the board's OUTSIDE face, never the centre line.
  assert.equal(H - ax, 762.9);
  assert.match(text, /BUL-TOP\s+y 762\.9\s+\(= 770 - 7\.1\)\s+x 50 270 490/);
  assert.match(text, /BUL-BOTTOM\s+y\s+7\.1\s+\(=\s+0 \+ 7\.1\)\s+x 50 270 490/);
  assert.match(text, /BUR-TOP\s+y 762\.9\s+x 490 270 50/);
  assert.match(text, /BUR-BOTTOM\s+y\s+7\.1\s+x 490 270 50/);
  assert.match(flat, /12 POCKETS, 12 HOLES/);
  // With one fix shelf: L 520, offsets 50 260 470, the sides at row + 7.1.
  const so = positions(D - G - 20, e, p, 2, wide);
  assert.deepEqual(so, [50, 260, 470]);
  assert.match(text, /BUL-SHELF-1\s+520\s+FRONT\s+420\s+3\s+210\s+50 260 470/);
  assert.match(text, /BUL-SHELF-1\s+y 392\.1 \(= 385 \+ 7\.1\)\s+x 70 280 490/);
  assert.match(text, /BUR-SHELF-1\s+y 392\.1\s+x 470 260 50/);
  assert.deepEqual(so.map((o) => 20 + o), [70, 280, 490]);
  assert.deepEqual(so.map((o) => sideW - 20 - o), [470, 260, 50]);
  // The short joint and the one-pocket threshold.
  assert.deepEqual(positions(282, e, p, 2, wide), [50, 232]);
  assert.match(text, /pockets at 50 and 232/);
  assert.equal(2 * e + wide, 118.8);
  assert.match(text, /Under 118\.8/);
  // The sheet's limits hold on this BUD: gaps 220 <= 250 <= 300, first axis 50 >= 20.
  assert.ok(offs.slice(1).every((v, i) => v - offs[i] <= p && p <= 300));
  assert.ok(e >= 20 && e - r === 42.5 && +(e - 9.4).toFixed(1) === 40.6);
  assert.match(flat, /own edge at 42\.5, the recess's at 40\.6/);
});

test('F20 LISP: the circle arithmetic of the sheet agrees with itself (cabineo.json consistency)', () => {
  const r = 7.5;
  assert.equal(Math.round(Math.sqrt(r ** 2 - 5.6 ** 2) * 10) / 10, 5, 'the waist half-height, printed 5');
  assert.equal(Math.round(Math.sqrt(r ** 2 - 3.6 ** 2) * 10) / 10, 6.6, 'the end half-height, printed 6.6');
  assert.equal(Math.sqrt(r ** 2 - 6 ** 2), 4.5, 'the 12 channel meets each lobe 4.5 from its centre');
  assert.deepEqual([3.6 + 4.5, 14.8 - 4.5, 14.8 + 4.5, 26 - 4.5].map((v) => +v.toFixed(1)), [8.1, 10.3, 19.3, 21.5]);
  assert.match(flat, /EXACTLY 4\.5 from each centre/);
});

test('F20 LISP: the layers, the BOM lines and the refusals name the sheet', () => {
  for (const l of ['CABINEO_POCKET_15MM', 'CABINEO_POCKET_10MM', 'CABINEO_POCKET_12MM', 'CABINEO_RECESS', 'CABINEO_HOLE_5MM']) {
    assert.ok(text.includes(`"${l}"`), l);
  }
  assert.match(text, /article not on the sheet, owner to supply/);
  assert.match(text, /\(cons "caps" "all"\)/);
  assert.match(text, /over the sheet's max\. /);
  assert.match(text, /under the sheet's min\. /);
  assert.match(text, /\(page 1, Applications\)/);
  assert.match(text, /not a company default: the owner chose 8 and 12/);
});
