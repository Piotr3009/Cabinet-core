// T75 F7 · THE CORNER NOTCH, LISP FIRST. CLAUDE.md T75 F7, the owner, 23.09.2026:
// *"WYCIĘCIE NAROŻNIKA w karkasie (mega ważne, np. L-ka przy ścianie, rurze)."*

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

export const GATES = {
  notch: {
    what: 'a corner notch on the unit (`params.notch`, F7: CUT CORNER writes it, no default carries it)',
    opens: (p) => Boolean(p.notch),
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: 'F7 · the corner notch: asked of the parent cut first (`notchVerdict`, refused: the parent and '
      + 'NOTCH_REFUSED), `notchCarcass` before the drilling pass and `notchDrills` after it, `derived.notch`',
    gates: ['notch'],
  },
  'src/engine/notch.js': {
    why: 'F7 · NEW: KIT_NOTCH.lsp mirrored routine for routine (sections A to I), and the engine half (Z): '
      + 'the kits it applies to, the verdict on the parent cut, the two passes either side of the drilling, '
      + 'the corner the 3-D cuts. Every line is behind `params.notch`',
    gates: ['notch'],
  },
  'src/lib/modalLayer.js': {
    why: 'F7 · the `notch` window (CUT CORNER) in the modal registry: about an object, held to an anchor. '
      + 'A window name, not a cut',
    gates: [],
  },
  'src/engine/partRegistry.js': {
    why: 'F7 · NOTCH-RETURN, NOTCH-STEP, NOTCH-LID on the carcass rows. No fixture emits any of them',
    gates: ['notch'],
  },
  'src/engine/profile.js': {
    why: 'F7 · `notch.defaults` (200, 200, full) and its migrate line, T75 proposed',
    gates: ['notch'],
  },
  'src/engine/checks.js': {
    why: 'F7 · Check #28, red: the engine\'s NOTCH_REFUSED in its own words. Reads a result; cuts nothing',
    gates: [],
  },
};

export const LIVENESS = {
  notch: () => {
    const r = computeCabinet({
      ...defaultParamsFor('BUD', P), unit_num: '01', shelves: 1, notch: { corner: 'BL', w: 200, d: 200, h: 0 },
    }, P);
    const bul = r.panels.find((p) => p.id === 'BUL');
    const ret = r.panels.find((p) => p.id === 'RETURN');
    return {
      live: Boolean(ret) && bul?.w === 340 && !r.warnings.some((w) => w.code === 'NOTCH_REFUSED'),
      said: `BUD with a 200 x 200 BL notch cuts BUL ${bul?.w} and ${r.derived?.notch?.boards?.join(', ') || 'no box'}`,
    };
  },
};
