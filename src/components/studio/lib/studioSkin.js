/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F1, THE SKIN (CLAUDE.md T84 PART A, F1): the Studio's numbers, read from the profile
//
// CLAUDE.md F1: *"every number in `profile.ui.studio` and read from there into CSS variables at
// mount, not typed twice"*. This module is that read, and the only one: every Studio component
// asks it for a width or a variable, nobody re-derives one (verify/t84/agents/CONTRACT.md, 3).
//
// studio.css types none of these numbers. StudioShell sets the variables below on its root from
// `studioCssVars` and sets them again when the window is resized or the inspector changes mode,
// so the owner changing a number in src/engine/profile.js changes the Studio and nothing else
// has to follow.
//
// PURE: no React, no store, no DOM. The profile is handed in; a missing block or a missing number
// is said in a sentence, never filled with a guess (CLAUDE.md, the laws of T75 to T83: "nothing
// invented").

const BLOCK = 'profile.ui.studio';

/** The Studio's block of the profile, or a sentence saying it is not there. */
function studioBlock(profile) {
  const studio = profile?.ui?.studio;
  if (!studio || typeof studio !== 'object') {
    throw new Error(`The Studio has no numbers: ${BLOCK} is missing from this profile `
      + '(src/engine/profile.js holds it, CLAUDE.md T84 THE NUMBERS).');
  }
  return studio;
}

/** One value of the block by its path ("rail.widePx"); undefined where the path stops. */
function valueAt(studio, path) {
  return path.split('.').reduce((node, key) => (node == null ? undefined : node[key]), studio);
}

function numberAt(studio, path) {
  const v = valueAt(studio, path);
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(`The Studio cannot lay itself out: ${BLOCK}.${path} is not a number (it is ${JSON.stringify(v)}).`);
  }
  return v;
}

function colourAt(studio, path) {
  const v = valueAt(studio, path);
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`The Studio cannot colour a finding: ${BLOCK}.${path} is not a colour (it is ${JSON.stringify(v)}).`);
  }
  return v;
}

const px = (n) => `${n}px`;

/**
 * The widths that change with the screen (CLAUDE.md THE NUMBERS, all PROPOSED):
 * the rail 112 wide with its labels from 1440 up, 56 and icons only below; the full panel 400,
 * 360 below 1500. The numbers are the profile's; "below" is strict, so a screen exactly at a
 * breakpoint takes the wide value. CHAT FIX 30.10.2026: the quick card and its two widths are
 * gone (the owner: *"tylko ten jeden przycisk usun, Full settings"*).
 *
 * @param {object} profile          the cabinet profile (getCabinetProfile())
 * @param {number} viewportWidth    the window's width in CSS px (window.innerWidth)
 * @returns {{ railPx: number, railLabels: boolean, fullPx: number }}
 */
export function studioWidths(profile, viewportWidth) {
  const studio = studioBlock(profile);
  if (typeof viewportWidth !== 'number' || !Number.isFinite(viewportWidth)) {
    throw new Error(`The Studio needs the window's width in px to lay itself out; it was given ${JSON.stringify(viewportWidth)}.`);
  }
  const railLabels = viewportWidth >= numberAt(studio, 'rail.labelsFromPx');
  return {
    railPx: railLabels ? numberAt(studio, 'rail.widePx') : numberAt(studio, 'rail.narrowPx'),
    railLabels,
    fullPx: viewportWidth < numberAt(studio, 'inspector.fullNarrowBelowPx')
      ? numberAt(studio, 'inspector.fullNarrowPx')
      : numberAt(studio, 'inspector.fullPx'),
  };
}

/** The inspector's two modes (uiStore `inspector`); no inspector at all is the column at 0. */
const INSPECTOR_MODES = ['full', 'none'];

/**
 * The CSS custom properties studio.css reads, as one object for a React `style` (or
 * `element.style.setProperty`, name by name). The shell sets them on its `.studio-pro` root.
 *
 * `inspector` is the uiStore's mode: 'full' is the panel's width, 'none' (or no inspector column
 * at all, `undefined`) is 0. Any other word is a caller's mistake and is said.
 *
 * @param {object} profile
 * @param {{ viewportWidth: number, inspector?: 'full' | 'none' }} at
 * @returns {Record<string, string>}
 */
export function studioCssVars(profile, { viewportWidth, inspector } = {}) {
  const studio = studioBlock(profile);
  const widths = studioWidths(profile, viewportWidth);
  if (inspector != null && !INSPECTOR_MODES.includes(inspector)) {
    throw new Error(`The Studio's inspector is ${INSPECTOR_MODES.map((m) => `'${m}'`).join(', ')}; it was given ${JSON.stringify(inspector)}.`);
  }
  const inspectorPx = inspector === 'full' ? widths.fullPx : 0;
  return {
    // CONFIRMED, the owner 27.10: the scale.
    '--studio-text': px(numberAt(studio, 'scale.textPx')),
    '--studio-field': px(numberAt(studio, 'scale.fieldPx')),
    '--studio-button': px(numberAt(studio, 'scale.buttonPx')),
    '--studio-radius': px(numberAt(studio, 'scale.radiusPx')),
    // PROPOSED, the designer's Stage-1: the three bars.
    '--studio-top': px(numberAt(studio, 'bars.topPx')),
    '--studio-context': px(numberAt(studio, 'bars.contextPx')),
    '--studio-status': px(numberAt(studio, 'bars.statusPx')),
    // PROPOSED: the two columns that follow the screen (studioWidths above).
    '--studio-rail': px(widths.railPx),
    '--studio-inspector': px(inspectorPx),
    // PROPOSED, the designer's palette: a finding's ground and its text.
    '--studio-warn': colourAt(studio, 'issues.warn'),
    '--studio-danger': colourAt(studio, 'issues.danger'),
    '--studio-issue-text': px(numberAt(studio, 'issues.textPx')),
    // PROPOSED, this turn: the marker beside the unit number; the Library's gap off Add.
    '--studio-marker': px(numberAt(studio, 'marker.sizePx')),
    '--studio-library-gap': px(numberAt(studio, 'libraryGapPx')),
  };
}
