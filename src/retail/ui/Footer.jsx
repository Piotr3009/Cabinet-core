import Wordmark from './Wordmark.jsx';
import { hashHref } from '../site/router.js';
import { BRAND_LINE } from '../config.js';

// ─── F2 · THE FOOTER ───────────────────────────────────────────────────────
//
// *"Footer: Onyx, text Warm White, lines Gold Highlight, the wordmark,
// 'Bespoke fitted furniture · Made in London', the nav repeated, the legal
// line. No social icons this turn."*
//
// Gold Highlight is the only gold that survives on an Onyx ground, which is
// why the system names it for exactly this.

const NAV = [
  ['/collections', 'COLLECTIONS'],
  ['/materials', 'MATERIALS'],
  ['/design-process', 'DESIGN PROCESS'],
  ['/about', 'ABOUT'],
  ['/journal', 'JOURNAL'],
  ['/contact', 'CONTACT'],
];

export default function Footer() {
  return (
    <footer
      data-testid="pbi-footer"
      style={{
        background: 'var(--pbi-onyx)',
        color: 'var(--pbi-warm-white)',
        padding: 'calc(var(--pbi-section-gap) / 2) var(--pbi-side-margin)',
      }}
    >
      <hr className="pbi-rule-gold" style={{ marginBottom: 40 }} />

      <div style={{ display: 'flex', gap: 56, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div>
          <Wordmark size={15} tone="warm" />
          <div
            className="pbi-choice pbi-choice-15"
            style={{ color: 'var(--pbi-stone-line)', marginTop: 14 }}
          >
            {BRAND_LINE}
          </div>
        </div>

        <nav style={{ display: 'flex', gap: 26, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {NAV.map(([p, label]) => (
            <a
              key={p}
              className="pbi-ui"
              href={hashHref(p)}
              style={{ color: 'var(--pbi-warm-white)', textDecoration: 'none' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--pbi-gold-highlight)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--pbi-warm-white)'; }}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>

      <hr className="pbi-rule-gold" style={{ margin: '40px 0 18px' }} />

      <div className="pbi-ui pbi-ui-light" style={{ color: 'var(--pbi-soft-graphite)' }}>
        © PRIME BESPOKE INTERIORS · LONDON · ALL RIGHTS RESERVED
      </div>
    </footer>
  );
}
