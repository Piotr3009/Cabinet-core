// ─── THE RUNNERS, AS HARDWARE (turn 18, CLAUDE.md F6) ───────────────────────
//
// The owner uploaded the whole MOVENTO 760H ladder to Supabase Storage: bucket
// `hardware`, folder `runners/blum/movento/` INSIDE it (turn 20, CLAUDE.md
// F2.1 — turn 18 wrote the bucket's name into the path as well and every
// request came back 400), 40 GLB files (pairs L/R, NL 250–450, variants
// S / T / SU) and a `manifest.json` beside them naming the nominal length, the
// variant and the ARTICLE NUMBER of each one, with the system at the top.
//
// Everything in this file is a decision ABOUT a runner and none of it is a
// picture of one: which nominal length a cabinet takes, which variant a drawer
// is fitted with, whether the pair needs a synchronisation rod and which. The
// 3D lives in 3d/runnerModels.js, the fetching in lib/runnerCatalogue.js, and
// both of them ask here.
//
// ─── THE MANIFEST IS THE CATALOGUE, FOR NOW (F6.8) ─────────────────────────
// There is no `cc_hardware` table yet — that waits for the data module — so the
// file the owner uploaded beside the models IS the parts list, and it is pushed
// in here by the loader exactly as the EGGER decor pack is pushed into
// engine/decors.js (turn 8). The engine never fetches: it is handed a
// catalogue, or it is not, and it works either way.
//
// What is NOT in the manifest is in profile.js — the nominal-length ladder, the
// rod thresholds, the variants and their labels — because those are NUMBERS
// (CLAUDE.md rule 2) and because they are the offline truth: with the bucket
// unreachable the app still knows a 490 mm drawer takes a 450 runner and that a
// 900 mm one needs a rod. What it will not know is the article number, and it
// says so rather than inventing one.
//
// Pure functions — no React, no store, no fetch.

import { hardwareModelSrc, hardwareModelUrl } from './hardwareUrl.js';
import { cascade, companyDefaults } from './companyDefaults.js';

/**
 * The manifest, once somebody has read it. `null` until then, and `null` is a
 * complete answer: it means "no article numbers", not "no runners".
 */
let CATALOGUE = null;

/**
 * Hand the engine the parts list read out of the bucket.
 *
 * @param {object|null} manifest  { files: [{ file, system, nl, variant, side,
 *                                  article }] } — or anything close to it; the
 *                                  parser below is forgiving because the file
 *                                  is the owner's and not a schema we own.
 */
export function setRunnerCatalogue(manifest) {
  CATALOGUE = parseRunnerManifest(manifest);
  return CATALOGUE;
}

/** What the engine currently knows, or null. */
export function runnerCatalogue() {
  return CATALOGUE;
}

/** Forget it — for tests, and for a workshop switching projects. */
export function clearRunnerCatalogue() {
  CATALOGUE = null;
}

const SIDES = new Set(['L', 'R']);

/**
 * Normalise whatever shape the manifest arrives in into one list of entries.
 *
 * The owner's file names four things per model — system, nl, variant, article —
 * and the FILE NAME is the fifth. A row missing any of the first four is
 * dropped rather than guessed at: half an entry in a parts list is how a
 * workshop orders the wrong runner.
 */
export function parseRunnerManifest(raw) {
  const rows = Array.isArray(raw) ? raw
    : (Array.isArray(raw?.files) ? raw.files
      : (Array.isArray(raw?.runners) ? raw.runners
        : (Array.isArray(raw?.items) ? raw.items : null)));
  if (!rows) return null;
  // ─── TURN 20 (CLAUDE.md F2.3): THE HEADER'S SYSTEM ────────────────────────
  // The file the owner uploaded names the system ONCE, at the top — `system:
  // "movento"`, `profile: "760H"` — and turn 18's parser wanted it on every
  // row, so it dropped all forty of them and the app went on drawing grey
  // boxes with nothing in the console to say why. A row that does not say is
  // a row that means the header, which is what the file plainly intends.
  const header = String(raw?.system ?? raw?.profile ?? '').trim();
  const files = [];
  for (const row of rows) {
    const file = String(row?.file ?? row?.name ?? '').trim();
    const nl = Number(row?.nl ?? row?.nominal_length ?? row?.length_mm);
    const variant = String(row?.variant ?? '').trim().toUpperCase();
    const system = String(row?.system ?? '').trim() || header;
    // nl and variant are still required — a row that cannot say WHICH runner
    // it is cannot be ordered, and half an entry in a parts list is how a
    // workshop buys the wrong one.
    if (!file || !(nl > 0) || !variant) continue;
    // The side is on the row where the owner put it and in the file name where
    // he did not — `…-450-T-L.glb`. Neither is guessed: a file that says
    // neither is a PAIR file and is offered for both sides.
    const said = String(row?.side ?? '').trim().toUpperCase();
    const fromName = (file.toUpperCase().match(/[-_]([LR])(?=[-_.])/) || [])[1] || '';
    const side = SIDES.has(said) ? said : (SIDES.has(fromName) ? fromName : null);
    files.push({
      file,
      system,
      nl,
      variant,
      side,
      article: row?.article == null ? null : String(row.article),
    });
  }
  return { files };
}

