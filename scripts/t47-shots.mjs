#!/usr/bin/env node
// ─── THE EYES (turn 47, iron rule 5: "Every screenshot LOOKED AT") ──────────
//
// The elevations this turn changes, drawn from the ENGINE's own panels and
// written to `verify/t47/`. Four shapes, and each is a sentence of CLAUDE.md:
//
//   PLAIN        the wardrobe with no cut at all — the control
//   PENTAGON     one straight run, the shape T46 could already cut
//   KNEE         flat, then falling: the very case T46 got wrong
//   TWO SLOPES   descends, runs flat, descends — the case T44's schema always
//                allowed and no code path had ever seen
//
// …each twice: with the doors on (what the customer sees) and carcass-only
// (what the joiner needs, and where the roof boards and the bevelled sides are
// not hidden behind a leaf).
//
// ─── ZERO NEW DEPS (iron rule 5) ────────────────────────────────────────────
//
// This writes SVG, which is what the app's own renderer produces
// (`drawings/svg.js` — the same string the preview and the export use), and
// SVG is the evidence. Rasterising it is a convenience for a reviewer with a
// browser to hand and is NOT a dependency of this repository: pass
// `--png` and it will use a `playwright` that happens to be installed, and say
// so plainly when there is not one.
//
//     node scripts/t47-shots.mjs
//     node scripts/t47-shots.mjs --png

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { buildFrontElevation } from '../src/engine/drawings/frontElevation.js';
import { sheetToSvg } from '../src/engine/drawings/svg.js';
import { boundsOf, moveEntities } from '../src/engine/drawings/primitives.js';

const OUT = new URL('../verify/t47/', import.meta.url);
const BASE = { ...defaultParamsFor('WARDROBE', P), unit_num: '01' };

/** The four ceilings, stated once. */
export const SHAPES = {
  plain: { width: 600 },
  pentagon: { width: 600, slope_cut: { y0: 2400, y1: 1200, infill: 40 } },
  knee: {
    width: 900,
    slope_cut: { pts: [{ x: 0, y: 2000 }, { x: 300, y: 2000 }, { x: 900, y: 1400 }], infill: 40 },
  },
  'two-slopes': {
    width: 1200,
    slope_cut: {
      pts: [{ x: 0, y: 1600 }, { x: 300, y: 2000 }, { x: 900, y: 2000 }, { x: 1200, y: 1500 }],
      infill: 40,
    },
  },
};

export function elevationSvg(params) {
  const el = buildFrontElevation(computeCabinet(params, P), {
    unitNum: '01', frontType: 'F', profile: P,
  });
  const b = boundsOf(el.entities);
  const pad = 60;
  return sheetToSvg({
    entities: moveEntities(el.entities, -b.x + pad, -b.y + pad),
    width: b.w + pad * 2,
    height: b.h + pad * 2,
  }, { kind: 'front-elevation' });
}

export function writeShots() {
  const written = [];
  for (const [name, over] of Object.entries(SHAPES)) {
    const doors = over.width >= 900 ? 2 : 1;
    for (const [tag, extra] of [['elevation', { doors }], ['carcass', { doors: 0 }]]) {
      const file = `f5-${tag}-${name}.svg`;
      writeFileSync(new URL(file, OUT), elevationSvg({ ...BASE, ...over, ...extra }));
      written.push(file);
    }
  }
  return written;
}

const IS_CLI = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (IS_CLI) {
  const files = writeShots();
  for (const f of files) process.stdout.write(`verify/t47/${f}\n`);
  if (process.argv.includes('--png')) {
    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch();
      const page = await browser.newPage({ viewport: { width: 1500, height: 1900 } });
      const { readFileSync } = await import('node:fs');
      for (const f of files) {
        const raw = readFileSync(new URL(f, OUT), 'utf8').replace(
          /width="([\d.]+)mm" height="([\d.]+)mm"/,
          (m, w, h) => {
            const scale = Math.min(1400 / Number(w), 1900 / Number(h));
            return `width="${Number(w) * scale}" height="${Number(h) * scale}"`;
          },
        );
        await page.setContent(`<body style="margin:0;background:#fff;display:inline-block">${raw}</body>`);
        await (await page.$('svg')).screenshot({ path: fileURLToPath(new URL(f.replace('.svg', '.png'), OUT)) });
      }
      await browser.close();
      process.stdout.write(`\n${files.length} PNG(s) written beside the SVGs.\n`);
    } catch (e) {
      process.stdout.write(`\nNo rasteriser here (${e.message.split('\n')[0]}).\n`
        + 'The SVGs above ARE the evidence — they are what this app\'s own renderer\n'
        + 'produces for the preview and for the export. Open them in any browser.\n');
    }
  }
}
