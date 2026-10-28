/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F2, THE SHELL (CLAUDE.md T84 PART A, F2): StudioRail, the tools down the left.
//
// CLAUDE.md T84 F2, the rail: Select, Add, Room, Materials, a separator,
// Check; at its foot Design and CNC. Every one is a SECOND road to a function
// that already exists, by the same store action (LAW 1, ZERO KASOWANIA):
//
//   Select     closeLibrary(): the Library shut, the insertion of the scene's
//              "+" cleared by the store's own action, the selection kept
//   Add        the rail's popup (`renderMenu('add')`, F7); before F7 it opens
//              the EXISTING Library beside the button at the job's category,
//              as the scene's first plus does
//   Room       openModal('room', { anchor }), as Settings > Room setup... does
//   Materials  the rail's popup (`renderMenu('materials')`, F7: the four
//              existing windows); before F7 it is disabled and says why
//   Check      toggleCheck, its badge the toolbar's own count
//              (`findingsToAct(useCheckFindings()).length`), red when a red
//              finding is in it
//   Design     setViewMode('3d'), CNC setViewMode('cnc'): the toolbar's 3D |
//              CNC pair, the same calls and the same (absent) guards
//
// 112 px with labels at 1440 and up, 56 icons below (`profile.ui.studio.rail`,
// read by studioSkin's `studioWidths`; the shell hands the answer in).

import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useUiStore } from '../../stores/uiStore.js';
import { useProjectStore } from '../../stores/projectStore.js';
import { useCabinetProfileStore } from '../../stores/cabinetProfileStore.js';
import { useCheckFindings } from '../../lib/checkFindings.js';
import { anchorOfEvent } from '../../lib/modalAnchor.js';
import { Icon } from './StudioIcons.jsx';
import { libraryBesideAdd, projectLibraryCategory, railCheckBadge } from './lib/studioFace.js';

/** One rail button: its icon, and its word when the rail is wide (else its title and aria-label say it). */
function RailButton({
  icon, label, labels, hook, pressed, expanded, menuKind, disabled = false, title, onClick, children = null,
}) {
  return (
    <button
      type="button"
      className={`cc-btn-ghost relative flex items-center w-full min-w-0 ${labels ? 'justify-start' : 'justify-center'}`}
      data-studio={hook}
      data-rail-menu={menuKind || undefined}
      aria-pressed={pressed}
      aria-haspopup={menuKind ? 'menu' : undefined}
      aria-expanded={expanded}
      aria-label={labels ? undefined : label}
      title={title || label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} />
      {labels && <span className="studio-rail-text">{label}</span>}
      {children}
    </button>
  );
}

