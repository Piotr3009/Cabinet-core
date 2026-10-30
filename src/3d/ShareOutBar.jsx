import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { mm } from './constants.js';
import { formatMm } from '../engine/format.js';
import { chromeOn } from './chrome.js';

// ─── THE SHARE-OUT, OFFERED AT THE GAP (turn 50, CLAUDE.md F2 · decision 1) ──
//
// The owner asked for *"duży napis"* — a big notice. CLAUDE.md takes a decision
// FOR him and writes it at the top for him to strike out in one line:
//
//   *"The share-out is offered as a BAR at the gap, not a modal in the middle
//   of the screen … a modal in the centre is dismissed reflexively by the tenth
//   time, and this one re-sizes every cabinet in the run. A strip that appears
//   IN the leftover gap — `Zostało 312 mm · Rozłożyć równo?` and one button —
//   is read where the problem is, and ignoring it costs no click."*
//
// So: a strip, standing in the leftover gap, at the height the run stands at.
// It is `<Html>` and not a sprite because it carries WORDS and a BUTTON, and a
// canvas-drawn button is a button with no focus ring, no hover state and no
// keyboard. `AddPlus` beside it is a sprite because a plus is a glyph.
//
// T86B F6, law 8: ONE button. The owner, 30.10.2026: *"drugi nie dziala, wiec
// usun ta funkcje z paska"*; the extra cabinet's button and road are deleted.
//
// It is a TOOL: `ccHelper` on the anchor group, so nothing here can reach a
// render or a contact shadow — the same contract `AddPlus` and the dimension
// labels keep.
//
// ─── TURN 52 (CLAUDE.md F4): IT NO LONGER DOES ITS OWN ARITHMETIC ───────────
//
// *"Whatever F1 computes, the BAR must show the same number the cabinets will
// end up at. Where the two disagree today the owner reads the bar, builds to it
// and finds forty millimetres missing at the wall. One number, computed once,
// displayed and applied."*
//
// This file worked the run, the gap and the plan out for itself and called
// `shareOutPlan` WITHOUT `wallMargin` — so the end of the run with no filler
// standing on it yet reserved nothing, and the bar said 660 each where the
// store was about to build 653. Forty millimetres, in a missing argument.
//
// It takes the STORE's own resolution now (`projectStore.shareOutView`, which
// is `shareOutSubject` — the same call `shareOutRun` applies). There is no
// second derivation left to disagree with the first, and this component does
// arithmetic about nothing but WHERE IN THE ROOM to hang the strip.

/**
 * @param {object} props
 *   walls       engine/room.js roomWalls()
 *   roomCentre  the plan centre the scene is built about
 *   offer       uiStore.shareOutOffer — { unitId } or null
 *   view        projectStore.shareOutView(unitId) — the ONE resolution (F4):
 *               { run, plan, span, wallMargin, … }, or null when nothing stands
 *   onShare     (unitId): the store's `shareOutRun`
 *   onDismiss   (signature) — the ✕ (T53 F1b); the offer is closed for THIS
 *               gap, and `settleLayout` will not raise it again while the
 *               plan's signature is unchanged.
 */
export default function ShareOutBar({
  walls, roomCentre, offer, view, onShare, onDismiss,
}) {
  // TURN 59: the PBI retail mount draws the furniture and none of the tool.
  // PRO never calls `setProChrome`, so this is `true` and this line is a no-op.
  // T61 F1 · the CHANNEL, not the master switch: the client's room
  // owns the share-out bar. PRO sets no
  // channel, so `chromeOn` falls through to `on` and this guard still
  // reads `if (!true)` — which IS the no-change proof.
  if (!chromeOn('share')) return null;
  const found = view && view.plan ? view : null;

  const placed = useMemo(() => {
    if (!found) return null;
    const { run, plan, span } = found;
    const wall = walls[run.wall] || walls[0];
    if (!wall || !plan.ok) return { plan, span, world: null };
    // The middle of the gap, at the run's own top, a cabinet's depth forward —
    // which is where the eye already is when it reads the leftover.
    const along = (span.from + span.to) / 2;
    const depth = Number(run.units[0]?.params?.depth) || 0;
    const world = new THREE.Vector3(
      mm(wall.start.x - roomCentre.x), 0, mm(wall.start.y - roomCentre.y),
    )
      .addScaledVector(new THREE.Vector3(wall.along.x, 0, wall.along.y), mm(along))
      .addScaledVector(new THREE.Vector3(wall.inward.x, 0, wall.inward.y), mm(depth / 2))
      .setY(mm(Math.max(0, run.top) * 0.6));
    return { plan, span, world };
  }, [found, walls, roomCentre]);

  if (!found || !placed?.world) return null;
  const { plan, span } = placed;

  return (
    <group userData={{ ccHelper: true }} position={placed.world.toArray()}>
      <Html
        center
        zIndexRange={[40, 30]}
        // It is a tool standing in a gap between two carcasses; without this it
        // would be half-swallowed by whichever one is nearer the camera.
        style={{ pointerEvents: 'auto' }}
      >
        <div
          className="flex items-center gap-2 whitespace-nowrap rounded border border-gold/60
            bg-shell-900/95 px-2.5 py-1.5 text-[11px] text-ink-100 shadow-lg backdrop-blur-sm"
          data-share-out-bar={span.gap}
          data-share-out-each={plan.each}
        >
          <span className="text-gold">{formatMm(span.gap)} mm left over</span>
          <span className="text-ink-400">·</span>
          {plan.reason === 'nothing-to-widen' ? (
            // *"If that leaves nothing to widen, the bar says so instead of
            // offering."* A run of a dishwasher and an oven housing is a run
            // whose widths are the appliances', and there is nothing to share.
            <span className="text-ink-300" data-share-out-blocked="1">
              every cabinet here has its width imposed — nothing to share it into
            </span>
          ) : (
            <button
              type="button"
              className="cc-btn-gold px-2 py-0.5"
              data-share-out-go="1"
              title={`Every cabinet in this run that is not an appliance becomes ${formatMm(plan.each)} mm wide. One click, and Ctrl+Z takes it back.`}
              onClick={() => onShare(offer.unitId)}
            >
              Share it out equally · {formatMm(plan.each)} mm each
            </button>
          )}
          {/* ─── TURN 53 (CLAUDE.md F1b): THE ✕ ────────────────────────────
              *"musi też być przycisk dismiss — jak nie chcę tego robić teraz,
              muszę coś nacisnąć. pamiętaj krzyżyk zasada."*

              The house cross, at the right end where every other one in this
              app stands. It closes the offer for THIS gap only: the plan's
              signature goes to the store, and the bar returns the moment a
              move, an add, a removal or a typed width makes it a different
              offer. */}
          <button
            type="button"
            className="ml-1 rounded px-1 text-ink-400 hover:bg-shell-800 hover:text-ink-100"
            data-share-out-dismiss="1"
            aria-label="Dismiss"
            title="Not now — this leftover stays as it is. The offer returns if anything moves."
            onClick={() => onDismiss?.(view?.signature || null)}
          >
            ✕
          </button>
        </div>
      </Html>
    </group>
  );
}
