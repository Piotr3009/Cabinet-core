/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F1 . THE LISP OF THE MIRROR CABINET, FIRST (reference/lisp/KIT_MIRROR.lsp)
//
// CLAUDE.md T83 F1: *"Parent KIT_WUD_FULL, with these differences, each a
// named section D1 to Dn with its source"*, and the law *"LISP IS LAW (this
// turn cuts: PART A and PART B begin with the LISP)"*. The kit's routines are
// RUN here (test/lisp-mini.js) on the worked example of its NUMBERS block,
// the cabinet of elevation 34 and section 33 (1350 x 1100 x 215, panels 30,
// doors 330 / 480 / 330, stiles 75, the box 100), and their answers are held
// to the drawing, to profile.mirror, to the parent's numbers as the house
// cuts them today and to the kit's own prose. Nothing in the engine cuts a
// mirror cabinet in F1: computeCabinet reads no profile.mirror key.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { loadLisp } from './lisp-mini.js';
import { parenBalance, balanceOfKits, lispConstant } from '../scripts/t57-paren-balance.mjs';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import HINGE_COUNT from '../reference/hardware/cliptop-hinge-count.json' with { type: 'json' };

const ROOT = new URL('../', import.meta.url).pathname;
const KIT = 'KIT_MIRROR.lsp';
const TEXT = readFileSync(`${ROOT}reference/lisp/${KIT}`, 'utf8');
const L = loadLisp(TEXT);
// The prose with its `;;;` and its wrapping folded away, as a person reads it.
const PROSE = TEXT.split('\n').map((l) => l.replace(/^;;;\s?/, '')).join(' ').replace(/\s+/g, ' ');
const say = (s) => assert.ok(PROSE.includes(s), `the kit states: ${s}`);
const K = (name) => lispConstant(name, `${ROOT}reference/lisp`, KIT);
const M = P.mirror;

// The worked example: 1350 x 1100 x 215, G 18, the door board 18, panels 30 all on, mirror doors, the box.
const G = 18;
const D = 215;
function example({
  W = 1350, H = 1100, on = [true, true, true, true], pt = 30, mirrorOn = true, boxOn = true,
  bays = 3, kind = 'led', kinds = null, widths = null, hands = null,
} = {}) {
  const [x0, y0, Wc, Hc] = L.call('mirror-carcass', W, H, ...on, pt);
  const faceT = L.call('mirror-face-t', 18, mirrorOn);
  const boxH = L.call('mirror-box-h', boxOn);
  const ks = L.call('mirror-stile-kinds', bays, kind, kinds) || [];
  const ws = L.call('mirror-widths', Wc, bays, widths, ks, 75);
  const zones = L.call('mirror-zones', x0, ws, ks, 75);
  const yD = L.call('mirror-door-y', y0, boxH);
  const hD = L.call('mirror-door-h', Hc, boxH);
  const doors = L.call('mirror-doors', zones, yD, hD, D, faceT, L.call('mirror-hands', bays, hands));
  const bf = L.call('mirror-floor', y0, G, boxH);
  const bc = L.call('mirror-ceiling', y0, Hc, G);
  const dvs = L.call('mirror-dividers', zones, bf, bc, D, G) || [];
  return {
    x0, y0, Wc, Hc, faceT, boxH, kinds: ks, widths: ws, zones, yD, hD, doors, bf, bc, dvs,
    stiles: L.call('mirror-stiles', zones, ks, yD, hD, D, faceT) || [],
    bays: L.call('mirror-bays', x0, Wc, G, dvs),
    panels: L.call('mirror-panels', W, H, D, faceT, ...on, pt) || [],
  };
}

// ═══ THE FILE ════════════════════════════════════════════════════════════

