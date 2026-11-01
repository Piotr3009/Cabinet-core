/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F14 . ORNATE FRONTS FOR SKYLON ONLY (law 9). The owner, 01.11.2026: *"ornamenty zostaw tylko dla Skylon
// Joinery"*, *"tylko dla innych UI, dla Skylon Joinery zostaje"*. The gallery is rendered as the browser renders it
// (the JSX through esbuild, Vite's own compiler), fed the list the tenant is offered; the tenant is the one Joinery
// Core's /api/auth/me names, set in the real authStore.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { register } from 'node:module';

const ESB = new URL('../node_modules/esbuild/lib/main.js', import.meta.url).href;
register(`data:text/javascript,${encodeURIComponent(`
import esb from '${ESB}';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export async function load(url, context, next) {
  const path = url.split('?')[0];
  if (path.endsWith('.css')) return { format: 'module', source: 'export default {};', shortCircuit: true };
  if (path.endsWith('.jsx')) {
    const file = fileURLToPath(path);
    const { code } = esb.transformSync(readFileSync(file, 'utf8'), { loader: 'jsx', jsx: 'automatic', format: 'esm', sourcefile: file });
    return { format: 'module', source: code, shortCircuit: true };
  }
  return next(url, context);
}`)}`, import.meta.url);

const React = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { default: FrontStyleGallery } = await import('../src/components/FrontStyleGallery.jsx');
const { useAuthStore } = await import('../src/stores/authStore.js');
const {
  SKYLON_TENANT_ID, STYLE_NOT_OFFERED, frontStylesFor, isSkylon, ornateFrontsFor, styleNotOffered,
} = await import('../src/lib/tenantFlags.js');
const { FRONT_STYLE_OPTIONS } = await import('../src/engine/design.js');
const { ORNATE_STYLE_IDS, DECORATIVE_FRONT_STYLES, defaultFrontDecoration } = await import('../src/engine/frontDecoration.js');
const { computeCabinet } = await import('../src/engine/cabinet.js');
const { DEFAULT_CABINET_PROFILE: P } = await import('../src/engine/profile.js');
const { defaultParamsFor } = await import('../src/engine/types.js');

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const OTHER_TENANT = '0f3c2d1e-5a6b-4c7d-8e9f-a0b1c2d3e4f5';

/** The tenant as /me names it, in the real store; then the gallery the joiner opens. */
function galleryFor(tenantId, current = 'S') {
  useAuthStore.setState({ status: 'ready', tenant: { id: tenantId, name: 'Workshop' } });
  const tenant = useAuthStore.getState().tenant?.id;
  const styles = frontStylesFor(tenant, { current });
  const html = renderToStaticMarkup(React.createElement(FrontStyleGallery, { value: current, onPick: () => {}, styles }));
  const tiles = [...html.matchAll(/data-style-tile="([^"]+)"/g)].map((m) => m[1]);
  return { html, tiles, styles };
}

test('F14.1 . the Skylon tenant is the uuid of JC\'s sql, and only it is Skylon', () => {
  assert.equal(SKYLON_TENANT_ID, 'b663e012-1ae6-45d8-b720-7bcc26baffc2');
  assert.equal(isSkylon(SKYLON_TENANT_ID), true);
  assert.equal(isSkylon(SKYLON_TENANT_ID.toUpperCase()), true, 'a uuid is one uuid in either case');
  for (const other of [OTHER_TENANT, '', null, undefined, 'skylon']) assert.equal(isSkylon(other), false, String(other));
  assert.deepEqual(ornateFrontsFor(SKYLON_TENANT_ID), [...ORNATE_STYLE_IDS]);
  assert.deepEqual(ornateFrontsFor(OTHER_TENANT), []);
  assert.equal(ORNATE_STYLE_IDS.length, 4);
});

test('F14.3 . Skylon\'s gallery lists the four ornate styles beside every other style', () => {
  const { tiles } = galleryFor(SKYLON_TENANT_ID);
  for (const id of ORNATE_STYLE_IDS) assert.ok(tiles.includes(id), `${id} offered to Skylon`);
  assert.deepEqual(tiles, FRONT_STYLE_OPTIONS.map((s) => s.id), 'Skylon sees the whole list, in its order');
});

test('F14.3 . another tenant\'s gallery lists none of the ornate styles and every plain and machined one', () => {
  const { tiles, html } = galleryFor(OTHER_TENANT);
  for (const id of ORNATE_STYLE_IDS) assert.equal(tiles.includes(id), false, `${id} offered to another tenant`);
  const rest = FRONT_STYLE_OPTIONS.map((s) => s.id).filter((id) => !ORNATE_STYLE_IDS.includes(id));
  assert.deepEqual(tiles, rest, 'every other style, in its order');
  for (const id of DECORATIVE_FRONT_STYLES) assert.ok(tiles.includes(id), `the machined ${id} stays for everyone`);
  assert.doesNotMatch(html, /Ornate/);
});

