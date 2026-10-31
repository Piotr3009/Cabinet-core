/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── TURN 86B · F10 · THE TWO PROBES AS TESTS ──────────────────────────────
//
// CLAUDE.md T86B F10. The owner, 30.10.2026 23:02, on the two probes of 19:23:
// *"zrob jak rekomendujesz"* (all in).
//
// 1. THE TOP MIRROR ACROSS EVERY KIT. For every kit of UNIT_TYPE_ORDER whose
//    bare default `computeCabinet()` emits a TOP: (a) the TOP's cuts are all
//    on its underside face (its drawing is read from below, `panelPlacement`'s
//    u x v points down, and no record of it is cut from the 'outside' face);
//    (b) the TOP's record is the BOTTOM's mirror as `engine/topFrame.js
//    mirrorTopRecords` (17.10) writes it: every hole, pocket, mark and outline
//    vertex of the TOP, placed into the cabinet by its own placement, lands
//    over the BOTTOM's (the positions mirrored across the carcass's height,
//    the faces swapped), in plan, mark for mark.
// 2. THE HARDWARE SILHOUETTES. `verify/t82/silhouettes-live.json` against
//    `reference/hardware/silhouettes.json`, every hardware item by id: each
//    view's bounding box and the model's bounds within
//    `profile.hardware.silhouetteToleranceMm` of the reference's.
//
// A PROBE, NOT A FIX: each kit and each item is its own case, and a kit or an
// item that fails is a FINDING written as a `todo` row naming the cut or the
// view (one visible row per finding, the suite honest and green). No kit's
// cut is changed by this F. verify/t86b/probes.md prints the two tables.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPE_ORDER } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { panelPlacement } from '../src/engine/joinery.js';
import { markPoints } from '../src/engine/marks.js';

const r1 = (v) => Math.round(v * 10) / 10 + 0;

// ─── 1 · THE TOP MIRROR ────────────────────────────────────────────────────

/** Every cut of a board, in plan (cabinet x, z), through its own placement. */
export function planCuts(p) {
  const pl = panelPlacement(p);
  if (!pl) return null;
  const at = (x, y) => [0, 1, 2].map((i) => pl.origin[i] + x * pl.u[i] + y * pl.v[i]);
  const k = (pt) => `${r1(pt[0])},${r1(pt[2])}`;
  const out = [];
  for (const h of p.cnc?.holes || []) out.push(`hole ${h.layer} d${h.d} @${k(at(h.x, h.y))}`);
  for (const q of p.cnc?.pockets || []) {
    out.push(`pocket ${q.layer} @${[k(at(q.x1, q.y1)), k(at(q.x2, q.y2)), k(at(q.x1, q.y2)), k(at(q.x2, q.y1))].sort().join(' ')}`);
  }
  for (const m of p.cnc?.marks || []) out.push(`mark ${m.layer} @${markPoints(m).map((pt) => k(at(pt[0], pt[1]))).sort().join(' ')}`);
  for (const [x, y] of p.cnc?.outline || []) out.push(`outline @${k(at(x, y))}`);
  return out;
}

function multisetDiff(top, bottom) {
  const A = new Map(); const B = new Map();
  for (const x of top) A.set(x, (A.get(x) || 0) + 1);
  for (const x of bottom) B.set(x, (B.get(x) || 0) + 1);
  const rows = [];
  for (const [x, n] of A) if ((B.get(x) || 0) < n) rows.push(`on the TOP, not the BOTTOM: ${x}`);
  for (const [x, n] of B) if ((A.get(x) || 0) < n) rows.push(`on the BOTTOM, not the TOP: ${x}`);
  return rows;
}

/** The probe of one kit: its findings, or [] (exported for verify/t86b/probes.md). */
export function topProbe(type) {
  const r = computeCabinet({ ...defaultParamsFor(type, P), unit_num: 'T01' }, P);
  const top = r.panels.find((p) => p.part === 'TOP');
  if (!top) return null;
  const bottom = r.panels.find((p) => p.part === 'BOTTOM');
  const pl = panelPlacement(top);
  const view = pl ? [
    pl.u[1] * pl.v[2] - pl.u[2] * pl.v[1],
    pl.u[2] * pl.v[0] - pl.u[0] * pl.v[2],
    pl.u[0] * pl.v[1] - pl.u[1] * pl.v[0],
  ] : null;
  const underside = [];
  if (!view || !(view[1] < -0.5)) underside.push(`${top.id}: drawn from ${view ? 'above' : 'nowhere (no placement)'}`);
  const records = [
    ...(top.cnc?.holes || []).map((h) => ['hole', h]),
    ...(top.cnc?.pockets || []).map((h) => ['pocket', h]),
    ...(top.cnc?.marks || []).map((h) => ['mark', h]),
    ...(r.drills || []).filter((d) => d.panel === top.id).map((d) => ['drill', d]),
  ];
  for (const [kind, h] of records) if (h.face === 'outside') underside.push(`${top.id} ${kind} ${h.layer || h.kind} cut from the upper face`);
  const mirror = !bottom ? null : multisetDiff(planCuts(top) || [], planCuts(bottom) || []);
  return { top: top.id, bottom: bottom?.id || null, underside, mirror };
}

