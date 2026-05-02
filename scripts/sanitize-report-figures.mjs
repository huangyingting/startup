#!/usr/bin/env node
import { existsSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { readYaml, writeYaml } from './text-utils.mjs';

const FIGURE_ARRAY_FIELDS = ['items', 'nodes', 'edges', 'points', 'columns', 'rows', 'series', 'layers'];
const REPORT_FILES = ['101-report-document.yaml', '101-report-document.zh.yaml'];

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const targets = args.filter((arg) => arg !== '--check');

if (!targets.length) {
  console.error('Usage: node scripts/sanitize-report-figures.mjs <report-folder|yaml-file...> [--check]');
  process.exit(1);
}

function resolveTargets(values) {
  const files = [];
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
        if (existsSync(candidate)) files.push(candidate);
      }
    } else if (stat.isFile() && /\.ya?ml$/i.test(path)) {
      files.push(path);
    }
  }
  return [...new Set(files)];
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

const files = resolveTargets(targets);
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
  if (!checkOnly) writeYaml(file, doc);
}

if (allChanges.length) {
  const summary = allChanges.flatMap(({ file, changes }) => changes.map((change) => `  - ${file}: figure ${change.id} removed ${change.removed.map((field) => `data.${field}`).join(', ')}`)).join('\n');
  if (checkOnly) {
    console.error(`[sanitize-report-figures] ${allChanges.length} file(s) contain empty figure placeholder arrays:\n${summary}`);
    process.exit(1);
  }
  console.log(`[sanitize-report-figures] sanitized ${allChanges.length} file(s):\n${summary}`);
} else {
  console.log(`[sanitize-report-figures] ✓ ${files.length} file(s) already clean${files.length === 1 ? ` (${basename(files[0])})` : ''}.`);
}
