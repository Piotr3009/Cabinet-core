import { isDeleteKey } from '../../lib/deleteKey.js';
import { useProjectStore } from '../../stores/projectStore.js';
import { useUiStore } from '../../stores/uiStore.js';
import { removeUnitRefusal } from './adapter.js';

// ─── T64 F1.1 · THE ONE KEYBOARD HANDLER THE RETAIL STAGE HAS ──────────────
//
// The owner, 03.09.2026: *"usuwanie elementów Delete przyciskiem w ogóle
// teraz nie działa."* Diagnosis: in retail only the room modals listened for
// keys; the stage had no keydown handler at all. PRO has one —
// `src/pages/ConfiguratorPage.jsx:160-245` — and the law of the night is
// COPY. So this file is that handler's LOGIC, lifted line for line, with two
// things changed and nothing else:
//
//   • it calls the SAME store actions PRO calls (`removeFront`,
//     `deleteSelectedElement`, `removeUnit`, `clearElement`, `clearSelection`)
//     through the stores directly, as PRO's page does — this is the one
//     retail-authored file besides `adapter.js` that may speak the store,
//     because it IS PRO's handler and a handler is not a screen;
//   • a refusal comes back as a SENTENCE to the caller instead of going to
//     PRO's message queue, because the retail room says its sentences under
//     the stage (T61 F1, `StageHint`).
//
// PRO's same one-level-at-a-time rule holds: Delete removes the SELECTED
// PIECE when there is one, and the cabinet only when the cabinet is what is
// selected. The engine's refusals — a rider host, the last unit, a piece that
// is kit and not item — surface as the store's own sentence
// (`deletePlan.reason`), never as a retail wording.
//
// `isDeleteKey` (`src/lib/deleteKey.js`, shared core) is the guard PRO's key
// wears: inert in an input, a textarea, a select, anything contenteditable,
// and inert under a modifier. `Backspace` rides with it because a Mac's ⌫ IS
// the delete key (turn 34).
//
// THIS IS THE ONLY `keydown` LISTENER THE STAGE HAS. Full screen's Escape and
// the selection's Escape are the same key on the same listener, so the
// answer to the balance's *"how many keyboard handlers does the retail stage
// have?"* is ONE, by construction and by `test/turn64-f1-the-small-things`.

/**
 * What one key press does to the room. Pure over the two stores and the
 * event — the hook below is the four lines that wire it to `window`.
 *
 * @param {KeyboardEvent} e
 * @param {{ fullScreen?: boolean, onExitFullScreen?: () => void, doc?: Document|null }} ctx
 * @returns {{ handled: boolean, said: string, did: string|null }}
 */
export function stageKeyAction(e, { fullScreen = false, onExitFullScreen = null, doc = undefined } = {}) {
  const ui = useUiStore.getState();
  const store = useProjectStore.getState();
  const { selectedElement, selectedUnitId } = ui;

  if (e.key === 'Escape') {
    // PRO: Escape clears one level at a time — the piece first, the cabinet
    // after. Retail's LOOKING MODE (F3.5) is one more level, outermost.
    if (selectedElement) { ui.clearElement(); return { handled: true, said: '', did: 'clear-element' }; }
    if (selectedUnitId) { ui.clearSelection(); return { handled: true, said: '', did: 'clear-selection' }; }
    if (fullScreen && onExitFullScreen) { onExitFullScreen(); return { handled: true, said: '', did: 'exit-fullscreen' }; }
    return { handled: false, said: '', did: null };
  }

  if (!isDeleteKey(e, doc)) return { handled: false, said: '', did: null };

  if (selectedElement) {
    const unit = store.units.find((u) => u.id === selectedElement.unitId);
    const panel = unit ? (store.unitResult(unit.id)?.panels || [])
      .find((p) => p.id === selectedElement.elementRef) : null;
    // ConfiguratorPage.jsx:207 — a DOOR is not an item and takes its own path,
    // through the same store action the door window's button calls.
    if (panel?.part === 'FRONT' && !panel.meta?.appliance) {
      e.preventDefault?.();
      store.removeFront(unit.id, panel.id);
      ui.clearElement();
      return { handled: true, said: '', did: 'remove-front' };
    }
    // ConfiguratorPage.jsx:225 — everything else through ONE action, which asks
    // `engine/deleteElement.js deletePlan` what goes and answers a refusal
    // with a sentence rather than silence.
    if (!panel) return { handled: false, said: '', did: null };
    e.preventDefault?.();
    const res = store.deleteSelectedElement({ unitId: unit.id, elementRef: panel.id });
    if (!res.ok && res.error && res.error !== 'Nothing is selected.') {
      return { handled: true, said: res.error, did: 'refused' };
    }
    return { handled: true, said: '', did: 'delete-element' };
  }

  if (selectedUnitId) {
    // ConfiguratorPage.jsx:236 — the cabinet, when the cabinet is what is
    // selected. Nothing else can take the wardrobe off the stage. PRO's
    // `removeUnit` refuses nothing; the two cases it leaves to a joiner's
    // judgement — a host with a box on it, the last wardrobe — are refused
    // here on the store's own facts (`adapter.removeUnitRefusal`).
    e.preventDefault?.();
    const refusal = removeUnitRefusal(selectedUnitId);
    if (refusal) return { handled: true, said: refusal, did: 'refused' };
    store.removeUnit(selectedUnitId);
    ui.clearSelection();
    return { handled: true, said: '', did: 'remove-unit' };
  }

  return { handled: false, said: '', did: null };
}
