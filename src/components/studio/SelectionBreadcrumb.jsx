/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F2, THE SHELL (CLAUDE.md T84 PART A, F2): SelectionBreadcrumb, the context strip.
//
// CLAUDE.md T84 F2: *"room name, wall or island, the unit number in bold;
// "1 cabinet selected" / "2 cabinets selected" / "Nothing selected"; the
// panel-show button when the inspector is hidden."*  The words are
// lib/studioFace.js `breadcrumbOf`: the project's name (the room carries no
// name of its own), the wall by the drawing set's letter or the island's face
// by the room's own label, and the unit number. A display of the selection and
// nothing else: it selects nothing, and the button only shows the inspector
// again (`showInspector`), never pins it.

import { Fragment, useMemo } from 'react';
import { useUiStore } from '../../stores/uiStore.js';
import { useProjectStore } from '../../stores/projectStore.js';
import { Icon } from './StudioIcons.jsx';
import { breadcrumbOf } from './lib/studioFace.js';

export default function SelectionBreadcrumb() {
  const projectName = useProjectStore((s) => s.project.name);
  const room = useProjectStore((s) => s.project.room);
  const units = useProjectStore((s) => s.units);
  const selectedUnitIds = useUiStore((s) => s.selectedUnitIds);
  const selectedUnitId = useUiStore((s) => s.selectedUnitId);
  const inspector = useUiStore((s) => s.inspector);
  const showInspector = useUiStore((s) => s.showInspector);

  const crumb = useMemo(() => breadcrumbOf({
    projectName, room, units, selectedUnitIds, selectedUnitId,
  }), [projectName, room, units, selectedUnitIds, selectedUnitId]);
  const parts = crumb.current == null ? crumb.crumbs : [...crumb.crumbs, crumb.current];

  return (
    <div
      className="studio-context studio-skin flex items-center gap-2 min-w-0 overflow-hidden"
      data-studio="breadcrumb"
    >
      <nav className="studio-breadcrumb flex items-center gap-1.5 min-w-0 overflow-hidden" aria-label="Selection location">
        {parts.map((part, i) => {
          const last = i === parts.length - 1;
          const bold = last && crumb.current != null;
          return (
            <Fragment key={`${i}-${part}`}>
              {bold
                ? <strong className="truncate" data-studio="breadcrumb-current">{part}</strong>
                : <span className="truncate">{part}</span>}
              {!last && <Icon name="right" />}
            </Fragment>
          );
        })}
      </nav>
      <span className="flex-1" />
      <span className="studio-selection-scope shrink-0" data-studio="breadcrumb-count">{crumb.words}</span>
      {inspector === 'none' && (
        <button
          type="button"
          className="cc-btn-ghost studio-icon-btn shrink-0"
          data-studio="breadcrumb-show-inspector"
          aria-label="Show selection settings"
          title="Show selection settings"
          onClick={() => showInspector?.()}
        >
          <Icon name="panel" />
        </button>
      )}
    </div>
  );
}
