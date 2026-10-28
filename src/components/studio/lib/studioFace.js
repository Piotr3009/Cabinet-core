/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F2, THE SHELL (CLAUDE.md T84 PART A, F2): the face, and the shell's own words.
//
// The owner, 27.10.2026, 16:27: *"nie, juz jest przy wyborze"*. PRO is chosen
// at the start (the factory entry, lib/appEntry.js) and Studio is PRO's face:
// there is no switch in the UI. `profile.ui.studio.enabled` exists for the walk
// and the tests to run both faces, and for the owner to turn the face back by
// the profile, never by a button. The retail entry never wears it.
//
// Beside the face, the few sentences the shell says about the selection (the
// breadcrumb, the status bar) and the one number it reads off the Check (the
// rail's badge), each a pure function of the stores' own values, so a node
// test can ask them without a browser.
//
// PURE (verify/t84/agents/CONTRACT.md section 2): no React, no JSX, no store,
// nothing read from the DOM at import time. It imports the engine only.

import { findingsToAct } from '../../../engine/checks.js';
import { getProjectType } from '../../../engine/projectTypes.js';
import { migrateDesign } from '../../../engine/design.js';
import { getUnitType } from '../../../engine/types.js';
import { roomWalls, wallLabel as faceLabel } from '../../../engine/room.js';
// The drawing set names a wall by its letter, wall 0 is Wall A (engine/drawings/wallElevation.js).
import { wallLabel as wallLetter } from '../../../engine/drawings/wallElevation.js';

/**
 * Does this entry wear the Studio face?
 *
 * The workshop's entry (`factory`) with `profile.ui.studio.enabled === true`,
 * and nothing else: the retail entry never does, and a profile that says
 * nothing about Studio is the legacy face.
 *
 * @param {'factory'|'retail'|string} audience  uiStore's `audience` (lib/appEntry.js)
 * @param {object} profile  the cabinet profile
 * @returns {boolean}
 */
export function isStudioFace(audience, profile) {
  return audience === 'factory' && profile?.ui?.studio?.enabled === true;
}

/**
 * The context strip's count, in CLAUDE.md T84 F2's own words:
 * "1 cabinet selected" / "2 cabinets selected" / "Nothing selected".
 */
export function selectionCountWords(count) {
  const n = Math.max(0, Math.trunc(Number(count) || 0));
  if (n === 0) return 'Nothing selected';
  return `${n} cabinet${n === 1 ? '' : 's'} selected`;
}

/**
 * Where a unit stands, as the app already names it: a wall by the drawing
 * set's letter ("Wall A", wall index 0), an island's face by the room's own
 * list label ("Island 1 · face A", engine/room.js `wallLabel`).
 *
 * @param {Array} walls  `roomWalls(project.room)`
 * @param {object} unit  a unit, `position.wall` its wall index (0 when unsaid, as the store reads it)
 * @returns {{ kind: 'wall'|'island', label: string }}
 */
export function unitPlace(walls, unit) {
  const index = Math.max(0, Math.trunc(Number(unit?.position?.wall ?? 0) || 0));
  if (walls?.[index]?.island) return { kind: 'island', label: faceLabel(walls, index) };
  return { kind: 'wall', label: `Wall ${wallLetter(index)}` };
}

