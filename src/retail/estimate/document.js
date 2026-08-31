import { FRONT_STYLE_OPTIONS } from '../../engine/design.js';
import { decorById, decorLabel } from '../../engine/decors.js';
import { BRAND, BRAND_LINE, PRICE_ON_REQUEST } from '../config.js';

// ─── F5 · THE ESTIMATE DOCUMENT ────────────────────────────────────────────
//
// *"build the estimate document (every design's choices in words + the engine
// params snapshot as JSON)"*.
//
// BOTH HALVES, and they are for different readers. The WORDS are for the
// client and for whoever in the workshop opens the email: a wardrobe described
// the way a person describes one. The SNAPSHOT is for the app: it is the exact
// shape `projectStore.loadProject` takes, so LOAD (F5.3) restores the design
// byte for byte rather than approximately.
//
// AND NO PRICE. F5.1: *"Every price slot reads 'Price on request' … never
// '£0', never '£ —', never a number."* The document says the same, so that a
// forwarded estimate cannot be read as a quotation.

const mmText = (n) => `${Math.round(Number(n) || 0)} mm`;

const styleLabel = (id) => FRONT_STYLE_OPTIONS.find((o) => o.id === id)?.label || id || 'Slab';

const decorText = (finishId) => {
  if (!finishId) return 'workshop default';
  const id = String(finishId).split(':').pop();
  const decor = decorById(id);
  return decor ? decorLabel(decor) : String(finishId);
};

const HANDLE_WORDS = {
  bar: 'Bar handles', knob: 'Knobs', jpull: 'J-pull, handleless',
};

/**
 * One design, in sentences. Reads the SNAPSHOT and nothing else, so the same
 * function describes the wardrobe on the stage and one saved ten minutes ago.
 */
export function describeDesign(snapshot) {
  const project = snapshot?.project || {};
  const unit = snapshot?.units?.[0] || null;
  const params = unit?.params || {};
  const design = project.design || {};
  const items = params.sections?.[0]?.items || [];
  const count = (test) => items.filter(test).length;

  const room = project.room || {};
  const wall = Math.round(Math.abs(room.corners?.[1]?.x ?? 0));
  const slope = (project.wallSlopes || []).find((s) => s.kind === 'slope') || null;

  const partitions = count((i) => i.kind === 'partition');
  const drawers = count((i) => i.kind === 'drawer' && !i.variant && !i.watch_insert);

  const lines = [
    ['The space', slope
      ? `${mmText(wall)} wall, ceiling ${mmText(room.height)}, sloped from `
        + `${mmText(slope.pts?.[0]?.y)} to ${mmText(slope.pts?.[1]?.y)}`
      : `${mmText(wall)} wall, ceiling ${mmText(room.height)}, level`],
    ['Wardrobe', `${mmText(params.width)} wide · ${mmText(params.height)} high · ${mmText(params.depth)} deep`],
    ['Doors', `${partitions + 1}`],
    ['Front style', styleLabel(design.fronts?.style)],
    ['Front finish', decorText(design.fronts?.types?.[0]?.finish_id)],
    ['Carcass finish', decorText(design.carcass?.types?.[0]?.finish_id)],
    ['Handles', HANDLE_WORDS[design.fronts?.handle?.type] || 'None'],
    ['Plinth', mmText(params.leg_height)],
  ];

  const interior = [
    count((i) => i.kind === 'hanger') && `${count((i) => i.kind === 'hanger')} hanging rail`,
    count((i) => i.kind === 'shelf') && `${count((i) => i.kind === 'shelf')} shelves`,
    drawers && `${drawers} drawers`,
    count((i) => i.variant === 'shoe') && 'a shoe drawer',
    count((i) => i.watch_insert === true) && 'a watch drawer',
    count((i) => i.kind === 'pulldown_rail') && 'a pull-down rail',
  ].filter(Boolean);
  lines.push(['Interior', interior.length ? interior.join(' · ') : 'empty']);
  lines.push(['Lighting', project.lighting?.enabled ? 'LED shelf strips' : 'none']);

  return lines.map(([label, value]) => ({ label, value }));
}

/** The one-line summary a row in the estimate column shows. */
export function designSummaryLine(snapshot) {
  const params = snapshot?.units?.[0]?.params || {};
  const items = params.sections?.[0]?.items || [];
  const doors = items.filter((i) => i.kind === 'partition').length + 1;
  const style = styleLabel(snapshot?.project?.design?.fronts?.style);
  return `${mmText(params.width)} × ${mmText(params.height)} · ${doors} door${doors === 1 ? '' : 's'} · ${style}`;
}

/**
 * The whole estimate, ready to be written to a file.
 *
 * @param {object} args
 *   designs  [{ id, name, snapshot }]
 *   details  the quote form's answers, or null
 *   isoDate  passed in, never taken from the clock, so a test can pin it
 */
export function buildEstimateDocument({ designs = [], details = null, isoDate = '1970-01-01' }) {
  return {
    document: 'pbi-estimate',
    version: 1,
    brand: BRAND,
    line: BRAND_LINE,
    date: String(isoDate).slice(0, 10),
    price: PRICE_ON_REQUEST,
    details,
    designs: designs.map((d) => ({
      name: d.name,
      choices: describeDesign(d.snapshot),
      price: PRICE_ON_REQUEST,
      // The engine's own params, exactly as `loadProject` takes them back.
      snapshot: d.snapshot,
    })),
  };
}

/**
 * The mail body — the same words, no snapshot. `capBody` in mail.js is what
 * keeps it under the 2000 characters F5 asks for; this only decides what goes
 * in and in what order, so the FIRST thing cut is never the client's name.
 */
export function estimateMailBody(doc) {
  const out = [];
  if (doc.details) {
    out.push(`${doc.details.name || ''}`.trim());
    out.push(`${doc.details.email || ''}  ${doc.details.phone || ''}`.trim());
    if (doc.details.postcode) out.push(`Postcode: ${doc.details.postcode}`);
    out.push('');
  }
  out.push(`${doc.brand} — estimate request, ${doc.date}`);
  out.push('');
  doc.designs.forEach((d, i) => {
    out.push(`${i + 1}. ${d.name} — ${d.price}`);
    d.choices.forEach((c) => out.push(`   ${c.label}: ${c.value}`));
    out.push('');
  });
  if (doc.details?.message) {
    out.push('Notes:');
    out.push(doc.details.message);
    out.push('');
  }
  out.push('The full estimate, with the exact dimensions, is attached as a file.');
  return out.join('\n');
}
