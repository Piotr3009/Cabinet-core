/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F3 · THE QUICK CARDS (CLAUDE.md T84 PART B, F3): what a selected
// cabinet shows first, worked out as DATA. Pure: no React, no store, no DOM.
//
// CLAUDE.md T84 F3: *"`lib/studioCards.js`: the capability table of the
// contract, read from `engine/types.js` at run time, never typed"*. LAW 3, THE
// CARD NEVER LIES: *"A quick card shows only what the type supports
// (`type.supports.*`, `takesPlinth`, `liftTakesKit`, the corner's Arm A / Arm
// B); a field the type does not have is absent, never disabled as a promise.
// Every card row commits through the existing setter with the existing
// refusal (`roomFitRefusalFor` first), and surfaces the notice it returns."*
// The designer's contract (verify/t84/astra/Cabinet-Core-PRO-T84-Cards-and-
// Menu.html), adopted by the owner: *"Hide inapplicable rows; never invent a
// capability to fill the card."*
//
// So nothing here decides what a cabinet CAN do. Every gate asks the engine
// (types.js, autoparts.js `takesPlinth`, liftSystems.js `liftTakesKit`), every
// value is read the way the right panel reads it (RightPanel.jsx, the line
// beside each), and every row names the store action it calls: one of
// `CARD_ACTIONS`, each already in projectStore.js or uiStore.js, so the card
// adds no setter. components/studio/QuickSelectionCard.jsx renders the rows
// and hands each name to its store.
//
// It stands in components/studio/lib/ and not in src/lib/: CLAUDE.md asks the
// classifier for zero engine and lib deltas tonight (INT's DECISION 3,
// verify/t84/DECISIONS.md).

import {
  HEIGHT_GROUPS, UNIT_CATEGORIES, floatHeightOf, getUnitType, isFreePanel, isHawaPocket, isMirrorCabinet,
  isVanityKit,
} from '../../../engine/types.js';
import { resolveEntry } from '../../../engine/library.js';
import { takesPlinth } from '../../../engine/autoparts.js';
import {
  LIFT_LABELS, LIFT_MOTIONS, LIFT_SYSTEMS, liftTakesKit,
} from '../../../engine/liftSystems.js';
import {
  FRONT_STYLE_OPTIONS, frontStyleSelection, migrateDesign, projectHeights, projectPalette, resolveUnitDesign,
  unitFinishOverride,
} from '../../../engine/design.js';
import { freePanelOf } from '../../../engine/freePanel.js';
import { pocketChoiceOf } from '../../../engine/hawaPocket.js';
import { pocketNeighbours } from '../../../engine/runs.js';
import { bayWidthsOf } from '../../../engine/partitionPositions.js';
import { drawerRows } from '../../../engine/items.js';
import { unitName } from '../../../engine/naming.js';
import { formatMm } from '../../../engine/format.js';

// ─── THE STORE'S OWN NAMES ──────────────────────────────────────────────────

/**
 * The store actions a card row may call, by store. Each is the store's own,
 * with its own clamp, refusal and Undo step (LAW 1: the same function, the
 * same name; the Studio adds a second road to it and closes no first one).
 * uiStore's `showFullSettings` and `hideInspector` are the Studio inspector's
 * (verify/t84/agents/CONTRACT.md, section 4). test/turn84-f03-cards.test.js
 * reads every one of them out of its store's source.
 */
export const CARD_STORE_ACTIONS = Object.freeze({
  projectStore: Object.freeze([
    'roomFitRefusalFor', 'updateUnitParams', 'resetUnitHeight', 'addPlinth', 'removePlinth',
    'setVanityDrawers', 'setMirrorCabinet', 'setPocket', 'setPocketCovers',
  ]),
  uiStore: Object.freeze([
    'openModal', 'openRightPanel', 'setPanelSection', 'showFullSettings', 'hideInspector', 'notify',
  ]),
});

/** Every name a row may carry, as one list. */
export const CARD_ACTIONS = Object.freeze([...CARD_STORE_ACTIONS.projectStore, ...CARD_STORE_ACTIONS.uiStore]);

/**
 * A summary row's road to the full panel, in this order: the panel's own
 * opener (the legacy face's), the section it opens (CLAUDE.md F3: *"`2 doors ·
 * L / R` to `openRightPanel(); setPanelSection('doors', true)`"*), and the
 * Studio inspector brought to the full panel (CONTRACT section 4).
 */
export const SUMMARY_CALLS = Object.freeze(['openRightPanel', 'setPanelSection', 'showFullSettings']);

// ─── THE SEVEN TYPED CARDS, AND THE GENERIC ONE ────────────────────────────

/** The card kinds, the seven of CLAUDE.md T84 F3 and the generic card. */
export const CARD_KINDS = Object.freeze(['base', 'wall', 'wardrobe', 'vanity', 'mirror', 'hawa', 'panel', 'generic']);

