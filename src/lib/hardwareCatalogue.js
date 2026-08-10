// ─── THE KNOWLEDGE FILES (turn 19, CLAUDE.md F0.2/F0.3) ─────────────────────
//
// The owner brought the whole Blum world as GLB, and the KNOWLEDGE came with
// it. It now lives IN THE REPOSITORY, under `reference/hardware/`:
//
//   cliptop-hinges.json      articles, finishes and the ANGLE RULE
//   movento.json             the runner ladder, by nominal length and variant
//   aventos.json             the lift components, the pf ranges, board weights
//   aventos-hf-drilling.json the HF five-pattern file (turn 20's, kept here)
//
// CLAUDE.md F0.3: "These four files are the CATALOGUE OF RECORD — the same
// standing the LISP files have for geometry. The bucket holds only the GLB
// bytes. A small loader in `src/lib/` reads them; the ENGINE never fetches."
//
// This is that loader, and it is the smallest one in the app because there is
// nothing to fetch: the files are in the repository, so they are IMPORTED, and
// the only work left is handing them to the engine's registries — the same
// hand-off lib/decorCatalogue.js makes for the EGGER pack and
// lib/runnerCatalogue.js makes for the runner manifest.
//
// The import attribute (`with { type: 'json' }`) rather than a bare specifier:
// it is what Node needs to load JSON from an ES module, which is what lets a
// node test read the very same file the browser build does. src/lib/
// pswColors.js has read reference/colors/psw-colors.json this way since turn 2.
//
// Zero new dependencies, no network, no failure path — a file that ships with
// the app cannot 404. What CAN be missing is the BUCKET the GLB bytes live in,
// and that is the models' problem (3d/hingeModels.js), not this file's.

import cliptop from '../../reference/hardware/cliptop-hinges.json' with { type: 'json' };
import movento from '../../reference/hardware/movento.json' with { type: 'json' };
import aventos from '../../reference/hardware/aventos.json' with { type: 'json' };
import aventosHfDrilling from '../../reference/hardware/aventos-hf-drilling.json' with { type: 'json' };

import { setHingeCatalogue } from '../engine/hinges.js';
import { setAventosCatalogue } from '../engine/lifts.js';

export const CLIPTOP_HINGE_CATALOGUE = cliptop;
export const MOVENTO_CATALOGUE = movento;
export const AVENTOS_CATALOGUE = aventos;
export const AVENTOS_HF_DRILLING_PATTERNS = aventosHfDrilling;

/** The four files, as the record of what a build is carrying. */
export const HARDWARE_FILES = [
  { id: 'cliptop-hinges', label: 'CLIP top hinges', raw: cliptop },
  { id: 'movento', label: 'MOVENTO runners', raw: movento },
  { id: 'aventos', label: 'AVENTOS lifts', raw: aventos },
  { id: 'aventos-hf-drilling', label: 'AVENTOS HF drilling', raw: aventosHfDrilling },
];

/**
 * Hand the catalogues to the engine. Idempotent, synchronous, unfailing.
 *
 * The RUNNERS are deliberately not in this hand-off. Turn 18 built a whole
 * pipeline round the `manifest.json` that sits beside the models in the bucket,
 * and `movento.json` is the same ladder written differently — it names the
 * system once at the top instead of per row, and it does not say which of a
 * pair's two articles is the left hand. Pushing it through the runner registry
 * would change what a drawer's BOM line says without anybody asking for it, and
 * this turn's iron rule is that nothing downstream moves. The file is EXPORTED
 * above, so turn 20 can adopt it deliberately; BACKLOG carries the question.
 *
 * @returns {{hinges:object|null, lifts:object|null}}
 */
export function loadHardwareCatalogues() {
  return {
    hinges: setHingeCatalogue(cliptop),
    lifts: setAventosCatalogue(aventos),
  };
}

/**
 * `movento.json` in the shape engine/runners.js parses — the adaptation turn 20
 * will need, written down while the difference is fresh. Nothing calls it yet.
 *
 * The runner registry wants a `system` on every row; this catalogue names the
 * system and the profile ONCE, at the top, which is the better file and the
 * wrong shape. Stamping it onto each row is the whole of the adaptation — no
 * number is changed, invented or dropped.
 */
export function toRunnerManifest(raw) {
  const system = String(raw?.profile || raw?.system || '').trim();
  const files = (raw?.items || []).map((row) => ({ ...row, system }));
  return { files };
}
