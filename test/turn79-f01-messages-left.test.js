/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T79 F1 · MESSAGES GO TO THE LEFT, AND KEEP A HISTORY ───────────────────
//
// The owner, 18.10.2026: *"wszystkie informacje po zmianach które pokazujesz na
// ekranie proszę zrób po lewej, niech one tam znikają, można na dole po lewej
// zrobić jakby listę rozwijaną i tam historia zmian; powód: teraz wszystkie
// informacje pokazują się na środku i zasłaniają nam widok pracy."*
//
// The contracts (how long each level stays) are T31's and untouched; this file
// holds where they stand (one bottom-left column) and the Changes list (the
// last `profile.ui.messages.historyMax` messages, newest first).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  LEVELS, greyMs, historyMax, historyRow, historyTime, makeMessage, messagesAt,
  recordHistory,
} from '../src/engine/messages.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { useUiStore } from '../src/stores/uiStore.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const UI = () => useUiStore.getState();
const reset = () => useUiStore.setState({ messages: [], history: [], historyOpen: false });

// ─── WHERE THEY STAND ───────────────────────────────────────────────────────

test('F1 · the three levels place LEFT, and nothing stands in the centre or the bottom', () => {
  for (const level of ['red', 'yellow', 'grey']) {
    assert.equal(LEVELS[level].place, 'left', `${level} stands on the left`);
    assert.equal(makeMessage('x', level, { at: 1, profile: P }).place, 'left');
  }
  const list = [
    makeMessage('saved', 'ok', { at: 3, profile: P }),
    makeMessage('boom', 'error', { at: 1, profile: P }),
    makeMessage('careful', 'warn', { at: 2, profile: P }),
    makeMessage('later grey', 'info', { at: 4, profile: P }),
  ];
  // Red above yellow above grey, the newest of a level nearest the bar.
  assert.deepEqual(messagesAt(list, 'left').map((m) => m.message), ['boom', 'careful', 'saved', 'later grey']);
  assert.deepEqual(messagesAt(list, 'centre'), []);
  assert.deepEqual(messagesAt(list, 'bottom'), []);
});

test('F1 · the timing is unchanged: grey on its clock, yellow on click-away, red on click', () => {
  assert.equal(LEVELS.grey.until, 'time');
  assert.equal(LEVELS.yellow.until, 'clickAway');
  assert.equal(LEVELS.red.until, 'click');
  assert.equal(P.ui.messages.greyMs, 3000);
  assert.equal(greyMs(P), 3000);
});

test('F1 · the centre block and the bottom-centre block are GONE from the source (kasacja)', () => {
  const src = read('src/components/Messages.jsx');
  assert.ok(!src.includes('data-messages="centre"'), 'the centre block is deleted');
  assert.ok(!src.includes('data-messages="bottom"'), 'the bottom-centre block is deleted');
  assert.ok(!/top-1\/2|left-1\/2|-translate-x-1\/2/.test(src), 'nothing is centred on the screen any more');
  assert.ok(!/messagesAt\(messages, '(?:centre|bottom)'\)/.test(src));
  // ONE column, bottom-left, the message layer, the width CLAUDE.md names.
  assert.ok(src.includes('data-messages="left"'));
  assert.match(src, /absolute left-3 bottom-3 max-w-\[26rem\]/);
  assert.match(src, /LAYER_CLASS\.message/);
  // From the bottom up: the Changes bar, the messages, then what the page
  // hands in. In source order (top to bottom of the column) that is the
  // children, the list, the bar.
  const col = src.slice(src.indexOf('data-messages="left"'));
  const at = (needle) => col.indexOf(needle);
  assert.ok(at('{children}') > 0, 'the page slot is in the column');
  assert.ok(at('{children}') < at('data-messages-list'), 'the page slot stands above the messages');
  assert.ok(at('data-messages-list') < at('<HistoryBar />'), 'the messages stand above the bar');
});

test('F1 · the page puts the front-gap rows in the column, and mounts the column once', () => {
  const page = read('src/pages/ConfiguratorPage.jsx');
  assert.equal([...page.matchAll(/<Messages\b/g)].length, 1, 'one column in the configurator');
  const open = page.indexOf('<Messages>');
  const close = page.indexOf('</Messages>');
  assert.ok(open > 0 && close > open);
  const inside = page.slice(open, close);
  assert.ok(inside.includes('<FrontGapWarnings />'), 'the front-gap rows stand in the column');
  assert.match(inside, /\[&>\*\]:!static/, 'their own corner placement yields to the column');
  assert.equal([...page.matchAll(/<FrontGapWarnings\b/g)].length, 1, 'and nowhere else');
  // FrontGapWarnings keeps its file (and so its retail copy) byte for byte.
  assert.match(read('src/components/FrontGapWarnings.jsx'), /absolute left-3 bottom-3/);
  // The start screen mounts the same column.
  assert.match(read('src/App.jsx'), /<Messages \/>/);
});

