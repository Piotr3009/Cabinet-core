/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT FIX 26.10.2026 · THE TYPED DOOR WIDTH STAYS, THE OTHERS GIVE WAY ──
//
// The owner, 26.10.2026, on the mirror cabinet of T83 (PR #82): 08:57
// *"dlaczego jak zmieniam szerokosc drzwi 1 z 3 to nie zmienia sie reszta
// tylko wyskakuje blad? proste powinno sie przeliczac"*; 09:02 *"jesli
// uzytkownik zmienil to ten numer juz sie nie moze zmieniac, wtedy zmieniamy
// tylko te ktore nie byly ruszane"*; 09:03 *"program odmawia ostatniej liczby
// bez sensu, musi zostawic"*. LISP first: KIT_MIRROR.lsp D5a and the constant
// mirrorMinDoor (profile.mirror.minDoorMm, PROPOSED 100). The engine's
// mirror-balance-widths is pure; the store's `door_width` holds the door
// typed and balances the rest; `door_free` lets a hold go; the panel marks a
// held door with a lock. The kit itself still cuts only widths that fill
// the carcass (D5): it never sees a list that does not.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getCabinetProfile } from '../src/engine/profile.js';
import { mirrorBalanceWidths } from '../src/engine/mirrorCabinet.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const P = getCabinetProfile();
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const M = (id) => S().unitResult(id).derived.mirror;
const sum = (a) => Math.round(a.reduce((t, v) => t + v, 0) * 100) / 100;
const MIN = P.mirror.minDoorMm;

function cabinet() {
  S().newProject('mirror widths');
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  return S().addUnit('MIRROR_CABINET', { wall: 0, x: 1000 }).id;
}
/** The carcass less the stiles: what the doors share. */
const roomOf = (id) => M(id).carcass.w - M(id).stiles.reduce((t, s) => t + s.w, 0);

// ═══ 1 · THE ENGINE'S ARITHMETIC ═════════════════════════════════════════════

test('CHAT FIX 26.10 · the typed door keeps its number, the untouched doors share the rest equally', () => {
  let r = mirrorBalanceWidths(1200, 3, [330, 480, 330], [], 0, 300, MIN);
  assert.deepEqual(r, { widths: [300, 450, 450], order: [0], freed: [], refused: null });
  r = mirrorBalanceWidths(1200, 3, r.widths, r.order, 1, 500, MIN);
  assert.deepEqual(r.widths, [300, 500, 400], 'door 1 held at 300, door 2 typed 500, door 3 takes the rest');
  assert.deepEqual(r.order, [0, 1]);
  // To the tenth of a millimetre, the last free door taking the rest: the sum exact.
  r = mirrorBalanceWidths(1198, 3, [330, 480, 330], [], null, null, MIN);
  assert.deepEqual(r.widths, [399.3, 399.3, 399.4]);
  assert.equal(sum(r.widths), 1198);
});

test('CHAT FIX 26.10 · every door held: the one typed longest ago gives way, said; the number just typed never does', () => {
  let r = mirrorBalanceWidths(1200, 3, [300, 500, 400], [0, 1], 2, 200, MIN);
  assert.deepEqual(r, { widths: [500, 500, 200], order: [1, 2], freed: [0], refused: null });
  // Typed again: door 2 is now the longest held and gives way.
  r = mirrorBalanceWidths(1200, 3, r.widths, r.order, 0, 450, MIN);
  assert.deepEqual(r.widths, [450, 550, 200]);
  assert.deepEqual(r.freed, [1]);
  // Two doors, both held, the sum right: nothing moves, nothing set free.
  r = mirrorBalanceWidths(1200, 2, [600, 600], [0, 1], null, null, MIN);
  assert.deepEqual(r, { widths: [600, 600], order: [0, 1], freed: [], refused: null });
});

