/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F8 and F13 . THE PICTURES' NUMBERS (CLAUDE.md T-CC1b, THE NUMBERS)
//
// The owner, 01.11.2026: *"wizualizacja AI z renderu, max 3 proby, wybierasz
// jedna i dodajesz do rysunkow, tanie API"*. The numbers of the pictures live
// in the profile under `profile.visuals`; this turn touches no engine geometry,
// so the defaults stand here (the model of lib/saveNumbers.js) and a profile
// that carries its own `visuals` block wins key by key. Pure: the caller hands
// in getCabinetProfile().

/**
 * The defaults: a kept picture at most 400 KB (PROPOSED), the AI input at most 4 MB (JC's body wall) with its
 * long side 1536 px when it is downscaled (PROPOSED), three AI pictures per click (CONFIRMED, *"max 3 proby"*), and the
 * room of each of the three tries per room kind (PROPOSED words, the owner's three moods of 02.11.2026).
 */
const VISUAL_DEFAULTS = Object.freeze({
  maxKb: 400,
  // CHAT FIX 01.11.2026: 3, not 4: base64 of 3 MB is 4 MB, under Vercel's 4.5 MB request wall in front of JC.
  aiInputMaxMb: 3,
  aiInputLongPx: 1536,
  aiTries: 3,
  // Chat, 02.11.2026: the rooms of the three tries, per room kind (lib/aiVisualise.js roomKindOf), try 1 the first.
  // *"zeby one byly inne od siebie tylko meble takie same, a jednak srodek inny"*; *"jak beda lazienki to musza byc
  // inne prompty"* (the owner). A profile's own `visuals.aiRooms` replaces the whole block. PROPOSED words.
  aiRooms: Object.freeze({
    kitchen: Object.freeze([
      'a bright, modern kitchen with white walls, a pale oak floor and morning daylight',
      'a warm, traditional kitchen with softly painted walls, a wide plank floor, a rug and afternoon sun',
      'a calm, contemporary kitchen with deep coloured walls, a polished concrete floor and soft evening light',
    ]),
    bedroom: Object.freeze([
      'a bright, modern bedroom with white walls, a pale oak floor, a made bed and morning daylight',
      'a warm, traditional bedroom with softly painted panelled walls, a wide plank floor, a rug, a bed in linen and afternoon sun',
      'a calm, contemporary bedroom with deep coloured walls, a stone floor, a low bed and soft evening light',
    ]),
    bathroom: Object.freeze([
      'a bright, modern bathroom with large white tiles, a glass shower screen and daylight',
      'a warm, traditional bathroom with panelled walls in a soft colour, a freestanding bath, a wooden floor and afternoon sun',
      'a calm, contemporary bathroom with dark stone tiles, matt black fittings and soft evening light',
    ]),
  }),
});

/** The pictures' numbers for a profile: the defaults, then the profile's own `visuals` block over them. */
export function visualNumbers(profile) {
  const own = profile && typeof profile.visuals === 'object' && profile.visuals ? profile.visuals : {};
  return { ...VISUAL_DEFAULTS, ...own };
}

/** The bytes a data URL carries (its base64 payload decoded), so a picture is weighed as it is stored. */
export function dataUrlBytes(dataUrl) {
  const s = String(dataUrl || '');
  const comma = s.indexOf(',');
  if (comma < 0) return 0;
  const body = s.slice(comma + 1);
  if (!/;base64/i.test(s.slice(0, comma))) return body.length;
  const pad = body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((body.length * 3) / 4) - pad);
}
