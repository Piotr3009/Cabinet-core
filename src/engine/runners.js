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
 * ─── TURN 34 (CLAUDE.md F3): THE NOMINAL IS THE BOX + 10 ────────────────────
 *
 * The owner, 16.08.2026, closing the T33-F9 review: *"powinien być skrzynka
 * +10 mm"* — the MOVENTO nominal a workshop orders against a box is the box
 * plus ten (his standing rule, stated the other way round for years: nominal
 * 450 ↔ box 440, 500 ↔ 490). T33 fed the ladder the BOX DEPTH, so a 490 box
 * ordered an NL450 — one rung short of the runner that actually goes in.
 *
 * This is the ONE place the +10 is applied. Every caller that has a BOX DEPTH
 * in its hand and wants a nominal asks here; nobody adds ten of their own.
 *
 * @param {number|null} boxDepth  the drawer box's own cut depth, in mm
 * @returns {number|null} the nominal to ask the ladder for, or null
 */
export function runnerAskFor(boxDepth, profile) {
  const d = Number(boxDepth);
  if (!Number.isFinite(d) || d <= 0) return null;
  const over = Number(profile?.hardware?.runner?.movento?.nominalOverBoxMm);
  return d + (Number.isFinite(over) ? over : 0);
}

/**
 * ─── TURN 33 (CLAUDE.md F9): THE OWNER'S LADDER ─────────────────────────────
 * The runner lengths this workshop orders. T33 shipped 300–600 every 50 with
 * the lower bound MARKED (Q1, "od 00"); turn 34 has his answer — *"od 250"* …
 * *"dopisujemy do 700"* — so the line reads 250–700 and the marker is gone.
 * ONE profile line; null where a profile has none, which keeps every caller
 * that predates the list on the catalogue snap.
 */
export function runnerLadder(profile) {
  const l = profile?.hardware?.runner?.movento?.nominalLadder;
  if (!Array.isArray(l) || !l.length) return null;
  return [...l].map(Number).filter((n) => n > 0).sort((a, b) => a - b);
}

/** The rung an asked-for length lands on: the largest not above the ask. */
export function ladderRungFor(nl, profile) {
  const ladder = runnerLadder(profile);
  if (!ladder) return Number(nl) || null;
  let best = null;
  for (const rung of ladder) if (rung <= Number(nl)) best = rung;
  return best;
}

/**
 * The catalogue entry for one runner, or null where the bucket has not been
 * read (or has nothing that matches).
 *
 * ─── TURN 33 (CLAUDE.md F9): THE LADDER RULES THE SNAP ──────────────────────
 * With a `ladder` in hand (the owner's 300–600/50), the ask lands on ITS rung
 * first — the largest not above the ask — and the article is what stands at
 * exactly that rung. A rung the bucket has no article for answers null and
 * the BOM prints the YELLOW named spec (never a shorter substitute); an ask
 * below the whole ladder answers null the same way. Without a ladder the
 * 15.08 chat-fix behaviour stands unchanged: snap down to the catalogue.
 */
export function runnerEntry({
  system, nl, variant, side = null, ladder = null,
}) {
  const cat = CATALOGUE;
  if (!cat) return null;
  const want = String(variant || '').toUpperCase();

  if (Array.isArray(ladder) && ladder.length) {
    let rung = null;
    for (const step of [...ladder].sort((a, b) => a - b)) if (step <= Number(nl)) rung = step;
    if (rung == null) return null;               // below the ladder: yellow
    const knowsSys = system && cat.files.some((f) => f.system === system);
    const rows = cat.files.filter((f) => (!knowsSys || f.system === system)
      && f.nl === rung
      && f.variant === want
      && (side == null || f.side == null || f.side === side));
    const hit = rows.find((f) => f.side === side) || rows[0] || null;
    if (!hit) return null;                       // a rung with no article: yellow
    return rung === Number(nl) ? hit : { ...hit, snappedFromNl: Number(nl) };
  }
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
  const exact = matches.find((f) => f.side === side) || matches[0] || null;
  if (exact) return exact;
  // ─── CHAT FIX 15.08.2026: SNAP DOWN TO THE CATALOGUE ─────────────────────
  // The engine's depth ladder and the owner's bucket speak different lengths
  // (the ladder said 440; the manifest knows 420 and 450), so every default
  // drawer since turn 18 asked for a length no file has — and the grey
  // profile never once gave way to a model. A runner one step SHORTER always
  // fits where the asked-for one would; longer never safely does. So: the
  // LARGEST catalogue length not above the ask, same variant, same side
  // rules. The entry carries `snappedFromNl` so a Check rule (T32) can say
  // so out loud; the BOM orders the article that will actually be bought.
  const shorter = cat.files
    .filter((f) => (!knowsSystem || f.system === system)
      && f.variant === want
      && f.nl < Number(nl)
      && (side == null || f.side == null || f.side === side))
    .sort((a, b) => b.nl - a.nl);
  const best = shorter.find((f) => f.side === side) || shorter[0] || null;
  return best ? { ...best, snappedFromNl: Number(nl) } : null;
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
  // Turn 33 (CLAUDE.md F9): the owner's ladder rules — the ORDERED length is
  // the rung the ask lands on, and the articles are what stands at that rung.
  const ladder = runnerLadder(profile);
  const rung = ladderRungFor(nl, profile);
  const article = (side) => runnerEntry({
    system: M.system, nl, variant, side, ladder,
  })?.article ?? null;
  const articles = { L: article('L'), R: article('R') };
  return {
    system: M.system,
    // The SNAPPED length is what the BOM orders; the ask rides beside it so a
    // label can say both. `null` rung = the ask fell below the whole ladder.
    nl: rung ?? null,
    asked_nl: Number(nl) || null,
    on_ladder: rung != null,
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
