/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T79 F15 · LABEL COLOURS ON THE ENTITY, FOR VCARVE. The handover of 18.10, accepted by the owner at 14:55 (*"ok daj"*):
// *"kolory warstw LABEL_* w VCarve (wariant b, jesli VCarve ignoruje kolory)."*  The LABEL_<unit> layer row already
// carried the cabinet's ACI; now every entity on that layer (the TEXT, the #number, the EDGE arrow polylines) carries
// group 62 = the same ACI on the entity itself. A DXF writer and its reader only: no cut geometry, no golden reaches it
// (no golden is a DXF file and computeCabinet never calls the writer), so there is no gate. A file written without a
// labels plan is byte for byte what it was (test/turn79-f15-label-colour.test.js pins the pre-change bytes).

export const LICENSED = {
  'src/engine/cnc/dxf.js': {
    why: 'T79 F15 (handover 18.10, owner 14:55 "ok daj": "kolory warstw LABEL_* w VCarve (wariant b, jesli VCarve '
      + 'ignoruje kolory)"): writeDxf writes an entity\'s own `color` as group 62 after its layer on every record it '
      + 'writes (POLYLINE, VERTEX, SEQEND, CIRCLE, ARC, TEXT); panelEntities gives every entity on the cabinet\'s text '
      + 'layer the label\'s `aci`; labelAciOf is the one colour index labelLayerRow and labelFor both carry; parseDxf '
      + 'reads an entity\'s 62 as `color`. Drawing and export only, cannot reach a cut; without a labels plan no entity '
      + 'carries a colour and every file is the bytes it was (asserted)',
    gates: [],
    drawing: true,
  },
};
