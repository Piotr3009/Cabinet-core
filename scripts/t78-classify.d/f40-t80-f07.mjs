/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T80 F7 · THE END PANEL REACHES THE FRAME. The owner, 21.10.2026 (22:40): *"2 na styk"*: the panel stays butted to the
// side; under in-frame it runs to the frame's face (D + 25) and as tall as the frame (19 over the carcass top; a wall
// unit's also 19 under its bottom), KIT_INFRAME.lsp D14 (inframe-end-panel-depth, inframe-end-panel-grow). The site
// trim of 19.10 is added after it, as today (engine/siteTrim.js and KIT_SITE_TRIM.lsp untouched). Only a unit the F3
// gate `inframe` opens; a lay-on panel is what it was.

const OWNER = '*"2 na styk"* (21.10.2026, 22:40)';

export const GATES = {};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: `T80 F7: under params.inframe the end panel's depth is endBack + D + frameT (inframe endPanelDepth) and its `
      + `height grows by inframe endPanelGrow (19 at the top; a wall unit's 19 at the bottom too), the drop as cut in `
      + `meta.below_mm. ${OWNER}`,
    gates: ['inframe'],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
