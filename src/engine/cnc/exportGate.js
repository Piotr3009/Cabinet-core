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
export function unitFindings(result, { profile = null, unitId = null, unitNum = null } = {}) {
  const num = unitNum || result?.unitNum || '';
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

  for (const entry of entries || []) {
    const { unit, result } = entry || {};
    if (!result) continue;
    const unitId = unit?.id || result.unitId || null;
    const unitNum = result.unitNum || unit?.params?.unit_num || '';
    const mine = unitFindings(result, { profile, unitId, unitNum });
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
