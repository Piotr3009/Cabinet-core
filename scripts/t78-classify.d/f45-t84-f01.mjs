/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F1 · THE SKIN. CLAUDE.md T84 (27.10.2026), PART A: the Studio's stylesheet and icons from the designer's
// Stage-1 (verify/t84/astra/, her contract adopted by the owner at 16:27): src/components/studio/studio.css (the
// studio-* classes scoped under .studio-pro; the 13 / 30 / 32 / 4 scale and the bars as CSS variables the shell sets
// at mount; the colours Tailwind's theme), src/components/studio/StudioIcons.jsx (the Stage-1 symbols as one sprite)
// and src/components/studio/lib/studioSkin.js (studioWidths, studioCssVars). The owner, to the designer
// (verify/t84/astra/transcript.txt): *"skupiamy sie teraz wylacznie na PRO. PRO i Retail maja osobne interfejsy. Dla
// PRO wybieramy Studio"*; 27.10.2026, 16:27: *"nie, juz jest przy wyborze"*.
//
// THE ONE ENGINE FILE OF THE TURN, AND WHY IT IS NOT NAMED HERE. INT's one patch gives src/engine/profile.js its
// `ui.studio` block: the numbers of CLAUDE.md THE NUMBERS and nothing else (enabled, scale, bars, rail, inspector,
// minScreen, sceneToggles, doorWindow, issues, marker, frameMargin, libraryGapPx, cardRowsMax), which
// migrateCabinetProfile takes whole (verify/t84/DECISIONS.md 4). The block is read by src/components/studio and by
// nothing else: on computeCabinet's import graph the one line that names `ui.studio` is that migration's copy of it,
// and no cut, no CNC line and no BOM line reads it. profile.js has stood in this classifier's table since T78 (named
// by f05.mjs and by 38 fragments after it), so its new lines are already named, the table's engine/lib count does not
// move (106, as on main 9f5020f) and this fragment licenses nothing. The four pure modules CLAUDE.md calls `lib/`
// stand in src/components/studio/lib/, outside src/engine and src/lib (DECISIONS 3).
//
// No engine or lib file (CLAUDE.md T84 FROZEN 1, DECISIONS 3): GATES, LICENSED, LIVENESS, GOLDENS and REPINNED are
// empty, the six base goldens and every pinned golden stay byte for byte, and nothing is re-pinned.

export const GATES = {};

export const LICENSED = {};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
