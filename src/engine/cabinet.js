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
import { areaM2, metres, roundTo, rtos } from './format.js';
import {
  sidePanelGeometry, topPanelGeometry, backPanelGeometry, socketPanelGeometry, rectGeometry,
} from './puzzle.js';

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
 * The BUDR front stack: heights split by the profile ratio (4:3:2) over the
 * height left once every gap is taken out. KIT_BUDR_FULL L616-619.
 */
export function budrFrontHeights(height, profile) {
  const B = profile.baseDrawerUnit;
  const total = B.ratio.reduce((s, r) => s + r, 0);
  const available = Number(height) - B.ratio.length * B.gap;
  return B.ratio.map((r) => lispRound((available * r) / total));
}

// ─── Parameter normalisation ───

function normalizeParams(raw, profile) {
  const p = raw || {};
  const type = getUnitType(p.type);
  const G = Number(p.board_t) || profile.board.thickness;
  const frontT = Number(p.front_t) || profile.front.thickness;
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

  let drawers = 0;
  if (type.drawerStyle === 'budr') {
    // KIT_BUDR_FULL is always a three-drawer unit: the ratio IS the stack.
    drawers = profile.baseDrawerUnit.ratio.length;
  } else if (type.supports.drawers && !drawerCountBad) {
    drawers = items.length
      ? drawersFromItems.length
      : clampInt(drawerCountRaw, 0, profile.wardrobe.drawers.maxCount);
  }

  // Drawers are stacked bottom-up, so drawer i's height has to belong to the
  // same physical drawer as runner row i and drawer front i. `index` is the
  // authority when the editor supplies it; otherwise array order stands.
  const drawerItems = [...drawersFromItems].sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0));
  const drawerHeights = type.drawerStyle === 'budr'
    ? budrFrontHeights(height, profile)
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
    G,
    frontT,
    frontType: p.front_type || profile.front.defaultType,
    unitNum: p.unit_num == null ? '01' : String(p.unit_num),
    hinge,
    doorCount,
    doorExtend,
    shelves,
    shelfItems,
    shelfPositions,
    drawers,
    drawerItems,
    drawerHeights,
    rail,
    railOffset: Number(p.rail_offset ?? railDefault),
    fridgeH: Number(p.fridge_h ?? profile.fridgeUnit.defaults.fridgeH),
    mountHeight: Number(p.mount_height ?? profile.wallUnit.defaults.mountHeight),
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

// ─── Panel record helper ───

