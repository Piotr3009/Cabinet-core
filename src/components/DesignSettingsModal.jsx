import { useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import ColourPicker from './ColourPicker.jsx';
import NumberField from './NumberField.jsx';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import {
  FRONT_STYLE_OPTIONS, colourLabel, finishById, migrateDesign, projectHeights, resolveJoinery,
  sprayFinish, sprayFinishLabel,
} from '../engine/design.js';
import { decorIdFromFinishId } from '../engine/decors.js';
import DecorPicker from './DecorPicker.jsx';
import JoineryPreview from './JoineryPreview.jsx';
import { HEIGHT_GROUPS } from '../engine/types.js';
import { PROJECT_TYPES } from '../engine/projectTypes.js';
import { useSettingsSetsStore } from '../stores/settingsSetsStore.js';
import { contrastInk } from '../lib/pswColors.js';
import SheenSlider from './SheenSlider.jsx';

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
  // Where this modal opens (turn 12, rule 15): beside whatever asked for it.
  // Nothing to work out here — the opener said, and the shell places it.
  const anchor = useUiStore((s) => s.modalArgs?.anchor) || null;
  const materials = useMaterialAssignmentStore((s) => s.materials);
  const profile = useCabinetProfileStore((s) => s.profile);
  const finishes = profile.appearance.finishes;

  const [editing, setEditing] = useState(null);   // door style id being edited
  // Which finish SOURCE is open, and which role the decor grid applies to.
  // Turn 9 (CLAUDE.md F6) adds 'spray': a sprayed colour is a way of finishing a
  // front, so it belongs beside the boards rather than in a corner of its own.
  const [finishTab, setFinishTab] = useState('app');   // 'app' | 'egger' | 'spray'
  const [decorRole, setDecorRole] = useState('front'); // fronts are what a client picks first

  const boardMaterials = materials.filter((m) => m.category === 'board');
  const frontMaterials = materials.filter((m) => m.category === 'front');

  return (
    <Modal
      anchor={anchor}
      title="Design settings"
      onClose={closeModal}
      width="w-[720px]"
      footer={<button type="button" className="cc-btn-gold" onClick={closeModal}>Done</button>}
    >
      <div className="space-y-5">
        {/* ── the project itself, and the settings sets (turn 7, BACKLOG #41) ──
            Everything the new-project flow asks for is editable here
            afterwards, which is the promise the flow makes when it says
            "all of it is editable". */}
        <ProjectSection design={design} setDesign={setDesign} />

        <div className="cc-divider" />

        {/* ── how the carcass is held together (turn 7, CLAUDE.md F2) ── */}
        <JoinerySection design={design} setDesign={setDesign} profile={profile} />

        <div className="cc-divider" />

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

        {/* ── finishes (turn 4, BACKLOG #4; turn 5 adds the decor pack, #19) ──
            Neutral by default: broken white carcass, fronts the same. The two
            wood decors under "This app" are generated locally
            (scripts/gen-textures.mjs). "EGGER decors" is the workshop's own
            pack of 85 — see the licence note in engine/decors.js. */}
        <section className="space-y-2">
          <div className="cc-row">
            <span className="text-xs uppercase tracking-wide text-ink-200">Finish</span>
            <div className="flex gap-1">
              {[['app', 'This app'], ['egger', 'EGGER decors'], ['spray', 'Sprayed']].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`cc-btn px-2 ${finishTab === id ? 'border-gold text-gold' : ''}`}
                  onClick={() => setFinishTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              ['carcass', 'Carcass', `Default · ${finishes.find((f) => f.id === profile.appearance.defaultCarcassFinish)?.label || '—'}`],
              ['front', 'Fronts', 'Same as the carcass'],
            ].map(([role, label, emptyLabel]) => {
              const chosen = design.finish[role];
              // ─── Turn 9 (CLAUDE.md F6) ───
              // A sprayed colour on the fronts BEATS whatever board is selected
              // here, because paint covers a decor exactly as it does in the
              // workshop (engine/design.js `resolveFinishes`). So the row has to
              // say so, or a job whose doors are sprayed navy reads as a job
              // whose doors are oak with a swatch nobody can explain.
              const spray = role === 'front' ? sprayFinish(design.colour.front) : null;
              const resolved = spray
                || finishById(profile, chosen)
                || (role === 'carcass' ? finishById(profile, profile.appearance.defaultCarcassFinish) : null);
              const placeholder = (spray && `— sprayed: ${spray.label} —`)
                || (decorIdFromFinishId(chosen) && '— an EGGER decor is chosen —')
                || emptyLabel;
              return (
                <div key={role} className="space-y-1">
                  <span className="cc-label">{label}</span>
                  <div className="flex items-center gap-2">
                    <select
                      className="cc-input flex-1"
                      value={decorIdFromFinishId(chosen) ? '' : (chosen || '')}
                      onChange={(e) => setDesign({ finish: { ...design.finish, [role]: e.target.value || null } })}
                    >
                      <option value="">{placeholder}</option>
                      {finishes.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                    <FinishSwatch finish={resolved} />
                  </div>
                  {/* The chosen decor's name, in full and attributed — a decor
                      is never named anywhere in this app without "EGGER". */}
                  {resolved?.decor && (
                    <p className="text-[11px] text-gold truncate" title={resolved.label}>{resolved.label}</p>
                  )}
                  {spray && (
                    <p className="text-[11px] text-gold truncate" title={spray.label}>
                      {spray.label} — this is what the fronts are finished in
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {finishTab === 'egger' && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-ink-400">Apply the decor to</span>
                {[['carcass', 'Carcass'], ['front', 'Fronts']].map(([role, label]) => (
                  <button
                    key={role}
                    type="button"
                    className={`cc-btn px-2 ${decorRole === role ? 'border-gold text-gold' : ''}`}
                    onClick={() => setDecorRole(role)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <DecorPicker
                value={design.finish[decorRole]}
                onPick={(id) => setDesign({ finish: { ...design.finish, [decorRole]: id } })}
                onClear={() => setDesign({ finish: { ...design.finish, [decorRole]: null } })}
              />
            </div>
          )}

          {/* ─── Sprayed (turn 9, CLAUDE.md F6) ───
              The third SOURCE a front can be finished from, beside this app's
              own boards and the EGGER pack: a colour out of a spray gun. It is
              the same ColourPicker the door styles use — RAL, Farrow & Ball, or
              a hex somebody types (reference/colors/psw-colors.json) — because
              a second colour picker is a second place for a RAL number to be
              wrong. Turn 8 had this control at the bottom of the screen under
              "Front colour", which is where a person looks LAST for the answer
              to "what are the doors made of". */}
          {finishTab === 'spray' && (
            <div className="space-y-2 pt-1">
              <ColourPicker
                label="Sprayed front colour"
                value={design.colour.front}
                onChange={(c) => setDesign({ colour: { ...design.colour, front: c } })}
              />
              <p className="text-[11px] text-ink-400">
                A sprayed front is lacquer over board: it takes the project sheen, and it refuses the
                room&apos;s reflection so a RAL chip held against the screen is matched against the paint
                and not against the carcass beside it. The cut list names it
                {' '}<span className="text-ink-200">
                  {sprayFinishLabel(design.colour.front) || 'RAL 3005 Wine Red spray'}
                </span>.
              </p>
            </div>
          )}

          <p className="text-[11px] text-ink-400">
            A front COLOUR is paint and covers the decor, exactly as it does in the workshop.
          </p>
        </section>

        <div className="cc-divider" />

        {/* ── project heights (turn 5, BACKLOG #29) ──
            A kitchen is built to ONE set of heights. These are the project's;
            a new unit inherits the one for its kind, and changing one here
            carries every unit that has not been given its own along with it. */}
        <ProjectHeights />

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
                value={design.infill.sideWidth}
                onCommit={(v) => setDesign({ infill: { ...design.infill, sideWidth: v } })}
              />
              <span className="text-[11px] text-ink-400">mm — the filler between a unit and the wall</span>
            </div>
          </div>

          {/* The front COLOUR moved up into the finish picker's "Sprayed"
              source in turn 9 (CLAUDE.md F6) — it is a way of finishing a
              front, so it belongs with the other two. The sheen stays here: it
              applies to every sprayed piece in the job, including the plinth
              and the end panels, whether or not a front colour was picked. */}
          <div className="space-y-3">
            <SheenSlider design={design} setDesign={setDesign} profile={profile} />
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

/**
 * The project's own facts (turn 7, BACKLOG #41): its number, its client, what
 * kind of job it is — and the SAVED SETS, which are how a workshop stops making
 * the same five decisions on every job.
 *
 * A set is the complete design object under a name (lib/settingsSets.js). It is
 * applied and saved from here as well as from the flow, because the moment a
 * project is set up the way you build is usually five minutes after the flow
 * closed, not during it.
 */
function ProjectSection({ design, setDesign }) {
  const project = useProjectStore((s) => s.project);
  const setProjectInfo = useProjectStore((s) => s.setProjectInfo);
  const notify = useUiStore((s) => s.notify);
  const sets = useSettingsSetsStore((s) => s.sets);
  const applyTo = useSettingsSetsStore((s) => s.applyTo);
  const saveSet = useSettingsSetsStore((s) => s.save);
  const removeSet = useSettingsSetsStore((s) => s.remove);
  const [name, setName] = useState('');

  const apply = (id) => {
    const next = applyTo(design, id);
    if (!next) { notify('That settings set is no longer on this computer.', 'warn'); return; }
    setDesign(next);
    notify('Saved settings applied.', 'ok');
  };

  return (
    <section className="space-y-2">
      <span className="text-xs uppercase tracking-wide text-ink-200">Project</span>
      <div className="grid grid-cols-3 gap-3">
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
        <label className="block">
          <span className="cc-label">Type</span>
          <select
            className="cc-input"
            value={design.projectType || ''}
            onChange={(e) => setDesign({ projectType: e.target.value || null })}
          >
            <option value="">Not set</option>
            {PROJECT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
      </div>

      <div className="cc-row pt-1">
        <span className="text-[11px] text-ink-400">Saved settings sets</span>
        <div className="flex items-center gap-1">
          <input
            className="cc-input w-48"
            placeholder="Keep as…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="button"
            className="cc-btn"
            disabled={!name.trim()}
            onClick={() => {
              const { replaced } = saveSet(name, design);
              setName('');
              notify(replaced ? 'Settings set replaced.' : 'Settings set saved.', 'ok');
            }}
          >
            Save set
          </button>
        </div>
      </div>
      {sets.length === 0 ? (
        <p className="text-[11px] text-ink-400">
          None yet. A set is every setting on this screen under a name — the next project can start from it.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1">
          {sets.map((s) => (
            <li key={s.id} className="flex items-center border border-shell-600 rounded">
              <button type="button" className="px-2 py-1 text-[11px] text-ink-100 hover:text-gold" onClick={() => apply(s.id)}>
                {s.name}
              </button>
              <button
                type="button"
                className="cc-btn-ghost text-status-danger px-1.5"
                title="Delete this set"
                onClick={() => removeSet(s.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Which joinery system this project is cut with, and what it looks like. */
function JoinerySection({ design, setDesign, profile }) {
  const joinery = resolveJoinery(design, profile);
  const [open, setOpen] = useState(false);
  return (
    <section className="space-y-2">
      <div className="cc-row">
        <span className="text-xs uppercase tracking-wide text-ink-200">Joinery type</span>
        <button type="button" className="cc-btn px-2" onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide the joint' : 'Show the joint'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {profile.joinery.types.map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.hint}
            className={`border rounded px-3 py-2 text-left transition-colors ${joinery?.id === t.id
              ? 'border-gold bg-shell-700'
              : 'border-shell-600 hover:bg-shell-700'}`}
            onClick={() => setDesign({ joinery: t.id })}
          >
            <span className="block text-sm text-ink-50">{t.label}</span>
            <span className="block text-[10px] text-ink-400">{t.hint}</span>
          </button>
        ))}
      </div>
      {open && joinery && (
        <div className="border border-shell-600 rounded p-2 bg-shell-800">
          <JoineryPreview profile={profile} joinery={joinery} />
        </div>
      )}
    </section>
  );
}

/**
 * Project heights (BACKLOG #29).
 *
 * The five numbers a workshop agrees once per job. Editing one applies it
 * immediately to every unit that still follows the project, and SAYS how many
 * moved — a silent edit that re-cuts nine cabinets is not something to find out
 * about from the BOM afterwards. A unit given its own height is left alone; the
 * panel's Reset button is how it rejoins.
 */
function ProjectHeights() {
  const storedDesign = useProjectStore((s) => s.project.design);
  const setProjectHeightsIn = useProjectStore((s) => s.setProjectHeights);
  const units = useProjectStore((s) => s.units);
  const profile = useCabinetProfileStore((s) => s.profile);
  const notify = useUiStore((s) => s.notify);
  const heights = useMemo(() => projectHeights(storedDesign, profile), [storedDesign, profile]);

  const custom = units.filter((u) => u.params.height_custom).length;
  const limits = profile.projectHeights;

  const rows = [
    ...HEIGHT_GROUPS.map((g) => ({ key: g.id, label: g.label, hint: g.hint })),
    { key: 'wallMount', label: 'Wall mount height', hint: 'How high a wall unit hangs' },
    { key: 'toeKick', label: 'Toe kick height', hint: 'The legs, and the plinth that hides them' },
  ];

  const apply = (key, value) => {
    const { moved, notices } = setProjectHeightsIn({ [key]: value });
    for (const n of notices) notify(n, 'warn');
    if (moved) notify(`${moved} unit${moved === 1 ? '' : 's'} followed the new height.`, 'ok');
  };

  return (
    <section className="space-y-2">
      <div className="cc-row">
        <span className="text-xs uppercase tracking-wide text-ink-200">Project heights</span>
        {custom > 0 && (
          <span className="text-[11px] text-ink-400">
            {custom} unit{custom === 1 ? '' : 's'} on a custom height — left alone
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {rows.map((r) => (
          <label key={r.key} className="block">
            <span className="cc-label">{r.label}</span>
            <NumberField
              className="cc-input text-right"
              min={limits.min}
              max={limits.max}
              title={r.hint}
              value={heights[r.key]}
              onCommit={(v) => apply(r.key, v)}
            />
            <span className="block text-[10px] text-ink-400 mt-0.5">{r.hint}</span>
          </label>
        ))}
      </div>
      <p className="text-[11px] text-ink-400">
        A new unit is built to the height for its kind. A low cabinet keeps its own — being lower
        is what it is for.
      </p>
    </section>
  );
}

/**
 * What the finish actually looks like. One of this app's own decors shows its
 * generated image; a MANUFACTURER decor shows its colour only.
 *
 * That is the licence, not a shortcut: an EGGER image may be shown whole and
 * with its attribution beside it, and a 28 px swatch is neither. The decor's
 * full attributed name is printed next to this swatch, and its picture belongs
 * in the picker where the caption is part of the same control.
 */
function FinishSwatch({ finish }) {
  if (!finish) return <span className="w-7 h-6 rounded border border-shell-600 opacity-30" />;
  const ownImage = finish.texture && !finish.decor;
  return (
    <span
      className="w-7 h-6 rounded border border-shell-600 bg-cover bg-center shrink-0"
      title={finish.label}
      style={{
        background: finish.hex,
        ...(ownImage ? { backgroundImage: `url(${finish.texture})` } : {}),
      }}
    />
  );
}
