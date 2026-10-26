/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F5 . THE RIGHT PANEL, THE LIBRARY, THE SHEETS (slice M3). CLAUDE.md T83 F5: *"Library rows in PRO's Kitchen and
// Wardrobe libraries under Bathroom"*; *"the fronts sheet draws the three mirror doors and the two stiles (a new ink
// `LED_STILE`, warm yellow, one ink one layer), the panels round, the unit number; the section shows the recess, the
// bottom box and the LED; the plan the stiles flush with the doors"*. Three engine files: one row in the one Bathroom
// group (library.js), one ink (layers.js) and the projector's mirror rows (projector.js), every one behind keys no kit
// written before tonight carries (the type MIRROR_CABINET, the roles `led_stile` and `mirror_door`, `meta.mirrorCabinet`,
// `derived.mirror`). None of it is read by computeCabinet: no golden moves, none is new. The panel (RightPanel.jsx) and
// the store's one action (projectStore.js setMirrorCabinet) are outside this contract (src/components, src/stores).
// Draft for INT: drop into scripts/t78-classify.d/ as f44-t83-f05.mjs.

const OWNER = 'The owner, 25.10.2026 (22:41): *"daj wszystkie mozliwosci z panelami, z ledami, bez, szerokosc '
  + 'ustawianych drzwiczek etc"*; (14:14) *"panele led trzeba bedzie zamontowac na rowno z drzwiami, nie wcisniete"*; '
  + '(14:09) *"w tym przypadku to reces ale tez w standardzie normalnie wiszaca"*.';

export const GATES = {};

export const LICENSED = {
  'src/engine/library.js': {
    why: 'T83 F5: the Bathroom group (the ONE constant both libraries place) gains the row "Mirror cabinet" '
      + '(`typeId: \'MIRROR_CABINET\'`, its label the kit\'s own) after the three vanity rows, and its hint names it; a '
      + 'list. Every kit written before tonight keeps its row, its place and its category; the project filter keeps the '
      + `bathroom in every job, as T82 F9 made it. ${OWNER}`,
    gates: ['mirror_cabinet'],
  },
  'src/engine/drawings/layers.js': {
    why: 'T83 F5: LED_STILE, a warm yellow ink of its own (ACI 40, no other layer\'s index, the colour PROPOSED), the '
      + 'VISIBLE pen, in the pen order after DOORS: the mirror cabinet\'s LED stile on its sheets and its LED strips on its '
      + `section (one ink one layer). Every other layer keeps its colour, its pen and its place in the order. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/projector.js': {
    why: 'T83 F5: the mirror cabinet\'s rows. `boardLayer`: a `led_stile` on LED_STILE, the kit\'s carcass '
      + '(`meta.mirrorCabinet.role === \'carcass\'`, inside its panels round, touching no side of the outline) on CARCASE; '
      + '`mirror_panel` (the panels round) in SHELL_ROLES as an end panel is; a `mirror_door` carrying its mirror drawn as '
      + 'its leaf with no front style; `mirrorLedBoxes` (the room\'s strips at `derived.mirror.led`) as section-only '
      + 'solids; `mirrorRecessLines` (the wall opening `derived.mirror.recess.wallOpening` where a section\'s or a plan\'s '
      + 'knife meets it) handed to renderScene as the lines that are not a solid\'s. Each is empty or unreached for a unit '
      + `that is not a mirror cabinet, so every sheet of every other job is the line it was. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
