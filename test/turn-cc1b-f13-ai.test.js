/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F13 . THE AI VISUALISATION (law 8). The owner, 01.11.2026: *"wizualizacja AI z renderu, max 3 proby,
// wybierasz jedna i dodajesz do rysunkow, tanie API"*. A fake Joinery Core `apiFetch` on the window answers
// `POST /api/ai/visualise` as T-JC2a's brief says; the card's own roads (Generate, Stop, Use this one, Remove)
// run here exactly as its buttons run them, and the card is drawn as the browser draws it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { register } from 'node:module';

const ESB = new URL('../node_modules/esbuild/lib/main.js', import.meta.url).href;
register(`data:text/javascript,${encodeURIComponent(`
import esb from '${ESB}';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export async function load(url, context, next) {
  const path = url.split('?')[0];
  if (path.endsWith('.css')) return { format: 'module', source: 'export default {};', shortCircuit: true };
  if (path.endsWith('.jsx')) {
    const file = fileURLToPath(path);
    const { code } = esb.transformSync(readFileSync(file, 'utf8'), { loader: 'jsx', jsx: 'automatic', format: 'esm', sourcefile: file });
    return { format: 'module', source: code, shortCircuit: true };
  }
  return next(url, context);
}`)}`, import.meta.url);

const React = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const {
  AI_ENDPOINT, AI_STATUS_WORDS, PROMPT_MAX, buildPrompt, generateRun, keepChosen, prepareInput, refusalWords, visualise,
} = await import('../src/lib/aiVisualise.js');
const { visualNumbers, dataUrlBytes } = await import('../src/lib/visualNumbers.js');
const { getCabinetProfile } = await import('../src/engine/profile.js');
const { visualSheetsOf } = await import('../src/engine/drawings/wallSheets.js');
const { useProjectStore } = await import('../src/stores/projectStore.js');
const { default: AiVisualCard } = await import('../src/components/drawings/AiVisualCard.jsx');

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** A data URL whose payload decodes to about `bytes` bytes. */
const pic = (bytes, mime = 'image/png', ch = 'A') => `data:${mime};base64,${ch.repeat(Math.ceil((bytes * 4) / 3 / 4) * 4)}`;
const KB = 1024;
const MB = 1024 * 1024;

/** The fixture design: fronts sprayed RAL 3005 Wine red, knobs; one base unit. */
const DESIGN = { colour: { front: { hex: '#8a1c2b', name: '3005 Wine red', system: 'RAL' } }, fronts: { handle: { type: 'knob' } } };
const UNITS = [{ id: 'u1', type: 'BASE', params: {} }];
const PROJECT = { id: 'item-1', name: 'Walk kitchen', design: DESIGN, room: { width: 4000, height: 2400 } };

/** A fake JC `apiFetch`: records every call; answers each POST from the `answers` list in turn. */
function fakeJc(answers) {
  const calls = [];
  const before = globalThis.apiFetch;
  globalThis.apiFetch = async (endpoint, options) => {
    calls.push({ endpoint, options, body: JSON.parse(options.body) });
    const a = answers[Math.min(calls.length - 1, answers.length - 1)];
    if (a.status) return { data: null, error: { message: a.message ?? 'Service Unavailable', status: a.status } };
    return { data: { image: a.image, model: 'gpt-image-1', seconds: 9 }, error: null };
  };
  return { calls, restore: () => { if (before === undefined) delete globalThis.apiFetch; else globalThis.apiFetch = before; } };
}

/** The card's Generate, as its onClick runs it (AiVisualCard.jsx `generate`). */
async function clickGenerate({ image, extra = '', shouldStop } = {}) {
  const numbers = visualNumbers(getCabinetProfile());
  const prompt = buildPrompt({ project: PROJECT, design: DESIGN, units: UNITS, profile: getCabinetProfile(), extra });
  const shown = [];
  const run = await generateRun({
    tries: numbers.aiTries,
    call: () => visualise({ image, prompt, size: '1536x1024', quality: 'medium', numbers }),
    onPicture: (p) => shown.push(p),
    shouldStop,
  });
  return { run, shown, prompt };
}

/** A fake JPEG encoder: the picture comes back at `scale * quality * 400 KB`, or at `longPx` as 600 KB. */
function fakeEncoder() {
  const calls = [];
  const encode = async (src, opts) => {
    calls.push(opts);
    if (opts.longPx) return pic(600 * KB, 'image/jpeg', 'J');
    return pic(Math.round(500 * KB * opts.quality * opts.scale), 'image/jpeg', 'J');
  };
  return { calls, encode };
}

function draw(props) {
  const s = useProjectStore;
  const kept = { ...s.getInitialState() };
  Object.assign(s.getInitialState(), s.getState());
  try { return renderToStaticMarkup(React.createElement(AiVisualCard, props)); } finally {
    for (const k of Object.keys(s.getInitialState())) delete s.getInitialState()[k];
    Object.assign(s.getInitialState(), kept);
  }
}

