import { useMemo, useState } from 'react';
import * as THREE from 'three';

import { mm } from './constants.js';
import { useScreenScale } from './DimLabel.jsx';

import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { chromeOn } from './chrome.js';

// ─── TURN 54 (F5): THE LED ICONS SHOW WHILE LIGHTING IS OPEN ────────────────
// ─── RE-HEADED IN TURN 58 (F7.1): …AND NOW THEY ALWAYS SHOW ─────────────────
//
// T54's order is below, verbatim and unchanged, because it is still the reason
// these icons exist at all. What turn 58 overrules is only its NARROWNESS: the
// owner's new order is that they are visible in the editor whether the
// Lighting panel is open or not. The gate T54 called "the feature" is this
// turn's licensed deletion; everything else T54 decided — the clickable pill,
// the pixel clamp, the `ccHelper` flag that keeps them out of renders — stands
// exactly as it was written.
//
// The owner: *"po otwarciu modalu Lighting ikony LED mają być widoczne — nie
// dodajesz nic do szaf. teraz jak nie naciśniesz szafy to nie widać ikon left
// LED / right LED i ludzie nie wiedzą, że takie funkcje istnieją. żadnego
// nowego modalu."*
//
// Until tonight the left/right LED controls lived ONLY in the Lighting panel,
// behind its selected-unit gate — a joiner who never clicked a cabinet never
// learnt the feature existed. So: while the EXISTING Lighting panel is open
// (and only then — panel closed is exactly yesterday's scene), every unit
// wears two clickable LED icons, one per side, and clicking one toggles that
// side's strip — the very `{ unitId, kind: 'side', ref }` item the panel's
// own buttons write. No new modal, nothing added to the cabinets' data: two
// sprites of pure UI, `ccHelper` so no render or shadow ever sees them.
//
// LEGIBILITY AT DISTANCE (F5.2, DECISION for the owner — veto "bez clampa"):
// the icon rides `useScreenScale`, the house's own constant-pixel mechanism
// (DimLabel's), so it can never shrink into an unreadable speck across a
// six-metre room.

const cache = new Map();

/** The pill, drawn once per (word, side, lit) triple. */
function ledTexture(side, lit, word = null) {
  const key = `${side}|${lit ? 1 : 0}|${word || ''}`;
  const known = cache.get(key);
  if (known) return known;
  const W = 256;
  const H = 96;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const r = H / 2 - 6;
  const gold = '#d9b45b';
  ctx.beginPath();
  ctx.roundRect(6, 6, W - 12, H - 12, r);
  ctx.fillStyle = lit ? gold : 'rgba(24,24,28,0.88)';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = gold;
  ctx.stroke();
  // The bulb dot, on the side the strip lives on.
  const dotX = side === 'L' ? 34 : W - 34;
  ctx.beginPath();
  ctx.arc(dotX, H / 2, 13, 0, Math.PI * 2);
  ctx.fillStyle = lit ? '#ffffff' : gold;
  ctx.fill();
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = lit ? '#1c1c20' : '#f5efe2';
  const text = word || (side === 'L' ? 'L LED' : 'R LED');
  ctx.fillText(text, W / 2 + (side === 'L' ? 12 : -12), H / 2 + 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}

/** One icon: a billboarded sprite at constant pixel height. */
function LedIcon({
  position, side, lit, onToggle, word = null,
}) {
  const [hover, setHover] = useState(false);
  // 22 px tall on screen, whatever the camera does — the clamp (F5.2).
  const ref = useScreenScale(hover ? 26 : 22, (object, h) => {
    object.scale.set(h * (256 / 96), h, 1);
  });
  return (
    <sprite
      ref={ref}
      userData={{ ccHelper: true }}
      position={position}
      renderOrder={30}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}
    >
      <spriteMaterial
        attach="material"
        map={ledTexture(side, lit, word)}
        transparent
        depthTest={false}
        toneMapped={false}
        allowOverride={false}
      />
    </sprite>
  );
}

