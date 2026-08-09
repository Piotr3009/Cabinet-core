import {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useTemplateStore } from '../stores/templateStore.js';
import { UNIT_TYPES, getCategory, getUnitType, profilePath } from '../engine/types.js';
import { groupCounts, resolveEntry } from '../engine/library.js';
import { formatMm } from '../engine/format.js';
import { projectHeights } from '../engine/design.js';
import { placeBesideAnchor } from '../lib/menuPlacement.js';

// How far a flyout stands off the row that owns it, and how close it may come
// to the edge of the screen. The same two numbers `Modal` uses for the rule-15
// placement — this is a submenu, not a new kind of floating thing.
const FLYOUT_GAP = 8;
const FLYOUT_MARGIN = 8;

// Floating, grab-and-move Library panel (SPEC 4.1 / section 7).
//
// Turn 4 (BACKLOG #9): it is opened from the Library MENU, one CATEGORY at a
// time, and it closes with an X. What it is not any more: a permanent fixture
// carrying Room setup, Design settings and the snap step — those act on the
// project and now live in the Settings menu, so this panel is one thing again.
export default function LibraryPanel() {
  const pos = useUiStore((s) => s.libraryPos);
  const setPos = useUiStore((s) => s.setLibraryPos);
  const categoryId = useUiStore((s) => s.libraryCategory);
  const closeLibrary = useUiStore((s) => s.closeLibrary);
  const clearLibraryInsert = useUiStore((s) => s.clearLibraryInsert);
  const selectUnit = useUiStore((s) => s.selectUnit);
  const selectedUnitId = useUiStore((s) => s.selectedUnitId);
  const notify = useUiStore((s) => s.notify);
  const addUnit = useProjectStore((s) => s.addUnit);
  const units = useProjectStore((s) => s.units);
  const profile = useCabinetProfileStore((s) => s.profile);
  const design = useProjectStore((s) => s.project.design);
  const heights = useMemo(() => projectHeights(design, profile), [design, profile]);

  const drag = useRef(null);
  // ─── Turn 9 (CLAUDE.md F2) ───
  // Turn 8 asked WHICH SIDE here, with a ◀ / auto / ▶ picker, and Piotr's
  // verdict was that it is confusing — you are being asked to describe a place
  // in words, in a panel, before you have said which cabinet you mean. The
  // picker is gone. The place is now chosen on the CANVAS, by clicking the "+"
  // standing in the gap it would fill (3d/AddPlus.jsx), and it arrives here
  // already decided.
  //
  // Opened from the Library MENU instead, `libraryInsert` is null and adding
  // works exactly as it did before turn 8's picker existed: beside the
  // selection, on whichever side has room.
  const insertAt = useUiStore((s) => s.libraryInsert);

  const onPointerDown = useCallback((e) => {
    // A press on a CONTROL in the header is not a grab. Without this the header
    // takes the pointer capture, the click event is retargeted to it, and the X
    // never fires — the panel was undismissable in exactly the way BACKLOG #9
    // complains about.
    if (e.target.closest?.('button')) return;
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e) => {
    if (!drag.current) return;
    const x = Math.max(8, Math.min(window.innerWidth - 260, e.clientX - drag.current.dx));
    const y = Math.max(56, Math.min(window.innerHeight - 120, e.clientY - drag.current.dy));
    setPos({ x, y });
  }, [setPos]);

  const onPointerUp = useCallback((e) => {
    drag.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
  }, []);

  // Keep the panel on screen when the window shrinks
  useEffect(() => {
    const onResize = () => setPos({
      x: Math.max(8, Math.min(window.innerWidth - 260, pos.x)),
      y: Math.max(56, Math.min(window.innerHeight - 120, pos.y)),
    });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [pos, setPos]);

  // Escape closes it, like every other dismissible surface in the app.
  useEffect(() => {
    if (!categoryId) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closeLibrary(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [categoryId, closeLibrary]);

  const category = getCategory(categoryId);
  const selected = units.find((u) => u.id === selectedUnitId) || null;
  // The unit whose "+" opened this panel. It may have been deleted since —
  // the panel is not modal — so the place is only honoured while it exists.
  const insertBeside = insertAt ? units.find((u) => u.id === insertAt.near) || null : null;
  if (!category) return null;

  const handleAdd = (typeId, opts) => {
    // A full room refuses the unit rather than stacking it on a neighbour, so
    // the answer has to be read, not assumed. A saved set goes through exactly
    // this path (BACKLOG #30) — same free slot, same clamp, same fillers.
    //
    // Turn 8 (CLAUDE.md F2.1): the SELECTED unit is what the new one is placed
    // beside, on whichever side has room. Adding then works the way a joiner
    // works — "and another one here" — instead of always extending the run to
    // the right, which is what made the left-hand end unreachable.
    //
    // Turn 9 (CLAUDE.md F2): …unless a "+" on the canvas opened this panel, in
    // which case the end of the run it was standing at IS the answer, and it
    // beats the selection. Same call, same free-slot search, same collision
    // clamp — this phase changed the trigger, not the mechanics.
    const { id, error, wall } = addUnit(typeId, {
      near: insertAt?.near ?? selectedUnitId,
      side: insertAt?.side ?? null,
      ...opts,
    });
    if (error) { notify(error, 'warn'); return; }
    selectUnit(id);
    if (wall > 0) notify(`Wall 1 is full — placed on wall ${wall + 1}.`, 'info');
    // The place has been used up: leaving it set would put the NEXT type on the
    // same side of a cabinet that now has a neighbour there. The PANEL stays
    // open, because "add, add, add" is how a run gets built — and the unit just
    // placed is the selection now, so the next one lands beside it.
    if (insertAt) clearLibraryInsert();
  };

  return (
    <div className="cc-panel absolute w-[248px] z-20 select-none" style={{ left: pos.x, top: pos.y }}>
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-shell-600 cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="text-ink-400 leading-none tracking-tighter" aria-hidden>⋮⋮</span>
        <span className="text-xs uppercase tracking-wide text-ink-200">{category.label}</span>
        <span className="flex-1" />
        <span className="cc-tag">{units.length}</span>
        <button
          type="button"
          className="cc-btn-ghost"
          title="Close the library"
          aria-label="Close the library"
          onClick={closeLibrary}
        >
          ×
        </button>
      </div>

      {/* ─── Where it will land (turn 9, CLAUDE.md F2) ───
          A statement, not a question. The ◀ / auto / ▶ picker that used to sit
          here is gone — an explicit owner decision, and the reason is that it
          asked you to describe a place in words before you had said which
          cabinet you meant. The place is chosen on the CANVAS now, by clicking
          the "+" standing in the gap it would fill, and this row only reports
          what was clicked so a joiner can see the panel understood him.

          Opened from the Library MENU there is no clicked gap, so the new unit
          goes beside the SELECTION on whichever side has room — which is what
          turn 8's "auto" did and what makes "add, add, add" build a run. */}
      {(insertBeside || selected) && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-shell-600">
          <span className="text-[11px] text-ink-400 flex-1">
            {insertBeside
              ? `Adding to the ${insertAt.side} of ${insertBeside.params.unit_num}`
              : `Adding beside ${selected.params.unit_num} — whichever side has room`}
          </span>
          {insertBeside && (
            <button
              type="button"
              className="cc-btn-ghost"
              title="Forget the place — add beside the selection instead"
              onClick={clearLibraryInsert}
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* ─── Turn 15 (CLAUDE.md F1.5): IT SCROLLS ───
          The owner's screenshot: a long list running off the bottom of the
          screen with no way to reach the last entry. Any list taller than its
          panel scrolls, always. The cap is a fraction of the VIEWPORT rather
          than a fixed pixel count, because this panel is dragged around and a
          fixed height would be wrong the moment it is dropped near an edge. */}
      <div className="p-2 space-y-1 cc-scroll max-h-[60vh]" data-library-list="1">
        {category.saved && <SavedSets onInsert={handleAdd} />}
        {!category.saved && !category.entries && category.types.length === 0 && (
          <p className="text-[11px] text-ink-400 px-2 py-3">
            Nothing here yet — {category.label.toLowerCase()} are a later phase.
          </p>
        )}
        {/* ─── Turn 12 (CLAUDE.md F3): the LIST is data ───
            engine/library.js holds the owner's order, the expandable drawer
            group and the three entries that are held open. This component
            renders it and decides nothing. A category that predates the list
            (Wardrobes) still carries a plain `types` array, and both shapes go
            through the same row. */}
        {(category.entries || category.types.map((id) => ({ kind: 'type', id, typeId: id })))
          .map((entry) => (
            <LibraryEntry
              key={entry.id}
              entry={entry}
              profile={profile}
              heights={heights}
              onAdd={handleAdd}
            />
          ))}
      </div>
    </div>
  );
}

/**
 * One row of the library (turn 12, CLAUDE.md F3).
 *
 * Three shapes, and the data says which: a KIT you can place, a GROUP that
 * expands (the drawer unit and its four splits), and an entry HELD OPEN with
 * the reason it is not clickable yet written beside it. A grey row that does
 * not say why is a row a workshop asks about twice.
 */
function LibraryEntry({
  entry, profile, heights, onAdd, nested = false,
}) {
  const [open, setOpen] = useState(false);
  const rowRef = useRef(null);
  const state = resolveEntry(entry, profile);

  if (entry.kind === 'group') {
    const counts = groupCounts(entry, profile);
    return (
      <div className={nested ? '' : 'rounded border border-transparent'}>
        <button
          ref={rowRef}
          type="button"
          className={`w-full text-left px-2 py-2 rounded hover:bg-shell-700 border transition-colors
            flex items-center gap-2 ${open ? 'border-gold bg-shell-700' : 'border-transparent hover:border-shell-600'}`}
          data-library-group={entry.id}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="flex-1 min-w-0">
            <span className="block text-sm text-ink-50">{entry.label}</span>
            <span className="block text-[11px] text-ink-400 truncate">{entry.hint}</span>
          </span>
          <span className="cc-tag shrink-0" title={`${counts.enabled} of ${counts.total} can be placed today`}>
            {counts.enabled}/{counts.total}
          </span>
          <span className={open ? 'text-gold' : 'text-ink-400'} aria-hidden>▸</span>
        </button>
        {open && (
          <Flyout anchorRef={rowRef} title={entry.label} onClose={() => setOpen(false)} id={entry.id}>
            {entry.items.map((item) => (
              <LibraryEntry
                key={item.id}
                entry={item}
                profile={profile}
                heights={heights}
                onAdd={onAdd}
                nested
              />
            ))}
          </Flyout>
        )}
      </div>
    );
  }

  const type = entry.typeId ? UNIT_TYPES[entry.typeId] : null;
  // Each type names its own defaults block in the profile, so a new kit needs
  // no branch here.
  const d = type ? (profilePath(profile, type.defaultsKey) || {}) : {};
  // …but the HEIGHT it will actually arrive at is the project's, for a type
  // that inherits one (turn 5, BACKLOG #29). Advertising the kit's 2150 and
  // then placing a 2200 is a list that lies about its contents.
  const height = (type?.heightGroup && heights[type.heightGroup]) || d.height;
  const label = state.label || entry.label || type?.label || entry.id;

  if (!state.enabled) {
    return (
      <div
        className="w-full text-left px-2 py-2 rounded opacity-50 cursor-not-allowed"
        data-library-entry={entry.id}
        data-disabled="1"
        title={state.reason || 'Not yet'}
      >
        <div className="text-sm text-ink-100 flex items-center gap-1.5">
          <span>{label}</span>
          <span className="cc-tag">soon</span>
        </div>
        <div className="text-[11px] text-ink-400">{state.reason || entry.hint}</div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="w-full text-left px-2 py-2 rounded hover:bg-shell-700 border border-transparent hover:border-shell-600 transition-colors"
      data-library-entry={entry.id}
      title={state.hint || type?.label || ''}
      onClick={() => onAdd(entry.typeId)}
    >
      <div className="text-sm text-ink-50">
        {label}
        {nested && state.hint ? <span className="text-[11px] text-ink-400"> · {state.hint}</span> : null}
      </div>
      <div className="text-[11px] text-ink-400">
        {formatMm(d.width)} × {formatMm(height)} × {formatMm(d.depth)} mm{type?.mount === 'wall' ? ' · wall' : ''}
      </div>
    </button>
  );
}

/**
 * A sub-list, OUT TO THE SIDE (turn 15, CLAUDE.md F5.1).
 *
 * The owner's screenshot: opening the Drawer group pushed the rest of the
 * library down and off the bottom of the screen. Expanding downward inside a
 * floating panel is what does that — the panel is 248 px of a viewport it does
 * not own, and every nested list makes it taller.
 *
 * A flyout does not. It opens BESIDE the row that owns it, which is what a
 * desktop submenu does and what keeps the parent list exactly where the eye
 * left it. WHICH side is not decided here: `placeBesideAnchor` tries right,
 * then left, then below, then above, and takes the first that fits — so a
 * library dragged to the right-hand edge of the screen flies out to the LEFT
 * without this component knowing that is what it did. That is the shared
 * placement/clamp logic rule 15 already made every modal in this app use.
 *
 * Closing: Escape, or a click anywhere outside — the same two gestures every
 * other dismissible surface here answers to.
 */
function Flyout({
  anchorRef, title, id, onClose, children,
}) {
  const ref = useRef(null);
  const [at, setAt] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const anchor = anchorRef?.current;
    if (!el || !anchor) return;
    const a = anchor.getBoundingClientRect();
    const size = el.getBoundingClientRect();
    setAt(placeBesideAnchor({
      anchor: {
        x: a.left, y: a.top, width: a.width, height: a.height,
      },
      size: { width: size.width, height: size.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      gap: FLYOUT_GAP,
      margin: FLYOUT_MARGIN,
      prefer: 'right',
    }));
  }, [anchorRef, children]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    const onDown = (e) => {
      if (ref.current?.contains(e.target)) return;
      if (anchorRef?.current?.contains(e.target)) return;
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onDown, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onDown, true);
    };
  }, [anchorRef, onClose]);

  return (
    <div
      ref={ref}
      data-library-flyout={id}
      className="fixed z-30 w-[236px] cc-panel p-2 space-y-1 cc-scroll max-h-[70vh]"
      // Off screen until it has been measured and placed: a flyout that flashes
      // at 0,0 first is a flyout that reads as a bug.
      style={at ? { left: at.left, top: at.top } : { left: -9999, top: 0 }}
    >
      <div className="px-2 pb-1 text-[10px] uppercase tracking-wide text-ink-400 border-b border-shell-600">
        {title}
      </div>
      {children}
    </div>
  );
}

/**
 * Saved sets (BACKLOG #30): the workshop's own configured units.
 *
 * Clicking one INSERTS it through the ordinary add path, so a template can no
 * more land on top of a neighbour than a library type can. Rename and delete
 * live here, where the list is — a set you cannot correct is a set you stop
 * trusting.
 */
function SavedSets({ onInsert }) {
  const templates = useTemplateStore((s) => s.templates);
  const rename = useTemplateStore((s) => s.rename);
  const remove = useTemplateStore((s) => s.remove);
  const notify = useUiStore((s) => s.notify);
  const [editing, setEditing] = useState(null);   // { id, name }

  if (!templates.length) {
    return (
      <p className="text-[11px] text-ink-400 px-2 py-3">
        Nothing saved yet. Right-click a unit you have configured and choose
        <span className="text-ink-200"> Save as template</span> — it lands here, ready to insert again.
      </p>
    );
  }

  const commitRename = () => {
    const { ok, error } = rename(editing.id, editing.name);
    if (error) { notify(error, 'warn'); return; }
    if (ok) notify('Renamed.', 'ok');
    setEditing(null);
  };

  return (
    <ul className="space-y-1">
      {templates.map((t) => {
        const type = getUnitType(t.type);
        const isEditing = editing?.id === t.id;
        return (
          <li key={t.id} className="rounded border border-transparent hover:border-shell-600 hover:bg-shell-700/60 transition-colors">
            {isEditing ? (
              <div className="flex items-center gap-1 p-1.5">
                <input
                  autoFocus
                  className="cc-input flex-1"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setEditing(null);
                  }}
                />
                <button type="button" className="cc-btn-ghost" title="Save the name" onClick={commitRename}>✓</button>
                <button type="button" className="cc-btn-ghost" title="Keep the old name" onClick={() => setEditing(null)}>×</button>
              </div>
            ) : (
              <div className="flex items-center">
                <button
                  type="button"
                  className="flex-1 text-left px-2 py-2 min-w-0"
                  title={`Insert a ${type.label} with these parameters`}
                  onClick={() => onInsert(t.type, { params: t.params })}
                >
                  <div className="text-sm text-ink-50 truncate">{t.name}</div>
                  <div className="text-[11px] text-ink-400">
                    {type.label} · {formatMm(t.params.width)} × {formatMm(t.params.height)} × {formatMm(t.params.depth)} mm
                  </div>
                </button>
                <button
                  type="button" className="cc-btn-ghost shrink-0" title="Rename this set"
                  onClick={() => setEditing({ id: t.id, name: t.name })}
                >
                  ✎
                </button>
                <button
                  type="button" className="cc-btn-ghost text-status-danger shrink-0" title="Delete this set"
                  onClick={() => { remove(t.id); notify(`“${t.name}” deleted.`, 'ok'); }}
                >
                  ×
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
