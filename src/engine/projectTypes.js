// ─── What kind of job this is (turn 7, CLAUDE.md F2 / BACKLOG #41) ───
//
// Eight tiles on the second screen of the new-project flow. Picking one is not
// a commitment: it chooses better STARTING POINTS and nothing else — which
// Library category opens first, whether the flow suggests a whole room or a
// single wall, and which project heights the job begins at.
//
// Every one of those is editable from the moment the canvas opens, which is the
// point. A flow that makes the first click hard to undo is a flow people learn
// to fear; this one has no such click in it.
//
// The millimetres live in profile.projectTypes (CLAUDE.md rule 3). What is here
// is the list, the order and the vocabulary.
//
// Pure data plus resolution — no React, no store imports.

import { HEIGHT_KEYS, projectHeights } from './design.js';

/**
 * `category` — which Library category the canvas opens on.
 * `scope`    — the suggested answer to "whole room or one wall".
 */
export const PROJECT_TYPES = [
  {
    id: 'kitchen',
    label: 'Kitchen',
    category: 'kitchen',
    scope: 'room',
    hint: 'Base, wall and tall units to one set of heights',
  },
  {
    id: 'wardrobe',
    label: 'Wardrobe',
    category: 'wardrobe',
    scope: 'room',
    hint: 'Fitted wardrobes — taller carcasses, rails and internal drawers',
  },
  {
    id: 'media_wall',
    label: 'Media wall',
    category: 'kitchen',
    scope: 'wall',
    hint: 'A single run around a television',
  },
  {
    id: 'sideboard',
    label: 'Sideboard',
    category: 'kitchen',
    scope: 'wall',
    hint: 'One freestanding-looking run',
  },
  {
    id: 'vanity',
    label: 'Vanity',
    category: 'kitchen',
    scope: 'wall',
    hint: 'Bathroom units under a basin — lower than a kitchen',
  },
  {
    id: 'utility',
    label: 'Utility room',
    category: 'kitchen',
    scope: 'room',
    hint: 'Kitchen construction, laundry layout',
  },
  {
    id: 'hallway',
    label: 'Hallway',
    category: 'kitchen',
    scope: 'wall',
    hint: 'Tall storage, shoe benches, a coat run',
  },
  {
    id: 'other',
    label: 'Other',
    category: 'kitchen',
    scope: 'room',
    hint: 'Anything the list does not name',
  },
];

export const DEFAULT_PROJECT_TYPE = 'kitchen';

export function getProjectType(id) {
  return PROJECT_TYPES.find((t) => t.id === id) || PROJECT_TYPES.find((t) => t.id === DEFAULT_PROJECT_TYPE);
}

/** Is this a scope the flow knows? Anything else means "whole room". */
export function normaliseScope(scope) {
  return scope === 'wall' ? 'wall' : 'room';
}

/**
 * The project heights a job of this type STARTS at.
 *
 * The type's own overrides on top of the profile's standard — and the standard
 * is what a kitchen is, which is why a kitchen overrides nothing. Resolved
 * through the same `projectHeights()` every other caller uses, so a stored null
 * and an absent type behave identically.
 *
 * @returns {object} { base, wall, tall, wallMount, toeKick }
 */
export function heightsForProjectType(typeId, profile) {
  const standard = projectHeights(null, profile);
  const overrides = profile?.projectTypes?.[getProjectType(typeId).id]?.heights || {};
  const out = { ...standard };
  for (const key of HEIGHT_KEYS) {
    if (Number(overrides[key]) > 0) out[key] = Number(overrides[key]);
  }
  return out;
}

/**
 * Only the heights this type CHANGES — what the settings screen shows as "this
 * kind of job is built differently", rather than repeating five numbers that
 * are the same as everybody else's.
 */
export function heightOverridesFor(typeId, profile) {
  const standard = projectHeights(null, profile);
  const resolved = heightsForProjectType(typeId, profile);
  return Object.fromEntries(
    HEIGHT_KEYS.filter((k) => resolved[k] !== standard[k]).map((k) => [k, resolved[k]]),
  );
}
