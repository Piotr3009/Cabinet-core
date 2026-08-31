import SectionHeading from '../ui/SectionHeading.jsx';
import { COPY_PAGES } from './copy.js';
import { OWNER_TO_WRITE } from '../config.js';

// ─── F6 · THE THIN-BUT-REAL PAGES ──────────────────────────────────────────
//
// The page; its words are in `copy.js` beside it.

export default function CopyPage({ path }) {
  const page = COPY_PAGES[path];
  if (!page) return null;
  return (
    <main
      data-testid={`copy-page-${path.slice(1)}`}
      style={{
        background: 'var(--pbi-porcelain)',
        padding: 'var(--pbi-section-gap) var(--pbi-side-margin)',
        minHeight: '60vh',
      }}
    >
      <SectionHeading sub={page.sub}>{page.title}</SectionHeading>
      <div style={{ maxWidth: 640, marginTop: 40 }}>
        {page.paragraphs.map((text) => (
          <p key={text} className="pbi-choice pbi-choice-15" style={{ marginBottom: 24 }}>
            {text}
            {' '}
            <span className="pbi-ui pbi-ui-light pbi-quiet" style={{ letterSpacing: '0.12em' }}>
              {OWNER_TO_WRITE}
            </span>
          </p>
        ))}
      </div>
    </main>
  );
}
