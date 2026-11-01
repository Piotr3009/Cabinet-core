/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F1 . ONE CATALOGUE, IDS THAT NEVER CHANGE (CLAUDE.md T-CC2a law 1).
//
// The owner, 01.11.2026, 12:34: *"musimy miec liste materialow wszystkich
// materialow jakie CC uzywa ... kazdy material musi miec identyfikator ... nie
// moze byc po nazwie"*; 12:50: *"CC powinien miec swoja (nie widoczna)
// numeracje materialow, a nazwa tylko sie wyswietla"*.
//
// This script WRITES `src/engine/catalogueData.js` once and APPENDS to it
// later. It never edits or removes a line it wrote before: an entry the
// sources no longer produce stays (a later turn marks it `retired: true` by
// hand, never by deleting it). A second run over the same sources writes the
// identical file. The id of every entry is written here ONCE as a literal and
// the engine never computes one at run time.
//
// It also keeps the ledger `test/fixtures/catalogue-ids.v1.json` (every id
// issued with its meaning); an id whose meaning would change is refused here
// in words and the run stops (law 1: an id is never reused).
//
// Sources, all the engine's own:
//   public/decors/egger/egger-decors.json            the 85 Egger decors
//   profile.projectSettings.boardThicknessOptions,
//   profile.board.thicknessOptions,
//   profile.front.thicknessOptions                   the sheet thicknesses
//   reference/hardware/cliptop-hinges.json            hinges and plates
//   reference/hardware/blum-hinges.json               the wide family, the bi-fold
//   reference/hardware/blum-inframe-hinge.json        the in-frame hinge
//   reference/hardware/aventos.json                   lift sets, arms, caps, brackets
//   profile.hardware.runner.movento                   runner ladder and variants
//   profile (cornice, glass, lighting, handles, mirror, shelf holes, drawer inserts)
//
// Usage: node scripts/t-cc2a-catalogue.mjs [--check]
//   --check  writes nothing; exits 1 when the file or the ledger would change.
// The outputs may be pointed at copies: CC_CATALOGUE_DATA, CC_CATALOGUE_LEDGER.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
// The two outputs; a test may point them at copies (CC_CATALOGUE_DATA, CC_CATALOGUE_LEDGER).
const DATA = process.env.CC_CATALOGUE_DATA || join(ROOT, 'src/engine/catalogueData.js');
const LEDGER = process.env.CC_CATALOGUE_LEDGER || join(ROOT, 'test/fixtures/catalogue-ids.v1.json');
const CHECK = process.argv.includes('--check');

const json = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
const { DEFAULT_CABINET_PROFILE: P } = await import(join(ROOT, 'src/engine/profile.js'));
const { BAR_CENTRES } = await import(join(ROOT, 'src/engine/handles.js'));

const ID_RULE = /^[a-z0-9][a-z0-9._-]{0,119}$/;
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

const entries = [];
const add = (e) => {
  if (!ID_RULE.test(e.id) || UUID_SHAPE.test(e.id)) throw new Error(`catalogue: the id "${e.id}" breaks the id rule`);
  if (entries.some((x) => x.id === e.id)) return;
  entries.push(e);
};

// --- SHEETS -------------------------------------------------------------------
const thicknesses = [...new Set([
  ...(P.projectSettings?.boardThicknessOptions || []),
  ...(P.board?.thicknessOptions || []),
  ...(P.front?.thicknessOptions || []),
].map(Number).filter((t) => t > 0))].sort((a, b) => a - b);
const decors = json('public/decors/egger/egger-decors.json').decors;
for (const d of decors) {
  for (const t of thicknesses) {
    add({
      id: `sheet.egger.${d.id.toLowerCase()}.${t}`, department: 'sheets', brand: 'egger', kind: 'sheet',
      name: `Egger ${d.name}, ${t} mm`, decorId: d.id, core: 'chipboard', thickness: t, unit: 'm²',
    });
  }
}
for (const t of thicknesses) {
  add({
    id: `sheet.mdf.${t}`, department: 'sheets', brand: 'mdf', kind: 'sheet',
    name: `MDF, ${t} mm`, core: 'mdf', thickness: t, unit: 'm²',
  });
}
// The three honest placeholders of T-CC1b (stores/materialAssignmentStore.js GENERIC_MATERIALS, 18, 22
// and 25): they pin the geometry, never a purchase. Written here as the store's three, and
// test/turn-cc2a-f01-catalogue.test.js holds the two lists equal.
for (const t of [18, 22, 25]) {
  add({
    id: `sheet.generic.${t}`, department: 'sheets', brand: 'generic', kind: 'sheet',
    name: `Generic board, ${t} mm`, thickness: t, unit: 'm²',
  });
}

