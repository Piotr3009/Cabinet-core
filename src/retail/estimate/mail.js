import { QUOTE_EMAIL } from '../config.js';

// ─── F5.2 · THE MAILTO, AND ITS CEILING ────────────────────────────────────
//
// *"open a `mailto:` to the address in `src/retail/config.js` … with the
// summary in the body"* and *"mailto body under 2000 characters (truncate with
// '…full estimate attached')"*.
//
// The ceiling is not decoration. A `mailto:` is a URL, browsers and mail
// clients cut long ones without saying so, and a silently truncated estimate is
// the worst possible failure here — the client believes they sent their design
// and the workshop receives half of it. So the truncation is OURS, it happens
// at a known length, and it ends in a sentence that tells the reader there is a
// file to look at.

export const MAIL_BODY_MAX = 2000;
export const TRUNCATION = '…full estimate attached';

/** Cut to MAIL_BODY_MAX INCLUDING the marker, on a line break where one is near. */
export function capBody(body) {
  const text = String(body ?? '');
  if (text.length <= MAIL_BODY_MAX) return text;
  const room = MAIL_BODY_MAX - TRUNCATION.length - 1;
  const head = text.slice(0, room);
  const lastBreak = head.lastIndexOf('\n');
  const cut = lastBreak > room - 200 ? head.slice(0, lastBreak) : head;
  return `${cut}\n${TRUNCATION}`;
}

export function mailtoUrl({ to = QUOTE_EMAIL, subject = '', body = '' } = {}) {
  const capped = capBody(body);
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(capped)}`;
}

export function openMail(options) {
  const url = mailtoUrl(options);
  if (typeof window !== 'undefined') window.location.href = url;
  return url;
}