/**
 * The nominal length this cabinet's drawers run on: the LARGEST standard runner
 * that fits the usable depth (CLAUDE.md F6.3 — "as the engine already does").
 *
 * It is the same rule and the same ladder `snapDrawerDepth` has used since turn
 * 1 (`profile.wardrobe.drawers.depthSteps`); this states it in the runner's own
 * words so a test can pin it without reaching into the cabinet builder, and so
 * that the model the view loads and the box the engine cuts are chosen by ONE
 * function.
 *
 * @returns {number|null} null where nothing in the ladder fits at all
 */
export function runnerNominalLength(usableDepth, profile) {
  const steps = profile?.wardrobe?.drawers?.depthSteps || [];
  let best = null;
  for (const step of steps) if (step <= Number(usableDepth)) best = step;
  return best;
}

/**
 * Which runner one drawer is fitted with: project → unit → drawer.
 *
 * The colour hierarchy exactly (turn 13, CLAUDE.md F3), because it is the same
 * question asked about a different thing — what somebody SAID nearest to the
 * piece wins, and what nobody said falls through to the project and then to the
 * workshop's own default.
 *
 * @param {object} args
 *   drawer   1-based, from the floor — or null for "this whole cabinet"
 *   unit     the project unit (its params carry the per-drawer overrides)
 *   design   the project design (`design.runners.variant`)
 *   profile
 */
export function resolveRunnerVariant({
  drawer = null, unit = null, design = null, company = undefined, profile,
}) {
  const M = profile.hardware.runner.movento;
  const row = company === undefined ? companyDefaults() : company;
  // ─── Turn 22 (CLAUDE.md F2b.3) ───
  // The same four-storey ladder every other preference climbs, in the one
  // implementation: profile → company row → project → element. The ELEMENT is
  // two rungs of its own here and always has been — this cabinet, then this
  // drawer — because a joiner fits one drawer differently without re-declaring
  // the cabinet.
  return cascade([
    M.defaultVariant,
    row?.runner_variant,
    design?.runners?.variant,
    unit?.params?.runner_variant,
    drawer != null ? unit?.params?.runner_variants?.[String(drawer)] : null,
  ], {
    allowed: new Set((M.variants || []).map((v) => v.id)),
    normalise: (v) => String(v).trim().toUpperCase(),
  }) || M.defaultVariant;
}

/**
 * The catalogue entry for one runner, or null where the bucket has not been
 * read (or has nothing that matches).
 */
export function runnerEntry({
  system, nl, variant, side = null,
}) {
  const cat = CATALOGUE;
  if (!cat) return null;
  const want = String(variant || '').toUpperCase();
  // ─── TURN 20 (CLAUDE.md F2.3): SYSTEM SELECTS THE CATALOGUE, NOT THE ROW ──
  // `system` used to be a per-row filter here, so a manifest whose header says
  // `movento` and whose rows say nothing could never match a profile asking
  // for `760H` — and the list came back empty with no error anywhere. The
  // profile's system string decides WHICH catalogue is loaded (there is one
  // per family, beside its own models); the match inside a loaded catalogue is
  // on the three things that actually distinguish two runners in it. The
  // parameter is kept so callers read the same, and it is honoured when the
  // catalogue is one that really does carry the word.
  const knowsSystem = system && cat.files.some((f) => f.system === system);
  const matches = cat.files.filter((f) => (!knowsSystem || f.system === system)
    && f.nl === Number(nl)
    && f.variant === want
    && (side == null || f.side == null || f.side === side));
  // A side-specific file beats a pair file when both are there.
  return matches.find((f) => f.side === side) || matches[0] || null;
}

