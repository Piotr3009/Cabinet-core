/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F3 · ONE ROW OF A QUICK CARD (CLAUDE.md T84 PART B, F3)
//
// The row is DATA (components/studio/lib/studioCards.js: its label, its kind,
// the value it reads and the store action it writes through); this draws it,
// in the designer's Stage-1 grammar (`studio-field-row`: the label, then the
// value: a field, chips, a select, or a summary button that opens the full
// panel at its section), and hands every press to the card's `act`, which
// calls the store's own action by its own name. Nothing here decides what a
// cabinet can do, and nothing here is a setter.
//
// A dimension row renders `Field` when the card is given one (F5's
// RefusedField: `commit(v)` answers `{ ok }` or `{ ok: false, reason }` and
// the refusal stands at the field in the engine's words), else the house
// NumberField, the refusal said by `notify` as the right panel says it.

import NumberField from '../../NumberField.jsx';
import { Icon } from '../StudioIcons.jsx';

/** A chip pressed already is no answer: nothing is written, no Undo step. */
function Chips({ row, act }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1 min-w-0" role="group" aria-label={row.label}>
      {row.options.map((option) => (
        <button
          key={option.key}
          type="button"
          className={`cc-btn px-2${option.on ? ' border-gold text-gold' : ''}`}
          aria-pressed={option.on}
          aria-label={option.aria || undefined}
          title={option.title || undefined}
          data-card-chip={option.key}
          onClick={() => { if (!option.on) act.run(row.action, option.args); }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** The value a summary row shows, and the arrow that says it opens somewhere. */
function ValueAction({ text, onClick, ...rest }) {
  return (
    <button type="button" className="cc-btn studio-value-action" onClick={onClick} {...rest}>
      <span>{text}</span>
      <Icon name="right" />
    </button>
  );
}

function Control({
  row, inputId, Field, act,
}) {
  switch (row.kind) {
    case 'number': {
      const commit = act.commit(row);
      return (
        <div className="studio-value-wrap">
          {Field ? (
            <Field
              id={inputId}
              value={row.value}
              commit={commit}
              min={row.min}
              max={row.max}
              className="cc-input"
              data-card-field={row.key}
            />
          ) : (
            <NumberField
              id={inputId}
              value={row.value}
              min={row.min}
              max={row.max}
              className="cc-input"
              data-card-field={row.key}
              onCommit={(v) => {
                const answer = commit(v);
                if (!answer.ok && answer.reason) act.say(answer.reason, 'warn');
              }}
            />
          )}
          {row.unit ? <span className="studio-unit">{row.unit}</span> : null}
        </div>
      );
    }
    case 'chips':
      return <Chips row={row} act={act} />;
    case 'select':
      return (
        <select
          id={inputId}
          className="cc-input"
          value={row.value}
          data-card-field={row.key}
          onChange={(e) => act.run(row.action, row.args(e.target.value))}
        >
          {row.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      );
    case 'summary':
      return <ValueAction text={row.text} data-card-section={row.section} onClick={() => act.section(row.section)} />;
    case 'modal':
      return <ValueAction text={row.text} data-card-modal={row.modal} onClick={(e) => act.modal(row, e)} />;
    case 'plinth':
      return (
        <div className="flex items-center justify-end gap-2 min-w-0">
          <span className="studio-readonly-value">{row.text}</span>
          {row.button ? (
            <button
              type="button"
              className="cc-btn"
              data-card-plinth={row.button.action}
              onClick={() => act.run(row.button.action, [])}
            >
              {row.button.label}
            </button>
          ) : null}
        </div>
      );
    case 'covers':
      return (
        <div className="flex flex-col gap-1 min-w-0">
          {row.sides.map((side) => (
            <div key={side.side} className="flex items-center justify-end gap-1 min-w-0" data-card-covers-side={side.side}>
              <span className="studio-readonly-value truncate">{side.text}</span>
              {side.add ? (
                <button
                  type="button"
                  className="cc-btn px-2"
                  title={side.add.title}
                  data-card-cover-add={side.side}
                  onClick={() => act.run(row.action, side.add.args)}
                >
                  {side.add.label}
                </button>
              ) : null}
              {side.remove ? (
                <button
                  type="button"
                  className="cc-btn-ghost"
                  title={side.remove.title}
                  data-card-cover-remove={side.side}
                  onClick={() => act.run(row.action, side.remove.args)}
                >
                  {side.remove.label}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      );
    default:
      return <span className="studio-readonly-value">{row.text}</span>;
  }
}

/**
 * One row: its label (a `<label>` where the value is a field or a select, so
 * a click on the word puts the caret there) and its control.
 */
export default function CardRow({
  row, unitId, Field = null, act,
}) {
  const inputId = `studio-card-${unitId}-${row.key}`;
  const mark = row.mark ? (
    <span className="ml-1 text-gold" title={row.mark.title}>{row.mark.text}</span>
  ) : null;
  const labelled = row.kind === 'number' || row.kind === 'select';
  return (
    <div className="studio-field-row" data-studio="card-row" data-row={row.key} data-row-kind={row.kind}>
      {labelled
        ? <label className="cc-label" htmlFor={inputId}>{row.label}{mark}</label>
        : <span className="cc-label">{row.label}{mark}</span>}
      <Control row={row} inputId={inputId} Field={Field} act={act} />
    </div>
  );
}
