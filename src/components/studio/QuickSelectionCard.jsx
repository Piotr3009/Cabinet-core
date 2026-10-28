/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F3 · THE QUICK CARD (CLAUDE.md T84 PART B, F3)
//
// What one selected cabinet shows first in the Studio's inspector: its library
// name and number, six rows at most of what it really has, and the two ways
// on, Open cabinet and Full settings. CLAUDE.md T84 F3: *"The seven cards, six
// rows at most, in the contract's order ... Under the rows: "Height follows
// project default" when it does; the type's note; the issue strip of F5; then
// Open cabinet (gold, `openModal('cabinet', { unitId, anchor })`) and Full
// settings (the inspector to `full`)."*
//
// LAW 3, THE CARD NEVER LIES: the rows are worked out by
// components/studio/lib/studioCards.js from the engine's own answers (a row
// the type does not have is absent, never disabled), and every row writes
// through the store's own action, by its own name, with the store's own
// refusal first; what the store says back is shown (`readAnswer`): a refusal
// at the field when the card is given F5's `Field`, else by `notify`, as the
// right panel says it; a clamp's notice by `notify`. The card adds no setter.
//
// The full panel is not duplicated here: a summary row (Doors, Drawers, Bays,
// Mounting) opens the panel at its section through the panel's own roads
// (`openRightPanel`, `setPanelSection`) and the Studio's `showFullSettings`
// (verify/t84/agents/CONTRACT.md, sections 4 and 5).

import { useMemo } from 'react';
import { useUiStore } from '../../stores/uiStore.js';
import { useProjectStore } from '../../stores/projectStore.js';
import { useCabinetProfileStore } from '../../stores/cabinetProfileStore.js';
import { anchorOfEvent } from '../../lib/modalAnchor.js';
import { getProjectType } from '../../engine/projectTypes.js';
import { callAction, cardFor, commitRow } from './lib/studioCards.js';
import { Icon } from './StudioIcons.jsx';
import CardRow from './cards/CardRow.jsx';

/**
 * @param {{ unitId: string, strip?: import('react').ReactNode, Field?: Function|null }} props
 *   strip  F5's IssueStrip for this unit, drawn under the type's note
 *   Field  the component a dimension row renders (F5's RefusedField), or none
 */