/** The selected units that still exist, primary last (the store's order). */
function selectedUnits({ units = [], selectedUnitIds = [], selectedUnitId = null } = {}) {
  const ids = Array.isArray(selectedUnitIds) && selectedUnitIds.length
    ? selectedUnitIds
    : (selectedUnitId ? [selectedUnitId] : []);
  const byId = new Map((units || []).map((u) => [u.id, u]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

/**
 * The breadcrumb of the context strip (CLAUDE.md T84 F2): the project's name
 * (the room carries no name of its own, engine/room.js), the wall or the
 * island the selection stands on, and the unit number, which the strip draws
 * in bold. Several cabinets name their place only when they share it, and the
 * bold part is their count, as the designer's Stage-1 reads; nothing selected
 * is the project alone.
 *
 * @returns {{ crumbs: string[], current: string|null, count: number, words: string }}
 */
export function breadcrumbOf({
  projectName = '', room = null, units = [], selectedUnitIds = [], selectedUnitId = null,
} = {}) {
  const chosen = selectedUnits({ units, selectedUnitIds, selectedUnitId });
  const count = chosen.length;
  const crumbs = [];
  if (projectName) crumbs.push(String(projectName));
  let current = null;
  if (count) {
    let walls = [];
    try { walls = roomWalls(room); } catch { walls = []; }
    const places = [...new Set(chosen.map((u) => unitPlace(walls, u).label))];
    if (places.length === 1) crumbs.push(places[0]);
    current = count === 1 ? String(chosen[0].params?.unit_num ?? '') : `${count} cabinets`;
  }
  return {
    crumbs, current, count, words: selectionCountWords(count),
  };
}

/**
 * The status bar's selection in words: one cabinet is its number and its
 * type's own label (the RightPanel header's `type.label`), several are the
 * designer's "Shared selection", none her "No selection".
 */
export function statusSelectionWords({ units = [], selectedUnitIds = [], selectedUnitId = null } = {}) {
  const chosen = selectedUnits({ units, selectedUnitIds, selectedUnitId });
  if (!chosen.length) return 'No selection';
  if (chosen.length > 1) return 'Shared selection';
  const unit = chosen[0];
  const label = getUnitType(unit.type)?.label;
  const num = unit.params?.unit_num;
  return [num, label].filter(Boolean).join(' · ');
}

/** The viewport, as the status bar prints it: "1440 x 900". */
export function viewportWords(width, height) {
  return `${Math.round(Number(width) || 0)} x ${Math.round(Number(height) || 0)}`;
}

/**
 * The rail's Check badge (CLAUDE.md T84 F2): the count the toolbar's Check
 * button carries, `findingsToAct(findings).length` (a note asks nothing of a
 * person, engine/checks.js), and red when a red finding is in it.
 *
 * @param {Array} findings  `useCheckFindings()`, the Check panel's own list
 * @returns {{ count: number, red: boolean }}
 */
export function railCheckBadge(findings) {
  const work = findingsToAct(findings);
  return { count: work.length, red: work.some((f) => f.level === 'red') };
}

/**
 * The Library category a job opens on, exactly as the scene's first plus asks
 * it (pages/ConfiguratorPage.jsx FirstUnitPlus): the project type's own
 * category (engine/projectTypes.js; an unknown type is the default type).
 */
export function projectLibraryCategory(design) {
  return getProjectType(migrateDesign(design).projectType).category;
}

/**
 * Where the Library stands when the rail's Add opens it (CLAUDE.md T84 F2):
 * beside the button, `gapPx` off its right edge (`profile.ui.studio.
 * libraryGapPx`), its top level with the button's. LibraryPanel is placed in
 * the scene slot's coordinates (it is `absolute` in it, verify/t84/p1-host.md
 * B 14), so the button's screen rectangle is taken into the slot's, and kept
 * inside the slot (never left of its edge or above its top).
 *
 * @param {{left:number, top:number, right:number}} button  the Add button's client rectangle
 * @param {{left:number, top:number}} scene  the scene slot's client rectangle
 * @param {number} gapPx
 * @returns {{ x: number, y: number }}
 */
export function libraryBesideAdd(button, scene, gapPx = 0) {
  const gap = Number(gapPx) || 0;
  const x = Math.round((Number(button?.right) || 0) + gap - (Number(scene?.left) || 0));
  const y = Math.round((Number(button?.top) || 0) - (Number(scene?.top) || 0));
  return { x: Math.max(0, x), y: Math.max(0, y) };
}
