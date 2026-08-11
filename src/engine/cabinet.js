// ─── Cabinet calculation engine ───
// params -> { derived, panels[], drills[], totals, csvLines[], warnings[] }
//
// Pure JavaScript. ZERO React imports, zero store imports, zero bare numbers in
// the formulas — every constant is read from the profile (CLAUDE.md rules 2/3).
//
// The maths is traced line-by-line from the production AutoLISP:
//   reference/lisp/SKYLON_COMMON.lsp          — puzzle joints, hinges, cups, shelves
//   reference/lisp/KIT_BUD_FULL.lsp           — kitchen base unit
//   reference/lisp/KIT_WARDROBE_FULL.lsp      — wardrobe (drawers, drawer panel, rail)
//   reference/lisp/KIT_BUDR_FULL.lsp          — 3-drawer base unit (ratio 4:3:2)
//   reference/lisp/KIT_WUD_FULL.lsp           — wall unit (hangers, door extend)
//   reference/lisp/KIT_BUDTALL_FULL.lsp       — tall unit
//   reference/lisp/KIT_LOW_CABINET_FULL.lsp   — low cabinet (rail)
//   reference/lisp/KIT_SINK.lsp               — sink base (holders, inset back)
//   reference/lisp/KIT_FRIDGE.lsp             — fridge housing (fixed panel, rails, spurs)
// and is locked down by fixtures/golden-*.json via test/engine.test.js.
//
// The kits are ~86 % the same code. This file is that shared core ONCE; what
// differs per kit is a flag in engine/types.js, never a second copy of the
// carcass arithmetic.

import { getCabinetProfile } from './profile.js';
import { getUnitType } from './types.js';
import { legCount, legLayout } from './legs.js';
import { partitionSpan, shelfCrossesPartition, widthZones } from './zones.js';
// Turn 21 (CLAUDE.md F12): the owner's door-width law, as pure geometry.
import { bayDoorPlan, bayDoorsAvailable, doorBays } from './doors.js';
import { areaM2, metres, roundTo, rtos } from './format.js';
import {
  sidePanelGeometry, topPanelGeometry, backPanelGeometry, socketPanelGeometry, rectGeometry,
  chamferedRectGeometry, tabCentres,
} from './puzzle.js';
import { resolveRunnerVariant, runnerPairSpec, syncRodFor } from './runners.js';
import { doorHingeAssignment, hingeSpecLabel, resolveDoorHinge } from './hinges.js';
import { endPanelDrop, endPanelHeightDefault } from './autoparts.js';
import { impliedLegHeight, maskDepthExtra, standsOnLegHeight } from './runs.js';
import {
  corniceOption, corniceOrder, corniceProjection, corniceRise, takesCornice,
} from './cornice.js';
import { partitionBackScrews, partitionBackSpec } from './partitionFixings.js';
// Turn 24 (CLAUDE.md F7): the owner's butt-joint set, given the consumer it
// was written for — a FIX shelf.
import { biscuitLayers, biscuitSets, markFromEnd } from './biscuits.js';
// Turn 24 (CLAUDE.md F3): G is a property of the PART, and this is the door.
import { partitionSlot, thicknessOf } from './thickness.js';

// ─── Hinge centres (SKYLON_COMMON calcHingePositions*) ───

export function hingeCentres(height, rule, profile) {
  const H = Number(height);
  const end = profile.hinges.endOffset;
  switch (rule.mode) {
    case 'base':
      return [end, H - rule.secondFromTop, H - end];
    case 'sink':
      // KIT_SINK L323: the top hinge drops 50 mm to clear the front holder.
      return [end, H - rule.secondFromTop, H - rule.topFromTop];
    case 'tall': {
      const inner = H < rule.sixHingeMinHeight ? rule.innerBelow : rule.innerAtOrAbove;
      const spacing = (H - 2 * end) / (inner + 1);
      const out = [end];
      for (let i = 1; i <= inner; i += 1) out.push(end + spacing * i);
      out.push(H - end);
      return out;
    }
    case 'low': {
      if (H < rule.twoHingeMaxHeight) return [end, H - end];
      if (H < rule.threeHingeMaxHeight) return [end, H / 2, H - end];
      const spacing = (H - 2 * end) / (rule.innerAtOrAbove + 1);
      const out = [end];
      for (let i = 1; i <= rule.innerAtOrAbove; i += 1) out.push(end + spacing * i);
      out.push(H - end);
      return out;
    }
    default:
      return [end, H - end];
  }
}

// ─── HOW MANY HINGES, AND WHERE (turn 17, CLAUDE.md F7) ─────────────────────
//
// `hingeCentres` above is the LISP's own maths and stays exactly what it is:
// how many hinges a door of this height, in this family, is drilled for. Two
// things now sit on top of it, and both are the workshop talking rather than
// the kit.
//
//   THE PROJECT STANDARD (F7.1). "Standard hinges: 2 / 3", default 3. On 2,
//   "each door loses ONE MIDDLE hinge: a 3-hinge door becomes 2, and a 6-hinge
//   door becomes 5 — one comes off, the outer ones never move." So it is not a
//   count and not a re-spacing: it removes exactly one of the INNER hinges and
//   leaves every other centre where the rule put it. WHICH inner one is the one
//   nearest the middle of the door, because that is the hinge a joiner takes off
//   — the ones near the ends are what stop a door bowing. With an even number of
//   inner hinges the two candidates are equidistant and the LOWER wins, which is
//   arbitrary but written down, and it makes the answer the same every time.
//
//   THE DOOR'S OWN SET (F7.2). A joiner may add one, take one off or move one,
//   exactly as he moves a shelf. An explicit list REPLACES the rule — it is what
//   somebody said out loud, and a rule that argued with it would be the app
//   overruling the bench. It is the CABINET's list, because a cabinet's doors
//   are drilled as a set and the carcass carries one hinge column per hinged
//   side (BLOCKERS: per-leaf differences were not specified).
//
// Everything downstream follows on its own — the drilling in the export, the
// hinge bodies in 3D and the BOM's hardware count all count this list.

/** The standard a project is working to: 2 or 3, defaulting to the profile's. */
export function hingeStandard(value, profile) {
  const n = Math.trunc(Number(value));
  const allowed = profile?.hinges?.standardOptions || [2, 3];
  return allowed.includes(n) ? n : (Number(profile?.hinges?.standard) || 3);
}

/** The index of the inner hinge nearest the middle of the door — the one that goes. */
export function middleHingeIndex(centres) {
  if (!Array.isArray(centres) || centres.length < 3) return -1;
  const mid = (centres[0] + centres[centres.length - 1]) / 2;
  let best = 1;
  for (let i = 2; i < centres.length - 1; i += 1) {
    // Strictly nearer, so a tie leaves the LOWER index standing as the winner.
    if (Math.abs(centres[i] - mid) < Math.abs(centres[best] - mid)) best = i;
  }
  return best;
}

/**
 * The hinge rows of one cabinet, in millimetres up the carcass.
 *
 * @param {object} args
 *   height    the carcass height
 *   rule      profile.hinges.rules[type.hingeRule]
 *   standard  2 or 3 (the project's, F7.1)
 *   own       an explicit list the joiner has edited (F7.2), or null
 * @param {object} profile
 */
export function hingeRows({ height, rule, standard = 3, own = null }, profile) {
  if (Array.isArray(own) && own.length) {
    const H = Number(height) || 0;
    return [...own]
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v >= 0 && v <= H)
      .sort((a, b) => a - b);
  }
  const centres = hingeCentres(height, rule, profile);
  if (hingeStandard(standard, profile) !== 2) return centres;
  const drop = middleHingeIndex(centres);
  return drop < 0 ? centres : centres.filter((_, i) => i !== drop);
}

/** Door count from the width threshold: 1 while (W − 4) ≤ 700 → 2 from W = 705 (704 → 1 door). */
export function doorCountFor(width, profile) {
  const d = profile.doors;
  return (Number(width) - d.widthDeduction) <= d.singleDoorMaxWidth ? 1 : 2;
}

/** Largest standard runner length that fits the usable depth, or null. */
export function snapDrawerDepth(usableDepth, steps) {
  let best = null;
  for (const step of steps) if (step <= usableDepth) best = step;
  return best;
}

/** AutoLISP (fix (+ x 0.5)) — round half up, truncating. */
function lispRound(value) {
  return Math.trunc(Number(value) + 0.5);
}

/**
 * The UNDERSIDE of an appliance shelf, or null where the kit has none
 * (turn 18, CLAUDE.md F5.4).
 *
 * One line, in one place, because two things need it and they are 300 lines
 * apart: the drawer box has to stop under it, and the side panels have to stop
 * cutting back tabs above the back that reaches it.
 */
function ovenShelfY(type, profile, H, G) {
  if (type?.appliance !== 'oven') return null;
  return H - profile.ovenUnit.shelfFromTop - G;
}

/**
 * The BUDR front stack: heights split by the profile ratio (4:3:2) over the
 * height left once every gap is taken out. KIT_BUDR_FULL L616-619.
 *
 * ─── Turn 12 (CLAUDE.md F3.2): THE RATIO IS THE VARIANT ───
 * `ratio` may be handed in — [1,1] for the 2× unit, [1,1,1,1] for the 4× — and
 * everything downstream of this function already loops over the heights it
 * returns, which is why two more drawer units cost the engine one argument.
 * Left out, it is the kit's own 4:3:2 and the answer is bit-for-bit what it was.
 *
 * `exact` is the OTHER half of it, and it is a variant's property rather than a
 * behaviour of this function, for a reason worth writing down.
 *
 * The kit says the stack fills the carcass — "stack top = H − 3"
 * (fixtures/golden-budr.json), which is the same statement as
 * sum(heights) === available. Rounding each front independently does not always
 * deliver that: four equal fronts over an odd available height each round UP by
 * a half and the stack finishes 2 mm proud, and even 4:3:2 drifts by 1 mm at
 * some heights (H = 602 is one). A new variant must not ship with that, so the
 * variants carry `exact: true` and the last front takes up whatever the
 * rounding left.
 *
 * KIT_BUDR_FULL's own 4:3:2 carries `exact: false` and is left exactly as it is.
 * Not because the drift is right — it is BLOCKERS #64 — but because rule 7 is
 * absolute: the CNC export is byte-identical for everything that exists today,
 * and a 1 mm improvement nobody asked for on a height somebody may already have
 * cut is still a change to what the machine does.
 */
export function budrFrontHeights(height, profile, ratio = null, exact = false) {
  const B = profile.baseDrawerUnit;
  const split = Array.isArray(ratio) && ratio.length ? ratio : B.ratio;
  const total = split.reduce((s, r) => s + r, 0);
  const available = Number(height) - split.length * B.gap;
  const heights = split.map((r) => lispRound((available * r) / total));
  if (!exact) return heights;
  const drift = available - heights.reduce((s, h) => s + h, 0);
  if (drift) heights[heights.length - 1] += drift;
  return heights;
}

// ─── DRAWER HEIGHTS, ONCE THE FRONTS ARE OFF (turn 17, CLAUDE.md F8) ────────

/**
 * The shortest a drawer front may be (F8.3).
 *
 * The owner's rule, and it is an ENGINE function with its own test rather than
 * a number typed into a control, because the UI is not allowed to be the only
 * thing that knows it: a height that arrives from a template, an import or an
 * old project has to be refused in the same place a typed one is.
 */
export function minDrawerFrontHeight(profile) {
  const B = profile?.baseDrawerUnit || {};
  return (Number(B.runnerScrewFromBase) || 0) + (Number(B.clearanceBelowRunner) || 0);
}

/** …and the clamp itself. Never below the rule, never above the carcass. */
export function clampDrawerFrontHeight(mm, { profile, max = Infinity }) {
  const floor = minDrawerFrontHeight(profile);
  const n = Number(mm);
  if (!Number.isFinite(n)) return floor;
  return Math.min(Math.max(n, floor), Math.max(floor, max));
}

/**
 * A BUDR stack where the joiner has set some of the heights himself (F8.2).
 *
 * The rule is the same one a shelf follows: what somebody SAID wins, and what
 * nobody said follows the kit. So an edited drawer takes its height exactly,
 * and the drawers nobody has touched share what is left in the variant's own
 * ratio — which is what keeps the stack filling the face instead of leaving a
 * slot at the top of the cabinet.
 *
 * With NOTHING edited it returns `budrFrontHeights` untouched, which is why
 * BLOCKERS #64 (the kit's 4:3:2 rounding drift) stays frozen exactly as
 * CLAUDE.md F8.4 requires: this edits a UNIT and never the kit's defaults.
 */
export function budrHeightsWithOwn(height, profile, split, own, warnings = []) {
  const B = profile.baseDrawerUnit;
  const base = budrFrontHeights(height, profile, split.ratio, split.exact);
  const list = Array.isArray(own) ? own : null;
  const edited = base.map((_, i) => Number.isFinite(Number(list?.[i])) && Number(list[i]) > 0);
  if (!edited.some(Boolean)) return base;

  const available = Number(height) - base.length * B.gap;
  const floor = minDrawerFrontHeight(profile);
  let short = false;
  const out = base.map((h, i) => {
    if (!edited[i]) return h;
    const want = Number(list[i]);
    if (want < floor) short = true;
    return Math.max(floor, want);
  });

  const freeIdx = out.map((_, i) => i).filter((i) => !edited[i]);
  const takenByEdited = out.reduce((s, h, i) => s + (edited[i] ? h : 0), 0);
  const left = available - takenByEdited;

  if (!freeIdx.length) {
    if (short) {
      warnings.push({
        code: 'DRAWER_HEIGHT_CLAMPED',
        message: `A drawer may be no shorter than ${floor} mm — ${B.runnerScrewFromBase} mm to the runner screws plus ${B.clearanceBelowRunner} mm under them.`,
      });
    }
    // Every drawer was set by hand. The stack is what he asked for; say so if
    // it does not add up rather than silently moving one of his numbers.
    if (Math.abs(left) > 0.5) {
      warnings.push({
        code: 'DRAWER_STACK_MISMATCH',
        message: `The drawer heights add up to ${roundTo(takenByEdited, 1)} mm in a ${roundTo(available, 1)} mm face.`,
      });
    }
    return out;
  }

  const ratio = split.ratio;
  const freeTotal = freeIdx.reduce((s, i) => s + (ratio[i] ?? 1), 0) || freeIdx.length;
  for (const i of freeIdx) {
    const want = lispRound((left * (ratio[i] ?? 1)) / freeTotal);
    if (want < floor) short = true;
    out[i] = Math.max(floor, want);
  }
  // The last untouched drawer absorbs the rounding, so the stack finishes level
  // with the carcass — the kit's own "stack top = H − 3".
  const last = freeIdx[freeIdx.length - 1];
  const drift = available - out.reduce((s, h) => s + h, 0);
  if (drift && out[last] + drift >= floor) out[last] += drift;

  if (short) {
    warnings.push({
      code: 'DRAWER_HEIGHT_CLAMPED',
      message: `A drawer may be no shorter than ${floor} mm — ${B.runnerScrewFromBase} mm to the runner screws plus ${B.clearanceBelowRunner} mm under them.`,
    });
  }
  return out;
}

/**
 * How a unit type's drawer stack is split (turn 12, CLAUDE.md F3.2).
 *
 * A type names a VARIANT (`drawerVariant`); the variant carries the ratio and
 * lives in profile.baseDrawerUnit.variants, because it is a number and rule 2
 * says where numbers live. A type that names none gets the kit's own.
 *
 * @returns {{ratio:number[], exact:boolean}}
 */
export function drawerSplitFor(type, profile) {
  const B = profile.baseDrawerUnit;
  // Turn 17 (CLAUDE.md F10): a kit may name its own split in the profile rather
  // than pick one of the drawer unit's variants — the oven base has ONE drawer
  // under its shelf, which is not a variant of the drawer unit and should not
  // appear in that group's flyout. The key is data, exactly like `defaultsKey`.
  if (type?.drawerRatioKey) {
    const own = readPath(profile, type.drawerRatioKey);
    if (Array.isArray(own) && own.length) return { ratio: own, exact: true };
  }
  const variant = type?.drawerVariant
    ? (B.variants || []).find((v) => v.id === type.drawerVariant)
    : null;
  return {
    ratio: variant?.ratio || B.ratio,
    exact: Boolean(variant?.exact),
  };
}

// ─── Parameter normalisation ───

function normalizeParams(raw, profile) {
  const p = raw || {};
  const type = getUnitType(p.type);
  const G = Number(p.board_t) || profile.board.thickness;
  const frontT = Number(p.front_t) || profile.front.thickness;
  // ─── TURN 24 (CLAUDE.md F3.2): G IS A PROPERTY OF THE PART ────────────────
  //
  // The owner's law: the manufacturer never tells you the board is really 18.5
  // — the CALIPER does — and the engine must compute from the caliper. So a
  // project hands down SIX measured numbers rather than one nominal, and every
  // law that mixes two parts takes the RIGHT side's.
  //
  // `board_t` and `front_t` are still the doors carcass 1 and front 1 come in
  // through, because they are what every kit call, every golden fixture and
  // every saved project already speaks — the slots simply say the same thing
  // more precisely, and a call that passes none of them resolves to exactly
  // these two. That is what keeps this phase's fingerprint delta at ZERO.
  //
  // The DRAWER BOX is the one slot with a default of its own: a box has been
  // cut from `wardrobe.drawers.boxSideThickness` since turn 1 while its
  // GEOMETRY was worked out from `G`, which is the very disagreement F3.2 is
  // about. One number now, and with the defaults it is the same 18.
  const said = p.thickness_slots && typeof p.thickness_slots === 'object' ? p.thickness_slots : {};
  const slotT = (id, fallback) => (Number(said[id]) > 0 ? Number(said[id]) : fallback);
  const thicknesses = {
    carcass1: slotT('carcass1', G),
    carcass2: slotT('carcass2', G),
    carcass3: slotT('carcass3', G),
    front1: slotT('front1', frontT),
    front2: slotT('front2', frontT),
    box: slotT('box', Number(profile.wardrobe?.drawers?.boxSideThickness) || G),
  };
  // CARCASS 1 *IS* G, and FRONT 1 *IS* the front board. Not "a slot beside
  // them": the whole point of F3.2 is that there is one number per board and
  // every law reads the right one, so the engine's own `G` is resolved through
  // the slots rather than left as a second answer that could disagree.
  const carcassG = thicknesses.carcass1;
  const frontBoardT = thicknesses.front1;
  const warnings = [];

  let height = Number(p.height) || 0;
  const minHeight = Number(readPath(profile, type.minHeightKey)) || 0;
  if (minHeight && height < minHeight) {
    warnings.push({ code: 'MIN_HEIGHT', message: `${type.label} height raised to the ${minHeight} mm minimum.` });
    height = minHeight;
  }

  // Interior items may arrive as plain counts (fixtures, quick presets) or as a
  // positional sections[].items[] model from the editor (SPEC section 5).
  const items = collectItems(p);
  const shelvesFromItems = items.filter((i) => i.kind === 'shelf');
  const drawersFromItems = items.filter((i) => i.kind === 'drawer');
  const hangerFromItems = items.find((i) => i.kind === 'hanger');

  const shelves = type.supports.shelves
    ? (items.length ? shelvesFromItems.length : clampInt(p.shelves, 0, 10))
    : 0;

  // A drawer count that is not a number at all (a word, an object, an array)
  // used to fall through clampInt as a silent zero. That is a cut list missing
  // parts with nothing to show for it — it is a warning now (turn-2 audit).
  // A blank field and an explicit "none" stay silent: they DO mean no drawers.
  const drawerCountRaw = p.drawers;
  const drawerCountBad = !items.length && !isDrawerCountUsable(drawerCountRaw);
  if (drawerCountBad) {
    warnings.push({
      code: 'DRAWERS_INVALID',
      message: `Drawer count "${describeValue(drawerCountRaw)}" is not a number — no drawers were generated.`,
    });
  }

  // Which split this kit's fronts are cut to. Turn 12: a drawer unit's VARIANT
  // is a ratio and nothing else (CLAUDE.md F3.2), so the count follows from it.
  const budrSplit = drawerSplitFor(type, profile);

  let drawers = 0;
  if (type.drawerStyle === 'budr') {
    // A BUDR-style unit IS its drawers: the ratio is the stack, and the LISP
    // kit has no "how many" question to ask.
    drawers = budrSplit.ratio.length;
  } else if (type.supports.drawers && !drawerCountBad) {
    drawers = items.length
      ? drawersFromItems.length
      : clampInt(drawerCountRaw, 0, profile.wardrobe.drawers.maxCount);
  }

  // Drawers are stacked bottom-up, so drawer i's height has to belong to the
  // same physical drawer as runner row i and drawer front i. `index` is the
  // authority when the editor supplies it; otherwise array order stands.
  const drawerItems = [...drawersFromItems].sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0));
  // Turn 17 (CLAUDE.md F10): an OVEN's drawer fills the zone UNDER its shelf,
  // not the carcass — the shelf sits `shelfFromTop` from the top of the
  // cabinet, and what is left below it is the stack.
  //
  // ─── The owner's own arithmetic, and why the two boards came off ───
  // "szafka 770 − 3 mm gap − 595 oven — to ile zostaje?" 172, and 172 is the
  // FRONT. This line used to take another 2 × G off it, which is the size of
  // the OPENING — the carcass bottom and the shelf. That is right for a drawer
  // BOX, which has to fit between two boards, and wrong for a FRONT, which
  // covers them: an inset front on a base unit is `H − gap`, not `H − gap −
  // 2G`, and an appliance unit does not get to be the exception.
  //
  // `shelfFromTop` is 598 = the 3 mm gap + the 595 mm oven, and the splitter
  // below takes the gap off every stack it is given — so what goes IN is the
  // face less the appliance, `height − ovenHeight`, and the gap comes off once,
  // in the same place it comes off for every other unit in the app.
  //
  // ─── TURN 18 (CLAUDE.md F5.4): AND THE GAP BELOW THE APPLIANCE ───────────
  // The owner's review: "szczelina 3 mm jak wszystkie nasze drzwi." The oven's
  // FACE behaves like a front in the run, and two fronts never touch — so the
  // drawer front below it loses a gap to the appliance as well as the gap the
  // splitter already takes above it. `H − gap − ovenHeight − gap`: 169 on a 770
  // carcass, where turn 17 gave 172 and the drawer front sat against the oven.
  //
  // It is the DRAWER STACK's own gap (`baseDrawerUnit.gap`), because that is
  // what this is — the space between two fronts of one cabinet — and it is the
  // same 3 mm `doors.gap` gives every door in the run.
  const stackHeight = type.appliance === 'oven'
    ? Math.max(0, height - profile.baseDrawerUnit.gap - profile.ovenUnit.ovenHeight)
    : height;
  const drawerHeights = type.drawerStyle === 'budr'
    // Turn 17 (CLAUDE.md F8.2): the drawers the joiner has set himself, and the
    // kit's own ratio for the rest. Nothing set = `budrFrontHeights` unchanged.
    ? budrHeightsWithOwn(stackHeight, profile, budrSplit, p.drawer_heights, warnings)
    : resolveDrawerHeights(p, drawers, drawerItems, profile, warnings);
  const rail = type.supports.rail ? (items.length ? Boolean(hangerFromItems) : Boolean(p.rail)) : false;

  // Shelves are ordered bottom-up so panel N, drill row N and item N always
  // describe the same physical shelf after a drag reorders them.
  const shelfItems = [...shelvesFromItems].sort((a, b) => (Number(a.pos_mm) || 0) - (Number(b.pos_mm) || 0));
  const shelfPositions = shelfItems
    .map((i) => Number(i.pos_mm))
    .filter((v) => Number.isFinite(v));

  // doors: undefined → derive from the width threshold; { count: 0 } / false → none yet
  let doorCount;
  let hinge = (p.hinge || profile.doors.defaultHinge).toUpperCase() === 'R' ? 'R' : 'L';
  if (!type.supports.doors) {
    doorCount = 0;                                   // BUDR: the drawer fronts ARE the face
  } else if (p.doors === false || p.doors === 0) {
    doorCount = 0;
  } else if (p.doors && typeof p.doors === 'object') {
    doorCount = Number.isFinite(Number(p.doors.count)) ? Number(p.doors.count) : doorCountFor(p.width, profile);
    if (p.doors.hinge) hinge = String(p.doors.hinge).toUpperCase() === 'R' ? 'R' : 'L';
  } else {
    doorCount = doorCountFor(p.width, profile);
  }

  // Wall units may run their fronts below the carcass (handleless grab edge).
  // `true` means "the standard extend"; a number overrides it.
  let doorExtend = 0;
  if (type.doorExtend) {
    if (p.door_extend === true) doorExtend = profile.wallUnit.doorExtend;
    else if (Number.isFinite(Number(p.door_extend)) && Number(p.door_extend) > 0) doorExtend = Number(p.door_extend);
  }

  const railDefault = readPath(profile, `${type.defaultsKey}.railOffset`) ?? profile.wardrobe.defaults.railOffset;

  return {
    type,
    width: Number(p.width) || 0,
    height,
    depth: Number(p.depth) || 0,
    G: carcassG,
    frontT: frontBoardT,
    // Turn 24 (CLAUDE.md F3.2): the six measured slots, resolved once. Read
    // through `thicknessOf(part, cfg.thicknesses)` — the ONE door — so that a
    // law that needs the other side's board asks for it by name.
    thicknesses,
    GB: thicknesses.box,
    frontType: p.front_type || profile.front.defaultType,
    unitNum: p.unit_num == null ? '01' : String(p.unit_num),
    hinge,
    doorCount,
    doorExtend,
    // ─── Turn 17 (CLAUDE.md F7) ───
    // The project's standard (2 or 3) and, above it, this cabinet's own hinge
    // rows if a joiner has edited them. Both are INPUTS in the design layer's
    // own manner: nothing said means the kit's own maths, so every golden
    // fixture and every bare `computeCabinet()` is untouched.
    hingeStandard: p.hinge_standard,
    hingeRows: Array.isArray(p.hinge_rows) && p.hinge_rows.length ? p.hinge_rows : null,
    // ─── Turn 19 (CLAUDE.md F1): WHICH HINGE, NOT HOW MANY ──────────────────
    // The project's finish and system, and any per-door exception a joiner has
    // assigned — design-layer inputs travelling exactly as the hinge standard
    // and the runner variant do. NONE of them reaches a hole: the default hinge
    // IS today's drilling, and these decide what is bought and what is drawn.
    // Left out — a bare kit call, every golden fixture — the engine says
    // nothing about the article and drills what the AutoLISP drills.
    hingeFinish: p.project_hinge_finish ?? null,
    hingeSystemLabel: p.project_hinge_system_label ?? null,
    doorHinges: p.door_hinges && typeof p.door_hinges === 'object' ? p.door_hinges : null,
    shelves,
    shelfItems,
    shelfPositions,
    drawers,
    drawerItems,
    // ─── Turn 17 (CLAUDE.md F8.1): THE FRONTS COME OFF ──────────────────────
    // The exact mirror of turn 15's "Remove doors", on the kit whose fronts ARE
    // its face: `false` takes them off so the boxes can be worked on, and the
    // carcass, the runners and the boxes are untouched. Anything else — a unit
    // that has never heard of this — keeps its fronts, which is what every
    // fixture and every saved project is.
    drawerFronts: p.drawer_fronts !== false,
    drawerHeights,
    rail,
    railOffset: Number(p.rail_offset ?? railDefault),
    fridgeH: Number(p.fridge_h ?? profile.fridgeUnit.defaults.fridgeH),
    mountHeight: Number(p.mount_height ?? profile.wallUnit.defaults.mountHeight),
    // Toe kick, per unit (turn 5, BACKLOG #29). The project sets it in Design
    // Settings and it arrives here as a parameter, so the plinth, the legs and
    // the floor drop all follow one number instead of three copies of it. Left
    // unset it is the profile's, which is what a bare computeCabinet() gets.
    legHeight: legHeightOf(p, type, profile),
    items,
    warnings,
  };
}

