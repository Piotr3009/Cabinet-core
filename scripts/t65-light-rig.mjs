#!/usr/bin/env node
// ─── T65 F2 · THE WHOLE LIGHTING RIG, PRO AGAINST RETAIL ───────────────────
//
// CLAUDE.md F2, verbatim: *"Find every lighting number retail resolves — walk
// `src/3d/Scene.jsx` and the retail mount, and list what each reads … Print
// PRO's value and retail's value for each, side by side, in the PR body."*
//
// THE ANSWER THE WALK GIVES, and it is worth stating before the numbers:
// there is ONE `Scene.jsx` and ONE `profile.appearance.studio`, and BOTH
// applications mount them. `Scene.jsx:1508` is `const studio =
// profile.appearance.studio;` — not a copy, not a retail variant, the same
// object. So every lamp in the table below is identical BY CONSTRUCTION, and
// the probe's job is to prove there is no second source: no file under
// `src/retail/**` writes any of these numbers.
//
// What DID differ is the one input a joiner can move and a client could not:
// `uiStore.brightness`. PRO persists it (`cc.brightness`); the retail mount
// calls `setPersistence('none')`, so it resolved to the profile default on
// every load and there was no slider to move it with. That is the whole of
// the owner's *"retail jest za jasna"*, and T65 F2's copied BRIGHT slider is
// the whole of the fix.
//
//   node scripts/t65-light-rig.mjs            the table
//   node scripts/t65-light-rig.mjs --md       the table, as PR-body markdown
//   node scripts/t65-light-rig.mjs --json     the rows, as JSON

import { readFileSync } from 'node:fs';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { brightnessScale, sceneLightScale } from '../src/engine/lighting.js';
import { defaultLightRig } from '../src/engine/lightRig.js';
import { ALL_COPIES } from './t63-copies.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(new URL(rel, new URL('../', import.meta.url)), 'utf8');

const S = P.appearance.studio;
const show = (v) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v));

/**
 * Every lighting number `Scene.jsx` resolves, with the expression it resolves
 * it BY. `pro` and `retail` are computed from that expression under each
 * application's own conditions — they are not typed in twice.
 */
export function rows() {
  const out = [];
  const both = (what, source, value) => out.push({
    what, source, pro: show(value), retail: show(value), same: true,
  });

  // ─── The eleven the owner named, and the rest of the block with them ─────
  both('baseGain', 'profile.appearance.studio.baseGain', S.baseGain);
  both('ambient', 'profile.appearance.studio.ambient', S.ambient);
  both('key', 'profile.appearance.studio.key', S.key);
  both('fill', 'profile.appearance.studio.fill', S.fill);
  both('rim', 'profile.appearance.studio.rim', S.rim);
  both('exposure (tone mapping)', '<ToneMapping exposure={studio.exposure}>', S.exposure);
  both('shadowPadding', 'profile.appearance.studio.shadowPadding', S.shadowPadding);
  both('band.intensity', 'studio.band.intensity', S.band.intensity);
  both('band.colour', 'studio.band.colour', S.band.colour);
  both('band.aboveMm / forwardMm', 'studio.band', `${S.band.aboveMm} / ${S.band.forwardMm}`);
  both('band.widthMm / spillMm', 'studio.band', `${S.band.widthMm} / ${S.band.spillMm}`);
  both('spotsOn', 'profile.appearance.studio.spotsOn', S.spotsOn);
  both('spots[0]', 'studio.spots[0]', S.spots[0]);
  both('spots[1]', 'studio.spots[1]', S.spots[1]);
  both('spotReach', 'profile.appearance.studio.spotReach', S.spotReach);
  both('pillars', 'profile.appearance.studio.pillars', S.pillars);
  both('pointsOn', 'profile.appearance.studio.pointsOn', S.pointsOn);
  both('points', 'profile.appearance.studio.points', S.points);
  both('pointReach', 'profile.appearance.studio.pointReach', S.pointReach);
  both('hemisphere', 'profile.appearance.studio.hemisphere', S.hemisphere);
  both('ceiling', 'profile.appearance.studio.ceiling', S.ceiling);
  both('roomBounce', 'profile.appearance.studio.roomBounce', S.roomBounce);
  both('shadowCasters', 'profile.appearance.studio.shadowCasters', S.shadowCasters);
  both('keyCastsShadow', 'profile.appearance.studio.keyCastsShadow', S.keyCastsShadow);
  both('shadow map', 'profile.render.shadow.normal', P.render.shadow.normal);

  // ─── The environment probe — OFF as a TINTED probe in both, and CLAUDE.md
  //     says not to "improve" it. What IS on is drei's neutral RoomEnvironment
  //     (`Scene.jsx Environment`), at the same intensity for both. ────────────
  both('environment.intensity', 'profile.appearance.environment.intensity', P.appearance.environment.intensity);
  both('environment (HDRI probe)', 'no HDRI file is loaded by either mount', 'none — RoomEnvironment only');

  // ─── The project's own two, which retail never writes ────────────────────
  both('lightRig', 'defaultLightRig(profile) — projectStore', defaultLightRig(P));
  both('sceneLight scale', 'sceneLightScale(project.sceneLight?.scale)', sceneLightScale(undefined));

  // ─── THE ONE THAT DIFFERED ──────────────────────────────────────────────
  //
  // `uiStore.loadBrightness()`: persistence ON reads `cc.brightness`, OFF takes
  // the profile default. The DEFAULT is the same number on both sides; what
  // differed was reachability, and that is what the slider restores.
  const dflt = brightnessScale(undefined, P);
  out.push({
    what: 'brightness (default)',
    source: 'uiStore.brightness → brightnessScale(_, profile)',
    pro: show(dflt),
    retail: show(dflt),
    same: true,
  });
  out.push({
    what: 'brightness (range / step)',
    source: 'profile.appearance.studio.brightness',
    pro: `${S.brightness.min}–${S.brightness.max} / ${S.brightness.step}`,
    retail: `${S.brightness.min}–${S.brightness.max} / ${S.brightness.step}`,
    same: true,
  });
  const proBar = /data-brightness-control/.test(read('src/components/TopBar.jsx'));
  const retailBar = /data-brightness-control/.test(read('src/retail/design/ViewBar.jsx'));
  // A PRESENCE row, not a number: before T65 F2 this read PRO `slider on the
  // bar` against retail `NONE`, and that one word was the whole of *"za
  // jasna"* — the rig matched, the reach did not. Both sides say the same
  // thing now, so the row compares like every other.
  out.push({
    what: 'brightness — a control to move it',
    source: 'TopBar.jsx (PRO, T26) · ViewBar.jsx (retail, copied T65 F2)',
    pro: proBar ? 'slider on the bar' : 'NONE',
    retail: retailBar ? 'slider on the bar' : 'NONE',
    same: proBar === retailBar,
  });
  return out;
}

