// ─── THREE MESSAGE LEVELS, THE OWNER'S RULES (turn 31, CLAUDE.md F2) ────────
//
// What was there: ONE toast slot, four seconds, each message erasing the last.
// The owner's verdict is the whole brief — "he has never seen one." Of course
// not: a bulk action fires five of them in the same tick, four are erased
// before a frame is drawn, and the fifth is gone before an eye has moved to it.
// A slot of one is not a message system, it is a race.
//
// His rules, verbatim, and they are three DIFFERENT contracts rather than three
// colours of the same one:
//
//   RED     stays until clicked. Errors only.
//   YELLOW  dismissed by clicking anywhere else.
//   GREY    a few seconds, centre; and DELETE most of them — an effect visible
//           in 3D needs no toast.
//
// …and "messages QUEUE; a red is never overwritten by a grey."
//
// ─── CHAT FIX 19.10.2026 · EVERY LEVEL LEAVES ON ITS OWN CLOCK ─────────────
//
// The owner, on the left-hand messages of T79: *"ma sie chowac po kilku
// sekundach i byc przezroczysty"*; asked "wszystkie chowaja sie po 4 s,
// czerwone po 8 s, historia zostaje": *"tak pls"*. So every message now has
// an `expiresAt` (`hideMs`, a profile number per level); the hand gestures
// stand beside the clock (a click on a red, a click away from a yellow take
// them sooner), and the row in the Changes list stays.
//
// ─── T79 F1 · ONE PLACE, ON THE LEFT, AND A MEMORY ─────────────────────────
//
// The owner, 18.10.2026: *"wszystkie informacje po zmianach które pokazujesz na
// ekranie proszę zrób po lewej, niech one tam znikają ... teraz wszystkie
// informacje pokazują się na środku i zasłaniają nam widok pracy."* The three
// contracts stand (how long each level stays is untouched); where they stand
// is now ONE bottom-left column for all three, and every message shown is kept
// as a row of the Changes list (`recordHistory`), the last `historyMax` of them.
//
// ─── WHY THE CONTRACT IS A FIELD AND NOT A COLOUR ───────────────────────────
//
// `until` is the fact that decides everything the component does: 'click' hangs
// there until a hand deals with it, 'clickAway' goes when attention moves on,
// 'time' expires on its own. The colour is a consequence and is named beside
// it. Written the other way round — a switch on the tone in the component —
// the third level would have been a third branch in a render function, which is
// how the app got one slot and four seconds in the first place.
//
// ─── AND "A RED IS NEVER OVERWRITTEN BY A GREY" IS A SORT, NOT A GUARD ──────
//
// Nothing overwrites anything: the queue holds them all. What the rule really
// asks for is that when the queue is FULL — a bulk action firing more than the
// screen can hold — the thing that gets dropped is the least important OLDEST
// one, and a red is never it. `trimQueue` is that sentence, once.
//
// Pure functions over plain data. No React, no store, no three.js.

/** The three levels, and what each of them is FOR. */
export const LEVELS = Object.freeze({
  red: {
    // Errors only. It stays on the screen until a hand clicks it, because the
    // things that are red are the things that are still true after four
    // seconds: a refused save, lost work, a panel held out of an export.
    until: 'click',
    rank: 3,
    place: 'left',
    tone: 'red',
  },
  yellow: {
    // A judgement the joiner has to make, not an error: a blocked hinge move, a
    // gap that wants an infill. It goes when attention moves on, which is
    // exactly the gesture a person makes when they have read it and decided.
    until: 'clickAway',
    rank: 2,
    place: 'left',
    tone: 'yellow',
  },
  grey: {
    // A confirmation of something that left no trace on the screen — a file
    // written, a set saved, an account signed in.
    until: 'time',
    rank: 1,
    place: 'left',
    tone: 'grey',
  },
});