// Which kits take the Base, the Wall and the Wardrobe card. CLAUDE.md T84 F3
// draws Base for *"BUD hides Drawers, BUDR hides Doors, BUD_INT shows both"*
// (the designer's contract: BUD, BUDR / BUDR2 / BUDR4, BUD_INT; the hob's two
// drawer units are KIT_BUDR_FULL's own split, the library's "Base units ·
// Hob drawer unit"); Wall for the hung door kits a lift may open, the three
// engine/liftSystems.js names (WUD, WUD_GLASS, WARDROBE_WALL); Wardrobe for
// WARDROBE. Every other type, *"corners L, blind, carousel, hoods, appliances,
// sink, pantry, tall, low, desk, chests, wine, bin, cargo, twin..."*, takes the
// generic card. The vanity, the mirror cabinet, the HAWA pocket and the free
// panel are asked through the engine's own predicates.
const BASE_KITS = new Set(['BUD', 'BUDR', 'BUDR2', 'BUDR4', 'BUDR_HOB', 'BUDR2_HOB', 'BUD_INT']);
const WALL_KITS = new Set(['WUD', 'WUD_GLASS', 'WARDROBE_WALL']);
const WARDROBE_KITS = new Set(['WARDROBE']);

/** Which card a type takes. A stored old name is read as the kit it became (`getUnitType`). */
export function cardKindOf(typeId) {
  const id = getUnitType(typeId).id;
  if (isVanityKit(id)) return 'vanity';
  if (isMirrorCabinet(id)) return 'mirror';
  if (isHawaPocket(id)) return 'hawa';
  if (isFreePanel(id)) return 'panel';
  if (BASE_KITS.has(id)) return 'base';
  if (WALL_KITS.has(id)) return 'wall';
  if (WARDROBE_KITS.has(id)) return 'wardrobe';
  return 'generic';
}

// ─── THE CAPABILITY TABLE ───────────────────────────────────────────────────

/**
 * The special builders a kit's rows go through (CLAUDE.md T84 F3: *"VANITY*:
 * `setVanityDrawers`, `updateUnitParams({ sinks })`, `setVanityFloating`;
 * MIRROR_CABINET: `setMirrorCabinet` ...; HAWA_POCKET: `setPocket`,
 * `setPocketCovers`, the size derived; FREE_PANEL: `freePanelOf` /
 * `freePanelPatch`"*): the store's actions, and the engine's readers.
 */
function buildersOf(id) {
  if (isVanityKit(id)) return { store: ['setVanityDrawers', 'updateUnitParams', 'setVanityFloating'], engine: ['floatHeightOf'] };
  if (isMirrorCabinet(id)) return { store: ['setMirrorCabinet', 'updateUnitParams'], engine: [] };
  if (isHawaPocket(id)) return { store: ['setPocket', 'setPocketCovers', 'pocketFiguresFor'], engine: ['pocketChoiceOf', 'pocketNeighbours'] };
  if (isFreePanel(id)) return { store: ['updateUnitParams'], engine: ['freePanelOf', 'freePanelPatch'] };
  return { store: ['updateUnitParams'], engine: [] };
}

/**
 * THE CAPABILITY TABLE of one type, read from the engine at run time (the
 * designer's per-type table; verify/t84/p1-registry.md rows 14 to 21): what
 * the type supports, how it stands, whether it is an L, whether it takes a
 * plinth (RightPanel.jsx:1386, the engine's one gate and `mount === 'floor'`)
 * and a lift (RightPanel.jsx:621), and its special builders.
 */
export function capabilitiesOf(typeId, profile) {
  const type = getUnitType(typeId);
  return {
    typeId: type.id,
    card: cardKindOf(type.id),
    doors: Boolean(type.supports?.doors),
    drawers: Boolean(type.supports?.drawers),
    mount: type.mount,
    corner: Boolean(type.corner),
    plinth: Boolean(profile) && takesPlinth(type.id, profile) && type.mount === 'floor',
    lift: liftTakesKit(type),
    heightGroup: type.heightGroup ?? null,
    builders: buildersOf(type.id),
  };
}

// ─── THE CARD'S TITLE: THE LIBRARY ROW ──────────────────────────────────────

function findRow(entries, id, groups) {
  for (const e of entries || []) {
    if (e.kind === 'group') {
      const hit = findRow(e.items, id, [...groups, e.label]);
      if (hit) return hit;
    } else if (e.kind === 'type' && e.typeId === id) {
      return { entry: e, groups };
    }
  }
  return null;
}

/**
 * The type's LIBRARY ROW (CLAUDE.md T84 F3: *"The card's title is the type's
 * library row name and the unit number"*): the first row that inserts this
 * type, the project's own category first (the Library opens there,
 * LibraryPanel.jsx:51), its name worked out the way the Library prints it
 * (LibraryPanel.jsx:365: the variant's, the row's, the kit's own) and the
 * groups it stands in, outermost first. Null for a type no row inserts.
 */
