#!/usr/bin/env node
// apply-translation.mjs
//
// Take an English YAML artifact + a translations JSON produced by extract +
// translated downstream, and emit the corresponding `*.zh.yaml` sibling.
// Translations file is a JSON array of { path, target } (or { path, source,
// target } — `source` is ignored). Any path not in the translations file
// is left in English. The output preserves field order and shape exactly,
// mutating only the matched leaves.
//
// Usage:
//   node apply-translation.mjs <yamlPath> <translationsJsonPath> [--out <file>]
//
// Default output path is `<yamlPath>` with `.yaml` replaced by `.zh.yaml`.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import { isTranslatableLeaf, whitelistFor } from './whitelist.mjs';

function parseArgs(argv) {
  const args = { input: null, translations: null, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a === '-h' || a === '--help') usage(0);
    else if (a.startsWith('-')) { console.error(`unknown flag: ${a}`); usage(1); }
    else if (!args.input) args.input = a;
    else if (!args.translations) args.translations = a;
    else { console.error(`unexpected arg: ${a}`); usage(1); }
  }
  if (!args.input || !args.translations) usage(1);
  return args;
}

function usage(code) {
  console.error('Usage: apply-translation.mjs <yamlPath> <translationsJsonPath> [--out <file>]');
  process.exit(code);
}

// Recursive in-place mutation of `node` along `pathParts`. Returns the new
// (possibly cloned) value. Strings are replaced when the path is in
// whitelist; otherwise pass-through.
function applyAtPath(node, pathParts, value) {
  if (pathParts.length === 0) return value;
  const head = pathParts[0];
  const rest = pathParts.slice(1);
  if (Array.isArray(node)) {
    const idx = Number(head);
    if (!Number.isInteger(idx) || idx < 0 || idx >= node.length) return node;
    const cloned = [...node];
    cloned[idx] = applyAtPath(cloned[idx], rest, value);
    return cloned;
  }
  if (node && typeof node === 'object') {
    const cloned = { ...node };
    if (!(head in cloned)) return node;
    cloned[head] = applyAtPath(cloned[head], rest, value);
    return cloned;
  }
  return node;
}

const args = parseArgs(process.argv.slice(2));
const inputPath = resolve(args.input);
const translationsPath = resolve(args.translations);
if (!existsSync(inputPath)) { console.error(`file not found: ${inputPath}`); process.exit(1); }
if (!existsSync(translationsPath)) { console.error(`file not found: ${translationsPath}`); process.exit(1); }

const doc = yaml.load(readFileSync(inputPath, 'utf8')) ?? {};
const whitelist = whitelistFor(doc);
const raw = readFileSync(translationsPath, 'utf8').trim();
let translations;
if (raw.startsWith('[')) {
  translations = JSON.parse(raw);
} else {
  // jsonl: one object per line
  translations = raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}
if (!Array.isArray(translations)) { console.error('translations file must be a JSON array (or jsonl)'); process.exit(1); }

let next = doc;
let appliedCount = 0;
let skippedNotInWhitelist = 0;
for (const entry of translations) {
  if (!entry || typeof entry !== 'object') continue;
  const { path, target } = entry;
  if (typeof path !== 'string' || typeof target !== 'string' || !target.trim()) continue;
  const pathParts = path.split('/').map((p) => (/^\d+$/.test(p) ? Number(p) : p));
  // Defense-in-depth: re-check the whitelist before writing. Refuses to
  // translate a leaf the extractor would not have emitted.
  if (!isTranslatableLeaf(pathParts, whitelist)) {
    skippedNotInWhitelist += 1;
    continue;
  }
  next = applyAtPath(next, pathParts, target);
  appliedCount += 1;
}

const outPath = args.out
  ? resolve(args.out)
  : inputPath.replace(/\.yaml$/, '.zh.yaml');
writeFileSync(outPath, yaml.dump(next, { lineWidth: 120, noRefs: true, sortKeys: false }), 'utf8');
process.stderr.write(`[apply] wrote ${outPath} (${appliedCount} translated, ${skippedNotInWhitelist} skipped not-in-whitelist)\n`);