function panel({ id, part, role, w, h, thickness, edgeCode, edgeLen, box, cnc, meta }) {
  return {
    id,
    part,
    role,
    material_role: role === 'front' ? 'front' : 'board',
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

  const { width: W, height: H, depth: D, G, frontT, type, unitNum } = cfg;
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
  const shelfW = W - C.shelfWidthBoards * G - C.shelfWidthClearance;
  // The sink's back panel sits 50 mm forward INSIDE the carcass, so its shelves
  // lose that much depth plus the panel itself (KIT_SINK L425-426).
  const SK = P.sinkUnit;
  const shelfH = D - C.shelfDepthBoards * G - C.shelfDepthClearance
    - (backStyle === 'inset' ? SK.backSetback + G : 0);

  // ── Doors ──────────────────────────────────────────────────────────────────
  const doorCount = cfg.doorCount;
  const frontH = H - P.doors.gap + cfg.doorExtend;
  const frontW = doorCount === 2
    ? (W - P.doors.doubleTotalGap) / 2
    : W - P.doors.gap;
  const hingedSides = doorCount === 2 ? ['BUL', 'BUR'] : (doorCount === 1 ? [cfg.hinge === 'R' ? 'BUR' : 'BUL'] : []);

  // ── Hinges + cups ──────────────────────────────────────────────────────────
  const hingeRule = P.hinges.rules[type.hingeRule] || P.hinges.rules.base;
  const centres = hingeCentres(H, hingeRule, P);
  const cupOffsets = P.hinges.cups.baseOffsets;
  const sinkCups = P.hinges.cups.sinkOffsets;
  let cupY;
  if (type.cupRule === 'hingeCentres') cupY = [...centres];
  else if (type.cupRule === 'sinkOffsets') cupY = [sinkCups.bottom, frontH - sinkCups.upperFromTop, frontH - sinkCups.topFromTop];
  // A wall unit whose front runs below the carcass keeps the bottom cup the
  // same distance from the CARCASS base, so it moves up the taller front.
  else cupY = [cupOffsets.bottom + cfg.doorExtend, frontH - cupOffsets.upperFromTop, frontH - cupOffsets.topFromTop];

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
    boxFrontLen = W - DR.boxFrontBoards * G - DR.boxFrontClearance - drawerReduction;
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
      boxFrontHs.push(side - DR.boxFrontHeightDeduction - G - DR.boxFrontHeightExtra);
    }
    for (let i = 0; i < numDrawers; i += 1) {
      const rel = zoneOffsets[i] + P.wardrobe.runners.firstRowFromBottom;
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
    const sideHs = heights.map((h) => lispRound(h * B.sideRatio));
    const boxFrontH = sideHs.map((s) => s - B.boxFrontHeightDeduction - G - B.boxFrontHeightExtra);
    const boxLen = W - B.boxFrontBoards * G - B.boxFrontClearance;
    // Front i's base above the carcass floor: the fronts overlay the base panel,
    // so front 1 starts at 0 while its RUNNER row still clears the base by G
    // (KIT_BUDR_FULL L712-714).
    const frontY = [];
    let acc = 0;
    for (const h of heights) { frontY.push(acc); acc += h + B.gap; }
    const runnerRows = frontY.map((y, i) => (i === 0 ? G : y) + B.firstRowFromBottom);
    budr = {
      heights, frontY, runnerRows, sideHs, boxFrontH,
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
  const fridge = backStyle === 'rails'
    ? (() => {
      const fixedPanelY = G + cfg.fridgeH;
      const spursH = H - fixedPanelY - G;
      return {
        fixedPanelY,
        spursH,
        railH: FR.railHeight,
        rail2Y: cfg.fridgeH / 2,
        backTopH: spursH + G,
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
  const sideEdges = backStyle === 'inset'
    ? { backTabs: false, topSocket: false, topScrews: false }
    : undefined;

  panels.push(panel({
    id: 'BUL', part: 'BUL', role: 'side', w: sideW, h: sideH, thickness: G,
    edgeCode: codes.left, edgeLen: metres(sideH),
    box: { x: 0, y: 0, z: G, w: G, h: sideH, d: sideW },
    cnc: { rotated: false, drawn_w: sideW, drawn_h: sideH, ...sidePanelGeometry({ w: sideW, h: sideH, G, side: 'L', puzzle: pz, edges: sideEdges }) },
  }));
  panels.push(panel({
    id: 'BUR', part: 'BUR', role: 'side', w: sideW, h: sideH, thickness: G,
    edgeCode: codes.right, edgeLen: metres(sideH),
    box: { x: W - G, y: 0, z: G, w: G, h: sideH, d: sideW },
    cnc: { rotated: false, drawn_w: sideW, drawn_h: sideH, ...sidePanelGeometry({ w: sideW, h: sideH, G, side: 'R', puzzle: pz, edges: sideEdges }) },
  }));
  const topGeom = (backTabs = true) => ({
    rotated: true, drawn_w: topH, drawn_h: topW,
    ...topPanelGeometry({ drawnW: topH, drawnH: topW, G, puzzle: pz, backTabs }),
  });
  if (hasTopPanel) {
    panels.push(panel({
      id: 'TOP', part: 'TOP', role: 'top', w: topW, h: topH, thickness: G,
      edgeCode: codes.right, edgeLen: metres(topW),
      box: { x: G, y: H - G, z: G, w: topW, h: G, d: topH },
      cnc: topGeom(),
    }));
  }
  panels.push(panel({
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

  // Sink: the TOP is replaced by two holders on edge, and the back moves inside.
  if (backStyle === 'inset') {
    panels.push(panel({
      id: 'BACK', part: 'BACK', role: 'back', w: sinkBack.w, h: sinkBack.h, thickness: G,
      edgeCode: codes.none, edgeLen: 0,
      box: { x: G + C.shelfWidthClearance / 2, y: G, z: D - SK.backSetback - G, w: sinkBack.w, h: sinkBack.h, d: G },
      cnc: rectGeometry(sinkBack.w, sinkBack.h),
    }));
  }
  if (type.carcass.top === 'holders') {
    const holderH = SK.railHeight;
    for (const [id, label, z] of [['HOLDER-F', 'F', G], ['HOLDER-B', 'B', D - G - G]]) {
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
      cnc: rectGeometry(internalDepth, internalWidth),
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
      box: { x: 0, y: G, z: 0, w: W, h: fridge.railH, d: G },
      cnc: railCnc(true),
      meta: { index: 1 },
    }));
    panels.push(panel({
      id: 'RAIL2', part: 'BACK-RAIL', role: 'back', w: W, h: fridge.railH, thickness: G,
      edgeCode: codes.none, edgeLen: 0,
      box: { x: 0, y: G + fridge.rail2Y - fridge.railH / 2, z: 0, w: W, h: fridge.railH, d: G },
      cnc: railCnc(false),
      meta: { index: 2 },
    }));
    const S = G / 2 + pz.centrelineExtra;
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
            bottom: [pz.tabCentresFromEnd], top: [pz.tabCentresFromEnd],
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

  for (let i = 1; i <= numShelves; i += 1) {
    const y = shelfRows[i - 1] ?? (G + ((H - 2 * G) / (numShelves + 1)) * i);
    const item = cfg.shelfItems[i - 1];
    panels.push(panel({
      id: `SHELF-${i}`, part: 'SHELF', role: 'shelf', w: shelfW, h: shelfH, thickness: G,
      edgeCode: codes.right, edgeLen: metres(shelfW),
      box: { x: G + C.shelfWidthClearance / 2, y, z: G, w: shelfW, h: G, d: shelfH },
      cnc: rectGeometry(shelfW, shelfH),
      meta: { index: i, variant: item?.variant || 'fixed', itemId: item?.id || null },
    }));
  }

  if (hasDrawers) {
    panels.push(panel({
      id: 'PARTITION', part: 'PARTITION', role: 'shelf', w: internalWidth, h: internalDepth, thickness: G,
      edgeCode: codes.none, edgeLen: 0,
      box: { x: G, y: partitionY, z: G, w: internalWidth, h: G, d: internalDepth },
      cnc: rectGeometry(internalWidth, internalDepth),
    }));
  }
  if (hasRail) {
    panels.push(panel({
      id: 'RAIL-PART', part: 'RAIL-PART', role: 'shelf', w: internalWidth, h: internalDepth, thickness: G,
      edgeCode: codes.none, edgeLen: 0,
      box: { x: G, y: railPartY, z: G, w: internalWidth, h: G, d: internalDepth },
      cnc: rectGeometry(internalWidth, internalDepth),
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
    for (let i = 1; i <= numDrawers; i += 1) {
      const zoneY = G + zoneOffsets[i - 1];
      const sideHeight = boxSideH[i - 1];
      const bfH = boxFrontHs[i - 1];
      const boxY = zoneY + P.wardrobe.runners.firstRowFromBottom - DR.boxDropFromRunner;
      const common = { thickness: DR.boxSideThickness, edgeCode: codes.none, edgeLen: 0 };
      panels.push(panel({
        id: `D${i}-SL`, part: 'DRAWER-SIDE', role: 'drawer_box', w: szufDl, h: sideHeight, ...common,
        box: { x: boxLeftX, y: boxY, z: boxZFront - szufDl, w: DR.boxSideThickness, h: sideHeight, d: szufDl },
        cnc: rectGeometry(szufDl, sideHeight), meta: { drawer: i },
      }));
      panels.push(panel({
        id: `D${i}-SR`, part: 'DRAWER-SIDE', role: 'drawer_box', w: szufDl, h: sideHeight, ...common,
        box: { x: boxLeftX + szufSzer - DR.boxSideThickness, y: boxY, z: boxZFront - szufDl, w: DR.boxSideThickness, h: sideHeight, d: szufDl },
        cnc: rectGeometry(szufDl, sideHeight), meta: { drawer: i },
      }));
      panels.push(panel({
        id: `D${i}-BF`, part: 'DRAWER-BOX-FRONT', role: 'drawer_box', w: boxFrontLen, h: bfH, ...common,
        box: { x: boxLeftX + DR.boxSideThickness, y: boxY, z: boxZFront - G, w: boxFrontLen, h: bfH, d: G },
        cnc: rectGeometry(boxFrontLen, bfH), meta: { drawer: i },
      }));
      panels.push(panel({
        id: `D${i}-BB`, part: 'DRAWER-BOX-BACK', role: 'drawer_box', w: boxFrontLen, h: bfH, ...common,
        box: { x: boxLeftX + DR.boxSideThickness, y: boxY, z: boxZFront - szufDl, w: boxFrontLen, h: bfH, d: G },
        cnc: rectGeometry(boxFrontLen, bfH), meta: { drawer: i },
      }));
      panels.push(panel({
        id: `D${i}-DNO`, part: 'DRAWER-BOTTOM', role: 'drawer_box', w: bottomW, h: bottomD, ...common,
        // The bottom is narrower than the box (it sits in grooves in the two
        // sides), so it is CENTRED in it. Hanging it off the left edge made a
        // wide unit look lopsided in 3D while the cut list was right.
        box: { x: boxLeftX + (szufSzer - bottomW) / 2, y: boxY, z: boxZFront - szufDl, w: bottomW, h: G, d: bottomD },
        cnc: rectGeometry(bottomW, bottomD), meta: { drawer: i },
      }));
    }

    for (let i = 1; i <= numDrawers; i += 1) {
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
    const common = { thickness: DR.boxSideThickness, edgeCode: codes.none, edgeLen: 0 };
    const boxLeftX = G + B.boxWidthClearance / 2;
    const boxZFront = D - frontT;
    const sidePockets = (len) => [
      { layer: 'DRAWER_RUNNER_POCKET', x1: 0, y1: -B.pocketOvershoot, x2: B.runnerPocketWidth, y2: len + B.pocketOvershoot },
      { layer: 'DRAWER_BOTTOM_POCKET', x1: B.runnerPocketWidth, y1: -B.pocketOvershoot, x2: B.runnerPocketWidth + G + B.bottomPocketExtra, y2: len + B.pocketOvershoot },
    ];
    for (let i = 1; i <= budr.count; i += 1) {
      const sh = budr.sideHs[i - 1];
      const boxY = budr.runnerRows[i - 1];
      for (const [suffix, x] of [['SL', boxLeftX], ['SR', boxLeftX + budr.boxW - DR.boxSideThickness]]) {
        panels.push(panel({
          id: `D${i}-${suffix}`, part: 'DRAWER-SIDE', role: 'drawer_box', w: budr.depth, h: sh, ...common,
          box: { x, y: boxY, z: boxZFront - budr.depth, w: DR.boxSideThickness, h: sh, d: budr.depth },
          // Drawn rotated: the LISP lays the side out running along the height.
          cnc: { rotated: true, drawn_w: sh, drawn_h: budr.depth, ...pocketedRect(sh, budr.depth, sidePockets(budr.depth)) },
          meta: { drawer: i, side: suffix === 'SL' ? 'L' : 'R' },
        }));
      }
    }
    for (let i = 1; i <= budr.count; i += 1) {
      const bfH = budr.boxFrontH[i - 1];
      const boxY = budr.runnerRows[i - 1];
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
            x: boxLeftX + DR.boxSideThickness, y: boxY,
            z: isFront ? boxZFront - G : boxZFront - budr.depth,
            w: budr.boxLen, h: bfH, d: G,
          },
          cnc: geom,
          meta: { drawer: i },
        }));
      }
    }
    for (let i = 1; i <= budr.count; i += 1) {
      const boxY = budr.runnerRows[i - 1];
      const geom = rectGeometry(budr.bottomW, budr.depth);
      geom.holes = [];
      for (const x of [B.bottomScrewFromSide, budr.bottomW - B.bottomScrewFromSide]) {
        for (const y of [B.bottomScrewFromEnd, budr.depth - B.bottomScrewFromEnd]) {
          geom.holes.push({ layer: pz.layers.screw, kind: 'screw', x, y, d: pz.screwDiameter });
        }
      }
      panels.push(panel({
        id: `D${i}-DNO`, part: 'DRAWER-BOTTOM', role: 'drawer_box', w: budr.bottomW, h: budr.depth, ...common,
        // Centred in its box, as in the wardrobe: the bottom sits in the side grooves.
        box: { x: boxLeftX + (budr.boxW - budr.bottomW) / 2, y: boxY, z: boxZFront - budr.depth, w: budr.bottomW, h: G, d: budr.depth },
        cnc: geom, meta: { drawer: i },
      }));
    }
    for (let i = 1; i <= budr.count; i += 1) {
      const fh = budr.heights[i - 1];
      const geom = rectGeometry(budr.frontWidth, fh);
      const screwY = B.frontScrewFromBottom + (i === 1 ? G : 0);
      const screwX = B.frontScrewFromSide + 2 * G + B.frontScrewExtra;
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
  const legHeightForPlinth = type.legs ? (type.legSource === 'wardrobe' ? P.wardrobe.legHeight : P.baseUnit.legHeight) : 0;
  const plinthH = AP.plinth.height ?? legHeightForPlinth;
  // OPT-IN, deliberately: a bare computeCabinet(params) reproduces the LISP
  // kit and nothing else, so the golden fixtures stay the contract they are.
  // The automatics are a PROJECT decision — the store asks for them when a
  // unit is placed in a room (engine/autoparts.js).
  const wantsPlinth = AP.plinth.enabled && type.legs && type.mount === 'floor'
    && params?.plinth === true && plinthH > 0;
  if (wantsPlinth) {
    const t = AP.plinth.thickness ?? G;
    panels.push(panel({
      id: 'PLINTH', part: 'PLINTH', role: 'plinth', w: W, h: plinthH, thickness: t,
      edgeCode: codes.topBottom, edgeLen: metres(2 * W),
      box: { x: 0, y: -plinthH, z: AP.plinth.setback, w: W, h: plinthH, d: t },
      cnc: rectGeometry(W, plinthH),
    }));
  }

  const topInfillH = Number(params?.top_infill_mm) || 0;
  if (topInfillH >= AP.topInfill.minHeight) {
    const t = AP.topInfill.thickness ?? G;
    panels.push(panel({
      id: 'INFILL-T', part: 'INFILL', role: 'infill', w: W, h: topInfillH, thickness: t,
      edgeCode: codes.topBottom, edgeLen: metres(2 * W),
      box: { x: 0, y: H, z: D - t, w: W, h: topInfillH, d: t },
      cnc: rectGeometry(W, topInfillH),
      meta: { side: 'top' },
    }));
  }

  // End panels (turn 4, BACKLOG #17): a masking panel on the OUTSIDE of a
  // carcass side. A cut piece like any other, so it reaches the BOM, the CNC
  // sheet and the DXF by the same route — and it exists only because somebody
  // added it (`params.end_panels`), never automatically.
  const EP = AP.endPanel;
  // "To the floor" means down to the floor: past the legs on a standing unit,
  // and all the way down from a wall unit's mounting height.
  const dropToFloor = type.mount === 'wall' ? cfg.mountHeight : legHeightForPlinth;
  const endPanels = Array.isArray(params?.end_panels) ? params.end_panels : [];
  for (const ep of endPanels) {
    const side = ep?.side === 'R' ? 'R' : 'L';
    const t = Number(ep?.thickness) > 0 ? Number(ep.thickness) : (EP.thickness ?? frontT);
    const toFloor = (ep?.height || EP.defaultHeight) === 'floor';
    const drop = toFloor ? Math.max(0, dropToFloor) : 0;
    const panelH = H + drop;
    if (panelH <= 0 || t <= 0) continue;
    panels.push(panel({
      id: `END-${side}`, part: 'END-PANEL', role: 'end_panel', w: D, h: panelH, thickness: t,
      edgeCode: codes.all, edgeLen: metres(2 * D + 2 * panelH),
      // `drop > 0 ? -drop : 0` and not `-drop`: negative zero is a real value in
      // JS and a box.y of -0 fails an === check downstream for no reason.
      box: { x: side === 'L' ? -t : W, y: drop > 0 ? -drop : 0, z: 0, w: t, h: panelH, d: D },
      cnc: rectGeometry(D, panelH),
      meta: { side: side === 'L' ? 'left' : 'right', height: toFloor ? 'floor' : 'unit' },
    }));
  }

  for (const [side, key] of [['L', 'side_infill_left_mm'], ['R', 'side_infill_right_mm']]) {
    const infillW = Number(params?.[key]) || 0;
    if (infillW < AP.sideInfill.minWidth) continue;
    const t = AP.sideInfill.thickness ?? G;
    panels.push(panel({
      id: `INFILL-${side}`, part: 'INFILL', role: 'infill', w: infillW, h: H, thickness: t,
      edgeCode: codes.right, edgeLen: metres(H),
      box: { x: side === 'L' ? -infillW : W, y: 0, z: D - t, w: infillW, h: H, d: t },
      cnc: rectGeometry(infillW, H),
      meta: { side: side === 'L' ? 'left' : 'right' },
    }));
  }

  // Door fronts, always last (they close the unit — SPEC 4.10)
  const doorZ = D + P.doors.gap;
  const doorY = -cfg.doorExtend;      // a wall-unit front may run below the box
  if (doorCount === 1) {
    panels.push(panel({
      id: `${unitNum}-F`, part: 'FRONT', role: 'front', w: frontW, h: frontH, thickness: frontT,
      edgeCode: codes.all, edgeLen: metres(2 * frontW + 2 * frontH),
      box: { x: P.doors.gap / 2, y: doorY, z: doorZ, w: frontW, h: frontH, d: frontT },
      cnc: rectGeometry(frontW, frontH), meta: { hinge: cfg.hinge, frontType: cfg.frontType },
    }));
  } else if (doorCount === 2) {
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

  // Puzzle sockets/screws and every hole a panel already carries
  for (const pnl of panels) {
    for (const hole of pnl.cnc?.holes || []) addDrill(pnl.id, hole.kind, hole.layer, hole.x, hole.y, hole.d);
  }

  // Hinge holes on the hinged carcass sides
  const hingeHolePairs = centres.map((c) => [c - P.hinges.holePairOffset, c + P.hinges.holePairOffset]);
  for (const sideId of hingedSides) {
    const x = sideId === 'BUR' ? sideW - P.hinges.xFromFrontEdge : P.hinges.xFromFrontEdge;
    for (const pair of hingeHolePairs) {
      for (const y of pair) addDrill(sideId, 'hinge', P.hinges.layer, x, y, P.hinges.holeDiameter);
    }
  }

  // Shelf pin holes — both sides carry them
  for (const sideId of ['BUL', 'BUR']) {
    for (const rowY of shelfRows) {
      for (const dy of SH.clusterOffsets) {
        for (const x of shelfHoleX) addDrill(sideId, 'shelf', SH.layer, x, rowY + dy, SH.diameter);
      }
    }
  }

  // Hinge cups + their mounting screws in each door front
  const cups = P.hinges.cups;
  for (const pnl of panels.filter((x) => x.part === 'FRONT')) {
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

  const legHeight = type.legs ? (type.legSource === 'wardrobe' ? P.wardrobe.legHeight : P.baseUnit.legHeight) : 0;
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
  hw('hinges', 'Hinges', totals.hinges, 'pcs',
    { per_door: centres.length, doors: doorCount, cup_diameter_mm: cups.diameter },
    doorCount > 0 ? `${centres.length} per door × ${doorCount}` : '');
  hw('runner_pairs', 'Drawer runners', numDrawers, 'pairs',
    { length_mm: runnerLength }, runnerLength ? `${roundTo(runnerLength, 0)} mm` : '');
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

  // ── Derived (key names match the golden fixtures) ──────────────────────────
  const derived = {
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
      available_h: H - B.ratio.length * B.gap,
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
    hinged_sides: hingedSides,
    front_cup_y: cupY.map((v) => roundTo(v, 4)),
    front_cup_x_from_hinge_edge: cups.xFromHingeEdge,
    shelf_row_y: shelfRows.map((v) => roundTo(v, 4)),
    shelf_cluster_y: shelfRows.map((row) => SH.clusterOffsets.map((dy) => roundTo(row + dy, 4))),
    shelf_hole_x: shelfHoleX,
    runner_rows_dp_y: runnerRowsDp,
    runner_rows_carcass_y: budr ? [...budr.runnerRows] : runnerRowsCarcass,
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
      bottom_screw_y: G / 2 + pz.centrelineExtra,
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
    carcass: { w: W, h: H, d: D, legHeight },
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
    shelves: shelfRows.map((y, i) => ({ index: i + 1, y })),
    fridge: fridge ? { fixedPanelY: fridge.fixedPanelY, fridgeH: cfg.fridgeH } : null,
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
