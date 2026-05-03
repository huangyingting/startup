#!/usr/bin/env node
// Remove empty placeholder figure data arrays such as data.items: [] that
// satisfy YAML structure but break renderer contracts.
import { existsSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { readYaml, writeYaml } from './text-utils.mjs';
import { FIGURE_ARRAY_FIELDS } from './figure-registry.mjs';

const REPORT_FILES = ['91-full-report.yaml'];

function parseArgs(argv) {
  const checkOnly = argv.includes('--check');
  const targets = argv.filter((arg) => arg !== '--check');
  return { checkOnly, targets };
}

const args = parseArgs(process.argv.slice(2));
if (!args.targets.length) {
  console.error('Usage: node scripts/sanitize-report-figures.mjs <report-folder|yaml-file...> [--check]');
  process.exit(1);
}

function resolveTargets(values) {
  const files = new Set();
  for (const value of values) {
    const path = resolve(value);
    if (!existsSync(path)) {
      console.error(`[sanitize-report-figures] target not found: ${path}`);
      process.exit(1);
    }
    const stat = statSync(path);
    if (stat.isDirectory()) {
      for (const file of REPORT_FILES) {
        const candidate = join(path, file);
        if (existsSync(candidate)) files.add(candidate);
      }
    } else if (stat.isFile() && /\.ya?ml$/i.test(path)) {
      files.add(path);
    }
  }
  return [...files];
}

function sanitizeFigureData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { data, removed: [] };
  const removed = [];
  const next = {};
  for (const [key, value] of Object.entries(data)) {
    if (FIGURE_ARRAY_FIELDS.includes(key) && Array.isArray(value) && value.length === 0) {
      removed.push(key);
      continue;
    }
    next[key] = value;
  }
  return { data: next, removed };
}

function sanitizeDoc(doc) {
  const changes = [];
  for (const figure of doc?.figures ?? []) {
    const { data, removed } = sanitizeFigureData(figure.data);
    if (!removed.length) continue;
    figure.data = data;
    changes.push({ id: figure.id ?? '(missing id)', removed });
  }
  return changes;
}

const files = resolveTargets(args.targets);
if (!files.length) {
  console.error('[sanitize-report-figures] no report document YAML files found.');
  process.exit(1);
}

const allChanges = [];
for (const file of files) {
  const doc = readYaml(file);
  const changes = sanitizeDoc(doc);
  if (!changes.length) continue;
  allChanges.push({ file, changes });
  if (!args.checkOnly) writeYaml(file, doc);
}

if (!allChanges.length) {
  const detail = files.length === 1 ? ` (${basename(files[0])})` : '';
  console.log(`[sanitize-report-figures] ✓ ${files.length} file(s) already clean${detail}.`);
  process.exit(0);
}

const summary = allChanges
  .flatMap(({ file, changes }) => changes.map((change) =>
    `  - ${file}: figure ${change.id} removed ${change.removed.map((field) => `data.${field}`).join(', ')}`
  ))
  .join('\n');

if (args.checkOnly) {
  console.error(`[sanitize-report-figures] ${allChanges.length} file(s) contain empty figure placeholder arrays:\n${summary}`);
  process.exit(1);
}
console.log(`[sanitize-report-figures] sanitized ${allChanges.length} file(s):\n${summary}`);
