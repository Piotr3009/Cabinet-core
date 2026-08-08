import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useTemplateStore } from '../stores/templateStore.js';
import { UNIT_TYPES, getCategory, getUnitType, profilePath } from '../engine/types.js';
import { formatMm } from '../engine/format.js';
import { projectHeights } from '../engine/design.js';

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
  const selectedUnitId = useUiStore((s) => s.selectedUnitId);
  const notify = useUiStore((s) => s.notify);
  const addUnit = useProjectStore((s) => s.addUnit);
  const units = useProjectStore((s) => s.units);
  const profile = useCabinetProfileStore((s) => s.profile);
  const design = useProjectStore((s) => s.project.design);
  const heights = useMemo(() => projectHeights(design, profile), [design, profile]);

  const drag = useRef(null);
  // Which side of the selected unit the next one goes on (turn 8, CLAUDE.md
  // F2.1). null = whichever side has room — which is what a joiner means most
  // of the time, and what makes "add, add, add" still build a row.
  const [placeSide, setPlaceSide] = useState(null);

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
    const { id, error, wall } = addUnit(typeId, { near: selectedUnitId, side: placeSide, ...opts });
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

      {/* Which side of the selected unit the next one lands on (turn 8, F2.1).
          Only shown when there IS a unit to be beside — on an empty wall the
          question has no meaning and the answer is "in the middle". */}
      {selectedUnitId && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-shell-600">
          <span className="text-[11px] text-ink-400 flex-1">Place beside {selected?.params.unit_num || 'the selection'}</span>
          {[['L', '◀', 'On its left'], [null, 'auto', 'Whichever side has room'], ['R', '▶', 'On its right']].map(
            ([value, label, title]) => (
              <button
                key={label}
                type="button"
                title={title}
                className={`cc-btn px-1.5 py-0.5 text-[11px] ${placeSide === value ? 'border-gold text-ink-50' : ''}`}
                onClick={() => setPlaceSide(value)}
              >
                {label}
              </button>
            ),
          )}
        </div>
      )}

      <div className="p-2 space-y-1">
        {category.saved && <SavedSets onInsert={handleAdd} />}
        {!category.saved && category.types.length === 0 && (
          <p className="text-[11px] text-ink-400 px-2 py-3">
            Nothing here yet — {category.label.toLowerCase()} are a later phase.
          </p>
        )}
        {category.types.map((id) => {
          const t = UNIT_TYPES[id];
          // Each type names its own defaults block in the profile, so a new
          // kit needs no branch here.
          const d = profilePath(profile, t.defaultsKey) || {};
          // …but the HEIGHT it will actually arrive at is the project's, for a
          // type that inherits one (turn 5, BACKLOG #29). Advertising the kit's
          // 2150 and then placing a 2200 is a list that lies about its contents.
          const height = (t.heightGroup && heights[t.heightGroup]) || d.height;
          return (
            <button
              key={id}
              type="button"
              className="w-full text-left px-2 py-2 rounded hover:bg-shell-700 border border-transparent hover:border-shell-600 transition-colors"
              onClick={() => handleAdd(id)}
            >
              <div className="text-sm text-ink-50">{t.label}</div>
              <div className="text-[11px] text-ink-400">
                {formatMm(d.width)} × {formatMm(height)} × {formatMm(d.depth)} mm{t.mount === 'wall' ? ' · wall' : ''}
              </div>
            </button>
          );
        })}
      </div>
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
