import { useState } from 'react';
import Button from './Button.jsx';
import { REPLY_PROMISE } from '../config.js';

// ─── F5.2 / F6 · THE FLAT FORM ─────────────────────────────────────────────
//
// *"REQUEST A QUOTE opens a flat form (name · email · phone · postcode ·
// message) in the design system."* The contact page is the same form with
// nothing attached to it (F6). Five fields, no radius, no shadow, no gradient,
// and the promise it makes is a promise about a HUMAN — *"We will reply within
// one working day."* — because R1 has no backend and the honest thing is to
// say what actually happens next.

const FIELDS = [
  ['name', 'YOUR NAME', 'text', true],
  ['email', 'EMAIL', 'email', true],
  ['phone', 'TELEPHONE', 'tel', false],
  ['postcode', 'POSTCODE', 'text', false],
];

export const EMPTY_DETAILS = { name: '', email: '', phone: '', postcode: '', message: '' };

export default function QuoteForm({
  onSubmit, submitLabel = 'REQUEST A QUOTE', busy = false, note = null, testid = 'quote-form',
}) {
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const set = (key) => (e) => setDetails((d) => ({ ...d, [key]: e.target.value }));

  return (
    <form
      data-testid={testid}
      onSubmit={(e) => { e.preventDefault(); onSubmit?.(details); }}
      style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 520 }}
    >
      {FIELDS.map(([key, label, type, required]) => (
        <label key={key} style={{ display: 'block' }}>
          <span className="pbi-label">{label}</span>
          <input
            className="pbi-field"
            data-testid={`field-${key}`}
            type={type}
            name={key}
            required={required}
            value={details[key]}
            onChange={set(key)}
          />
        </label>
      ))}

      <label style={{ display: 'block' }}>
        <span className="pbi-label">ANYTHING WE SHOULD KNOW</span>
        <textarea
          className="pbi-field"
          data-testid="field-message"
          name="message"
          value={details.message}
          onChange={set('message')}
        />
      </label>

      {note}

      <div>
        <Button type="submit" disabled={busy} data-testid="quote-submit">{submitLabel}</Button>
      </div>

      <p className="pbi-choice" style={{ margin: 0 }}>{REPLY_PROMISE}</p>
    </form>
  );
}
