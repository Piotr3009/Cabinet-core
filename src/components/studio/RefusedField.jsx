/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T84 F5, THE REFUSED FIELD (CLAUDE.md T84 PART C) ────────────────────────
//
// CLAUDE.md T84 F5: *"`RefusedField` wraps `NumberField` in the cards (and
// nowhere else this turn): when the setter returns a refusal
// (`roomFitRefusalFor`'s notice, the leaf count's, the pocket's `said`), the
// field turns red with the reason under it in 13 px, the typed value stays
// unapplied, Escape restores the last applied one; a refused change never
// enters the history. The reason is the engine's exact sentence, never a
// Studio paraphrase."*  FROZEN 4: *"`NumberField.jsx` is not edited: the
// refused field (F5) is a wrapper round it."*
//
// HOW, without touching NumberField:
//   - `commit(v)` is the card's: the room's refusal first, then the setter,
//     answering `{ ok: true }` or `{ ok: false, reason }`. Refused, nothing was
//     written, so nothing reached the history; the field keeps the TYPED value
//     on show (NumberField re-syncs its text to `value` whenever it is not
//     being edited, so it is handed the typed value while refused) and the
//     APPLIED one stays the store's, untouched (lib/studioIssues.js, the law).
//   - Escape. P1 MEASURED that NumberField's own Escape COMMITS the typed text
//     (verify/t84/p1-escape.md C case 1: it blurs, and its blur commits), so
//     this wrapper takes Escape FIRST, in React's capture phase: it restores
//     the applied value, ends the edit, ignores the commit that NumberField's
//     blur then sends, and stops the event there, so no window listener under
//     it acts on the same press (one key event, one action).
//   - A refusal standing while the caret is elsewhere (the inspector's guard
//     blurred the field to keep the selection, F4) is cancelled by the next
//     Escape that no other field is editing.
//   - THE DOM CONTRACT (verify/t84/agents/CONTRACT.md section 4): the wrapper
//     carries `data-studio="refused"`; a refusal sets `data-refused="1"` and
//     `data-refusal="<the engine's exact sentence>"` SYNCHRONOUSLY through a
//     ref (InspectorHost's selection guard reads them in the same tick as the
//     blur that produced them), and an applied value or an Escape takes both
//     away. The red and the 13 px sentence on the danger ground are the
//     skin's one stylesheet (studio.css `.studio-refused[data-refused="1"]`,
//     `.studio-refused-reason`): this file types no colour and no size.

import {
  useEffect, useId, useRef, useState,
} from 'react';
import NumberField from '../NumberField.jsx';
import { refusedFieldAfter, refusedFieldShows, shouldCommitField } from './lib/studioIssues.js';

const EDITABLE_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];

/** Is this key press another field's own edit (which owns its own Escape)? */
function editsText(node) {
  return Boolean(node) && (node.isContentEditable === true || EDITABLE_TAGS.includes(node.tagName));
}

/**
 * @param {object} props  NumberField's own props, and:
 *   value   the APPLIED value (the store's)
 *   commit  (value, result) => ({ ok: true } | { ok: false, reason }), the
 *           card's setter road; a refusal's reason is shown as it is given
 *   onCommit  NumberField's own name for the same road, read when `commit`
 *           is not given (a card written for NumberField still works)
 */
export default function RefusedField({
  value, commit = null, onCommit = null, ...rest
}) {
  const [refused, setRefused] = useState(null);
  const wrap = useRef(null);
  const abandon = useRef(false);
  const applied = useRef(value);
  const reasonId = useId();

  /** The state and the DOM contract together, the DOM synchronously. */
  const settle = (next) => {
    const el = wrap.current;
    if (el) {
      if (next) {
        el.setAttribute('data-refused', '1');
        el.setAttribute('data-refusal', next.reason);
      } else {
        el.removeAttribute('data-refused');
        el.removeAttribute('data-refusal');
      }
    }
    setRefused(next);
  };

  // The applied value moved from OUTSIDE (an Undo, a clamp, another field):
  // a refusal of the old one is over. A refusal itself never moves `value`.
  useEffect(() => {
    if (Object.is(applied.current, value)) return;
    applied.current = value;
    settle(refusedFieldAfter(null, { type: 'outside' }));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `settle` is this render's, and only `value` moves it
  }, [value]);

  // A refusal standing while the caret is elsewhere: the next Escape that no
  // other field is editing cancels it, and nothing else acts on that press.
  useEffect(() => {
    if (!refused) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing) return;
      const el = wrap.current;
      if (!el || (e.target instanceof Node && el.contains(e.target)) || editsText(e.target)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      settle(refusedFieldAfter(refused, { type: 'escape' }));
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the listener lives exactly as long as the refusal
  }, [refused]);

  const onFieldCommit = (v, result) => {
    const abandoned = abandon.current;
    abandon.current = false;
    if (!shouldCommitField({ value: v, applied: value, abandoned })) {
      // The applied value typed again ends a refusal; Escape's blur has
      // already ended it.
      if (!abandoned) settle(null);
      return;
    }
    const road = typeof commit === 'function' ? commit : onCommit;
    const answer = typeof road === 'function' ? road(v, result) : undefined;
    settle(refusedFieldAfter(refused, { type: 'commit', value: v, answer }));
  };

  // Escape, before NumberField's own (which would commit the typed text).
  const onKeyDownCapture = (e) => {
    // An Escape that ends an input method's composition is the input method's.
    if (e.key !== 'Escape' || e.nativeEvent?.isComposing) return;
    e.preventDefault();
    e.stopPropagation();
    settle(refusedFieldAfter(refused, { type: 'escape' }));
    const field = e.target;
    abandon.current = true;
    if (field && typeof field.blur === 'function') field.blur();
    abandon.current = false;
  };

  const showing = refusedFieldShows(refused, value);
  const said = refused && refused.reason ? refused.reason : '';
  return (
    <div
      ref={wrap}
      className="studio-refused"
      data-studio="refused"
      data-refused={refused ? '1' : undefined}
      data-refusal={refused ? refused.reason : undefined}
      onKeyDownCapture={onKeyDownCapture}
    >
      <NumberField
        {...rest}
        value={showing}
        onCommit={onFieldCommit}
        aria-invalid={refused ? 'true' : undefined}
        aria-describedby={said ? reasonId : undefined}
      />
      {said ? (
        <p id={reasonId} role="alert" className="studio-refused-reason">
          {said}
        </p>
      ) : null}
    </div>
  );
}
