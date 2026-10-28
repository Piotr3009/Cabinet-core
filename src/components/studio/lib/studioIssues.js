/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T84 F5, THE ERRORS YOU CAN SEE (CLAUDE.md T84 PART C): THE PURE HALF ───
//
// The owner, 27.10.2026: *"napewno naprzyklad wszystkie bledy zolte i czerwone
// sa totalnie niewidoczne, mala czcionka etc"*. From T84 a finding stands in
// three places at once, 13 px, dark text on the warn or danger ground: THE
// MARKER beside the unit number in the scene, THE STRIP in the unit's card and
// over the full panel's rows, THE COUNTERS on the status bar. This module says
// what each of the three shows, and nothing else.
//
// One source: the Check's own findings (engine/checks.js runChecks, read
// through the one shared reader lib/checkFindings.js useCheckFindings), sorted
// by the engine reds first. One filter: the engine's own findingsToAct, so a
// NOTE (#45, the service void behind a vanity) informs and is never "to look
// at", here exactly as on the rail's Check badge, in the export preflight and
// in the Check panel's summary. Nothing here re-words a finding: a strip line
// is the Check's number and the finding's own sentence.
//
// And the REFUSED FIELD's law (CLAUDE.md T84 F5, THE REFUSED FIELD): what one
// commit, one Escape or one change from outside does to a field whose setter
// said no. RefusedField.jsx is its only writer; the law is here so a node test
// holds it to its word.
//
// How the three LOOK (13 px, dark on the level's ground, the profile's
// colours) is not here either: it is the skin's one stylesheet for the class
// vocabulary the components carry (studio.css `.studio-marker`,
// `.studio-issue-strip`, `.studio-counter`, `.studio-refused`, each `.is-red` /
// `.is-yellow` where a level is shown).
//
// Pure: no React, no store, no DOM (verify/t84/agents/CONTRACT.md section 2).

import { findingsToAct } from '../../../engine/checks.js';

/** The two levels a person acts on, in the order the Studio shows them: red first. */
export const ISSUE_LEVELS = Object.freeze(['red', 'yellow']);

/**
 * The findings to act on, grouped by unit and by level.
 *
 * @param {Array} findings  runChecks() output (reds, then yellows, then notes)
 * @returns {{ units: Map<string, { red: Array, yellow: Array }>, red: number, yellow: number }}
 *   `units` holds every unit with at least one red or yellow finding, each
 *   level in the Check's own order. A finding that names no unit (a job's own,
 *   such as the runner catalogue that could not be reached) is counted in
 *   `red` / `yellow` and stands on no unit. A note is dropped by findingsToAct;
 *   a level the Check panel does not count (checkSummary counts red and yellow)
 *   is not counted here either.
 */
export function groupIssues(findings) {
  const units = new Map();
  let red = 0;
  let yellow = 0;
  for (const f of findingsToAct(findings)) {
    if (f.level !== 'red' && f.level !== 'yellow') continue;
    if (f.level === 'red') red += 1; else yellow += 1;
    if (f.unitId == null) continue;
    let at = units.get(f.unitId);
    if (!at) {
      at = { red: [], yellow: [] };
      units.set(f.unitId, at);
    }
    at[f.level].push(f);
  }
  return { units, red, yellow };
}

/**
 * THE MARKER'S COLOUR LAW: a red triangle for a unit with any red finding, a
 * yellow one for a unit with yellow only, none for a unit with nothing to fix.
 *
 * @param {{ red?: number, yellow?: number }|null} counts
 * @returns {'red'|'yellow'|null}
 */
export function markerLevel(counts) {
  if (!counts) return null;
  if (Number(counts.red) > 0) return 'red';
  if (Number(counts.yellow) > 0) return 'yellow';
  return null;
}

/**
 * One unit's issues, for its marker and its strip: the findings red first,
 * then yellow, each level in the Check's own order; the two counts; the
 * marker's level. Null when the unit has nothing to fix (a note alone is
 * nothing to fix).
 *
 * @param {Array} findings
 * @param {string} unitId
 */
export function unitIssue(findings, unitId) {
  if (unitId == null) return null;
  const at = groupIssues(findings).units.get(unitId);
  if (!at) return null;
  const counts = { red: at.red.length, yellow: at.yellow.length };
  return {
    unitId,
    ...counts,
    count: counts.red + counts.yellow,
    level: markerLevel(counts),
    findings: [...at.red, ...at.yellow],
  };
}

