import { useState } from 'react';
import GoldLine from '../ui/GoldLine.jsx';
import { PRICE_FOOTNOTE, PRICE_ON_REQUEST } from '../config.js';

// ─── F3.1 · COLUMN 2, THE RAIL — THE PSW LAW ───────────────────────────────
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
//
// ─── T60 F1.3 · AND IT IS 15% NARROWER ─────────────────────────────────────
//
// The owner, after the first live look: *"nr 2 może być spokojnie 15%
// węższe."* Its base is 187px (220 × 0.85) in `styles/scale.css`, and like
// every other dimension in the room it is that base times `--pbi-scale`. Not
// one measurement is written in this file any more.

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
    <aside data-testid="column-categories" className="pbi-rail">
      <div className="pbi-rail-head">
        <h2 className="pbi-display pbi-h4">CONFIGURE</h2>
        <GoldLine />
      </div>

      <nav className="pbi-rail-nav">
        {CATEGORIES.map((c) => {
          const on = active === c.id;
          return (
            <button
              key={c.id}
              type="button"
              className={`pbi-rail-row${on ? ' is-on' : ''}`}
              data-testid={`cat-${c.id}`}
              aria-current={on ? 'true' : undefined}
              onClick={() => onPick(c.id)}
            >
              <span className="pbi-ui pbi-rail-label">{c.label}</span>
              {/* PSW's cat-hint: what is chosen, without opening anything. */}
              <span className="pbi-choice pbi-rail-hint">{hints?.[c.id] || '—'}</span>
            </button>
          );
        })}
      </nav>

      {/* ─── THE TOTAL, WHICH IS NOT A NUMBER ────────────────────────────────
          F5.1: *"Every price slot reads 'Price on request' in display serif —
          never '£0', never '£ —', never a number."* There is no retail price
          law yet; a zero would be a lie and a dash would be a shrug. */}
      <div className="pbi-rail-foot">
        <div className="pbi-ui pbi-quiet">TOTAL</div>
        <div className="pbi-display pbi-total" data-testid="total-price">{PRICE_ON_REQUEST}</div>
        <div className="pbi-ui pbi-ui-light pbi-quiet pbi-total-foot">{PRICE_FOOTNOTE}</div>

        {/* ─── THE CONFIRM, IN THE DESIGN SYSTEM ────────────────────────────
            This is the one button on the page that can lose an hour of
            somebody's evening — the estimate is memory-only until they save it
            (F5.3) — so it asks. It asks IN PLACE: a browser's own modal dialogue is
            chrome nobody designed, it cannot be styled, and this app has been
            clearing those out for turns. Two presses, the second one labelled
            with what it does, and a way back. */}
        {asked ? (
          <div className="pbi-rail-ask">
            <span className="pbi-choice">Everything you have chosen for this wardrobe will go.</span>
            <button
              type="button"
              className="pbi-link pbi-rail-ask-yes"
              data-testid="reset-confirm"
              onClick={() => { setAsked(false); onReset(); }}
            >
              YES, START AGAIN
            </button>
            <button
              type="button"
              className="pbi-link pbi-rail-ask-no"
              onClick={() => setAsked(false)}
            >
              KEEP IT
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="pbi-link pbi-rail-reset"
            data-testid="reset-design"
            onClick={() => setAsked(true)}
          >
            RESET DESIGN
          </button>
        )}
      </div>
    </aside>
  );
}
