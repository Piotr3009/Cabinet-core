// ─── THE CALIPER, NOT THE LABEL (turn 24, CLAUDE.md F3) ─────────────────────
//
// The owner's law, and it is the sentence the whole module exists for: the
// manufacturer never tells you the board is really 18.5 — the CALIPER does, and
// the engine must compute from the caliper.
//
// So a project no longer has ONE board thickness with a nominal on it. It has
// SIX SLOTS — Carcass 1–3, Front 1–2 and the Drawer box — and each of them
// carries three things:
//
//   the ASSIGNMENT   which material this slot is cut from (unchanged, turn 16)
//   the MEASURED     what the caliper says. Seeded from the material's nominal,
//                    because a seed is a courtesy and not an answer
//   the CONFIRMED    somebody has actually measured it
//
// ─── G IS A PROPERTY OF THE PART (F3.2) ────────────────────────────────────
//
// "Every panel resolves its thickness from its slot assignment; every law that
// mixes two parts takes the RIGHT side's number." A groove in a side is sized
// by the BOTTOM's board; a pocket's depth by the SIDE's; the drawer box maths
// by the BOX slot; a front-derived law by the FRONT slot. `thicknessOf` below
// is the ONE door — CLAUDE.md says so in as many words — and the audit of every
// `G` in the engine, with its side named, is `verify/t24/thickness-audit.md`.
//
// ─── AND THE BOX IS A HARD GATE (F3.1) ─────────────────────────────────────
//
// "No thickness, no drawers." A drawer box is the one part in the app whose
// geometry is ALL joint: the sides are grooved for the bottom, the front and
// back are cut to the sides' own thickness, and half a millimetre out is a box
// that does not go together. So a project may not add a drawer-bearing unit,
// or drawers to a unit, until the box slot's thickness has been confirmed.
//
// Pure functions and pure data. No React, no store, no three.js.

import { thicknessForSource } from './projectSettings.js';

/**
 * The six slots, in the order the setup asks for them.
 *
 * `kind` is what a slot is FOR and `index` is which of that kind — so a slot
 * looks up its own material through the design's existing `carcass.types` /
 * `fronts.types` lists rather than through a second table that could disagree
 * with them.
 */
export const THICKNESS_SLOTS = [
  {
    id: 'carcass1', kind: 'carcass', index: 0, label: 'Carcass 1', hint: 'The board the carcasses are cut from.',
  },
  {
    id: 'carcass2', kind: 'carcass', index: 1, label: 'Carcass 2', hint: 'The second carcass board, where a job runs two.',
  },
  {
    id: 'carcass3', kind: 'carcass', index: 2, label: 'Carcass 3', hint: 'The third.',
  },
  {
    id: 'front1', kind: 'front', index: 0, label: 'Front 1', hint: 'The board the doors and drawer fronts are cut from.',
  },
  {
    id: 'front2', kind: 'front', index: 1, label: 'Front 2', hint: 'The second front board.',
  },
  {
    id: 'box',
    kind: 'box',
    index: 0,
    label: 'Drawer box',
    hint: 'The board a drawer box is made of. Until it is confirmed, no drawers.',
  },
];

const BY_ID = new Map(THICKNESS_SLOTS.map((s) => [s.id, s]));

/** The three carcass slots, by id — what a partition and a panel may be on. */
export const CARCASS_SLOTS = THICKNESS_SLOTS.filter((s) => s.kind === 'carcass').map((s) => s.id);
/** The one slot the hard gate is about. */
export const DRAWER_BOX_SLOT = 'box';

/** The slot record, or null for a name that is not one of the six. */
export function slotById(id) {
  return BY_ID.get(String(id || '')) || null;
}

const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);

