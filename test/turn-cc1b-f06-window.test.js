/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F6 . ONE WINDOW, ONE EXPORT. The owner, 01.11.2026: *"usunac card 3D view i front only"* and *"usunac
// przyciski all units i drawing set pdf, tylko export pdf"*. The Drawings window is the set: its sheet list with
// the ticks, Wall DXF (kept, PROPOSED) and Export PDF over the ticked sheets.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickedSheets, wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { bookletDoc } from '../src/lib/drawingExport.js';
import { t81Kitchen, setArgs } from '../scripts/t81-kitchen.mjs';

const MODAL = readFileSync(new URL('../src/components/DrawingModal.jsx', import.meta.url), 'utf8');
/** The markup and the code, without the prose that quotes what was deleted. */
const code = MODAL.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

test('F6 · the window renders no Card (3 views), Front only, All units (PDF), Drawing set (PDF) or Export SVG', () => {
  for (const gone of ['Card (3 views)', 'Front only', 'All units (PDF)', 'Drawing set (PDF)', 'Export SVG']) {
    assert.ok(!code.includes(gone), `"${gone}" is gone`);
  }
  assert.ok(!MODAL.includes('booklet'), 'no booklet anywhere in the file');
  assert.ok(!/save\('svg'\)|save\('pdf'\)|exportDrawingSvg|exportDrawingPdf|exportBookletPdf/.test(code), 'the svg and per-sheet pdf roads are deleted');
  assert.ok(!/KINDS\.preview|'unit-card':|'front-elevation':|data-drawing-kind-tab/.test(code), 'the kinds and the selector row are deleted');
  assert.match(code, /const KINDS = \{\s+walls: \{ title: 'Drawings', view: 'wall-elevation' \},\s+\};/, 'KINDS keeps walls only');
  assert.match(code, /const kind = 'walls';/, 'the kind is the constant');
  assert.match(code, /title=\{KINDS\.walls\.title\}/, 'the window is called Drawings');
  assert.match(code, /width="w-\[880px\]"/, 'the width stays');
});

