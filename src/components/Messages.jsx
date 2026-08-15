import { useEffect } from 'react';
import { useUiStore } from '../stores/uiStore.js';
import { LAYER_CLASS } from '../lib/modalLayer.js';
import { messagesAt } from '../engine/messages.js';

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
//   GREY    centre of the screen, on its own clock, and it never takes the
//           pointer: a confirmation that a file was written must not be able
//           to swallow the click that follows it.

const TONE = {
  red: 'border-status-danger bg-status-danger/20 text-status-danger',
  yellow: 'border-status-warn/70 bg-status-warn/15 text-status-warn',
  grey: 'border-shell-600 bg-shell-800/95 text-ink-100',
};

function Line({ msg, onDismiss }) {
  const body = msg.count > 1 ? `${msg.message} · ×${msg.count}` : msg.message;
  const cls = `px-4 py-2 rounded border text-sm shadow-panel text-left ${TONE[msg.level] || TONE.grey}`;
  if (msg.level === 'red') {
    // A DIV with a button inside it, not a button: the body dismisses, and the
    // WAY OUT beside it (F3's "Export anyway") must not dismiss as a side
    // effect of being pressed.
    return (
      <div
        data-message={msg.id}
        data-message-level="red"
        className={`${cls} flex items-center gap-3`}
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
      className={`${cls} ${msg.level === 'grey' ? 'pointer-events-none' : 'flex items-center gap-3'}`}
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

export default function Messages() {
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

  const bottom = messagesAt(messages, 'bottom');
  const centre = messagesAt(messages, 'centre');
  if (!bottom.length && !centre.length) return null;

  return (
    <>
      {/* GREY — "a few seconds, centre". */}
      {centre.length > 0 && (
        <div
          data-messages="centre"
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${LAYER_CLASS.message}
            flex flex-col items-center gap-1.5 pointer-events-none`}
        >
          {centre.map((m) => <Line key={m.id} msg={m} onDismiss={dismissMessage} />)}
        </div>
      )}
      {/* RED and YELLOW — the ones that WAIT for a person. They stand at the
          bottom, out of the way of the cabinet being looked at, reds first
          (engine/messages.js `sortForDisplay`): a red is never buried under a
          yellow, any more than it is overwritten by a grey. */}
      {bottom.length > 0 && (
        <div
          data-messages="bottom"
          className={`absolute bottom-6 left-1/2 -translate-x-1/2 ${LAYER_CLASS.message}
            flex flex-col items-stretch gap-1.5 max-w-[46rem]`}
        >
          {bottom.map((m) => <Line key={m.id} msg={m} onDismiss={dismissMessage} />)}
        </div>
      )}
    </>
  );
}
