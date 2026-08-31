import GoldLine from '../ui/GoldLine.jsx';
import Button from '../ui/Button.jsx';
import SectionHeading from '../ui/SectionHeading.jsx';
import { COLLECTIONS } from '../design/collections.js';

// ─── F6 · THE COLLECTIONS PAGE ─────────────────────────────────────────────
//
// *"`#/collections` (four collections, each with swatch, copy, DESIGN IN THIS
// COLLECTION → `#/design?collection=…`)"*. The whole point of the link is that
// the design room OPENS already wearing the collection — F4.3's preset applied
// before the client has touched anything.

export default function CollectionsPage() {
  return (
    <main style={{ background: 'var(--pbi-porcelain)', padding: 'var(--pbi-section-gap) var(--pbi-side-margin)' }}>
      <SectionHeading
        style={{ marginBottom: 64 }}
        sub="Four ways to finish the same joinery. Every one is EGGER board, cut in our own workshop."
      >
        COLLECTIONS
      </SectionHeading>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {COLLECTIONS.map((c) => (
          <article
            key={c.id}
            data-testid={`collection-row-${c.id}`}
            style={{
              display: 'flex',
              alignItems: 'stretch',
              background: 'var(--pbi-warm-white)',
              border: '1px solid var(--pbi-stone-line)',
              minHeight: 240,
            }}
          >
            <span style={{ flex: '0 0 260px', background: c.tone }} />
            <div style={{ flex: '1 1 auto', padding: '36px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h2 className="pbi-display pbi-h3">{c.name}</h2>
                <GoldLine />
                <p className="pbi-choice pbi-choice-15" style={{ maxWidth: 520 }}>{c.line}</p>
              </div>
              <div>
                <Button kind="secondary" href={`#/design?collection=${c.id}`}>
                  DESIGN IN THIS COLLECTION
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
