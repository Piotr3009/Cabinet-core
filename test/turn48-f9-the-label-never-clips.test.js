// ─── TURN 48, CLAUDE.md F9: THE CNC LABEL NEVER CLIPS INTO A LIE ────────────
//
// The owner's audit, 25.08.2026: on a narrow board `TOP-1` shows as `TOP~` and
// `260.9x540` shows as `260.9x5~` — *"and 5 is a number a joiner will read."*
//
// THE TWO ARE NOT THE SAME FAULT. `TOP~` is plainly cut off; nobody reads it as
// a part called TOP. `260.9x5~` is a SIZE, and 5 is a number — a label that
// turns 540 into 5 is not shortened, it is WRONG, and it is wrong in the one
// place on the sheet a workshop trusts absolutely.
//
// Turn 16 wrote the ladder "draw it → truncate it → hide it", and truncation
// was the humane middle step. It still is for a WORD. It is not humane for a
// measurement, and the layout cannot tell the two apart — so the middle step is
// replaced rather than made clever:
//
//   1. break onto more lines      (maxLines, T18)
//   2. step OUTSIDE the outline   (T48-F9, with a leader — the caller draws it)
//   3. hide it                    (unchanged: below the pixel floor)
//
// PREVIEW ONLY. The FILE keeps turn 16's ladder: a DXF has nowhere to put a
// leader the machine will not also try to cut, and a label that wandered
// outside its own outline in a nesting file would land on the part beside it.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { labelBlock, textWidthMm } from '../src/engine/cnc/annotation.js';
import { panelLabelBlock } from '../src/engine/cnc/dxf.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

const C = P.cnc;
const VIEW = readFileSync(new URL('../src/components/CncView.jsx', import.meta.url), 'utf8');

/** The owner's own label, on a board `boxW` wide. */
const block = (boxW, over = {}) => labelBlock({
  text: '01 TOP-1 260.9x540',
  sizeMm: C.annotation.partLabelMm,
  boxW,
  boxH: 540,
  maxLines: C.labelMaxLines,
  fillRatio: C.labelFillRatio,
  lineGap: C.labelLineGap,
  minSize: C.labelMinHeight,
  ...over,
});

const texts = (b) => b.lines.map((l) => l.text);

// ══ THE FAULT, REPRODUCED ══════════════════════════════════════════════════

test('the fault the owner found is real, and this is it', () => {
  // A 50 mm board. The block breaks onto two lines, the millimetre floor
  // (`labelMinHeight`) wins over the fit, and the size line loses a digit.
  assert.deepEqual(texts(block(50)), ['01 TOP-1', '260.9x5~'],
    'the owner\'s screenshot, reproduced from the profile\'s own numbers');
  // Narrower still and the part code goes too.
  assert.deepEqual(texts(block(40)), ['01 TO~', '260.9~']);
});

// ══ AND IT NEVER HAPPENS ON THE GLASS AGAIN ════════════════════════════════

test('with `onOverflow: outside` not one digit is cut, at any width', () => {
  for (const w of [60, 50, 40, 30, 20, 10]) {
    const b = block(w, { onOverflow: 'outside' });
    assert.deepEqual(texts(b), ['01 TOP-1', '260.9x540'], `${w} mm: the words are whole`);
    for (const line of texts(b)) {
      assert.equal(line.includes('~'), false, `${w} mm: "${line}" carries a truncation mark`);
    }
  }
});

test('…and it SAYS when it had to step out, so the caller can point at the part', () => {
  assert.equal(block(60, { onOverflow: 'outside' }).outside, false, 'it fitted — nothing to say');
  assert.equal(block(50, { onOverflow: 'outside' }).outside, true);
  // The block that stepped out is a REAL block: a size, a step, a width and a
  // height, so the caller can place it clear of the outline rather than guess.
  const out = block(40, { onOverflow: 'outside' });
  assert.equal(out.visible, true);
  assert.ok(out.size >= C.labelMinHeight, 'still no smaller than the readable floor');
  assert.ok(out.width > 0 && out.height > 0);
  assert.equal(out.width, textWidthMm('260.9x540', out.size), 'the width is the longest LINE');
});

