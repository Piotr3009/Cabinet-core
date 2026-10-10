// Manufacturing identity is distinct from the size of a rectangular blank.
export function frontManufacturing(panel) {
  const decoration = panel.meta?.frontDecoration;
  if (decoration) {
    const applied = decoration.style === 'AM';
    const depths = [...new Set(decoration.operations.map((op) => op.depth))];
    const construction = applied ? 'Slab with applied strips' : 'Routed slab';
    const detail = applied ? `${decoration.additions.length} applied strips`
      : `front face, depths ${depths.join('/') || 'unavailable'} mm`;
    const status = decoration.status === 'ready' ? 'CAM setup required' : 'BLOCKED';
    return {
      style: decoration.style, construction,
      status: decoration.status, parameters: decoration.parameters,
      summary: `${decoration.style}: ${construction}; ${detail}; ${status}`,
      identity: JSON.stringify({
        parameters: decoration.parameters, outline: decoration.outline,
        status: decoration.status,
      }),
    };
  }
  if (panel.meta?.frontDecorationParent) {
    const { mitres } = panel.meta;
    return {
      style: 'AM', construction: 'Applied rectangular strip', status: 'ready',
      parent: panel.meta.frontDecorationParent,
      summary: `Applied strip for ${panel.meta.frontDecorationParent}; ${mitres.start}/${mitres.end} degree mitres; bonded assembly`,
      identity: JSON.stringify({ outline: panel.cnc.outline, mitres }),
    };
  }
  return null;
}
