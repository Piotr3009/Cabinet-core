import { useMemo } from 'react';
import { useProjectStore, elementDepthBoundsFor } from '../stores/projectStore.js';
import { useCabinetProfileStore } from '../stores/cabinetProfileStore.js';
import { useMaterialAssignmentStore } from '../stores/materialAssignmentStore.js';
import { useUiStore } from '../stores/uiStore.js';
import {
  elementActions, elementFields, elementLabel, boardParamFor,
} from '../engine/elements.js';
import { getUnitType } from '../engine/types.js';
import { doorExtendMm, doorHeightOf } from '../engine/doors.js';
import { minDrawerFrontHeight } from '../engine/cabinet.js';
import { elementMaterialChoices, migrateDesign } from '../engine/design.js';
import { resolveRunnerVariant } from '../engine/runners.js';
import { formatMm, formatMmPair } from '../engine/format.js';
import { SHELF_TYPES, shelfTypeOf } from '../engine/shelfTypes.js';
import { fieldFromPos, posFromField } from '../engine/shelfHeights.js';
import { chainFromX, xFromChain } from '../engine/partitionPositions.js';
// Turn 24 (CLAUDE.md F3.3): which carcass board a partition is cut from.
import { CARCASS_SLOTS, partitionSlot, slotById } from '../engine/thickness.js';
import NumberField from './NumberField.jsx';
import UnitWarnings, { DRAWER_WARNING_CODES } from './UnitWarnings.jsx';
import { sayHingeResult } from '../lib/hingeEdit.js';

// ─── The properties of ONE piece (turn 11, CLAUDE.md F3) ────────────────────
//
// Turn 9 gave a SHELF a properties block in the right panel. This is the same
// block for the whole cabinet — sides, bottom, top, back, vertical partitions,
// end panels, infills, the fronts — and it is ONE component because CLAUDE.md
// asks for the "same right-panel properties" and because two of them would
// drift the first time a field changed.
//
// It is used in two places and knows about neither: the right panel renders it
// under its own header, and the double-click modal renders it beside the piece
// (F3.3). What appears is decided by `engine/elements.js elementFields`, so a
// new field is an entry in that list and a case here, never a branch in a
// component that also lays out a panel.

