/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F7 . THE HARDWARE AS THE GLB IS: THE SILHOUETTES THE PROJECTOR DRAWS
//
// The owner, 22.10.2026 (22:56), of the hardware on the sections: *"7 zrob
// wedlug glb"*. CLAUDE.md T81 F7: `engine/drawings/silhouettes.js` reads
// `reference/hardware/silhouettes.json` (written by
// `scripts/t81-silhouettes.mjs` from the very GLB files the room loads) and
// hands the projector a polyline per instance in the instance's placement.
//
// The projector (./projector.js) asks one question per hardware instance,
// `silhouetteMark(family, instance)`, and gets back:
//
//   . null, where the family has no traced model (it is drawn procedurally by
//     the room, its file could not be read when the file was made, or the room
//     would mount no model for this instance): the sheet draws today's symbol;
//   . a function of the view's name, answering closed rings of [x, y, z]
//     points in the instance's UNIT frame (cabinet-local mm: x across the
//     width, y up from the carcass base, z from the wall to the front), each
//     lying in the plane of the model's nearest face for that view:
//       'front'                  looking along -z, rings in x-y at the front;
//       'plan' / 'top-of-card'   looking down -y, rings in x-z at the top;
//       'section'                looking along +x, rings in z-y at the near side;
//     and null for any other view.
//
// WHERE THE ROOM PUTS IT, and nothing else. Every family is set down exactly
// as 3d/Hardware.jsx sets its model down, with the room's own placement
// numbers, which the script snapshots into each entry's `room` record when it
// traces the file (the views stay in the file's own millimetres):
//
//   hinge   DoorHinges: the file's cup datum (`fileDatum`, T30 F1) on the
//           drilled cup at the flange seat (`seatZ`), mirrored about the cup
//           when the door's hand is not the file's (`fileHand`); the arm slide
//           of the rig is already in the traced views (door shut).
//   plate   CarcassHinges: the file seated by `plateOrigin`, given its half
//           turn about z (`plateSpinDeg`), set on the bearer's face less the
//           bite into the side, mirrored when the door opens the other way.
//           The bite is a placement of the PICTURE and nothing here can reach
//           a cut (test/turn37-f3-hinge-bite.test.js holds that no engine
//           module reads the profile's own number; this one applies the
//           snapshot the script took of it).
//   runner  Runners: the file's own box corner on the instance point (x the
//           face it is screwed to, y the runner's underside, z the back of
//           the box) moved by `movento.modelOrigin`, mirrored for the hand the
//           manifest gives no file of its own.
//   kit     ConeroPulldown (the pull-down rail, the one kit body the room
//           draws from a GLB): coneroClone's three laws (the arms' outer faces
//           on the sides, the rod stretched between them and centred, the
//           frame scaled to the body height) and the rod parked at the top of
//           the instance, the bases mid-depth.
//
// WHICH FILE: the room's own resolution. A hinge wears the leading file of
// the family `engine/hinges.js resolveDoorHinge` answers for the front's
// thickness (the profile's default finish, or `instance.finish`; a caller that
// holds the room's own `hingeSpecsFor` answer passes it as `instance.spec`);
// the plate is `plateFamily` for the profile's default plate; a runner is the
// rung of the owner's ladder its ask lands on (`engine/runners.js
// ladderRungFor` over `runnerAskFor`), in the variant the instance names or the
// workshop's default. A rung the shop has no article for is a fallback entry:
// the room draws no runner there (T43 F7) and the sheet draws today's symbol.
//
// T82 F23 . WHAT A HEADLESS CALLER SEES. The owner, 24.10.2026 (19:34):
// *"narysowane zawiasy to jakas karykatura"*. The door's file is the room's
// own resolution, and that reads the engine's hinge catalogue, which the app
// hands over at start (App.jsx: lib/hardwareCatalogue.js
// loadHardwareCatalogues). A node script that renders the set without that
// call resolves no file, by the engine's law "no catalogue, null all the way
// down" (engine/hinges.js), as the room mounts no hinge model there: the
// sheet draws today's symbol. That, and the NL500 T the T81 kitchen's BUDR2
// orders (no GLB in the bucket), is why the nine pages of 25.10 did not move
// with the traced file (verify/t82/f23-probe.md): call it first to see what
// the app draws.
//
// Pure: no React, no three.js, no store, no fetch.

import DATA from '../../../reference/hardware/silhouettes.json' with { type: 'json' };
import { getCabinetProfile } from '../profile.js';
import { modelBasename } from '../hardwareUrl.js';
import { plateFamily, resolveDoorHinge } from '../hinges.js';
import { ladderRungFor, runnerAskFor } from '../runners.js';

const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const triple = (v) => (Array.isArray(v) && v.length >= 3 ? [num(v[0]), num(v[1]), num(v[2])] : null);

/** A traced entry: the views (or the parts) the script wrote, never a fallback. */
function isTraced(e) {
  return Boolean(e && !e.fallback && (e.views || e.parts));
}

