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
  // T79 F11 (18.10.2026): the rail is alone, and it snaps under a shelf
  'test/turn79-f11-rail.test.js',
  'test/rail-assembly-saved.js',
  'scripts/t78-classify.d/f34-t79-f11.mjs',
  // T79 F13 (18.10.2026): setbacks 10, drawers untouched
  'test/turn79-f13-setbacks.test.js',
  'scripts/t78-classify.d/f34-t79-f13.mjs',
  // T79 F14 (18.10.2026): the drawer box on Cabineo 12
  'test/turn79-f14-box-cabineo.test.js',
  'scripts/t78-classify.d/f34-t79-f14.mjs',
  // T79 F16 (18.10.2026): Restore sleeve rows
  'test/turn79-f16-restore-sleeves.test.js',
  // T79 F15 (18.10.2026): label colours on the entity
  'test/turn79-f15-label-colour.test.js',
  'scripts/t78-classify.d/f34-t79-f15.mjs',
  // T79 F18 (18.10.2026): 21 or 44 per sheet
  'test/turn79-f18-label-sheets.test.js',
  'scripts/t78-classify.d/f34-t79-f18.mjs',
  // T79 WALK (18.10.2026): the acceptance walk
  'scripts/t79-walk.mjs',
  // Chat fix 19.10.2026 (three packages: Delete, CUT EDGE, messages; the first back; the second rod)
  'scripts/t78-classify.d/f35-owner-1910.mjs',
  'scripts/t78-classify.d/f36-owner-1910b.mjs',
  'scripts/t78-classify.d/f37-owner-1910c.mjs',
  'scripts/chatfix-1910-walk.mjs',
  'test/chatfix-1910-delete-edges-messages.test.js',
  'test/chatfix-1910-hanger-two.test.js',
  // Chat fix 19.10.2026, the afternoon (the off-board guard, the site trim, the edge notch's boards)
  'src/engine/siteTrim.js',
  'src/engine/cnc/offBoardGuard.js',
  'src/engine/cnc/labelAnchor.js',
  'scripts/chatfix-1910-offboard-probe.mjs',
  'scripts/t78-classify.d/f38-owner-1910d.mjs',
  'test/site-trim.js',
  'test/chatfix-1910-site-trim.test.js',
  'test/chatfix-1910-offboard.test.js',
  'test/chatfix-1910-edge-box.test.js',
  // Chat fix 21.10.2026 (the gloss ride, wariant A; the in-frame mockup)
  'scripts/t78-classify.d/f39-owner-2110.mjs',
  'scripts/chatfix-2110-walk.mjs',
  'scripts/chatfix-2110-mockup-inframe.mjs',
  'scripts/chatfix-2110-mockup-inframe-final.mjs',
  'test/chatfix-2110-gloss.test.js',
  // T80 F1 (22.10.2026): the in-frame LISP, run by the suite
  'test/lisp-mini.js',
  'test/turn80-f01-lisp.test.js',
  // T80 F2 (22.10.2026): in-frame per project
  'scripts/t78-classify.d/f40-t80-f02.mjs',
  'test/turn80-f02-switch.test.js',
  // T80 F3 (22.10.2026): the run gets its frame
  'src/engine/inframe.js',
  'scripts/t78-classify.d/f40-t80-f03.mjs',
  'test/turn80-f03-frame.test.js',
  // T80 F4 (22.10.2026): the frame on the CNC
  'scripts/t78-classify.d/f40-t80-f04.mjs',
  'test/turn80-f04-cnc.test.js',
  // T80 F5 (22.10.2026): the fronts set in the opening
  'scripts/t78-classify.d/f40-t80-f05.mjs',
  'test/turn80-f05-fronts.test.js',
  // T80 F6 (22.10.2026): the inset hinge
  'scripts/t78-classify.d/f40-t80-f06.mjs',
  'test/turn80-f06-hinge.test.js',
  // T80 F7 (22.10.2026): the end panel reaches the frame
  'scripts/t78-classify.d/f40-t80-f07.mjs',
  'test/turn80-f07-end-panel.test.js',
  // T80 F8 (22.10.2026): the worktop on the frame, the filler a note and timber
  'scripts/t78-classify.d/f40-t80-f08.mjs',
  'test/turn80-f08-filler.test.js',
  // T80 F9 (22.10.2026): the frame in 3D
  'scripts/t78-classify.d/f40-t80-f09.mjs',
  'test/turn80-f09-3d.test.js',
  // T80 F10 (22.10.2026): the in-frame checks, #40 to #44
  'src/engine/inframeChecks.js',
  'src/components/InframeWarnings.jsx',
  'scripts/t78-classify.d/f40-t80-f10.mjs',
  'test/turn80-f10-checks.test.js',
  // T80 F11 (22.10.2026): the two in-frame goldens
  'scripts/t78-classify.d/f40-t80-f11.mjs',
  'test/turn80-f11-goldens.test.js',
  // T80 F12 (22.10.2026): the walk
  'scripts/t80-walk.mjs',
  // T81 F1 (22.10.2026): the projector, its probe and its stage
  'src/engine/drawings/projector.js',
  'src/engine/drawings/silhouettes.js',
  'scripts/t81-kitchen.mjs',
  'scripts/t81-f01-probe.mjs',
  'scripts/t78-classify.d/f41-t81-f01.mjs',
  'test/turn81-f01-projector.test.js',
  // T81 F2 (22.10.2026): the sheet list in the owner's order
  'scripts/t78-classify.d/f41-t81-f02.mjs',
  'test/turn81-f02-order.test.js',
  // T81 F3 (22.10.2026): the fronts sheet
  'scripts/t78-classify.d/f41-t81-f03.mjs',
  'test/turn81-f03-fronts.test.js',
  // T81 F4 (22.10.2026): the sheet without fronts
  'scripts/t78-classify.d/f41-t81-f04.mjs',
  'test/turn81-f04-no-fronts.test.js',
  // T81 F5 (22.10.2026): the X-ray sheet
  'scripts/t78-classify.d/f41-t81-f05.mjs',
  'test/turn81-f05-xray.test.js',
  // T81 F6 (22.10.2026): the plans and the sections
  'scripts/t78-classify.d/f41-t81-f06.mjs',
  'test/turn81-f06-plan-section.test.js',
  // T81 F7 (22.10.2026): the silhouettes from the models
  'scripts/t81-silhouettes.mjs',
  'scripts/t78-classify.d/f41-t81-f07.mjs',
  'test/turn81-f07-silhouettes.test.js',
  // T81 F8 (22.10.2026): one ink, one layer
  'scripts/t78-classify.d/f41-t81-f08.mjs',
  'test/turn81-f08-layers.test.js',
  // T81 F9 (22.10.2026): the card draws its own unit
  'scripts/t78-classify.d/f41-t81-f09.mjs',
  'test/turn81-f09-card.test.js',
  // T81 F10 (22.10.2026): the walk
  'scripts/t81-walk.mjs',
  'scripts/t78-classify.d/f41-t81-f10.mjs',
  // T82 F1 (25.10.2026): the LISP of the HAWA pocket, first
  'test/turn82-f01-hawa-lisp.test.js',
  'scripts/t78-classify.d/f43-t82-f01.mjs',
  // T82 F2 (25.10.2026): the HAWA pocket is a unit in the run
  'src/engine/hawaPocket.js',
  'test/turn82-f02-hawa-run.test.js',
  'test/turn82-f03-hawa-door.test.js',
  'scripts/t78-classify.d/f43-t82-f02.mjs',
  // T82 F3 (25.10.2026): the door, its width, its depth, the refusals in words
  'scripts/t78-classify.d/f43-t82-f03.mjs',
  // T82 F4 (25.10.2026): the pocket in the BOM, its sets, its connector, its tracks, its parts
  'src/engine/cnc/hawa.js',
  'test/turn82-f04-hawa-bom-cnc.test.js',
  'scripts/t78-classify.d/f43-t82-f04.mjs',
  // T82 F5 (25.10.2026): the pocket on the CNC, the panels' pilots and the door's cups
  'scripts/t78-classify.d/f43-t82-f05.mjs',
  // T82 F6 (25.10.2026): the HAWA door closed and open in the room
  'src/engine/pocketDoorPose.js',
  'src/3d/PocketDoor.jsx',
  'scripts/t78-classify.d/f43-t82-f06.mjs',
  // T82 F7 (25.10.2026): the HAWA pocket on the sheets
  'test/turn82-f06-hawa-room.test.js',
  'scripts/t78-classify.d/f43-t82-f07.mjs',
  // T82 F8 (25.10.2026): the LISP of the vanity, first
  'test/turn82-f08-vanity-lisp.test.js',
  'scripts/t78-classify.d/f43-t82-f08.mjs',
  // T82 F9 (25.10.2026): the vanity kits and the chest, two columns and equal drawers
  'src/engine/vanity.js',
  'test/turn82-f09-chest-columns.test.js',
  'test/turn82-f09-vanity-kit.test.js',
  'test/turn82-f09-trap-room.test.js',
  'scripts/t78-classify.d/f43-t82-f09.mjs',
  // T82 F10 (25.10.2026): the vanity's top is the house worktop, to the wall over the void
  'test/turn82-f10-vanity-top-basin.test.js',
  'scripts/t78-classify.d/f43-t82-f10.mjs',
  // T82 F11 (25.10.2026): the basin, only to the eye, on the LISP's wastes
  'src/3d/Basin.jsx',
  'scripts/t78-classify.d/f43-t82-f11.mjs',
  // T82 F12 (25.10.2026): the service void, a note in the Check and a hatch on the sheets
  'scripts/t78-classify.d/f43-t82-f12.mjs',
  // T82 F13 (25.10.2026): the vanity on its plinth or floating, and its hangers in the BOM
  'test/turn82-f13-vanity-panel.test.js',
  'scripts/t78-classify.d/f43-t82-f13.mjs',
  // T82 F15 (25.10.2026): the cloud, Fluted as convex reeds touching
  'test/turn82-f15-reed.test.js',
  'scripts/t78-classify.d/f43-t82-f15.mjs',
  // T82 F16 (25.10.2026): grab and move, the free panel on three axes; the probes' shared reader and F16's probe
  'scripts/t82-probe-lib.mjs',
  'scripts/t82-probe-f16.mjs',
  'src/3d/panelDrag.js',
  'test/turn82-f16-panel-drag.test.js',
  // T82 F17 (25.10.2026): the panel in front of a chimney can grow; F17's probe
  'scripts/t82-probe-f17.mjs',
  'scripts/t78-classify.d/f43-t82-f17.mjs',
  // T82 F18 (25.10.2026): the thickness shows, the panel's own board; F18's probe
  'scripts/t82-probe-f18.mjs',
  'scripts/t78-classify.d/f43-t82-f18.mjs',
  // T82 F19 (25.10.2026): the front of a unit, a panel in front is in nobody's way
  'scripts/t78-classify.d/f43-t82-f19.mjs',
  // T82 F20 (25.10.2026): the logo and the company on the sheet
  'test/turn82-f20-logo.test.js',
  'scripts/t78-classify.d/f43-t82-f20.mjs',
  // T82 F21 (25.10.2026): the fronts' own dimensions; F21's probe
  'scripts/t82-probe-f21.mjs',
  'test/turn82-f21-chains.test.js',
  'scripts/t78-classify.d/f43-t82-f21.mjs',
  // T82 F22 (25.10.2026): handles on the sheets; F22's probe
  'scripts/t82-probe-f22.mjs',
  'test/turn82-f22-f24-sheets.test.js',
  'scripts/t78-classify.d/f43-t82-f22.mjs',
  // T82 F23 (25.10.2026): the hinges and the runners from the models; F23's probe
  'scripts/t82-probe-f23.mjs',
  'scripts/t78-classify.d/f43-t82-f23.mjs',
  // T82 F24 (25.10.2026): one dashed line for the plinth
  'scripts/t78-classify.d/f43-t82-f24.mjs',
  // T82 F6 (after the review) (25.10.2026): the door's holes ride the door
  'src/3d/drillRingPanels.js',
  'test/turn82-f06-door-rings.test.js',
  // T82 F7 (after the review) (25.10.2026): the HAWA door's finish and handle on the sheets
  'test/turn82-f07-hawa-door-sheets.test.js',
  // T82 F11 (25.10.2026): the basin is seen through the vanity's top (after the review)
  'test/turn82-f11-basin-top-room.test.js',
  // T82 F15 (25.10.2026): the reeds run out of a J-pull door's edges too (after the review)
  'test/turn82-f15-reed-jpull-room.test.js',
  // T82 F16 (25.10.2026): off the wall, where asked, every time (after the review)
  'test/turn82-f16-panel-recess.test.js',
  // T82 F21 (25.10.2026): a vertical figure prints where the drawing puts it (after the review)
  'test/turn82-f21-rotated-figures.test.js',
  // T82 F25 (25.10.2026): the walk, real mouse on the built app
  'scripts/t82-walk.mjs',
  // T83 probes (25.10.2026): the tables of F7, F9 and F10 before the cuts (P1)
  'scripts/t83-probe-lib.mjs',
  'scripts/t83-probe-f07.mjs',
  'scripts/t83-probe-f09.mjs',
  'scripts/t83-probe-f10.mjs',
  // T83 F1 (25.10.2026): KIT_MIRROR.lsp and profile.mirror (M1)
  'test/turn83-f01-mirror-lisp.test.js',
  'scripts/t78-classify.d/f44-t83-f01.mjs',
  // T83 F2 (25.10.2026): the kit MIRROR_CABINET (M1)
  'src/engine/mirrorCabinet.js',
  'test/turn83-f02-mirror-kit.test.js',
  'scripts/t78-classify.d/f44-t83-f02.mjs',
  // T83 F3 (25.10.2026): the mirror cabinet in the room (M2)
  'src/3d/MirrorCabinet.jsx',
  'src/3d/mirrorCabinetRoom.js',
  'test/turn83-f03-mirror-room.test.js',
  'scripts/t78-classify.d/f44-t83-f03.mjs',
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
