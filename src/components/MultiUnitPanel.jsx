import { useMemo, useState } from 'react';
import NumberField from './NumberField.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { getUnitType } from '../engine/types.js';
import { commonValue, MIXED } from '../lib/selection.js';
import { doorExtendMm } from '../engine/doors.js';
// Turn 30 (CLAUDE.md F9): the cornice, over a selection.
import { corniceOption, takesCornice } from '../engine/cornice.js';
import { formatMm } from '../engine/format.js';
import { anchorOfEvent } from '../lib/modalAnchor.js';
import { LAYER_CLASS } from '../lib/modalLayer.js';

// ─── The panel over MANY cabinets (turn 13, CLAUDE.md F5.2) ─────────────────
//
// "The right panel over a multi-selection shows the COMMON actions: add shelves
// to all, Even/centre, and the shared property editors — fields with differing
// values display 'mixed' and only write when the user sets them."
//
// The last clause is the whole design problem, and it is why `commonValue` is a
// tested function in lib/selection.js rather than a ternary in this file. A
// bulk editor's danger is not what it writes; it is what it writes BY ACCIDENT.
// Six cabinets of five different heights, a height box that renders the first
// one's number, a stray Enter — and five cabinets have silently become the
// sixth. So a field that disagrees shows the word "mixed", holds no value at
// all, and writes only when a human types one.
//
// Everything it calls is a BULK action in the store, and every bulk action is
// the single-unit action run once per cabinet inside one batch: each clamp
// still belongs to its own carcass, and the lot is one Ctrl+Z (F5.4).

