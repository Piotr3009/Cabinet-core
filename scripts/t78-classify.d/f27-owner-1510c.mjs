/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After T78 · the owner's EVENING turn of 15.10.2026 (his list of 20:34 and his answers of 20:48), named here so the
// strict run says why. *"liczby przy ustawianiu island nie moge wykasowac ... glebokosc ... inny kolor krawedzi ...
// przekrecanie szafkami ... recess pionowy ... na wysokosci 1000 mm ... szafki moga sie wycinac w pionie tez do tego
// recesu ... edge od bocznej plyty jest widoczny od frontu ... reces jak komin, front zawsze trzyma sie linii, a jak
// wpada do reces to wtedy sie wydluza szafka"*  and his answers: 1 tak, 2 tak, 3 glebszy karkas, 4 dowolny pas,
// 5 polki glebsze, and *"na setup room jak widze sciane od frontu ... nie widze kresek gdzie jest komin i gdzie wneka"*.

export const LICENSED = {
  'src/engine/islandPlan.js': {
    why: 'Owner 15.10.2026 (evening): a plan row carries its face\'s frame (inward, along) so the view draws the FRONT '
      + 'edge; turnCabinet moves a plan cabinet to the next face clockwise (NEXT_FACE_CLOCKWISE). Arithmetic about a '
      + 'draft, never a cut',
  },
  'src/engine/notch.js': {
    why: 'Owner 15.10.2026 (evening, the mockup "naroznik, krawedz"): the STEP covers the RETURN\'s end as the back '
      + 'covers a side\'s end: the STEP a board wider (nw + g), the RETURN a board shorter (nd - g) at a back corner, '
      + 'the screws follow (the STEP\'s column into the RETURN\'s end, no RETURN column into the STEP, the LID over '
      + 'the RETURN from y = g). The notch in TOP, BOTTOM and the shelves, the dog bone and every drilling unchanged. '
      + 'LISP first: KIT_NOTCH.lsp section 2, D1, notch-box-places, notch-step, notch-return, their screws, the NUMBERS',
  },
};

export const LISP = {
  'reference/lisp/KIT_NOTCH.lsp': 'Owner 15.10.2026 (evening): section 2 RETURN / STEP, D1, notch-box-places, notch-step '
    + '(nw + g), notch-step-screws (the column into the RETURN\'s end), notch-return (nd - g at a back corner, takes the '
    + 'corner), notch-return-screws (no STEP column), notch-lid-screws, the drawing and the summary, the NUMBERS block '
    + '(STEP 218 x 770, RETURN 182 x 770, the fixing table)',
};

// Re-pinned knowingly: the notch golden moved with the owner\'s decision (the box boards 218 / 182, nothing else).
export const REPINNED = [
  {
    file: 'fixtures/golden-notch.json',
    why: 'Owner 15.10.2026 (evening): STEP 218 x 770 (was 200), RETURN 182 x 770 (was 200); the outlines of TOP, BOTTOM, '
      + 'BUL, BACK and SHELF-1, the dog bone, every drilling and the hardware unchanged; KIT_NOTCH.lsp section 9',
  },
];
