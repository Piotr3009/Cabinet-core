import { useState } from 'react';
import GoldLine from '../ui/GoldLine.jsx';
import { PRICE_FOOTNOTE, PRICE_ON_REQUEST } from '../config.js';

// ─── F3.1 · COLUMN 1, THE PSW LAW ──────────────────────────────────────────
//
// The owner, verbatim: *"jak w PSW, lewa i prawa strona menu — rozwijana
// będzie za długa i się będzie mieszać."*
//
// So: SIX ROWS AND NOTHING FOLDS. Each row is a label in the UI font with the
// CURRENT CHOICE under it in serif italic — PSW's `cat-hint`, which is the
// whole reason two columns beat one accordion: the client can read what they
// have chosen for all six categories without opening any of them.
//
// The active row is PSW's `cat-btn.active` in Ivory: a Soft Ivory ground, a
// 2-px Champagne bar on the left edge, the label in Deep Gold.

export const CATEGORIES = [
  { id: 'space', label: 'YOUR SPACE' },
  { id: 'layout', label: 'LAYOUT' },
  { id: 'fronts', label: 'FRONTS' },
  { id: 'interior', label: 'INTERIOR' },
  { id: 'details', label: 'DETAILS' },
  { id: 'estimate', label: 'ESTIMATE' },
];

export default function Categories({ active, onPick, hints, onReset }) {
  const [asked, setAsked] = useState(false);
  return (
    <aside
      data-testid="column-categories"
      style={{
        width: 'var(--pbi-col-categories)',
        minWidth: 'var(--pbi-col-categories)',
        background: 'var(--pbi-ivory)',
        borderRight: '1px solid var(--pbi-stone-line)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      <div style={{ padding: '22px 20px 6px' }}>
        <h2 className="pbi-display pbi-h4">CONFIGURE</h2>
        <GoldLine margin="12px 0 4px" />
      </div>

      <nav style={{ flex: '1 1 auto' }}>
        {CATEGORIES.map((c) => {
          const on = active === c.id;
          return (
            <button
              key={c.id}
              type="button"
              data-testid={`cat-${c.id}`}
              aria-current={on ? 'true' : undefined}
              onClick={() => onPick(c.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '14px 20px 14px 18px',
                border: 0,
                borderLeft: `2px solid ${on ? 'var(--pbi-champagne)' : 'transparent'}`,
                background: on ? 'var(--pbi-soft-ivory)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              <span
                className="pbi-ui"
                style={{ color: on ? 'var(--pbi-deep-gold)' : 'var(--pbi-onyx)', display: 'block' }}
              >
                {c.label}
              </span>
              {/* PSW's cat-hint: what is chosen, without opening anything. */}
              <span className="pbi-choice" style={{ display: 'block', marginTop: 4 }}>
                {hints?.[c.id] || '—'}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ─── THE TOTAL, WHICH IS NOT A NUMBER ────────────────────────────────
          F5.1: *"Every price slot reads 'Price on request' in display serif —
          never '£0', never '£ —', never a number."* There is no retail price
          law yet; a zero would be a lie and a dash would be a shrug. */}
      <div style={{ padding: '20px', borderTop: '1px solid var(--pbi-stone-line)' }}>
        <div className="pbi-ui pbi-quiet">TOTAL</div>
        <div
          className="pbi-display pbi-h4"
          data-testid="total-price"
          style={{ marginTop: 8, textTransform: 'none', letterSpacing: '0.04em' }}
        >
          {PRICE_ON_REQUEST}
        </div>
        <div className="pbi-ui pbi-ui-light pbi-quiet" style={{ marginTop: 10, fontSize: 10 }}>
          {PRICE_FOOTNOTE}
        </div>
        {/* ─── THE CONFIRM, IN THE DESIGN SYSTEM ────────────────────────────
            This is the one button on the page that can lose an hour of
            somebody's evening — the estimate is memory-only until they save it
            (F5.3) — so it asks. It asks IN PLACE: a browser's own modal dialogue is
            chrome nobody designed, it cannot be styled, and this app has been
            clearing those out for turns. Two presses, the second one labelled
            with what it does, and a way back. */}
        {asked ? (
          <div style={{ marginTop: 18 }}>
            <span className="pbi-choice" style={{ display: 'block', marginBottom: 10 }}>
              Everything you have chosen for this wardrobe will go.
            </span>
            <button
              type="button"
              className="pbi-link"
              data-testid="reset-confirm"
              style={{ color: 'var(--pbi-onyx)' }}
              onClick={() => { setAsked(false); onReset(); }}
            >
              YES, START AGAIN
            </button>
            <button
              type="button"
              className="pbi-link"
              style={{ marginLeft: 16 }}
              onClick={() => setAsked(false)}
            >
              KEEP IT
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="pbi-link"
            data-testid="reset-design"
            style={{ marginTop: 18 }}
            onClick={() => setAsked(true)}
          >
            RESET DESIGN
          </button>
        )}
      </div>
    </aside>
  );
}
