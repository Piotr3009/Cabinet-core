/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F4, THE INSPECTOR HOST (CLAUDE.md T84 PART B)
//
// CLAUDE.md T84 F4: "`InspectorHost`: `quick` (the card, 344 px, 316 below
// 1440), `full` (RightPanel embedded, 400 px, 360 below 1500), `none` (hidden,
// the breadcrumb's button brings it back)." The widths are the profile's
// (`profile.ui.studio.inspector`, read through studioSkin's `studioWidths`);
// not one of them is typed here.
//
// CHAT FIX 30.10.2026 · THE QUICK CARD IS GONE. The owner: *"nie nie nie,
// zwijanie musi byc oczywiscie tak jak bylo zeby bylo widac ze jest osobne
// menu, tylko ten jeden przycisk usun, Full settings"*; *"open cabinet na
// samym dole a pod nim wszystkie bledy ktore pokazuje"*. A cabinet clicked
// shows the full panel at once (its sections fold as they always did); the
// card, its rows and its two buttons are deleted (QuickSelectionCard.jsx,
// cards/CardRow.jsx, lib/studioCards.js, RefusedField.jsx, kasacja). What the
// column shows is read off the store at every render, never kept:
//   the CNC view              RightPanel embedded, its CNC branch (the tree)
//   several cabinets          RightPanel embedded, its MultiUnitPanel branch
//   one cabinet               RightPanel embedded, then the FOOT: Open cabinet
//                             (the editor window, as the right-click's Edit
//                             cabinet) and under it the cabinet's findings
//                             (IssueStrip, F5): one quiet row with the counts,
//                             the list unfolded over it on a press, scrolling
//                             on its own so the sections above are never covered
//   nothing, unpinned         no column at all (THE UX TURN, U2, below)
//   nothing, pinned           RightPanel embedded, its empty branch
//   'none'                    no column at all
//
// THE UX TURN, U2 · THE PANEL THAT HIDES. The owner, over the mockup: with
// nothing selected the column stood black with "Select a cabinet or part";
// now it is not drawn and the scene takes the width (*"niech sie zweza, nie
// chce ustawiac sceny od nowa"*). Whether the column has anything to show is
// ONE answer, StudioShell.jsx `inspectorHasContent`: the shell sizes the grid
// by it and this host draws the column by it. The empty words are deleted
// with the column they stood in; the breadcrumb already says "Nothing
// selected". The three windows below stay mounted with no column, as ever.
// One panel, one header (CLAUDE.md T84 LAWS 2): Pin stands INSIDE RightPanel's
// own header (its `headerActions`), never in a bar over it, and every row of
// the panel is the panel's own.
//
// Pin (the designer: "Pin keeps inspector open and FOLLOWING SELECTION; it
// never locks unit ID"): `inspectorPinned` is a yes or a no in the store, and
// the store's `inspectorAfterSelect` answers a MODE. This file keeps no unit id
// anywhere. What it keeps is per TYPE: the open sections and the scroll of the
// full panel, so the next cabinet of a kind comes up as the last one was left.
//
// Commit before switch (CLAUDE.md T84 F4): "Before the selection changes, a
// pending valid edit is committed to its ORIGINAL unit id." While it is
// mounted, the host is the store's selection guard (`setSelectionGuard`): the
// field with the caret is blurred, and its own blur commits.
//
// The three windows RightPanel's one-cabinet branch has always carried (the
// cut corner, the cut edge, the mirror on the back: verify/t84/p1-host.md
// B 12) are mounted HERE, once, whatever the column shows and with no column
// at all, so a click on a mirror cabinet's back opens its window in every
// mode; the embedded RightPanel does not draw them, so one copy stands.
//
// Neither the column nor anything it puts round the panel is a stacking context
// or a containing block for fixed children (no z-index, transform, filter,
// contain, will-change, backdrop-filter): a window drawn inside stands where
// every other window stands (verify/t84/p1-host.md B 13).

import {
  useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore,
} from 'react';
import RightPanel, { EdgeNotchModal, MirrorBackModal, NotchModal } from '../RightPanel.jsx';
import { useUiStore } from '../../stores/uiStore.js';
import { useProjectStore } from '../../stores/projectStore.js';
import { useCabinetProfileStore } from '../../stores/cabinetProfileStore.js';
import { anchorOfEvent } from '../../lib/modalAnchor.js';
import { isFreePanel } from '../../engine/types.js';
import { Icon } from './StudioIcons.jsx';
import { studioWidths } from './lib/studioSkin.js';
// U2: the shell's one answer to "has the column anything to show".
import { inspectorHasContent } from './StudioShell.jsx';

// The designer's label for Pin (Stage-1, her full head).
const PIN_WORDS = 'Keep panel open and follow selection';
const PINNED_WORDS = 'Pinned: the panel stays open and follows the selection. Click to unpin.';

