import { useEffect } from 'react';
import { useUiStore } from '../stores/uiStore.js';
import { LAYER_CLASS } from '../lib/modalLayer.js';
import { historyOpenMs, historyTime, messagesAt } from '../engine/messages.js';
import { getCabinetProfile } from '../engine/profile.js';

// ─── THE THREE LEVELS, ON THE SCREEN (turn 31, CLAUDE.md F2) ────────────────
//
// This replaces `Toast.jsx`: one slot, four seconds, each message erasing the
// last — and the owner has never seen one.
//
// It draws the queue and NOTHING ELSE decides anything here. Which message
// stays until it is clicked, which goes when attention moves on, which is on a
// clock, where each one stands and what gets shed when the screen is full —
// all of it is `engine/messages.js`, pure and tested in node. A component that
// switched on the tone to decide how long to wait is how the app ended up with
// one slot in the first place.
//
// ─── THE OWNER'S THREE RULES, AS THREE DIFFERENT CONTROLS ───────────────────
//
//   RED     a BUTTON. It stays until it is clicked, so it has to be obvious
//           that clicking it is the thing to do — and it says so.
//   YELLOW  not a button. "Dismissed by clicking anywhere else" is a window
//           listener, below, and a yellow that could also be clicked directly
//           would be a yellow a mis-aimed click clears.
//   GREY    on its own clock, and it never takes the pointer: a confirmation
//           that a file was written must not be able to swallow the click
//           that follows it.
//
// CHAT FIX 19.10.2026: every level ALSO leaves on its own clock (the store,
// engine/messages.js `hideMs`: 4 s, reds 8 s) and the card is translucent
// (the owner: *"ma sie chowac po kilku sekundach i byc przezroczysty"*); the
// row in the Changes list stays. Nothing here decides the timing.
//
// ─── T79 F1 · ALL THREE ON THE LEFT, AND A HISTORY UNDER THEM ───────────────
//
// The owner, 18.10.2026: *"wszystkie informacje po zmianach które pokazujesz na
// ekranie proszę zrób po lewej, niech one tam znikają, można na dole po lewej
// zrobić jakby listę rozwijaną i tam historia zmian; powód: teraz wszystkie
// informacje pokazują się na środku i zasłaniają nam widok pracy."* ONE
// bottom-left column, from the bottom up: the Changes bar, the messages (red
// above yellow above grey, newest nearest the bar), then whatever the page
// hands in as `children` (the front-gap rows), so none of them covers another.

// 19.10.2026: the cards stand at 70 percent over the room (the owner: "tlo
// przezroczyste 70 procent": "tak pls"); the border and the text stay solid.
const TONE = {
  red: 'border-status-danger bg-status-danger/20 text-status-danger',
  yellow: 'border-status-warn/70 bg-status-warn/15 text-status-warn',
  grey: 'border-shell-600 bg-shell-800/70 text-ink-100',
};

/** The level's colour dot on a row of the Changes list. */
const DOT = {
  red: 'bg-status-danger',
  yellow: 'bg-status-warn',
  grey: 'bg-ink-200',
};

function Line({ msg, onDismiss }) {
  // T79 F1: a yellow or grey fold already says `N × ` in its text (15.08); only
  // a red, folded by its count, gets the count beside it, never both.
  const body = msg.count > 1 && msg.baseMessage == null ? `${msg.message} · ×${msg.count}` : msg.message;
  const cls = `px-4 py-2 rounded border text-sm shadow-panel text-left ${TONE[msg.level] || TONE.grey}`;
  if (msg.level === 'red') {
    // A DIV with a button inside it, not a button: the body dismisses, and the
    // WAY OUT beside it (F3's "Export anyway") must not dismiss as a side
    // effect of being pressed.
    return (
      <div
        data-message={msg.id}
        data-message-level="red"
        className={`${cls} flex items-center gap-3 pointer-events-auto`}
      >
        <button
          type="button"
          className="flex-1 text-left"
          data-message-dismiss={msg.id}
          title="Click to dismiss"
          onClick={() => onDismiss(msg.id)}
        >
          {body}
          <span className="ml-2 opacity-60 text-[11px]">click to dismiss</span>
        </button>
        {msg.action && (
          <button
            type="button"
            className="cc-btn shrink-0"
            data-message-action={msg.id}
            onClick={(e) => { onDismiss(msg.id); msg.action.run?.(e); }}
          >
            {msg.action.label}
          </button>
        )}
      </div>
    );
  }
  return (
    <div
      data-message={msg.id}
      data-message-level={msg.level}
      className={`${cls} ${msg.level === 'grey' ? 'pointer-events-none' : 'flex items-center gap-3 pointer-events-auto'}`}
    >
      <span className={msg.level === 'grey' ? '' : 'flex-1'}>{body}</span>
      {msg.action && (
        <button
          type="button"
          className="cc-btn shrink-0"
          data-message-action={msg.id}
          onClick={(e) => { onDismiss(msg.id); msg.action.run?.(e); }}
        >
          {msg.action.label}
        </button>
      )}
    </div>
  );
}

