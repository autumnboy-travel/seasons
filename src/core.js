// Pure helpers with no DOM access, so they can be unit-tested in Node.
// Build convention: top-level declarations here use `export function` /
// `export const` only; scripts/build.mjs inlines this file into the bundle.

export const VERSION = '0.1.0';

/** Small, fast seeded PRNG (mulberry32). Returns floats in [0, 1). */
export function createRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Colour pairs: [centre colour, edge colour]. */
export const PALETTES = {
  golden: [
    ['#ffd65a', '#e3961c'],
    ['#ffe17a', '#d9a02a'],
    ['#ffbe45', '#cf5d18'],
    ['#f3c04c', '#b8761c'],
  ],
  warm: [
    ['#f2853a', '#a8301a'],
    ['#f59a3c', '#b7451c'],
    ['#d9662c', '#7e2414'],
    ['#ffbe45', '#cf5d18'],
  ],
  mixed: [
    ['#ffd65a', '#e3961c'],
    ['#ffbe45', '#cf5d18'],
    ['#f2853a', '#a8301a'],
    ['#e8b45a', '#8f4a1a'],
    ['#ffe17a', '#d9a02a'],
    ['#f59a3c', '#b7451c'],
    ['#d9662c', '#7e2414'],
  ],
};

export const DEFAULTS = Object.freeze({
  count: 'auto',
  speed: 1,
  size: 1,
  wind: 0,
  colors: 'mixed',
  opacity: 1,
  zIndex: 2147483000,
  container: null,
  maxPixelRatio: 2,
  reducedMotion: 'respect',
  pauseWhenHidden: true,
  seed: null,
});

function fail(message) {
  throw new TypeError(`[@autumnboy-studio/seasons] ${message}`);
}

function checkNumber(name, value, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    fail(`"${name}" must be a number between ${min} and ${max}, got ${JSON.stringify(value)}.`);
  }
}

/** Turns a colors option into a list of [centre, edge] pairs. */
export function resolvePalette(colors) {
  if (typeof colors === 'string') {
    if (PALETTES[colors]) return PALETTES[colors];
    return [[colors, colors]];
  }
  if (Array.isArray(colors) && colors.length > 0) {
    return colors.map((entry) => {
      if (typeof entry === 'string') return [entry, entry];
      if (Array.isArray(entry) && entry.length === 2 && entry.every((c) => typeof c === 'string')) {
        return [entry[0], entry[1]];
      }
      return fail('"colors" entries must be colour strings or [centre, edge] pairs.');
    });
  }
  return fail('"colors" must be "golden", "warm", "mixed", a colour string, or an array of colours.');
}

/** Merges user options with defaults and validates them. */
export function normalizeOptions(options = {}) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    fail('options must be an object.');
  }
  const known = Object.keys(DEFAULTS);
  for (const key of Object.keys(options)) {
    if (!known.includes(key)) fail(`unknown option "${key}". Known options: ${known.join(', ')}.`);
  }
  const o = { ...DEFAULTS, ...options };

  if (o.count !== 'auto') {
    if (!Number.isInteger(o.count) || o.count < 1 || o.count > 300) {
      fail(`"count" must be "auto" or a whole number between 1 and 300, got ${JSON.stringify(o.count)}.`);
    }
  }
  checkNumber('speed', o.speed, 0.1, 5);
  checkNumber('size', o.size, 0.3, 3);
  checkNumber('wind', o.wind, -5, 5);
  checkNumber('opacity', o.opacity, 0, 1);
  checkNumber('maxPixelRatio', o.maxPixelRatio, 1, 4);
  if (!Number.isInteger(o.zIndex)) fail('"zIndex" must be a whole number.');
  if (o.reducedMotion !== 'respect' && o.reducedMotion !== 'ignore') {
    fail('"reducedMotion" must be "respect" or "ignore".');
  }
  if (typeof o.pauseWhenHidden !== 'boolean') fail('"pauseWhenHidden" must be true or false.');
  if (o.seed !== null && !Number.isInteger(o.seed)) fail('"seed" must be a whole number or null.');

  return { ...o, palette: resolvePalette(o.colors) };
}

/** How many leaves fit a surface: fewer on phones, more on big screens. */
export function autoCount(width, height) {
  return Math.round(clamp((width * height) / 38000, 8, 40));
}

/** Base leaf size in CSS pixels, scaled to the smaller screen side. */
export function baseLeafSize(width, height) {
  return clamp(Math.min(width, height) / 16, 20, 36);
}

/** Creates one leaf's motion parameters. `random` is a () => [0,1) function. */
export function createLeaf(random, width, height, opts, paletteCount, initial) {
  const z = random();
  const size = baseLeafSize(width, height) * opts.size * (0.55 + 0.65 * z);
  const leaf = {
    z,
    size,
    baseX: -0.1 * width + random() * width * 1.2,
    y: 0,
    vy: (40 + 70 * z) * clamp(height / 800, 0.6, 1.3),
    swayAmp: 10 + random() * 26,
    swayFreq: 0.5 + random() * 0.9,
    phase: random() * Math.PI * 2,
    rot: random() * Math.PI * 2,
    vrot: (random() - 0.5) * 1.4,
    tumbleFreq: 0.9 + random() * 1.6,
    shape: random() < 0.28 ? 1 : 0,
    color: Math.floor(random() * paletteCount),
    t: random() * 10,
  };
  // On start, leaves are already spread over the screen (the canvas fades in);
  // later respawns start just above the top edge.
  leaf.y = initial ? -0.3 * height + random() * height * 1.15 : -size - random() * 40;
  return leaf;
}

/** Advances a leaf by dt seconds. Returns false when it has left the bottom. */
export function stepLeaf(leaf, dt, opts, height) {
  leaf.t += dt;
  leaf.y += leaf.vy * opts.speed * dt;
  leaf.baseX += opts.wind * 18 * opts.speed * dt;
  leaf.rot += leaf.vrot * opts.speed * dt;
  return leaf.y < height + leaf.size * 1.5;
}