/**
 * What the MANUFACTURER says this slot's board is — the seed, never the answer.
 *
 * Most specific first, exactly the order `projectBoardThickness` has followed
 * since turn 11: the assigned board's own thickness, then the source's, then
 * the profile's. The drawer box has no material list of its own yet, so its
 * seed is the workshop's own drawer-box board (`wardrobe.drawers
 * .boxSideThickness`) — which is what the engine has cut a box from since turn
 * 1 and is therefore the honest nominal.
 */
export function slotNominal(slotId, { design, profile, materials = [] } = {}) {
  const slot = slotById(slotId);
  if (!slot || !profile) return null;
  if (slot.kind === 'box') {
    return num(profile.wardrobe?.drawers?.boxSideThickness) ?? num(profile.board?.thickness);
  }
  const types = slot.kind === 'front'
    ? (design?.fronts?.types || [])
    : (design?.carcass?.types || []);
  const type = types[slot.index] || null;
  const board = type?.material_id ? (materials || []).find((m) => m.id === type.material_id) : null;
  if (num(board?.thickness)) return num(board.thickness);
  if (type?.source) {
    const fromSource = thicknessForSource(profile, slot.kind === 'front' ? 'front' : 'carcass', type.source);
    if (num(fromSource)) return num(fromSource);
  }
  // ─── The turn-11 project thickness is still the floor under carcass 1 ─────
  // A project that answered "Other: 18.2" before this turn existed said
  // something true about its carcass board, and this turn must not throw it
  // away because the answer arrived through a different field.
  if (slot.id === 'carcass1') {
    const t = design?.thickness || {};
    if (num(t.custom)) return num(t.custom);
    if (num(t.board)) return num(t.board);
  }
  return slot.kind === 'front'
    ? num(profile.front?.thickness)
    : num(profile.board?.thickness);
}

/** The slot's stored record — `{ measured, confirmed }` — or an empty one. */
function slotRecord(design, slotId) {
  return (design?.thickness?.slots || {})[slotId] || {};
}

/**
 * THE NUMBER THE ENGINE COMPUTES FROM.
 *
 * The caliper where somebody has used one; the manufacturer's nominal where
 * nobody has. Nothing rounds it, nudges it or "corrects" it — 18.5 is 18.5, and
 * CLAUDE.md's second iron rule for this turn is about exactly that.
 */
export function slotThickness(slotId, { design, profile, materials = [] } = {}) {
  return num(slotRecord(design, slotId).measured) ?? slotNominal(slotId, { design, profile, materials });
}

/** Has somebody actually put a caliper on this board? */
export function slotConfirmed(design, slotId) {
  return slotRecord(design, slotId).confirmed === true;
}

/**
 * Every slot, resolved — the shape the ENGINE is handed and the shape
 * `thicknessOf` reads.
 *
 * @returns {{carcass1:number, carcass2:number, carcass3:number,
 *            front1:number, front2:number, box:number}}
 */
export function projectThicknesses({ design, profile, materials = [] } = {}) {
  const out = {};
  for (const slot of THICKNESS_SLOTS) {
    out[slot.id] = slotThickness(slot.id, { design, profile, materials });
  }
  return out;
}

/**
 * Everything the setup surface needs to draw one row, resolved once.
 *
 * @returns {Array<{id, label, hint, kind, nominal, measured, confirmed,
 *                  materialId, dirty}>}
 *   `dirty` is "the caliper disagrees with the label", which is the normal
 *   state of a real board and is worth SHOWING rather than hiding.
 */
export function thicknessSlotRows({ design, profile, materials = [] } = {}) {
  return THICKNESS_SLOTS.map((slot) => {
    const nominal = slotNominal(slot.id, { design, profile, materials });
    const record = slotRecord(design, slot.id);
    const measured = num(record.measured) ?? nominal;
    const types = slot.kind === 'front'
      ? (design?.fronts?.types || [])
      : (design?.carcass?.types || []);
    return {
      id: slot.id,
      label: slot.label,
      hint: slot.hint,
      kind: slot.kind,
      nominal,
      measured,
      confirmed: record.confirmed === true,
      materialId: slot.kind === 'box' ? null : (types[slot.index]?.material_id ?? null),
      dirty: Number(measured) !== Number(nominal),
    };
  });
}

