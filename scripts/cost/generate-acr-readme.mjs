#!/usr/bin/env node
// Builds the Azure Consumption Report (ACR) markdown from Azure Cost Management ActualCost rows.
// Environment comes from a resource tag and is mapped to dev, test, prod, or unassigned by config.
// Usage: node scripts/cost/generate-acr-readme.mjs --config <path> [--root <dir>]

import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const args = process.argv.slice(2);

function valueOf(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const root = resolve(valueOf('--root') ?? process.cwd());
const configPath = valueOf('--config');
if (!configPath) fail('Usage: generate-acr-readme.mjs --config <path> [--root <dir>]');

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

const settings = readJson(configPath);
const { report, environments, table, labels, notes } = settings;
const infra = readJson(report.scope.configFile);
const subscriptionId = infra[report.scope.subscriptionIdPath];
const resourceGroup = infra[report.scope.resourceGroupPath];
if (!subscriptionId || !resourceGroup) fail(`Scope values missing in ${report.scope.configFile}`);

const query = {
  type: report.costType,
  timeframe: 'Custom',
  timePeriod: { from: report.period.from, to: report.period.to },
  dataset: {
    granularity: 'None',
    aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
    grouping: [
      { type: 'Dimension', name: 'ServiceName' },
      { type: 'TagKey', name: environments.tagKey }
    ],
    filter: { dimensions: { name: 'ResourceGroupName', operator: 'In', values: [resourceGroup] } }
  }
};

const uri = `${report.armEndpoint}/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=${report.apiVersion}`;
const queryFile = join(tmpdir(), `acr-query-${process.pid}.json`);
writeFileSync(queryFile, JSON.stringify(query), 'utf8');

function sleepSeconds(seconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, seconds * 1000);
}

// Cost Management throttles bursts with HTTP 429. Retry with exponential backoff, using the settings in config.
function runWithRetry(command, retry) {
  let delaySeconds = retry.initialDelaySeconds;
  for (let attempt = 1; ; attempt++) {
    try {
      return execSync(command, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    } catch (error) {
      const text = `${error.stderr ?? ''}${error.stdout ?? ''}`;
      if (!text.includes(retry.throttleMarker) || attempt >= retry.maxAttempts) throw error;
      console.error(`Cost Management throttled (attempt ${attempt}); retrying in ${delaySeconds}s`);
      sleepSeconds(delaySeconds);
      delaySeconds *= retry.backoffFactor;
    }
  }
}

const command = `az rest --method post --uri "${uri}" --body "@${queryFile}" --headers "Content-Type=application/json" -o json`;
let response;
try {
  response = JSON.parse(runWithRetry(command, settings.retry));
} finally {
  unlinkSync(queryFile);
}

const columns = response.properties?.columns?.map((column) => column.name);
if (!columns) fail(`Unexpected Cost Management response: ${JSON.stringify(response).slice(0, 500)}`);
const columnIndex = (name) => {
  const index = columns.indexOf(name);
  if (index < 0) fail(`Cost Management response has no ${name} column`);
  return index;
};
const iCost = columnIndex('Cost');
const iService = columnIndex('ServiceName');
const iTagKey = columnIndex('TagKey');
const iTagValue = columnIndex('TagValue');

const envKeys = environments.columns.map((column) => column.key);
const emptyCosts = () => Object.fromEntries(envKeys.map((key) => [key, 0]));
const byService = new Map();

for (const row of response.properties.rows) {
  const service = row[iService] || labels.unknownService;
  const tagValue = row[iTagValue] ?? '';
  const envKey = row[iTagKey] === environments.tagKey
    ? environments.tagValueMap[tagValue] ?? environments.untaggedKey
    : environments.untaggedKey;
  const costs = byService.get(service) ?? emptyCosts();
  costs[envKey] += Number(row[iCost]);
  byService.set(service, costs);
}

const services = [...byService.entries()].map(([name, costs]) => ({
  name,
  costs,
  total: envKeys.reduce((sum, key) => sum + costs[key], 0)
}));
services.sort((a, b) => (table.sortDirection === 'desc' ? b.total - a.total : a.total - b.total));
const visibleServices = table.hideZeroRows
  ? services.filter((service) => service.total.toFixed(report.decimals) !== (0).toFixed(report.decimals))
  : services;

const envTotals = Object.fromEntries(envKeys.map((key) => [key, services.reduce((sum, s) => sum + s.costs[key], 0)]));
const grandTotal = envKeys.reduce((sum, key) => sum + envTotals[key], 0);
const serviceTotal = services.reduce((sum, service) => sum + service.total, 0);
if (Math.abs(grandTotal - serviceTotal) > 0.005) {
  fail(`Totals do not reconcile: environments ${grandTotal} vs services ${serviceTotal}`);
}

const money = (value) =>
  `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: report.decimals, maximumFractionDigits: report.decimals })}`;
const percent = (value) => (grandTotal === 0 ? '0.0%' : `${((value / grandTotal) * 100).toFixed(1)}%`);
const envLabel = Object.fromEntries(environments.columns.map((column) => [column.key, column.label]));

const lines = [];
lines.push(`# ${report.title}`, '');
lines.push(`- **${labels.metadataPeriod}:** ${report.period.label}`);
lines.push(`- **${labels.metadataScope}:** ${resourceGroup}`);
lines.push(`- **${labels.metadataCurrency}:** ${report.currency}`);
lines.push(`- **${labels.metadataSource}:** ${report.source}`);
lines.push(`- **${labels.metadataGenerated}:** ${new Date().toISOString()}`, '');

lines.push(`## ${labels.consumptionHeading}`, '');
lines.push(`| ${labels.service} | ${environments.columns.map((c) => c.label).join(' | ')} | ${labels.total} |`);
lines.push(`|---|${environments.columns.map(() => '---:').join('|')}|---:|`);
for (const service of visibleServices) {
  lines.push(`| ${service.name} | ${envKeys.map((key) => money(service.costs[key])).join(' | ')} | ${money(service.total)} |`);
}
lines.push(`| **${labels.total}** | ${envKeys.map((key) => `**${money(envTotals[key])}**`).join(' | ')} | **${money(grandTotal)}** |`, '');

lines.push(`## ${labels.summaryHeading}`, '');
lines.push(`| ${labels.environmentColumn} | ${labels.costColumn} | ${labels.shareColumn} |`);
lines.push('|---|---:|---:|');
for (const key of envKeys) {
  lines.push(`| ${envLabel[key]} | ${money(envTotals[key])} | ${percent(envTotals[key])} |`);
}
lines.push(`| **${labels.total}** | **${money(grandTotal)}** | **100.0%** |`, '');

const withCost = services.filter((service) => service.total > 0);
const largest = withCost[0];
lines.push(`- **${labels.servicesWithCost}:** ${withCost.length}`);
if (largest) {
  lines.push(`- **${labels.largestService}:** ${largest.name} (${money(largest.total)}, ${percent(largest.total)})`);
}
lines.push('', `## ${labels.notesHeading}`, '');
for (const note of notes) lines.push(`- ${note}`);
lines.push('');

const outputPath = resolve(root, report.outputPath);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, lines.join('\n'), 'utf8');
console.log(`Wrote ${report.outputPath}: ${withCost.length} services, total ${money(grandTotal)}`);
