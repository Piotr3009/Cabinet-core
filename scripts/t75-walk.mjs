#!/usr/bin/env node
// T75 · THE ACCEPTANCE WALK, PART A (CORNERS) AND PART B (THE ISLAND)
//
// CLAUDE.md T75, LAWS: *"Test the way the client clicks.
// `scripts/t75-walk.mjs` (T74's pattern) uses a REAL mouse and the REAL
// buttons; the store is only read."*  And F8: *"Walk, real mouse: (a) base run
// into a corner + second run: post, clearance, hinge; (b) BLIND_BASE at the
// corner, second run lands on the stop, blank width equals the arithmetic;
// (c) CORNER_L_BASE in a corner with a run on each side, doors A and B,
// worktop L; (d) two wardrobes into a corner in retail, `ADD CORNER WARDROBE`;
// (e) CUT CORNER on a wardrobe 200 x 200 BL, the side's sockets re-planned
// (table), the cut list shows the RETURN board; (f) pull each one away, all
// gone."*
//
// Every gesture below is the browser's own input pipe (CDP
// `Input.dispatchMouseEvent` / `Input.dispatchKeyEvent`), aimed at a pixel
// where the scene's own raycaster says the piece IS the nearest thing under
// the pointer and the page says the canvas owns it (`t75-harness.mjs
// reachFree`, T74's `reach` with that one law more), or at a DOM control's
// centre. The store is READ to say what happened; it is never written to make
// something happen. Where the app offers no control for a gesture the walk
// says so as a NOTE and does not stand a store call in for the click.
//
// THE STAGE. PRO opens on its start screen; T74's `pro()` sets the stage the
// way `scripts/e2e-turn18.mjs` always has (a new project, the editor's own
// door). That is the stage, not a gesture any check below is about. The room
// is PRO's default, 4000 x 3000: wall 1 runs along x from (0,0), wall 2 up
// from (4000,0), wall 4 back down to (0,0).
//
//   npm run build && npx vite preview --port 4173
//   node scripts/t75-walk.mjs --fresh f02 f03     start a ledger, run two
//   node scripts/t75-walk.mjs f04                 add to it (a rerun replaces its section)
//   E2E_URL=http://127.0.0.1:4183/ node scripts/t75-walk.mjs ...  another port
//
// Sections: f02 f03 f04 f05 f06 f07 f03r f08 f09 f10 f11 (all when none named).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {
  open, pro, room, withWardrobe, roomView, unitsNow, showroomDown, settleCamera,
} from './t74-harness.mjs';
import {
  key, clickWith, boxOf, library, choose, dragAlong, helperAt, until, reachFree, orbitFree, figureFree,
} from './t75-harness.mjs';

