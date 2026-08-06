// ─── Colour lists ───
// The RAL and Farrow & Ball lists, the quick swatches, and the grouping they
// are shown in, all come 1:1 from reference/colors/psw-colors.json — extracted
// from Prime Sash Windows, which is NOT touched (CLAUDE.md).
//
// This module only reshapes that file into what a dropdown needs. No colour
// value is invented, renamed or "corrected" here.

// Import attribute (`with { type: 'json' }`) rather than a bare specifier: it
// is what Node needs to load JSON from an ES module, and it lets the test
// import this exact file instead of a second copy of the parsing.
import raw from '../../reference/colors/psw-colors.json' with { type: 'json' };

/** [{ system, group, colours: [{hex, name, system}] }] */
function toGroups(entries, system) {
  return (entries || []).map(([group, list]) => ({
    system,
    group,
    colours: list.map(([hex, name]) => ({ hex: String(hex).toLowerCase(), name, system })),
  }));
}

export const FB_GROUPS = toGroups(raw.FB_OPTS, 'F&B');
export const RAL_GROUPS = toGroups(raw.RAL_OPTS, 'RAL');

/** The eight quick tiles, with their RAL reference kept. */
export const SWATCHES = (raw.SWATCHES || []).map((s) => ({
  hex: String(s.bg).toLowerCase(),
  name: s.name,
  system: 'RAL',
  ral: s.ral,
  key: s.key,
}));

export const COLOUR_SYSTEMS = [
  { id: 'RAL', label: 'RAL', groups: RAL_GROUPS },
  { id: 'F&B', label: 'Farrow & Ball', groups: FB_GROUPS },
];

/** Every colour in one flat list — for lookups and for tests. */
export const ALL_COLOURS = [...RAL_GROUPS, ...FB_GROUPS].flatMap((g) => g.colours);

/** Find a colour by hex, whichever system it belongs to. */
export function findColour(hex) {
  const h = String(hex || '').toLowerCase();
  return ALL_COLOURS.find((c) => c.hex === h) || null;
}

/** Black or white text on this background — so a swatch label stays readable. */
export function contrastInk(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return '#000000';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Rec. 601 luma: good enough to pick a text colour, and no dependency.
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#111111' : '#ffffff';
}