export default function MultiUnitPanel({ ids, onClose }) {
  const units = useProjectStore((s) => s.units);
  const updateUnitParamsBulk = useProjectStore((s) => s.updateUnitParamsBulk);
  const setUnitInsetsBulk = useProjectStore((s) => s.setUnitInsetsBulk);
  const addShelvesBulk = useProjectStore((s) => s.addShelvesBulk);
  const redistributeShelvesBulk = useProjectStore((s) => s.redistributeShelvesBulk);
  const addDoorsBulk = useProjectStore((s) => s.addDoorsBulk);
  const removeDoorsBulk = useProjectStore((s) => s.removeDoorsBulk);
  const setDoorExtendBulk = useProjectStore((s) => s.setDoorExtendBulk);
  const profile = useCabinetProfileStore((s) => s.profile);
  const openModal = useUiStore((s) => s.openModal);
  const notify = useUiStore((s) => s.notify);

  const selected = useMemo(() => units.filter((u) => ids.includes(u.id)), [units, ids]);

  const kinds = useMemo(() => {
    const seen = new Map();
    for (const u of selected) {
      const label = getUnitType(u.type)?.label || u.type;
      seen.set(label, (seen.get(label) || 0) + 1);
    }
    return [...seen].map(([label, n]) => (n > 1 ? `${n} × ${label}` : label));
  }, [selected]);

  const shelvable = selected.filter((u) => getUnitType(u.type)?.supports?.shelves).length;
  // How many of them actually have doors on — so "Remove doors" can say what it
  // is about to do, and be off when there is nothing to take off.
  const withDoors = selected.filter((u) => u.params.doors && u.params.doors !== false).length;

  // ─── Turn 16 (CLAUDE.md F4.2): the door extend over a selection ─────────
  // How many of these kits HAVE a grab edge, what they say about it now, and
  // the number the field starts at: their common answer where they agree, the
  // profile's 38 where they do not. `commonValue` is the same tested helper
  // every other shared field here uses — a field that disagrees says "mixed"
  // and writes nothing until a human types.
  // Turn 30 (CLAUDE.md F9): the cornice over this selection. `commonValue` is
  // the same tested helper every other shared field here uses — a selection
  // that disagrees says nothing rather than picking one cabinet's answer.
  const setCorniceBulk = useProjectStore((s) => s.setCorniceBulk);
  const corniceable = selected.filter((u) => takesCornice(u.type)).length;
  const corniceCommon = commonValue(
    selected.filter((u) => takesCornice(u.type)),
    (u) => corniceOption(u.params.cornice, profile),
  );

  // Turn 30 (CLAUDE.md F8): the slab over this selection, where there is one.
  const addWorktop = useProjectStore((s) => s.addWorktop);
  const removeWorktop = useProjectStore((s) => s.removeWorktop);
  const worktopsOf = useProjectStore((s) => s.worktopsOf);
  const worktopHere = useMemo(
    () => worktopsOf().find((w) => ids.every((id) => w.unitIds.includes(id))) || null,
    [worktopsOf, ids, units],
  );

  const extendable = selected.filter((u) => getUnitType(u.type)?.doorExtend).length;
  const extendCommon = commonValue(
    selected.filter((u) => getUnitType(u.type)?.doorExtend),
    (u) => doorExtendMm(u.params, profile) || null,
  );
  const [extendDraft, setExtendDraft] = useState(null);
  const extend = extendDraft ?? (extendCommon.mixed ? profile.wallUnit.doorExtend
    : (extendCommon.value || profile.wallUnit.doorExtend));
  const setExtend = (v) => setExtendDraft(Math.max(0, Number(v) || 0));

  // The shared numbers. Width is deliberately NOT among them: a run's widths
  // are what make it that run, and one box that sets all six to 600 is a way to
  // destroy a kitchen with one keystroke, not a convenience.
  const fields = [
    { key: 'height', label: 'Height' },
    { key: 'depth', label: 'Depth' },
  ];

  const write = (key, value) => {
    const { notices } = updateUnitParamsBulk(ids, { [key]: value }) || { notices: [] };
    for (const n of notices) notify(n, 'warn');
  };

  // ─── TURN 28 (CLAUDE.md F9): THE BACK INSET, OVER A RUN ──────────────────
  //
  // The owner: a Back inset field on a MULTI-selection of floor-standing units,
  // under the dimension numbers. It moves the whole selected run off the wall —
  // a bowed wall or a soil pipe is a fact about a stretch of wall, not about
  // one cabinet, and setting it six times is six chances to type it differently.
  //
  // A WALL unit hangs on brackets, which is what "off the wall" already means
  // for it, so a selection with any wall unit in it does not offer the field:
  // the run this is about is a floor run. Single selection keeps the field it
  // has always had, in the right panel (`RightPanel.Insets`) — this is the
  // BULK one, and offering the same number in two places for one cabinet is
  // how they come to disagree.
  const floorStanding = selected.filter((u) => getUnitType(u.type)?.mount === 'floor');
  const offersBackInset = selected.length > 1 && floorStanding.length === selected.length;
  const backCommon = commonValue(selected, (u) => Number(u.params.inset_back_mm) || 0);
  const setBackInset = (v) => {
    const { notices } = setUnitInsetsBulk(ids, { back: v }) || { notices: [] };
    for (const n of notices) notify(n, 'warn');
  };

  return (
    <aside className={`absolute right-0 top-0 bottom-0 w-[310px] cc-panel rounded-none border-y-0 border-r-0 ${LAYER_CLASS.panel} flex flex-col`}>
      <div className="flex items-center px-3 py-2 border-b border-shell-600">
        <h2 className="text-sm text-ink-50 flex-1" data-multi-count={selected.length}>
          {selected.length} cabinets
        </h2>
        <button type="button" className="cc-btn-ghost" title="Close" onClick={onClose}>×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-3" data-multi-panel="1">
        <p className="text-[11px] text-ink-400">
          {kinds.join(' · ')}. Every action here applies to all of them, and undoes as one step.
        </p>

        {/* ── the shared numbers ── */}
        <div className="grid grid-cols-2 gap-2">
          {fields.map(({ key, label }) => {
            const common = commonValue(selected, (u) => u.params[key]);
            return (
              <div key={key}>
                <span className="cc-label">
                  {label}
                  {common.mixed && <span className="ml-1 text-gold" data-mixed={key}>mixed</span>}
                </span>
                {common.mixed ? (
                  // A field with no agreed value holds NOTHING. It is a text box
                  // showing the word until somebody types a number over it —
                  // which is the only event that may write.
                  <input
                    className="cc-input"
                    placeholder={MIXED}
                    defaultValue=""
                    inputMode="decimal"
                    title={`These cabinets differ. Type a ${label.toLowerCase()} to give them all the same one.`}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      const v = Number(e.currentTarget.value);
                      if (Number.isFinite(v) && v > 0) write(key, v);
                    }}
                    onBlur={(e) => {
                      const v = Number(e.currentTarget.value);
                      if (Number.isFinite(v) && v > 0) write(key, v);
                    }}
                  />
                ) : (
                  <NumberField value={common.value} onCommit={(v) => write(key, v)} />
                )}
              </div>
            );
          })}
        </div>

        {/* ─── TURN 28 (CLAUDE.md F9) ───
            UNDER the dimension numbers, which is where the owner asked for it,
            and only on a run of floor-standing cabinets. */}
        {offersBackInset && (
          <div data-multi-back-inset="1">
            <span className="cc-label">
              Back inset
              {backCommon.mixed && <span className="ml-1 text-gold" data-mixed="inset_back_mm">mixed</span>}
            </span>
            <NumberField
              className="cc-input text-right"
              min={0}
              max={profile.editor.maxInset}
              title="Stand the whole run off the wall — a pipe, a bowed wall, a skirting. Every end panel in it deepens to reach the wall."
              value={backCommon.mixed ? 0 : (backCommon.value || 0)}
              onCommit={setBackInset}
            />
            <p className="text-[11px] text-ink-400">
              Moves all {selected.length} off the wall. Their end panels get deeper by the same
              amount, so the run still finishes against the plaster.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {[['board_t', 'Board (mm)', profile.board.thicknessOptions],
            ['front_t', 'Front (mm)', profile.front.thicknessOptions]].map(([key, label, options]) => {
            const common = commonValue(selected, (u) => u.params[key]);
            return (
              <div key={key}>
                <span className="cc-label">
                  {label}
                  {common.mixed && <span className="ml-1 text-gold" data-mixed={key}>mixed</span>}
                </span>
                <select
                  className="cc-input"
                  value={common.mixed ? '' : String(common.value ?? '')}
                  onChange={(e) => { if (e.target.value) write(key, Number(e.target.value)); }}
                >
                  {/* The placeholder is a real option so the select has
                      something to BE while it disagrees — and it carries no
                      value, so choosing it writes nothing. */}
                  {common.mixed && <option value="">{MIXED}</option>}
                  {(options || []).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            );
          })}
        </div>

        <div className="cc-divider" />

        {/* ── the common actions ── */}
        <div className="space-y-2">
          <button
            type="button"
            className="cc-btn w-full"
            data-bulk="add-shelf"
            disabled={!shelvable}
            title={shelvable ? 'One more shelf in each of them' : 'None of these kits takes a shelf'}
            onClick={() => {
              const { added, skipped } = addShelvesBulk(ids, 1) || {};
              if (skipped) notify(`${skipped} of them take no shelves.`, 'info');
            }}
          >
            Add a shelf to all {shelvable ? `(${shelvable})` : ''}
          </button>
          <button
            type="button"
            className="cc-btn w-full"
            data-bulk="even-shelves"
            disabled={!shelvable}
            title="Space every cabinet's shelves evenly in its own free height"
            onClick={() => {
              const { done } = redistributeShelvesBulk(ids) || {};
              if (!done) notify('No shelves to centre.', 'info');
            }}
          >
            Even / centre shelves
          </button>
          {/* ─── Turn 15 (CLAUDE.md F8) ───
              "Beside 'Add doors' on a multi-selection, 'Remove doors' strips
              the doors from every selected unit in ONE action and ONE undo
              step. Today the owner walks unit by unit." Beside, literally: the
              two are one row, because they are one decision with two answers. */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="cc-btn"
              data-bulk="add-doors"
              onClick={() => {
                const { fitted, already } = addDoorsBulk(ids) || {};
                if (!fitted && already) notify('They already have their doors.', 'info');
              }}
            >
              Add doors
            </button>
            <button
              type="button"
              className="cc-btn"
              data-bulk="remove-doors"
              disabled={!withDoors}
              title={withDoors
                ? `Take the doors off ${withDoors} of them — one undo step`
                : 'None of these has doors on'}
              onClick={() => {
                const { stripped, already } = removeDoorsBulk(ids) || {};
                if (!stripped && already) notify('None of them had doors on.', 'info');
              }}
            >
              Remove doors {withDoors ? `(${withDoors})` : ''}
            </button>
          </div>
          {/* ─── TURN 30 (CLAUDE.md F9): ONE CORNICE ACROSS THE SELECTION ──
              The cornice has been per-cabinet since turn 22 while the piece
              itself has been ONE MOULDING across adjacent cabinets for just as
              long — `engine/cornice.js runCorniceParams` does that and is not
              touched here. What was missing was the ENTRANCE, so this is the
              per-unit control's own three buttons over a selection, through
              the per-unit action, in one undo step. Same design layer, no
              drilling. */}
          {corniceable > 0 && (
            <div className="cc-row" data-bulk-cornice="1">
              <div className="flex flex-col">
                <span className="text-sm text-ink-100">Cornice</span>
                <span className="text-[11px] text-ink-400">
                  {corniceable} of {ids.length} take one — one moulding across the run
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[0, ...profile.autoParts.cornice.heights].map((h) => (
                  <button
                    key={h}
                    type="button"
                    data-bulk-cornice-height={h}
                    className={corniceCommon.value === h && !corniceCommon.mixed ? 'cc-btn-gold' : 'cc-btn'}
                    onClick={() => {
                      const { done, skipped, notices } = setCorniceBulk(ids, h) || {};
                      if (done) {
                        notify(h
                          ? `${h} mm cornice across ${done} cabinet${done === 1 ? '' : 's'}.`
                          : `Cornice off ${done} cabinet${done === 1 ? '' : 's'}.`, 'ok');
                      }
                      if (skipped) notify(`${skipped} of them take no cornice.`, 'info');
                      for (const n of notices || []) notify(n, 'warn');
                    }}
                  >
                    {h === 0 ? 'None' : `${h}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── TURN 30 (CLAUDE.md F8): ONE WORKTOP OVER THE RUN ──────────
              The owner: select two or more base cabinets and one slab covers
              them "od ściany aż do paneli". It is a DESIGN-LAYER auto-part
              like the end panels — it reaches no hole and no fixture — and the
              button SAYS WHY when it cannot: one wall, no turned unit, one top
              height, base cabinets. "Nothing happened" is the one answer a
              button must never give. */}
          <div className="flex gap-1" data-bulk-worktop="1">
            <button
              type="button"
              className="cc-btn flex-1"
              data-add-worktop="1"
              title="One worktop over these cabinets — from the wall out past the end panels"
              onClick={() => {
                const res = addWorktop(ids);
                if (!res.ok) notify(res.error, 'warn');
              }}
            >
              Add worktop ({ids.length})
            </button>
            {worktopHere ? (
              <button
                type="button"
                className="cc-btn px-2"
                data-remove-worktop={worktopHere.id}
                title="Take it off — Undo puts it back"
                onClick={() => removeWorktop(worktopHere.id)}
              >
                Remove
              </button>
            ) : null}
          </div>

          {/* ─── Turn 16 (CLAUDE.md F4.2): DOOR EXTEND, over a selection ───
              "The function is MISSING there entirely. Add it beside Add/Remove
              doors: one action, one undo step, same default-38-editable field,
              applied to every selected unit's doors."
              Beside them literally. Only the kits that HAVE the grab edge take
              it — a base unit has a worktop over its doors — and the count says
              how many that is rather than leaving a joiner to guess. */}
          {extendable > 0 && (
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end" data-bulk-door-extend="1">
              <div>
                <span className="cc-label">
                  Door extend (mm)
                  {extendCommon.mixed && <span className="ml-1 text-gold" data-mixed="door_extend">mixed</span>}
                </span>
                <NumberField
                  className="cc-input text-right"
                  min={0}
                  data-door-extend-mm="1"
                  value={extend}
                  title="How far every selected door runs below its carcass"
                  onCommit={setExtend}
                />
              </div>
              <button
                type="button"
                className="cc-btn"
                data-bulk="door-extend"
                title={`Give ${extendable} of them a ${formatMm(extend)} mm grab edge — one undo step`}
                onClick={() => {
                  const { applied, skipped } = setDoorExtendBulk(ids, extend) || {};
                  if (skipped) notify(`${skipped} of them have no grab edge to extend.`, 'info');
                }}
              >
                Apply ({extendable})
              </button>
              <button
                type="button"
                className="cc-btn"
                data-bulk="door-extend-off"
                title="Take the grab edge off every selected door"
                onClick={() => {
                  setDoorExtendBulk(ids, false);
                }}
              >
                Off
              </button>
            </div>
          )}
          <button
            type="button"
            className="cc-btn-gold w-full"
            data-bulk="colour"
            onClick={(e) => openModal('unit-finish', { unitIds: ids, anchor: anchorOfEvent(e) })}
          >
            Colour…
          </button>
        </div>

        <p className="text-[11px] text-ink-400">
          Right-click any of them for the rest — plinth, end panels, pinned fillers — all of which
          apply to the whole selection too.
        </p>
      </div>
    </aside>
  );
}