/**
 * THE HARD GATE (F3.1).
 *
 * "While its thickness is unconfirmed, adding any drawer-bearing unit (or
 * drawers to a unit) is blocked with a plain message. No thickness, no drawers
 * — the owner's words."
 *
 * @returns {{blocked:boolean, message:string|null}}
 */
export function drawerBoxGate(design) {
  if (slotConfirmed(design, DRAWER_BOX_SLOT)) return { blocked: false, message: null };
  return {
    blocked: true,
    message: 'Measure the drawer-box board first: Project setup → Drawer box, '
      + 'type what the caliper says and tick it. No thickness, no drawers.',
  };
}

// ─── WHICH SLOT A PART IS CUT FROM ─────────────────────────────────────────
//
// The part NAMES are the engine's own (`panel.part`). Anything not named here
// is a carcass board, which is the right default in a cabinet: the exceptions
// are the two faces, the drawer box and the pieces that carry their own number.

const BOX_PARTS = new Set(['DRAWER-SIDE', 'DRAWER-BOX-FRONT', 'DRAWER-BOX-BACK', 'DRAWER-BOTTOM']);
const FRONT_PARTS = new Set(['FRONT', 'DRAWER-FRONT']);

/**
 * THE ONLY DOOR (F3.2).
 *
 * @param {string|object} part  a slot id, an engine part name, or a whole
 *   panel record. A PANEL's own `thickness` wins outright — it is what the
 *   engine cut, including a per-element override somebody typed for one shelf —
 *   and everything else is resolved from the slot the part belongs to.
 * @param {object} thicknesses  `projectThicknesses()` output
 * @returns {number|null}
 */
export function thicknessOf(part, thicknesses = {}) {
  const T = thicknesses || {};
  const carcass = num(T.carcass1);
  if (part == null) return carcass;

  if (typeof part === 'string') {
    if (BY_ID.has(part)) return num(T[part]) ?? carcass;
    return partSlotThickness({ part }, T) ?? carcass;
  }

  // A panel the engine has already cut says what it is: its own number, which
  // is the slot's unless somebody overrode this one piece (turn 9, F4).
  if (num(part.thickness)) return num(part.thickness);
  return partSlotThickness(part, T) ?? carcass;
}

/** …the slot half of the answer, for a part that has not been cut yet. */
function partSlotThickness(part, T) {
  const name = String(part?.part || '');
  const carcass = num(T.carcass1);

  // The pieces that name their own slot. A PARTITION does (F3.3, the owner:
  // "grubość przegrody się nie zmienia" — its slot is a choice, not a guess),
  // and so may any element somebody has put on carcass 2 or 3.
  const said = part?.meta?.slot || part?.slot || null;
  if (said && BY_ID.has(said)) return num(T[said]) ?? carcass;

  if (BOX_PARTS.has(name) || part?.role === 'drawer_box') return num(T.box) ?? carcass;
  if (FRONT_PARTS.has(name) || part?.role === 'front') {
    const which = part?.meta?.frontType === 'f2' || part?.front_type === 'f2' ? 'front2' : 'front1';
    return num(T[which]) ?? num(T.front1) ?? carcass;
  }
  return carcass;
}

/**
 * The slot a PARTITION is cut from (F3.3).
 *
 * Carcass 1–3 and nothing else: a partition is a carcass board standing on its
 * end, and offering it a front board would be offering to build a cabinet out
 * of doors. `null` and anything unrecognised read as carcass 1, so every
 * project saved before this turn cuts exactly what it cut.
 */
export function partitionSlot(item) {
  const said = String(item?.slot || '');
  return CARCASS_SLOTS.includes(said) ? said : CARCASS_SLOTS[0];
}
