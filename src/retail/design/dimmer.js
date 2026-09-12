// ─── T68 F7 · LIGHTS ON, NUMBERS OFF ───────────────────────────────────────
//
// The owner: *"jak włączasz światła, to niech znikają wymiary; wyłączysz
// lights, to wracają."*
//
// A lit scene is a PICTURE — it is the frame a client sends to his wife — and
// a picture with 2150 and 568 written across it is a drawing. So the light
// going on takes the figures off, and the light going off puts back exactly
// what was there before, which is the half of the sentence that matters:
// *"wyłączysz lights, to wracają."* REMEMBER, do not reset.
//
// ─── WHY A SUBSCRIBER AND NOT A LINE IN THE BUTTON ─────────────────────────
//
// There is more than one door to the light. The VIEW BAR's LIGHTS opens PRO's
// copied `LightingPanel`, and it is the PANEL's own ON / OFF that writes the
// flag — `useProjectStore.setLighting({ on })`, PRO's own call, in a COPIED
// file that may not be edited. `adapter.setLighting` is a second door and a
// saved design loading with the light already on is a third.
//
// A line in one button would therefore have been a law with holes in it. This
// watches the FLAG instead: whatever turns the light on, the figures go, and
// whatever turns it off, they come back. The pattern is `historyStore`'s, for
// the same stated reason — *"an action that changes the project is undoable by
// construction"* — and the same applies here.
//
// ─── AND PRO IS NOT TOUCHED ────────────────────────────────────────────────
//
// Nothing starts this but `src/retail/main-retail.jsx`. PRO never calls it, so
// a joiner's lights and a joiner's dimensions go on arguing with each other
// exactly as they always have.

import { useProjectStore } from '../../stores/projectStore.js';
import { useUiStore } from '../../stores/uiStore.js';

/** The flags a lit scene puts out, and the setter each is restored through. */
const DIM_FLAGS = [
  ['showDimensions', 'setShowDimensions'],
  ['showFrontDimensions', 'setShowFrontDimensions'],
];

/**
 * What the flags were when the light went on. `null` means the light is off
 * (or was already off when this page loaded) and there is nothing owed back.
 */
let remembered = null;

/** The last value of the flag we acted on, so only a CHANGE is a transition. */
let was = null;

const lightOn = (state) => Boolean(state?.project?.design?.lighting?.on);

/**
 * Apply the law for one value of the light.
 *
 * @param {boolean} on
 * @returns {'darkened'|'restored'|'nothing'} what it did, for the test
 */
export function applyLightsDimLaw(on) {
  const ui = useUiStore.getState();
  if (on) {
    // Already dark? Then the light was already on and this is not a
    // transition — remembering again would remember the darkness itself and
    // the figures would never come back.
    if (remembered) return 'nothing';
    remembered = Object.fromEntries(DIM_FLAGS.map(([flag]) => [flag, Boolean(ui[flag])]));
    for (const [flag, setter] of DIM_FLAGS) if (ui[flag]) ui[setter](false);
    return 'darkened';
  }
  if (!remembered) return 'nothing';
  const back = remembered;
  remembered = null;
  // EXACTLY as they were — including a flag that was already off, so a client
  // who had the front dimensions hidden does not find them showing.
  for (const [flag, setter] of DIM_FLAGS) {
    if (Boolean(useUiStore.getState()[flag]) !== Boolean(back[flag])) ui[setter](back[flag]);
  }
  return 'restored';
}

/** What the law is currently holding, for the proof and for the test. */
export const rememberedDimFlags = () => (remembered ? { ...remembered } : null);

let stop = null;

/**
 * Start watching. Called once from `main-retail.jsx`; safe to call twice.
 * Returns the unsubscribe function, which is what a test uses to leave the
 * global stores as it found them.
 */
export function watchLightsAndDimensions() {
  if (stop) return stop;
  // The page may mount with a design that is already lit — a saved estimate,
  // or a reload — so the law is applied once before anything changes.
  was = lightOn(useProjectStore.getState());
  if (was) applyLightsDimLaw(true);
  stop = useProjectStore.subscribe((state, previous) => {
    const now = lightOn(state);
    if (now === lightOn(previous) && now === was) return;
    if (now === was) return;
    was = now;
    applyLightsDimLaw(now);
  });
  return stop;
}

export function unwatchLightsAndDimensions() {
  if (stop) stop();
  stop = null;
  remembered = null;
  was = null;
}