test('F13 · one click of Generate: at most three POSTs, the body is image, prompt, size, quality; the prompt names the fronts', async () => {
  const jc = fakeJc([{ image: pic(200 * KB) }]);
  try {
    const { run, shown } = await clickGenerate({ image: pic(300 * KB) });
    assert.equal(jc.calls.length, 3, 'three tries per click (the owner: "max 3 proby")');
    assert.ok(jc.calls.length <= visualNumbers(getCabinetProfile()).aiTries);
    for (const c of jc.calls) {
      assert.equal(c.endpoint, AI_ENDPOINT);
      assert.equal(c.endpoint, '/api/ai/visualise');
      assert.equal(c.options.method, 'POST');
      assert.deepEqual(Object.keys(c.body).sort(), ['image', 'prompt', 'quality', 'size']);
      assert.equal(c.body.size, '1536x1024');
      assert.equal(c.body.quality, 'medium');
      assert.ok(c.body.prompt.length < PROMPT_MAX, `the prompt is ${c.body.prompt.length} chars`);
      assert.match(c.body.prompt, /RAL 3005 Wine red/, 'the fronts\' colour of the fixture design is named');
      assert.match(c.body.prompt, /knobs/);
      assert.match(c.body.prompt, /no people, no text/i);
    }
    assert.equal(shown.length, 3, 'each picture shown as it arrives');
    assert.equal(run.error, null);
  } finally { jc.restore(); }
});

test('F13 · the user\'s words are appended and the prompt never passes 2000 characters', () => {
  const p = buildPrompt({ project: PROJECT, units: UNITS, profile: getCabinetProfile(), extra: 'oak floor '.repeat(500) });
  assert.ok(p.length <= PROMPT_MAX);
  assert.match(p, /RAL 3005 Wine red/, 'the description is kept, the user\'s words are what is cut');
  assert.match(p, /oak floor/);
});

test('F13 · Stop between calls ends the run; the pictures made stay', async () => {
  const jc = fakeJc([{ image: pic(10 * KB) }]);
  try {
    // Stop pressed while the first picture was on its way: read before the second call.
    const { run, shown } = await clickGenerate({ image: pic(10 * KB), shouldStop: () => jc.calls.length >= 1 });
    assert.equal(jc.calls.length, 1);
    assert.equal(run.stopped, true);
    assert.equal(shown.length, 1);
  } finally { jc.restore(); }
});

test('F13 · a 503 after the first picture: one picture shown and JC\'s words; nothing written to the item', async () => {
  useProjectStore.getState().newProject('Walk kitchen');
  const jc = fakeJc([{ image: pic(50 * KB) }, { status: 503, message: 'AI visualisation is not configured for this server yet.' }]);
  try {
    const { run, shown } = await clickGenerate({ image: pic(50 * KB) });
    assert.equal(jc.calls.length, 2, 'the run ends at the refusal');
    assert.equal(shown.length, 1);
    assert.equal(run.error, 'AI visualisation is not configured for this server yet.');
    assert.equal(useProjectStore.getState().project.visuals?.ai, undefined, 'nothing is kept until "Use this one"');
    const html = draw({ project: useProjectStore.getState().project, visuals: { isoLeft: pic(KB) }, initial: { pictures: shown, error: run.error } });
    assert.equal((html.match(/Use this one/g) || []).length, 1);
    assert.match(html, /AI visualisation is not configured for this server yet\./);
  } finally { jc.restore(); }
});

test('F13 · the refusals in JC\'s words: 401, 403, 429, 503, 504', async () => {
  assert.equal(refusalWords({ status: 429, message: 'This company has used its 20 pictures for today.' }), 'This company has used its 20 pictures for today.');
  for (const status of [401, 403, 429, 503, 504]) {
    assert.equal(refusalWords({ status, message: 'Service Unavailable' }), AI_STATUS_WORDS[status]);
    assert.equal(refusalWords({ status }), AI_STATUS_WORDS[status]);
  }
  const jc = fakeJc([{ status: 403, message: 'Cabinet Core opens for owners, admins and managers.' }]);
  try {
    const r = await visualise({ image: pic(KB), prompt: 'x' });
    assert.equal(r.error, 'Cabinet Core opens for owners, admins and managers.');
    assert.equal(r.status, 403);
  } finally { jc.restore(); }
  delete globalThis.apiFetch;
  const off = await visualise({ image: pic(KB), prompt: 'x' });
  assert.match(off.error, /Joinery Core did not answer/);
});