export function libraryRowOf(typeId, { profile = null, category = null } = {}) {
  const type = getUnitType(typeId);
  const lists = UNIT_CATEGORIES.filter((c) => Array.isArray(c.entries));
  const order = [...lists.filter((c) => c.id === category), ...lists.filter((c) => c.id !== category)];
  for (const c of order) {
    const hit = findRow(c.entries, type.id, []);
    if (!hit) continue;
    const said = resolveEntry(hit.entry, profile);
    return {
      category: c.id,
      groups: hit.groups,
      name: said.label || hit.entry.label || type.label || hit.entry.id,
    };
  }
  return null;
}

/**
 * The card's title: the library row's name, after the group it is picked
 * from where it stands in one, as the Library's own flyout shows it (its
 * title over its rows): "Base units · Standard", "Drawer unit · 3×",
 * "Wardrobe". A type no row inserts reads as the kit's own name.
 */
export function cardTitleOf(typeId, opts = {}) {
  const row = libraryRowOf(typeId, opts);
  if (!row) return getUnitType(typeId).label;
  const group = row.groups[row.groups.length - 1];
  return group ? `${group} · ${row.name}` : row.name;
}

// ─── WHAT THE ROWS READ ─────────────────────────────────────────────────────

/**
 * The Doors row's summary, CLAUDE.md T84 F3's form *"2 doors · L / R"*: the
 * leaves the engine fitted (`derived.doors`, the panel's badge, RightPanel.jsx
 * 1606) and each hinged leaf's hand in the engine's order (`meta.hinge`, the
 * panel's per-leaf rows, 646), one hand a leaf: a split leaf's two segments
 * (`meta.splitOf`, T36 F6) are one door. No doors yet reads as the panel's own
 * badge, 'none yet'.
 */
export function doorsSummary(unit, result) {
  const fitted = Boolean(unit?.params?.doors) && unit.params.doors !== false;
  if (!fitted) return 'none yet';
  const n = Number(result?.derived?.doors) || 0;
  const leaves = new Map();
  for (const p of result?.panels || []) {
    if (p.part !== 'FRONT' || p.role !== 'front' || !p.meta?.hinge) continue;
    const leaf = p.meta.splitOf || p.id;
    if (!leaves.has(leaf)) leaves.set(leaf, p.meta.hinge);
  }
  const hands = [...leaves.values()];
  return `${n} door${n === 1 ? '' : 's'}${hands.length ? ` · ${hands.join(' / ')}` : ''}`;
}

/** The Drawers row's summary: the panel's own count (RightPanel.jsx:922, `drawerRows`). */
export function drawersSummary(unit) {
  const n = drawerRows(unit?.params?.sections?.[0]?.items || []).length;
  return n ? `${n} × drawer` : 'none yet';
}

/**
 * The Finish row's summary: what the unit wears where it wears its own (the
 * project palette's names, `projectPalette`, the window it opens shows the
 * same), else the window's own word for following the project
 * (UnitFinishModal.jsx:139, 'project').
 */
export function finishSummary(unit, { design = null, profile = null } = {}) {
  const own = unitFinishOverride(unit);
  if (!own) return 'project';
  const palette = projectPalette(design, profile);
  const nameOf = (kind, id) => (id ? (palette.find((p) => p.kind === kind && p.id === id)?.label || id) : null);
  return [nameOf('carcass', own.carcass_type_id), nameOf('front', own.front_type_id)].filter(Boolean).join(' · ');
}

/**
 * The patch the Front type select writes, the right panel's own
 * (RightPanel.jsx:525-530): `frontStyleSelection` keeps the decoration that
 * belongs to the chosen shape, and `front_type` is never written alone.
 */
export function frontTypePatch(value, resolved) {
  const selected = value ? frontStyleSelection(value, {
    style: resolved?.frontType, decoration: resolved?.frontDecoration,
  }) : null;
  return { front_type: value || null, front_decoration: selected?.decoration || null };
}

/** The patch the Front opening select writes (RightPanel.jsx:629): a lift, or hinged (null). */
export function frontSystemPatch(value) {
  return { front_system: LIFT_SYSTEMS.includes(value) ? value : null };
}

/**
 * Who the HAWA pocket's door covers, per side, and the next unit it could
 * take or the last it could give back: RightPanel.jsx's PocketDoorSection
 * (1925-1938, 1984-2013) line for line, the contiguous chain of
 * `pocketNeighbours`. Each step carries the whole list `setPocketCovers`
 * takes (`coversWith`, both sides), so the store hears what it hears today.
 */
