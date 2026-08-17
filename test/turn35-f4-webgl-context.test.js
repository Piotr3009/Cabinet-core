// ─── Turn 35, CLAUDE.md F4: WEBGL CONTEXT LOST — diagnose, then guard ──────
//
// The owner's console, 16.08.2026: a wall of `WebGL: INVALID_OPERATION:
// loseContext: context already lost`, a frozen viewport, and *"renderowanie
// zabiera sporo pamięci, bo się zacina."*
//
// THE CAUSE, and it took two of us to make it. `@react-three/fiber` 9.4.0's
// `unmountComponentAtNode` schedules a 500 ms `setTimeout` that calls
// `state.gl.forceContextLoss()`, disposes the scene and de-registers the root.
// Under `<React.StrictMode>` that timer is scheduled by a cleanup React runs on
// a mount that is NOT going away — and the SAME cleanup pass had already sent
// `3d/contextGuard.jsx` to release the context. So: this app killed a live
// context, r3f shot the corpse half a second later (one console line per
// canvas), then disposed the scene the visible tree was still drawing and
// deleted the root registration, after which no later unmount released
// anything and the contexts piled up until Chrome reclaimed them.
//
// What has to be true now, and each of these is a different failure:
//   1. `forceContextLoss` is called by this app at most ONCE per canvas and
//      only while there is a context to lose (turns 20 and 21, still standing);
//   2. a canvas that is still in the document is not an unmount — StrictMode
//      looking twice must not cost a context;
//   3. r3f's late call is defused: swallowed on a canvas that has gone, and
//      STOPPED on one that has not, because everything after it in that timer
//      would land on a live root;
//   4. a loss nobody asked for prevents the default AND asks for the context
//      back, and a restore says so in exactly one console line;
//   5. no fourth `<Canvas>` was introduced, and nothing was taken away.
//
// There is no DOM in node, so the wiring is asserted on SOURCE TEXT the way
// test/turn23-f2-f4-hardware.test.js does — and so, this once, is the pure
// DECISION at the centre of it. `node --test` cannot import a `.jsx`, and this
// module cannot become a `.js`: `3d/Scene.jsx` imports it by name and turns 20
// and 21 read it by name. So `lateLossVerdict` is pinned BYTE FOR BYTE instead
// of being called — an inverted ternary there flips the whole feature, and a
// regex that spells the ternary out catches that exactly as an assertion on the
// return value would.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8');
const guard = () => read('3d/contextGuard.jsx');

// ─── 3 — the decision, pure ────────────────────────────────────────────────

test('F4 — the verdict on a forceContextLoss call is a function of two facts', () => {
  // Three branches, and each is a different failure if it moves:
  //   ours      `release()` raised the flag for exactly one call; three's own
  //             method runs. The ONLY route by which a context is ever dropped.
  //   swallow   somebody else's call against a canvas that has GONE — r3f's
  //             timer after a real unmount. The context went with the canvas;
  //             the call would print the owner's line and do nothing else, so
  //             it is swallowed and r3f's remaining cleanup runs as it should.
  //   stop      somebody else's call against a canvas that is STILL THERE —
  //             StrictMode's simulated unmount, and the tree is alive.
  // The defaults matter too: asked nothing, it assumes nothing.
  assert.match(guard(), new RegExp(
    'export function lateLossVerdict\\(\\{ ours = false, connected = false \\} = \\{\\}\\) \\{\\n'
    + "  if \\(ours\\) return 'through';\\n"
    + "  return connected \\? 'stop' : 'swallow';\\n"
    + '\\}',
  ));
});

