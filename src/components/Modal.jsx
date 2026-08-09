import {
  useCallback, useEffect, useLayoutEffect, useRef, useState,
} from 'react';
import { clampToViewport, placeBesideAnchor } from '../lib/menuPlacement.js';
import { getCabinetProfile } from '../engine/profile.js';

// ─── THE MODAL SHELL (turn 12, CLAUDE.md rule 15 / F2) ──────────────────────
//
// Rule 15 is the one the owner marked PERMANENT — "na zawsze". Every modal in
// this application is
//
//   (a) DRAGGABLE by its header, and
//   (b) opened BESIDE the object it concerns — never covering it.
//
// It is implemented ONCE, here, and every modal in the app is routed through
// it. That is deliberate and it is the whole point of the phase: turn 11 had
// three different answers to "where does a floating panel go" — a centred
// dialog with a backdrop, a card placed by the context-menu clamp, and a menu
// that placed itself — and a fourth would have arrived with the next feature.
// A future modal that does not use this shell is a bug, not a variation.
//
// WHAT IT DOES NOT DO is change what a modal CONTAINS. The API that turn 3
// wrote — `title`, `onClose`, `children`, `footer`, `width` — is unchanged, so
// every existing caller keeps working and gains the behaviour for free. What
// is new is one optional prop:
//
//   anchor   { x, y, width, height } in client px — the OBJECT. A click point
//            is a rectangle of zero size, so "beside the cabinet I right-
//            clicked" and "beside the menu entry I chose" are the same call.
//
// Left out, the modal centres itself as it always did — that is the honest
// answer for a dialog about the whole project (Auth, Save as) which concerns
// no object on the screen. It is still draggable, because a joiner who wants
// to see what is behind a dialog should be able to push it aside.
//
// The dragged position is remembered FOR AS LONG AS THE MODAL IS OPEN and no
// longer. Nothing is persisted: where a panel was pushed to in order to look at
// one cabinet is not a preference, and a modal that opened in yesterday's
// corner rather than beside today's object would be the rule broken by memory.

/**
 * @param {object} props
 *   title     the header text — also the drag handle
 *   onClose   Escape, the ×, and a pointer-down outside
 *   footer    the buttons row, rendered under a rule
 *   width     a Tailwind width class, as before
 *   anchor    { x, y, width, height } | null — the object this is about
 *   prefer    'right' | 'left' | 'below' | 'above' — a first choice of side
 *   dim       darken everything behind it. Defaults to FALSE when there is an
 *             anchor: a modal that dims the cabinet it is about is covering it
 *             with grey instead of with itself, which is the same offence.
 *   className extra classes for the panel
 */
export default function Modal({
  title, onClose, children, footer, width = 'w-[420px]',
  anchor = null, prefer = null, dim = null, className = '',
}) {
  const box = useRef(null);
  // `null` until the first layout pass has MEASURED the panel. Until then it is
  // rendered invisible — a modal drawn at a guessed position first would flash
  // across the screen before it corrected itself, which turn 11 already learnt
  // with the right-click menu.
  const [at, setAt] = useState(null);
  // Once the header has been grabbed the shell stops re-placing the panel: the
  // hand outranks the arithmetic until the modal is closed.
  const placed = useRef(false);

  const { gapPx, marginPx } = getCabinetProfile().ui.modal;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const measure = useCallback(() => {
    const el = box.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }, []);

  const place = useCallback(() => {
    const size = measure();
    if (!size) return;
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    if (!anchor) {
      // No object: the middle of the screen, which is where a dialog about the
      // whole project belongs.
      setAt({
        ...clampToViewport({
          left: (viewport.width - size.width) / 2,
          top: (viewport.height - size.height) / 2,
          size,
          viewport,
          margin: marginPx,
        }),
        side: 'centre',
        fits: true,
      });
      return;
    }
    setAt(placeBesideAnchor({
      anchor, size, viewport, gap: gapPx, margin: marginPx, prefer,
    }));
  }, [anchor, prefer, gapPx, marginPx, measure]);

  // Placed on the way in, and re-placed if the window is resized — a modal
  // pinned to a corner that is no longer there is a modal you cannot close.
  useLayoutEffect(() => {
    if (placed.current) return undefined;
    place();
    const onResize = () => { if (!placed.current) place(); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [place]);

  // ─── (a) DRAGGABLE BY ITS HEADER ───
  // The same gesture the right-click menu has: grab the bar, and the panel goes
  // where it is put — clamped to the viewport, never flipped, because the hand
  // is holding its top-left corner and flipping it would snatch it away.
  const startDrag = (e) => {
    const el = box.current;
    if (!el || e.button !== 0) return;
    // Not on the × — a close button inside a drag handle has to stay a button.
    if (e.target.closest('button')) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = el.getBoundingClientRect();
    const grab = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const size = { width: rect.width, height: rect.height };
    placed.current = true;

    const move = (ev) => setAt((prev) => ({
      ...(prev || {}),
      ...clampToViewport({
        left: ev.clientX - grab.x,
        top: ev.clientY - grab.y,
        size,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      }),
      dragged: true,
    }));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const darken = dim == null ? !anchor : dim;

  return (
    <div
      className={`fixed inset-0 z-40 ${darken ? 'bg-black/45' : ''}`}
      onPointerDown={onClose}
    >
      <div
        ref={box}
        role="dialog"
        aria-label={typeof title === 'string' ? title : undefined}
        data-modal-shell="1"
        data-modal-side={at?.side || ''}
        className={`fixed cc-panel ${width} max-h-[90vh] flex flex-col shadow-xl ${className}`}
        style={{
          left: at?.left ?? 0,
          top: at?.top ?? 0,
          visibility: at ? 'visible' : 'hidden',
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center px-4 py-2.5 border-b border-shell-600 cursor-move select-none"
          title="Drag to move this window"
          data-modal-handle="1"
          onPointerDown={startDrag}
        >
          <h2 className="text-sm text-ink-50">{title}</h2>
          <span className="flex-1" />
          <button type="button" className="cc-btn-ghost" title="Close (Esc)" onClick={onClose}>×</button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-4 py-3 border-t border-shell-600 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
