import {
  VERSION,
  createRandom,
  clamp,
  normalizeOptions,
  autoCount,
  createLeaf,
  stepLeaf,
} from './core.js';

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

// ---------------------------------------------------------------------------
// Leaf artwork. Shapes live in a 120 x 120 unit box centred on (0, 0).
// Each (shape, colour) pair is drawn once into an offscreen sprite, so every
// frame only costs a couple of drawImage calls per leaf.
// ---------------------------------------------------------------------------

const UNIT = 120;
const SPRITE_PX = 128;

function polar(angleDeg, r) {
  const a = (angleDeg * Math.PI) / 180;
  return [Math.cos(a) * r * 46, Math.sin(a) * r * 46];
}

function maplePoints() {
  const lobes = [[150, 0.62], [210, 0.95], [270, 1.05], [330, 0.95], [390, 0.62]];
  const pts = [polar(96, 0.08), polar(115, 0.24)];
  lobes.forEach(([a, L], i) => {
    pts.push(
      polar(a - 22, 0.5 * L), polar(a - 14, 0.76 * L), polar(a - 9, 0.64 * L),
      polar(a - 5, 0.86 * L), polar(a, L), polar(a + 5, 0.86 * L),
      polar(a + 9, 0.64 * L), polar(a + 14, 0.76 * L), polar(a + 22, 0.5 * L),
    );
    if (i < lobes.length - 1) pts.push(polar(a + 30, 0.44));
  });
  pts.push(polar(65, 0.24), polar(84, 0.08));
  return pts;
}

function traceShape(ctx, shape) {
  ctx.beginPath();
  if (shape === 0) {
    const pts = maplePoints();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  } else {
    ctx.moveTo(0, -44);
    ctx.bezierCurveTo(22, -30, 26, 6, 6, 30);
    ctx.lineTo(0, 38);
    ctx.lineTo(-6, 30);
    ctx.bezierCurveTo(-26, 6, -22, -30, 0, -44);
  }
  ctx.closePath();
}

function traceVeins(ctx, shape) {
  ctx.beginPath();
  if (shape === 0) {
    for (const [a, L] of [[150, 0.62], [210, 0.95], [270, 1.05], [330, 0.95], [30, 0.62]]) {
      const r = (a * Math.PI) / 180;
      ctx.moveTo(0, 4);
      ctx.quadraticCurveTo(Math.cos(r) * L * 20, Math.sin(r) * L * 20 + 3, Math.cos(r) * L * 42, Math.sin(r) * L * 42);
    }
  } else {
    ctx.moveTo(0, -40);
    ctx.lineTo(0, 40);
    for (let i = -3; i <= 2; i++) {
      const y = i * 10;
      ctx.moveTo(0, y + 6);
      ctx.quadraticCurveTo(8, y, 16, y - 6);
      ctx.moveTo(0, y + 6);
      ctx.quadraticCurveTo(-8, y, -16, y - 6);
    }
  }
}

function newCanvas(px) {
  const c = document.createElement('canvas');
  c.width = px;
  c.height = px;
  return c;
}

function leafSprite(shape, colors, back, random) {
  const c = newCanvas(SPRITE_PX);
  const ctx = c.getContext('2d');
  ctx.translate(SPRITE_PX / 2, SPRITE_PX / 2);
  ctx.scale(SPRITE_PX / UNIT, SPRITE_PX / UNIT);

  traceShape(ctx, shape);
  const g = ctx.createRadialGradient(0, 6, 2, 0, 0, 50);
  g.addColorStop(0, colors[0]);
  g.addColorStop(1, colors[1]);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(120, 50, 15, 0.10)';
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    ctx.arc((random() - 0.5) * 44, (random() - 0.5) * 44, 2 + random() * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (back) {
    ctx.fillStyle = 'rgba(90, 40, 10, 0.2)';
    ctx.fillRect(-60, -60, 120, 120);
  }
  ctx.restore();

  ctx.lineCap = 'round';
  traceVeins(ctx, shape);
  ctx.strokeStyle = 'rgba(110, 45, 12, 0.55)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  traceShape(ctx, shape);
  ctx.strokeStyle = 'rgba(120, 55, 20, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  if (shape === 0) {
    ctx.beginPath();
    ctx.moveTo(0, 28);
    ctx.quadraticCurveTo(3, 36, 1, 46);
    ctx.strokeStyle = 'rgba(95, 45, 15, 0.8)';
    ctx.lineWidth = 2.2;
    ctx.stroke();
  }
  return c;
}

