// ─── CHAT-FIX 12.10.2026: ONE ANSWER PER CABINET UNTIL ITS INPUTS CHANGE ────
//
// The owner, 12.10.2026: "bardzo się zacina". Measured: every drag step ran
// computeCabinet for every unit dozens of times (Scene, the toolbar's Check,
// the gap warnings, refreshAutoParts), and after T76/T77 one decorated front
// costs 10 to 1100 ms. The engine stays pure; this remembers its answer.
//
// The key is EVERYTHING the engine is handed: the full paramsForEngine()
// output (so side infill, run elements, slope cut and the resolved design all
// count) and the part edits. Moving a cabinet changes its position, never
// those, so a drag recomputes only the one or two units whose run really
// changed, and every other unit hands back the SAME object, which keeps the
// 3-D memos holding.
//
// The engine also reads a few loaded catalogues (the profile, hinges, lifts,
// runners, inner drawers, veneers, decors, company defaults). Each setter
// replaces its object, so the cache compares those objects by identity and
// forgets everything the moment any of them is a different one.

import { getCabinetProfile } from '../engine/profile.js';
import { hingeCatalogue, blumHingeFamilies } from '../engine/hinges.js';
import { aventosCatalogue } from '../engine/lifts.js';
import { runnerCatalogue } from '../engine/runners.js';
import { innerDrawerCatalogue } from '../engine/innerDrawer.js';
import { getVeneers } from '../engine/veneers.js';
import { getDecorCatalogue } from '../engine/decors.js';
import { companyDefaults } from '../engine/companyDefaults.js';

const entries = new Map();
let world = [];

const worldNow = () => [
  getCabinetProfile(), hingeCatalogue(), blumHingeFamilies(), aventosCatalogue(),
  runnerCatalogue(), innerDrawerCatalogue(), getVeneers(), getDecorCatalogue(), companyDefaults(),
];

/**
 * The unit's result: the remembered one when nothing the engine reads has
 * changed, otherwise `build()` once and remember that.
 */
export function cachedResult(unitId, params, partEdits, build) {
  const now = worldNow();
  if (now.some((v, i) => v !== world[i])) {
    entries.clear();
    world = now;
  }
  const key = JSON.stringify([params, partEdits]);
  const hit = entries.get(unitId);
  if (hit && hit.key === key) return hit.result;
  const result = build();
  entries.set(unitId, { key, result });
  return result;
}

/** Drop the answers of units that are gone. */
export function keepResultsOf(units) {
  if (entries.size <= units.length) return;
  const alive = new Set(units.map((u) => u.id));
  for (const id of entries.keys()) if (!alive.has(id)) entries.delete(id);
}
