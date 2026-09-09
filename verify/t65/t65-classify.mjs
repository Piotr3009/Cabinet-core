#!/usr/bin/env node
// ─── WHERE THE CLASSIFIER ACTUALLY LIVES ───────────────────────────────────
//
// CLAUDE.md names this path: *"`verify/t65/t65-classify.mjs` names every engine
// delta and proves none reaches the cut path of a fixture."* Every classifier
// since T34 lives in `scripts/`, and `verify/tNN/` has only ever held
// ARTEFACTS — the frames, the walk, the golden dumps. So the classifier is
// `scripts/t65-classify.mjs`, and this is the path the spec named, forwarding
// its own arguments so `node verify/t65/t65-classify.mjs` does exactly what the
// spec asks for and there is still only ONE classifier.
//
// Beside it: `goldens-base.json` (the six as they stood on `origin/main`),
// `walk.txt` (the acceptance walk as it ran) and every frame it took.

import { spawnSync } from 'node:child_process';

const script = new URL('../../scripts/t65-classify.mjs', import.meta.url).pathname;
const out = spawnSync(process.execPath, [script, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(out.status ?? 1);
