// ─── CHECK v1 — THE PRE-PRODUCTION CONTROLLER (turn 31, CLAUDE.md F6) ───────
//
// "A Check button beside BOM/CNC, and the same list automatically before
// Export. Result = a PANEL of findings (not toasts)."
//
// NOT TOASTS is the design, and it is the same lesson F2 learnt one storey
// down: a fault that has to be read in four seconds is a fault nobody reads.
// Eleven rules over a whole kitchen can produce thirty findings, and thirty
// things a joiner has to act on is a LIST — one he can work down, click into
// and come back to.
//
// ─── ONE FUNCTION, ELEVEN RULES, ONE SHAPE ──────────────────────────────────
//
// Every finding is the same object whatever produced it:
//
//   { check, level, unitId, unitNum, panelId, message, subject }
//
// `subject` is what the click FLIES TO — the F7/T30 mechanism, which is a
// panel id and an editor to open — so the panel needs no per-rule branch to
// know what to do when a row is pressed.
//
// ─── FOUR OF THE ELEVEN ALREADY EXISTED AND WERE NEVER ASKED ────────────────
//
//   #1  shelf × hinge collision   turn 30's, shown only in one unit's panel
//   #2  front gap                 turn 30's, now under F4's neighbour measure
//   #9  outline faults            turn 25's guard, wired at last by F3
//   #10 drill faults              turn 31's guard, F3
//   #11 carcass gap               F4.13
//
// The other six are this file's. Every threshold is a PROFILE number and is
// marked as owner-tunable where CLAUDE.md says so.
//
// ─── NOTHING HERE BLOCKS ANYTHING ───────────────────────────────────────────
//
// "No blocking anywhere except the export gate's hold-out, which has 'Export
// anyway'." This module returns a list. It refuses nothing, moves nothing and
// re-cuts nothing (rule 4).
//
// Pure functions — no React, no store, no three.js.

import { shelfHingeClashes } from './shelfHingeClash.js';
import { frontClearances, frontGapRows, carcassGaps } from './frontClearance.js';
import { unitFindings } from './cnc/exportGate.js';
import { unitBase, unitTop, hasTopInfill } from './runs.js';
import { shelfTypeOf } from './shelfTypes.js';
import { takesPlinth } from './autoparts.js';
import { panelWeight } from './lifts.js';
import { resolvePanelMaterial } from './materials.js';
import HINGE_COUNT from '../../reference/hardware/cliptop-hinge-count.json' with { type: 'json' };

/** The eleven rules, in the owner's own order, with what each is FOR. */
export const CHECKS = Object.freeze([
  { n: 1, level: 'red', label: 'Shelf × hinge collision' },
  { n: 2, level: 'red', label: 'Front gap' },
  { n: 3, level: 'yellow', label: 'Tall cabinet with no fixed shelf' },
  { n: 4, level: 'red', label: 'Door too heavy for its hinges' },
  { n: 5, level: 'yellow', label: 'Open gap above a run' },
  { n: 6, level: 'yellow', label: 'Base run with no plinth' },
  { n: 7, level: 'red', label: 'Panel larger than the sheet' },
  { n: 8, level: 'yellow', label: 'Wide front at 110°' },
  { n: 9, level: 'red', label: 'Outline faults' },
  { n: 10, level: 'red', label: 'Drill faults' },
  { n: 11, level: 'red', label: 'Carcass gap in a run' },
  // CHAT-FIX 16.08 (owner, decision C): a FULL-WIDTH fixed shoe box behind a
  // hinged door stands where the arm swings — "jest clash hinges i fix shelf
  // i nie pokazuje tego problemu". Report, never fix (the house grammar).
  { n: 12, level: 'red', label: 'Shoe box × hinge collision' },
]);

// ─── THE OWNER-TUNABLE NUMBERS (CLAUDE.md F6: "profile numbers marked as
// owner-tunable"). Each reads the profile and falls back to the owner's own
// default, so a workshop that has never opened the settings gets his answer.

/** #3: over this, a cabinet wants at least one FIXED shelf. Owner: 1200. */
export function tallNoFixHeightMm(profile) {
  const n = Number(profile?.checks?.tallNoFixHeightMm);
  return Number.isFinite(n) && n > 0 ? n : 1200;
}

