import { useCallback, useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import MockModeBadge from './MockModeBadge.jsx';
import AudienceToggle from './AudienceToggle.jsx';
import NewProjectFlow from './NewProjectFlow.jsx';
import {
  browserStorage, deleteLocalProject, listLocalProjects, loadLocalProject,
  mergeProjectLists, nextProjectNumber, recentProjects, saveLocalProject, touchLocalProject,
} from '../lib/projectLibrary.js';
import { listProjects, loadProject as loadCloudProject } from '../lib/cloudSync.js';
import { isMockMode } from '../lib/supabase.js';
import { anchorOfEvent } from '../lib/modalAnchor.js';
import { getProjectType } from '../engine/projectTypes.js';
import { migrateDesign } from '../engine/design.js';
import { useHistoryStore } from '../stores/historyStore.js';

// ─── Start screen (BACKLOG #7; turn 7, BACKLOG #41) ───
// The AutoCAD arrangement, because that is what Piotr opens every morning:
// the name of the thing top left, what you can DO down the left, and the work
// you had open filling the page. The canvas is reached THROUGH a project —
// there is no way in without one, so a drawing always belongs somewhere.
//
// Turn 7 changes two things. The room DIMENSIONS are gone from here — a room is
// set up in the room editor, and asking for a width and a depth on the way past
// was asking for two numbers nobody had yet. And a project row now reads the
// way a workshop refers to a job: its number, its name and when it was last
// touched, and nothing else.

const stamp = (ms) => {
  if (!ms) return '';
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function StartScreen() {
  const storage = useMemo(() => browserStorage(), []);
  const loadProject = useProjectStore((s) => s.loadProject);
  const openEditor = useUiStore((s) => s.openEditor);
  const setLibraryCategory = useUiStore((s) => s.setLibraryCategory);
  const notify = useUiStore((s) => s.notify);

  const [tab, setTab] = useState('recent');       // 'recent' | 'open'
  const [rows, setRows] = useState({ recent: [], all: [] });
  const [busy, setBusy] = useState(false);
  const [flow, setFlow] = useState(null);         // { number } while the flow is open

  const refresh = useCallback(async () => {
    const local = listLocalProjects(storage);
    const recent = recentProjects(storage);
    // The database is the real home when it is configured; without keys this is
    // a no-op and the shelf is the whole library (mock mode must WORK, not warn).
    const { projects: cloud } = isMockMode ? { projects: [] } : await listProjects();
    setRows({ recent, all: mergeProjectLists(local, cloud) });
  }, [storage]);

  useEffect(() => { refresh(); }, [refresh]);

  const start = (project, units, { id = null } = {}) => {
    // A different job: the undo stack from the last one must not reach into it
    // (turn 12, CLAUDE.md F9 — the history survives nothing, least of all a
    // project boundary).
    useHistoryStore.getState().clear();
    loadProject(project, units);
    if (id) touchLocalProject(storage, id, Date.now());
    openEditor();
  };

  /**
   * "Start designing". The flow has already built the project in the store —
   * its number, its type, its heights, its room and its settings — so this puts
   * it on the shelf and opens the canvas on the Library category the type asks
   * for, which is the last thing the type is for.
   */
  const onFlowStart = () => {
    const { project, units } = useProjectStore.getState();
    const saved = saveLocalProject(storage, { project, units, at: Date.now() });
    // A different job: the undo stack from the last one must not reach into it
    // (turn 12, CLAUDE.md F9 — the history survives nothing, least of all a
    // project boundary).
    useHistoryStore.getState().clear();
    loadProject(saved.project, units);
    const design = migrateDesign(project.design);
    if (design.projectType) setLibraryCategory(getProjectType(design.projectType).category);
    setFlow(null);
    openEditor();
  };

  const onOpen = async (row) => {
    setBusy(true);
    try {
      if (row.source === 'local') {
        const found = loadLocalProject(storage, row.id);
        if (!found) { notify('That project is no longer on this computer.', 'warn'); await refresh(); return; }
        start(found.project, found.units, { id: row.id });
        return;
      }
      const { project, units, error } = await loadCloudProject(row.id);
      if (error || !project) { notify('Could not open that project from the database.', 'warn'); return; }
      start(project, units);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (row, e) => {
    e.stopPropagation();
    if (row.source !== 'local') { notify('Only projects saved on this computer can be removed here.', 'info'); return; }
    deleteLocalProject(storage, row.id);
    await refresh();
  };

  const list = tab === 'recent' ? rows.recent : rows.all;

  return (
    <div className="h-full w-full bg-shell-900 text-ink-50 overflow-y-auto relative">
      <div className="max-w-[1100px] mx-auto px-8 py-10">
        <header className="flex items-baseline gap-4">
          <span className="font-semibold tracking-[0.2em] text-gold text-xl select-none">CABINET CORE</span>
          <span className="text-xs text-ink-400">Parametric cabinet &amp; fitted-furniture configurator</span>
          <span className="flex-1" />
          {/* T44 iron rule 5: the head that will read the wizard, chosen before
              it is opened — the switch is the same one the editor's top bar
              carries, and the same remembered app-level state. */}
          <AudienceToggle />
          <MockModeBadge />
        </header>

        <div className="cc-divider" />

        <div className="grid grid-cols-[300px_1fr] gap-8 mt-6">
          {/* ── what you can do ── */}
          <div className="space-y-4">
            <section className="cc-panel p-4 space-y-3">
              <h2 className="text-xs uppercase tracking-wide text-ink-200">New project</h2>
              <button
                type="button"
                className="cc-btn-gold w-full"
                onClick={(e) => setFlow({
                  number: nextProjectNumber(storage),
                  // Turn 31 (CLAUDE.md F1): the flow is a window like any
                  // other, so it stands beside the button that opened it.
                  anchor: anchorOfEvent(e),
                })}
              >
                New project
              </button>
              <p className="text-[11px] text-ink-400">
                Number, type, scope, room and settings — five steps, all of them already answered.
              </p>
            </section>

            <section className="cc-panel p-4 space-y-2">
              <h2 className="text-xs uppercase tracking-wide text-ink-200">Open</h2>
              <button type="button" className="cc-btn w-full" onClick={() => { setTab('open'); refresh(); }}>
                All projects{rows.all.length ? ` (${rows.all.length})` : ''}
              </button>
              <button type="button" className="cc-btn w-full" onClick={() => setTab('recent')}>
                Recent{rows.recent.length ? ` (${rows.recent.length})` : ''}
              </button>
            </section>
          </div>

          {/* ── the work ── */}
          <section className="cc-panel p-4">
            <div className="cc-row">
              <h2 className="text-xs uppercase tracking-wide text-ink-200">
                {tab === 'recent' ? 'Recent projects' : 'All projects'}
              </h2>
              <span className="text-[11px] text-ink-400">
                {isMockMode ? 'Saved on this computer — mock data mode' : 'This computer and the database'}
              </span>
            </div>

            {list.length === 0 ? (
              <p className="text-sm text-ink-400 py-8 text-center">
                Nothing here yet. Press New project on the left.
              </p>
            ) : (
              <ul className="divide-y divide-shell-600">
                {list.map((row) => (
                  <li key={`${row.source}-${row.id}`}>
                    <button
                      type="button"
                      disabled={busy}
                      className="w-full text-left px-2 py-2.5 hover:bg-shell-700 transition-colors flex items-center gap-3 disabled:opacity-50"
                      onClick={() => onOpen(row)}
                    >
                      {/* Number · name · date. A workshop refers to a job by its
                          number; how many units are in it is a question for the
                          BOM, not for a list of projects. */}
                      <span className="text-[11px] text-gold w-16 shrink-0 truncate">{row.number || '—'}</span>
                      <span className="text-sm text-ink-50 flex-1 truncate">{row.name}</span>
                      <span className="text-[11px] text-ink-400 w-32 text-right">
                        {stamp(row.opened_at || row.updated_at)}
                      </span>
                      <span className="cc-tag">{row.source}</span>
                      <span
                        role="button"
                        tabIndex={-1}
                        title="Remove from this computer"
                        className="cc-btn-ghost text-status-danger"
                        onClick={(e) => onDelete(row, e)}
                      >
                        ×
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {flow && (
        <NewProjectFlow
          initialNumber={flow.number}
          anchor={flow.anchor}
          onCancel={() => setFlow(null)}
          onStart={onFlowStart}
        />
      )}
    </div>
  );
}
