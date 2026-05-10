#!/usr/bin/env node
// audit-translation.mjs
//
// Surface fluency / completeness issues in a `*.zh.yaml` overlay that
// `check-translation.mjs` cannot catch. `check-translation.mjs` only verifies
// structural parity — it has no opinion on whether the Chinese is actually
// Chinese, or whether the prose is stiff translationese. This script does.
//
// Reports four counters per file (full-report.zh.yaml + summary-card.zh.yaml):
//   - sameNonMechanical: whitelisted leaf is byte-identical to English and is
//     not a mechanical table cell (number, currency, date, n/a, etc.). Almost
//     always a forgotten translation. Proper-noun-only leaves like
//     "ChatGPT Enterprise" can legitimately stay; review and decide.
//   - longNoCjk: a translated leaf longer than 30 chars contains zero CJK
//     characters. Almost always means the leaf was forgotten.
//   - tooManyDe: a leaf has 4+ `的` characters. Run the per-segment workflow
//     on it: split into clauses or convert noun piles to verbs.
//   - stockOpener: a leaf opens with a translation-shaped phrase
//     (`对于 / 随着 / 通过 / 此外，/ 然而，/ 而且，`). Rewrite so the leaf
//     leads with the topic or the time/condition phrase instead.
//
// Usage:
//   node audit-translation.mjs <reportFolder> [--top N]
//
// Exit code is always 0 — this is an advisory tool, not a gate. Use
// `check-translation.mjs` for the structural gate.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';
import { isTranslatableLeaf, whitelistFor } from './whitelist.mjs';

function usage(code) {
  console.error('Usage: audit-translation.mjs <reportFolder> [--top N]');
  process.exit(code);
}

function parseArgs(argv) {
  const args = { folder: null, top: 30 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--top') args.top = Number(argv[++i]);
    else if (a === '-h' || a === '--help') usage(0);
    else if (a.startsWith('-')) { console.error(`unknown flag: ${a}`); usage(1); }
    else if (!args.folder) args.folder = a;
    else { console.error(`unexpected arg: ${a}`); usage(1); }
  }
  if (!args.folder) usage(1);
  if (!Number.isInteger(args.top) || args.top < 0) { console.error('--top must be a non-negative integer'); usage(1); }
  return args;
}

function load(path) { return yaml.load(readFileSync(path, 'utf8')) ?? {}; }

function get(node, path) {
  let cur = node;
  for (const p of path) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function walk(node, path, cb) {
  if (Array.isArray(node)) { node.forEach((v, i) => walk(v, [...path, i], cb)); return; }
  if (node && typeof node === 'object') { Object.entries(node).forEach(([k, v]) => walk(v, [...path, k], cb)); return; }
  if (typeof node === 'string' && node.trim()) cb(path, node);
}

function isMechanicalTableValue(path, value) {
  if (!/^tables\/\d+\/rows\//.test(path.join('/'))) return false;
  const s = value.trim();
  if (/^(?:n\/a|na|null|none|—|–|-|T\+\d+)$/i.test(s)) return true;
  if (!/[A-Za-z\u4e00-\u9fff]/.test(s)) return true;
  if (/^(?:Q[1-4]\s*)?\d{4}(?:[-/]\d{1,2})?(?:[-/]\d{1,2})?$/i.test(s)) return true;
  return /^[~≈<>≤≥]?\s*[$€£¥]?\d[\d,]*(?:\.\d+)?(?:\s*(?:%|x|bps?|K|M|B|T|bn|mm|USD|EUR|GBP|CNY))?(?:\s*[–-]\s*[~≈<>≤≥]?\s*[$€£¥]?\d[\d,]*(?:\.\d+)?(?:\s*(?:%|x|bps?|K|M|B|T|bn|mm|USD|EUR|GBP|CNY))?)*$/i.test(s);
}

const STOCK_OPENERS = ['对于', '对……来说', '随着', '通过', '此外，', '然而，', '而且，'];

function auditPair(enPath, zhPath) {
  const en = load(enPath);
  const zh = load(zhPath);
  const whitelist = whitelistFor(en);
  const result = {
    total: 0,
    sameNonMechanical: [],
    longNoCjk: [],
    tooManyDe: [],
    stockOpener: [],
  };
  walk(en, [], (path, value) => {
    if (!isTranslatableLeaf(path, whitelist)) return;
    result.total += 1;
    const z = get(zh, path);
    if (typeof z !== 'string') return;
    if (z === value && !isMechanicalTableValue(path, value)) result.sameNonMechanical.push({ path: path.join('/'), value });
    if (z.length > 30 && !/[\u4e00-\u9fff]/.test(z) && !isMechanicalTableValue(path, z)) result.longNoCjk.push({ path: path.join('/'), value: z });
    if ((z.match(/的/g) || []).length >= 4) result.tooManyDe.push({ path: path.join('/'), value: z });
    for (const opener of STOCK_OPENERS) if (z.startsWith(opener)) { result.stockOpener.push({ path: path.join('/'), opener, value: z }); break; }
  });
  return result;
}

function reportPair(label, result, top) {
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify({
    total: result.total,
    sameNonMechanical: result.sameNonMechanical.length,
    longNoCjk: result.longNoCjk.length,
    tooManyDe: result.tooManyDe.length,
    stockOpener: result.stockOpener.length,
  }, null, 2));
  if (top === 0) return;
  if (result.sameNonMechanical.length) {
    console.log(`--- sameNonMechanical (top ${Math.min(top, result.sameNonMechanical.length)}) ---`);
    result.sameNonMechanical.slice(0, top).forEach((x) => console.log(`  ${x.path}: ${x.value}`));
  }
  if (result.longNoCjk.length) {
    console.log(`--- longNoCjk (top ${Math.min(top, result.longNoCjk.length)}) ---`);
    result.longNoCjk.slice(0, top).forEach((x) => console.log(`  ${x.path}: ${x.value}`));
  }
  if (result.tooManyDe.length) {
    console.log(`--- tooManyDe (top ${Math.min(top, result.tooManyDe.length)}) ---`);
    result.tooManyDe.slice(0, top).forEach((x) => console.log(`  ${x.path}: ${x.value}`));
  }
  if (result.stockOpener.length) {
    console.log(`--- stockOpener (top ${Math.min(top, result.stockOpener.length)}) ---`);
    result.stockOpener.slice(0, top).forEach((x) => console.log(`  ${x.path} [${x.opener}]: ${x.value}`));
  }
}

const args = parseArgs(process.argv.slice(2));
const folder = resolve(args.folder);
if (!existsSync(folder)) { console.error(`folder not found: ${folder}`); process.exit(1); }

let pairs = 0;
for (const name of ['summary-card', 'full-report']) {
  const enPath = join(folder, `${name}.yaml`);
  const zhPath = join(folder, `${name}.zh.yaml`);
  if (!existsSync(enPath) || !existsSync(zhPath)) continue;
  pairs += 1;
  reportPair(`${name}.zh.yaml`, auditPair(enPath, zhPath), args.top);
}
if (!pairs) console.log('[audit] no .zh.yaml pairs found in folder.');
