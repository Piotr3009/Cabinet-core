/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F6 (CLAUDE.md T84 PART D): THE SCENE'S EDGE, VIEW
//
// CLAUDE.md T84 F6: *"SceneViewMenu: View at the scene's top right with the
// other scene controls: Dimensions, Front dimensions, Dimension colour (from
// `profile.dimensions.colours`), Props (with its disabled reason from
// `propsReason`), Measure, Contour view, Brightness, Realistic lighting, Turn on
// the light."*  Exactly those nine (VIEW_ITEMS), each through the store action
// it calls today and nothing new. FROZEN 3 of T80 holds: Brightness, Realistic
// lighting and Turn on the light stay three controls with three states.
//
// THE GUARDS, and whose: the four that were CanvasToolbar buttons (Dimensions,
// Front dimensions, Props, Measure) keep the TOOLBAR's guard, because this is
// where those buttons now live and a toolbar control may not lose a state it
// worked in (verify/t84/p1-registry.md row 5: View > Dimensions is greyed in
// contour view, the toolbar's button is not; the legacy View menu keeps its
// own, untouched). The five that only the View menu of TopBar.jsx had
// (Dimension colour, Contour view, Brightness, Realistic lighting, Turn on the
// light) keep TopBar's guard, its labels and its sentences (an em dash in a
// sentence written as a colon, CONTRACT 0).
//
// A Studio popup (`[data-studio="popup"][data-kind="view"]` while open), fixed
// under the View button by the button's own rectangle (studio.css: a Studio
// popup is placed from its opener's DOMRect), its right edge on the button's.
// It closes on a press outside it, after an entry is chosen (the menu bar's own
// grammar: MenuBar.jsx closes a dropdown on a pick, never on a slider), and on
// Escape, which it takes in the window's capture phase and stops there: the
// popup is the topmost thing open, so the one press closes it and nothing under
// it (verify/t84/p1-escape.md E, level 2; the shell's own Escape owner,
// lib/studioEscape.js, sees the popup in the document and leaves the press to
// it). A key typed in a text field outside the popup is the field's (level 1)
// and is left alone.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useUiStore } from '../../stores/uiStore.js';
import { useProjectStore } from '../../stores/projectStore.js';
import { useCabinetProfileStore } from '../../stores/cabinetProfileStore.js';
import { migrateDesign } from '../../engine/design.js';
import { propsAvailable, propsReason, usePropsPack } from '../../lib/usePropsPack.js';
import { LAYER_CLASS } from '../../lib/modalLayer.js';
import { Icon } from './StudioIcons.jsx';

// T86B F7: *"menu, patrz SS: dimension powinien pojsc do glownego paska,
// ustawienie koloru wymiarowania powinno byc w settings nie tutaj"* (the owner,
// 30.10.2026, 21:54). Dimensions is on the scene toggles bar, the ink in Settings.
/** The seven, in the menu's order. */
const VIEW_ITEMS = Object.freeze([
  'frontDimensions', 'props', 'measure',
  'contourView', 'brightness', 'realisticLighting', 'light',
]);

/** A key typed into a text field belongs to the field (p1-escape.md E, level 1). */
function typingIn(target) {
  if (!target || typeof target !== 'object') return false;
  if (target.isContentEditable) return true;
  const tag = String(target.tagName || '').toUpperCase();
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag !== 'INPUT') return false;
  return !['range', 'checkbox', 'radio', 'button', 'submit', 'reset'].includes(String(target.type || '').toLowerCase());
}

/** Where the popup stands: under the button, its right edge on the button's (viewport coordinates). */
function placeUnder(button) {
  const r = button?.getBoundingClientRect?.();
  if (!r) return null;
  const width = document.documentElement?.clientWidth || window.innerWidth;
  return { top: r.bottom, right: Math.max(0, width - r.right) };
}

