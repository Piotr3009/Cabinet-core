import { StepIcon } from './detail/drawings.jsx';

// ─── T64 F2/F4 · COLUMN 2, THE RAIL — SEVEN STEPS, SEVEN TILES (T66 F2) ────
//
// The owner, 03.09.2026: *"Ludzie nie lubią myśleć — musi być step by step,
// UI friendly and intuitive."* And, on the layout: *"zróbmy wariant B."*
//
// So the rail is no longer six text rows with a hint under each (T59's PSW
// law, kept for the six CATEGORIES a joiner's tool had). It is a narrow
// vertical strip of TILES, in the owner's own order, icon over one
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
 * THE STEPS, IN THE OWNER'S ORDER (CLAUDE.md F2). `word` is what the tile
 * says; `label` is the step's title in column 3 and in the tests.
 *
 * ─── T66 F2 · SIZE IS THE THIRD TILE ───────────────────────────────────────
 *
 * The owner: *"chcę wstawić wszystkie 3 size na początku, a dopiero później
 * carcass board etc."* The three numbers a client already knows — how wide,
 * how tall, how deep — are asked BEFORE any material, because they are the
 * only thing he can measure with a tape and the only thing that decides
 * whether the rest is even possible.
 *
 * It is a STEP OF ITS OWN and INSIDE keeps its name: that decision was taken
 * with him rather than folding a third meaning into a word that already means
 * *shelves, rails and drawers*. So the rail is SEVEN tiles, and its mechanics
 * — the list, the click, the tokens, the tick — are exactly what T59 wrote.
 */
export const CATEGORIES = [
  { id: 'what', label: 'WHAT', word: 'What' },
  { id: 'where', label: 'WHERE', word: 'Where' },
  { id: 'size', label: 'SIZE', word: 'Size' },
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
