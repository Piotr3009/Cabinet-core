// ─── T76 · F5 · ONE STATE: READINESS ABSORBS MANUFACTURING ────────────────
//
// CLAUDE.md T76, LAWS: *"One state, one column. T75's `readiness`
// (`engine/readiness.js`) is the single production state of a line. GPT's
// `manufacturing` keeps only what readiness cannot carry (F5)."*  Every delta
// below reads parts and writes lists, files or sentences; none is on the cut.
// Merged by `scripts/t76-classify.mjs`.

export const LICENSED = {
  'src/engine/readiness.js': {
    why: 'F5 · `readinessOf` answers a decorated front and an applied strip by name (cut, whatever the recipe\'s '
      + 'state: a blocked recipe is Check #9\'s); `appliedStripNotes` says which fronts carry the manual gluing NOTE; '
      + '`notCutParts` lists it for Check #30. Pure, reads only',
    gates: [],
  },
  'src/engine/frontDecorationBom.js': {
    why: 'F5 · `manufacturing` keeps `identity` and `construction`; its `status` and `summary` deleted. A list, not a cut',
    gates: [],
  },
  'src/engine/bom.js': {
    why: 'F5 · the gluing NOTE row (`manual`) in the dowel and worktop-joint grammar: counted in nothing, merged with '
      + 'nothing. A list, not a cut',
    gates: [],
  },
  'src/engine/cnc/frontOperations.js': {
    why: 'F5 · front-operations.json carries readiness: the part\'s, each operation\'s, each strip\'s, the gluing\'s',
    gates: [],
  },
  'src/lib/cncExport.js': {
    why: 'F5 · the banner counts the gluing as a line of its own; GPT\'s packaged ZIP carries READINESS.txt as the '
      + 'unit ZIP does. A file writer, not a cut',
    gates: [],
  },
  'src/lib/exporters.js': {
    why: 'F5 · the BOM PDF prints the construction label, not a second status. A file writer, not a cut',
    gates: [],
  },
};
