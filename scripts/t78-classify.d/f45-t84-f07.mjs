/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F7 · THE RAIL'S MENUS, ESCAPE AND THE PARITY GATE. CLAUDE.md T84 (27.10.2026), PART E: the rail's popups
// (src/components/studio/RailMenus.jsx: Add opens the EXISTING Library beside the button, Materials the four existing
// windows, unit-finish, design, assign-materials and warehouse), one Escape owner for the shell
// (src/components/studio/lib/studioEscape.js: one key event, one action, in the order of verify/t84/p1-escape.md E;
// never unpin; the part windows keep their own keys and conduct, CLAUDE.md LAWS 4), and THE PARITY TEST
// (test/turn84-f07-parity.test.js) against verify/t84/census-main.json: the 48 menu leaves, the 14 toolbar controls,
// the 7 header controls, the 22 context actions, the 26 window kinds, the 51 library types and the 649 panel
// controls, the same or more. The owner, 27.10.2026, 22:11 to 22:25: *"ok jak juz bedziesz wiedzial dokladnie to
// tabela porownaj ze mamy wszystko nic nie zgubilismy, teraz daj do tury"*; and of THE CENSUS: *"przelicz ile teraz
// mamy funkcji w menu i ile bedzie pozniej ... nie pisz mi okolo tylko dokladnie"*.
//
// No engine or lib file (CLAUDE.md T84 FROZEN 1, verify/t84/DECISIONS.md 3): GATES, LICENSED, LIVENESS, GOLDENS and
// REPINNED are empty, the six base goldens and every pinned golden stay byte for byte, and nothing is re-pinned.

export const GATES = {};

export const LICENSED = {};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
