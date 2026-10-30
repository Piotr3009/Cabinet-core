/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T84 F5, THE ERRORS YOU CAN SEE (CLAUDE.md T84 PART C) ──────────────────
//
// The owner, 27.10.2026: *"napewno naprzyklad wszystkie bledy zolte i czerwone
// sa totalnie niewidoczne, mala czcionka etc"*. CLAUDE.md T84 F5's list:
// *"the grouping by unit and level from a fixture of findings (red, yellow,
// note), the note dropped; the marker's colour law; the counters' text; the
// refused field keeps the old value and shows the reason; the Check filter
// reducer."*
//
// The pure law (src/components/studio/lib/studioIssues.js) is held on a
// fixture and on a job built through the store as a person builds it (the
// engine's own findings, the room's own refusal sentence). The components and
// the two patched files are read as SOURCE (node loads no JSX). The tests
// named "after INT" read what INT writes from S4's patches and the contract
// (uiStore's checkFilter / openCheckFiltered / requestFrame, CheckPanel.jsx,
// 3d/UnitView.jsx's slot, ConfiguratorPage's registration): they pass once
// F5 is integrated, not before.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import * as ISSUES from '../src/components/studio/lib/studioIssues.js';
import {
  ISSUE_LEVELS, groupIssues, issueCountText, issueCounters, issueStripText, markerLevel, unitIssue,
} from '../src/components/studio/lib/studioIssues.js';
import { CHECKS, checkSummary, findingsToAct } from '../src/engine/checks.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
/** The code of a file, its comments left out (a comment may quote what the code must not do). */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
/** The en dash and the em dash, built from their code points so this file carries neither. */
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const store = () => useProjectStore.getState();
const ui = () => useUiStore.getState();

// CHAT FIX 30.10.2026: RefusedField.jsx left with the quick card (kasacja); the three that stand.
const MINE = [
  'src/components/studio/lib/studioIssues.js',
  'src/components/studio/UnitIssueMarker.jsx',
  'src/components/studio/IssueStrip.jsx',
  'test/turn84-f05-issues.test.js',
];

// ─── A FIXTURE OF FINDINGS, IN runChecks' OWN SHAPE ─────────────────────────
// Deliberately NOT in the engine's order (a red after two yellows on 'w'), so
// the strip's order is the law's and not the fixture's.
const F = [
  { check: 11, level: 'red', unitId: 'b', unitNum: '02', panelId: null, message: 'M11', subject: { unitId: 'b', editor: 'cabinet' } },
  { check: 2, level: 'yellow', unitId: 'w', unitNum: 'W01', panelId: 'W01-FL', message: 'M2', subject: { unitId: 'w', panelId: 'W01-FL', editor: 'element' } },
  { check: 3, level: 'yellow', unitId: 'w', unitNum: 'W01', panelId: null, message: 'M3', subject: { unitId: 'w', editor: 'cabinet' } },
  { check: 18, level: 'yellow', unitId: null, unitNum: '', panelId: null, message: 'a job of its own', subject: null },
  { check: 1, level: 'red', unitId: 'w', unitNum: 'W01', panelId: 'SHELF-1', message: 'M1', subject: { unitId: 'w', panelId: 'SHELF-1', editor: 'element' } },
  { check: 45, level: 'note', unitId: 'v', unitNum: 'VU01', panelId: null, message: 'the service void', subject: { unitId: 'v', editor: 'cabinet' } },
  { check: 30, level: 'yellow', unitId: 'v', unitNum: 'VU01', panelId: 'TOP basin cut-out', message: 'M30a', subject: null },
  { check: 30, level: 'yellow', unitId: 'v', unitNum: 'VU01', panelId: 'TOP basin cut-out', message: 'M30b', subject: null },
  { check: 45, level: 'note', unitId: 'n', unitNum: 'VU02', panelId: null, message: 'a note alone', subject: null },
];