/**
 * A strip's line in the finding's own words: the Check's number and its
 * sentence, `#48 · <message>`, as CLAUDE.md T84 F5 writes it and as the Check
 * panel heads the same row (`#{f.check} · ...`), so the two can be matched.
 */
export function issueStripText(finding) {
  return `#${finding?.check ?? ''} · ${finding?.message ?? ''}`;
}

/** Each level that has findings, red first, with its words: `1 red`, `3 yellow`. */
function countParts({ red = 0, yellow = 0 } = {}) {
  return ISSUE_LEVELS
    .map((level) => ({ level, count: Number(level === 'red' ? red : yellow) || 0 }))
    .filter((part) => part.count > 0)
    .map((part) => ({ ...part, label: `${part.count} ${part.level}` }));
}

/**
 * THE COUNTERS' TEXT: `1 red · 3 yellow`. A level with nothing in it is not
 * said (`3 yellow`, `2 red`): a counter is a button that opens the Check at
 * that level, and a `0 red` button would open an empty list. Nothing to fix
 * at all is the empty string, and the status bar then shows no counter.
 *
 * @param {{ red?: number, yellow?: number }} counts
 */
export function issueCountText(counts) {
  return countParts(counts).map((part) => part.label).join(' · ');
}

/**
 * The status bar's counters for the whole job (every finding to act on,
 * those that stand on no unit included, as the rail's Check badge counts
 * them): one per level that has any, red first.
 *
 * @returns {Array<{ level: 'red'|'yellow', count: number, label: string }>}
 */
export function issueCounters(findings) {
  const { red, yellow } = groupIssues(findings);
  return countParts({ red, yellow });
}

// ─── THE REFUSED FIELD'S LAW (CLAUDE.md T84 F5) ─────────────────────────────
//
// *"when the setter returns a refusal (roomFitRefusalFor's notice, the leaf
// count's, the pocket's `said`), the field turns red with the reason under it
// in 13 px, the typed value stays unapplied, Escape restores the last applied
// one; a refused change never enters the history. The reason is the engine's
// exact sentence, never a Studio paraphrase."*
//
// The state is null (nothing refused) or `{ typed, reason }`. The APPLIED value
// is never in it: it is the store's, handed to the field as `value`, and
// nothing in this law can write it.

/** Two field values are one when both are empty or both are the same number. */
function sameFieldValue(a, b) {
  const empty = (v) => v == null || v === '';
  if (empty(a) || empty(b)) return empty(a) && empty(b);
  const x = Number(a);
  const y = Number(b);
  return Number.isFinite(x) && Number.isFinite(y) && x === y;
}

/**
 * What a setter said, read once: `{ ok: false, reason }` is a refusal, its
 * sentence kept byte for byte; anything else (`{ ok: true }`, nothing) is an
 * applied value.
 *
 * @returns {{ reason: string }|null}
 */
export function refusalOf(answer) {
  if (!answer || typeof answer !== 'object' || answer.ok !== false) return null;
  return { reason: answer.reason == null ? '' : String(answer.reason) };
}

/**
 * Does this commit reach the setter at all? Not when it is the blur of an
 * Escape (the house NumberField blurs on Escape and its blur commits the typed
 * text, verify/t84/p1-escape.md C case 1: the Studio's field abandons it), and
 * not when it is the applied value again (no change: nothing to apply and
 * nothing to refuse, and the store's own setter would write nothing either).
 */
export function shouldCommitField({ value, applied, abandoned = false } = {}) {
  if (abandoned) return false;
  return !sameFieldValue(value, applied);
}

/**
 * The refused field's next state.
 *
 * @param {{ typed: number, reason: string }|null} state
 * @param {{ type: 'commit', value: number, answer: any }|{ type: 'escape' }|{ type: 'outside' }} event
 *   commit   the setter's answer to `value`: refused, the typed value is held
 *            beside the applied one with the setter's own sentence; applied,
 *            nothing is held
 *   escape   the last applied value is shown again; nothing was written
 *   outside  the applied value moved from outside (an Undo, a clamp, another
 *            field): a refusal of the old one is over
 */
export function refusedFieldAfter(state, event) {
  switch (event?.type) {
    case 'commit': {
      const no = refusalOf(event.answer);
      return no ? { typed: event.value, reason: no.reason } : null;
    }
    case 'escape':
    case 'outside':
      return null;
    default:
      return state ?? null;
  }
}

/** What the field shows: the typed value while it is refused, else the applied one. */
export function refusedFieldShows(state, applied) {
  return state ? state.typed : applied;
}
