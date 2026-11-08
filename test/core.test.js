import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRandom,
  normalizeOptions,
  resolvePalette,
  autoCount,
  baseLeafSize,
  createLeaf,
  stepLeaf,
  PALETTES,
} from '../src/core.js';

test('random generator is repeatable for the same seed', () => {
  const a = createRandom(42);
  const b = createRandom(42);
  const seqA = Array.from({ length: 5 }, a);
  const seqB = Array.from({ length: 5 }, b);
  assert.deepEqual(seqA, seqB);
  for (const n of seqA) assert.ok(n >= 0 && n < 1);
});

test('defaults are applied when no options are given', () => {
  const o = normalizeOptions();
  assert.equal(o.count, 'auto');
  assert.equal(o.speed, 1);
  assert.equal(o.reducedMotion, 'respect');
  assert.deepEqual(o.palette, PALETTES.mixed);
});

test('invalid options throw clear errors', () => {
  assert.throws(() => normalizeOptions({ speed: 0 }), /"speed" must be a number/);
  assert.throws(() => normalizeOptions({ count: 2.5 }), /"count" must be "auto"/);
  assert.throws(() => normalizeOptions({ colour: 'red' }), /unknown option "colour"/);
  assert.throws(() => normalizeOptions({ reducedMotion: 'off' }), /"reducedMotion"/);
  assert.throws(() => normalizeOptions('fast'), /options must be an object/);
});

test('colour options resolve to [centre, edge] pairs', () => {
  assert.deepEqual(resolvePalette('golden'), PALETTES.golden);
  assert.deepEqual(resolvePalette('#ff0000'), [['#ff0000', '#ff0000']]);
  assert.deepEqual(resolvePalette(['#111', ['#222', '#333']]), [['#111', '#111'], ['#222', '#333']]);
  assert.throws(() => resolvePalette([]), /"colors"/);
});

test('leaf count scales with screen size', () => {
  const phone = autoCount(390, 844);
  const laptop = autoCount(1440, 900);
  const huge = autoCount(3840, 2160);
  assert.ok(phone >= 8 && phone < laptop, `phone ${phone} < laptop ${laptop}`);
  assert.equal(huge, 40);
  assert.equal(autoCount(100, 100), 8);
});

test('leaf size stays readable on small and large screens', () => {
  assert.equal(baseLeafSize(300, 500), 20);
  assert.equal(baseLeafSize(3000, 3000), 36);
});

test('leaves fall down and report when they leave the screen', () => {
  const opts = normalizeOptions({ seed: 1 });
  const leaf = createLeaf(createRandom(1), 400, 800, opts, opts.palette.length, false);
  const startY = leaf.y;
  assert.equal(stepLeaf(leaf, 0.1, opts, 800), true);
  assert.ok(leaf.y > startY);
  leaf.y = 10000;
  assert.equal(stepLeaf(leaf, 0.016, opts, 800), false);
});

test('wind moves leaves sideways', () => {
  const opts = normalizeOptions({ wind: 3 });
  const leaf = createLeaf(createRandom(7), 400, 800, opts, opts.palette.length, true);
  const x = leaf.baseX;
  stepLeaf(leaf, 1, opts, 800);
  assert.ok(leaf.baseX > x);
});
