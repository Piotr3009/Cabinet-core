/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F7, THE RAIL'S MENUS (CLAUDE.md T84 PART E): Add and Materials, beside the rail.
//
// CLAUDE.md T84 PART E: *"`RailMenus`: the Materials popup and the Output
// popup (built from `buildOutputMenu` with the existing handlers: the 14
// leaves, same enablement), the Library placement beside Add."*  The Output is
// the legacy Output menu, whole, in the top bar's MenuBar (verify/t84/
// DECISIONS.md 7): a second copy of its fourteen leaves here would be two roads
// that can drift, so this file draws none of it. What it draws, as the rail
// asks (`renderMenu(kind, { anchor, onClose })`, StudioRail.jsx):
//
//   'add'        the Library's categories, UNIT_CATEGORIES exactly as the
//                legacy Library menu lists them (TopBar.jsx: the same labels,
//                the same soon / disabled, the same hints). A click is the
//                menu's own call, `setLibraryCategory(c.id)`, and the EXISTING
//                LibraryPanel is stood beside the Add button (CLAUDE.md F2:
//                *"8 px off its right edge, clamped to the screen"*, the number
//                `profile.ui.studio.libraryGapPx`). A Library the scene's "+"
//                opened on that very category is only moved: placing the panel
//                never clears the place the "+" chose (`libraryInsert`).
//   'materials'  the four EXISTING windows (CLAUDE.md F2): Selected finishes
//                (`unit-finish` for the selected cabinets, the right-click
//                Colour's own arguments), Project finishes (`design`), Assign
//                materials (`assign-materials`) and Stock (T-CC1b F9.3:
//                `jc-stock`, Joinery Core's stock, read-only; the Database
//                menu died with T-CC1b F3).
//
// Every entry is a SECOND road to a function the app already has, by the same
// store action (LAW 1, ZERO KASOWANIA: the first road is untouched). The popup
// is a `.studio-popup` beside the rail button: placed by the app's own
// beside-the-object arithmetic (lib/menuPlacement.js), closed by a press
// outside it, by its own choice, and by Escape, which the shell's one Escape
// owner answers (lib/studioEscape.js: this popup registers its close there).

import {
  useCallback, useEffect, useLayoutEffect, useRef, useState,
} from 'react';
import { useUiStore } from '../../stores/uiStore.js';
import { useCabinetProfileStore } from '../../stores/cabinetProfileStore.js';
import { UNIT_CATEGORIES } from '../../engine/types.js';
import { placeBesideAnchor } from '../../lib/menuPlacement.js';
import { anchorOfEvent } from '../../lib/modalAnchor.js';
import { LAYER_CLASS } from '../../lib/modalLayer.js';
import { Icon } from './StudioIcons.jsx';
import { libraryBesideAdd } from './lib/studioFace.js';
import { registerStudioPopup } from './lib/studioEscape.js';

/** The two popups the rail asks for. */
const RAIL_MENU_KINDS = ['add', 'materials'];

/**
 * The legacy Library menu's own hint for a category (TopBar.jsx, the Library
 * entry), so the second road reads as the first; the Saved sets sentence keeps
 * its words with its dash written as a colon (CLAUDE.md T84 LAWS: no em or en
 * dash in what this turn writes). test/turn84-f07-parity.test.js holds the two
 * together.
 */
function categoryHint(c) {
  // T-CC1b F4.5: a held-open family says its own reason (*"czesc coming soon"*).
  if (c.soon) return c.reason || 'Coming soon';
  if (c.saved) return 'Units you have saved: right-click a unit to add one';
  if (c.sets) return 'Media wall, sideboard, vanity, utility, hallway, and the sets you have saved';
  return `${c.types.length} type${c.types.length === 1 ? '' : 's'}`;
}

// T-CC1b F3.2 · `databaseEntry` read the deleted Database menu (*"Database niepotrzebne, wszystko
// jest w JC"*, the owner, 01.11.2026); the Materials popup's rows are written in place below.

