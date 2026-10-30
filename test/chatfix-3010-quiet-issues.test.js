/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT FIX 30.10.2026 (THE EVENING) · THE FINDINGS, QUIET AND FOLDED ─────
//
// The owner, of the yellow strips under the panel: *"te zolte alerty moze by
// jakos skromniej to pokazac i zwiniete, jak bedzie 10 to caly menu mi
// zabierze, ja uwazam ze powinno byc skromnie gdzies na dole a nie ZOLTE
// wywalone na wierzch, rozprasza tylko czlowieka"*; the mockup assembled live
// in the app, then *"koduj"*. One quiet row at the foot of the inspector with
// the counts (a dot per level), folded by default; a press unfolds the list
// over the row (uiStore `issuesOpen`), a second folds it. The words and Show
// are what they were.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { useUiStore } from '../src/stores/uiStore.js';
import { issueParts, issueCountText, unitIssue } from '../src/components/studio/lib/studioIssues.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const U = () => useUiStore.getState();

test('30.10 · issuesOpen is a yes or no for the session: false at the start, toggled by the row, saved nowhere', () => {
  assert.equal(U().issuesOpen, false, 'folded by default');
  U().toggleIssues();
  assert.equal(U().issuesOpen, true);
  U().toggleIssues();
  assert.equal(U().issuesOpen, false);
  // Not in the persisted keys: the fold is this session's, never a saved setting.
  const store = read('src/stores/uiStore.js');
  const persisted = store.match(/partialize[\s\S]*?\}\)/)?.[0] || '';
  assert.doesNotMatch(persisted, /issuesOpen/, 'the fold is not persisted');
});

test('30.10 · the row\'s parts: red first, a level with nothing left out, the same words the status bar uses', () => {
  assert.deepEqual(issueParts({ red: 2, yellow: 1 }), [
    { level: 'red', count: 2, label: '2 red' },
    { level: 'yellow', count: 1, label: '1 yellow' },
  ]);
  assert.deepEqual(issueParts({ red: 0, yellow: 3 }), [{ level: 'yellow', count: 3, label: '3 yellow' }]);
  assert.deepEqual(issueParts({}), []);
  assert.equal(issueCountText({ red: 2, yellow: 1 }), '2 red · 1 yellow', 'one law, two readers');
  const findings = [
    { check: 3, level: 'yellow', unitId: 'w', message: 'M3', subject: { unitId: 'w' } },
    { check: 18, level: 'red', unitId: 'w', message: 'M18', subject: { unitId: 'w' } },
  ];
  const issue = unitIssue(findings, 'w');
  assert.deepEqual(issueParts(issue), [
    { level: 'red', count: 1, label: '1 red' },
    { level: 'yellow', count: 1, label: '1 yellow' },
  ]);
});

test('30.10 · the strip (source): one row, data-studio hooks, the list over the row, Show kept, no colour or size typed', () => {
  const strip = read('src/components/studio/IssueStrip.jsx');
  const code = strip.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.match(code, /data-studio="issues-row"/);
  assert.match(code, /data-studio="inspector-issues"/);
  assert.match(code, /data-studio="issue-strip"/);
  assert.match(code, /data-studio="issue-show"/);
  assert.equal((code.match(/data-studio="issues-row"/g) || []).length, 1, 'one row');
  assert.ok(code.indexOf('data-studio="inspector-issues"') < code.indexOf('data-studio="issues-row"'), 'the list over the row');
  assert.match(code, /issueParts\(issue\)/);
  assert.doesNotMatch(code, /style=|#[0-9a-f]{6}\b|\d+px/i, 'the skin draws it; no look typed here');
  // The host hands the strip the foot and draws no list wrapper of its own.
  const host = read('src/components/studio/InspectorHost.jsx');
  assert.match(host, /\{renderStrip \? renderStrip\(unitId\) : null\}/);
  assert.doesNotMatch(host.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''), /inspector-issues/);
  // The chevron: up while folded (the list unfolds upward), down while unfolded.
  assert.match(code, /<Icon name=\{open \? 'down' : 'up'\} \/>/);
  assert.match(read('src/components/studio/StudioIcons.jsx'), /\n  up: 'm6 15 6-6 6 6',\n/);
});