function shadowSprite(shape) {
  const c = newCanvas(SPRITE_PX);
  const ctx = c.getContext('2d');
  const k = SPRITE_PX / UNIT;
  // Classic trick: draw the shape far off-canvas and keep only its blurred shadow.
  ctx.shadowColor = 'rgba(60, 30, 10, 1)';
  ctx.shadowBlur = 7 * k;
  ctx.shadowOffsetX = 10000;
  ctx.translate(SPRITE_PX / 2 - 10000, SPRITE_PX / 2);
  ctx.scale(k, k);
  traceShape(ctx, shape);
  ctx.fillStyle = '#000';
  ctx.fill();
  return c;
}

function buildSprites(palette, random) {
  const sprites = { front: [[], []], back: [[], []], shadow: [shadowSprite(0), shadowSprite(1)] };
  for (let shape = 0; shape < 2; shape++) {
    for (const colors of palette) {
      sprites.front[shape].push(leafSprite(shape, colors, false, random));
      sprites.back[shape].push(leafSprite(shape, colors, true, random));
    }
  }
  return sprites;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

function createSeason(name) {
  let state = null;

  function measure() {
    if (state.fixed) {
      const vv = window.visualViewport;
      return {
        w: Math.round(vv ? vv.width : window.innerWidth),
        h: Math.round(vv ? vv.height : window.innerHeight),
      };
    }
    const r = state.host.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  }

  function resize() {
    if (!state) return;
    const { w, h } = measure();
    const dpr = clamp(window.devicePixelRatio || 1, 1, state.opts.maxPixelRatio);
    if (w === state.w && h === state.h && dpr === state.dpr) return;
    state.w = w;
    state.h = h;
    state.dpr = dpr;
    state.canvas.width = Math.max(1, Math.round(w * dpr));
    state.canvas.height = Math.max(1, Math.round(h * dpr));

    const target = state.opts.count === 'auto' ? autoCount(w, h) : state.opts.count;
    const leaves = state.leaves;
    while (leaves.length < target) {
      leaves.push(createLeaf(state.random, w, h, state.opts, state.opts.palette.length, true));
    }
    if (leaves.length > target) leaves.length = target;
    if (!state.running) draw();
  }

  function draw() {
    const { ctx, leaves, sprites, dpr, w, h } = state;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
    for (const leaf of leaves) {
      const x = leaf.baseX + Math.sin(leaf.t * leaf.swayFreq + leaf.phase) * leaf.swayAmp;
      if (x < -leaf.size * 2 || x > w + leaf.size * 2 || leaf.y < -leaf.size * 2 || leaf.y > h + leaf.size * 2) continue;
      const flip = Math.cos(leaf.t * leaf.tumbleFreq + leaf.phase);
      const rot = leaf.rot + Math.sin(leaf.t * leaf.swayFreq + leaf.phase) * 0.35;
      const sx = (leaf.size / 46) * (UNIT / SPRITE_PX);
      const sy = sx * (0.25 + 0.75 * Math.abs(flip));
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      const half = SPRITE_PX / 2;
      const alpha = state.opts.opacity * (0.65 + 0.35 * leaf.z);

      ctx.globalAlpha = alpha * 0.22;
      const off = leaf.size * 0.14;
      ctx.setTransform(cos * sx * dpr, sin * sx * dpr, -sin * sy * dpr, cos * sy * dpr, (x + off) * dpr, (leaf.y + off * 1.4) * dpr);
      ctx.drawImage(sprites.shadow[leaf.shape], -half, -half);

      ctx.globalAlpha = alpha;
      ctx.setTransform(cos * sx * dpr, sin * sx * dpr, -sin * sy * dpr, cos * sy * dpr, x * dpr, leaf.y * dpr);
      const set = flip < 0 ? sprites.back : sprites.front;
      ctx.drawImage(set[leaf.shape][leaf.color], -half, -half);
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    if (!state || !state.running) return;
    const dt = Math.min(0.05, Math.max(0, (now - (state.last || now)) / 1000));
    state.last = now;
    const { leaves, w, h, opts, random } = state;
    for (let i = 0; i < leaves.length; i++) {
      if (!stepLeaf(leaves[i], dt, opts, h)) {
        leaves[i] = createLeaf(random, w, h, opts, opts.palette.length, false);
      }
    }
    draw();
    state.raf = window.requestAnimationFrame(frame);
  }

  function startLoop() {
    if (!state || state.running || state.userPaused || state.hiddenPaused || state.motionPaused) return;
    state.running = true;
    state.last = 0;
    state.raf = window.requestAnimationFrame(frame);
  }

  function stopLoop() {
    if (!state) return;
    state.running = false;
    if (state.raf) window.cancelAnimationFrame(state.raf);
    state.raf = 0;
  }

  const api = {
    /** Starts the effect (or restarts it with new options). Safe to call on the server: it does nothing there. */
    render(options) {
      const opts = normalizeOptions(options);
      if (!isBrowser()) return api;
      if (state) api.stop();

      const motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
      if (opts.reducedMotion === 'respect' && motionQuery && motionQuery.matches) return api;

      const host = opts.container || document.body;
      if (!host || typeof host.appendChild !== 'function') {
        throw new TypeError('[@autumnboy-studio/seasons] "container" must be a DOM element.');
      }
      const fixed = !opts.container;
      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.setAttribute('role', 'presentation');
      canvas.dataset.season = name;
      Object.assign(canvas.style, {
        position: fixed ? 'fixed' : 'absolute',
        inset: '0',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: String(opts.zIndex),
        display: 'block',
        opacity: '0',
        transition: 'opacity 0.8s ease',
      });
      if (!fixed && window.getComputedStyle(host).position === 'static') {
        host.style.position = 'relative';
      }
      host.appendChild(canvas);

      const random = createRandom(opts.seed ?? Math.floor(Math.random() * 2 ** 31));
      state = {
        opts, host, fixed, canvas, random,
        ctx: canvas.getContext('2d'),
        sprites: buildSprites(opts.palette, random),
        leaves: [], w: 0, h: 0, dpr: 0,
        running: false, raf: 0, last: 0,
        userPaused: false, hiddenPaused: false, motionPaused: false,
        cleanups: [],
      };

      const on = (target, type, fn) => {
        target.addEventListener(type, fn);
        state.cleanups.push(() => target.removeEventListener(type, fn));
      };

      if (fixed) {
        on(window, 'resize', resize);
        if (window.visualViewport) on(window.visualViewport, 'resize', resize);
      } else if (typeof ResizeObserver === 'function') {
        const ro = new ResizeObserver(resize);
        ro.observe(host);
        state.cleanups.push(() => ro.disconnect());
      } else {
        on(window, 'resize', resize);
      }

      if (opts.pauseWhenHidden) {
        state.hiddenPaused = document.visibilityState === 'hidden';
        on(document, 'visibilitychange', () => {
          state.hiddenPaused = document.visibilityState === 'hidden';
          if (state.hiddenPaused) stopLoop(); else startLoop();
        });
      }

      if (opts.reducedMotion === 'respect' && motionQuery && motionQuery.addEventListener) {
        on(motionQuery, 'change', () => {
          state.motionPaused = motionQuery.matches;
          state.canvas.style.visibility = state.motionPaused ? 'hidden' : 'visible';
          if (state.motionPaused) stopLoop(); else startLoop();
        });
      }

      resize();
      startLoop();
      // Fade in on the next frame so the leaves never pop into view.
      window.requestAnimationFrame(() => {
        if (state && state.canvas === canvas) canvas.style.opacity = '1';
      });
      return api;
    },

    /** Removes the effect and cleans up everything it added. */
    stop() {
      if (!state) return api;
      stopLoop();
      for (const cleanup of state.cleanups) cleanup();
      state.canvas.remove();
      state = null;
      return api;
    },

    /** Freezes the leaves in place. */
    pause() {
      if (state) {
        state.userPaused = true;
        stopLoop();
      }
      return api;
    },

    /** Continues after pause(). */
    resume() {
      if (state) {
        state.userPaused = false;
        startLoop();
      }
      return api;
    },

    /** True while leaves are animating. */
    get isRunning() {
      return !!(state && state.running);
    },
  };
  return api;
}

/** Falling autumn leaves. */
export const autumn = createSeason('autumn');

export { VERSION };
