#!/usr/bin/env node
// `npx @autumnboy-studio/seasons` — a small terminal greeting. It never runs on install.

import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const DEMO_URL = pkg.homepage;
const args = process.argv.slice(2);

const out = process.stdout;
const colour = out.isTTY && !process.env.NO_COLOR && process.env.TERM !== 'dumb';
const c = (code, text) => (colour ? `\x1b[${code}m${text}\x1b[0m` : text);
const green = (t) => c('32', t);
const yellow = (t) => c('33', t);
const dim = (t) => c('2', t);
const bold = (t) => c('1', t);

if (args.includes('--help') || args.includes('-h')) {
  out.write(`${bold('@autumnboy-studio/seasons')} v${pkg.version}

Usage:
  npx @autumnboy-studio/seasons          Show the greeting
  npx @autumnboy-studio/seasons --demo   Open the live demo in your browser
  npx @autumnboy-studio/seasons --version

In your website:
  npm install @autumnboy-studio/seasons
  import { autumn } from '@autumnboy-studio/seasons'
  autumn.render()
`);
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  out.write(`${pkg.version}\n`);
  process.exit(0);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const animate = out.isTTY && !process.env.CI;
const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

async function main() {
  out.write('\n');
  if (animate) {
    for (let i = 0; i < 14; i++) {
      out.write(`\r${dim(`${spinner[i % spinner.length]} fetching leaves...`)}`);
      await sleep(70);
    }
    out.write('\r\x1b[2K');
  }
  out.write(`${green('✔ fetched 1,024 leaves')}\n`);
  out.write(`${green(`+ seasons@${pkg.version}`)}\n`);
  out.write(`${yellow('added 1 season 🍂 in 0.8s')}\n\n`);
  out.write(`${dim('→')} npm install @autumnboy-studio/seasons\n`);
  out.write(`${dim('→')} import { autumn } from '@autumnboy-studio/seasons'\n`);
  out.write(`${dim('→')} autumn.render()\n\n`);
  out.write(`${dim('Live demo:')} ${DEMO_URL}${args.includes('--demo') ? '' : dim('  (or run with --demo)')}\n\n`);

  if (args.includes('--demo')) openUrl(DEMO_URL);
}

function openUrl(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
  try {
    const child = spawn(cmd, [url], { stdio: 'ignore', detached: true });
    child.on('error', () => out.write(`Open this link in your browser: ${url}\n`));
    child.unref();
  } catch {
    out.write(`Open this link in your browser: ${url}\n`);
  }
}

main();
