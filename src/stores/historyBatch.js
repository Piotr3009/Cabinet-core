// ─── ONE BULK ACTION IS ONE UNDO STEP (turn 13, CLAUDE.md F5.4) ─────────────
//
// The history watcher (stores/historyStore.js) is a SUBSCRIBER: it sees every
// change to the project store and coalesces a burst on a trailing timer, so one
// shelf drag is one undo step without anyone having to declare it. That works
// because a drag is a burst in time.
//
// A bulk action is not. "Add a plinth to these six" is six `set` calls in one
// synchronous tick, and with the coalesce window set to zero — which is exactly
// what a test does, so that it does not have to wait for a timer — that is six
// undo steps, and the joiner presses Ctrl+Z six times to undo one click.
//
// So a batch says so. It is a flag and two callbacks in a module of its own,
// deliberately: `historyStore` imports `projectStore`, so anything the project
// store needs from the history store has to live somewhere neither of them owns
// or the two become a cycle.
//
// Nothing here knows what a snapshot is. The history store decides what to do
// when a batch ends; this only says when one is running.

let depth = 0;
const listeners = new Set();

/** Is a bulk action in progress? The watcher asks before it starts its timer. */
export function isBatching() {
  return depth > 0;
}

/**
 * Run `fn` as ONE undo step.
 *
 * Re-entrant on purpose: a bulk action built out of other bulk actions (the
 * context menu over a selection, calling a store action that batches on its
 * own) is still one step, because only the OUTERMOST batch ends.
 *
 * @param {Function} fn
 * @returns whatever `fn` returned
 */
export function runBatch(fn) {
  depth += 1;
  try {
    return fn();
  } finally {
    depth -= 1;
    // Even if `fn` threw: a batch that never ends would swallow every edit
    // after it, which is a far worse failure than the one that got us here.
    if (depth === 0) for (const cb of [...listeners]) cb();
  }
}

/** Tell me when the outermost batch finishes. */
export function onBatchEnd(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