test('F14.2 . a unit already on an ornate style keeps it named, marked not offered, with the words', () => {
  const { tiles, styles } = galleryFor(OTHER_TENANT, 'ORNATE_A_1');
  assert.deepEqual(tiles.filter((id) => ORNATE_STYLE_IDS.includes(id)), ['ORNATE_A_1'], 'only the current one, never its siblings');
  assert.equal(styles.find((s) => s.id === 'ORNATE_A_1').notOffered, true);
  assert.equal(styleNotOffered(OTHER_TENANT, 'ORNATE_A_1'), true);
  assert.equal(styleNotOffered(SKYLON_TENANT_ID, 'ORNATE_A_1'), false);
  assert.equal(styleNotOffered(OTHER_TENANT, 'S'), false, 'a plain style is offered to everyone');
  assert.equal(STYLE_NOT_OFFERED, 'This style is not offered to your workshop.');
  // Skylon's own current ornate style is simply offered, never marked.
  assert.equal(galleryFor(SKYLON_TENANT_ID, 'ORNATE_A_2').styles.some((s) => s.notOffered), false);
});

test('F14.3 . a unit with ORNATE_A_1 under another tenant still computes, as main computes it', () => {
  useAuthStore.setState({ status: 'ready', tenant: { id: OTHER_TENANT, name: 'Workshop' } });
  const params = { ...defaultParamsFor('BUD', P), front_type: 'ORNATE_A_1', front_decoration: defaultFrontDecoration('ORNATE_A_1', P) };
  const other = computeCabinet(params, P);
  const panel = other.panels.find((p) => p.meta?.frontDecoration?.style === 'ORNATE_A_1');
  assert.ok(panel, 'the ornate front is drawn');
  assert.equal(panel.meta.frontDecoration.status, 'ready');
  useAuthStore.setState({ tenant: { id: SKYLON_TENANT_ID, name: 'Skylon Joinery LTD' } });
  assert.deepEqual(computeCabinet(params, P), other, 'the tenant is no input of the engine');
  // ...and the engine that drew it is main's: no byte of the ornate road moved this turn.
  let base = null;
  for (const ref of ['origin/main', 'main']) {
    try { execFileSync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { cwd: ROOT }); base = ref; break; } catch { /* next */ }
  }
  if (!base) return;
  const diff = execFileSync('git', ['diff', '--stat', base, '--', 'src/engine/cabinet.js', 'src/engine/ornateFront.js',
    'src/engine/ornateFrontProfile.js', 'src/engine/frontDecoration.js', 'src/engine/design.js'], { cwd: ROOT, encoding: 'utf8' }).trim();
  assert.equal(diff, '', `the ornate engine moved:\n${diff}`);
});

test('F14 . the copied gallery and controls are not edited: the retail copies stay the machine\'s (FROZEN 5)', () => {
  // The tenant's list is handed in through the gallery's own `styles` prop; neither copied component learns
  // of tenants, so `scripts/t78-copy.mjs --check` stays CLEAN and retail is not touched.
  for (const rel of ['src/components/FrontStyleGallery.jsx', 'src/components/FrontDecorationControls.jsx']) {
    assert.doesNotMatch(read(rel), /tenantFlags|authStore/, `${rel} learnt of tenants`);
  }
  assert.match(read('src/lib/tenantFlags.js'), /^\/\*\n \* Copyright \(c\) 2026 Skylon Development Ltd\./);
});

test('F14.2 . every place a style is chosen offers the tenant\'s list and says the words beside an ornate front', () => {
  // The five offering places: SettingsPanel's gallery and door-style select, WizardSettings' gallery and
  // door-style select, RightPanel's unit front select. None may list FRONT_STYLE_OPTIONS whole any more.
  for (const rel of ['src/components/SettingsPanel.jsx', 'src/components/WizardSettings.jsx', 'src/components/RightPanel.jsx']) {
    const src = read(rel);
    assert.match(src, /from '\.\.\/lib\/tenantFlags\.js'/, `${rel} does not read the tenant's styles`);
    assert.match(src, /useAuthStore\(\(s\) => s\.tenant\?\.id\)/, `${rel} does not know the tenant`);
    assert.doesNotMatch(src, /FRONT_STYLE_OPTIONS\.map\(/, `${rel} still offers every style to every tenant`);
    const mounts = (src.match(/<FrontDecorationControls\b/g) || []).length;
    const words = (src.match(/data-style-not-offered/g) || []).length;
    assert.equal(words, mounts, `${rel}: ${mounts} decoration controls, ${words} not-offered lines`);
  }
  const galleries = ['src/components/SettingsPanel.jsx', 'src/components/WizardSettings.jsx']
    .map((rel) => read(rel).match(/<FrontStyleGallery[\s\S]*?\/>/)[0]);
  for (const g of galleries) assert.match(g, /styles=\{frontStylesFor\(/, 'a gallery offers every style');
});
