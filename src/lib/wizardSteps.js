// ─── THE NEW-PROJECT FLOW'S STEPS (turn 44, CLAUDE.md F1) ───────────────────
//
// The flow's step list and its Back arithmetic. They live here rather than
// inside the component for the reason every rule in this house lives outside
// its surface: a node test can ask them, and a `.jsx` file cannot be imported
// by one.
//
// T44 adds the fifth stop — the WALL — which only a one-wall job ever sees,
// where the room editor is what a whole-room job sees. Back used to be an
// inline `index − (settings && wall ? 2 : 1)`, which was already a special case
// and would have needed a second one tonight. It is a function now, and it
// states the rule instead of computing round it.

// ─── TURN 45 (CLAUDE.md F4 / iron rule 4): STEP 6 IS THE SUMMARY ────────────
//
// *"Wizard step `6. Hardware` REMOVED → replaced by `6. Summary`."* Its four
// questions already live in tab 5.4 — CLAUDE.md says so in as many words — so
// what the wizard's last screen showed was a second copy of a screen the user
// had walked through two clicks earlier, and then a row of two buttons that
// both started the job.
export const WIZARD_STEPS = ['info', 'type', 'scope', 'room', 'wall', 'settings', 'summary'];

/** The steps a project of this scope actually walks. */
export function stepsInScope(scope) {
  return WIZARD_STEPS.filter((s) => {
    if (s === 'room') return scope === 'room';
    if (s === 'wall') return scope === 'wall';
    return true;
  });
}

/** Where Back goes from here — the first step, when there is nowhere behind. */
export function backStep(step, scope) {
  const shown = stepsInScope(scope);
  const i = shown.indexOf(step);
  return shown[Math.max(0, i - 1)];
}
