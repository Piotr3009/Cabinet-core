import Chip from '../../ui/Chip.jsx';
import { ChipRow, Field, Said, Slider } from '../controls.jsx';
import Duty from './Duty.jsx';
import * as A from '../adapter.js';

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

export default function WardrobeMenu({
  unitId, unit, project, designName, onRename, onBack, onDone,
}) {
  const b = A.unitBounds(unitId);
  const size = unit?.params || {};
  const bays = A.bayCount(unitId);
  const doors = A.doorCount(unitId);
  const width = Math.round(size.width || 0);
  const plinth = Math.round(size.leg_height ?? 0);
  const decors = A.decorChoices();
  const carcass = A.carcassDecorOf(project);
  const front = A.frontDecorOf(project);
  const said = A.unitWarnings(unitId);

  if (!b) return null;

  const swatch = (sw, chosen, onPick) => (
    <Chip key={sw.id} title={sw.label} selected={chosen === sw.finishId} onClick={() => onPick(sw.id)}>
      <span className="pbi-stack">
        <span className="pbi-swatch-tile" style={{ background: sw.hex || 'var(--pbi-soft-ivory)' }} />
        {/* The EGGER attribution, beside the image, unconditionally. */}
        <span className="pbi-choice pbi-swatch-label">{sw.label}</span>
      </span>
    </Chip>
  );

  return (
    <Duty title={String(designName || 'WARDROBE').toUpperCase()} onBack={onBack} onDone={onDone}>
      <Field label="WIDTH">
        <Slider
          testid="wardrobe-width"
          min={b.width.min}
          max={b.width.max}
          step={10}
          value={width}
          onChange={(v) => A.setUnitSize(unitId, { width: v })}
        />
      </Field>

      <Field label="HEIGHT">
        <Slider
          testid="wardrobe-height"
          min={b.height.min}
          max={b.height.max}
          step={10}
          value={Math.round(size.height || 0)}
          onChange={(v) => A.setUnitSize(unitId, { height: v })}
        />
      </Field>

      <Field label="DEPTH">
        <Slider
          testid="wardrobe-depth"
          min={b.depth.min}
          max={b.depth.max}
          step={10}
          standardAt={A.designBounds().defaults.depth}
          value={Math.round(size.depth || 0)}
          onChange={(v) => A.setUnitSize(unitId, { depth: v })}
        />
      </Field>

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

      <Field label="BAYS" note={bays > 1 ? 'A door in each bay.' : ''}>
        <ChipRow
          testid="wardrobe-bays"
          value={String(bays)}
          options={[1, 2, 3, 4].map((n) => ({
            id: String(n),
            label: String(n),
            reason: A.bayRefusal(unitId, n),
          }))}
          onPick={(id) => A.setBayCount(unitId, Number(id))}
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

      {decors.length ? (
        <>
          <Field label="CARCASS">
            <div className="pbi-chip-row" data-testid="wardrobe-carcass">
              {decors.map((sw) => swatch(sw, carcass, A.setCarcassDecor))}
            </div>
          </Field>
          <Field label="FRONTS">
            <div className="pbi-chip-row" data-testid="wardrobe-front">
              {decors.map((sw) => swatch(sw, front, A.setFrontDecor))}
            </div>
          </Field>
        </>
      ) : null}

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
