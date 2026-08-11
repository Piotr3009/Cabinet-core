// ─── ZOOM, PAN AND FIT ON A DRAWING (turn 23, CLAUDE.md F7) ─────────────────
//
// Owner: "the part preview in the editor detail is fixed."
//
// It was, and the main CNC sheet has had wheel-zoom-about-the-cursor and
// drag-to-pan since turn 11 with turn 20's capture rule on top. F7 asks for the
// SAME INPUT GRAMMAR in the part detail — so this is that grammar, extracted
// once and consumed by both surfaces rather than typed out a second time. A
// third drawing next turn is one call, and there is no possibility of the two
// zooms behaving differently because there is one of them.
//
// ─── THE GRAMMAR ───────────────────────────────────────────────────────────
//
//   wheel                zoom about the CURSOR, not about the middle — so the
//                        thing you are pointing at stays under the pointer
//   drag                 pan
//   double-click / ⌂     fit to the window
//
// ─── TURN 20'S CAPTURE LAW (CLAUDE.md F9), CARRIED OVER VERBATIM ───────────
//
// The container must NOT call `setPointerCapture` on every press. A captured
// pointer makes the browser compose `click` and `dblclick` on the CAPTURING
// element rather than on the node under the cursor — which is exactly how turn
// 19's double-click on a part died while every walk stayed green. The capture
// is taken only when the gesture has PROVED it is a pan: pointer-down remembers
// the point, the first move past the threshold starts the pan AND takes the
// capture, and a press-and-release under the threshold lets go having captured
// nothing. A click reaches the feature; the pan feels identical.
//
// ─── THE FRAME ─────────────────────────────────────────────────────────────
//
// Everything here is in SVG USER UNITS — whatever the caller's `viewBox`
// speaks. The CNC sheet's are millimetres with y down; the part detail's are
// millimetres with y down too, because its drawing is flipped once by a
// `scale(1 -1)` on the group inside. Neither has to explain itself to this
// file, which is what makes it shared rather than generalised.

import { useCallback, useEffect, useRef, useState } from 'react';

/** How far one wheel notch moves. */
export const ZOOM_STEP = 1.18;

/**
 * The box that shows `content` inside a viewport of this shape.
 *
 * PURE, and exported on its own because it is the whole of "fit to window" and
 * a test should not need a browser to check it.
 *
 * @param {object} content  { x, y, w, h } in user units
 * @param {object} size     { w, h } in px
 * @param {object} limits   { min, max } on the box's WIDTH
 * @returns {{x:number, y:number, w:number}|null}
 */
export function fitBox(content, size, { min = 1, max = Infinity } = {}) {
  if (!content || !(content.w > 0) || !(content.h > 0) || !(size?.w > 1) || !(size?.h > 1)) return null;
  const aspect = size.w / size.h;
  // The wider of "fill the width" and "fill the height at this aspect": the
  // whole of the content has to be inside, whichever way round it is.
  const w = Math.min(max, Math.max(content.w, content.h * aspect, min));
  const h = w / aspect;
  return {
    x: content.x + content.w / 2 - w / 2,
    y: content.y + content.h / 2 - h / 2,
    w,
  };
}

/** The box after one zoom step about an anchor point. Pure. */
export function zoomedBox(box, size, factor, anchor = null, { min = 1, max = Infinity } = {}) {
  if (!box || !(size?.w > 0)) return box;
  const h = box.w * (size.h / size.w);
  const ax = anchor ? anchor.x : box.x + box.w / 2;
  const ay = anchor ? anchor.y : box.y + h / 2;
  const w = Math.min(max, Math.max(min, box.w * factor));
  const k = w / box.w;
  return { x: ax - (ax - box.x) * k, y: ay - (ay - box.y) * k, w };
}

/**
 * Watch an element's size. One ResizeObserver, one piece of state.
 *
 * Both surfaces need it and both had their own copy; a drawing that does not
 * know how big its window is cannot fit to it.
 */
