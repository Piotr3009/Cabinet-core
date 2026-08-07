import { useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import RoomModal from './RoomModal.jsx';
import JoineryPreview from './JoineryPreview.jsx';
import DecorPicker from './DecorPicker.jsx';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useSettingsSetsStore } from '../stores/settingsSetsStore.js';
import { isJcMaterial, materialSlotState, useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { PROJECT_TYPES, getProjectType, heightsForProjectType } from '../engine/projectTypes.js';
import { finishById, migrateDesign, resolveJoinery } from '../engine/design.js';

// ─── New project (turn 7, CLAUDE.md F2 / BACKLOG #41) ───
//
// Five steps, and the whole point of them is that a workshop can click STRAIGHT
// THROUGH on the defaults in about ten seconds. Every answer has one already
// filled in: the number is proposed, the name and the client are optional, the
// type is a kitchen, the scope follows the type, the settings are the last set
// used or the project's own. Nothing here is a decision that cannot be changed
// from the menu five minutes later, and the copy says so where it matters.
//
// The project is created in the store as soon as step 1 is left, so the ROOM
// step can be the room editor that already exists (RoomModal) rather than a
// second one written for the flow. That is CLAUDE.md's instruction — "the
// existing modal" — and it is also the only way the two cannot drift.

const STEPS = ['info', 'type', 'scope', 'room', 'settings'];

export default function NewProjectFlow({ initialNumber = '', onCancel, onStart }) {
  const newProject = useProjectStore((s) => s.newProject);
  const setProjectInfo = useProjectStore((s) => s.setProjectInfo);
  const setDesign = useProjectStore((s) => s.setDesign);
  const setProjectHeights = useProjectStore((s) => s.setProjectHeights);
  const storedDesign = useProjectStore((s) => s.project.design);
  const profile = useCabinetProfileStore((s) => s.profile);
  const notify = useUiStore((s) => s.notify);

  const [step, setStep] = useState('info');
  const [info, setInfo] = useState({ number: initialNumber, name: '', client: '' });
  const [typeId, setTypeId] = useState(PROJECT_TYPES[0].id);
  const [scope, setScope] = useState(PROJECT_TYPES[0].scope);
  const [scopeTouched, setScopeTouched] = useState(false);
  const [created, setCreated] = useState(false);

  const type = getProjectType(typeId);

  const go = (next) => {
    if (next === 'room' && scope === 'wall') { setStep('settings'); return; }
    setStep(next);
  };

  /**
   * Leaving step 1 CREATES the project — everything after it edits the real
   * thing, which is what lets the room step be the room editor that already
   * exists. Coming BACK to step 1 and pressing Next again must not create it a
   * second time: that would be a reset, and it would throw away the room the
   * user has just drawn.
   */
  const commitInfo = () => {
    const number = info.number.trim();
    const name = info.name.trim() || (number ? `Project ${number}` : 'Untitled project');
    if (created) setProjectInfo({ name, number, client: info.client.trim() });
    else {
      newProject(name, { number, client: info.client.trim() });
      setCreated(true);
    }
    setStep('type');
  };

  const commitType = () => {
    // The type sets the project's starting heights. It is applied through the
    // ordinary setter, so a unit placed later inherits exactly what a unit
    // placed after an edit in Design Settings would.
    setDesign({ projectType: type.id });
    setProjectHeights(heightsForProjectType(type.id, profile));
    if (!scopeTouched) setScope(type.scope);
    setStep('scope');
  };

  const commitScope = () => {
    setDesign({ scope });
    go('room');
  };

  // The project is already in the store, settings and all; the start screen
  // puts it on the shelf and opens the canvas.
  const start = () => onStart();

  const index = STEPS.indexOf(step);
  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);

  // The room step IS the room editor, shown in place.
  if (step === 'room') {
    return (
      <RoomModal
        onClose={() => setStep('scope')}
        onApplied={() => setStep('settings')}
      />
    );
  }

  return (
    <Modal
      title="New project"
      width="w-[760px]"
      onClose={onCancel}
      footer={(
        <>
          <button type="button" className="cc-btn" onClick={onCancel}>Cancel</button>
          {index > 0 && (
            <button
              type="button"
              className="cc-btn"
              onClick={() => setStep(STEPS[Math.max(0, index - (step === 'settings' && scope === 'wall' ? 2 : 1))])}
            >
              Back
            </button>
          )}
          {step === 'info' && <button type="button" className="cc-btn-gold" onClick={commitInfo}>Next</button>}
          {step === 'type' && <button type="button" className="cc-btn-gold" onClick={commitType}>Next</button>}
          {step === 'scope' && (
            <button type="button" className="cc-btn-gold" onClick={commitScope}>
              {scope === 'room' ? 'Next — room setup' : 'Next — settings'}
            </button>
          )}
          {step === 'settings' && <button type="button" className="cc-btn-gold" onClick={start}>Start designing</button>}
        </>
      )}
    >
      <div className="space-y-4">
        <Steps current={step} scope={scope} />

        {step === 'info' && (
          <section className="space-y-3">
            <div className="grid grid-cols-[160px_1fr] gap-3">
              <label className="block">
                <span className="cc-label">Project number</span>
                <input
                  className="cc-input"
                  value={info.number}
                  onChange={(e) => setInfo({ ...info, number: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitInfo(); }}
                />
                <span className="block text-[10px] text-ink-400 mt-0.5">Proposed from the last job — edit it freely</span>
              </label>
              <label className="block">
                <span className="cc-label">Name <span className="text-ink-400">(optional)</span></span>
                <input
                  autoFocus
                  className="cc-input"
                  value={info.name}
                  placeholder="Hampstead kitchen"
                  onChange={(e) => setInfo({ ...info, name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitInfo(); }}
                />
              </label>
            </div>
            <div className="flex items-end gap-2">
              <label className="block flex-1">
                <span className="cc-label">Client <span className="text-ink-400">(optional)</span></span>
                <input
                  className="cc-input"
                  value={info.client}
                  onChange={(e) => setInfo({ ...info, client: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitInfo(); }}
                />
              </label>
              <button type="button" className="cc-btn" disabled title="JoineryCore clients — a later phase">
                Select from JoineryCore
                <span className="cc-tag ml-1.5">soon</span>
              </button>
            </div>
          </section>
        )}

        {step === 'type' && (
          <section className="space-y-2">
            <p className="text-[11px] text-ink-400">
              The type chooses where the Library opens, which heights the job starts at and whether it
              suggests a whole room or one wall. All of it is editable afterwards.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {PROJECT_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.hint}
                  className={`border rounded p-2.5 text-left transition-colors ${typeId === t.id
                    ? 'border-gold bg-shell-700'
                    : 'border-shell-600 hover:bg-shell-700'}`}
                  onClick={() => { setTypeId(t.id); if (!scopeTouched) setScope(t.scope); }}
                  onDoubleClick={commitType}
                >
                  <span className="block text-sm text-ink-50">{t.label}</span>
                  <span className="block text-[10px] text-ink-400 mt-0.5 leading-snug">{t.hint}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 'scope' && (
          <section className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                ['room', 'Whole room', 'Four walls, a ceiling height, windows and doors'],
                ['wall', 'One wall', 'Straight to the canvas — walls come later'],
              ].map(([id, label, hint]) => (
                <button
                  key={id}
                  type="button"
                  className={`border rounded p-3 text-left transition-colors ${scope === id
                    ? 'border-gold bg-shell-700'
                    : 'border-shell-600 hover:bg-shell-700'}`}
                  onClick={() => { setScope(id); setScopeTouched(true); }}
                >
                  <span className="block text-sm text-ink-50">{label}</span>
                  <span className="block text-[11px] text-ink-400 mt-0.5">{hint}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-ink-400">
              One wall is enough for a vanity or a single run — you can add more walls later.
            </p>
            {type.scope !== scope && (
              <p className="text-[11px] text-gold">
                A {type.label.toLowerCase()} usually starts as {type.scope === 'wall' ? 'one wall' : 'a whole room'}.
              </p>
            )}
          </section>
        )}

        {step === 'settings' && <DesignStep design={design} profile={profile} notify={notify} />}
      </div>
    </Modal>
  );
}

function Steps({ current, scope }) {
  const shown = STEPS.filter((s) => s !== 'room' || scope === 'room');
  const labels = {
    info: 'Project', type: 'Type', scope: 'Scope', room: 'Room', settings: 'Settings',
  };
  return (
    <ol className="flex items-center gap-1.5 text-[11px]">
      {shown.map((s, i) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded border ${s === current
            ? 'border-gold text-gold'
            : 'border-shell-600 text-ink-400'}`}
          >
            {i + 1}. {labels[s]}
          </span>
          {i < shown.length - 1 && <span className="text-ink-400">›</span>}
        </li>
      ))}
    </ol>
  );
}

// ─── Step 5: Design settings ────────────────────────────────────────────────

/**
 * "For this project" or "Use saved settings".
 *
 * A saved SET is a complete set of project settings under a name — a new thing
 * in turn 7, and the answer to the fact that a workshop has two or three ways
 * it builds rather than a fresh decision per job (lib/settingsSets.js).
 */
function DesignStep({ design, profile, notify }) {
  const setDesign = useProjectStore((s) => s.setDesign);
  const setCarcassTypes = useProjectStore((s) => s.setCarcassTypes);
  const setCarcassFinish = useProjectStore((s) => s.setCarcassFinish);
  const setCarcassMaterial = useProjectStore((s) => s.setCarcassMaterial);
  const sets = useSettingsSetsStore((s) => s.sets);
  const applySet = useSettingsSetsStore((s) => s.applyTo);
  const saveSet = useSettingsSetsStore((s) => s.save);
  const materials = useMaterialAssignmentStore((s) => s.materials);

  const [source, setSource] = useState('project');   // 'project' | 'saved'
  const [setName, setSetName] = useState('');
  const [picking, setPicking] = useState(null);       // { role } | { carcassId }
  const [assigning, setAssigning] = useState(null);   // carcass type id
  const [joineryOpen, setJoineryOpen] = useState(false);

  const boardMaterials = materials.filter((m) => m.category === 'board');
  const slots = materialSlotState(
    design.carcass.types.map((t) => ({ id: t.id, label: t.label, material_id: t.material_id })),
    materials,
  );
  const joinery = resolveJoinery(design, profile);
  const missing = slots.missing;
  const fromJc = slots.fromJc;

  const useSaved = (id) => {
    const next = applySet(design, id);
    if (!next) { notify('That settings set is no longer on this computer.', 'warn'); return; }
    setDesign(next);
    notify('Saved settings applied.', 'ok');
  };

  const keepAsSet = () => {
    const { replaced } = saveSet(setName, design);
    setSetName('');
    notify(replaced ? 'Settings set replaced.' : 'Settings set saved.', 'ok');
  };

  return (
    <div className="space-y-4">
      {/* ── where the settings come from ── */}
      <section className="space-y-2">
        <div className="cc-row">
          <span className="text-xs uppercase tracking-wide text-ink-200">Design settings</span>
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
          <div className="space-y-1">
            {sets.length === 0 ? (
              <p className="text-[11px] text-ink-400">
                No saved sets yet. Set this project up the way you build, then keep it below — the next
                job starts from it by name.
              </p>
            ) : (
              <ul className="divide-y divide-shell-600 border border-shell-600 rounded">
                {sets.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="w-full text-left px-2 py-1.5 hover:bg-shell-700 flex items-center gap-2"
                      onClick={() => useSaved(s.id)}
                    >
                      <span className="text-sm text-ink-50 flex-1 truncate">{s.name}</span>
                      <span className="cc-tag">apply</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            className="cc-input flex-1"
            placeholder="Keep these settings as… (e.g. Standard kitchen)"
            value={setName}
            onChange={(e) => setSetName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && setName.trim()) keepAsSet(); }}
          />
          <button type="button" className="cc-btn" disabled={!setName.trim()} onClick={keepAsSet}>Save set</button>
        </div>
      </section>

      <div className="cc-divider" />

      {/* ── joinery ── */}
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
        {joineryOpen && joinery && (
          <div className="border border-shell-600 rounded p-2 bg-shell-800">
            <JoineryPreview profile={profile} joinery={joinery} />
          </div>
        )}
        {!joineryOpen && (
          <p className="text-[11px] text-ink-400">Click a joinery type again to see the joint.</p>
        )}
      </section>

      <div className="cc-divider" />

      {/* ── materials ── */}
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

        <div className="grid grid-cols-4 gap-2">
          {design.carcass.types.map((t) => (
            <MaterialTile
              key={t.id}
              label={t.label}
              // The same fallback chain resolveFinishes() uses, so a tile shows
              // what the 3D view will show rather than a grey square: this
              // material's own decor, then the project's, then the profile's.
              finish={finishById(profile, t.finish_id)
                || finishById(profile, design.finish.carcass)
                || finishById(profile, profile.appearance.defaultCarcassFinish)}
              material={materials.find((m) => m.id === t.material_id) || null}
              active={picking?.carcassId === t.id}
              onPick={() => setPicking(picking?.carcassId === t.id ? null : { carcassId: t.id })}
            />
          ))}
          <MaterialTile
            label="Fronts"
            // …and a front with no decor of its own IS the carcass, which is
            // what a workshop means by one material throughout (CLAUDE.md F2).
            finish={finishById(profile, design.finish.front)
              || finishById(profile, design.finish.carcass)
              || finishById(profile, profile.appearance.defaultCarcassFinish)}
            material={null}
            active={picking?.role === 'front'}
            onPick={() => setPicking(picking?.role === 'front' ? null : { role: 'front' })}
          />
        </div>

        {picking && (
          <div className="border border-shell-600 rounded p-2 space-y-2">
            <DecorPicker
              value={picking.role === 'front' ? design.finish.front : design.carcass.types.find((t) => t.id === picking.carcassId)?.finish_id}
              onPick={(id) => {
                if (picking.role === 'front') setDesign({ finish: { ...design.finish, front: id } });
                else setCarcassFinish(picking.carcassId, id);
              }}
              onClear={() => {
                if (picking.role === 'front') setDesign({ finish: { ...design.finish, front: null } });
                else setCarcassFinish(picking.carcassId, null);
              }}
            />
            <div className="flex flex-wrap gap-1">
              {profile.appearance.finishes.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="cc-btn px-2"
                  onClick={() => {
                    if (picking.role === 'front') setDesign({ finish: { ...design.finish, front: f.id } });
                    else setCarcassFinish(picking.carcassId, f.id);
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── the JoineryCore half of it ── */}
        {missing.length > 0 ? (
          <div className="border border-status-warn/50 bg-status-warn/10 rounded p-2 space-y-1.5">
            <p className="text-[11px] text-status-warn">
              Not assigned materials — {missing.map((t) => t.label).join(', ')} has no board behind it yet.
              The look is set; the cost is not.
            </p>
            <button
              type="button"
              className="cc-btn"
              onClick={() => setAssigning(assigning ? null : missing[0].id)}
            >
              Assign from Materials stock
            </button>
            {assigning && (
              <select
                className="cc-input"
                value=""
                onChange={(e) => { setCarcassMaterial(assigning, e.target.value); setAssigning(null); }}
              >
                <option value="">Choose a board…</option>
                {boardMaterials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}{isJcMaterial(m) ? ' · JC' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-ink-400">
            Every carcass material is assigned{fromJc > 0 ? ` — ${fromJc} from JoineryCore` : ''}.
          </p>
        )}
      </section>
    </div>
  );
}

/** One material tile: what it looks like, what it is, and where it came from. */
function MaterialTile({ label, finish, material, active, onPick }) {
  const badge = isJcMaterial(material) ? 'JC' : null;
  const ownImage = finish?.texture && !finish?.decor;
  return (
    <button
      type="button"
      className={`border rounded overflow-hidden text-left transition-colors ${active
        ? 'border-gold'
        : 'border-shell-600 hover:border-ink-400'}`}
      onClick={onPick}
    >
      <span
        className="block h-12 bg-cover bg-center"
        style={{
          background: finish?.hex || '#7a7a7a',
          ...(ownImage ? { backgroundImage: `url(${finish.texture})` } : {}),
        }}
      />
      <span className="block px-1.5 py-1">
        <span className="flex items-center gap-1">
          <span className="text-[11px] text-ink-50 flex-1 truncate">{label}</span>
          {badge && <span className="cc-tag">{badge}</span>}
        </span>
        <span className="block text-[10px] text-ink-400 truncate" title={finish?.label || ''}>
          {finish?.label || 'Project finish'}
        </span>
        <span className="block text-[10px] text-ink-400 truncate">
          {material ? material.name : 'Not assigned'}
        </span>
      </span>
    </button>
  );
}
