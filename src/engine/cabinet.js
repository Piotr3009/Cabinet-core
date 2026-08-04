// ─── Cabinet calculation engine ───
// params -> { derived, panels[], drills[], totals, csvLines[], warnings[] }
//
// Pure JavaScript. ZERO React imports, zero store imports, zero bare numbers in
// the formulas — every constant is read from the profile (CLAUDE.md rules 2/3).
//
// The maths is traced line-by-line from the production AutoLISP:
//   reference/lisp/SKYLON_COMMON.lsp     — puzzle joints, hinges, cups, shelves
//   reference/lisp/KIT_BUD_FULL.lsp      — kitchen base unit
//   reference/lisp/KIT_WARDROBE_FULL.lsp — wardrobe (drawers, drawer panel, rail)
// and is locked down by fixtures/golden-*.json via test/engine.test.js.

import { getCabinetProfile } from './profile.js';
import { getUnitType } from './types.js';
import { areaM2, metres, roundTo, rtos } from './format.js';
import { sidePanelGeometry, topPanelGeometry, backPanelGeometry, rectGeometry } from './puzzle.js';

// ─── Hinge centres (SKYLON_COMMON calcHingePositions*) ───

export function hingeCentres(height, rule, profile) {
  const H = Number(height);
  const end = profile.hinges.endOffset;
  switch (rule.mode) {
    case 'base':
      return [end, H - rule.secondFromTop, H - end];
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

/** Door count from the width threshold: 1 while (W − 4) ≤ 700 → 2 from W = 704. */
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

// ─── Parameter normalisation ───

function normalizeParams(raw, profile) {
  const p = raw || {};
  const type = getUnitType(p.type);
  const G = Number(p.board_t) || profile.board.thickness;
  const frontT = Number(p.front_t) || profile.front.thickness;
  const warnings = [];

  let height = Number(p.height) || 0;
  const minHeight = type.id === 'WARDROBE' ? profile.wardrobe.minHeight : 0;
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

  const shelves = items.length ? shelvesFromItems.length : clampInt(p.shelves, 0, 10);
  const drawers = type.supports.drawers
    ? (items.length ? drawersFromItems.length : clampInt(p.drawers, 0, profile.wardrobe.drawers.maxCount))
    : 0;
  const rail = type.supports.rail ? (items.length ? Boolean(hangerFromItems) : Boolean(p.rail)) : false;

  const shelfPositions = shelvesFromItems
    .map((i) => Number(i.pos_mm))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);

  // doors: undefined → derive from the width threshold; { count: 0 } / false → none yet
  let doorCount;
  let hinge = (p.hinge || profile.doors.defaultHinge).toUpperCase() === 'R' ? 'R' : 'L';
  if (p.doors === false || p.doors === 0) {
    doorCount = 0;
  } else if (p.doors && typeof p.doors === 'object') {
    doorCount = Number.isFinite(Number(p.doors.count)) ? Number(p.doors.count) : doorCountFor(p.width, profile);
    if (p.doors.hinge) hinge = String(p.doors.hinge).toUpperCase() === 'R' ? 'R' : 'L';
  } else {
    doorCount = doorCountFor(p.width, profile);
  }

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
    shelves,
    shelfPositions,
    drawers,
    rail,
    railOffset: Number(p.rail_offset ?? profile.wardrobe.defaults.railOffset),
    items,
    warnings,
  };
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
  const shelfH = D - C.shelfDepthBoards * G - C.shelfDepthClearance;

  // ── Doors ──────────────────────────────────────────────────────────────────
  const doorCount = cfg.doorCount;
  const frontH = H - P.doors.gap;
  const frontW = doorCount === 2
    ? (W - P.doors.doubleTotalGap) / 2
    : W - P.doors.gap;
  const hingedSides = doorCount === 2 ? ['BUL', 'BUR'] : (doorCount === 1 ? [cfg.hinge === 'R' ? 'BUR' : 'BUL'] : []);

  // ── Hinges + cups ──────────────────────────────────────────────────────────
  const hingeRule = P.hinges.rules[type.hingeRule] || P.hinges.rules.base;
  const centres = hingeCentres(H, hingeRule, P);
  const cupOffsets = P.hinges.cups.baseOffsets;
  const cupY = type.cupRule === 'hingeCentres'
    ? [...centres]
    : [cupOffsets.bottom, frontH - cupOffsets.upperFromTop, frontH - cupOffsets.topFromTop];

  // ── Wardrobe drawers ───────────────────────────────────────────────────────
  const DR = P.wardrobe.drawers;
  const DP = P.wardrobe.drawerPanel;
  let hasDrawers = type.supports.drawers && cfg.drawers > 0;
  let numDrawers = hasDrawers ? cfg.drawers : 0;
  let numDrPanels = 0;
  let dpLeft = false;
  let dpRight = false;
  let drawerReduction = 0;
  let szufMaxDl = null; let szufDl = null; let szufSzer = null; let drawerFrontW = null;
  let drawerTotalH = 0; let partitionY = null; let partitionCentreY = null;
  let drawerPanelH = null; let drawerPanelD = null; let fillerH = null;
  let boxFrontLen = null; let boxFrontH = null; let bottomW = null; let bottomD = null;
  let boxSetback = null;
  let runnerRowsDp = []; let runnerRowsCarcass = [];

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
    drawerTotalH = numDrawers * DR.frontHeight + (numDrawers - 1) * DR.gap;
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
    boxFrontH = DR.sideHeight - DR.boxFrontHeightDeduction - G - DR.boxFrontHeightExtra;
    bottomW = boxFrontLen + DR.bottomOversize;
    bottomD = szufDl;
    for (let i = 0; i < numDrawers; i += 1) {
      const rel = i * (DR.frontHeight + DR.gap) + P.wardrobe.runners.firstRowFromBottom;
      runnerRowsDp.push(rel);
      runnerRowsCarcass.push(G + rel);
    }
  } else {
    numDrawers = 0; numDrPanels = 0; dpLeft = false; dpRight = false; drawerReduction = 0;
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
  const shelfHoleX = [SH.columnFromEdge, sideW - SH.columnFromEdge];

  // ── Panels ─────────────────────────────────────────────────────────────────
  const panels = [];
  const pz = P.puzzle;

  panels.push(panel({
    id: 'BUL', part: 'BUL', role: 'side', w: sideW, h: sideH, thickness: G,
    edgeCode: codes.left, edgeLen: metres(sideH),
    box: { x: 0, y: 0, z: G, w: G, h: sideH, d: sideW },
    cnc: { rotated: false, drawn_w: sideW, drawn_h: sideH, ...sidePanelGeometry({ w: sideW, h: sideH, G, side: 'L', puzzle: pz }) },
  }));
  panels.push(panel({
    id: 'BUR', part: 'BUR', role: 'side', w: sideW, h: sideH, thickness: G,
    edgeCode: codes.right, edgeLen: metres(sideH),
    box: { x: W - G, y: 0, z: G, w: G, h: sideH, d: sideW },
    cnc: { rotated: false, drawn_w: sideW, drawn_h: sideH, ...sidePanelGeometry({ w: sideW, h: sideH, G, side: 'R', puzzle: pz }) },
  }));
  const topGeom = () => ({ rotated: true, drawn_w: topH, drawn_h: topW, ...topPanelGeometry({ drawnW: topH, drawnH: topW, G, puzzle: pz }) });
  panels.push(panel({
    id: 'TOP', part: 'TOP', role: 'top', w: topW, h: topH, thickness: G,
    edgeCode: codes.right, edgeLen: metres(topW),
    box: { x: G, y: H - G, z: G, w: topW, h: G, d: topH },
    cnc: topGeom(),
  }));
  panels.push(panel({
    id: 'BOTTOM', part: 'BOTTOM', role: 'bottom', w: topW, h: topH, thickness: G,
    edgeCode: codes.right, edgeLen: metres(topW),
    box: { x: G, y: 0, z: G, w: topW, h: G, d: topH },
    cnc: topGeom(),
  }));
  panels.push(panel({
    id: 'BACK', part: 'BACK', role: 'back', w: backW, h: backH, thickness: G,
    edgeCode: codes.none, edgeLen: 0,
    box: { x: 0, y: 0, z: 0, w: backW, h: backH, d: G },
    cnc: { rotated: false, drawn_w: backW, drawn_h: backH, ...backPanelGeometry({ w: backW, h: backH, G, puzzle: pz }) },
  }));

  for (let i = 1; i <= numShelves; i += 1) {
    const y = shelfRows[i - 1] ?? (G + ((H - 2 * G) / (numShelves + 1)) * i);
    const item = cfg.items.filter((it) => it.kind === 'shelf')[i - 1];
    panels.push(panel({
      id: `SHELF-${i}`, part: 'SHELF', role: 'shelf', w: shelfW, h: shelfH, thickness: G,
      edgeCode: codes.right, edgeLen: metres(shelfW),
      box: { x: G + C.shelfWidthClearance / 2, y, z: G, w: shelfW, h: G, d: shelfH },
      cnc: rectGeometry(shelfW, shelfH),
      meta: { index: i, variant: item?.variant || 'fixed' },
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
      const zoneY = G + (i - 1) * (DR.frontHeight + DR.gap);
      const boxY = zoneY + P.wardrobe.runners.firstRowFromBottom - DR.boxDropFromRunner;
      const common = { thickness: DR.boxSideThickness, edgeCode: codes.none, edgeLen: 0 };
      panels.push(panel({
        id: `D${i}-SL`, part: 'DRAWER-SIDE', role: 'drawer_box', w: szufDl, h: DR.sideHeight, ...common,
        box: { x: boxLeftX, y: boxY, z: boxZFront - szufDl, w: DR.boxSideThickness, h: DR.sideHeight, d: szufDl },
        cnc: rectGeometry(szufDl, DR.sideHeight), meta: { drawer: i },
      }));
      panels.push(panel({
        id: `D${i}-SR`, part: 'DRAWER-SIDE', role: 'drawer_box', w: szufDl, h: DR.sideHeight, ...common,
        box: { x: boxLeftX + szufSzer - DR.boxSideThickness, y: boxY, z: boxZFront - szufDl, w: DR.boxSideThickness, h: DR.sideHeight, d: szufDl },
        cnc: rectGeometry(szufDl, DR.sideHeight), meta: { drawer: i },
      }));
      panels.push(panel({
        id: `D${i}-BF`, part: 'DRAWER-BOX-FRONT', role: 'drawer_box', w: boxFrontLen, h: boxFrontH, ...common,
        box: { x: boxLeftX + DR.boxSideThickness, y: boxY, z: boxZFront - G, w: boxFrontLen, h: boxFrontH, d: G },
        cnc: rectGeometry(boxFrontLen, boxFrontH), meta: { drawer: i },
      }));
      panels.push(panel({
        id: `D${i}-BB`, part: 'DRAWER-BOX-BACK', role: 'drawer_box', w: boxFrontLen, h: boxFrontH, ...common,
        box: { x: boxLeftX + DR.boxSideThickness, y: boxY, z: boxZFront - szufDl, w: boxFrontLen, h: boxFrontH, d: G },
        cnc: rectGeometry(boxFrontLen, boxFrontH), meta: { drawer: i },
      }));
      panels.push(panel({
        id: `D${i}-DNO`, part: 'DRAWER-BOTTOM', role: 'drawer_box', w: bottomW, h: bottomD, ...common,
        box: { x: boxLeftX, y: boxY, z: boxZFront - szufDl, w: bottomW, h: G, d: bottomD },
        cnc: rectGeometry(bottomW, bottomD), meta: { drawer: i },
      }));
    }

    for (let i = 1; i <= numDrawers; i += 1) {
      const zoneY = G + (i - 1) * (DR.frontHeight + DR.gap);
      const first = i === 1;
      const dfH = first ? DR.frontHeight - DR.firstFrontAdjust : DR.frontHeight;
      const dfY = first ? zoneY + DR.firstFrontAdjust : zoneY;
      panels.push(panel({
        id: `${unitNum}-DF${i}`, part: 'DRAWER-FRONT', role: 'front', w: drawerFrontW, h: dfH, thickness: frontT,
        edgeCode: codes.all, edgeLen: metres(2 * drawerFrontW + 2 * dfH),
        box: { x: boxLeftX - (DR.frontOversize / 2), y: dfY, z: D - DR.setback - frontT, w: drawerFrontW, h: dfH, d: frontT },
        cnc: rectGeometry(drawerFrontW, dfH), meta: { drawer: i },
      }));
    }
  }

  // Door fronts, always last (they close the unit — SPEC 4.10)
  const doorZ = D + P.doors.gap;
  if (doorCount === 1) {
    panels.push(panel({
      id: `${unitNum}-F`, part: 'FRONT', role: 'front', w: frontW, h: frontH, thickness: frontT,
      edgeCode: codes.all, edgeLen: metres(2 * frontW + 2 * frontH),
      box: { x: P.doors.gap / 2, y: 0, z: doorZ, w: frontW, h: frontH, d: frontT },
      cnc: rectGeometry(frontW, frontH), meta: { hinge: cfg.hinge, frontType: cfg.frontType },
    }));
  } else if (doorCount === 2) {
    panels.push(panel({
      id: `${unitNum}-FL`, part: 'FRONT', role: 'front', w: frontW, h: frontH, thickness: frontT,
      edgeCode: codes.all, edgeLen: metres(2 * frontW + 2 * frontH),
      box: { x: P.doors.gap / 2, y: 0, z: doorZ, w: frontW, h: frontH, d: frontT },
      cnc: rectGeometry(frontW, frontH), meta: { hinge: 'L', frontType: cfg.frontType },
    }));
    panels.push(panel({
      id: `${unitNum}-FR`, part: 'FRONT', role: 'front', w: frontW, h: frontH, thickness: frontT,
      edgeCode: codes.all, edgeLen: metres(2 * frontW + 2 * frontH),
      box: { x: W - P.doors.gap / 2 - frontW, y: 0, z: doorZ, w: frontW, h: frontH, d: frontT },
      cnc: rectGeometry(frontW, frontH), meta: { hinge: 'R', frontType: cfg.frontType },
    }));
  }

  // ── Drills ─────────────────────────────────────────────────────────────────
  const drills = [];
  const addDrill = (panelId, kind, layer, x, y, d) => drills.push({ panel: panelId, kind, layer, x: roundTo(x, 4), y: roundTo(y, 4), d });

  // Puzzle sockets/screws already computed with the outlines
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

  // Rail bracket + rail partitioner fixings
  if (hasRail) {
    for (const sideId of ['BUL', 'BUR']) {
      addDrill(sideId, 'rail_bracket', pz.layers.screw, sideW / 2, railY, RL.bracketScrewDiameter);
      for (const x of [pz.screwFromEnd, sideW / 2, sideW - pz.screwFromEnd]) {
        addDrill(sideId, 'rail_partition_screw', pz.layers.screw, x, railPartCentreY, RL.bracketScrewDiameter);
      }
    }
    for (const x of [G + pz.screwFromEnd, W / 2, W - G - pz.screwFromEnd]) {
      addDrill('BACK', 'rail_partition_screw', pz.layers.screw, x, railPartCentreY, RL.bracketScrewDiameter);
    }
  }

  // ── Totals ─────────────────────────────────────────────────────────────────
  const boardPanels = panels.filter((x) => x.material_role === 'board');
  const frontPanels = panels.filter((x) => x.material_role === 'front');
  const drawerFrontCount = panels.filter((x) => x.part === 'DRAWER-FRONT').length;
  const doorFrontCount = panels.filter((x) => x.part === 'FRONT').length;
  const railPartCount = hasRail ? 1 : 0;

  const boardArea = boardPanels.reduce((s, x) => s + x.area_m2, 0);
  const frontArea = frontPanels.reduce((s, x) => s + x.area_m2, 0);
  const boardEdging = boardPanels.reduce((s, x) => s + x.edging.len_m, 0);
  const frontEdging = frontPanels.reduce((s, x) => s + x.edging.len_m, 0);

  const totals = {
    // LISP totalPanels convention: carcass + interior + drawer fronts,
    // door fronts counted separately, RAIL-PART not counted at all.
    panels_lisp: boardPanels.length - railPartCount + drawerFrontCount,
    panels_true_incl_railpart: boardPanels.length + drawerFrontCount,
    pieces_total: panels.length,
    fronts: doorFrontCount,
    board_area_m2: roundTo(boardArea, 6),
    front_area_m2: roundTo(frontArea, 6),
    area_m2: roundTo(boardArea + frontArea, 6),
    edging_m: roundTo(boardEdging, 6),
    edging_front_m: roundTo(frontEdging, 6),
    edging_total_m: roundTo(boardEdging + frontEdging, 6),
    legs: type.legs ? (type.legSource === 'wardrobe' ? P.wardrobe.legsPerUnit : P.baseUnit.legsPerUnit) : 0,
    hinges: doorCount > 0 ? centres.length * doorCount : 0,
    runner_pairs: numDrawers,
  };

  // ── Derived (key names match the golden fixtures) ──────────────────────────
  const derived = {
    doors: doorCount,
    internal_width: internalWidth,
    internal_depth: internalDepth,
    ...(doorCount === 2 ? { door_width: frontW } : {}),
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
      boxFrontH,
      bottom_w: bottomW,
      bottom_d: bottomD,
    } : {}),
    ...(hasRail ? { rail_y: railY, rail_partition_y: railPartY } : {}),
  };

  const drillSummary = {
    hinge_centers: centres.map((v) => roundTo(v, 4)),
    side_hinge_holes_y: hingeHolePairs.map((pair) => pair.map((v) => roundTo(v, 4))),
    side_hinge_holes_x: P.hinges.xFromFrontEdge,
    hinged_sides: hingedSides,
    front_cup_y: cupY.map((v) => roundTo(v, 4)),
    front_cup_x_from_hinge_edge: cups.xFromHingeEdge,
    shelf_row_y: shelfRows.map((v) => roundTo(v, 4)),
    shelf_cluster_y: shelfRows.map((row) => SH.clusterOffsets.map((dy) => roundTo(row + dy, 4))),
    shelf_hole_x: shelfHoleX,
    runner_rows_dp_y: runnerRowsDp,
    runner_rows_carcass_y: runnerRowsCarcass,
    runner_carcass_side: runnerCarcassSide,
    runner_hole_x: [...RN.holeXPattern],
  };

  // ── Assemblies for the 3D view ─────────────────────────────────────────────
  const assemblies = {
    carcass: { w: W, h: H, d: D, legHeight: type.legs ? (type.legSource === 'wardrobe' ? P.wardrobe.legHeight : P.baseUnit.legHeight) : 0 },
    rail: hasRail ? { y: railY, x1: G, x2: W - G, z: D - DR.setback } : null,
    drawerZone: hasDrawers ? { top: partitionY, count: numDrawers } : null,
    shelves: shelfRows.map((y, i) => ({ index: i + 1, y })),
  };

  return {
    type: type.id,
    unitNum,
    params: {
      width: W, height: H, depth: D, board_t: G, front_t: frontT,
      front_type: cfg.frontType, hinge: cfg.hinge, doors: doorCount,
      shelves: numShelves, drawers: numDrawers, rail: hasRail, rail_offset: cfg.railOffset,
    },
    derived,
    panels,
    drills,
    drillSummary,
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
