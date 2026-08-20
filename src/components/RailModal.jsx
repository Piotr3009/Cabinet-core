import { useMemo } from 'react';
import Modal from './Modal.jsx';
import NumberField from './NumberField.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { formatMm } from '../engine/format.js';
import {
  LEGACY_RAIL_NOTE, RAIL_ALONE_NOTE, railChosenAlone,
} from '../engine/railAssembly.js';

// ─── THE HANGING RAIL'S OWN WINDOW (turn 42, CLAUDE.md F1) ──────────────────
//
// The owner, 19.08.2026, after the fourth broken rail: *"mamy w dupie stare
// rzeczy … nie patrzymy na przeszłość w ogóle."*
//
// Until tonight a rod was edited through the BOARD 40 mm above it: T35 keyed
// the hanger modal on `RAIL-PART`, because the rod is not a panel and could not
// be picked. The owner refused that board four turns running, and this turn
// stops cutting it — so the rod needed an address of its own, and it needed a
// window that opens on it.
//
// THIS IS THAT WINDOW, AND IT IS DELIBERATELY SMALL. A rod has one number and
// two facts: how high it hangs, what it is made of, and whether it is there.
// Everything else the old modal offered — the front setback, the board slot,
// the edging — were a SHELF's properties, and a rod has not got them. Offering
// them anyway is how the last four turns ended up cutting a shelf.
//
// ─── ONE WRITER, STILL ─────────────────────────────────────────────────────
//
// The height field commits through `setRailHeight`, which is the same store
// action the drag (`moveRail`) and the properties panel go through. T41 spent
// its F2 on exactly this — *"it was the THIRD writer of one number and the only
// one with no clamp"* — and nothing here adds a fourth. The number READ BACK is
// the engine's own `assemblies.rail.y`: the millimetre the 3-D draws and the
// machine drills, never the field's own idea of itself.
//
// An ASSEMBLY never reaches this window. Its rod opens the FIX SHELF it rides
// (T37's answer, untouched), because the shelf is the thing a joiner edits and
// the rod follows it.

export default function RailModal() {
  const args = useUiStore((s) => s.modalArgs);
  const closeModal = useUiStore((s) => s.closeModal);
  const notify = useUiStore((s) => s.notify);
  const units = useProjectStore((s) => s.units);
  const unitResult = useProjectStore((s) => s.unitResult);
  const setRailHeight = useProjectStore((s) => s.setRailHeight);
  const removeItem = useProjectStore((s) => s.removeItem);

  const anchor = useMemo(() => args?.anchor || null, [args]);
  const unit = units.find((u) => u.id === args?.unitId) || null;
  const item = useMemo(() => {
    if (!unit || !args?.railItemId) return null;
    return (unit.params.sections?.[0]?.items || [])
      .find((i) => i.id === args.railItemId && i.kind === 'hanger') || null;
  }, [unit, args?.railItemId]);

  if (!unit || !item) return null;

  const result = unitResult(unit.id);
  // Which rod this is: the unit-wide one, or a column's. Both are published,
  // and the window reads the one it was opened on rather than assuming.
  const zone = item.zone != null && Number.isFinite(Number(item.zone))
    ? Math.trunc(Number(item.zone))
    : null;
  const drawn = zone == null
    ? result?.assemblies?.rail
    : (result?.assemblies?.columnRails || []).find((r) => r.zone === zone);
  const support = Number(drawn?.support);

  return (
    <Modal
      name="rail"
      title={`${unit.params.unit_num} · Hanging rail${zone == null ? '' : ` · column ${zone + 1}`}`}
      onClose={closeModal}
      anchor={anchor}
      width="w-[300px]"
    >
      <div className="space-y-2" data-rail-modal={item.id}>
        {/* The number the joiner TYPES — his own "height above support", the
            same field and the same store action the properties panel offers,
            so there is one writer and one clamp. */}
        <label className="cc-row text-sm" htmlFor="rail-height-field">
          <span className="text-ink-100 flex-1">Height above support</span>
          <NumberField
            id="rail-height-field"
            className="cc-input w-24 text-right"
            data-rail-height="1"
            value={Number(item.pos_mm ?? 0)}
            min={0}
            step={1}
            title={`Measured to the rod's axis from the nearest thing below it — right now ${
              Number.isFinite(support) ? `${Math.round(support)} mm` : 'the bay floor'}`}
            onCommit={(v) => {
              const said = setRailHeight(unit.id, item.id, v);
              if (said && said.ok === false) notify(said.error, 'warn');
            }}
          />
        </label>

        {/* …and the number the ENGINE answers with, which is where the rod
            actually is after the carcass has had its say. T41's law: the height
            is READ from `assemblies.rail.y`, never from the field. */}
        <div className="cc-row text-[11px] text-ink-400">
          <span className="flex-1">Rod axis, as drawn and drilled</span>
          <span className="tabular-nums text-ink-100" data-rail-drawn-y="1">
            {Number.isFinite(Number(drawn?.y)) ? formatMm(drawn.y, { unit: true }) : '—'}
          </span>
        </div>
        {drawn && drawn.fits === false ? (
          <p className="text-[11px] text-status-warn" data-rail-too-high="1">
            Lowered to fit under the top — the carcass has no room for the number above.
          </p>
        ) : null}

        {item.material_label ? (
          <div className="cc-row text-[11px] text-ink-400">
            <span className="flex-1">Rail</span>
            <span className="text-ink-100">{item.material_label}</span>
          </div>
        ) : null}

        {/* TURN 40 (F6), kept: an OLD rod is told it can be re-added to get the
            shelf; one somebody asked to be alone this afternoon is not nagged
            about it. Same geometry now (T42-F1), two sentences. */}
        {railChosenAlone(item)
          ? <p className="text-[11px] text-ink-400" data-rail-alone-note="1">{RAIL_ALONE_NOTE}</p>
          : <p className="text-[11px] text-ink-400" data-legacy-rail-note="1">{LEGACY_RAIL_NOTE}</p>}

        <p className="text-[11px] text-ink-400">
          A rod on its own mounts to the carcass sides — one bracket screw each side, at the axis.
          There is no board above it. Drag the rod in the room to move it.
        </p>

        <div className="flex justify-end">
          <button
            type="button"
            className="cc-btn-ghost text-status-danger"
            data-remove-rail="1"
            onClick={() => { removeItem(unit.id, item.id); closeModal(); }}
          >
            Remove the rail
          </button>
        </div>
      </div>
    </Modal>
  );
}