// ─── T79 F1 · THE CHANGES BAR ───────────────────────────────────────────────
//
// One line at the very bottom-left, `Changes · 12`, and a click opens the list
// above it: newest first, the time, the level's dot, the text, and Clear.
// Collapsed by default, Escape collapses it, nothing of it is saved.
function HistoryBar() {
  const history = useUiStore((s) => s.history);
  const open = useUiStore((s) => s.historyOpen);
  const toggleHistory = useUiStore((s) => s.toggleHistory);
  const closeHistory = useUiStore((s) => s.closeHistory);
  const clearHistory = useUiStore((s) => s.clearHistory);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closeHistory(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeHistory]);
  // CHAT FIX 19.10.2026, the owner: *"changes chat can we keep close, nawet
  // jesli uzytkownik otworzy czy mozemy za jakis czas zamknac? bo za bardzo
  // przeszkadza"*: the open list closes itself after
  // profile.ui.messages.historyOpenMs; the bar stays, the rows stay.
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(closeHistory, historyOpenMs(getCabinetProfile()));
    return () => clearTimeout(t);
  }, [open, closeHistory]);

  return (
    <div
      data-message-history={history.length}
      data-message-history-open={open ? 'true' : 'false'}
      className={`${LAYER_CLASS.message} pointer-events-auto flex flex-col items-start gap-1.5`}
    >
      {open && (
        <div data-message-history-list className="cc-panel w-[26rem] max-w-full p-2 text-[11px]">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="cc-label mb-0">Changes</span>
            <button
              type="button"
              className="cc-btn px-2 py-0.5 text-[11px]"
              data-message-history-clear
              disabled={!history.length}
              onClick={clearHistory}
            >
              Clear
            </button>
          </div>
          {history.length ? (
            <ul className="cc-scroll max-h-[40vh] space-y-1 pr-1">
              {history.map((row) => (
                <li
                  key={row.id}
                  data-message-history-row={row.id}
                  data-message-history-level={row.level}
                  className="flex items-start gap-2 leading-snug text-ink-100"
                >
                  <span className="shrink-0 font-mono text-ink-400">{historyTime(row.at)}</span>
                  <span aria-hidden className={`mt-1 h-2 w-2 shrink-0 rounded-full ${DOT[row.level] || DOT.grey}`} />
                  <span className="min-w-0 break-words">{row.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-ink-400">No changes yet.</div>
          )}
        </div>
      )}
      <button
        type="button"
        data-message-history-toggle
        aria-expanded={open}
        title={open ? 'Hide the changes' : 'Show the changes'}
        className="cc-panel px-2.5 py-1 text-[11px] text-ink-100 hover:text-ink-50"
        onClick={toggleHistory}
      >
        {`Changes · ${history.length} ${open ? '▾' : '▴'}`}
      </button>
    </div>
  );
}

export default function Messages({ children = null }) {
  const messages = useUiStore((s) => s.messages);
  const dismissMessage = useUiStore((s) => s.dismissMessage);
  const dismissOnClickAway = useUiStore((s) => s.dismissOnClickAway);

  // ─── "YELLOW — dismissed by clicking anywhere else." ──────────────────────
  //
  // Anywhere ELSE: a pointer-down that did not land on a message. Capture
  // phase, so a click on a button that opens a modal still clears the yellow it
  // was answering — the gesture is "I have read it and I am getting on with
  // something", whatever the something turns out to be.
  useEffect(() => {
    const onDown = (e) => {
      if (e.target?.closest?.('[data-message]')) return;
      dismissOnClickAway();
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, [dismissOnClickAway]);

  const left = messagesAt(messages, 'left');

  return (
    // The column takes no pointer of its own: only what is in it does, so
    // the canvas beside a short message is still the canvas.
    <div
      data-messages="left"
      className="absolute left-3 bottom-3 max-w-[26rem] flex flex-col items-start gap-1.5 pointer-events-none"
    >
      {children}
      {/* Reds first, then yellows, then greys, the oldest of each first
          (engine/messages.js `sortForDisplay`): the newest stands nearest the
          bar and a red is never buried under a yellow. */}
      {left.length > 0 && (
        <div
          data-messages-list={left.length}
          className={`${LAYER_CLASS.message} flex flex-col items-start gap-1.5`}
        >
          {left.map((m) => <Line key={m.id} msg={m} onDismiss={dismissMessage} />)}
        </div>
      )}
      <HistoryBar />
    </div>
  );
}
