#!/usr/bin/env node
// Reads values from a JSON config file and prints them as name=value lines.
// Also appends them to $GITHUB_OUTPUT when that variable is set (GitHub Actions).
// Usage: node scripts/ci/read-config.mjs --file <path> --key <name>=<dot.path> [--key ...]

import { readFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);

function valueOf(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function lookup(config, dotPath, name) {
  const value = dotPath.split('.').reduce((node, key) => (node == null ? undefined : node[key]), config);
  if (value === undefined) fail(`Key "${dotPath}" not found for "${name}"`);
  return value;
}

function asText(value) {
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

const file = valueOf('--file');
if (!file) fail('Missing --file <path>');

const config = JSON.parse(readFileSync(resolve(file), 'utf8'));

const bindings = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] !== '--key') continue;
  const spec = args[i + 1] ?? '';
  const separator = spec.indexOf('=');
  if (separator < 1) fail(`Expected --key <name>=<dot.path>, got "${spec}"`);
  bindings.push({ name: spec.slice(0, separator), path: spec.slice(separator + 1) });
  i++;
}
if (bindings.length === 0) fail('No --key bindings given');

const lines = bindings.map(({ name, path }) => `${name}=${asText(lookup(config, path, name))}`);
for (const line of lines) console.log(line);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
}
