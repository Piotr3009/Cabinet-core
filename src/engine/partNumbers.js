// ─── THE PART NUMBERS AND THE PART LABELS (chat fix 17.10.2026) ─────────────
//
// The owner, 13:07: *"musimy zaprojektowac naklejki, 44 na A4 bo takie mam,
// kolorami: na przyklad mamy 3 szafy to bedzie 3 kolory, pozniej drugi kolor
// to bedzie kolor elementu, czyli polki, boki, plecy i top and bottom, parami
// ten sam kolor; szuflady nie trzeba bo po co; pozniej napis co to; i
// strzalka co oklejamy."*  13:09, the most important question: does it reach
// VCarve? *"jak nie, to przynajmniej kolory napisow pod kolory szafki"*.
// 13:13: *"zamiast 18 MFC, czyli co to za material, wpisz co to za projekt"*,
// then 13:15: *"moze zamiast H1180 ST37, czego nie chce, ponumerujemy
// wszystkie elementy?"*  13:18: *"ok koduj"*.
//
// So: ONE NUMBER per carcass board, counted through the whole project cabinet
// by cabinet in the element order below, printed on the sticker, in the DXF
// text, on the sheet and (through the same formatter) wherever the part label
// is read. The sticker carries two colours: the CABINET's (one per cabinet, in
// project order) and the ELEMENT's (one per pair: sides with their dividers,
// top with bottom, the shelves, the back). The DXF puts every cabinet's text on
// a layer of its own, LABEL_<cabinet>, with the cabinet's colour index, which
// is how the colour travels to VCarve (an R12 layer has a colour, an entity in
// VCarve wears its layer's). Fronts, drawers and their boxes take no sticker
// and no number; their DXF text still moves to the cabinet's layer so a whole
// cabinet reads in one colour on the nesting.
//
// Every number is profile.labels (the owner's label paper, the two palettes,
// the layer prefix). Pure functions, pure data: no React, no store, no PDF.

const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

/** The labelled kinds, in the order they are numbered inside a cabinet. */
export const LABEL_KIND_ORDER = ['side', 'topbottom', 'shelf', 'back'];

/**
 * Which labelled kind a panel is, or null for a part that takes no sticker
 * (a front, a drawer, a box part, a plinth, an infill).
 *   side       BUL, BUR and a vertical divider (VPART, the wardrobe kit's own
 *              DP): the boards a shelf stands between
 *   topbottom  TOP and BOTTOM: one pair, one colour
 *   shelf      every SHELF (fix or adjustable), and the horizontal boards of
 *              the same family: a drawer stack's PARTITION, the fridge's FIXED
 *   back       BACK
 */
export function labelKindOf(panel) {
  const part = String(panel?.part || '');
  if (part === 'BUL' || part === 'BUR' || part === 'VPART' || part === 'DP') return 'side';
  if (part === 'TOP' || part === 'BOTTOM') return 'topbottom';
  if (part === 'SHELF' || part === 'PARTITION' || part === 'FIXED') return 'shelf';
  if (part === 'BACK') return 'back';
  return null;
}

/** The sticker's name for a part: what it is, in the workshop's words. */
export function partDisplayName(panel) {
  const part = String(panel?.part || '');
  if (part === 'BUL') return 'SIDE L';
  if (part === 'BUR') return 'SIDE R';
  if (part === 'VPART' || part === 'DP') return 'DIVIDER';
  if (part === 'SHELF') {
    const fixed = panel?.meta?.locked === true || String(panel?.meta?.variant || '') === 'fixed';
    return fixed ? 'SHELF FIX' : 'SHELF ADJ';
  }
  if (part === 'PARTITION') return 'PARTITION';
  if (part === 'FIXED') return 'FIXED BOARD';
  return part;
}

/** The settings, defensively read, so a partial profile cannot produce NaN. */
export function labelSettings(profile) {
  const L = profile?.labels || {};
  const S = L.sheet || {};
  return {
    sheet: {
      pageW: num(S.pageW, 210),
      pageH: num(S.pageH, 297),
      cols: Math.max(1, Math.round(num(S.cols, 4))),
      rows: Math.max(1, Math.round(num(S.rows, 11))),
      labelW: num(S.labelW, 48.3),
      labelH: num(S.labelH, 25.4),
      gapX: num(S.gapX, 0),
      gapY: num(S.gapY, 0),
      marginLeft: Number.isFinite(Number(S.marginLeft)) && S.marginLeft !== null ? Number(S.marginLeft) : null,
      marginTop: Number.isFinite(Number(S.marginTop)) && S.marginTop !== null ? Number(S.marginTop) : null,
    },
    unitColours: Array.isArray(L.unitColours) && L.unitColours.length ? L.unitColours : ['#d7263d', '#1f6feb', '#e0a100'],
    unitAci: Array.isArray(L.unitAci) && L.unitAci.length ? L.unitAci.map((v) => num(v, 7)) : [1, 5, 2],
    kinds: L.kinds || {},
    layerPrefix: String(L.dxf?.layerPrefix || 'LABEL_'),
    numberPad: Math.max(1, Math.round(num(L.numberPad, 2))),
  };
}

