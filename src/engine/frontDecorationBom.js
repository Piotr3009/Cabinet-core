// Manufacturing identity is distinct from the size of a rectangular blank.
//
// T76 F5 · ONE STATE, ONE COLUMN: *"`manufacturing` on the BOM row keeps ONLY
// `identity` (for the merge key) and `construction` (the label: routed slab,
// applied strips); its `status` is deleted"*. The line's production state is
// T75's `readiness` (engine/readiness.js), on the same row; a blocked recipe
// is Check #9's. `identity` still tells a blocked recipe from a ready one, so
// a slab cut plain never merges with a slab cut patterned.
export function frontManufacturing(panel) {
  const decoration = panel.meta?.frontDecoration;
  if (decoration) {
    const applied = decoration.style === 'AM';
    const depths = [...new Set(decoration.operations.map((op) => op.depth))];
    // T76 F7 · short, so the T75 State column stays inside the panel (the walk
    // measured it pushed past the edge by the longer label).
    // T77 F6 · the Ornate sentence names its ornament: the procedural
    // placeholder until the owner's model arrives (CLAUDE.md T77 F6), none
    // on the Plain variant. Its separator is the column's own.
    const construction = decoration.referenceOnly
      ? `${decoration.style} · Slab; relief proposed, not production approved`
        + `${decoration.ornament ? `; ornament: ${decoration.ornament}` : ''}`
      : applied
      ? `${decoration.style} · Slab, ${decoration.additions.length} applied strips`
      : `${decoration.style} · Routed slab${depths.length ? `, depths ${depths.join('/')} mm` : ''}`;
    return {
      construction,
      identity: JSON.stringify({
        parameters: decoration.parameters, outline: decoration.outline,
        status: decoration.status,
      }),
    };
  }
  if (panel.meta?.frontDecorationParent) {
    const { mitres } = panel.meta;
    return {
      construction: `Applied strip, ${mitres.start}/${mitres.end} mitres`,
      identity: JSON.stringify({ outline: panel.cnc.outline, mitres }),
    };
  }
  return null;
}
