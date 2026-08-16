import {
  useCallback, useEffect, useLayoutEffect, useRef, useState,
} from 'react';
import { clampToViewport, maximiseInViewport, placeAnchoredModal } from '../lib/menuPlacement.js';
import { getCabinetProfile } from '../engine/profile.js';
import { LAYER_CLASS } from '../lib/modalLayer.js';
import { useUiStore } from '../stores/uiStore.js';

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
 *   prefer    'right' | 'left' | 'below' | 'above' — turn 12's first choice of
 *             side. Kept so no caller breaks; turn 19's rule (F3) opens up and
 *             to the right of the object instead, and only falls back to the
 *             four-side search when neither hand has room.
 *   dim       darken everything behind it. Defaults to FALSE when there is an
 *             anchor: a modal that dims the cabinet it is about is covering it
 *             with grey instead of with itself, which is the same offence.
 *   className extra classes for the panel
 *   maximised open near-fullscreen (turn 13, F2.1 — rule 15's one sanctioned
 *             exception, for a window that is a WORKSPACE rather than a side
 *             dialog). It is the INITIAL state, not a lock: the header carries
 *             a restore button, and a restored window is an ordinary modal
 *             again — placed beside its object, dragged by its header.
 *   onMaximisedChange
 *             told when that toggles, so a workspace can lay itself out for the
 *             room it has — the shell decides the WINDOW, the content decides
 *             what to do with it.
 *   name      turn 31, F1. WHICH modal this is — the registry key from
 *             lib/modalLayer.js. Stamped on the panel as `data-modal-name` so
 *             the shell contract can be checked from outside (a browser walk
 *             can ask "is the thing on screen a shell window, and which"),
 *             and left out only by a window that has no registry entry.
 *   onBack    turn 23, F1. This window is a NESTED editor surface and there is
 *             a level under it. Given, the shell renders ← Back beside the
 *             title and Escape means BACK ONE LEVEL rather than close-
 *             everything. The × and the footer's Done still close the lot.
 *             Left out — every dialog in the app, and the top of any stack —
 *             nothing changes at all.
 *   backLabel what it goes back TO, for the button's tooltip.
 */
