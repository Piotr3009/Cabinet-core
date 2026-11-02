/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// THE RIGHT-CLICK MENU TURN (the owner's boards, 01.11.2026): which hand opens
// the menu and which hand adds a cabinet to the selection, on each machine.
//
// J3 · MAC. *"Na Macu Ctrl + klik to menu, nie zaznaczanie."* On a Mac the
// system itself turns Ctrl+click into a right click, so Ctrl cannot also mean
// "add this one": only Cmd (metaKey) adds there, and Ctrl+click opens the menu
// and nothing else. Windows and Linux are as they were: Ctrl (or the Windows
// key, as before) adds. Shift keeps its one meaning (a free panel off the
// wall) and gains none.
//
// J4 · IPAD. *"Przytrzymaj palec 0,5 s na szafce: kolko sie zapelnia i menu sie
// otwiera."* A finger or a pen held still on a cabinet for half a second opens
// the same menu at the finger; a finger that travels (8 px or more), lifts, is
// cancelled, or is joined by a second finger (a pinch) opens nothing, so a
// normal tap stays a tap and a drag stays a drag.
//
// Pure where it can be: the platform is read off a navigator that may be passed
// in, and the long press listens on a target that may be passed in, with timers
// that may be passed in, so test/menu-ui.test.js runs it in node as written.

/** How long a finger is held still before the menu opens (the board: 0,5 s). */
export const LONG_PRESS_MS = 500;
/** How far a held finger may wander and still be holding still (px). */
export const LONG_PRESS_SLOP_PX = 8;

/**
 * Is this an Apple machine, where Ctrl+click is the right click? A Mac, and an
 * iPad (which since iPadOS 13 names itself "MacIntel", and before it "iPad").
 *
 * @param {object} [nav]  a navigator; the browser's own when none is given
 * @returns {boolean}
 */
export function isMacLike(nav = globalThis.navigator) {
  if (!nav) return false;
  const platform = String(nav.userAgentData?.platform || nav.platform || '');
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/** A modifier, read off the NATIVE event first (react-three-fiber's own event leaves them behind). */
function held(native, e, key) {
  return Boolean(native?.[key] || e?.[key]);
}

/**
 * Does this press ADD to the selection (or take a cabinet out of it)?
 * Mac: Cmd only. Windows and Linux: Ctrl or the meta key, exactly as before.
 *
 * @param {object} native  the DOM event (`e.nativeEvent || e`)
 * @param {object} [e]     the event the handler was given
 * @param {boolean} [mac]  the platform; `isMacLike()` when not given
 */
export function additiveClick(native, e = native, mac = isMacLike()) {
  if (mac) return held(native, e, 'metaKey');
  return held(native, e, 'ctrlKey') || held(native, e, 'metaKey');
}

/**
 * Is this left press the Mac's Ctrl+click, which the system is about to turn
 * into a right click? Then the press itself must do nothing (no tick, no drag):
 * the context menu event that follows it opens the menu.
 */
export function menuOnlyClick(native, e = native, mac = isMacLike()) {
  return Boolean(mac) && held(native, e, 'ctrlKey') && !held(native, e, 'metaKey');
}

/** A finger or a pen: the presses a long press listens for. A mouse has its right button. */
export function isTouchPress(native) {
  const kind = native?.pointerType;
  return kind === 'touch' || kind === 'pen';
}

/** The pointers a long press is armed on right now, so the boards behind the touched one do not arm a second. */
const armed = new Set();

/**
 * Arm a long press. `onFire({ x, y })` runs once, after `delay` ms, if the same
 * pointer has neither travelled `slop` px nor ended, and no other pointer has
 * come down meanwhile. Returns `stop`, which disarms it (and is safe to call twice).
 *
 * @param {object} args
 *   x, y        where the press went down, in client px
 *   pointerId   the press's pointer (null when the event carries none)
 *   onFire      what the hold opens
 *   target      where the pointer is listened to (the window)
 *   delay, slop LONG_PRESS_MS and LONG_PRESS_SLOP_PX unless given
 *   timers      { set, clear } (setTimeout and clearTimeout unless given)
 */
export function startLongPress({
  x, y, pointerId = null, onFire, target = globalThis.window,
  delay = LONG_PRESS_MS, slop = LONG_PRESS_SLOP_PX,
  timers = { set: (fn, ms) => setTimeout(fn, ms), clear: (t) => clearTimeout(t) },
}) {
  const key = pointerId ?? 'pointer';
  if (!target || armed.has(key)) return () => {};
  armed.add(key);
  let done = false;
  let timer = null;
  const same = (ev) => pointerId == null || ev?.pointerId == null || ev.pointerId === pointerId;
  const onMove = (ev) => {
    if (!same(ev)) return;
    if (Math.hypot((Number(ev.clientX) || 0) - x, (Number(ev.clientY) || 0) - y) >= slop) stop();
  };
  const onEnd = (ev) => { if (same(ev)) stop(); };
  // A second finger coming down is a pinch or a two finger pan: never a hold.
  const onOther = (ev) => { if (!same(ev)) stop(); };
  function stop() {
    if (done) return;
    done = true;
    armed.delete(key);
    if (timer !== null) timers.clear(timer);
    target.removeEventListener('pointermove', onMove);
    target.removeEventListener('pointerup', onEnd);
    target.removeEventListener('pointercancel', onEnd);
    target.removeEventListener('pointerdown', onOther);
  }
  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerup', onEnd);
  target.addEventListener('pointercancel', onEnd);
  target.addEventListener('pointerdown', onOther);
  timer = timers.set(() => {
    if (done) return;
    stop();
    onFire?.({ x, y });
  }, delay);
  return stop;
}

/**
 * After a long press has opened the menu, the finger still has to come off the
 * glass, and the browser may answer that with a click. The click is not the
 * joiner's: it is swallowed (at the window, before the scene sees it), once,
 * in the moment after the finger lifts. A click that never comes leaves
 * nothing behind: the guard goes `after` ms after the lift, or after `limit` ms
 * whatever happens.
 *
 * @returns {() => void}  removes the guard early
 */
export function swallowClickAfterRelease({
  target = globalThis.window, after = 400, limit = 5000,
  timers = { set: (fn, ms) => setTimeout(fn, ms), clear: (t) => clearTimeout(t) },
} = {}) {
  if (!target) return () => {};
  let gone = false;
  let soon = null;
  const eat = (ev) => {
    ev?.stopImmediatePropagation?.();
    ev?.stopPropagation?.();
    ev?.preventDefault?.();
    remove();
  };
  const lifted = () => { if (soon === null) soon = timers.set(remove, after); };
  const cap = timers.set(remove, limit);
  function remove() {
    if (gone) return;
    gone = true;
    timers.clear(cap);
    if (soon !== null) timers.clear(soon);
    target.removeEventListener('click', eat, true);
    target.removeEventListener('pointerup', lifted, true);
  }
  target.addEventListener('click', eat, true);
  target.addEventListener('pointerup', lifted, true);
  return remove;
}

/** A finger-first screen (an iPad, a phone): the "Select several" switch is offered there. */
export function isTouchLike(win = globalThis.window) {
  try {
    return Boolean(win?.matchMedia?.('(pointer: coarse)')?.matches);
  } catch {
    return false;
  }
}