/**
 * The views of one or more parts set down by an affine map per axis
 * (unit = a * file + b), answered per view name with the rings lying in the
 * plane of the nearest face.
 *
 * @param {Array<{views:object, map:{x:number[], y:number[], z:number[]}}>} parts
 */
function placed(parts) {
  const at = (m, v) => m[0] * v + m[1];
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  const grow = (k, v) => { lo[k] = Math.min(lo[k], v); hi[k] = Math.max(hi[k], v); };
  for (const { views, map } of parts) {
    for (const ring of views?.front || []) for (const [u, v] of ring) { grow(0, at(map.x, u)); grow(1, at(map.y, v)); }
    for (const ring of views?.side || []) for (const [u, v] of ring) { grow(2, at(map.z, u)); grow(1, at(map.y, v)); }
    for (const ring of views?.top || []) for (const [u, v] of ring) { grow(0, at(map.x, u)); grow(2, at(map.z, v)); }
  }
  if (!Number.isFinite(lo[0]) || !Number.isFinite(lo[1]) || !Number.isFinite(lo[2])) return null;
  const cache = new Map();
  const build = (name) => {
    const out = [];
    for (const { views, map } of parts) {
      if (name === 'front') {
        for (const ring of views?.front || []) out.push(ring.map(([u, v]) => [at(map.x, u), at(map.y, v), hi[2]]));
      } else if (name === 'plan' || name === 'top-of-card') {
        for (const ring of views?.top || []) out.push(ring.map(([u, v]) => [at(map.x, u), hi[1], at(map.z, v)]));
      } else if (name === 'section') {
        for (const ring of views?.side || []) out.push(ring.map(([u, v]) => [lo[0], at(map.y, v), at(map.z, u)]));
      }
    }
    return out;
  };
  return (name) => {
    if (name !== 'front' && name !== 'plan' && name !== 'top-of-card' && name !== 'section') return null;
    if (!cache.has(name)) cache.set(name, build(name));
    return cache.get(name).map((ring) => ring.map((p) => [...p]));
  };
}

/**
 * A reader over one silhouettes document. The module's own exports read the
 * committed file; a test hands it another (the silent showroom's, traced into
 * a temp file) and, if it wants, the profile to resolve with.
 *
 * @param {object} data      the silhouettes document
 * @param {object} [options]
 *   profile   the profile the resolution laws read (default: the engine's)
 * @returns {{mark:function, entries:function, source:function}}
 */