const SHOTS = new URL('../verify/t75/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const ORDER = ['f02', 'f03', 'f04', 'f05', 'f06', 'f07', 'f03r', 'f08', 'f09', 'f10', 'f11'];
const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const runs = (name) => want.length === 0 || want.includes(name);

// ─── THE LEDGER'S HANDS (T74's, with the section named on every line) ────────
const steps = [];
let current = '';
// The app's older sentences carry en and em dashes; the ledger quotes them
// with the dash ESCAPED, so the file this turn writes stays dash-free
// (CLAUDE.md LAWS) and the quote stays true (T74's `undash`).
const undash = (t) => String(t).replace(/\u2014/g, '\\u2014').replace(/\u2013/g, '\\u2013');
const check = (label, ok, detail = '') => {
  const d = undash(detail);
  steps.push({
    section: current, label: undash(label), ok: Boolean(ok), detail: d,
  });
  process.stdout.write(`${ok ? '  ok' : 'FAIL'}  ${undash(label)}${d ? ` · ${d}` : ''}\n`);
};
const note = (label, detail = '') => {
  const d = undash(detail);
  steps.push({
    section: current, label: undash(label), ok: true, detail: d, note: true,
  });
  process.stdout.write(`  ·   ${undash(label)}${d ? ` · ${d}` : ''}\n`);
};
const begin = (name, title) => {
  current = name;
  steps.push({ section: name, header: title });
  process.stdout.write(`\n=== ${name.toUpperCase()} · ${title} ===\n`);
};
const shot = (page, file) => page.screenshot(`${SHOTS}${file}`);
/** A frame of the scene: PRO's right panel folded away by its own X first, so the corner is seen. */
async function framed(page, file) {
  for (const sel of ['button[title="Close panel"]', 'button[title="Close"]']) {
    if (await page.has(sel)) { await page.press(sel); break; }
  }
  await settleCamera(page);
  await shot(page, file);
}
const lastSaid = (page) => page.ask('(() => { const m = window.__cc.ui.getState().messages || []; return m.length ? m[m.length - 1].message : null; })()');
const pageErrors = (page) => page.errors.filter((e) => !/props\/manifest\.json|favicon|hardware-local|showroom|ERR_TUNNEL_CONNECTION_FAILED|supabase\.co/i.test(e));

// ─── WHAT THE WALK READS ──────────────────────────────────────────────────
const S = 'window.__cc.project.getState()';
const PROFILE = 'window.__cc.profile.getState().profile';
const unitOf = (page, id) => page.ask(`(() => { const P = ${S}; const u = P.units.find((x) => x.id === ${JSON.stringify(id)});
  if (!u) return null; const r = P.unitResult(u.id);
  const leaves = r.panels.filter((p) => p.part === 'FRONT');
  const plinth = r.panels.find((p) => p.id === 'PLINTH');
  const blank = r.panels.find((p) => p.role === 'blind_blank');
  return { id: u.id, type: u.type, num: u.params.unit_num, wall: u.position.wall ?? 0, x: u.position.x_mm,
    w: u.params.width, d: u.params.depth, h: u.params.height, frontT: u.params.front_t,
    wallGap: (u.params.wall_gap != null && u.params.wall_gap !== '') ? Number(u.params.wall_gap) : Math.max(0, Number((${PROFILE}.room || {}).wallBackClearance) || 0),
    island: u.position.island || null, face: u.position.face || null,
    postL: u.params.corner_post_left_mm ?? null, postR: u.params.corner_post_right_mm ?? null,
    posts: r.panels.filter((p) => p.role === 'corner_post').map((p) => p.id + ' ' + p.box.w + 'x' + p.box.h + ' at x ' + p.box.x),
    leaves: leaves.map((p) => p.id + ':' + ((p.meta && p.meta.hinge) || '?')),
    leafBoxes: leaves.map((p) => ({ id: p.id, x: p.box.x, w: p.box.w, z: p.box.z, d: p.box.d, hinge: p.meta && p.meta.hinge,
      opensFirst: Boolean(p.meta && p.meta.opensFirst), note: (p.meta && p.meta.note) || null, cornerEdge: p.meta && p.meta.cornerEdge ? JSON.stringify(p.meta.cornerEdge) : null })),
    hingeAuto: u.params.corner_hinge_auto ? JSON.stringify(u.params.corner_hinge_auto) : null,
    plinthOn: u.params.plinth !== false,
    plinth: plinth ? { x: plinth.box.x, w: plinth.box.w, corner: plinth.meta && plinth.meta.corner ? JSON.stringify(plinth.meta.corner) : null } : null,
    blindSide: u.params.blind_side ?? null, blindMm: u.params.blind_mm ?? null, blindOwn: u.params.blind_mm_own ?? null,
    blank: blank ? { id: blank.id, x: blank.box.x, w: blank.box.w, side: (blank.meta && blank.meta.side) || null, holes: r.drills.filter((d) => d.panel === blank.id).length } : null,
    cornerSide: u.params.corner_side ?? null, upstand: u.params.upstand === true,
    notch: u.params.notch ? JSON.stringify(u.params.notch) : null,
    warnings: (r.warnings || []).map((w) => w.code + ': ' + w.message) }; })()`);
const clearanceOf = (page, id) => page.ask(`(() => { const row = ${S}.frontClearances().find((r) => r.unitId === ${JSON.stringify(id)});
  if (!row) return null; const e = (k) => row.edges && row.edges[k] ? { kind: row.edges[k].kind, want: row.edges[k].wantClearanceMm,
    have: row.edges[k].haveClearanceMm, parked: row.edges[k].parked } : null;
  return { left: e('left'), right: e('right') }; })()`);
const profileNum = (page, path) => page.ask(`(() => { let v = ${PROFILE}; for (const k of ${JSON.stringify(path)}.split('.')) v = v == null ? v : v[k]; return v ?? null; })()`);
const wallLength = (page, i) => page.ask(`(() => { const c = ${S}.project.room.corners; const a = c[${i}]; const b = c[(${i} + 1) % c.length]; return Math.hypot(b.x - a.x, b.y - a.y); })()`);
const worktopsNow = (page) => page.ask(`${S}.worktopsOf().map((w) => ({ slab: w.slabId || w.id, wall: w.geometry && w.geometry.wall,
  x: w.geometry && w.geometry.x, w: w.geometry && w.geometry.w, d: w.geometry && w.geometry.d, island: w.island || (w.record && w.record.island) || null,
  kind: w.kind || (w.record && w.record.kind) || null, outline: Boolean(w.outline || (w.geometry && w.geometry.outline)),
  shape: (w.geometry && w.geometry.shape) || null, points: ((w.geometry && w.geometry.outline) || w.outline || []).length,
  extend: w.record && w.record.extend ? JSON.stringify(w.record.extend) : null,
  joint: w.joint ? JSON.stringify(w.joint) : null, cutouts: (w.cutouts || []).map((c) => c.kind + ' ' + c.w + 'x' + c.d + ' r' + c.r + ' machined ' + c.machined + ' ' + c.readiness) }))`);
const recordsNow = (page) => page.ask(`(${S}.project.design.worktops || []).map((w) => ({ id: w.id, units: w.unitIds.length, kind: w.kind || null, island: w.island || null,
  extend: w.extend ? JSON.stringify(w.extend) : null }))`);

// ─── THE PANEL'S CONTROLS, FOUND THE WAY AN EYE FINDS THEM ─────────────────
const selectAfter = (label) => `[...document.querySelectorAll('select')].find((s) => s.offsetParent && s.previousElementSibling && s.previousElementSibling.textContent.trim() === '${label}')`;
const WALL_SELECT = selectAfter('Wall');
const HINGE_SELECT = selectAfter('Hinge side');

/** A right-panel section opened by a real click on its header (when shut). */
async function section(page, title) {
  if (await page.has(`[data-section="${title}"][data-open="0"]`)) await page.press(`[data-section="${title}"] > button`);
  return page.has(`[data-section="${title}"][data-open="1"]`);
}
/** The library panel closed by its own X. */
async function closeLibrary(page) {
  if (await page.has('[aria-label="Close the library"]')) await page.press('[aria-label="Close the library"]');
}
/** The ids a hand can grab a cabinet by, best first: a door leaf, the top, a side, the back. */
const grabIds = (page, id) => page.ask(`(() => { const r = ${S}.unitResult(${JSON.stringify(id)});
  const pick = [];
  for (const f of [(p) => p.part === 'FRONT', (p) => p.id === 'TOP', (p) => p.part === 'TOP' || p.part === 'TOP-L', (p) => p.id === 'BUL' || p.id === 'BUR',
    (p) => p.role === 'side', (p) => p.role === 'back', (p) => p.role === 'end_panel' || p.role === 'free_panel' || p.role === 'back_panel']) {
    for (const p of r.panels) if (f(p) && !pick.includes(p.id)) pick.push(p.id);
  }
  return pick.length ? pick : r.panels.map((p) => p.id); })()`);

/**
 * A real drag of a unit along its wall by `mm`, grabbed by the first piece in
 * reach. A hand whose drag did not take (the unit stands where it stood: a
 * leaf still swinging in, a camera still gliding) grabs again by the next
 * piece, as a person tries again; the tries are returned so the ledger can say.
 */
async function drag(page, id, mm) {
  const xOf = () => page.ask(`(${S}.units.find((u) => u.id === ${JSON.stringify(id)}) || { position: {} }).position.x_mm`);
  const tries = [];
  for (const pid of (await grabIds(page, id)).slice(0, 5)) {
    const x0 = await xOf();
    const done = await dragAlong(page, id, pid, mm);
    if (!done) continue;
    tries.push(pid);
    if (Math.abs((await xOf()) - x0) > 0.5) return { ...done, by: tries.join(' then ') };
  }
  return tries.length ? { by: tries.join(' then '), stayed: true } : null;
}
/** A real click on a unit (selects it), on the first piece in reach; Ctrl held when asked. */
async function clickUnit(page, id, modifiers = 0) {
  for (const pid of (await grabIds(page, id)).slice(0, 5)) {
    const at = await reachFree(page, id, pid);
    if (at) { await clickWith(page, at.x, at.y, modifiers); return { ...at, by: pid }; }
  }
  return null;
}
/**
 * A unit SELECTED by a real click on it, its right panel standing (ADD DOORS
 * is "finish unit": it lets the unit go, so a hand that wants the panel again
 * clicks the unit again, as a client does).
 */
async function selectUnit(page, id) {
  const at = await clickUnit(page, id);
  await until(page, `window.__cc.ui.getState().selectedUnitId === ${JSON.stringify(id)} && Boolean(document.querySelector('[data-section="Carcass"]'))`, 4000);
  return at;
}
/** A unit added from the library (the menu, the category, the group's flyout, the row), the panel closed after. */
async function addFromLibrary(page, group, entry, category = 'Kitchen') {
  const before = new Set((await unitsNow(page)).map((u) => u.id));
  const ok = await library(page, { category, group, entry });
  const added = (await unitsNow(page)).filter((u) => !before.has(u.id) && u.type !== 'FREE_PANEL');
  const said = await lastSaid(page);
  await closeLibrary(page);
  return { ok, unit: added[0] || null, said };
}
/** Doors through the DOORS section's own button, on the selected unit. */
async function addDoorsHere(page) {
  if (!(await section(page, 'Doors'))) return false;
  const has = await page.ask('[...document.querySelectorAll(\'button.cc-btn-gold\')].some((b) => b.offsetParent && /Add doors/.test(b.textContent))');
  if (has) { await page.press('button.cc-btn-gold', 'Add doors'); return true; }
  return false;
}
/** The selected unit moved to another wall through the Wall select (a real click, the arrows, Enter). */
async function toWall(page, index) {
  await section(page, 'Carcass');
  return choose(page, WALL_SELECT, String(index));
}

/**
 * THE CORNER KITCHEN, BUILT BY HAND. Run A from the library, dragged with the
 * real mouse into the corner at the end of wall 1; a SINK beside it when
 * asked; run B from the library (its doors, its hinge chosen RIGHT by hand
 * when asked), put on wall 2 by the Wall select, then dragged away from the
 * corner and back onto it with the real mouse. Returns the ids.
 */
async function cornerKitchen(page, {
  occupant = 'door-base', occupantType = 'BUD', sink = false, doorsA = false, doorsB = false, handR = false,
} = {}) {
  const ids = {};
  const A = await addFromLibrary(page, 'base-units', occupant);
  ids.A = A.unit && A.unit.id;
  check(`run A: Library, Kitchen, Base units, "${occupant}" adds a ${occupantType}`, A.ok && A.unit && A.unit.type === occupantType, JSON.stringify(A.unit));
  if (!ids.A) return ids;
  if (doorsA) await addDoorsHere(page);
  const a0 = await unitOf(page, ids.A);
  const dA = await drag(page, ids.A, 4000);
  const a1 = await unitOf(page, ids.A);
  const wall0 = await wallLength(page, 0);
  check('run A: a real drag right takes it into the corner at the end of wall 1 (the wall clamp stops it)',
    dA && a1.x + a1.w > wall0 - 200 && a1.x + a1.w <= wall0, `x ${a0.x} -> ${a1.x}, w ${a1.w}, wall ${wall0}; grabbed by ${dA && dA.by}`);
  if (sink) {
    await selectUnit(page, ids.A);
    const K = await addFromLibrary(page, 'base-units', 'sink');
    ids.sink = K.unit && K.unit.id;
    const k = ids.sink ? await unitOf(page, ids.sink) : null;
    check('a SINK from the library stands beside run A, on wall 1', k && k.type === 'SINK' && k.wall === 0 && Math.abs(k.x + k.w - a1.x) < 1,
      k ? `sink x ${k.x}..${k.x + k.w}, A from ${a1.x}` : JSON.stringify(K));
  }
  const B = await addFromLibrary(page, 'base-units', 'door-base');
  ids.B = B.unit && B.unit.id;
  check('run B: a second Standard from the library', B.ok && B.unit && B.unit.type === 'BUD', JSON.stringify(B.unit));
  if (!ids.B) return ids;
  if (doorsB) { await addDoorsHere(page); await selectUnit(page, ids.B); }
  if (handR) {
    await section(page, 'Carcass');
    const hand = await choose(page, HINGE_SELECT, 'R');
    const b0 = await unitOf(page, ids.B);
    check('run B: its hinge chosen RIGHT by hand in the Hinge side select', b0.leaves.length === 1 && /:R$/.test(b0.leaves[0]),
      `select ${JSON.stringify(hand.after && hand.after.value)}; leaves ${b0.leaves.join(' ')}`);
  }
  const moved = await toWall(page, 1);
  const b1 = await unitOf(page, ids.B);
  check('run B: the Wall select (a real click, the arrows, Enter) puts it on wall 2', moved.ok && b1.wall === 1,
    `option "${moved.label}"; wall ${b1.wall}, x ${b1.x}`);
  ids.landedAt = b1.x;
  return ids;
}
/** The stop on wall 2 for run A's occupant: its face (wall gap, depth, door gap, front) and the post. */
async function stopFor(page, aId) {
  const a = await unitOf(page, aId);
  const gap = await profileNum(page, 'doors.gap');
  const post = await profileNum(page, 'corner.postMm');
  return {
    mm: a.wallGap + a.d + gap + a.frontT + post,
    words: `wall gap ${a.wallGap} + depth ${a.d} + door gap ${gap} + front ${a.frontT} + post ${post}`,
  };
}

// ═══ F02 · WALK (a): A BASE RUN INTO A CORNER, A SECOND RUN ON THE NEXT WALL ═══
if (runs('f02')) {
  begin('f02', 'THE CORNER POST, RULE 7 AND THE HINGE (walk a)');
  const page = await open();
  await pro(page);
  const post = await profileNum(page, 'corner.postMm');
  const rule7 = await profileNum(page, 'doors.clearance.corner');
  note('the profile\'s proposed numbers', `corner.postMm ${post}, doors.clearance.corner ${rule7}`);
  const ids = await cornerKitchen(page, { doorsA: true, doorsB: true, handR: true });
  if (ids.B) {
    const stop = await stopFor(page, ids.A);
    const b1 = await unitOf(page, ids.B);
    note('the Wall select\'s free slot on wall 2 is the corner stop itself', `landed at x ${b1.x}; stop ${stop.mm}; post ${b1.postL}`);
    // Away first, so the drag ONTO the corner is the hand's.
    const away = await drag(page, ids.B, 900);
    const b2 = await unitOf(page, ids.B);
    check('a real drag along wall 2 takes run B away from the corner: no post, the hinge the hand chose',
      away && b2.x > b1.x + 300 && b2.postL == null && /:R$/.test(b2.leaves[0] || ''), `x ${b1.x} -> ${b2.x}; postL ${b2.postL}; leaves ${b2.leaves.join(' ')}`);
    const onto = await drag(page, ids.B, -4000);
    const b3 = await unitOf(page, ids.B);
    check('a real drag toward the corner lands run B ON the stop (A\'s face plus the post)',
      onto && Math.abs(b3.x - stop.mm) < 0.6, `x ${b2.x} -> ${b3.x}; stop = ${stop.words} = ${stop.mm}`);
    check('the CORNER POST stands: the post on B\'s corner side and a CORNER-POST board in its cut',
      b3.postL === post && b3.posts.length === 1, `postL ${b3.postL}; ${b3.posts.join('; ')}`);
    const c3 = await clearanceOf(page, ids.B);
    check('rule 7 measures: B\'s door beside the post wants 3 and has 3, not parked',
      c3 && c3.left && c3.left.kind === 'corner' && c3.left.want === rule7 && c3.left.have === rule7 && c3.left.parked === false,
      JSON.stringify(c3 && c3.left));
    check('the HINGE LAW: B\'s leaf, nearest the corner, hinges on the corner side (left); the record says the hand had R',
      /:L$/.test(b3.leaves[0] || '') && /"was":"R"/.test(b3.hingeAuto || ''), `leaves ${b3.leaves.join(' ')}; record ${b3.hingeAuto}`);
    const a3 = await unitOf(page, ids.A);
    check('run A keeps its own hinge (its corner door would swing into run B)', !a3.hingeAuto, `A leaves ${a3.leaves.join(' ')}; record ${a3.hingeAuto}`);
    await framed(page, 'f02-post-in-the-corner.png');
    const out = await drag(page, ids.B, 800);
    const b4 = await unitOf(page, ids.B);
    const c4 = await clearanceOf(page, ids.B);
    check('pulled away by a real drag: B leaves the stop', out && b4.x > b3.x + 100, `x ${b3.x} -> ${b4.x}`);
    check('…the post goes (no param, no board)', b4.postL == null && b4.postR == null && b4.posts.length === 0, `postL ${b4.postL}; posts ${b4.posts.length}`);
    check('…rule 7 is no longer asked at B\'s left edge', c4 && c4.left && c4.left.kind !== 'corner', JSON.stringify(c4 && c4.left));
    check('…and the hinge goes back to the hand\'s RIGHT, the record gone', /:R$/.test(b4.leaves[0] || '') && !b4.hingeAuto,
      `leaves ${b4.leaves.join(' ')}; record ${b4.hingeAuto}`);
    await framed(page, 'f02-pulled-away.png');
  }
  const errs = pageErrors(page);
  if (errs.length) note('console errors on the page', errs.slice(0, 3).join(' | '));
  await page.close();
}

// ═══ F03 · WALK (b): THE BLIND CORNER, RUN B ON THE STOP, THE BLANK'S WIDTH ═══
if (runs('f03')) {
  begin('f03', 'THE BLIND CORNER AND ITS BLANK (walk b)');
  const page = await open();
  await pro(page);
  // The blind kit takes its door (and with it the blank, a fixed piece beside
  // the door) through DOORS, as every kit is finished.
  const ids = await cornerKitchen(page, { occupant: 'blind-corner', occupantType: 'BLIND_BASE', doorsA: true });
  if (ids.A) {
    const a0 = await unitOf(page, ids.A);
    note('the blind kit as the library placed it and the drag took it', `type ${a0.type}, w ${a0.w}, x ${a0.x}; blind_side ${a0.blindSide}; blank ${JSON.stringify(a0.blank)}; leaves ${JSON.stringify(a0.leafBoxes)}`);
  }
  if (ids.B) {
    const stop = await stopFor(page, ids.A);
    await drag(page, ids.B, 900);
    const away = await unitOf(page, ids.B);
    const lone = await unitOf(page, ids.A);
    note('run B dragged away first: the blind kit with nobody beside it', `B x ${away.x}; blank ${JSON.stringify(lone.blank)}; blind_mm ${lone.blindMm}`);
    const onto = await drag(page, ids.B, -4000);
    const b = await unitOf(page, ids.B);
    const a = await unitOf(page, ids.A);
    check('run B: a real drag toward the corner lands it ON the stop the blind kit makes (its face plus the post)',
      onto && Math.abs(b.x - stop.mm) < 0.6, `x ${away.x} -> ${b.x}; stop = ${stop.words} = ${stop.mm}`);
    const post = await profileNum(page, 'corner.postMm');
    const rule7 = await profileNum(page, 'doors.clearance.corner');
    const gap = await profileNum(page, 'doors.gap');
    const wall0 = await wallLength(page, 0);
    const standOff = wall0 - (a.x + a.w);
    const faceB = b.wallGap + b.d + gap + b.frontT;
    const engine = Math.round((faceB + post + rule7 - standOff) * 100) / 100;
    const claude = b.d + b.frontT + post + rule7;
    check('the BLANK\'s width is the corner\'s arithmetic, read off the store: B\'s face + post + rule 7, less the kit\'s stand-off',
      a.blank && Math.abs(a.blank.w - engine) < 0.6 && Math.abs(a.blindMm - engine) < 0.6,
      `blank ${a.blank && a.blank.w}, blind_mm ${a.blindMm}; B face (wall gap ${b.wallGap} + depth ${b.d} + door gap ${gap} + front ${b.frontT}) ${faceB} + post ${post} + rule 7 ${rule7} - stand-off ${standOff} = ${engine}`);
    check('…so the blank reaches from the corner to B\'s face, the post and rule 7, exactly',
      a.blank && Math.abs(standOff + a.blank.w - (faceB + post + rule7)) < 0.6, `stand-off ${standOff} + blank ${a.blank && a.blank.w} = ${standOff + (a.blank ? a.blank.w : 0)}; B face + post + 3 = ${faceB + post + rule7}`);
    note('CLAUDE.md F3\'s words, read literally (adjacent depth + front_t + postMm + clearance.corner)',
      `${b.d} + ${b.frontT} + ${post} + ${rule7} = ${claude}; the engine's ${engine} measures the same from the corner itself (it adds B's wall gap ${b.wallGap} and the door gap ${gap}, and takes off the ${standOff} the blind kit stands off the corner): the two differ by ${Math.round((claude - engine) * 100) / 100}`);
    check('the blank stands on the corner side, has no holes (its fixing is the joiner\'s)', a.blank && a.blank.side === 'right' && a.blank.holes === 0 && a.blindSide === 'right',
      `blank side ${a.blank && a.blank.side}, holes ${a.blank && a.blank.holes}; blind_side ${a.blindSide}`);
    if (a.leafBoxes.length) {
      const leaf = a.leafBoxes[0];
      check('the one leaf stands beside the blank and hinges on the far side (away from the corner)',
        a.leafBoxes.length === 1 && leaf.x + leaf.w <= a.blank.x + 0.6 && leaf.hinge === 'L', JSON.stringify(leaf));
    } else {
      note('the blind kit arrived without a door leaf (doors are added by the DOORS button, not asked here)');
    }
    check('run B carries the post, as at any blind or plain corner', b.postL === post, `postL ${b.postL}; ${b.posts.join('; ')}`);
    await framed(page, 'f03-blind-corner.png');
    // THE CLIENT'S OWN NUMBER. The blank is an ATTACHED piece (a door's kind):
    // a single click selects the cabinet, a 2klik opens the piece (T11 F3.3,
    // T14 F4) and puts its width figure on the scene; the piece's window
    // stands over the scene (its backdrop takes the next press), so the hand
    // closes it by its own X, then clicks the figure, types, Enter.
    const pickBlank = async () => {
      const at = await reachFree(page, ids.A, a.blank.id);
      if (!at) return { at: null };
      await clickWith(page, at.x, at.y);
      await page.sleep(400);
      const one = await page.ask('JSON.stringify(window.__cc.ui.getState().selectedElement || null)');
      await page.dblclick(at.x, at.y);
      await page.sleep(1200);
      const two = await page.ask('JSON.stringify(window.__cc.ui.getState().selectedElement || null)');
      const modal = await page.ask('window.__cc.ui.getState().modal || null');
      if (modal) {
        const x = await boxOf(page, `[...document.querySelectorAll('[data-modal-name="${modal}"] button')].find((b) => b.textContent.trim() === '×')`);
        if (x) await clickWith(page, x.x, x.y);
      }
      const fig = await figureFree(page, `blind-blank-${ids.A}`, 'blind-width');
      return {
        at, one, two, modal, after: await page.ask('JSON.stringify(window.__cc.ui.getState().selectedElement || null)'), fig,
      };
    };
    if (a.blank) {
      // With run B on the stop: the figure stands in the slot between the
      // blank and B's side panel (the post and rule 7 wide).
      const onStop = await pickBlank();
      note('with run B ON the stop, the blank\'s width figure is drawn in the slot between the blank and run B\'s side; from the front camera a hand cannot reach it (nearer boards under every pixel of it)',
        `click: element ${onStop.one}; 2klik: element ${onStop.two}, window ${onStop.modal}; after its X: element ${onStop.after}; figure ${JSON.stringify(onStop.fig)}`);
      // So the client pulls run B away, sets the blank, and brings B back.
      await drag(page, ids.B, 900);
      const pick = await pickBlank();
      const fig = pick.fig;
      note('run B dragged away: a click selects the cabinet, a 2klik opens the piece, its X closes the window and the piece stays picked',
        `click: element ${pick.one}; 2klik: element ${pick.two}, window ${pick.modal}; after its X: element ${pick.after}`);
      if (!fig || fig.x == null) {
        check('the blank picked by the hand draws its width figure where a hand can click it', false, JSON.stringify(fig));
      } else {
        await shot(page, 'f03-blank-picked.png');
        await clickWith(page, fig.x, fig.y);
        const field = await until(page, 'Boolean(document.querySelector(\'[data-spacing-field="blind-width"]\'))', 3000);
        const focus = await page.ask('(() => { const f = document.querySelector(\'[data-spacing-field="blind-width"]\'); return f ? { focused: document.activeElement === f, value: f.value, selected: f.selectionStart === 0 && f.selectionEnd === f.value.length } : null; })()');
        check('a real click on the blank\'s width figure opens its field, focused, the number selected', field && focus && focus.focused && focus.selected,
          `figure at ${fig.x},${fig.y}; field ${JSON.stringify(focus)}`);
        if (field) {
          await page.typeText('700');
          await key(page, 'Enter');
          await page.sleep(900);
          const o = await unitOf(page, ids.A);
          check('typed 700 and Enter: the blank is the client\'s 700 (blind_mm_own)', o.blindOwn === 700 && o.blank && o.blank.w === 700,
            `blind_mm_own ${o.blindOwn}, blind_mm ${o.blindMm}, blank ${o.blank && o.blank.w}`);
          await shot(page, 'f03-blank-by-hand.png');
          await drag(page, ids.B, -4000);
          const back = await unitOf(page, ids.A);
          const b2 = await unitOf(page, ids.B);
          check('run B dragged back onto the stop: the automat writes its number beside the client\'s and never takes the client\'s back',
            Math.abs(b2.x - stop.mm) < 0.6 && back.blindOwn === 700 && back.blank && back.blank.w === 700 && back.blindMm === engine,
            `B x ${b2.x}; blind_mm_own ${back.blindOwn}, blind_mm ${back.blindMm}, blank ${back.blank && back.blank.w}`);
        }
      }
    }
  }
  const errs = pageErrors(page);
  if (errs.length) note('console errors on the page', errs.slice(0, 3).join(' | '));
  await page.close();
}

// ═══ F04 · WALK (c): THE TRUE L IN A CORNER, A RUN ON EACH SIDE, DOORS, WORKTOP ═══
if (runs('f04')) {
  begin('f04', 'THE TRUE L CARCASS IN A CORNER (walk c)');
  const page = await open();
  await pro(page);
  const L = await addFromLibrary(page, 'base-units', 'corner-l');
  const l0 = L.unit ? await unitOf(page, L.unit.id) : null;
  check('Library, Kitchen, Base units, "Corner L" places a CORNER_L_BASE into a room corner',
    l0 && l0.type === 'CORNER_L_BASE' && (l0.x === l0.wallGap || l0.x + l0.w === (await wallLength(page, l0.wall)) - l0.wallGap),
    l0 ? `wall ${l0.wall}, x ${l0.x}, w ${l0.w}, corner_side ${l0.cornerSide}` : `${JSON.stringify(L)}`);
  if (l0) {
    await addDoorsHere(page);
    const l1 = await unitOf(page, l0.id);
    const A = l1.leafBoxes.find((p) => /-A-F$/.test(p.id));
    const B = l1.leafBoxes.find((p) => /-B-F$/.test(p.id));
    check('DOORS adds the L\'s two leaves: door A (covered at the inner corner) and door B (the overlap)',
      A && B && /covered/.test(A.cornerEdge || '') && /overlap/.test(B.cornerEdge || ''), JSON.stringify(l1.leafBoxes));
    check('door B opens first: the leaf says so and the unit carries the line the BOM prints',
      B && B.opensFirst && B.note === 'door B opens first' && l1.warnings.some((w) => /door B opens first/.test(w)),
      `${B && B.note}; ${l1.warnings.filter((w) => /opens first/.test(w)).join(' | ')}`);
    // A run on wall A: the L selected, Standard from the library lands beside it.
    await selectUnit(page, l0.id);
    const RA = await addFromLibrary(page, 'base-units', 'door-base');
    const ra = RA.unit ? await unitOf(page, RA.unit.id) : null;
    const armEnd = l0.cornerSide === 'left' ? l0.x + l0.w : l0.x;
    check('a Standard added beside the L on its own wall stands on the L\'s arm end',
      ra && ra.wall === l0.wall && (Math.abs(ra.x - armEnd) < 0.6 || Math.abs(ra.x + ra.w - armEnd) < 0.6),
      ra ? `wall ${ra.wall}, x ${ra.x}..${ra.x + ra.w}; L arm end ${armEnd}` : JSON.stringify(RA));
    // A run on wall B: the next Standard, the Wall select, a real drag into the corner.
    const RB = await addFromLibrary(page, 'base-units', 'door-base');
    const wallB = l0.cornerSide === 'left' ? (l0.wall + 3) % 4 : (l0.wall + 1) % 4;
    const moved = RB.unit ? await toWall(page, wallB) : { ok: false };
    const rb1 = RB.unit ? await unitOf(page, RB.unit.id) : null;
    check(`a second Standard, put on wall ${wallB + 1} (the L's other arm) by the Wall select`, moved.ok && rb1 && rb1.wall === wallB,
      `option "${moved.label}"; ${rb1 ? `wall ${rb1.wall}, x ${rb1.x}` : ''}`);
    if (rb1 && rb1.wall === wallB) {
      const lenB = await wallLength(page, wallB);
      const toward = l0.cornerSide === 'left' ? 4000 : -4000;
      await drag(page, rb1.id, -toward / 4);
      const rbAway = await unitOf(page, rb1.id);
      const onto = await drag(page, rb1.id, toward);
      const rb2 = await unitOf(page, rb1.id);
      const armB = l0.wallGap + l0.w;
      const reach = l0.cornerSide === 'left' ? lenB - (rb2.x + rb2.w) : rb2.x;
      check('a real drag toward the corner stops it on the L\'s arm B end (the L is its own stop: no post)',
        onto && Math.abs(reach - armB) < 0.6 && rb2.postL == null && rb2.postR == null,
        `x ${rbAway.x} -> ${rb2.x}; its end ${reach} from the corner, the L's arm reaches ${armB}; posts ${rb2.posts.length}`);
      const doorRows = await page.ask(`${S}.frontClearances().filter((r) => r.unitId === ${JSON.stringify(l0.id)}).map((r) => ({ panel: r.panelId, wall: r.wall, left: r.edges.left && r.edges.left.kind, right: r.edges.right && r.edges.right.kind }))`);
      note('the L\'s doors as the clearance rulebook measures them, a neighbour on each wall', JSON.stringify(doorRows));
    }
    await framed(page, 'f04-corner-l.png');
    // THE WORKTOP OF THE L ALONE: the L selected by a real click, its
    // Construction section, the Worktop row's own Add worktop (c9a9b41).
    await selectUnit(page, l0.id);
    await section(page, 'Construction');
    const row = await page.has('[data-add-worktop-one="1"]');
    check('the L selected alone: Construction shows the Worktop row\'s ADD WORKTOP', row,
      `rows ${JSON.stringify(await page.ask('[...document.querySelectorAll(\'[data-worktop-row]\')].map((r) => r.getAttribute(\'data-worktop-row\') + \': \' + r.textContent.trim().slice(0, 60))'))}`);
    if (row) {
      await page.press('[data-add-worktop-one="1"]');
      await page.sleep(900);
      const recs = await recordsNow(page);
      const slabs = await worktopsNow(page);
      const said = await lastSaid(page);
      check('ADD WORKTOP on the lone L: ONE record of kind L, over the L alone', recs.length === 1 && recs[0].kind === 'L' && recs[0].units === 1,
        `records ${JSON.stringify(recs)}; said ${JSON.stringify(said)}`);
      check('…and ONE slab shaped like the L (an outline of six corners, the L\'s shape)', slabs.length === 1 && slabs[0].shape === 'L' && slabs[0].points === 6,
        JSON.stringify(slabs));
      const label = await page.text('[data-worktop-row]:not([data-worktop-row="add"])');
      note('the row now reads', JSON.stringify(label));
      await framed(page, 'f04-worktop-l-alone.png');
    }
    // The worktop over what the UI CAN select: the L and both runs, Ctrl+click.
    const ids3 = [l0.id, RA.unit && RA.unit.id, RB.unit && RB.unit.id].filter(Boolean);
    await clickUnit(page, ids3[0]);
    for (const id of ids3.slice(1)) await clickUnit(page, id, 2);
    const sel = await page.ask('window.__cc.ui.getState().selectedUnitIds');
    check('the L and both runs selected by a click and two Ctrl+clicks', ids3.every((id) => sel.includes(id)), JSON.stringify(sel));
    if (await page.has('[data-add-worktop="1"]')) {
      await page.press('[data-add-worktop="1"]');
      const said = await lastSaid(page);
      const slabs = await worktopsNow(page);
      const recs = await recordsNow(page);
      check('ADD WORKTOP over the L and its two runs lies a worktop (records and slabs read off the store)', recs.length > 0 && slabs.length > 0,
        `records ${JSON.stringify(recs)}; slabs ${JSON.stringify(slabs)}; said ${JSON.stringify(said)}`);
      await framed(page, 'f04-worktop.png');
    } else {
      check('the selection panel offers ADD WORKTOP', false, 'no [data-add-worktop] on the screen');
    }
  }
  const errs = pageErrors(page);
  if (errs.length) note('console errors on the page', errs.slice(0, 3).join(' | '));
  await page.close();
}

// ═══ F05 · THE WORKTOP TURNS THE CORNER, THE SINK CUT-OUT, THE UPSTAND ═════
if (runs('f05')) {
  begin('f05', 'THE WORKTOP TURNS THE CORNER, THE CUT-OUT, THE UPSTAND');
  const page = await open();
  await pro(page);
  const ids = await cornerKitchen(page, { sink: true });
  if (ids.A && ids.sink && ids.B) {
    const stop = await stopFor(page, ids.A);
    const b = await unitOf(page, ids.B);
    if (Math.abs(b.x - stop.mm) > 0.6) await drag(page, ids.B, -4000);
    const all = [ids.A, ids.sink, ids.B];
    await clickUnit(page, all[0]);
    for (const id of all.slice(1)) await clickUnit(page, id, 2);
    const sel = await page.ask('window.__cc.ui.getState().selectedUnitIds');
    check('run A, the sink and run B selected by a click and two Ctrl+clicks', all.every((id) => sel.includes(id)), JSON.stringify(sel));
    const label = await page.text('[data-add-worktop="1"]');
    if (label) await page.press('[data-add-worktop="1"]');
    const said = await lastSaid(page);
    const slabs = await worktopsNow(page);
    check(`"${label}": two slabs, one on each wall`, slabs.length === 2 && slabs.some((s) => s.wall === 0) && slabs.some((s) => s.wall === 1),
      `${JSON.stringify(slabs)}; said ${JSON.stringify(said)}`);
    const sA = slabs.find((s) => s.wall === 0);
    const sB = slabs.find((s) => s.wall === 1);
    const wall0 = await wallLength(page, 0);
    check('ONE joint record at the corner, shared by both slabs: a square butt, 3 bolts, manual',
      sA && sB && sA.joint && sA.joint === sB.joint && /"kind":"butt"/.test(sA.joint) && /"boltCount":3/.test(sA.joint) && /"readiness":"manual"/.test(sA.joint), sA && sA.joint);
    check('slab A runs through to the wall; slab B butts slab A\'s front edge', sA && sB && Math.abs(sA.x + sA.w - wall0) < 0.6 && Math.abs(sB.x - sA.d) < 0.6,
      sA && sB ? `A ${sA.x}..${sA.x + sA.w} of ${wall0}, A deep ${sA.d}; B from ${sB.x}` : '');
    const cut = sA ? sA.cutouts : [];
    check('the SINK under slab A proposes its cut-out (inset 20, radius 10), a note and not machined', cut.length === 1 && /^sink /.test(cut[0]) && / r10 /.test(cut[0]) && /machined false/.test(cut[0]),
      JSON.stringify(cut));
    await framed(page, 'f05-worktop-corner.png');
    // THE UPSTAND from the right-click menu.
    const at = await clickUnit(page, ids.A);
    if (at) {
      await page.rightclick(at.x, at.y);
      await page.sleep(800);
    }
    const entries = await page.ask('[...document.querySelectorAll(\'[data-menu-entry]\')].map((e) => e.getAttribute(\'data-menu-entry\') + \':\' + e.textContent.trim().slice(0, 30))');
    if (await page.has('[data-menu-entry="upstand"]')) {
      await page.press('[data-menu-entry="upstand"]');
      await page.sleep(900);
      const up = await page.ask(`(() => { const P = ${S}; const out = [];
        for (const u of P.units) for (const p of P.unitResult(u.id).panels) if (p.role === 'upstand') out.push({ unit: u.params.unit_num, w: p.w, h: p.h, t: p.thickness, y: p.box.y, material: p.material_role });
        const csv = P.units.flatMap((u) => P.unitResult(u.id).csvLines || []).filter((l) => /UPSTAND/.test(l));
        return { boards: out, csv, flags: P.units.map((u) => u.params.unit_num + ':' + (u.params.upstand === true)) }; })()`);
      check('the right-click menu\'s UPSTAND switches it on: one board on the worktop at the wall, worktop material, a cut list line',
        up.boards.length >= 1 && up.boards.every((x) => x.material === 'worktop' && x.h === 100 && x.t === 20) && up.csv.length >= 1,
        JSON.stringify(up));
      await framed(page, 'f05-upstand.png');
    } else {
      check('the right-click menu offers UPSTAND', false, `entries ${JSON.stringify(entries)}`);
    }
  }
  const errs = pageErrors(page);
  if (errs.length) note('console errors on the page', errs.slice(0, 3).join(' | '));
  await page.close();
}

// ═══ F06 · THE PLINTH BUTTS AT THE CORNER, AND GOES WHEN PULLED AWAY ════════
if (runs('f06')) {
  begin('f06', 'THE PLINTH BUTT AT THE CORNER');
  const page = await open();
  await pro(page);
  const ids = await cornerKitchen(page, {});
  if (ids.A && ids.B) {
    const stop = await stopFor(page, ids.A);
    await drag(page, ids.B, 900);
    await drag(page, ids.B, -4000);
    const a = await unitOf(page, ids.A);
    const b = await unitOf(page, ids.B);
    const setback = await profileNum(page, 'autoParts.plinth.setback');
    const faceA = a.wallGap + a.d - setback;
    const ext = b.x - faceA;
    check('run B on the stop (a real drag), both runs on their plinths', Math.abs(b.x - stop.mm) < 0.6 && a.plinth && b.plinth,
      `B x ${b.x} (stop ${stop.mm}); plinths A ${JSON.stringify(a.plinth)}, B ${JSON.stringify(b.plinth)}`);
    check('B\'s kick is carried on to A\'s kick FACE, square: longer by the arithmetic',
      b.plinth && Math.abs(b.plinth.w - (b.w + ext)) < 0.6 && Math.abs(b.plinth.x + ext) < 0.6 && /"butt":"square"/.test(b.plinth.corner || ''),
      `A kick face = wall gap ${a.wallGap} + depth ${a.d} - setback ${setback} = ${faceA}; B x ${b.x} - ${faceA} = ${ext}; B kick ${b.plinth && b.plinth.w} = ${b.w} + ${ext}? meta ${b.plinth && b.plinth.corner}`);
    check('A runs into the corner and keeps its own kick', a.plinth && a.plinth.w === a.w && !a.plinth.corner, JSON.stringify(a.plinth));
    await framed(page, 'f06-plinth-butt.png');
    await drag(page, ids.B, 900);
    const b2 = await unitOf(page, ids.B);
    check('pulled away by a real drag: B\'s kick is its own width again, the butt gone',
      b2.x > b.x + 100 && b2.plinth && b2.plinth.w === b2.w && !b2.plinth.corner, `x ${b.x} -> ${b2.x}; kick ${JSON.stringify(b2.plinth)}`);
    await framed(page, 'f06-pulled-away.png');
  }
  const errs = pageErrors(page);
  if (errs.length) note('console errors on the page', errs.slice(0, 3).join(' | '));
  await page.close();
}

// ═══ F07 · WALK (e): CUT CORNER ON A WARDROBE, 200 x 200 BL ═══════════════
/** The left side's puzzle sockets, one row per edge (y), each socket the middle of its two holes. */
const socketTable = (page, id, side) => page.ask(`(() => { const r = ${S}.unitResult(${JSON.stringify(id)});
  const p = r.panels.find((x) => x.id === ${JSON.stringify(side)});
  const holes = r.drills.filter((d) => d.panel === ${JSON.stringify(side)} && d.kind === 'puzzle');
  const rows = {}; for (const d of holes) { (rows[d.y] = rows[d.y] || []).push(d.x); }
  const out = {}; for (const y of Object.keys(rows)) { const xs = [...new Set(rows[y])].sort((a, b) => a - b); const c = [];
    for (let i = 0; i + 1 < xs.length; i += 2) c.push(Math.round((xs[i] + xs[i + 1]) / 2 * 10) / 10); out[y] = c; }
  return { w: p ? p.w : null, h: p ? p.h : null, holes: holes.length, all: r.drills.filter((d) => d.panel === ${JSON.stringify(side)}).length, rows: out }; })()`);
const notchState = (page, id) => page.ask(`(() => { const P = ${S}; const u = P.units.find((x) => x.id === ${JSON.stringify(id)}); const r = P.unitResult(u.id);
  return { notch: u.params.notch || null, boards: r.panels.filter((p) => /NOTCH|RETURN|STEP|LID/.test(p.part + ' ' + p.id)).map((p) => p.id + ' ' + p.w + 'x' + p.h),
    csv: (r.csvLines || []).filter((l) => /RETURN|STEP|LID/.test(l)) }; })()`);

async function cutCornerWalk(page, side, unitId, relight = null) {
  const before = await socketTable(page, unitId, 'BUL');
  if (await page.has('[data-testid="cut-corner"]')) await page.press('[data-testid="cut-corner"]');
  const lit = await until(page, 'window.__cc.ui.getState().notchPick', 3000);
  await settleCamera(page);
  // The four handles stand above the carcass top; from some cameras the FRONT
  // one stands in front of the BACK one under the pointer. The camera is
  // turned (real drags on the empty floor) until BL is the first thing there.
  // A drag on the empty floor may let the unit go (and its lit corners with
  // it): then the hand selects it again and presses CUT CORNER again.
  let handles = await helperAt(page, '(u) => u.ccNotchCorner === "BL"');
  const turns = [[0, 160], [0, 160], [120, 0], [-240, 0]];
  for (let t = 0; t < turns.length && !(handles && handles.some((x) => x.first)); t += 1) {
    await orbitFree(page, turns[t][0], turns[t][1]);
    if (!(await page.ask('window.__cc.ui.getState().notchPick')) && relight) await relight();
    await settleCamera(page);
    handles = await helperAt(page, '(u) => u.ccNotchCorner === "BL"');
  }
  check(`${side} · CUT CORNER (the real button) lights the four plan corners`, lit === unitId && handles && handles.length > 0,
    `notchPick ${lit}; BL handle ${JSON.stringify(handles && handles[0])}`);
  await shot(page, `f07-${side}-corners-lit.png`);
  const h = handles && handles.find((x) => x.first);
  if (!h) { check(`${side} · the lit BL corner is the first thing under the pointer from some camera`, false, JSON.stringify(handles)); return; }
  await clickWith(page, h.x, h.y);
  const asked = await until(page, 'Boolean(document.querySelector(\'[data-testid="notch-ask"]\'))', 3000);
  const field = await page.ask(`(() => { const f = document.querySelector('[data-testid="notch-ask"] [data-notch-field="width"]'); const all = [...document.querySelectorAll('[data-testid="notch-ask"] [data-notch-field]')].map((e) => e.getAttribute('data-notch-field') + '=' + e.value);
    return { focused: document.activeElement === f, fields: all, corner: document.querySelector('[data-testid="notch-ask"]') && document.querySelector('[data-testid="notch-ask"]').getAttribute('data-notch-corner') }; })()`);
  const shell = await boxOf(page, 'document.querySelector(\'[data-testid="notch-ask"]\')');
  const near = shell ? Math.hypot(shell.x - h.x, shell.y - h.y) : null;
  check(`${side} · a real click on the lit BL corner opens the small window AT the click: WIDTH 200, DEPTH 200, HEIGHT full, WIDTH focused`,
    asked && field.corner === 'BL' && field.focused && field.fields.join(' ') === 'width=200 depth=200 height=full' && near != null && near < 450,
    `${JSON.stringify(field)}; window centre ${shell ? `${shell.x},${shell.y}` : '?'}, ${near == null ? '?' : Math.round(near)} px from the click`);
  await shot(page, `f07-${side}-the-small-window.png`);
  await key(page, 'Enter');
  await page.sleep(1200);
  const st = await notchState(page, unitId);
  const after = await socketTable(page, unitId, 'BUL');
  check(`${side} · Enter cuts it: the notch is BL 200 x 200, full height`, st.notch && st.notch.corner === 'BL' && st.notch.w === 200 && st.notch.d === 200 && !st.notch.h,
    JSON.stringify(st.notch));
  check(`${side} · the cut list shows the RETURN board`, st.csv.some((l) => /,RETURN,/.test(l)), `${JSON.stringify(st.csv)}; boards ${JSON.stringify(st.boards)}`);
  const ys = [...new Set([...Object.keys(before.rows), ...Object.keys(after.rows)])].sort((a, b) => Number(a) - Number(b));
  note(`${side} · THE SOCKET TABLE of BUL (the side at BL), off the store's unitResult: y (mm) | sockets before | sockets after`,
    ys.map((y) => `${y} | ${(before.rows[y] || []).join(',') || '-'} | ${(after.rows[y] || []).join(',') || '-'}`).join(' ; ')
      + ` ; BUL ${before.w} x ${before.h} -> ${after.w} x ${after.h}, puzzle holes ${before.holes} -> ${after.holes}, all holes ${before.all} -> ${after.all}`);
  const moved = ys.some((y) => (before.rows[y] || []).join(',') !== (after.rows[y] || []).join(','));
  check(`${side} · BUL is shorter by the notch depth and its sockets are RE-PLANNED for the shorter edge`,
    after.w === before.w - 200 && moved, `BUL width ${before.w} -> ${after.w}`);
  await shot(page, `f07-${side}-cut.png`);
}

if (runs('f07')) {
  begin('f07', 'CUT CORNER ON A WARDROBE, 200 x 200 BL (walk e)');
  // RETAIL: the SIZE step's own button, on the wardrobe WHERE placed.
  {
    const page = await open();
    await room(page);
    await withWardrobe(page);
    const [w] = await unitsNow(page);
    check('retail · a wardrobe through WHERE\'s own button', w && w.type === 'WARDROBE', JSON.stringify(w));
    await page.press('[data-testid="cat-size"]');
    await roomView(page);
    if (w) {
      await cutCornerWalk(page, 'retail', w.id, async () => {
        if (await page.has('[data-testid="cut-corner"]') && !(await page.ask('window.__cc.ui.getState().notchPick'))) await page.press('[data-testid="cut-corner"]');
      });
    }
    const errs = pageErrors(page);
    if (errs.length) note('retail · console errors on the page', errs.slice(0, 3).join(' | '));
    await page.close();
  }
  // PRO: the library's Wardrobes category, the right panel's CUT CORNER.
  {
    const page = await open();
    await pro(page);
    const W = await addFromLibrary(page, null, 'WARDROBE', 'Wardrobes');
    check('pro · a wardrobe from the library\'s Wardrobes category', W.unit && W.unit.type === 'WARDROBE', JSON.stringify(W.unit));
    if (W.unit) {
      await selectUnit(page, W.unit.id);
      await section(page, 'Carcass');
      await cutCornerWalk(page, 'pro', W.unit.id, async () => {
        await selectUnit(page, W.unit.id);
        await section(page, 'Carcass');
        if (await page.has('[data-testid="cut-corner"]') && !(await page.ask('window.__cc.ui.getState().notchPick'))) await page.press('[data-testid="cut-corner"]');
      });
    }
    const errs = pageErrors(page);
    if (errs.length) note('pro · console errors on the page', errs.slice(0, 3).join(' | '));
    await page.close();
  }
}

// ═══ F03R · WALK (d): RETAIL, TWO WARDROBES INTO A CORNER, ADD CORNER WARDROBE ═══
if (runs('f03r')) {
  begin('f03r', 'RETAIL: TWO WARDROBES INTO A CORNER, ADD CORNER WARDROBE (walk d)');
  const page = await open();
  await room(page);
  await withWardrobe(page);
  await page.press('[data-testid="cat-extras"]');
  await page.press('[data-testid="extras-add-wardrobe"]');
  await page.sleep(1500);
  const two = await unitsNow(page);
  check('two wardrobes, through WHERE and EXTRAS\' ADD ANOTHER WARDROBE', two.length === 2 && two.every((u) => u.type === 'WARDROBE'), JSON.stringify(two));
  await roomView(page);
  // Into the corner: the right-hand one dragged right with the real mouse; the other follows it.
  const right = [...two].sort((a, b) => b.x - a.x)[0];
  const left = [...two].sort((a, b) => a.x - b.x)[0];
  const lenW = await wallLength(page, right.wall);
  await drag(page, right.id, 4000);
  await drag(page, left.id, 4000);
  const after = await unitsNow(page);
  const r1 = after.find((u) => u.id === right.id);
  const l1 = after.find((u) => u.id === left.id);
  check('a real drag takes the two wardrobes into the right-hand corner of their wall, side by side',
    r1.x + r1.w > lenW - 200 && Math.abs(l1.x + l1.w + (l1.ep.includes('R') ? 18 : 0) - r1.x + (r1.ep.includes('L') ? 18 : 0)) < 40,
    `wall ${r1.wall} (${lenW}); ${JSON.stringify(after)}`);
  await shot(page, 'f03r-two-in-the-corner.png');
  const scope = await page.ask(`(${S}.project.design || {}).scope || null`);
  note('the retail room these stand in', `scope ${scope}; corners ${await page.ask(`${S}.project.room.corners.map((c) => c.x + ',' + c.y).join(' ')`)}`);
  // ADD CORNER WARDROBE, pressed until the room has no free corner left.
  const placed = [];
  let refused = null;
  for (let k = 0; k < 5 && !refused; k += 1) {
    const before = new Set((await unitsNow(page)).map((u) => u.id));
    await page.press('[data-testid="extras-add-corner-wardrobe"]');
    await page.sleep(1600);
    const fresh = (await unitsNow(page)).filter((u) => !before.has(u.id));
    if (fresh.length) {
      const u = await unitOf(page, fresh[0].id);
      placed.push(u);
      const len = await wallLength(page, u.wall);
      const inCorner = Math.abs(u.x - u.wallGap) < 60 || Math.abs(len - (u.x + u.w)) < 60;
      check(`ADD CORNER WARDROBE (press ${k + 1}): a BLIND_WARDROBE stands in a free corner, its blank on the corner side`,
        u.type === 'BLIND_WARDROBE' && inCorner && u.blank && u.blank.holes === 0,
        `wall ${u.wall} (${len}), x ${u.x}, w ${u.w}; blind_side ${u.blindSide}, blind_mm ${u.blindMm}; blank ${JSON.stringify(u.blank)}; leaves ${u.leaves.join(' ')}`);
      if (k === 0) await shot(page, 'f03r-corner-wardrobe.png');
    } else {
      // EXTRAS says a refusal in its own line under the additions (`layout-said`).
      refused = (await page.text('[data-testid="layout-said"]')) || '(no line said under EXTRAS)';
    }
  }
  check('when no corner is free, ADD CORNER WARDROBE refuses in words', /no free corner/i.test(refused || ''), `${placed.length} placed; said ${JSON.stringify(refused)}`);
  await shot(page, 'f03r-no-free-corner.png');
  const errs = pageErrors(page);
  if (errs.length) note('console errors on the page', errs.slice(0, 3).join(' | '));
  await page.close();
}

// ═══ F08 · WALK (f): PULL EACH ONE AWAY, ALL GONE ══════════════════════════
if (runs('f08')) {
  begin('f08', 'PULL EACH ONE AWAY, ALL GONE (walk f)');
  const page = await open();
  await pro(page);
  // A blind corner (run A) with a sink beside it, run B with its doors and a
  // hand-chosen RIGHT hinge, a worktop over both runs: every corner automat at once.
  const ids = await cornerKitchen(page, {
    occupant: 'blind-corner', occupantType: 'BLIND_BASE', sink: true, doorsA: true, doorsB: true, handR: true,
  });
  if (ids.A && ids.B && ids.sink) {
    const stop = await stopFor(page, ids.A);
    await drag(page, ids.B, 900);
    const loneA = await unitOf(page, ids.A);
    await drag(page, ids.B, -4000);
    const all = [ids.A, ids.sink, ids.B];
    await clickUnit(page, all[0]);
    for (const id of all.slice(1)) await clickUnit(page, id, 2);
    if (await page.has('[data-add-worktop="1"]')) await page.press('[data-add-worktop="1"]');
    const a = await unitOf(page, ids.A);
    const b = await unitOf(page, ids.B);
    const slabs = await worktopsNow(page);
    note('IN THE CORNER (all made by the hand\'s drags and clicks)', `B x ${b.x} (stop ${stop.mm}); post ${b.postL}; hinge ${b.leaves.join(' ')} record ${b.hingeAuto}; blank ${a.blank && a.blank.w} (alone it was ${loneA.blank && loneA.blank.w}); B kick ${JSON.stringify(b.plinth)}; slabs ${slabs.length}, joint ${slabs[0] && slabs[0].joint}`);
    check('in the corner: post, hinge flip, the blank at the corner\'s size, the plinth butt and the worktop joint all stand',
      Math.abs(b.x - stop.mm) < 0.6 && b.postL > 0 && b.hingeAuto && a.blank && a.blindMm != null && b.plinth && b.plinth.corner && slabs.length === 2 && slabs[0].joint,
      `post ${b.postL}; record ${b.hingeAuto}; blind_mm ${a.blindMm}; kick ${b.plinth && b.plinth.corner}; slabs ${slabs.length}`);
    await framed(page, 'f08-all-in-the-corner.png');
    // Pulled away: one real drag of run B along wall 2.
    const away = await drag(page, ids.B, 900);
    const b2 = await unitOf(page, ids.B);
    const a2 = await unitOf(page, ids.A);
    const slabs2 = await worktopsNow(page);
    const recs2 = await recordsNow(page);
    check('pulled away by a real drag', away && b2.x > b.x + 100, `x ${b.x} -> ${b2.x}`);
    check('…the post is gone', b2.postL == null && b2.posts.length === 0, `postL ${b2.postL}; ${b2.posts.join('; ')}`);
    check('…the hinge flip is gone: the hand\'s RIGHT is back', /:R$/.test(b2.leaves[0] || '') && !b2.hingeAuto, `leaves ${b2.leaves.join(' ')}; record ${b2.hingeAuto}`);
    check('…the blank is back to the size it has with nobody beside it', a2.blank && loneA.blank && a2.blank.w === loneA.blank.w && a2.blindMm == null,
      `blank ${a.blank && a.blank.w} -> ${a2.blank && a2.blank.w} (alone ${loneA.blank && loneA.blank.w}); blind_mm ${a2.blindMm}`);
    check('…the plinth butt is gone: B\'s kick is its own width', b2.plinth && b2.plinth.w === b2.w && !b2.plinth.corner, JSON.stringify(b2.plinth));
    check('…the worktop joint is gone: no slab carries a joint record', !slabs2.some((s) => s.joint),
      `slabs ${JSON.stringify(slabs2)}; records ${JSON.stringify(recs2)}`);
    await framed(page, 'f08-pulled-away.png');
  }
  const errs = pageErrors(page);
  if (errs.length) note('console errors on the page', errs.slice(0, 3).join(' | '));
  await page.close();
}

// ═══ PART B · THE ISLAND ════════════════════════════════════════════════
/** The island(s) drawn in the plan, read off the SVG the client sees. */
const planIsland = (page) => page.ask(`(() => { const p = document.querySelector('[data-plan-island]'); if (!p) return null;
  const pts = p.getAttribute('points').split(' ').map((q) => q.split(',').map(Number));
  const xs = pts.map((q) => q[0]); const ys = pts.map((q) => q[1]);
  return { id: p.getAttribute('data-plan-island'), cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2,
    figures: [...document.querySelectorAll('[data-island-dim]')].map((t) => t.getAttribute('data-island-dim') + '=' + t.textContent.trim()) }; })()`);
const islandsNow = (page) => page.ask(`(${S}.project.room.islands || []).map((i) => ({ id: i.id, cx: i.cx, cy: i.cy, w: i.w, d: i.d, rotation: i.rotation }))`);
/** Room setup opened from Settings, ADD ISLAND, APPLY: the island the next sections stand on. */
async function islandByHand(page) {
  await page.press('button', 'Settings');
  await page.press('button', 'Room setup');
  await page.sleep(800);
  const can = await page.has('[data-room-add-island="1"]');
  if (can) await page.press('[data-room-add-island="1"]');
  return can;
}
/** The 3D plus standing on face `face` of the first island, found where `IslandFacePluses` stands it. */
const facePlus = (page, face) => page.ask(`(() => {
  const v = window.__cc.views.room; const T = v.three; const P = ${S}; const prof = ${PROFILE};
  const isl = (P.project.room.islands || [])[0]; if (!isl) return { why: 'no island' };
  const cs = P.project.room.corners; const xs = cs.map((c) => c.x); const ys = cs.map((c) => c.y);
  const centre = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  const rad = (isl.rotation || 0) * Math.PI / 180; const cos = Math.cos(rad); const sin = Math.sin(rad); const hw = isl.w / 2; const hd = isl.d / 2;
  const k = ['A', 'E1', 'B', 'E2'].indexOf(${JSON.stringify(face)});
  const corner = ([u, w]) => ({ x: isl.cx + u * cos - w * sin, y: isl.cy + u * sin + w * cos });
  const cn = [[hw, -hd], [-hw, -hd], [-hw, hd], [hw, hd]].map(corner); const p = cn[k]; const q = cn[(k + 1) % 4];
  const len = Math.hypot(q.x - p.x, q.y - p.y); const ux = (q.x - p.x) / len; const uy = (q.y - p.y) / len;
  const depth = Number(prof.baseUnit && prof.baseUnit.defaults && prof.baseUnit.defaults.depth) || 560;
  const height = Number(prof.baseUnit && prof.baseUnit.defaults && prof.baseUnit.defaults.height) || 720;
  const want = new T.Vector3((p.x + ux * len / 2 + (-uy) * depth / 2 - centre.x) / 1000, height / 2000, (p.y + uy * len / 2 + ux * depth / 2 - centre.y) / 1000);
  let best = null; v.scene.traverse((o) => { if (!o.userData || !o.userData.ccAddPlus) return; o.updateMatrixWorld(true);
    const at = new T.Vector3().setFromMatrixPosition(o.matrixWorld); const dist = at.distanceTo(want); if (!best || dist < best.dist) best = { o, dist, at }; });
  if (!best || best.dist > 0.05) return { why: 'no plus where face ' + ${JSON.stringify(face)} + ' wants one', dist: best && best.dist };
  const r = v.gl.domElement.getBoundingClientRect(); const c = best.at.clone().project(v.camera);
  const x = Math.round(r.left + (c.x * 0.5 + 0.5) * r.width); const y = Math.round(r.top + (-c.y * 0.5 + 0.5) * r.height);
  const ray = new T.Raycaster(); ray.setFromCamera(new T.Vector2(((x - r.left) / r.width) * 2 - 1, -(((y - r.top) / r.height) * 2 - 1)), v.camera);
  const hits = ray.intersectObjects(v.scene.children, true).filter((h) => h.object.visible !== false && (h.object.isMesh || h.object.isSprite));
  const el = document.elementFromPoint(x, y); const canvas = el === v.gl.domElement || (el && v.gl.domElement.contains(el));
  return { x, y, first: hits.length > 0 && hits[0].object === best.o, canvas, firstIs: hits[0] ? JSON.stringify(hits[0].object.userData).slice(0, 80) : null };
})()`);
const islandPanels = (page) => page.ask(`${S}.units.filter((u) => u.params.island_auto).map((u) => ({ id: u.id, face: u.position.face, wall: u.position.wall,
  kind: (u.params.island_panel && (u.params.island_panel.kind || u.params.island_panel)) || null, w: u.params.width, h: u.params.height, d: u.params.depth }))`);

/** An island made by hand (Room setup, ADD ISLAND, APPLY) and a unit added on face `face` by its plus. */
async function unitOnFace(page, face) {
  const before = new Set((await unitsNow(page)).map((u) => u.id));
  await settleCamera(page);
  let plus = await facePlus(page, face);
  for (let t = 0; t < 4 && !(plus && plus.first && plus.canvas); t += 1) {
    await orbitFree(page, t % 2 ? -300 : 300, t > 1 ? 60 : 0);
    plus = await facePlus(page, face);
  }
  if (!(plus && plus.x != null && plus.first && plus.canvas)) return { plus, unit: null };
  await clickWith(page, plus.x, plus.y);
  const libOpen = await until(page, 'Boolean(document.querySelector(\'[data-library-group="base-units"]\'))', 3000);
  const insert = await page.ask('JSON.stringify(window.__cc.ui.getState().libraryInsert || null)');
  if (libOpen) {
    await page.press('[data-library-group="base-units"]');
    await page.press('[data-library-entry="door-base"]');
    await page.sleep(1300);
  }
  const said = await lastSaid(page);
  await closeLibrary(page);
  const added = (await unitsNow(page)).filter((u) => !before.has(u.id) && u.type !== 'FREE_PANEL');
  return {
    plus, libOpen, insert, said, unit: added[0] || null,
  };
}

// ═══ F09 · THE ISLAND ENTITY: ROOM SETUP, ADD ISLAND, DRAG, A FIGURE, APPLY ═══
if (runs('f09')) {
  begin('f09', 'THE ISLAND IN ROOM SETUP (PRO, a kitchen job)');
  const page = await open();
  await pro(page);
  const can = await islandByHand(page);
  check('Settings, Room setup: a kitchen job shows ADD ISLAND', can, `projectType ${await page.ask(`(${S}.project.design || {}).projectType || null`)}`);
  if (can) {
    const i0 = await planIsland(page);
    check('ADD ISLAND draws an island in the plan at the profile\'s size (1800 x 900, proposed)', i0 && i0.figures.join(' ') === `${i0.id}:w=1800 ${i0.id}:d=900`,
      JSON.stringify(i0));
    await shot(page, 'f09-add-island.png');
    // A real drag of the island in the plan.
    const poly = await boxOf(page, 'document.querySelector(\'[data-plan-island]\')');
    await page.dragFromTo(poly.x, poly.y, poly.x + 30, poly.y - 20, { steps: 12 });
    const i1 = await planIsland(page);
    check('a real drag moves the island in the plan', i1 && (Math.abs(i1.cx - i0.cx) > 5 || Math.abs(i1.cy - i0.cy) > 5) && !(await page.has('[data-island-refusal="1"]')),
      `centre ${Math.round(i0.cx)},${Math.round(i0.cy)} -> ${Math.round(i1.cx)},${Math.round(i1.cy)} (plan px)`);
    // A real click on its width figure, 2000 typed, Enter.
    const fig = await boxOf(page, `document.querySelector('[data-island-dim="${i1.id}:w"]')`);
    // Where the caret goes while the hand clicks, written down so a miss says who took it.
    await page.ask(`(() => { window.__t75fo = []; const log = (k) => (e) => window.__t75fo.push(k + ' ' + ((e.target && e.target.tagName) || '?') + ((e.target && e.target.getAttribute && e.target.getAttribute('data-island-field')) ? ' (the field)' : ''));
      for (const k of ['pointerdown', 'focusin', 'mousedown', 'focusout', 'click']) document.addEventListener(k, log(k), true); return true; })()`);
    await clickWith(page, fig.x, fig.y);
    const field = await until(page, `(() => { const f = document.querySelector('[data-island-field="${i1.id}:w"]'); return f && document.activeElement === f ? { value: f.value, selected: f.selectionStart === 0 && f.selectionEnd === f.value.length } : null; })()`, 3000);
    check('a real click on the island\'s width figure opens its field, focused, the number selected', field && field.value === '1800' && field.selected,
      `${field ? '' : 'APP DEFECT (RoomModal.jsx: the figure opens its field on pointerdown, the field takes the focus, then the same press\'s mousedown moves the focus off it and its onBlur closes it): '}${JSON.stringify(field)}; the click's events in order: ${(await page.ask('window.__t75fo || []')).join(', ')}; field on the page now ${await page.has('[data-island-field]')}`);
    if (field) {
      await page.typeText('2000');
      await key(page, 'Enter');
    }
    const i2 = await planIsland(page);
    if (field) check('typed 2000 and Enter: the plan\'s figure reads 2000', i2 && i2.figures.includes(`${i2.id}:w=2000`), JSON.stringify(i2 && i2.figures));
    else note('2000 not typed: there was no field to type it into (the FAIL above)', `the plan's figures stay ${JSON.stringify(i2 && i2.figures)}`);
    await shot(page, 'f09-island-typed.png');
    // A refused move: dragged hard toward the wall it would leave the room through.
    const poly2 = await boxOf(page, 'document.querySelector(\'[data-plan-island]\')');
    await page.dragFromTo(poly2.x, poly2.y, poly2.x, poly2.y - 400, { steps: 16 });
    const said = await page.text('[data-island-refusal="1"]');
    const i3 = await planIsland(page);
    check('dragged out through the wall: refused, and it says why under the plan; the island stays where it last fitted',
      Boolean(said) && i3, `said ${JSON.stringify(said)}; centre ${Math.round(i2.cx)},${Math.round(i2.cy)} -> ${Math.round(i3.cx)},${Math.round(i3.cy)}`);
    await shot(page, 'f09-island-refused.png');
    if (await page.has('[data-room-apply="1"]')) await page.press('[data-room-apply="1"]');
    await page.sleep(1500);
    const isl = await islandsNow(page);
    // The size the plan showed when APPLY was pressed (2000 if the typed figure took).
    const shownW = Number(((i3 && i3.figures) || []).map((f) => f.match(/:w=(\d+)/)).filter(Boolean).map((m) => m[1])[0]);
    check('APPLY: the room carries the island 2000 x 900 as the plan showed it, moved off the room\'s centre', isl.length === 1 && isl[0].w === 2000 && shownW === 2000 && isl[0].d === 900 && (isl[0].cx !== 2000 || isl[0].cy !== 1500),
      `plan showed w ${shownW}; store ${JSON.stringify(isl)}`);
    const panels = await islandPanels(page);
    check('an empty island is dressed by the automat: a back panel on each long face, an end panel on each end',
      panels.length === 4 && ['A', 'B', 'E1', 'E2'].every((f) => panels.some((p) => p.face === f)), JSON.stringify(panels));
    await framed(page, 'f09-island-in-the-room.png');
  }
  const errs = pageErrors(page);
  if (errs.length) note('console errors on the page', errs.slice(0, 3).join(' | '));
  await page.close();
}

// ═══ F10 · UNITS ON THE FACES: THE PLUS, THE PANEL THAT GOES, THE NAME ═════
if (runs('f10')) {
  begin('f10', 'A UNIT ON AN ISLAND FACE, BY ITS PLUS');
  const page = await open();
  await pro(page);
  if (await islandByHand(page)) {
    await page.press('[data-room-apply="1"]');
    await page.sleep(1500);
  }
  const p0 = await islandPanels(page);
  check('the island (Room setup, ADD ISLAND, APPLY) stands dressed in four automat panels', p0.length === 4, JSON.stringify(p0));
  const got = await unitOnFace(page, 'A');
  let face = 'A';
  let res = got;
  if (!res.unit) {
    note('face A\'s plus could not be clicked from any camera tried; face B\'s is taken instead', JSON.stringify(got.plus));
    face = 'B';
    res = await unitOnFace(page, 'B');
  }
  check(`a real click on face ${face}'s plus opens the library ON that face`, res.libOpen && /"wall":\d+/.test(res.insert || ''), `plus ${JSON.stringify(res.plus)}; insert ${res.insert}`);
  const u = res.unit ? await unitOf(page, res.unit.id) : null;
  check(`Base units, Standard: the unit stands on face ${face} of the island`, u && u.face === face && Boolean(u.island), u ? `wall ${u.wall}, island ${u.island}, face ${u.face}, x ${u.x}` : JSON.stringify(res));
  const p1 = await islandPanels(page);
  const gone = !p1.some((p) => p.face === face);
  const ends0 = p0.filter((p) => /^E/.test(p.face)).map((p) => `${p.face} ${p.w}x${p.d}`).join(', ');
  const ends1 = p1.filter((p) => /^E/.test(p.face)).map((p) => `${p.face} ${p.w}x${p.d}`).join(', ');
  const span = (list) => list.filter((p) => /^E/.test(p.face)).map((p) => Math.max(p.w, p.d)).reduce((a, b) => Math.max(a, b), 0);
  check(`the automat's back panel on face ${face} vanishes`, gone, JSON.stringify(p1));
  check('…and the end panels grow to the island\'s new depth', span(p1) > span(p0), `${ends0} -> ${ends1}`);
  if (u) {
    await selectUnit(page, u.id);
    await section(page, 'Carcass');
    const label = await page.ask(`(() => { const s = (${WALL_SELECT}); return s ? s.options[s.selectedIndex].textContent.trim() : null; })()`);
    check(`the right panel's Wall select names it "Island 1 · face ${face}"`, new RegExp(`^Island 1 · face ${face}\\b`).test(label || ''), JSON.stringify(label));
  }
  await framed(page, 'f10-unit-on-the-face.png');
  const errs = pageErrors(page);
  if (errs.length) note('console errors on the page', errs.slice(0, 3).join(' | '));
  await page.close();
}

// ═══ F11 · ONE WORKTOP OVER THE WHOLE ISLAND ════════════════════════════
if (runs('f11')) {
  begin('f11', 'ONE WORKTOP OVER THE WHOLE ISLAND');
  const page = await open();
  await pro(page);
  if (await islandByHand(page)) {
    await page.press('[data-room-apply="1"]');
    await page.sleep(1500);
  }
  const one = await unitOnFace(page, 'B');
  const two = await unitOnFace(page, 'A');
  const ids = [one.unit, two.unit].filter(Boolean).map((u) => u.id);
  check('two units on the island, each by a face\'s plus (faces B and A)', ids.length === 2, `B ${JSON.stringify(one.unit)}; A ${JSON.stringify(two.unit || two.plus)}`);
  if (ids.length) {
    await clickUnit(page, ids[0]);
    for (const id of ids.slice(1)) await clickUnit(page, id, 2);
    const sel = await page.ask('window.__cc.ui.getState().selectedUnitIds');
    check('both selected by a click and a Ctrl+click', ids.every((id) => sel.includes(id)), JSON.stringify(sel));
    const label = await page.text('[data-add-worktop="1"]');
    if (label) await page.press('[data-add-worktop="1"]');
    const said = await lastSaid(page);
    const slabs = await worktopsNow(page);
    const recs = await recordsNow(page);
    check(`"${label}" on an island selection lays ONE slab, the island's`, slabs.length === 1 && recs.length === 1 && Boolean(recs[0].island),
      `slabs ${JSON.stringify(slabs)}; records ${JSON.stringify(recs)}; said ${JSON.stringify(said)}`);
    const bom = await page.ask(`(() => { const b = document.querySelector('[data-bom]'); return null; })()`);
    if (bom) note('bom', bom);
    await framed(page, 'f11-one-slab.png');
  }
  // THE SEATING OVERHANG: one unit selected by a real click, its Construction
  // section's Worktop row, one button per face with no cabinets (c9a9b41).
  if (ids.length) {
    await selectUnit(page, ids[0]);
    await section(page, 'Construction');
    const faces = await page.ask('[...document.querySelectorAll(\'[data-seating-add]\')].map((b) => b.getAttribute(\'data-seating-add\'))');
    check('the island\'s slab in the Worktop row offers SEATING OVERHANG on each face with no cabinets (E1, E2)', faces.length > 0 && faces.every((f) => /^E[12]$/.test(f)),
      JSON.stringify(faces));
    const face = faces[0];
    if (face) {
      const before = (await worktopsNow(page))[0];
      await page.press(`[data-seating-add="${face}"]`);
      await page.sleep(900);
      const on = (await worktopsNow(page))[0];
      const rec = (await recordsNow(page))[0];
      const line = await page.text(`[data-seating-face="${face}"]`);
      const grew = on && before ? Math.round((on.w + on.d - before.w - before.d) * 100) / 100 : null;
      check(`SEATING OVERHANG on face ${face}: the slab grows 300 out over that face, the record says so, the row reads it`,
        grew === 300 && rec && JSON.parse(rec.extend || '{}')[face] === 300 && /Seating on face .*: 300 mm/.test(line || ''),
        `slab ${before && `${before.w} x ${before.d}`} -> ${on && `${on.w} x ${on.d}`} (+${grew}); record extend ${rec && rec.extend}; row ${JSON.stringify(line)}`);
      await framed(page, 'f11-seating.png');
      await selectUnit(page, ids[0]);
      await section(page, 'Construction');
      const x = await boxOf(page, `document.querySelector('[data-seating-face="${face}"] button[title="Take the seating overhang off"]')`);
      if (x) await clickWith(page, x.x, x.y);
      await page.sleep(900);
      const off = (await worktopsNow(page))[0];
      const rec2 = (await recordsNow(page))[0];
      check('its X takes the seating off: the slab is back to its size, the face offers the button again',
        off && before && off.w === before.w && off.d === before.d && JSON.parse((rec2 && rec2.extend) || '{}')[face] === 0
          && await page.has(`[data-seating-add="${face}"]`),
        `X ${x ? 'clicked' : 'not on the screen'}; slab ${off && `${off.w} x ${off.d}`}; record extend ${rec2 && rec2.extend}`);
    }
  }
  const errs = pageErrors(page);
  if (errs.length) note('console errors on the page', errs.slice(0, 3).join(' | '));
  await page.close();
}

// ═══ THE LEDGER ═══════════════════════════════════════════════════════════
const fresh = process.argv.includes('--fresh');
const ledger = `${SHOTS}walk.txt`;
const HEAD = [
  'T75 · THE ACCEPTANCE WALK, PART A (CORNERS) AND PART B (THE ISLAND)',
  '',
  'CLAUDE.md T75 F8 walks (a) to (f) and PART B, F9 to F11, run section by',
  'section against `npx vite preview`, the hardware served from the silent',
  'showroom. Every gesture is a REAL mouse or key event at a pixel the scene\'s',
  'own raycaster says the piece is under (and the page says the canvas owns),',
  'or at a DOM control\'s centre; the store is only READ. A NOTE names a',
  'gesture the app offers no control for, or a reading worth keeping.',
  'The frames beside this file are what the browser saw.',
  '',
].join('\n');
// The ledger keeps one block per section; a rerun of a section replaces its block.
const blocks = new Map();
if (!fresh && existsSync(ledger)) {
  let name = null;
  for (const line of readFileSync(ledger, 'utf8').split('\n')) {
    const m = line.match(/^=== (\w+) · /);
    if (m) { name = m[1].toLowerCase(); blocks.set(name, [line]); continue; }
    if (/^(TOTAL|SECTION) /.test(line)) { name = null; continue; }
    if (name && line.trim()) blocks.get(name).push(line);
  }
}
for (const name of new Set(steps.map((s) => s.section))) {
  const mine = steps.filter((s) => s.section === name);
  const head = mine.find((s) => s.header);
  blocks.set(name, [
    `=== ${name.toUpperCase()} · ${head ? head.header : ''}`,
    ...mine.filter((s) => !s.header).map((s) => `${s.note ? ' ·  ' : (s.ok ? ' ok ' : 'FAIL')} ${s.label}${s.detail ? ` · ${s.detail}` : ''}`),
  ]);
}
const names = [...blocks.keys()].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
const counts = names.map((n) => {
  const lines = blocks.get(n);
  return {
    n, ok: lines.filter((l) => l.startsWith(' ok ')).length, fail: lines.filter((l) => l.startsWith('FAIL')).length, notes: lines.filter((l) => l.startsWith(' ·  ')).length,
  };
});
const total = counts.reduce((s, c) => ({ ok: s.ok + c.ok, fail: s.fail + c.fail, notes: s.notes + c.notes }), { ok: 0, fail: 0, notes: 0 });
writeFileSync(ledger, [
  HEAD,
  ...names.flatMap((n) => [...blocks.get(n), '']),
  ...counts.map((c) => `SECTION ${c.n}: ${c.ok} ok, ${c.fail} FAIL, ${c.notes} notes`),
  `TOTAL ${total.ok + total.fail} checks · ${total.fail} failed · ${total.notes} notes`,
  '',
].join('\n'));
const failed = steps.filter((s) => !s.header && !s.note && !s.ok);
process.stdout.write(`\n${steps.filter((s) => !s.header && !s.note).length} checks · ${failed.length} failed\n`);
await showroomDown();
process.exit(failed.length ? 1 : 0);