// ─── TURN 64 (CLAUDE.md F1.3): THE LED ICONS' LAW, FOR THE CLIENT'S ROOM ────
//
// The owner, 03.09.2026, exactly: *"ikony LED powinny się pojawiać dookoła
// wszystkich elementów gdzie mogą być dodane — ale dopiero po włączeniu menu
// lights — i też powinny zniknąć jak włączę światło ON — ON jest tylko do
// wizualizacji."*
//
// Three states, read off the two flags that already exist and no new one:
//
//   lighting panel CLOSED (`uiStore.modal !== 'lighting'`) → no icons;
//   panel OPEN, light OFF                                 → an icon on EVERY
//       element that can take a strip;
//   light ON (`design.lighting.on`)                        → icons hidden; ON
//       is visualisation only.
//
// "CAN TAKE A STRIP" IS THE PANEL'S OWN PREDICATE, not a retail list. The
// LightingPanel (`src/components/LightingPanel.jsx`, copied into retail as
// `design/lighting/LightingPanel.jsx`) offers, per cabinet: a strip under
// every SHELF panel (`panel.role === 'shelf'`, the one `stripsForUnit`
// draws for), a 4 mm SIDE line on L and R, BOTTOM at the plinth, TOP washing
// upward, TOP UNDER shining down — and SPOTS only where `unitType.mount ===
// 'wall'`, which no wardrobe is. `ledIconSlots` below is that list, read the
// same way, and the click on each icon writes the very item the panel's own
// button writes (`{ unitId, kind, ref }`).
//
// PRO IS BIT-FOR-BIT WHAT IT WAS. The flag that says which application this
// is IS a uiStore flag — `audience`, which the retail entry sets to
// `'retail'` (`main-retail.jsx setAudience`) and PRO never does
// (`entryAudience` answers `'factory'` for anything it does not recognise).
// In PRO `ledIconState` therefore answers PRO's two side icons, always
// visible, whatever the panel or the switch says; only the client's room,
// through the existing `led-icons` channel gate above, reaches the law. `test/turn64-f1-the-small-things.test.js`
// proves both branches from this file's own two functions — read off this
// file's source by `scripts/t64-led-law.mjs`, never copied — which is why
// they are plain functions and not exports: an export nobody imports is a
// finding in `test/imports.test.js`, and a `.jsx` cannot be imported by node.

/**
 * Which icons this cabinet wears, and whether it wears any.
 *
 * @param {object} args
 *   pro       `uiStore.audience !== 'retail'` — true for PRO, false for the retail mount
 *   panelOpen `uiStore.modal === 'lighting'`
 *   lightOn   `design.lighting.on`
 * @returns {{ show: boolean, why: 'pro'|'closed'|'on'|'off' }}
 */
function ledIconState({ pro = true, panelOpen = false, lightOn = false } = {}) {
  if (pro) return { show: true, why: 'pro' };
  if (!panelOpen) return { show: false, why: 'closed' };
  if (lightOn) return { show: false, why: 'on' };
  return { show: true, why: 'off' };
}

/**
 * The slots one cabinet offers a strip on — the LightingPanel's own list, in
 * its own order. `panels` is the computed result's panels (a shelf per
 * `role === 'shelf'`); `wallMount` is `getUnitType(unit.type).mount === 'wall'`.
 * Every slot carries the ITEM the panel's button would write for it.
 */
function ledIconSlots({
  unit, W, H, D, panels = [], wallMount = false,
}) {
  const id = unit?.id;
  const slots = [];
  for (const p of panels) {
    if (p.role !== 'shelf' || !p.box) continue;
    slots.push({
      key: `shelf:${p.id}`,
      kind: 'shelf',
      ref: p.id,
      side: 'L',
      word: 'LED',
      at: [p.box.x + p.box.w / 2, p.box.y - 30, D + 60],
      item: { unitId: id, kind: 'shelf', ref: p.id },
    });
  }
  for (const side of ['L', 'R']) {
    slots.push({
      key: `side:${side}`,
      kind: 'side',
      ref: side,
      side,
      word: null,
      at: [side === 'L' ? 60 : W - 60, H * 0.78, D + 60],
      item: { unitId: id, kind: 'side', ref: side },
    });
  }
  slots.push({
    key: 'bottom', kind: 'bottom', ref: null, side: 'L', word: 'PLINTH', at: [W / 2, -40, D + 60], item: { unitId: id, kind: 'bottom' },
  });
  slots.push({
    key: 'top', kind: 'top', ref: null, side: 'R', word: 'TOP', at: [W / 2, H + 40, D + 60], item: { unitId: id, kind: 'top' },
  });
  slots.push({
    key: 'top_under', kind: 'top_under', ref: null, side: 'L', word: 'UNDER TOP', at: [W / 2, H - 60, D + 60], item: { unitId: id, kind: 'top_under' },
  });
  if (wallMount) {
    slots.push({
      key: 'spot', kind: 'spot', ref: null, side: 'R', word: 'SPOTS', at: [W / 2, -80, D + 60], item: { unitId: id, kind: 'spot' },
    });
  }
  return slots;
}

