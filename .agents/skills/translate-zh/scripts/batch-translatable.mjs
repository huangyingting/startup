#!/usr/bin/env node
// batch-translatable.mjs
//
// Prepare response-sized translation batches from an extracted leaf list, and
// expand deduped table translations back to path-level entries for the applier.
//
// Usage:
//   node batch-translatable.mjs prepare <extractJson> --out-dir <dir> [--max-chars 8000] [--max-items 80]
//   node batch-translatable.mjs expand-tables <tables.unique.json> <translatedJson...> --out <file>
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

function usage(code) {
  console.error('Usage:');
  console.error('  batch-translatable.mjs prepare <extractJson> --out-dir <dir> [--max-chars 8000] [--max-items 80]');
  console.error('  batch-translatable.mjs expand-tables <tables.unique.json> <translatedJson...> --out <file>');
  process.exit(code);
}

function readJson(path) {
  if (!existsSync(path)) {
    console.error(`file not found: ${path}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parsePositiveInt(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    console.error(`${name} must be a positive integer`);
    process.exit(1);
  }
  return parsed;
}

function parsePrepareArgs(argv) {
  const args = { input: null, outDir: null, maxChars: 8000, maxItems: 80 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--out-dir') args.outDir = argv[++i];
    else if (a === '--max-chars') args.maxChars = parsePositiveInt(argv[++i], '--max-chars');
    else if (a === '--max-items') args.maxItems = parsePositiveInt(argv[++i], '--max-items');
    else if (a === '-h' || a === '--help') usage(0);
    else if (a.startsWith('-')) { console.error(`unknown flag: ${a}`); usage(1); }
    else if (!args.input) args.input = a;
    else { console.error(`unexpected arg: ${a}`); usage(1); }
  }
  if (!args.input || !args.outDir) usage(1);
  args.input = resolve(args.input);
  args.outDir = resolve(args.outDir);
  return args;
}

function parseExpandArgs(argv) {
  const args = { base: null, translationFiles: [], out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a === '-h' || a === '--help') usage(0);
    else if (a.startsWith('-')) { console.error(`unknown flag: ${a}`); usage(1); }
    else if (!args.base) args.base = a;
    else args.translationFiles.push(a);
  }
  if (!args.base || !args.translationFiles.length || !args.out) usage(1);
  args.base = resolve(args.base);
  args.translationFiles = args.translationFiles.map((p) => resolve(p));
  args.out = resolve(args.out);
  return args;
}

function entrySize(entry) {
  return JSON.stringify(entry).length;
}

function writeBatches(outDir, prefix, entries, { maxChars, maxItems }) {
  const files = [];
  let batch = [];
  let chars = 0;

  function flush() {
    if (!batch.length) return;
    const name = `${prefix}.${String(files.length).padStart(3, '0')}.json`;
    const path = join(outDir, name);
    writeJson(path, batch);
    files.push({ file: name, count: batch.length, chars });
    batch = [];
    chars = 0;
  }

  for (const entry of entries) {
    const nextSize = entrySize(entry);
    if (batch.length && (batch.length >= maxItems || chars + nextSize > maxChars)) flush();
    batch.push(entry);
    chars += nextSize;
  }
  flush();
  return files;
}

function isPureTableValue(value) {
  const s = value.trim();
  if (!s) return true;
  if (/^(?:n\/a|na|null|none|—|–|-|T\+\d+)$/i.test(s)) return true;
  if (!/[A-Za-z\u4e00-\u9fff]/.test(s)) return true;
  if (/^(?:Q[1-4]\s*)?\d{4}(?:[-/]\d{1,2})?(?:[-/]\d{1,2})?$/i.test(s)) return true;
  if (/^[A-Z]{1,6}\d{0,4}$/.test(s)) return true;
  const numberish = /^[~≈<>≤≥]?(?:\s*)[$€£¥]?\d[\d,]*(?:\.\d+)?(?:\s*(?:%|x|bps?|K|M|B|T|bn|mm|USD|EUR|GBP|CNY))?(?:\s*[–-]\s*[~≈<>≤≥]?(?:\s*)[$€£¥]?\d[\d,]*(?:\.\d+)?(?:\s*(?:%|x|bps?|K|M|B|T|bn|mm|USD|EUR|GBP|CNY))?)*$/i;
  return numberish.test(s);
}

function classify(entry) {
  if (entry.path.startsWith('tables/')) return 'tables';
  if (entry.path.startsWith('figures/')) return 'figures';
  return 'prose';
}

function prepare(argv) {
  const args = parsePrepareArgs(argv);
  const items = readJson(args.input);
  if (!Array.isArray(items)) {
    console.error('extract JSON must be an array');
    process.exit(1);
  }

  mkdirSync(args.outDir, { recursive: true });

  const prose = [];
  const figures = [];
  const tableCandidates = [];
  const tablePassthrough = [];

  for (const item of items) {
    if (!item || typeof item.path !== 'string' || typeof item.source !== 'string') continue;
    const kind = classify(item);
    if (kind === 'prose') prose.push(item);
    else if (kind === 'figures') figures.push(item);
    else if (/^tables\/\d+\/rows\//.test(item.path) && isPureTableValue(item.source)) tablePassthrough.push(item);
    else tableCandidates.push(item);
  }

  const uniqueBySource = new Map();
  for (const item of tableCandidates) {
    const existing = uniqueBySource.get(item.source) ?? { source: item.source, count: 0, paths: [] };
    existing.count += 1;
    existing.paths.push(item.path);
    uniqueBySource.set(item.source, existing);
  }
  const tableUnique = Array.from(uniqueBySource.values());
  const tableTranslatorEntries = tableUnique.map(({ source, count }) => ({ source, count }));

  writeJson(join(args.outDir, 'tables.unique.json'), tableUnique);
  writeJson(join(args.outDir, 'tables.passthrough.json'), tablePassthrough);

  const manifest = {
    source: args.input,
    totalLeaves: items.length,
    settings: { maxChars: args.maxChars, maxItems: args.maxItems },
    counts: {
      prose: prose.length,
      figures: figures.length,
      tableCandidates: tableCandidates.length,
      tableUnique: tableUnique.length,
      tablePassthrough: tablePassthrough.length,
    },
    batches: {
      prose: writeBatches(args.outDir, 'prose', prose, args),
      figures: writeBatches(args.outDir, 'figures', figures, args),
      tablesUnique: writeBatches(args.outDir, 'tables.unique', tableTranslatorEntries, args),
    },
  };
  writeJson(join(args.outDir, 'manifest.json'), manifest);
  process.stderr.write(`[batch] wrote ${args.outDir} (${items.length} leaves; ${tableUnique.length} unique table strings; ${tablePassthrough.length} table passthrough)\n`);
}

function expandTables(argv) {
  const args = parseExpandArgs(argv);
  const base = readJson(args.base);
  if (!Array.isArray(base)) {
    console.error('tables.unique.json must be an array');
    process.exit(1);
  }

  const targetsBySource = new Map();
  for (const path of args.translationFiles) {
    const translated = readJson(path);
    if (!Array.isArray(translated)) {
      console.error(`translation file must be an array: ${path}`);
      process.exit(1);
    }
    for (const entry of translated) {
      if (!entry || typeof entry.source !== 'string' || typeof entry.target !== 'string') continue;
      if (!entry.target.trim()) continue;
      if (!targetsBySource.has(entry.source)) targetsBySource.set(entry.source, entry.target);
    }
  }

  const expanded = [];
  let missing = 0;
  for (const entry of base) {
    if (!entry || typeof entry.source !== 'string' || !Array.isArray(entry.paths)) continue;
    const target = targetsBySource.get(entry.source);
    if (!target) {
      missing += 1;
      continue;
    }
    for (const path of entry.paths) expanded.push({ path, source: entry.source, target });
  }

  writeJson(args.out, expanded);
  process.stderr.write(`[batch] expanded ${expanded.length} table path(s) to ${args.out}; ${missing} unique source(s) missing target\n`);
}

const [command, ...rest] = process.argv.slice(2);
if (command === 'prepare') prepare(rest);
else if (command === 'expand-tables') expandTables(rest);
else usage(command === '-h' || command === '--help' ? 0 : 1);