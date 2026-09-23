#!/usr/bin/env node
// ─── T74 · THE ENGINE PROBES, COMMITTED AS TABLES BEFORE ANY FIX ───────────
//
// CLAUDE.md T74, LAWS: *"Diagnose before you cut. Every BUG below ... begins
// with a committed PROBE: the fact found, in one table, before any fix."*
//
// These four are questions the ENGINE answers (what is cut, where, at what
// angle), so they are asked of the engine and the store, in node, with no
// browser: F6 (how one shoe drawer is built, and what a second one gets), F9
// (a divider under a slope, against the side and the end panel), F10 (the
// hinges on a door the slope cuts), F13 (whether anything like a free panel
// exists). The browser probes (F8, F11, F12) are `scripts/t74-probes.mjs`.
//
//   node scripts/t74-engine-probes.mjs [--suffix -after] [f6 f9 f10 f13]

import { mkdirSync, writeFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPE_ORDER, UNIT_CATEGORIES } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { slopeNoteText } from '../src/engine/cnc/partLabel.js';
import { KITCHEN_LIBRARY } from '../src/engine/library.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const OUT = new URL('../verify/t74/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const sIdx = process.argv.indexOf('--suffix');
const SUFFIX = sIdx > 0 ? process.argv[sIdx + 1] : '';
const want = process.argv.slice(2).filter((a) => !a.startsWith('-') && a !== SUFFIX);
const runs = (n) => want.length === 0 || want.includes(n);
const S = () => useProjectStore.getState();
const r4 = (v) => (v == null ? '' : Math.round(Number(v) * 100) / 100);
const table = (cols, rows) => [
  `| ${cols.join(' | ')} |`,
  `|${cols.map(() => '---').join('|')}|`,
  ...rows.map((r) => `| ${cols.map((c) => String(r[c] ?? '').replace(/\|/g, '/')).join(' | ')} |`),
].join('\n');
const write = (name, lines) => {
  // A re-run after a fix keeps the table and drops the "before" facts, which
  // the committed probe already states; the after-note is written beside it.
  const cut = SUFFIX ? lines.indexOf('## The facts') : -1;
  const body = cut >= 0 ? lines.slice(0, cut) : lines;
  writeFileSync(`${OUT}${name}${SUFFIX}.md`, `${body.join('\n')}\n`);
  process.stdout.write(`written verify/t74/${name}${SUFFIX}.md\n`);
};

// ═══ F6 · HOW ONE SHOE DRAWER IS BUILT, AND WHAT A SECOND ONE GETS ═══════════
if (runs('f6')) {
  const shoeRoom = () => {
    S().newProject();
    S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
    return S().addUnit('WARDROBE', { params: { width: 1000, height: 2150, depth: 568 } }).id;
  };
  const rowsOf = (id, when) => {
    const r = S().unitResult(id);
    const items = S().units.find((u) => u.id === id).params.sections[0].items.filter((i) => i.kind === 'drawer');
    return items.map((it) => {
      const front = r.panels.find((p) => p.part === 'DRAWER-FRONT' && p.meta?.drawer === it.index);
      const side = r.panels.find((p) => p.part === 'DRAWER-SIDE' && p.meta?.drawer === it.index);
      const ramp = r.panels.find((p) => p.part === 'SHOE-RAMP' && p.meta?.drawer === it.index);
      return {
        when,
        item: `${it.index} ${it.variant || 'plain'}`,
        'pos_mm (mounting height)': it.pos_mm ?? '(none)',
        'front y..top': front ? `${r4(front.box.y)}..${r4(front.box.y + front.box.h)}` : '',
        'box side y, h': side ? `${r4(side.box.y)}, ${r4(side.box.h)}` : '',
        ramp: ramp ? `${ramp.id} tilt ${ramp.meta.tilt_deg}` : '(none)',
      };
    });
  };
  const rows = [];
  let id = shoeRoom();
  const first = S().addShoeDrawer(id);
  rows.push(...rowsOf(id, `ONE shoe drawer (addShoeDrawer -> ${first ? 'id' : 'null'})`));
  const second = S().addShoeDrawer(id);
  rows.push(...rowsOf(id, `a SECOND addShoeDrawer -> ${second ? 'id' : 'null (refused, no words)'}`));
  const warnOne = (S().unitResult(id).warnings || []).map((w) => w.code).filter((c) => /SHOE|DRAWER/.test(c));

  id = shoeRoom();
  S().addDrawers(id, 2);
  S().addShoeDrawer(id);
  rows.push(...rowsOf(id, 'two plain drawers, then a shoe drawer'));

  const zone = S().unitResult(id).assemblies?.drawerZone;
  write('f06-probe', [
    '# T74 F6 · the probe: how one shoe drawer is built today',
    '',
    'The owner, 23.09.2026: *"DRUGA SZUFLADA NA BUTY (niskie i wysokie buty). Regulacja = WYSOKOŚĆ MONTAŻU, nie',
    'wysokość szuflady. Pierwsza szuflada ZAWSZE na dnie (ustalone, bez zmian). Druga przesuwana góra/dół, program',
    'pokazuje odległość między szufladami."*',
    '',
    'Run by `node scripts/t74-engine-probes.mjs f6`, through the store the app uses (`addShoeDrawer`, `unitResult`).',
    'A 1000 x 2150 x 568 wardrobe; every y is from the outside of the carcass bottom.',
    '',
    table(['when', 'item', 'pos_mm (mounting height)', 'front y..top', 'box side y, h', 'ramp'], rows),
    '',
    `Warnings on the one-shoe wardrobe: ${warnOne.join(', ') || '(none)'}. Stack zone: ${JSON.stringify(zone)}.`,
    '',
    '## The facts',
    '',
    '1. A shoe drawer is an ordinary drawer item, `variant: \'shoe\'`, with an 80 mm box side (`wardrobe.drawers.shoeSideMm`)',
    '   and a 116 mm front. Its height in the stack is decided by its INDEX: the engine stacks drawers tight from the',
    '   floor (`zoneOffsets`, `cabinet.js` "stack the drawers tight"), so a lone shoe drawer is on the bottom and a shoe',
    '   drawer added over plain drawers sits on top of them. No drawer carries a mounting height today.',
    '2. A SECOND shoe drawer in the same bay is REFUSED by the store, silently: `addShoeDrawer` returns null on',
    '   `stack.some((i) => i.variant === \'shoe\')` and says nothing.',
    '3. The shoe drawer\'s ramp (the sloped bottom, `SHOE-RAMP`) is the kit\'s: only the TOP drawer of a stack gets one',
    '   (reason `not-top`, the LISP kit\'s *"tylko na wierzchu innych szuflad"*).',
    '4. No drawer can be dragged, and the clickable spacing chain (`3d/SpacingChain.jsx`) has no drawer branch.',
    '',
  ]);
}

