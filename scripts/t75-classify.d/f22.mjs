// T75 F22 · PRODUCTION READINESS, ON EVERY LINE. *"it reads the meta the
// parts ALREADY carry ... and a side map keyed by part id; it writes nothing
// into the panel records, so every golden dump is byte-identical by
// construction."*  No cut moves: every file below READS a part's state.

export const LICENSED = {
  'src/engine/readiness.js': {
    why: 'F22 · NEW: `readinessOf` (cut, geometry, manual, bought), `notCutParts`, `readinessBanner`, '
      + '`readinessCheckMessage`, the side map (the T30 lattice). Pure; reads the part, never writes it',
    gates: [],
  },
  'src/engine/bom.js': {
    why: 'F22 · every cut row carries `readiness` read off its part (and it joins the merge identity, so an '
      + 'outline never merges into a cut part); every hardware line is `bought`. A list, not a cut',
    gates: [],
  },
  'src/engine/checks.js': {
    why: 'F22 · Check #30, yellow: the parts the machine does not finish, by unit, and the worktop\'s joint '
      + 'and cut-outs under WT. Reads; cuts nothing',
    gates: [],
  },
  'src/lib/cncExport.js': {
    why: 'F22 · every export returns the banner counting the parts that are not cut; a unit\'s ZIP carries '
      + 'a READINESS.txt naming them. The DXFs are byte for byte what they were',
    gates: [],
  },
  'src/engine/drawings/setPaper.js': {
    why: 'F22 · *"The T71 drawing set prints the state in the parts card"*: each row of the set\'s cut list '
      + 'carries its state (CNC, OUTLINE, ON SITE, BOUGHT). Licensed because the drawing must show what the '
      + 'engine now reports',
    gates: [],
    drawing: true,
  },
};