// --- EDGING (consumables): one per Egger decor, the tape follows the decor ------
for (const d of decors) {
  add({
    id: `edge.egger.${d.id.toLowerCase()}`, department: 'consumables', brand: 'egger', kind: 'edging',
    name: `Egger edging ${d.name}`, decorId: d.id, unit: 'm', role: 'edging',
  });
}

// --- HINGES -------------------------------------------------------------------
const cliptop = json('reference/hardware/cliptop-hinges.json');
const finishes = (P.hardware?.hinge?.cliptop?.finishes || []).map((f) => f.id);
const hingeFamilies = new Map();
for (const it of cliptop.items || []) {
  if (it.role !== 'hinge' || !it.family) continue;
  if (!hingeFamilies.has(it.family)) hingeFamilies.set(it.family, { family: it.family, angle: num(it.angle), finish: it.finish });
}
for (const h of [...hingeFamilies.values()].sort((a, b) => a.angle - b.angle || String(a.finish).localeCompare(String(b.finish)))) {
  add({
    id: `hinge.blum.clip-top.${h.angle}.${slug(h.finish)}`, department: 'hinges', brand: 'blum', kind: 'hardware',
    name: `Blum CLIP top BLUMOTION ${h.angle} degree hinge, ${h.finish}`, unit: 'pcs', role: 'hinges', articleNo: h.family,
    match: { angle: h.angle, finish: h.finish },
  });
}
const blumHinges = json('reference/hardware/blum-hinges.json');
for (const [angle, h] of Object.entries(blumHinges.families?.wide?.hinges || {})) {
  const a = num(angle);
  const art = h?.articles?.screw_on?.value ?? null;
  // The wide 155 IS the CLIP top 155 (71B7550 in both files): one product, one entry.
  if ([...hingeFamilies.values()].some((x) => x.family === art)) continue;
  add({
    id: `hinge.blum.clip-top.${a}.wide`, department: 'hinges', brand: 'blum', kind: 'hardware',
    name: `Blum CLIP top ${a} degree wide angle hinge`, unit: 'pcs', role: 'hinges', ...(art ? { articleNo: String(art) } : {}),
    match: { family: 'wide', angle: a },
  });
}
const inframe = json('reference/hardware/blum-inframe-hinge.json');
for (const c of inframe.candidates || []) {
  if (!c?.article) continue;
  add({
    id: `hinge.blum.inset.${slug(c.article)}`, department: 'hinges', brand: 'blum', kind: 'hardware',
    name: `Blum ${String(c.name || `inset hinge ${c.article}`)}`, unit: 'pcs', role: 'hinges', articleNo: String(c.article),
    match: { family: 'inframe', article: String(c.article) },
  });
}
add({
  id: 'hinge.blum.clip-top.60.bifold', department: 'hinges', brand: 'blum', kind: 'hardware',
  name: 'Blum CLIP top 60 degree bi-fold corner hinge', unit: 'pcs', role: 'bifold_hinges', match: {},
});
add({
  id: 'hinge.hawa.concepta-iii', department: 'hinges', brand: 'hawa', kind: 'hardware',
  name: 'Hawa Concepta III hinge (the set\'s own)', unit: 'pcs', role: 'hawa_hinges', match: {},
});
const plates = (P.hardware?.hinge?.cliptop?.plates || []).map((p) => p.id);
const plateFamily = new Map();
for (const it of cliptop.items || []) {
  if (!plates.includes(it.role) || !it.family) continue;
  const k = `${it.role}|${it.finish}`;
  if (!plateFamily.has(k)) plateFamily.set(k, { plate: it.role, finish: it.finish, family: it.family });
}
for (const p of [...plateFamily.values()].sort((a, b) => a.plate.localeCompare(b.plate) || a.finish.localeCompare(b.finish))) {
  add({
    id: `hinge-plate.blum.${slug(p.plate)}.${slug(p.finish)}`, department: 'hinges', brand: 'blum', kind: 'hardware',
    name: `Blum mounting plate ${p.plate === 'plate_knockin5' ? 'knock-in 5 mm' : 'screw-on 3 mm'}, ${p.finish}`,
    unit: 'pcs', role: 'hinge_plates', articleNo: p.family, match: { plate: p.plate, finish: p.finish },
  });
}

