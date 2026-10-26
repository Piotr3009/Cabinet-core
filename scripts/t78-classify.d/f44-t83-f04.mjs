/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F4 . THE MIRROR CABINET'S BOM (slice M2). CLAUDE.md T83 F4: *"Lines per cabinet: "LED light panel, made to
// measure, 4000 K, 75 x H" (one per LED stile), "Mirror 4 mm" (m2, the doors and the back when on), "Glass shelf 6 mm
// toughened, W x D" (one per shelf), "LED strip under" and "LED strip inside" (lm), "LED driver 24 V" (one), "Fused
// spur by electrician" (a note), the hinges by weight, the shelf pins, the hanging brackets as the vanity's. Articles
// empty strings (`profile.mirror.articles`) for the owner to fill."*. engine/bom.js is a READER of computeCabinet's
// result (outside the cut graph: no golden reaches it); every line it adds is read off `derived.mirror`, which only
// MIRROR_CABINET carries (M1's gate `mirror_cabinet`, f44-t83-f02.mjs), so every other unit's BOM is what it was.
// Draft for INT: drop into scripts/t78-classify.d/ as f44-t83-f04.mjs.

const OWNER = 'The owner, 25.10.2026 (14:09): *"zobacz szafki z mirrorami na wierzchu i szybkami w srodku czyli szklane '
  + 'polki, czasami lustro z tylu, podswietlenie pod spodem etc"*; (14:29) *"nie wlasny box, ktos nam to zrobi na '
  + 'zamowienie"*, *"4k"*.';

export const LICENSED = {
  'src/engine/bom.js': {
    why: 'T83 F4: mirrorCabinetOrderLines (the LED light panels a LED stile, the mirror 4 mm in m2 of the doors and the '
      + 'back, the glass shelves 6 mm toughened by size, the LED strips under and inside in metres, the LED driver 24 V, '
      + 'the hinges by the door\'s weight with its mirror, the house\'s shelf pins, the vanity\'s hangers; the articles '
      + 'from profile.mirror.articles), mirrorCabinetNotes (the fused spur by the electrician, a NOTE row, manual); '
      + 'buildBom and buildCabinetPartQtys read them beside result.hardware and leave a mirror cabinet\'s bought parts '
      + '(material_role \'bought\', the LED stiles and the glass) out of the cut rows and the board area. All of it is '
      + `behind result.derived.mirror: [] and no-op for every other unit. ${OWNER}`,
    gates: ['mirror_cabinet'],
  },
};

export const REPINNED = [];
