/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T82 F4, F5 · THE HAWA POCKET IN THE ORDER AND ON THE MACHINE ──────────
//
// CLAUDE.md T82 F4: *"The BOM adds, per pocket: "Hawa Concepta III 25 Push,
// left" (or 35, Pull, right), one set per door; "Hawa Connector 55" or
// "Connector 110", one per pocket; the hinges (3 or 4 per door) as the set's
// own; the top track and bottom track cut to T1 - 7 (one line, the length
// named); for III/35 the steel stiffening profile, length TB - M + 3; the
// adjustable foot (HAWA recommends one under the pocket). Article numbers
// from profile.hawa.articles ... an empty article prints the name alone."*
//
// This module READS the pocket's figures (`result.hawa`, the one derivation
// of engine/hawaPocket.js, KIT_HAWA.lsp's mirror) and never derives a figure
// again: the set's name, the hinges, the track's and the steel profile's
// lengths are the kit's own (D16, D19, D22). It turns them into the order
// lines `computeCabinet` pushes through its own `hw()`, one line per role and
// spec, so the cut list (bom.js buildBom), the purchase list (bom.js through
// partRegistry.js HARDWARE_TO_PART_ID) and the invoice (bomInvoice.js) read
// them as they read every hardware line.
//
// F5: *"the hole patterns of F1(d) as drill operations on the pocket panels
// (fi 4.5 pilot PROPOSED 3 mm diameter 10 deep ...), on the layer grammar the
// CNC already has for hinge plates; the door's cups and holes as the hinge
// drilling is done today (fi 35 x 13, fi 5 x 13, fi 8 x 13)."*  The holes are
// the LISP's own (`meta.pocket.holes`, hawa-b-holes, hawa-a-holes, hawa-foot,
// hawa-door-holes, in KIT_HAWA.lsp's FACE frames); this module only seats each
// one in its board's CNC frame, the house's frame for the board it is:
//
//   a panel on the pocket's LEFT   x = u    (BUL's frame: its pocket face, the
//                                            front edge at x 0)
//   a panel on the pocket's RIGHT  x = w - u (BUR's frame: the front at x = w;
//                                            KIT_HAWA.lsp D20 "their drilling
//                                            is mirrored")
//   the door                       x = w - u when its cups are on its LEFT
//                                  edge seen from the room, u on the RIGHT
//                                  (a FRONT's frame: seen from its back)
//   the bottom board               x = u, y = v (across from its left edge,
//                                  back from its front edge, the LISP's own)
//
// y is v throughout (up from the bottom edge, back from the front edge). Each
// hole becomes a drill record with the house's grammar: a depth only where it
// is blind (the foot goes through), a kind of its own that never says "screw"
// (bom.js and bomInvoice.js count /screw/ kinds as confirmats). The III/35
// grooves become pocket records on the door (HAWA_GROOVE_12MM, 12 deep).
//
// Pure functions: no store, no React. A bare computeCabinet() of any other
// kit never reaches a line of this file (no `result.hawa`, no call).

import { roundTo } from '../format.js';
import { hawaMm, hawaSpec } from '../hawaPocket.js';

const r4 = (v) => roundTo(v, 4);

/** The order roles of a pocket, in the order the lines are written. */
export const HAWA_ROLES = Object.freeze(['hawa_set', 'hawa_connector', 'hawa_hinges', 'hawa_tracks', 'hawa_stiffener', 'hawa_foot']);

/** The article the profile holds for a key, or '' (the owner fills them; KIT_HAWA.lsp D22). */
function articleOf(profile, key) {
  const v = profile?.hawa?.articles?.[key];
  return v == null ? '' : String(v).trim();
}

/** A line's spec label: the name, then ` · art. N` for every article that is not empty (the name alone otherwise). */
function labelled(name, articles) {
  const known = articles.filter(Boolean);
  return known.length ? `${name} · art. ${known.join(' / ')}` : name;
}

/** The profile key of a set's article: setPushLeft, setPullRight, ... (D16 the hand, D19 Push and Pull). */
function setArticleKey(push, hawaHand) {
  return `set${push ? 'Push' : 'Pull'}${hawaHand === 'left' ? 'Left' : 'Right'}`;
}

/** Group items by a key, keeping the first-seen order. */
function groupBy(items, keyOf) {
  const out = new Map();
  for (const it of items) {
    const k = keyOf(it);
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(it);
  }
  return [...out.values()];
}

