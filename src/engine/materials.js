// ─── WHAT A PIECE IS MADE OF (turn 16, CLAUDE.md F1) ────────────────────────
//
// The owner, verbatim: "przypisane materiały jeśli są takie same to łączymy,
// jeśli inne to oddzielamy — dlatego przypisanie materiałów jest takie ważne."
//
// Before this turn the answer to "what board is this piece cut from" was given
// in four places and agreed in none of them:
//
//   • the 3D view asked `material_role === 'front'` and painted the project's
//     one front finish;
//   • the BOM asked the same question and printed the same one label;
//   • the CNC sheet asked the ASSIGNMENT STORE, by BOM role — a purchasing
//     table that knows nothing about which front type a cabinet wears;
//   • the element picker offered a collapsed list with one row for "the
//     fronts", whichever of the two a piece was actually cut from.
//
// This module is the ONE answer, and every one of those four now reads it. It
// is a pure function of (panel, unit, design, profile) — no store, no React —
// so the picture, the cut list, the sheet and a node test cannot disagree.
//
// ─── THE RULE, IN ONE PARAGRAPH ─────────────────────────────────────────────
//
// A piece takes its material from its SLOT, and its slot from the engine's own
// `role`:
//
//   front                        → the FRONT TYPE this cabinet wears
//                                  (`params.front_type_id`, or type 1)
//   infill/plinth/end_panel/mask → the project's run-piece switch: "Same as
//                                  fronts" (the default) means front type 1's
//                                  board; unticked, its own
//   everything else              → the CARCASS TYPE this cabinet wears
//                                  (`params.carcass_type_id`, or type 1)
//
// …and an ELEMENT OVERRIDE beats the slot, because somebody said so about that
// one piece. Backs and drawer boxes have no slot of their own — the owner's
// decision, recorded in CLAUDE.md — so they are carcass, and a different board
// on one of them goes through the override like any other exception.

import { migrateDesign, paletteEntryByKey, resolveFinishes } from './design.js';

/**
 * The pieces that belong to a RUN and get a project-level switch of their own
 * (CLAUDE.md F1.2). Keyed by the engine's `role`, which is what the resolver
 * looks a panel up by — never by a list of panel ids, which would go stale the
 * first time a kit named a filler something new.
 */
export const RUN_MATERIAL_GROUPS = [
  { id: 'infill', label: 'Infills', hint: 'Scribe fillers at the wall and the strip up to the ceiling' },
  { id: 'plinth', label: 'Plinths', hint: 'The toe kick under a run' },
  { id: 'end_panel', label: 'End panels', hint: 'Masking panels on the outside of a run' },
  { id: 'mask', label: 'Masking panels', hint: 'The board under a run of wall units' },
];

export const RUN_MATERIAL_ROLES = new Set(RUN_MATERIAL_GROUPS.map((g) => g.id));

/** The run-piece switch for this role, with the shipped default behind it. */
export function runMaterialSetting(design, role) {
  const d = migrateDesign(design);
  return d.runMaterials[role] || { sameAsFronts: true, material_id: null };
}

/**
 * Which FRONT TYPE a cabinet wears — its own where it has been given one, the
 * project's first otherwise.
 *
 * `resolveUnitDesign` already resolves this for the COLOUR; this is the same
 * pointer read for the BOARD, and it is deliberately the same field
 * (`params.front_type_id`) rather than a second one. A unit wearing Front 2 is
 * wearing Front 2 in the picture, in the cut list and on the sheet.
 */
export function frontTypeFor(unit, design) {
  const d = migrateDesign(design);
  const types = d.fronts.types;
  const wanted = unit?.params?.front_type_id || null;
  return (wanted && types.find((t) => t.id === wanted)) || types[0] || null;
}

/** Which CARCASS TYPE a cabinet wears. */
export function carcassTypeFor(unit, design) {
  const d = migrateDesign(design);
  const types = d.carcass.types;
  const wanted = unit?.params?.carcass_type_id || null;
  return (wanted && types.find((t) => t.id === wanted)) || types[0] || null;
}

/**
 * The SLOT a panel's material comes from, before anything is looked up.
 *
 * @returns {{kind:'carcass'|'front'|'run', role:string|null, key:string|null,
 *            typeId:string|null, sameAsFronts:boolean}}
 */
export function materialSlotOf(panel, unit, design) {
  const d = migrateDesign(design);
  const role = panel?.role || null;

  if (RUN_MATERIAL_ROLES.has(role)) {
    const setting = runMaterialSetting(d, role);
    if (setting.sameAsFronts) {
      // "The checkbox is an ASSIGNMENT, not a display state" (F2.2): a piece
      // following the fronts IS front type 1's board, and it lands in front
      // type 1's section on the sheet with the doors.
      const type = d.fronts.types[0] || null;
      return {
        kind: 'front', role, key: type ? `front:${type.id}` : null, typeId: type?.id || null, sameAsFronts: true,
      };
    }
    return {
      kind: 'run', role, key: `run:${role}`, typeId: null, sameAsFronts: false,
    };
  }

  if (panel?.material_role === 'front' || role === 'front') {
    const type = frontTypeFor(unit, d);
    return {
      kind: 'front', role, key: type ? `front:${type.id}` : null, typeId: type?.id || null, sameAsFronts: false,
    };
  }

  const type = carcassTypeFor(unit, d);
  return {
    kind: 'carcass', role, key: type ? `carcass:${type.id}` : null, typeId: type?.id || null, sameAsFronts: false,
  };
}

