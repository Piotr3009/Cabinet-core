// ─── verify/t26/lighting.md, WRITTEN FROM THE RIG (turn 26, F10.2) ──────────
//
// "Compute it, do not eyeball it, and put the before/after sum in
// `verify/t26/lighting.md`."
//
//   node scripts/t26-lighting.mjs > verify/t26/lighting.md

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  balanceRig, ceilingPosition, distanceBetween, irradianceAt, luminousSum, rigPositions,
} from '../src/engine/lighting.js';

const S = P.appearance.studio;

// The fit a five-metre kitchen gives: the rig is aimed at the middle of the
// furniture and stands ~3.9 m out from it. Scene units are metres.
const FIT = {
  centre: [0, 1.1, 0.3], distance: 3.9, frontZ: 0.9, ceilingY: 2.7, setback: 1.5,
};

const before = luminousSum({ studio: S, ...FIT });
const balance = balanceRig({ studio: S, ...FIT });
const after = luminousSum({
  studio: { ...S, spots: S.spots.map((s) => ({ ...s, intensity: s.intensity * balance.spotScale })) },
  ...FIT,
  ceiling: balance.ceiling,
});

const out = [];
const say = (s = '') => out.push(s);
const n = (v) => v.toFixed(4);

say('# verify/t26 — the lighting sum, before and after (F10)');
say();
say('> "One broad ceiling source at real ceiling height above the tall units, set');
say('> back 1.5 m from the fronts, medium intensity." — and, in the same breath —');
say('> "**Whatever is added above is subtracted from the facing spots** — the');
say('> scene\'s total luminous contribution stays as it is today. Compute it, do');
say('> not eyeball it."');
say();
say('This file is GENERATED (`node scripts/t26-lighting.mjs`) from');
say('`src/engine/lighting.js` and the shipped profile, and');
say('`test/turn26-f10-lighting.test.js` asserts the two sums below are the ones');
say('the code produces. It cannot drift.');
say();

say('## The metric');
say();
say('"Total luminous contribution" has to mean ONE comparable number or');
say('"subtract" is not an operation — and the rig mixes two kinds of source:');
say();
say('| kind | what `intensity` is | at the subject |');
say('| --- | --- | --- |');
say('| ambient, hemisphere, directional | an irradiance | `intensity` |');
say('| spot, point (three r0.180, `decay: 2`) | candela-like | `intensity / d²` |');
say();
say('So the metric is **irradiance at the subject** — at the very point the whole');
say('rig is already aimed at (`fit.centre`, which `ShadowFit` puts at the middle');
say('of the furniture). Every source is converted to it and the sum is what must');
say('not move. It is not the only defensible metric — one could integrate over');
say('the furniture\'s surface — but it is the one the rig is built around and it');
say('is exactly computable, which is what "compute it" asks for.');
say();
say('The fit below is a five-metre kitchen: the rig stands');
say(`**${FIT.distance} m** out from the furniture, whose front face is at`);
say(`z = ${FIT.frontZ} m under a **${FIT.ceilingY} m** ceiling. Scene units are metres.`);
say();

say('## The ledger, lamp by lamp');
say();
say('| lamp | before | after | note |');
say('| --- | ---: | ---: | --- |');
const NOTE = {
  ambient: 'unchanged',
  hemisphere: 'unchanged',
  key: 'unchanged',
  fill: 'unchanged',
  rim: 'unchanged',
  'spot-0': `× ${balance.spotScale} — the share the ceiling takes`,
  'spot-1': `× ${balance.spotScale} — the share the ceiling takes`,
  ceiling: 'NEW — and it is exactly what the two jupiters gave up',
  'point-0': 'the eye-level pair, unchanged (turn 14, F9)',
  'point-1': 'the eye-level pair, unchanged (turn 14, F9)',
  'point-2': 'the low pair, unchanged',
  'point-3': 'the low pair, unchanged',
};
for (const row of after.rows) {
  const was = before.rows.find((r) => r.role === row.role);
  say(`| \`${row.role}\` | ${was ? n(was.at) : '—'} | ${n(row.at)} | ${NOTE[row.role] || ''} |`);
}
say(`| **total** | **${n(before.total)}** | **${n(after.total)}** | drift **${balance.drift}** |`);
say();

say('## The identity');
say();
say('It is exact by construction rather than by tuning, which is why the drift is');
say('zero to six decimals at any room size and any camera fit (the test sweeps');
say('three distances × three ceilings × three setbacks):');
say();
say('```');
say('before = A + H + K + F + R + Σ sᵢ/dᵢ²');
say('after  = A + H + K + F + R + (1−share)·Σ sᵢ/dᵢ² + share·Σ sᵢ/dᵢ²');
say('       = before');
say('```');
say();
say(`\`share\` is **${S.ceiling.share}** — the fraction of the FACING SPOTS' contribution the`);
say('ceiling source takes over. "Medium intensity" is a judgement, and the honest');
say('way to ship a judgement is as a fraction of something real rather than as a');
say('magic candela: at any room size the spots keep');
say(`**${balance.spotScale}** of what they gave and the ceiling supplies the rest, with no`);
say('number to re-tune when the kitchen gets longer.');
say();
say('The ceiling lamp\'s own candela FALLS OUT of that. It hangs at');
const at = ceilingPosition(FIT);
const d = distanceBetween(at, FIT.centre);
say(`\`[${at.map((v) => Math.round(v * 1000) / 1000).join(', ')}]\` — ${d.toFixed(3)} m from the subject — so the intensity that`);
say(`delivers the share from there is **${balance.ceiling.intensity.toFixed(2)}**. There is no intensity in`);
say('`profile.appearance.studio.ceiling` at all, deliberately: a number there would');
say('be a second answer to a question the share has already answered.');
say();

say('## What a rig with no jupiters gets');
say();
const bare = balanceRig({ studio: { ...S, spots: [] }, ...FIT });
say('Nothing. The constraint read the other way round: a workshop that has turned');
say('the two facing spots off has nothing for the ceiling to take the light FROM,');
say('and giving it a lamp anyway would be this feature making the room brighter —');
say(`which is the one thing it may not do. \`enabled: ${bare.enabled}\`, sum unchanged at`);
say(`**${n(bare.before)}**.`);
say();

say('## And the slider (F10.3)');
say();
const B = S.brightness;
say(`One multiplier on every lamp, **${B.min}–${B.max}** in steps of ${B.step}, default ${B.default}, remembered in`);
say('`localStorage` under `cc.brightness` exactly as X-ray and the front');
say('dimensions are. PROPORTIONALLY is the whole of it: the RATIOS the rig was');
say('balanced at — the key against the fill, the jupiters against the ambient —');
say('are the ones turn 10 measured whatever the slider says, so nothing in');
say('`verify/t10/measurements.json` is invalidated by moving it. A slider that');
say('touched one lamp would be a slider that re-lights the scene.');
say();
say('The ledger scales with it and does not tilt: at 0.5 every row above is');
say('exactly half of itself, which the test asserts row by row.');
say();
process.stdout.write(`${out.join('\n')}\n`);
