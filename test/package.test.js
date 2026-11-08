import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const built = existsSync(new URL('../dist/index.js', import.meta.url));

test('source can be imported on the server without touching window', async () => {
  const mod = await import('../src/index.js');
  assert.equal(typeof mod.autumn.render, 'function');
  assert.equal(mod.VERSION, pkg.version);
  // render() is a safe no-op outside the browser.
  assert.equal(mod.autumn.render({ count: 10 }), mod.autumn);
  assert.equal(mod.autumn.isRunning, false);
  mod.autumn.pause().resume().stop();
});

test('render() still validates options on the server', async () => {
  const { autumn } = await import('../src/index.js');
  assert.throws(() => autumn.render({ speed: 99 }), /"speed"/);
});

test('built ES module exposes the same API', { skip: !built && 'run npm run build first' }, async () => {
  const mod = await import('../dist/index.js');
  assert.deepEqual(Object.keys(mod).sort(), ['VERSION', 'autumn']);
  assert.equal(mod.VERSION, pkg.version);
});

test('global script defines window.Seasons', { skip: !built && 'run npm run build first' }, () => {
  const code = readFileSync(new URL('../dist/seasons.global.js', import.meta.url), 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(code, sandbox);
  assert.equal(typeof sandbox.window.Seasons.autumn.render, 'function');
  assert.equal(sandbox.window.Seasons.VERSION, pkg.version);
});

test('package ships only what users need', () => {
  assert.deepEqual(pkg.files, ['dist', 'bin']);
  assert.equal(pkg.dependencies, undefined, 'no runtime dependencies');
  assert.equal(pkg.scripts.install, undefined, 'no install scripts');
  assert.equal(pkg.scripts.postinstall, undefined, 'no install scripts');
});
