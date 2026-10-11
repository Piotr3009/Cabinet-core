// T78 F11 · the Hafele blind-corner pull-out: a line and a body in the blind part.
import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

export const GATES = {
  blindPullout: {
    what: '`params.blind_pullout === true` on a BLIND kit: the shelves step aside, one BOM line, a placeholder body of two '
      + 'wire trays behind the blank, zero holes; a fixed shelf refuses it in words',
    opens: (params, typeId) => Boolean(typeId && String(typeId).startsWith('BLIND_') && params?.blind_pullout === true),
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: 'T78 F11: `blindPullout` / `blindPulloutRefused` in normalizeParams (the shelf count 0 while fitted), the body into '
      + 'cornerKitBodies, BLIND_PULLOUT_REFUSED, the BOM label names the blind part, `BLIND_KIT_KINDS`',
    gates: ['blindPullout'],
  },
  'src/engine/profile.js': {
    why: 'T78 F11: `corner.blindPullout` (label, trays 2, trayMm 20, clearMm 10), proposed, read only while fitted',
    gates: ['blindPullout'],
  },
  'src/engine/partRegistry.js': {
    why: 'T78 F11: the `kit_blind_pullout` row and the `blind_pullout` role; a list',
    gates: ['blindPullout'],
  },
};

export const LIVENESS = {
  blindPullout: () => {
    const r = computeCabinet({ ...defaultParamsFor('BLIND_BASE', P), unit_num: 'BB01', doors: true, shelves: 2, blind_pullout: true }, P);
    const kit = (r.assemblies.cornerKits || []).find((k) => k.kind === 'blind_pullout');
    const line = r.hardware.find((h) => h.role === 'blind_pullout');
    return {
      live: Boolean(kit && line && r.panels.filter((p) => p.part === 'SHELF').length === 0),
      said: `BLIND_BASE with the pull-out: ${line?.spec_label}, shelves cut ${r.panels.filter((p) => p.part === 'SHELF').length}`,
    };
  },
};

export const GOLDENS = [];