/** A DOMRect, or any { left|x, top|y, width, height }, as a plain rectangle. */
function rectOf(r) {
  if (!r) return null;
  const x = Number(r.left ?? r.x);
  const y = Number(r.top ?? r.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const width = Math.max(0, Number(r.width) || 0);
  const height = Math.max(0, Number(r.height) || 0);
  return {
    x, y, width, height, left: x, top: y, right: x + width, bottom: y + height,
  };
}

/** The Library panel on the screen: its list's parent, as the walks find it (LibraryPanel.jsx `data-library-list`). */
function libraryPanelElement() {
  const list = document.querySelector('[data-library-list="1"]');
  return list ? list.parentElement : null;
}

/**
 * Where the Library stands beside the Add button: the shell's own arithmetic
 * (studioFace.js `libraryBesideAdd`: `gapPx` off the button's right edge, level
 * with its top, in the coordinates of the element the panel is positioned in,
 * its offsetParent, the scene slot), then kept whole inside that element with
 * the panel's own measured size. The panel not drawn yet measures nothing, so
 * the first answer is unclamped and the second, once it is drawn, is exact.
 */
function libraryPosBeside(addRect, gapPx) {
  const button = rectOf(addRect);
  if (!button || typeof document === 'undefined') return null;
  const panel = libraryPanelElement();
  const frameEl = panel?.offsetParent || document.querySelector('[data-studio="scene"]');
  if (!frameEl) return null;
  const frame = frameEl.getBoundingClientRect();
  const at = libraryBesideAdd(button, frame, gapPx);
  const width = panel ? panel.offsetWidth : 0;
  const height = panel ? panel.offsetHeight : 0;
  return {
    x: Math.max(0, Math.min(at.x, Math.round(frame.width - width))),
    y: Math.max(0, Math.min(at.y, Math.round(frame.height - height))),
  };
}

/** Add: the Library's categories; a click opens the EXISTING Library beside the button. */
function AddMenu({ anchor, gapPx, onDone }) {
  const libraryCategory = useUiStore((s) => s.libraryCategory);
  const libraryInsert = useUiStore((s) => s.libraryInsert);
  const setLibraryCategory = useUiStore((s) => s.setLibraryCategory);
  const setLibraryPos = useUiStore((s) => s.setLibraryPos);

  const choose = (c) => {
    // The Library menu's own call (TopBar.jsx). A Library the scene's "+" opened
    // on this category keeps the place it chose: it is only moved.
    const keepPlace = Boolean(libraryInsert) && libraryCategory === c.id;
    const first = libraryPosBeside(anchor, gapPx);
    if (!keepPlace) setLibraryCategory(c.id);
    if (first) setLibraryPos(first);
    onDone();
    // Once it is drawn, measured: kept whole inside the scene with its own size.
    requestAnimationFrame(() => {
      const exact = libraryPosBeside(anchor, gapPx);
      const now = useUiStore.getState().libraryPos;
      if (exact && (exact.x !== now?.x || exact.y !== now?.y)) useUiStore.getState().setLibraryPos(exact);
    });
  };

  return UNIT_CATEGORIES.map((c) => {
    const hint = categoryHint(c);
    return (
      <button
        key={c.id}
        type="button"
        role="menuitem"
        className="studio-library-item"
        data-studio="popup-item"
        data-item={c.id}
        disabled={Boolean(c.soon)}
        data-soon={c.soon ? '1' : undefined}
        title={hint}
        onClick={() => { if (!c.soon) choose(c); }}
      >
        <Icon name="cube" />
        <span className="min-w-0 flex-1">
          <span className="block truncate">{c.label}</span>
          <small className="block truncate">{hint}</small>
        </span>
        {c.soon && <span className="cc-tag">soon</span>}
      </button>
    );
  });
}

/** Materials: the four existing windows, each opened as its first road opens it. */
function MaterialsMenu({ onDone }) {
  const openModal = useUiStore((s) => s.openModal);
  const selectedUnitIds = useUiStore((s) => s.selectedUnitIds);
  const chosen = Array.isArray(selectedUnitIds) ? selectedUnitIds : [];

  const items = [
    {
      id: 'selected-finishes',
      label: 'Selected finishes…',
      hint: 'The selected cabinets\' own finish, from the project palette; the project is left alone',
      disabled: chosen.length === 0,
      reason: 'Select a cabinet first: these are the finishes of the selected cabinets',
      // The right-click Colour's own arguments (lib/contextActions.js `unit-colour`, ContextMenu.jsx).
      run: (e) => openModal('unit-finish', { unitIds: [...chosen], anchor: anchorOfEvent(e) }),
    },
    {
      id: 'project-finishes',
      label: 'Project finishes…',
      hint: 'The project\'s own finishes, in Settings: every cabinet wearing a slot follows it',
      // Settings > Settings... (TopBar.jsx), the same window.
      run: (e) => openModal('design', { anchor: anchorOfEvent(e) }),
    },
    {
      id: 'assign-materials',
      label: 'Assign materials…',
      hint: 'Which board, which hinge, which runner: per part, per project. What the BOM is built from',
      // The window the Database menu's entry opened, the same call (T-CC1b F3.2).
      run: (e) => openModal('assign-materials', { anchor: anchorOfEvent(e) }),
    },
    {
      id: 'stock',
      label: 'Stock…',
      hint: 'The boards and hardware of your Joinery Core stock, read-only here',
      // T-CC1b F9.3: Joinery Core's stock (*"materialy z JC (jego baza)"*); it replaces the
      // warehouse window this row opened before.
      run: (e) => openModal('jc-stock', { anchor: anchorOfEvent(e) }),
    },
  ];

  return items.map((item) => (
    <button
      key={item.id}
      type="button"
      role="menuitem"
      className="studio-menu-item"
      data-studio="popup-item"
      data-item={item.id}
      disabled={Boolean(item.disabled)}
      title={item.disabled ? item.reason : item.hint}
      onClick={(e) => {
        if (item.disabled) return;
        // The window is opened beside the entry (rule 15), read before the popup goes.
        item.run(e);
        onDone();
      }}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate">{item.label}</span>
        {item.disabled ? <small className="block">{item.reason}</small> : null}
      </span>
      <Icon name="right" />
    </button>
  ));
}

/**
 * @param {object} props
 *   kind     'add' | 'materials'
 *   anchor   the rail button's client rectangle (a DOMRect)
 *   onClose  closes the popup (the rail's own state)
 */
export default function RailMenu({ kind, anchor = null, onClose }) {
  const box = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  const close = useCallback(() => closeRef.current?.(), []);
  const studio = useCabinetProfileStore((s) => s.profile?.ui?.studio);
  const gapPx = Number(studio?.libraryGapPx) || 0;
  const statusPx = Number(studio?.bars?.statusPx) || 0;
  const [at, setAt] = useState(null);

  // Escape: the shell's one owner closes the topmost rail popup, and the press
  // goes no further (lib/studioEscape.js).
  useEffect(() => registerStudioPopup(close), [close]);

  // A press anywhere outside it closes it. A press on the rail button that
  // opened it is read by the rail first (StudioRail.jsx), so it shuts and stays shut.
  useEffect(() => {
    const onDown = (e) => { if (!box.current?.contains(e.target)) close(); };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, [close]);

  // Beside the rail button, measured before it is shown: to its right first,
  // `libraryGapPx` off it, level with its top, kept on the screen above the
  // status bar (the shell's own numbers, profile.ui.studio).
  useLayoutEffect(() => {
    const el = box.current;
    const a = rectOf(anchor);
    if (!el || !a) { setAt(null); return undefined; }
    const place = () => setAt(placeBesideAnchor({
      anchor: a,
      size: { width: el.offsetWidth, height: el.offsetHeight },
      viewport: { width: window.innerWidth, height: Math.max(0, window.innerHeight - statusPx) },
      gap: gapPx,
      margin: gapPx,
      prefer: 'right',
    }));
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [anchor, gapPx, statusPx, kind]);

  if (!RAIL_MENU_KINDS.includes(kind)) return null;
  const title = kind === 'add' ? 'Library' : 'Materials';
  return (
    <div
      ref={box}
      role="menu"
      aria-label={title}
      className={`studio-popup studio-skin fixed ${LAYER_CLASS.menu}`}
      data-studio="popup"
      data-kind={kind}
      // Off the screen until measured and placed: a popup that flashes at 0,0
      // first reads as a fault (the library flyout's own rule, LibraryPanel.jsx).
      style={at ? { left: at.left, top: at.top } : { left: -9999, top: 0 }}
    >
      <div className="studio-popup-head"><strong>{title}</strong></div>
      <div className="p-1">
        {kind === 'add'
          ? <AddMenu anchor={anchor} gapPx={gapPx} onDone={close} />
          : <MaterialsMenu onDone={close} />}
      </div>
    </div>
  );
}
