import { useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import ElementProperties from './ElementProperties.jsx';
import { elementLabel } from '../engine/elements.js';
import { anchorAtPoint } from '../lib/modalAnchor.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { panelWeight } from '../engine/lifts.js';
import { resolvePanelMaterial } from '../engine/materials.js';
import { migrateDesign } from '../engine/design.js';
import { formatMm, roundTo } from '../engine/format.js';
import { HANDLE_TYPES, handleClassOf } from '../engine/handles.js';
import { getUnitType } from '../engine/types.js';
import NumberField from './NumberField.jsx';

// ─── Double-click a piece (turn 11, CLAUDE.md F3.3) ─────────────────────────
//
// "Double-click any element → opens an edit MODAL next to the element AND
// focuses the right panel on it. Single click keeps selecting only."
//
// ─── TURN 12 (CLAUDE.md rule 15 / F2): THROUGH THE SHELL ───
// Turn 11 wrote this as a floating card of its own precisely BECAUSE the app's
// `Modal` was a centred dialog with a backdrop — the wrong shape for "that
// shelf, there". Rule 15 makes that the shape of every modal instead, so the
// special case is gone: the shell places this beside the piece that was
// double-clicked, and the same three lines now also make it draggable, which is
// what the owner asked for and what this card never had.
//
// It shares its CONTENTS with the right panel — one `ElementProperties`, so the
// two can never offer different fields for the same piece.

export default function ElementModal() {
  const args = useUiStore((s) => s.modalArgs);
  const closeModal = useUiStore((s) => s.closeModal);
  const units = useProjectStore((s) => s.units);
  const unitResult = useProjectStore((s) => s.unitResult);

  const unit = units.find((u) => u.id === args?.unitId) || null;
  const result = unit ? unitResult(unit.id) : null;
  const panel = result?.panels.find((p) => p.id === args?.panelId) || null;
  const item = useMemo(() => {
    const id = panel?.meta?.itemId;
    if (!id) return null;
    return (unit?.params.sections?.[0]?.items || []).find((i) => i.id === id) || null;
  }, [panel, unit]);

  // The piece was pointed at, so the point IS the object as far as the screen
  // is concerned: a rectangle of zero size at the click (lib/modalAnchor.js).
  const anchor = useMemo(
    () => args?.anchor || anchorAtPoint(args?.at?.x, args?.at?.y),
    [args],
  );

  if (!unit || !panel) return null;

  return (
    <Modal
      // Turn 14 (CLAUDE.md F4): the window says WHICH piece it is about. With
      // doors, end panels and fillers all opening one of these directly, "edit
      // piece" is the one thing the title must not say.
      title={`${unit.params.unit_num} · ${elementLabel(panel) || 'piece'}`}
      onClose={closeModal}
      anchor={anchor}
      width="w-[320px]"
    >
      <ElementProperties unit={unit} panel={panel} item={item} compact />
      {/* ─── Turn 25 (CLAUDE.md F4): ADD HANDLE ───
          Two questions and no more: which TYPE, and — for a bar — the screw
          CENTRES. Where it goes is the owner's law and not a field
          (engine/handles.js); what a person may change is the OFFSET off it,
          and changing that moves every front of the same class in the project
          unless they say otherwise. */}
      <HandleSection unit={unit} panel={panel} />
      {/* ─── Turn 25 (CLAUDE.md F11): REMOVE DOOR ───
          At the BOTTOM, separated by a rule. No confirmation — Undo covers it. */}
      {/* ─── Turn 25 (CLAUDE.md F13): the same toggle the View menu carries ───
          "in the door modal AND in the View menu, scoped to the whole project".
          One piece of state, two places to reach it — so it cannot be on in one
          and off in the other. */}
      <FrontDimensionsToggle panel={panel} />
      <RemoveDoor unit={unit} panel={panel} onDone={closeModal} />
      {/* ─── Turn 19 (CLAUDE.md F5.1): WHAT IT WEIGHS ─────────────────────────
          The footer of the detail window. It is here because it is the one
          number turn 19 owes the lift engine that a person can see today: an
          AVENTOS is chosen on the weight of the front, and a joiner who cannot
          see the weight cannot argue with the proposal turn 20 will make. The
          arithmetic is the engine's (engine/lifts.js `panelWeight`) — the board
          the piece is actually cut from, its own thickness, its own area. */}
      <PieceWeight unit={unit} panel={panel} />
      <p className="text-[11px] text-ink-400 mt-2">
        The same fields are in the right-hand panel, which is already showing this piece.
      </p>
    </Modal>
  );
}

/**
 * WHAT THIS PIECE WEIGHS (turn 19, CLAUDE.md F5.1).
 *
 * "Derived: a front's weight in kg (area × kg_m2), shown in the element detail
 * footer." Every piece gets the line, not only a front: the same arithmetic is
 * true of a shelf and a joiner lifting a 25 mm oak one up a stairwell has the
 * same question. What the LIFT engine will use it for (turn 20) is the fronts.
 *
 * It says WHERE the figure came from, because that is the difference between a
 * number and a guess: an assigned board's own kg/m², or the workshop's table —
 * and when the table has no row for this thickness, the nearest board it does
 * have, said out loud rather than rounded in silence.
 */
function PieceWeight({ unit, panel }) {
  const profile = useCabinetProfileStore((s) => s.profile);
  const materials = useMaterialAssignmentStore((s) => s.materials);
  const storedDesign = useProjectStore((s) => s.project.design);
  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);

  const weight = useMemo(() => {
    const material = resolvePanelMaterial(panel, unit, design, profile, materials);
    return panelWeight({
      panel, material, materials, profile,
    });
  }, [panel, unit, design, profile, materials]);

  if (!weight.kg) return null;
  return (
    <p className="text-[11px] text-ink-400 mt-2" data-piece-weight={roundTo(weight.kg, 2)}>
      Weight <span className="text-ink-100">{roundTo(weight.kg, 2)} kg</span>
      {' — '}
      {formatMm(panel.w)} × {formatMm(panel.h)} at {weight.kgM2} kg/m²
      {weight.source === 'stock'
        ? ', from the assigned board.'
        : `, from the workshop's ${weight.kind === 'mdf_lacquered' ? 'lacquered MDF' : 'MFC'} table${weight.exact ? '.' : ' — nearest thickness, no board assigned yet.'}`}
    </p>
  );
}