/**
 * Where that model actually lives, as a URL the browser can fetch.
 *
 * Turn 20 (CLAUDE.md F2.3): the file lives BESIDE ITS MANIFEST, so only the
 * basename of the manifest's `file` is used — engine/hardwareUrl.js carries
 * the rule and the reason, and the hinges follow the same one.
 */
export function runnerModelUrl(entry, profile, storageBase = '') {
  const M = profile.hardware.runner.movento;
  return hardwareModelUrl({
    file: entry?.file, bucket: M.bucket, path: M.path, storageBase,
  });
}

/**
 * The fetchable URL for a runner model — or null.
 *
 * Turn 21 (CLAUDE.md F2.1): the hinges' twin, through the same one helper, so
 * the two families cannot drift apart the way turn 19 and turn 20 let them.
 * Null where there is no host: a path with no host is not a URL, and a loader
 * handed one asks the app's own domain for a file the app does not serve.
 */
export function runnerModelSrc(entry, profile, storageBase = '') {
  const M = profile.hardware.runner.movento;
  return hardwareModelSrc({
    file: entry?.file, bucket: M.bucket, path: M.path, storageBase,
  });
}

/**
 * The pair a drawer needs, as the BOM orders it: the spec always, the article
 * numbers when the bucket has been read (CLAUDE.md F6.7).
 *
 * @returns {{system, nl, variant, articles:{L:string|null, R:string|null},
 *            complete:boolean}}
 */
export function runnerPairSpec({ nl, variant, profile }) {
  const M = profile.hardware.runner.movento;
  const article = (side) => runnerEntry({
    system: M.system, nl, variant, side,
  })?.article ?? null;
  const articles = { L: article('L'), R: article('R') };
  return {
    system: M.system,
    nl: Number(nl) || null,
    variant: String(variant || M.defaultVariant).toUpperCase(),
    articles,
    complete: Boolean(articles.L && articles.R),
  };
}

/**
 * Does this drawer need a SYNCHRONISATION ROD, and which one?
 *
 * A rod ties the two runners of a wide drawer together so the box cannot rack.
 * Blum's own thresholds for TIP-ON BLUMOTION on MOVENTO, cited here because
 * they are the sort of number that gets rounded off by somebody who "knows"
 * them (blum.com, TIP-ON BLUMOTION for MOVENTO):
 *
 *   • below `unitAloneBelow` (314 mm cabinet opening width) the unit works
 *     alone — no rod at all;
 *   • `narrow` (281–305) takes the NARROW rod;
 *   • `withAdapters` (314–1385) takes the rod with its adapters.
 *
 * The two ranges overlap the way Blum's own table does, and the order below is
 * the order that table reads in: the narrow rod first, the adapter rod after.
 *
 * The LENGTH is parametric (F6.5): the rod spans the drawer box and loses the
 * fixed ends the adapters take up, so a workshop that changes box widths gets a
 * rod that changes with them rather than a number somebody typed once.
 *
 * @param {object} args
 *   openingWidth  the cabinet's internal width — what Blum's table is indexed on
 *   boxWidth      the drawer box's own width, which is what the rod spans
 * @returns {{fitted:boolean, kind:'none'|'narrow'|'adapters', length:number|null}}
 */
export function syncRodFor({ openingWidth, boxWidth, profile }) {
  const R = profile.hardware.runner.movento.rod;
  const w = Number(openingWidth) || 0;
  if (w < R.unitAloneBelow && !(w >= R.narrow[0] && w <= R.narrow[1])) {
    return { fitted: false, kind: 'none', length: null };
  }
  const kind = (w >= R.narrow[0] && w <= R.narrow[1]) ? 'narrow' : 'adapters';
  if (kind === 'adapters' && (w < R.withAdapters[0] || w > R.withAdapters[1])) {
    return { fitted: false, kind: 'none', length: null };
  }
  const length = Math.max(0, (Number(boxWidth) || 0) - R.endAllowance);
  return { fitted: true, kind, length };
}