export default function StudioRail({
  renderMenu = null, labels = true, sceneRef = null, popupLayer = null,
}) {
  const libraryCategory = useUiStore((s) => s.libraryCategory);
  const closeLibrary = useUiStore((s) => s.closeLibrary);
  const setLibraryCategory = useUiStore((s) => s.setLibraryCategory);
  const setLibraryPos = useUiStore((s) => s.setLibraryPos);
  const openModal = useUiStore((s) => s.openModal);
  const checkOpen = useUiStore((s) => s.checkOpen);
  const toggleCheck = useUiStore((s) => s.toggleCheck);
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const design = useProjectStore((s) => s.project.design);
  const profile = useCabinetProfileStore((s) => s.profile);
  // The Check panel's own list, read once and fresh (lib/checkFindings.js), and
  // the toolbar's own count of it.
  const badge = railCheckBadge(useCheckFindings());

  // ─── THE RAIL'S POPUPS (Add, Materials), F7's through `renderMenu` ────────
  // `menu` is { kind, anchor } while one is open. A press on the button of the
  // popup that is open closes it and does not open it again: the press is read
  // in the window's CAPTURE phase (this listener is added before any popup's
  // own), before a popup's outside-click has shut it under the pointer.
  const [menu, setMenu] = useState(null);
  const menuNow = useRef(null);
  const pressedOpen = useRef(null);
  const showMenu = useCallback((next) => { menuNow.current = next; setMenu(next); }, []);
  const closeMenu = useCallback(() => showMenu(null), [showMenu]);
  useEffect(() => {
    const onDown = (e) => {
      const kind = e.target?.closest?.('[data-rail-menu]')?.getAttribute('data-rail-menu') || null;
      pressedOpen.current = kind && menuNow.current?.kind === kind ? kind : null;
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, []);
  const toggleMenu = (kind, e) => {
    const wasOpen = pressedOpen.current === kind || menuNow.current?.kind === kind;
    pressedOpen.current = null;
    if (wasOpen) { closeMenu(); return; }
    showMenu({ kind, anchor: e.currentTarget.getBoundingClientRect() });
  };

  // Add, before F7: the EXISTING Library, beside this button
  // (`profile.ui.studio.libraryGapPx` off its right edge), at the category the
  // job opens on; a Library already open keeps its category and the place the
  // scene's "+" chose, and only comes to stand beside the button.
  const openLibraryBeside = (e) => {
    const scene = sceneRef?.current?.getBoundingClientRect?.();
    if (scene) {
      setLibraryPos(libraryBesideAdd(e.currentTarget.getBoundingClientRect(), scene, profile.ui.studio.libraryGapPx));
    }
    if (!libraryCategory) setLibraryCategory(projectLibraryCategory(design));
  };

  const onSelect = () => { closeMenu(); closeLibrary(); };
  const onAdd = (e) => (renderMenu ? toggleMenu('add', e) : openLibraryBeside(e));
  const onMaterials = (e) => { if (renderMenu) toggleMenu('materials', e); };

  const popup = menu && renderMenu ? renderMenu(menu.kind, { anchor: menu.anchor, onClose: closeMenu }) : null;

  return (
    <nav
      className={`studio-rail studio-skin flex flex-col gap-1.5 min-h-0 min-w-0 overflow-y-auto${labels ? '' : ' is-narrow'}`}
      data-studio="rail"
      aria-label="Design tools"
    >
      <RailButton
        icon="select"
        label="Select"
        labels={labels}
        hook="rail-select"
        pressed={!libraryCategory}
        onClick={onSelect}
      />
      <RailButton
        icon="plus"
        label="Add"
        labels={labels}
        hook="rail-add"
        menuKind={renderMenu ? 'add' : null}
        expanded={renderMenu ? menu?.kind === 'add' : undefined}
        onClick={onAdd}
      />
      <RailButton
        icon="room"
        label="Room"
        labels={labels}
        hook="rail-room"
        onClick={(e) => openModal('room', { anchor: anchorOfEvent(e) })}
      />
      <RailButton
        icon="material"
        label="Materials"
        labels={labels}
        hook="rail-materials"
        menuKind={renderMenu ? 'materials' : null}
        expanded={renderMenu ? menu?.kind === 'materials' : undefined}
        disabled={!renderMenu}
        title={renderMenu ? undefined : 'Materials opens with the rail\'s menus (T84 F7)'}
        onClick={onMaterials}
      />
      <div className="studio-rail-separator" role="separator" />
      <RailButton
        icon="check"
        label="Check"
        labels={labels}
        hook="rail-check"
        pressed={checkOpen}
        title="Eleven pre-production rules over the whole job"
        onClick={toggleCheck}
      >
        {badge.count > 0 && (
          <span
            className={`studio-rail-badge${badge.red ? ' is-red' : ''}${labels ? ' ml-auto' : ' absolute -top-1 -right-1'}`}
            data-studio="rail-check-badge"
            data-red={badge.red ? '1' : '0'}
          >
            {badge.count}
          </span>
        )}
      </RailButton>

      <div className="studio-rail-bottom mt-auto flex flex-col gap-1.5">
        {labels && <span className="studio-rail-caption">Workspace</span>}
        <RailButton
          icon="cube"
          label="Design"
          labels={labels}
          hook="rail-design"
          pressed={viewMode === '3d'}
          onClick={() => setViewMode('3d')}
        />
        <RailButton
          icon="panel"
          label="CNC"
          labels={labels}
          hook="rail-cnc"
          pressed={viewMode === 'cnc'}
          onClick={() => setViewMode('cnc')}
        />
      </div>

      {popup && (popupLayer ? createPortal(popup, popupLayer) : popup)}
    </nav>
  );
}
