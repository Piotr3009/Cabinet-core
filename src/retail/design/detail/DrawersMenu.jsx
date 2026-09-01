import { ChipRow, Field, NumberField, Said } from '../controls.jsx';
import { REASONS } from '../reasons.js';
import Button from '../../ui/Button.jsx';
import Duty, { DutyRow } from './Duty.jsx';
import * as A from '../adapter.js';

// ─── T60 F3.4 · THE DRAWERS ────────────────────────────────────────────────
//
// Read from PRO's `CabinetEditorModal` and the drawer half of `RightPanel`:
// how many, what goes in the top one, the glass, and the front heights.
//
// ─── WHAT IS OFFERED, AND WHAT IS NOT ──────────────────────────────────────
//
// PRO gives a joiner a field per drawer, an EQUAL-HEIGHTS mode, a runner
// variant, a mount, a column and a reset. The brief compresses that to ONE
// slider — *"one slider for the stack's split, if the engine exposes it;
// otherwise omit — never a fake control"* — and the engine exposes exactly one
// stack-wide write, `setAllDrawerHeights`, clamped to the profile's own front
// window. That is the slider. There is no ratio law for a wardrobe stack (only
// BUDR has one), so nothing here invents a taller-at-the-bottom.
//
// AND IT IS DISABLED WHERE IT WOULD LIE. `setAllDrawerHeights` writes every
// drawer in the stack — including a watch tray, whose height the owner fixed at
// the engine's own `watchDrawerFixedHeight`, and a shoe drawer, whose height
// derives from its 80 mm side. A stack holding either is a stack this slider
// must not touch, so it is greyed with that said rather than quietly
// overwriting two heights the owner declared fixed.
//
// ─── THE TWO REFUSALS THE ENGINE AUTHORS ───────────────────────────────────
//
// WATCHES ⇄ SHOES is enforced at four doors in the shared core and every one of
// them writes its own sentence. Asked BEFORE the press — which is what "no dead
// control" means — the predicate is the other kind's presence on this cabinet.
// GLASS needs a watch tray to lie on and a shelf above to be cut in; the second
// half is the engine's own words.

export default function DrawersMenu({ unitId, item, onBack, onDone, onRemoved }) {
  const stack = A.drawerStack(unitId);
  const b = A.drawerBounds();
  const refusals = A.insertRefusals(unitId);
  const top = stack.top;
  const insert = A.topInsertOf(top);
  const glass = top?.watch_shelf_glass === true;
  const glassWhy = A.glassRefusal(unitId);
  const fixed = A.stackHasFixedHeights(unitId);
  const said = A.stackWord(unitId);

  return (
    <Duty title="DRAWERS" onBack={onBack} onDone={onDone}>
      <Field
        label="HOW MANY"
        note={A.countNote(unitId)}
      >
        <ChipRow
          testid="drawers-count"
          value={String(stack.drawers.length)}
          options={Array.from({ length: b.maxCount }, (_, i) => i + 1)
            .map((n) => ({ id: String(n), label: String(n) }))}
          onPick={(id) => A.setStackCount(unitId, Number(id))}
        />
      </Field>

      <Field label="TOP DRAWER INSERT">
        <ChipRow
          testid="drawers-insert"
          value={insert}
          options={[
            { id: 'none', label: 'NONE' },
            { id: 'watches', label: 'WATCHES', reason: refusals.watches },
            { id: 'belts', label: 'BELTS', reason: refusals.belts },
            { id: 'shoes', label: 'SHOES', reason: refusals.shoes },
          ]}
          onPick={(id) => A.setTopInsert(unitId, id)}
        />
      </Field>

      <Field label="GLASS TOP">
        <ChipRow
          testid="drawers-glass"
          value={glass ? 'on' : 'off'}
          options={[
            { id: 'off', label: 'OFF' },
            { id: 'on', label: 'ON', reason: glassWhy },
          ]}
          onPick={(id) => top && A.setGlassTop(unitId, top.id, id === 'on')}
        />
      </Field>

      <Field label="FRONT HEIGHTS">
        {fixed ? (
          <Said testid="drawers-fronts-fixed">{fixed}</Said>
        ) : (
          <NumberField
            outOfRange={REASONS.outOfRange}
            testid="drawers-front-height"
            min={b.front.min}
            max={b.front.max}
            standardAt={b.front.standard}
            value={Math.round(item?.height_mm ?? b.front.standard)}
            onCommit={(v) => A.setStackFronts(unitId, v)}
          />
        )}
      </Field>

      {item ? (
        <DutyRow>
          <Button
            kind="secondary"
            data-testid="drawers-remove"
            onClick={() => { A.removeElement(unitId, item.id); onRemoved(); }}
          >
            REMOVE THIS DRAWER
          </Button>
        </DutyRow>
      ) : null}

      {said ? <Said testid="drawers-said">{said}</Said> : null}
    </Duty>
  );
}
