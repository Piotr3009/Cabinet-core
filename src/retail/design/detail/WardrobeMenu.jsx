import { useState } from 'react';
import Button from '../../ui/Button.jsx';
import {
  ChipRow, Field, NumberField, Said,
} from '../controls.jsx';
import Duty from './Duty.jsx';
import * as A from '../adapter.js';
import { REASONS } from '../reasons.js';

// ─── T60 F3.1 · THE WARDROBE ───────────────────────────────────────────────
//
// Read from PRO's `RightPanel` (the size / bays / plinth surface),
// `UnitSizeModal` (the two fields and the order they are written in),
// `UnitFinishModal` (a per-unit finish is a POINTER into the project palette)
// and `DecorPickerModal` (one grid, one click, EGGER's attribution inside the
// same button as the image).
//
// What a joiner gets there in four modals and a 1546-line panel, a client gets
// here as nine decisions. NOT ONE MILLIMETRE IS TYPED: every slider's ends come
// from `adapter.unitBounds`, which is the store running the engine's own three
// clamps; every refusal is the room's own sentence or the store's own clamp
// notice, read back verbatim.
//
// ─── DOORS ARE NOT BAYS, AND t59 HAD THEM AS ONE ───────────────────────────
//
// A BAY is a compartment — the clear opening between the sides and any
// full-height flush divider. A DOOR is a LEAF. t59 wired both chip rows to the
// same call, so the second was a duplicate of the first: which the
// no-dead-control law forbids exactly as much as a control that does nothing.
// They are two acts here, and the engine keeps them apart.

// ─── T61 F3 · …AND THE TOP BOX, WHICH IS THE SAME FAMILY ──────────────────
//
// The owner asked where a top box gets added; his answer: *"4 add top"* — a
// button on the selected wardrobe. It is here and in LAYOUT, and both press the
// same `A.addTopBox`, which is `addUnit('WARDROBE_TOP', { near: host })` — the
// call PRO's own library tile makes, with the host named.
//
// A PLACED BOX OPENS THIS MENU, not one of its own: `engine/types.js` gives it
// `family: 'wardrobe'`, its boards answer `elementKind` as a wardrobe's do, and
// `MENU_FOR_KIND` therefore already routed it here before this turn. What it
// gets is the smaller set the spec names — width, height and REMOVE — because
// everything else about a box is DERIVED and typing it would be a lie: the
// depth is its host's (`settleRiders` re-writes it on every mutation), the
// plinth is not a thing a box has, and the fronts and carcass are the project's.

function TopBoxMenu({
  unitId, unit, onBack, onDone, onRemoved,
}) {
  const b = A.unitBounds(unitId);
  const size = unit?.params || {};
  const said = A.unitWarnings(unitId);
  if (!b) return null;

  return (
    <Duty title="TOP BOX" onBack={onBack} onDone={onDone}>
      <Field label="WIDTH">
        <NumberField
          outOfRange={REASONS.outOfRange}
          testid="topbox-width"
          min={b.width.min}
          max={b.width.max}
          value={Math.round(size.width || 0)}
          onCommit={(v) => A.setUnitSize(unitId, { width: v })}
        />
      </Field>

      <Field label="HEIGHT" note={REASONS.topBoxStopsAtTheCeiling}>
        <NumberField
          outOfRange={REASONS.outOfRange}
          testid="topbox-height"
          min={b.height.min}
          max={b.height.max}
          value={Math.round(size.height || 0)}
          onCommit={(v) => A.setUnitSize(unitId, { height: v })}
        />
      </Field>

      <div className="pbi-duty-actions">
        <Button
          kind="secondary"
          data-testid="topbox-remove"
          onClick={() => { A.removeUnit(unitId); onRemoved?.(); }}
        >
          REMOVE
        </Button>
      </div>

      {said.map((s) => <Said key={s} testid="topbox-said">{s}</Said>)}
    </Duty>
  );
}

