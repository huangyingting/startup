#!/usr/bin/env node
// Inspect or clear fetch-url's on-disk cache.
import { existsSync, readdirSync, readFileSync, rmSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { argv, exit } from 'node:process';

import { DEFAULT_CACHE_DIR, canonicalCacheKey } from './fetch.mjs';

const VARIANTS = ['origin', 'reader', 'wayback'];

function readOptionValue(args, index, flag) {
  const value = args[index + 1];
  if (value === undefined || value.startsWith('--')) {
    return { error: `Missing value for ${flag}.`, value: null };
  }
  return { error: null, value };
}

function printUsageError(error) {
  console.error(error);
  console.error('Run with --help to see supported options.');
}

function parseArgs(args) {
  const opts = {
    command: null,
    url: null,
    cacheDir: DEFAULT_CACHE_DIR,
    variant: 'all',
    all: false,
    json: false,
    help: false,
    error: null,
  };
  const readValue = (flag, index) => {
    const parsed = readOptionValue(args, index, flag);
    if (parsed.error) opts.error = parsed.error;
    return parsed.value;
  };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--all') opts.all = true;
    else if (arg === '--cache-dir') {
      const value = readValue(arg, i);
      if (opts.error) break;
      opts.cacheDir = resolve(value);
      i += 1;
    }
    else if (arg === '--variant') {
      const value = readValue(arg, i);
      if (opts.error) break;
      opts.variant = value;
      i += 1;
    }
    else if (arg.startsWith('-')) {
      opts.error = `Unknown option: ${arg}.`;
      break;
    }
    else if (!opts.command) opts.command = arg;
    else if (!opts.url) opts.url = arg;
    else {
      opts.error = `Unexpected argument: ${arg}.`;
      break;
    }
  }
  return opts;
}

function help() {
  console.log(`Usage:
  node .agents/skills/fetch-url/scripts/cache.mjs inspect <url> [--variant origin|reader|wayback|all] [--cache-dir <path>] [--json]
  node .agents/skills/fetch-url/scripts/cache.mjs clear <url> [--variant origin|reader|wayback|all] [--cache-dir <path>] [--json]
  node .agents/skills/fetch-url/scripts/cache.mjs clear --all [--cache-dir <path>] [--json]

Inspect or clear fetch-url cache entries. The default cache dir is ${DEFAULT_CACHE_DIR}.`);
}

function selectedVariants(variant) {
  if (variant === 'all') return VARIANTS;
  if (VARIANTS.includes(variant)) return [variant];
  return null;
}

function cachePath(cacheDir, url, variant) {
  return join(cacheDir, `${canonicalCacheKey(url, variant)}.json`);
}

function inspectEntry(cacheDir, url, variant) {
  const path = cachePath(cacheDir, url, variant);
  if (!existsSync(path)) return { variant, hit: false, path };
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    const fetchedAtMs = raw.fetchedAt ? new Date(raw.fetchedAt).valueOf() : NaN;
    const ageMs = Number.isFinite(fetchedAtMs) ? Date.now() - fetchedAtMs : null;
    return {
      variant,
      hit: true,
      path,
      requestedUrl: raw.requestedUrl ?? url,
      finalUrl: raw.finalUrl ?? null,
      status: raw.status ?? null,
      ok: raw.ok ?? null,
      contentType: raw.contentType ?? null,
      contentLength: raw.contentLength ?? null,
      profile: raw.profile ?? null,
      source: raw.source ?? variant,
      fetchedAt: raw.fetchedAt ?? null,
      ageMinutes: ageMs === null || ageMs < 0 ? null : Math.round(ageMs / 60_000),
    };
  } catch (err) {
    return { variant, hit: true, path, error: err.message };
  }
}

function clearUrl(cacheDir, url, variants) {
  const removed = [];
  const missing = [];
  for (const variant of variants) {
    const path = cachePath(cacheDir, url, variant);
    if (existsSync(path)) {
      unlinkSync(path);
      removed.push({ variant, path });
    } else {
      missing.push({ variant, path });
    }
  }
  return { removed, missing };
}

function clearAll(cacheDir) {
  if (!existsSync(cacheDir)) return { removed: [], cacheDir };
  const removed = [];
  for (const name of readdirSync(cacheDir)) {
    if (!name.endsWith('.json')) continue;
    const path = join(cacheDir, name);
    rmSync(path, { force: true });
    removed.push(path);
  }
  return { removed, cacheDir };
}

function printInspect(entries) {
  for (const entry of entries) {
    if (!entry.hit) {
      console.log(`${entry.variant}: MISS (${entry.path})`);
    } else if (entry.error) {
      console.log(`${entry.variant}: ERROR ${entry.error} (${entry.path})`);
    } else {
      console.log(`${entry.variant}: HIT status=${entry.status} bytes=${entry.contentLength} age=${entry.ageMinutes}m source=${entry.source} path=${entry.path}`);
      if (entry.finalUrl) console.log(`  finalUrl: ${entry.finalUrl}`);
    }
  }
}

export async function main(args = argv.slice(2)) {
  const opts = parseArgs(args);
  if (opts.help || !opts.command) {
    help();
    return;
  }
  if (opts.error) {
    printUsageError(opts.error);
    exit(2);
  }
  if (!['inspect', 'clear'].includes(opts.command)) {
    printUsageError(`Unknown command: ${opts.command}.`);
    exit(2);
  }

  const variants = selectedVariants(opts.variant);
  if (!variants) {
    printUsageError(`Invalid --variant: ${opts.variant}. Expected one of: ${[...VARIANTS, 'all'].join(', ')}.`);
    exit(2);
  }

  if (opts.command === 'inspect') {
    if (!opts.url) {
      printUsageError('Missing URL for inspect.');
      exit(2);
    }
    const entries = variants.map((variant) => inspectEntry(opts.cacheDir, opts.url, variant));
    if (opts.json) console.log(JSON.stringify({ command: 'inspect', cacheDir: opts.cacheDir, url: opts.url, entries }, null, 2));
    else printInspect(entries);
    return;
  }

  if (opts.all) {
    const result = clearAll(opts.cacheDir);
    if (opts.json) console.log(JSON.stringify({ command: 'clear', cacheDir: opts.cacheDir, all: true, removed: result.removed }, null, 2));
    else console.log(`Removed ${result.removed.length} cache file(s) from ${opts.cacheDir}`);
    return;
  }

  if (!opts.url) {
    printUsageError('Missing URL for clear, or pass --all to clear the cache directory.');
    exit(2);
  }
  const result = clearUrl(opts.cacheDir, opts.url, variants);
  if (opts.json) console.log(JSON.stringify({ command: 'clear', cacheDir: opts.cacheDir, url: opts.url, removed: result.removed, missing: result.missing }, null, 2));
  else console.log(`Removed ${result.removed.length} cache file(s); ${result.missing.length} variant(s) were already missing.`);
}

if (argv[1] && fileURLToPath(import.meta.url) === resolve(argv[1])) {
  main().catch((err) => {
    console.error(err);
    exit(1);
  });
}
