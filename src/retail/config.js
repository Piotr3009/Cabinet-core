// ─── PRIME BESPOKE INTERIORS · THE THINGS THE OWNER STILL HAS TO SAY ───────
//
// Everything in this file is a PLACEHOLDER waiting on the owner, gathered in
// one place so the morning report can list it and one commit can answer it.
// Nothing here is a price: CLAUDE.md F5 — *"There is no retail price law yet
// (markup and rounding are the owner's decision; the engine's BOM cost is NOT
// a retail price)"* — and so the only thing this app will ever say about money
// is the string below.

export const BRAND = 'PRIME BESPOKE INTERIORS';
export const BRAND_LINE = 'Bespoke fitted furniture · Made in London';
export const COLLECTION_LINE = 'IVORY & ONYX';

/**
 * OWNER TO CONFIRM. R1 has no backend (F5.2: *"Database and email delivery are
 * R2"*), so a quote request lands in the client's own mail client addressed
 * here, and downloads itself as JSON on the way past.
 */
export const QUOTE_EMAIL = 'quotes@primebespokeinteriors.co.uk';

/** The reply promise the form makes. Owner may want different words. */
export const REPLY_PROMISE = 'We will reply within one working day.';

/**
 * THE ONLY THING THIS APP SAYS ABOUT MONEY.
 *
 * F5.1, verbatim: *"Every price slot reads **"Price on request"** in display
 * serif — never "£0", never "£ —", never a number."* One constant, so that
 * `test/turn59-f5-the-estimate.test.js` can grep the whole retail tree for a
 * currency symbol and find only this file.
 */
export const PRICE_ON_REQUEST = 'Price on request';
export const PRICE_FOOTNOTE = 'EXCL. VAT · MADE IN LONDON';

/** Where the switch sends each door (F1.2). */
export const PRO_HREF = '/';
export const RETAIL_HREF = '/retail.html';

/** Copy the owner is to write (F6). Marked, never faked. */
export const OWNER_TO_WRITE = '— owner to write';
export const OWNER_TO_SUPPLY = 'Hero photograph — owner to supply';
