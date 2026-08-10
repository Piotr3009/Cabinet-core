import { useMemo } from 'react';
import Modal from './Modal.jsx';
import { useUiStore } from '../stores/uiStore.js';
import { useProjectStore } from '../stores/projectStore.js';
import ElementProperties from './ElementProperties.jsx';
import { elementLabel } from '../engine/elements.js';
import { anchorAtPoint } from '../lib/modalAnchor.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { panelWeight } from '../engine/lifts.js';
import { resolvePanelMaterial } from '../engine/materials.js';
import { migrateDesign } from '../engine/design.js';
import { formatMm, roundTo } from '../engine/format.js';

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
      {/* ─── Turn 19 (CLAUDE.md F5.1): WHAT IT WEIGHS ─────────────────────────
          The footer of the detail window. It is here because it is the one
          number turn 19 owes the lift engine that a person can see today: an
          AVENTOS is chosen on the weight of the front, and a joiner who cannot
          see the weight cannot argue with the proposal turn 20 will make. The
          arithmetic is the engine's (engine/lifts.js `panelWeight`) — the board
          the piece is actually cut from, its own thickness, its own area. */}
      <PieceWeight unit={unit} panel={panel} />
      <p className="text-[11px] text-ink-400 mt-2">
        The same fields are in the right-hand panel, which is already showing this piece.
      </p>
    </Modal>
  );
}

/**
 * WHAT THIS PIECE WEIGHS (turn 19, CLAUDE.md F5.1).
 *
 * "Derived: a front's weight in kg (area × kg_m2), shown in the element detail
 * footer." Every piece gets the line, not only a front: the same arithmetic is
 * true of a shelf and a joiner lifting a 25 mm oak one up a stairwell has the
 * same question. What the LIFT engine will use it for (turn 20) is the fronts.
 *
 * It says WHERE the figure came from, because that is the difference between a
 * number and a guess: an assigned board's own kg/m², or the workshop's table —
 * and when the table has no row for this thickness, the nearest board it does
 * have, said out loud rather than rounded in silence.
 */
function PieceWeight({ unit, panel }) {
  const profile = useCabinetProfileStore((s) => s.profile);
  const materials = useMaterialAssignmentStore((s) => s.materials);
  const storedDesign = useProjectStore((s) => s.project.design);
  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);

  const weight = useMemo(() => {
    const material = resolvePanelMaterial(panel, unit, design, profile, materials);
    return panelWeight({
      panel, material, materials, profile,
    });
  }, [panel, unit, design, profile, materials]);

  if (!weight.kg) return null;
  return (
    <p className="text-[11px] text-ink-400 mt-2" data-piece-weight={roundTo(weight.kg, 2)}>
      Weight <span className="text-ink-100">{roundTo(weight.kg, 2)} kg</span>
      {' — '}
      {formatMm(panel.w)} × {formatMm(panel.h)} at {weight.kgM2} kg/m²
      {weight.source === 'stock'
        ? ', from the assigned board.'
        : `, from the workshop's ${weight.kind === 'mdf_lacquered' ? 'lacquered MDF' : 'MFC'} table${weight.exact ? '.' : ' — nearest thickness, no board assigned yet.'}`}
    </p>
  );
}