/**
 * The old vocabulary, mapped ONCE.
 *
 * Turn 3's `notify(message, tone)` is called from 129 places and its four tones
 * are the app's own words for the same three ideas. Translating here rather
 * than editing 129 call sites is not laziness: `notify('…', 'warn')` is still
 * the right thing for a caller to say, and the four names carry a distinction
 * ('ok' vs 'info') that the LEVELS deliberately do not — both are grey, because
 * the owner's rule is about how long a message stays, not about how pleased it
 * is.
 */
export function levelOf(tone) {
  if (LEVELS[tone]) return tone;
  if (tone === 'error') return 'red';
  if (tone === 'warn') return 'yellow';
  return 'grey';
}

/** How long a level stays, in ms: profile.ui.messages.hideMs[level] (19.10.2026: 4000 / 4000 / 8000). */
export function hideMs(profile, level = 'grey') {
  const n = Number(profile?.ui?.messages?.hideMs?.[level]);
  if (Number.isFinite(n) && n > 0) return n;
  return level === 'red' ? 8000 : 4000;
}

/** How many may be on screen at once before the queue starts shedding. */
export function queueMax(profile) {
  const n = Number(profile?.ui?.messages?.maxOnScreen);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 5;
}

/**
 * One message, ready to be shown.
 *
 * @param {string} message
 * @param {string} tone     a level name, or one of the four legacy tones
 * @param {object} opts     { id, at, profile }
 */
export function makeMessage(message, tone = 'grey', {
  id = null, at = 0, profile = null, action = null,
} = {}) {
  const level = levelOf(tone);
  const spec = LEVELS[level];
  return {
    id: id || `m${at}_${Math.random().toString(36).slice(2, 8)}`,
    message: String(message ?? ''),
    level,
    // ─── TURN 31 (CLAUDE.md F3): A MESSAGE MAY OFFER A WAY OUT ─────────────
    //
    // "…with an explicit 'Export anyway' for the owner's own judgement." A
    // message that names a held-back panel and offers no way past it is a
    // message that turns into a support call. `{ label, run }`, and only ever
    // on a level that WAITS for a person — a grey is gone in three seconds and
    // a button on one is a button nobody can reach.
    action: action && spec.until !== 'time'
      ? { label: String(action.label || 'Do it'), run: action.run }
      : null,
    until: spec.until,
    place: spec.place,
    rank: spec.rank,
    at,
    // 19.10.2026: every level has one (hideMs); the red's click and the
    // yellow's click-away stay as the quicker way out.
    expiresAt: at + hideMs(profile, level),
  };
}

/**
 * Drop the least important OLDEST messages until the queue fits.
 *
 * "A red is never overwritten by a grey" — so the shedding order is by RANK
 * first and age second, and a red is only ever dropped when the queue is full
 * of reds, which is a screen that has bigger problems than its message list.
 */
export function trimQueue(list, max) {
  if (!Array.isArray(list) || list.length <= max) return list || [];
  const doomed = new Set(
    [...list]
      .sort((a, b) => (a.rank - b.rank) || (a.at - b.at))
      .slice(0, list.length - max)
      .map((m) => m.id),
  );
  return list.filter((m) => !doomed.has(m.id));
}

/**
 * Add a message to the queue.
 *
 * IDENTICAL MESSAGES DO NOT STACK. A bulk action that refuses eight hinge moves
 * for one reason has one thing to say, and eight copies of it on the screen is
 * the same failure as one slot: nobody reads any of them. The repeat REFRESHES
 * the one that is there — a grey's clock restarts — and bumps a count so the
 * screen can say "× 8" rather than pretending it happened once.
 */
export function pushMessage(list, msg) {
  const queue = Array.isArray(list) ? list : [];
  const same = queue.find((m) => m.message === msg.message && m.level === msg.level);
  if (same) {
    return queue.map((m) => (m === same
      ? {
        ...m,
        at: msg.at,
        expiresAt: msg.expiresAt,
        // The NEWER way out: an "Export anyway" from the second press has to
        // re-run the second press, not the first.
        action: msg.action || m.action,
        count: (m.count || 1) + 1,
      }
      : m));
  }
  return [...queue, { ...msg, count: 1 }];
}

