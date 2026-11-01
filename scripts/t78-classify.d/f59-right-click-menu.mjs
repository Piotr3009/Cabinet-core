/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// RIGHT-CLICK MENU (01.11.2026, in chat) . the menu on the approved mockups; no gate, no golden, no cut geometry.
const WHY = '*"tak jak teraz na wszystkie dzialaja ktore sa zaznaczone oczywiscie"*; *"4 koduj"* (the owner, 01.11.2026, 22:05)';
export const GATES = {};
export const LICENSED = {
  'src/lib/contextActions.js': { why: `the owner's entries (Rename, Colour, the turns, Drawer fronts, Show in CNC, Size out; Centre shelves, Centre between, Add doors, Duplicate in), every act on all selected in one undo step, the mixed state, the choice rows, the door and drawer front menus. ${WHY}`, gates: [] },
  'src/lib/menuPlacement.js': { why: `placeMenuUnderAnchor for the Actions icon and placeSubmenu beside the menu. ${WHY}`, gates: [] },
  'src/lib/platform.js': { why: `isMacLike, isTouchLike, additiveClick, menuOnlyClick: on a Mac Cmd adds to the selection and Ctrl+click only opens the menu; a touch screen gets press and hold. *"duzo ludzi tak, wiec prawy przycisk moze byc podreczny dla mackowcow"* (the owner, 01.11.2026)`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