export default function QuickSelectionCard({ unitId, strip = null, Field = null }) {
  const units = useProjectStore((s) => s.units);
  const unitResult = useProjectStore((s) => s.unitResult);
  const storedDesign = useProjectStore((s) => s.project.design);
  const runElements = useProjectStore((s) => s.runElements);
  const pocketFiguresFor = useProjectStore((s) => s.pocketFiguresFor);
  const profile = useCabinetProfileStore((s) => s.profile);
  const openModal = useUiStore((s) => s.openModal);
  const notify = useUiStore((s) => s.notify);
  const openRightPanel = useUiStore((s) => s.openRightPanel);
  const setPanelSection = useUiStore((s) => s.setPanelSection);
  const showFullSettings = useUiStore((s) => s.showFullSettings);
  const hideInspector = useUiStore((s) => s.hideInspector);

  const unit = units.find((u) => u.id === unitId) || null;
  const result = unit ? unitResult(unit.id) : null;
  const card = useMemo(() => (unit ? cardFor(unit, {
    profile,
    result,
    design: storedDesign,
    units,
    runElements,
    // The pocket's figures as the right panel reads them (RightPanel.jsx:1923).
    figures: typeof pocketFiguresFor === 'function' ? pocketFiguresFor(unit.id) : null,
    // The Library opens on the project's category (LibraryPanel.jsx:51): its row names the card.
    category: getProjectType(storedDesign?.projectType).category,
  }) : null), [unit, result, storedDesign, units, runElements, pocketFiguresFor, profile]);

  if (!unit || !card) return null;

  const say = (message, tone) => { if (message) notify(message, tone); };
  const surface = (answer) => {
    for (const n of answer.notices) say(n, 'warn');
    if (answer.info) say(answer.info, 'info');
  };
  // The store's own action, by its own name, on this unit (`callAction`:
  // nothing outside the card's list is ever called, LAW 3: no new setter).
  const act = {
    say,
    /** A chip, a select, a plinth or a cover step: the answer is said, a refusal in its own words. */
    run: (action, args) => {
      const answer = callAction(useProjectStore.getState(), action, unit.id, args);
      if (!answer.ok && answer.reason) say(answer.reason, 'warn');
      surface(answer);
      return answer;
    },
    /**
     * A field's commit (`commitRow`): nothing when the number is the one
     * shown; the room's refusal first where the row asks it
     * (`roomFitRefusalFor`), then the setter; `{ ok }` or `{ ok: false,
     * reason }` back to the field, the clamp's notices said.
     */
    commit: (row) => (v) => {
      const answer = commitRow(row, v, { actions: useProjectStore.getState(), unitId: unit.id });
      if (!answer.ok) return { ok: false, reason: answer.reason };
      surface(answer);
      return { ok: true };
    },
    /** A summary row: the full panel, at its section. */
    section: (id) => {
      openRightPanel();
      setPanelSection(id, true);
      showFullSettings();
    },
    /** The Finish row: the cabinet's own colour window, beside the row (rule 15). */
    modal: (row, e) => openModal(row.modal, { ...row.modalArgs, anchor: anchorOfEvent(e) }),
  };

  const inherit = card.inherit;
  return (
    <div
      className="studio-skin studio-card flex flex-col min-h-0 h-full"
      data-studio="card"
      data-card-type={card.kind}
      data-unit={unit.id}
      data-unit-type={card.typeId}
    >
      <div className="studio-inspector-head">
        <div className="studio-object-title">
          <div className="min-w-0">
            <div className="studio-object-id" data-card-unit-num="1">{card.unitNum}</div>
            <h1>{card.title}</h1>
          </div>
          <div className="studio-object-thumb" aria-hidden="true">
            <Icon name={card.thumb} />
          </div>
        </div>
        <div className="studio-scope-row">
          <span className="studio-scope-pill">{card.scope}</span>
          <span>Quick settings</span>
        </div>
      </div>

      <div className="studio-inspector-body">
        <div className="cc-frame cc-frame-active">
          <div className="studio-card-section-title">{card.section}</div>
          {card.rows.map((row) => (
            <CardRow key={row.key} row={row} unitId={unit.id} Field={Field} act={act} />
          ))}
        </div>

        {inherit ? (
          <div className="studio-inheritance" data-card-inherit={inherit.follows ? 'project' : 'custom'}>
            <Icon name="link" />
            <span>{inherit.text}</span>
            {inherit.reset ? (
              <button
                type="button"
                className="cc-btn-ghost"
                title={inherit.reset.title}
                data-card-height-reset="1"
                onClick={() => act.run(inherit.reset.action, [])}
              >
                {inherit.reset.label}
              </button>
            ) : null}
          </div>
        ) : null}
        {card.note ? <p className="studio-inline-note" data-card-note="1">{card.note}</p> : null}
        {card.warning ? (
          <p className="studio-inline-note flex items-start gap-1.5" data-card-warning="1">
            <Icon name="warning" />
            <span>{card.warning}</span>
          </p>
        ) : null}
        {strip}

        <div className="studio-card-actions">
          {card.openCabinet ? (
            <button
              type="button"
              className="cc-btn-gold"
              data-studio="card-open-cabinet"
              onClick={(e) => openModal('cabinet', { unitId: unit.id, anchor: anchorOfEvent(e) })}
            >
              <Icon name="open" />
              Open cabinet
            </button>
          ) : null}
          <button
            type="button"
            className="cc-btn"
            data-studio="card-full-settings"
            onClick={() => showFullSettings()}
          >
            <Icon name="sliders" />
            Full settings
          </button>
        </div>
      </div>

      <div className="studio-inspector-bottom">
        <span />
        <button
          type="button"
          className="cc-btn-ghost studio-icon-btn"
          data-studio="card-hide"
          aria-label="Hide settings"
          onClick={() => hideInspector()}
        >
          <Icon name="close" />
        </button>
      </div>
    </div>
  );
}
