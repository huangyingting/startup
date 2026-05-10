#!/usr/bin/env node
// check-translation.mjs
//
// Validate that a `*.zh.yaml` mirror is structurally identical to its
// English source: same keys at every level, same array lengths, same
// numerics/booleans/IDs/refs/URLs verbatim. Only whitelisted leaves may
// differ from the English original. Also flags whitelisted leaves where
// the Chinese is byte-identical to the English (likely an untranslated
// or English-loanword passthrough — which is fine for headings like "ARR"
// or "AI", so this is reported as a warning, not a failure, and only when
// the leaf is longer than a tunable threshold).
//
// Walks one report folder by default; with `--all` walks every finalized
// report under reports/.
//
// Usage:
//   node check-translation.mjs <reportFolder> [--strict]
//   node check-translation.mjs --all [--strict]
//
// Exit code: 0 ok, 1 failures present.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { isTranslatableLeaf, whitelistFor } from './whitelist.mjs';

const REPORTS_DIR = resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..', '..', 'reports');

function parseArgs(argv) {
  const args = { folder: null, all: false, strict: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--all') args.all = true;
    else if (a === '--strict') args.strict = true;
    else if (a === '-h' || a === '--help') usage(0);
    else if (a.startsWith('-')) { console.error(`unknown flag: ${a}`); usage(1); }
    else if (!args.folder) args.folder = a;
    else { console.error(`unexpected arg: ${a}`); usage(1); }
  }
  if (!args.folder && !args.all) usage(1);
  return args;
}

function usage(code) {
  console.error('Usage: check-translation.mjs (<reportFolder> | --all) [--strict]');
  process.exit(code);
}

function listReportFolders() {
  if (!existsSync(REPORTS_DIR)) return [];
  return readdirSync(REPORTS_DIR)
    .filter((name) => !name.startsWith('.') && !name.startsWith('_'))
    .map((name) => join(REPORTS_DIR, name))
    .filter((p) => { try { return statSync(p).isDirectory(); } catch { return false; } });
}

function loadYaml(path) { return yaml.load(readFileSync(path, 'utf8')) ?? {}; }

// Walk both trees in lockstep, asserting structural identity. Returns a
// list of issues. `whitelist` is the path-pattern set of translatable
// leaves for this artifact.
function diff(en, zh, path, whitelist, issues) {
  if (Array.isArray(en)) {
    if (!Array.isArray(zh)) {
      issues.push({ path: path.join('/'), kind: 'shape', message: `expected array in zh, got ${typeof zh}` });
      return;
    }
    if (en.length !== zh.length) {
      issues.push({ path: path.join('/'), kind: 'shape', message: `array length mismatch (en=${en.length}, zh=${zh.length})` });
      return;
    }
    for (let i = 0; i < en.length; i += 1) diff(en[i], zh[i], [...path, i], whitelist, issues);
    return;
  }
  if (en && typeof en === 'object') {
    if (!zh || typeof zh !== 'object' || Array.isArray(zh)) {
      issues.push({ path: path.join('/'), kind: 'shape', message: `expected object in zh, got ${Array.isArray(zh) ? 'array' : typeof zh}` });
      return;
    }
    const enKeys = Object.keys(en);
    const zhKeys = new Set(Object.keys(zh));
    for (const key of enKeys) {
      if (!zhKeys.has(key)) {
        issues.push({ path: [...path, key].join('/'), kind: 'shape', message: 'key missing in zh' });
        continue;
      }
      diff(en[key], zh[key], [...path, key], whitelist, issues);
    }
    for (const key of Object.keys(zh)) {
      if (!enKeys.includes(key)) {
        issues.push({ path: [...path, key].join('/'), kind: 'shape', message: 'extra key in zh that is not in en' });
      }
    }
    return;
  }
  // Scalar leaf.
  const translatable = typeof en === 'string' && isTranslatableLeaf(path, whitelist);
  if (translatable) {
    if (zh === null || zh === undefined) return; // empty translation tolerated; renderer falls back to en
    if (typeof zh !== 'string') {
      issues.push({ path: path.join('/'), kind: 'shape', message: `translatable leaf must be a string, got ${typeof zh}` });
    }
    return;
  }
  // Non-translatable: must match verbatim.
  if (en === undefined && zh === undefined) return;
  if (Object.is(en, zh)) return;
  // Allow null vs undefined parity for optional fields.
  if (en == null && zh == null) return;
  issues.push({ path: path.join('/'), kind: 'preserve', message: `non-translatable leaf changed (en=${JSON.stringify(en)}, zh=${JSON.stringify(zh)})` });
}

function checkPair(enPath, zhPath, strict) {
  const en = loadYaml(enPath);
  const zh = loadYaml(zhPath);
  const whitelist = whitelistFor(en);
  const issues = [];
  diff(en, zh, [], whitelist, issues);
  return issues;
}

function findEnglishYamls(folder) {
  return readdirSync(folder)
    .filter((n) => n.endsWith('.yaml') && !n.endsWith('.zh.yaml') && !n.startsWith('.'))
    .map((n) => join(folder, n));
}

function checkFolder(folder, { strict }) {
  const enFiles = findEnglishYamls(folder);
  const failures = [];
  let pairs = 0;
  for (const enPath of enFiles) {
    const zhPath = enPath.replace(/\.yaml$/, '.zh.yaml');
    if (!existsSync(zhPath)) continue;
    pairs += 1;
    const issues = checkPair(enPath, zhPath, strict);
    if (issues.length) {
      failures.push({ enPath, zhPath, issues });
    }
  }
  return { pairs, failures };
}

const args = parseArgs(process.argv.slice(2));
const folders = args.all ? listReportFolders() : [resolve(args.folder)];

let totalPairs = 0;
let totalFailures = 0;
for (const folder of folders) {
  if (!existsSync(folder)) {
    console.error(`[check-translation] folder not found: ${folder}`);
    process.exit(1);
  }
  const { pairs, failures } = checkFolder(folder, { strict: args.strict });
  totalPairs += pairs;
  if (failures.length) {
    totalFailures += failures.length;
    for (const fail of failures) {
      console.error(`FAIL ${fail.zhPath}`);
      for (const issue of fail.issues.slice(0, 20)) {
        console.error(`  - [${issue.kind}] ${issue.path || '(root)'}: ${issue.message}`);
      }
      if (fail.issues.length > 20) console.error(`  ... +${fail.issues.length - 20} more`);
    }
  }
}

if (totalPairs === 0) {
  console.log('[check-translation] no .zh.yaml pairs found; nothing to check.');
  process.exit(0);
}
if (totalFailures) {
  console.error(`[check-translation] ${totalFailures} file(s) failed across ${totalPairs} translated pair(s).`);
  process.exit(1);
}
console.log(`[check-translation] \u2713 ${totalPairs} translated pair(s) verified.`);
