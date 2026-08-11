// ─── HARDWARE HEALTH, WITHOUT DEVTOOLS (turn 22, CLAUDE.md F3) ──────────────
//
// "The owner has diagnosed two turns from his console. Give him the line in the
// app instead."
//
// Turn 20's missing runner models and turn 21's host-less hinge URL were both
// found the same way: the owner pasted his console at us. Everything needed to
// say it in the app was already in the app — the engine's catalogues know how
// many models a family HAS, `3d/glbSource.js` knows which of them arrived, and
// `lib/hardwareSource.js` knows where the catalogue itself came from. Three
// registries, one sentence, and this file is only the sentence.
//
// IT FETCHES NOTHING. CLAUDE.md F3.1 says so in as many words — "Read from the
// existing registries; no new fetching" — and it matters: a health line that
// went and looked would report on requests it had made itself rather than on
// the ones the app made, which is precisely the mistake R4 exists to stop.
//
// The one thing this module DOES do is `refreshHardwareCatalogues`, and that is
// not the health line: it is F2a's resolution — the DB row overruling what
// shipped — called once at boot from App.jsx.

import { hingeCatalogue } from '../engine/hinges.js';
import { runnerCatalogue } from '../engine/runners.js';
import { getCabinetProfile } from '../engine/profile.js';
import { glbStats } from '../3d/glbSource.js';
import {
  HARDWARE_FAMILIES, hardwareFamilySpec, hardwareSourceOf, resolveHardwareCatalogue,
} from './hardwareSource.js';

/**
 * Let a `cc_hardware` row overrule what shipped in the repository.
 *
 * The RUNNERS are not here: `lib/runnerCatalogue.js` already resolves them
 * through the same function, with the memoisation and the "ask again when the
 * host arrives" that turn 21 gave it. Asking twice would be two requests for
 * one manifest.
 */
export async function refreshHardwareCatalogues(options = {}) {
  const out = {};
  for (const family of ['hinges', 'lifts']) {
    // eslint-disable-next-line no-await-in-loop
    out[family] = await resolveHardwareCatalogue({ ...options, family });
  }
  publish();
  return out;
}

/** How many models this family's catalogue names — the "expected" of F3.1. */
function expectedModels(family) {
  if (family === 'runners') return (runnerCatalogue()?.files || []).filter((f) => f.file).length;
  if (family === 'hinges') return (hingeCatalogue()?.items || []).filter((i) => i.file).length;
  return 0;
}

/**
 * A short name for the line — "Movento", "CLIP top" — rather than the system
 * string, because the owner's own example in CLAUDE.md is
 * `Movento 40/40 · CLIP top 19/19`.
 */
const SHORT = { runners: 'Movento', hinges: 'CLIP top', lifts: 'AVENTOS' };

/**
 * The status of every hardware family, as the row renders it.
 *
 * `loaded` and `failed` are counted out of `3d/glbSource.js` — the decode cache
 * — filtered to this family's own folder in the bucket. A model nobody has
 * needed yet is neither: it has never been asked for, and calling that a
 * failure would light the row red on a project with no drawers in it.
 *
 * @returns {Array<{family, label, short, system, source, expected, asked,
 *                  loaded, failed, pending, firstFailure, manifestUrl, error}>}
 */
export function hardwareHealth(profile = getCabinetProfile()) {
  return HARDWARE_FAMILIES.map((family) => {
    const spec = hardwareFamilySpec(family, profile);
    const answer = hardwareSourceOf(family);
    const folder = `/${spec.bucket}/${spec.path}`;
    const stats = glbStats((url) => typeof url === 'string' && url.includes(folder));
    return {
      family,
      label: spec.label,
      short: SHORT[family] || spec.label,
      system: answer?.system || spec.system || null,
      // Where the CATALOGUE came from. `null` means nobody has asked yet,
      // which on the lifts is the honest answer all session.
      source: answer?.source || null,
      rows: answer?.rows ?? 0,
      expected: expectedModels(family),
      asked: stats.asked,
      loaded: stats.loaded,
      failed: stats.failed,
      pending: stats.pending,
      // The FIRST failing url, copyable — because that one string is what the
      // owner has been pasting to us for two turns.
      firstFailure: stats.failures[0] || null,
      manifestUrl: answer?.url || null,
      error: answer?.error || null,
    };
  });
}

/** One line, as the row prints it: `Movento 40/40 · CLIP top 19/19`. */
export function hardwareHealthLine(rows = hardwareHealth()) {
  return rows
    .filter((r) => r.expected > 0)
    .map((r) => `${r.short} ${r.loaded}/${r.expected}`)
    .join(' · ');
}

/**
 * Publish it beside the other two diagnostics, so the acceptance walk can
 * assert the NUMBERS against the registries rather than against the pixels
 * (R4, and F3.2 in as many words).
 */
export function publish() {
  if (typeof window === 'undefined') return;
  const cc = (window.__cc = window.__cc || {});
  cc.hardwareHealth = {
    rows: () => hardwareHealth(),
    line: () => hardwareHealthLine(),
  };
}