const KITS_WITH_TOP = UNIT_TYPE_ORDER.filter((type) => topProbe(type));

test('F10.1 · the probe covers every kit that emits a TOP', () => {
  assert.ok(KITS_WITH_TOP.length >= 40, `${KITS_WITH_TOP.length} kits with a TOP`);
  for (const t of ['WARDROBE', 'BUD', 'WUD', 'CORNER_L_WARDROBE', 'MIRROR_CABINET']) assert.ok(KITS_WITH_TOP.includes(t), t);
});

for (const type of KITS_WITH_TOP) {
  const found = topProbe(type);
  test(`F10.1 · ${type}: the ${found.top}'s cuts are all on its underside face`, found.underside.length
    ? { todo: `FINDING: ${found.underside.join('; ')}` } : {}, () => {
    assert.deepEqual(found.underside, []);
  });
  let opts = {};
  if (found.mirror === null) opts = { skip: `${type} emits no BOTTOM: there is nothing for the TOP to mirror` };
  else if (found.mirror.length) opts = { todo: `FINDING: ${found.mirror.slice(0, 6).join('; ')}${found.mirror.length > 6 ? ` (+${found.mirror.length - 6})` : ''}` };
  test(`F10.1 · ${type}: the ${found.top} is the ${found.bottom || 'BOTTOM'}'s mirror as mirrorTopRecords writes it`, opts, () => {
    assert.deepEqual(found.mirror, []);
  });
}

// ─── 2 · THE HARDWARE SILHOUETTES ──────────────────────────────────────────

const LIVE_URL = new URL('../verify/t82/silhouettes-live.json', import.meta.url);
const REF_URL = new URL('../reference/hardware/silhouettes.json', import.meta.url);
const HAVE = existsSync(LIVE_URL) && existsSync(REF_URL);
const TOL = Number(P.hardware?.silhouetteToleranceMm);

/** An item's id: its family and its catalogue key. */
export const itemId = (e) => `${e.family} ${e.key}`;

/** A view's bounding box over every ring of it. */
export function viewBox(rings) {
  const lo = [Infinity, Infinity]; const hi = [-Infinity, -Infinity];
  for (const ring of rings || []) {
    for (const [x, y] of ring) {
      lo[0] = Math.min(lo[0], x); lo[1] = Math.min(lo[1], y);
      hi[0] = Math.max(hi[0], x); hi[1] = Math.max(hi[1], y);
    }
  }
  return Number.isFinite(lo[0]) ? { min: lo, max: hi } : null;
}

/** The item's findings against its reference (exported for verify/t86b/probes.md). */
export function silhouetteProbe(live, ref, tol) {
  const rows = [];
  const near = (a, b) => Math.abs(a - b) <= tol;
  const both = (what, a, b) => {
    if (!a || !b) { if (a || b) rows.push(`${what}: ${a ? 'live only' : 'reference only'}`); return; }
    a.min.forEach((v, i) => { if (!near(v, b.min[i])) rows.push(`${what} min[${i}] ${v} against ${b.min[i]}`); });
    a.max.forEach((v, i) => { if (!near(v, b.max[i])) rows.push(`${what} max[${i}] ${v} against ${b.max[i]}`); });
  };
  if (!live) return ['missing from the live file'];
  both('bounds', live.bounds, ref.bounds);
  for (const v of new Set([...Object.keys(ref.views || {}), ...Object.keys(live.views || {})])) {
    both(`view ${v}`, viewBox(live.views?.[v]), viewBox(ref.views?.[v]));
  }
  return rows;
}

if (!HAVE) {
  test('F10.2 · the hardware silhouettes', { skip: 'verify/t82/silhouettes-live.json or reference/hardware/silhouettes.json is not in the tree' }, () => {});
} else {
  const live = JSON.parse(readFileSync(LIVE_URL, 'utf8'));
  const ref = JSON.parse(readFileSync(REF_URL, 'utf8'));
  const liveById = new Map((live.entries || []).map((e) => [itemId(e), e]));

  test('F10.2 · the tolerance is the profile\'s number, and every item has one id', () => {
    assert.ok(Number.isFinite(TOL) && TOL > 0, 'profile.hardware.silhouetteToleranceMm');
    const ids = (ref.entries || []).map(itemId);
    assert.equal(new Set(ids).size, ids.length, 'the reference names every item once');
    assert.ok(ids.length > 0);
  });

  for (const e of ref.entries || []) {
    const id = itemId(e);
    if (!e.views || !Object.keys(e.views).length) {
      test(`F10.2 · ${id}: silhouette within the tolerance of the reference`, { skip: `no silhouette in the reference (${e.fallback ? `fallback ${e.fallback}` : 'no views'})` }, () => {});
      continue;
    }
    const rows = silhouetteProbe(liveById.get(id), e, TOL);
    test(`F10.2 · ${id}: silhouette within the tolerance of the reference`, rows.length
      ? { todo: `FINDING: ${rows.slice(0, 6).join('; ')}` } : {}, () => {
      assert.deepEqual(rows, []);
    });
  }
}