/** #5: the window of open gap that wants an infill. Owner: 20–80. */
export function openGapWindowMm(profile) {
  const from = Number(profile?.checks?.openGapFromMm);
  const to = Number(profile?.checks?.openGapToMm);
  return {
    from: Number.isFinite(from) && from >= 0 ? from : 20,
    to: Number.isFinite(to) && to > 0 ? to : 80,
  };
}

/** #7: the board on the bed. Owner's default: 2790 × 2060. */
export function sheetSizeMm(profile) {
  const w = Number(profile?.cnc?.sheet?.width);
  const h = Number(profile?.cnc?.sheet?.height);
  return {
    width: Number.isFinite(w) && w > 0 ? w : 2790,
    height: Number.isFinite(h) && h > 0 ? h : 2060,
  };
}

/** #8: over this width at 110°, consider a 155°. Owner: 600. */
export function wideFrontMm(profile) {
  const n = Number(profile?.checks?.wideFrontMm);
  return Number.isFinite(n) && n > 0 ? n : 600;
}

/**
 * #4: how many hinges the published Blum table asks for.
 *
 * The table is `reference/hardware/cliptop-hinge-count.json`, with its source
 * named on the file (CLAUDE.md F6 #4). It is a CHECK and nothing else: no hole
 * in this application comes from it, which is turn 31's iron rule 2 — a drilled
 * hole exists only where a LISP line or a published Blum pattern says so, and
 * "how many hinges is prudent" is neither.
 *
 * @returns {{hinges:number, beyondTable:boolean, band:object|null}}
 */
export function hingesRequired({ heightMm, weightKg }) {
  const h = Number(heightMm) || 0;
  const kg = Number(weightKg) || 0;
  for (const band of HINGE_COUNT.bands) {
    if (h <= band.maxHeightMm && kg <= band.maxWeightKg) {
      return { hinges: band.hinges, beyondTable: false, band };
    }
  }
  // Off the published chart. The check SAYS SO rather than extrapolating a band
  // Blum has not published — a 25 kg door is not a place to be approximately
  // right.
  return {
    hinges: HINGE_COUNT._beyond_the_table.hinges,
    beyondTable: true,
    band: null,
  };
}

/** The table itself, for a test and for the panel's own explanation. */
export const HINGE_COUNT_TABLE = HINGE_COUNT;

const round2 = (v) => Math.round(Number(v) * 100) / 100;

/** One finding, in the one shape every rule speaks. */
function finding(n, level, {
  unitId = null, unitNum = '', panelId = null, message, subject = null, ...rest
}) {
  return {
    check: n,
    level,
    unitId,
    unitNum,
    panelId,
    message,
    // What a CLICK flies to and opens — the F7/T30 mechanism. A rule that
    // cannot name a subject says so with `null`, and the panel simply does not
    // offer the flight rather than flying somewhere wrong.
    subject: subject || (panelId ? { unitId, panelId, editor: 'element' } : (unitId ? { unitId, editor: 'cabinet' } : null)),
    ...rest,
  };
}

/**
 * Check v1, whole.
 *
 * @param {object} args
 *   entries    [{ unit, result }] — every cabinet in the room, computed
 *   units      the raw units
 *   room       the project's room (for the ceiling)
 *   design     the project's design (for materials, so #4 can weigh a door)
 *   materials  the assigned material rows
 *   profile
 * @returns {Array} findings, reds first
 */
