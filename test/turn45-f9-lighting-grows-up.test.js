import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  CHANNEL_DEFAULT_MM, CHANNEL_MAX_MM, CHANNEL_MIN_MM, DEFAULT_LED_SPEC, FLEXI_GROOVE_MM,
  LED_GROOVE_MODES, LED_GROOVE_MODE_IDS, grooveWidthMm, ledModeLabel, migrateLedSpec,
} from '../src/lib/ledSpec.js';
import {
  DRIVER_RATINGS_W, DRIVER_VOLTS, SMALLEST_DRIVER_W, applyDriverPlan, driverLabel, driverPlan,
  driverSummary, totalMetres, totalWatts,
} from '../src/lib/ledDrivers.js';
import { WIZARD_NODES, WIZARD_TABS, hiddenNodes, tabNumber, visibleTabs } from '../src/lib/wizardTabs.js';
import { lightingBomLines } from '../src/engine/ledStrips.js';

// ─── TURN 45 · F9 — LIGHTING GROWS UP ───────────────────────────────────────
//
// CLAUDE.md, 23.08.2026:
//
//   *"F9a The Lighting menu is ALWAYS alive. ON/OFF is a PREVIEW (room dim)
//   only — at OFF you still place, see and edit LED lines on carcasses.
//   F9b Settings gains sub-tab `5.6 Lighting`: choice `LED flexi 4 mm` (a 4 mm
//   groove) vs `Channel` + channel width field (the router's slot width).
//   F9c Optional `W/m` field → the driver calculator: total W = W/m × metres of
//   ALL placed lines (metres shown beside it). Drivers are 12 V; pick the set
//   whose summed rating ≥ total, smallest unit 60 W. Result lands in the BOM as
//   `N × driver X W`."*

const PANEL = readFileSync(new URL('../src/components/LightingPanel.jsx', import.meta.url), 'utf8');
const LED3D = readFileSync(new URL('../src/3d/LedStrips.jsx', import.meta.url), 'utf8');
const WIZ = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');
const SUM = readFileSync(new URL('../src/components/WizardSummary.jsx', import.meta.url), 'utf8');
const BOM = readFileSync(new URL('../src/components/BomPanel.jsx', import.meta.url), 'utf8');
const CSV = readFileSync(new URL('../src/lib/exporters.js', import.meta.url), 'utf8');
const STORE = readFileSync(new URL('../src/stores/projectStore.js', import.meta.url), 'utf8');

const strip = (mm, kind = 'shelf') => ({ kind, length_mm: mm });

// ══ F9a — the menu is always alive ═════════════════════════════════════════