test('F5 · the grouping: by unit and by level, the note dropped (engine findingsToAct)', () => {
  const g = groupIssues(F);
  assert.deepEqual([...g.units.keys()].sort(), ['b', 'v', 'w'], 'a unit with a note alone stands nowhere');
  assert.deepEqual(g.units.get('b').red.map((f) => f.check), [11]);
  assert.deepEqual(g.units.get('b').yellow, []);
  assert.deepEqual(g.units.get('w').red.map((f) => f.check), [1]);
  assert.deepEqual(g.units.get('w').yellow.map((f) => f.check), [2, 3], 'each level in the Check\'s own order');
  assert.deepEqual(g.units.get('v').yellow.map((f) => f.message), ['M30a', 'M30b']);
  assert.ok(!g.units.get('v').yellow.some((f) => f.level === 'note'), 'the note is dropped');
  // The job's own finding (no unit) counts on the status bar and stands on no unit.
  assert.equal(g.red, 2);
  assert.equal(g.yellow, 5);
  assert.equal(g.red + g.yellow, findingsToAct(F).length, 'the same count the rail\'s Check badge reads');
  assert.deepEqual(groupIssues(null), { units: new Map(), red: 0, yellow: 0 });
  assert.deepEqual(ISSUE_LEVELS, ['red', 'yellow']);
});

test('F5 · the marker\'s colour law: red with any red, yellow with yellow only, none with nothing to fix', () => {
  assert.equal(markerLevel({ red: 1, yellow: 0 }), 'red');
  assert.equal(markerLevel({ red: 2, yellow: 3 }), 'red', 'one red is enough');
  assert.equal(markerLevel({ red: 0, yellow: 2 }), 'yellow');
  assert.equal(markerLevel({ red: 0, yellow: 0 }), null);
  assert.equal(markerLevel(null), null);
  // Per unit, from the fixture.
  assert.equal(unitIssue(F, 'b').level, 'red');
  assert.equal(unitIssue(F, 'w').level, 'red', 'a red among yellows');
  assert.equal(unitIssue(F, 'v').level, 'yellow', 'the note does not colour it');
  assert.equal(unitIssue(F, 'n'), null, 'a note alone draws no marker');
  assert.equal(unitIssue(F, 'nobody'), null);
  assert.equal(unitIssue(F, null), null);
  assert.deepEqual(
    (({ red, yellow, count }) => ({ red, yellow, count }))(unitIssue(F, 'w')),
    { red: 1, yellow: 2, count: 3 },
    'the count on the marker is the reds and the yellows',
  );
  // The level is the class the skin colours: `.studio-marker.is-red` on the
  // danger ground, `.is-yellow` on the warn ground (studio.css, the next test).
  const marker = read('src/components/studio/UnitIssueMarker.jsx');
  assert.match(marker, /className=\{`studio-marker is-\$\{issue\.level\}`\}/);
});

test('F5 · the skin draws the law for every class this slice carries: 13 px, dark, on the profile\'s ground', () => {
  // D1's stylesheet (F1) is the one place the issues' look is written; this
  // asserts it holds the owner's law for the classes the F5 components use.
  const css = read('src/components/studio/studio.css');
  const rule = (selector) => {
    const at = css.indexOf(`${selector} {`);
    assert.ok(at >= 0, `studio.css has no rule for ${selector}`);
    return css.slice(at, css.indexOf('}', at));
  };
  for (const cls of ['studio-issue-strip', 'studio-counter', 'studio-marker']) {
    const base = rule(`.studio-pro .${cls}`);
    assert.match(base, /font-size: var\(--studio-issue-text\);/, `${cls} is not 13 px (profile.ui.studio.issues.textPx)`);
    assert.match(base, /color: theme\('colors\.black'\);/, `${cls} is not dark text`);
    assert.match(css, new RegExp(`\\.studio-pro \\.${cls}\\.is-red \\{ background: var\\(--studio-danger\\); \\}`));
    assert.match(css, new RegExp(`\\.studio-pro \\.${cls}\\.is-yellow \\{ background: var\\(--studio-warn\\); \\}`));
  }
  assert.match(rule('.studio-pro .studio-marker .studio-icon'), /width: var\(--studio-marker\);/, 'the profile\'s 16 px');
  // CHAT FIX 30.10.2026: the refused field's rules left with RefusedField.jsx.
  assert.doesNotMatch(css, /studio-refused/);
});