/**
 * THE POCKET'S ORDER LINES (F4), off its figures.
 *
 * A door the kit names no class for (Check #37: past both weight tables) has
 * no set to name, so it orders nothing of its own (its set, its hinges, its
 * tracks, its profile): the Check says why, the BOM never invents a set. The
 * connector and the foot belong to the pocket and are ordered with it.
 *
 * @param {object} hawa     `result.hawa` (engine/hawaPocket.js hawaPocketFigures)
 * @param {object} profile  the cabinet profile (`hawa.articles`, the cup's numbers)
 * @returns {Array<{ role, label, qty, unit, spec, spec_label }>}
 */
export function hawaHardwareLines(hawa, profile) {
  if (!hawa) return [];
  const K = hawaSpec(profile);
  const out = [];
  const push = (role, label, qty, unit, spec, specLabel) => {
    if (qty > 0) out.push({ role, label, qty, unit, spec, spec_label: specLabel });
  };
  const doors = (hawa.doors || []).filter((d) => d && d.cls && d.setName);

  // One set per door, by its own name (a two-door pocket orders a left and a right).
  for (const group of groupBy(doors, (d) => d.setName)) {
    const d = group[0];
    const key = setArticleKey(d.push, d.hawaHand);
    const article = articleOf(profile, key);
    push('hawa_set', d.setName, group.length, 'pcs', {
      class: d.cls, push: d.push !== false, hand: d.hawaHand, doors: group.map((x) => x.id), article,
    }, labelled(d.setName, [article]));
  }

  // One connector per pocket (D22): 55 for one door, 110 for two.
  {
    const name = hawa.connectorName;
    const article = articleOf(profile, Number(hawa.count) === 2 ? 'connector110' : 'connector55');
    push('hawa_connector', name, 1, 'pcs', { clear_mm: hawa.clearMm, doors: hawa.count, article }, labelled(name, [article]));
  }

  // The hinges, the set's own: 3 a door for III/25, 4 for III/35 (D7, D10).
  for (const group of groupBy(doors, (d) => d.hinges)) {
    const per = Number(group[0].hinges) || 0;
    push('hawa_hinges', 'Hawa Concepta III hinges, the set\'s own', per * group.length, 'pcs', {
      per_door: per, doors: group.length, in_set: true, cup_diameter_mm: K.hawaCupD, cup_depth_mm: K.hawaCupDepth,
    }, `${per} per door x ${group.length}, in the set · cup dia ${hawaMm(K.hawaCupD)} x ${hawaMm(K.hawaCupDepth)}`);
  }

  // The top and the bottom track, one line, the length named: T1 - 7 (D8).
  for (const group of groupBy(doors, (d) => d.trackMm)) {
    const L = Number(group[0].trackMm) || 0;
    const top = articleOf(profile, 'trackTop');
    const bottom = articleOf(profile, 'trackBottom');
    push('hawa_tracks', 'Hawa top and bottom track', group.length, 'pairs', {
      length_mm: L, from_front_mm: K.hawaTrackStart, doors: group.map((x) => x.id), articles: { top, bottom },
    }, labelled(`cut to ${hawaMm(L)} mm (T1 - 7), from ${hawaMm(K.hawaTrackStart)} behind the front edge`, [top, bottom]));
  }

  // III/35: the steel stiffening profile, TB - M + 3 long, one per groove the kit routes (D11).
  for (const group of groupBy(doors.filter((d) => d.cls === 35 && Number(d.steelMm) > 0), (d) => d.steelMm)) {
    const L = Number(group[0].steelMm) || 0;
    const qty = group.reduce((n, d) => n + ((d.grooves || []).length || 0), 0);
    const article = articleOf(profile, 'steelProfile');
    push('hawa_stiffener', 'Hawa steel stiffening profile', qty, 'pcs', {
      length_mm: L, doors: group.map((x) => x.id), per_door: (group[0].grooves || []).length, article,
    }, labelled(`${hawaMm(L)} mm (TB - M + 3)`, [article]));
  }

  // One adjustable foot under the pocket (160704: "Recommendation: use adjustable foot"; D14).
  {
    const article = articleOf(profile, 'foot');
    push('hawa_foot', 'Adjustable foot under the pocket', 1, 'pcs', {
      hole_diameter_mm: K.hawaFootD, article,
    }, labelled(`fi ${hawaMm(K.hawaFootD)} through the bottom board`, [article]));
  }
  return out;
}

// ═══ F5 · THE HOLES AND THE GROOVES ON THE MACHINE ══════════════════════════

/** The CNC layers of the pocket (KIT_HAWA.lsp D15, profile.hawa.layers). */
export function hawaLayers(profile) {
  return { ...hawaSpec(profile).layers };
}

/**
 * The drill kind of a hole, by the layer the LISP puts it on. None of them
 * says "screw": the HAWA screws come with the set and are never a confirmat.
 */
