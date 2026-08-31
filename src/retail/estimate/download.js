// ─── F5 · HANDING THE CLIENT THEIR OWN FILE ────────────────────────────────
//
// R1 has no backend (*"Database and email delivery are R2"*), so SAVE ESTIMATE
// and SAVE IMAGE do the only honest thing available: they give the file to the
// person who made it. An object URL, one click, and the URL is revoked — no
// storage, no upload, nothing left behind.

function saveBlob(blob, filename) {
  if (typeof document === 'undefined') return filename;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Late enough for every browser to have started the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}

export function downloadJson(filename, data) {
  return saveBlob(new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' }), filename);
}

// A PNG needs no helper here: `src/3d/renderCapture.js savePng` is the shared
// core's own one-anchor-one-click, and Stage.jsx calls it (F5.4).

/** LOAD (F5.3) — read a .json the client saved earlier, back into memory. */
export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('That file could not be read.'));
    reader.onload = () => {
      try { resolve(JSON.parse(String(reader.result))); } catch {
        reject(new Error('That file is not an estimate this site wrote.'));
      }
    };
    reader.readAsText(file);
  });
}

/**
 * `pbi-estimate-2026-08-31.json`. The date comes from the caller so that a
 * test can pin it and the file name is never a surprise.
 */
export const estimateFilename = (isoDate) => `pbi-estimate-${String(isoDate).slice(0, 10)}.json`;

/** `pbi-<design-name>.png` (F5.4), with the name made safe for a filesystem. */
export const imageFilename = (designName) => {
  const slug = String(designName || 'wardrobe')
    .trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'wardrobe';
  return `pbi-${slug}.png`;
};
