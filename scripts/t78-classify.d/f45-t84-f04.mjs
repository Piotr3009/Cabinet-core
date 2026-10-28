/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F4 · THE INSPECTOR HOST. CLAUDE.md T84 (27.10.2026), PART B: InspectorHost holds the quick card (344, 316
// below 1440), the full RightPanel embedded (400, 360 below 1500) or nothing; Pin keeps it full and follows the
// selection, never an id; a pending valid edit is committed to its original cabinet before the selection changes, a
// refused one blocks the switch with its refusal in sight. New: src/components/studio/InspectorHost.jsx. PRO files
// licensed in test/turn59-f1-the-switch.test.js EXEMPT: src/components/RightPanel.jsx and
// src/components/MultiUnitPanel.jsx (layout="embedded" and headerActions inside the existing header on every branch;
// the duplicate inline ElementSection suppressed in the embedded layout only; every row, section and the x kept), and
// src/pages/ConfiguratorPage.jsx (the panel no longer laid over the scene under Studio). The store's new names
// (inspector, inspectorPinned, selectionGuard) are src/stores/uiStore.js's, outside this table. The designer's contract,
// adopted by the owner at 16:27: *"Pin keeps inspector open and FOLLOWING SELECTION; it never locks unit ID"*;
// *"Suppress only the duplicate inline ElementSection in the Studio inspector; the existing part editor remains
// independent"*. The owner, 27.10.2026, 22:11 to 22:25: *"ok jak juz bedziesz wiedzial dokladnie to tabela porownaj ze
// mamy wszystko nic nie zgubilismy, teraz daj do tury"*.
//
// No engine or lib file (CLAUDE.md T84 FROZEN 1, verify/t84/DECISIONS.md 3): GATES, LICENSED, LIVENESS, GOLDENS and
// REPINNED are empty, the six base goldens and every pinned golden stay byte for byte, and nothing is re-pinned.

export const GATES = {};

export const LICENSED = {};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
