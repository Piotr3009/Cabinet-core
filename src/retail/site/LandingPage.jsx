import Button from '../ui/Button.jsx';
import GoldLine from '../ui/GoldLine.jsx';
import SectionHeading from '../ui/SectionHeading.jsx';
import { COLLECTIONS } from '../design/collections.js';
import { hashHref } from './router.js';
import { COLLECTION_LINE, OWNER_TO_SUPPLY } from '../config.js';

// ─── F2 · THE LANDING — THE OWNER'S MOCKUP C, SECTION BY SECTION ───────────
//
// Six sections in the order he drew them, 72 px side margins, 112 px between.
// The one thing this page does NOT do is invent a photograph: F2 is explicit —
// *"the hero image slot — a Porcelain-on-Soft-Ivory placeholder frame captioned
// 'Hero photograph — owner to supply'; NO stock image, NO generated image."* A
// generated hero would be the single hardest thing to take back out.

const SIDE = 'var(--pbi-side-margin)';
const GAP = 'var(--pbi-section-gap)';

function Section({ children, background, id, style }) {
  return (
    <section
      id={id}
      data-testid={`section-${id}`}
      style={{ background, padding: `${GAP} ${SIDE}`, ...style }}
    >
      {children}
    </section>
  );
}

/* ─── 1 · HERO ───────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section
      data-testid="section-hero"
      style={{ display: 'flex', minHeight: 'var(--pbi-hero-min-h)', alignItems: 'stretch' }}
    >
      <div
        style={{
          flex: '0 0 38%',
          background: 'var(--pbi-ivory)',
          padding: `96px ${SIDE}`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h1 className="pbi-display pbi-h1" data-testid="hero-h1">
            MADE
            <br />
            TO
            <br />
            EXACTING
            <br />
            STANDARDS
          </h1>
          <GoldLine margin="28px 0" />
          <p className="pbi-ui pbi-ui-light pbi-quiet" style={{ lineHeight: 2, margin: '0 0 40px' }}>
            BESPOKE FITTED FURNITURE
            <br />
            MADE IN LONDON
          </p>
          <Button kind="secondary" href={hashHref('/collections')}>DISCOVER MORE</Button>
        </div>
        <div className="pbi-ui pbi-ui-light pbi-quiet" data-testid="hero-caption">
          {COLLECTION_LINE}
        </div>
      </div>

      {/* The slot, and an honest caption in it. */}
      <div
        style={{
          flex: '1 1 62%',
          background: 'var(--pbi-soft-ivory)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 56,
        }}
      >
        <div
          data-testid="hero-image-slot"
          style={{
            width: '100%',
            height: '100%',
            minHeight: 480,
            background: 'var(--pbi-porcelain)',
            border: '1px solid var(--pbi-stone-line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span className="pbi-choice pbi-choice-15">{OWNER_TO_SUPPLY}</span>
        </div>
      </div>
    </section>
  );
}

/* ─── 2 · COLLECTIONS ────────────────────────────────────────────────────── */
function CollectionCard({ collection }) {
  return (
    <a
      href={`#/design?collection=${collection.id}`}
      data-testid={`collection-card-${collection.id}`}
      style={{
        flex: '1 1 0',
        minWidth: 220,
        textDecoration: 'none',
        background: 'var(--pbi-warm-white)',
        border: '1px solid var(--pbi-stone-line)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* The flat block of the collection's signature tone — a CONTENT tone,
          the front decor's own colour, and the only kind of hex the retail
          tree is allowed outside the token file. */}
      <span style={{ display: 'block', height: 200, background: collection.tone }} />
      <span style={{ padding: '24px 22px 28px' }}>
        <span className="pbi-display pbi-h3" style={{ display: 'block' }}>{collection.name}</span>
        <GoldLine margin="14px 0" />
        <span className="pbi-choice" style={{ display: 'block' }}>{collection.line}</span>
      </span>
    </a>
  );
}

/* ─── 4 · CRAFTSMANSHIP ──────────────────────────────────────────────────── */
const CRAFT = [
  ['MADE IN LONDON', 'We draw, cut and assemble in our own workshop.'],
  ['CUT ON OUR CNC', 'Every panel is machined from the same drawing the fitters carry.'],
  ['FITTED BY OUR JOINERS', 'The people who built it are the people who install it.'],
];

export default function LandingPage() {
  return (
    <>
      <Hero />

      <Section id="collections" background="var(--pbi-porcelain)">
        <SectionHeading style={{ marginBottom: 48 }}>COLLECTIONS</SectionHeading>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {COLLECTIONS.map((c) => <CollectionCard key={c.id} collection={c} />)}
        </div>
      </Section>

      <Section id="configurator" background="var(--pbi-soft-ivory)">
        <div style={{ maxWidth: 680 }}>
          <SectionHeading>DESIGN YOUR WARDROBE</SectionHeading>
          <p className="pbi-choice pbi-choice-15" style={{ margin: '24px 0 8px' }}>
            Give us the wall and the ceiling, and the wardrobe draws itself in three dimensions
            while you choose.
          </p>
          <p className="pbi-choice pbi-choice-15" style={{ margin: '0 0 36px' }}>
            Nothing is ordered and nothing is charged — you finish with a design and we reply
            with a price.
          </p>
          <Button href={hashHref('/design')} data-testid="cta-configurator">DESIGN YOURS</Button>
        </div>
      </Section>

      <Section id="craftsmanship" background="var(--pbi-onyx)">
        <SectionHeading light style={{ marginBottom: 56 }}>CRAFTSMANSHIP</SectionHeading>
        <div style={{ display: 'flex', gap: 56, flexWrap: 'wrap' }}>
          {CRAFT.map(([title, copy]) => (
            <div key={title} style={{ flex: '1 1 220px' }}>
              <hr className="pbi-rule-gold" style={{ marginBottom: 20 }} />
              <div className="pbi-ui" style={{ color: 'var(--pbi-warm-white)' }}>{title}</div>
              <p className="pbi-choice pbi-choice-15" style={{ color: 'var(--pbi-stone-line)', marginTop: 14 }}>
                {copy}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="final-cta" background="var(--pbi-ivory)" style={{ textAlign: 'center' }}>
        <h2 className="pbi-display pbi-h2">MADE TO MEASURE. MADE TO LAST.</h2>
        <GoldLine margin="28px auto 36px" />
        <Button href={hashHref('/design')} data-testid="cta-final">DESIGN YOURS</Button>
      </Section>
    </>
  );
}