export default function ElementProperties({
  unit, panel, item = null, compact = false, actions = false, omit = [],
}) {
  const profile = useCabinetProfileStore((s) => s.profile);
  const materials = useMaterialAssignmentStore((s) => s.materials);
  const storedDesign = useProjectStore((s) => s.project.design);
  const design = useMemo(() => migrateDesign(storedDesign), [storedDesign]);
  const notify = useUiStore((s) => s.notify);

  const updateUnitParams = useProjectStore((s) => s.updateUnitParams);
  const setShelfPos = useProjectStore((s) => s.setShelfPos);
  const setShelfType = useProjectStore((s) => s.setShelfType);
  // Turn 34 (CLAUDE.md F4): the shoe box's three decisions, on its item.
  const setShoeBox = useProjectStore((s) => s.setShoeBox);
  const setRailHeight = useProjectStore((s) => s.setRailHeight);
  const setPartitionX = useProjectStore((s) => s.setPartitionX);
  // Turn 24 (CLAUDE.md F3.3): which carcass board this partition is cut from.
  const setPartitionSlot = useProjectStore((s) => s.setPartitionSlot);
  // Turn 30 (CLAUDE.md F3): which face of this divider the machine bores.
  const setPartitionDrillFace = useProjectStore((s) => s.setPartitionDrillFace);
  const setElementDepth = useProjectStore((s) => s.setElementDepth);
  const setElementThickness = useProjectStore((s) => s.setElementThickness);
  const setElementMaterial = useProjectStore((s) => s.setElementMaterial);
  const setElementOverride = useProjectStore((s) => s.setElementOverride);
  const setPartitionFront = useProjectStore((s) => s.setPartitionFront);
  const updateEndPanel = useProjectStore((s) => s.updateEndPanel);
  const setEndPanelTop = useProjectStore((s) => s.setEndPanelTop);
  const endPanelToCeiling = useProjectStore((s) => s.endPanelToCeiling);
  const setSideInfillTop = useProjectStore((s) => s.setSideInfillTop);
  const setSideInfillPinned = useProjectStore((s) => s.setSideInfillPinned);
  const setSideInfillToCeiling = useProjectStore((s) => s.sideInfillToCeiling);
  const setTopInfill = useProjectStore((s) => s.setTopInfill);
  const fillToCeiling = useProjectStore((s) => s.fillToCeiling);
  const setEndPanelBelow = useProjectStore((s) => s.setEndPanelBelow);
  const removeElement = useProjectStore((s) => s.removeElement);
  // Turn 17 (CLAUDE.md F7.2): the hinges of the door in hand.
  const hingeRowsOf = useProjectStore((s) => s.hingeRowsOf);
  const setHingePos = useProjectStore((s) => s.setHingePos);
  const addHinge = useProjectStore((s) => s.addHinge);
  const removeHinge = useProjectStore((s) => s.removeHinge);
  const resetHinges = useProjectStore((s) => s.resetHinges);
  // Turn 17 (CLAUDE.md F8.2): one drawer's height, clamped by the owner's rule.
  const setDrawerHeight = useProjectStore((s) => s.setDrawerHeight);
  const resetDrawerHeights = useProjectStore((s) => s.resetDrawerHeights);
  // Turn 18 (CLAUDE.md F6.4): …and which runner it is fitted with.
  const setDrawerRunnerVariant = useProjectStore((s) => s.setDrawerRunnerVariant);
  const moveElement = useProjectStore((s) => s.moveElement);
  // Turn 24 (CLAUDE.md F11): a partition's field measures from its LEFT
  // NEIGHBOUR, so this row needs to know what else is in the cabinet — read off
  // the ENGINE's own panels, so a partition is measured to the face the engine
  // actually cut and not to the one the item asked for.
  const unitResult = useProjectStore((s) => s.unitResult);

  const type = useMemo(() => getUnitType(unit.type), [unit.type]);
  // ─── TURN 33 (CLAUDE.md F7): A CALLER MAY OMIT A FIELD IT CARRIES ITSELF ──
  // The door modal shows THE hinge block (its own HingeSection, at the top —
  // the owner's "ten górny usuń" deleted the duplicate this list used to add
  // under it). The right-hand panel passes nothing and keeps every field it
  // has always had.
  const fields = useMemo(
    () => elementFields(panel, type).filter((f) => !omit.includes(f)),
    [panel, type, omit],
  );
  const bounds = useMemo(() => elementDepthBoundsFor(unit, profile), [unit, profile]);
  const choices = useMemo(
    () => elementMaterialChoices(design, profile, materials),
    [design, profile, materials],
  );

  const G = unit.params.board_t ?? profile.board.thickness;
  const locked = Boolean(panel.meta?.locked);
  const endPanel = (unit.params.end_panels || []).find((ep) => ep.id === panel.meta?.panelId) || null;
  const infillSide = panel.meta?.side === 'right' ? 'R' : 'L';
  // ─── Turn 16 (CLAUDE.md F1.3): THE PICKER MATCHES BY KEY ────────────────
  //
  // It matched by LABEL, which was fine while "the fronts" were one row and
  // wrong the moment they became two: two front types faced in the same board
  // have the same label, and a picker keyed on the label would tick both rows
  // and store whichever the search hit first. The key is the palette's own
  // (`carcass:c1`, `front:f2`), it is what the override stores, and it is what
  // the BOM, the sheet and the 3D view resolve back through
  // (engine/materials.js).
  //
  // A project saved before this turn has a label and no key, so the value falls
  // back to the row whose label matches — its material is not lost, and it is
  // written as a key the first time it is touched.
  const storedKey = panel.meta?.material_key || '';
  const storedLabel = panel.meta?.material_label || '';
  const chosen = choices.find((c) => c.key === storedKey)
    || (storedKey ? null : choices.find((c) => c.material_label === storedLabel))
    || null;
  const materialValue = chosen?.key || '';

  const setMaterial = (key) => {
    const pick = choices.find((c) => c.key === key) || null;
    // A shelf keeps its material on its ITEM (turn 9): that id survives the
    // shelf being dragged past its neighbours, and a panel id does not. Every
    // other piece is built BY the engine and has no item, so it is keyed by the
    // panel id the engine gave it (turn 11, F3.1).
    const patch = {
      material_key: pick?.key ?? null,
      material_id: pick?.material_id ?? null,
      material_label: pick?.material_label ?? null,
    };
    if (item) setElementMaterial(unit.id, item.id, patch);
    else setElementOverride(unit.id, panel.id, patch);
  };

  // ─── TURN 34 (CLAUDE.md F4): the shoe box's own item ──────────────────────
  // The three decisions live on the ITEM, exactly as a shelf's do; the panel
  // carries its id (`meta.shoe_box`) so any of the seven boards reaches it.
  const shoeBoxItem = (unit.params.sections?.[0]?.items || [])
    .find((i) => i.kind === 'shoe_box' && i.id === panel?.meta?.shoe_box) || null;

  // ─── TURN 35 (CLAUDE.md F1): the rail's own item ──────────────────────────
  // A wardrobe carries at most one unit-wide rod plus one per bay. The board
  // this modal is open on knows its bay (`meta.zone`), so the right rod is
  // found without a second number to keep in step.
  const railItem = (unit.params.sections?.[0]?.items || []).find((i) => {
    if (i.kind !== 'hanger') return false;
    const mine = panel?.meta?.zone;
    const its = i.zone;
    if (mine == null || !Number.isFinite(Number(mine))) return its == null || !Number.isFinite(Number(its));
    return Math.trunc(Number(its)) === Math.trunc(Number(mine));
  }) || null;

  const row = (key) => {
    switch (key) {
      // ─── TURN 35 (CLAUDE.md F1): HEIGHT ABOVE SUPPORT ─────────────────────
      // The owner's law, verbatim: *"drążek ustawiamy zawsze od najbliższej
      // czegoś od dołu — albo od szuflad, albo od półek. Jeśli napiszę 900, to
      // niech będzie od półki, chyba że nic nie ma — to wtedy od dna."* So the
      // label names the DATUM and not a floor, and the hint says which board
      // answered this time — the base is live, and a rail whose shelf moves
      // rides with it keeping this same number.
      case 'rail-height': {
        const support = Number(unitResult(unit.id)?.derived?.rail_support_y);
        const named = Number.isFinite(support) ? `${Math.round(support)} mm` : 'the bay floor';
        return (
          <Field key={key} label="Height above support">
            <NumberField
              className="cc-input text-right"
              data-rail-height="1"
              value={Number(railItem?.pos_mm ?? 0)}
              min={0}
              step={1}
              title={`Measured to the rod's axis from the nearest thing below it — right now ${named}`}
              onCommit={(v) => railItem && setRailHeight(unit.id, railItem.id, v)}
            />
          </Field>
        );
      }
      // ─── TURN 34 (CLAUDE.md F4): FIX OR DRAWER ────────────────────────────
      // "jeżeli nie jest szuflada to powinien być fix, nie z pinami — tu jest
      // błąd" (owner, 16.08.2026). ONE construction; the variant is the only
      // thing that changes — the box narrows by its runners and the carcass
      // side is drilled differently.
      case 'shoe-box-variant':
        return (
          <Field key={key} label="Mounting">
            <select
              className="cc-input w-full"
              data-shoe-box-variant="1"
              value={shoeBoxItem?.variant === 'D' ? 'D' : 'F'}
              title="Fix is screwed from outside the carcass; drawer rides 13 mm side runners"
              onChange={(e) => setShoeBox(unit.id, shoeBoxItem.id, { variant: e.target.value })}
            >
              <option value="F">Fix (screwed from outside)</option>
              <option value="D">Drawer (side runners)</option>
            </select>
          </Field>
        );
      // "jedna lub 0 przegródek — 2 nie mają sensu" — across the width, so the
      // box takes two rows of shoes rather than two columns of one.
      case 'shoe-box-dividers':
        return (
          <Field key={key} label="Divider">
            <select
              className="cc-input w-full"
              data-shoe-box-dividers="1"
              value={Number(shoeBoxItem?.dividers) >= 1 ? '1' : '0'}
              title="Across the width — two rows of shoes"
              onChange={(e) => setShoeBox(unit.id, shoeBoxItem.id, { dividers: e.target.value })}
            >
              <option value="0">None</option>
              <option value="1">One (2 shoe rows)</option>
            </select>
          </Field>
        );
      // "pozycja jak proponujesz" — default 0 (on the bay floor), or directly
      // above the drawer stack where the bay has one. The pilots are drilled
      // where this says: a position is a pre-export decision.
      case 'shoe-box-height':
        return (
          <Field key={key} label="Height from bay floor">
            <NumberField
              className="cc-input text-right"
              data-shoe-box-height="1"
              value={Number(shoeBoxItem?.pos_mm ?? panel?.box?.y ?? 0)}
              min={0}
              step={1}
              title="Where the box stands off the bay floor — the carcass side is drilled for this number"
              onCommit={(v) => setShoeBox(unit.id, shoeBoxItem.id, { pos_mm: v })}
            />
          </Field>
        );
      // ─── TURN 21 (CLAUDE.md F7): fix / adjustable / pull-out ──────────────
      case 'shelf-type':
        return (
          <Field key={key} label="Type">
            <select
              className="cc-input w-full"
              data-shelf-type="1"
              value={shelfTypeOf(item)}
              title="How this shelf is held"
              onChange={(e) => setShelfType(unit.id, item.id, e.target.value)}
            >
              {SHELF_TYPES.map((t) => (
                <option key={t.id} value={t.id} disabled={!t.enabled} title={t.hint}>
                  {t.label}
                  {t.enabled ? '' : ' — workshop number outstanding'}
                </option>
              ))}
            </select>
            {/* ─── TURN 34 (CLAUDE.md F4): ONE GREY NOTE, ON THE OLD SHELF ──
                The owner retired the pinned 15° shoe shelf on 16.08 — "jeżeli
                nie jest szuflada to powinien być fix, nie z pinami — tu jest
                błąd". A project already built with one keeps rendering
                exactly as saved (no silent migration), so the only thing this
                turn owes it is a sentence saying what replaced it. */}
            {shelfTypeOf(item) === 'shoe' && (
              <p className="mt-1 text-[10px] text-ink-400" data-shoe-shelf-note="1">
                This is the older pinned shoe shelf. It stays exactly as saved — new shoe
                accessories are built as the Shoe box (Add items → Shoe box): a boxed insert,
                fixed or on runners, never on pins.
              </p>
            )}
          </Field>
        );
      // ─── TURN 21 (CLAUDE.md F10): ONE TRUTH, THE INTERIOR DATUM ───────────
      // The field showed the stored number, whose zero is the OUTSIDE of the
      // carcass bottom, while the chip beside it showed the clear light above
      // the INTERIOR floor — 860 against 842 on the owner's screenshot. The
      // field speaks the joiner's datum now and `posFromField` puts it back;
      // storage does not move, and the clamp is still the setter's.
      case 'position-y':
        return (
          <Field key={key} label="Height">
            <NumberField
              className="cc-input text-right"
              value={fieldFromPos(item?.pos_mm ?? G, G)}
              disabled={locked}
              title={locked
                ? 'Screwed or locked — unlock it to move it'
                : 'The underside, above the interior floor — the clear light under the shelf. The same clamp the drag obeys.'}
              onCommit={(v) => setShelfPos(unit.id, item.id, posFromField(v, G))}
            />
          </Field>
        );
      case 'position-x': {
        // ─── TURN 23 (CLAUDE.md F10.1) / TURN 24 (F11) ───
        // The same cure turn 21 gave the shelf's height, on the other axis: the
        // field is measured from the INSIDE — and from turn 24 from the LEFT
        // NEIGHBOUR's face, which for the first partition IS that inside face.
        // One mapping, two cases of it. STORAGE DOES NOT MOVE: `xFromChain`
        // puts back exactly what `x_mm` has always meant, so moving one
        // partition changes the NUMBER the next one shows and nothing else.
        const siblings = ((unitResult(unit.id)?.panels) || [])
          .filter((pp) => pp.part === 'VPART' && pp.id !== panel?.id && pp.box)
          .map((pp) => ({ x: pp.box.x, w: pp.box.w }));
        const mine = panel?.box?.x ?? item?.x_mm ?? G;
        const first = siblings.every((o) => o.x + o.w > mine);
        return (
          <Field key={key} label={first ? 'From the left' : 'From the last'}>
            <NumberField
              className="cc-input text-right"
              data-partition-chain={item?.id || '1'}
              value={chainFromX({ x: mine, boardT: G, others: siblings })}
              title={first
                ? "From the INSIDE face of the left side panel to this partition's near face"
                : "From the previous partition's face to this one's near face — the clear bay between them"}
              onCommit={(v) => setPartitionX(
                unit.id, item.id, xFromChain({ value: v, x: mine, boardT: G, others: siblings }),
              )}
            />
          </Field>
        );
      }
      // ─── TURN 24 (CLAUDE.md F3.3): THE PARTITION'S OWN SLOT ───────────────
      // Carcass 1–3 and nothing else: a partition is a carcass board standing
      // on its end, and offering it a front board would be offering to build a
      // cabinet out of doors. Its 3-D, its CNC and the bay lights all flow from
      // the slot, because they all read the board the engine cut it at.
      case 'partition-slot':
        return (
          <Field key={key} label="Board">
            <select
              className="cc-input w-full"
              data-partition-slot="1"
              value={partitionSlot(item)}
              title="Which of the project's carcass boards this partition is cut from — measured, in Project setup"
              onChange={(e) => setPartitionSlot(unit.id, item.id, e.target.value)}
            >
              {CARCASS_SLOTS.map((id) => (
                <option key={id} value={id}>{slotById(id)?.label || id}</option>
              ))}
            </select>
          </Field>
        );
      // ─── TURN 30 (CLAUDE.md F3): WHICH FACE THE MACHINE BORES ────────────
      //
      // The owner: a partition shows shelf-pin drilling on BOTH faces, and a
      // machine drills one. It was worse than a picture — the same ladder was
      // emitted twice at identical x and y, once for each bay's shelves — so
      // this is not a display option: choosing a face is choosing which bay's
      // shelves put pins in this board, and the 3-D and the DXF both follow
      // because both read the drilling.
      //
      // LEFT is the profile's answer tonight and the sentence under the
      // control says whose placeholder it is, so nobody reads it as settled.
      case 'partition-drill-face':
        return (
          <Field key={key} label="Drill face">
            <div className="flex items-center gap-1">
              {[['L', 'Left'], ['R', 'Right']].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`cc-btn px-2 text-[11px] ${panel.meta?.drillFace === id ? 'border-gold text-ink-50' : ''}`}
                  data-partition-drill-face={id}
                  title={`Bore the shelf-pin ladder in this divider's ${label.toLowerCase()} face — the ${label.toLowerCase()} bay's shelves. A machine drills one face; the other bay's shelves put no pins in this board.`}
                  onClick={() => setPartitionDrillFace(unit.id, item.id, id)}
                >
                  {label}
                </button>
              ))}
              {item?.drill_face ? (
                <button
                  type="button"
                  className="cc-btn-ghost px-2 text-[11px]"
                  data-partition-drill-face-reset="1"
                  title="Back to the project's own answer"
                  onClick={() => setPartitionDrillFace(unit.id, item.id, null)}
                >
                  Reset
                </button>
              ) : null}
            </div>
          </Field>
        );
      case 'setback':
        return (
          <Field key={key} label="Set back">
            <NumberField
              className="cc-input text-right"
              min={bounds.min}
              max={bounds.max}
              value={Number(panel.meta?.front_mm ?? profile.carcass.shelfDepthClearance)}
              title={`From the face of the cabinet. 0 is flush; ${formatMm(bounds.max)} leaves the shallowest piece worth cutting.`}
              onCommit={(v) => setElementDepth(unit.id, item.id, v)}
            />
          </Field>
        );
      case 'setback-unit':
        return (
          <Field key={key} label="Set back">
            <NumberField
              className="cc-input text-right"
              min={0}
              value={Number(panel.meta?.front_mm) || 0}
              title="From the face of the cabinet. 0 pulls the piece out flush."
              onCommit={(v) => setPartitionFront(unit.id, v)}
            />
          </Field>
        );
      case 'thickness':
        return (
          <Field key={key} label="Thickness">
            <NumberField
              className="cc-input text-right"
              min={profile.editor.mmStep}
              value={item?.thickness_mm ?? G}
              title="This piece only. A shelf carrying a microwave is thicker than the box round it."
              onCommit={(v) => setElementThickness(unit.id, item.id, v)}
            />
          </Field>
        );
      case 'thickness-ep':
        return (
          <Field key={key} label="Thickness">
            <NumberField
              className="cc-input text-right"
              min={1}
              value={endPanel?.thickness || unit.params.front_t || profile.front.thickness}
              title="This panel only — it carries no joint, so it may be any board"
              onCommit={(v) => endPanel && updateEndPanel(unit.id, endPanel.id, { thickness: v })}
            />
          </Field>
        );
      case 'end-panel-height':
        return (
          <Field key={key} label="Height">
            <select
              className="cc-input"
              value={endPanel?.height || 'floor'}
              onChange={(e) => endPanel && updateEndPanel(unit.id, endPanel.id, { height: e.target.value })}
            >
              <option value="floor">To floor</option>
              <option value="unit">Unit height</option>
            </select>
          </Field>
        );
      case 'above-unit-ep':
        return (
          <Field key={key} label="Above unit">
            <div className="flex gap-1">
              <NumberField
                className="cc-input text-right flex-1"
                min={0}
                value={Number(endPanel?.top_mm) || 0}
                title="How far this panel runs above the carcass (mm)"
                onCommit={(v) => endPanel && setEndPanelTop(unit.id, endPanel.id, v)}
              />
              <button
                type="button"
                className="cc-btn px-2"
                title="All the way to the ceiling"
                onClick={() => endPanel && endPanelToCeiling(unit.id, endPanel.id)}
              >
                ▲
              </button>
            </div>
          </Field>
        );
      // ─── Turn 16 (CLAUDE.md F4.3, owner decision B) ─────────────────────
      // The masking panel's OWN height below the carcass. On a wall unit this
      // is the second of the two independent numbers: the door has its extend
      // and the panel has this, and setting either leaves the other exactly
      // where it was — no auto-follow, which is what the owner asked for in as
      // many words. Clamped by the store to what is actually under the carcass
      // (a wall unit's mounting height, a standing unit's legs).
      case 'below-unit-ep':
        return (
          <Field key={key} label="Below unit">
            <NumberField
              className="cc-input text-right"
              data-below-unit="1"
              min={0}
              value={Number(endPanel?.below_mm) || 0}
              title="How far this masking panel runs below the carcass (mm). The door beside it keeps its own extend."
              onCommit={(v) => endPanel && setEndPanelBelow(unit.id, endPanel.id, v)}
            />
          </Field>
        );
      case 'infill-width':
        return (
          <Field key={key} label="Width">
            <span className="cc-input block text-right opacity-70">{formatMm(panel.w)}</span>
          </Field>
        );
      // ─── Turn 16 (CLAUDE.md F9): A FILLER GOES TO THE CEILING TOO ───────
      // The end panel has had the pair since turn 15 — a number and a ▲ that
      // runs it to the ceiling — and the filler beside it had only the number,
      // which is the same gesture learnt once and available in one of the two
      // places it belongs. Same mechanics, not a forked copy: the store's
      // `sideInfillToCeiling` is `setSideInfillTop` with the room's own
      // headroom in it, exactly as `endPanelToCeiling` is.
      case 'above-unit-infill':
        // ─── Turn 17 (CLAUDE.md F6.1): …AND THE TOP FILLER GOES UP TOO ─────
        // The side fillers have had the pair since turn 16 — a number and a ▲
        // that runs the piece to the ceiling — and the piece that most obviously
        // wants it, the one ABOVE a wall unit, was the one branch that returned
        // null. Same mechanics, different number: the store's `setTopInfill`
        // and `fillToCeiling`, which are what the drag on its top edge and the
        // double-click have called since turn 6. Nothing is forked.
        if (panel.meta?.side === 'top') {
          return (
            <Field key={key} label="Above unit">
              <div className="flex gap-1">
                <NumberField
                  className="cc-input text-right flex-1"
                  data-top-infill-mm="1"
                  min={0}
                  value={Number(unit.params.top_infill_mm) || 0}
                  title="How far this filler runs above the carcass (mm). Clamped to the ceiling."
                  onCommit={(v) => setTopInfill(unit.id, v)}
                />
                <button
                  type="button"
                  className="cc-btn px-2"
                  data-top-infill-to-ceiling="1"
                  title="All the way to the ceiling"
                  onClick={() => fillToCeiling(unit.id)}
                >
                  ▲
                </button>
              </div>
            </Field>
          );
        }
        return (
          <Field key={key} label="Above unit">
            <div className="flex gap-1">
              <NumberField
                className="cc-input text-right flex-1"
                min={0}
                value={Number(unit.params[infillSide === 'R' ? 'side_infill_right_top_mm' : 'side_infill_left_top_mm']) || 0}
                title="How far this filler runs above the carcass (mm)"
                onCommit={(v) => setSideInfillTop(unit.id, infillSide, v)}
              />
              <button
                type="button"
                className="cc-btn px-2"
                data-infill-to-ceiling="1"
                title="All the way to the ceiling"
                onClick={() => setSideInfillToCeiling(unit.id, infillSide)}
              >
                ▲
              </button>
            </div>
          </Field>
        );
      case 'pin-infill': {
        if (panel.meta?.side === 'top') return null;
        const pinned = unit.params[infillSide === 'R' ? 'side_infill_right_pinned' : 'side_infill_left_pinned'] === true;
        return (
          <div key={key} className="col-span-2">
            <button
              type="button"
              className={`cc-btn w-full ${pinned ? 'border-gold text-gold' : ''}`}
              title={pinned
                ? 'Pinned — it stays whatever the gap becomes. Click to hand it back to the automatics.'
                : 'Keep this filler whatever the gap becomes — it stretches as the unit moves'}
              onClick={() => setSideInfillPinned(unit.id, infillSide, !pinned)}
            >
              {pinned ? '✓ Pinned' : 'Pin this filler'}
            </button>
          </div>
        );
      }
      case 'carcass-board':
      case 'front-board': {
        const param = boardParamFor(panel);
        const options = param === 'front_t'
          ? profile.front.thicknessOptions
          : profile.board.thicknessOptions;
        return (
          <Field key={key} label={param === 'front_t' ? 'Front board' : 'Carcass board'}>
            <select
              className="cc-input"
              value={unit.params[param]}
              title={param === 'front_t'
                ? 'The board every front of this cabinet is cut from'
                : 'The board the carcass is cut from. The joint is cut FOR it, so it is one board for all four.'}
              onChange={(e) => {
                const { notices } = updateUnitParams(unit.id, { [param]: Number(e.target.value) });
                for (const n of notices) notify(n, 'warn');
              }}
            >
              {options.map((t) => <option key={t} value={t}>{t} mm</option>)}
            </select>
          </Field>
        );
      }
      // ─── Turn 14 (CLAUDE.md F4.2): the door's own property, on the door ───
      // It was in the cabinet's carcass block, three sections away from the
      // thing it is about — which is how the owner came to report it missing.
      // The engine is untouched: `door_extend` is the param it has always been.
      // ─── Turn 16 (CLAUDE.md F4.1): …AND THE NUMBER ─────────────────────
      // The switch has been here since turn 14 and it could only say 38. The
      // ENGINE has taken a number since turn 3 (`door_extend` may be `true` for
      // the profile's default or a millimetre value), so this is the control
      // catching up with it: tick it and it is the profile's 38, type over the
      // number and it is yours. Same clamp rules as every other field in this
      // panel — the workshop's 0.5 mm grid, and never below zero.
      case 'door-extend': {
        const on = Boolean(unit.params.door_extend);
        const extend = doorExtendMm(unit.params, profile) || profile.wallUnit.doorExtend;
        return (
          <div key={key} className="col-span-2 space-y-1">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-ink-100 flex-1">
                <input
                  type="checkbox"
                  data-door-extend="1"
                  checked={on}
                  onChange={(e) => updateUnitParams(unit.id, {
                    door_extend: e.target.checked ? extend : false,
                  })}
                />
                <span>Door extend</span>
              </label>
              <NumberField
                className="cc-input w-20 text-right"
                data-door-extend-mm="1"
                min={0}
                disabled={!on}
                value={extend}
                title="How far the front runs below the carcass, in millimetres"
                onCommit={(v) => updateUnitParams(unit.id, { door_extend: v > 0 ? v : false })}
              />
            </div>
            <p className="text-[11px] text-ink-400" data-door-height={doorHeightOf(unit.params, profile)}>
              The front runs this far below the carcass — the handleless grab edge. Every door of this
              cabinet, because they are cut as a set. This door is{' '}
              <span className="text-ink-100">{formatMm(doorHeightOf(unit.params, profile))} mm</span> tall;
              a masking panel beside it keeps its own height.
            </p>
          </div>
        );
      }
      // ─── Turn 17 (CLAUDE.md F7.2): THE HINGES, BY HAND ──────────────────
      // Add one, take one off, move one — the shelf's own idiom, in the shelf's
      // own control: a numbered row with a millimetre box, and one button each
      // for the two things a joiner does to a set of hinges. The list is the
      // CABINET's, because its doors are drilled as a set and the carcass
      // carries one hinge column per hinged side; the note says so rather than
      // leaving a joiner to discover it by editing the other leaf.
      case 'hinges': {
        const rows = hingeRowsOf(unit.id);
        const own = Array.isArray(unit.params.hinge_rows) && unit.params.hinge_rows.length;
        if (!rows.length) return null;
        return (
          <div key={key} className="col-span-2 space-y-1" data-hinge-rows="1">
            <div className="cc-row">
              <span className="cc-label flex-1">Hinges · {rows.length}</span>
              {own && (
                <button
                  type="button"
                  className="cc-btn px-2"
                  data-hinges-reset="1"
                  title="Back to the kit's own spacing and the project standard"
                  onClick={() => resetHinges(unit.id)}
                >
                  Reset
                </button>
              )}
            </div>
            {rows.map((mm, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={`h${i}`} className="flex items-center gap-1">
                <span className="text-[10px] text-ink-400 w-4 tabular-nums">{i + 1}</span>
                <NumberField
                  className="cc-input text-right flex-1"
                  data-hinge-row={i}
                  value={mm}
                  title="Above the carcass floor. It cannot pass the hinge above or below it."
                  onCommit={(v) => sayHingeResult(setHingePos(unit.id, i, v), notify)}
                />
                <button
                  type="button"
                  className="cc-btn-ghost px-2"
                  data-hinge-remove={i}
                  title="Take this hinge off"
                  onClick={() => removeHinge(unit.id, i)}
                >
                  −
                </button>
              </div>
            ))}
            <button
              type="button"
              className="cc-btn w-full"
              data-hinge-add="1"
              title="One more hinge, in the biggest gap in the run"
              onClick={() => sayHingeResult(addHinge(unit.id), notify)}
            >
              + Add a hinge
            </button>
            <p className="text-[11px] text-ink-400">
              This cabinet’s hinges — both leaves, because they are drilled as a set. Editing them here
              turns the project standard off for this cabinet; Reset hands it back.
            </p>
          </div>
        );
      }
      case 'masking-depth':
        return (
          <Field key={key} label="Depth">
            <span className="cc-input block text-right opacity-70">{formatMm(panel.box?.d ?? panel.h)}</span>
          </Field>
        );
      case 'hinge-side':
        return (
          <Field key={key} label="Hinge side">
            <select
              className="cc-input"
              value={unit.params.hinge}
              onChange={(e) => updateUnitParams(unit.id, { hinge: e.target.value })}
            >
              <option value="L">Left</option>
              <option value="R">Right</option>
            </select>
          </Field>
        );
      // ─── Turn 17 (CLAUDE.md F8.2): THE DRAWER'S HEIGHT, EDITED ──────────
      // It was a read-only number. It is the shelf's own control now — type a
      // millimetre, the store clamps it to the owner's rule and the drawers
      // nobody has touched take up what is left in the kit's ratio. The piece
      // is found by its drawer INDEX, so the field is the same on the front and
      // on the box behind it: with the fronts off, the box is what you click.
      case 'drawer-height': {
        const n = Number(panel.meta?.drawer);
        if (!Number.isFinite(n) || n < 1) {
          return (
            <Field key={key} label="Front height">
              <span className="cc-input block text-right opacity-70">{formatMm(panel.h)}</span>
            </Field>
          );
        }
        const own = Array.isArray(unit.params.drawer_heights) && unit.params.drawer_heights.length;
        const heights = unit.params.drawer_heights || [];
        const value = Number(heights[n - 1]);
        return (
          <div key={key} className="col-span-2 space-y-1" data-drawer-height={n}>
            <Field label={`Drawer ${n} height`}>
              <div className="flex gap-1">
                <NumberField
                  className="cc-input text-right flex-1"
                  data-drawer-height-mm={n}
                  min={minDrawerFrontHeight(profile)}
                  value={Number.isFinite(value) && value > 0 ? value : panel.h}
                  title={`No shorter than ${formatMm(minDrawerFrontHeight(profile))} mm — the runner screws plus the air under them.`}
                  onCommit={(v) => setDrawerHeight(unit.id, drawerRef(unit, n), v)}
                />
                {own && (
                  <button
                    type="button"
                    className="cc-btn px-2"
                    data-drawer-heights-reset="1"
                    title="Back to the kit's own split"
                    onClick={() => resetDrawerHeights(unit.id)}
                  >
                    Reset
                  </button>
                )}
              </div>
            </Field>
            <p className="text-[11px] text-ink-400">
              The drawers nobody has set take up what is left, in the kit&apos;s own ratio, so the stack
              still fills the face. No shorter than {formatMm(minDrawerFrontHeight(profile))} mm.
            </p>
            {/* ─── Turn 25 (CLAUDE.md F10): SHORT / OVER, in the drawer modal ───
                Naming the number, and not blocking anything. */}
            <UnitWarnings unitId={unit.id} only={DRAWER_WARNING_CODES} compact />
          </div>
        );
      }
      // ─── Turn 18 (CLAUDE.md F6.4): THIS DRAWER'S OWN RUNNER ─────────────
      // Project → unit → drawer, the colour hierarchy exactly. "Project" is
      // not a fourth option: it is what the field says when nobody has
      // overridden it, and clicking the chosen variant again gives the drawer
      // back to the project rather than freezing today's answer onto it.
      //
      // It is HARDWARE and not geometry: the gaps, the pockets and the
      // drilling are identical for both variants, so nothing about this
      // cabinet's cut list moves. What moves is the model on the screen and
      // the article on the order.
      case 'runner-variant': {
        const n = Number(panel.meta?.drawer);
        if (!Number.isFinite(n) || n < 1) return null;
        const own = unit.params.runner_variants?.[String(n)] || null;
        const chosen = resolveRunnerVariant({
          drawer: n, unit, design, profile,
        });
        return (
          <div key={key} className="col-span-2 space-y-1" data-runner-variant-drawer={n}>
            <Field label="Runner">
              <div className="flex gap-1">
                {profile.hardware.runner.movento.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    data-runner-variant-option={v.id}
                    aria-pressed={chosen === v.id}
                    title={`${v.label} — ${v.hint}`}
                    className={`cc-btn px-2 flex-1 ${chosen === v.id ? 'border-gold text-gold' : ''}`}
                    onClick={() => setDrawerRunnerVariant(unit.id, n, own === v.id ? null : v.id)}
                  >
                    {v.id}
                  </button>
                ))}
              </div>
            </Field>
            <p className="text-[11px] text-ink-400">
              MOVENTO {profile.hardware.runner.movento.system}
              {' · '}
              {own ? 'this drawer’s own — click it again for the project’s' : 'the project’s'}
              {'. '}
              Same gaps, same pockets, same drilling either way.
            </p>
          </div>
        );
      }
      case 'plinth-height':
        return (
          <Field key={key} label="Height">
            <span className="cc-input block text-right opacity-70">{formatMm(panel.h)}</span>
          </Field>
        );
      // ─── Turn 14 (CLAUDE.md F4.1) ───
      // "material/colour from the unit palette per turn 13 F3". The LIST was
      // already the palette — the project's carcass slots and its fronts, and
      // deliberately not a decor catalogue — and what it was missing is the
      // half a joiner actually recognises: the colour. Each option now carries
      // its own hex (engine/design.js), so the row shows what it means.
      case 'material':
        return (
          <Field key={key} label="Material">
            <div className="flex items-center gap-1">
              <span
                className="w-4 h-4 rounded border border-shell-600 shrink-0"
                data-element-swatch="1"
                style={{ background: chosen?.hex || 'transparent' }}
                title={chosen?.label || 'Project default'}
              />
              <select
                className="cc-input flex-1"
                data-element-material="1"
                value={materialValue}
                title="This piece only — the project's own palette: its boards, and each of its fronts"
                onChange={(e) => setMaterial(e.target.value)}
              >
                <option value="">Project default</option>
                {/* One row PER TYPE, keyed by the palette's own key — two
                    fronts faced in the same board are two rows with one name,
                    and they stay two choices (F1.3). */}
                {choices.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
          </Field>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      <div className="cc-row">
        <span className="text-xs uppercase tracking-wide text-gold">{elementLabel(panel)}</span>
        <span className="text-[11px] text-ink-400 flex-1 pl-2 text-right font-mono">{panel.id}</span>
      </div>
      <div className="text-[11px] text-ink-400">
        {formatMmPair(panel.w, panel.h)} · {formatMm(panel.thickness)} mm
        {chosen ? ` · ${chosen.label}` : ''}
      </div>

      <div className={compact ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-2 gap-2'}>
        {fields.map(row)}
      </div>

      {/* ─── Turn 14 (CLAUDE.md F8.2): WHAT MAY BE DONE TO IT ───
          Shown in the editor window, which is where a joiner has the piece in
          his hand. Where the physics refuses, it SAYS SO — the #58 pattern: a
          control that is simply absent teaches nothing, and a greyed one with
          no reason teaches less. */}
      {actions && <ElementActions unit={unit} panel={panel} onRemove={removeElement} onMove={moveElement} />}

      {/* Why some pieces have no thickness of their own. Written where the
          question is asked rather than in a document nobody opens: a joiner
          looking for the field is owed the reason it is not there. */}
      {fields.includes('carcass-board') && (
        <p className="text-[11px] text-ink-400">
          The carcass is held together by tabs cut for this board — the tab is one thickness wide and the
          socket is on its centre line. One board for all four, or the joint does not go together.
        </p>
      )}
      {!fields.includes('material') && (
        <p className="text-[11px] text-ink-400">
          This piece is built from the drawers under it. Change the stack to change the piece.
        </p>
      )}
    </div>
  );
}

/**
 * Edit / move / remove, and the reason where the answer is no.
 *
 * The rule is `engine/elements.js elementActions` — pure, and tested there —
 * so this component decides nothing about physics: it draws the answer.
 */
function ElementActions({ unit, panel, onRemove, onMove }) {
  const rules = elementActions(panel);
  const moved = panel.meta?.moved || { x: 0, y: 0, z: 0 };
  return (
    <div className="border-t border-shell-600 pt-2 space-y-1" data-element-actions="1">
      <span className="cc-label">Actions</span>
      {rules.move.allowed ? (
        <div className="grid grid-cols-3 gap-1" data-element-move="1">
          {[['x', 'Across'], ['y', 'Up'], ['z', 'In']].map(([axis, label]) => (
            <label key={axis} className="block">
              <span className="text-[10px] text-ink-400">{label}</span>
              <NumberField
                className="cc-input text-right"
                value={Number(moved[axis]) || 0}
                title={`Offset from where the kit puts this piece, in the cabinet's own ${label.toLowerCase()} direction. 0 puts it back.`}
                onCommit={(v) => onMove(unit.id, panel.id, { ...moved, [axis]: v })}
              />
            </label>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-ink-400">{rules.move.reason}</p>
      )}
      {rules.remove.allowed ? (
        <button
          type="button"
          className="cc-btn w-full text-status-danger"
          data-element-remove="1"
          title="Take this piece off. It leaves the cut list with it."
          onClick={() => onRemove(unit.id, panel.id)}
        >
          Remove this piece
        </button>
      ) : (
        <p className="text-[11px] text-ink-400">
          <span className="text-ink-200">Cannot be removed.</span> {rules.remove.reason}
        </p>
      )}
    </div>
  );
}

/**
 * How this cabinet's drawer `n` (from the floor) is addressed.
 *
 * A WARDROBE's drawers are ITEMS with ids of their own; a BUDR's are a RATIO
 * and have none, so the only handle is the index. The store takes either
 * (turn 17, CLAUDE.md F8.2) — this is the one place that has to know which kit
 * it is looking at, and it decides it from the data rather than from the type.
 */
function drawerRef(unit, n) {
  const item = (unit.params.sections?.[0]?.items || [])
    .filter((i) => i.kind === 'drawer')
    .sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0))[n - 1];
  return item?.id ?? n - 1;
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="cc-label">{label}</span>
      {children}
    </label>
  );
}
