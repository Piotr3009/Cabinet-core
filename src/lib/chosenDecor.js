// ─── ONE CHOSEN-DECOR FORMAT (turn 45, CLAUDE.md F3) ────────────────────────
//
// The approved mockup, 23.08.2026:
//
//   *"The tab then shows exactly ONE tile (swatch + code + name + ST) with
//   `Change`. The SAME single tile is what the Summary shows. … Spraying:
//   picked from the list, but once picked it renders as the SAME large tile
//   (colour swatch + name) — one chosen-decor format across laminate / veneer /
//   spraying."*
//
// Three sources, three catalogues, three shapes of record — and the owner wants
// ONE thing on the screen. So the reconciliation happens HERE, once, as a pure
// function, and both surfaces that draw a chosen decor (the tab and the wizard
// summary) render the same object through the same component. A second copy of
// this arithmetic inside a `.jsx` is exactly how the tab and the summary would
// come to disagree about what the job is faced in.
//
// Nothing here fetches. The decor catalogue is handed in by the caller (the app
// loads it once, at the top — `App.jsx`), the veneers come from the engine's
// own registry, and a sprayed colour is already a record.
//
// Pure — no React, no store. `src/engine/**` is closed byte-for-byte tonight
// (iron rule 2) and a LABEL is a surface decision in any case.

import { getVeneers, veneerFinishId, veneerLabel } from '../engine/veneers.js';
import { normaliseColour } from '../engine/design.js';

/** The name without the code and surface it already begins with. */
export function decorShortName(decor) {
  return String(decor?.name || '')
    .replace(new RegExp(`^${decor?.code}\\s*`), '')
    .replace(new RegExp(`^${decor?.texture}\\s*`), '')
    .trim();
}

/**
 * What the ONE tile says, whatever was chosen.
 *
 * @param {object} args
 *   picker  'decor' | 'veneer' | 'colour' — engine/projectSettings.js's word
 *   value   the finish id (a decor or a veneer), or null
 *   colour  the sprayed colour record, or null
 *   decors  the loaded catalogue (may be empty — see below)
 * @returns {null|{kind, code, name, texture, hex, thumb, source}}
 *   null when NOTHING has been chosen, which is what puts the `Choose decor…`
 *   slot on the screen instead of a tile.
 */
export function chosenTile({
  picker, value = null, colour = null, decors = [],
} = {}) {
  if (picker === 'colour') {
    const c = normaliseColour(colour);
    if (!c || (!c.hex && !c.name)) return null;
    return {
      kind: 'spray',
      code: c.system || 'Spray',
      name: c.name || c.hex,
      texture: 'sprayed',
      hex: c.hex || '#888888',
      thumb: null,
      // NOTHING. The tile prints `[source, texture]` on its bottom line, and
      // the system is ALREADY the tile's code line — "RAL / 9010 Pure White /
      // RAL · sprayed" says RAL twice, which is exactly the class of thing the
      // owner circles in red. The line reads "sprayed", which is the one fact
      // the two lines above it do not already carry.
      source: null,
    };
  }

  if (!value) return null;
  const id = String(value);

  if (id.startsWith('veneer:')) {
    const v = getVeneers().find((x) => veneerFinishId(x) === id) || null;
    // A veneer BORROWS an EGGER scan while it has none of its own
    // (engine/veneers.js says so and says why), so the tile borrows the same
    // picture — and with it the MANDATORY attribution, which is what
    // `veneerLabel()` is: "Natural oak veneer · EGGER H1180 ST37 …". There is
    // deliberately no branch here that shows the picture without it.
    const borrowed = v?.decorId
      ? (Array.isArray(decors) ? decors : []).find((x) => x.id === v.decorId) || null
      : null;
    return {
      kind: 'veneer',
      code: borrowed?.code || v?.species || 'Veneer',
      name: v ? `${v.label} veneer` : id.replace(/^veneer:/, ''),
      texture: borrowed?.texture || 'timber',
      hex: v?.hex || borrowed?.hex || '#C2A485',
      thumb: borrowed?.thumb || null,
      source: 'Veneer',
      attribution: v ? veneerLabel(v) : null,
    };
  }

  // A decor: `egger:H1180_37` or the older `decor:H1180_37`. The catalogue is
  // asked for the picture and the words; a build that has not loaded it yet —
  // or cannot, offline — still gets a tile with the id on it rather than an
  // empty slot that would read as "nothing chosen".
  const decorId = id.replace(/^(decor|egger):/, '');
  const d = (Array.isArray(decors) ? decors : []).find((x) => x.id === decorId) || null;
  return {
    kind: 'decor',
    code: d?.code || decorId,
    name: d ? decorShortName(d) : decorId,
    texture: d?.texture || '',
    hex: d?.hex || '#6b5a44',
    thumb: d?.thumb || null,
    source: 'EGGER',
  };
}

/** The one line a chosen tile reads as, for a summary row or a tooltip. */
export function chosenTileText(tile) {
  if (!tile) return 'nothing chosen yet';
  return [tile.source, tile.code, tile.name, tile.texture]
    .filter((part) => part && String(part).trim())
    .join(' · ');
}