export function pocketCoversOf(unit, { profile = null, units = [], runElements = null } = {}) {
  const choice = pocketChoiceOf(unit?.params, profile);
  const element = runElements?.[unit?.id]?.pocket?.role === 'pocket' ? runElements[unit.id].pocket : null;
  const chains = pocketNeighbours(units || [], unit, profile);
  const sides = choice.doors === 2 ? ['L', 'R'] : [choice.hand];
  const covered = { L: element?.sides?.L || [], R: element?.sides?.R || [] };
  const numOf = (id) => (units || []).find((u) => u.id === id)?.params?.unit_num || id;
  const coversWith = (side, list) => [...(side === 'L' ? list : covered.L), ...(side === 'R' ? list : covered.R)];
  return sides.map((side) => {
    const list = covered[side] || [];
    const next = chains[side]?.[list.length] || null;
    return {
      side,
      text: `${choice.doors === 2 ? `${side === 'L' ? 'Left' : 'Right'}: ` : ''}${list.length ? list.map(numOf).join(', ') : 'nothing beside it'}`,
      add: next ? { label: `+ ${numOf(next.id)}`, title: `Cover ${numOf(next.id)} too`, args: [coversWith(side, [...list, next.id])] } : null,
      remove: list.length > 1
        ? { label: '×', title: `Leave ${numOf(list[list.length - 1])} out`, args: [coversWith(side, list.slice(0, -1))] }
        : null,
    };
  });
}

/**
 * Is a committed number the one already shown? A field committed as it
 * stands (focus, then blur or Enter with nothing typed) is no edit: the
 * store's own rule (projectStore.js `updateUnitParams`, chat fix 13.10.2026:
 * *"the same value again is not an edit"*), asked BEFORE the room so an
 * unchanged field is never refused. Compared as the field shows it.
 */
export function isSameValue(next, current) {
  if (next == null || current == null || next === '' || current === '') return false;
  const a = Number(next);
  const b = Number(current);
  return Number.isFinite(a) && Number.isFinite(b) && formatMm(a) === formatMm(b);
}

/**
 * A setter's answer in one shape, `{ ok, reason, notices, info }`, read the
 * way each of the store's actions answers (its own words, never a Studio
 * paraphrase: F5's refused field shows `reason` at the field):
 *   roomFitRefusalFor  a refusal `{ message }` or null (projectStore.js:6427)
 *   updateUnitParams, resetUnitHeight  `{ notices }`, what was clamped (7384, 7812)
 *   setVanityDrawers, setVanityFloating, setMirrorCabinet  `{ ok, said }` (10353, 4194, 10439)
 *   setPocket, setPocketCovers  `{ ok, error }` (7204, 7278)
 *   addPlinth  false where the type takes none, with no words (4081)
 */
export function readAnswer(action, res) {
  const fine = { ok: true, reason: '', notices: [], info: '' };
  switch (action) {
    case 'roomFitRefusalFor':
      return res ? { ...fine, ok: false, reason: String(res.message || '') } : fine;
    case 'updateUnitParams':
    case 'resetUnitHeight':
      return { ...fine, notices: Array.isArray(res?.notices) ? res.notices.filter(Boolean).map(String) : [] };
    case 'setVanityDrawers':
    case 'setVanityFloating':
    case 'setMirrorCabinet':
      return res?.ok === false ? { ...fine, ok: false, reason: String(res.said || '') } : { ...fine, info: String(res?.said || '') };
    case 'setPocket':
    case 'setPocketCovers':
      return res?.ok === false ? { ...fine, ok: false, reason: String(res.error || '') } : fine;
    case 'addPlinth':
      return res === false ? { ...fine, ok: false } : fine;
    default:
      return fine;
  }
}

/**
 * One of the card's store actions, called by its own name on one unit, its
 * answer read (`readAnswer`). `actions` is the project store's state
 * (`useProjectStore.getState()`): the function called is the store's own.
 * A name outside `CARD_STORE_ACTIONS.projectStore` is never called (the card
 * adds no setter) and answers not ok.
 */
export function callAction(actions, action, unitId, args = []) {
  const fn = actions?.[action];
  if (!CARD_STORE_ACTIONS.projectStore.includes(action) || typeof fn !== 'function') {
    return {
      ok: false, reason: '', notices: [], info: '',
    };
  }
  return readAnswer(action, fn(unitId, ...(args || [])));
}

/**
 * A number row's commit (CLAUDE.md T84 F3: *"every dimension row ...
 * committing `roomFitRefusalFor(unit.id, { key: v })` then
 * `updateUnitParams`, the notice surfaced"*): nothing when the number is the
 * one shown (`isSameValue`); the row's refusal asked first where it has one,
 * and a refusal stops there, so nothing is written and nothing enters the
 * history; else the row's own setter. The answer, in `readAnswer`'s shape,
 * for the field (F5's RefusedField shows `reason`) and for `notify`.
 */
export function commitRow(row, value, { actions, unitId } = {}) {
  if (isSameValue(value, row?.value)) {
    return {
      ok: true, reason: '', notices: [], info: '',
    };
  }
  const args = row.args(value);
  if (row.refusal) {
    const no = callAction(actions, row.refusal, unitId, args);
    if (!no.ok) return no;
  }
  return callAction(actions, row.action, unitId, args);
}

