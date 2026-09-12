import { useEffect, useRef, useState } from 'react';
import Button from './Button.jsx';
import { ORDER_EMAIL } from '../config.js';

// ─── TURN 67 · F3 — THE QUIET NOTE AN INACTIVE TILE CARRIES ────────────────
//
// The owner, 11.09.2026, of the WHAT step:
//
//   *"te napisy pod przyciskami daj jedne pod spodem, chcę mieć ładną czystą
//   listę … reszta nieczynna: przycisk, jak najedziesz, napis coming soon i
//   send email to make order, email do skopiowania."*
//
// Two things, and this file is the second of them. The first — the per-tile
// *"Made to order — ask us for a quote."* line under every greyed chip — is
// DELETED, and the paragraph that already closed the step absorbs it, which is
// what *"jedne pod spodem"* asks for. What replaces it on the tile itself is
// this: a small card that appears on HOVER OR FOCUS, says the thing is coming,
// gives the address, and copies it.
//
// ─── WHY IT IS A WRAPPER AND NOT A PROP ON `Chip` ──────────────────────────
//
// *"Keyboard-reachable"*, and a DISABLED `<button>` is not: it takes no focus,
// fires no events, and is skipped by the tab ring — which is correct for a
// control that cannot act, and fatal for one that has something to say. So the
// chip stays disabled and unpressable and the WRAPPER is what the keyboard
// reaches: one `tabIndex={0}` span around it, hover and focus opening the same
// card, Escape closing it. ONE implementation for every inactive tile, which
// is CLAUDE.md's own condition.
//
// The card is not a `title=` tooltip: the address has to be COPYABLE, and a
// native tooltip cannot be clicked, read by a hand on a phone, or reached by a
// keyboard at all.

export default function ComingSoon({ children, what = '' }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  // The clipboard is a permission, not a promise: a browser may refuse the
  // async API outright (no user gesture, an insecure context, a policy), so
  // there are TWO roads and the button says COPIED only if one of them
  // actually arrived.
  //
  //   1. `navigator.clipboard.writeText` — the modern one, where it is allowed.
  //   2. a hidden textarea and `document.execCommand('copy')` — the old one,
  //      which works inside a click handler in every browser this app supports.
  //
  // If BOTH refuse, the button says nothing new and the address is still on
  // the card, in full, where it can be read and typed. That is why it is
  // written out rather than hidden behind the button.
  const fallback = () => {
    try {
      const box = document.createElement('textarea');
      box.value = ORDER_EMAIL;
      box.setAttribute('readonly', '');
      box.style.position = 'fixed';
      box.style.opacity = '0';
      document.body.appendChild(box);
      box.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(box);
      return ok;
    } catch { return false; }
  };

  const said = () => {
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ORDER_EMAIL);
      said();
    } catch {
      if (fallback()) said();
    }
  };

  return (
    <span
      className="pbi-soon-wrap"
      data-testid="coming-soon"
      data-soon-open={open ? 'yes' : 'no'}
      tabIndex={0}
      role="group"
      aria-label={`${what || 'This'} — coming soon. Email us to order.`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}
      onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
    >
      {children}
      {open ? (
        <span className="pbi-soon-card" role="note" data-testid="coming-soon-card">
          <span className="pbi-soon-head">Coming soon</span>
          <span className="pbi-soon-line">
            Email us to order:
            {' '}
            <span className="pbi-soon-mail" data-testid="coming-soon-email">{ORDER_EMAIL}</span>
          </span>
          <Button
            kind="link"
            size="small"
            className="pbi-soon-copy"
            data-testid="coming-soon-copy"
            onClick={copy}
          >
            {copied ? 'COPIED' : 'COPY THE ADDRESS'}
          </Button>
        </span>
      ) : null}
    </span>
  );
}
