/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F5 · THE ERRORS YOU CAN SEE. CLAUDE.md T84 (27.10.2026), PART C: a finding stands in three places at once,
// 13 px dark text on the warn or danger ground: the marker beside the unit number in the scene (UnitIssueMarker,
// through ONE adornment slot in src/3d/UnitView.jsx, which is outside this table's engine/lib count), the strip in the
// card and over the full panel with Show (IssueStrip), and the counters on the status bar opening the Check filtered to
// their level (IssueCounters; src/components/CheckPanel.jsx reads the uiStore's checkFilter, licensed in EXEMPT); and
// the refused field (RefusedField, a wrapper round NumberField, which is not edited) turns red with the engine's exact
// sentence. The grouping (src/components/studio/lib/studioIssues.js) reads the engine's own findingsToAct over the
// Check's findings: no check is added and none is moved. The owner, 27.10.2026, 16:27: *"chcialbym jako uzytkownik
// widziec jakie beda zmiany"*; *"napewno naprzyklad wszystkie bledy zolte i czerwone sa totalnie niewidoczne, mala
// czcionka etc"*.
//
// No engine or lib file (CLAUDE.md T84 FROZEN 1, verify/t84/DECISIONS.md 3): GATES, LICENSED, LIVENESS, GOLDENS and
// REPINNED are empty, the six base goldens and every pinned golden stay byte for byte, and nothing is re-pinned.

export const GATES = {};

export const LICENSED = {};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