// ─── THE ROWS ───────────────────────────────────────────────────────────────
//
// A row: `{ key, label, kind, action, calls, ... }`. `key` is the row's DOM
// hook (`data-row`), `action` the store action it writes through (null on a
// read-only row) and `calls` every store name it calls, in order. Kinds:
//   number   a NumberField: `value`, `unit`, `min`, `max`, `args(v)` the
//            setter's arguments after the unit id; `refusal` names the
//            question asked first with the same arguments (the room's).
//   chips    `options: [{ key, label, on, args, title }]`, one setter.
//   select   `options: [{ value, label }]`, `value`, `args(value)`.
//   summary  `text` and the panel section it opens (`section`).
//   modal    `text`, the window it opens (`modal`, `modalArgs`).
//   plinth   `text` and its one button (`button: { label, action }`), or none.
//   covers   the HAWA pocket's sides (`pocketCoversOf`).
//   readonly `text`, nothing to do.

const numberRow = (key, label, value, action, args, extra = {}) => ({
  key, label, kind: 'number', unit: 'mm', value, action, calls: [action], args, ...extra,
});

/**
 * Width, Height, Depth, or an L's Arm A, Height, Arm B (RightPanel.jsx:343-345,
 * *"the fields and the setter are the same, the words are the L's"*): the room
 * is asked first and refuses in its own sentence, then `updateUnitParams`
 * moves the far edge and says what stopped it (RightPanel.jsx:367-381).
 */
function sizeRows({ unit, type }, height) {
  const words = type.corner
    ? [['width', 'Arm A'], ['height', 'Height'], ['depth', 'Arm B']]
    : [['width', 'Width'], ['height', 'Height'], ['depth', 'Depth']];
  return words.map(([key, label]) => ({
    ...numberRow(key, label, unit.params?.[key], 'updateUnitParams', (v) => [{ [key]: v }]),
    refusal: 'roomFitRefusalFor',
    calls: ['roomFitRefusalFor', 'updateUnitParams'],
    // RightPanel.jsx:352-356: a height typed here is the unit's own, and says so.
    ...(key === 'height' && height?.custom
      ? { mark: { text: 'custom', title: `The project builds these at ${formatMm(height.projectHeight)} mm` } }
      : {}),
  }));
}

/** Mount height (RightPanel.jsx:711-720): a hung kit's carcass base above the floor. */
const mountRow = ({ unit, profile }, key = 'mount-height', label = 'Mount height') => numberRow(
  key, label, unit.params?.mount_height ?? profile?.wallUnit?.defaults?.mountHeight,
  'updateUnitParams', (v) => [{ mount_height: v }],
);

const summaryRow = (key, label, text, section) => ({
  key, label, kind: 'summary', text, section, action: 'setPanelSection', calls: [...SUMMARY_CALLS],
});

const doorsRow = ({ unit, result }) => summaryRow('doors', 'Doors', doorsSummary(unit, result), 'doors');

// The contents section, titled "Section 1" on main (RightPanel.jsx:910; p1-registry.md row 25).
const drawersRow = ({ unit }) => summaryRow('drawers', 'Drawers', drawersSummary(unit), 'contents');

/** Plinth (RightPanel.jsx:1376-1408): its height when fitted, and the one button, Add plinth or Remove. */
function plinthRow({ unit, result, profile }) {
  const float = floatHeightOf(unit.type, unit.params, profile);
  const on = Boolean(unit.params?.plinth);
  // eslint-disable-next-line no-nested-ternary
  const text = float != null
    ? `floating at ${formatMm(float)} mm: it hangs on its hangers and takes none`
    : (on ? formatMm(result?.assemblies?.carcass?.legHeight, { unit: true }) : 'not fitted');
  // eslint-disable-next-line no-nested-ternary
  const button = float != null ? null : (on
    ? { label: 'Remove', action: 'removePlinth' }
    : { label: 'Add plinth', action: 'addPlinth' });
  return {
    key: 'plinth', label: 'Plinth', kind: 'plinth', text, button, action: button?.action || null, calls: button ? [button.action] : [],
  };
}

/** Front type (RightPanel.jsx:510-540), "Project default" naming the style the project resolves to. */
function frontTypeRow({ unit, design, profile }) {
  const resolved = resolveUnitDesign(unit, design);
  const projectStyle = design.fronts?.style;
  return {
    key: 'front-type',
    label: 'Front type',
    kind: 'select',
    value: unit.params?.front_type || '',
    options: [
      { value: '', label: `Project default (${profile?.front?.types?.[projectStyle]?.label || projectStyle})` },
      ...FRONT_STYLE_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
      ...(unit.params?.front_type === 'H' ? [{ value: 'H', label: 'Legacy handleless' }] : []),
    ],
    action: 'updateUnitParams',
    calls: ['updateUnitParams'],
    args: (value) => [frontTypePatch(value, resolved)],
  };
}

