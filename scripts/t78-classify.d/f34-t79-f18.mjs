/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T79 F18 · 21 OR 44 PER SHEET, TWO MENU ENTRIES (CLAUDE.md PART F). The handover of 18.10: *"przełącznik 21/44
// naklejek w oknie eksportu"*, accepted by the owner at 14:55: *"ok daj"*. There is no export window, so the paper is
// chosen by the Output entry: two entries, each naming a preset of profile.labels.sheets, run through onExportLabels
// ({ sheet }) into exportLabelsPdf. Two src/lib files, the menu and the sticker PDF; no engine file, no gate, no golden:
// the labels are paper, never a cut, so no computeCabinet() can reach them and every golden holds byte for byte.

export const LICENSED = {
  'src/lib/outputMenu.js': {
    why: 'T79 F18 (the handover: "przełącznik 21/44 naklejek w oknie eksportu"; the owner 14:55: "ok daj"): the one '
      + 'Part labels entry becomes two, "Part labels · 21 per sheet (Avery L7160)" and "Part labels · 44 per sheet", '
      + 'each running onExportLabels({ sheet }) with its preset key (L7160, generic44); the stale "44 per page" hint '
      + 'corrected. A menu, nothing cut',
    gates: [],
  },
  'src/lib/labelsPdf.js': {
    why: 'T79 F18 (the handover: "przełącznik 21/44 naklejek w oknie eksportu"; the owner 14:55: "ok daj"): '
      + 'labelsProfileOn(profile, sheet) sets labels.sheet to profile.labels.sheets[sheet] (none: the profile\'s own, '
      + 'L7160; an unknown name refused in words); labelsDoc and exportLabelsPdf take `sheet` and say perPage and '
      + 'paper. The sticker PDF, nothing cut',
    gates: [],
  },
};
