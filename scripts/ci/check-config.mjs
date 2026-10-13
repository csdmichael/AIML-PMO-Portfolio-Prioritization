#!/usr/bin/env node
// Verifies that values shared across config files match.
// Rules live in a JSON file (see config/consistency-rules.json); this script only evaluates them.
// Usage: node scripts/ci/check-config.mjs --rules <path> [--root <dir>]

import { readFileSync } from 'node:fs';
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

const rulesPath = valueOf('--rules');
if (!rulesPath) fail('Usage: check-config.mjs --rules <path> [--root <dir>]');
const root = resolve(valueOf('--root') ?? process.cwd());

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`Cannot read ${path}: ${error.message}`);
  }
}

function lookupReference(reference, ruleName) {
  const config = readJson(resolve(root, reference.file));
  const value = reference.path.split('.').reduce((node, key) => (node == null ? undefined : node[key]), config);
  if (value === undefined) fail(`Rule "${ruleName}": key "${reference.path}" missing in ${reference.file}`);
  return value;
}

const { rules } = readJson(resolve(root, rulesPath));
let failures = 0;

for (const rule of rules) {
  const left = lookupReference(rule.left, rule.name);
  const right = lookupReference(rule.right, rule.name);
  const matches = JSON.stringify(left) === JSON.stringify(right);
  if (!matches) failures++;
  console.log(`${matches ? 'PASS' : 'FAIL'} ${rule.name}: ${JSON.stringify(left)} | ${JSON.stringify(right)}`);
}

console.log(`${rules.length - failures}/${rules.length} consistency rules passed`);
process.exit(failures === 0 ? 0 : 1);