export function useElementSize(ref) {
  const [size, setSize] = useState({ w: 1, h: 1 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.max(1, width), h: Math.max(1, height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/**
 * The whole gesture set, over one SVG element.
 *
 * @param {object} args
 *   svgRef        the <svg> the pointer events are bound to
 *   content       { x, y, w, h } — what "fit" should show
 *   size          { w, h } in px, from useElementSize
 *   min, max      limits on the view's WIDTH in user units
 *   panThreshold  px the pointer must travel before this is a pan (turn 20)
 *   onPanStart    called once when a drag becomes a pan — a surface that shows
 *                 a tooltip puts it away here
 * @returns {{box, viewH, mmPerPx, fit, zoomBy, pointerToWorld, panning, handlers}}
 */
export function useSheetView({
  svgRef, content, size, min = 1, max = Infinity, panThreshold = 4, onPanStart = null,
}) {
  const [box, setBox] = useState(null);

  const fit = useCallback(() => {
    const next = fitBox(content, size, { min, max });
    if (next) setBox(next);
  }, [content, size, min, max]);

  // Re-fit when the CONTENT changes shape — another part, another unit — but
  // never on an ordinary re-render, or a pan would fight the hand that made it.
  const key = content ? `${content.x}|${content.y}|${content.w}|${content.h}` : null;
  const lastKey = useRef(null);
  useEffect(() => {
    if (!key || size.w <= 1) return;
    if (lastKey.current === key && box) return;
    lastKey.current = key;
    fit();
  }, [key, size.w, size.h, fit, box]);

  const mmPerPx = box && size.w > 0 ? box.w / size.w : 1;
  const viewH = box ? box.w * (size.h / size.w) : 1;

  const zoomBy = useCallback((factor, anchor) => {
    setBox((b) => zoomedBox(b, size, factor, anchor, { min, max }));
  }, [size, min, max]);

  const pointerToWorld = useCallback((clientX, clientY) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !box) return null;
    const scale = box.w / rect.width;
    return { x: box.x + (clientX - rect.left) * scale, y: box.y + (clientY - rect.top) * scale };
  }, [box, svgRef]);

  // The wheel must be bound NON-PASSIVELY or the browser refuses
  // `preventDefault` and the page scrolls behind the drawing.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (!box) return;
      e.preventDefault();
      zoomBy(e.deltaY > 0 ? ZOOM_STEP : 1 / ZOOM_STEP, pointerToWorld(e.clientX, e.clientY));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [svgRef, box, zoomBy, pointerToWorld]);

  const pan = useRef(null);
  const [panning, setPanning] = useState(false);

  const onPointerDown = useCallback((e) => {
    if (e.button !== 0 && e.button !== 1) return;
    // ARMED, not panning: nothing is captured and nothing moves yet.
    pan.current = {
      x: e.clientX, y: e.clientY, from: { x: e.clientX, y: e.clientY }, panning: false,
    };
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!pan.current || !box) return;
    if (!pan.current.panning) {
      const moved = Math.hypot(e.clientX - pan.current.from.x, e.clientY - pan.current.from.y);
      if (moved < panThreshold) return;
      pan.current.panning = true;
      setPanning(true);
      onPanStart?.();
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    const scale = box.w / Math.max(1, size.w);
    const dx = (e.clientX - pan.current.x) * scale;
    const dy = (e.clientY - pan.current.y) * scale;
    pan.current = { ...pan.current, x: e.clientX, y: e.clientY };
    setBox((b) => (b ? { ...b, x: b.x - dx, y: b.y - dy } : b));
  }, [box, size.w, panThreshold, onPanStart]);

  const endPan = useCallback((e) => {
    pan.current = null;
    setPanning(false);
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  return {
    box,
    viewH,
    mmPerPx,
    fit,
    zoomBy,
    pointerToWorld,
    panning,
    setBox,
    handlers: {
      onPointerDown, onPointerMove, onPointerUp: endPan, onPointerLeave: endPan, onPointerCancel: endPan,
    },
  };
}