// ═══ F9 · A DIVIDER UNDER A SLOPE, AGAINST THE SIDE AND THE END PANEL ═══════
if (runs('f9')) {
  const params = {
    ...defaultParamsFor('WARDROBE', P),
    unit_num: '01',
    width: 1000,
    items: [{ kind: 'partition', id: 'p1', x_mm: 491 }],
    end_panels: [{ id: 'ep1', side: 'R' }],
    slope_cut: { y0: 2400, y1: 1200, infill: 40 },
  };
  const r = computeCabinet(params, P);
  const csv = (id) => (r.csvLines || []).find((l) => l.split(',')[1] === id) || '';
  const pick = (id) => r.panels.find((p) => p.id === id);
  const rows = [];
  for (const id of ['BUL', 'BUR', 'VPART-1', ...r.panels.filter((p) => p.part === 'END-PANEL').map((p) => p.id)]) {
    const p = pick(id);
    if (!p) continue;
    rows.push({
      panel: `${p.id} (${p.part})`,
      'cut w x h': `${r4(p.w)} x ${r4(p.h)}`,
      'box y..top': `${r4(p.box.y)}..${r4(p.box.y + p.box.h)}`,
      'meta.slopeCut': p.meta?.slopeCut ? `h ${r4(p.meta.slopeCut.h)}, low ${r4(p.meta.slopeCut.low)}` : '(none)',
      'the sheet\'s note': slopeNoteText(p) || '(none)',
      'cut list line': csv(p.id),
    });
  }
  const roof = r.panels.filter((p) => p.part === 'TOP' || /^TOP-/.test(p.id)).map((p) => `${p.id} y ${r4(p.box.y)}`);
  write('f09-probe', [
    '# T74 F9 · the probe: the divider under a slope',
    '',
    'The owner, 23.09.2026: *"divider przy skosie nie skraca się i nie ma cięcia pod kątem. Ma pokazywać najdłuższą',
    'krawędź plus kąt cięcia."*',
    '',
    'Run by `node scripts/t74-engine-probes.mjs f9`: a 1000 wide WARDROBE, a divider at x 491, an end panel on the',
    'right, under a slope that falls from 2400 at the left to 1200 at the right (40 mm infill). `computeCabinet` direct.',
    '',
    table(['panel', 'cut w x h', 'box y..top', 'meta.slopeCut', 'the sheet\'s note', 'cut list line'], rows),
    '',
    `The roof boards: ${roof.join(', ')}.`,
    '',
    '## The facts',
    '',
    '1. The SIDES are cut to the slope (T47): the blank is the longest edge, `meta.slopeCut` carries the short face,',
    '   the angles and the 3-D bevel, and every sheet prints `CUT β°` beside the blank (`slopeNoteText`).',
    '2. The END PANEL is cut to the slope (T50 F5): shortened, with its angles.',
    '3. The DIVIDER (`VPART`) is NOT: it stands to `H - G` whatever the slope over it does, runs up through the roof',
    '   board, carries no `meta.slopeCut`, and its cut list line and its sheet say nothing of an angle.',
    '',
  ]);
}