export default function Modal({
  title, onClose, children, footer, width = 'w-[420px]',
  anchor = null, prefer = null, dim = null, className = '', maximised = false,
  onMaximisedChange = null, onBack = null, backLabel = '', name = '',
  // ─── TURN 33 (CLAUDE.md F1): A TOOL PANEL WORKS THE SCENE ─────────────────
  // `sticky` = this window is a placement TOOL, not a dialog about one thing:
  // pointer-downs OUTSIDE it pass through to the scene (the owner's lighting
  // flow — "click a shelf while the panel stands open" — cannot exist under a
  // wrapper that eats the click and closes the window). Escape and the ×
  // still close it; everything else of the shell — the anchor, the drag, the
  // registry — is exactly the same shell.
  sticky = false,
}) {
  const box = useRef(null);
  // ─── TURN 31 (CLAUDE.md F1): ONE CLOSE PATH ────────────────────────────────
  // Every window in the app closes through the store's `closeModal`, and the
  // shell now knows that rather than each caller having to remember it. A
  // window with a close of its OWN — the new-project flow, which cancels a
  // local flow rather than a store modal — still passes one, and it wins. What
  // is gone is the third possibility: a modal with no close path at all, which
  // Escape and the × both fell through.
  const closeModal = useUiStore((s) => s.closeModal);
  const close = onClose || closeModal;
  // `null` until the first layout pass has MEASURED the panel. Until then it is
  // rendered invisible — a modal drawn at a guessed position first would flash
  // across the screen before it corrected itself, which turn 11 already learnt
  // with the right-click menu.
  const [at, setAt] = useState(null);
  // Once the header has been grabbed the shell stops re-placing the panel: the
  // hand outranks the arithmetic until the modal is closed.
  const placed = useRef(false);
  const [big, setBig] = useState(Boolean(maximised));
  // A maximised window is sized by the VIEWPORT, so it has to be re-sized when
  // the viewport changes — unlike a placed one, which only needs re-placing
  // until somebody grabs it.
  const [screen, setScreen] = useState(() => (typeof window === 'undefined'
    ? { width: 0, height: 0 }
    : { width: window.innerWidth, height: window.innerHeight }));

  const {
    gapPx, marginPx, maximiseMarginPx, anchorOffset,
  } = getCabinetProfile().ui.modal;

  // ─── Turn 23 (CLAUDE.md F1.2): ESCAPE IS BACK, WHERE THERE IS A BACK ──────
  // "Esc = Back (one level), not close-everything." One listener, in the shell,
  // so no nested view has to argue with the modal's own handler — which is
  // exactly the class of duplicate the stack exists to kill.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') (onBack || close)(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, onBack]);

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
    // ─── Turn 19 (CLAUDE.md F3 / W37) ───
    // "Klikam na drzwi, a modal mi się otwiera na drzwiach." The shell used to
    // open BESIDE the object, which for a double-click ON one means a
    // millimetre from the pointer — on the door. It opens UP AND TO THE RIGHT
    // of it now, by a profile offset plus its own height, and the arithmetic
    // that guarantees it never comes back over the object is one pure function
    // (lib/menuPlacement.js `placeAnchoredModal`). ONE SHELL: the cabinet
    // editor, the element detail, the hinge modal and every colour picker
    // inherit it here and nowhere else.
    //
    // `prefer` is no longer consulted: it named one of the four SIDES, and the
    // rule no longer starts from a side. It is still accepted so no caller
    // breaks, and a caller that needs the old search still gets it — that is
    // exactly what `placeAnchoredModal` falls through to when neither hand has
    // room.
    setAt(placeAnchoredModal({
      anchor, size, viewport, offset: anchorOffset, gap: gapPx, margin: marginPx,
    }));
  }, [anchor, gapPx, marginPx, anchorOffset, measure]);

  // Placed on the way in, and re-placed if the window is resized — a modal
  // pinned to a corner that is no longer there is a modal you cannot close.
  useLayoutEffect(() => {
    if (!big && !placed.current) place();
    const onResize = () => {
      setScreen({ width: window.innerWidth, height: window.innerHeight });
      if (!big && !placed.current) place();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [place, big]);

  // ─── The maximised rectangle (turn 13, F2.1) ───
  // Worked out by `maximiseInViewport`, which is arithmetic and testable, and
  // applied as inline geometry so the panel's own width class is simply
  // overridden rather than swapped for a second set of classes.
  const full = big ? maximiseInViewport({ viewport: screen, margin: maximiseMarginPx }) : null;

  // Restoring is not just "stop being big": the window has never been placed,
  // so it has to find its object the way it would have on the way in.
  const restore = useCallback(() => {
    placed.current = false;
    setAt(null);
    setBig(false);
  }, []);
  useLayoutEffect(() => { if (!big && !at) place(); }, [big, at, place]);
  useEffect(() => { onMaximisedChange?.(big); }, [big, onMaximisedChange]);

  // ─── Owner, 09.08 (Step 5 cut off): re-place when the CONTENT grows ───
  // The window is placed once, measured at the height it opens with. A step
  // flow then swaps in a taller step, the top stays where the short step put
  // it, and the bottom leaves the screen — a new client never learns there
  // are buttons down there. So: watch the card's size; while the user has not
  // dragged it (`at.dragged`), a size change re-runs the same placement, and
  // the clamp keeps the whole window on screen.
  useEffect(() => {
    const el = box.current;
    if (!el || big) return undefined;
    const ro = new ResizeObserver(() => {
      if (!placedByHand()) place();
    });
    function placedByHand() { return Boolean(atRef.current?.dragged); }
    ro.observe(el);
    return () => ro.disconnect();
  }, [big, place]);
  const atRef = useRef(null);
  useEffect(() => { atRef.current = at; }, [at]);

  // ─── (a) DRAGGABLE BY ITS HEADER ───
  // The same gesture the right-click menu has: grab the bar, and the panel goes
  // where it is put — clamped to the viewport, never flipped, because the hand
  // is holding its top-left corner and flipping it would snatch it away.
  const startDrag = (e) => {
    const el = box.current;
    // A maximised window has nowhere to be dragged TO — it already fills the
    // screen. The handle comes back the moment it is restored (F2.1).
    if (!el || e.button !== 0 || big) return;
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
      className={`fixed inset-0 ${LAYER_CLASS.modal} ${darken && !sticky ? 'bg-black/45' : ''} ${sticky ? 'pointer-events-none' : ''}`}
      onPointerDown={sticky ? undefined : close}
    >
      <div
        ref={box}
        role="dialog"
        aria-label={typeof title === 'string' ? title : undefined}
        data-modal-shell="1"
        data-modal-name={name || undefined}
        data-modal-anchored={anchor ? '1' : '0'}
        data-modal-sticky={sticky ? '1' : undefined}
        data-modal-side={big ? 'maximised' : (at?.side || '')}
        data-modal-maximised={big ? '1' : '0'}
        className={`fixed cc-panel pointer-events-auto ${big ? '' : `${width} max-h-[90vh]`} flex flex-col shadow-xl ${className}`}
        style={full ? {
          left: full.left, top: full.top, width: full.width, height: full.height, visibility: 'visible',
        } : {
          left: at?.left ?? 0,
          top: at?.top ?? 0,
          visibility: at ? 'visible' : 'hidden',
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-center px-4 py-2.5 border-b border-shell-600 select-none ${big ? '' : 'cursor-move'}`}
          title={big ? undefined : 'Drag to move this window'}
          data-modal-handle="1"
          onPointerDown={startDrag}
        >
          {/* ─── Turn 23 (CLAUDE.md F1.2): ← Back, BESIDE THE TITLE ─────────
              First in the header, where a hand looking for "out of here" goes,
              and rendered only where there IS a level under this one — the top
              of the stack has no Back, because there is nothing behind it.

              ─── TURN 26 (CLAUDE.md F12.2): AND IN A WORKSPACE IT IS BIG ─────
              The owner, of the editor: "Back moves to the top centre of the
              modal, large." In a WORKSPACE — a maximised window that fills the
              screen — a ghost button 4 px from the left edge of a 1900 px
              header is a button nobody finds, and "out of here" is the thing a
              hand looks for first. So a maximised window puts it in the MIDDLE
              of the header at a size the eye lands on, and every side dialog
              keeps the quiet one beside its title. One shell, two placements,
              and the placement follows the KIND of window rather than being a
              per-modal decision. */}
          {onBack && !big && (
            <button
              type="button"
              className="cc-btn-ghost mr-2 shrink-0"
              data-modal-back="1"
              data-modal-back-place="beside"
              title={`Back${backLabel ? ` to the ${backLabel}` : ''} (Escape)`}
              onClick={onBack}
            >
              ← Back
            </button>
          )}
          <h2 className="text-sm text-ink-50">{title}</h2>
          <span className="flex-1" />
          {onBack && big && (
            <button
              type="button"
              className="cc-editor-back shrink-0"
              data-modal-back="1"
              data-modal-back-place="top-centre"
              title={`Back${backLabel ? ` to the ${backLabel}` : ''} (Escape)`}
              onClick={onBack}
            >
              ← Back
            </button>
          )}
          <span className="flex-1" />
          {/* Offered only to a window that ASKED to be maximised. Every other
              modal in the app is a side dialog and a maximise button on one
              would be an invitation to break rule 15. */}
          {maximised && (
            <button
              type="button"
              className="cc-btn-ghost"
              data-modal-maximise="1"
              title={big ? 'Restore — put the window beside the cabinet' : 'Maximise'}
              onClick={() => (big ? restore() : setBig(true))}
            >
              {big ? '❐' : '▢'}
            </button>
          )}
          <button type="button" className="cc-btn-ghost" title="Close (Esc)" onClick={close}>×</button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer && <div className="px-4 py-3 border-t border-shell-600 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
