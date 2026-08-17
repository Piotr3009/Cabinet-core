// ─── TURN 26 · F11 + F12 — the two at the bottom ────────────────────────────
//
// F11  "Turn 25 shipped both; the owner could not find the warning. Confirm it
//      triggers (a 770 opening with three 200 fronts), that its wording names
//      the number, and screenshot it. NO NEW BEHAVIOUR."
//
// F12  Editor housekeeping — only what fits without touching the drawing tools.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DRAWER_WARNING_CODES, frontStackFit, frontStackWarning } from '../src/engine/drawerBox.js';
import { PART_GROUP_IDS, exportablePanels, groupPanels } from '../src/engine/cnc/groups.js';

const read = (rel) => readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8');

// ─── F11 — THE OWNER'S OWN CASE ─────────────────────────────────────────────

/** CLAUDE.md F11's own fixture: a 770 opening with three 200 fronts. */
const owners = () => computeCabinet({
  ...defaultParamsFor('BUDR', P),
  unit_num: '01',
  height: 770,
  drawers: 3,
  drawer_heights: [200, 200, 200],
}, P);

test('F11 — a 770 opening with three 200 fronts TRIGGERS it', () => {
  const said = owners().warnings.find((w) => w.code === 'DRAWER_FRONTS_SHORT');
  assert.ok(said, 'the warning the owner could not find is raised');
});

test('F11 — and the wording NAMES the number', () => {
  const said = owners().warnings.find((w) => w.code === 'DRAWER_FRONTS_SHORT');
  // "the fronts do not fit" is not something a joiner can act on; "161 mm
  // short" is. The sentence carries the shortfall, what the stack IS and what
  // the face IS — three numbers, so he can see which one to change.
  assert.match(said.message, /161 mm/, 'the shortfall');
  assert.match(said.message, /609 mm/, 'what the stack comes to');
  assert.match(said.message, /770 mm/, 'and the face it has to fill');
  // …and it reads as a sentence rather than as a code.
  assert.ok(!said.message.includes('_'));
  assert.ok(said.message.length > 60, said.message);

  // The arithmetic behind it, so the numbers are checkable: three 200s and a
  // gap under each, in a 770 face.
  const fit = frontStackFit({ heights: [200, 200, 200], gap: P.baseDrawerUnit.gap, available: 770 });
  assert.equal(fit.state, 'short');
  assert.equal(fit.used, 600 + 3 * P.baseDrawerUnit.gap);
  assert.equal(Math.round(fit.by), 161);
});

test('F11 — OVER is the other half, and a stack that fits says nothing', () => {
  const over = frontStackWarning({ heights: [300, 300, 300], gap: P.baseDrawerUnit.gap, available: 770 });
  assert.equal(over.code, 'DRAWER_FRONTS_OVER');
  assert.match(over.message, /overrun/);
  assert.match(over.message, /\d+ mm/);
  // A cabinet the engine cut for itself is a cabinet that fits: no warning, so
  // the one above is a real finding and not noise every unit carries.
  const ok = computeCabinet({ ...defaultParamsFor('BUDR', P), unit_num: '01', drawers: 3 }, P);
  assert.equal(ok.warnings.filter((w) => w.code.startsWith('DRAWER_FRONTS_')).length, 0);
  // Half a millimetre is rounding, not a gap.
  assert.equal(frontStackWarning({ heights: [100], gap: 0, available: 100.4 }), null);
});

test('F11 — it reaches BOTH surfaces, and it does not block', () => {
  // ONE component, used in the two places CLAUDE.md named, so a warning cannot
  // appear on the unit and not in the modal.
  const panel = read('components/RightPanel.jsx');
  const modal = read('components/ElementProperties.jsx');
  assert.match(panel, /<UnitWarnings unitId=\{unit\.id\} \/>/, 'on the unit');
  assert.match(modal, /<UnitWarnings unitId=\{unit\.id\} only=\{DRAWER_WARNING_CODES\} compact \/>/, 'and in the drawer modal');
  // The codes list lives beside the codes it names, so a rename cannot quietly
  // stop one reaching the modal.
  assert.ok(DRAWER_WARNING_CODES.includes('DRAWER_FRONTS_SHORT'));
  assert.ok(DRAWER_WARNING_CODES.includes('DRAWER_FRONTS_OVER'));
  // It does NOT block: no dialog, no disabled control, and the cabinet is cut
  // as asked. The proof is that the fronts are still there at the size asked
  // for, warning and all.
  const r = owners();
  assert.equal(r.panels.filter((p) => p.part === 'DRAWER-FRONT').length, 3);
  assert.deepEqual(r.panels.filter((p) => p.part === 'DRAWER-FRONT').map((p) => p.h), [200, 200, 200]);
  // …and it is a YELLOW warning, in the app's own status tone.
  const view = read('components/UnitWarnings.jsx');
  assert.match(view, /text-status-warn/);
  assert.match(view, /data-warning-code=\{w\.code\}/, 'and the walk can find it by code');
});