// --- RUNNERS ------------------------------------------------------------------
const M = P.hardware?.runner?.movento || {};
for (const nl of M.nominalLadder || []) {
  for (const v of (M.variants || []).map((x) => x.id)) {
    add({
      id: `runner.blum.movento-${slug(M.system)}.${nl}.${slug(v)}`, department: 'runners', brand: 'blum', kind: 'hardware',
      name: `Blum MOVENTO ${M.system} runner pair, NL ${nl}, ${v === 'T' ? 'TIP-ON BLUMOTION' : 'standard'}`,
      unit: 'pairs', role: 'runner_pairs', articleNo: `${M.system}${String(nl * 10).padStart(4, '0')}${v}`,
      match: { system: M.system, nl, variant: v },
    });
  }
}
for (const kind of ['adapters', 'narrow']) {
  add({
    id: `runner.blum.sync-rod.${kind}`, department: 'runners', brand: 'blum', kind: 'hardware',
    name: `Blum MOVENTO synchronisation rod${kind === 'adapters' ? ' with adapters' : ', narrow'}, cut to length`,
    unit: 'pcs', role: 'runner_sync_rods', match: { kind },
  });
}

// --- IRONMONGERY --------------------------------------------------------------
add({ id: 'leg.adjustable', department: 'ironmongery', kind: 'hardware', name: 'Adjustable plinth leg', unit: 'pcs', role: 'legs', match: {} });
add({ id: 'plinth.clip', department: 'ironmongery', kind: 'hardware', name: 'Plinth clip', unit: 'pcs', role: 'plinth_clips', match: {} });
add({ id: 'plinth.clip-connector', department: 'ironmongery', kind: 'hardware', name: 'Plinth clip connector', unit: 'pcs', role: 'plinth_clip_connectors', match: {} });
add({ id: 'hanger.wall-unit', department: 'ironmongery', kind: 'hardware', name: 'Wall unit hanger', unit: 'pcs', role: 'hangers', match: {} });
add({ id: 'hanger.vanity', department: 'ironmongery', kind: 'hardware', name: 'Vanity cabinet hanger', unit: 'pcs', role: 'vanity_hangers', match: {} });
for (const c of BAR_CENTRES || []) {
  add({ id: `handle.bar.${c}`, department: 'ironmongery', kind: 'hardware', name: `Bar handle, ${c} mm centres`, unit: 'pcs', role: 'handle', match: { type: 'bar', centres: c } });
}
add({ id: 'handle.knob', department: 'ironmongery', kind: 'hardware', name: 'Knob', unit: 'pcs', role: 'handle', match: { type: 'knob' } });
const cabineo = json('reference/hardware/cabineo/cabineo.json');
for (const v of Object.keys(cabineo.variants || {})) {
  for (const m of Object.keys(cabineo.mountings || {})) {
    add({
      id: `cabineo.${slug(v)}.${slug(m)}`, department: 'ironmongery', brand: 'lamello', kind: 'hardware',
      name: `Lamello Cabineo ${v}, ${m === 'flushCap' ? 'flush cover cap' : m} mounting`, unit: 'pcs', role: 'cabineo_connector',
      match: { variant: v, mounting: m },
    });
  }
}
for (const m of Object.keys(cabineo.mountings || {})) {
  add({
    id: `cabineo.cap.${slug(m)}`, department: 'ironmongery', brand: 'lamello', kind: 'hardware',
    name: `Lamello Cabineo cover cap, ${m === 'flushCap' ? 'flush cover cap' : m} mounting`, unit: 'pcs', role: 'cabineo_cap',
    match: { mounting: m },
  });
}
// engine/cabineo.js :1021 . an 8 M6 connector runs into a threaded insert, one a pocket (role cabineo_insert).
for (const [v, def] of Object.entries(cabineo.variants || {})) {
  if (!def?.insert) continue;
  add({
    id: `cabineo.insert.${slug(v)}`, department: 'ironmongery', brand: 'lamello', kind: 'hardware',
    name: `Lamello Cabineo ${v} threaded insert`, unit: 'pcs', role: 'cabineo_insert', match: { variant: v },
  });
}
add({ id: 'worktop.connector-bolt', department: 'ironmongery', kind: 'hardware', name: 'Worktop connector bolt', unit: 'pcs', role: 'worktop_bolts', match: {} });
// The Concepta III classes are the profile's (`profile.hawa.classes`, KIT_HAWA.lsp).
for (const cls of Object.keys(P.hawa?.classes || {}).map(Number).filter((c) => c > 0).sort((a, b) => a - b)) {
  for (const push of [true, false]) {
    for (const hand of ['left', 'right']) {
      add({
        id: `hawa.concepta-iii.${cls}.${push ? 'push' : 'pull'}.${hand}`, department: 'ironmongery', brand: 'hawa', kind: 'hardware',
        name: `Hawa Concepta III/${cls} set, ${push ? 'push' : 'pull'}, ${hand}`, unit: 'pcs', role: 'hawa_set',
        match: { class: cls, push, hand },
      });
    }
  }
}
for (const doors of [1, 2]) {
  add({
    id: `hawa.connector.${doors === 2 ? 110 : 55}`, department: 'ironmongery', brand: 'hawa', kind: 'hardware',
    name: `Hawa Connector ${doors === 2 ? 110 : 55}`, unit: 'pcs', role: 'hawa_connector', match: { doors },
  });
}
add({ id: 'hawa.tracks', department: 'ironmongery', brand: 'hawa', kind: 'hardware', name: 'Hawa top and bottom track, cut to length', unit: 'pairs', role: 'hawa_tracks', match: {} });
add({ id: 'hawa.steel-profile', department: 'ironmongery', brand: 'hawa', kind: 'hardware', name: 'Hawa steel stiffening profile, cut to length', unit: 'pcs', role: 'hawa_stiffener', match: {} });
add({ id: 'hawa.foot', department: 'ironmongery', brand: 'hawa', kind: 'hardware', name: 'Adjustable foot under a pocket', unit: 'pcs', role: 'hawa_foot', match: {} });
for (const h of P.autoParts?.cornice?.heights || P.cornice?.heights || []) {
  add({ id: `cornice.${h}`, department: 'ironmongery', kind: 'hardware', name: `Cornice moulding ${h} mm`, unit: 'm', role: 'cornice', match: { height_mm: h } });
}

