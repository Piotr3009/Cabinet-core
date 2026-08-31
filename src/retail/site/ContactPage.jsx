import SectionHeading from '../ui/SectionHeading.jsx';
import QuoteForm from '../ui/QuoteForm.jsx';
import { QUOTE_EMAIL } from '../config.js';
import { openMail } from '../estimate/mail.js';

// ─── F6 · CONTACT — THE SAME FORM, WITHOUT THE ESTIMATE ────────────────────
//
// R1 has no backend, so this does exactly what the quote form does minus the
// design: it opens the client's own mail client addressed to the owner. No
// silent POST to nowhere, and no "thank you" screen for a message that was
// never sent.

export default function ContactPage() {
  return (
    <main style={{ background: 'var(--pbi-porcelain)', padding: 'var(--pbi-section-gap) var(--pbi-side-margin)' }}>
      <SectionHeading sub="Tell us about the room. We survey before we build.">CONTACT</SectionHeading>
      <div style={{ marginTop: 44 }}>
        <QuoteForm
          testid="contact-form"
          submitLabel="SEND"
          onSubmit={(details) => openMail({
            subject: `Enquiry — ${details.name || 'Prime Bespoke Interiors'}`,
            body: [
              `Name: ${details.name}`,
              `Email: ${details.email}`,
              `Telephone: ${details.phone}`,
              `Postcode: ${details.postcode}`,
              '',
              details.message,
            ].join('\n'),
          })}
        />
        <p className="pbi-choice pbi-choice-15" style={{ marginTop: 36 }}>
          Or write to us directly at
          {' '}
          <a className="pbi-link" style={{ textTransform: 'none', letterSpacing: '0.04em' }} href={`mailto:${QUOTE_EMAIL}`}>
            {QUOTE_EMAIL}
          </a>
          .
        </p>
      </div>
    </main>
  );
}
