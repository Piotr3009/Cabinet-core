import { useMemo, useState } from 'react';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { useSettingsSetsStore } from '../stores/settingsSetsStore.js';
import { useUiStore } from '../stores/uiStore.js';
import {
  FRONT_STYLE_OPTIONS, migrateDesign, projectHeights,
} from '../engine/design.js';
import { getProjectType } from '../engine/projectTypes.js';
import {
  ceilingFit, materialsAssigned, projectDepth, projectDimensions, wardrobeStack,
} from '../engine/projectSettings.js';
import FrontStyleGallery, { FrontStyleArt } from './FrontStyleGallery.jsx';
import DecorPicker from './DecorPicker.jsx';
import SheenSlider from './SheenSlider.jsx';
import NumberField from './NumberField.jsx';

// ─── TURN 32 (CLAUDE.md F1): STEP 4, ONE SCREEN, NO SCROLLING ───────────────
//
// The owner walked the old step 4 (the full Design Settings panel embedded in
// the wizard) on a screenshot and dictated this shape instead:
//
//   1. Number · Client · Type — the type is a LABEL here, chosen in step 2.
//   2. Saved settings sets as a LOAD list, not only "Keep as…".
//   3. Dimensions, per project type — a wardrobe answers height + plinth with
//      a live total and the ceiling guards; everything else keeps the five.
//   4. FRONTS BEFORE MATERIALS — "shape first, colour second".
//   5. Materials: ONE picker — EGGER tiles ∪ stock materials. The mock
//      swatches are gone from this step. No assignment → no Start.
//   6. Sheen after colours. Ironmongery is NOT here — it is step 5 (F2).
//
// The turn-12 lesson holds: this is a NEW SURFACE, never a copy of the store.
// Every control writes through the same setters Design Settings uses, so a
// colour chosen here is the colour the scene renders and the cut list prices.
// The full panel stays in the Settings menu, untouched.

const isWardrobeType = (id) => id === 'wardrobe';

function SectionLabel({ children }) {
  return <span className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">{children}</span>;
}