export function runChecks({
  entries = [], units = null, room = null, design = null, materials = [], profile = null,
  wallWidthOf = null,
} = {}) {
  const list = units || entries.map((e) => e.unit).filter(Boolean);
  const out = [];
  const roomHeight = Number(room?.height) || 0;
  const sheet = sheetSizeMm(profile);
  const tallH = tallNoFixHeightMm(profile);
  const window = openGapWindowMm(profile);
  const wide = wideFrontMm(profile);

  for (const { unit, result } of entries) {
    if (!unit || !result) continue;
    const unitId = unit.id;
    const unitNum = result.unitNum || unit.params?.unit_num || '';
    const at = (panelId, extra = {}) => ({ unitId, unitNum, panelId, ...extra });

    // ── #1 shelf × hinge collision (turn 30, at last asked of every unit) ──
    for (const c of shelfHingeClashes({ result, profile })) {
      out.push(finding(1, 'red', at(c.shelfPanelId, {
        message: `${unitNum}: ${c.message}`,
        // Turn 30's own repair opens the DOOR at the offending hinge row; the
        // panel offers both, exactly as `ShelfHingeClash` does.
        subject: { unitId, panelId: c.shelfPanelId, editor: 'element' },
        alternative: c.doorPanelId
          ? {
            unitId, panelId: c.doorPanelId, editor: 'element', section: 'hinges', hingeIndex: c.hingeIndex, label: 'Move the hinge',
          }
          : null,
      })));
    }

    // ── #12 a fixed shoe box in the swing of a hinge arm (16.08, C) ───────
    {
      const centres = result?.drillSummary?.hinge_centers || [];
      const boxes = (result?.assemblies?.shoeBoxes || []).filter((b) => b.variant === 'F');
      for (const b of boxes) {
        // The box's FRONT band: from its floor to the top of the 120 front.
        const from = Number(b.posZ) || 0;
        // The band the swing meets: the box floor to the top of the 120 front.
        const to = from + 120;
        for (const y of centres) {
          if (y >= from - 1e-6 && y <= to + 1e-6) {
            const frontPanel = (result.panels || []).find(
              (pp) => pp.part === 'SHOEBOX-FR' && pp.meta?.itemId === b.id,
            );
            out.push(finding(12, 'red', at(frontPanel?.id || null, {
              message: `${unitNum}: fixed shoe box stands in the swing of the hinge at ${Math.round(y)} — raise the box or move the hinge`,
              subject: { unitId, ...(frontPanel ? { panelId: frontPanel.id } : {}), editor: 'element' },
            })));
            break;
          }
        }
      }
    }

    // ── #3 a tall cabinet with no FIXED shelf ─────────────────────────────
    const height = Number(unit.params?.height) || 0;
    const items = unit.params?.sections?.[0]?.items || [];
    const shelves = items.filter((i) => i?.kind === 'shelf');
    if (height > tallH && shelves.length && !shelves.some((sh) => shelfTypeOf(sh) === 'fix')) {
      out.push(finding(3, 'yellow', at(null, {
        message: `${unitNum}: ${Math.round(height)} mm tall with `
          + `${shelves.length} ${shelves.length === 1 ? 'shelf' : 'shelves'} and none of them fixed `
          + '— add one fixed shelf.',
      })));
    }

    // ── #4 door too heavy / too few hinges ────────────────────────────────
    const rows = result.drillSummary?.hinge_centers || [];
    for (const panel of result.panels || []) {
      if (panel.part !== 'FRONT' || panel.role !== 'front' || panel.meta?.appliance) continue;
      const material = resolvePanelMaterial(panel, unit, design, profile, materials);
      const weight = panelWeight({
        panel, material, materials, profile,
      });
      const need = hingesRequired({ heightMm: panel.h, weightKg: weight.kg });
      if (rows.length >= need.hinges) continue;
      out.push(finding(4, 'red', at(panel.id, {
        message: `${unitNum} ${panel.id}: ${Math.round(panel.h)} mm and ${round2(weight.kg)} kg `
          + `on ${rows.length} hinge${rows.length === 1 ? '' : 's'} — the Blum CLIP top table asks for `
          + `${need.hinges}${need.beyondTable ? ' (this door is off the published chart)' : ''}.`,
        subject: {
          unitId, panelId: panel.id, editor: 'element', section: 'hinges',
        },
        needHinges: need.hinges,
        haveHinges: rows.length,
        weightKg: round2(weight.kg),
        beyondTable: need.beyondTable,
      })));
    }

    // ── #7 a panel larger than the sheet ──────────────────────────────────
    for (const panel of result.panels || []) {
      const w = Number(panel.w) || 0;
      const h = Number(panel.h) || 0;
      const long = Math.max(w, h);
      const short = Math.min(w, h);
      const sheetLong = Math.max(sheet.width, sheet.height);
      const sheetShort = Math.min(sheet.width, sheet.height);
      // Either way round: the board can be turned on the bed.
      if (long <= sheetLong && short <= sheetShort) continue;
      out.push(finding(7, 'red', at(panel.id, {
        message: `${unitNum} ${panel.id}: ${Math.round(w)} × ${Math.round(h)} mm `
          + `will not fit a ${sheet.width} × ${sheet.height} sheet.`,
      })));
    }

    // ── #8 a front wider than 600 at 110° ─────────────────────────────────
    for (const panel of result.panels || []) {
      if (panel.part !== 'FRONT' || panel.role !== 'front' || panel.meta?.appliance) continue;
      const angle = Number(panel.meta?.hingeAngleDeg ?? result.hardware?.find?.((h) => h.role === 'hinge')?.angle) || 110;
      if (angle >= 155) continue;
      if ((Number(panel.w) || 0) <= wide) continue;
      out.push(finding(8, 'yellow', at(panel.id, {
        message: `${unitNum} ${panel.id}: ${Math.round(panel.w)} mm wide at ${angle}° — consider 155°.`,
        subject: {
          unitId, panelId: panel.id, editor: 'element', section: 'hinges',
        },
      })));
    }

    // ── #9 and #10, the two guards F3 wired ───────────────────────────────
    for (const f of unitFindings(result, { profile, unitId, unitNum })) {
      out.push(finding(f.check, 'red', at(f.panel, {
        message: f.message,
        subject: f.panel ? { unitId, panelId: f.panel, editor: 'part-detail' } : { unitId, editor: 'cabinet' },
        code: f.code,
        layer: f.layer,
      })));
    }

    // ── #5 an open gap above the run, with no infill ──────────────────────
    if (roomHeight > 0) {
      const top = unitTop(unit, profile);
      const gap = roomHeight - top;
      if (gap >= window.from && gap <= window.to && !hasTopInfill(unit)) {
        out.push(finding(5, 'yellow', at(null, {
          message: `${unitNum}: ${Math.round(gap)} mm of open gap above it and no infill — `
            + 'infill? (dust collection)',
        })));
      }
    }

    // ── #6 a base run standing with no plinth ─────────────────────────────
    if (takesPlinth(unit.type, profile) && unit.params?.plinth !== true
      && (Number(unitBase(unit, profile)) || 0) > 0) {
      out.push(finding(6, 'yellow', at(null, {
        message: `${unitNum}: standing on legs with no plinth.`,
      })));
    }
  }

  // ── #2 front gaps, under F4's neighbour measure ─────────────────────────
  const clearances = frontClearances({
    entries,
    units: list,
    baseOf: (u) => unitBase(u, profile),
    wallWidthOf,
    profile,
  });
  for (const row of frontGapRows(clearances, profile)) {
    if (row.level === 'ok') continue;
    const first = row.fronts?.[0] || {};
    out.push(finding(2, row.level === 'parked' ? 'yellow' : row.level, {
      unitId: first.unitId || null,
      unitNum: first.unitNum || '',
      panelId: first.panelId || null,
      message: row.message,
      subject: first.panelId
        ? { unitId: first.unitId, panelId: first.panelId, editor: 'element' }
        : null,
      gapRow: row,
    }));
  }

  // ── #11 carcasses in a run that do not touch ────────────────────────────
  for (const g of carcassGaps(list, profile)) {
    out.push(finding(11, 'red', {
      unitId: g.rightUnitId,
      unitNum: g.rightNum,
      panelId: null,
      message: g.message,
      subject: { unitId: g.rightUnitId, editor: 'cabinet' },
      carcassGap: g,
    }));
  }

  // Reds first, then yellows, then the checks in their own order — which is the
  // order a joiner works down a list in.
  const rank = { red: 0, yellow: 1 };
  return out.sort((a, b) => (rank[a.level] - rank[b.level]) || (a.check - b.check)
    || String(a.unitNum).localeCompare(String(b.unitNum)));
}

/** How the panel's header reads: what was found, in one sentence. */
export function checkSummary(findings) {
  const reds = (findings || []).filter((f) => f.level === 'red').length;
  const yellows = (findings || []).filter((f) => f.level === 'yellow').length;
  if (!reds && !yellows) return 'Nothing to fix — the job is ready to cut.';
  const parts = [];
  if (reds) parts.push(`${reds} fault${reds === 1 ? '' : 's'}`);
  if (yellows) parts.push(`${yellows} to look at`);
  return parts.join(' · ');
}