test('CHAT FIX 26.10 · the one refusal left: a width that alone leaves the other doors less than the minimum, with the most it can be', () => {
  const r = mirrorBalanceWidths(1200, 3, [330, 480, 330], [], 0, 1300, MIN);
  assert.equal(r.refused, `door 1 at 1300 leaves the other doors less than ${MIN}: ${1200 - 2 * MIN} is the most it can be.`);
  assert.equal(r.most, 1200 - 2 * MIN);
  const most = mirrorBalanceWidths(1200, 3, [330, 480, 330], [], 0, 1200 - 2 * MIN, MIN);
  assert.deepEqual(most.widths, [1200 - 2 * MIN, MIN, MIN], 'at the most, the others at the minimum');
  // One bay: the one door is the carcass less the stiles.
  assert.match(mirrorBalanceWidths(1200, 1, [1200], [], 0, 900, MIN).refused, /^the one door is the carcass less the stiles: 1200\.$/);
  // A free door under the minimum sets a held one free rather than cutting a sliver.
  // Door 2 alone set free would be 50: door 1 is set free too, and the two share.
  const sliver = mirrorBalanceWidths(1200, 3, [1000, 100, 100], [1, 0], 2, 150, MIN);
  assert.deepEqual(sliver, { widths: [525, 525, 150], order: [2], freed: [1, 0], refused: null });
});

// ═══ 2 · THE STORE: ONE DOOR TYPED, HELD ═════════════════════════════════════