/** The ones whose time is up (every level has one since 19.10.2026). */
export function expired(list, now) {
  return (list || []).filter((m) => m.expiresAt != null && m.expiresAt <= now).map((m) => m.id);
}

/**
 * What a pointer-down somewhere else dismisses.
 *
 * A YELLOW goes ("dismissed by clicking anywhere else"). A RED does not — it is
 * dismissed by clicking IT, and a red that a stray click could clear is a red
 * that clears itself. A GREY waits for its clock and is nobody's business.
 */
export function dismissedByClickAway(list) {
  return (list || []).filter((m) => m.until === 'clickAway').map((m) => m.id);
}

/** The queue as it should be drawn: reds first, then yellows, oldest first. */
export function sortForDisplay(list) {
  return [...(list || [])].sort((a, b) => (b.rank - a.rank) || (a.at - b.at));
}

/** The place a message stands (T79 F1: one, 'left', for every level), see LEVELS. */
export function messagesAt(list, place) {
  return sortForDisplay(list).filter((m) => m.place === place);
}

// ─── T79 F1 · THE CHANGES LIST ──────────────────────────────────────────────
//
// *"na dole po lewej zrobić jakby listę rozwijaną i tam historia zmian."* A
// message leaves the screen on its own contract; its row stays here. Newest
// first, at most `historyMax` rows, never persisted (a list of what this
// session said, not a record of the project).

/** How many rows the Changes list keeps, a profile number. */
export function historyMax(profile) {
  const n = Number(profile?.ui?.messages?.historyMax);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 50;
}

/**
 * One row of the list: `{ id, message, level, at }`, read off a shown message.
 * A yellow or a grey folds into its text (`3 × ...`, the 15.08 chat fix); a red
 * folds by its count (`pushMessage`), so the row says the same `N × ` for it.
 */
export function historyRow(msg) {
  const text = String(msg.message ?? '');
  return {
    id: msg.id,
    message: msg.count > 1 && msg.baseMessage == null ? `${msg.count} × ${text}` : text,
    level: msg.level,
    at: msg.at,
  };
}

/**
 * Keep a row. A message seen for the first time goes on top, and the oldest
 * past `max` goes; a row whose id is already there is the SAME message folded
 * (`3 × ...`) and is updated where it stands, never added twice.
 */
export function recordHistory(history, row, max = 50) {
  const list = Array.isArray(history) ? history : [];
  if (list.some((r) => r.id === row.id)) {
    return list.map((r) => (r.id === row.id ? { ...r, message: row.message } : r));
  }
  return [row, ...list].slice(0, Math.max(1, Math.trunc(max)));
}

/** A row's time as the list shows it, HH:MM on the local clock. */
export function historyTime(at) {
  const d = new Date(Number(at) || 0);
  const two = (n) => String(n).padStart(2, '0');
  return `${two(d.getHours())}:${two(d.getMinutes())}`;
}

// ─── THE LEAVE GUARD (F2's red) ─────────────────────────────────────────────

/** The sentence, in one place, because two spellings of it is two messages. */
export const UNSAVED_MESSAGE = 'Save the project — unsaved changes';

/**
 * Is there anything to say on the way out?
 *
 * Rule 4 all over again: this SPEAKS. It does not save the project behind the
 * joiner's back and it does not refuse the door — it returns the red, and the
 * red stays on the screen until it is clicked, which means it survives the
 * screen it was raised on.
 *
 * @returns {{message:string, tone:string}|null}
 */
export function leaveWarning({ dirty, units }) {
  if (!dirty) return null;
  // A brand-new project nobody has put a cabinet in has nothing to lose, and a
  // red on the way out of one is a red that teaches people to ignore reds.
  if (!Array.isArray(units) || units.length === 0) return null;
  return { message: UNSAVED_MESSAGE, tone: 'red' };
}
