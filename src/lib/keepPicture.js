/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F8.1 and F13 . A PICTURE KEPT WITH THE ITEM IS KEPT SMALL (CLAUDE.md T-CC1b, PART B)
//
// The owner, 01.11.2026: *"dodac wizualizacje z drugiego kata, render wedlug
// wyboru, wizualizacja AI z renderu, max 3 proby, wybierasz jedna i dodajesz
// do rysunkow"*. The user's render and the chosen AI picture ride the item's
// design (`project.visuals`), saved with it in ONE `cc_save_item`, so each is
// kept as a JPEG data URL under `profile.visuals.maxKb` (400, PROPOSED). A
// picture already under the cap is kept as it is; a bigger one is re-encoded
// as JPEG at a lower quality, then smaller, until it fits. One helper for both
// callers: the Drawings window's Render... (components/DrawingModal.jsx) and
// the AI card's "Use this one" (components/drawings/AiVisualCard.jsx).
//
// The canvas is the browser's; a test hands in `encode(dataUrl, quality,
// scale) -> Promise<string>` so the ladder runs in node without a DOM.

import { dataUrlBytes } from './visualNumbers.js';

/** The ladder, walked in order: the quality first (the size holds), then the size. */
const KEEP_LADDER = Object.freeze([
  [0.85, 1], [0.75, 1], [0.65, 1], [0.55, 1],
  [0.75, 0.75], [0.65, 0.75], [0.6, 0.5], [0.5, 0.5], [0.5, 0.35], [0.45, 0.25],
]);

/** The browser's encoder: the picture drawn at `scale` onto a canvas and written as JPEG at `quality`. */
function browserEncoder(doc) {
  const d = doc || (typeof document !== 'undefined' ? document : null);
  if (!d || typeof Image === 'undefined') return null;
  let loaded = null;
  const load = (src) => {
    if (!loaded) {
      loaded = new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('the browser could not draw the picture'));
        img.src = src;
      });
    }
    return loaded;
  };
  return async (src, quality, scale) => {
    const img = await load(src);
    const w = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
    const h = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
    const canvas = d.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    // A JPEG has no transparency: a white ground, never a black one.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  };
}

/**
 * Keep a picture under `maxKb`: `{ dataUrl, bytes, error }`. Under the cap it
 * is returned as given; over it, re-encoded as JPEG down the ladder until it
 * fits. A picture that cannot be read, or will not fit even at the ladder's
 * foot, answers `dataUrl: null` and the words, never a picture over the cap.
 */
export async function keepPicture(dataUrl, { maxKb, doc = null, encode = null } = {}) {
  const src = String(dataUrl || '');
  if (!/^data:image\//i.test(src)) return { dataUrl: null, bytes: 0, error: 'That is not a picture this window can keep.' };
  const cap = Math.max(1, Number(maxKb) || 0) * 1024;
  const bytes = dataUrlBytes(src);
  if (bytes <= cap) return { dataUrl: src, bytes, error: null };
  const enc = encode || browserEncoder(doc);
  if (!enc) return { dataUrl: null, bytes, error: 'This browser cannot make the picture smaller, so it is not kept.' };
  try {
    for (const [quality, scale] of KEEP_LADDER) {
      const out = await enc(src, quality, scale);
      const size = dataUrlBytes(out);
      if (out && size <= cap) return { dataUrl: out, bytes: size, error: null };
    }
  } catch (err) {
    return { dataUrl: null, bytes, error: `The picture could not be made smaller (${err?.message || err?.name || 'the browser refused'}), so it is not kept.` };
  }
  return { dataUrl: null, bytes, error: `The picture is ${Math.ceil(bytes / 1024)} KB and would not come under ${Math.round(cap / 1024)} KB, so it is not kept.` };
}

/**
 * CHAT FIX 01.11.2026 (the audit of T-CC1b): one of the drawing set's two angles, kept under `maxKb` as the
 * render is. The angles were full 1920 px PNGs: the set's PDF reached 24 MB and, as the AI picture's source,
 * a PNG in base64 passed Vercel's 4.5 MB wall. A picture that cannot be made smaller stays as it was (the set
 * still binds); `null` stays `null`.
 */
export async function keepAngle(dataUrl, { maxKb, doc = null, encode = null } = {}) {
  if (!dataUrl) return null;
  try {
    const kept = await keepPicture(dataUrl, { maxKb, doc, encode });
    return kept.dataUrl || dataUrl;
  } catch {
    return dataUrl;
  }
}