/** Finish: the cabinet's own colour window, as the panel's Colour... opens it (RightPanel.jsx:495). */
const finishRow = ({ unit, design, profile }) => ({
  key: 'finish',
  label: 'Finish',
  kind: 'modal',
  text: finishSummary(unit, { design, profile }),
  modal: 'unit-finish',
  modalArgs: { unitIds: [unit.id] },
  action: 'openModal',
  calls: ['openModal'],
});

/** Front opening (RightPanel.jsx:621-640): hinged, or one of the four lifts, in the engine's words. */
const frontOpeningRow = ({ unit }) => ({
  key: 'front-opening',
  label: 'Front opening',
  kind: 'select',
  value: LIFT_SYSTEMS.includes(unit.params?.front_system) ? unit.params.front_system : 'hinged',
  options: [
    { value: 'hinged', label: 'Hinged' },
    ...LIFT_SYSTEMS.map((id) => ({ value: id, label: `${LIFT_LABELS[id]} (${LIFT_MOTIONS[id]})` })),
  ],
  action: 'updateUnitParams',
  calls: ['updateUnitParams'],
  args: (value) => [frontSystemPatch(value)],
});

/** Bays of a wardrobe: read-only, the engine's own bays (`bayWidthsOf`, RightPanel.jsx:205-212), to the contents section. */
function baysRow({ unit, result, profile }) {
  const boardT = Number(unit.params?.board_t) || profile?.board?.thickness;
  const bays = result ? bayWidthsOf(result, boardT) : [];
  const n = bays.length;
  const text = n ? `${n} bay${n > 1 ? 's' : ''} · ${bays.map((b) => formatMm(b.size)).join(' · ')}` : '';
  return summaryRow('bays', 'Bays', text, 'contents');
}

/** chips: one setter, each option its own arguments; an option pressed already does nothing. */
const chipsRow = (key, label, action, options) => ({
  key, label, kind: 'chips', action, calls: [action], options,
});

// ─── THE CARDS ──────────────────────────────────────────────────────────────

