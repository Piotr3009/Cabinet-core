#!/usr/bin/env node
// ─── WHERE THE CLASSIFIER ACTUALLY LIVES ───────────────────────────────────
//
// CLAUDE.md names this path: *"`verify/t66/t66-classify.mjs` proves it"* and
// *"naming every delta and proving none reaches a fixture"*. Every classifier
// since T34 lives in `scripts/`, and `verify/tNN/` has only ever held
// ARTEFACTS — the frames, the walk, the golden dumps. So the classifier is
// `scripts/t66-classify.mjs`, and this is the path the spec named, forwarding
// its own arguments so `node verify/t66/t66-classify.mjs` does exactly what the
// spec asks for and there is still only ONE classifier.
//
// Beside it: `goldens-base.json` (the six as they stood on `origin/main`),
// `walk.txt` (the acceptance walk as it ran), `f11-measure.txt` (the label
// measurement F11 asks to be committed) and every frame the walk took.

import { spawnSync } from 'node:child_process';

const script = new URL('../../scripts/t66-classify.mjs', import.meta.url).pathname;
const out = spawnSync(process.execPath, [script, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(out.status ?? 1);
