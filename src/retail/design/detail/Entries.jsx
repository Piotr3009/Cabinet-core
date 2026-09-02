import Button from '../../ui/Button.jsx';
import { Field, Said } from '../controls.jsx';
import Duty, { DutyRow } from './Duty.jsx';
import * as A from '../adapter.js';

// ─── TURN 63 · THE ENTRIES — WHERE A DUTY OPENS PRO'S OWN WINDOW ───────────
//
// The owner, 01.09.2026: *"jak piszę 1 do 1 to KOPIUJ."* And the measure of
// what T60 did instead:
//
//     DoorModal → DoorMenu        996 →  113 lines   9×
//     RailModal → RailMenu        148 →   70 lines   2×
//     WatchLayoutModal → WatchMenu 246 →  85 lines   3×
//     LightingPanel → LightingMenu 861 →  61 lines  14×
//
// Those four sketches are DELETED tonight (CLAUDE.md, LICENSED REMOVALS). What
// stands here in their place is not a fifth sketch: it is the ENTRY — the Duty
// shell column 7 has always worn, and in it the one gesture PRO opens the copy
// with, as a plain button. *"A copied surface that opens from a plain button
// is a success tonight."* Placement is the owner's to arrange later.
//
// Every window is opened BESIDE the button that asked for it (rule 15 —
// `A.anchorOf(e)` hands the shell the button's own rectangle) and stands over
// the stage; the Duty stays where it is, so DONE still returns the column to
// the estimate.

/** THE DOOR — `DoorModal`, PRO's window for every piece, section A and B. */
export function DoorEntry({
  unitId, panel, onBack, onDone,
}) {
  if (!panel) return null;
  const said = A.unitWarnings(unitId);
  return (
    <Duty title="DOOR" onBack={onBack} onDone={onDone}>
      <Field label="THIS DOOR">
        <div className="pbi-duty-actions">
          <Button
            kind="secondary"
            data-testid="door-open-editor"
            onClick={(e) => A.openEditor('element', { unitId, panelId: panel.id, anchor: A.anchorOf(e) })}
          >
            EDIT THIS DOOR ›
          </Button>
        </div>
      </Field>
      <Field label="ITS HINGES">
        <div className="pbi-duty-actions">
          <Button
            kind="secondary"
            data-testid="door-open-hinges"
            onClick={(e) => A.openEditor('element', {
              unitId, panelId: panel.id, section: 'hinges', anchor: A.anchorOf(e),
            })}
          >
            HINGES ›
          </Button>
        </div>
      </Field>
      {said.map((s) => <Said key={s} testid="door-said">{s}</Said>)}
    </Duty>
  );
}

/**
 * THE HANGING RAIL. Two kinds of rod, two windows — PRO's own T42 verdict: an
 * ALONE rod opens `RailModal` on its ITEM; an ASSEMBLY's rod opens the fix
 * shelf it rides, which is `DoorModal` (every piece's window) on the shelf's
 * PANEL. `A.railWindow` asks the engine which this one is.
 */
export function RailEntry({
  unitId, item, onBack, onDone,
}) {
  if (!item) return null;
  const route = A.railWindow(unitId, item.id);
  return (
    <Duty title="HANGING RAIL" onBack={onBack} onDone={onDone}>
      <Field label="THIS RAIL">
        <div className="pbi-duty-actions">
          <Button
            kind="secondary"
            data-testid="rail-open-editor"
            disabled={!route}
            onClick={(e) => route && A.openEditor(route.modal, { ...route.args, anchor: A.anchorOf(e) })}
          >
            EDIT THIS RAIL ›
          </Button>
        </div>
      </Field>
      {route?.said ? <Said testid="rail-said">{route.said}</Said> : null}
    </Duty>
  );
}

/** THE WATCH DRAWER — `WatchLayoutModal`: four layouts, the glass, the finish. */
export function WatchEntry({
  unitId, item, onBack, onDone,
}) {
  if (!item) return null;
  return (
    <Duty title="WATCH DRAWER" onBack={onBack} onDone={onDone}>
      <Field label="THIS DRAWER">
        <div className="pbi-duty-actions">
          <Button
            kind="secondary"
            data-testid="watch-open-editor"
            onClick={(e) => A.openEditor('watch-layout', { unitId, itemId: item.id, anchor: A.anchorOf(e) })}
          >
            LAYOUT, GLASS AND FINISH ›
          </Button>
        </div>
      </Field>
    </Duty>
  );
}

/**
 * THE LIGHTING — `LightingPanel`, PRO's 861-line panel, whole. It works the
 * scene's own selection for placements, so a shelf clicked on the stage is the
 * shelf the panel offers a strip under, exactly as it is in PRO.
 */
export function LightingEntry({
  unitId, panel, onBack, onDone,
}) {
  return (
    <Duty title="LIGHTING" onBack={onBack} onDone={onDone}>
      <Field label="THE LIGHT">
        <div className="pbi-duty-actions">
          <Button
            kind="secondary"
            data-testid="lighting-open-panel"
            onClick={(e) => {
              if (panel) A.selectOnStage(unitId, panel.id);
              A.openEditor('lighting', { anchor: A.anchorOf(e) });
            }}
          >
            OPEN THE LIGHTING PANEL ›
          </Button>
        </div>
      </Field>
      <DutyRow>
        <span className="pbi-choice pbi-choice-15">
          {A.lightingOn(A.liveProject()) ? 'The light is on.' : 'The light is off.'}
        </span>
      </DutyRow>
    </Duty>
  );
}