/**
 * The pair, for one unit. Rendered inside the unit's own local frame.
 *
 * ─── TURN 58 (CLAUDE.md F7.1): THE GATE IS GONE — LICENSED ────────────────
 *
 * T54-F5 wrote its own gate down as the feature:
 *
 *     const lightingOpen = useUiStore((s) => s.modal === 'lighting');
 *     if (!lightingOpen) return null;          // "the gate IS the feature"
 *
 * It is NOT a fossil — it is T54's spec, executed exactly as written, and the
 * comment above this component still says so. Tonight's order is simply wider
 * than that spec was: the icons are ALWAYS visible in the editor viewport, so
 * a joiner can put a strip down a side without first opening a panel and
 * keeping it open. The T54 header is re-headed below to say which order
 * overruled which, because a reader who finds the old sentence and not the new
 * one will put the gate back.
 *
 * NEVER IN A RENDER, A CAPTURE OR A PDF. That half is not new and is not
 * loosened: every icon here is `ccHelper`, the flag the capture path strips
 * before it draws — so they cannot reach a picture a client sees. The suite
 * asserts the flag rather than the picture.
 *
 * ─── TURN 64 (CLAUDE.md F1.3): …AND THE CLIENT'S ROOM HAS ITS OWN LAW ──────
 * PRO's gate above is PRO's still. The retail mount reads `ledIconState`
 * (three states, two existing flags) and `ledIconSlots` (the panel's own
 * list) — both after every hook, so the hook count is the same on both sides
 * of the switch and the same from one render to the next.
 */
export default function LedIcons({ unit, W, H, D }) {
  // TURN 59: the PBI retail mount draws the furniture and none of the tool.
  // PRO never calls `setProChrome`, so this is `true` and this line is a no-op.
  // T61 F1 · the CHANNEL, not the master switch: the client's room
  // owns the LED mounting icons. PRO sets no
  // channel, so `chromeOn` falls through to `on` and this guard still
  // reads `if (!true)` — which IS the no-change proof.
  if (!chromeOn('led-icons')) return null;
  const design = useProjectStore((s) => s.project.design);
  const addLightingItem = useProjectStore((s) => s.addLightingItem);
  const removeLightingItem = useProjectStore((s) => s.removeLightingItem);
  // T64 F1.3 · the two flags the retail law reads. Subscribed on both sides
  // of the switch — a hook that PRO skipped would be a hook count that
  // differs by application — and DECIDED only where the switch is off.
  const panelOpen = useUiStore((s) => s.modal === 'lighting');
  const pro = useUiStore((s) => s.audience !== 'retail');
  // The cabinet's own panels, for the shelf slots. `unitResult` is computed,
  // not cached, so it is asked in a memo keyed on the two things that change
  // it — and asked for the client's room only: PRO's memo answers `[]` and
  // computes nothing, which is PRO's cost exactly as it was.
  const panels = useMemo(
    () => (pro || !unit?.id ? [] : (useProjectStore.getState().unitResult(unit.id)?.panels || [])),
    [pro, unit, design],
  );
  const items = design?.lighting?.items || [];
  const itemOf = (side) => items.find((i) => i.unitId === unit.id && i.kind === 'side' && i.ref === side);
  const toggle = (side) => {
    const has = itemOf(side);
    if (has) removeLightingItem(has.id);
    else addLightingItem({ unitId: unit.id, kind: 'side', ref: side });
  };

  const state = ledIconState({ pro, panelOpen, lightOn: Boolean(design?.lighting?.on) });
  if (!state.show) return null;

  if (!pro) {
    // THE CLIENT'S ROOM: every slot the panel offers, each writing the panel's
    // own item. A shelf strip is keyed by its PANEL, the rest by kind (+ side).
    const slots = ledIconSlots({
      unit, W, H, D, panels, wallMount: false,
    });
    const has = (slot) => items.find((i) => i.unitId === unit.id && i.kind === slot.kind
      && (slot.ref == null ? true : i.ref === slot.ref));
    return (
      <group userData={{ ccHelper: true }}>
        {slots.map((slot) => (
          <LedIcon
            key={slot.key}
            side={slot.side}
            word={slot.word}
            lit={Boolean(has(slot))}
            position={[mm(slot.at[0]), mm(slot.at[1]), mm(slot.at[2])]}
            onToggle={() => {
              const on = has(slot);
              if (on) removeLightingItem(on.id);
              else addLightingItem(slot.item);
            }}
          />
        ))}
      </group>
    );
  }

  return (
    <group userData={{ ccHelper: true }}>
      {['L', 'R'].map((side) => (
        <LedIcon
          key={side}
          side={side}
          lit={Boolean(itemOf(side))}
          position={[mm(side === 'L' ? 60 : W - 60), mm(H * 0.78), mm(D + 60)]}
          onToggle={() => toggle(side)}
        />
      ))}
    </group>
  );
}
