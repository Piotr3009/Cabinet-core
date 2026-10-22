/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T80 F10 · THE IN-FRAME CHECKS, #40 TO #44 ──────────────────────────────
//
// CLAUDE.md T80 F10: *"#40 red, front type not 22 under in-frame; #41 yellow,
// cabinets not butted (the stile grows); #42 yellow, a unit the frame stops at
// (the run split into frame segments); #43 yellow, the frame joined (wider
// than the board); #44 red, a cup within 3 of the lip."*  The owner's words
// they hold: *"drzwi 22 i jest idealnie"*, *"wszedzie ramke 38"*, *"raczej
// plyta ... a jak bedzie to bedziemy laczyc"*, *"3 mm zawsze"* (21.10.2026).
//
// ONE DERIVATION. The frames are re-derived from the units through the very
// function the store's settle pass calls (`inframe.js runFrameParams`), never
// a second grouping; the fronts are the engine's own (`meta.inset`), the
// hinge's numbers the reference file's (`hingeLadder.js insetCupClear`).
// Asked only of an in-frame project: a lay-on project hears nothing.
//
// Pure functions: no React, no store. `runChecks` (engine/checks.js) calls
// `inframeFindings` and pushes what comes back, in the one finding shape.

import { getUnitType } from './types.js';
import { inframeSpec, runFrameParams } from './inframe.js';
import { inframeHinge, insetCupClear, isInsetLeaf } from './hingeLadder.js';
import { materialSlotOf } from './materials.js';

/** The checks' numbers, once (verify/t80/f10-probe.md: 40 to 44 free). */
export const INFRAME_CHECKS = Object.freeze({
  FRONT_T: 40, NOT_BUTTED: 41, STOPS: 42, JOINED: 43, CUP_LIP: 44,
});

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const r2 = (v) => Math.round(Number(v) * 100) / 100;

