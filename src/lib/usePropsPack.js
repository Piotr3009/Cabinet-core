import { useEffect, useState } from 'react';
import {
  onPropsState, propsAvailable, propsState, resolveProps,
} from './propsSource.js';
import { onStorageBase } from './storageBase.js';
import { propsReason } from './props.js';

// ─── THE PROPS PACK, AS A HOOK (turn 58b F5) ────────────────────────────────
//
// One read of the bucket per session, however many components ask. The state
// is held in `lib/propsSource.js`, which never throws and never rejects, so a
// component can read it on its first render with no guard at all — which is
// the whole point of "nothing throws".
//
// Re-exported here so a caller needs one import rather than three.
export { propsAvailable, propsReason };

export function usePropsPack() {
  const [state, setState] = useState(propsState);
  useEffect(() => {
    const off = onPropsState(setState);
    const ask = () => { resolveProps().then(setState).catch(() => {}); };
    // Asking is safe from anywhere: with no bucket configured it settles
    // synchronously to `absent`, and the toggle is greyed with that sentence.
    ask();
    // …and the storage root is DERIVED, so it can arrive after this. The first
    // "no bucket configured" is marked retryable for exactly this reason; when
    // a host turns up, the pack is asked for again.
    const offBase = onStorageBase(ask);
    return () => { off(); if (typeof offBase === 'function') offBase(); };
  }, []);
  return state;
}