export default function WardrobeMenu({
  unitId, unit, project, designName, onRename, onBack, onDone, onRemoved,
}) {
  const [said2, setSaid2] = useState('');
  const topBoxReason = A.topBoxRefusal(unitId);
  const b = A.unitBounds(unitId);
  const size = unit?.params || {};
  const bays = A.bayCount(unitId);
  const doors = A.doorCount(unitId);
  const width = Math.round(size.width || 0);
  const plinth = Math.round(size.leg_height ?? 0);
  const said = A.unitWarnings(unitId);

  if (!b) return null;
  // A BOX IS ITS OWN THING, and it is this component because it is the same
  // family. Placed AFTER the hooks above, so the hook count never changes
  // between a wardrobe and a box — the same law `chrome.js` states for its
  // guards, and the same reason.
  if (A.isTopBox(unit)) {
    return <TopBoxMenu unitId={unitId} unit={unit} onBack={onBack} onDone={onDone} onRemoved={onRemoved} />;
  }

  // T63 F4 · LICENSED REMOVAL: the CARCASS / FRONTS swatch rows stood here —
  // retail's five curated EGGER tiles, superseded by PRO's own picker (MATERIALS
  // › below opens the copied `MaterialChoicePanel` and its tiled modal).

  return (
    <Duty title={String(designName || 'WARDROBE').toUpperCase()} onBack={onBack} onDone={onDone}>
      <Field label="WIDTH">
        <NumberField
          outOfRange={REASONS.outOfRange}
          testid="wardrobe-width"
          min={b.width.min}
          max={b.width.max}
          value={width}
          onCommit={(v) => A.setUnitSize(unitId, { width: v })}
        />
      </Field>

      <Field label="HEIGHT">
        <NumberField
          outOfRange={REASONS.outOfRange}
          testid="wardrobe-height"
          min={b.height.min}
          max={b.height.max}
          value={Math.round(size.height || 0)}
          onCommit={(v) => A.setUnitSize(unitId, { height: v })}
        />
      </Field>

      <Field label="DEPTH">
        <NumberField
          outOfRange={REASONS.outOfRange}
          testid="wardrobe-depth"
          min={b.depth.min}
          max={b.depth.max}
          standardAt={A.designBounds().defaults.depth}
          value={Math.round(size.depth || 0)}
          onCommit={(v) => A.setUnitSize(unitId, { depth: v })}
        />
      </Field>

      <Field label="PLINTH">
        <ChipRow
          testid="wardrobe-plinth"
          value={String(plinth)}
          options={A.plinthOptions()}
          onPick={(id) => A.setPlinth(unitId, Number(id))}
        />
      </Field>

      {/* ─── T63 · PRO'S OWN WINDOWS, FROM THE ROW PRO OPENS THEM FROM ──────
          The owner: *"Sprawdź jakie jeszcze funkcje pominąłeś i je dodaj, a
          później będziemy ustawiać jak je rozmieścić."* Four of PRO's windows
          for ONE cabinet, each COPIED tonight and each opened here beside its
          button, as PRO's right panel opens them: the size window (T31 F8),
          the golden-plus window (T12 F5.1), the cabinet's own colour (T13 F3 —
          it writes the UNIT, so two wardrobes may differ) and the project's
          materials (F4's slot, with the tiled EGGER modal behind it). */}
      <Field label="SIZE">
        <div className="pbi-duty-actions">
          <Button
            kind="secondary"
            data-testid="wardrobe-open-size"
            onClick={(e) => A.openEditor('unit-size', { unitId, field: 'width', anchor: A.anchorOf(e) })}
          >
            WIDTH AND HEIGHT ›
          </Button>
        </div>
      </Field>

      <Field label="INSIDE">
        <div className="pbi-duty-actions">
          <Button
            kind="secondary"
            data-testid="wardrobe-open-add-items"
            onClick={(e) => A.openEditor('add-items', { unitId, anchor: A.anchorOf(e) })}
          >
            ADD ITEMS ›
          </Button>
        </div>
      </Field>

      <Field label="COLOUR">
        <div className="pbi-duty-actions">
          <Button
            kind="secondary"
            data-testid="wardrobe-open-finish"
            onClick={(e) => A.openEditor('unit-finish', { unitIds: [unitId], anchor: A.anchorOf(e) })}
          >
            THIS WARDROBE'S COLOUR ›
          </Button>
        </div>
      </Field>

      <Field label="MATERIALS">
        <div className="pbi-duty-actions">
          <Button
            kind="secondary"
            data-testid="wardrobe-open-materials"
            onClick={(e) => A.openEditor('design', { anchor: A.anchorOf(e) })}
          >
            MATERIALS AND HARDWARE ›
          </Button>
        </div>
      </Field>

      {/* T61 F3 · *"4 add top"*. Greyed with the ROOM's own sentence, read from
          the very predicate `addUnit` would have refused with — no silent
          clamp, and no second reading of the ceiling. */}
      <Field label="TOP BOX" note={A.topBoxesOn(unitId).length ? REASONS.topBoxGoesBeside : ''}>
        <div className="pbi-duty-actions">
          <Button
            kind="secondary"
            data-testid="wardrobe-add-top-box"
            disabled={Boolean(topBoxReason)}
            title={topBoxReason || 'Add a top box on this wardrobe'}
            onClick={() => setSaid2(A.addTopBox(unitId).said)}
          >
            ADD TOP BOX
          </Button>
        </div>
        {topBoxReason ? (
          <span className="pbi-chip-reason" data-testid="wardrobe-top-box-reason">{topBoxReason}</span>
        ) : null}
        {said2 ? <Said testid="wardrobe-top-box-said">{said2}</Said> : null}
      </Field>

      {/* ─── T64 F1.7 · ADVANCED — DOORS AND BAYS LEAVE THE MAIN MENU ─────────
          The owner: *"po co klient — nie wie ile drzwi potrzebuje; w Cabinet
          Core mamy dokładnie napisane w kodzie jak drzwi się ustawiają. Taki
          wybór tylko zdezorientuje klienta. 3 drzwi czy 4 — dopiero jako coś
          co trzeba edytować, a nie na głównym menu."* So the two rows that
          stood in LAYOUT are HERE, under one heading and one line, and the
          engine's door rule (`doorCountFor`) decides until somebody knows
          why. The rows themselves are T60's, unchanged. */}
      <div className="pbi-advanced" data-testid="wardrobe-advanced">
        <h3 className="pbi-ui pbi-ui-light pbi-quiet pbi-advanced-head">Advanced</h3>
        <p className="pbi-choice pbi-advanced-line" data-testid="wardrobe-advanced-line">{REASONS.doorsAreSet}</p>

        <Field label="DOORS">
          <ChipRow
            testid="wardrobe-doors"
            value={String(doors)}
            options={[1, 2, 3, 4].map((n) => ({
              id: String(n),
              label: String(n),
              // The engine's two laws, asked before the click: the structural one
              // that refuses, and the yellow one that only has something to say.
              reason: A.doorCountRefusal(width, n),
              note: A.doorCountNote(width, n),
            }))}
            onPick={(id) => A.setDoorCount(unitId, Number(id))}
          />
        </Field>

        {/* ─── T62 F4 · ONE NOTE PER PANEL ──────────────────────────────────
            Two sentences stood under two fields in this one menu. CLAUDE.md
            allows one: *"The note under a field is gone unless a caller passes
            one deliberately, and no more than one per panel."* The one that
            stays is the ENGINE's (`REASONS.topBoxGoesBeside`, under TOP BOX);
            this one is PRO's own line from `RightPanel.jsx:1223` and is NOT
            deleted — it moves onto the chips it describes, which is where PRO's
            own hints already live (`ChipRow` reads `title || hint`) and where a
            hand asking about a bay finds it. */}
        <Field label="BAYS">
          <ChipRow
            testid="wardrobe-bays"
            value={String(bays)}
            options={[1, 2, 3, 4].map((n) => ({
              id: String(n),
              label: String(n),
              title: n > 1 ? 'A door in each bay.' : '',
              reason: A.bayRefusal(unitId, n),
            }))}
            onPick={(id) => A.setBayCount(unitId, Number(id))}
          />
        </Field>
      </div>

      <Field label="NAME">
        <input
          className="pbi-field"
          data-testid="wardrobe-name"
          value={designName || ''}
          onChange={(e) => onRename(e.target.value)}
        />
      </Field>

      {/* Whatever the engine last said about this cabinet, in its own words. */}
      {said.map((s) => <Said key={s} testid="wardrobe-said">{s}</Said>)}
    </Duty>
  );
}