// --- INTERNAL FITTINGS --------------------------------------------------------
add({ id: 'rail.tube', department: 'internal', kind: 'hardware', name: 'Hanging rail tube', unit: 'm', role: 'rail', match: {} });
add({ id: 'rail.support', department: 'internal', kind: 'hardware', name: 'Hanging rail support', unit: 'pcs', role: 'rail_supports', match: {} });
{
  const d = num(P.shelfHoles?.diameter);
  add({ id: `shelf-pin.${d}`, department: 'internal', kind: 'hardware', name: `Shelf pin, ${d} mm`, unit: 'pcs', role: 'shelf_pins', match: { diameter_mm: d } });
}
for (const [variant, name] of [['shoe', 'Shoe drawer insert'], ['belt_tie', 'Belt and tie divider insert'], ['cutlery', 'Cutlery insert']]) {
  add({ id: `insert.${slug(variant)}`, department: 'internal', kind: 'hardware', name, unit: 'pcs', role: 'drawer_insert', match: { variant } });
}
add({ id: 'insert.watch', department: 'internal', kind: 'hardware', name: 'Watch and tie drawer insert (assembly)', unit: 'pcs', role: 'watch_insert', match: {} });
add({ id: 'glass.drawer-top', department: 'internal', kind: 'hardware', name: 'Glass for a drawer top, made to measure', unit: 'pcs', role: 'drawer_glass', match: {} });
{
  const G = P.front?.glass || {};
  for (const k of G.kinds || []) {
    add({
      id: `glass.pane.${slug(k)}.${G.paneMm}`, department: 'internal', kind: 'hardware',
      name: `${G.labels?.[k] || k} glass ${G.paneMm} mm, made to measure`, unit: 'pcs', role: 'glass_pane',
      match: { kind: k, pane_mm: G.paneMm },
    });
  }
}
add({ id: 'glass.mirror.door', department: 'internal', kind: 'hardware', name: 'Door mirror, made to measure', unit: 'pcs', role: 'mirror', match: {} });
{
  const MI = P.mirror || {};
  add({ id: `glass.mirror.${MI.mirrorMm}`, department: 'internal', kind: 'hardware', name: `Mirror ${MI.mirrorMm} mm`, unit: 'm²', role: 'mirror_m2', match: { thickness_mm: MI.mirrorMm } });
  add({ id: `glass.shelf.${MI.glassShelfMm}.toughened`, department: 'internal', kind: 'hardware', name: `Glass shelf ${MI.glassShelfMm} mm toughened, made to measure`, unit: 'pcs', role: 'mirror_glass_shelf', match: { thickness_mm: MI.glassShelfMm } });
  add({ id: 'led.panel.made-to-measure', department: 'internal', kind: 'hardware', name: 'LED light panel, made to measure', unit: 'pcs', role: 'mirror_led_panel', match: {} });
}
for (const t of P.lighting?.temperatures || []) {
  add({ id: `led.strip.${t.k}`, department: 'internal', kind: 'hardware', name: `LED strip ${t.k} K`, unit: 'm', role: 'led_strip', match: { kelvin: t.k } });
}
add({ id: 'led.profile', department: 'internal', kind: 'hardware', name: 'LED aluminium profile', unit: 'm', role: 'led_profile', match: {} });
add({ id: 'led.driver', department: 'internal', kind: 'hardware', name: 'LED driver', unit: 'pcs', role: 'led_driver', match: {} });
for (const [sw, name] of [['door', 'Door switch'], ['sensor', 'Motion sensor'], ['touchless', 'Touchless switch']]) {
  add({ id: `led.switch.${sw}`, department: 'internal', kind: 'hardware', name: `LED ${name.toLowerCase()}`, unit: 'pcs', role: 'led_switch', match: { switch: sw } });
}
add({ id: 'led.spot', department: 'internal', kind: 'hardware', name: 'LED spotlight', unit: 'pcs', role: 'led_spots', match: {} });
for (const [role, id, name] of [
  ['wardrobe_kit_trouser', 'kit.trouser', 'Trouser pull-out'],
  ['wardrobe_kit_tie_rack', 'kit.tie-rack', 'Tie rack'],
  ['wardrobe_kit_pulldown_rail', 'kit.pulldown-rail', 'Pull-down rail'],
  ['wardrobe_kit_hooks', 'kit.hook', 'Wardrobe hook'],
  ['wardrobe_kit_valet_rod', 'kit.valet-rod', 'Valet rod'],
  ['carousel', 'kit.carousel', 'Corner carousel'],
  ['space_corner', 'kit.space-corner', 'Blum SPACE CORNER kit'],
  ['blind_pullout', 'kit.blind-pullout', 'Blind corner pull-out'],
  ['bin_pullout', 'kit.bin-pullout', 'Pull-out bin unit'],
  ['cargo_frame', 'kit.cargo-frame', 'Pull-out larder frame'],
  ['ready_boxes', 'drawer.ready-box', 'Ready-made drawer box'],
]) {
  add({ id, department: 'internal', kind: 'hardware', name, unit: 'pcs', role, match: {} });
}
{
  const A = json('reference/hardware/aventos.json').t78_f18 || {};
  const shared = A.shared || {};
  for (const [sys, S] of Object.entries(A.systems || {})) {
    const label = `AVENTOS ${sys.toUpperCase()} top`;
    for (const s of S.liftMechanismSets || []) {
      if (!s?.set) continue;
      add({
        id: `lift.blum.aventos-${sys}.set.${slug(s.set)}`, department: 'internal', brand: 'blum', kind: 'hardware',
        name: `Blum ${label} lift mechanism set ${s.set}`, unit: 'pcs', role: 'lift_unit', articleNo: String(s.set),
        match: { system: sys, article: String(s.set) },
      });
    }
    const arms = [...(S.leverArm?.set ? [S.leverArm] : []), ...(Array.isArray(S.leverArms) ? S.leverArms : [])];
    for (const a of arms) {
      if (!a?.set) continue;
      add({
        id: `lift.blum.aventos-${sys}.arm.${slug(a.set)}`, department: 'internal', brand: 'blum', kind: 'hardware',
        name: `Blum ${label} lever arm set ${a.set}`, unit: 'pcs', role: 'lift_arm', articleNo: String(a.set),
        match: { system: sys, article: String(a.set) },
      });
    }
    const caps = sys === 'hk' ? (S.coverCaps?.standard?.article ?? null) : (S.coverCaps?.standard ?? shared.coverCapsTop?.standard?.article ?? null);
    // One cover cap set an ARTICLE: HS, HL and HF share one (one product, one entry).
    if (caps && typeof caps === 'string') {
      add({
        id: `lift.blum.aventos.caps.${slug(caps)}`, department: 'internal', brand: 'blum', kind: 'hardware',
        name: `Blum AVENTOS cover cap set ${caps}`, unit: 'pcs', role: 'lift_caps', articleNo: caps,
        match: { article: caps },
      });
    }
    const hfSet = S.hinges?.upperFrontToTopPanel?.sets?.insertaEDowel?.article ?? null;
    if (sys === 'hf') {
      add({
        id: `lift.blum.aventos-hf.hinge-set${hfSet ? `.${slug(hfSet)}` : ''}`, department: 'hinges', brand: 'blum', kind: 'hardware',
        name: `Blum AVENTOS HF top hinge set${hfSet ? ` ${hfSet}` : ''}`, unit: 'pcs', role: 'lift_hinges', ...(hfSet ? { articleNo: String(hfSet) } : {}),
        match: { system: 'hf' },
      });
    }
  }
  const bracket = shared.frontFixingBrackets?.woodAndWideAlu?.article ?? null;
  if (bracket) {
    add({
      id: `lift.blum.aventos.bracket.${slug(bracket)}`, department: 'internal', brand: 'blum', kind: 'hardware',
      name: `Blum AVENTOS front fixing bracket set ${bracket}`, unit: 'pcs', role: 'lift_bracket', articleNo: String(bracket),
      match: { article: String(bracket) },
    });
  }
}