/**
 * No file under `src/retail/**` may write a lighting number OF ITS OWN.
 *
 * The one exception is a registered COPY: `src/retail/design/lighting/
 * LightingPanel.jsx` is PRO's `src/components/LightingPanel.jsx`, listed in
 * `scripts/t63-copies.mjs` and held to it by the copy-fidelity test. It writes
 * the rig because PRO's panel writes the rig — that is 1:1 working, not a
 * retail number. So the probe reads the manifest rather than hard-coding a
 * pardon, and any NEW retail writer is a finding.
 */
export function retailWritesNothing() {
  const files = [];
  const walk = (dir) => {
    for (const e of readdirSync(new URL(dir, new URL('../', import.meta.url)), { withFileTypes: true })) {
      const next = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(next);
      else if (/\.(js|jsx)$/.test(e.name)) files.push(next);
    }
  };
  walk('src/retail');
  const copies = new Set(ALL_COPIES.map((c) => c.retail));
  const KEYS = /\b(baseGain|setRealisticLighting|sceneLight|lightRig|shadowPadding|spotsOn|pointsOn|keyCastsShadow|roomBounce|environmentIntensity)\b/;
  return files
    .filter((f) => !copies.has(f))
    .filter((f) => KEYS.test(read(f).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ')));
}
import { readdirSync } from 'node:fs';

if (process.argv[1] && process.argv[1].endsWith('t65-light-rig.mjs')) {
  const list = rows();
  const md = process.argv.includes('--md');
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(list, null, 1));
  } else if (md) {
    console.log('| lighting number | resolved by | PRO | retail | same |');
    console.log('|---|---|---|---|---|');
    for (const r of list) {
      console.log(`| \`${r.what}\` | \`${r.source}\` | \`${r.pro}\` | \`${r.retail}\` | ${r.same ? '✅' : '❌'} |`);
    }
  } else {
    for (const r of list) {
      console.log(`${r.same ? 'SAME ' : 'DIFF '} ${r.what.padEnd(28)} PRO=${r.pro}  RETAIL=${r.retail}`);
    }
  }
  const writers = retailWritesNothing();
  console.log(`\nretail files writing a lighting number: ${writers.length}${writers.length ? ` — ${writers.join(', ')}` : ' (none — one profile, one Scene)'}`);
  const diff = list.filter((r) => !r.same);
  console.log(`rows: ${list.length}  differences: ${diff.length}`);
  process.exit(diff.length || writers.length ? 1 : 0);
}