test('F1 · retail is untouched: it mounts no Messages', () => {
  const walk = (dir) => readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  const root = new URL('../src/retail/', import.meta.url).pathname;
  const hits = walk(root).filter((f) => /\.(js|jsx|mjs)$/.test(f))
    .filter((f) => /components\/Messages\.jsx/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(hits, []);
});

// ─── THE CHANGES LIST ───────────────────────────────────────────────────────

test('F1 · historyMax is a profile number, 50, and a profile that never heard of it still works', () => {
  assert.equal(P.ui.messages.historyMax, 50);
  assert.equal(historyMax(P), 50);
  assert.equal(historyMax(null), 50);
  assert.equal(historyMax({ ui: { messages: { historyMax: 3 } } }), 3);
});

test('F1 · a row is { id, message, level, at }, newest first, and a 51st entry drops the oldest', () => {
  let h = [];
  for (let i = 1; i <= 51; i += 1) {
    h = recordHistory(h, historyRow(makeMessage(`m${i}`, 'warn', { id: `id${i}`, at: i, profile: P })), historyMax(P));
  }
  assert.equal(h.length, 50);
  assert.deepEqual(Object.keys(h[0]).sort(), ['at', 'id', 'level', 'message']);
  assert.equal(h[0].message, 'm51', 'newest first');
  assert.equal(h[49].message, 'm2', 'the oldest kept');
  assert.ok(!h.some((r) => r.message === 'm1'), 'the first one went');
});

test('F1 · the store keeps the history: 51 messages leave 50 rows, the oldest gone', () => {
  reset();
  for (let i = 1; i <= 51; i += 1) UI().notify(`Notice number ${i}`, 'warn');
  const h = UI().history;
  assert.equal(h.length, 50);
  assert.equal(h[0].message, 'Notice number 51');
  assert.equal(h[0].level, 'yellow');
  assert.equal(h[h.length - 1].message, 'Notice number 2');
  assert.ok(!h.some((r) => r.message === 'Notice number 1'));
  // The screen sheds by its own rule (five at once); the list is not the screen.
  assert.equal(UI().messages.length, P.ui.messages.maxOnScreen);
  reset();
});

test('F1 · a folded `N × msg` is ONE row, updated in place', () => {
  reset();
  UI().notify('Blocked by a hinge', 'warn');
  UI().notify('Something else', 'warn');
  UI().notify('Blocked by a hinge', 'warn');
  UI().notify('Blocked by a hinge', 'warn');
  const h = UI().history;
  assert.equal(h.length, 2, 'two sentences, two rows');
  assert.equal(h[0].message, 'Something else', 'the fold did not move its row');
  assert.equal(h[1].message, '3 × Blocked by a hinge');
  assert.equal(UI().messages.find((m) => m.baseMessage === 'Blocked by a hinge').id, h[1].id);
  reset();
});

test('F1 · a red folds by its count, and its row says `N × ` too, still ONE row', () => {
  reset();
  UI().notify('Could not save the project', 'error');
  UI().notify('Could not save the project', 'error');
  const reds = UI().messages.filter((m) => m.level === 'red');
  assert.equal(reds.length, 1, 'one red on the screen');
  assert.equal(reds[0].count, 2);
  const h = UI().history;
  assert.equal(h.length, 1, 'one row');
  assert.equal(h[0].id, reds[0].id);
  assert.equal(h[0].message, '2 × Could not save the project');
  assert.equal(h[0].level, 'red');
  reset();
});

test('F1 · the screen says a fold\'s count once: in the text of a yellow or grey, beside a red', () => {
  const src = read('src/components/Messages.jsx');
  assert.match(src, /msg\.count > 1 && msg\.baseMessage == null \? `\$\{msg\.message\} · ×\$\{msg\.count\}`/);
});

test('F1 · the bar covers nothing at the bottom-left: the CNC layer legend stands on it', () => {
  const cnc = read('src/components/CncView.jsx');
  const legend = cnc.slice(cnc.indexOf('layer legend'), cnc.indexOf('>Layers<'));
  assert.ok(legend.length > 0);
  assert.match(legend, /absolute bottom-11 left-3/, 'the legend is lifted over the Changes bar');
  assert.ok(!/bottom-3 left-3/.test(legend), 'and no longer stands where the bar stands');
});

test('F1 · a message that leaves the screen stays in the list', () => {
  reset();
  UI().notify('Saved the part list', 'ok');
  UI().notify('Careful here', 'warn');
  UI().dismissOnClickAway();
  assert.ok(!UI().messages.some((m) => m.level === 'yellow'), 'the yellow left the screen');
  assert.deepEqual(UI().history.map((r) => r.message), ['Careful here', 'Saved the part list']);
  UI().clearMessages();
  assert.equal(UI().history.length, 2, 'clearing the screen is not clearing the list');
  reset();
});

test('F1 · the bar: collapsed by default, a click toggles, Escape collapses, Clear empties', () => {
  reset();
  assert.equal(UI().historyOpen, false, 'collapsed by default');
  UI().toggleHistory();
  assert.equal(UI().historyOpen, true);
  UI().closeHistory();
  assert.equal(UI().historyOpen, false);
  UI().notify('One thing', 'warn');
  UI().clearHistory();
  assert.deepEqual(UI().history, []);
  const src = read('src/components/Messages.jsx');
  assert.match(src, /e\.key === 'Escape'\) closeHistory\(\)/, 'Escape collapses the list');
  assert.match(src, /`Changes · \$\{history\.length\} \$\{open \? '▾' : '▴'\}`/, 'the bar reads Changes · N');
  assert.match(src, /data-message-history-toggle/);
  assert.match(src, /data-message-history-clear/);
  assert.match(src, /cc-scroll/);
  assert.match(src, /historyTime\(row\.at\)/, 'each row says its time');
  reset();
});

test('F1 · the list is not persisted', () => {
  const store = read('src/stores/uiStore.js');
  const block = store.slice(store.indexOf('T79 F1 · THE CHANGES LIST'), store.indexOf('clearHistory:'));
  assert.ok(block.length > 0);
  assert.ok(!/localStorage|sessionStorage/.test(block), 'nothing of the list is saved');
});

test('F1 · a row says its time as HH:MM on the local clock', () => {
  const at = new Date(2026, 9, 18, 9, 5, 30).getTime();
  assert.equal(historyTime(at), '09:05');
  assert.match(historyTime(Date.now()), /^\d\d:\d\d$/);
});
