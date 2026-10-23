/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F8 · ONE INK, ONE LAYER. The owner, 22.10.2026 (22:56): *"5 zostaw nasze, tylko dodaj brakujace (kazdy kolor zrob
// inny layer)"*; *"6 nie export do dxf, zrob layery wedlug cabinet core"*. Every existing layer keeps its colour and
// its pen; HINGE_MARK, WORKTOP, XRAY_FRONT, XRAY_CARCASE, MASK and FRAME_BOARD are added, each its own colour, and
// a layer that fills names its fill. The SVG paints one group per layer in the table's pen order and the PDF makes
// each layer one named optional content group. Drawing modules and the PDF writer only: computeCabinet reads none
// of them, the CNC sheets and the DXF writer are untouched.

const OWNER = '*"5 zostaw nasze, tylko dodaj brakujace (kazdy kolor zrob inny layer)"* (22.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/engine/drawings/layers.js': {
    why: `T81 F8: six layers added (HINGE_MARK, WORKTOP, XRAY_FRONT, XRAY_CARCASE, MASK, FRAME_BOARD), each its own `
      + `colour, their fills on the table; LAYER_ORDER and layerGroups, the pen order every renderer paints in. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/svg.js': {
    why: `T81 F8: the SVG is one <g data-layer> group per layer in the pen order; a face with openings is drawn `
      + `even-odd; the painter's white says data-fill="mask". ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/projector.js': {
    why: `T81 F8: the fills come from the layer table; a slab drawn as its tinted rect takes no white of its own. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/setPlan.js': {
    why: `T81 F8: the worktop on the plans is on the WORKTOP layer, its fill the layer's. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/setSheet.js': {
    why: `T81 F8: the set's legend names the inks T81 added. ${OWNER}`,
    gates: [],
  },
  'src/lib/drawingExport.js': {
    why: `T81 F8: the PDF paints the layers in the pen order, each one named optional content group; the set's DXF `
      + `files leave the painter's white out (a fill with no outline, as dxf.js leaves every fill). ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
