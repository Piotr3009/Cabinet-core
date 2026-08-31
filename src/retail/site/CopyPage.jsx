import SectionHeading from '../ui/SectionHeading.jsx';
import { OWNER_TO_WRITE } from '../config.js';

// ─── F6 · THE THIN-BUT-REAL PAGES ──────────────────────────────────────────
//
// *"`#/materials`, `#/design-process`, `#/about`, `#/journal` — each a
// Porcelain page with the display heading, the gold line, two paragraphs of
// placeholder copy marked '— owner to write'."*
//
// The mark is the point. A page of invented brand prose reads as finished and
// then ships; a page that says who owes the words gets written. Nothing here
// claims a fact about the business that the owner has not told us.

export const COPY_PAGES = {
  '/materials': {
    title: 'MATERIALS',
    sub: 'What the wardrobe is actually made of.',
    paragraphs: [
      'The boards, the edging, the runners and the hinges we build with, and why each one was '
      + 'chosen. Decors are EGGER; the carcass and the fronts can be specified separately.',
      'Wear, cleaning, and what a decor looks like after ten years in a bedroom.',
    ],
  },
  '/design-process': {
    title: 'DESIGN PROCESS',
    sub: 'From the wall you have to the wardrobe you get.',
    paragraphs: [
      'Design it here, ask for a quote, and we survey before anything is cut. The survey is '
      + 'the measurement that counts — the numbers you give us start the conversation.',
      'Drawing, approval, machining, delivery, fitting. What we need from you at each step.',
    ],
  },
  '/about': {
    title: 'ABOUT',
    sub: 'Who builds it.',
    paragraphs: [
      'A London workshop making fitted furniture to order, on our own machines.',
      'The people, the premises, and the reason the company exists.',
    ],
  },
  '/journal': {
    title: 'JOURNAL',
    sub: 'Work, as it leaves the bench.',
    paragraphs: [
      'Finished installations, details worth a photograph, and the occasional note about how '
      + 'something was solved.',
      'Written by the workshop rather than by a marketing department.',
    ],
  },
};

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