/**
 * The OVERRIDE on a piece, as the engine left it on the panel.
 *
 * Turn 11 stored a `material_id` + `material_label` pair; turn 16 adds the
 * palette `material_key`, which is what makes two identically-named front types
 * two distinct choices (F1.3). Both are read, newest first, so a project saved
 * before this turn keeps the material it was given.
 */
export function elementMaterialOverride(panel) {
  const meta = panel?.meta || {};
  const key = meta.material_key || null;
  const id = meta.material_id || null;
  const label = meta.material_label || null;
  if (!key && !id && !label) return null;
  return { key, material_id: id, material_label: label };
}

/**
 * A material record for an assigned stock id.
 * Null for "nothing assigned", which is an honest answer and not an error.
 */
function stockById(materials, id) {
  if (!id) return null;
  return (materials || []).find((m) => m.id === id) || null;
}

/**
 * WHAT THIS PIECE IS MADE OF — the one answer (CLAUDE.md F1.4/F1.5).
 *
 * @param {object} panel     an engine panel record (role, material_role, meta)
 * @param {object} unit      the unit it belongs to (params.front_type_id …)
 * @param {object} design    the project design, stored or migrated
 * @param {object} profile
 * @param {Array}  materials the workshop's stock list (id + name), passed IN
 *                           so this stays pure
 * @returns {{key:string, slot:string|null, kind:string, material_id:string|null,
 *            label:string|null, hex:string|null, finish:object|null,
 *            colour:object|null, assigned:boolean, placeholder:boolean,
 *            overridden:boolean}}
 *
 *   `key`   the GROUPING identity — same board, same key. It is the assigned
 *           stock id where there is one, and the material's own NAME where
 *           there is not: two slots on the same board are one sheet, and two
 *           unassigned slots that look the same really are one thing to cut.
 *   `label` what the BOM prints and what a workshop orders against.
 *   `finish`/`colour`  what the 3D view paints (F1.4).
 */
export function resolvePanelMaterial(panel, unit, design, profile, materials = []) {
  const d = migrateDesign(design);
  const override = elementMaterialOverride(panel);
  const finishes = resolveFinishes(unit, d, profile);

  // ── 1. the piece's own answer ───────────────────────────────────────────
  if (override) {
    const entry = paletteEntryByKey(d, profile, override.key);
    if (entry) {
      // A palette slot with no look of its OWN — a board assigned and nothing
      // else said about it — shows the project's answer for that side of the
      // job rather than nothing. Without this a shelf given "Front 2" would
      // render white, which is not a colour anybody chose; it is the absence of
      // one, and the absence of a choice is what the project's default is for.
      const finish = entry.finish || (entry.kind === 'front' ? finishes.front : finishes.carcass);
      return record({
        slot: entry.key,
        kind: entry.kind,
        material_id: entry.material_id,
        finish,
        label: entry.finish?.label || stockById(materials, entry.material_id)?.name
          || finish?.label || entry.label,
        materials,
        overridden: true,
      });
    }
    // An override that came from somewhere else — turn 11's id/label pair, a
    // hanger rail's product, a project saved against a palette this install no
    // longer has. It is still what somebody said about this piece.
    const stock = stockById(materials, override.material_id);
    return record({
      slot: null,
      kind: 'override',
      material_id: override.material_id,
      finish: null,
      label: override.material_label || stock?.name || null,
      materials,
      overridden: true,
    });
  }

  // ── 2. the slot ─────────────────────────────────────────────────────────
  const slot = materialSlotOf(panel, unit, d);

  if (slot.kind === 'run') {
    const setting = runMaterialSetting(d, slot.role);
    const stock = stockById(materials, setting.material_id);
    const group = RUN_MATERIAL_GROUPS.find((g) => g.id === slot.role);
    return record({
      slot: slot.key,
      kind: 'run',
      material_id: setting.material_id,
      // A run piece on its own board has no finish of its own to paint with —
      // the board IS the answer — so the picture keeps the fronts' surface and
      // the cut list names the board. A workshop that wants a filler a
      // different COLOUR sprays it, which is the front type's own decision.
      finish: finishes.front,
      label: stock?.name || group?.label || slot.role,
      materials,
    });
  }

  const entry = paletteEntryByKey(d, profile, slot.key);
  const stock = stockById(materials, entry?.material_id);
  // The FINISH is `resolveFinishes`'s — the one function the view, the BOM and
  // the drawings have read since turn 9. It resolves per UNIT (this cabinet's
  // own colour, then its door style, then its front type, then the project) and
  // it carries the whole fallback chain down to the profile's broken white, so
  // asking anything else here would be the second lookup table F1.5 removes.
  const finish = slot.kind === 'front' ? finishes.front : finishes.carcass;
  return record({
    slot: slot.key,
    kind: slot.kind,
    material_id: entry?.material_id || null,
    finish,
    label: finish?.label || stock?.name || entry?.label || null,
    materials,
  });
}

