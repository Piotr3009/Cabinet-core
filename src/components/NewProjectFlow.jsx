/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Modal from './Modal.jsx';
import RoomModal from './RoomModal.jsx';
import WallElevationModal from './WallElevationModal.jsx';
import WizardSettings from './WizardSettings.jsx';
import WizardSummary from './WizardSummary.jsx';
import { SetupIcon, ProjectTypeArt, ScopeArt } from './SetupArt.jsx';
import './setup-workspace.css';
import { useProjectStore } from '../stores/projectStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useHistoryStore } from '../stores/historyStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { PROJECT_TYPES, getProjectType, heightsForProjectType } from '../engine/projectTypes.js';
// CHAT FIX 28.10.2026, the owner: "media wall, utility, other i hallway zostaw ale zablokuj i
// napisz coming soon". The four stay on the grid, locked, until their turns.
const SOON_TYPES = ['media_wall', 'utility', 'hallway', 'other'];
import { migrateDesign, projectHeights } from '../engine/design.js';
import { wizardStartBlockers } from '../engine/projectSettings.js';
import { DEFAULT_SCOPE } from '../lib/wizardSteps.js';
import { visibleTabs, wardrobeSeed } from '../lib/wizardTabs.js';
// T-CC1a F5: an item is born bound to the Joinery Core project it was opened from (cc_create_item).
import { startItem } from '../lib/jcList.js';

const SECTION_META = {
  project: { label: 'Project', icon: 'project', hint: 'Name the job and choose what you are making.' },
  space: { label: 'Space', icon: 'space', hint: 'Set the space, then place openings and wall features.' },
  settings: { label: 'Dimensions', icon: 'dimensions', hint: 'Review the dimensions and the workshop standard for this job.' },
  carcases: { label: 'Carcases', icon: 'carcases', hint: 'Choose the boards, finishes and construction for each carcass type.' },
  fronts: { label: 'Fronts', icon: 'fronts', hint: 'Choose each front style, material, opening and finish.' },
  hardware: { label: 'Hardware', icon: 'hardware', hint: 'Set the hinges, runners and fittings for this project.' },
  production: { label: 'Production', icon: 'production', hint: 'Review measured thicknesses, infills and manufacturing settings.' },
  lighting: { label: 'Lighting', icon: 'lighting', hint: 'Set the LED groove and driver rules. Final length follows the layout.' },
  review: { label: 'Review & start', icon: 'review', hint: 'Check the whole project. Each Change action returns straight here.' },
};
const STATUS_LABEL = {
  confirmed: 'Confirmed', standard: 'Workshop standard', 'needs-review': 'Needs review',
  'in-progress': 'In progress', 'not-started': 'Not started', blocked: 'Needs attention',
};
const DEPENDENCIES = {
  project: [], space: ['settings'], settings: ['production'],
  carcases: ['production'], fronts: ['hardware', 'production'],
  hardware: [], production: [], lighting: [],
};
const INITIAL_STATUS = {
  project: 'not-started', space: 'not-started', settings: 'standard',
  carcases: 'not-started', fronts: 'not-started', hardware: 'standard',
  production: 'standard', lighting: 'standard',
};
// Editors normalise/copy their room records on mount. A new object identity is
// not a new measurement and must not invalidate an already confirmed section.
const sameRoomValues = (left, right) => JSON.stringify(left) === JSON.stringify(right);

// ─── T-CC1a F5 · NEW ITEM BINDS TO A JC PROJECT (CLAUDE.md T-CC1a law 4) ─────
// The owner, 30.10.2026: *"automatyczne polaczenie danego projektu do danego
// pipelinu lub production projektu"*. The flow is opened from a project row of
// the start screen (`jcProject`: kind, id, number, name, client) and shows that
// project READ-ONLY; the one typed field is the item's name. Confirming the
// first section asks Joinery Core for the item (`cc_create_item`, through
// withDb): the record is built with the server's id and the row's
// jc_project_number, and nothing is made locally when JC refuses (403,
// offline): the words stay on the flow. The rest of the workspace is as it was.

