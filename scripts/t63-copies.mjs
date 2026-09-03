// ─── TURN 63 · THE MANIFEST OF EVERY COPY ──────────────────────────────────
//
// The owner, 01.09.2026, verbatim — the law of this turn:
//
//   *"jak piszę 1 do 1 to KOPIUJ. ale kopiuj — nie kasuj, nie zmieniaj PRO,
//   tylko zrób identycznie w retail."*
//
// ONE list, read by four things: `scripts/t63-copy.mjs` (which MAKES the
// copies), `test/turn63-the-copies.test.js` (which proves each copy carries
// every label, hook, gesture and import of its original), the parity ledger
// (`scripts/t63-parity-ledger.mjs`) and the classifier. A second list anywhere
// is how a copy gets forgotten by one of them.
//
// Every entry: PRO's file, where its copy stands, and WHY it is copied — the
// F it belongs to, or the copy that reaches it (the method's recursive walk:
// *"Any import that lands in src/components/** is copied too, recursively"*).
//
// `Modal.jsx` and `NumberField.jsx` are NOT here. They were copied by T62 into
// `design/room/` and every copy tonight imports THOSE — one copy each, never a
// second (*"Some are already across — reuse those copies, do not make a
// second one"*).

export const T62_COPIES = [
  { pro: 'src/components/Modal.jsx', retail: 'src/retail/design/room/Modal.jsx', why: 'T62 · the shell every window wears' },
  { pro: 'src/components/NumberField.jsx', retail: 'src/retail/design/room/NumberField.jsx', why: 'T62 · the typed millimetre' },
  { pro: 'src/components/RoomModal.jsx', retail: 'src/retail/design/room/RoomModal.jsx', why: 'T62 F2 · the room' },
  { pro: 'src/components/WallElevationModal.jsx', retail: 'src/retail/design/room/WallElevationModal.jsx', why: 'T62 F3 · the wall, seen from the front' },
];

export const T63_COPIES = [
  // ─── F2 · LIGHTING ──────────────────────────────────────────────────────
  { pro: 'src/components/LightingPanel.jsx', retail: 'src/retail/design/lighting/LightingPanel.jsx', why: 'F2 · the lighting panel — brightness, temperature, the five mountings, the depth, the room rig, per-strip on/off' },

  // ─── F3 · THE ELEMENT EDITORS ───────────────────────────────────────────
  { pro: 'src/components/DoorModal.jsx', retail: 'src/retail/design/detail/DoorModal.jsx', why: 'F3 · every piece\'s window — the door and its hinges' },
  { pro: 'src/components/ElementProperties.jsx', retail: 'src/retail/design/detail/ElementProperties.jsx', why: 'F3 · reached by DoorModal (section A, the piece\'s own fields)' },
  { pro: 'src/components/UnitWarnings.jsx', retail: 'src/retail/design/detail/UnitWarnings.jsx', why: 'F3 · reached by ElementProperties' },
  { pro: 'src/components/WatchLayoutModal.jsx', retail: 'src/retail/design/detail/WatchLayoutModal.jsx', why: 'F3 · the watch drawer\'s four layouts, glass and finish' },
  { pro: 'src/components/RailModal.jsx', retail: 'src/retail/design/detail/RailModal.jsx', why: 'F3 · the alone rod\'s own window' },
  { pro: 'src/components/UnitSizeModal.jsx', retail: 'src/retail/design/detail/UnitSizeModal.jsx', why: 'F3 · width and height, typed' },
  { pro: 'src/components/AddItemsModal.jsx', retail: 'src/retail/design/detail/AddItemsModal.jsx', why: 'F3 · the golden + window — the cabinet and what goes inside' },
  { pro: 'src/components/AddItems.jsx', retail: 'src/retail/design/detail/AddItems.jsx', why: 'F3 · reached by AddItemsModal — THE law for what may be added where' },
  { pro: 'src/components/FrontGapModal.jsx', retail: 'src/retail/design/detail/FrontGapModal.jsx', why: 'F3 · the front-gap repair, two options each with its number' },
  { pro: 'src/components/FrontGapWarnings.jsx', retail: 'src/retail/design/detail/FrontGapWarnings.jsx', why: 'F3 · PRO\'s only door into FrontGapModal — the rows over the canvas' },
  { pro: 'src/components/JpullRunModal.jsx', retail: 'src/retail/design/detail/JpullRunModal.jsx', why: 'F3 · the J-pull\'s one slider' },

  // ─── F4 · THE MATERIAL PICKERS ──────────────────────────────────────────
  { pro: 'src/components/DecorPickerModal.jsx', retail: 'src/retail/design/material/DecorPickerModal.jsx', why: 'F4 · the tiled EGGER modal — search, family bar, one click chooses and closes' },
  { pro: 'src/components/DecorPicker.jsx', retail: 'src/retail/design/material/DecorPicker.jsx', why: 'F4 · the in-step decor grid' },
  { pro: 'src/components/ColourPicker.jsx', retail: 'src/retail/design/material/ColourPicker.jsx', why: 'F4 · RAL / F&B / a typed hex' },
  { pro: 'src/components/VeneerPicker.jsx', retail: 'src/retail/design/material/VeneerPicker.jsx', why: 'F4 · the timber list' },
  { pro: 'src/components/MaterialChoicePanel.jsx', retail: 'src/retail/design/material/MaterialChoicePanel.jsx', why: 'F4 · the slot that reads the source→picker law' },
  { pro: 'src/components/ChosenDecorTile.jsx', retail: 'src/retail/design/material/ChosenDecorTile.jsx', why: 'F4 · reached by MaterialChoicePanel — the one chosen tile' },
  { pro: 'src/components/FrontStyleGallery.jsx', retail: 'src/retail/design/material/FrontStyleGallery.jsx', why: 'F4 · the door-style gallery' },
  { pro: 'src/components/WizardHardware.jsx', retail: 'src/retail/design/material/WizardHardware.jsx', why: 'F4 · hinge finish, internal metal, soft-close, push-to-open' },
  { pro: 'src/components/UnitFinishModal.jsx', retail: 'src/retail/design/material/UnitFinishModal.jsx', why: 'F4 · ONE cabinet\'s colour — writes the UNIT, never the project' },
];

export const ALL_COPIES = [...T62_COPIES, ...T63_COPIES];

/** The retail path a PRO component copies to, or null where it is not copied. */
export function retailCopyOf(proPath) {
  return ALL_COPIES.find((c) => c.pro === proPath)?.retail || null;
}

/** Is this retail file a copy of a PRO original? Per file, never per directory. */
export function isCopy(retailPath) {
  return ALL_COPIES.some((c) => c.retail === retailPath);
}