test('F4 — and the wrapper spends the permission it was given', () => {
  // `allowForce` is a one-shot: raised by `release`, lowered by the call that
  // uses it AND lowered again after the try, so a `stillLive` that came back
  // false — the branch where the call is never made — cannot leave the door
  // open for r3f's timer half a second later.
  const src = guard();
  assert.match(src, /if \(verdict === 'through'\) \{\n\s*handle\.allowForce = false;\n\s*return native\(\);/);
  assert.match(src, /handle\.allowForce = true;\n\s*try \{/);
  assert.match(src, /\} catch \{ \/\* already gone \*\/ \}\n\s*handle\.allowForce = false;/);
  assert.match(src, /if \(verdict === 'stop'\) throw new Error\(LATE_TEARDOWN_STOPPED\);/);
});

// ─── 1 — turns 20 and 21 still stand ───────────────────────────────────────

test('F4 — forceContextLoss is still only called behind a liveness check', () => {
  const src = guard();
  // Turn 21's split, untouched: the force is guarded by `stillLive`, the
  // dispose is not, because they are two different acts.
  assert.match(src, /const live = stillLive\(handle\);/);
  assert.match(src, /if \(live\) handle\.gl\.forceContextLoss\?\.\(\);/);
  assert.match(src, /handle\.gl\.dispose\?\.\(\);/);
  // Turn 20's idempotence, untouched.
  assert.match(src, /if \(!handle \|\| handle\.releasing\) return;/);
  assert.match(src, /handle\.releasing = true;/);
  // The app's OWN calls, counted: `release` is the only place in the whole of
  // src/ that reaches for `forceContextLoss` at all, wrapper aside.
  const callers = readdirSync(new URL('../src/', import.meta.url), { recursive: true })
    .filter((f) => typeof f === 'string' && /\.(js|jsx)$/.test(f))
    .filter((f) => read(f).includes('forceContextLoss'));
  assert.deepEqual(callers, ['3d/contextGuard.jsx'], 'one file, one release path');
});

// ─── 2 — a simulated unmount is not an unmount ─────────────────────────────

test('F4 — a canvas that is still in the document keeps its context', () => {
  const src = guard();
  // The question is asked INSIDE `release`, in front of everything else, so
  // both callers of it — the hook's cleanup and the ref swapping elements —
  // go through it and neither has to remember.
  assert.match(src, /function release\(handle\) \{\n\s*if \(!handle \|\| handle\.releasing\) return;\n[\s\S]{0,600}?if \(handle\.canvas\?\.isConnected\) \{ releaseWhenGone\(handle\); return; \}/);
  // …and it is a DEFERRAL, not a refusal: if some path ever ran the cleanup
  // before React took the element out, the context is still given back one
  // task later rather than leaked.
  assert.match(src, /function releaseWhenGone\(handle\) \{[\s\S]*?if \(!handle\.canvas\?\.isConnected\) release\(handle\);/);
  // The hook's cleanup line itself does not change — the release still belongs
  // to the owner's unmount (turn 20's finding, and its test pins this line).
  assert.ok(src.includes('useEffect(() => () => { release(held.current); held.current = null; }, [name]);'));
  // And the ref hands back the handle that already guards the element, so the
  // re-attach after a simulated unmount does not count a second context or
  // hang a second pair of listeners on one canvas.
  assert.match(src, /const GUARDED = new WeakMap\(\);/);
  assert.match(src, /const already = GUARDED\.get\(canvas\);\n\s*if \(already && !already\.releasing\) return already;/);
  assert.match(src, /GUARDED\.set\(canvas, handle\);/);
  assert.match(src, /GUARDED\.delete\(handle\.canvas\);/);
});

// ─── 3 — the line of r3f being defused, named ──────────────────────────────

test('F4 — the wrapper sits on the renderer INSTANCE, and names what it defuses', () => {
  const src = guard();
  // Named in the file rather than in a commit message (the house rule since
  // turn 20): the version, the module, the function, the timer.
  assert.match(src, /@react-three\/fiber` 9\.4\.0/);
  assert.match(src, /unmountComponentAtNode/);
  assert.match(src, /500 ms/);
  assert.match(src, /events-\*\.esm\.js/);
  // An own property on the instance — nothing global is patched, and a
  // renderer this app never adopted is untouched.
  assert.match(src, /gl\.forceContextLoss = guarded;/);
  assert.match(src, /const native = gl\.forceContextLoss\.bind\(gl\);/);
  // Installed once per renderer, however many times `onCreated` lands.
  assert.match(src, /if \(typeof gl\.forceContextLoss !== 'function' \|\| gl\.forceContextLoss\[WRAPPED\]\) return;/);
});

test('F4 — r3f really does put that call inside one try, before the two that bite', () => {
  // The `stop` verdict THROWS, and it only works because r3f wraps the whole
  // late-teardown body in a single try/catch and reaches `forceContextLoss`
  // BEFORE `dispose(state.scene)` and `_roots.delete(canvas)`. That is a fact
  // about a pinned dependency, so it is asserted rather than assumed — the day
  // r3f moves the line, this says so instead of the owner's viewport saying it.
  const dist = new URL('../node_modules/@react-three/fiber/dist/', import.meta.url);
  if (!existsSync(dist)) {
    // SKIPPED AND NOTED (rule 6): a clean-room checkout without an install has
    // nothing to read, and a missing dependency is not a failing law.
    return;
  }
  const file = readdirSync(dist).find((f) => /^events-.*\.esm\.js$/.test(f));
  assert.ok(file, 'r3f ships its unmount in an events-*.esm.js chunk');
  const text = readFileSync(new URL(file, dist), 'utf8');
  const at = text.indexOf('function unmountComponentAtNode(');
  assert.notEqual(at, -1);
  const body = text.slice(at, at + 1600);
  assert.match(body, /setTimeout\(\(\) => \{\s*try \{/, 'one try, around the whole body');
  const force = body.indexOf('forceContextLoss()');
  const scene = body.indexOf('dispose(state.scene)');
  const roots = body.indexOf('_roots.delete(canvas)');
  const caught = body.indexOf('} catch');
  for (const [i, what] of [[force, 'forceContextLoss'], [scene, 'dispose(scene)'], [roots, '_roots.delete'], [caught, 'catch']]) {
    assert.ok(i > 0, `r3f's timer still ${what}s`);
  }
  assert.ok(force < scene && scene < roots && roots < caught,
    'the throw lands before the two calls that would hit a live root');
});

// ─── 4 — prevent the default, ask for it back, say so once ─────────────────

test('F4 — a loss nobody asked for prevents the default and asks for a restore', () => {
  const src = guard();
  const onLost = src.slice(src.indexOf('handle.onLost = (e) => {'), src.indexOf('handle.onRestored'));
  assert.match(onLost, /e\.preventDefault\(\);/, 'prevented, which is what makes it restorable');
  // Ours is not an incident and is never restored — it is a teardown.
  assert.match(onLost, /if \(!handle\.releasing && !DELIBERATE\.has\(handle\.canvas\)\) \{[\s\S]*?restoreLater\(handle\);/);
  assert.ok(onLost.indexOf('e.preventDefault();') < onLost.indexOf('restoreLater(handle);'));
  // The extension is taken while the context is ALIVE: `getExtension` on a
  // context that has gone answers null, and there would be nothing to ask with.
  assert.match(src, /handle\.loseExt = gl\.getContext\?\.\(\)\?\.getExtension\?\.\('WEBGL_lose_context'\) \|\| null;/);
  // …and asked for on the NEXT task, because the spec forbids restoring from
  // inside the handler; and not forever, because a driver saying no must be
  // allowed to mean it.
  assert.match(src, /function restoreLater\(handle\) \{[\s\S]*?handle\.restores >= MAX_RESTORES\) return;/);
  assert.match(src, /setTimeout\(\(\) => \{\n\s*try \{ handle\.loseExt\.restoreContext\(\); \}/);
  assert.match(src, /const MAX_RESTORES = 3;/);
});

test('F4 — a restore is ONE console line, and it names the surface', () => {
  const src = guard();
  const onRestored = src.slice(src.indexOf('handle.onRestored = () => {'));
  const body = onRestored.slice(0, onRestored.indexOf('\n  };'));
  const lines = body.match(/console\.\w+\(/g) || [];
  assert.equal(lines.length, 1, 'one line, not two — a console that repeats itself is noise');
  assert.match(body, /console\.info\(`\[cabinet-core\] WebGL context restored — the \$\{name\} canvas is live again\.`\)/);
  assert.match(body, /diag\.restored \+= 1;/);
  // The whole module speaks exactly once, and only about a restore.
  assert.equal((src.match(/console\.\w+\(/g) || []).length, 1);
});

// ─── 5 — one canvas per surface, and nothing removed ───────────────────────

test('F4 — three canvases, the same three, each guarded by name', () => {
  const files = readdirSync(new URL('../src/', import.meta.url), { recursive: true })
    .filter((f) => typeof f === 'string' && /\.(js|jsx)$/.test(f));
  // Comment lines are not canvases — `3d/contextGuard.jsx` shows the caller how
  // to use the hook, and that example must not read as a fourth surface.
  const code = (f) => read(f).split('\n').filter((l) => !/^\s*(\*|\/\/)/.test(l)).join('\n');
  const sites = files.filter((f) => /<Canvas[\s>]/.test(code(f))).sort();
  assert.deepEqual(sites, [
    '3d/Scene.jsx', 'components/CabinetEditorModal.jsx', 'components/PartDetailModal.jsx',
  ], 'no fourth <Canvas> was introduced by this turn');
  for (const [rel, name] of [
    ['3d/Scene.jsx', 'room'],
    ['components/CabinetEditorModal.jsx', 'editor'],
    ['components/PartDetailModal.jsx', 'part-detail'],
  ]) {
    const src = read(rel);
    assert.ok(src.includes(`useContextGuard('${name}')`), `${rel} guards its canvas`);
    assert.ok(src.includes('ref={guardContext.ref}'), `${rel} hangs it off the element`);
    assert.ok(src.includes('onCreated={guardContext.onCreated}'), `${rel} hands over its renderer`);
  }
});

test('F4 — the room canvas outlives a screen flip, which is where "one canvas" is kept', () => {
  // The 3D scene is NOT unmounted by the CNC view — it is drawn over. The
  // comment is turn 12's and the law is what the walk's ten flips assert; a
  // `viewMode === '3d' && <Scene` here would build and drop a context per flip.
  const page = read('pages/ConfiguratorPage.jsx');
  assert.match(page, /<Scene onCaptureReady=\{onCaptureReady\} onRenderReady=\{onRenderReady\} \/>/);
  assert.doesNotMatch(page, /viewMode === '3d' && \s*<Scene/);
  assert.match(page, /\{viewMode === 'cnc' && <CncView \/>\}/);
  // The editor's single-slot unmount was LOOKED AT and left, with the reason
  // written down where the next person will look for it (F4's brief allows the
  // decision either way; what it does not allow is silence).
  assert.match(page, /TURN 35 \(CLAUDE\.md F4\): LOOKED AT, AND LEFT/);
  assert.match(page, /\{modal === 'cabinet' && <CabinetEditorModal \/>\}/);
});

test('F4 — nothing was taken away: every counter the walk reads is still fed', () => {
  const src = guard();
  for (const field of ['created', 'released', 'lost', 'restored', 'events', 'liveContexts']) {
    assert.ok(src.includes(field), `window.__cc.diag.${field}`);
  }
  for (const bump of ['diag.created += 1;', 'diag.released += 1;', 'diag.lost += 1;', 'diag.restored += 1;']) {
    assert.ok(src.includes(bump), bump);
  }
  // Turn 20's suppression of three's own teardown message, and turn 21's
  // three-way liveness question, are both where they were.
  assert.ok(src.includes('const DELIBERATE = new WeakSet();'));
  assert.ok(src.includes('e.stopImmediatePropagation();'));
  assert.ok(src.includes('function stillLive(handle)'));
  assert.ok(src.includes('function loseContextOf(canvas)'));
});

// ─── the counter itself, driven for real ───────────────────────────────────

test('F4 — the diagnosis is readable before a single canvas has mounted', () => {
  // R4: a walk proves a claim by asking the APP. `window.__cc.diag` has counted
  // since turn 20 but is BUILT by the first canvas to mount, so a script that
  // landed earlier could not tell "no contexts" from "no counter". The same
  // object, made on demand, and made ONCE — a walk that resets it and reads it
  // again must not be handed a fresh set of zeros.
  const src = guard();
  assert.match(src, /export function contextDiagnosis\(\) \{\n\s*return contextDiag\(\);\n\}/);
  assert.match(src, /if \(!cc\.diag\) \{/, 'made once, then handed back');
  assert.match(src, /const cc = \(window\.__cc = window\.__cc \|\| \{\}\);/);
  assert.match(src, /export function guardedHandle\(canvas\) \{\n\s*return GUARDED\.get\(canvas\) \|\| null;\n\}/);
});

test('F4 — main.jsx publishes it, and says why StrictMode stays', () => {
  const main = read('main.jsx');
  assert.match(main, /window\.__ccT35 = \{ contextGuard \};/);
  assert.match(main, /import \* as contextGuard from '\.\/3d\/contextGuard\.jsx';/);
  // The wrapper is half of F4's cause and it STAYS — a development check that
  // finds exactly this class of bug, and it found this one. Removing it would
  // have hidden the finding rather than fixed it, and would have deleted a
  // behaviour (iron rule 4).
  assert.match(main, /STRICT MODE STAYS \(turn 35, CLAUDE\.md F4\)/);
  assert.match(main, /<React\.StrictMode>/);
});
