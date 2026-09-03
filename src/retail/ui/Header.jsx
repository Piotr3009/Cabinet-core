import Wordmark from './Wordmark.jsx';
import Button from './Button.jsx';
import { hashHref } from '../site/router.js';
import { useEstimateStore } from '../estimate/store.js';
import { PRICE_ON_REQUEST } from '../config.js';

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
//
// ─── T64 F4/F5 · THE TOP BAR'S RIGHT END ───────────────────────────────────
//
// The owner's layout B, container 1: *"Price on request · MY ESTIMATE (2)
// DESIGN"*. The TOTAL / RESET block that stood at the foot of the old rail is
// this one line, and MY ESTIMATE (n) is the link to the estimate page from
// anywhere — `n` is the count of items IN the estimate (`estimate.items()`),
// off the one store that holds them.

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

function NavItem({ path, label, active, testid }) {
  return (
    <a
      className="pbi-ui"
      href={hashHref(path)}
      data-testid={testid || `nav-${path.slice(1)}`}
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
  const count = useEstimateStore((s) => s.designs.filter((d) => d.committed).length);
  const inDesign = path === '/design';
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

      <nav style={{ display: 'flex', gap: 24, flex: '1 1 0', justifyContent: 'flex-end', alignItems: 'baseline' }}>
        {compact ? (
          // THE ROOM: the price line and the estimate link take the right end.
          <span className="pbi-display pbi-total" data-testid="total-price" style={{ margin: 0, whiteSpace: 'nowrap' }}>
            {PRICE_ON_REQUEST}
            <span aria-hidden="true" style={{ margin: '0 10px', color: 'var(--pbi-stone-line)' }}>·</span>
          </span>
        ) : RIGHT.map(([p, label]) => <NavItem key={p} path={p} label={label} active={path === p} />)}
        <NavItem
          path="/estimate"
          label={`MY ESTIMATE (${count})`}
          active={path === '/estimate'}
          testid="nav-estimate"
        />
      </nav>

      <Button
        href={hashHref('/design')}
        data-testid="cta-design-yours"
        style={{ height: compact ? 36 : 40, minHeight: compact ? 36 : 40, flex: '0 0 auto' }}
      >
        {inDesign ? 'DESIGN' : 'DESIGN YOURS'}
      </Button>
    </header>
  );
}
