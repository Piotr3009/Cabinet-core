// ─── CHAT-FIX 12.10.2026: THE ROOM IS DRAWN WHEN SOMETHING CHANGES ──────────
//
// The owner, 12.10.2026: "nadal się zacina". The room canvas ran at sixty
// frames a second whether anything moved or not, and kept running under the
// CNC view and the editor windows: a full scene, its shadow pass and every
// outline, sixty times a second, for a picture that had not changed.
//
// The canvas is `frameloop="demand"` now and this decides when it draws:
//
//   - any change in the project or ui store, any key, click or wheel, buys
//     ACTIVE_MS of full frames, so every eased animation in the room (doors,
//     drawers, the CONERO rail, hinges, the camera flight; all settle in well
//     under a second) runs to its end exactly as before;
//   - the pointer moving over the canvas buys a short window (hover, orbit);
//   - a still room is redrawn IDLE_BEAT_MS apart anyway, the safety net for a
//     texture or a model that lands with no state change behind it;
//   - under the CNC view and the editor windows only the slow beat runs.
//
// A demand frame after a pause would hand every animation the whole pause as
// one `delta` and the door would snap open in one frame; the clock is read
// (and so reset) before the first frame after a pause, so it does not.
//
// While the pointer is HELD and moving on the canvas (a drag, an orbit) the
// shadow map stands still and the scene asks its canvas for one pixel per CSS
// pixel (`onHeld`); on release both come back and the room is drawn again.

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useProjectStore } from '../stores/projectStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { setGesture } from '../stores/historyBatch.js';
import { startPerfMeter } from './perfMeter.js';
import { applyHardwareLod } from './hardwareLod.js';

const ACTIVE_MS = 2000;
const HOVER_MS = 400;
const IDLE_BEAT_MS = 500;
const HIDDEN_BEAT_MS = 1500;
const HOLD_SLOP_PX = 4;

// Under the CNC view or an editor window with its own canvas.
const hiddenIn = (s) => s.viewMode === 'cnc' || s.modal === 'cabinet' || s.modal === 'part-detail' || Boolean(s.islandPlan);

export default function FrameDemand({ onHeld = null }) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const clock = useThree((s) => s.clock);
  const scene = useThree((s) => s.scene);
  const paused = useUiStore(hiddenIn);

  const until = useRef(0);
  const lastFrame = useRef(0);
  const onHeldRef = useRef(onHeld);
  onHeldRef.current = onHeld;

  useEffect(() => {
    const now = () => performance.now();
    const kick = () => {
      // A frame after a pause: spend the pause on the clock first.
      if (now() - lastFrame.current > 100) clock.getDelta();
      invalidate();
    };
    const wake = (ms) => {
      if (hiddenIn(useUiStore.getState())) { until.current = 0; return; }
      until.current = Math.max(until.current, now() + ms);
      kick();
    };

    const offProject = useProjectStore.subscribe(() => wake(ACTIVE_MS));
    const offUi = useUiStore.subscribe(() => wake(ACTIVE_MS));

    const el = gl.domElement;
    let down = null;
    let held = false;
    const release = () => {
      down = null;
      if (!held) return;
      held = false;
      setGesture(false);
      useUiStore.getState().setGestureActive(false);
      gl.shadowMap.autoUpdate = true;
      gl.shadowMap.needsUpdate = true;
      onHeldRef.current?.(false);
      wake(ACTIVE_MS);
    };
    const onDown = (e) => { down = { x: e.clientX, y: e.clientY }; wake(ACTIVE_MS); };
    // On the window: a drag captures the pointer, and the canvas stops hearing it.
    const onMove = (e) => {
      if (!down && e.target !== el) return;
      if (down && e.buttons && !held
        && Math.hypot(e.clientX - down.x, e.clientY - down.y) > HOLD_SLOP_PX) {
        held = true;
        setGesture(true);
        useUiStore.getState().setGestureActive(true);
        gl.shadowMap.autoUpdate = false;
        onHeldRef.current?.(true);
      }
      wake(held ? ACTIVE_MS : HOVER_MS);
    };
    const onAny = () => wake(ACTIVE_MS);
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
    window.addEventListener('keydown', onAny);
    window.addEventListener('wheel', onAny, { passive: true });
    window.addEventListener('resize', onAny);

    let beat = 0;
    const timer = setInterval(() => {
      if (document.hidden) return;
      beat += 1;
      if (hiddenIn(useUiStore.getState()) && (beat * IDLE_BEAT_MS) % HIDDEN_BEAT_MS !== 0) return;
      if (now() > until.current) kick();
    }, IDLE_BEAT_MS);

    wake(ACTIVE_MS);
    return () => {
      offProject();
      offUi();
      clearInterval(timer);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('blur', release);
      window.removeEventListener('keydown', onAny);
      window.removeEventListener('wheel', onAny);
      window.removeEventListener('resize', onAny);
      gl.shadowMap.autoUpdate = true;
      if (held) { setGesture(false); useUiStore.getState().setGestureActive(false); }
    };
  }, [gl, invalidate, clock]);

  // Chat-fix 13.10.2026: `?perf` in the address shows the room's live numbers.
  useEffect(() => startPerfMeter({ gl, scene, unitCount: () => useProjectStore.getState().units.length }), [gl, scene]);

  // Leaving the CNC view or an editor: draw the room as it now is.
  useEffect(() => {
    if (!paused) {
      until.current = Math.max(until.current, performance.now() + ACTIVE_MS);
      clock.getDelta();
      invalidate();
    }
  }, [paused, clock, invalidate]);

  const camera = useThree((s) => s.camera);
  const lodBeat = useRef(0);
  useFrame(() => {
    const t = performance.now();
    lastFrame.current = t;
    if (t < until.current) invalidate();
    // Chat-fix 14.10.2026: every sixth frame, the hardware's lite/full swap.
    lodBeat.current += 1;
    if (lodBeat.current % 6 === 0) applyHardwareLod(scene, camera);
  });

  return null;
}
