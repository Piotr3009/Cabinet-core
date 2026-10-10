// ─── T76 · F7 · WHAT THE WALK FOUND, FIXED ──────────────────────────────────
//
// CLAUDE.md T76 F7: *"The walk, real mouse, PRO and retail."*  It found the
// owner's arch could not be cut on retail's 18 to 20 mm doors and nothing said
// so, and the T75 State column pushed past the BOM panel by a long label.
// Merged by `scripts/t76-classify.mjs`.

export const LICENSED = {
  'src/engine/frontDecoration.js': {
    why: 'F7 · `boardRefusal(style, board)`: the skin rule asked of a board before any leaf is cut (one comparison, '
      + '`skinShort`, shared with the validator), so retail greys a style its doors cannot take and says why. Reads a '
      + 'recipe; cuts nothing differently',
    gates: ['frontDecoration'],
  },
  'src/engine/frontDecorationBom.js': {
    why: 'F7 · the construction label made short ("G · Routed slab, depths 3 mm", "Applied strip, 45/45 mitres") so '
      + 'the State column stays in the panel. A list, not a cut',
    gates: [],
  },
};
