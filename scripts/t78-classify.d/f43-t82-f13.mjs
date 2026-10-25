/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F13 (slice B4) · PLINTH OR FLOATING, AND THE HANGERS IN THE BOM. CLAUDE.md T82 F13: *"Plinth: the house plinth
// under the vanity, height typed on the unit as every unit's; `floating: true`: no legs, no plinth, the carcass hung
// at `float_height_mm` (PROPOSED default 300), the BOM adds the hanging brackets"*. KIT_VANITY.lsp D19 and part 5(e)
// (vanity-mount, vanity-plinth-p, vanity-base-y, vanity-hangers), mirrored in engine/vanity.js. THE GATE:
// `params.floating === true` on a vanity kit; `types.js floatHeightOf` is null for every other unit, so a bare kit,
// every fixture and every golden (no golden carries `floating: true`, the vanity's own six included) resolve the type
// exactly as before. No new golden: a floating vanity cuts the very boards its standing golden holds (the test proves
// the carcass identical); what changes is how it stands (assemblies) and one hardware line.
// Draft for INT: drop into scripts/t78-classify.d/ as f43-t82-f13.mjs.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

const OWNER = 'The owner, 25.10.2026 (12:57): *"plinth do zmiany wysokosc, propozycja floating lub on the floor"*; '
  + '(13:03) *"6 - do BOM tez"*.';

export const GATES = {
  vanityFloating: {
    what: 'a FLOATING vanity (`params.floating === true` on VANITY2 / 3 / 4, `types.js floatHeightOf` not null): the '
      + 'kit cut as it hangs (`hungTypeOf`: no legs, no plinth, mount wall at `float_height_mm`) and the '
      + '`vanity_hangers` order line. Every other unit, every fixture and every golden reach no changed line.',
    opens: (params, typeId) => /^VANITY[234]$/.test(String(typeId || params?.type || '')) && params?.floating === true,
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: `T82 F13: \`normalizeParams\` resolves a floating vanity's type as it hangs (\`hungTypeOf\`) and its mount `
      + `height from \`floatHeightOf\`; one \`hw('vanity_hangers', ...)\` line under \`type.vanity\`, qty 0 (dropped) `
      + `unless floating. ${OWNER}`,
    gates: ['vanityFloating'],
  },
  'src/engine/types.js': {
    why: `T82 F13: \`floatHeightOf\` (KIT_VANITY.lsp vanity-base-y; null unless a vanity with params.floating) and `
      + `\`hungTypeOf\` (vanity-mount, vanity-plinth-p: the kit with legs false, plinth false, mount wall). ${OWNER}`,
    gates: ['vanityFloating'],
  },
  'src/engine/vanity.js': {
    why: `T82 F13: part 5(e), PLINTH OR FLOATING: vanityMount, vanityPlinthP, vanityBaseY, vanityHangers, the LISP's `
      + `four routines one for one. ${OWNER}`,
    gates: ['vanityFloating'],
  },
  'src/engine/partRegistry.js': {
    why: `T82 F13: \`vanity_hanger\` (hardware, pcs) and HARDWARE_TO_PART_ID.vanity_hangers; the registry reads the `
      + `engine's line, never the reverse. ${OWNER}`,
    gates: [],
  },
  'src/engine/checks.js': {
    why: `T82 F13: Check #6 ("standing on legs with no plinth") asks \`floatHeightOf\` first: a floating vanity hangs. `
      + `A Check reader, never read by computeCabinet. ${OWNER}`,
    gates: [],
  },
  'src/engine/roomFit.js': {
    why: `T82 F13: \`floorOf\` reads a floating vanity's height (the room's refusal over it). Never read by `
      + `computeCabinet. ${OWNER}`,
    gates: [],
  },
  'src/engine/runs.js': {
    why: `T82 F13 (B4's patch, applied by A3): \`unitBase\` reads \`floatHeightOf\` first, so the run, the scene, the `
      + `plan and the elevation see the vanity where it hangs. Never read by computeCabinet. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {
  vanityFloating: () => {
    const base = { ...defaultParamsFor('VANITY3', P), unit_num: '01', plinth: true };
    const floor = computeCabinet(base, P);
    const hung = computeCabinet({ ...base, floating: true }, P);
    const hangers = (hung.hardware || []).find((h) => h.role === 'vanity_hangers');
    const live = floor.panels.some((p) => p.part === 'PLINTH') && !hung.panels.some((p) => p.part === 'PLINTH')
      && hung.assemblies.mount === 'wall' && hung.assemblies.mountHeight === 300
      && !(hung.hardware || []).some((h) => h.role === 'legs') && hangers?.qty === 2;
    return {
      live: Boolean(live),
      said: `VANITY3 floating: mount ${hung.assemblies.mount} at ${hung.assemblies.mountHeight}, `
        + `plinth ${hung.panels.some((p) => p.part === 'PLINTH') ? 'cut' : 'none'}, hangers ${hangers?.qty ?? 0}`,
    };
  },
};

export const GOLDENS = [];

export const REPINNED = [];
