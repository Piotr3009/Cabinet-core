import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// ─── Every helper a file uses, that file imports (turn 5) ───
//
// This exists because of a bug the whole rest of the suite missed. Turn 5 swept
// `Math.round` out of the UI and put `formatMm()` in its place; one file —
// 3d/Room.jsx — got the calls and not the import. `npm test` was green (no test
// mounts a React component) and `npm run build` was green too, because a bundler
// treats an unknown free identifier as a global and only finds out at runtime.
// The wall labels then took the whole 3D canvas down with them, and the first
// thing that noticed was a browser.
//
// So: for every file in src/, every name that one of OUR OWN modules exports and
// that this file uses as a bare identifier must be imported here or declared
// here. It is a crude check by the standards of a real linter, and it is the one
// this failure needed. Zero dependencies (CLAUDE.md), which is why it is a test
// and not ESLint.

const SRC = new URL('../src/', import.meta.url).pathname;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.(js|jsx)$/.test(path)) out.push(path);
  }
  return out;
}

const FILES = walk(SRC);

/**
 * The DEFAULT exports — the components — kept apart from the rest.
 *
 * They are checked STRICTLY: a default-exported component is used as `<Name />`
 * or `Name(...)` and never as a bare word, and a bare-word test on them finds
 * "Room", "Hardware" and "Cornice" in the app's own English copy.
 */
const DEFAULTS = new Set();

/** Every name exported by any module under src/. */
function exportedNames() {
  const names = new Set();
  for (const file of FILES) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) {
      names.add(m[1]);
    }
    // ─── TURN 31: AND THE DEFAULT EXPORTS ───────────────────────────────────
    //
    // `export default function CheckPanel()` did not match the pattern above,
    // so every COMPONENT in this app was invisible to this test — which is the
    // exact class of bug it was written for, one storey up. Turn 31 caught it
    // the way turn 5 caught the original: a browser said
    // "CheckPanel is not defined" on a build whose `npm test` was green.
    for (const m of text.matchAll(/^export\s+default\s+(?:async\s+)?(?:function|class)\s+([A-Za-z_$][\w$]*)/gm)) {
      DEFAULTS.add(m[1]);
    }
    for (const m of text.matchAll(/^export\s*\{([^}]*)\}/gm)) {
      for (const part of m[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop().trim();
        if (name) names.add(name);
      }
    }
  }
  return names;
}

/** Names this file brings in, plus every name it declares itself. */
function availableIn(text) {
  const have = new Set();

  // import … from '…'
  for (const m of text.matchAll(/import\s+([^'"]+?)\s+from\s*['"]/g)) {
    const clause = m[1];
    const braces = clause.match(/\{([^}]*)\}/);
    if (braces) {
      for (const part of braces[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop().trim();
        if (name) have.add(name);
      }
    }
    const bare = clause.replace(/\{[^}]*\}/g, '').replace(/\*\s+as\s+/g, '');
    for (const part of bare.split(',')) {
      const name = part.trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) have.add(name);
    }
  }

  // Anything declared in this file under the same name is not a missing import.
  for (const m of text.matchAll(/(?:^|\s)(?:export\s+)?(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) {
    have.add(m[1]);
  }
  // …including destructured locals and parameters, which is where most of the
  // false positives would otherwise come from.
  for (const m of text.matchAll(/(?:const|let|var)\s*\{([^}]*)\}\s*=/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/[:=]/)[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) have.add(name);
    }
  }
  for (const m of text.matchAll(/(?:function\s*[\w$]*\s*|\)\s*=>|\(\s*)\{([^{}]*)\}\s*(?:\)|=>|,)/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/[:=]/)[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) have.add(name);
    }
  }
  return have;
}

/**
 * Comments, string literals and the import statements themselves are not USES.
 * A word inside a comment proves nothing, and `import { snap as snapTo }` names
 * `snap` without the file ever calling it.
 *
 * Turn 6 adds template literals to that list, and only just in time: the edge
 * bevel (3d/bevel.js) carries GLSL in backticks, GLSL has a builtin called
 * `clamp`, and so does engine/format.js. The checker read the shader as
 * JavaScript and reported a missing import for a function the file never calls.
 * Stripping a template WHOLE would be the wrong fix — half the components build
 * a className out of `${...}` holes with real code in them — so the static text
 * goes and the interpolations stay.
 */
function stripNonCode(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')
    .replace(/^\s*import\s[\s\S]*?from\s*['"][^'"]*['"];?/gm, ' ')
    .replace(/`(?:\\.|\$\{[^{}]*\}|[^\\`])*`/g, (literal) => {
      const holes = [...literal.matchAll(/\$\{([^{}]*)\}/g)].map((m) => m[1]);
      return holes.length ? `(${holes.join(' , ')})` : "''";
    })
    .replace(/(['"])(?:\\.|(?!\1)[^\\\n])*\1/g, "''");
}

/**
 * Names too short to tell apart from prose. "mm" is a unit, and every panel in
 * the app is captioned in millimetres — the JSX text of half the components
 * contains the word. A two-letter helper is not what this test is for.
 */
const TOO_SHORT = 3;

test('no file uses one of our own exports without importing it', () => {
  const exported = exportedNames();
  assert.ok(exported.has('formatMm'), 'the scan found no exports at all — the test is broken, not the code');

  const problems = [];
  for (const file of FILES) {
    const raw = readFileSync(file, 'utf8');
    const code = stripNonCode(raw);
    const have = availableIn(raw);

    for (const name of exported) {
      if (have.has(name) || name.length < TOO_SHORT) continue;
      // A call, a JSX tag, or a bare identifier that is neither a property
      // access (`x.name`) nor an object key (`name:`).
      const used = new RegExp(`(?<![.\\w$])${name}\\s*\\(`).test(code)
        || new RegExp(`<${name}[\\s/>]`).test(code)
        || new RegExp(`(?<![.\\w$:])${name}(?![\\w$:])`).test(code);
      if (used) problems.push(`${relative(SRC, file)} uses ${name} without importing it`);
    }

    // ─── TURN 31: THE COMPONENTS, STRICTLY ─────────────────────────────────
    for (const name of DEFAULTS) {
      if (have.has(name) || name.length < TOO_SHORT) continue;
      const used = new RegExp(`<${name}[\\s/>]`).test(code)
        || new RegExp(`(?<![.\\w$])${name}\\s*\\(`).test(code);
      if (used) problems.push(`${relative(SRC, file)} uses <${name}> without importing it`);
    }
  }

  assert.deepEqual(problems, [], problems.join('\n'));
});
