import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import ElementProperties from './ElementProperties.jsx';
import { clampMenuPosition } from '../lib/menuPlacement.js';

// ─── Double-click a piece (turn 11, CLAUDE.md F3.3) ─────────────────────────
//
// "Double-click any element → opens an edit MODAL next to the element AND
// focuses the right panel on it. Single click keeps selecting only."
//
// NEXT TO THE ELEMENT is the whole point, and it is why this is not a Modal:
// the app's `Modal` is a centred dialog with a backdrop, which is the right
// shape for "set up the project" and the wrong shape for "that shelf, there".
// This is a small floating card at the click point, placed by the same
// arithmetic the right-click menu uses (lib/menuPlacement.js) so it can never
// open off the edge of a laptop screen either.
//
// It shares its CONTENTS with the right panel — one `ElementProperties`, so the
// two can never offer different fields for the same piece.

export default function ElementModal() {
  const args = useUiStore((s) => s.modalArgs);
  const closeModal = useUiStore((s) => s.closeModal);
  const units = useProjectStore((s) => s.units);
  const unitResult = useProjectStore((s) => s.unitResult);

  const unit = units.find((u) => u.id === args?.unitId) || null;
  const result = unit ? unitResult(unit.id) : null;
  const panel = result?.panels.find((p) => p.id === args?.panelId) || null;
  const item = useMemo(() => {
    const id = panel?.meta?.itemId;
    if (!id) return null;
    return (unit?.params.sections?.[0]?.items || []).find((i) => i.id === id) || null;
  }, [panel, unit]);

  const box = useRef(null);
  const [at, setAt] = useState(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setAt(clampMenuPosition({
      // A little down and to the right of the click, so the card sits BESIDE the
      // piece rather than on top of the thing you just pointed at.
      x: (args?.at?.x ?? window.innerWidth / 2) + 16,
      y: (args?.at?.y ?? window.innerHeight / 2) + 12,
      width: rect.width,
      height: rect.height,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      margin: 12,
    }));
  }, [args, panel?.id]);

  if (!unit || !panel) return null;

  return (
    <div
      ref={box}
      className="fixed z-50 w-[300px] cc-panel p-3 shadow-xl"
      style={{
        left: at?.left ?? (args?.at?.x ?? 0),
        top: at?.top ?? (args?.at?.y ?? 0),
        visibility: at ? 'visible' : 'hidden',
      }}
      role="dialog"
      aria-label="Element properties"
    >
      <div className="flex items-start gap-2 mb-2">
        <span className="text-xs uppercase tracking-wide text-ink-200 flex-1">
          {unit.params.unit_num} · edit piece
        </span>
        <button type="button" className="cc-btn-ghost" title="Close (Esc)" onClick={closeModal}>×</button>
      </div>

      <ElementProperties unit={unit} panel={panel} item={item} compact />

      <p className="text-[11px] text-ink-400 mt-2">
        The same fields are in the right-hand panel, which is already showing this piece.
      </p>
    </div>
  );
}