test('F1 . KIT_MIRROR.lsp: the Skylon header of KIT_INFRAME, ASCII, no dash, no load at the top level', () => {
  const inframe = readFileSync(`${ROOT}reference/lisp/KIT_INFRAME.lsp`, 'utf8').split('\n').slice(0, 4).join('\n');
  assert.ok(TEXT.startsWith(`${inframe}\n`), 'the four copyright lines of KIT_INFRAME.lsp, byte for byte');
  assert.ok(/^[\x00-\x7F]*$/.test(TEXT), 'ASCII (AutoCAD\'s loader)');
  assert.doesNotMatch(TEXT, /[–—]/, 'no em or en dash');
  assert.doesNotMatch(TEXT.replace(/;.*$/gm, ''), /\(load\b/, 'nothing is loaded from here: the routines need nothing');
  assert.match(TEXT, /^;;; Command: MIRROR_FULL$/m);
  assert.match(TEXT, /^;;; Requires: SKYLON_COMMON\.lsp loaded first/m);
  assert.match(TEXT, /^;;; Derived from: KIT_WUD_FULL\.lsp \(the parent: the wall unit/m);
});

test('F1 . parens 0/0, a kit not a stub, and the census reads it (turn35-lisp-parens walks it by name too)', () => {
  const b = parenBalance(TEXT);
  assert.equal(b.balance, 0);
  assert.equal(b.negativeAt, null);
  assert.ok(b.open > 300, 'a kit, not a stub');
  const rows = balanceOfKits(`${ROOT}reference/lisp`);
  assert.ok(rows.some((r) => r.name === KIT), 'the census reads it');
  for (const r of rows) assert.equal(r.balance, 0, r.name);
});

test('F1 . every routine is the kit\'s own: no name of another kit, no local or flag that folds onto a parameter', () => {
  const defuns = [...TEXT.replace(/;.*$/gm, '').matchAll(/\(defun\s+([^\s(]+)\s*\(([^)]*)\)/g)];
  assert.ok(defuns.length > 80, `${defuns.length} defuns`);
  const mine = new Set(defuns.map((m) => m[1].toLowerCase()));
  for (const name of mine) assert.match(name, /^(mirror|c:mirror_full)/, `${name} carries the kit's prefix`);
  for (const other of balanceOfKits(`${ROOT}reference/lisp`).map((r) => r.name).filter((n) => n !== KIT)) {
    const code = readFileSync(`${ROOT}reference/lisp/${other}`, 'utf8').replace(/;.*$/gm, '');
    for (const m of code.matchAll(/\(defun\s+([^\s(]+)/g)) {
      assert.ok(!mine.has(m[1].toLowerCase()), `${other} defines ${m[1]} too`);
    }
  }
  // AutoLISP folds case: `pT` beside `pt` is one symbol; a local beside its parameter is set to nil on entry.
  for (const [, name, spec] of defuns) {
    const [params, locals = ''] = spec.split('/');
    const ps = params.trim().split(/\s+/).filter(Boolean).map((s) => s.toLowerCase());
    assert.equal(new Set(ps).size, ps.length, `${name}: two parameters fold onto one symbol`);
    for (const l of locals.trim().split(/\s+/).filter(Boolean)) {
      assert.ok(!ps.includes(l.toLowerCase()), `${name}: the local ${l} folds onto a parameter`);
    }
  }
  // The routine names engine/mirrorCabinet.js mirrors, one for one.
  for (const r of ['mirror-mm', 'mirror-sum', 'mirror-carcass', 'mirror-face-t', 'mirror-panel-depth', 'mirror-panels',
    'mirror-carcass-boards', 'mirror-box-h', 'mirror-box-lid', 'mirror-box-front', 'mirror-floor', 'mirror-ceiling',
    'mirror-door-y', 'mirror-door-h', 'mirror-stile-kinds', 'mirror-stile-w', 'mirror-stile-ws', 'mirror-stiles-total',
    'mirror-widths-fit-p', 'mirror-own-widths', 'mirror-widths', 'mirror-zones', 'mirror-hands', 'mirror-doors',
    'mirror-stiles', 'mirror-dividers', 'mirror-bays', 'mirror-door-kg', 'mirror-hinge-band', 'mirror-hinge-count',
    'mirror-cups', 'mirror-hinge-board', 'mirror-board-span', 'mirror-overlay', 'mirror-plate-ys', 'mirror-plate-x',
    'mirror-reach-note', 'mirror-shelf-ys', 'mirror-shelf-depth', 'mirror-shelf', 'mirror-shelf-fits-p', 'mirror-pin-ys',
    'mirror-pin-xs', 'mirror-back-panes', 'mirror-hanger-holes', 'mirror-hanger-cuts', 'mirror-led-under-length',
    'mirror-led-inside-length', 'mirror-led-inside-z', 'mirror-proud', 'mirror-face-proud', 'mirror-list-mm',
    'mirror-widths-refusal', 'c:mirror_full']) assert.ok(L.has(r), `${r} defined`);
  // Millimetres divide as reals: AutoLISP divides two integers to an integer.
  for (const m of TEXT.replace(/;.*$/gm, '').matchAll(/\(\/ [^()]*?(\d+)\)/g)) {
    assert.doesNotMatch(m[0], /\s\d+\)$/, `a division by an integer: ${m[0]}`);
  }
});

test('F1 . the owner\'s words of 25.10.2026 are its D-notes, D1 to D21, each with its source', () => {
  for (const words of [
    'zobacz szafki z mirrorami na wierzchu i szybkami w srodku czyli szklane polki, czasami lustro z tylu, podswietlenie pod spodem etc, teraz zaprojektujmy dokladnie to co masz na rysunku szafka wiszaca',
    'w tym przypadku to reces ale tez w standardzie normalnie wiszaca i dodajemy oczywiscie panele dookola i ustawiamy jakie grube',
    'polki szklane, rysujemy szklane 6 mm',
    'lustro opcjonalnie, wtedy pamietaj ze drzwiczki 18 plus 4 mm lustro, przedluzamy panele do grubosci drzwiczek i lustra',
    'czasami jak ktos chce to bedzie mial na plecach tez, klikasz na plecy i wyskakuje ci opcja chcesz lustro na plecach?',
    '5 na kolumne domyslnie ale oczywiscie z mozliwoscia dodawania, przesuwania',
    'panele led trzeba bedzie zamontowac na rowno z drzwiami, nie wcisniete, mamy carcas w srodku i panele dookola tego',
    '"nie wlasny box, ktos nam to zrobi na zamowienie", "4k"',
    'daj wszystkie mozliwosci z panelami, z ledami, bez, szerokosc ustawianych drzwiczek etc',
  ]) say(words);
  const LINES = TEXT.split('\n');
  for (let d = 1; d <= 21; d += 1) {
    const at = LINES.findIndex((l) => new RegExp(`^;;; D${d} {1,2}[A-Z]`).test(l));
    assert.ok(at > 0, `D${d}`);
    // The note to the next one: its source is said in it.
    const end = LINES.findIndex((l, i) => i > at && (/^;;; D\d+ /.test(l) || /^;;;=+$/.test(l)));
    const note = LINES.slice(at, end).join(' ');
    assert.match(note, /CONFIRMED|PROPOSED|DERIVED|DECIDED|CLAUDE\.md/, `D${d} says where it comes from`);
  }
  assert.doesNotMatch(TEXT, /^;;; D22 /m, 'twenty-one decisions');
});

test('F1 . every difference is a named section; the parent is restated, never redefined', () => {
  for (const s of [
    /^;;; 1\. THE LAW IN ONE PARAGRAPH$/m,
    /^;;; 2\. DECISIONS TAKEN FOR THE OWNER/m,
    /^;;; 3\. CONSTANTS \(the owner's numbers; profile\.mirror mirrors them\)$/m,
    /^;;; 4\. THE PARENT'S NUMBERS, RESTATED \(never changed here\)$/m,
    /^;;; 5\. ROUTINES$/m,
    /^;;; ---- \(a\) THE CABINET AND ITS PANELS ROUND ----$/m,
    /^;;; ---- \(b\) THE CARCASS, THE PARENT'S FIVE BOARDS ----$/m,
    /^;;; ---- \(c\) THE BOTTOM BOX ----$/m,
    /^;;; ---- \(d\) THE FACE: DOORS, STILES, DIVIDERS ----$/m,
    /^;;; ---- \(e\) THE WEIGHT AND THE HINGES ----$/m,
    /^;;; ---- \(f\) THE GLASS SHELVES AND THEIR PINS ----$/m,
    /^;;; ---- \(g\) THE BACK'S MIRROR ----$/m,
    /^;;; ---- \(h\) THE HANGERS, THE LIGHT, THE RECESS ----$/m,
    /^;;; ---- \(i\) THE REFUSAL ----$/m,
    /^;;; 6\. NUMBERS/m,
    /^;;; 7\. THE COMMAND/m,
  ]) assert.match(TEXT, s);
  assert.doesNotMatch(TEXT, /\(defun (drawRect|drawCircle|drawText|drawBUL|drawBACK|calcHingePositionsBase)\b/,
    'COMMON\'s routines are called, never redefined');
  // CLAUDE.md T83 F1 (a) to (h), each in its own D.
  say('D4 THE FACE IS SET OUT IN THE TYPED DOOR WIDTHS (CONFIRMED 22:41 "szerokosc ustawianych drzwiczek"');
  say('D7 THE DIVIDERS CARRY THE DOORS');
  say('D8 THE STILE (CONFIRMED 14:14 "panele led trzeba bedzie zamontowac na rowno z drzwiami, nie wcisniete"');
  say('D9 THE MIRROR DOOR (CONFIRMED 14:09 "drzwiczki 18 plus 4 mm lustro")');
  say('D3 THE PANELS ROUND (CONFIRMED 14:09 "dodajemy oczywiscie panele dookola i ustawiamy jakie grube"');
  say('D14 THE GLASS SHELVES (CONFIRMED 14:09 "polki szklane, rysujemy szklane 6 mm"');
  say('D15 THE BACK AND ITS MIRROR (CONFIRMED 14:09 "czasami jak ktos chce to bedzie mial na plecach tez');
  say('D12 THE BOTTOM BOX (the drawing\'s 100; PROPOSED as a box, mirrorBottomBox)');
  say('D17 THE RECESS (CONFIRMED 14:09 "w tym przypadku to reces ale tez w standardzie normalnie wiszaca"');
  say('D5 WIDTHS THAT DO NOT FILL THE CARCASS ARE REFUSED IN WORDS (CLAUDE.md T83 LAWS: the room refuses in words, the engine never squashes)');
});

// ═══ THE NUMBERS: profile.mirror IS THE LISP'S, KEY FOR KEY ══════════════

const KEYS = {
  'defaults.width': 'mirrorWidth',
  'defaults.height': 'mirrorHeight',
  'defaults.depth': 'mirrorDepth',
  'defaults.mountHeight': 'mirrorMountHeight',
  'defaults.overTopMm': 'mirrorOverTop',
  'defaults.bays': 'mirrorBays',
  'defaults.doorWidths': 'mirrorDoorWidths',
  'defaults.stile': 'mirrorStileKind',
  'defaults.stileWidthMm': 'mirrorStileW',
  'defaults.panels.L': 'mirrorPanelsOn',
  'defaults.panels.R': 'mirrorPanelsOn',
  'defaults.panels.top': 'mirrorPanelsOn',
  'defaults.panels.bottom': 'mirrorPanelsOn',
  'defaults.panelT': 'mirrorPanelT',
  'defaults.mirrorDoors': 'mirrorMirrorDoorsOn',
  'defaults.mirrorBack': 'mirrorMirrorBackOn',
  'defaults.shelvesPerBay': 'mirrorShelvesPerBay',
  'defaults.ledUnder': 'mirrorLedUnderOn',
  'defaults.ledInside': 'mirrorLedInsideOn',
  'defaults.bottomBox': 'mirrorBottomBoxOn',
  'defaults.recessMm': 'mirrorRecess',
  doorBoardMm: 'mirrorDoorBoard',
  mirrorMm: 'mirrorMirrorT',
  glassShelfMm: 'mirrorGlassShelf',
  bottomBoxMm: 'mirrorBottomBox',
  boardKgM3: 'mirrorBoardKgM3',
  mirrorKgM2: 'mirrorMirrorKgM2',
  ledKelvin: 'mirrorLedKelvin',
  ledInsideSide: 'mirrorLedInsideSide',
  ledDriverVolts: 'mirrorLedDriverVolts',
  'hangers.perUnit': 'mirrorHangersPerUnit',
  'hangers.name': 'mirrorHangerName',
  'hangers.article': 'mirrorHangerArticle',
  ...Object.fromEntries(Object.keys(M.articles).map((k) => [`articles.${k}`, 'mirrorArticle'])),
};
const leaves = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v)
  ? leaves(v, `${pre}${k}.`) : [[`${pre}${k}`, v]]));
const LINES = TEXT.split('\n');
/** The `;; profile.mirror.` comment a constant sits under. */
function sourceOf(name) {
  const at = LINES.findIndex((l) => l.startsWith(`(defun ${name} ( / )`));
  assert.ok(at > 0, `${name} is a one-line constant`);
  for (let i = at - 1; i >= 0; i -= 1) if (LINES[i].startsWith(';; profile.mirror.')) return LINES[i];
  return null;
}
const fromLisp = (v) => (v === null ? false : v);

test('F1 . every profile.mirror number is a LISP constant of the same value, under its source', () => {
  const all = leaves(M);
  assert.deepEqual(all.map(([k]) => k).sort(), Object.keys(KEYS).sort(), 'every key of profile.mirror has its constant, and no other');
  for (const [key, value] of all) {
    const name = KEYS[key];
    const lisp = typeof value === 'number' ? K(name) : fromLisp(L.call(name));
    assert.deepEqual(lisp, value, `${key} ${value} is ${name} ${lisp}`);
    const src = sourceOf(name);
    const parts = key.split('.');
    const token = parts[0] === 'defaults' ? parts[1] : parts[0];
    assert.ok(src && src.startsWith(';; profile.mirror.') && src.split(/\s{2,}/)[0].includes(token),
      `${name} sits under its key ${token}: ${src}`);
    assert.match(src, /CONFIRMED|PROPOSED/, `${name} says where it comes from`);
  }
  // Millimetres are written as reals: AutoLISP divides two integers to an integer.
  for (const name of ['mirrorWidth', 'mirrorHeight', 'mirrorDepth', 'mirrorMountHeight', 'mirrorOverTop', 'mirrorStileW',
    'mirrorPanelT', 'mirrorDoorBoard', 'mirrorMirrorT', 'mirrorGlassShelf', 'mirrorBottomBox', 'mirrorBoardKgM3',
    'mirrorMirrorKgM2', 'mirrorRecess']) {
    assert.match(TEXT, new RegExp(`\\(defun ${name} \\( / \\) [0-9]+\\.[0-9]+\\)`), `${name} is written as a real`);
  }
  // The owner's and the drawing's numbers are CONFIRMED; the turn's readings are PROPOSED.
  for (const name of ['mirrorWidth', 'mirrorDoorWidths', 'mirrorStileW', 'mirrorPanelT', 'mirrorDoorBoard', 'mirrorMirrorT',
    'mirrorGlassShelf', 'mirrorShelvesPerBay', 'mirrorLedKelvin', 'mirrorRecess']) {
    assert.match(sourceOf(name), /CONFIRMED/, name);
  }
  for (const name of ['mirrorBottomBox', 'mirrorBoardKgM3', 'mirrorMirrorKgM2', 'mirrorLedInsideSide', 'mirrorHangerName']) {
    assert.match(sourceOf(name), /PROPOSED/, name);
  }
  // CLAUDE.md T83 THE NUMBERS, as written.
  assert.deepEqual(M.defaults, {
    width: 1350, height: 1100, depth: 215, mountHeight: 1250, overTopMm: 400,
    bays: 3, doorWidths: [330, 480, 330], stile: 'led', stileWidthMm: 75,
    panels: { L: true, R: true, top: true, bottom: true }, panelT: 30,
    mirrorDoors: true, mirrorBack: false, shelvesPerBay: 5,
    ledUnder: true, ledInside: true, bottomBox: true, recessMm: 0,
  });
  assert.deepEqual([M.doorBoardMm, M.mirrorMm, M.glassShelfMm, M.bottomBoxMm, M.boardKgM3, M.mirrorKgM2, M.ledKelvin],
    [18, 4, 6, 100, 700, 10, 4000]);
  assert.ok(Object.values(M.articles).every((a) => a === ''), 'every article empty for the owner to fill');
  for (const k of ['ledPanel', 'mirror', 'glassShelf', 'ledStripUnder', 'ledStripInside', 'ledDriver', 'fusedSpur', 'shelfPin', 'hanger']) {
    assert.ok(k in M.articles, `the article of ${k}`);
  }
});

test('F1 . profile.js says each mirror number\'s source beside it', () => {
  const src = readFileSync(`${ROOT}src/engine/profile.js`, 'utf8');
  const block = src.slice(src.indexOf('// T83 F1 . THE MIRROR CABINET'), src.indexOf('// ─── T75 F17 · THE FLOATING DESK'));
  for (const s of ['reference/lisp/KIT_MIRROR.lsp', 'CONFIRMED by elevation 34 and section 33',
    'CONFIRMED 14:09 *"drzwiczki 18 plus 4 mm lustro"*', 'CONFIRMED 14:09 *"polki szklane, rysujemy szklane 6 mm"*',
    'PROPOSED as a box (the drawing\'s 100)', 'PROPOSED (KIT_MIRROR.lsp D10)', 'CONFIRMED 14:29 *"4k"*',
    'PROPOSED (KIT_MIRROR.lsp D16)', 'PROPOSED, the vanity\'s']) {
    assert.ok(block.includes(s), `profile.mirror says: ${s}`);
  }
  assert.doesNotMatch(block, /[–—]/, 'no em or en dash');
});

test('F1 . a profile saved before tonight comes back with profile.mirror, a tuned number kept key by key', () => {
  const { mirror, ...old } = { ...P, schema: P.schema };
  assert.ok(mirror);
  assert.deepEqual(migrateCabinetProfile(old).mirror, M, 'the whole block, from the default');
  const tuned = migrateCabinetProfile({
    ...old,
    mirror: { bottomBoxMm: 120, defaults: { panelT: 25, panels: { bottom: false } }, articles: { mirror: 'M-4' } },
  }).mirror;
  assert.equal(tuned.bottomBoxMm, 120, 'the owner\'s own number stands');
  assert.equal(tuned.doorBoardMm, 18);
  assert.equal(tuned.defaults.panelT, 25);
  assert.deepEqual(tuned.defaults.panels, { L: true, R: true, top: true, bottom: false }, 'key by key in the nested block');
  assert.deepEqual(tuned.defaults.doorWidths, [330, 480, 330]);
  assert.equal(tuned.articles.mirror, 'M-4');
  assert.equal(tuned.articles.ledPanel, '');
  assert.deepEqual(tuned.hangers, M.hangers);
});

test('F1 . the parent\'s numbers the kit restates are the house\'s, number for number', () => {
  const pairs = [
    ['mirrorGap', P.doors.gap], ['mirrorTopDemand', P.doors.gap],
    ['mirrorCupBottom', P.hinges.cups.baseOffsets.bottom], ['mirrorCupUpperFromTop', P.hinges.cups.baseOffsets.upperFromTop],
    ['mirrorCupTopFromTop', P.hinges.cups.baseOffsets.topFromTop], ['mirrorCupFromEdge', P.hinges.cups.xFromHingeEdge],
    ['mirrorPlateFromFront', P.hinges.xFromFrontEdge], ['mirrorPlatePair', P.hinges.holePairOffset],
    ['mirrorPinColumn', P.shelfHoles.columnFromEdge], ['mirrorPinD', P.shelfHoles.diameter],
    ['mirrorShelfWidthClear', P.carcass.shelfWidthClearance], ['mirrorShelfFrontClear', P.carcass.shelfDepthClearance],
    ['mirrorHangerFromTop', P.wallUnit.hangers.fromTop], ['mirrorHangerHoleD', P.wallUnit.hangers.holeDiameter],
    ['mirrorHangerCutW', P.wallUnit.hangers.cutoutWidth], ['mirrorHangerCutH', P.wallUnit.hangers.cutoutHeight],
    ['mirrorBlumBeyond', HINGE_COUNT._beyond_the_table.hinges],
  ];
  for (const [name, house] of pairs) assert.equal(K(name), house, `${name} is the house's ${house}`);
  assert.deepEqual(L.call('mirrorPinCluster'), P.shelfHoles.clusterOffsets, 'the pin cluster');
  assert.deepEqual(L.call('mirrorHangerFromBack'), P.wallUnit.hangers.fromBackEdge, 'the hanger holes');
  assert.deepEqual(L.call('mirrorBlumBands'), HINGE_COUNT.bands.map((b) => [b.maxHeightMm, b.maxWeightKg, b.hinges]),
    'the Blum CLIP top table, band for band');
  // WUD's own cups and its shelf, as the parent draws them (SKYLON_COMMON, KIT_WUD_FULL).
  const wud = readFileSync(`${ROOT}reference/lisp/KIT_WUD_FULL.lsp`, 'utf8');
  assert.match(wud, /\(setq hingeCupList \(list \(\+ 100\.0 doorExtend\) \(- wysFront 297\.0\) \(- wysFront 97\.0\)\)\)/);
  assert.match(wud, /szerSHELF \(- szerSzafki \(\* 2\.0 gruboscPlyty\) 4\.0\) wysSHELF \(- glSzafki gruboscPlyty 20\.0\)/);
  assert.match(wud, /\(drawCircle "HINGES_5MM" \(\+ cncX szerBUL -21\.0\) \(\+ cncY wysBUL -53\.0\) 2\.5\)/);
  assert.match(wud, /\(drawRect "HANGER_HOLE" cncX \(\+ cncY wysBACK -58\.0\) \(\+ cncX 30\.0\) \(\+ cncY wysBACK\)\)/);
});

test('F1 . computeCabinet reads no profile.mirror key: the wall unit, the vanity and the base units cut what they cut', () => {
  const { mirror, ...without } = P;
  assert.ok(mirror);
  for (const type of ['BUD', 'BUDR', 'WUD', 'WUD_GLASS', 'WARDROBE', 'SINK', 'VANITY3', 'HAWA_POCKET']) {
    const params = { ...defaultParamsFor(type, P), type };
    assert.deepEqual(computeCabinet(params, without), computeCabinet(params, P), `${type} moved with profile.mirror`);
  }
});

// ═══ THE WORKED EXAMPLE, RUN ════════════════════════════════════════════

test('F1 (a) (b) . the cabinet 1350 x 1100 with its panels: the carcass 1290 x 1040 inside, the panels 237 deep', () => {
  const e = example();
  assert.deepEqual([e.x0, e.y0, e.Wc, e.Hc], [30, 30, 1290, 1040]);
  assert.equal(e.faceT, 22);
  assert.equal(L.call('mirror-panel-depth', D, e.faceT), 237, '215 karkas + 22 drzwi = 237');
  assert.deepEqual(e.panels, [
    ['PANEL-L', 0, 0, 0, 30, 1100, 237],
    ['PANEL-R', 1320, 0, 0, 30, 1100, 237],
    ['PANEL-TOP', 30, 1070, 0, 1290, 30, 237],
    ['PANEL-BOTTOM', 30, 0, 0, 1290, 30, 237],
  ]);
  assert.deepEqual(L.call('mirror-carcass-boards', e.x0, e.y0, e.Wc, e.Hc, D, G), [
    ['BUL', 30, 30, 18, 18, 1040, 197],
    ['BUR', 1302, 30, 18, 18, 1040, 197],
    ['TOP', 48, 1052, 18, 1254, 18, 197],
    ['BOTTOM', 48, 30, 18, 1254, 18, 197],
    ['BACK', 30, 30, 0, 1290, 1040, 18],
  ]);
  say('THE CARCASS. At x 30 y 30, 1290 x 1040: BUL at x 30 and BUR at x 1302, 18 x 1040 x 197 from z 18; TOP 1254 x 197 at y 1052, BOTTOM at y 30; the BACK 1290 x 1040 at z 0.');
  say('THE PANELS. 237 deep (215 + 18 + 4): PANEL-L and PANEL-R 30 x 1100 at x 0 and 1320; PANEL-TOP and PANEL-BOTTOM 1290 x 30 at x 30, y 1070 and 0.');
  // Panels off: the carcass is the cabinet (D2). Side panels off: top and bottom over the carcass.
  assert.deepEqual(L.call('mirror-carcass', 1350, 1100, null, null, null, null, 30), [0, 0, 1350, 1100]);
  assert.deepEqual(L.call('mirror-panels', 1350, 1100, D, 22, null, null, true, true, 30), [
    ['PANEL-TOP', 0, 1070, 0, 1350, 30, 237], ['PANEL-BOTTOM', 0, 0, 0, 1350, 30, 237]]);
  assert.deepEqual(L.call('mirror-panels', 1350, 1100, D, 22, true, null, true, null, 30), [
    ['PANEL-L', 0, 0, 0, 30, 1100, 237], ['PANEL-TOP', 30, 1070, 0, 1320, 30, 237]]);
  // No mirror: the panels reach the board's face, 233.
  assert.equal(L.call('mirror-panel-depth', D, L.call('mirror-face-t', 18, null)), 233);
  say('NO MIRROR. The doors 18 thick, the panels 233 deep; the 477 door 5.6316 kg, 3 hinges.');
});

test('F1 (c) . the bottom box: BOX-TOP 100 over the underside, the strip 1287 x 97, the doors from its top', () => {
  const e = example();
  assert.equal(e.boxH, 100);
  assert.deepEqual(L.call('mirror-box-lid', e.x0, e.y0, e.Wc, D, G, e.boxH), ['BOX-TOP', 48, 112, 18, 1254, 18, 197]);
  assert.deepEqual(L.call('mirror-box-front', e.x0, e.y0, e.Wc, D, 18, e.boxH), ['BOX-FRONT', 31.5, 30, 215, 1287, 97, 18]);
  assert.deepEqual([e.bf, e.bc, e.yD, e.hD], [130, 1052, 130, 937]);
  say('THE BOX. BOX-TOP 1254 x 197 at y 112 (its top face at 130); BOX-FRONT 1287 x 97 x 18 at x 31.5, y 30, z 215.');
  // Off: no lid, no strip, the doors from the carcass underside and the bays on the BOTTOM.
  const off = example({ boxOn: false });
  assert.equal(L.call('mirror-box-lid', off.x0, off.y0, off.Wc, D, G, off.boxH), null);
  assert.equal(L.call('mirror-box-front', off.x0, off.y0, off.Wc, D, 18, off.boxH), null);
  assert.deepEqual([off.bf, off.yD, off.hD], [48, 30, 1037]);
});

test('F1 (d) . the face: 330 / 75 / 480 / 75 / 330, three doors 327 / 477 / 327 x 937, two stiles, two dividers', () => {
  const e = example();
  assert.deepEqual(e.kinds, ['led', 'led']);
  assert.deepEqual(e.widths, [330, 480, 330]);
  assert.deepEqual(e.zones, [['DOOR', 30, 360], ['STILE', 360, 435], ['DOOR', 435, 915], ['STILE', 915, 990], ['DOOR', 990, 1320]]);
  assert.deepEqual(e.doors, [
    [1, 31.5, 130, 215, 327, 937, 22, 'L'],
    [2, 436.5, 130, 215, 477, 937, 22, 'L'],
    [3, 991.5, 130, 215, 327, 937, 22, 'R'],
  ]);
  assert.deepEqual(e.stiles, [[1, 'led', 360, 130, 215, 75, 937, 22], [2, 'led', 915, 130, 215, 75, 937, 22]]);
  assert.deepEqual(e.dvs, [[1, 388.5, 130, 18, 18, 922, 197], [2, 943.5, 130, 18, 18, 922, 197]]);
  assert.deepEqual(e.bays, [[1, 48, 388.5], [2, 406.5, 943.5], [3, 961.5, 1302]]);
  // The stile's face is the mirror's face (D8).
  for (const s of e.stiles) assert.equal(s[4] + s[7], e.doors[0][3] + e.doors[0][6]);
  say('THE FACE. The zones 30..360 door, 360..435 stile, 435..915 door, 915..990 stile, 990..1320 door. The doors 327 / 477 / 327 x 937 at x 31.5, 436.5 and 991.5, y 130, 22 thick (18 + 4), hands L L R; the stiles 75 x 937 x 22 at x 360 and 915; DIVIDER-1 at x 388.5 and DIVIDER-2 at x 943.5, 18 x 922 x 197 from y 130 and z 18; the bays 48..388.5, 406.5..943.5, 961.5..1302.');
  say('three doors 330 / 480 / 330 x 1100 less the gaps" is read with the agreed mockup');
});

test('F1 (d) . stile none: the doors meet over the dividers 3 apart; the kit\'s own widths; a timber stile', () => {
  const none = example({ kind: 'none', widths: [405, 480, 405] });
  assert.deepEqual(none.stiles, []);
  assert.deepEqual(none.doors.map((d) => [d[1], d[4]]), [[31.5, 402], [436.5, 477], [916.5, 402]]);
  assert.deepEqual(none.dvs.map((d) => d[1]), [426, 906]);
  assert.equal(none.doors[1][1] - (none.doors[0][1] + none.doors[0][4]), 3, 'WUD\'s pair: 3 apart over the divider');
  assert.deepEqual(example({ kind: 'none' }).widths, [430, 430, 430], 'the kit\'s own: the carcass shared');
  say('NO STILES. stile "none", widths 405 480 405: the doors 402 / 477 / 402 at x 31.5, 436.5, 916.5, 3 apart over DIVIDER-1 at x 426 and DIVIDER-2 at x 906. The kit\'s own widths with no stiles: 430 each.');
  // One per divider (D8): a timber stile and none.
  const mixed = example({ kinds: ['timber', 'none'], widths: [330, 480, 405] });
  assert.deepEqual(mixed.stiles.map((s) => [s[0], s[1]]), [[1, 'timber']]);
  assert.deepEqual(mixed.dvs.map((d) => d[1]), [388.5, 906]);
  // Panels off: the profile's 1140 and 150 make 1290, not 1350: 400 each.
  assert.deepEqual(example({ on: [null, null, null, null] }).widths, [400, 400, 400]);
  say('NO PANELS. The carcass the cabinet, 1350 x 1100 at 0 0; the kit\'s own widths 400 each (the profile\'s 1140 and the stiles\' 150 make 1290, not 1350).');
  // Two bays and one: one stile, then none; L R, then L.
  const two = example({ bays: 2 });
  assert.deepEqual(two.widths, [607.5, 607.5]);
  assert.deepEqual(two.doors.map((d) => d[7]), ['L', 'R']);
  const one = example({ bays: 1 });
  assert.deepEqual([one.widths, one.dvs, one.doors.map((d) => [d[1], d[4], d[7]])], [[1290], [], [[31.5, 1287, 'L']]]);
});

test('F1 (d) D5 . widths that do not fill the carcass are refused in words and cut at the kit\'s own', () => {
  const e = example();
  const said = L.call('mirror-widths-refusal', 'MC01', e.Wc, 3, [330, 480, 300], e.kinds, 75);
  assert.equal(said, 'MC01: the door widths 330 + 480 + 300 and the stiles 75 + 75 make 1260, the carcass is 1290 wide: type door widths that make 1290 with the stiles. The doors are cut at the kit\'s own widths.');
  say(`A WIDTH THAT DOES NOT FIT. 330 480 300: "${said}"`);
  assert.deepEqual(example({ widths: [330, 480, 300] }).widths, [330, 480, 330], 'never the typed ones stretched');
  assert.equal(L.call('mirror-widths-refusal', 'MC01', e.Wc, 3, [330, 480], e.kinds, 75),
    'MC01: 2 door widths for 3 bays: type one width a bay. The doors are cut at the kit\'s own widths.');
  assert.equal(L.call('mirror-widths-refusal', 'MC01', e.Wc, 3, [2, 480, 658], e.kinds, 75),
    'MC01: a door 3 wide or less is no door: type every width wider than 3. The doors are cut at the kit\'s own widths.');
  assert.equal(L.call('mirror-widths-refusal', 'MC01', e.Wc, 3, [300, 540, 300], e.kinds, 75), null, 'typed widths that fit are cut');
  assert.deepEqual(example({ widths: [300, 540, 300] }).widths, [300, 540, 300]);
  assert.equal(L.call('mirror-widths-refusal', 'MC01', e.Wc, 3, null, e.kinds, 75), null, 'nothing typed, nothing said');
});

test('F1 (e) . the door by its weight on the Blum table: 6.9246 and 10.101 kg, 3 hinges at WUD\'s cups', () => {
  const e = example();
  const kg = (d, mirrorOn = true) => L.call('mirror-door-kg', d[4], d[5], 18, mirrorOn);
  assert.ok(Math.abs(kg(e.doors[0]) - 6.9246174) < 1e-6);
  assert.ok(Math.abs(kg(e.doors[1]) - 10.1010474) < 1e-6);
  assert.ok(Math.abs(kg(e.doors[1], null) - 5.6315574) < 1e-6);
  for (const d of e.doors) {
    assert.deepEqual(L.call('mirror-hinge-band', d[5], kg(d)), [1600, 13, 3]);
    assert.equal(L.call('mirror-hinge-count', d[5], kg(d)), 3);
    assert.deepEqual(L.call('mirror-cups', d[5], 3), [100, 640, 840]);
  }
  say('THE HINGES. The 327 door 6.9246 kg, the 477 door 10.101 kg (3.8606 + 3.064 and 5.6316 + 4.4695): both in the 1600 / 13 band, 3 hinges, the cups at 100 640 840');
  // The boards they hang on, and how far each covers it (D11).
  const reach = e.doors.map((d) => {
    const hb = L.call('mirror-hinge-board', d[0], 3, d[7]);
    const sp = L.call('mirror-board-span', hb[0], e.x0, e.Wc, G, e.dvs);
    return [hb, L.call('mirror-overlay', d, d[7], sp[0], sp[1])];
  });
  assert.deepEqual(reach, [[['BUL', 'R'], 16.5], [['DIVIDER-1', 'R'], -30], [['BUR', 'L'], 16.5]]);
  const note = L.call('mirror-reach-note', 'MC01', 2, 'DIVIDER-1', -30);
  assert.equal(note, 'MC01: door 2 hangs on DIVIDER-1 and stands 30 mm off its face: the hinge that reaches it is the owner\'s to name.');
  say(`the middle one stands 30 off DIVIDER-1's face: "${note}"`);
  assert.equal(L.call('mirror-reach-note', 'MC01', 1, 'BUL', 16.5), null);
  // The plates (D10).
  assert.deepEqual(L.call('mirror-plate-ys', [100, 640, 840], e.yD, e.y0), [184, 216, 724, 756, 924, 956]);
  assert.deepEqual(L.call('mirror-plate-ys', [100, 640, 840], e.yD, e.dvs[0][2]), [84, 116, 624, 656, 824, 856]);
  assert.deepEqual(['BUL', 'BUR'].map((b) => L.call('mirror-plate-x', b, b === 'BUL' ? 'R' : 'L', 197)), [37, 160]);
  assert.deepEqual(['R', 'L'].map((f) => L.call('mirror-plate-x', 'DIVIDER-1', f, 197)), [160, 37]);
  say('The plates on BUL at x 37, y 184 216 724 756 924 956; on DIVIDER-1\'s right face at x 160, y 84 116 624 656 824 856; on BUR at x 160 as BUL.');
  // A heavy door: two bands up, five hinges evenly between WUD's two ends.
  const heavy = L.call('mirror-door-kg', 600, 1700, 18, true);
  assert.ok(Math.abs(heavy - 23.052) < 1e-9);
  assert.equal(L.call('mirror-hinge-count', 1700, heavy), 5);
  assert.deepEqual(L.call('mirror-cups', 1700, 5), [100, 475.75, 851.5, 1227.25, 1603]);
  say('A HEAVY DOOR. 600 x 1700 with a mirror: 23.052 kg (12.852 + 10.2), 5 hinges (the 2400 / 24 band), the cups at 100, 475.75, 851.5, 1227.25, 1603.');
  // Two hinges at the two ends; past the table, six.
  assert.deepEqual(L.call('mirror-cups', 600, 2), [100, 503]);
  assert.equal(L.call('mirror-hinge-count', 600, 5), 2);
  assert.equal(L.call('mirror-hinge-count', 2500, 10), 6);
});

test('F1 (f) (g) . five glass shelves a bay, 6 x 177 on the house\'s pins; the back\'s mirror three panes', () => {
  const e = example();
  const ys = L.call('mirror-shelf-ys', e.bf, e.bc, 5);
  const want = [283.6667, 437.3333, 591, 744.6667, 898.3333];
  ys.forEach((y, i) => assert.ok(Math.abs(y - want[i]) < 1e-4, `shelf ${i + 1} at ${y}`));
  assert.deepEqual(e.bays.map((b) => L.call('mirror-shelf', b, 591, D, G, null)), [
    [50, 591, 18, 336.5, 6, 177], [408.5, 591, 18, 533, 6, 177], [963.5, 591, 18, 336.5, 6, 177]]);
  say('THE SHELVES. Five a bay, 6 x 177 deep at z 18, 336.5 / 533 / 336.5 wide, their undersides at 130 + 922 / 6 x i: 283.6667, 437.3333, 591, 744.6667, 898.3333; the pins 70 and 127 from the boards\' front edges.');
  assert.deepEqual(L.call('mirror-pin-xs', 197), [70, 127]);
  // Three a shelf on the board's own frame, each row once (a divider serves two bays).
  const rows = L.call('mirror-pin-ys', [...ys, ...ys], e.dvs[0][2], e.dvs[0][5]);
  assert.equal(rows.length, 15);
  assert.ok(Math.abs(rows[0] - (ys[0] - 50 - 130)) < 1e-9);
  assert.deepEqual(L.call('mirror-pin-ys', [140], 130, 922), [10, 60], 'a row under the board is not drilled');
  assert.equal(L.call('mirror-shelf-fits-p', 1047, e.bf, e.bc), null, 'a shelf through the TOP');
  assert.equal(L.call('mirror-shelf-fits-p', 591, e.bf, e.bc), true);
  // The back's mirror: a pane a bay, and the shelves 4 shorter (material never enters material).
  assert.deepEqual(L.call('mirror-back-panes', e.bays, e.bf, e.bc, G), [
    [1, 48, 130, 18, 340.5, 922, 4], [2, 406.5, 130, 18, 537, 922, 4], [3, 961.5, 130, 18, 340.5, 922, 4]]);
  assert.deepEqual(L.call('mirror-shelf', e.bays[0], 591, D, G, true), [50, 591, 22, 336.5, 6, 173]);
  say('THE BACK\'S MIRROR. Three panes 340.5 / 537 / 340.5 x 922 x 4 at z 18; the shelves 173 deep from z 22.');
});

test('F1 (h) . the hangers, the light and the recess', () => {
  const e = example();
  assert.deepEqual(L.call('mirror-hanger-holes', 'BUL', 197, e.Hc), [[176, 987], [144, 987]]);
  assert.deepEqual(L.call('mirror-hanger-holes', 'BUR', 197, e.Hc), [[21, 987], [53, 987]]);
  assert.deepEqual(L.call('mirror-hanger-cuts', e.Wc, e.Hc), [[0, 982, 30, 1040], [1260, 982, 1290, 1040]]);
  say('THE HANGERS. In BUL at x 176 and 144, in BUR at 21 and 53, y 987; the BACK\'s cut-outs 0..30 and 1260..1290 by 982..1040.');
  assert.deepEqual([L.call('mirror-led-under-length', e.Wc, G), L.call('mirror-led-inside-length', e.bf, e.bc), L.call('mirror-led-inside-z', D)],
    [1254, 922, 205]);
  say('THE LIGHT. The strip under 1254 long, the strip inside 922 at z 205.');
  assert.deepEqual([L.call('mirror-proud', D, 155), L.call('mirror-face-proud', D, 22, 155)], [60, 82]);
  say('THE RECESS. 155: the carcass 60 proud of the recess line, the mirror\'s face 82.');
});