test('F5 · the counters\' text: "1 red · 3 yellow"; a level with nothing is not said; nothing at all is nothing', () => {
  assert.equal(issueCountText({ red: 1, yellow: 3 }), '1 red · 3 yellow');
  assert.equal(issueCountText({ red: 0, yellow: 3 }), '3 yellow');
  assert.equal(issueCountText({ red: 2, yellow: 0 }), '2 red');
  assert.equal(issueCountText({ red: 0, yellow: 0 }), '');
  assert.equal(issueCountText({}), '');
  assert.deepEqual(issueCounters(F), [
    { level: 'red', count: 2, label: '2 red' },
    { level: 'yellow', count: 5, label: '5 yellow' },
  ]);
  assert.deepEqual(issueCounters([F[3]]), [{ level: 'yellow', count: 1, label: '1 yellow' }]);
  assert.deepEqual(issueCounters([F[5], F[8]]), [], 'notes alone: no counter on the status bar');
});

test('F5 · the strip: red first, then yellow, each in its own order, in the finding\'s own words', () => {
  assert.deepEqual(unitIssue(F, 'w').findings.map((f) => f.check), [1, 2, 3]);
  assert.deepEqual(unitIssue(F, 'v').findings.map((f) => f.message), ['M30a', 'M30b']);
  // CLAUDE.md T84 F5's own example: the Check's number, then the message untouched.
  assert.equal(issueStripText({ check: 48, message: 'the bowl enters a board' }), '#48 · the bowl enters a board');
  const said = 'VU01: the bowl enters RAIL-TOP by 12 mm: move the basin forward or take a shallower bowl';
  assert.equal(issueStripText({ check: 48, message: said }).slice('#48 · '.length), said, 'never a paraphrase');
  // #48 IS the bowl's rule, as the Check panel heads that row.
  assert.match(CHECKS.find((c) => c.n === 48).label, /bowl enters a board/);
});

// ─── THE JOB, AS A PERSON BUILDS IT ─────────────────────────────────────────

function job() {
  store().loadProject({
    id: null, name: 't84-f5', room: migrateRoom({ height: 2700, corners: rectCorners(6000, 3000) }), design: {},
  }, []);
  const a = store().addUnit('BUD', { wall: 0, x: 1200 });
  const b = store().addUnit('BUD', { wall: 0, x: 1810 });
  const w = store().addUnit('WARDROBE', { wall: 0, x: 100 });
  store().updateUnitParams(w.id, { width: 900, height: 2460, doors: { count: 2 } });
  store().addShelves(w.id, 1);
  const v = store().addUnit('VANITY2', { wall: 0, x: 3000 });
  return {
    a: a.id, b: b.id, w: w.id, v: v.id,
  };
}

test('F5 · on a job built through the store: the engine\'s findings, grouped as the marker and the strip read them', () => {
  const ids = job();
  const findings = store().runChecks();
  // The fixture is real: a red (#11, two carcasses 10 mm apart), yellows, and the vanity's note.
  assert.ok(findings.some((f) => f.level === 'red'), 'no red: this job proves nothing');
  assert.ok(findings.some((f) => f.level === 'note' && f.unitId === ids.v), 'no note: this job proves nothing');
  const g = groupIssues(findings);
  const work = findingsToAct(findings);
  assert.equal(g.red, work.filter((f) => f.level === 'red').length);
  assert.equal(g.yellow, work.filter((f) => f.level === 'yellow').length);
  // The status bar says what the Check panel's own summary says, in its words.
  const summary = checkSummary(findings);
  assert.match(summary, new RegExp(`^${g.red} fault`));
  assert.match(summary, new RegExp(`${g.yellow} to look at$`));
  assert.equal(issueCounters(findings).map((c) => c.label).join(' · '), `${g.red} red · ${g.yellow} yellow`);
  // The pair 10 mm apart: the second carries the red, and its marker is red.
  const b = unitIssue(findings, ids.b);
  assert.equal(b.level, 'red');
  assert.equal(b.findings[0].level, 'red', 'the red first');
  const gap = b.findings.find((f) => f.check === 11);
  assert.ok(gap, 'the carcass gap stands on the second of the pair');
  assert.equal(gap.message, findings.find((f) => f.check === 11 && f.unitId === ids.b).message,
    'the engine\'s sentence, as it is');
  // The tall wardrobe: yellow only.
  assert.equal(unitIssue(findings, ids.w).level, 'yellow');
  // The vanity's note informs and never colours its marker or stands in its strip.
  const v = unitIssue(findings, ids.v);
  assert.ok(!v || v.findings.every((f) => f.level !== 'note'));
});

