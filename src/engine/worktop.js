// ─── THE WORKTOP (turn 30, CLAUDE.md F8) ────────────────────────────────────
//
// The owner: select two or more base cabinets and one worktop covers the run
// **"od ściany aż do paneli"** — from the wall right out to the end panels.
//
// ─── THREE OVERHANGS, AND EACH ONE IS A DIFFERENT SENTENCE ──────────────────
//
//   FRONT   20 mm proud of the door plane. A worktop that finished flush with
//           the doors would drip down them.
//   SIDES   10 mm PAST AN END PANEL — past the panel, not past the carcass.
//           A run that ends in an end panel is a run whose visible edge is the
//           panel's face, and the slab has to cover it and stand a little
//           proud. Where a run simply ends in air the same 10 mm is measured
//           off the carcass, which is the same rule with nothing in the way.
//   WALL    FLUSH. Nothing hangs over a wall; the scribe closes that side and
//           `paddedSpan` already knows where the panels are.
//
// ─── WHAT IT IS, IN THIS APP'S TERMS ────────────────────────────────────────
//
// A DESIGN-LAYER AUTO-PART, exactly like the end panels: it is a decision a
// person makes about a job, it is stored with the project, and **it reaches no
// hole and no fixture**. `computeCabinet()` neither knows nor asks about it, so
// every golden fixture is untouched by construction rather than by care.
//
// ─── THE THREE DECIDED NUMBERS ──────────────────────────────────────────────
//
// CLAUDE.md decides them so this turn does not have to: thickness **38 mm**
// (UK standard — 770 carcass + 100 legs + 38 lands on the 900 line), the
// material is the PROJECT's worktop decor by default, and a per-worktop
// override is a later chat-fix rather than tonight's problem. All three live in
// `profile.autoParts.worktop` and in the design record, so the day the owner
// wants 40 mm nothing here is edited.
//
// EXTENSIONS are drawable afterwards, in the same interaction family as an end
// panel edit: the record carries `extendLeft` / `extendRight` / `extendFront`
// and the geometry adds them on. Nothing is computed from them that a person
// has not typed.
//
// Pure functions and pure data. No React, no store, no three.js.

import { getUnitType } from './types.js';
import { paddedSpan, unitBase } from './runs.js';

/**
 * Does this kit take a worktop at all?
 *
 * The app already draws this line and draws it the other way round: a type
 * whose `supports.topInfill` is FALSE is one where *"what goes on top of a base
 * cabinet is a worktop, so there is no gap to the ceiling"* — the sentence
 * `components/RightPanel.jsx` has printed since turn 8. A TALL unit, a wardrobe
 * and a fridge housing all run up to a top infill instead, and a wall unit
 * hangs. So this is that existing distinction read forwards rather than a
 * second list that could disagree with it.
 */
export function takesWorktop(typeId) {
  const type = getUnitType(typeId);
  return Boolean(type && type.mount === 'floor' && type.supports?.topInfill === false);
}

/** The workshop's numbers, defensively read. */
export function worktopSpec(profile) {
  const W = profile?.autoParts?.worktop || {};
  const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
  return {
    thickness: num(W.thickness, 38),
    frontOverhang: num(W.frontOverhang, 20),
    sideOverhang: num(W.sideOverhang, 10),
    minUnits: num(W.minUnits, 2),
  };
}

/**
 * Can these cabinets take ONE worktop between them?
 *
 * The four things that break a RUN break a worktop too, and for the same
 * physical reason (`engine/runs.js buildRuns`): a different wall, a turned
 * unit, a different top height — one slab cannot lie on two heights — and a
 * gap, because a slab that bridges nothing is a slab hanging in air. This is
 * that test asked of a SELECTION rather than of the whole room, because the
 * gesture is "these ones".
 *
 * @returns {{ok:boolean, why:string|null}}
 */
