import { StepIcon } from './detail/drawings.jsx';

// ─── T64 F2/F4 · COLUMN 2, THE RAIL — SIX STEPS, SIX TILES ─────────────────
//
// The owner, 03.09.2026: *"Ludzie nie lubią myśleć — musi być step by step,
// UI friendly and intuitive."* And, on the layout: *"zróbmy wariant B."*
//
// So the rail is no longer six text rows with a hint under each (T59's PSW
// law, kept for the six CATEGORIES a joiner's tool had). It is a narrow
// vertical strip of six SQUARE tiles, in the owner's own order, icon over one
// word — the rail of a wizard, which is what the room is for a client now.
// The active tile carries a gold hairline underline, not a filled block
// (gold stays at 5%: hairlines and the active mark only); a done tile a small
// tick. It no longer holds text rows, and the TOTAL / RESET block that stood
// at its foot moved to the top bar (F4) and the REVIEW step.
//
// This is the ONE place CLAUDE.md lets the rail change tonight — *"only its
// content, not its mechanics"*: `CATEGORIES` is the list, `onPick` is the
// click, and both are what T59 wrote. Every dimension is still a token
// (`--pbi-tile`, `--pbi-tile-icon`, `--pbi-tile-fs` in `styles/scale.css`).

/**
 * THE SIX STEPS, IN THE OWNER'S ORDER (CLAUDE.md F2). `word` is what the tile
 * says; `label` is the step's title in column 3 and in the tests.
 */
export const CATEGORIES = [
  { id: 'what', label: 'WHAT', word: 'What' },
  { id: 'where', label: 'WHERE', word: 'Where' },
  { id: 'inside', label: 'INSIDE', word: 'Inside' },
  { id: 'fronts', label: 'FRONTS', word: 'Fronts' },
  { id: 'extras', label: 'EXTRAS', word: 'Extras' },
  { id: 'review', label: 'REVIEW', word: 'Review' },
];

export const stepIndex = (id) => Math.max(0, CATEGORIES.findIndex((c) => c.id === id));

export default function Categories({ active, onPick, done = [] }) {
  return (
    <aside data-testid="column-categories" className="pbi-rail">
      <nav className="pbi-rail-nav" aria-label="Steps">
        {CATEGORIES.map((c, i) => {
          const on = active === c.id;
          const isDone = !on && done.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              className={`pbi-tile${on ? ' is-on' : ''}${isDone ? ' is-done' : ''}`}
              data-testid={`cat-${c.id}`}
              data-done={isDone ? 'yes' : 'no'}
              aria-current={on ? 'step' : undefined}
              title={`${i + 1}. ${c.label}`}
              onClick={() => onPick(c.id)}
            >
              <StepIcon step={c.id} />
              <span className="pbi-tile-word">{c.word}</span>
              {isDone ? <span className="pbi-tile-tick" aria-label="done">✓</span> : null}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