/** One workspace, the existing editors and store setters, one navigation row. */
export default function NewProjectFlow({ jcProject = null, onCancel, onStart, anchor = null }) {
  const project = useProjectStore((s) => s.project);
  const profile = useCabinetProfileStore((s) => s.profile);
  const assignmentData = useMaterialAssignmentStore((s) => s.data);
  const audience = useUiStore((s) => s.audience);
  const [step, setStep] = useState('project');
  const [info, setInfo] = useState({ name: '' });
  const [refusal, setRefusal] = useState(null);   // JC's words when cc_create_item was refused
  const [asking, setAsking] = useState(false);    // cc_create_item in flight
  const [typeId, setTypeId] = useState(PROJECT_TYPES[0].id);
  const [scope, setScope] = useState(DEFAULT_SCOPE);
  const [created, setCreated] = useState(false);
  const [status, setStatus] = useState(INITIAL_STATUS);
  const [walk, setWalk] = useState({
    tab: 'settings', visited: [], carcStop: 'count', frontStop: 'count', carcSaved: false, frontsSaved: false,
  });
  const gates = { carcasses: Boolean(walk.carcSaved), fronts: Boolean(walk.frontsSaved) };
  const [navigation, setNavigation] = useState(null);
  const [returnLabel, setReturnLabel] = useState(null);
  const [spaceEditor, setSpaceEditor] = useState(null);
  const [roomDraft, setRoomDraft] = useState(null);
  const returnTo = useRef(null);
  const seededType = useRef(null);
  const heading = useRef(null);
  const content = useRef(null);
  const confirmedRoom = useRef(null);
  const previousRoom = useRef(project.room);
  const previousDraft = useRef(null);
  const design = useMemo(() => migrateDesign(project.design), [project.design]);
  const tabs = visibleTabs(audience);
  const activeTab = tabs.some((t) => t.id === walk.tab) ? walk.tab : tabs[0].id;
  const active = step === 'settings' ? activeTab : step === 'summary' ? 'review' : step;
  const editor = spaceEditor || (scope === 'wall' ? 'wall' : 'room');
  const sections = ['project', 'space', ...tabs.map((t) => t.id), 'review'];
  const { blockers, materials } = useMemo(() => wizardStartBlockers({
    design, heights: projectHeights(design, profile), roomHeight: Number(project.room?.height) || 0,
    profile, assignments: assignmentData,
  }), [design, profile, project.room?.height, assignmentData]);

  const markDirty = useCallback((id) => {
    setStatus((old) => {
      const next = { ...old, [id]: old[id] === 'confirmed' || old[id] === 'standard' ? 'needs-review' : 'in-progress' };
      for (const dependent of DEPENDENCIES[id] || []) {
        if (old[dependent] === 'confirmed' || old[dependent] === 'standard') next[dependent] = 'needs-review';
      }
      return Object.keys(next).every((key) => next[key] === old[key]) ? old : next;
    });
  }, []);
  const confirm = useCallback((id) => setStatus((old) => ({ ...old, [id]: 'confirmed' })), []);
  const clearReturn = useCallback(() => { returnTo.current = null; setReturnLabel(null); }, []);
  const settingsNavigation = useCallback((value) => setNavigation({ owner: 'settings', ...value }), []);
  const wallNavigation = useCallback((value) => setNavigation({ owner: 'wall', ...value }), []);
  const roomNavigation = useCallback((value) => setNavigation({ owner: 'room', ...value }), []);

  useEffect(() => {
    content.current?.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [active]);
  useEffect(() => {
    if (created && !sameRoomValues(previousRoom.current, project.room)
      && !sameRoomValues(confirmedRoom.current, project.room)) markDirty('space');
    previousRoom.current = project.room;
  }, [created, project.room, markDirty]);

  const readProjectFields = () => {
    if (!created) return;
    const current = useProjectStore.getState().project;
    const currentDesign = migrateDesign(current.design);
    setInfo({ name: current.name || '' });
    setTypeId(currentDesign.projectType || typeId);
    setScope(currentDesign.scope || scope);
    seededType.current = currentDesign.projectType || typeId;
  };
  const goSection = (id, { keepReturn = false } = {}) => {
    if (id === active) return;
    if (!keepReturn) clearReturn();
    setNavigation(null);
    setSpaceEditor(null);
    if (id === 'project') { readProjectFields(); setStep('project'); }
    else if (id === 'space') setStep('space');
    else if (id === 'review') setStep('summary');
    else {
      setWalk((old) => ({ ...old, tab: id, visited: [...new Set([...old.visited, id])] }));
      setStep('settings');
    }
  };
  const resume = (fallback) => {
    const destination = returnTo.current;
    clearReturn();
    if (destination) {
      setNavigation(null);
      if (destination.step === 'settings') {
        setWalk((old) => ({ ...old, tab: destination.tab }));
        setStep('settings');
      } else setStep(destination.step);
    } else goSection(fallback);
  };
  const editFromReview = (id) => {
    returnTo.current = { step: 'summary' };
    setReturnLabel('Return to review');
    goSection(id, { keepReturn: true });
  };
  const jumpTo = (culprit) => {
    returnTo.current = { step, tab: activeTab };
    setReturnLabel(step === 'summary' ? 'Return to review' : `Return to ${SECTION_META[activeTab].label.toLowerCase()}`);
    setNavigation(null);
    setSpaceEditor(culprit === 'wall' ? 'wall' : 'room');
    setStep('space');
  };

  const commitProject = (destination = 'space') => {
    const store = useProjectStore.getState();
    const name = info.name.trim();
    if (!name) { setRefusal('Name the item first: what is it (Kitchen, Wardrobe bedroom 2 ...)?'); return; }
    if (created) { store.setProjectInfo({ name }); settleProject(destination, true); return; }
    if (asking) return;
    if (!jcProject?.id) { setRefusal('Open New item from a project of the list: an item belongs to one Joinery Core project.'); return; }
    setAsking(true);
    startItem({
      name,
      project: jcProject,
      newProject: (n, opts) => { useHistoryStore.getState().clear(); store.newProject(n, opts); },
    }).then((born) => {
      setAsking(false);
      if (!born.ok) { setRefusal(born.error); return; }
      setRefusal(null);
      setCreated(true);
      settleProject(destination, false);
    });
  };
  // The rest of the first section's confirm, as it was: `created` is whether the item stood before this confirm.
  const settleProject = (destination, created) => {
    const store = useProjectStore.getState();
    store.setDesign({ scope, projectType: typeId });
    // Revisiting the name or client must never re-seed customised heights.
    if (!created || seededType.current !== typeId) {
      store.setProjectHeights(heightsForProjectType(typeId, profile));
      if (typeId === 'wardrobe') {
        const seed = wardrobeSeed(profile);
        store.setProjectHeights({ tall: seed.height, toeKick: seed.plinth });
      }
      if (created) markDirty('settings');
      seededType.current = typeId;
    }
    confirm('project');
    resume(destination);
  };
  const completeSpace = () => {
    confirmedRoom.current = useProjectStore.getState().project.room;
    setScope(useProjectStore.getState().project.design?.scope || scope);
    confirm('space');
    resume('settings');
  };
  const receiveDraft = useCallback((draft) => {
    if (previousDraft.current && !sameRoomValues(previousDraft.current.draft, draft?.draft)) markDirty('space');
    previousDraft.current = draft;
    setRoomDraft(draft);
  }, [markDirty]);
  const sectionComplete = useCallback((id) => {
    confirm(id);
    if (returnTo.current?.step === 'summary') {
      returnTo.current = null;
      setReturnLabel(null);
      setNavigation(null);
      setStep('summary');
    }
  }, [confirm]);

  const sectionStatus = (id) => {
    if (!created) return id === 'project' ? 'in-progress' : 'not-started';
    if (id === 'carcases' && materials.carcass.some((item) => !item.assigned)) return 'blocked';
    if (id === 'fronts' && materials.fronts.some((item) => !item.assigned)) return 'blocked';
    if (id === 'settings' && blockers.some((b) => ['over-ceiling', 'ceiling-question'].includes(b.code))) return 'blocked';
    if (id === 'review') return blockers.length || !gates.carcasses || !gates.fronts || status.space !== 'confirmed'
      || sections.some((section) => status[section] === 'needs-review') ? 'blocked' : 'confirmed';
    if (id === active && status[id] === 'not-started') return 'in-progress';
    return status[id] || 'not-started';
  };
  const readyCount = sections.filter((id) => id !== 'review' && ['confirmed', 'standard'].includes(sectionStatus(id))).length;
  const needsReview = sections.filter((id) => id !== 'review' && status[id] === 'needs-review');
  const confirmationHints = [
    ...(!gates.carcasses ? ['Confirm the carcases section.'] : []),
    ...(!gates.fronts ? ['Confirm the fronts section.'] : []),
    ...(status.space !== 'confirmed' ? ['Confirm the space.'] : []),
    ...(needsReview.length ? [`Review changed settings: ${needsReview.map((id) => SECTION_META[id].label).join(', ')}.`] : []),
  ];
  const canStart = created && blockers.length === 0 && confirmationHints.length === 0;
  const nav = (step === 'settings' && navigation?.owner === 'settings' && navigation.tab === activeTab)
    || (step === 'space' && navigation?.owner === editor) ? navigation : null;
  const primaryLabel = step === 'project' ? (returnLabel || 'Confirm project & continue')
    : step === 'summary' ? 'Start designing'
      : returnLabel && (step === 'space' || nav?.atSectionEnd) ? returnLabel
        : nav?.nextLabel || 'Continue';
  const primaryAction = step === 'project' ? () => commitProject()
    : step === 'summary' ? onStart : nav?.next;
  const primaryDisabled = step === 'summary' ? !canStart : step === 'project' ? asking : !nav || nav.canNext === false;
  const backAction = step === 'summary' ? () => goSection(tabs[tabs.length - 1].id)
    : step === 'settings' || step === 'space' ? nav?.back : null;
  const currentMeta = SECTION_META[active];
  const footerHint = step === 'project' && refusal ? refusal
    : step === 'summary' ? (canStart ? 'Ready to create the design. Save (Ctrl+S) writes it to Joinery Core.' : [...blockers.map((b) => b.message), ...confirmationHints].join(' '))
      : nav?.hint || 'Item draft. Confirmed sections are shown in the sidebar; the item is made in Joinery Core when the first section is confirmed.';

  return (
    <Modal
      name="new-project" title="New item" anchor={anchor} workspace className="cc-setup"
      onClose={onCancel}
      onEscape={() => { if (backAction) backAction(); else if (step === 'project') onCancel(); }}
      footer={(
        <div className="cc-setup-footer">
          <div className="cc-setup-footer-note" role="status" aria-live="polite">{footerHint}</div>
          <div className="cc-setup-footer-actions">
            {backAction && <button type="button" className="cc-btn" data-setup-back="1" onClick={backAction}>Back</button>}
            <button type="button" className="cc-btn-gold" data-setup-primary="1"
              data-start-designing={step === 'summary' ? '1' : undefined}
              disabled={primaryDisabled} onClick={primaryAction}>{primaryLabel}<SetupIcon name="arrow-right" /></button>
          </div>
        </div>
      )}
    >
      <div className="cc-setup-layout" data-wizard-step={step === 'project' ? 'info' : step === 'space' ? editor : step}
        data-wizard-gates={`${gates.carcasses ? 'carcasses' : ''}${gates.carcasses && gates.fronts ? '+' : ''}${gates.fronts ? 'fronts' : ''}` || 'none'}>
        <aside className="cc-setup-sidebar" aria-label="Project setup progress">
          <div className="cc-setup-sidebar-intro"><span className="cc-setup-kicker">Project setup</span><strong>{created ? project.name : 'Your next item'}</strong>
            <span>{created ? `${readyCount} of ${sections.length - 1} sections ready` : 'Start with the project details'}</span>
            <progress className="cc-setup-progress" value={readyCount} max={sections.length - 1} aria-label="Sections ready" />
          </div>
          <nav aria-label="Setup sections">
            {sections.map((id, index) => {
              const state = sectionStatus(id);
              return <button key={id} type="button" className="cc-setup-nav-item"
                data-setup-section={id} data-active={active === id} data-status={state}
                aria-current={active === id ? 'step' : undefined}
                disabled={!created && id !== 'project'} onClick={() => {
                  if (id === active) return;
                  if (step === 'project') commitProject(id);
                  else goSection(id);
                }}>
                <span className="cc-setup-nav-icon"><SetupIcon name={SECTION_META[id].icon} /></span>
                <span className="cc-setup-nav-copy"><strong>{index + 1}. {SECTION_META[id].label}</strong><small>{STATUS_LABEL[state]}</small></span>
                {state === 'confirmed' && <SetupIcon name="check" className="cc-setup-nav-check" />}
              </button>;
            })}
          </nav>
          <div className="cc-setup-sidebar-note">Workshop standards can be kept. Changing a related setting marks the affected section for review.</div>
        </aside>
        <main className="cc-setup-main">
          <header className="cc-setup-heading">
            <SetupIcon name={currentMeta.icon} />
            <div><span className="cc-setup-kicker">Section {sections.indexOf(active) + 1} of {sections.length}</span>
              <h1 ref={heading} tabIndex={-1}>{currentMeta.label}</h1><p>{currentMeta.hint}</p></div>
            {returnLabel && <span className="cc-setup-status">Editing from {returnTo.current?.step === 'summary' ? 'review' : 'settings'}</span>}
          </header>
          <div className="cc-setup-content" ref={content}>
            {step === 'project' && <div className="cc-setup-project">
              <section className="cc-setup-project-details">
                {/* T-CC1a F5: the Joinery Core project, READ-ONLY (its number is JC's, never typed here). */}
                <div className="cc-setup-field-grid" data-jc-bound-project={jcProject?.key || ''}>
                  {[['number', 'Project number'], ['name', 'Project'], ['client', 'Client']].map(([key, label]) => <label key={key} className="block">
                    <span className="cc-label">{label}</span><input className="cc-input" data-jc-project-field={key} readOnly
                      value={jcProject?.[key] || ''} title="Joinery Core's: read-only in Cabinet Core" />
                  </label>)}
                </div>
                <div className="cc-setup-field-grid">
                  <label className="block cc-setup-required" data-required="1">
                    <span className="cc-label">Item name<em className="cc-setup-required-mark" title="Required">*</em></span><input className="cc-input" data-project-field="name" required aria-required
                      value={info.name} placeholder="Kitchen, Wardrobe bedroom 2 ..." onChange={(e) => { setInfo({ name: e.target.value }); setRefusal(null); markDirty('project'); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitProject(); }} />
                  </label>
                </div>
                {refusal && <p className="cc-setup-help text-status-danger" role="alert" data-jc-refusal="1">{refusal}</p>}
              </section>
              <section><h2>What are you making?</h2><p className="cc-setup-help">The type sets the starting dimensions and where the furniture library opens. You can adjust every dimension later.</p>
                <div className="cc-setup-project-grid">{PROJECT_TYPES.map((type) => {
                  const soon = SOON_TYPES.includes(type.id);
                  return <button key={type.id} type="button"
                    className={soon ? 'cc-setup-type-card cc-setup-type-soon' : 'cc-setup-type-card'} data-project-type={type.id} data-project-type-soon={soon ? '1' : undefined}
                    aria-pressed={typeId === type.id} disabled={soon} aria-disabled={soon || undefined}
                    onClick={() => { if (soon) return; setTypeId(type.id); markDirty('project'); }} title={soon ? `${type.label}: coming soon` : type.hint}>
                    <ProjectTypeArt type={type.id} /><strong>{type.label}{soon && <span className="cc-tag cc-setup-soon-tag">Coming soon</span>}</strong><span>{type.hint}</span>
                  </button>;
                })}</div>
              </section>
            </div>}
            {/* CHAT FIX 28.10.2026, the owner: "settings up space powinno byc w 2 nie w jedynce, czyli wybor
                jedna sciana / 2 sciany powinny byc w 2 na samej gorze": the scope cards open section 2. */}
            {step === 'space' && <div className="cc-setup-space-head">
              <section className="cc-setup-scope-section"><h2>How much space are you setting up?</h2>
                <div className="cc-setup-scope-grid">{[
                  ['wall', 'One wall', 'Set the elevation, dimensions, openings and wall features.'],
                  ['room', 'Whole room', 'Set the plan, working walls, ceiling height and openings.'],
                ].map(([id, label, hint], index) => <button key={id} type="button" className="cc-setup-scope-card"
                  data-scope-card={id} data-scope-first={index === 0 ? '1' : undefined} aria-pressed={id === 'wall' ? scope === 'wall' : scope !== 'wall'}
                  onClick={() => {
                    const nextScope = id === 'wall' ? 'wall' : scope === 'wall' ? 'room' : scope;
                    if (scope !== nextScope) {
                      setScope(nextScope); markDirty('space');
                      // CHAT FIX 28.10.2026: the choice lives in section 2 now, so it
                      // steers the editor under it at once and the project's own record.
                      setSpaceEditor(null);
                      if (created) useProjectStore.getState().setDesign({ scope: nextScope });
                    }
                  }}>
                  <ScopeArt scope={id} /><span><strong>{label}</strong><small>{hint}</small></span>
                </button>)}</div>
                {getProjectType(typeId).scope !== scope && <p className="cc-setup-help">A {getProjectType(typeId).label.toLowerCase()} usually starts as {getProjectType(typeId).scope === 'wall' ? 'one wall' : 'a whole room'}. You can keep your choice.</p>}
              </section>
            </div>}
            {step === 'space' && editor === 'wall' && <WallElevationModal embedded wallIndex={0}
              onNavigationChange={wallNavigation} onBack={() => resume('project')} onSave={completeSpace} />}
            {step === 'space' && editor === 'room' && <RoomModal embedded wizard
              draftState={roomDraft} onDraftState={receiveDraft} onNavigationChange={roomNavigation}
              onClose={() => resume('project')} onApplied={completeSpace} />}
            {step === 'settings' && <WizardSettings embedded walk={walk} onWalk={setWalk}
              onNavigationChange={settingsNavigation} onSectionComplete={sectionComplete} onSectionDirty={markDirty}
              onRoomSetup={() => jumpTo(scope === 'wall' ? 'wall' : 'room')} onJump={jumpTo}
              onStepBack={() => goSection('space')} onStepNext={() => goSection('review')} stepNextLabel="Review project" />}
            {step === 'summary' && <>
              {confirmationHints.length > 0 && <div className="cc-setup-review-notice" role="status">
                <strong>A few sections still need confirmation</strong>
                <ul>{confirmationHints.map((hint) => <li key={hint}>{hint}</li>)}</ul>
              </div>}
              <WizardSummary blockers={blockers} onChangeTab={editFromReview}
                onChangeStep={(id) => editFromReview(['info', 'type', 'scope'].includes(id) ? 'project' : 'space')} onJump={jumpTo} />
            </>}
          </div>
        </main>
      </div>
    </Modal>
  );
}