// ─── THE REFUSED FIELD (CLAUDE.md T84 F5) ───────────────────────────────────

// ─── CHAT FIX 30.10.2026 · THE REFUSED FIELD LEFT WITH THE QUICK CARD ──────
// The owner: *"tylko ten jeden przycisk usun, Full settings"*. The card was the
// refused field's only home (QuickSelectionCard's dimension rows); with the
// card deleted, RefusedField.jsx, its law in studioIssues.js and its rules in
// studio.css are deleted too (kasacja, no gate left behind). A refused width
// in the full panel is said as it always was there: the room's sentence in a
// message (RightPanel.jsx roomFitRefusalFor).

test('F5 · the refused field is gone whole: no component, no law, no rule, no reader of its wrapper', () => {
  assert.ok(!existsSync(join(ROOT, 'src/components/studio/RefusedField.jsx')), 'RefusedField.jsx is deleted');
  for (const name of ['refusalOf', 'shouldCommitField', 'refusedFieldAfter', 'refusedFieldShows']) {
    assert.equal(typeof ISSUES[name], 'undefined', `${name} left with the field`);
  }
  for (const rel of ['src/components/studio/InspectorHost.jsx', 'src/components/studio/lib/studioEscape.js', 'src/pages/ConfiguratorPage.jsx']) {
    assert.doesNotMatch(code(read(rel)), /RefusedField|data-refused|data-refusal/, `${rel} still reads the refused wrapper`);
  }
});

// ─── THE MARKER, THE STRIP, THE COUNTERS (source) ───────────────────────────

test('F5 · the marker: drei Html at the chip\'s anchor, a tool never in a render, its press its own', () => {
  const marker = read('src/components/studio/UnitIssueMarker.jsx');
  assert.match(marker, /import \{ Html \} from '@react-three\/drei';/);
  assert.match(marker, /<group position=\{position\} userData=\{\{ ccHelper: true \}\}>/, 'a tool, as ShareOutBar is');
  assert.match(marker, /const issue = unitIssue\(findings, unit\?\.id\);/);
  assert.match(marker, /const findings = useCheckFindings\(\);/, 'the one shared list');
  assert.match(marker, /data-studio="marker"/);
  assert.match(marker, /data-unit=\{unit\.id\}/);
  assert.match(marker, /<Icon name="warning" \/>\n\s+<span>\{issue\.count\}<\/span>/, 'the triangle and the count');
  assert.doesNotMatch(code(marker), /#[0-9a-f]{6}\b/i, 'no colour typed twice');
  // Click: the unit, then its panel if the inspector is hidden (CHAT FIX 30.10.2026: no card).
  assert.match(marker, /if \(ui\.selectUnit\(unit\.id\) === false\) return;/);
  assert.match(marker, /\.inspector === 'none'\) useUiStore\.getState\(\)\.showInspector\(\);/);
  // The room never hears the marker's press (a miss there drops the selection).
  for (const on of ['onPointerDown', 'onPointerUp', 'onPointerMove', 'onDoubleClick']) {
    assert.match(marker, new RegExp(`${on}=\\{keepToItself\\}`), `${on} reaches the room`);
  }
  assert.match(marker, /e\.stopPropagation\(\);\n\s+const ui = useUiStore\.getState\(\);/);
  // Under the panels laid over the scene, by the z-order's one authority.
  assert.match(marker, /zIndexRange=\{MARKER_Z\}/);
  assert.match(marker, /\[zOfLayer\(LAYER_CLASS\.panel\) - 1, zOfLayer\(LAYER_CLASS\.inPanel\) \+ 1\]/);
});