/** A length the way CLAUDE.md writes it: thousands apart by a space (3 200). */
export function spacedMm(v) {
  const n = r2(v);
  const [whole, frac] = String(Math.abs(n)).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${n < 0 ? '-' : ''}${grouped}${frac ? `.${frac}` : ''}`;
}

/** The unit's own name, as every finding says it. */
const numOf = (unit, result) => String(result?.unitNum || unit?.params?.unit_num || unit?.id || '');

/**
 * Every in-frame finding of a project.
 *
 * @param {object} args
 *   entries  [{ unit, result }] (the store's allResults)
 *   units    the project's units (the frames are derived from these)
 *   design   the project's design (migrated or not)
 *   profile  the cabinet profile (`profile.inframe`)
 *   hinge    the inset hinge file (default: reference/hardware/blum-inframe-hinge.json)
 * @returns {Array<object>} findings in `runChecks`'s one shape
 */
export function inframeFindings({
  entries = [], units = null, design = null, profile = null, hinge = inframeHinge(),
} = {}) {
  if (design?.inframe !== true || !profile) return [];
  const list = units || entries.map((e) => e.unit).filter(Boolean);
  const F = inframeSpec(profile);
  const byId = new Map(entries.filter((e) => e?.unit).map((e) => [e.unit.id, e]));
  const nameOf = (id) => {
    const e = byId.get(id);
    return e ? numOf(e.unit, e.result) : String(list.find((u) => u.id === id)?.params?.unit_num ?? id);
  };
  const elements = runFrameParams(list, profile);
  const owners = [...elements.entries()].filter(([, el]) => el && el.role === 'owner');
  const framed = new Set();
  for (const [id, el] of elements) if (el) framed.add(id);
  const out = [];

  // ── #40 the fronts are 22 (KIT_INFRAME.lsp D12, the owner's "drzwi 22") ──
  // One row per FRONT TYPE, as CLAUDE.md F2 words it: the type is what the
  // owner changes, not each door.
  const types = new Map();
  for (const id of framed) {
    const e = byId.get(id);
    if (!e?.result) continue;
    for (const p of e.result.panels || []) {
      if (p?.role !== 'front' || !p.meta?.inset) continue;
      const t = Number(p.thickness) > 0 ? Number(p.thickness) : Number(p.box?.d);
      if (!(t > 0) || Math.abs(t - F.frontT) < 1e-6) continue;
      const typeId = materialSlotOf(p, e.unit, design).typeId || 'f1';
      const key = `${typeId}|${t}`;
      if (!types.has(key)) types.set(key, { typeId, t, unit: e.unit, result: e.result });
    }
  }
  for (const { typeId, t, unit, result } of types.values()) {
    out.push({
      check: INFRAME_CHECKS.FRONT_T,
      level: 'red',
      unitId: unit.id,
      unitNum: numOf(unit, result),
      panelId: null,
      message: `In-frame fronts are ${F.frontT} mm: front type ${typeId} is ${r2(t)} mm. `
        + 'Change the front material or switch back to lay-on.',
      subject: { unitId: unit.id, editor: 'cabinet' },
      frontType: typeId,
      frontT: r2(t),
    });
  }

  for (const [ownerId, el] of owners) {
    const ownerNum = nameOf(ownerId);
    // ── #41 the stile grows by the gap (lip + t + gap + t + lip, D5) ────────
    (el.gaps || []).forEach((gap, i) => {
      if (!(Math.abs(gap) > 0.05)) return;
      const a = el.unitIds[i];
      const b = el.unitIds[i + 1];
      const stile = el.stiles?.[i + 1];
      out.push({
        check: INFRAME_CHECKS.NOT_BUTTED,
        level: 'yellow',
        unitId: b,
        unitNum: nameOf(b),
        panelId: null,
        message: `In-frame: cabinets ${nameOf(a)} and ${nameOf(b)} stand ${spacedMm(gap)} mm apart, `
          + `the stile between them is ${spacedMm(stile)}, not ${F.stile}.`,
        subject: { unitId: b, editor: 'cabinet' },
        gapMm: r2(gap),
        stileMm: r2(stile),
      });
    });
    // ── #43 the frame is joined at a stile (D9) ─────────────────────────────
    const pieces = el.pieces || [];
    if (el.joinRefused) {
      out.push({
        check: INFRAME_CHECKS.JOINED,
        level: 'red',
        unitId: ownerId,
        unitNum: ownerNum,
        panelId: null,
        message: `In-frame frame is ${spacedMm(el.width)} wide: no stile between two cabinets lets it be cut `
          + `within the ${spacedMm(el.limit)} board. Shorten a cabinet or split the run.`,
        subject: { unitId: ownerId, editor: 'cabinet' },
        frameW: el.width,
      });
    } else if (pieces.length > 1) {
      const at = pieces.slice(1).map((piece) => {
        const i = (el.openings || []).findIndex((o) => o.x0 > piece.from);
        return i > 0 ? `${nameOf(el.unitIds[i - 1])} and ${nameOf(el.unitIds[i])}` : null;
      }).filter(Boolean);
      out.push({
        check: INFRAME_CHECKS.JOINED,
        level: 'yellow',
        unitId: ownerId,
        unitNum: ownerNum,
        panelId: null,
        message: `In-frame frame is ${spacedMm(el.width)} wide: ${WORDS[pieces.length] || pieces.length} boards, `
          + `joined at the ${at.length > 1 ? 'stiles' : 'stile'} between ${at.join(', ')}.`,
        subject: { unitId: ownerId, editor: 'cabinet' },
        frameW: el.width,
        pieces: pieces.map((p) => p.name),
      });
    }
  }

  // ── #42 a unit the frame stops at (the run split into segments, D8) ──────
  const stops = new Map();
  for (const [, el] of owners) {
    for (const side of ['left', 'right']) {
      const end = el.ends?.[side];
      if (end?.kind !== 'SPLIT' || !end.by) continue;
      const near = side === 'left' ? el.unitIds[0] : el.unitIds[el.unitIds.length - 1];
      const key = end.why === 'type' ? `type|${end.by}` : `line|${[near, end.by].sort().join('|')}`;
      if (stops.has(key)) continue;
      const by = list.find((u) => u.id === end.by);
      stops.set(key, end.why === 'type'
        ? {
          unitId: end.by,
          message: `In-frame: the frame stops at ${nameOf(end.by)} (${getUnitType(by?.type)?.label || by?.type || 'a unit'}`
            + ': no frame on it this turn); the run is framed either side of it, a 19 mm stile at each split.',
        }
        : {
          unitId: end.by,
          message: `In-frame: the frame stops between ${nameOf(near)} and ${nameOf(end.by)}: their carcass fronts `
            + 'do not stand on one line, so each side is a frame of its own.',
        });
    }
  }
  for (const { unitId, message } of stops.values()) {
    out.push({
      check: INFRAME_CHECKS.STOPS,
      level: 'yellow',
      unitId,
      unitNum: nameOf(unitId),
      panelId: null,
      message,
      subject: { unitId, editor: 'cabinet' },
    });
  }

  // ── #44 the cup clears the lip by 3 (D13, the reference file's K) ────────
  if (!insetCupClear(F.gap, hinge)) {
    const k = Number(hinge?.rules?.boring_distance_k?.used);
    for (const id of framed) {
      const e = byId.get(id);
      for (const p of e?.result?.panels || []) {
        if (!isInsetLeaf(p) || !p.meta?.insetHinge) continue;
        out.push({
          check: INFRAME_CHECKS.CUP_LIP,
          level: 'red',
          unitId: id,
          unitNum: nameOf(id),
          panelId: p.id,
          message: `In-frame: ${nameOf(id)} ${p.id}: the hinge cup's edge stands ${spacedMm(k + F.gap)} mm off the `
            + `frame's lip, under ${F.gap}. The hinge file's boring distance (K ${Number.isFinite(k) ? spacedMm(k) : '?'}) `
            + 'cuts the lip away: check reference/hardware/blum-inframe-hinge.json.',
          subject: { unitId: id, panelId: p.id, editor: 'element' },
        });
      }
    }
  }

  return out;
}