// ─── HANDLES (turn 25, CLAUDE.md F4) ────────────────────────────────────────

/**
 * The handle section of a front's modal.
 *
 * F4 asks for exactly two questions — TYPE and, for a bar, SCREW CENTRES — and
 * this asks them and no more. Where the handle goes is the owner's law
 * (`engine/handles.js`) and is shown rather than asked; what a person may edit
 * is the OFFSET off that reference, and that is where F4.4 lives:
 *
 *   MOVING ONE MOVES ALL. A new position applies to every front of the same
 *   CLASS in the project — a kitchen's handles must line up — behind a
 *   confirmation naming the count. Unticking `apply to all` confines it to this
 *   front, which then wears a DEVIATION BADGE, the same grammar turn 19 gave a
 *   per-hinge override.
 */
function HandleSection({ unit, panel }) {
  const profile = useCabinetProfileStore((s) => s.profile);
  const storedDesign = useProjectStore((s) => s.project.design);
  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);
  const setProjectHandle = useProjectStore((s) => s.setProjectHandle);
  const setFrontHandle = useProjectStore((s) => s.setFrontHandle);
  const moveHandleClass = useProjectStore((s) => s.moveHandleClass);
  const handleClassCountOf = useProjectStore((s) => s.handleClassCountOf);
  const notify = useUiStore((s) => s.notify);
  const [applyToAll, setApplyToAll] = useState(true);

  const spec = panel?.meta?.handle || null;
  const handleClass = useMemo(
    () => handleClassOf(panel, getUnitType(unit.type)),
    [panel, unit.type],
  );
  if (!handleClass) return null;

  const project = design.fronts.handle;
  const own = unit.params.front_handles?.[panel.id] || null;
  const type = own?.type || project?.type || 'bar';
  const centres = Number(own?.centres || project?.centres) || profile.handles.defaultCentres;

  const add = (patch) => {
    const next = { type, centres, ...patch };
    if (applyToAll) {
      setProjectHandle(next);
      setFrontHandle(unit.id, panel.id, null);
    } else {
      setFrontHandle(unit.id, panel.id, next);
    }
  };

  const nudge = (axis, mm) => {
    const base = own?.offset || design.fronts.handleOffsets?.[handleClass] || { x: 0, y: 0 };
    const offset = { ...base, [axis]: (Number(base[axis]) || 0) + mm };
    if (!applyToAll) {
      setFrontHandle(unit.id, panel.id, { type, centres, offset });
      notify(`Handle moved on this front only — it now differs from the other ${handleClass.replace('-', ' ')}s.`);
      return;
    }
    const count = handleClassCountOf(handleClass);
    // The confirmation NAMES THE COUNT (F4.4). It is counted off the computed
    // units, so it is the fronts that exist rather than a guess.
    // eslint-disable-next-line no-alert, no-restricted-globals
    const ok = typeof window === 'undefined' || window.confirm(
      `This moves handles on ${count.total} front${count.total === 1 ? '' : 's'}`
      + `${count.deviating ? ` (${count.deviating} with a handle of their own will not move)` : ''}.`,
    );
    if (!ok) return;
    moveHandleClass(handleClass, offset);
  };

  return (
    <div className="mt-2 pt-2 border-t border-shell-600 space-y-2" data-handle-section={handleClass}>
      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide text-ink-400">Handle</span>
        {spec?.deviation && (
          <span
            className="text-[10px] px-1 rounded border border-gold text-gold"
            data-handle-deviation={panel.id}
            title="This front has a handle of its own — it does not follow the project."
          >
            own
          </span>
        )}
      </div>

      {!spec && (
        <div className="flex gap-1">
          {HANDLE_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="cc-btn px-2 text-[11px]"
              data-add-handle={t.id}
              title={t.hint}
              onClick={() => add({ type: t.id })}
            >
              Add {t.label.toLowerCase()}
            </button>
          ))}
        </div>
      )}

      {spec && (
        <>
          <div className="flex items-center gap-1 flex-wrap">
            {HANDLE_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`cc-btn px-2 text-[11px] ${type === t.id ? 'border-gold text-ink-50' : ''}`}
                data-handle-type={t.id}
                onClick={() => add({ type: t.id })}
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              className="cc-btn px-2 text-[11px] ml-auto"
              data-remove-handle={panel.id}
              onClick={() => { setProjectHandle(null); setFrontHandle(unit.id, panel.id, null); }}
            >
              Remove
            </button>
          </div>

          {type === 'bar' && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] text-ink-400">Centres</span>
              {profile.handles.barCentres.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`cc-btn px-1 text-[11px] ${centres === c ? 'border-gold text-ink-50' : ''}`}
                  data-handle-centres={c}
                  onClick={() => add({ centres: c })}
                >
                  {c}
                </button>
              ))}
              <NumberField
                className="cc-input w-16"
                value={centres}
                min={16}
                max={1200}
                onCommit={(v) => add({ centres: v })}
              />
            </div>
          )}

          <p className="text-[11px] text-ink-400" data-handle-rule={spec.rule}>
            {formatMm(spec.x)} × {formatMm(spec.y)} from the bottom-left · {spec.rule.replace(/-/g, ' ')}
            {spec.problem ? ` · ${spec.problem}` : ''}
          </p>

          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] text-ink-400">Move</span>
            {[['x', -10], ['x', 10], ['y', -10], ['y', 10]].map(([axis, mm]) => (
              <button
                key={`${axis}${mm}`}
                type="button"
                className="cc-btn px-1 text-[11px]"
                data-handle-nudge={`${axis}${mm > 0 ? '+' : ''}${mm}`}
                onClick={() => nudge(axis, mm)}
              >
                {axis}{mm > 0 ? '+' : ''}{mm}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1 text-[11px] text-ink-400">
            <input
              type="checkbox"
              checked={applyToAll}
              data-handle-apply-all
              onChange={(e) => setApplyToAll(e.target.checked)}
            />
            Apply to all {handleClass.replace(/-/g, ' ')}s in the project
          </label>
        </>
      )}
    </div>
  );
}