const ROWS = {
  // CLAUDE.md F3: *"Base: Width · Height · Depth · Doors ... · Drawers ... · Plinth (Add / Remove, the height derived)"*.
  base: (ctx) => [
    ...sizeRows(ctx, ctx.height),
    ctx.caps.doors ? doorsRow(ctx) : null,
    ctx.caps.drawers ? drawersRow(ctx) : null,
    ctx.caps.plinth ? plinthRow(ctx) : null,
  ],
  // *"Wall: Width · Height · Depth · Mount height · Doors · Front opening (only `liftTakesKit && derived.doors > 0`)"*.
  wall: (ctx) => [
    ...sizeRows(ctx, ctx.height),
    ctx.type.mount === 'wall' ? mountRow(ctx) : null,
    ctx.caps.doors ? doorsRow(ctx) : null,
    ctx.caps.lift && Number(ctx.derived?.doors) > 0 ? frontOpeningRow(ctx) : null,
  ],
  // *"Wardrobe: Width · Height · Depth · Front type · Finish · Bays (`bayWidthsOf`, read-only, to the contents section)"*.
  wardrobe: (ctx) => [
    ...sizeRows(ctx, ctx.height),
    frontTypeRow(ctx),
    finishRow(ctx),
    baysRow(ctx),
  ],
  // *"Vanity: Width · Height · Depth · Drawers (2 / 3 / 4) · Sinks (0 / 1 / 2) · Mounting"*.
  vanity: (ctx) => {
    const { unit, type, profile } = ctx;
    // RightPanel.jsx:182-184: the vanity's count IS its kit, the variant's own number.
    const count = (profile?.baseDrawerUnit?.variants || []).find((v) => v.id === type.drawerVariant)?.count ?? null;
    const sinks = Number(unit.params?.sinks ?? 0);
    const float = floatHeightOf(unit.type, unit.params, profile);
    return [
      ...sizeRows(ctx, ctx.height),
      // RightPanel.jsx:791-809, the chips' own titles.
      chipsRow('drawers', 'Drawers', 'setVanityDrawers', [2, 3, 4].map((n) => ({
        key: String(n),
        label: String(n),
        on: count === n,
        args: [n],
        title: `${n} equal drawers: the vanity unit of ${n} (its size, its basins and how it stands are kept)`,
      }))),
      // RightPanel.jsx:811-829.
      chipsRow('sinks', 'Sinks', 'updateUnitParams', [0, 1, 2].map((n) => ({
        key: String(n),
        label: String(n),
        on: sinks === n,
        args: [{ sinks: n }],
        title: n === 0 ? 'No basin' : `${n} basin${n > 1 ? 's' : ''}, to the eye: the trap's U follows the waste`,
      }))),
      // The Floor / Floating choice and its height live in the VANITY section
      // (RightPanel.jsx:784-873; p1-registry.md row 34), in its own words.
      summaryRow('mounting', 'Mounting', float != null ? `Floating · ${formatMm(float, { unit: true })}` : 'Floor', 'vanity'),
    ];
  },
  // *"Mirror cabinet: Width · Height · Depth · Mount height · Bays (1 / 2 / 3) · Recess"*.
  mirror: (ctx) => {
    const mirror = ctx.derived?.mirror || null;
    const recess = mirror?.recess?.mm ?? 0;
    return [
      ...sizeRows(ctx, ctx.height),
      ctx.type.mount === 'wall' ? mountRow(ctx) : null,
      // RightPanel.jsx:2888-2903: the same three chips, the same answer, the app's own title.
      chipsRow('bays', 'Bays', 'setMirrorCabinet', [1, 2, 3].map((n) => ({
        key: String(n),
        label: String(n),
        on: mirror?.bays === n,
        args: [{ bays: n }],
        title: `${n} door${n > 1 ? 's' : ''}: the doors take the kit's own widths again`,
      }))),
      // RightPanel.jsx:3062-3077: 0 hangs it on the wall; an unchanged number is no answer.
      numberRow('recess', 'Recess', recess, 'setMirrorCabinet', (v) => [{ recess_mm: v }]),
    ];
  },
  // *"HAWA pocket: Doors (1 / 2) · Hand · Opening · Covered cabinets · Hardware class · Calculated size (read-only)"*.
  hawa: (ctx) => {
    const { unit, profile } = ctx;
    const choice = pocketChoiceOf(unit.params, profile);
    // RightPanel.jsx:1933: the class Auto takes, as the engine cut it.
    const autoCls = (ctx.figures?.doors || []).find((d) => d.cls)?.cls ?? null;
    return [
      chipsRow('pocket-doors', 'Doors', 'setPocket', [1, 2].map((n) => ({
        key: String(n), label: String(n), on: choice.doors === n, args: [{ doors: n }],
      }))),
      // One door only: the side of the pocket the door covers (RightPanel.jsx:1951).
      choice.doors === 1 ? chipsRow('hand', 'Hand', 'setPocket', ['L', 'R'].map((h) => ({
        key: h, label: h, on: choice.hand === h, args: [{ hand: h }],
      }))) : null,
      chipsRow('opening', 'Opening', 'setPocket', [['push', 'Push', true], ['pull', 'Pull', false]].map(([key, label, push]) => ({
        key, label, on: choice.push === push, args: [{ push }],
      }))),
      {
        key: 'covers',
        label: 'Covered cabinets',
        kind: 'covers',
        sides: pocketCoversOf(unit, { profile, units: ctx.units, runElements: ctx.runElements }),
        action: 'setPocketCovers',
        calls: ['setPocketCovers'],
      },
      chipsRow('hardware-class', 'Hardware class', 'setPocket', [
        {
          key: 'auto', label: autoCls ? `Auto (III/${autoCls})` : 'Auto', on: choice.cls == null, args: [{ cls: null }],
        },
        ...[25, 35].map((c) => ({
          key: String(c), label: `III/${c}`, on: choice.cls === c, args: [{ cls: c }],
        })),
      ]),
      // Worked out, never typed (RightPanel.jsx:358-366): the pocket and the cabinet its door covers.
      {
        key: 'size',
        label: 'Calculated size',
        kind: 'readonly',
        text: `${formatMm(unit.params?.width)} × ${formatMm(unit.params?.height)} × ${formatMm(unit.params?.depth)} mm`,
        action: null,
        calls: [],
      },
    ];
  },
  // *"Free panel: Length · Width · Thickness · Facing · Tilt · Height above floor"*: the BOARD's own
  // sizes (`freePanelOf`), never its rotated box; each through `updateUnitParams`, which reads them
  // as the board through `freePanelPatch` (projectStore.js:7399), as the part window does
  // (ElementProperties.jsx:1121-1232).
  panel: (ctx) => {
    const { unit, profile } = ctx;
    const board = freePanelOf(unit.params, profile);
    const facing = unit.params?.panel_facing === 'across' ? 'across' : 'along';
    const tilt = Number(unit.params?.panel_tilt_deg) || 0;
    return [
      numberRow('length', 'Length', board.length, 'updateUnitParams', (v) => [{ panel_length: v }], { min: 1 }),
      numberRow('width', 'Width', board.width, 'updateUnitParams', (v) => [{ panel_width: v }], { min: 1 }),
      numberRow('thickness', 'Thickness', board.thickness, 'updateUnitParams', (v) => [{ board_t: v }], { min: 1 }),
      chipsRow('facing', 'Facing', 'updateUnitParams', [['along', 'Along', 'Along the wall'], ['across', 'Across', 'Across the wall']]
        .map(([key, label, aria]) => ({
          key, label, aria, on: facing === key, args: [{ panel_facing: key }],
        }))),
      numberRow('tilt', 'Tilt', tilt, 'updateUnitParams', (v) => [{ panel_tilt_deg: v }], { unit: '°', min: 0, max: 90 }),
      mountRow(ctx, 'height-above-floor', 'Height above floor'),
    ];
  },
  // *"THE GENERIC CARD for every other type ...: Width · Height · Depth (Arm A · Height · Arm B for a
  // corner type) · Front type (where `supports.doors` or `supports.drawers`) · Finish · Plinth (where
  // `takesPlinth` and `mount === 'floor'`); a row without a setter is absent."*
  generic: (ctx) => [
    ...sizeRows(ctx, ctx.height),
    ctx.caps.doors || ctx.caps.drawers ? frontTypeRow(ctx) : null,
    finishRow(ctx),
    ctx.caps.plinth ? plinthRow(ctx) : null,
  ],
};