/** Assemble the record, and derive the grouping key from it. */
function record({
  slot, kind, material_id, finish, label, materials, overridden = false,
}) {
  const stock = stockById(materials, material_id);
  return {
    // Same board → same key, whatever slot asked for it, whatever it is
    // sprayed. That is the whole of F2.1, in one expression.
    key: material_id ? `mat:${material_id}` : `name:${label || 'unassigned'}`,
    slot: slot || null,
    kind,
    material_id: material_id || null,
    label: label || null,
    hex: finish?.hex || null,
    finish: finish || null,
    // The PAINT, where the finish is a tin of it. The 3D view treats a sprayed
    // surface differently from a faced one (3d/materials.js), and this is the
    // engine's answer to "what colour", not the view's guess.
    colour: finish?.kind === 'spray' ? (finish.colour || null) : null,
    assigned: Boolean(material_id),
    placeholder: Boolean(stock?.placeholder),
    overridden,
  };
}

/**
 * What the 3D VIEW needs, and nothing else (CLAUDE.md F1.4).
 *
 * The picture does not need the stock list — a board's NAME is not a colour —
 * so this is the same resolution with the lookup left out, which keeps
 * 3d/UnitView.jsx free of the assignment store.
 *
 * @returns {{finish:object|null, colour:object|null, overridden:boolean}}
 */
export function panelFinish(panel, unit, design, profile) {
  const m = resolvePanelMaterial(panel, unit, design, profile, []);
  return { finish: m.finish, colour: m.colour, overridden: m.overridden };
}

/**
 * Every material this project actually uses, with the pieces on it.
 *
 * The BOM's material groups and the CNC sheet's sections are the same
 * question — "what comes off each board" — asked of the same resolver, which
 * is CLAUDE.md F1.5's "one source downstream" made structural.
 *
 * @param {Array} entries  [{ unit, result|panels }]
 * @returns {Array<{key, label, material_id, assigned, placeholder, panels:[]}>}
 */
export function materialGroups(entries, {
  design = null, profile = null, materials = [],
} = {}) {
  const groups = new Map();
  for (const entry of entries || []) {
    const panels = entry.panels || entry.result?.panels || [];
    for (const panel of panels) {
      const m = resolvePanelMaterial(panel, entry.unit, design, profile, materials);
      let bucket = groups.get(m.key);
      if (!bucket) {
        bucket = {
          key: m.key,
          label: m.label,
          material_id: m.material_id,
          assigned: m.assigned,
          placeholder: m.placeholder,
          panels: [],
        };
        groups.set(m.key, bucket);
      }
      bucket.panels.push({ unit: entry.unit, panel, material: m });
    }
  }
  return [...groups.values()];
}

/**
 * The CHECK-OUT gate (CLAUDE.md F1.1, the T15-B rule carried to the fronts).
 *
 * "Check-out refuses placeholders." A Generic board pins the geometry honestly
 * and costs nothing, which is exactly why a job may not leave the shop on one.
 * Every slot the project actually assigns is asked — the carcass types, the
 * front types and the four run pieces — so the answer covers the material model
 * as a whole rather than the half that existed before this turn.
 *
 * @returns {Array<{slot:string, label:string, material:object}>} the offenders
 */
export function placeholderAssignments(design, profile, materials = []) {
  const d = migrateDesign(design);
  const out = [];
  const check = (slot, label, id) => {
    const stock = stockById(materials, id);
    if (stock?.placeholder) out.push({ slot, label, material: stock });
  };
  for (const t of d.carcass.types) check(`carcass:${t.id}`, t.label, t.material_id);
  for (const t of d.fronts.types) check(`front:${t.id}`, t.label, t.material_id);
  for (const g of RUN_MATERIAL_GROUPS) {
    const setting = d.runMaterials[g.id];
    if (!setting.sameAsFronts) check(`run:${g.id}`, g.label, setting.material_id);
  }
  return out;
}

/**
 * The board a SLOT is drawn at, in millimetres, or null.
 *
 * The T15-B hard gate asks "would assigning this change what the project is
 * DRAWN at" and it asked it of the carcass only. A FRONT type pins the front
 * board the same way (engine/projectSettings.js `projectFrontThickness` reads
 * the source), so the gate has the same question to ask on both sides and this
 * is where it gets the number from.
 */
export function slotThickness(materials, id) {
  const stock = stockById(materials, id);
  return Number(stock?.thickness) > 0 ? Number(stock.thickness) : null;
}
