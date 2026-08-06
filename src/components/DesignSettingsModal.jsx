import { useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import ColourPicker from './ColourPicker.jsx';
import NumberField from './NumberField.jsx';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { FRONT_STYLE_OPTIONS, migrateDesign, colourLabel } from '../engine/design.js';
import { contrastInk } from '../lib/pswColors.js';

// Design Settings — project level (CLAUDE.md phase 6).
// How many carcass materials the job runs, what the standard front is, the
// workshop's own door styles, the front colour and the wall infill width.
// Saved WITH the project: opening a project opens the way it is built.

export default function DesignSettingsModal() {
  // Select the STORED value and migrate in a memo: a selector that builds a
  // new object every call makes zustand's snapshot change on every render,
  // which React reports as "Maximum update depth exceeded".
  const storedDesign = useProjectStore((s) => s.project.design);
  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);
  const setDesign = useProjectStore((s) => s.setDesign);
  const setCarcassTypes = useProjectStore((s) => s.setCarcassTypes);
  const setCarcassMaterial = useProjectStore((s) => s.setCarcassMaterial);
  const setCarcassFinish = useProjectStore((s) => s.setCarcassFinish);
  const addDoorStyle = useProjectStore((s) => s.addDoorStyle);
  const updateDoorStyle = useProjectStore((s) => s.updateDoorStyle);
  const removeDoorStyle = useProjectStore((s) => s.removeDoorStyle);
  const closeModal = useUiStore((s) => s.closeModal);
  const materials = useMaterialAssignmentStore((s) => s.materials);
  const profile = useCabinetProfileStore((s) => s.profile);
  const finishes = profile.appearance.finishes;

  const [editing, setEditing] = useState(null);   // door style id being edited

  const boardMaterials = materials.filter((m) => m.category === 'board');
  const frontMaterials = materials.filter((m) => m.category === 'front');

  return (
    <Modal
      title="Design settings"
      onClose={closeModal}
      width="w-[720px]"
      footer={<button type="button" className="cc-btn-gold" onClick={closeModal}>Done</button>}
    >
      <div className="space-y-5">
        {/* ── carcass materials ── */}
        <section className="space-y-2">
          <div className="cc-row">
            <span className="text-xs uppercase tracking-wide text-ink-200">Carcass materials</span>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-ink-400">types</span>
              {[1, 2, 3].map((n) => (
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
          <ul className="space-y-1">
            {design.carcass.types.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <span className="text-sm text-ink-100 w-20">{t.label}</span>
                <select
                  className="cc-input flex-1"
                  value={t.material_id || ''}
                  onChange={(e) => setCarcassMaterial(t.id, e.target.value)}
                >
                  <option value="">Not assigned</option>
                  {boardMaterials.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}{m.thickness ? ` · ${m.thickness} mm` : ''}</option>
                  ))}
                </select>
                {/* The decor is chosen PER MATERIAL, which is how a workshop
                    thinks: "carcass 2 is the walnut one". */}
                <select
                  className="cc-input w-40"
                  title="What this board looks like"
                  value={t.finish_id || ''}
                  onChange={(e) => setCarcassFinish(t.id, e.target.value || null)}
                >
                  <option value="">Project finish</option>
                  {finishes.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                <FinishSwatch finish={finishes.find((f) => f.id === t.finish_id) || null} />
              </li>
            ))}
          </ul>
        </section>

        <div className="cc-divider" />

        {/* ── finishes (turn 4, BACKLOG #4) ──
            Neutral by default: broken white carcass, fronts the same. The two
            wood decors are generated locally (scripts/gen-textures.mjs), so
            nothing here depends on somebody else's artwork licence. */}
        <section className="space-y-2">
          <span className="text-xs uppercase tracking-wide text-ink-200">Finish</span>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="cc-label">Carcass</span>
              <div className="flex items-center gap-2">
                <select
                  className="cc-input flex-1"
                  value={design.finish.carcass || ''}
                  onChange={(e) => setDesign({ finish: { ...design.finish, carcass: e.target.value || null } })}
                >
                  <option value="">
                    {`Default · ${finishes.find((f) => f.id === profile.appearance.defaultCarcassFinish)?.label || '—'}`}
                  </option>
                  {finishes.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                <FinishSwatch finish={finishes.find((f) => f.id === (design.finish.carcass || profile.appearance.defaultCarcassFinish))} />
              </div>
            </label>
            <label className="block">
              <span className="cc-label">Fronts</span>
              <div className="flex items-center gap-2">
                <select
                  className="cc-input flex-1"
                  value={design.finish.front || ''}
                  onChange={(e) => setDesign({ finish: { ...design.finish, front: e.target.value || null } })}
                >
                  <option value="">Same as the carcass</option>
                  {finishes.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                <FinishSwatch finish={finishes.find((f) => f.id === design.finish.front) || null} />
              </div>
            </label>
          </div>
          <p className="text-[11px] text-ink-400">
            A front COLOUR (below) is paint and covers the decor, exactly as it does in the workshop.
          </p>
        </section>

        <div className="cc-divider" />

        {/* ── standard front + colour ── */}
        <section className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wide text-ink-200">Standard front</span>
            <select
              className="cc-input"
              value={design.fronts.style}
              onChange={(e) => setDesign({ fronts: { ...design.fronts, style: e.target.value } })}
            >
              {FRONT_STYLE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <p className="text-[11px] text-ink-400">Handles are a later phase — the choice is kept here for them.</p>

            <div className="cc-divider" />
            <span className="text-xs uppercase tracking-wide text-ink-200">Infill at the wall</span>
            <div className="flex items-center gap-2">
              <NumberField
                className="cc-input w-24 text-right"
                min={0}
                value={Math.round(design.infill.sideWidth)}
                onCommit={(v) => setDesign({ infill: { ...design.infill, sideWidth: v } })}
              />
              <span className="text-[11px] text-ink-400">mm — the filler between a unit and the wall</span>
            </div>
          </div>

          <div>
            <ColourPicker
              label="Front colour"
              value={design.colour.front}
              onChange={(c) => setDesign({ colour: { ...design.colour, front: c } })}
            />
          </div>
        </section>

        <div className="cc-divider" />

        {/* ── door style library ── */}
        <section className="space-y-2">
          <div className="cc-row">
            <span className="text-xs uppercase tracking-wide text-ink-200">Door styles</span>
            <button
              type="button"
              className="cc-btn"
              onClick={() => {
                const id = addDoorStyle({
                  name: `Style ${design.doorStyles.length + 1}`,
                  frontType: design.fronts.style,
                  material_id: frontMaterials[0]?.id || null,
                  colour: design.colour.front,
                });
                setEditing(id);
              }}
            >
              + New style
            </button>
          </div>

          {design.doorStyles.length === 0 && (
            <p className="text-[11px] text-ink-400">
              No styles yet. A style is a name, a front type and a material/colour — assign it to units from the
              parameter panel.
            </p>
          )}

          <ul className="space-y-2">
            {design.doorStyles.map((style) => (
              <li key={style.id} className="border border-shell-600 rounded p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    className="cc-input flex-1"
                    value={style.name}
                    onChange={(e) => updateDoorStyle(style.id, { name: e.target.value })}
                  />
                  <select
                    className="cc-input w-28"
                    value={style.frontType}
                    onChange={(e) => updateDoorStyle(style.id, { frontType: e.target.value })}
                  >
                    {FRONT_STYLE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                  <select
                    className="cc-input w-40"
                    value={style.material_id || ''}
                    onChange={(e) => updateDoorStyle(style.id, { material_id: e.target.value || null })}
                  >
                    <option value="">No material</option>
                    {frontMaterials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <select
                    className="cc-input w-32"
                    title="What this style looks like"
                    value={style.finish_id || ''}
                    onChange={(e) => updateDoorStyle(style.id, { finish_id: e.target.value || null })}
                  >
                    <option value="">Project finish</option>
                    {finishes.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                  {style.colour && (
                    <span
                      className="px-2 py-0.5 rounded text-[11px] border border-shell-600"
                      style={{ background: style.colour.hex, color: contrastInk(style.colour.hex) }}
                      title={colourLabel(style.colour)}
                    >
                      {style.colour.name}
                    </span>
                  )}
                  <button
                    type="button" className="cc-btn-ghost"
                    onClick={() => setEditing(editing === style.id ? null : style.id)}
                  >
                    {editing === style.id ? 'Hide' : 'Colour'}
                  </button>
                  <button type="button" className="cc-btn-ghost text-status-danger" onClick={() => removeDoorStyle(style.id)}>×</button>
                </div>
                {editing === style.id && (
                  <ColourPicker
                    label={`${style.name} colour`}
                    value={style.colour}
                    onChange={(c) => updateDoorStyle(style.id, { colour: c })}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Modal>
  );
}

/** What the finish actually looks like — a decor shows its own image. */
function FinishSwatch({ finish }) {
  if (!finish) return <span className="w-7 h-6 rounded border border-shell-600 opacity-30" />;
  return (
    <span
      className="w-7 h-6 rounded border border-shell-600 bg-cover bg-center shrink-0"
      title={finish.label}
      style={{
        background: finish.hex,
        ...(finish.texture ? { backgroundImage: `url(${finish.texture})` } : {}),
      }}
    />
  );
}
