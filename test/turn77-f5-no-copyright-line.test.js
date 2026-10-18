/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T77 F5, REVERSED 15.10.2026 · THE COPYRIGHT HEADER IS THE OWNER'S RULE ──
//
// T77 F5 deleted the copyright lines GPT's patch carried, on the premise that
// *"that company name is not one of the owner's"*. The premise was wrong: the
// owner's rule of 22.09.2026 (Petros, "ZASADA: nagłówek copyright w każdym
// pliku kodu + LICENSE w repo", and the template "WZÓR: nagłówek copyright do
// plików kodu + treść LICENSE") names Skylon Development Ltd as the owner of
// every repo's code, and the owner reaffirmed it on 15.10.2026 (*"zasada:
// wpisujesz prawa"*). So this file now holds the opposite of what it held:
//
//   1. the repo carries LICENSE at its root, the template's text verbatim;
//   2. every NEW code file (the rule says "każdy nowy plik kodu") opens with
//      the template's JS header verbatim; the list below names the files
//      made since the rule and grows with every new file;
//   3. the files that were there before the rule are not rewritten here: the
//      frozen PRO surface (test/turn59-f1-the-switch.test.js) pins them byte
//      for byte, and a sweep of four hundred files is the owner's call, named
//      in the PR; T77's ornate files are among them.
//
// What stays of T77 F5: the owner's own names (Skylon Joinery, the Skylon
// puzzle, SKYLON_COMMON.lsp) are untouched, and nothing but the template's own
// words stands in a header.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const at = (rel) => new URL(rel, ROOT);
const read = (rel) => readFileSync(at(rel), 'utf8');

const OWNER = 'Skylon Development Ltd';

/** The template's JS / TS / CSS header, verbatim (Petros, 22.09.2026). */
export const JS_HEADER = [
  '/*',
  ` * Copyright (c) 2026 ${OWNER}. All rights reserved.`,
  ' *',
  ' * This file is proprietary and confidential. Unauthorised copying,',
  ' * modification, distribution or use of this file, in whole or in part,',
  ' * by any means including automated tools and AI systems, is strictly',
  ` * prohibited without prior written permission from ${OWNER}.`,
  ' */',
].join('\n');

/** The template's LICENSE, verbatim. */
const LICENSE = [
  `Copyright (c) 2026 ${OWNER}. All rights reserved.`,
  '',
  'This software and its source code are the proprietary and confidential',
  `property of ${OWNER}, registered in England and Wales.`,
  '',
  'No part of this software may be reproduced, copied, modified, adapted,',
  'distributed, published, transmitted, reverse engineered, or used to train',
  'or prompt any machine learning or artificial intelligence system, in any',
  'form or by any means, without the prior written permission of',
  `${OWNER}.`,
  '',
  'Unauthorised use may result in civil and criminal liability.',
  '',
  'For licensing enquiries: piotr.t@skylonconstruction.com',
].join('\n');

