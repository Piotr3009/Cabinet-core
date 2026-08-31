import Wordmark from '../ui/Wordmark.jsx';
import { BRAND, BRAND_LINE, PRO_HREF, RETAIL_HREF } from '../config.js';

// ─── TURN 59 · F1.2 — THE SWITCH ───────────────────────────────────────────
//
// *"A switch, not a marketing page."*
//
// Two flat tiles side by side on Porcelain, and nothing else on the page that
// is not one of: the wordmark, the two tiles, one line of type. The page
// imports NOTHING from PRO — not a component, not a stylesheet, not the
// Tailwind build — which is the point of it: the first thing anyone touches in
// this repository after tonight proves the iron boundary by existing.

const TILE = {
  flex: '1 1 0',
  minHeight: 300,
  padding: '44px 40px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  textDecoration: 'none',
  border: '1px solid var(--pbi-stone-line)',
};

export default function LaunchPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--pbi-porcelain)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 'var(--pbi-side-margin)',
      }}
    >
      <header style={{ marginBottom: 56 }}>
        <Wordmark size={17} />
        <div className="pbi-choice pbi-choice-15" style={{ marginTop: 12 }}>
          {BRAND_LINE}
        </div>
      </header>

      <div style={{ display: 'flex', gap: 2, alignItems: 'stretch' }}>
        {/* ─── DOOR ONE: the application that exists today, untouched. ───── */}
        <a
          href={PRO_HREF}
          data-testid="switch-pro"
          style={{ ...TILE, background: 'var(--pbi-onyx)', borderColor: 'var(--pbi-onyx)' }}
        >
          <span className="pbi-ui" style={{ color: 'var(--pbi-gold-highlight)' }}>FOR THE WORKSHOP</span>
          <span>
            <span
              className="pbi-display"
              style={{ fontSize: 34, lineHeight: 1.1, color: 'var(--pbi-porcelain)', display: 'block' }}
            >
              CABINET CORE
              <br />
              PRO
            </span>
            <span
              className="pbi-choice pbi-choice-15"
              style={{ color: 'var(--pbi-stone-line)', display: 'block', marginTop: 16 }}
            >
              The configurator, the BOM, the CNC. Exactly as it stands.
            </span>
          </span>
        </a>

        {/* ─── DOOR TWO: the client-facing site, born this turn. ──────────── */}
        <a
          href={RETAIL_HREF}
          data-testid="switch-retail"
          style={{ ...TILE, background: 'var(--pbi-ivory)', borderColor: 'var(--pbi-ivory)' }}
        >
          <span className="pbi-ui" style={{ color: 'var(--pbi-deep-gold)' }}>FOR THE CLIENT</span>
          <span>
            <span
              className="pbi-display"
              style={{ fontSize: 34, lineHeight: 1.1, color: 'var(--pbi-onyx)', display: 'block' }}
            >
              {BRAND.split(' ').slice(0, 2).join(' ')}
              <br />
              {BRAND.split(' ').slice(2).join(' ')}
            </span>
            {/* The Champagne line — Gold Highlight, one pixel, as the system says. */}
            <span
              style={{
                display: 'block',
                width: 'var(--pbi-gold-line)',
                height: 1,
                background: 'var(--pbi-champagne)',
                margin: '16px 0',
              }}
            />
            <span className="pbi-choice pbi-choice-15" style={{ display: 'block' }}>
              Design your wardrobe, and ask us what it costs.
            </span>
          </span>
        </a>
      </div>
    </main>
  );
}
