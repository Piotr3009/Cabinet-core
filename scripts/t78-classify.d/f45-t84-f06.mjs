/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F6 · THE SCENE'S EDGE. CLAUDE.md T84 (27.10.2026), PART D: four toggles at the scene's top edge (X-ray, Hide
// fronts, Outlines, Open all / Close all: profile.ui.studio.sceneToggles), View with the other nine scene controls, and
// the camera bar (Plan, Iso, A, B, C, D, Frame selection) through the room's registered camera handle, Drawings as the
// preview window. The SAME handlers and the SAME guards as the canvas toolbar's; under Studio the toolbar is not
// rendered, the legacy face keeps it. New: src/components/studio/SceneToggles.jsx, SceneViewMenu.jsx, CameraBar.jsx,
// lib/cameraPresets.js (pure: the directions from the room, Frame selection with profile.ui.studio.frameMargin). PRO
// files licensed in test/turn59-f1-the-switch.test.js EXEMPT: src/components/CanvasToolbar.jsx (its door entries
// shared, nothing else) and src/pages/ConfiguratorPage.jsx. The owner, 27.10.2026, 22:19: *"wiem ze silnik jako tako
// nie ruszamy ale funkcje w menu musza sie zachowac wszystkie"*; 22:13: *"czy zadna funkcja nam nie zginie? np
// corners etc"*.
//
// No engine or lib file (CLAUDE.md T84 FROZEN 1, verify/t84/DECISIONS.md 3): GATES, LICENSED, LIVENESS, GOLDENS and
// REPINNED are empty, the six base goldens and every pinned golden stay byte for byte, and nothing is re-pinned.

export const GATES = {};

export const LICENSED = {};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
