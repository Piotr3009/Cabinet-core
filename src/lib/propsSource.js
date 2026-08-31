// ─── THE PROPS PACK, RESOLVED — AND ITS ABSENCE, WHICH IS NOT AN ERROR ──────
//
// T58 F8, point 1, verbatim: *"If the bucket or manifest is missing at run
// time: build the whole machinery anyway, ship the toggle GREYED with a
// one-line reason, skip the dressing walk and note it — nothing throws."*
//
// So this module has exactly one job and one promise. The job: fetch
// `props/manifest.json` from the storage root the rest of the app already
// resolved, once per session, and hold the answer. The promise: it never
// throws and never rejects — a missing bucket, a moved pack, mock mode, a node
// test, a container with no egress and a 403 from somebody's proxy all land in
// the SAME state, `absent`, carrying the sentence a person can read.
//
// This is the graceful-degradation rule `3d/glbSource.js` wrote down for the
// hardware models — *"`failed` is not an error path, it is the other path"* —
// said again for a pack rather than for a file.

import { storageBaseUrl } from './storageBase.js';
import { PROPS_BUCKET, PROPS_MANIFEST, parsePropsManifest } from './props.js';

/** `idle` → `loading` → `ready` | `absent`. Never anything else, ever. */
const IDLE = Object.freeze({
  state: 'idle', rows: 0, kinds: [], manifest: [], url: null, error: null, retry: false,
});

let answer = IDLE;
let inFlight = null;
const listeners = new Set();

const settle = (next) => {
  answer = Object.freeze(next);
  for (const cb of [...listeners]) {
    try { cb(answer); } catch { /* a listener that throws is not this module's problem */ }
  }
  return answer;
};

/** What is known right now, without asking for anything. */
export function propsState() {
  return answer;
}

/** Told whenever the answer changes; returns its own unsubscribe. */
export function onPropsState(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/** For tests, and for a session that has just been pointed at another bucket. */
export function clearPropsSource() {
  answer = IDLE;
  inFlight = null;
}

/**
 * Read the pack, once. Returns the answer; NEVER rejects.
 *
 * @param {object} deps  injectable for tests — `fetch` and the storage root
 */
export function resolveProps({ fetchImpl = null, base = null } = {}) {
  // ─── AN ANSWER THAT WAS ONLY "NOT YET" IS NOT A FINAL ANSWER ─────────────
  //
  // The storage root is DERIVED — from the decor pack, which arrives after the
  // app boots — so the first ask can honestly get "no bucket configured" and
  // the second can get a real host. Latching that first answer would grey the
  // toggle for the whole session on a machine where the pack is fine, which is
  // a lie with a reason attached. So an absent-for-want-of-a-bucket answer is
  // marked `retry` and asked again when a bucket turns up; a bucket that
  // REFUSED is final, and stays.
  if (answer.state === 'ready') return Promise.resolve(answer);
  if (answer.state === 'absent' && !answer.retry) return Promise.resolve(answer);
  if (inFlight) return inFlight;

  const root = base != null ? base : storageBaseUrl();
  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!root || !doFetch) {
    // Mock mode, a node test, a build with no configuration. The path is still
    // true, it simply has no host in front of it — and there is nothing to ask.
    return Promise.resolve(settle({
      ...IDLE,
      state: 'absent',
      error: root ? 'this build cannot fetch' : 'no storage bucket is configured',
      // A bucket may still be resolved a moment from now; a build that cannot
      // fetch at all never will be.
      retry: !root,
    }));
  }

  const url = `${String(root).replace(/\/+$/, '')}/${PROPS_BUCKET}/${PROPS_MANIFEST}`;
  settle({ ...IDLE, state: 'loading', url });
  inFlight = Promise.resolve()
    .then(() => doFetch(url))
    .then((res) => {
      if (!res || !res.ok) throw new Error(`HTTP ${res?.status ?? '?'}`);
      return res.json();
    })
    .then((json) => {
      const { rows, kinds } = parsePropsManifest(json);
      return settle({
        state: 'ready', rows: rows.length, kinds, manifest: rows, url, error: null,
      });
    })
    .catch((e) => settle({
      ...IDLE, state: 'absent', url, error: String(e?.message || e).slice(0, 120),
    }))
    .finally(() => { inFlight = null; });
  return inFlight;
}

/** Is the toggle live? Only a pack that is really there turns it on. */
export function propsAvailable(state = answer) {
  return state?.state === 'ready' && state.rows > 0;
}
