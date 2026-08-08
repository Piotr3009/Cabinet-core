import { useMemo, useState } from 'react';
import { useProjectStore } from '../stores/projectStore.js';
import { useSettingsSetsStore } from '../stores/settingsSetsStore.js';
import { isJcMaterial, materialSlotState, useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { finishById, projectHeights, resolveJoinery } from '../engine/design.js';
import {
  carcassSources, frontSources, hardwareChoices, projectBoardThickness,
  projectDimensions, projectFrontThickness, sourceById, thicknessForSource,
} from '../engine/projectSettings.js';
import { formatMm } from '../engine/format.js';
import SheenSlider from './SheenSlider.jsx';
import JoineryPreview from './JoineryPreview.jsx';
import DecorPicker from './DecorPicker.jsx';
import ColourPicker from './ColourPicker.jsx';
import NumberField from './NumberField.jsx';

// ─── Step 5: the project's own settings (turn 11, CLAUDE.md F9) ─────────────
//
// "The whole project's defaults — everything below stored per-project (design
// layer), pre-filled from profile, savable as a settings set."
//
// It is an ADDITION and a reorganisation, not a redesign: the step-by-step feel
// of the modal is unchanged, the sheen and dog-bone sections are exactly as they
// were, and what is new is the DIMENSIONS at the top and the materials split
// into the three sections the owner asked for — carcasses, fronts, hardware.
//
// Every number here is DESIGN-layer and reaches the engine through
// `paramsForEngine` (engine/projectSettings.js). Not one formula moved: the
// maths still lives in the LISP-derived engine and this feeds numbers into it.

export default function ProjectSettingsStep({ design, profile, notify }) {
  const setDesign = useProjectStore((s) => s.setDesign);
  const setProjectHeights = useProjectStore((s) => s.setProjectHeights);
  const setProjectDefaults = useProjectStore((s) => s.setProjectDefaults);
  const setCarcassTypes = useProjectStore((s) => s.setCarcassTypes);
  const setCarcassFinish = useProjectStore((s) => s.setCarcassFinish);
  const setCarcassMaterial = useProjectStore((s) => s.setCarcassMaterial);
  const setCarcassSource = useProjectStore((s) => s.setCarcassSource);
  const setFrontTypes = useProjectStore((s) => s.setFrontTypes);
  const setFrontType = useProjectStore((s) => s.setFrontType);

  const sets = useSettingsSetsStore((s) => s.sets);
  const applySet = useSettingsSetsStore((s) => s.applyTo);
  const materials = useMaterialAssignmentStore((s) => s.materials);

  const [source, setSource] = useState('project');       // 'project' | 'saved'
  const [picking, setPicking] = useState(null);          // { carcassId } | { frontId }
  const [joineryOpen, setJoineryOpen] = useState(false);

  const heights = useMemo(() => projectHeights(design, profile), [design, profile]);
  const dimensions = useMemo(
    () => projectDimensions(design, profile, heights),
    [design, profile, heights],
  );
  const boardMaterials = materials.filter((m) => m.category === 'board');
  const slots = materialSlotState(
    design.carcass.types.map((t) => ({ id: t.id, label: t.label, material_id: t.material_id })),
    materials,
  );
  const joinery = resolveJoinery(design, profile);
  const PS = profile.projectSettings;
  const frontTypes = design.fronts.types.length
    ? design.fronts.types
    : [{
      id: 'f1', label: 'Front 1', source: PS.frontSources[0].id, colour: null, material_id: null,
    }];
  const board = projectBoardThickness(design, profile);
  const frontBoard = projectFrontThickness(design, profile);

  const setDimension = (key, value) => {
    if (key === 'depth') { setProjectDefaults({ depth: value }); return; }
    const { notices } = setProjectHeights({ [key]: value });
    for (const n of notices) notify(n, 'warn');
  };

  return (
    <div className="space-y-4">
      {/* ── where the settings come from ── */}
      <section className="space-y-2">
        <div className="cc-row">
          <span className="text-xs uppercase tracking-wide text-ink-200">Project settings</span>
          <div className="flex gap-1">
            {[['project', 'For this project'], ['saved', 'Use saved settings']].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`cc-btn px-2 ${source === id ? 'border-gold text-gold' : ''}`}
                onClick={() => setSource(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {source === 'saved' && (
          sets.length === 0 ? (
            <p className="text-[11px] text-ink-400">
              No saved sets yet. Set this project up the way you build — Start designing offers to keep it.
            </p>
          ) : (
            <ul className="divide-y divide-shell-600 border border-shell-600 rounded">
              {sets.map((st) => (
                <li key={st.id}>
                  <button
                    type="button"
                    className="w-full text-left px-2 py-1.5 hover:bg-shell-700 flex items-center gap-2"
                    onClick={() => {
                      const next = applySet(design, st.id);
                      if (!next) { notify('That settings set is no longer on this computer.', 'warn'); return; }
                      setDesign(next);
                      notify('Saved settings applied.', 'ok');
                    }}
                  >
                    <span className="text-sm text-ink-50 flex-1 truncate">{st.name}</span>
                    <span className="cc-tag">apply</span>
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
      </section>

      <div className="cc-divider" />

      {/* ── 1. default dimensions (CLAUDE.md F9.1) ── */}
      <section className="space-y-2">
        <span className="text-xs uppercase tracking-wide text-ink-200">Default dimensions</span>
        <div className="grid grid-cols-5 gap-2">
          {dimensions.map((d) => (
            <label key={d.key} className="block">
              <span className="cc-label">{d.label}</span>
              <NumberField
                className="cc-input text-right"
                value={d.value}
                title={`Every ${d.key === 'depth' ? 'unit' : 'new unit of that kind'} starts here — one may still be given its own`}
                onCommit={(v) => setDimension(d.key, v)}
              />
            </label>
          ))}
        </div>
        <p className="text-[11px] text-ink-400">
          Pre-filled from the workshop profile — the UK standard. A unit may still be given its own height
          in the panel; this is where every new one starts.
        </p>
      </section>

      <div className="cc-divider" />

      {/* ── 2a. carcasses (CLAUDE.md F9.2) ── */}
      <section className="space-y-2">
        <div className="cc-row">
          <span className="text-xs uppercase tracking-wide text-ink-200">Carcasses</span>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-ink-400">types</span>
            {Array.from({ length: PS.maxCarcassTypes }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={`cc-btn px-2 ${design.carcass.types.length === n ? 'border-gold text-ink-50' : ''}`}
                onClick={() => setCarcassTypes(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {design.carcass.types.map((t) => {
          const chosen = t.source || PS.carcassSources[0].id;
          const finish = finishById(profile, t.finish_id)
            || finishById(profile, design.finish.carcass)
            || finishById(profile, profile.appearance.defaultCarcassFinish);
          return (
            <div key={t.id} className="border border-shell-600 rounded p-2 space-y-2">
              <div className="cc-row">
                <span className="text-sm text-ink-50 flex-1">{t.label}</span>
                <div className="flex gap-1">
                  {carcassSources(profile).map((src) => (
                    <button
                      key={src.id}
                      type="button"
                      className={`cc-btn px-2 ${chosen === src.id ? 'border-gold text-gold' : ''}`}
                      title={`${src.label} — ${src.thickness} mm board`}
                      onClick={() => setCarcassSource(t.id, src.id)}
                    >
                      {src.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* COLOUR FIRST, then the stock beneath it — the owner's order, and
                  the right one: a workshop decides what the job LOOKS like and
                  then finds the board that is that colour. */}
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded border border-shell-600 shrink-0" style={{ background: finish?.hex || '#7a7a7a' }} />
                <span className="text-[11px] text-ink-400 flex-1 truncate">{finish?.label || 'Project finish'}</span>
                <button
                  type="button"
                  className="cc-btn px-2"
                  onClick={() => setPicking(picking?.carcassId === t.id ? null : { carcassId: t.id })}
                >
                  {chosen === 'sprayed' ? 'Colour…' : 'Decor…'}
                </button>
              </div>

              {picking?.carcassId === t.id && (
                <div className="border border-shell-600 rounded p-2 space-y-2">
                  {chosen === 'sprayed' ? (
                    // A sprayed carcass is a colour, not a board — CLAUDE.md F9.2
                    // says so explicitly ("yes, carcasses can be sprayed").
                    <ColourPicker
                      label="Sprayed carcass colour"
                      value={design.colour.carcass}
                      onChange={(c) => setDesign({ colour: { ...design.colour, carcass: c } })}
                    />
                  ) : (
                    <>
                      <DecorPicker
                        value={t.finish_id}
                        onPick={(id) => setCarcassFinish(t.id, id)}
                        onClear={() => setCarcassFinish(t.id, null)}
                      />
                      <div className="flex flex-wrap gap-1">
                        {profile.appearance.finishes.map((f) => (
                          <button key={f.id} type="button" className="cc-btn px-2" onClick={() => setCarcassFinish(t.id, f.id)}>
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="cc-row">
                <span className="text-[11px] text-ink-400 flex-1">
                  {materials.find((m) => m.id === t.material_id)?.name || 'No board assigned'}
                  {isJcMaterial(materials.find((m) => m.id === t.material_id)) ? ' · JC' : ''}
                </span>
                <select
                  className="cc-input w-[150px]"
                  value={t.material_id || ''}
                  onChange={(e) => setCarcassMaterial(t.id, e.target.value || null)}
                >
                  <option value="">MaterialStock…</option>
                  {boardMaterials.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}{isJcMaterial(m) ? ' · JC' : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}

        {slots.missing.length > 0 && (
          <p className="text-[11px] text-status-warn">
            {slots.missing.map((t) => t.label).join(', ')} has no board behind it yet — the look is set, the cost is not.
          </p>
        )}
      </section>

      <div className="cc-divider" />

      {/* ── 2b. fronts (CLAUDE.md F9.2) ── */}
      <section className="space-y-2">
        <div className="cc-row">
          <span className="text-xs uppercase tracking-wide text-ink-200">Fronts</span>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-ink-400">types</span>
            {Array.from({ length: PS.maxFrontTypes }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={`cc-btn px-2 ${frontTypes.length === n ? 'border-gold text-ink-50' : ''}`}
                onClick={() => setFrontTypes(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {frontTypes.map((t) => {
          const src = sourceById(frontSources(profile), t.source) || frontSources(profile)[0];
          return (
            <div key={t.id} className="border border-shell-600 rounded p-2 space-y-2">
              <div className="cc-row">
                <span className="text-sm text-ink-50 flex-1">{t.label}</span>
                <span className="text-[11px] text-ink-400">{src.thickness} mm</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {frontSources(profile).map((one) => (
                  <button
                    key={one.id}
                    type="button"
                    className={`cc-btn px-2 ${src.id === one.id ? 'border-gold text-gold' : ''}`}
                    title={`${one.label} — ${one.thickness} mm`}
                    onClick={() => setFrontType(t.id, { source: one.id })}
                  >
                    {one.label}
                    {one.coloursSoon && <span className="cc-tag ml-1">colours soon</span>}
                  </button>
                ))}
              </div>
              {src.coloursSoon ? (
                <p className="text-[11px] text-ink-400">
                  The wood colour range arrives in a later turn. The option is here so a job set up in wood
                  keeps its choice; the colours are not yet.
                </p>
              ) : (
                <ColourPicker
                  label={`${src.label} colour`}
                  value={t.colour}
                  onChange={(c) => setFrontType(t.id, { colour: c })}
                />
              )}
            </div>
          );
        })}
        <p className="text-[11px] text-ink-400">
          End panels and infills are cut from front type 1. One cabinet's own can be changed by selecting
          the piece in the canvas.
        </p>
      </section>

      <div className="cc-divider" />

      {/* ── 2c. hardware (CLAUDE.md F9.2) ── */}
      <section className="space-y-2">
        <span className="text-xs uppercase tracking-wide text-ink-200">Hardware</span>
        <div className="space-y-1">
          {hardwareChoices(design, profile).map((h) => (
            <div key={h.key} className="cc-row">
              <div className="flex flex-col flex-1">
                <span className="text-sm text-ink-100">{h.label}</span>
                <span className="text-[11px] text-ink-400">
                  {h.fits ? `Fitted automatically: ${h.fits.join(', ')}` : (h.auto || h.hint || 'Fitted automatically')}
                </span>
              </div>
              {h.variants ? (
                <div className="flex gap-1">
                  {h.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`cc-btn px-2 ${h.chosen === v.id ? 'border-gold text-gold' : ''}`}
                      onClick={() => setProjectDefaults({ hardware: { [h.key]: v.id } })}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="cc-tag">automatic</span>
              )}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-ink-400">
          Every one of these is fitted by the automat and counted in the BOM. You pick the variant; it
          picks the item.
        </p>
      </section>

      <div className="cc-divider" />

      {/* ── 3. material thickness (CLAUDE.md F9.3) ── */}
      <section className="space-y-2">
        <div className="cc-row">
          <span className="text-xs uppercase tracking-wide text-ink-200">Material thickness</span>
          <span className="text-[11px] text-ink-400">
            carcass {formatMm(board)} · fronts {formatMm(frontBoard)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {PS.boardThicknessOptions.map((t) => (
            <button
              key={t}
              type="button"
              className={`cc-btn px-2 ${design.thickness.custom == null && board === t ? 'border-gold text-gold' : ''}`}
              onClick={() => setProjectDefaults({ thickness: { board: t, custom: null } })}
            >
              {t}
            </button>
          ))}
          <span className="text-[11px] text-ink-400 px-1">Other</span>
          <NumberField
            className="cc-input w-20 text-right"
            min={profile.editor.mmStep}
            value={design.thickness.custom ?? 0}
            title="Any board this workshop actually has — typed in millimetres"
            onCommit={(v) => setProjectDefaults({ thickness: { custom: v > 0 ? v : null } })}
          />
        </div>
        <p className="text-[11px] text-ink-400">
          Automatic from the source — EGGER {thicknessForSource(profile, 'carcass', 'egger')}, veneer{' '}
          {thicknessForSource(profile, 'front', 'veneer')}, laminate {thicknessForSource(profile, 'front', 'laminate')} —
          until you say otherwise here. The maths is the engine's; this only feeds it the number.
        </p>
      </section>

      <div className="cc-divider" />

      {/* ── 4. sheen and dog bones: exactly as they were (CLAUDE.md F9.4) ── */}
      <SheenSlider design={design} setDesign={setDesign} profile={profile} />

      <div className="cc-divider" />

      <section className="space-y-2">
        <span className="text-xs uppercase tracking-wide text-ink-200">Joinery type</span>
        <div className="flex flex-wrap gap-2">
          {profile.joinery.types.map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.hint}
              className={`border rounded px-3 py-2 text-left transition-colors ${joinery?.id === t.id
                ? 'border-gold bg-shell-700'
                : 'border-shell-600 hover:bg-shell-700'}`}
              onClick={() => { setDesign({ joinery: t.id }); setJoineryOpen((v) => !v || joinery?.id !== t.id); }}
            >
              <span className="block text-sm text-ink-50">{t.label}</span>
              <span className="block text-[10px] text-ink-400">{t.hint}</span>
            </button>
          ))}
        </div>
        {joineryOpen && joinery ? (
          <div className="border border-shell-600 rounded p-2 bg-shell-800">
            <JoineryPreview profile={profile} joinery={joinery} />
          </div>
        ) : (
          <p className="text-[11px] text-ink-400">Click a joinery type again to see the joint.</p>
        )}
      </section>
    </div>
  );
}