// The viewport's width: the column's widths change at the profile's own breakpoints.
const onResize = (notify) => {
  window.addEventListener('resize', notify);
  return () => window.removeEventListener('resize', notify);
};
const viewportWidth = () => window.innerWidth;

/** A cabinet's type, read off the project as it stands (null when it is gone). */
const typeOfUnit = (id) => (id ? (useProjectStore.getState().units.find((u) => u.id === id)?.type ?? null) : null);

/** The embedded panel's own scrolling body (RightPanel.jsx: its aside's `flex-1 overflow-y-auto`). */
function panelScroller(root) {
  return root ? root.querySelector('aside[data-panel-layout="embedded"] > .overflow-y-auto') : null;
}

/**
 * The open sections, kept PER TYPE (CLAUDE.md T84 F4: "the open sections kept
 * per type"). Run by the store's own subscription the moment the primary
 * cabinet changes, before React draws the next one: the panel's sections as
 * they stood are filed under the old cabinet's type, and the new type's set,
 * when there is one, comes back through the store's own `setPanelSection`.
 * Running there and not in an effect is what lets the roads that select and
 * open a section in one breath (the inner +, the right-click section openers)
 * keep the section they asked for. `memory` holds types, never a unit id.
 * Self-contained: test/turn84-f04-inspector.test.js runs it as written.
 */
function followSections(memory, state, prev, typeOf, setPanelSection) {
  if (state.selectedUnitId === prev.selectedUnitId) return memory.type;
  const was = prev.selectedUnitId ? (typeOf(prev.selectedUnitId) ?? memory.type) : null;
  const now = state.selectedUnitId ? typeOf(state.selectedUnitId) : null;
  if (was) memory.sections.set(was, { ...prev.panelOpen });
  memory.type = now;
  const keep = now && now !== was ? memory.sections.get(now) : null;
  if (keep) {
    for (const [id, open] of Object.entries(keep)) {
      if (Boolean(state.panelOpen?.[id]) !== Boolean(open)) setPanelSection(id, open);
    }
  }
  return now;
}

/**
 * The selection guard's answer (verify/t84/agents/CONTRACT.md 4), apart from
 * React so it is read and tested as written: the field with the caret inside
 * the column is blurred, and a field's blur commits through its own closure,
 * to its own cabinet. A cabinet that is gone (deleted under its panel) has
 * nothing left to commit to. Self-contained: test/turn84-f04-inspector.test.js
 * runs it as written.
 */
function guardAnswer(root, active, gone) {
  if (!root || gone) return { ok: true };
  if (active && active !== root && root.contains(active)
    && ['INPUT', 'SELECT', 'TEXTAREA'].includes(active.tagName)) {
    active.blur();
  }
  return { ok: true };
}

/**
 * Pin, handed to RightPanel as its `headerActions` and drawn INSIDE its own
 * header, before its x. `data-studio-host` keeps it apart from the panel's own
 * controls when the census counts the panel.
 */
function HostActions({ pinned }) {
  const toggleInspectorPin = useUiStore((s) => s.toggleInspectorPin);
  return (
    <span className="flex items-center gap-1 shrink-0" data-studio-host="1">
      <button
        type="button"
        className={`cc-btn-ghost px-1.5 ${pinned ? 'text-gold bg-shell-700' : ''}`}
        data-studio="pin"
        data-studio-host="1"
        aria-pressed={pinned}
        aria-label={PIN_WORDS}
        title={pinned ? PINNED_WORDS : PIN_WORDS}
        onClick={() => toggleInspectorPin()}
      >
        <Icon name="pin" />
      </button>
    </span>
  );
}

/**
 * The foot of one cabinet's column: Open cabinet (the editor window, beside
 * the press, as the right-click's Edit cabinet opens it) and under it the
 * cabinet's findings (IssueStrip: one quiet row with the counts, folded by
 * default; a press unfolds the list over the row). A free panel takes no Open
 * cabinet (lib/contextActions.js FREE_PANEL_MENU: a board's own window opens
 * by a double-click on the board); its findings still stand here.
 */
function InspectorFoot({ unitId, unitType, renderStrip }) {
  const openModal = useUiStore((s) => s.openModal);
  const board = isFreePanel(unitType);
  return (
    <div className="studio-skin studio-inspector-foot" data-studio="inspector-foot">
      {board ? null : (
        <button
          type="button"
          className="cc-btn-gold"
          data-studio="open-cabinet"
          onClick={(e) => openModal('cabinet', { unitId, anchor: anchorOfEvent(e) })}
        >
          <Icon name="open" />
          Open cabinet
        </button>
      )}
      {renderStrip ? renderStrip(unitId) : null}
    </div>
  );
}

/**
 * @param {object} props
 * @param {(unitId: string) => any} [props.renderStrip]  F5: the issue strip of one cabinet
 */
