// ─── T77 · F5 · KASACJA: THE COPYRIGHT HEADERS ─────────────────────────────
//
// CLAUDE.md T77 F5: *"Eight new files open with `// Copyright Skylon
// Development Ltd. All rights reserved.` No file in this repo carries a copyright
// header, and that company name is not one of the owner's. Delete the line from
// every file the patch adds ... The owner decides any notice for the whole repo
// separately; nothing is invented in its place."*  Four of the
// files are engine files; in each the first line, a comment, is deleted and
// nothing else changes, so no gate is named. Merged by
// `scripts/t77-classify.mjs` (T76's shape).

export const COMMIT = 'f4e34b1cc075675c7d6772dc1a3202eb812d48cc';

const KASACJA = 'F5 · the copyright line deleted (the first line, a comment); nothing takes its place and no code changes';

export const LICENSED = {
  'src/engine/ornateFront.js': { why: KASACJA, gates: [] },
  'src/engine/ornateFrontProfile.js': { why: KASACJA, gates: [] },
  'src/engine/ornateFrontArt.js': { why: KASACJA, gates: [] },
  'src/engine/cnc/ornateExport.js': { why: KASACJA, gates: [] },
};