test('F13 · "Use this one" keeps the picture under 400 KB in project.visuals.ai and the set lists "Visualisation, AI"', async () => {
  useProjectStore.getState().newProject('Walk kitchen');
  assert.equal(useProjectStore.getState().project.visuals?.ai, undefined);
  const enc = fakeEncoder();
  const numbers = visualNumbers(getCabinetProfile());
  assert.equal(numbers.maxKb, 400);
  const res = await keepChosen(pic(1.4 * MB), {
    prompt: 'the prompt', numbers, encode: enc.encode,
    setVisual: useProjectStore.getState().setVisual, now: () => '2026-11-01T02:00:00.000Z',
  });
  assert.equal(res.error, null);
  const ai = useProjectStore.getState().project.visuals.ai;
  assert.ok(ai.dataUrl.startsWith('data:image/jpeg'), 'kept as a JPEG');
  assert.ok(dataUrlBytes(ai.dataUrl) <= 400 * KB, `kept at ${dataUrlBytes(ai.dataUrl)} bytes`);
  assert.equal(ai.prompt, 'the prompt');
  assert.equal(ai.at, '2026-11-01T02:00:00.000Z');
  const names = visualSheetsOf({ isoLeft: null, isoRight: null, render: null, ai }).map((s) => s.name);
  assert.ok(names.includes('Visualisation, AI'));
  const html = draw({ project: useProjectStore.getState().project, visuals: { isoLeft: pic(KB), ai } });
  assert.match(html, /data-ai-remove="1"/, 'Remove is offered once a picture is chosen');
  // "Remove", as its button runs it.
  useProjectStore.getState().setVisual('ai', null);
  assert.equal(useProjectStore.getState().project.visuals.ai, undefined);
  assert.ok(!visualSheetsOf(useProjectStore.getState().project.visuals).some((s) => s.name === 'Visualisation, AI'));
});

test('F13 · a 5 MB input is downscaled to 1536 px as JPEG 0.85 before the POST', async () => {
  const jc = fakeJc([{ image: pic(10 * KB) }]);
  const enc = fakeEncoder();
  try {
    const numbers = visualNumbers(getCabinetProfile());
    const big = pic(5 * MB);
    const r = await visualise({ image: big, prompt: 'x', numbers, encode: enc.encode });
    assert.equal(r.error, null);
    assert.deepEqual(enc.calls, [{ quality: 0.85, longPx: 1536 }]);
    assert.equal(jc.calls.length, 1);
    assert.ok(jc.calls[0].body.image.startsWith('data:image/jpeg'));
    assert.ok(dataUrlBytes(jc.calls[0].body.image) <= 4 * MB);
    assert.notEqual(jc.calls[0].body.image, big);
    const small = await prepareInput(pic(MB), { numbers, encode: enc.encode });
    assert.equal(small.downscaled, false, 'a picture under the wall goes as it is');
  } finally { jc.restore(); }
});

test('F13 · the card as drawn: the sources, the defaults 1536x1024 and medium, Generate; never the word for an employee we do not use', () => {
  useProjectStore.getState().newProject('Walk kitchen');
  const html = draw({ project: useProjectStore.getState().project, visuals: { isoLeft: pic(KB), isoRight: pic(KB), render: { dataUrl: pic(KB) }, ai: null } });
  assert.match(html, /AI visualisation/);
  assert.match(html, /data-ai-sources="3"/, 'the left angle, the right angle and the user\'s render');
  assert.match(html, /data-ai-size="1536x1024"/);
  assert.match(html, /data-ai-quality="medium"/);
  assert.match(html, /Add to the prompt/);
  assert.match(html, /data-ai-generate="1"/);
  assert.doesNotMatch(html, /data-ai-remove/);
  const running = draw({ project: useProjectStore.getState().project, visuals: { isoLeft: pic(KB) }, initial: { running: true, progress: 2 } });
  assert.match(running, /Picture 2 of 3/);
  assert.match(running, /data-ai-stop="1"/);
  const noRender = draw({ project: useProjectStore.getState().project, visuals: { isoLeft: null, isoRight: null } });
  assert.match(noRender, /data-ai-sources="2"/);
  for (const rel of ['src/lib/aiVisualise.js', 'src/components/drawings/AiVisualCard.jsx', 'test/turn-cc1b-f13-ai.test.js']) {
    const text = read(rel);
    assert.doesNotMatch(text, new RegExp(['wor', 'ker'].join(''), 'i'), rel);
    assert.doesNotMatch(text, /[\u2013\u2014]/, `${rel}: no em or en dash`);
    assert.match(text, /Copyright \(c\) 2026 Skylon Development Ltd/, `${rel}: the Skylon header`);
  }
  const card = read('src/components/drawings/AiVisualCard.jsx');
  assert.match(card, /generateRun\(/, 'Generate runs the one sequence');
  assert.match(card, /keepChosen\(/, '"Use this one" keeps through the one helper');
  assert.match(card, /setVisual\('ai', null\)/, 'Remove clears the slot');
  assert.doesNotMatch(read('src/lib/aiVisualise.js'), /openai\.com|OPENAI_API_KEY|sk-[A-Za-z0-9]/, 'CC never holds a key and never calls OpenAI');
});