/**
 * Is this drawer count something the engine can act on?
 * A number, a numeric string, or one of the ways of saying "none". An array or
 * an object is NOT usable even when Number() happens to coerce it ([2] → 2):
 * the caller meant something the engine does not model, and turning that into
 * a silent drawer count is how a stack goes missing from a cut list.
 */
function isDrawerCountUsable(v) {
  if (v == null || v === false || v === 0) return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string') return v.trim() === '' || Number.isFinite(Number(v));
  return false;
}

/**
 * How tall this unit stands on its legs. The profile's leg height for its
 * family unless the unit carries its own (the project's toe kick), and always
 * 0 for a type that stands on nothing.
 */
function legHeightOf(p, type, profile) {
  // LEGS, and only legs: a type that stands on none has none to be this tall.
  // How high it STANDS is a different question and `engine/runs.js
  // impliedLegHeight` is the one answer to it (turn 22, CLAUDE.md F4).
  if (!type.legs) return 0;
  return impliedLegHeight(p, type, profile);
}

/** Resolve a dotted profile path, tolerating a missing key. */
function readPath(profile, path) {
  if (!path) return undefined;
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), profile);
}

function describeValue(v) {
  if (Array.isArray(v)) return `[${v.join(', ')}]`;
  if (v && typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/**
 * One height per drawer, bottom-up.
 *
 * Sources, in order: the drawer item's own `height_mm` (the editor), a
 * `drawer_heights` array on the params (fixtures and presets), then the
 * profile default. Every drawer therefore HAS a height, and a stack where
 * nobody set one is exactly the uniform stack the golden fixtures describe.
 */
function resolveDrawerHeights(p, count, drawerItems, profile, warnings) {
  const DR = profile.wardrobe.drawers;
  const fromParams = Array.isArray(p.drawer_heights) ? p.drawer_heights : null;
  const out = [];
  let clamped = false;
  for (let i = 0; i < count; i += 1) {
    const raw = Number(drawerItems[i]?.height_mm ?? fromParams?.[i]);
    let h = Number.isFinite(raw) && raw > 0 ? raw : DR.frontHeight;
    if (h < DR.minFrontHeight || h > DR.maxFrontHeight) {
      h = Math.min(Math.max(h, DR.minFrontHeight), DR.maxFrontHeight);
      clamped = true;
    }
    out.push(h);
  }
  if (clamped) {
    warnings.push({
      code: 'DRAWER_HEIGHT_CLAMPED',
      message: `Drawer heights must be between ${DR.minFrontHeight} and ${DR.maxFrontHeight} mm — out-of-range values were pulled back in.`,
    });
  }
  return out;
}

function collectItems(p) {
  if (Array.isArray(p.items)) return p.items;
  if (Array.isArray(p.sections)) return p.sections.flatMap((s) => s.items || []);
  return [];
}

function clampInt(value, min, max) {
  const n = Math.trunc(Number(value) || 0);
  return Math.min(Math.max(n, min), max);
}

/**
 * A plinth with the appliance opening cut out of it (turn 17, CLAUDE.md F9).
 *
 * The notch runs from `cutFromTop` below the plinth's top edge down through its
 * bottom edge, across the appliance's own width — so what is left is a 20 mm
 * strip carrying the two ends of the piece.
 *
 * Coordinates are the plinth's own cut frame (origin bottom-left, y up), and
 * the notch is CLAMPED to it: an owner plinth that runs past this unit on both
 * sides gets the opening where the appliance is, and a notch that would reach
 * an end of the board simply stops there.
 *
 * @param {number} w        the plinth's own length
 * @param {number} h        its height
 * @param {number} at       where the appliance starts, in the plinth's frame
 * @param {number} span     how wide the appliance is
 * @param {number} cutFromTop  the strip left at the top
 */
export function notchedPlinth(w, h, at, span, cutFromTop) {
  const x0 = Math.max(0, Math.min(w, at));
  const x1 = Math.max(0, Math.min(w, at + span));
  const top = h - cutFromTop;
  if (!(x1 - x0 > 0) || !(top > 0)) return rectGeometry(w, h);
  const points = [[0, 0], [x0, 0], [x0, top], [x1, top], [x1, 0], [w, 0], [w, h], [0, h]];
  // A notch that reaches an END of the board leaves the corner point repeated,
  // and a repeated vertex is a zero-length edge — which a triangulator is
  // entitled to refuse (3d/panelSolid.js says so about the tabs). Drop them.
  const outline = points.filter(([x, y], i) => {
    const prev = points[(i - 1 + points.length) % points.length];
    return Math.abs(prev[0] - x) > 1e-9 || Math.abs(prev[1] - y) > 1e-9;
  });
  return { outline, pockets: [], holes: [], layer: 'OUTLINE' };
}

// ─── Panel record helper ───

/**
 * Is this piece a FINISHED surface — one the sprayer sees (BACKLOG #35)?
 *
 * Decided on the ROLE, never on a list of panel ids: a kit that adds a part
 * nobody thought of gets the right answer for free, and a preset built on this
 * flag cannot go stale the way "carcass only = these seven ids" did.
 *
 * Exposed (sprayed / finished): doors and drawer fronts, the scribe fillers and
 * top infill, the plinth, and the end panels that mask a run. All of them are
 * seen from the room.
 *
 * Not exposed: sides, top, bottom, back, holders, spurs, shelves, partitions
 * and rail partitions, the drawer panel and its fillers, and every part of a
 * drawer box. They live inside a carcass or behind a door — the workshop cuts
 * them from finished board and they never reach the spray booth.
 */
const FINISH_EXPOSED_ROLES = new Set(['front', 'infill', 'plinth', 'end_panel', 'mask']);

export function isFinishExposed(role) {
  return FINISH_EXPOSED_ROLES.has(role);
}

/**
 * Is this piece cut from the FRONT material (turn 6, CLAUDE.md F3/F4)?
 *
 * An end panel and an infill are not carcass board. They stand in the room
 * beside the doors, in the same plane as the doors, and a workshop cuts and
 * sprays them out of the same sheet — CLAUDE.md says so for both, in as many
 * words. Before turn 6 they were `board`, which meant a run with two end panels
 * and a set of fillers ordered a sheet of carcass material nobody was going to
 * use and under-ordered the front material.
 *
 * ─── TURN 11 (CLAUDE.md F5.4): THE PLINTH JOINS THEM ───
 * Turn 6 left the plinth out of this set, on the grounds that it is sprayed MDF
 * from the board stack. Piotr's verdict is the opposite and it is his workshop:
 * a toe kick stands in the room under the doors, in the plane the eye reads as
 * the front of the run, and it is finished WITH the doors — spray included. So
 * it is front material, through the ordinary pipeline, which means the BOM says
 * so, the spray schedule counts it and the 3D view paints it without a special
 * case anywhere.
 */
// Turn 14 (CLAUDE.md F5.2) adds `mask`: the panel under a run of wall units is
// the plinth's twin at the other end of the kitchen — it stands in the room,
// under the doors, in the plane the eye reads as the front of the run — so it
// goes through the FRONT pipeline exactly as the plinth was given in turn 11.
// FLAGGED FOR THE OWNER: this is the assumption, and it is one line to change.
const FRONT_MATERIAL_ROLES = new Set(['front', 'end_panel', 'infill', 'plinth', 'mask']);

export function wearsFrontMaterial(role) {
  return FRONT_MATERIAL_ROLES.has(role);
}

// ─── Shelves v2 (turn 8, CLAUDE.md F4) ───

/**
 * What KIND of shelf this is.
 *
 * `adjustable` — on ⌀7.5 pins, in a column of holes. The LISP's only kind, and
 *                still the default: a shelf nobody has said anything about is a
 *                shelf you can move.
 * `fixed`      — SCREWED, three ⌀3 screws through each carcass side into the
 *                shelf's own edge, on its centre line. It does not move and it
 *                is not drilled for pins.
 * `pullout`    — a shelf on runners. Turn 4's option, carried unchanged.
 *
 * Turn 7 and earlier used `fixed` as the value nobody chose, meaning nothing
 * more than "a shelf". It cannot go on meaning that now that it means screwed,
 * so stored projects are migrated on the way in (stores/projectStore.js).
 */
export const SHELF_VARIANTS = ['adjustable', 'fixed', 'pullout'];

export function shelfVariant(item) {
  const v = String(item?.variant ?? '');
  return SHELF_VARIANTS.includes(v) ? v : 'adjustable';
}

/**
 * Does this shelf stay where it is?
 *
 * Two different reasons, one answer. A FIXED shelf is screwed in, so it cannot
 * move — that is a fact about the joinery. `updown_locked` is a joiner saying
 * "this one stays here" about a shelf that is otherwise adjustable: a shelf
 * carrying an oven, a shelf a run of cable is stapled to. Both come out as the
 * same drilling and the same refusal to be dragged, which is why they are one
 * function and not two.
 */
export function isShelfLocked(item) {
  return shelfVariant(item) === 'fixed' || item?.updown_locked === true;
}

/**
 * ─── How thick THIS shelf is (turn 9, CLAUDE.md F4) ───
 *
 * A cabinet is built out of one board and then a joiner says "that one carries
 * the microwave, make it 25". Turn 8 had no way to say it: a shelf was the
 * carcass thickness, full stop, and the answer was a second cabinet.
 *
 * It is an INPUT, not a formula: the piece is cut, edged, drilled and laid out
 * by exactly the arithmetic every other shelf goes through, with a different
 * number in it. A shelf that says nothing is the carcass board, which is what a
 * bare `computeCabinet()` and every golden fixture get.
 *
 * `> 0` and not `!= null`: a zero-thickness shelf is not a thin shelf, it is a
 * missing one, and a cut list is not the place to find that out.
 */
export function shelfThickness(item, boardT) {
  const own = Number(item?.thickness_mm);
  return Number.isFinite(own) && own > 0 ? own : boardT;
}

/**
 * What THIS shelf is made of, when somebody has said (turn 9, CLAUDE.md F4).
 *
 * A label and an id, exactly as the hanger rail has carried since turn 4: the
 * label is what the cut list prints and what a workshop orders against, the id
 * is what a price is looked up by. Null for a shelf nobody has overridden —
 * which then wears the project's carcass finish like every other piece of board
 * (engine/bom.js `partMaterialLabel`).
 */
export function shelfMaterial(item) {
  const label = item?.material_label;
  const id = item?.material_id;
  // Turn 16 (CLAUDE.md F1.3): the palette KEY travels with the pair. It is what
  // tells Front 1 from Front 2 when both are faced in the same board — the id
  // and the label cannot, because both types would answer with the same two
  // strings. A shelf saved before this turn carries no key and resolves on the
  // pair exactly as it did (engine/materials.js `elementMaterialOverride`).
  const key = item?.material_key;
  if (!label && !id && !key) return null;
  return {
    material_id: id || null,
    material_label: label ? String(label) : null,
    material_key: key ? String(key) : null,
  };
}

function panel({ id, part, role, w, h, thickness, edgeCode, edgeLen, box, cnc, meta }) {
  return {
    id,
    part,
    role,
    material_role: wearsFrontMaterial(role) ? 'front' : 'board',
    finish_exposed: isFinishExposed(role),
    w: roundTo(w, 4),
    h: roundTo(h, 4),
    qty: 1,
    thickness,
    edging: { code: edgeCode, len_m: roundTo(edgeLen, 6) },
    area_m2: areaM2(w, h),
    box: box || null,
    cnc: cnc || null,
    ...(meta ? { meta } : {}),
  };
}

/**
 * A run of ONE: a unit closing itself, which is what a lone cabinet is and what
 * a bare computeCabinet() call gets. Same geometry as a run of six, both ends
 * treated as "wall" — a single unit with nothing beside it has nothing to turn
 * a corner around, and the store overrides this the moment there is a room to
 * ask about (engine/runs.js).
 */
function soloRun(faceH, width, autoParts) {
  if (!(faceH >= autoParts.topInfill.minHeight)) return null;
  return {
    role: 'owner',
    offset: 0,
    length: width,
    faceH,
    shelfDepth: autoParts.topInfill.shelfDepth,
    thickness: autoParts.topInfill.thickness,
    ends: { left: 'wall', right: 'wall' },
    returns: { left: null, right: null },
    unitIds: null,
  };
}

/** A plain part with straight machining grooves (drawer box sides). */
function pocketedRect(w, h, pockets) {
  const geom = rectGeometry(w, h);
  geom.pockets = pockets;
  return geom;
}

// ─── Main entry point ───

/**
 * @param {object} params  unit parameters (SPEC section 5 `params` sketch)
 * @param {object} [profileOverride]  workshop profile; defaults to the active one
 * @returns {{derived:object, panels:object[], drills:object[], drillSummary:object,
 *            totals:object, csvLines:string[], warnings:object[], assemblies:object}}
 */
export function computeCabinet(params, profileOverride) {
  const profile = profileOverride || getCabinetProfile();
  const P = profile;
  const cfg = normalizeParams(params, P);
  const warnings = [...cfg.warnings];

  const { width: W, height: H, depth: D, G, GB, frontT, type, unitNum } = cfg;
  const C = P.carcass;
  const codes = P.csv.codes;
  const pz = P.puzzle;
  const hasTopPanel = type.carcass.top === 'panel';
  const backStyle = type.carcass.back;

  // ── Carcass geometry ───────────────────────────────────────────────────────
  const internalWidth = W - C.topWidthBoards * G;
  const internalDepth = D - C.topDepthBoards * G;
  const sideW = D - C.sideDepthBoards * G;
  const sideH = H;
  const topW = internalWidth;
  const topH = internalDepth;
  const backW = W;
  const backH = H;
  // ─── TURN 24 (CLAUDE.md F6): A SHELF'S WIDTH FOLLOWS ITS TYPE ────────────
  //
  // The owner's rule, now law: a FIX shelf is the FULL CLEAR LIGHT — wall to
  // wall, because it is screwed in and never has to move — and an ADJUSTABLE
  // one is that light less `shelfWidthClearance`, 2 mm a side, so it slides.
  //
  // On a 600 carcass: fix 564, adjustable 560.
  //
  // The engine's own number has ALWAYS been `W − 2G − 4`, which is exactly the
  // adjustable law — so every shelf in every project and every golden default
  // maps to ADJUSTABLE with ZERO delta, and the fix width appears only where a
  // shelf is switched to fix. Both laws scale from the LIGHT and never from a
  // constant, which is what makes them right in a bay as well as in a carcass.
  const clearLight = W - C.shelfWidthBoards * G;
  const shelfW = clearLight - C.shelfWidthClearance;
  // The sink's back panel sits 50 mm forward INSIDE the carcass, so its shelves
  // lose that much depth plus the panel itself (KIT_SINK L425-426).
  const SK = P.sinkUnit;
  const sinkLoss = backStyle === 'inset' ? SK.backSetback + G : 0;
  const shelfH = D - C.shelfDepthBoards * G - C.shelfDepthClearance - sinkLoss;

  // ─── Interior setback (turn 8, CLAUDE.md F4) ───
  //
  // How far a FIX shelf or a partition stands back from the face of the
  // carcass. The AutoLISP cuts both full depth; Piotr wants them on the same
  // line as the adjustable shelves, which have stood 20 mm back since the LISP.
  //
  // It arrives as a PARAMETER rather than as a profile default read here, and
  // that is deliberate: the golden fixtures are the LISP kits, called with the
  // LISP's own inputs, and a bare `computeCabinet()` must keep cutting what the
  // kit cuts (fixtures/README rule 1). The setback is a PROJECT decision, so
  // the store supplies it for every unit in a project — the same route the
  // plinth, the top infill and the end panels already take.
  //
  // `front_mm` on the individual piece beats it, and 0 means "out to the face".
  // `== null` and not a truthiness test: 0 is a real answer here — it means
  // "out to the face", which is the whole point of the override — and
  // Number(null) is 0, so either shortcut turns "not set" into "flush".
  const setbackOf = (value, fallback) => {
    if (value == null) return fallback;
    const v = Number(value);
    return Number.isFinite(v) && v >= 0 ? v : fallback;
  };
  const interiorSetback = setbackOf(params?.interior_setback_mm, 0);
  const partitionDepth = D - C.topDepthBoards * G
    - setbackOf(params?.partition_front_mm, interiorSetback);

  // ── Doors ──────────────────────────────────────────────────────────────────
  const doorCount = cfg.doorCount;
  const frontH = H - P.doors.gap + cfg.doorExtend;
  const frontW = doorCount === 2
    ? (W - P.doors.doubleTotalGap) / 2
    : W - P.doors.gap;
  const hingedSides = doorCount === 2 ? ['BUL', 'BUR'] : (doorCount === 1 ? [cfg.hinge === 'R' ? 'BUR' : 'BUL'] : []);

  // ── Hinges + cups ──────────────────────────────────────────────────────────
  const hingeRule = P.hinges.rules[type.hingeRule] || P.hinges.rules.base;
  // ─── Turn 17 (CLAUDE.md F7) ───
  // The kit's own maths, then the project's standard, then whatever the joiner
  // has said about THIS cabinet. A bare `computeCabinet()` — every golden
  // fixture — passes neither of the last two and gets `hingeCentres` unchanged,
  // which is what keeps the AutoLISP's drilling exactly where it is.
  const centres = hingeRows({
    height: H, rule: hingeRule, standard: cfg.hingeStandard, own: cfg.hingeRows,
  }, P);
  // ─── THE CUPS FOLLOW THE HINGES (turn 17, CLAUDE.md F7.3) ────────────────
  //
  // A cup is the hole the hinge's own body sits in, so it is at the HEIGHT of
  // its hinge and always was — the three per-kit offset tables were three ways
  // of writing that down and they all come out the same. Worth the arithmetic,
  // because it is what makes F7 work at all: a door that loses its middle hinge
  // has to lose its middle CUP, and a hinge a joiner has moved by hand has to
  // take its cup with it.
  //
  //   BUD / WUD (baseOffsets)  [100 + e, frontH − 297, frontH − 97] with
  //     frontH = H − 3 + e, i.e. [100 + e, H − 300 + e, H − 100 + e] — which is
  //     the `base` rule's [100, H − 300, H − 100] plus the door extend.
  //   SINK (sinkOffsets)  [100, frontH − 297, frontH − 147] = [100, H − 300,
  //     H − 150] — the `sink` rule exactly, and that kit has no extend.
  //   WARDROBE / TALL / LOW / FRIDGE (hingeCentres)  the centres already.
  //
  // So every kit is `centre + doorExtend`, to the millimetre, and the tables in
  // profile.hinges.cups are left where they are as the traced record of the
  // three LISP kits they came from (test/slots-and-hinge.test.js checks them
  // against this).
  const cupY = centres.map((c) => c + cfg.doorExtend);

  // ── Wardrobe drawers (internal, behind the doors) ──────────────────────────
  const DR = P.wardrobe.drawers;
  const DP = P.wardrobe.drawerPanel;
  const wardrobeDrawers = type.drawerStyle === 'wardrobe';
  let hasDrawers = wardrobeDrawers && cfg.drawers > 0;
  let numDrawers = hasDrawers ? cfg.drawers : 0;
  let numDrPanels = 0;
  let dpLeft = false;
  let dpRight = false;
  let drawerReduction = 0;
  let szufMaxDl = null; let szufDl = null; let szufSzer = null; let drawerFrontW = null;
  let drawerTotalH = 0; let partitionY = null; let partitionCentreY = null;
  let drawerPanelH = null; let drawerPanelD = null; let fillerH = null;
  let boxFrontLen = null; let bottomW = null; let bottomD = null;
  let boxSetback = null;
  let runnerRowsDp = []; let runnerRowsCarcass = [];
  // Turn 21 (CLAUDE.md F1.1): the runner's own UNDERSIDE, which is what the
  // drawer box hangs off. `runnerRows*` above stay the SCREW centres.
  let runnerBottomsDp = []; let runnerBottomsCarcass = [];
  // Per-drawer, bottom-up. With every drawer at the profile default these are
  // constant lists and every formula below collapses to the LISP's fixed one.
  let drawerHeights = [];
  let zoneOffsets = [];      // bottom of drawer i's front, relative to the stack base
  let boxSideH = [];
  let boxFrontHs = [];

  if (hasDrawers) {
    numDrPanels = doorCount === 2 ? 2 : 1;
    dpLeft = doorCount === 2 || cfg.hinge === 'L';
    dpRight = doorCount === 2 || cfg.hinge === 'R';
    drawerReduction = numDrPanels * (DP.inset + G);

    szufMaxDl = D - G - DR.setback - frontT - DR.depthAllowance;
    szufDl = snapDrawerDepth(szufMaxDl, DR.depthSteps);
    if (szufDl == null) {
      warnings.push({ code: 'DRAWERS_TOO_SHALLOW', message: `Cabinet too shallow for drawers (usable ${roundTo(szufMaxDl, 1)} mm < ${DR.depthSteps[0]} mm) — drawers dropped.` });
      hasDrawers = false;
    }
  }

  if (hasDrawers) {
    // totalH = Σ hᵢ + (n−1)·gap. With every hᵢ = frontHeight this is exactly
    // the LISP's n·200 + (n−1)·3.
    drawerHeights = cfg.drawerHeights.slice(0, numDrawers);
    drawerTotalH = drawerHeights.reduce((s, h) => s + h, 0) + (numDrawers - 1) * DR.gap;
    if (drawerTotalH > H - 2 * G - DR.zoneHeadroom) {
      warnings.push({ code: 'DRAWERS_TOO_TALL', message: `${numDrawers} drawers do not fit below the partition — drawers dropped.` });
      hasDrawers = false;
    }
  }

  if (hasDrawers) {
    szufSzer = internalWidth - DR.boxWidthClearance - drawerReduction;
    drawerFrontW = szufSzer + DR.frontOversize;
    partitionY = G + drawerTotalH + DR.partitionClearance;
    partitionCentreY = partitionY + G / 2;
    drawerPanelH = partitionY - G;
    drawerPanelD = D - G - DR.setback;
    fillerH = drawerPanelH;
    boxSetback = DR.setback + frontT;
    // ─── TURN 24 (CLAUDE.md F3.2): TWO SIDES, TWO BOARDS ────────────────────
    // `boxFrontBoards: 4` is "W − 4×G" in the LISP, and the four are not one
    // board four times: TWO of them are the CARCASS sides the box lives
    // between, and TWO are the BOX's own sides the front is cut to fit
    // between. With the workshop's defaults both are 18 and the arithmetic is
    // the LISP's to the millimetre; with a 18.5 carcass and an 18 box they are
    // different numbers, and pretending otherwise is how a box comes out 1 mm
    // wrong. `boxFrontCarcassBoards` is the carcass half; whatever is left of
    // the LISP's total is the box's.
    boxFrontLen = W
      - DR.boxFrontCarcassBoards * G
      - Math.max(0, DR.boxFrontBoards - DR.boxFrontCarcassBoards) * GB
      - DR.boxFrontClearance - drawerReduction;
    bottomW = boxFrontLen + DR.bottomOversize;
    bottomD = szufDl;

    // Cumulative offsets ARE the generalisation: every "i × (frontHeight +
    // gap)" in the LISP becomes "sum of the drawers below me, plus their gaps".
    let acc = 0;
    for (let i = 0; i < numDrawers; i += 1) {
      zoneOffsets.push(acc);
      acc += drawerHeights[i] + DR.gap;
      // Box side = front − frontToSideDelta; box front/back = side − 15 − G − 1,
      // i.e. "as before, off the side" (200 → 164 → 130 with the defaults).
      const side = drawerHeights[i] - DR.frontToSideDelta;
      boxSideH.push(side);
      // …and the `− G` here is the BOX BOTTOM, which the front stands on top
      // of. The box's own board (F3.2), never the carcass's.
      boxFrontHs.push(side - DR.boxFrontHeightDeduction - GB - DR.boxFrontHeightExtra);
    }
    // ─── TURN 21 (CLAUDE.md F1.1): TWO NAMES, TWO MEANINGS ──────────────────
    //
    // The runner's BOTTOM and the runner's SCREW ROW are not the same line and
    // never were. `firstRowFromBottom` (38) is the MOVENTO drilling offset —
    // where the carcass is drilled — and turn 20 used the drilled row as the
    // box's anchor as well, so every box in the app hung 38 mm high. The two
    // quantities are named apart here so nothing can reuse one for the other:
    //
    //   runnerBottoms…   the line the runner's own underside stands on. The
    //                    BOX hangs off this (F1.2).
    //   runnerRows…      the screw centres, 38 above it. The CARCASS DRILLING
    //                    and the runner hole pattern read this, and nothing
    //                    else does.
    for (let i = 0; i < numDrawers; i += 1) {
      const bottom = zoneOffsets[i];
      const rel = bottom + P.wardrobe.runners.firstRowFromBottom;
      runnerBottomsDp.push(bottom);
      runnerBottomsCarcass.push(G + bottom);
      runnerRowsDp.push(rel);
      runnerRowsCarcass.push(G + rel);
    }
  } else if (wardrobeDrawers) {
    numDrawers = 0; numDrPanels = 0; dpLeft = false; dpRight = false; drawerReduction = 0;
    drawerHeights = []; zoneOffsets = []; boxSideH = []; boxFrontHs = [];
  }

  // ── BUDR drawers (three fronts covering the whole face) ────────────────────
  const B = P.baseDrawerUnit;
  const budrDrawers = type.drawerStyle === 'budr';
  let budr = null;
  if (budrDrawers) {
    const heights = cfg.drawerHeights;
    const maxDl = D - G - B.depthAllowance;
    const depth = snapDrawerDepth(maxDl, DR.depthSteps) ?? DR.depthSteps[0];
    if (maxDl < DR.depthSteps[0]) {
      warnings.push({
        code: 'DRAWERS_TOO_SHALLOW',
        message: `Cabinet too shallow for drawers (usable ${roundTo(maxDl, 1)} mm < ${DR.depthSteps[0]} mm) — the shortest runner is used.`,
      });
    }
    const boxW = internalWidth - B.boxWidthClearance;
    const frontWidth = W - B.frontWidthDeduction;
    // The same two sides as the wardrobe's box above (turn 24, F3.2): two
    // carcass boards and two of the box's own.
    const boxLen = W
      - B.boxFrontCarcassBoards * G
      - Math.max(0, B.boxFrontBoards - B.boxFrontCarcassBoards) * GB
      - B.boxFrontClearance;
    // Front i's base above the carcass floor: the fronts overlay the base panel,
    // so front 1 starts at 0 while its RUNNER row still clears the base by G
    // (KIT_BUDR_FULL L712-714).
    const frontY = [];
    let acc = 0;
    for (const h of heights) { frontY.push(acc); acc += h + B.gap; }
    // ─── TURN 21 (CLAUDE.md F1.1): THE RUNNER'S BOTTOM IS ITS OWN QUANTITY ──
    //
    // KIT_BUDR_FULL L712-714: the runner's UNDERSIDE is flush with the bottom
    // edge of the façade it carries (drawer 2 up), and stands on the carcass
    // floor for drawer 1, whose front runs G lower to cover that floor. THAT
    // line is what a drawer box hangs off.
    //
    // `runnerRows` is 38 mm above it — `firstRowFromBottom`, the MOVENTO screw
    // offset — and is the CARCASS DRILLING and nothing else. Turn 20 anchored
    // the box on the screw row, so every box in the app hung 38 mm high and
    // the façade's pilot holes missed the box front's by exactly that. The
    // owner read it off two drillings that did not meet.
    //
    // Two names, two meanings, no reuse. The pilot gate
    // (test/turn21-f1-hole-alignment.test.js) is what holds them apart from
    // here on: chain the pieces off `runnerBottomY` —
    //
    //   box side lower edge   + 13.5   (boxAboveRunner)
    //   drawer bottom under   + 15     (runnerPocketWidth, the groove)
    //   box front standing on + G      (the bottom board)
    //   box-front pilot       + 50     (boxScrewFromEdge)
    //   ────────────────────────────
    //                         + 96.5   = the façade's own pilot, every time.
    const runnerBottomY = frontY.map((y, i) => (i === 0 ? G : y));
    const runnerRows = runnerBottomY.map((y) => y + B.firstRowFromBottom);
    // ─── TURN 18 (CLAUDE.md F5.4): THE BOX FITS THE OPENING ─────────────────
    //
    // A box side is `sideRatio` of its FRONT, which is right in a run of drawer
    // units where the front and the opening are the same piece of cabinet. An
    // OVEN's are not: its front covers the appliance gap as well, and the box
    // behind it lives in the short opening between the carcass bottom and the
    // underside of the shelf the oven stands on.
    //
    // So the front decides the box everywhere it did before, and under a shelf
    // the OPENING has the last word — which is what CLAUDE.md F5.4 states as a
    // fact about this kit ("the box still fits the OPENING under the shelf").
    // Without it a 770 oven base drew a 118 mm box from 56 mm up into a shelf
    // whose underside is at 154.
    const boxCeiling = ovenShelfY(type, P, H, G);
    const sideHs = heights.map((h, i) => {
      const wanted = lispRound(h * B.sideRatio);
      if (boxCeiling == null) return wanted;
      return Math.min(wanted, Math.max(0, boxCeiling - runnerRows[i]));
    });
    // Turn 24 (CLAUDE.md F3.2): the `− G` is the BOX BOTTOM the front stands
    // on, so it is the box's own board and not the carcass's.
    const boxFrontH = sideHs.map((s) => s - B.boxFrontHeightDeduction - GB - B.boxFrontHeightExtra);
    if (boxCeiling != null && sideHs.some((s) => s <= B.boxFrontHeightDeduction + GB + B.boxFrontHeightExtra)) {
      warnings.push({
        code: 'APPLIANCE_DRAWER_TOO_SHORT',
        message: `The opening under the appliance shelf leaves ${roundTo(boxCeiling - runnerRows[0], 0)} mm above the runner row — too little for a drawer box.`,
      });
    }
    // ─── TURN 20 (CLAUDE.md F1): SAY IT, DO NOT SILENTLY RE-CUT ─────────────
    //
    // Turn 18's clamp above measures the headroom from the RUNNER ROW, and
    // this turn the box's own bottom edge stands `boxAboveRunner` above that
    // row — so on an appliance base whose box is already clamped by the shelf,
    // the top of the box now reaches that far past it.
    //
    // The board is NOT re-cut here, and that is deliberate: F1 says side
    // heights stay exactly as turn 18 cut them, and the turn's iron rule allows
    // exactly one CNC delta (F4's label height). Shortening a box side would
    // move an exported DXF nobody asked to move. So the app SAYS SO instead —
    // the same graceful answer it gives everywhere else — and the owner decides
    // in turn 21 whether an appliance box is re-cut, which is a cutting-list
    // decision and therefore his.
    if (boxCeiling != null) {
      // Turn 21 (CLAUDE.md F1.2): the box stands on the runner's BOTTOM, so
      // that is where its top is measured from. The side height itself is
      // untouched — it is still clamped off the screw row turn 18 clamped it
      // off, which is what keeps the cut list byte-for-byte what it was.
      const over = roundTo(Math.max(...sideHs.map((s, i) => runnerBottomY[i] + B.boxAboveRunner + s)) - boxCeiling, 1);
      if (over > 0) {
        warnings.push({
          code: 'APPLIANCE_DRAWER_BOX_OVER_SHELF',
          message: `The drawer box stands ${over} mm past the shelf the appliance sits on — it rides ${B.boxAboveRunner} mm above its runner and the box side is cut to the old clearance. Shorten the box by hand until the kit is re-cut.`,
        });
      }
    }
    budr = {
      heights, frontY, runnerRows, runnerBottomY, sideHs, boxFrontH,
      depth, maxDl, boxW, frontWidth, boxLen,
      bottomW: boxLen + B.bottomOversize,
      count: heights.length,
      stackTop: acc - B.gap,
    };
    numDrawers = heights.length;
  }

  // ── Hanging rail ───────────────────────────────────────────────────────────
  const RL = P.wardrobe.rail;
  const hasRail = type.supports.rail && cfg.rail;
  let railY = null; let railPartY = null; let railPartCentreY = null;
  if (hasRail) {
    railY = (hasDrawers ? partitionY + G : G) + cfg.railOffset;
    railPartY = railY + RL.partitionAbove;
    if (railPartY + G > H - G - RL.topClearance) {
      warnings.push({ code: 'RAIL_TOO_HIGH', message: 'Rail too high for the carcass — lowered to fit under the top.' });
      railY = H - G - RL.topClearance - G - RL.partitionAbove;
      railPartY = railY + RL.partitionAbove;
    }
    railPartCentreY = railPartY + G / 2;
  }

  // ── Sink / fridge zones ────────────────────────────────────────────────────
  const sinkBack = backStyle === 'inset'
    ? { w: W - C.topWidthBoards * G - SK.backWidthClearance, h: H - SK.backHeightDeduction - G }
    : null;
  const FR = P.fridgeUnit;
  // ─── The FRIDGE's backs SIT ON THE DOG BONES (turn 14, CLAUDE.md F2) ──────
  //
  // A fridge housing has no full back: three pieces close it — RAIL1 at the
  // bottom, RAIL2 across the middle of the fridge zone, and BACK above the
  // fixed panel (KIT_FRIDGE.lsp L6, L110-119). The sides are drawn by the
  // ORDINARY drawBUL/drawBUR (L293, L310), so they carry the ordinary three
  // back tenons with their dog-bone reliefs, at 95 / H/2 / H−95 measured from
  // the bottom of the side panel (SKYLON_COMMON.lsp L699, L737-739).
  //
  // Three pieces, three tenons: each back piece catches exactly one of them,
  // and every one of them carries exactly ONE socket on each short edge, 95 mm
  // in (KIT_FRIDGE.lsp L340-346 RAIL1, L366-372 RAIL2, L381-387 BACK). That is
  // what decides where the pieces STAND, and turn 3 read it off the LISP's
  // FRONT VIEW instead — which is a schematic and disagrees with its own CNC
  // (it draws the back-top from fixedPanelY+G to H−G, while the panel it cuts
  // is spursH+G tall and therefore runs fixedPanelY → H). The owner's verdict,
  // three sentences, all three now arithmetic:
  //
  //   "the small back panels sit BELOW the dog-bone row"  → RAIL2 was centred
  //   on the fridge zone (G + fridgeH/2), 144 mm under the middle tenon.
  //
  //   "the bottom back sits above instead of ON"          → RAIL1 stood on top
  //   of the BOTTOM panel (y = G), so its socket landed at 113 and the tenon it
  //   is for is at 95. A back panel is flush with the bottom of the carcass,
  //   exactly as the ordinary full BACK is, and its left edge then receives the
  //   BOTTOM panel's own back tenons (L351-358) — which only lines up at y = 0.
  //
  //   "the top back is UPSIDE-DOWN (bones at the bottom, must be at the top)"
  //   → the BACK's span is right (fixedPanelY → H: its RIGHT edge receives the
  //   TOP panel's tenons, L389-397, and its LEFT edge screws into the fixed
  //   panel, L406-409), but its socket row was cut 95 from the BOTTOM. The
  //   tenon it has to catch is the TOP one, at H−95. So the row moves to 95
  //   from the panel's top — the panel turned over.
  //
  // This is the one CNC delta of the turn besides the new masking panel, and it
  // is exactly one row of sockets on one panel of one kit. No golden fixture
  // encodes it: fixtures/golden-fridge.json carries sizes, drills, CSV and
  // totals, and lists "RAIL2 centred at fridgeH/2 — confirm position" under
  // `verify_with_piotr`. This turn is that confirmation, the other way.
  const fridge = backStyle === 'rails'
    ? (() => {
      const fixedPanelY = G + cfg.fridgeH;
      const spursH = H - fixedPanelY - G;
      // The dog-bone row: where the side panels' back tenons are.
      const backTabs = tabCentres(H, pz);
      const middleTab = backTabs.length >= 3 ? backTabs[1] : H / 2;
      return {
        fixedPanelY,
        spursH,
        railH: FR.railHeight,
        // Each rail's own socket is `tabCentresFromEnd` above its bottom edge,
        // so the piece stands that far below the tenon it catches.
        rail1Y: 0,
        rail2Y: middleTab - pz.tabCentresFromEnd,
        backTopH: spursH + G,
        // …and the back-top's row is measured from its TOP, which is what
        // "upside-down" meant.
        backTopSocket: spursH + G - pz.tabCentresFromEnd,
        spursW: internalWidth - FR.spursWidthClearance,
        spursPanelH: spursH - G,
      };
    })()
    : null;
  if (fridge && fridge.spursH <= G) {
    warnings.push({
      code: 'FRIDGE_ZONE_TOO_TALL',
      message: `Fridge height ${roundTo(cfg.fridgeH, 0)} mm leaves no room for the spurs panel — lower it or raise the carcass.`,
    });
  }
  // The middle rail hangs on the middle tenon, which is at half the CARCASS
  // height and takes no notice of the fridge. A very short fridge in a very
  // tall housing therefore puts the fixed panel through it, and that is a
  // number to change rather than a piece to move.
  if (fridge && fridge.rail2Y + fridge.railH > fridge.fixedPanelY) {
    warnings.push({
      code: 'FRIDGE_RAIL_MEETS_FIXED_PANEL',
      message: `The middle back rail hangs on the tenon at ${roundTo(fridge.rail2Y + pz.tabCentresFromEnd, 0)} mm, which is above the fixed panel at ${roundTo(fridge.fixedPanelY, 0)} mm — raise the fridge height or lower the carcass.`,
    });
  }

  // ─── THE OVEN HOUSING'S OWN GEOMETRY (turn 17 F10; turn 18 F5) ───────────
  //
  // Derived HERE, above the panels, because the side panels have to know it:
  // this kit's back stops at the shelf, and turn 18 stops cutting the tabs
  // there is nothing behind (F5.1).
  //
  //   THE SHELF. The oven is 595 high, so THE SHELF IT STANDS ON SITS 598 MM
  //   FROM THE TOP OF THE CABINET — from the TOP, not from a centre line and
  //   not from the floor. It is written that way here because it is the sort of
  //   number that gets "corrected" later by somebody measuring up from the
  //   plinth, and the correction would drop the oven 40 mm into the drawer.
  const OV = P.ovenUnit;
  const oven = type.appliance === 'oven'
    ? (() => {
      // The shelf's TOP face at H − 598: the board is drawn from its underside up.
      const shelfY = ovenShelfY(type, P, H, G);
      return {
        shelfY,
        // The back, behind the drawer and nowhere else: flush with the bottom
        // of the carcass, up to the underside of the shelf.
        backH: Math.max(0, shelfY),
        // The two top rails (F5.2). The back one stands on edge; the front one
        // lies flat, so what closes the front of the opening is a board's
        // thickness and the rest of the top is open.
        backRailH: OV.topRails.backHeight,
        frontRailW: OV.topRails.frontWidth,
      };
    })()
    : null;
  if (oven && oven.shelfY <= G) {
    warnings.push({
      code: 'OVEN_TOO_LOW',
      message: `A ${roundTo(H, 0)} mm carcass has no room for the oven shelf 598 mm from its top.`,
    });
  }

  // ── Shelf hole rows ────────────────────────────────────────────────────────
  const SH = P.shelfHoles;
  const numShelves = cfg.shelves;
  let shelfRows = [];
  if (SH.followPositions && cfg.shelfPositions.length === numShelves && numShelves > 0) {
    shelfRows = [...cfg.shelfPositions];
  } else if (numShelves > 0) {
    // spanMode 'fullHeight' replicates KIT_WARDROBE_FULL v1: the row spacing
    // ignores the drawer zone (golden-wardrobe.json → shelf_holes_quirk).
    const zoneBottom = SH.spanMode === 'fullHeight'
      ? G
      : (railPartY != null ? railPartY + G : (hasDrawers ? partitionY + G : G));
    const zoneTop = H - G;
    const spacing = (zoneTop - zoneBottom) / (numShelves + 1);
    for (let i = 1; i <= numShelves; i += 1) shelfRows.push(zoneBottom + spacing * i);
  }
  // The sink's back pin column moves forward — its back panel is inside the box.
  const shelfBackColumn = backStyle === 'inset' ? SK.shelfBackColumnFromEdge : SH.columnFromEdge;
  const shelfHoleX = [SH.columnFromEdge, sideW - shelfBackColumn];

  // ── Panels ─────────────────────────────────────────────────────────────────
  const panels = [];
  // KIT_SINK's sides are the shared side panel with the joints it does not have
  // switched off: no back tabs (the back is screwed in, 50 mm forward), no top
  // sockets and no top screw row (there is no TOP panel, just two holders).
  // ─── TURN 18 (CLAUDE.md F5.1/F5.2): AND THE OVEN'S ARE THE SAME IDEA ─────
  // Its top is two rails rather than a TOP panel, so the top sockets and the
  // top screw row go exactly as the sink's do — and its back only reaches the
  // shelf, so the back tabs above the back are not cut. What is left is the
  // one tab the back really catches and the bottom's own sockets, which is
  // what the owner's review asks for in as many words.
  const sideEdges = backStyle === 'inset'
    ? { backTabs: false, topSocket: false, topScrews: false }
    : (oven
      ? { topSocket: false, topScrews: false, backTabsBelow: oven.backH }
      : undefined);

  // ─── TURN 17 (CLAUDE.md F9): A FRONT AND NOTHING ELSE ────────────────────
  //
  // "It is a front and nothing else — no hinges, flat, no door furniture." A
  // D/W panel closes the face of an appliance that stands on the floor between
  // two carcasses; there is no box, so there are no sides, no bottom and no
  // back, and the whole carcass block below is skipped rather than being built
  // and then filtered. The two pieces the owner DID name are emitted here.
  const applianceFront = type.appliance === 'dw';
  if (applianceFront) {
    const DW = P.dwPanel;
    // ONE TOP PANEL, ALWAYS 600 mm WIDE, depth as the rest of the run. "Always"
    // is the word he used, so the width is the profile's number and not the
    // unit's: a 500 mm appliance gap still takes the 600 mm top.
    panels.push(panel({
      id: 'TOP', part: 'TOP', role: 'top', w: DW.topWidth, h: topH, thickness: G,
      edgeCode: codes.right, edgeLen: metres(DW.topWidth),
      box: { x: (W - DW.topWidth) / 2, y: H - G, z: G, w: DW.topWidth, h: G, d: topH },
      cnc: { rotated: true, drawn_w: topH, drawn_h: DW.topWidth, ...rectGeometry(topH, DW.topWidth) },
    }));
    // 594 IS THE WIDTH, RIGID. Not a default and not a maximum: the value.
    // Over 600 and the appliance door cannot swing past its neighbours, and
    // the app must not be the thing that let that happen. The HEIGHT is the
    // ordinary base front height — `H − gap`, the same line 838 gives every
    // door in the run — because this front stands among them and must line up
    // with them.
    const dwW = DW.frontWidth;
    const dwH = H - P.doors.gap;
    panels.push(panel({
      id: `${unitNum}-F`, part: 'FRONT', role: 'front', w: dwW, h: dwH, thickness: frontT,
      edgeCode: codes.all, edgeLen: metres(2 * dwW + 2 * dwH),
      box: { x: (W - dwW) / 2, y: H - dwH, z: D + P.doors.gap, w: dwW, h: dwH, d: frontT },
      // Flat: no hinge cups, no cup screws, no door furniture at all.
      cnc: rectGeometry(dwW, dwH),
      meta: { appliance: 'dw' },
    }));
  }

  if (!applianceFront) panels.push(panel({
    id: 'BUL', part: 'BUL', role: 'side', w: sideW, h: sideH, thickness: G,
    edgeCode: codes.left, edgeLen: metres(sideH),
    box: { x: 0, y: 0, z: G, w: G, h: sideH, d: sideW },
    cnc: { rotated: false, drawn_w: sideW, drawn_h: sideH, ...sidePanelGeometry({ w: sideW, h: sideH, G, side: 'L', puzzle: pz, edges: sideEdges }) },
  }));
  if (!applianceFront) panels.push(panel({
    id: 'BUR', part: 'BUR', role: 'side', w: sideW, h: sideH, thickness: G,
    edgeCode: codes.right, edgeLen: metres(sideH),
    box: { x: W - G, y: 0, z: G, w: G, h: sideH, d: sideW },
    cnc: { rotated: false, drawn_w: sideW, drawn_h: sideH, ...sidePanelGeometry({ w: sideW, h: sideH, G, side: 'R', puzzle: pz, edges: sideEdges }) },
  }));
  const topGeom = (backTabs = true) => ({
    rotated: true, drawn_w: topH, drawn_h: topW,
    ...topPanelGeometry({ drawnW: topH, drawnH: topW, G, puzzle: pz, backTabs }),
  });
  if (hasTopPanel && !applianceFront) {
    panels.push(panel({
      id: 'TOP', part: 'TOP', role: 'top', w: topW, h: topH, thickness: G,
      edgeCode: codes.right, edgeLen: metres(topW),
      box: { x: G, y: H - G, z: G, w: topW, h: G, d: topH },
      cnc: topGeom(),
    }));
  }
  if (!applianceFront) panels.push(panel({
    id: 'BOTTOM', part: 'BOTTOM', role: 'bottom', w: topW, h: topH, thickness: G,
    edgeCode: codes.right, edgeLen: metres(topW),
    box: { x: G, y: 0, z: G, w: topW, h: G, d: topH },
    cnc: topGeom(backStyle !== 'inset'),
  }));

  if (backStyle === 'full') {
    const backCnc = { rotated: false, drawn_w: backW, drawn_h: backH, ...backPanelGeometry({ w: backW, h: backH, G, puzzle: pz }) };
    if (type.hangers) {
      // Two cut-outs at the top corners take the wall bracket (KIT_WUD L258-260).
      const HG = P.wallUnit.hangers;
      backCnc.pockets = [
        ...backCnc.pockets,
        { layer: HG.cutoutLayer, x1: 0, y1: backH - HG.cutoutHeight, x2: HG.cutoutWidth, y2: backH },
        { layer: HG.cutoutLayer, x1: backW - HG.cutoutWidth, y1: backH - HG.cutoutHeight, x2: backW, y2: backH },
      ];
    }
    panels.push(panel({
      id: 'BACK', part: 'BACK', role: 'back', w: backW, h: backH, thickness: G,
      edgeCode: codes.none, edgeLen: 0,
      box: { x: 0, y: 0, z: 0, w: backW, h: backH, d: G },
      cnc: backCnc,
    }));
  }

  // ─── TURN 17 (CLAUDE.md F10): THE OVEN BASE UNIT ─────────────────────────
  //
  // Two pieces the kit adds to an ordinary base carcass, and both are the
  // owner's own numbers.
  //
  //   THE SHELF. The oven is 595 high, so THE SHELF IT STANDS ON SITS 598 MM
  //   FROM THE TOP OF THE CABINET — from the TOP, not from a centre line and
  //   not from the floor. It is written that way here because it is the sort of
  //   number that gets "corrected" later by somebody measuring up from the
  //   plinth, and the correction would drop the oven 40 mm into the drawer.
  //
  //   THE BACK. "No back except behind the drawer. That back fixes the standard
  //   way — 4 dog bones: one at each side, two into the bottom of the cabinet."
  //   That is the FRIDGE's own back-rail pattern, traced in turn 14
  //   (KIT_FRIDGE.lsp L340-358): a socket 95 mm in on each short edge, catching
  //   the side panels' lowest tenon, and two more down its left edge at G + 95
  //   and W − G − 95, catching the BOTTOM panel's back tenons. Four sockets,
  //   four dog bones, and not one new number.
  //
  //   THE TOP (turn 18, CLAUDE.md F5.2). It was a full TOP panel and the
  //   owner's review is that it is a LID: an oven wants the air out of its
  //   housing, and the open back plus an open top ARE the ventilation. So the
  //   kit takes the SINK's own two-holder answer, with the one change he named
  //   — the FRONT rail lies FLAT (100 mm wide, board thick), because a rail on
  //   edge across the front of an oven opening is 100 mm of board you look
  //   straight at and it is where the appliance's flue comes out.
  //
  //   NO VENTILATION CUT, and that is a decision rather than an omission: a
  //   50 × 300 slot in the shelf would vent into a CLOSED DRAWER. Where a
  //   particular oven's manual demands one, that is a manufacturer's number and
  //   a later turn (BLOCKERS).
  if (oven) {
    panels.push(panel({
      id: 'FIXED', part: 'FIXED', role: 'shelf', w: internalWidth, h: internalDepth, thickness: G,
      edgeCode: codes.right, edgeLen: metres(internalWidth),
      box: { x: G, y: oven.shelfY, z: G, w: internalWidth, h: G, d: internalDepth },
      // Drawn turned, like the fridge's own fixed panel and like a TOP.
      cnc: { rotated: true, drawn_w: internalDepth, drawn_h: internalWidth, ...rectGeometry(internalDepth, internalWidth) },
      meta: { variant: 'fixed', locked: true, oven: true },
    }));
    if (oven.backH > 0) {
      panels.push(panel({
        id: 'BACK', part: 'BACK', role: 'back', w: W, h: oven.backH, thickness: G,
        edgeCode: codes.none, edgeLen: 0,
        box: { x: 0, y: 0, z: 0, w: W, h: oven.backH, d: G },
        cnc: {
          rotated: true,
          drawn_w: oven.backH,
          drawn_h: W,
          ...socketPanelGeometry({
            w: oven.backH,
            h: W,
            G,
            puzzle: pz,
            sockets: {
              // One into each SIDE — the sides' lowest tenon, 95 up from the
              // carcass floor — and two into the BOTTOM of the cabinet.
              bottom: [pz.tabCentresFromEnd],
              top: [pz.tabCentresFromEnd],
              left: [G + pz.tabCentresFromEnd, W - G - pz.tabCentresFromEnd],
            },
          }),
        },
        meta: { oven: true },
      }));
    }
  }
  if (type.carcass.top === 'ovenRails' && oven) {
    // The BACK rail, on edge against the back of the opening — the sink's
    // HOLDER-B in every respect but the profile block its height comes from.
    panels.push(panel({
      id: 'RAIL-B', part: 'HOLDER', role: 'top', w: oven.backRailH, h: internalWidth, thickness: G,
      edgeCode: codes.none, edgeLen: 0,
      box: { x: G, y: H - oven.backRailH, z: G, w: internalWidth, h: oven.backRailH, d: G },
      cnc: rectGeometry(oven.backRailH, internalWidth),
      meta: { side: 'B', oven: true },
    }));
    // …and the FRONT rail, LYING FLAT. Its cut piece is `railWidth × internal
    // width` like the other one; what differs is how it lies in the cabinet —
    // `h: G` and `d: frontRailW` rather than the other way round — and
    // therefore where the screws that hold it go.
    panels.push(panel({
      id: 'RAIL-F', part: 'HOLDER', role: 'top', w: oven.frontRailW, h: internalWidth, thickness: G,
      // Banded on the long edge, like the TOP panel it stands in for: lying
      // flat at the front of the opening, its edge is what you look at.
      edgeCode: codes.right, edgeLen: metres(internalWidth),
      box: { x: G, y: H - G, z: D - oven.frontRailW, w: internalWidth, h: G, d: oven.frontRailW },
      cnc: rectGeometry(oven.frontRailW, internalWidth),
      meta: { side: 'F', flat: true, oven: true },
    }));
  }

  // Sink: the TOP is replaced by two holders on edge, and the back moves inside.
  //
  // ─── TURN 11 (CLAUDE.md F5.5): THE KIT WAS FACING THE WALL ───
  //
  // Piotr: "SINK cabinet is oriented backwards". It was, and in three places at
  // once, all of them on the z axis — which in a unit's own frame runs from the
  // wall (z = 0) to the door line (z = D):
  //
  //   • the back panel sat at `D − backSetback − G`, i.e. 50 mm behind the
  //     DOORS. KIT_SINK L261 says `backSetback 50.0 ;; back panel moved forward
  //     by 50mm` — forward FROM THE REAR. It belongs at `G + 50`, and the
  //     arithmetic proves it: the shelf loses `backSetback + G` off its depth
  //     (L425-426, and `sinkLoss` above), so its back edge stands at
  //     G + 50 + G = 86 — exactly the front face of a back panel sitting at 68.
  //     With the panel at 490 the shelves ran straight through it.
  //
  //   • the two holders were swapped. HOLDER-F — the FRONT holder, the one the
  //     sink's front lip is screwed to (L345 "at top, front edge") — was at
  //     z = G, against the wall; HOLDER-B was near the front and a board short
  //     of the edge it names. They are on the edges now, front at D − G, back
  //     at G, which is `G/2 from each edge` measured on the side panel (L47),
  //     the drilling the engine already emits for them.
  //
  // Nothing here is a CUT dimension: every panel's w, h and edging is untouched,
  // so fixtures/golden-sink.json — which records exactly those — is unchanged.
  if (backStyle === 'inset') {
    panels.push(panel({
      id: 'BACK', part: 'BACK', role: 'back', w: sinkBack.w, h: sinkBack.h, thickness: G,
      edgeCode: codes.none, edgeLen: 0,
      box: {
        x: G + C.shelfWidthClearance / 2, y: G, z: G + SK.backSetback, w: sinkBack.w, h: sinkBack.h, d: G,
      },
      cnc: rectGeometry(sinkBack.w, sinkBack.h),
    }));
  }
  if (type.carcass.top === 'holders') {
    const holderH = SK.railHeight;
    for (const [id, label, z] of [['HOLDER-F', 'F', D - G], ['HOLDER-B', 'B', G]]) {
      panels.push(panel({
        id, part: 'HOLDER', role: 'top', w: holderH, h: internalWidth, thickness: G,
        edgeCode: codes.none, edgeLen: 0,
        box: { x: G, y: H - holderH, z, w: internalWidth, h: holderH, d: G },
        cnc: rectGeometry(holderH, internalWidth),
        meta: { side: label },
      }));
    }
  }

  // Fridge: fixed panel, two back rails, back-top and the spurs panel.
  if (fridge) {
    panels.push(panel({
      id: 'FIXED', part: 'FIXED', role: 'shelf', w: internalWidth, h: internalDepth, thickness: G,
      edgeCode: codes.right, edgeLen: metres(internalWidth),
      box: { x: G, y: fridge.fixedPanelY, z: G, w: internalWidth, h: G, d: internalDepth },
      // ─── Turn 17 (CLAUDE.md F1.2, delta 1) ───
      // It has ALWAYS been drawn turned — `rectGeometry(internalDepth,
      // internalWidth)`, the TOP's own nesting — and it never said so. Nothing
      // asked until this turn, because nothing read a FIXED panel's frame: the
      // piece carries no machining and `panelPlacement` returned null for it.
      // With the label going INSIDE the part, the silence became visible —
      // `cncRect` fell back to the CUT dimensions, which are the other way
      // round, so the caption was set out in a 564-wide frame on a board that
      // is 540 wide and stood outside its own outline. Stating the frame the
      // kit already draws in is the fix, and it is the only thing that moves.
      cnc: { rotated: true, drawn_w: internalDepth, drawn_h: internalWidth, ...rectGeometry(internalDepth, internalWidth) },
    }));
    const railSockets = (withBottom) => ({
      bottom: [pz.tabCentresFromEnd],
      top: [pz.tabCentresFromEnd],
      ...(withBottom ? { left: [G + pz.tabCentresFromEnd, W - G - pz.tabCentresFromEnd] } : {}),
    });
    const railCnc = (withBottom) => ({
      rotated: true, drawn_w: fridge.railH, drawn_h: W,
      ...socketPanelGeometry({ w: fridge.railH, h: W, G, puzzle: pz, sockets: railSockets(withBottom) }),
    });
    panels.push(panel({
      id: 'RAIL1', part: 'BACK-RAIL', role: 'back', w: W, h: fridge.railH, thickness: G,
      edgeCode: codes.none, edgeLen: 0,
      // Flush with the bottom of the carcass, like the ordinary full BACK: its
      // socket then lands on the lowest tenon and its left edge receives the
      // BOTTOM panel (KIT_FRIDGE.lsp L340-358).
      box: { x: 0, y: fridge.rail1Y, z: 0, w: W, h: fridge.railH, d: G },
      cnc: railCnc(true),
      meta: { index: 1 },
    }));
    panels.push(panel({
      id: 'RAIL2', part: 'BACK-RAIL', role: 'back', w: W, h: fridge.railH, thickness: G,
      edgeCode: codes.none, edgeLen: 0,
      // Hung on the MIDDLE tenon (KIT_FRIDGE.lsp L366-372 against
      // SKYLON_COMMON.lsp L699), not centred on the fridge zone.
      box: { x: 0, y: fridge.rail2Y, z: 0, w: W, h: fridge.railH, d: G },
      cnc: railCnc(false),
      meta: { index: 2 },
    }));
    // Turn 24 (CLAUDE.md F4): the board's own centre line, and nothing on top.
    const S = thicknessOf('BUL', cfg.thicknesses) / 2;
    const backTopScrews = [
      { x: pz.screwFromEnd, y: S }, { x: pz.screwFromEnd, y: W - S },
      { x: fridge.backTopH - pz.screwFromEnd, y: S }, { x: fridge.backTopH - pz.screwFromEnd, y: W - S },
      { x: fridge.backTopH - S, y: pz.screwFromEnd + G }, { x: fridge.backTopH - S, y: W - pz.screwFromEnd - G },
      { x: G / 2, y: pz.screwFromEnd + G }, { x: G / 2, y: W / 2 }, { x: G / 2, y: W - pz.screwFromEnd - G },
    ];
    panels.push(panel({
      id: 'BACK', part: 'BACK', role: 'back', w: W, h: fridge.backTopH, thickness: G,
      edgeCode: codes.none, edgeLen: 0,
      box: { x: 0, y: fridge.fixedPanelY, z: 0, w: W, h: fridge.backTopH, d: G },
      cnc: {
        rotated: true, drawn_w: fridge.backTopH, drawn_h: W,
        ...socketPanelGeometry({
          w: fridge.backTopH, h: W, G, puzzle: pz,
          sockets: {
            // 95 from the panel's TOP, not from its bottom: the tenon this
            // piece catches is the side panels' top one, at H − 95
            // (SKYLON_COMMON.lsp L699 t3y). The drawn x axis runs UP the
            // cabinet — its right edge is where the TOP panel's tenons go.
            bottom: [fridge.backTopSocket], top: [fridge.backTopSocket],
            right: [G + pz.tabCentresFromEnd, W - G - pz.tabCentresFromEnd],
          },
          screws: backTopScrews,
        }),
      },
    }));
    panels.push(panel({
      id: 'SPURS', part: 'SPURS', role: 'side', w: fridge.spursW, h: fridge.spursPanelH, thickness: G,
      edgeCode: codes.none, edgeLen: 0,
      box: { x: G + FR.spursWidthClearance / 2, y: fridge.fixedPanelY + G, z: D - FR.spursFromFront - G, w: fridge.spursW, h: fridge.spursPanelH, d: G },
      cnc: rectGeometry(fridge.spursPanelH, fridge.spursW),
    }));
  }

  // ─── The ZONE model (turn 12, CLAUDE.md F5.3) ───
  // The bays across the cabinet, one per opening between the vertical
  // partitions. With no partition there is exactly one bay and every shelf is
  // full width, which is what every cabinet before turn 12 was.
  const verticalItems = (cfg.items || [])
    .filter((i) => i.kind === 'partition' && Number.isFinite(Number(i.x_mm)))
    .sort((a, b) => Number(a.x_mm) - Number(b.x_mm));
  // Turn 24 (CLAUDE.md F3.3): each partition is measured at its OWN slot's
  // board, so the bay a shelf is cut to fit is the light that will actually be
  // there. Nothing said = carcass 1, which is every project before this turn.
  const bays = widthZones({
    width: W,
    boardT: G,
    partitions: verticalItems.map((i) => ({
      ...i, thickness_mm: thicknessOf(partitionSlot(i), cfg.thicknesses),
    })),
  });

  for (let i = 1; i <= numShelves; i += 1) {
    const y = shelfRows[i - 1] ?? (G + ((H - 2 * G) / (numShelves + 1)) * i);
    const item = cfg.shelfItems[i - 1];
    // Which BAY this shelf lives in (CLAUDE.md F5.3). `zone` is an index into
    // the bays above rather than a pair of coordinates, so moving the partition
    // moves the shelves in its bays with it — coupled, and without a second
    // number to keep in step. Nothing said = the whole width, as before.
    // `item.zone == null` FIRST, and not `Number.isFinite(Number(...))` alone:
    // `Number(null)` is 0, so "no bay was chosen" would read as "bay 0" and
    // every full-width shelf in the app would come out the width of the first
    // bay. The same trap rule 13 is about.
    const bay = item?.zone == null || !Number.isFinite(Number(item.zone))
      ? null
      : bays[Math.trunc(Number(item.zone))] || null;
    // Turn 24 (CLAUDE.md F6): the light this shelf stands in — the bay's, or
    // the whole carcass's — and then the type decides how much of it the board
    // takes. Per-bay lights (partitions) are respected exactly as before.
    const lightHere = bay ? bay.size : clearLight;
    const lightFrom = bay ? bay.from : G;
    const fixHere = isShelfLocked(item);
    const shelfWHere = fixHere ? lightHere : lightHere - C.shelfWidthClearance;
    const shelfXHere = fixHere ? lightFrom : lightFrom + C.shelfWidthClearance / 2;
    // Every shelf may be pulled out to the face on its own (turn 8, F4). With
    // nothing said it is the LISP's own 20 mm, which is what a bare kit call —
    // and every golden fixture — gets.
    const depthHere = D - C.shelfDepthBoards * G
      - setbackOf(item?.front_mm, C.shelfDepthClearance) - sinkLoss;
    // ─── Turn 9 (CLAUDE.md F4): this shelf's own board ───
    // An INPUT, not a formula. The piece is cut, edged, drilled and laid out by
    // exactly the arithmetic every other shelf goes through — the number in it
    // is different, and only when somebody said so.
    const shelfT = shelfThickness(item, G);
    panels.push(panel({
      id: `SHELF-${i}`, part: 'SHELF', role: 'shelf', w: shelfWHere, h: depthHere, thickness: shelfT,
      edgeCode: codes.right, edgeLen: metres(shelfWHere),
      // `pos_mm` is the shelf's BOTTOM face and always has been (the LISP draws
      // the board from shelfY up), so a thicker shelf grows UP from the pin row
      // it sits on rather than down through it.
      //
      // ─── Turn 11 (CLAUDE.md F5.5) ───
      // The z was a flat `G` — the shelf started at the BACK of the carcass and
      // any depth it had lost came off the FRONT. On every kit but one that is
      // the same answer, because the only thing a shelf loses is its 20 mm
      // setback: D − 20 − (D − G − 20) is exactly G.
      //
      // On the SINK it is not. That shelf also loses `backSetback + G` to the
      // inset back panel, so anchoring it at the back left it hanging 88 mm
      // short of the face with a slot behind the door — half of "the sink is
      // oriented backwards". A shelf is placed by its FRONT edge, which is
      // where a joiner measures it from and where the setback is measured to.
      box: {
        x: shelfXHere,
        y,
        z: D - setbackOf(item?.front_mm, C.shelfDepthClearance) - depthHere,
        w: shelfWHere,
        h: shelfT,
        d: depthHere,
      },
      cnc: rectGeometry(shelfWHere, depthHere),
      meta: {
        index: i,
        // ─── TURN 21 (CLAUDE.md F9.1): THE SHELF'S OWN RUN ────────────────
        // Where this board actually reaches, left and right. It is what
        // decides whether a partition yields to it — SPAN, never order — and
        // it is recorded on the panel so the answer is the same everywhere
        // and can be read back off a saved result.
        run: { from: shelfXHere, to: shelfXHere + shelfWHere },
        // Turn 8: the default is ADJUSTABLE — a shelf on pins, which is what a
        // shelf with nothing said about it has always been. `fixed` now means
        // SCREWED (F4), so it cannot go on being the value nobody chose.
        variant: shelfVariant(item),
        itemId: item?.id || null,
        // A shelf that is screwed in, or one somebody has locked, does not move
        // and is not drilled for pins.
        locked: isShelfLocked(item),
        front_mm: setbackOf(item?.front_mm, C.shelfDepthClearance),
        thickness_mm: shelfT,
        zone: bay ? bay.index : null,
        ...(shelfMaterial(item) || {}),
      },
    }));
  }

  // Turn 21 (CLAUDE.md F9): every shelf's run, in the engine's own order, for
  // the partition pass below. Read back off the panels that were just cut, so
  // there is one arithmetic and not a second copy of the bay maths.
  const shelfRuns = panels
    .filter((p) => p.part === 'SHELF' && p.meta?.run)
    .map((p) => ({ run: p.meta.run, item: cfg.shelfItems[p.meta.index - 1] || null }));

  // A partition and a rail partitioner are FIX shelves in everything but name,
  // so turn 8 (F4) sets them back on the same line as the shelves beside them.
  // `partitionDepth` is `internalDepth` when nobody has said otherwise, which
  // is what the AutoLISP cuts and what every golden fixture expects.
  if (hasDrawers) {
    panels.push(panel({
      id: 'PARTITION', part: 'PARTITION', role: 'shelf', w: internalWidth, h: partitionDepth, thickness: G,
      edgeCode: codes.none, edgeLen: 0,
      box: { x: G, y: partitionY, z: G, w: internalWidth, h: G, d: partitionDepth },
      cnc: rectGeometry(internalWidth, partitionDepth),
      meta: { variant: 'fixed', locked: true, front_mm: internalDepth - partitionDepth },
    }));
  }
  // ─── The VERTICAL partition (turn 11, CLAUDE.md F3.4) ─────────────────────
  //
  // BLOCKERS #50 (turn 9) recorded, correctly, that this engine had no such
  // thing: `PARTITION` and `RAIL-PART` are HORIZONTAL boards the engine builds
  // from the stack under them, and `DP` is part of the drawer mechanism. A
  // joiner dividing a 900 mm cabinet into two columns had nothing to ask for.
  //
  // It is an ITEM, like a shelf: the unit's own config carries `{ kind:
  // 'partition', x_mm }` and the engine cuts what is asked for. `x_mm` is the
  // piece's LEFT face in the cabinet's own frame, which is the same convention
  // `pos_mm` uses for a shelf (the face the board starts at, not its centre) —
  // one rule for both axes, so a joiner who has learnt where a shelf's number is
  // measured from has learnt where a partition's is.
  //
  // It is NOT tabbed, and that is a decision rather than an omission. The puzzle
  // joint holds the box together; a divider inside the box is screwed or pinned
  // to the boards it stands between, which is what a workshop does and what
  // leaves the carcass's own joint untouched. Its DRILLING is a later question
  // and is written down as one (BLOCKERS #59).
  //
  // Depth follows the horizontal partition's, so the two read as one family of
  // pieces inside the carcass and both answer to `partition_front_mm`.
  //
  // ─── TURN 12 (CLAUDE.md F5.3): IT MAY STAND ON A SHELF ───
  // The owner's three rules, and the reasoning is in engine/zones.js beside the
  // function that applies them: a partition may terminate on a FIXED shelf, its
  // depth then FOLLOWS that shelf's (shrink the shelf and the partition shrinks
  // with it), and an ADJUSTABLE shelf carries nothing — the partition runs past
  // it and the collision treatment says so.
  {
    const verticals = verticalItems;
    let n = 0;
    for (const item of verticals) {
      const x = Math.min(Math.max(Number(item.x_mm), G), W - 2 * G);
      // ─── TURN 21 (CLAUDE.md F8): A DEFAULT, NOT A LAW ────────────────────
      //
      // Owner: 20 mm was FORCED on every partition; wrong. The number is this
      // PIECE's now — `front_mm` on the item, exactly as a shelf's own setback
      // has been since turn 8 — and the unit's `partition_front_mm` only
      // SEEDS it, as the profile only seeds that. Nothing is imposed.
      //
      // Setback 0 is load-bearing rather than a corner case: it is what lets a
      // partition reach the door plane, and therefore what makes F12's doors
      // on a partition possible at all.
      const ownFront = setbackOf(item?.front_mm, internalDepth - partitionDepth);
      const ownDepth = Math.max(0, internalDepth - ownFront);
      // ─── TURN 21 (CLAUDE.md F9): ONLY THE SHELF THAT CROSSES IT ──────────
      //
      // Turn 12 handed this call EVERY shelf in the cabinet, so the lowest
      // fixed shelf anywhere truncated every partition everywhere — a shelf in
      // the left bay stopping a partition three bays away — and which shelf
      // won depended on the order they were added in. SPAN decides: a shelf
      // whose run crosses this partition's plane may carry it, and a shelf
      // living inside a bay touches nothing.
      // ─── TURN 24 (CLAUDE.md F3.3): THE PARTITION HAS A SLOT ───────────────
      // Owner: "grubość przegrody się nie zmienia" — a partition is a carcass
      // board standing on its end, and WHICH carcass board is a choice rather
      // than a guess. Carcass 1 is what a partition saved before this turn
      // reads, so nothing that exists is re-cut. Its 3-D, its CNC, the shelf it
      // may stand under and the bay lights all flow from here.
      const slotG = thicknessOf(partitionSlot(item), cfg.thicknesses);
      const crossing = shelfRuns
        .filter((r) => r.item && shelfCrossesPartition(r.run, { x, thickness: slotG }))
        .map((r) => r.item);
      const span = partitionSpan({
        floor: G,
        ceiling: H - G,
        shelves: crossing,
        // The board a partition is INTERRUPTED by is the SHELF's, not its own:
        // `partitionSpan` measures the run between two horizontal boards.
        boardT: G,
        depth: ownDepth,
        fullDepth: internalDepth,
      });
      if (span.height <= 0) break;
      n += 1;
      panels.push(panel({
        id: `VPART-${n}`, part: 'VPART', role: 'shelf', w: span.height, h: span.depth, thickness: slotG,
        // One long edge is seen from the room when the doors are open — the same
        // edge a shelf shows, and it is banded for the same reason.
        edgeCode: codes.right,
        edgeLen: metres(span.height),
        box: {
          x,
          y: span.from,
          z: D - span.front_mm - span.depth,
          w: slotG,
          h: span.height,
          d: span.depth,
        },
        // ─── TURN 24 (CLAUDE.md F8): THE PARTITION LIES ALONG THE GRAIN ────
        //
        // The LISP draws the partition "rotated 90" — `height × depth`, its
        // long side across the page — and the owner's PRODUCTION law wins: the
        // grain runs top-to-bottom like the sides, so the piece lays on the
        // sheet in the SAME convention as BUL and BUR (`depth × height`).
        //
        // The board is the same board and its CUT SIZE has not moved: `w` and
        // `h` above are what the CSV and the BOM print, exactly as a TOP —
        // which has been drawn rotated since turn 1 — prints its own. What
        // changes is the FRAME the outline, the label and every drilled point
        // on this piece are expressed in, and everything downstream of it (the
        // sheet, the per-panel DXF, `engine/joinery.js`'s 3-D placement, the
        // detail window) reads that frame rather than carrying a copy of it.
        cnc: {
          rotated: true,
          drawn_w: span.depth,
          drawn_h: span.height,
          ...rectGeometry(span.depth, span.height),
        },
        meta: {
          index: n,
          vertical: true,
          // Which board this partition is cut from — the panel says so, so the
          // bay lights, the CNC and the properties panel are one answer.
          slot: partitionSlot(item),
          // Turn 21 (CLAUDE.md F12.1): the two physical preconditions for
          // hanging a door on this piece, read off the piece itself.
          fullHeight: span.from <= G + 1e-9 && span.to >= H - G - 1e-9,
          itemId: item.id || null,
          x_mm: x,
          front_mm: span.front_mm,
          // Turn 21 (CLAUDE.md F8): 0 is what a door on this partition needs,
          // and the view and F12 both ask the panel rather than the unit.
          setback: span.front_mm,
          // Which shelf carries it, when one does — the panel says so, and the
          // 3D view can draw the two as one joint rather than two pieces that
          // happen to touch.
          terminatesOn: span.terminatesOn,
        },
      }));
    }
  }

  if (hasRail) {
    panels.push(panel({
      id: 'RAIL-PART', part: 'RAIL-PART', role: 'shelf', w: internalWidth, h: partitionDepth, thickness: G,
      edgeCode: codes.none, edgeLen: 0,
      box: { x: G, y: railPartY, z: G, w: internalWidth, h: G, d: partitionDepth },
      cnc: rectGeometry(internalWidth, partitionDepth),
      meta: { variant: 'fixed', locked: true, front_mm: internalDepth - partitionDepth },
    }));
  }

  if (hasDrawers) {
    if (dpLeft) {
      panels.push(panel({
        id: 'DP-L', part: 'DP', role: 'side', w: drawerPanelD, h: drawerPanelH, thickness: G,
        edgeCode: codes.none, edgeLen: 0,
        box: { x: G + DP.inset, y: G, z: G, w: G, h: drawerPanelH, d: drawerPanelD },
        cnc: rectGeometry(drawerPanelD, drawerPanelH),
        meta: { side: 'L' },
      }));
    }
    if (dpRight) {
      panels.push(panel({
        id: 'DP-R', part: 'DP', role: 'side', w: drawerPanelD, h: drawerPanelH, thickness: G,
        edgeCode: codes.none, edgeLen: 0,
        box: { x: W - G - DP.inset - G, y: G, z: G, w: G, h: drawerPanelH, d: drawerPanelD },
        cnc: rectGeometry(drawerPanelD, drawerPanelH),
        meta: { side: 'R' },
      }));
    }
    const fillerZFront = D - DR.setback - DP.fillerFrontOffset - G;
    const fillerZBack = G;
    let fillerNo = 0;
    for (const side of [dpLeft ? 'L' : null, dpRight ? 'R' : null]) {
      if (!side) continue;
      for (const zPos of [fillerZFront, fillerZBack]) {
        fillerNo += 1;
        panels.push(panel({
          id: `FILLER-${fillerNo}`, part: 'FILLER', role: 'side', w: DP.fillerWidth, h: fillerH, thickness: G,
          edgeCode: codes.none, edgeLen: 0,
          box: {
            x: side === 'L' ? G : W - G - DP.fillerWidth,
            y: G, z: zPos, w: DP.fillerWidth, h: fillerH, d: G,
          },
          cnc: rectGeometry(DP.fillerWidth, fillerH),
          meta: { side },
        }));
      }
    }

    const boxLeftX = G + (dpLeft ? DP.inset + G : 0) + (DR.boxWidthClearance / 2);
    const boxZFront = D - boxSetback;
    // ─── TURN 18 (CLAUDE.md F3): THE SIDES TELL THE TRUTH ────────────────────
    //
    // The owner read the two pockets off his own workshop DXF, and they are the
    // same two the BUDR kit has cut since turn 3 — because it is the same box:
    // the same 18 mm board, the same Blum runner, the same bottom standing in
    // the same groove. A wardrobe's drawer sides went out as bare rectangles,
    // which meant a joiner cutting an internal drawer got a side with nowhere
    // for the bottom to sit and 18 mm of board where the runner needs 16.
    //
    //   RUNNER REDUCTION  the inner face milled 2 mm deep from the BOTTOM EDGE
    //                     up to the groove (0 → 15). "blum tego wymaga" — an 18
    //                     board becomes 16 where the runner lives.
    //   BOTTOM GROOVE     7 mm deep, its lower edge 15 mm above the bottom
    //                     edge, and G + 1 tall so the 18 mm bottom goes in.
    //
    // Both run the full length of the side, `pocketOvershoot` past each end so
    // the cutter enters and leaves off the board.
    //
    // THE ARITHMETIC CLOSES, and that is the check that these are the right
    // numbers rather than plausible ones: `bottomW = boxFrontLen + 13`, and
    // `boxFrontLen` is the gap between the two sides' INNER faces — so the
    // bottom reaches 6.5 mm into a 7 mm groove and half a millimetre of air is
    // left at the bottom of it. Test/turn18-phases.test.js pins the sum.
    //
    // The numbers are `profile.baseDrawerUnit`'s, read from there rather than
    // copied: they were measured off A DRAWER SIDE and not off a base unit's
    // drawer side, so there is one set of them and both kits cut to it.
    // Turn 24 (CLAUDE.md F3.2): the groove is cut to take the BOTTOM, so it is
    // sized by the BOTTOM's board — the BOX slot — and never by the carcass's.
    // "A groove in the side sized by the bottom's G", in the owner's own words.
    const boxSidePockets = (len) => [
      {
        layer: 'DRAWER_RUNNER_POCKET', depth: B.runnerPocketDepth,
        x1: -B.pocketOvershoot, y1: 0, x2: len + B.pocketOvershoot, y2: B.runnerPocketWidth,
      },
      {
        layer: 'DRAWER_BOTTOM_POCKET', depth: B.bottomPocketDepth,
        x1: -B.pocketOvershoot, y1: B.runnerPocketWidth,
        x2: len + B.pocketOvershoot, y2: B.runnerPocketWidth + GB + B.bottomPocketExtra,
      },
    ];
    for (let i = 1; i <= numDrawers; i += 1) {
      const zoneY = G + zoneOffsets[i - 1];
      const sideHeight = boxSideH[i - 1];
      const bfH = boxFrontHs[i - 1];
      // ─── TURN 21 (CLAUDE.md F1.2): THE BOX RIDES THE RUNNER'S BOTTOM ──────
      // The box is set off the runner's UNDERSIDE by ONE number, the same
      // number the BUDR kit below uses, because it is the same runner under
      // the same box. Turn 18 hung this box 9 mm BELOW the drilled row and the
      // BUDR's exactly ON it; turn 20 put both on the row, which is 38 mm above
      // the runner; turn 21 puts both on the runner. One law, three kits.
      // Turn 21 (CLAUDE.md F1.1/F1.2): `zoneY` IS the runner's underside for a
      // wardrobe drawer — `drillSummary.runner_bottoms_carcass_y[i]` — and the
      // box hangs off THAT. Turn 20 added `firstRowFromBottom` here, which is
      // the screw row 38 mm above it, so this box hung 38 mm high too.
      const boxY = zoneY + B.boxAboveRunner;
      // ─── Turn 18 (CLAUDE.md F3.4): WHERE THE BOTTOM ACTUALLY IS ───────────
      // "Front and back of the box STAND ON the bottom", and the bottom stands
      // in the groove — so its underside is `runnerPocketWidth` above the
      // side's bottom edge and the front and back start one board above that.
      // The arithmetic has always agreed (side − 15 − G − 1 is exactly what is
      // left above the groove, less the millimetre of air at the top); it is
      // the PICTURE that had all three boards sitting on the same line.
      const bottomY = boxY + B.runnerPocketWidth;
      // The front and back stand ON the bottom, so this is the BOTTOM's board
      // (turn 24, F3.2) — the box's own, never the carcass's.
      const boxWallY = bottomY + GB;
      // ─── TURN 24 (CLAUDE.md F3.2): ONE NUMBER FOR THE WHOLE BOX ───────────
      // `boxSideThickness` was the box's board and `G` was used for its
      // geometry, which is two answers to one question. The BOX SLOT is the
      // answer now, seeded from `boxSideThickness` so a project that has not
      // been asked cuts exactly what it cut.
      const common = { thickness: GB, edgeCode: codes.none, edgeLen: 0 };
      panels.push(panel({
        id: `D${i}-SL`, part: 'DRAWER-SIDE', role: 'drawer_box', w: szufDl, h: sideHeight, ...common,
        box: { x: boxLeftX, y: boxY, z: boxZFront - szufDl, w: GB, h: sideHeight, d: szufDl },
        // Turn 17 (CLAUDE.md F4.2): which side of the box this board is. The
        // BUDR kit has said so since turn 12; the wardrobe's boxes never did,
        // so with a drawer becoming a piece a joiner can point at, its left and
        // right sides had one name between them.
        cnc: pocketedRect(szufDl, sideHeight, boxSidePockets(szufDl)),
        meta: { drawer: i, side: 'L' },
      }));
      panels.push(panel({
        id: `D${i}-SR`, part: 'DRAWER-SIDE', role: 'drawer_box', w: szufDl, h: sideHeight, ...common,
        box: { x: boxLeftX + szufSzer - GB, y: boxY, z: boxZFront - szufDl, w: GB, h: sideHeight, d: szufDl },
        cnc: pocketedRect(szufDl, sideHeight, boxSidePockets(szufDl)),
        meta: { drawer: i, side: 'R' },
      }));
      panels.push(panel({
        id: `D${i}-BF`, part: 'DRAWER-BOX-FRONT', role: 'drawer_box', w: boxFrontLen, h: bfH, ...common,
        box: { x: boxLeftX + GB, y: boxWallY, z: boxZFront - GB, w: boxFrontLen, h: bfH, d: GB },
        cnc: rectGeometry(boxFrontLen, bfH), meta: { drawer: i },
      }));
      panels.push(panel({
        id: `D${i}-BB`, part: 'DRAWER-BOX-BACK', role: 'drawer_box', w: boxFrontLen, h: bfH, ...common,
        box: { x: boxLeftX + GB, y: boxWallY, z: boxZFront - szufDl, w: boxFrontLen, h: bfH, d: GB },
        cnc: rectGeometry(boxFrontLen, bfH), meta: { drawer: i },
      }));
      panels.push(panel({
        id: `D${i}-DNO`, part: 'DRAWER-BOTTOM', role: 'drawer_box', w: bottomW, h: bottomD, ...common,
        // The bottom is narrower than the box (it sits in grooves in the two
        // sides), so it is CENTRED in it. Hanging it off the left edge made a
        // wide unit look lopsided in 3D while the cut list was right.
        box: { x: boxLeftX + (szufSzer - bottomW) / 2, y: bottomY, z: boxZFront - szufDl, w: bottomW, h: GB, d: bottomD },
        cnc: rectGeometry(bottomW, bottomD), meta: { drawer: i },
      }));
    }

    for (let i = 1; cfg.drawerFronts && i <= numDrawers; i += 1) {
      const zoneY = G + zoneOffsets[i - 1];
      const first = i === 1;
      // The bottom front is shortened to clear the base; the rest are the
      // drawer's own height (LISP: 200 everywhere, 197 for the first).
      const dfH = first ? drawerHeights[0] - DR.firstFrontAdjust : drawerHeights[i - 1];
      const dfY = first ? zoneY + DR.firstFrontAdjust : zoneY;
      panels.push(panel({
        id: `${unitNum}-DF${i}`, part: 'DRAWER-FRONT', role: 'front', w: drawerFrontW, h: dfH, thickness: frontT,
        edgeCode: codes.all, edgeLen: metres(2 * drawerFrontW + 2 * dfH),
        box: { x: boxLeftX - (DR.frontOversize / 2), y: dfY, z: D - DR.setback - frontT, w: drawerFrontW, h: dfH, d: frontT },
        cnc: rectGeometry(drawerFrontW, dfH), meta: { drawer: i },
      }));
    }
  }

  // BUDR: parts grouped by kind (all sides, then all box fronts/backs, then all
  // bottoms, then the fronts) — the order KIT_BUDR_FULL lays out and writes.
  if (budr) {
    // Turn 24 (CLAUDE.md F3.2): the BOX slot, for every board of the box.
    const common = { thickness: GB, edgeCode: codes.none, edgeLen: 0 };
    const boxLeftX = G + B.boxWidthClearance / 2;
    const boxZFront = D - frontT;
    // Turn 17 (CLAUDE.md F4.3): each groove carries its DEPTH. The rectangle is
    // unchanged — same layer, same four corners — so no exported byte moves;
    // what the number does is let the element view and the detail window say how
    // deep the cut is, from the same record the export reads.
    const sidePockets = (len) => [
      {
        layer: 'DRAWER_RUNNER_POCKET', depth: B.runnerPocketDepth,
        x1: 0, y1: -B.pocketOvershoot, x2: B.runnerPocketWidth, y2: len + B.pocketOvershoot,
      },
      {
        layer: 'DRAWER_BOTTOM_POCKET', depth: B.bottomPocketDepth,
        // Sized by the BOTTOM's board, which is what goes in it (turn 24, F3.2).
        x1: B.runnerPocketWidth, y1: -B.pocketOvershoot, x2: B.runnerPocketWidth + GB + B.bottomPocketExtra, y2: len + B.pocketOvershoot,
      },
    ];
    // ─── TURN 21 (CLAUDE.md F1.2): THE BOX RIDES THE RUNNER'S BOTTOM ────────
    // `budr.runnerBottomY[i]` is the line the runner's own underside stands on
    // (flush with the façade's bottom edge, on the carcass floor for drawer 1);
    // the box side's lower edge stands `boxAboveRunner` above it, and the
    // bottom `runnerPocketWidth` above that — 28.5 mm over the runner, which is
    // where a MOVENTO puts a drawer bottom. Turn 20 wrote `runnerRows` here,
    // which is the SCREW row 38 mm higher, so every box hung 38 mm high and the
    // façade's pilots missed the box front's by exactly that.
    for (let i = 1; i <= budr.count; i += 1) {
      const sh = budr.sideHs[i - 1];
      const boxY = budr.runnerBottomY[i - 1] + B.boxAboveRunner;
      for (const [suffix, x] of [['SL', boxLeftX], ['SR', boxLeftX + budr.boxW - GB]]) {
        panels.push(panel({
          id: `D${i}-${suffix}`, part: 'DRAWER-SIDE', role: 'drawer_box', w: budr.depth, h: sh, ...common,
          box: { x, y: boxY, z: boxZFront - budr.depth, w: GB, h: sh, d: budr.depth },
          // Drawn rotated: the LISP lays the side out running along the height.
          cnc: { rotated: true, drawn_w: sh, drawn_h: budr.depth, ...pocketedRect(sh, budr.depth, sidePockets(budr.depth)) },
          meta: { drawer: i, side: suffix === 'SL' ? 'L' : 'R' },
        }));
      }
    }
    for (let i = 1; i <= budr.count; i += 1) {
      const bfH = budr.boxFrontH[i - 1];
      const boxY = budr.runnerBottomY[i - 1] + B.boxAboveRunner;
      for (const suffix of ['BF', 'BB']) {
        const isFront = suffix === 'BF';
        const geom = { rotated: true, drawn_w: bfH, drawn_h: budr.boxLen, ...rectGeometry(bfH, budr.boxLen) };
        if (isFront) {
          geom.holes = [
            { layer: pz.layers.screw, kind: 'screw', x: B.boxScrewFromEdge, y: B.boxScrewFromEdge, d: pz.screwDiameter },
            { layer: pz.layers.screw, kind: 'screw', x: B.boxScrewFromEdge, y: budr.boxLen - B.boxScrewFromEdge, d: pz.screwDiameter },
          ];
        }
        panels.push(panel({
          id: `D${i}-${suffix}`, part: isFront ? 'DRAWER-BOX-FRONT' : 'DRAWER-BOX-BACK', role: 'drawer_box',
          w: budr.boxLen, h: bfH, ...common,
          box: {
            // Turn 18 (CLAUDE.md F3.4): standing ON the bottom, which stands in
            // the groove — the same correction the wardrobe's box gets above,
            // because it is the same box.
            x: boxLeftX + GB, y: boxY + B.runnerPocketWidth + GB,
            z: isFront ? boxZFront - GB : boxZFront - budr.depth,
            w: budr.boxLen, h: bfH, d: GB,
          },
          cnc: geom,
          meta: { drawer: i },
        }));
      }
    }
    for (let i = 1; i <= budr.count; i += 1) {
      const boxY = budr.runnerBottomY[i - 1] + B.boxAboveRunner;
      const geom = rectGeometry(budr.bottomW, budr.depth);
      geom.holes = [];
      for (const x of [B.bottomScrewFromSide, budr.bottomW - B.bottomScrewFromSide]) {
        for (const y of [B.bottomScrewFromEnd, budr.depth - B.bottomScrewFromEnd]) {
          geom.holes.push({ layer: pz.layers.screw, kind: 'screw', x, y, d: pz.screwDiameter });
        }
      }
      panels.push(panel({
        id: `D${i}-DNO`, part: 'DRAWER-BOTTOM', role: 'drawer_box', w: budr.bottomW, h: budr.depth, ...common,
        // Centred in its box, as in the wardrobe: the bottom sits in the side
        // grooves — and since turn 18 (F3.4) it sits at the HEIGHT of them,
        // `runnerPocketWidth` above the sides' bottom edge.
        box: { x: boxLeftX + (budr.boxW - budr.bottomW) / 2, y: boxY + B.runnerPocketWidth, z: boxZFront - budr.depth, w: budr.bottomW, h: GB, d: budr.depth },
        cnc: geom, meta: { drawer: i },
      }));
    }
    // Turn 17 (CLAUDE.md F8.1): with the fronts off, the loop simply does not
    // run — the boxes, their runners and the carcass are exactly what they were.
    for (let i = 1; cfg.drawerFronts && i <= budr.count; i += 1) {
      const fh = budr.heights[i - 1];
      const geom = rectGeometry(budr.frontWidth, fh);
      // The bottom façade runs one CARCASS board lower to cover the floor, so
      // its screw line rises by that board (turn 24, F3.2: the carcass's).
      const screwY = B.frontScrewFromBottom + (i === 1 ? G : 0);
      // …and the 50 is measured from the BOX's own side, which stands one
      // CARCASS board and one BOX board in from the façade's edge. Two boards,
      // two slots — the LISP's `2×G` collapsed them because both measured 18.
      const screwX = B.frontScrewFromSide + G + GB + B.frontScrewExtra;
      geom.holes = [screwX, budr.frontWidth - screwX].map((x) => ({
        layer: B.frontScrewLayer, kind: 'front_screw', x, y: screwY, d: B.frontScrewDiameter,
      }));
      panels.push(panel({
        id: `${unitNum}-F${i}`, part: 'DRAWER-FRONT', role: 'front', w: budr.frontWidth, h: fh, thickness: frontT,
        edgeCode: codes.all, edgeLen: metres(2 * budr.frontWidth + 2 * fh),
        box: { x: B.frontWidthDeduction / 2, y: budr.frontY[i - 1], z: D + P.doors.gap, w: budr.frontWidth, h: fh, d: frontT },
        cnc: geom, meta: { drawer: i },
      }));
    }
  }

  // ── Construction automatics (turn 3, phase 7) ─────────────────────────────
  // The plinth, the scribe fillers and the top infill are CUT PIECES, so they
  // are emitted here and reach the BOM, the CNC sheet and the DXF the same way
  // every other panel does. What they should be is decided by
  // engine/autoparts.js from the room; this only builds them.
  const AP = P.autoParts;
  // ─── The toe kick's height comes from the RUN, not from this unit's legs ───
  //
  // `cfg.legHeight` is 0 for a type that stands on nothing, which is right for
  // LEGS and wrong for the PLINTH: the D/W panel has no legs and the toe kick
  // still runs past it at the height of its neighbours'.
  //
  // ─── TURN 22 (CLAUDE.md F4.1/F4.2): AND IT IS THE RUN'S NUMBER ────────────
  //
  // Turn 17 wrote `|| (type.plinth && !type.legs ? P.baseUnit.legHeight : 0)`
  // — the PROFILE CONSTANT, 100, whatever the project was set to. So a
  // kitchen on 50 mm legs drew its D/W's toe kick at 100 and hung its front
  // 50 mm low, and the field the joiner typed into did nothing. The owner
  // found it with his eyes.
  //
  // The fix is not a D/W special case: a plinth-bearing, leg-less type derives
  // its implied leg height from the SAME source its legged neighbours resolve
  // — `params.leg_height`, which is the project's toe kick pushed onto every
  // unit — with the profile only as the last fallback when nothing is set.
  // `engine/runs.js impliedLegHeight` is that one derivation and `unitBase`
  // and `projectStore.floorYOf` read the very same function, which is what
  // makes the D/W stand IN the run rather than beside it.
  const legHeightForPlinth = standsOnLegHeight(type)
    ? (type.legs ? cfg.legHeight : impliedLegHeight(params, type, P))
    : 0;
  const plinthH = AP.plinth.height ?? legHeightForPlinth;
  // OPT-IN, deliberately: a bare computeCabinet(params) reproduces the LISP
  // kit and nothing else, so the golden fixtures stay the contract they are.
  // The automatics are a PROJECT decision — the store asks for them when a
  // unit is placed in a room (engine/autoparts.js).
  // ─── LEGS AND A PLINTH ARE TWO DIFFERENT QUESTIONS ───
  // They coincided until the D/W panel: legs are how a CARCASS is held off the
  // floor, and a plinth is the toe kick that runs across the FRONT of the room.
  // The D/W panel has no legs — the machine stands where they would be — and
  // the toe kick still runs past it, notched for the appliance. So the gate is
  // its own property, defaulting to `legs` so that every type written before
  // this line behaves exactly as it did.
  const takesPlinth = type.plinth ?? type.legs;
  const wantsPlinth = AP.plinth.enabled && takesPlinth && type.mount === 'floor'
    && params?.plinth === true && plinthH > 0;
  // ─── ONE PLINTH ACROSS A RUN (turn 12, CLAUDE.md F8) ───
  //
  // The toe kick is a RUN element now, exactly as the top infill has been since
  // turn 8: engine/runs.js works out the segments, writes the geometry onto the
  // first unit of each and a note onto the rest, and this reads the answer.
  //
  //   `run_plinth.role === 'owner'`   cut the whole segment's length here
  //   `run_plinth.role === 'member'`  cut nothing; the long piece is next door
  //   no `run_plinth` at all         the single-unit plinth, exactly as before
  //
  // The last line is what keeps a bare `computeCabinet(params)` — every golden
  // fixture, every test that builds one cabinet — producing what it always did.
  // The run element is a PROJECT decision and arrives only from the store.
  const runPlinth = params?.run_plinth || null;
  const plinthMember = runPlinth?.role === 'member';
  const plinthLength = runPlinth?.role === 'owner' ? Number(runPlinth.length) || W : W;
  const plinthX = runPlinth?.role === 'owner' ? Number(runPlinth.offset) || 0 : 0;
  if (wantsPlinth && !plinthMember) {
    const t = AP.plinth.thickness ?? G;
    panels.push(panel({
      id: 'PLINTH', part: 'PLINTH', role: 'plinth', w: plinthLength, h: plinthH, thickness: t,
      edgeCode: codes.topBottom, edgeLen: metres(2 * plinthLength),
      // ─── Turn 11 (CLAUDE.md F5.4): AT THE FRONT ───
      // It was at `z: setback` — 50 mm in from the WALL, which is the back of
      // the cabinet: a toe kick fitted behind the carcass, against the plaster,
      // where nobody would ever see it or kick it. Piotr saw it in the 3D view
      // and said so.
      //
      // A toe kick is a FRONT face, recessed from the door line by the same
      // 50 mm so a boot clears it. The carcass front is at z = D, so the piece's
      // own front face lands at D − setback and its box starts one thickness
      // behind that. The setback number itself is unchanged — it always meant
      // "recessed from the front", and only the sign of it was wrong.
      box: {
        x: plinthX, y: -plinthH, z: D - AP.plinth.setback - t, w: plinthLength, h: plinthH, d: t,
      },
      // ─── Turn 17 (CLAUDE.md F9): THE PLINTH IS CUT OUT AT THAT POSITION ──
      // "The plinth is cut out at that position, 20 mm from the top." An
      // appliance door drops below the worktop and swings forward; the toe kick
      // in front of it has to come away, and the 20 mm strip the owner leaves
      // at the top is what keeps the piece in one length across the opening.
      // It is the OUTLINE that changes and not a pocket, because that is what
      // it is — the board is cut to a shape — and it therefore needs no new
      // layer name on a machine that already reads this one.
      cnc: applianceFront
        ? notchedPlinth(plinthLength, plinthH, -plinthX, W, P.dwPanel.plinthCutFromTop)
        : rectGeometry(plinthLength, plinthH),
      ...(runPlinth?.role === 'owner' ? { meta: { run: true, unitIds: runPlinth.unitIds } } : {}),
    }));
  }

  // ── The bottom masking panel (turn 14, CLAUDE.md F5 / BACKLOG #45) ───────
  //
  // One continuous board under a RUN of wall units: its length the sum of the
  // run's cabinets, its depth the unit depth plus the ten millimetres every
  // cabinet stands off the wall — so it HIDES the standoff instead of stopping
  // at the edge of it, which is the whole reason the piece exists.
  //
  // Same shape of answer as the plinth (engine/runs.js `runMaskParams`), and
  // the same three states: an OWNER cuts the segment's length, a MEMBER cuts
  // nothing, and no run information at all means a run of one — which is what a
  // bare `computeCabinet(params)` sees, so every golden fixture is untouched.
  const runMask = params?.run_mask || null;
  const maskMember = runMask?.role === 'member';
  const wantsMask = type.mount === 'wall' && params?.bottom_mask === true && AP.mask.enabled !== false;
  if (wantsMask && !maskMember) {
    const t = AP.mask.thickness ?? frontT;
    const maskLen = runMask?.role === 'owner' ? Number(runMask.length) || W : W;
    const maskX = runMask?.role === 'owner' ? Number(runMask.offset) || 0 : 0;
    const wallGapMask = maskDepthExtra(P);
    const maskD = runMask?.role === 'owner' ? Number(runMask.depth) || (D + wallGapMask) : D + wallGapMask;
    panels.push(panel({
      id: 'MASK', part: 'MASK', role: 'mask', w: maskLen, h: maskD, thickness: t,
      // The two ends and the FRONT edge are seen — from the room, from below,
      // and from the side at the end of a run. The back edge is against the
      // wall and is the one edge nobody ever looks at.
      edgeCode: codes.all, edgeLen: metres(2 * maskD + maskLen),
      box: {
        x: maskX, y: -t, z: -wallGapMask, w: maskLen, h: t, d: maskD,
      },
      cnc: rectGeometry(maskLen, maskD),
      ...(runMask?.role === 'owner' ? { meta: { run: true, unitIds: runMask.unitIds } } : {}),
    }));
  }

  // ── Top infill: ONE element for the whole run (turn 6, CLAUDE.md F4) ──────
  //
  // Section: a face strip standing on the units and a shelf running back off
  // the top of it, mitred at 45° and glued into an L. What arrives here is
  // engine/runs.js's answer for the RUN — its length, its two end conditions
  // and any returns — resolved from the room and written onto the run's first
  // unit. A unit in the middle of a run carries `{ role: 'member' }` and emits
  // nothing, because the long piece over its head belongs to the run.
  //
  // With no run information at all (a bare computeCabinet call, a fixture, a
  // test), a unit is a run of one and closes itself. That is the same geometry,
  // not a second kind of top infill — there is only one.
  const run = params?.run_top_infill;
  const runInfill = run && typeof run === 'object' && run.role === 'member'
    ? null
    : (run && run.role === 'owner' ? run : soloRun(Number(params?.top_infill_mm) || 0, W, AP));
  if (runInfill) {
    const t = runInfill.thickness ?? AP.topInfill.thickness ?? G;
    const faceH = runInfill.faceH;
    const shelfDepth = runInfill.shelfDepth ?? AP.topInfill.shelfDepth;
    const x0 = runInfill.offset || 0;
    const len = runInfill.length;
    // The face is flush with the doors, exactly as the end panel is (F3) — the
    // three pieces that finish a run stand in ONE plane or the run has a step
    // in it.
    const faceZ = D + P.doors.gap + frontT;
    const ends = runInfill.ends || { left: 'wall', right: 'wall' };
    // A 45° cut on the long edge of both strips is what makes the L; a 45° cut
    // on an END is the picture-frame corner where the piece turns.
    const mitre = (open) => ['long', ...(open ? ['end'] : [])];

    // ─── Turn 15 (CLAUDE.md F6): the corner against a SIDE INFILL ───
    // Where the element stops against a ceiling-height filler, the two stand in
    // one plane and make a frame corner — so the face runs to its LONG POINT
    // over that corner and is cut back at 45°, and the filler loses the
    // matching triangle (see the vertical infill below). `engine/runs.js`
    // decides whether there is room for the cut at all; here it is only ever a
    // number, and 0 is the square corner every run had before this turn.
    //
    // The SHELF is not extended. It runs back at the ceiling and lands on top
    // of the filler's own return arm; extending it would put two pieces of
    // board in the same 18 mm.
    const mitreL = Math.max(0, Number(runInfill.mitre?.left) || 0);
    const mitreR = Math.max(0, Number(runInfill.mitre?.right) || 0);
    const faceX0 = x0 - mitreL;
    const faceLen = len + mitreL + mitreR;

    panels.push(panel({
      id: 'INFILL-T-FACE', part: 'INFILL', role: 'infill', w: faceLen, h: faceH, thickness: t,
      // One long edge is glued into the mitre and takes no banding; the other
      // is the visible bottom edge and does. The LISP code vocabulary has no
      // "one long edge", so the code names the pair and the LENGTH says one.
      edgeCode: codes.topBottom, edgeLen: metres(faceLen),
      box: { x: faceX0, y: H, z: faceZ - t, w: faceLen, h: faceH, d: t },
      // Cut to the long point at a mitred end: the BOTTOM corner is the one
      // that comes away, because the face's top edge is the one that runs on to
      // the wall over the corner.
      cnc: chamferedRectGeometry(faceLen, faceH, { bl: mitreL, br: mitreR }),
      meta: {
        side: 'top', piece: 'face', segment: 'main', ends,
        mitre_45: [...new Set([
          ...mitre(ends.left === 'open'), ...mitre(ends.right === 'open'),
          ...(mitreL || mitreR ? ['end'] : []),
        ])],
        corner: { left: mitreL, right: mitreR },
        units: runInfill.unitIds || null,
      },
    }));
    panels.push(panel({
      id: 'INFILL-T-SHELF', part: 'INFILL', role: 'infill', w: len, h: shelfDepth, thickness: t,
      edgeCode: codes.topBottom, edgeLen: metres(len),
      box: { x: x0, y: H + faceH - t, z: faceZ - t - shelfDepth, w: len, h: t, d: shelfDepth },
      cnc: rectGeometry(len, shelfDepth),
      meta: {
        side: 'top', piece: 'shelf', segment: 'main', ends,
        mitre_45: [...new Set([...mitre(ends.left === 'open'), ...mitre(ends.right === 'open')])],
        units: runInfill.unitIds || null,
      },
    }));

    // The OPEN end (the fourth condition): the element mitres at 45° in plan
    // and carries on along the side of the end cabinet to the back wall — a
    // picture-frame corner made of two strips, which is the only way to finish
    // an end that has nothing to finish against.
    for (const [side, returnDepth] of Object.entries(runInfill.returns || {})) {
      if (!(Number(returnDepth) > 0)) continue;
      const outer = side === 'left' ? x0 : x0 + len;      // the corner, in plan
      const xFace = side === 'left' ? outer : outer - t;
      const xShelf = side === 'left' ? outer + t : outer - t - shelfDepth;
      const tag = side === 'left' ? 'L' : 'R';
      panels.push(panel({
        id: `INFILL-T${tag}-FACE`, part: 'INFILL', role: 'infill', w: returnDepth, h: faceH, thickness: t,
        edgeCode: codes.topBottom, edgeLen: metres(returnDepth),
        box: { x: xFace, y: H, z: faceZ - returnDepth, w: t, h: faceH, d: returnDepth },
        cnc: rectGeometry(returnDepth, faceH),
        meta: { side: 'top', piece: 'face', segment: `return-${side}`, mitre_45: ['long', 'end'] },
      }));
      panels.push(panel({
        id: `INFILL-T${tag}-SHELF`, part: 'INFILL', role: 'infill', w: returnDepth, h: shelfDepth, thickness: t,
        edgeCode: codes.topBottom, edgeLen: metres(returnDepth),
        box: { x: xShelf, y: H + faceH - t, z: faceZ - returnDepth, w: shelfDepth, h: t, d: returnDepth },
        cnc: rectGeometry(returnDepth, shelfDepth),
        meta: { side: 'top', piece: 'shelf', segment: `return-${side}`, mitre_45: ['long', 'end'] },
      }));
    }
  }

  // ─── THE CORNICE (turn 22, CLAUDE.md F1) ─────────────────────────────────
  //
  // The one piece in this engine that produces NO PANEL. A cornice is bought
  // moulding — ordered by the metre from a supplier, not cut from a sheet by
  // this workshop's machine — so it reaches the BOM as HARDWARE (`hw('cornice',
  // …)` below) and the CNC export never hears about it. That is not a
  // shortcut: it is what makes CLAUDE.md F1.4's "fingerprint delta ZERO,
  // fixtures ZERO" a fact. The infill it is fixed to stays the cut piece it
  // already is, unmoved.
  //
  // The geometry is `engine/cornice.js`, and it arrives here the way every run
  // element does: the store works it out for the ROOM and writes it onto the
  // run's first unit (`run_cornice`), members carry a note, and a bare
  // computeCabinet() call is a run of one that closes itself.
  const CO = AP.cornice;
  const corniceRun = params?.run_cornice;
  const corniceHeight = takesCornice(type.id) ? corniceOption(params?.cornice, P) : 0;
  const corniceElement = (() => {
    if (corniceRun && typeof corniceRun === 'object' && corniceRun.role === 'member') return null;
    if (corniceRun && corniceRun.role === 'owner') return corniceRun;
    if (!corniceHeight) return null;
    const projection = corniceProjection(corniceHeight, P);
    if (!(projection > 0)) return null;
    // A run of one, closing itself against the wall at both ends — the same
    // answer `soloRun` gives the top infill, and for the same reason: a
    // cabinet that has never been told about a room is not open at its ends,
    // it simply has no room to be open in.
    const infillHeight = runInfill ? runInfill.faceH : (Number(params?.top_infill_mm) || 0);
    return {
      role: 'owner',
      height: corniceHeight,
      projection,
      offset: 0,
      length: W,
      ends: { left: 'wall', right: 'wall' },
      mitres: { left: false, right: false },
      returns: { left: null, right: null },
      infillHeight,
      rise: corniceRise(corniceHeight, infillHeight),
      unitIds: null,
    };
  })();
  const corniceOrderRow = corniceElement ? corniceOrder(corniceElement, P) : null;

  // End panels (turn 4, BACKLOG #17; rebuilt turn 6, CLAUDE.md F3): a masking
  // panel on the OUTSIDE of a carcass side. A cut piece like any other, so it
  // reaches the BOM, the CNC sheet and the DXF by the same route — and it
  // exists only because somebody added it (`params.end_panels`), never
  // automatically.
  //
  // TURN 6 CHANGES TWO THINGS ABOUT IT.
  //
  // It is FRONT material now (see wearsFrontMaterial): a panel that stands in
  // the room next to the doors is sprayed with the doors, out of the doors'
  // sheet.
  //
  // And it is as DEEP as the doors are proud. Turn 4 made it the depth of the
  // carcass, which stops short of the door face and leaves a step you can catch
  // a sleeve on — the whole point of the piece is that it finishes the run
  // flush. The number is carcass depth + the door standoff + the door's own
  // thickness, which is exactly where the AutoLISP puts the door in top view
  // (`drawDoor` at y0 − doorGap − gruboscDrzwi, KIT_BUD_FULL L128).
  const EP = AP.endPanel;
  // ─── Turn 8 (CLAUDE.md F3) ───
  // Every unit stands `room.wallBackClearance` off the wall behind it, so an
  // end panel that is only as deep as "carcass + door standoff" stops that far
  // short of the wall — and the slot is at eye level down the whole side of the
  // run, which is the one place a masking panel exists to not have.
  //
  // The DELIBERATE inset (`inset_back_mm`) is deliberately NOT added: that gap
  // holds a soil pipe or a bowed wall, and running the panel back into it is
  // running it into the thing it was moved away from.
  const wallGap = Math.max(0, Number(P.room?.wallBackClearance) || 0);
  const endPanelDepth = wallGap + D + P.doors.gap + frontT;
  // ─── Turn 13 (CLAUDE.md F4): A WALL UNIT'S PANEL ENDS WITH THE CABINET ───
  //
  // "To the floor" means down to the floor for something STANDING on it: past
  // the legs. For a hanging cabinet it meant all the way down from the mounting
  // height, which is the owner's bug — a masking panel in mid-air, down a wall
  // that has nothing on it, priced and cut at that height.
  //
  // The rule is `endPanelDrop` in engine/autoparts.js, which reads a per-class
  // default out of the profile and leaves the 'extended' slot open for the
  // door/panel extension below a wall unit (BACKLOG #45).
  const endPanels = Array.isArray(params?.end_panels) ? params.end_panels : [];
  for (const ep of endPanels) {
    const side = ep?.side === 'R' ? 'R' : 'L';
    const t = Number(ep?.thickness) > 0 ? Number(ep.thickness) : (EP.thickness ?? frontT);
    const drop = endPanelDrop({
      height: ep?.height,
      // Turn 16 (CLAUDE.md F4.3): this panel's OWN height below the carcass,
      // which is a different decision from the door's extend beside it and is
      // never read from it.
      below: ep?.below_mm,
      type,
      mountHeight: cfg.mountHeight,
      legHeight: legHeightForPlinth,
      profile: P,
    });
    // How far it runs ABOVE the carcass — dragged there, or sent to the ceiling
    // with a double click (CLAUDE.md F3). The room's ceiling is not the
    // engine's business; the store clamps it and passes the answer down.
    const top = Math.max(0, Number(ep?.top_mm) || 0);
    const panelH = H + drop + top;
    if (panelH <= 0 || t <= 0) continue;
    panels.push(panel({
      id: `END-${side}`, part: 'END-PANEL', role: 'end_panel', w: endPanelDepth, h: panelH, thickness: t,
      edgeCode: codes.all, edgeLen: metres(2 * endPanelDepth + 2 * panelH),
      // `drop > 0 ? -drop : 0` and not `-drop`: negative zero is a real value in
      // JS and a box.y of -0 fails an === check downstream for no reason.
      // …and it therefore STARTS at the wall, which in the unit's own frame is
      // `wallGap` behind the carcass back.
      box: {
        x: side === 'L' ? -t : W,
        y: drop > 0 ? -drop : 0,
        z: wallGap > 0 ? -wallGap : 0,
        w: t,
        h: panelH,
        d: endPanelDepth,
      },
      cnc: rectGeometry(endPanelDepth, panelH),
      meta: {
        side: side === 'L' ? 'left' : 'right',
        // What this piece IS, resolved — so the panel and the label say the
        // same thing the geometry does. A wall unit reads 'carcass' whatever
        // its stored value claims, because that is what was cut (F4).
        height: drop > 0 ? (ep?.height || endPanelHeightDefault(type, P)) : 'carcass',
        top_mm: top,
        // Turn 16 (F4.3): the panel's own drop, as CUT — so the properties
        // block shows what the piece is rather than what was asked for.
        below_mm: drop,
        panelId: ep?.id || null,
      },
    }));
  }

  // ── Vertical infill: an L in section (turn 6, CLAUDE.md F4 / BACKLOG #20) ──
  //
  // Arm B closes the gap in the plane of the doors — the same plane as the end
  // panel and the top infill's face, so the three pieces that finish a run
  // stand on one line. Arm A is screwed to the carcass side and runs back,
  // which is what holds the thing and what stops a scribe strip flexing.
  //
  // Turn 4's version was a flat strip on `decision by Piotr` (BACKLOG #20 says
  // so); turn 6 is the realisation of it.
  //
  // It runs to the FLOOR by default on a standing unit — a filler that stops at
  // the carcass base leaves a slot beside the plinth — and its top edge is
  // draggable exactly like an end panel's (F3).
  const SI = AP.sideInfill;
  const infillFaceZ = D + P.doors.gap + frontT;
  for (const [side, key, topKey] of [
    ['L', 'side_infill_left_mm', 'side_infill_left_top_mm'],
    ['R', 'side_infill_right_mm', 'side_infill_right_top_mm'],
  ]) {
    const infillW = Number(params?.[key]) || 0;
    if (infillW < SI.minWidth) continue;
    const t = SI.thickness ?? G;
    const above = Math.max(0, Number(params?.[topKey]) || 0);
    const below = type.mount === 'wall' ? 0 : Math.max(0, legHeightForPlinth);
    const h = H + above + below;
    const y = below > 0 ? -below : 0;
    const isLeft = side === 'L';
    const label = isLeft ? 'left' : 'right';

    // ─── Turn 15 (CLAUDE.md F6 / BACKLOG #51): THE MITRED CORNER ───
    // Where this filler runs up past the units and a top infill stops against
    // it, the two are the legs of a frame standing in ONE plane, and a frame
    // corner is mitred. The 45° comes off the corner nearest the top infill —
    // the INNER edge, at the top — and the piece's outer edge keeps its full
    // height, which is why the cut piece is still `infillW × h` and only its
    // OUTLINE moves. That outline is this turn's one named CNC delta.
    //
    // `run_top_infill.sideMitre` is the number, worked out for the run in
    // engine/runs.js (`infillCornerMitre`) and handed to the END unit that owns
    // this filler. 0 — every run before this turn, and every filler too narrow
    // to take a 45° at all — is the square corner, byte for byte.
    const cornerMitre = Math.max(0, Number(params?.run_top_infill?.sideMitre?.[label]) || 0);
    const takesMitre = cornerMitre > 0 && cornerMitre <= infillW;

    // Arm B — the face. Spans the gap, flush with the door line.
    panels.push(panel({
      id: `INFILL-${side}-FACE`, part: 'INFILL', role: 'infill', w: infillW, h, thickness: t,
      edgeCode: codes.right, edgeLen: metres(h),
      box: { x: isLeft ? -infillW : W, y, z: infillFaceZ - t, w: infillW, h, d: t },
      // The corner that comes away is the one the top infill is on: the RIGHT
      // of a left-hand filler, the LEFT of a right-hand one — always the inner
      // edge, always at the top.
      cnc: takesMitre
        ? chamferedRectGeometry(infillW, h, isLeft ? { tr: cornerMitre } : { tl: cornerMitre })
        : rectGeometry(infillW, h),
      meta: {
        side: label,
        piece: 'face',
        shape: infillW >= SI.minLWidth ? 'L' : 'strip',
        ...(takesMitre ? { corner: cornerMitre, mitre_45: ['end'] } : {}),
      },
    }));

    // Arm A — the return, screwed to the carcass side, behind the face.
    // Only when the gap is wider than the board: an 18 mm return will not go
    // into a 12 mm gap, and a workshop cutting a 12 mm filler cuts a strip.
    if (infillW >= SI.minLWidth) {
      const armDepth = SI.returnDepth;
      panels.push(panel({
        id: `INFILL-${side}-ARM`, part: 'INFILL', role: 'infill', w: armDepth, h, thickness: t,
        edgeCode: codes.none, edgeLen: 0,
        box: {
          x: isLeft ? -t : W, y,
          z: infillFaceZ - t - armDepth, w: t, h, d: armDepth,
        },
        cnc: rectGeometry(armDepth, h),
        meta: { side: label, piece: 'arm', shape: 'L' },
      }));
    }
  }

  // Door fronts, always last (they close the unit — SPEC 4.10)
  const doorZ = D + P.doors.gap;
  const doorY = -cfg.doorExtend;      // a wall-unit front may run below the box
  // ─── TURN 21 (CLAUDE.md F12): DOORS ON THE PARTITION ─────────────────────
  //
  // Owner's case: partitions at 600 and 800, three bays, two proper doors and
  // one small one in the middle. A full-height partition at setback 0 can carry
  // a door, so the DOORS section offers one PER BAY — and the widths are his
  // own law, which engine/doors.js states and this only places.
  //
  // It is opt-in and it replaces the face doors rather than joining them: a
  // cabinet with per-bay doors has no whole-face door, which is what three
  // doors in three bays means. Nothing here runs for a unit with no partitions,
  // so every golden default is untouched by construction.
  const doorBaysHere = doorBays({
    width: W,
    boardT: G,
    partitions: panels
      .filter((p) => p.part === 'VPART')
      .map((p) => ({
        id: p.id, x: p.meta.x_mm, thickness: p.box.w, fullHeight: p.meta.fullHeight, setback: p.meta.setback,
      })),
  });
  const bayDoors = (type.supports.doors && Array.isArray(params?.bay_doors)
    && bayDoorsAvailable(doorBaysHere))
    ? bayDoorPlan({
      bays: doorBaysHere, modes: params.bay_doors, width: W, gap: P.doors.gap,
    })
    : [];
  for (const leaf of bayDoors) {
    if (!(leaf.width > 0)) continue;
    panels.push(panel({
      id: `${unitNum}-B${leaf.bay + 1}`, part: 'FRONT', role: 'front', w: leaf.width, h: frontH, thickness: frontT,
      edgeCode: codes.all, edgeLen: metres(2 * leaf.width + 2 * frontH),
      box: {
        x: leaf.x, y: doorY, z: doorZ, w: leaf.width, h: frontH, d: frontT,
      },
      cnc: rectGeometry(leaf.width, frontH),
      meta: {
        hinge: leaf.hinge,
        frontType: cfg.frontType,
        bay: leaf.bay,
        // Which piece this leaf is screwed to, and — where that piece is a
        // partition — which of its two faces takes the plate.
        hingeOn: leaf.hingeOn,
        hingeFace: leaf.hingeFace,
      },
    }));
  }

  if (!bayDoors.length && doorCount === 1) {
    panels.push(panel({
      id: `${unitNum}-F`, part: 'FRONT', role: 'front', w: frontW, h: frontH, thickness: frontT,
      edgeCode: codes.all, edgeLen: metres(2 * frontW + 2 * frontH),
      box: { x: P.doors.gap / 2, y: doorY, z: doorZ, w: frontW, h: frontH, d: frontT },
      cnc: rectGeometry(frontW, frontH), meta: { hinge: cfg.hinge, frontType: cfg.frontType },
    }));
  } else if (!bayDoors.length && doorCount === 2) {
    panels.push(panel({
      id: `${unitNum}-FL`, part: 'FRONT', role: 'front', w: frontW, h: frontH, thickness: frontT,
      edgeCode: codes.all, edgeLen: metres(2 * frontW + 2 * frontH),
      box: { x: P.doors.gap / 2, y: doorY, z: doorZ, w: frontW, h: frontH, d: frontT },
      cnc: rectGeometry(frontW, frontH), meta: { hinge: 'L', frontType: cfg.frontType },
    }));
    panels.push(panel({
      id: `${unitNum}-FR`, part: 'FRONT', role: 'front', w: frontW, h: frontH, thickness: frontT,
      edgeCode: codes.all, edgeLen: metres(2 * frontW + 2 * frontH),
      box: { x: W - P.doors.gap / 2 - frontW, y: doorY, z: doorZ, w: frontW, h: frontH, d: frontT },
      cnc: rectGeometry(frontW, frontH), meta: { hinge: 'R', frontType: cfg.frontType },
    }));
  }

  // ── Drills ─────────────────────────────────────────────────────────────────
  const drills = [];
  const addDrill = (panelId, kind, layer, x, y, d) => drills.push({ panel: panelId, kind, layer, x: roundTo(x, 4), y: roundTo(y, 4), d });

  // ─── Turn 13 (CLAUDE.md F8): a MARK is neither a hole nor a pocket ───
  //
  // A mark is an OPEN PATH — a run the cutter makes in and out of, which
  // `drills[]` (circles) and `cnc.pockets` (closed rectangles) cannot express.
  // The third channel on the panel's own CNC record survives this turn; what
  // has gone is its only PRODUCER here.
  //
  // ─── TURN 23 (CLAUDE.md F5) ───
  // The producer was the partition biscuit set, and the LISP does not give the
  // partition one (see the block further down, and engine/partitionFixings.js
  // for the lines). So `computeCabinet` emits no marks at all today. The
  // channel is kept — the writer in `cnc/dxf.js`, the reader in `joinery.js`
  // and the layer in `cnc/layers.js` all stand — because it is what F9's
  // hand-added lines and dowel lines are written into, and because a workshop
  // that reinstates the set changes `profile.biscuits` rather than the file
  // format.

  // Puzzle sockets/screws and every hole a panel already carries
  for (const pnl of panels) {
    for (const hole of pnl.cnc?.holes || []) addDrill(pnl.id, hole.kind, hole.layer, hole.x, hole.y, hole.d);
  }

  // Hinge holes on the hinged carcass sides
  const hingeHolePairs = centres.map((c) => [c - P.hinges.holePairOffset, c + P.hinges.holePairOffset]);
  // Turn 21 (CLAUDE.md F12.2): with doors in the bays it is the LEAVES that
  // say which sides are hinged — an outer bay's door hangs on the carcass
  // exactly as a face door does, and a middle bay's hangs on nothing but its
  // partitions. Drilling `hingedSides` regardless would have bored a plate
  // pattern into a side no door is hung on.
  const platedSides = bayDoors.length
    ? [...new Set(bayDoors.filter((l) => !l.onPartition).map((l) => l.hingeOn))]
    : hingedSides;
  for (const sideId of platedSides) {
    const x = sideId === 'BUR' ? sideW - P.hinges.xFromFrontEdge : P.hinges.xFromFrontEdge;
    for (const pair of hingeHolePairs) {
      for (const y of pair) addDrill(sideId, 'hinge', P.hinges.layer, x, y, P.hinges.holeDiameter);
    }
  }
  // ─── TURN 21 (CLAUDE.md F12.2): THE PLATE PATTERN, ON A NEW PANEL ────────
  //
  // "Hinges on a partition drill the SAME patterns the sides carry: cups in the
  // door (unchanged law), plate ⌀5 pattern in the partition's FACE — the
  // existing plate law on a new panel."
  //
  // Same rows (`hinge_centers`), same ±16 pair, same ⌀5 on HINGES_5MM, same
  // 37 mm from the FRONT edge. What is new is only the FRAME it is measured in:
  // engine/joinery.js places a VPART with u along its HEIGHT and v along its
  // DEPTH from the BACK, so the front edge is `depth` and the height is
  // measured from the partition's own bottom rather than from the carcass
  // floor. The two faces mirror exactly as BUL and BUR do — a part drilled on
  // its right face is the same part turned over — which is why one of them
  // measures 37 from the front and the other `depth − 37`.
  //
  // These are this turn's ONLY new CNC entities, they are a NAMED class
  // (HINGES_5MM on a VPART), and they exist only where a door is actually hung
  // on a partition — never in a golden default.
  for (const leaf of bayDoors) {
    if (!leaf.onPartition) continue;
    const part = panels.find((p) => p.id === leaf.hingeOn);
    if (!part) continue;
    const depth = part.box.d;
    // As DRAWN the machined face is the partition's LEFT one (engine/joinery.js
    // puts its normal at −x) and `v` runs from the BACK edge, so 37 mm from the
    // FRONT is `depth − 37`. A pattern for the RIGHT face is the same part
    // turned over, which mirrors that one axis — exactly the relationship BUL
    // and BUR have carried since turn 1.
    const v = leaf.hingeFace === 'L'
      ? depth - P.hinges.xFromFrontEdge
      : P.hinges.xFromFrontEdge;
    for (const pair of hingeHolePairs) {
      for (const y of pair) {
        // ─── TURN 24 (CLAUDE.md F8) ───
        // The partition lies along the grain now, so its own frame is
        // `depth × height` with x running from the FRONT edge towards the back
        // — the same convention BUL's has always had. `v` is still measured
        // from the BACK (it is the mirror rule that makes one face 37 from the
        // front and the other `depth − 37`), so it becomes `depth − v` here.
        // The row is the carcass's; the height starts at the partition's own
        // bottom, which on a full-height piece is one board up.
        addDrill(part.id, 'hinge', P.hinges.layer, depth - v, y - part.box.y, P.hinges.holeDiameter);
      }
    }
  }

  // ─── Shelf holes, and shelf SCREWS (turn 8, CLAUDE.md F4) ───
  //
  // An adjustable shelf gets what it always got: a column of ⌀7.5 pin holes
  // down each side, three per row, so it can be moved.
  //
  // A FIX shelf gets none of them. It is screwed — three ⌀3 screws through each
  // carcass side, ON THE SHELF'S OWN CENTRE LINE, into the edge of the board.
  // That is the same screw, the same layer and the same three positions the
  // partition above a drawer stack has always used (SCREWS_3MM), because it is
  // the same joint: this is what "fixed" means in the workshop, and pin holes
  // for a shelf that cannot move are holes drilled for nothing.
  const shelfPinRows = [];
  const shelfScrewRows = [];
  for (let i = 0; i < shelfRows.length; i += 1) {
    const item = cfg.shelfItems[i];
    if (isShelfLocked(item)) {
      // The screw row needs the shelf's OWN thickness, because it is drilled on
      // that board's centre line (turn 9, CLAUDE.md F4).
      shelfScrewRows.push({
        y: shelfRows[i],
        thickness: shelfThickness(item, G),
        // Turn 24 (CLAUDE.md F7): the joint runs along the shelf's own DEPTH,
        // so the set has to know which board it is setting out on.
        panel: panels.find((x) => x.part === 'SHELF' && x.meta?.index === i + 1) || null,
      });
    } else {
      shelfPinRows.push(shelfRows[i]);
    }
  }
  for (const sideId of ['BUL', 'BUR']) {
    for (const rowY of shelfPinRows) {
      for (const dy of SH.clusterOffsets) {
        for (const x of shelfHoleX) addDrill(sideId, 'shelf', SH.layer, x, rowY + dy, SH.diameter);
      }
    }
  }

  // ─── THE FIX SHELF GETS THE OWNER'S JOINT (turn 24, CLAUDE.md F7) ─────────
  //
  // Owner: "jak fix, to nie ma 3 poziomów 7,5 — to się wyklucza." A shelf that
  // is screwed in is not a shelf on pins, and turn 8's three ⌀3 screws down the
  // whole length of the side were never the joint he makes.
  //
  // What he makes is the BUTT-JOINT SET turn 13 recorded as his own answer to
  // BLOCKERS #59 (`engine/biscuits.js`): screw ⌀3 → 10 → 70 mm biscuit mark →
  // 10 → screw ⌀3, laid out along the joint line, never closer than 50 mm to an
  // end. Turn 23 took its only consumer away — the LISP does not give a
  // PARTITION one — and this turn gives it the consumer it was written for.
  //
  //   BISCUITS ON BOTH BEARING FACES. The shelf lands on two boards and both
  //   are set out.
  //   THROUGH ⌀3 SCREWS ONLY FROM CARCASS SIDES. A side may be drilled through:
  //   its outer face is against a wall, a neighbouring cabinet or an end panel.
  //   FROM A PARTITION SIDE, BISCUITS ONLY — a partition serves two bays and a
  //   through screw would surface in the neighbour's face.
  //   …and the SHELF's own end takes the mark transferred onto it, because a
  //   3-axis bed cannot reach an end and the set-out has to be on both halves
  //   before anything is glued.
  //
  // ONE WORLD HEIGHT (F7.2). The joint's height is the SIDE's law —
  // `row + shelfT/2`, the board's own centre line — and the partition's pattern
  // is that same world height minus whatever the partition stands above. There
  // is one number and two frames, never two numbers.
  const shelfJointMarks = [];
  const addMark = (panelId, layer, from, to) => shelfJointMarks.push({ panelId, layer, from, to });
  const biscuitLayerNames = biscuitLayers(P);
  for (const row of shelfScrewRows) {
    const shelf = row.panel;
    if (!shelf?.box) continue;
    // THE ONE NUMBER: the world height of the joint.
    const jointY = row.y + row.thickness / 2;
    const depth = shelf.box.d;
    const front = shelf.box.z + depth;          // the shelf's front edge, in z
    const sets = biscuitSets({ length: depth, screws: true, profile: P });
    const noScrewSets = biscuitSets({ length: depth, screws: false, profile: P });

    // ── the two bearers this shelf actually lands on ──
    const bearers = [];
    const runFrom = shelf.box.x;
    const runTo = shelf.box.x + shelf.box.w;
    for (const side of ['BUL', 'BUR']) {
      const panelHere = panels.find((x) => x.id === side);
      if (!panelHere) continue;
      const touchesSide = side === 'BUL'
        ? Math.abs(runFrom - G) < 1e-6
        : Math.abs(runTo - (W - G)) < 1e-6;
      if (touchesSide) bearers.push({ id: side, kind: 'side', panel: panelHere });
    }
    for (const part of panels.filter((x) => x.part === 'VPART' && x.box)) {
      const touches = Math.abs(runTo - part.box.x) < 1e-6
        || Math.abs(runFrom - (part.box.x + part.box.w)) < 1e-6;
      // …and the shelf's joint has to be inside the partition's own run.
      const spans = jointY >= part.box.y - 1e-6 && jointY <= part.box.y + part.box.h + 1e-6;
      if (touches && spans) bearers.push({ id: part.id, kind: 'partition', panel: part });
    }

    for (const bearer of bearers) {
      if (bearer.kind === 'side') {
        // The side's own frame: BUL's x runs from the FRONT of the cabinet
        // towards the back, BUR's runs with z (engine/joinery.js). A point at
        // cabinet z is therefore `D − z` on BUL and `z − G` on BUR.
        const along = (z) => (bearer.id === 'BUL' ? D - z : z - G);
        const at = (t) => along(front - t);
        for (const set of sets) {
          for (const sc of set.screws) {
            addDrill(bearer.id, 'shelf_screw', pz.layers.screw, at(sc), jointY, pz.screwDiameter);
          }
          addMark(bearer.id, biscuitLayerNames.mark, [at(set.mark.from), jointY], [at(set.mark.to), jointY]);
        }
        continue;
      }
      // A PARTITION serves two bays and a through screw would surface in the
      // neighbour's face — so it takes the biscuit alone, in the very same
      // positions, and a joiner reads one pattern on both kinds of joint.
      //
      // Its frame is u along its HEIGHT and v along its DEPTH from the back
      // (engine/joinery.js), so the joint's world height becomes an x in the
      // partition's own frame by subtracting how far it stands above the floor.
      // Turn 24 (CLAUDE.md F8): the partition's frame is `depth × height`, x
      // from the FRONT edge — so the joint's world height is a Y here and the
      // set's distance from the front is the X.
      const y = jointY - bearer.panel.box.y;
      const alongDepth = (t) => t;
      for (const set of noScrewSets) {
        addMark(
          bearer.id,
          biscuitLayerNames.mark,
          [alongDepth(set.mark.from), y],
          [alongDepth(set.mark.to), y],
        );
      }
    }

    // ── and the shelf's own two ends, where the set-out is transferred ──
    const inset = markFromEnd(P);
    for (const [end, endX] of [['L', inset], ['R', shelf.w - inset]]) {
      const has = bearers.some((b) => (end === 'L'
        ? (b.kind === 'side' ? b.id === 'BUL' : Math.abs(runFrom - (b.panel.box.x + b.panel.box.w)) < 1e-6)
        : (b.kind === 'side' ? b.id === 'BUR' : Math.abs(runTo - b.panel.box.x) < 1e-6)));
      if (!has) continue;
      for (const set of noScrewSets) {
        // The shelf is drawn `width × depth` and its own y runs from the BACK,
        // so the set's distance from the FRONT is `depth − t`.
        addMark(shelf.id, biscuitLayerNames.mark, [endX, depth - set.mark.from], [endX, depth - set.mark.to]);
      }
    }
  }
  for (const mark of shelfJointMarks) {
    const target = panels.find((x) => x.id === mark.panelId);
    if (!target) continue;
    target.cnc = target.cnc || {};
    target.cnc.marks = [
      ...(target.cnc.marks || []),
      { layer: mark.layer, from: mark.from.map((v) => roundTo(v, 4)), to: mark.to.map((v) => roundTo(v, 4)) },
    ];
  }

  // Hinge cups + their mounting screws in each door front
  const cups = P.hinges.cups;
  // Turn 17 (CLAUDE.md F9): "no hinges, flat, no door furniture". A D/W panel's
  // face is a FRONT in every way that matters to the BOM, the spray booth and
  // the sheet — and in the one way that would be wrong here it is not a door,
  // so it is not drilled for one. Read off the piece's own `meta`, not off the
  // type, because it is a fact about the PART.
  for (const pnl of panels.filter((x) => x.part === 'FRONT' && !x.meta?.appliance)) {
    const hingeSide = pnl.meta?.hinge || cfg.hinge;
    const cupX = hingeSide === 'L' ? pnl.w - cups.xFromHingeEdge : cups.xFromHingeEdge;
    const holeX = hingeSide === 'L' ? cupX - cups.screwOffsetX : cupX + cups.screwOffsetX;
    for (const y of cupY) {
      addDrill(pnl.id, 'cup', cups.layer, cupX, y, cups.diameter);
      addDrill(pnl.id, 'cup_screw', cups.screwLayer, holeX, y + cups.screwOffsetY, cups.screwDiameter);
      addDrill(pnl.id, 'cup_screw', cups.screwLayer, holeX, y - cups.screwOffsetY, cups.screwDiameter);
    }
  }

  // Runners: on each drawer panel, and on a carcass side only where no drawer panel sits
  const RN = P.wardrobe.runners;
  let runnerCarcassSide = null;
  if (hasDrawers) {
    for (const pnl of panels.filter((x) => x.part === 'DP')) {
      for (const rowY of runnerRowsDp) {
        for (const px of RN.holeXPattern) {
          const x = pnl.meta.side === 'L' ? px + frontT : pnl.w - px - frontT;
          addDrill(pnl.id, 'runner', RN.layer, x, rowY, RN.holeDiameter);
        }
      }
    }
    if (!dpLeft) runnerCarcassSide = 'BUL';
    if (!dpRight) runnerCarcassSide = 'BUR';
    for (const sideId of [dpLeft ? null : 'BUL', dpRight ? null : 'BUR']) {
      if (!sideId) continue;
      for (const rowY of runnerRowsCarcass) {
        for (const px of RN.holeXPattern) {
          const x = sideId === 'BUR' ? sideW - px - boxSetback : px + boxSetback;
          addDrill(sideId, 'runner', RN.layer, x, rowY, RN.holeDiameter);
        }
      }
    }
    // Partition confirmats + drawer-panel fixings
    for (const sideId of ['BUL', 'BUR']) {
      for (const x of [pz.screwFromEnd, sideW / 2, sideW - pz.screwFromEnd]) {
        addDrill(sideId, 'partition_screw', pz.layers.screw, x, partitionCentreY, DP.screwDiameter);
      }
    }
    for (const x of [G + pz.screwFromEnd, W / 2, W - G - pz.screwFromEnd]) {
      addDrill('BACK', 'partition_screw', pz.layers.screw, x, partitionCentreY, DP.screwDiameter);
    }
    if (dpLeft) {
      addDrill('BUL', 'dp_screw', pz.layers.screw, DP.screwDepth, G + pz.screwFromEnd, DP.screwDiameter);
      addDrill('BUL', 'dp_screw', pz.layers.screw, DP.screwDepth, partitionY - pz.screwFromEnd, DP.screwDiameter);
      addDrill('BACK', 'dp_screw', pz.layers.screw, G + DP.inset + G / 2, G + pz.screwFromEnd, DP.screwDiameter);
      addDrill('BACK', 'dp_screw', pz.layers.screw, G + DP.inset + G / 2, partitionY - pz.screwFromEnd, DP.screwDiameter);
    }
    if (dpRight) {
      addDrill('BUR', 'dp_screw', pz.layers.screw, sideW - DP.screwDepth, G + pz.screwFromEnd, DP.screwDiameter);
      addDrill('BUR', 'dp_screw', pz.layers.screw, sideW - DP.screwDepth, partitionY - pz.screwFromEnd, DP.screwDiameter);
      addDrill('BACK', 'dp_screw', pz.layers.screw, W - G - DP.inset - G / 2, G + pz.screwFromEnd, DP.screwDiameter);
      addDrill('BACK', 'dp_screw', pz.layers.screw, W - G - DP.inset - G / 2, partitionY - pz.screwFromEnd, DP.screwDiameter);
    }
  }

  // BUDR: runners on BOTH carcass sides — there is no drawer panel and no door.
  if (budr) {
    runnerCarcassSide = 'both';
    for (const sideId of ['BUL', 'BUR']) {
      for (const rowY of budr.runnerRows) {
        for (const px of RN.holeXPattern) {
          const x = sideId === 'BUR' ? sideW - px : px;
          addDrill(sideId, 'runner', RN.layer, x, rowY, RN.holeDiameter);
        }
      }
    }
  }

  // Wall-unit hangers: two holes per side panel, measured off the back edge.
  if (type.hangers) {
    const HG = P.wallUnit.hangers;
    for (const fromBack of HG.fromBackEdge) {
      addDrill('BUL', 'hanger', HG.layer, sideW - fromBack, H - HG.fromTop, HG.holeDiameter);
      addDrill('BUR', 'hanger', HG.layer, fromBack, H - HG.fromTop, HG.holeDiameter);
    }
  }

  // Sink: holder screws at the top, back-panel screws down the middle.
  if (backStyle === 'inset') {
    for (const sideId of ['BUL', 'BUR']) {
      for (const x of [G / 2, sideW - G / 2]) {
        for (const fromTop of SK.holderScrewFromTop) {
          addDrill(sideId, 'holder_screw', pz.layers.screw, x, H - fromTop, pz.screwDiameter);
        }
      }
      const backX = sideId === 'BUR' ? SK.backScrewFromBackEdge : sideW - SK.backScrewFromBackEdge;
      for (const y of [SK.backScrewFromEnd, H / 2, H - SK.backScrewFromEnd]) {
        addDrill(sideId, 'back_screw', pz.layers.screw, backX, y, pz.screwDiameter);
      }
    }
  }

  // ─── Oven: the two top rails, and the shelf (turn 18, CLAUDE.md F5.2) ─────
  //
  // Two patterns, because the two rails lie differently and a screw goes into
  // the EDGE of the board it holds.
  //
  //   THE BACK RAIL stands on edge, so its edge is 100 mm tall and the screws
  //   go into it down the side panel's back edge — the sink's own two-holder
  //   pattern, 30 and 70 from the top of the carcass.
  //
  //   THE FLAT RAIL's edge is one board thick, so there is ONE row and it is on
  //   the board's centreline (G/2 down from the top, which is the same
  //   centreline every top-edge screw in this app uses — turn 24's F4 took the
  //   half-millimetre off it, everywhere at once). What is
  //   laid out along the rail's WIDTH is the pair — see profile.js
  //   `ovenUnit.topRails.frontScrewFromEdge` for why it is a pair and where the
  //   number comes from.
  if (oven) {
    const TR = P.ovenUnit.topRails;
    // Turn 24 (CLAUDE.md F4): `thicknessOf(part) / 2`, on the SIDE the screw is
    // driven into. No `centrelineExtra`, here or anywhere.
    const S = thicknessOf('BUL', cfg.thicknesses) / 2;
    for (const sideId of ['BUL', 'BUR']) {
      // The side panel's local x runs FRONT (0) → BACK (sideW), the frame
      // engine/puzzle.js draws in, and the sink's holder screws are read the
      // same way.
      for (const fromTop of TR.backScrewFromTop) {
        addDrill(sideId, 'rail_screw', pz.layers.screw, sideW - G / 2, H - fromTop, pz.screwDiameter);
      }
      for (const x of [TR.frontScrewFromEdge, oven.frontRailW - TR.frontScrewFromEdge]) {
        addDrill(sideId, 'rail_screw', pz.layers.screw, x, H - S, pz.screwDiameter);
      }
      // …and the shelf the oven stands on, screwed through the sides on its own
      // centreline exactly as the fridge's fixed panel is.
      for (const fx of [pz.screwFromEnd, sideW - pz.screwFromEnd]) {
        addDrill(sideId, 'fixed_screw', pz.layers.screw, fx, oven.shelfY + G / 2, pz.screwDiameter);
      }
    }
  }

  // Fridge: spurs blocks and the fixed panel, both screwed to the sides.
  if (fridge) {
    for (const sideId of ['BUL', 'BUR']) {
      const blockX = FR.blockScrewFromFront + FR.blockSize / 2 + G;
      const x = sideId === 'BUR' ? sideW - blockX : blockX;
      for (const off of FR.blockScrewOffsets) {
        addDrill(sideId, 'block_screw', pz.layers.screw, x, fridge.fixedPanelY + G + off, pz.screwDiameter);
      }
      addDrill(sideId, 'block_screw', pz.layers.screw, x, H - FR.blockScrewFromTop, pz.screwDiameter);
      for (const fx of [FR.fixedScrewFromEnd, sideW - FR.fixedScrewFromEnd]) {
        addDrill(sideId, 'fixed_screw', pz.layers.screw, fx, fridge.fixedPanelY + G / 2, pz.screwDiameter);
      }
    }
  }

  // Rail bracket + rail partitioner fixings
  if (hasRail) {
    for (const sideId of ['BUL', 'BUR']) {
      addDrill(sideId, 'rail_bracket', pz.layers.screw, sideW / 2, railY, RL.bracketScrewDiameter);
      for (const x of [pz.screwFromEnd, sideW / 2, sideW - pz.screwFromEnd]) {
        addDrill(sideId, 'rail_partition_screw', pz.layers.screw, x, railPartCentreY, RL.bracketScrewDiameter);
      }
    }
    if (backStyle === 'full') {
      for (const x of [G + pz.screwFromEnd, W / 2, W - G - pz.screwFromEnd]) {
        addDrill('BACK', 'rail_partition_screw', pz.layers.screw, x, railPartCentreY, RL.bracketScrewDiameter);
      }
    }
  }

  // ─── PARTITION FIXING (turn 23, CLAUDE.md F5 + F6) ────────────────────────
  //
  // TWO NAMED CNC CLASSES, and they are one correction to the same joint. The
  // whole justification, the LISP lines and the arithmetic are
  // `engine/partitionFixings.js`; what is here is the mapping from a partition
  // to the BACK panel's own frame, which is the part that has to know how a
  // board is drawn.
  //
  //   F5 — THE SUBTRACTION. Turn 13 gave the vertical partition the owner's
  //   butt-joint biscuit set: two ⌀3 screws and a 70 mm mark on the board it
  //   lands on, and the mark transferred onto its own end. The LISP never gave
  //   it one — `drawWDR_PARTITION_PANEL` (KIT_WARDROBE_FULL L254-257) draws an
  //   OUTLINE and a LABEL and nothing else, and no kit in `reference/lisp/`
  //   names `BISCUIT_4MM` anywhere. The block that emitted them is gone, both
  //   halves: the receiver's screws and marks, and the partition's own mark.
  //   "The partition meets floor and top the way the LISP says it does: not by
  //   biscuits."
  //
  //   F6 — THE ADDITION. What DOES hold it, from the same file:
  //   `drawWardrobeDPHolesBACK` (L389-400) screws a drawer-panel partition
  //   through the BACK on its own axis, `SCREWS_3MM`, ⌀3, 50 mm off each end.
  //   The interactive partition is the same piece doing the same job, so it
  //   takes the same joint with the run filled in to the owner's 400 mm cap.
  //
  // A SPLIT partition (turn 21 F9: a crossing fixed shelf splits one) is
  // several VPART panels, and each is its own run — which is F6.2, and falls
  // out of grouping by panel rather than by item.
  //
  // The DP-partition and rail-partitioner back lines above are untouched: they
  // are the LISP's own law for their own pieces, and this adds a class beside
  // them rather than rewriting one.
  const backPanel = panels.find((x) => x.part === 'BACK');
  const verticalPartitions = panels.filter((x) => x.part === 'VPART');
  if (backPanel && verticalPartitions.length) {
    const spec = partitionBackSpec(P);
    const screws = partitionBackScrews(verticalPartitions.map((vp) => ({
      // The partition's own axis — the centre of its thickness, which is where
      // a screw has to be to enter the middle of its edge.
      x: vp.box.x + vp.box.w / 2,
      from: vp.box.y,
      to: vp.box.y + vp.box.h,
    })), P);
    for (const { x, y } of screws) {
      // In the BACK's OWN frame. It stands at the cabinet's origin in every kit
      // that has one today, so this subtracts zero — but a back that is inset
      // (the sink kit's is) would otherwise take its holes in the wrong place,
      // and a coordinate that happens to be right is not a coordinate that is.
      addDrill(
        backPanel.id, 'partition_back_screw', spec.layer,
        x - backPanel.box.x, y - backPanel.box.y, spec.diameter,
      );
    }
  }

  // ── Totals ─────────────────────────────────────────────────────────────────
  const boardPanels = panels.filter((x) => x.material_role === 'board');
  const frontPanels = panels.filter((x) => x.material_role === 'front');
  const drawerFrontCount = panels.filter((x) => x.part === 'DRAWER-FRONT').length;
  const doorFrontCount = panels.filter((x) => x.part === 'FRONT').length;
  // The wardrobe kit leaves RAIL-PART out of its panel count; KIT_LOW_CABINET
  // counts it (L464-465). Per-type, because the kits genuinely disagree.
  const railPartCount = hasRail && !type.countsRailPartInPanels ? 1 : 0;

  const boardArea = boardPanels.reduce((s, x) => s + x.area_m2, 0);
  const frontArea = frontPanels.reduce((s, x) => s + x.area_m2, 0);
  const boardEdging = boardPanels.reduce((s, x) => s + x.edging.len_m, 0);
  const frontEdging = frontPanels.reduce((s, x) => s + x.edging.len_m, 0);

  // ─── TURN 22 (CLAUDE.md F4.2) ─────────────────────────────────────────────
  // How high this carcass STANDS, which is what the 3D, the unit card and the
  // right-hand panel all read. For a legged kit it is its legs; for the D/W
  // panel it is the legs its neighbours stand on, because the machine occupies
  // the floor and the FRONT still has to line up with the run. It was 0, so
  // the D/W's front sat 100 mm low and its toe kick was drawn under the floor.
  //
  // `legHeight` below is the LEG's own dimension and stays exactly what it
  // was: a type with no legs lays none out, whatever it stands on.
  const standHeight = legHeightForPlinth;
  const legHeight = cfg.legHeight;
  const legsPerUnit = type.legs ? legCount(W, P) : 0;
  const legs = type.legs ? legLayout({ width: W, depth: D, boardT: G, height: legHeight }, P) : null;

  // Which fronts a kit folds into its panel count differs by kit, so the type
  // says so. The invariant that DOES hold everywhere: panels_lisp + fronts
  // covers every cut piece the kit knowingly counts.
  const drawerFrontsInPanels = type.countsDrawerFrontsInPanels === false ? 0 : drawerFrontCount;

  const totals = {
    // LISP totalPanels convention: carcass + interior + drawer fronts,
    // door fronts counted separately, RAIL-PART not counted at all.
    panels_lisp: boardPanels.length - railPartCount + drawerFrontsInPanels,
    panels_true_incl_railpart: boardPanels.length + drawerFrontsInPanels,
    pieces_total: panels.length,
    fronts: doorFrontCount + (drawerFrontCount - drawerFrontsInPanels),
    board_area_m2: roundTo(boardArea, 6),
    front_area_m2: roundTo(frontArea, 6),
    area_m2: roundTo(boardArea + frontArea, 6),
    edging_m: roundTo(boardEdging, 6),
    edging_front_m: roundTo(frontEdging, 6),
    edging_total_m: roundTo(boardEdging + frontEdging, 6),
    legs: legsPerUnit,
    hinges: doorCount > 0 ? centres.length * doorCount : 0,
    runner_pairs: numDrawers,
    hangers: type.hangers ? P.wallUnit.hangers.count : 0,
    rail: hasRail ? 1 : 0,
  };

  // ── Hardware ───────────────────────────────────────────────────────────────
  // QUANTITIES from the geometry, never products. Which hinge, which runner and
  // what it costs is an ASSIGNMENT the workshop makes against its own material
  // list (SPEC 4.12 / turn-2 task 5) — the engine only says how many are needed
  // and to what spec. Nothing here touches the cutting list, which stays the
  // LISP format and lists cut parts only.
  const hardware = [];
  const hw = (role, label, qty, unit, spec, specLabel) => {
    if (!(qty > 0)) return;
    hardware.push({ role, label, qty, unit, spec, spec_label: specLabel });
  };

  const runnerLength = budr ? budr.depth : szufDl;

  // ─── TURN 19 (CLAUDE.md F1.2): THE RIGHT ARTICLE, PER DOOR ────────────────
  //
  // The COUNT is untouched — it is `centres.length × doorCount`, the same
  // number the drilling, the 3D bodies and `totals.hinges` have agreed on since
  // turn 3, and `hingeGroups` below adds up to exactly it. What is new is WHICH
  // hinge each of those doors takes:
  //
  //   • the ANGLE is not a choice — the front's thickness decides it, and a
  //     wardrobe door with a drawer behind it takes the 155° so the drawer can
  //     clear the open door;
  //   • the FINISH is the project's (nickel or onyx) and changes the article
  //     and the model, nothing else;
  //   • ONE DOOR may have been given a hinge by hand, and that wins.
  //
  // Doors that resolve to the SAME hinge are one BOM line, which is what keeps
  // an ordinary cabinet on the single line it has had since turn 3; a cabinet
  // whose two leaves are fitted differently gets two, because they are two
  // things to buy. With no catalogue read every door resolves to the same
  // "nothing known", the grouping collapses to one line, and the spec is
  // byte-for-byte what it was before this turn.
  const doorPanels = panels.filter((pn) => pn.part === 'FRONT' && pn.role === 'front');
  const innerDrawer = type.family === 'wardrobe' && numDrawers > 0;
  const hingeGroups = new Map();
  if (doorCount > 0 && centres.length > 0) {
    // A kit whose door panels are not one-per-door (a fridge housing's fixed
    // face, a kit that has had its fronts taken off) still buys hinges for the
    // doors the engine counted — so the LIST is padded to `doorCount` with the
    // cabinet's own answer rather than shrinking the order to the panels.
    const doors = doorPanels.length === doorCount ? doorPanels : [];
    const keys = doors.length ? doors : Array.from({ length: doorCount }, () => null);
    for (const pnl of keys) {
      const spec = resolveDoorHinge({
        assigned: pnl ? doorHingeAssignment({ door_hinges: cfg.doorHinges }, pnl.id) : null,
        frontThickness: frontT,
        innerDrawer,
        finish: cfg.hingeFinish,
      });
      const key = `${spec.angle ?? ''}|${spec.finish ?? ''}|${spec.family ?? ''}|${spec.assigned ? 'a' : 'r'}`;
      const bucket = hingeGroups.get(key);
      if (bucket) bucket.doors += 1;
      else hingeGroups.set(key, { spec, doors: 1 });
    }
  }
  for (const { spec, doors } of hingeGroups.values()) {
    hw('hinges', 'Hinges', centres.length * doors, 'pcs',
      {
        per_door: centres.length,
        doors,
        cup_diameter_mm: cups.diameter,
        // Additive, every one of them: a caller that only ever read `per_door`
        // and `doors` reads exactly what it always did.
        angle: spec.angle,
        family: spec.family,
        article: spec.article,
        articles: spec.articles,
        finish: spec.finish,
        system: cfg.hingeSystemLabel,
        assigned: spec.assigned,
      },
      hingeSpecLabel({
        perDoor: centres.length,
        doors,
        angle: spec.angle,
        finish: spec.finish,
        article: spec.article,
        systemLabel: cfg.hingeSystemLabel,
        assigned: spec.assigned,
      }));
  }
  // ─── TURN 18 (CLAUDE.md F6.4/F6.7): THE PAIR IS A PRODUCT ────────────────
  //
  // The length has been on this line since turn 3 and it stays exactly where it
  // is — `spec.length_mm` is what engine/hardware3d.js falls back to and what
  // the fixtures pin. What joins it is WHICH RUNNER: the system, the variant
  // this job or this cabinet is fitted with, and the two article numbers, which
  // come out of the manifest the owner uploaded beside his models and are null
  // where nobody has read it (engine/runners.js — the engine never fetches).
  //
  // Nothing here branches the GEOMETRY on the variant, and that is the point:
  // Blum's own installation page says the pattern does not change with the
  // motion technology, so a T and an S drawer are cut identically and differ
  // only in what is bought.
  //
  // PER DRAWER, PER VARIANT (F6.7). One drawer of a stack may be fitted
  // differently from the one above it, and a parts list that averaged them
  // would order the wrong runner for one of them — so the stack is grouped by
  // what each drawer actually takes, and a cabinet whose drawers all agree
  // still gets the single line it has had since turn 3.
  const runnerDesign = { runners: { variant: params?.project_runner_variant ?? null } };
  const byVariant = new Map();
  for (let i = 1; i <= numDrawers; i += 1) {
    const v = resolveRunnerVariant({
      drawer: i, unit: { params }, design: runnerDesign, profile: P,
    });
    byVariant.set(v, (byVariant.get(v) || 0) + 1);
  }
  for (const [variant, qty] of byVariant) {
    const spec = runnerPairSpec({ nl: runnerLength, variant, profile: P });
    hw('runner_pairs', 'Drawer runners', qty, 'pairs',
      { length_mm: runnerLength, ...spec },
      runnerLength
        ? [`${roundTo(runnerLength, 0)} mm`, `MOVENTO ${spec.system}`, spec.variant,
          spec.complete ? `${spec.articles.L} / ${spec.articles.R}` : null]
          .filter(Boolean).join(' · ')
        : '');
  }
  // ─── The synchronisation rod (F6.5) ───
  // A wide drawer's two runners are tied together so the box cannot rack.
  // Blum's thresholds are on the cabinet OPENING width and the rod's own length
  // is parametric — the box, less the ends its adapters take up.
  const rod = numDrawers > 0
    ? syncRodFor({
      openingWidth: internalWidth,
      boxWidth: budr ? budr.boxW : szufSzer,
      profile: P,
    })
    : { fitted: false, kind: 'none', length: null };
  hw('runner_sync_rods', 'Runner synchronisation rods', rod.fitted ? numDrawers : 0, 'pcs',
    { kind: rod.kind, length_mm: rod.length, opening_mm: internalWidth },
    rod.fitted ? `${roundTo(rod.length, 0)} mm · ${rod.kind === 'narrow' ? 'narrow' : 'with adapters'}` : '');
  hw('legs', 'Legs', legsPerUnit, 'pcs',
    { height_mm: legHeight, corners: P.legs.cornerCount, centre: legsPerUnit > P.legs.cornerCount },
    legHeight ? `${roundTo(legHeight, 0)} mm` : '');
  // The rail the workshop actually chose travels with the item (turn 4,
  // BACKLOG #14), so the hardware line is a thing you can order and not just a
  // length. Two different rails in one project stay two BOM rows, because the
  // hardware merge key is role + spec label.
  const railProduct = params?.rail_material_label ? String(params.rail_material_label) : '';
  hw('rail', 'Hanging rail', hasRail ? 1 : 0, 'pcs',
    { length_mm: internalWidth, material_id: params?.rail_material_id ?? null },
    [`${roundTo(internalWidth, 0)} mm`, railProduct].filter(Boolean).join(' · '));
  hw('shelf_pins', 'Shelf pins', numShelves * SH.pinsPerShelf, 'pcs',
    { diameter_mm: SH.diameter, per_shelf: SH.pinsPerShelf }, `⌀${SH.diameter}`);
  hw('hangers', 'Wall hangers', type.hangers ? P.wallUnit.hangers.count : 0, 'pcs',
    { hole_diameter_mm: P.wallUnit.hangers.holeDiameter }, `⌀${P.wallUnit.hangers.holeDiameter}`);
  // ─── Turn 22 (CLAUDE.md F1.4): THE CORNICE IS ORDERED, NOT CUT ───────────
  // Linear metres — the front, the returns and the allowance a 45° corner
  // costs — against the moulding's own profile number, so two heights in one
  // job stay two order lines (the hardware merge key is role + spec label).
  hw('cornice', 'Cornice moulding', corniceOrderRow?.metres || 0, 'm',
    corniceOrderRow ? {
      height_mm: corniceElement.height,
      projection_mm: corniceElement.projection,
      front_mm: corniceOrderRow.front_mm,
      returns_mm: corniceOrderRow.returns_mm,
      corners: corniceOrderRow.corners,
      allowance_mm: corniceOrderRow.allowance_mm,
    } : {},
    corniceElement
      ? `${corniceElement.height} mm bead-and-cove · ${corniceElement.projection} mm projection`
      : '');

  // ── Derived (key names match the golden fixtures) ──────────────────────────
  // ─── Per-element overrides (turn 11, CLAUDE.md F3.1) ───
  //
  // Turn 9 gave a SHELF three answers of its own — how far back it stands, how
  // thick it is, what it is made of — and hung them on the shelf's ITEM, which
  // is the unit's own config. Turn 11 extends the third of those to every piece
  // in the cabinet, and there is no item to hang it on: a side panel, a top, a
  // back, an end panel and an infill are all built BY the engine from the
  // carcass, so what a project can say about one is keyed by the panel id the
  // engine itself gave it.
  //
  // MATERIAL ONLY, deliberately, and the reason is the joint. A carcass is held
  // together by tabs cut for a board of `board_t`: the tab's own width is G, the
  // socket's centre line is G/2 + 0.5, and the dog-bone relief is sized off both
  // (engine/puzzle.js). A 22 mm side in an 18 mm carcass is not a thicker side,
  // it is a joint that does not go together — so the panel offers that piece's
  // BOARD and says why, rather than a field that would cut wood nobody can
  // assemble. See BLOCKERS #58. What a piece is MADE of changes no geometry at
  // all, which is exactly why it can be said about anything.
  //
  // A DESIGN-layer input like every other one in this list, so a bare
  // computeCabinet() with none of them set cuts what the AutoLISP kit cuts.
  const elementOverrides = params?.element_overrides;
  // What the project asked to be taken off, so the result can SAY so — a piece
  // that has silently vanished from a cut list is a piece somebody will look
  // for on the bench.
  const removedParts = [];
  if (elementOverrides && typeof elementOverrides === 'object') {
    for (const p of panels) {
      const o = elementOverrides[p.id];
      if (!o || (!o.material_label && !o.material_id && !o.material_key)) continue;
      p.meta = {
        ...(p.meta || {}),
        material_id: o.material_id ?? null,
        material_label: o.material_label ? String(o.material_label) : null,
        // Turn 16 (CLAUDE.md F1.3): which PALETTE ROW was chosen. The id and
        // the label say what the board is called; the key says which of the
        // project's slots it came from, which is the only thing that can tell
        // two identically-named front types apart — and it is what the 3D view
        // resolves a surface from (F1.4).
        material_key: o.material_key ? String(o.material_key) : null,
      };
    }
    // ─── Turn 14 (CLAUDE.md F8.2): an AUTO PART moved, or taken off ─────────
    //
    // "Removal/move of an auto part is a design-layer override on the unit
    // (paramsForEngine), never an engine fork; BOM follows."
    //
    // Both are the same channel a material override already travels in, and
    // both are applied HERE, at the end, after every kit rule has had its say.
    // That is what makes them design-layer: the kit builds what the AutoLISP
    // builds, and the project then says what it wants doing with it. A removed
    // piece is simply not in `panels`, so the BOM, the CSV, the sheet and the
    // DXF all follow with nothing told to any of them.
    //
    // WHETHER a piece may be removed or moved is `engine/elements.js
    // elementActions` and is asked in the UI; the engine honours what it is
    // given, which is the same division of labour every override here has.
    for (const p of panels) {
      const move = elementOverrides[p.id]?.move;
      if (!move || !p.box) continue;
      p.box = {
        ...p.box,
        x: roundTo(p.box.x + (Number(move.x) || 0), 4),
        y: roundTo(p.box.y + (Number(move.y) || 0), 4),
        z: roundTo(p.box.z + (Number(move.z) || 0), 4),
      };
      p.meta = { ...(p.meta || {}), moved: { x: Number(move.x) || 0, y: Number(move.y) || 0, z: Number(move.z) || 0 } };
    }
    const dropped = panels.filter((p) => elementOverrides[p.id]?.removed === true).map((p) => p.id);
    if (dropped.length) {
      const gone = new Set(dropped);
      for (let i = panels.length - 1; i >= 0; i -= 1) if (gone.has(panels[i].id)) panels.splice(i, 1);
      removedParts.push(...dropped);
    }
  }

  const derived = {
    ...(removedParts.length ? { removed_parts: removedParts } : {}),
    doors: doorCount,
    internal_width: internalWidth,
    internal_depth: internalDepth,
    ...(doorCount === 2 ? { door_width: frontW } : {}),
    ...(cfg.doorExtend ? { door_extend_mm: cfg.doorExtend } : (type.doorExtend ? { door_extend_mm: 0 } : {})),
    ...(hasDrawers ? {
      numDrPanels,
      dp_side: numDrPanels === 1 ? (dpLeft ? 'L' : 'R') : 'LR',
      drawerReduction,
      szufMaxDl,
      szufDl,
      szufSzer,
      drawerFrontW,
      drawerTotalH,
      partition_bottom_y: partitionY,
      drawerPanelH,
      drawerPanelD,
      boxFrontLen,
      // Scalars stay the drawer-1 value so a uniform stack reads exactly as it
      // always did; the per-drawer lists next to them are the whole truth.
      boxFrontH: boxFrontHs[0],
      bottom_w: bottomW,
      bottom_d: bottomD,
      drawer_heights: [...drawerHeights],
      drawer_front_y: zoneOffsets.map((o, i) => roundTo(G + o + (i === 0 ? DR.firstFrontAdjust : 0), 4)),
      drawer_front_h: drawerHeights.map((h, i) => roundTo(i === 0 ? h - DR.firstFrontAdjust : h, 4)),
      drawer_box_side_h: [...boxSideH],
      drawer_box_front_h: [...boxFrontHs],
    } : {}),
    ...(budr ? {
      // The height the fronts share out, once every gap is taken out of it. It
      // follows the VARIANT's count (turn 12, F3.2), not the kit's own three.
      available_h: H - budr.count * B.gap,
      front_heights: [...budr.heights],
      szufMaxDl: budr.maxDl,
      szufDl: budr.depth,
      szufSzer: budr.boxW,
      drawer_front_w: budr.frontWidth,
      boxFrontLen: budr.boxLen,
      drawer_box_side_h: [...budr.sideHs],
      drawer_box_front_h: [...budr.boxFrontH],
      bottom_w: budr.bottomW,
      bottom_d: budr.depth,
      drawer_front_y: [...budr.frontY],
      drawer_heights: [...budr.heights],
    } : {}),
    ...(hasRail ? { rail_y: railY, rail_partition_y: railPartY } : {}),
    ...(sinkBack ? { back_w: sinkBack.w, back_h: sinkBack.h, holder_w: internalWidth, holder_h: SK.railHeight } : {}),
    ...(fridge ? {
      fixed_panel_y: fridge.fixedPanelY,
      spurs_zone_h: fridge.spursH,
      back_top_w: W,
      back_top_h: fridge.backTopH,
      spurs_w: fridge.spursW,
      spurs_h: fridge.spursPanelH,
    } : {}),
  };

  const drillSummary = {
    hinge_centers: doorCount > 0 ? centres.map((v) => roundTo(v, 4)) : [],
    side_hinge_holes_y: doorCount > 0 ? hingeHolePairs.map((pair) => pair.map((v) => roundTo(v, 4))) : [],
    side_hinge_holes_x: P.hinges.xFromFrontEdge,
    hinged_sides: bayDoors.length ? bayDoors.map((l) => l.hingeOn) : hingedSides,
    front_cup_y: cupY.map((v) => roundTo(v, 4)),
    front_cup_x_from_hinge_edge: cups.xFromHingeEdge,
    shelf_row_y: shelfRows.map((v) => roundTo(v, 4)),
    shelf_cluster_y: shelfPinRows.map((row) => SH.clusterOffsets.map((dy) => roundTo(row + dy, 4))),
    shelf_hole_x: shelfHoleX,
    // Turn 8 (F4): which rows are PINNED and which are SCREWED. `shelf_row_y`
    // stays every shelf, because it is where the shelves ARE and the drawings
    // dimension it; these two say how each one is held.
    shelf_pin_row_y: shelfPinRows.map((v) => roundTo(v, 4)),
    // On the SHELF's own centre line, not the carcass board's — a shelf
    // somebody made 25 mm is screwed through its own middle (turn 9, F4).
    shelf_screw_row_y: shelfScrewRows.map((r) => roundTo(r.y + r.thickness / 2, 4)),
    shelf_screw_x: [pz.screwFromEnd, sideW / 2, sideW - pz.screwFromEnd],
    runner_rows_dp_y: runnerRowsDp,
    runner_rows_carcass_y: budr ? [...budr.runnerRows] : runnerRowsCarcass,
    // ─── TURN 21 (CLAUDE.md F1.1/F1.3) ────────────────────────────────────
    // The runner's own UNDERSIDE — not a drilling, which is why it is named
    // apart from every `*_rows_*` key beside it. Two readers: the drawer box
    // (engine, above) and the runner MODEL (3d, engine/hardware3d.js), both of
    // which stand ON the runner rather than on its screws. The screw rows keep
    // the carcass drilling and the runner hole pattern, unchanged.
    runner_bottoms_dp_y: budr ? [] : runnerBottomsDp,
    runner_bottoms_carcass_y: budr ? [...budr.runnerBottomY] : runnerBottomsCarcass,
    runner_carcass_side: runnerCarcassSide,
    runner_hole_x: [...RN.holeXPattern],
    ...(budr ? {
      drawer_front_screw_x: [
        B.frontScrewFromSide + 2 * G + B.frontScrewExtra,
        budr.frontWidth - (B.frontScrewFromSide + 2 * G + B.frontScrewExtra),
      ],
      drawer_front_screw_y_per_drawer: budr.heights.map((_, i) => B.frontScrewFromBottom + (i === 0 ? G : 0)),
    } : {}),
    ...(type.hangers ? {
      hanger_holes_bul: P.wallUnit.hangers.fromBackEdge.map((f) => [sideW - f, H - P.wallUnit.hangers.fromTop]),
      hanger_holes_bur: P.wallUnit.hangers.fromBackEdge.map((f) => [f, H - P.wallUnit.hangers.fromTop]),
      hanger_hole_d: P.wallUnit.hangers.holeDiameter,
    } : {}),
    ...(backStyle === 'inset' ? {
      back_screw_x_bul: sideW - SK.backScrewFromBackEdge,
      back_screw_y: [SK.backScrewFromEnd, H / 2, H - SK.backScrewFromEnd],
      holder_screw_x: [G / 2, sideW - G / 2],
      holder_screw_y: SK.holderScrewFromTop.map((f) => H - f),
      bottom_screw_x: [pz.screwFromEnd, sideW / 2, sideW - pz.screwFromEnd],
      bottom_screw_y: thicknessOf('BOTTOM', cfg.thicknesses) / 2,
    } : {}),
    ...(fridge ? {
      block_screw_x_bul: FR.blockScrewFromFront + FR.blockSize / 2 + G,
      block_screw_y: [
        fridge.fixedPanelY + G + FR.blockScrewOffsets[0],
        fridge.fixedPanelY + G + FR.blockScrewOffsets[1],
        H - FR.blockScrewFromTop,
      ],
      fixed_screw_x: [FR.fixedScrewFromEnd, sideW - FR.fixedScrewFromEnd],
      fixed_screw_y: fridge.fixedPanelY + G / 2,
    } : {}),
    ...(hasRail ? {
      rail_bracket_y: railY,
      rail_partition_screw_y: railPartCentreY,
      rail_partition_screw_x_sides: [pz.screwFromEnd, sideW / 2, sideW - pz.screwFromEnd],
      rail_partition_screw_x_back: [G + pz.screwFromEnd, W / 2, W - G - pz.screwFromEnd],
    } : {}),
  };

  // ── Assemblies for the 3D view ─────────────────────────────────────────────
  const assemblies = {
    carcass: { w: W, h: H, d: D, legHeight: standHeight },
    mount: type.mount,
    mountHeight: type.mount === 'wall' ? cfg.mountHeight : 0,
    legs,
    rail: hasRail ? { y: railY, x1: G, x2: W - G, z: D - DR.setback } : null,
    drawerZone: hasDrawers ? { top: partitionY, count: numDrawers, heights: [...drawerHeights] } : null,
    drawerFronts: budr
      ? budr.heights.map((h, i) => ({ index: i + 1, y: budr.frontY[i], h, w: budr.frontWidth }))
      : (hasDrawers
        ? drawerHeights.map((h, i) => ({
          index: i + 1,
          y: G + zoneOffsets[i] + (i === 0 ? DR.firstFrontAdjust : 0),
          h: i === 0 ? h - DR.firstFrontAdjust : h,
          w: drawerFrontW,
        }))
        : []),
    // The 3D view reads this for the hover readout: where each shelf is, how it
    // is held, and whether it may be dragged (turn 8, F4).
    shelves: shelfRows.map((y, i) => ({
      index: i + 1,
      y,
      variant: shelfVariant(cfg.shelfItems[i]),
      locked: isShelfLocked(cfg.shelfItems[i]),
      itemId: cfg.shelfItems[i]?.id || null,
      // Turn 9 (CLAUDE.md F4): what this one is actually made of. The drawings
      // and the readouts take it from here rather than assuming the carcass
      // board, which is how a 25 mm shelf came out drawn 18 mm thick.
      thickness: shelfThickness(cfg.shelfItems[i], G),
      front_mm: setbackOf(cfg.shelfItems[i]?.front_mm, C.shelfDepthClearance),
    })),
    fridge: fridge ? { fixedPanelY: fridge.fixedPanelY, fridgeH: cfg.fridgeH } : null,
    // ─── Turn 22 (CLAUDE.md F1) ───
    // The cornice, for the 3D and for the readouts. It is on `assemblies`
    // rather than in `panels` because it is not a cut piece — a panel here
    // would put it on the CNC sheet, in the cut list and in the DXF, which is
    // three places a bought moulding must never appear.
    cornice: corniceElement ? {
      ...corniceElement,
      // Where the piece lives in this unit's own frame: its bottom edge at
      // door-top level (the carcass top), its back face in the door plane.
      carcassTop: H,
      doorPlane: D + P.doors.gap + frontT,
      backZ: -Math.max(0, Number(P.room?.wallBackClearance) || 0),
      order: corniceOrderRow,
    } : null,
  };

  return {
    type: type.id,
    unitNum,
    params: {
      width: W, height: H, depth: D, board_t: G, front_t: frontT,
      front_type: cfg.frontType, hinge: cfg.hinge, doors: doorCount,
      shelves: numShelves, drawers: numDrawers, drawer_heights: [...(budr ? budr.heights : drawerHeights)],
      rail: hasRail, rail_offset: cfg.railOffset,
      ...(type.doorExtend ? { door_extend: cfg.doorExtend } : {}),
      ...(fridge ? { fridge_h: cfg.fridgeH } : {}),
      ...(type.mount === 'wall' ? { mount_height: cfg.mountHeight } : {}),
    },
    derived,
    panels,
    drills,
    drillSummary,
    hardware,
    totals,
    csvLines: buildCsvLines(unitNum, panels, P),
    warnings,
    assemblies,
  };
}

// ─── Cutting-list CSV (byte-identical to the LISP SKYLON_labels.csv rows) ───

export function buildCsvLines(unitNum, panels, profile) {
  const { dimDecimals: dd, edgingDecimals: ed, areaDecimals: ad } = profile.csv;
  return panels.map((p) => [
    unitNum,
    p.id,
    rtos(p.w, dd),
    rtos(p.h, dd),
    p.edging.code,
    p.edging.code ? rtos(p.edging.len_m, ed) : '0',
    rtos(p.area_m2, ad),
  ].join(','));
}