// ═══ F10 · THE HINGES ON A DOOR THE SLOPE CUTS ═════════════════════════════
if (runs('f10')) {
  const cases = [
    { name: 'slope over the hinge edge, 1500 -> 900', cut: { y0: 1500, y1: 900, infill: 40 } },
    { name: 'a low door, 420 -> 300', cut: { y0: 420, y1: 300, infill: 40 } },
    { name: 'slope over the free edge, 2400 -> 1200', cut: { y0: 2400, y1: 1200, infill: 40 } },
  ];
  const rows = [];
  for (const c of cases) {
    const r = computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: '01', slope_cut: c.cut }, P);
    for (const f of r.panels.filter((p) => p.part === 'FRONT')) {
      const cups = f.meta?.cupY || [];
      const sc = f.meta?.slopeCut || {};
      const stile = f.meta?.hinge === 'R' ? sc.roomR : sc.roomL;
      const cutEdge = Number.isFinite(stile) && stile < (f.meta?.frontH ?? f.h) - 1e-6;
      const apex = Number.isFinite(stile) ? stile : null;
      const top = cups.length ? Math.max(...cups) : null;
      const gaps = cups.slice(1).map((y, i) => r4(y - cups[i]));
      rows.push({
        case: c.name,
        leaf: `${f.id} h ${r4(f.h)}`,
        'hinge edge': `${f.meta?.hinge}${f.meta?.hingeForced ? ' (forced)' : ''}`,
        'hinge edge top (apex)': apex == null ? '' : `${r4(apex)}${cutEdge ? ' (cut by the slope)' : ''}`,
        cups: cups.map(r4).join(', '),
        'top cup to apex': top == null || apex == null ? '' : r4(apex - top),
        'cup spacing': gaps.join(', '),
      });
    }
  }
  write('f10-probe', [
    '# T74 F10 · the probe: hinges on a door the slope cuts',
    '',
    'The owner, 23.09.2026: *"ZAWIASY NA SKOSIE: minimum 150 mm od wierzchołka trójkąta skosu (inaczej nie da się',
    'wkręcić śrubokrętem). Przeliczanie zawiasów na skosach inaczej."*',
    '',
    'Run by `node scripts/t74-engine-probes.mjs f10`: the default WARDROBE, `computeCabinet` direct, each case a',
    '`slope_cut` from the left to the right. `cups` are the hinge cup centres up the leaf (`meta.cupY`); the apex is the',
    'top of the hinge edge, where the slope\'s triangle meets it.',
    '',
    table(['case', 'leaf', 'hinge edge', 'hinge edge top (apex)', 'cups', 'top cup to apex', 'cup spacing'], rows),
    '',
    '## The facts',
    '',
    '1. Where the slope cuts the hinge edge, the top cup is placed at the ordinary `hinges.endOffset` (100 mm) under',
    '   the apex: closer than the 150 mm a screwdriver needs in that acute corner.',
    '2. A low sloped door is SQUASHED: its ladder is kept and compressed into the short edge, cups closer than the',
    '   profile\'s own `minSpacingMm` (60), and nothing refuses it in words.',
    '3. There is no slope or apex number anywhere in the profile (`hinges.*`).',
    '',
  ]);
}

// ═══ F13 · IS THERE ANYTHING LIKE A FREE PANEL ════════════════════════════
if (runs('f13')) {
  const extras = (KITCHEN_LIBRARY.find((g) => g.id === 'extras')?.entries
    || KITCHEN_LIBRARY.find((g) => g.id === 'extras')?.items || []);
  const rows = [
    { question: 'a unit type that is ONE free board', answer: UNIT_TYPE_ORDER.filter((t) => /FREE/.test(t)).join(', ') || '(none): the nearest is `DW_PANEL`, a dishwasher\'s front rail, which belongs to its gap' },
    { question: 'the library\'s free-standing panel row', answer: JSON.stringify(extras.map((e) => ({ id: e.id, kind: e.kind }))) },
    { question: 'the wardrobe category', answer: JSON.stringify(UNIT_CATEGORIES.find((c) => c.id === 'wardrobe')?.types) },
    { question: 'the piece editor with the arc (PRO)', answer: '`src/components/PartDetailModal.jsx`, reached only from the cabinet editor (`CabinetEditorModal`), never by a 2klik in the room; no retail copy' },
    { question: 'a room snap that PROPOSES (shows a line, can be refused)', answer: 'none: the unit magnet (`collision.js clampUnitX`, 40 mm) snaps silently; `moveUnit` takes `{ magnet: false }` but no gesture reaches it' },
  ];
  write('f13-probe', [
    '# T74 F13 · the probe: is there anything like a free panel',
    '',
    'The owner, 23.09.2026: *"SWOBODNY PANEL (wstaw panel). Użytkownik wstawia panel, ustawia pion/poziom/każdą',
    'orientację, długość, grubość. Przyciąganie (snap) jako PROPOZYCJA, nie na siłę, zawsze do odrzucenia. Przesuwanie',
    'przez kliknięcie w wymiar. Z paneli można złożyć własną figurę (np. box). Dwuklik = wejście w edycję jak w PRO',
    '(wycięcie łuku itp.)."*',
    '',
    'Run by `node scripts/t74-engine-probes.mjs f13`.',
    '',
    table(['question', 'answer'], rows),
    '',
    'Nothing like it exists: a board belongs to a cabinet, and the library row held for this since turn 12 is `soon`.',
    '',
  ]);
}