// --- CONSUMABLES ----------------------------------------------------------------
// Screws by the diameter of the pilot the engine drills (every `*screw*` hole,
// bomInvoice.js's own test), the puzzle connector, the dowel (profile.joints).
// The pilot diameters are the profile's: every `*screw*Diameter` it carries (the hinge cups', the puzzle's,
// the partitions', the biscuits', the drawer panel's, the rail bracket's, the front screws').
{
  const pilots = new Set();
  const walk = (o) => {
    for (const [k, v] of Object.entries(o || {})) {
      if (v && typeof v === 'object' && !Array.isArray(v)) walk(v);
      else if (/screw/i.test(k) && /diameter$/i.test(k) && num(v) > 0) pilots.add(num(v));
    }
  };
  walk(P);
  for (const d of [...pilots].sort((a, b) => a - b)) {
    add({ id: `screw.pilot-${d}`, department: 'consumables', kind: 'hardware', name: `Chipboard screw for a ${d} mm pilot`, unit: 'pcs', role: 'screws', match: { d } });
  }
}
add({ id: 'puzzle.connector', department: 'consumables', kind: 'hardware', name: 'Puzzle connector screw', unit: 'pcs', role: 'puzzle_screws', match: {} });
{
  const d = num(P.joints?.dowel?.diaMm);
  if (d > 0) add({ id: `dowel.${d}`, department: 'consumables', kind: 'hardware', name: `Dowel ${d} mm`, unit: 'pcs', role: 'dowels', match: { d } });
}

