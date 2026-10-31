import { create } from 'zustand';
import { JC_OFFLINE, hasToken, jcFetch } from '../lib/jcApi.js';

// ─── T-CC1a F2 · THE SESSION IS JOINERY CORE'S (CLAUDE.md T-CC1a law 1) ──────
//
// The owner, 31.10.2026, 09:08: *"warunek: tylko przez JC po zalogowaniu, nie
// dziala skopiowany url wklejony przez byle kogo"*.
//
// Cabinet Core has no login of its own. The token is JC's (`authToken` in this
// origin's localStorage, written by JC's login); the person is whoever JC's
// `/api/auth/me` says it is. Four states and nothing else:
//
//   booting   init() has not answered yet
//   ready     an owner, admin or manager of a listed company (`cabinet_core`)
//   refused   'role' (an employee or viewer of a listed company) or 'company'
//             (the company is not listed yet): one card, no other request
//   offline   JC did not answer (or the token went away in another tab)
//
// No token: the browser goes to JC's login with next=/cabinet/ and NOTHING
// else is asked. A 401 from /me is the same road (JC's script has already
// cleared its three keys). CC never calls supabaseClient.auth.getSession():
// JC's look-alike signs the user OUT on any error of /me, so the one read here
// is apiFetch('/api/auth/me'), and no error of it signs anybody out.

/** Where JC's login sends the user back to. CONFIRMED (CLAUDE.md T-CC1a, THE NUMBERS). */
const LOGIN_RETURN = '/cabinet/';
export const loginUrl = () => `/login.html?next=${encodeURIComponent(LOGIN_RETURN)}`;

/** The words of the offline card when another tab signed out (PROPOSED). */
export const SIGNED_OUT_ELSEWHERE = 'You were signed out of Joinery Core';

const statusOf = (error) => Number(error?.status ?? error?.statusCode ?? error?.code) || null;

// Things that must be kept before the screen goes (the crash buffer, F9): each
// is called once, synchronously, when the token disappears under an open CC.
const flushers = new Set();
/** Register a synchronous flush for the moment JC signs this browser out. Returns the unregister. */
export function onSignedOutFlush(fn) {
  flushers.add(fn);
  return () => flushers.delete(fn);
}

// ─── THE CARD'S WORDS (T-CC1a F2.2, PROPOSED; drawn by components/jc/RefusalScreen.jsx) ──
// JC rule 6.1: the role a user reads is EMPLOYEE, never the database's word.
const BACK = { label: 'Back to Joinery Core', href: '/dashboard.html' };

/** The card for a state: { title, line, actions: [{ label, href } | { label, retry: true }] }. Pure. */
export function refusalCard({ status, refusal, tenant, message } = {}) {
  const company = tenant?.name || 'your company';
  if (status === 'refused' && refusal === 'role') {
    return {
      title: 'Cabinet Core opens for owners, admins and managers',
      line: `Your Joinery Core account is an employee account. Ask an admin of ${company} if you need the design tool.`,
      actions: [BACK],
    };
  }
  if (status === 'refused') {
    return {
      title: `Cabinet Core is coming soon for ${company}`,
      line: 'It is in testing with one workshop today.',
      actions: [{ label: 'What is Cabinet Core', href: '/cabinet-core.html' }, BACK],
    };
  }
  return {
    title: message && message !== JC_OFFLINE ? message : 'Joinery Core did not answer',
    line: JC_OFFLINE,
    actions: [{ label: 'Try again', retry: true }],
  };
}

export const useAuthStore = create((set) => ({
  status: 'booting',
  refusal: null,
  user: null,
  tenant: null,
  flags: { cabinetCore: false, cabinetCoreCompany: false },
  /** The words of the offline card, when there is one. */
  message: null,

  init: async ({ location = globalThis.location } = {}) => {
    set({ status: 'booting', message: null });
    // (a) No token: JC's login, and not one request more (law 1).
    if (!hasToken()) {
      location?.replace?.(loginUrl());
      return 'redirect';
    }
    // (b) Who is this? JC's /me, through JC's own apiFetch.
    const { data, error } = await jcFetch('/api/auth/me');
    if (error) {
      if (statusOf(error) === 401) {
        location?.replace?.(loginUrl());
        return 'redirect';
      }
      set({ status: 'offline', refusal: null, message: JC_OFFLINE });
      return 'offline';
    }
    const u = data?.user || {};
    const org = data?.organization || {};
    const user = { id: u.id ?? null, email: u.email ?? null, full_name: u.full_name ?? null, role: u.role ?? null };
    const tenant = { id: u.tenant_id ?? org.id ?? null, name: org.name ?? null };
    const flags = { cabinetCore: u.cabinet_core === true, cabinetCoreCompany: u.cabinet_core_company === true };
    // (c) The door: cabinet_core is JC's answer for owner, admin and manager of
    // a listed company; the two refusals are told apart by the company's flag.
    if (flags.cabinetCore) {
      set({ status: 'ready', refusal: null, user, tenant, flags, message: null });
      return 'ready';
    }
    const refusal = flags.cabinetCoreCompany ? 'role' : 'company';
    set({ status: 'refused', refusal, user, tenant, flags, message: null });
    return 'refused';
  },

  /**
   * Another tab signed out of Joinery Core (the `storage` event removed
   * `authToken`): the work is flushed to this browser first, then the offline
   * card says why.
   */
  signedOutElsewhere: () => {
    for (const fn of flushers) {
      try { fn(); } catch { /* one failed flush must not stop the others */ }
    }
    set({ status: 'offline', refusal: null, message: SIGNED_OUT_ELSEWHERE });
  },
}));
