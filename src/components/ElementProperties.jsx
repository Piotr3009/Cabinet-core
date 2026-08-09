import { useMemo } from 'react';
import { useProjectStore, elementDepthBoundsFor } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { useUiStore } from '../stores/uiStore.js';
import {
  elementActions, elementFields, elementLabel, boardParamFor,
} from '../engine/elements.js';
import { getUnitType } from '../engine/types.js';
import { elementMaterialChoices, migrateDesign } from '../engine/design.js';
import { formatMm, formatMmPair } from '../engine/format.js';
import NumberField from './NumberField.jsx';

// ─── The properties of ONE piece (turn 11, CLAUDE.md F3) ────────────────────
//
// Turn 9 gave a SHELF a properties block in the right panel. This is the same
// block for the whole cabinet — sides, bottom, top, back, vertical partitions,
// end panels, infills, the fronts — and it is ONE component because CLAUDE.md
// asks for the "same right-panel properties" and because two of them would
// drift the first time a field changed.
//
// It is used in two places and knows about neither: the right panel renders it
// under its own header, and the double-click modal renders it beside the piece
// (F3.3). What appears is decided by `engine/elements.js elementFields`, so a
// new field is an entry in that list and a case here, never a branch in a
// component that also lays out a panel.

export default function ElementProperties({
  unit, panel, item = null, compact = false, actions = false,
}) {
  const profile = useCabinetProfileStore((s) => s.profile);
  const materials = useMaterialAssignmentStore((s) => s.materials);
  const storedDesign = useProjectStore((s) => s.project.design);
  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);
  const notify = useUiStore((s) => s.notify);

  const updateUnitParams = useProjectStore((s) => s.updateUnitParams);
  const setShelfPos = useProjectStore((s) => s.setShelfPos);
  const setPartitionX = useProjectStore((s) => s.setPartitionX);
  const setElementDepth = useProjectStore((s) => s.setElementDepth);
  const setElementThickness = useProjectStore((s) => s.setElementThickness);
  const setElementMaterial = useProjectStore((s) => s.setElementMaterial);
  const setElementOverride = useProjectStore((s) => s.setElementOverride);
  const setPartitionFront = useProjectStore((s) => s.setPartitionFront);
  const updateEndPanel = useProjectStore((s) => s.updateEndPanel);
  const setEndPanelTop = useProjectStore((s) => s.setEndPanelTop);
  const endPanelToCeiling = useProjectStore((s) => s.endPanelToCeiling);
  const setSideInfillTop = useProjectStore((s) => s.setSideInfillTop);
  const setSideInfillPinned = useProjectStore((s) => s.setSideInfillPinned);
  const removeElement = useProjectStore((s) => s.removeElement);
  const moveElement = useProjectStore((s) => s.moveElement);

  const type = useMemo(() => getUnitType(unit.type), [unit.type]);
  const fields = useMemo(() => elementFields(panel, type), [panel, type]);
  const bounds = useMemo(() => elementDepthBoundsFor(unit, profile), [unit, profile]);
  const choices = useMemo(
    () => elementMaterialChoices(design, profile, materials),
    [design, profile, materials],
  );

  const G = unit.params.board_t ?? profile.board.thickness;
  const locked = Boolean(panel.meta?.locked);
  const endPanel = (unit.params.end_panels || []).find((ep) => ep.id === panel.meta?.panelId) || null;
  const infillSide = panel.meta?.side === 'right' ? 'R' : 'L';
  // What this piece is made of RIGHT NOW: the engine's own answer, which is the
  // override where there is one and the project's material where there is not.
  const materialLabel = panel.meta?.material_label || '';

  const setMaterial = (label) => {
    const pick = choices.find((c) => c.material_label === label) || null;
    // A shelf keeps its material on its ITEM (turn 9): that id survives the
    // shelf being dragged past its neighbours, and a panel id does not. Every
    // other piece is built BY the engine and has no item, so it is keyed by the
    // panel id the engine gave it (turn 11, F3.1).
    if (item) setElementMaterial(unit.id, item.id, pick);
    else {
      setElementOverride(unit.id, panel.id, {
        material_id: pick?.material_id ?? null,
        material_label: pick?.material_label ?? null,
      });
    }
  };

  const row = (key) => {
    switch (key) {
      case 'position-y':
        return (
          <Field key={key} label="Height">
            <NumberField
              className="cc-input text-right"
              value={item?.pos_mm ?? 0}
              disabled={locked}
              title={locked
                ? 'Screwed or locked — unlock it to move it'
                : 'Above the carcass floor. The same clamp the drag obeys.'}
              onCommit={(v) => setShelfPos(unit.id, item.id, v)}
            />
          </Field>
        );
      case 'position-x':
        return (
          <Field key={key} label="From the left">
            <NumberField
              className="cc-input text-right"
              value={item?.x_mm ?? 0}
              title="The partition's left face, from the outside of the left side panel"
              onCommit={(v) => setPartitionX(unit.id, item.id, v)}
            />
          </Field>
        );
      case 'setback':
        return (
          <Field key={key} label="Set back">
            <NumberField
              className="cc-input text-right"
              min={bounds.min}
              max={bounds.max}
              value={Number(panel.meta?.front_mm ?? profile.carcass.shelfDepthClearance)}
              title={`From the face of the cabinet. 0 is flush; ${formatMm(bounds.max)} leaves the shallowest piece worth cutting.`}
              onCommit={(v) => setElementDepth(unit.id, item.id, v)}
            />
          </Field>
        );
      case 'setback-unit':
        return (
          <Field key={key} label="Set back">
            <NumberField
              className="cc-input text-right"
              min={0}
              value={Number(panel.meta?.front_mm) || 0}
              title="From the face of the cabinet. 0 pulls the piece out flush."
              onCommit={(v) => setPartitionFront(unit.id, v)}
            />
          </Field>
        );
      case 'thickness':
        return (
          <Field key={key} label="Thickness">
            <NumberField
              className="cc-input text-right"
              min={profile.editor.mmStep}
              value={item?.thickness_mm ?? G}
              title="This piece only. A shelf carrying a microwave is thicker than the box round it."
              onCommit={(v) => setElementThickness(unit.id, item.id, v)}
            />
          </Field>
        );
      case 'thickness-ep':
        return (
          <Field key={key} label="Thickness">
            <NumberField
              className="cc-input text-right"
              min={1}
              value={endPanel?.thickness || unit.params.front_t || profile.front.thickness}
              title="This panel only — it carries no joint, so it may be any board"
              onCommit={(v) => endPanel && updateEndPanel(unit.id, endPanel.id, { thickness: v })}
            />
          </Field>
        );
      case 'end-panel-height':
        return (
          <Field key={key} label="Height">
            <select
              className="cc-input"
              value={endPanel?.height || 'floor'}
              onChange={(e) => endPanel && updateEndPanel(unit.id, endPanel.id, { height: e.target.value })}
            >
              <option value="floor">To floor</option>
              <option value="unit">Unit height</option>
            </select>
          </Field>
        );
      case 'above-unit-ep':
        return (
          <Field key={key} label="Above unit">
            <div className="flex gap-1">
              <NumberField
                className="cc-input text-right flex-1"
                min={0}
                value={Number(endPanel?.top_mm) || 0}
                title="How far this panel runs above the carcass (mm)"
                onCommit={(v) => endPanel && setEndPanelTop(unit.id, endPanel.id, v)}
              />
              <button
                type="button"
                className="cc-btn px-2"
                title="All the way to the ceiling"
                onClick={() => endPanel && endPanelToCeiling(unit.id, endPanel.id)}
              >
                ▲
              </button>
            </div>
          </Field>
        );
      case 'infill-width':
        return (
          <Field key={key} label="Width">
            <span className="cc-input block text-right opacity-70">{formatMm(panel.w)}</span>
          </Field>
        );
      case 'above-unit-infill':
        if (panel.meta?.side === 'top') return null;
        return (
          <Field key={key} label="Above unit">
            <NumberField
              className="cc-input text-right"
              min={0}
              value={Number(unit.params[infillSide === 'R' ? 'side_infill_right_top_mm' : 'side_infill_left_top_mm']) || 0}
              title="How far this filler runs above the carcass (mm)"
              onCommit={(v) => setSideInfillTop(unit.id, infillSide, v)}
            />
          </Field>
        );
      case 'pin-infill': {
        if (panel.meta?.side === 'top') return null;
        const pinned = unit.params[infillSide === 'R' ? 'side_infill_right_pinned' : 'side_infill_left_pinned'] === true;
        return (
          <div key={key} className="col-span-2">
            <button
              type="button"
              className={`cc-btn w-full ${pinned ? 'border-gold text-gold' : ''}`}
              title={pinned
                ? 'Pinned — it stays whatever the gap becomes. Click to hand it back to the automatics.'
                : 'Keep this filler whatever the gap becomes — it stretches as the unit moves'}
              onClick={() => setSideInfillPinned(unit.id, infillSide, !pinned)}
            >
              {pinned ? '✓ Pinned' : 'Pin this filler'}
            </button>
          </div>
        );
      }
      case 'carcass-board':
      case 'front-board': {
        const param = boardParamFor(panel);
        const options = param === 'front_t'
          ? profile.front.thicknessOptions
          : profile.board.thicknessOptions;
        return (
          <Field key={key} label={param === 'front_t' ? 'Front board' : 'Carcass board'}>
            <select
              className="cc-input"
              value={unit.params[param]}
              title={param === 'front_t'
                ? 'The board every front of this cabinet is cut from'
                : 'The board the carcass is cut from. The joint is cut FOR it, so it is one board for all four.'}
              onChange={(e) => {
                const { notices } = updateUnitParams(unit.id, { [param]: Number(e.target.value) });
                for (const n of notices) notify(n, 'warn');
              }}
            >
              {options.map((t) => <option key={t} value={t}>{t} mm</option>)}
            </select>
          </Field>
        );
      }
      // ─── Turn 14 (CLAUDE.md F4.2): the door's own property, on the door ───
      // It was in the cabinet's carcass block, three sections away from the
      // thing it is about — which is how the owner came to report it missing.
      // The engine is untouched: `door_extend` is the param it has always been.
      case 'door-extend':
        return (
          <div key={key} className="col-span-2">
            <label className="flex items-center gap-2 text-sm text-ink-100">
              <input
                type="checkbox"
                data-door-extend="1"
                checked={Boolean(unit.params.door_extend)}
                onChange={(e) => updateUnitParams(unit.id, { door_extend: e.target.checked })}
              />
              <span>Door extend +{formatMm(profile.wallUnit.doorExtend)}</span>
            </label>
            <p className="text-[11px] text-ink-400">
              The front runs this far below the carcass — the handleless grab edge. Every door of this
              cabinet, because they are cut as a set.
            </p>
          </div>
        );
      case 'masking-depth':
        return (
          <Field key={key} label="Depth">
            <span className="cc-input block text-right opacity-70">{formatMm(panel.box?.d ?? panel.h)}</span>
          </Field>
        );
      case 'hinge-side':
        return (
          <Field key={key} label="Hinge side">
            <select
              className="cc-input"
              value={unit.params.hinge}
              onChange={(e) => updateUnitParams(unit.id, { hinge: e.target.value })}
            >
              <option value="L">Left</option>
              <option value="R">Right</option>
            </select>
          </Field>
        );
      case 'drawer-height':
        return (
          <Field key={key} label="Front height">
            <span className="cc-input block text-right opacity-70">{formatMm(panel.h)}</span>
          </Field>
        );
      case 'plinth-height':
        return (
          <Field key={key} label="Height">
            <span className="cc-input block text-right opacity-70">{formatMm(panel.h)}</span>
          </Field>
        );
      // ─── Turn 14 (CLAUDE.md F4.1) ───
      // "material/colour from the unit palette per turn 13 F3". The LIST was
      // already the palette — the project's carcass slots and its fronts, and
      // deliberately not a decor catalogue — and what it was missing is the
      // half a joiner actually recognises: the colour. Each option now carries
      // its own hex (engine/design.js), so the row shows what it means.
      case 'material':
        return (
          <Field key={key} label="Material">
            <div className="flex items-center gap-1">
              <span
                className="w-4 h-4 rounded border border-shell-600 shrink-0"
                data-element-swatch="1"
                style={{ background: (choices.find((c) => c.material_label === materialLabel)?.hex) || 'transparent' }}
                title={materialLabel || 'Project default'}
              />
              <select
                className="cc-input flex-1"
                value={materialLabel}
                title="This piece only — the project's own palette: its boards, and its fronts"
                onChange={(e) => setMaterial(e.target.value)}
              >
                <option value="">Project default</option>
                {choices.map((c) => (
                  <option key={c.key} value={c.material_label}>{c.material_label}</option>
                ))}
              </select>
            </div>
          </Field>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      <div className="cc-row">
        <span className="text-xs uppercase tracking-wide text-gold">{elementLabel(panel)}</span>
        <span className="text-[11px] text-ink-400 flex-1 pl-2 text-right font-mono">{panel.id}</span>
      </div>
      <div className="text-[11px] text-ink-400">
        {formatMmPair(panel.w, panel.h)} · {formatMm(panel.thickness)} mm
        {panel.meta?.material_label ? ` · ${panel.meta.material_label}` : ''}
      </div>

      <div className={compact ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-2 gap-2'}>
        {fields.map(row)}
      </div>

      {/* ─── Turn 14 (CLAUDE.md F8.2): WHAT MAY BE DONE TO IT ───
          Shown in the editor window, which is where a joiner has the piece in
          his hand. Where the physics refuses, it SAYS SO — the #58 pattern: a
          control that is simply absent teaches nothing, and a greyed one with
          no reason teaches less. */}
      {actions && <ElementActions unit={unit} panel={panel} onRemove={removeElement} onMove={moveElement} />}

      {/* Why some pieces have no thickness of their own. Written where the
          question is asked rather than in a document nobody opens: a joiner
          looking for the field is owed the reason it is not there. */}
      {fields.includes('carcass-board') && (
        <p className="text-[11px] text-ink-400">
          The carcass is held together by tabs cut for this board — the tab is one thickness wide and the
          socket is on its centre line. One board for all four, or the joint does not go together.
        </p>
      )}
      {!fields.includes('material') && (
        <p className="text-[11px] text-ink-400">
          This piece is built from the drawers under it. Change the stack to change the piece.
        </p>
      )}
    </div>
  );
}

/**
 * Edit / move / remove, and the reason where the answer is no.
 *
 * The rule is `engine/elements.js elementActions` — pure, and tested there —
 * so this component decides nothing about physics: it draws the answer.
 */
function ElementActions({ unit, panel, onRemove, onMove }) {
  const rules = elementActions(panel);
  const moved = panel.meta?.moved || { x: 0, y: 0, z: 0 };
  return (
    <div className="border-t border-shell-600 pt-2 space-y-1" data-element-actions="1">
      <span className="cc-label">Actions</span>
      {rules.move.allowed ? (
        <div className="grid grid-cols-3 gap-1" data-element-move="1">
          {[['x', 'Across'], ['y', 'Up'], ['z', 'In']].map(([axis, label]) => (
            <label key={axis} className="block">
              <span className="text-[10px] text-ink-400">{label}</span>
              <NumberField
                className="cc-input text-right"
                value={Number(moved[axis]) || 0}
                title={`Offset from where the kit puts this piece, in the cabinet's own ${label.toLowerCase()} direction. 0 puts it back.`}
                onCommit={(v) => onMove(unit.id, panel.id, { ...moved, [axis]: v })}
              />
            </label>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-ink-400">{rules.move.reason}</p>
      )}
      {rules.remove.allowed ? (
        <button
          type="button"
          className="cc-btn w-full text-status-danger"
          data-element-remove="1"
          title="Take this piece off. It leaves the cut list with it."
          onClick={() => onRemove(unit.id, panel.id)}
        >
          Remove this piece
        </button>
      ) : (
        <p className="text-[11px] text-ink-400">
          <span className="text-ink-200">Cannot be removed.</span> {rules.remove.reason}
        </p>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="cc-label">{label}</span>
      {children}
    </label>
  );
}
