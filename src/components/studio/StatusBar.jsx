/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F2, THE SHELL (CLAUDE.md T84 PART A, F2): StatusBar, the foot of the Studio.
//
// CLAUDE.md T84 F2: *"the selection in words, MockModeBadge, the dirty
// marker, the Changes drawer (today's bottom-left `Changes · N` control, the
// same component, re-homed), the issue counters of F5, the viewport size."*
//
//   the Changes drawer   components/Messages.jsx's own HistoryBar, the SAME
//                        component (exported for this), whose list opens
//                        UPWARD over the scene from here; the messages column
//                        stops drawing its own inside the shell
//                        (`ChangesBarRehomed`, provided by StudioShell)
//   MockModeBadge        moved here from the top bar, and nowhere else in the
//                        Studio face
//   the counters         the `extras` slot (F5's IssueCounters)
//
// The root is a <footer> carrying `data-studio-status`: the census finds the
// badge's home by it (scripts/t84-census.mjs).

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useUiStore } from '../../stores/uiStore.js';
import { useProjectStore } from '../../stores/projectStore.js';
import MockModeBadge from '../MockModeBadge.jsx';
import { HistoryBar } from '../Messages.jsx';
import { statusSelectionWords, viewportWords } from './lib/studioFace.js';

/**
 * The Changes bar, standing in the status bar with its list opening UPWARD
 * over the scene. HistoryBar draws its list above its own button, so it stands
 * at the foot of a box that may grow upward; the box keeps the width of the
 * button alone (measured), so an open list never pushes the bar's own items.
 */
function ChangesDrawer() {
  const box = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const toggle = box.current?.querySelector('[data-message-history-toggle]');
    if (!toggle) return undefined;
    const measure = () => setWidth(Math.ceil(toggle.getBoundingClientRect().width));
    measure();
    if (typeof ResizeObserver !== 'function') return undefined;
    const watch = new ResizeObserver(measure);
    watch.observe(toggle);
    return () => watch.disconnect();
  }, []);
  return (
    <div className="relative self-stretch shrink-0" style={{ width }} data-studio="statusbar-changes">
      <div ref={box} className="absolute left-0 bottom-0 h-full flex flex-col justify-end pb-0.5">
        <HistoryBar />
      </div>
    </div>
  );
}

/**
 * The app's build stamp (App.jsx) stands fixed at the bottom right, over this
 * bar's right end: the bar keeps its own last items clear of it, by the
 * stamp's own width and the bar's own gap.
 */
// The bar's own gap between items (Tailwind `gap-3`).
const GAP_PX = 12;
function useBuildStampClearance() {
  const [clear, setClear] = useState(0);
  useEffect(() => {
    const measure = () => {
      const stamp = typeof document === 'undefined' ? null : document.querySelector('[data-build-stamp]');
      const rect = stamp?.getBoundingClientRect?.();
      setClear(rect && rect.width ? Math.ceil(window.innerWidth - rect.left) + GAP_PX : 0);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return clear;
}

export default function StatusBar({ extras = null, viewport = null }) {
  const units = useProjectStore((s) => s.units);
  const dirty = useProjectStore((s) => s.dirty);
  const selectedUnitIds = useUiStore((s) => s.selectedUnitIds);
  const selectedUnitId = useUiStore((s) => s.selectedUnitId);
  const words = statusSelectionWords({ units, selectedUnitIds, selectedUnitId });
  const clearance = useBuildStampClearance();

  return (
    <footer
      className="studio-statusbar studio-skin flex items-center gap-3 px-3.5 min-w-0 bg-shell-900 border-t border-shell-600"
      data-studio="statusbar"
      data-studio-status=""
      style={clearance ? { paddingRight: clearance } : undefined}
    >
      <ChangesDrawer />
      <span className="flex items-center gap-1.5 min-w-0" data-studio="statusbar-selection">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold shrink-0" aria-hidden />
        <span className="truncate">{words}</span>
      </span>
      <MockModeBadge />
      {dirty && (
        <span className="flex items-center gap-1.5 shrink-0" data-studio="statusbar-dirty" title="Unsaved changes">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-status-warn" aria-hidden />
          Unsaved changes
        </span>
      )}
      <span className="flex-1" />
      {extras}
      {viewport && (
        <span className="font-mono tabular-nums shrink-0" data-studio="statusbar-viewport">
          {viewportWords(viewport.width, viewport.height)}
        </span>
      )}
    </footer>
  );
}
