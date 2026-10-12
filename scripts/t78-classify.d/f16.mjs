// T78 F16 · the double drawer: a deep box and a cutlery inner drawer behind one front.
import { readFileSync } from 'node:fs';
import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { setInnerDrawerCatalogue } from '../../src/engine/innerDrawer.js';
import { goldenSummary } from '../t75-golden.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
const FILE = () => JSON.parse(readFileSync(`${ROOT}reference/hardware/blum-inner-drawer.json`, 'utf8'));

export const GATES = {
  doubleDrawer: {
    what: '`params.drawer_double[row] === true` on a drawer unit (BUDR, the hob units): the row\'s deep box stops under an inner '
      + 'drawer on its own runners, an inner front, a cutlery insert, one more runner pair; without it the drawer unit is byte for byte today\'s',
    opens: (params) => Boolean(params?.drawer_double) && Object.values(params.drawer_double).some((v) => v === true),
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: 'T78 F16: `doubles` in the drawer-unit numbers (refused in words below Blum\'s stack minimum or with no file), the deep box '
      + 'capped under the inner runner, the inner box boards `D{i}I-*` keyed row + 0.5, the inner front `-DIF{i}`, the inner runner '
      + 'rows in the ladder and the BOM, the cutlery insert; `drawer_double` dropped from the L\'s parents; `double_rows` only where a row is double',
    gates: ['doubleDrawer'],
  },
  'src/engine/innerDrawer.js': {
    why: 'T78 F16: a new reader of reference/hardware/blum-inner-drawer.json (setInnerDrawerCatalogue, innerDrawerSpec); null unloaded',
    gates: ['doubleDrawer'],
  },
  'src/engine/profile.js': {
    why: 'T78 F16: the cutlery row of the insert catalogue (proposed); read only when an insert is ordered for a double row',
    gates: ['doubleDrawer'],
  },
};

export const LIVENESS = {
  doubleDrawer: () => {
    setInnerDrawerCatalogue(FILE());
    const r = computeCabinet({ ...defaultParamsFor('BUDR', P), unit_num: 'D1', drawer_double: { 1: true } }, P);
    setInnerDrawerCatalogue(null);
    const inner = r.panels.filter((p) => /^D1I-/.test(p.id));
    const front = r.panels.find((p) => p.id === 'D1-DIF1');
    return {
      live: inner.length === 5 && Boolean(front) && r.hardware.some((h) => h.role === 'drawer_insert' && h.spec.variant === 'cutlery'),
      said: `BUDR with row 1 double: ${inner.length} inner box boards, inner front ${front ? `${front.w} x ${front.h}` : 'none'}, `
        + `runner pairs ${r.hardware.find((h) => h.role === 'runner_pairs')?.qty}`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-double-drawer.json',
    F: 'F16',
    source: 'engine/innerDrawer.js reading reference/hardware/blum-inner-drawer.json (C below 193, M above 109, the stack 302, owner to '
      + 'confirm): BUDR x3 with row 1 double, the deep box capped under the inner runner, the inner box at the M side, its inner front',
    make: () => {
      setInnerDrawerCatalogue(FILE());
      const r = computeCabinet({ ...defaultParamsFor('BUDR', P), unit_num: '01', drawer_double: { 1: true } }, P);
      setInnerDrawerCatalogue(null);
      return goldenSummary(r);
    },
    params: () => ({ ...defaultParamsFor('BUDR', P), unit_num: '01', drawer_double: { 1: true } }),
  },
];