// --- PAINT ----------------------------------------------------------------------
add({ id: 'paint.bespoke', department: 'paint', kind: 'paint', name: 'Paint, bespoke colour', unit: 'L', role: 'paint' });
add({ id: 'paint.primer', department: 'paint', kind: 'paint', name: 'Primer or basecoat', unit: 'L', role: 'primer' });
add({ id: 'paint.solvent', department: 'paint', kind: 'paint', name: 'Solvent', unit: 'L', role: 'solvent' });
add({ id: 'stain.bespoke', department: 'paint', kind: 'paint', name: 'Stain, bespoke colour', unit: 'L', role: 'stain' });
add({ id: 'lacquer', department: 'paint', kind: 'paint', name: 'Lacquer', unit: 'L', role: 'lacquer' });

// --- WRITE: APPEND ONLY ---------------------------------------------------------
const literal = (v) => {
  if (v === null) return 'null';
  if (typeof v === 'string') return `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return `[${v.map(literal).join(', ')}]`;
  return `{ ${Object.entries(v).map(([k, x]) => `${/^[a-z_][a-z0-9_]*$/i.test(k) ? k : `'${k}'`}: ${literal(x)}`).join(', ')} }`.replace('{  }', '{}');
};
const lineOf = (e) => `  ${literal(e)},`;

const HEADER = `/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC2a F1 . THE CATALOGUE'S DATA, GENERATED BY scripts/t-cc2a-catalogue.mjs.
//
// APPEND ONLY (CLAUDE.md T-CC2a law 1): a line written here is never edited
// and never removed; an entry Cabinet Core stops offering gets \`retired: true\`
// and stays. Every id is a literal written once and never shown to the user.
// The owner, 01.11.2026, 12:50: *"CC powinien miec swoja (nie widoczna)
// numeracje materialow, a nazwa tylko sie wyswietla"*.
//
// One entry a line. Read through src/engine/catalogue.js, never directly.

export const CATALOGUE_DATA = Object.freeze([
`;
const FOOTER = ']);\n';

let text;
let added = 0;
if (existsSync(DATA)) {
  const old = readFileSync(DATA, 'utf8');
  const have = new Set([...old.matchAll(/^ {2}\{ id: '([^']+)'/gm)].map((m) => m[1]));
  const fresh = entries.filter((e) => !have.has(e.id));
  added = fresh.length;
  const at = old.lastIndexOf(FOOTER);
  if (at < 0) throw new Error('catalogueData.js has no closing line; it was edited by hand');
  text = fresh.length ? `${old.slice(0, at)}${fresh.map(lineOf).join('\n')}\n${FOOTER}` : old;
} else {
  added = entries.length;
  text = `${HEADER}${entries.map(lineOf).join('\n')}\n${FOOTER}`;
}

// --- THE LEDGER: every id with its meaning; a meaning never changes ------------
const meaningOf = (e) => Object.fromEntries(['department', 'brand', 'kind', 'decorId', 'thickness', 'role', 'articleNo']
  .filter((k) => e[k] != null).map((k) => [k, e[k]]));
const ledger = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : { schema: 1, issued: '2026-11-01', turn: 'T-CC2a', ids: {} };
for (const e of entries) {
  const was = ledger.ids[e.id];
  const now = meaningOf(e);
  if (was && JSON.stringify(was) !== JSON.stringify(now)) {
    throw new Error(`catalogue: the id "${e.id}" would change its meaning (${JSON.stringify(was)} to ${JSON.stringify(now)}); an id is never reused`);
  }
  if (!was) ledger.ids[e.id] = now;
}
const ledgerText = `${JSON.stringify(ledger, null, 1)}\n`;

const dataSame = existsSync(DATA) && readFileSync(DATA, 'utf8') === text;
const ledgerSame = existsSync(LEDGER) && readFileSync(LEDGER, 'utf8') === ledgerText;
if (CHECK) {
  console.log(`catalogue --check: ${entries.length} entries from the sources; data ${dataSame ? 'CLEAN' : 'WOULD CHANGE'}; ledger ${ledgerSame ? 'CLEAN' : 'WOULD CHANGE'}`);
  process.exit(dataSame && ledgerSame ? 0 : 1);
}
if (!dataSame) writeFileSync(DATA, text);
if (!ledgerSame) writeFileSync(LEDGER, ledgerText);
console.log(`catalogue: ${entries.length} entries from the sources, ${added} appended; ledger ${Object.keys(ledger.ids).length} ids`);
