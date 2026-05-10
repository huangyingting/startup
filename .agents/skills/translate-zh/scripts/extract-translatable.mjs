#!/usr/bin/env node
// extract-translatable.mjs
//
// Walk one English YAML report artifact (chapter, full-report, report-meta,
// summary-card, evidence) and emit a flat JSON list of every translatable
// string leaf. Each entry is { path, source } where `path` is the
// slash-separated location of the leaf with array indices preserved
// (e.g. "sections/2/body" or "tables/0/rows/3/1"). Whitelist lives in
// whitelist.mjs.
//
// Output goes to stdout as a JSON array. Pipe into your translator,
// then pass the translated list to apply-translation.mjs.
//
// Usage:
//   node extract-translatable.mjs <yamlPath> [--format json|jsonl] [--out <file>]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import { isTranslatableLeaf, whitelistFor } from './whitelist.mjs';

function parseArgs(argv) {
  const args = { input: null, format: 'json', out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--format') args.format = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '-h' || a === '--help') usage(0);
    else if (a.startsWith('-')) { console.error(`unknown flag: ${a}`); usage(1); }
    else if (!args.input) args.input = a;
    else { console.error(`unexpected arg: ${a}`); usage(1); }
  }
  if (!args.input) usage(1);
  if (!['json', 'jsonl'].includes(args.format)) { console.error(`--format must be json|jsonl`); usage(1); }
  return args;
}

function usage(code) {
  console.error('Usage: extract-translatable.mjs <yamlPath> [--format json|jsonl] [--out <file>]');
  process.exit(code);
}

function walk(node, path, whitelist, out) {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) walk(node[i], [...path, i], whitelist, out);
    return;
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) walk(value, [...path, key], whitelist, out);
    return;
  }
  if (typeof node !== 'string') return;
  if (!node.trim()) return;
  if (!isTranslatableLeaf(path, whitelist)) return;
  out.push({ path: path.join('/'), source: node });
}

const args = parseArgs(process.argv.slice(2));
const inputPath = resolve(args.input);
if (!existsSync(inputPath)) {
  console.error(`file not found: ${inputPath}`);
  process.exit(1);
}
const doc = yaml.load(readFileSync(inputPath, 'utf8')) ?? {};
const whitelist = whitelistFor(doc);
const items = [];
walk(doc, [], whitelist, items);

const formatted = args.format === 'json'
  ? JSON.stringify(items, null, 2)
  : items.map((it) => JSON.stringify(it)).join('\n');

if (args.out) writeFileSync(args.out, formatted, 'utf8');
else process.stdout.write(formatted + '\n');

process.stderr.write(`[extract] ${items.length} leaf(s) from ${inputPath}\n`);
