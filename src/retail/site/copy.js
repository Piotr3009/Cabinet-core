// ─── F6 · THE WORDS, AND WHO OWES THEM ─────────────────────────────────────
//
// *"each a Porcelain page with the display heading, the gold line, two
// paragraphs of placeholder copy marked '— owner to write'."*
//
// The mark is the point. A page of invented brand prose reads as finished and
// then ships; a page that says who owes the words gets written. Nothing here
// claims a fact about the business the owner has not told us.
//
// DATA, in a .js file, so `test/turn59-f2-the-shell.test.js` can read it —
// node cannot import a .jsx and a page's copy should not need a bundler.

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

