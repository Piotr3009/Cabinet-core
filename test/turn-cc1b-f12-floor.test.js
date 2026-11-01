/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F12 . THE FONT FLOOR OF THE BIG WINDOWS. The owner, 01.11.2026: *"Spraying: okno duze a fonty male i duzo
// pustego miejsca, jak ty to zawsze robisz"*. The rule is read from index.css and the class is found on the element
// each window draws (the Assign and Stock windows rendered as the browser renders them, Spraying by its source).
import test from 'node:test';
import assert from 'node:assert/strict';
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
const { default: AssignMaterialsModal } = await import('../src/components/AssignMaterialsModal.jsx');
const { default: JcStockModal } = await import('../src/components/JcStockModal.jsx');
const { useMaterialAssignmentStore } = await import('../src/stores/materialAssignmentStore.js');
const { STOCK_MATERIALS } = await import('./fixtures/jc-stock.js');

/** Render with the stock as the store holds it after a read (a server render reads the initial state). */
function draw(Component) {
  const init = useMaterialAssignmentStore.getInitialState();
  const kept = { ...init };
  Object.assign(init, useMaterialAssignmentStore.getState(), { materials: STOCK_MATERIALS, materialsSource: 'jc', stockError: null });
  try { return renderToStaticMarkup(React.createElement(Component)); } finally {
    for (const k of Object.keys(init)) delete init[k];
    Object.assign(init, kept);
  }
}

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const CSS = read('src/index.css').replace(/\/\*[\s\S]*?\*\//g, ' ');

/** The declarations of every rule whose selector list names `selector` exactly. */
function declarations(selector) {
  const out = {};
  for (const m of CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sels = m[1].split(',').map((x) => x.trim());
    if (!sels.includes(selector)) continue;
    for (const d of m[2].split(';')) {
      const [k, v] = d.split(':').map((x) => x && x.trim());
      if (k && v) out[k] = v;
    }
  }
  return out;
}
const px = (v) => Number(String(v).replace('px', ''));

test('F12.1 index.css: the wide window\'s body, its cells and its small text are at least 13 px', () => {
  assert.ok(px(declarations('.cc-modal-wide')['font-size']) >= 13);
  for (const sel of ['.cc-modal-wide th', '.cc-modal-wide td']) {
    const d = declarations(sel);
    assert.ok(px(d['font-size']) >= 13, sel);
    assert.equal(d.padding, '6px 8px', sel);
  }
  for (const sel of ['.cc-modal-wide .text-xs', '.cc-modal-wide .text-\\[10px\\]', '.cc-modal-wide .text-\\[11px\\]']) {
    assert.ok(px(declarations(sel)['font-size']) >= 13, sel);
  }
  const table = declarations('.cc-modal-wide table');
  assert.equal(table.width, '100%');
  assert.equal(table['table-layout'], 'auto');
});

test('F12.1 the three windows carry cc-modal-wide at 1240, and a cell in each sits under the floor', () => {
  for (const [Component, name] of [[AssignMaterialsModal, 'assign-materials'], [JcStockModal, 'jc-stock']]) {
    const html = draw(Component);
    const shell = html.match(new RegExp(`<[^>]*data-modal-name="${name}"[^>]*>`));
    assert.ok(shell, name);
    // The class rides the window's panel; every table cell inside it inherits the floor rule above.
    assert.match(html, /class="[^"]*cc-modal-wide/);
    assert.match(html, /w-\[1240px\]/);
    assert.match(html, /<td/, `${name} draws table cells under the floor`);
  }
  const spray = read('src/components/SprayingPanel.jsx');
  assert.match(spray, /className="cc-modal-wide"/);
  assert.match(spray, /width="w-\[1240px\]"/);
});

test('F12.1 the Spraying table takes its window\'s width: automatic layout, no fixed column widths', () => {
  const spray = read('src/components/SprayingPanel.jsx');
  const partA = spray.slice(spray.indexOf('function PartA('), spray.indexOf('</thead>', spray.indexOf('function PartA(')));
  assert.match(partA, /<table className="w-full[^"]*" style=\{\{ tableLayout: 'auto' \}\}/);
  assert.doesNotMatch(partA, /<th[^>]*w-\[\d+px\]/, 'the fixed widths of :208 are gone');
});