/** Every code file made since the rule: each opens with the header. The list grows with every new file. */
export const NEW_FILES = [
  // Chat-fix 12.10.2026 (the stutter)
  'src/stores/resultCache.js',
  'src/3d/frameDemand.jsx',
  'src/3d/hardwareLod.js',
  'src/3d/perfMeter.js',
  // Chat-fix 14.10.2026 (the island plan)
  'src/engine/islandPlan.js',
  'src/3d/IslandPlan.jsx',
  'test/island-plan-1410.test.js',
  'scripts/t78-classify.d/f23-owner-1210.mjs',
  'scripts/t78-classify.d/f24-owner-1410.mjs',
  // The night and the day of 15.10.2026
  'src/engine/screwedBack.js',
  'test/notch-obstacle-1510.test.js',
  'test/recess-1510.test.js',
  'scripts/t78-classify.d/f25-owner-1510.mjs',
  'test/pluses-on-hover-1510.test.js',
  'test/l-corner-and-hinges-1510.test.js',
  'scripts/t78-classify.d/f26-owner-1510b.mjs',
  'scripts/chatfix-1510-dzien-walk.mjs',
  'test/turn77-f5-no-copyright-line.test.js',
  // The evening of 15.10.2026 (the island plan's hand, the STEP over the RETURN, the recess extension)
  'scripts/t78-classify.d/f27-owner-1510c.mjs',
  'src/engine/extension.js',
  'test/recess-extension-1510.test.js',
  'scripts/t78-classify.d/f28-owner-1510d.mjs',
  'scripts/chatfix-1510-wieczor-walk.mjs',
  // T79 F1 (18.10.2026): messages on the left, with a history
  'test/turn79-f01-messages-left.test.js',
  'scripts/t78-classify.d/f34-t79-f01.mjs',
  // T79 F2 (18.10.2026): a full-width shelf above the divider
  'test/turn79-f02-above-divider.test.js',
  // T79 F12 (18.10.2026): Center between
  'test/turn79-f12-centre-between.test.js',
  // T79 F3 (18.10.2026): drawer columns
  'test/turn79-f03-drawer-columns.test.js',
  'scripts/t78-classify.d/f34-t79-f03.mjs',
  // T79 F4 (18.10.2026): the notch from the top
  'test/turn79-f04-notch-top.test.js',
  'scripts/t78-classify.d/f34-t79-f04.mjs',
  // T79 F5 (18.10.2026): the edge notch
  'test/turn79-f05-edge-notch.test.js',
  'scripts/t78-classify.d/f34-t79-f05.mjs',
  'src/3d/NotchEdges.jsx',
  'src/retail/design/detail/EdgeNotchAsk.jsx',
  // T79 F6 (18.10.2026): the dia 3 rows on the back round a notch and a recess
  'test/turn79-f06-back-rows.test.js',
  'scripts/t78-classify.d/f34-t79-f06.mjs',
  // T79 F8 (18.10.2026): a notch and a recess on the same carcass
  'test/turn79-f08-notch-and-recess.test.js',
  'scripts/t78-classify.d/f34-t79-f08.mjs',
  // T79 F9 (18.10.2026): the end panel follows its side into the recess and the notch
  'test/turn79-f09-end-panel.test.js',
  'scripts/t78-classify.d/f34-t79-f09.mjs',
  // T79 F10 (18.10.2026): the recess gives way to the stand-off
  'test/turn79-f10-recess-standoff.test.js',
];

test('F5 reversed · LICENSE stands at the repo root, the template\'s text verbatim', () => {
  assert.ok(existsSync(at('LICENSE')), 'LICENSE is missing');
  assert.equal(read('LICENSE').trim(), LICENSE);
});

test('F5 reversed · every new code file opens with the owner\'s header, verbatim', () => {
  const missing = NEW_FILES.filter((rel) => !existsSync(at(rel)));
  assert.deepEqual(missing, [], `a file the list names is gone: ${missing.join(', ')}`);
  const bare = NEW_FILES.filter((rel) => !read(rel).startsWith(`${JS_HEADER}\n`));
  assert.deepEqual(bare, [], `these new files do not open with the header:\n  ${bare.join('\n  ')}`);
});

test('F5 reversed · the header names the owner and nothing else; the owner\'s other names stand', () => {
  assert.match(JS_HEADER, /Copyright \(c\) 2026 Skylon Development Ltd\. All rights reserved\./);
  assert.doesNotMatch(JS_HEADER, /Skylon Joinery|Skylon Construction/);
  assert.match(read('src/engine/profile.js'), /label:\s*'Skylon Joinery'/, 'the workshop profile lost the owner\'s name');
  assert.ok(existsSync(at('reference/lisp/SKYLON_COMMON.lsp')), 'the owner\'s LISP is gone');
  assert.match(read('src/components/RightPanel.jsx'), /Skylon puzzle/, 'the Skylon puzzle lost its name');
});
