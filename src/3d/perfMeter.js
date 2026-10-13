// ─── CHAT-FIX 13.10.2026: THE ROOM'S OWN NUMBERS, ON THE OWNER'S MACHINE ────
//
// The owner, 12.10.2026: "zacina jak nigdy", and no machine but his can say
// why: the container that measures this app has no graphics card. Add `?perf`
// (or `#perf`) to the address and a box reads the live room canvas: which
// graphics device Chrome really draws with (a software renderer is the whole
// story), frames drawn, the worst stall, draw calls, triangles, what the GPU
// holds, and every lost context. Plain DOM, started by 3d/frameDemand.jsx, so
// no frozen PRO surface is touched; nothing runs without the word.

const WINDOW_MS = 5000;

function perfRequested() {
  if (typeof window === 'undefined') return false;
  const { search, hash } = window.location;
  return /(^|[?&#/])perf\b/.test(`${search}${hash}`);
}

function gpuName(gl) {
  try {
    const ctx = gl.getContext();
    const ext = ctx.getExtension('WEBGL_debug_renderer_info');
    return String(ext ? ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ctx.getParameter(ctx.RENDERER));
  } catch { return 'unknown'; }
}

/** Start the meter on this renderer and scene; returns the stop function. */
export function startPerfMeter({ gl, scene, unitCount = () => 0 }) {
  if (!perfRequested() || typeof document === 'undefined') return () => {};
  const box = document.createElement('div');
  box.setAttribute('data-perf-meter', '1');
  box.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99999;width:300px;'
    + 'background:rgba(0,0,0,.82);color:#fff;font:11px/18px ui-monospace,monospace;'
    + 'padding:8px 12px;border-radius:4px;pointer-events:none;white-space:pre';
  document.body.appendChild(box);

  let stop = false;
  const gaps = [];
  const longs = [];
  const renders = [];
  let last = performance.now();
  let lastRender = { ms: 0, calls: 0, triangles: 0 };

  const tick = (t) => {
    if (stop) return;
    gaps.push([t, t - last]);
    last = t;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  let observer = null;
  try {
    observer = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) longs.push([performance.now(), e.duration]);
    });
    observer.observe({ type: 'longtask', buffered: false });
  } catch { /* not every browser has it */ }

  const original = gl.render;
  gl.render = function measuredRender(s, c) {
    const t0 = performance.now();
    original.call(gl, s, c);
    const t1 = performance.now();
    renders.push(t1);
    lastRender = { ms: t1 - t0, calls: gl.info.render.calls, triangles: gl.info.render.triangles };
  };

  const name = gpuName(gl);
  const software = /swiftshader|llvmpipe|software|basic render/i.test(name);
  const timer = setInterval(() => {
    const now = performance.now();
    const cut = now - WINDOW_MS;
    while (gaps.length && gaps[0][0] < cut) gaps.shift();
    while (longs.length && longs[0][0] < cut) longs.shift();
    while (renders.length && renders[0] < cut) renders.shift();
    let objects = 0;
    scene.traverse((o) => { if (o.isMesh || o.isLine || o.isSprite) objects += 1; });
    const worstStall = Math.round(gaps.reduce((m, g) => Math.max(m, g[1]), 0));
    const worstLong = Math.round(longs.reduce((m, l) => Math.max(m, l[1]), 0));
    const lost = window.__cc?.diag?.lost ?? 0;
    const lines = [
      'PERF (last 5 s)',
      `GPU               ${name.length > 30 ? `${name.slice(0, 29)}…` : name}`,
      software ? '!! SOFTWARE RENDERING: no graphics card in use' : null,
      `Frames drawn / s  ${Math.round((renders.length / WINDOW_MS) * 1000)}`,
      `Worst stall       ${worstStall} ms${worstStall > 100 ? '  !!' : ''}`,
      `Stalls > 50 ms    ${gaps.filter((g) => g[1] > 50).length}`,
      `Long tasks        ${longs.length} (worst ${worstLong} ms)`,
      `Last render (JS)  ${lastRender.ms.toFixed(1)} ms`,
      `Draw calls        ${lastRender.calls}`,
      `Triangles         ${lastRender.triangles.toLocaleString('en-GB')}`,
      `Objects in scene  ${objects}`,
      `GPU geom / tex    ${gl.info.memory.geometries} / ${gl.info.memory.textures}`,
      `Shader programs   ${gl.info.programs?.length ?? 0}`,
      `Context lost      ${lost}${lost ? '  !!' : ''}`,
      `Pixel ratio       ${gl.getPixelRatio()}  (${gl.domElement.width} x ${gl.domElement.height})`,
      `Units             ${unitCount()}`,
      `CPU cores / RAM   ${navigator.hardwareConcurrency || '?'} / ${navigator.deviceMemory || '?'} GB`,
    ].filter(Boolean);
    box.textContent = lines.join('\n');
  }, 500);

  return () => {
    stop = true;
    clearInterval(timer);
    observer?.disconnect();
    if (gl.render !== original) gl.render = original;
    box.remove();
  };
}