/** The cabinet's colour and DXF colour index, by its place in the project (cycled). */
export function unitColourOf(index, profile) {
  const s = labelSettings(profile);
  return s.unitColours[((index % s.unitColours.length) + s.unitColours.length) % s.unitColours.length];
}
export function unitAciOf(index, profile) {
  const s = labelSettings(profile);
  return s.unitAci[((index % s.unitAci.length) + s.unitAci.length) % s.unitAci.length];
}

/**
 * The cabinet's colour as the dark CNC sheet shows it: the sticker's hue
 * lifted towards white by `lift` (0 .. 1), so a deep purple or a brown still
 * reads on the glass. The sticker and the DXF keep the palette as it is.
 */
export function unitScreenColourOf(index, profile, lift = 0.35) {
  const hex = unitColourOf(index, profile);
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (v) => Math.round(v + (255 - v) * lift);
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** The element colour and label of a kind. */
export function kindStyleOf(kind, profile) {
  const k = labelSettings(profile).kinds[kind] || {};
  return { label: String(k.label || kind || '').toUpperCase(), colour: String(k.colour || '#555555'), order: num(k.order, 9) };
}

/**
 * The DXF layer a cabinet's text goes on: the prefix and the cabinet's name,
 * reduced to what an R12 layer name may hold (letters, digits, underscore;
 * upper case; a name of nothing becomes UNIT).
 */
export function labelLayerName(unitNum, profile) {
  const s = labelSettings(profile);
  const safe = String(unitNum ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `${s.layerPrefix}${safe || 'UNIT'}`;
}

/** `#07`: the number as the sticker, the sheet and the file print it. */
export function formatPartNo(no, profile) {
  const s = labelSettings(profile);
  return `#${String(Math.max(0, Math.round(Number(no) || 0))).padStart(s.numberPad, '0')}`;
}

/**
 * THE PLAN: every cabinet of the project in its order, every labelled board
 * of each numbered through, the cabinet's colour and layer beside it.
 *
 * @param {Array<{id:string, unitNum:string, panels:object[]}>} units  in project order
 * @param {object} profile
 * @returns {{
 *   total: number,
 *   units: Array<{ id:string, unitNum:string, index:number, colour:string, aci:number, layer:string,
 *                  byPanel: Map<string, {no:number, kind:string}> }>,
 *   byUnit: Map<string, object>,
 * }}
 */
export function partNumberPlan(units, profile) {
  let no = 0;
  const out = [];
  (units || []).forEach((u, index) => {
    const byPanel = new Map();
    const rows = (u.panels || [])
      .map((p) => ({ p, kind: labelKindOf(p) }))
      .filter((x) => x.kind);
    rows.sort((a, b) => (kindStyleOf(a.kind, profile).order - kindStyleOf(b.kind, profile).order)
      || String(a.p.id).localeCompare(String(b.p.id), undefined, { numeric: true }));
    for (const { p, kind } of rows) {
      no += 1;
      byPanel.set(p.id, { no, kind });
    }
    out.push({
      id: u.id,
      unitNum: String(u.unitNum ?? ''),
      index,
      colour: unitColourOf(index, profile),
      screenColour: unitScreenColourOf(index, profile),
      aci: unitAciOf(index, profile),
      layer: labelLayerName(u.unitNum, profile),
      byPanel,
    });
  });
  return { total: no, units: out, byUnit: new Map(out.map((u) => [u.id, u])) };
}

/**
 * The DXF writer's `labels` record for one cabinet of a plan: the text layer,
 * its colour index and the numbers by panel. Null when the plan has no such
 * cabinet (the writer then prints what it always printed).
 */
export function dxfLabelsFor(plan, unitId) {
  const u = plan?.byUnit?.get(unitId);
  if (!u) return null;
  return { layer: u.layer, aci: u.aci, byPanel: new Map([...u.byPanel].map(([id, v]) => [id, v.no])) };
}

/**
 * THE EDGE ARROW: which edges of the part are banded, read off the part's own
 * edging code (the cut list's, in the DRAWN frame: '<' the left edge, '>' the
 * right, '^' the top, 'v' the bottom, '<>^v' all round, '' none), and where
 * the sticker's one arrow points.
 *
 * @returns {{left:boolean,right:boolean,top:boolean,bottom:boolean, arrow:'left'|'right'|'up'|'down'|'all'|'none'}}
 */
export function edgeArrowOf(panel) {
  const code = String(panel?.edging?.code || '');
  const left = code.includes('<');
  const right = code.includes('>');
  const top = code.includes('^');
  const bottom = code.includes('v');
  const n = [left, right, top, bottom].filter(Boolean).length;
  let arrow = 'none';
  if (n === 4) arrow = 'all';
  else if (right) arrow = 'right';
  else if (left) arrow = 'left';
  else if (top) arrow = 'up';
  else if (bottom) arrow = 'down';
  return { left, right, top, bottom, arrow };
}

/**
 * THE STICKERS: one record per numbered board, in number order, with
 * everything the printer needs and nothing it has to work out.
 *
 * @param {Array<{id:string, unitNum:string, panels:object[]}>} units  as partNumberPlan takes them
 * @param {object} profile
 * @returns {Array<object>}  { no, noText, unitNum, unitColour, unitIndex, kind, kindLabel, kindColour,
 *                             panelId, code, name, size, w, h, drawnW, drawnH, edge }
 */
export function labelRecords(units, profile) {
  const plan = partNumberPlan(units, profile);
  const out = [];
  for (const u of units || []) {
    const up = plan.byUnit.get(u.id);
    if (!up) continue;
    const rows = [...up.byPanel].map(([panelId, v]) => ({ panel: (u.panels || []).find((p) => p.id === panelId), ...v }))
      .filter((r) => r.panel)
      .sort((a, b) => a.no - b.no);
    for (const r of rows) {
      const p = r.panel;
      const style = kindStyleOf(r.kind, profile);
      const prefix = `${up.unitNum}-`;
      const code = String(p.id).startsWith(prefix) ? String(p.id).slice(prefix.length) : String(p.id);
      out.push({
        no: r.no,
        noText: formatPartNo(r.no, profile),
        total: plan.total,
        unitId: u.id,
        unitNum: up.unitNum,
        unitIndex: up.index,
        unitColour: up.colour,
        kind: r.kind,
        kindLabel: style.label,
        kindColour: style.colour,
        panelId: p.id,
        code,
        name: partDisplayName(p),
        w: Number(p.w) || 0,
        h: Number(p.h) || 0,
        size: `${fmt(p.w)} x ${fmt(p.h)}`,
        thickness: Number(p.thickness) || 0,
        drawnW: Math.abs(Number(p.cnc?.drawn_w ?? p.w) || 0),
        drawnH: Math.abs(Number(p.cnc?.drawn_h ?? p.h) || 0),
        edge: edgeArrowOf(p),
      });
    }
  }
  return out;
}

const fmt = (v) => {
  const n = Number(v) || 0;
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
};

/**
 * THE SHEET'S GRID: where each of the page's cells stands, in mm from the
 * page's top-left, row by row. A null margin centres the grid on the page.
 *
 * @returns {{ perPage:number, cells:Array<{x:number,y:number,w:number,h:number}>, pageW:number, pageH:number }}
 */
export function labelSheetGrid(profile) {
  const s = labelSettings(profile).sheet;
  const gridW = s.cols * s.labelW + (s.cols - 1) * s.gapX;
  const gridH = s.rows * s.labelH + (s.rows - 1) * s.gapY;
  const left = s.marginLeft == null ? (s.pageW - gridW) / 2 : s.marginLeft;
  const top = s.marginTop == null ? (s.pageH - gridH) / 2 : s.marginTop;
  const cells = [];
  for (let r = 0; r < s.rows; r += 1) {
    for (let c = 0; c < s.cols; c += 1) {
      cells.push({
        x: Math.round((left + c * (s.labelW + s.gapX)) * 1000) / 1000,
        y: Math.round((top + r * (s.labelH + s.gapY)) * 1000) / 1000,
        w: s.labelW,
        h: s.labelH,
      });
    }
  }
  return { perPage: s.cols * s.rows, cells, pageW: s.pageW, pageH: s.pageH };
}

/** The records cut into pages of the paper's size. */
export function labelPages(records, profile) {
  const { perPage } = labelSheetGrid(profile);
  const pages = [];
  for (let i = 0; i < (records || []).length; i += perPage) pages.push(records.slice(i, i + perPage));
  return pages;
}
