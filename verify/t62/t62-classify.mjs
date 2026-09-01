#!/usr/bin/env node
// ─── WHERE THE CLASSIFIER ACTUALLY LIVES ───────────────────────────────────
//
// CLAUDE.md names this path: *"`verify/t62/t62-classify.mjs` (copy t61's)"*.
// T61's own answer to the same instruction is the one being copied: every
// classifier since T34 lives in `scripts/`, and `verify/tNN/` has only ever
// held ARTEFACTS — the frames, the walk, the golden dumps. So the classifier is
// `scripts/t62-classify.mjs`, and this is the path the spec named, forwarding
// its own arguments so `node verify/t62/t62-classify.mjs --probe` does exactly
// what the spec asks for and there is still only ONE classifier.
//
// Beside it: `classify.txt` (the nine probes as they ran) and the two golden
// dumps the byte-identity comparison was made from — the base one taken from a
// real `origin/main` worktree, not from this tree with the changes hidden.

import { spawnSync } from 'node:child_process';

const script = new URL('../../scripts/t62-classify.mjs', import.meta.url).pathname;
const out = spawnSync(process.execPath, [script, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(out.status ?? 1);