export default function SceneViewMenu() {
  // Null while shut; the popup's place while open.
  const [at, setAt] = useState(null);
  const open = Boolean(at);
  const setOpen = (v) => setAt(v ? placeUnder(button.current) : null);
  const holder = useRef(null);
  const button = useRef(null);

  const profile = useCabinetProfileStore((s) => s.profile);
  const viewMode = useUiStore((s) => s.viewMode);
  const contourView = useUiStore((s) => s.contourView);
  // From CanvasToolbar.jsx (the toolbar's buttons, re-homed here).
  const showFrontDimensions = useUiStore((s) => s.showFrontDimensions);
  const toggleFrontDimensions = useUiStore((s) => s.toggleFrontDimensions);
  const props = useUiStore((s) => s.props);
  const toggleProps = useUiStore((s) => s.toggleProps);
  const propsPack = usePropsPack();
  const propsReady = propsAvailable(propsPack);
  const rulerOn = useUiStore((s) => s.rulerOn);
  const toggleRuler = useUiStore((s) => s.toggleRuler);
  // From TopBar.jsx's View menu (its own entries, a second road to each).
  const toggleContourView = useUiStore((s) => s.toggleContourView);
  const brightness = useUiStore((s) => s.brightness);
  const setBrightness = useUiStore((s) => s.setBrightness);
  const realisticLighting = useUiStore((s) => s.realisticLighting);
  const toggleRealisticLighting = useUiStore((s) => s.toggleRealisticLighting);
  // The project's one light switch, read as TopBar reads it (TURN 35 F10).
  const storedDesign = useProjectStore((s) => s.project.design);
  const setLighting = useProjectStore((s) => s.setLighting);
  const lightOn = useMemo(() => migrateDesign(storedDesign).lighting.on, [storedDesign]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!holder.current?.contains(e.target)) setAt(null); };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (typingIn(e.target) && !holder.current?.contains(e.target)) return;
      setAt(null);
      e.stopPropagation();
    };
    // The window moved under a fixed popup: stand it under the button again.
    const onResize = () => setAt(placeUnder(button.current));
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  // The switches: label, state, guard, action, sentence.
  const switches = {
    frontDimensions: {
      label: 'Front dimensions',
      checked: showFrontDimensions,
      disabled: viewMode !== '3d',
      run: toggleFrontDimensions,
      title: showFrontDimensions
        ? 'Hide front dimensions: sizes, gaps and the merged run figure'
        : 'Show front dimensions: sizes, gaps and the merged run figure',
    },
    props: {
      label: 'Props',
      checked: props && propsReady,
      disabled: viewMode !== '3d' || contourView || !propsReady,
      run: toggleProps,
      title: propsReady
        ? (props ? 'Take the props out of the drawers' : 'Dress the drawers: watches, belt rolls, folded ties')
        : propsReason(propsPack),
    },
    measure: {
      label: 'Measure',
      checked: rulerOn,
      disabled: viewMode !== '3d',
      run: toggleRuler,
      title: rulerOn
        ? 'Measuring: click two points to read the distance. Escape clears, then closes.'
        : 'Measure between two points on the drawing',
    },
    contourView: {
      label: 'Contour view',
      checked: contourView,
      disabled: viewMode !== '3d',
      run: toggleContourView,
      title: 'Presentation mode: outlines only. Changes nothing in the BOM.',
    },
    realisticLighting: {
      label: 'Realistic lighting',
      checked: realisticLighting,
      disabled: viewMode !== '3d',
      run: toggleRealisticLighting,
      title: 'Environment reflections and contact shadows. Turn it off if the view feels heavy: a render is unaffected.',
    },
    light: {
      label: 'Turn on the light',
      checked: lightOn,
      disabled: viewMode !== '3d',
      run: () => setLighting({ on: !lightOn }),
      title: "Internal lights ON: the room dims and the placed LEDs shine. The same switch as the Lighting panel's ON / OFF.",
    },
  };

  // Brightness: the SAME slider as TopBar's (one value, one setter, the profile's three numbers).
  const range = profile.appearance.studio.brightness;

  const pick = (run) => () => { run(); setOpen(false); };

  const item = (id) => {
    if (id === 'brightness') {
      return (
        <label
          key={id}
          className="studio-menu-item"
          data-studio="popup-item"
          data-item={id}
          title="Scales every light in the room together. The balance between them does not move."
        >
          <span className="shrink-0">Brightness</span>
          <span className="flex flex-1 min-w-0 items-center gap-2">
            <input
              type="range"
              className="flex-1 min-w-0 accent-gold"
              min={range.min}
              max={range.max}
              step={range.step}
              value={brightness}
              disabled={viewMode !== '3d'}
              aria-label="Brightness"
              onChange={(e) => setBrightness(Number(e.target.value))}
            />
            <span className="shrink-0 whitespace-nowrap tabular-nums">{`${Math.round(brightness * 100)} %`}</span>
          </span>
        </label>
      );
    }
    const s = switches[id];
    return (
      <button
        key={id}
        type="button"
        role="menuitemcheckbox"
        className="studio-menu-item"
        data-studio="popup-item"
        data-item={id}
        aria-checked={s.checked}
        disabled={s.disabled}
        title={s.title}
        onClick={pick(s.run)}
      >
        <span>{s.label}</span>
        <span aria-hidden>{s.checked ? '✓' : ''}</span>
      </button>
    );
  };

  return (
    <div className={`studio-scene-tools studio-skin ${LAYER_CLASS.panel}`} data-studio="scene-tools">
      <div ref={holder} className="relative">
        <button
          ref={button}
          type="button"
          className="cc-btn"
          data-studio="view-menu"
          aria-haspopup="menu"
          aria-expanded={open}
          title="Ways of looking at the scene: dimensions, props, measure, contours and the light"
          onClick={() => setOpen(!open)}
        >
          View
          <Icon name="down" />
        </button>
        {open && (
          <div
            role="menu"
            aria-label="View"
            className={`studio-popup studio-skin fixed mt-1 ${LAYER_CLASS.menu}`}
            data-studio="popup"
            data-kind="view"
            style={{ top: at.top, right: at.right }}
          >
            <div className="studio-popup-head"><strong>View</strong></div>
            {VIEW_ITEMS.map(item)}
          </div>
        )}
      </div>
    </div>
  );
}