test('F5 · the marker stands clear of the name chip at its tallest, by DimLabel\'s own numbers', () => {
  const marker = read('src/components/studio/UnitIssueMarker.jsx');
  const label = read('src/3d/DimLabel.jsx');
  const base = Number(label.match(/^const LABEL_PX_BASE = ([\d.]+);/m)[1]);
  const most = Number(label.match(/^const MAX_FACTOR = ([\d.]+);/m)[1]);
  const [, b, m] = marker.match(/const CHIP_CLEARANCE_PX = Math\.ceil\(\(([\d.]+) \* ([\d.]+)\) \/ 2\);/);
  assert.equal(Number(b), base, 'the chip\'s base pixel height moved in 3d/DimLabel.jsx: the marker would cover it');
  assert.equal(Number(m), most, 'the chip\'s largest factor moved in 3d/DimLabel.jsx: the marker would cover it');
  assert.ok(Math.ceil((base * most) / 2) >= (base * most) / 2);
  assert.match(marker, /transform: `translate3d\(-50%, calc\(-100% - \$\{CHIP_CLEARANCE_PX\}px\), 0\)`/,
    'its foot stands that far above the anchor');
});

test('F5 · the strip and its Show; the counters open the Check at their level (source)', () => {
  const strip = read('src/components/studio/IssueStrip.jsx');
  assert.match(strip, /export default function IssueStrip\(\{ unitId \}\)/);
  assert.match(strip, /export function IssueCounters\(\)/);
  assert.match(strip, /const findings = useCheckFindings\(\);/);
  assert.match(strip, /data-studio="issue-strip"/);
  assert.match(strip, /data-studio="issue-show"/);
  assert.match(strip, /\{issueStripText\(finding\)\}/, 'the finding\'s own words');
  assert.match(strip, /className=\{`studio-issue-strip is-\$\{finding\.level\}`\}/);
  // Show: the part of a panel finding, else the cabinet; then the frame request (the camera bar answers it, F6).
  assert.match(strip, /const moved = part \? ui\.selectElement\(unitId, part\) : ui\.selectUnit\(unitId\);/);
  assert.match(strip, /if \(moved === false\) return;\n\s+useUiStore\.getState\(\)\.requestFrame\(\[unitId\]\);/);
  // The counters.
  assert.match(strip, /data-studio=\{`counter-\$\{c\.level\}`\}/, 'counter-red, counter-yellow (CONTRACT.md section 6)');
  assert.match(strip, /onClick=\{\(\) => useUiStore\.getState\(\)\.openCheckFiltered\(c\.level\)\}/);
  assert.match(strip, /className=\{`studio-counter is-\$\{c\.level\}`\}/);
  assert.doesNotMatch(code(strip), /style=|#[0-9a-f]{6}\b/i, 'the skin draws them; no look typed here');
  // None of the three computes the checks itself: one list, one reader.
  for (const rel of MINE.slice(0, 3)) assert.doesNotMatch(code(read(rel)), /runChecks/, `${rel} runs the checks itself`);
});

// ─── AFTER INT (S4's patches and the contract's uiStore names) ──────────────

test('F5 · after INT: the Check filter in the store; closing the panel puts it back to all', () => {
  ui().setCheckOpen(false);
  assert.equal(ui().checkFilter, 'all', 'the panel starts unfiltered');
  ui().setBomOpen(true);
  ui().openCheckFiltered('red');
  assert.equal(ui().checkOpen, true);
  assert.equal(ui().bomOpen, false, 'the Check and the BOM do not stand together');
  assert.equal(ui().checkFilter, 'red');
  ui().setCheckFilter('all');
  assert.equal(ui().checkFilter, 'all', 'Show all');
  ui().openCheckFiltered('yellow');
  assert.equal(ui().checkFilter, 'yellow');
  ui().toggleCheck();
  assert.equal(ui().checkOpen, false);
  assert.equal(ui().checkFilter, 'all', 'closed by its button, it opens whole next time');
  ui().openCheckFiltered('red');
  ui().setCheckOpen(false);
  assert.equal(ui().checkFilter, 'all', 'closed by its x, the same');
  ui().setCheckFilter('purple');
  assert.equal(ui().checkFilter, 'all', 'no level the Check does not have');
  // The request Show makes, and its answer clears.
  ui().requestFrame(['u1']);
  assert.deepEqual(ui().frameRequest.unitIds, ['u1']);
  assert.equal(typeof ui().frameRequest.at, 'number');
  ui().clearFrameRequest();
  assert.equal(ui().frameRequest, null);
});

test('F5 · after INT: CheckPanel lists one level when filtered, with "Show all" at its head; all is today\'s panel', () => {
  const panel = read('src/components/CheckPanel.jsx');
  assert.match(panel, /const checkFilter = useUiStore\(\(s\) => s\.checkFilter\);/);
  assert.match(panel, /const setCheckFilter = useUiStore\(\(s\) => s\.setCheckFilter\);/);
  assert.match(panel, /const level = checkFilter === 'red' \|\| checkFilter === 'yellow' \? checkFilter : null;/);
  assert.match(panel, /const listed = level \? findings\.filter\(\(f\) => f\.level === level\) : findings;/);
  assert.match(panel, /\{listed\.map\(\(f, i\) => \(/);
  assert.match(panel, /data-check-show-all="1"[\s\S]*?onClick=\{\(\) => setCheckFilter\('all'\)\}[\s\S]*?Show all/);
  // Every pattern the older tests read stays.
  assert.match(panel, /data-check-panel=\{findings\.length\}/);
  assert.match(panel, /useCheckFindings\(\)/);
  assert.match(panel, /const goTo = useGoToSubject\(\)/);
  assert.match(panel, /CHECKS\.find\(\(c\) => c\.n === f\.check\)\?\.label/);
  assert.match(panel, /f\.actions/);
  assert.doesNotMatch(panel, /\bnotify\(/);
});

test('F5 · after INT: the ONE slot in 3d/UnitView.jsx, at the chip\'s anchor, outside the labels\' gate', () => {
  const view = read('src/3d/UnitView.jsx');
  assert.match(view, /^export function setUnitAdornment\(Component\) \{/m);
  assert.match(view, /const Adornment = useSyncExternalStore\(subscribeAdornment, adornmentNow, adornmentNow\);/);
  const slot = '{Adornment && <Adornment unit={unit} position={[mm(W / 2), mm(H) + 0.1, mm(D / 2)]} />}';
  assert.equal(view.split(slot).length - 1, 1, 'one mount point (CLAUDE.md T84 FROZEN 3)');
  assert.equal((view.match(/<Adornment\b/g) || []).length, 1);
  // The chip's own anchor: the same position, written once for each.
  assert.equal(view.split('position={[mm(W / 2), mm(H) + 0.1, mm(D / 2)]}').length - 1, 2);
  // After the labels' gate has closed, before the next block: drawn with the dimensions on or off.
  const gate = view.indexOf('{showLabels && (');
  const chip = view.indexOf('variant="flat"', gate);
  const at = view.indexOf(slot);
  const next = view.indexOf('{showAllDims && !contour && (');
  assert.ok(gate > 0 && chip > gate && at > chip && next > at, 'the slot is not where the contract puts it');
  assert.match(view.slice(chip, at), /<\/group>\n {6}\)\}/, 'the slot stands inside the labels\' gate');
  assert.match(view, /CLAUDE\.md T84 FROZEN 3: \*"The room \(`3d\/\*`\): ONE mount point for the unit\n\/\/ issue marker/);
  // Nothing in 3d/ imports a PRO file.
  const walk = (dir) => readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  for (const file of walk(join(ROOT, 'src/3d'))) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /components\/studio/, `${file.slice(ROOT.length)} reaches into the Studio`);
  }
  // ...and the page fills the slot while the Studio face is mounted (INT, CONTRACT.md section 4).
  const page = read('src/pages/ConfiguratorPage.jsx');
  assert.match(page, /setUnitAdornment\(UnitIssueMarker\)/);
  assert.match(page, /setUnitAdornment\(null\)/);
});

// ─── THE HOUSE'S LAWS ON EVERY FILE OF THIS SLICE ───────────────────────────

test('F5 · every new file opens with the Skylon header and carries no em or en dash', () => {
  const header = read('scripts/t83-walk.mjs').split('\n').slice(0, 8).join('\n');
  for (const rel of MINE) {
    const text = read(rel);
    assert.ok(text.startsWith(`${header}\n`), `${rel} does not open with the header`);
    assert.match(text, /T84 F5/, `${rel} does not name its F`);
    assert.ok(!DASHES.test(text), `${rel} carries an em or en dash`);
  }
});
