/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F2 · THE SHELL. CLAUDE.md T84 (27.10.2026), PART A: when the entry is the factory's (PRO) and
// profile.ui.studio.enabled is true, the editor renders inside StudioShell: the top bar (the legacy MenuBar with
// orderMenus(menus) whole, Undo and Redo, Save, Brightness, Account, and the gold Export renamed BOM with the same
// call), the context strip (SelectionBreadcrumb), the rail (StudioRail: Select, Add, Room, Materials, Check; Design and
// CNC at its foot), the EXISTING scene in the scene slot, and the status bar (StatusBar: the selection in words, the
// MockModeBadge, the dirty marker, the Changes bar re-homed). The retail entry never mounts it. New:
// src/components/studio/StudioShell.jsx, StudioRail.jsx, SelectionBreadcrumb.jsx, StatusBar.jsx, lib/studioFace.js.
// PRO files licensed in test/turn59-f1-the-switch.test.js EXEMPT: src/App.jsx (the face), src/pages/ConfiguratorPage.jsx
// (the composition), src/components/TopBar.jsx, src/components/Messages.jsx. The owner, 27.10.2026, 16:27:
// *"nie, juz jest przy wyborze"* (no switch in the UI); *"tak"* (the header's Export renamed BOM); 22:19: *"wiem ze
// silnik jako tako nie ruszamy ale funkcje w menu musza sie zachowac wszystkie"*.
//
// No engine or lib file (CLAUDE.md T84 FROZEN 1, verify/t84/DECISIONS.md 3): GATES, LICENSED, LIVENESS, GOLDENS and
// REPINNED are empty, the six base goldens and every pinned golden stay byte for byte, and nothing is re-pinned.

export const GATES = {};

export const LICENSED = {};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