export function silhouetteReader(data, { profile = null } = {}) {
  const all = Array.isArray(data?.entries) ? data.entries : [];
  const traced = all.filter(isTraced);
  const has = new Set(traced.map((e) => e.family));
  const P = () => profile || getCabinetProfile();
  const find = (family, pred) => traced.find((e) => e.family === family && pred(e)) || null;

  /** DoorHinges: the cup datum on the drilled cup, the flange on the seat, the file's hand. */
  function hingeMark(h) {
    const C = P().hardware?.hinge?.cliptop || {};
    const file = modelBasename(h.spec?.file || resolveDoorHinge({
      assigned: h.assigned ?? null,
      frontThickness: h.thickness ?? null,
      finish: h.finish ?? C.defaultFinish ?? null,
    })?.file);
    if (!file) return null;
    const e = find('hinge', (x) => x.file === file);
    if (!e?.views) return null;
    const R = e.room || {};
    const min = triple(e.bounds?.min) || [0, 0, 0];
    const origin = triple(R.originMm) || [0, 0, 0];
    // 3d/glbClone: `datum` puts the file's own point on the origin; without
    // one the box corner goes there, moved by the measured origin.
    const datum = triple(R.datumMm) || [min[0] - origin[0], min[1] - origin[1], min[2] - origin[2]];
    const s = h.side !== R.fileHand ? -1 : 1;
    const seat = Number.isFinite(Number(h.seatZ)) ? Number(h.seatZ) : num(h.z);
    return placed([{
      views: e.views,
      map: {
        x: [s, num(h.x) - s * datum[0]],
        y: [1, num(h.y) - datum[1]],
        z: [1, seat - datum[2]],
      },
    }]);
  }

  /** CarcassHinges: the plate seated, turned, bitten into the side, mirrored by the opening. */
  function plateMark(h) {
    const C = P().hardware?.hinge?.cliptop || {};
    const file = modelBasename(h.spec?.plateFile || plateFamily({
      plate: h.plateRole ?? C.defaultPlate ?? null,
      finish: h.finish ?? C.defaultFinish ?? null,
    })?.file);
    if (!file) return null;
    const e = find('plate', (x) => x.file === file);
    if (!e?.views) return null;
    const R = e.room || {};
    const min = triple(e.bounds?.min) || [0, 0, 0];
    const max = triple(e.bounds?.max) || [0, 0, 0];
    const O = triple(R.originMm) || [0, 0, 0];
    const dir = num(h.dir, h.side === 'R' ? -1 : 1) < 0 ? -1 : 1;
    const s = dir === -1 ? -1 : 1;
    const px = num(h.plateX) - dir * num(R.biteMm);
    const spin = Math.abs(num(R.spinDeg)) === 180;
    return placed([{
      views: e.views,
      map: spin
        ? {
          x: [-s, px + s * (max[0] + O[0])],
          y: [-1, num(h.y) + max[1] + O[1]],
          z: [1, num(h.plateZ) - min[2] + O[2]],
        }
        : {
          x: [s, px + s * (O[0] - min[0])],
          y: [1, num(h.y) - min[1] + O[1]],
          z: [1, num(h.plateZ) - min[2] + O[2]],
        },
    }]);
  }

  /** Runners: the box corner on the instance point, the hand the manifest gave no file of its own mirrored. */
  function runnerMark(r) {
    const prof = P();
    const M = prof.hardware?.runner?.movento || {};
    const ask = Number.isFinite(Number(r.nominal)) ? Number(r.nominal) : (runnerAskFor(r.length, prof) ?? num(r.length));
    const rung = ladderRungFor(ask, prof);
    if (rung == null) return null;
    const variant = String(r.variant || M.defaultVariant || '').toUpperCase();
    const side = r.side === 'R' ? 'R' : 'L';
    const e = find('runner', (x) => Number(x.nl) === Number(rung) && String(x.variant) === variant
      && x.hands && Object.prototype.hasOwnProperty.call(x.hands, side));
    if (!e?.views) return null;
    const s = e.hands[side] ? -1 : 1;
    const min = triple(e.bounds?.min) || [0, 0, 0];
    const O = triple(e.room?.originMm) || [0, 0, 0];
    return placed([{
      views: e.views,
      map: {
        x: [s, num(r.x) + s * (O[0] - min[0])],
        y: [1, num(r.y) - min[1] + O[1]],
        z: [1, num(r.z) - min[2] + O[2]],
      },
    }]);
  }

  /** ConeroPulldown over coneroClone: three laws, the rod at the top, the bases mid-depth. */
  function kitMark(k) {
    if (k.body !== 'pulldown_rail') return null;
    const e = find('kit', (x) => x.key === 'pulldown_rail');
    if (!e?.parts) return null;
    const R = e.room || {};
    const min = triple(e.bounds?.min);
    const max = triple(e.bounds?.max);
    if (!min || !max) return null;
    const u = num(R.unitToMm, 1000) || 1000;
    const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
    const want = Math.max(1, num(k.w, 1) || 1);
    const body = num(R.bodyHeightMm);
    // Law 3: the frame's height is the sheet's number (a file of no height is left alone).
    const kY = body > 0 && size[1] / u > 1e-6 ? Math.max(1, body) / size[1] : 1;
    const hMm = size[1] * kY;
    const y = [kY, num(k.y) + num(k.h) - hMm - min[1] * kY];
    const z = [1, num(k.z) + num(k.d) / 2 - size[2] / 2 - min[2]];
    const parts = [];
    for (const [name, part] of Object.entries(e.parts)) {
      const b0 = triple(part?.bounds?.min);
      const b1 = triple(part?.bounds?.max);
      let x = [1, num(k.x) - min[0]];
      if (name === 'rod' && b0 && b1 && b1[0] - b0[0] > 0) {
        // Law 2: the rod grows by what the frame grows, its measured centre parked mid-opening.
        const rail = b1[0] - b0[0];
        const sx = Math.max(0.05, (rail + (want - size[0])) / rail);
        x = [sx, num(k.x) + want / 2 - sx * ((b0[0] + b1[0]) / 2)];
      } else if (name === 'left' && b0) {
        // Law 1: the base's outer face on the side.
        x = [1, num(k.x) - b0[0]];
      } else if (name === 'right' && b1) {
        x = [1, num(k.x) + want - b1[0]];
      }
      parts.push({ views: part?.views, map: { x, y, z } });
    }
    return placed(parts);
  }

  function mark(family, instance) {
    if (!instance || !has.has(family)) return null;
    switch (family) {
      case 'hinge': return hingeMark(instance);
      case 'plate': return plateMark(instance);
      case 'runner': return runnerMark(instance);
      case 'kit': return kitMark(instance);
      // The leg, the rail, the rod, the shelf support, the knob and the bar
      // are drawn procedurally by the room: there is no model to place.
      default: return null;
    }
  }

  return {
    mark,
    entries: () => all.slice(),
    source: () => String(data?.source || ''),
  };
}

const COMMITTED = silhouetteReader(DATA);

/**
 * The projector's one question: the silhouette of this instance's model, set
 * down where the room sets it, or null for today's symbol.
 *
 * @param {'leg'|'plate'|'hinge'|'runner'|'rod'|'rail'|'support'|'kit'|'knob'|'bar'} family
 * @param {object} instance   the `engine/hardware3d.js hardwareInstances` record (unit frame)
 * @returns {null|function(string): Array<Array<number[]>>|null}
 */
export function silhouetteMark(family, instance) {
  return COMMITTED.mark(family, instance);
}

/** Every entry of the committed file: the traced and the named fallbacks. */
export function silhouetteEntries() {
  return COMMITTED.entries();
}

/** Where the committed file's GLB files came from, in its own words. */
export function silhouetteSource() {
  return COMMITTED.source();
}
