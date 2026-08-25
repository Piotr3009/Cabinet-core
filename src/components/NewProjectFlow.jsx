import { useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import RoomModal from './RoomModal.jsx';
import WallElevationModal from './WallElevationModal.jsx';
import WizardSettings from './WizardSettings.jsx';
import WizardSummary from './WizardSummary.jsx';
import { useProjectStore } from '../stores/projectStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { PROJECT_TYPES, getProjectType, heightsForProjectType } from '../engine/projectTypes.js';
import { migrateDesign, projectHeights } from '../engine/design.js';
import { wizardStartBlockers } from '../engine/projectSettings.js';
import { useHistoryStore } from '../stores/historyStore.js';
import { DEFAULT_SCOPE, WIZARD_STEPS, backStep, stepsInScope } from '../lib/wizardSteps.js';
import { wardrobeSeed } from '../lib/wizardTabs.js';

// ─── New project (turn 7, CLAUDE.md F2 / BACKLOG #41) ───
//
// Five steps, and the whole point of them is that a workshop can click STRAIGHT
// THROUGH on the defaults in about ten seconds. Every answer has one already
// filled in: the number is proposed, the name and the client are optional, the
// type is a kitchen, the scope is ONE WALL (turn 49, F1 — it used to follow the
// type, and the owner's answer was "zawsze"), the settings are the last set
// used or the project's own. Nothing here is a decision that cannot be changed
// from the menu five minutes later, and the copy says so where it matters.
//
// The project is created in the store as soon as step 1 is left, so the ROOM
// step can be the room editor that already exists (RoomModal) rather than a
// second one written for the flow. That is CLAUDE.md's instruction — "the
// existing modal" — and it is also the only way the two cannot drift.

// ─── TURN 32 (CLAUDE.md F2): HARDWARE IS ITS OWN STEP ───────────────────────
// The ironmongery leaves the settings screen: the client-facing choices and
// the workshop choices are two different heads, and a screen that scrolls
// gets half-read. Step 5 is small and always fully pre-filled.
// ─── TURN 44 (CLAUDE.md F1): ONE WALL FIRST, AND THE WALL GETS A FACE ───────
// The scope step gains a SIXTH stop that only a one-wall job ever sees: the
// wall's own ELEVATION. It sits where the room editor sits for a whole-room
// job — between Scope and Project settings — because it answers the same
// question ("what am I building into?") for the other kind of job.
//
// The list and its Back arithmetic are `lib/wizardTabs.js`'s, so a node test
// can ask them without importing a `.jsx`.
const STEPS = WIZARD_STEPS;

/** Which project types open on T44's wardrobe seed (CLAUDE.md F3). */
const isWardrobeSeed = (id) => id === 'wardrobe';

export default function NewProjectFlow({
  initialNumber = '', onCancel, onStart, anchor = null,
}) {
  const newProject = useProjectStore((s) => s.newProject);
  const setProjectInfo = useProjectStore((s) => s.setProjectInfo);
  const setDesign = useProjectStore((s) => s.setDesign);
  const setProjectHeights = useProjectStore((s) => s.setProjectHeights);
  const storedDesign = useProjectStore((s) => s.project.design);
  const profile = useCabinetProfileStore((s) => s.profile);
  // T45 F4: the two readers this flow no longer needs. `notify` spoke for the
  // `Save as set & start` button (removed by name, iron rule 4) and the head is
  // read by the screens that filter on it — `WizardSettings` and
  // `WizardSummary` — rather than being carried through here to a step that no
  // longer exists.

  const [step, setStep] = useState('info');
  const [info, setInfo] = useState({ number: initialNumber, name: '', client: '' });
  const [typeId, setTypeId] = useState(PROJECT_TYPES[0].id);
  // ─── TURN 49 (CLAUDE.md F1): ONE WALL, ALWAYS ─────────────────────────────
  //
  // *"default powinno sie ustawic na one wall, zawsze."* The flow used to open
  // on `PROJECT_TYPES[0].scope` — a kitchen, so a whole room — and then the
  // TYPE wrote the scope again on every touch of a card (`scopeTouched` was the
  // flag that stopped it overwriting a hand). Both are gone: the opening answer
  // is `DEFAULT_SCOPE` and nothing but the scope cards ever writes it, which is
  // what "always" means. The type's own suggestion survives as the SENTENCE on
  // the scope step — *"A kitchen usually starts as a whole room"* — which is
  // advice a joiner can take in one click and not a decision taken for him.
  const [scope, setScope] = useState(DEFAULT_SCOPE);
  const [created, setCreated] = useState(false);

  const type = getProjectType(typeId);

  const go = (next) => {
    // T44 F1: a one-wall job goes to its ELEVATION where a whole-room job goes
    // to the plan. Neither skips straight to the settings any more — the wall
    // is the thing the owner said was missing.
    if (next === 'room' && scope === 'wall') { setStep('wall'); return; }
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
    // T49 F1: the scope is written the moment the project exists, so a job
    // abandoned before step 3 is still a ONE WALL job rather than the engine
    // default's room. It writes whatever the flow currently holds, so coming
    // back to step 1 and pressing Next again cannot undo a choice made later.
    setDesign({ scope });
    setStep('type');
  };

  const commitType = () => {
    // The type sets the project's starting heights. It is applied through the
    // ordinary setter, so a unit placed later inherits exactly what a unit
    // placed after an edit in Design Settings would.
    setDesign({ projectType: type.id });
    setProjectHeights(heightsForProjectType(type.id, profile));
    // ─── TURN 44 (CLAUDE.md F3): THE WARDROBE'S OWN TWO NUMBERS ────────────
    //
    // *"Dimensions: default height 2100, plinth 100 … depth 568."* The depth
    // is already the profile's (T32 F1.3, and the spec keeps it: *"depth
    // default stays 568"*); the height was not, and the plinth agreed.
    //
    // ─── TURN 50 (CLAUDE.md F13): …AND NOW IT READS THE PROFILE ────────────
    //
    // The owner, 25.08: *"default wysokości szaf 2150."*  T44 wrote 2100 as a
    // literal beside the wizard, with its reason: iron rule 2 froze
    // `src/engine/**` that night so the seed could not go in the profile. The
    // consequence is what F13 ends — a wardrobe STARTED here opened at 2100
    // while `projectHeights.tall` said 2150, so the same cabinet had two
    // default heights depending on which door it came in by.
    //
    // `wardrobeSeed(profile)` is that one number now. Still applied HERE and
    // through the same setter, so it is still the SEED a job starts on — one
    // project's number, editable on tab 1, exactly like every other height.
    if (isWardrobeSeed(type.id)) {
      const seed = wardrobeSeed(profile);
      setProjectHeights({ tall: seed.height, toeKick: seed.plinth });
    }
    // T49 F1: the type no longer writes the scope. It suggests one, on the
    // scope step, in a sentence.
    setStep('scope');
  };

  const commitScope = () => {
    setDesign({ scope });
    go('room');
  };

  // ─── TURN 45 (CLAUDE.md F4 / iron rule 4): `Save as set & start` IS GONE ──
  //
  // *"(`Save as set & start` is gone; the standard was already offered at the
  // settings finale.)"* Two buttons that both started the job, one of which
  // first grew a name field in the footer, were the wizard's last screen. The
  // offer survives — *"Save these as your standard?"*, on the summary itself,
  // with the naming done in `SaveSettingsSetModal` where it has room — and what
  // leaves this screen is ONE button.
  //
  // ─── CHAT FIX 15.08.2026 (evening): THE TWO CONTAINER GATES ───
  // The mockup's rule — the fronts open when the CARCASSES are saved, and the
  // step-5 Next opens when BOTH containers are. WizardSettings owns the
  // buttons; this only listens.
  const [gates, setGates] = useState({ carcasses: false, fronts: false });

  // ─── TURN 45 (CLAUDE.md F4 / F7): WHERE IN STEP 5 THE USER IS ────────────
  //
  // The tab, the tabs already visited and how far into each of the two
  // submodal walks he has got. It is held HERE rather than inside
  // `WizardSettings` so that leaving step 5 — for the summary's `Change…`, or
  // for F7's one-click jump to the room — and coming back puts him exactly
  // where he was. *"nothing resets, nothing re-asks."*
  const [walk, setWalk] = useState({
    tab: null, visited: [], carcStop: 'count', frontStop: 'count', carcSaved: false, frontsSaved: false,
  });

  // ─── TURN 45 (CLAUDE.md F7): THE DETOUR, AND THE WAY BACK ────────────────
  //
  // *"A cross-tab conflict … + a one-click jump to it (Wall/Room). Fixing it
  // returns the user STRAIGHT to where they were (Summary included)."*
  //
  // The owner's *"musiałem wszystko od nowa przechodzić — to jest chore"* was
  // this exactly: the fix was two steps back and going back meant walking
  // forward again. A DETOUR remembers the step it left from; the room and the
  // wall editors return to it instead of to their own defaults, and because the
  // walk is held here (F4) the tab, the visited strip and both submodal
  // positions are still standing when he lands.
  const [detour, setDetour] = useState(null);   // { back: 'settings' | 'summary' }
  const jumpTo = (culprit) => {
    setDetour({ back: step });
    setStep(culprit === 'wall' ? 'wall' : 'room');
  };
  /** Where a room/wall editor goes when it is done. */
  const leaveEditor = (fallback) => {
    if (detour) { const { back } = detour; setDetour(null); setStep(back); return; }
    setStep(fallback);
  };

  const index = STEPS.indexOf(step);
  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);

  // ─── TURN 32 (CLAUDE.md F1): WHAT STANDS BETWEEN HERE AND THE CANVAS ───────
  // No assignment → no Start (Generic counts; nothing does not). A wardrobe
  // taller than the room → no Start. The ceiling question, unanswered → no
  // Start. All decided by one pure engine function, so a node test can hold
  // the button to its word.
  const roomHeight = useProjectStore((s) => Number(s.project.room?.height) || 0);
  // Turn 39 (CLAUDE.md F7): the gate ASKS THE ASSIGNMENT STORE. A joiner who
  // named his boards in Assign materials has named them; the wizard's own
  // select is now one of two places that answer, not the only one. Nothing is
  // loosened — say it in neither place and it still blocks.
  const assignmentData = useMaterialAssignmentStore((s) => s.data);
  const { blockers } = useMemo(() => wizardStartBlockers({
    design, heights: projectHeights(design, profile), roomHeight, profile, assignments: assignmentData,
  }), [design, profile, roomHeight, assignmentData]);

  // The room step IS the room editor, shown in place.
  if (step === 'room') {
    return (
      <RoomModal
        anchor={anchor}
        // T49 F2: the wizard's door. The canned shapes — Rectangle, L-shape,
        // + Box — do not render on it: *"a room ustawienie z gory to usun
        // boxy, to bez sensu."* They are untouched behind the menu door.
        wizard
        onClose={() => leaveEditor('scope')}
        onApplied={() => leaveEditor('settings')}
      />
    );
  }

  // ─── T44 F1: …and the wall step IS the elevation editor, the same way ─────
  // Back returns to the scope card WITHOUT losing the wall: everything the
  // editor writes goes straight into the project's own room and slope lists,
  // so there is no draft to throw away and nothing to re-type.
  if (step === 'wall') {
    return (
      <WallElevationModal
        anchor={anchor}
        wallIndex={0}
        onBack={() => leaveEditor('scope')}
        onSave={() => leaveEditor('settings')}
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
          {/* ─── TURN 49 (CLAUDE.md F3): ONE BACK AT A TIME ─────────────────
              *"jak mamy otwarty modal to inne przyciski z glownego modalu nie
              powinny byc widoczne, to sie myli."* On STEP 5 the settings
              sequence draws its own navigation row — a Back that walks the
              submodal stops and the sub-tabs — and this footer drew a second
              Back and a second Next an inch under it. The owner pressed the
              wrong one, and he was right to: two buttons with the same word
              and different destinations is not a choice anybody can make.

              So on step 5 this footer stands down. It is NOT Back's behaviour
              that changed — F3 forbids that, and the arithmetic below
              (`backStep`) is the same function the sequence now calls when it
              has nowhere of its own left to go. *"jak zniknie 2x back to
              automatycznie bedzie poprawny back dzialal jak dziala."* */}
          {index > 0 && step !== 'settings' && (
            <button
              type="button"
              className="cc-btn"
              onClick={() => setStep(backStep(step, scope))}
            >
              Back
            </button>
          )}
          {step === 'info' && <button type="button" className="cc-btn-gold" onClick={commitInfo}>Next</button>}
          {step === 'type' && <button type="button" className="cc-btn-gold" onClick={commitType}>Next</button>}
          {step === 'scope' && (
            <button type="button" className="cc-btn-gold" onClick={commitScope}>
              {scope === 'room' ? 'Next — room setup' : 'Next — the wall'}
            </button>
          )}
            {/* ─── TURN 45 (CLAUDE.md F7): NEXT VALIDATES ONLY THE CURRENT TAB ─
                T44 disabled step 5's Next whenever ANY blocker stood — including
                a wardrobe-versus-room conflict answered on tab 5.1 — and said
                so in a tooltip. That is the hostage: a joiner who had finished
                the fronts could not go and look at the summary because of a
                number on another screen, and nothing on the screen told him
                where to go. What gates it now is the two container SAVES, which
                are the tabs' own answer. The conflict is stated AT ITS FIELD
                with a door beside it, and `Start designing` — the one button
                that commits — still refuses a job that cannot be built.

                ─── TURN 49 (CLAUDE.md F3): …AND IT IS NOT DRAWN HERE ─────────
                The gate is unchanged and so is the button: both saves, the same
                tooltip, the same `data-next-summary` / `data-next-hardware`
                hooks a walk written against either turn looks for. It is drawn
                at the END OF THE SEQUENCE'S OWN ROW instead of a second time in
                this footer, because two Nexts an inch apart is what the owner
                circled. `WizardSettings` is handed `onStepNext` below. */}
          {/* ─── TURN 45 (CLAUDE.md F4): ONE BUTTON ──────────────────────────
              *"and ONE button: `Start designing`."* `Save as set & start` — and
              the name field it grew in this footer — are REMOVED by name (iron
              rule 4). The offer itself stands on the summary above, where it
              has a modal to be named in. */}
          {step === 'summary' && (
            <button
              type="button"
              className="cc-btn-gold"
              disabled={blockers.length > 0}
              title={blockers.length ? blockers.map((b) => b.message).join('\n') : undefined}
              data-start-designing="1"
              onClick={() => onStart()}
            >
              Start designing
            </button>
          )}
        </>
      )}
    >
      <div
        className="space-y-4"
        // T49 F3: which step this is, and where the two container gates stand.
        // The walk reads them rather than inferring them from a disabled
        // button — the button it used to read is now the sequence's own.
        data-wizard-step={step}
        data-wizard-gates={`${gates.carcasses ? 'carcasses' : ''}${gates.carcasses && gates.fronts ? '+' : ''}${gates.fronts ? 'fronts' : ''}` || 'none'}
      >
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
                  onClick={() => setTypeId(t.id)}
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
          /* ─── TURN 44 (CLAUDE.md F1): ONE WALL IS THE FIRST CARD ────────────
              The owner, 23.08.2026, with the screenshots in his hand. One wall
              is what most of the jobs he actually quotes are, so it is first
              and it is where the keyboard lands. THE COPY IS UNCHANGED — F1
              says so in as many words, and a card that had been re-argued
              would have been a different card.

              Choosing it opens the wall's own ELEVATION at once (the 'wall'
              step above), because "one wall" with nothing to say about that
              wall was the hole. Whole room is second and behaves exactly as it
              always has. */
          <section className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                ['wall', 'One wall', 'Straight to the canvas — walls come later'],
                ['room', 'Whole room', 'Four walls, a ceiling height, windows and doors'],
              ].map(([id, label, hint], i) => (
                <button
                  key={id}
                  type="button"
                  // The first card takes the focus on the way in — "the default
                  // focus" of F1, and the card a return key would press.
                  autoFocus={i === 0}
                  data-scope-card={id}
                  data-scope-first={i === 0 ? '1' : undefined}
                  className={`border rounded p-3 text-left transition-colors ${scope === id
                    ? 'border-gold bg-shell-700'
                    : 'border-shell-600 hover:bg-shell-700'}`}
                  onClick={() => {
                    setScope(id);
                    // One wall goes STRAIGHT to the wall (F1). Whole room waits
                    // for Next, exactly as it did, because the plan editor is a
                    // bigger decision than a click on a card.
                    if (id === 'wall') { setDesign({ scope: 'wall' }); setStep('wall'); }
                  }}
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
          /* ─── TURN 32 (CLAUDE.md F1): ONE SCREEN, NO SCROLLING ───
              The owner dictated the shape: number/client/type, saved sets as
              a LOAD list, dimensions per project type with the ceiling
              guards, FRONTS BEFORE MATERIALS, one material picker, sheen.
              The turn-12 lesson still holds — this surface writes through
              the SAME store setters Design Settings uses, so nothing set
              here can fail to reach the furniture. The full panel stays in
              the Settings menu. */
          <WizardSettings
            onRoomSetup={() => setStep('room')}
            onGate={(carcasses, fronts) => setGates({ carcasses, fronts })}
            walk={walk}
            onWalk={setWalk}
            onJump={jumpTo}
            // T49 F3: the ONE navigation row. When the sequence has nowhere of
            // its own left to go it reaches the STEP either side of it, through
            // exactly the arithmetic this footer used (`backStep`) and exactly
            // the destination its Next had.
            onStepBack={() => setStep(backStep(step, scope))}
            onStepNext={() => setStep('summary')}
            // The WORDS stay this file's: it is the step that knows where its
            // Next goes, and "Next — summary" is what the button has said since
            // T45 F4 replaced step 6 with the summary.
            stepNextLabel="Next — summary"
          />
        )}

        {/* ─── TURN 45 (CLAUDE.md F4): STEP 6 IS THE SUMMARY ────────────────
            *"the whole project in miniatures — chosen decor tiles, base
            dimensions, hardware — `Change` per section"*. The four hardware
            questions this step used to ask a second time live in tab 5.4, which
            is where `Change…` sends a hand that wants them. */}
        {step === 'summary' && (
          <WizardSummary
            onChangeTab={(tabId) => {
              setWalk((w) => ({
                ...w,
                tab: tabId,
                visited: w.visited.includes(tabId) ? w.visited : [...w.visited, tabId],
              }));
              setStep('settings');
            }}
            onChangeStep={(stepId) => setStep(stepId)}
            onJump={jumpTo}
            blockers={blockers}
          />
        )}
      </div>
    </Modal>
  );
}

function Steps({ current, scope }) {
  const shown = stepsInScope(scope);
  const labels = {
    info: 'Project', type: 'Type', scope: 'Scope', room: 'Room', wall: 'Wall', settings: 'Project settings', summary: 'Summary',
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
