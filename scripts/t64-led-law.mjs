// ─── T64 F1.3 · THE LED LAW, RUN FROM ITS OWN FILE ─────────────────────────
//
// `src/3d/LedIcons.jsx` holds two pure functions — `ledIconState` (the
// three states) and `ledIconSlots` (the panel's own list of what can take a
// strip). Node cannot import a `.jsx`, and a second copy of the law in a
// `.js` file would be exactly the drift the classifier exists to catch. So
// this reads the component's SOURCE, cuts the two functions out by their own
// `export function` lines — they are plain JavaScript, no JSX in them — and
// evaluates that text. What the classifier and the test run is the file's
// own code, byte for byte, and a change to the law in the component is a
// change here without anybody copying anything.

import { readFileSync } from 'node:fs';

const SRC = readFileSync(new URL('../src/3d/LedIcons.jsx', import.meta.url), 'utf8');

function cut(name) {
  const start = SRC.indexOf(`\nfunction ${name}(`);
  if (start < 0) throw new Error(`LedIcons.jsx no longer defines ${name}`);
  // The function ends at the first `\n}\n` after its head — both are written
  // with their closing brace on its own line, as every function in this repo.
  const end = SRC.indexOf('\n}\n', start);
  return SRC.slice(start + 1, end + 2);
}

const body = `${cut('ledIconState')}\n${cut('ledIconSlots')}\nreturn { ledIconState, ledIconSlots };`;
// eslint-disable-next-line no-new-func
const law = new Function(body)();

export const { ledIconState, ledIconSlots } = law;