export function worktopEligible(units, profile) {
  const spec = worktopSpec(profile);
  const list = units || [];
  if (list.length < spec.minUnits) {
    return { ok: false, why: `A worktop covers a run: select ${spec.minUnits} or more base cabinets.` };
  }
  if (!list.every((u) => takesWorktop(u.type))) {
    return { ok: false, why: 'A worktop lies on base cabinets — a wall unit has nothing to lie on.' };
  }
  const wall = list[0].position?.wall ?? 0;
  if (!list.every((u) => (u.position?.wall ?? 0) === wall)) {
    return { ok: false, why: 'These cabinets are on different walls — one slab cannot turn a corner yet.' };
  }
  if (!list.every((u) => !((Number(u.position?.rotation_deg) || 0) % 360))) {
    return { ok: false, why: 'A turned cabinet has no "along the wall" to share.' };
  }
  const top = (u) => Math.round((unitBase(u, profile) + (Number(u.params?.height) || 0)) * 10) / 10;
  if (!list.every((u) => top(u) === top(list[0]))) {
    return { ok: false, why: 'One slab cannot lie on two heights — level the run first.' };
  }
  return { ok: true, why: null };
}

/**
 * THE SLAB, in the wall's own frame.
 *
 * `x`/`w` run along the wall, `y`/`h` are height off the floor, `z`/`d` run out
 * from the wall — the same frame `paddedSpan` and the room view already use.
 *
 * @param {object} args
 *   units    the selected cabinets, in any order
 *   record   the design-layer worktop — its extensions and its decor
 *   profile
 * @returns {{x:number, y:number, z:number, w:number, h:number, d:number,
 *            depth:number, decor:string|null, wall:number, span:object}|null}
 */
export function worktopGeometry({ units, record = null, profile }) {
  const list = [...(units || [])];
  if (!list.length) return null;
  const spec = worktopSpec(profile);
  const ext = {
    left: Math.max(0, Number(record?.extendLeft) || 0),
    right: Math.max(0, Number(record?.extendRight) || 0),
    front: Math.max(0, Number(record?.extendFront) || 0),
  };

  // ALONG THE WALL: from the outermost padded edge — `paddedSpan` is what
  // already knows where an end panel stands — plus the side overhang. That is
  // "od ściany aż do paneli" in one line: the span reaches the panels and the
  // overhang steps 10 mm past them.
  const spans = list.map((u) => paddedSpan(u));
  const left = Math.min(...spans.map((s) => s.left)) - spec.sideOverhang - ext.left;
  const right = Math.max(...spans.map((s) => s.right)) + spec.sideOverhang + ext.right;

  // OUT FROM THE WALL: the deepest carcass, plus its door and the door's gap,
  // plus the front overhang. Flush at the wall — nothing hangs over a wall.
  const reach = (u) => {
    const depth = Number(u.params?.depth) || 0;
    const frontT = Number(u.params?.front_t) || 0;
    const gap = Number(profile?.doors?.gap) || 0;
    return depth + gap + frontT;
  };
  const depth = Math.max(...list.map(reach)) + spec.frontOverhang + ext.front;

  // AND HOW HIGH: on top of the carcasses, which all stand at one height —
  // `worktopEligible` is what guarantees that and says so when they do not.
  const top = unitBase(list[0], profile) + (Number(list[0].params?.height) || 0);

  return {
    wall: list[0].position?.wall ?? 0,
    x: left,
    w: right - left,
    y: top,
    h: spec.thickness,
    z: 0,
    d: depth,
    depth,
    thickness: spec.thickness,
    decor: record?.decor ?? null,
    overhang: { front: spec.frontOverhang, side: spec.sideOverhang, wall: 0 },
    extensions: ext,
    unitIds: list.map((u) => u.id),
  };
}

/**
 * Every worktop a project carries, resolved against the units that exist.
 *
 * A record naming a cabinet somebody has since deleted is DROPPED rather than
 * drawn over a hole in the run — the same rule a stale hinge assignment
 * follows.
 */
export function worktopsFor({ records = [], units = [], profile }) {
  const byId = new Map((units || []).map((u) => [u.id, u]));
  const out = [];
  for (const record of records || []) {
    const mine = (record?.unitIds || []).map((id) => byId.get(id)).filter(Boolean);
    if (mine.length < worktopSpec(profile).minUnits) continue;
    const geometry = worktopGeometry({ units: mine, record, profile });
    if (geometry) out.push({ ...record, geometry });
  }
  return out;
}