test('F6 · the footer: Close, Wall DXF, Export PDF (gold); Export PDF disabled with no ticked sheet and binds the ticked', () => {
  const footer = code.slice(code.indexOf('footer={('), code.indexOf(')}\n    >'));
  const labels = [...footer.matchAll(/>\s*([A-Z][A-Za-z ]+)\s*<\/button>/g)].map((m) => m[1].trim());
  assert.deepEqual(labels, ['Close', 'Wall DXF', 'Export PDF']);
  assert.match(footer, /className="cc-btn-gold"\s+data-wall-drawings-pdf="1"/);
  assert.match(footer, /disabled=\{!wallPicked\.length\}[\s\S]*onClick=\{\(\) => save\('walls-pdf'\)\}/);
  assert.match(code, /exportWallDrawingsPdf\(wallPicked\.map\(\(x\) => x\.sheet\)/, 'the set\'s PDF road, the ticked sheets');
  assert.match(code, /type="checkbox"\s+data-wall-sheet-pick=\{page\.name\}/, 'the sheet list keeps its ticks');
});

test('F6 · the road Export PDF calls binds the ticked sheets in the set\'s order', () => {
  t81Kitchen({ inframe: false });
  const set = wallDrawingSheets(setArgs());
  const leftOut = new Set(set.slice(1, 4).map((s) => s.name));
  const picked = pickedSheets(set, (s) => !leftOut.has(s.name));
  assert.equal(picked.length, set.length - 3);
  assert.equal(bookletDoc(picked.map((s) => s.sheet)).getNumberOfPages(), picked.length);
  assert.deepEqual(pickedSheets(set, () => false), [], 'none ticked: nothing to bind, the button is disabled');
});

test('F6 · the help paragraph names the sheets that exist after F8', () => {
  const note = MODAL.slice(MODAL.indexOf('data-wall-note="1"'));
  assert.match(note, /<b> visualisations<\/b> \(the left and the right angle, your own render and the chosen AI picture/);
  assert.match(note, /press <b>Export PDF<\/b>/);
  assert.ok(!/[\u2013\u2014]/.test(note.slice(0, 1600)), 'no em or en dash in the help');
});

// ═══ THE UX TURN, U3 · THE DRAWINGS WINDOW, NEAR FULL SCREEN ════════════════
// The owner: *"drawing super, ale prosze powieksz modal zeby nie trzeba bylo scrolowac ... lista rysunkow"*; the AI
// visualisation as a button that opens the same card: *"tak"*. The window is the maximised work window (SprayingPanel,
// LinkMaterialsModal): the sheets on the left, always in view; the title block folded, the sheet and its preview on the right.

/** The text of the element that carries `hook`, from its opening `<` to the end of `upto`. */
const block = (hook, upto) => code.slice(code.lastIndexOf('<', code.indexOf(hook)), code.indexOf(upto, code.indexOf(hook)));

test('U3 · the maximised work window: near full screen, restore button, the font floor; the restored width stays 880', () => {
  const shell = code.slice(code.indexOf('<Modal\n      name="drawing"'), code.indexOf('footer={('));
  assert.match(shell, /\n\s+maximised\n/, 'opens near full screen (Modal.jsx gives it its restore button)');
  assert.match(shell, /className="cc-modal-wide"/, 'the font floor of the big windows');
  assert.match(shell, /width="w-\[880px\]"/, 'restored, the window of before');
  assert.match(shell, /onEscape=\{aiOpen \? \(\) => setAiOpen\(false\) : null\}/, 'Escape folds the AI window first, then closes as ever');
  const footer = code.slice(code.indexOf('footer={('), code.indexOf(')}\n    >'));
  assert.match(footer, /\{`Export: \$\{wallPicked\.length\} of \$\{wallSheetList\.length\} sheets ticked, bound in the set's order\.`\}/);
  assert.ok(footer.indexOf('Export: ') < footer.indexOf('>Close<'), 'the count first, then Close, Wall DXF, Export PDF');
});

test('U3 · LEFT: the sheets, every one in view with its tick, the current one gold; then the pictures', () => {
  const left = block('data-drawing-sheets="1"', '</aside>');
  const right = code.indexOf('data-drawing-preview="1"');
  assert.ok(code.indexOf('data-drawing-sheets="1"') < right, 'the sheets stand left of the preview');
  assert.match(left, /className="w-\[260px\] shrink-0 flex flex-col gap-2 min-h-0"/, 'about 260 px');
  assert.match(left, /<h3 className="text-sm text-ink-50">Sheets<\/h3>/);
  assert.match(left, /\{`\$\{wallPicked\.length\} of \$\{wallSheetList\.length\} ticked`\}/, '"<n> of <m> ticked"');
  assert.ok(left.indexOf('data-wall-sheets-all="1"') < left.indexOf('<ul'), 'All and None over the list');
  assert.match(left, /<ul className="flex-1 min-h-0 overflow-y-auto[^"]*" data-wall-sheets=\{wallSheetList\.length\}>/, 'the list takes the column and scrolls on its own');
  assert.match(left, /const current = i === shownIndex;/);
  assert.match(left, /current \? 'bg-gold\/\[0\.12\] shadow-\[inset_3px_0_0_#AA8E68\]' : 'hover:bg-shell-700'/, 'the gold inset bar and the gold ground');
  assert.match(left, /data-wall-sheet=\{page\.name\}\s+aria-pressed=\{current\}[\s\S]*?onClick=\{\(\) => setWallPage\(i\)\}/, 'a click on the row shows that sheet');
  assert.match(code, /const shownIndex = wallSheetList\.length \? Math\.min\(wallPage, wallSheetList\.length - 1\) : -1;/, 'the sheet on the glass, as wallAt reads it');
  // The pictures: Render... (the Render window, as before) and AI visualisation... (the same card, in its own window).
  const pictures = block('data-drawing-pictures="1"', 'data-drawing-about="1"');
  assert.ok(pictures.indexOf('Render...') > 0 && pictures.indexOf('Render...') < pictures.indexOf('AI visualisation...'), 'Render..., then AI visualisation...');
  assert.match(pictures, /onClick=\{\(\) => setRenderOpen\(true\)\}/);
  assert.match(pictures, /data-drawing-ai="1"\s+aria-expanded=\{aiOpen\}[\s\S]*?onClick=\{\(\) => setAiOpen\(\(was\) => !was\)\}/);
  assert.equal((code.match(/<AiVisualCard /g) || []).length, 1, 'one card');
});

test('U3 · the AI card stays mounted while the window is open: folded by a class, never unmounted', () => {
  const win = code.slice(code.lastIndexOf('<div', code.indexOf('data-drawing-ai-window=')), code.indexOf('{renderOpen ? ('));
  assert.match(win, /className=\{`\$\{aiOpen \? '' : 'hidden'\} absolute /, 'folded with the hidden class, so a run and its pictures survive a fold');
  assert.match(win, /<AiVisualCard project=\{project\} visuals=\{visuals\} \/>/);
  assert.match(win, /data-drawing-ai-close="1"[\s\S]*?onClick=\{\(\) => setAiOpen\(false\)\}/);
  assert.doesNotMatch(win, /fixed inset-0|<Modal\b/, 'a small window inside this one, no second backdrop');
  assert.doesNotMatch(code, /aiOpen \? \(\s*<AiVisualCard|aiOpen && <AiVisualCard/, 'never mounted on the flag');
});

test('U3 · RIGHT: the title block folded, the sheet\'s header, the preview in the height that is left', () => {
  const right = block('data-drawing-preview="1"', '</section>');
  const tb = right.indexOf('data-title-block="1"');
  const head = right.indexOf('data-drawing-sheet-head="1"');
  const preview = right.indexOf('data-drawing-sheet-preview="1"');
  assert.ok(tb > 0 && head > tb && preview > head, `title block ${tb}, header ${head}, preview ${preview}`);
  assert.match(right, /<details className="shrink-0 text-\[11px\] text-ink-400" data-title-block="1">/, 'a details, folded by default (no open)');
  assert.match(right, /<summary className="cursor-pointer select-none">Title block: company, logo, drawn by, status, revision<\/summary>/);
  for (const field of ['company.name', 'company.tagline', 'company.lines', 'address', 'drawnBy', 'checkedBy', 'rev', 'date']) {
    assert.ok(right.includes(`'${field}'`), `the title block keeps ${field}`);
  }
  assert.match(right, /data-title-block-field="status"/);
  assert.match(right, /` · \$\{sheet\.format\.id\} \$\{sheet\.format\.orientation\} · \$\{sheet\.scaleLabel \|\| scaleLabel\(sheet\.scale\)\}`\s+\+ \(wallSheetList\.length \? ` · sheet \$\{sheet\.sheetNo\} of \$\{sheet\.sheetOf\}` : ''\)/,
    '<wall> · <paper> · <scale> · sheet n of m');
  assert.match(right, /className="cc-drawing flex-1 min-h-0 rounded border border-shell-600 bg-white p-2 overflow-hidden \[&_svg\]:!h-full \[&_svg\]:!w-full \[&_svg\]:!max-h-none"/,
    'the sheet fitted whole in the height that is left (the 46vh cap lifted here only)');
  assert.match(right, /dangerouslySetInnerHTML=\{\{ __html: svg \|\| '' \}\}/, 'the preview is still the export');
});
