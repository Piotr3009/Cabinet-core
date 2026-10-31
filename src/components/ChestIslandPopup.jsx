/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T86B F5 (law 4) . THE CHEST IN THE ROOM: the variant asked ONCE, and the chest's own row in its panel.
//
// The owner, 30.10.2026 (22:52): *"chest powinna byc mozliwosc odsuniecia od sciany ale nie na zasadzie back move
// tylko powinna byc mozliwosc na srodku pokoju cos jak wyspa ale przez grab i move; i dodanie panela z tylu lub
// polaczenie szuflad z 2 stron"*; (22:56) *"1 - oba"*. Two pictures from the chat's mockup: A, a back panel behind the
// chest; B, a second chest back to back. The pick is remembered on the island (`chestIsland.variant`) and changed in
// the chest's panel (ChestIslandRow), with the turn by 90 (the button, or R while the chest is selected).

import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { isChestIslandKit } from '../lib/chestIsland.js';
import { roomIslands } from '../engine/room.js';

const CHEST_VARIANTS = [
  { id: 'panel', label: 'A: back panel', hint: 'A sprayed panel on the back of the chest' },
  { id: 'double', label: 'B: back to back', hint: 'A second chest, drawers on both sides' },
];

/** The plan of a variant, from above: the chest (drawers out to the bottom), and what stands behind it. */
function VariantPicture({ variant }) {
  return (
    <svg viewBox="0 0 80 64" className="w-20 h-16" aria-hidden data-chest-picture={variant}>
      <rect x="8" y={variant === 'double' ? 32 : 26} width="64" height="24" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="8" y1={variant === 'double' ? 58 : 52} x2="72" y2={variant === 'double' ? 58 : 52} stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
      {variant === 'double' ? (
        <>
          <rect x="8" y="8" width="64" height="24" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="8" y1="6" x2="72" y2="6" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
        </>
      ) : (
        <rect x="8" y="22" width="64" height="4" fill="currentColor" />
      )}
    </svg>
  );
}

/** The small popup that asks the variant once: two pictures, two buttons. */
export function ChestIslandPopup({ onPick, onClose, anchor = null }) {
  return (
    <Modal title="Chest in the room" onClose={onClose} anchor={anchor} width="w-72">
      <div className="space-y-2" data-chest-popup="1">
        <p className="text-[11px] text-ink-400">The chest stands free in the room. What goes on its back?</p>
        <div className="grid grid-cols-2 gap-2">
          {CHEST_VARIANTS.map((v) => (
            <button
              key={v.id}
              type="button"
              className="cc-btn flex flex-col items-center gap-1 py-2"
              data-chest-variant={v.id}
              title={v.hint}
              onClick={() => onPick(v.id)}
            >
              <VariantPicture variant={v.id} />
              <span className="text-xs">{v.label}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/**
 * The chest's own row, in its panel's layout group: "Stand in the room" for a chest on a wall; the variant, the turn
 * by 90 and the R key for a chest that stands in the room. Every click goes to the store, which refuses in words.
 */
export function ChestIslandRow({ unit }) {
  const notify = useUiStore((s) => s.notify);
  const addChestIsland = useProjectStore((s) => s.addChestIsland);
  const setChestIslandVariant = useProjectStore((s) => s.setChestIslandVariant);
  const rotateChestIsland = useProjectStore((s) => s.rotateChestIsland);
  const room = useProjectStore((s) => s.project.room);
  const onIsland = unit.position?.island || null;
  const island = useMemo(() => {
    const found = onIsland ? roomIslands(room).find((i) => i.id === onIsland) : null;
    return found?.chestIsland ? found : null;
  }, [room, onIsland]);
  const [asking, setAsking] = useState(false);
  const islandId = island?.id || null;
  // R with the chest held (selected): the island turns by 90, as the button does.
  useEffect(() => {
    if (!islandId) return undefined;
    const onKey = (e) => {
      if (e.key !== 'r' && e.key !== 'R') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;
      const res = rotateChestIsland(islandId, 90);
      if (!res.ok) notify(res.message, 'warn');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [islandId, rotateChestIsland, notify]);
  if (!isChestIslandKit(unit.type)) return null;
  if (!island) {
    return (
      <>
        <button type="button" className="cc-btn w-full" data-chest-stand-in-room={unit.id} onClick={() => setAsking(true)}>
          Stand in the room
        </button>
        {asking && (
          <ChestIslandPopup
            onClose={() => setAsking(false)}
            onPick={(variant) => {
              setAsking(false);
              const res = addChestIsland(unit.id, { variant });
              if (!res.ok) notify(res.message, 'warn');
            }}
          />
        )}
      </>
    );
  }
  return (
    <div className="space-y-1" data-chest-island={island.id}>
      <span className="cc-label">In the room</span>
      <div className="flex gap-1">
        {CHEST_VARIANTS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`cc-btn flex-1 ${island.chestIsland.variant === v.id ? 'border-gold text-gold' : ''}`}
            data-chest-island-variant={v.id}
            aria-pressed={island.chestIsland.variant === v.id}
            title={v.hint}
            onClick={() => { const res = setChestIslandVariant(island.id, v.id); if (!res.ok) notify(res.message, 'warn'); }}
          >
            {v.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="cc-btn w-full"
        data-chest-island-rotate={island.id}
        title="Turn the chest and its back by 90 degrees about its middle (R)"
        onClick={() => { const res = rotateChestIsland(island.id, 90); if (!res.ok) notify(res.message, 'warn'); }}
      >
        Turn 90 degrees
      </button>
      <p className="text-[11px] text-ink-400">Drag the chest to move it; its back and its top follow.</p>
    </div>
  );
}
