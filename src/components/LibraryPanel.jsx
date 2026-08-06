import { useCallback, useEffect, useRef } from 'react';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { UNIT_TYPES, getCategory, profilePath } from '../engine/types.js';

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
  const selectUnit = useUiStore((s) => s.selectUnit);
  const notify = useUiStore((s) => s.notify);
  const addUnit = useProjectStore((s) => s.addUnit);
  const units = useProjectStore((s) => s.units);
  const profile = useCabinetProfileStore((s) => s.profile);

  const drag = useRef(null);

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
  if (!category) return null;

  const handleAdd = (typeId) => {
    // A full room refuses the unit rather than stacking it on a neighbour, so
    // the answer has to be read, not assumed.
    const { id, error, wall } = addUnit(typeId);
    if (error) { notify(error, 'warn'); return; }
    selectUnit(id);
    if (wall > 0) notify(`Wall 1 is full — placed on wall ${wall + 1}.`, 'info');
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

      <div className="p-2 space-y-1">
        {category.types.length === 0 && (
          <p className="text-[11px] text-ink-400 px-2 py-3">
            Nothing here yet — {category.label.toLowerCase()} are a later phase.
          </p>
        )}
        {category.types.map((id) => {
          const t = UNIT_TYPES[id];
          // Each type names its own defaults block in the profile, so a new
          // kit needs no branch here.
          const d = profilePath(profile, t.defaultsKey) || {};
          return (
            <button
              key={id}
              type="button"
              className="w-full text-left px-2 py-2 rounded hover:bg-shell-700 border border-transparent hover:border-shell-600 transition-colors"
              onClick={() => handleAdd(id)}
            >
              <div className="text-sm text-ink-50">{t.label}</div>
              <div className="text-[11px] text-ink-400">
                {d.width} × {d.height} × {d.depth} mm{t.mount === 'wall' ? ' · wall' : ''}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
