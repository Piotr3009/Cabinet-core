/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// UX TURN (01.11.2026, in chat) . the engine half of the post merge audit of T-CC2a. No gate, no golden, no cut geometry.
const KODUJ = '*"1 - koduj, 2 - wszystkie"* (the owner, 01.11.2026, 18:04)';
export const GATES = {};
export const LICENSED = {
  'src/engine/projectSettings.js': { why: `B1: a slot counts as set when its board choice resolves to a catalogue entry (via catalogue), so Next is not blocked by a missing stock board; the Stock board selects stay. *"stock board nie usuwaj bo jak ktos nie przypisze materialu to cos musi byc prawda? nie teraz jeszcze"*; ${KODUJ}`, gates: [] },
  'src/engine/thickness.js': { why: `nominalThicknessOfPart: a cut piece mapped back to the NOMINAL of the slot it is cut from, for the catalogue and the BOM only; slotOfPart is partSlotThickness's own slot rule, lifted out unchanged, so the cut (slotThickness, the measured number) does not move. *"tak katalogi i BOM biora to co wybral klient, 18.5 to tylko ciecie dla CNC, nie dla zakupow, to sie nie moze laczyc"* (the owner, 01.11.2026, 18:46)`, gates: [] },
  'src/engine/catalogue.js': { why: `B1: carcassTypeChoice and frontTypeChoice moved here unchanged from materials.js, the one reduction of a slot for the wizard and the cut list. ${KODUJ}`, gates: [] },
  'src/engine/materials.js': { why: `B1: reads carcassTypeChoice and frontTypeChoice from catalogue.js (moved, unchanged); reads nominalThicknessOfPart for the catalogue thickness, never the caliper. *"tak katalogi i BOM biora to co wybral klient, 18.5 to tylko ciecie dla CNC, nie dla zakupow, to sie nie moze laczyc"* (the owner, 01.11.2026, 18:46); ${KODUJ}`, gates: [] },
  'src/engine/bom.js': { why: `B3 and B5: ONE screw line from the 3 mm screw pilots, the hinge cup screws left out; a price of 0 is No price and counts in the incomplete total. *"raczej zostawilbym wkrety jako jeden i wszystkie dziurki 3 mm na wkrety czyli to liczylbym to, z wyjatkiem zawiasow i runnersow"*; ${KODUJ}`, gates: [] },
  'src/engine/bomInvoice.js': { why: `B6: with the company's links the Order tab counts sheets as the purchase list does (each link's size and offcut). ${KODUJ}`, gates: [] },
  'src/engine/spray.js': { why: `B4: the solvent is 5 % of the colour litres AND the primer litres. *"6 - tak"* (the owner, 01.11.2026, 18:04)`, gates: [] },
  'src/lib/exporters.js': { why: `B5: the incomplete words of the BOM PDF and the CSV count the lines without a price too. ${KODUJ}`, gates: [] },
  'src/lib/linkSuggest.js': { why: `Ewa P6 and P8: Accept all by brand from the rows shown; the old link saved back by Undo. *"ok to daj wszystkie propozycje, jak co to bedziemy usuwac"* (the owner, 01.11.2026)`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
