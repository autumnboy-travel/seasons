// Dependency-free build.
// Produces:
//   dist/index.js          ES module for bundlers / npm users
//   dist/seasons.global.js plain script that sets window.Seasons (for <script> tags)
//   dist/index.d.ts        TypeScript types (copied from types/)
//
// Convention it relies on: src/core.js only uses `export function` / `export const`
// at the top level, and src/index.js imports core with one `import { ... } from './core.js';`
// statement and ends with `export { VERSION };`.

import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFile(join(root, p), 'utf8');
const pkg = JSON.parse(await read('package.json'));

let core = await read('src/core.js');
let index = await read('src/index.js');

if (!core.includes(`export const VERSION = '${pkg.version}';`)) {
  throw new Error(`VERSION in src/core.js does not match package.json (${pkg.version}).`);
}

const importRe = /import\s*\{[^}]*\}\s*from\s*'\.\/core\.js';\n/;
if (!importRe.test(index)) throw new Error('Expected a single import from ./core.js in src/index.js');
index = index.replace(importRe, '');

core = core.replace(/^export (function|const) /gm, '$1 ');
if (/^export /m.test(core)) throw new Error('Unsupported export form in src/core.js');

const banner = `/*! @autumnboy-studio/seasons v${pkg.version} | MIT License | ${pkg.homepage} */\n`;
const body = `${core}\n${index}`;

const esm = banner + body;

const tail = /export const autumn = createSeason\('autumn'\);\n\nexport \{ VERSION \};\s*$/;
if (!tail.test(body)) throw new Error('Unexpected end of src/index.js; update build.mjs');
const globalBody = body.replace(tail, "const autumn = createSeason('autumn');\n");
const iife = `${banner}(function () {\n'use strict';\n${globalBody}\nvar api = { autumn: autumn, VERSION: VERSION };\nif (typeof window !== 'undefined') window.Seasons = api;\n})();\n`;

await mkdir(join(root, 'dist'), { recursive: true });
await writeFile(join(root, 'dist/index.js'), esm);
await writeFile(join(root, 'dist/seasons.global.js'), iife);
await copyFile(join(root, 'types/index.d.ts'), join(root, 'dist/index.d.ts'));
// Local copy for the demo page (git-ignored; the Pages workflow builds it too).
await copyFile(join(root, 'dist/seasons.global.js'), join(root, 'demo/seasons.global.js'));

console.log(`Built @autumnboy-studio/seasons v${pkg.version}`);
