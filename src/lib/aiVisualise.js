/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F13 . THE AI VISUALISATION: THE PROMPT, THE REQUEST, THE SIZE GUARD (CLAUDE.md T-CC1b, PART D, law 8)
//
// The owner, 01.11.2026: *"dodac wizualizacje z drugiego kata, render wedlug
// wyboru, wizualizacja AI z renderu, max 3 proby, wybierasz jedna i dodajesz
// do rysunkow, tanie API"*; answer 5: *"przyjmiemy GPT, open AI, zaprojektuj
// polaczenie a jutro zrobie klucz"*.
//
// Cabinet Core never holds a key and never calls OpenAI: ONE request to Joinery
// Core, `POST /api/ai/visualise` through JC's own `apiFetch` (lib/jcApi.js),
// body `{ image, prompt, size, quality }`, ONE picture back. One click of
// Generate in the card (components/drawings/AiVisualCard.jsx) asks at most
// `profile.visuals.aiTries` (3) times, in sequence, with Stop between; nothing
// is kept until the user presses "Use this one", which keeps that one picture
// under `profile.visuals.maxKb` (lib/keepPicture.js) in `project.visuals.ai`.
//
// Pure: the canvas is the browser's and a test hands in its own encoder; the
// store's setVisual is handed in by the card.

import { jcFetch, JC_OFFLINE } from './jcApi.js';
import { dataUrlBytes, visualNumbers } from './visualNumbers.js';
import { keepPicture } from './keepPicture.js';
import { migrateDesign, normaliseHandle, resolveFinishes, sprayFinishLabel, worktopFinishOf } from '../engine/design.js';
import { UNIT_TYPES, resolveTypeId } from '../engine/types.js';

/** JC's endpoint (CLAUDE.md T-CC1b, WHAT JOINERY CORE GIVES). */
export const AI_ENDPOINT = '/api/ai/visualise';
/** The three sizes JC takes; the first is the card's default (PROPOSED). */
export const AI_SIZES = Object.freeze(['1536x1024', '1024x1024', '1024x1536']);
/** The three qualities JC takes; the card's default is 'medium' (PROPOSED). */
export const AI_QUALITIES = Object.freeze(['low', 'medium', 'high']);
export const AI_DEFAULTS = Object.freeze({ size: '1536x1024', quality: 'medium' });
/** JC's prompt wall: at most 2000 characters. */
export const PROMPT_MAX = 2000;
/** The JPEG quality of a downscaled input (CLAUDE.md T-CC1b F13.1). */
const INPUT_JPEG_QUALITY = 0.85;

/**
 * The words a refused call shows when JC sent none of its own. JC's own words
 * (`{ error }`) always win: the card shows them as JC gives them.
 */
export const AI_STATUS_WORDS = Object.freeze({
  401: 'Your Joinery Core session has ended. Sign in to Joinery Core again and come back.',
  403: 'AI visualisation is not open for this account or this company.',
  429: 'The AI pictures for today are spent for this company. Try again tomorrow.',
  503: 'AI visualisation is not configured for this server yet.',
  504: 'The image model did not answer in time. Try again, or try a lower quality.',
});