test('CHAT FIX 26.10 · setMirrorCabinet door_width: the door typed is held and the rest give way, the kit cuts the sum, every step one answer', () => {
  const mc = cabinet();
  const room = roomOf(mc);
  const own = M(mc).doorWidths;
  assert.deepEqual(own, P.mirror.defaults.doorWidths, 'born at the kit\'s own');
  // Door 2 typed 400: 1 and 3 share the rest.
  let res = S().setMirrorCabinet(mc, { door_width: { bay: 1, mm: 400 } });
  assert.equal(res.ok, true, res.said);
  assert.equal(res.said, '', 'nothing set free, nothing said');
  assert.deepEqual(M(mc).doorWidths, [(room - 400) / 2, 400, (room - 400) / 2]);
  assert.deepEqual(M(mc).doorWidthsHeld, [1]);
  assert.deepEqual(U(mc).params.mirror.door_widths_order, [1]);
  assert.equal(M(mc).widthsRefused, false, 'the kit saw widths that fill');
  // Door 1 typed 300: door 2 stays 400, door 3 takes the rest.
  res = S().setMirrorCabinet(mc, { door_width: { bay: 0, mm: 300 } });
  assert.equal(res.ok, true);
  assert.deepEqual(M(mc).doorWidths, [300, 400, room - 700]);
  assert.deepEqual(M(mc).doorWidthsHeld, [1, 0]);
  // The doors in the cut: the typed width less the gap, as D4 has it.
  const doors = S().unitResult(mc).panels.filter((p) => p.role === 'mirror_door').map((p) => p.w);
  assert.deepEqual(doors, [300 - P.doors.gap, 400 - P.doors.gap, room - 700 - P.doors.gap]);
  // Door 3 typed too: every door held, door 2 (held longest) gives way, said.
  res = S().setMirrorCabinet(mc, { door_width: { bay: 2, mm: 350 } });
  assert.equal(res.ok, true);
  assert.deepEqual(M(mc).doorWidths, [300, room - 650, 350]);
  assert.equal(res.said, `MC01: door 2 gave way to door 3: the doors are 300 + ${room - 650} + 350.`);
  assert.deepEqual(M(mc).doorWidthsHeld, [0, 2]);
  // The last number is never refused for the sum's sake: only for leaving the others nothing.
  res = S().setMirrorCabinet(mc, { door_width: { bay: 1, mm: room } });
  assert.equal(res.ok, false);
  assert.equal(res.said, `MC01: door 2 at ${room} leaves the other doors less than ${MIN}: ${room - 2 * MIN} is the most it can be.`);
  assert.deepEqual(M(mc).doorWidths, [300, room - 650, 350], 'refused: nothing moved');
  // A door that is not: refused in words.
  assert.match(S().setMirrorCabinet(mc, { door_width: { bay: 3, mm: 300 } }).said, /^MC01: door 4: this cabinet has 3 doors\.$/);
  assert.match(S().setMirrorCabinet(mc, { door_width: { bay: 0, mm: '' } }).said, /^MC01: type one door's width in mm, the door named\.$/);
});

test('CHAT FIX 26.10 · door_free lets a hold go and moves nothing; Kit\'s widths and a new count of bays forget every hold', () => {
  const mc = cabinet();
  const room = roomOf(mc);
  S().setMirrorCabinet(mc, { door_width: { bay: 0, mm: 300 } });
  S().setMirrorCabinet(mc, { door_width: { bay: 1, mm: 500 } });
  assert.deepEqual(M(mc).doorWidths, [300, 500, room - 800]);
  let res = S().setMirrorCabinet(mc, { door_free: 0 });
  assert.equal(res.ok, true);
  assert.deepEqual(M(mc).doorWidths, [300, 500, room - 800], 'the widths stand');
  assert.deepEqual(M(mc).doorWidthsHeld, [1], 'door 1 free again');
  // Now door 3 typed: door 1, free, gives way; door 2 stays.
  res = S().setMirrorCabinet(mc, { door_width: { bay: 2, mm: 300 } });
  assert.deepEqual(M(mc).doorWidths, [room - 800, 500, 300]);
  assert.equal(res.said, '', 'a free door giving way is not "set free"');
  assert.match(S().setMirrorCabinet(mc, { door_free: 0 }).said, /^MC01: door 1 is not held\.$/);
  // Kit's widths: the drawing's and no hold.
  assert.equal(S().setMirrorCabinet(mc, { door_widths: null }).ok, true);
  assert.deepEqual(M(mc).doorWidths, P.mirror.defaults.doorWidths);
  assert.deepEqual(M(mc).doorWidthsHeld, []);
  assert.equal(U(mc).params.mirror.door_widths_order, null);
  // A new count of bays: no hold either.
  S().setMirrorCabinet(mc, { door_width: { bay: 0, mm: 300 } });
  assert.equal(S().setMirrorCabinet(mc, { bays: 2 }).ok, true);
  assert.deepEqual(M(mc).doorWidthsHeld, []);
  assert.equal(M(mc).doorWidths.length, 2);
  // The list typed whole holds no door (the T83 F5 road, unchanged).
  assert.equal(S().setMirrorCabinet(mc, { door_widths: [500, roomOf(mc) - 500] }).ok, true);
  assert.deepEqual(M(mc).doorWidthsHeld, []);
});

test('CHAT FIX 26.10 · the stiles or the panels moved under held doors: the held stay, the free give way, said; the kit\'s own only when nothing can', () => {
  const mc = cabinet();
  S().setMirrorCabinet(mc, { door_width: { bay: 1, mm: 500 } });
  const before = M(mc).doorWidths;
  // The stiles 75 to 50: the carcass less the stiles grows by 50, doors 1 and 3 take 25 each.
  let res = S().setMirrorCabinet(mc, { stile_width_mm: 50 });
  assert.equal(res.ok, true);
  assert.deepEqual(M(mc).doorWidths, [before[0] + 25, 500, before[2] + 25]);
  assert.equal(res.said, `MC01: the doors give way to the stiles and the panels: ${M(mc).doorWidths.join(' + ')}.`);
  assert.deepEqual(M(mc).doorWidthsHeld, [1]);
  // Door 1 and door 3 typed too: the third typing sets door 2 (held longest) free; it is the free one from then on.
  S().setMirrorCabinet(mc, { door_width: { bay: 0, mm: 350 } });
  res = S().setMirrorCabinet(mc, { door_width: { bay: 2, mm: 350 } });
  assert.match(res.said, /^MC01: door 2 gave way to door 3: /);
  assert.deepEqual(M(mc).doorWidthsHeld, [0, 2]);
  const held = M(mc).doorWidths;
  res = S().setMirrorCabinet(mc, { stile_width_mm: 75 });
  assert.equal(res.ok, true);
  assert.deepEqual(M(mc).doorWidths, [held[0], held[1] - 50, held[2]], 'door 2, free, gave the 50');
  assert.equal(res.said, `MC01: the doors give way to the stiles and the panels: ${M(mc).doorWidths.join(' + ')}.`);
  // Every door held (door 2 typed as it stands plus one) and the stiles moved: door 1, held longest, is set free, said.
  S().setMirrorCabinet(mc, { door_width: { bay: 1, mm: M(mc).doorWidths[1] + 1 } });
  assert.deepEqual(M(mc).doorWidthsHeld, [2, 1], 'door 1, held longest, gave way to door 2 and is held no more');
  S().setMirrorCabinet(mc, { door_width: { bay: 0, mm: M(mc).doorWidths[0] } });
  assert.deepEqual(M(mc).doorWidthsHeld, [2, 1, 0], 'every door held, the sum as it stands');
  const first = M(mc).doorWidthsHeld[0];
  res = S().setMirrorCabinet(mc, { stile_width_mm: 60 });
  assert.equal(res.ok, true);
  assert.match(res.said, new RegExp(`\\(door ${first + 1} set free\\)\\.$`));
  assert.equal(M(mc).doorWidthsHeld.includes(first), false);
  // Stiles so wide that even every door set free leaves no door the minimum: the kit's own, said as T83 F5 says it.
  const wideRes = S().setMirrorCabinet(mc, { stile_width_mm: 500 });
  assert.equal(wideRes.ok, true);
  assert.match(wideRes.said, /no longer make the carcass with the stiles: the doors are back to the kit's own widths\.$/);
  assert.equal(U(mc).params.mirror.door_widths, null);
});

// ═══ 3 · THE PANEL AND THE LAW ═══════════════════════════════════════════════

test('CHAT FIX 26.10 · the panel: one door typed is door_width, a held door wears a lock that sets it free; the LISP carries D5a and the profile its number', () => {
  const src = read('src/components/RightPanel.jsx');
  const body = src.slice(src.indexOf('function MirrorCabinetSection'));
  assert.ok(body.includes('answer({ door_width: { bay: i, mm: v } })'), 'one door typed, one answer');
  assert.ok(body.includes('answer({ door_free: i })'), 'the lock set free');
  assert.doesNotMatch(body, /answer\(\{ door_widths: next \}\)/, 'the panel no longer hands the list whole');
  assert.doesNotMatch(body, /setDraft/, 'no refused width waits in its field: nothing typed is refused for the sum');
  for (const hook of ['data-mirror-door-held', 'data-mirror-door-free', 'mirror.doorWidthsHeld']) assert.ok(body.includes(hook), hook);
  assert.doesNotMatch(body, /[–—]/);
  const lisp = read('reference/lisp/KIT_MIRROR.lsp');
  assert.match(lisp, /^;;; D5a THE TYPED WIDTH STAYS, THE UNTOUCHED DOORS GIVE WAY/m);
  assert.match(lisp, /program odmawia ostatniej liczby bez sensu, musi zostawic/);
  assert.match(lisp, /^\(defun mirrorMinDoor \( \/ \) 100\.0\)$/m);
  assert.equal(P.mirror.minDoorMm, 100);
  const store = read('src/stores/projectStore.js');
  assert.match(store, /mirrorBalanceWidths\(room, mp\.bays, stand, mp\.doorWidthsOrder, i, Number\(ask\.door_width\.mm\), K\.minDoor\)/, 'the store balances with the profile\'s minimum, no number of its own');
});
