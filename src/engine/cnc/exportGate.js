// ─── THE EXPORT GATE (turn 31, CLAUDE.md F3) ────────────────────────────────
//
// "Both guards run before files are written. A faulty panel is HELD OUT of the
// export — message names it — with an explicit 'Export anyway' for the owner's
// own judgement. Everything clean exports normally."
//
// Turn 25 wrote the outline guard and never wired it to the export the owner
// presses; turn 31 writes the drill guard beside it. This is the wiring, and it
// is one pure function so the same answer serves the CNC tree's three export
// buttons, the Check panel and a test.
//
// ─── WHY "HELD OUT" AND NOT "BLOCKED" ───────────────────────────────────────
//
// A gate that refuses the whole export because one back panel has a doubled
// edge is a gate that gets switched off the first Friday it costs somebody an
// afternoon. A gate that quietly sends the faulty board to the machine is worse
// than none at all. So the answer is neither: the clean parts go, the faulty
// one stays behind, and the joiner is TOLD WHICH ONE by name. He then either
// fixes it or presses "Export anyway" — which is the owner's own judgement, and
// the app has no business overruling it.
//
// ─── RULE 4 AGAIN: IT SPEAKS, IT NEVER FIXES ────────────────────────────────
//
// Nothing here re-winds a loop, drops a duplicate hole or re-spaces a hinge
// ladder. It sorts the panels into two piles and writes the sentence.
//
// Pure — no React, no store, no three.js, no jszip.

import { resultFindings } from './edgeGuard.js';
import { drillFindings } from './drillGuard.js';
import { frontDecorationFindings, frontLayerFindings } from './frontOperations.js';
import { offBoardGateFindings } from './offBoardGuard.js';
import { panelEntities } from './dxf.js';

/**
 * Both guards, on one computed cabinet, in the app's own finding shape.
 *
 * Check #9 is the OUTLINE (turn 25's guard, at last wired) and Check #10 is the
 * DRILLING (turn 31's). They are reported together because the question the
 * export asks is one question — "is this board safe to cut?" — and a caller
 * that had to remember two calls is a caller that will one day remember one.
 *
 * @param {object} result   computeCabinet() output
 * @param {object} opts     { profile, unitId, unitNum }
 * @returns {Array} findings, each { check, level, unitId, unitNum, panel,
 *                  layer, code, message }
 */
export function unitFindings(result, { profile = null, unitId = null, unitNum = null, decorationLayerFindings = null } = {}) {
  const num = unitNum || result?.unitNum || '';
  const out = rememberedFindings(result, profile, unitId, num);
  out.push(...(decorationLayerFindings || frontLayerFindings([{ result, unit: { id: unitId } }])));
  return out;
}

// ─── CNC SPEED 01.11.2026: ONE ANSWER PER UNCHANGED CABINET ─────────────────
//
// The owner, 01.11.2026: "1 - ok, 2 - ok". Measured: the Check runs this gate
// for EVERY cabinet on every change (`engine/checks.js runChecks`), and the
// off-board part writes every board's DXF entity list to ask it; one width
// change ran 2 runChecks and 16 gates while the engine computed 1 cabinet
// (the owner's Black Kitchen plus six cabinets). The engine's answer
// for an unchanged cabinet is the SAME result object (`stores/resultCache.js`,
// which forgets every result the moment the profile or a catalogue is a
// different object), so the gate's own answer is remembered per result object
// the same way: a WeakMap keyed by the result, then by the profile object,
// then by the unit's id and number. A new result, a new profile object or
// another unit id or number is a new answer; nothing is kept for a result
// nobody holds any more. The guards are pure on those inputs (no catalogue,
// no store is read on this road). Each call hands back its OWN copy, so a
// caller that writes on a finding never writes on the next caller's.
// The layer findings of the export (`decorationLayerFindings`, read across
// every entry) are never remembered here: they are added after, as before.

const REMEMBERED = new WeakMap();
const NO_PROFILE = Object.freeze({});

/** A finding as plain data, copied all the way down (arrays and plain objects). */
function copyPlain(v) {
  if (Array.isArray(v)) return v.map(copyPlain);
  if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
    const out = {};
    for (const k of Object.keys(v)) out[k] = copyPlain(v[k]);
    return out;
  }
  return v;
}

/** The four guards on one cabinet, remembered per result object (see above). */
function rememberedFindings(result, profile, unitId, num) {
  if (!result || typeof result !== 'object') return ownFindings(result, profile, unitId, num);
  let byProfile = REMEMBERED.get(result);
  if (!byProfile) {
    byProfile = new WeakMap();
    REMEMBERED.set(result, byProfile);
  }
  const profileKey = profile && typeof profile === 'object' ? profile : NO_PROFILE;
  let byUnit = byProfile.get(profileKey);
  if (!byUnit) {
    byUnit = new Map();
    byProfile.set(profileKey, byUnit);
  }
  const key = JSON.stringify([unitId, num]);
  let found = byUnit.get(key);
  if (!found) {
    found = ownFindings(result, profile, unitId, num);
    byUnit.set(key, found);
    gateMemo.computed += 1;
  } else {
    gateMemo.reused += 1;
  }
  return found.map(copyPlain);
}

/**
 * How often the gate answered from memory and how often it asked the guards
 * (read by `test/cnc-speed-engine.test.js`; nothing in the app reads it).
 */