test('F9a — ON/OFF is a PREVIEW: the panel’s body no longer hides behind it', () => {
  assert.doesNotMatch(PANEL, /\{lighting\.on && \(/, 'T35’s gate folded the whole panel away');
  assert.match(PANEL, /data-lighting-preview-note="1"/);
  assert.match(PANEL, /A PREVIEW/);
  // The two buttons and the ONE state they write are exactly as T35 left them.
  assert.match(PANEL, /data-lighting-on/);
  assert.match(PANEL, /data-lighting-off/);
  assert.match(PANEL, /setLighting\(\{ on: true \}\)/);
  assert.match(PANEL, /setLighting\(\{ on: false \}\)/);
  // …and everything that places a light still stands.
  for (const kept of ['data-lighting-add-shelf', 'data-lighting-add-side', 'data-lighting-add-bottom',
    'data-lighting-add-top', 'data-lighting-temp', 'data-lighting-switch', 'data-lighting-inset-all']) {
    assert.ok(PANEL.includes(kept), `${kept} still stands at OFF`);
  }
});

test('F9a — at OFF you still SEE the lines: the 3D asks for the geometry either way', () => {
  // `engine/ledStrips.js stripsForUnit()` answers [] while the light is off and
  // is FROZEN tonight (iron rule 2), so the fix is at the call site: the design
  // handed to it carries `on: true` for the READ, and `lightOn` still decides
  // the brightness, the aura and the lamps — which is all a preview ever meant.
  assert.match(LED3D, /const litDesign = useMemo\(/);
  assert.match(LED3D, /design: litDesign, profile,/);
  assert.match(LED3D, /const lightOn = useMemo\(\(\) => resolveLighting\(design, profile\)\.on/);
  assert.match(LED3D, /lightOn \? emissiveOn : spec\.view\.offEmissive/);
  // …and the panel's own depth clamps read the same way.
  assert.match(PANEL, /design: litDesign, profile,/);
  // The engine itself is untouched.
  const ENGINE = readFileSync(new URL('../src/engine/ledStrips.js', import.meta.url), 'utf8');
  assert.match(ENGINE, /if \(!lighting\.on\) return \[\];/, 'the engine still says what it always said');
});

// ══ F9b — the groove ═══════════════════════════════════════════════════════

test('F9b — the two modes, and the groove each one cuts', () => {
  assert.deepEqual(LED_GROOVE_MODE_IDS, ['flexi', 'channel']);
  assert.deepEqual(LED_GROOVE_MODES.map((m) => m.label), ['LED flexi 4 mm', 'Channel']);
  assert.equal(FLEXI_GROOVE_MM, 4, 'the flexi slot is 4 because the strip is 4');
  assert.equal(grooveWidthMm({ mode: 'flexi' }), 4);
  assert.equal(grooveWidthMm({ mode: 'channel', channelWidth: 12 }), 12);
  assert.equal(grooveWidthMm(null), 4, 'a project that has never opened 5.6');
  assert.equal(ledModeLabel({ mode: 'flexi' }), 'LED flexi 4 mm');
  assert.equal(ledModeLabel({ mode: 'channel', channelWidth: 18 }), 'Channel · 18 mm');
});

test('F9b — the spec is normalised, and the W/m is honestly optional', () => {
  assert.deepEqual(DEFAULT_LED_SPEC, { mode: 'flexi', channelWidth: CHANNEL_DEFAULT_MM, wattsPerMetre: null });
  assert.deepEqual(migrateLedSpec(null), DEFAULT_LED_SPEC);
  assert.deepEqual(migrateLedSpec({ mode: 'nonsense' }).mode, 'flexi');
  // The router will not cut a slot narrower than the bit or wider than sense.
  assert.equal(migrateLedSpec({ channelWidth: 0 }).channelWidth, CHANNEL_DEFAULT_MM);
  assert.equal(migrateLedSpec({ channelWidth: 1 }).channelWidth, CHANNEL_MIN_MM);
  assert.equal(migrateLedSpec({ channelWidth: 999 }).channelWidth, CHANNEL_MAX_MM);
  // NULL is the answer when nobody has typed one — never a confident zero.
  assert.equal(migrateLedSpec({}).wattsPerMetre, null);
  assert.equal(migrateLedSpec({ wattsPerMetre: 0 }).wattsPerMetre, null);
  assert.equal(migrateLedSpec({ wattsPerMetre: -5 }).wattsPerMetre, null);
  assert.equal(migrateLedSpec({ wattsPerMetre: 9.6 }).wattsPerMetre, 9.6);
  // Idempotent, like every migration in this house.
  const once = migrateLedSpec({ mode: 'channel', channelWidth: 18, wattsPerMetre: 14.4 });
  assert.deepEqual(migrateLedSpec(once), once);
});

test('F9b — it rides the PROJECT, because migrateLighting would drop it', () => {
  assert.match(STORE, /import \{ migrateLedSpec \} from '\.\.\/lib\/ledSpec\.js'/);
  assert.match(STORE, /setLedSpec: \(patch\) => set/);
  assert.match(STORE, /ledSpec: migrateLedSpec\(project\?\.ledSpec\)/, 'a saved job carries it');
  assert.match(STORE, /ledSpec: migrateLedSpec\(cached\.project\.ledSpec\)/, '…and a reloaded tab');
  // The engine's whitelist is untouched, and would indeed have dropped it.
  const DESIGN = readFileSync(new URL('../src/engine/design.js', import.meta.url), 'utf8');
  const mig = DESIGN.slice(DESIGN.indexOf('function migrateLighting'));
  assert.doesNotMatch(mig.slice(0, 1500), /groove|wattsPerMetre/);
});

test('F9b — 5.6 Lighting is on the strip, and it is the workshop’s', () => {
  assert.ok(WIZARD_TABS.some((t) => t.id === 'lighting' && t.label === 'Lighting'));
  assert.equal(visibleTabs('factory').map((t) => tabNumber(t.n)).pop(), '5.6');
  assert.equal(visibleTabs('retail').some((t) => t.id === 'lighting'), false,
    'a slot width is the router’s business, not the client’s');
  for (const id of ['lighting.groove', 'lighting.driver']) {
    assert.ok(WIZARD_NODES.some((n) => n.id === id && n.tab === 'lighting'));
    assert.ok(hiddenNodes('retail').includes(id));
  }
  assert.match(WIZ, /data-led-mode=\{m\.id\}/);
  assert.match(WIZ, /data-led-channel-mm="1"/);
  assert.match(WIZ, /data-led-groove-width=\{grooveWidthMm\(ledSpec\)\}/);
  // The channel width is asked ONLY when a channel is what was chosen.
  assert.match(WIZ, /\{ledSpec\.mode === 'channel' && \(/);
});

// ══ F9c — the driver calculator ════════════════════════════════════════════

test('F9c — total W = W/m × metres of ALL placed lines', () => {
  const strips = [strip(1000), strip(500), strip(2500, 'side')];
  assert.equal(totalMetres(strips), 4);
  // A SPOT is not a run and carries no metres.
  assert.equal(totalMetres([...strips, { kind: 'spot' }]), 4);
  assert.equal(totalMetres([]), 0);
  assert.equal(totalMetres(null), 0);
  assert.equal(totalWatts(4, { wattsPerMetre: 9.6 }), 38.4);
  // No W/m typed → no number invented.
  assert.equal(totalWatts(4, {}), null);
  assert.equal(totalWatts(4, null), null);
});

test('F9c — drivers are 12 V, and the smallest unit made is 60 W', () => {
  assert.equal(DRIVER_VOLTS, 12);
  assert.equal(SMALLEST_DRIVER_W, 60);
  assert.deepEqual(DRIVER_RATINGS_W, [60, 100, 150]);
  // A 12 W job is still one 60 W driver — there is nothing smaller to buy.
  const small = driverPlan(12);
  assert.equal(small.count, 1);
  assert.equal(small.ratingW, 60);
  assert.equal(small.volts, 12);
  assert.equal(small.headroomW, 48);
});

test('F9c — the set chosen CARRIES the load and wastes least', () => {
  // 200 W: 4 × 60 supplies 240, 2 × 100 supplies 200, 2 × 150 supplies 300.
  const two = driverPlan(200);
  assert.equal(driverLabel(two), '2 × driver 100 W');
  assert.ok(two.suppliedW >= 200, 'summed rating ≥ total');
  assert.equal(two.headroomW, 0);
  // 38.4 W → one 60.
  assert.equal(driverLabel(driverPlan(38.4)), '1 × driver 60 W');
  // 130 W → 150 supplies it in one; 60 needs three (180); 100 needs two (200).
  assert.equal(driverLabel(driverPlan(130)), '1 × driver 150 W');
  // Every plan carries its load, whatever the number.
  for (const load of [1, 55, 60, 61, 99, 100, 101, 149, 151, 300, 900]) {
    const p = driverPlan(load);
    assert.ok(p.suppliedW >= load, `${load} W is not carried by ${p.label}`);
  }
  // Nothing to drive is no driver at all.
  assert.equal(driverPlan(0), null);
  assert.equal(driverPlan(null), null);
});

test('F9c — the whole answer, from the strips and the spec', () => {
  const strips = [strip(2000), strip(2000)];
  const said = driverSummary(strips, { wattsPerMetre: 14.4 });
  assert.equal(said.metres, 4);
  assert.equal(said.wattsPerMetre, 14.4);
  assert.equal(said.totalW, 57.6);
  assert.equal(said.plan.label, '1 × driver 60 W');
  // …and with no W/m the honest answer is metres and nothing else.
  const quiet = driverSummary(strips, {});
  assert.equal(quiet.metres, 4);
  assert.equal(quiet.totalW, null);
  assert.equal(quiet.plan, null);
});

test('F9c — the RESULT lands in the BOM as “N × driver X W”', () => {
  // The engine's own row, untouched, is what a project with no W/m gets.
  const engineRow = {
    role: 'led_driver', label: 'LED driver / PSU', qty: 1, unit: 'pcs', spec_label: 'LED driver — sized to the strip run',
  };
  const other = { role: 'led_strip', label: 'LED strip 4000 K', qty: 4 };
  assert.deepEqual(applyDriverPlan([engineRow, other], null), [engineRow, other]);

  const plan = driverPlan(200);
  const [driver, untouched] = applyDriverPlan([engineRow, other], plan);
  assert.equal(driver.qty, 2, 'the quantity is the count, so a purchase list adds up');
  assert.match(driver.spec_label, /2 × driver 100 W/);
  assert.match(driver.label, /12 V/);
  assert.deepEqual(untouched, other, 'no other line is touched');
  // A BOM with no driver row at all is not a crash.
  assert.deepEqual(applyDriverPlan([other], plan), [other]);
  assert.deepEqual(applyDriverPlan(null, plan), []);
});

test('F9c — the engine still writes the row this layer rewrites', () => {
  // R4: the claim is proven by asking the app. `lightingBomLines` is the
  // function the BOM calls, and `led_driver` is the role it writes.
  const src = readFileSync(new URL('../src/engine/ledStrips.js', import.meta.url), 'utf8');
  assert.match(src, /role: 'led_driver'/);
  assert.equal(typeof lightingBomLines, 'function');
});

test('F9c — the SCREEN and the FILE size it the same way', () => {
  assert.match(BOM, /import \{ applyDriverPlan, driverSummary \} from '\.\.\/lib\/ledDrivers\.js'/);
  assert.match(BOM, /applyDriverPlan\(lines, driverSummary\(strips, ledSpec\)\.plan\)/);
  assert.match(CSV, /import \{ applyDriverPlan, driverSummary \} from '\.\/ledDrivers\.js'/);
  assert.match(CSV, /\.\.\.applyDriverPlan\(/);
  // …and the caller hands the CSV the job's own spec.
  const PAGE = readFileSync(new URL('../src/pages/ConfiguratorPage.jsx', import.meta.url), 'utf8');
  assert.match(PAGE, /ledSpec: project\.ledSpec/);
});

test('F9c — the tab shows the metres beside the field, and the plan under it', () => {
  assert.match(WIZ, /data-led-watts-per-metre="1"/);
  assert.match(WIZ, /data-led-run-m=\{driver\.metres\}/, 'metres shown beside it');
  assert.match(WIZ, /data-led-driver-plan=/);
  assert.match(WIZ, /driverSummary\(allStrips, ledSpec\)/);
  // …and the ONE ending shows it too.
  assert.match(SUM, /node="summary\.lighting"/);
  assert.match(SUM, /ledModeLabel\(ledSpec\)/);
  assert.match(SUM, /driverSummary\(strips, ledSpec\)/);
  assert.ok(hiddenNodes('retail').includes('summary.lighting'));
});
