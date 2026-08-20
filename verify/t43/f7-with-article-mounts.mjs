#!/usr/bin/env node
// ─── T43 · F7 — GIVE THE SHOP THE ARTICLE AND EVERYTHING CLEARS ─────────────
//
//     node verify/t43/f7-with-article-mounts.mjs > verify/t43/f7-with-article-mounts.txt
//
// CLAUDE.md F7's second named test, printed: *"inject ONE test-local catalogue
// row for 500/T (`setRunnerCatalogue`, test scope only — the snapshot file is
// not edited) → the same drawer mounts a model and the red check clears."*
//
// THE SNAPSHOT IS NOT EDITED BY THIS FILE and it never will be: refreshing
// `reference/hardware/movento.json` is the OWNER's curl (`runner-bucket-patch
// .md`). What is injected here is one row in THIS PROCESS's registry, which is
// exactly what `lib/runnerCatalogue.js` will do the moment his upload lands.
//
// The three states are printed side by side so the difference between them is
// readable rather than inferred:
//
//   the shop as it is today   →  no model, RED per drawer
//   one row injected          →  a model per row, no red at all
//   no catalogue at all       →  no model, ONE amber, no red

import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { hardwareInstances } from '../../src/engine/hardware3d.js';
import {
  clearRunnerCatalogue, ladderRungFor, runnerAskFor, runnerEntry, runnerLadder,
  runnerModelSrc, setRunnerCatalogue,
} from '../../src/engine/runners.js';
import { runChecks } from '../../src/engine/checks.js';

const read = (rel) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');
const SHOWROOM = JSON.parse(read('test/fixtures/hardware-local/hardware/runners/blum/movento/manifest.json'));
const SNAPSHOT = JSON.parse(read('reference/hardware/movento.json'));
const M = P.hardware.runner.movento;

const say = (s = '') => process.stdout.write(`${s}\n`);

/** The expression `3d/Hardware.jsx` uses, term for term. */
const asTheViewAsks = (row, variant = M.defaultVariant) => {
  const entry = runnerEntry({
    system: M.system,
    nl: runnerAskFor(row.length, P) ?? row.length,
    variant,
    side: row.side,
    ladder: runnerLadder(P),
  });
  const url = entry ? runnerModelSrc(entry, P, 'https://showroom/') : null;
  return { entry, url, model: Boolean(url), reason: url ? null : 'no-url' };
};

const unit = {
  id: 'u-budr',
  type: 'BUDR',
  params: { ...defaultParamsFor('BUDR', P), unit_num: 'DR01', width: 600, plinth: true },
  position: { wall: 0, x_mm: 0, rotation_deg: 0 },
};
const result = computeCabinet({ ...unit.params }, P);
const rows = hardwareInstances(result, P).runners;

function state(label) {
  const mounted = rows.map((r) => asTheViewAsks(r));
  const found = runChecks({ entries: [{ unit, result }], profile: P })
    .filter((f) => f.check === 18);
  say(`── ${label} ${'─'.repeat(Math.max(0, 66 - label.length))}`);
  say(`   runner rows           ${rows.length}`);
  say(`   models mounted        ${mounted.filter((m) => m.model).length}`);
  say(`   reasons               ${JSON.stringify([...new Set(mounted.map((m) => m.reason))])}`);
  say(`   article drawn         ${JSON.stringify([...new Set(mounted.map((m) => m.entry?.article ?? null))])}`);
  say(`   url                   ${JSON.stringify([...new Set(mounted.map((m) => m.url))])}`);
  say(`   check #18 red         ${found.filter((f) => f.level === 'red').length}`);
  say(`   check #18 amber       ${found.filter((f) => f.level === 'yellow').length}`);
  for (const f of found) say(`      ${f.level.toUpperCase().padEnd(6)} ${f.message}`);
  say('');
}

say('─── T43 · F7 — the test-local injection, printed ──────────────────────');
say('');
say(`profile ladder          ${JSON.stringify(runnerLadder(P))}`);
say(`snapshot rungs          ${JSON.stringify([...new Set(SNAPSHOT.items.map((r) => r.nl))].sort((a, b) => a - b))}`);
say(`showroom rungs          ${JSON.stringify([...new Set(SHOWROOM.files.map((r) => r.nl))].sort((a, b) => a - b))}`);
say(`showroom ⊆ snapshot     ${[...new Set(SHOWROOM.files.map((r) => r.nl))]
  .every((n) => SNAPSHOT.items.some((r) => r.nl === n))}`);
say('');
say(`the cabinet             BUDR 600 · box depth ${rows[0].length} mm · ${rows.length / 2} drawers`);
say(`runnerAskFor            NL${runnerAskFor(rows[0].length, P)}  (the box + 10, the ONE place it lives)`);
say(`ladder rung             ${ladderRungFor(runnerAskFor(rows[0].length, P), P)}`);
say('');

setRunnerCatalogue(SHOWROOM);
state('THE SHOP AS IT IS TODAY (the snapshot, NL 250–450)');

setRunnerCatalogue({
  ...SHOWROOM,
  files: [
    ...SHOWROOM.files,
    // ONE row. In this process only. The snapshot file on disk is untouched.
    {
      file: 'hardware/runners/blum/movento/760H5000T_99999999.glb', nl: 500, variant: 'T', article: '99999999',
    },
  ],
});
state('ONE ROW INJECTED — 500/T, article 99999999 (test scope only)');

clearRunnerCatalogue();
state('NO CATALOGUE AT ALL (offline, mock, a dead network)');

say('─── WHAT THIS SAYS ────────────────────────────────────────────────────');
say('The red check is not a bug report about this app. It is a report about the');
say('owner\'s own BUCKET: every drawer this program makes runs a 490 mm box, which');
say('orders NL500, and the shop tops out at 450. One uploaded article clears it,');
say('and nothing in the code has to change for that to happen — which is exactly');
say('what the middle block above measures.');