export const gateMemo = { computed: 0, reused: 0 };

/** Check #9 (the outline, what is drawn on the board, the front decoration) and #10 (the drilling). */
function ownFindings(result, profile, unitId, num) {
  const out = resultFindings(result).map((f) => ({
    check: 9,
    level: 'red',
    unitId,
    unitNum: num,
    panel: f.panel,
    part: f.part,
    layer: f.layer,
    code: f.code,
    message: `${num ? `${num} ` : ''}${f.message}`,
  }));
  out.push(...drillFindings(result, { profile, unitId, unitNum: num }));
  // CHAT FIX 19.10.2026 (the owner: *"czy mozesz sie upewnic na milion procent
  // ze wszystkie elementy sa zamkniete?"*): is everything the file draws ON
  // the board (the outline closed, every hole inside it, every text and mark
  // on it)? Asked of the writer's own entity list (`offBoardGuard.js`).
  out.push(...offBoardGateFindings(result, { profile, unitId, unitNum: num, panelEntities }));
  out.push(...frontDecorationFindings(result, { unitId, unitNum: num }));
  return out;
}

/**
 * Which PANELS a set of findings condemns.
 *
 * A finding that names a panel condemns that panel. A finding that names NONE —
 * the hinge-row clash, which is a fact about the carcass rather than about one
 * board — condemns every panel that carries the drilling it is about, which is
 * the hinged SIDES. Anything else would either hold out the whole cabinet
 * (punishing a back panel for a hinge ladder) or hold out nothing (sending the
 * double-drilled side to the machine), and both of those are the failure this
 * gate exists to end.
 */
export function condemnedPanels(findings, result) {
  const ids = new Set();
  for (const f of findings || []) {
    if (f.panel) { ids.add(f.panel); continue; }
    if (f.code !== 'hinge-rows-too-close') continue;
    for (const d of result?.drills || []) {
      if (d.kind === 'hinge' && d.panel) ids.add(d.panel);
    }
  }
  return ids;
}

/**
 * The gate, for one export.
 *
 * @param {Array} entries  [{ unit, result, panels }] — the cabinets whose parts
 *                         are about to be written. `panels` is optional and is
 *                         the SELECTION where the caller has one.
 * @param {object} opts    { profile }
 * @returns {{
 *   ok: boolean,             nothing to say
 *   findings: Array,         every fault, both guards
 *   heldPanelIds: Set,       `${unitId}::${panelId}` — what stays behind
 *   held: Array,             [{ unitId, unitNum, panelId, codes }]
 *   message: string|null,    the sentence that NAMES them
 * }}
 */
export function exportGate(entries, { profile = null } = {}) {
  const findings = [];
  const held = [];
  const heldPanelIds = new Set();
  const layerFindings = frontLayerFindings(entries);

  for (const entry of entries || []) {
    const { unit, result } = entry || {};
    if (!result) continue;
    const unitId = unit?.id || result.unitId || null;
    const unitNum = result.unitNum || unit?.params?.unit_num || '';
    const mine = unitFindings(result, {
      profile, unitId, unitNum,
      decorationLayerFindings: layerFindings.filter((finding) => finding.unitId === unitId),
    });
    if (!mine.length) continue;
    findings.push(...mine);

    const condemned = condemnedPanels(mine, result);
    // Only panels this export was actually going to write: a fault on a part
    // nobody selected is still worth REPORTING (it is in `findings`, and the
    // Check panel shows it) and holding it "out" of an export it was never in
    // would name a board the joiner is not looking at.
    const inThisExport = entry.panels
      ? new Set(entry.panels.map((p) => p.id))
      : new Set((result.panels || []).map((p) => p.id));

    for (const panelId of condemned) {
      if (!inThisExport.has(panelId)) continue;
      heldPanelIds.add(`${unitId}::${panelId}`);
      held.push({
        unitId,
        unitNum,
        panelId,
        codes: [...new Set(mine.filter((f) => f.panel === panelId || !f.panel).map((f) => f.code))],
      });
    }
  }

  return {
    ok: held.length === 0,
    findings,
    heldPanelIds,
    held,
    message: held.length ? holdMessage(held) : null,
  };
}

/** The sentence that NAMES what stayed behind. */
export function holdMessage(held) {
  if (!held?.length) return null;
  const names = held.map((h) => `${h.unitNum ? `${h.unitNum} ` : ''}${h.panelId}`);
  const list = names.slice(0, 4).join(', ');
  const rest = names.length > 4 ? ` and ${names.length - 4} more` : '';
  return `${names.length} part${names.length === 1 ? '' : 's'} held out of this export — `
    + `${list}${rest}. Fix the fault, or export anyway.`;
}

/** Is this panel of this unit held back? */
export function isHeld(gate, unitId, panelId) {
  return Boolean(gate?.heldPanelIds?.has(`${unitId}::${panelId}`));
}

/**
 * The panels that actually get written.
 *
 * `exportAnyway` is the owner's own judgement and it is honoured completely —
 * the gate still reports, and nothing is withheld.
 */
export function panelsThatGo(panels, { gate, unitId, exportAnyway = false }) {
  if (exportAnyway || !gate || gate.ok) return panels;
  return (panels || []).filter((p) => !isHeld(gate, unitId, p.id));
}
