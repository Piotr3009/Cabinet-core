#!/usr/bin/env node
// Copyright (c) 2026 Skylon Development Ltd.
// Reproducible 600 x 800 x 18 mm reference examples, without cabinet hardware.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { buildFrontDecoration, defaultFrontDecoration, ORNATE_STYLE_IDS } from '../src/engine/frontDecoration.js';
import { buildOrnateReferenceFiles } from '../src/engine/cnc/ornateExport.js';

const destination = resolve(process.argv[2] || 'verify/ornate-a/examples');
mkdirSync(destination, { recursive: true });
const examples = [];
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
for (const style of ORNATE_STYLE_IDS) {
  const config = defaultFrontDecoration(style);
  const panel = {
    id: style, part: 'FRONT', role: 'front', w: 600, h: 800, thickness: 18,
    box: { x: 0, y: 0, z: 0, w: 600, h: 800, d: 18 },
    cnc: { drawn_w: 600, drawn_h: 800, outline: [[0, 0], [600, 0], [600, 800], [0, 800]] },
  };
  const decoration = buildFrontDecoration({ panel, config, style });
  if (decoration.status !== 'ready') throw new Error(`${style}: ${JSON.stringify(decoration.problems)}`);
  panel.meta = { frontDecoration: decoration };
  const files = buildOrnateReferenceFiles([{ result: { unitNum: 'EXAMPLE', panels: [panel], drills: [] } }]);
  if (!files.some((f) => f.type === 'stl') || !files.some((f) => f.type === 'dxf')) throw new Error(`${style}: incomplete reference export`);
  for (const file of files) {
    const path = resolve(destination, file.name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, file.contents);
  }
  const paths = decoration.operations.flatMap((op) => op.contours || []).map((contour) => {
    const points = contour.points.map(([x, y]) => `${(600 - x).toFixed(4)},${(800 - y).toFixed(4)}`).join(' ');
    return `<${contour.closed === false ? 'polyline' : 'polygon'} points="${points}" fill="none" stroke="${contour.kind === 'profile-level' ? '#333d3f' : '#8f703b'}" stroke-width="${contour.kind === 'profile-level' ? 1.3 : .8}"/>`;
  }).join('\n');
  writeFileSync(resolve(destination, `${style}-front.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -50 640 900"><rect x="0" y="0" width="600" height="800" fill="#f4f1e9" stroke="#30383b" stroke-width="2"/>${paths}<text x="0" y="-17" font-size="18" font-family="sans-serif">${escape(style)} | 600 x 800 x 18 mm</text><text x="0" y="835" font-size="13" font-family="sans-serif">PROPOSED REFERENCE - not production approved</text></svg>`);
  examples.push({ style, files: files.map((f) => f.name), parameters: decoration.parameters, vertices: decoration.operations[0].surface.vertices.length, triangles: decoration.operations[0].surface.triangles.length });
}
writeFileSync(resolve(destination, 'examples.json'), JSON.stringify({ units: 'mm', referenceOnly: true, examples }, null, 2));
console.log(JSON.stringify({ destination, examples: examples.map(({ style, vertices, triangles }) => ({ style, vertices, triangles })) }, null, 2));