/**
 * ─── REMOVE DOOR (turn 25, CLAUDE.md F11) ───────────────────────────────────
 *
 * At the bottom, separated by a rule. No confirmation dialog — Undo covers it,
 * and a dialog in front of an action that is one Ctrl+Z away is a dialog that
 * only ever gets dismissed.
 *
 * R9 does the rest: the hinge holes leave with the door and return with it, in
 * the same recompute, because they only ever existed while it did.
 */
function RemoveDoor({ unit, panel, onDone }) {
  const removeFront = useProjectStore((s) => s.removeFront);
  const notify = useUiStore((s) => s.notify);
  if (panel?.part !== 'FRONT' || panel?.meta?.appliance) return null;
  return (
    <div className="mt-2 pt-2 border-t border-shell-600">
      <button
        type="button"
        className="cc-btn px-2 text-[11px] text-red-300"
        data-remove-door={panel.id}
        onClick={() => {
          const res = removeFront(unit.id, panel.id);
          if (res) notify(res.scope === 'bay' ? 'Door removed from the bay.' : 'Doors removed.');
          onDone?.();
        }}
      >
        Remove door
      </button>
    </div>
  );
}

/**
 * ─── SHOW FRONT DIMENSIONS (turn 25, CLAUDE.md F13) ─────────────────────────
 *
 * Scoped to the WHOLE PROJECT, and the label says so: a joiner ticking it on
 * one door and finding numbers on fourteen would think it broken, and the
 * sentence under it is what stops that. It is the owner's own choice of scope —
 * the numbers this is for are the GAPS, and a gap belongs to two fronts at once.
 */
function FrontDimensionsToggle({ panel }) {
  const showFrontDimensions = useUiStore((s) => s.showFrontDimensions);
  const toggleFrontDimensions = useUiStore((s) => s.toggleFrontDimensions);
  if (panel?.role !== 'front') return null;
  return (
    <label className="flex items-start gap-1.5 mt-2 pt-2 border-t border-shell-600 text-[11px] text-ink-400">
      <input
        type="checkbox"
        className="mt-0.5"
        data-front-dimensions
        checked={showFrontDimensions}
        onChange={toggleFrontDimensions}
      />
      <span>
        <span className="text-ink-100">Show front dimensions</span>
        {' — '}
        every front&apos;s width and height and the gaps around it, for the whole project.
      </span>
    </label>
  );
}