export default function WizardSettings({ onRoomSetup }) {
  const project = useProjectStore((s) => s.project);
  const storedDesign = useProjectStore((s) => s.project.design);
  const setProjectInfo = useProjectStore((s) => s.setProjectInfo);
  const setDesign = useProjectStore((s) => s.setDesign);
  const setProjectDefaults = useProjectStore((s) => s.setProjectDefaults);
  const setProjectHeights = useProjectStore((s) => s.setProjectHeights);
  const setFrontTypes = useProjectStore((s) => s.setFrontTypes);
  const setFrontType = useProjectStore((s) => s.setFrontType);
  const setCarcassSource = useProjectStore((s) => s.setCarcassSource);
  const setCarcassMaterial = useProjectStore((s) => s.setCarcassMaterial);
  const setCarcassFinish = useProjectStore((s) => s.setCarcassFinish);
  const setFrontMaterial = useProjectStore((s) => s.setFrontMaterial);
  const profile = useCabinetProfileStore((s) => s.profile);
  const materials = useMaterialAssignmentStore((s) => s.materials);
  const sets = useSettingsSetsStore((s) => s.sets);
  const applyTo = useSettingsSetsStore((s) => s.applyTo);
  const notify = useUiStore((s) => s.notify);

  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);
  const heights = useMemo(() => projectHeights(design, profile), [design, profile]);
  const type = getProjectType(design.projectType);
  const wardrobe = isWardrobeType(design.projectType);
  const roomHeight = Number(project.room?.height) || 0;

  // One accordion at a time — the screen must not scroll, so only one slot's
  // gallery or picker is ever open, and it scrolls inside itself.
  const [open, setOpen] = useState(null); // { kind:'style'|'material', slot:'front'|'carcass', id }
  const toggle = (kind, slot, id) => setOpen((o) => (
    o && o.kind === kind && o.slot === slot && o.id === id ? null : { kind, slot, id }
  ));

  const frontTypes = design.fronts.types.length ? design.fronts.types : [{
    id: 'f1', label: 'Front 1', style: null, material_id: null, finish_id: null, colour: design.colour.front,
  }];
  const carcassTypes = design.carcass.types;
  const assignment = materialsAssigned(design, profile);
  const boardMaterials = materials.filter((m) => m.category === 'board' || m.category === 'front');

  const stack = wardrobeStack(heights);
  const fit = wardrobe ? ceilingFit({ total: stack.total, roomHeight, profile }) : { gap: null, state: 'ok' };

  const loadSet = (id, name) => {
    const next = applyTo(design, id);
    if (!next) { notify('That settings set is no longer on this computer.', 'warn'); return; }
    setDesign(next);
    notify(`"${name}" loaded — this step and Hardware are filled from it.`, 'ok');
  };

  const styleOf = (t) => FRONT_STYLE_OPTIONS.find((o) => o.id === (t.style || design.fronts.style)) || null;
  const materialSummary = (t, kindLabel) => {
    const board = materials.find((m) => m.id === t.material_id) || null;
    if (board) return `${board.name}${board.placeholder ? ' (generic)' : ''}`;
    if (t.finish_id) return `EGGER · ${String(t.finish_id).replace(/^decor:/, '')}`;
    if (t.colour?.name || t.colour?.hex) return t.colour.name || t.colour.hex;
    return `no ${kindLabel} material yet`;
  };

  const pickDecorFor = (slot, id) => {
    if (slot.kind === 'carcass') {
      // The source first, so the facing is one the source can mean.
      setCarcassSource(slot.id, 'egger');
      setCarcassFinish(slot.id, id);
    } else {
      setFrontType(slot.id, { source: 'laminate', finish_id: id });
    }
  };
  const pickBoardFor = (slot, materialId) => {
    if (slot.kind === 'carcass') setCarcassMaterial(slot.id, materialId);
    else setFrontMaterial(slot.id, materialId);
  };

  const materialSlots = [
    ...carcassTypes.map((t) => ({ kind: 'carcass', id: t.id, label: t.label, record: t })),
    ...frontTypes.map((t) => ({ kind: 'front', id: t.id, label: t.label, record: t })),
  ];
  const openSlot = open?.kind === 'material'
    ? materialSlots.find((s) => s.kind === open.slot && s.id === open.id) || null
    : null;
  const openStyleSlot = open?.kind === 'style'
    ? frontTypes.find((t) => t.id === open.id) || null
    : null;

  return (
    <div className="space-y-3" data-wizard-settings="1">
      {/* ── 1 · Number · Client · Type — the type is a label, never a second dropdown ── */}
      <div className="grid grid-cols-[150px_1fr_180px] gap-3 items-end">
        <label className="block">
          <span className="cc-label">Number</span>
          <input
            className="cc-input"
            value={project.number || ''}
            onChange={(e) => setProjectInfo({ number: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="cc-label">Client</span>
          <input
            className="cc-input"
            value={project.client || ''}
            onChange={(e) => setProjectInfo({ client: e.target.value })}
          />
        </label>
        <div className="block">
          <span className="cc-label">Type</span>
          <span
            className="cc-input flex items-center text-gold cursor-default select-none"
            title="Chosen in step 2 — go Back to change it"
            data-wizard-type-label="1"
          >
            {type.label}
          </span>
        </div>
      </div>

      {/* ── 2 · Saved settings sets — a LOAD list, at the top ── */}
      {sets.length > 0 && (
        <div data-wizard-sets="1">
          <SectionLabel>Load saved settings</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {sets.map((s) => (
              <button
                key={s.id}
                type="button"
                className="cc-btn px-2"
                title="Fills this step and the Hardware step completely"
                data-set-load={s.id}
                onClick={() => loadSet(s.id, s.name)}
              >
                ↧ {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 3 · Dimensions, per project type ── */}
      <div data-wizard-dimensions="1">
        <div className="cc-row">
          <SectionLabel>Dimensions</SectionLabel>
          <span className="flex-1" />
          <span className="text-[10px] text-ink-400 mr-2">
            {design.scope === 'room' ? 'Room' : 'Wall'} height: {roomHeight || '—'} mm
          </span>
          {onRoomSetup && (
            <button type="button" className="cc-btn px-2" data-room-setup="1" onClick={onRoomSetup}>
              Room setup…
            </button>
          )}
        </div>
        {wardrobe ? (
          <div className="space-y-1.5">
            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="cc-label">Default height of wardrobe</span>
                <NumberField
                  value={heights.tall}
                  min={profile.projectHeights.min}
                  max={profile.projectHeights.max}
                  onCommit={(v) => setProjectHeights({ tall: v })}
                  data-wizard-dim="tall"
                />
              </label>
              <label className="block">
                <span className="cc-label">Plinth height</span>
                <NumberField
                  value={heights.toeKick}
                  min={profile.projectHeights.toeKickMin ?? 0}
                  max={profile.projectHeights.max}
                  onCommit={(v) => setProjectHeights({ toeKick: v })}
                  data-wizard-dim="toeKick"
                />
              </label>
              <label className="block">
                <span className="cc-label">Depth (all units)</span>
                <NumberField
                  value={projectDepth(design, profile)}
                  min={100}
                  max={1000}
                  onCommit={(v) => setProjectDefaults({ depth: v })}
                  data-wizard-dim="depth"
                />
              </label>
            </div>
            <p className="text-[11px] text-ink-200" data-total-line="1">
              total item = wardrobe + legs = <span className="text-gold">{stack.total} mm</span>
            </p>
            {fit.state === 'over' && (
              <p className="text-[11px] text-status-danger border border-status-danger/60 bg-status-danger/10 rounded px-2 py-1" data-ceiling-error="1">
                Total item {stack.total} mm is {Math.abs(fit.gap)} mm taller than the {roomHeight} mm room — lower
                the wardrobe or the plinth to continue.
              </p>
            )}
            {fit.state === 'question' && (
              <div className="border border-gold/60 bg-gold/5 rounded px-2 py-1.5 space-y-1" data-ceiling-question="1">
                <p className="text-[11px] text-gold">
                  Only {fit.gap} mm to the ceiling. To the ceiling, with no infill?
                </p>
                <p className="text-[10px] text-ink-400">
                  An infill can be scribed to the ceiling&rsquo;s real shape — ceilings are rarely straight.
                </p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className={`cc-btn px-2 ${design.ceiling === 'flush' ? 'border-gold text-gold' : ''}`}
                    data-ceiling-answer="flush"
                    onClick={() => setDesign({ ceiling: 'flush' })}
                  >
                    Yes — to the ceiling
                  </button>
                  <button
                    type="button"
                    className={`cc-btn px-2 ${design.ceiling === 'infill' ? 'border-gold text-gold' : ''}`}
                    data-ceiling-answer="infill"
                    onClick={() => setDesign({ ceiling: 'infill' })}
                  >
                    No — keep an infill
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {projectDimensions(design, profile, heights).map((d) => (
              <label key={d.key} className="block">
                <span className="cc-label">{d.label}</span>
                <NumberField
                  value={d.value}
                  onCommit={(v) => {
                    if (d.key === 'depth') { setProjectDefaults({ depth: v }); return; }
                    const { notices } = setProjectHeights({ [d.key]: v });
                    for (const n of notices) notify(n, 'warn');
                  }}
                  data-wizard-dim={d.key}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* ── 4 · FRONTS BEFORE MATERIALS — shape first, colour second ── */}
      <div data-wizard-fronts="1">
        <div className="cc-row">
          <span className="text-[11px] text-ink-200">How many front types in this project?</span>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              className={`cc-btn px-2.5 ${frontTypes.length === n ? 'border-gold text-gold' : ''}`}
              data-front-count={n}
              onClick={() => setFrontTypes(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <div className={`grid gap-2 mt-1.5 ${frontTypes.length === 1 ? 'grid-cols-1' : frontTypes.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {frontTypes.map((t) => {
            const st = styleOf(t);
            const opened = open?.kind === 'style' && open.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`border rounded p-1.5 flex items-center gap-2 text-left transition-colors ${opened
                  ? 'border-gold bg-shell-700' : 'border-shell-600 hover:bg-shell-700'}`}
                data-style-slot={t.id}
                onClick={() => toggle('style', 'front', t.id)}
              >
                <span className="w-8 h-10 shrink-0"><FrontStyleArt styleId={t.style || design.fronts.style} className="w-full h-full" /></span>
                <span className="min-w-0">
                  <span className="block text-[11px] text-ink-50">{t.label}</span>
                  <span className="block text-[10px] text-ink-400 truncate">
                    {st ? st.label : 'Pick a style'}{t.style ? '' : ' (project default)'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {openStyleSlot && (
          <div className="mt-1.5 border border-shell-600 rounded p-2" data-style-gallery-for={openStyleSlot.id}>
            <FrontStyleGallery
              value={openStyleSlot.style || design.fronts.style}
              onPick={(id) => {
                setFrontType(openStyleSlot.id, { style: id });
                // Slot 1's shape IS the project's shape — the field every
                // pre-T32 reader (door styles, drawings) still reads.
                if (frontTypes[0] && openStyleSlot.id === frontTypes[0].id) {
                  setProjectDefaults({ fronts: { style: id } });
                }
              }}
            />
          </div>
        )}
      </div>

      {/* ── 5 · Materials — ONE picker: EGGER tiles ∪ stock materials ── */}
      <div data-wizard-materials="1">
        <SectionLabel>Materials</SectionLabel>
        <div className="space-y-1">
          {materialSlots.map((slot) => {
            const t = slot.record;
            const assigned = assignment[slot.kind === 'carcass' ? 'carcass' : 'fronts']
              .find((a) => a.id === slot.id)?.assigned || false;
            const board = materials.find((m) => m.id === t.material_id) || null;
            const opened = open?.kind === 'material' && open.slot === slot.kind && open.id === slot.id;
            return (
              <div key={`${slot.kind}:${slot.id}`} className="cc-row">
                <span className="w-20 text-[11px] text-ink-200 shrink-0">{slot.label}</span>
                <span className={`flex-1 text-[11px] truncate ${assigned ? 'text-ink-400' : 'text-status-warn'}`}>
                  {materialSummary(t, slot.kind)}
                  {board?.placeholder ? ' — geometry only, assign a real board before check-out' : ''}
                </span>
                <button
                  type="button"
                  className={`cc-btn px-2 ${opened ? 'border-gold text-gold' : ''}`}
                  data-material-slot={`${slot.kind}:${slot.id}`}
                  onClick={() => toggle('material', slot.kind, slot.id)}
                >
                  Choose…
                </button>
              </div>
            );
          })}
        </div>
        {openSlot && (
          <div className="mt-1.5 border border-shell-600 rounded p-2 space-y-2" data-material-picker-for={`${openSlot.kind}:${openSlot.id}`}>
            <div className="cc-row">
              <span className="text-[11px] text-ink-400 shrink-0">Stock board</span>
              <select
                className="cc-input flex-1"
                value={openSlot.record.material_id || ''}
                onChange={(e) => pickBoardFor(openSlot, e.target.value || null)}
              >
                <option value="">No stock board…</option>
                <optgroup label="Generic — geometry only, assign a real board before check-out">
                  {boardMaterials.filter((m) => m.placeholder).map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Stock">
                  {boardMaterials.filter((m) => !m.placeholder).map((m) => (
                    <option key={m.id} value={m.id}>
                      {`${m.code ? `${m.code} · ` : ''}${m.name}`}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="max-h-[240px] overflow-auto cc-scroll">
              <DecorPicker
                value={openSlot.record.finish_id}
                onPick={(id) => pickDecorFor(openSlot, id)}
                onClear={() => (openSlot.kind === 'carcass'
                  ? setCarcassFinish(openSlot.id, null)
                  : setFrontType(openSlot.id, { finish_id: null }))}
              />
            </div>
          </div>
        )}
        {!assignment.all && (
          <p className="text-[11px] text-status-warn mt-1" data-materials-missing="1">
            {assignment.missing.map((s) => s.label).join(', ')} — no material yet. Generic counts as an
            assignment; nothing does not, and Start designing waits for it.
          </p>
        )}
      </div>

      {/* ── 6 · Sheen, after the colours. Ironmongery is step 5 (Hardware). ── */}
      <SheenSlider design={design} setDesign={setDesign} profile={profile} />
    </div>
  );
}
