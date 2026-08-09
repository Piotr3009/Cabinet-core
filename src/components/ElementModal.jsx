import { useMemo } from 'react';
import Modal from './Modal.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import ElementProperties from './ElementProperties.jsx';
import { elementLabel } from '../engine/elements.js';
import { anchorAtPoint } from '../lib/modalAnchor.js';

// ─── Double-click a piece (turn 11, CLAUDE.md F3.3) ─────────────────────────
//
// "Double-click any element → opens an edit MODAL next to the element AND
// focuses the right panel on it. Single click keeps selecting only."
//
// ─── TURN 12 (CLAUDE.md rule 15 / F2): THROUGH THE SHELL ───
// Turn 11 wrote this as a floating card of its own precisely BECAUSE the app's
// `Modal` was a centred dialog with a backdrop — the wrong shape for "that
// shelf, there". Rule 15 makes that the shape of every modal instead, so the
// special case is gone: the shell places this beside the piece that was
// double-clicked, and the same three lines now also make it draggable, which is
// what the owner asked for and what this card never had.
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

  // The piece was pointed at, so the point IS the object as far as the screen
  // is concerned: a rectangle of zero size at the click (lib/modalAnchor.js).
  const anchor = useMemo(
    () => args?.anchor || anchorAtPoint(args?.at?.x, args?.at?.y),
    [args],
  );

  if (!unit || !panel) return null;

  return (
    <Modal
      // Turn 14 (CLAUDE.md F4): the window says WHICH piece it is about. With
      // doors, end panels and fillers all opening one of these directly, "edit
      // piece" is the one thing the title must not say.
      title={`${unit.params.unit_num} · ${elementLabel(panel) || 'piece'}`}
      onClose={closeModal}
      anchor={anchor}
      width="w-[320px]"
    >
      <ElementProperties unit={unit} panel={panel} item={item} compact />
      <p className="text-[11px] text-ink-400 mt-2">
        The same fields are in the right-hand panel, which is already showing this piece.
      </p>
    </Modal>
  );
}