test('breaking onto more lines is still tried FIRST — stepping out is the fallback', () => {
  // A board wide enough for two lines takes two lines and stays inside. Only a
  // board no line count can serve steps out.
  const inside = block(120, { onOverflow: 'outside' });
  assert.equal(inside.outside, false);
  assert.ok(inside.lines.length >= 2, 'it broke rather than shrank to nothing');
  for (const line of texts(inside)) assert.equal(line.includes('~'), false);
});

test('the pixel floor still HIDES — step 3 of the ladder is untouched', () => {
  // Zoomed far out, a caption below the readable pixel floor is not drawn at
  // all, whether it fitted or not. Stepping outside is not a licence to litter
  // the sheet at full-kitchen zoom.
  const b = block(40, { onOverflow: 'outside', mmPerPx: 10, minPx: 8 });
  assert.equal(b.visible, false);
  assert.deepEqual(b.lines, []);
});

// ══ THE FILE IS NOT TOUCHED ════════════════════════════════════════════════

test('a REAL part in a stock cabinet does this — the PANTRY\'s own fillers', () => {
  // Not a fixture: `defaultParamsFor('PANTRY')` cuts two FILLER strips 30 mm
  // wide and 611 tall, and both of them lost a digit off their size on the
  // sheet. `30x6~` is the owner's fault exactly — 611 read as 6.
  const pantry = computeCabinet({ ...defaultParamsFor('PANTRY', P), unit_num: '01' }, P);
  const filler = pantry.panels.find((p) => p.id === 'FILLER-1');
  assert.ok(filler, 'the PANTRY still cuts its fillers');
  assert.deepEqual([filler.w, filler.h], [30, 611]);

  // THE FILE: turn 16's ladder, untouched. No `onOverflow` — every caller that
  // predates tonight, the DXF writer included, gets what it got yesterday.
  const forFile = panelLabelBlock(filler, { unitNum: '01', profile: P });
  assert.equal(forFile.outside, false);
  assert.deepEqual(texts(forFile), ['01', 'FILL~', '30x6~']);

  // THE GLASS: the same function, the preview's answer, and every digit whole.
  const forGlass = panelLabelBlock(filler, { unitNum: '01', profile: P, onOverflow: 'outside' });
  assert.equal(forGlass.outside, true);
  assert.deepEqual(texts(forGlass), ['01', 'FILLER-1', '30x611']);

  // ONE function, two answers — the sheet and the file still cannot WORD a
  // label differently (T18-F1.1) and are still the same size; they differ only
  // in what they do when it does not fit, which is the only thing they can.
  assert.equal(forFile.size, forGlass.size);
});

// ══ THE PREVIEW ASKS FOR IT, AND DRAWS THE LEADER ══════════════════════════

test('the CNC view asks for the whole words, and points at the part', () => {
  assert.match(VIEW, /onOverflow: 'outside',/);
  // Just clear of the part's RIGHT edge, start-anchored, with a leader back to
  // the outline — the layout stacks parts left to right with `cnc.layoutGap`
  // between them, so right is where the open sheet is.
  assert.match(VIEW, /const anchor = label\.outside \? 'start' : 'middle';/);
  assert.match(VIEW, /const x = label\.outside \? labelX \+ box\.w \/ 2 \+ label\.size \* 1\.2 : labelX;/);
  assert.match(VIEW, /data-part-label-leader=\{panel\.id\}/);
  assert.match(VIEW, /data-part-label-outside=\{label\.outside \? '1' : '0'\}/);
  // A label that FITS is drawn exactly where turn 18 put it: inside, centred.
  assert.match(VIEW, /x=\{x\} y=\{labelY\} textAnchor=\{anchor\}/);
});
