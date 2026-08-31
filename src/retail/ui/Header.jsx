import Wordmark from './Wordmark.jsx';
import Button from './Button.jsx';
import { hashHref } from '../site/router.js';

// ─── F2 · THE HEADER ───────────────────────────────────────────────────────
//
// *"Header 82px, Warm White, bottom hairline Stone Line. Left nav: COLLECTIONS
// · MATERIALS · DESIGN PROCESS; centred wordmark PRIME BESPOKE INTERIORS;
// right nav: ABOUT · JOURNAL · CONTACT; hover Deep Gold; the active item
// carries a Champagne 1-px underline. Far right, one primary button: DESIGN
// YOURS → the design room. Inside the design room the header shrinks to 60px
// (same content)."*
//
// The 60px variant is the SAME COMPONENT with a different height token — not a
// second header, because two headers drift apart by the third turn.

const LEFT = [
  ['/collections', 'COLLECTIONS'],
  ['/materials', 'MATERIALS'],
  ['/design-process', 'DESIGN PROCESS'],
];
const RIGHT = [
  ['/about', 'ABOUT'],
  ['/journal', 'JOURNAL'],
  ['/contact', 'CONTACT'],
];

function NavItem({ path, label, active }) {
  return (
    <a
      className="pbi-ui"
      href={hashHref(path)}
      data-testid={`nav-${path.slice(1)}`}
      style={{
        textDecoration: 'none',
        color: active ? 'var(--pbi-onyx)' : 'var(--pbi-soft-graphite)',
        paddingBottom: 4,
        borderBottom: active ? '1px solid var(--pbi-champagne)' : '1px solid transparent',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--pbi-deep-gold)'; }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = active ? 'var(--pbi-onyx)' : 'var(--pbi-soft-graphite)';
      }}
    >
      {label}
    </a>
  );
}

export default function Header({ path = '/', compact = false }) {
  const h = compact ? 'var(--pbi-header-h-room)' : 'var(--pbi-header-h)';
  return (
    <header
      data-testid="pbi-header"
      data-compact={compact ? 'yes' : 'no'}
      style={{
        height: h,
        minHeight: h,
        background: 'var(--pbi-warm-white)',
        borderBottom: '1px solid var(--pbi-stone-line)',
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        padding: `0 ${compact ? '24px' : 'var(--pbi-side-margin)'}`,
        position: 'relative',
        zIndex: 5,
      }}
    >
      <nav style={{ display: 'flex', gap: 24, flex: '1 1 0' }}>
        {LEFT.map(([p, label]) => <NavItem key={p} path={p} label={label} active={path === p} />)}
      </nav>

      <a href={hashHref('/')} style={{ textDecoration: 'none', flex: '0 0 auto' }} data-testid="pbi-wordmark">
        <Wordmark size={compact ? 13 : 15} />
      </a>

      <nav style={{ display: 'flex', gap: 24, flex: '1 1 0', justifyContent: 'flex-end' }}>
        {RIGHT.map(([p, label]) => <NavItem key={p} path={p} label={label} active={path === p} />)}
      </nav>

      <Button
        href={hashHref('/design')}
        data-testid="cta-design-yours"
        style={{ height: compact ? 36 : 40, minHeight: compact ? 36 : 40, flex: '0 0 auto' }}
      >
        DESIGN YOURS
      </Button>
    </header>
  );
}