export default function InspectorHost({ renderStrip = null }) {
  const mode = useUiStore((s) => s.inspector);
  const pinned = useUiStore((s) => s.inspectorPinned);
  const viewMode = useUiStore((s) => s.viewMode);
  const unitId = useUiStore((s) => s.selectedUnitId);
  const several = useUiStore((s) => s.selectedUnitIds.length > 1);
  const unitType = useProjectStore((s) => (unitId ? (s.units.find((u) => u.id === unitId)?.type ?? null) : null));
  const profile = useCabinetProfileStore((s) => s.profile);
  const viewport = useSyncExternalStore(onResize, viewportWidth);
  const widths = studioWidths(profile, viewport);

  // What the column shows: the selection as it stands now, the CNC view first
  // (as RightPanel itself decides), a cabinet only while it exists.
  let shows = 'nothing';
  if (viewMode === 'cnc') shows = 'cnc';
  else if (unitType && several) shows = 'several';
  else if (unitType) shows = 'one';
  const fullOne = shows === 'one';
  // CNC, several cabinets, one cabinet, or nothing selected while pinned: RightPanel embedded.
  // U2: the same answer the shell sizes the column by; no panel, no column.
  const panel = inspectorHasContent({ viewMode, unitType, pinned });
  const width = widths.fullPx;

  const rootRef = useRef(null);
  const memory = useRef(null);
  if (memory.current === null) {
    memory.current = {
      sections: new Map(), scroll: new Map(), type: unitType, scrolled: null,
    };
  }

  // ─── Commit before switch: the store's guard while the host is mounted ───
  useEffect(() => {
    const guard = () => {
      const { selectedUnitId } = useUiStore.getState();
      const gone = Boolean(selectedUnitId) && !typeOfUnit(selectedUnitId);
      return guardAnswer(rootRef.current, document.activeElement, gone);
    };
    useUiStore.getState().setSelectionGuard(guard);
    return () => useUiStore.getState().clearSelectionGuard(guard);
  }, []);

  // ─── Per type: the sections and the scroll as they stood, filed when the
  // primary cabinet changes, in the store's own subscription (before React
  // draws the next cabinet, so the scroll read is still the old panel's). ───
  useEffect(() => useUiStore.subscribe((state, prev) => {
    if (state.selectedUnitId === prev.selectedUnitId) return;
    const m = memory.current;
    const scroller = m.scrolled ? panelScroller(rootRef.current) : null;
    if (scroller) m.scroll.set(m.scrolled, scroller.scrollTop);
    followSections(m, state, prev, typeOfUnit, useUiStore.getState().setPanelSection);
  }), []);

  // The scroll comes back when the full panel shows another cabinet, or shows at
  // all; a cabinet whose kit swaps its type in place (the vanity's 2 / 3 / 4)
  // keeps its scroll and is filed under its new type.
  useLayoutEffect(() => {
    const m = memory.current;
    if (!fullOne) { m.scrolled = null; return; }
    m.scrolled = typeOfUnit(unitId);
    const scroller = panelScroller(rootRef.current);
    if (scroller) scroller.scrollTop = m.scroll.get(m.scrolled) ?? 0;
  }, [fullOne, unitId]);
  useLayoutEffect(() => {
    if (fullOne) memory.current.scrolled = unitType;
  }, [fullOne, unitType]);

  // The scroll as the joiner leaves it, filed as it happens (the panel's own
  // scrolling body only; read, never restyled).
  const onScroll = useCallback((e) => {
    const m = memory.current;
    if (!m.scrolled) return;
    const scroller = panelScroller(rootRef.current);
    if (scroller && e.target === scroller) m.scroll.set(m.scrolled, scroller.scrollTop);
  }, []);
  const setRoot = useCallback((el) => {
    if (rootRef.current) rootRef.current.removeEventListener('scroll', onScroll, true);
    rootRef.current = el;
    if (el) el.addEventListener('scroll', onScroll, true);
  }, [onScroll]);

  // 'none' (the user's own hide) or nothing to show (U2): no column.
  const column = mode === 'none' || !panel ? null : (
    <div
      ref={setRoot}
      className="studio-inspector flex flex-col min-h-0 min-w-0 h-full shrink-0"
      data-studio="inspector"
      data-mode={mode}
      role="region"
      aria-label="Selection settings"
      style={{ width }}
    >
      <div className="flex-1 min-h-0 flex flex-col">
        <RightPanel
          layout="embedded"
          headerActions={<HostActions pinned={pinned} />}
        />
      </div>
      {fullOne ? <InspectorFoot unitId={unitId} unitType={unitType} renderStrip={renderStrip} /> : null}
    </div>
  );

  return (
    <>
      {column}
      {/* Once, whatever the column shows and with no column: the cut corner,
          the cut edge, the mirror on the back (RightPanel's own windows). */}
      <NotchModal />
      <EdgeNotchModal />
      <MirrorBackModal />
    </>
  );
}
