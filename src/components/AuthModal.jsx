import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { isMockMode, MOCK_REASON } from '../lib/supabase.js';
import * as cloud from '../lib/cloudSync.js';

// Minimal account panel (SPEC 9): sign in / register, then the cloud project
// list. Without Supabase keys it explains mock mode instead of pretending.
export default function AuthModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const notify = useUiStore((s) => s.notify);
  const { user, busy, error, projects, signIn, signUp, signOut, init, refreshProjects } = useAuthStore();
  const project = useProjectStore((s) => s.project);
  const units = useProjectStore((s) => s.units);
  const loadProject = useProjectStore((s) => s.loadProject);
  const markSaved = useProjectStore((s) => s.markSaved);

  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => { init(); }, [init]);

  const submit = async (e) => {
    e.preventDefault();
    const ok = mode === 'signin' ? await signIn(email, password) : await signUp(email, password);
    if (ok) notify(mode === 'signin' ? 'Signed in.' : 'Account created — check your inbox if confirmation is on.', 'ok');
  };

  const save = async () => {
    const res = await cloud.saveProject(project, units);
    if (res.error) { notify(`Save failed: ${res.error.message || res.error}`, 'error'); return; }
    markSaved(res.project);
    await refreshProjects();
    notify(res.mock ? 'Mock mode — project kept in this browser.' : 'Project saved.', 'ok');
  };

  const open = async (id) => {
    const res = await cloud.loadProject(id);
    if (!res.project) { notify('Could not open that project.', 'error'); return; }
    loadProject(res.project, res.units);
    notify(`Opened “${res.project.name}”.`, 'ok');
    closeModal();
  };

  return (
    <Modal title="Account & projects" onClose={closeModal} width="w-[460px]">
      {isMockMode ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-100">Running in <span className="text-status-warn">Mock data mode</span>.</p>
          <p className="text-[12px] text-ink-400 leading-relaxed">{MOCK_REASON}</p>
          <p className="text-[12px] text-ink-400 leading-relaxed">
            Everything works — units, BOM, CSV and PDF. To store projects in the cloud, copy
            <code className="mx-1 px-1 rounded bg-shell-900 border border-shell-600">.env.example</code>
            to <code className="mx-1 px-1 rounded bg-shell-900 border border-shell-600">.env</code>, fill in the
            Supabase URL and anon key, and run <code className="mx-1 px-1 rounded bg-shell-900 border border-shell-600">sql/001_init.sql</code>
            in the Supabase SQL editor.
          </p>
        </div>
      ) : !user ? (
        <form className="space-y-3" onSubmit={submit}>
          <div className="flex gap-1">
            <button type="button" className={mode === 'signin' ? 'cc-btn border-gold text-gold flex-1' : 'cc-btn flex-1'} onClick={() => setMode('signin')}>Sign in</button>
            <button type="button" className={mode === 'signup' ? 'cc-btn border-gold text-gold flex-1' : 'cc-btn flex-1'} onClick={() => setMode('signup')}>Register</button>
          </div>
          <div>
            <span className="cc-label">Email</span>
            <input type="email" className="cc-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <span className="cc-label">Password</span>
            <input type="password" className="cc-input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          {error && <p className="text-[12px] text-status-danger">{error}</p>}
          <button type="submit" className="cc-btn-gold w-full" disabled={busy}>
            {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center">
            <span className="text-sm text-ink-100">{user.email}</span>
            <span className="flex-1" />
            <button type="button" className="cc-btn" onClick={signOut}>Sign out</button>
          </div>
          <button type="button" className="cc-btn-gold w-full" onClick={save}>
            Save “{project.name}” ({units.length} unit{units.length === 1 ? '' : 's'})
          </button>
          <div className="cc-divider" />
          <span className="cc-label">Your projects</span>
          <ul className="space-y-1 max-h-60 overflow-y-auto">
            {projects.map((p) => (
              <li key={p.id}>
                <button type="button" className="w-full text-left px-2 py-1.5 rounded hover:bg-shell-700 text-sm" onClick={() => open(p.id)}>
                  {p.name}
                  <span className="text-ink-400 text-[11px] ml-2">{new Date(p.updated_at).toLocaleDateString()}</span>
                </button>
              </li>
            ))}
            {projects.length === 0 && <li className="text-xs text-ink-400">No saved projects yet.</li>}
          </ul>
        </div>
      )}
    </Modal>
  );
}