const uniq = (list) => [...new Set(list.filter(Boolean))];
const joinWords = (list) => (list.length <= 1 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`);

/**
 * What the item is finished in, named as the BOM and the Spraying window name
 * it: every unit's finishes through the ONE resolver (engine/design.js
 * resolveFinishes), so a sprayed front says its RAL name and a decor its decor.
 */
function describeFinishes({ units = [], design = null, profile = null } = {}) {
  const d = migrateDesign(design || {});
  const list = Array.isArray(units) && units.length ? units : [null];
  const fronts = [];
  const carcass = [];
  for (const unit of list) {
    let f = null;
    try { f = resolveFinishes(unit, d, profile); } catch { f = null; }
    if (f?.front?.label) fronts.push(f.front.label);
    if (f?.carcass?.label) carcass.push(f.carcass.label);
  }
  const handle = normaliseHandle(d.fronts?.handle);
  const handleWords = !handle ? null
    : handle.type === 'bar' ? `bar handles${handle.centres ? ` at ${handle.centres} mm centres` : ''}`
      : handle.type === 'knob' ? 'round knobs'
        : 'J-pull handleless fronts, nothing screwed on';
  const worktops = Array.isArray(d.worktops) ? d.worktops : [];
  const sprayed = uniq(worktops.map((w) => { const f = worktopFinishOf(w); return f.finish === 'spray' ? sprayFinishLabel(f.colour) : null; }));
  const worktop = !worktops.length ? null
    : sprayed.length ? `a worktop sprayed in ${joinWords(sprayed)}` : 'a plain worktop';
  return { fronts: uniq(fronts), carcass: uniq(carcass), handle: handleWords, worktop };
}

/**
 * Which room the item stands in, from its own units (chat, 02.11.2026): the
 * library family of each unit's type (engine/types.js) counted, the family with
 * the most units wins; a tie goes to the first of kitchen, bedroom, bathroom;
 * an item with no family at all is a kitchen (30 of the 44 kits are).
 */
export const ROOM_KINDS = Object.freeze(['kitchen', 'bedroom', 'bathroom']);
const ROOM_OF_FAMILY = Object.freeze({ kitchen: 'kitchen', wardrobe: 'bedroom', bathroom: 'bathroom' });
export function roomKindOf(units = []) {
  const count = { kitchen: 0, bedroom: 0, bathroom: 0 };
  for (const u of Array.isArray(units) ? units : []) {
    const t = UNIT_TYPES[resolveTypeId(u?.type)] || UNIT_TYPES[u?.type];
    const room = ROOM_OF_FAMILY[t?.family];
    if (room) count[room] += 1;
  }
  let best = 'kitchen';
  for (const k of ROOM_KINDS) if (count[k] > count[best]) best = k;
  return best;
}

/**
 * The room of one try: the three rooms of the item's kind in
 * `profile.visuals.aiRooms` (lib/visualNumbers.js), try 1 the first, try 2 the
 * second, try 3 the third, so the three pictures of one click stand in three
 * different rooms and the furniture stays the same (the owner, 02.11.2026:
 * *"zeby one byly inne od siebie tylko meble takie same, a jednak srodek inny"*).
 */
export function roomOfAttempt(kind, attempt = 1, numbers = visualNumbers(null)) {
  const rooms = numbers?.aiRooms?.[kind] || numbers?.aiRooms?.kitchen || [];
  const list = Array.isArray(rooms) ? rooms.filter((r) => typeof r === 'string' && r.trim()) : [];
  if (!list.length) return null;
  const k = Math.max(1, Math.floor(Number(attempt) || 1));
  return list[(k - 1) % list.length].trim();
}

/**
 * The prompt JC sends with the picture: a photorealistic interior photograph
 * of THIS furniture, the layout and proportions unchanged, no colour and no
 * material of any part changed from the picture (the owner, 02.11.2026: *"chodzi
 * o to zeby nigdy nie zmienial kolorystyki elementow"*), the fronts and the
 * insides named, the worktop and the handles as named, the room of this try
 * (roomOfAttempt), natural daylight, no people, no text. The carcass decor is
 * named as the INSIDE of the cabinets: named as "the carcasses" it repainted a
 * sprayed side and plinth in the decor (the owner's wardrobe, 02.11.2026). The
 * user's own words (`extra`) are appended; the whole stays under PROMPT_MAX,
 * and it is the user's words that are cut, never the description.
 */
export function buildPrompt({ project = null, design = null, finishes = null, room = null, units = null, profile = null, extra = '', attempt = 1 } = {}) {
  const d = design || project?.design || null;
  const f = finishes || describeFinishes({ units: units || [], design: d, profile });
  const parts = [
    'A photorealistic interior photograph of this exact fitted furniture, as built by a joinery workshop.',
    'Keep the layout, the number of cabinets, doors and drawers, and every proportion exactly as in the picture.',
    'Do not change the colour or the material of any part of the furniture. Every part keeps exactly the colour and material it has in the picture: fronts, sides, end panels, plinths, cornices, worktops and handles.',
  ];
  if (f.fronts?.length) parts.push(`The fronts are finished in ${joinWords(f.fronts)}.`);
  if (f.carcass?.length && joinWords(f.carcass) !== joinWords(f.fronts || [])) parts.push(`The insides of the cabinets are ${joinWords(f.carcass)}.`);
  if (f.worktop) parts.push(`It has ${f.worktop}.`);
  if (f.handle) parts.push(`The fronts carry ${f.handle}.`);
  const scene = roomOfAttempt(roomKindOf(units || []), attempt, visualNumbers(profile));
  if (scene) parts.push(`Set it in ${scene}. Change only the room around the furniture (walls, floor, light and decor); the furniture itself stays exactly as in the picture.`);
  const r = room || project?.room || null;
  const rw = Number(r?.width); const rh = Number(r?.height);
  if (rw > 0 && rh > 0) parts.push(`The room is about ${Math.round(rw)} mm wide and ${Math.round(rh)} mm high.`);
  // The room of the try names its own light; without one the picture stays in daylight.
  parts.push(scene ? 'Realistic materials, light and shadows. No people, no text, no labels, no dimensions.'
    : 'Natural daylight, realistic materials and shadows. No people, no text, no labels, no dimensions.');
  let base = parts.join(' ');
  if (base.length > PROMPT_MAX) base = base.slice(0, PROMPT_MAX);
  const own = String(extra || '').replace(/\s+/g, ' ').trim();
  if (!own) return base;
  const space = PROMPT_MAX - base.length - 1;
  return space > 0 ? `${base} ${own.slice(0, space)}` : base;
}

/** The browser's encoder: the picture drawn on a canvas at `scale` (or to `longPx` on its long side) as JPEG. */
function browserJpegEncoder(doc = null) {
  const d = doc || (typeof document !== 'undefined' ? document : null);
  if (!d || typeof Image === 'undefined') return null;
  return async (src, { quality = INPUT_JPEG_QUALITY, scale = 1, longPx = 0 } = {}) => {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('the browser could not draw the picture'));
      i.src = src;
    });
    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    const k = longPx > 0 ? Math.min(1, longPx / Math.max(w0, h0, 1)) : scale;
    const w = Math.max(1, Math.round(w0 * k));
    const h = Math.max(1, Math.round(h0 * k));
    const canvas = d.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  };
}

/**
 * The size guard: a picture over `aiInputMaxMb` is downscaled to `aiInputLongPx`
 * on its long side as JPEG 0.85 before it is sent; one still over the wall is
 * refused in words and never sent. `{ image, bytes, downscaled, error }`.
 */
export async function prepareInput(image, { numbers = visualNumbers(null), encode = null } = {}) {
  const src = String(image || '');
  if (!/^data:image\/(png|jpe?g)/i.test(src)) return { image: null, bytes: 0, downscaled: false, error: 'Pick a picture first: the left angle, the right angle or your render.' };
  const cap = Number(numbers.aiInputMaxMb) * 1024 * 1024;
  const bytes = dataUrlBytes(src);
  if (bytes <= cap) return { image: src, bytes, downscaled: false, error: null };
  const enc = encode || browserJpegEncoder();
  if (!enc) return { image: null, bytes, downscaled: false, error: 'This browser cannot make the picture smaller, so it is not sent.' };
  let out = null;
  try {
    out = await enc(src, { quality: INPUT_JPEG_QUALITY, longPx: Number(numbers.aiInputLongPx) });
  } catch (err) {
    return { image: null, bytes, downscaled: false, error: `The picture could not be made smaller (${err?.message || 'the browser refused'}), so it is not sent.` };
  }
  const size = dataUrlBytes(out);
  if (!out || size > cap) return { image: null, bytes: size, downscaled: false, error: `The picture is still over ${numbers.aiInputMaxMb} MB, so it is not sent.` };
  return { image: out, bytes: size, downscaled: true, error: null };
}

/** JC's refusal in words: JC's own `{ error }` first, the status's words second, JC_OFFLINE last. */
export function refusalWords(error) {
  if (!error) return null;
  const status = Number(error.status);
  const own = typeof error.message === 'string' && error.message.trim() ? error.message.trim() : '';
  const generic = !own || /^(unauthori[sz]ed|forbidden|too many requests|service unavailable|gateway time-?out|internal server error)$/i.test(own);
  if (!generic) return own;
  return AI_STATUS_WORDS[status] || own || JC_OFFLINE;
}

/**
 * ONE call, ONE picture: `{ image, model, seconds, error, status }`. The input
 * passes the size guard first; the body is exactly `{ image, prompt, size,
 * quality }`. Never throws.
 */
export async function visualise({ image, prompt, size = AI_DEFAULTS.size, quality = AI_DEFAULTS.quality, numbers = visualNumbers(null), encode = null } = {}) {
  const input = await prepareInput(image, { numbers, encode });
  if (input.error) return { image: null, model: null, seconds: null, error: input.error, status: null };
  const body = {
    image: input.image,
    prompt: String(prompt || '').slice(0, PROMPT_MAX),
    size: AI_SIZES.includes(size) ? size : AI_DEFAULTS.size,
    quality: AI_QUALITIES.includes(quality) ? quality : AI_DEFAULTS.quality,
  };
  const res = await jcFetch(AI_ENDPOINT, { method: 'POST', body: JSON.stringify(body) });
  if (res?.error) return { image: null, model: null, seconds: null, error: refusalWords(res.error), status: res.error.status ?? null };
  const data = res?.data || null;
  if (!data || typeof data.image !== 'string' || !/^data:image\//i.test(data.image)) {
    return { image: null, model: null, seconds: null, error: 'Joinery Core answered without a picture.', status: null };
  }
  return { image: data.image, model: data.model ?? null, seconds: data.seconds ?? null, error: null, status: null };
}

/**
 * One click of Generate: up to `tries` calls IN SEQUENCE (the owner: *"max 3
 * proby"*). `onProgress(k, tries)` before each call, `onPicture(picture, k)`
 * as each arrives, `shouldStop()` read between calls (the card's Stop). A
 * refused call ends the run with its words; the pictures already made stay.
 * `{ pictures, error, stopped }`.
 */
export async function generateRun({ tries = 3, call, onProgress = () => {}, onPicture = () => {}, shouldStop = () => false } = {}) {
  const n = Math.max(1, Math.floor(Number(tries) || 1));
  const pictures = [];
  for (let k = 1; k <= n; k += 1) {
    if (shouldStop()) return { pictures, error: null, stopped: true };
    onProgress(k, n);
    const res = await call(k);
    if (res?.error || !res?.image) return { pictures, error: res?.error || 'Joinery Core answered without a picture.', stopped: false };
    const pic = { image: res.image, model: res.model ?? null, seconds: res.seconds ?? null };
    pictures.push(pic);
    onPicture(pic, k);
  }
  return { pictures, error: null, stopped: false };
}

/**
 * "Use this one": the chosen picture kept as a JPEG under `maxKb` and written
 * to the item as `project.visuals.ai = { dataUrl, prompt, at }` through the
 * store's setVisual. Nothing before this is kept. `{ visual, error }`.
 */
export async function keepChosen(image, { prompt = '', numbers = visualNumbers(null), encode = null, setVisual, now = () => new Date().toISOString() } = {}) {
  let src = String(image || '');
  const enc = encode || browserJpegEncoder();
  // JC answers a PNG; the item keeps a JPEG (CLAUDE.md T-CC1b F13.2).
  if (/^data:image\/png/i.test(src) && enc) {
    try { src = await enc(src, { quality: INPUT_JPEG_QUALITY, scale: 1 }); } catch { /* keepPicture below says so */ }
  }
  const kept = await keepPicture(src, {
    maxKb: numbers.maxKb,
    encode: enc ? (s, quality, scale) => enc(s, { quality, scale }) : null,
  });
  if (kept.error || !kept.dataUrl) return { visual: null, error: kept.error || 'The picture was not kept.' };
  const visual = { dataUrl: kept.dataUrl, prompt: String(prompt || ''), at: now() };
  if (typeof setVisual === 'function') setVisual('ai', visual);
  return { visual, error: null };
}

/** The sources the card offers, in order: the two angles, the user's render when present. */
export function aiSources(visuals = null) {
  const v = visuals || {};
  const pic = (x) => (typeof x === 'string' ? x : x?.dataUrl) || null;
  const out = [
    { id: 'isoLeft', label: 'Left angle', image: pic(v.isoLeft) },
    { id: 'isoRight', label: 'Right angle', image: pic(v.isoRight) },
  ];
  const render = pic(v.render);
  if (render) out.push({ id: 'render', label: 'Your render', image: render });
  return out;
}
