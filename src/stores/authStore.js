import { create } from 'zustand';
import * as cloud from '../lib/cloudSync.js';
import { isMockMode } from '../lib/supabase.js';

// ─── Auth + cloud projects ───
// Minimal by design (SPEC 9): login / register / sign out, and a project list.
// In mock mode every call short-circuits and the app keeps running locally.

export const useAuthStore = create((set, get) => ({
  session: null,
  user: null,
  projects: [],
  busy: false,
  error: null,
  mock: isMockMode,

  init: async () => {
    if (isMockMode) return;
    const session = await cloud.getSession();
    set({ session, user: session?.user ?? null });
    if (session) get().refreshProjects();
    cloud.onAuthChange((s) => {
      set({ session: s, user: s?.user ?? null });
      if (s) get().refreshProjects(); else set({ projects: [] });
    });
  },

  signIn: async (email, password) => {
    set({ busy: true, error: null });
    const { user, error } = await cloud.signIn(email, password);
    set({ busy: false, user, error: error ? error.message : null });
    if (user) get().refreshProjects();
    return !error;
  },

  signUp: async (email, password) => {
    set({ busy: true, error: null });
    const { user, error } = await cloud.signUp(email, password);
    set({ busy: false, user, error: error ? error.message : null });
    return !error;
  },

  signOut: async () => {
    await cloud.signOut();
    set({ session: null, user: null, projects: [] });
  },

  refreshProjects: async () => {
    const { projects } = await cloud.listProjects();
    set({ projects });
  },
}));