export function hawaKindOf(layer, profile) {
  const L = hawaLayers(profile);
  if (layer === L.pilot) return 'hawa_pilot';
  if (layer === L.cup) return 'hawa_cup';
  if (layer === L.screw) return 'hawa_cup_hole';
  if (layer === L.sleeve) return 'hawa_sleeve';
  if (layer === L.foot) return 'hawa_foot';
  return 'hawa_hole';
}

/** The door's figures by its panel id. */
function doorOf(hawa, id) {
  return (hawa?.doors || []).find((d) => d.id === id) || null;
}

/**
 * Which side of the pocket a pocket panel stands on: 'L' (its pocket face
 * looks right, BUL's frame) or 'R' (BUR's), off its box in the pocket's frame.
 */
function pocketSeat(panel, hawa) {
  const b = panel?.box;
  if (!b) return null;
  return b.x + b.w / 2 < (Number(hawa?.widthMm) || 0) / 2 ? 'L' : 'R';
}

/** A point of the LISP's face frame (u, v) in the board's CNC frame (x, y). */
export function hawaFacePoint(panel, hawa, u, v) {
  const kind = panel?.meta?.pocket?.kind;
  const w = Number(panel?.cnc?.drawn_w ?? panel?.w) || 0;
  if (kind === 'A' || kind === 'B') return [pocketSeat(panel, hawa) === 'R' ? w - u : u, v];
  if (kind === 'door') return [doorOf(hawa, panel.id)?.hingeEdge === 'L' ? w - u : u, v];
  return [u, v];
}

/**
 * EVERY HOLE OF THE POCKET, as the engine's drill records (F5): each part's
 * own LISP holes seated in its CNC frame.
 *
 * @param {object} hawa     `result.hawa`
 * @param {Array} panels    the unit's panels (the pocket's carry `meta.pocket`)
 * @param {object} profile
 * @returns {Array<{ panel, kind, layer, x, y, d, depth? }>}
 */
export function hawaDrills(hawa, panels, profile) {
  if (!hawa) return [];
  const out = [];
  for (const p of panels || []) {
    const holes = p?.meta?.pocket?.holes;
    if (!Array.isArray(holes)) continue;
    const thick = Number(p.thickness) || 0;
    for (const [layer, u, v, d, depth] of holes) {
      const [x, y] = hawaFacePoint(p, hawa, Number(u), Number(v));
      const blind = Number(depth) > 0 && !(thick > 0 && Number(depth) >= thick - 1e-6);
      out.push({
        panel: p.id, kind: hawaKindOf(layer, profile), layer, x: r4(x), y: r4(y), d: Number(d),
        ...(blind ? { depth: r4(Number(depth)) } : {}),
      });
    }
  }
  return out;
}

/**
 * THE III/35 GROOVES, onto the door's CNC record (F5, KIT_HAWA.lsp D11): each
 * [u0, v0, u1, v1] of `meta.pocket.grooves` a pocket on HAWA_GROOVE_12MM, cut
 * to the groove's depth (profile.hawa.steel.grooveDepthMm, PROPOSED 12). The
 * groove runs out of the hinge edge, so it is an ordinary pocket (it breaks
 * the board's edge), never a cut-out. A door with no grooves is untouched.
 */
export function hawaGroovesOnto({ panels, hawa, profile }) {
  if (!hawa) return;
  const K = hawaSpec(profile);
  for (const p of panels || []) {
    const grooves = p?.meta?.pocket?.kind === 'door' ? p.meta.pocket.grooves : null;
    if (!Array.isArray(grooves) || !grooves.length) continue;
    p.cnc = p.cnc || {};
    p.cnc.pockets = [
      ...(p.cnc.pockets || []),
      ...grooves.map(([u0, v0, u1, v1]) => {
        const [xa] = hawaFacePoint(p, hawa, Number(u0), Number(v0));
        const [xb] = hawaFacePoint(p, hawa, Number(u1), Number(v1));
        return {
          layer: K.layers.groove,
          x1: r4(Math.min(xa, xb)),
          y1: r4(Math.min(Number(v0), Number(v1))),
          x2: r4(Math.max(xa, xb)),
          y2: r4(Math.max(Number(v0), Number(v1))),
          depth: K.hawaGrooveDepth,
        };
      }),
    ];
  }
}

/**
 * The seat of every pocket panel on its record (`meta.pocket.seat`, 'L' or
 * 'R'), so the room and the sheets place its face where the CNC drew it
 * (engine/joinery.js panelPlacement, BUL's or BUR's frame).
 */
export function hawaSeatsOnto({ panels, hawa }) {
  if (!hawa) return;
  for (const p of panels || []) {
    const pk = p?.meta?.pocket;
    if (pk && (pk.kind === 'A' || pk.kind === 'B')) pk.seat = pocketSeat(p, hawa);
  }
}
