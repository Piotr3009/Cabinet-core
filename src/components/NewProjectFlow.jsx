import { useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import RoomModal from './RoomModal.jsx';
import WizardSettings from './WizardSettings.jsx';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useSettingsSetsStore } from '../stores/settingsSetsStore.js';
import { PROJECT_TYPES, getProjectType, heightsForProjectType } from '../engine/projectTypes.js';
import { migrateDesign, projectHeights } from '../engine/design.js';
import { wizardStartBlockers } from '../engine/projectSettings.js';
import { useHistoryStore } from '../stores/historyStore.js';

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

export default function NewProjectFlow({
  initialNumber = '', onCancel, onStart, anchor = null,
}) {
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
      // A different job: the undo stack from the last one must not reach into it
      // (turn 12, CLAUDE.md F9 — the history survives nothing, least of all a
      // project boundary).
      useHistoryStore.getState().clear();
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

  // ─── Start designing (turn 11, CLAUDE.md F9.5) ───
  // "ask once: 'Save these settings as a set?'". ONCE is the important word: a
  // workshop that has just spent a minute setting the job up the way it builds
  // is one keystroke from never having to do it again, and a workshop that does
  // not want to is one click from the canvas. It is asked HERE and nowhere else.
  const [asking, setAsking] = useState(false);
  const [setName, setSetName] = useState('');
  const saveSet = useSettingsSetsStore((s) => s.save);

  const start = () => {
    if (asking) { onStart(); return; }
    setAsking(true);
    setSetName(info.name.trim() || `${type.label} standard`);
  };

  const keepAndStart = () => {
    const name = setName.trim();
    if (name) {
      const { replaced } = saveSet(name, design);
      notify(replaced ? `Settings set "${name}" replaced.` : `Settings set "${name}" saved.`, 'ok');
    }
    onStart();
  };

  const index = STEPS.indexOf(step);
  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);

  // ─── TURN 32 (CLAUDE.md F1): WHAT STANDS BETWEEN HERE AND THE CANVAS ───────
  // No assignment → no Start (Generic counts; nothing does not). A wardrobe
  // taller than the room → no Start. The ceiling question, unanswered → no
  // Start. All decided by one pure engine function, so a node test can hold
  // the button to its word.
  const roomHeight = useProjectStore((s) => Number(s.project.room?.height) || 0);
  const { blockers } = useMemo(() => wizardStartBlockers({
    design, heights: projectHeights(design, profile), roomHeight, profile,
  }), [design, profile, roomHeight]);
  const blocked = step === 'settings' && blockers.length > 0;

  // The room step IS the room editor, shown in place.
  if (step === 'room') {
    return (
      <RoomModal
        anchor={anchor}
        onClose={() => setStep('scope')}
        onApplied={() => setStep('settings')}
      />
    );
  }

  return (
    <Modal
      name="new-project"
      title="New project"
      anchor={anchor}
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
          {step === 'settings' && !asking && (
            <button
              type="button"
              className="cc-btn-gold"
              disabled={blocked}
              title={blocked ? blockers.map((b) => b.message).join('\n') : undefined}
              data-start-designing="1"
              onClick={start}
            >
              Start designing
            </button>
          )}
          {step === 'settings' && asking && (
            <>
              <input
                className="cc-input w-[220px]"
                autoFocus
                placeholder="Name this set…"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') keepAndStart(); }}
              />
              <button type="button" className="cc-btn" onClick={() => onStart()}>No, just start</button>
              <button type="button" className="cc-btn-gold" disabled={!setName.trim()} onClick={keepAndStart}>
                Save set &amp; start
              </button>
            </>
          )}
        </>
      )}
    >
      <div className="space-y-4">
        <Steps current={step} scope={scope} />

        {step === 'info' && (
          <section className="space-y-3">
            {/* ─── Turn 11 (CLAUDE.md F9, step 1) ───
                ABOVE the number, and called what it does. "Select from
                JoineryCore" sat beside the CLIENT field, which read as a client
                picker and confused everybody who met it: what it will actually
                do is IMPORT the job — the client AND the number together, from
                the system the workshop already runs its orders in. So it goes
                where the import would land, and it says import.

                Disabled with a "soon" badge: the data turn wires it, and the
                auto-fill of client + number lands then. A button that opened a
                half-answer would be worse than one that says "not yet". */}
            <div>
              <button
                type="button"
                className="cc-btn"
                disabled
                title="Pull this job's number and client straight from Joinery Core — a later phase"
              >
                Import from Joinery Core
                <span className="cc-tag ml-1.5">soon</span>
              </button>
            </div>
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
            <label className="block">
              <span className="cc-label">Client <span className="text-ink-400">(optional)</span></span>
              <input
                className="cc-input"
                value={info.client}
                onChange={(e) => setInfo({ ...info, client: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') commitInfo(); }}
              />
              <span className="block text-[10px] text-ink-400 mt-0.5">
                Free text for now — the import above fills it in once Joinery Core is wired.
              </span>
            </label>
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

        {step === 'settings' && (
          <>
            {asking && (
              <p className="text-sm text-gold border border-gold/50 bg-gold/5 rounded px-3 py-2">
                Save these settings as a set? The next job starts from it by name — or start designing
                and this project keeps them to itself.
              </p>
            )}
            {/* ─── TURN 32 (CLAUDE.md F1): ONE SCREEN, NO SCROLLING ───
                The owner dictated the shape: number/client/type, saved sets as
                a LOAD list, dimensions per project type with the ceiling
                guards, FRONTS BEFORE MATERIALS, one material picker, sheen.
                The turn-12 lesson still holds — this surface writes through
                the SAME store setters Design Settings uses, so nothing set
                here can fail to reach the furniture. The full panel stays in
                the Settings menu. */}
            <WizardSettings onRoomSetup={() => setStep('room')} />
          </>
        )}
      </div>
    </Modal>
  );
}

function Steps({ current, scope }) {
  const shown = STEPS.filter((s) => s !== 'room' || scope === 'room');
  const labels = {
    info: 'Project', type: 'Type', scope: 'Scope', room: 'Room', settings: 'Project settings',
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
