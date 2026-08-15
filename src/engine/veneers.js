// ─── The VENEER collection (turn 15, CLAUDE.md F3.2) ────────────────────────
//
// The owner's verdict, twice, and marked "mega ważne": a VENEER front offered a
// RAL palette. A veneer is not a colour a sprayer mixes; it is a species of
// timber, and the picker in front of it has to be a picker of timber.
//
// ─── WHY THIS IS A COLLECTION AND NOT FOUR LINES IN A COMPONENT ─────────────
//
// CLAUDE.md F3.2 asks for the minimal seed — "(a)-minimal: three-four wood
// decors from the existing 85, flagged as veneers" — and then names the reason
// it must nonetheless be a structure:
//
//     "the owner will drop in his own scanned veneers later — adding one must
//      be a data entry, never a code change."
//
// So this is the STRUCTURE, seeded minimally. Adding the owner's own scanned
// oak is one object in the list below (or one row pushed through
// `setVeneerCatalogue`, exactly the way the 85 EGGER decors arrive), and no
// component, no store and no engine function has to be opened to do it.
//
// A veneer entry is deliberately NOT a copy of a decor. It has:
//
//   id        stable, and what a saved project stores (`veneer:oak-natural`)
//   label     what the workshop calls it — "Natural oak", not "H1180 ST37"
//   species   the timber, for grouping and for the search box
//   decorId   WHAT IT LOOKS LIKE TODAY: a reference into the decor catalogue
//
// `decorId` is a REFERENCE and not an inlined picture, which is the whole point
// of the indirection: when the owner's own scan of that oak arrives, the entry
// gains its own `tex` and the reference goes — and every project that ever
// chose "Natural oak" keeps its choice, because the id it stored was never the
// EGGER decor's.
//
// ─── NO NUMBERS HERE (CLAUDE.md rule 2) ─────────────────────────────────────
// A veneer's THICKNESS is not in this file. It follows from the SOURCE — 19 mm,
// `profile.projectSettings.{front,carcass}Sources` — exactly as an EGGER board's
// 18 follows from its own. One number, one home.
//
// ─── THE LICENCE TRAVELS (EGGER General Terms for Image Use) ────────────────
// While a veneer's look comes from an EGGER decor, its label carries EGGER's
// attribution, because that is a condition of showing the artwork at all — and
// the label is what the BOM, the picker tile and the unit card all print. See
// engine/decors.js for the full note; nothing here weakens it.
//
// Pure data and pure functions. No React, no store, no fetch.

import { decorById, decorFinish, decorLabel, finishIdForDecor } from './decors.js';

const VENEER_ID_PREFIX = 'veneer';

/**
 * The seed (owner decision (a)-minimal): the most TIMBER-LIKE of the 85, the
 * ones a workshop would actually be asked for by name. Four, not eighty-five —
 * a veneer list is a list of what the shop can get.
 */
export const DEFAULT_VENEERS = [
  { id: 'oak-natural', label: 'Natural oak', species: 'Oak', decorId: 'H1180_37' },
  { id: 'oak-bardolino', label: 'Bardolino oak', species: 'Oak', decorId: 'H1145_10' },
  { id: 'oak-gladstone', label: 'Tobacco oak', species: 'Oak', decorId: 'H3325_28' },
  { id: 'hickory-natural', label: 'Natural hickory', species: 'Hickory', decorId: 'H3730_10' },
];

// ─── The registry ───
// The same shape engine/decors.js uses, and for the same reason: the list is
// DATA that a later turn will load from a file or a table, and the engine must
// never be the thing that reaches for it. Until then the seed is the catalogue.
let catalogue = [...DEFAULT_VENEERS];

/** Replace the catalogue — how the owner's own scanned veneers will arrive. */
export function setVeneerCatalogue(next) {
  catalogue = (Array.isArray(next) ? next : []).map(normaliseVeneer).filter(Boolean);
  return catalogue;
}

/** Every veneer this project may pick from. */
export function getVeneers() {
  return catalogue;
}

/** One row, with everything the app needs and nothing it does not. */
export function normaliseVeneer(raw) {
  if (!raw?.id) return null;
  return {
    id: String(raw.id),
    label: String(raw.label || raw.id),
    species: String(raw.species || ''),
    // Today a reference into the decor catalogue; tomorrow, `tex` of its own.
    decorId: raw.decorId ? String(raw.decorId) : null,
    tex: typeof raw.tex === 'string' && /^https?:\/\//i.test(raw.tex) ? raw.tex : null,
    hex: /^#[0-9a-fA-F]{6}$/.test(String(raw.hex || '')) ? String(raw.hex).toUpperCase() : null,
  };
}

function veneerById(id) {
  if (!id) return null;
  return catalogue.find((v) => v.id === String(id)) || null;
}

/** The finish id a chosen veneer is stored under: "veneer:oak-natural". */
export function veneerFinishId(veneer) {
  const id = typeof veneer === 'string' ? veneer : veneer?.id;
  return id ? `${VENEER_ID_PREFIX}:${id}` : null;
}

/** The veneer id inside a finish id, or null when it is not a veneer at all. */
export function veneerIdFromFinishId(finishId) {
  const text = String(finishId ?? '');
  if (!text.startsWith(`${VENEER_ID_PREFIX}:`)) return null;
  return text.slice(VENEER_ID_PREFIX.length + 1) || null;
}

/**
 * A veneer's LABEL, with the EGGER attribution attached while the picture is
 * still theirs. "Natural oak veneer · EGGER H1180 ST37 Natural Halifax Oak".
 *
 * One label, so the BOM, the unit card, the picker tile and the 3D tooltip
 * cannot disagree about what the piece is made of — and cannot show the image
 * without the credit.
 */
export function veneerLabel(veneer) {
  if (!veneer) return '';
  const own = `${veneer.label} veneer`;
  if (veneer.tex || !veneer.decorId) return own;
  const decor = decorById(veneer.decorId);
  return decor ? `${own} · ${decorLabel(decor)}` : own;
}

/**
 * A finish id → the veneer finish it stands for, or null when it names no
 * veneer this catalogue has.
 *
 * The LOOK is delegated: while a veneer borrows an EGGER decor it borrows the
 * decor's whole finish — the same grain, the same scan-or-fallback rule, the
 * same tint decision — because forking that would give this app two answers to
 * "what does wood look like". Only the id and the label are the veneer's own,
 * and those are exactly what a saved project and a cut list read.
 */
export function veneerFinish(finishId) {
  const id = veneerIdFromFinishId(finishId);
  if (!id) return null;
  const veneer = veneerById(id);
  if (!veneer) return null;
  const base = veneer.decorId ? decorFinish(finishIdForDecor({ id: veneer.decorId })) : null;
  if (!base) {
    // A veneer with no picture yet is still a real finish — it is a colour and
    // a name, exactly as a uni decor is. Better than rendering nothing.
    return {
      id: finishId, label: veneerLabel(veneer), kind: 'veneer', hex: veneer.hex || '#C2A485', veneer,
    };
  }
  return {
    ...base, id: finishId, label: veneerLabel(veneer), kind: 'veneer', veneer,
  };
}

/** Filter the grid: a search over the label and the species. */
export function filterVeneers(veneers = getVeneers(), { query = '' } = {}) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return veneers;
  return veneers.filter((v) => `${v.label} ${v.species}`.toLowerCase().includes(needle));
}
