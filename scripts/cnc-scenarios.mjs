#!/usr/bin/env node
// ─── THE PROBE SCENARIOS, IN ONE PLACE (turn 25, CLAUDE.md F1) ──────────────
//
// The list of cabinets every CNC-wide check is run over. It lived inside
// `scripts/cnc-fingerprint.mjs` from turn 12 until turn 25, when F1 asked for a
// guard run "on EVERY panel in EVERY probe scenario" — and a second copy of the
// list is a second answer to what "every scenario" means.
//
// So it is a module now, and it has exactly two consumers: the fingerprint
// script that reports what the machine gets, and the edge guard that refuses to
// let a doubled edge reach it (test/turn25-f1-edge-guard.test.js). Adding a
// probe here adds it to both, which is the point.

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { UNIT_TYPE_ORDER, defaultParamsFor } from '../src/engine/types.js';

/**
 * The cases. Ordinary units, plus the ones that carry the pieces this turn
 * touched: a plinth, an end panel, a top infill, shelves, a partition.
 */
export function cases() {
  const out = [];
  for (const type of UNIT_TYPE_ORDER) {
    const base = { ...defaultParamsFor(type, P), unit_num: '01' };
    out.push({ id: `${type}`, params: base });
    out.push({ id: `${type}+plinth`, params: { ...base, plinth: true } });
    // ─── The deliberate delta (turn 12, CLAUDE.md F8) ───
    // A unit standing in a RUN of plinthed cabinets. The turn-11 engine has no
    // `run_plinth` input and cuts its own 600 mm piece; turn 12 cuts one board
    // for the whole segment. This case is here so the change SHOWS in the diff
    // instead of hiding behind a script that only ever builds one cabinet.
    out.push({
      id: `${type}+plinth-run-owner`,
      params: {
        ...base,
        plinth: true,
        run_plinth: {
          role: 'owner', offset: 0, length: 1800, unitIds: ['a', 'b', 'c'],
        },
      },
    });
    out.push({
      id: `${type}+plinth-run-member`,
      params: { ...base, plinth: true, run_plinth: { role: 'member', ownerId: 'a' } },
    });
    out.push({
      id: `${type}+shelves`,
      params: {
        ...base,
        sections: [{
          width_mm: base.width,
          items: [
            { id: 's1', kind: 'shelf', pos_mm: 300, variant: 'adjustable' },
            { id: 's2', kind: 'shelf', pos_mm: 500, variant: 'fixed' },
          ],
        }],
      },
    });
    // ─── The deliberate delta (turn 13, CLAUDE.md F8 / #59) ───
    // A cabinet with a VERTICAL PARTITION in it. Turn 12 cut the piece and
    // exported it with nothing on it at all — BLOCKERS #59, open since turn 11
    // — and turn 13 gives it the owner's biscuit set. Both cases are here so
    // the change SHOWS in the diff as an addition on named files rather than
    // hiding behind a script that only ever builds an undivided box: the first
    // is a partition floor-to-top (both joints drilled), the second one that
    // terminates on a FIXED shelf (the no-screw set).
    out.push({
      id: `${type}+partition`,
      params: {
        ...base,
        sections: [{
          width_mm: base.width,
          items: [{ id: 'p1', kind: 'partition', x_mm: Math.round(base.width / 2) }],
        }],
      },
    });
    // ─── The deliberate delta (turn 14, CLAUDE.md F5 / #45) ───
    // The BOTTOM MASKING PANEL, a new part family. It only exists on a WALL
    // unit and only when somebody asks for it, so it shows in the diff as an
    // ADDITION on named files — which is what CLAUDE.md means by "new variants
    // get NEW fingerprints, listed separately". Both states are here: one
    // cabinet's board, and a RUN's.
    out.push({ id: `${type}+bottom-mask`, params: { ...base, bottom_mask: true } });
    out.push({
      id: `${type}+bottom-mask-run-owner`,
      params: {
        ...base,
        bottom_mask: true,
        run_mask: {
          role: 'owner', offset: 0, length: 1800, depth: 310, unitIds: ['a', 'b', 'c'],
        },
      },
    });
    // ─── The deliberate delta (turn 15, CLAUDE.md F6 / BACKLOG #51) ───
    // The MITRED CORNER between a side infill and a top infill. Three cases,
    // because what has to be provable is not only that the mitre cuts but that
    // it does not cut when it should not:
    //
    //   +infills          a filler and a top strip with NO run information —
    //                     a cabinet closing itself, which is what every case
    //                     above and every existing fixture is. Square corner,
    //                     byte for byte what turn 14 cut.
    //   +infill-mitre     the same cabinet in a RUN whose end stops against the
    //                     filler, both finishing flush and the filler wide
    //                     enough to take a 45°. THE NAMED DELTA: the
    //                     side-infill face's outline gains its corner, and the
    //                     top-infill face runs to its long point over it.
    //   +infill-mitre-narrow
    //                     the same again with a filler NARROWER than the strip
    //                     is tall. A 45° would run off the far edge of it, so
    //                     there is no mitre — and this row must be identical to
    //                     the un-mitred one.
    const infills = {
      ...base, top_infill_mm: 100, side_infill_left_mm: 120, side_infill_left_top_mm: 100,
    };
    const inARun = (width) => ({
      ...infills,
      side_infill_left_mm: width,
      run_top_infill: {
        role: 'owner',
        offset: 0,
        length: 1200,
        faceH: 100,
        shelfDepth: P.autoParts.topInfill.shelfDepth,
        thickness: P.autoParts.topInfill.thickness,
        ends: { left: 'infill', right: 'wall' },
        returns: { left: null, right: null },
        mitre: { left: Math.min(width, 100) === 100 ? 100 : 0, right: 0 },
        sideMitre: { left: width >= 100 ? 100 : 0, right: 0 },
        unitIds: ['a', 'b'],
      },
    });
    out.push({ id: `${type}+infills`, params: infills });
    out.push({ id: `${type}+infill-mitre`, params: inARun(120) });
    out.push({ id: `${type}+infill-mitre-narrow`, params: inARun(60) });
    out.push({
      id: `${type}+partition-on-shelf`,
      params: {
        ...base,
        sections: [{
          width_mm: base.width,
          items: [
            { id: 's1', kind: 'shelf', pos_mm: Math.round(base.height / 2), variant: 'fixed' },
            { id: 'p1', kind: 'partition', x_mm: Math.round(base.width / 2) },
          ],
        }],
      },
    });
    // ─── TURN 21 (CLAUDE.md F12.5 / PROOF): THE DEDICATED PROBE ─────────────
    //
    // The owner's own case — partitions at 600 and 800, three bays, a door in
    // each — because this turn's ONLY new CNC entities live here and nowhere
    // else: the ⌀5 plate pattern (HINGES_5MM) on a VPART, where a door is hung
    // on a partition. A scenario the turn-20 baseline does not have shows up in
    // the diff as an ADDITION, which is what this script's header calls the
    // right way to report a new variant.
    out.push({
      id: `${type}+partition-doors`,
      params: {
        ...base,
        width: Math.max(Number(base.width) || 0, 1400),
        sections: [{
          width_mm: Math.max(Number(base.width) || 0, 1400),
          items: [
            { id: 'p1', kind: 'partition', x_mm: 600, front_mm: 0 },
            { id: 'p2', kind: 'partition', x_mm: 800, front_mm: 0 },
          ],
        }],
        bay_doors: [
          { door: 'one', hinge: 'L' },
          { door: 'one', hinge: 'L' },
          { door: 'one', hinge: 'R' },
        ],
      },
    });
    // ─── TURN 24 (CLAUDE.md F7.4): THE FIX-SHELF PROBE ──────────────────────
    //
    // F7's joint and F6's width appear ONLY where a shelf is FIX, and a script
    // that only ever builds an adjustable one would report "no change" for a
    // whole new class of entity. Two shapes, because the two halves of F7.1
    // behave differently: from a CARCASS SIDE the set carries its through
    // screws, and from a PARTITION it is biscuits alone.
    out.push({
      id: `${type}+fix-shelf`,
      params: {
        ...base,
        sections: [{
          width_mm: base.width,
          items: [{ id: 's1', kind: 'shelf', pos_mm: Math.round(base.height / 2), variant: 'fixed' }],
        }],
      },
    });
    out.push({
      id: `${type}+fix-shelf-in-bay`,
      params: {
        ...base,
        width: Math.max(Number(base.width) || 0, 900),
        sections: [{
          width_mm: Math.max(Number(base.width) || 0, 900),
          items: [
            { id: 'p1', kind: 'partition', x_mm: 450 },
            {
              id: 's1', kind: 'shelf', pos_mm: Math.round(base.height / 2), zone: 0, variant: 'fixed',
            },
          ],
        }],
      },
    });
    // …and the ADJUSTABLE shelf, which F7.4 asks to be probed separately. It
    // introduces NO new class at all — the ⌀7.5 pin rows are what the kit has
    // drilled since turn 1 — and this row is here to prove exactly that.
    out.push({
      id: `${type}+adjustable-shelves`,
      params: {
        ...base,
        sections: [{
          width_mm: base.width,
          items: [
            { id: 's1', kind: 'shelf', pos_mm: Math.round(base.height / 3) },
            { id: 's2', kind: 'shelf', pos_mm: Math.round((2 * base.height) / 3) },
          ],
        }],
      },
    });
  }
  return out;
}
