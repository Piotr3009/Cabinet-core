#!/usr/bin/env node
// ─── WHERE THE CLASSIFIER ACTUALLY LIVES ───────────────────────────────────
//
// CLAUDE.md names this path: *"`verify/t61/t61-classify.mjs` (copy t60's
// pattern)"*. T60's pattern puts the classifier in `scripts/` — every one of
// them since T34 is there, and `verify/tNN/` has only ever held ARTEFACTS: the
// frames, `walk.json`, the parity map. There is no `verify/t60/t60-classify.mjs`
// to copy; there is `scripts/t60-classify.mjs`.
//
// So the classifier is `scripts/t61-classify.mjs`, where the pattern-first law
// says it goes, and this is the path the spec named — runnable, forwarding its
// own arguments, so `node verify/t61/t61-classify.mjs --probe` does exactly
// what the spec asks for and there is still only ONE classifier.
//
// Beside it: `classify.txt` (the seven probes as they ran) and the two golden
// dumps the byte-identity comparison was made from.

import { spawnSync } from 'node:child_process';

const script = new URL('../../scripts/t61-classify.mjs', import.meta.url).pathname;
const out = spawnSync(process.execPath, [script, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(out.status ?? 1);
