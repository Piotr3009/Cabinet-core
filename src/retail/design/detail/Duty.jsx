import GoldLine from '../../ui/GoldLine.jsx';
import { Button } from '../controls.jsx';

// ─── T60 F3 · THE SHELL EVERY MENU WEARS ───────────────────────────────────
//
// One back link, one title, one gold hairline, the controls, and DONE. Nine
// menus and not one of them draws its own frame — a detail column whose panels
// each invented a header is the accordion the owner refused, one column to the
// right.
//
// DONE returns column 7 to its default duty, the ESTIMATE (F6).
// T64 F4: the panel slides OUT on DONE — there is no estimate duty behind it
// any more (F5, the page) — so the way back is simply back.

export default function Duty({ title, onBack, onDone, children, backLabel = '‹ BACK' }) {
  return (
    <div className="pbi-duty">
      {onBack ? (
        <Button kind="link" data-testid="detail-back" onClick={onBack}>
          {backLabel}
        </Button>
      ) : null}
      <h2 className={`pbi-display pbi-h4 ${onBack ? 'pbi-duty-title' : 'pbi-duty-title-flush'}`}>
        {title}
      </h2>
      <GoldLine />
      {children}
      {onDone ? (
        <div className="pbi-duty-actions">
          <Button kind="secondary" onClick={onDone} data-testid="detail-done">DONE</Button>
        </div>
      ) : null}
    </div>
  );
}

/** A row of small actions — CENTRE THIS BAY beside REMOVE. */
export function DutyRow({ children }) {
  return <div className="pbi-duty-row">{children}</div>;
}