// The type's note under the rows, where it has one: the HAWA pocket's in the
// panel's own words (RightPanel.jsx:362); the wardrobe's and the free panel's
// the designer's (Stage-1); the mirror cabinet's is its bays warning,
// CLAUDE.md T84 F3 verbatim.
const NOTES = {
  wardrobe: 'Bays are a summary. Edit dividers in the full settings.',
  hawa: 'Worked out by the pocket and the cabinet its door covers',
  panel: 'These are board dimensions, not the rotated bounding box.',
};

/** CLAUDE.md T84 F3: *"the bays warning "Changing bays resets door widths to the kit defaults" kept"*. */
export const MIRROR_BAYS_WARNING = 'Changing bays resets door widths to the kit defaults';

/**
 * Where the unit's height comes from (RightPanel.jsx:213-216, 397-412): the
 * project height its group follows, and whether it was typed here.
 */
function heightStatusOf(unit, type, design, profile) {
  const group = type.heightGroup ?? null;
  if (!group || !profile) return null;
  const label = HEIGHT_GROUPS.find((g) => g.id === group)?.label || 'height';
  return {
    group, label, projectHeight: projectHeights(design, profile)[group], custom: Boolean(unit.params?.height_custom),
  };
}

/**
 * THE QUICK CARD of one unit (CLAUDE.md T84 F3). `result` is the unit's
 * computed result (`unitResult(id)`); `derived` defaults to its `derived`;
 * `design` the stored project design; `units` and `runElements` the store's
 * (the HAWA pocket's neighbours); `figures` the pocket's own
 * (`pocketFiguresFor`, else `result.hawa`); `category` the project's library
 * category (the title's library row is looked up there first).
 *
 * @returns {null|{kind, typeId, unitId, unitNum, title, thumb, scope, section,
 *   rows, inherit, note, warning, openCabinet}}
 */
export function cardFor(unit, {
  profile = null, result = null, derived = null, design = null, units = null, runElements = null,
  figures = null, category = null,
} = {}) {
  if (!unit) return null;
  const type = getUnitType(unit.type);
  const kind = cardKindOf(type.id);
  const d = migrateDesign(design);
  const ctx = {
    unit,
    type,
    profile,
    result,
    derived: derived || result?.derived || null,
    design: d,
    units: units || [],
    runElements,
    figures: figures ?? result?.hawa ?? null,
    caps: capabilitiesOf(type.id, profile),
    height: heightStatusOf(unit, type, d, profile),
  };
  const rows = ROWS[kind](ctx).filter(Boolean);
  const max = Number(profile?.ui?.studio?.cardRowsMax);
  const shown = Number.isFinite(max) && max > 0 ? rows.slice(0, max) : rows;
  const hasHeight = shown.some((r) => r.key === 'height');
  const h = ctx.height;
  // eslint-disable-next-line no-nested-ternary
  const inherit = !h || !hasHeight ? null : (h.custom
    ? {
      follows: false,
      text: `Project ${h.label.toLowerCase()} is ${formatMm(h.projectHeight)} mm`,
      reset: { label: 'Reset', title: 'Put this unit back on the project height', action: 'resetUnitHeight' },
    }
    : { follows: true, text: 'Height follows project default', reset: null });
  return {
    kind,
    typeId: type.id,
    unitId: unit.id,
    unitNum: unitName(unit),
    title: cardTitleOf(type.id, { profile, category }),
    thumb: kind === 'panel' ? 'panel' : 'cube',
    scope: kind === 'panel' ? 'This panel' : 'This cabinet',
    // eslint-disable-next-line no-nested-ternary
    section: kind === 'panel' ? 'Board & position' : (kind === 'hawa' ? 'Pocket configuration' : 'Size & setup'),
    rows: shown,
    inherit,
    note: NOTES[kind] || null,
    warning: kind === 'mirror' ? MIRROR_BAYS_WARNING : null,
    // A board takes no "Edit cabinet..." (lib/contextActions.js:535-540, FREE_PANEL_MENU): its own
    // window opens where it always has, by a double-click on the board (LAW 4).
    openCabinet: kind !== 'panel',
  };
}
