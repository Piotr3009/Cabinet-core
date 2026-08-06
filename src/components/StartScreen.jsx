import { useCallback, useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import MockModeBadge from './MockModeBadge.jsx';
import NumberField from './NumberField.jsx';
import {
  browserStorage, deleteLocalProject, listLocalProjects, loadLocalProject,
  mergeProjectLists, recentProjects, saveLocalProject, touchLocalProject,
} from '../lib/projectLibrary.js';
import { listProjects, loadProject as loadCloudProject } from '../lib/cloudSync.js';
import { isMockMode } from '../lib/supabase.js';
import {
  DEFAULT_ROOM, DEFAULT_ROOM_DEPTH, DEFAULT_ROOM_WIDTH, rectCorners,
} from '../engine/room.js';

// ─── Start screen (BACKLOG #7) ───
// The AutoCAD arrangement, because that is what Piotr opens every morning:
// the name of the thing top left, what you can DO down the left, and the work
// you had open filling the page. The canvas is reached THROUGH a project —
// there is no way in without one, so a drawing always belongs somewhere.

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
  const notify = useUiStore((s) => s.notify);

  const [tab, setTab] = useState('recent');       // 'recent' | 'open'
  const [name, setName] = useState('Untitled project');
  const [width, setWidth] = useState(DEFAULT_ROOM_WIDTH);
  const [depth, setDepth] = useState(DEFAULT_ROOM_DEPTH);
  const [rows, setRows] = useState({ recent: [], all: [] });
  const [busy, setBusy] = useState(false);

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
    loadProject(project, units);
    if (id) touchLocalProject(storage, id, Date.now());
    openEditor();
  };

  const onNew = () => {
    // The room comes with the project, so the first unit lands in the space it
    // was quoted for instead of in a 4 × 3 default.
    const fresh = {
      id: null,
      name: name.trim() || 'Untitled project',
      room: { ...DEFAULT_ROOM, corners: rectCorners(Math.max(500, width), Math.max(500, depth)) },
      design: null,
      jc_tenant_id: null,
      jc_project_id: null,
    };
    const saved = saveLocalProject(storage, { project: fresh, units: [], at: Date.now() });
    loadProject(saved.project, []);
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
    <div className="h-full w-full bg-shell-900 text-ink-50 overflow-y-auto">
      <div className="max-w-[1100px] mx-auto px-8 py-10">
        <header className="flex items-baseline gap-4">
          <span className="font-semibold tracking-[0.2em] text-gold text-xl select-none">CABINET CORE</span>
          <span className="text-xs text-ink-400">Parametric cabinet &amp; fitted-furniture configurator</span>
          <span className="flex-1" />
          <MockModeBadge />
        </header>

        <div className="cc-divider" />

        <div className="grid grid-cols-[300px_1fr] gap-8 mt-6">
          {/* ── what you can do ── */}
          <div className="space-y-4">
            <section className="cc-panel p-4 space-y-3">
              <h2 className="text-xs uppercase tracking-wide text-ink-200">New project</h2>
              <label className="block">
                <span className="cc-label">Name</span>
                <input
                  className="cc-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') onNew(); }}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="cc-label">Room width</span>
                  <NumberField value={width} min={500} onCommit={setWidth} />
                </label>
                <label className="block">
                  <span className="cc-label">Room depth</span>
                  <NumberField value={depth} min={500} onCommit={setDepth} />
                </label>
              </div>
              <button type="button" className="cc-btn-gold w-full" onClick={onNew}>New project</button>
              <p className="text-[11px] text-ink-400">
                Height and walls are edited later in Settings ▸ Room setup.
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
                Nothing here yet. Name a project on the left and press New project.
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
                      <span className="text-sm text-ink-50 flex-1 truncate">{row.name}</span>
                      <span className="text-[11px] text-ink-400">
                        {row.unit_count != null ? `${row.unit_count} unit${row.unit_count === 1 ? '' : 's'}` : ''}
                      </span>
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
    </div>
  );
}