test('F11 — the export TREE is there too, and it is the four groups', () => {
  // The other half of what turn 25 shipped and the owner could not find.
  const r = computeCabinet({
    type: 'WARDROBE',
    width: 600,
    height: 2150,
    depth: 578,
    board_t: 18,
    front_t: 25,
    unit_num: '01',
    shelves: 2,
    drawers: 3,
    doors: true,
  }, P);
  const cuttable = exportablePanels(r.panels);
  // `groupPanels` answers a Map keyed by the four group ids.
  const tree = groupPanels(cuttable);
  assert.deepEqual([...tree.keys()], PART_GROUP_IDS, 'the four groups, in the order the tree draws them');
  const filled = [...tree].filter(([, panels]) => panels.length);
  assert.ok(filled.length >= 3, `${filled.length} groups carry something`);
  // Every cut part is in exactly one group — a tree that dropped one would be
  // an export that silently misses a board, and one that doubled a part would
  // cut it twice.
  const seen = [...tree.values()].flat().map((p) => p.id);
  assert.equal(new Set(seen).size, seen.length, 'no part is in two groups');
  assert.equal(seen.length, cuttable.length, 'and none is missing');
});

// ─── F12 — EDITOR HOUSEKEEPING ──────────────────────────────────────────────

test('F12.2 — Back is at the TOP CENTRE of a workspace, and it is large', () => {
  // The shell decides the PLACEMENT from the KIND of window, so it is one
  // decision in one place rather than a per-modal opinion: a maximised
  // workspace centres it and makes it a real button; every side dialog keeps
  // the quiet ghost beside its title.
  const shell = read('components/Modal.jsx');
  assert.match(shell, /\{onBack && !big && \(/, 'a side dialog keeps the ghost beside the title');
  assert.match(shell, /\{onBack && big && \(/, 'a workspace gets the big one');
  assert.match(shell, /data-modal-back-place="top-centre"/, 'the walk can find it');
  assert.match(shell, /data-modal-back-place="beside"/);
  assert.match(shell, /className="cc-editor-back shrink-0"/);
  // …and it is centred by a flex spacer on EACH side of it.
  const at = shell.indexOf('data-modal-back-place="top-centre"');
  const around = shell.slice(at - 700, at + 700);
  assert.equal((around.match(/<span className="flex-1" \/>/g) || []).length, 2, 'a spacer either side');
  // The style is real: bordered, gold, and a size up from the ghost.
  const style = read('index.css');
  assert.match(style, /\.cc-editor-back \{/);
  assert.match(style, /px-5 py-2 rounded text-base/);
  // The editor IS a workspace, so it is the one that gets it.
  assert.match(read('components/PartDetailModal.jsx'), /^\s*maximised$/m);
});

test('F12.3 — the sheet takes the window, and the piece takes none of its width', () => {
  // ─── RE-PINNED 17.08.2026 (TURN 38, CLAUDE.md F2/F8) ────────────────────
  //
  // Turn 26 shrank the 3-D view to 25 % and gave the sheet 75 %, and this test
  // pinned those two CSS variables. Turn 38 takes the same decision to its
  // end: *"Canvas takes everything else"* — the drawing area is the rest of
  // the viewport — and the view of the piece becomes a THUMBNAIL that floats
  // over the canvas and *"never resizes the drawing area"* (F8).
  //
  // So what F12.3 was about is MORE true than it was, and what is pinned is
  // the fact rather than the two variables that used to carry it: the piece
  // pane takes no width from the sheet at all.
  const src = read('components/PartDetailModal.jsx');
  const at = src.indexOf('data-part-canvas="1"');
  assert.ok(at > 0, 'the piece is still shown');
  const block = src.slice(at - 400, at + 400);
  assert.match(block, /absolute left-2 bottom-2/, 'it FLOATS at the corner of the canvas');
  assert.match(block, /data-thumb-size=/, '…at one of F8’s three sizes');
  assert.ok(!/data-part-canvas="1"[\s\S]{0,120}flex-1/.test(src), 'the piece pane is not flex-1');
  assert.ok(!/basis-\[var\(--cc-editor-view\)\]/.test(src), 'and it takes no basis from the split');
  // The canvas is what fills the window now.
  assert.match(src, /data-editor-canvas="1"/);
  assert.match(src, /className="flex-1 min-h-0 relative/, 'the drawing takes everything left');
});

test('F12.1 — the layer list is OFF the toolbar, and asked ONCE at commit', () => {
  const src = read('components/PartDetailModal.jsx');
  // The permanent dropdown is gone…
  assert.ok(!/data-part-layer="1"/.test(src), 'the layer list is not a permanent toolbar control');
  // …and nobody has said which layer until the first edit is committed.
  assert.match(src, /const \[layer, setLayer\] = useState\(null\);/);
  // The GATE: an op that names no layer is HELD and the question is asked.
  assert.match(src, /if \(!layer\) \{ setAskLayer\(op\); return; \}/);
  // …in the owner's own words.
  assert.match(src, /Which layer should these go on\?/);
  assert.match(src, /data-layer-ask="1"/, 'the walk can find the question');
  assert.match(src, /data-layer-ask-list="1"/);
  // Once, for the session: the answer is remembered and the gate never opens
  // again — the same grammar the drill's ⌀-and-depth popover has used since
  // turn 24.
  assert.match(src, /setLayer\(chosen\);/);
  // ─── RE-PINNED 17.08.2026 (TURN 38, CLAUDE.md F2/F3) ────────────────────
  // The readout is in the STATUS BAR now — F2 moved every persistent readout
  // there — so it is written `{layer || undefined}`: an attribute that is
  // absent while nobody has said, rather than one that says "null".
  assert.match(src, /data-part-layer-chosen=\{layer \|\| undefined\}/, 'and the session says which layer it is on');
  // …and the list is the app's own PLUS this project's, which is F3. Custom
  // layers were parked when this line was written; the owner asked for them
  // on 17.08.
  assert.match(src, /\{layerList\.map\(\(l\) => \(/);
});

test('F12.4 — Delete really deletes, and the disabled button is STATE not a bug', () => {
  // "verify the disabled-looking button in the owner's screenshot is state, not
  // a bug; fix if it is a bug." It is state: the button is disabled while
  // NOTHING IS PICKED, which is the honest answer to "delete what?".
  const src = read('components/PartDetailModal.jsx');
  const at = src.indexOf('data-delete-feature="1"');
  assert.ok(at > 0, 'the button exists');
  const around = src.slice(at, at + 400);
  // ─── RE-PINNED 17.08.2026 (TURN 38, CLAUDE.md F6) ───────────────────────
  // Still STATE and still the honest answer to "delete what?" — and there are
  // two kinds of thing to delete now: a computed feature taken off this print
  // (turn 23's flow, untouched) and the manual objects a hand is holding (F6).
  // So the button is disabled while NEITHER is held, and it deletes whichever
  // it is.
  assert.match(around, /disabled=\{!picked && !selected\.length\}/, 'disabled ONLY while nothing is held');
  assert.match(around, /selected\.length \? deleteSelected\(\) : deletePicked\(\)/, 'and wired to both deletions');
  assert.match(around, /title=\{picked \|\| selected\.length \? '[^']+' : '[^']+'\}/, '…and it says which it is');
  // The keyboard reaches the same function, so the two cannot drift.
  assert.match(src, /if \(tool === 'select' && picked\) \{ e\.preventDefault\(\); deletePicked\(\); \}/);
  // And what it does is a real edit on the project's own part.
  assert.match(src, /addPartEdit\(unit\.id, panel\.id, \{ op: 'hide', feature: feature\.fid \}\)/);
});
